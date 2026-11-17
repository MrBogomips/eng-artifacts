# Spec Delta

## Purpose

The self-contained HTML page every artifact type is delivered in, built for Artifact pages: produced from a data model and a theme, with a light/dark switch, readable at phone width, and honest when something cannot be drawn.

## ADDED Requirements

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

### Requirement: Light and dark switch
Every page SHALL show a System / Light / Dark switch. It SHALL start on System, which follows the viewer's preference, and a choice SHALL apply to the whole page at once.

#### Scenario: Viewer switches to dark
- **WHEN** the viewer chooses Dark
- **THEN** the page ground, the drawing and every label take the theme's dark values, and nothing keeps a light value

#### Scenario: Viewer returns to System
- **WHEN** the viewer chooses System after an explicit choice
- **THEN** the page follows the viewer's system preference again

#### Scenario: Choice is remembered when possible
- **WHEN** the viewer reopens the page in a browser that allows local storage
- **THEN** the last choice is restored, and when storage is unavailable the page starts on System without error

### Requirement: Page ground from the theme
The page body SHALL take its background and text color from theme tokens, so the page never shows the host's background through it.

#### Scenario: Host with the opposite theme
- **WHEN** the page is shown in a host whose own background is dark while the page is in light mode
- **THEN** the page ground is the theme's light canvas, not the host's background

### Requirement: Readable at phone width
The page body SHALL never scroll sideways at any width down to 360px. A drawing wider than the screen SHALL scroll inside its own frame and SHALL NOT be scaled below its drawn size.

#### Scenario: Wide diagram on a phone
- **WHEN** a diagram wider than the screen is viewed at 400px
- **THEN** the page body does not scroll sideways, the drawing frame scrolls horizontally, and labels keep their drawn size

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
