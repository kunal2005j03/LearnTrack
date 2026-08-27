async function run() {
    const fetch = require('node-fetch');
    const resp = await fetch("https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app/run", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: "print('hello')", language: "python" })
    });
    console.log("Status:", resp.status);
    console.log("Text:", await resp.text());
}
run();
