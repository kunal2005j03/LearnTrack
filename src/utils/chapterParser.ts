import { YouTubeChapter } from '../types';
import { formatSeconds } from './formatters';

const memoryChapterCache = new Map<string, YouTubeChapter[]>();
const LOCAL_STORAGE_CHAPTERS_PREFIX = 'learntrack_chapters_v1_';

/**
 * Parses timestamp string (MM:SS or HH:MM:SS) into total seconds.
 * Returns null if invalid time or out-of-range seconds/minutes.
 */
export function parseTimestampToSeconds(timestampStr: string): number | null {
  if (!timestampStr) return null;
  const parts = timestampStr.trim().split(':').map((p) => Number(p));
  if (parts.some((p) => isNaN(p) || p < 0)) return null;

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (minutes >= 60 || seconds >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (seconds >= 60) return null;
    return minutes * 60 + seconds;
  }
  return null;
}

/**
 * Distinguishes true timestamps from false positives (IPs, versions, dates, ratios)
 * and extracts chapter title from a line of video description text.
 */
function extractChapterFromLine(line: string, videoDurationSeconds?: number): { startSeconds: number; title: string; formattedStart: string } | null {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.length < 3) return null;

  // Ignore code blocks, URLs, HTTP headers, version statements
  if (/^(https?:\/\/|git clone|npm i|npm install|cd |yarn add|docker |curl |const |import |from )/i.test(trimmedLine)) {
    return null;
  }
  // Ignore IP/port like 127.0.0.1:3000
  if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5}\b/.test(trimmedLine)) {
    return null;
  }
  // Ignore semantic version strings like v1.2.3 or 18.12.0
  if (/\bv?\d+\.\d+\.\d+\b/.test(trimmedLine) && !/\d{1,2}:\d{2}/.test(trimmedLine)) {
    return null;
  }

  // Regex to match timestamp: optional brackets, optional hours, minutes, seconds
  // Supports (0:00), [00:00], 0:00, 1:23:45, 01:02:30
  const timestampRegex = /(?:\[|\(|\b)?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\]|\)|\b)?/;
  const match = trimmedLine.match(timestampRegex);
  if (!match) return null;

  const rawFullMatch = match[0];
  // Extract pure digits and colons for timestamp calculation
  const cleanTimestamp = rawFullMatch.replace(/[^\d:]/g, '');
  const startSeconds = parseTimestampToSeconds(cleanTimestamp);
  if (startSeconds === null || startSeconds < 0) return null;

  // If video duration is known and valid, ignore timestamps that exceed duration
  if (videoDurationSeconds && videoDurationSeconds > 0 && startSeconds >= videoDurationSeconds) {
    return null;
  }

  // Extract clean title by removing timestamp and common separators
  let title = trimmedLine;

  // Remove the timestamp match
  title = title.replace(rawFullMatch, ' ');

  // Remove leading/trailing bracket leftovers
  title = title.replace(/^[\(\[\{]/, '').replace(/[\)\]\}]$/, '');

  // Remove leading numbers / numbering like "1. ", "01 - ", "Chapter 1: ", "#1 "
  title = title.replace(/^(?:chapter\s+\d+[\s:\-—–|]*|\d+[\.\)\-—–:]\s*|#\d+\s*)/i, '');

  // Remove leading/trailing separators and punctuation: - — – | : • . ~
  title = title.replace(/^[–—\-\|\:\•\.\~\s\t\/\#\*\>]+|[–—\-\|\:\•\.\~\s\t\/\#\*\>]+$/g, '').trim();

  // If title was stripped down completely or is empty, fallback to clean name
  if (!title || title.length === 0) {
    title = `Section at ${cleanTimestamp}`;
  }

  return {
    startSeconds,
    title,
    formattedStart: formatSeconds(startSeconds),
  };
}

/**
 * Main parser: Parses YouTube video description into structured, chronological chapters.
 * If no valid chapters exist in the description, returns an empty array [].
 */
export function parseYouTubeChapters(
  description: string | undefined | null,
  videoDurationSeconds?: number,
  videoId?: string
): YouTubeChapter[] {
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return [];
  }

  const lines = description.split(/\r?\n/);
  const rawList: { startSeconds: number; title: string; formattedStart: string }[] = [];

  for (const line of lines) {
    const chapter = extractChapterFromLine(line, videoDurationSeconds);
    if (chapter) {
      rawList.push(chapter);
    }
  }

  if (rawList.length === 0) {
    return [];
  }

  // Sort chronologically by start time
  rawList.sort((a, b) => a.startSeconds - b.startSeconds);

  // Deduplicate entries with identical startSeconds (keep the one with longest/clearest title)
  const deduplicated: { startSeconds: number; title: string; formattedStart: string }[] = [];
  for (const item of rawList) {
    const existingIndex = deduplicated.findIndex((d) => d.startSeconds === item.startSeconds);
    if (existingIndex >= 0) {
      if (item.title.length > deduplicated[existingIndex].title.length) {
        deduplicated[existingIndex] = item;
      }
    } else {
      deduplicated.push(item);
    }
  }

  // A valid chapter list for YouTube requires either at least 1 or 2 clear chapters
  if (deduplicated.length === 0) {
    return [];
  }

  // Calculate endSeconds and formattedDuration for each chapter
  const effectiveDuration = videoDurationSeconds && videoDurationSeconds > 0 ? videoDurationSeconds : 0;
  const defaultThumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : undefined;

  const result: YouTubeChapter[] = deduplicated.map((ch, index) => {
    let endSec = 0;
    if (index < deduplicated.length - 1) {
      endSec = deduplicated[index + 1].startSeconds;
    } else {
      endSec = effectiveDuration > ch.startSeconds ? effectiveDuration : ch.startSeconds + 60;
    }

    const durationSec = Math.max(0, endSec - ch.startSeconds);

    return {
      startSeconds: ch.startSeconds,
      endSeconds: endSec,
      title: ch.title,
      formattedStart: ch.formattedStart,
      formattedEnd: formatSeconds(endSec),
      formattedDuration: formatSeconds(durationSec),
      thumbnailUrl: defaultThumb,
      isAutoGenerated: false,
      source: 'creator',
    };
  });

  return result;
}

export interface ChapterResolutionResult {
  chapters: YouTubeChapter[];
  source: 'creator' | 'youtube_auto' | 'ai_generated' | 'none';
  isAutoGenerated: boolean;
}

/**
 * Resolves chapters by first parsing description, then checking cache,
 * and falling back to backend auto-extraction (YouTube auto-chapters + AI fallback).
 */
export async function fetchOrResolveChapters(params: {
  videoId: string;
  description?: string;
  durationSeconds?: number;
  title?: string;
}): Promise<ChapterResolutionResult> {
  const { videoId, description = '', durationSeconds = 0, title = '' } = params;
  if (!videoId) {
    return { chapters: [], source: 'none', isAutoGenerated: false };
  }

  // 1. Check if description has 2+ valid creator timestamps
  const creatorChapters = parseYouTubeChapters(description, durationSeconds);
  if (creatorChapters.length >= 2) {
    setCachedChapters(videoId, creatorChapters);
    return {
      chapters: creatorChapters,
      source: 'creator',
      isAutoGenerated: false,
    };
  }

  // 2. Check local/memory cache
  const cached = getCachedChapters(videoId);
  if (cached && cached.length > 0) {
    const isAuto = cached.some((c) => c.isAutoGenerated || c.source === 'youtube_auto' || c.source === 'ai_generated');
    const source = cached[0]?.source || (isAuto ? 'youtube_auto' : 'creator');
    return {
      chapters: cached,
      source,
      isAutoGenerated: isAuto,
    };
  }

  // 3. If no chapters yet, query server auto-chapter extraction endpoint
  try {
    const res = await fetch('/api/youtube/chapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        description,
        durationSeconds,
        title,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        chapters: YouTubeChapter[];
        source: 'creator' | 'youtube_auto' | 'ai_generated' | 'none';
      };

      if (Array.isArray(data.chapters) && data.chapters.length > 0) {
        setCachedChapters(videoId, data.chapters);
        const isAuto = data.source === 'youtube_auto' || data.source === 'ai_generated';
        return {
          chapters: data.chapters,
          source: data.source || (isAuto ? 'youtube_auto' : 'creator'),
          isAutoGenerated: isAuto,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to resolve chapters from server:', err);
  }

  // If creator had 1 single chapter
  if (creatorChapters.length === 1) {
    setCachedChapters(videoId, creatorChapters);
    return {
      chapters: creatorChapters,
      source: 'creator',
      isAutoGenerated: false,
    };
  }

  return { chapters: [], source: 'none', isAutoGenerated: false };
}

/**
 * Cache retrieval helper: gets cached chapters for a videoId from memory or localStorage.
 */
export function getCachedChapters(videoId: string): YouTubeChapter[] | null {
  if (!videoId) return null;
  if (memoryChapterCache.has(videoId)) {
    return memoryChapterCache.get(videoId)!;
  }
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_CHAPTERS_PREFIX}${videoId}`);
    if (raw) {
      const parsed: YouTubeChapter[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryChapterCache.set(videoId, parsed);
        return parsed;
      }
    }
  } catch {}
  return null;
}

/**
 * Cache setter helper: caches parsed chapters for a videoId in memory and localStorage.
 */
export function setCachedChapters(videoId: string, chapters: YouTubeChapter[]): void {
  if (!videoId || !Array.isArray(chapters)) return;
  memoryChapterCache.set(videoId, chapters);
  try {
    localStorage.setItem(`${LOCAL_STORAGE_CHAPTERS_PREFIX}${videoId}`, JSON.stringify(chapters));
  } catch {}
}
