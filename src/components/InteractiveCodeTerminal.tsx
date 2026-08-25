import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Terminal,
  Copy,
  Bug,
  Loader2,
  CheckCheck,
  X,
  Columns2,
  SquareCode,
  Maximize2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { CodeExecutionResult } from '../types';
import { highlightCode } from '../utils/syntaxHighlight';

// Language Logos precisely matching reference PNG assets
// Python Logo (python.png: Blue & Yellow Interlocking Snakes)
const PythonIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pyBlueGrad" x1="10%" y1="10%" x2="90%" y2="90%">
        <stop offset="0%" stopColor="#0273d4" />
        <stop offset="100%" stopColor="#015299" />
      </linearGradient>
      <linearGradient id="pyYellowGrad" x1="10%" y1="10%" x2="90%" y2="90%">
        <stop offset="0%" stopColor="#ffdc34" />
        <stop offset="100%" stopColor="#e9a800" />
      </linearGradient>
    </defs>
    {/* Upper Blue Snake */}
    <path
      d="M63.5 8C33.2 8 34.8 21.1 34.8 21.1L34.9 34.7H64.1V38.9H23.5C9.2 38.9 5 49.9 5 67.4C5 86.6 14.1 85.8 14.1 85.8H22.8V73.6C22.8 58.5 35.8 58.6 35.8 58.6H64.2C80.5 58.6 79.5 44.5 79.5 44.5V21.1C79.5 21.1 81.1 8 63.5 8ZM49.5 17.7C52.8 17.7 55.4 20.4 55.4 23.6C55.4 26.9 52.8 29.5 49.5 29.5C46.3 29.5 43.6 26.9 43.6 23.6C43.6 20.4 46.3 17.7 49.5 17.7Z"
      fill="url(#pyBlueGrad)"
    />
    {/* Lower Yellow Snake */}
    <path
      d="M64.5 120C94.8 120 93.2 106.9 93.2 106.9L93.1 93.3H63.9V89.1H104.5C118.8 89.1 123 78.1 123 60.6C123 41.4 113.9 42.2 113.9 42.2H105.2V54.4C105.2 69.5 92.2 69.4 92.2 69.4H63.8C47.5 69.4 48.5 83.5 48.5 83.5V106.9C48.5 106.9 46.9 120 64.5 120ZM78.5 110.3C75.2 110.3 72.6 107.6 72.6 104.4C72.6 101.1 75.2 98.5 78.5 98.5C81.7 98.5 84.4 101.1 84.4 104.4C84.4 107.6 81.7 110.3 78.5 110.3Z"
      fill="url(#pyYellowGrad)"
    />
  </svg>
);

// Golang Logo (golang.png: Cyan Speed Lines + Stylized 'GO')
const GolangIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-4' }) => (
  <svg className={className} viewBox="0 0 240 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 3 Left Motion Speed Lines */}
    <path d="M22 28.5H62.5L53.5 38.5H13L22 28.5Z" fill="#00ADD8" />
    <path d="M2 45H57.5L48.5 55H-7L2 45Z" fill="#00ADD8" />
    <path d="M28 61.5H52.5L43.5 71.5H19L28 61.5Z" fill="#00ADD8" />
    {/* Stylized 'G' */}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M136.5 12C160.8 12 169.5 28.5 169.5 44C169.5 47 169.2 49.5 168.8 51.5H112C113 65.5 122 75 137.5 75C148.5 75 156 70 160.5 62L178 72C169.5 85 155 92 135 92C101 92 84 69.5 84 46C84 25.5 101 12 136.5 12ZM146 36C145.5 29 139.5 24.5 132.5 24.5C124 24.5 116 30 114 36H146Z"
      fill="#00ADD8"
      className="hidden"
    />
    {/* Exact Smooth Curve for G & O in fast-go branding */}
    <path
      d="M134.4 20.8c11.5 0 21.8 4.6 28.3 12.3l-10.4 9.1c-4.4-5-10.8-7.7-17.7-7.7-14.8 0-25.2 11.2-25.2 26.5 0 15.6 10.3 26.7 25.4 26.7 8.3 0 14.7-3.7 18.9-9.7h-20.4v-12.8h34.6v34.4c-9.5 8.4-21.4 12.8-33.6 12.8-24.8 0-42.3-17.6-42.3-44.4 0-26.6 17.7-47.2 42.4-47.2z"
      fill="#00ADD8"
    />
    <path
      d="M197.8 20.8c25.4 0 42.2 19.8 42.2 44.4 0 25.2-16.9 44.4-42.2 44.4s-42.2-19.2-42.2-44.4c0-24.6 16.8-44.4 42.2-44.4zm0 69.9c14.6 0 24.2-12.3 24.2-25.5 0-12.8-9.6-25.5-24.2-25.5-14.7 0-24.3 12.7-24.3 25.5 0 13.2 9.6 25.5 24.3 25.5z"
      fill="#00ADD8"
    />
  </svg>
);

// Java Logo (java.png: Classic Coffee Cup with Red Steam & Blue Saucer Swirls)
const JavaIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Red Steam Ribbon 1 (Left & High) */}
    <path
      d="M62 4C58 14 43 23 48 35C52 45 66 51 56 65C53 69 49 71 47 71C46 71 48 68 50 65C57 55 46 47 43 38C38 23 54 13 62 4Z"
      fill="#EA2027"
    />
    {/* Red Steam Ribbon 2 (Right) */}
    <path
      d="M72 15C69 22 59 29 63 38C66 45 74 49 69 58C67 61 64 63 63 63C62 63 64 61 65 59C70 52 64 47 61 41C57 30 68 22 72 15Z"
      fill="#EA2027"
    />
    {/* Blue Cup Top Rim Swirl */}
    <path
      d="M21 72C21 72 37 66 61 66C82 66 94 72 94 72C94 72 84 76 61 76C36 76 21 72 21 72Z"
      fill="#0073B7"
    />
    {/* Blue Cup Body Mid Swirl */}
    <path
      d="M28 80C28 80 42 75 62 75C80 75 88 80 88 80C88 80 78 84 60 84C40 84 28 80 28 80Z"
      fill="#0073B7"
    />
    {/* Blue Cup Lower Curve */}
    <path
      d="M36 88C36 88 47 84 62 84C76 84 82 88 82 88C82 88 74 92 60 92C45 92 36 88 36 88Z"
      fill="#0073B7"
    />
    {/* Blue Saucer Base Wave */}
    <path
      d="M10 102C10 102 32 94 62 94C92 94 104 102 104 102C104 102 85 109 60 109C30 109 10 102 10 102Z"
      fill="#0073B7"
    />
    {/* Blue Handle Curve */}
    <path
      d="M87 72C95 72 102 78 98 90C95 99 87 103 87 103C87 103 94 97 94 90C94 83 89 77 84 75L87 72Z"
      fill="#0073B7"
    />
  </svg>
);

// C++ Logo (cpp.png: Hexagonal Badge with White 'C' and Dark Blue Chevron with '++')
const CppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 120 130" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer Hexagon */}
    <path
      d="M60 4L114 34.5V95.5L60 126L6 95.5V34.5L60 4Z"
      fill="#00599C"
    />
    {/* Left Shading Facet */}
    <path
      d="M60 4L6 34.5V95.5L60 126V4Z"
      fill="#004482"
    />
    {/* Inner Hexagon Face */}
    <path
      d="M60 10L108 37.5V92.5L60 120L12 92.5V37.5L60 10Z"
      fill="#0075C9"
    />
    <path
      d="M60 10L12 37.5V92.5L60 120V10Z"
      fill="#00599C"
    />
    {/* White Central 'C' */}
    <path
      d="M60 30C41 30 27 45 27 65C27 85 41 100 60 100C72 100 81 94 87 86L74 76C71 80 66 84 60 84C49 84 41 75 41 65C41 55 49 46 60 46C66 46 71 50 74 54L87 44C81 36 72 30 60 30Z"
      fill="#FFFFFF"
    />
    {/* Dark Blue Chevron / Banner on the Right */}
    <path
      d="M48 65L82 34H114V96H82L48 65Z"
      fill="#004482"
    />
    {/* First '+' inside chevron */}
    <path
      d="M69 59H75V53H81V59H87V65H81V71H75V65H69V59Z"
      fill="#FFFFFF"
    />
    {/* Second '+' inside chevron */}
    <path
      d="M91 59H97V53H103V59H109V65H103V71H97V65H91V59Z"
      fill="#FFFFFF"
    />
  </svg>
);

const DEFAULT_CODE_SNIPPETS: Record<string, string> = {
  python: 'print("Hello World!")',
  py: 'print("Hello World!")',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello World!")\n}',
  golang: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello World!")\n}',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}',
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello World!" << std::endl;\n    return 0;\n}',
  'c++': '#include <iostream>\n\nint main() {\n    std::cout << "Hello World!" << std::endl;\n    return 0;\n}',
};

const FILE_NAMES: Record<string, string> = {
  python: 'main.py',
  py: 'main.py',
  go: 'main.go',
  golang: 'main.go',
  java: 'Main.java',
  cpp: 'main.cpp',
  'c++': 'main.cpp',
};

interface InteractiveCodeTerminalProps {
  initialCode?: string;
  initialLanguage?: string;
  courseTitle?: string;
  courseId?: string;
  onAskAiToDebug?: (code: string, errorOutput: string) => void;
  onClose?: () => void;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (language: string) => void;
  onClearCode?: () => void;
  isEmbedded?: boolean;
}

export const InteractiveCodeTerminal: React.FC<InteractiveCodeTerminalProps> = ({
  initialCode,
  initialLanguage = 'python',
  courseTitle = 'Coding Lesson',
  courseId,
  onAskAiToDebug,
  onClose,
  onCodeChange,
  onLanguageChange,
  onClearCode,
  isEmbedded = false,
}) => {
  const terminalStorageKey = `learntrack_terminal_state_${courseId || courseTitle.replace(/\s+/g, '_')}`;

  const [userExplicitlySelectedLanguage, setUserExplicitlySelectedLanguage] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(terminalStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!parsed.userExplicitlySelectedLanguage;
      }
    } catch {}
    return false;
  });

  const [language, setLanguage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(terminalStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Priority 1: User previously explicitly selected a language
        if (parsed.userExplicitlySelectedLanguage && parsed.language) {
          const l = parsed.language.toLowerCase();
          if (l === 'python' || l === 'py' || l === 'go' || l === 'golang' || l === 'java' || l === 'cpp' || l === 'c++') {
            return l;
          }
        }
      }
    } catch {}
    // Priority 2: Explicit initialLanguage prop if valid and non-default
    if (initialLanguage && initialLanguage.toLowerCase() !== 'python') {
      const l = initialLanguage.toLowerCase();
      if (l === 'go' || l === 'golang' || l === 'java' || l === 'cpp' || l === 'c++') {
        return l;
      }
    }
    // Priority 3: Always default to python
    return 'python';
  });

  const [code, setCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(terminalStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.code !== undefined && parsed.code !== null && parsed.code !== '') {
          return parsed.code;
        }
      }
    } catch {}
    if (initialCode !== undefined && initialCode !== null && initialCode !== '') return initialCode;
    const targetLang = (initialLanguage || 'python').toLowerCase();
    return DEFAULT_CODE_SNIPPETS[targetLang] || DEFAULT_CODE_SNIPPETS.python;
  });

  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const [result, setResult] = useState<CodeExecutionResult | null>(() => {
    try {
      const saved = localStorage.getItem(terminalStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.result !== undefined) return parsed.result;
      }
    } catch {}
    return null;
  });

  const [viewMode, setViewMode] = useState<'split' | 'code' | 'output'>(() => {
    try {
      const saved = localStorage.getItem(terminalStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.viewMode) return parsed.viewMode;
      }
    } catch {}
    return 'split';
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromExternalRef = useRef<boolean>(false);

  // Sync props when new code snippet is explicitly selected from AI chat
  const lastInitialCodeRef = useRef<string | undefined>(initialCode);
  useEffect(() => {
    if (initialCode !== undefined && initialCode !== lastInitialCodeRef.current) {
      lastInitialCodeRef.current = initialCode;
      if (initialCode !== code) {
        setCode(initialCode);
      }
    }
  }, [initialCode]);

  const lastInitialLanguageRef = useRef<string | undefined>(initialLanguage);
  useEffect(() => {
    if (initialLanguage && initialLanguage !== lastInitialLanguageRef.current) {
      lastInitialLanguageRef.current = initialLanguage;
      const norm = initialLanguage.toLowerCase();
      setLanguage(norm);
      setUserExplicitlySelectedLanguage(true);
    }
  }, [initialLanguage]);

  // Persist terminal state to localStorage and broadcast sync event
  useEffect(() => {
    if (isUpdatingFromExternalRef.current) return;
    try {
      const stateToSave = {
        code,
        language,
        result,
        viewMode,
        userExplicitlySelectedLanguage,
      };
      localStorage.setItem(terminalStorageKey, JSON.stringify(stateToSave));
      window.dispatchEvent(
        new CustomEvent('learntrack_terminal_state_updated', {
          detail: { storageKey: terminalStorageKey, state: stateToSave },
        })
      );
    } catch (e) {
      console.error('Failed to persist terminal state:', e);
    }
  }, [code, language, result, viewMode, userExplicitlySelectedLanguage, terminalStorageKey]);

  // Real-time synchronization across instances (e.g. fullscreen HUD vs normal view)
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail && e.detail.storageKey === terminalStorageKey && e.detail.state) {
        isUpdatingFromExternalRef.current = true;
        const s = e.detail.state;
        if (s.code !== undefined && s.code !== code) setCode(s.code);
        if (s.language !== undefined && s.language !== language) setLanguage(s.language);
        if (s.result !== undefined) setResult(s.result);
        if (s.viewMode !== undefined && s.viewMode !== viewMode) setViewMode(s.viewMode);
        if (s.userExplicitlySelectedLanguage !== undefined) setUserExplicitlySelectedLanguage(s.userExplicitlySelectedLanguage);
        setTimeout(() => {
          isUpdatingFromExternalRef.current = false;
        }, 50);
      }
    };
    window.addEventListener('learntrack_terminal_state_updated', handleSync);
    return () => window.removeEventListener('learntrack_terminal_state_updated', handleSync);
  }, [terminalStorageKey, code, language, viewMode]);

  const handleLanguageSelect = (newLang: string) => {
    const normCurrent = (language || 'python').toLowerCase();
    const normNew = newLang.toLowerCase();
    setUserExplicitlySelectedLanguage(true);
    onLanguageChange?.(normNew);
    if (normCurrent === normNew) return;

    setLanguage(normNew);
    setResult(null);

    const isDefaultTemplate =
      !code.trim() ||
      Object.values(DEFAULT_CODE_SNIPPETS).some(
        (tmpl) => tmpl.trim() === code.trim()
      ) ||
      code.trim() === 'print("Hello World!")' ||
      code.trim().startsWith('print(');

    if (isDefaultTemplate) {
      const nextSnippet = DEFAULT_CODE_SNIPPETS[normNew] || DEFAULT_CODE_SNIPPETS.python;
      setCode(nextSnippet);
      onCodeChange?.(nextSnippet);
    }
  };

  // Reset code to default starter for current language
  const handleResetCode = () => {
    const defaultTemplate = DEFAULT_CODE_SNIPPETS[language] || DEFAULT_CODE_SNIPPETS.python;
    setCode(defaultTemplate);
    setResult(null);
    onCodeChange?.(defaultTemplate);
  };

  const handleClearCode = () => {
    setCode('');
    setResult(null);
    onClearCode?.();
    onCodeChange?.('');
  };

  // Sync scroll between textarea and syntax pre overlay
  const handleScroll = () => {
    if (textareaRef.current) {
      const top = textareaRef.current.scrollTop;
      const left = textareaRef.current.scrollLeft;
      if (preRef.current) {
        preRef.current.scrollTop = top;
        preRef.current.scrollLeft = left;
      }
      if (gutterRef.current) {
        gutterRef.current.scrollTop = top;
      }
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setResult(null);

    // If only code editor was focused, switch to split view so output is instantly visible
    if (viewMode === 'code') {
      setViewMode('split');
    }

    try {
      const resp = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      const data = await resp.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        stdout: '',
        stderr: err?.message || 'Failed to connect to code execution server.',
        exitCode: 1,
        executionTimeMs: 0,
      });
    } finally {
      setIsRunning(false);
      // Auto-scroll output container into view
      setTimeout(() => {
        if (outputContainerRef.current) {
          outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyOutput = () => {
    const textToCopy = [result?.stdout, result?.stderr].filter(Boolean).join('\n');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  const handleDebugWithAi = () => {
    if (onAskAiToDebug) {
      onAskAiToDebug(code, result?.stderr || result?.stdout || 'Please analyze this code and provide optimizations.');
    }
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);
  const highlighted = highlightCode(code, language);

  const isPython = language === 'python' || language === 'py';
  const isGo = language === 'go' || language === 'golang';
  const isJava = language === 'java';
  const isCpp = language === 'cpp' || language === 'c++';

  const getActiveFileIcon = () => {
    if (isGo) return <GolangIcon className="w-[24px] h-4 shrink-0" />;
    if (isJava) return <JavaIcon className="w-5 h-5 shrink-0" />;
    if (isCpp) return <CppIcon className="w-5 h-5 shrink-0" />;
    return <PythonIcon className="w-5 h-5 shrink-0" />;
  };

  return (
    <div
      className={`flex flex-col bg-[#0b0c0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl ${
        isEmbedded ? 'w-full h-full min-h-0' : 'h-full max-h-[680px]'
      }`}
    >
      {/* 1. Top Bar: Current File Tab + Language Selector Pills */}
      <div className="flex items-center gap-2 p-2.5 bg-[#121316] border-b border-white/10 shrink-0 overflow-x-auto no-scrollbar select-none">
        {/* Active File Name Indicator Pill */}
        <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 text-zinc-200 font-mono text-xs font-semibold flex items-center gap-2 shrink-0 shadow-xs">
          {getActiveFileIcon()}
          <span>{FILE_NAMES[language] || 'main.py'}</span>
        </div>

        {/* Language Selection Row: [ Python ] [ Golang ] [ Java ] [ C++ ] */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Python */}
          <button
            type="button"
            onClick={() => handleLanguageSelect('python')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer text-xs font-semibold flex items-center gap-2 shrink-0 ${
              isPython
                ? 'bg-emerald-950/30 text-white border border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/20'
                : 'bg-zinc-900/60 text-zinc-300 hover:text-white border border-white/10 hover:bg-zinc-800/60'
            }`}
          >
            <PythonIcon className="w-5 h-5 shrink-0" />
            <span>Python</span>
          </button>

          {/* Golang */}
          <button
            type="button"
            onClick={() => handleLanguageSelect('go')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer text-xs font-semibold flex items-center gap-2 shrink-0 ${
              isGo
                ? 'bg-cyan-950/30 text-white border border-cyan-500/50 shadow-xs ring-1 ring-cyan-500/20'
                : 'bg-zinc-900/60 text-zinc-300 hover:text-white border border-white/10 hover:bg-zinc-800/60'
            }`}
          >
            <GolangIcon className="w-[25px] h-[17px] shrink-0" />
            <span>Golang</span>
          </button>

          {/* Java */}
          <button
            type="button"
            onClick={() => handleLanguageSelect('java')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer text-xs font-semibold flex items-center gap-2 shrink-0 ${
              isJava
                ? 'bg-amber-950/30 text-white border border-amber-500/50 shadow-xs ring-1 ring-amber-500/20'
                : 'bg-zinc-900/60 text-zinc-300 hover:text-white border border-white/10 hover:bg-zinc-800/60'
            }`}
          >
            <JavaIcon className="w-5 h-5 shrink-0" />
            <span>Java</span>
          </button>

          {/* C++ */}
          <button
            type="button"
            onClick={() => handleLanguageSelect('cpp')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer text-xs font-semibold flex items-center gap-2 shrink-0 ${
              isCpp
                ? 'bg-blue-950/30 text-white border border-blue-500/50 shadow-xs ring-1 ring-blue-500/20'
                : 'bg-zinc-900/60 text-zinc-300 hover:text-white border border-white/10 hover:bg-zinc-800/60'
            }`}
          >
            <CppIcon className="w-5 h-5 shrink-0" />
            <span>C++</span>
          </button>
        </div>
      </div>

      {/* 2. Editor Toolbar: [ Split | Editor | Output ] on Left, [ Reset | Copy | Run | Close ] on Right */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#15161a] border-b border-white/10 shrink-0 overflow-x-auto no-scrollbar select-none">
        {/* Left Side: View Mode Pills */}
        <div className="flex items-center bg-zinc-900/90 p-0.5 rounded-xl border border-white/10 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs ${
              viewMode === 'split'
                ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Split view (Editor + Terminal Output)"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('code')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs ${
              viewMode === 'code'
                ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Code editor full view"
          >
            <SquareCode className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('output')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs ${
              viewMode === 'output'
                ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Terminal console output full view"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Output</span>
          </button>
        </div>

        {/* Right Side: Reset, Copy, Run, Close */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={handleResetCode}
            className="p-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition cursor-pointer shrink-0"
            title="Reset code template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition cursor-pointer shrink-0 flex items-center gap-1.5 text-xs"
            title="Copy Code"
          >
            {copied ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Prominently Styled Primary Run Button */}
          <button
            type="button"
            disabled={isRunning}
            onClick={handleRun}
            className="px-4 py-1.5 rounded-full bg-[#00d084] hover:bg-[#00e894] text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer shrink-0"
            title="Run Code (Ctrl + Enter)"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run</span>
              </>
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-900/90 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 transition cursor-pointer shrink-0"
              title="Close Terminal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Middle Layout Area: Editor + Output Container */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Code Editor Section (Visible in 'split' or 'code' mode) */}
        {(viewMode === 'split' || viewMode === 'code') && (
          <div
            className={`relative ${
              viewMode === 'code' ? 'flex-1 min-h-0' : 'flex-[1.1] min-h-[140px]'
            } flex bg-[#0c0d0f] overflow-hidden text-[13px] leading-relaxed`}
          >
            {/* Line Numbers Gutter */}
            <div
              ref={gutterRef}
              className="w-10 py-3 bg-[#090a0c] text-zinc-600 select-none font-mono text-right pr-3 text-xs border-r border-white/5 overflow-hidden shrink-0 space-y-0"
              style={{ lineHeight: '1.625rem' }}
            >
              {lineNumbers.map((num) => (
                <div key={`line-${num}`} className="h-[26px]">
                  {num}
                </div>
              ))}
            </div>

            {/* Synchronized Syntax Highlighting Canvas */}
            <div className="relative flex-1 overflow-hidden">
              <pre
                ref={preRef}
                aria-hidden="true"
                className="absolute inset-0 p-3 font-mono text-[13px] overflow-hidden whitespace-pre pointer-events-none code-syntax-theme select-none m-0"
                style={{ lineHeight: '1.625rem' }}
                dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
              />

              {/* Editable Transparent Textarea Layer */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => {
                  const val = e.target.value;
                  setCode(val);
                  onCodeChange?.(val);
                }}
                onScroll={handleScroll}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleRun();
                  }
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    const updated = code.substring(0, start) + '    ' + code.substring(end);
                    setCode(updated);
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
                      }
                    }, 0);
                  }
                }}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className="absolute inset-0 w-full h-full p-3 bg-transparent font-mono text-[13px] text-transparent caret-white leading-relaxed resize-none focus:outline-none selection:bg-purple-900/60 selection:text-transparent overflow-auto m-0"
                style={{ lineHeight: '1.625rem' }}
                placeholder="Write or paste code snippet here... (Press Ctrl+Enter to Run)"
              />
            </div>
          </div>
        )}

        {/* 4. Terminal / Output Section (Visible in 'split' or 'output' mode) */}
        {(viewMode === 'split' || viewMode === 'output') && (
          <div
            className={`border-t border-white/10 bg-[#090a0c] flex flex-col overflow-hidden ${
              viewMode === 'output' ? 'flex-1 min-h-0' : 'flex-[0.9] min-h-[130px]'
            }`}
          >
            {/* Terminal Header Bar */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#121316] border-b border-white/10 text-xs shrink-0 select-none">
              <div className="flex items-center gap-2 text-zinc-200 font-mono">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-zinc-200">Terminal Output</span>
                {result && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      result.exitCode === 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {result.exitCode === 0
                      ? `Exit: 0 (${result.executionTimeMs}ms)`
                      : `Exit Code: ${result.exitCode} (${result.executionTimeMs}ms)`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {result && (
                  <button
                    type="button"
                    onClick={handleCopyOutput}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-[11px] font-mono flex items-center gap-1 transition cursor-pointer"
                    title="Copy terminal output text"
                  >
                    {copiedOutput ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-zinc-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}

                {result && result.stderr && onAskAiToDebug && (
                  <button
                    type="button"
                    onClick={handleDebugWithAi}
                    className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Bug className="w-3 h-3" />
                    <span>Debug with AI</span>
                  </button>
                )}

                {result && (
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                    title="Clear terminal output"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'output' ? 'split' : 'output')}
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                  title={viewMode === 'output' ? 'Restore split view' : 'Maximize terminal output'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Terminal Content Stream */}
            <div
              ref={outputContainerRef}
              className="p-4 overflow-y-auto font-mono text-xs text-zinc-200 flex-1 leading-relaxed bg-[#07080a] space-y-2 select-text"
            >
              {isRunning ? (
                <div className="flex items-center gap-2 text-emerald-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>
                    Executing{' '}
                    {isPython ? 'Python' : isGo ? 'Golang' : isJava ? 'Java' : 'C++'} natively...
                  </span>
                </div>
              ) : result ? (
                <div className="space-y-2">
                  {result.stdout && (
                    <div className="rounded-xl bg-black/60 border border-emerald-500/20 p-2.5">
                      <div className="text-[10px] uppercase font-bold text-emerald-400/80 mb-1 tracking-wider">
                        STDOUT
                      </div>
                      <pre className="text-emerald-300 whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed select-text">
                        {result.stdout}
                      </pre>
                    </div>
                  )}

                  {result.stderr && (
                    <div className="rounded-xl bg-rose-950/40 border border-rose-500/30 p-2.5">
                      <div className="text-[10px] uppercase font-bold text-rose-400/80 mb-1 tracking-wider">
                        STDERR / Traceback
                      </div>
                      <pre className="text-rose-300 whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed select-text">
                        {result.stderr}
                      </pre>
                    </div>
                  )}

                  {!result.stdout && !result.stderr && (
                    <div className="text-zinc-400 italic py-2">Program finished successfully with no output.</div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-6 text-zinc-500 text-xs space-y-1.5">
                  <Terminal className="w-6 h-6 text-zinc-600 mb-0.5" />
                  <div>
                    Click <strong className="text-emerald-400 font-semibold">▶ Run</strong> or press{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[11px]">
                      Ctrl+Enter
                    </kbd>{' '}
                    to execute code.
                  </div>
                  <div className="text-[11px] text-zinc-600">Terminal output and stdout streams will render here.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

