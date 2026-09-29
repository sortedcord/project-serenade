export const MINIMAP_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type MinimapPosition = typeof MINIMAP_POSITIONS[number];
export const DEBUG_INFO_FIELDS = ['fps', 'map', 'seed', 'position', 'angle', 'rooms', 'entities', 'world', 'validation'] as const;
export type DebugInfoField = typeof DEBUG_INFO_FIELDS[number];

export interface GameSettings {
  movementSpeed: number;
  bobFrequency: number;
  mouseSensitivity: number;
  ambientOcclusion: number;
  minimapSize: number;
  minimapRange: number;
  minimapPosition: MinimapPosition;
  debugInfoVisible: boolean;
  debugTextOpacity: number;
  debugTextSize: number;
  debugInfoFields: DebugInfoField[];
  maxFps: number;
}

export const DEFAULT_GAME_SETTINGS: Readonly<GameSettings> = {
  movementSpeed: 3.2,
  bobFrequency: 6,
  mouseSensitivity: 0.0022,
  ambientOcclusion: 0.6,
  minimapSize: 160,
  minimapRange: 24,
  minimapPosition: 'top-left',
  debugInfoVisible: true,
  debugTextOpacity: 0.82,
  debugTextSize: 12,
  debugInfoFields: [...DEBUG_INFO_FIELDS],
  maxFps: 0,
};

export const GAME_SETTING_RANGES = {
  movementSpeed: { min: 1, max: 6, step: 0.1 },
  bobFrequency: { min: 0, max: 12, step: 0.1 },
  mouseSensitivity: { min: 0.0005, max: 0.006, step: 0.0001 },
  ambientOcclusion: { min: 0, max: 1, step: 0.05 },
  minimapSize: { min: 96, max: 256, step: 8 },
  minimapRange: { min: 8, max: 40, step: 1 },
  debugTextOpacity: { min: 0.1, max: 1, step: 0.05 },
  debugTextSize: { min: 8, max: 22, step: 1 },
  maxFps: { min: 1, max: 120, step: 1 },
} as const;
const STORAGE_KEY = 'below-the-signal.settings';

export function clampGameSettings(value: Partial<GameSettings>): GameSettings {
  return {
    movementSpeed: clamp(value.movementSpeed, GAME_SETTING_RANGES.movementSpeed.min, GAME_SETTING_RANGES.movementSpeed.max, DEFAULT_GAME_SETTINGS.movementSpeed),
    bobFrequency: clamp(value.bobFrequency, GAME_SETTING_RANGES.bobFrequency.min, GAME_SETTING_RANGES.bobFrequency.max, DEFAULT_GAME_SETTINGS.bobFrequency),
    mouseSensitivity: clamp(value.mouseSensitivity, GAME_SETTING_RANGES.mouseSensitivity.min, GAME_SETTING_RANGES.mouseSensitivity.max, DEFAULT_GAME_SETTINGS.mouseSensitivity),
    ambientOcclusion: clamp(value.ambientOcclusion, GAME_SETTING_RANGES.ambientOcclusion.min, GAME_SETTING_RANGES.ambientOcclusion.max, DEFAULT_GAME_SETTINGS.ambientOcclusion),
    minimapSize: clamp(value.minimapSize, GAME_SETTING_RANGES.minimapSize.min, GAME_SETTING_RANGES.minimapSize.max, DEFAULT_GAME_SETTINGS.minimapSize),
    minimapRange: clamp(value.minimapRange, GAME_SETTING_RANGES.minimapRange.min, GAME_SETTING_RANGES.minimapRange.max, DEFAULT_GAME_SETTINGS.minimapRange),
    minimapPosition: MINIMAP_POSITIONS.includes(value.minimapPosition as MinimapPosition) ? value.minimapPosition! : DEFAULT_GAME_SETTINGS.minimapPosition,
    debugInfoVisible: typeof value.debugInfoVisible === 'boolean' ? value.debugInfoVisible : DEFAULT_GAME_SETTINGS.debugInfoVisible,
    debugTextOpacity: clamp(value.debugTextOpacity, GAME_SETTING_RANGES.debugTextOpacity.min, GAME_SETTING_RANGES.debugTextOpacity.max, DEFAULT_GAME_SETTINGS.debugTextOpacity),
    debugTextSize: clamp(value.debugTextSize, GAME_SETTING_RANGES.debugTextSize.min, GAME_SETTING_RANGES.debugTextSize.max, DEFAULT_GAME_SETTINGS.debugTextSize),
    debugInfoFields: Array.isArray(value.debugInfoFields)
      ? DEBUG_INFO_FIELDS.filter(field => value.debugInfoFields!.includes(field))
      : [...DEFAULT_GAME_SETTINGS.debugInfoFields],
    maxFps: value.maxFps === 0 ? 0 : clamp(value.maxFps, GAME_SETTING_RANGES.maxFps.min, GAME_SETTING_RANGES.maxFps.max, DEFAULT_GAME_SETTINGS.maxFps),
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
