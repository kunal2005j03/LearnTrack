import React, { useMemo } from 'react';
import { useLearnTrack } from '../context/LearnTrackContext';
import {
  getCourseRemainingTimeStats,
  formatEstimatedTimeRemaining,
} from '../utils/formatters';
import { calculateCourseDeadlinePacing } from '../utils/studyPlanner';
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  Award,
  Sparkles,
  Flame,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export const DashboardStudyPlannerSummary: React.FC = () => {
  const { courses, cachedVideos, progressMap, openCourse, setCurrentView } = useLearnTrack();

  const coursesPacing = useMemo(() => {
    return courses.map((course) => {
      const remainingStats = getCourseRemainingTimeStats(
        course,
        cachedVideos[course.id],
        progressMap
      );
      const pacing = calculateCourseDeadlinePacing(course, remainingStats);
      return {
        course,
        remainingStats,
        pacing,
      };
    });
  }, [courses, cachedVideos, progressMap]);

  const aheadCourses = coursesPacing.filter(
    (c) => !c.remainingStats.isCompleted && c.pacing.status === 'ahead'
  );
  const behindCourses = coursesPacing.filter(
    (c) => !c.remainingStats.isCompleted && c.pacing.status === 'behind'
  );
  const onTrackCourses = coursesPacing.filter(
    (c) => !c.remainingStats.isCompleted && c.pacing.status === 'on_track'
  );
  const completedCourses = coursesPacing.filter((c) => c.remainingStats.isCompleted);

  if (courses.length === 0) return null;

  return (
    <section
      id="dashboard-study-planner-summary"
      className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 shadow-sm space-y-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--ink)] flex items-center gap-2">
              Target Deadlines & Pacing Tracker
            </h2>
            <p className="text-xs text-[var(--ink-dim)]">
              Real-time daily quota pacing compared against your initial target completion dates.
            </p>
          </div>
        </div>

        {/* Quick status counters */}
        <div className="flex items-center gap-2">
          {aheadCourses.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              {aheadCourses.length} Ahead
            </span>
          )}
          {behindCourses.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {behindCourses.length} Behind Target
            </span>
          )}
        </div>
      </div>

      {/* Behind Schedule Alert Spotlight (if any courses are falling behind initial target) */}
      {behindCourses.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Pacing Alert: {behindCourses.length} {behindCourses.length === 1 ? 'course' : 'courses'} exceeding initial target deadline
          </div>
          <div className="space-y-2">
            {behindCourses.slice(0, 2).map(({ course, pacing, remainingStats }) => (
              <div
                key={course.id}
                onClick={() => openCourse(course.id)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface-mid)] border border-amber-500/20 hover:border-amber-400/50 transition cursor-pointer text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-[var(--ink)] flex items-center gap-2">
                    <span className="truncate max-w-[280px]">{course.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      +{pacing.daysDelta}d delay
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--ink-dim)]">
                    Projected: <span className="text-[var(--ink)] font-medium">{pacing.currentProjectedDeadlineFormatted}</span> (Initial benchmark was {pacing.initialTargetDeadlineFormatted})
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[var(--accent)] font-semibold shrink-0">
                  <span>Adjust Quota</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ahead of Schedule Praise Spotlight (if user is beating initial target deadline) */}
      {aheadCourses.length > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Discipline Praise: You're ahead of schedule on {aheadCourses.length} {aheadCourses.length === 1 ? 'course' : 'courses'}!
          </div>
          <div className="space-y-2">
            {aheadCourses.slice(0, 2).map(({ course, pacing }) => (
              <div
                key={course.id}
                onClick={() => openCourse(course.id)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface-mid)] border border-emerald-500/20 hover:border-emerald-400/50 transition cursor-pointer text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-[var(--ink)] flex items-center gap-2">
                    <span className="truncate max-w-[280px]">{course.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                      {Math.abs(pacing.daysDelta)} days early
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-200/90 font-medium">
                    {pacing.pacingMessage}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold shrink-0">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>Keep Pacing</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Deadlines Compact Table/Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {coursesPacing.map(({ course, pacing, remainingStats }) => (
          <div
            key={course.id}
            onClick={() => openCourse(course.id)}
            className="p-3.5 rounded-2xl bg-[var(--surface-mid)] border border-[var(--border)] hover:border-[var(--ink-faint)] transition-all cursor-pointer space-y-2.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-xs text-[var(--ink)] line-clamp-1">
                  {course.title}
                </h3>
                {pacing.isCompleted ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 shrink-0">
                    Done
                  </span>
                ) : pacing.status === 'ahead' ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 shrink-0 flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    -{Math.abs(pacing.daysDelta)}d
                  </span>
                ) : pacing.status === 'behind' ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 shrink-0 flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    +{pacing.daysDelta}d
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-high)] text-[var(--ink-dim)] shrink-0">
                    On Track
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--ink-faint)] truncate">
                {course.channelTitle}
              </div>
            </div>

            <div className="space-y-1 pt-1 border-t border-[var(--border)]/50 text-[11px]">
              <div className="flex items-center justify-between text-[var(--ink-dim)]">
                <span>{pacing.scheduleSummary ? 'Schedule:' : 'Daily Quota:'}</span>
                <span className="font-semibold text-[var(--ink)]">
                  {pacing.scheduleSummary || `${pacing.dailyQuotaHours} hrs/day`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--ink-dim)]">
                <span>Target Deadline:</span>
                <span className="font-semibold text-[var(--accent)]">
                  {pacing.currentProjectedDeadlineFormatted}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--ink-faint)] text-[10px]">
                <span>Unwatched Left:</span>
                <span>{remainingStats.formattedRemaining}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
