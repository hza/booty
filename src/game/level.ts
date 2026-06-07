import type { Platform, Ladder, Key, Door, Portal, Pirate, Treasure } from './types';
import { FLOOR_Y, FLOOR_H, CANVAS_W, TILE } from './constants';

const CEILING_Y = [
  0,
  FLOOR_Y[0] + FLOOR_H,
  FLOOR_Y[1] + FLOOR_H,
  FLOOR_Y[2] + FLOOR_H,
];

const PORTAL_W = 36;
const PORTAL_H = 56;

// Ladder x positions that doors/keys/portals on each floor must avoid.
// Includes both ladders that start on the floor and ladders that pass through it.
const FLOOR_LADDER_XS: number[][] = [
  [120, 380, 680],                         // floor 0: gap01 ladders start here
  [120, 380, 680, 200, 510, 750],          // floor 1: gap01 pass through + gap12 start
  [200, 510, 750,  80, 300, 600],          // floor 2: gap12 pass through + gap23 start
  [ 80, 300, 600],                         // floor 3: gap23 ladders end here
];

// Clearances are center-to-center; each accounts for the half-widths of both objects
// plus one full TILE (32 px) of empty space between their edges.
// Ladder half = 9 px (18 px wide), Door half = 8 px (DOOR_BAR_W), Key half = 10 px (KEY_W/2)
const DOOR_LADDER_CLEAR  = 49;  // door center must be >= this far from any ladder x  (8+32+9)
const KEY_LADDER_CLEAR   = 51;  // key center >= this far from any ladder x            (10+32+9)
const PORTAL_LADDER_ZONE = 14;  // portal rect [x, x+PORTAL_W] must not overlap [lx-14, lx+14]
const DOOR_KEY_CLEAR     = 50;  // key center >= this far from any door center on same floor (10+32+8)
const DOOR_SEP           = 80;  // door centers on same floor >= this far apart
const KEY_SEP            = 52;  // key centers >= this far apart                       (10+32+10)
const PORTAL_SEP         = 80;  // portal left edges >= this far apart

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

function doorFloor(door: Door): number {
  return CEILING_Y.indexOf(door.y);
}

function validDoorXs(fi: number, existing: number[]): number[] {
  const lxs = FLOOR_LADDER_XS[fi];
  const out: number[] = [];
  for (let x = 70; x <= CANVAS_W - 70; x += 4) {
    if (lxs.every(lx => Math.abs(x - lx) >= DOOR_LADDER_CLEAR) &&
        existing.every(ex => Math.abs(x - ex) >= DOOR_SEP)) {
      out.push(x);
    }
  }
  return out;
}

function validPortalXs(fi: number, existing: number[]): number[] {
  const lxs = FLOOR_LADDER_XS[fi];
  const out: number[] = [];
  for (let x = 20; x <= CANVAS_W - 20 - PORTAL_W; x += 4) {
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
): number[] {
  const lxs = FLOOR_LADDER_XS[fi];
  const out: number[] = [];
  for (let x = 50; x <= CANVAS_W - 50; x += 4) {
    if (lxs.every(lx => Math.abs(x - lx) >= KEY_LADDER_CLEAR) &&
        doorXsOnFloor.every(dx => Math.abs(x - dx) >= DOOR_KEY_CLEAR) &&
        portalXsOnFloor.every(px => x < px - 12 || x > px + PORTAL_W + 12) &&
        existingKeyXs.every(kx => Math.abs(x - kx) >= KEY_SEP)) {
      out.push(x);
    }
  }
  return out;
}

// ─── Platform / Ladder (fixed structural elements) ───────────────────────────

export function buildPlatforms(): Platform[] {
  const platforms: Platform[] = [];

  const floorDefs = [
    { fi: 0, segs: [{ x: 0, w: CANVAS_W }] },
    { fi: 1, segs: [{ x: 0, w: CANVAS_W }] },
    { fi: 2, segs: [{ x: 0, w: CANVAS_W }] },
    { fi: 3, segs: [{ x: 0, w: CANVAS_W }] },
  ];

  for (const { fi, segs } of floorDefs) {
    for (const seg of segs) {
      platforms.push({ x: seg.x, y: FLOOR_Y[fi], w: seg.w, h: FLOOR_H });
    }
  }

  platforms.push({ x: 0,             y: 0, w: 16, h: 560, isGround: false });
  platforms.push({ x: CANVAS_W - 16, y: 0, w: 16, h: 560, isGround: false });

  return platforms;
}

export function buildLadders(): Ladder[] {
  const gap01 = FLOOR_Y[1] - FLOOR_Y[0];
  const gap12 = FLOOR_Y[2] - FLOOR_Y[1];
  const gap23 = FLOOR_Y[3] - FLOOR_Y[2];
  return [
    { x: 120, y: FLOOR_Y[0], h: gap01 },
    { x: 380, y: FLOOR_Y[0], h: gap01 },
    { x: 680, y: FLOOR_Y[0], h: gap01 },

    { x: 200, y: FLOOR_Y[1], h: gap12 },
    { x: 510, y: FLOOR_Y[1], h: gap12 },
    { x: 750, y: FLOOR_Y[1], h: gap12 },

    { x:  80, y: FLOOR_Y[2], h: gap23 },
    { x: 300, y: FLOOR_Y[2], h: gap23 },
    { x: 600, y: FLOOR_Y[2], h: gap23 },
  ];
}

// ─── Randomised level elements ────────────────────────────────────────────────

export function buildDoors(): Door[] {
  const doors: Door[] = [];
  let doorId = 0;
  let doorNum = 1;

  for (let fi = 0; fi < 4 && doors.length < 8; fi++) {
    // Randomly place 1 or 2 doors on this floor
    const want = Math.random() < 0.5 ? 1 : 2;
    const takenXs: number[] = [];

    for (let i = 0; i < want && doors.length < 8; i++) {
      const candidates = validDoorXs(fi, takenXs);
      if (candidates.length === 0) break;
      const x = pickRandom(candidates);
      takenXs.push(x);
      doors.push({
        id: doorId++,
        number: doorNum++,
        x,
        y: CEILING_Y[fi],
        h: FLOOR_Y[fi] - CEILING_Y[fi],
        open: false,
      });
    }
  }

  return doors;
}

export function buildPortals(): Portal[] {
  const count = Math.floor(Math.random() * 3) + 1; // 1–3 portals
  const floors = shuffle([0, 1, 2, 3]).slice(0, count);
  const portals: Portal[] = [];

  for (let i = 0; i < floors.length; i++) {
    const fi = floors[i];
    const takenXs = portals.map(p => p.x);
    const candidates = validPortalXs(fi, takenXs);
    if (candidates.length === 0) continue;
    portals.push({
      id: i,
      x: pickRandom(candidates),
      y: FLOOR_Y[fi] - PORTAL_H,
    });
  }

  // Guarantee at least one portal
  if (portals.length === 0) {
    portals.push({ id: 0, x: 48, y: FLOOR_Y[0] - PORTAL_H });
  }

  return portals;
}

export function buildKeys(doors: Door[], portals: Portal[]): Key[] {
  // Build per-floor lookup tables for avoidance
  const doorXsByFloor: number[][] = [[], [], [], []];
  for (const door of doors) {
    const fi = doorFloor(door);
    if (fi >= 0) doorXsByFloor[fi].push(door.x);
  }

  const portalXsByFloor: number[][] = [[], [], [], []];
  for (const p of portals) {
    for (let fi = 0; fi < 4; fi++) {
      if (p.y === FLOOR_Y[fi] - PORTAL_H) {
        portalXsByFloor[fi].push(p.x);
      }
    }
  }

  const keyXsByFloor: number[][] = [[], [], [], []];
  const keys: Key[] = [];

  for (const door of doors) {
    const df = doorFloor(door);
    // Try floors other than the door's floor first
    const floorOrder = shuffle([0, 1, 2, 3].filter(f => f !== df));
    floorOrder.push(df); // fallback to door's own floor last

    let placed = false;
    for (const fi of floorOrder) {
      const candidates = validKeyXs(
        fi,
        doorXsByFloor[fi],
        portalXsByFloor[fi],
        keyXsByFloor[fi],
      );
      if (candidates.length === 0) continue;
      const x = pickRandom(candidates);
      keyXsByFloor[fi].push(x);
      keys.push({
        id: door.id,
        number: door.number,
        x,
        y: FLOOR_Y[fi] - 26,
        collected: false,
        bobTimer: Math.floor(Math.random() * 30),
      });
      placed = true;
      break;
    }

    if (!placed) {
      // Last-resort: place near player start without any constraint check
      keys.push({
        id: door.id,
        number: door.number,
        x: 300 + door.id * 50,
        y: FLOOR_Y[0] - 26,
        collected: false,
        bobTimer: 0,
      });
    }
  }

  return keys;
}

// ─── Pirates / Treasures (fixed patterns, varied by randomness elsewhere) ────

const WALL_LEFT  = 16;               // right edge of left wall
const WALL_RIGHT = CANVAS_W - 16;    // left edge of right wall

export function buildPirates(): Pirate[] {
  return [
    { id: 0, x: 320, y: FLOOR_Y[0] - 32, vx: -TILE * 0.045, facingRight: false, floorIndex: 0, animFrame: 0, animTimer: 0,  patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
    { id: 1, x: 700, y: FLOOR_Y[0] - 32, vx:  TILE * 0.045, facingRight: true,  floorIndex: 0, animFrame: 2, animTimer: 10, patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
    { id: 2, x: 400, y: FLOOR_Y[1] - 32, vx: -TILE * 0.045, facingRight: false, floorIndex: 1, animFrame: 1, animTimer: 5,  patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
    { id: 3, x: 560, y: FLOOR_Y[2] - 32, vx:  TILE * 0.045, facingRight: true,  floorIndex: 2, animFrame: 0, animTimer: 0,  patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
    { id: 4, x: 180, y: FLOOR_Y[3] - 32, vx: -TILE * 0.045, facingRight: false, floorIndex: 3, animFrame: 2, animTimer: 15, patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
    { id: 5, x: 580, y: FLOOR_Y[3] - 32, vx:  TILE * 0.045, facingRight: true,  floorIndex: 3, animFrame: 1, animTimer: 8,  patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
  ];
}

export function buildTreasures(): Treasure[] {
  return [
    { id: 0, x: 400, y: FLOOR_Y[2] - 24, collected: false, bobTimer: 0 },
    { id: 1, x: 650, y: FLOOR_Y[3] - 24, collected: false, bobTimer: 12 },
  ];
}
