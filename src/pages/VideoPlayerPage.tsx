import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useProgressMap, useStats, useContinueLearningVideo } from '../hooks/useProgress';
import { useLearnTrack } from '../context/LearnTrackContext';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { LiveTimeDisplay } from '../components/LiveTimeDisplay';
import { playerProgressStore } from '../utils/playerProgress';
import { InThisVideoPanel } from '../components/InThisVideoPanel';
import { FormattedDescription } from '../components/FormattedDescription';
import { formatSeconds, getCourseRemainingTimeStats } from '../utils/formatters';
import { fetchOrResolveChapters, parseYouTubeChapters, getCachedChapters, setCachedChapters } from '../utils/chapterParser';
import { DoubtContext, CourseVideo, YouTubeChapter, YouTubePlayerState } from '../types';

const CourseAiAssistant = React.lazy(() =>
  import('../components/CourseAiAssistant').then((m) => ({ default: m.CourseAiAssistant }))
);
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Bookmark,
  List,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Clock,
  Layers,
  SkipBack,
  SkipForward,
  Sparkles,
  Loader2,
  SlidersHorizontal,
  Maximize,
  Minimize,
  X,
  Bot,
  Brain,
  Terminal,
  HelpCircle,
  FileText,
  Code2,
  AlertCircle,
  Check,
  Gauge } from 'lucide-react';

export const VideoPlayerPage: React.FC = () => {
  const {
    activeCourseId,
    activeVideoId,
    courses,
    getCourseVideos,
    
    saveProgress,
    markVideoComplete,
    toggleVideoBookmark,
    openVideo,
    openCourse } = useLearnTrack();
  const progressMap = useProgressMap();

  const [videos, setVideos] = useState<CourseVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [showPlaylistSidebar, setShowPlaylistSidebar] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [drawerTouchStartY, setDrawerTouchStartY] = useState<number | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'in_this_video' | 'playlist' | 'ai_assistant'>('in_this_video');

  // Lock body scroll when mobile drawer is open to prevent double scroll trapping
  useEffect(() => {
    if (showMobileDrawer) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showMobileDrawer]);
  const [extraVideoDetails, setExtraVideoDetails] = useState<{ description?: string; title?: string } | null>(null);
  
  // Chapter State
  const [chapters, setChapters] = useState<YouTubeChapter[]>([]);
  const [chapterSource, setChapterSource] = useState<'creator' | 'youtube_auto' | 'ai_generated' | 'none'>('none');
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFullscreenOverlayOpen, setIsFullscreenOverlayOpen] = useState<boolean>(false);
  const [fullscreenOverlayTab, setFullscreenOverlayTab] = useState<'in_this_video' | 'playlist' | 'ai_assistant'>('in_this_video');
  const [fullscreenControlsVisible, setFullscreenControlsVisible] = useState<boolean>(true);
  const fullscreenIdleTimerRef = useRef<any>(null);
  const videoStageRef = useRef<HTMLDivElement>(null);

  // Live player telemetry states

  const [liveDuration, setLiveDuration] = useState<number>(0);

  const [playerInstance, setPlayerInstance] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playerStatus, setPlayerStatus] = useState<YouTubePlayerState['status']>('UNSTARTED');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSpeedDropdown, setShowSpeedDropdown] = useState<boolean>(false);
  const [isTitleExpanded, setIsTitleExpanded] = useState<boolean>(false);
  const [doubtContext, setDoubtContext] = useState<DoubtContext | null>(null);
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(orientation: portrait)').matches;
    }
    return false;
  });

  const [isTablet, setIsTablet] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(min-width: 768px) and (max-width: 1279px)').matches;
    }
    return false;
  });

  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(min-width: 1280px)').matches;
    }
    return true;
  });

  // Efficiently track window orientation natively without thrashing React on every resize pixel
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(orientation: portrait)');
    
    const handleOrientationChange = (e: MediaQueryListEvent) => {
      setIsPortrait(e.matches);
    };

    // Initialize with current value
    setIsPortrait(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleOrientationChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleOrientationChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleOrientationChange);
      } else {
        mediaQuery.removeListener(handleOrientationChange);
      }
    };
  }, []);

  // Track desktop breakpoint natively
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Track tablet breakpoint natively
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 768px) and (max-width: 1279px)');
    const handleChange = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    setIsTablet(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Track desktop breakpoint natively
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Clear doubt context whenever active video changes
  useEffect(() => {
    setDoubtContext(null);
  }, [activeVideoId]);

  const course = courses.find((c) => c.id === activeCourseId);

  const fullscreenControlsVisibleRef = useRef(false);
  const lastMouseMoveTimeRef = useRef(0);

  // Mouse move / activity in fullscreen to show controls and auto-hide after 3.5s of inactivity
  const handleFullscreenMouseMove = useCallback(() => {
    if (!isFullscreen) return;
    const now = Date.now();
    if (now - lastMouseMoveTimeRef.current < 40) return; // Light throttle to prevent event storm
    lastMouseMoveTimeRef.current = now;

    fullscreenControlsVisibleRef.current = true;
    setFullscreenControlsVisible(true);

    if (fullscreenIdleTimerRef.current) {
      clearTimeout(fullscreenIdleTimerRef.current);
    }
    fullscreenIdleTimerRef.current = setTimeout(() => {
      fullscreenControlsVisibleRef.current = false;
      setFullscreenControlsVisible(false);
    }, 3500);
  }, [isFullscreen]);

  // Global window listeners to catch mouse and pointer movements during fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const onUserActivity = () => {
      handleFullscreenMouseMove();
    };

    window.addEventListener('mousemove', onUserActivity, { passive: true });
    window.addEventListener('pointermove', onUserActivity, { passive: true });
    window.addEventListener('touchstart', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity, { passive: true });

    // Immediately wake up controls when entering fullscreen
    handleFullscreenMouseMove();

    return () => {
      window.removeEventListener('mousemove', onUserActivity);
      window.removeEventListener('pointermove', onUserActivity);
      window.removeEventListener('touchstart', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      if (fullscreenIdleTimerRef.current) {
        clearTimeout(fullscreenIdleTimerRef.current);
      }
    };
  }, [isFullscreen, handleFullscreenMouseMove]);

  // Fullscreen toggle handler with iframe fallback
  const handleToggleFullscreen = useCallback(() => {
    const stage = videoStageRef.current as any;
    if (!stage) return;

    const isCurrentlyFull =
      !!document.fullscreenElement ||
      !!(document as any).webkitFullscreenElement ||
      !!(document as any).mozFullScreenElement ||
      !!(document as any).msFullscreenElement;

    if (!isCurrentlyFull && !isFullscreen) {
      const requestFn =
        stage.requestFullscreen ||
        stage.webkitRequestFullscreen ||
        stage.mozRequestFullScreen ||
        stage.msRequestFullscreen;

      if (requestFn) {
        try {
          requestFn.call(stage)
            .then(() => {
              setIsFullscreen(true);
              setFullscreenControlsVisible(true);
            })
            .catch(() => {
              // Sandbox iframe fallback: use CSS fixed fullscreen
              setIsFullscreen(true);
              setFullscreenControlsVisible(true);
            });
        } catch {
          setIsFullscreen(true);
          setFullscreenControlsVisible(true);
        }
      } else {
        setIsFullscreen(true);
        setFullscreenControlsVisible(true);
      }
    } else {
      const exitFn =
        document.exitFullscreen ||
        (document as any).webkitExitFullscreen ||
        (document as any).mozCancelFullScreen ||
        (document as any).msExitFullscreen;

      if (exitFn && isCurrentlyFull) {
        try {
          exitFn.call(document)
            .then(() => {
              setIsFullscreen(false);
            })
            .catch(() => {
              setIsFullscreen(false);
            });
        } catch {
          setIsFullscreen(false);
        }
      } else {
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen]);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenEvent = () => {
      const isFull =
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement ||
        !!(document as any).mozFullScreenElement ||
        !!(document as any).msFullscreenElement;

      if (isFull) {
        setIsFullscreen(true);
        setFullscreenControlsVisible(true);
        return;
      }

      setIsFullscreen(false);
    };

    document.addEventListener('fullscreenchange', handleFullscreenEvent);
    document.addEventListener('webkitfullscreenchange', handleFullscreenEvent);
    document.addEventListener('mozfullscreenchange', handleFullscreenEvent);
    document.addEventListener('MSFullscreenChange', handleFullscreenEvent);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenEvent);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenEvent);
      document.removeEventListener('mozfullscreenchange', handleFullscreenEvent);
      document.removeEventListener('MSFullscreenChange', handleFullscreenEvent);
      if (fullscreenIdleTimerRef.current) {
        clearTimeout(fullscreenIdleTimerRef.current);
      }
    };
  }, [chapters.length]);

  // Compute exact estimated remaining time for the playlist
  const playlistRemainingStats = useMemo(() => {
    return getCourseRemainingTimeStats(course, videos, );
  }, [course, videos, ]);

  // Load videos for this course
  useEffect(() => {
    if (activeCourseId) {
      setLoadingVideos(true);
      getCourseVideos(activeCourseId).then((vids) => {
        setVideos(vids);
        setLoadingVideos(false);
      });
    }
  }, [activeCourseId, getCourseVideos]);

  // Current video
  const currentVideo = useMemo(() => {
    return videos.find((v) => v.id === activeVideoId);
  }, [videos, activeVideoId]);

  // Completed video IDs for context memory
  const completedVideoIds = useMemo(() => {
    return videos.filter((v) => progressMap[v.id]?.completed).map((v) => v.id);
  }, [videos, ]);

  // Fetch full video details (description) from backend if needed and not in cache
  useEffect(() => {
    setIsTitleExpanded(false);
    setExtraVideoDetails(null);
    if (!activeVideoId) return;

    // If we already have cached chapters and video description, avoid redundant network calls
    const hasCachedChapters = getCachedChapters(activeVideoId) !== null;
    if (hasCachedChapters && currentVideo?.description) {
      return;
    }

    let isMounted = true;
    fetch('/api/youtube/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: activeVideoId }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (isMounted && data?.description) {
          setExtraVideoDetails({
            description: data.description,
            title: data.title });
        }
      })
      .catch((err) => {
        console.warn('Could not fetch extra video description:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [activeVideoId, currentVideo?.description]);

  // Current video index and previous/next videos
  const currentIndex = useMemo(() => {
    return videos.findIndex((v) => v.id === activeVideoId);
  }, [videos, activeVideoId]);

  const previousVideo = currentIndex > 0 ? videos[currentIndex - 1] : null;
  const nextVideo = currentIndex >= 0 && currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null;

  // Saved progress for current video
  const savedProgress = activeVideoId ? progressMap[activeVideoId] : undefined;
  const isCompleted = savedProgress?.completed ?? false;
  const watchedSec = savedProgress?.watchedSeconds || 0;
  const effectiveDuration = liveDuration || currentVideo?.durationSeconds || 0;
  // If video is marked completed or was watched within 3 seconds of the end, start from beginning (0s) on rewatch
  const initialSeek = (isCompleted || (effectiveDuration > 0 && watchedSec >= effectiveDuration - 3)) ? 0 : watchedSec;

  const activeDescription = extraVideoDetails?.description || currentVideo?.description || '';

  // Resolve chapters (Creator timestamps -> YouTube Auto-Generated -> AI fallback)
  useEffect(() => {
    if (!activeVideoId) {
      setChapters([]);
      setChapterSource('none');
      setLoadingChapters(false);
      return;
    }

    // 1. Check cached chapters first
    const cached = getCachedChapters(activeVideoId);
    if (cached && cached.length > 0) {
      setChapters(cached);
      const isAuto = cached.some((c) => c.isAutoGenerated || c.source === 'youtube_auto' || c.source === 'ai_generated');
      setChapterSource(cached[0]?.source || (isAuto ? 'youtube_auto' : 'creator'));
      setLoadingChapters(false);
      return;
    }

    // 2. Try parsing from description if present
    if (activeDescription) {
      const parsed = parseYouTubeChapters(activeDescription, effectiveDuration);
      if (parsed.length >= 2) {
        setChapters(parsed);
        setChapterSource('creator');
        setCachedChapters(activeVideoId, parsed);
        setLoadingChapters(false);
        return;
      }
    }

    // 3. Fallback to server auto-chapter resolver (YouTube auto-chapters + AI fallback)
    let isMounted = true;
    setLoadingChapters(true);

    fetchOrResolveChapters({
      videoId: activeVideoId,
      description: activeDescription,
      durationSeconds: effectiveDuration,
      title: currentVideo?.title })
      .then((res) => {
        if (isMounted) {
          setChapters(res.chapters);
          setChapterSource(res.source);
          setLoadingChapters(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to resolve chapters:', err);
        if (isMounted) {
          setLoadingChapters(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeVideoId, activeDescription, effectiveDuration, currentVideo?.title]);

  // Current active chapter synchronized with live playback
  const currentChapter = useMemo(() => {
    if (chapters.length === 0) return null;
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (playerProgressStore.currentTime >= ch.startSeconds && (playerProgressStore.currentTime < ch.endSeconds || i === chapters.length - 1)) {
        return ch;
      }
    }
    return chapters[0];
  }, [chapters, playerProgressStore.currentTime]);

  const currentChapterIndex = useMemo(() => {
    if (!currentChapter || chapters.length === 0) return -1;
    return chapters.findIndex((c) => c.startSeconds === currentChapter.startSeconds);
  }, [chapters, currentChapter]);

  // Initialize duration and starting time only when active video changes
  useEffect(() => {
    // Reset player states for the new video
    setIsPlaying(true);
    setPlayerStatus('UNSTARTED');
    
    if (currentVideo?.durationSeconds) {
      setLiveDuration(currentVideo.durationSeconds);
    }
    const initialProg = activeVideoId ? progressMap[activeVideoId] : undefined;
    if (initialProg?.watchedSeconds) {
    } else {
    }
  }, [activeVideoId, currentVideo?.durationSeconds]);

  // Progress update callback from YouTube player (~400ms)
  const handleProgress = useCallback(
    (cur: number, dur: number, pct: number) => {
      playerProgressStore.update(cur, dur, pct);
      if (dur > 0 && Math.abs(dur - liveDuration) > 1) setLiveDuration(dur);
    },
    [liveDuration]
  );

  // Periodic and event-driven database save handler
  const handleSaveProgress = useCallback(
    (cur: number, dur: number) => {
      if (!activeCourseId || !activeVideoId) return;
      saveProgress(activeCourseId, activeVideoId, cur, dur);
    },
    [activeCourseId, activeVideoId, saveProgress]
  );

  const handlePlayerReady = useCallback((player: any) => {
    setPlayerInstance(player);
    if (playbackSpeed !== 1 && typeof player.setPlaybackRate === 'function') {
      try {
        player.setPlaybackRate(playbackSpeed);
      } catch {}
    }
  }, [playbackSpeed]);

  const handlePlayerStateChange = useCallback((state: YouTubePlayerState) => {
    setPlayerStatus(state.status);
    if (state.status === 'PLAYING') {
      setIsPlaying(true);
      if (playerInstance && playbackSpeed !== 1 && typeof playerInstance.setPlaybackRate === 'function') {
        try {
          playerInstance.setPlaybackRate(playbackSpeed);
        } catch {}
      }
    }
    if (state.status === 'PAUSED' || state.status === 'ENDED') setIsPlaying(false);
  }, [playerInstance, playbackSpeed]);

  const handlePlayerEnded = useCallback(() => {
    if (activeCourseId && activeVideoId) {
      markVideoComplete(activeCourseId, activeVideoId, true);
    }
  }, [activeCourseId, activeVideoId, markVideoComplete]);

  // Direct timestamp seeking with YouTube player seekTo
  const handleSeek = useCallback(
    (targetSec: number) => {
      const totalDuration = liveDuration || currentVideo?.durationSeconds || 0;
      const bounded = Math.max(0, Math.min(targetSec, totalDuration > 0 ? totalDuration : targetSec));
      if (totalDuration > 0) {
      }
      if (playerInstance && typeof playerInstance.seekTo === 'function') {
        try {
          playerInstance.seekTo(bounded, true);
          playerInstance.playVideo?.();
          setIsPlaying(true);
        } catch (e) {
          console.warn('Seek error:', e);
        }
      }
    },
    [liveDuration, currentVideo?.durationSeconds, playerInstance]
  );

  // Chapter Jump Handlers
  const handlePrevChapter = useCallback(() => {
    if (chapters.length === 0) return;
    if (currentChapterIndex > 0) {
      // If user is more than 3 seconds into the current chapter, seek to start of current chapter first
      const curCh = chapters[currentChapterIndex];
      if (playerProgressStore.currentTime - curCh.startSeconds > 3) {
        handleSeek(curCh.startSeconds);
      } else {
        handleSeek(chapters[currentChapterIndex - 1].startSeconds);
      }
    } else {
      handleSeek(0);
    }
  }, [chapters, currentChapterIndex, handleSeek]);

  const handleNextChapter = useCallback(() => {
    if (chapters.length === 0) return;
    if (currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1) {
      handleSeek(chapters[currentChapterIndex + 1].startSeconds);
    }
  }, [chapters, currentChapterIndex, handleSeek]);

  // Jump relative +/- seconds
  const handleJumpRelative = useCallback(
    (offsetSec: number) => {
      handleSeek(playerProgressStore.currentTime + offsetSec);
    },
    [handleSeek]
  );

  // Play / Pause toggle synchronized with actual player instance state
  const handleTogglePlay = useCallback(() => {
    if (!playerInstance) return;
    try {
      let isCurrentlyPlaying = isPlaying;
      if (typeof playerInstance.getPlayerState === 'function') {
        const rawState = playerInstance.getPlayerState();
        // 1 = PLAYING, 3 = BUFFERING
        if (rawState === 1 || rawState === 3) {
          isCurrentlyPlaying = true;
        } else if (rawState === 2 || rawState === 0 || rawState === -1 || rawState === 5) {
          isCurrentlyPlaying = false;
        }
      }

      if (isCurrentlyPlaying) {
        playerInstance.pauseVideo();
        setIsPlaying(false);
      } else {
        playerInstance.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('Play toggle error:', e);
    }
  }, [isPlaying, playerInstance]);

  // Fullscreen toggle handler with iframe fallback

  const handleDoubtClick = useCallback(() => {
    if (!currentVideo || !course) return;

    // Check if Doubt is currently active - toggle it OFF and cancel the doubt
    if (doubtContext !== null) {
      setDoubtContext(null);
      setIsFullscreenOverlayOpen(false);
      setShowPlaylistSidebar(false);
      setShowMobileDrawer(false);
      return;
    }
    
    // 1. Immediately read the CURRENT YouTube player timestamp
    let timestamp = playerProgressStore.currentTime;
    if (playerInstance && typeof playerInstance.getCurrentTime === 'function') {
      try {
        timestamp = playerInstance.getCurrentTime();
      } catch {
        timestamp = playerProgressStore.currentTime;
      }
    }

    // 2. Automatically pass the current timestamp as context
    setDoubtContext({
      source: 'doubt-button',
      videoId: currentVideo.id,
      videoTitle: currentVideo.title,
      timestampSeconds: timestamp,
      timestampFormatted: formatSeconds(timestamp),
      chapterTitle: currentChapter?.title,
      courseId: course.id });

    // 3. Open the AI Assistant in Chat mode
    setSidebarTab('ai_assistant');
    setShowPlaylistSidebar(true);
    setFullscreenOverlayTab('ai_assistant');
    setIsFullscreenOverlayOpen(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('learntrack_open_ai_chat'));
      if (window.innerWidth < 1024) {
        setShowMobileDrawer(true);
      }
    }
  }, [currentVideo, course, playerInstance, currentChapter, doubtContext]);

  // Change playback speed
  const handleSetPlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (playerInstance && typeof playerInstance.setPlaybackRate === 'function') {
      try {
        playerInstance.setPlaybackRate(speed);
      } catch (e) {
        console.warn('Speed change error:', e);
      }
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (nextVideo && activeCourseId) {
      if (playerProgressStore.currentTime > 0 && liveDuration > 0) {
        saveProgress(activeCourseId, activeVideoId!, playerProgressStore.currentTime, liveDuration);
      }
      openVideo(activeCourseId, nextVideo.id);
    }
  };

  const handlePrevious = () => {
    if (previousVideo && activeCourseId) {
      if (playerProgressStore.currentTime > 0 && liveDuration > 0) {
        saveProgress(activeCourseId, activeVideoId!, playerProgressStore.currentTime, liveDuration);
      }
      openVideo(activeCourseId, previousVideo.id);
    }
  };

  const handleToggleComplete = () => {
    if (activeCourseId && activeVideoId) {
      markVideoComplete(activeCourseId, activeVideoId, !isCompleted);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input, textarea, or contenteditable element
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // Ignore if it has a modifier key (except for Shift which might be needed for some keys, but standard playback keys usually don't use it)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          handleTogglePlay();
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          if (playerInstance && typeof playerInstance.getCurrentTime === 'function') {
            handleSeek(playerInstance.getCurrentTime() - 10);
          }
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          if (playerInstance && typeof playerInstance.getCurrentTime === 'function') {
            handleSeek(playerInstance.getCurrentTime() + 10);
          }
          break;
        case 'KeyM':
          e.preventDefault();
          if (playerInstance && typeof playerInstance.isMuted === 'function') {
            if (playerInstance.isMuted()) {
              playerInstance.unMute();
            } else {
              playerInstance.mute();
            }
          }
          break;
        case 'KeyF':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            e.preventDefault();
            handleToggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleSeek, playerInstance, handleToggleFullscreen, isFullscreen]);

  if (!course || !activeVideoId) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[var(--ink)]">No video selected</h2>
        <button
          onClick={() => openCourse(activeCourseId || '')}
          className="px-5 py-2.5 bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[var(--ink)] rounded-full text-xs font-medium border border-[var(--border)] cursor-pointer"
        >
          Return to Course
        </button>
      </div>
    );
  }

  const handleClearDoubtContext = useCallback(() => setDoubtContext(null), []);

  const handleCloseFullscreenOverlay = useCallback(() => {
    setIsFullscreenOverlayOpen(false);
    setDoubtContext(null);
  }, []);

  const handleCloseDesktopSidebar = useCallback(() => {
    setShowPlaylistSidebar(false);
    setDoubtContext(null);
  }, []);

  const handleCloseMobileDrawer = useCallback(() => {
    setShowMobileDrawer(false);
    setDoubtContext(null);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header Bar: Back to course button + Quick Access switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <button
          onClick={() => {
            if (activeCourseId && activeVideoId && playerProgressStore.currentTime > 0 && liveDuration > 0) {
              saveProgress(activeCourseId, activeVideoId, playerProgressStore.currentTime, liveDuration);
            }
            openCourse(course.id);
          }}
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--ink-dim)] hover:text-[var(--ink)] transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to <strong className="text-[var(--ink)] font-semibold">{course.title}</strong></span>
        </button>

        {/* Sidebar switcher buttons for desktop & mobile */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {chapters.length > 0 && (
            <button
              id="toggle-in-this-video-btn"
              onClick={() => {
                if (sidebarTab === 'in_this_video' && showPlaylistSidebar) {
                  setShowPlaylistSidebar(false);
                } else {
                  setSidebarTab('in_this_video');
                  setShowPlaylistSidebar(true);
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setShowMobileDrawer(true);
                  }
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                sidebarTab === 'in_this_video' && showPlaylistSidebar
                  ? 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-cyan-500/30'
                  : 'bg-[var(--surface-low)] hover:bg-[var(--surface-high)] text-[var(--ink-dim)] border-[var(--border)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>In this video ({chapters.length})</span>
            </button>
          )}

          <button
            id="toggle-playlist-btn"
            onClick={() => {
              if (sidebarTab === 'playlist' && showPlaylistSidebar) {
                setShowPlaylistSidebar(false);
              } else {
                setSidebarTab('playlist');
                setShowPlaylistSidebar(true);
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setShowMobileDrawer(true);
                }
              }
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border ${
              sidebarTab === 'playlist' && showPlaylistSidebar
                ? 'bg-[var(--ink)] text-[var(--bg)] border-transparent'
                : 'bg-[var(--surface-low)] hover:bg-[var(--surface-high)] text-[var(--ink-dim)] border-[var(--border)]'
            }`}
          >
            <List className="w-3.5 h-3.5 shrink-0" />
            <span>Playlist ({currentIndex + 1}/{videos.length})</span>
          </button>

          <button
            id="toggle-ai-header-btn"
            onClick={() => {
              if (sidebarTab === 'ai_assistant' && showPlaylistSidebar) {
                setShowPlaylistSidebar(false);
                setDoubtContext(null);
              } else {
                setDoubtContext(null);
                setSidebarTab('ai_assistant');
                setShowPlaylistSidebar(true);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('learntrack_open_ai_chat', { detail: { clearDoubt: true } }));
                  if (window.innerWidth < 1024) {
                    setShowMobileDrawer(true);
                  }
                }
              }
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              sidebarTab === 'ai_assistant' && showPlaylistSidebar
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-purple-400 shadow-xs'
                : 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Main Player + Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Video Player & Controls Section */}
        <div className={`space-y-6 transition-all duration-300 ${showPlaylistSidebar ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {/* YouTube Player Container & Fullscreen Stage */}
          <div
            ref={videoStageRef}
            onMouseMove={handleFullscreenMouseMove}
            onPointerMove={handleFullscreenMouseMove}
            onTouchStart={handleFullscreenMouseMove}
            className={`relative flex flex-col w-full overflow-hidden bg-black shadow-2xl transition-all duration-300 ${
              isFullscreen
                ? `fixed inset-0 z-50 w-screen h-screen p-0 rounded-none border-0 select-none ${
                    !fullscreenControlsVisible && !isFullscreenOverlayOpen && !showSpeedDropdown
                      ? 'cursor-none'
                      : 'cursor-default'
                  }`
                : 'aspect-video border border-[var(--border)] rounded-[20px] shadow-lg'
            }`}
          >
            {/* Video Player Main Viewport */}
            <div className={`flex-1 min-h-0 relative w-full h-full flex items-center justify-center overflow-hidden bg-black ${
              isFullscreen && isFullscreenOverlayOpen && !isPortrait && !isDesktop ? 'flex-row p-4 gap-4' : 'flex-col'
            }`}>
              {/* AMBIENT BACKGROUND LAYER (Fullscreen Only - dynamically orientation-aware & GPU-optimized) */}
              {isFullscreen && (
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                  <div 
                    className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                      isPortrait
                        ? 'opacity-70 blur-[30px] saturate-[200%] brightness-110 scale-120'
                        : isDesktop
                          ? 'opacity-80 blur-[80px] saturate-[350%] brightness-120 scale-125'
                          : 'opacity-70 blur-[40px] saturate-[200%] brightness-110 scale-110'
                    } transform-gpu`}
                    style={currentVideo?.thumbnail ? {
                      backgroundImage: `url(${currentVideo.thumbnail})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center' } : { backgroundColor: '#18181b', opacity: 0.5 }}
                  />
                  {/* Subtle darkening overlay so ambient isn't TOO bright */}
                  <div className="absolute inset-0 bg-black/40 sm:bg-black/30" />
                </div>
              )}
              
              {/* 16:9 Constraint Stage for video to allow ambient glow outside with dynamic responsive shifting & scaling */}
              <div 
                className={`relative z-10 flex items-center justify-center transition-all duration-300 ease-out transform-gpu shrink-0 ${
                  isFullscreen
                    ? isPortrait
                      ? isFullscreenOverlayOpen
                        ? 'w-[min(94vw,480px)] aspect-video mt-[calc(0.5rem+env(safe-area-inset-top,0px))] mb-2'
                        : 'w-[94vw] max-w-[500px] aspect-video my-auto shrink-0'
                      : isDesktop
                        ? 'w-[96vw] max-w-[177.78vh] aspect-video max-h-[86vh] my-auto shrink-0'
                        : isFullscreenOverlayOpen
                          ? 'flex-1 min-w-0 max-h-[84vh] aspect-video my-auto'
                          : 'w-[96vw] max-w-[177.78vh] aspect-video max-h-[86vh] my-auto shrink-0'
                    : 'w-full h-full'
                }`}
                style={isFullscreen && !isPortrait && !isDesktop && isFullscreenOverlayOpen ? {
                  maxWidth: fullscreenOverlayTab === 'ai_assistant' 
                     ? 'calc(100vw - min(50vw, calc(100vw - 2rem)) - 2rem)' 
                     : 'calc(100vw - min(380px, calc(100vw - 2rem)) - 2rem)'
                } : undefined}
              >
                {activeVideoId ? (
                  <YouTubePlayer
                    videoId={activeVideoId}
                    initialSeekSeconds={initialSeek}
                    onProgress={handleProgress}
                    onSaveProgress={handleSaveProgress}
                    onReady={handlePlayerReady}
                    onStateChange={handlePlayerStateChange}
                    onEnded={handlePlayerEnded}
                    autoplay={true}
                    className={`w-full h-full !border-none ${
                      isFullscreen ? '!rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]' : '!rounded-none'
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 bg-zinc-900 rounded-2xl">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-purple-500" />
                    <p className="text-sm font-medium">Loading video...</p>
                  </div>
                )}
              </div>



              {/* FULLSCREEN FLOATING OVERLAYS (Chapters, Playlist & AI Assistant) */}
              {isFullscreen && isFullscreenOverlayOpen && (
                <div
                  onMouseEnter={() => {
                    if (fullscreenIdleTimerRef.current) clearTimeout(fullscreenIdleTimerRef.current);
                    fullscreenControlsVisibleRef.current = true;
                    setFullscreenControlsVisible(true);
                  }}
                  onMouseMove={handleFullscreenMouseMove}
                  style={
                    isPortrait
                      ? undefined
                      : {
                          width:
                            fullscreenOverlayTab === 'ai_assistant'
                              ? isDesktop ? 'min(920px, calc(100vw - 2rem))' : 'min(50vw, calc(100vw - 2rem))'
                              : 'min(380px, calc(100vw - 2rem))' }
                  }
                  className={`z-50 pointer-events-auto flex flex-col transition-all duration-300 ease-out shadow-2xl ${
                    isPortrait
                      ? 'relative w-full flex-1 min-h-0 max-w-[520px] mx-auto animate-in slide-in-from-bottom duration-300'
                      : isDesktop
                        ? 'absolute right-4 top-4 bottom-[90px] animate-in slide-in-from-right duration-200'
                        : 'relative h-full shrink-0 animate-in slide-in-from-right duration-200'
                  }`}
                >
                  <div className={`bg-zinc-950/95 ${isDesktop ? 'backdrop-blur-xl' : 'backdrop-blur-md'} border-t border-x sm:border border-white/15 shadow-2xl flex flex-col h-full overflow-hidden transition-all ${
                    isPortrait ? 'rounded-t-2xl sm:rounded-2xl pb-[env(safe-area-inset-bottom,0px)]' : 'rounded-2xl'
                  }`}>
                    {/* Floating Panel Header: Tab Switching Bar */}
                    <div className="p-2.5 border-b border-white/10 flex items-center justify-between gap-1.5 shrink-0 bg-black/40">
                      <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-0.5">
                        {chapters.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFullscreenOverlayTab('in_this_video');
                              setDoubtContext(null);
                            }}
                            className={`px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                              fullscreenOverlayTab === 'in_this_video'
                                ? 'bg-cyan-500 text-zinc-950 font-bold shadow-xs'
                                : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Chapters ({chapters.length})</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setFullscreenOverlayTab('playlist');
                            setDoubtContext(null);
                          }}
                          className={`px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                            fullscreenOverlayTab === 'playlist'
                              ? 'bg-indigo-500 text-white font-bold shadow-xs'
                              : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
                          }`}
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>Playlist ({currentIndex + 1}/{videos.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDoubtContext(null);
                            setFullscreenOverlayTab('ai_assistant');
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new CustomEvent('learntrack_open_ai_chat', { detail: { clearDoubt: true } }));
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                            fullscreenOverlayTab === 'ai_assistant'
                              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold shadow-xs'
                              : 'bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30'
                          }`}
                        >
                          <Bot className="w-3.5 h-3.5 text-purple-300" />
                          <span>AI Assistant</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsFullscreenOverlayOpen(false);
                          setDoubtContext(null);
                        }}
                        className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
                        title="Close overlay"
                        aria-label="Close overlay"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      {/* Chapters / In this video Tab */}
                      <div className={fullscreenOverlayTab === 'in_this_video' ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
                        <InThisVideoPanel
                          chapters={chapters}
                          chapterSource={chapterSource}
                          
                          duration={effectiveDuration}
                          videoId={activeVideoId}
                          videoTitle={currentVideo?.title || extraVideoDetails?.title}
                          isOpen={true}
                          isFloatingOverlay={true}
                          hideHeader={true}
                          onClose={handleCloseFullscreenOverlay}
                          onSeekTo={handleSeek}
                          className="!w-full !border-0 !rounded-none !shadow-none !h-full flex-1 min-h-0 max-h-none !bg-transparent"
                        />
                      </div>

                      {/* Course Playlist Tab */}
                      <div
                        className={fullscreenOverlayTab === 'playlist' ? 'flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2 pb-6' : 'hidden'}
                        style={{ WebkitOverflowScrolling: 'touch' }}
                      >
                        <div className="pb-2.5 border-b border-white/10 flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-xs text-white">Course Playlist</h4>
                            <p className="text-[11px] text-white/60">
                              {course?.completedVideos ?? 0} of {videos.length} completed • {playlistRemainingStats.formattedRemaining} left
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          {videos.map((vid, idx) => {
                            const isCurrent = vid.id === activeVideoId;
                            const p = progressMap[vid.id];
                            const vidComp = p?.completed;

                            return (
                              <button
                                key={`fs-pl-${vid.id}`}
                                type="button"
                                onClick={() => {
                                  if (activeCourseId && playerProgressStore.currentTime > 0 && liveDuration > 0) {
                                    saveProgress(activeCourseId, activeVideoId!, playerProgressStore.currentTime, liveDuration);
                                  }
                                  openVideo(course?.id || activeCourseId!, vid.id);
                                }}
                                className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                                  isCurrent
                                    ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-sm'
                                    : vidComp
                                    ? 'border-white/10 bg-white/5 opacity-75 hover:opacity-100'
                                    : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                                }`}
                              >
                                <div className="shrink-0">
                                  {vidComp ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : isCurrent ? (
                                    <Play className="w-3.5 h-3.5 fill-current text-indigo-400" />
                                  ) : (
                                    <span className="text-xs font-semibold text-white/40">
                                      {(idx + 1).toString().padStart(2, '0')}
                                    </span>
                                  )}
                                </div>

                                <img
                                  src={vid.thumbnail}
                                  alt={vid.title}
                                  className="w-12 h-7 rounded object-cover bg-black border border-white/10 shrink-0"
                                />

                                <div className="min-w-0 flex-1">
                                  <div
                                    className={`text-xs truncate ${
                                      isCurrent ? 'text-white font-semibold' : 'text-white/85 font-medium'
                                    }`}
                                  >
                                    {vid.title}
                                  </div>
                                  <div className="text-[10px] text-white/50 flex items-center gap-1.5 mt-0.5">
                                    <span>{vid.durationFormatted || formatSeconds(vid.durationSeconds)}</span>
                                    {p && p.watchedSeconds > 0 && <span>({p.percentage}%)</span>}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* AI Assistant Tab (Fullscreen Mode) */}
                      <div className={fullscreenOverlayTab === 'ai_assistant' ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
                        {course && currentVideo ? (
                          <React.Suspense
                            fallback={
                              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-zinc-400 gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                                <span>Loading AI Assistant & Vision OCR...</span>
                              </div>
                            }
                          >
                            <CourseAiAssistant
                              course={course}
                              currentVideo={currentVideo}
                              
                              currentChapter={currentChapter}
                              chapters={chapters}
                              completedVideoIds={completedVideoIds}
                              allVideos={videos}
                              isFullscreenMode={true}
                              doubtContext={doubtContext}
                              onClearDoubtContext={handleClearDoubtContext}
                              onClose={handleCloseFullscreenOverlay}
                            />
                          </React.Suspense>
                        ) : (
                          <div className="p-4 text-center text-xs text-zinc-400">Loading course context...</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LearnTrack Custom Control Bar (Floating Transparent Overlay - dynamically orientation-aware) */}
            {isFullscreen && (
              <div 
                className={`absolute bottom-0 left-0 w-full transition-opacity duration-300 ${
                  (!isFullscreenOverlayOpen || isDesktop) && (fullscreenControlsVisible || showSpeedDropdown) 
                    ? 'opacity-100 z-40 pointer-events-none' 
                    : 'opacity-0 -z-10 pointer-events-none'
                }`}
              >
                {/* Thin Subtle Purple Accent Divider Line */}
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/15 to-transparent" />
                
                <div className={`w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 sm:px-6 pt-2 select-none ${
                  isPortrait ? 'pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]' : 'pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))]'
                }`}>
                  {isPortrait ? (
                    /* PORTRAIT FULLSCREEN: 2-ROW BALANCED CONTROL BAR */
                    <div className="w-full max-w-[480px] mx-auto flex flex-col gap-2 pointer-events-auto select-none">
                      {/* ROW 1: [ Chapters ] [ Playlist ] [ Ask AI ] */}
                      <div className={`grid ${chapters.length > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 w-full`}>
                        {chapters.length > 0 && (
                          <button
                            id="fs-portrait-chapters-btn"
                            type="button"
                            onClick={() => {
                              if (isFullscreenOverlayOpen && fullscreenOverlayTab === 'in_this_video') {
                                setIsFullscreenOverlayOpen(false);
                              } else {
                                setFullscreenOverlayTab('in_this_video');
                                setIsFullscreenOverlayOpen(true);
                              }
                            }}
                            className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer backdrop-blur-md border shadow-lg truncate ${
                              isFullscreenOverlayOpen && fullscreenOverlayTab === 'in_this_video'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/80 shadow-cyan-500/10'
                                : 'bg-black/60 hover:bg-zinc-900/80 text-zinc-100 border-white/10 hover:border-white/25'
                            }`}
                            title="Toggle Chapters"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">Chapters</span>
                            <span className="text-[10px] opacity-75 font-mono">({chapters.length})</span>
                          </button>
                        )}

                        <button
                          id="fs-portrait-playlist-btn"
                          type="button"
                          onClick={() => {
                            if (isFullscreenOverlayOpen && fullscreenOverlayTab === 'playlist') {
                              setIsFullscreenOverlayOpen(false);
                            } else {
                              setFullscreenOverlayTab('playlist');
                              setIsFullscreenOverlayOpen(true);
                            }
                          }}
                          className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer backdrop-blur-md border shadow-lg truncate ${
                            isFullscreenOverlayOpen && fullscreenOverlayTab === 'playlist'
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/80 shadow-indigo-500/10'
                              : 'bg-black/60 hover:bg-zinc-900/80 text-zinc-100 border-white/10 hover:border-white/25'
                          }`}
                          title="Toggle Playlist"
                        >
                          <List className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">Playlist</span>
                          <span className="text-[10px] opacity-75 font-mono">({currentIndex + 1}/{videos.length})</span>
                        </button>

                        <button
                          id="fs-portrait-ask-ai-btn"
                          type="button"
                          onClick={() => {
                            if (isFullscreenOverlayOpen && fullscreenOverlayTab === 'ai_assistant') {
                              setIsFullscreenOverlayOpen(false);
                              setDoubtContext(null);
                            } else {
                              setDoubtContext(null);
                              setFullscreenOverlayTab('ai_assistant');
                              setIsFullscreenOverlayOpen(true);
                              if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('learntrack_open_ai_chat', { detail: { clearDoubt: true } }));
                              }
                            }
                          }}
                          className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer backdrop-blur-md border shadow-lg truncate ${
                            isFullscreenOverlayOpen && fullscreenOverlayTab === 'ai_assistant'
                              ? 'bg-purple-600/25 text-purple-200 border-purple-400/80 shadow-purple-500/10'
                              : 'bg-black/60 hover:bg-zinc-900/80 text-zinc-100 border-white/10 hover:border-white/25'
                          }`}
                          title="Toggle AI Assistant"
                        >
                          <Bot className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate">Ask AI</span>
                        </button>
                      </div>

                      {/* ROW 2: [ Doubt ] [ 1x / Speed ] [ Exit Fullscreen ] */}
                      <div className="grid grid-cols-3 gap-2 w-full">
                        {/* 1. Doubt */}
                        <button
                          id="fs-portrait-doubt-btn"
                          type="button"
                          onClick={handleDoubtClick}
                          className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer backdrop-blur-md border shadow-lg truncate ${
                            doubtContext
                              ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-400 shadow-md shadow-purple-500/25'
                              : 'bg-black/60 hover:bg-zinc-900/80 text-zinc-100 border-white/10 hover:border-white/25'
                          }`}
                          title={doubtContext ? 'Cancel doubt and close assistant' : 'Ask a doubt about this moment'}
                        >
                          <HelpCircle className={`w-3.5 h-3.5 shrink-0 ${doubtContext ? 'text-white' : 'text-purple-400'}`} />
                          <span className="truncate">{doubtContext ? 'Cancel' : 'Doubt'}</span>
                        </button>

                        {/* 2. Speed Selector */}
                        <div className="relative w-full">
                          <button
                            id="fs-portrait-speed-btn"
                            type="button"
                            onClick={() => setShowSpeedDropdown((prev) => !prev)}
                            className="w-full min-h-[44px] px-2.5 py-2 rounded-xl bg-black/60 hover:bg-zinc-900/80 text-zinc-100 border border-white/10 hover:border-white/25 text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer backdrop-blur-md shadow-lg"
                            title="Change Playback Speed"
                            aria-expanded={showSpeedDropdown}
                          >
                            <Gauge className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>{playbackSpeed}x</span>
                            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${showSpeedDropdown ? 'rotate-180' : ''}`} />
                          </button>

                          {showSpeedDropdown && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl z-50 min-w-[100px] flex flex-col overflow-hidden">
                              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((spd) => (
                                <button
                                  key={`spd-p-${spd}`}
                                  type="button"
                                  onClick={() => {
                                    handleSetPlaybackSpeed(spd);
                                    setShowSpeedDropdown(false);
                                  }}
                                  className={`px-3 py-2 text-xs text-left transition flex items-center justify-between cursor-pointer active:bg-purple-600/40 ${
                                    playbackSpeed === spd
                                      ? 'bg-purple-600/30 text-purple-300 font-bold'
                                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                                  }`}
                                >
                                  <span>{spd}x</span>
                                  {playbackSpeed === spd && <Check className="w-3 h-3 text-purple-400" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 3. Exit Fullscreen */}
                        <button
                          id="fs-portrait-exit-fullscreen-btn"
                          type="button"
                          onClick={handleToggleFullscreen}
                          className="min-h-[44px] px-2.5 py-2 rounded-xl bg-black/60 hover:bg-zinc-900/80 text-zinc-100 border border-white/10 hover:border-white/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer backdrop-blur-md shadow-lg truncate"
                          title="Exit Fullscreen"
                          aria-label="Exit Fullscreen"
                        >
                          <Minimize className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                          <span className="truncate">Exit</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* LANDSCAPE / DESKTOP FULLSCREEN: SINGLE-ROW BAR */
                    <div
                      style={{ width: 'min(96%, 920px)' }}
                      className="mx-auto flex items-center justify-between gap-4 pointer-events-auto select-none"
                    >
                      {/* Left Controls Group: Chapters, Playlist, Ask AI */}
                      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                        {chapters.length > 0 && (
                          <button
                            id="fs-chapters-btn"
                            type="button"
                            onClick={() => {
                              if (isFullscreenOverlayOpen && fullscreenOverlayTab === 'in_this_video') {
                                setIsFullscreenOverlayOpen(false);
                              } else {
                                setFullscreenOverlayTab('in_this_video');
                                setIsFullscreenOverlayOpen(true);
                              }
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition cursor-pointer backdrop-blur-md border shadow-lg ${
                              isFullscreenOverlayOpen && fullscreenOverlayTab === 'in_this_video'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/80 font-semibold shadow-cyan-500/10'
                                : 'bg-black/60 hover:bg-zinc-900/80 text-zinc-100 hover:text-white border-white/10 hover:border-white/25'
                            }`}
                            title="Toggle Chapters"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Chapters ({chapters.length})</span>
                          </button>
                        )}

                        <button
                          id="fs-playlist-btn"
                          type="button"
                          onClick={() => {
                            if (isFullscreenOverlayOpen && fullscreenOverlayTab === 'playlist') {
                              setIsFullscreenOverlayOpen(false);
                            } else {
                              setFullscreenOverlayTab('playlist');
                              setIsFullscreenOverlayOpen(true);
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition cursor-pointer backdrop-blur-md border shadow-lg ${
                            isFullscreenOverlayOpen && fullscreenOverlayTab === 'playlist'
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/80 font-semibold shadow-indigo-500/10'
                              : 'bg-black/60 hover:bg-zinc-900/80 text-zinc-100 hover:text-white border-white/10 hover:border-white/25'
                          }`}
                          title="Toggle Playlist"
                        >
                          <List className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Playlist ({currentIndex + 1}/{videos.length})</span>
                        </button>

                        <button
                          id="fs-ask-ai-btn"
                          type="button"
                          onClick={() => {
                            if (isFullscreenOverlayOpen && fullscreenOverlayTab === 'ai_assistant') {
                              setIsFullscreenOverlayOpen(false);
                              setDoubtContext(null);
                            } else {
                              setDoubtContext(null);
                              setFullscreenOverlayTab('ai_assistant');
                              setIsFullscreenOverlayOpen(true);
                              if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('learntrack_open_ai_chat', { detail: { clearDoubt: true } }));
                              }
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition cursor-pointer backdrop-blur-md border shadow-lg ${
                            isFullscreenOverlayOpen && fullscreenOverlayTab === 'ai_assistant'
                              ? 'bg-purple-600/25 text-purple-200 border-purple-400/80 font-semibold shadow-purple-500/10'
                              : 'bg-black/60 hover:bg-zinc-900/80 text-zinc-100 hover:text-white border-white/10 hover:border-white/25'
                          }`}
                          title="Toggle AI Assistant"
                        >
                          <Bot className="w-3.5 h-3.5 text-purple-400" />
                          <span>Ask AI</span>
                        </button>
                      </div>

                      {/* Right Controls Group: Doubt, Speed, Exit Fullscreen */}
                      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                        {/* 4. Doubt Button */}
                        <button
                          id="fs-doubt-btn"
                          type="button"
                          onClick={handleDoubtClick}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition cursor-pointer backdrop-blur-md border shadow-lg ${
                            doubtContext
                              ? 'bg-purple-600 hover:bg-purple-700 text-white font-semibold border-purple-400 shadow-md shadow-purple-500/25'
                              : 'bg-black/60 hover:bg-zinc-900/80 text-zinc-100 hover:text-white border-white/10 hover:border-white/25'
                          }`}
                          title={doubtContext ? 'Cancel doubt and close assistant' : 'Ask a doubt about this moment'}
                        >
                          <HelpCircle className={`w-3.5 h-3.5 ${doubtContext ? 'text-white' : 'text-purple-400'}`} />
                          <span>{doubtContext ? 'Cancel Doubt' : 'Doubt'}</span>
                          {doubtContext && (
                            <span className="text-[10px] bg-purple-950 px-1.5 py-0.5 rounded font-mono font-bold text-purple-200 border border-purple-400/40">
                              {doubtContext.timestampFormatted}
                            </span>
                          )}
                        </button>

                        {/* 5. Playback Speed Selector */}
                        <div className="relative">
                          <button
                            id="fs-speed-btn"
                            type="button"
                            onClick={() => setShowSpeedDropdown((prev) => !prev)}
                            className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-zinc-900/80 text-zinc-100 hover:text-white border border-white/10 hover:border-white/25 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg"
                            title="Change Playback Speed"
                            aria-expanded={showSpeedDropdown}
                          >
                            <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{playbackSpeed}x</span>
                            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${showSpeedDropdown ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Dropdown Menu */}
                          {showSpeedDropdown && (
                            <div className="absolute bottom-full right-0 mb-2 py-1 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl z-50 min-w-[90px] flex flex-col overflow-hidden">
                              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((spd) => (
                                <button
                                  key={`spd-${spd}`}
                                  type="button"
                                  onClick={() => {
                                    handleSetPlaybackSpeed(spd);
                                    setShowSpeedDropdown(false);
                                  }}
                                  className={`px-3 py-1.5 text-xs text-left transition flex items-center justify-between cursor-pointer ${
                                    playbackSpeed === spd
                                      ? 'bg-purple-600/30 text-purple-300 font-bold'
                                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                                  }`}
                                >
                                  <span>{spd}x</span>
                                  {playbackSpeed === spd && <Check className="w-3 h-3 text-purple-400" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 6. Exit Fullscreen Button */}
                        <button
                          id="fs-exit-fullscreen-btn"
                          type="button"
                          onClick={handleToggleFullscreen}
                          className="px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-zinc-900/80 text-zinc-100 hover:text-white border border-white/10 hover:border-white/25 text-xs font-medium flex items-center gap-2 transition cursor-pointer backdrop-blur-md shadow-lg"
                          title="Exit Fullscreen (Esc)"
                          aria-label="Exit Fullscreen"
                        >
                          <Minimize className="w-3.5 h-3.5 text-zinc-300" />
                          <span>Exit Fullscreen</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Playback Progress Telemetry & Interactive Scrubber Deck */}
          <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-2xl sm:rounded-[20px] p-4 sm:p-5 shadow-sm space-y-3.5">
            {/* Title & Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--accent)] block">
                    Lesson {(currentIndex + 1).toString().padStart(2, '0')} of {videos.length}
                  </span>
                  {currentChapter && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-cyan-500 dark:text-cyan-400 font-medium truncate">
                      • {currentChapter.title} ({currentChapter.formattedStart})
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-2 pt-0.5">
                  <h1
                    onClick={() => setIsTitleExpanded((prev) => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsTitleExpanded((prev) => !prev);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isTitleExpanded}
                    className={`text-lg sm:text-xl font-bold text-[var(--ink)] leading-snug cursor-pointer transition-all hover:text-[var(--accent)] select-none group flex items-baseline gap-2 ${
                      isTitleExpanded ? 'whitespace-normal break-words' : 'truncate'
                    }`}
                    title={isTitleExpanded ? 'Click title to collapse' : 'Click title to read full name'}
                  >
                    <span className={isTitleExpanded ? 'break-words' : 'truncate'}>
                      {currentVideo?.title || 'YouTube Lesson'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-normal transition-all shrink-0 select-none ${
                        isTitleExpanded
                          ? 'bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/30'
                          : 'bg-[var(--surface-high)] text-[var(--ink-dim)] group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)] border border-[var(--border)]'
                      }`}
                    >
                      <span>{isTitleExpanded ? 'Less' : 'More'}</span>
                      {isTitleExpanded ? (
                        <ChevronUp className="w-3 h-3 transition-transform" />
                      ) : (
                        <ChevronDown className="w-3 h-3 transition-transform" />
                      )}
                    </span>
                  </h1>
                </div>
                {currentChapter && (
                  <button
                    type="button"
                    onClick={() => {
                      if (sidebarTab === 'in_this_video' && (showPlaylistSidebar || showMobileDrawer)) {
                        setShowPlaylistSidebar(false);
                        setShowMobileDrawer(false);
                      } else {
                        setSidebarTab('in_this_video');
                        setShowPlaylistSidebar(true);
                        setShowMobileDrawer(true);
                      }
                    }}
                    className="sm:hidden inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-cyan-400 font-medium pt-0.5 cursor-pointer text-left transition-colors group"
                    title="Click to view all chapters"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                    <span className="truncate">
                      Chapter: <strong>{currentChapter.title}</strong> ({currentChapter.formattedStart})
                    </span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform opacity-70 shrink-0" />
                  </button>
                )}
              </div>

              {/* Action Buttons: Prominent Custom Fullscreen + Chapters + Bookmark */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                {/* Standout Prominent Fullscreen Launcher */}
                <button
                  id="prominent-custom-fullscreen-btn"
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-indigo-600 hover:from-[var(--accent)]/90 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-[var(--accent)]/20 hover:shadow-lg hover:shadow-[var(--accent)]/30 active:scale-95 transition-all cursor-pointer group"
                  title="Launch LearnTrack Super Fullscreen"
                  aria-label="Launch Custom Fullscreen"
                >
                  <Maximize className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                  <span>Enhanced Fullscreen</span>
                </button>

                {chapters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (sidebarTab === 'in_this_video' && (showPlaylistSidebar || showMobileDrawer)) {
                        setShowPlaylistSidebar(false);
                        setShowMobileDrawer(false);
                      } else {
                        setSidebarTab('in_this_video');
                        setShowPlaylistSidebar(true);
                        setShowMobileDrawer(true);
                      }
                    }}
                    className="lg:hidden px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    title="Open Chapters"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                    <span>Chapters ({chapters.length})</span>
                  </button>
                )}

                <button
                  onClick={() => toggleVideoBookmark(course.id, activeVideoId)}
                  className={`p-2 sm:p-2.5 rounded-full border transition shrink-0 cursor-pointer ${
                    currentVideo?.isBookmarked
                      ? 'bg-[var(--accent)] border-transparent text-white'
                      : 'border-[var(--border)] text-[var(--ink-dim)] hover:text-[var(--ink)] bg-[var(--surface-high)]'
                  }`}
                  title={currentVideo?.isBookmarked ? 'Bookmarked' : 'Bookmark lesson'}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${currentVideo?.isBookmarked ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Time / Progress Stats & Doubt Action */}
            <div className="flex items-center justify-between text-xs text-[var(--ink-dim)]">
              <div className="flex items-center gap-2">
<LiveTimeDisplay duration={effectiveDuration} />
              </div>

              {/* Right: Doubt in Normal Mode (Switchable Toggle) */}
              <div className="flex items-center gap-2">
                <button
                  id="normal-doubt-btn"
                  type="button"
                  onClick={handleDoubtClick}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    doubtContext
                      ? 'bg-purple-600 hover:bg-purple-700 text-white font-bold border border-purple-400 shadow-sm shadow-purple-500/25'
                      : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20'
                  }`}
                  title={doubtContext ? 'Cancel doubt and close assistant' : 'Ask a doubt about this moment'}
                  aria-pressed={doubtContext !== null}
                >
                  <HelpCircle className={`w-3.5 h-3.5 ${doubtContext ? 'text-white' : 'text-purple-500 dark:text-purple-400'}`} />
                  <span className="hidden sm:inline">{doubtContext ? 'Cancel Doubt' : 'Doubt'}</span>
                  {doubtContext && (
                    <span className="text-[10px] bg-purple-800/90 px-1.5 py-0.2 rounded font-mono font-bold text-white">
                      {doubtContext.timestampFormatted}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons: [← Previous] [Next →] [✓ Mark as Complete] */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[var(--border)]">
              <div className="flex items-center gap-2">
                {/* Previous Video Button */}
                <button
                  onClick={handlePrevious}
                  disabled={!previousVideo}
                  className="min-h-[44px] px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] active:scale-95 text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer touch-manipulation"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>

                {/* Next Video Button */}
                <button
                  onClick={handleNext}
                  disabled={!nextVideo}
                  className="min-h-[44px] px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] active:scale-95 text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer touch-manipulation"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mark as Complete Button */}
              <button
                onClick={handleToggleComplete}
                className={`min-h-[44px] px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer touch-manipulation ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[var(--ink)] text-[var(--bg)] hover:-translate-y-0.5 shadow-sm'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-400' : ''}`} />
                {isCompleted ? 'Completed' : 'Mark as Complete'}
              </button>
            </div>
          </div>



          {/* Description Section */}
          {activeDescription && (
            <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--ink-dim)] block">
                  Description & Resources
                </span>
                <span className="text-[10px] text-[var(--ink-faint)]">
                  Clickable links & timestamps
                </span>
              </div>
              <FormattedDescription
                description={activeDescription}
                onSeek={handleSeek}
              />
            </div>
          )}
        </div>

        {/* Sidebar Column (Desktop): In this video (Chapters & Transcript) OR Course Playlist OR AI Assistant */}
        {showPlaylistSidebar && (
          <div className="hidden lg:block lg:col-span-4 space-y-4">
            {/* Desktop Sidebar Switcher: Chapters | Playlist | AI Assistant */}
          <div className={`grid ${chapters.length > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-1 p-1 bg-[var(--surface-low)] border border-[var(--border)] rounded-2xl w-full overflow-hidden shadow-2xs`}>
            {chapters.length > 0 && (
              <button
                type="button"
                onClick={() => setSidebarTab('in_this_video')}
                className={`min-w-0 py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer select-none ${
                  sidebarTab === 'in_this_video'
                    ? 'bg-cyan-500 text-zinc-950 shadow-xs'
                    : 'text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)]'
                }`}
                title={`Chapters (${chapters.length})`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Chapters</span>
                <span className="text-[10px] opacity-75 font-mono">({chapters.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidebarTab('playlist')}
              className={`min-w-0 py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer select-none ${
                sidebarTab === 'playlist'
                  ? 'bg-[var(--ink)] text-[var(--bg)] shadow-xs'
                  : 'text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)]'
              }`}
              title={`Playlist (${currentIndex + 1}/${videos.length})`}
            >
              <List className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Playlist</span>
              <span className="text-[10px] opacity-75 font-mono">({currentIndex + 1}/{videos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDoubtContext(null);
                setSidebarTab('ai_assistant');
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('learntrack_open_ai_chat', { detail: { clearDoubt: true } }));
                }
              }}
              className={`min-w-0 py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer select-none ${
                sidebarTab === 'ai_assistant'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-xs'
                  : 'text-purple-600 dark:text-purple-300 hover:bg-purple-500/10'
              }`}
              title="Course AI Assistant"
            >
              <Bot className="w-3.5 h-3.5 shrink-0 text-purple-400" />
              <span className="truncate">AI Assistant</span>
            </button>
          </div>

          <div className={sidebarTab === 'in_this_video' ? 'block' : 'hidden'}>
            <InThisVideoPanel
              chapters={chapters}
              chapterSource={chapterSource}
              
              duration={effectiveDuration}
              videoId={activeVideoId}
              videoTitle={currentVideo?.title || extraVideoDetails?.title}
              isOpen={true}
              onClose={handleCloseDesktopSidebar}
              onSeekTo={handleSeek}
            />
          </div>

          <div className={sidebarTab === 'playlist' ? 'block' : 'hidden'}>
            <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-5 flex flex-col h-[600px] max-h-[85vh]">
              {/* Sidebar Header */}
              <div className="pb-4 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-[var(--ink)]">
                    Course Playlist
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--ink-faint)] mt-0.5">
                    <span>{course.completedVideos} of {videos.length} completed</span>
                    <span>•</span>
                    <span className="text-amber-400 font-medium flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {playlistRemainingStats.formattedRemaining} left
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold text-[var(--ink-dim)]">
                  <span>{currentIndex + 1} / {videos.length}</span>
                  <button
                    onClick={() => {
                      setShowPlaylistSidebar(false);
                      setDoubtContext(null);
                    }}
                    className="p-1.5 rounded-full hover:text-[var(--ink)] hover:bg-[var(--surface-high)] dark:hover:bg-white/15 transition-colors cursor-pointer"
                    title="Close panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Video List */}
              <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
                {videos.map((vid, idx) => {
                  const isCurrent = vid.id === activeVideoId;
                  const p = progressMap[vid.id];
                  const vidComp = p?.completed;

                  return (
                    <button
                      key={vid.id}
                      onClick={() => {
                        if (activeCourseId && playerProgressStore.currentTime > 0 && liveDuration > 0) {
                          saveProgress(activeCourseId, activeVideoId!, playerProgressStore.currentTime, liveDuration);
                        }
                        openVideo(course.id, vid.id);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                        isCurrent
                          ? 'border-[var(--accent)] bg-[var(--surface-high)] text-[var(--ink)] shadow-sm'
                          : vidComp
                          ? 'border-[var(--border)] bg-[var(--surface-low)]/50 opacity-70 hover:opacity-100'
                          : 'border-[var(--border)] bg-[var(--surface-low)] hover:border-[var(--ink-faint)]'
                      }`}
                    >
                      {/* Index or Status icon */}
                      <div className="shrink-0">
                        {vidComp ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isCurrent ? (
                          <Play className="w-3.5 h-3.5 fill-current text-[var(--accent)]" />
                        ) : (
                          <span className="text-xs font-semibold text-[var(--ink-faint)]">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>

                      {/* Mini Thumbnail */}
                      <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        className="w-12 h-7 rounded object-cover bg-black border border-[var(--border)] shrink-0"
                      />

                      {/* Title & Duration */}
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-medium truncate ${
                            isCurrent
                              ? 'text-[var(--ink)] font-semibold'
                              : 'text-[var(--ink-dim)]'
                          }`}
                        >
                          {vid.title}
                        </div>
                        <div className="text-[10px] text-[var(--ink-faint)] flex items-center gap-1.5 mt-0.5">
                          <span>{vid.durationFormatted || formatSeconds(vid.durationSeconds)}</span>
                          {p && p.watchedSeconds > 0 && (
                            <span>({p.percentage}%)</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Desktop AI Assistant Tab */}
          <div className={sidebarTab === 'ai_assistant' ? 'block' : 'hidden'}>
            <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] overflow-hidden flex flex-col shadow-sm transition-all h-[640px] max-h-[85vh]">
              {course && currentVideo ? (
                <React.Suspense
                  fallback={
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--ink-faint)] gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
                      <span>Loading AI Assistant...</span>
                    </div>
                  }
                >
                  <CourseAiAssistant
                    course={course}
                    currentVideo={currentVideo}
                    
                    currentChapter={currentChapter}
                    chapters={chapters}
                    completedVideoIds={completedVideoIds}
                    allVideos={videos}
                    isFullscreenMode={false}
                    doubtContext={doubtContext}
                    onClearDoubtContext={handleClearDoubtContext}
                    onClose={handleCloseDesktopSidebar}
                  />
                </React.Suspense>
              ) : (
                <div className="p-4 text-center text-xs text-[var(--ink-faint)]">Loading course assistant...</div>
              )}
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Mobile & Tablet Bottom Sheet Drawer Modal */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-[60] lg:hidden flex flex-col justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop Click Dismiss */}
          <div
            className="absolute inset-0"
            onClick={() => {
              setShowMobileDrawer(false);
              setDoubtContext(null);
            }}
            aria-hidden="true"
          />

          {/* Bottom Sheet Modal Container */}
          <div className="relative w-full sm:max-w-xl md:max-w-2xl sm:mx-auto max-h-[88vh] sm:max-h-[82vh] bg-[var(--surface-low)] border-t sm:border-x sm:border-t border-[var(--border)] rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden z-10 overscroll-contain animate-in slide-in-from-bottom duration-250">
            {/* Grab Bar Handle with swipe-to-close touch handlers */}
            <div
              className="pt-3 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none"
              onTouchStart={(e) => setDrawerTouchStartY(e.touches[0].clientY)}
              onTouchEnd={(e) => {
                if (drawerTouchStartY !== null) {
                  const diff = e.changedTouches[0].clientY - drawerTouchStartY;
                  if (diff > 50) {
                    setShowMobileDrawer(false);
                    setDoubtContext(null);
                  }
                  setDrawerTouchStartY(null);
                }
              }}
              onClick={() => {
                setShowMobileDrawer(false);
                setDoubtContext(null);
              }}
              title="Swipe down or tap to close"
            >
              <div className="w-12 h-1.5 rounded-full bg-[var(--border)] hover:bg-[var(--ink-faint)] transition-colors" />
            </div>

            {/* Modal Navigation Bar */}
            <div
              className="px-4 py-2.5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-high)]/30 backdrop-blur-sm"
              onTouchStart={(e) => setDrawerTouchStartY(e.touches[0].clientY)}
              onTouchEnd={(e) => {
                if (drawerTouchStartY !== null) {
                  const diff = e.changedTouches[0].clientY - drawerTouchStartY;
                  if (diff > 50) {
                    setShowMobileDrawer(false);
                    setDoubtContext(null);
                  }
                  setDrawerTouchStartY(null);
                }
              }}
            >
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {chapters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarTab('in_this_video');
                      setDoubtContext(null);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      sidebarTab === 'in_this_video'
                        ? 'bg-cyan-500 text-zinc-950 font-black shadow-xs'
                        : 'bg-[var(--surface-high)] text-[var(--ink-dim)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>In this video ({chapters.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSidebarTab('playlist');
                    setDoubtContext(null);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    sidebarTab === 'playlist'
                      ? 'bg-[var(--ink)] text-[var(--bg)] font-black shadow-xs'
                      : 'bg-[var(--surface-high)] text-[var(--ink-dim)] hover:text-[var(--ink)]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Playlist ({currentIndex + 1}/{videos.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDoubtContext(null);
                    setSidebarTab('ai_assistant');
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('learntrack_open_ai_chat', { detail: { clearDoubt: true } }));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    sidebarTab === 'ai_assistant'
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black shadow-xs'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Assistant</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMobileDrawer(false);
                  setDoubtContext(null);
                }}
                className="p-1.5 rounded-full text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)] transition cursor-pointer shrink-0"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className={sidebarTab === 'in_this_video' ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
                <InThisVideoPanel
                  chapters={chapters}
                  chapterSource={chapterSource}
                  
                  duration={effectiveDuration}
                  videoId={activeVideoId}
                  videoTitle={currentVideo?.title || extraVideoDetails?.title}
                  isOpen={true}
                  onClose={handleCloseMobileDrawer}
                  onSeekTo={handleSeek}
                  hideHeader={true}
                  className="!w-full !border-0 !rounded-none !shadow-none !h-full flex-1 min-h-0 max-h-none"
                />
              </div>

              <div className={sidebarTab === 'playlist' ? 'flex-1 min-h-0 overflow-y-auto p-4 space-y-2 pb-24' : 'hidden'} style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="pb-3 border-b border-[var(--border)] flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-[var(--ink)]">Course Playlist</h4>
                    <p className="text-xs text-[var(--ink-faint)]">
                      {course.completedVideos} of {videos.length} lessons completed • {playlistRemainingStats.formattedRemaining} left
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {videos.map((vid, idx) => {
                    const isCurrent = vid.id === activeVideoId;
                    const p = progressMap[vid.id];
                    const vidComp = p?.completed;

                    return (
                      <button
                        key={`mob-pl-${vid.id}`}
                        onClick={() => {
                          if (activeCourseId && playerProgressStore.currentTime > 0 && liveDuration > 0) {
                            saveProgress(activeCourseId, activeVideoId!, playerProgressStore.currentTime, liveDuration);
                          }
                          openVideo(course.id, vid.id);
                          setShowMobileDrawer(false);
                          setDoubtContext(null);
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                          isCurrent
                            ? 'border-[var(--accent)] bg-[var(--surface-high)] text-[var(--ink)] shadow-sm'
                            : vidComp
                            ? 'border-[var(--border)] bg-[var(--surface-low)]/50 opacity-70 hover:opacity-100'
                            : 'border-[var(--border)] bg-[var(--surface-low)] hover:border-[var(--ink-faint)]'
                        }`}
                      >
                        <div className="shrink-0">
                          {vidComp ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isCurrent ? (
                            <Play className="w-3.5 h-3.5 fill-current text-[var(--accent)]" />
                          ) : (
                            <span className="text-xs font-semibold text-[var(--ink-faint)]">
                              {(idx + 1).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>

                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-14 h-8 rounded object-cover bg-black border border-[var(--border)] shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs font-medium truncate ${
                              isCurrent ? 'text-[var(--ink)] font-semibold' : 'text-[var(--ink-dim)]'
                            }`}
                          >
                            {vid.title}
                          </div>
                          <div className="text-[10px] text-[var(--ink-faint)] flex items-center gap-1.5 mt-0.5">
                            <span>{vid.durationFormatted || formatSeconds(vid.durationSeconds)}</span>
                            {p && p.watchedSeconds > 0 && <span>({p.percentage}%)</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile AI Assistant Tab */}
              <div className={sidebarTab === 'ai_assistant' ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
                {course && currentVideo ? (
                  <React.Suspense
                    fallback={
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--ink-faint)] gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
                        <span>Loading AI Assistant...</span>
                      </div>
                    }
                  >
                    <CourseAiAssistant
                      course={course}
                      currentVideo={currentVideo}
                      
                      currentChapter={currentChapter}
                      chapters={chapters}
                      completedVideoIds={completedVideoIds}
                      allVideos={videos}
                      isFullscreenMode={false}
                      doubtContext={doubtContext}
                      onClearDoubtContext={handleClearDoubtContext}
                      onClose={handleCloseMobileDrawer}
                    />
                  </React.Suspense>
                ) : (
                  <div className="p-4 text-center text-xs text-[var(--ink-faint)]">Loading course assistant...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

