import React, { useState } from 'react';
import { Copy, Check, GitCommit, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface FlowchartViewerProps {
  mermaidCode?: string;
  title?: string;
}

// Lightweight visual node flowchart generator from simple mermaid / step syntax
function parseMermaidNodes(mermaidText: string) {
  const lines = mermaidText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('graph') && !l.startsWith('flowchart'));
  const steps: Array<{ id: string; label: string; type: 'start' | 'process' | 'decision' | 'end'; linkText?: string }> = [];

  lines.forEach((line, idx) => {
    // Match node definitions like A[Label] or B{Decision?} or C([Terminal])
    const decisionMatch = line.match(/([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/);
    const roundMatch = line.match(/([a-zA-Z0-9_-]+)\s*\(\[?([^\])]+)\]?\)/);
    const boxMatch = line.match(/([a-zA-Z0-9_-]+)\s*\[([^\]]+)\]/);

    if (decisionMatch) {
      steps.push({ id: decisionMatch[1], label: decisionMatch[2].trim(), type: 'decision' });
    } else if (roundMatch) {
      const label = roundMatch[2].trim();
      const isEnd = label.toLowerCase().includes('end') || label.toLowerCase().includes('return') || label.toLowerCase().includes('stop');
      steps.push({ id: roundMatch[1], label, type: isEnd ? 'end' : 'start' });
    } else if (boxMatch) {
      steps.push({ id: boxMatch[1], label: boxMatch[2].trim(), type: 'process' });
    }
  });

  // Deduplicate by ID
  const uniqueSteps: typeof steps = [];
  const seenIds = new Set<string>();
  for (const s of steps) {
    if (!seenIds.has(s.id)) {
      seenIds.add(s.id);
      uniqueSteps.push(s);
    }
  }

  return uniqueSteps;
}

export const FlowchartViewer: React.FC<FlowchartViewerProps> = React.memo(({
  mermaidCode = '',
  title = 'Algorithmic Flowchart',
}) => {
  const [copied, setCopied] = useState(false);
  const [viewRaw, setViewRaw] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  const steps = parseMermaidNodes(mermaidCode);

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`my-3 rounded-2xl border border-cyan-500/30 bg-zinc-950/90 backdrop-blur-md overflow-hidden shadow-lg transition-all ${
      isExpanded ? 'fixed inset-4 z-50 flex flex-col bg-zinc-950/98 p-4' : ''
    }`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-cyan-950/40 border-b border-cyan-500/20 text-xs">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
          <GitCommit className="w-4 h-4 text-cyan-400" />
          <span>{title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
            {steps.length > 0 ? `${steps.length} Steps` : 'Diagram'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewRaw(!viewRaw)}
            className="px-2 py-1 rounded text-[11px] font-mono text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition"
          >
            {viewRaw ? 'Visual Flow' : 'Mermaid Code'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title={isExpanded ? 'Minimize' : 'Expand Fullscreen'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`p-4 overflow-auto max-h-[380px] ${isExpanded ? 'max-h-none flex-1 flex items-center justify-center' : ''}`}>
        {viewRaw ? (
          <pre className="text-[11px] font-mono text-cyan-200 bg-black/50 p-3 rounded-xl overflow-x-auto leading-relaxed border border-white/5">
            {mermaidCode}
          </pre>
        ) : (
          <div
            className="flex flex-col items-center gap-3 py-2 transition-transform duration-150 origin-top"
            style={{ transform: `scale(${zoom})` }}
          >
            {steps.length > 0 ? (
              steps.map((step, idx) => (
                <React.Fragment key={step.id || idx}>
                  {/* Step Node */}
                  <div
                    className={`relative px-4 py-2.5 rounded-xl text-center text-xs font-medium max-w-xs transition-all shadow-md ${
                      step.type === 'start'
                        ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 rounded-full font-semibold px-5'
                        : step.type === 'end'
                        ? 'bg-rose-950/80 border border-rose-500/40 text-rose-200 rounded-full font-semibold px-5'
                        : step.type === 'decision'
                        ? 'bg-amber-950/80 border border-amber-500/50 text-amber-200 rounded-2xl ring-1 ring-amber-500/20'
                        : 'bg-cyan-950/70 border border-cyan-500/30 text-cyan-100'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-zinc-400">
                        {step.id || idx + 1}
                      </span>
                      <span>{step.label}</span>
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  {idx < steps.length - 1 && (
                    <div className="flex flex-col items-center my-0.5">
                      <div className="w-0.5 h-4 bg-gradient-to-b from-cyan-500/60 to-cyan-400/90" />
                      <div className="w-0 h-0 border-x-4 border-x-transparent border-t-5 border-t-cyan-400" />
                    </div>
                  )}
                </React.Fragment>
              ))
            ) : (
              <div className="text-center py-4 space-y-2">
                <pre className="text-xs font-mono text-cyan-300 bg-black/60 p-3 rounded-xl text-left max-w-full overflow-x-auto border border-white/10">
                  {mermaidCode}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer controls for visual zoom */}
      {!viewRaw && steps.length > 0 && (
        <div className="px-3 py-1.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Interactive Flowchart</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom(Math.max(0.7, zoom - 0.1))}
              className="p-1 hover:text-white rounded hover:bg-white/10"
              title="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono text-[10px]">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom(Math.min(1.4, zoom + 0.1))}
              className="p-1 hover:text-white rounded hover:bg-white/10"
              title="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-1 hover:text-white rounded hover:bg-white/10"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
