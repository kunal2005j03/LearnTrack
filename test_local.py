import urllib.request
import json

def test_local(lang, code):
    try:
        data = json.dumps({"language": lang, "code": code}).encode()
        req = urllib.request.Request("http://localhost:3000/api/code/run", data=data, headers={"Content-Type": "application/json"})
        resp = urllib.request.urlopen(req)
        print(f"{lang}: {resp.read().decode()}")
    except Exception as e:
        print(f"{lang}: {e}")

test_local("python", 'print("Hello World!")')
test_local("cpp", '#include <iostream>\nint main() { std::cout << "Hello World!"; return 0; }')
test_local("go", 'package main\nimport "fmt"\nfunc main() { fmt.Println("Hello World!") }')
test_local("java", 'class Main { public static void main(String[] args) { System.out.println("Hello World!"); } }')

# Now let's try something other than hello world to show Gemini kicks in
test_local("cpp", '#include <iostream>\nint main() { std::cout << "Goodbye World!"; return 0; }')

