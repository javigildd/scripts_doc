# jg_ReOrg

> Compact ScriptUI panel that reorders the selected layers' timeline index based on their spatial position on the canvas.

- **Script file:** `jg_ReOrg.jsx`
- **Type:** ScriptUI panel — install in `ScriptUI Panels/` and open via `Window > ReOrg`.

---

## What it does

You select 2 or more layers, click one of the four buttons, and the script reshuffles their timeline indices to match their on-canvas positions:

- **Top-Bottom** — layers physically near the top of the comp end up at the top of the timeline.
- **Bottom-Top** — physically bottom-most layers go to the top of the timeline.
- **Left-Right** — physically left-most layers go to the top.
- **Right-Left** — physically right-most layers go to the top.

The layers' Y or X positions at the **current playhead time** are read; their target indices are the **same set of indices** they currently occupy, just re-assigned by spatial order. This means the rest of the timeline (layers you didn't select) stays exactly where it is — only the selected layers shuffle within the slots they already had.

---

## Panel layout

A 2×2 grid of buttons:

```
[ Top-Bottom ]  [ Bottom-Top ]
[ Left-Right ]  [ Right-Left ]
```

That's it. No settings, no dropdowns, no help dialog. Open the panel, click, done.

---

## Why use this vs. AE's built-in sort

AE has nothing built in for this. Designers often need it when:

- A list of cards / items was duplicated and rearranged spatially, but the timeline order is still scrambled — masks, track mattes, or expression-based parenting all care about timeline order.
- An imported PSD layered things in import order rather than visual order.
- You're prepping for a script that depends on top-down or left-right order (e.g. a stagger expression keyed off `index`).

---

## How it works

1. Read each selected layer's position at `comp.time` (current playhead).
2. Pick `pos.x` or `pos.y` based on the chosen axis.
3. Sort the layers by that value (ascending or descending).
4. Re-target each layer to one of the **original indices** of the selection, in order. So if you selected layers at indices 3, 5, 7, after sorting the layers will end up at indices 3, 5, 7 again — but in the new spatial order.
5. Process from highest target index to lowest so AE doesn't keep re-shuffling indices mid-loop.

---

## Companion script

See **[jg_SortLayersByPosition](../jg_SortLayersByPosition/)** for the same logic with a more descriptive UI (arrows + labels). Same engine, just chunkier buttons.

---

## Tips

- **Position-based sort uses world position**, not the rendered visual position after applying parent transforms or expressions. If a layer has a parent, the script reads `position.valueAtTime(t, false)` which is local position — combine with parented setups carefully.
- The script processes only the **selected** layers and only re-uses the indices they already have, so it's safe to run multiple times: it never displaces anything outside the selection.
- The **current playhead time** matters — if you have animated positions, the result depends on where the playhead is. Move to a representative frame before sorting.
