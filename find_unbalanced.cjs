const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
let p = 0; let b = 0;
for (let i=0; i<lines.length; i++) {
  let line = lines[i];
  for(let c of line) {
    if (c==='(') p++; if (c===')') p--;
    if (c==='{') b++; if (c==='}') b--;
  }
  if (p < 0 || b < 0) { console.log("Negative at line", i+1); break; }
}
console.log("End p:", p, "b:", b);
