import type { GameState, Room, LevelSnapshot, InputState } from '../types';
import { PLAYER_H, PLAYER_W, PORTAL_W, PORTAL_H, LEVEL_SEED } from '../constants';
import {
  defaultRoomDef,
  buildPlatforms, buildLadders, buildKeys, buildDoors, buildPortals,
  buildPirates, buildTreasures, buildProps, checkSolvable, minDoorsToTreasure,
  makeRng,
} from '../level';
import type { RoomDef } from '../level';
import { updatePlayer } from '../entities/player';
import { updatePirates } from '../entities/pirates';
import { updateKeys, updatePortals, updateTreasures, updateParticles } from '../entities/pickups';

// ─── Level assembly ───────────────────────────────────────────────────────────

function attemptRoom(def: RoomDef, seed: number): { room: Room; minDepth: number } | null {
  const rng = makeRng(seed);
  const { ladders, ctx } = buildLadders(def, rng);
  const portals   = buildPortals(ctx, rng);
  const doors     = buildDoors(portals, ctx, rng);
  const keys      = buildKeys(doors, portals, ctx, rng);
  const treasures = buildTreasures(doors, ctx, rng);
  const spawn     = { floorIndex: def.spawnFloor, x: def.spawnX };

  if (!checkSolvable(doors, keys, ladders, treasures, def.floorYs, spawn)) return null;

  const depths = treasures.map(t => minDoorsToTreasure(t, doors, keys, ladders, def.floorYs, spawn));
  const pirates = buildPirates(doors, def);
  const props   = buildProps(doors, portals, ctx, rng);
  const room: Room = {
    id: def.id,
    floorYs: def.floorYs,
    platforms: buildPlatforms(def),
    ladders, portals, doors, keys, treasures, pirates, props,
    spawnX: def.spawnX,
    spawnFloor: def.spawnFloor,
    collectedKeys: new Set(),
  };
  return { room, minDepth: Math.min(...depths) };
}

function buildSolvableRoom(def: RoomDef, baseSeed: number): Room {
  let best: { room: Room; minDepth: number } | null = null;

  for (let attempt = 0; attempt < 50; attempt++) {
    const result = attemptRoom(def, baseSeed + attempt);
    if (!result) continue;
    if (result.minDepth >= 3) return result.room;
    if (!best || result.minDepth > best.minDepth) best = result;
  }

  return best?.room ?? attemptRoom(def, baseSeed)!.room;
}

function buildRooms(): Room[] {
  const room0 = buildSolvableRoom(defaultRoomDef(0), LEVEL_SEED);
  const room1 = buildSolvableRoom(defaultRoomDef(1), LEVEL_SEED + 1000);

  // Match portal counts between rooms so letters align, then link by name
  const count = Math.min(room0.portals.length, room1.portals.length);
  room0.portals = room0.portals.slice(0, count).map((p, i) => ({
    ...p, name: String.fromCharCode(65 + i), kind: 'room-link' as const, targetRoomId: 1,
  }));
  room1.portals = room1.portals.slice(0, count).map((p, i) => ({
    ...p, name: String.fromCharCode(65 + i), kind: 'room-link' as const, targetRoomId: 0,
  }));

  return [room0, room1];
}

function snapshotRooms(rooms: Room[]): LevelSnapshot {
  return {
    currentRoomId: 0,
    rooms: rooms.map(room => ({
      ...room,
      platforms:    room.platforms.map(p => ({ ...p })),
      ladders:      room.ladders.map(l => ({ ...l })),
      doors:        room.doors.map(d => ({ ...d })),
      keys:         room.keys.map(k => ({ ...k })),
      portals:      room.portals.map(p => ({ ...p })),
      pirates:      room.pirates.map(p => ({ ...p })),
      treasures:    room.treasures.map(t => ({ ...t })),
      props:        room.props.map(p => ({ ...p })),
      collectedKeys: new Set<number>(),
    })),
  };
}

function applyRoom(state: GameState, room: Room): void {
  state.platforms = room.platforms;
  state.ladders   = room.ladders;
  state.doors     = room.doors;
  state.keys      = room.keys;
  state.portals   = room.portals;
  state.pirates   = room.pirates;
  state.treasures = room.treasures;
  state.props     = room.props;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initState(): GameState {
  const rooms = buildRooms();
  const currentRoomId = 0;
  const room = rooms[currentRoomId];
  const initialLevel = snapshotRooms(rooms);

  const state: GameState = {
    player: {
      x: room.spawnX, y: room.floorYs[room.spawnFloor] - PLAYER_H,
      vx: 0, vy: 0,
      onGround: false, onLadder: false, activeLadder: null,
      facingRight: true,
      animFrame: 0, animTimer: 0,
      invincible: 0, dead: false, portalCooldown: 0,
    },
    rooms, currentRoomId,
    pirates: room.pirates,
    doors:   room.doors,
    portals: room.portals,
    keys:    room.keys,
    platforms: room.platforms,
    ladders:   room.ladders,
    treasures: room.treasures,
    props:     room.props,
    initialLevel,
    collectedKeys: new Set(),
    openedDoors: new Set(),
    score: 0,
    treasureCount: 0,
    lives: 5,
    levelNumber: 1,
    gameOver: false,
    levelComplete: false,
    deathTimer: 0,
    levelTimer: 0,
    camera: { x: 0, y: 0 },
    particles: [],
  };

  return state;
}

export function resetLevel(state: GameState, newLevel = false): void {
  if (newLevel) {
    state.levelNumber++;
    const rooms = buildRooms();
    state.rooms        = rooms;
    state.currentRoomId = 0;
    state.initialLevel = snapshotRooms(rooms);
  } else {
    const snap = state.initialLevel;
    state.currentRoomId = snap.currentRoomId;
    state.rooms = snap.rooms.map(room => ({
      ...room,
      platforms:    room.platforms.map(p => ({ ...p })),
      ladders:      room.ladders.map(l => ({ ...l })),
      doors:        room.doors.map(d => ({ ...d })),
      keys:         room.keys.map(k => ({ ...k })),
      portals:      room.portals.map(p => ({ ...p })),
      pirates:      room.pirates.map(p => ({ ...p })),
      treasures:    room.treasures.map(t => ({ ...t })),
      props:        room.props.map(p => ({ ...p })),
      collectedKeys: new Set<number>(),
    }));
  }

  const room = state.rooms[state.currentRoomId];
  applyRoom(state, room);

  state.player = {
    x: room.spawnX, y: room.floorYs[room.spawnFloor] - PLAYER_H,
    vx: 0, vy: 0,
    onGround: false, onLadder: false, activeLadder: null,
    facingRight: true,
    animFrame: 0, animTimer: 0,
    invincible: newLevel ? 0 : 120, dead: false, portalCooldown: 0,
  };

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

  if (state.pendingRoomSwitch) {
    const { targetRoomId, portalName } = state.pendingRoomSwitch;
    state.pendingRoomSwitch = undefined;
    state.rooms[state.currentRoomId].collectedKeys = new Set(state.collectedKeys);
    const targetRoom = state.rooms[targetRoomId];
    state.currentRoomId = targetRoomId;
    state.collectedKeys = new Set(targetRoom.collectedKeys);
    applyRoom(state, targetRoom);
    const dest = targetRoom.portals.find(p => p.name === portalName);
    if (dest) {
      state.player.x = dest.x + (PORTAL_W - PLAYER_W) / 2;
      state.player.y = dest.y + PORTAL_H - PLAYER_H;
    }
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onLadder = false;
    state.player.activeLadder = null;
  }

  updateTreasures(state);
  checkDeathTimer(state);
}
