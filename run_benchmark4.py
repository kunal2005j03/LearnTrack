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
    
    with tempfile.TemporaryDirectory() as tmpdir:
        src = os.path.join(tmpdir, "main.go")
        exe = os.path.join(tmpdir, "main")
        with open(src, "w") as f:
            f.write(code)
        
        env = os.environ.copy()
        env["GO111MODULE"] = "off"
        env["GOPROXY"] = "off"
        env["GOSUMDB"] = "off"
        # don't override GOCACHE so we use the default
        
        t0 = time.time()
        subprocess.run(["go", "build", "-ldflags=-s -w", "-o", exe, src], cwd=tmpdir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
        return (time.time() - t0) * 1000

for i in range(5):
    print(f"Go iteration {i+1}: {measure_go():.2f} ms")

""")

def send_code(code):
    data = json.dumps({"language": "python", "code": code}).encode()
    req = urllib.request.Request("https://learntrack-main-1007878476787.us-central1.run.app/api/code/run", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode())

print("--- CLOUD RUN SANDBOX: EXACT GO BUILD COMMAND ---")
res = send_code(python_code)
print(res['stdout'])

