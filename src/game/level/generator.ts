import type { Platform, Ladder, Key, Door, Portal, Pirate, Treasure, Prop, PropKind, Room } from '../types';
import { FLOOR_Y, FLOOR_H, CANVAS_W, CANVAS_H, TILE, PORTAL_W, PORTAL_H } from '../constants';

// ─── Room definition & context ────────────────────────────────────────────────

export interface RoomDef {
  id: number;
  floorYs: number[];
  canvasW: number;
  canvasH: number;
  wallLeft: number;
  wallRight: number;
  spawnX: number;
  spawnFloor: number;
}

export interface RoomContext {
  def: RoomDef;
  ceilingYs: number[];
  floorLadderXs: number[][];
}

// Ceiling above each floor's door.  Lower floors use the floor above (+
// its thickness); the top floor mirrors the inter-floor gap so every door
// spans the same height.
export function computeCeilingYs(floorYs: number[]): number[] {
  return floorYs.map((fy, i) => {
    if (i === 0) return fy - (floorYs[1] - floorYs[0] - FLOOR_H);
    return floorYs[i - 1] + FLOOR_H;
  });
}

// Backward-compatible constant for the default 4-floor layout.
export const CEILING_Y = computeCeilingYs(FLOOR_Y);

export function defaultRoomDef(id = 0): RoomDef {
  return {
    id,
    floorYs: [...FLOOR_Y],
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
    wallLeft: 16,
    wallRight: CANVAS_W - 16,
    spawnX: 300,
    spawnFloor: 0,
  };
}

export function doorFloor(door: Door, ceilingYs: number[]): number {
  return ceilingYs.indexOf(door.y);
}

// ─── Placement clearances ────────────────────────────────────────────────────

// Clearances are center-to-center; each accounts for the half-widths of both
// objects plus one full TILE (32 px) of empty space between their edges.
const DOOR_LADDER_CLEAR  = 49;
const KEY_LADDER_CLEAR   = 51;
const PORTAL_LADDER_ZONE = 41;
const DOOR_KEY_CLEAR     = 50;
const DOOR_SEP           = 80;
const KEY_SEP            = 52;
const PORTAL_SEP         = 80;
const PORTAL_DOOR_L      = 40;
const PORTAL_DOOR_R      = 76;
const KEY_PORTAL_L       = 42;
const KEY_PORTAL_R       = 78;

// ─── Utilities ────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Valid-position helpers (use ctx so they're room-aware) ──────────────────

function validDoorXs(fi: number, existing: number[], portalXs: number[], ctx: RoomContext): number[] {
  const lxs = ctx.floorLadderXs[fi];
  const { canvasW } = ctx.def;
  const out: number[] = [];
  for (let x = 70; x <= canvasW - 70; x += 4) {
    if (lxs.every(lx => Math.abs(x - lx) >= DOOR_LADDER_CLEAR) &&
        existing.every(ex => Math.abs(x - ex) >= DOOR_SEP) &&
        portalXs.every(px => x <= px - PORTAL_DOOR_L || x >= px + PORTAL_DOOR_R)) {
      out.push(x);
    }
  }
  return out;
}

function validPortalXs(fi: number, existing: number[], ctx: RoomContext): number[] {
  const lxs = ctx.floorLadderXs[fi];
  const { canvasW } = ctx.def;
  const out: number[] = [];
  for (let x = 20; x <= canvasW - 20 - PORTAL_W; x += 4) {
    const pEnd = x + PORTAL_W;
    const clearOfLadders = lxs.every(lx =>
      pEnd <= lx - PORTAL_LADDER_ZONE || x >= lx + PORTAL_LADDER_ZONE
    );
    const clearOfOthers = existing.every(px => Math.abs(x - px) >= PORTAL_SEP);
    if (clearOfLadders && clearOfOthers) out.push(x);
  }
  return out;
}

function validKeyXs(
  fi: number,
  doorXsOnFloor: number[],
  portalXsOnFloor: number[],
  existingKeyXs: number[],
  ctx: RoomContext,
): number[] {
  const lxs = ctx.floorLadderXs[fi];
  const { canvasW } = ctx.def;
  const out: number[] = [];
  for (let x = 50; x <= canvasW - 50; x += 4) {
    if (lxs.every(lx => Math.abs(x - lx) >= KEY_LADDER_CLEAR) &&
        doorXsOnFloor.every(dx => Math.abs(x - dx) >= DOOR_KEY_CLEAR) &&
        portalXsOnFloor.every(px => x < px - KEY_PORTAL_L || x > px + KEY_PORTAL_R) &&
        existingKeyXs.every(kx => Math.abs(x - kx) >= KEY_SEP)) {
      out.push(x);
    }
  }
  return out;
}

// ─── Platform / Ladder (fixed structural elements) ───────────────────────────

export function buildPlatforms(def: RoomDef): Platform[] {
  const { floorYs, canvasW, canvasH, wallLeft, wallRight } = def;
  const platforms: Platform[] = [];

  for (let fi = 0; fi < floorYs.length; fi++) {
    platforms.push({ x: 0, y: floorYs[fi], w: canvasW, h: FLOOR_H });
  }

  platforms.push({ x: 0,          y: 0, w: wallLeft,           h: canvasH, isGround: false });
  platforms.push({ x: wallRight,   y: 0, w: canvasW - wallRight, h: canvasH, isGround: false });

  return platforms;
}

const LADDER_COL_SEP = 96;
const LADDER_MIN_GAP = LADDER_COL_SEP * 2;

function ladderColumns(canvasW: number): number[] {
  const cols: number[] = [];
  for (let x = 80; x <= canvasW - 80; x += LADDER_COL_SEP) cols.push(x);
  return cols;
}

function pickLadderColumns(canvasW: number, count: number, excludeCols: number[] = []): number[] {
  const available = shuffle(ladderColumns(canvasW).filter(c => !excludeCols.includes(c)));
  const picked: number[] = [];
  for (const c of available) {
    if (picked.length >= count) break;
    if (picked.every(p => Math.abs(p - c) >= LADDER_MIN_GAP)) picked.push(c);
  }
  return picked.sort((a, b) => a - b);
}

export function buildLadders(def: RoomDef): { ladders: Ladder[]; ctx: RoomContext } {
  const { floorYs, canvasW } = def;
  const ceilingYs = computeCeilingYs(floorYs);

  // 2–3 ladders per span; each span avoids the columns of adjacent spans
  const xs01 = pickLadderColumns(canvasW, 2 + Math.floor(Math.random() * 2));
  const xs12 = pickLadderColumns(canvasW, 2 + Math.floor(Math.random() * 2), xs01);
  const xs23 = pickLadderColumns(canvasW, 2 + Math.floor(Math.random() * 2), xs12);

  const floorLadderXs: number[][] = [
    xs01,
    [...xs01, ...xs12],
    [...xs12, ...xs23],
    xs23,
  ];

  const ctx: RoomContext = { def, ceilingYs, floorLadderXs };

  const ladders: Ladder[] = [
    ...xs01.map(x => ({ x, y: floorYs[0], h: floorYs[1] - floorYs[0] })),
    ...xs12.map(x => ({ x, y: floorYs[1], h: floorYs[2] - floorYs[1] })),
    ...xs23.map(x => ({ x, y: floorYs[2], h: floorYs[3] - floorYs[2] })),
  ];

  return { ladders, ctx };
}

// ─── Randomised level elements ────────────────────────────────────────────────

export function buildPortals(ctx: RoomContext): Portal[] {
  const { def } = ctx;
  const { floorYs } = def;
  const count = Math.floor(Math.random() * 3) + 1;
  const floors = shuffle([...Array(floorYs.length).keys()]).slice(0, count);
  const portals: Portal[] = [];

  for (let i = 0; i < floors.length; i++) {
    const fi = floors[i];
    const takenXs = portals.map(p => p.x);
    const candidates = validPortalXs(fi, takenXs, ctx);
    if (candidates.length === 0) continue;
    portals.push({
      id: i,
      x: pickRandom(candidates),
      y: floorYs[fi] - PORTAL_H,
      kind: 'level-exit',
    });
  }

  if (portals.length === 0) {
    portals.push({ id: 0, x: 48, y: floorYs[0] - PORTAL_H, kind: 'level-exit' });
  }

  return portals;
}

export function buildDoors(portals: Portal[], ctx: RoomContext): Door[] {
  const { def, ceilingYs } = ctx;
  const { floorYs } = def;

  const portalXsByFloor: number[][] = floorYs.map(() => []);
  for (const p of portals) {
    for (let fi = 0; fi < floorYs.length; fi++) {
      if (p.y === floorYs[fi] - PORTAL_H) portalXsByFloor[fi].push(p.x);
    }
  }

  const doors: Door[] = [];
  let doorId = 0;
  let doorNum = 1;

  for (let fi = 0; fi < floorYs.length && doors.length < 8; fi++) {
    const want = Math.random() < 0.1 ? 1 : 2;
    const takenXs: number[] = [];

    for (let i = 0; i < want && doors.length < 8; i++) {
      const candidates = validDoorXs(fi, takenXs, portalXsByFloor[fi], ctx);
      if (candidates.length === 0) break;
      const x = pickRandom(candidates);
      takenXs.push(x);
      doors.push({
        id: doorId++,
        number: doorNum++,
        x,
        y: ceilingYs[fi],
        h: floorYs[fi] - ceilingYs[fi],
        open: false,
      });
    }
  }

  return doors;
}

export function buildKeys(doors: Door[], portals: Portal[], ctx: RoomContext): Key[] {
  const { def } = ctx;
  const { floorYs } = def;

  const doorXsByFloor: number[][] = floorYs.map(() => []);
  for (const door of doors) {
    const fi = doorFloor(door, ctx.ceilingYs);
    if (fi >= 0) doorXsByFloor[fi].push(door.x);
  }

  const portalXsByFloor: number[][] = floorYs.map(() => []);
  for (const p of portals) {
    for (let fi = 0; fi < floorYs.length; fi++) {
      if (p.y === floorYs[fi] - PORTAL_H) portalXsByFloor[fi].push(p.x);
    }
  }

  const keyXsByFloor: number[][] = floorYs.map(() => []);
  const keys: Key[] = [];

  for (const door of doors) {
    const df = doorFloor(door, ctx.ceilingYs);
    const floorOrder = shuffle([...Array(floorYs.length).keys()].filter(f => f !== df));
    floorOrder.push(df);

    let placed = false;
    for (const fi of floorOrder) {
      const candidates = validKeyXs(fi, doorXsByFloor[fi], portalXsByFloor[fi], keyXsByFloor[fi], ctx);
      if (candidates.length === 0) continue;
      const x = pickRandom(candidates);
      keyXsByFloor[fi].push(x);
      keys.push({
        id: door.id,
        number: door.number,
        x,
        y: floorYs[fi] - 26,
        collected: false,
        bobTimer: Math.floor(Math.random() * 30),
      });
      placed = true;
      break;
    }

    if (!placed) {
      keys.push({
        id: door.id,
        number: door.number,
        x: 300 + door.id * 50,
        y: floorYs[0] - 26,
        collected: false,
        bobTimer: 0,
      });
    }
  }

  return keys;
}

// ─── Pirates / Treasures ──────────────────────────────────────────────────────

const MIN_PATROL_WIDTH = 160;

export function buildPirates(doors: Door[], def: RoomDef): Pirate[] {
  const { floorYs, wallLeft, wallRight } = def;
  const pirates: Pirate[] = [];
  const animOffsets = [0, 10, 5, 15];
  const animFrameStarts = [0, 2, 1, 0];
  const ceilingYs = computeCeilingYs(floorYs);

  for (let fi = 0; fi < floorYs.length; fi++) {
    const doorXs = doors
      .filter(d => doorFloor(d, ceilingYs) === fi)
      .map(d => d.x)
      .sort((a, b) => a - b);

    const segments: Array<[number, number]> = [];
    let left = wallLeft;
    for (const dx of doorXs) { segments.push([left, dx - 4]); left = dx + 4; }
    segments.push([left, wallRight]);

    const wide = segments
      .filter(([l, r]) => r - l >= MIN_PATROL_WIDTH)
      .sort(([al, ar], [bl, br]) => (br - bl) - (ar - al));

    if (wide.length === 0) continue;

    const [pl, pr] = wide[0];
    const midX = Math.round((pl + pr) / 2);
    const facingRight = fi % 2 === 0;
    pirates.push({
      id: fi,
      x: midX,
      y: floorYs[fi] - 32,
      vx: (facingRight ? 1 : -1) * TILE * 0.045,
      facingRight,
      floorIndex: fi,
      animFrame: animFrameStarts[fi],
      animTimer: animOffsets[fi],
      patrolLeft: pl,
      patrolRight: pr,
    });
  }

  return pirates;
}

// ─── Static decoration ────────────────────────────────────────────────────────

const PROP_KINDS: PropKind[] = ['barrel', 'crate'];
const PROP_HALF = 16;
const PROP_LADDER_CLEAR = 32;
const PROP_DOOR_CLEAR   = 30;
const PROP_SEP          = 40;

export function buildProps(doors: Door[], portals: Portal[], ctx: RoomContext): Prop[] {
  const { def } = ctx;
  const { floorYs } = def;
  const ceilingYs = ctx.ceilingYs;

  const doorXsByFloor: number[][] = floorYs.map(() => []);
  for (const d of doors) {
    const fi = doorFloor(d, ceilingYs);
    if (fi >= 0) doorXsByFloor[fi].push(d.x);
  }
  const portalRangesByFloor: Array<Array<[number, number]>> = floorYs.map(() => []);
  for (const p of portals) {
    for (let fi = 0; fi < floorYs.length; fi++) {
      if (p.y === floorYs[fi] - PORTAL_H) {
        portalRangesByFloor[fi].push([p.x - PROP_HALF, p.x + PORTAL_W + PROP_HALF]);
      }
    }
  }

  const props: Prop[] = [];
  let id = 0;

  for (let fi = 0; fi < floorYs.length; fi++) {
    const lxs = ctx.floorLadderXs[fi];
    const dxs = doorXsByFloor[fi];
    const pRanges = portalRangesByFloor[fi];
    const { canvasW } = def;

    const candidates: number[] = [];
    for (let x = 60; x <= canvasW - 60; x += 4) {
      if (lxs.every(lx => Math.abs(x - lx) >= PROP_LADDER_CLEAR) &&
          dxs.every(dx => Math.abs(x - dx) >= PROP_DOOR_CLEAR) &&
          pRanges.every(([a, b]) => x < a || x > b)) {
        candidates.push(x);
      }
    }

    const want = 2 + Math.floor(Math.random() * 3);
    const takenXs: number[] = [];
    const pool = shuffle(candidates);
    for (const x of pool) {
      if (takenXs.length >= want) break;
      if (takenXs.every(tx => Math.abs(x - tx) >= PROP_SEP)) {
        takenXs.push(x);
        props.push({
          id: id++,
          kind: pickRandom(PROP_KINDS),
          x,
          y: floorYs[fi],
          flip: Math.random() < 0.5,
        });
      }
    }
  }

  return props;
}

export function buildTreasures(doors: Door[], ctx: RoomContext): Treasure[] {
  const { def, ceilingYs } = ctx;
  const { floorYs } = def;

  const doorXsByFloor: number[][] = floorYs.map(() => []);
  for (const d of doors) {
    const fi = doorFloor(d, ceilingYs);
    if (fi >= 0) doorXsByFloor[fi].push(d.x);
  }

  const TREASURE_LADDER_CLEAR = 51;
  const TREASURE_DOOR_CLEAR = 60;
  const TREASURE_SEP = 80;

  const treasures: Treasure[] = [];
  const floorPool = shuffle([0, 1, 2, 2, 3, 3]);
  const usedFloors: number[] = [];
  for (const f of floorPool) {
    if (!usedFloors.includes(f) && usedFloors.length < 2) usedFloors.push(f);
  }
  const takenXs: number[] = [];

  for (let i = 0; i < 2; i++) {
    const fi = usedFloors[i];
    const lxs = ctx.floorLadderXs[fi];
    const dxs = doorXsByFloor[fi];
    const { canvasW } = def;

    const candidates = [];
    for (let x = 60; x <= canvasW - 60; x += 4) {
      if (lxs.every(lx => Math.abs(x - lx) >= TREASURE_LADDER_CLEAR) &&
          dxs.every(dx => Math.abs(x - dx) >= TREASURE_DOOR_CLEAR) &&
          takenXs.every(tx => Math.abs(x - tx) >= TREASURE_SEP)) {
        candidates.push(x);
      }
    }

    let x: number;
    if (candidates.length > 0) {
      x = pickRandom(candidates);
    } else {
      x = 200 + i * 300;
    }
    takenXs.push(x);
    treasures.push({ id: i, x, y: floorYs[fi] - 24, collected: false, bobTimer: i * 12 });
  }

  return treasures;
}

// ─── Room assembly ────────────────────────────────────────────────────────────

export function buildRoom(def: RoomDef): Room {
  const platforms = buildPlatforms(def);
  const { ladders, ctx } = buildLadders(def);
  const portals = buildPortals(ctx);
  const doors = buildDoors(portals, ctx);
  const keys = buildKeys(doors, portals, ctx);
  const treasures = buildTreasures(doors, ctx);
  const pirates = buildPirates(doors, def);
  const props = buildProps(doors, portals, ctx);
  return {
    id: def.id,
    floorYs: def.floorYs,
    platforms, ladders, portals, doors, keys, treasures, pirates, props,
    spawnX: def.spawnX,
    spawnFloor: def.spawnFloor,
  };
}
