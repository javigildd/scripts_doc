# jg_LinearArray

> ScriptUI panel that creates a straight-line array of duplicates from a single layer, controlled by a single null. Same rig pattern as `jg_CircularArray` but on a line instead of a circle.

- **Script file:** `jg_LinearArray.jsx`
- **Type:** ScriptUI panel — install in `ScriptUI Panels/` and open via `Window > jg_LinearArray`.
- **Selection required:** one layer.

---

## What it does

You select a layer and click **Linear Array**. The script asks how many copies, then:

1. Creates a controller null at the centre of the comp, named `<layer>_LinArray_CTRL`.
2. Adds three sliders: `Spacing X`, `Spacing Y`, and `Scale Offset`.
3. Hides + disables the original layer.
4. Duplicates the original N times, parents each copy to the controller, and writes expressions on **Position** and **Scale** so the copies sit on a line passing through the controller.
5. Moves the controller to the top of the layer stack.

The array is **centred on the controller**: regardless of how many copies, the middle of the line stays at the controller's position. This means changing the `Spacing` sliders expands/contracts the array around its centre, not from one end.

---

## Buttons

### Linear Array

Builds the rig.

- **Click** → prompts for number of copies (default 6) → creates the rig.

### Disconnect from Rig

Same behaviour as in `jg_CircularArray`: turns selected rigged copies back into independent layers, preserving their current world-space position and scale.

- **Click** with rigged copies selected → bake current values, remove expressions, unparent.
- **Option / Alt + Click** → also create an individual null per copy at the rig's centre, with the copy parented to it (so you keep a per-copy pivot).

---

## Controller (CTRL null)

| Slider | Default | Purpose |
|---|---|---|
| **Spacing X** | 100 | Horizontal distance between copies (px). Negative values reverse the direction. |
| **Spacing Y** | 0 | Vertical distance between copies. Combine with `Spacing X` for diagonal arrays. |
| **Scale Offset** | 0 | Added to 100% on every copy. |

Copies are named `LA_Copy01`, `LA_Copy02`, …

---

## How the expressions work

Position is centred on the controller using `(idx - (total-1)/2)`:

```js
// Position
var ctrl = thisLayer.parent;
var total = N;
var idx = i;
var spacingX = ctrl.effect("Spacing X")("Slider");
var spacingY = ctrl.effect("Spacing Y")("Slider");
var offsetX = (idx - (total - 1) / 2) * spacingX;
var offsetY = (idx - (total - 1) / 2) * spacingY;
[offsetX, offsetY];

// Scale
var ctrl = thisLayer.parent;
var scaleOffset = ctrl.effect("Scale Offset")("Slider");
var s = 100 + scaleOffset;
[s, s];
```

For 6 copies the offsets are `-2.5, -1.5, -0.5, 0.5, 1.5, 2.5` × spacing — symmetric around 0.

---

## Tips

- **Vertical column:** set `Spacing X = 0`, `Spacing Y > 0`.
- **Diagonal:** set both `Spacing X` and `Spacing Y` to non-zero values.
- **Animate spacing** to fan the array in/out from its centre.
- **Rotate the controller** to spin the whole line around its midpoint.
- Use **Disconnect** when you want per-copy keyframes after the rig has done its job.

---

## Companion script

See **[jg_CircularArray](../jg_CircularArray/)** for the radial version.
