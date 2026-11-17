# artifacts

A Claude Code plugin that turns a request into a finished operational artifact: ask for a diagram in plain words, or hand over a schema, and a skill produces it as one self-contained HTML page. Today the plugin draws entity relationship diagrams; WBS, UML and other diagrams are planned.

What sets it apart:

- **One visual language.** Every artifact type is drawn with the same roles (colors, line weights, node shapes), so the pages look like a family.
- **Light and dark, with a switch.** Every page has a System / Light / Dark switch, and every theme works in both modes.
- **Replaceable themes.** The look is a set of token values; swap the theme and every artifact changes with it.
- **Cheaper than doing it by hand.** Each skill is measured against the same prompts run without the plugin, and its tokens and time are published below.

## Skills

<!-- skills:start -->
| Skill | What it produces | Tokens | Time | Evaluated |
|---|---|---:|---:|---|
| [`erd`](skills/erd/README.md) | Entity relationship diagram as one self-contained HTML page, in crow's foot notation, with groups, light/dark switch and replaceable themes | -59.0% | -88.7% | 2026-11-17 |
<!-- skills:end -->

Tokens and Time are the change with the plugin against the same prompts without it (lower is better), summed over the skill's test cases; the skill's page has the per-case figures.

## Install

Add the repository as a marketplace, then install the plugin from it:

```
claude plugin marketplace add MrBogomips/artifacts
claude plugin install artifacts@artifacts
```

Inside a Claude Code session the same two steps are `/plugin marketplace add MrBogomips/artifacts` and `/plugin install artifacts@artifacts`. The marketplace and the plugin are both named `artifacts`. After installing, ask for an artifact in plain words (see Usage); the skill is picked up from the request.

## Requirements

- Claude Code with plugin support.
- `python3` (3.8 or later, standard library only) on the machine where a skill runs: it validates the data model and assembles the page. A skill checks for it first and tells you when it is missing.
- A network connection when a page is first opened: fonts load from Google Fonts and the ERD layout library from a CDN. Without them the page falls back to system fonts and a simple grid layout, and says so.

## Usage

### Entity relationship diagrams (`erd` skill)

Full reference: [skills/erd/README.md](skills/erd/README.md).

Ask in plain words. The skill writes a small JSON model (`<name>.erd.json`, data only) and runs a script that validates it and produces one HTML page: tables drawn as header-band nodes, crow's foot notation, relationships laid out automatically, and a System / Light / Dark switch.

From a description:

```
Draw an ERD of customers, orders, order lines, products and payments. An order line
belongs to its order; an order only references its customer.
```

From SQL DDL:

```
Draw the ERD of this schema: <paste the CREATE TABLE statements>
```

By default the page is written to `./erd/<name>.html` with its model beside it; name a file or folder in the request to put it elsewhere. Ask for a change later ("add a shipment table linked to order") and the skill edits the model and builds the page again.

A relationship is either **owned** (the child exists only as part of its parent, drawn as a solid line) or **referenced** (the child only points to its parent, drawn dashed). Say which in the request, or leave it to the skill, which treats a foreign key that is part of the child's primary key as owned. Up to five groups of tables can be named; each takes one of the theme's group colors.

### Themes

Two themes ship with the plugin: `default` and `alt`. Every theme gives every color a light and a dark value, so any page works in both modes. To use one other than the default, ask for it ("use the alt theme"), or run the page script yourself:

```
python3 shared/scripts/artifact_page.py --type erd --model order.erd.json --theme alt --out order.html
```

To use your own theme, copy `shared/themes/default.css`, change the values and keep every token (the script rejects a theme with missing tokens and lists them), then pass its path:

```
python3 shared/scripts/artifact_page.py --type erd --model order.erd.json --theme ./my-theme.css --out order.html
```

The model format is in `skills/erd/references/model.md`; `python3 skills/erd/scripts/erd_model.py order.erd.json` validates a model on its own.

## Development

```
bash tests/run-structural-tests.sh   # manifests, themes, style source, page assembly, KPI tooling, documentation
bash evals/run.sh erd                # evaluate a skill against a no-plugin baseline (starts real sessions)
python3 evals/kpi.py doc             # regenerate the skills table and each skill's Performance section
```
