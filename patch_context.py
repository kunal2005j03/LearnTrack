import re

with open("src/context/LearnTrackContext.tsx", "r") as f:
    code = f.read()

# Add import for progressStore
if "import { progressStore } from '../store/progressStore';" not in code:
    code = code.replace("import { auth, db } from '../firebase';", "import { auth, db } from '../firebase';\nimport { progressStore } from '../store/progressStore';")

# Remove from interface
code = re.sub(r'  progressMap: Record<string, VideoProgress>; // videoId -> VideoProgress\n', '', code)
code = re.sub(r'  stats: UserStats;\n', '', code)
code = re.sub(r'  continueLearningVideo: .*?;\n', '', code)
code = re.sub(r'  recentlyWatchedList: .*?;\n', '', code)

# Remove state
code = re.sub(r'  const \[progressMap, setProgressMap\] = useState<Record<string, VideoProgress>>\({}\);\n', '', code)
code = re.sub(r'  const \[stats, setStats\] = useState<UserStats>\(\{.*?\}\);\n', '', code, flags=re.DOTALL)

# Replace progressMap initialization
code = code.replace("setProgressMap(JSON.parse(storedProgress));", "progressStore.set(JSON.parse(storedProgress));")

# Replace progressMapRef uses
code = code.replace("const progressMapRef = useRef(progressMap);\n  progressMapRef.current = progressMap;", "")
code = code.replace("progressMapRef.current", "progressStore.getSnapshot()")

# Replace setProgressMap uses
# 1. Inside fetchAiStudyPlan:
code = code.replace("""        if (hasDiff) {
          setProgressMap(pMap);""", """        if (hasDiff) {
          progressStore.set(pMap);""")
          
# 2. Inside saveProgress optimistic update 1:
code = code.replace("""      // Optimistic local state update
      setProgressMap((prev) => {
        const nextMap = { ...prev, [videoId]: progressRecord };
        if (localStorageProgSaveTimerRef.current) {
          clearTimeout(localStorageProgSaveTimerRef.current);
        }
        localStorageProgSaveTimerRef.current = setTimeout(() => {
          try {
            localStorage.setItem(`${LOCAL_STORAGE_PROGRESS_KEY}_${curUserId}`, JSON.stringify(nextMap));
          } catch {}
        }, 1000);
        return nextMap;
      });""", """      // Optimistic local state update
      progressStore.update(videoId, progressRecord);
      if (localStorageProgSaveTimerRef.current) {
        clearTimeout(localStorageProgSaveTimerRef.current);
      }
      localStorageProgSaveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(`${LOCAL_STORAGE_PROGRESS_KEY}_${curUserId}`, JSON.stringify(progressStore.getSnapshot()));
        } catch {}
      }, 1000);""")

# 3. Inside saveProgress completion logic:
code = code.replace("""      setProgressMap((prev) => {
        const next = { ...prev, [videoId]: record };
        try {
          localStorage.setItem(`${LOCAL_STORAGE_PROGRESS_KEY}_${curUserId}`, JSON.stringify(next));
        } catch {}
        return next;
      });""", """      progressStore.update(videoId, record);
      try {
        localStorage.setItem(`${LOCAL_STORAGE_PROGRESS_KEY}_${curUserId}`, JSON.stringify(progressStore.getSnapshot()));
      } catch {}""")

# Now the tricky part: Recalculating stats!
# Let's decouple the stats calculation effect by subscribing to the progressStore, but debounce it slightly or just run it when progressStore updates!
# Wait, we can just replace the useEffect with a subscription in the provider.
code = re.sub(r'  // Recalculate Course percentages and Stats dynamically when progressMap or courses change\n  useEffect\(\(\) => \{.*?\n  \}, \[progressMap, courses\.length, user\]\);', '', code, flags=re.DOTALL)

with open("src/context/LearnTrackContext.tsx", "w") as f:
    f.write(code)
