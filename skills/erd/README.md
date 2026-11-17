---
summary: Entity relationship diagram as one self-contained HTML page, in crow's foot notation, with groups, light/dark switch and replaceable themes
---

# erd

Draws an entity relationship diagram (ERD) from a description, from SQL DDL or from an ORM model, and writes it as one self-contained HTML page that opens straight from disk. The skill writes a small JSON model; a script validates it, lays the diagram out and assembles the page, so the look is the plugin's shared visual language and never something the model improvises.

## What it produces

- **A page** `<name>.html`: tables drawn as header-band nodes with columns, types and key markers (primary keys in bold with a key marker, foreign keys marked, composite keys supported), relationships in crow's foot notation with the cardinality at each end, automatic layout, and a System / Light / Dark switch.
- **A model** `<name>.erd.json` beside it: plain data, the only file the skill writes by hand. It is what a later change edits, so the diagram can be revised without starting over.

By default both go to `./erd/` in the working folder; name a file or folder in the request to put them elsewhere.

## Inputs

| You give | The skill does |
|---|---|
| A description in plain words | invents sensible columns and types, marks the keys, sets both cardinalities of every relationship |
| `CREATE TABLE` statements | one entity per table, every column kept with its type, `PRIMARY KEY` and foreign key columns marked; a `NOT NULL` key gives a mandatory parent, a nullable one an optional parent, a `UNIQUE` key at most one child |
| An ORM model | reads it as a schema, as above |
| A change request ("add a shipment table linked to order") | edits the existing model and builds the page again |

## Options

Ask for them in the request.

- **Relationship kind.** Owned (the child exists only as part of its parent, solid line) or referenced (the child only points to its parent, dashed line). Say which, or leave it to the skill, which treats a foreign key that is part of the child's primary key as owned.
- **Cardinality.** `1`, `0..1`, `0..*` and `1..*` at each end. The skill uses `1..*` only when you say "at least one".
- **Groups.** Name up to five areas or contexts; each takes one of the theme's group colors. Tables outside every group are drawn in the neutral color.
- **Theme.** `default`, `alt`, or the path of your own theme file. Every theme works in light and dark.
- **Location.** A file or folder for the output.

## Example

```
Draw an ERD of customers, orders, order lines, products and payments. An order line
belongs to its order; an order only references its customer. Group them as Sales
(customer, order, order line, payment) and Catalog (product).
```

The skill writes `erd/order-schema.erd.json` and `erd/order-schema.html`: five tables in two colored groups, solid connectors from `order` to its lines, dashed ones for the references, crow's feet on the many side. The model format, with a complete example, is in [references/model.md](references/model.md).

To build a page from a model yourself, or with another theme:

```
python3 shared/scripts/artifact_page.py --type erd --model order.erd.json --theme alt --out order.html
```

## Requirements

`python3` (3.8 or later, standard library only). The page loads its fonts and the layout library from a CDN when opened; offline it falls back to system fonts and a simple grid layout, and says so.

<!-- performance:start -->
## Performance

With the plugin, the same prompts took 59.0% fewer tokens, 88.7% less time and 73.6% less cost than without it (medians of 5 runs per arm, summed over 3 cases).

| Case | Tokens (without → with) | Time (without → with) | Cost per run (without → with) |
|---|---:|---:|---:|
| easy | 139,834 → 81,834 (-41.5%) | 131.9 s → 21.3 s (-83.9%) | $0.44 → $0.17 (-62.0%) |
| medium | 252,766 → 85,152 (-66.3%) | 295.7 s → 32.4 s (-89.0%) | $0.92 → $0.21 (-77.8%) |
| complex | 290,942 → 113,191 (-61.1%) | 318.2 s → 30.3 s (-90.5%) | $0.89 → $0.22 (-75.1%) |
| **Total** | 683,542 → 280,177 (-59.0%) | 745.8 s → 84.0 s (-88.7%) | $2.26 → $0.60 (-73.6%) |

Tokens count input, cache and output over every model of the session; time is wall-clock; cost is in USD. Each case shows the median of its runs; the total adds the medians of the cases.

- **Evaluated:** 2026-11-17, plugin 0.1.0, model claude-opus-5-5, effort medium, 5 runs per arm.
- **Result:** meets target; goal: at least 20.0% fewer tokens and 20.0% less time. **Decision:** adopt (2026-11-17).
<!-- performance:end -->
