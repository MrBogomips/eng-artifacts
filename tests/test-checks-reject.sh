#!/usr/bin/env bash
# The validators must fail, with a useful message, on bad input: a version mismatch, a theme with one
# token removed, a color literal / font family / harness path in a plugin file.
set -u
. "$(dirname "$0")/lib.sh"
need jq
need python3

TMP=$(mktemp -d "${TMPDIR:-/tmp}/artifacts-reject.XXXXXX")
trap 'rm -rf "$TMP"' EXIT

expect_fail() { # expect_fail <label> <expected substring> <command...>
    local label="$1" want="$2"; shift 2
    local out
    out=$("$@" 2>&1)
    if [ $? -eq 0 ]; then fail "$label" "validator passed on bad input"
    elif ! printf '%s' "$out" | grep -qF -- "$want"; then fail "$label" "output lacks \"$want\": $out"
    fi
}

# version mismatch names both versions
jq '.plugins[0].version = "9.9.9"' "$ROOT/.claude-plugin/marketplace.json" > "$TMP/market.json"
expect_fail "manifests: version mismatch" 'marketplace "9.9.9" vs plugin.json' \
    bash "$ROOT/tests/validate-manifests.sh" "$ROOT/.claude-plugin/plugin.json" "$TMP/market.json"

# a second plugin entry
jq '.plugins += [.plugins[0]]' "$ROOT/.claude-plugin/marketplace.json" > "$TMP/market2.json"
expect_fail "manifests: two entries" "exactly one plugin" \
    bash "$ROOT/tests/validate-manifests.sh" "$ROOT/.claude-plugin/plugin.json" "$TMP/market2.json"

# theme with one token removed (first occurrence only: the light block)
mkdir -p "$TMP/themes"
cp "$ROOT"/shared/themes/*.css "$TMP/themes/"
python3 - "$TMP/themes/alt.css" <<'PY'
import sys
p = sys.argv[1]
t = open(p).read()
i = t.index("--status-late:")
j = t.index("\n", i)
open(p, "w").write(t[:i] + t[j + 1:])
PY
expect_fail "themes: token removed" "--status-late" bash "$ROOT/tests/validate-themes.sh" "$TMP/themes"

# alternate theme identical to the default in the fonts group
cp "$ROOT/shared/themes/default.css" "$TMP/themes/alt.css"
expect_fail "themes: alt equals default" "does not differ from the default" bash "$ROOT/tests/validate-themes.sh" "$TMP/themes"

# a theme that imports its fonts from a host other than Google Fonts: rejected, naming theme and source
cp "$ROOT"/shared/themes/*.css "$TMP/themes/"
python3 - "$TMP/themes/alt.css" <<'PY'
import sys
p = sys.argv[1]
t = open(p).read().replace("fonts.googleapis.com", "fonts.example.org")
open(p, "w").write(t)
PY
expect_fail "themes: foreign font host" "alt.css: the theme loads fonts from \"https://fonts.example.org/" bash "$ROOT/tests/validate-themes.sh" "$TMP/themes"

# a theme with system fonts only (no import at all) is accepted
cp "$ROOT"/shared/themes/*.css "$TMP/themes/"
python3 - "$TMP/themes/alt.css" <<'PY'
import re, sys
p = sys.argv[1]
t = open(p).read()
t = re.sub(r"@import url\([^)]*\);\n", "", t)
t = re.sub(r'--font-display: [^;]*;', '--font-display: Georgia, "Times New Roman", serif;', t)
t = re.sub(r'--font-body: [^;]*;', '--font-body: system-ui, sans-serif;', t)
t = re.sub(r'--font-data: [^;]*;', '--font-data: ui-monospace, monospace;', t)
open(p, "w").write(t)
PY
bash "$ROOT/tests/validate-themes.sh" "$TMP/themes" >/dev/null 2>&1 || fail "themes: system fonts only" "a theme with no @import was rejected"

# style source: injected literals report file and line
mkdir -p "$TMP/plugin/shared/page" "$TMP/plugin/skills/x"
printf '.a {\n  color: #123456;\n}\n' > "$TMP/plugin/shared/page/page.css"
expect_fail "style source: hex" "shared/page/page.css:2:" bash "$ROOT/tests/validate-style-source.sh" "$TMP/plugin"
printf 'x\nfont-family: "Inter", sans-serif;\n' > "$TMP/plugin/shared/page/page.css"
expect_fail "style source: font" "shared/page/page.css:2:" bash "$ROOT/tests/validate-style-source.sh" "$TMP/plugin"
printf 'x\nread evals/run.sh\n' > "$TMP/plugin/skills/x/SKILL.md"
printf '.ok { fill: var(--ink); }\n' > "$TMP/plugin/shared/page/page.css"
expect_fail "style source: harness path" "skills/x/SKILL.md:2:" bash "$ROOT/tests/validate-style-source.sh" "$TMP/plugin"

# a sample model with a color-like value is content, not a style value
rm "$TMP/plugin/skills/x/SKILL.md"
printf '{"default": "#123456"}\n' > "$TMP/plugin/skills/x/sample.erd.json"
bash "$ROOT/tests/validate-style-source.sh" "$TMP/plugin" >/dev/null 2>&1 || fail "style source: sample model" "color in *.erd.json was reported"

finish test-checks-reject
