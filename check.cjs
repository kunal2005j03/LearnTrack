const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
let openCount = 0;
let lastOpen = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') { openCount++; lastOpen = i; }
  else if (content[i] === '}') { openCount--; }
}
console.log('Open { count:', openCount);
let openP = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '(') openP++;
  else if (content[i] === ')') openP--;
}
console.log('Open ( count:', openP);
