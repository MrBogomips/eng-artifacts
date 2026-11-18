# Spec Delta

## MODIFIED Requirements

### Requirement: Evaluation gates a skill change
A change that needs an evaluation SHALL state its testbed and targets in its proposal, SHALL measure the baseline before the skill is built, and SHALL NOT be archived until an evaluation of its final version is recorded with the person's decision `adopt` and the skill's documentation page and the README skills table show that evaluation. A change needs an evaluation when it adds a new artifact skill, when its approved proposal declares it a major refactoring of an existing artifact skill, or when the person explicitly asks for one. Any other change or update to an existing artifact skill SHALL NOT run the performance evaluation: it is archived once its visual review and its skill review are done, and the skill keeps its last adopted evaluation in its documentation page and the README skills table.

#### Scenario: Archive blocked
- **WHEN** a change that needs an evaluation has passed the visual review but its final evaluation has no recorded decision, or the decision is `rework` or `reject`
- **THEN** the change is not archived

#### Scenario: Existing skill changed
- **WHEN** a change adds view options to the ERD skill and passes its visual review and its skill review
- **THEN** no evaluation runs, the change can be archived, and the ERD skill's Performance section and README row still show its last adopted evaluation

#### Scenario: Major refactoring
- **WHEN** an approved proposal declares a major refactoring of the ERD skill (for instance, a new model format or a rewritten renderer)
- **THEN** the change states its testbed and targets and is evaluated before it is archived

#### Scenario: Evaluation asked for
- **WHEN** the person asks for an evaluation of a change to an existing skill
- **THEN** the change is evaluated and gated as a new skill would be

#### Scenario: Documentation missing
- **WHEN** a skill's evaluation is adopted but its Performance section or README row is missing or out of date
- **THEN** the structural tests fail and the change is not archived
