import React, { useMemo } from 'react';
import { useLearnTrack } from '../context/LearnTrackContext';
import {
  Flame,
  Trophy,
  Award,
  Sparkles,
  Play,
  ChevronRight,
} from 'lucide-react';
import {
  formatTotalWatchTime,
  calculateStreaks,
  getNextStreakMilestone,
} from '../utils/formatters';
import { StudyCadenceCard } from './StudyCadenceCard';

export const StreakCard: React.FC = () => {
  const { stats, continueLearningVideo, openVideo, courses, cachedVideos } = useLearnTrack();

  // Compute streak details from active dates
  const streakDetails = useMemo(() => {
    return calculateStreaks(stats.activeDates || []);
  }, [stats.activeDates]);

  // Milestone info
  const milestoneInfo = useMemo(() => {
    return getNextStreakMilestone(stats.currentStreak);
  }, [stats.currentStreak]);

  // Handle Quick Play
  const handleQuickPlay = () => {
    if (continueLearningVideo) {
      openVideo(continueLearningVideo.course.id, continueLearningVideo.video.id);
      return;
    }
    if (courses.length > 0) {
      const firstCourse = courses[0];
      const vids = cachedVideos[firstCourse.id];
      if (vids && vids.length > 0) {
        openVideo(firstCourse.id, vids[0].id);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Daily Learning Streak Hero Card */}
      <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 space-y-4 relative overflow-hidden shadow-sm">
        {/* Subtle background glow */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'var(--accent)' }}
        />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
              <Flame className="w-6 h-6 fill-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-[var(--ink)] tracking-tight">
                  {stats.currentStreak}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {stats.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
                </span>
              </div>
              <p className="text-xs text-[var(--ink-faint)] mt-0.5">
                {streakDetails.hasWatchedToday
                  ? '🔥 Streak active! You learned today'
                  : '⚡ Complete 1 lesson today to keep your streak'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-semibold text-[var(--ink-faint)] uppercase tracking-wider">
              Total Watched
            </div>
            <div className="text-sm font-bold text-[var(--ink)]">
              {formatTotalWatchTime(stats.totalWatchSeconds)}
            </div>
          </div>
        </div>

        {/* Motivation / Quick Action Banner */}
        <div className="p-3.5 rounded-2xl bg-[var(--surface-high)]/60 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--ink)]">
                {streakDetails.hasWatchedToday
                  ? 'Daily Goal Accomplished!'
                  : 'Keep your momentum rolling'}
              </div>
              <div className="text-[11px] text-[var(--ink-faint)]">
                {streakDetails.hasWatchedToday
                  ? 'Great dedication! Every lesson builds long-term mastery.'
                  : 'Watch just 5–15 minutes of any enrolled course to maintain your streak.'}
              </div>
            </div>
          </div>

          {!streakDetails.hasWatchedToday && (
            <button
              onClick={handleQuickPlay}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--ink)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Study Lesson</span>
            </button>
          )}
        </div>

        {/* Streak Milestone Level Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--ink-dim)] flex items-center gap-1 font-medium">
              <span>{milestoneInfo.currentTier?.badge || '🌱'}</span>
              <span>{milestoneInfo.currentTier?.title || 'Starting Out'}</span>
              <ChevronRight className="w-3 h-3 text-[var(--ink-faint)]" />
              <span className="text-[var(--ink)] font-semibold">
                {milestoneInfo.nextMilestone.badge} {milestoneInfo.nextMilestone.title} ({milestoneInfo.nextMilestone.days}d)
              </span>
            </span>
            <span className="text-[var(--ink-faint)] font-mono">
              {milestoneInfo.daysRemaining === 0
                ? 'Achieved!'
                : `${milestoneInfo.daysRemaining}d left`}
            </span>
          </div>

          <div className="h-2 w-full bg-[var(--surface-high)] rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
              style={{ width: `${milestoneInfo.progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Schedule-Aware Study Cadence & Activity Component */}
      <StudyCadenceCard />

      {/* 3. Streak Records & Milestones Summary Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Best Streak */}
        <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[20px] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-[var(--ink-faint)] tracking-wider">
              Best Streak
            </div>
            <div className="text-base font-bold text-[var(--ink)] truncate">
              {stats.bestStreak} <span className="text-xs font-normal text-[var(--ink-dim)]">days</span>
            </div>
          </div>
        </div>

        {/* Total Active Days */}
        <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[20px] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-high)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-[var(--ink-faint)] tracking-wider">
              Active Days
            </div>
            <div className="text-base font-bold text-[var(--ink)] truncate">
              {streakDetails.totalActiveDays} <span className="text-xs font-normal text-[var(--ink-dim)]">days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
