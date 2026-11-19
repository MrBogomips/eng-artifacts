# Phase 4: integrate (orchestrator)

Read when Phase 4 starts. The entry conditions and the go-ahead gate are in `SKILL.md`.

1. For an evaluated change that has an `adopt` recorded, or a derived skill whose validation entry (Phase 3c, `validate.md`) has its `adopt`, run the documentation step ("Documenting the result" in `.claude/skills/skill-eval/SKILL.md`; read it now unless Phase 3b read it in this session, which never happens for a validated skill): check that `skills/<skill>/README.md` has its `summary:` front block and the performance markers, run `python3 evals/kpi.py doc`, then `bash tests/run-structural-tests.sh`. The documentation is part of the work committed below.
2. Run `openspec validate <change-id> --strict` again and check that every checkbox in `tasks.md` is ticked. For an evaluated change, check that `evals/<skill>/RESULTS.md` holds an evaluation of the final version with the decision `adopt` and that the skill's README and the README skills table show it. For a derived skill, check that it holds a validation entry with the decision `adopt (validated, not measured; derived from <anchor>)`, that the sample under `evals/<skill>/sample/` validates (`tests/test-derived-samples.sh`, one of the structural tests of step 1), and that the skill's README and the README row read "not measured" with the anchor.
3. Give the user a summary: what was built, the reviewer's verdict per invariant, the skill review's edits (from `03a_skill_review.md`, or that it was skipped and why), the evaluation's classification and decision, or the validation of a derived skill (its sample, the date, the anchor), or that none ran, the change not needing one, anything not verified, the files changed.
4. On the user's go-ahead, and not before:
   - commit the work on the topic branch;
   - archive the change with the `openspec-archive-change` skill, as the last commit before merge, so that `openspec/specs/` on `main` matches the behavior on `main`;
   - if an issue is carried: `gh issue comment <number>` with the summary and the change id, and `gh issue close <number>` once the work is merged.
5. Keep `_agents_workspace/<change-id>/` for later inspection until the session closes with `done`, which deletes the scratch (`DoD.md`, On Done).
