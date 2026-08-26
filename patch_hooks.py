with open("src/hooks/useProgress.ts", "r") as f:
    code = f.read()

append = """
import { useLearnTrack } from '../context/LearnTrackContext';
import { useMemo } from 'react';

export function useContinueLearningVideo() {
  const { courses, cachedVideos } = useLearnTrack();
  const progressMap = useProgressMap();

  return useMemo(() => {
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
  }, [progressMap, courses, cachedVideos]);
}
"""

with open("src/hooks/useProgress.ts", "w") as f:
    f.write(code + append)
