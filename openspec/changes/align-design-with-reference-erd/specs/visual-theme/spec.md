# Spec Delta

## MODIFIED Requirements

### Requirement: Token set
Every theme SHALL define the same token set: the role vocabulary of the visual design, covering surfaces, ink, emphasis, the five status states, five groups, the three key roles, three font roles, geometry and treatment (including the zone, chip and highlight mixes). The default theme is the reference set.

#### Scenario: Theme missing a token fails the tests
- **WHEN** a theme file lacks a token that the default theme defines, or defines one the default does not
- **THEN** the structural tests fail and name the theme and the token

#### Scenario: Vocabulary and default theme agree
- **WHEN** the structural tests compare the default theme with the token vocabulary in the visual design
- **THEN** both name exactly the same tokens

#### Scenario: New roles are in every theme
- **WHEN** the structural tests read a shipped theme
- **THEN** it defines the three key roles, the chip, zone and highlight mixes and the zone radius, with a light and a dark value for each key role

### Requirement: Themes name their fonts
A theme SHALL declare its fonts in its font roles, each with a fallback stack, so changing the theme changes the fonts with no other edit. A theme MAY name system font stacks only, with no external font source; when it loads web fonts, it SHALL load them from Google Fonts only.

#### Scenario: Fonts follow the theme
- **WHEN** a page is produced with a theme whose font roles name different families
- **THEN** the page loads that theme's fonts and no others

#### Scenario: Fonts unavailable
- **WHEN** a theme loads web fonts and Google Fonts cannot be reached
- **THEN** the page renders with the fallback stack and every label stays legible

#### Scenario: System-font theme loads nothing
- **WHEN** a page is produced with a theme that names system font stacks only
- **THEN** the page makes no font request and draws with the system faces at once, with no second layout pass when fonts arrive

#### Scenario: Non-Google font source rejected
- **WHEN** a theme imports fonts from a host other than Google Fonts
- **THEN** the structural tests fail and name the theme and the source

### Requirement: Shipped themes
The plugin SHALL ship two complete themes: `default`, which carries the decided visual design, and `alt`, a second theme that differs from the default in every group of tokens and exists to prove that artifacts are themable. The decided design is the reference-aligned look; `alt` carries the plugin's former default look.

#### Scenario: Default carries the decided design
- **WHEN** the default theme is compared with the visual design's default values
- **THEN** every token value matches

#### Scenario: Alternate differs in every group
- **WHEN** the alternate theme is compared with the default
- **THEN** at least one token differs in each group: surfaces, ink, emphasis, status, groups, keys, fonts, geometry, treatment

#### Scenario: Default renders the reference look
- **WHEN** an ERD with three groups and one ungrouped table is produced with the default theme in light mode
- **THEN** table bodies take the node role with no group tint, header bands are a light tint of the group role with text in the ink role, outlines take the full group role, each group is a zone tinted with its group role and carrying its label, and the ungrouped table takes the neutral role with a dashed outline
