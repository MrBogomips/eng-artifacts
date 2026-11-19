## ADDED Requirements

### Requirement: Skill turns a request into an object diagram page
The plugin SHALL provide a UML object diagram skill that, from a description of a concrete situation, test data or fixtures, an existing class diagram model with example data, or an existing object diagram model, writes an object diagram model file named `<name>.object.uml.json` and produces its artifact page. A request for an object diagram or an instance diagram SHALL reach this skill and not the class diagram skill.

#### Scenario: From a description of a situation
- **WHEN** the user describes a library on one afternoon (members, copies, loans) and asks for its object diagram
- **THEN** the skill writes an object diagram model with those instances, their slots and links, and produces the page

#### Scenario: From a class diagram and example data
- **WHEN** the user hands over a class diagram model and a set of example records
- **THEN** each record becomes an instance of its class, its field values become slots, and its references to other records become links named after the class diagram's association roles

#### Scenario: Object diagram request
- **WHEN** the user asks for an "object diagram" or an "instance diagram"
- **THEN** the object diagram skill handles it and the class diagram skill does not

#### Scenario: Change to an existing diagram
- **WHEN** the user asks to add an instance to an object diagram the skill produced earlier
- **THEN** the skill edits the existing model file and produces the page again, keeping everything not asked to change

### Requirement: The object model holds data, not markup
The skill SHALL express a diagram only as an object diagram model: a JSON document with a title, an optional description, optional packages, objects and links. Validation SHALL reject unknown fields, positions and styles, naming the element and the field.

#### Scenario: Position field rejected
- **WHEN** an object carries an `x`, `y`, `position` or `style` field
- **THEN** validation fails, naming the object and the field

### Requirement: Objects
An object SHALL have an id unique in the model and the name of its classifier, and MAY have a name, a package, stereotypes and slots. An object without a name is anonymous. An object MAY instead be an enumeration literal, carrying the literal and no slots. A slot SHALL have a name unique within its object and a value, and MAY have a type.

#### Scenario: Named and anonymous instances
- **WHEN** one object is named `alice` of class `Member` and another has no name and the class `Member`
- **THEN** the model is valid, the first is titled `alice : Member` and the second `: Member`

#### Scenario: Duplicate id rejected
- **WHEN** two objects share the id `loan1`
- **THEN** validation fails, naming the id

#### Scenario: Literal with slots rejected
- **WHEN** an enumeration literal object also has slots
- **THEN** validation fails, naming the object

#### Scenario: Duplicate slot rejected
- **WHEN** an object has two slots named `due`
- **THEN** validation fails, naming the object and the slot

### Requirement: Links
A link SHALL join two objects of the model and MAY carry a name and, at each end, a role and the navigable mark. A link MAY join an object to itself.

#### Scenario: Unknown object rejected
- **WHEN** a link names an object id the model does not define
- **THEN** validation fails, naming the link and the missing id

#### Scenario: Multiplicity rejected
- **WHEN** a link end carries a multiplicity
- **THEN** validation fails, saying that a link joins exactly two instances

### Requirement: Packages of an object diagram
A model MAY define up to sixteen packages and assign each object to at most one, with the same rules and drawing as the class diagram's packages: the group roles in order of first appearance, cycling from the sixth, one labelled zone per package holding exactly its objects, the neutral role with a dashed outline for an object outside every package, the accent role when no package is defined. More than sixteen packages SHALL be rejected.

#### Scenario: Object outside every package
- **WHEN** a model has packages and one object in none of them
- **THEN** that object takes the neutral role with a dashed outline and lies outside every zone

### Requirement: Objects drawn as header-band nodes
Each object SHALL be drawn as the design's header-band node: the title `name : Class` (or `: Class`) underlined and left-aligned in the band, stereotype chips in the stereotype key role, then one row per slot reading `name = value`, or `name : type = value` when the slot has a type, with the type and the value in the data face in the secondary ink role. An enumeration literal SHALL be titled `Literal : Enum`, carry the «enumeration» chip and have no rows.

#### Scenario: Slots shown
- **WHEN** an object `loan1 : Loan` has the slots `due : Date = 2026-11-30` and `renewals = 1`
- **THEN** the band reads `loan1 : Loan` underlined and the body shows the two slot rows with the type and values in the data face

#### Scenario: Coherent with the class diagram
- **WHEN** the reviewer puts an object of an object diagram page beside a class of a class diagram page, both in the same theme and mode
- **THEN** band height, row height, insets, outline, band tint, chips and data face are the same, and only the content and the underline differ

### Requirement: Link notation
Links SHALL be orthogonal solid connectors in the line role, with no mark at an end that is not navigable and an open arrowhead at a navigable end. Role names SHALL sit beside their ends and a link's name at its middle, as edge labels. A link joining an object to itself SHALL be drawn as a loop. Connectors SHALL hop at crossings.

#### Scenario: Navigable link
- **WHEN** a link from `loan1` to `copy7` is navigable at `copy7` with the role `item`
- **THEN** the connector ends at `copy7` with an open arrowhead and the label `item`, and the end at `loan1` has no mark

### Requirement: Object detail levels
The page SHALL offer two detail levels, all slots and names only, switched by the view options or the keys `1` and `2`. Changing the level SHALL redraw and lay the diagram out again for the new sizes.

#### Scenario: Names only
- **WHEN** the viewer chooses names only
- **THEN** every object shows its band with its chips and no slot rows, and the layout leaves no gap where the rows were

### Requirement: Automatic layout of an object diagram
The diagram SHALL be laid out automatically with the class diagram's engine: objects do not overlap, connectors do not cross objects, each package's objects sit inside its zone and zones do not overlap. When the layout library cannot be loaded, objects SHALL be arranged by package in a simple grid and a notice SHALL say automatic layout was unavailable.

#### Scenario: Sample laid out
- **WHEN** the sample model is drawn
- **THEN** no two objects overlap, no connector passes through an object, and every object lies inside its package's zone

### Requirement: Light and dark object diagram under any theme
An object diagram page SHALL be complete and legible in light and dark under every complete theme, including a non-default one.

#### Scenario: Alternate theme in dark
- **WHEN** an object diagram page is produced with the alternate theme and viewed in dark mode
- **THEN** every object, chip, slot, link end, label and zone is visible with the alternate theme's dark values, and text reaches the contrast ratios set by the visual design

### Requirement: Links table, legend and counts
An object diagram page SHALL carry a links table with one row per link (source, link name, target, the roles in words) linked to the drawing by highlighting, a legend card that explains the instance title, the slot notation, the link and the navigable end when used, each stereotype used, the enumeration literal when used and each package with its zone sample, and a counts line with the number of packages, objects and links.

#### Scenario: Pinned object highlights its rows
- **WHEN** the viewer clicks `alice`
- **THEN** `alice`, its links and the objects at their other ends stay highlighted, and the rows of those links in the table are highlighted

#### Scenario: Legend matches the model
- **WHEN** a model has no navigable link, no stereotype and no enumeration literal
- **THEN** the legend shows the instance title, the slot notation and the link sample, and no arrowhead, chip or literal sample
