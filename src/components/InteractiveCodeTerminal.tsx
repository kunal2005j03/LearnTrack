import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Terminal,
  Copy,
  Bug,
  Loader2,
  Code2,
  CheckCheck,
  X,
  Columns2,
  SquareCode,
  Maximize2,
  Trash2,
  ArrowDownCircle,
  RotateCcw,
  Eraser,
} from 'lucide-react';
import { CodeExecutionResult } from '../types';
import { highlightCode } from '../utils/syntaxHighlight';

const DEFAULT_CODE_SNIPPETS: Record<string, string> = {
  python: 'print("Hello World!")',
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
  onClearCode,
  isEmbedded = false,
}) => {
  const terminalStorageKey = `learntrack_terminal_state_${courseId || courseTitle.replace(/\s+/g, '_')}`;

  const [code, setCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(terminalStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.code !== undefined && parsed.code !== null) {
          return parsed.code;
        }
      }
    } catch {}
    if (initialCode !== undefined && initialCode !== null) return initialCode;
    return DEFAULT_CODE_SNIPPETS[initialLanguage] || DEFAULT_CODE_SNIPPETS.python;
  });

  const [language, setLanguage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(terminalStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.language) return parsed.language;
      }
    } catch {}
    return initialLanguage;
  });

  const [inputStdin, setInputStdin] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(terminalStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.inputStdin !== undefined) return parsed.inputStdin;
      }
    } catch {}
    return '';
  });

  const [showStdin, setShowStdin] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(terminalStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.showStdin !== undefined) return parsed.showStdin;
      }
    } catch {}
    return false;
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

  useEffect(() => {
    if (initialLanguage && initialLanguage !== language) {
      setLanguage(initialLanguage);
    }
  }, [initialLanguage]);

  // Persist terminal state to localStorage and broadcast sync event
  useEffect(() => {
    if (isUpdatingFromExternalRef.current) return;
    try {
      const stateToSave = {
        code,
        language,
        inputStdin,
        showStdin,
        result,
        viewMode,
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
  }, [code, language, inputStdin, showStdin, result, viewMode, terminalStorageKey]);

  // Real-time synchronization across instances (e.g. fullscreen HUD vs normal view)
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail && e.detail.storageKey === terminalStorageKey && e.detail.state) {
        isUpdatingFromExternalRef.current = true;
        const s = e.detail.state;
        if (s.code !== undefined && s.code !== code) setCode(s.code);
        if (s.language !== undefined && s.language !== language) setLanguage(s.language);
        if (s.inputStdin !== undefined && s.inputStdin !== inputStdin) setInputStdin(s.inputStdin);
        if (s.showStdin !== undefined && s.showStdin !== showStdin) setShowStdin(s.showStdin);
        if (s.result !== undefined) setResult(s.result);
        if (s.viewMode !== undefined && s.viewMode !== viewMode) setViewMode(s.viewMode);
        setTimeout(() => {
          isUpdatingFromExternalRef.current = false;
        }, 50);
      }
    };
    window.addEventListener('learntrack_terminal_state_updated', handleSync);
    return () => window.removeEventListener('learntrack_terminal_state_updated', handleSync);
  }, [terminalStorageKey, code, language, inputStdin, showStdin, viewMode]);

  const handleLanguageSelect = (newLang: string) => {
    const normCurrent = (language || 'python').toLowerCase();
    const normNew = newLang.toLowerCase();
    if (normCurrent === normNew) return;

    setLanguage(newLang);

    const isDefaultTemplate = Object.values(DEFAULT_CODE_SNIPPETS).some(
      (tmpl) => tmpl.trim() === code.trim()
    );

    if (isDefaultTemplate) {
      const nextSnippet = DEFAULT_CODE_SNIPPETS[newLang] || DEFAULT_CODE_SNIPPETS.python;
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
        body: JSON.stringify({ code, language, input: inputStdin }),
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

  return (
    <div
      className={`flex flex-col bg-[#171717] border border-white/15 rounded-2xl overflow-hidden shadow-2xl ${
        isEmbedded ? 'w-full h-full min-h-0' : 'h-full max-h-[680px]'
      }`}
    >
      {/* Top Header Bar: Language, View Mode Tabs, STDIN, Copy & Run */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#202123] border-b border-white/10 shrink-0 overflow-x-auto no-scrollbar select-none">
        {/* Left Side: Window dots & Language selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0 hidden xs:flex">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80 shadow-xs" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-xs" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-xs" />
          </div>

          <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/10">
            <Code2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-xs font-mono font-semibold text-zinc-200">
              {FILE_NAMES[language] || 'main.py'}
            </span>
          </div>

          {/* Language Switcher Pills: Python, Golang, Java, C++ */}
          <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/10 text-xs font-mono shrink-0">
            <button
              type="button"
              onClick={() => handleLanguageSelect('python')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer font-medium text-[11px] ${
                language === 'python' || language === 'py'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Python
            </button>
            <button
              type="button"
              onClick={() => handleLanguageSelect('go')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer font-medium text-[11px] ${
                language === 'go' || language === 'golang'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Golang
            </button>
            <button
              type="button"
              onClick={() => handleLanguageSelect('java')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer font-medium text-[11px] ${
                language === 'java'
                  ? 'bg-amber-500/20 text-amber-300 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Java
            </button>
            <button
              type="button"
              onClick={() => handleLanguageSelect('cpp')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer font-medium text-[11px] ${
                language === 'cpp' || language === 'c++'
                  ? 'bg-indigo-500/20 text-indigo-300 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              C++
            </button>
          </div>
        </div>

        {/* View Mode Tabs: Split, Code Only, Output Only */}
        <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/10 text-xs font-mono shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] ${
              viewMode === 'split'
                ? 'bg-white/15 text-white font-bold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Split view (Editor + Terminal Output)"
          >
            <Columns2 className="w-3 h-3" />
            <span className="hidden sm:inline">Split</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('code')}
            className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] ${
              viewMode === 'code'
                ? 'bg-white/15 text-white font-bold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Code editor full view"
          >
            <SquareCode className="w-3 h-3" />
            <span className="hidden sm:inline">Editor</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('output')}
            className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] relative ${
              viewMode === 'output'
                ? 'bg-emerald-500/25 text-emerald-300 font-bold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Terminal console output full view"
          >
            <Terminal className="w-3 h-3 text-emerald-400" />
            <span>Output</span>
            {result && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  result.exitCode === 0 ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
            )}
          </button>
        </div>

        {/* Right Side: STDIN, Copy, Run */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => setShowStdin(!showStdin)}
            className={`px-2 py-1 rounded-lg text-[11px] font-mono transition border cursor-pointer shrink-0 ${
              showStdin
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
            title="Custom STDIN input for input() prompts"
          >
            {showStdin ? 'Stdin: On' : '+ Input'}
          </button>

          <button
            type="button"
            onClick={handleClearCode}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 transition cursor-pointer shrink-0"
            title="Clear code editor"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetCode}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition cursor-pointer shrink-0"
            title="Reset code editor"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition cursor-pointer shrink-0 flex items-center gap-1 text-[11px]"
            title="Copy Code"
          >
            {copied ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium hidden md:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-300 hidden md:inline">Copy</span>
              </>
            )}
          </button>

          {/* Prominently visible Run Code Button */}
          <button
            type="button"
            disabled={isRunning}
            onClick={handleRun}
            className="px-3.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer shrink-0 active:scale-95"
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
              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 transition cursor-pointer shrink-0"
              title="Close Terminal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Optional Stdin input box */}
      {showStdin && (
        <div className="p-2.5 bg-zinc-900/90 border-b border-white/10 flex flex-col gap-1 text-xs shrink-0">
          <label className="text-[10px] font-mono text-purple-300 font-semibold flex items-center gap-1">
            <span>STDIN (Standard Input) for input() calls:</span>
          </label>
          <textarea
            value={inputStdin}
            onChange={(e) => setInputStdin(e.target.value)}
            placeholder="Type standard input values (one per line)..."
            rows={2}
            className="w-full bg-black/60 border border-purple-500/30 rounded-lg p-2 font-mono text-xs text-purple-100 placeholder-zinc-500 focus:outline-none focus:border-purple-400"
          />
        </div>
      )}

      {/* Middle Layout Area: Editor + Output Container */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Code Editor Section (Visible in 'split' or 'code' mode) */}
        {(viewMode === 'split' || viewMode === 'code') && (
          <div
            className={`relative ${
              viewMode === 'code' ? 'flex-1 min-h-0' : 'flex-[1.1] min-h-[140px]'
            } flex bg-[#0d0d0d] overflow-hidden text-[13px] leading-relaxed`}
          >
            {/* Line Numbers Gutter */}
            <div
              ref={gutterRef}
              className="w-9 py-3 bg-[#09090b] text-zinc-600 select-none font-mono text-right pr-2 text-xs border-r border-white/5 overflow-hidden shrink-0 space-y-0"
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

        {/* Terminal / Output Section (Visible in 'split' or 'output' mode) */}
        {(viewMode === 'split' || viewMode === 'output') && (
          <div
            className={`border-t border-white/10 bg-[#0a0a0c] flex flex-col overflow-hidden ${
              viewMode === 'output' ? 'flex-1 min-h-0' : 'flex-[0.9] min-h-[130px]'
            }`}
          >
            {/* Terminal Header Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#18181b] border-b border-white/10 text-xs shrink-0 select-none">
              <div className="flex items-center gap-2 text-zinc-300 font-mono">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
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

                {viewMode === 'split' && (
                  <button
                    type="button"
                    onClick={() => setViewMode('output')}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                    title="Maximize output terminal"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Terminal Content Stream */}
            <div
              ref={outputContainerRef}
              className="p-3 overflow-y-auto font-mono text-xs text-zinc-200 flex-1 leading-relaxed bg-[#050505] space-y-2 select-text"
            >
              {isRunning ? (
                <div className="flex items-center gap-2 text-cyan-300 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>
                    Executing{' '}
                    {language === 'python' || language === 'py'
                      ? 'Python'
                      : language === 'go' || language === 'golang'
                      ? 'Golang'
                      : language === 'java'
                      ? 'Java'
                      : 'C++'}{' '}
                    natively...
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
                <div className="flex flex-col items-center justify-center h-full text-center py-6 text-zinc-500 text-xs">
                  <Terminal className="w-6 h-6 text-zinc-600 mb-1.5" />
                  <p>
                    Click <strong className="text-emerald-400">▶ Run</strong> or press{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[11px]">
                      Ctrl+Enter
                    </kbd>{' '}
                    to execute code.
                  </p>
                  <p className="text-[11px] text-zinc-600 mt-1">Terminal output and stdout streams will render here.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
