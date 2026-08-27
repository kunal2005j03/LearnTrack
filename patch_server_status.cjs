const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/res\.status\(503\)/g, 'res.status(500)');
fs.writeFileSync('server.ts', content);
