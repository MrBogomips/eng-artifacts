#!/usr/bin/env python3
"""Validation of an ERD model (python3, standard library only).

    validate(model) -> list[str]     every problem found, empty when the model is valid
    python3 erd_model.py <model.json>   print the problems, exit 1 when there are any

The model format is described in ../references/model.md.
"""
import json
import re
import sys

CARDINALITIES = ("1", "0..1", "1..*", "0..*")
KINDS = ("owned", "referenced")
DEFAULT_KIND = "referenced"
MAX_GROUPS = 16

MODEL_FIELDS = ("title", "description", "groups", "entities", "relationships")
GROUP_FIELDS = ("id", "label")
ENTITY_FIELDS = ("name", "group", "columns")
COLUMN_FIELDS = ("name", "type", "pk", "fk", "uk", "nullable")
FLAGS = ("pk", "fk", "uk", "nullable")  # optional booleans of a column
RELATIONSHIP_FIELDS = ("from", "to", "fromCard", "toCard", "kind", "columns", "label")

MARKUP = re.compile(r"<\s*[/!]?[A-Za-z]")


def _quote(value):
    return '"%s"' % value


def _check_fields(obj, allowed, where, errors):
    for key in obj:
        if key not in allowed:
            errors.append(
                "%s: unknown field %s; a model holds data only (allowed: %s), "
                "never markup, styles, scripts or positions" % (where, _quote(key), ", ".join(allowed)))


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


def _nonempty_string(value):
    return isinstance(value, str) and value.strip() != ""


def _validate_groups(model, errors):
    """Return the set of valid group ids."""
    ids = set()
    groups = model.get("groups", [])
    if not isinstance(groups, list):
        errors.append("groups: must be a list")
        return ids
    if len(groups) > MAX_GROUPS:
        errors.append(
            "groups: %d groups, at most %d are allowed (the five group colors cycle, and every zone is "
            "labelled); merge groups or split the diagram" % (len(groups), MAX_GROUPS))
    for i, g in enumerate(groups):
        where = "groups[%d]" % i
        if not isinstance(g, dict):
            errors.append("%s: must be an object with id and label" % where)
            continue
        _check_fields(g, GROUP_FIELDS, where, errors)
        gid = g.get("id")
        if not _nonempty_string(gid):
            errors.append("%s: id is required (a non-empty string)" % where)
            continue
        if gid in ids:
            errors.append("%s: duplicate group id %s" % (where, _quote(gid)))
        ids.add(gid)
        if "label" in g and not _nonempty_string(g["label"]):
            errors.append("%s: label must be a non-empty string" % where)
    return ids


def _validate_columns(entity, ename, errors):
    cols = entity.get("columns")
    names = set()
    if not isinstance(cols, list) or not cols:
        errors.append("entity %s: needs at least one column" % _quote(ename))
        return names
    for j, c in enumerate(cols):
        where = "entity %s, columns[%d]" % (_quote(ename), j)
        if not isinstance(c, dict):
            errors.append("%s: must be an object with name and type" % where)
            continue
        _check_fields(c, COLUMN_FIELDS, where, errors)
        cname = c.get("name")
        if not _nonempty_string(cname):
            errors.append("%s: name is required (a non-empty string)" % where)
            continue
        if cname in names:
            errors.append("entity %s: duplicate column %s" % (_quote(ename), _quote(cname)))
        names.add(cname)
        if not _nonempty_string(c.get("type")):
            errors.append("entity %s, column %s: type is required (a non-empty string)"
                          % (_quote(ename), _quote(cname)))
        for flag in FLAGS:
            if flag in c and not isinstance(c[flag], bool):
                errors.append("entity %s, column %s: %s must be true or false"
                              % (_quote(ename), _quote(cname), flag))
    return names


def _validate_entities(model, group_ids, errors):
    """Return {entity name: set of column names}."""
    result = {}
    entities = model.get("entities")
    if not isinstance(entities, list) or not entities:
        errors.append("entities: at least one entity is required")
        return result
    for i, e in enumerate(entities):
        where = "entities[%d]" % i
        if not isinstance(e, dict):
            errors.append("%s: must be an object with name and columns" % where)
            continue
        _check_fields(e, ENTITY_FIELDS, where, errors)
        name = e.get("name")
        if not _nonempty_string(name):
            errors.append("%s: name is required (a non-empty string)" % where)
            continue
        if name in result:
            errors.append("%s: duplicate entity name %s" % (where, _quote(name)))
        group = e.get("group")
        if group is not None and group not in group_ids:
            known = ", ".join(sorted(group_ids)) if group_ids else "none defined"
            errors.append("entity %s: unknown group %s (known groups: %s)" % (_quote(name), _quote(group), known))
        cols = _validate_columns(e, name, errors)
        result.setdefault(name, cols)
    return result


def _validate_relationships(model, entities, errors):
    rels = model.get("relationships", [])
    if not isinstance(rels, list):
        errors.append("relationships: must be a list")
        return
    for i, r in enumerate(rels):
        if not isinstance(r, dict):
            errors.append("relationships[%d]: must be an object" % i)
            continue
        label = "relationships[%d] (%s -> %s)" % (i, r.get("from"), r.get("to"))
        _check_fields(r, RELATIONSHIP_FIELDS, label, errors)
        for end in ("from", "to"):
            v = r.get(end)
            if not _nonempty_string(v):
                errors.append("%s: %s is required (an entity name)" % (label, _quote(end)))
            elif v not in entities:
                errors.append("%s: unknown entity %s in %s" % (label, _quote(v), _quote(end)))
        for card in ("fromCard", "toCard"):
            v = r.get(card)
            if v not in CARDINALITIES:
                errors.append("%s: %s %s is not allowed; use one of: %s"
                              % (label, card, _quote(v) if v is not None else "missing", ", ".join(CARDINALITIES)))
        if "kind" in r and r["kind"] not in KINDS:
            errors.append("%s: kind %s is not allowed; use one of: %s (default %s)"
                          % (label, _quote(r["kind"]), ", ".join(KINDS), DEFAULT_KIND))
        if "label" in r and not isinstance(r["label"], str):
            errors.append("%s: label must be text" % label)
        cols = r.get("columns")
        if cols is not None:
            if not (isinstance(cols, list) and len(cols) == 2 and all(isinstance(c, str) for c in cols)):
                errors.append("%s: columns must be [column of from, column of to]" % label)
            else:
                for end, cname in zip(("from", "to"), cols):
                    ent = r.get(end)
                    if ent in entities and cname not in entities[ent]:
                        errors.append("%s: unknown column %s in entity %s"
                                      % (label, _quote(cname), _quote(ent)))


def validate(model):
    """Return the list of problems found in an ERD model; an empty list means valid."""
    errors = []
    if not isinstance(model, dict):
        return ["model: must be a JSON object"]
    _check_fields(model, MODEL_FIELDS, "model", errors)
    if not _nonempty_string(model.get("title")):
        errors.append("title: required (a non-empty string)")
    if "description" in model and not isinstance(model["description"], str):
        errors.append("description: must be text")
    group_ids = _validate_groups(model, errors)
    entities = _validate_entities(model, group_ids, errors)
    _validate_relationships(model, entities, errors)
    _scan_markup(model, "model", errors)
    return errors


def main(argv):
    if len(argv) != 2:
        print("usage: erd_model.py <model.json>", file=sys.stderr)
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
