import { DebugMapRenderer } from '../debug/DebugMapRenderer';
import { DebugOverlay } from '../debug/DebugOverlay';
import { validateMap } from '../generation/MapValidator';
import { themes } from '../themes/themes';
import type { GameMap } from '../world/GameMap';
import { WorldManager } from '../world/WorldManager';
import { Input } from './Input';
import { createPlayer, rotatePlayer, type Player } from './Player';
import { Renderer } from './Renderer';
import { nearestInteractable } from './SpriteAssets';
/** Owns the frame loop and composes the small rendering, input, and world systems. */
export class Game {
  readonly renderer: Renderer;
  readonly debugMap = new DebugMapRenderer();
  readonly debug = new DebugOverlay();
  readonly world: WorldManager;
  player: Player;
  private input: Input;
  private frameHandle = 0;
  private previousTime = 0;
  private fps = 0;
  private fpsFrames = 0;
  private fpsElapsed = 0;
  private showMap = false;
  private destroyed = false;
  private transitionCooldown = 0;
  private readonly canvas: HTMLCanvasElement;
  private readonly captureMessage: HTMLElement;
  private readonly prompt: HTMLElement;

  constructor(canvas: HTMLCanvasElement, captureMessage: HTMLElement, prompt: HTMLElement, seed: string) {
    this.canvas = canvas;
    this.captureMessage = captureMessage;
    this.prompt = prompt;
    this.world = new WorldManager(seed);
    this.player = createPlayer(this.world.currentMap);
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas, this.player);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('keydown', this.onDebugKey);
  }

  start(): void { this.previousTime = performance.now(); this.frameHandle = requestAnimationFrame(this.frame); }
  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameHandle);
    this.input.destroy();
    window.removeEventListener('keydown', this.onDebugKey);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
  private readonly onPointerLockChange = (): void => {
    this.captureMessage.classList.toggle('hidden', document.pointerLockElement === this.canvas);
  };

  private readonly onDebugKey = (event: KeyboardEvent): void => {
    if (event.repeat || event.target instanceof HTMLInputElement) return;
    if (event.key === 'F3') { event.preventDefault(); this.debug.enabled = !this.debug.enabled; }
    if (event.key.toLowerCase() === 'r') this.regenerate();
  };

  private readonly frame = (time: number): void => {
    if (this.destroyed) return;
    const dt = Math.min(.08, Math.max(0, (time - this.previousTime) / 1000)); this.previousTime = time;
    const actions = this.input.update(this.world.currentMap, dt);
    if (actions.toggleDebugMap) this.showMap = !this.showMap;
    if (actions.interact) this.interact();
    this.transitionCooldown = Math.max(0, this.transitionCooldown - dt);
    this.transitionAtExit();
    this.updateFps(dt);
    const target = nearestInteractable(this.world.currentMap.entities, this.player.positionX, this.player.positionY, Math.atan2(this.player.directionY, this.player.directionX), 1.7);
    this.prompt.textContent = target ? `E · ${String(target.properties?.label ?? target.type)}` : '';
    this.renderer.render(this.world.currentMap, this.player);
    this.drawOverlays();
    this.frameHandle = requestAnimationFrame(this.frame);
  };

  private updateFps(dt: number): void {
    this.fpsFrames++; this.fpsElapsed += dt;
    if (this.fpsElapsed >= .5) { this.fps = Math.round(this.fpsFrames / this.fpsElapsed); this.fpsFrames = 0; this.fpsElapsed = 0; }
  }

  private interact(): void {
    const map = this.world.currentMap;
    const target = nearestInteractable(map.entities, this.player.positionX, this.player.positionY, Math.atan2(this.player.directionY, this.player.directionX), 1.7);
    if (!target) return;
    if (target.type === 'switch') {
      target.properties = { ...target.properties, active: !target.properties?.active, label: target.properties?.active ? 'Dormant switch' : 'Activated switch' };
    } else {
      target.properties = { ...target.properties, label: `${target.properties?.label ?? target.type} · activated` };
    }
  }

  private transitionAtExit(): void {
    if (this.transitionCooldown > 0) return;
    const map = this.world.currentMap;
    const exit = map.exits.find(item => Math.hypot(this.player.positionX - (item.x + .5), this.player.positionY - (item.y + .5)) < .55);
    if (!exit || !exit.targetMapId) return;
    const transition = this.world.transition(exit);
    if (!transition) return;
    this.player = createPlayer(transition.map);
    this.player.positionX = transition.spawnX;
    this.player.positionY = transition.spawnY;
    rotatePlayer(this.player, transition.angle - Math.atan2(this.player.directionY, this.player.directionX));
    this.transitionCooldown = .8;
    this.input.destroy();
    this.input = new Input(this.canvas, this.player);
  }

  private regenerate(): void {
    const seed = `sector-${Math.floor(Math.random() * 1_000_000)}`;
    const map = this.world.regenerate(seed);
    this.player = createPlayer(map); this.input.destroy(); this.input = new Input(this.canvas, this.player);
  }

  private drawOverlays(): void {
    const context = this.renderer.context, map = this.world.currentMap;
    context.fillStyle = '#e0dfc7'; context.font = '7px monospace';
    context.fillText(map.metadata.title ?? map.id, 5, this.renderer.height - 6);
    if (this.showMap) this.debugMap.draw(context, map, { x: this.player.positionX, y: this.player.positionY, angle: Math.atan2(this.player.directionY, this.player.directionX) }, 8, 22, 150);
    const errors = validateMap(map);
    this.debug.draw(context, [
      `FPS ${this.fps}`, `MAP ${map.id}`, `SEED ${map.metadata.seed ?? ''}`,
      `POS ${this.player.positionX.toFixed(2)},${this.player.positionY.toFixed(2)}`,
      `ANGLE ${Math.atan2(this.player.directionY, this.player.directionX).toFixed(2)}`,
      `ROOMS ${map.rooms.length} PROPS ${map.entities.length}`, `VALID ${errors.length ? errors[0] : 'yes'}`,
      `WORLD ${this.world.state.discoveredMapIds.length} maps`,
    ]);
  }
}

export function createStartingSeed(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('seed') ?? 'maintenance-14233';
}

export function themeForMap(map: GameMap): string {
  return themes[map.metadata.theme ?? 'industrial']?.id ?? 'industrial';
}
