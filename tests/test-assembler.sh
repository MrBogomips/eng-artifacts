#!/usr/bin/env bash
# Page assembly: every valid ERD fixture builds under the default, the alternate and a project theme;
# an incomplete theme is rejected listing every missing token; invalid models write no file; every
# external script URL in a produced page is on an allowed CDN and pinned to an exact version.
set -u
. "$(dirname "$0")/lib.sh"
need python3

ASM="$ROOT/shared/scripts/artifact_page.py"
FIX="$ROOT/tests/fixtures/erd"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/artifacts-asm.XXXXXX")
trap 'rm -rf "$TMP"' EXIT

# a project theme: a complete copy of the default (system fonts, no import) with a few values changed
PROJECT="$TMP/project-theme.css"
python3 - "$ROOT/shared/themes/default.css" "$PROJECT" <<'PY'
import sys
t = open(sys.argv[1]).read().replace("#2563eb", "#2a8f4d").replace("--radius: 8px", "--radius: 6px")
open(sys.argv[2], "w").write(t)
PY

check_page() { # check_page <page> <label>
    local page="$1" label="$2" url
    head -c 15 "$page" | grep -qi '<!doctype html>' || fail "$label" "page does not start with a doctype"
    if grep -q '{{[A-Z_]*}}' "$page"; then fail "$label" "unfilled placeholder in the page"; fi
    # a theme that imports fonts opens its stylesheet with the @import; one with system fonts has none
    python3 - "$page" <<'PY' || fail "$label" "the theme's @import does not open its stylesheet, or the page names a font source other than Google Fonts"
import re, sys
t = open(sys.argv[1]).read()
m = re.search(r'<style id="theme">\s*(.*?)</style>', t, re.S)
body = re.sub(r"/\*.*?\*/", "", m.group(1), flags=re.S).lstrip()
if "@import" in body:
    ok = body.startswith("@import") and all(u.startswith("https://fonts.googleapis.com/") for u in re.findall(r'@import url\("([^"]+)"\)', body))
    sys.exit(0 if ok else 1)
sys.exit(0)
PY
    # the Dark mode toggle replaces the three-button switch; the page head carries zoom and the cards exist
    grep -q 'type="checkbox" id="mode-toggle" role="switch"' "$page" || fail "$label" "the page has no Dark mode toggle"
    grep -q '<span class="mode-label">Dark mode</span>' "$page" || fail "$label" "the toggle is not labelled Dark mode"
    grep -qE 'mode-switch|data-mode=|aria-pressed' "$page" && fail "$label" "the page still carries the System / Light / Dark switch"
    for id in zoom-out zoom-in zoom-fit zoom-actual legend-card details-card; do
        grep -q "id=\"$id\"" "$page" || fail "$label" "the page lacks #$id"
    done
    # every external script is on an allowed CDN with an exact version
    for url in $(grep -oE '<script[^>]* src="[^"]+"' "$page" | grep -oE 'src="[^"]+"' | sed 's/^src="//; s/"$//'); do
        printf '%s' "$url" | grep -qE '^https://(cdn\.jsdelivr\.net/npm/[^/@]+@[0-9]+\.[0-9]+\.[0-9]+/|cdnjs\.cloudflare\.com/ajax/libs/[^/]+/[0-9]+\.[0-9]+\.[0-9]+/|unpkg\.com/[^/@]+@[0-9]+\.[0-9]+\.[0-9]+/)' \
            || fail "$label" "external script is not pinned on an allowed CDN: $url"
    done
    # nothing else loads from the network but Google Fonts and those scripts
    if grep -oE '(src|href)="https?://[^"]+"' "$page" | grep -vE 'cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com' | grep -q .; then
        fail "$label" "the page references an unexpected external resource"
    fi
}

for f in "$FIX"/valid/*.erd.json; do
    name=$(basename "$f" .erd.json)
    for theme in default alt "$PROJECT"; do
        tname=$(basename "$theme" .css)
        out="$TMP/$name-$tname.html"
        label="assembler:$name/$tname"
        msg=$(python3 -I "$ASM" --type erd --model "$f" --theme "$theme" --out "$out" 2>&1) || { fail "$label" "build failed: $msg"; continue; }
        [ -s "$out" ] || { fail "$label" "no page written"; continue; }
        [ "$(basename "$msg")" = "$(basename "$out")" ] || fail "$label" "did not report the output path (got: $msg)"
        check_page "$out" "$label"
    done
done

# the project theme's values are what the page carries
grep -q '#2a8f4d' "$TMP/small-project-theme.html" || fail "assembler:project theme" "the page does not use the project theme's values"
grep -q '#2563eb' "$TMP/small-project-theme.html" && fail "assembler:project theme" "the default theme's accent leaked into the page"

# a system-font theme makes no font request; the alternate theme loads its fonts from Google Fonts
grep -q 'fonts.googleapis.com' "$TMP/small-default.html" && fail "assembler:system fonts" "the default page requests web fonts"
grep -q 'fonts.googleapis.com' "$TMP/small-alt.html" || fail "assembler:web fonts" "the alternate page does not load its Google Fonts"

# a theme that imports from another host is refused, nothing written
python3 - "$ROOT/shared/themes/alt.css" "$TMP/foreign.css" <<'PY'
import sys
open(sys.argv[2], "w").write(open(sys.argv[1]).read().replace("fonts.googleapis.com", "fonts.example.org"))
PY
rm -f "$TMP/foreign.html"
msg=$(python3 -I "$ASM" --type erd --model "$FIX/valid/small.erd.json" --theme "$TMP/foreign.css" --out "$TMP/foreign.html" 2>&1) && fail "assembler:foreign font host" "accepted"
[ ! -e "$TMP/foreign.html" ] || fail "assembler:foreign font host" "a page was written"
printf '%s' "$msg" | grep -qF 'fonts.example.org' || fail "assembler:foreign font host" "message does not name the source: $msg"

# title and description: escaped, shown as heading and under it
cat > "$TMP/title.erd.json" <<'JSON'
{ "title": "Orders & \"Payments\"", "description": "Who pays for what",
  "entities": [ { "name": "a", "columns": [ { "name": "id", "type": "int", "pk": true } ] } ] }
JSON
python3 -I "$ASM" --type erd --model "$TMP/title.erd.json" --out "$TMP/title.html" >/dev/null 2>&1 || fail "assembler:title" "build failed"
grep -q '<title>Orders &amp; &quot;Payments&quot;</title>' "$TMP/title.html" || fail "assembler:title" "document title missing or not escaped"
grep -q '<h1 class="page-title">Orders &amp;' "$TMP/title.html" || fail "assembler:title" "heading missing"
grep -q 'class="page-desc">Who pays for what</p>' "$TMP/title.html" || fail "assembler:title" "description missing"

# incomplete project theme: rejected, every missing token listed, no file
python3 - "$ROOT/shared/themes/default.css" "$TMP/incomplete.css" <<'PY'
import sys
t = open(sys.argv[1]).read()
for tok in ("--mark:", "--group-5:"):
    i = t.index(tok); j = t.index("\n", i)
    t = t[:i] + t[j + 1:]   # first occurrence: the light block
open(sys.argv[2], "w").write(t)
PY
out="$TMP/incomplete.html"
msg=$(python3 -I "$ASM" --type erd --model "$FIX/valid/small.erd.json" --theme "$TMP/incomplete.css" --out "$out" 2>&1) && fail "assembler:incomplete theme" "accepted"
[ ! -e "$out" ] || fail "assembler:incomplete theme" "a page was written"
for tok in --mark --group-5; do
    printf '%s' "$msg" | grep -qF "missing token $tok in the light block" || fail "assembler:incomplete theme" "message does not list $tok: $msg"
done

# unknown theme name
msg=$(python3 -I "$ASM" --type erd --model "$FIX/valid/small.erd.json" --theme nonesuch --out "$TMP/x.html" 2>&1) && fail "assembler:unknown theme" "accepted"
printf '%s' "$msg" | grep -q 'shipped theme' || fail "assembler:unknown theme" "message does not name the shipped themes: $msg"
[ ! -e "$TMP/x.html" ] || fail "assembler:unknown theme" "a page was written"

# invalid models: exit non-zero, nothing written, the validator's message shown
for f in "$FIX"/invalid/*.erd.json; do
    name=$(basename "$f" .erd.json)
    out="$TMP/invalid-$name.html"
    msg=$(python3 -I "$ASM" --type erd --model "$f" --out "$out" 2>&1) && fail "assembler:invalid/$name" "accepted"
    [ ! -e "$out" ] || fail "assembler:invalid/$name" "a page was written"
    printf '%s' "$msg" | grep -q "error: .*$name.erd.json: " || fail "assembler:invalid/$name" "no error naming the model: $msg"
done

# unknown type, unreadable model
python3 -I "$ASM" --type nope --model "$FIX/valid/small.erd.json" --out "$TMP/n.html" >/dev/null 2>&1 && fail "assembler:unknown type" "accepted"
python3 -I "$ASM" --type erd --model "$TMP/missing.json" --out "$TMP/m.html" >/dev/null 2>&1 && fail "assembler:missing model" "accepted"
[ ! -e "$TMP/n.html" ] && [ ! -e "$TMP/m.html" ] || fail "assembler:errors" "a page was written"

# an unpinned or off-list external script is refused, nothing written
CP="$TMP/plugin-copy"; mkdir -p "$CP"; cp -R "$ROOT/shared" "$ROOT/skills" "$CP/"
for bad in 'https://cdn.jsdelivr.net/npm/elkjs/lib/elk.bundled.js' 'https://cdn.jsdelivr.net/npm/elkjs@0/lib/elk.bundled.js' 'https://example.org/elk.js'; do
    printf '{"scripts":[{"src":"%s"}]}\n' "$bad" > "$CP/skills/erd/assets/erd.json"
    rm -f "$TMP/bad.html"
    python3 -I "$ASM" --type erd --model "$FIX/valid/small.erd.json" --plugin-root "$CP" --out "$TMP/bad.html" >/dev/null 2>&1 && fail "assembler:external script" "accepted $bad"
    [ ! -e "$TMP/bad.html" ] || fail "assembler:external script" "a page was written for $bad"
done

finish test-assembler
