import re

with open("src/pages/VideoPlayerPage.tsx", "r") as f:
    content = f.read()

# Fix the container flex-row issue for desktop
old_container = """flex-1 min-h-0 relative w-full h-full flex items-center justify-center overflow-hidden bg-black ${
              isFullscreen && isFullscreenOverlayOpen && !isPortrait ? 'flex-row p-4 gap-4' : 'flex-col'
            }"""
new_container = """flex-1 min-h-0 relative w-full h-full flex items-center justify-center overflow-hidden bg-black flex-col"""

content = content.replace(old_container, new_container)

with open("src/pages/VideoPlayerPage.tsx", "w") as f:
    f.write(content)
