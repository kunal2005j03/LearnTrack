import React, { useState, useRef, useEffect } from 'react';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { formatSeconds } from '../utils/formatters';
import { YouTubePlayerState } from '../types';
import { Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useLearnTrack } from '../context/LearnTrackContext';

export const YouTubeTestPage: React.FC = () => {
  const { setCurrentView } = useLearnTrack();

  const [testVideoId, setTestVideoId] = useState<string>('dQw4w9WgXcQ');
  const [customInput, setCustomInput] = useState<string>('dQw4w9WgXcQ');

  const playerInstanceRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [liveState, setLiveState] = useState<YouTubePlayerState>({
    status: 'NOT_READY',
    currentTime: 0,
    duration: 0,
    percentage: 0,
    errorCode: null,
    errorMessage: null,
  });

  const [hasPlayedOverZero, setHasPlayedOverZero] = useState<boolean>(false);
  const [hasValidDuration, setHasValidDuration] = useState<boolean>(false);

  useEffect(() => {
    if (liveState.currentTime > 0) {
      setHasPlayedOverZero(true);
    }
    if (liveState.duration > 0) {
      setHasValidDuration(true);
    }
  }, [liveState.currentTime, liveState.duration]);

  const handlePlay = () => {
    try {
      playerInstanceRef.current?.playVideo();
    } catch (e) {
      console.warn(e);
    }
  };

  const handlePause = () => {
    try {
      playerInstanceRef.current?.pauseVideo();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSeek = (seconds: number) => {
    try {
      playerInstanceRef.current?.seekTo(seconds, true);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleToggleMute = () => {
    try {
      if (playerInstanceRef.current) {
        if (isMuted) {
          playerInstanceRef.current.unMute();
          setIsMuted(false);
        } else {
          playerInstanceRef.current.mute();
          setIsMuted(true);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleLoadCustomVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInput.trim();
    if (!clean) return;

    let vidId = clean;
    if (clean.includes('youtube.com') || clean.includes('youtu.be')) {
      const match = clean.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
      if (match) vidId = match[1];
    }

    setTestVideoId(vidId);
    setHasPlayedOverZero(false);
    setHasValidDuration(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <button
        onClick={() => setCurrentView('dashboard')}
        className="inline-flex items-center gap-2 text-xs font-medium text-[var(--ink-dim)] hover:text-[var(--ink)] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
            YouTube Player Diagnostic
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-dim)] mt-1">
            Independent diagnostic verification for YouTube IFrame playback on origin: <code className="font-mono text-xs">{typeof window !== 'undefined' ? window.location.origin : ''}</code>
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${
            hasPlayedOverZero && hasValidDuration && !liveState.errorCode
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/15'
          }`}>
            {hasPlayedOverZero && hasValidDuration && !liveState.errorCode ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Player Verified & Operational
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent)]" />
                Awaiting Playback Verification
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Player on left, Telemetry on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Player Section */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[var(--surface-low)] p-3 border border-[var(--border)] rounded-[24px] shadow-sm overflow-hidden">
            <YouTubePlayer
              key={testVideoId}
              videoId={testVideoId}
              onReady={(p) => {
                playerInstanceRef.current = p;
              }}
              onStateChange={(state) => {
                setLiveState(state);
              }}
              autoplay={false}
            />
          </div>

          {/* Interactive Test Control Deck */}
          <div className="bg-[var(--surface-low)] p-5 border border-[var(--border)] rounded-[24px] space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--ink-dim)] block">
              Player API Controls
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePlay}
                className="px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--bg)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" /> Play
              </button>
              <button
                onClick={handlePause}
                className="px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <Pause className="w-3 h-3" /> Pause
              </button>
              <button
                onClick={() => handleSeek(30)}
                className="px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[var(--ink)] text-xs font-medium transition cursor-pointer"
              >
                Seek 30s
              </button>
              <button
                onClick={() => handleSeek(60)}
                className="px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[var(--ink)] text-xs font-medium transition cursor-pointer"
              >
                Seek 60s
              </button>
              <button
                onClick={() => handleSeek(0)}
                className="px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Restart
              </button>
              <button
                onClick={handleToggleMute}
                className="px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>

            {/* Custom Video ID tester */}
            <form onSubmit={handleLoadCustomVideo} className="pt-2 flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter custom YouTube Video ID or URL"
                className="flex-1 px-4 py-2 text-xs font-mono bg-[var(--surface-high)] border border-[var(--border)] rounded-full text-[var(--ink)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[var(--ink)] text-xs font-medium transition cursor-pointer"
              >
                Load Video
              </button>
            </form>
          </div>
        </div>

        {/* Real-time Telemetry Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--surface-low)] p-6 border border-[var(--border)] rounded-[24px] shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-[var(--ink)] pb-2 border-b border-[var(--border)]">
              Live Player Telemetry
            </h2>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-high)]">
                <span className="text-[var(--ink-dim)] font-sans uppercase font-bold text-[10px] tracking-wider">Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  liveState.status === 'PLAYING'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : liveState.status === 'PAUSED'
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                    : liveState.status === 'ERROR'
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-[var(--ink-faint)]'
                }`}>
                  {liveState.status}
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-high)]">
                <span className="text-[var(--ink-dim)] font-sans uppercase font-bold text-[10px] tracking-wider">Current Time:</span>
                <span className="font-semibold text-[var(--ink)]">
                  {formatSeconds(liveState.currentTime)} ({liveState.currentTime.toFixed(2)}s)
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-high)]">
                <span className="text-[var(--ink-dim)] font-sans uppercase font-bold text-[10px] tracking-wider">Duration:</span>
                <span className="text-[var(--ink)]">
                  {formatSeconds(liveState.duration)} ({liveState.duration.toFixed(2)}s)
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-high)]">
                <span className="text-[var(--ink-dim)] font-sans uppercase font-bold text-[10px] tracking-wider">Percentage:</span>
                <span className="text-[var(--accent)] font-semibold">
                  {liveState.percentage.toFixed(1)}%
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-high)]">
                <span className="text-[var(--ink-dim)] font-sans uppercase font-bold text-[10px] tracking-wider">Player Error:</span>
                <span className={liveState.errorCode ? 'text-red-400 font-bold' : 'text-emerald-400 font-medium'}>
                  {liveState.errorCode ? `Code ${liveState.errorCode}: ${liveState.errorMessage}` : 'None'}
                </span>
              </div>
            </div>

            {/* Live Progress visual bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[10px] text-[var(--ink-faint)] font-mono">
                <span>{formatSeconds(liveState.currentTime)}</span>
                <span>{formatSeconds(liveState.duration)}</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--surface-high)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent)] to-white rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, liveState.percentage)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
