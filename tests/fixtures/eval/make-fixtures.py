#!/usr/bin/env python3
"""Regenerate the KPI fixtures: collected run folders (aggregate.json plus per-run trace.jsonl).

Each scenario is {case: (baseline (tokens, seconds), plugin (tokens, seconds))}; a run's tokens are
spread over input/cache/output, and two more runs per arm vary by a fixed jitter so medians are exact.
Run: python3 tests/fixtures/eval/make-fixtures.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
JITTER = (0.97, 1.0, 1.04)  # median of three is the nominal value


def trace(tokens, seconds, drop=None, no_result=False):
    out = tokens // 20
    usage = {"inputTokens": 4, "cacheCreationInputTokens": tokens // 4,
             "cacheReadInputTokens": tokens - 4 - tokens // 4 - out, "outputTokens": out}
    usage2 = {"inputTokens": 0, "cacheCreationInputTokens": 0, "cacheReadInputTokens": 0, "outputTokens": 10}
    init = {"type": "system", "subtype": "init", "model": "fixture-model"}
    lines = [init]
    if not no_result:
        res = {"type": "result", "subtype": "success", "duration_ms": int(seconds * 1000),
               "total_cost_usd": round(tokens * 0.00001, 6), "num_turns": 6,
               "modelUsage": {"model-a": dict(usage), "model-b": dict(usage2)}}
        # tokens counted include model-b's 10 output tokens
        if drop == "cacheRead":
            del res["modelUsage"]["model-a"]["cacheReadInputTokens"]
        if drop == "duration":
            del res["duration_ms"]
        lines.append(res)
    return "\n".join(json.dumps(l, sort_keys=True) for l in lines) + "\n"


def build(name, cases, skill_not_used=None, incomplete=None, drop=None):
    root = os.path.join(HERE, name)
    agg = {"schemaVersion": 1, "claudeVersion": "0.0.0-fixture",
           "suite": {"modelOverride": "fixture-model", "plugins": [{"name": "fixture", "version": "1.2.3"}]},
           "cases": []}
    for case, (base, plug) in sorted(cases.items()):
        arms = {"with": [], "without": []}
        for arm, (tok, sec) in (("without", base), ("with", plug)):
            for i, j in enumerate(JITTER, start=1):
                d = os.path.join(root, case, "%s-%d" % (arm, i))
                os.makedirs(d, exist_ok=True)
                bad_skill = skill_not_used == (case, arm, i)
                gone = incomplete == (case, arm, i)
                with open(os.path.join(d, "trace.jsonl"), "w") as fh:
                    fh.write(trace(int(tok * j), sec * j, drop=drop if (case, arm, i) == ("easy", "with", 1) else None,
                                   no_result=gone))
                with open(os.path.join(d, "meta.json"), "w") as fh:
                    json.dump({"effort": ["medium"], "files": ["erd.html"]}, fh)
                graders = [{"name": "file", "passed": True, "weight": 1, "withOnly": False, "scored": True},
                           {"name": "entity-order", "passed": True, "weight": 1, "withOnly": False, "scored": True}]
                if arm == "with":
                    graders.append({"name": "skill", "passed": not bad_skill, "weight": 1, "withOnly": True, "scored": False})
                arms[arm].append({"score": 1, "passed": True, "error": None, "graders": graders,
                                  "tracePath": None})
        agg["cases"].append({"name": case, "arms": arms})
    with open(os.path.join(root, "aggregate.json"), "w") as fh:
        json.dump(agg, fh, indent=2, sort_keys=True)
        fh.write("\n")


two = lambda e, h: {"easy": ((10000, 20), (e[0], e[1])), "hard": ((40000, 80), (h[0], h[1]))}
build("meets-target", two((6000, 12), (24000, 48)))
build("below-time", two((7000, 18), (28000, 72)))          # tokens -30%, time -10%
build("regress", {"easy": ((10000, 20), (5000, 25)), "hard": ((40000, 80), (20000, 40))})
build("skill-not-used", two((6000, 12), (24000, 48)), skill_not_used=("easy", "with", 2))
build("no-benefit", two((10500, 21), (42000, 84)))
build("incomplete", two((6000, 12), (24000, 48)), incomplete=("hard", "with", 3))
build("missing-field", two((6000, 12), (24000, 48)), drop="cacheRead")
