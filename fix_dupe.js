const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');
text = text.replace('  app.post("/api/code/run", async (req, res) => {\n  app.post("/api/code/run", async (req, res) => {\n', '  app.post("/api/code/run", async (req, res) => {\n');
fs.writeFileSync('server.ts', text);
