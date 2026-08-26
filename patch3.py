with open("src/utils/playerProgress.ts", "r") as f:
    code = f.read()

code = code.replace("return () => this.listeners.delete(listener);", "return () => { this.listeners.delete(listener); };")
code = code.replace("return () => this.listeners.delete(throttledListener);", "return () => { this.listeners.delete(throttledListener); };")

with open("src/utils/playerProgress.ts", "w") as f:
    f.write(code)
