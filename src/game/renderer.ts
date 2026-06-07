import type { GameState, Player, Pirate, Key, Door, Portal, Platform, Ladder, Particle, Treasure } from './types';
import {
  CANVAS_W, CANVAS_H,
  PLAYER_W, PLAYER_H, PIRATE_W, PIRATE_H, FLOOR_H,
} from './constants';

const PORTAL_W = 36;
const PORTAL_H = 56;

// ─── Background ────────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D) {
  // Deep ocean blue gradient
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H - 80);
  grad.addColorStop(0, '#061a52');
  grad.addColorStop(1, '#0d3080');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H - 80);

  // Brick pattern on walls
  ctx.save();
  drawWallBricks(ctx);
  ctx.restore();
}

function drawWallBricks(ctx: CanvasRenderingContext2D) {
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

// ─── Platforms / floors ────────────────────────────────────────────────────────

function drawPlatforms(ctx: CanvasRenderingContext2D, platforms: Platform[]) {
  for (const p of platforms) {
    if (p.isGround === false) {
      // side wall
      const wallGrad = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
      wallGrad.addColorStop(0, '#1a2060');
      wallGrad.addColorStop(0.5, '#2a3080');
      wallGrad.addColorStop(1, '#1a2060');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      continue;
    }

    // Stone floor plank
    const floorGrad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    floorGrad.addColorStop(0, '#9a8460');
    floorGrad.addColorStop(0.4, '#7a6440');
    floorGrad.addColorStop(1, '#5a4420');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(p.x, p.y, p.w, p.h);

    // Plank lines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let px = p.x + 64; px < p.x + p.w; px += 64) {
      ctx.beginPath();
      ctx.moveTo(px, p.y);
      ctx.lineTo(px, p.y + p.h);
      ctx.stroke();
    }

    // Highlight top edge
    ctx.strokeStyle = 'rgba(255,220,140,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 1);
    ctx.lineTo(p.x + p.w, p.y + 1);
    ctx.stroke();

    // Shadow bottom edge
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + p.h - 1);
    ctx.lineTo(p.x + p.w, p.y + p.h - 1);
    ctx.stroke();
  }
}

// ─── Ladders ──────────────────────────────────────────────────────────────────

function drawLadder(ctx: CanvasRenderingContext2D, ladder: Ladder) {
  const lw = 18;
  const railX1 = ladder.x - lw / 2 + 3;
  const railX2 = ladder.x + lw / 2 - 3;
  const top = ladder.y;
  const bottom = ladder.y + ladder.h;

  // Rung shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 4;
  for (let ry = top + 10; ry < bottom; ry += 14) {
    ctx.beginPath();
    ctx.moveTo(railX1 + 1, ry + 2);
    ctx.lineTo(railX2 + 1, ry + 2);
    ctx.stroke();
  }

  // Rails
  const railGrad = ctx.createLinearGradient(railX1, 0, railX2, 0);
  railGrad.addColorStop(0, '#8B6200');
  railGrad.addColorStop(0.4, '#daa520');
  railGrad.addColorStop(1, '#8B6200');
  ctx.strokeStyle = railGrad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(railX1, top);
  ctx.lineTo(railX1, bottom);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(railX2, top);
  ctx.lineTo(railX2, bottom);
  ctx.stroke();

  // Rungs
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  for (let ry = top + 10; ry < bottom; ry += 14) {
    ctx.beginPath();
    ctx.moveTo(railX1, ry);
    ctx.lineTo(railX2, ry);
    ctx.stroke();
  }

  // Rung highlights
  ctx.strokeStyle = 'rgba(255,255,220,0.6)';
  ctx.lineWidth = 1;
  for (let ry = top + 10; ry < bottom; ry += 14) {
    ctx.beginPath();
    ctx.moveTo(railX1, ry - 1);
    ctx.lineTo(railX2, ry - 1);
    ctx.stroke();
  }
}

// Draws a down-arrow on the floor surface to hint "you can descend here"
function drawLadderTopMarker(ctx: CanvasRenderingContext2D, ladder: Ladder) {
  ctx.save();
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  const ax = ladder.x;
  const ay = ladder.y + FLOOR_H / 2; // centred vertically in the floor plank
  ctx.moveTo(ax - 6, ay - 5);
  ctx.lineTo(ax + 6, ay - 5);
  ctx.lineTo(ax,     ay + 4);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─── Door (thin vertical barrier with number) ─────────────────────────────────

const DOOR_COLORS: Record<number, string> = {
  1:  '#00e5ff', 2:  '#ff40a0', 3:  '#ffee00',
  4:  '#44ff44', 5:  '#ff6600', 6:  '#ffffff',
  7:  '#aa44ff', 8:  '#ff2222', 9:  '#00ffcc',
  10: '#ff88ff', 11: '#88ff44', 12: '#ffaa00',
};

function drawDoor(ctx: CanvasRenderingContext2D, door: Door) {
  if (door.open) return;

  const cx = door.x;
  const top = door.y;
  const bot = door.y + door.h;
  const color = DOOR_COLORS[door.number] ?? '#ffffff';
  // Two bars, each 4px wide, with a 4px gap between them
  const bw = 4;
  const gap = 4;
  const lx = cx - gap / 2 - bw; // left bar left edge
  const rx = cx + gap / 2;       // right bar left edge

  ctx.save();

  // Left bar
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(lx, top, bw, door.h);
  ctx.fillStyle = color;
  ctx.fillRect(lx + 1, top, bw - 2, door.h);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(lx + 1, top, 1, door.h);

  // Right bar
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(rx, top, bw, door.h);
  ctx.fillStyle = color;
  ctx.fillRect(rx + 1, top, bw - 2, door.h);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(rx + 1, top, 1, door.h);

  // Cap lines top & bottom spanning both bars
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lx, top); ctx.lineTo(rx + bw, top);
  ctx.moveTo(lx, bot); ctx.lineTo(rx + bw, bot);
  ctx.stroke();

  // Handles near the bottom — small horizontal knobs protruding outward from each bar
  const hy = bot - PLAYER_H / 2 - 20; // handle vertical center, half a player height up from bottom, raised 20px
  const handleLen = 6;             // how far the handle sticks out
  const handleH = 4;               // handle thickness
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  // Left bar handle (points left)
  ctx.fillRect(lx - handleLen, hy - handleH / 2, handleLen, handleH);
  ctx.strokeRect(lx - handleLen, hy - handleH / 2, handleLen, handleH);
  // Right bar handle (points right)
  ctx.fillRect(rx + bw, hy - handleH / 2, handleLen, handleH);
  ctx.strokeRect(rx + bw, hy - handleH / 2, handleLen, handleH);
  // Knob tips (highlight)
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(lx - handleLen, hy - handleH / 2, 1, handleH);
  ctx.fillRect(rx + bw + handleLen - 1, hy - handleH / 2, 1, handleH);

  // Number badge
  const labelY = Math.max(top + 16, 16);
  const numStr = String(door.number);
  const badgeW = door.number >= 10 ? 28 : 22;
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

// ─── Portal (large green door — exit to next level) ───────────────────────────

function drawPortal(ctx: CanvasRenderingContext2D, portal: Portal, time: number) {
  const w = PORTAL_W * 1.25;
  const h = PORTAL_H * 1.25;
  // Grow in place: keep the base on the ground and center over the footprint.
  const x = portal.x - (w - PORTAL_W) / 2;
  const y = portal.y - (h - PORTAL_H);
  const pulse = Math.sin(time * 0.06) * 0.15 + 0.85;

  ctx.save();

  // Frame shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  // Body
  const bodyGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  bodyGrad.addColorStop(0, '#0a3a0a');
  bodyGrad.addColorStop(0.3, '#1a8a1a');
  bodyGrad.addColorStop(0.6, '#228B22');
  bodyGrad.addColorStop(1, '#0a3a0a');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, [6, 6, 0, 0]);
  ctx.fill();

  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // Panels
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 4, y + 6,      w / 2 - 6, h / 2 - 10);
  ctx.fillRect(x + w / 2 + 2, y + 6, w / 2 - 6, h / 2 - 10);
  ctx.fillRect(x + 4, y + h / 2 + 2, w / 2 - 6, h / 2 - 8);
  ctx.fillRect(x + w / 2 + 2, y + h / 2 + 2, w / 2 - 6, h / 2 - 8);

  // Panel shine
  ctx.fillStyle = 'rgba(100,255,100,0.15)';
  ctx.fillRect(x + 4, y + 6, w / 2 - 6, 3);
  ctx.fillRect(x + w / 2 + 2, y + 6, w / 2 - 6, 3);

  // Pulsing border
  ctx.shadowColor = `rgba(50,255,80,${pulse})`;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = `rgba(50,205,50,${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, [6, 6, 0, 0]);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // "EXIT" label at the top
  ctx.fillStyle = `rgba(180,255,180,${pulse})`;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('EXIT', x + w / 2, y + 4);

  // Portal shimmer inside
  ctx.globalAlpha = (pulse - 0.7) * 0.6;
  ctx.fillStyle = '#00ff44';
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 3, w - 6, h - 6, [4, 4, 0, 0]);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

function drawKey(ctx: CanvasRenderingContext2D, key: Key, time: number) {
  if (key.collected) return;
  const bob = Math.sin((time * 0.05 + key.bobTimer) * 0.25) * 3;
  const kx = key.x;
  const ky = key.y + bob;

  ctx.save();
  ctx.translate(kx, ky);

  // Glow
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 14;

  // Key ring
  const ringGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 8);
  ringGrad.addColorStop(0, '#ffe066');
  ringGrad.addColorStop(0.5, '#ffd700');
  ringGrad.addColorStop(1, '#b8860b');
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.stroke();

  // Key shaft
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(18, 0);
  ctx.stroke();

  // Key teeth
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(12, 0); ctx.lineTo(12, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.lineTo(16, 5);
  ctx.stroke();

  // Number — dark outline for visibility, gold fill
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

// ─── Treasure ─────────────────────────────────────────────────────────────────

function drawTreasure(ctx: CanvasRenderingContext2D, t: Treasure, time: number) {
  if (t.collected) return;
  const bob = Math.sin((time * 0.04 + t.bobTimer) * 0.35) * 3;
  const tx = t.x;
  const ty = t.y + bob;

  ctx.save();
  ctx.translate(tx, ty);
  ctx.shadowColor = '#ff4400';
  ctx.shadowBlur = 16;

  // Chest body
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(-14, -8, 28, 18);

  // Chest lid
  const lidGrad = ctx.createLinearGradient(-14, -16, 14, -8);
  lidGrad.addColorStop(0, '#cd853f');
  lidGrad.addColorStop(0.5, '#daa520');
  lidGrad.addColorStop(1, '#8B4513');
  ctx.fillStyle = lidGrad;
  ctx.fillRect(-14, -16, 28, 8);

  // Straps
  ctx.fillStyle = '#daa520';
  ctx.fillRect(-14, -4, 28, 3);
  ctx.fillRect(-2, -16, 4, 26);

  // Lock
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(0, -4, 4, 0, Math.PI * 2);
  ctx.fill();

  // Gems spilling out (decorative)
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

// ─── Player ───────────────────────────────────────────────────────────────────

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, time: number) {
  if (player.dead) return;
  ctx.save();
  ctx.translate(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2);

  if (!player.facingRight) ctx.scale(-1, 1);

  const blink = player.invincible > 0 && Math.floor(time / 4) % 2 === 0;
  if (blink) {
    ctx.restore();
    return;
  }

  const walkOffset = player.onLadder ? 0 : Math.sin(player.animTimer * 0.25) * 3;
  const legSwing = player.onGround && Math.abs(player.vx) > 0.1
    ? Math.sin(player.animTimer * 0.25) * 0.4
    : 0;

  const hw = PLAYER_W / 2;
  const hh = PLAYER_H / 2;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Legs
  ctx.save();
  ctx.rotate(legSwing);
  ctx.fillStyle = '#1565C0';
  ctx.beginPath();
  ctx.roundRect(-hw + 2, hh - 12, 8, 14, 3);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(-legSwing);
  ctx.fillStyle = '#1565C0';
  ctx.beginPath();
  ctx.roundRect(hw - 10, hh - 12, 8, 14, 3);
  ctx.fill();
  ctx.restore();

  // Boots
  ctx.fillStyle = '#4a3000';
  ctx.fillRect(-hw + 1, hh, 10, 4);
  ctx.fillRect(hw - 11, hh, 10, 4);

  // Body
  ctx.shadowBlur = 0;
  const bodyGrad = ctx.createLinearGradient(-hw, -hh + 4, hw, hh - 10);
  bodyGrad.addColorStop(0, '#42a5f5');
  bodyGrad.addColorStop(0.4, '#1e90ff');
  bodyGrad.addColorStop(1, '#0d47a1');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-hw + 2, -hh + 6, PLAYER_W - 4, PLAYER_H - 18, 4);
  ctx.fill();

  // Belt
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(-hw + 2, hh - 16, PLAYER_W - 4, 3);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(-3, hh - 17, 6, 5);

  // Arms
  const armSwing = player.onGround ? -walkOffset * 0.15 : 0;
  ctx.fillStyle = '#1976D2';
  ctx.save();
  ctx.translate(-hw - 2, -hh + 10);
  ctx.rotate(-0.3 + armSwing);
  ctx.beginPath();
  ctx.roundRect(-3, 0, 7, 14, 3);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(hw - 4, -hh + 10);
  ctx.rotate(0.3 - armSwing);
  ctx.beginPath();
  ctx.roundRect(-4, 0, 7, 14, 3);
  ctx.fill();
  ctx.restore();

  // Neck
  ctx.fillStyle = '#e8b090';
  ctx.fillRect(-4, -hh + 2, 8, 6);

  // Head
  const headGrad = ctx.createRadialGradient(-2, -hh - 6, 2, 0, -hh - 4, 10);
  headGrad.addColorStop(0, '#ffe0c0');
  headGrad.addColorStop(0.7, '#ffb880');
  headGrad.addColorStop(1, '#cc8040');
  ctx.fillStyle = headGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.ellipse(0, -hh - 4, 9, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hat (bandana style)
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#cc2200';
  ctx.fillRect(-9, -hh - 14, 18, 5);
  ctx.fillStyle = '#ff3311';
  ctx.fillRect(-9, -hh - 14, 18, 3);

  // Eyes
  ctx.fillStyle = '#1a0a00';
  ctx.beginPath();
  ctx.ellipse(-3, -hh - 4, 2, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3, -hh - 4, 2, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-2.5, -hh - 5, 0.8, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3.5, -hh - 5, 0.8, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -hh - 1, 4, 0.1, Math.PI - 0.1);
  ctx.stroke();

  ctx.restore();
}

// ─── Pirate ───────────────────────────────────────────────────────────────────

function drawPirate(ctx: CanvasRenderingContext2D, pirate: Pirate, _time: number) {
  ctx.save();
  ctx.translate(pirate.x + PIRATE_W / 2, pirate.y + PIRATE_H / 2);
  if (!pirate.facingRight) ctx.scale(-1, 1);

  const hw = PIRATE_W / 2;
  const hh = PIRATE_H / 2;
  const walkOffset = Math.sin(pirate.animTimer * 0.2) * 3;
  const legSwing = Math.sin(pirate.animTimer * 0.2) * 0.45;

  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Legs
  ctx.save();
  ctx.rotate(legSwing);
  ctx.fillStyle = '#5a4020';
  ctx.beginPath();
  ctx.roundRect(-hw + 2, hh - 12, 8, 14, 3);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(-legSwing);
  ctx.fillStyle = '#5a4020';
  ctx.beginPath();
  ctx.roundRect(hw - 10, hh - 12, 8, 14, 3);
  ctx.fill();
  ctx.restore();

  // Peg leg
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(-hw + 1, hh + 1, 4, 3);

  // Body
  ctx.shadowBlur = 0;
  const bodyGrad = ctx.createLinearGradient(-hw, -hh + 4, hw, hh - 10);
  bodyGrad.addColorStop(0, '#cc2200');
  bodyGrad.addColorStop(0.5, '#aa1800');
  bodyGrad.addColorStop(1, '#7a0a00');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-hw + 2, -hh + 6, PIRATE_W - 4, PIRATE_H - 18, 4);
  ctx.fill();

  // Stripes
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let si = 0; si < 3; si++) {
    ctx.fillRect(-hw + 2, -hh + 8 + si * 5, PIRATE_W - 4, 2);
  }

  // Belt
  ctx.fillStyle = '#3a2a00';
  ctx.fillRect(-hw + 2, hh - 16, PIRATE_W - 4, 3);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(-3, hh - 18, 6, 6);

  // Sword arm
  ctx.fillStyle = '#aa1800';
  ctx.save();
  ctx.translate(hw - 2, -hh + 12);
  ctx.rotate(0.4 + walkOffset * 0.05);
  ctx.beginPath();
  ctx.roundRect(-3, 0, 7, 13, 2);
  ctx.fill();
  // Sword
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(2, 13);
  ctx.lineTo(6, 34);
  ctx.stroke();
  // Crossguard
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-2, 14);
  ctx.lineTo(6, 14);
  ctx.stroke();
  ctx.restore();

  // Other arm
  ctx.fillStyle = '#aa1800';
  ctx.save();
  ctx.translate(-hw - 2, -hh + 10);
  ctx.rotate(-0.3 - walkOffset * 0.05);
  ctx.beginPath();
  ctx.roundRect(-4, 0, 7, 12, 2);
  ctx.fill();
  ctx.restore();

  // Neck
  ctx.fillStyle = '#d0a080';
  ctx.fillRect(-4, -hh + 2, 8, 6);

  // Skull head
  const headGrad = ctx.createRadialGradient(-2, -hh - 6, 2, 0, -hh - 4, 11);
  headGrad.addColorStop(0, '#f0e8d0');
  headGrad.addColorStop(0.7, '#d4c0a0');
  headGrad.addColorStop(1, '#a08060');
  ctx.fillStyle = headGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.ellipse(0, -hh - 4, 9, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Pirate hat
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(-12, -hh - 12);
  ctx.lineTo(12, -hh - 12);
  ctx.lineTo(9, -hh - 22);
  ctx.lineTo(-9, -hh - 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-14, -hh - 14, 28, 4);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -hh - 17, 4, 0, Math.PI * 2);
  ctx.fill();
  // Skull crossbones on hat
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(0, -hh - 17, 2, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#1a0a00';
  ctx.beginPath();
  ctx.ellipse(-3, -hh - 4, 2, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3, -hh - 4, 2, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-2.5, -hh - 5, 0.8, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3.5, -hh - 5, 0.8, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Scar
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(2, -hh - 8);
  ctx.lineTo(5, -hh - 2);
  ctx.stroke();

  ctx.restore();
}

// ─── Particles ────────────────────────────────────────────────────────────────

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  const hudY = CANVAS_H - 78;
  const hudH = 78;

  // HUD background
  const hudGrad = ctx.createLinearGradient(0, hudY, 0, CANVAS_H);
  hudGrad.addColorStop(0, '#0a1840');
  hudGrad.addColorStop(1, '#050e28');
  ctx.fillStyle = hudGrad;
  ctx.fillRect(0, hudY, CANVAS_W, hudH);

  // HUD top border
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, hudY);
  ctx.lineTo(CANVAS_W, hudY);
  ctx.stroke();

  // Lives — blue guy icons
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CREW:', 20, hudY + 20);
  for (let i = 0; i < state.lives; i++) {
    drawMiniPlayer(ctx, 90 + i * 26, hudY + 20);
  }

  // Key collection status — two rows of 4
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('KEYS:', 20, hudY + 46);
  for (let i = 0; i < 8; i++) {
    const kn = i + 1;
    const has = state.collectedKeys.has(kn);
    const col = i % 4;
    const row = Math.floor(i / 4);
    const kx = 90 + col * 26;
    const ky = hudY + 38 + row * 20;
    ctx.textAlign = 'center';
    ctx.fillStyle = has ? DOOR_COLORS[kn] ?? '#ffd700' : 'rgba(255,255,255,0.2)';
    ctx.fillText(`${kn}`, kx, ky);
  }
  ctx.textAlign = 'left';

  // Score
  ctx.fillStyle = '#00ff88';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 8;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`BOOTY  ${String(state.score).padStart(5, '0')}`, CANVAS_W / 2, hudY + 22);
  ctx.shadowBlur = 0;

  // Treasure
  ctx.fillStyle = '#ff8800';
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 8;
  ctx.fillText(`TREASURE  ${state.treasureCount}`, CANVAS_W / 2, hudY + 50);
  ctx.shadowBlur = 0;

  // Controls hint
  ctx.fillStyle = 'rgba(180,200,255,0.4)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('← → move   ↑↓ ladder   SPACE jump', CANVAS_W - 20, hudY + 22);
  ctx.fillText('Keys open barriers · ↓ to enter portal', CANVAS_W - 20, hudY + 42);
  ctx.fillText('Avoid pirates!', CANVAS_W - 20, hudY + 62);
}

function drawMiniPlayer(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#1e90ff';
  ctx.fillRect(x - 5, y - 8, 10, 12);
  ctx.fillStyle = '#ffe0b0';
  ctx.beginPath();
  ctx.arc(x, y - 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cc2200';
  ctx.fillRect(x - 5, y - 18, 10, 3);
}

// ─── Overlays ─────────────────────────────────────────────────────────────────

function drawGameOver(ctx: CanvasRenderingContext2D) {
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

function drawLevelComplete(ctx: CanvasRenderingContext2D, score: number) {
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

// ─── Master render ────────────────────────────────────────────────────────────

export function render(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  drawBackground(ctx);

  for (const ladder of state.ladders) drawLadder(ctx, ladder);
  drawPlatforms(ctx, state.platforms);
  for (const ladder of state.ladders) drawLadderTopMarker(ctx, ladder);
  for (const portal of state.portals) drawPortal(ctx, portal, time);
  for (const door of state.doors) drawDoor(ctx, door);
  for (const key of state.keys) drawKey(ctx, key, time);
  for (const treasure of state.treasures) drawTreasure(ctx, treasure, time);

  for (const pirate of state.pirates) drawPirate(ctx, pirate, time);
  drawPlayer(ctx, state.player, time);

  drawParticles(ctx, state.particles);
  drawHUD(ctx, state);

  if (state.gameOver) drawGameOver(ctx);
  if (state.levelComplete) drawLevelComplete(ctx, state.score);
}
