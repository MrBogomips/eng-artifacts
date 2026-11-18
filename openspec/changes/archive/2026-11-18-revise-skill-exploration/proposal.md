# Proposal

## Why

The exploration of a new artifact skill runs three prompts of rising difficulty (easy, medium, complex), once each, at effort `medium`. That mixes two variables, the difficulty of the prompt and the variance of the model, and spends two of the three sessions on cases that tell little about what a skill has to add: an unassisted model handles easy artifacts well. What decides the shape of a skill is what the bare model does on the advanced, complex cases typical of the artifact type, and how much its results differ from one attempt to the next (issue MrBogomips/eng-artifacts#6).

## What Changes

- The exploration writes **one prompt**, complex: it covers the advanced and complex cases typical of the artifact type, every feature the brief implies, from a structured source where the brief names one. It follows the fair-case rules unchanged.
- **The same identical prompt runs three times**, in three fully isolated sessions: each in its own sandbox, with no plugin skill, no project or user instructions, no memory, no state shared with the other runs, and the Skill and Agent tools disallowed.
- The three runs use **model `claude-opus-5-5` at effort `xhigh`** by default; `--model` and `--effort` still override.
- `evals/sketch.sh <cases-dir>` takes a folder that holds the single case `complex/`; a folder without it runs nothing and exits non-zero. **BREAKING** for the harness: a folder of three cases `easy/`, `medium/`, `complex/` is no longer the input (the extra cases are ignored with a notice).
- The sketch report lists, per run, the kept deliverable, whether it exists, whether the session was skill-free, tokens, time and cost, then the total cost, and states the fingerprint of the prompt the three runs shared. It stays computed from the recorded sessions only, with no classification and no decision.
- The person compares the three artifacts. The orchestrator's inventory separates the features present in all three runs from those present in only some (the variability of the unassisted model), and never recommends one. The person picks the run closest to the functionality and richness wanted, or says none fits, and adds hints; the record on the issue is unchanged in form.
- The testbed is seeded differently: the exploration's complex prompt seeds the testbed's complex case; the easy and medium cases are written from the brief by reducing that prompt to a subset of its features. The sketches still never count as the baseline.
- The harness follows: the orchestrator's Phase 0b, the seeding section of `skill-eval`, the Exploration and testbed rules of `openspec/config.yaml`, and `CLAUDE.md` (the command and the change history).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `skill-exploration`: one complex prompt in place of three of rising difficulty; three isolated runs of that same prompt; Opus at effort `xhigh` by default; the command takes the single complex case; the report is per run and states the shared prompt; the person chooses among three runs of the same prompt, with an inventory of what is constant and what varies; the testbed seeding derives easy and medium from the complex prompt.

`skill-evaluation` keeps its requirements: the testbed still has easy, medium and complex cases, and only their first draft changes.

## Visual contract

The change touches no artifact type and no part of the shared visual language: it changes harness and evaluation tooling that is never shipped. The sketches stay outside the design, kept in an ignored folder.

| Invariant | How this change keeps it |
|---|---|
| VC-1 one style source | Not affected: no style value is added to the plugin; the sketches are never shipped or committed. |
| VC-2 semantic tokens | Not affected; the Exploration section still maps features to role names, never to a sketch's colors or fonts. |
| VC-3 same role, same look | Not affected. |
| VC-4 themable | Not affected: no theme or theme mechanism changes. |
| VC-5 light and dark | Not affected: no artifact is rendered by the plugin. |
| VC-6 the switch | Not affected: the page shell and its toggle are unchanged. |

## Effectiveness

Not applicable: no artifact skill is added or changed. The evaluation of each skill (`evals/run.sh`, its model and effort, its targets, the person's decision) is unchanged.

## Impact

- Changed: `evals/sketch.sh`, `evals/sketch.py`, `tests/test-sketch.sh` and the fixtures under `tests/fixtures/sketch/`.
- Changed, not shipped: `.claude/skills/artifacts-orchestrator/SKILL.md`, `.claude/skills/skill-eval/SKILL.md`, `openspec/config.yaml`, `CLAUDE.md`.
- Unchanged: `evals/run.sh`, `evals/kpi.py`, every shipped file (`skills/`, `shared/`, manifests). The plugin version does not change.
- Cost: three sessions at effort `xhigh` on a complex prompt cost more per exploration than the former mix; the report shows it, and there is still no cost ceiling.
- Pending work: issue MrBogomips/eng-artifacts#5 (`uml-class-diagram`) has exploration cases written by the former method and no recorded choice; its exploration is re-run with the new method once this change is merged.
