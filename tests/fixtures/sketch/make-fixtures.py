#!/usr/bin/env python3
"""Regenerate the sketch fixtures: collected run folders (aggregate.json plus per-case trace.jsonl).

Scenarios: good (three delivered, skill-free sketches), missing (the medium sketch left no
deliverable), skill-called (the complex session called the Skill tool).
Run: python3 tests/fixtures/sketch/make-fixtures.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
CASES = {"easy": (20000, 30), "medium": (40000, 60), "complex": (80000, 120)}


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


def build(name, missing=None, skill_called=None):
    root = os.path.join(HERE, name)
    agg = {"schemaVersion": 1, "claudeVersion": "0.0.0-fixture",
           "suite": {"modelOverride": "fixture-model", "plugins": [{"name": "sketch-stub", "version": "0.0.0"}]},
           "cases": []}
    for case, (tokens, seconds) in sorted(CASES.items()):
        d = os.path.join(root, "sketch-" + case, "with-1")
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "trace.jsonl"), "w") as fh:
            fh.write(trace(tokens, seconds, skill_called == case))
        with open(os.path.join(d, "meta.json"), "w") as fh:
            json.dump({"effort": ["medium"], "files": [] if missing == case else [case + ".html"]}, fh)
        agg["cases"].append({
            "name": "sketch-" + case, "dir": "evals/" + case,
            "graders": [{"name": "file", "type": "file_exists", "config": {"path": case + ".html", "exists": True}}],
            "arms": {"with": [{"error": None, "tracePath": None}]}})
    with open(os.path.join(root, "aggregate.json"), "w") as fh:
        json.dump(agg, fh, indent=2, sort_keys=True)
        fh.write("\n")


if __name__ == "__main__":
    build("good")
    build("missing", missing="medium")
    build("skill-called", skill_called="complex")
