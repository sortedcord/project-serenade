import { PLAYER_CONFIG, lookPlayer, rotatePlayer, updatePlayer, type Player } from './Player';
import type { ControllerState } from './GamepadInput';
import type { GameMap } from '../world/GameMap';

export interface InputActions { interact: boolean; toggleDebugMap: boolean }

/** Keyboard and pointer state; the frame loop supplies the current controller snapshot. */
export class Input {
  private readonly keys = new Set<string>();
  private readonly pendingActions: InputActions = { interact: false, toggleDebugMap: false };
  private readonly frameActions: InputActions = { interact: false, toggleDebugMap: false };
  private suspended = false;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.suspended) return;
    if (event.target instanceof HTMLElement && event.target.closest('[role="dialog"]')) return;
    const key = event.key.toLowerCase();
    if (key === ' ' || key.startsWith('arrow') || key === 'pageup' || key === 'pagedown') event.preventDefault();
    if (!event.repeat && key === 'e') this.pendingActions.interact = true;
    if (!event.repeat && key === 'm') this.pendingActions.toggleDebugMap = true;
    this.keys.add(key);
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => { this.keys.delete(event.key.toLowerCase()); };
  private readonly onBlur = (): void => { this.keys.clear(); };
  private readonly onMouseMove = (event: MouseEvent): void => {
    if (this.suspended || document.pointerLockElement !== this.canvas) return;
    rotatePlayer(this.player, event.movementX * PLAYER_CONFIG.mouseSensitivity);
    lookPlayer(this.player, -event.movementY * PLAYER_CONFIG.mouseSensitivity);
  };
  private readonly onPointerLockChange = (): void => {
    if (document.pointerLockElement !== this.canvas) this.keys.clear();
  };

  constructor(private readonly canvas: HTMLCanvasElement, private player: Player) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  get pointerLocked(): boolean { return document.pointerLockElement === this.canvas; }
  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.keys.clear();
    this.pendingActions.interact = this.pendingActions.toggleDebugMap = false;
  }

  queueControllerActions(controller: ControllerState): void {
    if (this.suspended) return;
    this.pendingActions.interact ||= controller.confirm;
    this.pendingActions.toggleDebugMap ||= controller.toggleMap;
  }

  setPlayer(player: Player): void { this.player = player; this.setSuspended(this.suspended); }

  update(map: GameMap, deltaSeconds: number, controller: ControllerState): InputActions {
    this.frameActions.interact = this.frameActions.toggleDebugMap = false;
    if (this.suspended) return this.frameActions;
    const keyboardForward = Number(this.keys.has('w') || this.keys.has('arrowup')) - Number(this.keys.has('s') || this.keys.has('arrowdown'));
    const keyboardStrafe = Number(this.keys.has('d')) - Number(this.keys.has('a'));
    const keyboardTurn = Number(this.keys.has('arrowright')) - Number(this.keys.has('arrowleft'));
    const keyboardLook = Number(this.keys.has('pageup')) - Number(this.keys.has('pagedown'));
    const forward = keyboardForward || controller.forward;
    const strafe = keyboardStrafe || controller.strafe;
    const turn = keyboardTurn || controller.turn;
    const look = keyboardLook || controller.look;
    if (look) lookPlayer(this.player, look * PLAYER_CONFIG.lookSpeed * deltaSeconds);
    updatePlayer(this.player, map, forward, strafe, turn, deltaSeconds);
    this.frameActions.interact = this.pendingActions.interact || controller.confirm;
    this.frameActions.toggleDebugMap = this.pendingActions.toggleDebugMap || controller.toggleMap;
    this.pendingActions.interact = this.pendingActions.toggleDebugMap = false;
    return this.frameActions;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.keys.clear();
  }
}
