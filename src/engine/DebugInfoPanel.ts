import { DEBUG_INFO_FIELDS, type DebugInfoField, type GameSettings } from './GameSettings';
import type { GameMap } from '../world/GameMap';
import type { Player } from './Player';

const FIELD_LABELS: Record<DebugInfoField, string> = {
  fps: 'FPS', map: 'Map', seed: 'Seed', position: 'Position', angle: 'Angle',
  rooms: 'Rooms', entities: 'Entities', world: 'World maps', validation: 'Validation',
};

/** DOM debug panel stays crisp and can be independently styled from the pixel canvas. */
export class DebugInfoPanel {
  private readonly element: HTMLElement;
  private readonly lines: Record<DebugInfoField, HTMLElement>;
  private readonly fpsSamples = new Float64Array(30);
  private sampleCount = 0;
  private sampleIndex = 0;
  private sampleElapsed = 0;
  private fps = 0;

  constructor() {
    const element = document.querySelector<HTMLElement>('#debug-info');
    if (!element) throw new Error('Game page is missing the debug information panel.');
    this.element = element;
    const lines = {} as Record<DebugInfoField, HTMLElement>;
    for (const field of DEBUG_INFO_FIELDS) {
      const line = document.createElement('div');
      line.dataset.field = field;
      element.append(line);
      lines[field] = line;
    }
    this.lines = lines;
  }

  configure(settings: Readonly<GameSettings>): void {
    this.element.hidden = !settings.debugInfoVisible;
    this.element.style.opacity = String(settings.debugTextOpacity);
    this.element.style.fontSize = `${settings.debugTextSize}px`;
    for (const field of DEBUG_INFO_FIELDS) this.lines[field].hidden = !settings.debugInfoFields.includes(field);
  }

  updateFrame(deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;
    this.fpsSamples[this.sampleIndex] = 1 / deltaSeconds;
    this.sampleIndex = (this.sampleIndex + 1) % this.fpsSamples.length;
    this.sampleCount = Math.min(this.sampleCount + 1, this.fpsSamples.length);
    this.sampleElapsed += deltaSeconds;
    if (this.sampleElapsed >= 0.2) {
      let total = 0;
      for (let index = 0; index < this.sampleCount; index++) total += this.fpsSamples[index]!;
      this.fps = Math.round(total / this.sampleCount);
      this.sampleElapsed = 0;
    }
    this.lines.fps.textContent = `${FIELD_LABELS.fps}: ${this.fps}`;
  }

  draw(map: GameMap, player: Player, worldMapCount: number, validationErrors: readonly string[]): void {
    this.lines.map.textContent = `${FIELD_LABELS.map}: ${map.metadata.title ?? map.id}`;
    this.lines.seed.textContent = `${FIELD_LABELS.seed}: ${map.metadata.seed ?? '—'}`;
    this.lines.position.textContent = `${FIELD_LABELS.position}: ${player.positionX.toFixed(2)}, ${player.positionY.toFixed(2)}`;
    this.lines.angle.textContent = `${FIELD_LABELS.angle}: ${Math.atan2(player.directionY, player.directionX).toFixed(2)} rad`;
    this.lines.rooms.textContent = `${FIELD_LABELS.rooms}: ${map.rooms.length}`;
    this.lines.entities.textContent = `${FIELD_LABELS.entities}: ${map.entities.length}`;
    this.lines.world.textContent = `${FIELD_LABELS.world}: ${worldMapCount}`;
    this.lines.validation.textContent = validationErrors.length
      ? `${FIELD_LABELS.validation}: ${validationErrors[0]}`
      : `${FIELD_LABELS.validation}: OK`;
  }
}
