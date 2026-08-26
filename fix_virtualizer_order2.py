import re

with open("src/components/InThisVideoPanel.tsx", "r") as f:
    content = f.read()

# Extract both virtualizers
chapter_virtualizer = """  const chapterVirtualizer = useVirtualizer({
    count: chapters.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });"""

transcript_virtualizer = """  const transcriptVirtualizer = useVirtualizer({
    count: filteredTranscript.length,
    getScrollElement: () => transcriptScrollRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });"""

# Remove transcriptVirtualizer from where it is now (before activeChapter useEffect)
content = content.replace(transcript_virtualizer, "")

# Insert transcriptVirtualizer after filteredTranscript
insert_target_2 = "  }, [transcripts, transcriptSearch]);"
content = content.replace(insert_target_2, insert_target_2 + "\n\n" + transcript_virtualizer)

with open("src/components/InThisVideoPanel.tsx", "w") as f:
    f.write(content)
