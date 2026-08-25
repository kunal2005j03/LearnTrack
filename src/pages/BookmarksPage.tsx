import React from 'react';
import { useLearnTrack } from '../context/LearnTrackContext';
import { CourseCard } from '../components/CourseCard';
import { Bookmark, Play } from 'lucide-react';
import { formatSeconds } from '../utils/formatters';

export const BookmarksPage: React.FC = () => {
  const { bookmarkedCourses, bookmarkedVideos, openVideo } = useLearnTrack();

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
          Saved Archive
        </h1>
        <p className="text-sm text-[var(--ink-dim)] mt-1">
          Your bookmarked courses and pinned video lectures.
        </p>
      </div>

      {/* Bookmarked Courses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
            <span>Saved Courses</span>
            <span className="text-xs text-[var(--ink-faint)]">
              ({bookmarkedCourses.length})
            </span>
          </h2>
        </div>

        {bookmarkedCourses.length === 0 ? (
          <div className="p-8 text-center bg-[var(--surface-low)] border border-dashed border-[var(--border)] rounded-[20px] text-xs text-[var(--ink-dim)]">
            No courses bookmarked yet. Click the bookmark icon on any course card to pin it here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarkedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>

      {/* Bookmarked Lessons Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
            <span>Pinned Video Lectures</span>
            <span className="text-xs text-[var(--ink-faint)]">
              ({bookmarkedVideos.length})
            </span>
          </h2>
        </div>

        {bookmarkedVideos.length === 0 ? (
          <div className="p-8 text-center bg-[var(--surface-low)] border border-dashed border-[var(--border)] rounded-[20px] text-xs text-[var(--ink-dim)]">
            No individual lessons bookmarked yet. Bookmark key lectures while watching to catalog them here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {bookmarkedVideos.map(({ course, video }) => (
              <div
                key={video.id}
                onClick={() => {
                  if (course) openVideo(course.id, video.id);
                }}
                className="group bg-[var(--surface-low)] border border-[var(--border)] rounded-[20px] p-3.5 hover:border-[var(--ink-faint)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-3 border border-[var(--border)]">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-85"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-medium">
                    {video.durationFormatted || formatSeconds(video.durationSeconds)}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-[0.1em] mb-1 truncate">
                    {course?.title || 'Lecture Series'}
                  </div>
                  <h4 className="text-xs font-semibold text-[var(--ink)] line-clamp-2">
                    {video.title}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
