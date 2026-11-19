#!/usr/bin/env bash
# The shared scripts an artifact type names: every "shared" entry of every skills/<type>/assets/<type>.json
# is a relative path of an existing .js file that stays inside shared/ once ".." and links are resolved.
# A problem names the type and the file, as the assembler does.
# Usage: validate-shared-scripts.sh [plugin-root]
set -u
. "$(dirname "$0")/lib.sh"
need python3

BASE="${1:-$ROOT}"

out=$(python3 -I - "$BASE" <<'PY'
import glob, json, os, sys

root = os.path.realpath(sys.argv[1])
shared = os.path.join(root, "shared")
for manifest in sorted(glob.glob(os.path.join(root, "skills", "*", "assets", "*.json"))):
    art_type = os.path.basename(os.path.dirname(os.path.dirname(manifest)))
    if os.path.basename(manifest) != art_type + ".json":
        continue
    rel = os.path.relpath(manifest, root)
    try:
        with open(manifest, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError) as exc:
        print("%s: cannot read the manifest: %s" % (rel, exc))
        continue
    names = data.get("shared", []) if isinstance(data, dict) else []
    if not isinstance(names, list):
        print("%s: type %s: \"shared\" must be a list of file paths" % (rel, art_type))
        continue
    for name in names:
        if not isinstance(name, str) or not name or os.path.isabs(name):
            print("%s: type %s: shared script %r is not a relative path inside shared/" % (rel, art_type, name))
            continue
        full = os.path.realpath(os.path.join(shared, name))
        if os.path.commonpath([shared, full]) != shared:
            print("%s: type %s: shared script \"%s\" leaves the shared/ folder" % (rel, art_type, name))
        elif not name.endswith(".js"):
            print("%s: type %s: shared script \"%s\" is not a .js file" % (rel, art_type, name))
        elif not os.path.isfile(full):
            print("%s: type %s: shared script \"%s\" does not exist" % (rel, art_type, name))
PY
)
if [ -n "$out" ]; then
    printf '%s\n' "$out"
    FAILURES=$((FAILURES + $(printf '%s\n' "$out" | grep -c .)))
fi

finish validate-shared-scripts
