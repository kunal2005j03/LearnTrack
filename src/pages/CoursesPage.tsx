import React, { useState, useMemo } from 'react';
import { useLearnTrack } from '../context/LearnTrackContext';
import { CourseCard } from '../components/CourseCard';
import { Plus, Search } from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const { courses, setIsAddCourseOpen } = useLearnTrack();
  const [filterTab, setFilterTab] = useState<'all' | 'in_progress' | 'completed' | 'bookmarked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Tab filter
      if (filterTab === 'in_progress' && (c.percentage === 100 || c.percentage === 0)) return false;
      if (filterTab === 'completed' && c.percentage < 100) return false;
      if (filterTab === 'bookmarked' && !c.isBookmarked) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.channelTitle.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [courses, filterTab, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
            My Courses ({courses.length})
          </h1>
          <p className="text-sm text-[var(--ink-dim)] mt-1">
            Browse and manage your enrolled playlists and learning modules.
          </p>
        </div>

        <button
          onClick={() => setIsAddCourseOpen(true)}
          className="bg-[var(--ink)] text-[var(--bg)] px-5 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 hover:-translate-y-0.5 transition shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All (${courses.length})` },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
            { id: 'bookmarked', label: 'Bookmarked' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition shrink-0 ${
                filterTab === tab.id
                  ? 'bg-[var(--surface-high)] text-[var(--ink)] border border-[var(--border)] shadow-sm'
                  : 'text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-low)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-[var(--ink-faint)] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface-low)] border border-[var(--border)] rounded-full text-xs text-[var(--ink)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-[var(--surface-low)] border border-dashed border-[var(--border)] rounded-[24px] space-y-4">
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-semibold text-[var(--ink)]">
              No matching courses found
            </h3>
            <p className="text-xs text-[var(--ink-dim)]">
              {searchQuery
                ? `No courses matched "${searchQuery}". Try a different keyword.`
                : 'Add your first course playlist to start your track.'}
            </p>
          </div>
          <button
            onClick={() => setIsAddCourseOpen(true)}
            className="bg-[var(--surface-high)] text-[var(--ink)] border border-[var(--border)] px-5 py-2 rounded-full text-xs font-medium hover:bg-[var(--surface-mid)] transition"
          >
            <Plus className="w-3.5 h-3.5 inline mr-1" /> Ingest Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
};
