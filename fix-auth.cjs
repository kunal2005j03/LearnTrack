const fs = require('fs');
let serverFile = fs.readFileSync('server.ts', 'utf-8');

const oldTryBlock = `    try {
      // Obtain Google Cloud Run IAM ID token headers for private service-to-service communication
      const authHeaders = await getCloudRunAuthHeaders(baseUrl);
      
      const execResponse = await fetch(\`\${baseUrl}/run\`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          language: cleanLang,
          code,
          input
        }),
      });

      console.log(\`[CODE-RUN] sandbox status = \${execResponse.status}\`);
      console.log(\`[CODE-RUN] sandbox content-type = \${execResponse.headers.get('content-type')}\`);

      // Handle Private Cloud Run IAM Authentication Errors (401 / 403)
      if (execResponse.status === 401 || execResponse.status === 403) {
        return res.status(200).json({
          success: false,
          errorType: "EXECUTION_SERVICE_AUTH_REQUIRED",
          message: "Private Cloud Run execution service requires IAM authentication (roles/run.invoker).",
          stdout: "",
          stderr: \`Authentication Error (\${execResponse.status}): Access denied to private Cloud Run execution sandbox. In production, ensure the LearnTrack backend service account has the 'roles/run.invoker' role on learntrack-execution-sandbox.\`,
          exitCode: 1,
          executionTimeMs: 0,
        });
      }

      if (execResponse.status === 404 || !execResponse.ok) {
        return res.status(200).json({
          success: false,
          errorType: "SANDBOX_UNAVAILABLE",
          message: "Code execution service temporarily unavailable.",
          stdout: "",
          stderr: \`Code execution service temporarily unavailable (HTTP \${execResponse.status}).\`,
          exitCode: -1,
          executionTimeMs: 0,
        });
      }

      const contentType = execResponse.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
         const text = await execResponse.text();
         return res.status(200).json({
            success: false,
            errorType: "SANDBOX_UNAVAILABLE",
            message: "Sandbox returned non-JSON.",
            stdout: "",
            stderr: \`Sandbox returned non-JSON (HTTP \${execResponse.status}): \\n\\n\${text.substring(0,200)}\`,
            exitCode: -1,
            executionTimeMs: 0,
         });
      }

      const result = await execResponse.json();
      return res.json(result);
    } catch (err: any) {
      console.error("Code execution service error:", err);
      return res.status(200).json({
        success: false,
        errorType: "SANDBOX_UNAVAILABLE",
        message: "Code execution service temporarily unavailable.",
        stdout: "",
        stderr: \`Code execution service error: \${err.message}\`,
        exitCode: -1,
        executionTimeMs: 0,
      });
    }`;

const newTryBlock = `    try {
      const auth = getGoogleAuthClient();
      let execResponse;
      
      const isLocal = baseUrl.startsWith('http://localhost') || baseUrl.startsWith('http://127.0.0.1');
      if (isLocal) {
        execResponse = await fetch(\`\${baseUrl}/run\`, {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: cleanLang, code, input })
        });
      } else {
        const client = await auth.getIdTokenClient(baseUrl);
        execResponse = await client.request({
          url: \`\${baseUrl}/run\`,
          method: "POST",
          data: { language: cleanLang, code, input }
        });
      }

      let status = isLocal ? execResponse.status : (execResponse as any).status;
      let contentType = isLocal 
        ? execResponse.headers.get('content-type') || ''
        : ((execResponse as any).headers && (execResponse as any).headers['content-type']) || '';
      
      console.log(\`[CODE-RUN] sandbox status = \${status}\`);
      console.log(\`[CODE-RUN] sandbox content-type = \${contentType}\`);

      let data = isLocal ? await execResponse.json() : (execResponse as any).data;
      return res.json(data);
    } catch (err: any) {
      console.error("Code execution service error:", err);
      
      let status = err.response?.status;
      let data = err.response?.data;
      
      if (status === 401 || status === 403) {
        return res.status(200).json({
          success: false,
          errorType: "EXECUTION_SERVICE_AUTH_REQUIRED",
          message: "Private Cloud Run execution service requires IAM authentication (roles/run.invoker).",
          stdout: "",
          stderr: \`Authentication Error (\${status}): Access denied to private Cloud Run execution sandbox. In production, ensure the LearnTrack backend service account has the 'roles/run.invoker' role on learntrack-execution-sandbox.\`,
          exitCode: 1,
          executionTimeMs: 0,
        });
      }
      
      if (status) {
         let textError = typeof data === 'string' ? data : JSON.stringify(data);
         return res.status(200).json({
            success: false,
            errorType: "SANDBOX_UNAVAILABLE",
            message: "Code execution service returned an error.",
            stdout: "",
            stderr: \`Sandbox error (HTTP \${status}): \\n\\n\${(textError || '').substring(0,200)}\`,
            exitCode: -1,
            executionTimeMs: 0,
         });
      }
      
      return res.status(200).json({
        success: false,
        errorType: "SANDBOX_UNAVAILABLE",
        message: "Code execution service temporarily unavailable.",
        stdout: "",
        stderr: \`Code execution service error: \${err.message}\`,
        exitCode: -1,
        executionTimeMs: 0,
      });
    }`;

if (serverFile.includes(oldTryBlock)) {
  serverFile = serverFile.replace(oldTryBlock, newTryBlock);
  fs.writeFileSync('server.ts', serverFile);
  console.log('Successfully patched server.ts!');
} else {
  console.error('Could not find old try block in server.ts');
}
