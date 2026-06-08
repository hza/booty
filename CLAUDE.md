# Booty — Codebase Guide for AI Agents

Browser-based 2D platformer (ZX Spectrum Booty, 1984). React + Canvas + TypeScript, no game engine.

## Quick start

```sh
npm install
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # Production build to dist/
npx tsc --noEmit # Type-check only
```

## Architecture

```text
src/
├── main.tsx         React entry point
├── App.tsx          Root: renders <Game />
├── Game.tsx         Canvas setup, input handling, RAF game loop
└── game/
    ├── types.ts         All interfaces and type aliases
    ├── constants.ts     Canvas size, physics, layout, shared dims
    │
    ├── — Logic ─────────────────────────────────────────────
    ├── state/index.ts   initState / resetLevel / update (orchestrator)
    ├── entities/
    │   ├── player.ts    updatePlayer, killPlayer
    │   ├── pirates.ts   updatePirates (patrol AI, door blocking)
    │   └── pickups.ts   updateKeys, updatePortals, updateTreasures, updateParticles
    ├── physics/
    │   └── index.ts     rectsOverlap, onPlatform, nearbyLadders, clampToWalls, spawnParticles
    │
    ├── — Level generation ──────────────────────────────────
    ├── level/
    │   └── index.ts     buildPlatforms/Ladders/Doors/Keys/Portals/Pirates/Treasures/Props
    │                    + checkSolvable / minDoorsToTreasure (BFS solvability)
    │
    └── — Rendering ─────────────────────────────────────────
    └── renderer/
        ├── index.ts     render() master function (draw order only)
        ├── background.ts  ocean gradient, ceiling beam, brick walls
        ├── floor.ts     drawPlatforms (with ladder gaps), drawLadder
        ├── entities.ts  drawPlayer, drawPirate (full sprite drawing)
        ├── items.ts     drawDoor, drawPortal, drawKey, drawTreasure, drawProp
        │                + DOOR_COLORS export used by hud.ts
        └── hud.ts       drawHUD, drawParticles, drawGameOver, drawLevelComplete
```

## Data flow

```text
Keyboard → inputRef (Game.tsx)
             ↓
         update(state, input)   [state/index.ts, called each RAF frame]
             ↓ calls
         updatePlayer / updatePirates / updateKeys / updatePortals / updateTreasures
         (each mutates GameState in-place)
             ↓
         render(ctx, state, time)   [renderer/index.ts → renderer/* modules]
             ↓
         Browser canvas
```

## Key design facts

- **GameState lives in a React `useRef`** — never triggers re-renders. All mutations are in-place.
- **Fixed-step physics** — deltaTime is bucketed into 16.67 ms steps; `vy` capped at 16 px/frame.
- **Jump is a one-frame impulse** — `jumpPressedRef` prevents hold-down repeat (Game.tsx:60–75).
- **Ladder grab is sticky** — `player.activeLadder` is set on grab and cleared on floor arrival or jump. Position re-detection is intentionally skipped during a climb to prevent adjacent-ladder hijacking.
- **Procedural level generation** — up to 50 attempts, selects the first layout where every treasure requires ≥ 3 doors (BFS over door-open bitmask). Falls back to the best solvable attempt if the depth target is never met.
- **Solvability check** (`checkSolvable`) uses flood-fill: waypoints per floor, expanded through ladders and unlocked doors until fixed-point. `minDoorsToTreasure` uses BFS with a door-open bitmask as state.

## Important constants (src/game/constants.ts)

| Name | Value | Use |
| --- | --- | --- |
| `CANVAS_W/H` | 832 × 560 | Canvas dimensions |
| `FLOOR_Y` | [110,220,330,440] | Top-Y of each of the 4 floors |
| `FLOOR_H` | 16 | Floor plank thickness |
| `TILE` | 32 | Base grid unit |
| `PLAYER_W/H` | 22 × 30 | Player hitbox |
| `PIRATE_W/H` | 22 × 30 | Pirate hitbox |
| `PORTAL_W/H` | 36 × 56 | Portal rect (footprint) |
| `DOOR_BAR_W` | 8 | Door collision full-width |
| `DOOR_HALF_W` | 4 | Door half-width (segment splitting) |
| `GRAVITY` | 0.55 | Applied to `vy` each frame |
| `PLAYER_SPEED` | 3.2 | Horizontal px/frame |

## Where to find things

| Task | File |
| --- | --- |
| Change physics (gravity, speed, jump) | `constants.ts` |
| Player movement / ladder / wall collision | `entities/player.ts` |
| Enemy AI | `entities/pirates.ts` |
| Pickup logic (keys, doors, portals, treasure) | `entities/pickups.ts` |
| Level layout rules / clearances | `level/index.ts` lines 1–120 |
| Level solvability algorithm | `level/index.ts:506–638` |
| Sprite drawing (player, pirate) | `renderer/entities.ts` |
| Interactive item drawing (doors, keys, chests, portals) | `renderer/items.ts` |
| HUD / game-over / level-clear overlays | `renderer/hud.ts` |
| Floor/wall/ladder drawing | `renderer/floor.ts` |
| Background (ocean, ceiling, bricks) | `renderer/background.ts` |
| React/input/game loop | `Game.tsx` |
| All types | `types.ts` |

## Adding a new entity

1. Add interface to `types.ts`, add array field to `GameState`.
2. Add builder function to `level.ts` (with clearance constants).
3. Call builder in `initState` and `resetLevel` in `gameLogic.ts`.
4. Add update logic to an appropriate `*.ts` file (or a new one).
5. Add draw function to the appropriate `render*.ts` file.
6. Call draw in `renderer.ts` in the correct z-order.
