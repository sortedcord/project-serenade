import { describe, expect, it } from 'vitest';
import { FrameRateLimiter } from '../../src/engine/FrameRateLimiter';

describe('frame rate limiter', () => {
  it('permits one frame per second at the minimum cap and resets on limit changes', () => {
    const limiter = new FrameRateLimiter(1);
    expect(limiter.shouldRender(0)).toBe(true);
    expect(limiter.shouldRender(999)).toBe(false);
    expect(limiter.shouldRender(1000)).toBe(true);
    limiter.setLimit(60);
    expect(limiter.shouldRender(1000)).toBe(true);
    expect(limiter.shouldRender(1016)).toBe(false);
    expect(limiter.shouldRender(1017)).toBe(true);
  });

  it('renders every animation frame in unlimited mode', () => {
    const limiter = new FrameRateLimiter(0);
    expect(limiter.shouldRender(0)).toBe(true);
    expect(limiter.shouldRender(1)).toBe(true);
    expect(limiter.shouldRender(2)).toBe(true);
  });
});
