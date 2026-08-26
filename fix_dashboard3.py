import re
with open("src/pages/DashboardPage.tsx", "r") as f:
    code = f.read()

code = re.sub(r'\{\s*\?\s*\(', '{continueLearningVideo ? (', code)
code = code.replace(" .progress.percentage", " continueLearningVideo.progress.percentage")
code = code.replace("(.progress.percentage", "(continueLearningVideo.progress.percentage")
code = code.replace(" .completedVideos", " stats.completedVideos")
code = code.replace("{.completedVideos", "{stats.completedVideos")

with open("src/pages/DashboardPage.tsx", "w") as f:
    f.write(code)
