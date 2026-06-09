import type { GameState } from '../types';
import { CANVAS_W, CANVAS_H } from '../constants';
import { drawBackground } from './background';
import { drawPlatforms, drawLadder } from './floor';
import { drawDoor, drawPortal, drawKey, drawTreasure, drawProp } from './items';
import { drawPlayer, drawPirate } from './entities';
import { drawParticles, drawHUD, drawGameOver, drawLevelComplete } from './hud';

export function render(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  drawBackground(ctx);

  for (const ladder of state.ladders) drawLadder(ctx, ladder);
  drawPlatforms(ctx, state.platforms, state.ladders);
  for (const prop of state.props) drawProp(ctx, prop);

  const treasuresCollected = state.rooms.every(r => r.treasures.every(t => t.collected));
  for (const portal of state.portals) drawPortal(ctx, portal, time, treasuresCollected);
  for (const door of state.doors) drawDoor(ctx, door);
  for (const key of state.keys) drawKey(ctx, key, time);
  for (const treasure of state.treasures) drawTreasure(ctx, treasure, time);

  for (const pirate of state.pirates) drawPirate(ctx, pirate, time);
  drawPlayer(ctx, state.player, time);

  drawParticles(ctx, state.particles);
  drawHUD(ctx, state);

  if (state.gameOver) drawGameOver(ctx);
  if (state.levelComplete) drawLevelComplete(ctx, state.score);
}
