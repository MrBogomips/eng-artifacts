---
summary: UML class diagram from source code, a domain description or a DDD model, as one self-contained HTML page with packages, three levels of detail, light/dark switch and replaceable themes
---

# uml-class-diagram

Draws a UML class diagram from source code, from a description of a domain or from a DDD domain model, and writes it as one self-contained HTML page that opens straight from disk. The skill writes a small JSON model; a script validates it, lays the diagram out and assembles the page, so the look is the plugin's shared visual language and never something the model improvises. The page lets the reader choose how much to see, so the same diagram serves a developer reading every member, an architect reading the public surface and a project document that only needs class names.

## What it produces

- **A page** `<name>.html`, drawn in the plugin's shared visual language:
  - classes as header-band nodes: pale package-tinted band with the name at the left (italic when abstract), stereotype chips («interface», «enumeration», «aggregate root», «value object» and any other) in the stereotype color, generic type parameters in a dashed box on the corner, attributes and operations in two compartments with visibility marks (`+ # - ~`), types, parameters and defaults in the data face, static members underlined, abstract operations italic, enumeration literals listed;
  - each package drawn as a zone (a tinted, labelled area that contains its classes); a class outside every package has a dashed outline;
  - the six UML relationship kinds with their standard ends: generalization (hollow triangle at the parent), realization (the same on a dashed line), composition (filled diamond), aggregation (hollow diamond), association (open arrowhead at each navigable end) and dependency (dashed line, open arrowhead), with role names, multiplicities and generic bindings (`<T → Order>`) beside the ends;
  - automatic layout with parents above their children, connectors that hop over the ones they cross, and zoom (out, in, Fit, 1:1; Ctrl or Cmd with the wheel and a pinch zoom around the pointer, dragging the empty part pans);
  - **view options** in the page head: the level of detail (all members, public members, class names only; keys `1`, `2`, `3`) and, when the model has dependencies, a switch for them (key `D`); changing either draws the diagram again for the new sizes;
  - a click on a class or connector pins its highlight (Esc, a second click or a click on empty space releases it), Tab reaches a class and Enter pins it;
  - under the drawing, a legend of only what the page uses, a counts line (packages, classifiers, relationships per kind) and a relationships table (source, kind, target, roles and multiplicities in words) linked to the drawing by highlighting;
  - a Dark mode toggle that starts from your system preference and remembers your choice.
- **A model** `<name>.uml.json` beside it: plain data, the only file the skill writes by hand. It is what a later change edits, so the diagram can be revised without starting over.

By default both go to `./uml/` in the working folder; name a file or folder in the request to put them elsewhere.

## Inputs

| You give | The skill does |
|---|---|
| Source code (TypeScript, Java, C#, Python, ...) | one classifier per class, interface and enum with all members; folders or namespaces become packages; `extends` is a generalization and `implements` a realization (with bindings for generic targets); fields typed by a class of the model become associations with `0..*`, `0..1` or `1` at the target; parts an aggregate owns become compositions; classes used only in signatures become dependencies; `@aggregateRoot`-style markers become stereotypes |
| A description or requirements text | classes from the nouns that carry state, attributes as given (types only when the text states them), relationships and multiplicities from the verbs and quantities |
| A DDD domain model | bounded contexts as packages, aggregate roots, entities and value objects as stereotypes, owned parts as compositions, references between aggregates as associations to the root |
| A change request ("add a refund class linked to payment") | edits the existing model and builds the page again |

## Options

Ask for them in the request.

- **Level of detail and dependencies.** Chosen on the page itself, not in the request: the skill never trims members or relationships for an audience.
- **Packages.** Up to sixteen; they take the theme's five group colors in order and cycle from the sixth, and every zone carries its label. Classes outside every package are drawn in the neutral color.
- **Theme.** `default` (system fonts, pale header bands), `alt` (solid bands, Google Fonts), or the path of your own theme file. Every theme works in light and dark. A theme file written for plugin 0.2.0 lacks `--key-stereotype`, the color of a stereotype chip, and is refused with that token named: copy it from `shared/themes/default.css`.
- **Location.** A file or folder for the output.

## Example

```
Draw the class diagram of this domain layer, one package per folder:
<paste the TypeScript classes, interfaces and enums>
```

The skill writes `uml/<name>.uml.json` and `uml/<name>.html`: every class, interface and enumeration with its members, one zone per folder, generalizations and realizations with the parent above, compositions and associations with their multiplicities. The model format, with a complete example, is in [references/model.md](references/model.md).

To build a page from a model yourself, or with another theme:

```
python3 shared/scripts/artifact_page.py --type uml-class-diagram --model domain.uml.json --theme alt --out domain.html
```

## Requirements

`python3` (3.8 or later, standard library only). The page loads the layout library from a CDN when opened (and the fonts too, with a theme that uses Google Fonts; the default theme uses system fonts and loads none); offline it falls back to a simple grid layout of the packages, and says so.

<!-- performance:start -->
## Performance

With the plugin, the same prompts took 85.5% fewer tokens, 89.8% less time and 77.9% less cost than without it (medians of 3 runs per arm, summed over 3 cases).

| Case | Tokens (without → with) | Time (without → with) | Cost per run (without → with) |
|---|---:|---:|---:|
| easy | 50,032 → 114,087 (+128.0%) | 67.4 s → 21.2 s (-68.5%) | $0.28 → $0.20 (-30.3%) |
| medium | 463,037 → 97,124 (-79.0%) | 445.4 s → 42.5 s (-90.5%) | $1.31 → $0.27 (-79.4%) |
| complex | 2,266,188 → 190,664 (-91.6%) | 978.1 s → 88.6 s (-90.9%) | $3.04 → $0.56 (-81.6%) |
| **Total** | 2,779,257 → 401,875 (-85.5%) | 1490.9 s → 152.3 s (-89.8%) | $4.64 → $1.03 (-77.9%) |

Tokens count input, cache and output over every model of the session; time is wall-clock; cost is in USD. Each case shows the median of its runs; the total adds the medians of the cases.

- **Evaluated:** 2026-11-18, plugin 0.3.0, model claude-opus-5-5, effort medium, 3 runs per arm.
- **Result:** below target; worse: easy tokens; goal: at least 20.0% fewer tokens and 20.0% less time. **Decision:** adopt (2026-11-18).
<!-- performance:end -->
