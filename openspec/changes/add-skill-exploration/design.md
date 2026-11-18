## Context

A new artifact skill goes today from the request straight to `openspec-propose`. The proposal describes the artifact's features from the request alone, and the first look at real output comes at the visual review, after the build. The evaluation method already runs unassisted sessions (the baseline arm of `claude plugin eval`), but only once the testbed is written, as a task of the change.

The orchestrator (`.claude/skills/artifacts-orchestrator/SKILL.md`) owns the phases; GitHub Issues owns the work item; OpenSpec owns the change; `skill-eval` owns the testbed and the measurement. `evals/run.sh` drives `claude plugin eval` and `evals/kpi.py` collects the kept temporary folders, copies deliverables and computes metrics from each session's result record.

## Goals / Non-Goals

**Goals:**

- The person sees three unassisted renderings of the requested artifact, at three levels of difficulty, before anything is specified, and chooses the reference.
- The sketches are free of the plugin's skills and design by construction, not by instruction.
- The choice reaches the proposal, where it is mapped to the role vocabulary, and the prompts reach the testbed.
- Reuse the existing sandbox and collection code; no new agent.

**Non-Goals:**

- Measuring anything about the sketches beyond cost and existence: no classification, no comparison, no baseline.
- Exploring changes to an existing skill.
- Forking the OpenSpec schema.

## Decisions

### D1. The phase lives in the orchestrator, not in the OpenSpec schema

The exploration is a new Phase 0b in the orchestrator, between the work item and the spec, for a new artifact skill only. A forked schema with an `exploration` artifact before `proposal` was rejected: `openspec-propose` writes every artifact of the required set in one step, so it would write the exploration itself instead of pausing for the person's choice, and a fork must be kept in step with every OpenSpec upgrade. The OpenSpec side gets only rules in `openspec/config.yaml`, which it injects into the proposal and tasks instructions.

### D2. Isolation through the eval sandbox on an empty stub plugin

`evals/sketch.sh <cases-dir>` writes, under `evals/results/sketch-<run-id>/plugin/`, a stub plugin: a `.claude-plugin/plugin.json` with no skills and an `evals/` folder holding a copy of the three cases. It then runs:

```
claude plugin eval <stub> --ablation none --runs 1 -j 3 --model <m> \
    --keep-temp --no-publish --trust-plugin --threshold 0 \
    --allow-tools Bash Write Edit --disallow-tools Skill Agent \
    --output-dir <run-dir> --json <run-dir>/aggregate.json
```

The eval tool starts each session in a sealed home with no user settings, instructions, memory or other plugins; the stub brings no skill; `--disallow-tools Skill` removes the Skill tool altogether, so built-in skills cannot fire either; `Agent` is disallowed so no subagent brings its own context. Subagents of this session were rejected: they read the repository's `CLAUDE.md` and can load `visual-contract`, which is exactly the design the sketches must not see. A bare `claude -p --bare` was rejected because it needs an API key and would duplicate the sandbox.

Defaults match the evaluation: model `claude-opus-5-5`, effort `medium` through `CLAUDE_CODE_EFFORT_LEVEL`. Options: `--model`, `--effort`, `-j`.

### D3. Cases folder and naming

A cases folder holds `easy/`, `medium/` and `complex/`, each in the testbed layout: a `prompt.md` with frontmatter (`name: sketch-<case>`, `runs: 1`, `max_turns`, `timeout_seconds`, `allowed_tools` without `Skill`) and `graders/file.md`, a `file_exists` grader on the deliverable. The names are the testbed's, so seeding the testbed is a copy plus a revision. The orchestrator writes the folder at `_agents_workspace/explore-<slug>/cases/` (ignored); the runner takes any path, so it does not depend on the harness.

### D4. Collection and report in `evals/sketch.py`, reusing `kpi.py`

`sketch.py --run-dir <dir>` imports from `kpi.py` the collection (`collect`), the result reader and `run_metrics`, so deliverables are copied the same way to `<run-dir>/<case>/with-1/deliverables/` and the kept temporary folders are removed. It then reads each copied trace for a `tool_use` named `Skill` (the skill-free check), and writes `report.json` and `report.md`: per case the deliverable path, exists, skill-free, tokens, time, cost; total cost. No classification, no `RESULTS.md` entry, no summary JSON. Exit status: 0 when every case has its deliverable and is skill-free, 1 otherwise, 2 when the tooling failed. Run with `python3 -I`, standard library only, like `kpi.py`.

### D5. Recording on the issue

The issue body holds the brief. After the choice, the orchestrator comments with the chosen case, a short feature inventory of each of the three sketches (written by the orchestrator after opening them, so the record stands without the ignored files) and the person's hints. Paths in the comment are relative to the repository (`evals/results/sketch-<run-id>/...`), never absolute.

### D6. Presenting the sketches

The orchestrator opens the three deliverables in a browser, gives the person its own short feature inventory of each, and asks one question: which sketch is closest in functionality and richness, plus free hints. It never recommends one: the choice is the person's, like the adoption decision.

### D7. Into the proposal and the testbed

`openspec/config.yaml` gains:

- `proposal`: a change that adds a new artifact skill includes an "Exploration" section (issue, chosen sketch, hints, features kept, mapping of each feature to a role of the vocabulary as reused or missing, what is left out); a sketch's colors, fonts and sizes never carry over.
- `tasks`: the testbed task of a new skill starts from the exploration's cases, revises them with the hints, adds the mechanical graders, then runs the baseline.

The orchestrator passes to `openspec-propose` the brief, the chosen case's prompt and deliverable path, the hints and the issue number.

### D8. Structural test

`tests/test-sketch.sh`, picked up by `run-structural-tests.sh`: argument handling of `sketch.sh` without running `claude` (no argument, unknown option, missing folder, a missing case: each exits 2 and names the problem); `sketch.py` on committed fixtures under `tests/fixtures/sketch/` (all good → 0; one deliverable missing → 1 and named; one session with a Skill call → 1 and flagged; same records twice → identical reports). The fixtures are produced by a small generator, as `tests/fixtures/eval/make-fixtures.py` does for the KPI tests. BSD-compatible shell.

## Token roles

None added or changed. No artifact type consumes anything new.

## Risks / Trade-offs

- [The eval tool loads something of the user's into the stub's sessions] → the first task runs the stub once and inspects the session's init record: no skill beyond none, no plugin but the stub, no `CLAUDE.md`. If it fails, the change stops for a decision.
- [`--ablation none` or `--disallow-tools` behaves differently from its help text] → same first task; the runner fails loudly rather than producing contaminated sketches.
- [Three sessions at opus/medium cost money on every new skill] → cost is reported; the user decided evaluations are not capped, and the sketches replace guesswork that would otherwise cost a build round.
- [The person picks by looks rather than functionality] → the orchestrator's feature inventory puts functionality and richness first; looks are adapted to the design anyway.
- [Sketch prompts drift from the testbed] → the testbed task starts from them and revises them explicitly; the baseline is still measured on the final prompts.

## Migration Plan

No migration: no skill is in flight. The ERD skill predates the phase and is not re-explored. Rollback is reverting the commit; nothing shipped changes.

## Open Questions

None.
