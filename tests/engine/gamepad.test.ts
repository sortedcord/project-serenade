import { describe, expect, it } from 'vitest';
import { GamepadInput, controllerAxis, type GamepadSnapshot } from '../../src/engine/GamepadInput';

function pad(axes: number[] = [0, 0, 0, 0], pressed: number[] = [], index = 0): GamepadSnapshot {
  return {
    id: 'Xbox Wireless Controller', index, connected: true, mapping: 'standard', axes,
    buttons: Array.from({ length: 17 }, (_, button) => ({ pressed: pressed.includes(button), value: Number(pressed.includes(button)) })),
  };
}

describe('Xbox controller input', () => {
  it('applies deadzones without losing analog speed or stick directions', () => {
    expect(controllerAxis(.17)).toBe(0);
    expect(controllerAxis(-.17)).toBe(0);
    const input = new GamepadInput();
    const state = input.sample([pad([.59, -.59, -.59, -.59])]);
    expect(state.strafe).toBeCloseTo(.5);
    expect(state.forward).toBeCloseTo(.5);
    expect(state.turn).toBeCloseTo(-.5);
    expect(state.look).toBeCloseTo(.5);
    expect(state.connected).toBe(true);
  });

  it('fires A, B, Y, Menu and navigation once until each is released', () => {
    const input = new GamepadInput();
    expect(input.sample([pad([], [0, 1, 3, 9, 12, 15])])).toMatchObject({ confirm: true, back: true, toggleMap: true, pause: true, up: true, right: true });
    expect(input.sample([pad([], [0, 1, 3, 9, 12, 15])])).toMatchObject({ confirm: false, back: false, toggleMap: false, pause: false, up: false, right: false });
    input.sample([pad()]);
    expect(input.sample([pad([], [9])]).pause).toBe(true);
  });

  it('stops movement on disconnect and accepts nonzero controller indices', () => {
    const input = new GamepadInput();
    expect(input.sample([null, pad([0, -1, 0, 0], [], 1)]).forward).toBe(1);
    const disconnected = input.sample([null, null]);
    expect(disconnected).toMatchObject({ forward: 0, strafe: 0, turn: 0, look: 0, disconnected: true, connected: false });
    expect(input.sample([]).disconnected).toBe(false);
    expect(input.sample([pad([], [0], 2)]).confirm).toBe(true);
  });

  it('supports browser standard layouts and unmapped Xbox IDs without guessing arbitrary controllers', () => {
    const input = new GamepadInput();
    const xbox = pad([.7, -.8, .6, 0]); xbox.mapping = '';
    expect(input.sample([xbox]).connected).toBe(true);
    input.sample([]);
    const unknown = pad(); unknown.mapping = ''; unknown.id = 'Unknown joystick';
    expect(input.sample([unknown]).connected).toBe(false);
    unknown.mapping = 'standard';
    expect(input.sample([unknown]).connected).toBe(true);
  });
});
