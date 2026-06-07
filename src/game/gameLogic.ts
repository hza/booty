import type {
  GameState, Platform, Ladder, InputState
} from './types';
import {
  GRAVITY, PLAYER_SPEED, LADDER_SPEED, PIRATE_SPEED,
  PLAYER_W, PLAYER_H, PIRATE_W, PIRATE_H, KEY_W, KEY_H,
  FLOOR_Y, FLOOR_H, CANVAS_W, CANVAS_H
} from './constants';
import {
  buildPlatforms, buildLadders, buildKeys, buildDoors, buildPortals, buildPirates, buildTreasures
} from './level';

const PORTAL_W = 36;
const PORTAL_H = 56;
const DOOR_BAR_W = 8; // collision half-width for door barriers

// ─── Collision helpers ────────────────────────────────────────────────────────

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function onPlatform(
  px: number, py: number, pw: number, ph: number,
  platforms: Platform[]
): { hit: boolean; topY: number } {
  let topY = Infinity;
  let hit = false;
  for (const p of platforms) {
    if (p.isGround === false) continue; // side walls, skip vertical resolution
    if (rectsOverlap(px, py + ph - 4, pw, 8, p.x, p.y, p.w, p.h)) {
      if (p.y < topY) {
        topY = p.y;
        hit = true;
      }
    }
  }
  return { hit, topY };
}

// Returns a ladder the player is horizontally aligned with and vertically near.
// Uses generous vertical tolerance so the player can grab from either end.
function onLadderCheck(
  px: number, py: number, pw: number, ph: number,
  ladders: Ladder[]
): Ladder | null {
  const cx = px + pw / 2;
  for (const l of ladders) {
    const withinX = cx >= l.x - 14 && cx <= l.x + 14;
    const withinY = py + ph > l.y - 2 && py < l.y + l.h + 2;
    if (withinX && withinY) return l;
  }
  return null;
}

function clampToWalls(px: number, pw: number): number {
  const wallW = 16;
  if (px < wallW) return wallW;
  if (px + pw > CANVAS_W - wallW) return CANVAS_W - wallW - pw;
  return px;
}

// ─── Particle factory ─────────────────────────────────────────────────────────

function spawnParticles(
  state: GameState,
  x: number, y: number,
  color: string,
  count: number,
  speed: number
) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const spd = speed * (0.5 + Math.random() * 0.8);
    state.particles.push({
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

// ─── Init / reset ─────────────────────────────────────────────────────────────

export function initState(): GameState {
  const ladders = buildLadders();
  const portals = buildPortals();
  const doors = buildDoors(portals);
  return {
    player: {
      x: 300, y: FLOOR_Y[0] - PLAYER_H,
      vx: 0, vy: 0,
      onGround: false, onLadder: false,
      facingRight: true,
      animFrame: 0, animTimer: 0,
      invincible: 0, dead: false,
    },
    pirates: buildPirates(),
    doors,
    portals,
    keys: buildKeys(doors, portals),
    platforms: buildPlatforms(),
    ladders,
    treasures: buildTreasures(),
    collectedKeys: new Set(),
    openedDoors: new Set(),
    score: 0,
    treasureCount: 0,
    lives: 3,
    gameOver: false,
    levelComplete: false,
    deathTimer: 0,
    levelTimer: 0,
    camera: { x: 0, y: 0 },
    particles: [],
  };
}

export function resetLevel(state: GameState) {
  state.player = {
    x: 300, y: FLOOR_Y[0] - PLAYER_H,
    vx: 0, vy: 0,
    onGround: false, onLadder: false,
    facingRight: true,
    animFrame: 0, animTimer: 0,
    invincible: 120, dead: false,
  };
  state.ladders = buildLadders();
  const portals = buildPortals();
  const doors = buildDoors(portals);
  state.pirates = buildPirates();
  state.doors = doors;
  state.portals = portals;
  state.keys = buildKeys(doors, portals);
  state.treasures = buildTreasures();
  state.collectedKeys = new Set();
  state.openedDoors = new Set();
  state.particles = [];
  state.deathTimer = 0;
  state.levelComplete = false;
  state.levelTimer = 0;
}

// ─── Main update ──────────────────────────────────────────────────────────────

export function update(state: GameState, input: InputState): void {
  if (state.gameOver) return;

  // Level complete — animate briefly then auto-advance
  if (state.levelComplete) {
    updateParticles(state);
    state.levelTimer--;
    if (state.levelTimer <= 0) {
      const score = state.score;
      const lives = state.lives;
      resetLevel(state);
      state.score = score + 200;
      state.lives = lives;
    }
    return;
  }

  updateParticles(state);
  updatePlayer(state, input);
  updatePirates(state);
  updateKeys(state);
  updatePortals(state, input);
  updateTreasures(state);
  checkDeathTimer(state);
}

// ─── Player update ────────────────────────────────────────────────────────────

function updatePlayer(state: GameState, input: InputState) {
  const { player, platforms, ladders } = state;
  if (player.dead) return;

  if (player.invincible > 0) player.invincible--;

  // Find ladder
  const ladder = onLadderCheck(player.x, player.y, PLAYER_W, PLAYER_H, ladders);

  // ── Ladder mode ──
  if (player.onLadder && ladder) {
    player.vx = 0;
    player.vy = 0;
    if (input.up)   player.vy = -LADDER_SPEED;
    if (input.down) player.vy =  LADDER_SPEED;

    // Snap X to ladder centre while climbing
    player.x += (ladder.x - PLAYER_W / 2 - player.x) * 0.25;
    player.y += player.vy;
    player.x = clampToWalls(player.x, PLAYER_W);

    const ladderTop    = ladder.y;               // upper floor surface
    const ladderBottom = ladder.y + ladder.h;    // lower floor surface

    // Arrived at top floor — step off
    if (player.vy <= 0 && player.y + PLAYER_H <= ladderTop + 6) {
      player.y = ladderTop - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
      player.onLadder = false;
      player.animTimer++;
      return;
    }

    // Arrived at bottom floor — step off
    if (player.vy >= 0 && player.y + PLAYER_H >= ladderBottom - 2) {
      player.y = ladderBottom - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
      player.onLadder = false;
      player.animTimer++;
      return;
    }

    // Jump off ladder
    if (input.jump) {
      player.onLadder = false;
      player.vy = -9;
    }

    player.animTimer++;
    return;
  }

  // ── Grab ladder ──
  if (ladder) {
    const feet       = player.y + PLAYER_H;
    const ladderTop  = ladder.y;
    const ladderBot  = ladder.y + ladder.h;

    // Grab going UP: player is on the lower floor (feet near ladderBottom)
    const atBottom = Math.abs(feet - ladderBot) <= 10;
    // Grab going DOWN: player is on the upper floor (feet near ladderTop)
    const atTop    = Math.abs(feet - ladderTop) <= 10;

    if ((input.up && atBottom) || (input.down && atTop)) {
      player.onLadder = true;
      player.vy = 0;
      player.vx = 0;
      // Snap X immediately so the player centres on the ladder
      player.x = ladder.x - PLAYER_W / 2;
      player.animTimer++;
      return;
    }
  }

  // ── Normal movement ──
  player.onLadder = false;

  if (input.left) {
    player.vx = -PLAYER_SPEED;
    player.facingRight = false;
  } else if (input.right) {
    player.vx = PLAYER_SPEED;
    player.facingRight = true;
  } else {
    player.vx *= 0.75; // friction
    if (Math.abs(player.vx) < 0.2) player.vx = 0;
  }

  if (input.jump && player.onGround) {
    player.vy = -10;
    player.onGround = false;
    spawnParticles(state, player.x + PLAYER_W / 2, player.y + PLAYER_H, '#88aaff', 6, 2);
  }

  // Gravity
  player.vy += GRAVITY;
  if (player.vy > 16) player.vy = 16;

  // Move X
  player.x += player.vx;
  player.x = clampToWalls(player.x, PLAYER_W);

  // Door barrier collision — open with key on touch, otherwise block
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
        spawnParticles(state, door.x, door.y + door.h / 2, '#00ff88', 14, 4);
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

  // Move Y
  player.y += player.vy;

  // Platform collision (only downward)
  player.onGround = false;
  if (player.vy >= 0) {
    const { hit, topY } = onPlatform(player.x, player.y, PLAYER_W, PLAYER_H, platforms);
    if (hit && player.y + PLAYER_H > topY && player.y + PLAYER_H < topY + FLOOR_H + player.vy + 2) {
      player.y = topY - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
    }
  }

  // Ceiling collision (upward)
  if (player.vy < 0) {
    for (const p of platforms) {
      if (p.isGround === false) continue;
      if (rectsOverlap(player.x, player.y, PLAYER_W, 4, p.x, p.y, p.w, p.h)) {
        player.y = p.y + p.h;
        player.vy = 0;
      }
    }
  }

  // Fall off screen
  if (player.y > CANVAS_H + 40) {
    killPlayer(state);
    return;
  }

  player.animTimer++;
}

function killPlayer(state: GameState) {
  const p = state.player;
  if (p.invincible > 0 || p.dead) return;

  spawnParticles(state, p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, '#1e90ff', 16, 5);
  p.dead = true;
  state.lives--;
  state.deathTimer = 90;
}

function checkDeathTimer(state: GameState) {
  if (!state.player.dead) return;
  state.deathTimer--;
  if (state.deathTimer <= 0) {
    if (state.lives <= 0) {
      state.gameOver = true;
    } else {
      resetLevel(state);
    }
  }
}

// ─── Pirate update ────────────────────────────────────────────────────────────

function updatePirates(state: GameState) {
  const { player } = state;

  for (const pirate of state.pirates) {
    pirate.x += pirate.vx * PIRATE_SPEED / 1.4;
    pirate.animTimer++;

    // Door barrier collision — reverse patrol direction at closed doors
    for (const door of state.doors) {
      if (door.open) continue;
      if (pirate.y + PIRATE_H <= door.y || pirate.y >= door.y + door.h) continue;
      const half = DOOR_BAR_W / 2;
      const pLeft = pirate.x;
      const pRight = pirate.x + PIRATE_W;
      const dLeft = door.x - half;
      const dRight = door.x + half;
      if (pRight > dLeft && pLeft < dRight) {
        const pirateCx = pirate.x + PIRATE_W / 2;
        if (pirateCx < door.x) {
          pirate.x = dLeft - PIRATE_W;
          pirate.vx = -Math.abs(pirate.vx);
          pirate.facingRight = false;
        } else {
          pirate.x = dRight;
          pirate.vx = Math.abs(pirate.vx);
          pirate.facingRight = true;
        }
      }
    }

    if (pirate.x <= pirate.patrolLeft) {
      pirate.x = pirate.patrolLeft;
      pirate.vx = Math.abs(pirate.vx);
      pirate.facingRight = true;
    } else if (pirate.x + PIRATE_W >= pirate.patrolRight) {
      pirate.x = pirate.patrolRight - PIRATE_W;
      pirate.vx = -Math.abs(pirate.vx);
      pirate.facingRight = false;
    }

    // Collision with player
    if (!player.dead && player.invincible === 0) {
      if (rectsOverlap(
        player.x + 2, player.y + 2, PLAYER_W - 4, PLAYER_H - 4,
        pirate.x + 2, pirate.y + 2, PIRATE_W - 4, PIRATE_H - 4
      )) {
        killPlayer(state);
      }
    }
  }
}

// ─── Key pickup ───────────────────────────────────────────────────────────────

function updateKeys(state: GameState) {
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
      spawnParticles(state, key.x, key.y, '#ffd700', 12, 4);
    }
  }
}

// ─── Portal entry ─────────────────────────────────────────────────────────────

function updatePortals(state: GameState, input: InputState) {
  const { player } = state;
  if (player.dead) return;

  for (const portal of state.portals) {
    const overlaps = rectsOverlap(
      player.x, player.y, PLAYER_W, PLAYER_H,
      portal.x, portal.y, PORTAL_W, PORTAL_H
    );
    // Require pressing Down to enter the portal (like walking through a door)
    if (overlaps && input.down) {
      state.levelComplete = true;
      state.levelTimer = 90; // ~1.5 seconds of celebration before advancing
      spawnParticles(state, portal.x + PORTAL_W / 2, portal.y + PORTAL_H / 2, '#00ff44', 24, 6);
      spawnParticles(state, portal.x + PORTAL_W / 2, portal.y + PORTAL_H / 2, '#ffffff', 16, 4);
    }
  }
}

// ─── Treasure ─────────────────────────────────────────────────────────────────

function updateTreasures(state: GameState) {
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
      spawnParticles(state, t.x, t.y, '#ff4400', 20, 6);
      spawnParticles(state, t.x, t.y, '#ffd700', 20, 5);
    }
  }
}

// ─── Particle update ──────────────────────────────────────────────────────────

function updateParticles(state: GameState) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}
