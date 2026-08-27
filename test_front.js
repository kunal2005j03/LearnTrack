async function run() {
  const resp = await fetch('http://localhost:3000/api/code/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: "print('hello')", language: "python" })
  });
  console.log("Status:", resp.status);
  console.log("Content-Type:", resp.headers.get("content-type"));
  const text = await resp.text();
  console.log("Body:", text.substring(0, 100));
}
run();
