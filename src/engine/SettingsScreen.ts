import { GAME_SETTING_RANGES, MINIMAP_POSITIONS, loadGameSettings, saveGameSettings, type GameSettings, type MinimapPosition } from './GameSettings';

const controls = {
  movementSpeed: { input: '#setting-walk', output: '#setting-walk-value', digits: 1 },
  bobFrequency: { input: '#setting-bob', output: '#setting-bob-value', digits: 1 },
  mouseSensitivity: { input: '#setting-mouse', output: '#setting-mouse-value', digits: 4 },
  ambientOcclusion: { input: '#setting-ao', output: '#setting-ao-value', digits: 0 },
  minimapSize: { input: '#setting-minimap-size', output: '#setting-minimap-size-value', digits: 0 },
} as const;

type SliderSetting = keyof typeof controls;
/** Owns the accessible in-game settings dialog and persists its live slider edits. */
export class SettingsScreen {
  private readonly shade: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly doneButton: HTMLButtonElement;
  private readonly sliders: Record<SliderSetting, HTMLInputElement>;
  private readonly outputs: Record<SliderSetting, HTMLOutputElement>;
  private readonly positionSelect: HTMLSelectElement;
  private readonly values: GameSettings;

  constructor(private readonly onChange: (settings: GameSettings) => void, private readonly onClose: () => void) {
    this.shade = requireElement('#settings-shade');
    this.panel = requireElement('#settings-panel');
    this.closeButton = requireElement<HTMLButtonElement>('#settings-close');
    this.doneButton = requireElement<HTMLButtonElement>('#settings-done');
    this.sliders = {
      movementSpeed: requireElement<HTMLInputElement>(controls.movementSpeed.input),
      bobFrequency: requireElement<HTMLInputElement>(controls.bobFrequency.input),
      mouseSensitivity: requireElement<HTMLInputElement>(controls.mouseSensitivity.input),
      ambientOcclusion: requireElement<HTMLInputElement>(controls.ambientOcclusion.input),
      minimapSize: requireElement<HTMLInputElement>(controls.minimapSize.input),
    };
    this.outputs = {
      movementSpeed: requireElement<HTMLOutputElement>(controls.movementSpeed.output),
      bobFrequency: requireElement<HTMLOutputElement>(controls.bobFrequency.output),
      mouseSensitivity: requireElement<HTMLOutputElement>(controls.mouseSensitivity.output),
      ambientOcclusion: requireElement<HTMLOutputElement>(controls.ambientOcclusion.output),
      minimapSize: requireElement<HTMLOutputElement>(controls.minimapSize.output),
    };
    this.positionSelect = requireElement<HTMLSelectElement>('#setting-minimap-position');
    this.values = loadGameSettings();
    this.syncControls();
    this.onChange({ ...this.values });

    this.closeButton.addEventListener('click', this.close);
    this.doneButton.addEventListener('click', this.close);
    this.shade.addEventListener('click', this.onShadeClick);
    this.sliders.movementSpeed.addEventListener('input', this.onMovementSpeed);
    this.sliders.bobFrequency.addEventListener('input', this.onBobFrequency);
    this.sliders.mouseSensitivity.addEventListener('input', this.onMouseSensitivity);
    this.sliders.ambientOcclusion.addEventListener('input', this.onAmbientOcclusion);
    this.sliders.minimapSize.addEventListener('input', this.onMinimapSize);
    this.positionSelect.addEventListener('change', this.onMinimapPosition);
  }

  get isOpen(): boolean { return !this.shade.hidden; }

  destroy(): void {
    this.closeButton.removeEventListener('click', this.close);
    this.doneButton.removeEventListener('click', this.close);
    this.shade.removeEventListener('click', this.onShadeClick);
    this.sliders.movementSpeed.removeEventListener('input', this.onMovementSpeed);
    this.sliders.bobFrequency.removeEventListener('input', this.onBobFrequency);
    this.sliders.mouseSensitivity.removeEventListener('input', this.onMouseSensitivity);
    this.sliders.ambientOcclusion.removeEventListener('input', this.onAmbientOcclusion);
    this.sliders.minimapSize.removeEventListener('input', this.onMinimapSize);
    this.positionSelect.removeEventListener('change', this.onMinimapPosition);
  }

  readonly open = (): void => {
    this.shade.hidden = false;
    this.panel.focus();
  };

  readonly close = (): void => {
    this.shade.hidden = true;
    this.onClose();
  };


  private readonly onShadeClick = (event: MouseEvent): void => {
    if (event.target === this.shade) this.close();
  };

  private readonly onMovementSpeed = (): void => this.update('movementSpeed');
  private readonly onBobFrequency = (): void => this.update('bobFrequency');
  private readonly onMouseSensitivity = (): void => this.update('mouseSensitivity');
  private readonly onAmbientOcclusion = (): void => this.update('ambientOcclusion');
  private readonly onMinimapSize = (): void => this.update('minimapSize');
  private readonly onMinimapPosition = (): void => {
    const position = this.positionSelect.value as MinimapPosition;
    if (!MINIMAP_POSITIONS.includes(position)) return;
    this.values.minimapPosition = position;
    saveGameSettings(this.values);
    this.onChange({ ...this.values });
  };

  private update(key: SliderSetting): void {
    const range = GAME_SETTING_RANGES[key];
    const value = Math.max(range.min, Math.min(range.max, Number(this.sliders[key].value)));
    this.values[key] = value;
    this.syncControls();
    saveGameSettings(this.values);
    this.onChange({ ...this.values });
  }

  private syncControls(): void {
    this.positionSelect.value = this.values.minimapPosition;
    for (const key of Object.keys(controls) as SliderSetting[]) {
      this.sliders[key].value = String(this.values[key]);
      this.outputs[key].value = key === 'mouseSensitivity'
        ? `${(this.values[key] * 1000).toFixed(1)} px`
        : key === 'ambientOcclusion'
          ? `${Math.round(this.values[key] * 100)}%`
          : key === 'minimapSize'
            ? `${Math.round(this.values[key])} px`
            : this.values[key].toFixed(controls[key].digits);
    }
  }
}

function requireElement<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Settings screen is missing ${selector}`);
  return element;
}

