with open("src/components/StudyScheduleModal.tsx", "r") as f:
    code = f.read()

code = code.replace("Weekly const weeklyStats", "Weekly stats\n  const weeklyStats")

with open("src/components/StudyScheduleModal.tsx", "w") as f:
    f.write(code)
