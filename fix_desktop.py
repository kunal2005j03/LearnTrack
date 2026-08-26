import re

with open("src/pages/VideoPlayerPage.tsx", "r") as f:
    content = f.read()

# Fix container
old_container = """className={`flex-1 min-h-0 relative w-full h-full flex items-center justify-center overflow-hidden bg-black flex-col`}"""
new_container = """className={`flex-1 min-h-0 relative w-full h-full flex items-center justify-center overflow-hidden bg-black ${
              isFullscreen && isFullscreenOverlayOpen && !isPortrait && !isDesktop ? 'flex-row p-4 gap-4' : 'flex-col'
            }`}"""
content = content.replace(old_container, new_container)

# Fix player
old_player = """className={`relative z-10 flex items-center justify-center transition-all duration-300 ease-out transform-gpu shrink-0 ${
                  isFullscreen
                    ? isPortrait
                      ? isFullscreenOverlayOpen
                        ? 'w-[min(94vw,480px)] aspect-video mt-[calc(0.5rem+env(safe-area-inset-top,0px))] mb-2'
                        : 'w-[94vw] max-w-[500px] aspect-video my-auto shrink-0'
                      : 'w-[96vw] max-w-[177.78vh] aspect-video max-h-[86vh] my-auto shrink-0'
                    : 'w-full h-full'
                }`}"""
new_player = """className={`relative z-10 flex items-center justify-center transition-all duration-300 ease-out transform-gpu shrink-0 ${
                  isFullscreen
                    ? isPortrait
                      ? isFullscreenOverlayOpen
                        ? 'w-[min(94vw,480px)] aspect-video mt-[calc(0.5rem+env(safe-area-inset-top,0px))] mb-2'
                        : 'w-[94vw] max-w-[500px] aspect-video my-auto shrink-0'
                      : isDesktop
                        ? 'w-[96vw] max-w-[177.78vh] aspect-video max-h-[86vh] my-auto shrink-0'
                        : isFullscreenOverlayOpen
                          ? 'flex-1 min-w-0 max-h-[84vh] aspect-video my-auto'
                          : 'w-[96vw] max-w-[177.78vh] aspect-video max-h-[86vh] my-auto shrink-0'
                    : 'w-full h-full'
                }`}
                style={isFullscreen && !isPortrait && !isDesktop && isFullscreenOverlayOpen ? {
                  maxWidth: fullscreenOverlayTab === 'ai_assistant' 
                     ? 'calc(100vw - min(920px, calc(100vw - 2rem)) - 2rem)' 
                     : 'calc(100vw - min(380px, calc(100vw - 2rem)) - 2rem)'
                } : undefined}"""
content = content.replace(old_player, new_player)

# Fix panel
old_panel = """className={`z-50 pointer-events-auto flex flex-col transition-all duration-300 ease-out shadow-2xl ${
                    isPortrait
                      ? 'relative w-full flex-1 min-h-0 max-w-[520px] mx-auto animate-in slide-in-from-bottom duration-300'
                      : 'absolute right-4 top-4 bottom-[90px] animate-in slide-in-from-right duration-200'
                  }`}"""
new_panel = """className={`z-50 pointer-events-auto flex flex-col transition-all duration-300 ease-out shadow-2xl ${
                    isPortrait
                      ? 'relative w-full flex-1 min-h-0 max-w-[520px] mx-auto animate-in slide-in-from-bottom duration-300'
                      : isDesktop
                        ? 'absolute right-4 top-4 bottom-[90px] animate-in slide-in-from-right duration-200'
                        : 'relative h-full shrink-0 animate-in slide-in-from-right duration-200'
                  }`}"""
content = content.replace(old_panel, new_panel)

# Fix control bar visibility
old_vis = """(!isPortrait || !isFullscreenOverlayOpen) && (fullscreenControlsVisible || showSpeedDropdown)"""
new_vis = """(!isFullscreenOverlayOpen || isDesktop) && (fullscreenControlsVisible || showSpeedDropdown)"""
content = content.replace(old_vis, new_vis)

with open("src/pages/VideoPlayerPage.tsx", "w") as f:
    f.write(content)
