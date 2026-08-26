import re

with open("src/pages/VideoPlayerPage.tsx", "r") as f:
    content = f.read()

# Fix opacity in control bar
old_class = """!isFullscreenOverlayOpen && (fullscreenControlsVisible || showSpeedDropdown)"""
new_class = """(!isPortrait || !isFullscreenOverlayOpen) && (fullscreenControlsVisible || showSpeedDropdown)"""

content = content.replace(old_class, new_class)

with open("src/pages/VideoPlayerPage.tsx", "w") as f:
    f.write(content)
