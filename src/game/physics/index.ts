import type { Platform, Ladder, Particle } from '../types';
import { CANVAS_W } from '../constants';

export function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function onPlatform(
  px: number, py: number, pw: number, ph: number,
  platforms: Platform[]
): { hit: boolean; topY: number } {
  let topY = Infinity;
  let hit = false;
  for (const p of platforms) {
    if (p.isGround === false) continue;
    if (rectsOverlap(px, py + ph - 4, pw, 8, p.x, p.y, p.w, p.h)) {
      if (p.y < topY) { topY = p.y; hit = true; }
    }
  }
  return { hit, topY };
}

// Returns all ladders the player is horizontally and vertically aligned with.
export function nearbyLadders(
  px: number, py: number, pw: number, ph: number,
  ladders: Ladder[]
): Ladder[] {
  const cx = px + pw / 2;
  return ladders.filter(l => {
    const withinX = cx >= l.x - 14 && cx <= l.x + 14;
    const withinY = py + ph > l.y - 2 && py < l.y + l.h + 2;
    return withinX && withinY;
  });
}

export function clampToWalls(px: number, pw: number): number {
  const wallW = 16;
  if (px < wallW) return wallW;
  if (px + pw > CANVAS_W - wallW) return CANVAS_W - wallW - pw;
  return px;
}

export function spawnParticles(
  particles: Particle[],
  x: number, y: number,
  color: string,
  count: number,
  speed: number
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const spd = speed * (0.5 + Math.random() * 0.8);
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 1,
      life: 40 + Math.random() * 20,
      maxLife: 60,
      color,
      size: 3 + Math.random() * 3,
    });
  }
}
