import type { GameState } from '../types';
import { PIRATE_SPEED, PLAYER_W, PLAYER_H, PIRATE_W, PIRATE_H, DOOR_BAR_W } from '../constants';
import { rectsOverlap } from '../physics';
import { killPlayer } from './player';

export function updatePirates(state: GameState): void {
  const { player } = state;

  for (const pirate of state.pirates) {
    pirate.x += pirate.vx * PIRATE_SPEED / 1.4;
    pirate.animTimer++;

    // Reverse patrol direction at closed doors
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
