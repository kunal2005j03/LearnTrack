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

test_code("python", 'print("Hello World!")')
