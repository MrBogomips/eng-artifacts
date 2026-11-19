---
name: uml-class-diagram
description: "Draw a UML class diagram as a self-contained HTML page with the standard class notation, packages, three levels of detail, a light/dark toggle and replaceable themes. Use when the user asks for a UML class diagram, a class diagram or a domain model diagram, or hands over source code (classes, interfaces, enums), a domain description or a DDD domain model (aggregates, entities, value objects, bounded contexts) to draw. Also use to change a class diagram this skill produced earlier: add or rename a class, change a relationship. For a snapshot of instances use the object diagram skill; for packages and the dependencies between them alone, the package diagram skill."
---

# UML class diagram

You write a small JSON model; a script validates it, lays the diagram out and produces the page. Never write HTML, CSS, SVG, scripts, colors or coordinates yourself: they come from the plugin, and they are what makes the page match every other artifact of the plugin. The page lets the reader choose the level of detail (all members, public members, class names only) and hide dependencies, so never trim members or relationships for an audience.

## Steps

1. **Check python3.** Run `python3 --version`. If it is missing, tell the user that `python3` is required to produce the page and stop: produce no partial page.
2. **Choose where to write.** If the user names a file or a folder, use it (a named file is the page; the model goes next to it). Otherwise write to `./uml/<name>.html` and `./uml/<name>.uml.json` in the working directory, with `<name>` taken from the subject (`ticketing-domain`).
3. **Read the model format** in `${CLAUDE_PLUGIN_ROOT}/skills/uml-class-diagram/references/model.md`, once, before writing the model: it holds the fields, the relationship kinds and which end is `from`, the end and multiplicity forms and a complete example, which this file does not repeat.
4. **Write the model** `<name>.uml.json`: the only file you write by hand. Model everything the source holds, by source:
   - **Source code.**
     - Every class, abstract class, interface and enum is a classifier with all its attributes and operations (visibility, `static`, `readOnly`, types, parameters, return types, defaults). A folder, namespace or module is a package.
     - A marker such as `@aggregateRoot` or `@valueObject` in a doc tag or decorator is a stereotype (`aggregate root`, `value object`).
     - `extends` is a generalization, `implements` a realization, with `bindings` when the target is generic (`Repository<Order>` gives `{ "T": "Order" }`).
     - A field whose type is a classifier of the model, an enumeration included, is an association to it (the field stays among the attributes): an array gives `0..*` at the target, an optional field `0..1`, any other field `1`. A field and its inverse are one association with both ends named and navigable.
     - A private collection of parts the class creates and keeps is a composition when the user says so, and also when a DDD aggregate root holds entities or value objects of its own package; a collection the class only refers to is an aggregation when the user says so.
     - A classifier that appears only as a parameter or return type, with no field of that type, is a dependency.
   - **A description or requirements text.** Nouns that carry state become classes; take attributes as given, without types unless the text states them; relationships come from the verbs and quantities ("each order has one or more lines" is a composition if lines exist only inside their order, otherwise an association). Group into packages only when the text names areas.
   - **A DDD domain model.** Each bounded context is a package; aggregate roots, entities and value objects take their stereotypes; an aggregate owns its parts by composition; references between aggregates are associations to the root.
   - Where the source does not say how many instances of the holder point to one target, the holder's end of an association or aggregation is `*`, and the whole's end of a composition is `1`.
5. **Produce the page.** The theme is `default` unless the user names another (`alt`, or the path of their own theme file):
   ```
   python3 "${CLAUDE_PLUGIN_ROOT}/shared/scripts/artifact_page.py" --type uml-class-diagram --model <name>.uml.json --theme default --out <name>.html
   ```
   On success it prints the page path. On failure it writes nothing and lists every problem: fix the model and run it again. Never patch the page.
6. **Report** the page path and the model path, and say what was drawn in a sentence. The page loads its layout library from a CDN when opened (and the fonts of a theme that uses Google Fonts); offline it falls back to a simple grid, and says so. Publish it as an artifact only when the session can and the user wants it.

## Changing an existing diagram

When the user asks to change a class diagram produced earlier, edit its `.uml.json` (keep everything they did not ask to change), run step 5 again, and report. Do not start from scratch. The file already shows the format, so read the model reference (step 3) only when the change needs a field or a relationship kind the file does not use yet.
