# erd-artifact Specification

## Purpose
Entity relationship diagrams produced from a short request: the skill writes a small data model, the plugin validates it and delivers an artifact page drawn with the shared visual design and standard crow's foot notation.

## Requirements

### Requirement: Skill turns a request into an ERD page
The plugin SHALL provide an ERD skill that, from a description of a data model, a schema (SQL DDL or an ORM model) or an existing ERD model file, writes an ERD model file and produces its artifact page.

#### Scenario: From a description
- **WHEN** the user asks for an ERD of a customer, order, order line, product and payment schema described in prose
- **THEN** the skill writes an ERD model file and an artifact page showing those five entities and their relationships

#### Scenario: From SQL DDL
- **WHEN** the user provides `CREATE TABLE` statements with primary and foreign keys
- **THEN** every table becomes an entity, every column keeps its name and type, and every foreign key becomes a relationship

#### Scenario: Change to an existing diagram
- **WHEN** the user asks to add an entity to an ERD the skill produced earlier
- **THEN** the skill edits the existing model file and produces the page again, keeping everything not asked to change

### Requirement: The model holds data, not markup
The skill SHALL express a diagram only as an ERD model: a JSON document with a title, an optional description, optional groups, entities and relationships. It SHALL NOT write markup, styles, scripts or coordinates.

#### Scenario: Model content
- **WHEN** the skill writes a model for any request
- **THEN** the file contains only the model's fields and no HTML, CSS, SVG, script or position values

### Requirement: Entities and columns
An entity SHALL have a unique name and at least one column. A column SHALL have a name unique within its entity and a type, and MAY be marked as primary key, foreign key, or both, as unique, and as nullable. Every marker is optional and defaults to false.

#### Scenario: Composite primary key
- **WHEN** two columns of an entity are marked as primary key
- **THEN** both are shown as key columns and the model is valid

#### Scenario: Duplicate column rejected
- **WHEN** an entity has two columns with the same name
- **THEN** validation fails, naming the entity and the column

#### Scenario: Unique and nullable from DDL
- **WHEN** the user provides `email text NOT NULL UNIQUE` and `paid_at timestamp`
- **THEN** the model marks `email` unique and `paid_at` nullable, and the page shows a unique key chip on `email` and the nullable marker on `paid_at`

#### Scenario: Model without the new markers
- **WHEN** a model written for the previous version has no `uk` or `nullable` field
- **THEN** it validates and is drawn with no unique chip and no nullable marker

#### Scenario: Non-boolean marker rejected
- **WHEN** a column has `nullable: "yes"`
- **THEN** validation fails, naming the entity, the column and the field

### Requirement: Relationships and cardinality
A relationship SHALL join two entities, MAY name the joining columns and carry a short label, and SHALL give each end one cardinality: `1` (exactly one), `0..1` (zero or one), `1..*` (one or more) or `0..*` (zero or more).

#### Scenario: Unknown entity rejected
- **WHEN** a relationship names an entity the model does not define
- **THEN** validation fails, naming the relationship and the missing entity

#### Scenario: Unknown cardinality rejected
- **WHEN** a relationship end has a cardinality outside the four allowed values
- **THEN** validation fails, listing the allowed values

#### Scenario: Self-relationship
- **WHEN** a relationship joins an entity to itself, such as an employee and their manager
- **THEN** the model is valid and the relationship is drawn as a loop on that entity

### Requirement: Relationship kind
A relationship SHALL have a kind: `owned`, when the child entity exists only as part of the parent and its identity includes the parent's key, or `referenced`, when the child only points to the parent. The kind defaults to `referenced`. The user MAY state the kind of any relationship; otherwise the skill sets `owned` when the child's primary key includes the joining foreign key.

#### Scenario: User chooses the kind
- **WHEN** the user asks for `order_line` to be owned by `order` and `order` to reference `customer`
- **THEN** the model marks the first relationship `owned` and the second `referenced`

#### Scenario: Unknown kind rejected
- **WHEN** a relationship has a kind other than `owned` or `referenced`
- **THEN** validation fails, listing the allowed values

### Requirement: Tables drawn as header-band nodes
Each entity SHALL be drawn as the design's header-band node: the entity name left-aligned in the band, one row per column with key chips, name and type in the data face, primary key names bold, and the nullable marker before the type of a nullable column. The band and outline take the entity's group role; with groups defined, an ungrouped entity takes the neutral role with a dashed outline; with none, every table takes the accent role.

#### Scenario: Grouped and ungrouped entities
- **WHEN** a model puts `order` in the first group and leaves `audit_log` ungrouped
- **THEN** the band of `order` uses the first group role and the band of `audit_log` uses the neutral role with a dashed outline

#### Scenario: Model without groups
- **WHEN** a model defines no groups
- **THEN** every table band uses the accent role and no zone is drawn

#### Scenario: Key chips
- **WHEN** a column is both primary and foreign key, and another is unique
- **THEN** the first shows a primary-key chip and a foreign-key chip, in that order, and the second shows a unique chip, each in its key role

#### Scenario: Coherent with the design's role map
- **WHEN** the reviewer compares an ERD table with the header-band node defined in the visual design's role map
- **THEN** band, body, outline, row text, chips and data face match the shared definition and proportions, which the next artifact type must also use

### Requirement: Crow's foot notation
Each relationship end SHALL carry the information engineering mark for its cardinality: a bar for one, a crow's foot for many, a ring for zero. Connectors SHALL be orthogonal and drawn with the line role: solid for an `owned` relationship, dashed for a `referenced` one. A label, when present, sits beside the connector.

#### Scenario: Marks per cardinality
- **WHEN** a relationship has `1` at one end and `0..*` at the other
- **THEN** the first end shows two bars and the second shows a ring and a crow's foot

#### Scenario: Line per kind
- **WHEN** a diagram has one owned and one referenced relationship
- **THEN** the owned connector is solid and the referenced connector is dashed with the design's dash pattern, both in the line role

### Requirement: Automatic layout
The diagram SHALL be laid out automatically so that tables do not overlap, connectors do not cross tables, related tables sit near each other, each group's tables sit inside their zone and zones do not overlap. The model SHALL NOT carry positions.

#### Scenario: No overlap
- **WHEN** a model with twelve entities and fifteen relationships is drawn
- **THEN** no two tables overlap and no connector passes through a table

#### Scenario: Zones keep their tables
- **WHEN** a model with three groups is drawn, with the layout library available and without it
- **THEN** in both cases every table of a group lies inside that group's zone, no ungrouped table lies inside a zone, and no two zones overlap

### Requirement: Light and dark under any theme
An ERD page SHALL be complete and legible in light and dark under every complete theme, including a non-default one.

#### Scenario: Alternate theme in dark
- **WHEN** an ERD page is produced with the alternate theme and viewed in dark mode
- **THEN** every table, mark, connector and label is visible with the alternate theme's dark values, and text reaches the contrast ratios set by the visual design

### Requirement: Relationships table
An ERD page SHALL carry, under the drawing, a relationships table with one row per relationship drawn: the child and parent (with the joining columns when the model names them), the kind, and the cardinality at each end in words. Rows SHALL be linked to the drawing by highlighting; a joining column SHALL be highlighted only when the current detail level draws it.

#### Scenario: Row per relationship
- **WHEN** a model has thirteen relationships, one of them owned with `columns: ["order_id", "id"]`
- **THEN** the table has thirteen rows, and that row reads `order_line.order_id` to `order.id`, owned, with both cardinalities in words

#### Scenario: Hover links table and drawing
- **WHEN** the pointer rests on a relationship's row at the all-columns level
- **THEN** its connector, both tables and, when the model names them, both joining column rows are highlighted in the drawing

#### Scenario: Hover at table names only
- **WHEN** the pointer rests on a relationship's row at the table-names level
- **THEN** its connector and both tables are highlighted, and no column is

#### Scenario: Table follows the view
- **WHEN** the viewer hides referenced relationships
- **THEN** the table lists only the owned relationships, and turning the switch on brings the other rows back

### Requirement: Legend of the ERD
An ERD page SHALL carry a legend card that explains the relationship kinds used, the four cardinality marks, the key chips used, the nullable marker when used, and each group with its zone sample.

#### Scenario: Legend matches the model
- **WHEN** a model uses only referenced relationships, primary and foreign keys and two groups
- **THEN** the legend shows the dashed sample, the cardinality marks, the primary-key and foreign-key chips and the two group samples, and no owned sample, no unique chip and no nullable marker

### Requirement: Groups with cycling colors
A model MAY define up to sixteen groups and assign each entity to at most one. A model with more than sixteen groups SHALL be rejected. Groups take the five group roles in order of first appearance and cycle from the sixth. Each group with at least one entity SHALL be drawn as a zone, in its group role and labelled, that contains exactly its entities.

#### Scenario: Six groups reuse the first color
- **WHEN** a model defines six groups
- **THEN** the model is valid, the sixth group takes the first group role, and every zone carries its own label

#### Scenario: Seventeen groups rejected
- **WHEN** a model defines seventeen groups
- **THEN** validation fails and suggests merging groups or splitting the diagram

#### Scenario: Groups drawn as zones
- **WHEN** a model puts five tables in "Sales", four in "Catalog" and two in "Billing", and leaves one ungrouped
- **THEN** three zones are drawn, each labelled and tinted with its group role, each containing only its tables, and the ungrouped table sits outside every zone

### Requirement: Detail levels
The ERD page SHALL offer three detail levels through the shared view options: all columns, key columns only (the columns with a primary, foreign or unique key chip) and table names only. Changing the level SHALL redraw and lay the diagram out again for the new sizes, keeping relationships, groups and their zones.

#### Scenario: Key columns only
- **WHEN** the viewer chooses key columns only
- **THEN** every table shows only its columns with a key chip, tables shrink, and the layout leaves no gap where hidden columns were

#### Scenario: Table names only
- **WHEN** the viewer chooses table names only
- **THEN** every table shows its header band and no column, and every relationship and zone is still drawn

#### Scenario: Level by keyboard
- **WHEN** the viewer presses `1`, `2` or `3` with no text field focused
- **THEN** the page switches to all columns, key columns only or table names only

#### Scenario: Same control as the class diagram
- **WHEN** an ERD page and a class diagram page are shown in the same theme and mode
- **THEN** both show the detail control in the page head with the same look, the same three keys and the same hint line format

### Requirement: Referenced relationships switch
The ERD page SHALL offer, when its model has both owned and referenced relationships, a switch that shows or hides the referenced connectors, on by default. Hiding them SHALL redraw the diagram without them and without the room they took. A model with only one kind SHALL show no such switch.

#### Scenario: Referenced hidden
- **WHEN** the viewer turns the switch off, or presses `R`
- **THEN** no dashed connector is drawn, the legend drops the referenced sample, and the relationships table drops their rows

#### Scenario: One kind only
- **WHEN** every relationship of the model is referenced
- **THEN** the page head shows no referenced relationships switch and `R` does nothing

#### Scenario: Alternate theme in dark
- **WHEN** an ERD page is produced with the alternate theme, viewed in dark mode, at key columns only with referenced relationships hidden
- **THEN** every table, chip, connector, mark and zone drawn is visible with the alternate theme's dark values, and the selected level and the off switch are told apart by their colors

### Requirement: Counts line
The ERD page SHALL show under its title the number of groups (when the model has groups), tables and relationships drawn, with relationships counted per kind.

#### Scenario: Counts follow the view
- **WHEN** a model with three groups, twelve tables and thirteen relationships, three of them owned, is drawn and the viewer hides referenced relationships
- **THEN** the counts line changes from `3 groups · 12 tables · 13 relationships (3 owned, 10 referenced)` to `3 groups · 12 tables · 3 relationships (3 owned)`
