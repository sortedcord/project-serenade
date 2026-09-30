import { DebugMapRenderer } from '../debug/DebugMapRenderer';
import { DebugOverlay } from '../debug/DebugOverlay';
import { validateMap } from '../generation/MapValidator';
import type { GameSettings } from './GameSettings';
import { themes } from '../content/themes';
import type { GameMap } from '../world/GameMap';
import { WorldManager } from '../world/WorldManager';
import { Input } from './Input';
import { configurePlayerSettings, createPlayer, rotatePlayer, type Player } from './Player';
import { Renderer } from './Renderer';
import { MinimapRenderer } from './MinimapRenderer';
import { SettingsScreen } from './SettingsScreen';
import { PauseMenu } from './PauseMenu';
import { DebugInfoPanel } from './DebugInfoPanel';
import { nearestInteractable } from './SpriteAssets';
import { FrameRateLimiter } from './FrameRateLimiter';
import { ExitTransitionGate } from './ExitTransitionGate';
import { GamepadInput } from './GamepadInput';
/** Owns the frame loop and composes the small rendering, input, and world systems. */
export class Game {
  readonly renderer: Renderer;
  readonly debugMap = new DebugMapRenderer();
  readonly debug = new DebugOverlay();
  private readonly minimap: MinimapRenderer;
  private readonly debugInfo: DebugInfoPanel;
  readonly world: WorldManager;
  player: Player;
  private readonly input: Input;
  private frameHandle = 0;
  private previousTime = 0;
  private readonly frameRateLimiter = new FrameRateLimiter(0);
  private readonly settingsScreen: SettingsScreen;
  private destroyed = false;
  private readonly gamepad = new GamepadInput();
  private showMap = false;
  private readonly pauseMenu: PauseMenu;
  private readonly exitTransitionGate = new ExitTransitionGate();
  private readonly prompt: HTMLElement;

  constructor(canvas: HTMLCanvasElement, prompt: HTMLElement, seed: string) {
    this.prompt = prompt;
    this.world = new WorldManager(seed);
    this.player = createPlayer(this.world.currentMap);
    this.renderer = new Renderer(canvas);
    const minimapCanvas = document.querySelector<HTMLCanvasElement>('#minimap');
    if (!minimapCanvas) throw new Error('Game page is missing the minimap canvas.');
    this.minimap = new MinimapRenderer(minimapCanvas);
    this.debugInfo = new DebugInfoPanel();
    this.input = new Input(canvas, this.player);
    this.settingsScreen = new SettingsScreen((settings: GameSettings) => {
      configurePlayerSettings(settings);
      this.renderer.ambientOcclusion = settings.ambientOcclusion;
      this.frameRateLimiter.setLimit(settings.maxFps);
      this.frameRateLimiter.reset();
      this.minimap.configure(settings.minimapPosition, settings.minimapSize, settings.minimapRange);
      this.debugInfo.configure(settings);
    }, () => this.pauseMenu.show());
    this.pauseMenu = new PauseMenu(canvas, this.settingsScreen, paused => {
      this.input.setSuspended(paused);
      if (paused) this.prompt.textContent = '';
      this.previousTime = performance.now();
      this.frameRateLimiter.reset();
    });
    this.pauseMenu.pause();
    window.addEventListener('keydown', this.onDebugKey);
  }

  start(): void { this.previousTime = performance.now(); this.frameHandle = requestAnimationFrame(this.frame); }
  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameHandle);
    this.pauseMenu.destroy();
    this.input.destroy();
    this.settingsScreen.destroy();
    window.removeEventListener('keydown', this.onDebugKey);
  }

  private readonly onDebugKey = (event: KeyboardEvent): void => {
    if (event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || this.pauseMenu.paused) return;
    if (event.key === 'F3') { event.preventDefault(); this.debug.enabled = !this.debug.enabled; }
    if (event.key.toLowerCase() === 'r') this.regenerate();
  };

  private readonly frame = (time: number): void => {
    if (this.destroyed) return;
    const controller = this.gamepad.poll();
    const wasPaused = this.pauseMenu.paused;
    this.pauseMenu.handleController(controller);
    // Do not let the button that resumes gameplay also interact with an entity.
    if (!wasPaused && !this.pauseMenu.paused) this.input.queueControllerActions(controller);
    if (!this.frameRateLimiter.shouldRender(time)) {
      this.frameHandle = requestAnimationFrame(this.frame);
      return;
    }
    const elapsed = Math.max(0, (time - this.previousTime) / 1000);
    const dt = Math.min(.08, elapsed);
    this.previousTime = time;
    if (this.pauseMenu.paused) {
      this.renderer.render(this.world.currentMap, this.player);
      this.minimap.draw(this.world.currentMap, this.player, this.renderer.raycaster);
      this.frameHandle = requestAnimationFrame(this.frame);
      return;
    }
    const actions = this.input.update(this.world.currentMap, dt, controller);
    if (actions.toggleDebugMap) this.showMap = !this.showMap;
    if (actions.interact && !wasPaused) this.interact();
    this.transitionAtExit();
    this.debugInfo.updateFrame(elapsed);
    const target = nearestInteractable(this.world.currentMap.entities, this.player.positionX, this.player.positionY, Math.atan2(this.player.directionY, this.player.directionX), 1.7);
    this.prompt.textContent = target ? `${controller.connected ? 'A' : 'E'} · ${String(target.properties?.label ?? target.type)}` : '';
    this.renderer.render(this.world.currentMap, this.player);
    this.minimap.draw(this.world.currentMap, this.player, this.renderer.raycaster);
    this.drawOverlays();
    this.frameHandle = requestAnimationFrame(this.frame);
  };

  private drawOverlays(): void {
    const context = this.renderer.context, map = this.world.currentMap;
    const locationName = document.querySelector<HTMLElement>('#location-name');
    if (locationName) locationName.textContent = map.metadata.title ?? map.id;
    if (this.showMap) this.debugMap.draw(context, map, { x: this.player.positionX, y: this.player.positionY, angle: Math.atan2(this.player.directionY, this.player.directionX) }, 8, 22, 150);
    const errors = validateMap(map);
    this.debugInfo.draw(map, this.player, this.world.state.discoveredMapIds.length, errors);
    this.debug.draw(context, [
      `MAP ${map.id}`, `SEED ${map.metadata.seed ?? ''}`,
      `POS ${this.player.positionX.toFixed(2)},${this.player.positionY.toFixed(2)}`,
      `ANGLE ${Math.atan2(this.player.directionY, this.player.directionX).toFixed(2)}`,
      `ROOMS ${map.rooms.length} PROPS ${map.entities.length}`, `VALID ${errors.length ? errors[0] : 'yes'}`,
      `WORLD ${this.world.state.discoveredMapIds.length} maps`,
    ]);
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
    const map = this.world.currentMap;
    let nearestDistance = Number.POSITIVE_INFINITY;
    let nearestExit = undefined as typeof map.exits[number] | undefined;
    for (const exit of map.exits) {
      const distance = Math.hypot(this.player.positionX - (exit.x + .5), this.player.positionY - (exit.y + .5));
      if (distance < nearestDistance) { nearestDistance = distance; nearestExit = exit; }
    }
    if (!this.exitTransitionGate.canTransition(nearestDistance) || !nearestExit?.targetMapId) return;
    const transition = this.world.transition(nearestExit);
    if (!transition) return;
    this.player = createPlayer(transition.map);
    this.player.positionX = transition.spawnX;
    this.player.positionY = transition.spawnY;
    rotatePlayer(this.player, transition.angle - Math.atan2(this.player.directionY, this.player.directionX));
    this.input.setPlayer(this.player);
  }

  private regenerate(): void {
    const seed = `sector-${Math.floor(Math.random() * 1_000_000)}`;
    const map = this.world.regenerate(seed);
    this.player = createPlayer(map);
    this.input.setPlayer(this.player);
  }

}

export function createStartingSeed(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('seed') ?? 'maintenance-14233';
}

export function themeForMap(map: GameMap): string {
  return themes[map.metadata.theme ?? 'industrial']?.id ?? 'industrial';
}
