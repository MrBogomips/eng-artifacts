# Design

## Context

`evals/sketch.sh` builds an empty stub plugin under `evals/results/sketch-<run-id>/plugin/`, copies the three cases into its `evals/`, and runs `claude plugin eval` on it with `--ablation none --runs 1`, the Skill and Agent tools disallowed. `evals/sketch.py` collects each run with `kpi.collect` (trace, observed effort, deliverables into `<case>/with-1/`, the kept temp folder deleted) and writes `report.json` and `report.md`, one row per case. `claude plugin eval` gives every run its own scaffold folder and session; `kpi.collect` already handles several runs per case (`with-1`, `with-2`, ...), as `evals/run.sh` uses it with three runs per arm. See proposal.md for the motivation.

## Goals / Non-Goals

**Goals:**
- Three runs of one case through the existing sandbox, with no new isolation mechanism.
- A report that a reader can trust to describe three attempts at the same prompt, at the effort asked for.

**Non-Goals:**
- Comparing the three deliverables mechanically (size, element count, a similarity score). The comparison is the person's, helped by the orchestrator's inventory; a number would invite an inferred choice, which the spec forbids.
- Any change to `evals/run.sh`, `evals/kpi.py` or the evaluation's own model and effort.

## Decisions

**One case, `--runs 3`.** The stub holds only `evals/complex/`, and `claude plugin eval` runs it with `--runs 3 -j 3`. Each run already gets its own scaffold folder and session, so isolation between runs comes from the tool, not from new code. Alternative considered: three copies of the case (`complex-1`, `complex-2`, `complex-3`) run once each; rejected, because three copies can drift apart, while one case run three times cannot.

**Concurrency stays 3.** The runs share nothing (separate folders, separate sessions), so running them at once does not let one see another; it only shortens the wall time. `-j 1` stays available.

**Defaults `claude-opus-5-5` / `xhigh`.** The effort goes to the child sessions through `CLAUDE_CODE_EFFORT_LEVEL`, as today. The report shows the requested effort and, per run, the effort observed in the run's records (`kpi.collect` already records it in `meta.json`), so a run that did not honor `xhigh` is visible.

**Prompt fingerprint from the run folder.** The stub copy of the case lives in the run folder (`plugin/evals/complex/prompt.md`), so it is part of the recorded run. `sketch.py` hashes that file (SHA-256, first 12 hex digits in the Markdown, the full digest in the JSON). That keeps the report computed from the records alone, and states in one line that the three runs had the same input.

**The former three-case folder.** `sketch.sh` requires `complex/prompt.md`; if `easy/` or `medium/` are also present it prints a notice that they are ignored and runs only `complex/`. It does not fail on them, so an exploration written before this change (issue #5) can be re-run after its prompt is revised.

**Report shape.** One row per run (`run 1`, `run 2`, `run 3`), columns as today; `ok` is true only when three runs are recorded, each delivered and skill-free. Fewer than three recorded runs is reported per missing run and makes `ok` false.

**Inventory of the three runs (orchestrator, not code).** Phase 0b presents the features in two lists: present in all three runs, present in only some (naming which run). This keeps the judgment with the person, and the record on the issue carries the same two lists.

**Testbed seeding.** `skill-eval` says: the exploration's `complex/` prompt is the first draft of the testbed's complex case; easy and medium are written from the brief by keeping a subset of the complex prompt's features (easy: a few elements, no structured source; medium: groups and optional parts), then all three are revised with the hints. The `openspec/config.yaml` task rule follows.

## Risks / Trade-offs

- [Cost: three `xhigh` sessions on a complex prompt cost more than the former mix] → the report shows each run's cost and the total; there is no ceiling by the user's earlier decision, and `--effort` can lower it.
- [Concurrent runs hit rate limits and one fails] → a failed run shows as missing with its error; the orchestrator re-runs the exploration once, as for a missing sketch today.
- [The effort is not honored by a child session] → the observed effort per run is in the report.
- [Three runs of one prompt cover a single scenario of the artifact type] → the prompt is required to cover the advanced cases the brief implies; easy and medium coverage moves to the testbed, where it is measured anyway.

## Migration Plan

Harness only, nothing shipped. Existing ignored run folders (`evals/results/sketch-*`) stay readable but are not re-reported. The exploration of issue #5 is re-run with a single complex case after this change is merged. Rollback is reverting the commit.
