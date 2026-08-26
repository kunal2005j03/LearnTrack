import React, { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { parseTimestampToSeconds } from '../utils/chapterParser';

interface FormattedDescriptionProps {
  description: string;
  onSeek?: (seconds: number) => void;
  className?: string;
}

export const FormattedDescription: React.FC<FormattedDescriptionProps> = React.memo(({
  description,
  onSeek,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description) return null;

  const lines = description.split('\n');
  const shouldTruncate = lines.length > 8 || description.length > 600;
  const displayedLines = shouldTruncate && !isExpanded ? lines.slice(0, 6) : lines;

  const renderLine = (line: string, lineIndex: number) => {
    // Combined regex for URLs and Timestamps
    // Group 1: URL (http://, https://, or www.)
    // Group 2: Timestamp (HH:MM:SS or MM:SS)
    const combinedRegex = /(https?:\/\/[^\s<>"'{}|\\^`]+|www\.[^\s<>"'{}|\\^`]+)|(\b(?:(?:\d{1,2}:)?\d{1,2}:\d{2})\b)/gi;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = combinedRegex.exec(line)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        elements.push(line.substring(lastIndex, match.index));
      }

      const [, urlMatch, timestampMatch] = match;

      if (urlMatch) {
        // Strip trailing punctuation if matched inadvertently (like . or , or ))
        let cleanUrl = urlMatch;
        let trailingPunct = '';
        const punctMatch = cleanUrl.match(/[.,;:!?)]+$/);
        if (punctMatch) {
          trailingPunct = punctMatch[0];
          cleanUrl = cleanUrl.slice(0, -trailingPunct.length);
        }

        const href = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
        elements.push(
          <a
            key={`url-${lineIndex}-${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:text-cyan-400 underline underline-offset-2 break-all inline-flex items-center gap-0.5 font-medium transition-colors cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{cleanUrl}</span>
            <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-70 ml-0.5" />
          </a>
        );
        if (trailingPunct) {
          elements.push(trailingPunct);
        }
      } else if (timestampMatch) {
        const seconds = parseTimestampToSeconds(timestampMatch);
        if (seconds !== null && onSeek) {
          elements.push(
            <button
              key={`ts-${lineIndex}-${match.index}`}
              type="button"
              onClick={() => onSeek(seconds)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 my-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 font-mono text-xs font-semibold cursor-pointer transition-colors border border-cyan-500/20 shadow-2xs"
              title={`Jump to ${timestampMatch}`}
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>{timestampMatch}</span>
            </button>
          );
        } else {
          elements.push(timestampMatch);
        }
      }

      lastIndex = combinedRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      elements.push(line.substring(lastIndex));
    }

    return (
      <div key={`line-${lineIndex}`} className="min-h-[1.4em]">
        {elements.length > 0 ? elements : <span>&nbsp;</span>}
      </div>
    );
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-xs sm:text-sm text-[var(--ink-dim)] leading-relaxed space-y-0.5">
        {displayedLines.map((line, idx) => renderLine(line, idx))}
      </div>
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-[var(--accent)] hover:underline pt-2 cursor-pointer inline-block"
        >
          {isExpanded ? 'Show less' : `Show more (${lines.length - 6} more lines)`}
        </button>
      )}
    </div>
  );
});
