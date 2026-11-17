# ERD model

The file the skill writes: `<name>.erd.json`, plain JSON. It holds data only. Never write HTML, CSS, SVG, scripts, colors or positions: the plugin draws the page and lays the diagram out itself, and the validator rejects unknown fields.

## Fields

```text
model          title (required), description, groups, entities (required, at least one), relationships
group          id (required, unique), label
entity         name (required, unique), group (an id from groups), columns (required, at least one)
column         name (required, unique within the entity), type (required, text as written in the schema),
               pk (true for a primary key column), fk (true for a foreign key column); a column may be both
relationship   from, to (entity names), fromCard, toCard, kind, columns, label
```

- `title` becomes the page title and heading; `description`, when present, appears under it.
- `groups`: at most five, each entity in at most one; when the model defines groups, an entity without `group` is drawn in the neutral color (outside every group); when it defines none, every table is drawn in the accent color. Use groups for bounded contexts or subject areas. More than five groups: merge groups or split the diagram.
- `type` is shown as written: `uuid`, `varchar(80)`, `numeric(10,2)`.
- `pk` columns are drawn bold with a key marker; several `pk` columns form a composite key. An `fk` column is marked too. Column order is the order of the file.

## Relationships

By convention `from` is the child, the entity that holds the foreign key, and `to` is the parent it points to.

`fromCard` and `toCard` give the cardinality at each end, that is how many of that entity relate to one of the other:

| Value | Meaning | Mark at that end |
|---|---|---|
| `1` | exactly one | two bars |
| `0..1` | zero or one | ring and bar |
| `1..*` | one or more | bar and crow's foot |
| `0..*` | zero or more | ring and crow's foot |

A customer places many orders, an order is placed by exactly one customer: `from: "order"`, `to: "customer"`, `fromCard: "0..*"`, `toCard: "1"`.

`kind` is `owned` or `referenced`, and defaults to `referenced`:

- `owned` (identifying): the child exists only as part of the parent and its primary key includes the joining foreign key, like an order line in its order. Drawn as a solid connector.
- `referenced` (non-identifying): the child only points to the parent, like an order to its customer. Drawn as a dashed connector.

Take the kind from the user's words when they state it. Otherwise set `owned` when the child's primary key includes the joining foreign key, and leave the rest `referenced`.

`columns`, optional, names the joining columns as `[column of from, column of to]`, for example `["customer_id", "id"]`; both must exist in their entities. Leave it out for a composite join or when the schema does not say. `label` is a short phrase shown beside the connector (`placed by`).

A relationship from an entity to itself (an employee and their manager) is valid and is drawn as a loop.

## Example

```json
{
  "title": "Order schema",
  "description": "Customers place orders made of lines for products; customers can be referred by other customers.",
  "groups": [
    { "id": "sales", "label": "Sales" },
    { "id": "catalog", "label": "Catalog" }
  ],
  "entities": [
    { "name": "customer", "group": "sales", "columns": [
      { "name": "id", "type": "uuid", "pk": true },
      { "name": "name", "type": "text" },
      { "name": "referred_by", "type": "uuid", "fk": true } ] },
    { "name": "order", "group": "sales", "columns": [
      { "name": "id", "type": "uuid", "pk": true },
      { "name": "customer_id", "type": "uuid", "fk": true },
      { "name": "placed_at", "type": "timestamp" } ] },
    { "name": "order_line", "group": "sales", "columns": [
      { "name": "order_id", "type": "uuid", "pk": true, "fk": true },
      { "name": "line_no", "type": "int", "pk": true },
      { "name": "product_id", "type": "uuid", "fk": true },
      { "name": "quantity", "type": "int" } ] },
    { "name": "product", "group": "catalog", "columns": [
      { "name": "id", "type": "uuid", "pk": true },
      { "name": "title", "type": "text" } ] },
    { "name": "audit_log", "columns": [
      { "name": "id", "type": "bigint", "pk": true },
      { "name": "action", "type": "text" } ] }
  ],
  "relationships": [
    { "from": "order", "to": "customer", "fromCard": "0..*", "toCard": "1",
      "kind": "referenced", "columns": ["customer_id", "id"], "label": "placed by" },
    { "from": "order_line", "to": "order", "fromCard": "1..*", "toCard": "1",
      "kind": "owned", "columns": ["order_id", "id"] },
    { "from": "order_line", "to": "product", "fromCard": "0..*", "toCard": "1",
      "columns": ["product_id", "id"] },
    { "from": "customer", "to": "customer", "fromCard": "0..*", "toCard": "0..1",
      "columns": ["referred_by", "id"], "label": "referred by" }
  ]
}
```

Every grouped entity names a group id from `groups`; `audit_log` has no group, so it takes the neutral color. Validate a model with `python3 scripts/erd_model.py <file>` from the skill folder; it prints every problem and exits non-zero when there is one.
