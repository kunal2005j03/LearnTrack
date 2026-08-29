import React, { useState, useEffect } from 'react';
import { useProgressMap, useStats, useContinueLearningVideo } from '../hooks/useProgress';
import { useLearnTrack } from '../context/LearnTrackContext';
import { useAuth } from '../context/AuthContext';
import { getAccessToken, connectGoogleTasks, disconnectGoogleTasks } from '../lib/firebase';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Moon,
  Sun,
  Laptop,
  LogOut,
  LogIn,
  ShieldCheck,
  ListTodo } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme, courses } = useLearnTrack();
  const progressMap = useProgressMap();
  const stats = useStats();
  const { user, signInGoogle, signOut, authError } = useAuth();

  const [youtubeStatus, setYoutubeStatus] = useState<{ configured: boolean; message: string }>({
    configured: false,
    message: 'Checking YouTube Data API status...' });
  const [checkingApi, setCheckingApi] = useState(false);

  const [tasksConnected, setTasksConnected] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    getAccessToken().then(token => {
      setTasksConnected(!!token);
      setTasksLoading(false);
    });
  }, []);

  const handleConnectTasks = async () => {
    setTasksLoading(true);
    try {
      await connectGoogleTasks();
      setTasksConnected(true);
    } catch (e) {
      console.error("Failed to connect tasks:", e);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleDisconnectTasks = async () => {
    await disconnectGoogleTasks();
    setTasksConnected(false);
  };

  const checkYouTubeStatus = async () => {
    setCheckingApi(true);
    try {
      const res = await fetch('/api/youtube/status');
      const data = await res.json();
      setYoutubeStatus(data);
    } catch (e: any) {
      setYoutubeStatus({
        configured: false,
        message: 'Could not connect to server status endpoint.' });
    } finally {
      setCheckingApi(false);
    }
  };

  useEffect(() => {
    checkYouTubeStatus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
          Settings & Environment
        </h1>
        <p className="text-sm text-[var(--ink-dim)] mt-1">
          Manage your account profile, theme preferences, and YouTube API connection.
        </p>
      </div>

      {/* Account Section */}
      <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--ink)]">
            Account & Synchronization
          </h2>
          <p className="text-xs text-[var(--ink-dim)] mt-0.5">
            Cloud persistence and user profile
          </p>
        </div>

        {user && !user.isAnonymous ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-high)]">
            <div className="flex items-center gap-3.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || ''}
                  className="w-12 h-12 rounded-full border border-[var(--border)] object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-lg">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-[var(--ink)]">
                  {user.displayName || 'Learner'}
                </div>
                <div className="text-xs text-[var(--ink-dim)] font-mono">{user.email}</div>
                <div className="text-[10px] text-[var(--ink-faint)] font-mono mt-0.5">UID: {user.uid}</div>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="px-4 py-2 rounded-full border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-medium flex items-center gap-2 transition self-start sm:self-auto"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-high)]">
            <div>
              <div className="text-sm font-semibold text-[var(--ink)]">
                Anonymous Guest Session
              </div>
              <p className="text-xs text-[var(--ink-dim)] mt-0.5">
                Sign in with Google to synchronize your course catalog and watch progress across devices.
              </p>
              {authError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {authError}
                </p>
              )}
            </div>

            <button
              onClick={() => signInGoogle().catch(console.warn)}
              className="px-5 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg)] text-xs font-semibold hover:-translate-y-0.5 flex items-center gap-2 transition self-start sm:self-auto shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in with Google
            </button>
          </div>
        )}
      </div>

      {/* Google Tasks Integration Section */}
      <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-[var(--accent)]" />
              Google Tasks Integration
            </h2>
            <p className="text-xs text-[var(--ink-dim)] mt-0.5">
              Sync study reminders to your Google Tasks
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-high)] space-y-3">
          {tasksLoading ? (
             <div className="text-sm text-[var(--ink-dim)]">Checking connection status...</div>
          ) : tasksConnected ? (
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                 <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                   <CheckCircle2 className="w-4 h-4" /> Connected
                 </div>
                 <div className="text-xs text-[var(--ink-dim)] mt-1">
                   Connected to Google Tasks as <span className="font-medium text-[var(--ink)]">{user?.email}</span>
                 </div>
               </div>
               <button onClick={handleDisconnectTasks} className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-mid)] text-sm font-semibold text-[var(--ink)] transition">
                 Disconnect
               </button>
             </div>
          ) : (
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div className="text-sm text-[var(--ink-dim)]">
                 Not connected. Enable Google Tasks to receive daily study reminders.
               </div>
               <button onClick={handleConnectTasks} className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition">
                 Connect Google Tasks
               </button>
             </div>
          )}
        </div>
      </div>

      {/* YouTube API Integration Section */}
      <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--ink)]">
              YouTube Data API v3
            </h2>
            <p className="text-xs text-[var(--ink-dim)] mt-0.5">
              Server-side playlist and duration resolver
            </p>
          </div>

          <button
            onClick={checkYouTubeStatus}
            disabled={checkingApi}
            className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--surface-high)] text-[var(--ink)] transition"
            title="Refresh API Status"
          >
            <RefreshCw className={`w-4 h-4 ${checkingApi ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* API Status Box */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-high)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-dim)]">Status:</span>
            <div
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                youtubeStatus.configured
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {youtubeStatus.configured ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Operational
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  Key Unset (Demo Fallback Active)
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-[var(--ink-dim)] leading-relaxed">
            {youtubeStatus.message}
          </p>

          <div className="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--ink-faint)] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              The YOUTUBE_API_KEY environment variable is isolated server-side.
            </span>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--ink)]">
            Theme & Appearance
          </h2>
          <p className="text-xs text-[var(--ink-dim)] mt-0.5">
            Choose your preferred color mode
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
              theme === 'light'
                ? 'border-[var(--accent)] bg-[var(--surface-high)] text-[var(--ink)] shadow-sm'
                : 'border-[var(--border)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)]'
            }`}
          >
            <Sun className="w-5 h-5" />
            <span className="text-xs font-medium">Light</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
              theme === 'dark'
                ? 'border-[var(--accent)] bg-[var(--surface-high)] text-[var(--ink)] shadow-sm'
                : 'border-[var(--border)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)]'
            }`}
          >
            <Moon className="w-5 h-5" />
            <span className="text-xs font-medium">Dark</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-4 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
              theme === 'system'
                ? 'border-[var(--accent)] bg-[var(--surface-high)] text-[var(--ink)] shadow-sm'
                : 'border-[var(--border)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)]'
            }`}
          >
            <Laptop className="w-5 h-5" />
            <span className="text-xs font-medium">System</span>
          </button>
        </div>
      </div>

      {/* Progress Ledger */}
      <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--ink)]">
            Account Stats Summary
          </h2>
          <p className="text-xs text-[var(--ink-dim)] mt-0.5">
            Real-time tracking ledger
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-high)]">
            <div className="text-xl font-bold text-[var(--ink)]">{courses.length}</div>
            <div className="text-[10px] uppercase font-semibold text-[var(--ink-faint)] tracking-wider mt-1">Courses</div>
          </div>
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-high)]">
            <div className="text-xl font-bold text-[var(--ink)]">{Object.keys(progressMap).length}</div>
            <div className="text-[10px] uppercase font-semibold text-[var(--ink-faint)] tracking-wider mt-1">Tracked Lessons</div>
          </div>
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-high)]">
            <div className="text-xl font-bold text-[var(--ink)]">{stats.completedVideos}</div>
            <div className="text-[10px] uppercase font-semibold text-[var(--ink-faint)] tracking-wider mt-1">Completed</div>
          </div>
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-high)]">
            <div className="text-xl font-bold text-[var(--ink)]">{stats.currentStreak}d</div>
            <div className="text-[10px] uppercase font-semibold text-[var(--ink-faint)] tracking-wider mt-1">Daily Streak</div>
          </div>
        </div>
      </div>
    </div>
  );
};
