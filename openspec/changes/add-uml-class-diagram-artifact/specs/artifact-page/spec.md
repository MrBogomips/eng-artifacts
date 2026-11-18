# Spec Delta

## MODIFIED Requirements

### Requirement: Linked highlighting
A page SHALL highlight, while the pointer rests on a node, a connector or a row of the details table, that element and the elements it connects, in the mark role, and dim the rest of the drawing. Moving away SHALL restore the drawing. A click or a tap on such an element SHALL pin its highlight until Esc, a second click on it, or a click on the drawing's empty part; while one is pinned, hovering SHALL NOT change the highlight.

#### Scenario: Hover on a connector
- **WHEN** the pointer rests on a connector between two nodes
- **THEN** the connector and both nodes are highlighted in the mark role, the matching details-table row is highlighted, and every other node and connector is dimmed

#### Scenario: Hover on a node
- **WHEN** the pointer rests on a node
- **THEN** the node, every connector touching it and the nodes at their other ends are highlighted

#### Scenario: Pointer leaves
- **WHEN** the pointer leaves the highlighted element and nothing is pinned
- **THEN** no element stays highlighted or dimmed

#### Scenario: Click pins a node
- **WHEN** the viewer clicks a node, then moves the pointer over another node
- **THEN** the clicked node, its connectors, the nodes at their other ends and their details-table rows stay highlighted, and the hovered node does not change the highlight

#### Scenario: Pinned highlight cleared
- **WHEN** a node is pinned and the viewer presses Esc, clicks the same node again, or clicks the empty part of the drawing
- **THEN** no element stays highlighted or dimmed

#### Scenario: Click pins another element
- **WHEN** a node is pinned and the viewer clicks a connector
- **THEN** the pin moves to the connector and its two nodes

#### Scenario: Keyboard reach
- **WHEN** the viewer moves the keyboard focus onto a node with Tab and presses Enter or Space
- **THEN** the node is pinned as by a click, and the focused node shows the focus ring in the mark role

### Requirement: Zoom
A page SHALL offer zoom controls for its drawing (zoom out, zoom in, Fit, 1:1) with the current scale shown. Zoom SHALL change only the drawing's scale, never the page body's width. Ctrl or Cmd with the wheel, and a pinch, SHALL zoom around the pointer; a plain wheel SHALL keep scrolling the page. Dragging the drawing's empty part SHALL pan it.

#### Scenario: Zoom in and back
- **WHEN** the viewer zooms in twice and then chooses 1:1
- **THEN** the drawing grows inside its frame, the frame scrolls, and 1:1 returns it to its drawn size at 100%

#### Scenario: Ctrl and wheel
- **WHEN** the viewer holds Ctrl (Cmd on a Mac) and turns the wheel over a point of the drawing
- **THEN** the drawing zooms with that point staying under the pointer, the scale shown changes, and the page does not scroll

#### Scenario: Plain wheel
- **WHEN** the viewer turns the wheel over the drawing without a modifier
- **THEN** the page or the frame scrolls as usual and the scale does not change

#### Scenario: Drag to pan
- **WHEN** the viewer drags the empty part of a drawing larger than its frame
- **THEN** the drawing moves with the pointer inside its frame, and the release does not pin or clear any highlight

## ADDED Requirements

### Requirement: Keyboard shortcuts
A page SHALL accept, when no text field has the focus, `+` and `-` to zoom, `F` for Fit, `0` for 1:1, `T` to operate the Dark mode toggle and Esc to clear a pinned highlight. An artifact type MAY add shortcuts of its own, which the page lists with the shared ones in the drawing's hint line.

#### Scenario: Toggle by keyboard
- **WHEN** the viewer presses `T`
- **THEN** the page switches mode exactly as when the toggle is clicked, and the toggle shows the new state

#### Scenario: Typing is not a shortcut
- **WHEN** the focus is in a text field and the viewer types `f`
- **THEN** the zoom does not change

### Requirement: Connectors hop at crossings
Where a horizontal run of one connector crosses a vertical run of another, the horizontal run SHALL jump the vertical one with a small arc in the line role, whichever connector is drawn first, so the reader can tell a crossing from a junction and two connectors never both hop at one point. Connectors that only meet at a shared node end SHALL NOT hop.

#### Scenario: Crossing connectors
- **WHEN** a horizontal connector run crosses a vertical run of another connector
- **THEN** the horizontal run draws an arc over the vertical one at the crossing point, and the arc follows its connector's dash, color and highlight

#### Scenario: Same in every artifact type
- **WHEN** an ERD page and a class diagram page each have crossing connectors, in the same theme and mode
- **THEN** the hops have the same size and shape in both

### Requirement: View options
A page MAY carry view options for its artifact type: a choice of one among several values and on/off switches, shown in the page head beside the zoom controls. Changing an option SHALL draw the artifact again with the new options, keeping the zoom scale and clearing any pinned highlight.

#### Scenario: Option redraws
- **WHEN** the viewer changes a view option
- **THEN** the drawing, its legend, its details table and its counts line are produced again for the new option, and the zoom scale is kept

#### Scenario: Options follow the theme
- **WHEN** the view options are shown in every shipped theme and in both modes, each with and without keyboard focus
- **THEN** the selected value and an on switch are told apart from the others by a meaningful color reaching 3:1 against the surface, and focus shows the ring in the mark role
