import re

with open("src/components/CourseAiAssistant.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "export const CourseAiAssistant: React.FC<CourseAiAssistantProps> = ({",
    "export const CourseAiAssistant: React.FC<CourseAiAssistantProps> = React.memo(({"
)

# the component ends with "};" - replace the last "};" with "}));"
last_brace_index = content.rfind("};")
if last_brace_index != -1:
    content = content[:last_brace_index] + "}));" + content[last_brace_index+2:]

with open("src/components/CourseAiAssistant.tsx", "w") as f:
    f.write(content)
