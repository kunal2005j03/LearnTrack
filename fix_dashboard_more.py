with open("src/pages/DashboardPage.tsx", "r") as f:
    code = f.read()

code = code.replace("{? (", "{continueLearningVideo ? (")
code = code.replace("{ ? (", "{continueLearningVideo ? (")
code = code.replace(".progress.percentage", "continueLearningVideo.progress.percentage")

# fix StudyGoalCard error: Declaration or statement expected.
with open("src/components/StudyGoalCard.tsx", "r") as f:
    c = f.read()
if "}" not in c[-10:]:
    pass

