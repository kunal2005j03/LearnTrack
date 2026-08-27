const admin = require('firebase-admin');
admin.initializeApp({
  projectId: 'ai-studio-learntrack-99c308e0-782f-44e7-845c-c564ba7fbb95'
});
const db = admin.firestore();

async function run() {
  const collections = await db.listCollections();
  console.log("Collections:", collections.map(c => c.id));
  
  // Maybe there's a deployments collection?
  const deployments = await db.collection('deployments').get();
  deployments.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}
run().catch(console.error);
