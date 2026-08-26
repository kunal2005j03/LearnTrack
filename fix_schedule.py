with open("src/components/StudyScheduleModal.tsx", "r") as f:
    code = f.read()

code = code.replace("getCourseRemainingTimeStats(course, cachedVideos[course.id], )", "getCourseRemainingTimeStats(course, cachedVideos[course.id], progressMap)")
code = code.replace("[course, cachedVideos, ]", "[course, cachedVideos, progressMap]")

with open("src/components/StudyScheduleModal.tsx", "w") as f:
    f.write(code)
