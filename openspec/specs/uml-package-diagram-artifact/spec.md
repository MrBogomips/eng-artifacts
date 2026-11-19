# uml-package-diagram-artifact Specification

## Purpose
UML package diagrams of the packages of a system, nested to any depth, with their members and their import, access, merge and plain dependencies, written from a source tree, a layered architecture or a class diagram model: the skill writes a small data model, the plugin validates it and delivers an artifact page drawn with folder-tab packages and the shared visual design.

## Requirements

### Requirement: Skill turns a request into a package diagram page
The plugin SHALL provide a UML package diagram skill that, from a source tree (modules, namespaces, folders and their imports), an architecture description with layers, an existing class diagram model, or an existing package diagram model, writes a package diagram model file named `<name>.package.uml.json` and produces its artifact page.

#### Scenario: From a source tree
- **WHEN** the user hands over a source tree of four top-level folders with subfolders and the imports between them
- **THEN** each folder becomes a package nested as in the tree, each import between folders becomes an `«import»` dependency, and the page is produced

#### Scenario: From a layered architecture description
- **WHEN** the user describes presentation, application, domain and infrastructure layers and which layer uses which
- **THEN** the skill writes one package per layer and a dependency for each use, and produces the page

#### Scenario: Change to an existing diagram
- **WHEN** the user asks to add a package to a package diagram the skill produced earlier
- **THEN** the skill edits the existing model file and produces the page again, keeping everything not asked to change

### Requirement: The package model holds data, not markup
The skill SHALL express a diagram only as a package diagram model: a JSON document with a title, an optional description, packages and dependencies. Validation SHALL reject unknown fields, positions and styles, naming the element and the field.

#### Scenario: Position field rejected
- **WHEN** a package carries an `x`, `y`, `position` or `style` field
- **THEN** validation fails, naming the package and the field

### Requirement: Packages and nesting
A package SHALL have an id unique in the model and a name, and MAY have a parent package, stereotypes and members. A model SHALL have at least one package and at most sixteen. Nesting SHALL NOT form a cycle. A member SHALL have a name unique within its package and MAY have a kind: `class`, `interface` or `enumeration`.

#### Scenario: Nesting cycle rejected
- **WHEN** package `a` has the parent `b` and `b` has the parent `a`
- **THEN** validation fails, naming the packages of the cycle

#### Scenario: Unknown parent rejected
- **WHEN** a package names a parent the model does not define
- **THEN** validation fails, naming the package and the missing parent

#### Scenario: Seventeen packages rejected
- **WHEN** a model defines seventeen packages
- **THEN** validation fails and suggests merging packages or splitting the diagram

### Requirement: Package dependencies
A dependency SHALL join two packages of the model and have a kind: `import`, `access`, `merge` or `dependency`, and MAY carry a label. A dependency SHALL NOT join a package to itself, nor a package to a package it contains or that contains it.

#### Scenario: Unknown kind rejected
- **WHEN** a dependency has the kind `include`
- **THEN** validation fails, listing the allowed kinds

#### Scenario: Dependency on a containing package rejected
- **WHEN** `domain.ordering` depends on `domain`, its parent
- **THEN** validation fails, naming the dependency

### Requirement: Packages drawn as folder-tab nodes
Each package SHALL be drawn as a folder: a tab on the top-left, as high as a header band and as wide as its content, holding the name and the stereotype chips in the package's group band, over a body. The name in the tab SHALL be set one step smaller than a header band's title, in the tab text role. Packages SHALL take the group roles in order of first appearance, cycling from the sixth.

#### Scenario: Stereotyped package
- **WHEN** the root package carries the stereotype `model` and another the stereotype `profile`
- **THEN** their tabs carry the «model» and «profile» chips in the stereotype key role

#### Scenario: Coherent with the class diagram
- **WHEN** the reviewer puts a package tab of a package diagram page beside a class band of a class diagram page, both in the same theme and mode
- **THEN** band height, insets, band tint, text color and chips are the same, and the package name is smaller than the class name

### Requirement: Package bodies
The body of a package with no nested package SHALL list its members one per row, with an «interface» or «enumeration» keyword in the data face. The body of a package that holds packages SHALL be the zone ground of its group and contain its nested packages and, above them, its member rows.

#### Scenario: Member rows
- **WHEN** `ordering` owns the class `Order` and the interface `OrderRepository`
- **THEN** its body shows two rows, the second with the «interface» keyword in the data face

#### Scenario: Nested packages drawn inside
- **WHEN** `domain` holds `ordering`, `catalog` and `billing`
- **THEN** the three are drawn as folders inside `domain`'s body, each in its own group role, and no other package lies inside it

### Requirement: Package dependency notation
Every dependency SHALL be drawn as the class diagram's dependency connector: orthogonal, dashed, in the line role, with an open arrowhead at the supplier. An `import`, `access` or `merge` dependency SHALL carry its keyword `«import»`, `«access»` or `«merge»` as its middle label, and a plain dependency its label when it has one. Connectors SHALL hop at crossings.

#### Scenario: Import drawn
- **WHEN** `application` imports `domain`
- **THEN** a dashed connector runs from `application` to `domain` with an open arrowhead at `domain` and the label `«import»`

### Requirement: Package detail levels
The page SHALL offer two detail levels, members shown and names only, switched by the view options or the keys `1` and `2`. Changing the level SHALL redraw and lay the diagram out again, keeping nesting and dependencies.

#### Scenario: Names only
- **WHEN** the viewer chooses names only
- **THEN** no member row is drawn, a package without nested packages shrinks to its tab and a short body, and nested packages stay inside their parents

### Requirement: Automatic layout of a package diagram
The diagram SHALL be laid out automatically with the class diagram's engine, nested packages as compound nodes at any depth: packages do not overlap except by containment, each nested package lies inside its parent's body, and connectors do not cross a package they do not start or end in. When the layout library cannot be loaded, packages SHALL be arranged in a simple grid that keeps the nesting, and a notice SHALL say automatic layout was unavailable.

#### Scenario: Sample laid out
- **WHEN** the sample model is drawn
- **THEN** every nested package lies inside its parent, no two sibling packages overlap and no connector passes through an unrelated package

### Requirement: Light and dark package diagram under any theme
A package diagram page SHALL be complete and legible in light and dark under every complete theme, including a non-default one.

#### Scenario: Alternate theme in dark
- **WHEN** a package diagram page is produced with the alternate theme and viewed in dark mode
- **THEN** every tab, body, chip, member row, connector end and label is visible with the alternate theme's dark values, and text reaches the contrast ratios set by the visual design

### Requirement: Dependencies table, legend and counts
A package diagram page SHALL carry a dependencies table with one row per dependency (client, kind, supplier) linked to the drawing by highlighting, a legend card that explains the folder, each dependency kind used, each stereotype used and the member keywords when used, and a counts line with the number of packages, members and dependencies, dependencies counted per kind.

#### Scenario: Pinned package highlights its rows
- **WHEN** the viewer clicks `domain`
- **THEN** `domain`, its dependencies and the packages at their other ends stay highlighted, and the rows of those dependencies are highlighted

#### Scenario: Legend matches the model
- **WHEN** a model uses only `import` dependencies and no stereotype
- **THEN** the legend shows the folder and the import sample, and no access, merge, plain dependency or chip sample
