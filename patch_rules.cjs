const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');
const search = "match /stats/{statId} {\n        allow read, write: if isOwner(userId);\n      }";
const replace = `match /stats/{statId} {
        allow read, write: if isOwner(userId);
      }
      // User's study commitments
      match /studyCommitments/{commitmentId} {
        allow read, write: if isOwner(userId);
      }`;
code = code.replace(search, replace);
fs.writeFileSync('firestore.rules', code);
