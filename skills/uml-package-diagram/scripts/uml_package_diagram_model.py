#!/usr/bin/env python3
"""Validation of a UML package diagram model (python3, standard library only).

    validate(model) -> list[str]                     every problem found, empty when the model is valid
    python3 uml_package_diagram_model.py <model.json>   print the problems, exit 1 when there are any

The model format is described in ../references/model.md.
"""
import json
import re
import sys

MAX_PACKAGES = 16
MEMBER_KINDS = ("class", "interface", "enumeration")
DEPENDENCY_KINDS = ("import", "access", "merge", "dependency")

MODEL_FIELDS = ("title", "description", "packages", "dependencies")
PACKAGE_FIELDS = ("id", "name", "parent", "stereotypes", "members")
MEMBER_FIELDS = ("name", "kind")
DEPENDENCY_FIELDS = ("from", "to", "kind", "label")

# Markup, as far as a model can tell it from a generic type such as List<Book>: a closing tag, a comment
# or declaration, or an opening tag of an HTML element that no type is named after (a one-letter element
# only with an attribute).
MARKUP = re.compile(
    r"</|<[!?]|"
    r"<\s*(script|style|iframe|object|embed|link|meta|svg|img|form|input|div|span|table|html|body|head|base|"
    r"template|button|textarea|br|hr)(?=[\s/>])|"
    r"<\s*[a-z]\s+[a-z-]+\s*=",
    re.I)


def _q(value):
    return '"%s"' % value


def _nonempty(value):
    return isinstance(value, str) and value.strip() != ""


def _check_fields(obj, allowed, where, errors):
    for key in obj:
        if key not in allowed:
            errors.append("%s: unknown field %s; a model holds data only (allowed: %s), never markup, "
                          "styles, scripts or positions" % (where, _q(key), ", ".join(allowed)))


def _scan_markup(value, where, errors):
    if isinstance(value, str):
        if MARKUP.search(value):
            errors.append("%s: contains markup; write plain text only" % where)
    elif isinstance(value, dict):
        for k, v in value.items():
            _scan_markup(v, "%s.%s" % (where, k), errors)
    elif isinstance(value, list):
        for i, v in enumerate(value):
            _scan_markup(v, "%s[%d]" % (where, i), errors)


def _validate_member(m, pid, j, errors):
    where = "package %s, members[%d]" % (_q(pid), j)
    if not isinstance(m, dict):
        errors.append("%s: must be an object with a name" % where)
        return None
    _check_fields(m, MEMBER_FIELDS, where, errors)
    name = m.get("name")
    if not _nonempty(name):
        errors.append("%s: name is required (a non-empty string)" % where)
        return None
    if "kind" in m and m["kind"] not in MEMBER_KINDS:
        errors.append("package %s, member %s: kind %s is not allowed; use one of: %s"
                      % (_q(pid), _q(name), _q(m["kind"]), ", ".join(MEMBER_KINDS)))
    return name


def _validate_package(p, i, errors):
    """Return the id of a package, or None when it has no usable id."""
    where = "packages[%d]" % i
    if not isinstance(p, dict):
        errors.append("%s: must be an object with an id and a name" % where)
        return None
    pid = p.get("id")
    if not _nonempty(pid):
        errors.append("%s: id is required (a non-empty string)" % where)
        return None
    pw = "package %s" % _q(pid)
    _check_fields(p, PACKAGE_FIELDS, pw, errors)
    if not _nonempty(p.get("name")):
        errors.append("%s: name is required (a non-empty string)" % pw)
    if "parent" in p and not _nonempty(p["parent"]):
        errors.append("%s: parent must be a package id" % pw)
    if "stereotypes" in p:
        st = p["stereotypes"]
        if not isinstance(st, list) or not all(_nonempty(v) for v in st):
            errors.append("%s: stereotypes must be a list of non-empty text values" % pw)
    members = p.get("members", [])
    if not isinstance(members, list):
        errors.append("%s: members must be a list" % pw)
    else:
        seen = set()
        for j, m in enumerate(members):
            name = _validate_member(m, pid, j, errors)
            if name is not None:
                if name in seen:
                    errors.append("%s: duplicate member %s" % (pw, _q(name)))
                seen.add(name)
    return pid


def _nesting_cycle(parents):
    """The first cycle of the parent links as a list of ids closed on its start, or None."""
    for start in parents:
        chain, node = [], start
        while node in parents and node not in chain:
            chain.append(node)
            node = parents[node]
        if node in chain:
            return chain[chain.index(node):] + [node]
    return None


def _validate_packages(model, errors):
    """Return ({id: parent id or None}, ids)."""
    parents, ids = {}, set()
    packages = model.get("packages")
    if not isinstance(packages, list) or not packages:
        errors.append("packages: at least one package is required")
        return parents
    if len(packages) > MAX_PACKAGES:
        errors.append("packages: %d packages, at most %d are allowed (the five group colors cycle, and every "
                      "package is named); merge packages or split the diagram" % (len(packages), MAX_PACKAGES))
    for i, p in enumerate(packages):
        pid = _validate_package(p, i, errors)
        if pid is None:
            continue
        if pid in ids:
            errors.append("packages[%d]: duplicate package id %s" % (i, _q(pid)))
            continue
        ids.add(pid)
        parents[pid] = p.get("parent") if _nonempty(p.get("parent")) else None
    for pid, parent in list(parents.items()):
        if parent is not None and parent not in ids:
            errors.append("package %s: unknown parent %s (known packages: %s)" % (_q(pid), _q(parent), ", ".join(sorted(ids))))
            parents[pid] = None
    cycle = _nesting_cycle({k: v for k, v in parents.items() if v is not None})
    if cycle:
        errors.append("packages: nesting cycle %s" % " -> ".join(cycle))
        for pid in cycle:
            parents[pid] = None
    return parents


def _ancestors(pid, parents):
    out, node = set(), parents.get(pid)
    while node is not None and node not in out:
        out.add(node)
        node = parents.get(node)
    return out


def _validate_dependencies(model, parents, errors):
    deps = model.get("dependencies", [])
    if not isinstance(deps, list):
        errors.append("dependencies: must be a list")
        return
    for i, d in enumerate(deps):
        if not isinstance(d, dict):
            errors.append("dependencies[%d]: must be an object" % i)
            continue
        label = "dependencies[%d] (%s -> %s)" % (i, d.get("from"), d.get("to"))
        _check_fields(d, DEPENDENCY_FIELDS, label, errors)
        kind = d.get("kind")
        if kind not in DEPENDENCY_KINDS:
            errors.append("%s: kind %s is not allowed; use one of: %s"
                          % (label, _q(kind) if kind is not None else "missing", ", ".join(DEPENDENCY_KINDS)))
        known = True
        for end in ("from", "to"):
            v = d.get(end)
            if not _nonempty(v):
                errors.append("%s: %s is required (a package id)" % (label, _q(end)))
                known = False
            elif v not in parents:
                errors.append("%s: unknown package %s in %s" % (label, _q(v), _q(end)))
                known = False
        if "label" in d and not _nonempty(d["label"]):
            errors.append("%s: label must be a non-empty string" % label)
        if not known:
            continue
        a, b = d["from"], d["to"]
        if a == b:
            errors.append("%s: a package cannot depend on itself" % label)
        elif b in _ancestors(a, parents) or a in _ancestors(b, parents):
            errors.append("%s: a package cannot depend on a package that contains it or that it contains; "
                          "nesting already says so" % label)


def validate(model):
    """Return the list of problems found in a UML package diagram model; an empty list means valid."""
    errors = []
    if not isinstance(model, dict):
        return ["model: must be a JSON object"]
    _check_fields(model, MODEL_FIELDS, "model", errors)
    if not _nonempty(model.get("title")):
        errors.append("title: required (a non-empty string)")
    if "description" in model and not isinstance(model["description"], str):
        errors.append("description: must be text")
    parents = _validate_packages(model, errors)
    _validate_dependencies(model, parents, errors)
    _scan_markup(model, "model", errors)
    return errors


def main(argv):
    if len(argv) != 2:
        print("usage: uml_package_diagram_model.py <model.json>", file=sys.stderr)
        return 2
    try:
        with open(argv[1], encoding="utf-8") as fh:
            model = json.load(fh)
    except (OSError, ValueError) as exc:
        print("%s: cannot read the model: %s" % (argv[1], exc), file=sys.stderr)
        return 2
    problems = validate(model)
    for p in problems:
        print("%s: %s" % (argv[1], p))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
