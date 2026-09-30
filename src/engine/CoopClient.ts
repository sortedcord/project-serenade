import type { MapEntity } from '../world/MapEntity';
import type { Player } from './Player';

export interface RemotePlayer { x: number; y: number; angle: number }
type ServerMessage =
  | { type: 'joined'; id: string; seed: string; mapId: string; players: Array<{ id: string; x: number | null; y: number | null; angle: number | null }> }
  | { type: 'player-joined'; id: string }
  | { type: 'position'; id: string; x: number; y: number; angle: number }
  | { type: 'leave'; id: string }
  | { type: 'error'; message: string };

/** Client for a relay room. Local input remains local; the server relays validated snapshots. */
export class CoopClient {
  readonly remotes = new Map<string, RemotePlayer>();
  readonly remoteEntities: MapEntity[] = [];
  id = '';
  seed: string | null = null;
  private readonly entitiesById = new Map<string, MapEntity>();
  private readonly socket: WebSocket;
  private lastSent = 0;
  constructor(url: string, readonly room: string, private readonly status: HTMLElement, private readonly onJoined: (seed: string) => void) {
    this.socket = new WebSocket(url);
    status.textContent = `Joining room “${room}”…`;
    this.socket.addEventListener('open', () => this.socket.send(JSON.stringify({ type: 'join', room })));
    this.socket.addEventListener('message', event => this.receive(String(event.data)));
    this.socket.addEventListener('close', () => { status.textContent = `Disconnected from “${room}”.`; this.clearRemotes(); });
    this.socket.addEventListener('error', () => { status.textContent = 'Co-op connection error.'; });
    window.addEventListener('pagehide', () => this.socket.close(), { once: true });
  }
  update(player: Player): void {
    if (!this.id || this.socket.readyState !== WebSocket.OPEN) return;
    const position = { x: player.positionX, y: player.positionY, angle: Math.atan2(player.directionY, player.directionX) };
    const now = performance.now();
    if (now - this.lastSent < 50) return;
    this.socket.send(JSON.stringify({ type: 'position', ...position }));
    this.lastSent = now;
  }
  private setRemote(id: string, x: number, y: number, angle: number): void {
    this.remotes.set(id, { x, y, angle });
    let entity = this.entitiesById.get(id);
    if (!entity) {
      entity = { id: `remote-${id}`, type: 'remote-player', x, y, properties: { renderScale: 0.8 } };
      this.entitiesById.set(id, entity);
      this.remoteEntities.push(entity);
    }
    entity.x = x; entity.y = y; entity.rotation = angle;
  }
  private removeRemote(id: string): void {
    this.remotes.delete(id);
    const entity = this.entitiesById.get(id);
    if (entity) this.remoteEntities.splice(this.remoteEntities.indexOf(entity), 1);
    this.entitiesById.delete(id);
  }
  private clearRemotes(): void {
    this.remotes.clear(); this.remoteEntities.length = 0; this.entitiesById.clear();
  }
  private receive(data: string): void {
    let message: ServerMessage;
    try { message = JSON.parse(data) as ServerMessage; } catch { return; }
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') return;
    if (message.type === 'joined' && typeof message.id === 'string' && typeof message.seed === 'string' && Array.isArray(message.players)) {
      this.id = message.id;
      this.seed = message.seed;
      for (const player of message.players) if (player.id && Number.isFinite(player.x) && Number.isFinite(player.y) && Number.isFinite(player.angle)) this.setRemote(player.id, player.x!, player.y!, player.angle!);
      this.status.textContent = `Co-op room “${this.room}” · ${this.remotes.size + 1} explorer${this.remotes.size ? 's' : ''}`;
      this.onJoined(message.seed);
    } else if (message.type === 'position' && typeof message.id === 'string' && [message.x, message.y, message.angle].every(Number.isFinite)) {
      this.setRemote(message.id, message.x, message.y, message.angle);
      this.status.textContent = `Co-op room “${this.room}” · ${this.remotes.size + 1} explorers`;
    } else if (message.type === 'leave' && typeof message.id === 'string') {
      this.removeRemote(message.id);
      this.status.textContent = `Co-op room “${this.room}” · ${this.remotes.size + 1} explorer${this.remotes.size ? 's' : ''}`;
    } else if (message.type === 'error' && typeof message.message === 'string') this.status.textContent = `Co-op: ${message.message}`;
  }
}
