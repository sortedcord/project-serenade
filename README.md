# Project Serenade

A small browser-based exploration game built around a simple idea: make a 2D tile map feel like a low-resolution 3D world. Serenade draws each frame on an HTML Canvas with a grid raycaster; it does not use a 3D engine.

## Run locally

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To build the production bundle or run the tests:

```sh
npm run build
npm test
```

The game starts paused. Choose **Resume** to begin. Add `?seed=some-text` to the URL to generate the same starting world again.

## Play

| Input | Action |
| --- | --- |
| W / S | Move forward / backward |
| A / D | Strafe |
| Left / Right arrows | Turn |
| Mouse | Look around while captured |
| Page Up / Page Down | Look vertically without pointer lock |
| E | Interact with a nearby terminal |
| M | Toggle the full map |
| F3 | Toggle the debug panel |
| R | Generate a new world |
| Escape | Pause and release the mouse; press again to resume |

An Xbox-compatible gamepad can also move and look, interact, navigate menus, and pause. In menus, use the D-pad or left stick to move between controls, **A** to select, and **B** to go back. The browser may require a button press while the game page is focused before it detects a controller.

The gold marker on the map is an exit. Walk into it to move to another submap; returning through the paired exit restores the earlier map. Open **Settings** from the pause menu to adjust movement, camera response, frame-rate limit, ambient occlusion, minimap size and range, and debug-panel display. Settings are saved in the browser.

## How it works

- **Rendering:** TypeScript, Canvas 2D, and a grid DDA raycaster create the pseudo-3D view. Wall depth is reused for sprite occlusion; shading includes distance falloff and configurable ambient occlusion.
- **Lighting:** Local lamp illumination is baked into a world-anchored light map when a map is first used, avoiding per-frame map scans and light rays; ambient brightness and fog remain renderer-controlled.
- **Worlds:** A seeded generator builds and validates tile maps, then links them into a traversable world of cached submaps.
- **Exploration:** The frameless minimap remembers seen geometry per map. The separate full map and performance panel are optional debugging tools.

## Project layout

- `src/engine` — game loop, renderer, raycasting, movement, input, settings, and HUD
- `src/generation` — seeded map generation, validation, and grid algorithms
- `src/world` — maps, entities, exits, and transitions
- `src/content` — authored game content, including map atmosphere presets
- `src/debug` — full-map and debug overlays
- `tests` — generation, map, rendering, input, and settings tests

The main stack is TypeScript, Vite, and Vitest. There is no full game engine or 3D rendering framework.