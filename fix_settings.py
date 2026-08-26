with open("src/pages/SettingsPage.tsx", "r") as f:
    code = f.read()

code = code.replace(">{.completedVideos}<", ">{stats.completedVideos}<")
code = code.replace(">{ .completedVideos }<", ">{stats.completedVideos}<")
code = code.replace(">{.currentStreak}d<", ">{stats.currentStreak}d<")
code = code.replace(">{ .currentStreak }d<", ">{stats.currentStreak}d<")
code = code.replace("Object.keys().length", "Object.keys(progressMap).length")
code = code.replace("Object.keys( ).length", "Object.keys(progressMap).length")

with open("src/pages/SettingsPage.tsx", "w") as f:
    f.write(code)
