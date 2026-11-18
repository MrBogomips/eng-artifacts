#!/usr/bin/env bash
# Run the three exploration sketches of a new artifact skill and print the sketch report.
#
#   evals/sketch.sh <cases-dir> [--model <id>] [--effort <level>|unpinned] [-j N]
#
# <cases-dir> holds the three cases easy/, medium/ and complex/, each in the testbed layout
# (prompt.md and graders/). Each case runs once, in the sandbox of `claude plugin eval`, against an
# empty stub plugin (a manifest and a copy of the cases, no skill) with the Skill and Agent tools
# disallowed: the session sees no plugin skill, no project or user instructions, no memory and no
# design. Defaults: model claude-opus-5-5, effort medium, concurrency 3. There is no cost ceiling,
# and nothing is published. Raw output goes to evals/results/sketch-<run-id>/ (ignored by git); the
# report (report.md, report.json) is printed and kept there. The effort is passed to the child
# sessions through CLAUDE_CODE_EFFORT_LEVEL. Exit status: 0 all three sketches delivered and
# skill-free, 1 a sketch is missing or invoked a skill, 2 usage or tooling failure.
# Needs: claude, python3. Works with BSD (macOS) and GNU tools.
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"

MODEL="claude-opus-5-5"
EFFORT="medium"
JOBS=3
CASES=(easy medium complex)

usage() {
    sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
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
for c in "${CASES[@]}"; do
    [ -f "$CASES_DIR/$c/prompt.md" ] || {
        echo "sketch.sh: the case \"$c\" is missing: no $CASES_DIR/$c/prompt.md" >&2
        exit 2
    }
done
command -v claude >/dev/null 2>&1 || { echo "sketch.sh: claude is not on PATH" >&2; exit 2; }
command -v python3 >/dev/null 2>&1 || { echo "sketch.sh: python3 is required" >&2; exit 2; }

RUN_ID="sketch-$(date -u +%Y-%m-%dT%H-%M-%SZ)"
RUN_DIR="$HERE/results/$RUN_ID"
STUB="$RUN_DIR/plugin"
mkdir -p "$STUB/.claude-plugin" "$STUB/evals" || { echo "sketch.sh: cannot create $RUN_DIR" >&2; exit 2; }

# the empty stub: a manifest, no skill, and the three cases
cat >"$STUB/.claude-plugin/plugin.json" <<'EOF'
{
  "name": "sketch-stub",
  "version": "0.0.0",
  "description": "Empty plugin that hosts the exploration sketches: no skill, no agent, no command."
}
EOF
for c in "${CASES[@]}"; do
    cp -R "$CASES_DIR/$c" "$STUB/evals/$c" || { echo "sketch.sh: cannot copy the case \"$c\"" >&2; exit 2; }
done

KPI_EFFORT="not pinned"
if [ "$EFFORT" != "unpinned" ]; then
    export CLAUDE_CODE_EFFORT_LEVEL="$EFFORT"
    KPI_EFFORT="$EFFORT"
fi

echo "sketch.sh: sketching as $RUN_ID (model $MODEL, effort $KPI_EFFORT, one run per case, -j $JOBS)" >&2

claude plugin eval "$STUB" --ablation none --runs 1 -j "$JOBS" --model "$MODEL" \
    --keep-temp --no-publish --trust-plugin --threshold 0 \
    --allow-tools Bash Write Edit --disallow-tools Skill Agent \
    --output-dir "$RUN_DIR" --json "$RUN_DIR/aggregate.json" >"$RUN_DIR/eval.log" 2>&1
EVAL_RC=$?
if [ ! -s "$RUN_DIR/aggregate.json" ]; then
    echo "sketch.sh: the sketches produced no result (exit $EVAL_RC); see $RUN_DIR/eval.log" >&2
    exit 2
fi

python3 -I "$HERE/sketch.py" --run-dir "$RUN_DIR" --effort "$KPI_EFFORT"
