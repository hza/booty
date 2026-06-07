import type { Platform, Ladder, Key, Door, Portal, Pirate, Treasure, Prop, PropKind } from './types';
import { FLOOR_Y, FLOOR_H, CANVAS_W, TILE } from './constants';

// Ceiling above each floor's barrier. Lower floors use the floor above (+ its
// thickness); the top floor has no floor above it, so mirror the inter-floor
// gap so every barrier spans the same height.
const CEILING_Y = [
  FLOOR_Y[0] - (FLOOR_Y[1] - FLOOR_Y[0] - FLOOR_H),
  FLOOR_Y[0] + FLOOR_H,
  FLOOR_Y[1] + FLOOR_H,
  FLOOR_Y[2] + FLOOR_H,
];

const PORTAL_W = 36;
const PORTAL_H = 56;

// Ladder x positions that doors/keys/portals on each floor must avoid.
// Populated by buildLadders() — must be called before buildDoors/buildKeys/buildPortals.
let FLOOR_LADDER_XS: number[][] = [[], [], [], []];

// Clearances are center-to-center; each accounts for the half-widths of both objects
// plus one full TILE (32 px) of empty space between their edges.
// Ladder half = 9 px (18 px wide), Door half = 8 px (DOOR_BAR_W), Key half = 10 px (KEY_W/2)
// Portal is expressed as left edge; portal right = x + PORTAL_W (36 px).
const DOOR_LADDER_CLEAR  = 49;  // door center >= this far from ladder center (8+32+9)
const KEY_LADDER_CLEAR   = 51;  // key center >= this far from ladder center  (10+32+9)
const PORTAL_LADDER_ZONE = 41;  // portal [x, x+36] clears [lx-9, lx+9] by 32 px (portal_edge+32<=lx-9 → zone=41)
const DOOR_KEY_CLEAR     = 50;  // key center >= this far from door center    (10+32+8)
const DOOR_SEP           = 80;  // door centers on same floor >= this far apart
const KEY_SEP            = 52;  // key centers >= this far apart              (10+32+10)
const PORTAL_SEP         = 80;  // portal left edges >= this far apart
// Door-portal: door center must clear portal rect by 1 TILE
const PORTAL_DOOR_L      = 40;  // door center < portal_x - 40 when door is left  (8+32=40)
const PORTAL_DOOR_R      = 76;  // door center > portal_x + 76 when door is right (36+32+8=76)
// Key-portal: key center must clear portal rect by 1 TILE
const KEY_PORTAL_L       = 42;  // key center < portal_x - 42 when key is left   (10+32=42)
const KEY_PORTAL_R       = 78;  // key center > portal_x + 78 when key is right  (36+32+10=78)

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

function validDoorXs(fi: number, existing: number[], portalXs: number[]): number[] {
  const lxs = FLOOR_LADDER_XS[fi];
  const out: number[] = [];
  for (let x = 70; x <= CANVAS_W - 70; x += 4) {
    if (lxs.every(lx => Math.abs(x - lx) >= DOOR_LADDER_CLEAR) &&
        existing.every(ex => Math.abs(x - ex) >= DOOR_SEP) &&
        portalXs.every(px => x <= px - PORTAL_DOOR_L || x >= px + PORTAL_DOOR_R)) {
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
        portalXsOnFloor.every(px => x < px - KEY_PORTAL_L || x > px + KEY_PORTAL_R) &&
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

// Evenly-spaced candidate columns for ladders. Spacing comfortably exceeds the
// grab detection window (±14 px) so ladders on any two columns never overlap.
const LADDER_COL_SEP = 96;
const LADDER_COLUMNS: number[] = (() => {
  const cols: number[] = [];
  for (let x = 80; x <= CANVAS_W - 80; x += LADDER_COL_SEP) cols.push(x);
  return cols;
})();

// Minimum spacing between two ladders on the SAME span. Larger than one column
// step so two ladders never sit right next to each other with empty wall (and
// nothing else) between them — that pairing looks pointless to the player.
const LADDER_MIN_GAP = LADDER_COL_SEP * 2; // 192 px

// Pick `count` distinct columns, excluding any used by the vertically-adjacent
// span. Picked columns are ≥ LADDER_MIN_GAP apart, so two ladders on one span
// never crowd together; excluded columns also keep spans from stacking.
function pickLadderColumns(count: number, excludeCols: number[] = []): number[] {
  const available = shuffle(LADDER_COLUMNS.filter(c => !excludeCols.includes(c)));
  const picked: number[] = [];
  for (const c of available) {
    if (picked.length >= count) break;
    if (picked.every(p => Math.abs(p - c) >= LADDER_MIN_GAP)) picked.push(c);
  }
  return picked.sort((a, b) => a - b);
}

export function buildLadders(): Ladder[] {
  const gap01 = FLOOR_Y[1] - FLOOR_Y[0];
  const gap12 = FLOOR_Y[2] - FLOOR_Y[1];
  const gap23 = FLOOR_Y[3] - FLOOR_Y[2];

  // 2–3 ladders per span. Each span avoids the columns of the span it shares a
  // floor with (xs01↔xs12 at floor 1, xs12↔xs23 at floor 2) so they never stack.
  const xs01 = pickLadderColumns(2 + Math.floor(Math.random() * 2));
  const xs12 = pickLadderColumns(2 + Math.floor(Math.random() * 2), xs01);
  const xs23 = pickLadderColumns(2 + Math.floor(Math.random() * 2), xs12);

  FLOOR_LADDER_XS = [
    xs01,
    [...xs01, ...xs12],
    [...xs12, ...xs23],
    xs23,
  ];

  return [
    ...xs01.map(x => ({ x, y: FLOOR_Y[0], h: gap01 })),
    ...xs12.map(x => ({ x, y: FLOOR_Y[1], h: gap12 })),
    ...xs23.map(x => ({ x, y: FLOOR_Y[2], h: gap23 })),
  ];
}

// ─── Randomised level elements ────────────────────────────────────────────────

export function buildDoors(portals: Portal[]): Door[] {
  // Build per-floor portal x lookup for avoidance
  const portalXsByFloor: number[][] = [[], [], [], []];
  for (const p of portals) {
    for (let fi = 0; fi < 4; fi++) {
      if (p.y === FLOOR_Y[fi] - PORTAL_H) {
        portalXsByFloor[fi].push(p.x);
      }
    }
  }

  const doors: Door[] = [];
  let doorId = 0;
  let doorNum = 1;

  for (let fi = 0; fi < 4 && doors.length < 8; fi++) {
    const want = Math.random() < 0.5 ? 1 : 2;
    const takenXs: number[] = [];

    for (let i = 0; i < want && doors.length < 8; i++) {
      const candidates = validDoorXs(fi, takenXs, portalXsByFloor[fi]);
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
    { id: 0, x: 100, y: FLOOR_Y[0] - 32, vx: -TILE * 0.045, facingRight: false, floorIndex: 0, animFrame: 0, animTimer: 0,  patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
    { id: 1, x: 700, y: FLOOR_Y[0] - 32, vx:  TILE * 0.045, facingRight: true,  floorIndex: 0, animFrame: 2, animTimer: 10, patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
    { id: 2, x: 400, y: FLOOR_Y[1] - 32, vx: -TILE * 0.045, facingRight: false, floorIndex: 1, animFrame: 1, animTimer: 5,  patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
    { id: 3, x: 560, y: FLOOR_Y[2] - 32, vx:  TILE * 0.045, facingRight: true,  floorIndex: 2, animFrame: 0, animTimer: 0,  patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
    { id: 4, x: 180, y: FLOOR_Y[3] - 32, vx: -TILE * 0.045, facingRight: false, floorIndex: 3, animFrame: 2, animTimer: 15, patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
    { id: 5, x: 580, y: FLOOR_Y[3] - 32, vx:  TILE * 0.045, facingRight: true,  floorIndex: 3, animFrame: 1, animTimer: 8,  patrolLeft: WALL_LEFT, patrolRight: WALL_RIGHT },
  ];
}

// ─── Static decoration (barrels, crates, sacks…) ─────────────────────────────

const PROP_KINDS: PropKind[] = ['barrel', 'crate'];
const PROP_HALF = 16;        // half-width used for spacing
const PROP_LADDER_CLEAR = 32; // prop center this far from ladder center (15+9+~8)
const PROP_DOOR_CLEAR   = 30; // prop center this far from door center
const PROP_SEP          = 40; // adjacent props this far apart (allows light grouping)

// Place a handful of purely decorative props on each floor. They never collide
// with the player; we only keep them clear of ladders, doors and portals so the
// interactive elements stay readable.
export function buildProps(doors: Door[], portals: Portal[]): Prop[] {
  const doorXsByFloor: number[][] = [[], [], [], []];
  for (const d of doors) {
    const fi = doorFloor(d);
    if (fi >= 0) doorXsByFloor[fi].push(d.x);
  }
  const portalRangesByFloor: Array<Array<[number, number]>> = [[], [], [], []];
  for (const p of portals) {
    for (let fi = 0; fi < 4; fi++) {
      if (p.y === FLOOR_Y[fi] - PORTAL_H) {
        portalRangesByFloor[fi].push([p.x - PROP_HALF, p.x + PORTAL_W + PROP_HALF]);
      }
    }
  }

  const props: Prop[] = [];
  let id = 0;

  for (let fi = 0; fi < 4; fi++) {
    const lxs = FLOOR_LADDER_XS[fi];
    const dxs = doorXsByFloor[fi];
    const pRanges = portalRangesByFloor[fi];

    const candidates: number[] = [];
    for (let x = 60; x <= CANVAS_W - 60; x += 4) {
      if (lxs.every(lx => Math.abs(x - lx) >= PROP_LADDER_CLEAR) &&
          dxs.every(dx => Math.abs(x - dx) >= PROP_DOOR_CLEAR) &&
          pRanges.every(([a, b]) => x < a || x > b)) {
        candidates.push(x);
      }
    }

    const want = 2 + Math.floor(Math.random() * 3); // 2–4 props per floor
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
          y: FLOOR_Y[fi],
          flip: Math.random() < 0.5,
        });
      }
    }
  }

  return props;
}

export function buildTreasures(): Treasure[] {
  return [
    { id: 0, x: 400, y: FLOOR_Y[2] - 24, collected: false, bobTimer: 0 },
    { id: 1, x: 650, y: FLOOR_Y[3] - 24, collected: false, bobTimer: 12 },
  ];
}
