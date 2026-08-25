import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  Course,
  CourseVideo,
  VideoProgress,
  UserStats,
  ThemeMode,
  AiStudyPlanRecommendation,
  CourseStudyGoal,
  CourseStudySchedule,
} from '../types';
import { calculateStreaks, getLocalDateString } from '../utils/formatters';
import { createDefaultStudyGoal, computeInitialTargetDeadline, getISODateOnly } from '../utils/studyPlanner';

interface LearnTrackContextType {
  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Data
  courses: Course[];
  progressMap: Record<string, VideoProgress>; // videoId -> VideoProgress
  stats: UserStats;
  loading: boolean;
  activeCourseId: string | null;
  activeVideoId: string | null;
  setActiveVideo: (courseId: string | null, videoId: string | null) => void;

  // Navigation and Views
  currentView: 'dashboard' | 'courses' | 'course-detail' | 'video-player' | 'diagnostic' | 'settings' | 'bookmarks';
  setCurrentView: (view: 'dashboard' | 'courses' | 'course-detail' | 'video-player' | 'diagnostic' | 'settings' | 'bookmarks') => void;
  openCourse: (courseId: string) => void;
  openVideo: (courseId: string, videoId: string) => void;

  // Course actions
  importPlaylist: (urlOrId: string) => Promise<{ success: boolean; courseId?: string; error?: string }>;
  deleteCourse: (courseId: string) => Promise<void>;
  toggleCourseBookmark: (courseId: string) => Promise<void>;
  toggleVideoBookmark: (courseId: string, videoId: string) => Promise<void>;
  getCourseVideos: (courseId: string) => Promise<CourseVideo[]>;
  cachedVideos: Record<string, CourseVideo[]>;

  // Study Quota & Deadline Goals
  updateCourseStudyGoal: (
    courseId: string,
    dailyQuotaMinutes: number,
    aiRecommendation?: AiStudyPlanRecommendation,
    resetInitialDeadline?: boolean
  ) => Promise<void>;
  updateCourseStudySchedule: (
    courseId: string,
    schedule: CourseStudySchedule
  ) => Promise<void>;
  fetchAiStudyPlan: (
    course: Course,
    videoSampleTitles?: string[]
  ) => Promise<AiStudyPlanRecommendation | null>;

  // Progress actions
  saveProgress: (
    courseId: string,
    videoId: string,
    watchedSeconds: number,
    durationSeconds: number,
    forceCompleted?: boolean
  ) => Promise<void>;
  markVideoComplete: (courseId: string, videoId: string, completed: boolean) => Promise<void>;
  getVideoProgress: (videoId: string) => VideoProgress | undefined;

  // Derived sections
  continueLearningVideo: { course: Course; video: CourseVideo; progress: VideoProgress } | null;
  recentlyWatchedList: Array<{ course?: Course; video?: CourseVideo; progress: VideoProgress }>;
  bookmarkedCourses: Course[];
  bookmarkedVideos: Array<{ course?: Course; video: CourseVideo }>;

  // Search & Modal
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isAddCourseOpen: boolean;
  setIsAddCourseOpen: (open: boolean) => void;
}

const LearnTrackContext = createContext<LearnTrackContextType | undefined>(undefined);

const LOCAL_STORAGE_COURSES_KEY = 'learntrack_local_courses';
const LOCAL_STORAGE_VIDEOS_KEY = 'learntrack_local_videos';
const LOCAL_STORAGE_PROGRESS_KEY = 'learntrack_local_progress';
const LOCAL_STORAGE_STATS_KEY = 'learntrack_local_stats';
const LOCAL_STORAGE_THEME_KEY = 'learntrack_theme';

export const LearnTrackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.uid || 'guest_user';

  // Theme state
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) as ThemeMode;
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark';
  });

  // Apply theme to DOM
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
  };

  // Main UI routing state
  const [currentView, setCurrentView] = useState<'dashboard' | 'courses' | 'course-detail' | 'video-player' | 'diagnostic' | 'settings' | 'bookmarks'>('dashboard');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);

  // Data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [cachedVideos, setCachedVideos] = useState<Record<string, CourseVideo[]>>({});
  const [progressMap, setProgressMap] = useState<Record<string, VideoProgress>>({});
  const [stats, setStats] = useState<UserStats>({
    totalCourses: 0,
    completedVideos: 0,
    totalWatchSeconds: 0,
    overallProgress: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDate: '',
    activeDates: [],
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Keep live refs to avoid stale closures & unnecessary callback recreations
  const coursesRefState = useRef(courses);
  coursesRefState.current = courses;

  const cachedVideosRef = useRef(cachedVideos);
  cachedVideosRef.current = cachedVideos;

  const progressMapRef = useRef(progressMap);
  progressMapRef.current = progressMap;

  const userRef = useRef(user);
  userRef.current = user;

  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const statsSyncTimerRef = useRef<any>(null);
  const progressFirestoreThrottleRef = useRef<Record<string, number>>({});
  const localStorageProgSaveTimerRef = useRef<any>(null);

  // Handle URL hash or direct path if opened at /youtube-test
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/youtube-test') {
      setCurrentView('diagnostic');
    }
  }, []);

  // Load from local storage initially for instant display
  useEffect(() => {
    try {
      const storedCourses = localStorage.getItem(`${LOCAL_STORAGE_COURSES_KEY}_${userId}`);
      if (storedCourses) {
        setCourses(JSON.parse(storedCourses));
      }
      const storedProgress = localStorage.getItem(`${LOCAL_STORAGE_PROGRESS_KEY}_${userId}`);
      if (storedProgress) {
        setProgressMap(JSON.parse(storedProgress));
      }
      const storedVideos = localStorage.getItem(`${LOCAL_STORAGE_VIDEOS_KEY}_${userId}`);
      if (storedVideos) {
        setCachedVideos(JSON.parse(storedVideos));
      }
      const storedStats = localStorage.getItem(`${LOCAL_STORAGE_STATS_KEY}_${userId}`);
      if (storedStats) {
        setStats(JSON.parse(storedStats));
      }
    } catch (e) {
      console.warn('Could not read from local storage:', e);
    }
  }, [userId]);

  // Sync with Firestore in real-time when authenticated or initialized
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Listen to Courses collection
    const coursesRef = collection(db, `users/${user.uid}/courses`);
    const unsubCourses = onSnapshot(
      coursesRef,
      async (snapshot) => {
        const loadedCourses: Course[] = [];
        snapshot.forEach((docSnap) => {
          loadedCourses.push(docSnap.data() as Course);
        });

        // If Firestore is empty for this user, check if we have local courses to migrate to Firestore
        if (loadedCourses.length === 0) {
          try {
            const guestCoursesStr = localStorage.getItem(`${LOCAL_STORAGE_COURSES_KEY}_guest_user`);
            const guestVideosStr = localStorage.getItem(`${LOCAL_STORAGE_VIDEOS_KEY}_guest_user`);
            const guestProgStr = localStorage.getItem(`${LOCAL_STORAGE_PROGRESS_KEY}_guest_user`);

            if (guestCoursesStr) {
              const guestCourses: Course[] = JSON.parse(guestCoursesStr);
              const guestVideos: Record<string, CourseVideo[]> = guestVideosStr ? JSON.parse(guestVideosStr) : {};
              const guestProg: Record<string, VideoProgress> = guestProgStr ? JSON.parse(guestProgStr) : {};

              for (const course of guestCourses) {
                await setDoc(doc(db, `users/${user.uid}/courses/${course.id}`), course, { merge: true });
                const vids = guestVideos[course.id] || [];
                for (const v of vids) {
                  await setDoc(doc(db, `users/${user.uid}/courses/${course.id}/videos/${v.id}`), v, { merge: true });
                }
              }

              for (const [vidId, prog] of Object.entries(guestProg)) {
                await setDoc(doc(db, `users/${user.uid}/progress/${vidId}`), { ...prog, userId: user.uid }, { merge: true });
              }
            }
          } catch (migrateErr) {
            console.warn('Could not auto-migrate guest courses to Firestore:', migrateErr);
          }
        } else {
          setCourses(loadedCourses);
          try {
            localStorage.setItem(`${LOCAL_STORAGE_COURSES_KEY}_${user.uid}`, JSON.stringify(loadedCourses));
          } catch {}
        }
        setLoading(false);
      },
      (error) => {
        console.error('Firestore courses snapshot error:', error);
        setLoading(false);
      }
    );

    // 2. Listen to Progress collection
    const progressRef = collection(db, `users/${user.uid}/progress`);
    const unsubProgress = onSnapshot(
      progressRef,
      (snapshot) => {
        const pMap: Record<string, VideoProgress> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as VideoProgress;
          pMap[data.videoId] = data;
        });

        // Check if there is an actual difference before triggering state update
        const currentMap = progressMapRef.current;
        let hasDiff = Object.keys(pMap).length !== Object.keys(currentMap).length;
        if (!hasDiff) {
          for (const key of Object.keys(pMap)) {
            const cur = currentMap[key];
            const incoming = pMap[key];
            if (!cur || cur.completed !== incoming.completed || Math.abs((cur.watchedSeconds || 0) - (incoming.watchedSeconds || 0)) > 2) {
              hasDiff = true;
              break;
            }
          }
        }

        if (hasDiff) {
          setProgressMap(pMap);
          if (localStorageProgSaveTimerRef.current) {
            clearTimeout(localStorageProgSaveTimerRef.current);
          }
          localStorageProgSaveTimerRef.current = setTimeout(() => {
            try {
              localStorage.setItem(`${LOCAL_STORAGE_PROGRESS_KEY}_${user.uid}`, JSON.stringify(pMap));
            } catch {}
          }, 2000);
        }
      },
      (error) => {
        console.error('Firestore progress snapshot error:', error);
      }
    );

    // 3. Listen to Stats doc
    const statsDocRef = doc(db, `users/${user.uid}/stats/overview`);
    const unsubStats = onSnapshot(
      statsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const loadedStats = docSnap.data() as UserStats;
          setStats((prev) => {
            if (
              prev.completedVideos === loadedStats.completedVideos &&
              prev.overallProgress === loadedStats.overallProgress &&
              prev.currentStreak === loadedStats.currentStreak &&
              Math.abs(prev.totalWatchSeconds - loadedStats.totalWatchSeconds) < 5
            ) {
              return prev;
            }
            try {
              localStorage.setItem(`${LOCAL_STORAGE_STATS_KEY}_${user.uid}`, JSON.stringify(loadedStats));
            } catch {}
            return loadedStats;
          });
        }
      },
      (error) => {
        console.error('Firestore stats snapshot error:', error);
      }
    );

    return () => {
      unsubCourses();
      unsubProgress();
      unsubStats();
      if (statsSyncTimerRef.current) clearTimeout(statsSyncTimerRef.current);
      if (localStorageProgSaveTimerRef.current) clearTimeout(localStorageProgSaveTimerRef.current);
    };
  }, [user]);

  // Recalculate Course percentages and Stats dynamically when progressMap or courses change
  useEffect(() => {
    let completedVideoCount = 0;
    let totalWatchSec = 0;
    const activeDateSet = new Set<string>(stats.activeDates || []);

    (Object.values(progressMap) as VideoProgress[]).forEach((p) => {
      if (p.completed) {
        completedVideoCount++;
      }
      totalWatchSec += p.watchedSeconds || 0;
      if (p.lastWatchedAt && (p.watchedSeconds > 0 || p.completed)) {
        try {
          const d = new Date(p.lastWatchedAt);
          if (!isNaN(d.getTime())) {
            activeDateSet.add(getLocalDateString(d));
          } else if (p.lastWatchedAt.length >= 10) {
            activeDateSet.add(p.lastWatchedAt.substring(0, 10));
          }
        } catch {
          if (p.lastWatchedAt.length >= 10) {
            activeDateSet.add(p.lastWatchedAt.substring(0, 10));
          }
        }
      }
    });

    const activeDatesArray = Array.from(activeDateSet);
    const streakInfo = calculateStreaks(activeDatesArray);

    let totalCoursesVideos = 0;
    courses.forEach((c) => {
      totalCoursesVideos += c.totalVideos || 0;
    });

    const overallPct =
      totalCoursesVideos > 0 ? Math.round((completedVideoCount / totalCoursesVideos) * 100) : 0;

    const newStats: UserStats = {
      totalCourses: courses.length,
      completedVideos: completedVideoCount,
      totalWatchSeconds: totalWatchSec,
      overallProgress: Math.min(100, overallPct),
      currentStreak: streakInfo.current,
      bestStreak: streakInfo.best,
      lastActiveDate: activeDatesArray.sort().pop() || '',
      activeDates: activeDatesArray,
    };

    setStats(newStats);

    // Update stats document in Firestore DEBOUNCED to avoid rapid write bursts
    if (user) {
      if (statsSyncTimerRef.current) {
        clearTimeout(statsSyncTimerRef.current);
      }
      statsSyncTimerRef.current = setTimeout(() => {
        setDoc(doc(db, `users/${user.uid}/stats/overview`), newStats, { merge: true }).catch((e) =>
          console.warn('Failed to sync stats to Firestore:', e)
        );
      }, 8000);
    }
  }, [progressMap, courses.length, user]);

  // Navigation Helpers
  const setActiveVideo = (courseId: string | null, videoId: string | null) => {
    setActiveCourseId(courseId);
    setActiveVideoId(videoId);
  };

  const openCourse = (courseId: string) => {
    setActiveCourseId(courseId);
    setCurrentView('course-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openVideo = (courseId: string, videoId: string) => {
    setActiveCourseId(courseId);
    setActiveVideoId(videoId);
    setCurrentView('video-player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch videos for a given course (checks cache first, then Firestore/local)
  const getCourseVideos = useCallback(
    async (courseId: string): Promise<CourseVideo[]> => {
      if (cachedVideos[courseId] && cachedVideos[courseId].length > 0) {
        return cachedVideos[courseId];
      }

      // Check Firestore
      if (user) {
        try {
          const videosRef = collection(db, `users/${user.uid}/courses/${courseId}/videos`);
          const q = query(videosRef, orderBy('position', 'asc'));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const vids: CourseVideo[] = [];
            snap.forEach((d) => vids.push(d.data() as CourseVideo));
            setCachedVideos((prev) => ({ ...prev, [courseId]: vids }));
            return vids;
          }
        } catch (e) {
          console.error('Error fetching course videos from Firestore:', e);
        }
      }

      // Fallback local storage
      try {
        const stored = localStorage.getItem(`${LOCAL_STORAGE_VIDEOS_KEY}_${userId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed[courseId]) {
            setCachedVideos((prev) => ({ ...prev, [courseId]: parsed[courseId] }));
            return parsed[courseId];
          }
        }
      } catch {}

      return [];
    },
    [cachedVideos, user, userId]
  );

  // Import Playlist via Server API and save to Firestore
  const importPlaylist = async (
    urlOrId: string
  ): Promise<{ success: boolean; courseId?: string; error?: string }> => {
    try {
      const response = await fetch('/api/youtube/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlOrId }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          success: false,
          error: data.error || 'Failed to import playlist. Please check that the URL is public and valid.',
        };
      }

      const courseId = data.playlistId;
      const now = new Date().toISOString();

      const totalSec = data.videos.reduce((acc: number, v: any) => acc + (v.durationSeconds || 0), 0);
      const defaultGoal = createDefaultStudyGoal(
        {
          id: courseId,
          playlistId: data.playlistId,
          title: data.title,
          description: data.description,
          channelTitle: data.channelTitle,
          thumbnail: data.thumbnail,
          totalVideos: data.itemCount,
          completedVideos: 0,
          percentage: 0,
          totalDurationSeconds: totalSec,
          createdAt: now,
          updatedAt: now,
        },
        60
      );

      const newCourse: Course = {
        id: courseId,
        playlistId: data.playlistId,
        title: data.title,
        description: data.description,
        channelTitle: data.channelTitle,
        thumbnail: data.thumbnail,
        totalVideos: data.itemCount,
        completedVideos: 0,
        percentage: 0,
        totalDurationSeconds: totalSec,
        isBookmarked: false,
        studyGoal: defaultGoal,
        createdAt: now,
        updatedAt: now,
      };

      const courseVideos: CourseVideo[] = data.videos.map((v: any) => ({
        id: v.id,
        courseId,
        title: v.title,
        description: v.description,
        thumbnail: v.thumbnail,
        channelTitle: v.channelTitle || data.channelTitle,
        position: v.position,
        durationSeconds: v.durationSeconds,
        durationFormatted: v.durationFormatted,
        isBookmarked: false,
      }));

      // Update state immediately
      setCourses((prev) => {
        const filtered = prev.filter((c) => c.id !== courseId);
        const updated = [newCourse, ...filtered];
        try {
          localStorage.setItem(`${LOCAL_STORAGE_COURSES_KEY}_${userId}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setCachedVideos((prev) => {
        const updated = { ...prev, [courseId]: courseVideos };
        try {
          localStorage.setItem(`${LOCAL_STORAGE_VIDEOS_KEY}_${userId}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Persist to Firestore if user is authenticated
      if (user) {
        // Save course doc
        await setDoc(doc(db, `users/${user.uid}/courses/${courseId}`), newCourse);

        // Save video docs in batches
        for (const vid of courseVideos) {
          await setDoc(doc(db, `users/${user.uid}/courses/${courseId}/videos/${vid.id}`), vid);
        }
      }

      return { success: true, courseId };
    } catch (err: any) {
      console.error('Playlist import network error:', err);
      return {
        success: false,
        error: err?.message || 'Network error occurred while importing playlist.',
      };
    }
  };

  // Delete Course
  const deleteCourse = async (courseId: string) => {
    setCourses((prev) => {
      const updated = prev.filter((c) => c.id !== courseId);
      try {
        localStorage.setItem(`${LOCAL_STORAGE_COURSES_KEY}_${userId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setCachedVideos((prev) => {
      const copy = { ...prev };
      delete copy[courseId];
      try {
        localStorage.setItem(`${LOCAL_STORAGE_VIDEOS_KEY}_${userId}`, JSON.stringify(copy));
      } catch {}
      return copy;
    });

    if (activeCourseId === courseId) {
      setActiveCourseId(null);
      setActiveVideoId(null);
      setCurrentView('courses');
    }

    if (user) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/courses/${courseId}`));
      } catch (e) {
        console.error('Failed to delete course from Firestore:', e);
      }
    }
  };

  // Toggle Bookmark Course
  const toggleCourseBookmark = async (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          const updated = { ...c, isBookmarked: !c.isBookmarked, updatedAt: new Date().toISOString() };
          if (user) {
            setDoc(doc(db, `users/${user.uid}/courses/${courseId}`), updated, { merge: true }).catch(console.warn);
          }
          return updated;
        }
        return c;
      })
    );
  };

  // Toggle Video Bookmark
  const toggleVideoBookmark = async (courseId: string, videoId: string) => {
    setCachedVideos((prev) => {
      const vids = prev[courseId] || [];
      const updated = vids.map((v) => {
        if (v.id === videoId) {
          const up = { ...v, isBookmarked: !v.isBookmarked };
          if (user) {
            setDoc(doc(db, `users/${user.uid}/courses/${courseId}/videos/${videoId}`), up, { merge: true }).catch(console.warn);
          }
          return up;
        }
        return v;
      });
      return { ...prev, [courseId]: updated };
    });
  };

  // Update Course Study Goal (daily quota hours/minutes slider + AI recommendation)
  const updateCourseStudyGoal = async (
    courseId: string,
    dailyQuotaMinutes: number,
    aiRecommendation?: AiStudyPlanRecommendation,
    resetInitialDeadline: boolean = false
  ) => {
    const quotaMins = Math.max(10, Math.round(dailyQuotaMinutes));
    const now = new Date().toISOString();

    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          const currentGoal = c.studyGoal;
          let initialStartDate = currentGoal?.initialStartDate;
          let initialTargetDeadline = currentGoal?.initialTargetDeadline;
          let initialTotalDays = currentGoal?.initialTotalDays;

          // If no initial deadline yet, or if explicitly requested to reset benchmark
          if (!initialTargetDeadline || resetInitialDeadline) {
            initialStartDate = getISODateOnly(new Date());
            const deadlineCalc = computeInitialTargetDeadline(
              initialStartDate,
              c.totalDurationSeconds || 3600,
              quotaMins
            );
            initialTargetDeadline = deadlineCalc.targetDateStr;
            initialTotalDays = deadlineCalc.totalDays;
          }

          const updatedGoal: CourseStudyGoal = {
            dailyQuotaMinutes: quotaMins,
            dailyQuotaHours: Math.round((quotaMins / 60) * 10) / 10,
            initialStartDate: initialStartDate || getISODateOnly(new Date()),
            initialTargetDeadline: initialTargetDeadline!,
            initialTotalDays: initialTotalDays || Math.max(1, Math.ceil((c.totalDurationSeconds || 3600) / 60 / quotaMins)),
            aiRecommendation: aiRecommendation || currentGoal?.aiRecommendation,
            updatedAt: now,
          };

          const updatedCourse: Course = {
            ...c,
            studyGoal: updatedGoal,
            updatedAt: now,
          };

          // Save to Firestore if signed in
          if (user) {
            setDoc(doc(db, `users/${user.uid}/courses/${courseId}`), updatedCourse, { merge: true }).catch(console.warn);
          }

          return updatedCourse;
        }
        return c;
      })
    );
  };

  // Update Course Study Schedule (Daily, Custom Days, or No Schedule)
  const updateCourseStudySchedule = async (
    courseId: string,
    schedule: CourseStudySchedule
  ) => {
    const now = new Date().toISOString();
    const dailyMins = schedule.dailyGoalMinutes || 60;

    setCourses((prev) => {
      const updatedList = prev.map((c) => {
        if (c.id === courseId) {
          const currentGoal = c.studyGoal;
          const initialStartDate = currentGoal?.initialStartDate || getISODateOnly(new Date());

          const deadlineCalc = computeInitialTargetDeadline(
            initialStartDate,
            c.totalDurationSeconds || 3600,
            dailyMins,
            schedule
          );

          const updatedGoal: CourseStudyGoal = {
            dailyQuotaMinutes: dailyMins,
            dailyQuotaHours: Math.round((dailyMins / 60) * 10) / 10,
            initialStartDate,
            initialTargetDeadline: deadlineCalc.targetDateStr,
            initialTotalDays: deadlineCalc.totalDays,
            schedule,
            aiRecommendation: currentGoal?.aiRecommendation,
            updatedAt: now,
          };

          const updatedCourse: Course = {
            ...c,
            studyGoal: updatedGoal,
            studySchedule: schedule,
            updatedAt: now,
          };

          if (user) {
            setDoc(doc(db, `users/${user.uid}/courses/${courseId}`), updatedCourse, { merge: true }).catch(console.warn);
          }

          return updatedCourse;
        }
        return c;
      });

      try {
        localStorage.setItem(`${LOCAL_STORAGE_COURSES_KEY}_${userId}`, JSON.stringify(updatedList));
      } catch {}

      return updatedList;
    });
  };

  // Fetch AI Recommended Study Plan from Gemini API
  const fetchAiStudyPlan = async (
    course: Course,
    videoSampleTitles?: string[]
  ): Promise<AiStudyPlanRecommendation | null> => {
    try {
      const sampleTitles =
        videoSampleTitles ||
        (cachedVideos[course.id] ? cachedVideos[course.id].slice(0, 15).map((v) => v.title) : []);

      const resp = await fetch('/api/gemini/analyze-course-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: course.title,
          channelTitle: course.channelTitle,
          description: course.description,
          totalVideos: course.totalVideos,
          totalDurationSeconds: course.totalDurationSeconds,
          videoSampleTitles: sampleTitles,
        }),
      });

      const data = await resp.json();
      if (!resp.ok && !data.recommendedDailyHours) {
        throw new Error(data.error || 'Failed to analyze course plan');
      }

      const rec: AiStudyPlanRecommendation = {
        recommendedDailyHours: data.recommendedDailyHours || 1.0,
        recommendedDailyMinutes: data.recommendedDailyMinutes || Math.round((data.recommendedDailyHours || 1.0) * 60),
        recommendedDays: data.recommendedDays || 14,
        difficulty: data.difficulty || 'Intermediate',
        pacingRationale: data.pacingRationale || 'Balanced daily pacing for consistent retention.',
        studyTips: data.studyTips || [
          'Study at a regular time each day.',
          'Take brief notes after each lecture.',
          'Practice exercises alongside video lessons.',
        ],
        isFallback: data.isFallback,
        generatedAt: new Date().toISOString(),
      };

      // Save recommendation to course
      await updateCourseStudyGoal(course.id, rec.recommendedDailyMinutes, rec, false);

      return rec;
    } catch (e: any) {
      console.error('Error fetching AI study plan:', e);
      return null;
    }
  };

  // Save Video Progress (upsert, approx every 5s / pause / seek / next / unmount)
  const saveProgress = useCallback(
    async (
      courseId: string,
      videoId: string,
      watchedSeconds: number,
      durationSeconds: number,
      forceCompleted: boolean = false
    ) => {
      if (!videoId || durationSeconds <= 0 || isNaN(watchedSeconds)) return;

      const pct = Math.min(100, Math.round((watchedSeconds / durationSeconds) * 1000) / 10);
      const existing = progressMapRef.current[videoId];

      // Video auto-completes if >= 90% or if forceCompleted or if previously completed
      const isCompleted = forceCompleted || (existing?.completed ?? false) || pct >= 90.0;
      const roundedWatched = Math.max(0, Math.floor(watchedSeconds));

      // Skip redundant write if watchedSeconds within 1 second and completion status unchanged
      if (
        existing &&
        existing.completed === isCompleted &&
        Math.abs((existing.watchedSeconds || 0) - roundedWatched) < 1 &&
        !forceCompleted
      ) {
        return;
      }

      const now = new Date().toISOString();
      const curCourses = coursesRefState.current;
      const curCachedVids = cachedVideosRef.current;
      const curUserId = userIdRef.current;
      const curUser = userRef.current;

      // Find course & video metadata for fast access
      const course = curCourses.find((c) => c.id === courseId);
      const videoList = curCachedVids[courseId] || [];
      const video = videoList.find((v) => v.id === videoId);

      const progressRecord: VideoProgress = {
        userId: curUserId,
        courseId,
        videoId,
        videoTitle: video?.title || existing?.videoTitle || 'Video',
        videoThumbnail: video?.thumbnail || existing?.videoThumbnail || '',
        courseTitle: course?.title || existing?.courseTitle || 'Course',
        channelTitle: course?.channelTitle || existing?.channelTitle || '',
        watchedSeconds: roundedWatched,
        durationSeconds: Math.floor(durationSeconds),
        percentage: pct,
        completed: isCompleted,
        lastWatchedAt: now,
        updatedAt: now,
      };

      // Optimistic local state update
      setProgressMap((prev) => {
        const nextMap = { ...prev, [videoId]: progressRecord };
        if (localStorageProgSaveTimerRef.current) {
          clearTimeout(localStorageProgSaveTimerRef.current);
        }
        localStorageProgSaveTimerRef.current = setTimeout(() => {
          try {
            localStorage.setItem(`${LOCAL_STORAGE_PROGRESS_KEY}_${curUserId}`, JSON.stringify(nextMap));
          } catch {}
        }, 2000);
        return nextMap;
      });

      // Update course's completed video count
      setCourses((prev) => {
        return prev.map((c) => {
          if (c.id === courseId) {
            const vids = curCachedVids[courseId] || [];
            let compCount = 0;
            vids.forEach((v) => {
              const p = v.id === videoId ? progressRecord : progressMapRef.current[v.id];
              if (p?.completed) compCount++;
            });
            const cPct = c.totalVideos > 0 ? Math.round((compCount / c.totalVideos) * 100) : 0;
            return {
              ...c,
              completedVideos: compCount,
              percentage: cPct,
              updatedAt: now,
            };
          }
          return c;
        });
      });

      // Persist to Firestore throttled (at most once every 5 seconds per video unless completed)
      if (curUser) {
        const nowMs = Date.now();
        const lastSync = progressFirestoreThrottleRef.current[videoId] || 0;
        if (isCompleted || forceCompleted || nowMs - lastSync > 5000) {
          progressFirestoreThrottleRef.current[videoId] = nowMs;
          try {
            const progDocRef = doc(db, `users/${curUser.uid}/progress/${videoId}`);
            await setDoc(progDocRef, progressRecord, { merge: true });
          } catch (err) {
            console.warn('Failed to save progress to Firestore (cached locally):', err);
          }
        }
      }
    },
    []
  );

  // Explicit mark as complete toggle
  const markVideoComplete = useCallback(
    async (courseId: string, videoId: string, completed: boolean) => {
      const curUserId = userIdRef.current;
      const curUser = userRef.current;
      const existing = progressMapRef.current[videoId];
      const course = coursesRefState.current.find((c) => c.id === courseId);
      const videoList = cachedVideosRef.current[courseId] || [];
      const video = videoList.find((v) => v.id === videoId);
      const now = new Date().toISOString();

      const duration = existing?.durationSeconds || video?.durationSeconds || 100;
      const watched = completed ? duration : existing?.watchedSeconds || 0;
      const pct = completed ? 100 : existing?.percentage || 0;

      const record: VideoProgress = {
        userId: curUserId,
        courseId,
        videoId,
        videoTitle: video?.title || existing?.videoTitle || 'Video',
        videoThumbnail: video?.thumbnail || existing?.videoThumbnail || '',
        courseTitle: course?.title || existing?.courseTitle || 'Course',
        channelTitle: course?.channelTitle || existing?.channelTitle || '',
        watchedSeconds: watched,
        durationSeconds: duration,
        percentage: pct,
        completed,
        lastWatchedAt: now,
        updatedAt: now,
      };

      setProgressMap((prev) => {
        const next = { ...prev, [videoId]: record };
        try {
          localStorage.setItem(`${LOCAL_STORAGE_PROGRESS_KEY}_${curUserId}`, JSON.stringify(next));
        } catch {}
        return next;
      });

      setCourses((prev) => {
        return prev.map((c) => {
          if (c.id === courseId) {
            const vids = cachedVideosRef.current[courseId] || [];
            let compCount = 0;
            vids.forEach((v) => {
              const p = v.id === videoId ? record : progressMapRef.current[v.id];
              if (p?.completed) compCount++;
            });
            const cPct = c.totalVideos > 0 ? Math.round((compCount / c.totalVideos) * 100) : 0;
            return {
              ...c,
              completedVideos: compCount,
              percentage: cPct,
              updatedAt: now,
            };
          }
          return c;
        });
      });

      if (curUser) {
        try {
          const progDocRef = doc(db, `users/${curUser.uid}/progress/${videoId}`);
          await setDoc(progDocRef, record, { merge: true });
        } catch (err) {
          console.warn('Failed to toggle completion in Firestore:', err);
        }
      }
    },
    []
  );

  const getVideoProgress = useCallback(
    (videoId: string): VideoProgress | undefined => {
      return progressMap[videoId];
    },
    [progressMap]
  );

  // Derived: Continue Learning Hero Video
  const continueLearningVideo = useMemo(() => {
    // Look for most recently watched incomplete video, or most recent video
    const sorted = (Object.values(progressMap) as VideoProgress[])
      .filter((p) => p.lastWatchedAt && p.watchedSeconds > 0)
      .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());

    if (sorted.length === 0) {
      // Fallback: If no progress yet, but we have courses, pick the first video of the first course
      if (courses.length > 0) {
        const firstCourse = courses[0];
        const vids = cachedVideos[firstCourse.id];
        if (vids && vids.length > 0) {
          const firstVid = vids[0];
          return {
            course: firstCourse,
            video: firstVid,
            progress: {
              userId,
              courseId: firstCourse.id,
              videoId: firstVid.id,
              videoTitle: firstVid.title,
              videoThumbnail: firstVid.thumbnail,
              courseTitle: firstCourse.title,
              channelTitle: firstCourse.channelTitle,
              watchedSeconds: 0,
              durationSeconds: firstVid.durationSeconds,
              percentage: 0,
              completed: false,
              lastWatchedAt: firstCourse.createdAt,
              updatedAt: firstCourse.createdAt,
            },
          };
        }
      }
      return null;
    }

    // Try finding the first uncompleted recent video
    const uncompleted = sorted.find((p) => !p.completed);
    const targetProgress = uncompleted || sorted[0];

    const course = courses.find((c) => c.id === targetProgress.courseId);
    const vids = cachedVideos[targetProgress.courseId] || [];
    const video = vids.find((v) => v.id === targetProgress.videoId) || {
      id: targetProgress.videoId,
      courseId: targetProgress.courseId,
      title: targetProgress.videoTitle || 'Video',
      description: '',
      thumbnail: targetProgress.videoThumbnail || '',
      channelTitle: targetProgress.channelTitle || '',
      position: 0,
      durationSeconds: targetProgress.durationSeconds,
      durationFormatted: '',
    };

    if (!course) return null;

    return {
      course,
      video,
      progress: targetProgress,
    };
  }, [progressMap, courses, cachedVideos, userId]);

  // Derived: Recently Watched list (sorted by lastWatchedAt desc)
  const recentlyWatchedList = useMemo(() => {
    return (Object.values(progressMap) as VideoProgress[])
      .filter((p) => p.lastWatchedAt && (p.watchedSeconds > 0 || p.completed))
      .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
      .slice(0, 10)
      .map((p) => {
        const course = courses.find((c) => c.id === p.courseId);
        const vids = cachedVideos[p.courseId] || [];
        const video = vids.find((v) => v.id === p.videoId);
        return { course, video, progress: p };
      });
  }, [progressMap, courses, cachedVideos]);

  // Derived: Bookmarked courses
  const bookmarkedCourses = useMemo(() => {
    return courses.filter((c) => c.isBookmarked);
  }, [courses]);

  // Derived: Bookmarked videos
  const bookmarkedVideos = useMemo(() => {
    const list: Array<{ course?: Course; video: CourseVideo }> = [];
    Object.entries(cachedVideos).forEach(([courseId, vids]) => {
      const course = courses.find((c) => c.id === courseId);
      (vids as CourseVideo[]).forEach((v) => {
        if (v.isBookmarked) {
          list.push({ course, video: v });
        }
      });
    });
    return list;
  }, [cachedVideos, courses]);

  return (
    <LearnTrackContext.Provider
      value={{
        theme,
        setTheme,
        courses,
        progressMap,
        stats,
        loading,
        activeCourseId,
        activeVideoId,
        setActiveVideo,
        currentView,
        setCurrentView,
        openCourse,
        openVideo,
        importPlaylist,
        deleteCourse,
        toggleCourseBookmark,
        toggleVideoBookmark,
        getCourseVideos,
        cachedVideos,
        updateCourseStudyGoal,
        updateCourseStudySchedule,
        fetchAiStudyPlan,
        saveProgress,
        markVideoComplete,
        getVideoProgress,
        continueLearningVideo,
        recentlyWatchedList,
        bookmarkedCourses,
        bookmarkedVideos,
        isSearchOpen,
        setIsSearchOpen,
        isAddCourseOpen,
        setIsAddCourseOpen,
      }}
    >
      {children}
    </LearnTrackContext.Provider>
  );
};

export function useLearnTrack(): LearnTrackContextType {
  const context = useContext(LearnTrackContext);
  if (!context) {
    throw new Error('useLearnTrack must be used within a LearnTrackProvider');
  }
  return context;
}
