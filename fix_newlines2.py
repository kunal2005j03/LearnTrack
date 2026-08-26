import os
import re

files = [
    "src/components/StudyGoalCard.tsx",
    "src/components/StudyScheduleModal.tsx",
    "src/pages/CourseDetailPage.tsx",
    "src/pages/VideoPlayerPage.tsx",
    "src/components/CourseCard.tsx"
]

for file in files:
    if not os.path.exists(file): continue
    with open(file, "r") as f:
        code = f.read()

    # Find where a comment `// ... const ...` swallowed a newline
    code = re.sub(r'//(.*?)const remainingStats =', r'//\1\n  const remainingStats =', code)
    code = re.sub(r'//(.*?)const playlistRemainingStats =', r'//\1\n  const playlistRemainingStats =', code)
    
    with open(file, "w") as f:
        f.write(code)

