import re

with open("src/pages/VideoPlayerPage.tsx", "r") as f:
    content = f.read()

# Fix panel positioning for desktop
old_panel = """className={`z-50 pointer-events-auto flex flex-col transition-all duration-300 ease-out shadow-2xl ${
                    isPortrait
                      ? 'relative w-full flex-1 min-h-0 max-w-[520px] mx-auto animate-in slide-in-from-bottom duration-300'
                      : 'relative h-full shrink-0 animate-in slide-in-from-right duration-200'
                  }`}"""

new_panel = """className={`z-50 pointer-events-auto flex flex-col transition-all duration-300 ease-out shadow-2xl ${
                    isPortrait
                      ? 'relative w-full flex-1 min-h-0 max-w-[520px] mx-auto animate-in slide-in-from-bottom duration-300'
                      : 'absolute right-4 top-4 bottom-[90px] animate-in slide-in-from-right duration-200'
                  }`}"""

content = content.replace(old_panel, new_panel)

with open("src/pages/VideoPlayerPage.tsx", "w") as f:
    f.write(content)
