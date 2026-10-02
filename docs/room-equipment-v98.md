# V98 room equipment

Four generated WebP atlases supply all 40 substrate, water, nutrient and sensor tiers. The room is composed once into the background canvas, before the interactive plant. Shop previews consume the same artwork. Historical icon strips and SVGs remain available in git but are absent from the room render path.

`assets/room-equipment-layout.js` is the single placement authority. All anchors refer to the uncropped tent photograph. Its cover transform is shared by the background, props and invisible demo hit areas. On short displays the camera pans the entire room upward until its rear floor is above the day buttons. It never moves a prop independently of the room.

- Floor contact: normalized y 0.735, behind the plant's pot plane.
- Substrate: rear left, centered at x 0.23.
- Nutrients: shelf centered at x 0.325, y 0.625. Shelf clearance includes its brackets.
- Water: rear right, centered at x 0.79. Drip kits occupy floor trays.
- Sensors: the integrated right clamp meets the existing pole at x 0.883, y 0.50. No duplicate pipe or floating mounting panel.
- Preserve the alpha-trimmed artwork's ratio. No CSS rotations, perspective warps or tier opacity overrides.
- Contact shadows belong to the floor or mounting silhouette. Prop lighting is graded consistently in the canvas.

## Artwork provenance and generation specification

Created with the built-in Imagegen tool for this change. Four transparent native raster atlases, ten independent objects each. Source rectangles in `assets/equipment/room-v98/manifest.json` and its browser JS counterpart record actual source pixels. No artificial 1024px upscaling. Native art exceeds 3 source pixels per CSS pixel at the tested mobile sizes, enough for DPR 3 displays.

| Atlas | Native source pixels | Requested camera and lighting |
| --- | --- | --- |
| substrate.webp | 1983 x 793 | Mostly frontal, modest 10 degree downward view, fronts angled slightly right toward room center, warm overhead right key, dim green fill |
| irrigation.webp | 1983 x 793 | Mostly frontal, modest downward view, fronts angled slightly left toward room center, warm overhead left key, dim green fill |
| nutrients.webp | 1774 x 887 | Mostly frontal, modest 8 degree downward view, fronts angled slightly right, warm overhead right key, dim green fill |
| sensor.webp | 1983 x 793 | Camera at device height, fronts angled slightly left, integrated rear-right clamp, warm overhead left key, dim green fill |

Common prompt constraints: premium realistic CGI, fine material detail, upright verticals, genuine transparent alpha, ten separately framed objects, clean gutters, no room, plant, captions, floor disks, pedestals or baked oval shadows. Substrate runs from soil sacks to organized storage crates; irrigation from watering cans through floor-tray drip kits to automated reservoir stations; nutrients from bags/bottles to compact dosing stations; sensors from an analog gauge through small meters to advanced monitors. Sensors explicitly exclude separate poles and pipe fragments.

## Verification

`node tests/v98-room-integration-qa.mjs` runs 560 geometry checks, screenshots all ten tiers and mixed setups on four phone sizes, checks native DPR 3 detail, crop boundaries, substrate/shelf clearance, floor contact, actual pole contact, alignment of demo hit areas after resize, demo cycling, gallery loading and browser errors. `tests/v91-room-equipment-qa.mjs` delegates to the current suite to preserve the historical CI entry point.

Local headless Chromium may be selected with `CHROMIUM_PATH`. GitHub Actions installs Chromium through Playwright and uploads the screenshots and JSON evidence as `v98-room-integration-qa`.
