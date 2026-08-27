import urllib.request
import json
import textwrap

python_code = textwrap.dedent("""
import time
import subprocess
import tempfile
import os

def measure_go():
    code = 'package main\\nimport "fmt"\\nfunc main() { fmt.Print("Hello") }\\n'
    # Use a persistent directory to see if GOCACHE works across iterations within the same process
    # But wait, execution-sandbox/main.py creates a new TemporaryDirectory for each request.
    
    with tempfile.TemporaryDirectory() as tmpdir:
        src = os.path.join(tmpdir, "main.go")
        exe = os.path.join(tmpdir, "main")
        with open(src, "w") as f:
            f.write(code)
        
        subprocess.run(["go", "mod", "init", "hello"], cwd=tmpdir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        t0 = time.time()
        subprocess.run(["go", "build", "-o", exe, src], cwd=tmpdir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return (time.time() - t0) * 1000

for i in range(5):
    print(f"Go iteration {i+1}: {measure_go():.2f} ms")

""")

def send_code(code):
    data = json.dumps({"language": "python", "code": code}).encode()
    req = urllib.request.Request("https://learntrack-main-1007878476787.us-central1.run.app/api/code/run", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode())

print("--- CLOUD RUN SANDBOX: GO MULTIPLE RUNS ---")
res = send_code(python_code)
print(res['stdout'])

