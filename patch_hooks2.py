import re
with open("src/hooks/useProgress.ts", "r") as f:
    code = f.read()

code = code.replace("const progressMap = useProgressMap();", "")
code = code.replace("  return useMemo(() => {", "  return useProgressSelector((progressMap) => {")
code = code.replace("  }, [progressMap, courses, cachedVideos]);", "  }, (a, b) => a?.video?.id === b?.video?.id && a?.course?.id === b?.course?.id); // Only re-render if the target video changes!")

# Also add import for Course
code = code.replace("import { VideoProgress, UserStats } from '../types';", "import { VideoProgress, UserStats, Course, CourseVideo } from '../types';")

with open("src/hooks/useProgress.ts", "w") as f:
    f.write(code)
