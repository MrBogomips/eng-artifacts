---
name: visual-contract
description: "The visual design of the artifacts plugin and the two guarantees it must keep: visual coherence among artifact types, and a themable UI with a light/dark switch. Holds the role vocabulary (token names), the default theme, the drawing rules, and the checkable invariants. Use when designing, building or reviewing anything that affects how an artifact looks: an artifact skill or template, the shared style source, tokens, a theme, light or dark mode, the mode switch. Also use to decide which token, color, font, corner or line weight to use, to check a proposal, to self-check before a hand-off, and when asked whether artifacts are coherent, themable, or work in dark mode."
---

# Visual contract

The plugin promises two things about every artifact it produces, whatever its type (WBS, Gantt, UML, ERD, BPMN, any diagram):

1. **Visual coherence**: the artifacts look like one family.
2. **Themable UI with a light/dark switch**: the look can be replaced as a whole, and every look works in light and in dark.

Both promises fail quietly. One skill with its own shade of blue, or one template tested only in light mode, is enough, and nobody notices until two artifacts sit side by side. The invariants below turn the promises into things that can be checked on files and on rendered output.

## The design

The look itself is defined in `references/`:

| File | Holds | Read it when |
|---|---|---|
| `references/design.md` | The principle, the role vocabulary (every token and what it is for), how each role is drawn, type, geometry, status marks, fixed notation shapes, and the map of roles across artifact types | building or reviewing anything visual; deciding which token to use; adding an artifact type |
| `references/default-theme.css` | The default theme: every token's value, light and dark, in the shape an Artifact page expects | you need a value, or the shape a theme must have |
| `references/alt-theme.css` | A second complete theme, unlike the default in every group of tokens | checking that the plugin is themable (VC-4) |

In short: structure carries the meaning. A solid header band names a work package, a class, a table and a pool alike, and the body stays plain. A group color says what a node belongs to; one mark color says what is critical. Artifacts are built for Artifact pages first.

## Invariants

**VC-1: one style source.** Every artifact skill takes color, typography, spacing, stroke, shape and elevation from the plugin's single shared style source. No artifact skill, template or example carries a literal style value (a hex, rgb or hsl color, a font family, a fixed size) outside that source. A second source, however small, is where the family starts to split.

**VC-2: semantic tokens.** Tokens are named for the role they play (`--surface`, `--ink`, `--mark`, `--status-done`, `--group-2`), not for how they look (`blue-500`, `gray-dark`). Artifact skills reference only the names in the role vocabulary of `references/design.md`. A role name stays true when the theme changes; an appearance name becomes a lie in the first dark mode.

**VC-3: same role, same look.** A role that two artifact types share (node, header band, connector, status mark, group, mark, legend) is drawn the same way in both, by the formulas and rules of `references/design.md`. A new artifact type reuses existing roles before adding one, and gets its column in the role map. A new role is added to the vocabulary and to every theme, never to one skill.

**VC-4: themable.** A theme is a complete set of token values and nothing else. Applying another theme needs no edit to an artifact skill, a template or the artifact's content. The default theme is one theme among others, not a special case the code depends on.

**VC-5: light and dark.** Every theme defines both modes for every color token. Every artifact is complete and legible in both: nothing disappears, nothing keeps the other mode's color, and text against its background reaches a contrast ratio of 4.5:1 (3:1 for large text and for the lines and shapes that carry meaning). The pairs to check are listed at the end of `references/design.md`.

**VC-6: the switch.** An interactive artifact (a page the viewer opens) carries a visible light/dark switch, starts from the viewer's system preference, and applies the choice to the whole artifact. A static artifact (an image placed in a document) takes the mode as a render parameter, and both modes come from the same source without editing it.

## What is defined where

This skill defines the look and the invariants. The plugin's files implement them. Until the plugin has its own shared style source, `references/default-theme.css` is the definition of the default theme: the OpenSpec change that creates the plugin's style source takes its values and its token names from here. From that change on, the plugin's file is the single source (VC-1 applies to this skill too): replace `references/default-theme.css` and `references/alt-theme.css` with a pointer to the plugin's files in the same change, so the values never live in two places.

The specs under `openspec/specs/` are authoritative for the mechanism: where the style source lives, the theme file format, how a project overrides a theme, how the switch is built. Read them before checking. Where no spec covers the mechanism yet, check the invariants against what the change under review proposes, and say in the result that the mechanism is not specified.

A spec or a change may make an invariant stricter. None may weaken one, and none may change the design in `references/` on its own: a change to the principle, the vocabulary or the default values is a decision for the user, raised as such.

## How to check

Run both parts. The static scan finds what was written wrong; the render matrix finds what looks wrong.

**Static scan** (VC-1, VC-2, VC-3, VC-4):

1. Locate the shared style source from the specs or the change.
2. Search every artifact skill, template and example outside it for literal style values: color literals, font family names, fixed sizes. Each hit is a VC-1 finding unless it is content (for example a hex code inside a user's sample data) or a size the design fixes (the type sizes and the notation rules in `references/design.md`).
3. Read the token names: a name outside the role vocabulary, or an appearance name, is a VC-2 finding.
4. For each role used by more than one artifact type, compare how it is drawn with the formulas in `references/design.md`: a difference is a VC-3 finding. So is an artifact type missing from the role map.
5. Search for the default theme's name or values referenced from an artifact skill: a hit is a VC-4 finding.

**Render matrix** (VC-3, VC-4, VC-5, VC-6):

Render at least two artifact types, each in the default theme and in the alternate theme, each in light and dark: eight renders at minimum. If only one artifact type exists, render it and say that cross-type coherence is not verified.

- Side by side across types: shared roles look the same, status marks keep their shapes, notation shapes are intact, no text is under 10.5px (VC-3).
- Across themes: the artifact changed by switching the theme only (VC-4).
- Across modes: complete and legible; measure contrast for text and meaning-carrying lines when in doubt (VC-5).
- For an interactive artifact: operate the switch, check the starting mode against the system preference, check that no part stays behind (VC-6).

Use the renderer the artifact's medium needs and the session has (a browser driver for a page, the diagram tool's CLI for diagram source). Save each render under the run's folder in `_agents_workspace/` and cite it. If nothing in the session can render the medium, the result for the invariants that need a render is `not verified`. Never report an unrendered artifact as passing.

## Reporting a result

One line per invariant, with evidence a reader can open:

```
VC-1  fail          skills/wbs/templates/page.html:42  literal color #1f6feb
VC-2  pass
VC-3  fail          renders/wbs-default-light.png vs renders/uml-default-light.png  node border differs
VC-4  pass
VC-5  not verified  no renderer available for SVG in this session
VC-6  pass          renders/wbs-switch-dark.png
```

A result is `pass`, `fail` or `not verified`. The overall verdict is `pass` only when every invariant is `pass`; any `not verified` makes it `incomplete`, which is reported as such and is not a pass.
