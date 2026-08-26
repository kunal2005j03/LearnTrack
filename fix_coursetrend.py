with open("src/components/CourseTrendChart.tsx", "r") as f:
    code = f.read()

code = code.replace("Object.values()", "Object.values(progressMap)")
code = code.replace("Object.values( )", "Object.values(progressMap)")
code = code.replace("const p = [v.id];", "const p = progressMap[v.id];")
code = code.replace("getCourseRemainingTimeStats(activeCourse, cachedVideos[activeCourse?.id || ''], )", "getCourseRemainingTimeStats(activeCourse, cachedVideos[activeCourse?.id || ''], progressMap)")
code = code.replace("getCourseRemainingTimeStats(c, cachedVideos[c.id], )", "getCourseRemainingTimeStats(c, cachedVideos[c.id], progressMap)")
code = code.replace("[activeCourse, cachedVideos, ]", "[activeCourse, cachedVideos, progressMap]")
code = code.replace("[courses, activeId, cachedVideos, ]", "[courses, activeId, cachedVideos, progressMap]")

with open("src/components/CourseTrendChart.tsx", "w") as f:
    f.write(code)
