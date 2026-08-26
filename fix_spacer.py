import re

with open("src/components/InThisVideoPanel.tsx", "r") as f:
    content = f.read()

content = content.replace("""                  </div>
                );
              })}
            </div>
          )}""", """                  </div>
                );
              })}
            </div>
            {/* Trailing spacer to ensure the last chapter item is always fully visible upon scroll */}
            <div className="h-24 sm:h-28 shrink-0 w-full select-none pointer-events-none" aria-hidden="true" />
          )}""")

with open("src/components/InThisVideoPanel.tsx", "w") as f:
    f.write(content)
