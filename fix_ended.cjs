const fs = require('fs');
let code = fs.readFileSync('src/pages/VideoPlayerPage.tsx', 'utf-8');

const targetEnded = `  const handlePlayerEnded = useCallback(() => {
    if (activeCourseId && activeVideoId) {
      markVideoComplete(activeCourseId, activeVideoId, true);
    }
  }, [activeCourseId, activeVideoId, markVideoComplete]);`;

const replacementEnded = `  const handlePlayerEnded = useCallback(() => {
    if (activeCourseId && activeVideoId && playerInstance && liveDuration > 0) {
      try {
        const cur = playerInstance.getCurrentTime() || 0;
        watchedCoverageTracker.update(cur);
        watchedCoverageTracker.setPlaying(false);
        handleSaveProgress(cur, liveDuration);
      } catch {}
    }
  }, [activeCourseId, activeVideoId, playerInstance, liveDuration, handleSaveProgress]);`;

if (code.includes(targetEnded)) {
  code = code.replace(targetEnded, replacementEnded);
}

const targetSaveProgress = `  const handleSaveProgress = useCallback(
    (cur: number, dur: number) => {
      if (!activeCourseId || !activeVideoId) return;
      // Inject watched segments into the store right before saving so context can read it
      const existing = progressStore.getSnapshot()[activeVideoId];
      progressStore.update(activeVideoId, {
        ...(existing || {}),
        watchedSegments: watchedCoverageTracker.getSegments()
      } as any);
      saveProgress(activeCourseId, activeVideoId, cur, dur);
    },
    [activeCourseId, activeVideoId, saveProgress]
  );`;

const replacementSaveProgress = `  const handleSaveProgress = useCallback(
    (cur: number, dur: number) => {
      if (!activeCourseId || !activeVideoId) return;
      const existing = progressStore.getSnapshot()[activeVideoId];
      const wasCompleted = existing?.completed;
      
      progressStore.update(activeVideoId, {
        ...(existing || {}),
        watchedSegments: watchedCoverageTracker.getSegments()
      } as any);
      
      saveProgress(activeCourseId, activeVideoId, cur, dur).then(() => {
        const updated = progressStore.getSnapshot()[activeVideoId];
        if (!wasCompleted && updated?.completed && updated?.completionSource === 'auto') {
          setShowAutoCompletionToast(true);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setShowAutoCompletionToast(false), 5000);
        }
      });
    },
    [activeCourseId, activeVideoId, saveProgress]
  );`;

if (code.includes(targetSaveProgress)) {
  code = code.replace(targetSaveProgress, replacementSaveProgress);
}

fs.writeFileSync('src/pages/VideoPlayerPage.tsx', code);
