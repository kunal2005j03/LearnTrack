import React, { useEffect, useState, useMemo } from 'react';
import { useProgressMap, useStats, useContinueLearningVideo } from '../hooks/useProgress';
import { useLearnTrack } from '../context/LearnTrackContext';
import { formatSeconds, getCourseRemainingTimeStats, formatTotalWatchTime } from '../utils/formatters';
import { CourseVideo } from '../types';
import { StudyGoalCard } from '../components/StudyGoalCard';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Circle,
  Bookmark,
  Trash2,
  Search,
  Clock,
  Hourglass,
  Sparkles,
  BarChart2 } from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const {
    activeCourseId,
    courses,
    getCourseVideos,
    
    openVideo,
    setCurrentView,
    toggleCourseBookmark,
    toggleVideoBookmark,
    deleteCourse,
    markVideoComplete } = useLearnTrack();
  const progressMap = useProgressMap();

  const [videos, setVideos] = useState<CourseVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [videoFilter, setVideoFilter] = useState<'all' | 'uncompleted' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const course = courses.find((c) => c.id === activeCourseId);

  useEffect(() => {
    if (activeCourseId) {
      setLoadingVideos(true);
      getCourseVideos(activeCourseId).then((vids) => {
        setVideos(vids);
        setLoadingVideos(false);
      });
    }
  }, [activeCourseId, getCourseVideos]);

  // Compute exact estimated time remaining and completion stats
  const remainingStats = useMemo(() => {
    return getCourseRemainingTimeStats(course, videos, progressMap);
  }, [course, videos, progressMap]);

  // Determine next video to watch
  const nextVideoToWatch = useMemo(() => {
    if (videos.length === 0) return null;
    const uncompleted = videos.find((v) => !progressMap[v.id]?.completed);
    return uncompleted || videos[0];
  }, [videos, ]);

  // Filtered videos
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      const isCompleted = progressMap[v.id]?.completed;
      if (videoFilter === 'uncompleted' && isCompleted) return false;
      if (videoFilter === 'completed' && !isCompleted) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return v.title.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [videos, videoFilter, searchQuery, ]);

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[var(--ink)]">Course not found</h2>
        <button
          onClick={() => setCurrentView('courses')}
          className="px-5 py-2.5 bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[var(--ink)] rounded-full text-xs font-medium border border-[var(--border)]"
        >
          Return to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Back button */}
      <button
        onClick={() => setCurrentView('courses')}
        className="inline-flex items-center gap-2 text-xs font-medium text-[var(--ink-dim)] hover:text-[var(--ink)] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Courses
      </button>

      {/* Course Hero Banner Card */}
      <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Thumbnail */}
          <div className="md:col-span-4 relative aspect-video rounded-xl border border-[var(--border)] overflow-hidden bg-black shadow-md">
            <img
              src={course.thumbnail || `https://i.ytimg.com/vi/${course.playlistId}/hqdefault.jpg`}
              alt={course.title}
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-medium text-white">
              {course.totalVideos} videos
            </div>
          </div>

          {/* Details & Actions */}
          <div className="md:col-span-8 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--accent)]">
                {course.channelTitle || 'Course Playlist'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleCourseBookmark(course.id)}
                  className={`p-2 rounded-full border transition ${
                    course.isBookmarked
                      ? 'bg-[var(--accent)] border-transparent text-white'
                      : 'border-[var(--border)] text-[var(--ink-dim)] hover:text-[var(--ink)] bg-[var(--surface-high)]'
                  }`}
                  title={course.isBookmarked ? 'Bookmarked' : 'Bookmark course'}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${course.isBookmarked ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to remove "${course.title}"?`)) {
                      deleteCourse(course.id);
                    }
                  }}
                  className="p-2 rounded-full border border-red-500/20 text-red-400 hover:bg-red-500/10 transition"
                  title="Remove Course"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)] tracking-tight leading-snug">
              {course.title}
            </h1>

            {course.description && (
              <p className="text-xs sm:text-sm text-[var(--ink-dim)] line-clamp-2 max-w-2xl leading-relaxed">
                {course.description}
              </p>
            )}

            {/* Estimated Time Remaining & Progress Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-[var(--surface-high)] border border-[var(--border)] rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  <Clock className="w-3 h-3" />
                  Time Left
                </div>
                <div className="text-base sm:text-lg font-bold text-[var(--ink)] tracking-tight">
                  {remainingStats.isCompleted ? (
                    <span className="text-emerald-400 text-sm sm:text-base">0m (Completed)</span>
                  ) : (
                    remainingStats.formattedRemaining
                  )}
                </div>
                <div className="text-[10px] text-[var(--ink-faint)] truncate">
                  {remainingStats.unwatchedVideosCount} unwatched {remainingStats.unwatchedVideosCount === 1 ? 'lesson' : 'lessons'}
                </div>
              </div>

              <div className="bg-[var(--surface-high)] border border-[var(--border)] rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-dim)]">
                  <Hourglass className="w-3 h-3 text-[var(--accent)]" />
                  Total Course
                </div>
                <div className="text-base sm:text-lg font-bold text-[var(--ink)] tracking-tight">
                  {remainingStats.formattedTotalDuration}
                </div>
                <div className="text-[10px] text-[var(--ink-faint)] truncate">
                  {remainingStats.totalVideosCount} total videos
                </div>
              </div>

              <div className="bg-[var(--surface-high)] border border-[var(--border)] rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-dim)]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Watched
                </div>
                <div className="text-base sm:text-lg font-bold text-[var(--ink)] tracking-tight">
                  {remainingStats.formattedWatchedDuration}
                </div>
                <div className="text-[10px] text-[var(--ink-faint)] truncate">
                  {remainingStats.completedVideosCount} completed
                </div>
              </div>

              <div className="bg-[var(--surface-high)] border border-[var(--border)] rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-dim)]">
                  <BarChart2 className="w-3 h-3 text-[var(--accent)]" />
                  Completion
                </div>
                <div className="text-base sm:text-lg font-bold text-[var(--ink)] tracking-tight">
                  {course.percentage}%
                </div>
                <div className="text-[10px] text-[var(--ink-faint)] truncate">
                  {Math.round(course.percentage)}% of curriculum
                </div>
              </div>
            </div>

            {/* Progress status bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-[var(--ink-dim)]">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{remainingStats.formattedRemainingVerbose}</span>
                </span>
                <span className="font-semibold text-[var(--ink)] text-[11px]">
                  {course.completedVideos} / {course.totalVideos} videos
                </span>
              </div>
              <div className="w-full h-2.5 bg-[var(--surface-high)] rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent)] to-[#6366F1] transition-all duration-300"
                  style={{ width: `${course.percentage}%` }}
                />
              </div>
            </div>

            {/* Resume or Start Button */}
            {nextVideoToWatch && (
              <div className="pt-1 flex items-center gap-3">
                <button
                  onClick={() => openVideo(course.id, nextVideoToWatch.id)}
                  className="bg-[var(--ink)] text-[var(--bg)] px-6 py-2.5 rounded-full text-xs font-semibold hover:-translate-y-0.5 transition shadow-sm inline-flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {course.percentage > 0 ? 'Resume Course' : 'Start Learning'}
                </button>
                <span className="text-xs text-[var(--ink-dim)] hidden sm:inline">
                  Next: <span className="font-medium text-[var(--ink)] truncate max-w-[260px] inline-block align-bottom">{nextVideoToWatch.title}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Study Quota, Gemini AI Recommendations & Target Deadline Planner */}
      <StudyGoalCard course={course} videos={videos} />

      {/* Curriculum Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--ink)]">
              Curriculum ({videos.length} videos)
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--surface-high)] border border-[var(--border)] text-[var(--ink-dim)]">
              {remainingStats.formattedRemaining} left
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-[var(--surface-low)] border border-[var(--border)] rounded-full p-1">
              <button
                onClick={() => setVideoFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  videoFilter === 'all'
                    ? 'bg-[var(--surface-high)] text-[var(--ink)] shadow-sm'
                    : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'
                }`}
              >
                All ({videos.length})
              </button>
              <button
                onClick={() => setVideoFilter('uncompleted')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  videoFilter === 'uncompleted'
                    ? 'bg-[var(--surface-high)] text-[var(--ink)] shadow-sm'
                    : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'
                }`}
              >
                Remaining ({remainingStats.unwatchedVideosCount})
              </button>
              <button
                onClick={() => setVideoFilter('completed')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  videoFilter === 'completed'
                    ? 'bg-[var(--surface-high)] text-[var(--ink)] shadow-sm'
                    : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'
                }`}
              >
                Completed ({remainingStats.completedVideosCount})
              </button>
            </div>

            {/* Search within lessons */}
            <div className="relative max-w-xs">
              <Search className="w-3.5 h-3.5 text-[var(--ink-faint)] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter videos..."
                className="pl-8 pr-3 py-1.5 bg-[var(--surface-low)] border border-[var(--border)] rounded-full text-xs text-[var(--ink)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </div>

        {/* Video Lessons List */}
        {loadingVideos ? (
          <div className="py-12 text-center text-xs text-[var(--ink-dim)] animate-pulse">
            Loading course videos...
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="p-8 text-center bg-[var(--surface-low)] border border-dashed border-[var(--border)] rounded-[20px] text-xs text-[var(--ink-dim)]">
            No videos match your filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVideos.map((vid, index) => {
              const progress = progressMap[vid.id];
              const isCompleted = progress?.completed;
              const hasProgress = progress && progress.watchedSeconds > 0 && !isCompleted;

              return (
                <div
                  key={vid.id}
                  onClick={() => openVideo(course.id, vid.id)}
                  className={`group p-3 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                    isCompleted
                      ? 'bg-[var(--surface-low)]/60 border-[var(--border)] opacity-70 hover:opacity-100'
                      : hasProgress
                      ? 'bg-[var(--surface-low)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--surface-low)] border-[var(--border)] hover:border-[var(--ink-faint)]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Status Icon Indicator */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markVideoComplete(course.id, vid.id, !isCompleted);
                      }}
                      className="shrink-0 p-1 hover:scale-110 transition"
                      title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : hasProgress ? (
                        <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                          <Play className="w-2 h-2 fill-current ml-0.5" />
                        </div>
                      ) : (
                        <Circle className="w-5 h-5 text-[var(--ink-faint)] hover:text-[var(--ink)]" />
                      )}
                    </button>

                    {/* Lesson Index */}
                    <span className="text-xs font-semibold text-[var(--ink-faint)] shrink-0 w-6">
                      {(vid.position !== undefined ? vid.position + 1 : index + 1)
                        .toString()
                        .padStart(2, '0')}
                    </span>

                    {/* Thumbnail */}
                    <div className="relative w-20 sm:w-24 aspect-video rounded-lg overflow-hidden shrink-0 bg-black border border-[var(--border)]">
                      <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {hasProgress && (
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-black/50">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--accent)] to-white"
                            style={{ width: `${progress?.percentage || 0}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Lesson Title & Info */}
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--ink)] truncate">
                        {vid.title}
                      </h3>
                      <div className="flex items-center flex-wrap gap-2 mt-1 text-xs text-[var(--ink-dim)]">
                        <span>{vid.durationFormatted || formatSeconds(vid.durationSeconds)}</span>
                        {hasProgress && (
                          <>
                            <span>•</span>
                            <span className="text-[var(--accent)] font-medium">
                              {formatSeconds(progress.watchedSeconds)} watched ({progress.percentage}%)
                            </span>
                            <span>•</span>
                            <span className="text-amber-400 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatSeconds(Math.max(0, (vid.durationSeconds || 0) - progress.watchedSeconds))} left
                            </span>
                          </>
                        )}
                        {isCompleted && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-medium">Completed</span>
                          </>
                        )}
                        {!hasProgress && !isCompleted && (
                          <>
                            <span>•</span>
                            <span className="text-[var(--ink-faint)]">Unwatched</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Play / Bookmark Action Trigger */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVideoBookmark(course.id, vid.id);
                      }}
                      className={`p-2 rounded-full transition ${
                        vid.isBookmarked
                          ? 'bg-[var(--accent)] text-white'
                          : 'opacity-0 group-hover:opacity-100 text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)]'
                      }`}
                      title={vid.isBookmarked ? 'Bookmarked' : 'Bookmark lesson'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${vid.isBookmarked ? 'fill-current' : ''}`} />
                    </button>

                    <div className="w-8 h-8 rounded-full bg-[var(--surface-high)] group-hover:bg-[var(--ink)] group-hover:text-[var(--bg)] text-[var(--ink)] flex items-center justify-center transition">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
