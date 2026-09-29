import './styles.css';
import { createStartingSeed, Game } from './engine/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const prompt = document.querySelector<HTMLElement>('#prompt');
const error = document.querySelector<HTMLElement>('#error');
if (!canvas || !prompt || !error) throw new Error('Game page is missing a required UI element.');

try {
  const game = new Game(canvas, prompt, createStartingSeed());
  game.start();
  window.addEventListener('pagehide', () => game.destroy(), { once: true });
} catch (cause) {
  error.style.display = 'block';
  error.textContent = `Game failed to start\n${cause instanceof Error ? cause.stack ?? cause.message : String(cause)}`;
}
