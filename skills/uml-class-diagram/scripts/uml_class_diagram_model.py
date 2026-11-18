#!/usr/bin/env python3
"""Validation of a UML class diagram model (python3, standard library only).

    validate(model) -> list[str]                   every problem found, empty when the model is valid
    python3 uml_class_diagram_model.py <model.json>   print the problems, exit 1 when there are any

The model format is described in ../references/model.md.
"""
import json
import re
import sys

KINDS = ("class", "interface", "enumeration")
RELATIONSHIP_KINDS = ("generalization", "realization", "composition", "aggregation", "association", "dependency")
END_KINDS = ("composition", "aggregation", "association")   # the kinds whose ends carry role and multiplicity
BINDING_KINDS = ("generalization", "realization")           # the kinds that can bind a generic target
VISIBILITIES = ("public", "protected", "private", "package")
MAX_PACKAGES = 16
MULTIPLICITY = re.compile(r"^(\*|\d+|\d+\.\.(\d+|\*))$")
MULTIPLICITY_FORMS = "n, n..m, n..* or *, with whole numbers and n not greater than m"

MODEL_FIELDS = ("title", "description", "packages", "classifiers", "relationships")
PACKAGE_FIELDS = ("id", "label")
CLASSIFIER_FIELDS = ("name", "kind", "abstract", "package", "stereotypes", "typeParams",
                     "attributes", "operations", "literals")
ATTRIBUTE_FIELDS = ("name", "type", "visibility", "static", "readOnly", "multiplicity", "default")
OPERATION_FIELDS = ("name", "visibility", "returns", "params", "static", "abstract", "constructor")
PARAM_FIELDS = ("name", "type")
RELATIONSHIP_FIELDS = ("kind", "from", "to", "fromEnd", "toEnd", "bindings", "label")
END_FIELDS = ("role", "multiplicity", "navigable")

# Markup, as far as a model can tell it from a generic type such as Promise<Receipt> or Repository<T>:
# a closing tag, a comment or declaration, or an opening tag of an HTML element that no type is named
# after (a one-letter element only with an attribute).
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


def _bad_multiplicity(value):
    """True when `value` is not a multiplicity: n, n..m, n..* or *, with n not greater than m."""
    if not isinstance(value, str) or not MULTIPLICITY.match(value):
        return True
    if ".." in value:
        low, high = value.split("..")
        return high != "*" and int(low) > int(high)
    return False


def _bool_fields(obj, names, where, errors):
    for name in names:
        if name in obj and not isinstance(obj[name], bool):
            errors.append("%s: %s must be true or false" % (where, name))


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


def _validate_attribute(a, cname, j, errors):
    where = "classifier %s, attributes[%d]" % (_q(cname), j)
    if not isinstance(a, dict):
        errors.append("%s: must be an object with a name" % where)
        return None
    _check_fields(a, ATTRIBUTE_FIELDS, where, errors)
    name = a.get("name")
    if not _nonempty(name):
        errors.append("%s: name is required (a non-empty string)" % where)
        return None
    where = "classifier %s, attribute %s" % (_q(cname), _q(name))
    for field in ("type", "default"):
        if field in a and not isinstance(a[field], str):
            errors.append("%s: %s must be text" % (where, field))
    if "visibility" in a and a["visibility"] not in VISIBILITIES:
        errors.append("%s: visibility %s is not allowed; use one of: %s"
                      % (where, _q(a["visibility"]), ", ".join(VISIBILITIES)))
    if "multiplicity" in a and _bad_multiplicity(a["multiplicity"]):
        errors.append("%s: multiplicity %s is not allowed; use %s"
                      % (where, _q(a["multiplicity"]), MULTIPLICITY_FORMS))
    _bool_fields(a, ("static", "readOnly"), where, errors)
    return name


def _validate_operation(o, cname, ckind, cabstract, j, errors):
    where = "classifier %s, operations[%d]" % (_q(cname), j)
    if not isinstance(o, dict):
        errors.append("%s: must be an object with a name" % where)
        return
    _check_fields(o, OPERATION_FIELDS, where, errors)
    name = o.get("name")
    if not _nonempty(name):
        errors.append("%s: name is required (a non-empty string)" % where)
        return
    where = "classifier %s, operation %s" % (_q(cname), _q(name))
    if "returns" in o and not isinstance(o["returns"], str):
        errors.append("%s: returns must be text" % where)
    if "visibility" in o and o["visibility"] not in VISIBILITIES:
        errors.append("%s: visibility %s is not allowed; use one of: %s"
                      % (where, _q(o["visibility"]), ", ".join(VISIBILITIES)))
    _bool_fields(o, ("static", "abstract", "constructor"), where, errors)
    if o.get("abstract") is True and ckind == "class" and not cabstract:
        errors.append("%s: the operation is abstract but the class is not; mark the class abstract "
                      "or drop the operation's abstract flag" % where)
    params = o.get("params", [])
    if not isinstance(params, list):
        errors.append("%s: params must be a list" % where)
        return
    for k, p in enumerate(params):
        pwhere = "%s, params[%d]" % (where, k)
        if not isinstance(p, dict):
            errors.append("%s: must be an object with a name" % pwhere)
            continue
        _check_fields(p, PARAM_FIELDS, pwhere, errors)
        if not _nonempty(p.get("name")):
            errors.append("%s: name is required (a non-empty string)" % pwhere)
        if "type" in p and not isinstance(p["type"], str):
            errors.append("%s: type must be text" % pwhere)


def _validate_classifier(c, i, package_ids, errors):
    """Return (name, kind, typeParams) of a classifier, or None when it has no usable name."""
    where = "classifiers[%d]" % i
    if not isinstance(c, dict):
        errors.append("%s: must be an object with a name and a kind" % where)
        return None
    name = c.get("name")
    if not _nonempty(name):
        errors.append("%s: name is required (a non-empty string)" % where)
        return None
    cw = "classifier %s" % _q(name)
    _check_fields(c, CLASSIFIER_FIELDS, cw, errors)
    kind = c.get("kind")
    if kind not in KINDS:
        errors.append("%s: kind %s is not allowed; use one of: %s"
                      % (cw, _q(kind) if kind is not None else "missing", ", ".join(KINDS)))
    _bool_fields(c, ("abstract",), cw, errors)
    if c.get("abstract") is True and kind in ("interface", "enumeration"):
        errors.append("%s: only a class can be abstract, not an %s" % (cw, kind))
    pkg = c.get("package")
    if pkg is not None and pkg not in package_ids:
        known = ", ".join(sorted(package_ids)) if package_ids else "none defined"
        errors.append("%s: unknown package %s (known packages: %s)" % (cw, _q(pkg), known))
    if "stereotypes" in c:
        _string_list(c["stereotypes"], "%s: stereotypes" % cw, errors)
    tparams = []
    if "typeParams" in c and _string_list(c["typeParams"], "%s: typeParams" % cw, errors):
        tparams = list(c["typeParams"])
        if len(set(tparams)) != len(tparams):
            errors.append("%s: duplicate type parameter" % cw)
    attrs = c.get("attributes", [])
    seen = set()
    if not isinstance(attrs, list):
        errors.append("%s: attributes must be a list" % cw)
    else:
        for j, a in enumerate(attrs):
            aname = _validate_attribute(a, name, j, errors)
            if aname is not None:
                if aname in seen:
                    errors.append("%s: duplicate attribute %s" % (cw, _q(aname)))
                seen.add(aname)
    ops = c.get("operations", [])
    if not isinstance(ops, list):
        errors.append("%s: operations must be a list" % cw)
    else:
        if kind == "enumeration" and ops:
            errors.append("%s: an enumeration has no operations" % cw)
        for j, o in enumerate(ops):
            _validate_operation(o, name, kind, c.get("abstract") is True, j, errors)
    lits = c.get("literals", [])
    if "literals" in c:
        if kind != "enumeration":
            errors.append("%s: only an enumeration has literals" % cw)
        else:
            _string_list(lits, "%s: literals" % cw, errors)
    if kind == "enumeration" and not (isinstance(lits, list) and lits):
        errors.append("%s: an enumeration needs at least one literal" % cw)
    return name, kind, tparams


def _validate_classifiers(model, package_ids, errors):
    """Return {name: (kind, typeParams)}."""
    result = {}
    classifiers = model.get("classifiers")
    if not isinstance(classifiers, list) or not classifiers:
        errors.append("classifiers: at least one classifier is required")
        return result
    for i, c in enumerate(classifiers):
        got = _validate_classifier(c, i, package_ids, errors)
        if got is None:
            continue
        name, kind, tparams = got
        if name in result:
            errors.append("classifiers[%d]: duplicate classifier name %s" % (i, _q(name)))
        else:
            result[name] = (kind, tparams)
    return result


def _validate_end(r, end, label, errors):
    value = r[end]
    if r.get("kind") not in END_KINDS:
        errors.append("%s: %s is allowed only on %s" % (label, end, ", ".join(END_KINDS)))
        return
    if not isinstance(value, dict):
        errors.append("%s: %s must be an object (role, multiplicity, navigable)" % (label, end))
        return
    _check_fields(value, END_FIELDS, "%s, %s" % (label, end), errors)
    if "role" in value and not _nonempty(value["role"]):
        errors.append("%s: %s role must be a non-empty string" % (label, end))
    if "navigable" in value and not isinstance(value["navigable"], bool):
        errors.append("%s: %s navigable must be true or false" % (label, end))
    m = value.get("multiplicity")
    if m is None:
        errors.append("%s: %s needs a multiplicity; use %s" % (label, end, MULTIPLICITY_FORMS))
    elif _bad_multiplicity(m):
        errors.append("%s: %s multiplicity %s is not allowed; use %s" % (label, end, _q(m), MULTIPLICITY_FORMS))


def _generalization_cycle(edges):
    """The first cycle of the generalization graph as a list of names closed on its start, or None."""
    graph = {}
    for a, b in edges:
        graph.setdefault(a, []).append(b)
    state, stack = {}, []

    def visit(n):
        state[n] = 1
        stack.append(n)
        for m in graph.get(n, []):
            if state.get(m) == 1:
                return stack[stack.index(m):] + [m]
            if m not in state:
                found = visit(m)
                if found:
                    return found
        stack.pop()
        state[n] = 2
        return None

    for n in list(graph):
        if n not in state:
            found = visit(n)
            if found:
                return found
    return None


def _validate_bindings(r, label, target_params, target, errors):
    b = r["bindings"]
    if r.get("kind") not in BINDING_KINDS:
        errors.append("%s: bindings are allowed only on %s" % (label, ", ".join(BINDING_KINDS)))
        return
    if not isinstance(b, dict):
        errors.append("%s: bindings must map a type parameter of the target to a type" % label)
        return
    for k, v in b.items():
        if k not in target_params:
            have = ", ".join(target_params) if target_params else "none"
            errors.append("%s: bindings name %s, which is not a type parameter of %s (it has: %s)"
                          % (label, _q(k), _q(target), have))
        if not _nonempty(v):
            errors.append("%s: the binding of %s must be a non-empty type" % (label, _q(k)))


def _validate_relationships(model, classifiers, errors):
    rels = model.get("relationships", [])
    if not isinstance(rels, list):
        errors.append("relationships: must be a list")
        return
    gen_edges = []
    for i, r in enumerate(rels):
        if not isinstance(r, dict):
            errors.append("relationships[%d]: must be an object" % i)
            continue
        label = "relationships[%d] (%s -> %s)" % (i, r.get("from"), r.get("to"))
        _check_fields(r, RELATIONSHIP_FIELDS, label, errors)
        kind = r.get("kind")
        if kind not in RELATIONSHIP_KINDS:
            errors.append("%s: kind %s is not allowed; use one of: %s"
                          % (label, _q(kind) if kind is not None else "missing", ", ".join(RELATIONSHIP_KINDS)))
        known = True
        for end in ("from", "to"):
            v = r.get(end)
            if not _nonempty(v):
                errors.append("%s: %s is required (a classifier name)" % (label, _q(end)))
                known = False
            elif v not in classifiers:
                errors.append("%s: unknown classifier %s in %s" % (label, _q(v), _q(end)))
                known = False
        if "label" in r and not isinstance(r["label"], str):
            errors.append("%s: label must be text" % label)
        for end in ("fromEnd", "toEnd"):
            if end in r:
                _validate_end(r, end, label, errors)
            elif kind in END_KINDS:
                errors.append("%s: %s is required for a %s (it carries the multiplicity)" % (label, end, kind))
        if not known:
            continue
        src, dst = r["from"], r["to"]
        if kind == "realization" and classifiers[dst][0] != "interface":
            errors.append("%s: a realization must point to an interface, and %s is a %s"
                          % (label, _q(dst), classifiers[dst][0]))
        if kind == "generalization":
            gen_edges.append((src, dst))
        if "bindings" in r:
            _validate_bindings(r, label, classifiers[dst][1], dst, errors)
    cycle = _generalization_cycle(gen_edges)
    if cycle:
        errors.append("relationships: generalization cycle %s" % " -> ".join(cycle))


def validate(model):
    """Return the list of problems found in a UML class diagram model; an empty list means valid."""
    errors = []
    if not isinstance(model, dict):
        return ["model: must be a JSON object"]
    _check_fields(model, MODEL_FIELDS, "model", errors)
    if not _nonempty(model.get("title")):
        errors.append("title: required (a non-empty string)")
    if "description" in model and not isinstance(model["description"], str):
        errors.append("description: must be text")
    package_ids = _validate_packages(model, errors)
    classifiers = _validate_classifiers(model, package_ids, errors)
    _validate_relationships(model, classifiers, errors)
    _scan_markup(model, "model", errors)
    return errors


def main(argv):
    if len(argv) != 2:
        print("usage: uml_class_diagram_model.py <model.json>", file=sys.stderr)
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
