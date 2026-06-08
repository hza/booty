import type { GameState, Door } from '../types';
import { PIRATE_SPEED, PLAYER_W, PLAYER_H, PIRATE_W, PIRATE_H, DOOR_BAR_W, CANVAS_W, FLOOR_Y } from '../constants';
import { rectsOverlap } from '../physics';
import { killPlayer } from './player';

const WALL_LEFT  = 16;
const WALL_RIGHT = CANVAS_W - 16;

function doorFloor(door: Door): number {
  // door spans from ceiling to floor; door.y + door.h === FLOOR_Y[fi]
  return FLOOR_Y.findIndex(fy => Math.abs(door.y + door.h - fy) < 2);
}

// Compute the contiguous patrol segment reachable from a pirate's current position
// given which doors on the floor are currently open (merged into one segment).
function effectivePatrol(pirate: { floorIndex: number; patrolLeft: number; patrolRight: number }, doors: Door[]): [number, number] {
  // Build segments split by closed doors on this floor
  const closedXs = doors
    .filter(d => doorFloor(d) === pirate.floorIndex && !d.open)
    .map(d => d.x)
    .sort((a, b) => a - b);

  const segments: Array<[number, number]> = [];
  let left = WALL_LEFT;
  for (const dx of closedXs) { segments.push([left, dx - DOOR_BAR_W / 2]); left = dx + DOOR_BAR_W / 2; }
  segments.push([left, WALL_RIGHT]);

  // Find the segment that contains the pirate's initial patrol range midpoint
  const mid = (pirate.patrolLeft + pirate.patrolRight) / 2;
  for (const [l, r] of segments) {
    if (mid >= l && mid <= r) return [l, r];
  }
  return [pirate.patrolLeft, pirate.patrolRight];
}

export function updatePirates(state: GameState): void {
  const { player } = state;

  for (const pirate of state.pirates) {
    pirate.x += pirate.vx * PIRATE_SPEED / 1.4;
    pirate.animTimer++;

    const [effLeft, effRight] = effectivePatrol(pirate, state.doors);

    if (pirate.x <= effLeft) {
      pirate.x = effLeft;
      pirate.vx = Math.abs(pirate.vx);
      pirate.facingRight = true;
    } else if (pirate.x + PIRATE_W >= effRight) {
      pirate.x = effRight - PIRATE_W;
      pirate.vx = -Math.abs(pirate.vx);
      pirate.facingRight = false;
    }

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
