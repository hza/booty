import type { GameState, Particle } from '../types';
import { CANVAS_W, CANVAS_H } from '../constants';
import { DOOR_COLORS } from './items';

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

export function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  const hudY = CANVAS_H - 78;
  const hudH = 78;

  const hudGrad = ctx.createLinearGradient(0, hudY, 0, CANVAS_H);
  hudGrad.addColorStop(0, '#0a1840');
  hudGrad.addColorStop(1, '#050e28');
  ctx.fillStyle = hudGrad;
  ctx.fillRect(0, hudY, CANVAS_W, hudH);

  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, hudY); ctx.lineTo(CANVAS_W, hudY); ctx.stroke();

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CREW:', 20, hudY + 20);
  for (let i = 0; i < state.lives; i++) {
    drawMiniPlayer(ctx, 90 + i * 26, hudY + 20);
  }

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('KEYS:', 20, hudY + 46);
  for (let i = 0; i < 8; i++) {
    const kn  = i + 1;
    const has = state.collectedKeys.has(kn);
    const col = i % 4;
    const row = Math.floor(i / 4);
    const kx  = 90 + col * 26;
    const ky  = hudY + 38 + row * 20;
    ctx.textAlign = 'center';
    ctx.fillStyle = has ? DOOR_COLORS[kn] ?? '#ffd700' : 'rgba(255,255,255,0.2)';
    ctx.fillText(`${kn}`, kx, ky);
  }
  ctx.textAlign = 'left';

  ctx.fillStyle = '#00ff88';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 8;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`BOOTY  ${String(state.score).padStart(5, '0')}`, CANVAS_W / 2, hudY + 22);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ff8800';
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 8;
  ctx.fillText(`TREASURE  ${state.treasureCount}`, CANVAS_W / 2, hudY + 50);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 8;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`ROOM  ${state.currentRoomId + 1}/${state.rooms.length}`, CANVAS_W - 20, hudY + 22);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(180,200,255,0.4)';
  ctx.font = '11px monospace';
  ctx.fillText('← → move   ↑↓ ladder   SPACE jump', CANVAS_W - 20, hudY + 42);
  ctx.fillText('Keys open doors · ↓ to enter portal', CANVAS_W - 20, hudY + 58);
}

function drawMiniPlayer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#1e90ff';
  ctx.fillRect(x - 5, y - 8, 10, 12);
  ctx.fillStyle = '#ffe0b0';
  ctx.beginPath(); ctx.arc(x, y - 12, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cc2200';
  ctx.fillRect(x - 5, y - 18, 10, 3);
}

export function drawGameOver(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = '#ff3300';
  ctx.shadowColor = '#ff3300';
  ctx.shadowBlur = 30;
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 30);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.font = '24px monospace';
  ctx.fillText('Press ENTER to play again', CANVAS_W / 2, CANVAS_H / 2 + 30);
}

export function drawLevelComplete(ctx: CanvasRenderingContext2D, score: number): void {
  ctx.fillStyle = 'rgba(0,0,20,0.65)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 30;
  ctx.font = 'bold 56px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEVEL CLEAR!', CANVAS_W / 2, CANVAS_H / 2 - 30);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#00ff88';
  ctx.font = '28px monospace';
  ctx.fillText(`BOOTY: ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 30);
}
