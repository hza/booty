export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  onLadder: boolean;
  activeLadder: Ladder | null; // the ladder currently being climbed (null when off)
  facingRight: boolean;
  animFrame: number;
  animTimer: number;
  invincible: number; // frames of invincibility after hit
  dead: boolean;
}

export interface Pirate {
  id: number;
  x: number;
  y: number;
  vx: number;
  facingRight: boolean;
  floorIndex: number;
  animFrame: number;
  animTimer: number;
  patrolLeft: number;
  patrolRight: number;
}

export interface Key {
  id: number;
  number: number;
  x: number;
  y: number;
  collected: boolean;
  bobTimer: number;
}

// Thin vertical barrier on a floor — opened by the matching numbered key
export interface Door {
  id: number;
  number: number;
  x: number;    // centre X of the barrier
  y: number;    // top Y (sits on floor surface)
  h: number;    // height (spans upward)
  open: boolean;
}

// Large green door shape — entering triggers next level or transitions to another room
export interface Portal {
  id: number;
  x: number;
  y: number;    // bottom sits on floor surface
  kind: 'level-exit' | 'room-link';
  targetRoomId?: number;  // only for 'room-link' portals
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  isGround?: boolean;
}

export interface Ladder {
  x: number;
  y: number;
  h: number;
}

export interface Treasure {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  bobTimer: number;
}

// Static, non-interactive decoration sitting on a floor (barrels, crates, sacks…)
export type PropKind = 'barrel' | 'crate' | 'sack' | 'bottles';

export interface Prop {
  id: number;
  kind: PropKind;
  x: number;   // centre X
  y: number;   // baseline Y (sits on floor surface)
  flip: boolean; // mirror horizontally for variety
}

export interface Room {
  id: number;
  floorYs: number[];
  platforms: Platform[];
  ladders: Ladder[];
  doors: Door[];
  keys: Key[];
  portals: Portal[];
  pirates: Pirate[];
  treasures: Treasure[];
  props: Prop[];
  spawnX: number;
  spawnFloor: number;
}

export interface LevelSnapshot {
  rooms: Room[];
  currentRoomId: number;
}

export interface GameState {
  player: Player;
  pirates: Pirate[];
  keys: Key[];
  doors: Door[];
  portals: Portal[];
  platforms: Platform[];
  ladders: Ladder[];
  treasures: Treasure[];
  props: Prop[];
  rooms: Room[];
  currentRoomId: number;
  initialLevel: LevelSnapshot;
  collectedKeys: Set<number>;
  openedDoors: Set<number>;
  score: number;
  treasureCount: number;
  lives: number;
  gameOver: boolean;
  levelComplete: boolean;
  deathTimer: number;
  levelTimer: number;   // counts down after level complete, then auto-advances
  camera: Vec2;
  particles: Particle[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
}
