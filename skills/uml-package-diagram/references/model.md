# UML package diagram model

The file the skill writes: `<name>.package.uml.json`, plain JSON holding data only. The validator rejects any field not listed below.

## Fields

```text
model          title (required), description, packages (required, at least one, at most sixteen), dependencies
package        id (required, unique), name (required), parent, stereotypes, members
member         name (required, unique within the package), kind
dependency     from, to (required, package ids), kind (required), label
```

Every field except those marked required is optional.

- `title` becomes the page title and heading; `description`, when present, appears under it.
- `id` names the package in the model (`parent` and dependencies refer to it) and is never drawn; `name` is the text in the folder's tab. Two packages may share a `name` at different places of the tree, never an `id`.
- `stereotypes` is a list of words without the guillemets: `["model"]` is drawn as a chip reading «model» in the tab, `["profile"]` as «profile».

## Nesting

`parent` is the id of the package that holds this one. A package without `parent` is at the top. Nesting may be any number of levels deep and must not form a cycle. A package that holds packages is drawn as a larger folder whose body contains the folders of its children; a package that holds none is drawn as a folder with its members listed in the body.

## Members

`members` lists the elements a package owns, one row each, in the order of the file. `kind` is `class` (the default, drawn as the bare name), `interface` or `enumeration`; the last two are drawn with their keyword «interface» or «enumeration» after the name. A member is a row, never a box of its own: list the elements that make the package's content clear, not necessarily all of them. A package that holds packages may have members too; they are drawn above its children.

## Packages and colors

At most sixteen packages. Each takes a group color in order of the file; the five colors cycle from the sixth package, so two packages may share a color and only the names tell them apart.

## Dependencies

`from` is the client and `to` the supplier, both package ids. `kind` is required:

| `kind` | Meaning | Drawn |
|---|---|---|
| `import` | the client uses the public elements of the supplier | dashed line, open arrowhead at the supplier, label «import» |
| `access` | as import, the elements stay private to the client | dashed line, open arrowhead, label «access» |
| `merge` | the client's elements extend the supplier's | dashed line, open arrowhead, label «merge» |
| `dependency` | a plain use | dashed line, open arrowhead, no keyword |

`label` is a short word written on the line: after the keyword for the first three kinds (`«import» uses`), alone for a plain dependency. A package cannot depend on itself, nor on a package that contains it or that it contains: nesting already says so. Draw a dependency between the two packages that actually use each other, at whichever level of the tree they are.

## Example

```json
{
  "title": "Layers of an online shop",
  "description": "Presentation, application, domain and infrastructure.",
  "packages": [
    { "id": "shop", "name": "shop", "stereotypes": ["model"] },
    { "id": "presentation", "name": "presentation", "parent": "shop" },
    { "id": "application", "name": "application", "parent": "shop",
      "members": [ { "name": "PlaceOrder" } ] },
    { "id": "domain", "name": "domain", "parent": "shop" },
    { "id": "ordering", "name": "ordering", "parent": "domain",
      "members": [ { "name": "Order" }, { "name": "OrderRepository", "kind": "interface" }, { "name": "OrderState", "kind": "enumeration" } ] },
    { "id": "billing", "name": "billing", "parent": "domain", "members": [ { "name": "Invoice" } ] },
    { "id": "infrastructure", "name": "infrastructure", "parent": "shop" },
    { "id": "persistence", "name": "persistence", "parent": "infrastructure" },
    { "id": "audit", "name": "audit", "stereotypes": ["profile"] }
  ],
  "dependencies": [
    { "from": "presentation", "to": "application", "kind": "import" },
    { "from": "application", "to": "domain", "kind": "import" },
    { "from": "persistence", "to": "ordering", "kind": "import" },
    { "from": "billing", "to": "ordering", "kind": "access" },
    { "from": "shop", "to": "audit", "kind": "merge" },
    { "from": "application", "to": "audit", "kind": "dependency", "label": "logs to" }
  ]
}
```

`audit` has no parent, so it is drawn beside `shop` at the top level. The page script validates the model before it draws anything, so there is no separate validation step. To check a model without producing a page, run `python3 "${CLAUDE_PLUGIN_ROOT}/skills/uml-package-diagram/scripts/uml_package_diagram_model.py" <file>`: it prints every problem and exits non-zero when there is one.
