async function run() {
  const res = await fetch('http://localhost:3000/api/code/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'cpp', code: '#include <iostream>\nint main() { std::cout << "Hello Sandbox!"; return 0; }' })
  });
  console.log(await res.text());
}
run();
