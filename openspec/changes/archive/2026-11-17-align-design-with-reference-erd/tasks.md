# Tasks

## 1. Testbed and baseline

- [x] 1.1 Check that the `evals/erd/` testbed stays fair for the changed skill: the prompts already state UNIQUE and nullable columns, the graders are mechanical and need no change, and the without-plugin arm of run `2026-11-17T16-19-26Z` is the recorded baseline (the arm does not depend on the skill). Verify by reading the three `prompt.md` files and `evals/erd/runs/2026-11-17T16-19-26Z.json`, and note the result in this task.
  Result (2026-11-17): the three prompts state what the new fields need (`complex`: `email text NOT NULL UNIQUE`, `invoice.order_id ... UNIQUE`, nullable `postal_code`, `shipping_address_id`, `paid_at`, `lead_days`; `medium`: an optional completion date and comment, an enrollment unique per student and course; `easy`: no unique or nullable column, which is fine). The graders are mechanical (file exists, entity names present, Skill tool used) and say nothing about look. Run `2026-11-17T16-19-26Z` has `baselineOnly: false`, 5 runs per arm, plugin 0.1.0, model claude-opus-5-5, effort medium; its without-plugin arm does not depend on the skill and stays the baseline. No change needed.

## 2. Design and themes

- [x] 2.1 Update `.claude/skills/visual-contract/references/design.md` per design §2, §4, §5, §6, §10: new tokens in the vocabulary, the zone, chip, highlight and ungrouped-outline formulas, the dashed pattern 7 5 and round notation caps, the 34/24 left-aligned header proportions, the type table, the toggle replacing the three-button switch in the target-medium rules, the role map rows, and the new contrast pairs (key chip text on its ground, zone label on its zone, ink on a highlighted row, the toggle's on track on `--surface`). Update the summary in `.claude/skills/visual-contract/SKILL.md`. Verify that no value appears in either file (`grep -E '#[0-9a-fA-F]{3,8}\b'` finds none outside examples).
- [x] 2.2 Rewrite `shared/themes/default.css` per design §3: the reference-aligned values in light and in both identical dark blocks, the system font stacks, no `@import`, and the new tokens. Verify `bash tests/validate-themes.sh` passes and the vocabulary test agrees with `design.md`.
- [x] 2.3 Rewrite `shared/themes/alt.css` as the former default plus values for every new token, keeping its Google Fonts `@import`. Verify `bash tests/validate-themes.sh` passes and that the "differs in every group" check covers the keys group.
- [x] 2.4 Extend `tests/validate-themes.sh`: a theme may have no `@import`; an `@import` from a host other than `fonts.googleapis.com` fails, naming the theme; the new tokens are required in every theme. Make `shared/scripts/artifact_page.py` accept a theme without `@import`. Verify with a fixture theme that imports from another host (rejected) and a system-font project theme (accepted, page built).

## 3. Page shell and shared primitives

- [x] 3.1 Replace the System / Light / Dark switch in `shared/page/shell.html`, `page.css` and `core.js` with the "Dark mode" toggle per design §6: it starts from the system preference with no stored choice, remembers the choice when storage allows, treats a stored `system` as no choice, and has tokenized track, thumb and focus ring. Update `tests/test-assembler.sh` for the new markup. Verify in a browser, in both themes and both modes, the on, off, on-focused and off-focused states, with screenshots under `_agents_workspace/align-design-with-reference-erd/`.
- [x] 3.2 Change `A.headerMetrics` and `A.headerNode` to 34/24 with a left-aligned title (title inset 12, chip inset 8, content inset 10, 4 under the last row), the pale-band formulas and the ungrouped dashed outline. Verify by assembling the existing ERD fixtures and measuring a band and a row in the browser.
- [x] 3.3 Make `A.loadFonts` resolve at once when the theme loads no web font, with a single layout pass. Verify on a page built with the default theme that the renderer draws once (no second pass logged in a test hook).
- [x] 3.4 Add the chip and zone primitives (`A.chip`, `A.zone`) and their classes in `page.css` per design §5, taking colors from `--k` and `--c`. Verify with the static scan (`bash tests/validate-style-source.sh`) and on a fixture render.
- [x] 3.5 Add the highlight registry per design §7 (nodes, connectors, row ends, details-table rows, hover and tap, the hint line), with `.hl`, `.hovering` and `--dim`. Verify in a browser: hovering a connector highlights it, both nodes and the table row; leaving clears everything.
- [x] 3.6 Add the page head (sticky bar, counts line supplied by the renderer, controls on the right, wrapping at phone width), the legend card and details table card primitives (side by side above 900px, stacked below, the table scrolling in its card), and zoom controls (0.3 to 3, starting at 1:1, Fit and 1:1 buttons, scale shown). Verify at 1200px and 400px: the page body never scrolls sideways, the drawing starts at 100%, and Fit then 1:1 round-trip.

## 4. ERD model and skill

- [x] 4.1 Accept optional boolean `uk` and `nullable` in `skills/erd/scripts/erd_model.py`, rejecting other types with entity, column and field named. Add fixtures to `tests/test-erd-model.sh`: a valid model with both, a model with `nullable: "yes"` (rejected), and a 0.1.0 model without them (valid). Verify the test passes.
- [x] 4.2 Document `uk` and `nullable` in `skills/erd/references/model.md` in one line each, and the DDL mapping (`UNIQUE` → `uk`; no `NOT NULL` and not in the primary key → `nullable`) in `skills/erd/SKILL.md`. Verify the example in `model.md` validates with `erd_model.py`.

## 5. ERD renderer

- [x] 5.1 Draw rows per design §4: key chips in the order PK, FK, UK with `--key-*`, the name in the body face (bold for a primary key), the nullable marker before the type, the type in the data face. Verify on the complex fixture that `order_line.order_id` shows PK and FK chips and `invoice.order_id` shows FK and UK.
- [x] 5.2 Lay out groups as ELK compound nodes per design §8 (absolute coordinates, zone from the group box, label room, loop strip and labels kept), with column-anchored ends through fixed ports when `columns` is given. Verify on the complex fixture: every group's tables lie inside its zone, zones don't overlap, no table overlap, no connector crosses a table, and ends sit on the joining rows.
- [x] 5.3 Cluster the grid fallback by group, with zones as block bounding boxes and widened gutters. Verify with the layout library blocked: the same containment and no-overlap checks pass and the notice is shown.
- [x] 5.4 Wire the ERD into the shared primitives: register tables, connectors and joining rows with the highlight registry; fill the relationships table (child and parent with columns when known, kind, cardinality in words at each end); build the legend card from what the model uses (kinds, the four marks, chips used, the nullable marker when used, group zone samples); supply the counts line. Verify on the complex fixture against the scenarios of the `erd-artifact` delta (row per relationship, hover links, legend matches the model).
- [x] 5.5 Update `skills/erd/README.md` capabilities (zones, key chips, nullable, relationships table, highlighting, zoom, toggle) and the theme section (system-font default, project themes need the new tokens). Verify the README links resolve and its front block keeps `summary:`.

## 6. Package and repository

- [x] 6.1 Bump the version to 0.2.0 in `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`. Verify `bash tests/validate-manifests.sh` passes.
- [x] 6.2 Update `CLAUDE.md`: a change-history row for the design change (the user's decision: reference-aligned design, toggle, 34/24 header), and the State section if the structure changed. Verify no statement in it still describes the three-button switch or the 28px band.

## 7. Integration, review and evaluation

- [x] 7.1 Run `bash tests/run-structural-tests.sh` and `openspec validate --all --strict`. Verify both pass.
- [x] 7.2 Visual-reviewer pass: the ERD (complex fixture and a no-groups fixture) in the default and alternate themes, light and dark, at desktop and 400px width, against VC-1 to VC-6. Ask explicitly for the toggle's on, off and focused states in every theme and mode, and a side-by-side with `_agents_workspace/design-review/renders/reference-*.png`. Verify the report's verdict is `pass`.
- [x] 7.3 Evaluate the final ERD skill with `bash evals/run.sh erd` (three runs per case and arm, model `claude-opus-5-5`, effort `medium`). Give the user the report, the deliverable paths of both arms and a comparison with the reference page, and record the user's decision in `evals/erd/RESULTS.md`. Verify the entry is sanitized and the decision is `adopt` before going on.
- [x] 7.4 Documentation step after the adopt: check that `skills/erd/README.md` has its `summary:` front block and the performance markers, run `python3 evals/kpi.py doc`, then `bash tests/run-structural-tests.sh`. Verify the Performance section and the root README skills table show the new evaluation and the tests pass.

## Workflow follow-up

- Commit on `feature/align-design-with-reference-erd` after the user's go-ahead.
- Comment on issue #1 with the summary and the change id; close it once merged.
- Archive the change with the `openspec-archive-change` skill as the last commit before merge, only after an `adopt` on the final evaluation is recorded and the READMEs show it.
