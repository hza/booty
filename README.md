# Booty

Booty remake from the original 1984 ZX Spectrum game by John F. Cain. One level is implemented so far, but more are planned. The game is open source and available on GitHub.

A browser-based 2D platformer game built with React, TypeScript, and HTML5 Canvas. Navigate multi-floor levels, collect keys to unlock doors, grab treasure, and reach the portal — all while dodging patrolling pirates.

## Gameplay

- **Move** — Arrow keys or WASD
- **Jump** — Space or Up arrow
- **Climb ladders** — Up / Down while near a ladder
- Collect numbered **keys** to open matching **doors**
- Collect all **treasure** to unlock the **portal** and advance to the next level
- Avoid **pirates** — you have 3 lives; take a hit and respawn on the current level
- Score points for treasure and keys collected

## Tech Stack

- React 19 + TypeScript
- HTML5 Canvas for rendering
- Vite for bundling and dev server

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## License

[MIT](LICENSE)
