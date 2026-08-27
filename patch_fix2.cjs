const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  '  app.post("/api/code/run", async (req, res) => {\n  app.post("/api/code/run", async (req, res) => {',
  '  app.post("/api/code/run", async (req, res) => {'
);
fs.writeFileSync('server.ts', content);
