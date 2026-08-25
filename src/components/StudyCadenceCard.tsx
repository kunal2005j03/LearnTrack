import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLearnTrack } from '../context/LearnTrackContext';
import { Course, VideoProgress } from '../types';
import {
  getMondayOfWeek,
  generateCalendarCadenceDays,
  DayCadencePoint,
  formatScheduleDaysSummary,
  getISODateOnly,
} from '../utils/studyPlanner';
import {
  formatTotalWatchTime,
  formatSeconds,
  getLocalDateString,
} from '../utils/formatters';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flame,
  Award,
  AlertCircle,
  Play,
  X,
  Target,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

export const StudyCadenceCard: React.FC = () => {
  const {
    courses,
    progressMap,
    stats,
    continueLearningVideo,
    openVideo,
    cachedVideos,
  } = useLearnTrack();

  const [rangeMode, setRangeMode] = useState<7 | 14>(7);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Week offset state: 0 = current calendar week, -1 = previous calendar week, +1 = next calendar week
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Selected day for detail popover/bottom sheet
  const [selectedDayPoint, setSelectedDayPoint] = useState<DayCadencePoint | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCourseDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Map progress items to specific dates
  const dailyProgressMap = useMemo(() => {
    const map: Record<
      string,
      {
        totalSeconds: number;
        videosCount: number;
        videos: Array<{ title: string; courseTitle: string; duration: number }>;
      }
    > = {};

    (Object.values(progressMap) as VideoProgress[]).forEach((p) => {
      if (p.lastWatchedAt && (p.watchedSeconds > 0 || p.completed)) {
        let dateStr = '';
        try {
          const d = new Date(p.lastWatchedAt);
          dateStr = !isNaN(d.getTime()) ? getLocalDateString(d) : p.lastWatchedAt.substring(0, 10);
        } catch {
          dateStr = p.lastWatchedAt.substring(0, 10);
        }

        if (dateStr) {
          if (!map[dateStr]) {
            map[dateStr] = { totalSeconds: 0, videosCount: 0, videos: [] };
          }
          map[dateStr].totalSeconds += p.watchedSeconds || 0;
          map[dateStr].videosCount += 1;
          map[dateStr].videos.push({
            title: p.videoTitle || 'Educational Lesson',
            courseTitle: p.courseTitle || 'Course',
            duration: p.watchedSeconds || 0,
          });
        }
      }
    });

    return map;
  }, [progressMap]);

  // Find currently selected course object (if not 'all')
  const selectedCourse = useMemo(() => {
    if (selectedCourseId === 'all') return undefined;
    return courses.find((c) => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  // Compute Monday of the displayed window
  const refMonday = useMemo(() => {
    const currentMonday = getMondayOfWeek(new Date());
    const targetMonday = new Date(
      currentMonday.getFullYear(),
      currentMonday.getMonth(),
      currentMonday.getDate() + weekOffset * 7
    );
    // If rangeMode is 14 and we are on 2-week view, start 1 week earlier so current week is the 2nd week
    if (rangeMode === 14) {
      return new Date(
        targetMonday.getFullYear(),
        targetMonday.getMonth(),
        targetMonday.getDate() - 7
      );
    }
    return targetMonday;
  }, [weekOffset, rangeMode]);

  const numberOfWeeks = rangeMode === 14 ? 2 : 1;

  // Generate calendar days with schedule calculations
  const { days: cadenceDays, summary } = useMemo(() => {
    return generateCalendarCadenceDays(
      refMonday,
      numberOfWeeks,
      selectedCourse,
      courses,
      dailyProgressMap,
      new Date()
    );
  }, [refMonday, numberOfWeeks, selectedCourse, courses, dailyProgressMap]);

  // Active schedule string for display
  const activeScheduleLabel = useMemo(() => {
    if (selectedCourse) {
      const s = selectedCourse.studySchedule || selectedCourse.studyGoal?.schedule;
      if (!s || s.mode === 'none') return 'Self-paced (No schedule)';
      const daysText = formatScheduleDaysSummary(s);
      const mins = s.dailyGoalMinutes || selectedCourse.studyGoal?.dailyQuotaMinutes || 60;
      return `${daysText || 'Daily'} (${mins}m/session)`;
    }
    // All Courses
    const scheduledCourses = courses.filter((c) => {
      const s = c.studySchedule || c.studyGoal?.schedule;
      return s && s.mode !== 'none';
    });
    if (scheduledCourses.length === 0) return 'Self-paced';
    if (scheduledCourses.length === courses.length && courses.length === 1) {
      return formatScheduleDaysSummary(
        courses[0].studySchedule || courses[0].studyGoal?.schedule
      );
    }
    return `${scheduledCourses.length} of ${courses.length} courses scheduled`;
  }, [selectedCourse, courses]);

  // Format date range text for header (e.g. "Aug 24 – Aug 30, 2026")
  const dateRangeLabel = useMemo(() => {
    if (cadenceDays.length === 0) return '';
    const first = cadenceDays[0].date;
    const last = cadenceDays[cadenceDays.length - 1].date;

    const firstMonth = first.toLocaleDateString(undefined, { month: 'short' });
    const lastMonth = last.toLocaleDateString(undefined, { month: 'short' });
    const firstDay = first.getDate();
    const lastDay = last.getDate();
    const year = last.getFullYear();

    if (firstMonth === lastMonth) {
      return `${firstMonth} ${firstDay} – ${lastDay}, ${year}`;
    }
    return `${firstMonth} ${firstDay} – ${lastMonth} ${lastDay}, ${year}`;
  }, [cadenceDays]);

  // Maximum minutes for chart scale
  const maxChartValue = useMemo(() => {
    let max = 60;
    cadenceDays.forEach((d) => {
      if (d.actualMinutes > max) max = d.actualMinutes;
      if (d.targetMinutes > max) max = d.targetMinutes;
    });
    return Math.ceil(max / 15) * 15;
  }, [cadenceDays]);

  // Handle Quick Play
  const handlePlayNext = () => {
    if (continueLearningVideo) {
      openVideo(continueLearningVideo.course.id, continueLearningVideo.video.id);
      return;
    }
    if (courses.length > 0) {
      const firstCourse = selectedCourse || courses[0];
      const vids = cachedVideos[firstCourse.id];
      if (vids && vids.length > 0) {
        openVideo(firstCourse.id, vids[0].id);
      }
    }
  };

  return (
    <div
      id="study-cadence-card"
      className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-5 sm:p-6 space-y-4 shadow-sm relative transition-all duration-300"
    >
      {/* 1. Header with Course Selector, Range Toggle & Active Schedule */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-1 border-b border-[var(--border)]/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-[var(--ink)]">
                  Study Cadence & Activity
                </h4>
                <span className="text-[10px] uppercase font-semibold text-[var(--ink-faint)] bg-[var(--surface-high)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                  Course-specific study schedule & activity
                </span>
              </div>
              <p className="text-[11px] text-[var(--ink-faint)] mt-0.5">
                Schedule: <span className="font-semibold text-[var(--accent)]">{activeScheduleLabel}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Course Dropdown & 7/14 Days Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Compact Course Selector - only show if multiple courses exist */}
          {courses.length > 1 && (
            <div className="relative" ref={dropdownRef}>
              <button
                id="cadence-course-selector-btn"
                onClick={() => setIsCourseDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[var(--ink)] border border-[var(--border)] transition shadow-2xs cursor-pointer max-w-[190px]"
                title="Select course schedule"
              >
                <span className="truncate">
                  {selectedCourse ? selectedCourse.title : 'All Courses'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-faint)] shrink-0" />
              </button>

              {/* Course Selector Dropdown Menu */}
              {isCourseDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-[var(--surface-mid)] border border-[var(--border)] rounded-2xl shadow-xl z-30 py-1 overflow-hidden animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[var(--ink-faint)] tracking-wider border-b border-[var(--border)]/50">
                    Select Course Schedule
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCourseId('all');
                      setIsCourseDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[var(--surface-high)] transition ${
                      selectedCourseId === 'all'
                        ? 'font-bold text-[var(--accent)] bg-[var(--accent)]/10'
                        : 'text-[var(--ink)]'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">All Courses</span>
                      <p className="text-[10px] text-[var(--ink-faint)]">Combined schedule & activity</p>
                    </div>
                    {selectedCourseId === 'all' && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" />}
                  </button>

                  <div className="max-h-48 overflow-y-auto divide-y divide-[var(--border)]/30">
                    {courses.map((c) => {
                      const sched = c.studySchedule || c.studyGoal?.schedule;
                      const schedText = formatScheduleDaysSummary(sched);
                      const isSelected = selectedCourseId === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCourseId(c.id);
                            setIsCourseDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-high)] transition ${
                            isSelected
                              ? 'font-bold text-[var(--accent)] bg-[var(--accent)]/10'
                              : 'text-[var(--ink)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{c.title}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
                          </div>
                          <div className="text-[10px] text-[var(--ink-faint)]">
                            {schedText} {sched && sched.mode !== 'none' && sched.mode !== 'self-paced' ? `· ${sched.dailyGoalMinutes || 60}m` : ''}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7 Days / 14 Days Toggle */}
          <div className="flex items-center bg-[var(--surface-high)] rounded-xl p-0.5 border border-[var(--border)]">
            <button
              onClick={() => setRangeMode(7)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                rangeMode === 7
                  ? 'bg-[var(--ink)] text-[var(--bg)] shadow-sm'
                  : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setRangeMode(14)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                rangeMode === 14
                  ? 'bg-[var(--ink)] text-[var(--bg)] shadow-sm'
                  : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'
              }`}
            >
              14 Days
            </button>
          </div>
        </div>
      </div>

      {/* 2. Compact Weekly Summary & Schedule Adherence Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--surface-high)]/60 border border-[var(--border)]">
        {/* Navigation Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="p-1 rounded-lg hover:bg-[var(--surface-mid)] text-[var(--ink-dim)] hover:text-[var(--ink)] transition cursor-pointer"
            title="Previous week"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-[var(--ink)] px-1">
            {dateRangeLabel}
          </span>
          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="p-1 rounded-lg hover:bg-[var(--surface-mid)] text-[var(--ink-dim)] hover:text-[var(--ink)] transition cursor-pointer"
            title="Next week"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition cursor-pointer"
            >
              Current Week
            </button>
          )}
        </div>

        {/* Adherence & Progress Stats */}
        <div className="flex items-center gap-3 text-xs">
          {summary.hasSchedule && summary.scheduledDaysOccurred > 0 ? (
            <>
              <div className="text-right">
                <div className="font-bold text-[var(--ink)]">
                  {summary.scheduledDaysCompleted} / {summary.scheduledDaysOccurred} scheduled days
                </div>
                <div className="text-[10px] text-[var(--ink-faint)]">
                  {summary.totalActualMinutesInPeriod} / {summary.totalTargetMinutesOccurred} min
                </div>
              </div>
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                  summary.adherencePercentage >= 100
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : summary.adherencePercentage >= 70
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                }`}
              >
                {summary.adherencePercentage}% adherence
              </div>
            </>
          ) : (
            <div className="text-right">
              <span className="font-bold text-[var(--ink)]">
                {summary.totalActualMinutesInPeriod} min studied
              </span>
              <span className="text-[10px] text-[var(--ink-faint)] ml-1.5">
                ({summary.activeDaysCount} active days)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Day-by-Day Calendar Chips Row (Monday -> Sunday Calendar Aligned) */}
      <div className="space-y-2">
        {rangeMode === 14 && (
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
            Week 1
          </div>
        )}

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {cadenceDays.slice(0, 7).map((day, idx) => (
            <button
              key={`w1-${idx}`}
              onClick={() => setSelectedDayPoint(day)}
              className={`flex flex-col items-center justify-between p-2 rounded-2xl border text-center transition-all cursor-pointer select-none relative ${
                day.isToday
                  ? 'ring-2 ring-[var(--accent)] border-[var(--accent)] shadow-md bg-[var(--surface-high)]'
                  : selectedDayPoint?.dateStr === day.dateStr
                  ? 'border-[var(--accent)] bg-[var(--surface-high)]'
                  : day.status === 'completed'
                  ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
                  : day.status === 'partially_completed'
                  ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
                  : day.status === 'missed'
                  ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50'
                  : day.status === 'extra_study'
                  ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30'
                  : day.isScheduled
                  ? 'bg-[var(--surface-high)]/70 border-indigo-500/30'
                  : 'bg-[var(--surface-high)]/30 border-[var(--border)] opacity-60 hover:opacity-100'
              }`}
              title={`${day.fullDayName}, ${day.dateStr}: ${day.statusLabel}`}
            >
              {/* Day initial */}
              <span className="text-[10px] font-bold text-[var(--ink-faint)]">
                {day.dayName}
              </span>

              {/* Day Number */}
              <span
                className={`text-xs sm:text-sm font-extrabold my-0.5 ${
                  day.isToday
                    ? 'text-[var(--accent)]'
                    : day.status === 'completed'
                    ? 'text-emerald-400'
                    : 'text-[var(--ink)]'
                }`}
              >
                {day.dayNum}
              </span>

              {/* Status Indicator Icon / Glyph */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                  day.status === 'completed'
                    ? 'text-emerald-400 bg-emerald-500/20'
                    : day.status === 'partially_completed'
                    ? 'text-amber-400 bg-amber-500/20'
                    : day.status === 'missed'
                    ? 'text-rose-400 bg-rose-500/20'
                    : day.status === 'extra_study'
                    ? 'text-[var(--accent)] bg-[var(--accent)]/20'
                    : day.isScheduled
                    ? 'text-indigo-300 border border-dashed border-indigo-400/50 text-[9px]'
                    : 'text-[var(--ink-faint)]'
                }`}
              >
                {day.indicator}
              </div>
            </button>
          ))}
        </div>

        {/* Second week for 14-day view */}
        {rangeMode === 14 && (
          <div className="pt-2 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
              Week 2
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {cadenceDays.slice(7, 14).map((day, idx) => (
                <button
                  key={`w2-${idx}`}
                  onClick={() => setSelectedDayPoint(day)}
                  className={`flex flex-col items-center justify-between p-2 rounded-2xl border text-center transition-all cursor-pointer select-none relative ${
                    day.isToday
                      ? 'ring-2 ring-[var(--accent)] border-[var(--accent)] shadow-md bg-[var(--surface-high)]'
                      : selectedDayPoint?.dateStr === day.dateStr
                      ? 'border-[var(--accent)] bg-[var(--surface-high)]'
                      : day.status === 'completed'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : day.status === 'partially_completed'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : day.status === 'missed'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : day.status === 'extra_study'
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30'
                      : day.isScheduled
                      ? 'bg-[var(--surface-high)]/70 border-indigo-500/30'
                      : 'bg-[var(--surface-high)]/30 border-[var(--border)] opacity-60 hover:opacity-100'
                  }`}
                  title={`${day.fullDayName}, ${day.dateStr}: ${day.statusLabel}`}
                >
                  <span className="text-[10px] font-bold text-[var(--ink-faint)]">
                    {day.dayName}
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-extrabold my-0.5 ${
                      day.isToday
                        ? 'text-[var(--accent)]'
                        : day.status === 'completed'
                        ? 'text-emerald-400'
                        : 'text-[var(--ink)]'
                    }`}
                  >
                    {day.dayNum}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                      day.status === 'completed'
                        ? 'text-emerald-400 bg-emerald-500/20'
                        : day.status === 'partially_completed'
                        ? 'text-amber-400 bg-amber-500/20'
                        : day.status === 'missed'
                        ? 'text-rose-400 bg-rose-500/20'
                        : day.status === 'extra_study'
                        ? 'text-[var(--accent)] bg-[var(--accent)]/20'
                        : day.isScheduled
                        ? 'text-indigo-300 border border-dashed border-indigo-400/50 text-[9px]'
                        : 'text-[var(--ink-faint)]'
                    }`}
                  >
                    {day.indicator}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Target vs Actual Daily Activity Graph */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-[11px] text-[var(--ink-faint)] mb-2">
          <div className="flex items-center gap-2">
            <span>Daily study minutes</span>
            {summary.hasSchedule && (
              <span className="flex items-center gap-1 text-[10px] text-indigo-400">
                <Target className="w-3 h-3" /> Target vs Actual
              </span>
            )}
          </div>
          <span>{rangeMode} day calendar view</span>
        </div>

        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cadenceDays} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="fullDayName"
                stroke="var(--ink-faint)"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data: DayCadencePoint = payload[0].payload;
                    return (
                      <div className="bg-[var(--surface-mid)] border border-[var(--border)] p-3 rounded-2xl shadow-xl text-xs space-y-1.5 max-w-[240px]">
                        <div className="font-bold text-[var(--ink)] flex items-center justify-between gap-2 border-b border-[var(--border)] pb-1">
                          <span>
                            {data.fullDayName}, {data.dayNum}{' '}
                            {data.date.toLocaleDateString(undefined, { month: 'short' })}
                          </span>
                          {data.isToday && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 pt-0.5">
                          {data.isScheduled ? (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[var(--ink-faint)]">Target:</span>
                              <span className="font-bold text-indigo-400">
                                {data.targetMinutes} min
                              </span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-[var(--ink-faint)] italic">
                              Not a scheduled study day
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[var(--ink-faint)]">Actual Study:</span>
                            <span
                              className={`font-bold ${
                                data.actualMinutes > 0 ? 'text-emerald-400' : 'text-[var(--ink)]'
                              }`}
                            >
                              {data.actualMinutes} min
                            </span>
                          </div>

                          {data.isScheduled && data.actualMinutes < data.targetMinutes && (
                            <div className="flex items-center justify-between text-[11px] text-amber-400">
                              <span>Remaining:</span>
                              <span className="font-semibold">
                                {Math.max(0, data.targetMinutes - data.actualMinutes)} min
                              </span>
                            </div>
                          )}

                          <div className="pt-1 text-[10px] font-semibold text-[var(--ink-dim)]">
                            Status: <span className="text-[var(--ink)]">{data.statusLabel}</span>
                          </div>

                          {data.videos && data.videos.length > 0 && (
                            <div className="pt-1 border-t border-[var(--border)] text-[10px] text-[var(--ink-dim)] truncate">
                              Watched: {data.videos[0].title}
                              {data.videos.length > 1 && ` (+${data.videos.length - 1} more)`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="chartValue" radius={[6, 6, 0, 0]}>
                {cadenceDays.map((entry, idx) => {
                  let fill = 'var(--surface-high)';
                  if (entry.status === 'completed') fill = '#10B981'; // Emerald
                  else if (entry.status === 'partially_completed') fill = '#F59E0B'; // Amber
                  else if (entry.status === 'extra_study') fill = 'var(--accent)';
                  else if (entry.isToday && entry.actualMinutes > 0) fill = '#F59E0B';
                  else if (entry.isScheduled) fill = 'rgba(129, 140, 248, 0.4)'; // Subtle indigo outline/pillar

                  return (
                    <Cell
                      key={`bar-${idx}`}
                      fill={fill}
                      opacity={entry.actualMinutes > 0 ? 1 : 0.4}
                      className="cursor-pointer"
                      onClick={() => setSelectedDayPoint(entry)}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Day Detail Popover / Bottom Sheet Modal */}
      {selectedDayPoint && (
        <div
          id="cadence-day-detail-modal"
          className="p-4 rounded-2xl bg-[var(--surface-mid)] border border-[var(--border)] shadow-md space-y-3 animate-fadeIn relative"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] font-bold text-xs">
                {selectedDayPoint.dayName}
              </div>
              <div>
                <h5 className="text-xs font-bold text-[var(--ink)]">
                  {selectedDayPoint.fullDayName},{' '}
                  {selectedDayPoint.date.toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h5>
                <p className="text-[11px] text-[var(--ink-faint)]">
                  {selectedDayPoint.isScheduled
                    ? `Scheduled study day (${selectedDayPoint.targetMinutes}m goal)`
                    : 'Not scheduled'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedDayPoint(null)}
              className="p-1 rounded-lg hover:bg-[var(--surface-high)] text-[var(--ink-faint)] hover:text-[var(--ink)] transition cursor-pointer"
              title="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-[var(--surface-low)] border border-[var(--border)]">
              <div className="text-[10px] text-[var(--ink-faint)] uppercase font-semibold">
                Scheduled
              </div>
              <div className="text-xs font-bold text-[var(--ink)]">
                {selectedDayPoint.isScheduled ? `${selectedDayPoint.targetMinutes} min` : '—'}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[var(--surface-low)] border border-[var(--border)]">
              <div className="text-[10px] text-[var(--ink-faint)] uppercase font-semibold">
                Actual
              </div>
              <div className={`text-xs font-bold ${selectedDayPoint.actualMinutes > 0 ? 'text-emerald-400' : 'text-[var(--ink-dim)]'}`}>
                {selectedDayPoint.actualMinutes} min
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[var(--surface-low)] border border-[var(--border)]">
              <div className="text-[10px] text-[var(--ink-faint)] uppercase font-semibold">
                Status
              </div>
              <div
                className={`text-xs font-bold ${
                  !selectedDayPoint.isScheduled
                    ? selectedDayPoint.actualMinutes > 0
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--ink-dim)]'
                    : selectedDayPoint.status === 'completed'
                    ? 'text-emerald-400'
                    : selectedDayPoint.status === 'partially_completed'
                    ? 'text-amber-400'
                    : selectedDayPoint.status === 'missed'
                    ? 'text-rose-400'
                    : selectedDayPoint.status === 'due_today'
                    ? 'text-amber-400'
                    : 'text-[var(--ink-dim)]'
                }`}
              >
                {!selectedDayPoint.isScheduled
                  ? selectedDayPoint.actualMinutes > 0
                    ? 'Bonus Study'
                    : 'Not scheduled'
                  : selectedDayPoint.status === 'completed'
                  ? 'Completed'
                  : selectedDayPoint.status === 'partially_completed'
                  ? 'Incomplete'
                  : selectedDayPoint.status === 'missed'
                  ? 'Missed'
                  : selectedDayPoint.status === 'due_today'
                  ? 'Due Today'
                  : 'Scheduled'}
              </div>
            </div>
          </div>

          {/* Lessons list for this day */}
          {selectedDayPoint.videos && selectedDayPoint.videos.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-semibold text-[var(--ink-dim)] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                Lessons Watched ({selectedDayPoint.videos.length}):
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedDayPoint.videos.map((vid, vIdx) => (
                  <div
                    key={vIdx}
                    className="p-2 rounded-lg bg-[var(--surface-low)] border border-[var(--border)]/60 text-xs flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-[var(--ink)]">{vid.title}</span>
                    <span className="text-[10px] text-[var(--ink-faint)] shrink-0 font-mono">
                      {formatSeconds(vid.duration)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-[var(--ink-faint)] italic pt-1">
              {selectedDayPoint.isScheduled
                ? selectedDayPoint.status === 'missed'
                  ? 'No lessons were logged on this scheduled study day.'
                  : selectedDayPoint.status === 'due_today'
                  ? `Ready to study! Complete ${selectedDayPoint.targetMinutes} min today to meet your target.`
                  : selectedDayPoint.status === 'completed'
                  ? 'Goal completed for this study day.'
                  : 'Upcoming scheduled study session.'
                : 'No lessons were logged on this day.'}
            </div>
          )}

          {/* Call to action - ONLY for scheduled study days that are today and not completed */}
          {selectedDayPoint.isToday && selectedDayPoint.isScheduled && selectedDayPoint.status !== 'completed' && (
            <div className="pt-1 flex justify-end">
              <button
                onClick={handlePlayNext}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--ink)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                Study Now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
