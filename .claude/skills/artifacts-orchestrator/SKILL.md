---
name: artifacts-orchestrator
description: "Entry point for all work in the eng-artifacts plugin repository: invoke before responding to any request here. Coordinates the spec process (OpenSpec), the artifact-builder and the visual-reviewer to deliver a change to the plugin with the visual contract intact. Use for: add or change an artifact skill (WBS, UML, any diagram), change the shared visual language, tokens, a theme, light or dark mode, the mode switch, the plugin manifest or the tests; audit the plugin's visual coherence; evaluate whether an artifact skill pays for itself; validate the sample page of a derived artifact skill. Also use for follow-ups: continue the change, re-run, run the review again, run the evaluation, validate the sample, record the decision, fix the review findings, update, modify, supplement, improve the previous result, archive the change."
---

# Artifacts orchestrator

Delivers one change to the artifacts plugin at a time: specified with OpenSpec, built by `artifact-builder`, checked by `visual-reviewer` against the visual contract, archived when it passes (and, for a new artifact skill, when its evaluation or, if it is derived, its validated sample is adopted).

This file loads on every prompt in the repository, so it holds only triage and the phase sequence; the steps of the longer phases are in `references/`, one file per phase. Triage first (Phase 0): a trivial request needs nothing more. Read each file when the step that names it is reached, not before. `CLAUDE.md` is already in context; the agents load `visual-contract` themselves (read it only to answer a design question); the `openspec-*` workflows apply `openspec/config.yaml`; a script's options are in its header. Read a spec in `openspec/specs/` only when a step leaves a question open.

## Execution mode: subagent

Pattern: Producer-Reviewer. The builder and the reviewer exchange written files, enough for a review loop and an audit trail, so no agent team is formed.

## Agents

| Agent | subagent_type | Role | Skill | Output |
|-------|---------------|------|-------|--------|
| `artifact-builder` | `artifact-builder` | implements the change's tasks | `visual-contract` | working tree + `02_builder_handoff.md` |
| `visual-reviewer` | `visual-reviewer` | independent check of the visual contract | `visual-contract` | `03_reviewer_report.md` + `renders/` |
| skill reviewer | `general-purpose`, `model: opus` | review of the touched skills' text, context-management focus (Phase 3a) | `skill-creator` | edits to `SKILL.md` and `references/` + `03a_skill_review.md` |

Intermediate files live under `_agents_workspace/<change-id>/` (gitignored). An audit with no change uses `_agents_workspace/audit-<YYYYMMDD>/`.

## Who owns what

| Concern | Owner | Where |
|---------|-------|-------|
| What to build: proposal, spec deltas, design, task list | OpenSpec | `openspec/changes/<id>/` |
| Current behavior of the plugin | OpenSpec | `openspec/specs/` |
| Progress of a change's tasks | OpenSpec | the checkboxes in `openspec/changes/<id>/tasks.md` |
| The work item and its state (open, closed) | GitHub Issues | the issue |
| What a new artifact skill should show: the brief, the three sketches, the person's choice (not for a derived skill) | the orchestrator (Phase 0b), `evals/sketch.sh` | the issue (brief, choice, hints), `_agents_workspace/explore-<slug>/cases/`, `evals/results/sketch-<run-id>/` |
| Whether a skill pays for itself: the method, the testbed, the KPI report | `skill-eval` skill, `evals/` | `.claude/skills/skill-eval/`, `evals/run.sh`, `evals/<skill>/` |
| The sample page of a derived skill and its validation | the builder (the sample model), the orchestrator (Phase 3c), the user (the decision) | `evals/<skill>/sample/`, the validation entry in `evals/<skill>/RESULTS.md` |
| The adoption decision of an artifact skill | the user | the `Decision:` line in `evals/<skill>/RESULTS.md` |
| How a skill's text manages its context: the skill review | the orchestrator (Phase 3a), `skill-creator` | the reviewed skill's `SKILL.md` and `references/`, `03a_skill_review.md` |
| Building, review, evaluation, validation, integration | this orchestrator | the phases below |

Each concern has one owner. Read OpenSpec artifacts and issues in place; never copy their content into `_agents_workspace/`, and keep no status file of your own.

## Workflow

### Phase 0: intake and triage (orchestrator)

Triage every prompt first:

- **Trivial, conversational, or outside the plugin** (a question, an explanation, a look at a file): answer directly and stop. No agents, no workspace.
- **A change that keeps the specified behavior** (formatting, a typo, a version bump, a fix that restores what a spec already says): make it directly, without an OpenSpec change. If it touches anything that affects appearance, still run Phase 3 on it.
- **A change to the plugin's observable behavior** (a new or changed artifact skill, the shared style source, tokens, a theme, the switch): continue below. A **new** artifact skill goes through Phase 0b (explore) first, which files its issue and ends in step 2; a change to an **existing** artifact skill skips it. A new artifact skill whose request or issue names an **anchor**, an artifact skill already adopted (its `RESULTS.md` has an `adopt` decision), is **derived**: it skips Phase 0b too, and steps 1 and 2 below carry it to the proposal with its Derivation section. Ask the person which skill is the anchor only when an adopted skill plausibly fits the request; otherwise the skill is not derived and takes Phase 0b.
- **An audit request** ("are the artifacts coherent?", "check dark mode"): write a brief naming the scope, run Phase 3 alone, report.

For a change to observable behavior:

1. **Work item → GitHub Issues.** If `git remote get-url origin` succeeds, run `gh issue list --state open --json number,title,state,labels`. If an issue matches the request, carry its number through the run. If the work is new, tell the user the title you are about to file, then `gh issue create`. If the repository has no remote yet, skip the tracker and say so in the final summary.
2. **Spec → OpenSpec.** Run `openspec list --json`. If no change under `openspec/changes/` covers the request, the spec process owns the next step: invoke the `openspec-propose` skill with a prompt built from what you hold: the goal, the artifact types affected, the constraints, the issue number, and the requirement that the proposal address invariants VC-1 to VC-6. For a new artifact skill, also what Phase 0b produced; for a derived skill, the anchor, the issue and the requirement of a Derivation section in place of the Exploration section (the proposal rules are in `openspec/config.yaml`). That workflow produces planning artifacts and stops. Present the proposal and **pause** until the user approves it. To revise it, use `openspec-update-change`.
3. **Context check.** With an approved change:
   - `_agents_workspace/<change-id>/` absent → first run; go to Phase 1.
   - present, and the request is partial ("fix the review findings", "run the review again") → re-run only the phase concerned, passing the existing files to the agent.
   - present, and the change's artifacts were revised since → move the folder to `_agents_workspace/archive/<change-id>-<YYYYMMDD_HHMMSS>/` and go to Phase 1.

### Phase 0b: explore (orchestrator, a new artifact skill that is not derived)

Entry: triage found a new artifact skill with no anchor. The person's brief, the issue, one complex case run three times by `evals/sketch.sh`, the person's choice of a run recorded on the issue. Exit: `openspec-propose` (Phase 0 step 2) with what the phase produced. Read `references/explore.md` when the phase starts.

### Phase 1: prepare (orchestrator)

1. If on `main`, create a topic branch `feature/<change-id>` or `fix/<change-id>`.
2. Run `openspec validate <change-id> --strict`; a change that does not validate goes back to the spec process.
3. Read `openspec/changes/<id>/proposal.md`, `design.md`, `tasks.md` and the deltas under `specs/` as the authoritative input.
4. Create `_agents_workspace/<change-id>/` and write `01_brief.md`: the change id, the issue number if any, the paths the agents must read (paths, not copies), the artifact types affected, and at least one artifact type the change does not touch, for the reviewer's comparison.

### Phase 2: build (`artifact-builder`)

Dispatch one `Agent` call, `subagent_type: artifact-builder`, in the foreground, with the path of the brief. It implements the tasks, ticks `tasks.md`, and writes `_agents_workspace/<change-id>/02_builder_handoff.md`.

If the hand-off reports a blocked task or a contradiction in the change, stop the loop: a missing decision goes to the user, a contradiction goes back to the spec process through `openspec-update-change`. So does a derived skill whose build found that it needs a new layout engine or a new notation vocabulary: it becomes an anchor and takes Phase 0b and the evaluation; no archive.

### Phase 3: review (`visual-reviewer`)

Dispatch one `Agent` call, `subagent_type: visual-reviewer`, in the foreground, with the paths of the brief and the hand-off. It writes `_agents_workspace/<change-id>/03_reviewer_report.md`. Read the report's overall verdict:

- **`pass`** → Phase 3a when the change adds or changes a `SKILL.md`, otherwise Phase 3b, 3c or Phase 4.
- **`fail`** → send the report to `artifact-builder` for a fix round (Phase 2 with the report as extra input), then review again. Two fix rounds at most. If the verdict is still `fail`, stop and give the user the open findings with their evidence; do not go on to Phase 4.
- **`incomplete`** → something could not be rendered. Tell the user which invariants are not verified and what tool is missing. Go on (Phase 3a, 3b, 3c or 4) only if the user accepts the gap, and record the gap in the summary.

Keep each round's report: rename the previous one `03_reviewer_report.round<N>.md` before the next review.

### Phase 3a: skill review (one subagent, `skill-creator`)

Entry: the change adds or changes a skill's `SKILL.md` (plugin or harness, never `openspec-*`), after the visual review's `pass` (or an accepted `incomplete`), or straight after the build when nothing is visual. One `general-purpose` subagent on `opus` reviews the skills' text with `skill-creator`; then the structural tests and the change's validation run. Exit: Phase 3b for a change that needs an evaluation, Phase 3c for a derived skill, otherwise Phase 4. Read `references/skill-review.md` when the phase starts: it holds the subagent's prompt.

### Phase 3b: evaluate (orchestrator)

Entry: a change that needs an evaluation (a new artifact skill that is not derived, a major refactoring of an existing one declared in its approved proposal, or the person's explicit request, a derived skill included); any other change skips it and goes to Phase 4 (a derived skill to Phase 3c). It runs after the visual review's `pass` (or an accepted `incomplete`) and after Phase 3a when that applies, on the skill as the review left it. `evals/run.sh` measures and the user records the decision in `evals/<skill>/RESULTS.md`. Read `references/evaluate.md` and `.claude/skills/skill-eval/SKILL.md` when the phase starts. Routing by the decision:

- `adopt`: go to Phase 4;
- `rework`: a builder fix round (Phase 2) with the report and the user's notes as input, within the same two-round cap as the review, then review again and evaluate again;
- `reject`: stop; no archive.

### Phase 3c: validate (orchestrator, a derived skill that is not evaluated)

Entry: the visual review's `pass` (or an accepted `incomplete`) and Phase 3a, on a derived skill for which the person did not ask an evaluation; it takes the place of Phase 3b. The sample model under `evals/<skill>/sample/` is rendered with the default and the alternate theme, the person opens both pages, and records the validation in `evals/<skill>/RESULTS.md`. Read `references/validate.md` when the phase starts. Routing by the person's answer:

- accept: the validation entry is appended to `RESULTS.md` (its format is in `references/validate.md`); go to Phase 4;
- fix: a builder fix round (Phase 2) with the person's notes as input, then review again (Phase 3, 3a) and validate again. Two fix rounds at most for the validation, counted apart from the review's;
- the cap is spent: stop and go back to the spec process through `openspec-update-change`; the skill becomes an anchor, as in Phase 2. No archive.

### Phase 4: integrate (orchestrator)

Entry: an `adopt` recorded for a change that was evaluated or, for a derived skill, validated, or the review passed (Phase 3, then 3a when it applies) for a change with no evaluation. The documentation step for an adopted or validated skill, validation, the summary to the user, then, on the user's go-ahead and not before, commit, archive as the last commit before merge, and the issue comment and close. Read `references/integrate.md` when the phase starts.

Never rewrite the prose of a proposal or an issue that a person wrote: the spec and the tracker own intent, this orchestrator owns execution.

## Error handling

| Situation | Strategy |
|-----------|----------|
| An agent fails or returns nothing | retry once with the same input; on a second failure, stop and report what is missing |
| A run is missing or not skill-free | run the exploration once more; if a run is still missing or not skill-free, tell the person which run and why; nothing is proposed until the three runs are valid or the person decides otherwise |
| The builder reports a blocked task | stop the loop; take the decision to the user |
| The change's artifacts contradict each other | back to the spec process (`openspec-update-change`), then restart from Phase 1 |
| The verdict is still `fail` after two fix rounds | stop; report the open findings; no archive |
| The evaluation is `incomplete` twice | tell the user which runs failed; no decision is recorded; no archive |
| The decision is `rework` and the two-round cap is spent | stop; give the user the open points; no archive |
| The decision is `reject` or still `pending` | no archive |
| A derived skill's sample page is not accepted after two fix rounds, or its build needs a new layout engine or notation vocabulary | stop; back to the spec process (`openspec-update-change`); the skill takes the full path as an anchor; no archive |
| A derived skill has no sample model, or the skill's validator rejects it | back to the builder; no validation is recorded until the sample validates |
| The reviewer cannot render | verdict `incomplete`; the user decides whether to accept the gap |
| The builder disputes a finding | keep both positions with their evidence in the summary; the user decides |
| `skill-creator` is not available for Phase 3a | skip the skill review; say so in the summary |
| The skill review conflicts with a spec | keep the text; the conflict goes to `openspec-update-change` |
| The structural tests or validation fail after the skill review | one fix by the same subagent; then revert its edits to the failing file and ask the user |
| `gh` fails or is not authenticated | continue without the tracker; say in the summary what was not written to the issue |

## Test scenarios

In `references/test-scenarios.md`: read it when checking or changing this workflow, not during a run.
