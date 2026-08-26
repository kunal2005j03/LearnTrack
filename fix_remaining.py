files = [
    "src/components/StudyGoalCard.tsx",
    "src/components/StudyScheduleModal.tsx",
    "src/pages/CourseDetailPage.tsx"
]

for file in files:
    with open(file, "r") as f:
        code = f.read()

    code = code.replace("getCourseRemainingTimeStats(course, videos, );", "getCourseRemainingTimeStats(course, videos, progressMap);")
    code = code.replace("getCourseRemainingTimeStats(course, cachedVideos[course.id], );", "getCourseRemainingTimeStats(course, cachedVideos[course.id], progressMap);")
    code = code.replace("getCourseRemainingTimeStats(course, videos, progressMap);", "getCourseRemainingTimeStats(course, videos, progressMap);")

    code = code.replace("[course, videos, ];", "[course, videos, progressMap];")
    code = code.replace("[course, videos, ]", "[course, videos, progressMap]")
    code = code.replace("[course, cachedVideos, ]", "[course, cachedVideos, progressMap]")

    with open(file, "w") as f:
        f.write(code)
