# V101 flower art plan and implementation

## Acceptance target

The harvest should read as a dense, organic flower with distinguishable surface materials at 393 x 852 CSS pixels. The silhouette must stay continuous, including terminal details. Calyces should look swollen, not like regular leaves along a cone. Seed families need distinct colors while individual seeds retain deterministic variation. The jar should contain compact flowers lying at varied angles, with contact shadows and a plausible fill level. The underlying game interface must not show through the harvest screen.

## Architecture

- `assets/flower-art.js` loads three generated high resolution botanical material sources from `assets/flowers/v101`. These sources are used as texture maps, never as complete bud sprites.
- Seed, genotype, phenotype, density and compact/variant settings construct an independent irregular connected support shape. Cluster count, lean, contour lobes, proportions, source regions, scale, rotation and depth order are seeded. Roughly 200 overlapping clusters build each flower.
- Each cluster samples a different interior source region with a feathered mask. Directional shading unifies the sampled calyx, pistil and resin detail into one volume. There is no fixed library of three final bud silhouettes.
- Actual harvested density and resin conditions are attached to harvest previews and restored from existing jar records. This state is included in the cache key. Legacy records fall back to genotype-derived expression.
- The shared cache serves harvest, seed cards, packs and collection. Jars use four separately constructed compact flowers at varied angles with contact shadows. Layout remains deterministic.
- Loading is asynchronous. Empty interim canvases are not cached; once materials finish loading, every visible preview and the open harvest hero are repainted.
- The live growth renderer keeps its existing maturity model. The harvest renderer is a macro representation derived from the seed and harvest condition; it is not a literal mesh export of a particular branch.
- The harvest backdrop is fully opaque. Glass, lid and foreground labels remain distinct layers.

## Visual decision

The initial purely procedural calyx renderer was rejected after screenshot review because its macro surface looked too smooth. A fixed whole-bud sprite approach was also rejected because it would repeat final silhouettes between grows. The final implementation uses generated photographic materials inside independently generated seed geometry. Source outputs are preserved; committed sources are trimmed WebP exports.

## Quality gates

1. Inspect screenshots for green and purple families at full mobile size, including compact jar forms.
2. Check 12 distinct same-family seed silhouettes and 54 flower variations for connected alpha geometry and no empty terminal rows.
3. Verify reopening produces identical art and packing.
4. Exercise harvest, collection, upgrades and the second grow using existing UI tests.
5. Check 320, 393 and 430 pixel mobile layouts and no browser errors.
6. Commit and deploy only after visual inspection, not merely after numeric tests.

## Limits

The art uses generated photorealistic botanical materials with deterministic game-side expression. It is not a photograph of the player's simulated plant. The growth renderer remains separate because it must support immature flowers, arbitrary camera projection and growth state. This pass improves the harvest and all collection/seed previews without pretending to make the entire plant photorealistic.
