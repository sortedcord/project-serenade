You are a senior game-engine and web developer.

I want you to build a small, understandable, browser-based first-person game that visually appears 3D but internally uses a 2D grid and classic raycasting.

The game should resemble early pseudo-3D first-person games in its rendering approach, but it should have a deliberately low-resolution, pixelated, atmospheric presentation.

The main goals are:

- extremely lightweight
- runs directly in a browser
- simple codebase
- easy to understand and modify
- low-resolution pixel-art presentation
- classic raycasting instead of real 3D rendering
- procedurally generated tile-based maps
- multiple interconnected submaps
- billboard sprites for objects and enemies
- deterministic seeded procedural generation
- minimal dependencies
- no full game engine

Do NOT build this as a conventional 3D game.

Do NOT use:

- Three.js
- Babylon.js
- React Three Fiber
- Unity
- Godot
- WebGL frameworks
- physics engines
- full ECS frameworks

unless there is an extremely compelling technical reason.

Prefer Canvas 2D and ordinary TypeScript.

The project should feel intentionally low-tech.

The renderer should create the illusion of a 3D environment from a completely 2D tile grid.

The underlying world should remain simple.

--------------------------------------------------
TECH STACK
--------------------------------------------------

Use:

- TypeScript
- Vite
- HTML5 Canvas 2D
- CSS
- browser-native APIs
- requestAnimationFrame
- Pointer Lock API
- Web Audio API later if necessary
- Vitest for important procedural-generation tests

Avoid unnecessary dependencies.

Do not use React unless there is a significant UI requirement that cannot reasonably be handled with ordinary DOM elements.

For the actual game, plain TypeScript + HTML + Canvas is preferred.

The project should run with roughly:

npm install
npm run dev

and build with:

npm run build

Keep configuration minimal.

--------------------------------------------------
OVERALL ARCHITECTURE
--------------------------------------------------

Separate the game into several clear systems:

Game
Renderer
Raycaster
Player
Input
Collision
WorldManager
GameMap
ProceduralGenerator
MapValidator
SpriteRenderer
TextureManager
Debug tools

The renderer should only render the current game state.

The procedural generator should only create maps.

The validator should verify maps.

The WorldManager should manage which map is currently loaded and transitions between maps.

Avoid giant files containing unrelated responsibilities.

At the same time, do not over-engineer the project into dozens of abstractions.

Favor simple modules.

--------------------------------------------------
CORE WORLD REPRESENTATION
--------------------------------------------------

The entire world should fundamentally be represented using a 2D tile grid.

Example:

111111111111
100000000001
100022220001
100020020001
100020000001
100000003001
100000000001
111111111111

Tile IDs represent walls or empty floor.

Example convention:

0 = empty / walkable floor

1 = wall material 1

2 = wall material 2

3 = wall material 3

4 = wall material 4

Future tile values may represent:

10 = closed door

11 = special wall

12 = secret wall

Centralize these values in a TileTypes enum or constant definition.

Do not scatter raw magic numbers across the codebase.

--------------------------------------------------
GAME MAP STRUCTURE
--------------------------------------------------

Create a GameMap interface or equivalent.

Something approximately like:

interface GameMap {
  id: string;

  width: number;
  height: number;

  tiles: number[][];

  playerSpawn: {
    x: number;
    y: number;
    angle: number;
  };

  entities: MapEntity[];

  exits: MapExit[];

  metadata: {
    title?: string;
    theme?: string;
    seed?: string;
  };
}

Entities and exits should not be encoded directly into ordinary wall tiles unless there is a very good reason.

Keep walls, entities, and world transitions conceptually separate.

--------------------------------------------------
FIRST VERSION TARGET
--------------------------------------------------

The first complete prototype should support:

- raycast rendering
- solid walls
- player movement
- collision
- mouse look
- keyboard turning
- low-resolution pixel scaling
- multiple wall materials
- distance shading
- billboard sprites
- procedural room generation
- procedural corridors
- seeded randomness
- basic map validation
- multiple interconnected submaps
- map transitions
- debug top-down map

The game does NOT need combat immediately.

The game does NOT need advanced AI immediately.

The game does NOT need sophisticated art.

The core experience should simply be satisfying to walk through.

--------------------------------------------------
RENDERING RESOLUTION
--------------------------------------------------

Render internally at a deliberately small resolution.

Default:

320 x 180

Make this configurable.

The canvas should be scaled to fill the available browser window.

Use CSS such as:

image-rendering: pixelated;

Avoid smoothing or filtering.

The result should look deliberately chunky.

Do not render natively at full browser resolution unless required for UI overlays.

--------------------------------------------------
RAYCASTING
--------------------------------------------------

Implement a traditional grid-based raycaster.

Use DDA:

Digital Differential Analysis.

For each vertical screen column:

1. calculate camera-space X
2. calculate ray direction
3. determine current map square
4. calculate ray delta distances
5. determine step direction
6. calculate initial side distance
7. traverse the tile grid using DDA
8. stop when a solid tile is encountered
9. calculate perpendicular wall distance
10. calculate projected wall height
11. determine texture hit coordinate
12. render the appropriate vertical wall slice

Do not simply use Euclidean distance from the player to the hit position.

Use perpendicular wall distance so that walls do not exhibit fisheye distortion.

--------------------------------------------------
PLAYER CAMERA MODEL
--------------------------------------------------

Prefer the classic direction-vector + camera-plane camera model.

For example:

player.positionX
player.positionY

player.directionX
player.directionY

player.planeX
player.planeY

The direction vector represents where the player is looking.

The camera plane controls the field of view.

Keep the field of view configurable.

An initial FOV around 60–70 degrees is reasonable.

Do not hardcode every camera constant throughout the renderer.

--------------------------------------------------
RAYCASTER OUTPUT
--------------------------------------------------

The raycaster should produce enough information for rendering and sprite occlusion.

For each screen column, retain:

- perpendicular wall distance
- wall type
- side hit
- texture coordinate
- projected start and end Y

Maintain a reusable depth buffer.

Example:

depthBuffer[x] = perpendicularWallDistance

Reuse the same array every frame instead of creating a new one.

--------------------------------------------------
WALL RENDERING
--------------------------------------------------

Begin with solid-color wall rendering.

Do not block early progress on textures.

Phase 1 can simply render different wall IDs using different flat colors.

Once basic rendering works, add textures.

Recommended texture size:

32x32

or:

64x64

Textures should intentionally be small.

--------------------------------------------------
TEXTURE SYSTEM
--------------------------------------------------

Create a simple wall material abstraction.

Example:

interface WallMaterial {
  id: number;

  texture:
    | ImageData
    | HTMLCanvasElement
    | HTMLImageElement;
}

Map tile IDs should correspond to wall materials.

For the first prototype, generate placeholder textures procedurally.

Examples:

concrete

brick

rusted metal

industrial panel

stone

tiles

Make them visually distinct.

Later, PNG textures can replace these placeholder textures.

--------------------------------------------------
WALL TEXTURE SAMPLING
--------------------------------------------------

When a ray hits a wall:

calculate exactly where along the wall the ray hit.

Convert that fractional coordinate into the texture X coordinate.

Then draw the corresponding texture column vertically.

Make sure the texture orientation does not visibly flip incorrectly depending on direction.

--------------------------------------------------
SIDE SHADING
--------------------------------------------------

Make walls easier to visually distinguish by applying slight shading depending on which side of the tile was hit.

For example:

north/south facing surfaces

versus

east/west facing surfaces

One set can be slightly darker.

Keep the effect subtle.

--------------------------------------------------
DISTANCE SHADING
--------------------------------------------------

Implement distance-based darkening.

A simple model is sufficient.

Conceptually:

brightness =
1 - distance / fogDistance

Then clamp brightness.

Do not allow walls to become entirely invisible unless intentionally desired.

Expose configuration such as:

fogDistance

minimumBrightness

ambientBrightness

Distance shading is important for atmosphere and visual depth.

--------------------------------------------------
CEILING
--------------------------------------------------

Initially render the ceiling as a flat color.

Do not implement complex ceiling textures in the first version.

Make the ceiling color configurable by map metadata later.

--------------------------------------------------
FLOOR
--------------------------------------------------

Initially render the floor as a flat color.

Do not implement floor casting during the earliest milestone.

Floor casting may be added later if it improves presentation.

The first playable version should not depend on it.

--------------------------------------------------
SPRITES
--------------------------------------------------

Implement billboard sprites.

These should always face the camera.

Use them for:

- lamps
- crates
- barrels
- plants
- furniture
- terminals
- pickups
- corpses
- signs
- decorative objects
- enemies later

Create a generic entity representation.

For example:

interface MapEntity {
  id: string;

  type: string;

  x: number;
  y: number;

  rotation?: number;

  properties?: Record<string, unknown>;
}

--------------------------------------------------
SPRITE PROJECTION
--------------------------------------------------

Transform each sprite from world coordinates into camera space.

Calculate:

relative position

inverse camera matrix

camera-space X

camera-space depth

projected screen X

projected sprite height

projected sprite width

Draw sprites from farthest to nearest or otherwise ensure correct overlap.

Use the wall depth buffer to prevent sprites from appearing through walls.

A sprite pixel should only be drawn when its depth is closer than the corresponding wall depth.

--------------------------------------------------
SPRITE TRANSPARENCY
--------------------------------------------------

Eventually support transparent PNG sprites.

For placeholder development sprites, simple generated canvas textures are fine.

Use nearest-neighbor rendering.

Do not blur sprite edges.

--------------------------------------------------
PLAYER CONTROLS
--------------------------------------------------

Implement:

W = move forward

S = move backward

A = strafe left

D = strafe right

Mouse = turn

Left Arrow = rotate left

Right Arrow = rotate right

E = interact

M = toggle debug map

Escape = release pointer lock

Click game canvas = enter pointer lock

--------------------------------------------------
POINTER LOCK
--------------------------------------------------

Use the Pointer Lock API for mouse look.

Do not require pointer lock for basic functionality.

Keyboard turning must continue to work.

When pointer lock is inactive, optionally display a simple message such as:

"Click to capture mouse"

Keep it minimal.

--------------------------------------------------
MOVEMENT
--------------------------------------------------

Movement must be frame-rate independent.

Use:

deltaTime

in seconds.

Conceptually:

position += direction * speed * deltaTime

Rotation must also use delta time if driven by keyboard controls.

Mouse movement can directly affect rotation based on relative mouse movement.

--------------------------------------------------
COLLISION
--------------------------------------------------

The player should have a radius.

Do not treat the player as a zero-width point.

Use simple circle-vs-grid collision or equivalent.

Movement should attempt X and Y separately so the player can slide along walls.

Conceptually:

try X movement

if valid:
apply X

try Y movement

if valid:
apply Y

This avoids getting stuck when moving diagonally against a wall.

--------------------------------------------------
PLAYER CONFIGURATION
--------------------------------------------------

Centralize important player constants:

movement speed

strafe speed

rotation speed

mouse sensitivity

collision radius

field of view

Do not scatter them across multiple files.

--------------------------------------------------
GAME LOOP
--------------------------------------------------

Use:

requestAnimationFrame

The game loop should approximately be:

calculate delta time

read input

update player

update world

update entities

render scene

render UI/debug overlay

Keep simulation separate from rendering as much as practical.

Do not put procedural generation inside render().

--------------------------------------------------
FRAME TIMING
--------------------------------------------------

Clamp very large delta times.

For example, if the browser tab becomes inactive, returning to the game should not cause the player to suddenly travel through walls.

A reasonable clamp might be around:

0.05–0.1 seconds

depending on implementation.

--------------------------------------------------
PROCEDURAL GENERATION
--------------------------------------------------

Implement procedural map generation without relying on external services.

Start with a simple room-and-corridor generator.

This is the primary procedural-generation system.

--------------------------------------------------
SEEDED RANDOMNESS
--------------------------------------------------

Do not use Math.random() directly for important world generation.

Create a deterministic seeded random-number generator.

The same seed and generation parameters should generate the same map.

Benefits:

- reproducibility
- debugging
- shareable seeds
- automated testing
- stable world generation

Expose helper methods such as:

random()

integer(min, max)

float(min, max)

chance(probability)

pick(array)

shuffle(array)

--------------------------------------------------
MAP GENERATOR INPUT
--------------------------------------------------

The generator should accept parameters such as:

seed

width

height

minimum room size

maximum room size

minimum room count

maximum room count

corridor width

loop chance

wall material distribution

prop density

--------------------------------------------------
INITIAL MAP SIZE
--------------------------------------------------

Start with something around:

32x32

or:

40x40

Do not start with giant levels.

Small maps make generation easier to understand and debug.

--------------------------------------------------
ROOM GENERATION
--------------------------------------------------

Basic algorithm:

1. create a grid filled entirely with walls
2. attempt to create random rectangular rooms
3. reject rooms that overlap existing rooms too heavily
4. carve accepted rooms into floor
5. store room metadata
6. connect rooms
7. place player spawn
8. place exits
9. place entities
10. validate map

--------------------------------------------------
ROOM STRUCTURE
--------------------------------------------------

Represent generated rooms explicitly.

For example:

interface GeneratedRoom {
  id: string;

  x: number;
  y: number;

  width: number;
  height: number;

  centerX: number;
  centerY: number;

  type?: string;
}

Keep this data even after carving tiles.

It will be useful for:

- exits
- entities
- debug rendering
- future room themes
- encounter placement

--------------------------------------------------
ROOM COLLISION
--------------------------------------------------

Rooms should have some spacing between them.

Do not allow every room to touch its neighbors.

Add configurable padding.

Example:

roomPadding = 1

or:

roomPadding = 2

--------------------------------------------------
CORRIDOR GENERATION
--------------------------------------------------

Initially connect room centers using simple L-shaped corridors.

For example:

horizontal then vertical

or:

vertical then horizontal

Choose orientation randomly.

This is perfectly acceptable for the first generator.

Later you may improve corridors with:

- A*
- winding corridors
- branching tunnels
- variable widths

But do not start there.

--------------------------------------------------
CONNECTIVITY
--------------------------------------------------

The map must always have a connected required path.

A simple initial strategy is:

sort rooms in some order

connect room 0 to room 1

room 1 to room 2

room 2 to room 3

and so on

This guarantees basic connectivity.

Afterward, optionally add extra connections to create loops.

--------------------------------------------------
LOOPS
--------------------------------------------------

Linear maps can feel artificial.

Add some optional extra room-to-room connections.

Expose something like:

loopChance

or:

extraConnectionCount

Do not make every room connected to every other room.

The resulting map should remain readable.

--------------------------------------------------
DEAD ENDS
--------------------------------------------------

Allow some dead-end rooms.

Dead ends are useful for:

- secrets
- pickups
- atmosphere
- optional exploration

But avoid producing maps where most branches go nowhere.

Keep this tunable.

--------------------------------------------------
EXIT PLACEMENT
--------------------------------------------------

A generated map should usually have at least one exit.

Choose a room reasonably distant from the spawn room.

Do not simply place the exit in a random neighboring room.

Use BFS or graph distance to identify distant candidate rooms.

This gives the player a reason to explore.

--------------------------------------------------
PLAYER SPAWN
--------------------------------------------------

Spawn the player inside a valid room.

Prefer a room away from the exit.

The spawn must always be:

inside bounds

on walkable floor

not overlapping an entity

not inside a wall

--------------------------------------------------
ENTITIES
--------------------------------------------------

Add basic procedural prop placement.

Initial props can include:

crates

barrels

lamps

terminals

decorative objects

Do not place props completely randomly.

Place them inside rooms.

Avoid blocking corridors.

Avoid placing objects directly on the player's spawn.

Avoid placing objects on exits.

--------------------------------------------------
MAP VALIDATION
--------------------------------------------------

Create a MapValidator.

Do not trust the generator merely because it usually works.

Validate every generated map.

Checks should include:

map dimensions are valid

tile rows have correct width

player spawn is inside bounds

player spawn is walkable

exits are inside bounds

exits are on valid floor

required exit is reachable

entities are inside bounds

entities are not inside walls

outer map boundary is sufficiently sealed

enough walkable area exists

map is not almost completely walls

map is not almost completely empty floor

--------------------------------------------------
FLOOD FILL
--------------------------------------------------

Implement BFS or flood fill.

Starting from the player's spawn:

visit all walkable cells.

Use this to determine:

whether exits are reachable

how much of the map is connected

which tiles are inaccessible

This should be deterministic and simple.

--------------------------------------------------
GENERATION FAILURE
--------------------------------------------------

If the generated map is invalid:

do not crash.

Either:

repair the map

or:

generate a new map using a derived seed.

Limit retries.

For example:

attempt up to 10 generation passes

Then report a clear development error.

The game should not enter an infinite generation loop.

--------------------------------------------------
SUBMAP SYSTEM
--------------------------------------------------

Do not make the whole game one enormous level.

Use multiple interconnected maps.

Each map is a separate 2D tile grid.

Example world:

Maintenance Tunnels
↓
Pump Station
↓
Storage Sector
↓
Research Wing
↓
Freight Elevator

Each location can be around:

24x24

32x32

48x48

depending on the intended density.

--------------------------------------------------
MAP EXIT STRUCTURE
--------------------------------------------------

Represent exits explicitly.

Example:

interface MapExit {
  id: string;

  x: number;
  y: number;

  direction:
    | "north"
    | "south"
    | "east"
    | "west";

  targetMapId?: string;

  targetExitId?: string;
}

An exit should be able to connect two submaps.

--------------------------------------------------
WORLD MANAGER
--------------------------------------------------

Create a WorldManager.

Responsibilities:

current map

map cache

map generation

map transitions

world seed

known map connections

player placement after transitions

Do not make Game.ts own all of this state.

--------------------------------------------------
WORLD STATE
--------------------------------------------------

Something approximately like:

interface WorldState {
  worldSeed: string;

  currentMapId: string;

  maps: Record<string, GameMap>;

  discoveredMapIds: string[];
}

When a map has already been generated, store it.

Returning to that map should load the same map.

Do not regenerate it.

--------------------------------------------------
MAP TRANSITIONS
--------------------------------------------------

When the player reaches an exit:

1. identify destination
2. load destination if it already exists
3. otherwise generate it
4. save generated destination
5. change current map
6. move player to corresponding entry point
7. preserve orientation appropriately
8. resume gameplay

A short fade or loading transition may be added later.

--------------------------------------------------
PERSISTENCE MODEL
--------------------------------------------------

Architect the world so it can eventually be serialized.

Do not implement a complicated save system immediately.

But avoid storing critical state in unserializable closures.

A future save should reasonably contain:

world seed

generated maps

current map ID

player position

player orientation

discovered areas

entity states

--------------------------------------------------
DEBUG MAP
--------------------------------------------------

Implement a top-down debug map.

Toggle it using:

M

The debug map should show:

wall tiles

floor tiles

player position

player viewing direction

entities

exits

rooms if available

Optionally show live ray lines.

--------------------------------------------------
DEBUG OVERLAY
--------------------------------------------------

Create a development overlay showing:

FPS

player X

player Y

player angle

current map ID

current seed

number of rooms

number of entities

validator status

This can be toggled.

Do not make the production game dependent on it.

--------------------------------------------------
REGENERATION DEBUG KEY
--------------------------------------------------

During development, add a key such as:

R

to generate a fresh procedural map.

Display the new seed.

This makes testing much faster.

If using R conflicts with future controls, move this to another debug-only key.

--------------------------------------------------
REPRODUCING BUGS
--------------------------------------------------

If generation fails, log:

seed

map size

room count

generator parameters

validator errors

Example:

Map generation failed

seed: sector-1283992
size: 32x32
rooms: 7
reason: exit unreachable

It should be easy to reproduce problematic maps.

--------------------------------------------------
MAP THEMES
--------------------------------------------------

Support simple map themes eventually.

A theme can control:

wall textures

floor color

ceiling color

fog distance

ambient brightness

prop set

Examples:

industrial

concrete bunker

sewer

laboratory

maintenance

stone dungeon

warehouse

Do not build a complicated theme editor.

A plain configuration object is sufficient.

--------------------------------------------------
SAMPLE THEME STRUCTURE
--------------------------------------------------

Something approximately like:

interface MapTheme {
  id: string;

  wallMaterials: number[];

  floorColor: string;

  ceilingColor: string;

  fogDistance: number;

  minimumBrightness: number;

  propTypes: string[];
}

--------------------------------------------------
LIGHTING
--------------------------------------------------

Do not implement true dynamic lighting initially.

Use:

distance shading

wall-side shading

material brightness

possibly simple sprite glow effects

This is enough to create atmosphere.

Actual dynamic lighting can come much later.

--------------------------------------------------
DOORS
--------------------------------------------------

Do not implement doors until the raycaster and map generator are stable.

When doors are added, treat them as special map objects or tile types.

Possible states:

closed

opening

open

closing

Simple sliding doors are appropriate.

Do not build advanced physics.

--------------------------------------------------
INTERACTION SYSTEM
--------------------------------------------------

Implement a basic interaction concept around:

E

The player should be able to interact with nearby entities or doors.

Use a small maximum interaction distance.

Potential implementation:

cast a short ray from the player

find nearest interactable target

trigger its interaction

Keep it generic enough for:

doors

terminals

pickups

switches

--------------------------------------------------
ENEMIES
--------------------------------------------------

Enemies are not an MVP requirement.

After sprite rendering is stable, a simple enemy can be added.

Initial enemy states:

idle

alert

chase

attack

Use simple pathfinding if necessary.

Do not implement advanced behavior trees.

--------------------------------------------------
PATHFINDING
--------------------------------------------------

Do not implement A* until actually needed.

BFS is enough for:

connectivity checking

distance calculations

simple reachability

When enemies need navigation or corridors need more complex paths, implement A*.

Keep grid pathfinding generic.

--------------------------------------------------
SOUND
--------------------------------------------------

Audio is optional for the first version.

If added, use:

Web Audio API

or normal HTMLAudioElement where appropriate.

Keep audio simple.

Potential sounds:

footsteps

door opening

ambient drone

machinery

enemy alert

Do not block core development on sound.

--------------------------------------------------
ATMOSPHERE
--------------------------------------------------

Prioritize environmental atmosphere through simple rendering techniques.

Useful effects:

low resolution

darkness

fog

limited visibility

slightly uneven wall textures

subtle flickering

sparse objects

long corridors

room contrast

large dark spaces

Avoid complicated post-processing.

--------------------------------------------------
PROCEDURAL TEXTURES
--------------------------------------------------

For early development, procedurally generate tiny pixel textures.

Examples:

concrete:

random gray noise

horizontal seams

small cracks

brick:

repeating brick pattern

subtle variation

industrial panel:

rectangular sections

bolts

warning stripes

These textures do not need to look polished.

They only need to communicate material differences.

--------------------------------------------------
PROJECT STRUCTURE
--------------------------------------------------

Use something roughly like:

src/
  main.ts

  engine/
    Game.ts
    Renderer.ts
    Raycaster.ts
    SpriteRenderer.ts
    Input.ts
    Player.ts
    Collision.ts
    TextureManager.ts

  world/
    GameMap.ts
    WorldManager.ts
    WorldState.ts
    TileTypes.ts
    MapExit.ts
    MapEntity.ts

  generation/
    ProceduralGenerator.ts
    RoomGenerator.ts
    CorridorGenerator.ts
    EntityPlacer.ts
    MapValidator.ts
    SeededRandom.ts
    FloodFill.ts
    Pathfinding.ts

  themes/
    MapTheme.ts
    themes.ts

  debug/
    DebugOverlay.ts
    DebugMapRenderer.ts

  assets/
    textures/
    sprites/

tests/
  generation/
  validator/
  pathfinding/

index.html

Do not force this exact structure if something cleaner becomes obvious.

But preserve separation between:

rendering

world state

generation

validation

input

debugging

--------------------------------------------------
PHASE 1
BASIC RAYCASTER
--------------------------------------------------

Start here.

Create:

Vite TypeScript project

320x180 Canvas

hardcoded map

solid-colored walls

W/S movement

keyboard turning

wall collision

DDA raycasting

flat floor

flat ceiling

Acceptance criterion:

I can open the browser and walk through a fake-3D environment produced from a 2D grid.

Do not implement procedural maps before this works properly.

--------------------------------------------------
PHASE 2
PLAYER CONTROLS
--------------------------------------------------

Add:

A/D strafing

Pointer Lock API

mouse look

keyboard fallback

delta-time movement

player radius collision

wall sliding

Acceptance criterion:

movement feels predictable and smooth.

--------------------------------------------------
PHASE 3
PIXEL PRESENTATION
--------------------------------------------------

Add:

pixelated canvas scaling

responsive fullscreen layout

distance fog

wall-side shading

simple configurable FOV

Acceptance criterion:

the game clearly looks intentionally low resolution rather than simply unfinished.

--------------------------------------------------
PHASE 4
TEXTURES
--------------------------------------------------

Add:

TextureManager

multiple wall materials

procedurally generated wall textures

texture-coordinate calculation

vertical texture sampling

Acceptance criterion:

different wall tile IDs visually correspond to different materials.

--------------------------------------------------
PHASE 5
DEPTH BUFFER
--------------------------------------------------

Create and populate depthBuffer.

Reuse it every frame.

Acceptance criterion:

depth data is available for sprite rendering.

--------------------------------------------------
PHASE 6
SPRITES
--------------------------------------------------

Add:

MapEntity

billboard projection

sprite scaling

transparent sprite rendering

wall occlusion

simple prop

Acceptance criterion:

a prop hidden behind a wall does not render through that wall.

--------------------------------------------------
PHASE 7
STRUCTURED MAPS
--------------------------------------------------

Remove dependence on the hardcoded map.

Create:

GameMap

map loader

map switching

basic map structure validation

Acceptance criterion:

the same raycaster can render multiple maps without code changes.

--------------------------------------------------
PHASE 8
SEEDED RANDOM GENERATION
--------------------------------------------------

Implement SeededRandom.

Create procedural maps containing:

rectangular rooms

corridors

spawn

exit

walls

Acceptance criterion:

new seeds generate different but reproducible levels.

--------------------------------------------------
PHASE 9
MAP VALIDATION
--------------------------------------------------

Implement:

BFS/flood fill

spawn validation

exit validation

connectivity checks

entity placement checks

map dimension checks

Acceptance criterion:

invalid maps are rejected automatically.

--------------------------------------------------
PHASE 10
GENERATION STRESS TESTS
--------------------------------------------------

Write tests that generate many maps.

Example:

1000 seeds

Verify:

no unexpected exceptions

spawn valid

exit reachable

map dimensions correct

all critical positions valid

Acceptance criterion:

procedural generation is robust enough for normal gameplay.

--------------------------------------------------
PHASE 11
DEBUG MAP
--------------------------------------------------

Add:

top-down map

player direction

rooms

entities

exits

seed display

Acceptance criterion:

generation issues can be understood visually.

--------------------------------------------------
PHASE 12
SUBMAP SYSTEM
--------------------------------------------------

Implement WorldManager.

Generate and cache multiple maps.

Create exits that connect them.

Acceptance criterion:

player can travel:

Map A
→ Map B
→ Map C
→ Map B
→ Map A

and the previously generated maps remain unchanged.

--------------------------------------------------
PHASE 13
ROOM VARIATION
--------------------------------------------------

Add optional generated room categories such as:

small room

large room

storage room

hall

junction

dead end

hub

Do not make them radically different systems.

They should remain variations on ordinary carved spaces.

--------------------------------------------------
PHASE 14
THEMES
--------------------------------------------------

Create several lightweight map themes.

Example:

industrial

sewer

bunker

laboratory

Each theme changes:

wall materials

ceiling/floor colors

fog

prop distribution

Acceptance criterion:

two maps using different themes have noticeably different atmosphere while using the same renderer.

--------------------------------------------------
PHASE 15
INTERACTION
--------------------------------------------------

Add:

interaction ray

simple interactable interface

one door or switch

Acceptance criterion:

E can interact with an object in front of the player.

--------------------------------------------------
PHASE 16
OPTIONAL GAMEPLAY
--------------------------------------------------

Only after the previous systems work, consider:

enemies

health

weapons

pickups

keys

locked doors

objectives

Do not build these before the exploration engine is stable.

--------------------------------------------------
PERFORMANCE
--------------------------------------------------

Target smooth gameplay on normal desktop browsers.

Default render resolution:

320x180

This means approximately 320 rays per frame.

Do not prematurely optimize.

Still follow common-sense performance practices:

avoid unnecessary per-frame allocations

reuse depth arrays

cache textures

do not parse maps every frame

do not generate maps inside render()

do not recalculate static information unnecessarily

--------------------------------------------------
FRAME RATE
--------------------------------------------------

Aim for:

60 FPS

but ensure the game behaves correctly at:

30 Hz

60 Hz

120 Hz

144 Hz

and other refresh rates.

Never base movement directly on the number of frames rendered.

--------------------------------------------------
MEMORY
--------------------------------------------------

Submaps are small.

It is acceptable to keep multiple generated maps in memory.

Do not introduce streaming complexity until it is demonstrably needed.

--------------------------------------------------
SAVE SYSTEM
--------------------------------------------------

Do not implement full saves during the early phases.

But ensure that state is serializable.

A future save format should be able to store:

world seed

generated maps

current map

player coordinates

player direction

entity state

discovered maps

Avoid storing critical gameplay state only inside class internals that cannot easily be serialized.

--------------------------------------------------
TESTING
--------------------------------------------------

Prioritize automated tests for logic.

Important test targets:

seeded RNG

room placement

room overlap

corridor carving

BFS

map connectivity

validator

procedural map generation

exit reachability

serialization where applicable

Rendering can primarily be visually tested.

Procedural correctness should be machine-tested.

--------------------------------------------------
ERROR HANDLING
--------------------------------------------------

Do not silently swallow errors.

In development mode, errors should provide meaningful details.

For generation errors, include:

seed

map size

generator options

validator failure

Example:

Procedural generation failed

Seed:
maintenance-14233

Map:
32x32

Reason:
exit unreachable from player spawn

This should be enough to reproduce the problem.

--------------------------------------------------
CODE QUALITY
--------------------------------------------------

Use strong TypeScript typing.

Avoid widespread `any`.

Avoid unnecessary generics.

Avoid giant classes.

Avoid functions hundreds of lines long.

Prefer clear names.

Add comments where algorithms are not immediately obvious.

In particular, document:

DDA raycasting

camera transformation

texture sampling

sprite projection

procedural room generation

flood fill

seeded randomness

--------------------------------------------------
DO NOT OVERENGINEER
--------------------------------------------------

This is particularly important.

Do not turn this project into a generalized engine.

Avoid:

complex ECS

plugin systems

dependency injection frameworks

render graphs

scene graphs

generic asset pipelines

custom scripting languages

editor applications

network architecture

serialization frameworks

component registries

runtime reflection

massive configuration systems

Build the simplest architecture that supports the game.

--------------------------------------------------
NON-GOALS
--------------------------------------------------

For the initial version, do NOT implement:

real 3D polygon rendering

vertical floors

true slopes

jumping

crouching

physics simulation

ragdolls

dynamic shadows

real-time global illumination

multiplayer

accounts

backend servers

database systems

network synchronization

crafting

skill trees

dialogue trees

large inventories

huge open worlds

voxel terrain

WebGPU

complex shaders

destructible geometry

level editors

mod support

mobile controls

VR

--------------------------------------------------
POSSIBLE FUTURE FEATURES
--------------------------------------------------

Only consider these once the core project is solid:

doors

keys

locked areas

secret walls

enemy AI

simple combat

weapons

pickup items

notes

terminals

environmental storytelling

sound effects

ambient audio

animated textures

flickering lights

animated sprites

larger submaps

more map themes

save/load

minimap

procedural missions

simple NPCs

dynamic world events

--------------------------------------------------
DEVELOPMENT PHILOSOPHY
--------------------------------------------------

When deciding between two solutions, prefer:

simple over clever

readable over compressed

deterministic over unpredictable

seeded over Math.random()

Canvas 2D over real 3D

small maps over giant maps

validated generation over assuming generation worked

plain TypeScript over large frameworks

working implementation over architectural perfection

clear debugging over hidden behavior

--------------------------------------------------
WORKFLOW
--------------------------------------------------

Before making major changes:

inspect the repository.

If it is empty, initialize the project.

Then proceed through the phases.

Do not spend the entire session writing architectural documents.

Implement working code.

At each phase:

1. make the smallest usable implementation
2. run the project
3. run the build
4. run tests where appropriate
5. fix errors
6. preserve existing functionality
7. continue

Do not perform enormous speculative rewrites.

Keep the project playable throughout development.

--------------------------------------------------
FIRST MAP
--------------------------------------------------

For the very first raycasting milestone, use a hardcoded map such as:

1111111111111111
1000000000000001
1000000000000001
1000111111000001
1000100001000001
1000100001000001
1000100001000001
1000111111000001
1000000000000001
1000000000000001
1000000110000001
1000000110000001
1000000000000001
1000000000000001
1000000000000001
1111111111111111

Player starts around:

x = 2.5
y = 2.5

looking generally east or south.

Do not worry about visual polish yet.

--------------------------------------------------
EARLIEST SUCCESS CRITERION
--------------------------------------------------

The first milestone is successful when I can:

open the project

click the canvas

walk forward and backward

strafe

turn

collide with walls

look around a pseudo-3D environment

and understand that it is rendered from a simple 2D tilemap.

--------------------------------------------------
SECOND SUCCESS CRITERION
--------------------------------------------------

The next major milestone is successful when:

procedural maps can be generated from seeds

maps have rooms and corridors

spawn is valid

exit is reachable

bad maps are detected

maps can be viewed in the top-down debugger

--------------------------------------------------
THIRD SUCCESS CRITERION
--------------------------------------------------

The next major milestone is successful when:

multiple procedurally generated submaps exist

exits connect them

maps are cached

returning to an older submap restores exactly the same environment

--------------------------------------------------
FINAL PRODUCT DIRECTION
--------------------------------------------------

The game should feel like exploring a strange, low-resolution first-person world.

The player sees a pseudo-3D environment.

Internally, the implementation remains simple:

2D tile grids
+
DDA raycasting
+
billboard sprites
+
seeded procedural generation
+
map validation
+
small interconnected submaps
+
persistent world state

The game should get atmosphere from:

layout

darkness

fog

textures

scale

spacing

environmental props

and exploration

rather than from rendering complexity.

The engine should remain small enough that one developer can reasonably understand the entire project.

That simplicity is a feature.

--------------------------------------------------
WHAT I WANT YOU TO DO NOW
--------------------------------------------------

Inspect the repository.

If necessary, initialize:

Vite
+
TypeScript

Then immediately begin Phase 1.

Do not only describe how to implement it.

Write the code.

Run the development/build commands yourself where possible.

Fix TypeScript errors.

Verify the build.

Keep the implementation straightforward.

Once the basic raycaster works, continue incrementally through the phases above.

For minor engineering decisions, use your own judgment rather than repeatedly asking questions.

Prioritize creating a working, understandable browser game.
