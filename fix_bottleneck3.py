import re

with open("src/components/InThisVideoPanel.tsx", "r") as f:
    content = f.read()

# Add import for useVirtualizer
content = content.replace("import React, { useState, useMemo, useEffect, useRef } from 'react';", "import React, { useState, useMemo, useEffect, useRef } from 'react';\nimport { useVirtualizer } from '@tanstack/react-virtual';")

# Replace activeChapter logic
old_active_chapter = """  // Current active chapter based on currentTime
  const activeChapter = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;
    return (
      chapters.find((ch) => effectiveTime >= ch.startSeconds && effectiveTime < ch.endSeconds) ||
      (effectiveTime >= chapters[chapters.length - 1]?.startSeconds ? chapters[chapters.length - 1] : chapters[0])
    );
  }, [chapters, effectiveTime]);"""

new_active_chapter = """  // Current active chapter based on currentTime
  const activeChapterIndex = useMemo(() => {
    if (!chapters || chapters.length === 0) return -1;
    const idx = chapters.findIndex((ch) => effectiveTime >= ch.startSeconds && effectiveTime < ch.endSeconds);
    if (idx !== -1) return idx;
    return effectiveTime >= chapters[chapters.length - 1]?.startSeconds ? chapters.length - 1 : 0;
  }, [chapters, effectiveTime]);
  const activeChapter = activeChapterIndex >= 0 ? chapters[activeChapterIndex] : null;"""

content = content.replace(old_active_chapter, new_active_chapter)

# Add transcriptScrollRef
content = content.replace("const scrollContainerRef = useRef<HTMLDivElement | null>(null);", "const scrollContainerRef = useRef<HTMLDivElement | null>(null);\n  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);")

# Add virtualizers
virtualizers = """
  const chapterVirtualizer = useVirtualizer({
    count: chapters.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  const transcriptVirtualizer = useVirtualizer({
    count: filteredTranscript.length,
    getScrollElement: () => transcriptScrollRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });
"""

# Place it right after filteredTranscript useMemo
content = content.replace("}, [transcripts, transcriptSearch]);", "}, [transcripts, transcriptSearch]);\n" + virtualizers)

# Fix scroll logic
old_scroll_logic = """  // Auto-scroll active chapter into view ONLY when chapter changes, non-blocking via requestAnimationFrame
  useEffect(() => {
    const currentStart = activeChapter?.startSeconds ?? null;
    if (
      activeTab === 'chapters' &&
      currentStart !== null &&
      currentStart !== lastScrolledChapterRef.current &&
      activeChapterRef.current &&
      !isHoveredRef.current
    ) {
      lastScrolledChapterRef.current = currentStart;
      requestAnimationFrame(() => {
        try {
          activeChapterRef.current?.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
          });
        } catch {}
      });
    }
  }, [activeChapter?.startSeconds, activeTab]);"""

new_scroll_logic = """  // Auto-scroll active chapter into view ONLY when chapter changes, non-blocking via requestAnimationFrame
  useEffect(() => {
    if (
      activeTab === 'chapters' &&
      activeChapterIndex >= 0 &&
      activeChapterIndex !== lastScrolledChapterRef.current &&
      !isHoveredRef.current
    ) {
      lastScrolledChapterRef.current = activeChapterIndex;
      requestAnimationFrame(() => {
        try {
          chapterVirtualizer.scrollToIndex(activeChapterIndex, {
            align: 'center',
            behavior: 'smooth',
          });
        } catch {}
      });
    }
  }, [activeChapterIndex, activeTab, chapterVirtualizer]);"""

content = content.replace(old_scroll_logic, new_scroll_logic)

# Replace chapter scroll container className
content = content.replace("className=\"flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 sm:p-3.5 space-y-3 scroll-smooth touch-pan-y pb-36\"", "className=\"flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 sm:p-3.5 scroll-smooth touch-pan-y pb-36\"")

# Replace chapters map
old_chapters_map = """            <>
              {chapters.map((ch, idx) => {
                const isCurrent = activeChapter?.startSeconds === ch.startSeconds;
                const thumbUrl = ch.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

                return (
                  <button
                    key={`${ch.startSeconds}-${idx}`}
                    ref={isCurrent ? activeChapterRef : null}
                    type="button"
                    onClick={() => onSeekTo(ch.startSeconds)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all group relative border cursor-pointer shrink-0 ${
                      isCurrent
                        ? 'bg-cyan-500/15 border-cyan-500/40 shadow-sm'
                        : 'hover:bg-white/10 border-transparent'
                    }`}
                    aria-current={isCurrent ? 'true' : undefined}
                  >"""

new_chapters_map = """            <div style={{ height: `${chapterVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {chapterVirtualizer.getVirtualItems().map((virtualItem) => {
                const ch = chapters[virtualItem.index];
                const isCurrent = activeChapterIndex === virtualItem.index;
                const thumbUrl = ch.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={chapterVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                      paddingBottom: '12px',
                    }}
                  >
                  <button
                    type="button"
                    onClick={() => onSeekTo(ch.startSeconds)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all group relative border cursor-pointer shrink-0 ${
                      isCurrent
                        ? 'bg-cyan-500/15 border-cyan-500/40 shadow-sm'
                        : 'hover:bg-white/10 border-transparent'
                    }`}
                    aria-current={isCurrent ? 'true' : undefined}
                  >"""

content = content.replace(old_chapters_map, new_chapters_map)

# Close the outer div for chapters map
content = content.replace("""                  </button>
                );
              })}
              {/* Trailing spacer to ensure the last chapter item is always fully visible upon scroll */}
              <div className="h-24 sm:h-28 shrink-0 w-full select-none pointer-events-none" aria-hidden="true" />
            </>""", """                  </button>
                  </div>
                );
              })}
            </div>""")

# Add transcript scroll ref and replace space-y-2
content = content.replace("className=\"flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2 touch-pan-y pb-16\"", "ref={transcriptScrollRef} className=\"flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 touch-pan-y pb-16\"")

# Replace transcript map
old_transcript_map = """            ) : (
              filteredTranscript.map((t, idx) => {
                const isActive = effectiveTime >= t.startSeconds && (idx === filteredTranscript.length - 1 || effectiveTime < filteredTranscript[idx + 1].startSeconds);
                return (
                  <button
                    key={`${t.startSeconds}-${idx}`}
                    type="button"
                    onClick={() => onSeekTo(t.startSeconds)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 group border cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/15 border-cyan-500/40'
                        : 'hover:bg-white/10 border-transparent'
                    }`}
                  >"""

new_transcript_map = """            ) : (
              <div style={{ height: `${transcriptVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {transcriptVirtualizer.getVirtualItems().map((virtualItem) => {
                const t = filteredTranscript[virtualItem.index];
                const isActive = effectiveTime >= t.startSeconds && (virtualItem.index === filteredTranscript.length - 1 || effectiveTime < filteredTranscript[virtualItem.index + 1].startSeconds);
                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={transcriptVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                      paddingBottom: '8px',
                    }}
                  >
                  <button
                    type="button"
                    onClick={() => onSeekTo(t.startSeconds)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 group border cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/15 border-cyan-500/40'
                        : 'hover:bg-white/10 border-transparent'
                    }`}
                  >"""

content = content.replace(old_transcript_map, new_transcript_map)

# Close outer div for transcript map
content = content.replace("""                  </button>
                );
              })
            )}""", """                  </button>
                  </div>
                );
              })}
              </div>
            )}""")

with open("src/components/InThisVideoPanel.tsx", "w") as f:
    f.write(content)
