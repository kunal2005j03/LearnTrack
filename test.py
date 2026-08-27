import urllib.request
import json
import textwrap

def test_code(lang, code):
    data = json.dumps({"language": lang, "code": code}).encode()
    req = urllib.request.Request("http://localhost:3000/api/code/run", data=data, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req)
        res = json.loads(resp.read().decode())
        print(f"[{lang}] SUCCESS:")
        print(" stdout:", repr(res.get('stdout')))
        print(" stderr:", repr(res.get('stderr')))
        print(" exitCode:", res.get('exitCode'))
        print(" timeMs:", res.get('executionTimeMs'))
    except urllib.error.HTTPError as e:
        res = json.loads(e.read().decode())
        print(f"[{lang}] ERROR {e.code}:")
        print(" errorType:", res.get('errorType'))
        print(" stdout:", repr(res.get('stdout')))
        print(" stderr:", repr(res.get('stderr')))
        print(" exitCode:", res.get('exitCode'))
        print(" timeMs:", res.get('executionTimeMs'))

print("--- Testing Python ---")
test_code("python", 'print("Hello World!")')

print("--- Testing C++ ---")
test_code("cpp", textwrap.dedent("""\
#include <iostream>
int main() {
    std::cout << "Hello World!";
}
"""))

print("--- Testing Go ---")
test_code("go", textwrap.dedent("""\
package main
import "fmt"
func main() {
    fmt.Println("Hello World!")
}
"""))

print("--- Testing Java ---")
test_code("java", textwrap.dedent("""\
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}
"""))
