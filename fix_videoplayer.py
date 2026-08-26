with open("src/pages/VideoPlayerPage.tsx", "r") as f:
    code = f.read()

code = code.replace("[v.id]?.completed", "progressMap[v.id]?.completed")
code = code.replace("[activeVideoId] : undefined", "progressMap[activeVideoId] : undefined")
code = code.replace("const p = [vid.id];", "const p = progressMap[vid.id];")

with open("src/pages/VideoPlayerPage.tsx", "w") as f:
    f.write(code)
