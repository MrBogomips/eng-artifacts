"""Reading the token set of a theme file (python3, standard library only).

A theme is a CSS file with light values on :root, the dark values under the system preference and
the same dark values under an explicit :root[data-theme="dark"]. Used by the page assembler to
check a theme against the default theme's token set.
"""
import re

COLOR_RE = re.compile(r"^(#[0-9a-fA-F]{3,8}|rgba?\(.*\)|hsla?\(.*\))$")
BLOCKS = ("light", "dark (system preference)", "dark (explicit choice)")


def _strip_comments(text):
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def _block(text, opener):
    """Body of the first brace block that begins with `opener`, or None."""
    i = text.find(opener)
    if i < 0:
        return None
    j = text.find("{", i + len(opener) - 1 if opener.endswith("{") else i)
    if j < 0:
        return None
    depth = 0
    for k in range(j, len(text)):
        if text[k] == "{":
            depth += 1
        elif text[k] == "}":
            depth -= 1
            if depth == 0:
                return text[j + 1:k]
    return None


def _declarations(body):
    return {m.group(1): " ".join(m.group(2).split())
            for m in re.finditer(r"(--[a-z0-9-]+)\s*:\s*([^;]+);", body or "")}


def read_theme(text):
    """Return the three token maps of a theme's source, in the order of BLOCKS (None if absent)."""
    src = _strip_comments(text)
    media = _block(src, "@media (prefers-color-scheme: dark)")
    bodies = (
        _block(src, ":root {"),
        _block(media, ':root:not([data-theme="light"])') if media else None,
        _block(src, ':root[data-theme="dark"]'),
    )
    return tuple(None if body is None else _declarations(body) for body in bodies)


def is_color(value):
    return bool(COLOR_RE.match(value))


def missing_tokens(reference_text, theme_text):
    """Every problem of a theme measured against the reference (default) theme, as messages."""
    ref = read_theme(reference_text)
    got = read_theme(theme_text)
    problems = []
    if not _strip_comments(theme_text).lstrip().startswith("@import"):
        problems.append("the theme must open with an @import of its Google Fonts stylesheet")
    for idx, label in enumerate(BLOCKS):
        if got[idx] is None:
            problems.append("missing the %s block" % label)
            continue
        for tok in sorted(set(ref[idx] or {}) - set(got[idx])):
            problems.append("missing token %s in the %s block" % (tok, label))
    return problems
