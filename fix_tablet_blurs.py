import re

with open("src/pages/VideoPlayerPage.tsx", "r") as f:
    content = f.read()

# Fix container ambient blur
old_ambient = """className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                      isPortrait
                        ? 'opacity-70 blur-[30px] saturate-[280%] brightness-110 scale-120'
                        : 'opacity-60 sm:opacity-80 blur-[20px] sm:blur-[60px] md:blur-[80px] sm:saturate-[250%] md:saturate-[350%] brightness-105 sm:brightness-110 md:brightness-120 sm:scale-110 md:scale-125'
                    } transform-gpu`}"""
new_ambient = """className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                      isPortrait
                        ? 'opacity-70 blur-[30px] saturate-[200%] brightness-110 scale-120'
                        : isDesktop
                          ? 'opacity-80 blur-[80px] saturate-[350%] brightness-120 scale-125'
                          : 'opacity-70 blur-[40px] saturate-[200%] brightness-110 scale-110'
                    } transform-gpu`}"""
content = content.replace(old_ambient, new_ambient)

# Fix panel backdrop blur
old_panel = """className={`bg-zinc-950/95 backdrop-blur-xl border-t border-x sm:border border-white/15 shadow-2xl flex flex-col h-full overflow-hidden transition-all ${
                    isPortrait ? 'rounded-t-2xl sm:rounded-2xl pb-[env(safe-area-inset-bottom,0px)]' : 'rounded-2xl'
                  }`}"""
new_panel = """className={`bg-zinc-950/95 ${isDesktop ? 'backdrop-blur-xl' : 'backdrop-blur-md'} border-t border-x sm:border border-white/15 shadow-2xl flex flex-col h-full overflow-hidden transition-all ${
                    isPortrait ? 'rounded-t-2xl sm:rounded-2xl pb-[env(safe-area-inset-bottom,0px)]' : 'rounded-2xl'
                  }`}"""
content = content.replace(old_panel, new_panel)

# Fix player constraints for tablet landscape
old_player_style = """style={isFullscreen && !isPortrait && !isDesktop && isFullscreenOverlayOpen ? {
                  maxWidth: fullscreenOverlayTab === 'ai_assistant' 
                     ? 'calc(100vw - min(920px, calc(100vw - 2rem)) - 2rem)' 
                     : 'calc(100vw - min(380px, calc(100vw - 2rem)) - 2rem)'
                } : undefined}"""
new_player_style = """style={isFullscreen && !isPortrait && !isDesktop && isFullscreenOverlayOpen ? {
                  maxWidth: fullscreenOverlayTab === 'ai_assistant' 
                     ? 'calc(100vw - min(50vw, calc(100vw - 2rem)) - 2rem)' 
                     : 'calc(100vw - min(380px, calc(100vw - 2rem)) - 2rem)'
                } : undefined}"""
content = content.replace(old_player_style, new_player_style)

# Fix overlay width for tablet landscape
old_overlay_style = """style={
                    isPortrait
                      ? undefined
                      : {
                          width:
                            fullscreenOverlayTab === 'ai_assistant'
                              ? 'min(920px, calc(100vw - 2rem))'
                              : 'min(380px, calc(100vw - 2rem))' }
                  }"""
new_overlay_style = """style={
                    isPortrait
                      ? undefined
                      : {
                          width:
                            fullscreenOverlayTab === 'ai_assistant'
                              ? isDesktop ? 'min(920px, calc(100vw - 2rem))' : 'min(50vw, calc(100vw - 2rem))'
                              : 'min(380px, calc(100vw - 2rem))' }
                  }"""
content = content.replace(old_overlay_style, new_overlay_style)


with open("src/pages/VideoPlayerPage.tsx", "w") as f:
    f.write(content)
