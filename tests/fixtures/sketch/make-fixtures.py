#!/usr/bin/env python3
"""Regenerate the sketch fixtures: collected run folders of one complex case run three times
(aggregate.json, the stub copy of the prompt, and per-run trace.jsonl and meta.json).

Scenarios: good (three delivered, skill-free runs), missing (run 2 left no deliverable, and run 3
observed another effort), skill-called (run 3 called the Skill tool), short (only two runs recorded).
Run: python3 tests/fixtures/sketch/make-fixtures.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = {1: (20000, 30), 2: (40000, 60), 3: (80000, 120)}  # run -> (tokens, seconds)
CASE = "sketch-complex"
PROMPT = (
    "Draw the sequence diagram of an order checkout: the customer, the shop, the payment service and\n"
    "the warehouse, with the optional payment retry and the cancellation branch. Write it as one\n"
    "self-contained HTML page named complex.html in the current folder.\n"
)


def trace(tokens, seconds, calls_skill):
    out = tokens // 20
    usage = {"inputTokens": 4, "cacheCreationInputTokens": tokens // 4,
             "cacheReadInputTokens": tokens - 4 - tokens // 4 - out, "outputTokens": out}
    lines = [{"type": "system", "subtype": "init", "tools": ["Bash", "Edit", "Read", "Write"]}]
    content = [{"type": "tool_use", "name": "Write", "input": {}}]
    if calls_skill:
        content.append({"type": "tool_use", "name": "Skill", "input": {"skill": "dataviz"}})
    lines.append({"type": "assistant", "message": {"content": content}})
    lines.append({"type": "result", "subtype": "success", "duration_ms": seconds * 1000,
                  "total_cost_usd": round(tokens * 0.00001, 6), "num_turns": 4,
                  "modelUsage": {"model-a": usage}})
    return "\n".join(json.dumps(l, sort_keys=True) for l in lines) + "\n"


def write_json(path, data, **kw):
    with open(path, "w") as fh:
        json.dump(data, fh, sort_keys=True, **kw)
        fh.write("\n")


def build(name, missing=None, skill_called=None, runs=3, effort_of=None):
    root = os.path.join(HERE, name)
    agg = {"schemaVersion": 1, "claudeVersion": "0.0.0-fixture",
           "suite": {"modelOverride": "fixture-model", "plugins": [{"name": "sketch-stub", "version": "0.0.0"}]},
           "cases": []}
    prompt_dir = os.path.join(root, "plugin", "evals", "complex")
    os.makedirs(prompt_dir, exist_ok=True)
    with open(os.path.join(prompt_dir, "prompt.md"), "w") as fh:
        fh.write(PROMPT)
    recorded = []
    for run in range(1, runs + 1):
        tokens, seconds = RUNS[run]
        d = os.path.join(root, CASE, "with-%d" % run)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "trace.jsonl"), "w") as fh:
            fh.write(trace(tokens, seconds, skill_called == run))
        write_json(os.path.join(d, "meta.json"), {
            "effort": [(effort_of or {}).get(run, "xhigh")],
            "files": [] if missing == run else ["complex.html"]})
        recorded.append({"error": None, "tracePath": None})
    agg["cases"].append({
        "name": CASE, "dir": "evals/complex",
        "graders": [{"name": "file", "type": "file_exists", "config": {"path": "complex.html", "exists": True}}],
        "arms": {"with": recorded}})
    write_json(os.path.join(root, "aggregate.json"), agg, indent=2)


if __name__ == "__main__":
    build("good")
    build("missing", missing=2, effort_of={3: "high"})
    build("skill-called", skill_called=3)
    build("short", runs=2)
