# Tasks

## 1. Testbed

- [x] 1.1 Check that the `evals/erd/` testbed stays fair for the changed skill: the view options need nothing from the model, so the three prompts and the mechanical graders need no change, and the without-plugin arm of the last adopted run (`evals/erd/runs/2026-11-17T21-27-45Z.json`) is the baseline (that arm does not depend on the skill). Verify: read the three `prompt.md` files and the run summary, and note the result in this task.
  Result (2026-11-18): the three prompts (easy: four entities from a description; medium: about eight entities from prose with two groups; complex: a twelve-table DDL with three groups, owned and referenced relationships) ask for nothing the view options change, and the graders are mechanical (file exists, entity names present, Skill tool used). Run `2026-11-17T21-27-45Z` has `baselineOnly: false`, 3 runs per arm, plugin 0.2.0, model claude-opus-5-5, effort medium; its without-plugin arm does not depend on the skill and stays the baseline. No change needed.

## 2. Renderer

- [x] 2.1 In `skills/erd/assets/erd.js`, add `registerOptions(model)` calling `A.viewOptions` with a choice `detail` (`all` "All columns" `1`, `keys` "Key columns" `2`, `names` "Table names" `3`) and a switch `refs` ("Referenced", key `r`, on, `hidden` unless the model has both owned and referenced relationships). Read the view from `A.view` in the entry point as the class diagram does. Verify: the page head shows the control and the hint line lists `1 2 3` and `R` only for a model with both kinds.
- [x] 2.2 Make `prepare(model, view)` filter rows by level (`keys`: columns with `pk`, `fk` or `uk`; `names`: none) and relationships by kind (`refs` off: owned only) before measurement, loop bookkeeping and layout, with `rowIndex` over the rows drawn and ids `r<n>` over the relationships drawn. The joining-row highlight passes only the rows drawn. Verify: in a browser, `A.erd.last` at each level and switch state holds the expected rows and relationships for the `tests/fixtures/erd` complex model, and the level `names` draws bands with no gap.
- [x] 2.3 Add `buildCounts(p)` (groups when present, tables, relationships with the per-kind list), compute the legend's usage from the prepared drawing, and always call `A.details`. Verify: the counts line reads as in the spec's scenario for the complex fixture with `R` on and off, and the legend drops the dashed sample when referenced connectors are hidden.
- [x] 2.4 Touch `skills/erd/assets/erd-layout.js` only if a band with no rows or a relationship-free view needs it. Verify: the grid fallback (layout library blocked) also follows each level and the switch.

## 3. Package and documentation

- [x] 3.1 Bump the version to 0.4.0 in `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`, and update `CLAUDE.md` (State: 0.4.0; a Change history row). Verify: `bash tests/validate-manifests.sh` passes.
- [x] 3.2 Update the capabilities in `skills/erd/README.md` (the detail levels, the referenced switch, the counts line). Verify: `bash tests/run-structural-tests.sh` passes.

## 4. Reviews

- [x] 4.1 Visual-reviewer pass: the ERD and class diagram pages side by side in `default` and `alt`, light and dark, every ERD level with the switch on and off, the control and the hint line coherent between the two types (VC-1 to VC-6). Verify: the report's verdict is `pass`.
- [x] 4.2 Skill review (Phase 3a, skill-creator, context-management focus, no tests or evals) of `skills/erd/SKILL.md` and its references. Verify: `_agents_workspace/align-erd-views/03a_skill_review.md` exists, and `bash tests/run-structural-tests.sh` and `openspec validate align-erd-views --strict` pass.

## Workflow follow-up

- No performance evaluation: not a major refactoring (rule of change `add-skill-context-review`); an evaluation started before that rule was stopped and recorded nothing.
- Archive the change with `openspec-archive-change` as the last commit before merge, then comment on issue MrBogomips/eng-artifacts#11 and close it once merged.
