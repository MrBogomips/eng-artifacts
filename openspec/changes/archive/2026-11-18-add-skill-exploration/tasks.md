## 1. Isolation spike

- [x] 1.1 Build a throwaway stub plugin (manifest only, one trivial case writing `hello.html`) in the scratch area and run it with `claude plugin eval <stub> --ablation none --runs 1 --keep-temp --no-publish --trust-plugin --threshold 0 --allow-tools Bash Write Edit --disallow-tools Skill Agent`; inspect the session's init record and trace: no skill available, no plugin but the stub, no `CLAUDE.md` or memory in context, Skill and Agent tools absent, and the deliverable kept in the sealed folder `kpi.py` collects from. Verify each point; if one fails, stop and report it as a blocked task.

## 2. Runner and report

- [x] 2.1 Write `evals/sketch.sh <cases-dir> [--model <id>] [--effort <level>|unpinned] [-j N]` per design D2 and D3: check the three cases exist before running anything, build the stub under `evals/results/sketch-<run-id>/plugin/`, run the eval with the flags of D2, then `python3 -I evals/sketch.py`; header comment as usage, BSD and GNU compatible (no `grep -P`, no `sed -i`, no `((VAR++))` under `set -e`). Verify `bash -n` and the usage text.
- [x] 2.2 Write `evals/sketch.py` per design D4, importing the collection and metrics from `kpi.py` (standard library only), writing `report.json` and `report.md`, exit 0, 1 or 2. Verify on a kept run from 1.1 that the deliverable is copied and the report shows tokens, time, cost and skill-free.
- [x] 2.3 Add `tests/test-sketch.sh` and its fixtures under `tests/fixtures/sketch/` (with a generator script) per design D8; verify `bash tests/run-structural-tests.sh` passes, and that the test fails when `sketch.py` stops flagging a Skill call.

## 3. Harness

- [x] 3.1 `artifacts-orchestrator`: add Phase 0b "Explore" for a new artifact skill (ask the brief and check it names the artifact type and the sources; file the issue with the brief; write the three cases under `_agents_workspace/explore-<slug>/cases/` by the fair-case rules; run `evals/sketch.sh`; open the three deliverables, give a feature inventory of each, ask for the choice and hints without recommending; comment the issue per design D5; pass brief, chosen case, deliverable path, hints and issue to `openspec-propose`), the triage line that sends a change to an existing skill past it, the ownership row, an error-handling row (a sketch missing or not skill-free: run that case once more, then tell the person) and a test scenario. Verify with a grep that Phase 0b, the scenario and the error row are present.
- [x] 3.2 `skill-eval`: a short section "Seeding the testbed from the exploration" (copy the three cases, revise with the hints, add the graders, run the baseline; the sketches never count as baseline). Verify the section names `evals/sketch.sh` and the revision step.
- [x] 3.3 `openspec/config.yaml`: the proposal rule for the Exploration section and the tasks rule for the seeded testbed, per design D7. Verify with `openspec instructions proposal --change add-skill-exploration --json` that the rules appear.
- [x] 3.4 `CLAUDE.md`: Commands (`evals/sketch.sh`), Working documents (exploration cases in `_agents_workspace/explore-<slug>/cases/`, sketch runs in `evals/results/sketch-<run-id>/`), State tree (the new files under `evals/` and `tests/`), and a change-history row. Verify no statement says the proposal is the first step for a new skill.

## 4. Integration

- [x] 4.1 Dry run of the whole phase on a sample brief (for example a small WBS): three sketches produced and kept, the report printed, the three pages open. Nothing is filed or proposed for the sample. Give the person the report and the cost; verify every case is skill-free and has its deliverable.
- [x] 4.2 Run `openspec validate add-skill-exploration --strict` and `bash tests/run-structural-tests.sh`; verify both pass.
- [x] 4.3 Visual-reviewer pass on the plugin's current state (the change touches no artifact, so this checks that nothing shipped moved): verify the verdict is `pass`.

## Workflow follow-up

- No skill evaluation: the change adds no artifact skill.
- Commit on `feature/add-skill-exploration` after the user's go-ahead, comment on issue MrBogomips/eng-artifacts#3.
- Archive the change with the `openspec-archive-change` skill as the last commit before merge.
