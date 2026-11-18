#!/usr/bin/env bash
# Run the exploration sketches of a new artifact skill and print the sketch report.
#
#   evals/sketch.sh <cases-dir> [--model <id>] [--effort <level>|unpinned] [-j N]
#
# <cases-dir> holds the one case complex/, in the testbed layout (prompt.md and graders/). That one
# case runs three times, the identical prompt in three sessions, each in its own sandbox of
# `claude plugin eval`, against an empty stub plugin (a manifest and a copy of the case, no skill)
# with the Skill and Agent tools disallowed: a session sees no plugin skill, no project or user
# instructions, no memory, no design and nothing of the other runs. An easy/ or medium/ case in the
# folder is ignored, with a notice. Defaults: model claude-opus-5-5, effort xhigh, concurrency 3.
# There is no cost ceiling, and nothing is published. Raw output goes to
# evals/results/sketch-<run-id>/ (ignored by git); the report (report.md, report.json) is printed
# and kept there. The effort is passed to the child sessions through CLAUDE_CODE_EFFORT_LEVEL.
# Exit status: 0 all three runs delivered and skill-free, 1 a run is missing or invoked a skill,
# 2 usage or tooling failure.
# Needs: claude, python3. Works with BSD (macOS) and GNU tools.
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"

MODEL="claude-opus-5-5"
EFFORT="xhigh"
JOBS=3
RUNS=3

usage() {
    sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
}

[ $# -ge 1 ] || { usage >&2; exit 2; }
case "$1" in -h|--help) usage; exit 0 ;; esac
CASES_DIR="$1"; shift

while [ $# -gt 0 ]; do
    case "$1" in
        --model) MODEL="${2:?--model needs a value}"; shift 2 ;;
        --effort) EFFORT="${2:?--effort needs a value}"; shift 2 ;;
        -j) JOBS="${2:?-j needs a value}"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        *) echo "sketch.sh: unknown option $1" >&2; usage >&2; exit 2 ;;
    esac
done

[ -d "$CASES_DIR" ] || { echo "sketch.sh: the cases folder \"$CASES_DIR\" does not exist" >&2; exit 2; }
[ -f "$CASES_DIR/complex/prompt.md" ] || {
    echo "sketch.sh: the case \"complex\" is missing: no $CASES_DIR/complex/prompt.md" >&2
    exit 2
}
for c in easy medium; do
    [ -e "$CASES_DIR/$c" ] && echo "sketch.sh: the case \"$c\" is ignored: only \"complex\" runs, three times" >&2
done
command -v claude >/dev/null 2>&1 || { echo "sketch.sh: claude is not on PATH" >&2; exit 2; }
command -v python3 >/dev/null 2>&1 || { echo "sketch.sh: python3 is required" >&2; exit 2; }

RUN_ID="sketch-$(date -u +%Y-%m-%dT%H-%M-%SZ)"
RUN_DIR="$HERE/results/$RUN_ID"
STUB="$RUN_DIR/plugin"
mkdir -p "$STUB/.claude-plugin" "$STUB/evals" || { echo "sketch.sh: cannot create $RUN_DIR" >&2; exit 2; }

# the empty stub: a manifest, no skill, and the complex case
cat >"$STUB/.claude-plugin/plugin.json" <<'EOF'
{
  "name": "sketch-stub",
  "version": "0.0.0",
  "description": "Empty plugin that hosts the exploration sketches: no skill, no agent, no command."
}
EOF
cp -R "$CASES_DIR/complex" "$STUB/evals/complex" || { echo "sketch.sh: cannot copy the case \"complex\"" >&2; exit 2; }

KPI_EFFORT="not pinned"
if [ "$EFFORT" != "unpinned" ]; then
    export CLAUDE_CODE_EFFORT_LEVEL="$EFFORT"
    KPI_EFFORT="$EFFORT"
fi

echo "sketch.sh: sketching as $RUN_ID (model $MODEL, effort $KPI_EFFORT, $RUNS runs of the complex case, -j $JOBS)" >&2

claude plugin eval "$STUB" --ablation none --runs "$RUNS" -j "$JOBS" --model "$MODEL" \
    --keep-temp --no-publish --trust-plugin --threshold 0 \
    --allow-tools Bash Write Edit --disallow-tools Skill Agent \
    --output-dir "$RUN_DIR" --json "$RUN_DIR/aggregate.json" >"$RUN_DIR/eval.log" 2>&1
EVAL_RC=$?
if [ ! -s "$RUN_DIR/aggregate.json" ]; then
    echo "sketch.sh: the sketches produced no result (exit $EVAL_RC); see $RUN_DIR/eval.log" >&2
    exit 2
fi

python3 -I "$HERE/sketch.py" --run-dir "$RUN_DIR" --effort "$KPI_EFFORT"
