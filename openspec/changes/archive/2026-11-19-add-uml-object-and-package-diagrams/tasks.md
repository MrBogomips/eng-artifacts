# Tasks

## 1. Baseline of the class diagram

- [x] 1.1 Before touching any code, produce the class diagram page of every model in `tests/fixtures/uml-class-diagram/valid/` and the ERD page of every valid ERD fixture with the `default` and `alt` themes into `_agents_workspace/add-uml-object-and-package-diagrams/baseline/`, and record through a headless browser the serialized SVG of each drawing in light and dark (D2); verify one SVG file per page and mode exists.

## 2. Shared UML module and assembler

- [x] 2.1 Add the `shared` list to the assembler per D1 and the `artifact-page` delta: optional `"shared"` in `assets/<type>.json`, inlined in order after the external scripts and before the type's helper files; reject a missing file, a path leaving `shared/` or a non-`.js` file, naming the type and the file, writing nothing. Add fixtures and cases to `tests/test-assembler.sh` (missing file, `../` path, non-script) and a structural check that every `assets/<type>.json` shared entry exists inside `shared/`; verify the tests pass and fail on each injected fault.
- [x] 2.2 Move the type-independent layout of `uml-class-diagram-layout.js` into `shared/uml/uml-layout.js` and the notation (ends, edge labels, header-band classifier node with compartments and the underlined-title option, member rows, legend samples) into `shared/uml/uml-notation.js`, with recursive compound nodes per D3; leave in the class diagram's folder only what is class-specific; list both shared files in `assets/uml-class-diagram.json`. Verify `bash tests/run-structural-tests.sh` passes and `tests/validate-style-source.sh` covers `shared/uml/` (no literal color, font or size).
- [x] 2.3 Repeat 1.1 after the move and diff the SVG of every class diagram and ERD page and mode against the baseline; verify every diff is empty, and record the command and its result in the hand-off.

## 3. Object diagram skill (`uml-object-diagram`, issue #16)

- [x] 3.1 Write `skills/uml-object-diagram/references/model.md` and `scripts/uml_object_diagram_model.py` (`validate(model) -> list[str]`) per the `uml-object-diagram-artifact` delta; add fixtures under `tests/fixtures/uml-object-diagram/` (valid: small, anonymous and literal, packages with an object outside, self-link, no packages; invalid: duplicate id, unknown object in a link, literal with slots, duplicate slot, link multiplicity, seventeen packages, position field) and `tests/test-uml-object-diagram-model.sh` asserting each message; verify it passes within `bash tests/run-structural-tests.sh`.
- [x] 3.2 Write `assets/uml-object-diagram.json` (elkjs 0.11.1, same URL and integrity as the class diagram; the shared list) and `assets/uml-object-diagram.js` per D4: instance nodes, slot rows, links with `none` and open ends, loops, hops, zones, highlight, the links table, the legend (only what is drawn), the counts line, the detail levels (keys 1/2), the error message on failure; extend `tests/test-assembler.sh` to build every valid object fixture under the three themes; verify the tests pass.
- [x] 3.3 Write `skills/uml-object-diagram/SKILL.md` (description triggering on object diagram, instance diagram, a snapshot of objects, example data or fixtures to draw; `python3` check; writes only `<name>.object.uml.json`; modelling rules by source; runs the assembler; edits the model on follow-ups) and drop "object model diagram" from the `uml-class-diagram` description; verify `claude plugin validate . --strict` accepts both frontmatters.
- [x] 3.4 Write the sample model `evals/uml-object-diagram/sample/library.object.uml.json` from the proposal's sample case (neutral names, every notation feature of the Derivation section: named, anonymous and literal instances, typed and untyped slots, stereotypes, three packages and one object outside, a self-link, navigable and plain links with roles and a link name); verify the skill's validator accepts it.

## 4. Package diagram skill (`uml-package-diagram`, issue #17)

- [x] 4.1 Write `skills/uml-package-diagram/references/model.md` and `scripts/uml_package_diagram_model.py` per the `uml-package-diagram-artifact` delta; add fixtures under `tests/fixtures/uml-package-diagram/` (valid: flat, nested three levels, every dependency kind, stereotypes and members, seven packages; invalid: nesting cycle, unknown parent, seventeen packages, unknown dependency kind, dependency on a containing package, self-dependency, duplicate member, position field) and `tests/test-uml-package-diagram-model.sh` asserting each message; verify it passes within `bash tests/run-structural-tests.sh`.
- [x] 4.2 Write `assets/uml-package-diagram.json` and `assets/uml-package-diagram.js` per D5: folder-tab nodes, member rows, nested packages as compound nodes on the zone ground, keyword dependencies, hops, highlight, the dependencies table, the legend, the counts line, the detail levels (keys 1/2), a grid fallback that keeps nesting; extend `tests/test-assembler.sh` to build every valid package fixture under the three themes; verify the tests pass and, with elkjs blocked, the grid fallback keeps every nested package inside its parent and shows the notice.
- [x] 4.3 Write `skills/uml-package-diagram/SKILL.md` (description triggering on package diagram, module or namespace structure, dependencies between modules, layering; `python3` check; writes only `<name>.package.uml.json`; modelling rules by source; runs the assembler; edits the model on follow-ups); verify `claude plugin validate . --strict` accepts the frontmatter.
- [x] 4.4 Write the sample model `evals/uml-package-diagram/sample/shop.package.uml.json` from the proposal's sample case (neutral names; «model» root, «profile», three nesting levels, members with keywords, `import`, `access`, `merge` and plain dependencies, more than five packages); verify the skill's validator accepts it.

## 5. Visual contract, manifests and project documents

- [x] 5.1 Update `.claude/skills/visual-contract/references/design.md`: the folder-tab package node, the instance node's underlined title and the link under "Notation shapes are fixed" (UML bullet), and an object diagram and a package diagram column in the coherence map; verify no token name is added and the wording names roles only.
- [x] 5.2 Bump the version to 0.5.0 in `.claude-plugin/plugin.json` and `marketplace.json`; update `CLAUDE.md` (State: four artifact types and version 0.5.0; layout lines for the two skills and `shared/uml/`; page assembly order with the shared scripts; model naming; commands for the two types; a change-history row for the shared UML module and the new notation shapes); verify `bash tests/validate-manifests.sh` passes.

## 6. Reviews

- [x] 6.1 Visual-reviewer pass: object, package and class diagram pages beside an ERD page in the default and alternate themes, light and dark, at desktop and 400px, against VC-1 to VC-6, including the pinned highlight, hops, view options and the switch; the class diagram and ERD compared with the baseline of 1.1; verify the report's verdict is `pass`.
- [x] 6.2 Skill review (Phase 3a) of `skills/uml-object-diagram/SKILL.md`, `skills/uml-package-diagram/SKILL.md` and `skills/uml-class-diagram/SKILL.md` with `skill-creator`, focused on how each describes its context management, edits applied to the `SKILL.md` and `references/`, no tests and no evals; verify the report `03a_skill_review.md` exists and the structural tests and `openspec validate add-uml-object-and-package-diagrams --strict` pass afterwards.

## 7. Validation (Phase 3c) and documentation

- [x] 7.1 Validation of `uml-object-diagram`: produce the sample page with the `default` and `alt` themes into `_agents_workspace/add-uml-object-and-package-diagrams/sample/`, the person opens both and accepts or asks for a fix (two fix rounds at most); on accept append the validation entry with `Decision: adopt (validated, not measured; derived from uml-class-diagram)` to `evals/uml-object-diagram/RESULTS.md`; verify `bash tests/test-derived-samples.sh` passes.
- [x] 7.2 Validation of `uml-package-diagram`: the same as 7.1 for its sample, recorded in `evals/uml-package-diagram/RESULTS.md`; verify `bash tests/test-derived-samples.sh` passes.
- [x] 7.3 Write `skills/uml-object-diagram/README.md` and `skills/uml-package-diagram/README.md` (front block with `summary:`, what it produces, inputs, options, an example, requirements, the performance markers); after both validations run `python3 evals/kpi.py doc`; verify each Performance section and the root README skills table show the skill as not measured, derived from `uml-class-diagram`, the class diagram and ERD sections are unchanged, and `bash tests/run-structural-tests.sh` passes.

## 8. Validation fix round 1 (package tab text)

- [x] 8.1 Add the `.t-tab` text class to `shared/page/page.css` (body font, 12px, semibold, no fill of its own so the band ink applies), draw and measure the folder tab's name with it in `shared/uml/uml-notation.js` in place of `.t-band`, and record the tab text under the folder-tab shape and in the coherence map of `.claude/skills/visual-contract/references/design.md`; verify the class diagram and ERD SVGs are still identical to the baseline of 1.1 and `bash tests/run-structural-tests.sh` passes.
- [x] 8.2 Visual-reviewer pass on the package pages beside a class diagram page, default and alt, light and dark, desktop and 400px: the tab name smaller than a class band title, nothing else of the tab changed, no clipped tab text; verify the verdict is `pass` before 7.2.

## Workflow follow-up

- Commit on `feature/add-uml-object-and-package-diagrams` after the user's go-ahead.
- Comment on issues #16 and #17 with the summary and the change id; close them once merged and tick them on #14.
- Archive the change with the `openspec-archive-change` skill as the last commit before merge, only after both validations are recorded and the documentation shows them.
