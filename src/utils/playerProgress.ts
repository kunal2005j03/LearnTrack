type ProgressListener = (cur: number, dur: number, pct: number) => void;
class PlayerProgressStore {
  private listeners: Set<ProgressListener> = new Set();
  public currentTime = 0;
  public duration = 0;
  public percentage = 0;

  subscribe(listener: ProgressListener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  // Helper for components that don't need 4fps updates (e.g. lists, transcripts)
  subscribeThrottled(listener: ProgressListener, throttleMs: number = 1000) {
    let lastCall = 0;
    const throttledListener = (cur: number, dur: number, pct: number) => {
      const now = Date.now();
      if (now - lastCall >= throttleMs) {
        lastCall = now;
        listener(cur, dur, pct);
      }
    };
    this.listeners.add(throttledListener);
    return () => { this.listeners.delete(throttledListener); };
  }

  update(cur: number, dur: number, pct: number) {
    this.currentTime = cur;
    this.duration = dur;
    this.percentage = pct;
    this.listeners.forEach(l => l(cur, dur, pct));
  }
}
export const playerProgressStore = new PlayerProgressStore();
