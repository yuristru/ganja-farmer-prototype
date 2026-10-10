# Italian restaurant sprite assets

Generated with the built-in ImageGen tool. These are flat transparent 2D
raster drawings, scaled once with nearest-neighbor sampling. Runtime code
measures each object's floor contact separately and uses fixed directional
views. Native Canvas sprites remain the fallback if an atlas is unavailable.

## Pizza oven

Project file: `italian-oven-v1.png`
Source: `generated_images/exec-44125971-15db-49e0-a723-705c8bb69173.png`

Prompt: Transparent square 2x2 sprite atlas of the same Italian wood-fired pizza
oven in four fixed directional views. Red terracotta brick dome, pale mortar,
copper chimney, arched opening, golden fire, gray stone pedestal with firewood.
Fixed orthographic 2:1 isometric projection, upright verticals and no perspective
convergence. Consistent upper-left lighting. Detailed late-1990s Italian
restaurant management game pixel clusters, warm muted colors and textured
materials. Each silhouette isolated with generous transparent gutters; no
labels, surrounding floor, room, people or plates. Front-right and front-left
opening in the upper row, rear quarters in the lower row.

## Restaurant decoration

Project file: `italian-decor-v1.png`
Source: `generated_images/exec-0857bd61-ef7d-439a-9d25-8745a95f749e.png`

Prompt: Transparent horizontal restaurant decoration sprite atlas. Three
isolated objects: lush potted olive/laurel plant in a weathered terracotta pot;
low dark walnut wine sideboard with bottles and open shelves; vintage red and
gold arched jukebox with amber tubes and brass details. Same fixed 2:1
isometric camera, upper-left lighting, upright verticals, no convergence.
Detailed handcrafted pixel clusters matching Italian city sprites with ochre
houses, terracotta roofs and green cypresses. Plant and jukebox one-tile
footprints, sideboard 2x1 footprint along the upper-left to lower-right axis.
No floor, room, words, characters, cutoffs or white halos. Tight contact shadows.

Frames, target pixel widths and floor anchors are documented directly in
`pizza-restaurant-art.js`. The same art is used for placement and tool previews.
