const fs = require('fs');
let serverFile = fs.readFileSync('server.ts', 'utf-8');

serverFile = serverFile.replace(
  'console.error("Code execution service error:", err);',
  'console.error(`Code execution service error: ${err.message}`);'
);

fs.writeFileSync('server.ts', serverFile);
console.log('Fixed logs in server.ts');
