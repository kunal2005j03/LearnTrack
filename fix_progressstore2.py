with open("src/store/progressStore.ts", "r") as f:
    code = f.read()

code = code.replace("    return () => this.listeners.delete(listener);\n      return undefined;", "    return () => { this.listeners.delete(listener); };")

with open("src/store/progressStore.ts", "w") as f:
    f.write(code)
