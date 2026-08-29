const { GoogleAuth } = require('google-auth-library');
async function test() {
  const auth = new GoogleAuth();
  const url = "https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app/run";
  const audience = "https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app";
  try {
    const client = await auth.getIdTokenClient(audience);
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
    if (e.response) {
       console.log("Error status:", e.response.status);
       console.log("Error data:", e.response.data);
    } else {
       console.error("Unknown error:", e.message);
    }
  }
}
test();
