type Interval = [number, number];
type CoverageListener = (totalSeconds: number) => void;

export class WatchedCoverageTracker {
  private segments: Interval[] = [];
  private lastTime: number = -1;
  private lastWallClock: number = -1;
  private isPlaying: boolean = false;
  private playbackRate: number = 1;
  private listeners: Set<CoverageListener> = new Set();

  subscribe(listener: CoverageListener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notifyListeners() {
    const total = this.getTotalCoverageSeconds();
    this.listeners.forEach(l => l(total));
  }
  
  load(segments: Interval[] = []) {
    this.segments = segments.map(s => [...s]);
    this.mergeSegments();
    this.lastTime = -1;
    this.lastWallClock = -1;
    this.isPlaying = false;
    this.notifyListeners();
  }
  
  setPlaying(playing: boolean) {
    this.isPlaying = playing;
    if (!playing) {
       this.lastTime = -1;
       this.lastWallClock = -1;
    }
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
  }

  update(currentTime: number) {
    if (!this.isPlaying) return;

    const now = Date.now();

    if (this.lastTime === -1 || this.lastWallClock === -1) {
      this.lastTime = currentTime;
      this.lastWallClock = now;
      return;
    }

    const deltaVideo = currentTime - this.lastTime;
    const deltaWall = (now - this.lastWallClock) / 1000;
    
    // Normal playback increment (tick is usually 250-400ms)
    // We allow deltaVideo to be within a reasonable tolerance of deltaWall * playbackRate.
    const expectedVideoDelta = deltaWall * this.playbackRate;
    
    // If it's a backward seek (deltaVideo <= 0), or a forward seek (deltaVideo > expected + tolerance),
    // we don't accumulate coverage.
    // Tolerance: 2.0 seconds is usually enough for lag/buffering without letting people skip.
    // We also make sure deltaWall isn't crazy large (e.g., > 10s means they slept the tab and we just woke up).
    if (deltaVideo > 0 && deltaVideo <= expectedVideoDelta + 2.0 && deltaWall > 0 && deltaWall <= 10.0) {
      this.addCoverage(this.lastTime, currentTime);
    } 
    // If it was a seek or jump, we simply snap to the new position without adding coverage.
    
    this.lastTime = currentTime;
    this.lastWallClock = now;
  }

  private addCoverage(start: number, end: number) {
    if (start < 0 || end < 0 || isNaN(start) || isNaN(end)) return;
    this.segments.push([start, end]);
    this.mergeSegments();
    this.notifyListeners();
  }

  private mergeSegments() {
    if (this.segments.length < 2) return;
    this.segments.sort((a, b) => a[0] - b[0]);
    
    const merged: Interval[] = [this.segments[0]];
    for (let i = 1; i < this.segments.length; i++) {
      const last = merged[merged.length - 1];
      const curr = this.segments[i];
      if (curr[0] <= last[1]) {
        last[1] = Math.max(last[1], curr[1]);
      } else {
        merged.push([...curr]);
      }
    }
    this.segments = merged;
  }

  getSegments(): Interval[] {
    return this.segments.map(s => [...s]);
  }

  getTotalCoverageSeconds(): number {
    return this.segments.reduce((acc, [start, end]) => acc + (end - start), 0);
  }
}

export const watchedCoverageTracker = new WatchedCoverageTracker();
