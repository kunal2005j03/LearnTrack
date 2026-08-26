import re

for filename in ["src/components/CourseAiAssistant.tsx", "src/components/FormattedDescription.tsx"]:
    with open(filename, "r") as f:
        content = f.read()

    # Find the last "}));"
    if content.endswith("}));\n"):
        content = content[:-5] + "});\n"
    elif content.endswith("}));"):
        content = content[:-4] + "});"
    else:
        # maybe search for it
        content = content.replace("}));", "});")

    with open(filename, "w") as f:
        f.write(content)
