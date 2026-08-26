import re

with open("src/pages/VideoPlayerPage.tsx", "r") as f:
    code = f.read()

# Replace imports
if "import { LiveTimeDisplay }" not in code:
    code = code.replace("import { YouTubePlayer } from '../components/YouTubePlayer';", "import { YouTubePlayer } from '../components/YouTubePlayer';\nimport { LiveTimeDisplay } from '../components/LiveTimeDisplay';\nimport { playerProgressStore } from '../utils/playerProgress';")

# Remove liveCurrentTime and livePercentage from state
code = code.replace("  const [liveCurrentTime, setLiveCurrentTime] = useState<number>(0);", "")
code = code.replace("  const [livePercentage, setLivePercentage] = useState<number>(0);", "")

# Fix handleProgress
code = code.replace("""  const handleProgress = useCallback(
    (cur: number, dur: number, pct: number) => {
      setLiveCurrentTime(cur);
      if (dur > 0) setLiveDuration(dur);
      setLivePercentage(pct);
    },
    []
  );""", """  const handleProgress = useCallback(
    (cur: number, dur: number, pct: number) => {
      playerProgressStore.update(cur, dur, pct);
      if (dur > 0 && Math.abs(dur - liveDuration) > 1) setLiveDuration(dur);
    },
    [liveDuration]
  );""")

# Replace liveCurrentTime with playerProgressStore.currentTime in callbacks/effects where it doesn't need to trigger re-renders
# 1. handlePreviousChapter (line 532)
code = code.replace("if (liveCurrentTime - curCh.startSeconds > 3) {", "if (playerProgressStore.currentTime - curCh.startSeconds > 3) {")
code = code.replace("}, [chapters, currentChapterIndex, liveCurrentTime, handleSeek]);", "}, [chapters, currentChapterIndex, handleSeek]);")

# 2. handleRewind (line 552)
code = code.replace("handleSeek(liveCurrentTime + offsetSec);", "handleSeek(playerProgressStore.currentTime + offsetSec);")
code = code.replace("[handleSeek, liveCurrentTime]", "[handleSeek]")

# 3. handleAskDoubt
code = code.replace("let timestamp = liveCurrentTime;", "let timestamp = playerProgressStore.currentTime;")

# 4. effect starting at 630 (shortcut keys)
code = code.replace("}, [currentVideo, course, liveCurrentTime, playerInstance, currentChapter, doubtContext]);", "}, [currentVideo, course, playerInstance, currentChapter, doubtContext]);")

# 5. saveProgress
code = code.replace("liveCurrentTime", "playerProgressStore.currentTime")

# Wait! The active chapter index calculation NEEDS to run when time updates, but it doesn't need to re-render the whole page.
# Actually, currentChapterIndex state in VideoPlayerPage isn't really needed for rendering the player itself, 
# but it might be used to show the current chapter name. Let's see if it's used in VideoPlayerPage.
# Yes, `currentChapter` is passed to AskDoubt maybe, but we can compute it on the fly or just use a subscribe.

# Let's fix the useEffect for currentChapterIndex.
code = code.replace("""  // Calculate active chapter dynamically based on time
  useEffect(() => {
    if (!chapters || chapters.length === 0) return;
    const i = chapters.findIndex((ch, i) => {
      if (playerProgressStore.currentTime >= ch.startSeconds && (playerProgressStore.currentTime < ch.endSeconds || i === chapters.length - 1)) {
        return true;
      }
      return false;
    });
    if (i !== -1 && i !== currentChapterIndex) {
      setCurrentChapterIndex(i);
    }
  }, [chapters, playerProgressStore.currentTime]);""", """  // Calculate active chapter dynamically based on time
  useEffect(() => {
    if (!chapters || chapters.length === 0) return;
    return playerProgressStore.subscribeThrottled((cur) => {
      const i = chapters.findIndex((ch, idx) => {
        if (cur >= ch.startSeconds && (cur < ch.endSeconds || idx === chapters.length - 1)) {
          return true;
        }
        return false;
      });
      if (i !== -1) {
        setCurrentChapterIndex(prev => prev !== i ? i : prev);
      }
    }, 1000);
  }, [chapters]);""")

# Wait, we replaced liveCurrentTime with playerProgressStore.currentTime everywhere, let's fix the props passing
code = code.replace("currentTime={playerProgressStore.currentTime}", "")
code = code.replace("currentTimeSeconds={playerProgressStore.currentTime}", "")

# Fix the time display
code = code.replace("""                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5 bg-[var(--surface-high)] px-2.5 py-1 rounded-lg border border-[var(--border)] font-mono text-xs">
                  <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>{formatSeconds(playerProgressStore.currentTime)}</span>
                  <span className="text-[var(--ink-faint)]">/</span>
                  <span>{formatSeconds(effectiveDuration)}</span>
                </span>
                <span className="font-bold text-[var(--ink)] bg-[var(--surface-high)] px-2 py-1 rounded-lg border border-[var(--border)] text-xs">
                  {livePercentage.toFixed(1)}%
                </span>""", "<LiveTimeDisplay duration={effectiveDuration} />")
# Wait, livePercentage isn't replaced.
code = code.replace("livePercentage.toFixed(1)", "playerProgressStore.percentage.toFixed(1)")
code = re.sub(r'<span className="font-semibold text-\[var\(--ink\)\].*?</span>\s*<span className="font-bold text-\[var\(--ink\)\].*?%?\s*</span>', '<LiveTimeDisplay duration={effectiveDuration} />', code, flags=re.DOTALL)

with open("src/pages/VideoPlayerPage.tsx", "w") as f:
    f.write(code)

