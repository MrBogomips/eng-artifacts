# Design

## Context

- The orchestrator triages a new artifact skill into Phase 0b (`references/explore.md`) and gates it on Phase 3b (`references/evaluate.md`): the `skill-exploration` and `skill-evaluation` specs require both for every new artifact skill.
- `evals/kpidoc.py` (behind `python3 evals/kpi.py doc`) finds the newest `RESULTS.md` entry whose `Decision:` starts with `adopt`, requires a `Deliverables: evals/results/<run-id>/` line in it, and renders the Performance section and the README row from `evals/<skill>/runs/<run-id>.json`. An adopted entry without a run raises a `DocError`. `tests/test-docs.sh` runs `kpi.py doc --check` on the repository and on edited copies.
- `openspec/config.yaml` holds the proposal rules (Exploration and Effectiveness sections) and the task rules (testbed, skill review, evaluation, documentation, archive). Its fourth task rule contains an unquoted `: `, so YAML reads it as a mapping and OpenSpec ignores the whole `tasks` rule list (`openspec context` warns about it).
- Tracking issue #14 plans three anchors (component, sequence, state machine) and nine derived skills; the first derived change (object and package diagrams, from the class diagram) waits for this one.

## Goals / Non-Goals

**Goals:**
- A derived skill goes from its issue to the proposal with no exploration, and from the reviews to the archive with the person's validation of a sample page in place of the evaluation.
- The validation is recorded where adoption is recorded today (`RESULTS.md`), and the documentation of a derived skill is generated and checked like that of a measured skill.
- The anchors' path, the evaluation's method and the visual review are unchanged.

**Non-Goals:**
- Deciding which skills are derived: each proposal declares it and the person approves it (tracking issue #14 holds the plan).
- Sharing code between an anchor and its derived skills: that is the design of each derived change (the first one extracts the class diagram's common UML notation).
- Any change to `evals/run.sh`, `evals/sketch.sh`, a renderer, a theme or the page shell.

## Decisions

### 1. A new capability, `skill-derivation`

The definition of a derived skill, its Derivation section, the sample page and the fallback form one behavior with its own lifecycle, so they get their own spec. `skill-exploration` and `skill-evaluation` each get the exemption and a cross-reference. Folding the rules into one of the two would leave the other with a dangling exception.

### 2. The validation entry in `RESULTS.md`

The person's decision on a derived skill is recorded in the same file as an evaluation's, as an entry that the generator and the tests can read:

```markdown
## 2026-11-20: validation

- Plugin version: 0.5.0
- Anchor: `uml-class-diagram`
- Sample: `evals/uml-object-diagram/sample/library.object.uml.json`
- Rendered with: default and alt themes, light and dark

Decision: adopt (validated, not measured; derived from uml-class-diagram) (2026-11-20). <the person's reason>
```

The newest `adopt` entry still wins, so a later evaluation that the person asks for and adopts replaces "not measured" with the measured figures, with no special case. Alternative rejected: recording the validation only as a comment on the issue. The generator could not read it, and adoption would be recorded in two places.

### 3. `kpidoc.py` reads a validation entry

`adopted_entry` also collects `Anchor:` and `Sample:` lines. An adopted entry whose decision starts with `adopt (validated, not measured` is a validation: it needs no run and no summary JSON, but it needs an `Anchor:` line naming a skill that itself has an adopted entry (otherwise `DocError`). Rendering, with fixed templates:

- **Performance section**: one paragraph. "Not measured. This skill is derived from [`<anchor>`](../<anchor>/README.md): it reuses that skill's renderer, layout and model conventions, whose measured performance is on its page. A person validated a sample page on `<date>` (plugin `<version>`). **Decision:** adopt (validated, not measured)."
- **README row**: `| [<skill>](skills/<skill>/README.md) | <summary> | not measured | not measured | <date>, derived from [<anchor>](skills/<anchor>/README.md) |`; the table's header and the explanatory sentence under it are unchanged, and a sentence is added when at least one row is not measured.

The measured path's output stays byte-for-byte identical, which `kpi.py doc --check` on the current repository proves.

### 4. The sample model is committed, the pages are not

`evals/<skill>/sample/` holds the sample model (data, neutral names, a few kilobytes) next to `RESULTS.md`, so the validation can be reproduced: `artifact_page.py` produces the page again from it with either theme. The pages are generated output (hundreds of kilobytes each) and would drift from the renderer; they go to `_agents_workspace/<change-id>/sample/` during the change. A new structural test, `tests/test-derived-samples.sh`, checks every validation entry: the `Sample:` path exists, it sits under `evals/<skill>/sample/`, and the skill's validator (`skills/<skill>/scripts/<skill with - as _>_model.py`) accepts it. With no derived skill yet, the test checks a fixture repository under `tests/fixtures/` and the real repository (where it finds nothing to check).

### 5. Orchestrator: triage and a validation phase

- **Triage**: a new artifact skill whose request or issue names an adopted anchor is derived. It skips Phase 0b and goes to `openspec-propose` with the anchor, the issue and the requirement of a Derivation section. When the request names no anchor, the person is asked only if an adopted skill plausibly fits; otherwise it is an anchor.
- **Phase 3c (validate)**, in a new `references/validate.md`, takes the place of Phase 3b for a derived skill that is not evaluated: produce the sample page with `default` and `alt` into the workspace, open both, give the person the paths and what the page shows (one line per notation feature of the Derivation section), ask for accept or fix, append the validation entry on accept. A fix goes to a builder round with the notes; the validation has its own cap of two fix rounds, counted apart from the visual review's two, so the person's notes are never cut short by the review's rounds. When the validation's cap is spent, the skill goes back to the spec process as an anchor (`skill-derivation`, "Back to the full path").
- **Phase 4** runs the documentation step for a validated skill exactly as for an adopted evaluation, and its archive gate accepts either.
- `references/test-scenarios.md` gains a "Derived" scenario.

### 6. Rules in `openspec/config.yaml`

- Proposal: a new rule for the Derivation section (anchor, reuse, additions mapped to roles or named as missing roles, sample case, what is left out). The Exploration and Effectiveness rules exclude a derived skill unless the person asks for an evaluation.
- Tasks: a derived skill has a task to write the sample model under `evals/<skill>/sample/` and a validation task in place of the testbed and evaluation tasks; the documentation and archive tasks apply to it, with the archive after the validation's adopt.
- The fourth task rule is quoted so that the `tasks` rules apply again; its text is unchanged.

### Token roles

None added or changed. No artifact type consumes anything new.

## Risks / Trade-offs

- **A derived skill is cheaper by assumption, not by measurement.** Mitigation: the anchor is measured, the derived skill reuses its renderer by definition, and the person can ask for an evaluation at any time; the README says "not measured" openly.
- **A skill declared derived turns out to need more.** Mitigation: the fallback requirement sends it back to the spec process after either two-round cap or as soon as the build sees a new engine; the plan flags the activity diagram (swimlanes) as the likely case.
- **The decision text is parsed.** The prefix `adopt (validated, not measured` is fixed by the spec and checked by the tests; a typo makes `kpi.py doc --check` fail and name the file, not pass silently.
- **Quoting the fourth task rule re-activates every `tasks` rule** that OpenSpec ignores today: task lists of future changes will follow them again, which is the intended behavior.
