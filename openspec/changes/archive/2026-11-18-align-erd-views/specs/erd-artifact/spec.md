# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
