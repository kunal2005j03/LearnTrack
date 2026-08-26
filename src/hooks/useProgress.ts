import { useSyncExternalStore, useRef, useEffect, useState } from 'react';
import { progressStore } from '../store/progressStore';
import { VideoProgress, UserStats, Course, CourseVideo } from '../types';

export function useProgressMap() {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot);
}

export function useStats() {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getStats);
}

export function useProgressSelector<T>(selector: (map: Record<string, VideoProgress>) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const [state, setState] = useState(() => selector(progressStore.getSnapshot()));
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);
  
  selectorRef.current = selector;
  isEqualRef.current = isEqual;

  useEffect(() => {
    return progressStore.subscribe(() => {
      const nextState = selectorRef.current(progressStore.getSnapshot());
      setState((prevState) => {
        if (isEqualRef.current(prevState, nextState)) {
          return prevState;
        }
        return nextState;
      });
    });
  }, []);

  return state;
}

import { useLearnTrack } from '../context/LearnTrackContext';
import { useMemo } from 'react';

export function useContinueLearningVideo() {
  const { courses, cachedVideos } = useLearnTrack();
  

  return useProgressSelector((progressMap) => {
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
              userId: '',
              courseId: firstCourse.id,
              videoId: firstVid.id,
              videoTitle: firstVid.title,
              videoThumbnail: firstVid.thumbnail,
              courseTitle: firstCourse.title,
              channelTitle: firstCourse.channelTitle,
              watchedSeconds: 0,
              durationSeconds: firstVid.durationSeconds || 0,
              percentage: 0,
              completed: false,
              lastWatchedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as VideoProgress
          };
        }
      }
      return null;
    }

    // Find the first incomplete video in the sorted list
    let recent = sorted.find((p) => !p.completed);
    if (!recent) {
      // If all watched videos are completed, just use the absolute most recent one
      recent = sorted[0];
    }

    const course = courses.find((c) => c.id === recent?.courseId);
    let video: CourseVideo | undefined;

    if (course && cachedVideos[course.id]) {
      video = cachedVideos[course.id].find((v) => v.id === recent?.videoId);
    }

    if (course && video && recent) {
      return { course, video, progress: recent };
    }

    return null;
  }, (a, b) => a?.video?.id === b?.video?.id && a?.course?.id === b?.course?.id); // Only re-render if the target video changes!
}
