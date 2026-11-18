# Proposal

## Why

The person decided (2026-11-18, tracking issue MrBogomips/eng-artifacts#14) to deliver the twelve remaining UML 2.5 diagram types as artifact skills. Most of them differ little from a skill that already exists: an object or a package diagram reuses almost all of the class diagram, and a deployment diagram reuses the component diagram. Today every new artifact skill takes the full path: the exploration (three sketches, about 10-27 USD), a baseline (about 28 USD) and an evaluation (about 16 USD), on top of the build and the reviews. Over twelve skills the measurement alone would cost about 650-850 USD, and most of it would only confirm that a renderer we already measured is still cheaper than drawing by hand (issue MrBogomips/eng-artifacts#15).

## What Changes

- A new artifact skill can be declared **derived**: its proposal names an **anchor**, an adopted artifact skill whose renderer, model conventions, layout engine and visual vocabulary it reuses, and lists the notation it adds. The person decides by approving the proposal, which carries a **Derivation** section: the anchor, what is reused, what is added (each notation shape mapped to a role of the visual contract or named as a missing role for the person to decide), the sample case and what is left out.
- A derived skill **skips the exploration** (Phase 0b): no brief to sketch from, no three runs, no choice of a run.
- A derived skill **skips the performance evaluation** unless the person asks for one explicitly. Its gate is the person's **validation of a sample page**: the builder writes one sample model that covers every notation feature of the skill from a complex source, produces the page with the default and the alternate theme, and the person opens it and records `Decision: adopt (validated, not measured; derived from <anchor>)` in `evals/<skill>/RESULTS.md`, or asks for a fix round (at most two, counted apart from the visual review's two).
- The sample model is committed under `evals/<skill>/sample/` (data only, neutral names) and must validate; the pages are produced again from it at any time and are not committed.
- The **documentation step** covers derived skills: `python3 evals/kpi.py doc` renders their Performance section and their README skills-table row as "not measured, derived from `<anchor>`", with the validation date, from the validated `RESULTS.md` entry. The structural tests check it as they check the measured skills.
- If the build shows that the skill needs a new layout engine or a new notation vocabulary, the change goes back to the spec process and the skill takes the full path as an anchor.
- **Anchors keep the full path unchanged**: exploration, proposal, build, visual review, skill review, evaluation, adoption. Every new notation shape, in an anchor or a derived skill, still goes into the visual contract with the person's approval.
- The harness follows: the orchestrator (triage, Phase 0b skipped, a validation phase in place of Phase 3b), the `skill-eval` skill, the proposal and task rules of `openspec/config.yaml` (whose fourth task rule, today read by YAML as a mapping and ignored, is quoted so that it applies again), `CLAUDE.md`.

## Capabilities

### New Capabilities

- `skill-derivation`: what makes a new artifact skill derived from an adopted anchor, the Derivation section of its proposal, the sample page the person validates in place of the evaluation, the fallback to the full path.

### Modified Capabilities

- `skill-exploration`: the exploration precedes a new artifact skill unless the skill is derived; a derived skill's proposal has a Derivation section in place of the Exploration section.
- `skill-evaluation`: the testbed, the evaluation gate and the documentation apply to an evaluated skill; a derived skill is not evaluated unless the person asks, is gated by its validation, and is documented as not measured.

## Visual contract

The change touches no artifact type and no part of the shared visual language: it changes the harness, the evaluation tooling and the documentation generator, none of which draws a page. The ERD and the UML class diagram are unchanged.

| Invariant | How this change keeps it |
|---|---|
| VC-1 one style source | Not affected: no style value is added or moved. A derived skill later takes its values from `shared/themes/` like any other. |
| VC-2 semantic tokens | Not affected. The Derivation section maps each added notation shape to a role of the vocabulary, or names it as a missing role for the person to decide, as the Exploration section does. |
| VC-3 same role, same look | Strengthened for later changes: a derived skill reuses its anchor's renderer and roles by definition. |
| VC-4 themable | Not affected now; the validation page of a derived skill is produced with the default and the alternate theme. |
| VC-5 light and dark | Not affected now; the visual review of a derived skill is unchanged and still renders both modes. |
| VC-6 the switch | Not affected: the page shell and its toggle are unchanged. |

## Effectiveness

Not applicable: no artifact skill is added or changed. Under this change, three anchors (component, sequence and state machine) and nine derived skills cost about 160-215 USD of measurement in place of about 650-850 USD.

## Impact

- Changed, not shipped: `evals/kpidoc.py` (and `evals/kpi.py` only if its `doc` entry needs it), `tests/test-docs.sh` and a fixture for a derived skill, `.claude/skills/artifacts-orchestrator/SKILL.md` and its `references/` (a new `validate.md`; `integrate.md` and `test-scenarios.md` updated), `.claude/skills/skill-eval/SKILL.md`, `openspec/config.yaml`, `CLAUDE.md`.
- New spec `openspec/specs/skill-derivation/` at archive time; `openspec/specs/skill-exploration/` and `openspec/specs/skill-evaluation/` modified.
- Unchanged: every shipped file (`skills/`, `shared/`, manifests), `evals/run.sh`, `evals/sketch.sh`, the evaluation's method, targets and classification. The plugin version does not change.
- The current README skills table and Performance sections are regenerated unchanged (no derived skill exists yet).
