# Below the Signal

A deliberately low-resolution, first-person exploration game rendered by a classic Canvas 2D grid raycaster. The world is a set of small, seeded tile maps; there is no real 3D renderer or game engine.

## Run

```sh
npm install
npm run dev
npm run build
npm test
```

Open the Vite URL to start at the pause menu. Press **Enter** on **Resume** (or click it) to capture the mouse and begin playing in one action. Add `?seed=some-text` to reproduce a generated world. Browsers require this user gesture for cursor capture; if capture is refused, the game stays paused and Resume lets you retry.

## Controls

- **W/S** move; **A/D** strafe; **←/→** turn
- **Mouse** turn and look up/down (when captured); **Page Up/Page Down** look up/down without pointer lock
- Walking adds a subtle camera bob that settles when you stop.
- **E** interact with nearby terminals
- **M** toggle the top-down map
- **F3** toggle development stats
- **R** generate a fresh seeded world
- **Escape** pauses and releases mouse capture; press it again to capture the mouse and resume. Losing browser focus also pauses. Gameplay resumes only after mouse capture succeeds; no separate click on the view is needed.
- In the pause menu, **W/S** or **↑/↓** select **Resume** or **Settings**; **Enter** activates the selection.
- Open **Settings** from the pause menu to adjust walking speed, bobbing rate, mouse look sensitivity, ambient occlusion, minimap size (96–256 pixels), and minimap screen corner. Changes apply immediately and save in this browser; 0% disables occlusion shading. **Done** or **Escape** returns to the pause menu.
- **Frame rate limit** in Settings: 1–119 FPS, or move the slider fully right for **Unlimited**. Changes take effect immediately and persist on this device.

An exit is the gold marker on the map; walk into it to travel to another cached submap. Returning through its reciprocal connection restores the original map.

The top-right debug panel shows FPS and configurable map, seed, player, room/entity, world, and validation details. Settings let you toggle the panel and each information row, then adjust text opacity (10–100%) and size (8–22 px); all selections save in this browser.
The soft-edged minimap is a heading-up 2D footprint of the current camera view, using the scene's exact ray hits. It fits visible walls (including distant blocks) instead of cropping to a fixed radius, rotates with your view, and only shows props/exits in front of unblocked rays. Its size and corner remain configurable. **M** remains the separate full-map debugger.

## Structure

- `src/engine`: Canvas renderer, DDA raycaster, player, input, collision, sprite projection, game loop
- `src/generation`: seeded random, room/corridor generator, flood fill, map validator, grid distance search
- `src/world`: serializable map/entity/exit contracts and world manager
- `src/themes`: simple atmosphere presets
- `src/debug`: top-down map and development overlay
- `tests`: deterministic generation and grid logic tests

Maps are generated before rendering and validated on creation. The renderer reuses its per-column depth buffers, uses perpendicular DDA distances, and draws billboards only where they are closer than the wall depth. Geometry-based ambient occlusion darkens concave wall corners and wall/floor and wall/ceiling contacts without changing ray distances.
