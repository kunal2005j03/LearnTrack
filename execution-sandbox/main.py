from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import tempfile
import os
import time

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
    
    with tempfile.TemporaryDirectory() as temp_dir:
        command = []
        
        if language in ["python", "py"]:
            file_path = os.path.join(temp_dir, "main.py")
            with open(file_path, "w") as f:
                f.write(code)
            command = ["python3", "-u", "main.py"]
            
        elif language in ["go", "golang"]:
            file_path = os.path.join(temp_dir, "main.go")
            with open(file_path, "w") as f:
                f.write(code)
            command = ["go", "run", "main.go"]
            
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

        env = os.environ.copy()
        if language in ["go", "golang"]:
            env["GOCACHE"] = os.path.join(temp_dir, "gocache")

        try:
            # We use subprocess.run with timeout
            # In Google Cloud Run, memory and CPU bounds are strictly enforced at the container level.
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
    # Default to 8080 as requested for Cloud Run
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
