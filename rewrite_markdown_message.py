import re

with open("src/components/AiMarkdownMessage.tsx", "r") as f:
    content = f.read()

# Replace React.FC export with React.memo
content = content.replace(
    "export const AiMarkdownMessage: React.FC<AiMarkdownMessageProps> = ({",
    "export const AiMarkdownMessage: React.FC<AiMarkdownMessageProps> = React.memo(({"
)

# Add custom equality function to the end of the file
# Find the end of the file:
#   );
# };
# \n
# We'll replace it with
#   );
# }, (prev, next) => prev.content === next.content && prev.className === next.className);
content = re.sub(
    r'  \);\n};\n$',
    '  );\n}, (prev, next) => prev.content === next.content && prev.className === next.className);\n',
    content
)

# Move `components={{...}}` into a useMemo
# Find `<Markdown\n        components={{`
# We will construct a useMemo for it inside the component.
components_block_start = content.find("components={{")
components_block_end = content.find("      >\n        {content}")

if components_block_start != -1 and components_block_end != -1:
    components_code = content[components_block_start + len("components={{"):components_block_end].strip()
    # It ends with `}}`
    if components_code.endswith("}}"):
        components_code = components_code[:-2].strip()

    # Create the useMemo hook
    use_memo_code = f"""
  const markdownComponents = React.useMemo(() => ({{
    {components_code}
  }}), [onRunInTerminal, onClearSnippet, onOpenTimelineSelector]);

  return (
    <div className={{`leading-relaxed max-w-none break-words text-zinc-200 ${{className}}`}}>
      <Markdown components={{markdownComponents}}>
        {{content}}
      </Markdown>
    </div>
"""

    # Replace the old return statement
    return_start = content.find("  return (\n    <div")
    return_end = content.find("    </div>\n  );\n},")
    if return_end == -1:
         return_end = content.find("    </div>\n  );\n};")
    
    if return_start != -1 and return_end != -1:
        content = content[:return_start] + use_memo_code + content[return_end + 11:]
    else:
        print("Failed to replace return block.")

with open("src/components/AiMarkdownMessage.tsx", "w") as f:
    f.write(content)
