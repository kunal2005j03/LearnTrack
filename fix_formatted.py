import re

with open("src/components/FormattedDescription.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "export const FormattedDescription: React.FC<FormattedDescriptionProps> = ({",
    "export const FormattedDescription: React.FC<FormattedDescriptionProps> = React.memo(({"
)

last_brace_index = content.rfind("};")
if last_brace_index != -1:
    content = content[:last_brace_index] + "}));" + content[last_brace_index+2:]

with open("src/components/FormattedDescription.tsx", "w") as f:
    f.write(content)
