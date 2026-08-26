const fs = require('fs');
let code = fs.readFileSync('src/components/InThisVideoPanel.tsx', 'utf8');

if (!code.includes("import { playerProgressStore }")) {
  code = code.replace("import React, { useState, useMemo, useEffect, useRef } from 'react';", 
    "import React, { useState, useMemo, useEffect, useRef } from 'react';\nimport { playerProgressStore } from '../utils/playerProgress';");
}

code = code.replace(
  "  isFloatingOverlay = false,\n}) => {",
  `  isFloatingOverlay = false,\n}) => {
  const [localTime, setLocalTime] = useState(currentTime || 0);
  useEffect(() => {
    if (currentTime !== undefined) return;
    return playerProgressStore.subscribeThrottled((cur) => {
      setLocalTime(cur);
    }, 500); // 500ms is a good balance for transcript highlighting
  }, [currentTime]);
  
  const effectiveTime = currentTime !== undefined ? currentTime : localTime;
`
);

code = code.replace(/currentTime/g, "effectiveTime");
// Wait, replacing all `currentTime` will also replace the prop name and useEffect deps.
