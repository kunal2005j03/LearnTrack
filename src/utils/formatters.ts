import { Course, CourseVideo, VideoProgress } from '../types';

export function formatSeconds(seconds: number | undefined): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTotalWatchTime(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return '0m';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);

  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}m`;
}

export function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 30) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function extractPlaylistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{10,64}$/.test(trimmed) && !trimmed.includes('http')) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const list = url.searchParams.get('list');
    if (list) return list;
  } catch {
    const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }
  return null;
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export interface StreakMilestone {
  days: number;
  title: string;
  badge: string;
  icon: string;
  description: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 1, title: 'First Step', badge: '🌱', icon: 'Sparkles', description: 'Watched your first educational video' },
  { days: 3, title: 'Momentum Builder', badge: '🚀', icon: 'Zap', description: '3 consecutive days of daily learning' },
  { days: 7, title: 'Week Warrior', badge: '🔥', icon: 'Flame', description: 'Completed a full 7-day study week' },
  { days: 14, title: 'Habit Master', badge: '⚡', icon: 'Award', description: 'Built an unbreakable 2-week learning habit' },
  { days: 30, title: 'Scholar Legend', badge: '👑', icon: 'Crown', description: '30 consecutive days of mastery' },
  { days: 60, title: 'Diamond Mind', badge: '💎', icon: 'ShieldCheck', description: '60 days of relentless growth' },
  { days: 100, title: 'Century Titan', badge: '🏆', icon: 'Trophy', description: '100 days of educational excellence' },
];

export function getNextStreakMilestone(currentStreak: number): {
  currentTier: StreakMilestone | null;
  nextMilestone: StreakMilestone;
  progressPct: number;
  daysRemaining: number;
} {
  const sorted = [...STREAK_MILESTONES].sort((a, b) => a.days - b.days);
  let currentTier: StreakMilestone | null = null;
  for (const m of sorted) {
    if (currentStreak >= m.days) {
      currentTier = m;
    }
  }

  const nextMilestone = sorted.find((m) => m.days > currentStreak) || sorted[sorted.length - 1];
  const prevDays = currentTier ? currentTier.days : 0;
  const targetDays = nextMilestone.days;
  const span = targetDays - prevDays;
  const progress = currentStreak - prevDays;
  const progressPct = span > 0 ? Math.min(100, Math.max(0, Math.round((progress / span) * 100))) : 100;
  const daysRemaining = Math.max(0, targetDays - currentStreak);

  return {
    currentTier,
    nextMilestone,
    progressPct,
    daysRemaining,
  };
}

export function calculateStreaks(activeDates: string[]): {
  current: number;
  best: number;
  hasWatchedToday: boolean;
  hasWatchedYesterday: boolean;
  totalActiveDays: number;
} {
  if (!activeDates || activeDates.length === 0) {
    return { current: 0, best: 0, hasWatchedToday: false, hasWatchedYesterday: false, totalActiveDays: 0 };
  }

  // Deduplicate and normalize valid YYYY-MM-DD
  const validDates = Array.from(
    new Set(
      activeDates.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)).map((d) => d.substring(0, 10))
    )
  ).sort();

  if (validDates.length === 0) {
    return { current: 0, best: 0, hasWatchedToday: false, hasWatchedYesterday: false, totalActiveDays: 0 };
  }

  const today = new Date();
  const todayStr = getLocalDateString(today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const hasWatchedToday = validDates.includes(todayStr);
  const hasWatchedYesterday = validDates.includes(yesterdayStr);

  // Set for O(1) lookups
  const dateSet = new Set(validDates);

  // Calculate current streak
  let currentStreak = 0;
  if (hasWatchedToday || hasWatchedYesterday) {
    let checkDate = hasWatchedToday ? new Date(today) : new Date(yesterday);
    while (true) {
      const checkStr = getLocalDateString(checkDate);
      if (dateSet.has(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate best historical streak
  let bestStreak = 0;
  let runningStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of validDates) {
    const currDate = parseLocalDate(dateStr);
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const diffMs = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 3600 * 24));
      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }
    if (runningStreak > bestStreak) {
      bestStreak = runningStreak;
    }
    prevDate = currDate;
  }

  return {
    current: currentStreak,
    best: Math.max(bestStreak, currentStreak),
    hasWatchedToday,
    hasWatchedYesterday,
    totalActiveDays: validDates.length,
  };
}

export function formatEstimatedTimeRemaining(seconds: number | undefined, verbose: boolean = false): string {
  if (seconds === undefined || seconds === null || seconds <= 0 || isNaN(seconds)) {
    return verbose ? '0 minutes remaining' : '0m left';
  }
  const total = Math.round(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);

  if (hrs === 0 && mins === 0) {
    return verbose ? '< 1 minute remaining' : '< 1m left';
  }

  if (verbose) {
    if (hrs > 0 && mins > 0) {
      return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'min' : 'mins'} remaining`;
    }
    if (hrs > 0) {
      return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} remaining`;
    }
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'} remaining`;
  }

  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m left`;
  }
  if (hrs > 0) {
    return `${hrs}h left`;
  }
  return `${mins}m left`;
}

export interface CourseRemainingStats {
  remainingSeconds: number;
  totalDurationSeconds: number;
  watchedDurationSeconds: number;
  unwatchedVideosCount: number;
  totalVideosCount: number;
  completedVideosCount: number;
  completionPercentage: number;
  formattedRemaining: string; // e.g. "2h 45m left"
  formattedRemainingVerbose: string; // e.g. "2 hours 45 mins remaining"
  formattedTotalDuration: string; // e.g. "6h 15m"
  formattedWatchedDuration: string; // e.g. "3h 30m"
  isCompleted: boolean;
}

export function getCourseRemainingTimeStats(
  course: Course | null | undefined,
  videos?: CourseVideo[],
  progressMap?: Record<string, VideoProgress>
): CourseRemainingStats {
  if (!course) {
    return {
      remainingSeconds: 0,
      totalDurationSeconds: 0,
      watchedDurationSeconds: 0,
      unwatchedVideosCount: 0,
      totalVideosCount: 0,
      completedVideosCount: 0,
      completionPercentage: 0,
      formattedRemaining: '0m left',
      formattedRemainingVerbose: '0 minutes remaining',
      formattedTotalDuration: '0m',
      formattedWatchedDuration: '0m',
      isCompleted: false,
    };
  }

  const totalVideosCount = course.totalVideos || (videos ? videos.length : 0);
  let completedVideosCount = course.completedVideos || 0;
  let remainingSeconds = 0;
  let totalDurationSeconds = course.totalDurationSeconds || 0;
  let watchedDurationSeconds = 0;
  let unwatchedVideosCount = 0;

  if (videos && videos.length > 0) {
    let computedTotalSec = 0;
    let computedRemainingSec = 0;
    let computedWatchedSec = 0;
    let completedCount = 0;
    let unwatchedCount = 0;

    videos.forEach((vid) => {
      const vidDuration = vid.durationSeconds || 0;
      computedTotalSec += vidDuration;

      const p = progressMap ? progressMap[vid.id] : undefined;
      const isVideoCompleted = p?.completed ?? false;

      if (isVideoCompleted) {
        completedCount++;
        computedWatchedSec += vidDuration;
      } else {
        unwatchedCount++;
        const watchedSec = p ? p.watchedSeconds || 0 : 0;
        computedWatchedSec += Math.min(vidDuration, watchedSec);
        const rem = Math.max(0, vidDuration - watchedSec);
        computedRemainingSec += rem;
      }
    });

    totalDurationSeconds = computedTotalSec > 0 ? computedTotalSec : totalDurationSeconds;
    remainingSeconds = computedRemainingSec;
    watchedDurationSeconds = computedWatchedSec;
    completedVideosCount = completedCount;
    unwatchedVideosCount = unwatchedCount;
  } else {
    // Fallback when video details array is not in cache yet
    unwatchedVideosCount = Math.max(0, totalVideosCount - completedVideosCount);
    if (completedVideosCount >= totalVideosCount && totalVideosCount > 0) {
      remainingSeconds = 0;
      watchedDurationSeconds = totalDurationSeconds;
    } else if (totalDurationSeconds > 0) {
      const fractionRemaining = totalVideosCount > 0 ? unwatchedVideosCount / totalVideosCount : 1;
      remainingSeconds = Math.round(totalDurationSeconds * fractionRemaining);
      watchedDurationSeconds = Math.max(0, totalDurationSeconds - remainingSeconds);
    } else {
      // Estimate approx 10 minutes per video if duration is completely unknown
      const estimatedSecPerVideo = 600;
      totalDurationSeconds = totalVideosCount * estimatedSecPerVideo;
      remainingSeconds = unwatchedVideosCount * estimatedSecPerVideo;
      watchedDurationSeconds = completedVideosCount * estimatedSecPerVideo;
    }
  }

  const isCompleted =
    (totalVideosCount > 0 && completedVideosCount >= totalVideosCount) ||
    (remainingSeconds === 0 && totalVideosCount > 0);
  const completionPercentage =
    totalVideosCount > 0
      ? Math.min(100, Math.round((completedVideosCount / totalVideosCount) * 100))
      : course.percentage || 0;

  return {
    remainingSeconds,
    totalDurationSeconds,
    watchedDurationSeconds,
    unwatchedVideosCount,
    totalVideosCount,
    completedVideosCount,
    completionPercentage,
    formattedRemaining: isCompleted ? 'Completed' : formatEstimatedTimeRemaining(remainingSeconds, false),
    formattedRemainingVerbose: isCompleted
      ? 'Course Completed'
      : formatEstimatedTimeRemaining(remainingSeconds, true),
    formattedTotalDuration: formatTotalWatchTime(totalDurationSeconds),
    formattedWatchedDuration: formatTotalWatchTime(watchedDurationSeconds),
    isCompleted,
  };
}

