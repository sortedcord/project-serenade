# Below the Signal

A deliberately low-resolution, first-person exploration game rendered by a classic Canvas 2D grid raycaster. The world is a set of small, seeded tile maps; there is no real 3D renderer or game engine.

## Run

```sh
npm install
npm run dev
npm run build
npm test
```

Open the Vite URL to start at the pause menu. Press **Enter** on **Resume** (or click it) to capture the mouse and begin playing in one action, or press **A** / **Menu** on an Xbox controller to resume without pointer lock. Add `?seed=some-text` to reproduce a generated world. Browsers require a keyboard/mouse gesture for cursor capture; controller look works independently of it.

## Controls

- **W/S** move; **A/D** strafe; **←/→** turn
- **Mouse** turn and look up/down (when captured); **Page Up/Page Down** look up/down without pointer lock
- Walking adds a subtle camera bob that settles when you stop.
- **E** interact with nearby terminals
- **M** toggle the top-down map
- **F3** toggle development stats
- **R** generate a fresh seeded world
- **Escape** pauses and releases mouse capture; press it again to capture the mouse and resume. Losing browser focus also pauses. Mouse/keyboard Resume waits for capture; controller Resume does not need cursor capture.
- In the pause menu, **W/S** or **↑/↓** select **Resume** or **Settings**; **Enter** activates the selection.
- Open **Settings** from the pause menu to adjust walking speed, bobbing rate, mouse look sensitivity, ambient occlusion, minimap size (96–256 pixels), minimap range (8–40 tiles), and minimap screen corner. Changes apply immediately and save in this browser; 0% disables occlusion shading. **Done** or **Escape** returns to the pause menu.
- **Frame rate limit** in Settings: 1–119 FPS, or move the slider fully right for **Unlimited**. Changes take effect immediately and persist on this device.
- **Xbox controller:** left stick move/strafe; right stick turn/look; **A** interact/select; **Y** map; **Menu/Start** pause/resume; **B** pause/back/resume. In menus, **D-pad** or left stick selects controls; **left/right** adjusts sliders/selects; **A** toggles checkboxes/buttons; **B** returns. Disconnecting the controller pauses safely. Focus the page and press a controller button for browser detection; the HUD reports unsupported or blocked API access. If unavailable over LAN HTTP, use HTTPS or localhost. Standard-mapped controllers and unmapped Xbox/XInput IDs are supported.

An exit is the gold marker on the map; walk into it to travel to another cached submap. Returning through its reciprocal connection restores the original map.

The top-right debug panel shows FPS and configurable map, seed, player, room/entity, world, and validation details. Settings let you toggle the panel and each information row, then adjust text opacity (10–100%) and size (8–22 px); all selections save in this browser.
The frameless north-up minimap draws floating wall outlines, faint floor patches, a player arrow, and an occluded view cone directly over gameplay. There is no background plate, border, or circular mask. Seen geometry stays remembered per cached map; current sight is brighter, explored areas dimmer, and unexplored geometry hidden. Features fade individually with world distance. Size controls the HUD footprint; range controls stable zoom and does not change automatically when turning. **M** remains the separate full-map debugger.

## Structure

- `src/engine`: Canvas renderer, DDA raycaster, player, input, collision, sprite projection, game loop
- `src/generation`: seeded random, room/corridor generator, flood fill, map validator, grid distance search
- `src/world`: serializable map/entity/exit contracts and world manager
- `src/themes`: simple atmosphere presets
- `src/debug`: top-down map and development overlay
- `tests`: deterministic generation and grid logic tests

Maps are generated before rendering and validated on creation. The renderer reuses its per-column depth buffers, uses perpendicular DDA distances, and draws billboards only where they are closer than the wall depth. Geometry-based ambient occlusion darkens concave wall corners and wall/floor and wall/ceiling contacts without changing ray distances.
