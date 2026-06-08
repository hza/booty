import type { GameState, LevelSnapshot, InputState } from '../types';
import { PLAYER_H, FLOOR_Y } from '../constants';
import {
  buildPlatforms, buildLadders, buildKeys, buildDoors, buildPortals,
  buildPirates, buildTreasures, buildProps, checkSolvable, minDoorsToTreasure,
} from '../level';
import { updatePlayer } from '../entities/player';
import { updatePirates } from '../entities/pirates';
import { updateKeys, updatePortals, updateTreasures, updateParticles } from '../entities/pickups';

// ─── Level assembly ───────────────────────────────────────────────────────────

type LevelElements = {
  ladders: ReturnType<typeof buildLadders>;
  portals: ReturnType<typeof buildPortals>;
  doors:   ReturnType<typeof buildDoors>;
  keys:    ReturnType<typeof buildKeys>;
  treasures: ReturnType<typeof buildTreasures>;
};

function buildLevelElements(): LevelElements {
  let lastSolvable: LevelElements | null = null;

  for (let attempt = 0; attempt < 50; attempt++) {
    const ladders   = buildLadders();
    const portals   = buildPortals();
    const doors     = buildDoors(portals);
    const keys      = buildKeys(doors, portals);
    const treasures = buildTreasures(doors);
    if (checkSolvable(doors, keys, ladders, treasures)) {
      const depths = treasures.map(t => minDoorsToTreasure(t, doors, keys, ladders));
      if (depths.every(d => d >= 3)) return { ladders, portals, doors, keys, treasures };
      const minDepth = Math.min(...depths);
      const bestDepth = lastSolvable
        ? Math.min(...lastSolvable.treasures.map(t => minDoorsToTreasure(t, lastSolvable!.doors, lastSolvable!.keys, lastSolvable!.ladders)))
        : -1;
      if (minDepth > bestDepth) lastSolvable = { ladders, portals, doors, keys, treasures };
    }
  }
  if (lastSolvable) return lastSolvable;
  const ladders   = buildLadders();
  const portals   = buildPortals();
  const doors     = buildDoors(portals);
  const keys      = buildKeys(doors, portals);
  const treasures = buildTreasures(doors);
  return { ladders, portals, doors, keys, treasures };
}

function snapshotLevel(
  pirates:   ReturnType<typeof buildPirates>,
  ladders:   ReturnType<typeof buildLadders>,
  portals:   ReturnType<typeof buildPortals>,
  doors:     ReturnType<typeof buildDoors>,
  keys:      ReturnType<typeof buildKeys>,
  treasures: ReturnType<typeof buildTreasures>,
  props:     ReturnType<typeof buildProps>,
): LevelSnapshot {
  return {
    pirates:   pirates.map(p => ({ ...p })),
    ladders:   ladders.map(l => ({ ...l })),
    portals:   portals.map(p => ({ ...p })),
    doors:     doors.map(d => ({ ...d })),
    keys:      keys.map(k => ({ ...k })),
    treasures: treasures.map(t => ({ ...t })),
    props:     props.map(p => ({ ...p })),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initState(): GameState {
  const { ladders, portals, doors, keys, treasures } = buildLevelElements();
  const pirates = buildPirates(doors);
  const props   = buildProps(doors, portals);
  const initialLevel = snapshotLevel(pirates, ladders, portals, doors, keys, treasures, props);
  return {
    player: {
      x: 300, y: FLOOR_Y[0] - PLAYER_H,
      vx: 0, vy: 0,
      onGround: false, onLadder: false, activeLadder: null,
      facingRight: true,
      animFrame: 0, animTimer: 0,
      invincible: 0, dead: false,
    },
    pirates, doors, portals, keys,
    platforms: buildPlatforms(),
    ladders, treasures, props,
    initialLevel,
    collectedKeys: new Set(),
    openedDoors: new Set(),
    score: 0,
    treasureCount: 0,
    lives: 5,
    gameOver: false,
    levelComplete: false,
    deathTimer: 0,
    levelTimer: 0,
    camera: { x: 0, y: 0 },
    particles: [],
  };
}

export function resetLevel(state: GameState, newLevel = false): void {
  state.player = {
    x: 300, y: FLOOR_Y[0] - PLAYER_H,
    vx: 0, vy: 0,
    onGround: false, onLadder: false, activeLadder: null,
    facingRight: true,
    animFrame: 0, animTimer: 0,
    invincible: 120, dead: false,
  };
  if (newLevel) {
    const { ladders, portals, doors, keys, treasures } = buildLevelElements();
    const pirates = buildPirates(doors);
    const props   = buildProps(doors, portals);
    state.ladders = ladders;
    state.pirates = pirates;
    state.doors   = doors;
    state.portals = portals;
    state.keys    = keys;
    state.treasures = treasures;
    state.props   = props;
    state.initialLevel = snapshotLevel(pirates, ladders, portals, doors, keys, treasures, props);
  } else {
    const s = state.initialLevel;
    state.ladders   = s.ladders.map(l => ({ ...l }));
    state.pirates   = s.pirates.map(p => ({ ...p }));
    state.doors     = s.doors.map(d => ({ ...d }));
    state.portals   = s.portals.map(p => ({ ...p }));
    state.keys      = s.keys.map(k => ({ ...k }));
    state.treasures = s.treasures.map(t => ({ ...t }));
    state.props     = s.props.map(p => ({ ...p }));
  }
  state.collectedKeys = new Set();
  state.openedDoors   = new Set();
  state.particles     = [];
  state.deathTimer    = 0;
  state.levelComplete = false;
  state.levelTimer    = 0;
}

function checkDeathTimer(state: GameState): void {
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

export function update(state: GameState, input: InputState): void {
  if (state.gameOver) return;

  if (state.levelComplete) {
    updateParticles(state);
    state.levelTimer--;
    if (state.levelTimer <= 0) {
      const score = state.score;
      const lives = state.lives;
      resetLevel(state, true);
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
