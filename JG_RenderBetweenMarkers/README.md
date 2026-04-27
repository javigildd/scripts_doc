# JG_RenderBetweenMarkers

> ScriptUI panel that automates the After Effects render queue using composition markers as segment boundaries. Queues video segments, single-frame stills, or both at once.

- **Script file:** `JG_RenderBetweenMarkers_v3.2.jsx`
- **Type:** ScriptUI panel — install in `ScriptUI Panels/` and open via `Window > JG_RenderBetweenMarkers_v3.2`.
- **Persistent settings:** marker names, naming format, output module template, and last output folder are saved across sessions in AE preferences.

---

## What it does

You place a `Start` marker and an `End` marker on your comp. Every other marker between them becomes a **segment boundary**. The script walks the markers in order and adds one render queue item per segment, with the timespan, output filename and output module template all set automatically.

It can also render **single frames** at every marker position — useful for delivering thumbnails or stop-motion stills aligned with your animation beats.

Marker names are **configurable** (defaults: `Start` / `End`). You can also enable a **prefix mode** so that only markers named `step_01`, `step_02`, … (any prefix you choose) count as segment boundaries; everything else is ignored.

---

## Installation

Copy `JG_RenderBetweenMarkers_v3.2.jsx` into your AE `ScriptUI Panels/` folder:

- **macOS** → `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
- **Windows** → `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`

Restart AE. The panel is then available under `Window > JG_RenderBetweenMarkers_v3.2`.

Make sure **Preferences > Scripting & Expressions > Allow Scripts to Write Files and Access Network** is enabled — the script writes file paths into the render queue.

---

## Panel layout

```
[ Queue Renders ]   [ Q Frames ]
[◆] | [⚙] [?]   …/last-output-folder
```

**Row 1 — main actions**

| Button | What it does |
|---|---|
| **Queue Renders** | Pick output folder → queue all segments between Start and End. |
| **Q Frames** | Pick output folder → queue a single-frame render at every marker between Start and End. |

**Row 2 — utilities**

| Button | What it does |
|---|---|
| **◆** | Place `Start` and `End` markers at the first and last frames of the active comp. Existing markers at those exact positions are replaced; intermediate markers are untouched. |
| **⚙** | Opens settings (marker names, naming, templates, prefix mode). |
| **?** | Opens the in-app help dialog. |
| Folder label | Shows the last selected output folder. |

---

## Modifier keys

The buttons accept modifier keys for advanced workflows:

### Queue Renders

- **Click** → pick folder, queue **all** segments.
- **Alt / Option + Click** → opens the **segment picker** (multi-select dialog). Folder prompt appears after you confirm. The picker also has a `Queue Selected + Frames` button that queues both the chosen segments **and** a frame render at each boundary marker of those segments.
- **Shift + Click** → pick folder, queue all segments **plus** a single-frame render at every marker. (When Shift is held, the button label updates live to `Queue Renders + Frames`.)

### Q Frames

- **Click** → pick folder, queue a frame at every marker.
- **Alt / Option + Click** → opens the **marker picker** so you can choose specific markers to render as frames.

---

## Settings (⚙)

- **Marker Names** — change the names the script looks for (defaults `Start` / `End`). Lookup is case-insensitive.
- **Custom Segment Markers** — enable to filter intermediate markers by prefix. Only markers whose name starts with the configured prefix (e.g. `step_`) become segment boundaries; everything else is ignored.
- **Output File Naming**
  - **Label position:** prefix or suffix.
  - **Segments label:** inserted between the comp name and the segment number for video segments. Include any separators (`_`, `-`, ` `) directly in the label.
  - **Frames label:** same idea but for frame renders.
  - Numbers are zero-padded to 2 digits.
- **Output Module Templates**
  - **Segments (video):** AE output module template applied to every segment render.
  - **Frames (stills):** template applied to every frame render. The script reads existing OM templates from your AE setup; pick one from the dropdown or leave it as `(Use current default)`.

The very first time you queue anything, the script asks you to choose default templates (segments + stills) so future runs Just Work. You can always change them later in Settings.

---

## Output naming

For a comp called `MyAnim` with default settings (suffix mode, label `_segment_`):

- Segments → `MyAnim_segment_01.<ext>`, `MyAnim_segment_02.<ext>`, …
- Frames   → `MyAnim_marker00.<ext>`, `MyAnim_marker01.<ext>`, …

Switch to prefix mode and the comp name moves to the right of the label. Extension is detected automatically from the chosen output module template.

For still-image outputs the script writes the path as `name[#####].ext` so AE inserts the frame number **before** the extension (otherwise AE would produce broken `name.png00000` files).

---

## Skip ranges (custom segment markers only)

When **Custom Segment Markers** mode is enabled, you can intentionally skip a piece of the timeline by placing **two consecutive markers with the same name**. The script treats that interval as a gap and skips it.

Example with prefix `step_`:

```
Start → step_01 → step_01 → step_02 → End

Segment 1: Start    → step_01 (1st)
Skipped  : step_01  → step_01 (2nd)   ← not queued
Segment 2: step_01  (2nd) → step_02
Segment 3: step_02  → End
```

Useful for excluding silence, leaders, or any part you don't want in the final delivery.

---

## How it works

1. **Find the range:** the script walks `comp.markerProperty` looking for the first `Start`-named marker, then the next `End`-named marker after it. If either is missing it bails out with an alert.
2. **Build segment list:** in default mode every marker between Start and End becomes a boundary. In prefix mode only matching markers count.
3. **Queue items:** for each segment, `app.project.renderQueue.items.add(comp)` creates an item; the script sets `timeSpanStart` / `timeSpanDuration` to the segment's range and applies the chosen output module template + filename.
4. **Frame mode:** the same logic but the timespan is one frame long and centred on each marker.

Markers are referenced by their **comment name** (the text you type into the marker), not their label colour.

---

## Tips

- **Generate Start/End fast:** click ◆ to drop them at frame 0 and the last frame. Existing markers at those exact frames are replaced; everything else stays.
- **Iterate on a chunk:** Alt+Click on Queue Renders to re-render only the segment(s) that changed.
- **Use prefix mode for messy comps:** if your timeline already has unrelated markers (chapter notes, comments, etc.), enable prefix mode and use a dedicated prefix like `step_` so only the renders are queued.
- **Use Shift+Click** when delivering both an animation file *and* still images for thumbnails or social cuts in one pass.
- The output folder is remembered across sessions and shown beside the toolbar so you always know where the last batch went.
