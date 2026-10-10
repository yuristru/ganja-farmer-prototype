# Pizza demo assets

The demo uses local, pinned assets so startup does not depend on a CDN or third-party image hosts.

- `city/pixel-city.png`: Pixel city by pixel32, CC0. Original publication: https://opengameart.org/content/pixel-city . Retrieved from https://github.com/matehackers/simate/blob/681a9054255610a74717086db3965befd26b7ada/data/pixel%20city.png . The runtime removes the magenta color key and selects individual building frames from the atlas.
- `furniture/*.png`: Kenney Furniture Pack 1.0, CC0. Retrieved from https://github.com/sfu-gdc/gmtk-2022-game/tree/8f1cbed1cfe77a5ceece818c7d75e1a326953cbe/project/art/3d_object/kenney_furniturePack . Original license included in `furniture/LICENSE.txt`.
- `vendor/pixi-8.22.0.mjs`: PixiJS 8.22.0 distribution, MIT. Retrieved from https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.min.mjs . License included in `vendor/PIXI-LICENSE.txt`.

Restaurant facades, roads, landscaping and people are drawn in the application's Pixi graphics code.
