# jg_EffectReport

> ScriptUI panel that scans your project (or just the active comp) and produces a text report of every effect in use, separating native After Effects effects from third-party plugins.

- **Script file:** `jg_EffectReport.jsx`
- **Type:** ScriptUI panel — install in `ScriptUI Panels/` and open via `Window > Effect Report`.

---

## What it does

Useful when:

- **Auditing a project before delivery** — confirm no leftover trial-version effects, or spot effects you forgot you applied.
- **Sending a project to a colleague** — generate a list of third-party plugins they'll need to install before they can open the file without missing-effect warnings.
- **Cleaning up a heavy project** — see exactly where each effect is being used (which comp, which layer).

The report is text-based, scrollable inside a dialog, and savable to a `.txt` file.

---

## Installation

Copy `jg_EffectReport.jsx` into your AE `ScriptUI Panels/` folder and restart AE. Open via `Window > Effect Report`.

---

## Panel options

```
[Scope]
  ( ) Entire project
  ( ) Active composition only

[Options]
  [✓] Include disabled effects
  [✓] Include adjustment layers

[ Generate Report ]
```

- **Scope:** scan every comp in the project, or just the one you have open.
- **Include disabled effects:** if off, effects that are toggled off via the FX switch are skipped.
- **Include adjustment layers:** if off, effects on adjustment layers are skipped (useful when you only care about effects bound to actual content).

Click **Generate Report** to run the scan and open the result dialog.

---

## How "native" is detected

The script flags an effect as native (Adobe / built-in) if its `matchName` starts with one of:

- `ADBE` — core After Effects effects
- `APC` — Adobe Premiere-compatible effects
- `CS ` — Creative Suite shared effects
- `Adobe` — other Adobe-branded plug-ins

Anything else is treated as third-party. The script reads `matchName`, not display name, so renaming the effect on a layer doesn't fool the classifier.

---

## Report contents

The output is a plain-text report with three sections:

```
================================================================
  EFFECT REPORT
  Project: MyProject.aep
  Scope: Entire project
  Compositions scanned: 12
  Date: 4/27/2026
================================================================

  SUMMARY
  ----------------------------------------------------------------
  Unique effects:        17
    - Native (Adobe):    14
    - Third-party:       3
  Total effect instances: 78

================================================================
  THIRD-PARTY EFFECTS (3)
================================================================

  1. Optical Flares
     matchName: VC Optical Flares
     Instances: 4
       - LightingComp > Sun
       - LightingComp > Lens Hits
       - …

================================================================
  NATIVE EFFECTS (14)
================================================================

  1. Curves
     matchName: ADBE CurvesCustom
     Instances: 12
       - …
```

For each unique effect (keyed by `matchName`):

- **Display name** — the name AE uses in the FX panel.
- **matchName** — the internal identifier (great for reporting bug reports / asking colleagues).
- **Instances** — how many times this effect appears across the scanned scope.
- **Per-instance list** — `<comp name> > <layer name>` for every occurrence, with `[DISABLED]` flagged on disabled instances.

Effects are sorted alphabetically by display name within each section. Third-party effects are shown first, since they're usually the most useful information.

---

## Save to file

The result dialog has a **Save to File** button that writes the report to a `.txt` file via the standard save dialog. Useful for:

- Including in handoff notes.
- Diffing against a previous version of the project.
- Pasting into a ticket / Slack message when something breaks on someone else's machine.

---

## Tips

- **Run after every revision** to catch effects that snuck in (e.g. a stray `Curves` you didn't mean to keep).
- **Disable adjustment layers / disabled effects** when you want a strictly "what will actually render" view.
- The report counts **unique effects** by their `matchName`, so two different *named* instances of the same effect type still merge into one entry with two occurrences. Disabled instances appear as `[DISABLED]`.
- Empty sections show `(none)` rather than being hidden, so you always know whether the absence is real.
