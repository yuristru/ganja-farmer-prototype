# V100 harvest art

Mature flowers now have a continuous calyx core following the same asymmetric sites as their detailed surface. Foxtail spacing and lateral jitter overlap at the tip. This fixes detached terminal fragments in the live plant and all previews without changing growth, scoring or saved data.

The shared flower master renders at 1536 pixels, trims transparent padding and fits the entire flower inside seed and harvest previews. Jars use a compact harvested-flower variant of that same renderer, packed in overlapping rows resting on the base. Rendering sizes follow the visible canvas rather than fixed HTML dataset sizes.

Both harvest and collection glass use layered highlights, a thick reflective base, shoulder reflections and a ribbed metal lid. Labels remain above the glass highlights and contents.

Validation: `tests/v100-harvest-art-qa.mjs` checks the actual alpha geometry for 54 variations across three families, three densities, three seeds and two flower forms. It detects empty rows at the tip and requires at least 98% of visible flower pixels to belong to one connected component. It captures the harvest and collection at 320, 393 and 430 pixels wide. Existing collection and two-grow release suites validate the data flow.

The test server exposes a render hook only in its served HTML; production HTML has no added debug API.
