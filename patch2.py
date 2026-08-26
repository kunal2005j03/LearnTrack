import re

with open("src/components/CourseAiAssistant.tsx", "r") as f:
    code = f.read()

# Make sure it's imported
if "import { playerProgressStore }" not in code:
    code = code.replace("import React, { useState, useEffect, useRef } from 'react';", 
        "import React, { useState, useEffect, useRef } from 'react';\nimport { playerProgressStore } from '../utils/playerProgress';")

code = code.replace("currentTimeSeconds: number;", "currentTimeSeconds?: number;")

code = re.sub(
    r'(\}\) => \{)(\s+const storageKey)',
    r'''}) => {
  const [localTime, setLocalTime] = useState(currentTimeSeconds || 0);
  useEffect(() => {
    if (currentTimeSeconds !== undefined) {
      setLocalTime(currentTimeSeconds);
      return;
    }
    setLocalTime(playerProgressStore.currentTime);
    return playerProgressStore.subscribeThrottled((cur) => setLocalTime(cur), 1000);
  }, [currentTimeSeconds]);
  
  const effectiveTimeSeconds = localTime;
\2''',
    code
)

code = code.replace("currentTimeSeconds >=", "effectiveTimeSeconds >=")
code = code.replace("currentTimeSeconds <", "effectiveTimeSeconds <")
code = code.replace("currentTimeSeconds:", "effectiveTimeSeconds:")
code = code.replace("formatTime(currentTimeSeconds)", "formatTime(effectiveTimeSeconds)")
code = code.replace("? doubtContext.timestampSeconds : currentTimeSeconds", "? doubtContext.timestampSeconds : effectiveTimeSeconds")

with open("src/components/CourseAiAssistant.tsx", "w") as f:
    f.write(code)

with open("src/components/InThisVideoPanel.tsx", "r") as f:
    code = f.read()

if "import { playerProgressStore }" not in code:
    code = code.replace("import React, { useState, useMemo, useEffect, useRef } from 'react';", 
        "import React, { useState, useMemo, useEffect, useRef } from 'react';\nimport { playerProgressStore } from '../utils/playerProgress';")

code = code.replace("currentTime: number;", "currentTime?: number;")

code = re.sub(
    r'(\}\) => \{)(\s+const \[activeTab, setActiveTab\])',
    r'''}) => {
  const [localTime, setLocalTime] = useState(currentTime || 0);
  useEffect(() => {
    if (currentTime !== undefined) {
      setLocalTime(currentTime);
      return;
    }
    setLocalTime(playerProgressStore.currentTime);
    return playerProgressStore.subscribeThrottled((cur) => {
      setLocalTime(cur);
    }, 500);
  }, [currentTime]);
  
  const effectiveTime = localTime;
\2''',
    code
)

code = code.replace("currentTime >=", "effectiveTime >=")
code = code.replace("currentTime <", "effectiveTime <")
code = code.replace("[chapters, currentTime]", "[chapters, effectiveTime]")

with open("src/components/InThisVideoPanel.tsx", "w") as f:
    f.write(code)

