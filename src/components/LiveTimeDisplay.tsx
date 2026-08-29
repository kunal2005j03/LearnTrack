import React, { useEffect, useState } from 'react';
import { playerProgressStore } from '../utils/playerProgress';
import { watchedCoverageTracker } from '../utils/watchedCoverageTracker';
import { formatSeconds } from '../utils/formatters';
import { Clock } from 'lucide-react';

interface Props {
  duration: number;
}

export const LiveTimeDisplay: React.FC<Props> = ({ duration }) => {
  const [cur, setCur] = useState(playerProgressStore.currentTime);
  const [verifiedWatchedSec, setVerifiedWatchedSec] = useState(watchedCoverageTracker.getTotalCoverageSeconds());

  useEffect(() => {
    const unsubProgress = playerProgressStore.subscribe((c) => {
      setCur(c);
    });
    const unsubCoverage = watchedCoverageTracker.subscribe((totalSec) => {
      setVerifiedWatchedSec(totalSec);
    });
    
    // Check initial values
    setVerifiedWatchedSec(watchedCoverageTracker.getTotalCoverageSeconds());

    return () => {
      unsubProgress();
      unsubCoverage();
    };
  }, []);

  const watchedPct = duration > 0 ? Math.min(100, (verifiedWatchedSec / duration) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5 bg-[var(--surface-high)] px-2.5 py-1 rounded-lg border border-[var(--border)] font-mono text-xs">
        <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span>{formatSeconds(cur)}</span>
        <span className="text-[var(--ink-faint)]">/</span>
        <span>{formatSeconds(duration)}</span>
      </span>
      <span 
        className="font-bold text-[var(--ink)] bg-[var(--surface-high)] px-2 py-1 rounded-lg border border-[var(--border)] text-xs cursor-help"
        title="Watched percentage represents verified video coverage. Seeking ahead does not increase it."
      >
        {Math.floor(watchedPct)}% Watched
      </span>
    </div>
  );
};
