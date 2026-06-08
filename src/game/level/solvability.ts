import type { Door, Key, Ladder, Treasure } from '../types';
import { FLOOR_Y, CANVAS_W, DOOR_HALF_W } from '../constants';
import { CEILING_Y, doorFloor } from './generator';

const WALL_L = 16;
const WALL_R = CANVAS_W - 16;

function floorSegments(fi: number, openDoorIds: Set<number>, doors: Door[]): Array<[number, number]> {
  const xs = doors
    .filter(d => doorFloor(d) === fi && !openDoorIds.has(d.id))
    .map(d => d.x)
    .sort((a, b) => a - b);
  const out: Array<[number, number]> = [];
  let left = WALL_L;
  for (const x of xs) { out.push([left, x - DOOR_HALF_W]); left = x + DOOR_HALF_W; }
  out.push([left, WALL_R]);
  return out;
}

function sameSegment(fi: number, a: number, b: number, openDoorIds: Set<number>, doors: Door[]): boolean {
  return floorSegments(fi, openDoorIds, doors).some(([l, r]) => a >= l && a <= r && b >= l && b <= r);
}

function keyFloorIndex(k: Key): number {
  for (let fi = 0; fi < 4; fi++) if (Math.abs(k.y + 26 - FLOOR_Y[fi]) < 2) return fi;
  return -1;
}

function treasureFloorIndex(t: Treasure): number {
  for (let fi = 0; fi < 4; fi++) if (Math.abs(t.y + 24 - FLOOR_Y[fi]) < 2) return fi;
  return -1;
}

function ladderSpan(l: Ladder): [number, number] {
  for (let fi = 0; fi < 3; fi++) if (l.y === FLOOR_Y[fi]) return [fi, fi + 1];
  return [-1, -1];
}

export function minDoorsToTreasure(
  treasure: Treasure,
  doors: Door[],
  keys: Key[],
  ladders: Ladder[],
): number {
  function closure(openDoorIds: Set<number>) {
    const haveKeys = new Set<number>();
    const waypoints: Map<number, Set<number>> = new Map();
    for (let fi = 0; fi < 4; fi++) waypoints.set(fi, new Set());

    function isReachable(fi: number, x: number): boolean {
      for (const rx of waypoints.get(fi)!) {
        if (sameSegment(fi, rx, x, openDoorIds, doors)) return true;
      }
      return false;
    }
    function addWaypoint(fi: number, x: number): boolean {
      if (isReachable(fi, x)) return false;
      waypoints.get(fi)!.add(x);
      return true;
    }

    addWaypoint(0, 300);
    let changed = true;
    while (changed) {
      changed = false;
      for (const l of ladders) {
        const [f1, f2] = ladderSpan(l);
        if (f1 < 0) continue;
        if (isReachable(f1, l.x) && addWaypoint(f2, l.x)) changed = true;
        if (isReachable(f2, l.x) && addWaypoint(f1, l.x)) changed = true;
      }
      for (const k of keys) {
        if (haveKeys.has(k.number)) continue;
        const fi = keyFloorIndex(k);
        if (fi >= 0 && isReachable(fi, k.x)) { haveKeys.add(k.number); changed = true; }
      }
    }
    return { haveKeys, isReachable };
  }

  const tfi = treasureFloorIndex(treasure);
  const visited = new Set<number>();
  const queue: Array<[number, number]> = [[0, 0]]; // [cost, bitmask of open doors]

  while (queue.length > 0) {
    const [cost, mask] = queue.shift()!;
    if (visited.has(mask)) continue;
    visited.add(mask);

    const openIds = new Set(doors.filter((_, i) => mask & (1 << i)).map(d => d.id));
    const { haveKeys, isReachable } = closure(openIds);

    if (tfi >= 0 && isReachable(tfi, treasure.x)) return cost;

    for (let i = 0; i < doors.length; i++) {
      if (mask & (1 << i)) continue;
      const door = doors[i];
      if (!haveKeys.has(door.number)) continue;
      const dfi = doorFloor(door);
      if (isReachable(dfi, door.x - 10) || isReachable(dfi, door.x + 10)) {
        queue.push([cost + 1, mask | (1 << i)]);
      }
    }
  }

  return Infinity;
}

export function checkSolvable(
  doors: Door[],
  keys: Key[],
  ladders: Ladder[],
  treasures: Treasure[],
): boolean {
  const openDoorIds = new Set<number>();
  const haveKeys = new Set<number>();
  // Store known-reachable waypoint x per floor (ladder x's + player start)
  const waypoints: Map<number, Set<number>> = new Map();
  for (let fi = 0; fi < 4; fi++) waypoints.set(fi, new Set());

  function isReachable(fi: number, x: number): boolean {
    for (const rx of waypoints.get(fi)!) {
      if (sameSegment(fi, rx, x, openDoorIds, doors)) return true;
    }
    return false;
  }

  function addWaypoint(fi: number, x: number): boolean {
    if (isReachable(fi, x)) return false;
    waypoints.get(fi)!.add(x);
    return true;
  }

  addWaypoint(0, 300); // player start

  let changed = true;
  while (changed) {
    changed = false;

    for (const ladder of ladders) {
      const [f1, f2] = ladderSpan(ladder);
      if (f1 < 0) continue;
      if (isReachable(f1, ladder.x) && addWaypoint(f2, ladder.x)) changed = true;
      if (isReachable(f2, ladder.x) && addWaypoint(f1, ladder.x)) changed = true;
    }

    for (const key of keys) {
      if (haveKeys.has(key.number)) continue;
      const fi = keyFloorIndex(key);
      if (fi >= 0 && isReachable(fi, key.x)) {
        haveKeys.add(key.number);
        changed = true;
      }
    }

    for (const door of doors) {
      if (openDoorIds.has(door.id)) continue;
      if (!haveKeys.has(door.number)) continue;
      const fi = doorFloor(door);
      if (isReachable(fi, door.x - 10) || isReachable(fi, door.x + 10)) {
        openDoorIds.add(door.id);
        changed = true;
      }
    }
  }

  return treasures.every(t => {
    const fi = treasureFloorIndex(t);
    return fi >= 0 && isReachable(fi, t.x);
  });
}
