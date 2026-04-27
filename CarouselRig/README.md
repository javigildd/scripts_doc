# CarouselRig

> Diagonal carousel rig for After Effects. Builds a complete expression-driven setup from a layer selection: stacked piles on the left/right, fan rotation, time-remap driven by selection, and staggered entrance.

- **Script file:** `CarouselRig_v3.jsx`
- **Type:** One-shot script — run via `File > Scripts > Run Script File…` (or place in the `Scripts/` folder for `File > Scripts > CarouselRig_v3`).
- **Selection required:** 2 or more layers selected in the active comp.

---

## What it does

CarouselRig turns any number of selected layers into a diagonal carousel: a "left pile" and a "right pile" of stacked layers connected by a continuous diagonal, with one layer at the centre flagged as **active**. Everything is driven by expressions on a single null called `CAROUSEL CONTROL`, so you can scrub through the carousel by simply animating one slider.

It writes expressions to the **Position**, **Scale**, **Rotation** and **Opacity** of each input layer, plus enables and drives **Time Remapping** so the active layer plays back at full speed and the side layers freeze.

The script does not duplicate or move your layers — it only links them to the controller and writes expressions.

---

## Usage

1. Select 2 or more layers in the comp (their stacking order in the timeline becomes their order along the carousel: top of the timeline = position 1).
2. Run the script.
3. The script creates a layer named `CAROUSEL CONTROL` at the top of the comp (a null, opacity 0, hidden in the viewer).
4. Open the **Effect Controls** of `CAROUSEL CONTROL` and animate the **Selection** slider to scrub through the carousel.

---

## The `CAROUSEL CONTROL` null

All the controls live on this single null. Defaults are sensible for a 30+ layer carousel; tune them to taste.

| Control | Default | Purpose |
|---|---|---|
| **Selection** | 16 | Active layer (1 = first selected, N = last). Keyframe this. |
| **Visible Per Side** | 12 | How many layers stay visible on each side of the active one. Anything further fades to 0. |
| **Active Scale** | 89.2 | Scale (%) applied to the active layer. |
| **Side Scale** | 69.6 | Scale (%) applied to layers on the diagonal piles. |
| **Stagger X** | 51.1 | Extra horizontal stacking distance per layer beyond the pile centre. |
| **Stagger Y** | 178 | Extra vertical stacking distance per layer beyond the pile centre. |
| **Rotation Per Step** | 0 | Adds a fan rotation: every step away from the active layer rotates by this many degrees. |
| **Time Remap Duration** | 1 | Seconds of source clip the active layer plays. Side layers freeze on their first frame. |
| **Open** | 1 | Carousel openness. `0` = continuous diagonal between the two piles, `1` = full carousel with a gap at the active layer. |
| **Open Stagger** | 0.05 | How much the open animation cascades from the centre outwards. Higher = layers further away open later. |
| **Entry Offset Y** | 0 | Global vertical offset (px) used for entrance/exit animations. |
| **Entry Stagger** | 30 | Extra Y per layer for the entrance, ramped smoothly with `Entry Offset Y`. |
| **Right Pile Pos** | `[2231, 652]` | World-space position of the right-side pile centre. Drag to reposition. |
| **Left Pile Pos** | `[643, 970]` | World-space position of the left-side pile centre. Drag to reposition. |

---

## How it works

For each input layer the script writes 5 expressions:

- **Position:** blends a *closed* position (linearly interpolated between the left and right piles based on the layer index) with an *open* position (full carousel with a gap at the active layer). The blend is driven by `Open`, with a per-layer cascade controlled by `Open Stagger`. `Entry Offset Y` adds a global Y offset with per-layer staggering for entrance animations.
- **Scale:** interpolates between `Side Scale` (used at full closed state and for the side layers) and `Active Scale` (used for the active layer at full open state).
- **Rotation:** when `Rotation Per Step > 0`, layers fan out around the active one. Layers behind the active layer rotate one direction; layers in front rotate the other. The effect ramps up with `Open`.
- **Opacity:** `100` for layers within `Visible Per Side`, fades from `50` to `0` between the visible band and `Visible Per Side + 1`, fully invisible past that.
- **Time Remapping:** enabled and driven by the layer's distance to `Selection`. The active layer plays back over `Time Remap Duration` seconds; side layers freeze at the start.

Because expressions reference `CAROUSEL CONTROL` by name, you can rename the input layers freely — but **do not rename the controller null**.

---

## Tips

- **Keyframe `Selection`** to make the carousel scrub: integer values land cleanly on each layer; fractional values produce smooth blends mid-transition.
- **Combine `Open` + `Selection`** to create open/close transitions: animate `Open` from 0 → 1 to splay the carousel out before scrubbing.
- **Use `Entry Offset Y`** to slide the whole rig up/down for a coordinated entrance — `Entry Stagger` makes layers arrive one after another.
- The script will fail with an alert if fewer than 2 layers are selected, or if no comp is active.

---

## Notes on layers

- Stacking order at the moment of running the script defines layer order along the carousel (top = 1).
- The script does **not** modify the layers' source content — only their transform properties via expressions, plus their Time Remap.
- Enabling Time Remap on layers that do not have a footage source (e.g. shape layers) will have no effect on playback but won't break anything.

---

## Removing the rig

There's no built-in disconnect button (unlike `jg_CircularArray` / `jg_LinearArray`). To unrig:

1. Select the controller and all rigged layers.
2. Remove expressions on Position / Scale / Rotation / Opacity (Animation menu, or `Alt`-click the stopwatch on each).
3. Disable Time Remapping if you don't want it.
4. Delete `CAROUSEL CONTROL`.
