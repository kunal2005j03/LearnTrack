const { GoogleAuth } = require('google-auth-library');
async function test() {
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient("https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app");
  console.log("Client created.");
  try {
    const headers = await client.getRequestHeaders();
    console.log("Headers:", headers);
  } catch(e) {
    console.error("Error getting headers:", e.message);
  }
}
test();
