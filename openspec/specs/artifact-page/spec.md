# artifact-page Specification

## Purpose
The self-contained HTML page every artifact type is delivered in, built for Artifact pages: produced from a data model and a theme, with a light/dark switch, readable at phone width, and honest when something cannot be drawn.

## Requirements

### Requirement: Page produced from a data model
The plugin SHALL produce an artifact page from a data model file, an artifact type, a theme and an output path, without the caller writing any markup, style or script.

#### Scenario: Page from a valid model
- **WHEN** a page is requested for a valid ERD model with the default theme
- **THEN** one HTML file is written at the output path and the command reports its path

#### Scenario: Invalid model writes nothing
- **WHEN** a page is requested for a model that fails validation
- **THEN** no file is written, the command exits non-zero, and every error names the field and the problem

### Requirement: Self-contained page
The page SHALL be one HTML file with its theme, page styles, scripts and data inlined. The only external resources SHALL be fonts from Google Fonts and scripts from an allowed CDN pinned to an exact version.

#### Scenario: No local dependencies
- **WHEN** the page file is copied alone to another folder or published as an artifact
- **THEN** it renders the same artifact

#### Scenario: External scripts are pinned
- **WHEN** the structural tests read a produced page
- **THEN** every external script URL is on `cdn.jsdelivr.net`, `cdnjs.cloudflare.com` or `unpkg.com` and names an exact version

### Requirement: Page ground from the theme
The page body SHALL take its background and text color from theme tokens, so the page never shows the host's background through it.

#### Scenario: Host with the opposite theme
- **WHEN** the page is shown in a host whose own background is dark while the page is in light mode
- **THEN** the page ground is the theme's light canvas, not the host's background

### Requirement: Readable at phone width
The page body SHALL never scroll sideways at any width down to 360px. A drawing wider than the screen SHALL scroll inside its own frame and SHALL start at its drawn size; only an explicit zoom by the viewer MAY scale it below that size.

#### Scenario: Wide diagram on a phone
- **WHEN** a diagram wider than the screen is viewed at 400px
- **THEN** the page body does not scroll sideways, the drawing frame scrolls horizontally, and labels keep their drawn size

#### Scenario: Viewer zooms out
- **WHEN** the viewer chooses Fit on a diagram wider than the frame
- **THEN** the drawing scales to the frame width, the zoom level shows the scale, and choosing 1:1 restores the drawn size

### Requirement: Page identity
The page SHALL carry the model's title as its document title and heading, and the model's description, when present, under the heading.

#### Scenario: Title and description shown
- **WHEN** a model has the title "Order schema" and a description
- **THEN** the browser tab and the heading read "Order schema" and the description appears under the heading

### Requirement: Drawing failure is visible
When the page cannot lay out or draw the artifact, it SHALL say so in the page instead of showing an empty or partial drawing without explanation.

#### Scenario: Layout library unavailable
- **WHEN** the automatic layout library cannot be loaded
- **THEN** the page still draws every element with a simple fallback arrangement and shows a notice that automatic layout was unavailable

#### Scenario: Unexpected rendering error
- **WHEN** drawing fails for any other reason
- **THEN** the page shows a message naming the problem in place of the drawing

### Requirement: Dark mode toggle
Every page SHALL show a visible light/dark toggle labelled "Dark mode". With no stored choice it SHALL start in the mode the viewer's system prefers, and toggling SHALL apply the other mode to the whole page at once.

#### Scenario: Viewer switches to dark
- **WHEN** the viewer turns the toggle on
- **THEN** the page ground, the drawing and every label take the theme's dark values, and nothing keeps a light value

#### Scenario: Starts from the system preference
- **WHEN** a viewer whose system prefers dark opens the page for the first time
- **THEN** the page is in dark mode and the toggle shows on

#### Scenario: Choice is remembered when possible
- **WHEN** the viewer reopens the page in a browser that allows local storage
- **THEN** the last choice is restored, and when storage is unavailable the page starts from the system preference without error

#### Scenario: Toggle states are distinguishable
- **WHEN** the toggle is shown on and off, each with and without keyboard focus, in every shipped theme and in both modes
- **THEN** on and off differ by position and by a meaningful color reaching 3:1 against the surface, and focus shows a visible ring in the mark role that is not confused with the on state

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

### Requirement: Details table
A page MAY carry a details table under the drawing that lists the drawing's connections, one row per connector. When present, its text SHALL take the theme's type and ink roles, and its rows SHALL be linked to the drawing by highlighting.

#### Scenario: Row linked to the drawing
- **WHEN** the pointer rests on a row of the details table
- **THEN** the connector the row describes is highlighted in the drawing

#### Scenario: Narrow screen
- **WHEN** the page is viewed at 400px
- **THEN** the details table scrolls inside its own card and the page body does not scroll sideways

### Requirement: Legend card
A page SHALL explain every notation, line kind, chip and group it draws in a legend card drawn with the same roles as the drawing, so every sample in the legend looks exactly like its use in the drawing.

#### Scenario: Legend follows the drawing
- **WHEN** a drawing uses dashed connectors, key chips and two groups
- **THEN** the legend card shows a dashed sample, each chip used and each group's zone sample with its label, and nothing the drawing does not use

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
