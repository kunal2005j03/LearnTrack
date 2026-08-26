import re

with open("src/pages/VideoPlayerPage.tsx", "r") as f:
    code = f.read()

code = re.sub(r'\s*setLiveCurrentTime\(.*?\);', '', code)
code = re.sub(r'\s*setLivePercentage\(.*?\);', '', code)

with open("src/pages/VideoPlayerPage.tsx", "w") as f:
    f.write(code)

with open("src/components/LiveTimeDisplay.tsx", "r") as f:
    code = f.read()
code = code.replace("import { formatSeconds } from '../utils';", "import { formatSeconds } from '../utils/formatters';")

with open("src/components/LiveTimeDisplay.tsx", "w") as f:
    f.write(code)
