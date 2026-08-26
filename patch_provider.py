import re

with open("src/context/LearnTrackContext.tsx", "r") as f:
    code = f.read()

code = re.sub(r'        progressMap,\n', '', code)
code = re.sub(r'        stats,\n', '', code)
code = re.sub(r'        continueLearningVideo,\n', '', code)
code = re.sub(r'        recentlyWatchedList,\n', '', code)
code = re.sub(r'        bookmarkedCourses,\n', '', code)
code = re.sub(r'        bookmarkedVideos,\n', '', code)

with open("src/context/LearnTrackContext.tsx", "w") as f:
    f.write(code)
