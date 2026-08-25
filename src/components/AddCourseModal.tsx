import React, { useState } from 'react';
import { useLearnTrack } from '../context/LearnTrackContext';
import { X, Plus, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

export const AddCourseModal: React.FC = () => {
  const { isAddCourseOpen, setIsAddCourseOpen, importPlaylist, openCourse } = useLearnTrack();
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isAddCourseOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      setErrorMessage('Please enter a YouTube playlist URL or ID.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const result = await importPlaylist(cleanUrl);
    setLoading(false);

    if (result.success && result.courseId) {
      setUrlInput('');
      setIsAddCourseOpen(false);
      openCourse(result.courseId);
    } else {
      setErrorMessage(result.error || 'Failed to import playlist. Please ensure the playlist is public.');
    }
  };

  const samplePlaylists = [
    {
      title: 'Python for Beginners Full Course',
      url: 'https://www.youtube.com/playlist?list=PLsyeobzWxl7poL9JTVyndKe62ieoNx-MZ',
      channel: 'Telusko',
    },
    {
      title: 'React 19 & Next.js Masterclass',
      url: 'https://www.youtube.com/playlist?list=PLC3y8-rFHvwjkxtUXgfJZGSw742725c9_',
      channel: 'Codevolution',
    },
    {
      title: 'TypeScript Full Tutorial',
      url: 'https://www.youtube.com/playlist?list=PL4cUxeGkcC9gUgr39Q_yD6v-bSyMwKPUI',
      channel: 'Net Ninja',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] shadow-2xl p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            setIsAddCourseOpen(false);
            setErrorMessage(null);
          }}
          className="absolute top-5 right-5 p-2 rounded-full text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--surface-high)] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-2">
          <span className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--accent)] block mb-1">
            Import Course
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
            Add YouTube Playlist
          </h2>
          <p className="text-xs text-[var(--ink-dim)] mt-1">
            Paste any public YouTube playlist URL or ID to ingest lessons and start tracking.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-2">
              Playlist URL or ID
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="https://www.youtube.com/playlist?list=PL..."
              disabled={loading}
              className="w-full px-4 py-3 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl text-[var(--ink)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--accent)] text-xs font-mono transition"
            />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Error importing playlist</p>
                <p className="mt-0.5 text-[11px] text-red-300/90">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsAddCourseOpen(false);
                setErrorMessage(null);
              }}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-[var(--ink-dim)] hover:text-[var(--ink)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !urlInput.trim()}
              className="px-6 py-2.5 bg-[var(--ink)] text-[var(--bg)] rounded-full text-xs font-semibold hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Import Course
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Sample Presets */}
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <div className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--ink-dim)] mb-3">
            Popular Sample Playlists
          </div>

          <div className="space-y-2">
            {samplePlaylists.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setUrlInput(sample.url)}
                className="w-full text-left p-3 rounded-xl border border-[var(--border)] hover:border-[var(--ink-faint)] bg-[var(--surface-high)] transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--accent)] transition">
                    {sample.title}
                  </div>
                  <div className="text-[10px] text-[var(--ink-faint)]">{sample.channel}</div>
                </div>
                <span className="text-xs font-medium text-[var(--accent)] opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                  Load <ExternalLink className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
