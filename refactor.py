import os
import re

HOOKS_IMPORT = "import { useProgressMap, useStats, useContinueLearningVideo } from '../hooks/useProgress';"
HOOKS_IMPORT_PAGES = "import { useProgressMap, useStats, useContinueLearningVideo } from '../hooks/useProgress';"

def process_file(filepath, depth=1):
    with open(filepath, "r") as f:
        code = f.read()

    original_code = code

    has_progressMap = "progressMap" in code
    has_stats = "stats" in code and "stats." in code
    has_continue = "continueLearningVideo" in code

    if not (has_progressMap or has_stats or has_continue):
        return

    # Check if they are destructured from useLearnTrack
    if "useLearnTrack(" not in code:
        return

    # Add imports
    import_path = "../hooks/useProgress" if depth == 1 else "../../hooks/useProgress"
    if "import { useProgressMap" not in code:
        code = code.replace("import { useLearnTrack }", f"import {{ useProgressMap, useStats, useContinueLearningVideo }} from '{import_path}';\nimport {{ useLearnTrack }}")
        
    # Replace destructuring
    code = re.sub(r'(\bprogressMap\b\s*,?)', '', code)
    code = re.sub(r'(\bstats\b\s*,?)', '', code)
    code = re.sub(r'(\bcontinueLearningVideo\b\s*,?)', '', code)

    # Clean up empty commas and braces from destructuring
    code = re.sub(r'{\s*,', '{', code)
    code = re.sub(r',\s*,', ',', code)
    code = re.sub(r',\s*}', ' }', code)

    # Insert hook calls after useLearnTrack
    hook_calls = []
    if has_progressMap and "useProgressMap()" not in code:
        hook_calls.append("  const progressMap = useProgressMap();")
    if has_stats and "useStats()" not in code:
        hook_calls.append("  const stats = useStats();")
    if has_continue and "useContinueLearningVideo()" not in code:
        hook_calls.append("  const continueLearningVideo = useContinueLearningVideo();")

    if hook_calls:
        # Find the end of useLearnTrack call
        code = re.sub(r'(=\s*useLearnTrack\(\);)', r'\1\n' + '\n'.join(hook_calls), code)

    if code != original_code:
        with open(filepath, "w") as f:
            f.write(code)
        print(f"Refactored {filepath}")

for root, _, files in os.walk("src"):
    for file in files:
        if file.endswith(".tsx"):
            depth = root.count(os.sep)
            process_file(os.path.join(root, file), depth)

