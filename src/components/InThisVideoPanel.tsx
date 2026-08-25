import React, { useState, useMemo, useEffect, useRef } from 'react';
import { YouTubeChapter } from '../types';
import {
  X,
  MoreVertical,
  Play,
  Volume2,
  Copy,
  Check,
  Search,
  Sparkles,
  Info,
  Layers,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';

export interface InThisVideoPanelProps {
  chapters: YouTubeChapter[];
  chapterSource: 'creator' | 'youtube_auto' | 'ai_generated' | 'none';
  currentTime: number;
  duration: number;
  videoId: string;
  videoTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSeekTo: (seconds: number) => void;
  isFloatingOverlay?: boolean;
  className?: string;
  hideHeader?: boolean;
}

export interface TranscriptLine {
  startSeconds: number;
  formattedStart: string;
  text: string;
}

export const InThisVideoPanel: React.FC<InThisVideoPanelProps> = React.memo(({
  chapters,
  chapterSource,
  currentTime,
  duration,
  videoId,
  videoTitle,
  isOpen,
  onClose,
  onSeekTo,
  isFloatingOverlay = false,
  className = '',
  hideHeader = false,
}) => {
  const [activeTab, setActiveTab] = useState<'chapters' | 'transcript'>('chapters');
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  const activeChapterRef = useRef<HTMLButtonElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isHoveredRef = useRef(false);
  const lastScrolledChapterRef = useRef<number | null>(null);

  // Current active chapter based on currentTime
  const activeChapter = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;
    return (
      chapters.find((ch) => currentTime >= ch.startSeconds && currentTime < ch.endSeconds) ||
      (currentTime >= chapters[chapters.length - 1]?.startSeconds ? chapters[chapters.length - 1] : chapters[0])
    );
  }, [chapters, currentTime]);

  // Auto-scroll active chapter into view ONLY when chapter changes, non-blocking via requestAnimationFrame
  useEffect(() => {
    const currentStart = activeChapter?.startSeconds ?? null;
    if (
      activeTab === 'chapters' &&
      currentStart !== null &&
      currentStart !== lastScrolledChapterRef.current &&
      activeChapterRef.current &&
      !isHoveredRef.current
    ) {
      lastScrolledChapterRef.current = currentStart;
      requestAnimationFrame(() => {
        try {
          activeChapterRef.current?.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
          });
        } catch {}
      });
    }
  }, [activeChapter?.startSeconds, activeTab]);

  // Close menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showMenu]);

  // Generate or fetch transcript lines when transcript tab is opened
  useEffect(() => {
    if (activeTab !== 'transcript' || !videoId) return;

    if (transcripts.length > 0) return;

    let isMounted = true;
    setLoadingTranscript(true);

    fetch('/api/youtube/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        title: videoTitle,
        chapters,
        durationSeconds: duration,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (Array.isArray(data.transcript) && data.transcript.length > 0) {
            setTranscripts(data.transcript);
          } else {
            // Heuristic transcript based on chapters if no detailed transcript
            const fallback = chapters.map((ch) => ({
              startSeconds: ch.startSeconds,
              formattedStart: ch.formattedStart,
              text: `Discussion and key insights on: ${ch.title}. Master core concepts and applied problem solving.`,
            }));
            setTranscripts(fallback);
          }
          setLoadingTranscript(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          const fallback = chapters.map((ch) => ({
            startSeconds: ch.startSeconds,
            formattedStart: ch.formattedStart,
            text: `Section topic: ${ch.title}`,
          }));
          setTranscripts(fallback);
          setLoadingTranscript(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, videoId, videoTitle, chapters, duration, transcripts.length]);

  // Copy all timestamps to clipboard
  const handleCopyTimestamps = () => {
    if (!chapters || chapters.length === 0) return;
    const text = chapters.map((ch) => `${ch.formattedStart} ${ch.title}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowMenu(false);
    }, 2000);
  };

  // Filtered transcript search
  const filteredTranscript = useMemo(() => {
    if (!transcriptSearch.trim()) return transcripts;
    const q = transcriptSearch.toLowerCase();
    return transcripts.filter(
      (t) => t.text.toLowerCase().includes(q) || t.formattedStart.toLowerCase().includes(q)
    );
  }, [transcripts, transcriptSearch]);

  if (!isOpen) return null;

  const isAuto =
    chapterSource === 'youtube_auto' ||
    (chapters.length > 0 && chapters[0]?.isAutoGenerated && chapterSource !== 'creator');

  return (
    <aside
      id="in-this-video-panel"
      className={`shrink-0 flex flex-col min-h-0 overflow-hidden transition-all duration-300 ${
        isFloatingOverlay
          ? 'w-[calc(100vw-2rem)] sm:w-96 max-w-[420px] bg-[#18181b]/95 text-white backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl z-50 h-[min(680px,calc(100vh-5rem))]'
          : 'w-full lg:w-96 bg-[var(--surface-low)] dark:bg-[#18181b] border border-[var(--border)] rounded-2xl shadow-xl h-[620px] max-h-[85vh]'
      } ${className}`}
      aria-label="In this video chapters and transcript"
    >
      {/* 1. Header with Close Button (Hidden if parent provides header) */}
      {!hideHeader && (
        <div className="p-4 pb-3 border-b border-[var(--border)]/70 dark:border-white/10 flex items-center justify-between bg-[var(--surface-high)]/40 dark:bg-black/30 backdrop-blur-sm">
          <h2 className="text-base font-bold text-[var(--ink)] tracking-tight flex items-center gap-2">
            <span>In this video</span>
          </h2>
          <button
            id="close-in-this-video-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)] dark:hover:bg-white/15 transition-colors cursor-pointer"
            title="Close panel"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 2. Segmented Pill Tabs */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[var(--border)]/40 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button
            id="tab-chapters-btn"
            type="button"
            onClick={() => setActiveTab('chapters')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeTab === 'chapters'
                ? 'bg-[var(--ink)] text-[var(--bg)] shadow-md font-extrabold'
                : 'text-[var(--ink-dim)] hover:text-[var(--ink)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)]'
            }`}
          >
            Chapters {chapters.length > 0 ? `(${chapters.length})` : ''}
          </button>
          <button
            id="tab-transcript-btn"
            type="button"
            onClick={() => setActiveTab('transcript')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'transcript'
                ? 'bg-[var(--ink)] text-[var(--bg)] shadow-md font-extrabold'
                : 'text-[var(--ink-dim)] hover:text-[var(--ink)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)]'
            }`}
          >
            Transcript
          </button>
        </div>
      </div>

      {/* 3. Subtitle / Disclaimer Bar with 3-Dots Menu matching YouTube screenshot */}
      {activeTab === 'chapters' && (
        <div className="px-4 py-2 bg-[var(--surface-high)]/30 dark:bg-black/20 flex items-center justify-between text-[11px] text-[var(--ink-dim)] dark:text-zinc-400 border-b border-[var(--border)]/40 dark:border-white/10">
          <div className="flex items-center gap-1.5 font-medium">
            {isAuto ? (
              <span>These chapters are auto-generated</span>
            ) : chapterSource === 'ai_generated' ? (
              <span className="flex items-center gap-1 text-purple-400">
                <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                AI Curriculum Checkpoints
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <Layers className="w-3 h-3 text-emerald-400 shrink-0" />
                From the video creator
              </span>
            )}
          </div>

          {/* 3-dots info / option menu aligned on the right of subtitle bar */}
          <div className="relative" ref={menuRef}>
            <button
              id="chapter-menu-btn"
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Options"
              aria-label="Chapter options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-[#202024] border border-white/15 rounded-xl shadow-2xl py-1.5 z-50 text-xs text-zinc-200">
                <button
                  type="button"
                  onClick={handleCopyTimestamps}
                  className="w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center gap-2 text-zinc-200 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Timestamps Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy all timestamps</span>
                    </>
                  )}
                </button>
                <div className="border-t border-white/10 my-1" />
                <div className="px-3.5 py-1.5 text-[11px] text-zinc-400 space-y-1">
                  <p className="font-semibold text-white">Source details:</p>
                  <p>
                    {isAuto
                      ? 'Generated by YouTube speech recognition & visual section parsing.'
                      : chapterSource === 'ai_generated'
                      ? 'Synthesized via AI curriculum checkpoints.'
                      : 'Created and specified by the original video author.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Tab Content: Chapters */}
      {activeTab === 'chapters' && (
        <div
          id="chapters-scroll-list"
          ref={scrollContainerRef}
          onMouseEnter={() => { isHoveredRef.current = true; }}
          onMouseLeave={() => { isHoveredRef.current = false; }}
          onTouchStart={() => { isHoveredRef.current = true; }}
          onTouchEnd={() => {
            setTimeout(() => { isHoveredRef.current = false; }, 2000);
          }}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 sm:p-3.5 space-y-3 scroll-smooth touch-pan-y pb-36"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {chapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center text-zinc-400 px-4">
              <Layers className="w-10 h-10 mb-2 opacity-30 text-white" />
              <p className="text-sm font-semibold text-white">No chapters available</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                This video does not have chapter markers. You can use the timeline scrubber to navigate.
              </p>
            </div>
          ) : (
            <>
              {chapters.map((ch, idx) => {
                const isCurrent = activeChapter?.startSeconds === ch.startSeconds;
                const thumbUrl = ch.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

                return (
                  <button
                    key={`${ch.startSeconds}-${idx}`}
                    ref={isCurrent ? activeChapterRef : null}
                    type="button"
                    onClick={() => onSeekTo(ch.startSeconds)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all group relative border cursor-pointer shrink-0 ${
                      isCurrent
                        ? 'bg-cyan-500/15 border-cyan-500/40 shadow-sm'
                        : 'hover:bg-white/10 border-transparent'
                    }`}
                    aria-current={isCurrent ? 'true' : undefined}
                  >
                    {/* Left: Thumbnail Preview */}
                    <div className="relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10 shadow-xs">
                      <img
                        src={thumbUrl}
                        alt={ch.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />

                      {/* Play / Active Overlay */}
                      <div
                        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                          isCurrent
                            ? 'bg-black/35 opacity-100'
                            : 'bg-black/40 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isCurrent ? (
                          <div className="flex items-center gap-0.5 text-cyan-400">
                            <span className="w-1 h-3 bg-cyan-400 animate-pulse rounded-full" />
                            <span className="w-1 h-4 bg-cyan-400 animate-pulse delay-75 rounded-full" />
                            <span className="w-1 h-2.5 bg-cyan-400 animate-pulse delay-150 rounded-full" />
                          </div>
                        ) : (
                          <Play className="w-5 h-5 text-white fill-white/80 drop-shadow-md" />
                        )}
                      </div>

                      {/* Duration badge on thumbnail bottom right */}
                      <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/85 text-[9px] font-mono font-medium text-white/90">
                        {ch.formattedDuration}
                      </div>
                    </div>

                    {/* Right: Chapter Title & Cyan Timestamp Badge */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-1">
                      <p
                        className={`text-xs sm:text-[13px] font-bold leading-snug line-clamp-2 transition-colors ${
                          isCurrent ? 'text-cyan-300' : 'text-white/95 group-hover:text-white'
                        }`}
                      >
                        {ch.title}
                      </p>

                      {/* Cyan Timestamp Pill Matching Screenshot */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span
                          className={`inline-flex items-center text-[11px] font-mono font-bold px-2 py-0.5 rounded-md transition-colors ${
                            isCurrent
                              ? 'bg-cyan-500 text-zinc-950 font-extrabold shadow-xs'
                              : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 group-hover:bg-cyan-500/25'
                          }`}
                        >
                          {ch.formattedStart}
                        </span>

                        {isCurrent && (
                          <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-1">
                            <Volume2 className="w-3 h-3 animate-pulse" />
                            Playing
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {/* Trailing spacer to ensure the last chapter item is always fully visible upon scroll */}
              <div className="h-24 sm:h-28 shrink-0 w-full select-none pointer-events-none" aria-hidden="true" />
            </>
          )}
        </div>
      )}

      {/* 5. Tab Content: Transcript */}
      {activeTab === 'transcript' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Transcript Search Bar */}
          <div className="p-3 border-b border-white/10 bg-black/20 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                placeholder="Search transcript..."
                className="w-full bg-black/40 border border-white/15 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Transcript Lines List */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2 touch-pan-y pb-16">
            {loadingTranscript ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 space-y-2">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Loading transcript checkpoints...</p>
              </div>
            ) : filteredTranscript.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400">
                {transcriptSearch ? 'No matching transcript lines found.' : 'No transcript available.'}
              </div>
            ) : (
              filteredTranscript.map((t, idx) => {
                const isActive = currentTime >= t.startSeconds && (idx === filteredTranscript.length - 1 || currentTime < filteredTranscript[idx + 1].startSeconds);
                return (
                  <button
                    key={`${t.startSeconds}-${idx}`}
                    type="button"
                    onClick={() => onSeekTo(t.startSeconds)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 group border cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/15 border-cyan-500/40'
                        : 'hover:bg-white/10 border-transparent'
                    }`}
                  >
                    <span className="inline-flex items-center text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 group-hover:bg-cyan-500/25 shrink-0 mt-0.5">
                      {t.formattedStart}
                    </span>
                    <p className={`text-xs leading-relaxed ${isActive ? 'text-white font-semibold' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                      {t.text}
                    </p>
                  </button>
                );
              })
            )}
            <div className="h-20 shrink-0 w-full select-none pointer-events-none" aria-hidden="true" />
          </div>
        </div>
      )}
    </aside>
  );
});
