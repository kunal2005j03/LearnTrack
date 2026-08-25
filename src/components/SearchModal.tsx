import React, { useState, useEffect, useMemo } from 'react';
import { useLearnTrack } from '../context/LearnTrackContext';
import { Search, X, BookOpen, PlayCircle, ArrowRight } from 'lucide-react';
import { formatSeconds } from '../utils/formatters';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, courses, cachedVideos, progressMap, openCourse, openVideo } =
    useLearnTrack();
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener ⌘K / Ctrl+K / Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  // Search results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { matchingCourses: [], matchingVideos: [] };

    const matchingCourses = courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.channelTitle.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );

    const matchingVideos: Array<{ courseId: string; courseTitle: string; video: any; progress?: any }> = [];
    Object.entries(cachedVideos).forEach(([cId, vids]) => {
      const course = courses.find((c) => c.id === cId);
      vids.forEach((v) => {
        if (
          v.title.toLowerCase().includes(q) ||
          v.channelTitle.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q)
        ) {
          matchingVideos.push({
            courseId: cId,
            courseTitle: course?.title || 'Course',
            video: v,
            progress: progressMap[v.id],
          });
        }
      });
    });

    return {
      matchingCourses: matchingCourses.slice(0, 5),
      matchingVideos: matchingVideos.slice(0, 10),
    };
  }, [query, courses, cachedVideos, progressMap]);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-low)]">
          <Search className="w-5 h-5 text-[var(--ink-dim)] mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, lessons, topics, channels..."
            autoFocus
            className="flex-1 bg-transparent text-[var(--ink)] placeholder-[var(--ink-faint)] text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="px-2 py-0.5 text-xs text-[var(--ink-faint)] hover:text-[var(--ink)] mr-2"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="p-1 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6 bg-[var(--surface-mid)]">
          {!query.trim() ? (
            <div className="text-center py-10 text-[var(--ink-faint)] text-xs">
              Type to search through all indexed courses and video lessons.
            </div>
          ) : results.matchingCourses.length === 0 && results.matchingVideos.length === 0 ? (
            <div className="text-center py-10 text-[var(--ink-faint)] text-xs">
              No matching records found for "{query}".
            </div>
          ) : (
            <>
              {/* Courses Results */}
              {results.matchingCourses.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--accent)] mb-3 flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Courses ({results.matchingCourses.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {results.matchingCourses.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          openCourse(c.id);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-[var(--border)] hover:border-[var(--ink-faint)] flex items-center justify-between group transition bg-[var(--surface-low)]"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={c.thumbnail || `https://i.ytimg.com/vi/${c.playlistId}/hqdefault.jpg`}
                            alt={c.title}
                            className="w-14 h-9 rounded object-cover bg-black border border-[var(--border)]"
                          />
                          <div>
                            <div className="text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--accent)] transition">
                              {c.title}
                            </div>
                            <div className="text-[10px] text-[var(--ink-faint)]">
                              {c.channelTitle} • {c.completedVideos}/{c.totalVideos} completed ({c.percentage}%)
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[var(--accent)] opacity-0 group-hover:opacity-100 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos Results */}
              {results.matchingVideos.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--accent)] mb-3 flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                    <span className="flex items-center gap-1.5">
                      <PlayCircle className="w-3.5 h-3.5" />
                      Lessons ({results.matchingVideos.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {results.matchingVideos.map(({ courseId, courseTitle, video, progress }) => (
                      <button
                        key={video.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          openVideo(courseId, video.id);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-[var(--border)] hover:border-[var(--ink-faint)] flex items-center justify-between group transition bg-[var(--surface-low)]"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-14 h-9 rounded object-cover bg-black border border-[var(--border)]"
                          />
                          <div>
                            <div className="text-xs font-medium text-[var(--ink)] group-hover:text-[var(--accent)] transition line-clamp-1">
                              {video.title}
                            </div>
                            <div className="text-[10px] text-[var(--ink-faint)] flex items-center gap-2">
                              <span>{courseTitle}</span>
                              <span>•</span>
                              <span className="font-mono">{formatSeconds(video.durationSeconds)}</span>
                              {progress?.completed && (
                                <span className="text-emerald-400 font-medium">✓ Completed</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-[var(--accent)] opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                          Play <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
