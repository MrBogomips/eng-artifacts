# Proposal

## Why

The plugin draws one UML type, the class diagram (adopted on 2026-11-18). The object and the package diagrams are the two UML types closest to it: the same graph of boxes and orthogonal connectors, laid out by the same engine, with a few notation shapes of their own. Delivering them as derived skills (issues #16 and #17, wave W1 of #14) gives two more UML types at the cost of a build and a sample validation, and it takes the common UML notation out of the class diagram's renderer so that the next derived UML types reuse it instead of copying it.

## What Changes

- New artifact skill `uml-object-diagram` (issue #16): a model of instances (`name : Class`, anonymous `: Class`, enumeration literals), their slots and the links between them, drawn as a self-contained page. Model file `<name>.object.uml.json`.
- New artifact skill `uml-package-diagram` (issue #17): a model of packages (nested, stereotyped, with optional member elements) and the dependencies between them (`«import»`, `«access»`, `«merge»`, plain), drawn as a self-contained page. Model file `<name>.package.uml.json`.
- The UML notation and graph layout the three UML types share move out of `skills/uml-class-diagram/assets/` into a shipped `shared/uml/` folder: the relationship ends, the header-band classifier node with its compartments, the member text, the legend samples, the elkjs layout with compound nodes (now nested to any depth), self-loops, the grid fallback and the clearance of zone labels. The class diagram keeps its look exactly: only where its code lives changes.
- The assembler loads a type's shared scripts from an optional `shared` list in `assets/<type>.json`, inlined after the external scripts and before the type's own files.
- The `uml-class-diagram` description drops "object model diagram", so an object diagram request reaches the object diagram skill.
- The visual contract gains the new notation shapes (instance node, link, folder-tab package node, keyword dependency) and two columns in its coherence map; the person approves them with this proposal.
- Plugin version 0.4.0 to 0.5.0; `CLAUDE.md` updated (state, layout, commands, model naming, change history).

## Derivation

Both skills are **derived** (`skill-derivation`): no exploration, no performance evaluation, gated by the person's validation of one sample page each.

### `uml-object-diagram` (issue #16)

- **Anchor:** `uml-class-diagram`, adopted (`evals/uml-class-diagram/RESULTS.md`, 2026-11-18).
- **Reused:** the page shell and chrome, the header-band node and its compartment rule, the open arrowhead, the self-loop, the line hops, packages as zones in the group roles (up to sixteen, five colors cycling), the neutral dashed outline of an element outside every package, the stereotype chip, elkjs 0.11.1 with the grid fallback, the detail-level view option, the details table, the legend card and the counts line, the model conventions (data only, unknown fields rejected, positions rejected).
- **Added notation**, each mapped to a role of the visual contract's vocabulary:

  | Shape | Role | Status |
  |---|---|---|
  | Instance node: header-band node, band title `name : Class` underlined (`: Class` for an anonymous instance) | header-band node, `--band-ink` on the group band; the underline is the same treatment the class diagram gives a static member | reused roles, new drawing rule |
  | Slot row `name = value` (optionally `name : type = value`) | node body, `--ink` for the name, data face in `--ink-2` for type and value | reused |
  | Enumeration literal instance: `Literal : Enum` with the «enumeration» chip, no slots | header-band node, `--key-stereotype` chip | reused |
  | Link: solid orthogonal line, no end mark, open arrowhead at a navigable end, role names at the ends, optional name at the middle | line role, `.notation` open arrowhead, edge labels | reused shapes, new connector kind |

  No role is missing.
- **Sample case:** a library on one afternoon: a branch, its catalogue, three members (one anonymous), copies of two books, an active and an overdue loan, a reservation queue, enumeration literals for the loan states, objects spread over three packages and one outside every package, a self-link (a member who referred another), navigable and plain links with role names. Model `evals/uml-object-diagram/sample/library.object.uml.json`.
- **Left out:** links drawn from a class diagram model automatically (the object model is written on its own), slot values that are nested instances (a slot refers to another object through a link), multiplicities on link ends (a link joins exactly two instances), instance-of dependencies to a class box.

### `uml-package-diagram` (issue #17)

- **Anchor:** `uml-class-diagram`, adopted (`evals/uml-class-diagram/RESULTS.md`, 2026-11-18).
- **Reused:** the page shell and chrome, the group roles for packages (up to sixteen, five colors cycling), the stereotype chip, the dependency connector (dashed line, open arrowhead at the supplier) with its centre label, line hops, elkjs 0.11.1 compound nodes and the grid fallback, the detail-level view option, the details table, the legend card and the counts line, the model conventions.
- **Added notation**:

  | Shape | Role | Status |
  |---|---|---|
  | Folder-tab package node: a tab on the top-left as wide as the name, 34 high like a header band, holding the name and the stereotype chips, over a body | the tab is the header band (the package's group band tint, `--band-ink`), its name in the tab text role, one step smaller than a band title, the body is the node body or, for a package that holds packages, the zone ground of its group | reused roles, **new notation shape** to add to "Notation shapes are fixed" |
  | Nested package: a folder-tab node drawn inside its parent's body | as above, own group role | reused |
  | Member rows: the elements a package owns, one per row, with an «interface» or «enumeration» keyword in the data face | node body, data face in `--ink-2` | reused |
  | `«import»`, `«access»`, `«merge»` dependency: the dependency connector with its keyword as the centre label | line role, dashed, `.notation` open arrowhead, edge label | reused shape, keyword labels |

  No role is missing; the folder tab is the one new shape and is added to the visual contract with this approval.
- **Sample case:** a layered online-shop application: a «model» root holding `presentation`, `application`, `domain` (with nested `ordering`, `catalog`, `billing`) and `infrastructure` (with nested `persistence`, `messaging`), a «profile» package applied to the model, member elements in the domain packages, `«import»` between layers, an `«access»` and a `«merge»`, plain dependencies, more than five packages so the group colors cycle. Model `evals/uml-package-diagram/sample/shop.package.uml.json`.
- **Left out:** the model's triangle icon (a «model» chip stands for it), member elements drawn as class boxes inside a package (they are rows), element imports (`«import»` from a package to a single element), visibility marks on members, the containment (circle-plus) notation (nesting is drawn by containment only).

## Capabilities

### New Capabilities
- `uml-object-diagram-artifact`: the object diagram skill, its model, its validation and its page.
- `uml-package-diagram-artifact`: the package diagram skill, its model, its validation and its page.

### Modified Capabilities
- `artifact-page`: a type may name shared scripts under `shared/` that the assembler inlines before the type's own renderer.

The class diagram's behavior does not change (its spec stays as it is); its description change only moves object diagram requests to the new skill.

## Visual contract

- **VC-1 (one style source):** the new shapes take every value from the theme tokens through `page.css` classes and the shared primitives; `shared/uml/` holds no style value, as the class diagram's renderer did not.
- **VC-2 (semantic tokens):** the new types reference only role names of the vocabulary; no token is added or renamed.
- **VC-3 (same role, same look):** an instance node is the header-band node of the class and the ERD table: same band height, row height, insets, outline, tint and chips. A package's tab is that header band too (same height, insets, tint, text color and chips), with its name one step smaller than a band title: the person's decision at the validation of the sample (2026-11-19). A link and a package dependency use the class diagram's line and ends, and no connector runs through a zone label or a node's text. The coherence map gains an object diagram and a package diagram column.
- **VC-4 (themable):** no token is added or changed; `default.css` and `alt.css` stay as they are, and both pages render under any complete theme.
- **VC-5 (light and dark):** both pages render in light and dark under the default and the alternate theme; text sits on the same grounds as the class diagram's (band, body, zone, highlight), whose contrast pairs the design already checks, and the body of a package that holds packages is a zone ground.
- **VC-6 (the switch):** the pages use the shared Dark mode toggle unchanged.

The class diagram must look exactly as before the refactoring, and the ERD is untouched: the visual review compares both with renders made before the build.

## Impact

- Shipped: new `skills/uml-object-diagram/` and `skills/uml-package-diagram/` (SKILL.md, README.md, references/model.md, validator, renderer, pinned elkjs); new `shared/uml/`; `skills/uml-class-diagram/` (renderer split, description); `shared/scripts/artifact_page.py` (shared list); `shared/page/page.css` (the `.t-tab` text class of the folder tab); manifests to 0.5.0; `README.md` skills table (by `kpi.py doc`).
- Harness: `.claude/skills/visual-contract/references/design.md` (notation shapes with the tab text, coherence map), `CLAUDE.md`.
- Tests and evals: fixtures and assembler tests for both types, a test for the shared list, the two sample models and their validation entries in `evals/<skill>/RESULTS.md`.
- No new dependency: elkjs 0.11.1 is the one already pinned.
