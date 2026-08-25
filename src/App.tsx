/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { LearnTrackProvider, useLearnTrack } from './context/LearnTrackContext';
import { Navigation } from './components/Navigation';
import { AddCourseModal } from './components/AddCourseModal';
import { SearchModal } from './components/SearchModal';
import { DashboardPage } from './pages/DashboardPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { VideoPlayerPage } from './pages/VideoPlayerPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { YouTubeTestPage } from './pages/YouTubeTestPage';
import { SettingsPage } from './pages/SettingsPage';

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
        {currentView === 'dashboard' && <DashboardPage />}
        {currentView === 'courses' && <CoursesPage />}
        {currentView === 'course-detail' && <CourseDetailPage />}
        {currentView === 'video-player' && <VideoPlayerPage />}
        {currentView === 'bookmarks' && <BookmarksPage />}
        {currentView === 'diagnostic' && <YouTubeTestPage />}
        {currentView === 'settings' && <SettingsPage />}
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
