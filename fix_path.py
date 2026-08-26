with open("src/context/LearnTrackContext.tsx", "r") as f:
    code = f.read()

code = code.replace("`users/${user.uid}/overview`", "`users/${user.uid}/stats/overview`")

with open("src/context/LearnTrackContext.tsx", "w") as f:
    f.write(code)
