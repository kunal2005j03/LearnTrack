import React, { useState } from 'react';
import { Play, Copy, Check, Terminal, FileCode, CheckCheck, Code2, Eraser, RotateCcw } from 'lucide-react';
import { highlightCode } from '../utils/syntaxHighlight';

interface CodeBlockViewerProps {
  code: string;
  language?: string;
  title?: string;
  onRunInTerminal?: (code: string, language?: string) => void;
  onClearSnippet?: () => void;
  showLineNumbers?: boolean;
}

export const CodeBlockViewer: React.FC<CodeBlockViewerProps> = ({
  code,
  language = 'python',
  title,
  onRunInTerminal,
  onClearSnippet,
  showLineNumbers = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCleared, setIsCleared] = useState(false);

  const cleanLang = (language || 'python').toLowerCase().trim();
  const normalizedLang =
    cleanLang === 'py' || cleanLang === 'python3'
      ? 'python'
      : cleanLang === 'js' || cleanLang === 'node'
      ? 'javascript'
      : cleanLang === 'ts'
      ? 'typescript'
      : cleanLang === 'sh' || cleanLang === 'shell'
      ? 'bash'
      : cleanLang === 'c++'
      ? 'cpp'
      : cleanLang;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleClear = () => {
    setIsCleared(true);
    if (onClearSnippet) {
      onClearSnippet();
    }
  };

  const handleRestore = () => {
    setIsCleared(false);
  };

  const highlighted = highlightCode(code, normalizedLang);
  
  // Pretty language display name like "TypeScript", "Python", "JavaScript"
  const formattedLangName =
    normalizedLang === 'typescript'
      ? 'TypeScript'
      : normalizedLang === 'javascript'
      ? 'JavaScript'
      : normalizedLang === 'python'
      ? 'Python'
      : normalizedLang === 'cpp'
      ? 'C++'
      : normalizedLang === 'bash'
      ? 'Bash'
      : normalizedLang === 'json'
      ? 'JSON'
      : normalizedLang.charAt(0).toUpperCase() + normalizedLang.slice(1);

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-white/15 bg-[#171717] shadow-2xl text-xs font-mono transition-all">
      {/* ChatGPT-Style Top Bar: Language on left, Actions (Clear, Play, Copy) on right */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#202123] border-b border-white/10 text-zinc-300 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-200 tracking-wide">
            {formattedLangName}
          </span>
          {title && (
            <span className="text-[11px] text-zinc-400 font-sans truncate max-w-[240px]">
              • {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isCleared ? (
            <>
              {onRunInTerminal && (
                <button
                  type="button"
                  onClick={() => onRunInTerminal(code, normalizedLang)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-emerald-300 transition cursor-pointer flex items-center gap-1 text-[11px] font-sans"
                  title="Run in interactive code terminal"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                  <span className="hidden sm:inline font-medium">Run</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-[11px] font-sans"
                title="Copy code to clipboard"
              >
                {copied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="hidden sm:inline text-zinc-300">Copy code</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/5 hover:border-rose-500/30 transition cursor-pointer flex items-center gap-1 text-[11px] font-sans"
                title="Clear code display and empty temporary snippet"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleRestore}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 hover:text-purple-200 border border-white/10 transition cursor-pointer flex items-center gap-1.5 text-[11px] font-sans"
              title="Restore cleared code snippet"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>
          )}
        </div>
      </div>

      {/* Code Display Area: Syntax Highlighted or Cleared Placeholder */}
      {isCleared ? (
        <div className="p-4 bg-[#0d0d0d] flex items-center justify-between text-xs text-zinc-400 italic">
          <span className="flex items-center gap-2">
            <Eraser className="w-3.5 h-3.5 text-zinc-500" />
            Code display cleared &amp; temporary snippet emptied
          </span>
          <button
            type="button"
            onClick={handleRestore}
            className="text-purple-400 hover:text-purple-300 font-sans not-italic font-medium flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Restore Code
          </button>
        </div>
      ) : (
        <div className="p-4 bg-[#0d0d0d] overflow-x-auto text-[13px] leading-relaxed">
          <pre
            className="code-syntax-theme font-mono whitespace-pre selection:bg-purple-900/60 selection:text-white"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </div>
      )}
    </div>
  );
};

