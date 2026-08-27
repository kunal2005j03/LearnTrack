const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
`      // Simulating a Sandbox Unavailable error
      return res.status(503).json({
        success: false,
        errorType: "SANDBOX_UNAVAILABLE",
        message: "Code execution service temporarily unavailable.",
        stdout: "",
        stderr: "Code execution service temporarily unavailable.",
        exitCode: -1,
        executionTimeMs: 0,
      });`,
`      // Simulating a Cloud Run intercepted 503 HTML error
      return res.status(503).type('text/html').send('<html><body><h1>503 Service Unavailable</h1></body></html>');`
);
fs.writeFileSync('server.ts', content);
