import React, { useEffect, useState } from 'react';
import { playerProgressStore } from '../utils/playerProgress';
import { formatSeconds } from '../utils/formatters';
import { Clock } from 'lucide-react';

interface Props {
  duration: number;
}

export const LiveTimeDisplay: React.FC<Props> = ({ duration }) => {
  const [cur, setCur] = useState(playerProgressStore.currentTime);
  const [pct, setPct] = useState(playerProgressStore.percentage);

  useEffect(() => {
    return playerProgressStore.subscribe((c, d, p) => {
      setCur(c);
      setPct(p);
    });
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5 bg-[var(--surface-high)] px-2.5 py-1 rounded-lg border border-[var(--border)] font-mono text-xs">
        <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span>{formatSeconds(cur)}</span>
        <span className="text-[var(--ink-faint)]">/</span>
        <span>{formatSeconds(duration)}</span>
      </span>
      <span className="font-bold text-[var(--ink)] bg-[var(--surface-high)] px-2 py-1 rounded-lg border border-[var(--border)] text-xs">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
};
