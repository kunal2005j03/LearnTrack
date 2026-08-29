const { GoogleAuth } = require('google-auth-library');
async function test() {
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient("https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app");
  console.log("Client created.");
  try {
    const headers = await client.getRequestHeaders("https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app/run");
    console.log("Is Headers instance?", headers.constructor.name);
    console.log("Has forEach?", typeof headers.forEach);
    const headersMap = {};
    if (typeof headers.forEach === 'function') {
      headers.forEach((v, k) => headersMap[k] = v);
    } else {
      for (const [k, v] of Object.entries(headers)) headersMap[k] = v;
    }
    console.log("Extracted map:", headersMap);
  } catch(e) {
    console.error("Error getting headers:", e.message);
  }
}
test();
