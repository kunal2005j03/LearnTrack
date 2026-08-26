import re

with open("src/components/InThisVideoPanel.tsx", "r") as f:
    content = f.read()

# For chapters
old_chapters_start = """          ) : (
            <div style={{ height: `${chapterVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {chapterVirtualizer.getVirtualItems().map((virtualItem) => {"""

new_chapters_start = """          ) : (
            <>
            <div style={{ height: `${chapterVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {chapterVirtualizer.getVirtualItems().map((virtualItem) => {"""

content = content.replace(old_chapters_start, new_chapters_start)

old_chapters_end = """              })}
            </div>
            {/* Trailing spacer to ensure the last chapter item is always fully visible upon scroll */}
            <div className="h-24 sm:h-28 shrink-0 w-full select-none pointer-events-none" aria-hidden="true" />
          )}"""

new_chapters_end = """              })}
            </div>
            {/* Trailing spacer to ensure the last chapter item is always fully visible upon scroll */}
            <div className="h-24 sm:h-28 shrink-0 w-full select-none pointer-events-none" aria-hidden="true" />
            </>
          )}"""

content = content.replace(old_chapters_end, new_chapters_end)


# For transcript
old_transcript_start = """            ) : (
              <div style={{ height: `${transcriptVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {transcriptVirtualizer.getVirtualItems().map((virtualItem) => {"""

new_transcript_start = """            ) : (
              <>
              <div style={{ height: `${transcriptVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {transcriptVirtualizer.getVirtualItems().map((virtualItem) => {"""

content = content.replace(old_transcript_start, new_transcript_start)

old_transcript_end = """              })}
              </div>
            )}
            <div className="h-20 shrink-0 w-full select-none pointer-events-none" aria-hidden="true" />
          </div>"""

new_transcript_end = """              })}
              </div>
              </>
            )}
            <div className="h-20 shrink-0 w-full select-none pointer-events-none" aria-hidden="true" />
          </div>"""

content = content.replace(old_transcript_end, new_transcript_end)

with open("src/components/InThisVideoPanel.tsx", "w") as f:
    f.write(content)
