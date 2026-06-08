import { CANVAS_W, CANVAS_H, FLOOR_H } from '../constants';

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H - 80);
  grad.addColorStop(0, '#061a52');
  grad.addColorStop(1, '#0d3080');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H - 80);

  ctx.save();
  drawWallBricks(ctx);
  ctx.restore();

  drawCeiling(ctx);
}

function drawCeiling(ctx: CanvasRenderingContext2D): void {
  const h = FLOOR_H;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#5a4420');
  grad.addColorStop(0.6, '#7a6440');
  grad.addColorStop(1, '#9a8460');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, h);

  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  for (let px = 64; px < CANVAS_W; px += 64) {
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,220,140,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h - 1);
  ctx.lineTo(CANVAS_W, h - 1);
  ctx.stroke();
}

function drawWallBricks(ctx: CanvasRenderingContext2D): void {
  const brickW = 40;
  const brickH = 20;
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let row = 0; row < Math.ceil(CANVAS_H / brickH); row++) {
    const offsetX = (row % 2) * (brickW / 2);
    for (let col = -1; col < Math.ceil(CANVAS_W / brickW) + 1; col++) {
      const bx = col * brickW + offsetX;
      const by = row * brickH;
      ctx.strokeRect(bx + 0.5, by + 0.5, brickW - 1, brickH - 1);
    }
  }
}
