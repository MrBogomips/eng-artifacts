# Phase 3b: evaluate (orchestrator)

Read when Phase 3b starts, together with `.claude/skills/skill-eval/SKILL.md`. The entry conditions and the routing of the decision are in `SKILL.md`.

Ask for no cost confirmation: the user decided evaluations are not capped, and the cost is reported.

1. Run `bash evals/run.sh <skill>`, with `--target-tokens` and `--target-time` when the proposal sets stricter targets. It prints the report and appends a `Decision: pending` entry to `evals/<skill>/RESULTS.md`. Never publish a report.
2. Give the user the report (classification, KPI table, cost, flagged runs) and the paths of both arms' kept deliverables to compare, with what you saw in them.
3. Ask for the decision and record it, with the user's reason, on the `Decision:` line of that entry in `RESULTS.md`; then route by it as Phase 3b in `SKILL.md` says (`adopt`, `rework`, `reject`).
4. An `incomplete` report is run once more; if it is still `incomplete`, tell the user which runs failed.

Nothing here is a new agent: the numbers come from the script and the judgement from the user. A decision is never inferred from the classification.
