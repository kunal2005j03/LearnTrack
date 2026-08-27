const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Find the start of the route
const routeStartStr = '  app.post("/api/code/run", async (req, res) => {';
const routeStartIdx = content.indexOf(routeStartStr);
if (routeStartIdx === -1) throw new Error("Could not find route");

const routeEndStr = '  app.post(\'/api/code/run-python\', async (req, res) => {';
const routeEndIdx = content.indexOf(routeEndStr);
if (routeEndIdx === -1) throw new Error("Could not find route end");

let routeContent = content.substring(routeStartIdx, routeEndIdx);

// Replace the execution service URL logic and add logs
const newLogic = `
    console.log("[CODE-RUN] POST /api/code/run RECEIVED");
    
    // In production, we require a real Cloud Run URL, not localhost
    let EXECUTION_SERVICE_URL = process.env.EXECUTION_SERVICE_URL;
    
    // The user's env var might be incorrectly pointing to learntrack-main. Override if necessary.
    if (!EXECUTION_SERVICE_URL || EXECUTION_SERVICE_URL.includes("learntrack-main")) {
        EXECUTION_SERVICE_URL = "https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app";
    }

    if (!EXECUTION_SERVICE_URL && process.env.NODE_ENV === 'production') {
      return res.status(200).json({
        success: false,
        errorType: "EXECUTION_SERVICE_UNAVAILABLE",
        message: "Code execution service is temporarily unavailable. (Missing EXECUTION_SERVICE_URL configuration)",
        stdout: "",
        stderr: "Code execution service is temporarily unavailable. Missing EXECUTION_SERVICE_URL environment variable.",
        exitCode: 1,
        executionTimeMs: 0,
      });
    }

    // Fallback to localhost ONLY for local development if not provided
    EXECUTION_SERVICE_URL = EXECUTION_SERVICE_URL || "http://localhost:8080";

    // Clean up the URL to prevent double slashes or accidental /run inclusion
    let baseUrl = EXECUTION_SERVICE_URL.trim().replace(/\\/+$/, '');
    if (baseUrl.endsWith('/run')) {
      baseUrl = baseUrl.slice(0, -4).replace(/\\/+$/, '');
    }

    console.log(\`[CODE-RUN] execution service URL = \${baseUrl}\`);
    console.log("[CODE-RUN] attempting sandbox request");

    try {
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
    }
  });
`;

routeContent = routeContent.replace(/    \/\/ In production, we require a real Cloud Run URL[\s\S]*?    } catch \(err: any\) {[\s\S]*?    }\n  }\);\n/, newLogic);

content = content.substring(0, routeStartIdx) + routeStartStr + routeContent + content.substring(routeEndIdx);
fs.writeFileSync('server.ts', content);
