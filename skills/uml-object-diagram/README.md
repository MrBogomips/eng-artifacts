---
summary: UML object diagram of instances and links, drawn like the class diagram
---

# uml-object-diagram

Draws a UML object diagram (an instance diagram) from a description of a concrete situation, from test data or fixtures, or from a class diagram and example records, and writes it as one self-contained HTML page that opens straight from disk. The skill writes a small JSON model; a script validates it, lays the diagram out and assembles the page, so the look is the plugin's shared visual language, the same as the class diagram's, and never something the model improvises.

## What it produces

- **A page** `<name>.html`, drawn in the plugin's shared visual language:
  - instances as header-band nodes: pale package-tinted band with `name : Class` underlined at the left (`: Class` when the instance has no name), stereotype chips in the stereotype color, and one row per slot below, `name = value` or `name : type = value`, with the type and the value in the data face;
  - enumeration literals as instances too: `Literal : Enum` with the «enumeration» chip and no rows;
  - each package drawn as a zone (a tinted, labelled area that contains its objects); an object outside every package has a dashed outline;
  - links as solid connectors with no mark at an end that is not navigable and an open arrowhead at one that is, role names beside the ends, a name at the middle, a loop for a link from an object to itself;
  - automatic layout, connectors that hop over the ones they cross, and zoom (out, in, Fit, 1:1; Ctrl or Cmd with the wheel and a pinch zoom around the pointer, dragging the empty part pans);
  - **view options** in the page head: the level of detail (all slots, object names only; keys `1`, `2`); changing it draws the diagram again for the new sizes;
  - a click on an object or a link pins its highlight (Esc, a second click or a click on empty space releases it), Tab reaches an object and Enter pins it;
  - under the drawing, a legend of only what the page uses, a counts line (packages, objects, links) and a links table (source, link name, target, roles in words) linked to the drawing by highlighting;
  - a Dark mode toggle that starts from your system preference and remembers your choice.
- **A model** `<name>.object.uml.json` beside it: plain data, the only file the skill writes by hand. It is what a later change edits, so the diagram can be revised without starting over.

By default both go to `./uml/` in the working folder; name a file or folder in the request to put them elsewhere.

## Inputs

| You give | The skill does |
|---|---|
| A description of a situation ("a library on one afternoon: two members, a loan, ...") | one instance per thing the text names, named or anonymous, slots for the values it states, links for the relations, packages only when the text names areas |
| Test data, fixtures, records or rows | one instance per record of its class, its field values as slots, a field that refers to another record as a link to that record's instance |
| A class diagram model and example data | class names, link roles and slot types from the class diagram, the example records as instances |
| A change request ("add a reservation for bob") | edits the existing model and builds the page again |

## Options

Ask for them in the request.

- **Level of detail.** Chosen on the page itself, not in the request: the skill never trims slots or links for an audience.
- **Packages.** Up to sixteen; they take the theme's five group colors in order and cycle from the sixth, and every zone carries its label. Objects outside every package are drawn in the neutral color.
- **Theme.** `default` (system fonts, pale header bands), `alt` (solid bands, Google Fonts), or the path of your own theme file. Every theme works in light and dark.
- **Location.** A file or folder for the output.

## Example

```
Draw the object diagram of this afternoon at the library: alice borrowed copy7 of "Compilers" until 30 November,
bob's loan of copy8 is overdue, and one anonymous member is third in the reservation queue.
```

The skill writes `uml/<name>.object.uml.json` and `uml/<name>.html`. The model format, with a complete example, is in [references/model.md](references/model.md).

To build a page from a model yourself, or with another theme:

```
python3 shared/scripts/artifact_page.py --type uml-object-diagram --model library.object.uml.json --theme alt --out library.html
```

## Requirements

`python3` (3.8 or later, standard library only). The page loads the layout library from a CDN when opened (and the fonts too, with a theme that uses Google Fonts; the default theme uses system fonts and loads none); offline it falls back to a simple grid layout of the packages, and says so.

<!-- performance:start -->
## Performance

Not measured. This skill is derived from [`uml-class-diagram`](../uml-class-diagram/README.md): it reuses that skill's renderer, layout and model conventions, whose measured performance is on its page. A person validated a sample page on 2026-11-19 (plugin 0.5.0). **Decision:** adopt (validated, not measured).
<!-- performance:end -->
