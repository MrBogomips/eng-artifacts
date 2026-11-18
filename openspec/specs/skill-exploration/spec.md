# skill-exploration Specification

## Purpose
Settles what a new artifact skill must produce before it is specified: from a person's brief, three sessions with no skill produce the artifact at three levels of difficulty, and the person picks the one closest to the functionality and richness wanted.

## Requirements

### Requirement: Exploration precedes a new artifact skill
The proposal of a change that adds a new artifact skill SHALL be preceded by an exploration of that skill, made of a brief, three sketches and the person's choice. A change to an existing artifact skill SHALL NOT require one.

#### Scenario: New skill requested
- **WHEN** a person asks for a new artifact skill
- **THEN** the brief is asked for and the three sketches are produced before any proposal for that skill is written

#### Scenario: Existing skill changed
- **WHEN** a person asks to change an artifact skill that already exists
- **THEN** the work goes to the proposal with no exploration

### Requirement: Brief of the skill
The exploration SHALL start from a brief given by the person: the artifact type, who the artifact is for, the sources it starts from, and optionally a concrete use case. Nothing SHALL be sketched before the brief names at least the artifact type and its sources.

#### Scenario: Brief with a use case
- **WHEN** the person describes a WBS skill for project leads, starting from a list of deliverables, with the use case of a product launch
- **THEN** the three sketch prompts are written from that brief and the medium or complex prompt uses the product launch

#### Scenario: Incomplete brief
- **WHEN** the person names the artifact type but not what it starts from
- **THEN** the sources are asked for before any sketch runs

### Requirement: Three sketch prompts of rising difficulty
The exploration SHALL derive three prompts from the brief, named easy, medium and complex, of rising difficulty. Each SHALL follow the fair-case rules of the evaluation method: it names one self-contained HTML deliverable and its file name, asks for features as a user would, and never mentions the plugin, a skill or the plugin's design.

#### Scenario: Prompt names its deliverable
- **WHEN** a sketch prompt is read
- **THEN** it names one self-contained HTML page and the file name to write it to, and holds no reference to the plugin, its skills or its design

### Requirement: Sketches produced without any skill
Each sketch SHALL be produced in an isolated session that loads no plugin skill, no project or user instructions, no memory and no user settings, and in which the Skill tool is not available. A run that invoked a skill anyway SHALL be flagged in the sketch report.

#### Scenario: Skill tool unavailable
- **WHEN** a sketch session runs
- **THEN** it has no skill to invoke and no project instructions in its context

#### Scenario: Skill invoked
- **WHEN** a sketch's recorded session shows a Skill tool call
- **THEN** the sketch report flags that case as not skill-free

### Requirement: One command runs the sketches
The repository SHALL provide one command that takes a folder of the three sketch cases, runs each once in the isolated environment, keeps a copy of each deliverable under the ignored results folder, and prints a sketch report. It SHALL NOT publish anything and SHALL NOT be stopped by a cost ceiling.

#### Scenario: Running the sketches
- **WHEN** a developer runs the sketch command on a folder holding the easy, medium and complex cases
- **THEN** three sessions run, the three deliverables are kept under the ignored results folder, and the report is printed

#### Scenario: Missing case
- **WHEN** the folder lacks one of the easy, medium or complex cases
- **THEN** the command runs nothing, names the missing case, and exits non-zero

### Requirement: Sketch report
The sketch report SHALL list, per case, the path of the kept deliverable, whether the deliverable exists, whether the session was skill-free, the tokens, the time and the cost, and the total cost. It SHALL be computed only from the recorded sessions, so the same records give the same report, and SHALL hold no classification and no decision.

#### Scenario: Report from recorded sessions
- **WHEN** the report is computed twice from the same recorded sessions
- **THEN** the two reports are identical

#### Scenario: Deliverable missing
- **WHEN** a sketch session ends without writing its deliverable
- **THEN** the report shows that case's deliverable as missing and the command exits non-zero

### Requirement: The person chooses
The person SHALL open the three sketches and choose the one closest to the functionality and richness wanted, and MAY add hints. The choice SHALL NOT be inferred from the sketches, their size or their cost.

#### Scenario: Choice with hints
- **WHEN** the person picks the medium sketch and adds "keep the critical path, drop the cost column"
- **THEN** the medium sketch is the reference and both hints carry into the proposal

### Requirement: Exploration recorded on the work item
The brief SHALL be recorded as the body of the skill's issue, and the choice and the hints as a comment on it. The record SHALL describe the chosen sketch's features in words, since the sketches stay in an ignored folder, and SHALL hold no absolute path, user name or transcript.

#### Scenario: Record survives the sketches
- **WHEN** the ignored results folder is removed
- **THEN** the issue still states the brief, which sketch was chosen, its features and the hints

### Requirement: The proposal adapts the chosen sketch to the design
The proposal of the new skill SHALL carry an Exploration section that cites the issue and states the chosen sketch, the hints, the features kept, how each feature maps to a role of the visual contract's vocabulary (reused or missing), and what is deliberately left out. A sketch's own colors, fonts and sizes SHALL NOT carry into the proposal.

#### Scenario: Missing role named
- **WHEN** the chosen sketch shows a feature no role of the vocabulary covers
- **THEN** the Exploration section names it as a missing role, to be decided by the person, and does not copy the sketch's styling

#### Scenario: Proposal without exploration
- **WHEN** a proposal adds a new artifact skill and has no Exploration section
- **THEN** it is not approved until the section is added

### Requirement: Sketch prompts seed the testbed
The three sketch prompts SHALL be the first draft of the new skill's testbed cases easy, medium and complex. They SHALL be revised with the person's hints before the baseline is measured, and the sketch runs SHALL NOT count as the skill's baseline.

#### Scenario: Baseline after the revision
- **WHEN** the testbed of the new skill is written
- **THEN** it starts from the three sketch prompts revised with the hints, and its baseline is measured by the evaluation command, not taken from the sketches
