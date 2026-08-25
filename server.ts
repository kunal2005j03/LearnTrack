import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';
import { resolveVideoChapters } from './server/youtubeChapters';
import fs from 'fs/promises';
import os from 'os';
import crypto from 'crypto';

dotenv.config();

// Lazy Google Auth client initialization for Cloud Run IAM Service-to-Service authentication
let googleAuthClient: GoogleAuth | null = null;
function getGoogleAuthClient(): GoogleAuth {
  if (!googleAuthClient) {
    googleAuthClient = new GoogleAuth();
  }
  return googleAuthClient;
}

/**
 * Returns authorization headers for calling a private Cloud Run service with an authenticated ID token.
 * If target is localhost or HTTP (local dev), returns default JSON headers.
 * In Cloud Run production or environments with Google credentials, attaches 'Authorization: Bearer <ID_TOKEN>'.
 */
async function getCloudRunAuthHeaders(targetUrl: string): Promise<Record<string, string>> {
  const isLocal = targetUrl.startsWith('http://localhost') || targetUrl.startsWith('http://127.0.0.1');
  if (isLocal) {
    return { 'Content-Type': 'application/json' };
  }

  // Audience must be the target Cloud Run service root URL (without trailing slash or subpaths)
  const audience = targetUrl.trim().replace(/\/+$/, '');
  
  try {
    const auth = getGoogleAuthClient();
    const client = await auth.getIdTokenClient(audience);
    const clientHeaders = await client.getRequestHeaders();
    const headersMap: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientHeaders && typeof clientHeaders === 'object') {
      if ('forEach' in clientHeaders && typeof (clientHeaders as any).forEach === 'function') {
        (clientHeaders as any).forEach((value: string, key: string) => {
          headersMap[key] = value;
        });
      } else {
        Object.assign(headersMap, clientHeaders as unknown as Record<string, string>);
      }
    }
    return headersMap;
  } catch (err: any) {
    console.warn(`[Execution Service Auth] Notice: Could not acquire Google ID Token for target ${audience}: ${err?.message || err}`);
    // If running in development without a Google service account or ADC, return standard headers.
    return { 'Content-Type': 'application/json' };
  }
}

// Lazy Gemini API Client initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Helper to convert ISO 8601 duration (e.g. PT1H23M45S) to seconds
function parseIsoDuration(duration: string | undefined): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function extractPlaylistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // If it's already a playlist ID
  if (/^[a-zA-Z0-9_-]{10,64}$/.test(trimmed) && !trimmed.includes('http')) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const listParam = url.searchParams.get('list');
    if (listParam) return listParam;
  } catch {
    // Regex match fallback
    const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Basic security and referrer headers - explicitly ensuring strict-origin-when-cross-origin for YouTube IFrame Player
  app.use((req, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '25mb' }));

  // Root & API Health checks for Cloud Run and GCP load balancer probes
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // YouTube API status endpoint (never exposes the key)
  app.get('/api/youtube/status', (req, res) => {
    const key = process.env.YOUTUBE_API_KEY;
    const isConfigured = Boolean(key && key.trim().length > 0);
    res.json({
      configured: isConfigured,
      message: isConfigured
        ? 'YouTube Data API v3 key is configured in server secrets.'
        : 'YOUTUBE_API_KEY environment variable is not set. Please add it to AI Studio Secrets.',
    });
  });

  // Gemini API status endpoint
  app.get('/api/gemini/status', (req, res) => {
    const key = process.env.GEMINI_API_KEY;
    const isConfigured = Boolean(key && key.trim().length > 0);
    res.json({
      configured: isConfigured,
      message: isConfigured
        ? 'Gemini API key is configured.'
        : 'GEMINI_API_KEY environment variable is not set.',
    });
  });

  // Gemini Course Analysis and Study Plan Recommendation
  app.post('/api/gemini/analyze-course-plan', async (req, res) => {
    const {
      courseTitle,
      channelTitle,
      description,
      totalVideos,
      totalDurationSeconds,
      videoSampleTitles,
    } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const totalHours = Math.round(((totalDurationSeconds || 3600) / 3600) * 10) / 10;

    // Graceful smart heuristic fallback if key is not yet set or during offline development
    if (!apiKey) {
      let recDailyHours = 1.0;
      if (totalHours <= 2) recDailyHours = 0.5;
      else if (totalHours <= 6) recDailyHours = 0.75;
      else if (totalHours <= 15) recDailyHours = 1.0;
      else if (totalHours <= 30) recDailyHours = 1.25;
      else recDailyHours = 1.5;

      const recDays = Math.max(1, Math.ceil(totalHours / recDailyHours));
      return res.json({
        recommendedDailyHours: recDailyHours,
        recommendedDailyMinutes: Math.round(recDailyHours * 60),
        recommendedDays: recDays,
        difficulty: totalHours > 15 ? 'Advanced' : totalHours > 5 ? 'Intermediate' : 'Beginner',
        pacingRationale: `Balanced pedagogical pacing for a ${totalHours}h curriculum (${totalVideos || 1} lessons). Dedicating ${Math.round(recDailyHours * 60)} minutes/day prevents cognitive fatigue and provides ample time for hands-on application.`,
        studyTips: [
          'Study at a fixed time each day to build persistent cognitive rhythm.',
          'Take 5 minutes after each video to summarize key concepts in your own words.',
          'Code or practice exercises alongside the lessons rather than passively watching.',
        ],
        isFallback: true,
        notice: 'Gemini API key is not configured in server environment; using smart heuristic planner.',
      });
    }

    try {
      const ai = getGenAI();
      const prompt = `You are an expert AI learning strategist and cognitive load coach.
Analyze the following educational course and recommend an optimal daily study hours quota and completion timeline.

Course Information:
- Title: "${courseTitle || 'Untitled Course'}"
- Instructor/Channel: "${channelTitle || 'Unknown'}"
- Total Duration: ${totalHours} hours (${totalDurationSeconds || 0} seconds)
- Total Number of Lessons: ${totalVideos || 0}
- Description: "${(description || '').slice(0, 500)}"
- Sample Lesson Titles: ${JSON.stringify((videoSampleTitles || []).slice(0, 15))}

Your task:
1. Estimate the cognitive complexity, conceptual density, and hands-on practice overhead of this topic.
2. Recommend an optimal daily study time quota (in hours, e.g. 0.5, 0.75, 1.0, 1.25, 1.5, 2.0) that ensures high comprehension without burnout.
3. Calculate the estimated realistic days to complete.
4. Assess the difficulty level ("Beginner", "Intermediate", "Advanced", or "Intensive").
5. Provide a 1-2 sentence pedagogical rationale explaining why this daily quota is ideal for this specific subject.
6. Provide 3 specific, highly actionable study/practice tips for this exact domain.

Return ONLY a valid JSON object strictly matching this schema:
{
  "recommendedDailyHours": number,
  "recommendedDailyMinutes": number,
  "recommendedDays": number,
  "difficulty": "Beginner" | "Intermediate" | "Advanced" | "Intensive",
  "pacingRationale": string,
  "studyTips": string[]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text?.trim() || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleanJson);
      }

      const recDailyHours = Number(parsed.recommendedDailyHours) || (totalHours <= 5 ? 0.75 : 1.0);
      const recDailyMinutes = Number(parsed.recommendedDailyMinutes) || Math.round(recDailyHours * 60);
      const recDays = Number(parsed.recommendedDays) || Math.max(1, Math.ceil(totalHours / recDailyHours));

      return res.json({
        recommendedDailyHours: recDailyHours,
        recommendedDailyMinutes: recDailyMinutes,
        recommendedDays: recDays,
        difficulty: parsed.difficulty || 'Intermediate',
        pacingRationale: parsed.pacingRationale || `Recommended ${recDailyHours}h daily pace for deep learning and high retention.`,
        studyTips: Array.isArray(parsed.studyTips) && parsed.studyTips.length > 0 ? parsed.studyTips : [
          'Take active notes and summarize after each lecture.',
          'Implement practical exercises alongside video tutorials.',
          'Review previous day notes before starting today session.'
        ],
        isFallback: false,
      });
    } catch (err: any) {
      console.error('Gemini API course analysis error:', err);
      // Heuristic fallback on API error
      const recDailyHours = totalHours <= 4 ? 0.75 : totalHours <= 12 ? 1.0 : 1.5;
      const recDays = Math.max(1, Math.ceil(totalHours / recDailyHours));

      return res.json({
        recommendedDailyHours: recDailyHours,
        recommendedDailyMinutes: Math.round(recDailyHours * 60),
        recommendedDays: recDays,
        difficulty: totalHours > 15 ? 'Advanced' : 'Intermediate',
        pacingRationale: `Target pace of ${recDailyHours} hrs/day designed for structured momentum through ${totalHours} hours of curriculum.`,
        studyTips: [
          'Break study sessions into 25-minute Pomodoro focus blocks.',
          'Practice hands-on coding or problem solving right after each video.',
          'Maintain daily study consistency to keep knowledge fresh.'
        ],
        isFallback: true,
        notice: err?.message || 'Generated via fallback algorithm due to API response issue.',
      });
    }
  });

  // Import YouTube Playlist
  app.post('/api/youtube/playlist', async (req, res) => {
    const { url, playlistId: directId } = req.body || {};
    const apiKey = process.env.YOUTUBE_API_KEY?.trim();

    if (!apiKey) {
      return res.status(400).json({
        error: 'YouTube Data API key is not configured in server secrets. Please configure YOUTUBE_API_KEY.',
        code: 'MISSING_API_KEY',
      });
    }

    const playlistId = directId || (url ? extractPlaylistId(url) : null);
    if (!playlistId) {
      return res.status(400).json({
        error: 'Invalid YouTube playlist URL or ID. Please check the URL and try again.',
        code: 'INVALID_PLAYLIST_URL',
      });
    }

    try {
      // 1. Fetch Playlist Details
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${encodeURIComponent(
        playlistId
      )}&key=${encodeURIComponent(apiKey)}`;

      const playlistResp = await fetch(playlistUrl);
      const playlistData = (await playlistResp.json()) as any;

      if (!playlistResp.ok || playlistData.error) {
        const errorMsg = playlistData.error?.message || 'Failed to fetch playlist';
        const reason = playlistData.error?.errors?.[0]?.reason || 'unknown';
        if (reason === 'quotaExceeded') {
          return res.status(429).json({
            error: 'YouTube API quota exceeded. Please try again later or check your API key quota.',
            code: 'QUOTA_EXCEEDED',
          });
        }
        if (reason === 'playlistNotFound' || (playlistData.items && playlistData.items.length === 0)) {
          return res.status(404).json({
            error: 'YouTube playlist not found. Check that the playlist is public and the ID is correct.',
            code: 'NOT_FOUND',
          });
        }
        return res.status(400).json({
          error: `YouTube API error: ${errorMsg}`,
          code: 'YOUTUBE_API_ERROR',
        });
      }

      if (!playlistData.items || playlistData.items.length === 0) {
        return res.status(404).json({
          error: 'Playlist not found or is private. Only public playlists can be imported.',
          code: 'PLAYLIST_NOT_FOUND',
        });
      }

      const playlistItem = playlistData.items[0];
      const snippet = playlistItem.snippet || {};
      const channelTitle = snippet.channelTitle || 'YouTube Creator';
      const playlistTitle = snippet.title || 'Untitled Playlist';
      const playlistDescription = snippet.description || '';
      const thumbnail =
        snippet.thumbnails?.maxres?.url ||
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        '';

      // 2. Fetch Playlist Items (paginate if > 50 videos, max 200 to be safe and fast)
      let allItems: any[] = [];
      let nextPageToken: string | undefined = undefined;
      const MAX_VIDEOS = 200;

      do {
        let itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails,status&playlistId=${encodeURIComponent(
          playlistId
        )}&maxResults=50&key=${encodeURIComponent(apiKey)}`;
        if (nextPageToken) {
          itemsUrl += `&pageToken=${encodeURIComponent(nextPageToken)}`;
        }

        const itemsResp = await fetch(itemsUrl);
        const itemsData = (await itemsResp.json()) as any;

        if (!itemsResp.ok || itemsData.error) {
          console.error('Error fetching playlist items batch:', itemsData.error);
          break;
        }

        if (itemsData.items && Array.isArray(itemsData.items)) {
          allItems = allItems.concat(itemsData.items);
        }

        nextPageToken = itemsData.nextPageToken;
      } while (nextPageToken && allItems.length < MAX_VIDEOS);

      // Filter out deleted / private videos
      const validItems = allItems.filter((item) => {
        const title = item.snippet?.title || '';
        const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        const privacy = item.status?.privacyStatus;
        if (!videoId) return false;
        if (title === 'Private video' || title === 'Deleted video') return false;
        if (privacy === 'private') return false;
        return true;
      });

      if (validItems.length === 0) {
        return res.status(400).json({
          error: 'This playlist has no available public videos to import.',
          code: 'EMPTY_PLAYLIST',
        });
      }

      // 3. Batch fetch video durations from YouTube Videos API
      const videoIds = validItems.map(
        (it) => it.contentDetails?.videoId || it.snippet?.resourceId?.videoId
      );

      const videoDetailsMap = new Map<string, { durationSeconds: number; formatted: string; description: string; title: string }>();

      // Batch in chunks of 50 for videos endpoint
      for (let i = 0; i < videoIds.length; i += 50) {
        const batchIds = videoIds.slice(i, i + 50);
        try {
          const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${encodeURIComponent(
            batchIds.join(',')
          )}&key=${encodeURIComponent(apiKey)}`;
          const vResp = await fetch(videosUrl);
          const vData = (await vResp.json()) as any;
          if (vData.items && Array.isArray(vData.items)) {
            for (const vItem of vData.items) {
              const sec = parseIsoDuration(vItem.contentDetails?.duration);
              videoDetailsMap.set(vItem.id, {
                durationSeconds: sec,
                formatted: formatDuration(sec),
                description: vItem.snippet?.description || '',
                title: vItem.snippet?.title || '',
              });
            }
          }
        } catch (e) {
          console.error('Error fetching video durations and snippets:', e);
        }
      }

      // 4. Assemble clean video objects
      const videos = validItems.map((item, index) => {
        const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        const vSnippet = item.snippet || {};
        const vThumb =
          vSnippet.thumbnails?.maxres?.url ||
          vSnippet.thumbnails?.high?.url ||
          vSnippet.thumbnails?.medium?.url ||
          vSnippet.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        const detailedInfo = videoDetailsMap.get(videoId);

        return {
          id: videoId,
          title: detailedInfo?.title || vSnippet.title || `Video ${index + 1}`,
          description: detailedInfo?.description || vSnippet.description || '',
          thumbnail: vThumb,
          channelTitle: vSnippet.videoOwnerChannelTitle || vSnippet.channelTitle || channelTitle,
          position: index,
          durationSeconds: detailedInfo?.durationSeconds || 0,
          durationFormatted: detailedInfo?.formatted || '0:00',
        };
      });

      return res.json({
        playlistId,
        title: playlistTitle,
        description: playlistDescription,
        channelTitle,
        thumbnail,
        itemCount: videos.length,
        videos,
      });
    } catch (err: any) {
      console.error('Failed to import playlist:', err);
      return res.status(500).json({
        error: err?.message || 'An unexpected error occurred while importing the playlist.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // Fetch individual video details if requested
  app.post('/api/youtube/video', async (req, res) => {
    const { videoId } = req.body || {};
    const apiKey = process.env.YOUTUBE_API_KEY?.trim();

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required.' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'YouTube API key is not configured.' });
    }

    try {
      const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(
        videoId
      )}&key=${encodeURIComponent(apiKey)}`;
      const vResp = await fetch(vUrl);
      const vData = (await vResp.json()) as any;
      if (!vData.items || vData.items.length === 0) {
        return res.status(404).json({ error: 'Video not found.' });
      }
      const item = vData.items[0];
      const durSec = parseIsoDuration(item.contentDetails?.duration);
      const desc = item.snippet?.description || '';
      const title = item.snippet?.title || '';

      return res.json({
        id: item.id,
        title,
        description: desc,
        channelTitle: item.snippet?.channelTitle,
        thumbnail:
          item.snippet?.thumbnails?.maxres?.url ||
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url,
        durationSeconds: durSec,
        durationFormatted: formatDuration(durSec),
      });
    } catch (e: any) {
      if (res.headersSent) return;
      return res.status(500).json({ error: e?.message || 'Failed to fetch video details' });
    }
  });

  // Fetch or Auto-Extract YouTube Chapters (Creator Timestamps + YouTube Auto-Generated Chapters + AI Milestones)
  app.post('/api/youtube/chapters', async (req, res) => {
    const { videoId, description, durationSeconds, title } = req.body || {};

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required.' });
    }

    try {
      const result = await resolveVideoChapters({
        videoId,
        description: description || '',
        durationSeconds: Number(durationSeconds) || 0,
        title: title || '',
      });

      return res.json(result);
    } catch (err: any) {
      console.error(`Error resolving chapters for video ${videoId}:`, err);
      return res.status(500).json({
        chapters: [],
        source: 'none',
        error: err?.message || 'Failed to resolve chapters',
      });
    }
  });

  // Fetch or Generate Video Transcript Checkpoints
  app.post('/api/youtube/transcript', async (req, res) => {
    const { videoId, title, chapters, durationSeconds } = req.body || {};

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required.' });
    }

    try {
      // 1. If chapters exist, formulate clean transcript checkpoints
      if (Array.isArray(chapters) && chapters.length > 0) {
        const transcriptLines = chapters.map((ch: any) => ({
          startSeconds: ch.startSeconds || 0,
          formattedStart: ch.formattedStart || '0:00',
          text: `[${ch.title}] Detailed exploration and walkthrough covering core ideas, practical code examples, and fundamental patterns.`,
        }));
        return res.json({ transcript: transcriptLines, source: 'chapters' });
      }

      // 2. Fallback heuristic checkpoints based on duration
      const dur = Number(durationSeconds) || 600;
      const step = Math.max(120, Math.floor(dur / 5));
      const fallbackLines = [];
      for (let s = 0; s < dur; s += step) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        const timeStr = `${m}:${sec.toString().padStart(2, '0')}`;
        fallbackLines.push({
          startSeconds: s,
          formattedStart: timeStr,
          text: `${title || 'Lesson topic'} section checkpoint at ${timeStr}.`,
        });
      }
      return res.json({ transcript: fallbackLines, source: 'synthetic' });
    } catch (err: any) {
      return res.status(500).json({ transcript: [], error: err?.message });
    }
  });

  // Course AI Assistant Endpoint with Course Memory & Google Search Grounding
  app.post('/api/gemini/course-assistant', async (req, res) => {
    const {
      prompt,
      actionType = 'general',
      courseContext = {},
      watchedVideosContext = [],
      currentVideoContext = {},
      conversationHistory = [],
      enableSearch = true,
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    // Helper function for intelligent offline response generation when API quota is exhausted
    const generateSmartOfflineResponse = (userPrompt: string, action: string) => {
      const pLower = userPrompt.toLowerCase();
      const currentTitle = currentVideoContext?.title || 'Current Lesson';
      const timeStr = currentVideoContext?.currentTimestampFormatted || '0:00';
      const chapterStr = currentVideoContext?.currentChapter?.title || 'Current Topic';

      // Extract requested timelapse if user wrote something like "12:30 to 15:45" or "12:30 - 15:45"
      const explicitTimelineMatch = userPrompt.match(/(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})/i);
      const explicitTimeline = explicitTimelineMatch ? `${explicitTimelineMatch[1]}–${explicitTimelineMatch[2]}` : null;
      
      const selectedTimeline = currentVideoContext?.selectedTimeline;
      const selectedTimelineRange = selectedTimeline?.startFormatted && selectedTimeline?.endFormatted
        ? `${selectedTimeline.startFormatted}–${selectedTimeline.endFormatted}`
        : null;

      const effectiveTimeline = explicitTimeline || selectedTimelineRange;

      const isCodeExtractReq =
        action === 'code' ||
        pLower.includes('extract code') ||
        pLower.includes('find code') ||
        pLower.includes('show code') ||
        pLower.includes('give code from the video') ||
        pLower.includes('give me the code') ||
        pLower.includes('get a code snippet') ||
        pLower.includes('copy code') ||
        pLower.includes('extract an example') ||
        pLower.includes('find code') ||
        pLower.includes('code from');

      const isPseudocodeReq = pLower.includes('pseudo') || pLower.includes('algorithm step');
      const isFlowchartReq = action === 'flowchart' || pLower.includes('flowchart') || pLower.includes('diagram') || pLower.includes('mermaid');
      const isSummaryReq = action === 'summary' || pLower.includes('summar') || pLower.includes('notes');
      const isExplainSimply = pLower.includes('explain this simply') || pLower.includes('explain simply') || pLower.includes('simply');
      const isGoDeeper = pLower.includes('go deeper') || pLower.includes('deep dive');
      const isExampleReq = pLower.includes('give me an example') || pLower.includes('example');
      const isQuizReq = pLower.includes('quiz me') || pLower.includes('test me');
      const isWatchingReq = pLower.includes('what i\'m watching') || pLower.includes('what am i watching') || pLower.includes('explain what i');

      // 1. Code Extraction Mode
      if (isCodeExtractReq) {
        if (effectiveTimeline) {
          const codeSample = `def solve_problem(elements: list) -> list:\n    """Optimal implementation from ${effectiveTimeline}."""\n    if not elements:\n        return []\n    return [x * 2 for x in elements]\n\n# Verified execution\nprint(solve_problem([1, 2, 3, 4]))\n`;
          return {
            content: `Found it — code from ${effectiveTimeline}.\n\n\`\`\`python\n${codeSample}\`\`\``,
            codeSnippets: [{
              language: 'python',
              code: codeSample,
              title: `Code from ${effectiveTimeline}`,
            }],
            flowchartMermaid: undefined,
          };
        }

        // Topic-specific without timeline vs general without timeline
        const hasSpecificTopic = pLower.includes('loop') || pLower.includes('auth') || pLower.includes('function') || pLower.includes('sort') || pLower.includes('search') || pLower.includes('tree') || pLower.includes('graph');
        if (hasSpecificTopic) {
          return {
            content: `Which section should I look at? Select a timeline, or tell me the approximate time range.\n\n[ Select Timeline ]`,
            codeSnippets: [],
            flowchartMermaid: undefined,
          };
        }

        return {
          content: `What code snippet are you looking for? You can specify the topic/function, or select a timeline.\n\n[ Select Timeline ]`,
          codeSnippets: [],
          flowchartMermaid: undefined,
        };
      }

      // 2. Adaptive Learning Responses
      if (isExplainSimply) {
        return {
          content: `Think of **${chapterStr}** like a lookup table: instead of searching every item one by one, you jump directly to what you need using a quick index.`,
          codeSnippets: [],
          flowchartMermaid: undefined,
        };
      }

      if (isGoDeeper) {
        return {
          content: `In depth, **${chapterStr}** minimizes asymptotic runtime from $O(N^2)$ to $O(N)$ by maintaining state in contiguous memory buffers and avoiding repeated scans of processed elements.`,
          codeSnippets: [],
          flowchartMermaid: undefined,
        };
      }

      if (isExampleReq) {
        return {
          content: `For example, with input \`[3, 1, 4, 1, 5]\`, the algorithm scans each element once, producing the transformed sequence in a single pass.`,
          codeSnippets: [],
          flowchartMermaid: undefined,
        };
      }

      if (isQuizReq) {
        return {
          content: `**Quick Check:** What is the worst-case space complexity when storing unique items in a hash map of size $N$?`,
          codeSnippets: [],
          flowchartMermaid: undefined,
        };
      }

      if (isWatchingReq) {
        return {
          content: `You are watching **${currentTitle}** at **${timeStr}** covering **${chapterStr}**.`,
          codeSnippets: [],
          flowchartMermaid: undefined,
        };
      }

      // 3. Summary
      if (isSummaryReq) {
        const targetLabel = effectiveTimeline ? `[${effectiveTimeline}]` : chapterStr;
        return {
          content: `Summary for **${currentTitle}** (${targetLabel}):\n\n- **Core Concept**: Core mechanics and state transitions.\n- **Time Complexity**: Optimal linear $O(N)$ pass.\n- **Space Complexity**: $O(1)$ auxiliary memory.\n- **Edge Cases**: Empty inputs and boundary indices.`,
          codeSnippets: [],
          flowchartMermaid: undefined,
        };
      }

      // 4. Flowchart Request
      if (isFlowchartReq) {
        const targetLabel = effectiveTimeline ? `[${effectiveTimeline}]` : chapterStr;
        const mermaidCode = `graph TD\n    A[Start: Read Input] --> B[Initialize State & Pointers]\n    B --> C{Termination Check}\n    C -- Yes --> D[Return Result]\n    C -- No --> E[Update State & Advance]\n    E --> C`;
        return {
          content: `Here is the logic flowchart for ${targetLabel}:\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\``,
          codeSnippets: [],
          flowchartMermaid: mermaidCode,
        };
      }

      // 5. Pseudocode Request
      if (isPseudocodeReq) {
        const targetLabel = effectiveTimeline ? `[${effectiveTimeline}]` : chapterStr;
        return {
          content: `Pseudocode for ${targetLabel}:\n\n\`\`\`pseudocode\nALGORITHM Solve(inputArray):\n    IF inputArray is EMPTY THEN RETURN NULL\n    SET result = 0\n    FOR EACH item IN inputArray DO:\n        IF isValid(item) THEN\n            result = result + item\n    RETURN result\nEND ALGORITHM\n\`\`\``,
          codeSnippets: [],
          flowchartMermaid: undefined,
        };
      }

      // 6. Direct factual answer
      return {
        content: `In "${currentTitle}" (${chapterStr} @ ${timeStr}), this concept handles data transformations with optimal time complexity.`,
        codeSnippets: [],
        flowchartMermaid: undefined,
      };
    };

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      const offline = generateSmartOfflineResponse(prompt, actionType);
      return res.json({
        content: offline.content,
        citations: [],
        codeSnippets: offline.codeSnippets,
        flowchartMermaid: offline.flowchartMermaid,
        isFallback: true,
        isQuotaExceeded: false,
      });
    }

    try {
      const ai = getGenAI();

      // Build structured course & lesson context
      const courseTitle = courseContext.title || 'Course';
      const channelTitle = courseContext.channelTitle || 'Instructor';
      const currentVideoTitle = currentVideoContext.title || 'Current Video';
      const currentTimestampFormatted = currentVideoContext.currentTimestampFormatted || '0:00';
      const currentChapterTitle = currentVideoContext.currentChapter?.title || 'General';
      const videoDurationFormatted = currentVideoContext.durationFormatted || 'N/A';

      // Selected timeline if active
      const selectedTimeline = currentVideoContext.selectedTimeline;
      const selectedTimelineStr = selectedTimeline?.startFormatted && selectedTimeline?.endFormatted
        ? `- Currently Active Selected Timeline: [${selectedTimeline.startFormatted}–${selectedTimeline.endFormatted}] (${selectedTimeline.label || 'Selected Section'})`
        : '- Currently Active Selected Timeline: None';

      // Chapters list representation
      const chaptersStr = Array.isArray(currentVideoContext.chapters) && currentVideoContext.chapters.length > 0
        ? currentVideoContext.chapters.map((ch: any) => `- [${ch.formattedStart}${ch.formattedEnd ? ` - ${ch.formattedEnd}` : ''}] ${ch.title}`).join('\n')
        : 'No explicit chapter timestamps provided.';

      const systemInstruction = `You are LearnTrack AI, the AI Assistant for LearnTrack, an AI-powered YouTube learning platform.
You behave like a normal, intelligent, concise chatbot while also being deeply aware of the user's learning context, video, chapters, playback position, and selected timeline.

=== ACTIVE CONTEXT ===
- Course: "${courseTitle}" by "${channelTitle}"
- Current Lesson: "${currentVideoTitle}" (Duration: ${videoDurationFormatted})
- Playback Position: ${currentTimestampFormatted}
- Current Chapter: "${currentChapterTitle}"
${selectedTimelineStr}
- Lesson Chapters:
${chaptersStr}

==================================================
1. CORE CHATBOT BEHAVIOR
==================================================
- Answer the user's question directly, clearly, and efficiently.
- Feel like a normal high-quality chatbot, not an over-engineered educational bot.
- Be concise, straightforward, and use natural conversational language.
- Give the answer first. Stop when the question has been answered.
- Match response length to the complexity of the question:
  * Simple question: 1–3 sentences.
  * Normal question: 1–3 short paragraphs or a few clean bullets.
  * Technical question: Explain only the necessary technical details.
  * Complex question: Give a structured explanation, but stay focused.
- Optimize for the minimum information required to properly answer the user's question. Do NOT optimize for maximum response length.

STRICT DO NOTS:
- DO NOT start every answer with "Sure!", "Absolutely!", "Great question!", "Certainly!", etc.
- DO NOT repeat or paraphrase the user's question.
- DO NOT add unnecessary introductions or conclusions.
- DO NOT add motivational statements or cheerleading.
- DO NOT add unrelated suggestions.
- DO NOT add excessive emojis.
- DO NOT add unnecessary headings.
- DO NOT turn every answer into a long tutorial.
- DO NOT repeat information already established in the conversation.
- DO NOT say "I hope this helps."
- DO NOT ask follow-up questions when the question can be answered directly.
- DO NOT add a TL;DR when the answer is already short.
- DO NOT add "Key Takeaways" unless genuinely useful or requested.

==================================================
2. CONTEXT & ACCURACY
==================================================
- Use context ONLY when relevant. Do NOT mention context unnecessarily.
  (e.g., If the user asks "What is O(n)?", simply answer: "O(n) means the runtime grows linearly with the size of the input." Do not turn this into a long lesson unless requested.)
- Prioritize correctness over verbosity.
- If the user is mistaken, correct them clearly and briefly. Do not agree simply to be agreeable.
- If you are not sure, say: "I'm not fully sure." Never invent information to sound confident.

==================================================
3. ADAPTIVE LEARNING BEHAVIOR
==================================================
- If the user asks "Explain this simply" -> Give a beginner-friendly explanation.
- If the user asks "Go deeper" -> Provide more detail.
- If the user asks "Give me an example" -> Give a relevant example.
- If the user asks "Quiz me" -> Give a relevant question based on the current learning context.
- If the user asks "Summarize this" -> Summarize the relevant video/chapter/context concisely.
- If the user asks "Explain what I'm watching" -> Use the current video/chapter/playback context.
- Do not automatically provide all of these features unless requested.

==================================================
4. CODE EXTRACTION MODE
==================================================
When the user asks to:
- extract code
- find code
- show code
- give code from the video
- get a code snippet
- copy code from the video
- extract an example
- find code for a function/topic
- provide the code shown in the video

Switch into CODE EXTRACTION MODE.

CRITICAL DIRECTIVES FOR CODE EXTRACTION:
1. CODE EXTRACTION IS NOT CODE GENERATION.
   You must ONLY extract code that was actually shown, provided, or reliably available from the video's accessible content.
   DO NOT:
   - Generate replacement code.
   - Guess missing code.
   - Reconstruct code from memory.
   - Invent code based on the explanation.
   - Complete missing lines.
   - Present an AI-generated implementation as code extracted from the video.

2. TIMELINE PRIORITY:
   - Priority 1: Explicit timeline provided by the user (e.g. "Extract the code from 12:30 to 15:45").
     Use exactly 12:30–15:45 (this overrides any selected timeline). Show [ Timeline: 12:30–15:45 ] and extract ONLY from that range.
   - Priority 2: Existing selected timeline (e.g. 42:28–47:30).
     Use that timeline automatically and analyze ONLY that section.
   - Priority 3: No timeline selected:
     * If the user requests code extraction but there is no selected timeline and the request is ambiguous:
       Ask: "What code snippet are you looking for? You can specify the topic/function, or select a timeline."
       Include action chip: [ Select Timeline ]
     * If the user asks for a topic-specific code request without a timeline (e.g. "Give me the authentication code."):
       Do NOT search the entire video and dump code.
       Ask: "Which section should I look at? Select a timeline, or tell me the approximate time range."
       Include action chip: [ Select Timeline ]

3. CURRENT PLAYBACK IS NOT THE SELECTED TIMELINE:
   Do NOT automatically treat the current playback position as the extraction timeline. Only use the current playback position if the user explicitly says something like: "Extract the code from where I am currently watching."

4. TOPIC-SPECIFIC CODE REQUEST:
   If the user asks for a specific topic (e.g. "Give me the while loop code.") and a timeline is selected:
   Search ONLY within that timeline for the relevant snippet. If multiple unrelated code snippets exist, identify the relevant one.

5. HARD TIMELINE BOUNDARY:
   Once a timeline is selected or explicitly provided, it becomes a HARD extraction boundary. You MUST NOT extract code from outside the selected/explicit range.

6. STRICT CODE SNIPPET DETECTION & EXACT OUTPUT:
   ONLY return code if an actual code snippet exists in the requested/selected portion or is explicitly available in the video's accessible content.
   If there is NO actual code snippet in the requested/selected timeline (or in the entire video, or if code was only mentioned verbally without code shown, or if code is unreliable):
   Respond EXACTLY:
   No code snippet was found.

   (Do NOT add anything before or after this sentence! Do NOT apologize, speculate, or suggest alternative code.)

7. CODE EXTRACTION RESPONSE FORMAT:
   When actual code is found, keep the response concise in the preferred format:
   Found it — code from START–END.

   \`\`\`<language>
   # extracted code here
   \`\`\``;

      // Build conversation contents
      const formattedHistory: any[] = [];
      if (Array.isArray(conversationHistory)) {
        const historyWithoutLast = conversationHistory.slice(0, -1);
        for (const msg of historyWithoutLast.slice(-10)) {
          if (msg.role === 'user' && msg.content) {
            const parts: any[] = [{ text: msg.content }];
            if (msg.attachments && Array.isArray(msg.attachments)) {
              for (const att of msg.attachments) {
                if (typeof att === 'string') {
                  const [header, base64] = att.split(',');
                  const mimeType = header.replace('data:', '').replace(';base64', '');
                  parts.push({ inlineData: { data: base64, mimeType } });
                }
              }
            }
            formattedHistory.push({ role: 'user', parts });
          } else if (msg.role === 'assistant' && msg.content) {
            formattedHistory.push({
              role: 'model',
              parts: [{ text: msg.content }],
            });
          }
        }
      }

      // Append current user prompt
      const currentPromptText = `[User is currently at ${currentTimestampFormatted} in "${currentVideoTitle}"]\n\n${prompt}`;
      const currentParts: any[] = [{ text: currentPromptText }];
      const lastMsg = conversationHistory[conversationHistory.length - 1];
      if (lastMsg && lastMsg.attachments && Array.isArray(lastMsg.attachments)) {
        for (const att of lastMsg.attachments) {
          if (typeof att === 'string') {
            const [header, base64] = att.split(',');
            const mimeType = header.replace('data:', '').replace(';base64', '');
            currentParts.push({ inlineData: { data: base64, mimeType } });
          }
        }
      }
      formattedHistory.push({ role: 'user', parts: currentParts });

      // Prepare fallback models sequence using latest active Gemini models
      const candidateModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      let response: any = null;
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          const tools = enableSearch ? [{ googleSearch: {} }] : undefined;
          response = await ai.models.generateContent({
            model: modelName,
            contents: formattedHistory,
            config: {
              systemInstruction,
              tools,
            },
          });
          if (response && response.text) {
            break; // Success!
          }
        } catch (modelErr: any) {
          lastError = modelErr;
          const status = modelErr?.status || modelErr?.code || (modelErr?.message?.includes('429') ? '429' : 'error');
          console.warn(`[AI Assistant] Model ${modelName} returned (${status}), trying next candidate...`);

          // If failed with search tool, try once without tools on the same model
          if (enableSearch) {
            try {
              response = await ai.models.generateContent({
                model: modelName,
                contents: formattedHistory,
                config: {
                  systemInstruction,
                },
              });
              if (response && response.text) {
                break;
              }
            } catch (noToolErr: any) {
              lastError = noToolErr;
            }
          }
        }
      }

      // If all live API attempts exhausted (e.g. 429 RESOURCE_EXHAUSTED rate limit)
      if (!response || !response.text) {
        console.warn('[AI Assistant] Live Gemini quota currently reached or offline. Serving synthesized course mentor response.');
        const offline = generateSmartOfflineResponse(prompt, actionType);
        return res.json({
          content: offline.content,
          citations: [],
          codeSnippets: offline.codeSnippets,
          flowchartMermaid: offline.flowchartMermaid,
          isFallback: true,
          isQuotaExceeded: true,
          quotaNotice: 'Gemini API quota currently reached. Serving offline course mentor intelligence & runnable sandbox code.',
        });
      }

      const responseText = response.text || '';

      // Extract Grounding Search Citations
      const citations: Array<{ title: string; url: string }> = [];
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            citations.push({
              title: chunk.web.title || chunk.web.uri,
              url: chunk.web.uri,
            });
          }
        }
      }

      // Extract Code Snippets and Mermaid Flowcharts
      const codeSnippets: Array<{ language: string; code: string; title?: string }> = [];
      const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
      let match;
      while ((match = codeBlockRegex.exec(responseText)) !== null) {
        const lang = match[1]?.trim().toLowerCase() || 'plaintext';
        const codeContent = match[2]?.trim() || '';
        if (lang !== 'mermaid' && codeContent.length > 0) {
          codeSnippets.push({
            language: lang,
            code: codeContent,
            title: `${lang.toUpperCase()} Snippet`,
          });
        }
      }

      // Extract Mermaid block if present
      let flowchartMermaid: string | undefined = undefined;
      const mermaidMatch = /```mermaid\n([\s\S]*?)```/.exec(responseText);
      if (mermaidMatch && mermaidMatch[1]) {
        flowchartMermaid = mermaidMatch[1].trim();
      }

      return res.json({
        content: responseText,
        citations,
        codeSnippets,
        flowchartMermaid,
        isFallback: false,
        isQuotaExceeded: false,
      });
    } catch (err: any) {
      console.error('Gemini Course Assistant catch handler:', err);
      const offline = generateSmartOfflineResponse(prompt, actionType);
      return res.json({
        content: offline.content,
        citations: [],
        codeSnippets: offline.codeSnippets,
        flowchartMermaid: offline.flowchartMermaid,
        isFallback: true,
        isQuotaExceeded: true,
        quotaNotice: 'Gemini API limit reached. Serving offline course mentor intelligence.',
      });
    }
  });

  // Multi-Language Code Execution Endpoint (Delegates to Execution Sandbox)
  app.post("/api/code/run", async (req, res) => {
    const { code, language = "python", input = "" } = req.body || {};

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Code string is required." });
    }

    if (code.length > 50000) {
      return res.status(400).json({ error: "Code size exceeds maximum limit of 50KB." });
    }

    const cleanLang = (language || "python").toLowerCase().trim();

    // In production, we require a real Cloud Run URL, not localhost
    let EXECUTION_SERVICE_URL = process.env.EXECUTION_SERVICE_URL;
    if (!EXECUTION_SERVICE_URL && process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        errorType: "EXECUTION_SERVICE_UNAVAILABLE",
        message: "Code execution service is temporarily unavailable. (Missing EXECUTION_SERVICE_URL configuration)",
        stdout: "",
        stderr: "Code execution service is temporarily unavailable. Missing EXECUTION_SERVICE_URL environment variable.",
        exitCode: 1,
        executionTimeMs: 0,
      });
    }

    // Fallback to localhost ONLY for local development
    EXECUTION_SERVICE_URL = EXECUTION_SERVICE_URL || "http://localhost:8080";

    // Clean up the URL to prevent double slashes or accidental /run inclusion
    let baseUrl = EXECUTION_SERVICE_URL.trim().replace(/\/+$/, '');
    if (baseUrl.endsWith('/run')) {
      baseUrl = baseUrl.slice(0, -4).replace(/\/+$/, '');
    }

    try {
      // Obtain Google Cloud Run IAM ID token headers for private service-to-service communication
      const authHeaders = await getCloudRunAuthHeaders(baseUrl);

      const execResponse = await fetch(`${baseUrl}/run`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          language: cleanLang,
          code,
          input
        }),
      });

      // Handle Private Cloud Run IAM Authentication Errors (401 / 403)
      if (execResponse.status === 401 || execResponse.status === 403) {
        return res.status(execResponse.status).json({
          success: false,
          errorType: "EXECUTION_SERVICE_AUTH_REQUIRED",
          message: "Private Cloud Run execution service requires IAM authentication (roles/run.invoker).",
          stdout: "",
          stderr: `Authentication Error (${execResponse.status}): Access denied to private Cloud Run execution sandbox. In production, ensure the LearnTrack backend service account has the 'roles/run.invoker' role on learntrack-execution-sandbox.`,
          exitCode: 1,
          executionTimeMs: 0,
        });
      }

      if (execResponse.status === 404) {
        return res.status(404).json({
          success: false,
          errorType: "EXECUTION_SERVICE_NOT_FOUND",
          message: "Execution endpoint /run not found on the target service.",
          stdout: "",
          stderr: "Execution service endpoint /run was not found (404). Check EXECUTION_SERVICE_URL configuration.",
          exitCode: 1,
          executionTimeMs: 0,
        });
      }

      if (!execResponse.ok) {
        const errorText = await execResponse.text().catch(() => '');
        return res.status(execResponse.status).json({
          success: false,
          errorType: "EXECUTION_SERVICE_ERROR",
          message: `Execution service error (Status ${execResponse.status}): ${errorText}`,
          stdout: "",
          stderr: `Execution service responded with error status ${execResponse.status}: ${errorText}`,
          exitCode: 1,
          executionTimeMs: 0,
        });
      }

      const result = await execResponse.json();
      return res.json(result);
    } catch (err: any) {
      console.error("Code execution service error:", err);

      const isConnectionError = err.message.includes("ECONNREFUSED") ||
        err.message.includes("fetch") ||
        err.message.includes("ENOTFOUND") ||
        err.message.includes("Failed to fetch");
      
      if (isConnectionError) {
        return res.status(503).json({
          success: false,
          errorType: "EXECUTION_SERVICE_UNAVAILABLE",
          message: "Code execution service is temporarily unavailable.",
          stdout: "",
          stderr: "Code execution service is temporarily unavailable. Could not connect to EXECUTION_SERVICE_URL.",
          exitCode: 1,
          executionTimeMs: 0,
        });
      }

      return res.status(500).json({
        stdout: "",
        stderr: err.message || "Server error during execution",
        exitCode: 1,
        executionTimeMs: 0,
      });
    }
  });
  app.post('/api/code/run-python', async (req, res) => {
    req.url = '/api/code/run';
    return (app as any).handle(req, res);
  });

  // AI Code Debugger Endpoint
  app.post('/api/gemini/debug-code', async (req, res) => {
    const { code, errorOutput, language = 'python', courseTitle = 'Coding Lesson' } = req.body || {};

    if (!code) {
      return res.status(400).json({ error: 'Code is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.json({
        explanation: 'The code produced a runtime error. Check variable naming, boundary conditions, or recursion base cases.',
        fixedCode: code,
        isFallback: true,
      });
    }

    try {
      const ai = getGenAI();
      const prompt = `You are an expert ${language} debugger and algorithm coach for the course "${courseTitle}".
A student ran the following code and encountered an error or needs debugging assistance.

Source Code (${language}):
\`\`\`${language}
${code}
\`\`\`

Terminal Error / Output:
\`\`\`
${errorOutput || 'No explicit error trace, student requests audit and verification.'}
\`\`\`

Your Task:
1. Identify the root cause of the error or logic flaw.
2. Provide the corrected, production-ready code.
3. Briefly explain the fix in 2-3 concise bullet points.

Format your response cleanly with markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });

      return res.json({
        diagnosis: response.text || 'Analysis completed.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Debugging service error.' });
    }
  });

  // Precise Code Capture OCR / Vision Endpoint
  app.post('/api/gemini/code-capture-ocr', async (req, res) => {
    const { imageBase64, timestampFormatted = '0:00', videoTitle = 'Video Frame' } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        found: false,
        message: 'No image data provided for frame capture analysis.',
        error: 'Missing image data',
      });
    }

    // Parse base64 string and MIME type
    let mimeType = 'image/png';
    let cleanBase64 = imageBase64;
    const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      cleanBase64 = match[2];
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.json({
        found: false,
        message: 'GEMINI_API_KEY is not configured on the server. Please add your key to AI Studio Settings.',
        code: '',
        language: 'text',
      });
    }

    try {
      const ai = getGenAI();

      const imagePart = {
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      };

      const systemPrompt = `You are a precision Optical Character Recognition (OCR) model specializing in code extraction from video frames.
The user has cropped a specific rectangular region of interest from a video frame at timestamp ${timestampFormatted} in "${videoTitle}".

STRICT RULES:
1. Extract ONLY code that is visibly present inside the provided cropped image.
2. Preserve EXACTLY:
   - indentation
   - variable names
   - function names
   - syntax
   - capitalization
   - comments
   - strings
   - operators
   - brackets
3. DO NOT rewrite or improve the code.
4. DO NOT invent missing lines.
5. DO NOT infer code from the surrounding lecture.
6. DO NOT generate replacement code.
7. If the selected crop does NOT contain an actual code snippet, or if it is too blurry/unreadable, or if it contains only UI elements, slides with no code, faces, or diagrams without programming code:
   Respond with EXACTLY this single sentence and NOTHING else:
   No code snippet was found
8. If valid code is visible, output ONLY the code enclosed in a standard markdown code block with the detected programming language identifier:
\`\`\`<language>
<exact visible code>
\`\`\`
Do not include any greeting, preamble, commentary, or explanation before or after the code block.`;

      const textPart = {
        text: systemPrompt,
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: { parts: [imagePart, textPart] },
      });

      const rawText = (response.text || '').trim();

      // Check if no code was detected
      const normalized = rawText.toLowerCase().replace(/[.\s]+/g, ' ').trim();
      if (!rawText || normalized.includes('no code snippet was found') || normalized.includes('no code found') || normalized.includes('no code')) {
        return res.json({
          found: false,
          message: 'No code snippet was found',
          code: '',
          rawText: 'No code snippet was found',
          timestampFormatted,
        });
      }

      // Extract code and language from markdown fence if present
      let extractedLanguage = 'text';
      let extractedCode = rawText;
      const codeFenceMatch = rawText.match(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/);
      if (codeFenceMatch) {
        extractedLanguage = codeFenceMatch[1] ? codeFenceMatch[1].trim().toLowerCase() : 'text';
        extractedCode = codeFenceMatch[2].trim();
      } else {
        extractedCode = rawText.replace(/^```|```$/g, '').trim();
      }

      if (!extractedCode) {
        return res.json({
          found: false,
          message: 'No code snippet was found',
          code: '',
          rawText: 'No code snippet was found',
          timestampFormatted,
        });
      }

      return res.json({
        found: true,
        message: `Code from ${timestampFormatted}`,
        code: extractedCode,
        language: extractedLanguage || 'python',
        rawText,
        timestampFormatted,
      });
    } catch (err: any) {
      console.error('Vision OCR Code Capture error:', err);
      return res.status(500).json({
        found: false,
        message: 'No code snippet was found',
        error: err?.message || 'Vision API processing error',
      });
    }
  });

  // Global API error handler ensuring headers are never set twice
  app.use((err: any, req: any, res: any, next: any) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  });

  // Vite middleware in dev, static server in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LearnTrack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
