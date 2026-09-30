import { describe, expect, it } from 'vitest';
import { clampGameSettings, DEFAULT_GAME_SETTINGS, loadGameSettings, saveGameSettings, type GameSettings } from '../../src/engine/GameSettings';
import { configurePlayerSettings, PLAYER_CONFIG } from '../../src/engine/Player';

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('player settings', () => {
  it('uses defaults, applies edits immediately, and restores persisted values', () => {
    const storage = new MemoryStorage();
    expect(loadGameSettings(storage)).toEqual(DEFAULT_GAME_SETTINGS);
    const changed: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      movementSpeed: 4.5, bobFrequency: 0, mouseSensitivity: 0.0041, ambientOcclusion: 0.85,
      minimapSize: 224, minimapPosition: 'bottom-right',
      debugInfoVisible: true, debugTextOpacity: 0.55, debugTextSize: 16,
      debugInfoFields: ['fps', 'position', 'validation'],
    };
    configurePlayerSettings(changed);
    saveGameSettings(changed, storage);
    expect(PLAYER_CONFIG.movementSpeed).toBe(4.5);
    expect(PLAYER_CONFIG.bobFrequency).toBe(0);
    expect(PLAYER_CONFIG.mouseSensitivity).toBe(0.0041);
    expect(loadGameSettings(storage)).toEqual(changed);
  });

  it('bounds malformed or out-of-range stored settings to supported slider ranges', () => {
    expect(clampGameSettings({
      movementSpeed: 90, bobFrequency: -2, mouseSensitivity: Number.NaN, ambientOcclusion: 2,
      debugInfoVisible: false, debugTextOpacity: -1, debugTextSize: 40, debugInfoFields: ['fps', 'invalid'] as GameSettings['debugInfoFields'],
    })).toEqual({
      ...DEFAULT_GAME_SETTINGS, movementSpeed: 6, bobFrequency: 0, ambientOcclusion: 1,
      debugInfoVisible: false, debugTextOpacity: 0.1, debugTextSize: 22, debugInfoFields: ['fps'],
    });
    const storage = new MemoryStorage();
    storage.setItem('below-the-signal.settings', '{broken');
    expect(loadGameSettings(storage)).toEqual(DEFAULT_GAME_SETTINGS);
    storage.setItem('below-the-signal.settings', JSON.stringify({ movementSpeed: 2.5, bobFrequency: 5, mouseSensitivity: 0.003 }));
    expect(loadGameSettings(storage).ambientOcclusion).toBe(DEFAULT_GAME_SETTINGS.ambientOcclusion);
    expect(loadGameSettings(storage).minimapPosition).toBe(DEFAULT_GAME_SETTINGS.minimapPosition);
    expect(loadGameSettings(storage).minimapSize).toBe(DEFAULT_GAME_SETTINGS.minimapSize);
  });
});

