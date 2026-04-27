# jg_ColorSwatch

> ScriptUI panel for managing reusable colour palettes inside After Effects. Apply colours to shape layers with a click, organise palettes into groups, and import/export them as JSON.

- **Script file:** `jg_ColorSwatch_v4.jsx`
- **Type:** ScriptUI panel — install in `ScriptUI Panels/` and open via `Window > jg_ColorSwatch`.
- **Persistent:** all palette groups, the last selected group, and the saved selection are stored in AE preferences across sessions.

---

## What it does

A docked colour-swatch panel with three views (Swatches grid / Cards / List), per-group palettes, and one-click apply to selected shape layers (fills + strokes). It works directly on **shape layers** by walking their full content tree, so it correctly applies colour to nested groups.

The default palette has Google Blue / Error Red / Success Green to give you something to click immediately. Add your own with the `Add Color` button or pick several at once with `Add Multiple`.

Up to 36 swatches per group; unlimited groups; up to date import/export of `.json` palette files.

---

## Installation

Copy `jg_ColorSwatch_v4.jsx` into your AE `ScriptUI Panels/` folder and restart AE. Open via `Window > jg_ColorSwatch`.

---

## Panel layout

```
Top bar:    [View: ⊞ ⬚ ≡ ]            📥 ? Min v4.0
Group bar:  [ Group dropdown      ]   ⚙ ⇅ Names
Swatch container (changes per view)
Bottom:     [ Add Color ] [ Add Multiple Colors ]
```

### Views

| Icon | View | What it shows |
|---|---|---|
| **⊞** | Swatches | Compact 6-per-row grid (up to 36 swatches, 6 rows). Default. |
| **⬚** | Cards | 3-column grid with the hex code under each swatch. |
| **≡** | List | 2 columns of rows, each with a small swatch + hex code + (optional) name. The only view that supports the reorder mode. |

The active view is shown with brackets in the toolbar (e.g. `[⊞]`).

### Group bar

- **Group dropdown** — switch between palettes. The last item in the dropdown is `+ Add group` which prompts for a name and creates an empty group.
- **⚙** — opens the *Edit Group* dialog: rename, delete, or **Export** the group as a `.json` file.
- **⇅** — toggle reorder mode. Adds `↑` / `↓` buttons next to each swatch in List view (auto-switches to List view if you're not in it).
- **Names** — toggle visibility of the optional name labels in Cards and List views. (Names are always shown in the detail view.)

### Right-side actions

- **📥** — import a `.json` palette file. If a group with the same name already exists, the imported one is renamed `<name> 1`, `<name> 2`, …
- **?** — opens the in-app help dialog with all keyboard / click combinations.
- **Min** — switch to **Minimal mode**: only the swatch grid is shown, controls collapsed. The minimal header has an `S` toggle (full / half-size swatches) and a `←` to return to full mode. **Esc** also exits minimal mode (when the panel has keyboard focus).
- **v4.0** — version label.

---

## Click handling

All clicks happen on individual swatches.

| Click | Action |
|---|---|
| **Click** | Apply the colour as a **fill** on every selected shape layer (recursively, including nested groups). |
| **Shift + Click** | Toggle a **stroke** of this colour on selected shape layers. Same colour again = remove the stroke. **No shape layer selected** = create a solid of that colour at comp size. |
| **Ctrl / Cmd + Click** | Open the *Edit Swatch* dialog (change colour / name / position, or delete). |
| **Alt / Option + Click** | Quick delete (with confirm). |
| **Double-click** | Open the **detail view**: large preview, hex (read-only), editable name field, and a `← Back` button. |

---

## Persistence

- All groups + swatches are stored in AE preferences (`UserColorGroups` JSON).
- The last selected group is restored on next launch.
- Settings keyed under `JG_ColorSwatch` (the key is preserved across versions for backwards compatibility).

---

## Add Color / Add Multiple

- **Add Color** opens AE's native colour picker (a temp solid is added to a comp during the pick — it's removed straight after, even if there was no comp open in which case a temporary 100×100 comp is created and removed).
- **Add Multiple Colors** opens a dialog with several picker slots. Click `Pick 1`, `Pick 2`, … to fill each slot. `+ Add Slot` adds another row. `Add Selected Colors` adds every filled slot to the current group; empty slots are ignored.

Both methods respect the 36-swatch-per-group cap. To go beyond, create a new group via the dropdown's `+ Add group` entry.

---

## Import / Export format

Import and export use a simple JSON format:

```json
{
  "name": "My Palette",
  "swatches": [
    { "hex": "#1A73E8", "name": "Google Blue" },
    { "hex": "#FF5252", "name": "Error Red" }
  ],
  "exportDate": "2025-01-15 14:32"
}
```

- `name` becomes the group name on import.
- Each `hex` must start with `#` and use 6 uppercase characters.
- Names are optional.

---

## Shape layer support

Click handlers walk the entire shape-layer content tree: top-level groups and nested groups, applying or testing colour on every `Vector Graphic - Fill` or `Vector Graphic - Stroke` they encounter. So if you have a complicated illustration with nested groups, the colour applies to *all* of it.

The stroke toggle reads existing stroke colours: if any of them already match (within a small tolerance) it disables the stroke instead of just re-applying it, so a second click of the same swatch on `Shift + Click` cleanly removes the stroke.

---

## Tips

- **Drag the panel into a tab group** in AE to keep it always at hand — it's a real ScriptUI panel, not a window.
- **Minimal mode** is great when you're in a recording / streaming setup or just want to free up screen space; the half-size swatches in minimal mode let you fit a 36-swatch group into a tiny strip.
- **Reorder mode** is fast for sorting a 30-swatch group: switch to ⇅, click ↑/↓ on the swatches that are out of place, then turn ⇅ off.
- **Esc** exits the detail view and minimal mode quickly.
- Export your favourite palettes to `.json` once they stabilise; they're easy to share with collaborators or move between machines.
