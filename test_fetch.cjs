const fetch = require('node-fetch'); // wait, native fetch in Node 22
async function run() {
  const baseUrl = process.env.EXECUTION_SERVICE_URL;
  console.log("baseUrl:", baseUrl);
  const resp = await fetch(`${baseUrl}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: "python", code: "print('hi')" })
  });
  console.log(resp.status);
  console.log(await resp.text());
}
run();
