"""Documentation generator for the adopted skills (python3, standard library only).

    python3 evals/kpi.py doc [<skill>] [--check] [--root <dir>]

For every skill whose newest adopted evaluation is in `evals/<skill>/RESULTS.md`, it renders, from that
evaluation's summary `evals/<skill>/runs/<run-id>.json` and with a fixed template:

  - the Performance section of `skills/<skill>/README.md`, between the markers
    `<!-- performance:start -->` and `<!-- performance:end -->`;
  - the skills table of the root `README.md`, between `<!-- skills:start -->` and `<!-- skills:end -->`,
    one row per adopted skill sorted by name. The capability summary of a row is the `summary:` line
    in the front block of the skill's README.

The adopted evaluation is the newest entry of RESULTS.md whose `Decision:` line starts with `adopt`:
a baseline (`Decision: n/a`), a pending, `rework` or `reject` entry never counts. Nothing is computed
from the Markdown tables; the figures come from the JSON the evaluation wrote.

A derived skill is not evaluated: its newest adopted entry is a validation, whose decision starts with
`adopt (validated, not measured` and which carries `Plugin version:`, `Anchor:` (a skill that itself has
an adopted entry) and `Sample:` lines. It needs no run and no summary JSON. Its Performance section is a
fixed "Not measured" paragraph naming the anchor, and its row in the root table reads "not measured" for
tokens and time, with the validation date and the anchor.

Without `--check` the blocks are written (only when they differ). With `--check` nothing is written;
the exit status is 1 and the file is named when a block is missing or differs from what would be
generated. Exit status 2 means the inputs could not be read.
"""
import argparse
import json
import os
import re
import sys
from decimal import ROUND_HALF_UP, Decimal

DIFFICULTY = ("easy", "medium", "complex")
PERF_MARKERS = ("<!-- performance:start -->", "<!-- performance:end -->")
SKILLS_MARKERS = ("<!-- skills:start -->", "<!-- skills:end -->")
VALIDATED_PREFIX = "adopt (validated, not measured"
SKILLS_HEADER = ("| Skill | What it produces | Tokens | Time | Evaluated |\n"
                 "|---|---|---:|---:|---|")


class DocError(Exception):
    """An input is missing or unreadable; the message names it."""


# ----------------------------------------------------------------------------- formatting

def quant(value, places):
    q = Decimal(1).scaleb(-places)
    return Decimal(repr(value)).quantize(q, rounding=ROUND_HALF_UP)


def fmt_int(n):
    return "{:,}".format(int(quant(n, 0)))


def fmt_seconds(ms):
    return "%s s" % (Decimal(repr(ms)) / Decimal(1000)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def fmt_usd(x):
    return "$%s" % quant(x, 2)


def fmt_change(reduction):
    """Change with the plugin from a percent reduction: -59.0% when it saves, +1.8% when it costs."""
    if reduction is None:
        return "n/a"
    if reduction == 0:
        return "0.0%"
    return "%+.1f%%" % -reduction


def phrase(reduction, less, more):
    if reduction is None:
        return "no comparison for %s" % less
    if reduction > 0:
        return "%.1f%% %s" % (reduction, less)
    if reduction < 0:
        return "%.1f%% %s" % (-reduction, more)
    return "the same %s" % less.split(" ", 1)[-1]


def pair(without, with_, fmt, change):
    return "%s → %s (%s)" % (fmt(without), fmt(with_), fmt_change(change))


# ----------------------------------------------------------------------------- inputs

def read_text(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except OSError as exc:
        raise DocError("%s: cannot read: %s" % (path, exc))


def adopted_entry(results_path):
    """The newest RESULTS.md entry whose decision is `adopt`, or None. Entries are `## <date>: ...`.

    An evaluation entry carries its `runId`; a validation entry (a derived skill, decision starting with
    VALIDATED_PREFIX) carries `validation: True`, its `anchor`, `sample` and `version` instead of a run."""
    text = read_text(results_path)
    entries, current = [], None
    for line in text.splitlines():
        head = re.match(r"^## (\d{4}-\d{2}-\d{2}):", line)
        if head:
            current = {"date": head.group(1), "decision": None, "runId": None,
                       "anchor": None, "sample": None, "version": None}
            entries.append(current)
            continue
        if current is None:
            continue
        decision = re.match(r"^Decision:\s*(.*)$", line)
        if decision and current["decision"] is None:
            current["decision"] = decision.group(1).strip()
        run = re.match(r"^Deliverables: `evals/results/([0-9A-Za-z_-]+)/`", line)
        if run:
            current["runId"] = run.group(1)
        for key, label in (("anchor", "Anchor"), ("sample", "Sample"), ("version", "Plugin version")):
            field = re.match(r"^- %s:\s*`?([^`\s]+)`?\s*$" % label, line)
            if field and current[key] is None:
                current[key] = field.group(1)
    adopted = [e for e in entries if e["decision"] and re.match(r"(?i)adopt\b", e["decision"])]
    if not adopted:
        return None
    entry = adopted[-1]
    entry["validation"] = entry["decision"].startswith(VALIDATED_PREFIX)
    if entry["validation"]:
        for key, label in (("anchor", "Anchor"), ("version", "Plugin version")):
            if not entry[key]:
                raise DocError("%s: the validation entry of %s has no `- %s:` line" % (results_path, entry["date"], label))
    elif not entry["runId"]:
        raise DocError("%s: the adopted entry of %s names no evaluation run (Deliverables line)"
                       % (results_path, entry["date"]))
    when = re.search(r"\((\d{4}-\d{2}-\d{2})\)", entry["decision"])
    entry["decisionDate"] = when.group(1) if when else entry["date"]
    return entry


def load_summary(path):
    try:
        with open(path, encoding="utf-8") as fh:
            summary = json.load(fh)
    except (OSError, ValueError) as exc:
        raise DocError("%s: cannot read the evaluation summary: %s" % (path, exc))
    if summary.get("baselineOnly") or summary.get("classification", {}).get("label") == "incomplete":
        raise DocError("%s: not a complete evaluation of the skill" % path)
    return summary


def front_summary(readme_path):
    """The `summary:` line of the README's front block (between the first two `---` lines)."""
    lines = read_text(readme_path).splitlines()
    if not lines or lines[0].strip() != "---":
        raise DocError("%s: no front block (a README starting with `---`, a `summary:` line, `---`)" % readme_path)
    for line in lines[1:]:
        if line.strip() == "---":
            break
        m = re.match(r"^summary:\s*(.*?)\s*$", line)
        if m:
            value = m.group(1)
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            if value:
                return value
    raise DocError("%s: the front block has no `summary:` line" % readme_path)


# ----------------------------------------------------------------------------- templates

def case_order(name):
    tail = name.rsplit("-", 1)[-1]
    return (DIFFICULTY.index(tail) if tail in DIFFICULTY else len(DIFFICULTY), name)


def case_label(skill, name):
    prefix = skill + "-"
    return name[len(prefix):] if name.startswith(prefix) else name


def effort_text(effort):
    text = effort["requested"]
    if text == "not pinned" and effort["observed"]:
        text += " (observed %s)" % ", ".join(effort["observed"])
    return text


def render_performance(summary, decision):
    totals, red = summary["totals"]["arms"], summary["totals"]["reduction"]
    cls = summary["classification"]
    rows = []
    for name in sorted(summary["cases"], key=case_order):
        entry = summary["cases"][name]
        b, w, r = entry["arms"]["without"], entry["arms"]["with"], entry["reduction"]
        rows.append("| %s | %s | %s | %s |" % (
            case_label(summary["skill"], name),
            pair(b["tokens"]["median"], w["tokens"]["median"], fmt_int, r["tokens"]),
            pair(b["timeMs"]["median"], w["timeMs"]["median"], fmt_seconds, r["timeMs"]),
            pair(b["costPerRunUsd"]["median"], w["costPerRunUsd"]["median"], fmt_usd, r["costUsd"])))
    tb, tw = totals["without"], totals["with"]
    rows.append("| **Total** | %s | %s | %s |" % (
        pair(tb["tokens"], tw["tokens"], fmt_int, red["tokens"]),
        pair(tb["timeMs"], tw["timeMs"], fmt_seconds, red["timeMs"]),
        pair(tb["costPerRunUsd"], tw["costPerRunUsd"], fmt_usd, red["costUsd"])))
    result = cls["label"]
    if cls["unmetTargets"]:
        result += " (unmet: %s)" % ", ".join(cls["unmetTargets"])
    if cls["worseCases"]:
        result += "; worse: " + ", ".join("%s %s" % (case_label(summary["skill"], w_["case"]), w_["kpi"].replace("timeMs", "time"))
                                          for w_ in cls["worseCases"])
    tg = summary["targets"]
    lines = [
        PERF_MARKERS[0],
        "## Performance",
        "",
        "With the plugin, the same prompts took %s, %s and %s than without it (medians of %d runs per arm, summed over %d cases)." % (
            phrase(red["tokens"], "fewer tokens", "more tokens"),
            phrase(red["timeMs"], "less time", "more time"),
            phrase(red["costUsd"], "less cost", "more cost"),
            summary["runsPerArm"], len(summary["cases"])),
        "",
        "| Case | Tokens (without → with) | Time (without → with) | Cost per run (without → with) |",
        "|---|---:|---:|---:|",
    ] + rows + [
        "",
        "Tokens count input, cache and output over every model of the session; time is wall-clock; cost is in USD. Each case shows the median of its runs; the total adds the medians of the cases.",
        "",
        "- **Evaluated:** %s, plugin %s, model %s, effort %s, %d runs per arm." % (
            summary["date"], summary["pluginVersion"], summary["model"], effort_text(summary["effort"]), summary["runsPerArm"]),
        "- **Result:** %s; goal: at least %.1f%% fewer tokens and %.1f%% less time. **Decision:** adopt (%s)." % (
            result, tg["tokensPercent"], tg["timePercent"], decision["decisionDate"]),
        PERF_MARKERS[1],
    ]
    return "\n".join(lines)


def render_validated(skill, item):
    """The Performance section of a derived skill validated on a sample page, not measured."""
    entry = item["decision"]
    return "\n".join([
        PERF_MARKERS[0],
        "## Performance",
        "",
        "Not measured. This skill is derived from [`%s`](../%s/README.md): it reuses that skill's renderer, "
        "layout and model conventions, whose measured performance is on its page. A person validated a sample "
        "page on %s (plugin %s). **Decision:** adopt (validated, not measured)." % (
            entry["anchor"], entry["anchor"], entry["decisionDate"], entry["version"]),
        PERF_MARKERS[1],
    ])


NOT_MEASURED_NOTE = ('A row reading "not measured" is a derived skill: it reuses the renderer of the skill named in its '
                     'last column, whose figures are on that skill\'s page, and a person validated a sample page of it.')


def render_row(r):
    if r.get("validated"):
        return "| [`%s`](skills/%s/README.md) | %s | not measured | not measured | %s, derived from [`%s`](skills/%s/README.md) |" % (
            r["skill"], r["skill"], r["summary"], r["date"], r["anchor"], r["anchor"])
    return "| [`%s`](skills/%s/README.md) | %s | %s | %s | %s |" % (
        r["skill"], r["skill"], r["summary"],
        fmt_change(r["red"]["tokens"]), fmt_change(r["red"]["timeMs"]), r["date"])


def render_skills(rows):
    if not rows:
        body = "No skill has an adopted evaluation yet."
    else:
        body = SKILLS_HEADER + "\n" + "\n".join(render_row(r) for r in rows)
        if any(r.get("validated") for r in rows):
            body += "\n\n" + NOT_MEASURED_NOTE
    return "\n".join([SKILLS_MARKERS[0], body, SKILLS_MARKERS[1]])


# ----------------------------------------------------------------------------- files

def replace_block(path, text, markers, block):
    """The file's text with the block between the markers replaced; raises DocError without markers."""
    start, end = markers
    if text.count(start) != 1 or text.count(end) != 1 or text.index(start) > text.index(end):
        raise DocError("%s: needs exactly one pair of markers %s ... %s, in that order" % (path, start, end))
    i, j = text.index(start), text.index(end) + len(end)
    return text[:i] + block + text[j:]


def skills_with_results(root):
    evals = os.path.join(root, "evals")
    if not os.path.isdir(evals):
        raise DocError("%s: no evals folder" % evals)
    return sorted(d for d in os.listdir(evals)
                  if d != "results" and os.path.isfile(os.path.join(evals, d, "RESULTS.md")))


def collect(root):
    """For each skill with an adopted evaluation or validation: its summary (none for a validation),
    decision and README path. The anchor of a validation must itself be in the result."""
    found = {}
    for skill in skills_with_results(root):
        results = os.path.join(root, "evals", skill, "RESULTS.md")
        entry = adopted_entry(results)
        if entry is None:
            continue
        summary = None if entry["validation"] else load_summary(
            os.path.join(root, "evals", skill, "runs", entry["runId"] + ".json"))
        found[skill] = {"summary": summary, "decision": entry, "results": results,
                        "readme": os.path.join(root, "skills", skill, "README.md")}
    for skill, item in found.items():
        entry = item["decision"]
        if entry["validation"] and (entry["anchor"] == skill or entry["anchor"] not in found):
            raise DocError("%s: the anchor `%s` of the validation of %s is not a skill with an adopted entry"
                           % (item["results"], entry["anchor"], entry["date"]))
    return found


def plan(root, only):
    """The files to bring up to date: {path: new text}, from the adopted evaluations."""
    found = collect(root)
    if only and only not in found:
        raise DocError("evals/%s: no adopted evaluation or validation in RESULTS.md (a `Decision:` line starting with `adopt`)" % only)
    out, rows = {}, []
    for skill, item in found.items():
        item["blurb"] = front_summary(item["readme"])
        if item["decision"]["validation"]:
            rows.append({"skill": skill, "summary": item["blurb"], "date": item["decision"]["decisionDate"],
                         "validated": True, "anchor": item["decision"]["anchor"]})
            block = render_validated(skill, item)
        else:
            rows.append({"skill": skill, "summary": item["blurb"], "date": item["summary"]["date"],
                         "red": item["summary"]["totals"]["reduction"]})
            block = None
        if only and skill != only:
            continue
        if block is None:
            block = render_performance(item["summary"], item["decision"])
        text = read_text(item["readme"])
        out[item["readme"]] = replace_block(item["readme"], text, PERF_MARKERS, block)
    readme = os.path.join(root, "README.md")
    out[readme] = replace_block(readme, read_text(readme), SKILLS_MARKERS, render_skills(rows))
    return out


def relative(root, path):
    return os.path.relpath(path, root)


def main(argv):
    p = argparse.ArgumentParser(prog="kpi.py doc", description=__doc__.split("\n")[0])
    p.add_argument("skill", nargs="?", help="only this skill's README (the root table is always checked)")
    p.add_argument("--check", action="store_true", help="write nothing; fail naming each file that is out of date")
    p.add_argument("--root", default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   help="repository root (default: the one holding this script)")
    args = p.parse_args(argv)
    root = os.path.abspath(args.root)
    try:
        wanted = plan(root, args.skill)
        stale = [path for path, text in wanted.items() if read_text(path) != text]
    except DocError as exc:
        print("kpi.py doc: %s" % exc, file=sys.stderr)
        return 2
    if args.check:
        for path in stale:
            print("%s: out of date with the adopted evaluation; run `python3 evals/kpi.py doc`" % relative(root, path))
        return 1 if stale else 0
    for path, text in sorted(wanted.items()):
        if path in stale:
            with open(path, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(text)
        print("%s: %s" % (relative(root, path), "updated" if path in stale else "unchanged"))
    return 0
