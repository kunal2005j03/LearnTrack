import re

with open("src/pages/VideoPlayerPage.tsx", "r") as f:
    content = f.read()

old_state = """  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth;
    }
    return false;
  });

  // Track window orientation dynamically for responsive fullscreen reflow
  useEffect(() => {
    const handleOrientationCheck = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    handleOrientationCheck();

    window.addEventListener('resize', handleOrientationCheck, { passive: true });
    window.addEventListener('orientationchange', handleOrientationCheck, { passive: true });

    return () => {
      window.removeEventListener('resize', handleOrientationCheck);
      window.removeEventListener('orientationchange', handleOrientationCheck);
    };
  }, []);"""

new_state = """  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(orientation: portrait)').matches;
    }
    return false;
  });

  // Efficiently track window orientation natively without thrashing React on every resize pixel
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(orientation: portrait)');
    
    const handleOrientationChange = (e: MediaQueryListEvent) => {
      setIsPortrait(e.matches);
    };

    // Initialize with current value
    setIsPortrait(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleOrientationChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleOrientationChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleOrientationChange);
      } else {
        mediaQuery.removeListener(handleOrientationChange);
      }
    };
  }, []);"""

content = content.replace(old_state, new_state)

with open("src/pages/VideoPlayerPage.tsx", "w") as f:
    f.write(content)
