# Spec Delta

## MODIFIED Requirements

### Requirement: Exploration precedes a new artifact skill
The proposal of a change that adds a new artifact skill SHALL be preceded by an exploration of that skill, made of a brief, three sketches and the person's choice. A change to an existing artifact skill SHALL NOT require one, and neither SHALL a new artifact skill derived from an adopted anchor (capability `skill-derivation`).

#### Scenario: New skill requested
- **WHEN** a person asks for a new artifact skill
- **THEN** the brief is asked for and the three sketches are produced before any proposal for that skill is written

#### Scenario: Existing skill changed
- **WHEN** a person asks to change an artifact skill that already exists
- **THEN** the work goes to the proposal with no exploration

#### Scenario: Derived skill requested
- **WHEN** a person asks for a new artifact skill and names an adopted skill as its anchor, such as an object diagram derived from the class diagram
- **THEN** the work goes to the proposal with no exploration, and the proposal carries a Derivation section

### Requirement: The proposal adapts the chosen sketch to the design
The proposal of the new skill SHALL carry an Exploration section that cites the issue and states the chosen sketch, the hints, the features kept, how each feature maps to a role of the visual contract's vocabulary (reused or missing), and what is deliberately left out. A sketch's own colors, fonts and sizes SHALL NOT carry into the proposal. A derived skill's proposal SHALL carry a Derivation section in its place.

#### Scenario: Missing role named
- **WHEN** the chosen sketch shows a feature no role of the vocabulary covers
- **THEN** the Exploration section names it as a missing role, to be decided by the person, and does not copy the sketch's styling

#### Scenario: Proposal without exploration
- **WHEN** a proposal adds a new artifact skill that is not derived and has no Exploration section
- **THEN** it is not approved until the section is added

#### Scenario: Derived proposal
- **WHEN** a proposal adds a derived artifact skill
- **THEN** it has a Derivation section and no Exploration section
