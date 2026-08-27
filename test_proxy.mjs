async function run() {
  const resp = await fetch('https://ais-dev-3svhnhit7oh6rgu4ot63qd-496371105301.asia-southeast1.run.app/api/code/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: "print('hello')", language: "python" })
  });
  console.log("Status:", resp.status);
  console.log("Text:", await resp.text());
}
run();
