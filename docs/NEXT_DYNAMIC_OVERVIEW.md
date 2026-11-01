# Next: the dynamic admin Overview

Sean's plan, 1 Nov 2026, saved at the end of a session with no room left to build it. Nothing here is
built yet. Admin Overview only (`frontend/src/views/AdminOverviewView.vue`).

## 1. The month chart tile

- Say **Income**, not "Rent and water": "Income by month, 2026" and "Income for November 2026".
- The chart's selected month today shows one number ("₱263,650 recorded"). Show that month's **rent
  value and water value** separately instead.
- **Monthly average** and **Expected each month** sit together on one side.

## 2. Tiles that appear only when they have something to say

Needs your attention, Rent and water for this month, and Open repair requests are mostly zeros now.

- **Nothing useful: the tile is not shown at all.** Not collapsed, not a zero, not drawn. Example: 0
  payments and 0 urgent repairs means no Needs your attention tile.
- **The other tiles reflow** to fill the space: they reposition and expand. The grid is dynamic.
- **Something comes up:** when the page opens, the tiles move to give it space, then that tile pops
  out and expands into its place. Small, subtle and smooth. It introduces what is new.
- Overview only. No other page changes.

## Keep these when building it

- **A failed load is not "nothing".** A tile whose data could not load must still show "could not be
  loaded". Hiding it would read as all clear, the same false zero fixed in B-61.
- **Payments and urgent repairs must never be hidden while any exist.**
- **The first load must not flash.** Decide what shows only after the data is in, behind the skeleton,
  or a tile appears and vanishes.
- **Decide when the entrance plays:** Sean said when the page first opens. The live check refreshes
  every 2 seconds, so a tile arriving mid-visit needs a decision too.
- **Reduced motion:** the tile appears with a fade and nothing moves.
- **Phone:** tile order uses `phonePlace`, `attentionHasFigures` and `monthHasFigures`. Rework those.
- **Ask Sean:** what shows when every tile is empty, and whether `attentionNotes` (the one line added
  on 1 Nov) stays.
- Sean's motion taste: icons alone upscale, words do not. This tile entrance is his own request and is
  not a button.
