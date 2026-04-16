/**
 * Measurement histogram renderer.
 */
export function drawHistogram(
  canvas: HTMLCanvasElement,
  data: number[] | null,
  n: number,
): void {
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const W = canvas.clientWidth, H = canvas.clientHeight;

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, W, H);

  if (!data) {
    ctx.fillStyle = '#555';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click "Run" to simulate measurements', W / 2, H / 2);
    return;
  }

  const maxCount = Math.max(...data, 1);
  const barPadding = 2, labelH = 18, barAreaH = H - labelH - 10;
  const barW = Math.max(4, (W - 20) / data.length - barPadding);
  const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#ffeaa7', '#55efc4', '#74b9ff', '#ff7675', '#a29bfe'];

  for (let i = 0; i < data.length; i++) {
    const x = 10 + i * (barW + barPadding);
    const barH = (data[i] / maxCount) * barAreaH;
    const y = 5 + barAreaH - barH;

    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y, barW, barH);

    if (barW > 8) {
      ctx.fillStyle = '#8888aa';
      ctx.font = `${Math.min(9, barW - 2)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`|${i.toString(2).padStart(n, '0')}\u27E9`, x + barW / 2, H - 2);
    }

    if (data[i] > 0 && barW > 10) {
      ctx.fillStyle = '#ddd';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(data[i]), x + barW / 2, y - 2);
    }
  }
}
