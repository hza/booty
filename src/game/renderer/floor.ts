import type { Platform, Ladder } from '../types';

// Width of the hole punched in a floor plank where a ladder passes through.
const LADDER_GAP_W = 24;

function drawFloorSegment(ctx: CanvasRenderingContext2D, x: number, w: number, y: number, h: number): void {
  if (w <= 0) return;

  const floorGrad = ctx.createLinearGradient(0, y, 0, y + h);
  floorGrad.addColorStop(0, '#9a8460');
  floorGrad.addColorStop(0.4, '#7a6440');
  floorGrad.addColorStop(1, '#5a4420');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  for (let px = x + 64; px < x + w; px += 64) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + h);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,220,140,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 1);
  ctx.lineTo(x + w, y + 1);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h - 1);
  ctx.lineTo(x + w, y + h - 1);
  ctx.stroke();
}

export function drawPlatforms(ctx: CanvasRenderingContext2D, platforms: Platform[], ladders: Ladder[]): void {
  for (const p of platforms) {
    if (p.isGround === false) {
      const wallGrad = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
      wallGrad.addColorStop(0, '#1a2060');
      wallGrad.addColorStop(0.5, '#2a3080');
      wallGrad.addColorStop(1, '#1a2060');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      continue;
    }

    const gaps = ladders
      .filter(l => Math.abs(l.y - p.y) < p.h && l.x > p.x && l.x < p.x + p.w)
      .map(l => [l.x - LADDER_GAP_W / 2, l.x + LADDER_GAP_W / 2] as const)
      .sort((a, b) => a[0] - b[0]);

    let segStart = p.x;
    for (const [gapStart, gapEnd] of gaps) {
      drawFloorSegment(ctx, segStart, gapStart - segStart, p.y, p.h);
      segStart = gapEnd;
    }
    drawFloorSegment(ctx, segStart, p.x + p.w - segStart, p.y, p.h);
  }
}

export function drawLadder(ctx: CanvasRenderingContext2D, ladder: Ladder): void {
  const lw = 24;
  const railX1 = ladder.x - lw / 2 + 3;
  const railX2 = ladder.x + lw / 2 - 3;
  const top    = ladder.y;
  const bottom = ladder.y + ladder.h;

  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 4;
  for (let ry = top + 10; ry < bottom; ry += 14) {
    ctx.beginPath();
    ctx.moveTo(railX1 + 1, ry + 2);
    ctx.lineTo(railX2 + 1, ry + 2);
    ctx.stroke();
  }

  const railGrad = ctx.createLinearGradient(railX1, 0, railX2, 0);
  railGrad.addColorStop(0, '#8B6200');
  railGrad.addColorStop(0.4, '#daa520');
  railGrad.addColorStop(1, '#8B6200');
  ctx.strokeStyle = railGrad;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(railX1, top); ctx.lineTo(railX1, bottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(railX2, top); ctx.lineTo(railX2, bottom); ctx.stroke();

  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  for (let ry = top + 10; ry < bottom; ry += 14) {
    ctx.beginPath(); ctx.moveTo(railX1, ry); ctx.lineTo(railX2, ry); ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,220,0.6)';
  ctx.lineWidth = 1;
  for (let ry = top + 10; ry < bottom; ry += 14) {
    ctx.beginPath(); ctx.moveTo(railX1, ry - 1); ctx.lineTo(railX2, ry - 1); ctx.stroke();
  }
}
