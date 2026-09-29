import { DEBUG_INFO_FIELDS, GAME_SETTING_RANGES, MINIMAP_POSITIONS, loadGameSettings, saveGameSettings, type DebugInfoField, type GameSettings, type MinimapPosition } from './GameSettings';

const controls = {
  movementSpeed: { input: '#setting-walk', output: '#setting-walk-value', digits: 1 },
  bobFrequency: { input: '#setting-bob', output: '#setting-bob-value', digits: 1 },
  mouseSensitivity: { input: '#setting-mouse', output: '#setting-mouse-value', digits: 4 },
  ambientOcclusion: { input: '#setting-ao', output: '#setting-ao-value', digits: 0 },
  minimapSize: { input: '#setting-minimap-size', output: '#setting-minimap-size-value', digits: 0 },
  minimapRange: { input: '#setting-minimap-range', output: '#setting-minimap-range-value', digits: 0 },
  debugTextOpacity: { input: '#setting-debug-opacity', output: '#setting-debug-opacity-value', digits: 0 },
  debugTextSize: { input: '#setting-debug-size', output: '#setting-debug-size-value', digits: 0 },
  maxFps: { input: '#setting-max-fps', output: '#setting-max-fps-value', digits: 0 },
} as const;
const FPS_RANGE_MAX = 120;

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
  private readonly debugVisible: HTMLInputElement;
  private readonly debugFieldOptions: HTMLElement;
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
      minimapRange: requireElement<HTMLInputElement>(controls.minimapRange.input),
      debugTextOpacity: requireElement<HTMLInputElement>(controls.debugTextOpacity.input),
      debugTextSize: requireElement<HTMLInputElement>(controls.debugTextSize.input),
      maxFps: requireElement<HTMLInputElement>(controls.maxFps.input),
    };
    this.outputs = {
      movementSpeed: requireElement<HTMLOutputElement>(controls.movementSpeed.output),
      bobFrequency: requireElement<HTMLOutputElement>(controls.bobFrequency.output),
      mouseSensitivity: requireElement<HTMLOutputElement>(controls.mouseSensitivity.output),
      minimapSize: requireElement<HTMLOutputElement>(controls.minimapSize.output),
      minimapRange: requireElement<HTMLOutputElement>(controls.minimapRange.output),
      ambientOcclusion: requireElement<HTMLOutputElement>(controls.ambientOcclusion.output),
      debugTextOpacity: requireElement<HTMLOutputElement>(controls.debugTextOpacity.output),
      debugTextSize: requireElement<HTMLOutputElement>(controls.debugTextSize.output),
      maxFps: requireElement<HTMLOutputElement>(controls.maxFps.output),
    };
    this.debugVisible = requireElement<HTMLInputElement>('#setting-debug-visible');
    this.debugFieldOptions = requireElement<HTMLElement>('#debug-field-options');
    this.buildDebugFieldOptions();
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
    this.sliders.minimapRange.addEventListener('input', this.onMinimapRange);
    this.positionSelect.addEventListener('change', this.onMinimapPosition);
    this.sliders.debugTextOpacity.addEventListener('input', this.onDebugTextOpacity);
    this.sliders.maxFps.addEventListener('input', this.onMaxFps);
    this.sliders.debugTextSize.addEventListener('input', this.onDebugTextSize);
    this.debugVisible.addEventListener('change', this.onDebugVisible);
    for (const field of DEBUG_INFO_FIELDS) this.debugFieldOptions.querySelector<HTMLInputElement>(`input[value="${field}"]`)?.addEventListener('change', this.onDebugFieldChange);
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
    this.sliders.minimapRange.removeEventListener('input', this.onMinimapRange);
    this.positionSelect.removeEventListener('change', this.onMinimapPosition);
    this.sliders.debugTextOpacity.removeEventListener('input', this.onDebugTextOpacity);
    this.sliders.debugTextSize.removeEventListener('input', this.onDebugTextSize);
    this.sliders.maxFps.removeEventListener('input', this.onMaxFps);
    this.debugVisible.removeEventListener('change', this.onDebugVisible);
    for (const field of DEBUG_INFO_FIELDS) this.debugFieldOptions.querySelector<HTMLInputElement>(`input[value="${field}"]`)?.removeEventListener('change', this.onDebugFieldChange);
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
  private readonly onDebugTextOpacity = (): void => this.update('debugTextOpacity');
  private readonly onDebugTextSize = (): void => this.update('debugTextSize');
  private readonly onMaxFps = (): void => this.update('maxFps');
  private readonly onMinimapSize = (): void => this.update('minimapSize');
  private readonly onMinimapRange = (): void => this.update('minimapRange');
  private readonly onMinimapPosition = (): void => {
    const position = this.positionSelect.value as MinimapPosition;
    if (!MINIMAP_POSITIONS.includes(position)) return;
    this.values.minimapPosition = position;
    saveGameSettings(this.values);
    this.onChange({ ...this.values });
  };
  private readonly onDebugVisible = (): void => this.updateDebugSettings();
  private readonly onDebugFieldChange = (): void => this.updateDebugSettings();
  private updateDebugSettings(): void {
    this.values.debugInfoVisible = this.debugVisible.checked;
    const fields: DebugInfoField[] = [];
    for (const field of DEBUG_INFO_FIELDS) {
      if (this.debugFieldOptions.querySelector<HTMLInputElement>(`input[value="${field}"]`)?.checked) fields.push(field);
    }
    this.values.debugInfoFields = fields;
    saveGameSettings(this.values);
    this.onChange({ ...this.values });
  }
  private buildDebugFieldOptions(): void {
    for (const field of DEBUG_INFO_FIELDS) {
      const label = document.createElement('label');
      label.className = 'debug-field-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = field;
      checkbox.addEventListener('change', this.onDebugFieldChange);
      const text = document.createElement('span');
      text.textContent = ({ fps: 'FPS', map: 'Map name', seed: 'Seed', position: 'Player position', angle: 'Player angle', rooms: 'Room count', entities: 'Entity count', world: 'Discovered maps', validation: 'Map validation' } satisfies Record<DebugInfoField, string>)[field];
      label.append(checkbox, text);
      this.debugFieldOptions.append(label);
    }
  }

  private update(key: SliderSetting): void {
    const range = GAME_SETTING_RANGES[key];
    const requestedValue = Number(this.sliders[key].value);
    const value = key === 'maxFps' && requestedValue === FPS_RANGE_MAX
      ? 0
      : Math.max(range.min, Math.min(range.max, requestedValue));
    this.values[key] = value;
    this.syncControls();
    saveGameSettings(this.values);
    this.onChange({ ...this.values });
  }

  private syncControls(): void {
    this.positionSelect.value = this.values.minimapPosition;
    this.debugVisible.checked = this.values.debugInfoVisible;
    for (const field of DEBUG_INFO_FIELDS) {
      const checkbox = this.debugFieldOptions.querySelector<HTMLInputElement>(`input[value="${field}"]`);
      if (checkbox) checkbox.checked = this.values.debugInfoFields.includes(field);
    }
    for (const key of Object.keys(controls) as SliderSetting[]) {
      this.sliders[key].value = String(key === 'maxFps' && this.values[key] === 0 ? FPS_RANGE_MAX : this.values[key]);
      this.outputs[key].value = key === 'mouseSensitivity'
        ? `${(this.values[key] * 1000).toFixed(1)} px`
        : key === 'ambientOcclusion'
          ? `${Math.round(this.values[key] * 100)}%`
          : key === 'minimapSize'
            ? `${Math.round(this.values[key])} px`
            : key === 'debugTextOpacity'
              ? `${Math.round(this.values[key] * 100)}%`
              : key === 'debugTextSize'
                ? `${Math.round(this.values[key])} px`
                : key === 'maxFps'
                  ? (this.values[key] === 0 ? 'Unlimited' : `${Math.round(this.values[key])} FPS`)
                : key === 'minimapRange'
                  ? `${Math.round(this.values[key])} tiles`
                  : this.values[key].toFixed(controls[key].digits);
    }
  }
}

function requireElement<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Settings screen is missing ${selector}`);
  return element;
}

