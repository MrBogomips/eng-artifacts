---
summary: UML package diagram of nested packages and their import, access and merge dependencies, drawn like the class diagram
---

# uml-package-diagram

Draws a UML package diagram from a source tree and its imports, from a description of the layers or modules of a system, or from a class diagram model, and writes it as one self-contained HTML page that opens straight from disk. The skill writes a small JSON model; a script validates it, lays the diagram out and assembles the page, so the look is the plugin's shared visual language, the same as the class diagram's, and never something the model improvises.

## What it produces

- **A page** `<name>.html`, drawn in the plugin's shared visual language:
  - packages as folders: a tab on the top left, as wide as its title and chips, in the package's tinted band with the name and the stereotype chips («model», «profile» and any other), over a body that lists the package's members one per row, an interface or an enumeration marked by its keyword in the data face;
  - packages nested to any depth: a package that holds packages is a larger folder whose body, in the zone ground of its color, contains its children;
  - the group colors in order of first appearance, up to sixteen packages, the five colors cycling from the sixth;
  - dependencies as dashed connectors with an open arrowhead at the supplier and the keyword «import», «access» or «merge» at the middle (a plain dependency shows its own label, when it has one);
  - automatic layout, connectors that hop over the ones they cross, and zoom (out, in, Fit, 1:1; Ctrl or Cmd with the wheel and a pinch zoom around the pointer, dragging the empty part pans);
  - **view options** in the page head: the level of detail (members shown, package names only; keys `1`, `2`); changing it draws the diagram again for the new sizes;
  - a click on a package or a dependency pins its highlight (Esc, a second click or a click on empty space releases it), Tab reaches a package and Enter pins it;
  - under the drawing, a legend of only what the page uses, a counts line (packages, members, dependencies per kind) and a dependencies table (client, kind, supplier) linked to the drawing by highlighting;
  - a Dark mode toggle that starts from your system preference and remembers your choice.
- **A model** `<name>.package.uml.json` beside it: plain data, the only file the skill writes by hand. It is what a later change edits, so the diagram can be revised without starting over.

By default both go to `./uml/` in the working folder; name a file or folder in the request to put them elsewhere.

## Inputs

| You give | The skill does |
|---|---|
| A source tree and its imports | one package per folder, module or namespace, nested as the tree is; one `import` dependency per pair of packages whose files import each other's |
| A layered or modular architecture in prose | one package per layer or module, nested where the text says one holds another, one dependency per "uses" |
| A class diagram model | one package per package, its classifiers as members, a dependency between two packages wherever their classifiers are related |
| A change request ("add a reporting package that imports domain") | edits the existing model and builds the page again |

## Options

Ask for them in the request.

- **Level of detail.** Chosen on the page itself, not in the request: the skill never trims members or dependencies for an audience.
- **Theme.** `default` (system fonts, pale header bands), `alt` (solid bands, Google Fonts), or the path of your own theme file. Every theme works in light and dark.
- **Location.** A file or folder for the output.

## Example

```
Draw the package diagram of this source tree, with the imports between the top-level folders:
<paste the tree and the imports>
```

The skill writes `uml/<name>.package.uml.json` and `uml/<name>.html`. The model format, with a complete example, is in [references/model.md](references/model.md).

To build a page from a model yourself, or with another theme:

```
python3 shared/scripts/artifact_page.py --type uml-package-diagram --model shop.package.uml.json --theme alt --out shop.html
```

## Requirements

`python3` (3.8 or later, standard library only). The page loads the layout library from a CDN when opened (and the fonts too, with a theme that uses Google Fonts; the default theme uses system fonts and loads none); offline it falls back to a simple grid layout that keeps the nesting, and says so.

<!-- performance:start -->
## Performance

Not measured. This skill is derived from [`uml-class-diagram`](../uml-class-diagram/README.md): it reuses that skill's renderer, layout and model conventions, whose measured performance is on its page. A person validated a sample page on 2026-11-19 (plugin 0.5.0). **Decision:** adopt (validated, not measured).
<!-- performance:end -->
