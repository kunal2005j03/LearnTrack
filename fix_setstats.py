import re
with open("src/context/LearnTrackContext.tsx", "r") as f:
    code = f.read()

code = code.replace("setStats(JSON.parse(storedStats));", "progressStore.setStats(JSON.parse(storedStats));")

replace_block = """          setStats((prev) => {
            if (
              prev.completedVideos === loadedStats.completedVideos &&
              prev.overallProgress === loadedStats.overallProgress &&
              prev.currentStreak === loadedStats.currentStreak &&
              Math.abs(prev.totalWatchSeconds - loadedStats.totalWatchSeconds) < 5
            ) {
              return prev;
            }
            try {
              localStorage.setItem(`${LOCAL_STORAGE_STATS_KEY}_${user.uid}`, JSON.stringify(loadedStats));
            } catch {}
            return loadedStats;
          });"""

with_block = """          const prev = progressStore.getStats() || { activeDates: [], totalCourses: 0, completedVideos: 0, totalWatchSeconds: 0, overallProgress: 0 } as any;
          if (
            prev.completedVideos === loadedStats.completedVideos &&
            prev.overallProgress === loadedStats.overallProgress &&
            prev.currentStreak === loadedStats.currentStreak &&
            Math.abs(prev.totalWatchSeconds - loadedStats.totalWatchSeconds) < 5
          ) {
            return;
          }
          try {
            localStorage.setItem(`${LOCAL_STORAGE_STATS_KEY}_${user.uid}`, JSON.stringify(loadedStats));
          } catch {}
          progressStore.setStats(loadedStats);"""

code = code.replace(replace_block, with_block)

# And one more:
# src/context/LearnTrackContext.tsx(986,7): error TS2740: Type 'string[]' is missing the following properties from type 'VideoProgress': userId, courseId, videoId, watchedSeconds, and 5 more.
# This means `record` in `saveProgress` was wrongly transformed! Let's find it.
with open("src/context/LearnTrackContext.tsx", "w") as f:
    f.write(code)
