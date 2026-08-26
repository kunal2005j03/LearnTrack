with open("src/components/AiMarkdownMessage.tsx", "r") as f:
    content = f.read()

# We need to wrap the inline functions in useMemo or useCallback.
# Or better yet, we can create stable functions using useCallback.
replacement_use_callbacks = """  const callbacksRef = React.useRef({ onRunInTerminal, onClearSnippet, onOpenTimelineSelector });
  React.useEffect(() => {
    callbacksRef.current = { onRunInTerminal, onClearSnippet, onOpenTimelineSelector };
  }, [onRunInTerminal, onClearSnippet, onOpenTimelineSelector]);

  const handleRunInTerminal = React.useCallback((code: string, lang: string) => {
    callbacksRef.current.onRunInTerminal?.(code, lang);
  }, []);

  const handleClearSnippet = React.useCallback(() => {
    callbacksRef.current.onClearSnippet?.();
  }, []);
"""

content = content.replace("""  const callbacksRef = React.useRef({ onRunInTerminal, onClearSnippet, onOpenTimelineSelector });
  React.useEffect(() => {
    callbacksRef.current = { onRunInTerminal, onClearSnippet, onOpenTimelineSelector };
  }, [onRunInTerminal, onClearSnippet, onOpenTimelineSelector]);""", replacement_use_callbacks)

content = content.replace(
    "onRunInTerminal={(code, lang) => callbacksRef.current.onRunInTerminal?.(code, lang)}",
    "onRunInTerminal={handleRunInTerminal}"
)

content = content.replace(
    "onClearSnippet={() => callbacksRef.current.onClearSnippet?.()}",
    "onClearSnippet={handleClearSnippet}"
)

with open("src/components/AiMarkdownMessage.tsx", "w") as f:
    f.write(content)
