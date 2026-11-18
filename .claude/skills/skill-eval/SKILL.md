---
name: skill-eval
description: "How the artifacts plugin measures whether an artifact skill pays for itself: the testbed of three cases (easy, medium, complex), the with-and-without comparison of time and tokens, how to write fair cases and mechanical graders, how to read the KPI report, review the kept deliverables and record the adopt, rework or reject decision. Use when writing the testbed for a new or changed artifact skill, running or re-running an evaluation, reading an evaluation report, deciding whether a skill is adopted, or when a proposal, design or task list must state its Effectiveness section."
---

# Skill evaluation

An artifact skill earns its place only if it makes the artifact cheaper to produce. The plugin measures that instead of assuming it: the same prompts run with the plugin and without it, and the two KPIs are wall-clock time and tokens consumed, with cost reported beside them. The numbers come from a script and are deterministic; the judgement of quality and the decision to adopt belong to a person. The requirements are the `skill-evaluation` capability in `openspec/specs/`, or, while the change is in flight, its spec delta under `openspec/changes/<id>/specs/`.

The mechanics are not repeated here. `evals/run.sh <skill>` runs the testbed and prints the report; `evals/kpi.py` computes it; read the header of each for the options.

## The testbed

One folder per skill, `evals/<skill>/<case>/`, in the layout `claude plugin eval` reads: a `prompt.md` (frontmatter and the prompt) and `graders/*.md`, one file per grader. Three cases of rising difficulty:

| Case | Asks for |
|---|---|
| easy | a few elements from a short description |
| medium | a larger artifact from prose, with groups and optional parts |
| complex | an artifact from a structured source (DDL, a spec), with every feature the skill supports, and the distinctions the skill makes named in the prompt |

Every case is tagged with the skill's name (`tags: [<skill>]`), has `runs: 3`, and names its case `<skill>-<case>`.

### Fair cases

A case is fair when both arms can produce the deliverable and neither is told how.

- The prompt names the deliverable and where to write it (for example a self-contained HTML page called `erd.html` in the current folder) and the features the artifact must have, as the user would ask for them: notation, groups, a light and dark switch.
- The prompt never mentions the plugin, a skill, a helper script or the page assembler. Whatever the skill brings is what is being measured.
- The prompt does not forbid what the plugin arm needs, such as a CDN script.
- The sandbox of the child sessions has no network and writes only inside its own folder: a deliverable that needs a download cannot be produced by either arm.

Check fairness by running the testbed before the skill exists (the baseline). Every baseline run must produce its deliverable. A case that no arm can satisfy is broken: revise it and run again.

### Mechanical graders

Graders only check facts, never quality, and never use a model as judge (no `llm` grader).

- `file_exists` on the deliverable. It counts only files the run created.
- One `regex` per expected name, with `target: { source: file, path: <deliverable> }`, case-insensitive, on word boundaries.
- `tool_used` with `tool: Skill` and `arm: with-only`, matching the skill's name, so a plugin run that never used the skill is flagged.

Looks stay with the visual-reviewer; correctness is the person's call.

## Seeding the testbed from the exploration

A new artifact skill is explored before it is proposed (Phase 0b of the orchestrator): `evals/sketch.sh` runs three unassisted sketches, the person picks one and adds hints. The three sketch prompts are the first draft of the testbed.

1. Copy the three cases of `_agents_workspace/explore-<slug>/cases/` to `evals/<skill>/{easy,medium,complex}/`.
2. Revise each prompt with the person's hints and the chosen sketch's features, by the fair-case rules above. Rename the cases `<skill>-<case>`, add `tags: [<skill>]`, set `runs: 3` and add `Skill` back to `allowed_tools`.
3. Replace the sketch's single `file_exists` grader by the mechanical graders: the deliverable, one `regex` per expected name, and `tool_used` for the skill.
4. Run the baseline with `evals/run.sh <skill> --baseline`.

The sketches never count as the baseline: they ran once, on unrevised prompts, with different tools. The baseline is measured by `evals/run.sh` on the final prompts.

## Running it

`evals/run.sh <skill>` with the defaults: model `claude-opus-5-5`, effort `medium` (passed through `CLAUDE_CODE_EFFORT_LEVEL`, which the child sessions honor), three runs per arm, concurrency two, targets 20% fewer tokens and 20% less time summed over the cases' medians. There is no cost ceiling and no cost confirmation: cost is measured and reported. The report is never published. A proposal may set stricter targets with `--target-tokens` and `--target-time`, never looser ones.

Run the baseline once before the skill is built (`--baseline`): it records the baseline arm's KPIs and checks that the cases are fair. The plugin arm of that run has no skill yet, so it is reported but not classified.

## Reading the report

`evals/results/<run-id>/report.md` (also printed) holds the classification, the totals, per case median with minimum and maximum, cost, the mechanical checks per run and the deliverable paths.

| Classification | Meaning | Next |
|---|---|---|
| `meets target` | both targets met, no case worse on either KPI, every plugin run passed its checks | review the deliverables, then the person decides |
| `below target` | some reduction, not enough or not everywhere; the report names each unmet target, worse case and flagged run | the person decides, most of all when it is borderline |
| `no benefit` | no reduction on either KPI | usually `rework` or `reject` |
| `incomplete` | a run produced no result record | run again once; if it stays incomplete, say which runs failed |

A flagged run is a plugin run that did not use the skill or failed its checks: find out why before anything else.

## Reviewing the deliverables

The numbers do not say whether the pages are right. Open the kept deliverables of both arms for every case (`evals/results/<run-id>/<case>/<arm>-<n>/deliverables/`) and compare: are all entities, keys and relationships there and correct, does the notation mean what it should, does the page work in light and dark. A skill that is cheaper but wrong is not adopted. Give the person the report, the paths to compare and what you saw.

## Recording the decision

The decision is the person's: `adopt`, `rework` or `reject`, with a reason, written on the `Decision:` line of the evaluation's entry in `evals/<skill>/RESULTS.md` (the entry starts as `Decision: pending`). An entry holds no absolute path, user name or transcript, so it can be committed as is; raw runs and kept deliverables stay in the ignored `evals/results/`. A change that adds or changes an artifact skill is archived only after `adopt` is recorded on an evaluation of its final version.

## Documenting the result

Documenting what a skill does and what it saves is the last step of its delivery, after `adopt` is recorded and before the archive. The method is the `skill-evaluation` requirements "Performance in the skill's documentation" and "Skills summary in the repository README".

- **Where.** `skills/<skill>/README.md` documents the skill: what it produces, inputs, options, an example, requirements, and the Performance section. Never put performance in `SKILL.md`: that file is loaded into the model's context every time the skill fires, so it would cost tokens on every use.
- **The README's shape.** It starts with a front block (`---`, a `summary:` line holding the one-line capability summary, `---`) and holds the two markers `<!-- performance:start -->` and `<!-- performance:end -->` where the Performance section goes. Nothing between the markers is written by hand.
- **The data.** Recording an evaluation also writes its sanitized summary, `evals/<skill>/runs/<run-id>.json` (figures only, committed). The adopted evaluation is the newest `RESULTS.md` entry whose `Decision:` line starts with `adopt`; a baseline (`Decision: n/a`), pending, `rework` or `reject` entry never counts. Its summary JSON is the only source of the documentation.
- **The command.** `python3 evals/kpi.py doc [<skill>]` renders the Performance section (lead sentence, per-case and total table of tokens, time and cost per run for both arms with the change, date, plugin version, model and effort, runs per arm, classification and decision) and the skills table between `<!-- skills:start -->` and `<!-- skills:end -->` in the root `README.md` (one row per adopted skill: name linked to its page, the `summary:` line, token and time change, date). The template is fixed; the output is deterministic. `--check` writes nothing and fails naming each out-of-date file.
- **The check.** `tests/test-docs.sh` runs `kpi.py doc --check`, so a missing or hand-edited section fails the structural tests. Run `bash tests/run-structural-tests.sh` after generating.
- **After a re-evaluation.** A new adopted evaluation changes the numbers: run `kpi.py doc` again and commit the changed READMEs with the new `RESULTS.md` entry and summary JSON.
