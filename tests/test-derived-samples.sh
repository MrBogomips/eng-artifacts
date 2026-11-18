#!/usr/bin/env bash
# The sample model of a derived skill. For every evals/<skill>/RESULTS.md whose newest adopted entry is a
# validation (a derived skill, decision `adopt (validated, not measured; ...)`), the `Sample:` path must
# exist, lie under evals/<skill>/sample/, and be accepted by the skill's validator
# (skills/<skill>/scripts/<skill with - as _>_model.py). A problem is named by its skill.
#
#   bash tests/test-derived-samples.sh              the repository, then the fixture cases
#   bash tests/test-derived-samples.sh --root <dir> one repository root only (the fixture cases use it)
#
# The fixture cases are under tests/fixtures/derived-samples/<case>/evals/uml-derived-sample/RESULTS.md;
# each is completed in a scratch root with the class diagram's validator and one of its fixture models.
set -u
. "$(dirname "$0")/lib.sh"
need python3

# the validation entries of a root, one per line: <skill>|ok|<sample> or <skill>|error|<message>
list_validations() { # list_validations <root>
    python3 -I -c '
import os, sys
sys.dont_write_bytecode = True
root = sys.argv[1]
sys.path.insert(0, os.path.join(sys.argv[2], "evals"))
import kpidoc
evals = os.path.join(root, "evals")
for skill in sorted(os.listdir(evals)) if os.path.isdir(evals) else []:
    results = os.path.join(evals, skill, "RESULTS.md")
    if skill == "results" or not os.path.isfile(results):
        continue
    try:
        entry = kpidoc.adopted_entry(results)
    except kpidoc.DocError as exc:
        print("%s|error|%s" % (skill, exc))
        continue
    if entry and entry["validation"]:
        print("%s|ok|%s" % (skill, entry["sample"] or ""))
' "$1" "$ROOT"
}

check_root() { # check_root <root>
    local root=$1 skill status sample validator out
    while IFS='|' read -r skill status sample; do
        [ -n "$skill" ] || continue
        if [ "$status" = error ]; then
            fail "$skill" "RESULTS.md cannot be read: $sample"
            continue
        fi
        if [ -z "$sample" ]; then
            fail "$skill" "the validation entry has no Sample line"
            continue
        fi
        case "$sample" in
            evals/"$skill"/sample/*) ;;
            *) fail "$skill" "the sample $sample does not lie under evals/$skill/sample/"; continue ;;
        esac
        case "/$sample/" in
            */../*) fail "$skill" "the sample $sample leaves its folder"; continue ;;
        esac
        if [ ! -f "$root/$sample" ]; then
            fail "$skill" "the sample $sample does not exist"
            continue
        fi
        validator="$root/skills/$skill/scripts/${skill//-/_}_model.py"
        if [ ! -f "$validator" ]; then
            fail "$skill" "no validator at skills/$skill/scripts/${skill//-/_}_model.py"
            continue
        fi
        if ! out=$(python3 -I "$validator" "$root/$sample" 2>&1); then
            fail "$skill" "the sample $sample is rejected by its validator: $(printf '%s' "$out" | head -n 1)"
        fi
    done < <(list_validations "$root")
}

if [ "${1:-}" = "--root" ]; then
    [ -n "${2:-}" ] && [ -d "$2" ] || { printf 'tests: --root needs a directory\n' >&2; exit 2; }
    check_root "$(cd "$2" && pwd)"
    finish test-derived-samples
    exit 0
fi

# the repository itself (no validation entry yet means nothing to check)
check_root "$ROOT"

# the fixture cases
FIX="$ROOT/tests/fixtures/derived-samples"
CD_FIX="$ROOT/tests/fixtures/uml-class-diagram"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/artifacts-derived.XXXXXX")
trap 'rm -rf "$TMP"' EXIT

build_case() { # build_case <case> <model fixture or -> <sample path in the scratch root or ->
    local name=$1 model=$2 dest=$3 root="$TMP/$1" skill=uml-derived-sample
    rm -rf "$root"
    cp -R "$FIX/$name" "$root"
    mkdir -p "$root/skills/$skill/scripts"
    cp "$ROOT/skills/uml-class-diagram/scripts/uml_class_diagram_model.py" "$root/skills/$skill/scripts/${skill//-/_}_model.py"
    if [ "$dest" != "-" ]; then
        mkdir -p "$(dirname "$root/$dest")"
        cp "$CD_FIX/$model" "$root/$dest"
    fi
}

run_case() { # run_case <case> <expected status> <text the output must contain>
    local name=$1 want=$2 text=$3 out rc
    out=$(bash "$0" --root "$TMP/$name" 2>&1); rc=$?
    [ "$rc" = "$want" ] || fail "derived-samples:$name" "exit status $rc, expected $want: $out"
    if [ "$want" = 0 ]; then
        return 0
    fi
    printf '%s' "$out" | grep -q '^uml-derived-sample: ' || fail "derived-samples:$name" "the skill is not named: $out"
    printf '%s' "$out" | grep -q "$text" || fail "derived-samples:$name" "the output lacks \"$text\": $out"
}

build_case valid valid/small.uml.json evals/uml-derived-sample/sample/library.uml.json
run_case valid 0 ""
build_case missing-sample - -
run_case missing-sample 1 "does not exist"
build_case invalid-sample invalid/unknown-classifier.uml.json evals/uml-derived-sample/sample/broken.uml.json
run_case invalid-sample 1 "rejected by its validator"
build_case outside-sample-dir valid/small.uml.json evals/uml-derived-sample/library.uml.json
run_case outside-sample-dir 1 "does not lie under"
build_case no-sample-line - -
run_case no-sample-line 1 "no Sample line"

# a skill whose validator is missing is named too
build_case valid valid/small.uml.json evals/uml-derived-sample/sample/library.uml.json
rm "$TMP/valid/skills/uml-derived-sample/scripts/uml_derived_sample_model.py"
run_case valid 1 "no validator"

finish test-derived-samples
