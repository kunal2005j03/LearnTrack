import { VideoProgress, UserStats, Course, CourseVideo } from '../types';

type Listener = () => void;

class ProgressStore {
  private listeners = new Set<Listener>();
  private progressMap: Record<string, VideoProgress> = {};
  
  // Also track some derived things that change often to avoid thrashing other contexts
  public stats: UserStats = {
    totalCourses: 0,
    completedVideos: 0,
    totalWatchSeconds: 0,
    overallProgress: 0,
    currentStreak: 0,
    bestStreak: 0,
    activeDates: [],
    lastActiveDate: '',
  };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getSnapshot = () => {
    return this.progressMap;
  }

  getStats = () => {
    return this.stats;
  }

  set = (newMap: Record<string, VideoProgress>) => {
    let hasChanges = false;
    // only update if different references or values
    if (this.progressMap !== newMap) {
      this.progressMap = newMap;
      hasChanges = true;
    }
    if (hasChanges) {
      this.emit();
    }
  }

  update = (videoId: string, progress: VideoProgress) => {
    this.progressMap = { ...this.progressMap, [videoId]: progress };
    this.emit();
  }

  setStats = (stats: UserStats) => {
    this.stats = stats;
    this.emit();
  }

  private emit = () => {
    this.listeners.forEach((l) => l());
  }
}

export const progressStore = new ProgressStore();
