async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/code/run", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'python',
        code: 'print("Hello World")',
        input: ''
      })
    });
    const data = await res.json();
    console.log("Response:", data);
  } catch(e) {
    console.error("Fetch error:", e.message);
  }
}
test();
