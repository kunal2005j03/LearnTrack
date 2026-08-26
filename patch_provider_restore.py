import re

with open("src/context/LearnTrackContext.tsx", "r") as f:
    code = f.read()

code = code.replace("        cachedVideos,", "        cachedVideos,\n        bookmarkedCourses,\n        bookmarkedVideos,")
code = code.replace("  cachedVideos: Record<string, CourseVideo[]>;", "  cachedVideos: Record<string, CourseVideo[]>;\n  bookmarkedCourses: Course[];\n  bookmarkedVideos: Array<{ course?: Course; video: CourseVideo }>;")

with open("src/context/LearnTrackContext.tsx", "w") as f:
    f.write(code)
