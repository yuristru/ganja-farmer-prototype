# Harvest demo V103

In the harvest screen, select **DEMO ANSEHEN**, then **NEUE VARIANTE**. Each click produces a fresh seed and moves to the next of the 15 launch cultivars. Six synthetic care profiles rotate independently: optimal care, drought stress, low light, overfeeding, weak ventilation and recovery after stress. The next catalog pass shows each cultivar under a different profile.

The demo uses the production genotype, flower renderer and jar renderer. Mature flower quality uses the same density, resin, aroma and color response equations as the live grow, evaluated against explicit synthetic averages. Preview scores and dry yield are illustrative projections of those averages, not a simulated 84-day grow.

The full numeric seed, phenotype and care profile are visible. Seed traits belong to the preview seed; the active plant's traits are never merged into it. Material loading completes before a variant is displayed, and cancellation invalidates pending work.

**INS GLAS** previews the same seed in the jar. **ZUR ECHTEN ERNTE** restores the actual result. The commit function rejects demo results independently of the button handler. Demo previews never change the saved plant, coins, inventory, collection, history or progression. Closing also restores the actual result.

Validation: `node tests/v103-harvest-demo-qa.mjs` checks 30 distinct seeds and rendered variants, all 15 cultivars, six conditions, deterministic rendering, unchanged real state, cancelled loading, mobile controls at 320/393/430 pixels, restoration and successful genuine harvest afterward.
