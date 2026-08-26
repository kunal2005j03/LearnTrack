with open("src/components/StudyCadenceCard.tsx", "r") as f:
    code = f.read()

code = code.replace("if () {", "if (continueLearningVideo) {")
code = code.replace("openVideo(.course.id, .video.id)", "openVideo(continueLearningVideo.course.id, continueLearningVideo.video.id)")
code = code.replace("Object.values()", "Object.values(progressMap)")
code = code.replace("Object.values( )", "Object.values(progressMap)")

with open("src/components/StudyCadenceCard.tsx", "w") as f:
    f.write(code)
