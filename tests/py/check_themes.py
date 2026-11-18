"""validate-themes: token sets, light and dark blocks, fonts and font sources, vocabulary, alternate vs default."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from colorlib import contrast, mix, parse_hex
from themelib import (GENERIC_FAMILIES, GROUPS, font_families, is_color, parse_theme,
                      vocabulary_from_design)

KEY_ROLES = ("--key-primary", "--key-foreign", "--key-unique", "--key-stereotype")

root, theme_dir = sys.argv[1], sys.argv[2]
design = os.path.join(root, ".claude/skills/visual-contract/references/design.md")
problems = []


def rel(p):
    return os.path.relpath(p, root) if p.startswith(root) else p


def bad(path, msg):
    problems.append("%s: %s" % (rel(path), msg))


paths = {n: os.path.join(theme_dir, n + ".css") for n in ("default", "alt")}
themes = {}
for name, p in paths.items():
    if not os.path.isfile(p):
        bad(p, "missing")
        continue
    themes[name] = parse_theme(p)

for name, t in themes.items():
    p = paths[name]
    if not (t["has_light"] and t["has_dark_media"] and t["has_dark_explicit"]):
        bad(p, "needs a :root block, a prefers-color-scheme dark block and a :root[data-theme=\"dark\"] block")
        continue
    # a theme may load no web font at all; one that loads fonts loads them from Google Fonts only
    for problem in t["font_problems"]:
        bad(p, problem)
    light = t["light"]
    dm, de = t["dark_media"], t["dark_explicit"]
    color_light = {k for k, v in light.items() if is_color(v)}
    # every color token in all three blocks
    for tok in sorted(color_light):
        for label, block in (("system-dark block", dm), ("explicit-dark block", de)):
            if tok not in block:
                bad(p, "color token %s missing from the %s" % (tok, label))
    for label, block in (("system-dark block", dm), ("explicit-dark block", de)):
        for tok in sorted(set(block) - color_light):
            if tok != "color-scheme":
                bad(p, "token %s in the %s has no light value" % (tok, label))
    # identical dark blocks
    for tok in sorted(set(dm) | set(de)):
        if dm.get(tok) != de.get(tok):
            bad(p, "dark blocks differ on %s (%s vs %s)" % (tok, dm.get(tok), de.get(tok)))
    # the four key roles, each with a light and a dark value, each legible (4.5:1) on its chip ground
    chip_mix = light.get("--chip-mix", "").rstrip("%")
    for tok in KEY_ROLES:
        if tok not in light:
            bad(p, "key role %s is missing" % tok)
    for label, block in (("light", light), ("dark", dm)):
        try:
            node, pct = block.get("--node") or light["--node"], float(chip_mix)
        except (KeyError, ValueError):
            bad(p, "cannot check the key chips: --node or --chip-mix is missing or not a number")
            break
        for tok in KEY_ROLES:
            if tok not in block:
                continue
            try:
                ratio = contrast(parse_hex(block[tok]), mix(block[tok], pct, node))
            except ValueError as e:
                bad(p, "%s in the %s block: %s" % (tok, label, e))
                continue
            if ratio < 4.5:
                bad(p, "%s on its chip ground in %s is %.2f:1, below 4.5:1" % (tok, label, ratio))
    # the text of a view option: --node on its selected ground (--accent), --ink on the others (--grid)
    for label, block in (("light", light), ("dark", dm)):
        for fg, bg in (("--node", "--accent"), ("--ink", "--grid")):
            if fg in block and bg in block:
                ratio = contrast(parse_hex(block[fg]), parse_hex(block[bg]))
                if ratio < 4.5:
                    bad(p, "%s on %s in %s is %.2f:1, below 4.5:1 (the text of a view option)" % (fg, bg, label, ratio))
    # fonts: fallback stack ending in a generic family, and import matches the families used
    fam_used = set()
    for tok in ("--font-display", "--font-body", "--font-data"):
        if tok not in light:
            continue
        fams = font_families(light[tok])
        if len(fams) < 2 or fams[-1] not in GENERIC_FAMILIES:
            bad(p, "%s needs a fallback stack ending in a generic family" % tok)
        fam_used.add(fams[0])
    imported = set()
    for u in t["imports"]:
        for m in re.finditer(r"family=([^:&]+)", u):
            imported.add(m.group(1).replace("+", " "))
    if t["imports"]:  # web fonts are loaded: the families named must be the families loaded
        for f in sorted(fam_used - imported):
            bad(p, "font \"%s\" is used by a font token but not loaded by the @import" % f)
        for f in sorted(imported - fam_used):
            bad(p, "font \"%s\" is loaded by the @import but no font token uses it" % f)

# same token set in every theme
if "default" in themes:
    ref = themes["default"]
    ref_light, ref_dark = set(ref["light"]), set(ref["dark_media"])
    for name, t in themes.items():
        if name == "default":
            continue
        for tok in sorted(ref_light - set(t["light"])):
            bad(paths[name], "token %s defined by the default theme is missing" % tok)
        for tok in sorted(set(t["light"]) - ref_light):
            bad(paths[name], "token %s is not defined by the default theme" % tok)
        for tok in sorted(ref_dark - set(t["dark_media"])):
            bad(paths[name], "dark token %s defined by the default theme is missing" % tok)

    # default tokens equal to the vocabulary of design.md
    if os.path.isfile(design):
        vocab = vocabulary_from_design(design)
        have = {k for k in ref["light"]}
        for tok in sorted(vocab - have):
            bad(paths["default"], "token %s is in the vocabulary of design.md but not in the theme" % tok)
        for tok in sorted(have - vocab):
            bad(paths["default"], "token %s is in the theme but not in the vocabulary of design.md" % tok)
    else:
        bad(design, "missing: cannot compare the vocabulary")

    # alternate differs from the default in every group
    if "alt" in themes:
        alt = themes["alt"]
        for gname, pred in GROUPS.items():
            toks = [k for k in ref["light"] if pred(k[2:])]
            if not toks:
                bad(paths["default"], "token group %s has no tokens" % gname)
                continue
            differs = any(
                ref["light"].get(k) != alt["light"].get(k)
                or ref["dark_media"].get(k) != alt["dark_media"].get(k)
                for k in toks)
            if not differs:
                bad(paths["alt"], "token group %s does not differ from the default theme" % gname)

for p in problems:
    print(p)
sys.exit(1 if problems else 0)
