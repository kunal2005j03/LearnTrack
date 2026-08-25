import React from 'react';
import Markdown from 'react-markdown';
import { Sparkles, HelpCircle, Lightbulb, CheckCircle2, ChevronRight, ExternalLink, Clock, Sliders, Camera, Code2 } from 'lucide-react';
import { CodeBlockViewer } from './CodeBlockViewer';
import { FlowchartViewer } from './FlowchartViewer';

interface AiMarkdownMessageProps {
  content: string;
  onRunInTerminal?: (code: string, language?: string) => void;
  onClearSnippet?: () => void;
  onOpenTimelineSelector?: () => void;
  className?: string;
}

export const AiMarkdownMessage: React.FC<AiMarkdownMessageProps> = ({
  content,
  onRunInTerminal,
  onClearSnippet,
  onOpenTimelineSelector,
  className = '',
}) => {
  const handleTimelineClick = () => {
    if (onOpenTimelineSelector) {
      onOpenTimelineSelector();
    } else {
      window.dispatchEvent(new CustomEvent('learntrack_open_timeline_picker'));
    }
  };


  const renderTextWithTimelineChips = (text: string) => {
    if (typeof text !== 'string') return text;

    // Check for [ Select Timeline ], [ Timeline: ... ], [ Open Precise Code Capture ], [ Code Capture ], [ Precise Code Capture ]
    const parts = text.split(/(\[\s*Select\s+Timeline\s*\]|\[\s*Timeline:\s*[^\]]+\s*\])/gi);
    if (parts.length === 1) return text;

    return parts.map((part, index) => {
      if (/^\[\s*Select\s+Timeline\s*\]$/i.test(part.trim())) {
        return (
          <button
            key={index}
            type="button"
            onClick={handleTimelineClick}
            className="inline-flex items-center gap-1.5 px-3 py-1 my-1 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 text-cyan-300 hover:text-cyan-200 border border-cyan-400/40 text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
            title="Open Timeline Selector"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Timeline</span>
          </button>
        );
      }

      const timelineMatch = part.match(/^\[\s*Timeline:\s*([^\]]+)\s*\]$/i);
      if (timelineMatch) {
        return (
          <button
            key={index}
            type="button"
            onClick={handleTimelineClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 my-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 border border-purple-400/40 font-mono text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
            title="Active Timeline Range (Click to adjust)"
          >
            <Clock className="w-3 h-3 text-purple-400" />
            <span>Timeline: {timelineMatch[1]}</span>
          </button>
        );
      }

      return part;
    });
  };

  return (
    <div className={`leading-relaxed max-w-none break-words text-zinc-200 ${className}`}>
      <Markdown
        components={{
          // H1: Display Heading with subtle gradient underline
          h1({ children }) {
            return (
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white mt-4 mb-2 pb-1.5 border-b border-purple-500/30 flex items-center gap-2 first:mt-0">
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)] shrink-0" />
                <span className="bg-gradient-to-r from-white via-zinc-100 to-purple-200 bg-clip-text text-transparent">
                  {children}
                </span>
              </h1>
            );
          },

          // H2: Section Heading with Cyan Accent & Icon
          h2({ children }) {
            return (
              <h2 className="text-sm sm:text-base font-bold text-cyan-300 tracking-wide mt-3.5 mb-1.5 flex items-center gap-2 first:mt-0">
                <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{children}</span>
              </h2>
            );
          },

          // H3: Topic / Concept Subheading with Soft Violet Accent
          h3({ children }) {
            return (
              <h3 className="text-[13.5px] sm:text-sm font-semibold text-purple-200 mt-3 mb-1 flex items-center gap-1.5 first:mt-0">
                <span className="w-1.5 h-1.5 rounded-sm bg-purple-400 shrink-0" />
                <span>{children}</span>
              </h3>
            );
          },

          // H4: Category / Mini-label with Warm Amber Tagging
          h4({ children }) {
            return (
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-300/90 mt-2.5 mb-1 flex items-center gap-1">
                <span>{children}</span>
              </h4>
            );
          },

          // Paragraph: Balanced line height and crisp typography
          p({ children }) {
            const formattedChildren = React.Children.map(children, (child) => {
              if (typeof child === 'string') {
                return renderTextWithTimelineChips(child);
              }
              return child;
            });

            return (
              <p className="text-[13px] sm:text-[13.5px] text-zinc-200 leading-relaxed my-2 last:mb-0">
                {formattedChildren}
              </p>
            );
          },

          // Strong / Bold: Eye-catching highlighted keyword chip
          strong({ children }) {
            return (
              <strong className="font-semibold text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded-md border border-amber-500/30 text-[12.5px] tracking-wide inline-block my-0.5 shadow-2xs">
                {children}
              </strong>
            );
          },

          // Emphasis / Italic: Soft Lavender Italic Styling
          em({ children }) {
            return (
              <em className="italic text-purple-300 font-medium px-0.5">
                {children}
              </em>
            );
          },

          // Blockquote: Beautiful Pro Tip / Callout Card
          blockquote({ children }) {
            return (
              <div className="p-3 sm:p-3.5 my-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/25 to-zinc-900/40 border-l-[3.5px] border-purple-400 text-purple-100 text-[13px] leading-relaxed shadow-sm flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">{children}</div>
              </div>
            );
          },

          // Unordered List: Custom Glowing Cyan Bullets
          ul({ children }) {
            return <ul className="space-y-1.5 my-2.5 pl-1">{children}</ul>;
          },

          // Ordered List: Numbered Badges Container
          ol({ children }) {
            return <ol className="space-y-2 my-2.5 pl-1 list-none counter-reset-list">{children}</ol>;
          },

          // List Item: Flexible layout with bullet / badge
          li({ children, ordered, index }: any) {
            const formattedChildren = React.Children.map(children, (child) => {
              if (typeof child === 'string') {
                return renderTextWithTimelineChips(child);
              }
              return child;
            });

            return (
              <li className="flex items-start gap-2 text-[13px] sm:text-[13.5px] text-zinc-200 leading-relaxed">
                {ordered ? (
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 text-purple-200 border border-purple-400/40 text-[10.5px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5 shadow-2xs select-none">
                    {(index !== undefined ? index + 1 : 1)}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] shrink-0 mt-2" />
                )}
                <div className="flex-1 min-w-0">{formattedChildren}</div>
              </li>
            );
          },

          // Table: Responsive Card Table for Big-O / Data comparisons
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900/70 shadow-lg">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  {children}
                </table>
              </div>
            );
          },

          thead({ children }) {
            return (
              <thead className="bg-[#202123] border-b border-white/10 text-cyan-300 font-bold uppercase text-[11px] tracking-wider">
                {children}
              </thead>
            );
          },

          tbody({ children }) {
            return <tbody className="divide-y divide-white/5">{children}</tbody>;
          },

          tr({ children }) {
            return <tr className="hover:bg-white/5 transition-colors">{children}</tr>;
          },

          th({ children }) {
            return <th className="px-3.5 py-2.5 font-semibold">{children}</th>;
          },

          td({ children }) {
            return <td className="px-3.5 py-2 text-zinc-300 text-[12.5px]">{children}</td>;
          },

          // Horizontal Divider
          hr() {
            return <hr className="h-px my-4 border-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />;
          },

          // Links: High contrast and icons
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-500/40 hover:decoration-cyan-300 font-medium inline-flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <span>{children}</span>
                <ExternalLink className="w-3 h-3 opacity-80 shrink-0 inline" />
              </a>
            );
          },

          // Code: Multi-line -> CodeBlockViewer; Inline -> High-contrast tag
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            if (!inline && (match || codeString.includes('\n'))) {
              const lang = match ? match[1].toLowerCase() : 'python';
              
              if (lang === 'mermaid') {
                return (
                  <FlowchartViewer
                    mermaidCode={codeString}
                    title="Algorithmic Logic Diagram"
                  />
                );
              }

              return (
                <CodeBlockViewer
                  code={codeString}
                  language={lang}
                  onRunInTerminal={onRunInTerminal}
                  onClearSnippet={onClearSnippet}
                />
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-emerald-300 font-mono text-[12px] font-medium border border-white/10 shadow-2xs"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};
