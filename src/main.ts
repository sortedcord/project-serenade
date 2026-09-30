import './styles.css';
import { CoopClient } from './engine/CoopClient';
import { createStartingSeed, Game } from './engine/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const prompt = document.querySelector<HTMLElement>('#prompt');
const error = document.querySelector<HTMLElement>('#error');
const status = document.querySelector<HTMLElement>('#coop-status');
if (!canvas || !prompt || !error || !status) throw new Error('Game page is missing a required UI element.');

try {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  const configuredUrl = params.get('ws');
  let game: Game | null = null;
  const initialSeed = room ? 'joining-room' : createStartingSeed();
  const coop = room ? new CoopClient(configuredUrl ?? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/coop`, room, status, seed => game?.setWorldSeed(seed)) : null;
  if (!room) status.textContent = '';
  game = new Game(canvas, prompt, initialSeed, coop);
  game.start();
  window.addEventListener('pagehide', () => game?.destroy(), { once: true });
} catch (cause) {
  error.style.display = 'block';
  error.textContent = `Game failed to start\n${cause instanceof Error ? cause.stack ?? cause.message : String(cause)}`;
}
