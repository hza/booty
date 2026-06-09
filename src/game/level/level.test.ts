import { describe, it, expect, beforeEach } from 'vitest';
import { FLOOR_Y, FLOOR_H, CANVAS_W, PORTAL_H } from '../constants';
import {
  CEILING_Y,
  FLOOR_LADDER_XS,
  doorFloor,
  buildPlatforms,
  buildLadders,
  buildDoors,
  buildPortals,
  buildKeys,
  buildPirates,
  buildTreasures,
} from './generator';
import { checkSolvable, minDoorsToTreasure } from './solvability';
import type { Door, Key, Ladder, Treasure } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeDoor(id: number, fi: number, x: number): Door {
  return {
    id,
    number: id + 1,
    x,
    y: CEILING_Y[fi],
    h: FLOOR_Y[fi] - CEILING_Y[fi],
    open: false,
  };
}

function makeKey(doorId: number, fi: number, x: number): Key {
  return {
    id: doorId,
    number: doorId + 1,
    x,
    y: FLOOR_Y[fi] - 26,
    collected: false,
    bobTimer: 0,
  };
}

function makeLadder(fi: number, x: number): Ladder {
  return { x, y: FLOOR_Y[fi], h: FLOOR_Y[fi + 1] - FLOOR_Y[fi] };
}

function makeTreasure(id: number, fi: number, x: number): Treasure {
  return { id, x, y: FLOOR_Y[fi] - 24, collected: false, bobTimer: 0 };
}

// ─── CEILING_Y sanity ─────────────────────────────────────────────────────────

describe('CEILING_Y', () => {
  it('has 4 entries', () => {
    expect(CEILING_Y).toHaveLength(4);
  });

  it('is always above the matching FLOOR_Y', () => {
    for (let fi = 0; fi < 4; fi++) {
      expect(CEILING_Y[fi]).toBeLessThan(FLOOR_Y[fi]);
    }
  });

  it('inter-floor spans all have the same height', () => {
    const heights = CEILING_Y.map((cy, fi) => FLOOR_Y[fi] - cy);
    const h0 = heights[0];
    for (const h of heights) {
      expect(h).toBe(h0);
    }
  });
});

// ─── doorFloor ────────────────────────────────────────────────────────────────

describe('doorFloor', () => {
  it('returns the correct floor index for each ceiling y', () => {
    for (let fi = 0; fi < 4; fi++) {
      const door = makeDoor(fi, fi, 200);
      expect(doorFloor(door)).toBe(fi);
    }
  });

  it('returns -1 for an unknown y', () => {
    const door: Door = { id: 0, number: 1, x: 100, y: 999, h: 50, open: false };
    expect(doorFloor(door)).toBe(-1);
  });
});

// ─── buildPlatforms ───────────────────────────────────────────────────────────

describe('buildPlatforms', () => {
  it('includes exactly 4 floor platforms + 2 wall platforms', () => {
    const platforms = buildPlatforms();
    const floors = platforms.filter(p => p.h === FLOOR_H);
    const walls  = platforms.filter(p => p.h !== FLOOR_H);
    expect(floors).toHaveLength(4);
    expect(walls).toHaveLength(2);
  });

  it('floor platforms have y values matching FLOOR_Y', () => {
    const platforms = buildPlatforms();
    const floorYs = platforms.filter(p => p.h === FLOOR_H).map(p => p.y).sort((a, b) => a - b);
    expect(floorYs).toEqual([...FLOOR_Y].sort((a, b) => a - b));
  });

  it('floor platforms span the full canvas width', () => {
    const platforms = buildPlatforms();
    for (const p of platforms.filter(p => p.h === FLOOR_H)) {
      expect(p.w).toBe(CANVAS_W);
      expect(p.x).toBe(0);
    }
  });
});

// ─── buildLadders ─────────────────────────────────────────────────────────────

describe('buildLadders', () => {
  beforeEach(() => {
    buildLadders(); // also populates FLOOR_LADDER_XS
  });

  it('returns between 6 and 9 ladders (2–3 per span × 3 spans)', () => {
    const ladders = buildLadders();
    expect(ladders.length).toBeGreaterThanOrEqual(6);
    expect(ladders.length).toBeLessThanOrEqual(9);
  });

  it('each ladder x is within canvas bounds', () => {
    const ladders = buildLadders();
    for (const l of ladders) {
      expect(l.x).toBeGreaterThanOrEqual(16);
      expect(l.x).toBeLessThanOrEqual(CANVAS_W - 16);
    }
  });

  it('populates FLOOR_LADDER_XS with 4 entries', () => {
    buildLadders();
    expect(FLOOR_LADDER_XS).toHaveLength(4);
  });

  it('each ladder height equals the gap between the two floors it bridges', () => {
    const ladders = buildLadders();
    for (const l of ladders) {
      const found = [0, 1, 2].some(fi => {
        const expectedH = FLOOR_Y[fi + 1] - FLOOR_Y[fi];
        return l.y === FLOOR_Y[fi] && l.h === expectedH;
      });
      expect(found).toBe(true);
    }
  });
});

// ─── buildPortals ─────────────────────────────────────────────────────────────

describe('buildPortals', () => {
  it('returns 1–3 portals', () => {
    for (let i = 0; i < 10; i++) {
      buildLadders();
      const portals = buildPortals();
      expect(portals.length).toBeGreaterThanOrEqual(1);
      expect(portals.length).toBeLessThanOrEqual(3);
    }
  });

  it('each portal y sits on one of the 4 floors', () => {
    buildLadders();
    const portals = buildPortals();
    for (const p of portals) {
      const floorMatch = FLOOR_Y.some(fy => p.y === fy - PORTAL_H);
      expect(floorMatch).toBe(true);
    }
  });

  it('each portal x is within canvas bounds', () => {
    buildLadders();
    const portals = buildPortals();
    for (const p of portals) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + 36).toBeLessThanOrEqual(CANVAS_W);
    }
  });
});

// ─── buildDoors ───────────────────────────────────────────────────────────────

describe('buildDoors', () => {
  it('returns 1–8 doors', () => {
    for (let i = 0; i < 10; i++) {
      buildLadders();
      const portals = buildPortals();
      const doors = buildDoors(portals);
      expect(doors.length).toBeGreaterThanOrEqual(1);
      expect(doors.length).toBeLessThanOrEqual(8);
    }
  });

  it('each door x is within canvas bounds', () => {
    buildLadders();
    const portals = buildPortals();
    const doors = buildDoors(portals);
    for (const d of doors) {
      expect(d.x).toBeGreaterThanOrEqual(16);
      expect(d.x).toBeLessThanOrEqual(CANVAS_W - 16);
    }
  });

  it('door ids are unique and start from 0', () => {
    buildLadders();
    const portals = buildPortals();
    const doors = buildDoors(portals);
    const ids = doors.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.min(...ids)).toBe(0);
  });

  it('all doors are initially closed', () => {
    buildLadders();
    const portals = buildPortals();
    const doors = buildDoors(portals);
    for (const d of doors) {
      expect(d.open).toBe(false);
    }
  });
});

// ─── buildKeys ────────────────────────────────────────────────────────────────

describe('buildKeys', () => {
  it('returns exactly one key per door', () => {
    buildLadders();
    const portals = buildPortals();
    const doors = buildDoors(portals);
    const keys = buildKeys(doors, portals);
    expect(keys).toHaveLength(doors.length);
  });

  it('each key id matches its door id', () => {
    buildLadders();
    const portals = buildPortals();
    const doors = buildDoors(portals);
    const keys = buildKeys(doors, portals);
    const doorIds = new Set(doors.map(d => d.id));
    for (const k of keys) {
      expect(doorIds.has(k.id)).toBe(true);
    }
  });

  it('each key y sits on one of the 4 floors', () => {
    buildLadders();
    const portals = buildPortals();
    const doors = buildDoors(portals);
    const keys = buildKeys(doors, portals);
    for (const k of keys) {
      const floorMatch = FLOOR_Y.some(fy => Math.abs(k.y + 26 - fy) < 2);
      expect(floorMatch).toBe(true);
    }
  });
});

// ─── buildPirates ────────────────────────────────────────────────────────────

describe('buildPirates', () => {
  it('returns at most 4 pirates (one per floor)', () => {
    buildLadders();
    const portals = buildPortals();
    const doors = buildDoors(portals);
    const pirates = buildPirates(doors);
    expect(pirates.length).toBeLessThanOrEqual(4);
  });

  it('each pirate patrols within canvas bounds', () => {
    buildLadders();
    const portals = buildPortals();
    const doors = buildDoors(portals);
    const pirates = buildPirates(doors);
    for (const p of pirates) {
      expect(p.patrolLeft).toBeGreaterThanOrEqual(16);
      expect(p.patrolRight).toBeLessThanOrEqual(CANVAS_W - 16);
      expect(p.patrolLeft).toBeLessThan(p.patrolRight);
    }
  });
});

// ─── buildTreasures ───────────────────────────────────────────────────────────

describe('buildTreasures', () => {
  it('returns exactly 2 treasures', () => {
    buildLadders();
    const portals = buildPortals();
    const doors = buildDoors(portals);
    const treasures = buildTreasures(doors);
    expect(treasures).toHaveLength(2);
  });

  it('each treasure is initially uncollected', () => {
    buildLadders();
    const portals = buildPortals();
    const doors = buildDoors(portals);
    const treasures = buildTreasures(doors);
    for (const t of treasures) {
      expect(t.collected).toBe(false);
    }
  });
});

// ─── checkSolvable ────────────────────────────────────────────────────────────

describe('checkSolvable', () => {
  it('trivial: treasure on floor 0, no doors', () => {
    const ladder = makeLadder(0, 200);
    const treasure = makeTreasure(0, 0, 300);
    expect(checkSolvable([], [], [ladder], [treasure])).toBe(true);
  });

  it('treasure behind one door — reachable when key is accessible', () => {
    // Floor 0 key opens door 1 which blocks access to floor-0 treasure
    // (door to the right of the treasure, key to the left)
    const door = makeDoor(0, 0, 500);
    const key = makeKey(0, 0, 200);
    const ladder = makeLadder(0, 400);
    const treasure = makeTreasure(0, 0, 620);
    expect(checkSolvable([door], [key], [ladder], [treasure])).toBe(true);
  });

  it('treasure unreachable when key is also locked behind the same door', () => {
    // door at x=400 splits floor 0; key and treasure are both to the right
    const door = makeDoor(0, 0, 400);
    const key = makeKey(0, 0, 600);       // right of door — unreachable without key
    const ladder = makeLadder(0, 200);
    const treasure = makeTreasure(0, 0, 700);
    expect(checkSolvable([door], [key], [ladder], [treasure])).toBe(false);
  });

  it('multi-floor: ladder required to reach treasure', () => {
    const ladder = makeLadder(0, 200);
    const treasure = makeTreasure(0, 1, 300); // floor 1
    expect(checkSolvable([], [], [ladder], [treasure])).toBe(true);
  });

  it('multi-floor: no ladder means floor 1+ treasure is unreachable', () => {
    const treasure = makeTreasure(0, 2, 300); // floor 2, no ladders
    expect(checkSolvable([], [], [], [treasure])).toBe(false);
  });

  it('all treasures must be reachable', () => {
    const ladder = makeLadder(0, 200);
    const t0 = makeTreasure(0, 0, 300);  // reachable
    const t1 = makeTreasure(1, 2, 300);  // floor 2 — no ladder to reach it
    expect(checkSolvable([], [], [ladder], [t0, t1])).toBe(false);
  });
});

// ─── minDoorsToTreasure ───────────────────────────────────────────────────────

describe('minDoorsToTreasure', () => {
  it('returns 0 when treasure is immediately reachable', () => {
    const ladder = makeLadder(0, 200);
    const treasure = makeTreasure(0, 0, 300);
    expect(minDoorsToTreasure(treasure, [], [], [ladder])).toBe(0);
  });

  it('returns 1 for treasure behind a single openable door', () => {
    const door = makeDoor(0, 0, 500);
    const key = makeKey(0, 0, 200);
    const ladder = makeLadder(0, 400);
    const treasure = makeTreasure(0, 0, 650);
    expect(minDoorsToTreasure(treasure, [door], [key], [ladder])).toBe(1);
  });

  it('returns Infinity when treasure is unreachable even with all doors open', () => {
    // treasure on floor 2 but no ladder at all
    const door = makeDoor(0, 0, 400);
    const key = makeKey(0, 0, 200);
    const treasure = makeTreasure(0, 2, 300);
    expect(minDoorsToTreasure(treasure, [door], [key], [])).toBe(Infinity);
  });

  it('two-door chain: requires opening doors in sequence', () => {
    // door1 at x=400 (key1 at x=200), door2 at x=600 (key2 at x=450 — between the two doors)
    const door1 = makeDoor(0, 0, 400);
    const door2 = makeDoor(1, 0, 600);
    const key1 = makeKey(0, 0, 200);  // left of door1 — reachable immediately
    const key2 = makeKey(1, 0, 450);  // between door1 and door2 — needs door1 open
    const ladder = makeLadder(0, 300);
    const treasure = makeTreasure(0, 0, 700); // right of door2
    expect(minDoorsToTreasure(treasure, [door1, door2], [key1, key2], [ladder])).toBe(2);
  });
});
