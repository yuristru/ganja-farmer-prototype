# Pizza demo assets

The demo uses local, pinned assets so startup does not depend on a CDN or third-party image hosts.

- `city/italian-*-v2.png`: original Italian city atlases created with the built-in ImageGen tool. Transparent building, landmark and prop sprites; full prompts and integration details are in `city/ART-PROMPTS.md`.
- `city/pixel-city.png`: Pixel city by pixel32, CC0. Retained as the fallback if the new building atlas cannot load. Original publication: https://opengameart.org/content/pixel-city . Retrieved from https://github.com/matehackers/simate/blob/681a9054255610a74717086db3965befd26b7ada/data/pixel%20city.png . The fallback removes the magenta color key and selects individual building frames from the atlas.
- `furniture/*.png`: Legacy Kenney Furniture Pack 1.0, CC0, retained with its license. These images are no longer loaded by the restaurant. Retrieved from https://github.com/sfu-gdc/gmtk-2022-game/tree/8f1cbed1cfe77a5ceece818c7d75e1a326953cbe/project/art/3d_object/kenney_furniturePack . Original license included in `furniture/LICENSE.txt`.
- `vendor/pixi-8.22.0.mjs`: PixiJS 8.22.0 distribution, MIT. Retrieved from https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.min.mjs . License included in `vendor/PIXI-LICENSE.txt`.

City buildings, trees, landmarks and terrace furniture are flat 2D sprites isolated by `pizza-city-art.js`. Roads, paving and waterfront details are original Pixi graphics. Cars use four fixed directional bitmaps defined in `pizza-city-traffic.js`; negative scales never flip them upside down. Restaurant furniture and guests use the original pixel bitmaps defined in `pizza-sprites.js`. Each bitmap is cached as one flat Pixi Sprite with a measured ground anchor and a fixed directional view. Neither scene contains 3D models or a perspective camera.

The city preserves dragging, pinch/wheel zoom, camera position and the tappable Mamma Mia sign. A canal replaces the eastern road below its first block; cars cross on stone bridges and pedestrians stay on the quay. The compact parchment interface has inline SVG icons and working pause, 1x, 3x and 6x controls. Unimplemented game areas remain disabled.

The restaurant's floor, walls, sprite artwork and pointer snapping share the 64 by 32 pixel projection in `pizza-layout.js`. Table sprites include all chairs. The 2- and 4-seat groups reserve 2 by 2 grid cells, the 6-seat group 3 by 2, and the 8-seat group 4 by 2; odd quarter turns swap width and height. A snapped preview becomes part of the saved layout only after pressing Setzen or Enter.

Saved layouts now use version 2. Version 1 tables become 4-seat groups; separate legacy chairs are removed because seating is part of the table sprite. Invalid saves revert to the starting layout, while a deliberately empty room remains empty.

Restaurant furniture is generated as cached flat Canvas pixel bitmaps in
`pizza-sprites.js`, with four fixed isometric views. Gingham cloth, red seat
cushions, dark wood and the brick oven share the 64x32 floor projection.
Each table bitmap contains all 2, 4, 6 or 8 chairs. Wall shutters, flower boxes,
lamps and paneling use that same projection in `pizza-restaurant.js`.

The restaurant now has a 12x10 grid with a separate 4x4 kitchen. Kitchen cells
and the doorway approach are protected against placement, while old v1/v2
layouts remain compatible. Guests only route through dining-room cells.
Restaurant zoom, fit view, hand-mode panning and two-finger zoom use the same
floor coordinates as placement. The kitchen's low cutaway walls preserve the
view of the appliances and keep the one-cell doorway visible.

The furniture catalog (`pizza-catalog.js`) groups ovens, counters, decoration
and tables. Tables contain their chairs: choose plastic, wood or upholstery,
then 2/4/6/8 places. There are 25 purchasable product/size combinations.
The UI displays a price before placement. Only confirmed valid placement
charges the account; canceling or moving a preview costs nothing. Selling
returns half the original paid price. Undo restores furniture and balance
atomically. Version 3 saves both; older layouts retain their furniture and
start with the existing demo balance. Reset restores the demo layout and
account, and can be undone. Fixed decorations and old free furniture have
no sale proceeds.
