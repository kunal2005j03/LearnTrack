import React from 'react';
import { useLearnTrack } from '../context/LearnTrackContext';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Plus,
  Activity,
  Settings,
  Bookmark,
  Search,
  Moon,
  Sun,
  LogIn,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    theme,
    setTheme,
    setIsSearchOpen,
    setIsAddCourseOpen,
    continueLearningVideo,
    openVideo,
  } = useLearnTrack();
  const { user, signInGoogle, signOut } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'add_course', label: 'Add Course', icon: Plus, isAction: true },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'diagnostic', label: 'Diagnostic', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Left Sidebar (Visible on Laptop/Desktop lg+ screens) */}
      <aside className="hidden lg:flex w-[240px] h-screen sticky top-0 shrink-0 flex-col overflow-y-auto overflow-x-hidden px-5 pt-5 pb-8 lg:px-6 lg:pt-6 lg:pb-10 border-r border-[var(--border)] bg-[var(--bg)] z-30 transition-colors">
        <div className="min-h-full flex flex-col justify-between gap-6 pb-4">
          {/* Brand / Logo */}
          <div>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-3 mb-8 text-left group focus:outline-none"
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#A78BFA] to-[#6366F1] shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform" />
              <span className="font-bold text-lg tracking-tight text-[var(--ink)]">
                LearnTrack
              </span>
            </button>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  !item.isAction &&
                  (currentView === item.id ||
                    (item.id === 'courses' &&
                      (currentView === 'course-detail' || currentView === 'video-player')));

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.isAction) {
                        setIsAddCourseOpen(true);
                      } else {
                        setCurrentView(item.id as any);
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                      isActive
                        ? 'bg-[var(--surface-high)] text-[var(--ink)] shadow-sm'
                        : 'text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2]" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="space-y-4 pt-2">
            {/* User Account / Cloud Sync Card */}
            <div className="p-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-high)]/60 backdrop-blur-sm space-y-2">
              {user && !user.isAnonymous ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full border border-[var(--border)] object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {user.displayName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--ink)] truncate">
                        {user.displayName || 'Learner'}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Cloud Synced</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => signOut()}
                    className="p-1.5 rounded-lg text-[var(--ink-dim)] hover:text-red-400 hover:bg-red-500/10 transition shrink-0"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--ink-dim)]">Cloud Persistence</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400/80" title="Guest Session" />
                  </div>
                  <button
                    onClick={() => signInGoogle().catch(console.warn)}
                    className="w-full py-1.5 px-3 rounded-xl bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 transition text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In with Google</span>
                  </button>
                </div>
              )}
            </div>

            {/* Motivation / Promo Card */}
            <div className="relative overflow-hidden rounded-2xl p-3.5 border border-[var(--border)] bg-gradient-to-br from-[var(--surface-mid)] to-[var(--surface-low)] group">
              {/* Ambient accent glow in card */}
              <div className="absolute -top-5 -right-5 w-16 h-16 bg-[#A78BFA] opacity-20 blur-xl pointer-events-none rounded-full" />

              <div className="relative z-10 space-y-1">
                <h4 className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                  Stay Consistent
                </h4>
                <p className="text-[11px] text-[var(--ink-dim)] leading-relaxed">
                  Track your learning progress and build your future daily.
                </p>
                <button
                  onClick={() => {
                    if (continueLearningVideo) {
                      openVideo(
                        continueLearningVideo.course.id,
                        continueLearningVideo.video.id
                      );
                    } else {
                      setCurrentView('courses');
                    }
                  }}
                  className="pt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#A78BFA] hover:text-[#C4B5FD] transition"
                >
                  Keep Learning →
                </button>
              </div>
            </div>

            {/* Theme Toggle */}
            <div
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--surface-mid)]/40 border border-[var(--border)] cursor-pointer text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)] transition select-none shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-4 bg-[var(--surface-high)] rounded-full relative p-0.5 border border-[var(--border)] transition-colors">
                  <div
                    className={`w-3 h-3 rounded-full bg-[var(--ink)] transition-transform duration-200 ${
                      theme === 'light' ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
                <span className="font-medium text-[11px] text-[var(--ink)]">
                  {theme === 'light' ? '☀ Light Mode' : '☾ Dark Mode'}
                </span>
              </div>
            </div>

            {/* Extra breathing space buffer at bottom of sidebar */}
            <div className="h-8 lg:h-10 w-full" aria-hidden="true" />
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Top Navigation Header */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-2.5 focus:outline-none"
        >
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#A78BFA] to-[#6366F1]" />
          <span className="font-bold text-base tracking-tight text-[var(--ink)]">
            LearnTrack
          </span>
        </button>

        <div className="flex items-center gap-2">
          {/* User Status / Login in Mobile Header */}
          {user && !user.isAnonymous ? (
            <button
              onClick={() => setCurrentView('settings')}
              className="flex items-center gap-1.5 p-1 rounded-full border border-[var(--border)] bg-[var(--surface-high)]"
              title="Account Settings"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || ''}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center font-bold">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => signInGoogle().catch(console.warn)}
              className="px-2.5 py-1 rounded-lg bg-[var(--ink)] text-[var(--bg)] text-[11px] font-semibold flex items-center gap-1"
            >
              <LogIn className="w-3 h-3" />
              <span>Sign In</span>
            </button>
          )}

          {/* Quick Search */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-lg text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)]"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Add Course */}
          <button
            onClick={() => setIsAddCourseOpen(true)}
            className="p-2 rounded-lg bg-[var(--surface-high)] text-[var(--ink)] hover:bg-[var(--surface-mid)] border border-[var(--border)]"
            title="Add Course"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-md py-2.5 px-4 sm:px-8 flex items-center justify-around">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
            currentView === 'dashboard'
              ? 'text-[var(--accent)] font-semibold'
              : 'text-[var(--ink-dim)]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setCurrentView('courses')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
            currentView === 'courses' ||
            currentView === 'course-detail' ||
            currentView === 'video-player'
              ? 'text-[var(--accent)] font-semibold'
              : 'text-[var(--ink-dim)]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Courses
        </button>
        <button
          onClick={() => setCurrentView('bookmarks')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
            currentView === 'bookmarks'
              ? 'text-[var(--accent)] font-semibold'
              : 'text-[var(--ink-dim)]'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          Saved
        </button>
        <button
          onClick={() => setCurrentView('diagnostic')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
            currentView === 'diagnostic'
              ? 'text-[var(--accent)] font-semibold'
              : 'text-[var(--ink-dim)]'
          }`}
        >
          <Activity className="w-4 h-4" />
          Diagnostic
        </button>
        <button
          onClick={() => setCurrentView('settings')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
            currentView === 'settings'
              ? 'text-[var(--accent)] font-semibold'
              : 'text-[var(--ink-dim)]'
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </>
  );
};
