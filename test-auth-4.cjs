const { GoogleAuth } = require('google-auth-library');
async function test() {
  const auth = new GoogleAuth();
  const url = "https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app/run";
  const audience = "https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app";
  const client = await auth.getIdTokenClient(audience);
  try {
    const res = await client.request({
      url: url,
      method: 'POST',
      data: {
        language: 'python',
        code: 'print("Hello World")',
        input: ''
      }
    });
    console.log("Status:", res.status);
    console.log("Data:", res.data);
  } catch(e) {
    console.error("Error making request:", e.message);
    if (e.response) {
       console.error("Response data:", e.response.data);
    }
  }
}
test();
