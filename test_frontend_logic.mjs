async function run() {
  const resp = await fetch('http://localhost:3000/api/code/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: "print('hello')", language: "python" })
  });
  
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await resp.json();
    console.log("Parsed JSON:", data);
  } else {
    const text = await resp.text();
    console.log("Parsed HTML safely. Stderr would be:");
    console.log(`Server Error (${resp.status}): The execution service returned an unexpected non-JSON response.\n\n${text.substring(0, 200)}`);
  }
}
run();
