import React, { useState, useEffect, useMemo } from 'react';
import { useCommitments } from '../context/CommitmentContext';
import { useLearnTrack } from '../context/LearnTrackContext';
import { X, Calendar, Clock, Target } from 'lucide-react';
import { getLocalDateString } from '../utils/formatters';
import { getCourseRemainingTimeStats } from '../utils/formatters';
import { calculateCourseDeadlinePacing, getISODateOnly } from '../utils/studyPlanner';
import { progressStore } from '../store/progressStore';
import { StudyCommitment } from '../types';

interface CommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCommitment?: StudyCommitment;
}

export const CommitmentModal: React.FC<CommitmentModalProps> = ({ isOpen, onClose, existingCommitment }) => {
  const { createCommitment, updateCommitment, commitments } = useCommitments();
  const { courses, cachedVideos, updateCourseStartDate, updateCourseStudyGoal } = useLearnTrack();
  const progressMap = React.useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot);
  
  const [courseId, setCourseId] = useState('');
  const [reminderTime, setReminderTime] = useState('19:00');
  const [startDate, setStartDate] = useState(getLocalDateString(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate available courses
  const availableCourses = useMemo(() => {
    if (existingCommitment) {
       // In edit mode, we just need the one existing course to show up in the dropdown
       return courses.filter(c => c.id === existingCommitment.courseId);
    }
    const activeCourseIds = new Set(
      commitments.filter(c => c.status === 'active').map(c => c.courseId)
    );
    return courses.filter(c => !activeCourseIds.has(c.id));
  }, [courses, commitments, existingCommitment]);

  // Setup form based on whether it's create or edit
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setCreated(false);
      setSyncStatus('idle');
      if (existingCommitment) {
        setCourseId(existingCommitment.courseId);
        setReminderTime(existingCommitment.reminderTime || '19:00');
        setStartDate(existingCommitment.startDate || getLocalDateString(new Date()));
      } else if (availableCourses.length > 0) {
        // If we previously selected a course that is no longer available, or haven't selected one
        if (!courseId || !availableCourses.find(c => c.id === courseId)) {
          setCourseId(availableCourses[0].id);
        }
        setReminderTime('19:00');
        setStartDate(getLocalDateString(new Date()));
      } else {
        setCourseId('');
      }
    }
  }, [isOpen, existingCommitment]); // Only re-run when modal opens or edit target changes

  // Sync state with selected course
  const selectedCourse = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);

  useEffect(() => {
    if (!existingCommitment && selectedCourse && selectedCourse.studyGoal?.initialStartDate) {
       setStartDate(selectedCourse.studyGoal.initialStartDate);
    }
  }, [selectedCourse, existingCommitment]);

  const courseStats = useMemo(() => {
    if (!selectedCourse) return null;
    const vids = cachedVideos[selectedCourse.id] || [];
    return getCourseRemainingTimeStats(selectedCourse, vids, progressMap);
  }, [selectedCourse, cachedVideos, progressMap]);

  const pacing = useMemo(() => {
    if (!selectedCourse || !courseStats) return null;
    return calculateCourseDeadlinePacing(selectedCourse, courseStats);
  }, [selectedCourse, courseStats]);

  const dailyGoalMinutes = selectedCourse?.studySchedule?.dailyGoalMinutes || selectedCourse?.studyGoal?.dailyQuotaMinutes || 60;
  
  const expectedStudyHours = courseStats ? Math.ceil(courseStats.remainingSeconds / 3600) : 0;
  const expectedStudyHoursFormatted = expectedStudyHours > 0 ? `${expectedStudyHours} hours` : `${courseStats ? Math.ceil(courseStats.remainingSeconds / 60) : 0} minutes`;

  const handleStartDateChange = async (newDate: string) => {
    setStartDate(newDate);
    if (courseId) {
      // Fire and forget so we don't block
      updateCourseStartDate(courseId, newDate).catch(console.error);
    }
  };

  const handleDailyGoalChange = async (newMinutes: number) => {
    if (courseId) {
      // Fire and forget so we don't block
      updateCourseStudyGoal(courseId, newMinutes).catch(console.error);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (created) {
      onClose();
      return;
    }
    if (!courseId || !selectedCourse || !pacing) return;
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      let syncPromise: Promise<void> | null = null;
      if (existingCommitment) {
        const res = await updateCommitment(existingCommitment.id, {
          reminderTime,
          startDate
        });
        syncPromise = res.syncPromise;
      } else {
        const res = await createCommitment({
          courseId,
          reminderTime,
          startDate,
          initialExpectedCompletionDate: pacing.initialTargetDeadline,
        });
        syncPromise = res.syncPromise;
      }
      
      setIsSubmitting(false);
      setCreated(true);
      
      if (syncPromise) {
        setSyncStatus('syncing');
        syncPromise.then(() => {
          setSyncStatus('success');
          setTimeout(() => onClose(), 1500);
        }).catch(() => {
          setSyncStatus('error');
        });
      } else {
        onClose();
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'An error occurred while saving the commitment.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="p-5 sm:p-6 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface-low)] z-10">
          <h2 className="text-xl font-bold text-[var(--ink)]">
            {existingCommitment ? 'Edit Study Commitment' : 'Create Study Commitment'}
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)] transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {errorMsg}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--ink-dim)]">Course</label>
            {availableCourses.length === 0 && !existingCommitment ? (
              <div className="w-full bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink-dim)]">
                No courses available for a new commitment.
              </div>
            ) : (
              <select
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
                disabled={!!existingCommitment}
                className="w-full bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
                required
              >
                <option value="">Select a course</option>
                {availableCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ink-dim)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Reminder Time
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
                className="w-full bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ink-dim)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => handleStartDateChange(e.target.value)}
                className="w-full bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--ink-dim)] flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Daily Goal
            </label>
            <select
              value={dailyGoalMinutes}
              onChange={e => handleDailyGoalChange(Number(e.target.value))}
              disabled={!courseId}
              className="w-full bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
            >
              <option value={15}>15 min/day</option>
              <option value={30}>30 min/day</option>
              <option value={45}>45 min/day</option>
              <option value={60}>1 hr/day</option>
              <option value={90}>1.5 hr/day</option>
              <option value={120}>2 hr/day</option>
              <option value={180}>3 hr/day</option>
              <option value={240}>4 hr/day</option>
            </select>
          </div>

          <div className="bg-[var(--surface-high)] border border-[var(--border)] rounded-xl p-4 grid grid-cols-2 gap-4">
             <div>
               <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--ink-faint)]">Est. Workload</div>
               <div className="text-sm font-medium text-[var(--ink)] mt-0.5">{expectedStudyHoursFormatted}</div>
             </div>
             
             <div>
               <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--ink-faint)]">Est. Duration</div>
               <div className="text-sm font-medium text-[var(--ink)] mt-0.5">{courseStats && dailyGoalMinutes > 0 ? Math.ceil((courseStats.remainingSeconds / 60) / dailyGoalMinutes) : 0} study days</div>
             </div>

             <div>
               <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--ink-faint)]">Initial Target</div>
               <div className="text-sm font-medium text-[var(--ink)] mt-0.5">{pacing?.initialTargetDeadlineFormatted || 'N/A'}</div>
             </div>

             <div>
               <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--ink-faint)]">Current Target</div>
               <div className="text-sm font-medium text-[var(--ink)] mt-0.5">{pacing?.currentEstimatedDeadlineFormatted || 'N/A'}</div>
               {pacing && pacing.daysDelta !== 0 && (
                 <div className="text-[10px] font-medium text-amber-500 mt-0.5">
                   {pacing.daysDelta > 0 ? `+${pacing.daysDelta} days` : `-${Math.abs(pacing.daysDelta)} days`}
                 </div>
               )}
             </div>
          </div>
        </div>
        
        <div className="p-5 sm:p-6 border-t border-[var(--border)] bg-[var(--surface-low)] shrink-0 z-10 pb-[env(safe-area-inset-bottom,1.5rem)]">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (!created && (!courseId || (availableCourses.length === 0 && !existingCommitment)))}
            className={`w-full py-3 text-white font-semibold rounded-xl transition disabled:opacity-50 cursor-pointer flex justify-center items-center gap-2 ${created && syncStatus === 'error' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'}`}
          >
            {created ? (
              syncStatus === 'syncing' ? (existingCommitment ? 'Updated ✅ — Syncing Tasks...' : 'Created ✅ — Syncing Tasks...') :
              syncStatus === 'success' ? 'Tasks Synced ✅' :
              syncStatus === 'error' ? (existingCommitment ? 'Updated ✅ — Tasks Sync Failed ⚠️' : 'Created ✅ — Tasks Sync Failed ⚠️') :
              (existingCommitment ? 'Updated ✅' : 'Created ✅')
            ) : isSubmitting ? (
              existingCommitment ? 'Saving...' : 'Creating...'
            ) : (
              existingCommitment ? 'Save Changes' : 'Create Commitment'
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
};
