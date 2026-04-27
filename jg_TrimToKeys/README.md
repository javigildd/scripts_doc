# jg_TrimToKeys

> ScriptUI panel that trims the In Point / Out Point of selected layers to the first / last selected keyframe on each layer. Three buttons: trim in, trim out, trim both.

- **Script file:** `jg_TrimToKeys.jsx`
- **Type:** ScriptUI panel — install in `ScriptUI Panels/` and open via `Window > Trim to Keys`.

---

## What it does

You have a layer animated with keyframes. You want its In Point to match the first keyframe and the Out Point to match the last keyframe — so the layer doesn't sit there idle outside its animation. Doing this by eyeballing the timeline is annoying.

This script trims the layer for you:

- **Trim In Point** → sets `inPoint` to the time of the **earliest selected keyframe** on the layer.
- **Trim Out Point** → sets `outPoint` to the time of the **latest selected keyframe** on the layer.
- **Trim Both** → sets both at once.

Per-layer scope: each selected layer gets its own first/last keyframe times, so multi-layer trimming Just Works.

---

## Panel layout

```
[ Trim In Point  ]
[ Trim Out Point ]
[ Trim Both      ]
```

That's the whole panel.

---

## Usage

1. Select one or more layers.
2. **Select the keyframes** on those layers that mark the in/out boundaries you care about. The script reads from selected keyframes only — you can trim to a specific *range* by selecting only those keyframes.
3. Click the appropriate button.

The script walks every property and sub-property of each selected layer recursively, finds every selected keyframe, and uses the **earliest** and **latest** times across all of them.

---

## How it works

For each selected layer:

1. Recursively walk all properties (`numProperties`) and sub-property groups.
2. For each leaf property with keyframes, iterate `numKeys` and check `keySelected(k)`.
3. Track the minimum and maximum `keyTime` across all selected keyframes on the layer.
4. If at least one keyframe is selected, apply `inPoint` / `outPoint` based on the chosen button.

Layers with no selected keyframes are silently skipped — so if you click `Trim Both` with a mixed selection where some layers have keyframes selected and others don't, only the relevant layers are trimmed.

---

## Why "selected" keyframes specifically

Reading *all* keyframes by default would be wrong: most layers have throw-away holding keyframes (e.g. an extra anchor-point keyframe at frame 0 you forgot about) that aren't the actual animation boundary. By using **selected** keyframes, the script gives you precise control over which keyframes count as the boundary.

If you want all keyframes to count, just select all keyframes on the layer before running (`Layer > Select All Keyframes`, or click the property's stopwatch label and `Cmd/Ctrl + A`).

---

## Tips

- **Trim Both** is the workhorse — select the first and last keyframes you want bracketed and click once.
- If you only want to trim in or out (e.g. you want the layer's tail to extend past the animation), use the dedicated buttons instead.
- The script uses `inPoint` and `outPoint`, which trim layer visibility but **don't** modify the source. Source layers, comps, and footage all behave identically — frame 0 of the source still maps to frame 0 inside the layer's visible window.
- Out point is set to the exact time of the last keyframe, so the layer disappears immediately after that frame plays. If you want a tiny tail, extend the Out Point manually after running.
