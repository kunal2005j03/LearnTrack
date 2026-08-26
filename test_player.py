import re

with open("src/pages/VideoPlayerPage.tsx", "r") as f:
    content = f.read()

# Fix player sizing for desktop
old_player = """className={`relative z-10 flex items-center justify-center transition-all duration-300 ease-out transform-gpu shrink-0 ${
                  isFullscreen
                    ? isPortrait
                      ? isFullscreenOverlayOpen
                        ? 'w-[min(94vw,480px)] aspect-video mt-[calc(0.5rem+env(safe-area-inset-top,0px))] mb-2'
                        : 'w-[94vw] max-w-[500px] aspect-video my-auto shrink-0'
                      : isFullscreenOverlayOpen
                        ? 'flex-1 min-w-0 max-h-[84vh] aspect-video my-auto'
                        : 'w-[96vw] max-w-[177.78vh] aspect-video max-h-[86vh] my-auto shrink-0'
                    : 'w-full h-full'
                }`}
                style={isFullscreen && !isPortrait && isFullscreenOverlayOpen ? {
                  maxWidth: fullscreenOverlayTab === 'ai_assistant' 
                     ? 'calc(100vw - min(920px, calc(100vw - 2rem)) - 2rem)' 
                     : 'calc(100vw - min(380px, calc(100vw - 2rem)) - 2rem)'
                } : undefined}"""

new_player = """className={`relative z-10 flex items-center justify-center transition-all duration-300 ease-out transform-gpu shrink-0 ${
                  isFullscreen
                    ? isPortrait
                      ? isFullscreenOverlayOpen
                        ? 'w-[min(94vw,480px)] aspect-video mt-[calc(0.5rem+env(safe-area-inset-top,0px))] mb-2'
                        : 'w-[94vw] max-w-[500px] aspect-video my-auto shrink-0'
                      : 'w-[96vw] max-w-[177.78vh] aspect-video max-h-[86vh] my-auto shrink-0'
                    : 'w-full h-full'
                }`}"""

content = content.replace(old_player, new_player)

with open("src/pages/VideoPlayerPage.tsx", "w") as f:
    f.write(content)
