const fs = require('fs');
let serverFile = fs.readFileSync('server.ts', 'utf-8');

const regex = /\/\*\*\n \* Returns authorization headers for calling a private Cloud Run service[\s\S]*?return \{ 'Content-Type': 'application\/json' \};\n  }\n}\n/m;

if (regex.test(serverFile)) {
  serverFile = serverFile.replace(regex, '');
  fs.writeFileSync('server.ts', serverFile);
  console.log('Removed getCloudRunAuthHeaders');
} else {
  console.log('Could not find getCloudRunAuthHeaders');
}
