const fs = require('fs');
let code = fs.readFileSync('src/pages/VideoPlayerPage.tsx', 'utf-8');

const targetStateChange = `  const handlePlayerStateChange = useCallback((state: YouTubePlayerState) => {
    setPlayerStatus(state.status);
    watchedCoverageTracker.setPlaying(state.status === 'PLAYING');
    if (state.status === 'PLAYING') {
      setIsPlaying(true);
      if (playerInstance && playbackSpeed !== 1 && typeof playerInstance.setPlaybackRate === 'function') {
        try {
          playerInstance.setPlaybackRate(playbackSpeed);
        } catch {}
      }
    }
    if (state.status === 'PAUSED' || state.status === 'ENDED') setIsPlaying(false);
  }, [playerInstance, playbackSpeed]);`;

const replacementStateChange = `  const handlePlayerStateChange = useCallback((state: YouTubePlayerState) => {
    setPlayerStatus(state.status);
    
    if (state.status !== 'PLAYING') {
      // Commit final progress segment before switching to paused/ended
      watchedCoverageTracker.update(state.currentTime);
      watchedCoverageTracker.setPlaying(false);
      setIsPlaying(false);
    } else {
      watchedCoverageTracker.setPlaying(true);
      setIsPlaying(true);
      if (playerInstance && playbackSpeed !== 1 && typeof playerInstance.setPlaybackRate === 'function') {
        try {
          playerInstance.setPlaybackRate(playbackSpeed);
        } catch {}
      }
    }
  }, [playerInstance, playbackSpeed]);`;

if (code.includes(targetStateChange)) {
  code = code.replace(targetStateChange, replacementStateChange);
}

fs.writeFileSync('src/pages/VideoPlayerPage.tsx', code);
