import re

with open("src/components/InThisVideoPanel.tsx", "r") as f:
    code = f.read()

if "import { playerProgressStore }" not in code:
    code = code.replace("import React, { useState, useMemo, useEffect, useRef } from 'react';", 
        "import React, { useState, useMemo, useEffect, useRef } from 'react';\nimport { playerProgressStore } from '../utils/playerProgress';")

code = code.replace("currentTime?: number;", "currentTime?: number;")
code = code.replace(
"""  isFloatingOverlay = false,
}) => {""",
"""  isFloatingOverlay = false,
}) => {
  const [localTime, setLocalTime] = useState(currentTime || 0);
  useEffect(() => {
    // If currentTime is passed explicitly (legacy), don't subscribe.
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
""")

code = code.replace("currentTime >=", "effectiveTime >=")
code = code.replace("currentTime <", "effectiveTime <")
code = code.replace("[chapters, currentTime]", "[chapters, effectiveTime]")

with open("src/components/InThisVideoPanel.tsx", "w") as f:
    f.write(code)

