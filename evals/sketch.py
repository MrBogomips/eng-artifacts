#!/usr/bin/env python3
"""Sketch report for the exploration of a new artifact skill (python3, standard library only).

    sketch.py --run-dir evals/results/sketch-<run-id> [--effort <level>]

The run folder holds `aggregate.json`, the output of `claude plugin eval --json` run by
`evals/sketch.sh` on the empty stub plugin. Stage 1 is the collection of `kpi.py`: it copies each
session's trace and deliverables into `<run-dir>/<case>/with-1/` and deletes the temporary folder
the eval tool kept. Stage 2 computes the report from those copies only, so the same records always
give the same `report.json` and `report.md`. Per case: the kept deliverable, whether it exists,
whether the session was skill-free, tokens, time and cost; then the total cost. The report holds no
classification and no decision.

A session is skill-free when its trace shows no call of the Skill tool and its init record does not
offer that tool.

Exit status: 0 when every case has its deliverable and is skill-free, 1 when one has not, 2 when
the tooling failed.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kpi  # noqa: E402  (the collection and the metrics are shared with the evaluation report)

CASES = ("easy", "medium", "complex")
ARM, RUN = "with", 1


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


def case_entry(run_dir, run_id, difficulty, case):
    entry = {"case": difficulty, "name": None, "deliverable": None, "exists": False,
             "skillFree": None, "complete": False}
    if case is None:
        entry["problem"] = "the case did not run"
        return entry
    entry["name"] = case["name"]
    rel = kpi.run_dir_name(case["name"], ARM, RUN)
    trace = os.path.join(run_dir, rel, "trace.jsonl")
    meta_path = os.path.join(run_dir, rel, "meta.json")
    files = kpi.load_json(meta_path).get("files", []) if os.path.isfile(meta_path) else []
    name = deliverable_name(case, files)
    entry["exists"] = name is not None and name in files
    if name is not None:
        entry["deliverable"] = "evals/results/%s/%s/deliverables/%s" % (run_id, rel, name)
    result = kpi.read_result(trace) if os.path.isfile(trace) else None
    runs = (case.get("arms") or {}).get(ARM) or []
    error = runs[0].get("error") if runs else "no run recorded"
    if os.path.isfile(trace):
        offered, called = skill_use(trace)
        entry["skillFree"] = not (offered or called)
    if result is None or error:
        entry["problem"] = error or "no result record in the trace"
        return entry
    entry["complete"] = True
    entry.update(kpi.run_metrics(result, "%s/trace.jsonl" % rel))
    return entry


def compute(run_dir, aggregate, effort):
    run_id = os.path.basename(os.path.normpath(run_dir))
    by_dir = {os.path.basename((c.get("dir") or "").rstrip("/")): c for c in aggregate.get("cases", [])}
    cases = [case_entry(run_dir, run_id, d, by_dir.get(d)) for d in CASES]
    total = kpi.as_num(sum(c.get("costUsd", 0.0) for c in cases), 4)
    plugin = (aggregate.get("suite", {}).get("plugins") or [{}])[0]
    ok = all(c["exists"] and c["skillFree"] is True and c["complete"] for c in cases)
    return {
        "runId": run_id,
        "claudeVersion": aggregate.get("claudeVersion", "unknown"),
        "pluginVersion": plugin.get("version", "unknown"),
        "model": aggregate.get("suite", {}).get("modelOverride") or "default",
        "effort": effort,
        "cases": cases,
        "totalCostUsd": total,
        "ok": ok,
    }


# ----------------------------------------------------------------------------- output

def yes_no(value):
    return {True: "yes", False: "NO", None: "unknown"}[value]


def render_markdown(rep):
    lines = [
        "# Sketch report: %s" % rep["runId"],
        "",
        "- Model: %s; effort: %s; Claude Code: %s; one run per case"
        % (rep["model"], rep["effort"], rep["claudeVersion"]),
        "- Verdict: **%s**" % ("all three sketches delivered and skill-free" if rep["ok"] else "a sketch is missing or not skill-free"),
        "",
        "| Case | Deliverable | Exists | Skill-free | Tokens | Time (s) | Cost (USD) |",
        "|---|---|---|---|---:|---:|---:|",
    ]
    for c in rep["cases"]:
        if c["complete"]:
            figures = "%s | %s | %.4f" % (kpi.fmt_int(c["tokens"]), kpi.fmt_s(c["timeMs"]), c["costUsd"])
        else:
            figures = "n/a | n/a | n/a"
        lines.append("| %s | %s | %s | %s | %s |" % (
            c["case"], "`%s`" % c["deliverable"] if c["deliverable"] else "none",
            yes_no(c["exists"]), yes_no(c["skillFree"]), figures))
    lines += ["", "Total cost: %.4f USD." % rep["totalCostUsd"], ""]
    for c in rep["cases"]:
        if c.get("problem"):
            lines.append("- %s: %s" % (c["case"], c["problem"]))
    if any(c.get("problem") for c in rep["cases"]):
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
