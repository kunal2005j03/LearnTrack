const fs = require('fs');
const file = 'src/components/InteractiveCodeTerminal.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
`    try {
      const resp = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      const data = await resp.json();
      setResult(data);
    } catch (err: any) {`,
`    try {
      const resp = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await resp.json();
        setResult(data);
      } else {
        const text = await resp.text();
        setResult({
          stdout: '',
          stderr: \`Server Error (\${resp.status}): The execution service returned an unexpected non-JSON response.\\n\\n\${text.substring(0, 200)}\`,
          exitCode: 1,
          executionTimeMs: 0,
        });
      }
    } catch (err: any) {`
);
fs.writeFileSync(file, content);
