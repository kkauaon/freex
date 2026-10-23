/** Counts events per key in a fixed window. Small and in memory: one instance per process. */
export class RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Returns true when the event is allowed. */
  hit(key: string): boolean {
    const t = this.now();
    const w = this.windows.get(key);
    if (!w || t - w.start >= this.windowMs) {
      this.windows.set(key, { start: t, count: 1 });
      this.prune(t);
      return true;
    }
    w.count++;
    return w.count <= this.max;
  }

  private prune(t: number): void {
    if (this.windows.size < 5_000) return;
    for (const [key, w] of this.windows) if (t - w.start >= this.windowMs) this.windows.delete(key);
  }
}
