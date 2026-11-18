# Tasks

## 1. Report and fixtures (test first)

- [x] 1.1 Rewrite `tests/fixtures/sketch/make-fixtures.py` for one case run three times: run folders `sketch-complex/with-1..3`, the stub copy `plugin/evals/complex/prompt.md`, an `observed effort` in each `meta.json`; scenarios `good` (three delivered, skill-free runs), `missing` (run 2 left no deliverable), `skill-called` (run 3 called the Skill tool), `short` (only two runs recorded). Regenerate the fixtures. Verify: the script runs and the four fixture folders exist.
- [x] 1.2 Rewrite `tests/test-sketch.sh` for the new behavior: refusals (no argument, unknown option, missing folder, a folder without `complex/` named in the message, no run folder left behind), `--help`, the ignored-cases notice for a folder holding `easy/` and `medium/` beside `complex/` (checked without starting claude: the notice comes before the claude check, with `PATH` stripped of claude), and the report scenarios: three rows `run 1..3`, per-run figures, total cost, the prompt fingerprint identical to the SHA-256 of the fixture prompt, model and requested effort, the observed effort per run, `ok` false for `missing`, `skill-called` and `short`, no absolute path, determinism, a broken trace field named. Verify: `bash tests/test-sketch.sh` fails against the current code (red).

## 2. Command and report

- [x] 2.1 Change `evals/sketch.sh`: one case `complex/` required, a notice for any `easy/` or `medium/` present (then ignored), only `complex/` copied into the stub, `--runs 3`, defaults model `claude-opus-5-5` and effort `xhigh`, header comment and usage updated. Verify: the refusal and notice checks of `tests/test-sketch.sh` pass.
- [x] 2.2 Change `evals/sketch.py`: one row per recorded run of the complex case, three expected; the prompt fingerprint from `plugin/evals/complex/prompt.md` (12 hex digits in Markdown, full digest in JSON); the observed effort per run; `ok` only when three runs are delivered, complete and skill-free; docstring updated. Verify: `bash tests/test-sketch.sh` passes (green) and `bash tests/run-structural-tests.sh` passes.

## 3. Harness and documentation

- [x] 3.1 Update Phase 0b of `.claude/skills/artifacts-orchestrator/SKILL.md`: one complex case covering the advanced cases of the artifact type, three isolated runs of it at `claude-opus-5-5` / `xhigh`, the inventory split into features in all three runs and features in only some, the choice of a run or "none fits", the record on the issue with the same two lists; the ownership table, the error-handling row and the Explore test scenario follow. Verify: `grep -n "easy\|medium" .claude/skills/artifacts-orchestrator/SKILL.md` finds no reference to exploration cases of those names.
- [x] 3.2 Update "Seeding the testbed from the exploration" in `.claude/skills/skill-eval/SKILL.md`: the complex prompt seeds the complex case; easy and medium are written from the brief by reducing that prompt; all three revised with the hints; the sketches never count as the baseline. Verify: the section names one exploration prompt and states how easy and medium are derived.
- [x] 3.3 Update `openspec/config.yaml` (the Exploration rule says the chosen run among three runs of one prompt; the testbed task rule starts from the exploration's complex prompt) and `CLAUDE.md` (the `evals/sketch.sh` line and its paragraph, the Working documents Exploration line, a change-history row). Verify: `openspec validate --all --strict` passes and neither file mentions three sketch prompts.
- [ ] 3.4 At archive time the main spec's Purpose must stop saying "three levels of difficulty": edit the Purpose of `openspec/specs/skill-exploration/spec.md` after the archive merges the delta, in the archive commit. Verify: the Purpose describes three isolated runs of one complex prompt.

## 4. Verification

- [x] 4.1 Run one real exploration end to end on a throwaway complex case (a small artifact type, e.g. a sequence diagram from a described interaction) with `bash evals/sketch.sh <cases-dir>`: three runs, three deliverables under `evals/results/sketch-<run-id>/sketch-complex/with-{1,2,3}/`, one prompt fingerprint, observed effort `xhigh` in each run, each run skill-free. Verify: exit status 0 and the report shows the above; report the cost to the user.
- [x] 4.2 `bash tests/run-structural-tests.sh` and `openspec validate revise-skill-exploration --strict` pass.

## Workflow follow-up

- No visual-reviewer pass and no skill evaluation: the change touches no artifact skill and no shipped file.
- Archive the change with `openspec-archive-change` as the last commit before merge (with task 3.4), then comment on and close issue MrBogomips/eng-artifacts#6.
- Re-run the exploration of issue MrBogomips/eng-artifacts#5 with a single complex case.
