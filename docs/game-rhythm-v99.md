# V99: real daily rhythm

Normal play uses the calendar in Europe/Berlin, independent of the browser timezone.

- Seven care/skip turns per calendar day. At least one full hour between turns, including across midnight.
- One plant day per calendar day. TAG closes today's plant day early and forfeits all unused turns until midnight. Closing cannot be repeated on that date.
- At midnight an unclosed day is evaluated and advanced once. An already closed day only receives the next day's allowance.
- On returning after an absence, all unclosed past dates are simulated once using the existing water, nutrient, ventilation, stress and equipped automation rules. No free care is invented. Replay stops at day 84; harvesting and reseeding remain player actions.
- Harvesting and reseeding retain the same daily ledger and last-turn time. A new plant does not create more turns.
- Existing saves begin calendar tracking on their first V99 load. Plant state, used turns and the previous turn's timestamp are retained; days before migration are not retroactively simulated.
- Cutting and bending remain free training actions.
- Developer bypass and auto-care scenarios retain accelerated testing and show DEMO in the HUD.

`assets/game-clock.js` implements the pure calendar ledger; `index.html` connects it to simulation and storage. Calendar boundaries include 23- and 25-hour daylight-saving days. Within a saved ledger, time never moves backwards. This is a local browser save, not server-authoritative time or cross-device synchronization.

Validation: `tests/v99-game-clock-qa.mjs` exercises exact hourly limits, seventh/eighth turn, midnight carry, one-time closure, offline replay, DST, leap/year boundaries, backward time, migration, harvest cap, reloads and browser timezone independence. Existing release, demo, free-training, seedling and V98 room integration suites cover compatibility.
