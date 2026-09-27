import { PLAYER_CONFIG, lookPlayer, rotatePlayer, updatePlayer, type Player } from './Player';
import type { GameMap } from '../world/GameMap';

export interface InputActions {
  interact: boolean;
  toggleDebugMap: boolean;
}

/** Owns game keyboard state, pointer lock, and player input application. */
export class Input {
  private readonly keys = new Set<string>();
  private readonly pendingActions: InputActions = { interact: false, toggleDebugMap: false };
  private readonly frameActions: InputActions = { interact: false, toggleDebugMap: false };
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (key === ' ' || key.startsWith('arrow') || key === 'pageup' || key === 'pagedown') event.preventDefault();
    if (!event.repeat && key === 'e') this.pendingActions.interact = true;
    if (!event.repeat && key === 'm') this.pendingActions.toggleDebugMap = true;
    this.keys.add(key);
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => { this.keys.delete(event.key.toLowerCase()); };
  private readonly onBlur = (): void => { this.keys.clear(); };
  private readonly onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.canvas) return;
    rotatePlayer(this.player, event.movementX * PLAYER_CONFIG.mouseSensitivity);
    lookPlayer(this.player, -event.movementY * PLAYER_CONFIG.mouseSensitivity);
  };
  private readonly onCanvasClick = (): void => {
    if (document.pointerLockElement !== this.canvas) void this.canvas.requestPointerLock();
  };
  private readonly onPointerLockChange = (): void => {
    if (document.pointerLockElement !== this.canvas) this.keys.clear();
  };
  private readonly onPointerLockError = (): void => { this.keys.clear(); };

  constructor(private readonly canvas: HTMLCanvasElement, private readonly player: Player) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);
    canvas.addEventListener('click', this.onCanvasClick);
  }

  get pointerLocked(): boolean { return document.pointerLockElement === this.canvas; }

  /** Applies controls once per simulation frame. */
  update(map: GameMap, deltaSeconds: number): InputActions {
    const forward = Number(this.keys.has('w') || this.keys.has('arrowup')) - Number(this.keys.has('s') || this.keys.has('arrowdown'));
    const strafe = Number(this.keys.has('d')) - Number(this.keys.has('a'));
    const turn = Number(this.keys.has('arrowright')) - Number(this.keys.has('arrowleft'));
    const look = Number(this.keys.has('pageup')) - Number(this.keys.has('pagedown'));
    if (look) lookPlayer(this.player, look * PLAYER_CONFIG.lookSpeed * deltaSeconds);
    updatePlayer(this.player, map, forward, strafe, turn, deltaSeconds);
    this.frameActions.interact = this.pendingActions.interact;
    this.frameActions.toggleDebugMap = this.pendingActions.toggleDebugMap;
    this.pendingActions.interact = false;
    this.pendingActions.toggleDebugMap = false;
    return this.frameActions;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);
    this.canvas.removeEventListener('click', this.onCanvasClick);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.keys.clear();
  }
}
