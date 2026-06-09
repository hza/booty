export {
  CEILING_Y,
  computeCeilingYs,
  defaultRoomDef,
  doorFloor,
  buildPlatforms,
  buildLadders,
  buildDoors,
  buildPortals,
  buildKeys,
  buildPirates,
  buildProps,
  buildTreasures,
  buildRoom,
} from './generator';

export type { RoomDef, RoomContext } from './generator';

export { checkSolvable, minDoorsToTreasure } from './solvability';
