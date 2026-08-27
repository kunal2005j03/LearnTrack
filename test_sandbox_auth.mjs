import { GoogleAuth } from 'google-auth-library';
// just print the email to see what service account we are
async function printEmail() {
  const auth = new GoogleAuth();
  try {
    const client = await auth.getClient();
    const creds = await auth.getCredentials();
    console.log("Credentials:", creds.client_email);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
printEmail();
