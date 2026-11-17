#!/usr/bin/env python3
"""KPI report for a `claude plugin eval` run (python3, standard library only).

    kpi.py --skill <name> --run-dir evals/results/<run-id> [options]

The run folder holds `aggregate.json`, the output of `claude plugin eval --json`. Stage 1 collects
every run: it copies the run's trace, its observed effort and its deliverables into
`<run-dir>/<case>/<arm>-<n>/` and then deletes the temporary folder the eval tool kept. Stage 2
computes the report from those copies only, so the same recorded runs always give the same
`report.json` and `report.md`. No model judges anything.

KPIs, per run, from the final `result` record of the trace:
    time    duration_ms
    tokens  input + cache creation + cache read + output, summed over every model in modelUsage
Also reported: output tokens, cost in US dollars, turns, and the mechanical checks (the graders).

When the evaluation is recorded, a sanitized summary is also written to
`evals/<skill>/runs/<run-id>.json` (no paths, no names): the single source of the documentation.

    kpi.py doc [<skill>] [--check]

renders the Performance section of `skills/<skill>/README.md` and the skills table of the root
README from the adopted evaluations (see `kpidoc.py`).

Exit status: 0 unless the evaluation is `incomplete` (1) or the tooling failed (2).
"""
import argparse
import datetime
import json
import os
import re
import shutil
import stat
import sys
import tempfile
from decimal import ROUND_HALF_UP, Decimal

ARMS = ("without", "with")  # report order: the baseline first
TOKEN_FIELDS = ("inputTokens", "cacheCreationInputTokens", "cacheReadInputTokens", "outputTokens")
RESULT_FIELDS = ("duration_ms", "modelUsage", "total_cost_usd", "num_turns")
DEFAULT_TARGET = 20


class ToolingError(Exception):
    """The evaluation could not be read: a missing file or a trace without an expected field."""


# ----------------------------------------------------------------------------- numbers

def round_half_up(value, places=0):
    q = Decimal(1).scaleb(-places)
    return Decimal(repr(value)).quantize(q, rounding=ROUND_HALF_UP)


def as_int(value):
    return int(round_half_up(value, 0))


def as_num(value, places):
    return float(round_half_up(value, places))


def median(values):
    s = sorted(values)
    n = len(s)
    if n % 2:
        return s[n // 2]
    return (s[n // 2 - 1] + s[n // 2]) / 2


def spread(values, integer=True):
    f = as_int if integer else (lambda v: as_num(v, 4))
    return {"median": f(median(values)), "min": f(min(values)), "max": f(max(values))}


def reduction(base, plugin):
    """Percent reduction of plugin against base, one decimal; None when there is no baseline."""
    if not base:
        return None
    return as_num((base - plugin) * 100.0 / base, 1)


# ----------------------------------------------------------------------------- stage 1: collect

def load_json(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError) as exc:
        raise ToolingError("%s: cannot read: %s" % (path, exc))


def run_dir_name(case, arm, index):
    return "%s/%s-%d" % (case, arm, index)


def temp_root(trace_path):
    """The kept temporary folder of a run, or None when it is gone or not what we expect."""
    if not trace_path:
        return None
    root = os.path.dirname(os.path.dirname(trace_path))
    ok = (os.path.isfile(trace_path) and os.path.isdir(os.path.join(root, "sealed"))
          and os.path.isdir(os.path.join(root, "config")))
    return root if ok else None


def make_readable(root):
    for path in (root, os.path.join(root, "sealed")):
        try:
            os.chmod(path, 0o700)
        except OSError:
            pass


def observed_effort(root):
    """The effort the child session ran at, from its kept transcript; None when it cannot be read."""
    projects = os.path.join(root, "config", "projects")
    found = set()
    if os.path.isdir(projects):
        for dirpath, _dirs, files in os.walk(projects):
            for name in sorted(files):
                if not name.endswith(".jsonl"):
                    continue
                try:
                    with open(os.path.join(dirpath, name), encoding="utf-8") as fh:
                        for line in fh:
                            if '"effort"' not in line:
                                continue
                            try:
                                rec = json.loads(line)
                            except ValueError:
                                continue
                            if rec.get("type") == "assistant" and isinstance(rec.get("effort"), str):
                                found.add(rec["effort"])
                except OSError:
                    continue
    return sorted(found)


def copy_deliverables(root, dest):
    cwd = os.path.join(root, "sealed", "home", "cwd")
    copied = []
    if not os.path.isdir(cwd):
        return copied
    for dirpath, dirnames, filenames in os.walk(cwd):
        dirnames[:] = sorted(d for d in dirnames if not (dirpath == cwd and d == ".claude"))
        for name in sorted(filenames):
            src = os.path.join(dirpath, name)
            if os.path.islink(src):
                continue
            rel = os.path.relpath(src, cwd)
            target = os.path.join(dest, "deliverables", rel)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            shutil.copyfile(src, target)
            copied.append(rel)
    return copied


def remove_tree(root):
    for dirpath, dirnames, filenames in os.walk(root):
        for name in dirnames + filenames:
            p = os.path.join(dirpath, name)
            if not os.path.islink(p):
                try:
                    os.chmod(p, os.stat(p).st_mode | stat.S_IRWXU)
                except OSError:
                    pass
    try:
        os.chmod(root, 0o700)
    except OSError:
        pass
    shutil.rmtree(root, ignore_errors=True)


def collect(run_dir, aggregate, keep_temp):
    """Copy every run's trace, effort and deliverables under run_dir; delete the kept temp folders."""
    for case in aggregate.get("cases", []):
        for arm in ARMS:
            for i, run in enumerate(case.get("arms", {}).get(arm, []), start=1):
                dest = os.path.join(run_dir, run_dir_name(case["name"], arm, i))
                trace_copy = os.path.join(dest, "trace.jsonl")
                root = temp_root(run.get("tracePath"))
                if root is None:
                    continue  # nothing kept (run failed early) or already collected
                os.makedirs(dest, exist_ok=True)
                make_readable(root)
                shutil.copyfile(run["tracePath"], trace_copy)
                meta = {"effort": observed_effort(root), "files": copy_deliverables(root, dest)}
                with open(os.path.join(dest, "meta.json"), "w", encoding="utf-8") as fh:
                    json.dump(meta, fh, indent=2, sort_keys=True)
                    fh.write("\n")
                if not keep_temp:
                    remove_tree(root)


# ----------------------------------------------------------------------------- stage 2: compute

def read_result(trace_path):
    """The final result record of a trace, or None when the run produced none."""
    result = None
    try:
        with open(trace_path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                if isinstance(rec, dict) and rec.get("type") == "result":
                    result = rec
    except OSError:
        return None
    return result


def need(record, field, where):
    if field not in record or record[field] is None:
        raise ToolingError('%s: the result record lacks the field "%s"' % (where, field))
    return record[field]


def run_metrics(result, where):
    for field in RESULT_FIELDS:
        need(result, field, where)
    usage = result["modelUsage"]
    if not isinstance(usage, dict) or not usage:
        raise ToolingError('%s: the field "modelUsage" is empty' % where)
    tokens = output = 0
    for model in sorted(usage):
        for field in TOKEN_FIELDS:
            if field not in usage[model]:
                raise ToolingError('%s: the field "modelUsage.%s.%s" is missing' % (where, model, field))
        tokens += sum(usage[model][f] for f in TOKEN_FIELDS)
        output += usage[model]["outputTokens"]
    return {
        "timeMs": result["duration_ms"],
        "tokens": tokens,
        "outputTokens": output,
        "costUsd": as_num(result["total_cost_usd"], 4),
        "turns": result["num_turns"],
    }


def run_checks(run):
    """Mechanical checks from the graders: {name: bool}, whether the skill fired (with arm), and the
    names of the plugin-fired indicators (with-only graders)."""
    checks, skill, indicators = {}, None, []
    for g in sorted(run.get("graders") or [], key=lambda g: g.get("name", "")):
        checks[g["name"]] = bool(g.get("passed"))
        if g.get("withOnly"):
            indicators.append(g["name"])
            skill = bool(g.get("passed")) if skill is None else (skill and bool(g.get("passed")))
    return checks, skill, indicators


def build_runs(run_dir, aggregate, baseline=False):
    """Per case and arm, the list of run records, sorted by run number."""
    cases = {}
    for case in sorted(aggregate.get("cases", []), key=lambda c: c["name"]):
        arms = {}
        for arm in ARMS:
            runs = []
            for i, run in enumerate(case.get("arms", {}).get(arm, []), start=1):
                rel = run_dir_name(case["name"], arm, i)
                trace = os.path.join(run_dir, rel, "trace.jsonl")
                rec = {"run": i, "path": rel, "complete": False}
                result = read_result(trace) if os.path.isfile(trace) else None
                if result is None or run.get("error"):
                    rec["problem"] = run.get("error") or "no result record in the trace"
                else:
                    rec["complete"] = True
                    rec.update(run_metrics(result, "%s/trace.jsonl" % rel))
                checks, skill, indicators = run_checks(run)
                if baseline:
                    # no skill exists yet: the plugin-fired indicator is not a check of this recording
                    skill, scored = None, {k: v for k, v in checks.items() if k not in indicators}
                    checks = scored
                else:
                    scored = checks
                rec["checks"] = checks
                rec["skillUsed"] = skill if arm == "with" else None
                rec["checksPass"] = all(scored.values()) if scored else None
                meta_path = os.path.join(run_dir, rel, "meta.json")
                rec["effort"] = load_json(meta_path).get("effort", []) if os.path.isfile(meta_path) else []
                rec["files"] = load_json(meta_path).get("files", []) if os.path.isfile(meta_path) else []
                runs.append(rec)
            arms[arm] = runs
        cases[case["name"]] = arms
    return cases


def summarize_arm(runs):
    done = [r for r in runs if r["complete"]]
    out = {"runs": runs}
    if done:
        out["tokens"] = spread([r["tokens"] for r in done])
        out["timeMs"] = spread([r["timeMs"] for r in done])
        out["outputTokens"] = spread([r["outputTokens"] for r in done])
        out["turns"] = spread([r["turns"] for r in done])
        out["costUsd"] = as_num(sum(r["costUsd"] for r in done), 4)
    return out


def compute(run_dir, aggregate, args):
    runs = build_runs(run_dir, aggregate, args.baseline)
    cases = {}
    totals = {a: {"tokens": 0, "timeMs": 0, "costUsd": 0.0} for a in ARMS}
    incomplete, flagged, worse = [], [], []
    efforts = set()
    for name, arms in runs.items():
        entry = {"arms": {a: summarize_arm(arms[a]) for a in ARMS}}
        for a in ARMS:
            for r in arms[a]:
                efforts.update(r["effort"])
                if not r["complete"]:
                    incomplete.append("%s/%s-%d" % (name, a, r["run"]))
                elif a == "with" and (r["skillUsed"] is False or r["checksPass"] is False):
                    why = "skill not used" if r["skillUsed"] is False else "failed checks"
                    flagged.append({"run": "%s/%s-%d" % (name, a, r["run"]), "why": why})
                elif a == "without" and r["checksPass"] is False:
                    flagged.append({"run": "%s/%s-%d" % (name, a, r["run"]), "why": "failed checks"})
        base, plug = entry["arms"]["without"], entry["arms"]["with"]
        if "tokens" in base and "tokens" in plug:
            entry["reduction"] = {
                "tokens": reduction(base["tokens"]["median"], plug["tokens"]["median"]),
                "timeMs": reduction(base["timeMs"]["median"], plug["timeMs"]["median"]),
            }
            for kpi in ("tokens", "timeMs"):
                if not args.baseline and plug[kpi]["median"] > base[kpi]["median"]:
                    worse.append({"case": name, "kpi": kpi})
        for a in ARMS:
            if "tokens" in entry["arms"][a]:
                totals[a]["tokens"] += entry["arms"][a]["tokens"]["median"]
                totals[a]["timeMs"] += entry["arms"][a]["timeMs"]["median"]
            totals[a]["costUsd"] += entry["arms"][a].get("costUsd", 0.0)
        cases[name] = entry
    for a in ARMS:
        totals[a]["costUsd"] = as_num(totals[a]["costUsd"], 4)
    totals_red = {
        "tokens": reduction(totals["without"]["tokens"], totals["with"]["tokens"]),
        "timeMs": reduction(totals["without"]["timeMs"], totals["with"]["timeMs"]),
    }
    cls = classify(totals_red, worse, flagged, incomplete, args)
    plugin = (aggregate.get("suite", {}).get("plugins") or [{}])[0]
    return {
        "skill": args.skill,
        "runId": os.path.basename(os.path.normpath(run_dir)),
        "claudeVersion": aggregate.get("claudeVersion", "unknown"),
        "pluginVersion": plugin.get("version", "unknown"),
        "model": aggregate.get("suite", {}).get("modelOverride") or "default",
        "effort": {"requested": args.effort, "observed": sorted(efforts)},
        "runsPerArm": max([len(arms[a]) for arms in runs.values() for a in ARMS] or [0]),
        "targets": {"tokensPercent": args.target_tokens, "timePercent": args.target_time},
        "baselineOnly": args.baseline,
        "cases": cases,
        "totals": {"arms": totals, "reduction": totals_red,
                   "costUsd": as_num(totals["without"]["costUsd"] + totals["with"]["costUsd"], 4)},
        "classification": cls,
    }


def classify(red, worse, flagged, incomplete, args):
    out = {"label": None, "unmetTargets": [], "worseCases": worse, "flaggedRuns": flagged,
           "incompleteRuns": incomplete}
    if incomplete:
        out["label"] = "incomplete"
        return out
    if args.baseline:
        out["label"] = "baseline"
        return out
    t, m = red["tokens"], red["timeMs"]
    if (t is None or t <= 0) and (m is None or m <= 0):
        out["label"] = "no benefit"
        return out
    if t is None or t < args.target_tokens:
        out["unmetTargets"].append("tokens")
    if m is None or m < args.target_time:
        out["unmetTargets"].append("time")
    plugin_flags = [f for f in flagged if "/with-" in f["run"]]
    if not out["unmetTargets"] and not worse and not plugin_flags:
        out["label"] = "meets target"
    else:
        out["label"] = "below target"
    return out


# ----------------------------------------------------------------------------- output

def fmt_s(ms):
    return "%.1f" % (as_num(ms / 1000.0, 1))


def fmt_int(n):
    return "{:,}".format(n)


def fmt_pct(p):
    return "n/a" if p is None else "%+.1f%%" % -p if p != 0 else "0.0%"


def render_markdown(rep):
    c = rep["classification"]
    eff = rep["effort"]
    effort_line = eff["requested"] if eff["requested"] != "not pinned" else "not pinned"
    if eff["observed"]:
        effort_line += " (observed in the sessions: %s)" % ", ".join(eff["observed"])
    lines = [
        "# Evaluation report: %s" % rep["skill"],
        "",
        "- Run: `%s`" % rep["runId"],
        "- Plugin version: %s; Claude Code: %s" % (rep["pluginVersion"], rep["claudeVersion"]),
        "- Model: %s; effort: %s; runs per arm: %d" % (rep["model"], effort_line, rep["runsPerArm"]),
        "- Targets: tokens at least %s%% lower, time at least %s%% lower, summed over the cases' medians"
        % (rep["targets"]["tokensPercent"], rep["targets"]["timePercent"]),
        "",
        "## Classification: **%s**" % c["label"],
        "",
    ]
    if rep["baselineOnly"]:
        lines += ["Baseline recording, before the skill exists: the plugin arm has no skill, so it is a second sample of the baseline (its spread against the first is the measurement noise) and is not classified.", ""]
    for key, title in (("unmetTargets", "Unmet targets"), ("incompleteRuns", "Incomplete runs")):
        if c[key]:
            lines.append("- %s: %s" % (title, ", ".join(c[key])))
    if c["worseCases"]:
        lines.append("- Worse with the plugin: " + ", ".join("%s (%s)" % (w["case"], w["kpi"]) for w in c["worseCases"]))
    if c["flaggedRuns"]:
        lines.append("- Flagged runs: " + ", ".join("%s (%s)" % (f["run"], f["why"]) for f in c["flaggedRuns"]))
    lines += ["", "## Totals (sum over cases of each arm's median)", "",
              "| KPI | without | with | change |", "|---|---:|---:|---:|"]
    tot = rep["totals"]
    a = tot["arms"]
    lines.append("| Tokens | %s | %s | %s |" % (fmt_int(a["without"]["tokens"]), fmt_int(a["with"]["tokens"]), fmt_pct(tot["reduction"]["tokens"])))
    lines.append("| Time (s) | %s | %s | %s |" % (fmt_s(a["without"]["timeMs"]), fmt_s(a["with"]["timeMs"]), fmt_pct(tot["reduction"]["timeMs"])))
    lines.append("| Cost (USD) | %.4f | %.4f | total %.4f |" % (a["without"]["costUsd"], a["with"]["costUsd"], tot["costUsd"]))
    lines += ["", "## Per case", ""]
    for name, entry in rep["cases"].items():
        lines += ["### %s" % name, "",
                  "| Arm | Tokens median (min-max) | Time s median (min-max) | Output tokens median | Turns median | Cost USD | Checks passed |",
                  "|---|---:|---:|---:|---:|---:|---:|"]
        for arm in ARMS:
            s = entry["arms"][arm]
            runs = s["runs"]
            passed = sum(1 for r in runs if r["checksPass"] is not False and r["complete"])
            if "tokens" not in s:
                lines.append("| %s | no complete run | | | | | %d/%d |" % (arm_label(arm, rep), passed, len(runs)))
                continue
            lines.append("| %s | %s (%s-%s) | %s (%s-%s) | %s | %s | %.4f | %d/%d |" % (
                arm_label(arm, rep), fmt_int(s["tokens"]["median"]), fmt_int(s["tokens"]["min"]), fmt_int(s["tokens"]["max"]),
                fmt_s(s["timeMs"]["median"]), fmt_s(s["timeMs"]["min"]), fmt_s(s["timeMs"]["max"]),
                fmt_int(s["outputTokens"]["median"]), "%g" % s["turns"]["median"], s["costUsd"], passed, len(runs)))
        if "reduction" in entry:
            r = entry["reduction"]
            lines += ["", "Change with the plugin: tokens %s, time %s" % (fmt_pct(r["tokens"]), fmt_pct(r["timeMs"]))]
        lines.append("")
    lines += ["## Mechanical checks per run", "", "| Run | Complete | Checks | Skill used |", "|---|---|---|---|"]
    for name, entry in rep["cases"].items():
        for arm in ARMS:
            for r in entry["arms"][arm]["runs"]:
                chk = ", ".join("%s %s" % (k, "ok" if v else "FAIL") for k, v in sorted(r["checks"].items())) or "none"
                su = {True: "yes", False: "NO", None: "n/a"}[r["skillUsed"]]
                lines.append("| %s | %s | %s | %s |" % (r["path"], "yes" if r["complete"] else "NO", chk, su))
    lines += ["", "## Deliverables to review", "",
              "Kept under `evals/results/%s/`, one folder per run (open and compare both arms):" % rep["runId"], ""]
    for name, entry in rep["cases"].items():
        for arm in ARMS:
            for r in entry["arms"][arm]["runs"]:
                files = ", ".join(r["files"]) if r["files"] else "no files"
                lines.append("- `%s/deliverables/`: %s" % (r["path"], files))
    lines.append("")
    return "\n".join(lines)


def arm_label(arm, rep):
    return "with (no skill yet)" if rep["baselineOnly"] and arm == "with" else arm


def results_entry(rep, date):
    c = rep["classification"]
    eff = rep["effort"]
    effort = eff["requested"]
    if eff["observed"]:
        effort += " (observed: %s)" % ", ".join(eff["observed"])
    kind = "baseline, before the skill exists" if rep["baselineOnly"] else "evaluation"
    t = rep["totals"]
    a = t["arms"]
    lines = [
        "## %s: %s" % (date, kind),
        "",
        "- Plugin version: %s" % rep["pluginVersion"],
        "- Model: %s; effort: %s; Claude Code: %s; runs per arm: %d"
        % (rep["model"], effort, rep["claudeVersion"], rep["runsPerArm"]),
        "- Targets: tokens at least %s%% lower, time at least %s%% lower"
        % (rep["targets"]["tokensPercent"], rep["targets"]["timePercent"]),
        "- Classification: **%s**" % c["label"],
    ]
    if c["unmetTargets"]:
        lines.append("- Unmet targets: " + ", ".join(c["unmetTargets"]))
    if c["worseCases"]:
        lines.append("- Worse with the plugin: " + ", ".join("%s (%s)" % (w["case"], w["kpi"]) for w in c["worseCases"]))
    if c["flaggedRuns"]:
        lines.append("- Flagged runs: " + ", ".join("%s (%s)" % (f["run"], f["why"]) for f in c["flaggedRuns"]))
    if c["incompleteRuns"]:
        lines.append("- Incomplete runs: " + ", ".join(c["incompleteRuns"]))
    lines += ["", "| Case | Arm | Tokens median (min-max) | Time s median (min-max) | Cost USD |",
              "|---|---|---:|---:|---:|"]
    for name, entry in rep["cases"].items():
        for arm in ARMS:
            s = entry["arms"][arm]
            if "tokens" not in s:
                lines.append("| %s | %s | no complete run | | |" % (name, arm))
                continue
            lines.append("| %s | %s | %s (%s-%s) | %s (%s-%s) | %.4f |" % (
                name, arm_label(arm, rep), fmt_int(s["tokens"]["median"]), fmt_int(s["tokens"]["min"]), fmt_int(s["tokens"]["max"]),
                fmt_s(s["timeMs"]["median"]), fmt_s(s["timeMs"]["min"]), fmt_s(s["timeMs"]["max"]), s["costUsd"]))
    lines += [
        "| **Total (sum of medians)** | without | %s | %s | %.4f |" % (fmt_int(a["without"]["tokens"]), fmt_s(a["without"]["timeMs"]), a["without"]["costUsd"]),
        "| **Total (sum of medians)** | %s | %s | %s | %.4f |" % (arm_label("with", rep), fmt_int(a["with"]["tokens"]), fmt_s(a["with"]["timeMs"]), a["with"]["costUsd"]),
        "",
        "Change with the plugin: tokens %s, time %s. Total cost of the evaluation: %.4f USD."
        % (fmt_pct(t["reduction"]["tokens"]), fmt_pct(t["reduction"]["timeMs"]), t["costUsd"]),
        "",
        "Deliverables: `evals/results/%s/` (ignored by git; one folder per case, arm and run)." % rep["runId"],
        "",
        "Decision: pending",
        "",
        "<!-- Fill the decision line with `adopt`, `rework` or `reject` and the reason, after comparing the deliverables of both arms. -->",
        "",
    ]
    return "\n".join(lines)


def write_text(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def append_results(path, entry, skill):
    header = "# Evaluation results: %s\n\nOne entry per evaluation, newest last. Summaries only: raw runs and kept deliverables stay in the ignored `evals/results/` folder.\n\n" % skill
    existing = ""
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as fh:
            existing = fh.read()
    if not existing:
        existing = header
    if not existing.endswith("\n"):
        existing += "\n"
    write_text(path, existing + entry)


# ----------------------------------------------------------------------------- summary

PATH_PATTERN = re.compile(r"(/Users/|/home/|/private/|/tmp/|/var/|[A-Za-z]:\\\\)")


def arm_summary(arm):
    """The shareable figures of one arm: the spreads, and the cost per run."""
    out = {"runs": len(arm["runs"])}
    if "tokens" not in arm:
        return out
    done = [r for r in arm["runs"] if r["complete"]]
    out["tokens"] = arm["tokens"]
    out["timeMs"] = arm["timeMs"]
    out["costPerRunUsd"] = spread([r["costUsd"] for r in done], integer=False)
    return out


def summary_of(rep, date):
    """The sanitized, machine-readable summary of an evaluation: figures only, no paths or names."""
    cases, totals = {}, {a: {"tokens": 0, "timeMs": 0, "costPerRunUsd": 0.0} for a in ARMS}
    for name, entry in rep["cases"].items():
        arms = {a: arm_summary(entry["arms"][a]) for a in ARMS}
        cases[name] = {"arms": arms}
        if all("tokens" in arms[a] for a in ARMS):
            b, p = arms["without"], arms["with"]
            cases[name]["reduction"] = {
                "tokens": reduction(b["tokens"]["median"], p["tokens"]["median"]),
                "timeMs": reduction(b["timeMs"]["median"], p["timeMs"]["median"]),
                "costUsd": reduction(b["costPerRunUsd"]["median"], p["costPerRunUsd"]["median"]),
            }
            for a in ARMS:
                totals[a]["tokens"] += arms[a]["tokens"]["median"]
                totals[a]["timeMs"] += arms[a]["timeMs"]["median"]
                totals[a]["costPerRunUsd"] += arms[a]["costPerRunUsd"]["median"]
    for a in ARMS:
        totals[a]["costPerRunUsd"] = as_num(totals[a]["costPerRunUsd"], 4)
    b, p = totals["without"], totals["with"]
    cls = rep["classification"]
    return {
        "format": 1,
        "skill": rep["skill"],
        "runId": rep["runId"],
        "date": date,
        "pluginVersion": rep["pluginVersion"],
        "claudeVersion": rep["claudeVersion"],
        "model": rep["model"],
        "effort": rep["effort"],
        "runsPerArm": rep["runsPerArm"],
        "targets": rep["targets"],
        "baselineOnly": rep["baselineOnly"],
        "classification": {k: cls[k] for k in ("label", "unmetTargets", "worseCases", "flaggedRuns", "incompleteRuns")},
        "cases": cases,
        "totals": {
            "arms": totals,
            "reduction": {
                "tokens": reduction(b["tokens"], p["tokens"]),
                "timeMs": reduction(b["timeMs"], p["timeMs"]),
                "costUsd": reduction(b["costPerRunUsd"], p["costPerRunUsd"]),
            },
        },
        "evaluationCostUsd": rep["totals"]["costUsd"],
    }


def write_summary(path, summary):
    text = json.dumps(summary, indent=2, sort_keys=True) + "\n"
    found = PATH_PATTERN.search(text)
    if found:
        raise ToolingError("the summary would hold an absolute path (%r); not written" % found.group(0))
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    write_text(path, text)


# ----------------------------------------------------------------------------- main

def parse_args(argv):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--skill", required=True)
    p.add_argument("--run-dir", required=True)
    p.add_argument("--effort", default="not pinned", help='requested effort level, or "not pinned"')
    p.add_argument("--target-tokens", type=float, default=DEFAULT_TARGET)
    p.add_argument("--target-time", type=float, default=DEFAULT_TARGET)
    p.add_argument("--baseline", action="store_true", help="record a baseline: the plugin arm is not classified")
    p.add_argument("--results-file", help="RESULTS.md to append to (default evals/<skill>/RESULTS.md)")
    p.add_argument("--no-record", action="store_true", help="do not append to RESULTS.md")
    p.add_argument("--date", help="date of the RESULTS.md entry (default: today)")
    p.add_argument("--summary-file", help="write the sanitized summary here (default when recording: runs/<run-id>.json beside RESULTS.md)")
    p.add_argument("--keep-temp", action="store_true", help="do not delete the kept temporary folders")
    return p.parse_args(argv)


def main(argv):
    if argv[:1] == ["doc"]:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import kpidoc
        return kpidoc.main(argv[1:])
    args = parse_args(argv)
    if args.target_tokens < DEFAULT_TARGET or args.target_time < DEFAULT_TARGET:
        print("kpi.py: a target may be stricter than the default (%d%%), never looser" % DEFAULT_TARGET,
              file=sys.stderr)
        return 2
    run_dir = args.run_dir
    try:
        aggregate = load_json(os.path.join(run_dir, "aggregate.json"))
        collect(run_dir, aggregate, args.keep_temp)
        rep = compute(run_dir, aggregate, args)
    except ToolingError as exc:
        print("kpi.py: %s" % exc, file=sys.stderr)
        return 2
    write_text(os.path.join(run_dir, "report.json"), json.dumps(rep, indent=2, sort_keys=True) + "\n")
    md = render_markdown(rep)
    write_text(os.path.join(run_dir, "report.md"), md)
    sys.stdout.write(md)
    date = args.date or datetime.date.today().isoformat()
    here = os.path.dirname(os.path.abspath(__file__))
    results = args.results_file or os.path.join(here, args.skill, "RESULTS.md")
    summary_path = args.summary_file
    if not args.no_record:
        os.makedirs(os.path.dirname(results), exist_ok=True)
        append_results(results, results_entry(rep, date), args.skill)
        summary_path = summary_path or os.path.join(os.path.dirname(results), "runs", rep["runId"] + ".json")
    if summary_path:
        try:
            write_summary(summary_path, summary_of(rep, date))
        except ToolingError as exc:
            print("kpi.py: %s" % exc, file=sys.stderr)
            return 2
    return 1 if rep["classification"]["label"] == "incomplete" else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
