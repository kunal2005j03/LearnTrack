from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import tempfile
import os
import time
import shutil
import logging
import sys

# Configure structured stdout logging for Cloud Run logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("learntrack-sandbox")

app = FastAPI(title="LearnTrack Code Execution Sandbox")

class ExecutionRequest(BaseModel):
    language: str
    code: str
    input: str = ""

class ExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    exitCode: int
    executionTimeMs: int

# Configuration
MAX_TIMEOUT_S = 7
MAX_OUTPUT_BYTES = 100 * 1024

# Ensure shared Go cache directory exists with write permissions for sandboxuser
SHARED_GOCACHE = os.environ.get("GOCACHE", "/home/sandboxuser/.cache/go-build")
if not os.path.exists(SHARED_GOCACHE):
    SHARED_GOCACHE = "/tmp/gocache"
    os.makedirs(SHARED_GOCACHE, exist_ok=True)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/run", response_model=ExecutionResponse)
async def run_code(req: ExecutionRequest):
    language = req.language.lower().strip()
    code = req.code
    user_input = req.input
    
    start_time = time.time()
    
    if language not in ["python", "py", "java", "go", "golang", "c", "cpp", "c++"]:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")
    
    is_go = language in ["go", "golang"]
    if is_go:
        logger.info("[GO] request received")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        if is_go:
            logger.info(f"[GO] workspace created: {temp_dir}")
        
        env = os.environ.copy()
        
        if is_go:
            # 1. Write source file
            file_path = os.path.join(temp_dir, "main.go")
            with open(file_path, "w") as f:
                f.write(code)
            logger.info(f"[GO] source written to {file_path} ({len(code)} bytes)")
            
            # 2. Configure Go environment for fast, deterministic, offline standalone builds
            env["GO111MODULE"] = "off"
            env["GOPROXY"] = "off"
            env["GOSUMDB"] = "off"
            env["GOCACHE"] = SHARED_GOCACHE
            env["GOTMPDIR"] = temp_dir
            
            # 3. Discover Go binary and toolchain info
            which_go = shutil.which("go") or "go"
            try:
                ver_check = subprocess.run([which_go, "version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=2)
                go_version = ver_check.stdout.strip() or ver_check.stderr.strip()
            except Exception as e:
                go_version = f"unknown ({e})"
            
            # 4. Prepare compiler command
            compile_cmd = [which_go, "build", "-o", "main", "main.go"]
            logger.info(f"[GO] preparing compiler command: {' '.join(compile_cmd)}")
            logger.info(f"[GO] environment info: which_go={which_go}, version={go_version}, cwd={temp_dir}, GOCACHE={env['GOCACHE']}, GO111MODULE={env['GO111MODULE']}")
            
            # 5. Compiler execution
            compile_start = time.time()
            logger.info(f"[GO] compiler started: {' '.join(compile_cmd)}")
            
            try:
                compile_proc = subprocess.run(
                    compile_cmd,
                    cwd=temp_dir,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=MAX_TIMEOUT_S
                )
                compile_duration = time.time() - compile_start
                compile_stdout = compile_proc.stdout.decode('utf-8', errors='replace')
                compile_stderr = compile_proc.stderr.decode('utf-8', errors='replace')
                compile_exit = compile_proc.returncode
                
                logger.info(f"[GO] compiler finished in {compile_duration:.4f}s | exitCode={compile_exit} | stdout='{compile_stdout}' | stderr='{compile_stderr}'")
                
                if compile_exit != 0:
                    execution_time_ms = int((time.time() - start_time) * 1000)
                    logger.info(f"[GO] cleanup complete (compilation error)")
                    return ExecutionResponse(
                        stdout=compile_stdout[:MAX_OUTPUT_BYTES],
                        stderr=compile_stderr[:MAX_OUTPUT_BYTES],
                        exitCode=compile_exit,
                        executionTimeMs=execution_time_ms
                    )
            except subprocess.TimeoutExpired as te:
                compile_duration = time.time() - compile_start
                logger.error(f"[GO] compiler timed out after {compile_duration:.4f}s")
                logger.info(f"[GO] cleanup complete (timeout)")
                return ExecutionResponse(
                    stdout="",
                    stderr=f"Go compilation timed out after {MAX_TIMEOUT_S}s.\n[GOCACHE/module resolution delay detected]",
                    exitCode=124,
                    executionTimeMs=int((time.time() - start_time) * 1000)
                )
            
            # 6. Execute compiled binary
            exec_cmd = ["./main"]
            exec_start = time.time()
            logger.info(f"[GO] executable started: {' '.join(exec_cmd)}")
            
            try:
                run_proc = subprocess.run(
                    exec_cmd,
                    input=user_input.encode('utf-8') if user_input else b'',
                    cwd=temp_dir,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=MAX_TIMEOUT_S
                )
                exec_duration = time.time() - exec_start
                stdout = run_proc.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                stderr = run_proc.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                exit_code = run_proc.returncode
                
                logger.info(f"[GO] process finished in {exec_duration:.4f}s | exitCode={exit_code} | stdout='{stdout.strip()}' | stderr='{stderr.strip()}'")
            except subprocess.TimeoutExpired as te:
                exec_duration = time.time() - exec_start
                stdout = te.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES] if te.stdout else ""
                stderr = f"Execution timed out after {MAX_TIMEOUT_S}s."
                exit_code = 124
                logger.error(f"[GO] process timed out after {exec_duration:.4f}s")
            
            execution_time_ms = int((time.time() - start_time) * 1000)
            logger.info(f"[GO] cleanup complete (total request time: {execution_time_ms}ms)")
            
            return ExecutionResponse(
                stdout=stdout,
                stderr=stderr,
                exitCode=exit_code,
                executionTimeMs=execution_time_ms
            )
            
        elif language in ["python", "py"]:
            file_path = os.path.join(temp_dir, "main.py")
            with open(file_path, "w") as f:
                f.write(code)
            command = ["python3", "-u", "main.py"]
            
        elif language == "java":
            file_path = os.path.join(temp_dir, "Main.java")
            with open(file_path, "w") as f:
                f.write(code)
            command = ["sh", "-c", "javac Main.java && java Main"]
            
        elif language in ["cpp", "c++"]:
            file_path = os.path.join(temp_dir, "main.cpp")
            with open(file_path, "w") as f:
                f.write(code)
            command = ["sh", "-c", "g++ -O0 main.cpp -o main && ./main"]
            
        elif language == "c":
            file_path = os.path.join(temp_dir, "main.c")
            with open(file_path, "w") as f:
                f.write(code)
            command = ["sh", "-c", "gcc -O0 main.c -o main && ./main"]

        try:
            # We use subprocess.run with timeout
            process = subprocess.run(
                command,
                input=user_input.encode('utf-8') if user_input else b'',
                cwd=temp_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=MAX_TIMEOUT_S
            )
            
            stdout = process.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
            stderr = process.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
            exit_code = process.returncode
            
        except subprocess.TimeoutExpired as e:
            stdout = e.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES] if e.stdout else ''
            stderr = e.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES] if e.stderr else ''
            stderr += f"\n[Execution Timed Out after {MAX_TIMEOUT_S}s. Infinite loop or long operation detected.]"
            exit_code = 124
        except Exception as e:
            stdout = ''
            stderr = f"Execution error: {str(e)}"
            exit_code = 1
            
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        return ExecutionResponse(
            stdout=stdout,
            stderr=stderr,
            exitCode=exit_code,
            executionTimeMs=execution_time_ms
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)

