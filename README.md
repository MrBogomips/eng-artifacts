# eng-artifacts

A Claude Code plugin for the optimized production of software engineering artifacts. It turns a request into a finished artifact: ask for a diagram in plain words, or hand over a schema, and a skill produces it as one self-contained HTML page. Today the plugin draws entity relationship diagrams and UML class diagrams; WBS and other diagrams are planned.

What sets it apart:

- **One visual language.** Every artifact type is drawn with the same roles (colors, line weights, node shapes), so the pages look like a family.
- **Light and dark, with a toggle.** Every page has a Dark mode toggle that starts from your system preference and remembers your choice, and every theme works in both modes.
- **Replaceable themes.** The look is a set of token values; swap the theme and every artifact changes with it.
- **Cheaper than doing it by hand.** Each skill is measured against the same prompts run without the plugin, and its tokens and time are published below.

## Skills

<!-- skills:start -->
| Skill | What it produces | Tokens | Time | Evaluated |
|---|---|---:|---:|---|
| [`erd`](skills/erd/README.md) | Entity relationship diagram as one self-contained HTML page, in crow's foot notation, with groups, light/dark switch and replaceable themes | -46.9% | -87.9% | 2026-11-17 |
| [`uml-class-diagram`](skills/uml-class-diagram/README.md) | UML class diagram from source code, a domain description or a DDD model, as one self-contained HTML page with packages, three levels of detail, light/dark switch and replaceable themes | -85.5% | -89.8% | 2026-11-18 |
<!-- skills:end -->

Tokens and Time are the change with the plugin against the same prompts without it (lower is better), summed over the skill's test cases; the skill's page has the per-case figures.

## Install

The plugin is listed in the `mrbogomips` marketplace:

```
claude plugin marketplace add MrBogomips/claude-plugins
claude plugin install eng-artifacts@mrbogomips
```

Inside a Claude Code session the same two steps are `/plugin marketplace add MrBogomips/claude-plugins` and `/plugin install eng-artifacts@mrbogomips`. The repository is also a single-plugin marketplace of its own (`claude plugin marketplace add MrBogomips/eng-artifacts`, then `claude plugin install eng-artifacts@eng-artifacts`); use one marketplace or the other, not both. After installing, ask for an artifact in plain words (see Usage); the skill is picked up from the request.

## Requirements

- Claude Code with plugin support.
- `python3` (3.8 or later, standard library only) on the machine where a skill runs: it validates the data model and assembles the page. A skill checks for it first and tells you when it is missing.
- A network connection when a page is first opened: the ERD layout library loads from a CDN (and so do the fonts of a theme that uses Google Fonts; the default theme uses system fonts and loads none). Without the library the page falls back to a simple grid layout, and says so.

## Usage

### Entity relationship diagrams (`erd` skill)

Full reference: [skills/erd/README.md](skills/erd/README.md).

Ask in plain words. The skill writes a small JSON model (`<name>.erd.json`, data only) and runs a script that validates it and produces one HTML page: tables drawn as header-band nodes, crow's foot notation, relationships laid out automatically, each group drawn as a zone, key chips and a relationships table with linked highlighting, zoom, and a Dark mode toggle.

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

A relationship is either **owned** (the child exists only as part of its parent, drawn as a solid line) or **referenced** (the child only points to its parent, drawn dashed). Say which in the request, or leave it to the skill, which treats a foreign key that is part of the child's primary key as owned. Up to sixteen groups of tables can be named; they take the theme's five group colors in order and cycle from the sixth, every zone being labelled.

### UML class diagrams (`uml-class-diagram` skill)

Full reference: [skills/uml-class-diagram/README.md](skills/uml-class-diagram/README.md).

Hand over source code (classes, interfaces, enums), a domain description or a DDD domain model, and ask for the class diagram. The skill writes a small JSON model (`<name>.uml.json`, data only) and runs the same page script: classes as header-band nodes with stereotype chips, attributes and operations, packages drawn as zones, the six UML relationship kinds with their standard ends, a relationships table, a legend, and view options for the level of detail (all members, public members, class names only) and for hiding dependencies.

```
Draw the class diagram of this domain layer: <paste the TypeScript classes>
```

By default the page is written to `./uml/<name>.html` with its model beside it. Every page, ERD included, lets you click a node or a connector to pin its highlight (Esc releases it), drag to pan, zoom with Ctrl or Cmd and the wheel or a pinch, and use the keyboard shortcuts listed under the drawing.

### Themes

Two themes ship with the plugin: `default` and `alt`. Every theme gives every color a light and a dark value, so any page works in both modes. To use one other than the default, ask for it ("use the alt theme"), or run the page script yourself:

```
python3 shared/scripts/artifact_page.py --type erd --model order.erd.json --theme alt --out order.html
```

To use your own theme, copy `shared/themes/default.css`, change the values and keep every token (the script rejects a theme with missing tokens and lists them), then pass its path. A theme written for plugin 0.2.0 needs one more token, `--key-stereotype` (the color of a UML stereotype chip, with a light value and a dark value; its chip ground is the color mixed into `--node`, and it must reach 4.5:1 on that ground in both modes): copy its three lines from `shared/themes/default.css`.

```
python3 shared/scripts/artifact_page.py --type erd --model order.erd.json --theme ./my-theme.css --out order.html
```

The model formats are in `skills/erd/references/model.md` and `skills/uml-class-diagram/references/model.md`; `python3 skills/erd/scripts/erd_model.py order.erd.json` and `python3 skills/uml-class-diagram/scripts/uml_class_diagram_model.py domain.uml.json` validate a model on its own. A class diagram page is built with `--type uml-class-diagram`.

## Development

```
bash tests/run-structural-tests.sh   # manifests, themes, style source, page assembly, KPI tooling, documentation
bash evals/run.sh erd                # (or uml-class-diagram) evaluate a skill against a no-plugin baseline (starts real sessions)
python3 evals/kpi.py doc             # regenerate the skills table and each skill's Performance section
```
