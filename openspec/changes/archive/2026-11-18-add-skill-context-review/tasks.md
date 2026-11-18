# Tasks

## 1. Orchestrator

- [x] 1.1 Add **Phase 3a: skill review** to `.claude/skills/artifacts-orchestrator/SKILL.md`, between Phase 3 and Phase 3b. It applies to the skills whose `SKILL.md` the change adds or changes (plugin or harness, never `openspec-*`). It runs after a visual `pass`, or straight after the build when nothing is visual. It is one `Agent` call, `subagent_type: general-purpose`, `model: opus`, in the foreground, given paths only (skill folder, change folder, spec deltas, report path), with a prompt template: load `skill-creator`, review the context management (trigger-time vs on-demand loading, `SKILL.md` length, a reading moment per reference, scripts over prose, no repetition, the description), apply edits to `SKILL.md` and `references/*.md` only, never change behavior a spec sets, run no evals, tests, `claude -p` or description-optimization scripts, write `_agents_workspace/<id>/03a_skill_review.md`. Afterwards it runs `bash tests/run-structural-tests.sh` and `openspec validate <id> --strict`. Verify: `SKILL.md` places Phase 3a between Phase 3 and Phase 3b, and `SKILL.md` together with `references/skill-review.md` names every point above.
- [x] 1.2 In the same file: a row for the skill reviewer in the Agents table, a row in "Who owns what", rows in Error handling (skill-creator unavailable → reported as skipped; a conflict with a spec → `openspec-update-change`; structural tests fail after the edits → one retry, then the person), a "Skill review" test scenario, and Phase 3b and Phase 4 pointing to the review (Phase 4's summary quotes the report). Verify: `grep -n "3a\|skill review\|skill-creator" .claude/skills/artifacts-orchestrator/SKILL.md` finds each place.

## 2. Rules and project instructions

- [x] 2.1 Change `rules.tasks` in `openspec/config.yaml`: a change that adds or changes a `SKILL.md` has a skill review task (skill-creator, context-management focus, no tests or evals), placed after the visual-reviewer task (or after the build when nothing is visual) and before the evaluation task. Verify: `openspec validate --all --strict` passes and the rule states the order visual review, skill review, evaluate, documentation, archive.
- [x] 2.2 Update `CLAUDE.md`: in the Harness section, one line on the skill review (Phase 3a, skill-creator, no tests or evals). In Working documents, `03a_skill_review.md` among the scratch files if they are listed. In the Change history, a row dated 2026-11-18. Verify: the line and the row are present, and the file names no personal path.

## 3. Skill review of this change

- [x] 3.1 Run Phase 3a on `.claude/skills/artifacts-orchestrator/SKILL.md` as the new text describes it, and keep `_agents_workspace/add-skill-context-review/03a_skill_review.md`. Verify: the report exists and lists the edits with their reasons, and `bash tests/run-structural-tests.sh` and `openspec validate add-skill-context-review --strict` pass.

## 4. Evaluation only for a new skill, a major refactoring or on request

- [x] 4.1 Make the evaluation apply only to a new artifact skill, a major refactoring declared in the proposal, or the person's explicit request: Phase 3b's and Phase 4's entries in `.claude/skills/artifacts-orchestrator/SKILL.md`, `references/evaluate.md`, `references/integrate.md` and the Evaluation scenario of `references/test-scenarios.md`; the Effectiveness, design and tasks rules of `openspec/config.yaml` (Effectiveness section, testbed design, baseline task and evaluation task only for a change that needs an evaluation; the proposal of a change to an existing skill says whether it is a major refactoring); `.claude/skills/skill-eval/SKILL.md` (when an evaluation runs); `CLAUDE.md` (the evaluation line and a Change history row). Verify: `grep -rn "adds or changes an artifact skill" openspec/config.yaml .claude/skills/artifacts-orchestrator .claude/skills/skill-eval` finds nothing that still asks for an evaluation of a changed skill, and `openspec validate --all --strict` and `bash tests/run-structural-tests.sh` pass.

## Workflow follow-up

- No visual-reviewer pass and no skill evaluation: the change touches no artifact skill and no shipped file.
- Archive the change with `openspec-archive-change` as the last commit of this change, then comment on issue MrBogomips/eng-artifacts#10 and close it once merged.
- Next: change `align-erd-views` (issue MrBogomips/eng-artifacts#11), the first artifact-skill change to go through Phase 3a.
