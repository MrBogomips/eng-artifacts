# Phase 3a: skill review (one subagent, `skill-creator`)

Read when Phase 3a starts. The entry and exit conditions are in `SKILL.md`.

Applies to every skill whose `SKILL.md` the change adds or changes: plugin skills (`skills/*`) and harness skills (`.claude/skills/*`), never the generated `openspec-*` skills. It runs after the visual review's `pass` (or the accepted `incomplete`), or straight after the build when the change has nothing to render, and always before Phase 3b, so the evaluation measures the reviewed text. The requirements are the `skill-review` capability in `openspec/specs/`.

1. Dispatch one `Agent` call per change, `subagent_type: general-purpose`, `model: opus`, in the foreground. Give it paths only, never the builder's hand-off or your own conclusions. The prompt:

   > Load the `skill-creator` skill and use only its guidance for reviewing and improving an existing skill. Review these skills: `<skill folders>`. They belong to the OpenSpec change `openspec/changes/<change-id>/` (read its proposal and spec deltas) and to the current specs in `openspec/specs/`. Focus on how each skill describes its context management: what loads when the skill triggers and what only on demand; the length of `SKILL.md`; a stated moment to read each reference; deterministic work left to the skill's scripts rather than spelled out in prose; no content repeated between `SKILL.md` and its references; the frontmatter description as a trigger. Apply your improvements directly, only to each skill's `SKILL.md` and `references/*.md`. Never change behavior a spec sets: leave such text as it is and report the conflict. Run no evals, no tests, no `claude -p` sessions and no description-optimization scripts. Write `_agents_workspace/<change-id>/03a_skill_review.md`: one section per skill, listing each edit with its reason, the points left alone with why, and any conflict with a spec.

2. Run `bash tests/run-structural-tests.sh` and `openspec validate <change-id> --strict`. On a failure, send it to the same subagent for one fix; if it still fails, revert its edits to the failing file and take the failure to the user.
3. A conflict with a spec in the report goes to the spec process (`openspec-update-change`); the text stays as it was meanwhile.
4. If the session has no `skill-creator` skill, skip the step and write `skill review: skipped (skill-creator unavailable)` in the Phase 4 summary. Never omit it silently.
