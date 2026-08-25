import {
  Course,
  CourseStudyGoal,
  CourseDeadlinePacing,
  CourseStudySchedule,
  ScheduleDay,
  ScheduleMode,
  AiStudyPlanRecommendation,
} from '../types';
import { CourseRemainingStats } from './formatters';

export const ALL_SCHEDULE_DAYS: ScheduleDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const JS_DAY_TO_SCHEDULE_DAY: Record<number, ScheduleDay> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export const SCHEDULE_DAY_TO_JS_DAY: Record<ScheduleDay, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// Helper to format ISO date (or YYYY-MM-DD) to friendly format like "Oct 24, 2026"
export function formatFriendlyDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return 'TBD';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return 'TBD';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function getISODateOnly(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(baseDate: Date | string, days: number): Date {
  const d = typeof baseDate === 'string' ? new Date(baseDate) : new Date(baseDate.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export function getDaysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  // Set both to midnight UTC to compare calendar days cleanly
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((utc1 - utc2) / MS_PER_DAY);
}

export function normalizeScheduleDay(day: string): ScheduleDay | null {
  if (!day) return null;
  const lower = day.trim().toLowerCase();
  if (lower.startsWith('mon')) return 'Mon';
  if (lower.startsWith('tue')) return 'Tue';
  if (lower.startsWith('wed')) return 'Wed';
  if (lower.startsWith('thu')) return 'Thu';
  if (lower.startsWith('fri')) return 'Fri';
  if (lower.startsWith('sat')) return 'Sat';
  if (lower.startsWith('sun')) return 'Sun';
  return null;
}

/**
 * Checks whether a course is scheduled for study on a given date.
 */
export function isCourseScheduledOnDate(
  schedule: CourseStudySchedule | undefined,
  date: Date = new Date()
): boolean {
  if (!schedule) return false;
  const mode = (schedule.mode as string) || 'none';
  if (mode === 'none' || mode === 'self-paced') return false;
  if (mode === 'daily') return true;

  const rawDays = schedule.customDays || (schedule as any).scheduledDays || [];
  if (!rawDays || rawDays.length === 0) return false;

  const targetDay = JS_DAY_TO_SCHEDULE_DAY[date.getDay()];
  return rawDays.some((d: string) => normalizeScheduleDay(d) === targetDay);
}

/**
 * Returns formatted compact text summary of scheduled days, e.g. "Sat · Sun", "Mon · Wed · Fri", "Daily", or "Self-paced".
 */
export function formatScheduleDaysSummary(schedule: CourseStudySchedule | undefined): string {
  if (!schedule) return 'Self-paced';
  const mode = (schedule.mode as string) || 'none';
  if (mode === 'none' || mode === 'self-paced') return 'Self-paced';
  if (mode === 'daily') return 'Daily';

  const rawDays = schedule.customDays || (schedule as any).scheduledDays || [];
  if (!rawDays || rawDays.length === 0) return 'Self-paced';

  const normalized = Array.from(
    new Set(rawDays.map((d: string) => normalizeScheduleDay(d)).filter(Boolean) as ScheduleDay[])
  );
  if (normalized.length === 0) return 'Self-paced';
  if (normalized.length === 7) return 'Daily';

  // Sort custom days in standard Mon-Sun sequence
  const sorted = normalized.sort(
    (a, b) => ALL_SCHEDULE_DAYS.indexOf(a) - ALL_SCHEDULE_DAYS.indexOf(b)
  );
  return sorted.join(' · ');
}

/**
 * Calculates expected weekly study time in minutes and hours.
 * For Custom Days: customDays.length * dailyGoalMinutes (e.g. 2 days * 1 hr = 2 hr/week)
 * For Daily: 7 * dailyGoalMinutes (e.g. 7 hr/week)
 * For Self-paced: 0
 */
export function getScheduleWeeklyStats(schedule: CourseStudySchedule | undefined): {
  weeklyMinutes: number;
  weeklyHours: number;
  daysCount: number;
  summaryText: string;
} {
  if (!schedule) {
    return { weeklyMinutes: 0, weeklyHours: 0, daysCount: 0, summaryText: 'Self-paced' };
  }
  const mode = (schedule.mode as string) || 'none';
  if (mode === 'none' || mode === 'self-paced') {
    return { weeklyMinutes: 0, weeklyHours: 0, daysCount: 0, summaryText: 'Self-paced' };
  }
  const dailyMins = schedule.dailyGoalMinutes || 60;
  const rawDays = schedule.customDays || (schedule as any).scheduledDays || [];
  const normalized = Array.from(
    new Set(rawDays.map((d: string) => normalizeScheduleDay(d)).filter(Boolean) as ScheduleDay[])
  );
  const daysCount = mode === 'daily' ? 7 : normalized.length;
  const weeklyMinutes = daysCount * dailyMins;
  const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10;
  const summaryText = `${weeklyHours} hr/week`;

  return {
    weeklyMinutes,
    weeklyHours,
    daysCount,
    summaryText,
  };
}

/**
 * Finds the next upcoming scheduled study day (e.g. "Tomorrow", "Sat", etc.)
 */
export function getNextScheduledStudyDay(
  schedule: CourseStudySchedule | undefined,
  fromDate: Date = new Date()
): string | null {
  if (!schedule || schedule.mode === 'none') return null;
  if (schedule.mode === 'daily') return 'Tomorrow';
  if (!schedule.customDays || schedule.customDays.length === 0) return null;

  const daySet = new Set(schedule.customDays);
  let d = new Date(fromDate.getTime());
  for (let i = 1; i <= 7; i++) {
    d.setDate(d.getDate() + 1);
    const dayName = JS_DAY_TO_SCHEDULE_DAY[d.getDay()];
    if (daySet.has(dayName)) {
      if (i === 1) return 'Tomorrow';
      return dayName;
    }
  }
  return null;
}

/**
 * Calculates dynamic target finish date stepping across scheduled days.
 */
export function calculateScheduledTargetDate(
  startDate: Date | string,
  totalStudySessionsNeeded: number,
  schedule: CourseStudySchedule | undefined
): Date {
  const safeStart = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate.getTime());
  if (totalStudySessionsNeeded <= 0) return safeStart;

  // If no schedule or daily mode:
  if (!schedule || schedule.mode === 'none' || schedule.mode === 'daily') {
    return addDays(safeStart, totalStudySessionsNeeded);
  }

  // Custom days
  const rawDays = schedule.customDays || (schedule as any).scheduledDays || [];
  const normalized = Array.from(
    new Set(rawDays.map((d: string) => normalizeScheduleDay(d)).filter(Boolean) as ScheduleDay[])
  );
  if (normalized.length === 0 || normalized.length === 7) {
    return addDays(safeStart, totalStudySessionsNeeded);
  }

  const daySet = new Set(normalized);
  let d = new Date(safeStart.getTime());
  let sessionsCounted = 0;
  let maxLoop = 5000; // Safety guard

  while (sessionsCounted < totalStudySessionsNeeded && maxLoop > 0) {
    d.setDate(d.getDate() + 1);
    const dayName = JS_DAY_TO_SCHEDULE_DAY[d.getDay()];
    if (daySet.has(dayName)) {
      sessionsCounted++;
    }
    maxLoop--;
  }

  return d;
}

// Calculate the initial target deadline when a course is added or initial quota is set
export function computeInitialTargetDeadline(
  startDateStr: string | undefined,
  totalDurationSeconds: number,
  dailyQuotaMinutes: number = 60,
  schedule?: CourseStudySchedule
): { targetDateStr: string; totalDays: number } {
  const totalMins = Math.max(1, Math.round(totalDurationSeconds / 60));
  const safeQuota = Math.max(10, dailyQuotaMinutes);
  const totalSessions = Math.max(1, Math.ceil(totalMins / safeQuota));

  const startDate = startDateStr ? new Date(startDateStr) : new Date();
  const safeStartDate = isNaN(startDate.getTime()) ? new Date() : startDate;
  const targetDate = calculateScheduledTargetDate(safeStartDate, totalSessions, schedule);

  const totalCalendarDays = Math.max(1, getDaysDifference(targetDate, safeStartDate));

  return {
    targetDateStr: getISODateOnly(targetDate),
    totalDays: totalCalendarDays,
  };
}

// Default initial study goal for a course
export function createDefaultStudyGoal(
  course: Course,
  customQuotaMinutes: number = 60
): CourseStudyGoal {
  const startDateStr = course.createdAt ? getISODateOnly(new Date(course.createdAt)) : getISODateOnly();
  const { targetDateStr, totalDays } = computeInitialTargetDeadline(
    startDateStr,
    course.totalDurationSeconds || 3600,
    customQuotaMinutes,
    course.studySchedule
  );

  return {
    dailyQuotaMinutes: customQuotaMinutes,
    dailyQuotaHours: Math.round((customQuotaMinutes / 60) * 10) / 10,
    initialStartDate: startDateStr,
    initialTargetDeadline: targetDateStr,
    initialTotalDays: totalDays,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculates current deadline pacing, comparing dynamic projected completion
 * with the initial estimated target deadline date set at course start.
 * Fully schedule-aware: respects Custom Days, Daily, and No Schedule modes.
 */
export function calculateCourseDeadlinePacing(
  course: Course,
  remainingStats: CourseRemainingStats
): CourseDeadlinePacing {
  const schedule = course.studySchedule || course.studyGoal?.schedule;
  const hasActiveSchedule = schedule && schedule.mode !== 'none';
  const scheduleMode = schedule?.mode || 'none';

  const quotaMins = (hasActiveSchedule ? schedule.dailyGoalMinutes : course.studyGoal?.dailyQuotaMinutes) || 60;
  const quotaHours = Math.round((quotaMins / 60) * 10) / 10;
  
  // Initial target deadline
  let initialTargetDeadline = course.studyGoal?.initialTargetDeadline;
  let initialTotalDays = course.studyGoal?.initialTotalDays || 1;
  let initialStartDate = course.studyGoal?.initialStartDate;

  if (!initialTargetDeadline) {
    const defaultGoal = createDefaultStudyGoal(course, quotaMins);
    initialTargetDeadline = defaultGoal.initialTargetDeadline;
    initialTotalDays = defaultGoal.initialTotalDays;
    initialStartDate = defaultGoal.initialStartDate;
  }

  const today = new Date();
  const todayStr = getISODateOnly(today);

  const scheduleSummary = formatScheduleDaysSummary(schedule);
  const isScheduledToday = isCourseScheduledOnDate(schedule, today);
  const nextStudyDay = getNextScheduledStudyDay(schedule, today);
  const weeklyStats = getScheduleWeeklyStats(schedule);

  let scheduleStatusLabel: string | undefined = undefined;
  if (hasActiveSchedule) {
    if (isScheduledToday) {
      scheduleStatusLabel = 'Scheduled today';
    } else {
      scheduleStatusLabel = nextStudyDay ? `Next: ${nextStudyDay}` : 'Not scheduled today';
    }
  }

  // If completed:
  if (remainingStats.isCompleted) {
    const daysDiff = getDaysDifference(todayStr, initialTargetDeadline);
    const isEarly = daysDiff < 0;
    const isOnTime = daysDiff === 0;

    let status: CourseDeadlinePacing['status'] = isEarly
      ? 'completed_early'
      : isOnTime
      ? 'completed_on_time'
      : 'completed_late';

    return {
      status,
      daysDelta: daysDiff,
      initialTargetDeadline,
      initialTargetDeadlineFormatted: formatFriendlyDate(initialTargetDeadline),
      currentEstimatedDeadline: todayStr,
      currentEstimatedDeadlineFormatted: 'Completed Today',
      currentProjectedDeadlineFormatted: 'Completed Today',
      daysLeftCurrentPace: 0,
      initialTotalDays,
      dailyQuotaMinutes: quotaMins,
      dailyQuotaHours: quotaHours,
      hoursNeededDailyToHitInitialDeadline: 0,
      minutesNeededDailyToHitInitialDeadline: 0,
      pacingMessage: isEarly
        ? `🏆 Exceptional achievement! You completed this course ${Math.abs(daysDiff)} ${Math.abs(daysDiff) === 1 ? 'day' : 'days'} ahead of your initial target date (${formatFriendlyDate(initialTargetDeadline)}).`
        : isOnTime
        ? `🎯 Perfect timing! You met your target completion date (${formatFriendlyDate(initialTargetDeadline)}) with steady discipline.`
        : `🎉 Course Completed! You successfully finished all lessons.`,
      badgeText: isEarly ? `${Math.abs(daysDiff)}d Early!` : 'Completed!',
      praiseOrAlertLevel: isEarly ? 'praise' : 'success',
      isCompleted: true,
      studySchedule: schedule,
      isScheduledToday,
      scheduleSummary,
      scheduleStatusLabel: 'Completed',
      expectedWeeklyMinutes: weeklyStats.weeklyMinutes,
      expectedWeeklyHours: weeklyStats.weeklyHours,
    };
  }

  // Dynamic remaining sessions based on current unwatched remaining seconds and daily quota
  const remainingMins = Math.round(remainingStats.remainingSeconds / 60);
  const studySessionsNeeded = Math.max(1, Math.ceil(remainingMins / Math.max(10, quotaMins)));

  // Calculate dynamic projected finish date taking the custom schedule into account
  const currentEstimatedDeadlineDate = calculateScheduledTargetDate(today, studySessionsNeeded, schedule);
  const currentEstimatedDeadline = getISODateOnly(currentEstimatedDeadlineDate);
  const daysLeftCurrentPace = Math.max(1, getDaysDifference(currentEstimatedDeadline, todayStr));

  // Compare dynamic deadline with initial target deadline
  const daysDelta = getDaysDifference(currentEstimatedDeadline, initialTargetDeadline);

  // Calculate days remaining from today until initial target date
  const daysRemainingUntilInitialTarget = Math.max(0, getDaysDifference(initialTargetDeadline, todayStr));
  
  // Calculate catch-up pace needed if behind schedule
  let minutesNeededDaily = quotaMins;
  if (daysRemainingUntilInitialTarget > 0 && remainingMins > 0) {
    minutesNeededDaily = Math.ceil(remainingMins / daysRemainingUntilInitialTarget);
  } else if (daysRemainingUntilInitialTarget <= 0 && remainingMins > 0) {
    minutesNeededDaily = Math.min(240, remainingMins);
  }
  const hoursNeededDaily = Math.round((minutesNeededDaily / 60) * 10) / 10;

  let status: CourseDeadlinePacing['status'] = 'on_track';
  let praiseOrAlertLevel: CourseDeadlinePacing['praiseOrAlertLevel'] = 'neutral';
  let badgeText = 'On Track';
  let pacingMessage = '';

  // If the user has a custom schedule and today is NOT a scheduled study day,
  // do NOT show "missed" or "overdue" warnings
  if (daysDelta < 0) {
    status = 'ahead';
    praiseOrAlertLevel = 'praise';
    const daysAhead = Math.abs(daysDelta);
    badgeText = `${daysAhead}d Ahead`;
    pacingMessage = `🌟 Ahead of Schedule! At your pace (${quotaHours}h/study day), you're projected to finish on ${formatFriendlyDate(currentEstimatedDeadline)}, which is ${daysAhead} ${daysAhead === 1 ? 'day' : 'days'} early.`;
  } else if (daysDelta > 0) {
    // If not scheduled today, avoid aggressive alarming
    if (hasActiveSchedule && !isScheduledToday) {
      status = 'behind';
      praiseOrAlertLevel = 'neutral';
      const daysBehind = daysDelta;
      badgeText = `${daysBehind}d Behind`;
      pacingMessage = `📅 Scheduled on ${scheduleSummary}. Projected finish: ${formatFriendlyDate(currentEstimatedDeadline)}. Next study day: ${nextStudyDay || 'soon'}.`;
    } else {
      status = 'behind';
      praiseOrAlertLevel = daysDelta > 7 ? 'alert' : 'warning';
      const daysBehind = daysDelta;
      badgeText = `${daysBehind}d Behind`;
      if (daysRemainingUntilInitialTarget > 0) {
        pacingMessage = `⚠️ Pacing Alert: Projected finish is ${formatFriendlyDate(currentEstimatedDeadline)} (${daysBehind} ${daysBehind === 1 ? 'day' : 'days'} past target ${formatFriendlyDate(initialTargetDeadline)}).`;
      } else {
        pacingMessage = `⚠️ Target Date Passed: Projected finish is ${formatFriendlyDate(currentEstimatedDeadline)}.`;
      }
    }
  } else {
    status = 'on_track';
    praiseOrAlertLevel = 'neutral';
    badgeText = 'On Track';
    pacingMessage = hasActiveSchedule
      ? `🎯 On Track: Studying ${quotaHours}h per study day (${scheduleSummary}) will hit your target (${formatFriendlyDate(initialTargetDeadline)}).`
      : `🎯 On Track: Maintaining ${quotaHours}h/day will complete this course on your target date (${formatFriendlyDate(initialTargetDeadline)}).`;
  }

  return {
    status,
    daysDelta,
    initialTargetDeadline,
    initialTargetDeadlineFormatted: formatFriendlyDate(initialTargetDeadline),
    currentEstimatedDeadline,
    currentEstimatedDeadlineFormatted: formatFriendlyDate(currentEstimatedDeadline),
    currentProjectedDeadlineFormatted: formatFriendlyDate(currentEstimatedDeadline),
    daysLeftCurrentPace,
    initialTotalDays,
    dailyQuotaMinutes: quotaMins,
    dailyQuotaHours: quotaHours,
    hoursNeededDailyToHitInitialDeadline: hoursNeededDaily,
    minutesNeededDailyToHitInitialDeadline: minutesNeededDaily,
    pacingMessage,
    badgeText,
    praiseOrAlertLevel,
    isCompleted: false,
    studySchedule: schedule,
    isScheduledToday,
    scheduleSummary,
    scheduleStatusLabel,
    expectedWeeklyMinutes: weeklyStats.weeklyMinutes,
    expectedWeeklyHours: weeklyStats.weeklyHours,
  };
}

/**
 * Returns the Monday (at local midnight) of the calendar week containing the given date.
 * Week starts on Monday (Mon=1 ... Sun=0 in JS getDay).
 */
export function getMondayOfWeek(d: Date = new Date()): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayOfWeek = date.getDay(); // 0 is Sun, 1 is Mon, 2 is Tue, ... 6 is Sat
  const diffToMonday = (dayOfWeek + 6) % 7;
  date.setDate(date.getDate() - diffToMonday);
  return date;
}

export interface DayCadencePoint {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNum: number; // 24, 25, ...
  dayName: string; // 'M', 'T', 'W', 'T', 'F', 'S', 'S'
  fullDayName: string; // 'Mon', 'Tue', ...
  scheduleDay: ScheduleDay; // 'Mon' | 'Tue' ...
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isScheduled: boolean;
  targetMinutes: number;
  actualSeconds: number;
  actualMinutes: number;
  videoCount: number;
  videos: Array<{ title: string; courseTitle: string; duration: number }>;
  status:
    | 'completed'
    | 'partially_completed'
    | 'missed'
    | 'due_today'
    | 'upcoming'
    | 'extra_study'
    | 'not_scheduled';
  indicator: string; // '✓' | '◐' | '×' | '—' | '○' | '+'
  statusLabel: string;
  chartValue: number;
  targetChartValue: number;
}

export interface CadenceSummaryStats {
  scheduledDaysTotal: number;
  scheduledDaysOccurred: number;
  scheduledDaysCompleted: number;
  scheduledDaysPartial: number;
  scheduledDaysMissed: number;
  totalTargetMinutesOccurred: number;
  totalActualMinutesOccurred: number;
  totalActualMinutesInPeriod: number;
  totalExpectedMinutesInPeriod: number;
  adherencePercentage: number;
  hasSchedule: boolean;
  scheduleSummaryText: string | null;
  activeDaysCount: number;
}

/**
 * Generates properly calendar-aligned days for 1 or 2 full Monday-Sunday calendar weeks.
 */
export function generateCalendarCadenceDays(
  refMonday: Date,
  numberOfWeeks: 1 | 2,
  selectedCourse: Course | undefined,
  allCourses: Course[],
  dailyProgressMap: Record<
    string,
    {
      totalSeconds: number;
      videosCount: number;
      videos: Array<{ title: string; courseTitle: string; duration: number }>;
    }
  >,
  today: Date = new Date()
): { days: DayCadencePoint[]; summary: CadenceSummaryStats } {
  const todayStr = getISODateOnly(today);
  const totalDaysCount = numberOfWeeks * 7;

  // Determine schedule mode and settings
  const isAllCourses = !selectedCourse;
  const singleSchedule = selectedCourse?.studySchedule || selectedCourse?.studyGoal?.schedule;
  const singleHasSchedule = Boolean(singleSchedule && singleSchedule.mode !== 'none');

  // Multi-course schedule resolution
  let anyCourseHasSchedule = false;
  if (isAllCourses) {
    anyCourseHasSchedule = allCourses.some((c) => {
      const s = c.studySchedule || c.studyGoal?.schedule;
      return s && s.mode !== 'none';
    });
  }

  const hasSchedule = isAllCourses ? anyCourseHasSchedule : singleHasSchedule;

  const days: DayCadencePoint[] = [];

  for (let i = 0; i < totalDaysCount; i++) {
    const d = new Date(refMonday.getFullYear(), refMonday.getMonth(), refMonday.getDate() + i);
    const dateStr = getISODateOnly(d);
    const dayNum = d.getDate();
    const scheduleDay = JS_DAY_TO_SCHEDULE_DAY[d.getDay()];

    // Generate narrow & short weekday from the exact same Date object
    const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' }) || scheduleDay[0];
    const fullDayName = d.toLocaleDateString('en-US', { weekday: 'short' }) || scheduleDay;

    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    // Calculate schedule target for this specific day
    let isScheduled = false;
    let targetMinutes = 0;

    if (isAllCourses) {
      // Aggregate scheduled target from all active courses for this weekday
      allCourses.forEach((c) => {
        const s = c.studySchedule || c.studyGoal?.schedule;
        if (s && s.mode !== 'none') {
          if (isCourseScheduledOnDate(s, d)) {
            isScheduled = true;
            targetMinutes += s.dailyGoalMinutes || c.studyGoal?.dailyQuotaMinutes || 60;
          }
        }
      });
    } else if (singleHasSchedule) {
      isScheduled = isCourseScheduledOnDate(singleSchedule, d);
      if (isScheduled) {
        targetMinutes = singleSchedule?.dailyGoalMinutes || selectedCourse?.studyGoal?.dailyQuotaMinutes || 60;
      }
    }

    // Actual progress for this date
    const dayProgress = dailyProgressMap[dateStr];
    let actualSeconds = 0;
    let videoCount = 0;
    let videos: Array<{ title: string; courseTitle: string; duration: number }> = [];

    if (dayProgress) {
      if (isAllCourses) {
        actualSeconds = dayProgress.totalSeconds || 0;
        videoCount = dayProgress.videosCount || 0;
        videos = dayProgress.videos || [];
      } else {
        // Filter videos for the selected course
        const courseVideos = (dayProgress.videos || []).filter(
          (v) => v.courseTitle === selectedCourse?.title
        );
        videoCount = courseVideos.length;
        videos = courseVideos;
        // If course has videos, calculate filtered seconds or proportion
        if (courseVideos.length > 0) {
          actualSeconds = courseVideos.reduce((acc, v) => acc + (v.duration || 0), 0);
          if (actualSeconds === 0 && dayProgress.totalSeconds > 0) {
            actualSeconds = dayProgress.totalSeconds;
          }
        } else {
          actualSeconds = 0;
        }
      }
    }

    const actualMinutes = Math.round(actualSeconds / 60);

    // Determine status & indicators
    let status: DayCadencePoint['status'] = 'not_scheduled';
    let indicator = '—';
    let statusLabel = 'Not scheduled';

    if (!isScheduled) {
      if (actualMinutes > 0) {
        status = 'extra_study';
        indicator = '+';
        statusLabel = `Bonus study (${actualMinutes}m)`;
      } else {
        status = 'not_scheduled';
        indicator = '—';
        statusLabel = 'Not scheduled';
      }
    } else {
      // Day is scheduled
      if (actualMinutes >= targetMinutes && targetMinutes > 0) {
        status = 'completed';
        indicator = '✓';
        statusLabel = `Complete (${actualMinutes}/${targetMinutes}m)`;
      } else if (actualMinutes > 0 && actualMinutes < targetMinutes) {
        status = 'partially_completed';
        indicator = '◐';
        const rem = Math.max(1, targetMinutes - actualMinutes);
        statusLabel = `Incomplete (${rem}m remaining)`;
      } else {
        // 0 minutes watched on a scheduled day
        if (isPast) {
          status = 'missed';
          indicator = '×';
          statusLabel = `Missed (${targetMinutes}m target)`;
        } else if (isToday) {
          status = 'due_today';
          indicator = '○';
          statusLabel = `Due today (${targetMinutes}m goal)`;
        } else {
          status = 'upcoming';
          indicator = '○';
          statusLabel = `Scheduled (${targetMinutes}m)`;
        }
      }
    }

    // Chart representation values
    const chartValue = actualMinutes > 0 ? actualMinutes : 0;
    const targetChartValue = targetMinutes > 0 ? targetMinutes : 0;

    days.push({
      date: d,
      dateStr,
      dayNum,
      dayName,
      fullDayName,
      scheduleDay,
      isToday,
      isPast,
      isFuture,
      isScheduled,
      targetMinutes,
      actualSeconds,
      actualMinutes,
      videoCount,
      videos,
      status,
      indicator,
      statusLabel,
      chartValue,
      targetChartValue,
    });
  }

  // Calculate summary metrics
  let scheduledDaysTotal = 0;
  let scheduledDaysOccurred = 0;
  let scheduledDaysCompleted = 0;
  let scheduledDaysPartial = 0;
  let scheduledDaysMissed = 0;
  let totalTargetMinutesOccurred = 0;
  let totalActualMinutesOccurred = 0;
  let totalActualMinutesInPeriod = 0;
  let totalExpectedMinutesInPeriod = 0;
  let activeDaysCount = 0;

  days.forEach((day) => {
    if (day.actualMinutes > 0) {
      activeDaysCount++;
      totalActualMinutesInPeriod += day.actualMinutes;
    }

    if (day.isScheduled) {
      scheduledDaysTotal++;
      totalExpectedMinutesInPeriod += day.targetMinutes;

      // Only count days that have already occurred (or are today)
      if (day.isPast || day.isToday) {
        scheduledDaysOccurred++;
        totalTargetMinutesOccurred += day.targetMinutes;
        totalActualMinutesOccurred += Math.min(day.actualMinutes, day.targetMinutes);

        if (day.status === 'completed') {
          scheduledDaysCompleted++;
        } else if (day.status === 'partially_completed') {
          scheduledDaysPartial++;
        } else if (day.status === 'missed') {
          scheduledDaysMissed++;
        }
      }
    }
  });

  // Calculate adherence percentage
  let adherencePercentage = 100;
  if (scheduledDaysOccurred > 0) {
    if (totalTargetMinutesOccurred > 0) {
      const minutesRatio = Math.min(1, totalActualMinutesOccurred / totalTargetMinutesOccurred);
      const daysRatio = scheduledDaysCompleted / scheduledDaysOccurred;
      // Adherence: (Completed Scheduled Days / Scheduled Days Occurred) weighted with minute completion
      adherencePercentage = Math.round(((daysRatio * 0.7 + minutesRatio * 0.3) * 100) * 10) / 10;
    } else {
      adherencePercentage = Math.round((scheduledDaysCompleted / scheduledDaysOccurred) * 100);
    }
  } else if (!hasSchedule) {
    adherencePercentage = 100;
  }

  // Schedule summary text
  let scheduleSummaryText: string | null = null;
  if (isAllCourses) {
    const scheduledCourses = allCourses.filter((c) => {
      const s = c.studySchedule || c.studyGoal?.schedule;
      return s && s.mode !== 'none';
    });
    if (scheduledCourses.length > 0) {
      scheduleSummaryText = `${scheduledCourses.length} of ${allCourses.length} courses scheduled`;
    }
  } else {
    scheduleSummaryText = formatScheduleDaysSummary(singleSchedule);
  }

  return {
    days,
    summary: {
      scheduledDaysTotal,
      scheduledDaysOccurred,
      scheduledDaysCompleted,
      scheduledDaysPartial,
      scheduledDaysMissed,
      totalTargetMinutesOccurred,
      totalActualMinutesOccurred,
      totalActualMinutesInPeriod,
      totalExpectedMinutesInPeriod,
      adherencePercentage,
      hasSchedule,
      scheduleSummaryText,
      activeDaysCount,
    },
  };
}

export interface TodayGoalStats {
  mode: 'scheduled' | 'no_scheduled_study' | 'self_paced';
  targetMinutes: number;
  actualMinutes: number;
  scheduledCoursesCount: number;
  totalCoursesCount: number;
  label: string; // e.g. "45 / 60 min", "Self-paced", "No scheduled study"
  subtext: string; // e.g. "15m remaining", "Goal accomplished!", "Flexible study", "Off-schedule day"
  isCompleted: boolean;
  percentage: number;
}

/**
 * Computes today's dynamic study goal metric across enrolled courses.
 */
export function getTodayStudyGoalStats(
  courses: Course[],
  dailyProgressMap: Record<
    string,
    {
      totalSeconds: number;
      videosCount: number;
      videos?: Array<{ title: string; courseTitle: string; duration: number }>;
    }
  >,
  today: Date = new Date(),
  selectedCourseId?: string
): TodayGoalStats {
  const todayStr = getISODateOnly(today);
  const dayProgress = dailyProgressMap[todayStr];

  if (!courses || courses.length === 0) {
    const actualSeconds = dayProgress?.totalSeconds || 0;
    const actualMinutes = Math.round(actualSeconds / 60);
    return {
      mode: 'self_paced',
      targetMinutes: 0,
      actualMinutes,
      scheduledCoursesCount: 0,
      totalCoursesCount: 0,
      label: 'Self-paced',
      subtext: actualMinutes > 0 ? `${actualMinutes} min studied today` : 'Flexible study',
      isCompleted: false,
      percentage: 0,
    };
  }

  // Filtered to a specific course
  if (selectedCourseId && selectedCourseId !== 'all') {
    const course = courses.find((c) => c.id === selectedCourseId);
    if (!course) {
      return {
        mode: 'self_paced',
        targetMinutes: 0,
        actualMinutes: 0,
        scheduledCoursesCount: 0,
        totalCoursesCount: courses.length,
        label: 'Self-paced',
        subtext: 'Flexible study',
        isCompleted: false,
        percentage: 0,
      };
    }

    // Filter actual seconds for this course
    let actualSeconds = 0;
    if (dayProgress) {
      const courseVideos = (dayProgress.videos || []).filter((v) => v.courseTitle === course.title);
      if (courseVideos.length > 0) {
        actualSeconds = courseVideos.reduce((acc, v) => acc + (v.duration || 0), 0);
      } else if (dayProgress.totalSeconds > 0) {
        actualSeconds = dayProgress.totalSeconds;
      }
    }
    const actualMinutes = Math.round(actualSeconds / 60);

    const schedule = course.studySchedule || course.studyGoal?.schedule;
    const isSelfPaced = !schedule || schedule.mode === 'none' || (schedule.mode as string) === 'self-paced';

    if (isSelfPaced) {
      return {
        mode: 'self_paced',
        targetMinutes: 0,
        actualMinutes,
        scheduledCoursesCount: 0,
        totalCoursesCount: 1,
        label: 'Self-paced',
        subtext: actualMinutes > 0 ? `${actualMinutes} min studied today` : 'Flexible study',
        isCompleted: false,
        percentage: 0,
      };
    }

    const isScheduledToday = isCourseScheduledOnDate(schedule, today);
    const targetMins = schedule?.dailyGoalMinutes || course.studyGoal?.dailyQuotaMinutes || 60;

    if (!isScheduledToday) {
      return {
        mode: 'no_scheduled_study',
        targetMinutes: 0,
        actualMinutes,
        scheduledCoursesCount: 0,
        totalCoursesCount: 1,
        label: 'No scheduled study',
        subtext: actualMinutes > 0 ? `Bonus: ${actualMinutes}m studied` : 'Off-schedule today',
        isCompleted: false,
        percentage: 0,
      };
    }

    const isCompleted = actualMinutes >= targetMins;
    const pct = Math.min(100, Math.round((actualMinutes / targetMins) * 100));

    return {
      mode: 'scheduled',
      targetMinutes: targetMins,
      actualMinutes,
      scheduledCoursesCount: 1,
      totalCoursesCount: 1,
      label: `${actualMinutes} / ${targetMins} min`,
      subtext: isCompleted ? "Today's goal completed!" : `${Math.max(1, targetMins - actualMinutes)} min remaining`,
      isCompleted,
      percentage: pct,
    };
  }

  // All Courses view
  const actualSeconds = dayProgress?.totalSeconds || 0;
  const actualMinutes = Math.round(actualSeconds / 60);

  let scheduledCoursesTodayCount = 0;
  let totalScheduledCoursesCount = 0;
  let totalTargetMinutes = 0;

  courses.forEach((c) => {
    const s = c.studySchedule || c.studyGoal?.schedule;
    const isScheduled = s && s.mode !== 'none' && (s.mode as string) !== 'self-paced';
    if (isScheduled) {
      totalScheduledCoursesCount++;
      if (isCourseScheduledOnDate(s, today)) {
        scheduledCoursesTodayCount++;
        totalTargetMinutes += s.dailyGoalMinutes || c.studyGoal?.dailyQuotaMinutes || 60;
      }
    }
  });

  if (totalScheduledCoursesCount === 0) {
    // All courses are self-paced
    return {
      mode: 'self_paced',
      targetMinutes: 0,
      actualMinutes,
      scheduledCoursesCount: 0,
      totalCoursesCount: courses.length,
      label: 'Self-paced',
      subtext: actualMinutes > 0 ? `${actualMinutes} min studied today` : 'Flexible study',
      isCompleted: false,
      percentage: 0,
    };
  }

  if (scheduledCoursesTodayCount === 0) {
    // There are scheduled courses, but none are scheduled for today
    return {
      mode: 'no_scheduled_study',
      targetMinutes: 0,
      actualMinutes,
      scheduledCoursesCount: 0,
      totalCoursesCount: courses.length,
      label: 'No scheduled study',
      subtext: actualMinutes > 0 ? `Bonus: ${actualMinutes}m studied` : 'No scheduled study today',
      isCompleted: false,
      percentage: 0,
    };
  }

  const isCompleted = actualMinutes >= totalTargetMinutes;
  const pct = Math.min(100, Math.round((actualMinutes / totalTargetMinutes) * 100));

  return {
    mode: 'scheduled',
    targetMinutes: totalTargetMinutes,
    actualMinutes,
    scheduledCoursesCount: scheduledCoursesTodayCount,
    totalCoursesCount: courses.length,
    label: `${actualMinutes} / ${totalTargetMinutes} min`,
    subtext: isCompleted ? "Today's goal completed!" : `${Math.max(1, totalTargetMinutes - actualMinutes)} min remaining`,
    isCompleted,
    percentage: pct,
  };
}


