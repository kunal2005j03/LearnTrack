import React, { useEffect, useRef, useState, useCallback } from 'react';
import { YouTubePlayerState } from '../types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  initialSeekSeconds?: number;
  onProgress?: (currentTime: number, duration: number, percentage: number) => void;
  onSaveProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onReady?: (player: any) => void;
  onStateChange?: (state: YouTubePlayerState) => void;
  className?: string;
  autoplay?: boolean;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = React.memo(({
  videoId,
  initialSeekSeconds = 0,
  onProgress,
  onSaveProgress,
  onEnded,
  onReady,
  onStateChange,
  className = '',
  autoplay = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerElementId = useRef<string>(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
  const playerRef = useRef<any>(null);
  const pollTimerRef = useRef<any>(null);
  const saveTimerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const hasSeekedInitialRef = useRef<boolean>(false);
  const lastSavedTimeRef = useRef<number>(0);
  const initialSeekRef = useRef<number>(initialSeekSeconds);

  // Keep latest callback references in refs to prevent player recreation
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const onSaveProgressRef = useRef(onSaveProgress);
  onSaveProgressRef.current = onSaveProgress;

  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const autoplayRef = useRef(autoplay);
  autoplayRef.current = autoplay;

  const currentStatusRef = useRef<YouTubePlayerState['status']>('NOT_READY');

  const [playerState, setPlayerState] = useState<YouTubePlayerState>({
    status: 'NOT_READY',
    currentTime: 0,
    duration: 0,
    percentage: 0,
    errorCode: null,
    errorMessage: null,
  });

  const videoIdRef = useRef<string>(videoId);
  initialSeekRef.current = initialSeekSeconds;

  // React to videoId changes by loading the new video into the existing player instance
  useEffect(() => {
    videoIdRef.current = videoId;
    // Clear any previous error and reset status for the incoming video
    setPlayerState((prev) => ({
      ...prev,
      status: 'UNSTARTED',
      errorCode: null,
      errorMessage: null,
    }));

    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      try {
        hasSeekedInitialRef.current = false;
        const seek = initialSeekRef.current || 0;
        // Support both object and positional params across all YouTube API versions
        try {
          playerRef.current.loadVideoById({
            videoId: videoId,
            startSeconds: seek,
          });
        } catch {
          playerRef.current.loadVideoById(videoId, seek);
        }
      } catch (e) {
        console.warn('Error loading new video ID:', e);
      }
    }
  }, [videoId]);

  // Helper to get status string from YT.PlayerState
  const mapPlayerState = (stateCode: number): YouTubePlayerState['status'] => {
    if (!window.YT || !window.YT.PlayerState) return 'NOT_READY';
    switch (stateCode) {
      case window.YT.PlayerState.UNSTARTED:
        return 'UNSTARTED';
      case window.YT.PlayerState.ENDED:
        return 'ENDED';
      case window.YT.PlayerState.PLAYING:
        return 'PLAYING';
      case window.YT.PlayerState.PAUSED:
        return 'PAUSED';
      case window.YT.PlayerState.BUFFERING:
        return 'BUFFERING';
      case window.YT.PlayerState.CUED:
        return 'CUED';
      default:
        return 'UNSTARTED';
    }
  };

  // Helper to map error code
  const mapErrorMessage = (code: number): string => {
    switch (code) {
      case 2:
        return 'Invalid video parameter or ID format.';
      case 5:
        return 'HTML5 player configuration error (Error 5).';
      case 100:
        return 'The video requested was not found or is private/deleted.';
      case 101:
      case 150:
      case 153:
        return 'Embedding restriction error (Error 150/153). Video owner does not allow embedded playback.';
      default:
        return `YouTube Player error (code ${code}).`;
    }
  };

  // Immediate save helper
  const performSave = useCallback(() => {
    if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
    try {
      const cur = playerRef.current.getCurrentTime() || 0;
      const dur = playerRef.current.getDuration() || 0;
      if (dur > 0 && Math.abs(cur - lastSavedTimeRef.current) >= 0.5) {
        lastSavedTimeRef.current = cur;
        if (onSaveProgressRef.current) {
          onSaveProgressRef.current(cur, dur);
        }
      }
    } catch (e) {
      console.warn('Error reading player time on save:', e);
    }
  }, []);

  // Handle continuous poll of current time and duration
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(() => {
      if (!isMountedRef.current || !playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') {
        return;
      }
      try {
        const cur = playerRef.current.getCurrentTime() || 0;
        const dur = playerRef.current.getDuration() || 0;
        const pct = dur > 0 ? Math.min(100, Math.round((cur / dur) * 1000) / 10) : 0;

        setPlayerState((prev) => {
          // Avoid unnecessary re-renders if values haven't meaningfully changed
          if (Math.abs(prev.currentTime - cur) < 0.15 && prev.duration === dur && prev.status === 'PLAYING') {
            return prev;
          }
          return {
            ...prev,
            currentTime: cur,
            duration: dur,
            percentage: pct,
          };
        });

        if (onProgressRef.current) {
          onProgressRef.current(cur, dur, pct);
        }
      } catch (e) {
        // Player might be switching or unmounting
      }
    }, 250); // 250ms polling (4 times/second) for optimal balance of responsiveness and low mobile CPU load

    // Periodic 5-second database save timer while playing
    if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    saveTimerRef.current = setInterval(() => {
      performSave();
    }, 5000);
  }, [performSave]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (saveTimerRef.current) {
      clearInterval(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const createPlayerInstance = useCallback(() => {
    if (!isMountedRef.current || !containerRef.current) return;

    // Clean up previous instance if any
    if (playerRef.current && typeof playerRef.current.destroy === 'function') {
      try {
        playerRef.current.destroy();
      } catch {}
    }

    // Ensure inner mounting target element exists (in case destroy() removed the iframe from container)
    let targetEl = document.getElementById(playerElementId.current);
    if (!targetEl) {
      targetEl = document.createElement('div');
      targetEl.id = playerElementId.current;
      targetEl.className = 'w-full h-full';
      containerRef.current.appendChild(targetEl);
    }

    // Origin must be the actual runtime window location origin (never hardcoded)
    const runtimeOrigin = window.location.origin;

    try {
      playerRef.current = new window.YT.Player(playerElementId.current, {
        videoId: videoIdRef.current,
        host: 'https://www.youtube.com',
        playerVars: {
          autoplay: autoplayRef.current ? 1 : 0,
          controls: 1, // Enable native YouTube controls so native Quality & Captions/CC are accessible
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          fs: 0, // Keep fs: 0 to prioritize LearnTrack's enhanced fullscreen modal/stage
          iv_load_policy: 3,
          origin: runtimeOrigin,
          widget_referrer: runtimeOrigin,
        },
        events: {
          onReady: (event: any) => {
            if (!isMountedRef.current) return;
            const player = event.target;

            try {
              const iframe = player.getIframe?.();
              if (iframe) {
                iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
                iframe.setAttribute('allowfullscreen', '1');
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.position = 'absolute';
                iframe.style.inset = '0';
                iframe.style.border = 'none';
              }
            } catch {}

            const dur = player.getDuration() || 0;
            const cur = player.getCurrentTime() || 0;

            // Initial seek if saved progress exists and is within duration
            const seekSec = initialSeekRef.current;
            if (
              seekSec > 0 &&
              !hasSeekedInitialRef.current &&
              (dur === 0 || seekSec < dur - 2)
            ) {
              try {
                player.seekTo(seekSec, true);
                hasSeekedInitialRef.current = true;
              } catch (e) {
                console.warn('Initial seek failed:', e);
              }
            }

            const initialPct = dur > 0 ? Math.min(100, Math.round((cur / dur) * 1000) / 10) : 0;
            const readyState: YouTubePlayerState = {
              status: 'UNSTARTED',
              currentTime: cur,
              duration: dur,
              percentage: initialPct,
              errorCode: null,
              errorMessage: null,
            };

            currentStatusRef.current = 'UNSTARTED';
            setPlayerState(readyState);
            (window as any).__LEARNTRACK_YT_PLAYER__ = player;
            if (onReadyRef.current) onReadyRef.current(player);
            if (onStateChangeRef.current) onStateChangeRef.current(readyState);
          },
          onStateChange: (event: any) => {
            if (!isMountedRef.current) return;
            const mappedStatus = mapPlayerState(event.data);
            const cur = event.target.getCurrentTime() || 0;
            const dur = event.target.getDuration() || 0;
            const pct = dur > 0 ? Math.min(100, Math.round((cur / dur) * 1000) / 10) : 0;

            const newState: YouTubePlayerState = {
              status: mappedStatus,
              currentTime: cur,
              duration: dur,
              percentage: pct,
              errorCode: null,
              errorMessage: null,
            };

            currentStatusRef.current = mappedStatus;
            setPlayerState(newState);
            if (onStateChangeRef.current) onStateChangeRef.current(newState);

            if (mappedStatus === 'PLAYING') {
              startPolling();
            } else {
              stopPolling();
              performSave();
            }

            if (mappedStatus === 'ENDED') {
              if (onEndedRef.current) onEndedRef.current();
            }
          },
          onError: (event: any) => {
            if (!isMountedRef.current) return;
            const code = event.data;
            const msg = mapErrorMessage(code);
            console.error('YouTube Player Error:', code, msg);

            const errorState: YouTubePlayerState = {
              status: 'ERROR',
              currentTime: 0,
              duration: 0,
              percentage: 0,
              errorCode: code,
              errorMessage: msg,
            };

            currentStatusRef.current = 'ERROR';
            setPlayerState(errorState);
            if (onStateChangeRef.current) onStateChangeRef.current(errorState);
          },
        },
      });
    } catch (err: any) {
      console.error('Failed to construct YT.Player:', err);
      setPlayerState((prev) => ({
        ...prev,
        status: 'ERROR',
        errorMessage: err?.message || 'Player initialization error',
      }));
    }
  }, [performSave, startPolling, stopPolling]);

  // Initialize YouTube IFrame Player API - ONLY runs once on component mount
  useEffect(() => {
    isMountedRef.current = true;
    hasSeekedInitialRef.current = false;
    initialSeekRef.current = initialSeekSeconds;

    const loadAPIAndCreatePlayer = () => {
      // Ensure API script is added
      if (!window.YT || !window.YT.Player) {
        if (!document.getElementById('youtube-iframe-api-script')) {
          const tag = document.createElement('script');
          tag.id = 'youtube-iframe-api-script';
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
        }

        // Set or chain callback
        const prevCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prevCallback) prevCallback();
          if (isMountedRef.current) {
            createPlayerInstance();
          }
        };
      } else {
        createPlayerInstance();
      }
    };

    loadAPIAndCreatePlayer();

    const handleExternalControl = (e: any) => {
      if (!playerRef.current) return;
      const { action, seconds, delta } = e.detail || {};
      try {
        if (action === 'seek' && typeof seconds === 'number') {
          playerRef.current.seekTo(seconds, true);
        } else if (action === 'pause') {
          if (typeof playerRef.current.pauseVideo === 'function') {
            playerRef.current.pauseVideo();
          }
        } else if (action === 'play') {
          if (typeof playerRef.current.playVideo === 'function') {
            playerRef.current.playVideo();
          }
        } else if (action === 'jump' && typeof delta === 'number') {
          const cur = playerRef.current.getCurrentTime() || 0;
          playerRef.current.seekTo(Math.max(0, cur + delta), true);
        }
      } catch (err) {
        console.warn('Error handling external player control:', err);
      }
    };

    window.addEventListener('learntrack_control_player', handleExternalControl);

    return () => {
      window.removeEventListener('learntrack_control_player', handleExternalControl);
      isMountedRef.current = false;
      stopPolling();
      performSave();
      if ((window as any).__LEARNTRACK_YT_PLAYER__ === playerRef.current) {
        delete (window as any).__LEARNTRACK_YT_PLAYER__;
      }
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, [performSave, startPolling, stopPolling, createPlayerInstance]);

  return (
    <div className={`relative w-full ${className.includes('h-full') ? 'h-full' : 'aspect-video'} bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:border-0 [&_iframe]:z-10 ${className}`}>
      {/* Target Container for YT Iframe */}
      <div
        id={playerElementId.current}
        ref={containerRef}
        className="w-full h-full"
      />

      {/* Error Overlay with clear diagnostic instruction if embedding error occurs */}
      {playerState.status === 'ERROR' && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">YouTube Playback Error</h3>
          <p className="text-sm text-zinc-400 max-w-md mb-4">
            {playerState.errorMessage || 'Unable to play this video.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPlayerState((prev) => ({
                  ...prev,
                  status: 'BUFFERING',
                  errorCode: null,
                  errorMessage: null,
                }));
                if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
                  const seek = initialSeekRef.current || 0;
                  try {
                    playerRef.current.loadVideoById({ videoId, startSeconds: seek });
                  } catch {
                    playerRef.current.loadVideoById(videoId, seek);
                  }
                } else {
                  createPlayerInstance();
                }
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-medium transition"
            >
              Retry Playback
            </button>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-xs font-medium transition"
            >
              Watch on YouTube
            </a>
          </div>
        </div>
      )}
    </div>
  );
});
