with open("src/context/LearnTrackContext.tsx", "r") as f:
    code = f.read()

code = code.replace("return [videoId];", "return progressStore.getSnapshot()[videoId];")

with open("src/context/LearnTrackContext.tsx", "w") as f:
    f.write(code)
