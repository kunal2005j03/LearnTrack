import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell } from 'recharts';
import { useProgressMap, useStats, useContinueLearningVideo } from '../hooks/useProgress';
import { useLearnTrack } from '../context/LearnTrackContext';
import { Course, VideoProgress } from '../types';
import {
  formatSeconds,
  formatTotalWatchTime,
  getCourseRemainingTimeStats,
  formatEstimatedTimeRemaining } from '../utils/formatters';
import { TrendingUp, CheckCircle2, BookOpen, Layers, Award, Clock, Hourglass } from 'lucide-react';

interface CourseTrendChartProps {
  selectedCourseId?: string;
  onSelectCourse?: (courseId: string) => void;
}

export const CourseTrendChart: React.FC<CourseTrendChartProps> = ({
  selectedCourseId,
  onSelectCourse }) => {
  const { courses,  cachedVideos, openCourse } = useLearnTrack();
  const progressMap = useProgressMap();
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

  // Active course for detailed trend inspection
  const activeId = selectedCourseId || internalSelectedId || (courses.length > 0 ? courses[0].id : null);
  const activeCourse = courses.find((c) => c.id === activeId) || courses[0];

  const handleSelectCourse = (id: string) => {
    if (onSelectCourse) {
      onSelectCourse(id);
    } else {
      setInternalSelectedId(id);
    }
  };

  // 1. Calculate completion trend over time/milestones for the active course
  const courseTrendData = useMemo(() => {
    if (!activeCourse) return [];

    const totalVideos = Math.max(1, activeCourse.totalVideos || 1);
    const videos = cachedVideos[activeCourse.id] || [];

    // Find progress items for this course
    const courseProgress = (Object.values(progressMap) as VideoProgress[])
      .filter((p) => p.courseId === activeCourse.id && p.lastWatchedAt)
      .sort((a, b) => new Date(a.lastWatchedAt).getTime() - new Date(b.lastWatchedAt).getTime());

    const hasRealActivity =
      (activeCourse.completedVideos || 0) > 0 ||
      (activeCourse.percentage || 0) > 0 ||
      courseProgress.some((p) => p.completed || p.watchedSeconds > 30);

    if (!hasRealActivity) {
      return [];
    }

    // Build timeline points: start at Day 0 / initial creation
    const points: Array<{
      milestone: string;
      date: string;
      percentage: number;
      completedCount: number;
      lessonTitle?: string;
    }> = [];

    // Base point: Start of course (0%)
    const createdDate = activeCourse.createdAt
      ? new Date(activeCourse.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : 'Start';

    points.push({
      milestone: 'Start',
      date: createdDate,
      percentage: 0,
      completedCount: 0,
      lessonTitle: 'Course Enrolled' });

    let cumulativeCompleted = 0;
    const completedSet = new Set<string>();

    if (courseProgress.length > 0) {
      courseProgress.forEach((p) => {
        if (p.completed && !completedSet.has(p.videoId)) {
          completedSet.add(p.videoId);
          cumulativeCompleted++;
          const pct = Math.min(100, Math.round((cumulativeCompleted / totalVideos) * 100));
          const dateLabel = new Date(p.lastWatchedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric' });

          points.push({
            milestone: `L${cumulativeCompleted}`,
            date: dateLabel,
            percentage: pct,
            completedCount: cumulativeCompleted,
            lessonTitle: p.videoTitle || `Lesson ${cumulativeCompleted}` });
        }
      });
    }

    // If current progress is higher than recorded completed milestone point, add latest progress point
    const curPct = activeCourse.percentage || 0;
    if (points.length > 0 && curPct > points[points.length - 1].percentage) {
      points.push({
        milestone: 'Now',
        date: 'Today',
        percentage: curPct,
        completedCount: activeCourse.completedVideos || 0,
        lessonTitle: 'Current Progress' });
    }

    return points;
  }, [activeCourse,  cachedVideos]);

  // 2. Comparative Progress Data for all tracked courses
  const comparativeCoursesData = useMemo(() => {
    return courses.map((c) => {
      const cStats = getCourseRemainingTimeStats(c, cachedVideos[c.id], progressMap);
      return {
        id: c.id,
        name: c.title.length > 22 ? c.title.substring(0, 20) + '...' : c.title,
        fullName: c.title,
        percentage: c.percentage || 0,
        completed: c.completedVideos || 0,
        total: c.totalVideos || 0,
        remaining: Math.max(0, (c.totalVideos || 0) - (c.completedVideos || 0)),
        remainingFormatted: cStats.formattedRemaining,
        color: c.id === activeId ? 'var(--accent)' : '#6366F1' };
    });
  }, [courses, activeId, cachedVideos, progressMap]);

  // 3. Current active course watch metrics & remaining time
  const activeCourseRemainingStats = useMemo(() => {
    return getCourseRemainingTimeStats(activeCourse, cachedVideos[activeCourse?.id || ''], progressMap);
  }, [activeCourse, cachedVideos, progressMap]);

  const activeCourseMetrics = useMemo(() => {
    if (!activeCourse) return { watchedSec: 0, totalSec: 0, watchedPct: 0 };
    let watchedSec = 0;
    const vids = cachedVideos[activeCourse.id] || [];
    vids.forEach((v) => {
      const p = progressMap[v.id];
      if (p) {
        watchedSec += p.watchedSeconds || 0;
      }
    });
    const totalSec = activeCourse.totalDurationSeconds || vids.reduce((acc, v) => acc + (v.durationSeconds || 0), 0);
    const watchedPct = totalSec > 0 ? Math.min(100, Math.round((watchedSec / totalSec) * 100)) : 0;
    return { watchedSec, totalSec, watchedPct };
  }, [activeCourse, cachedVideos, progressMap]);

  if (courses.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 sm:p-8 space-y-6">
      {/* Header & Course Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--ink-dim)]">
              Course Progress & Trends
            </span>
          </div>
          <h3 className="text-lg font-bold text-[var(--ink)] mt-0.5">
            Completion Percentage Trajectory
          </h3>
        </div>

        {/* Course Selection Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {courses.map((course) => {
            const isSelected = course.id === activeId;
            return (
              <button
                key={course.id}
                onClick={() => handleSelectCourse(course.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${
                  isSelected
                    ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] shadow-sm'
                    : 'bg-[var(--surface-high)] text-[var(--ink-dim)] border-[var(--border)] hover:text-[var(--ink)] hover:border-[var(--ink-faint)]'
                }`}
              >
                <span className="truncate max-w-[140px] inline-block align-middle">
                  {course.title}
                </span>
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-[var(--bg)] text-[var(--ink)]' : 'bg-black/20 text-[var(--ink-faint)]'
                  }`}
                >
                  {course.percentage}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeCourse && (
        <div className="space-y-6">
          {/* Active Course Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface-high)] border border-[var(--border)]">
            <div className="flex items-center gap-3.5">
              <img
                src={activeCourse.thumbnail || `https://i.ytimg.com/vi/${activeCourse.playlistId}/hqdefault.jpg`}
                alt={activeCourse.title}
                className="w-14 h-10 rounded-lg object-cover bg-black border border-[var(--border)] shrink-0 cursor-pointer"
                onClick={() => openCourse(activeCourse.id)}
              />
              <div className="min-w-0">
                <h4
                  onClick={() => openCourse(activeCourse.id)}
                  className="text-sm font-bold text-[var(--ink)] truncate hover:text-[var(--accent)] transition cursor-pointer"
                >
                  {activeCourse.title}
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-dim)] mt-0.5">
                  <span>{activeCourse.channelTitle || 'Course Series'}</span>
                  <span>•</span>
                  <span className="font-semibold text-[var(--ink)]">
                    {activeCourse.completedVideos} / {activeCourse.totalVideos} lessons completed
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {activeCourseRemainingStats.formattedRemaining} left
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
              <div className="text-right">
                <div className="text-xl font-bold text-[var(--accent)]">
                  {activeCourse.percentage}%
                </div>
                <div className="text-[10px] uppercase font-semibold text-[var(--ink-faint)] tracking-wider">
                  Completion
                </div>
              </div>
              <button
                onClick={() => openCourse(activeCourse.id)}
                className="px-3.5 py-1.5 rounded-full bg-[var(--ink)] text-[var(--bg)] text-xs font-semibold hover:-translate-y-0.5 transition cursor-pointer"
              >
                View Syllabus
              </button>
            </div>
          </div>

          {/* Recharts Visual Progress Bar (Horizontal Stacked Bar) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--ink-dim)] font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
                Visual Course Completion Bar
              </span>
              <span className="font-mono text-[var(--ink)] font-semibold">
                {activeCourse.completedVideos} of {activeCourse.totalVideos} Videos ({activeCourse.percentage}%)
              </span>
            </div>

            {/* Recharts Progress Bar Chart */}
            <div className="h-6 w-full bg-[var(--surface-high)] rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={[
                    {
                      name: 'Progress',
                      completed: activeCourse.percentage || 0,
                      remaining: Math.max(0, 100 - (activeCourse.percentage || 0)) },
                  ]}
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Bar
                    dataKey="completed"
                    stackId="a"
                    fill="url(#progressBarGradient)"
                    radius={[10, 0, 0, 10]}
                    isAnimationActive={true}
                  />
                  <Bar
                    dataKey="remaining"
                    stackId="a"
                    fill="transparent"
                    radius={[0, 10, 10, 0]}
                  />
                  <defs>
                    <linearGradient id="progressBarGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="#818CF8" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between text-[10px] text-[var(--ink-faint)] font-mono px-1">
              <span>0% (Enrolled)</span>
              <span>50% (Halfway)</span>
              <span>100% (Mastery)</span>
            </div>
          </div>

          {/* Recharts Completion Percentage Trend Chart */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--accent)]" />
                Completion Trend & Milestone Velocity
              </span>
              {courseTrendData.length > 0 && (
                <span className="text-[11px] text-[var(--ink-faint)]">
                  {courseTrendData.length} Milestone Points
                </span>
              )}
            </div>

            {courseTrendData.length > 0 ? (
              <div className="h-[180px] sm:h-[220px] w-full bg-[var(--surface-high)] rounded-2xl p-4 border border-[var(--border)]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={courseTrendData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="milestone"
                      stroke="var(--ink-faint)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="var(--ink-faint)"
                      fontSize={11}
                      tickFormatter={(val) => `${val}%`}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[var(--surface-low)] border border-[var(--border)] p-3 rounded-xl shadow-xl text-xs space-y-1">
                              <div className="font-bold text-[var(--ink)] flex items-center justify-between gap-3">
                                <span>{data.milestone}: {data.date}</span>
                                <span className="text-[var(--accent)]">{data.percentage}%</span>
                              </div>
                              <p className="text-[11px] text-[var(--ink-dim)] line-clamp-1">
                                {data.lessonTitle}
                              </p>
                              <div className="text-[10px] text-[var(--ink-faint)] font-mono">
                                {data.completedCount} lessons completed
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="percentage"
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#trendAreaGradient)"
                      activeDot={{ r: 6, fill: '#FFFFFF', stroke: 'var(--accent)', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[180px] sm:h-[220px] w-full bg-[var(--surface-high)] rounded-2xl p-6 border border-[var(--border)] flex flex-col items-center justify-center text-center space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface-mid)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-sm">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-xs sm:text-sm font-bold text-[var(--ink)]">
                    Start learning to build your progress trend.
                  </p>
                  <p className="text-[11px] text-[var(--ink-faint)] leading-relaxed">
                    Watch and complete lessons to visualize your milestone velocity and progress curve over time.
                  </p>
                </div>
                <button
                  onClick={() => openCourse(activeCourse.id)}
                  className="mt-1 px-4 py-1.5 rounded-full bg-[var(--ink)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-sm"
                >
                  Start Learning
                </button>
              </div>
            )}
          </div>

          {/* Comparative Multi-Course Progress Matrix (when >= 2 courses) */}
          {comparativeCoursesData.length > 1 && (
            <div className="space-y-3 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
                  All Tracked Courses Comparison
                </span>
                <span className="text-[11px] text-[var(--ink-faint)]">
                  {comparativeCoursesData.length} active enrollments
                </span>
              </div>

              <div className="h-[140px] w-full bg-[var(--surface-high)] rounded-2xl p-4 border border-[var(--border)]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparativeCoursesData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      stroke="var(--ink-faint)"
                      fontSize={10}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="var(--ink-dim)"
                      fontSize={11}
                      width={110}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-[var(--surface-low)] border border-[var(--border)] p-2.5 rounded-xl shadow-xl text-xs space-y-0.5">
                              <p className="font-semibold text-[var(--ink)]">{item.fullName}</p>
                              <p className="text-[var(--accent)] font-bold">{item.percentage}% Complete</p>
                              <p className="text-[10px] text-[var(--ink-dim)]">
                                {item.completed}/{item.total} lessons finished
                              </p>
                              <p className="text-[10px] text-amber-400 font-medium">
                                Est. {item.remainingFormatted} remaining
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="percentage"
                      radius={[0, 8, 8, 0]}
                      isAnimationActive={true}
                      onClick={(data) => {
                        if (data && data.id) handleSelectCourse(data.id);
                      }}
                      className="cursor-pointer"
                    >
                      {comparativeCoursesData.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={entry.id === activeId ? 'var(--accent)' : '#6366F1'}
                          opacity={entry.id === activeId ? 1 : 0.65}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
