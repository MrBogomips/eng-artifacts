#!/usr/bin/env bash
# Run a skill's evaluation testbed and print the KPI report.
#
#   evals/run.sh <skill> [--model <id>] [--effort <level>|unpinned] [--runs N] [-j N]
#                        [--baseline] [--target-tokens N] [--target-time N]
#
# Defaults: model claude-opus-5-5, effort medium, 3 runs per arm, concurrency 2, targets 20% / 20%.
# Every case under evals/<skill>/ runs twice, with the plugin and without it (the eval tool's own
# baseline arm), in isolated child sessions. There is no cost ceiling and no cost confirmation, and
# the report is never published. Raw output goes to evals/results/<run-id>/ (ignored by git);
# a summary is appended to evals/<skill>/RESULTS.md by evals/kpi.py.
# The effort is passed to the child sessions through CLAUDE_CODE_EFFORT_LEVEL, which the eval
# children honor; kpi.py reads the effort they actually ran at from their kept transcripts.
# Needs: claude, python3. Works with BSD (macOS) and GNU tools.
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

MODEL="claude-opus-5-5"
EFFORT="medium"
RUNS=3
JOBS=2
BASELINE=""
TARGET_TOKENS=20
TARGET_TIME=20

known_skills() {
    local d
    for d in "$HERE"/*/; do
        d="${d%/}"
        [ "$(basename "$d")" = "results" ] && continue
        if find "$d" -name prompt.md -print -quit 2>/dev/null | grep -q .; then
            basename "$d"
        fi
    done
}

usage() {
    sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
    echo "Known skills: $(known_skills | tr '\n' ' ')"
}

[ $# -ge 1 ] || { usage >&2; exit 2; }
case "$1" in -h|--help) usage; exit 0 ;; esac
SKILL="$1"; shift

while [ $# -gt 0 ]; do
    case "$1" in
        --model) MODEL="${2:?--model needs a value}"; shift 2 ;;
        --effort) EFFORT="${2:?--effort needs a value}"; shift 2 ;;
        --runs) RUNS="${2:?--runs needs a value}"; shift 2 ;;
        -j) JOBS="${2:?-j needs a value}"; shift 2 ;;
        --baseline) BASELINE="--baseline"; shift ;;
        --target-tokens) TARGET_TOKENS="${2:?}"; shift 2 ;;
        --target-time) TARGET_TIME="${2:?}"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        *) echo "run.sh: unknown option $1" >&2; usage >&2; exit 2 ;;
    esac
done

if ! known_skills | grep -qx -- "$SKILL"; then
    echo "run.sh: unknown skill \"$SKILL\"; no testbed under evals/$SKILL/" >&2
    echo "Known skills: $(known_skills | tr '\n' ' ')" >&2
    exit 2
fi
command -v claude >/dev/null 2>&1 || { echo "run.sh: claude is not on PATH" >&2; exit 2; }
command -v python3 >/dev/null 2>&1 || { echo "run.sh: python3 is required" >&2; exit 2; }

RUN_ID="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
RUN_DIR="$HERE/results/$RUN_ID"
mkdir -p "$RUN_DIR"

KPI_EFFORT="not pinned"
if [ "$EFFORT" != "unpinned" ]; then
    export CLAUDE_CODE_EFFORT_LEVEL="$EFFORT"
    KPI_EFFORT="$EFFORT"
fi

cd "$ROOT" || exit 2
echo "run.sh: evaluating \"$SKILL\" as $RUN_ID (model $MODEL, effort $KPI_EFFORT, $RUNS runs per arm, -j $JOBS)" >&2

claude plugin eval . --tag "$SKILL" --model "$MODEL" --runs "$RUNS" -j "$JOBS" \
    --keep-temp --no-publish --trust-plugin --threshold 0 \
    --output-dir "$RUN_DIR" --json "$RUN_DIR/aggregate.json" \
    --allow-tools Bash Write Edit >"$RUN_DIR/eval.log" 2>&1
EVAL_RC=$?
if [ ! -s "$RUN_DIR/aggregate.json" ]; then
    echo "run.sh: the evaluation produced no result (exit $EVAL_RC); see $RUN_DIR/eval.log" >&2
    exit 2
fi

# shellcheck disable=SC2086
python3 -I "$HERE/kpi.py" --skill "$SKILL" --run-dir "$RUN_DIR" --effort "$KPI_EFFORT" \
    --target-tokens "$TARGET_TOKENS" --target-time "$TARGET_TIME" $BASELINE
