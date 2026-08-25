/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { LearnTrackProvider, useLearnTrack } from './context/LearnTrackContext';
import { Navigation } from './components/Navigation';
import { AddCourseModal } from './components/AddCourseModal';
import { SearchModal } from './components/SearchModal';
import { DashboardPage } from './pages/DashboardPage';
import { Loader2 } from 'lucide-react';

const CoursesPage = lazy(() => import('./pages/CoursesPage').then((m) => ({ default: m.CoursesPage })));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage })));
const VideoPlayerPage = lazy(() => import('./pages/VideoPlayerPage').then((m) => ({ default: m.VideoPlayerPage })));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage').then((m) => ({ default: m.BookmarksPage })));
const YouTubeTestPage = lazy(() => import('./pages/YouTubeTestPage').then((m) => ({ default: m.YouTubeTestPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-3">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      <span className="text-xs font-medium text-[var(--ink-dim)]">Loading...</span>
    </div>
  );
}

function MainAppContent() {
  const { currentView } = useLearnTrack();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg)] text-[var(--ink)] selection:bg-[#A78BFA] selection:text-black relative">
      {/* Ambient background glow */}
      <div className="ambient-glow" />

      {/* Sidebar navigation */}
      <Navigation />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 relative p-4 sm:p-6 md:p-8 lg:px-14 lg:py-10 pb-28 lg:pb-12 z-10">
        <Suspense fallback={<PageLoader />}>
          {currentView === 'dashboard' && <DashboardPage />}
          {currentView === 'courses' && <CoursesPage />}
          {currentView === 'course-detail' && <CourseDetailPage />}
          {currentView === 'video-player' && <VideoPlayerPage />}
          {currentView === 'bookmarks' && <BookmarksPage />}
          {currentView === 'diagnostic' && <YouTubeTestPage />}
          {currentView === 'settings' && <SettingsPage />}
        </Suspense>
      </main>

      {/* Global Modals */}
      <AddCourseModal />
      <SearchModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LearnTrackProvider>
        <MainAppContent />
      </LearnTrackProvider>
    </AuthProvider>
  );
}
