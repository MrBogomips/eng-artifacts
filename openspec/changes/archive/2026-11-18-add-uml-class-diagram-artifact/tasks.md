# Tasks

## 1. Testbed and baseline

- [x] 1.1 Seed `evals/uml-class-diagram/` from the exploration per design D13 and "Seeding the testbed from the exploration" in `skill-eval`: copy `_agents_workspace/explore-uml-class-diagram/cases/complex/` as `complex/`, write `easy/` and `medium/` from the brief by reducing it to a subset of its features, revise all three by the fair-case rules (names `uml-class-diagram-<case>`, `tags: [uml-class-diagram]`, `runs: 3`, `Skill` in `allowed_tools`, deliverable `class-diagram.html`, no mention of the plugin), and replace the sketch grader by `file_exists`, one `regex` per expected classifier and a with-only `tool_used: Skill`; verify `claude plugin eval . --tag uml-class-diagram --runs 1 --ablation none` loads the three cases without schema errors (stop it once loading is confirmed).
- [x] 1.2 Run `bash evals/run.sh uml-class-diagram --baseline` before the skill exists; verify every baseline run produced `class-diagram.html` (the cases are fair; revise and rerun any case no arm satisfies) and that the baseline entry is in `evals/uml-class-diagram/RESULTS.md`.

## 2. Design and themes

- [x] 2.1 Update `.claude/skills/visual-contract/references/design.md` per design D5, D6, D10 and D11: `--key-stereotype` in the vocabulary, the group rule (up to sixteen, cycling, every zone labelled), the UML line of "Notation shapes are fixed" (all six kinds, open arrowhead, hollow shapes filled with the node role, generic box, compartment rule), the line hop in the connector rules and geometry, the role map's UML column, and `.focus-ring`; verify the role map has no empty UML cell for a role UML uses and no token was added besides `--key-stereotype`.
- [x] 2.2 Add `--key-stereotype` to `shared/themes/default.css` and `alt.css` in the light block and both dark blocks, with values distinct in hue from the other key and group roles; extend `tests/validate-themes.sh` to require four key roles and to check each key color against its chip ground at 4.5:1 in light and dark; verify `bash tests/validate-themes.sh` passes and fails on a theme copy without `--key-stereotype`, naming it.

## 3. Shared page

- [x] 3.1 Make `A.groupClass` cycle through the five group roles and raise the ERD validator's group limit to sixteen (D10); move the invalid ERD fixture to seventeen groups and add a valid six-group fixture; verify `bash tests/test-erd-model.sh` and `bash tests/test-assembler.sh` pass, and the six-group ERD page draws the sixth zone in the first group role.
- [x] 3.2 Add `A.hops` and the `hops` option of `A.edgePath` in `core.js`, and call it from the ERD renderer after routing (D6); verify on an ERD fixture with a crossing, in a browser, that the later horizontal run arcs over the vertical one, the arc follows the dash and the highlight, and connectors that only share an end do not hop.
- [x] 3.3 Extend `A.hl` with the pinned highlight, keyboard reach and the `.focus-ring` class in `page.css` (D7); verify on the ERD page that a click pins a table and its relationship rows, hovering another table changes nothing, Esc, a second click and a click on empty space clear it, and Tab with Enter pins with the focus ring visible in both themes and modes.
- [x] 3.4 Add drag-to-pan, Ctrl/Cmd wheel and pinch zoom around the pointer, and the keyboard shortcuts with `A.shortcuts.add` and the hint line, in `chrome.js` (D8); verify on the ERD page that a plain wheel scrolls the page, Ctrl+wheel zooms keeping the point under the pointer, a drag pans without pinning, and `+ - f 0 t Esc` act while typing in a field does not.
- [x] 3.5 Add the view-options slot to `shell.html`, its roles to `page.css`, and `A.viewOptions`, `A.view` and `A.redraw` (D9); verify with a throwaway renderer registering a choice and a switch that a change redraws the drawing, legend, table and counts, keeps the zoom scale, clears a pin, and that selected and focused states are told apart in both themes and modes.
- [x] 3.6 Extend `A.headerNode` with `rules` and `bandChips` (D4), both off by default; verify ERD fixtures produce byte-identical drawings to before (compare the serialized SVG of one page before and after) and a band with two chips grows to fit title and chips.
- [x] 3.7 Make the assembler load `scripts/<type with - as _>_model.py` (D1); verify `bash tests/test-assembler.sh` still passes for `erd` and an unknown type still lists the known ones.

## 4. UML model and validation

- [x] 4.1 Write `skills/uml-class-diagram/references/model.md`: every field of D2, direction of `from` and `to` per kind, visibility values, multiplicity forms, bindings, packages up to sixteen with cycling colors, and one complete example; verify the example passes the validator of 4.2.
- [x] 4.2 Write `skills/uml-class-diagram/scripts/uml_class_diagram_model.py` with `validate(model) -> list[str]` per the `uml-class-diagram-artifact` requirements; add fixtures under `tests/fixtures/uml-class-diagram/` (valid: small, every kind, generics and bindings, self-association, no packages, seven packages, domain-level without types; invalid: duplicate classifier, unknown kind, unknown visibility, abstract operation in a concrete class, unknown classifier, realization of a class, generalization cycle, bad multiplicity `3..1`, seventeen packages, position field) and `tests/test-uml-class-diagram-model.sh` asserting each message; verify it passes within `bash tests/run-structural-tests.sh`.

## 5. UML renderer

- [x] 5.1 Write `assets/uml-class-diagram.json` (elkjs 0.11.1, same URL and integrity as ERD) and `assets/uml-class-diagram-layout.js` per D3 (ELK `layered` DOWN, packages as compound nodes, parents above, end labels, self-loop, grid fallback with notice); verify on the 26-classifier fixture that no two classes overlap, no connector crosses a class, every class is in its zone, and with elkjs blocked the grid fallback draws everything with the notice.
- [x] 5.2 Write `assets/uml-class-diagram.js`: class nodes per D4, notation ends per D5, hops, edge labels, highlight registration, the relationships table, the legend (only what the drawing uses), the counts line, the view options (detail level with keys 1/2/3, dependencies with key D) and the error message on failure; verify by assembling the 26-classifier fixture under `default`, `alt` and a project theme copy and opening it in light and dark, recording screenshots under `_agents_workspace/add-uml-class-diagram-artifact/`.
- [x] 5.3 Extend `tests/validate-style-source.sh` to ignore `*.uml.json` sample models and `tests/test-assembler.sh` to build every valid UML fixture under the three themes; verify both pass and the style-source test fails on an injected `#123456` in the UML renderer.

## 6. Skill

- [x] 6.1 Write `skills/uml-class-diagram/SKILL.md` per D12 (description triggering on UML class diagram, class diagram, domain model diagram and code to diagram; `python3` check; output rule; writes only `<name>.uml.json`; modelling rules by source; runs the assembler; edits the model on follow-ups); verify `claude --plugin-dir . -p` with the easy case's prose produces a valid model and a page, and `claude plugin validate . --strict` accepts the frontmatter (on the copy the structural tests use).
- [x] 6.2 Bump the version to 0.3.0 in `.claude-plugin/plugin.json` and `marketplace.json`, and document `--key-stereotype` for project themes in the root README's theme section; verify `bash tests/validate-manifests.sh` passes.

## 7. Integration

- [x] 7.1 Run `bash tests/run-structural-tests.sh`; verify it passes.
- [x] 7.2 Update `CLAUDE.md`: State (two artifact types, the new skill folder, version 0.3.0), change-history rows for the design extension (stereotype role, groups up to sixteen, UML notation, shared interactions); verify no statement says ERD is the only type.
- [x] 7.3 Visual-reviewer pass: UML and ERD side by side in the default and alternate themes, light and dark, at desktop and 400px, against VC-1 to VC-6, including the pinned highlight, hops, view options and the switch states; verify the report's verdict is `pass`.
- [x] 7.4 Evaluate the final skill with `bash evals/run.sh uml-class-diagram`; give the user the report and the deliverable paths of both arms; record the user's decision (`adopt`, `rework` or `reject`) and reason in `evals/uml-class-diagram/RESULTS.md`; verify the entry is sanitized and the decision is `adopt` before going on.

## 8. Documentation of capabilities and performance

- [x] 8.1 Write `skills/uml-class-diagram/README.md` (front block with `summary:`, what it produces, inputs, options including detail levels and themes, an example, requirements, the performance markers); verify the links resolve and nothing is written between the markers by hand.
- [x] 8.2 After the `adopt`, run `python3 evals/kpi.py doc`; verify the skill's Performance section and the root README skills table show the adopted evaluation, and `bash tests/run-structural-tests.sh` passes (its docs test included).

## Workflow follow-up

- Commit on `feature/add-uml-class-diagram-artifact` after the user's go-ahead.
- Comment on issue #5 with the summary and the change id; close it once merged.
- Archive the change with the `openspec-archive-change` skill as the last commit before merge, only after the `adopt` is recorded and the documentation shows it.
