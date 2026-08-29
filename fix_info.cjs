const fs = require('fs');
let code = fs.readFileSync('src/pages/VideoPlayerPage.tsx', 'utf-8');

if (!code.includes('Info,') && !code.includes('Info } from "lucide-react"')) {
  code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, Info } from 'lucide-react';");
  fs.writeFileSync('src/pages/VideoPlayerPage.tsx', code);
}
