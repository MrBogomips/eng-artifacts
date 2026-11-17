"""Theme file parsing shared by the structural tests (standard library only)."""
import os
import re
import sys

COLOR_RE = re.compile(r"^(#[0-9a-fA-F]{3,8}|rgba?\(.*\)|hsla?\(.*\))$")
GENERIC_FAMILIES = {"serif", "sans-serif", "monospace", "system-ui", "ui-monospace",
                    "ui-sans-serif", "ui-serif", "cursive", "fantasy"}

GROUPS = {
    "surfaces": lambda n: n in ("canvas", "surface", "node"),
    "ink": lambda n: n in ("ink", "ink-2", "line", "grid", "neutral"),
    "emphasis": lambda n: n in ("accent", "mark", "band-ink"),
    "status": lambda n: n.startswith("status-"),
    "groups": lambda n: n.startswith("group-"),
    "keys": lambda n: n.startswith("key-"),
    "fonts": lambda n: n.startswith("font-"),
    "geometry": lambda n: n in ("radius", "stroke", "arrowhead", "panel-radius", "zone-radius"),
    "treatment": lambda n: n.endswith("-mix") or n == "dim",
}


def parse_theme(path):
    """Return dict with the import, light, dark_media, dark_explicit token maps.

    The token blocks are read by the same code the page assembler uses (shared/scripts/theme_tokens.py),
    so the tests and the assembler cannot disagree about what a theme contains.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(here, "..", "..", "shared", "scripts"))
    import theme_tokens
    raw = open(path, encoding="utf-8").read()
    text = theme_tokens._strip_comments(raw)
    light, dark_media, dark_explicit = theme_tokens.read_theme(raw)
    return {
        "imports": theme_tokens.font_sources(raw),
        "font_problems": theme_tokens.font_source_problems(raw),
        "light": light or {},
        "dark_media": dark_media or {},
        "dark_explicit": dark_explicit or {},
        "has_light": light is not None,
        "has_dark_media": dark_media is not None,
        "has_dark_explicit": dark_explicit is not None,
    }


def is_color(value):
    return bool(COLOR_RE.match(value))


def vocabulary_from_design(path):
    """Token names in the 'Roles and tokens' table of design.md."""
    text = open(path, encoding="utf-8").read()
    sec = text[text.index("## Roles and tokens"):text.index("## How a role is drawn")]
    names = set()
    for line in sec.splitlines():
        if not line.startswith("|") or line.startswith("|---") or line.startswith("| Token"):
            continue
        cell = line.split("|")[1]
        found = re.findall(r"`(--[a-z0-9-]+)`", cell)
        if "…" in cell and len(found) == 2:
            m1 = re.match(r"(--[a-z-]+)-(\d+)$", found[0])
            m2 = re.match(r"(--[a-z-]+)-(\d+)$", found[1])
            for n in range(int(m1.group(2)), int(m2.group(2)) + 1):
                names.add("%s-%d" % (m1.group(1), n))
        else:
            names.update(found)
    return names


def font_families(value):
    fams = []
    for part in value.split(","):
        part = part.strip().strip('"').strip("'")
        if part:
            fams.append(part)
    return fams
