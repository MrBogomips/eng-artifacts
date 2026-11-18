---
name: artifacts-orchestrator
description: "Entry point for all work in the eng-artifacts plugin repository: invoke before responding to any request here. Coordinates the spec process (OpenSpec), the artifact-builder and the visual-reviewer to deliver a change to the plugin with the visual contract intact. Use for: add or change an artifact skill (WBS, UML, any diagram), change the shared visual language, tokens, a theme, light or dark mode, the mode switch, the plugin manifest or the tests; audit the plugin's visual coherence; evaluate whether an artifact skill pays for itself. Also use for follow-ups: continue the change, re-run, run the review again, run the evaluation, record the decision, fix the review findings, update, modify, supplement, improve the previous result, archive the change."
---

# Artifacts orchestrator

Delivers one change to the artifacts plugin at a time: specified with OpenSpec, built by `artifact-builder`, checked by `visual-reviewer` against the visual contract, archived when it passes.

## Execution mode: subagent

Pattern: Producer-Reviewer. The builder and the reviewer exchange written files, which is enough for a review loop and leaves an audit trail, so no agent team is formed.

## Agents

| Agent | subagent_type | Role | Skill | Output |
|-------|---------------|------|-------|--------|
| `artifact-builder` | `artifact-builder` | implements the change's tasks | `visual-contract` | working tree + `02_builder_handoff.md` |
| `visual-reviewer` | `visual-reviewer` | independent check of the visual contract | `visual-contract` | `03_reviewer_report.md` + `renders/` |

Intermediate files live under `_agents_workspace/<change-id>/` (gitignored). An audit with no change uses `_agents_workspace/audit-<YYYYMMDD>/`.

## Who owns what

| Concern | Owner | Where |
|---------|-------|-------|
| What to build: proposal, spec deltas, design, task list | OpenSpec | `openspec/changes/<id>/` |
| Current behavior of the plugin | OpenSpec | `openspec/specs/` |
| Progress of a change's tasks | OpenSpec | the checkboxes in `openspec/changes/<id>/tasks.md` |
| The work item and its state (open, closed) | GitHub Issues | the issue |
| What a new artifact skill should show: the brief, the three unassisted sketches, the person's choice | the orchestrator (Phase 0b), `evals/sketch.sh` | the issue (brief, choice, hints), `_agents_workspace/explore-<slug>/cases/`, `evals/results/sketch-<run-id>/` |
| Whether a skill pays for itself: the method, the testbed, the KPI report | `skill-eval` skill, `evals/` | `.claude/skills/skill-eval/`, `evals/run.sh`, `evals/<skill>/` |
| The adoption decision of an artifact skill | the user | the `Decision:` line in `evals/<skill>/RESULTS.md` |
| Building, review, evaluation, integration | this orchestrator | the phases below |

Each concern has one owner. Read OpenSpec artifacts and issues in place; never copy their content into `_agents_workspace/`, and keep no status file of your own.

## Workflow

### Phase 0: intake and triage (orchestrator)

This skill is the repository's entry point, so it runs for every prompt. Triage first:

- **Trivial, conversational, or outside the plugin** (a question, an explanation, a look at a file): answer directly and stop. No agents, no workspace.
- **A change that keeps the specified behavior** (formatting, a typo, a version bump, a fix that restores what a spec already says): make it directly, without an OpenSpec change. If it touches anything that affects appearance, still run Phase 3 on it.
- **A change to the plugin's observable behavior** (a new or changed artifact skill, the shared style source, tokens, a theme, the switch): continue below. A **new** artifact skill goes through Phase 0b (explore) before its proposal; a change to an **existing** artifact skill skips it and goes straight to the spec.
- **An audit request** ("are the artifacts coherent?", "check dark mode"): write a brief naming the scope, run Phase 3 alone, report.

For a change to observable behavior:

1. **Work item → GitHub Issues.** If `git remote get-url origin` succeeds, run `gh issue list --state open --json number,title,state,labels`. If an issue matches the request, carry its number through the run. If the work is new, tell the user the title you are about to file, then `gh issue create`. If the repository has no remote yet, skip the tracker and say so in the final summary. For a new artifact skill, file the issue in Phase 0b, with the brief as its body.
2. **Spec → OpenSpec.** For a new artifact skill, run Phase 0b first. Run `openspec list --json`. If no change under `openspec/changes/` covers the request, the spec process owns the next step: invoke the `openspec-propose` skill with a contextual prompt built from what you already hold: the goal, the artifact types affected, the constraints, the issue number, and the requirement that the proposal address invariants VC-1 to VC-6. For a new artifact skill, also what Phase 0b produced. That workflow produces planning artifacts and stops. Present the proposal and **pause** until the user approves it. To revise it, use `openspec-update-change`.
3. **Context check.** With an approved change:
   - `_agents_workspace/<change-id>/` absent → first run; go to Phase 1.
   - present, and the request is partial ("fix the review findings", "run the review again") → re-run only the phase concerned, passing the existing files to the agent.
   - present, and the change's artifacts were revised since → move the folder to `_agents_workspace/archive/<change-id>-<YYYYMMDD_HHMMSS>/` and go to Phase 1.

### Phase 0b: explore (orchestrator, a new artifact skill only)

A new artifact skill is not specified from a description alone: the person first sees what an unassisted session produces for the request, at three levels of difficulty, and picks the reference. Skip this phase for a change to an existing skill. The requirements are the `skill-exploration` capability in `openspec/specs/`, or, while the change is in flight, its spec delta.

1. **Brief.** Ask the person for the brief of the skill: the artifact type, who it is for, the sources it starts from, optionally a concrete use case. Do nothing until it names at least the artifact type and the sources; ask for what is missing.
2. **Issue.** File the work item as in Phase 0 step 1, with the brief as the issue body.
3. **Cases.** Write `easy/`, `medium/` and `complex/` under `_agents_workspace/explore-<slug>/cases/`, each in the testbed layout (`prompt.md` with `name: sketch-<case>`, `runs: 1`, `max_turns`, `timeout_seconds` and `allowed_tools` without `Skill`; `graders/file.md`, a `file_exists` grader on the deliverable). Write the prompts by the fair-case rules of `skill-eval`: each names one self-contained HTML page and its file name, asks for features as a user would, and never mentions the plugin, a skill or the plugin's design. Easy asks for a few elements from a short description, medium for a larger artifact with groups and optional parts, complex for an artifact from a structured source with every feature the brief implies. Use the brief's use case where it has one.
4. **Sketch.** Run `evals/sketch.sh _agents_workspace/explore-<slug>/cases` (options in its header). It runs one session per case in an isolated sandbox against an empty stub plugin with the Skill and Agent tools disallowed, keeps the deliverables under `evals/results/sketch-<run-id>/` and prints the sketch report. There is no cost ceiling and nothing is published.
5. **Present.** Open the three deliverables in a browser. Give the person the report (cost included) and your own short inventory of the features of each sketch, functionality and richness first. Ask one question: which sketch is closest to the functionality and richness wanted, and any hints. Never recommend one: the choice is the person's.
6. **Record.** Comment on the issue with the chosen case, the feature inventory of each of the three sketches (so the record stands without the ignored files) and the hints. Paths are relative to the repository (`evals/results/sketch-<run-id>/...`), never absolute; no user name and no transcript. The sandbox gives each session the account's e-mail address, so check that a sketch does not echo it (or any other personal detail) before you quote from it; the sketches themselves are never committed or published.
7. **Hand on.** Invoke `openspec-propose` (Phase 0 step 2) with the brief, the chosen case's prompt and deliverable path, the hints and the issue number. The proposal carries an Exploration section (see `openspec/config.yaml`). The three prompts seed the skill's testbed (see `skill-eval`); the sketches never count as its baseline.

### Phase 1: prepare (orchestrator)

1. If on `main`, create a topic branch `feature/<change-id>` or `fix/<change-id>`.
2. Run `openspec validate <change-id> --strict`; a change that does not validate goes back to the spec process.
3. Read `openspec/changes/<id>/proposal.md`, `design.md`, `tasks.md` and the deltas under `specs/` as the authoritative input.
4. Create `_agents_workspace/<change-id>/` and write `01_brief.md`: the change id, the issue number if any, the paths the agents must read (paths, not copies), the artifact types affected, and at least one artifact type the change does not touch, for the reviewer's comparison.

### Phase 2: build (`artifact-builder`)

Dispatch one `Agent` call, `subagent_type: artifact-builder`, in the foreground, with the path of the brief. It implements the tasks, ticks `tasks.md`, and writes `_agents_workspace/<change-id>/02_builder_handoff.md`.

If the hand-off reports a blocked task or a contradiction in the change, stop the loop: a missing decision goes to the user, a contradiction goes back to the spec process through `openspec-update-change`.

### Phase 3: review (`visual-reviewer`)

Dispatch one `Agent` call, `subagent_type: visual-reviewer`, in the foreground, with the paths of the brief and the hand-off. It writes `_agents_workspace/<change-id>/03_reviewer_report.md`. Read the report's overall verdict:

- **`pass`** → Phase 4.
- **`fail`** → send the report to `artifact-builder` for a fix round (Phase 2 with the report as extra input), then review again. Two fix rounds at most. If the verdict is still `fail`, stop and give the user the open findings with their evidence; do not go on to Phase 4.
- **`incomplete`** → something could not be rendered. Tell the user which invariants are not verified and what tool is missing. Go to Phase 4 only if the user accepts the gap, and record the gap in the summary.

Keep each round's report: rename the previous one `03_reviewer_report.round<N>.md` before the next review.

### Phase 3b: evaluate (orchestrator)

Applies to a change that adds or changes an artifact skill; read `.claude/skills/skill-eval/SKILL.md` first. It runs after a `pass` from the visual review (or after the user accepts an `incomplete` one), with no cost confirmation: the user decided evaluations are not capped, and the cost is reported.

1. Run `bash evals/run.sh <skill>` (the proposal may set stricter targets, passed as `--target-tokens` and `--target-time`). It prints the report and appends an entry to `evals/<skill>/RESULTS.md` with `Decision: pending` and writes its sanitized summary `evals/<skill>/runs/<run-id>.json`. Never publish a report.
2. Give the user the report: the classification, the KPI table (tokens and time, both arms, the change), the cost, the flagged runs, and the paths of the kept deliverables of both arms to compare. Say what you saw in them.
3. Ask for the decision and record it, with the user's reason, on the `Decision:` line of that entry in `RESULTS.md`:
   - `adopt`: go to Phase 4;
   - `rework`: a builder fix round (Phase 2) with the report and the user's notes as input, within the same two-round cap as the review, then review again and evaluate again;
   - `reject`: stop; no archive.
4. An `incomplete` report is run once more; if it is still `incomplete`, tell the user which runs failed.

Nothing here is a new agent: the numbers come from the script and the judgement from the user. A decision is never inferred from the classification.

### Phase 4: integrate (orchestrator)

1. For a skill change that has an `adopt` recorded, run the documentation step (see `.claude/skills/skill-eval/SKILL.md`, "Documenting the result"): check that `skills/<skill>/README.md` has its `summary:` front block and the performance markers, run `python3 evals/kpi.py doc`, then `bash tests/run-structural-tests.sh` (its docs test fails when the Performance section or the root README skills table is missing or out of date). The documentation is part of the work committed below.
2. Run `openspec validate <change-id> --strict` again and check that every checkbox in `tasks.md` is ticked. For a skill change, check that `evals/<skill>/RESULTS.md` holds an evaluation of the final version with the decision `adopt` and that the skill's README and the README skills table show it.
3. Give the user a summary: what was built, the reviewer's verdict per invariant, the evaluation's classification and decision, anything not verified, the files changed.
4. On the user's go-ahead, and not before:
   - commit the work on the topic branch;
   - archive the change with the `openspec-archive-change` skill, as the last commit before merge, so that `openspec/specs/` on `main` matches the behavior on `main`;
   - if an issue is carried: `gh issue comment <number>` with the summary and the change id, and `gh issue close <number>` once the work is merged.
5. Keep `_agents_workspace/<change-id>/` for later inspection.

Never rewrite the prose of a proposal or an issue that a person wrote: the spec and the tracker own intent, this orchestrator owns execution.

## Error handling

| Situation | Strategy |
|-----------|----------|
| An agent fails or returns nothing | retry once with the same input; on a second failure, stop and report what is missing |
| A sketch is missing or not skill-free | run that case once more; if it is still missing or not skill-free, tell the person which case and why; nothing is proposed until the three sketches are valid or the person decides otherwise |
| The builder reports a blocked task | stop the loop; take the decision to the user |
| The change's artifacts contradict each other | back to the spec process (`openspec-update-change`), then restart from Phase 1 |
| The verdict is still `fail` after two fix rounds | stop; report the open findings; no archive |
| The evaluation is `incomplete` twice | tell the user which runs failed; no decision is recorded; no archive |
| The decision is `rework` and the two-round cap is spent | stop; give the user the open points; no archive |
| The decision is `reject` or still `pending` | no archive |
| The reviewer cannot render | verdict `incomplete`; the user decides whether to accept the gap |
| The builder disputes a finding | keep both positions with their evidence in the summary; the user decides |
| `gh` fails or is not authenticated | continue without the tracker; say in the summary what was not written to the issue |

## Test scenarios

- **Normal.** "Add a WBS skill." No change exists → an issue is filed, `openspec-propose` writes the change, the user approves → brief → the builder implements and ticks the tasks → the reviewer renders two artifact types in two themes and both modes, verdict `pass` → summary → on go-ahead: commit, archive, issue commented and closed.
- **Explore.** "Add a WBS skill." The brief is asked for and names the artifact type and its sources → the issue is filed with the brief → three cases are written and `evals/sketch.sh` returns three skill-free deliverables → the person opens them, chooses the medium sketch with a hint, nothing is recommended → the issue is commented → `openspec-propose` writes a proposal with an Exploration section. "Add a field to the ERD skill" skips this phase.
- **Fix loop.** The reviewer reports `VC-1 fail` for a literal color in a template → the builder moves the value to a token role in the shared source → the second review re-checks every invariant and passes.
- **Evaluation.** The reviewer says `pass` on a new skill → Phase 3b runs the testbed, the report says `below target` with time unmet → the user compares the deliverables, records `adopt` with a reason in `RESULTS.md` → Phase 4. Had the user recorded `rework`, the builder gets the report and the notes, then review and evaluation repeat.
- **Error.** No renderer is available for the artifact's medium → verdict `incomplete` with VC-5 and VC-6 `not verified` → the user is told which tool is missing and decides; nothing is archived as passing by default.
- **Trivial.** "What does the visual contract say about dark mode?" → answered directly from `visual-contract`; no agents, no workspace.
