with open("src/components/CourseCard.tsx", "r") as f:
    code = f.read()

code = code.replace("getCourseRemainingTimeStats(course, cachedVideos[course.id], );", "getCourseRemainingTimeStats(course, cachedVideos[course.id], progressMap);")
code = code.replace("[course, cachedVideos, ]", "[course, cachedVideos, progressMap]")
code = code.replace("Object.values()", "Object.values(progressMap)")
code = code.replace("Object.values( )", "Object.values(progressMap)")

with open("src/components/CourseCard.tsx", "w") as f:
    f.write(code)
