# skill-derivation Specification

## Purpose
Lets a new artifact skill that only extends an adopted one be delivered on a short path: no exploration and no performance evaluation, with the person's validation of a sample page as its gate.

## Requirements

### Requirement: A derived skill names an adopted anchor
A new artifact skill SHALL be derived only when its proposal names an anchor: an artifact skill already adopted, whose renderer, model conventions, layout engine and visual vocabulary the new skill reuses, adding notation shapes only. The person SHALL decide by approving the proposal. Any other new artifact skill SHALL take the full path.

#### Scenario: Object diagram derived from the class diagram
- **WHEN** a proposal adds an object diagram skill that reuses the class diagram's renderer, layout engine and roles and adds instance boxes and links
- **THEN** it may declare the class diagram as its anchor and, once the person approves it, is delivered as a derived skill

#### Scenario: Anchor not adopted
- **WHEN** a proposal names as its anchor a skill whose `RESULTS.md` has no `adopt` decision
- **THEN** the skill cannot be derived from it and is not approved as derived

#### Scenario: New layout engine
- **WHEN** a proposed skill needs a layout engine its anchor does not have, such as lifelines laid out on a time axis
- **THEN** it is not derived and takes the full path as an anchor

### Requirement: Derivation section of the proposal
The proposal of a derived skill SHALL carry a Derivation section that cites the skill's issue and states the anchor, what is reused, what is added (each notation shape mapped to a role of the visual contract's vocabulary, or named as a missing role for the person to decide), the sample case and what is left out.

#### Scenario: Missing role named
- **WHEN** a derived skill adds a shape no role of the vocabulary covers, such as a three-dimensional node
- **THEN** the Derivation section names it as a missing role for the person to decide and the visual contract is extended only with that approval

#### Scenario: Section missing
- **WHEN** a proposal declares a derived skill and has no Derivation section
- **THEN** it is not approved until the section is added

### Requirement: Sample page validated by the person
A derived skill SHALL be gated by the person's validation of a sample page: one sample model covering every notation feature of the skill from a complex source, rendered with the default and the alternate theme. The person SHALL record `Decision: adopt (validated, not measured; derived from <anchor>)` in `evals/<skill>/RESULTS.md`, or ask for a fix.

#### Scenario: Validated
- **WHEN** the visual review and the skill review of a derived skill pass and the person opens the sample page and accepts it
- **THEN** a validation entry with the date, the plugin version, the anchor, the sample model's path and the adopt decision is appended to the skill's `RESULTS.md`, and the change can be archived

#### Scenario: Fix asked
- **WHEN** the person asks for changes on the sample page
- **THEN** the builder gets a fix round with the person's notes, at most two fix rounds for the validation, counted apart from the visual review's two, and the sample is validated again

#### Scenario: No measurement
- **WHEN** a derived skill is validated
- **THEN** no evaluation and no baseline run, unless the person asks for one

### Requirement: Sample model kept with the skill
The sample model of a derived skill SHALL be committed under `evals/<skill>/sample/`, SHALL validate with the skill's validator and SHALL hold only neutral names. The sample pages SHALL NOT be committed; they are produced again from the model.

#### Scenario: Sample model invalid
- **WHEN** the structural tests find a derived skill's sample model that the skill's validator rejects, or a validation entry naming a sample that does not exist
- **THEN** the tests fail and name the skill

### Requirement: Back to the full path
A derived skill whose build shows that it needs a new layout engine or a new notation vocabulary, or whose visual review or validation still fails after its two fix rounds, SHALL go back to the spec process and take the full path as an anchor.

#### Scenario: Swimlanes need their own engine
- **WHEN** the build of a derived activity diagram finds that partitions cannot be laid out with its anchor's engine
- **THEN** the change goes back to the spec process, and the skill is explored and evaluated as an anchor
