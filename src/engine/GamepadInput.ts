export interface GamepadSnapshot {
  id: string;
  index: number;
  connected: boolean;
  mapping: string;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}

export interface ControllerActions {
  confirm: boolean;
  back: boolean;
  pause: boolean;
  toggleMap: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface ControllerState extends ControllerActions {
  forward: number;
  strafe: number;
  turn: number;
  look: number;
  connected: boolean;
  disconnected: boolean;
  status: string;
}

const ACTIONS = ['confirm', 'back', 'pause', 'toggleMap', 'up', 'down', 'left', 'right'] as const;
const DEADZONE = 0.18;

export function controllerAxis(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) <= DEADZONE) return 0;
  return Math.sign(value) * Math.min(1, (Math.abs(value) - DEADZONE) / (1 - DEADZONE));
}

/** Browser standard mapping matches Xbox; unmapped Xbox IDs use the same four stick axes. */
export class GamepadInput {
  readonly state: ControllerState = {
    forward: 0, strafe: 0, turn: 0, look: 0, connected: false, disconnected: false,
    confirm: false, back: false, pause: false, toggleMap: false,
    up: false, down: false, left: false, right: false, status: '',
  };
  private readonly held: Record<keyof ControllerActions, boolean> = {
    confirm: false, back: false, pause: false, toggleMap: false,
    up: false, down: false, left: false, right: false,
  };
  private index: number | null = null;

  poll(): ControllerState {
    if (typeof navigator.getGamepads !== 'function') {
      const state = this.sample([]);
      state.status = 'Controller API unavailable. Use HTTPS or localhost.';
      return state;
    }
    try {
      return this.sample(navigator.getGamepads());
    } catch (error) {
      const state = this.sample([]);
      state.status = `Controller access blocked: ${error instanceof Error ? error.message : String(error)}`;
      return state;
    }
  }

  /** Poll fresh snapshots; null holes and device replacement cannot leave held axes/actions. */
  sample(pads: readonly (GamepadSnapshot | null)[]): ControllerState {
    let pad = this.index === null ? undefined : pads.find(candidate => candidate?.index === this.index && candidate.connected);
    if (!pad) pad = pads.find(candidate => candidate?.connected && (candidate.mapping === 'standard' || /xbox|xinput/i.test(candidate.id)));
    const state = this.state;
    state.disconnected = state.connected && !pad;
    if (!pad) {
      state.forward = state.strafe = state.turn = state.look = 0;
      state.connected = false;
      state.status = pads.some(candidate => candidate?.connected)
        ? 'Controller layout unsupported. Use browser standard mapping.'
        : 'Connect Xbox controller and press a button';
      this.index = null;
      for (const action of ACTIONS) { state[action] = false; this.held[action] = false; }
      return state;
    }
    if (this.index !== pad.index) {
      for (const action of ACTIONS) this.held[action] = false;
      this.index = pad.index;
    }
    state.connected = true;
    state.status = 'Xbox controls: left stick move · right stick look · A interact · Y map · Menu pause';
    state.strafe = controllerAxis(pad.axes[0] ?? 0);
    state.forward = -controllerAxis(pad.axes[1] ?? 0);
    state.turn = controllerAxis(pad.axes[2] ?? 0);
    state.look = -controllerAxis(pad.axes[3] ?? 0);
    for (const action of ACTIONS) {
      let pressed = false;
      switch (action) {
        case 'confirm': pressed = pad.buttons[0]?.pressed ?? false; break;
        case 'back': pressed = pad.buttons[1]?.pressed ?? false; break;
        case 'pause': pressed = pad.buttons[9]?.pressed ?? false; break;
        case 'toggleMap': pressed = pad.buttons[3]?.pressed ?? false; break;
        case 'up': pressed = (pad.buttons[12]?.pressed ?? false) || state.forward > .65; break;
        case 'down': pressed = (pad.buttons[13]?.pressed ?? false) || state.forward < -.65; break;
        case 'left': pressed = (pad.buttons[14]?.pressed ?? false) || state.strafe < -.65; break;
        case 'right': pressed = (pad.buttons[15]?.pressed ?? false) || state.strafe > .65; break;
      }
      state[action] = pressed && !this.held[action];
      this.held[action] = pressed;
    }
    return state;
  }
}
