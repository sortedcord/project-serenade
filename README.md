# Below the Signal

A deliberately low-resolution, first-person exploration game rendered by a classic Canvas 2D grid raycaster. The world is a set of small, seeded tile maps; there is no real 3D renderer or game engine.

## Run

```sh
npm install
npm run dev
npm run build
npm test
```

Open the Vite URL, then click the view to capture the mouse. Pointer lock is optional; keyboard turning works without it. Add `?seed=some-text` to reproduce a generated world.

## Controls

- **W/S** move; **A/D** strafe; **←/→** turn
- **Mouse** turn and look up/down (when captured); **Page Up/Page Down** look up/down without pointer lock
- Walking adds a subtle camera bob that settles when you stop.
- **E** interact with nearby terminals
- **M** toggle the top-down map
- **F3** toggle development stats
- **R** generate a fresh seeded world
- **Escape** pauses and releases mouse capture; press it again to resume. Losing browser focus also pauses. Resume does not require pointer lock; click the view to capture the mouse again.
- In the pause menu, **W/S** or **↑/↓** select **Resume** or **Settings**; **Enter** activates the selection.
- Open **Settings** from the pause menu to adjust walking speed, bobbing rate, mouse look sensitivity, ambient occlusion, minimap size (96–256 pixels), and minimap screen corner. Changes apply immediately and save in this browser; 0% disables occlusion shading. **Done** or **Escape** returns to the pause menu.

An exit is the gold marker on the map; walk into it to travel to another cached submap. Returning through its reciprocal connection restores the original map.

The always-visible minimap follows the player with north at the top. It shows nearby walls/floor, your facing direction, amber props, and gold exits. **M** remains the separate full-map debugger.

## Structure

- `src/engine`: Canvas renderer, DDA raycaster, player, input, collision, sprite projection, game loop
- `src/generation`: seeded random, room/corridor generator, flood fill, map validator, grid distance search
- `src/world`: serializable map/entity/exit contracts and world manager
- `src/themes`: simple atmosphere presets
- `src/debug`: top-down map and development overlay
- `tests`: deterministic generation and grid logic tests

Maps are generated before rendering and validated on creation. The renderer reuses its per-column depth buffers, uses perpendicular DDA distances, and draws billboards only where they are closer than the wall depth. Geometry-based ambient occlusion darkens concave wall corners and wall/floor and wall/ceiling contacts without changing ray distances.
