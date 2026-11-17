# Spec Delta

## Purpose

The plugin's single style source: the set of semantic tokens every artifact draws with, the themes that give them values in light and dark, and how a project supplies a theme of its own.

## ADDED Requirements

### Requirement: Themes are the only style source
Color values and font families used by any artifact SHALL be defined only in the plugin's theme files. Renderers, page templates and skills SHALL reference tokens by name and hold no color literal or font family of their own.

#### Scenario: Literal outside the themes fails the tests
- **WHEN** a renderer, template or skill under `skills/` or `shared/` outside the theme files contains a hex, `rgb()`, `hsl()` or named color, or a font family name
- **THEN** the structural tests fail and report the file and line

#### Scenario: Example data is not a style value
- **WHEN** a color literal appears inside a sample data model as content, such as a column default value
- **THEN** the static check does not report it

### Requirement: Token set
Every theme SHALL define the same token set: the role vocabulary of the visual design, covering surfaces, ink, emphasis, the five status states, five groups, three font roles, geometry and treatment. The default theme is the reference set.

#### Scenario: Theme missing a token fails the tests
- **WHEN** a theme file lacks a token that the default theme defines, or defines one the default does not
- **THEN** the structural tests fail and name the theme and the token

#### Scenario: Vocabulary and default theme agree
- **WHEN** the structural tests compare the default theme with the token vocabulary in the visual design
- **THEN** both name exactly the same tokens

### Requirement: Light and dark in every theme
Every theme SHALL give every color token a light value and a dark value. Dark values SHALL apply both when the viewer's system prefers dark with no explicit choice, and when dark is chosen explicitly; an explicit light choice SHALL override a dark system preference.

#### Scenario: Both dark entries are complete and equal
- **WHEN** the structural tests read a theme
- **THEN** the system-preference dark entry and the explicit dark entry define the same color tokens with the same values, and each color token of the light entry appears in both

#### Scenario: Explicit light wins over a dark system
- **WHEN** a page is viewed on a system that prefers dark and the viewer chooses Light
- **THEN** every token takes its light value

### Requirement: Themes name their fonts
A theme SHALL declare where its fonts come from, using Google Fonts only, and every font role SHALL have a fallback stack, so changing the theme changes the fonts with no other edit.

#### Scenario: Fonts follow the theme
- **WHEN** a page is produced with a theme whose font roles name different families
- **THEN** the page loads that theme's fonts and no others

#### Scenario: Fonts unavailable
- **WHEN** Google Fonts cannot be reached
- **THEN** the page renders with the fallback stack and every label stays legible

### Requirement: Shipped themes
The plugin SHALL ship two complete themes: `default`, which carries the decided visual design, and `alt`, a second theme that differs from the default in every group of tokens and exists to prove that artifacts are themable.

#### Scenario: Default carries the decided design
- **WHEN** the default theme is compared with the visual design's default values
- **THEN** every token value matches

#### Scenario: Alternate differs in every group
- **WHEN** the alternate theme is compared with the default
- **THEN** at least one token differs in each group: surfaces, ink, emphasis, status, groups, fonts, geometry, treatment

### Requirement: Project theme
A user SHALL be able to supply a theme of their own as a file with the same token set, and use it in place of a shipped theme without editing the plugin.

#### Scenario: Valid project theme is used
- **WHEN** a page is produced with the path of a complete theme file
- **THEN** the page uses that theme's values

#### Scenario: Incomplete project theme is rejected
- **WHEN** a page is produced with a theme file that lacks tokens
- **THEN** no page is produced and the error lists every missing token
