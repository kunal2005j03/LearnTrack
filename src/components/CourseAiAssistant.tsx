import { Paperclip, Upload, ClipboardPaste, Crop } from "lucide-react";
import { ImageCropper } from "./ImageCropper";
import { AiAttachment } from "../types";
import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  Play,
  Terminal,
  ExternalLink,
  Code2,
  GitCommit,
  Search,
  Loader2,
  FileText,
  Trash2,
  Clock,
  Sliders,
  X,
  ListOrdered,
  FileCode,
  RotateCcw,
  MessageSquarePlus,
  HelpCircle,
  Zap,
  MessageSquare,
  Camera,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { formatSeconds } from '../utils/formatters';
import { AiAssistantMessage, Course, CourseVideo, YouTubeChapter, DoubtContext } from '../types';
import { InteractiveCodeTerminal } from './InteractiveCodeTerminal';
import { FlowchartViewer } from './FlowchartViewer';
import { CodeBlockViewer } from './CodeBlockViewer';
import { AiMarkdownMessage } from './AiMarkdownMessage';

interface CourseAiAssistantProps {
  course: Course;
  currentVideo: CourseVideo;
  currentTimeSeconds: number;
  currentChapter?: YouTubeChapter | null;
  chapters?: YouTubeChapter[];
  completedVideoIds?: string[];
  allVideos?: CourseVideo[];
  isFullscreenMode?: boolean;
  doubtContext?: DoubtContext | null;
  onClearDoubtContext?: () => void;
  onClose?: () => void;
}

export const CourseAiAssistant: React.FC<CourseAiAssistantProps> = ({
  course,
  currentVideo,
  currentTimeSeconds,
  currentChapter: propCurrentChapter,
  chapters = [],
  completedVideoIds = [],
  allVideos = [],
  isFullscreenMode = false,
  doubtContext,
  onClearDoubtContext,
  onClose,
}) => {
  const storageKey = `learntrack_course_ai_memory_${course.id || course.playlistId || 'default'}`;
  const terminalNavKey = `learntrack_terminal_nav_${course.id || course.playlistId || 'default'}`;
  const timelineKey = `learntrack_selected_timeline_${course.id || course.playlistId || 'default'}`;

  const [messages, setMessages] = useState<AiAssistantMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`learntrack_course_ai_memory_${course.id || course.playlistId || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((m) => !(m.timelineConfirmation && !m.timelineConfirmation.confirmed));
        }
      }
    } catch (e) {
      console.error('Failed to load course AI memory:', e);
    }
    return [];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const [showTerminal, setShowTerminal] = useState<boolean>(false);

  const [activeSnippetForTerminal, setActiveSnippetForTerminal] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(`learntrack_terminal_nav_${course.id || course.playlistId || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeSnippet) return parsed.activeSnippet;
      }
    } catch {}
    return null;
  });

  const [activeLanguageForTerminal, setActiveLanguageForTerminal] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`learntrack_terminal_nav_${course.id || course.playlistId || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.userExplicitlySelectedLanguage && parsed.activeLanguage) {
          const l = parsed.activeLanguage.toLowerCase();
          if (l === 'python' || l === 'go' || l === 'golang' || l === 'java' || l === 'cpp' || l === 'c++') {
            return l;
          }
        }
      }
    } catch {}
    return 'python';
  });

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const isUpdatingFromSyncRef = useRef<boolean>(false);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Active Timelapse Section Focus (Shared Single Source of Truth)
  const [selectedTimelapse, setSelectedTimelapse] = useState<{
    label: string;
    startFormatted: string;
    endFormatted: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem(`learntrack_selected_timeline_${course.id || course.playlistId || 'default'}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });
  const [showTimelapsePicker, setShowTimelapsePicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [pendingOriginalRequest, setPendingOriginalRequest] = useState<{
    prompt: string;
    actionType: 'general' | 'summary' | 'code' | 'flowchart' | 'debug' | 'search';
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle extracted code snippet from precise frame vision OCR
  const handleCodeExtracted = (result: {
    messageId?: string;
    found: boolean;
    code: string;
    language: string;
    timestampFormatted: string;
    rawText: string;
  }) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = result.messageId || `code-${Date.now()}`;
    if (processedMessageIds.current.has(msgId)) return;
    processedMessageIds.current.add(msgId);
    if (result.found && result.code) {
      const codeSnippetItem = {
        language: result.language || 'python',
        code: result.code,
        title: `Code from ${result.timestampFormatted}`,
      };
      const aiMsg: AiAssistantMessage = {
        id: msgId,
        role: 'assistant',
        content: `Code from ${result.timestampFormatted}\n\n\`\`\`${result.language || 'python'}\n${result.code}\n\`\`\``,
        timestamp,
        actionType: 'code',
        videoTimestampFormatted: result.timestampFormatted,
        videoTitle: currentVideo.title,
        codeSnippets: [codeSnippetItem],
      };
      setMessages((prev) => prev.some(m => m.id === aiMsg.id) ? prev : [...prev, aiMsg]);
    } else {
      const aiMsg: AiAssistantMessage = {
        id: msgId,
        role: 'assistant',
        content: `No code snippet was found`,
        timestamp,
        actionType: 'code',
        videoTimestampFormatted: result.timestampFormatted,
        videoTitle: currentVideo.title,
        codeSnippets: [],
      };
      setMessages((prev) => prev.some(m => m.id === aiMsg.id) ? prev : [...prev, aiMsg]);
    }
  };

  // Format current playback time
  const formatTime = (secs: number) => {
    return formatSeconds(secs);
  };

  const formattedCurrentTime = formatTime(currentTimeSeconds);
  const activeChapter = propCurrentChapter || chapters.find(
    (ch) =>
      currentTimeSeconds >= ch.startSeconds &&
      (ch.endSeconds ? currentTimeSeconds < ch.endSeconds : true)
  );

  // Synchronize timeline state across components and storage
  const handleUpdateTimeline = (
    newTimeline: { label: string; startFormatted: string; endFormatted: string } | null,
    skipConfirmation: boolean = false
  ) => {
    setSelectedTimelapse(newTimeline);
    try {
      if (newTimeline) {
        localStorage.setItem(timelineKey, JSON.stringify(newTimeline));
      } else {
        localStorage.removeItem(timelineKey);
      }
      window.dispatchEvent(
        new CustomEvent('learntrack_shared_timeline_updated', {
          detail: { timelineKey, timeline: newTimeline },
        })
      );
    } catch (e) {}

    if (newTimeline && !skipConfirmation) {
      const originalPrompt = pendingOriginalRequest?.prompt || 'Extract code from the video.';
      const origAction = pendingOriginalRequest?.actionType || 'code';

      // Insert or replace timeline confirmation card inside chat interaction area
      const confirmMsg: AiAssistantMessage = {
        id: `timeline-confirm-${Date.now()}`,
        role: 'assistant',
        content: 'Use this timeline for the extraction?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timelineConfirmation: {
          timeline: newTimeline,
          confirmed: false,
          originalRequestPrompt: originalPrompt,
          actionType: origAction,
        },
      };

      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => !(m.timelineConfirmation && !m.timelineConfirmation.confirmed)
        );
        return [...filtered, confirmMsg];
      });
    } else if (!newTimeline) {
      // Upon cancellation / clearing timeline, remove any pending unconfirmed timeline confirmation messages
      setMessages((prev) =>
        prev.filter(
          (m) => !(m.timelineConfirmation && !m.timelineConfirmation.confirmed)
        )
      );
    }
  };

  // Sync timeline in real-time across instances & handle open requests
  useEffect(() => {
    const handleTimelineSync = (e: any) => {
      if (e.detail && e.detail.timelineKey === timelineKey) {
        setSelectedTimelapse(e.detail.timeline);
        if (!e.detail.timeline) {
          setMessages((prev) =>
            prev.filter(
              (m) => !(m.timelineConfirmation && !m.timelineConfirmation.confirmed)
            )
          );
        }
      }
    };
    const handleOpenPicker = () => {
      setShowTimelapsePicker(true);
    };
    window.addEventListener('learntrack_shared_timeline_updated', handleTimelineSync);
    window.addEventListener('learntrack_open_timeline_picker', handleOpenPicker);
    return () => {
      window.removeEventListener('learntrack_shared_timeline_updated', handleTimelineSync);
      window.removeEventListener('learntrack_open_timeline_picker', handleOpenPicker);
    };
  }, [timelineKey]);

  // Ensure unconfirmed timeline prompts are removed when no timeline is active
  useEffect(() => {
    if (!selectedTimelapse) {
      setMessages((prev) => {
        const hasUnconfirmed = prev.some(
          (m) => m.timelineConfirmation && !m.timelineConfirmation.confirmed
        );
        if (!hasUnconfirmed) return prev;
        return prev.filter(
          (m) => !(m.timelineConfirmation && !m.timelineConfirmation.confirmed)
        );
      });
    }
  }, [selectedTimelapse]);

  // Load course-specific memory on course switch
  const lastStorageKeyRef = useRef<string>(storageKey);
  useEffect(() => {
    if (lastStorageKeyRef.current !== storageKey) {
      lastStorageKeyRef.current = storageKey;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setMessages(
              parsed.filter(
                (m) => !(m.timelineConfirmation && !m.timelineConfirmation.confirmed)
              )
            );
            return;
          }
        }
      } catch (e) {
        console.error('Failed to load course AI memory:', e);
      }
      setMessages([]);
    }
  }, [storageKey]);

  // Persist messages to course-specific memory only when messages exist or change (Never persist transient unconfirmed prompts!)
  useEffect(() => {
    if (isUpdatingFromSyncRef.current) return;
    try {
      const persistableMessages = messages.filter(
        (m) => !(m.timelineConfirmation && !m.timelineConfirmation.confirmed)
      );
      if (persistableMessages.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(persistableMessages.slice(-50)));
      } else {
        localStorage.removeItem(storageKey);
      }
      window.dispatchEvent(
        new CustomEvent('learntrack_chat_updated', {
          detail: { storageKey, messages: persistableMessages },
        })
      );
    } catch (e) {
      console.error('Failed to save course AI memory:', e);
    }
  }, [messages, storageKey]);

  // Sync messages in real-time across instances (fullscreen mode toggle, tab switch, mobile drawer)
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail && e.detail.storageKey === storageKey && Array.isArray(e.detail.messages)) {
        isUpdatingFromSyncRef.current = true;
        const uniqueMessages = e.detail.messages.filter((v: any, i: number, a: any[]) => a.findIndex(t => (t.id === v.id)) === i);
        setMessages(uniqueMessages);
        setTimeout(() => {
          isUpdatingFromSyncRef.current = false;
        }, 50);
      }
    };
    window.addEventListener('learntrack_chat_updated', handleSync);
    return () => window.removeEventListener('learntrack_chat_updated', handleSync);
  }, [storageKey]);

  // Persist terminal view mode and active snippet
  useEffect(() => {
    try {
      localStorage.setItem(
        terminalNavKey,
        JSON.stringify({
          showTerminal,
          activeSnippet: activeSnippetForTerminal,
          activeLanguage: activeLanguageForTerminal,
        })
      );
      window.dispatchEvent(
        new CustomEvent('learntrack_terminal_nav_updated', {
          detail: {
            navKey: terminalNavKey,
            state: { showTerminal, activeSnippetForTerminal, activeLanguageForTerminal },
          },
        })
      );
    } catch {}
  }, [showTerminal, activeSnippetForTerminal, activeLanguageForTerminal, terminalNavKey]);

  useEffect(() => {
    const handleNavSync = (e: any) => {
      if (e.detail && e.detail.navKey === terminalNavKey && e.detail.state) {
        const s = e.detail.state;
        if (typeof s.showTerminal === 'boolean') setShowTerminal(s.showTerminal);
        if (s.activeSnippetForTerminal !== undefined) setActiveSnippetForTerminal(s.activeSnippetForTerminal);
        if (s.activeLanguageForTerminal !== undefined) setActiveLanguageForTerminal(s.activeLanguageForTerminal);
      }
    };
    window.addEventListener('learntrack_terminal_nav_updated', handleNavSync);
    return () => window.removeEventListener('learntrack_terminal_nav_updated', handleNavSync);
  }, [terminalNavKey]);

  // Ensure that whenever doubtContext is provided or updated, Chat view is active (never the terminal)
  useEffect(() => {
    if (doubtContext) {
      setShowTerminal(false);
    }
  }, [doubtContext]);

  // Listen for explicit events to focus on AI chat / doubt section
  useEffect(() => {
    const handleOpenChat = (e: any) => {
      setShowTerminal(false);
      if (e?.detail?.clearDoubt && onClearDoubtContext) {
        onClearDoubtContext();
      }
    };
    window.addEventListener('learntrack_open_ai_chat', handleOpenChat);
    return () => window.removeEventListener('learntrack_open_ai_chat', handleOpenChat);
  }, [onClearDoubtContext]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Explicit user clear chat history
  const handleClearChat = () => {
    try {
      localStorage.removeItem(storageKey);
      window.dispatchEvent(
        new CustomEvent('learntrack_chat_updated', {
          detail: { storageKey, messages: [] },
        })
      );
    } catch (e) {}
    setMessages([]);
    setShowClearConfirm(false);
  };

  // Explicit user clear terminal code & state
  const handleClearTerminal = () => {
    const termStateKey = `learntrack_terminal_state_${course.id || course.playlistId || course.title.replace(/\s+/g, '_')}`;
    setActiveSnippetForTerminal(null);
    try {
      localStorage.setItem(
        termStateKey,
        JSON.stringify({
          code: '',
          language: activeLanguageForTerminal,
          result: null,
          viewMode: 'split',
        })
      );
      window.dispatchEvent(
        new CustomEvent('learntrack_terminal_state_updated', {
          detail: {
            storageKey: termStateKey,
            state: { code: '', language: activeLanguageForTerminal, result: null, viewMode: 'split' },
          },
        })
      );
    } catch (e) {}
    try {
      localStorage.setItem(
        terminalNavKey,
        JSON.stringify({
          showTerminal: true,
          activeSnippet: null,
          activeLanguage: activeLanguageForTerminal,
        })
      );
      window.dispatchEvent(
        new CustomEvent('learntrack_terminal_nav_updated', {
          detail: {
            navKey: terminalNavKey,
            state: { showTerminal: true, activeSnippetForTerminal: null, activeLanguageForTerminal },
          },
        })
      );
    } catch (e) {}
    setShowClearConfirm(false);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newAttachment: AiAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'video-screenshot',
        dataUrl,
        videoId: currentVideo.id,
        videoTitle: currentVideo.title,
        timestampSeconds: currentTimeSeconds,
        timestampFormatted: formattedCurrentTime,
      };
      setAttachments(prev => [...prev, newAttachment]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(processImageFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowAttachmentMenu(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    files.forEach(processImageFile);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.items) {
      const items = Array.from(e.clipboardData.items);
      for (const item of items) {
        if (item.type.indexOf('image') === 0) {
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
            e.preventDefault();
          }
        }
      }
    }
  };

  const sendMessage = async (
    promptToSend?: string,
    actionType: 'general' | 'summary' | 'code' | 'flowchart' | 'debug' | 'search' = 'general',
    timelapseOverride?: { label: string; startFormatted: string; endFormatted: string } | null,
    attachmentsOverride?: AiAttachment[]
  ) => {
    const rawText = (promptToSend || inputText).trim();
    const currentAttachments = attachmentsOverride !== undefined ? attachmentsOverride : attachments;
    if ((!rawText && currentAttachments.length === 0) || isLoading) return;

    // Check for explicit timeline specified in user message (e.g. 12:30-15:45)
    const explicitTimelineMatch = rawText.match(/(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})/i);
    let activeTimelapse = timelapseOverride !== undefined ? timelapseOverride : selectedTimelapse;

    if (explicitTimelineMatch) {
      activeTimelapse = {
        label: `Explicit (${explicitTimelineMatch[1]} - ${explicitTimelineMatch[2]})`,
        startFormatted: explicitTimelineMatch[1],
        endFormatted: explicitTimelineMatch[2],
      };
      handleUpdateTimeline(activeTimelapse, true);
    } else {
      setPendingOriginalRequest({ prompt: rawText, actionType });
    }

    const timelapsePrefix = activeTimelapse
      ? `[Target Video Section / Timelapse: ${activeTimelapse.startFormatted} - ${activeTimelapse.endFormatted} ("${activeTimelapse.label}")]\n`
      : '';
    const fullPrompt = `${timelapsePrefix}${rawText}`;

    const userMsg: AiAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: rawText,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionType,
      videoTimestampSeconds: doubtContext ? doubtContext.timestampSeconds : currentTimeSeconds,
      videoTimestampFormatted: activeTimelapse ? `${activeTimelapse.startFormatted} - ${activeTimelapse.endFormatted}` : (doubtContext ? doubtContext.timestampFormatted : formattedCurrentTime),
      videoTitle: currentVideo.title,
    };

    if (doubtContext && onClearDoubtContext) {
      onClearDoubtContext();
    }

    // Filter out any pending unconfirmed prompt/timeline messages to avoid stale composer states
    const cleanHistory = messages.filter((m) => !(m.timelineConfirmation && !m.timelineConfirmation.confirmed));
    const updatedMessages = cleanHistory.some((m) => m.id === userMsg.id) ? cleanHistory : [...cleanHistory, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setAttachments([]);
    setIsLoading(true);

    // Assemble watched videos context
    const watchedVideosContext = allVideos
      .filter((v) => completedVideoIds.includes(v.id))
      .map((v) => ({
        id: v.id,
        title: v.title,
        position: v.position,
        durationFormatted: v.durationFormatted,
        completed: true,
      }));

    try {
      const response = await fetch('/api/gemini/course-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          actionType,
          courseContext: {
            id: course.id,
            title: course.title,
            channelTitle: course.channelTitle,
            description: course.description,
            totalVideos: course.totalVideos,
            completedVideos: completedVideoIds.length,
          },
          watchedVideosContext,
          currentVideoContext: {
            id: currentVideo.id,
            title: currentVideo.title,
            channelTitle: currentVideo.channelTitle,
            description: currentVideo.description,
            durationFormatted: currentVideo.durationFormatted,
            currentTimestampSeconds: currentTimeSeconds,
            currentTimestampFormatted: formattedCurrentTime,
            selectedTimeline: activeTimelapse,
            currentChapter: activeChapter ? {
              title: activeChapter.title,
              formattedStart: activeChapter.formattedStart,
              formattedEnd: activeChapter.formattedEnd,
            } : null,
            chapters: chapters.slice(0, 30),
          },
          conversationHistory: updatedMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments?.map(a => a.dataUrl),
          })),
          enableSearch: true,
        }),
      });

      const data = await response.json();

      const msgId = data.id || `ai-${Date.now()}`;
      if (processedMessageIds.current.has(msgId)) return;
      processedMessageIds.current.add(msgId);

      const aiMsg: AiAssistantMessage = {
        id: msgId,
        role: 'assistant',
        content: data.content || 'I have analyzed your request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionType,
        citations: data.citations,
        codeSnippets: data.codeSnippets,
        flowchartMermaid: data.flowchartMermaid,
        videoTimestampFormatted: activeTimelapse ? `${activeTimelapse.startFormatted} - ${activeTimelapse.endFormatted}` : formattedCurrentTime,
        videoTitle: currentVideo.title,
        isFallback: Boolean(data.isFallback),
        quotaNotice: data.quotaNotice,
      };

      setMessages((prev) => prev.some(m => m.id === aiMsg.id) ? prev : [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: AiAssistantMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `I was unable to establish a live connection (${err?.message || 'Network error'}). You can use the Terminal or ask specific questions about the lesson.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFallback: true,
        quotaNotice: 'Connection error - offline notes active',
      };
      setMessages((prev) => prev.some(m => m.id === errorMsg.id) ? prev : [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTimeline = (
    msgId: string,
    timeline: { label: string; startFormatted: string; endFormatted: string },
    originalRequestPrompt?: string,
    actionType: 'general' | 'summary' | 'code' | 'flowchart' | 'debug' | 'search' = 'code'
  ) => {
    // 1. Immediately remove the confirmation prompt card from the chat to prevent stale UI states
    setMessages((prev) =>
      prev.filter((m) => m.id !== msgId && !(m.timelineConfirmation && !m.timelineConfirmation.confirmed))
    );

    // 2. Derive continuous extraction prompt preserving original intent
    const orig = originalRequestPrompt || pendingOriginalRequest?.prompt || 'Extract code from the video.';
    let targetPrompt = orig;

    if (orig.toLowerCase().includes('while-loop') || orig.toLowerCase().includes('while loop')) {
      targetPrompt = `Extract the while-loop code from ${timeline.startFormatted}–${timeline.endFormatted}.`;
    } else if (actionType === 'code' || orig.toLowerCase().includes('extract code') || orig.toLowerCase().includes('code')) {
      targetPrompt = `Extract code from ${timeline.startFormatted} to ${timeline.endFormatted}.`;
    } else if (actionType === 'summary' || orig.toLowerCase().includes('summar') || orig.toLowerCase().includes('notes')) {
      targetPrompt = `Summarize the section ${timeline.startFormatted}–${timeline.endFormatted}.`;
    } else if (actionType === 'flowchart' || orig.toLowerCase().includes('flowchart')) {
      targetPrompt = `Create a logic flowchart for ${timeline.startFormatted}–${timeline.endFormatted}.`;
    } else if (orig.toLowerCase().includes('pseudo')) {
      targetPrompt = `Provide pseudocode for ${timeline.startFormatted}–${timeline.endFormatted}.`;
    } else {
      targetPrompt = `Extract code from ${timeline.startFormatted} to ${timeline.endFormatted}.`;
    }

    // 3. Automatically send and process with the confirmed timeline
    sendMessage(targetPrompt, actionType, timeline);
  };

  const handleCancelTimelineConfirmation = (msgId?: string) => {
    // 1. Remove pending confirmation message from chat
    setMessages((prev) =>
      prev.filter((m) => (msgId ? m.id !== msgId : !(m.timelineConfirmation && !m.timelineConfirmation.confirmed)))
    );
    // 2. Clear the active selected timeline so everything is in sync
    setSelectedTimelapse(null);
    try {
      localStorage.removeItem(timelineKey);
      window.dispatchEvent(
        new CustomEvent('learntrack_shared_timeline_updated', {
          detail: { timelineKey, timeline: null },
        })
      );
    } catch (e) {}
  };

  const handleRunInTerminal = (code: string, language: string = 'python') => {
    setActiveSnippetForTerminal(code);
    setActiveLanguageForTerminal(language);
    setShowTerminal(true);
    try {
      const termStateKey = `learntrack_terminal_state_${course.id || course.playlistId || course.title.replace(/\s+/g, '_')}`;
      const existing = localStorage.getItem(termStateKey);
      const parsed = existing ? JSON.parse(existing) : {};
      const updated = {
        ...parsed,
        code,
        language,
      };
      localStorage.setItem(termStateKey, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent('learntrack_terminal_state_updated', {
          detail: { storageKey: termStateKey, state: updated },
        })
      );
    } catch (e) {}
  };

  const handleClearSnippet = () => {
    setActiveSnippetForTerminal(null);
    try {
      localStorage.setItem(
        terminalNavKey,
        JSON.stringify({
          showTerminal,
          activeSnippet: null,
          activeLanguage: activeLanguageForTerminal,
        })
      );
      window.dispatchEvent(
        new CustomEvent('learntrack_terminal_nav_updated', {
          detail: {
            navKey: terminalNavKey,
            state: { showTerminal, activeSnippetForTerminal: null, activeLanguageForTerminal },
          },
        })
      );
    } catch (e) {}
  };

  const handleDebugWithAi = (code: string, errorOutput: string) => {
    setShowTerminal(false);
    const debugPrompt = `Please help debug this code snippet:\n\n\`\`\`python\n${code}\n\`\`\`\n\nTerminal output / error:\n\`\`\`\n${errorOutput}\n\`\`\`\n\nExplain what went wrong and provide the corrected code.`;
    sendMessage(debugPrompt, 'debug');
  };

  // Quick Action triggers for specific Timelapse & Commands
  const triggerSummarize = () => {
    const prompt = selectedTimelapse
      ? `Summarize the section ${selectedTimelapse.startFormatted}–${selectedTimelapse.endFormatted}.`
      : `Summarize this lesson.`;
    setPendingOriginalRequest({ prompt, actionType: 'summary' });
    sendMessage(prompt, 'summary');
  };

  const triggerPseudocode = () => {
    const prompt = selectedTimelapse
      ? `Provide pseudocode for ${selectedTimelapse.startFormatted}–${selectedTimelapse.endFormatted}.`
      : `Provide pseudocode for this lesson.`;
    setPendingOriginalRequest({ prompt, actionType: 'general' });
    sendMessage(prompt, 'general');
  };

  const triggerGenerateFlowchart = () => {
    const prompt = selectedTimelapse
      ? `Create a logic flowchart for ${selectedTimelapse.startFormatted}–${selectedTimelapse.endFormatted}.`
      : `Create a logic flowchart for this lesson.`;
    setPendingOriginalRequest({ prompt, actionType: 'flowchart' });
    sendMessage(prompt, 'flowchart');
  };

  const handleApplyCustomTimelapse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart.trim() || !customEnd.trim()) return;
    handleUpdateTimeline({
      label: `Custom Interval (${customStart.trim()} - ${customEnd.trim()})`,
      startFormatted: customStart.trim(),
      endFormatted: customEnd.trim(),
    });
    setShowTimelapsePicker(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#18181b] text-zinc-100 select-text overflow-hidden relative font-sans">
          {/* Top Header: ChatGPT-Style Header with Course Badge & Terminal */}
          <div className="p-3 bg-[#18181b] border-b border-white/10 shrink-0 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">{course.title}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-zinc-300 font-medium">
                  AI Mentor
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-2 truncate">
                <span className="text-cyan-400 font-mono flex items-center gap-1 truncate">
                  <Clock className="w-3 h-3 shrink-0" />
                  @{formattedCurrentTime} {activeChapter ? `• ${activeChapter.title}` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Top View Mode Switcher: Chat vs Sandbox Terminal */}
            <div className="flex items-center bg-[#27272a] p-0.5 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setShowTerminal(false)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  !showTerminal
                    ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="AI Chat & Study Notes"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTerminal(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  showTerminal
                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Interactive Python/JS Code Terminal"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Terminal</span>
              </button>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={() => {
                  if (onClearDoubtContext) onClearDoubtContext();
                  onClose();
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Close AI Assistant"
                aria-label="Close AI Assistant"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

            {/* Clear Chat / Clear Terminal Button with In-UI Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowClearConfirm(!showClearConfirm)}
                className="p-2 rounded-xl bg-[#27272a] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition cursor-pointer"
                title={showTerminal ? 'Clear Terminal Code' : 'Clear Chat Window'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* In-UI Clear Confirmation Dropdown */}
              {showClearConfirm && (
                <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-[#18181b] border border-white/15 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <p className="text-xs font-semibold text-white">
                    {showTerminal ? 'Clear terminal code?' : 'Clear entire chat history?'}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {showTerminal
                      ? 'This resets the code editor and terminal output.'
                      : 'This resets the conversation for a clean window.'}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={showTerminal ? handleClearTerminal : handleClearChat}
                      className="flex-1 py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="py-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 text-xs font-medium transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* Prominent, Highly Visible Quick Action Feature Buttons (ChatGPT Style) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={triggerSummarize}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 font-bold text-xs whitespace-nowrap flex items-center gap-2 shrink-0 transition cursor-pointer active:scale-95 shadow-sm"
            title="Generate structured study notes and key takeaways"
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Notes / Summary</span>
          </button>
        </div>
      </div>

      {/* Floating / Non-shifting Timelapse Section Picker Modal Overlay */}
      {showTimelapsePicker && (
        <div 
          className="absolute inset-0 z-50 flex items-start justify-center p-3 pt-3.5 sm:pt-5 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-150"
          onClick={() => setShowTimelapsePicker(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#18181b] rounded-2xl border border-cyan-500/40 p-3.5 sm:p-4 space-y-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs max-h-[92%] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-xs text-zinc-200 font-semibold border-b border-white/10 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Select Chapter Timeline or Enter Custom Interval</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTimelapsePicker(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Close selector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Chapter Timelapses */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0 custom-scrollbar">
              {chapters.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {chapters.map((ch, idx) => {
                    const isSelected = selectedTimelapse?.startFormatted === ch.formattedStart;
                    return (
                      <button
                        key={`ch-tl-${ch.startSeconds}-${idx}`}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            handleUpdateTimeline(null);
                          } else {
                            handleUpdateTimeline({
                              label: ch.title,
                              startFormatted: ch.formattedStart,
                              endFormatted: ch.formattedEnd || formatTime(ch.startSeconds + 180),
                            });
                          }
                          setShowTimelapsePicker(false);
                        }}
                        className={`text-left p-2.5 rounded-xl border text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold shadow-xs'
                            : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="truncate font-medium">{ch.title}</span>
                        <span className="font-mono text-[11px] text-cyan-400 shrink-0 font-bold">
                          {ch.formattedStart} - {ch.formattedEnd || ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-zinc-400 py-3 text-center">No automatic chapters detected for this lesson.</div>
              )}
            </div>

            {/* Custom Timelapse Input Form with Direct "From" & "To" Timestamp Selection */}
            <form onSubmit={handleApplyCustomTimelapse} className="pt-3 border-t border-white/10 space-y-2.5 shrink-0 bg-[#18181b]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                  <span>Custom Interval:</span>
                </span>
                
                {/* Direct "From" and "To" Current Timestamp Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCustomStart(formattedCurrentTime)}
                    className="px-2.5 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                    title={`Set 'From' start time to current playback timestamp (${formattedCurrentTime})`}
                  >
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>From ({formattedCurrentTime})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomEnd(formattedCurrentTime)}
                    className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/35 text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                    title={`Set 'To' end time to current playback timestamp (${formattedCurrentTime})`}
                  >
                    <Clock className="w-3 h-3 text-purple-400" />
                    <span>To ({formattedCurrentTime})</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="From (e.g. 2:35)"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-white/20 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 font-mono text-center transition"
                  />
                  {customStart && (
                    <button
                      type="button"
                      onClick={() => setCustomStart('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                      title="Clear start time"
                    >
                      ×
                    </button>
                  )}
                </div>

                <span className="text-zinc-500 text-xs font-bold shrink-0">-</span>

                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="To (e.g. 5:45)"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-white/20 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 font-mono text-center transition"
                  />
                  {customEnd && (
                    <button
                      type="button"
                      onClick={() => setCustomEnd('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                      title="Clear end time"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!customStart.trim() || !customEnd.trim()}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-black text-xs font-bold hover:from-cyan-400 hover:to-teal-300 disabled:opacity-40 transition cursor-pointer shadow-sm shrink-0 active:scale-95"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Body: Interactive Code Sandbox Terminal vs ChatGPT-Style Conversation */}
      {showTerminal ? (
        <div className="flex-1 min-h-0 p-3 bg-zinc-950 flex flex-col overflow-hidden animate-in fade-in-50 duration-150">
          <InteractiveCodeTerminal
            initialCode={activeSnippetForTerminal || undefined}
            initialLanguage={activeLanguageForTerminal}
            courseTitle={course.title}
            courseId={course.id || course.playlistId}
            onAskAiToDebug={handleDebugWithAi}
            onCodeChange={(newCode) => {
              setActiveSnippetForTerminal(newCode || null);
            }}
            onLanguageChange={(newLang) => {
              setActiveLanguageForTerminal(newLang);
            }}
            onClearCode={() => {
              handleClearSnippet();
            }}
            onClose={() => setShowTerminal(false)}
            isEmbedded={true}
          />
        </div>
      ) : (
        <>

      {/* Scrollable Conversation Thread with ChatGPT Clean Aesthetics */}
      <div className="flex-1 p-4 overflow-y-auto space-y-5 text-sm">
        {/* Empty State / Welcome Screen when chat is clean */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4 max-w-lg mx-auto animate-in fade-in-50 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">How can I assist your study today?</h3>
              <p className="text-xs text-zinc-400">
                Ask anything about <strong>{course.title}</strong>, or generate structured summary notes.
              </p>
            </div>

            {/* Quick Starter Prompt Cards */}
            <div className="w-full pt-2">
              <button
                type="button"
                onClick={triggerSummarize}
                className="w-full p-3.5 rounded-2xl bg-[#2f2f2f] hover:bg-[#383838] border border-white/8 text-left transition cursor-pointer hover:border-white/20 group"
              >
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-1">
                  <FileText className="w-4 h-4" />
                  <span>Notes & Summary</span>
                </div>
                <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300">
                  Summarize key principles & Big-O complexity for this lesson.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id || index}
              className={`flex flex-col space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Message Sender Header */}
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 px-1">
                {isUser ? (
                  <>
                    <span>You</span>
                    {msg.videoTimestampFormatted && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono text-[10px]">
                        📍 {msg.videoTimestampFormatted}
                      </span>
                    )}
                    <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-white">
                      <User className="w-2.5 h-2.5" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white">
                      <Sparkles className="w-2.5 h-2.5" />
                    </div>
                    <span className="font-semibold text-purple-300">LearnTrack Mentor</span>
                    {msg.videoTimestampFormatted && (
                      <span className="text-[11px] text-zinc-500 font-mono">
                        [{msg.videoTimestampFormatted}]
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              {/* Message Bubble Container with ChatGPT Card Aesthetics */}
              <div
                className={`rounded-3xl p-4 sm:p-5 transition-all shadow-md ${
                  isUser
                    ? 'max-w-[92%] sm:max-w-[85%] bg-[#2f2f2f] text-white rounded-tr-md border border-white/10'
                    : 'w-full max-w-full bg-[#18181b] border border-white/12 text-zinc-100 rounded-tl-md space-y-3.5'
                }`}
              >
                {/* Quota Exhaustion / Fallback Notice Banner */}
                {msg.quotaNotice && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{msg.quotaNotice}</span>
                  </div>
                )}

                {/* Markdown Body with Rich Dynamic Typography & Syntax Highlighted Blocks */}
                <AiMarkdownMessage
                  content={msg.content}
                  onRunInTerminal={handleRunInTerminal}
                  onClearSnippet={handleClearSnippet}
                  onOpenTimelineSelector={() => setShowTimelapsePicker(true)}
                />
                
                {/* Interactive Timeline Confirmation Card Directly Inside Chat */}
                {msg.timelineConfirmation && (
                  <div className="p-3.5 bg-[#202024] hover:bg-[#242428] rounded-2xl border border-purple-500/40 space-y-2 mt-2 shadow-sm transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-400/50 text-xs font-mono font-bold shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>Timeline: {msg.timelineConfirmation.timeline.startFormatted}–{msg.timelineConfirmation.timeline.endFormatted}</span>
                          {msg.timelineConfirmation.confirmed && (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-sans ml-1 text-xs font-bold" title="Timeline Confirmed">
                              <Check className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Applied</span>
                            </span>
                          )}
                        </div>
                        {!msg.timelineConfirmation.confirmed && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleConfirmTimeline(
                                  msg.id,
                                  msg.timelineConfirmation!.timeline,
                                  msg.timelineConfirmation!.originalRequestPrompt,
                                  msg.timelineConfirmation!.actionType
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-white font-bold text-xs transition cursor-pointer shadow-md"
                              title="Use this chat prompt"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Use Prompt</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelTimelineConfirmation(msg.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 active:scale-95 font-medium text-xs transition cursor-pointer"
                              title="Cancel and remove prompt"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 font-medium truncate max-w-[200px]">
                        {msg.timelineConfirmation.timeline.label}
                      </span>
                    </div>
                  </div>
                )}

                {/* Google Search Grounding Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2.5 border-t border-white/10 space-y-2">
                    <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-blue-400" />
                      <span>Verified Citations & Documentation:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((cite, cIdx) => (
                        <a
                          key={cIdx}
                          href={cite.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/25 text-xs transition"
                        >
                          <span className="truncate max-w-[220px]">{cite.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-cyan-300 bg-[#18181b] border border-cyan-500/30 p-4 rounded-3xl max-w-sm shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <div className="space-y-0.5">
              <p className="font-bold text-white">Synthesizing study artifacts...</p>
              <p className="text-[11px] text-zinc-400">Formatting code with syntax colors and bounds.</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ChatGPT-Style Input Box Footer with Rounded Pill Architecture & Timeline Chip */}
      <div 
        className="p-3 bg-[#18181b] border-t border-white/10 shrink-0 space-y-2"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Doubt Context Bar */}
        {doubtContext && (
          <div className="px-3 py-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <button 
                type="button" 
                onClick={() => {
                  const event = new CustomEvent('learntrack_control_player', { detail: { action: 'seek', seconds: doubtContext.timestampSeconds } });
                  window.dispatchEvent(event);
                }}
                className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-md text-xs font-mono font-semibold transition cursor-pointer shrink-0"
                title="Seek to doubt timestamp"
              >
                <Clock className="w-3.5 h-3.5" />
                {doubtContext.timestampFormatted}
              </button>
              <div className="text-xs text-zinc-300 truncate">
                {doubtContext.chapterTitle && (
                  <>
                    <span className="font-semibold text-white/80">{doubtContext.chapterTitle}</span>
                    <span className="text-zinc-500 mx-1.5">•</span>
                  </>
                )}
                <span className="text-zinc-400">What are you confused about at {doubtContext.timestampFormatted}?</span>
              </div>
            </div>
            {onClearDoubtContext && (
              <button 
                type="button"
                onClick={onClearDoubtContext}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0 ml-2"
                title="Clear doubt context"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Interactive Timeline Control Bar */}
        <div className="flex items-center justify-between gap-2 px-1 text-xs">
          {selectedTimelapse ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-400/40 text-purple-200">
              <button
                type="button"
                onClick={() => setShowTimelapsePicker(!showTimelapsePicker)}
                className="flex items-center gap-1.5 hover:text-white transition cursor-pointer font-mono font-semibold"
                title="Active Timeline Range (Click to change)"
              >
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>[ Timeline: {selectedTimelapse.startFormatted}–{selectedTimelapse.endFormatted} ]</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdateTimeline(null)}
                className="hover:text-white ml-1 p-0.5 rounded hover:bg-white/10 text-zinc-400 cursor-pointer"
                title="Clear timeline"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTimelapsePicker(!showTimelapsePicker)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer active:scale-95"
              title="Select a specific timeline for code extraction or notes"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>[ Select Timeline ]</span>
            </button>
          )}

          {selectedTimelapse && (
            <span className="text-[11px] text-zinc-400 truncate max-w-[200px]">
              {selectedTimelapse.label}
            </span>
          )}
        </div>

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 mb-2">
            {attachments.map(att => (
              <div key={att.id} className="relative group rounded-xl overflow-hidden border border-white/20 w-16 h-16 shrink-0 bg-black">
                <img src={att.dataUrl} alt="Screenshot" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-1 bg-rose-500/80 hover:bg-rose-500 text-white rounded-full transition cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {att.timestampFormatted && (
                  <div className="absolute bottom-1 right-1 px-1 rounded bg-black/60 text-[8px] font-mono text-white pointer-events-none">
                    {att.timestampFormatted}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setImageToCrop(att.dataUrl)}
                  className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-black/20 text-transparent hover:text-white transition-all cursor-pointer pointer-events-auto"
                  title="Extract Code"
                >
                  <Crop className="w-4 h-4 mt-6" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2 bg-[#2f2f2f] border border-white/15 focus-within:border-cyan-400 rounded-3xl p-1.5 transition shadow-lg"
        >
          <div className="relative shrink-0 ml-1">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/png, image/jpeg, image/jpg, image/webp"
              multiple
            />
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            {showAttachmentMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#18181b] border border-white/15 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => { fileInputRef.current?.click(); setShowAttachmentMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Screenshot</span>
                </button>
                <div className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-500 border-t border-white/10 select-none">
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Paste (Ctrl+V)</span>
                </div>
              </div>
            )}
          </div>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onPaste={handlePaste}
            placeholder={
              doubtContext
                ? 'Ask your doubt about this moment...'
                : selectedTimelapse
                  ? `Ask for code or notes for [${selectedTimelapse.startFormatted} - ${selectedTimelapse.endFormatted}]...`
                  : `Ask anything about this video (e.g. "between 2:35 - 5:45")...`
            }
            disabled={isLoading}
            className="flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder-zinc-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
            className="p-2.5 rounded-2xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 disabled:opacity-30 transition cursor-pointer shrink-0 shadow-md active:scale-95"
            title="Send Message"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-950" /> : <Send className="w-4 h-4 text-zinc-950" />}
          </button>
        </form>
        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-2">
          <span>Press Enter to send</span>
          <span className="hidden sm:inline">VS Code / PyCharm syntax theme • Python sandbox</span>
        </div>
      </div>
        </>
      )}

      {imageToCrop && (
        <ImageCropper 
          imageUrl={imageToCrop}
          onCancel={() => setImageToCrop(null)}
          onExtract={(croppedDataUrl) => {
            setImageToCrop(null);
            const newAttachment: AiAttachment = {
              id: `att-crop-${Date.now()}`,
              type: 'video-screenshot',
              dataUrl: croppedDataUrl,
              videoId: currentVideo.id,
              videoTitle: currentVideo.title,
              timestampSeconds: currentTimeSeconds,
              timestampFormatted: formattedCurrentTime,
            };
            
            // Send automatically
            const newAttachments = [...attachments.filter(a => a.dataUrl !== imageToCrop), newAttachment];
            setAttachments(newAttachments); // Optional if we want it to stay there, but sendMessage clears it anyway
            sendMessage(
              "Please extract the code from the attached image. If no code is found, reply exactly: 'No code snippet was found'",
              'code',
              null,
              newAttachments
            );
          }}
        />
      )}
    </div>
  );
};
