# UML class diagram model

The file the skill writes: `<name>.uml.json`, plain JSON holding data only. The validator rejects any field not listed below.

## Fields

```text
model          title (required), description, packages, classifiers (required, at least one), relationships
package        id (required, unique), label
classifier     name (required, unique), kind (required: class, interface or enumeration), abstract (a class only),
               package (an id from packages), stereotypes, typeParams, attributes, operations, literals
attribute      name (required, unique within the classifier), type, visibility, static, readOnly, multiplicity, default
operation      name (required), visibility, returns, params, static, abstract, constructor
param          name (required), type
relationship   kind (required), from, to (required, classifier names), fromEnd, toEnd, bindings, label
end            role, multiplicity, navigable
```

Every field except those marked required is optional, so a domain-level model written from prose needs no types: `{ "name": "total" }` is a complete attribute.

- `title` becomes the page title and heading; `description`, when present, appears under it.
- `kind` is `class`, `interface` or `enumeration`. `abstract: true` is for a class only (its name is drawn in italics). An enumeration needs at least one entry in `literals` and has no `operations`; only an enumeration has `literals`.
- `stereotypes` is a list of words without the guillemets: `["aggregate root"]` is drawn as a chip reading «aggregate root». Do not add `interface` or `enumeration`: the page draws those chips from `kind`.
- `typeParams` lists the generic parameters: `["T"]`, `["K", "V"]`. They are drawn in a dashed box on the corner of the class.
- Text such as `Promise<Receipt>` or `Repository<T>` is fine in `type`, `returns` and `default`; markup is not.

## Members

- `visibility` is `public`, `protected`, `private` or `package`, drawn as `+`, `#`, `-` and `~`. Leave it out when unknown: the member is drawn without a mark and counts as public at the page's public-members level of detail.
- `static: true` underlines a member. `readOnly: true` on an attribute is shown as `{readOnly}`. `abstract: true` on an operation draws it in italics, and only a class that is itself abstract can have one; an interface's operations are always drawn in italics.
- `constructor: true` marks a constructor; it is drawn with a «create» prefix.
- `multiplicity` on an attribute (`0..1` for an optional field, `*` for a collection) is shown after its type.
- `params` is a list of `{ "name", "type" }` in call order; `returns` is the return type as written.
- Order is the order of the file.

## Packages

`packages` holds at most sixteen entries, each classifier in at most one (`package` names its id). A package that holds a classifier is drawn as a zone with its label; the five group colors are assigned in order of first appearance and cycle from the sixth package, so two zones may share a color and only the labels tell them apart. A classifier in no package, in a model that has packages, is drawn neutral with a dashed outline. With no packages defined every classifier is drawn in the accent color and no zone is drawn.

## Relationships

`from` is the child of a generalization or realization, the whole of a composition or aggregation, the source of an association and the client of a dependency; `to` is the other end. The renderer derives every line and end shape from `kind`; the model never says how to draw them.

| `kind` | `from` ... `to` | Drawn |
|---|---|---|
| `generalization` | child ... parent (`extends`) | solid line, hollow triangle at the parent |
| `realization` | implementing class ... interface (`implements`) | dashed line, hollow triangle at the interface; the target must be an interface |
| `composition` | whole ... part the whole owns | solid line, filled diamond at the whole |
| `aggregation` | whole ... part it only refers to | solid line, hollow diamond at the whole |
| `association` | source ... target | solid line, open arrowhead at each navigable end |
| `dependency` | client ... supplier | dashed line, open arrowhead at the supplier |

Generalizations must not form a cycle. A relationship may join a classifier to itself (an employee and their manager); it is drawn as a loop.

### Ends

A composition, aggregation or association gives both ends: `fromEnd` is the end at `from`, `toEnd` the end at `to`. Each end has:

- `multiplicity` (required): `n`, `n..m`, `n..*` or `*`, whole numbers with `n` not greater than `m`: `1`, `0..1`, `1..*`, `0..*`, `*`, `2..5`.
- `role` (optional): the name the other classifier knows this end by (`lines`, `customer`), drawn beside the end.
- `navigable` (optional, default false): `true` draws an open arrowhead at that end of an association. On a composition or aggregation the diamond marks the whole end and a navigable part end shows the arrowhead.

The multiplicity at an end says how many instances of that end's classifier take part per instance of the other: `Order` composes `OrderLine`, `fromEnd` `1` (at `Order`), `toEnd` `0..*` with role `lines` (at `OrderLine`). How to choose the multiplicities, and the ends of a field and its inverse, from the source is in `SKILL.md` step 4.

`fromEnd` and `toEnd` are not allowed on the other three kinds.

### Bindings and labels

`bindings` is allowed on a generalization or realization whose target is generic: `{ "T": "Order" }` for `OrderRepository` realizing `Repository<T>`. Each key must be a type parameter of the target. The connector is labelled `<T → Order>`. `label` is a short word shown on the connector (`use` on a dependency).

## Example

```json
{
  "title": "Online shop: ordering and billing",
  "description": "Two bounded contexts of an online shop.",
  "packages": [
    { "id": "ordering", "label": "ordering" },
    { "id": "billing", "label": "billing" }
  ],
  "classifiers": [
    { "name": "Entity", "kind": "class", "abstract": true, "typeParams": ["TId"],
      "attributes": [ { "name": "id", "type": "TId", "visibility": "public", "readOnly": true } ] },
    { "name": "OrderStatus", "kind": "enumeration", "package": "ordering",
      "literals": ["Pending", "Confirmed", "Cancelled"] },
    { "name": "Order", "kind": "class", "package": "ordering", "stereotypes": ["aggregate root"],
      "attributes": [
        { "name": "MAX_LINES", "type": "number", "visibility": "private", "static": true, "readOnly": true, "default": "50" },
        { "name": "status", "type": "OrderStatus", "visibility": "public" },
        { "name": "lines", "type": "OrderLine[]", "visibility": "private" } ],
      "operations": [
        { "name": "total", "visibility": "public", "returns": "Money" },
        { "name": "confirm", "visibility": "public", "returns": "Promise<Receipt>",
          "params": [ { "name": "payments", "type": "PaymentService" } ] } ] },
    { "name": "OrderLine", "kind": "class", "package": "ordering",
      "attributes": [ { "name": "quantity", "type": "number", "visibility": "public" } ] },
    { "name": "Money", "kind": "class", "stereotypes": ["value object"],
      "attributes": [ { "name": "amount", "type": "number" }, { "name": "currency", "type": "string" } ] },
    { "name": "PaymentService", "kind": "interface", "package": "billing",
      "operations": [ { "name": "charge", "returns": "Promise<Receipt>", "params": [ { "name": "amount", "type": "Money" } ] } ] },
    { "name": "GatewayPaymentService", "kind": "class", "package": "billing",
      "operations": [ { "name": "charge", "visibility": "public", "returns": "Promise<Receipt>", "params": [ { "name": "amount", "type": "Money" } ] } ] },
    { "name": "Receipt", "kind": "class", "package": "billing",
      "attributes": [ { "name": "amount", "type": "Money" } ] }
  ],
  "relationships": [
    { "kind": "generalization", "from": "Order", "to": "Entity", "bindings": { "TId": "string" } },
    { "kind": "composition", "from": "Order", "to": "OrderLine",
      "fromEnd": { "multiplicity": "1" },
      "toEnd": { "role": "lines", "multiplicity": "1..*" } },
    { "kind": "association", "from": "Order", "to": "OrderStatus",
      "fromEnd": { "multiplicity": "*" },
      "toEnd": { "role": "status", "multiplicity": "1", "navigable": true } },
    { "kind": "aggregation", "from": "Receipt", "to": "Money",
      "fromEnd": { "multiplicity": "*" },
      "toEnd": { "role": "amount", "multiplicity": "1", "navigable": true } },
    { "kind": "realization", "from": "GatewayPaymentService", "to": "PaymentService" },
    { "kind": "dependency", "from": "Order", "to": "PaymentService", "label": "use" },
    { "kind": "dependency", "from": "Order", "to": "Receipt" },
    { "kind": "dependency", "from": "Order", "to": "Money" }
  ]
}
```

`Money` has no package, so in a model with packages it is drawn neutral with a dashed outline, outside every zone. The page script validates the model before it draws anything, so there is no separate validation step. To check a model without producing a page, run `python3 "${CLAUDE_PLUGIN_ROOT}/skills/uml-class-diagram/scripts/uml_class_diagram_model.py" <file>`: it prints every problem and exits non-zero when there is one.
