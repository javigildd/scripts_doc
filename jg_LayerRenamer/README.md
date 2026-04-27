# jg_LayerRenamer

> ScriptUI panel that batch-renames the selected layers with a base name plus an incremental number. Configurable separator, padding, start value, step, and direction.

- **Script file:** `jg_LayerRenamer.jsx`
- **Type:** ScriptUI panel — install in `ScriptUI Panels/` and open via `Window > Layer Renamer`.

---

## What it does

Pick a bunch of layers, type a base name, click **Rename**. Each layer becomes `<name><separator><number>`, with the number incrementing in either timeline-top-to-bottom or bottom-to-top order.

Tiny script, but every option you'd want from a renamer:

- Configurable **separator** (none, `_`, `-`, space).
- Adjustable **start** number, **step** between numbers, and **zero-padding**.
- Choose the **direction**: number from top of the timeline downwards or from bottom upwards.

---

## Panel layout

The panel has two views: the main rename row and a settings panel reachable through the gear button.

### Main view

```
Name: [ Layer        ]

[ Rename                  ] [⚙]
```

- **Name** — base name. Default `Layer`.
- **Rename** — apply.
- **⚙** — open settings.

### Settings view

```
              Settings

[Direction]
  ( ) Top → Bottom
  ( ) Bottom → Top

[Numbering]
  Start:   [1]
  Step:    [1]
  Padding: [2]

  [Separator]
    ( ) None  ( ) _  ( ) -  ( ) Space

[ ← Back ]
```

| Setting | Default | Purpose |
|---|---|---|
| **Direction** | Top → Bottom | The first selected layer in chosen direction gets the start number; following layers get start + N×step. |
| **Start** | 1 | First number. |
| **Step** | 1 | Increment between consecutive numbers. |
| **Padding** | 2 | Zero-padding width (so `1` becomes `01`, `12` stays `12`). |
| **Separator** | `_` | Inserted between the base name and the number. |

---

## Examples

Selection: 5 layers selected, Direction = Top → Bottom, Start = 1, Step = 1, Padding = 2.

| Name | Separator | Result |
|---|---|---|
| `Layer` | `_` | `Layer_01`, `Layer_02`, …, `Layer_05` |
| `Logo` | `-` | `Logo-01`, `Logo-02`, …, `Logo-05` |
| `Frame` | None | `Frame01`, `Frame02`, … |
| `Card` | Space | `Card 01`, `Card 02`, … |

Selection of 5 with Step = 10 and Start = 100, padding = 3:

`Layer_100`, `Layer_110`, `Layer_120`, `Layer_130`, `Layer_140`.

---

## How it works

1. Validate that there's an active comp and at least one layer selected.
2. Sort the selection by current timeline `index` (lowest first).
3. If **Bottom → Top**, reverse the order.
4. For each layer at position `i`, compute `start + i*step`, zero-pad it, and concatenate with the base name + separator.
5. Run the whole thing inside `app.beginUndoGroup` / `app.endUndoGroup` so `Cmd/Ctrl + Z` undoes the entire rename.

---

## Tips

- The number is always **appended** with the configured separator. To prefix the number instead, just put the prefix in the **Name** field (e.g. `01_thing`, `02_thing`, …) — actually, this script always suffixes; for prefixed numbering you'd need to use a different tool.
- For a single-character base (e.g. just numbers like `01`, `02`, …), set the base name to `""` and pick **None** as separator, then padding controls the width.
- The renamer doesn't validate uniqueness — if you give two batches the same name+number range, you'll end up with duplicate layer names. AE allows this, but it can confuse expressions that reference layers by name.
