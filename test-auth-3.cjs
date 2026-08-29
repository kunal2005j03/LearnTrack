const { GoogleAuth } = require('google-auth-library');
async function test() {
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient("https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app");
  try {
    const headers = await client.getRequestHeaders();
    console.log("Headers without url:", headers);
  } catch(e) {
    console.error("Error getting headers without url:", e.message);
  }
}
test();
