import type { Door, Portal, Key, Treasure, Prop } from '../types';
import { PORTAL_W, PORTAL_H, PLAYER_H } from '../constants';

export const DOOR_COLORS: Record<number, string> = {
  1:  '#00e5ff', 2:  '#ff40a0', 3:  '#ffee00',
  4:  '#44ff44', 5:  '#ff6600', 6:  '#ffffff',
  7:  '#aa44ff', 8:  '#ff2222', 9:  '#00ffcc',
  10: '#ff88ff', 11: '#88ff44', 12: '#ffaa00',
};

export function drawDoor(ctx: CanvasRenderingContext2D, door: Door): void {
  if (door.open) return;

  const cx    = door.x;
  const top   = door.y;
  const bot   = door.y + door.h;
  const color = DOOR_COLORS[door.number] ?? '#ffffff';
  const bw    = 4;
  const gap   = 4;
  const lx    = cx - gap / 2 - bw;
  const rx    = cx + gap / 2;

  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(lx, top, bw, door.h);
  ctx.fillStyle = color;
  ctx.fillRect(lx + 1, top, bw - 2, door.h);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(lx + 1, top, 1, door.h);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(rx, top, bw, door.h);
  ctx.fillStyle = color;
  ctx.fillRect(rx + 1, top, bw - 2, door.h);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(rx + 1, top, 1, door.h);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lx, top); ctx.lineTo(rx + bw, top);
  ctx.moveTo(lx, bot); ctx.lineTo(rx + bw, bot);
  ctx.stroke();

  const hy = bot - PLAYER_H / 2 - 20;
  const handleLen = 6;
  const handleH   = 4;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  ctx.fillRect(lx - handleLen, hy - handleH / 2, handleLen, handleH);
  ctx.strokeRect(lx - handleLen, hy - handleH / 2, handleLen, handleH);
  ctx.fillRect(rx + bw, hy - handleH / 2, handleLen, handleH);
  ctx.strokeRect(rx + bw, hy - handleH / 2, handleLen, handleH);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(lx - handleLen, hy - handleH / 2, 1, handleH);
  ctx.fillRect(rx + bw + handleLen - 1, hy - handleH / 2, 1, handleH);

  const labelY  = Math.max(top + 16, 16);
  const numStr  = String(door.number);
  const badgeW  = door.number >= 10 ? 28 : 22;
  ctx.fillStyle = '#000000';
  ctx.fillRect(cx - badgeW / 2, labelY - 11, badgeW, 22);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - badgeW / 2, labelY - 11, badgeW, 22);
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(numStr, cx, labelY);

  ctx.restore();
}

export function drawPortal(ctx: CanvasRenderingContext2D, portal: Portal, time: number, active: boolean): void {
  const w = PORTAL_W * 1.25;
  const h = PORTAL_H * 1.25;
  const x = portal.x - (w - PORTAL_W) / 2;
  const y = portal.y - (h - PORTAL_H);
  const pulse = Math.sin(time * 0.06) * 0.15 + 0.85;

  ctx.save();

  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  const bodyGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  bodyGrad.addColorStop(0, '#0a3a0a');
  bodyGrad.addColorStop(0.3, '#1a8a1a');
  bodyGrad.addColorStop(0.6, '#228B22');
  bodyGrad.addColorStop(1, '#0a3a0a');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, [6, 6, 0, 0]); ctx.fill();

  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 4,         y + 6,        w / 2 - 6, h / 2 - 10);
  ctx.fillRect(x + w / 2 + 2, y + 6,        w / 2 - 6, h / 2 - 10);
  ctx.fillRect(x + 4,         y + h / 2 + 2, w / 2 - 6, h / 2 - 8);
  ctx.fillRect(x + w / 2 + 2, y + h / 2 + 2, w / 2 - 6, h / 2 - 8);

  ctx.fillStyle = 'rgba(100,255,100,0.15)';
  ctx.fillRect(x + 4,         y + 6, w / 2 - 6, 3);
  ctx.fillRect(x + w / 2 + 2, y + 6, w / 2 - 6, 3);

  ctx.shadowColor = `rgba(50,255,80,${pulse})`;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = `rgba(50,205,50,${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, [6, 6, 0, 0]); ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = active ? `rgba(180,255,180,${pulse})` : `rgba(140,140,140,${pulse})`;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('EXIT', x + w / 2, y + 4);

  ctx.globalAlpha = (pulse - 0.7) * 0.6;
  ctx.fillStyle = '#00ff44';
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, h - 6, [4, 4, 0, 0]); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

export function drawKey(ctx: CanvasRenderingContext2D, key: Key, time: number): void {
  if (key.collected) return;
  const bob = Math.sin((time * 0.05 + key.bobTimer) * 0.25) * 3;
  ctx.save();
  ctx.translate(key.x, key.y + bob);
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 14;

  const ringGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 8);
  ringGrad.addColorStop(0, '#ffe066');
  ringGrad.addColorStop(0.5, '#ffd700');
  ringGrad.addColorStop(1, '#b8860b');
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(18, 0); ctx.stroke();

  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(12, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(16, 5); ctx.stroke();

  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeText(String(key.number), 0, 0);
  ctx.fillStyle = '#ffd700';
  ctx.fillText(String(key.number), 0, 0);

  ctx.restore();
}

export function drawTreasure(ctx: CanvasRenderingContext2D, t: Treasure, time: number): void {
  if (t.collected) return;
  const bob = Math.sin((time * 0.04 + t.bobTimer) * 0.35) * 3;
  ctx.save();
  ctx.translate(t.x, t.y + bob);
  ctx.shadowColor = '#ff4400';
  ctx.shadowBlur = 16;

  ctx.fillStyle = '#8B4513';
  ctx.fillRect(-14, -8, 28, 18);

  const lidGrad = ctx.createLinearGradient(-14, -16, 14, -8);
  lidGrad.addColorStop(0, '#cd853f');
  lidGrad.addColorStop(0.5, '#daa520');
  lidGrad.addColorStop(1, '#8B4513');
  ctx.fillStyle = lidGrad;
  ctx.fillRect(-14, -16, 28, 8);

  ctx.fillStyle = '#daa520';
  ctx.fillRect(-14, -4, 28, 3);
  ctx.fillRect(-2, -16, 4, 26);

  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(0, -4, 4, 0, Math.PI * 2); ctx.fill();

  ctx.shadowBlur = 0;
  const gemColors = ['#ff0044', '#0044ff', '#00cc44', '#ff8800'];
  gemColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.shadowColor = c;
    ctx.shadowBlur = 4;
    ctx.fillRect(-10 + i * 7, -20, 5, 5);
  });

  ctx.restore();
}

export function drawProp(ctx: CanvasRenderingContext2D, prop: Prop): void {
  ctx.save();
  ctx.translate(prop.x, prop.y);
  if (prop.flip) ctx.scale(-1, 1);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

  switch (prop.kind) {
    case 'barrel':  drawBarrel(ctx); break;
    case 'crate':   drawCrate(ctx);  break;
    case 'sack':    drawSack(ctx);   break;
    case 'bottles': drawBottles(ctx); break;
  }

  ctx.restore();
}

function drawBarrel(ctx: CanvasRenderingContext2D): void {
  const w = 26, h = 32;
  const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  grad.addColorStop(0, '#6b4a25');
  grad.addColorStop(0.5, '#a06a32');
  grad.addColorStop(1, '#6b4a25');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h);
  ctx.quadraticCurveTo(-w / 2 - 4, -h / 2, -w / 2, 0);
  ctx.lineTo(w / 2, 0);
  ctx.quadraticCurveTo(w / 2 + 4, -h / 2, w / 2, -h);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(-w / 2 - 2, -h + 3, w + 4, 3);
  ctx.fillRect(-w / 2 - 4, -h / 2 - 1, w + 8, 3);
  ctx.fillRect(-w / 2 - 2, -4, w + 4, 3);
  ctx.strokeStyle = 'rgba(40,25,10,0.5)';
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(i * 7, -h + 4); ctx.lineTo(i * 7, -2); ctx.stroke();
  }
}

function drawCrate(ctx: CanvasRenderingContext2D): void {
  const s = 40;
  const grad = ctx.createLinearGradient(0, -s, 0, 0);
  grad.addColorStop(0, '#b9893f');
  grad.addColorStop(1, '#8a5f28');
  ctx.fillStyle = grad;
  ctx.fillRect(-s / 2, -s, s, s);
  ctx.strokeStyle = '#5c3d18';
  ctx.lineWidth = 2;
  ctx.strokeRect(-s / 2, -s, s, s);
  ctx.beginPath();
  ctx.moveTo(-s / 2, -s); ctx.lineTo(s / 2, 0);
  ctx.moveTo(s / 2, -s);  ctx.lineTo(-s / 2, 0);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeRect(-s / 2 + 1, -s + 1, s - 2, s - 2);
}

function drawSack(ctx: CanvasRenderingContext2D): void {
  const w = 24, h = 28;
  const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  grad.addColorStop(0, '#7a6a4a');
  grad.addColorStop(0.5, '#a8966c');
  grad.addColorStop(1, '#7a6a4a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.quadraticCurveTo(-w / 2 - 2, -h * 0.7, -5, -h + 4);
  ctx.lineTo(-3, -h); ctx.lineTo(3, -h); ctx.lineTo(5, -h + 4);
  ctx.quadraticCurveTo(w / 2 + 2, -h * 0.7, w / 2, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#5a4a2a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-5, -h + 4); ctx.lineTo(5, -h + 4); ctx.stroke();
}

function drawBottles(ctx: CanvasRenderingContext2D): void {
  const positions = [-7, 0, 7];
  positions.forEach((bx, i) => {
    const h = 22 - (i === 1 ? 0 : 3);
    ctx.fillStyle = i % 2 === 0 ? '#1f5e3a' : '#2a4d6e';
    ctx.fillRect(bx - 3, -h, 6, h);
    ctx.fillRect(bx - 1.5, -h - 5, 3, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(bx - 2, -h + 2, 1.5, h - 4);
  });
}
