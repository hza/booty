import type { Player, Pirate } from '../types';
import { PLAYER_W, PLAYER_H, PIRATE_W, PIRATE_H } from '../constants';

export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, time: number): void {
  if (player.dead) return;
  ctx.save();
  ctx.translate(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2);
  if (!player.facingRight) ctx.scale(-1, 1);

  const blink = player.invincible > 0 && Math.floor(time / 4) % 2 === 0;
  if (blink) { ctx.restore(); return; }

  const walkOffset = player.onLadder ? 0 : Math.sin(player.animTimer * 0.25) * 3;
  const legSwing   = player.onGround && Math.abs(player.vx) > 0.1
    ? Math.sin(player.animTimer * 0.25) * 0.4 : 0;

  const hw = PLAYER_W / 2;
  const hh = PLAYER_H / 2;

  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  ctx.save();
  ctx.rotate(legSwing);
  ctx.fillStyle = '#1565C0';
  ctx.beginPath(); ctx.roundRect(-hw + 2, hh - 12, 8, 14, 3); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(-legSwing);
  ctx.fillStyle = '#1565C0';
  ctx.beginPath(); ctx.roundRect(hw - 10, hh - 12, 8, 14, 3); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#4a3000';
  ctx.fillRect(-hw + 1, hh, 10, 4);
  ctx.fillRect(hw - 11, hh, 10, 4);

  ctx.shadowBlur = 0;
  const bodyGrad = ctx.createLinearGradient(-hw, -hh + 4, hw, hh - 10);
  bodyGrad.addColorStop(0, '#42a5f5');
  bodyGrad.addColorStop(0.4, '#1e90ff');
  bodyGrad.addColorStop(1, '#0d47a1');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.roundRect(-hw + 2, -hh + 6, PLAYER_W - 4, PLAYER_H - 18, 4); ctx.fill();

  ctx.fillStyle = '#8B6914';
  ctx.fillRect(-hw + 2, hh - 16, PLAYER_W - 4, 3);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(-3, hh - 17, 6, 5);

  const armSwing = player.onGround ? -walkOffset * 0.15 : 0;
  ctx.fillStyle = '#1976D2';
  ctx.save();
  ctx.translate(-hw - 2, -hh + 10);
  ctx.rotate(-0.3 + armSwing);
  ctx.beginPath(); ctx.roundRect(-3, 0, 7, 14, 3); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(hw - 4, -hh + 10);
  ctx.rotate(0.3 - armSwing);
  ctx.beginPath(); ctx.roundRect(-4, 0, 7, 14, 3); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#e8b090';
  ctx.fillRect(-4, -hh + 2, 8, 6);

  const headGrad = ctx.createRadialGradient(-2, -hh - 6, 2, 0, -hh - 4, 10);
  headGrad.addColorStop(0, '#ffe0c0');
  headGrad.addColorStop(0.7, '#ffb880');
  headGrad.addColorStop(1, '#cc8040');
  ctx.fillStyle = headGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.ellipse(0, -hh - 4, 9, 10, 0, 0, Math.PI * 2); ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#cc2200';
  ctx.fillRect(-9, -hh - 14, 18, 5);
  ctx.fillStyle = '#ff3311';
  ctx.fillRect(-9, -hh - 14, 18, 3);

  ctx.fillStyle = '#1a0a00';
  ctx.beginPath(); ctx.ellipse(-3, -hh - 4, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3,  -hh - 4, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(-2.5, -hh - 5, 0.8, 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3.5,  -hh - 5, 0.8, 0.8, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, -hh - 1, 4, 0.1, Math.PI - 0.1); ctx.stroke();

  ctx.restore();
}

export function drawPirate(ctx: CanvasRenderingContext2D, pirate: Pirate, _time: number): void {
  ctx.save();
  ctx.translate(pirate.x + PIRATE_W / 2, pirate.y + PIRATE_H / 2);
  if (!pirate.facingRight) ctx.scale(-1, 1);

  const hw = PIRATE_W / 2;
  const hh = PIRATE_H / 2;
  const walkOffset = Math.sin(pirate.animTimer * 0.2) * 3;
  const legSwing   = Math.sin(pirate.animTimer * 0.2) * 0.45;

  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  ctx.save();
  ctx.rotate(legSwing);
  ctx.fillStyle = '#5a4020';
  ctx.beginPath(); ctx.roundRect(-hw + 2, hh - 12, 8, 14, 3); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(-legSwing);
  ctx.fillStyle = '#5a4020';
  ctx.beginPath(); ctx.roundRect(hw - 10, hh - 12, 8, 14, 3); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#8B7355';
  ctx.fillRect(-hw + 1, hh + 1, 4, 3);

  ctx.shadowBlur = 0;
  const bodyGrad = ctx.createLinearGradient(-hw, -hh + 4, hw, hh - 10);
  bodyGrad.addColorStop(0, '#cc2200');
  bodyGrad.addColorStop(0.5, '#aa1800');
  bodyGrad.addColorStop(1, '#7a0a00');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.roundRect(-hw + 2, -hh + 6, PIRATE_W - 4, PIRATE_H - 18, 4); ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let si = 0; si < 3; si++) {
    ctx.fillRect(-hw + 2, -hh + 8 + si * 5, PIRATE_W - 4, 2);
  }

  ctx.fillStyle = '#3a2a00';
  ctx.fillRect(-hw + 2, hh - 16, PIRATE_W - 4, 3);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(-3, hh - 18, 6, 6);

  ctx.fillStyle = '#aa1800';
  ctx.save();
  ctx.translate(hw - 2, -hh + 12);
  ctx.rotate(-2.1 + walkOffset * 0.05);
  ctx.beginPath(); ctx.roundRect(-3, 0, 7, 13, 2); ctx.fill();
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.moveTo(2, 13); ctx.lineTo(6, 34); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-2, 14); ctx.lineTo(6, 14); ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#aa1800';
  ctx.save();
  ctx.translate(-hw - 2, -hh + 10);
  ctx.rotate(-0.3 - walkOffset * 0.05);
  ctx.beginPath(); ctx.roundRect(-4, 0, 7, 12, 2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#d0a080';
  ctx.fillRect(-4, -hh + 2, 8, 6);

  const headGrad = ctx.createRadialGradient(-2, -hh - 6, 2, 0, -hh - 4, 11);
  headGrad.addColorStop(0, '#f0e8d0');
  headGrad.addColorStop(0.7, '#d4c0a0');
  headGrad.addColorStop(1, '#a08060');
  ctx.fillStyle = headGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.ellipse(0, -hh - 4, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(-12, -hh - 12); ctx.lineTo(12, -hh - 12);
  ctx.lineTo(9, -hh - 22);   ctx.lineTo(-9, -hh - 22);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(-14, -hh - 14, 28, 4);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(0, -hh - 17, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(0, -hh - 17, 2, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#1a0a00';
  ctx.beginPath(); ctx.ellipse(-3, -hh - 4, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3,  -hh - 4, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(-2.5, -hh - 5, 0.8, 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3.5,  -hh - 5, 0.8, 0.8, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(2, -hh - 8); ctx.lineTo(5, -hh - 2); ctx.stroke();

  ctx.restore();
}
