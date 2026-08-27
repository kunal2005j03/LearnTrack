const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
let opens = [];
for (let i=0; i<lines.length; i++) {
  let line = lines[i];
  for(let j=0; j<line.length; j++) {
    let c = line[j];
    if (c==='(' || c==='{') opens.push({c, line: i+1});
    else if (c===')') {
      let last = opens.reverse().find(o => o.c === '(');
      opens.reverse();
      if(last) opens.splice(opens.indexOf(last), 1);
    }
    else if (c==='}') {
      let last = opens.reverse().find(o => o.c === '{');
      opens.reverse();
      if(last) opens.splice(opens.indexOf(last), 1);
    }
  }
}
console.log("Unmatched:", opens);
