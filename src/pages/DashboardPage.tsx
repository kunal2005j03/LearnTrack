import React, { useState, useMemo } from 'react';
import { useProgressMap, useStats, useContinueLearningVideo } from '../hooks/useProgress';
import { useLearnTrack } from '../context/LearnTrackContext';
import { useAuth } from '../context/AuthContext';
import { StreakCard } from '../components/StreakCard';
import { CourseCard } from '../components/CourseCard';
import { CourseTrendChart } from '../components/CourseTrendChart';
import { DashboardStudyPlannerSummary } from '../components/DashboardStudyPlannerSummary';
import {
  formatSeconds,
  formatTotalWatchTime,
  getCourseRemainingTimeStats,
  formatEstimatedTimeRemaining,
  getLocalDateString } from '../utils/formatters';
import { getTodayStudyGoalStats } from '../utils/studyPlanner';
import { VideoProgress } from '../types';
import {
  Play,
  Plus,
  ArrowRight,
  Search,
  Sparkles,
  Flame,
  Clock,
  Target } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    courses,
    
    cachedVideos,
    
    
    openVideo,
    setCurrentView,
    setIsAddCourseOpen,
    setIsSearchOpen } = useLearnTrack();
  const progressMap = useProgressMap();
  const stats = useStats();
  const continueLearningVideo = useContinueLearningVideo();
  const { user, userProfile } = useAuth();
  const [selectedTrendCourseId, setSelectedTrendCourseId] = useState<string | undefined>(undefined);

  // Map progress items to specific dates for study goal calculation
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
            duration: p.watchedSeconds || 0 });
        }
      }
    });

    return map;
  }, [progressMap]);

  // Today's Goal dynamic calculation
  const todayGoalStats = useMemo(() => {
    return getTodayStudyGoalStats(courses, dailyProgressMap, new Date());
  }, [courses, dailyProgressMap]);

  // Calculate total remaining unwatched time across all courses
  const totalRemainingStats = useMemo(() => {
    let totalRemainingSec = 0;
    let totalUnwatchedCount = 0;

    courses.forEach((c) => {
      const cStats = getCourseRemainingTimeStats(c, cachedVideos[c.id], progressMap);
      totalRemainingSec += cStats.remainingSeconds;
      totalUnwatchedCount += cStats.unwatchedVideosCount;
    });

    return {
      remainingSeconds: totalRemainingSec,
      unwatchedVideos: totalUnwatchedCount,
      formatted: formatEstimatedTimeRemaining(totalRemainingSec, false),
      formattedVerbose: formatEstimatedTimeRemaining(totalRemainingSec, true) };
  }, [courses, cachedVideos, progressMap]);

  // Remaining for continue learning course
  const continueCourseRemaining = useMemo(() => {
    if (!continueLearningVideo) return null;
    return getCourseRemainingTimeStats(
      continueLearningVideo.course,
      cachedVideos[continueLearningVideo.course.id],
      );
  }, [ cachedVideos, ]);

  // Dynamic greeting based on current time
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = userProfile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Scholar';

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Header Section */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink)]">
            {greeting}, {displayName}.
          </h1>
          <p className="text-base sm:text-lg text-[var(--ink-dim)]">
            Let's continue your learning journey.
          </p>
        </div>

        {/* User Meta Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Search trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2.5 rounded-full bg-[var(--surface-low)] border border-[var(--border)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)] transition"
            title="Search courses (⌘K)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* User Profile Pill (Visible when logged in) */}
          {user && !user.isAnonymous && (
            <div
              onClick={() => setCurrentView('settings')}
              className="flex items-center gap-2 bg-[var(--surface-low)] border border-[var(--border)] pl-1.5 pr-3 py-1 rounded-full shadow-sm cursor-pointer hover:border-[var(--ink-dim)] transition"
              title="Open Settings"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover border border-[var(--border)]"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-semibold">
                  {displayName.charAt(0)}
                </div>
              )}
              <span className="font-medium text-xs text-[var(--ink)]">
                {displayName}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Dashboard Layout (2-Column Grid) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-10">
        {/* Left Column: Centerpiece & Course List */}
        <div className="space-y-12">
          {/* Centerpiece "Continue Learning" Featured Card */}
          {continueLearningVideo ? (
            <section className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 sm:p-8 flex flex-col lg:flex-row items-center gap-8 backdrop-blur-xl relative overflow-hidden group">
              {/* Subtle ambient lighting inside card */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(circle_at_right,rgba(255,255,255,0.05),transparent)] pointer-events-none" />

              {/* Video Thumbnail with Play Button Overlay */}
              <div
                onClick={() =>
                  openVideo(
                    continueLearningVideo.course.id,
                    continueLearningVideo.video.id
                  )
                }
                className="w-full lg:w-[320px] aspect-video bg-black rounded-xl relative shrink-0 border border-[var(--border)] overflow-hidden cursor-pointer shadow-md"
              >
                <img
                  src={continueLearningVideo.video.thumbnail}
                  alt={continueLearningVideo.video.title}
                  className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity">
                  <div className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Progress tag overlay */}
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white">
                  {formatSeconds(continueLearningVideo.progress.watchedSeconds)} /{' '}
                  {formatSeconds(
                    continueLearningVideo.progress.durationSeconds ||
                      continueLearningVideo.video.durationSeconds
                  )}
                </div>
              </div>

              {/* Featured Video Details */}
              <div className="flex-1 w-full space-y-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--accent)] inline-block">
                      Continue Learning
                    </span>
                    {continueCourseRemaining && !continueCourseRemaining.isCompleted && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--surface-high)] border border-[var(--border)] text-[10px] text-[var(--accent)] font-medium flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-[var(--accent)]" />
                        {continueCourseRemaining.formattedRemaining} left in course
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[var(--ink)] leading-snug line-clamp-2">
                    {continueLearningVideo.course.title}
                  </h2>
                  <p className="text-sm text-[var(--ink-dim)] mt-1 line-clamp-1">
                    {continueLearningVideo.video.title}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-[var(--ink-dim)]">
                    <span>
                      {formatSeconds(continueLearningVideo.progress.watchedSeconds)} /{' '}
                      {formatSeconds(
                        continueLearningVideo.progress.durationSeconds ||
                          continueLearningVideo.video.durationSeconds
                      )}
                    </span>
                    <span className="font-semibold text-[var(--ink)]">
                      {continueLearningVideo.progress.percentage}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-[var(--surface-high)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent)] to-white rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, continueLearningVideo.progress.percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Primary Button */}
                <div className="pt-2">
                  <button
                    onClick={() =>
                      openVideo(
                        continueLearningVideo.course.id,
                        continueLearningVideo.video.id
                      )
                    }
                    className="min-h-[44px] bg-[var(--ink)] text-[var(--bg)] px-6 py-3 rounded-full font-semibold text-sm inline-flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 transition shadow-lg cursor-pointer touch-manipulation"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Continue Watching
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-8 text-center space-y-4 backdrop-blur-xl">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-high)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--accent)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-bold text-[var(--ink)]">
                  Ready to start learning?
                </h3>
                <p className="text-xs sm:text-sm text-[var(--ink-dim)]">
                  Import a YouTube playlist or course to track your lectures and build daily consistency.
                </p>
              </div>
              <button
                onClick={() => setIsAddCourseOpen(true)}
                className="bg-[var(--ink)] text-[var(--bg)] px-6 py-2.5 rounded-full font-semibold text-sm inline-flex items-center gap-2 hover:-translate-y-0.5 transition shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Add Your First Course
              </button>
            </section>
          )}

          {/* Recharts Visual Progress & Completion Trend Section */}
          {courses.length > 0 && (
            <CourseTrendChart
              selectedCourseId={selectedTrendCourseId}
              onSelectCourse={(id) => setSelectedTrendCourseId(id)}
            />
          )}

          {/* Daily Quotas, AI Insights & Target Deadline Pacing Section */}
          {courses.length > 0 && <DashboardStudyPlannerSummary />}

          {/* Section: My Courses */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--ink)]">
                My Courses
              </h2>
              <button
                onClick={() => setCurrentView('courses')}
                className="text-xs font-medium text-[var(--ink-faint)] hover:text-[var(--ink)] flex items-center gap-1 transition"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {courses.length === 0 ? (
              <div className="bg-[var(--surface-low)] border border-dashed border-[var(--border)] rounded-[20px] p-10 text-center space-y-3">
                <p className="text-sm text-[var(--ink-dim)]">
                  No courses added yet. Paste a YouTube playlist link to start.
                </p>
                <button
                  onClick={() => setIsAddCourseOpen(true)}
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  + Ingest Course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.slice(0, 6).map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats Panel & Weekly Activity */}
        <div className="space-y-8">
          {/* Panel Title */}
          <div>
            <span className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--ink-dim)] mb-4 block">
              Your Progress
            </span>

            {/* 2x2 Stats Grid + Remaining Study Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--surface-low)] border border-[var(--border)] p-5 rounded-[20px]">
                <span className="text-[11px] font-semibold text-[var(--ink-faint)] uppercase tracking-wider block">
                  COURSES
                </span>
                <div className="text-2xl font-bold text-[var(--ink)] mt-1">
                  {stats.totalCourses}
                </div>
              </div>

              <div className="bg-[var(--surface-low)] border border-[var(--border)] p-5 rounded-[20px]">
                <span className="text-[11px] font-semibold text-[var(--ink-faint)] uppercase tracking-wider block">
                  COMPLETED
                </span>
                <div className="text-2xl font-bold text-[var(--ink)] mt-1">
                  {stats.completedVideos}
                </div>
              </div>

              <div className="bg-[var(--surface-low)] border border-[var(--border)] p-5 rounded-[20px]">
                <span className="text-[11px] font-semibold text-[var(--ink-faint)] uppercase tracking-wider block">
                  WATCH TIME
                </span>
                <div className="text-2xl font-bold text-[var(--ink)] mt-1 truncate">
                  {formatTotalWatchTime(stats.totalWatchSeconds)}
                </div>
              </div>

              <div className="bg-[var(--surface-low)] border border-[var(--border)] p-5 rounded-[20px]">
                <span className="text-[11px] font-semibold text-[var(--ink-faint)] uppercase tracking-wider block flex items-center justify-between">
                  <span>DAILY STREAK</span>
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                </span>
                <div className="text-2xl font-bold text-[var(--ink)] mt-1 flex items-baseline gap-1">
                  <span>{stats.currentStreak}</span>
                  <span className="text-xs font-normal text-[var(--ink-dim)]">days</span>
                </div>
              </div>
            </div>

            {/* Today's Study Goal Compact Metric */}
            <div className="mt-4 bg-[var(--surface-low)] border border-[var(--border)] p-4 rounded-[20px] flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                  <Target className="w-3 h-3" />
                  <span>Today's Goal</span>
                </div>
                <div className="text-xl font-bold text-[var(--ink)] tracking-tight truncate">
                  {todayGoalStats.label}
                </div>
                <div
                  className={`text-[10px] ${
                    todayGoalStats.isCompleted
                      ? 'text-emerald-400 font-semibold'
                      : 'text-[var(--ink-faint)]'
                  }`}
                >
                  {todayGoalStats.subtext}
                </div>
              </div>

              {todayGoalStats.mode === 'scheduled' && (
                <div className="text-right shrink-0">
                  <div
                    className={`text-xs font-bold ${
                      todayGoalStats.isCompleted ? 'text-emerald-400' : 'text-[var(--accent)]'
                    }`}
                  >
                    {todayGoalStats.percentage}%
                  </div>
                  <div className="w-16 h-1.5 bg-[var(--surface-high)] rounded-full overflow-hidden mt-1 border border-[var(--border)]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        todayGoalStats.isCompleted ? 'bg-emerald-400' : 'bg-[var(--accent)]'
                      }`}
                      style={{ width: `${todayGoalStats.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Total Estimated Time Remaining Banner */}
            {courses.length > 0 && (
              <div className="mt-4 bg-[var(--surface-low)] border border-[var(--border)] p-4 rounded-[20px] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Est. Time Remaining</span>
                  </div>
                  <div className="text-xl font-bold text-[var(--ink)] tracking-tight">
                    {totalRemainingStats.formatted}
                  </div>
                  <div className="text-[10px] text-[var(--ink-faint)]">
                    {totalRemainingStats.unwatchedVideos} unwatched videos across {courses.length} {courses.length === 1 ? 'course' : 'courses'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-semibold text-[var(--ink-dim)]">
                    {stats.completedVideos} / {stats.completedVideos + totalRemainingStats.unwatchedVideos}
                  </div>
                  <div className="text-[10px] text-[var(--ink-faint)]">
                    lessons done
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Weekly Activity Chart Component */}
          <StreakCard />
        </div>
      </div>
    </div>
  );
};
