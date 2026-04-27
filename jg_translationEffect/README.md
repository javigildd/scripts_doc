# jg_translationEffect

> One-shot script that morphs a text layer from a source string into a target string with a cascading scramble of random characters. All controlled by a single slider.

- **Script file:** `jg_translationEffect.jsx`
- **Type:** One-shot — run via `File > Scripts > Run Script File…`.
- **Selection required:** one text layer.

---

## What it does

Run the script with a text layer selected. A dialog asks for:

- **Source text** (defaults to whatever's in the layer — usually you keep it).
- **Target text** (the string the layer ends up showing).
- **Charset** (which characters appear during the scramble).
- **Direction** (the scan order across the line).

The script then writes an **expression on Source Text** that rebuilds the visible string every frame, plus a text animator with an Expression Selector that paints the **currently scrambling** characters in a custom colour.

You drive the whole thing with one slider: **Translation Progress** (0 → 100). Keyframe it from 0 to 100 to play the morph.

---

## Effects added to the layer

| Effect | Range | Purpose |
|---|---|---|
| **Translation Progress** | 0–100 | Main driver. Keyframe this. |
| **Translation Width** | 0–100 | Width (%) of the active scramble band per character position. Smaller = sharper transition wave. Default 30. |
| **Translation Speed** | 0+ Hz | How fast random characters flip during scramble. Default 20. |
| **Translation Charset** | dropdown | Pool of characters used during scramble. |
| **Translation Direction** | dropdown | Scan order (which letters morph first). |
| **Translation Color** | colour | Fill colour applied to the characters currently scrambling. |
| **Translation Color Softness** | 0–100 | At 0 the colour is hard-clipped to actively scrambling chars. At higher values it bleeds into adjacent chars for a gradient look. Default 0. |

### Charsets

- **ASCII** — full printable ASCII.
- **Letters** — A–Z, a–z.
- **Alphanumeric** — letters + digits. (Default.)
- **Symbols** — `!@#$%^&*()_+-=[]{}|;:<>?/\`.
- **Binary** — `0` / `1`.
- **Hex** — `0–9`, `A–F`.
- **Katakana** — a representative subset of Japanese katakana for that *Ghost in the Shell* feel.

### Directions

- **Left → Right** — first character morphs first, last character last.
- **Right → Left** — reversed.
- **Center → Out** — centre of the line morphs first, ends last.
- **Edges → In** — both ends morph first, centre last.
- **Random** — each position gets a deterministic random phase (seeded by index, so the order is stable across frames).

---

## Usage

1. Type the source text into a text layer.
2. Select that layer.
3. `File > Scripts > Run Script File…` → pick `jg_translationEffect.jsx`.
4. In the dialog: confirm the source, type the target, choose charset + direction, click **Apply**.
5. Keyframe **Translation Progress** from `0` (showing source) to `100` (showing target).

The animation can run forwards or backwards — animate `100 → 0` to morph back to the source.

---

## How it works

### Source Text expression

The expression on `Source Text` rebuilds the visible string every frame:

1. Pads the shorter of source / target with spaces so they're the same length.
2. For each character position `i`:
   - Computes a per-position **phase** (0 to 1) from the chosen direction.
   - Computes the **threshold** at which this position starts morphing: `phase * (1 - width)`.
   - Computes a normalised **local progress**: `(progress - threshold) / width`.
   - If local progress ≤ 0 → still showing the source character.
   - If local progress ≥ 1 → already showing the target character.
   - Otherwise → emit a deterministic random character from the charset, re-seeded by `i * 10007 + floor(time * speed)` so the flip rate is controlled by `Speed`.

Result: a wave of scramble that sweeps across the line in your chosen direction, with `Width` controlling how sharp the wave front is.

### Color animator

A single text animator named `Translation Scramble` with an Expression Selector and a Fill Color property. The selector's `Amount` is driven by the same phase/threshold/local-progress maths:

- `Amount = 100` while a character is in the scramble band → it gets `Translation Color`.
- `Amount = 0` outside the band → it keeps the layer's normal fill.
- If `Color Softness > 0`, characters near the band fade in/out of `Translation Color` with a linear falloff, giving a soft gradient edge.

### Cleanup on re-run

Re-running the script on a layer cleans up previous `Translation …` effects and the `Translation Scramble` animator before applying the new ones. Safe to iterate.

---

## Tips

- **Sharp glitch:** `Width = 5–15`, `Speed = 30+`, charset `Symbols` or `Hex`, direction `Left → Right`.
- **Soft fade:** `Width = 50+`, `Speed = 5`, `Color Softness = 60`, direction `Center → Out`.
- **Matrix:** charset `Katakana`, direction `Random`, `Color = green`.
- **Binary code:** charset `Binary`, direction `Left → Right`.
- **Reverse the morph:** keyframe Progress from 100 → 0 to morph target → source.
- The script preserves line breaks: source/target are stored with `\r` so multi-line targets work the same as multi-line sources.
- Need a different morph trail per line? Run the script on each line as its own layer — the animator and expressions are per-layer.
