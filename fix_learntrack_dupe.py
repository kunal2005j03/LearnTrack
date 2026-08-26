with open("src/context/LearnTrackContext.tsx", "r") as f:
    code = f.read()

# I had `cachedVideos: Record<string, CourseVideo[]>;`
# and I replaced it with `cachedVideos:\n bookmarked...\n bookmarked...`
# Wait, let's just find and replace the whole block.
import re
code = re.sub(r'  bookmarkedCourses: Course\[\];\n  bookmarkedVideos: Array<\{ course\?: Course; video: CourseVideo \}>;\n  bookmarkedCourses: Course\[\];\n  bookmarkedVideos: Array<\{ course\?: Course; video: CourseVideo \}>;', '  bookmarkedCourses: Course[];\n  bookmarkedVideos: Array<{ course?: Course; video: CourseVideo }>;', code)

with open("src/context/LearnTrackContext.tsx", "w") as f:
    f.write(code)
