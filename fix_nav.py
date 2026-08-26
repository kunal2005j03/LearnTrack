with open("src/components/Navigation.tsx", "r") as f:
    code = f.read()

code = code.replace("if () {", "if (continueLearningVideo) {")
code = code.replace("openVideo(\n                        .course.id,\n                        .video.id\n                      );", "openVideo(\n                        continueLearningVideo.course.id,\n                        continueLearningVideo.video.id\n                      );")

with open("src/components/Navigation.tsx", "w") as f:
    f.write(code)
