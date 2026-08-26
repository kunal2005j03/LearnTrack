with open("src/pages/DashboardPage.tsx", "r") as f:
    code = f.read()

# Replace empty or missing vars
code = code.replace("if (!) return null;", "if (!continueLearningVideo) return null;")
code = code.replace("  if (!continueLearningVideo) return null;", "  if (!continueLearningVideo) return null;") # to prevent double
code = code.replace("    .course,", "    continueLearningVideo.course,")
code = code.replace("    cachedVideos[.course.id],", "    cachedVideos[continueLearningVideo.course.id],")
code = code.replace("  }, [, cachedVideos, ]);", "  }, [continueLearningVideo, cachedVideos, progressMap]);")
code = code.replace("Object.values()", "Object.values(progressMap)")
code = code.replace("Object.values( )", "Object.values(progressMap)")
code = code.replace("}, []);", "}, [progressMap]);")
code = code.replace("getCourseRemainingTimeStats(c, cachedVideos[c.id], )", "getCourseRemainingTimeStats(c, cachedVideos[c.id], progressMap)")
code = code.replace("[courses, cachedVideos, ]", "[courses, cachedVideos, progressMap]")

# continueLearningVideo JSX
code = code.replace("{ ? (", "{continueLearningVideo ? (")
code = code.replace("openVideo(", "openVideo(")
code = code.replace(".course.id,", "continueLearningVideo.course.id,")
code = code.replace(".video.id", "continueLearningVideo.video.id")
code = code.replace("src={.video.thumbnail}", "src={continueLearningVideo.video.thumbnail}")
code = code.replace("alt={.video.title}", "alt={continueLearningVideo.video.title}")
code = code.replace("{formatSeconds(.progress.watchedSeconds)}", "{formatSeconds(continueLearningVideo.progress.watchedSeconds)}")
code = code.replace(".progress.durationSeconds ||", "continueLearningVideo.progress.durationSeconds ||")
code = code.replace(".video.durationSeconds", "continueLearningVideo.video.durationSeconds")
code = code.replace("{.course.title}", "{continueLearningVideo.course.title}")
code = code.replace("{.video.title}", "{continueLearningVideo.video.title}")
code = code.replace("{.progress.percentage}%", "{continueLearningVideo.progress.percentage}%")
code = code.replace("width: `${Math.min(100, .progress.percentage)}%`,", "width: `${Math.min(100, continueLearningVideo.progress.percentage)}%`,")

# stats JSX
code = code.replace("{.totalCourses}", "{stats.totalCourses}")
code = code.replace("{.completedVideos}", "{stats.completedVideos}")
code = code.replace("{formatTotalWatchTime(.totalWatchSeconds)}", "{formatTotalWatchTime(stats.totalWatchSeconds)}")
code = code.replace("<span>{.currentStreak}</span>", "<span>{stats.currentStreak}</span>")
code = code.replace("{.completedVideos} / {.completedVideos + totalRemainingStats.unwatchedVideos}", "{stats.completedVideos} / {stats.completedVideos + totalRemainingStats.unwatchedVideos}")

# fix other broken brackets
code = code.replace("{ .completedVideos } / { .completedVideos + totalRemainingStats.unwatchedVideos }", "{stats.completedVideos} / {stats.completedVideos + totalRemainingStats.unwatchedVideos}")

with open("src/pages/DashboardPage.tsx", "w") as f:
    f.write(code)
