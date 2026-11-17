#!/usr/bin/env bash
# VC-1 and the plugin boundary, as static checks.
#  1. No hex, rgb(), hsl() or named color and no font family name in shared/ or skills/ outside
#     shared/themes/ (sample models *.erd.json are content and are ignored).
#  2. No plugin file references the development harness (.claude/, .agents/, openspec/, tests/,
#     evals/, _agents_workspace/).
# Usage: validate-style-source.sh [plugin-root]
set -u
. "$(dirname "$0")/lib.sh"

BASE="${1:-$ROOT}"
cd "$BASE" || exit 2
DIRS=""
for d in shared skills; do [ -d "$d" ] && DIRS="$DIRS $d"; done
[ -n "$DIRS" ] || { fail "$BASE" "no shared/ or skills/ directory"; finish validate-style-source; }

NAMED='aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen'

# Font families: the generic ones, a few common ones, and every family a shipped theme names.
FAMILIES='sans-serif|monospace|system-ui|ui-monospace|ui-sans-serif|ui-serif|-apple-system|Segoe UI|Helvetica|Arial|Georgia|Menlo|Consolas|Times New Roman|Courier|Roboto|Verdana|Tahoma'
if [ -d shared/themes ]; then
    for f in shared/themes/*.css; do
        [ -f "$f" ] || continue
        for fam in $(grep -E '^[[:space:]]*--font-[a-z]+:' "$f" | sed -E 's/^[^:]*://; s/;.*$//' | tr ',' '\n' \
                     | sed -E 's/^[[:space:]]*"?//; s/"?[[:space:]]*$//' | grep -E '^[A-Za-z]+$' | sort -u); do
            FAMILIES="$FAMILIES|$fam"
        done
        for fam in $(grep -E '^[[:space:]]*--font-[a-z]+:' "$f" | sed -E 's/^[^:]*://; s/;.*$//' | tr ',' '\n' \
                     | sed -E 's/^[[:space:]]*"//; s/"[[:space:]]*$//' | grep -E '^[A-Za-z]+ [A-Za-z ]+$' | sort -u); do
            FAMILIES="$FAMILIES|$fam"
        done
    done
fi

files() {
    find $DIRS -type f ! -path 'shared/themes/*' ! -name '*.erd.json' -print0
}

scan() { # scan <label> <ERE>
    files | xargs -0 grep -HInE -e "$2" 2>/dev/null | while IFS= read -r hit; do
        file="${hit%%:*}"; rest="${hit#*:}"; line="${rest%%:*}"
        printf '%s:%s: %s\n' "$file" "$line" "$1"
    done
}

report() {
    local out="$1"
    [ -z "$out" ] && return 0
    printf '%s\n' "$out"
    FAILURES=$((FAILURES + $(printf '%s\n' "$out" | grep -c .)))
}

report "$(scan 'hex color literal' '#[0-9a-fA-F]{3,8}([^0-9a-zA-Z_-]|$)')"
report "$(scan 'rgb()/hsl() color literal' '(rgb|hsl)a?\(')"
report "$(scan 'named color literal' "[\"'](${NAMED})[\"']|(color|fill|stroke|background|border|outline)[a-z-]*[[:space:]]*[:=][[:space:]]*[\"']?(${NAMED})([^a-z-]|\$)")"
report "$(scan 'font family name outside the themes' "(^|[^A-Za-z0-9_-])(${FAMILIES})([^A-Za-z0-9_-]|\$)|font-family[[:space:]]*:[[:space:]]*[^v[:space:]]|font-family[[:space:]]*:[[:space:]]*v[^a]")"
report "$(scan 'reference to the development harness' '(^|[^A-Za-z0-9_.-])(\.claude/|\.agents/|openspec/|tests/|evals/|_agents_workspace/)')"

finish validate-style-source
