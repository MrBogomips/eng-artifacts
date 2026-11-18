# Spec Delta

## MODIFIED Requirements

### Requirement: Testbed per artifact skill
Every evaluated artifact skill SHALL have a testbed of at least three eval cases of increasing difficulty: easy, medium and complex. Each case SHALL ask for a concrete deliverable that both arms can produce, and SHALL carry mechanical checks on it. A derived skill that is not evaluated SHALL have its sample model in place of a testbed.

#### Scenario: ERD testbed coverage
- **WHEN** the ERD testbed is listed
- **THEN** it holds an easy case (a few entities from a short description), a medium case (a larger model from prose, with groups and optional relationships) and a complex case (from SQL DDL, with composite keys, the cardinalities a script can express, a self-relationship, groups, and both owned and referenced relationships)

#### Scenario: Deliverable both arms can produce
- **WHEN** a case prompt is read
- **THEN** it names the deliverable and where to write it, such as a self-contained HTML page at a given file name, and does not mention the plugin or its skills

#### Scenario: Derived skill evaluated on request
- **WHEN** the person asks for an evaluation of a derived skill
- **THEN** its testbed is written first, its complex case starting from the source of the sample model, and the evaluation then runs as for any evaluated skill

### Requirement: Performance in the skill's documentation
Every adopted artifact skill SHALL have its own documentation page, `skills/<skill>/README.md`, describing its capabilities and carrying a Performance section. The Performance section SHALL have the same structure for every measured skill and SHALL be generated, never written by hand: from the adopted evaluation (date, plugin version, model and effort, runs per arm, the per-case and total table of tokens, time and cost for both arms with the change, the classification and the decision), or, for a derived skill validated without evaluation, from its validation entry, stating that it is not measured and naming its anchor.

#### Scenario: Same format for every skill
- **WHEN** the Performance sections of two measured skills are compared
- **THEN** they have the same headings, columns, order and number formats, and differ only in their values and cases

#### Scenario: Section matches the evaluation
- **WHEN** the structural tests regenerate a skill's Performance section from its adopted evaluation
- **THEN** the result is identical to the section in the skill's README

#### Scenario: Derived skill not measured
- **WHEN** the structural tests regenerate the Performance section of a derived skill validated without evaluation
- **THEN** the section says the skill is not measured, names its anchor with a link to the anchor's documentation page, gives the validation date and plugin version, and is identical to the section in the skill's README

### Requirement: Skills summary in the repository README
The repository README SHALL carry a skills table with one row per adopted skill: its name linked to its documentation page, a one-line capability summary, the total token and time reductions and the date of the adopted evaluation. The rows SHALL be generated from the same data as the Performance sections. A derived skill validated without evaluation SHALL show "not measured" in place of the reductions and its validation date with its anchor.

#### Scenario: New skill appears in the summary
- **WHEN** a skill's evaluation is adopted and the documentation step runs
- **THEN** the README skills table has a row for that skill with the reductions of that evaluation

#### Scenario: Derived skill appears in the summary
- **WHEN** a derived skill is validated and the documentation step runs
- **THEN** the README skills table has a row for that skill reading "not measured" for tokens and time, with the validation date and "derived from" its anchor

### Requirement: When an evaluation runs
A change SHALL run the performance evaluation only when it adds a new artifact skill that is not derived, when its approved proposal declares it a major refactoring of an existing artifact skill, or when the person explicitly asks for one. Any other change, a new derived skill included, SHALL NOT run it; a change to an existing skill SHALL keep the skill's last adopted evaluation in its documentation page and the README skills table.

#### Scenario: Existing skill changed
- **WHEN** a change adds view options to the ERD skill and passes its visual review and its skill review
- **THEN** no evaluation runs, the change can be archived, and the ERD skill's Performance section and README row still show its last adopted evaluation

#### Scenario: Major refactoring
- **WHEN** an approved proposal declares a major refactoring of the ERD skill (for instance, a new model format or a rewritten renderer)
- **THEN** the change states its testbed and targets and is evaluated before it is archived

#### Scenario: Evaluation asked for
- **WHEN** the person asks for an evaluation of a change to an existing skill
- **THEN** the change is evaluated and gated as a new skill would be

#### Scenario: New derived skill
- **WHEN** a change adds a derived skill and the person does not ask for an evaluation
- **THEN** no evaluation and no baseline run, and the skill is gated by its validated sample page

### Requirement: Evaluation gates a skill change
A change that needs an evaluation SHALL state its testbed and targets in its proposal, SHALL measure the baseline before the skill is built, and SHALL NOT be archived until an evaluation of its final version is recorded with the person's decision `adopt` and the skill's documentation page and the README skills table show that evaluation. A new derived skill that is not evaluated SHALL NOT be archived until its validation is recorded with the decision `adopt` and its documentation shows it. Any other change is archived once its visual review and its skill review are done.

#### Scenario: Archive blocked
- **WHEN** a change that needs an evaluation has passed the visual review but its final evaluation has no recorded decision, or the decision is `rework` or `reject`
- **THEN** the change is not archived

#### Scenario: Documentation missing
- **WHEN** a skill's evaluation is adopted but its Performance section or README row is missing or out of date
- **THEN** the structural tests fail and the change is not archived

#### Scenario: Derived skill not validated
- **WHEN** a change adds a derived skill whose visual review passed but whose `RESULTS.md` has no validation entry with the decision `adopt`
- **THEN** the change is not archived
