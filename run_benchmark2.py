import urllib.request
import json
import textwrap

python_code = textwrap.dedent("""
import time
import subprocess
import tempfile
import os

def measure_c():
    code = "#include <iostream>\\nint main() { std::cout << \\"Hello\\"; return 0; }\\n"
    with tempfile.TemporaryDirectory() as tmpdir:
        src = os.path.join(tmpdir, "main.cpp")
        exe = os.path.join(tmpdir, "main")
        with open(src, "w") as f:
            f.write(code)
        
        t0 = time.time()
        subprocess.run(["g++", src, "-o", exe], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return (time.time() - t0) * 1000

def measure_java():
    code = "class Main { public static void main(String[] args) { System.out.println(\\"Hello\\"); } }"
    with tempfile.TemporaryDirectory() as tmpdir:
        src = os.path.join(tmpdir, "Main.java")
        with open(src, "w") as f:
            f.write(code)
        
        t0 = time.time()
        subprocess.run(["javac", src], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        compile_ms = (time.time() - t0) * 1000
        
        t0 = time.time()
        subprocess.run(["java", "Main"], cwd=tmpdir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        exec_ms = (time.time() - t0) * 1000
        return compile_ms, exec_ms

print(f"C++ (iostream) Compile MS: {measure_c():.2f}")
j_comp, j_exec = measure_java()
print(f"Java Compile MS: {j_comp:.2f} | Exec MS: {j_exec:.2f}")

# Let's test the sandbox's actual /run endpoint behavior!
# I am running python inside the sandbox, so I can't easily hit localhost:8080 from here, but I can print the timings.
""")

def send_code(code):
    data = json.dumps({"language": "python", "code": code}).encode()
    req = urllib.request.Request("https://learntrack-main-1007878476787.us-central1.run.app/api/code/run", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode())

print("--- CLOUD RUN SANDBOX ---")
res = send_code(python_code)
print(res['stdout'])
if res['stderr']:
    print("STDERR:", res['stderr'])

