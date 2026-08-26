with open("src/store/progressStore.ts", "r") as f:
    code = f.read()

code = code.replace("this.listeners.delete(listener);", "this.listeners.delete(listener);\n      return undefined;")

with open("src/store/progressStore.ts", "w") as f:
    f.write(code)
