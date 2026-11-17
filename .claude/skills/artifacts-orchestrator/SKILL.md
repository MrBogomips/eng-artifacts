---
name: artifacts-orchestrator
description: "Entry point for all work in the artifacts plugin repository: invoke before responding to any request here. Coordinates the spec process (OpenSpec), the artifact-builder and the visual-reviewer to deliver a change to the plugin with the visual contract intact. Use for: add or change an artifact skill (WBS, UML, any diagram), change the shared visual language, tokens, a theme, light or dark mode, the mode switch, the plugin manifest or the tests; audit the plugin's visual coherence. Also use for follow-ups: continue the change, re-run, run the review again, fix the review findings, update, modify, supplement, improve the previous result, archive the change."
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
| Building, review, integration | this orchestrator | the phases below |

Each concern has one owner. Read OpenSpec artifacts and issues in place; never copy their content into `_agents_workspace/`, and keep no status file of your own.

## Workflow

### Phase 0: intake and triage (orchestrator)

This skill is the repository's entry point, so it runs for every prompt. Triage first:

- **Trivial, conversational, or outside the plugin** (a question, an explanation, a look at a file): answer directly and stop. No agents, no workspace.
- **A change that keeps the specified behavior** (formatting, a typo, a version bump, a fix that restores what a spec already says): make it directly, without an OpenSpec change. If it touches anything that affects appearance, still run Phase 3 on it.
- **A change to the plugin's observable behavior** (a new or changed artifact skill, the shared style source, tokens, a theme, the switch): continue below.
- **An audit request** ("are the artifacts coherent?", "check dark mode"): write a brief naming the scope, run Phase 3 alone, report.

For a change to observable behavior:

1. **Work item → GitHub Issues.** If `git remote get-url origin` succeeds, run `gh issue list --state open --json number,title,state,labels`. If an issue matches the request, carry its number through the run. If the work is new, tell the user the title you are about to file, then `gh issue create`. If the repository has no remote yet, skip the tracker and say so in the final summary.
2. **Spec → OpenSpec.** Run `openspec list --json`. If no change under `openspec/changes/` covers the request, the spec process owns the next step: invoke the `openspec-propose` skill with a contextual prompt built from what you already hold: the goal, the artifact types affected, the constraints, the issue number, and the requirement that the proposal address invariants VC-1 to VC-6. That workflow produces planning artifacts and stops. Present the proposal and **pause** until the user approves it. To revise it, use `openspec-update-change`.
3. **Context check.** With an approved change:
   - `_agents_workspace/<change-id>/` absent → first run; go to Phase 1.
   - present, and the request is partial ("fix the review findings", "run the review again") → re-run only the phase concerned, passing the existing files to the agent.
   - present, and the change's artifacts were revised since → move the folder to `_agents_workspace/archive/<change-id>-<YYYYMMDD_HHMMSS>/` and go to Phase 1.

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

### Phase 4: integrate (orchestrator)

1. Run `openspec validate <change-id> --strict` again and check that every checkbox in `tasks.md` is ticked.
2. Give the user a summary: what was built, the reviewer's verdict per invariant, anything not verified, the files changed.
3. On the user's go-ahead, and not before:
   - commit the work on the topic branch;
   - archive the change with the `openspec-archive-change` skill, as the last commit before merge, so that `openspec/specs/` on `main` matches the behavior on `main`;
   - if an issue is carried: `gh issue comment <number>` with the summary and the change id, and `gh issue close <number>` once the work is merged.
4. Keep `_agents_workspace/<change-id>/` for later inspection.

Never rewrite the prose of a proposal or an issue that a person wrote: the spec and the tracker own intent, this orchestrator owns execution.

## Error handling

| Situation | Strategy |
|-----------|----------|
| An agent fails or returns nothing | retry once with the same input; on a second failure, stop and report what is missing |
| The builder reports a blocked task | stop the loop; take the decision to the user |
| The change's artifacts contradict each other | back to the spec process (`openspec-update-change`), then restart from Phase 1 |
| The verdict is still `fail` after two fix rounds | stop; report the open findings; no archive |
| The reviewer cannot render | verdict `incomplete`; the user decides whether to accept the gap |
| The builder disputes a finding | keep both positions with their evidence in the summary; the user decides |
| `gh` fails or is not authenticated | continue without the tracker; say in the summary what was not written to the issue |

## Test scenarios

- **Normal.** "Add a WBS skill." No change exists → an issue is filed, `openspec-propose` writes the change, the user approves → brief → the builder implements and ticks the tasks → the reviewer renders two artifact types in two themes and both modes, verdict `pass` → summary → on go-ahead: commit, archive, issue commented and closed.
- **Fix loop.** The reviewer reports `VC-1 fail` for a literal color in a template → the builder moves the value to a token role in the shared source → the second review re-checks every invariant and passes.
- **Error.** No renderer is available for the artifact's medium → verdict `incomplete` with VC-5 and VC-6 `not verified` → the user is told which tool is missing and decides; nothing is archived as passing by default.
- **Trivial.** "What does the visual contract say about dark mode?" → answered directly from `visual-contract`; no agents, no workspace.
