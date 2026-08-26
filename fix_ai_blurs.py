import re

with open("src/components/CourseAiAssistant.tsx", "r") as f:
    content = f.read()

# Make backdrop-blur-xl responsive in sticky header
old_header = """className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface-high)]/60 backdrop-blur-xl" """
new_header = """className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface-high)]/60 backdrop-blur-md lg:backdrop-blur-xl" """
content = content.replace(old_header, new_header)

old_bottom = """className="sticky bottom-0 z-10 p-4 border-t border-white/5 bg-zinc-950/60 backdrop-blur-xl" """
new_bottom = """className="sticky bottom-0 z-10 p-4 border-t border-white/5 bg-zinc-950/60 backdrop-blur-md lg:backdrop-blur-xl" """
content = content.replace(old_bottom, new_bottom)

with open("src/components/CourseAiAssistant.tsx", "w") as f:
    f.write(content)
