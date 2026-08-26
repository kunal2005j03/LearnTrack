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

# Discover toolchain paths at startup (reused across requests)
TOOLCHAINS = {
    "python": shutil.which("python3") or "python3",
    "go": shutil.which("go") or "go",
    "g++": shutil.which("g++") or "g++",
    "gcc": shutil.which("gcc") or "gcc",
    "javac": shutil.which("javac") or "javac",
    "java": shutil.which("java") or "java",
}

# Container instance startup timestamp for cold-start detection
INSTANCE_START_TIME = time.time()
REQUEST_COUNTER = 0

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "uptimeSeconds": round(time.time() - INSTANCE_START_TIME, 2),
        "requestsHandled": REQUEST_COUNTER
    }

@app.post("/run", response_model=ExecutionResponse)
async def run_code(req: ExecutionRequest):
    global REQUEST_COUNTER
    REQUEST_COUNTER += 1
    
    t0_req = time.time()
    language = req.language.lower().strip()
    code = req.code
    user_input = req.input
    
    is_cold = REQUEST_COUNTER == 1
    
    if language not in ["python", "py", "java", "go", "golang", "c", "cpp", "c++"]:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")
    
    normalized_lang = "python" if language in ["python", "py"] else \
                      "go" if language in ["go", "golang"] else \
                      "cpp" if language in ["cpp", "c++"] else \
                      "c" if language == "c" else "java"
    
    logger.info(f"[{normalized_lang.upper()}] [Req #{REQUEST_COUNTER}] request received | cold_start={is_cold}")
    
    t1_ws_start = time.time()
    with tempfile.TemporaryDirectory() as temp_dir:
        t1_ws = time.time()
        ws_create_ms = (t1_ws - t1_ws_start) * 1000
        
        env = os.environ.copy()
        
        # 1. Write source file
        t2_src_start = time.time()
        if normalized_lang == "python":
            source_file = "main.py"
        elif normalized_lang == "go":
            source_file = "main.go"
        elif normalized_lang == "java":
            source_file = "Main.java"
        elif normalized_lang == "cpp":
            source_file = "main.cpp"
        else:
            source_file = "main.c"
            
        file_path = os.path.join(temp_dir, source_file)
        with open(file_path, "w") as f:
            f.write(code)
            
        t2_src = time.time()
        src_write_ms = (t2_src - t2_src_start) * 1000
        
        compile_ms = 0.0
        exec_ms = 0.0
        stdout = ""
        stderr = ""
        exit_code = 0
        
        # =====================================================================
        # PYTHON: Fast interpreted execution
        # =====================================================================
        if normalized_lang == "python":
            # -B avoids writing .pyc files to temp directory
            # -u ensures unbuffered stdout/stderr
            exec_cmd = [TOOLCHAINS["python"], "-B", "-u", "main.py"]
            t5_exec_start = time.time()
            try:
                proc = subprocess.run(
                    exec_cmd,
                    input=user_input.encode('utf-8') if user_input else b'',
                    cwd=temp_dir,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=MAX_TIMEOUT_S
                )
                t6_exec_end = time.time()
                exec_ms = (t6_exec_end - t5_exec_start) * 1000
                stdout = proc.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                stderr = proc.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                exit_code = proc.returncode
            except subprocess.TimeoutExpired as te:
                exec_ms = (time.time() - t5_exec_start) * 1000
                stdout = te.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES] if te.stdout else ""
                stderr = f"Execution timed out after {MAX_TIMEOUT_S}s."
                exit_code = 124

        # =====================================================================
        # GO: Deterministic offline compilation + stripped binary
        # =====================================================================
        elif normalized_lang == "go":
            env["GO111MODULE"] = "off"
            env["GOPROXY"] = "off"
            env["GOSUMDB"] = "off"
            env["GOCACHE"] = SHARED_GOCACHE
            env["GOTMPDIR"] = temp_dir
            
            # -ldflags="-s -w" strips symbol table and DWARF debug info for faster linking
            compile_cmd = [TOOLCHAINS["go"], "build", "-ldflags=-s -w", "-o", "main", "main.go"]
            t3_build_start = time.time()
            try:
                compile_proc = subprocess.run(
                    compile_cmd,
                    cwd=temp_dir,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=MAX_TIMEOUT_S
                )
                t4_build_end = time.time()
                compile_ms = (t4_build_end - t3_build_start) * 1000
                
                if compile_proc.returncode != 0:
                    stdout = compile_proc.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                    stderr = compile_proc.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                    exit_code = compile_proc.returncode
                else:
                    # Run compiled binary
                    exec_cmd = ["./main"]
                    t5_exec_start = time.time()
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
                        t6_exec_end = time.time()
                        exec_ms = (t6_exec_end - t5_exec_start) * 1000
                        stdout = run_proc.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                        stderr = run_proc.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                        exit_code = run_proc.returncode
                    except subprocess.TimeoutExpired as te:
                        exec_ms = (time.time() - t5_exec_start) * 1000
                        stdout = te.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES] if te.stdout else ""
                        stderr = f"Execution timed out after {MAX_TIMEOUT_S}s."
                        exit_code = 124
            except subprocess.TimeoutExpired:
                compile_ms = (time.time() - t3_build_start) * 1000
                stderr = f"Go compilation timed out after {MAX_TIMEOUT_S}s."
                exit_code = 124

        # =====================================================================
        # C++: Direct g++ with -pipe, -O0, and stripped binary
        # =====================================================================
        elif normalized_lang == "cpp":
            # -O0: no optimization passes (fastest compilation)
            # -pipe: avoid writing intermediate .s assembly files to disk
            # -s: strip binary during link
            compile_cmd = [TOOLCHAINS["g++"], "-O0", "-pipe", "-s", "main.cpp", "-o", "main"]
            t3_build_start = time.time()
            try:
                compile_proc = subprocess.run(
                    compile_cmd,
                    cwd=temp_dir,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=MAX_TIMEOUT_S
                )
                t4_build_end = time.time()
                compile_ms = (t4_build_end - t3_build_start) * 1000
                
                if compile_proc.returncode != 0:
                    stdout = compile_proc.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                    stderr = compile_proc.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                    exit_code = compile_proc.returncode
                else:
                    exec_cmd = ["./main"]
                    t5_exec_start = time.time()
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
                        t6_exec_end = time.time()
                        exec_ms = (t6_exec_end - t5_exec_start) * 1000
                        stdout = run_proc.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                        stderr = run_proc.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                        exit_code = run_proc.returncode
                    except subprocess.TimeoutExpired as te:
                        exec_ms = (time.time() - t5_exec_start) * 1000
                        stdout = te.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES] if te.stdout else ""
                        stderr = f"Execution timed out after {MAX_TIMEOUT_S}s."
                        exit_code = 124
            except subprocess.TimeoutExpired:
                compile_ms = (time.time() - t3_build_start) * 1000
                stderr = f"C++ compilation timed out after {MAX_TIMEOUT_S}s."
                exit_code = 124

        # =====================================================================
        # C: Direct gcc with -pipe, -O0, and stripped binary
        # =====================================================================
        elif normalized_lang == "c":
            compile_cmd = [TOOLCHAINS["gcc"], "-O0", "-pipe", "-s", "main.c", "-o", "main"]
            t3_build_start = time.time()
            try:
                compile_proc = subprocess.run(
                    compile_cmd,
                    cwd=temp_dir,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=MAX_TIMEOUT_S
                )
                t4_build_end = time.time()
                compile_ms = (t4_build_end - t3_build_start) * 1000
                
                if compile_proc.returncode != 0:
                    stdout = compile_proc.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                    stderr = compile_proc.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                    exit_code = compile_proc.returncode
                else:
                    exec_cmd = ["./main"]
                    t5_exec_start = time.time()
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
                        t6_exec_end = time.time()
                        exec_ms = (t6_exec_end - t5_exec_start) * 1000
                        stdout = run_proc.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                        stderr = run_proc.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                        exit_code = run_proc.returncode
                    except subprocess.TimeoutExpired as te:
                        exec_ms = (time.time() - t5_exec_start) * 1000
                        stdout = te.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES] if te.stdout else ""
                        stderr = f"Execution timed out after {MAX_TIMEOUT_S}s."
                        exit_code = 124
            except subprocess.TimeoutExpired:
                compile_ms = (time.time() - t3_build_start) * 1000
                stderr = f"C compilation timed out after {MAX_TIMEOUT_S}s."
                exit_code = 124

        # =====================================================================
        # JAVA: javac + java with Tier 1 C1 JIT and Serial GC optimization
        # =====================================================================
        elif normalized_lang == "java":
            # Optimization flags for javac and java:
            # -J-XX:TieredStopAtLevel=1: Disable heavy C2 JIT optimization in compiler JVM
            # -J-XX:+UseSerialGC: Lightweight single-threaded GC for instant startup
            compile_cmd = [
                TOOLCHAINS["javac"],
                "-J-XX:TieredStopAtLevel=1",
                "-J-XX:+UseSerialGC",
                "-J-Xms16m",
                "-J-Xmx128m",
                "Main.java"
            ]
            t3_build_start = time.time()
            try:
                compile_proc = subprocess.run(
                    compile_cmd,
                    cwd=temp_dir,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=MAX_TIMEOUT_S
                )
                t4_build_end = time.time()
                compile_ms = (t4_build_end - t3_build_start) * 1000
                
                if compile_proc.returncode != 0:
                    stdout = compile_proc.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                    stderr = compile_proc.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                    exit_code = compile_proc.returncode
                else:
                    # java execution flags:
                    # -XX:TieredStopAtLevel=1: Fast C1 JIT startup for short-lived script execution
                    # -XX:+UseSerialGC: Avoid thread pool creation overhead
                    exec_cmd = [
                        TOOLCHAINS["java"],
                        "-XX:TieredStopAtLevel=1",
                        "-XX:+UseSerialGC",
                        "-Xms16m",
                        "-Xmx128m",
                        "-cp",
                        ".",
                        "Main"
                    ]
                    t5_exec_start = time.time()
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
                        t6_exec_end = time.time()
                        exec_ms = (t6_exec_end - t5_exec_start) * 1000
                        stdout = run_proc.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                        stderr = run_proc.stderr.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES]
                        exit_code = run_proc.returncode
                    except subprocess.TimeoutExpired as te:
                        exec_ms = (time.time() - t5_exec_start) * 1000
                        stdout = te.stdout.decode('utf-8', errors='replace')[:MAX_OUTPUT_BYTES] if te.stdout else ""
                        stderr = f"Execution timed out after {MAX_TIMEOUT_S}s."
                        exit_code = 124
            except subprocess.TimeoutExpired:
                compile_ms = (time.time() - t3_build_start) * 1000
                stderr = f"Java compilation timed out after {MAX_TIMEOUT_S}s."
                exit_code = 124

    # Workspace cleanup occurs when exiting the with block
    t8_cleanup_end = time.time()
    total_duration_ms = (t8_cleanup_end - t0_req) * 1000
    cleanup_ms = (t8_cleanup_end - t1_ws) * 1000 - compile_ms - exec_ms - src_write_ms
    cleanup_ms = max(0.1, cleanup_ms)
    
    # Emit unified profiling summary
    logger.info(
        f"[PROFILER][{normalized_lang.upper()}] "
        f"total={total_duration_ms:.1f}ms | "
        f"ws_create={ws_create_ms:.2f}ms | "
        f"src_write={src_write_ms:.2f}ms | "
        f"compile={compile_ms:.1f}ms | "
        f"execute={exec_ms:.1f}ms | "
        f"cleanup={cleanup_ms:.2f}ms | "
        f"exit_code={exit_code} | "
        f"cold_start={is_cold}"
    )
    
    return ExecutionResponse(
        stdout=stdout,
        stderr=stderr,
        exitCode=exit_code,
        executionTimeMs=int(total_duration_ms)
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)


