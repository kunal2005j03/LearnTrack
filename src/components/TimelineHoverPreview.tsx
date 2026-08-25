import React, { useEffect, useMemo, useState } from 'react';
import { YouTubeChapter } from '../types';
import { formatSeconds } from '../utils/formatters';

interface TimelineHoverPreviewProps {
  videoId: string;
  hoverTime: number;
  hoverPixelX: number;
  scrubberWidth: number;
  duration: number;
  chapters?: YouTubeChapter[];
  isFullscreen?: boolean;
}

export const TimelineHoverPreview: React.FC<TimelineHoverPreviewProps> = React.memo(({
  videoId,
  hoverTime,
  hoverPixelX,
  scrubberWidth,
  duration,
  chapters = [],
  isFullscreen = false,
}) => {
  const [imageError, setImageError] = useState<boolean>(false);

  // Preload frame thumbnails for the video to ensure instantaneous, flicker-free scrubbing
  useEffect(() => {
    if (!videoId) return;
    setImageError(false);

    const frameUrls = [
      `https://img.youtube.com/vi/${videoId}/0.jpg`,
      `https://img.youtube.com/vi/${videoId}/1.jpg`,
      `https://img.youtube.com/vi/${videoId}/2.jpg`,
      `https://img.youtube.com/vi/${videoId}/3.jpg`,
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    ];

    frameUrls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [videoId]);

  // Compute hovered percentage
  const hoverPct = useMemo(() => {
    if (duration <= 0) return 0;
    return Math.max(0, Math.min(1, hoverTime / duration));
  }, [hoverTime, duration]);

  // Determine appropriate frame URL corresponding to the video timestamp
  const frameUrl = useMemo(() => {
    if (!videoId || imageError) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    if (hoverPct < 0.18) {
      return `https://img.youtube.com/vi/${videoId}/0.jpg`;
    } else if (hoverPct < 0.38) {
      return `https://img.youtube.com/vi/${videoId}/1.jpg`;
    } else if (hoverPct < 0.65) {
      return `https://img.youtube.com/vi/${videoId}/2.jpg`;
    } else if (hoverPct < 0.88) {
      return `https://img.youtube.com/vi/${videoId}/3.jpg`;
    } else {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }, [videoId, hoverPct, imageError]);

  // Determine chapter at hovered timestamp if available
  const hoveredChapter = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const isLast = i === chapters.length - 1;
      if (hoverTime >= ch.startSeconds && (isLast || hoverTime < ch.endSeconds)) {
        return ch;
      }
    }
    return null;
  }, [chapters, hoverTime]);

  // Preview dimensions (responsive between normal and fullscreen modes)
  const cardWidth = isFullscreen ? 192 : 160;
  const halfCardWidth = cardWidth / 2;

  // Clamping calculation to prevent horizontal overflow on left and right edges
  const clampedX = useMemo(() => {
    if (scrubberWidth <= 0) return hoverPixelX;
    const minX = halfCardWidth;
    const maxX = Math.max(halfCardWidth, scrubberWidth - halfCardWidth);
    return Math.max(minX, Math.min(maxX, hoverPixelX));
  }, [hoverPixelX, scrubberWidth, halfCardWidth]);

  if (hoverTime === null || isNaN(hoverTime) || duration <= 0) {
    return null;
  }

  return (
    <div
      className="absolute bottom-full mb-3 pointer-events-none select-none z-50 flex flex-col items-center transition-all duration-75 ease-out"
      style={{
        left: `${clampedX}px`,
        transform: 'translateX(-50%)',
        width: `${cardWidth}px`,
      }}
    >
      {/* Thumbnail Card Frame */}
      <div className="w-full bg-zinc-950/95 rounded-xl overflow-hidden border border-white/20 shadow-2xl backdrop-blur-md ring-1 ring-black/40 flex flex-col items-center">
        {/* Actual Video Frame Snapshot */}
        <div className="w-full aspect-video relative bg-black overflow-hidden flex items-center justify-center">
          <img
            src={frameUrl}
            alt="Preview Frame"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
          {/* Subtle vignette / shine */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Info Box: Timestamp & Chapter Title */}
        <div className="w-full px-2 py-1.5 bg-zinc-950 flex flex-col items-center justify-center text-center">
          {/* Timestamp Indicator */}
          <span className="font-mono text-[11px] font-bold text-white tracking-wider leading-none">
            {formatSeconds(hoverTime)}
          </span>

          {/* Chapter Title Badge (if available at this timestamp) */}
          {hoveredChapter && (
            <span
              className="text-[10px] text-cyan-400 font-medium truncate max-w-full mt-1 px-1 leading-tight"
              title={hoveredChapter.title}
            >
              {hoveredChapter.title}
            </span>
          )}
        </div>
      </div>

      {/* Caret / Pointer Tick */}
      <div className="w-2.5 h-1.5 bg-zinc-950 clip-triangle shadow-md -mt-[1px] border-b border-r border-white/10" />
    </div>
  );
});

TimelineHoverPreview.displayName = 'TimelineHoverPreview';
