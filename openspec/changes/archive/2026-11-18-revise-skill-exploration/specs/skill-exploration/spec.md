## ADDED Requirements

### Requirement: One complex sketch prompt
The exploration SHALL derive one prompt from the brief, named complex, that covers the advanced and complex cases typical of the artifact type: every feature the brief implies, from a structured source where the brief names one. It SHALL follow the fair-case rules: it names one self-contained HTML deliverable and its file name, asks for features as a user would, and never mentions the plugin, a skill or the plugin's design.

#### Scenario: Prompt names its deliverable
- **WHEN** the sketch prompt is read
- **THEN** it names one self-contained HTML page and the file name to write it to, and holds no reference to the plugin, its skills or its design

#### Scenario: Prompt covers the advanced cases
- **WHEN** the brief of a class diagram skill names source code as a source and generics, interfaces and packages among its features
- **THEN** the prompt starts from a source code excerpt and asks for generics, interfaces and packages, not only for a few classes

### Requirement: Three isolated runs of the same prompt
The exploration SHALL run the complex prompt three times, each in its own session, with the identical prompt text. No run SHALL see the output, the files or the session of another run.

#### Scenario: Same prompt three times
- **WHEN** the sketches of an exploration run
- **THEN** three sessions run the same prompt text, and each writes its deliverable in its own working folder

#### Scenario: No shared state
- **WHEN** the second run starts
- **THEN** it holds neither the deliverable nor any file nor any record of the first run

### Requirement: Model and effort of the sketches
The sketch runs SHALL use model `claude-opus-5-5` at effort `xhigh` unless the person running the command asks for another model or effort. The sketch report SHALL state the model and the effort used.

#### Scenario: Defaults
- **WHEN** the sketch command runs with no model and no effort option
- **THEN** the three runs use `claude-opus-5-5` at effort `xhigh`, and the report says so

#### Scenario: Override
- **WHEN** the sketch command runs with another model or effort
- **THEN** the three runs use it, and the report states it

## MODIFIED Requirements

### Requirement: Brief of the skill
The exploration SHALL start from a brief given by the person: the artifact type, who the artifact is for, the sources it starts from, and optionally a concrete use case. Nothing SHALL be sketched before the brief names at least the artifact type and its sources.

#### Scenario: Brief with a use case
- **WHEN** the person describes a WBS skill for project leads, starting from a list of deliverables, with the use case of a product launch
- **THEN** the complex sketch prompt is written from that brief and uses the product launch

#### Scenario: Incomplete brief
- **WHEN** the person names the artifact type but not what it starts from
- **THEN** the sources are asked for before any sketch runs

### Requirement: Sketches produced without any skill
Each sketch run SHALL be produced in an isolated session that loads no plugin skill, no project or user instructions, no memory and no user settings, and in which the Skill and Agent tools are not available. A run that invoked a skill anyway SHALL be flagged in the sketch report.

#### Scenario: Skill tool unavailable
- **WHEN** a sketch run's session starts
- **THEN** it has no skill to invoke, cannot start a subagent, and has no project instructions in its context

#### Scenario: Skill invoked
- **WHEN** a sketch run's recorded session shows a Skill tool call
- **THEN** the sketch report flags that run as not skill-free

### Requirement: One command runs the sketches
The repository SHALL provide one command that takes a folder holding the complex case, runs it three times in the isolated environment, keeps a copy of each run's deliverable under the ignored results folder, and prints a sketch report. It SHALL NOT publish anything and SHALL NOT be stopped by a cost ceiling.

#### Scenario: Running the sketches
- **WHEN** a developer runs the sketch command on a folder holding the complex case
- **THEN** three sessions run, the three deliverables are kept under the ignored results folder, one per run, and the report is printed

#### Scenario: Missing case
- **WHEN** the folder lacks the complex case
- **THEN** the command runs nothing, names the missing case, and exits non-zero

#### Scenario: Former three-case folder
- **WHEN** the folder also holds easy and medium cases
- **THEN** the command runs only the complex case and says that the other cases are ignored

### Requirement: Sketch report
The sketch report SHALL list, per run, the path of the kept deliverable, whether it exists, whether the session was skill-free, the tokens, the time and the cost; then the total cost and a fingerprint of the prompt the three runs shared. It SHALL be computed only from the recorded sessions, so the same records give the same report, and SHALL hold no classification and no decision.

#### Scenario: Report from recorded sessions
- **WHEN** the report is computed twice from the same recorded sessions
- **THEN** the two reports are identical

#### Scenario: Deliverable missing
- **WHEN** one of the three runs ends without writing its deliverable
- **THEN** the report shows that run's deliverable as missing and the command exits non-zero

#### Scenario: Shared prompt stated
- **WHEN** the report is read
- **THEN** it states one fingerprint of the prompt, the same for the three runs

### Requirement: The person chooses
The person SHALL open the three sketches and choose the run closest to the functionality and richness wanted, or state that none fits, and MAY add hints. Before the choice, the person SHALL be given an inventory that separates the features present in all three runs from those present in only some. The choice SHALL NOT be inferred from the sketches, their size or their cost, and no run SHALL be recommended.

#### Scenario: Choice with hints
- **WHEN** the person picks the second run and adds "keep the critical path, drop the cost column"
- **THEN** the second run is the reference and both hints carry into the proposal

#### Scenario: Variability shown
- **WHEN** only one of the three runs draws a legend
- **THEN** the inventory lists the legend among the features present in only some runs, naming which

#### Scenario: None fits
- **WHEN** the person states that no run fits and describes what is wanted
- **THEN** no run is the reference, and the description carries into the proposal as hints

### Requirement: Sketch prompts seed the testbed
The complex sketch prompt SHALL be the first draft of the new skill's complex testbed case, and the easy and medium cases SHALL be written from the brief by reducing that prompt to a subset of its features. All three SHALL be revised with the person's hints before the baseline is measured, and the sketch runs SHALL NOT count as the skill's baseline.

#### Scenario: Baseline after the revision
- **WHEN** the testbed of the new skill is written
- **THEN** its complex case starts from the sketch prompt revised with the hints, its easy and medium cases ask for a subset of that prompt's features, and its baseline is measured by the evaluation command, not taken from the sketches

## REMOVED Requirements

### Requirement: Three sketch prompts of rising difficulty
**Reason**: Easy and medium sketches tell little about what a skill must add, and mixing difficulty with model variance hides both; the exploration now runs one complex prompt three times.
**Migration**: Write one `complex/` case by the requirement "One complex sketch prompt"; existing easy and medium exploration cases are not run.
