# jg_CodingColor

> One-shot script that applies code-editor syntax highlighting to a text layer. Auto-detects the language, exposes a Language and a Theme dropdown on the layer, and lets you tweak each token color independently.

- **Script file:** `jg_CodingColor.jsx`
- **Type:** One-shot — run via `File > Scripts > Run Script File…`.
- **Selection required:** one text layer with code in it.

---

## What it does

Pick a text layer with code, run the script, and the script will:

1. **Detect the language** (Python / JavaScript / C++ / HTML) by scoring the contents.
2. **Tokenize** the text in all four languages and keep ranges per token type (`Keyword`, `Type`, `Function`, `Number`, `String`, `Comment`, plus `Main` for everything else).
3. **Add a `Lenguaje` dropdown** on the layer (Python / JavaScript / C++ / HTML) so you can correct the auto-detection without re-running the script.
4. **Add a `Tema` dropdown** with `Custom` plus six built-in themes (One Dark, Monokai, Dracula, Solarized Dark, GitHub Light, Synthwave).
5. **Add one Color Control effect per token type** (`Color Principal`, `Color 1 - Keywords`, `Color 2 - Types`, `Color 3 - Functions`, `Color 4 - Numbers`, `Color 5 - Strings`, `Color 6 - Comments`).
6. **Add one text animator per token type** with an Expression Selector that highlights only the right characters per language.

Result: a single text layer that lights up like a code editor, with full per-color customisation and live theme switching.

---

## Usage

1. Make a text layer with your code in it. Line breaks are fine; emojis are fine.
2. Select the layer.
3. `File > Scripts > Run Script File…` and pick `jg_CodingColor.jsx`.
4. Open Effect Controls. Tweak `Lenguaje` and `Tema` as needed.

If detection picks the wrong language, just change `Lenguaje` — no re-run needed.

---

## Built-in themes

| Theme | Style |
|---|---|
| **Custom** | Your own colours. The seven Color Controls drive the result; edit them by hand. |
| **One Dark** | Atom's classic dark theme — purples, oranges, soft blues. |
| **Monokai** | Pinks, greens, yellows on dark. |
| **Dracula** | Purple-pink palette. |
| **Solarized Dark** | Muted yellows / cyans on a desaturated dark base. |
| **GitHub Light** | Light theme matching GitHub's diff colors. |
| **Synthwave** | Hot pink + cyan, neon vibes. |

When `Tema = Custom`, every Color Control returns its own `value` — that's the colour you edit. When `Tema` is set to a preset, an expression on each Color Control overrides the value with the preset's colour. Switching back to `Custom` restores your tweaks.

---

## Token types

| Token | Effect name | Examples |
|---|---|---|
| `Main` | `Color Principal` | Punctuation, operators, plain identifiers — the default colour. |
| `Keyword` | `Color 1 - Keywords` | `def`, `if`, `return`, `function`, `const`, `class`, `<html>` tag names, etc. |
| `Type` | `Color 2 - Types` | `print`, `int`, `Array`, `Promise`, `std`, `vector`, etc. |
| `Function` | `Color 3 - Functions` | Anything followed by `(`. |
| `Number` | `Color 4 - Numbers` | Integer / float literals. |
| `String` | `Color 5 - Strings` | Single, double, triple, and (JS) template strings. |
| `Comment` | `Color 6 - Comments` | `#`, `//`, `/* … */`, `<!-- … -->`. |

If a given token type doesn't appear in any of the four languages for the current text, that animator + Color Control isn't added.

---

## How language detection works

The script runs a battery of regex tests over the text and scores each language:

- **HTML** — DOCTYPE, common tags (`<html>`, `<div>`, `<script>`…), generic tag pattern.
- **C++** — `#include`, `std::`, `int main(`, `cout <<`, `nullptr`, `template<`.
- **Python** — `def …(`, `import …`, `from … import`, trailing `:`, `elif`, `self`, `True/False/None`, dunder names.
- **JavaScript** — `function name(`, `=>`, `const/let/var =`, `console.log(`, `null/undefined`, trailing `;`.

Highest score wins. The default fallback is Python.

You can override the result at any time with the `Lenguaje` dropdown — the expressions on the animators read it and switch token ranges per frame.

---

## How character indexing works

After Effects' `textIndex` doesn't follow native string indices in two ways:

- It **does not count** line breaks (`\r` / `\n`).
- It treats a **surrogate pair** (e.g. `🎯` U+1F3AF) as **one** character.
- It collapses **variation selectors** (`U+FE00..FE0F`) and **Zero Width Joiner** (`U+200D`) into the previous grapheme.

The script builds a map from raw string indices to AE indices so that the highlight ranges stay aligned with the visual characters even when the text contains emojis, ZWJ sequences, or line breaks.

---

## Re-running

Running the script again on the same layer cleans up any previous animators and effects whose names start with `Color `, `Color Principal`, `Lenguaje`, `Tema`, or `JG ` before applying the new highlighting. So it's safe to re-run after editing the text.

---

## Tips

- **Use a monospaced font** (Fira Code, JetBrains Mono, Source Code Pro, etc.) for proper code-editor look.
- **Custom theme** is the default after running the script. Pick a preset from `Tema` to test out looks; switch back to `Custom` to keep your manual tweaks live.
- The colour for each token type comes from the matching Color Control, which you can keyframe like any other property.
- Animators are stacked bottom-up: `Main` → `Keyword` → `Type` → `Function` → `Number` → `String` → `Comment`. Higher-priority categories paint over lower ones.
