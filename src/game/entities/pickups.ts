import type { GameState, InputState } from '../types';
import { PLAYER_W, PLAYER_H, KEY_W, KEY_H, PORTAL_W, PORTAL_H } from '../constants';
import { rectsOverlap, spawnParticles } from '../physics';

export function updateKeys(state: GameState): void {
  const { player } = state;
  if (player.dead) return;

  for (const key of state.keys) {
    if (key.collected) continue;
    key.bobTimer++;

    if (rectsOverlap(
      player.x, player.y, PLAYER_W, PLAYER_H,
      key.x - KEY_W / 2, key.y - KEY_H / 2, KEY_W, KEY_H
    )) {
      key.collected = true;
      state.collectedKeys.add(key.number);
      state.score += 50;
      spawnParticles(state.particles, key.x, key.y, '#ffd700', 12, 4);
    }
  }
}

export function updatePortals(state: GameState, input: InputState): void {
  const { player } = state;
  if (player.dead) return;

  if (player.portalCooldown > 0) {
    player.portalCooldown--;
    return;
  }

  // Level exit once all treasures across every room are collected
  const allTreasuresCollected = state.rooms.every(r => r.treasures.every(t => t.collected));

  for (const portal of state.portals) {
    const overlaps = rectsOverlap(
      player.x, player.y, PLAYER_W, PLAYER_H,
      portal.x, portal.y, PORTAL_W, PORTAL_H
    );
    if (!overlaps || !input.down) continue;

    if (allTreasuresCollected) {
      state.levelComplete = true;
      state.levelTimer = 90;
      spawnParticles(state.particles, portal.x + PORTAL_W / 2, portal.y + PORTAL_H / 2, '#00ff44', 24, 6);
      spawnParticles(state.particles, portal.x + PORTAL_W / 2, portal.y + PORTAL_H / 2, '#ffffff', 16, 4);
    } else if (portal.kind === 'room-link' && portal.targetRoomId !== undefined) {
      state.pendingRoomSwitch = { targetRoomId: portal.targetRoomId, portalName: portal.name };
      spawnParticles(state.particles, portal.x + PORTAL_W / 2, portal.y + PORTAL_H / 2, '#44aaff', 14, 4);
      player.portalCooldown = 60;
      player.invincible = 120;
      break;
    }
  }
}

export function updateTreasures(state: GameState): void {
  const { player } = state;
  if (player.dead) return;

  for (const t of state.treasures) {
    if (t.collected) continue;
    t.bobTimer++;

    if (rectsOverlap(
      player.x, player.y, PLAYER_W, PLAYER_H,
      t.x - 14, t.y - 16, 28, 24
    )) {
      t.collected = true;
      state.treasureCount++;
      state.score += 500;
      spawnParticles(state.particles, t.x, t.y, '#ff4400', 20, 6);
      spawnParticles(state.particles, t.x, t.y, '#ffd700', 20, 5);
    }
  }
}

export function updateParticles(state: GameState): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}
