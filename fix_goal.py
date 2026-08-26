with open("src/components/StudyGoalCard.tsx", "r") as f:
    code = f.read()

code = code.replace("getCourseRemainingTimeStats(course, videos, )", "getCourseRemainingTimeStats(course, videos, progressMap)")
code = code.replace("[course, videos, ]", "[course, videos, progressMap]")

with open("src/components/StudyGoalCard.tsx", "w") as f:
    f.write(code)
