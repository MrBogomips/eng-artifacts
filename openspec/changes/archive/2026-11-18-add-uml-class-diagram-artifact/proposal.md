# Proposal

## Why

The plugin draws one artifact type, ERD, so its promise of one visual language across artifact types has not been tested. A UML class diagram is the second type (issue #5). Developers, architects and analysts need class diagrams at several levels of detail, and so does project documentation. They start from source code, from a textual domain description or from a DDD domain model. Unassisted, an agent spends 8 to 12 M tokens and over 30 minutes on one such page, and three attempts give three different looks.

## What Changes

- **UML class diagram artifact.** A new plugin skill, `uml-class-diagram`. It turns source code, a domain description or a DDD domain model into a small JSON model, validates it and produces the page:
  - **Model content:** classifiers (class, abstract class, interface, enumeration) with stereotypes, generic parameters, attributes, operations and literals; packages; relationships of six kinds (generalization, realization, composition, aggregation, association, dependency), with roles and multiplicities at association ends.
  - **Drawing:** classes are the design's header-band nodes. Packages are zones in group colors, as ERD groups are. Connectors carry the fixed UML notation ends, and the layout is automatic.
  - **Page:** a switch of detail level (all members, public members only, class names only) and a dependencies switch, both of which re-lay the drawing out. A relationships table under the drawing, a legend and a counts line.
- **Shared page: interaction from the chosen sketch.** These upgrades are made for every artifact type, ERD included, so the two types stay coherent:
  - A click pins the highlight of a node or connector until Esc, a second click or a click on empty space; nodes can be reached and pinned with the keyboard.
  - Connectors hop at crossings.
  - The drawing pans by dragging its empty part and zooms with Ctrl+wheel or a pinch around the pointer; a plain wheel still scrolls the page.
  - Keyboard shortcuts for zoom, Fit, 1:1 and the Dark mode toggle.
  - A view-options control (a choice of one among several and an on/off switch) that an artifact type uses to redraw with other options.
- **Design extension (decided by the user on 2026-11-18).** In `.claude/skills/visual-contract/references/design.md`:
  - **New role `--key-stereotype`:** the color of a stereotype chip, added to the vocabulary and to both themes, light and dark, with its contrast pair.
  - **UML column of the role map:** packages take group colors and zones exactly as ERD groups do (a class outside every package is neutral with a dashed outline). The details table lists relationships.
  - **Groups beyond five (decided by the user on 2026-11-18):** the rule "more than five groups: reuse is not allowed" is replaced. A drawing may have up to sixteen groups; the five group colors are assigned in order of first appearance and cycle from the sixth, and zones are told apart by their labels. The rule is shared, so it applies to ERD groups and UML packages alike, and the ERD validator's limit rises from five to sixteen.
  - **UML notation shapes completed:** aggregation (a hollow diamond), realization (a dashed line with a hollow triangle), dependency (a dashed line with an open arrowhead), navigability (an open arrowhead), the template-parameter box, and the compartment rule.
  - **Line hop:** added to the connector's drawing rules.
- **Assembler.** It finds a type's validator by the type name with hyphens read as underscores (`uml_class_diagram_model.py`), so a hyphenated type name maps to an importable module. ERD is unchanged.
- **Version.** The plugin goes to 0.3.0.

## Capabilities

### New Capabilities

- `uml-class-diagram-artifact`: UML class diagrams. Covers the model the skill writes, its validation, the sources it starts from, the notation, detail levels, packages, layout, the relationships table and the legend.

### Modified Capabilities

- `artifact-page`: linked highlighting gains a pinned selection by click and keyboard. Zoom gains drag-to-pan, Ctrl/pinch zoom and keyboard shortcuts. New requirements cover connectors hopping at crossings and view options that redraw the artifact.
- `erd-artifact`: a model may define up to sixteen groups, whose colors cycle through the five group roles; a seventeenth group is rejected.
- `visual-theme`: the token set has four key roles (the stereotype role is added), each with a light and a dark value in every theme.

## Exploration

- **Issue:** [MrBogomips/eng-artifacts#5](https://github.com/MrBogomips/eng-artifacts/issues/5).
  - The brief: three audiences (developers, architects and analysts, project documentation); sources are code, a textual description or a DDD model.
  - The record: in the issue's exploration comment.
- **Prompt:** one complex prompt, `_agents_workspace/explore-uml-class-diagram/cases/complex/prompt.md` (fingerprint `274c32d06202`).
  - It holds the TypeScript domain layer of an event ticketing service, with four folders as packages, DDD markers and generics.
  - It asks for every relationship kind, stereotypes, multiplicities, packages, three detail levels, click-to-highlight, a legend and a light/dark switch.
- **Runs:** three unassisted runs at effort `xhigh`, all delivered and skill-free (sketch `sketch-2026-11-18T06-57-16Z`, 26.11 USD).
- **Chosen run:** run 1, `evals/results/sketch-2026-11-18T06-57-16Z/sketch-complex/with-1/deliverables/class-diagram.html`. No further hints.
- **Decisions the person took on 2026-11-18 when adapting the run to the design:**
  - the four shared interactions above;
  - packages as groups, up to sixteen, with group colors cycling after the fifth (the same rule for ERD groups);
  - stereotype chips in a new role;
  - the shared details table rather than run 1's floating card.

Features kept, and the role each one maps to:

| Feature (run 1) | Role in the vocabulary |
|---|---|
| Class box: name over attribute and operation compartments | header-band node (reused); compartment rule = `.node-rule` (reused) |
| Visibility, types, parameters, multiplicities, static underlined, abstract italic | `--font-body` / `--font-data`, `--ink`, `--ink-2` (reused); italic abstract name already in the design |
| Stereotypes «interface», «enumeration», «aggregate root», «value object» | chip (reused shape) colored by **`--key-stereotype` (missing role, added by the person's decision)** |
| Generic parameters in a dashed corner box | node body and outline roles with the dashed variant of `.node-outline.ungrouped` (reused) |
| Enumeration literals | header-band node rows (reused) |
| Packages as colored groups | `--group-1` … `--group-5`, cycling from the sixth package, zone, `--neutral` for a class outside every package (reused) |
| Generalization, realization, composition, aggregation, association, dependency | connector, dashed variant, `.notation`, `.notation-ring` fill rule for hollow shapes (reused); shapes fixed by the UML notation |
| Role names, multiplicities, binding labels `<T → Order>` | edge label (reused) |
| Line hops at crossings | connector (reused); hop added to its drawing rule |
| Click to highlight a class and its direct relationships; edge click | highlight, `--mark`, `--dim` (reused); pinned by click |
| Hover thickening | highlight (reused: hover already flags in `--mark`) |
| Detail level all / public / names; dependencies switch | view options (new page control, drawn with the toggle's roles) |
| Pan, Ctrl/pinch zoom, Fit, zoom readout | zoom (reused, extended) |
| Keyboard shortcuts 1/2/3, D, ±, F, T, Esc | page chrome (no visual role) |
| Legend of the notation | legend card (reused) |
| Stats line | counts line (reused) |
| Light/dark from the system preference, remembered | Dark mode toggle (reused) |
| Enumeration-typed fields drawn as associations; association fields also kept as attributes | modelling rule of the skill, no role |

Deliberately left out:
- **The legend as a right sidebar, and its L key.** The shared legend card under the drawing is used instead.
- **The floating card of outgoing and incoming relationships.** The shared relationships table is used, and pinning a class highlights its rows.
- **Run 1's plain-wheel zoom.** A plain wheel scrolls the page and Ctrl or a pinch zooms, so the page below the drawing stays reachable.
- **The double line between Customer and Order.** A field and its inverse become one association with two navigable ends.
- **Hand-placed grid positions.** The model carries no coordinates and the layout is automatic.
- **Run 1's palette, Helvetica stack and sizes.** None carries into the plugin.

## Visual contract

| Invariant | How this change keeps it |
|---|---|
| VC-1 one style source | The UML renderer, its layout file and the new shared code hold no color, font family or size of their own. Sizes derive from `--arrowhead` and the shared primitives' metrics. `--key-stereotype` gets its values only in `shared/themes/`. The style-source test also covers the new files. |
| VC-2 semantic tokens | Only role-vocabulary names are used. The one new name, `--key-stereotype`, is a role (the kind of a chip), added to the vocabulary table and to every theme. |
| VC-3 same role, same look | A class is the shared header-band node, a package the shared zone, a stereotype the shared chip. Connectors, labels, highlight, legend, details table and counts line are shared primitives. The interactions taken from run 1 (pinning, hops, pan and zoom, shortcuts) are added to the shared page, so the ERD gets them too, and the role map gets the UML column filled in. The reviewer compares the two types side by side. |
| VC-4 themable | Both shipped themes and a project theme copy produce the UML page with no other edit. A project theme without `--key-stereotype` is rejected with the token named, as for any missing token. |
| VC-5 light and dark | `--key-stereotype` has a light and a dark value in both themes, and its chip pair joins the contrast list. The reviewer renders UML and ERD in both themes and both modes. |
| VC-6 the switch | The UML page carries the shared Dark mode toggle; the new T shortcut operates the same toggle. The view-options control's states are told apart in every theme and mode, by the toggle's own roles and focus ring. |

## Effectiveness

- **Testbed:** `evals/uml-class-diagram/`, seeded from the exploration.
  - **Complex:** the sketch prompt revised by the fair-case rules: TypeScript source with DDD markers, every relationship kind, packages, detail levels, highlighting, legend, light/dark.
  - **Medium:** a DDD domain model described in prose, with three bounded contexts as packages, aggregates and value objects, composition and aggregation, and detail levels.
  - **Easy:** five or six classes of a small domain from a short description, with inheritance and associations.
  - Each case names a self-contained HTML deliverable and never names the plugin.
- **Graders:** mechanical only: the deliverable exists, one regex per expected classifier name, the skill was used (plugin arm only).
- **Arms:** with the plugin and without it, the same prompts, model `claude-opus-5-5` at effort `medium`, three runs each.
- **Targets:** the defaults. Summed over the cases' medians: at least 20% fewer tokens and at least 20% less time, no case worse on either measure, and every plugin run passing its checks.
- **Cost:** measured and reported, not capped.
- **Baseline first:** the testbed runs once with `--baseline` before the skill is built, to record the baseline and check that every case is fair. The sketches are not the baseline.
- **Decision:** the user reviews the kept deliverables of both arms and records `adopt`, `rework` or `reject` in `evals/uml-class-diagram/RESULTS.md`.

## Impact

- **New:** `skills/uml-class-diagram/`, containing:
  - `SKILL.md` and `README.md`;
  - `references/model.md`;
  - `scripts/uml_class_diagram_model.py`;
  - `assets/uml-class-diagram.js`, `uml-class-diagram-layout.js` and `uml-class-diagram.json` (pinned elkjs 0.11.1, as ERD uses);
  - test fixtures under `tests/fixtures/uml-class-diagram/` and `evals/uml-class-diagram/`.
- **Changed in the plugin:**
  - `shared/page/core.js`: pinned highlight, keyboard reach, hops on connectors;
  - `shared/page/chrome.js`: pan, Ctrl/pinch zoom, shortcuts, view options;
  - `shared/page/page.css` and `shell.html`: the view-options slot and its roles;
  - `shared/themes/default.css` and `alt.css`: `--key-stereotype`;
  - `shared/scripts/artifact_page.py`: the validator name;
  - the manifests (0.3.0);
  - the README skills table;
  - the structural tests (style source, assembler, a model test for the new type).
- **ERD:** it changes through the shared page (the new interactions and hops) and in its validator, which accepts up to sixteen groups with cycling colors. Its model format and notation are unchanged, and its tests must still pass (the six-groups fixture moves to seventeen).
- **Harness:** `visual-contract/references/design.md` (the vocabulary, the group-color rule, the role map's UML column, the UML notation, the line hop); `CLAUDE.md` (state, change history).
- **Out of scope:**
  - object, sequence and other UML diagrams;
  - nested packages;
  - search and export;
  - view state in the URL;
  - outputs other than the HTML page;
  - the relationship with the `plantuml` plugin.
