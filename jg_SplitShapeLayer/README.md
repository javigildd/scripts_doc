# jg_SplitShapeLayer

> ScriptUI panel that takes a shape layer with multiple top-level groups and splits it into independent shape layers — one per group.

- **Script file:** `jg_SplitShapeLayer.jsx`
- **Type:** ScriptUI panel — install in `ScriptUI Panels/` and open via `Window > Split Shape Layer`.
- **Selection required:** one shape layer.

---

## What it does

You select a shape layer that contains several top-level groups (e.g. an SVG icon imported with multiple shapes, or an illustration where each piece is its own `Group 1 / Group 2 / …`). Click **Split Shape Layer**. The script:

1. Duplicates the source shape layer once per top-level group.
2. On each duplicate, removes every group **except** the one that duplicate is "for".
3. Renames each duplicate to the name of the group it represents.
4. Either deletes the original or hides it (disabled + shy), per the checkbox.

Result: one shape layer per icon piece / shape group, ready to animate independently.

---

## Why use this

Common scenarios:

- **SVGs imported as one shape layer** — Illustrator and other tools sometimes give you a single layer with everything inside. To animate the parts separately you need them in separate layers.
- **Icon set in one layer** — you've drawn all the shapes for an icon in one shape layer; now you need each piece on its own layer for staggered animations.
- **Pre-rigged starter** — designer hands off a single shape layer; you need to break it apart to wire it to expressions / effects.

This is the shape-layer twin of [jg_SplitMask](../jg_SplitMask/).

---

## Panel layout

```
Selecciona una capa de forma

[✓] Eliminar capa original

[ Split Shape Layer            ]
```

- **Eliminar capa original** (default on) — delete the original after splitting. If off, the original is kept but disabled + shy.
- **Split Shape Layer** — run.

---

## How it works

1. Validate that the active item is a comp, a layer is selected, and the selected layer is a `ShapeLayer`.
2. Read `Contents` (`ADBE Root Vectors Group`). Abort if there are no top-level groups.
3. Collect the names of every top-level group (in order).
4. For each group name:
   - **Duplicate** the source layer.
   - Rename the duplicate to the group name (so you get `Star`, `Circle`, `Triangle`, etc., assuming your groups had those names).
   - Walk the duplicate's `Contents` from end to start (to preserve indices) and **remove every group whose name doesn't match** the target.
5. Either delete the source or disable + shy it.

Note: the script splits **top-level groups only**. Nested groups inside a top-level group stay intact on their parent group. So if your shape layer is structured `Contents > Star > [paths…]` and `Contents > Circle > [paths…]`, you'll get two layers (`Star` and `Circle`), each carrying its own subtree.

---

## Tips

- **Group names matter.** The script keeps groups by name match. If two top-level groups share a name, you'll end up with both groups on the layer named after them — rename in the source first if that's an issue.
- All effects, transforms, blend modes, parents from the original carry over to each split layer.
- Like its sibling `jg_SplitMask`, the entire split runs inside an undo group, so a single `Cmd/Ctrl + Z` undoes everything.

---

## Companion script

See **[jg_SplitMask](../jg_SplitMask/)** for the same idea applied to layer masks.
