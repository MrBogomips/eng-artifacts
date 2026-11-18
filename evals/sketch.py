#!/usr/bin/env python3
"""Sketch report for the exploration of a new artifact skill (python3, standard library only).

    sketch.py --run-dir evals/results/sketch-<run-id> [--effort <level>]

The run folder holds `aggregate.json`, the output of `claude plugin eval --json` run by
`evals/sketch.sh` on the empty stub plugin: one complex case, run three times with the identical
prompt. Stage 1 is the collection of `kpi.py`: it copies each session's trace and deliverables into
`<run-dir>/sketch-complex/with-<n>/` and deletes the temporary folder the eval tool kept. Stage 2
computes the report from those copies only, so the same records always give the same `report.json`
and `report.md`. Per run: the kept deliverable, whether it exists, whether the session was
skill-free, the effort the session observed, tokens, time and cost; then the total cost and the
fingerprint (SHA-256) of the prompt the three runs shared, read from the stub copy of the case in
`<run-dir>/plugin/evals/complex/prompt.md`. The report holds no classification and no decision.

A session is skill-free when its trace shows no call of the Skill tool and its init record does not
offer that tool. A run that was not recorded is reported as missing, with the reason.

Exit status: 0 when the three runs have their deliverable and are skill-free, 1 when one has not,
2 when the tooling failed.
"""
import argparse
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kpi  # noqa: E402  (the collection and the metrics are shared with the evaluation report)

CASE = "complex"
ARM = "with"
RUNS = 3  # the number of runs of the complex case the exploration expects


# ----------------------------------------------------------------------------- stage 2: compute

def skill_use(trace_path):
    """(init offered the Skill tool, trace shows a Skill call) for a trace; (False, False) if unreadable."""
    offered = called = False
    try:
        with open(trace_path, encoding="utf-8") as fh:
            for line in fh:
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                if not isinstance(rec, dict):
                    continue
                if rec.get("type") == "system" and rec.get("subtype") == "init":
                    offered = offered or "Skill" in (rec.get("tools") or [])
                elif rec.get("type") == "assistant":
                    content = (rec.get("message") or {}).get("content")
                    for item in content if isinstance(content, list) else []:
                        if isinstance(item, dict) and item.get("type") == "tool_use" and item.get("name") == "Skill":
                            called = True
    except OSError:
        pass
    return offered, called


def deliverable_name(case, files):
    """The file the case's file_exists grader names; else the first HTML file the session left."""
    for grader in case.get("graders") or []:
        if grader.get("type") == "file_exists" and (grader.get("config") or {}).get("path"):
            return grader["config"]["path"]
    html = [f for f in files if f.endswith(".html")]
    return html[0] if html else None


def run_entry(run_dir, run_id, case, index, run):
    """One row of the report: run number `index` (1-based) of the complex case; `run` is its record or None."""
    entry = {"run": index, "deliverable": None, "exists": False, "skillFree": None,
             "complete": False, "observedEffort": None}
    if run is None:
        entry["problem"] = "the run did not run"
        return entry
    rel = kpi.run_dir_name(case["name"], ARM, index)
    trace = os.path.join(run_dir, rel, "trace.jsonl")
    meta_path = os.path.join(run_dir, rel, "meta.json")
    meta = kpi.load_json(meta_path) if os.path.isfile(meta_path) else {}
    files = meta.get("files", [])
    entry["observedEffort"] = meta.get("effort") if isinstance(meta.get("effort"), list) else None
    name = deliverable_name(case, files)
    entry["exists"] = name is not None and name in files
    if name is not None:
        entry["deliverable"] = "evals/results/%s/%s/deliverables/%s" % (run_id, rel, name)
    result = kpi.read_result(trace) if os.path.isfile(trace) else None
    if os.path.isfile(trace):
        offered, called = skill_use(trace)
        entry["skillFree"] = not (offered or called)
    if result is None or run.get("error"):
        entry["problem"] = run.get("error") or "no result record in the trace"
        return entry
    entry["complete"] = True
    entry.update(kpi.run_metrics(result, "%s/trace.jsonl" % rel))
    return entry


def prompt_fingerprint(run_dir):
    """SHA-256 of the stub copy of the complex prompt, or None when the run folder holds none."""
    path = os.path.join(run_dir, "plugin", "evals", CASE, "prompt.md")
    try:
        with open(path, "rb") as fh:
            return hashlib.sha256(fh.read()).hexdigest()
    except OSError:
        return None


def compute(run_dir, aggregate, effort):
    run_id = os.path.basename(os.path.normpath(run_dir))
    by_dir = {os.path.basename((c.get("dir") or "").rstrip("/")): c for c in aggregate.get("cases", [])}
    case = by_dir.get(CASE)
    recorded = ((case or {}).get("arms") or {}).get(ARM) or []
    rows = [run_entry(run_dir, run_id, case, i, recorded[i - 1] if i <= len(recorded) else None)
            for i in range(1, max(RUNS, len(recorded)) + 1)]
    total = kpi.as_num(sum(r.get("costUsd", 0.0) for r in rows), 4)
    plugin = (aggregate.get("suite", {}).get("plugins") or [{}])[0]
    sha = prompt_fingerprint(run_dir)
    ok = sha is not None and all(r["exists"] and r["skillFree"] is True and r["complete"] for r in rows)
    return {
        "runId": run_id,
        "claudeVersion": aggregate.get("claudeVersion", "unknown"),
        "pluginVersion": plugin.get("version", "unknown"),
        "model": aggregate.get("suite", {}).get("modelOverride") or "default",
        "effort": effort,
        "promptSha256": sha,
        "runs": rows,
        "totalCostUsd": total,
        "ok": ok,
    }


# ----------------------------------------------------------------------------- output

def yes_no(value):
    return {True: "yes", False: "NO", None: "unknown"}[value]


def render_markdown(rep):
    sha = rep["promptSha256"]
    lines = [
        "# Sketch report: %s" % rep["runId"],
        "",
        "- Model: %s; effort: %s; Claude Code: %s; %d runs of the complex case"
        % (rep["model"], rep["effort"], rep["claudeVersion"], len(rep["runs"])),
        "- Prompt fingerprint (SHA-256, first 12 digits), the same for every run: %s"
        % ("`%s`" % sha[:12] if sha else "unknown (no prompt.md in the run folder)"),
        "- Verdict: **%s**" % ("all runs delivered and skill-free" if rep["ok"] else "a run is missing or not skill-free, or the prompt is unknown"),
        "",
        "| Run | Deliverable | Exists | Skill-free | Effort observed | Tokens | Time (s) | Cost (USD) |",
        "|---|---|---|---|---|---:|---:|---:|",
    ]
    for r in rep["runs"]:
        if r["complete"]:
            figures = "%s | %s | %.4f" % (kpi.fmt_int(r["tokens"]), kpi.fmt_s(r["timeMs"]), r["costUsd"])
        else:
            figures = "n/a | n/a | n/a"
        observed = "/".join(r["observedEffort"]) if r["observedEffort"] else "unknown"
        lines.append("| run %d | %s | %s | %s | %s | %s |" % (
            r["run"], "`%s`" % r["deliverable"] if r["deliverable"] else "none",
            yes_no(r["exists"]), yes_no(r["skillFree"]), observed, figures))
    lines += ["", "Total cost: %.4f USD." % rep["totalCostUsd"], ""]
    for r in rep["runs"]:
        if r.get("problem"):
            lines.append("- run %d: %s" % (r["run"], r["problem"]))
    if any(r.get("problem") for r in rep["runs"]):
        lines.append("")
    return "\n".join(lines)


def main(argv):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--run-dir", required=True)
    p.add_argument("--effort", default="not pinned", help='requested effort level, or "not pinned"')
    args = p.parse_args(argv)
    try:
        aggregate = kpi.load_json(os.path.join(args.run_dir, "aggregate.json"))
        kpi.collect(args.run_dir, aggregate, keep_temp=False)
        rep = compute(args.run_dir, aggregate, args.effort)
    except kpi.ToolingError as exc:
        print("sketch.py: %s" % exc, file=sys.stderr)
        return 2
    kpi.write_text(os.path.join(args.run_dir, "report.json"), json.dumps(rep, indent=2, sort_keys=True) + "\n")
    md = render_markdown(rep)
    kpi.write_text(os.path.join(args.run_dir, "report.md"), md)
    sys.stdout.write(md)
    return 0 if rep["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
