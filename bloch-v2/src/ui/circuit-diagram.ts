/**
 * Canvas-based quantum circuit diagram renderer.
 */
import type { GateRecord } from '../engine/quantum-state';

const SUB = ['\u2080', '\u2081', '\u2082', '\u2083'];

export function drawCircuitDiagram(
  canvas: HTMLCanvasElement,
  n: number,
  history: GateRecord[],
): void {
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  const W = canvas.clientWidth, H = canvas.clientHeight;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, W, H);

  const margin = 20;
  const wireSpacing = Math.min(25, (H - margin * 2) / Math.max(n, 1));
  const gateWidth = 28, gateSpacing = 6, startX = 40;

  // Wires
  ctx.strokeStyle = '#3a3a5a';
  ctx.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const y = margin + i * wireSpacing + wireSpacing / 2;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(W - 10, y);
    ctx.stroke();
    ctx.fillStyle = '#8888aa';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`q${SUB[i] || i}`, startX - 5, y);
  }

  // Gates
  let x = startX + 10;
  for (const h of history) {
    if (x > W - 30) break;

    if (h.type === 'single' || h.type === 'measure') {
      const qIdx = h.qubits[0];
      const y = margin + qIdx * wireSpacing + wireSpacing / 2;
      ctx.fillStyle = h.type === 'measure' ? '#fd79a8' : '#2a2a4e';
      ctx.strokeStyle = h.type === 'measure' ? '#fd79a8' : '#6c5ce7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y - 10, gateWidth, 20, 3);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e0e0e8';
      ctx.font = '9px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.gate.substring(0, 4), x + gateWidth / 2, y);
    } else if (h.type === 'two') {
      const [q1, q2] = h.qubits;
      const y1 = margin + q1 * wireSpacing + wireSpacing / 2;
      const y2 = margin + q2 * wireSpacing + wireSpacing / 2;
      ctx.strokeStyle = '#55efc4'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + gateWidth / 2, y1); ctx.lineTo(x + gateWidth / 2, y2); ctx.stroke();
      ctx.fillStyle = '#55efc4';
      ctx.beginPath(); ctx.arc(x + gateWidth / 2, y1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a2e1a'; ctx.strokeStyle = '#55efc4'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x, y2 - 10, gateWidth, 20, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#55efc4';
      ctx.font = '9px "Courier New", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(h.gate, x + gateWidth / 2, y2);
    }
    x += gateWidth + gateSpacing;
  }
}
