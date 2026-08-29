import React, { useState } from 'react';
import { useCommitments } from '../context/CommitmentContext';
import { useLearnTrack } from '../context/LearnTrackContext';
import { Plus, Target, CheckCircle2, Clock, Play, Trash2 } from 'lucide-react';
import { formatSeconds } from '../utils/formatters';
import { CommitmentModal } from './CommitmentModal';
import { getCourseRemainingTimeStats } from '../utils/formatters';
import { calculateCourseDeadlinePacing } from '../utils/studyPlanner';
import { progressStore } from '../store/progressStore';

export const CommitmentList: React.FC = () => {
  const { commitments, todayRecords, getMissedDays, deleteCommitment } = useCommitments();
  const { courses, openVideo, setCurrentView, cachedVideos } = useLearnTrack();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<any>(null);
  const [deletingCommitment, setDeletingCommitment] = useState<any>(null);
  
  const progressMap = React.useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot);

  const activeCommitments = commitments.filter(c => c.status === "active");
  if (activeCommitments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Daily Commitments</h2>
        </div>
        <div className="bg-[var(--surface-low)] border border-dashed border-[var(--border)] rounded-[20px] p-8 text-center space-y-3">
          <p className="text-sm text-[var(--ink-dim)]">
            Create a daily study commitment to stay on track.
          </p>
          <button
            onClick={() => {
              setEditingCommitment(null);
              setIsModalOpen(true);
            }}
            className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
          >
            + Create Commitment
          </button>
        </div>
        <CommitmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} existingCommitment={editingCommitment} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Daily Commitments</h2>
        <button
          onClick={() => {
            setEditingCommitment(null);
            setIsModalOpen(true);
          }}
          className="text-xs font-medium text-[var(--ink-faint)] hover:text-[var(--ink)] flex items-center gap-1 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeCommitments.map(c => {
           const course = courses.find(x => x.id === c.courseId);
           const today = todayRecords[c.courseId];
           const missed = getMissedDays(c.courseId);
           
           if (!course) return null;
           
           const vids = cachedVideos[course.id] || [];
           const stats = getCourseRemainingTimeStats(course, vids, progressMap);
           const pacing = calculateCourseDeadlinePacing(course, stats);
           
           const dailyTargetMinutes = course.studySchedule?.dailyGoalMinutes || course.studyGoal?.dailyQuotaMinutes || 60;
           
           return (
             <div key={c.id} className="bg-[var(--surface-low)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 pr-4">
                    <h3 className="font-semibold text-sm text-[var(--ink)] line-clamp-1">{course.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--ink-dim)]">
                      <Target className="w-3 h-3 text-[var(--accent)]" /> 
                      {Math.round(dailyTargetMinutes >= 60 ? dailyTargetMinutes / 60 : dailyTargetMinutes)} {dailyTargetMinutes >= 60 ? 'hr' : 'min'} / day
                    </div>
                  </div>
                  {today?.status === 'COMPLETED' ? (
                     <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                       <CheckCircle2 className="w-5 h-5" />
                     </div>
                  ) : (
                     <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                       <Clock className="w-5 h-5" />
                     </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                     <span className="text-[var(--ink-dim)]">Today's Progress</span>
                     <span className={today?.status === 'COMPLETED' ? 'text-emerald-400' : 'text-[var(--ink)]'}>
                        {today ? today.actualMinutes : 0} / {dailyTargetMinutes} min
                     </span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--surface-high)] rounded-full overflow-hidden">
                     <div 
                        className={`h-full transition-all ${today?.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-[var(--accent)]'}`}
                        style={{ width: `${Math.min(100, ((today?.actualMinutes || 0) / dailyTargetMinutes) * 100)}%` }}
                     />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                   <div className="flex flex-col gap-1">
                     <div className="text-[10px] font-semibold text-[var(--ink-dim)]">
                       Expected: {pacing.currentEstimatedDeadlineFormatted}
                     </div>
                     <div className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md self-start">
                       {missed} {missed === 1 ? 'Day' : 'Days'} Missed
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-2">
                     {today?.status !== 'COMPLETED' && (
                       <button onClick={() => {
                          setCurrentView('course-detail');
                       }} className="text-xs font-semibold text-[var(--ink)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] px-3 py-1.5 rounded-full border border-[var(--border)] transition cursor-pointer">
                          Study Now
                       </button>
                     )}
                     <button onClick={() => {
                        setEditingCommitment(c);
                        setIsModalOpen(true);
                     }} className="text-xs font-semibold text-[var(--ink)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] px-3 py-1.5 rounded-full border border-[var(--border)] transition cursor-pointer">
                        Edit
                     </button>
                     <button onClick={() => {
                        setDeletingCommitment(c);
                     }} className="text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/20 transition cursor-pointer flex items-center justify-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                     </button>
                   </div>
                </div>
             </div>
           );
        })}
      </div>
      <CommitmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} existingCommitment={editingCommitment} />
      
      {/* Delete Confirmation Modal */}
      {deletingCommitment && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeletingCommitment(null)} />
          <div className="relative w-full max-w-sm bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] shadow-2xl p-6 overflow-hidden">
            <h2 className="text-xl font-bold text-[var(--ink)] mb-3">Delete Study Commitment?</h2>
            <div className="text-sm text-[var(--ink-dim)] space-y-3 mb-6">
              <p>This will stop future study reminders for this course.</p>
              <p>Your course progress and learning history will <strong>NOT</strong> be deleted.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDeletingCommitment(null)}
                className="flex-1 py-2.5 bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[var(--ink)] font-semibold rounded-xl transition cursor-pointer border border-[var(--border)]"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteCommitment(deletingCommitment.id);
                  setDeletingCommitment(null);
                }}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition cursor-pointer"
              >
                Delete Commitment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
