# jg_SplitMask

> ScriptUI panel that takes a layer with multiple masks and splits it into independent layers, one per mask, each with only its own mask active.

- **Script file:** `jg_SplitMask.jsx`
- **Type:** ScriptUI panel — install in `ScriptUI Panels/` and open via `Window > Split Masks`.
- **Selection required:** one layer with **2 or more** masks.

---

## What it does

Pick a layer that has several masks on it. Click **Split Masks**. The script duplicates the layer once per mask. On each duplicate it keeps a single mask active (the one it's "for") and disables every other mask by setting `MaskMode.NONE`.

Result: a stack of independent layers, one per mask, that you can now animate, transform, parent, or apply effects to separately.

The original layer is either deleted or kept (disabled + shy) depending on a checkbox.

---

## Why use this

Masking workflow in AE usually starts with everything on one layer because that's the natural way to draw multiple shapes against a single piece of footage. But once you want to:

- animate masks separately,
- attach different track mattes to each,
- give each one its own opacity / blend mode,
- or use parented effects per mask,

…you need each mask on its own layer. Doing it manually is error-prone and tedious. This script does it in one click.

---

## Panel layout

```
Selecciona una capa con máscaras

[✓] Eliminar capa original

[ Split Masks                ]
```

- **Eliminar capa original** (default on) — when the operation finishes, delete the original. If unchecked, the original is kept but **disabled** and **shy** so it stays out of the way.
- **Split Masks** — run the operation.

---

## How it works

1. Validate that there's an active comp, a layer is selected, and that layer has 2+ masks. Single-mask layers and layers without masks abort with an alert.
2. Collect the names of every mask in the source layer (in order).
3. For each mask name:
   - **Duplicate** the source layer.
   - Rename the duplicate to `<original layer name> - <mask name>`.
   - Move the duplicate just above the source.
   - Walk every mask on the duplicate; set `maskMode = MaskMode.NONE` on the ones whose name doesn't match the current target mask.
4. Either delete the original or disable + shy it, per the checkbox.

Setting `maskMode` to `NONE` keeps the mask data intact (you could re-enable it manually later) but stops it from contributing to the layer's output.

---

## Tips

- **Mask names matter** — the script uses mask names to match. If two masks share the same name, the script will keep both active on the duplicate for that name (because the equality check passes for both). Rename masks if this is a problem.
- The split layers inherit **everything** from the original: effects, transform values, blend modes, parents. So if you had a track matte applied above the original, it'll affect every split layer too — adjust as needed.
- The script splits **top-level masks only** — masks always live on the layer's mask group, so this isn't a limitation, just a clarification.
- Run inside an undo group: `Cmd/Ctrl + Z` rolls back the entire split.

---

## Companion script

See **[jg_SplitShapeLayer](../jg_SplitShapeLayer/)** for the same idea applied to shape layer groups.
