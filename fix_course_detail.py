with open("src/pages/CourseDetailPage.tsx", "r") as f:
    code = f.read()

code = code.replace("getCourseRemainingTimeStats(course, videos, )", "getCourseRemainingTimeStats(course, videos, progressMap)")
code = code.replace("[course, videos, ]", "[course, videos, progressMap]")
code = code.replace("videos.find((v) => ![v.id]?.completed);", "videos.find((v) => !progressMap[v.id]?.completed);")
code = code.replace("const isCompleted = [v.id]?.completed;", "const isCompleted = progressMap[v.id]?.completed;")
code = code.replace("const progress = [vid.id];", "const progress = progressMap[vid.id];")

with open("src/pages/CourseDetailPage.tsx", "w") as f:
    f.write(code)
