const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');
text = text.replace('  app.post("/api/code/run", async (req, res) => {  app.post("/api/code/run", async (req, res) => {', '  app.post("/api/code/run", async (req, res) => {');
fs.writeFileSync('server.ts', text);
