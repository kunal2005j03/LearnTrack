with open("src/components/AiMarkdownMessage.tsx", "r") as f:
    content = f.read()

replacement = """  const callbacksRef = React.useRef({ onRunInTerminal, onClearSnippet, onOpenTimelineSelector });
  React.useEffect(() => {
    callbacksRef.current = { onRunInTerminal, onClearSnippet, onOpenTimelineSelector };
  }, [onRunInTerminal, onClearSnippet, onOpenTimelineSelector]);

  const markdownComponents = React.useMemo(() => ({"""

content = content.replace("  const markdownComponents = React.useMemo(() => ({", replacement)

# Now we need to replace usages of `onRunInTerminal`, `onClearSnippet`, `onOpenTimelineSelector` inside the components map with `callbacksRef.current.XXX`
content = content.replace("onRunInTerminal={onRunInTerminal}", "onRunInTerminal={(code, lang) => callbacksRef.current.onRunInTerminal?.(code, lang)}")
content = content.replace("onClearSnippet={onClearSnippet}", "onClearSnippet={() => callbacksRef.current.onClearSnippet?.()}")

# Wait, handleTimelineClick is defined OUTSIDE the useMemo. Let's look at handleTimelineClick.
handle_timeline_click = """  const handleTimelineClick = () => {
    if (callbacksRef.current.onOpenTimelineSelector) {
      callbacksRef.current.onOpenTimelineSelector();
    } else {
      window.dispatchEvent(new CustomEvent('learntrack_open_timeline_picker'));
    }
  };"""

content = content.replace("""  const handleTimelineClick = () => {
    if (onOpenTimelineSelector) {
      onOpenTimelineSelector();
    } else {
      window.dispatchEvent(new CustomEvent('learntrack_open_timeline_picker'));
    }
  };""", handle_timeline_click)

# Finally, change the useMemo dependencies to []
content = content.replace("}), [onRunInTerminal, onClearSnippet, onOpenTimelineSelector]);", "}), []);")

with open("src/components/AiMarkdownMessage.tsx", "w") as f:
    f.write(content)
