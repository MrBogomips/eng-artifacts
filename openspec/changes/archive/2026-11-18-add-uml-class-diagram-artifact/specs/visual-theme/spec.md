# Spec Delta

## MODIFIED Requirements

### Requirement: Token set
Every theme SHALL define the same token set: the role vocabulary of the visual design, covering surfaces, ink, emphasis, the five status states, five groups, the four key roles (primary, foreign, unique, stereotype), three font roles, geometry and treatment (including the zone, chip and highlight mixes). The default theme is the reference set.

#### Scenario: Theme missing a token fails the tests
- **WHEN** a theme file lacks a token that the default theme defines, or defines one the default does not
- **THEN** the structural tests fail and name the theme and the token

#### Scenario: Vocabulary and default theme agree
- **WHEN** the structural tests compare the default theme with the token vocabulary in the visual design
- **THEN** both name exactly the same tokens

#### Scenario: New roles are in every theme
- **WHEN** the structural tests read a shipped theme
- **THEN** it defines the four key roles, the chip, zone and highlight mixes and the zone radius, with a light and a dark value for each key role

#### Scenario: Project theme without the stereotype role
- **WHEN** a page is produced with a project theme written before the stereotype role existed
- **THEN** no page is produced and the error names `--key-stereotype` as missing

#### Scenario: Stereotype chip legible
- **WHEN** the stereotype role is checked on its chip ground in every shipped theme, in light and in dark
- **THEN** it reaches 4.5:1, as every other key role does
