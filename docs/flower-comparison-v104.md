# 100 flower variants, V104

Open the gear/demo menu and select **100 Blüten vergleichen**. The comparison page opens without requiring a completed grow. Its 100 cards show the production flower rendering, cultivar, full numeric seed, phenotype, care scenario, projected score and dry yield. The responsive grid uses two columns on mobile, four from 650px and six from 1100px.

**100 NEUE** starts a new batch of 100 seeds. All 15 launch cultivars and six independent care profiles are represented. The fixtures and quality equations are shared with the V103 harvest demo. These are synthetic mature-care projections, not completed saved grows.

Generation yields after each flower, reports progress and supports cancellation, restart, close and Escape. Closing releases thumbnail canvases. Full-size temporary canvases are released after downsampling; the comparison bypasses the gameplay master cache to avoid retaining 100 large images. No active harvest result, preview counter, saved state or reward is changed.

Validation: `node tests/v104-flower-comparison-qa.mjs`. Checks two complete 100-seed batches, distinct art, cultivar/condition coverage, unchanged game state, mobile and desktop grids, scroll to the last card, restart/close cancellation and Escape. V103 harvest lifecycle regression also passes.
