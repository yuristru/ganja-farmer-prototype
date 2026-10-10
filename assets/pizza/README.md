# Pizza demo assets

The demo uses local, pinned assets so startup does not depend on a CDN or third-party image hosts.

- `city/pixel-city.png`: Pixel city by pixel32, CC0. Original publication: https://opengameart.org/content/pixel-city . Retrieved from https://github.com/matehackers/simate/blob/681a9054255610a74717086db3965befd26b7ada/data/pixel%20city.png . The runtime removes the magenta color key and selects individual building frames from the atlas.
- `furniture/*.png`: Legacy Kenney Furniture Pack 1.0, CC0, retained with its license. These images are no longer loaded by the restaurant. Retrieved from https://github.com/sfu-gdc/gmtk-2022-game/tree/8f1cbed1cfe77a5ceece818c7d75e1a326953cbe/project/art/3d_object/kenney_furniturePack . Original license included in `furniture/LICENSE.txt`.
- `vendor/pixi-8.22.0.mjs`: PixiJS 8.22.0 distribution, MIT. Retrieved from https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.min.mjs . License included in `vendor/PIXI-LICENSE.txt`.

City facades, roads, landscaping and traffic are drawn in the application's Pixi graphics code. Restaurant furniture and guests use the original pixel bitmaps defined in `pizza-sprites.js`. Each bitmap is cached as one flat Pixi Sprite with a measured ground anchor and a fixed directional view. The restaurant contains no 3D models or perspective camera.

The restaurant's floor, walls, sprite artwork and pointer snapping share the 64 by 32 pixel projection in `pizza-layout.js`. Table sprites include all chairs. The 2- and 4-seat groups reserve 2 by 2 grid cells, the 6-seat group 3 by 2, and the 8-seat group 4 by 2; odd quarter turns swap width and height. A snapped preview becomes part of the saved layout only after pressing Setzen or Enter.

Saved layouts now use version 2. Version 1 tables become 4-seat groups; separate legacy chairs are removed because seating is part of the table sprite. Invalid saves revert to the starting layout, while a deliberately empty room remains empty.
