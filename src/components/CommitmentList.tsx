import React, { useState } from 'react';
import { useCommitments } from '../context/CommitmentContext';
import { useLearnTrack } from '../context/LearnTrackContext';
import { Plus, Target, CheckCircle2, Clock, Play } from 'lucide-react';
import { formatSeconds } from '../utils/formatters';
import { CommitmentModal } from './CommitmentModal';

export const CommitmentList: React.FC = () => {
  const { commitments, todayRecords, getMissedDays } = useCommitments();
  const { courses, openVideo, setCurrentView } = useLearnTrack();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  if (commitments.length === 0) {
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
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            + Create Commitment
          </button>
        </div>
        <CommitmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Daily Commitments</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-medium text-[var(--ink-faint)] hover:text-[var(--ink)] flex items-center gap-1 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {commitments.map(c => {
           const course = courses.find(x => x.id === c.courseId);
           const today = todayRecords[c.courseId];
           const missed = getMissedDays(c.courseId);
           
           if (!course) return null;
           
           return (
             <div key={c.id} className="bg-[var(--surface-low)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 pr-4">
                    <h3 className="font-semibold text-sm text-[var(--ink)] line-clamp-1">{course.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--ink-dim)]">
                      <Target className="w-3 h-3 text-[var(--accent)]" /> {c.dailyTargetMinutes} min / day
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
                        {today ? today.actualMinutes : 0} / {c.dailyTargetMinutes} min
                     </span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--surface-high)] rounded-full overflow-hidden">
                     <div 
                        className={`h-full transition-all ${today?.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-[var(--accent)]'}`}
                        style={{ width: `${Math.min(100, ((today?.actualMinutes || 0) / c.dailyTargetMinutes) * 100)}%` }}
                     />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                   <div className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-1 rounded-md">
                     {missed} {missed === 1 ? 'Day' : 'Days'} Missed
                   </div>
                   
                   {today?.status !== 'COMPLETED' && (
                     <button onClick={() => {
                        setCurrentView('course-detail');
                     }} className="text-xs font-semibold text-[var(--ink)] bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] px-3 py-1.5 rounded-full border border-[var(--border)] transition">
                        Study Now
                     </button>
                   )}
                </div>
             </div>
           );
        })}
      </div>
      <CommitmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
