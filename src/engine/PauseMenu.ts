import type { SettingsScreen } from './SettingsScreen';

/** Coordinates gameplay pause, focus loss, pointer release, and menu navigation. */
export class PauseMenu {
  private readonly shade: HTMLElement;
  private readonly resumeButton: HTMLButtonElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly buttons: HTMLButtonElement[];
  private selected = 0;
  private pointerWasLocked = false;
  private resumeRequested = false;
  private readonly captureError: HTMLElement;
  paused = false;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly settings: SettingsScreen, private readonly onPauseChange: (paused: boolean) => void) {
    const shade = document.querySelector<HTMLElement>('#pause-shade');
    const resume = document.querySelector<HTMLButtonElement>('#pause-resume');
    const settingsButton = document.querySelector<HTMLButtonElement>('#pause-settings');
    if (!shade || !resume || !settingsButton) throw new Error('Game page is missing the pause menu.');
    this.shade = shade;
    this.resumeButton = resume;
    this.settingsButton = settingsButton;
    const captureError = document.querySelector<HTMLElement>('#pause-capture-error');
    if (!captureError) throw new Error('Game page is missing the pointer capture error message.');
    this.captureError = captureError;
    this.buttons = [resume, settingsButton];
    resume.addEventListener('click', this.resume);
    settingsButton.addEventListener('click', this.openSettings);
    resume.addEventListener('focus', this.onResumeFocus);
    settingsButton.addEventListener('focus', this.onSettingsFocus);
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('blur', this.pause);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockRequestFailure);
  }

  readonly pause = (): void => {
    this.resumeRequested = false;
    if (this.paused) return;
    this.paused = true;
    this.onPauseChange(true);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.show();
  };

  readonly show = (): void => {
    this.shade.hidden = false;
    this.selected = 0;
    this.resumeButton.focus();
    this.updateSelection();
  };

  private readonly resume = (): void => {
    if (this.resumeRequested) return;
    this.resumeRequested = true;
    this.captureError.textContent = '';
    // Called directly by the real click/keyboard gesture. Do not unpause until
    // pointerlockchange confirms capture, including browsers returning void.
    try {
      const request = this.canvas.requestPointerLock();
      if (request) void request.catch(this.onPointerLockRequestFailure);
    } catch {
      this.onPointerLockRequestFailure();
    }
  };

  private readonly onPointerLockRequestFailure = (): void => {
    if (!this.resumeRequested) return;
    this.resumeRequested = false;
    this.captureError.textContent = 'Mouse capture was refused by the browser. Press Resume to try again.';
  };

  private readonly openSettings = (): void => {
    this.shade.hidden = true;
    this.settings.open();
  };
  private readonly onResumeFocus = (): void => { this.selected = 0; this.updateSelection(); };
  private readonly onSettingsFocus = (): void => { this.selected = 1; this.updateSelection(); };
  private readonly onVisibilityChange = (): void => { if (document.hidden) this.pause(); };
  private readonly onPointerLockChange = (): void => {
    const locked = document.pointerLockElement === this.canvas;
    if (locked && this.resumeRequested) {
      this.resumeRequested = false;
      this.shade.hidden = true;
      this.paused = false;
      this.onPauseChange(false);
      this.canvas.focus();
    } else if (locked && this.paused) {
      document.exitPointerLock();
    } else if (this.pointerWasLocked && !locked) {
      this.pause();
    }
    this.pointerWasLocked = locked;
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      if (this.settings.isOpen) this.settings.close();
      else if (this.paused) this.resume();
      else this.pause();
      return;
    }
    if (!this.paused) return;
    if (this.settings.isOpen) {
      if (key === 'tab') this.trapSettingsFocus(event);
      return;
    }
    event.stopImmediatePropagation();
    if (key === 'w' || key === 'arrowup' || key === 's' || key === 'arrowdown' || key === 'tab') {
      event.preventDefault();
      this.selected = (this.selected + 1) % this.buttons.length;
      this.buttons[this.selected]!.focus();
      this.updateSelection();
    } else if (key === 'enter' || key === ' ') {
      event.preventDefault();
      if (!event.repeat) {
        if (this.selected === 0) this.resume();
        else this.openSettings();
      }
    }
  };

  private trapSettingsFocus(event: KeyboardEvent): void {
    const elements = document.querySelectorAll<HTMLElement>('#settings-panel button, #settings-panel input, #settings-panel select');
    const first = elements[0], last = elements[elements.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || document.activeElement?.id === 'settings-panel')) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  private updateSelection(): void {
    this.buttons.forEach((button, index) => button.classList.toggle('selected', index === this.selected));
  }

  destroy(): void {
    this.resumeButton.removeEventListener('click', this.resume);
    this.settingsButton.removeEventListener('click', this.openSettings);
    this.resumeButton.removeEventListener('focus', this.onResumeFocus);
    this.settingsButton.removeEventListener('focus', this.onSettingsFocus);
    window.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('blur', this.pause);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockRequestFailure);
    this.resumeRequested = false;
  }
}
