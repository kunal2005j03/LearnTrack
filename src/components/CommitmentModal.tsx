import React, { useState } from 'react';
import { useCommitments } from '../context/CommitmentContext';
import { useLearnTrack } from '../context/LearnTrackContext';
import { X, Calendar, Clock, Target } from 'lucide-react';
import { getLocalDateString } from '../utils/formatters';

interface CommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommitmentModal: React.FC<CommitmentModalProps> = ({ isOpen, onClose }) => {
  const { createCommitment } = useCommitments();
  const { courses } = useLearnTrack();
  
  const [courseId, setCourseId] = useState('');
  const [reminderTime, setReminderTime] = useState('19:00');

  // Set default when courses load
  React.useEffect(() => {
    if (courses.length > 0 && !courseId) {
       setCourseId(courses[0].id);
    }
  }, [courses]);
  const [startDate, setStartDate] = useState(getLocalDateString(new Date()));
  const [endDate, setEndDate] = useState(getLocalDateString(new Date(Date.now() + 30 * 86400000))); // default 30 days
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setIsSubmitting(true);
    try {
      await createCommitment({
        courseId,
        reminderTime,
        startDate,
        endDate,
        dailyTargetMinutes
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] shadow-2xl p-6 overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)] transition">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-[var(--ink)] mb-6">Create Study Commitment</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--ink-dim)]">Course</label>
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="w-full bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
              required
            >
              <option value="">Select a course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--ink-dim)] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Daily Reminder Time
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={e => setReminderTime(e.target.value)}
              className="w-full bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
               <label className="text-xs font-semibold text-[var(--ink-dim)] flex items-center gap-1.5">
                 <Calendar className="w-3.5 h-3.5" /> Start Date
               </label>
               <input
                 type="date"
                 value={startDate}
                 onChange={e => setStartDate(e.target.value)}
                 className="w-full bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                 required
               />
             </div>
             <div className="space-y-1.5">
               <label className="text-xs font-semibold text-[var(--ink-dim)] flex items-center gap-1.5">
                 <Calendar className="w-3.5 h-3.5" /> End Date
               </label>
               <input
                 type="date"
                 value={endDate}
                 onChange={e => setEndDate(e.target.value)}
                 min={startDate}
                 className="w-full bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                 required
               />
             </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--ink-dim)] flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Daily Target (Minutes)
            </label>
            <input
              type="number"
              min={1}
              value={dailyTargetMinutes}
              onChange={e => setDailyTargetMinutes(parseInt(e.target.value))}
              className="w-full bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
              required
            />
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !courseId}
              className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Commitment'}
            </button>
            <p className="text-center text-[10px] text-[var(--ink-faint)] mt-3">
              This will create a daily reminder in Google Tasks.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
