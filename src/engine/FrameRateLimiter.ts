/** Limits presented frames; zero means the browser's unlimited RAF cadence. */
export class FrameRateLimiter {
  private lastFrameTime = Number.NEGATIVE_INFINITY;
  private frameInterval = 0;

  constructor(maxFps: number) {
    this.setLimit(maxFps);
  }

  setLimit(maxFps: number): void {
    this.frameInterval = maxFps > 0 ? 1000 / maxFps : 0;
    this.reset();
  }

  reset(): void {
    this.lastFrameTime = Number.NEGATIVE_INFINITY;
  }

  shouldRender(time: number): boolean {
    if (this.frameInterval === 0 || time - this.lastFrameTime >= this.frameInterval) {
      this.lastFrameTime = time;
      return true;
    }
    return false;
  }
}
