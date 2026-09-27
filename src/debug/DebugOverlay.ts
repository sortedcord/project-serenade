export class DebugOverlay {
  enabled = false;
  draw(context: CanvasRenderingContext2D, lines: string[]): void {
    if (!this.enabled) return;
    context.save(); context.fillStyle = '#07100de8'; context.fillRect(5, 5, 128, lines.length * 9 + 8);
    context.fillStyle = '#b9ccb7'; context.font = '7px monospace';
    for (let i = 0; i < lines.length; i++) context.fillText(lines[i] ?? '', 9, 14 + i * 9);
    context.restore();
  }
}
