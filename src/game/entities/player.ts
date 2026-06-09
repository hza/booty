import type { GameState, InputState } from '../types';
import {
  GRAVITY, PLAYER_SPEED, LADDER_SPEED,
  PLAYER_W, PLAYER_H, FLOOR_H, CANVAS_H, DOOR_BAR_W,
} from '../constants';
import { rectsOverlap, onPlatform, nearbyLadders, clampToWalls, spawnParticles } from '../physics';

export function updatePlayer(state: GameState, input: InputState): void {
  const { player, platforms, ladders } = state;
  if (player.dead) return;

  if (player.invincible > 0) player.invincible--;

  // ── Ladder mode ──
  // Use the ladder we actually grabbed — never re-detect by position, or an
  // overlapping adjacent ladder could hijack the climb and dump us off early.
  if (player.onLadder && player.activeLadder) {
    const ladder = player.activeLadder;
    player.vx = 0;
    player.vy = 0;
    if (input.up)   player.vy = -LADDER_SPEED;
    if (input.down) player.vy =  LADDER_SPEED;

    player.x += (ladder.x - PLAYER_W / 2 - player.x) * 0.25;
    player.y += player.vy;
    player.x = clampToWalls(player.x, PLAYER_W);

    const ladderTop    = ladder.y;
    const ladderBottom = ladder.y + ladder.h;

    if (player.vy <= 0 && player.y + PLAYER_H <= ladderTop + 6) {
      player.y = ladderTop - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
      player.onLadder = false;
      player.activeLadder = null;
      player.animTimer++;
      return;
    }

    if (player.vy >= 0 && player.y + PLAYER_H >= ladderBottom - 2) {
      player.y = ladderBottom - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
      player.onLadder = false;
      player.activeLadder = null;
      player.animTimer++;
      return;
    }

    if (input.jump) {
      player.onLadder = false;
      player.activeLadder = null;
      player.vy = -9;
    }

    player.animTimer++;
    return;
  }

  // ── Grab ladder ──
  // Iterate all nearby ladders so vertically adjacent ladders at similar X
  // don't block each other — pick the first one matching the intended direction.
  for (const l of nearbyLadders(player.x, player.y, PLAYER_W, PLAYER_H, ladders)) {
    const feet     = player.y + PLAYER_H;
    const atBottom = Math.abs(feet - (l.y + l.h)) <= 10;
    const atTop    = Math.abs(feet - l.y) <= 10;

    if ((input.up && atBottom) || (input.down && atTop)) {
      player.onLadder = true;
      player.activeLadder = l;
      player.vy = 0;
      player.vx = 0;
      player.x = l.x - PLAYER_W / 2;
      player.animTimer++;
      return;
    }
  }

  // ── Normal movement ──
  player.onLadder = false;
  player.activeLadder = null;

  if (input.left) {
    player.vx = -PLAYER_SPEED;
    player.facingRight = false;
  } else if (input.right) {
    player.vx = PLAYER_SPEED;
    player.facingRight = true;
  } else {
    player.vx *= 0.75;
    if (Math.abs(player.vx) < 0.2) player.vx = 0;
  }

  if (input.jump && player.onGround) {
    player.vy = -10;
    player.onGround = false;
    spawnParticles(state.particles, player.x + PLAYER_W / 2, player.y + PLAYER_H, '#88aaff', 6, 2);
  }

  player.vy += GRAVITY;
  if (player.vy > 16) player.vy = 16;

  player.x += player.vx;
  player.x = clampToWalls(player.x, PLAYER_W);

  // Door collision — open with key on touch, otherwise block
  for (const door of state.doors) {
    if (door.open) continue;
    if (player.y + PLAYER_H <= door.y || player.y >= door.y + door.h) continue;
    const half = DOOR_BAR_W / 2;
    const pLeft = player.x;
    const pRight = player.x + PLAYER_W;
    const dLeft = door.x - half;
    const dRight = door.x + half;
    if (pRight > dLeft && pLeft < dRight) {
      if (state.collectedKeys.has(door.number)) {
        door.open = true;
        state.openedDoors.add(door.id);
        spawnParticles(state.particles, door.x, door.y + door.h / 2, '#00ff88', 14, 4);
        state.score += 100;
      } else {
        const playerCx = player.x + PLAYER_W / 2;
        if (playerCx < door.x) {
          player.x = dLeft - PLAYER_W;
        } else {
          player.x = dRight;
        }
        player.vx = 0;
      }
    }
  }

  player.y += player.vy;

  player.onGround = false;
  if (player.vy >= 0) {
    const { hit, topY } = onPlatform(player.x, player.y, PLAYER_W, PLAYER_H, platforms);
    if (hit && player.y + PLAYER_H > topY && player.y + PLAYER_H < topY + FLOOR_H + player.vy + 2) {
      player.y = topY - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
    }
  }

  if (player.vy < 0) {
    for (const p of platforms) {
      if (p.isGround === false) continue;
      if (rectsOverlap(player.x, player.y, PLAYER_W, 4, p.x, p.y, p.w, p.h)) {
        player.y = p.y + p.h;
        player.vy = 0;
      }
    }
  }

  if (player.y > CANVAS_H + 40) {
    killPlayer(state);
    return;
  }

  player.animTimer++;
}

export function killPlayer(state: GameState): void {
  const p = state.player;
  if (p.invincible > 0 || p.dead) return;

  spawnParticles(state.particles, p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, '#1e90ff', 16, 5);
  p.dead = true;
  state.lives--;
  state.deathTimer = 90;
}
