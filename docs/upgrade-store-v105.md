# Upgrade store V105

All seven categories and 60 tiers were reviewed. Light and ventilation now use five new isolated product renders each. Their source rectangles are in `assets/equipment/store-v105/manifest.json`. The store never displays a whole sprite-strip background. The four existing HD room atlases still provide substrate, irrigation, nutrients and sensor art.

`assets/store-equipment.js` fits each source rectangle to the actual visible card dimensions at up to DPR 3. It preserves the original aspect ratio, provides clear gutters, redraws after layout changes and disconnects observers for removed previews. It does not alter the tent placement or gameplay upgrade effects.

Pot previews use the existing Three.js models, now rendered at 660 x 450, trimmed to their alpha bounds and fitted without clipping. The already pinned Three.js r128 bundle and its MIT license are shipped locally, avoiding CDN failures. Irrigation tier 3 and sensor tier 1 labels now match their pressure sprayer and analog gauge artwork.

Overview cards have uniform framing, a legible tier badge and a footer explaining the affected need and next-tier availability. Actual prices, purchase gates and upgrade benefits remain driven by the existing economy.

Validation: `node tests/v105-upgrade-store-qa.mjs` checks every tier, nonempty previews, transparent borders, source and display proportions, absence of legacy sprites, seven comparisons on 320/393/430px phones and an actual light upgrade purchase. Room integration remains covered by `tests/v98-room-integration-qa.mjs`.

## Generated artwork

Created with the built-in Imagegen tool using the imagegen skill, then encoded as a high-quality WebP for `assets/equipment/store-v105/light-vent.webp`. Native size 1024 x 1536, genuine RGBA transparency. Cropping occurs in the store renderer using explicit source rectangles; no pixel upscaling.

Prompt specification: transparent HD two-column five-row product atlas, left five increasingly capable hanging LED panels from 40W through Sun Engine X, right passive vent grille through climate-control exhaust unit. Premium realistic CGI, charcoal and brushed-metal housings, small olive accents, consistent front three-quarter camera, lamps viewed slightly from below, warm upper-left key and neutral fill. Each device isolated with clear gutters. No text, tent, floors, pedestals, duplicate devices or large light beams. The complete tool prompt is preserved in the conversation.
