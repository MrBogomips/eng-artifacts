#!/usr/bin/env bash
# Page assembly: every valid ERD, UML class, object and package diagram fixture builds under the default, the alternate and a project theme;
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
    grep -qE 'mode-switch|data-mode=|aria-pressed="' "$page" && fail "$label" "the page still carries the System / Light / Dark switch"
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

# every valid UML class diagram fixture builds under the same three themes, through the hyphenated
# type name (its validator is scripts/uml_class_diagram_model.py)
for f in "$ROOT"/tests/fixtures/uml-class-diagram/valid/*.uml.json; do
    name=$(basename "$f" .uml.json)
    for theme in default alt "$PROJECT"; do
        tname=$(basename "$theme" .css)
        out="$TMP/uml-$name-$tname.html"
        label="assembler:uml-class-diagram/$name/$tname"
        msg=$(python3 -I "$ASM" --type uml-class-diagram --model "$f" --theme "$theme" --out "$out" 2>&1) || { fail "$label" "build failed: $msg"; continue; }
        [ -s "$out" ] || { fail "$label" "no page written"; continue; }
        check_page "$out" "$label"
        grep -q 'data-type="uml-class-diagram"' "$out" || fail "$label" "the page does not carry its type"
        grep -q 'id="view-options"' "$out" || fail "$label" "the page has no view-options slot"
    done
done

# every valid UML object diagram fixture builds under the same three themes (its validator is
# scripts/uml_object_diagram_model.py); the shared UML scripts are inlined once, before the renderer
for f in "$ROOT"/tests/fixtures/uml-object-diagram/valid/*.object.uml.json; do
    name=$(basename "$f" .object.uml.json)
    for theme in default alt "$PROJECT"; do
        tname=$(basename "$theme" .css)
        out="$TMP/object-$name-$tname.html"
        label="assembler:uml-object-diagram/$name/$tname"
        msg=$(python3 -I "$ASM" --type uml-object-diagram --model "$f" --theme "$theme" --out "$out" 2>&1) || { fail "$label" "build failed: $msg"; continue; }
        [ -s "$out" ] || { fail "$label" "no page written"; continue; }
        check_page "$out" "$label"
        grep -q 'data-type="uml-object-diagram"' "$out" || fail "$label" "the page does not carry its type"
        grep -q 'id="view-options"' "$out" || fail "$label" "the page has no view-options slot"
        [ "$(grep -c 'U.layoutElk = ' "$out")" = 1 ] && [ "$(grep -c 'U.drawNode = ' "$out")" = 1 ] || fail "$label" "the shared UML scripts are not inlined exactly once"
    done
done

# invalid UML object diagram models: nothing written, the validator's message shown
for f in "$ROOT"/tests/fixtures/uml-object-diagram/invalid/*.object.uml.json; do
    name=$(basename "$f" .object.uml.json)
    out="$TMP/object-invalid-$name.html"
    msg=$(python3 -I "$ASM" --type uml-object-diagram --model "$f" --out "$out" 2>&1) && fail "assembler:uml-object-diagram/invalid/$name" "accepted"
    [ ! -e "$out" ] || fail "assembler:uml-object-diagram/invalid/$name" "a page was written"
    printf '%s' "$msg" | grep -q "error: .*$name.object.uml.json: " || fail "assembler:uml-object-diagram/invalid/$name" "no error naming the model: $msg"
done

# every valid UML package diagram fixture builds under the same three themes (its validator is
# scripts/uml_package_diagram_model.py), with the shared UML scripts inlined once
for f in "$ROOT"/tests/fixtures/uml-package-diagram/valid/*.package.uml.json; do
    name=$(basename "$f" .package.uml.json)
    for theme in default alt "$PROJECT"; do
        tname=$(basename "$theme" .css)
        out="$TMP/package-$name-$tname.html"
        label="assembler:uml-package-diagram/$name/$tname"
        msg=$(python3 -I "$ASM" --type uml-package-diagram --model "$f" --theme "$theme" --out "$out" 2>&1) || { fail "$label" "build failed: $msg"; continue; }
        [ -s "$out" ] || { fail "$label" "no page written"; continue; }
        check_page "$out" "$label"
        grep -q 'data-type="uml-package-diagram"' "$out" || fail "$label" "the page does not carry its type"
        grep -q 'id="view-options"' "$out" || fail "$label" "the page has no view-options slot"
        [ "$(grep -c 'U.layoutElk = ' "$out")" = 1 ] && [ "$(grep -c 'U.drawFolder = ' "$out")" = 1 ] || fail "$label" "the shared UML scripts are not inlined exactly once"
    done
done

# invalid UML package diagram models: nothing written, the validator's message shown
for f in "$ROOT"/tests/fixtures/uml-package-diagram/invalid/*.package.uml.json; do
    name=$(basename "$f" .package.uml.json)
    out="$TMP/package-invalid-$name.html"
    msg=$(python3 -I "$ASM" --type uml-package-diagram --model "$f" --out "$out" 2>&1) && fail "assembler:uml-package-diagram/invalid/$name" "accepted"
    [ ! -e "$out" ] || fail "assembler:uml-package-diagram/invalid/$name" "a page was written"
    printf '%s' "$msg" | grep -q "error: .*$name.package.uml.json: " || fail "assembler:uml-package-diagram/invalid/$name" "no error naming the model: $msg"
done

# invalid UML models: nothing written, the validator's message shown
for f in "$ROOT"/tests/fixtures/uml-class-diagram/invalid/*.uml.json; do
    name=$(basename "$f" .uml.json)
    out="$TMP/uml-invalid-$name.html"
    msg=$(python3 -I "$ASM" --type uml-class-diagram --model "$f" --out "$out" 2>&1) && fail "assembler:uml-class-diagram/invalid/$name" "accepted"
    [ ! -e "$out" ] || fail "assembler:uml-class-diagram/invalid/$name" "a page was written"
    printf '%s' "$msg" | grep -q "error: .*$name.uml.json: " || fail "assembler:uml-class-diagram/invalid/$name" "no error naming the model: $msg"
done

# a project theme written before the stereotype role existed is rejected, the token named
python3 - "$ROOT/shared/themes/default.css" "$TMP/no-stereotype.css" <<'PY'
import sys
t = "\n".join(l for l in open(sys.argv[1]).read().split("\n") if "--key-stereotype" not in l)
open(sys.argv[2], "w").write(t)
PY
out="$TMP/no-stereotype.html"
msg=$(python3 -I "$ASM" --type uml-class-diagram --model "$ROOT/tests/fixtures/uml-class-diagram/valid/small.uml.json" --theme "$TMP/no-stereotype.css" --out "$out" 2>&1) && fail "assembler:theme without --key-stereotype" "accepted"
[ ! -e "$out" ] || fail "assembler:theme without --key-stereotype" "a page was written"
printf '%s' "$msg" | grep -qF 'missing token --key-stereotype in the light block' || fail "assembler:theme without --key-stereotype" "message does not name the token: $msg"

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

# shared scripts (the "shared" list of assets/<type>.json): inlined once, in the order named, after the
# external scripts and before the type's own renderer; a missing file, a path leaving shared/ and a
# non-script stop the page, name the type and the file, and write nothing
printf '// shared-one\n' > "$CP/shared/one.js"
printf '// shared-two\n' > "$CP/shared/two.js"
printf 'not a script\n' > "$CP/shared/notes.txt"
printf '// outside\n' > "$CP/outside.js"
printf '{"scripts":[{"src":"https://cdn.jsdelivr.net/npm/elkjs@0.11.1/lib/elk.bundled.js"}],"shared":["two.js","one.js"]}\n' > "$CP/skills/erd/assets/erd.json"
python3 -I "$ASM" --type erd --model "$FIX/valid/small.erd.json" --plugin-root "$CP" --out "$TMP/shared.html" >/dev/null 2>&1 || fail "assembler:shared scripts" "build failed"
python3 -I - "$TMP/shared.html" <<'PY' || fail "assembler:shared scripts" "not inlined once, in the order named, between the external scripts and the renderer"
import sys
t = open(sys.argv[1]).read()
ext, two, one, rend = t.find("elk.bundled.js"), t.find("// shared-two"), t.find("// shared-one"), t.find("A.register('erd'")
sys.exit(0 if t.count("// shared-one") == 1 and t.count("// shared-two") == 1 and 0 < ext < two < one < rend else 1)
PY
for bad in gone.js ../outside.js notes.txt /etc/passwd; do
    printf '{"shared":["%s"]}\n' "$bad" > "$CP/skills/erd/assets/erd.json"
    rm -f "$TMP/shared-bad.html"
    msg=$(python3 -I "$ASM" --type erd --model "$FIX/valid/small.erd.json" --plugin-root "$CP" --out "$TMP/shared-bad.html" 2>&1) && fail "assembler:shared script $bad" "accepted"
    [ ! -e "$TMP/shared-bad.html" ] || fail "assembler:shared script $bad" "a page was written"
    printf '%s' "$msg" | grep -qF "type erd: shared script" || fail "assembler:shared script $bad" "message does not name the type: $msg"
    printf '%s' "$msg" | grep -qF "$bad" || fail "assembler:shared script $bad" "message does not name the file: $msg"
done
printf '{"shared":"one.js"}\n' > "$CP/skills/erd/assets/erd.json"
python3 -I "$ASM" --type erd --model "$FIX/valid/small.erd.json" --plugin-root "$CP" --out "$TMP/shared-bad.html" >/dev/null 2>&1 && fail "assembler:shared not a list" "accepted"

finish test-assembler
