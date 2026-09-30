import { describe, expect, it } from 'vitest';
import { ExitTransitionGate } from '../../src/engine/ExitTransitionGate';

describe('exit transition re-arming', () => {
  it('does not retrigger while stationary inside an arrival exit', () => {
    const gate = new ExitTransitionGate();
    expect(gate.canTransition(0)).toBe(true);
    for (let frame = 0; frame < 600; frame++) expect(gate.canTransition(0)).toBe(false);
  });

  it('re-arms only after leaving the radius, then permits the next entry', () => {
    const gate = new ExitTransitionGate();
    expect(gate.canTransition(.54)).toBe(true);
    expect(gate.canTransition(.54)).toBe(false);
    expect(gate.canTransition(.55)).toBe(false);
    expect(gate.canTransition(.8)).toBe(false);
    expect(gate.canTransition(.54)).toBe(true);
  });
});
