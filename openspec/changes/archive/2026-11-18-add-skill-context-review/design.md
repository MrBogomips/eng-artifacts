# Design

## Context

The orchestrator (`.claude/skills/artifacts-orchestrator/SKILL.md`) delivers a change in phases: build (Phase 2, `artifact-builder`), visual review (Phase 3, `visual-reviewer`), evaluation (Phase 3b, `evals/run.sh`, the person's decision), integration (Phase 4). The task list of every change follows the order set in `openspec/config.yaml` `rules.tasks`. `skill-creator` is a skill available in the author's sessions. Its guidance covers writing and improving skills (progressive disclosure, references, scripts, descriptions) and also an eval loop that starts agent sessions. Motivation: see proposal.md.

## Goals / Non-Goals

**Goals:**
- One fixed place for the review in the workflow, recorded in the orchestrator and in the task rules, so every later change gets it.
- A review that changes text only, cheap and fast, with a written trail.

**Non-Goals:**
- Measuring the effect of the review: that is the evaluation's job, which runs right after it for an artifact skill.
- Reviewing generated skills (`.agents/skills/openspec-*`) or the pages a skill produces.
- Making the plugin depend on `skill-creator`: it is a tool of the harness only.

## Decisions

**Phase 3a, after the visual review and before the evaluation.** The evaluation measures the tokens and time of the skill as written. A review placed after it would change the text that was measured and call for a second evaluation. Placed before the build, it would have nothing to review. After the visual review, the text and the renderer have settled. When the change has nothing visual (a harness skill), it runs straight after the build.
*Alternative rejected:* inside the builder's tasks, because the builder would review its own text, anchored on its own choices.

**A `general-purpose` subagent, model `opus`, that loads `skill-creator`.** It receives only paths: the skill folder, the change folder, the spec deltas, the report path. It does not receive the builder's hand-off. The orchestrator writes the prompt from a template held in `references/skill-review.md`, which it reads when Phase 3a starts (the skill review of this change moved each long phase out of `SKILL.md`). The prompt names the context-management focus and the prohibitions: no evals, no tests, no `claude -p`, no description-optimization scripts, edits only to `SKILL.md` and `references/*.md`.
*Alternative rejected:* a dedicated agent file under `.claude/agents/`. A new agent adds a definition to maintain for a step that is one prompt over an existing skill. The pinned model in the dispatch call gives the same stability.

**skill-creator used for its guidance, not its loop.** The eval loop and the description optimizer start agent sessions and cost what an evaluation costs. Evaluation already exists in the workflow, measured with the plugin's own method.
*Alternative rejected:* running skill-creator's eval loop. The person explicitly asked for a review without tests or evaluations.

**Report `03a_skill_review.md`** in `_agents_workspace/<change-id>/`, next to the builder's hand-off and the reviewer's report. One section per reviewed skill: the edits with their reasons, the points left alone, any conflict with a spec. It is gitignored like the other intermediate files. The summary of Phase 4 quotes it.

**Checks after the edits:** `bash tests/run-structural-tests.sh` (frontmatter, manifests, docs markers) and `openspec validate <id> --strict`. A failure goes back to the reviewer once, then to the person. These are structural checks and they start no session. They are not the tests the person excluded, which are the evals and the trial runs of the skill.

**The performance evaluation runs only for a new artifact skill, a major refactoring, or on request** (the person's decision). A new skill has to prove it pays for itself before adoption, and so does a skill whose model, renderer or instructions are rebuilt; whether a change is a major refactoring is stated in its proposal, which the person approves, so the person decides it up front. Otherwise a change to an adopted skill would re-run eighteen sessions to confirm a figure already known, while its correctness and look are already checked by the visual review and its text by the skill review. The skill's Performance section keeps the last adopted evaluation, dated, so it stays honest about which version was measured.
*Alternative rejected:* evaluating changes with a reduced testbed (one case, one run). It still costs sessions and a single run says little, given the variance between runs.

## Risks / Trade-offs

- [The review trims an instruction that a page or an evaluation depended on] → it may not touch behavior set by a spec. For an artifact skill, the evaluation runs right after it and would show a regression.
- [skill-creator changes or disappears] → the step is reported as skipped, never silently omitted. The focus list in the orchestrator's prompt keeps the review meaningful even with a different version of the guidance.
- [A change makes an adopted skill slower or costlier, unmeasured] → the skill review watches the text that drives the cost; a person can still run `evals/run.sh` by hand when in doubt.
- [An extra phase in every skill change] → one agent run with text edits only, no session runs. It is cheap compared with the evaluation that follows.

## Migration Plan

No migration. Changes already archived are not reviewed retroactively. The first change to go through the step is this one (the orchestrator's `SKILL.md`), then `align-erd-views` (issue #11).
