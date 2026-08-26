import os

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

    # The issue: `// ... completion const remainingStats`
    code = code.replace("completion const remainingStats", "completion stats\n  const remainingStats")
    code = code.replace("statsconst remainingStats", "stats\n  const remainingStats")
    code = code.replace("courseconst remainingStats", "course\n  const remainingStats")
    code = code.replace("playlistconst playlistRemainingStats", "playlist\n  const playlistRemainingStats")
    
    with open(file, "w") as f:
        f.write(code)

