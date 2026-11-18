# Proposal

## Why

A skill's text is what an agent loads into its context every time the skill triggers, so how the skill says what to read, when, and what to leave to a script decides much of what the skill costs. Nothing in the delivery workflow looks at that text with this focus: the visual review checks the pages, the evaluation measures the whole skill end to end, and a SKILL.md that loads more than it needs, repeats its references or describes in prose what a script already does passes both unnoticed (issue MrBogomips/eng-artifacts#10).

The performance evaluation, on the other hand, runs on every change to an artifact skill: eighteen agent sessions and about thirteen dollars each time, to re-measure a skill whose value was already measured and adopted. The person decided (2026-11-18) that it runs only for a new artifact skill, a major refactoring of an existing one, or on the person's explicit request.

## What Changes

- A **skill review** step is added to the delivery workflow: every `SKILL.md` that a change adds or changes, of a plugin skill (`skills/*`) or of a harness skill (`.claude/skills/*`), is reviewed with the `skill-creator` skill, with the focus on **how the skill describes its context management**: what is loaded when the skill triggers and what only on demand, the length of `SKILL.md`, each reference with a stated moment to read it, deterministic work left to scripts rather than spelled out in prose, no content repeated between `SKILL.md` and its references, the frontmatter description as a trigger.
- It is a **pure review with optimization**: the reviewer applies its improvements to the skill's `SKILL.md` and `references/*.md` directly. It runs **no tests, no evals, no agent sessions and no description-optimization loop**.
- The review never changes behavior that the change's specs set; a conflict goes back to the spec process.
- It runs as **Phase 3a** of the orchestrator: after the visual review passes (or straight after the build when the change has nothing visual), and **before the evaluation**, so that the evaluation measures the final text.
- It is done by one subagent that starts from the skill and the change, not from the builder's conclusions, and writes a report of each edit with its reason and of what it deliberately left alone. The structural tests and the change's validation run again after it.
- When `skill-creator` is not available, the step is reported as skipped, never silently omitted.
- **The performance evaluation runs only for a new artifact skill, a major refactoring of an existing skill (declared as such in the proposal the person approves), or on the person's explicit request.** Any other change or update to an existing artifact skill runs no evaluation, needs no Effectiveness section, testbed task or baseline, and is archived once its visual review and skill review are done; the skill keeps its last adopted evaluation in its documentation and in the README table.
- The harness follows: the orchestrator's workflow, the task rules of `openspec/config.yaml`, the `skill-eval` skill, `CLAUDE.md`.

## Capabilities

### New Capabilities

- `skill-review`: the review of a skill's text, focused on its context management, that every change adding or changing a skill goes through before the skill is evaluated.

### Modified Capabilities

- `skill-evaluation`: the requirement that gates a skill change on an adopted evaluation now applies only to a new artifact skill, a major refactoring declared in the proposal, or an evaluation the person asks for; any other change to an existing skill runs no evaluation. The method, the targets and the person's decision are unchanged where the evaluation runs.

## Visual contract

The change touches no artifact type and no part of the shared visual language: it changes the harness, which is never shipped. The review edits only the text of skills, never a theme, a page or a renderer.

| Invariant | How this change keeps it |
|---|---|
| VC-1 one style source | Not affected: no style value is added or moved. |
| VC-2 semantic tokens | Not affected: the review edits instructions, not token names or values. |
| VC-3 same role, same look | Not affected. |
| VC-4 themable | Not affected: no theme or theme mechanism changes. |
| VC-5 light and dark | Not affected: no page is rendered differently. |
| VC-6 the switch | Not affected: the page shell and its toggle are unchanged. |

## Effectiveness

Not applicable: no artifact skill is added or changed. From this change on, only a new artifact skill, a declared major refactoring or an explicit request is evaluated.

## Impact

- Changed, not shipped: `.claude/skills/artifacts-orchestrator/SKILL.md` and its new `references/` folder (`explore.md`, `skill-review.md`, `evaluate.md`, `integrate.md`, `test-scenarios.md`, moved out of `SKILL.md` by the skill review so that only triage and the phase sequence load on every prompt), `.claude/skills/skill-eval/SKILL.md`, `openspec/config.yaml`, `CLAUDE.md`.
- New spec: `openspec/specs/skill-review/` at archive time; `openspec/specs/skill-evaluation/` modified.
- Unchanged: every shipped file (`skills/`, `shared/`, manifests), `evals/`, `tests/`. The plugin version does not change.
- Dependency: the `skill-creator` skill in the session that runs the orchestrator. It is not shipped with the plugin and the plugin does not depend on it.
- The change goes through its own new step: the orchestrator's `SKILL.md`, which it changes, is the first skill reviewed.
