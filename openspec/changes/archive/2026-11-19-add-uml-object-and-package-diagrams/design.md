# Design

## Context

The class diagram's code is split between `skills/uml-class-diagram/assets/uml-class-diagram-layout.js` (674 lines: geometry from `--arrowhead`, the elkjs layout with packages as one level of compound nodes, end-label reservation, self-loops, the grid fallback, the clearance of zone labels) and `uml-class-diagram.js` (473 lines: model preparation, member rows, node measurement and drawing, relationship ends, legend samples, details table, counts, view options). The assembler (`shared/scripts/artifact_page.py`) inlines only the type's own `assets/<type>-*.js` and `assets/<type>.js`, after the external scripts named in `assets/<type>.json`. Shared page code (`shared/page/core.js`) already owns the header-band node metrics, chips, zones, hops and the highlight registry. See proposal.md for why the two new types are derived.

## Goals / Non-Goals

**Goals:**
- One copy of the UML notation and graph layout, used by the three UML types now and by the derived UML types of later waves (use case, deployment, composite structure).
- The class diagram renders exactly as before: same SVG geometry for the same model and theme.
- The two new types are thin: a validator, a model reference, a renderer of a few hundred lines that prepares its drawing model and calls the shared code.

**Non-Goals:**
- No change to the class diagram's model, options, legend, table or behavior.
- No new token and no change to the themes; `shared/page/page.css` gains only the `.t-tab` text class (12px, semibold) of the folder tab, decided at the sample's validation.
- No component-style ports or lollipops (W2, the component anchor).

## Decisions

### D1. The shared UML code lives in `shared/uml/`, named per type in `assets/<type>.json`

`shared/uml/uml-layout.js` takes the type-independent part of the class layout (geometry, elkjs graph with compound nodes, loops, end-label reservation, route fitting, zone-label clearance, grid fallback); `shared/uml/uml-notation.js` takes the end shapes (triangle, diamonds, open arrowhead), the edge-label element, the header-band classifier node with compartments and an underlined title option, member-row text and the legend samples. Both register under `Artifact.uml`, as the class layout does now. `assets/<type>.json` gains `"shared": ["uml/uml-layout.js", "uml/uml-notation.js"]`; the assembler inlines them, in that order, after the external scripts and before the type's helper files.

- *Alternative: a derived type loads the class diagram's assets.* Rejected: it couples one skill folder to another's file names, and the assembler's contract is one type per folder.
- *Alternative: a copy per type.* Rejected: three copies of 600+ lines drift, and the visual contract's notation would no longer have one implementation.
- *Alternative: put the files in `shared/page/`.* Rejected: `shared/page/` is loaded by every page, the ERD included, and the ERD has no use for UML ends.

The assembler checks each named path: relative, inside `shared/` after resolving, an existing `.js` file; any failure stops the page and names the type and the file (spec `artifact-page`). The structural tests read every `assets/<type>.json` and check its shared list the same way.

### D2. The refactoring is checked against renders made before it

Before moving any code, the builder produces the class diagram pages of every valid fixture (`tests/fixtures/uml-class-diagram/valid/`) with both themes into `_agents_workspace/<change-id>/baseline/`, and records, through a headless browser, the serialized SVG of each drawing (light and dark). After the move it does the same and diffs: the SVG must be identical. The visual reviewer compares screenshots as well. A difference is a defect of the refactoring, never a new look.

### D3. Nested compound nodes in the shared layout

The class layout nests one level (package zones). The package diagram needs any depth: the shared layout builds the ELK tree recursively from a `parent` link on each container, and places children with the accumulated offsets. The class and object diagrams keep one level (a zone holds nodes, no zone holds a zone), so their ELK graphs are unchanged by construction. Edges between nodes of different containers use ELK's `hierarchyHandling: INCLUDE_CHILDREN`, which the class layout already sets for cross-package relationships.

### D4. Object diagram drawing model

An object becomes a node with chips (stereotypes, «enumeration» for a literal), a title `name : Class` drawn underlined by the shared node (the `.t-static` underline of `page.css` that a static member already uses), and one compartment of slot rows. A link becomes a relationship of the internal kind `link`, ends drawn by the shared end function (`none` or `open`), labels as in the class diagram. The view option is the detail level `all` / `names` (keys `1`, `2`). Zones come from packages exactly as in the class diagram.

### D5. Package diagram drawing model

A package is a container node. The shared node draws its tab: a band-height header as wide as the name and chips plus insets, at the top left, in the group band tint, the name in `.t-tab` (one step smaller than the `.t-band` title of a class band, `--band-ink`) and measured in that class; the body below spans the node's width. A package without children is a leaf node whose body holds member rows (or half a row when empty, as the class diagram does for an empty compartment). A package with children is an ELK compound node whose padding reserves the tab and the member rows at the top; its body is drawn with the zone ground of its group (`.zone` fill) and the node outline. Dependencies are relationships of kind `dependency` drawn by the shared code, with the keyword as the centre label.

- *Alternative: draw a containing package as a class-diagram zone with a label.* Rejected: a zone is "the nodes of one group", not a UML element; the package is the element, so it takes the UML folder shape and the zone ground only as its fill.

The folder tab is the one new notation shape; `design.md` of the visual contract records it under "Notation shapes are fixed" (UML bullet) and the coherence map gains two columns (object diagram, package diagram).

### D6. File names and versions

`<name>.object.uml.json` and `<name>.package.uml.json` let a reader tell the type from the file; the class diagram keeps `<name>.uml.json` so no existing model is renamed. The validators do not depend on the extension. The plugin goes to 0.5.0 in both manifests.

### Token roles

No token role is added or changed. Consumed by the new types: `--band-ink`, `--node`, `--ink`, `--ink-2`, `--line`, `--group-1`…`--group-5`, `--neutral`, `--accent`, `--key-stereotype`, `--mark`, `--zone-mix`, `--chip-mix`, `--highlight-mix`, `--radius`, `--stroke`, `--arrowhead`, `--zone-radius`, the fonts `--font-body` and the data face. The class diagram consumes the same roles as before.

## Risks / Trade-offs

- [The refactoring changes the class diagram's look by a pixel] → D2's SVG diff before and after, on every fixture and both themes; the change does not pass with a difference.
- [Recursive nesting gives poor ELK layouts for deep trees] → the sample has three levels; if the review finds overlaps that ELK options cannot fix, the package diagram goes back to the spec process (skill-derivation, "Back to the full path").
- [The tab of a long package name is wider than its body] → the body is at least as wide as the tab plus one inset; measured, not fixed.
- [A later UML type needs a notation the shared module lacks] → it adds it to `shared/uml/` in its own change, with the visual contract updated; the class diagram's diff check is repeated then.

## Migration Plan

No user-facing migration: existing class diagram models and commands are unchanged. Rollback is reverting the change.
