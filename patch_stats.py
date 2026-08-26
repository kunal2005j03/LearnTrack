import re

with open("src/context/LearnTrackContext.tsx", "r") as f:
    code = f.read()

stats_effect = """
  // Recalculate Course percentages and Stats dynamically when progressMap or courses change
  useEffect(() => {
    if (!user) return;
    const unsub = progressStore.subscribe(() => {
      let completedVideoCount = 0;
      let totalWatchSec = 0;
      const currentStats = progressStore.getStats() || { activeDates: [], totalCourses: 0, completedVideos: 0, totalWatchSeconds: 0, overallProgress: 0 };
      const activeDateSet = new Set<string>(currentStats.activeDates || []);

      const pMap = progressStore.getSnapshot();
      (Object.values(pMap) as VideoProgress[]).forEach((p) => {
        if (p.completed) {
          completedVideoCount++;
        }
        totalWatchSec += p.watchedSeconds || 0;
        if (p.lastWatchedAt && (p.watchedSeconds > 0 || p.completed)) {
          try {
            const d = new Date(p.lastWatchedAt);
            if (!isNaN(d.getTime())) {
              activeDateSet.add(getLocalDateString(d));
            } else if (p.lastWatchedAt.length >= 10) {
              activeDateSet.add(p.lastWatchedAt.substring(0, 10));
            }
          } catch {
            if (p.lastWatchedAt.length >= 10) {
              activeDateSet.add(p.lastWatchedAt.substring(0, 10));
            }
          }
        }
      });

      const activeDatesArray = Array.from(activeDateSet);
      const streakInfo = calculateStreaks(activeDatesArray);

      let totalCoursesVideos = 0;
      courses.forEach((c) => {
        totalCoursesVideos += c.totalVideos || 0;
      });

      const overallPct =
        totalCoursesVideos > 0 ? Math.round((completedVideoCount / totalCoursesVideos) * 100) : 0;

      const newStats: UserStats = {
        totalCourses: courses.length,
        completedVideos: completedVideoCount,
        totalWatchSeconds: totalWatchSec,
        overallProgress: Math.min(100, overallPct),
        currentStreak: streakInfo.current,
        bestStreak: streakInfo.best,
        lastActiveDate: activeDatesArray.sort().pop() || '',
        activeDates: activeDatesArray,
      };

      // Only update stats if something meaningfully changed
      if (
        newStats.totalWatchSeconds !== currentStats.totalWatchSeconds ||
        newStats.completedVideos !== currentStats.completedVideos ||
        newStats.totalCourses !== currentStats.totalCourses
      ) {
        progressStore.setStats(newStats);
        
        // Update stats document in Firestore DEBOUNCED to avoid rapid write bursts
        if (statsSyncTimerRef.current) {
          clearTimeout(statsSyncTimerRef.current);
        }
        statsSyncTimerRef.current = setTimeout(() => {
          setDoc(doc(db, `users/${user.uid}/stats/overview`), newStats, { merge: true }).catch((e) =>
            console.warn('Failed to sync stats to Firestore:', e)
          );
        }, 8000);
      }
    });

    // Run once on mount / deps change
    progressStore.update('trigger', progressStore.getSnapshot()['trigger'] || ({} as any));

    return unsub;
  }, [courses.length, user]);
"""

# Insert it before the first useEffect (or after statsSyncTimerRef)
code = code.replace("  const statsSyncTimerRef = useRef<any>(null);", "  const statsSyncTimerRef = useRef<any>(null);\n" + stats_effect)

with open("src/context/LearnTrackContext.tsx", "w") as f:
    f.write(code)
