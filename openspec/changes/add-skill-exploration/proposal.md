# Proposal

## Why

A new artifact skill is specified today from a description alone: what the artifact should show, and how rich it should be, is guessed in the proposal and discovered only when the first build is reviewed. Looking first at what an unassisted session produces for the same request, at three levels of difficulty, lets the person point at the functionality and richness they want before anything is specified, and gives the skill's testbed its first prompts (issue MrBogomips/eng-artifacts#3).

## What Changes

- A new **exploration phase** precedes the proposal of every new artifact skill:
  1. the person gives a brief of the skill: the artifact type, who it is for, the sources it starts from, and optionally a concrete use case;
  2. from the brief, three prompts of rising difficulty (easy, medium, complex), written by the fair-case rules of the evaluation method, each produce one self-contained HTML page in an isolated session that has no plugin, skill, project instructions, memory or design;
  3. the person opens the three pages and picks the one closest to the functionality and richness wanted, with optional hints;
  4. the brief, the choice and the hints are recorded on the skill's GitHub issue.
- A new command, `evals/sketch.sh <cases-dir>`, runs the three sketches in the sandbox of `claude plugin eval` against an empty stub plugin, with the Skill tool disallowed, one run per case, and prints a sketch report: per case the kept deliverable, tokens, time and cost, and whether the deliverable exists. It never publishes and has no cost ceiling.
- The proposal of a new artifact skill gains an **Exploration** section: the issue, the chosen sketch, the hints, the features kept from it, how they map to the role vocabulary of the visual contract (roles reused, roles missing) and what is deliberately left out. From there the phases are unchanged: testbed and baseline, build, visual review, evaluation, documentation, archive.
- The three sketch prompts seed the skill's testbed. They are revised with the person's hints when the testbed is written; the measured baseline (three runs per arm) stays a task of the skill's change, and the sketches never count as a baseline.
- The development harness follows: the orchestrator gets an Explore phase between the work item and the spec, the `skill-eval` skill says how the testbed is seeded, `openspec/config.yaml` gets the rules for the Exploration section and the testbed task, and `CLAUDE.md` records the command, where the sketches live and the change.
- A change to an existing artifact skill skips the exploration.

## Capabilities

### New Capabilities

- `skill-exploration`: the exploration that precedes a new artifact skill: the brief, the three isolated sketches and the command that runs them, the person's choice and its record, and the gate it places on the proposal of a new skill.

### Modified Capabilities

None. The evaluation method (`skill-evaluation`) keeps its requirements: the testbed, its fairness and the baseline are unchanged, and only their first draft now comes from the exploration, which the new capability states.

## Visual contract

The change produces no artifact and touches neither the shared style source nor any artifact skill. The sketches are deliberately outside the design: they are input to a decision, kept in an ignored folder and never shipped. The proposal's Exploration section is where what they show is brought back to the design, in the role vocabulary.

| Invariant | How this change keeps it |
|---|---|
| VC-1 one style source | Not affected: no style value is added anywhere in the plugin. The sketches carry their own styles, but they are not part of the plugin and are never shipped or committed. |
| VC-2 semantic tokens | Not affected; the Exploration section maps the sketch's features to role names of the vocabulary, never to the sketch's colors or fonts. |
| VC-3 same role, same look | Not affected now; the Exploration section names the existing roles the new skill reuses before it proposes a new one, which supports this invariant for the skill that follows. |
| VC-4 themable | Not affected: no theme or theme mechanism changes. |
| VC-5 light and dark | Not affected: no artifact is rendered by the plugin in this change. |
| VC-6 the switch | Not affected: the page shell and its toggle are unchanged. |

## Effectiveness

Not applicable: the change adds no artifact skill. It changes how a new artifact skill's testbed is first drafted; the evaluation of each skill, its targets and the person's decision are unchanged.

## Impact

- New: `evals/sketch.sh` (runner), `evals/sketch.py` (collection and sketch report, reusing the collection and metrics of `evals/kpi.py`), `tests/test-sketch.sh` with fixtures under `tests/fixtures/sketch/`.
- Changed, not shipped: `.claude/skills/artifacts-orchestrator/SKILL.md`, `.claude/skills/skill-eval/SKILL.md`, `openspec/config.yaml`, `CLAUDE.md`.
- Exploration cases live in the ignored `_agents_workspace/explore-<slug>/cases/`; sketch runs in the ignored `evals/results/sketch-<run-id>/`. Nothing is added to `evals/<skill>/`.
- Shipped plugin files: none. The plugin version does not change.
- Depends on `claude plugin eval` running a target plugin with `--ablation none` and `--disallow-tools`; the first task checks that the stub's sessions load no skill.
