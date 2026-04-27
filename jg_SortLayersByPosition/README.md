# jg_SortLayersByPosition

> ScriptUI panel that reorders selected layers' timeline indices by their spatial X / Y position. Same engine as `jg_ReOrg` but with a descriptive UI (arrow icons + labels) — use whichever feels nicer.

- **Script file:** `jg_SortLayersByPosition.jsx`
- **Type:** ScriptUI panel — install in `ScriptUI Panels/` and open via `Window > Sort Layers by Position`.

---

## What it does

Select 2+ layers, click a button, the script rearranges their timeline indices so they match their on-canvas spatial order. The set of indices stays the same — only which layer occupies which slot changes — so layers you didn't select aren't touched.

---

## Panel layout

```
       Sort selected layers by:

[ ↑ Top → Bottom ]   [ ↓ Bottom → Top ]
[ ← Left → Right ]   [ → Right → Left ]
```

| Button | What it does |
|---|---|
| **↑ Top → Bottom** | Layers with the smaller Y position end up higher in the timeline. |
| **↓ Bottom → Top** | Layers with the larger Y position end up higher. |
| **← Left → Right** | Layers with the smaller X position end up higher. |
| **→ Right → Left** | Layers with the larger X position end up higher. |

In AE conventions, "higher in the timeline" means lower `index` (closer to the top of the layer stack), which also means rendered on top of the layers below it.

---

## How it works

Identical to [jg_ReOrg](../jg_ReOrg/):

1. Read each selected layer's position at `comp.time`.
2. Pick X or Y, sort ascending or descending.
3. Re-target each sorted layer to one of the original selection indices, lowest first.
4. Apply changes from highest index to lowest so AE doesn't reshuffle mid-loop.

The only differences from `jg_ReOrg` are cosmetic: labels with arrows, a "Sort selected layers by:" caption.

---

## When to use which

- **`jg_SortLayersByPosition`** — when you're getting started, when a colleague asks how to use it, or when you want explicit "I'm sorting top-to-bottom" labels on the buttons.
- **`jg_ReOrg`** — when you want a thinner panel and the four buttons are all you need to remember.

Both can coexist — they're separate panels and won't conflict.

---

## Tips

- **Position is read at the playhead.** If positions animate, sort at a representative frame.
- **Parented layers use local position.** Be careful sorting a mix of parented and unparented layers — they may not sort the way they look on the canvas.
- The selection's indices are preserved as a set; the rest of the timeline is untouched.
