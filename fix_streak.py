with open("src/components/StreakCard.tsx", "r") as f:
    code = f.read()

code = code.replace(".activeDates", "stats.activeDates")
code = code.replace(".currentStreak", "stats.currentStreak")
code = code.replace("if () {", "if (continueLearningVideo) {")
code = code.replace("openVideo(.course.id, .video.id)", "openVideo(continueLearningVideo.course.id, continueLearningVideo.video.id)")
code = code.replace("{.currentStreak}", "{stats.currentStreak}")
code = code.replace("{ .currentStreak", "{stats.currentStreak")
code = code.replace(".totalWatchSeconds", "stats.totalWatchSeconds")
code = code.replace("{.bestStreak}", "{stats.bestStreak}")
code = code.replace("{ .bestStreak", "{stats.bestStreak")
code = code.replace("statsstats", "stats") # in case of double

with open("src/components/StreakCard.tsx", "w") as f:
    f.write(code)
