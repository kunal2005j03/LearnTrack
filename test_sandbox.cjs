const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');

async function test() {
  try {
    const targetUrl = 'https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app';
    const auth = new GoogleAuth();
    let client;
    try {
      client = await auth.getIdTokenClient(targetUrl);
    } catch (e) {
      console.log("Could not get ID token client, probably no ADC found.");
      // proceed without auth
    }
    
    let headers = { 'Content-Type': 'application/json' };
    if (client) {
        const clientHeaders = await client.getRequestHeaders();
        headers = { ...headers, ...clientHeaders };
    }
    
    const resp = await fetch(targetUrl + '/run', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        language: 'python',
        code: 'print("hello from test script")'
      })
    });
    console.log("Status:", resp.status);
    const text = await resp.text();
    console.log("Body:", text);
  } catch(e) {
    console.error(e);
  }
}
test();
