export const MINIMAP_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type MinimapPosition = typeof MINIMAP_POSITIONS[number];

export interface GameSettings {
  movementSpeed: number;
  bobFrequency: number;
  mouseSensitivity: number;
  ambientOcclusion: number;
  minimapSize: number;
  minimapPosition: MinimapPosition;
}

export const DEFAULT_GAME_SETTINGS: Readonly<GameSettings> = {
  movementSpeed: 3.2,
  bobFrequency: 6,
  mouseSensitivity: 0.0022,
  ambientOcclusion: 0.6,
  minimapSize: 160,
  minimapPosition: 'top-left',
};

export const GAME_SETTING_RANGES = {
  movementSpeed: { min: 1, max: 6, step: 0.1 },
  bobFrequency: { min: 0, max: 12, step: 0.1 },
  mouseSensitivity: { min: 0.0005, max: 0.006, step: 0.0001 },
  ambientOcclusion: { min: 0, max: 1, step: 0.05 },
  minimapSize: { min: 96, max: 256, step: 8 },
} as const;

const STORAGE_KEY = 'below-the-signal.settings';

export function clampGameSettings(value: Partial<GameSettings>): GameSettings {
  return {
    movementSpeed: clamp(value.movementSpeed, GAME_SETTING_RANGES.movementSpeed.min, GAME_SETTING_RANGES.movementSpeed.max, DEFAULT_GAME_SETTINGS.movementSpeed),
    bobFrequency: clamp(value.bobFrequency, GAME_SETTING_RANGES.bobFrequency.min, GAME_SETTING_RANGES.bobFrequency.max, DEFAULT_GAME_SETTINGS.bobFrequency),
    mouseSensitivity: clamp(value.mouseSensitivity, GAME_SETTING_RANGES.mouseSensitivity.min, GAME_SETTING_RANGES.mouseSensitivity.max, DEFAULT_GAME_SETTINGS.mouseSensitivity),
    ambientOcclusion: clamp(value.ambientOcclusion, GAME_SETTING_RANGES.ambientOcclusion.min, GAME_SETTING_RANGES.ambientOcclusion.max, DEFAULT_GAME_SETTINGS.ambientOcclusion),
    minimapSize: clamp(value.minimapSize, GAME_SETTING_RANGES.minimapSize.min, GAME_SETTING_RANGES.minimapSize.max, DEFAULT_GAME_SETTINGS.minimapSize),
    minimapPosition: MINIMAP_POSITIONS.includes(value.minimapPosition as MinimapPosition) ? value.minimapPosition! : DEFAULT_GAME_SETTINGS.minimapPosition,
  };
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function loadGameSettings(storage: Pick<Storage, 'getItem'> = localStorage): GameSettings {
  try {
    const serialized = storage.getItem(STORAGE_KEY);
    if (!serialized) return { ...DEFAULT_GAME_SETTINGS };
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_GAME_SETTINGS };
    return clampGameSettings(parsed as Partial<GameSettings>);
  } catch {
    return { ...DEFAULT_GAME_SETTINGS };
  }
}

export function saveGameSettings(settings: GameSettings, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(clampGameSettings(settings)));
  } catch {
    // Browser storage may be disabled or full; the live settings still work.
  }
}
