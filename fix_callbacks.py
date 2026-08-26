import re

with open("src/pages/VideoPlayerPage.tsx", "r") as f:
    content = f.read()

# Insert the stable callbacks before the main return
insertion = """  const handleClearDoubtContext = useCallback(() => setDoubtContext(null), []);

  const handleCloseFullscreenOverlay = useCallback(() => {
    setIsFullscreenOverlayOpen(false);
    setDoubtContext(null);
  }, []);

  const handleCloseDesktopSidebar = useCallback(() => {
    setShowPlaylistSidebar(false);
    setDoubtContext(null);
  }, []);

  const handleCloseMobileDrawer = useCallback(() => {
    setShowMobileDrawer(false);
    setDoubtContext(null);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">"""

content = content.replace("""  return (
    <div className="max-w-7xl mx-auto space-y-6">""", insertion)

# Replace inline callbacks
content = content.replace("onClearDoubtContext={() => setDoubtContext(null)}", "onClearDoubtContext={handleClearDoubtContext}")

old_close_fullscreen = """                          onClose={() => setIsFullscreenOverlayOpen(false)}"""
content = content.replace(old_close_fullscreen, """                          onClose={handleCloseFullscreenOverlay}""")

old_close_ai_full = """                              onClose={() => {
                                setIsFullscreenOverlayOpen(false);
                                setDoubtContext(null);
                              }}"""
content = content.replace(old_close_ai_full, """                              onClose={handleCloseFullscreenOverlay}""")

old_close_panel_desktop = """              onClose={() => {
                setShowPlaylistSidebar(false);
              }}"""
content = content.replace(old_close_panel_desktop, """              onClose={handleCloseDesktopSidebar}""")

old_close_ai_desktop = """                    onClose={() => {
                      setShowPlaylistSidebar(false);
                      setDoubtContext(null);
                    }}"""
content = content.replace(old_close_ai_desktop, """                    onClose={handleCloseDesktopSidebar}""")

old_close_panel_mobile = """                  onClose={() => {
                    setShowMobileDrawer(false);
                    setDoubtContext(null);
                  }}"""
content = content.replace(old_close_panel_mobile, """                  onClose={handleCloseMobileDrawer}""")

old_close_ai_mobile = """                      onClose={() => {
                        setShowMobileDrawer(false);
                        setDoubtContext(null);
                      }}"""
content = content.replace(old_close_ai_mobile, """                      onClose={handleCloseMobileDrawer}""")


# Replace onSeekTo={(sec) => handleSeek(sec)}
content = content.replace("onSeekTo={(sec) => handleSeek(sec)}", "onSeekTo={handleSeek}")
content = content.replace("""                  onSeekTo={(sec) => {
                    handleSeek(sec);
                  }}""", "                  onSeekTo={handleSeek}")
content = content.replace("onSeek={(sec) => handleSeek(sec)}", "onSeek={handleSeek}")

with open("src/pages/VideoPlayerPage.tsx", "w") as f:
    f.write(content)

