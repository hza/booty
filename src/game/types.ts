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

// Large green door shape — entering triggers next level
export interface Portal {
  id: number;
  x: number;
  y: number;    // bottom sits on floor surface
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

export interface GameState {
  player: Player;
  pirates: Pirate[];
  keys: Key[];
  doors: Door[];
  portals: Portal[];
  platforms: Platform[];
  ladders: Ladder[];
  treasures: Treasure[];
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
