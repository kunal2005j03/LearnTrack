import urllib.request
import json
import textwrap

python_code = textwrap.dedent("""
import os
import sys
import platform
import subprocess
import time
import tempfile
import multiprocessing

def measure_process_startup():
    t0 = time.time()
    subprocess.run(["python3", "-c", "pass"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return (time.time() - t0) * 1000

def measure_fs_performance():
    with tempfile.TemporaryDirectory() as tmpdir:
        t0 = time.time()
        filepath = os.path.join(tmpdir, "testfile.txt")
        with open(filepath, "w") as f:
            f.write("A" * 1024 * 1024 * 10)  # 10 MB
        write_ms = (time.time() - t0) * 1000
        
        t0 = time.time()
        with open(filepath, "r") as f:
            f.read()
        read_ms = (time.time() - t0) * 1000
        
        return write_ms, read_ms

def measure_cpu():
    t0 = time.time()
    x = 0
    for i in range(10**7):
        x += i
    return (time.time() - t0) * 1000

def measure_c_compilation():
    code = "#include <stdio.h>\\nint main() { printf(\\"Hello\\"); return 0; }\\n"
    with tempfile.TemporaryDirectory() as tmpdir:
        src = os.path.join(tmpdir, "main.c")
        exe = os.path.join(tmpdir, "main")
        with open(src, "w") as f:
            f.write(code)
        
        t0 = time.time()
        try:
            subprocess.run(["g++", src, "-o", exe], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            gcc_ms = (time.time() - t0) * 1000
            
            t0 = time.time()
            subprocess.run([exe], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            exec_ms = (time.time() - t0) * 1000
            return gcc_ms, exec_ms
        except Exception as e:
            return -1, -1

def measure_go_compilation():
    code = 'package main\\nimport "fmt"\\nfunc main() { fmt.Print("Hello") }\\n'
    with tempfile.TemporaryDirectory() as tmpdir:
        src = os.path.join(tmpdir, "main.go")
        exe = os.path.join(tmpdir, "main")
        with open(src, "w") as f:
            f.write(code)
        
        # init module
        subprocess.run(["go", "mod", "init", "hello"], cwd=tmpdir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        t0 = time.time()
        try:
            subprocess.run(["go", "build", "-o", exe, src], cwd=tmpdir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            go_ms = (time.time() - t0) * 1000
            
            t0 = time.time()
            subprocess.run([exe], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            exec_ms = (time.time() - t0) * 1000
            return go_ms, exec_ms
        except Exception as e:
            return -1, -1
            
def get_go_env():
    try:
        out = subprocess.check_output(["go", "env"], stderr=subprocess.PIPE).decode()
        cache = "GOCACHE: " + [line.split("=")[1] for line in out.splitlines() if line.startswith("GOCACHE=")][0]
        return cache
    except Exception as e:
        return "N/A: " + str(e)

print(f"OS: {platform.system()} {platform.release()}")
print(f"Arch: {platform.machine()}")
try:
    print(f"CPU Cores: {multiprocessing.cpu_count()}")
except:
    pass
print(f"Process Startup MS: {measure_process_startup():.2f}")
write_ms, read_ms = measure_fs_performance()
print(f"FS 10MB Write MS: {write_ms:.2f} | Read MS: {read_ms:.2f}")
print(f"CPU 10M loop MS: {measure_cpu():.2f}")
gcc_ms, c_exec_ms = measure_c_compilation()
print(f"G++ Compile MS: {gcc_ms:.2f} | Exec MS: {c_exec_ms:.2f}")
go_ms, go_exec_ms = measure_go_compilation()
print(f"Go Compile MS: {go_ms:.2f} | Exec MS: {go_exec_ms:.2f}")
print(f"Go Env: {get_go_env()}")
""")

def send_code(code):
    data = json.dumps({"language": "python", "code": code}).encode()
    req = urllib.request.Request("https://learntrack-main-1007878476787.us-central1.run.app/api/code/run", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode())

print("--- AI STUDIO BASELINE (LOCAL PYTHON SCRIPT) ---")
# I ran this earlier locally, I will just print the Cloud Run one now.
print("--- CLOUD RUN SANDBOX ---")
res = send_code(python_code)
print(res['stdout'])
if res['stderr']:
    print("STDERR:", res['stderr'])

