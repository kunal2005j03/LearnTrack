import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, getAccessToken } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { StudyCommitment, StudyCommitmentDay } from '../types';
import { playerProgressStore } from '../utils/playerProgress';
import { useLearnTrack } from './LearnTrackContext';
import { getLocalDateString } from '../utils/formatters';

interface CommitmentContextType {
  commitments: StudyCommitment[];
  todayRecords: Record<string, StudyCommitmentDay>; // courseId -> record
  createCommitment: (data: Partial<StudyCommitment>) => Promise<{ commitment: StudyCommitment, syncPromise: Promise<void> | null }>;
  updateCommitment: (id: string, data: Partial<StudyCommitment>) => Promise<{ syncPromise: Promise<void> | null }>;
  deleteCommitment: (id: string) => Promise<void>;
  completeCommitmentByCourseId: (courseId: string) => Promise<void>;
  getMissedDays: (courseId?: string) => number;
}

const CommitmentContext = createContext<CommitmentContextType | undefined>(undefined);

export const CommitmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeCourseId, courses } = useLearnTrack();
  const [commitments, setCommitments] = useState<StudyCommitment[]>([]);
  const [todayRecords, setTodayRecords] = useState<Record<string, StudyCommitmentDay>>({});
  const [allDays, setAllDays] = useState<StudyCommitmentDay[]>([]);
  const activeCourseIdRef = useRef(activeCourseId);
  const commitmentsRef = useRef(commitments);
  const todayRecordsRef = useRef(todayRecords);
  
  useEffect(() => {
    activeCourseIdRef.current = activeCourseId;
  }, [activeCourseId]);

  useEffect(() => {
    commitmentsRef.current = commitments;
  }, [commitments]);

  useEffect(() => {
    todayRecordsRef.current = todayRecords;
  }, [todayRecords]);

  // Firestore listeners for commitments
  useEffect(() => {
    if (!user) {
      setCommitments([]);
      setTodayRecords({});
      setAllDays([]);
      return;
    }
    const unsub = onSnapshot(collection(db, `users/${user.uid}/studyCommitments`), (snap) => {
      const data: StudyCommitment[] = [];
      snap.forEach(d => data.push(d.data() as StudyCommitment));
      setCommitments(data);
    });
    return () => unsub();
  }, [user]);

  // Firestore listeners for days
  useEffect(() => {
    if (!user) return;
    const todayStr = getLocalDateString(new Date());
    const unsubs: any[] = [];
    commitments.forEach(c => {
      // Listen to all days for stats
      const daysRef = collection(db, `users/${user.uid}/studyCommitments/${c.id}/days`);
      const unsubDays = onSnapshot(daysRef, (snap) => {
        const days: StudyCommitmentDay[] = [];
        let todayRecord: StudyCommitmentDay | null = null;
        snap.forEach(d => {
           const day = d.data() as StudyCommitmentDay;
           days.push(day);
           if (day.id === todayStr) todayRecord = day;
        });
        
        setAllDays(prev => {
          const filtered = prev.filter(d => d.commitmentId !== c.id);
          return [...filtered, ...days];
        });

        if (todayRecord) {
          setTodayRecords(prev => ({ ...prev, [c.courseId]: todayRecord! }));
        } else {
          if (c.status === 'active' && todayStr >= c.startDate) {
             const maxDate = c.endDate || c.initialExpectedCompletionDate;
             if (!maxDate || todayStr <= maxDate) {
               const newDay: StudyCommitmentDay = {
                 id: todayStr,
                 commitmentId: c.id,
                 userId: user.uid,
                 courseId: c.courseId,
                 date: todayStr,
                 status: 'PENDING',
                 targetMinutes: c.dailyTargetMinutes || 60, // Fallback, normally driven by Course Schedule
                 actualMinutes: 0
               };
               setDoc(doc(db, `users/${user.uid}/studyCommitments/${c.id}/days/${todayStr}`), newDay).catch(console.error);
             } else {
               setTodayRecords(prev => {
                 const copy = { ...prev };
                 delete copy[c.courseId];
                 return copy;
               });
             }
          } else {
             setTodayRecords(prev => {
               const copy = { ...prev };
               delete copy[c.courseId];
               return copy;
             });
          }
        }
      });
      unsubs.push(unsubDays);
    });
    return () => unsubs.forEach(u => u());
  }, [user, commitments]);

  // Track player progress
  const accumulatedSecondsRef = useRef<Record<string, number>>({});
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    return playerProgressStore.subscribe((cur, dur, pct) => {
      const activeId = activeCourseIdRef.current;
      if (!activeId) return;

      const record = todayRecordsRef.current[activeId];
      if (!record || record.status === 'COMPLETED') {
         lastTimeRef.current = cur;
         return;
      }

      const delta = cur - lastTimeRef.current;
      lastTimeRef.current = cur;

      if (delta > 0 && delta <= 1.5) { 
         accumulatedSecondsRef.current[activeId] = (accumulatedSecondsRef.current[activeId] || 0) + delta;
         
         if (accumulatedSecondsRef.current[activeId] >= 60) {
            accumulatedSecondsRef.current[activeId] -= 60;
            const newActual = record.actualMinutes + 1;
            const isCompleted = newActual >= record.targetMinutes;
            const todayStr = getLocalDateString(new Date());
            
            if (user) {
              const p = doc(db, `users/${user.uid}/studyCommitments/${record.commitmentId}/days/${todayStr}`);
              setDoc(p, {
                actualMinutes: newActual,
                status: isCompleted ? 'COMPLETED' : 'PENDING',
                completedAt: isCompleted ? new Date().toISOString() : null
              }, { merge: true });
            }
         }
      }
    });
  }, [user]);

  // We calculate missed days dynamically now.

  const syncGoogleTask = async (commitment: StudyCommitment, courseTitle: string, isDelete: boolean = false) => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      if (isDelete && commitment.googleTaskId && commitment.googleTaskListId) {
        await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${commitment.googleTaskListId}/tasks/${commitment.googleTaskId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        return;
      }

      // We need a task list
      const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
         headers: { Authorization: `Bearer ${token}` }
      });
      const listsData = await listsRes.json();
      const defaultList = listsData.items?.[0]?.id;
      if (!defaultList) return;

      const [hours, minutes] = commitment.reminderTime.split(':');
      const startDateTime = new Date();
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Google Tasks doesn't fully support arbitrary recurring rules via simple API without Google Calendar event binding,
      // but we can set a due date for today. (Real recurring requires Calendar API, Tasks API only supports basic tasks).
      // We will create a task.
      
      const taskBody = {
        title: `Study ${courseTitle} — Daily Session`,
        notes: `LearnTrack daily study commitment\nCourse: ${courseTitle}\nTarget: ${commitment.dailyTargetMinutes} minutes`,
        due: startDateTime.toISOString()
      };

      if (commitment.googleTaskId) {
         if (commitment.status === 'paused' || commitment.status === 'cancelled' || commitment.status === 'completed') {
           // We could delete or complete it
           await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultList}/tasks/${commitment.googleTaskId}`, {
             method: 'DELETE',
             headers: { Authorization: `Bearer ${token}` }
           });
         } else {
           await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultList}/tasks/${commitment.googleTaskId}`, {
             method: 'PUT',
             headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
             body: JSON.stringify({ ...taskBody, id: commitment.googleTaskId })
           });
         }
      } else if (commitment.status === 'active') {
         const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultList}/tasks`, {
           method: 'POST',
           headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
           body: JSON.stringify(taskBody)
         });
         const data = await res.json();
         if (data.id) {
           await setDoc(doc(db, `users/${user!.uid}/studyCommitments/${commitment.id}`), {
             googleTaskListId: defaultList,
             googleTaskId: data.id
           }, { merge: true });
         }
      }
    } catch (e) {
      console.error('Failed to sync Google Task', e);
    }
  };

  const createCommitment = async (data: Partial<StudyCommitment>): Promise<{ commitment: StudyCommitment, syncPromise: Promise<void> | null }> => {
    if (!user) throw new Error('User not authenticated');
    
    // Duplicate protection
    const existingMemory = commitmentsRef.current.find(c => c.courseId === data.courseId && c.status === 'active');
    if (existingMemory) {
       throw new Error('An active study commitment already exists for this course.');
    }
    
    const id = doc(collection(db, 'tmp')).id;
    const commitment: StudyCommitment = {
      id,
      userId: user.uid,
      courseId: data.courseId!,
      startDate: data.startDate!,
      initialExpectedCompletionDate: data.initialExpectedCompletionDate,
      reminderTime: data.reminderTime!,
      timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: 'active',
      createdAt: new Date().toISOString(),
      ...data,
    };
    
    // Optimistic UI update
    setCommitments(prev => [...prev, commitment]);

    // Firestore update (not awaited to prevent blocking UI)
    setDoc(doc(db, `users/${user.uid}/studyCommitments/${id}`), commitment).catch(err => {
      console.error('Failed to save commitment to Firestore:', err);
      // Revert optimistic update on failure
      setCommitments(prev => prev.filter(c => c.id !== id));
    });
    
    const course = courses.find(c => c.id === data.courseId);
    let syncPromise: Promise<void> | null = null;
    if (course) {
       // Fire and forget, don't wait for Google Tasks here
       syncPromise = syncGoogleTask(commitment, course.title);
    }
    return { commitment, syncPromise };
  };

  const updateCommitment = async (id: string, data: Partial<StudyCommitment>): Promise<{ syncPromise: Promise<void> | null }> => {
    if (!user) throw new Error('User not authenticated');
    
    // Optimistic UI update
    setCommitments(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    
    setDoc(doc(db, `users/${user.uid}/studyCommitments/${id}`), data, { merge: true }).catch(err => {
       console.error('Failed to update commitment in Firestore:', err);
       // We don't revert here for simplicity, but real-time listener will correct it if needed
    });
    
    let syncPromise: Promise<void> | null = null;
    const current = commitmentsRef.current.find(c => c.id === id);
    if (current) {
      const updated = { ...current, ...data };
      const course = courses.find(c => c.id === updated.courseId);
      if (course) syncPromise = syncGoogleTask(updated, course.title);
    }
    return { syncPromise };
  };

  const deleteCommitment = async (id: string) => {
    if (!user) return;
    setCommitments(prev => prev.filter(c => c.id !== id));
    const current = commitmentsRef.current.find(c => c.id === id);
    if (current) {
       syncGoogleTask(current, '', true);
    }
    deleteDoc(doc(db, `users/${user.uid}/studyCommitments/${id}`)).catch(console.error);
  };
  
  const completeCommitmentByCourseId = async (courseId: string) => {
    if (!user) return;
    const current = commitmentsRef.current.find(c => c.courseId === courseId && c.status === 'active');
    if (!current) return;
    
    // Optimistic UI update
    setCommitments(prev => prev.map(c => c.id === current.id ? { ...c, status: 'completed' } : c));
    
    setDoc(doc(db, `users/${user.uid}/studyCommitments/${current.id}`), { status: 'completed' }, { merge: true }).catch(console.error);
    
    // Cleanup Google Task
    syncGoogleTask(current, '', true);
  };

  const getMissedDays = (courseId?: string) => {
    let missedCount = 0;
    const todayStr = getLocalDateString(new Date());
    
    commitments.forEach(c => {
       if (courseId && c.courseId !== courseId) return;
       
       // Number of days between start date and today
       if (c.startDate >= todayStr) return; // hasn't started yet
       
       let date = new Date(c.startDate);
       const todayDate = new Date(todayStr);
       
       const maxDate = c.endDate || c.initialExpectedCompletionDate;
       
       // Calculate total expected past days
       let expectedPastDays = 0;
       while (date < todayDate) {
          if (maxDate && getLocalDateString(date) > maxDate) break;
          expectedPastDays++;
          date.setDate(date.getDate() + 1);
       }
       
       // Count how many were completed or exist with actualMinutes > 0 (or whatever logic)
       // Actually, we just need to count how many completed days there are in the past
       const completedPastDays = allDays.filter(d => d.commitmentId === c.id && d.date < todayStr && d.status === 'COMPLETED').length;
       
       // The remainder are missed
       const missed = expectedPastDays - completedPastDays;
       missedCount += Math.max(0, missed);
    });
    
    return missedCount;
  };

  return (
    <CommitmentContext.Provider value={{ commitments, todayRecords, createCommitment, updateCommitment, deleteCommitment, completeCommitmentByCourseId, getMissedDays }}>
      {children}
    </CommitmentContext.Provider>
  );
};

export const useCommitments = () => {
  const ctx = useContext(CommitmentContext);
  if (!ctx) throw new Error('useCommitments must be inside CommitmentProvider');
  return ctx;
};
