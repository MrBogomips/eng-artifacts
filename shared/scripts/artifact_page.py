#!/usr/bin/env python3
"""Assemble an artifact page (python3, standard library only).

    artifact_page.py --type erd --model <file> --theme <name|path> --out <file>

Loads the artifact type from skills/<type>/ (its validator scripts/<type>_model.py, with hyphens of
the type name read as underscores: uml-class-diagram -> uml_class_diagram_model.py, its renderer
assets/<type>.js with any helper files assets/<type>-*.js that it needs, and, optionally,
assets/<type>.json naming external scripts and shared scripts), validates the model,
checks the theme against the default theme's token set, and writes ONE html file with the theme,
page styles, scripts and the model inlined. Nothing is written unless every check passes; on
failure every problem is printed and the exit status is 1 (2 for a usage error).

Inlining order: theme style first (an @import, when the theme has one, must open its stylesheet),
page style, core.js, chrome.js, the type's external scripts, the type's shared scripts (the "shared"
list of assets/<type>.json: files under shared/ that several types of one family use, in the order
named), the type renderer (its helper files first, in name order, then <type>.js), the model as JSON,
then the boot call. A theme may name system fonts only and import nothing; one that loads fonts
loads them from Google Fonts only.
"""
import argparse
import html
import importlib.util
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import theme_tokens  # noqa: E402

ALLOWED_CDN = {
    "cdn.jsdelivr.net": re.compile(r"^/npm/(@[^/@]+/)?[^/@]+@\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?/"),
    "cdnjs.cloudflare.com": re.compile(r"^/ajax/libs/[^/]+/\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?/"),
    "unpkg.com": re.compile(r"^/(@[^/@]+/)?[^/@]+@\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?/"),
}
THEME_NAME = re.compile(r"^[a-z0-9][a-z0-9-]*$")
PLACEHOLDER = re.compile(r"\{\{([A-Z_]+)\}\}")


class AssemblyError(Exception):
    """Carries every problem found; nothing is written."""

    def __init__(self, problems):
        super().__init__("; ".join(problems))
        self.problems = problems


def read_text(path, problems, what):
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except OSError as exc:
        problems.append("%s: cannot read %s: %s" % (path, what, exc.strerror or exc))
        return None


def load_validator(type_dir, art_type, problems):
    module_name = "%s_model" % art_type.replace("-", "_")  # a hyphenated type is an importable module
    path = os.path.join(type_dir, "scripts", "%s.py" % module_name)
    if not os.path.isfile(path):
        problems.append("%s: the artifact type has no validator" % path)
        return None
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
    except Exception as exc:  # a broken validator must be reported, not crash the assembler
        problems.append("%s: cannot load the validator: %s" % (path, exc))
        return None
    if not callable(getattr(module, "validate", None)):
        problems.append("%s: the validator has no validate(model) function" % path)
        return None
    return module.validate


def resolve_theme(root, theme):
    """(path, display name) of a theme given by shipped name or by file path."""
    if THEME_NAME.match(theme) and os.path.sep not in theme:
        shipped = os.path.join(root, "shared", "themes", theme + ".css")
        if os.path.isfile(shipped):
            return shipped, theme
        if not os.path.isfile(theme):
            known = sorted(f[:-4] for f in os.listdir(os.path.join(root, "shared", "themes")) if f.endswith(".css"))
            raise AssemblyError(["theme \"%s\" is neither a shipped theme (%s) nor a file" % (theme, ", ".join(known))])
    if os.path.isfile(theme):
        return theme, theme
    raise AssemblyError(["theme file %s does not exist" % theme])


def read_renderer(type_dir, art_type, problems):
    """The renderer's text: helper files assets/<type>-*.js in name order, then assets/<type>.js."""
    assets = os.path.join(type_dir, "assets")
    names = []
    if os.path.isdir(assets):
        names = sorted(n for n in os.listdir(assets) if n.startswith(art_type + "-") and n.endswith(".js"))
    names.append("%s.js" % art_type)
    parts = [read_text(os.path.join(assets, n), problems, "the renderer") for n in names]
    return None if None in parts else "\n".join(parts)


def check_external_scripts(scripts, problems):
    out = []
    for i, s in enumerate(scripts):
        src = s.get("src", "") if isinstance(s, dict) else ""
        m = re.match(r"^https://([^/]+)(/.*)$", src)
        if not m or m.group(1) not in ALLOWED_CDN:
            problems.append("external script %d (%s): must be an https URL on %s" % (i, src, ", ".join(sorted(ALLOWED_CDN))))
            continue
        if not ALLOWED_CDN[m.group(1)].match(m.group(2)):
            problems.append("external script %d (%s): the URL must name an exact version" % (i, src))
            continue
        out.append(s)
    return out


def shared_script_path(base, art_type, name, problems):
    """The real path of a shared script, or None after reporting why it cannot be used."""
    if not isinstance(name, str) or not name or os.path.isabs(name):
        problems.append("type %s: shared script %r is not a relative path inside shared/" % (art_type, name))
        return None
    full = os.path.realpath(os.path.join(base, name))
    if os.path.commonpath([base, full]) != base:
        problems.append("type %s: shared script \"%s\" leaves the shared/ folder" % (art_type, name))
    elif not name.endswith(".js"):
        problems.append("type %s: shared script \"%s\" is not a .js file" % (art_type, name))
    elif not os.path.isfile(full):
        problems.append("type %s: shared script \"%s\" does not exist" % (art_type, name))
    else:
        return full
    return None


def read_shared_scripts(root, art_type, names, problems):
    """The text of the shared scripts a type names, in the order named, or None after reporting every
    problem found (each names the type and the file)."""
    if not isinstance(names, list):
        problems.append("type %s: \"shared\" in assets/%s.json must be a list of file paths" % (art_type, art_type))
        return None
    base = os.path.realpath(os.path.join(root, "shared"))
    paths = [shared_script_path(base, art_type, n, problems) for n in names]
    if None in paths:
        return None
    texts = [read_text(p, problems, "the shared script") for p in paths]
    return None if None in texts else texts


def script_tag(s):
    attrs = ' src="%s"' % html.escape(s["src"], quote=True)
    if s.get("integrity"):
        attrs += ' integrity="%s" crossorigin="anonymous"' % html.escape(s["integrity"], quote=True)
    return "<script%s></script>" % attrs


def safe_inline(text, closer, label, problems):
    if re.search(r"</\s*%s" % closer, text, re.I):
        problems.append("%s contains </%s, which cannot be inlined" % (label, closer))
    return text


def json_for_script(model):
    """JSON safe inside <script type=application/json>: no early close, no HTML comment opener."""
    text = json.dumps(model, ensure_ascii=False, indent=1, sort_keys=False)
    return (text.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
            .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))


def assemble(root, art_type, model_path, theme, problems=None):
    """Return the page as text, or raise AssemblyError with every problem."""
    problems = [] if problems is None else problems
    type_dir = os.path.join(root, "skills", art_type)
    if not re.match(r"^[a-z][a-z0-9-]*$", art_type) or not os.path.isdir(type_dir):
        known = sorted(d for d in os.listdir(os.path.join(root, "skills"))
                       if os.path.isdir(os.path.join(root, "skills", d))) if os.path.isdir(os.path.join(root, "skills")) else []
        raise AssemblyError(["unknown artifact type \"%s\" (known: %s)" % (art_type, ", ".join(known))])

    # model
    model = None
    raw = read_text(model_path, problems, "the model")
    if raw is not None:
        try:
            model = json.loads(raw)
        except ValueError as exc:
            problems.append("%s: the model is not valid JSON: %s" % (model_path, exc))
    validate = load_validator(type_dir, art_type, problems)
    if model is not None and validate is not None:
        for err in validate(model):
            problems.append("%s: %s" % (model_path, err))

    # theme
    theme_text = None
    try:
        theme_path, theme_name = resolve_theme(root, theme)
    except AssemblyError as exc:
        problems.extend(exc.problems)
        theme_path = None
    if theme_path:
        theme_text = read_text(theme_path, problems, "the theme")
        default_text = read_text(os.path.join(root, "shared", "themes", "default.css"), problems, "the default theme")
        if theme_text is not None and default_text is not None:
            for p in theme_tokens.missing_tokens(default_text, theme_text):
                problems.append("theme %s: %s" % (theme_path, p))

    # parts
    shell = read_text(os.path.join(root, "shared", "page", "shell.html"), problems, "the page shell")
    page_css = read_text(os.path.join(root, "shared", "page", "page.css"), problems, "the page styles")
    core_js = read_text(os.path.join(root, "shared", "page", "core.js"), problems, "the page core")
    chrome_js = read_text(os.path.join(root, "shared", "page", "chrome.js"), problems, "the page chrome")
    type_js = read_renderer(type_dir, art_type, problems)
    scripts = []
    shared_names = []
    manifest = os.path.join(type_dir, "assets", "%s.json" % art_type)
    if os.path.isfile(manifest):
        mtext = read_text(manifest, problems, "the type manifest")
        try:
            data = json.loads(mtext) if mtext else {}
            scripts = data.get("scripts", [])
            shared_names = data.get("shared", [])
        except (ValueError, AttributeError) as exc:
            problems.append("%s: not valid JSON, or not an object: %s" % (manifest, exc))
    scripts = check_external_scripts(scripts, problems)
    shared_parts = read_shared_scripts(root, art_type, shared_names, problems)

    if problems or None in (shell, page_css, core_js, chrome_js, type_js, shared_parts, theme_text, model):
        raise AssemblyError(problems)

    for text, closer, label in ((theme_text, "style", "the theme"), (page_css, "style", "page.css"),
                                (core_js, "script", "core.js"), (chrome_js, "script", "chrome.js"),
                                (type_js, "script", "the renderer")):
        safe_inline(text, closer, label, problems)
    for name, text in zip(shared_names, shared_parts):
        safe_inline(text, "script", "shared/%s" % name, problems)
    if problems:
        raise AssemblyError(problems)

    title = str(model["title"])
    desc = model.get("description")
    values = {
        "TITLE": html.escape(title),
        "TYPE": html.escape(art_type, quote=True),
        "DESCRIPTION": ('      <p class="page-desc">%s</p>' % html.escape(desc)) if desc else "",
        "THEME_CSS": theme_text,
        "PAGE_CSS": page_css,
        "CORE_JS": core_js,
        "CHROME_JS": chrome_js,
        "EXTERNAL_SCRIPTS": "\n".join(script_tag(s) for s in scripts),
        "TYPE_JS": "\n".join(shared_parts + [type_js]),
        "MODEL_JSON": json_for_script(model),
    }
    unknown = sorted(set(PLACEHOLDER.findall(shell)) - set(values))
    if unknown:
        raise AssemblyError(["shell.html uses unknown placeholders: %s" % ", ".join(unknown)])
    # one pass: substituted content is never scanned again for placeholders
    return PLACEHOLDER.sub(lambda m: values[m.group(1)], shell)


def parse_args(argv):
    p = argparse.ArgumentParser(description="Assemble an artifact page from a model, a type and a theme.")
    p.add_argument("--type", required=True, help="artifact type, a folder under skills/ (for example erd)")
    p.add_argument("--model", required=True, help="the model file")
    p.add_argument("--theme", default="default", help="a shipped theme name (default, alt) or a path to a theme file")
    p.add_argument("--out", required=True, help="the output html file")
    p.add_argument("--plugin-root", default=os.path.dirname(os.path.dirname(HERE)),
                   help="the plugin root (default: derived from this script's location)")
    return p.parse_args(argv)


def main(argv):
    args = parse_args(argv)
    try:
        page = assemble(args.plugin_root, args.type, args.model, args.theme)
    except AssemblyError as exc:
        for problem in exc.problems:
            print("error: %s" % problem, file=sys.stderr)
        print("no page written (%d problem%s)" % (len(exc.problems), "" if len(exc.problems) == 1 else "s"),
              file=sys.stderr)
        return 1
    out = os.path.abspath(args.out)
    try:
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(page)
    except OSError as exc:
        print("error: cannot write %s: %s" % (out, exc.strerror or exc), file=sys.stderr)
        return 1
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
