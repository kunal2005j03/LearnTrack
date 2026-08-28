import React, { useState, useMemo } from 'react';
import { Course, VideoProgress } from '../types';
import { useProgressMap, useStats, useContinueLearningVideo } from '../hooks/useProgress';
import { useLearnTrack } from '../context/LearnTrackContext';
import {
  Bookmark,
  MoreVertical,
  Trash2,
  Play,
  CheckCircle2,
  TrendingUp,
  Clock,
  Calendar,
  Sparkles,
  AlertTriangle,
  Award,
  CalendarDays } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getCourseRemainingTimeStats, formatTotalWatchTime } from '../utils/formatters';
import { calculateCourseDeadlinePacing } from '../utils/studyPlanner';
import { StudyScheduleModal } from './StudyScheduleModal';

interface CourseCardProps {
  course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const { openCourse, toggleCourseBookmark, deleteCourse,  cachedVideos } = useLearnTrack();
  const progressMap = useProgressMap();
  const [showMenu, setShowMenu] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Compute exact unwatched videos duration & remaining time 
  const remainingStats = useMemo(() => {
    return getCourseRemainingTimeStats(course, cachedVideos[course.id], progressMap);
  }, [course, cachedVideos, progressMap]);

  // Compute pacing vs initial target deadline
  const pacing = useMemo(() => {
    return calculateCourseDeadlinePacing(course, remainingStats);
  }, [course, remainingStats]);

  const hasSchedule = course.studySchedule && course.studySchedule.mode !== 'none';
  const scheduleSummary = pacing.scheduleSummary;

  // Generate sparkline trend points for this specific course
  const sparklineData = useMemo(() => {
    const total = Math.max(1, course.totalVideos || 1);
    const courseProgress = (Object.values(progressMap) as VideoProgress[])
      .filter((p) => p.courseId === course.id && p.lastWatchedAt)
      .sort((a, b) => new Date(a.lastWatchedAt).getTime() - new Date(b.lastWatchedAt).getTime());

    const data: Array<{ point: number; pct: number }> = [{ point: 0, pct: 0 }];
    let count = 0;
    const completedSet = new Set<string>();

    courseProgress.forEach((p, idx) => {
      if (p.completed && !completedSet.has(p.videoId)) {
        completedSet.add(p.videoId);
        count++;
        data.push({
          point: idx + 1,
          pct: Math.min(100, Math.round((count / total) * 100)) });
      }
    });

    if (data.length === 1) {
      data.push({ point: 1, pct: course.percentage || 0 });
    } else {
      const last = data[data.length - 1];
      if (last.pct < (course.percentage || 0)) {
        data.push({ point: data.length, pct: course.percentage || 0 });
      }
    }

    return data;
  }, [course, ]);

  return (
    <>
      <div
        id={`course-card-${course.id}`}
        onClick={() => openCourse(course.id)}
        className="group bg-[var(--surface-low)] border border-[var(--border)] rounded-[20px] overflow-hidden hover:-translate-y-1 hover:border-[var(--ink-faint)] transition-all duration-300 cursor-pointer flex flex-col justify-between"
      >
        {/* Thumbnail Container */}
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <img
            src={course.thumbnail || `https://i.ytimg.com/vi/${course.playlistId}/hqdefault.jpg`}
            alt={course.title}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            loading="lazy"
          />

          {/* Play Overlay */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          </div>

          {/* Top Badges / Actions */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white shadow-sm">
                {course.totalVideos} {course.totalVideos === 1 ? 'video' : 'videos'}
              </span>
              {remainingStats.isCompleted ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/80 backdrop-blur-md text-[10px] font-semibold text-white shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Done
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-medium text-[var(--accent)] shadow-sm flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[var(--accent)]" />
                  {remainingStats.formattedRemaining}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCourseBookmark(course.id);
                }}
                className={`p-1.5 rounded-full backdrop-blur-md border transition ${
                  course.isBookmarked
                    ? 'bg-[var(--accent)] border-transparent text-white'
                    : 'bg-black/60 border-white/10 text-white/80 hover:text-white hover:bg-black/80'
                }`}
                title={course.isBookmarked ? 'Bookmarked' : 'Bookmark course'}
              >
                <Bookmark className={`w-3 h-3 ${course.isBookmarked ? 'fill-current' : ''}`} />
              </button>

              <div className="relative">
                <button
                  id={`course-menu-btn-${course.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/80 hover:text-white transition"
                  aria-label="Course options"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>

                {showMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-8 w-44 bg-[var(--surface-mid)] border border-[var(--border)] rounded-xl shadow-2xl p-1 z-30 animate-scaleIn"
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        openCourse(course.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-high)] rounded-lg flex items-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5 text-[var(--accent)]" /> View Course
                    </button>

                    <button
                      id={`course-schedule-menu-item-${course.id}`}
                      onClick={() => {
                        setShowMenu(false);
                        setIsScheduleModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-high)] rounded-lg flex items-center gap-2"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                      {hasSchedule ? 'Edit Study Schedule' : 'Study Schedule'}
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        if (confirm(`Remove "${course.title}" and its progress?`)) {
                          deleteCourse(course.id);
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 border-t border-[var(--border)]/50 mt-1 pt-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Course Body Info */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <h3 className="font-semibold text-sm text-[var(--ink)] line-clamp-2 leading-snug mb-1">
              {course.title}
            </h3>
            <div className="flex items-center justify-between text-xs text-[var(--ink-faint)]">
              <span className="truncate max-w-[170px]">
                {course.channelTitle || 'YouTube Academy'}
              </span>
              <span className="shrink-0 font-mono text-[11px]">
                {remainingStats.formattedTotalDuration}
              </span>
            </div>
          </div>

          {/* Time & Schedule Compact Grid */}
          <div className="space-y-1.5 rounded-xl bg-[var(--surface-high)]/40 border border-[var(--border)] p-2.5 text-xs">
            {/* Time Left Row */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--ink-dim)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span className="font-medium">Time Left:</span>
              </span>
              <span className="text-[11px] font-semibold text-[var(--ink)]">
                {remainingStats.isCompleted ? (
                  <span className="text-emerald-400">Done</span>
                ) : (
                  <span>
                    {remainingStats.formattedRemaining}{' '}
                    <span className="font-normal text-[var(--ink-faint)]">
                      ({remainingStats.unwatchedVideosCount} {remainingStats.unwatchedVideosCount === 1 ? 'lesson' : 'lessons'})
                    </span>
                  </span>
                )}
              </span>
            </div>

            {/* Target Date Row */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--ink-dim)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span className="font-medium">Target:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[var(--ink)]">
                  {pacing.currentProjectedDeadlineFormatted}
                </span>

                {pacing.isCompleted ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                    Done
                  </span>
                ) : pacing.status === 'ahead' ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    -{Math.abs(pacing.daysDelta)}d
                  </span>
                ) : pacing.status === 'behind' && (!hasSchedule || pacing.isScheduledToday) ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[var(--accent)]/15 text-[var(--accent)] flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    +{pacing.daysDelta}d
                  </span>
                ) : null}
              </div>
            </div>

            {/* Study Schedule Indicator Row (only if schedule configured) */}
            {hasSchedule && scheduleSummary && (
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/50">
                <span className="text-[11px] text-[var(--ink-dim)] flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-medium">Study:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-[var(--ink)]">
                    {scheduleSummary}
                  </span>
                  {pacing.scheduleStatusLabel && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        pacing.isScheduledToday
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-[var(--surface-high)] text-[var(--ink-dim)]'
                      }`}
                    >
                      {pacing.scheduleStatusLabel}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recharts Completion Sparkline */}
          <div className="bg-[var(--surface-high)] rounded-xl p-2 border border-[var(--border)] space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[var(--ink-dim)] px-1">
              <span className="flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3 text-[var(--accent)]" />
                Trend
              </span>
              <span className="font-mono font-semibold text-[var(--ink)]">
                {course.percentage}%
              </span>
            </div>

            <div className="h-8 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`sparkGradient-${course.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="pct"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#sparkGradient-${course.id})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Visual Progress bar and metrics */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-[var(--ink-dim)]">
              <span className="flex items-center gap-1 text-[11px]">
                {course.completedVideos === course.totalVideos && course.totalVideos > 0 && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                )}
                {course.percentage}% Complete
              </span>
              <span className="text-[11px] text-[var(--ink-faint)]">
                {course.completedVideos}/{course.totalVideos}
              </span>
            </div>

            <div className="h-1.5 w-full bg-[var(--surface-high)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent)] to-[#6366F1] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, course.percentage || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Study Schedule Modal / Sheet */}
      <StudyScheduleModal
        course={course}
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
    </>
  );
};

