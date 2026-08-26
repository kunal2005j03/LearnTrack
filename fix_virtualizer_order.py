import re

with open("src/components/InThisVideoPanel.tsx", "r") as f:
    content = f.read()

# Extract virtualizer declarations
virtualizers = """  const chapterVirtualizer = useVirtualizer({
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
  });"""

# Remove them from their current position
content = content.replace(virtualizers, "")

# Find where to insert them (before the active chapter useEffect)
insert_target = "  // Auto-scroll active chapter into view ONLY when chapter changes, non-blocking via requestAnimationFrame"

content = content.replace(insert_target, virtualizers + "\n\n" + insert_target)

with open("src/components/InThisVideoPanel.tsx", "w") as f:
    f.write(content)
