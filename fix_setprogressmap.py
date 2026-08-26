with open("src/context/LearnTrackContext.tsx", "r") as f:
    code = f.read()

import re
code = re.sub(
    r'      setProgressMap\(\(prev\) => \{\n        const nextMap = \{ \.\.\.prev, \[videoId\]: progressRecord \};\n        if \(localStorageProgSaveTimerRef\.current\) \{\n          clearTimeout\(localStorageProgSaveTimerRef\.current\);\n        \}\n        localStorageProgSaveTimerRef\.current = setTimeout\(\(\) => \{\n          try \{\n            localStorage\.setItem\(`\$\{LOCAL_STORAGE_PROGRESS_KEY\}_\$\{curUserId\}`\, JSON\.stringify\(nextMap\)\);\n          \} catch \{\}\n        \}, 1000\);\n        return nextMap;\n      \}\);',
    r'''      progressStore.update(videoId, progressRecord);
      if (localStorageProgSaveTimerRef.current) {
        clearTimeout(localStorageProgSaveTimerRef.current);
      }
      localStorageProgSaveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(`${LOCAL_STORAGE_PROGRESS_KEY}_${curUserId}`, JSON.stringify(progressStore.getSnapshot()));
        } catch {}
      }, 1000);''',
    code
)

with open("src/context/LearnTrackContext.tsx", "w") as f:
    f.write(code)
