import React, { useState, useEffect, useMemo } from 'react';
import { Course, CourseStudySchedule, ScheduleDay, ScheduleMode } from '../types';
import { useProgressMap, useStats, useContinueLearningVideo } from '../hooks/useProgress';
import { useLearnTrack } from '../context/LearnTrackContext';
import {
  ALL_SCHEDULE_DAYS,
  formatFriendlyDate,
  formatScheduleDaysSummary,
  calculateScheduledTargetDate,
  getScheduleWeeklyStats } from '../utils/studyPlanner';
import { getCourseRemainingTimeStats } from '../utils/formatters';
import {
  Calendar,
  Clock,
  Check,
  X,
  Sparkles,
  Info,
  CalendarDays,
  Flame,
  CheckCircle2 } from 'lucide-react';

interface StudyScheduleModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_GOALS = [
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hr', minutes: 60 },
  { label: '1.5 hr', minutes: 90 },
  { label: '2 hr', minutes: 120 },
];

export const StudyScheduleModal: React.FC<StudyScheduleModalProps> = ({
  course,
  isOpen,
  onClose }) => {
  const { updateCourseStudySchedule, cachedVideos } = useLearnTrack();
  const progressMap = useProgressMap();

  const [mode, setMode] = useState<ScheduleMode>('custom');
  const [selectedDays, setSelectedDays] = useState<ScheduleDay[]>(['Sat', 'Sun']);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(60);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reset when modal opens or course changes
  useEffect(() => {
    if (!isOpen || !course) return;

    const existingSchedule = course.studySchedule || course.studyGoal?.schedule;
    if (existingSchedule) {
      setMode(existingSchedule.mode);
      setSelectedDays(
        existingSchedule.customDays && existingSchedule.customDays.length > 0
          ? existingSchedule.customDays
          : ['Sat', 'Sun']
      );
      setDailyGoalMinutes(existingSchedule.dailyGoalMinutes || course.studyGoal?.dailyQuotaMinutes || 60);
    } else {
      // Default: Custom weekend schedule or daily
      setMode('custom');
      setSelectedDays(['Sat', 'Sun']);
      setDailyGoalMinutes(course.studyGoal?.dailyQuotaMinutes || 60);
    }
  }, [isOpen, course]);

  // Compute remaining for this course
  const remainingStats = useMemo(() => {
    if (!course) return null;
    return getCourseRemainingTimeStats(course, cachedVideos[course.id], progressMap);
  }, [course, cachedVideos, progressMap]);

  // Temporary schedule state for live simulation
  const tempSchedule: CourseStudySchedule = useMemo(() => {
    return {
      mode,
      customDays: selectedDays,
      dailyGoalMinutes };
  }, [mode, selectedDays, dailyGoalMinutes]);

  // Dynamic projected deadline simulation
  const projectedFinish = useMemo(() => {
    if (!remainingStats) return { formatted: 'TBD', totalDays: 0 };
    const remainingMins = Math.max(1, Math.round(remainingStats.remainingSeconds / 60));
    const safeGoal = Math.max(10, dailyGoalMinutes);
    const sessionsNeeded = Math.max(1, Math.ceil(remainingMins / safeGoal));
    const targetDate = calculateScheduledTargetDate(new Date(), sessionsNeeded, tempSchedule);
    return {
      formatted: formatFriendlyDate(targetDate),
      sessionsNeeded };
  }, [remainingStats, dailyGoalMinutes, tempSchedule]);

  // Weekly stats
  const weeklyStats = useMemo(() => {
    return getScheduleWeeklyStats(tempSchedule);
  }, [tempSchedule]);

  if (!isOpen || !course) return null;

  const toggleDay = (day: ScheduleDay) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      const order = ALL_SCHEDULE_DAYS;
      const updated = [...selectedDays, day].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      setSelectedDays(updated);
    }
  };

  const handleApplyPresetDays = (days: ScheduleDay[]) => {
    setSelectedDays(days);
  };

  const handleSave = async () => {
    if (!course) return;
    setIsSaving(true);
    try {
      const scheduleToSave: CourseStudySchedule = {
        mode,
        customDays: mode === 'custom' ? selectedDays : mode === 'daily' ? ALL_SCHEDULE_DAYS : [],
        dailyGoalMinutes,
        updatedAt: new Date().toISOString() };
      await updateCourseStudySchedule(course.id, scheduleToSave);
      onClose();
    } catch (e) {
      console.error('Failed to save study schedule:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const formatGoalLabel = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h} ${h === 1 ? 'hr' : 'hrs'}`;
    return `${m} min`;
  };

  return (
    <div
      id="study-schedule-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="study-schedule-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-schedule-title"
        className="w-full sm:max-w-lg bg-[var(--surface-low)] border border-[var(--border)] rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-slideUp sm:animate-scaleIn"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--border)] flex items-start justify-between gap-3 bg-[var(--surface-mid)]/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 id="study-schedule-title" className="text-base sm:text-lg font-bold text-[var(--ink)]">
                Study Schedule
              </h2>
              <p className="text-xs text-[var(--ink-dim)] line-clamp-1 max-w-[260px] sm:max-w-[340px]" title={course.title}>
                {course.title}
              </p>
            </div>
          </div>

          <button
            id="close-study-schedule-modal-btn"
            onClick={onClose}
            aria-label="Close Study Schedule dialog"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Schedule Mode Selector */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-dim)]">
              Schedule Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="schedule-mode-daily-btn"
                onClick={() => setMode('daily')}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 min-h-[48px] ${
                  mode === 'daily'
                    ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)] font-bold shadow-sm'
                    : 'bg-[var(--surface-mid)] border-[var(--border)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)]'
                }`}
              >
                <span className="text-xs font-semibold">Daily</span>
                <span className="text-[10px] opacity-75">7 days / week</span>
              </button>

              <button
                type="button"
                id="schedule-mode-custom-btn"
                onClick={() => setMode('custom')}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 min-h-[48px] ${
                  mode === 'custom'
                    ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)] font-bold shadow-sm'
                    : 'bg-[var(--surface-mid)] border-[var(--border)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)]'
                }`}
              >
                <span className="text-xs font-semibold">Custom Days</span>
                <span className="text-[10px] opacity-75">Pick study days</span>
              </button>

              <button
                type="button"
                id="schedule-mode-none-btn"
                onClick={() => setMode('none')}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 min-h-[48px] ${
                  mode === 'none'
                    ? 'bg-[var(--surface-high)] border-[var(--ink-faint)] text-[var(--ink)] font-bold shadow-sm'
                    : 'bg-[var(--surface-mid)] border-[var(--border)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)]'
                }`}
              >
                <span className="text-xs font-semibold">No Schedule</span>
                <span className="text-[10px] opacity-75">Flexible / Self-paced</span>
              </button>
            </div>
          </div>

          {/* Custom Study Days (only when mode is custom) */}
          {mode === 'custom' && (
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--surface-mid)] border border-[var(--border)] animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Study Days
                </label>
                <span className="text-[11px] text-[var(--accent)] font-semibold">
                  {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} selected
                </span>
              </div>

              {/* Day buttons (Mon - Sun) */}
              <div className="grid grid-cols-7 gap-1.5">
                {ALL_SCHEDULE_DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      id={`day-select-btn-${day.toLowerCase()}`}
                      onClick={() => toggleDay(day)}
                      className={`h-11 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center select-none active:scale-95 ${
                        isSelected
                          ? 'bg-[var(--accent)] text-white shadow-sm'
                          : 'bg-[var(--surface-high)] text-[var(--ink-dim)] hover:text-[var(--ink)] border border-[var(--border)]'
                      }`}
                    >
                      <span>{day}</span>
                      {isSelected && <span className="w-1 h-1 rounded-full bg-white mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Quick Preset Filters */}
              <div className="pt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-semibold text-[var(--ink-faint)] mr-1">
                  Quick Presets:
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyPresetDays(['Sat', 'Sun'])}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--surface-high)] text-[var(--ink-dim)] hover:text-[var(--ink)] border border-[var(--border)] transition-colors"
                >
                  Weekends (Sat · Sun)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetDays(['Mon', 'Wed', 'Fri'])}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--surface-high)] text-[var(--ink-dim)] hover:text-[var(--ink)] border border-[var(--border)] transition-colors"
                >
                  Mon · Wed · Fri
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--surface-high)] text-[var(--ink-dim)] hover:text-[var(--ink)] border border-[var(--border)] transition-colors"
                >
                  Weekdays
                </button>
              </div>
            </div>
          )}

          {/* Daily Study Goal Selection (when daily or custom) */}
          {mode !== 'none' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-dim)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Daily Study Goal
                </label>
                <span className="text-sm font-bold text-[var(--accent)]">
                  {formatGoalLabel(dailyGoalMinutes)} / study day
                </span>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_GOALS.map((preset) => {
                  const isSelected = dailyGoalMinutes === preset.minutes;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      id={`preset-goal-btn-${preset.minutes}`}
                      onClick={() => setDailyGoalMinutes(preset.minutes)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[var(--accent)] text-white shadow-sm'
                          : 'bg-[var(--surface-mid)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)] border border-[var(--border)]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Goal Slider */}
              <div className="pt-2 space-y-1.5">
                <input
                  type="range"
                  id="modal-study-quota-slider"
                  min={15}
                  max={240}
                  step={15}
                  value={dailyGoalMinutes}
                  onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--surface-mid)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                />
              </div>

              {/* Schedule Impact & Expected Weekly Time Explanation */}
              <div className="p-3.5 rounded-2xl bg-[var(--surface-mid)] border border-[var(--border)] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[var(--ink)]">
                  <span className="text-[var(--ink-dim)]">Expected weekly study time:</span>
                  <span className="font-bold text-[var(--accent)]">
                    {weeklyStats.summaryText}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--ink-dim)] leading-relaxed">
                  {mode === 'custom' ? (
                    <span>
                      {selectedDays.length} study {selectedDays.length === 1 ? 'day' : 'days'} ({selectedDays.join(' · ')}) × {formatGoalLabel(dailyGoalMinutes)}/day ={' '}
                      <strong className="text-[var(--ink)]">{weeklyStats.summaryText}</strong> (applies only to your selected study days).
                    </span>
                  ) : (
                    <span>
                      7 days × {formatGoalLabel(dailyGoalMinutes)}/day ={' '}
                      <strong className="text-[var(--ink)]">{weeklyStats.summaryText}</strong>.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Target Date Projection Box */}
          {remainingStats && (
            <div className="p-3.5 rounded-2xl bg-[var(--surface-mid)] border border-[var(--border)] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-[var(--ink-faint)]">
                  Projected Completion Date
                </div>
                <div className="text-sm font-bold text-[var(--ink)]">
                  {remainingStats.isCompleted ? 'Completed' : projectedFinish.formatted}
                </div>
                <div className="text-[10px] text-[var(--ink-dim)]">
                  Based on {remainingStats.formattedRemaining} unwatched time
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                  {mode === 'none' ? 'Self-Paced' : formatScheduleDaysSummary(tempSchedule) || 'Daily'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--surface-mid)]/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            id="cancel-study-schedule-btn"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)] transition-colors min-h-[44px]"
          >
            Cancel
          </button>

          <button
            type="button"
            id="save-study-schedule-btn"
            onClick={handleSave}
            disabled={isSaving || (mode === 'custom' && selectedDays.length === 0)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5 min-h-[44px]"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Schedule</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
