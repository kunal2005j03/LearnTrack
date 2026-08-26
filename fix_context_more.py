with open("src/context/LearnTrackContext.tsx", "r") as f:
    code = f.read()

code = code.replace("  const = useMemo(() => {", "  const continueLearningVideo = useMemo(() => {")
code = code.replace("Object.values() as VideoProgress[]", "Object.values(progressStore.getSnapshot()) as VideoProgress[]")
code = code.replace("Object.values( ) as VideoProgress[]", "Object.values(progressStore.getSnapshot()) as VideoProgress[]")
code = code.replace("  const = useMemo(() => {", "  const recentlyWatchedList = useMemo(() => {")

with open("src/context/LearnTrackContext.tsx", "w") as f:
    f.write(code)
