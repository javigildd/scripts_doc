# jg_CircularArray

> ScriptUI panel that creates a circular array of duplicates from a single layer, controlled by a single null with sliders for radius and scale. Comes with a one-click Disconnect button to break the rig.

- **Script file:** `jg_CircularArray_v3.jsx`
- **Type:** ScriptUI panel — install in `ScriptUI Panels/` and open via `Window > jg_CircularArray v3`.
- **Selection required:** one layer.

---

## What it does

You select a layer and click **Circular Array**. The script asks how many copies you want, then:

1. Creates a controller null at the centre of the comp, named `<layer>_CircArray_CTRL`.
2. Adds two sliders to it: `Radius Offset` (default 200) and `Scale Offset` (default 0).
3. Hides + disables the original layer (kept around as a reference).
4. Duplicates the original N times, parents each copy to the controller, and writes expressions on **Position** and **Scale** so the copies form a perfectly even circle.
5. Moves the controller to the top of the layer stack.

The result is a fully driven rig: change `Radius Offset` and the circle expands/contracts; change `Scale Offset` and every copy scales together; move the controller and the whole array follows.

---

## Buttons

### Circular Array

Builds the rig.

- **Click** → asks for a number of copies (default 6) → creates the rigged circle.
- The original layer stays in the comp, disabled and shy, so you can re-enable it if you want a non-rigged source for reference.

### Disconnect from Rig

Bakes a selected rigged copy back into a normal independent layer.

- **Click** with one or more rigged copies selected → the script:
  1. Reads the current world-space position and scale of each selected layer.
  2. Removes the position + scale expressions.
  3. Unparents the layer.
  4. Sets position/scale to the value the layer had a moment ago, so it visually doesn't move.
- **Option / Alt + Click** → same as above, but instead of leaving each disconnected copy parentless, the script creates an **individual null** for each copy at the rig's centre and parents the copy to that null. Useful when you want to animate each copy independently around its own pivot.

The disconnect logic processes layers from highest index to lowest so AE doesn't re-shuffle indices mid-loop.

You can also directly create a "disconnected" build by `Option + Click`-ing on the **Circular Array** button: same circle, but every copy ends up with its own null instead of all being parented to one controller.

---

## Controller (CTRL null)

| Slider | Default | Purpose |
|---|---|---|
| **Radius Offset** | 200 | Distance (px) from the controller to each copy. |
| **Scale Offset** | 0 | Added to 100% on every copy, so `0` = original size, `50` = 150%, `-50` = 50%, etc. |

Position the entire array by moving the null. Rotate it by rotating the null. The expressions write **local-space** position into each copy (relative to the parent), so all rotations and offsets at the controller level apply to the array as a whole.

Copies are named `CA_Copy01`, `CA_Copy02`, …

---

## How the expressions work

Each copy gets these expressions:

```js
// Position
var ctrl = thisLayer.parent;
var total = N;          // total copies
var idx = i;            // 0-based index for this copy
var radius = ctrl.effect("Radius Offset")("Slider");
var angle = (idx / total) * Math.PI * 2;
var x = Math.cos(angle) * radius;
var y = Math.sin(angle) * radius;
[x, y];

// Scale
var ctrl = thisLayer.parent;
var scaleOffset = ctrl.effect("Scale Offset")("Slider");
var s = 100 + scaleOffset;
[s, s];
```

Each copy occupies an even slice of `2π / total` radians. The first copy sits at angle 0 (3 o'clock). Increasing `Radius Offset` pushes them all outwards along their angles.

---

## Tips

- **Animate the radius** to make the array bloom in/out from the centre.
- **Rotate the controller** to spin the entire array.
- **Use Disconnect when you need per-copy keyframes** — the rig is great for setup and global moves, but breaking it once you start individual animation prevents conflicts.
- **Option + Click on Disconnect** if you want every copy to keep an individual pivot at the rig's centre — handy for radial scaling or per-copy rotation.

---

## Companion script

See **[jg_LinearArray](../jg_LinearArray/)** for the same rig logic on a straight line (X / Y spacing instead of radius).
