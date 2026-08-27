const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
`      // Simulating a Cloud Run intercepted 503 HTML error
      return res.status(503).type('text/html').send('<html><body><h1>503 Service Unavailable</h1></body></html>');
      const execResponse = await fetch(\`\${baseUrl}/run\`, {`,
`      const execResponse = await fetch(\`\${baseUrl}/run\`, {`
);
fs.writeFileSync('server.ts', content);
