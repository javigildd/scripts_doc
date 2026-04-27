# scripts_doc

Documentation for the After Effects scripts in **[javigildd/aescripts](https://github.com/javigildd/aescripts)**.

Each script has its own folder here with a detailed README covering what it does, how to install it, controls, internals and tips. Folders are also where I'll keep version-tracked changelogs in the future.

---

## Scripts

| Script | Type | Summary |
|---|---|---|
| [CarouselRig](CarouselRig/) | One-shot | Diagonal carousel rig with stacked piles, fan rotation and time-remap driven by selection. |
| [JG_RenderBetweenMarkers](JG_RenderBetweenMarkers/) | ScriptUI panel | Auto-queues renders between Start/End comp markers. Segments, frames, or both. |
| [jg_CircularArray](jg_CircularArray/) | ScriptUI panel | Builds a controllable circular array of duplicates. Includes Disconnect from Rig. |
| [jg_CodingColor](jg_CodingColor/) | One-shot | Code-editor syntax highlighting on a text layer. Auto-detects Python / JS / C++ / HTML. 6 themes + Custom. |
| [jg_ColorSwatch](jg_ColorSwatch/) | ScriptUI panel | Reusable colour palette manager with grouping, import/export, fill + stroke shape-layer apply. |
| [jg_EffectReport](jg_EffectReport/) | ScriptUI panel | Project audit: lists every effect in use, separating native vs third-party. |
| [jg_LayerRenamer](jg_LayerRenamer/) | ScriptUI panel | Batch-rename selected layers with base + incremental number, configurable separator and padding. |
| [jg_LinearArray](jg_LinearArray/) | ScriptUI panel | Linear (line) version of the circular array. Includes Disconnect from Rig. |
| [jg_ReOrg](jg_ReOrg/) | ScriptUI panel | Compact reorder-by-canvas-position panel (top/bottom/left/right). |
| [jg_SortLayersByPosition](jg_SortLayersByPosition/) | ScriptUI panel | Same engine as ReOrg with a more descriptive UI (arrows + labels). |
| [jg_SplitMask](jg_SplitMask/) | ScriptUI panel | Splits a multi-mask layer into one independent layer per mask. |
| [jg_SplitShapeLayer](jg_SplitShapeLayer/) | ScriptUI panel | Splits a shape layer into one independent layer per top-level group. |
| [jg_TrimToKeys](jg_TrimToKeys/) | ScriptUI panel | Trims layer In/Out points to the first and last selected keyframes. |
| [jg_translationEffect](jg_translationEffect/) | One-shot | Cascading scramble morph between two text strings, single-slider driven. |

---

## Installation reminder

For all scripts:

> **Preferences > Scripting & Expressions > Allow Scripts to Write Files and Access Network** must be enabled.

**ScriptUI panels** go in:

- **macOS** → `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
- **Windows** → `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`

Restart AE; they appear under `Window > <script name>`.

**One-shot scripts** can be run with `File > Scripts > Run Script File…` or copied into the `Scripts/` folder (one level up from `ScriptUI Panels/`) to be listed under `File > Scripts`.

---

## License

Free to use, modify, and adapt. If any of these save you time, great.
