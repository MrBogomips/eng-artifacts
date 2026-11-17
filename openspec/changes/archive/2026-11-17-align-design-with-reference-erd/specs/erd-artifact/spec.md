# Spec Delta

## MODIFIED Requirements

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

### Requirement: Groups
A model MAY define up to five groups and assign each entity to at most one. A model with more than five groups SHALL be rejected, because the design has five group colors and does not reuse them. Each group that has at least one entity SHALL be drawn as a zone, in its group role and labelled with its label, that contains exactly its entities.

#### Scenario: Six groups rejected
- **WHEN** a model defines six groups
- **THEN** validation fails and suggests merging groups or splitting the diagram

#### Scenario: Groups drawn as zones
- **WHEN** a model puts five tables in "Sales", four in "Catalog" and two in "Billing", and leaves one ungrouped
- **THEN** three zones are drawn, each labelled and tinted with its group role, each containing only its tables, and the ungrouped table sits outside every zone

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

### Requirement: Automatic layout
The diagram SHALL be laid out automatically so that tables do not overlap, connectors do not cross tables, related tables sit near each other, each group's tables sit inside their zone and zones do not overlap. The model SHALL NOT carry positions.

#### Scenario: No overlap
- **WHEN** a model with twelve entities and fifteen relationships is drawn
- **THEN** no two tables overlap and no connector passes through a table

#### Scenario: Zones keep their tables
- **WHEN** a model with three groups is drawn, with the layout library available and without it
- **THEN** in both cases every table of a group lies inside that group's zone, no ungrouped table lies inside a zone, and no two zones overlap

## ADDED Requirements

### Requirement: Relationships table
An ERD page SHALL carry, under the drawing, a relationships table with one row per relationship: the child and parent (with the joining columns when the model names them), the kind, and the cardinality at each end in words. Rows SHALL be linked to the drawing by highlighting.

#### Scenario: Row per relationship
- **WHEN** a model has thirteen relationships, one of them owned with `columns: ["order_id", "id"]`
- **THEN** the table has thirteen rows, and that row reads `order_line.order_id` to `order.id`, owned, with both cardinalities in words

#### Scenario: Hover links table and drawing
- **WHEN** the pointer rests on a relationship's row
- **THEN** its connector, both tables and, when the model names them, both joining column rows are highlighted in the drawing

### Requirement: Legend of the ERD
An ERD page SHALL carry a legend card that explains the relationship kinds used, the four cardinality marks, the key chips used, the nullable marker when used, and each group with its zone sample.

#### Scenario: Legend matches the model
- **WHEN** a model uses only referenced relationships, primary and foreign keys and two groups
- **THEN** the legend shows the dashed sample, the cardinality marks, the primary-key and foreign-key chips and the two group samples, and no owned sample, no unique chip and no nullable marker
