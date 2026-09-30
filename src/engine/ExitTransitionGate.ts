const EXIT_TRIGGER_RADIUS = 0.55;

/** Transition once on entry; a new transition requires leaving the full radius. */
export class ExitTransitionGate {
  private armed = true;

  canTransition(distanceToNearestExit: number): boolean {
    if (distanceToNearestExit >= EXIT_TRIGGER_RADIUS) {
      this.armed = true;
      return false;
    }
    if (!this.armed) return false;
    this.armed = false;
    return true;
  }

  reset(): void {
    this.armed = true;
  }
}
