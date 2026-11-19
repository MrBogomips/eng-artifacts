# UML object diagram model

The file the skill writes: `<name>.object.uml.json`, plain JSON holding data only. The validator rejects any field not listed below.

## Fields

```text
model          title (required), description, packages, objects (required, at least one), links
package        id (required, unique), label
object         id (required, unique), class (required), name, package (an id from packages), stereotypes, slots, literal
slot           name (required, unique within the object), value (required), type
link           from, to (required, object ids), name, fromEnd, toEnd
end            role, navigable
```

Every field except those marked required is optional.

- `title` becomes the page title and heading; `description`, when present, appears under it.
- `id` names the object in the model (links refer to it) and is never drawn. `class` is the name of the instance's classifier, as the class diagram writes it.
- `name` is the instance's name. The title reads `name : Class`, underlined. An object with no `name` is anonymous and reads `: Class`.
- `stereotypes` is a list of words without the guillemets: `["guest"]` is drawn as a chip reading «guest».
- `literal` makes the object an enumeration literal instead of an instance: `{ "id": "overdue", "class": "LoanState", "literal": "Overdue" }` is titled `Overdue : LoanState` and carries the «enumeration» chip. A literal has no `name` and no `slots`.

## Slots

A slot is one value of one attribute: `{ "name": "due", "type": "Date", "value": "2026-11-30" }` is drawn `due : Date = 2026-11-30`; without `type` it is drawn `due = 2026-11-30`. `value` is text, written as it is to be shown (`"1"`, `"Active"`, `"[3 items]"`). A slot never holds another object: draw a link to it. Slot names are unique within an object; order is the order of the file.

## Packages

`packages` holds at most sixteen entries, each object in at most one (`package` names its id). A package that holds an object is drawn as a zone with its label; the five group colors are assigned in order of first appearance and cycle from the sixth package. An object in no package, in a model that has packages, is drawn neutral with a dashed outline. With no packages defined every object is drawn in the accent color and no zone is drawn.

## Links

A link joins two objects: `from` and `to` are object ids. It is drawn as a solid line with no mark at either end unless an end is navigable. It may join an object to itself (drawn as a loop).

- `name` is written at the middle of the line (`"borrowed by"`).
- `fromEnd` is the end at `from`, `toEnd` the end at `to`. `role` is the name the other object knows this end by, written beside the end. `navigable: true` draws an open arrowhead at that end.
- An end carries no multiplicity: a link joins exactly two instances. The validator rejects one.

## Example

```json
{
  "title": "A library on one afternoon",
  "description": "Two members, a loan and the loan's state.",
  "packages": [
    { "id": "people", "label": "people" },
    { "id": "lending", "label": "lending" }
  ],
  "objects": [
    { "id": "alice", "class": "Member", "name": "alice", "package": "people",
      "slots": [ { "name": "email", "value": "alice@example.org" } ] },
    { "id": "guest", "class": "Member", "package": "people", "stereotypes": ["guest"] },
    { "id": "loan1", "class": "Loan", "name": "loan1", "package": "lending",
      "slots": [
        { "name": "due", "type": "Date", "value": "2026-11-30" },
        { "name": "renewals", "value": "1" } ] },
    { "id": "active", "class": "LoanState", "literal": "Active", "package": "lending" },
    { "id": "clock", "class": "Clock", "name": "clock" }
  ],
  "links": [
    { "from": "loan1", "to": "alice", "fromEnd": { "role": "loans" }, "toEnd": { "role": "borrower", "navigable": true } },
    { "from": "loan1", "to": "active", "toEnd": { "role": "state", "navigable": true } },
    { "from": "guest", "to": "alice", "name": "referred by" },
    { "from": "alice", "to": "alice", "name": "reminded", "toEnd": { "role": "reminder", "navigable": true } },
    { "from": "clock", "to": "loan1", "name": "stamps" }
  ]
}
```

`clock` has no package, so in a model with packages it is drawn neutral with a dashed outline, outside every zone. The page script validates the model before it draws anything, so there is no separate validation step. To check a model without producing a page, run `python3 "${CLAUDE_PLUGIN_ROOT}/skills/uml-object-diagram/scripts/uml_object_diagram_model.py" <file>`: it prints every problem and exits non-zero when there is one.
