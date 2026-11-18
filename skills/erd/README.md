---
summary: Entity relationship diagram as one self-contained HTML page, in crow's foot notation, with groups, light/dark switch and replaceable themes
---

# erd

Draws an entity relationship diagram (ERD) from a description, from SQL DDL or from an ORM model, and writes it as one self-contained HTML page that opens straight from disk. The skill writes a small JSON model; a script validates it, lays the diagram out and assembles the page, so the look is the plugin's shared visual language and never something the model improvises.

## What it produces

- **A page** `<name>.html`, drawn in the plugin's shared visual language:
  - tables as header-band nodes: pale group-tinted band with the name at the left, one row per column with colored key chips (PK, FK, UK, in that order), primary keys in bold, a `null` marker before the type of a nullable column;
  - each group drawn as a zone (a tinted, labelled area that contains its tables); a table outside every group has a dashed outline;
  - relationships in crow's foot notation with the cardinality at each end, solid when owned and dashed when referenced, and the ends sitting on the joining columns when the model names them;
  - **view options** in the page head: the level of detail (all columns, key columns only, table names only; keys `1`, `2`, `3`) and, when the model has both owned and referenced relationships, a switch for the referenced ones (key `R`); changing either draws the diagram again for the new sizes;
  - automatic layout, connectors that hop over the ones they cross, and zoom (out, in, Fit, 1:1; the page starts at 1:1; Ctrl or Cmd with the wheel and a pinch zoom around the pointer, dragging the empty part pans, and the keys `+ - F 0 T Esc` work too);
  - under the drawing, a legend of what the page uses, a counts line (groups, tables, relationships per kind) and a relationships table (child and parent, kind, cardinality in words), all following the view; pointing at a table, a connector or a row of the table highlights what it connects and dims the rest, and a click pins the highlight until Esc, a second click or a click on empty space (a tap works the same way); Tab reaches a table and Enter pins it;
  - a Dark mode toggle that starts from your system preference and remembers your choice.
- **A model** `<name>.erd.json` beside it: plain data, the only file the skill writes by hand. It is what a later change edits, so the diagram can be revised without starting over.

By default both go to `./erd/` in the working folder; name a file or folder in the request to put them elsewhere.

## Inputs

| You give | The skill does |
|---|---|
| A description in plain words | invents sensible columns and types, marks the keys, sets both cardinalities of every relationship |
| `CREATE TABLE` statements | one entity per table, every column kept with its type, `PRIMARY KEY` and foreign key columns marked, `UNIQUE` columns marked unique, columns without `NOT NULL` marked nullable; a `NOT NULL` key gives a mandatory parent, a nullable one an optional parent, a `UNIQUE` key at most one child |
| An ORM model | reads it as a schema, as above |
| A change request ("add a shipment table linked to order") | edits the existing model and builds the page again |

## Options

Ask for them in the request.

- **Relationship kind.** Owned (the child exists only as part of its parent, solid line) or referenced (the child only points to its parent, dashed line). Say which, or leave it to the skill, which treats a foreign key that is part of the child's primary key as owned.
- **Cardinality.** `1`, `0..1`, `0..*` and `1..*` at each end. The skill uses `1..*` only when you say "at least one".
- **Groups.** Name up to sixteen areas or contexts; they take the theme's five group colors in order and cycle from the sixth, and every zone is labelled. Tables outside every group are drawn in the neutral color.
- **Theme.** `default` (system fonts, pale header bands), `alt` (solid bands, Google Fonts), or the path of your own theme file. Every theme works in light and dark. A theme file written for plugin 0.1.0 lacks the tokens added in 0.2.0 (the three key colors, the chip, zone and highlight mixes, the zone radius and the dim opacity) and is refused with the list of what is missing: copy those tokens from `shared/themes/default.css`. A theme may name system font stacks only, or load web fonts from Google Fonts; no other font source is accepted.
- **Level of detail and referenced relationships.** Chosen on the page itself, not in the request: the skill never trims columns or relationships for an audience.
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

`python3` (3.8 or later, standard library only). The page loads the layout library from a CDN when opened (and the fonts too, with a theme that uses Google Fonts; the default theme uses system fonts and loads none); offline it falls back to a simple grid layout, which still keeps each group's tables inside its zone, and says so.

<!-- performance:start -->
## Performance

With the plugin, the same prompts took 46.9% fewer tokens, 87.9% less time and 67.1% less cost than without it (medians of 3 runs per arm, summed over 3 cases).

| Case | Tokens (without → with) | Time (without → with) | Cost per run (without → with) |
|---|---:|---:|---:|
| easy | 141,706 → 106,580 (-24.8%) | 145.5 s → 21.5 s (-85.2%) | $0.43 → $0.18 (-58.1%) |
| medium | 278,482 → 86,633 (-68.9%) | 308.8 s → 30.7 s (-90.1%) | $0.90 → $0.21 (-76.7%) |
| complex | 161,452 → 115,405 (-28.5%) | 222.1 s → 29.7 s (-86.6%) | $0.73 → $0.29 (-60.4%) |
| **Total** | 581,640 → 308,618 (-46.9%) | 676.4 s → 82.0 s (-87.9%) | $2.05 → $0.68 (-67.1%) |

Tokens count input, cache and output over every model of the session; time is wall-clock; cost is in USD. Each case shows the median of its runs; the total adds the medians of the cases.

- **Evaluated:** 2026-11-17, plugin 0.2.0, model claude-opus-5-5, effort medium, 3 runs per arm.
- **Result:** meets target; goal: at least 20.0% fewer tokens and 20.0% less time. **Decision:** adopt (2026-11-17).
<!-- performance:end -->
