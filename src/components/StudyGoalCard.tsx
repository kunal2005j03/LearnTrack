import React, { useState, useMemo } from 'react';
import { Course, CourseVideo, CourseStudySchedule } from '../types';
import { useLearnTrack } from '../context/LearnTrackContext';
import {
  getCourseRemainingTimeStats,
  formatSeconds,
  formatEstimatedTimeRemaining,
} from '../utils/formatters';
import {
  calculateCourseDeadlinePacing,
  formatFriendlyDate,
  computeInitialTargetDeadline,
  calculateScheduledTargetDate,
  formatScheduleDaysSummary,
  getScheduleWeeklyStats,
} from '../utils/studyPlanner';
import { StudyScheduleModal } from './StudyScheduleModal';
import {
  Sparkles,
  Clock,
  Calendar,
  AlertTriangle,
  Award,
  CheckCircle2,
  TrendingUp,
  Flame,
  ArrowRight,
  Sliders,
  RefreshCw,
  Lightbulb,
  Zap,
  Info,
  CalendarDays,
  Edit3,
} from 'lucide-react';

interface StudyGoalCardProps {
  course: Course;
  videos?: CourseVideo[];
  compact?: boolean;
}

const PRESET_MINUTES = [15, 30, 45, 60, 90, 120, 180];

export const StudyGoalCard: React.FC<StudyGoalCardProps> = ({
  course,
  videos = [],
  compact = false,
}) => {
  const { progressMap, updateCourseStudyGoal, fetchAiStudyPlan } = useLearnTrack();

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiTips, setShowAiTips] = useState(false);
  const [sliderValue, setSliderValue] = useState<number>(
    course.studySchedule?.dailyGoalMinutes || course.studyGoal?.dailyQuotaMinutes || 60
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Synchronize slider value if course changes
  React.useEffect(() => {
    const mins = course.studySchedule?.dailyGoalMinutes || course.studyGoal?.dailyQuotaMinutes;
    if (mins) {
      setSliderValue(mins);
    }
  }, [course.id, course.studySchedule?.dailyGoalMinutes, course.studyGoal?.dailyQuotaMinutes]);

  // Compute remaining time stats
  const remainingStats = useMemo(() => {
    return getCourseRemainingTimeStats(course, videos, progressMap);
  }, [course, videos, progressMap]);

  // Calculate pacing comparison against initial estimated deadline (schedule-aware)
  const pacing = useMemo(() => {
    return calculateCourseDeadlinePacing(course, remainingStats);
  }, [course, remainingStats]);

  const schedule = course.studySchedule || course.studyGoal?.schedule;
  const hasCustomSchedule = schedule && schedule.mode !== 'none';
  const scheduleDaysLabel = formatScheduleDaysSummary(schedule);
  const weeklyStats = useMemo(() => getScheduleWeeklyStats(schedule), [schedule]);

  // Live simulation of estimated deadline as slider moves, respecting schedule
  const simulatedDeadline = useMemo(() => {
    const remainingMins = Math.max(1, Math.round(remainingStats.remainingSeconds / 60));
    const safeSlider = Math.max(15, sliderValue);
    const sessionsNeeded = Math.max(1, Math.ceil(remainingMins / safeSlider));
    const simSchedule: CourseStudySchedule | undefined = schedule
      ? { ...schedule, dailyGoalMinutes: safeSlider }
      : undefined;

    const targetDate = calculateScheduledTargetDate(new Date(), sessionsNeeded, simSchedule);
    return {
      sessionsNeeded,
      dateFormatted: formatFriendlyDate(targetDate),
    };
  }, [remainingStats.remainingSeconds, sliderValue, schedule]);

  // Handle slider commit (updates Firestore / local state)
  const handleSliderChange = (val: number) => {
    setSliderValue(val);
  };

  const handleApplyQuota = async (minutesToSave?: number) => {
    const mins = minutesToSave || sliderValue;
    setIsSaving(true);
    try {
      await updateCourseStudyGoal(course.id, mins);
      setFeedbackToast(`Saved! Daily goal set to ${formatMinutesLabel(mins)}/study day`);
      setTimeout(() => setFeedbackToast(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger Gemini Course Analysis
  const handleFetchAiRecommendation = async () => {
    setIsAiLoading(true);
    try {
      const sampleTitles = videos.slice(0, 15).map((v) => v.title);
      const rec = await fetchAiStudyPlan(course, sampleTitles);
      if (rec) {
        setSliderValue(rec.recommendedDailyMinutes);
        setShowAiTips(true);
        setFeedbackToast(`AI analysis applied: ${rec.recommendedDailyHours} hrs/day recommended.`);
        setTimeout(() => setFeedbackToast(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Reset benchmark target date if user wants to recalibrate fresh from today
  const handleResetInitialBenchmark = async () => {
    setIsSaving(true);
    try {
      await updateCourseStudyGoal(course.id, sliderValue, undefined, true);
      setFeedbackToast('Initial target deadline recalibrated to start from today!');
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const formatMinutesLabel = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h} ${h === 1 ? 'hr' : 'hrs'}`;
    return `${m} mins`;
  };

  return (
    <>
      <div
        id={`study-goal-card-${course.id}`}
        className="bg-[var(--surface-mid)] border border-[var(--border)] rounded-[24px] p-5 sm:p-6 shadow-sm relative overflow-hidden transition-all duration-300"
      >
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[var(--accent)]/10 via-transparent to-transparent pointer-events-none rounded-tr-[24px]" />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
                Study Schedule & Target Deadline
              </h3>
              <p className="text-xs text-[var(--ink-dim)]">
                Personalized study days, quota pacing, and dynamic projected deadlines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit Schedule button */}
            <button
              id={`edit-schedule-btn-${course.id}`}
              onClick={() => setIsScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-high)] hover:bg-[var(--surface-low)] text-[var(--ink)] border border-[var(--border)] transition shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{hasCustomSchedule ? 'Edit Schedule' : 'Set Schedule'}</span>
            </button>

            {/* Gemini AI Recommendation Trigger Button */}
            <button
              onClick={handleFetchAiRecommendation}
              disabled={isAiLoading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-[var(--accent)]/20 hover:from-amber-500/30 hover:to-[var(--accent)]/30 border border-amber-400/40 text-amber-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Analyze syllabus cognitive density and pacing with Gemini AI"
            >
              {isAiLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Analyzing with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>AI Plan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Compact Active Study Schedule Section */}
        <div className="mb-5 p-3.5 rounded-2xl bg-[var(--surface-low)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--ink)]">
                  {hasCustomSchedule ? `Study Days: ${scheduleDaysLabel}` : 'Study Days: Daily (Every day)'}
                </span>
                {pacing.scheduleStatusLabel && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pacing.isScheduledToday
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-[var(--surface-high)] text-[var(--ink-dim)]'
                    }`}
                  >
                    {pacing.scheduleStatusLabel}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--ink-dim)]">
                {weeklyStats.summaryText} ({formatMinutesLabel(sliderValue)} / study session)
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="text-xs font-semibold text-[var(--accent)] hover:underline self-start sm:self-auto flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            Customize days
          </button>
        </div>

        {/* Pacing Alert / Appreciation Banner */}
        <div className="mb-5 relative z-10">
          {pacing.isCompleted ? (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
              <Award className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {pacing.badgeText}
                </div>
                <p className="text-xs text-emerald-200 leading-relaxed font-medium">
                  {pacing.pacingMessage}
                </p>
              </div>
            </div>
          ) : pacing.status === 'ahead' ? (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-emerald-400" />
                    Ahead of Schedule ({Math.abs(pacing.daysDelta)} days early)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[10px] font-bold text-emerald-300">
                    Target: {pacing.initialTargetDeadlineFormatted}
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 leading-relaxed font-medium">
                  {pacing.pacingMessage}
                </p>
              </div>
            </div>
          ) : pacing.status === 'behind' ? (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    Pacing Warning ({pacing.daysDelta} {pacing.daysDelta === 1 ? 'day' : 'days'} past initial target)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-[10px] font-bold text-amber-300">
                    Original: {pacing.initialTargetDeadlineFormatted}
                  </span>
                </div>
                <p className="text-xs text-amber-100/90 leading-relaxed font-medium">
                  {pacing.pacingMessage}
                </p>

                {/* Quick catch-up action */}
                {pacing.minutesNeededDailyToHitInitialDeadline > sliderValue && (
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setSliderValue(pacing.minutesNeededDailyToHitInitialDeadline);
                        handleApplyQuota(pacing.minutesNeededDailyToHitInitialDeadline);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-400 text-black hover:bg-amber-300 transition-colors shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Catch-up Quota ({formatMinutesLabel(pacing.minutesNeededDailyToHitInitialDeadline)}/day)
                    </button>
                    <button
                      onClick={handleResetInitialBenchmark}
                      className="text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] underline transition-colors"
                    >
                      Recalibrate target date from today
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[var(--surface-low)] border border-[var(--border)] text-[var(--ink-dim)] flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold text-[var(--ink)]">On Track:</span>{' '}
                {pacing.pacingMessage}
              </div>
            </div>
          )}
        </div>

        {/* AI Recommendation Insights Display (if available) */}
        {course.studyGoal?.aiRecommendation && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-transparent border border-purple-500/20 relative z-10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Gemini AI Analysis & Study Insights
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {course.studyGoal.aiRecommendation.difficulty} Level
                </span>
              </div>
              <button
                onClick={() => setShowAiTips((prev) => !prev)}
                className="text-[11px] text-[var(--ink-dim)] hover:text-[var(--ink)] underline"
              >
                {showAiTips ? 'Hide Tips' : 'View AI Study Tips'}
              </button>
            </div>

            <p className="text-xs text-[var(--ink-dim)] leading-relaxed italic">
              "{course.studyGoal.aiRecommendation.pacingRationale}"
            </p>

            {showAiTips && course.studyGoal.aiRecommendation.studyTips?.length > 0 && (
              <div className="pt-2 border-t border-[var(--border)]/50 space-y-1.5">
                <div className="text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  Actionable Study & Practice Tips:
                </div>
                <ul className="text-xs text-[var(--ink-dim)] space-y-1 pl-4 list-disc">
                  {course.studyGoal.aiRecommendation.studyTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Main Quota Slider & Estimations */}
        <div className="space-y-4 relative z-10">
          {/* Slider Title & Current Value */}
          <div className="flex items-center justify-between">
            <label htmlFor="daily-study-quota-slider" className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
              Daily Study Goal Slider
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-[var(--accent)] tracking-tight">
                {formatMinutesLabel(sliderValue)} / study day
              </span>
              <span className="text-xs text-[var(--ink-faint)]">
                ({(sliderValue / 60).toFixed(2)} hrs)
              </span>
            </div>
          </div>

          {/* Range Slider */}
          <div className="space-y-2">
            <input
              id="daily-study-quota-slider"
              type="range"
              min={15}
              max={360}
              step={15}
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full h-2.5 bg-[var(--surface-low)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)] transition-all"
            />

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
              {PRESET_MINUTES.map((mins) => {
                const isSelected = sliderValue === mins;
                return (
                  <button
                    key={mins}
                    onClick={() => {
                      handleSliderChange(mins);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[var(--accent)] text-white shadow-sm scale-105'
                        : 'bg-[var(--surface-low)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)] border border-[var(--border)]'
                    }`}
                  >
                    {formatMinutesLabel(mins)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Calculation Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* Estimated Sessions Left */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface-low)] border border-[var(--border)] space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-faint)] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[var(--accent)]" />
                Est. Study Sessions
              </div>
              <div className="text-lg font-bold text-[var(--ink)]">
                {remainingStats.isCompleted ? '0 sessions' : `${simulatedDeadline.sessionsNeeded} sessions`}
              </div>
              <div className="text-[10px] text-[var(--ink-faint)]">
                At {formatMinutesLabel(sliderValue)}/session
              </div>
            </div>

            {/* Projected Target Date */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface-low)] border border-[var(--border)] space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-faint)] flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Projected Finish Date
              </div>
              <div className="text-lg font-bold text-[var(--ink)]">
                {remainingStats.isCompleted ? 'Done!' : simulatedDeadline.dateFormatted}
              </div>
              <div className="text-[10px] text-[var(--ink-faint)]">
                {hasCustomSchedule ? `On ${scheduleDaysLabel}` : 'Daily pacing'}
              </div>
            </div>

            {/* Initial Target Date (Benchmark) */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface-low)] border border-[var(--border)] space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-faint)] flex items-center gap-1">
                <Award className="w-3 h-3 text-purple-400" />
                Initial Target Date
              </div>
              <div className="text-lg font-bold text-[var(--ink)]">
                {pacing.initialTargetDeadlineFormatted}
              </div>
              <div className="text-[10px] text-[var(--ink-faint)]">
                Benchmark from start
              </div>
            </div>
          </div>

          {/* Action Controls & Feedback */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[var(--border)]/50">
            <div className="text-xs text-[var(--ink-dim)]">
              {feedbackToast ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {feedbackToast}
                </span>
              ) : (
                <span className="text-[var(--ink-faint)]">
                  Unwatched: {remainingStats.formattedRemaining} ({remainingStats.unwatchedVideosCount} lessons left)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {sliderValue !== (course.studyGoal?.dailyQuotaMinutes || 60) && (
                <button
                  onClick={() => handleApplyQuota()}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Goal'}
                </button>
              )}
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
