#!/usr/bin/env python3
"""Validation of a UML object diagram model (python3, standard library only).

    validate(model) -> list[str]                    every problem found, empty when the model is valid
    python3 uml_object_diagram_model.py <model.json>   print the problems, exit 1 when there are any

The model format is described in ../references/model.md.
"""
import json
import re
import sys

MAX_PACKAGES = 16

MODEL_FIELDS = ("title", "description", "packages", "objects", "links")
PACKAGE_FIELDS = ("id", "label")
OBJECT_FIELDS = ("id", "class", "name", "package", "stereotypes", "slots", "literal")
SLOT_FIELDS = ("name", "type", "value")
LINK_FIELDS = ("from", "to", "name", "fromEnd", "toEnd")
END_FIELDS = ("role", "navigable")

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


def _string_list(value, where, errors):
    if not isinstance(value, list) or not all(_nonempty(v) for v in value):
        errors.append("%s: must be a list of non-empty text values" % where)
        return False
    return True


def _validate_packages(model, errors):
    ids = set()
    packages = model.get("packages", [])
    if not isinstance(packages, list):
        errors.append("packages: must be a list")
        return ids
    if len(packages) > MAX_PACKAGES:
        errors.append("packages: %d packages, at most %d are allowed (the five group colors cycle, and every "
                      "zone is labelled); merge packages or split the diagram" % (len(packages), MAX_PACKAGES))
    for i, p in enumerate(packages):
        where = "packages[%d]" % i
        if not isinstance(p, dict):
            errors.append("%s: must be an object with id and label" % where)
            continue
        _check_fields(p, PACKAGE_FIELDS, where, errors)
        pid = p.get("id")
        if not _nonempty(pid):
            errors.append("%s: id is required (a non-empty string)" % where)
            continue
        if pid in ids:
            errors.append("%s: duplicate package id %s" % (where, _q(pid)))
        ids.add(pid)
        if "label" in p and not _nonempty(p["label"]):
            errors.append("%s: label must be a non-empty string" % where)
    return ids


def _validate_slot(s, oid, j, errors):
    where = "object %s, slots[%d]" % (_q(oid), j)
    if not isinstance(s, dict):
        errors.append("%s: must be an object with a name and a value" % where)
        return None
    _check_fields(s, SLOT_FIELDS, where, errors)
    name = s.get("name")
    if not _nonempty(name):
        errors.append("%s: name is required (a non-empty string)" % where)
        return None
    where = "object %s, slot %s" % (_q(oid), _q(name))
    if "value" not in s:
        errors.append("%s: value is required (text, as it is to be shown)" % where)
    elif not isinstance(s["value"], str):
        errors.append("%s: value must be text" % where)
    if "type" in s and not _nonempty(s["type"]):
        errors.append("%s: type must be a non-empty string" % where)
    return name


def _validate_object(o, i, package_ids, errors):
    """Return the id of an object, or None when it has no usable id."""
    where = "objects[%d]" % i
    if not isinstance(o, dict):
        errors.append("%s: must be an object with an id and a class" % where)
        return None
    oid = o.get("id")
    if not _nonempty(oid):
        errors.append("%s: id is required (a non-empty string)" % where)
        return None
    ow = "object %s" % _q(oid)
    _check_fields(o, OBJECT_FIELDS, ow, errors)
    if not _nonempty(o.get("class")):
        errors.append("%s: class is required (the name of the instance's classifier)" % ow)
    if "name" in o and not _nonempty(o["name"]):
        errors.append("%s: name must be a non-empty string (leave it out for an anonymous instance)" % ow)
    pkg = o.get("package")
    if pkg is not None and pkg not in package_ids:
        known = ", ".join(sorted(package_ids)) if package_ids else "none defined"
        errors.append("%s: unknown package %s (known packages: %s)" % (ow, _q(pkg), known))
    if "stereotypes" in o:
        _string_list(o["stereotypes"], "%s: stereotypes" % ow, errors)
    literal = "literal" in o
    if literal:
        if not _nonempty(o["literal"]):
            errors.append("%s: literal must be a non-empty string" % ow)
        if "name" in o:
            errors.append("%s: an enumeration literal takes its title from the literal; drop the name" % ow)
    slots = o.get("slots", [])
    if not isinstance(slots, list):
        errors.append("%s: slots must be a list" % ow)
    else:
        if literal and slots:
            errors.append("%s: an enumeration literal has no slots" % ow)
        seen = set()
        for j, s in enumerate(slots):
            name = _validate_slot(s, oid, j, errors)
            if name is not None:
                if name in seen:
                    errors.append("%s: duplicate slot %s" % (ow, _q(name)))
                seen.add(name)
    return oid


def _validate_objects(model, package_ids, errors):
    ids = set()
    objects = model.get("objects")
    if not isinstance(objects, list) or not objects:
        errors.append("objects: at least one object is required")
        return ids
    for i, o in enumerate(objects):
        oid = _validate_object(o, i, package_ids, errors)
        if oid is None:
            continue
        if oid in ids:
            errors.append("objects[%d]: duplicate object id %s" % (i, _q(oid)))
        ids.add(oid)
    return ids


def _validate_end(link, end, label, errors):
    value = link[end]
    if not isinstance(value, dict):
        errors.append("%s: %s must be an object (role, navigable)" % (label, end))
        return
    if "multiplicity" in value:
        errors.append("%s: %s carries a multiplicity, but a link joins exactly two instances; "
                      "multiplicities belong to the class diagram" % (label, end))
    _check_fields({k: v for k, v in value.items() if k != "multiplicity"}, END_FIELDS, "%s, %s" % (label, end), errors)
    if "role" in value and not _nonempty(value["role"]):
        errors.append("%s: %s role must be a non-empty string" % (label, end))
    if "navigable" in value and not isinstance(value["navigable"], bool):
        errors.append("%s: %s navigable must be true or false" % (label, end))


def _validate_links(model, object_ids, errors):
    links = model.get("links", [])
    if not isinstance(links, list):
        errors.append("links: must be a list")
        return
    for i, l in enumerate(links):
        if not isinstance(l, dict):
            errors.append("links[%d]: must be an object" % i)
            continue
        label = "links[%d] (%s -> %s)" % (i, l.get("from"), l.get("to"))
        _check_fields(l, LINK_FIELDS, label, errors)
        for end in ("from", "to"):
            v = l.get(end)
            if not _nonempty(v):
                errors.append("%s: %s is required (an object id)" % (label, _q(end)))
            elif v not in object_ids:
                errors.append("%s: unknown object %s in %s" % (label, _q(v), _q(end)))
        if "name" in l and not _nonempty(l["name"]):
            errors.append("%s: name must be a non-empty string" % label)
        for end in ("fromEnd", "toEnd"):
            if end in l:
                _validate_end(l, end, label, errors)


def validate(model):
    """Return the list of problems found in a UML object diagram model; an empty list means valid."""
    errors = []
    if not isinstance(model, dict):
        return ["model: must be a JSON object"]
    _check_fields(model, MODEL_FIELDS, "model", errors)
    if not _nonempty(model.get("title")):
        errors.append("title: required (a non-empty string)")
    if "description" in model and not isinstance(model["description"], str):
        errors.append("description: must be text")
    package_ids = _validate_packages(model, errors)
    object_ids = _validate_objects(model, package_ids, errors)
    _validate_links(model, object_ids, errors)
    _scan_markup(model, "model", errors)
    return errors


def main(argv):
    if len(argv) != 2:
        print("usage: uml_object_diagram_model.py <model.json>", file=sys.stderr)
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
