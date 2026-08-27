const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
`      const execResponse = await fetch(\`\${baseUrl}/run\`, {`,
`      // Simulating a Sandbox Unavailable error
      return res.status(503).json({
        success: false,
        errorType: "SANDBOX_UNAVAILABLE",
        message: "Code execution service temporarily unavailable.",
        stdout: "",
        stderr: "Code execution service temporarily unavailable.",
        exitCode: -1,
        executionTimeMs: 0,
      });
      const execResponse = await fetch(\`\${baseUrl}/run\`, {`
);
fs.writeFileSync('server.ts', content);
