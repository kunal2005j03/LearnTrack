async function runLang(lang, code) {
  try {
    const res = await fetch("http://localhost:3000/api/code/run", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang, code: code, input: '' })
    });
    const data = await res.json();
    console.log(`[${lang}]`, data.success ? 'SUCCESS' : 'FAILED', data.stdout || data.stderr);
  } catch(e) {
    console.error(`[${lang}] Error:`, e.message);
  }
}

async function testAll() {
  await runLang('python', 'print("Hello World")');
  await runLang('cpp', '#include <iostream>\nint main() { std::cout << "Hello World"; return 0; }');
  await runLang('java', 'public class Main { public static void main(String[] args) { System.out.println("Hello World"); } }');
  await runLang('go', 'package main\nimport "fmt"\nfunc main() { fmt.Print("Hello World") }');
}
testAll();
