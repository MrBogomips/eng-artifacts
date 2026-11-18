# uml-class-diagram-artifact Specification

## Purpose
UML class diagrams produced from source code, a domain description or a DDD domain model: the skill writes a small data model, the plugin validates it and delivers an artifact page drawn with the shared visual design and standard UML class notation, at the level of detail the reader needs.

## Requirements

### Requirement: Skill turns a request into a class diagram page
The plugin SHALL provide a UML class diagram skill that, from source code, a textual domain description or requirements document, a DDD domain model, or an existing model file, writes a class diagram model file and produces its artifact page.

#### Scenario: From source code
- **WHEN** the user hands over TypeScript classes, interfaces and enums in four folders and asks for their class diagram
- **THEN** the skill writes a model with every class, interface and enumeration, one package per folder, and produces the page

#### Scenario: From a domain description
- **WHEN** the user describes a library domain in prose (books, copies, members, loans) without types
- **THEN** the skill writes a model with those classes, their attributes and relationships, members without a type are allowed, and the page is produced

#### Scenario: From a DDD domain model
- **WHEN** the user describes aggregates, entities and value objects in bounded contexts
- **THEN** each bounded context becomes a package, aggregate roots and value objects carry their stereotypes, and parts an aggregate owns are compositions

#### Scenario: Change to an existing diagram
- **WHEN** the user asks to add a class to a diagram the skill produced earlier
- **THEN** the skill edits the existing model file and produces the page again, keeping everything not asked to change

### Requirement: The model holds data, not markup
The skill SHALL express a diagram only as a class diagram model: a JSON document with a title, an optional description, optional packages, classifiers and relationships. It SHALL NOT write markup, styles, scripts or coordinates.

#### Scenario: Model content
- **WHEN** the skill writes a model for any request
- **THEN** the file contains only the model's fields and no HTML, CSS, SVG, script or position values

#### Scenario: Position field rejected
- **WHEN** a classifier carries an `x`, `y`, `position` or `style` field
- **THEN** validation fails, naming the classifier and the field

### Requirement: Classifiers
A classifier SHALL have a unique name and a kind: `class`, `interface` or `enumeration`. A class MAY be abstract. A classifier MAY carry stereotypes, generic type parameters and a package. An enumeration SHALL have at least one literal and no operations.

#### Scenario: Duplicate name rejected
- **WHEN** two classifiers are both named `Order`
- **THEN** validation fails, naming the classifier

#### Scenario: Unknown kind rejected
- **WHEN** a classifier has the kind `record`
- **THEN** validation fails, listing the allowed kinds

#### Scenario: Generic classifier
- **WHEN** an interface `Repository` has the type parameter `T`
- **THEN** the model is valid and the parameter is shown on the class

### Requirement: Members
An attribute SHALL have a name unique among its classifier's attributes and MAY carry a type, a visibility (public, protected, private, package), static, read-only, a multiplicity and a default value. An operation SHALL have a name and MAY carry parameters with names and types, a return type, a visibility, static, abstract, and the constructor marker.

#### Scenario: Members of a class
- **WHEN** a class has a private static read-only attribute `MAX_TICKETS: number = 10` and a public async operation `confirm(payments: PaymentService, method: PaymentMethod): Promise<Receipt>`
- **THEN** the model is valid and both are shown with their visibility, types and parameters

#### Scenario: Unknown visibility rejected
- **WHEN** an attribute has the visibility `internal`
- **THEN** validation fails, naming the classifier, the attribute and the allowed values

#### Scenario: Abstract operation in a concrete class rejected
- **WHEN** a class that is not abstract has an abstract operation
- **THEN** validation fails, naming the class and the operation

### Requirement: Relationships
A relationship SHALL join two classifiers of the model and have one kind: `generalization`, `realization`, `composition`, `aggregation`, `association` or `dependency`. A realization SHALL point to an interface. Generalizations SHALL NOT form a cycle.

#### Scenario: Unknown classifier rejected
- **WHEN** a relationship names a classifier the model does not define
- **THEN** validation fails, naming the relationship and the missing classifier

#### Scenario: Realization of a class rejected
- **WHEN** a realization points to a class that is not an interface
- **THEN** validation fails, naming the relationship

#### Scenario: Generalization cycle rejected
- **WHEN** `A` generalizes to `B` and `B` generalizes to `A`
- **THEN** validation fails, naming the classifiers of the cycle

#### Scenario: Realization of a generic interface
- **WHEN** `OrderRepository` realizes `Repository` binding `T` to `Order`
- **THEN** the model is valid and the connector is labelled with the binding `<T → Order>`

### Requirement: Association ends
A composition, aggregation or association SHALL give each end a multiplicity and MAY give it a role name and mark it navigable. A multiplicity SHALL be `n`, `n..m`, `n..*` or `*`, with whole numbers and `n` not greater than `m`.

#### Scenario: Ends shown
- **WHEN** `Order` holds `lines` of `OrderLine` as owned parts
- **THEN** the composition shows `1` at `Order` and the role `lines` with `0..*` at `OrderLine`

#### Scenario: Invalid multiplicity rejected
- **WHEN** an end has the multiplicity `3..1`
- **THEN** validation fails, naming the relationship, the end and the allowed forms

#### Scenario: Field and its inverse
- **WHEN** `Customer` holds `orders: Order[]` and `Order` holds `customer: Customer`
- **THEN** the skill writes one relationship with both ends navigable and named, and the page draws one connector between the two classes

### Requirement: Field rules when starting from code
When the source is code, the skill SHALL turn every field whose type is a classifier of the model, enumerations included, into an association end: an array `0..*`, an optional field `0..1`, any other field `1`. It SHALL keep the field among the class's attributes, and turn a classifier used only as a parameter or return type into a dependency.

#### Scenario: Enumeration-typed field
- **WHEN** `Order` has the field `status: OrderStatus` and `OrderStatus` is an enumeration of the model
- **THEN** the model has an association from `Order` to `OrderStatus` with `1` at `OrderStatus`, and `status` stays among `Order`'s attributes

#### Scenario: Parameter type only
- **WHEN** `Order.confirm` takes a `PaymentService` and `Order` has no field of that type
- **THEN** the model has a dependency from `Order` to `PaymentService`

### Requirement: Packages
A model MAY define up to sixteen packages and assign each classifier to at most one. A model with more than sixteen packages SHALL be rejected. Packages take the five group roles in order of first appearance and cycle through them again from the sixth. Each package that holds a classifier SHALL be drawn as a zone in its group role, labelled with its name, that contains exactly its classifiers.

#### Scenario: Group roles cycle
- **WHEN** a model defines seven packages
- **THEN** the model is valid, the sixth package takes the first group role and the seventh the second, and every zone carries its own label

#### Scenario: Seventeen packages rejected
- **WHEN** a model defines seventeen packages
- **THEN** validation fails and suggests merging packages or splitting the diagram

#### Scenario: Packages drawn as zones
- **WHEN** a model has four packages and every classifier in one of them
- **THEN** four zones are drawn, each labelled and tinted with its group role and containing only its classifiers

#### Scenario: Classifier outside every package
- **WHEN** a model has packages and one class in none of them
- **THEN** that class takes the neutral role with a dashed outline and lies outside every zone

#### Scenario: Model without packages
- **WHEN** a model defines no packages
- **THEN** every class band uses the accent role and no zone is drawn

### Requirement: Classes drawn as header-band nodes
Each classifier SHALL be drawn as the design's header-band node: the name left-aligned in the band, italic when abstract, stereotype chips in the stereotype key role, generic parameters in a dashed box on the band's corner, then the attributes, a compartment rule, and the operations, or the literals of an enumeration.

#### Scenario: Member notation
- **WHEN** a class has public, protected and private members, a static attribute and an abstract operation
- **THEN** each member starts with `+`, `#` or `-`, types and parameters are in the data face in the secondary ink role, the static attribute is underlined and the abstract operation is italic

#### Scenario: Stereotypes as chips
- **WHEN** a class is an aggregate root and an interface is generic
- **THEN** the class band carries an «aggregate root» chip and the interface band an «interface» chip, both in the stereotype key role, and the interface shows its parameter `T` in the dashed corner box

#### Scenario: Coherent with the ERD
- **WHEN** the reviewer puts a class of a UML page beside a table of an ERD page, both in the same theme and mode
- **THEN** band height, row height, insets, outline, band tint, row text, chips and data face are the same, and only the content differs

### Requirement: UML notation
Connectors SHALL be orthogonal, in the line role, with the UML ends: a hollow triangle at the parent of a generalization, the same on a dashed line for a realization, a filled diamond at the whole of a composition, a hollow diamond at the whole of an aggregation, an open arrowhead at each navigable association end, and a dashed line with an open arrowhead for a dependency.

#### Scenario: Every kind drawn
- **WHEN** a model uses all six relationship kinds
- **THEN** each connector shows its kind's line and end, hollow shapes are filled with the node role, and multiplicities, role names and binding labels sit beside the ends as edge labels

#### Scenario: Self-association
- **WHEN** an association joins a class to itself
- **THEN** it is drawn as a loop on that class with both ends labelled

### Requirement: Detail levels
The page SHALL offer three detail levels: all members, public members only, and class names only. Changing the level SHALL redraw and lay the diagram out again for the new sizes, keeping relationships, packages and stereotypes.

#### Scenario: Public members only
- **WHEN** the viewer chooses public members only
- **THEN** every class shows only its `+` members, classes shrink, and the layout leaves no gap where hidden members were

#### Scenario: Class names only
- **WHEN** the viewer chooses class names only
- **THEN** every classifier shows its band with stereotypes and generic box and no compartment, enumeration literals included

#### Scenario: Level by keyboard
- **WHEN** the viewer presses `1`, `2` or `3` with no text field focused
- **THEN** the page switches to all members, public only or names only

### Requirement: Dependencies switch
The page SHALL offer a switch that shows or hides dependency connectors, on by default. Hiding them SHALL redraw the diagram without them and without the room they took.

#### Scenario: Dependencies hidden
- **WHEN** the viewer turns the dependencies switch off, or presses `D`
- **THEN** no dependency connector is drawn, the legend drops the dependency sample, and the relationships table drops their rows

### Requirement: Automatic layout
The diagram SHALL be laid out automatically, so that classes do not overlap, connectors do not cross classes, each package's classes sit inside its zone, zones do not overlap, and a parent sits above its children where the graph allows. The model SHALL NOT carry positions.

#### Scenario: No overlap
- **WHEN** a model with 26 classifiers, four packages and 45 relationships is drawn
- **THEN** no two classes overlap, no connector passes through a class, and every class lies inside its package's zone

#### Scenario: Layout library unavailable
- **WHEN** the layout library cannot be loaded
- **THEN** classes are arranged by package in a simple grid with orthogonal connectors and a notice says automatic layout was unavailable

### Requirement: Light and dark under any theme
A class diagram page SHALL be complete and legible in light and dark under every complete theme, including a non-default one.

#### Scenario: Alternate theme in dark
- **WHEN** a class diagram page is produced with the alternate theme and viewed in dark mode
- **THEN** every class, chip, generic box, connector end, label and zone is visible with the alternate theme's dark values, and text reaches the contrast ratios set by the visual design

### Requirement: Relationships table
A class diagram page SHALL carry, under the drawing, a relationships table with one row per relationship drawn: the source, the kind, the target, and for associations each end's role and multiplicity in words. Rows SHALL be linked to the drawing by highlighting.

#### Scenario: Row per relationship
- **WHEN** a model has 45 relationships and dependencies are shown
- **THEN** the table has 45 rows, and the composition of `OrderLine` in `Order` reads `Order` composes `OrderLine` as `lines`, zero or more

#### Scenario: Pinned class highlights its rows
- **WHEN** the viewer clicks `Order`
- **THEN** `Order`, its connectors and the classes at their other ends stay highlighted, and the table rows of those connectors are highlighted

### Requirement: Legend of the class diagram
A class diagram page SHALL carry a legend card that explains the relationship kinds used, the member notation (visibility, static, abstract), each stereotype used, the generic box when used, multiplicities, and each package with its zone sample.

#### Scenario: Legend matches the model
- **WHEN** a model uses only generalization and association, no stereotype and two packages
- **THEN** the legend shows those two connector samples, the member notation, multiplicities and the two package samples, and no composition, aggregation, realization, dependency, stereotype chip or generic box

### Requirement: Counts line
The page SHALL show under its title the number of packages, classifiers and relationships drawn, with relationships counted per kind.

#### Scenario: Counts follow the view
- **WHEN** a model with 17 dependencies among 45 relationships is drawn and the viewer hides dependencies
- **THEN** the counts line changes from 45 to 28 relationships and drops the dependency count
