# Design

## Context

The motivation is in `proposal.md`. This design builds on the plugin as it stands at 0.2.0:

- **Assembly.** A page is assembled by `shared/scripts/artifact_page.py` from `skills/<type>/`: `scripts/<type>_model.py`, `assets/<type>-*.js`, `assets/<type>.js` and an optional `assets/<type>.json` of pinned external scripts. The page shell, `page.css`, `core.js` and `chrome.js` are inlined, followed by the model as JSON.
- **Shared primitives.** `core.js` provides the header-band node (fixed metrics: band 34, rows 24), the zone, the chip, the connector path, edge labels and the linked-highlight registry `A.hl`. The registry highlights on hover with a mouse and on tap on a touch screen.
- **Page chrome.** `chrome.js` owns the Dark mode toggle, the zoom buttons (−, +, Fit, 1:1), the counts line, the legend card and the details card.
- **ERD.** Its layout uses ELK `layered` from elkjs 0.11.1, with groups as compound nodes and ports on rows, plus a grid fallback.
- **Design rules.** `design.md` limits a drawing to five groups and has an empty UML cell for the details table. The UML notation it fixes covers composition, generalization and navigability only.

The person's decisions of 2026-11-18 are binding here:
- click pinning, line hops, drag-to-pan and Ctrl/pinch zoom go into the shared page;
- packages are groups;
- up to sixteen groups, with colors cycling;
- stereotype chips take a new role, `--key-stereotype`;
- the shared details table is used, not a floating card.

## Goals / Non-Goals

**Goals:**
- A class diagram page that run 1 of the exploration would recognise as its own in functionality, drawn entirely with the shared roles.
- Every interaction added for UML lives in `shared/page/` and works on the ERD page unchanged.
- The skill writes only a JSON model; validation errors name the field and the problem, as for ERD.

**Non-Goals:**
- A shared ELK layout helper extracted from `erd-layout.js`. The UML layout is a file of its own; a later change may factor out what the two share once both are stable.
- Persisting view options (detail level, dependencies) across visits or in the URL.
- Nested packages, notes, association classes, qualifiers, interface lollipop notation.

## Decisions

### D1. Type name and files

The type is `uml-class-diagram`, the same as the skill's folder:

| File | Purpose |
|---|---|
| `skills/uml-class-diagram/SKILL.md` | the skill |
| `skills/uml-class-diagram/README.md` | capabilities and performance |
| `references/model.md` | the model format and one complete example |
| `scripts/uml_class_diagram_model.py` | `validate(model) -> list[str]` |
| `assets/uml-class-diagram-layout.js` | geometry, ELK graph, grid fallback, label placement |
| `assets/uml-class-diagram.js` | renderer, legend, table, counts, view options |
| `assets/uml-class-diagram.json` | elkjs 0.11.1 with the same URL and integrity as ERD |

Model files are named `<name>.uml.json`.

The assembler today loads `scripts/<type>_model.py`, so a hyphenated type would need a hyphenated module file. It will load `scripts/<type with "-" replaced by "_">_model.py` instead. For `erd` the name is unchanged.

*Alternative:* name the type `uml` or `uml_class`. Rejected: the type name is the skill folder's name, and keeping one identity avoids a mapping table.

### D2. The model

```json
{
  "title": "Event ticketing — domain layer",
  "description": "optional",
  "packages": [{ "id": "booking", "label": "booking" }],
  "classifiers": [{
    "name": "Order", "kind": "class", "abstract": false, "package": "booking",
    "stereotypes": ["aggregate root"], "typeParams": [],
    "attributes": [{ "name": "MAX_TICKETS", "type": "number", "visibility": "private",
                     "static": true, "readOnly": true, "default": "10" }],
    "operations": [{ "name": "confirm", "visibility": "public", "returns": "Promise<Receipt>",
                     "params": [{ "name": "payments", "type": "PaymentService" }],
                     "static": false, "abstract": false, "constructor": false }],
    "literals": []
  }],
  "relationships": [
    { "kind": "composition", "from": "Order", "to": "OrderLine",
      "fromEnd": { "multiplicity": "1" },
      "toEnd": { "role": "lines", "multiplicity": "0..*", "navigable": true } },
    { "kind": "realization", "from": "OrderRepository", "to": "Repository", "bindings": { "T": "Order" } },
    { "kind": "dependency", "from": "Order", "to": "PaymentService", "label": "use" }
  ]
}
```

- **Direction:** `from` is the child of a generalization or realization, the whole of a composition or aggregation, the source of an association, and the client of a dependency. The renderer derives every end shape from the kind and `navigable`.
- **Visibility:** `public | protected | private | package`, drawn as `+ # - ~`.
- **Optional fields:** every member field except `name` is optional, so a domain-level model from prose needs no types.
- **Rejected fields:** any field the format does not define, including `x`, `y`, `position`, `style` and markup.
- **Validator checks:**
  - every requirement of the `uml-class-diagram-artifact` spec;
  - multiplicity syntax by a regular expression plus the `n ≤ m` check;
  - a generalization cycle, found by a depth-first search;
  - bindings must name a type parameter of the target;
  - `fromEnd` and `toEnd` are allowed only on the three association kinds.

### D3. Layout

The layout uses ELK `layered`, direction `DOWN`, with `hierarchyHandling: INCLUDE_CHILDREN`:
- **Packages:** each package is a compound node, with padding from `A.zoneMetrics`, so its zone label has its room.
- **Edges:** generalization and realization edges are given to ELK from parent to child, so parents land in upper layers; the renderer draws the hollow triangle at the parent.
- **Routing:** orthogonal, with node and edge spacing from the `--arrowhead` unit as ERD does.
- **Ends:** association ends attach to sides, not rows; ELK places them with `portConstraints: FREE`.
- **End labels:** role and multiplicity labels go to ELK as `HEAD` and `TAIL` labels, so it reserves room for them. The renderer then nudges them off any connector they overlap, using the placement routine ERD uses for its labels.
- **Self-associations:** a loop on the right side.
- **Fallback:** a grid of package blocks, each a square-ish grid of its classes, ordered by first appearance, with straight orthogonal connectors and the shared notice.

Each detail level and dependencies setting is laid out on its own, because box sizes and edge sets change. Layout runs again on every view change; at 26 classifiers that is well under a second in ELK.

*Alternative:* run 1's hand-placed grid plus an A* router. Rejected: it needs positions in the model, which the spec forbids, and it would be a second routing engine beside ELK.

### D4. The class node

A class is drawn by `A.headerNode`, with two shared extensions:
- **Compartment rules:** `rules: [rowIndex]` draws the line in the `.node-rule` role above a row. Attributes and operations are separated this way. An empty compartment keeps a half row, so the two compartments stay distinguishable.
- **Band chips:** `bandChips: [{label, role}]` right-aligns chips in the band, 8px from the right edge (the shared chip inset), with the band width growing to fit the title and the chips.

Other parts of the node:
- **Stereotypes:** chips with `role: 'stereotype'`, text `«aggregate root»`.
- **Generic box:** a rectangle in the node body role with the dashed `.node-outline.ungrouped` stroke, overlapping the band's top-right corner by half its height. Its text is the parameters in the data face. The layout adds its overhang to the node's box, so nothing overlaps it.
- **Member rows:** each row is one `<text>` with spans: visibility, name, then `: type`, `(params): returns` or ` = default` in the data face and `--ink-2`.
  - static members: a span with `text-decoration: underline`;
  - abstract members and the name of an abstract class: italic;
  - constructors: a `«create»` prefix;
  - interface operations: italic.

All sizes come from `A.headerMetrics` and `A.chipMetrics`; the renderer sets none.

### D5. Notation ends

All end shapes are drawn with `.notation` (stroke, round caps). The hollow ones are drawn with `.notation-ring` (filled with `--node`), so they follow highlight like ERD marks. Sizes come from the unit `u = --arrowhead`:

| End | Shape | Size |
|---|---|---|
| Generalization, realization | hollow triangle at the parent | length `u`, width `0.9u`, as the design's head |
| Composition | filled diamond at the whole (`.edge-head` fill) | length `1.6u`, width `0.9u` |
| Aggregation | hollow diamond at the whole | length `1.6u`, width `0.9u` |
| Navigable association end, dependency | open arrowhead: two strokes | length `u`, width `0.9u` |

Line styles:
- realization and dependency use `.edge.dashed`;
- the other kinds use the solid `.edge`.

`design.md` fixes these in its "Notation shapes are fixed" UML line.

### D6. Line hops (shared)

A shared helper, `A.hops(polylines)`, takes every connector's points in draw order and returns, per connector, the crossing points where one of its horizontal runs crosses a vertical run of any other connector.

`A.edgePath(points, { hops })` replaces each such point with a semicircle of radius `0.4u` bulging upward. The hop is part of the same path, so it takes the connector's dash, color and highlight.

Rules:
- crossings closer than `u` to a bend or to a node end are skipped;
- shared end points are not crossings;
- only horizontal runs hop (the usual convention), whichever connector is drawn first, so two connectors never both hop at one point; a rule tied to draw order left crossings unmarked whenever the later connector's run was the vertical one (3 of 5 on the large ERD fixture).

ERD calls the helper after its routing; UML does the same.

*Alternative:* gaps in the earlier line instead of an arc. Rejected: the gap reads as a dash in a dashed connector.

### D7. Pinned highlight (shared)

`A.hl` gains a `pinned` key:
- **Click:** a click (mouse, pen or tap) on a registered node, connector or details row pins it, and clicking the pinned element again unpins it.
- **Hover:** while something is pinned, `mouseenter` and `mouseleave` do nothing.
- **Clearing:** a click on the svg's empty part, or Esc, clears the pin.
- **Keyboard:** registered nodes get `tabindex="0"` and `role="button"` with an `aria-label` the renderer supplies; Enter or Space pins.
- **Focus ring:** a focused node draws the ring as the toggle does, in `--mark`, 2px, offset 2px. In SVG this is an outline rect in `.focus-ring`, a new class in `page.css` that reuses `--mark`.
- **Touch:** the touch behaviour (tap to show, tap again to clear) becomes the same pin, so mouse and touch agree.

### D8. Pan, wheel and keyboard (shared)

`chrome.js` adds these:
- **Drag to pan:** pointerdown on the frame or the svg's empty part, with the primary button, starts a pan once the pointer has moved 4px. The pan changes the frame's `scrollLeft` and `scrollTop`, and a pan that moved suppresses the click that follows, so it neither pins nor clears.
- **Ctrl or Cmd with the wheel:** zooms by `ZOOM_STEP` per 100 units of delta. Trackpad pinches arrive as wheel events with `ctrlKey` in Chromium and Firefox; Safari's `gesturechange` is handled as well. The scroll position is adjusted so the point under the pointer stays put, and `preventDefault` is called only in this case.
- **Keys:** a `keydown` on the document, ignored when the target is an input, select, textarea or contenteditable element:
  - `+` and `=`, `-` and `_`: zoom in and out;
  - `f`: Fit; `0`: 1:1;
  - `t`: clicks the toggle;
  - Esc: `A.hl.clear()`.
- **Type shortcuts:** an artifact type registers its own with `A.shortcuts.add(key, label, handler)`. The hint line under the drawing lists them all.

### D9. View options (shared)

`shell.html` gets an empty `<div id="view-options">` in the page head, before the zoom group, hidden when empty. `A.viewOptions(spec)` builds the controls:

```
[{ id: 'detail', type: 'choice', label: 'Detail', value: 'all',
   options: [{ value: 'all', label: 'All members', key: '1' }, ...] },
 { id: 'deps', type: 'switch', label: 'Dependencies', value: true, key: 'd' }]
```

- **Roles:**
  - a choice is a segmented `role="radiogroup"`; a switch is a small copy of the Dark mode toggle;
  - selected segment or on track: `--accent` with `--band-ink`-free text in `--node`; unselected: `--grid`;
  - focus: the 2px `--mark` ring;
  - these reuse the toggle's contrast pairs already listed in `design.md`.
- **State and redraw:**
  - values live in `A.view`, which the renderer reads;
  - a change calls `A.redraw()`, the core's existing `draw()` exposed;
  - the zoom scale is kept and the pinned highlight is cleared (the registry is reset by `draw()`).
- **No persistence:** values reset on reload (see Non-Goals).

### D10. Groups beyond five (shared rule)

- **Group index:** `A.groupClass(n)` maps the n-th group to `--group-((n-1) mod 5 + 1)`.
- **Validators:** the ERD validator's limit goes from 5 to 16, and the UML validator uses 16. The error for 17 suggests merging or splitting.
- **Labels:** zones always carry their label, so two zones of one color stay apart.
- **`design.md`:** the roles table line ("More than five groups: reuse is not allowed") becomes: up to sixteen groups; colors cycle in order of first appearance; every zone is labelled.
- **Tests:** the `six-groups` invalid ERD fixture becomes `seventeen-groups`, and a valid `six-groups` fixture is added.

*Alternative:* uncolored packages beyond the fifth. Rejected by the person: they chose cycling.

### D11. Token roles added or changed

| Token | Change | Consumers |
|---|---|---|
| `--key-stereotype` | **added**, a color with light and dark values in `default.css` and `alt.css`; its chip ground is the same color at `--chip-mix` into `--node` | UML class stereotype chips; the UML legend's stereotype sample. Available to every type as a chip role. |
| `--group-1` … `--group-5` | rule changed (cycling, up to 16), values unchanged | ERD zones and bands, UML package zones and class bands |

Other changes to the vocabulary and the role map:
- **Vocabulary table:** the key line becomes `--key-primary`, `--key-foreign`, `--key-unique`, `--key-stereotype`.
- **Contrast list:** it already covers "each key color on its chip ground", so the new role joins it with no new rule.
- **New class:** `.focus-ring` (D7) uses `--mark` and adds no token.
- **Role map, UML class column:** Group color = package (like the ERD's schema area, neutral dashed outside, accent with none); Zone = package; Chip = stereotype, in `--key-stereotype`; Highlight = class, its relationships and the classes at their other ends; Details table = relationships with roles and multiplicities in words; Data face = member types, parameters, defaults, multiplicities; Connector = the six UML kinds with notation ends and hops.

The values of `--key-stereotype` are new default values, so the builder proposes them and they are shown to the person in the build summary. The default theme's value is a hue distinct from the three key roles and from `--group-1` … `--group-5`. The alternate theme's value follows that theme's own palette. Both must pass the 4.5:1 pair in light and dark (`tests/validate-themes.sh` gains the check).

### D12. Skill behaviour

`SKILL.md` follows the ERD skill's steps: check `python3`; choose the output (`./uml/<name>.html` and `.uml.json`); read `references/model.md` once; write only the model; run the assembler; report; edit the model on follow-ups. Modelling rules by source:

- **Code:**
  - Every class, interface and enum becomes a classifier; a folder or namespace becomes a package.
  - Doc tags or decorators such as `@aggregateRoot` and `@valueObject` become stereotypes.
  - `extends` gives a generalization and `implements` a realization, with bindings for generic targets.
  - Fields typed by a model classifier, enumerations included, become associations with the multiplicity rule of the spec, and the field stays an attribute.
  - Private collections of parts the class creates or owns become compositions when the user says so, or when a DDD aggregate holds an entity or value object of its own package. A collection the class only refers to becomes an aggregation when the user says so.
  - A field paired with its inverse becomes one association with both ends navigable.
  - A classifier used only in signatures becomes a dependency.
- **Prose or a requirements document:** nouns that carry state become classes; attributes are taken without types unless the text gives them; relationships come from the verbs and quantities ("each order has one or more lines").
- **DDD model:** bounded contexts become packages; aggregate roots, entities and value objects take their stereotypes; an aggregate owns its parts by composition; references across aggregates are associations to the root.

The detail level is a view option, so the skill never trims members for an audience. The page lets the reader choose.

### D13. Testbed

The testbed is seeded from the exploration as `skill-eval` prescribes: tag `uml-class-diagram`, `runs: 3`, `Skill` back in `allowed_tools`, deliverable `class-diagram.html` in each case.

| Case | Prompt in outline | Graders |
|---|---|---|
| `uml-class-diagram-easy` | A small library domain in a few sentences: `Book`, `Copy`, `Member`, `Loan`, `Librarian`, with `Librarian` and `Member` specializing `Person`. Asks for the class diagram as a self-contained page with a light/dark switch. | `file_exists`; regex per classifier name (`Book`, `Copy`, `Member`, `Loan`, `Librarian`, `Person`); `tool_used: Skill` (with-only) |
| `uml-class-diagram-medium` | A DDD domain model in prose: three bounded contexts (`ordering`, `shipping`, `billing`), aggregates, entities and value objects, owned parts and references across aggregates, an enumeration. Asks for packages, stereotypes, composition and aggregation, multiplicities, the three detail levels and the switch. | `file_exists`; one regex per classifier (about 12); `tool_used: Skill` |
| `uml-class-diagram-complex` | The exploration prompt (TypeScript ticketing domain, four packages, 26 classifiers), revised by the fair-case rules: every relationship kind, stereotypes, generics, multiplicities, detail levels, click highlight, legend, switch. | `file_exists`; one regex per classifier (26); `tool_used: Skill` |

There is no model-judged grader. The baseline (`evals/run.sh uml-class-diagram --baseline`) runs before the skill exists.

## Risks / Trade-offs

- **Regression on ERD.** The shared changes (hops, pinning, pan, wheel, shortcuts, cycling groups) could change ERD behaviour.
  → ERD fixtures and tests run unchanged plus the new group fixtures, and the visual reviewer renders ERD and UML side by side in both themes and modes.
- **Readability of ELK compound layout.** At 26 classifiers and 45 relationships the routing may be dense.
  → The dependencies switch removes 17 connectors at once, and hops make the remaining crossings readable. The reviewer compares the result with run 1.
- **Drag to pan against tap to pin on touch.** A tap with a little movement could pan instead of pin.
  → The 4px threshold, and touch scrolling stays native (pan by drag only for mouse and pen).
- **Wheel zoom against page scroll.** Ctrl+wheel is also the browser's page zoom.
  → `preventDefault` only over the drawing, and only with the modifier; elsewhere the browser keeps it.
- **Recycled group colors.** Two adjacent zones may share a color.
  → Every zone is labelled, and the person accepted cycling. The layout does not try to separate same-colored zones.
- **Project themes break.** A project theme written for 0.2.0 lacks `--key-stereotype` and is rejected.
  → The error names the token, and the README's theme section documents the addition. A minor version bump signals it.
- **Header-band primitive extended.** Compartment rules and band chips are new options.
  → They default off, so ERD tables are drawn exactly as before.

## Migration Plan

The version goes 0.2.0 → 0.3.0 in both manifests. Project themes add `--key-stereotype` (light and dark), and the README says so. There are no data migrations: ERD models stay valid, and those with six to sixteen groups become valid. Rollback is reverting the merge commit.
