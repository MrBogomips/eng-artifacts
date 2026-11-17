# Spec Delta

## Purpose

Measures whether an artifact skill makes its artifact cheaper to produce: the same prompts run with and without the plugin, compared on wall-clock time and tokens consumed. The measurement is automatic and deterministic; the judgement of quality and the decision to adopt the skill belong to a person.

## ADDED Requirements

### Requirement: Testbed per artifact skill
Every artifact skill SHALL have a testbed of at least three eval cases of increasing difficulty: easy, medium and complex. Each case SHALL ask for a concrete deliverable that both arms can produce, and SHALL carry mechanical checks on it.

#### Scenario: ERD testbed coverage
- **WHEN** the ERD testbed is listed
- **THEN** it holds an easy case (a few entities from a short description), a medium case (a larger model from prose, with groups and optional relationships) and a complex case (from SQL DDL, with composite keys, the cardinalities a script can express, a self-relationship, groups, and both owned and referenced relationships)

#### Scenario: Deliverable both arms can produce
- **WHEN** a case prompt is read
- **THEN** it names the deliverable and where to write it, such as a self-contained HTML page at a given file name, and does not mention the plugin or its skills

### Requirement: Two isolated arms
Each case SHALL run in two arms with the same prompt, the same pinned model and the same effort: with the plugin loaded, and a baseline with no plugin. Every run SHALL start from a fresh, isolated environment with no user settings, instructions, memory, other plugins or servers.

#### Scenario: Baseline has no plugin
- **WHEN** the baseline arm runs a case
- **THEN** no skill of the plugin is available to it, and nothing else differs from the plugin arm

#### Scenario: Model and effort recorded
- **WHEN** an evaluation runs
- **THEN** the report states the model and the effort level both arms ran at, and says so explicitly when the effort could not be pinned

### Requirement: Repetitions
Each case SHALL run at least three times per arm, and KPIs SHALL be reported as the median with the minimum and maximum, because single runs vary too much to compare.

#### Scenario: Spread reported
- **WHEN** an evaluation finishes
- **THEN** each KPI of each case and arm shows median, minimum and maximum over its runs

### Requirement: Time KPI
Time SHALL be the wall-clock duration of a run, from the session's start to its final result, in milliseconds.

#### Scenario: Time per run
- **WHEN** a run finishes
- **THEN** its duration is taken from the session's own result record, not from the time the evaluation tool spent around it

### Requirement: Token KPI
Tokens consumed SHALL be the sum, over every model the session used including subagents, of input, cache-creation input, cache-read input and output tokens. Output tokens and cost in US dollars SHALL be reported beside it.

#### Scenario: Subagent tokens counted
- **WHEN** a run delegates work to a subagent on another model
- **THEN** that model's tokens are included in the run's total

### Requirement: Cost is measured, not capped
Evaluation runs SHALL NOT be stopped by a cost ceiling and SHALL NOT wait for a cost confirmation. The cost of every run, case, arm and the whole evaluation SHALL be reported.

#### Scenario: Cost in the report
- **WHEN** an evaluation finishes
- **THEN** the report shows the cost per case and arm and the total cost of the evaluation

### Requirement: Mechanical checks
Every run SHALL be checked mechanically, without a model as judge: the deliverable exists, it contains each expected name, and in the plugin arm the plugin's skill was used. The results SHALL appear in the report as facts per run.

#### Scenario: Skill not triggered
- **WHEN** a plugin run completes without using the plugin's skill
- **THEN** the report flags that run, and the case cannot meet the target

#### Scenario: Deliverable missing
- **WHEN** a run ends without writing its deliverable
- **THEN** the report flags that run as failing its checks

### Requirement: Quality is judged by a person
The quality of the deliverables SHALL be judged by a person, not by the evaluation. The report SHALL list every deliverable of both arms with a path to a kept copy, so the person can open and compare them.

#### Scenario: Deliverables kept for review
- **WHEN** an evaluation finishes and its temporary folders are removed
- **THEN** a copy of every deliverable remains under the ignored results folder, and the report lists the path of each one by case, arm and run

### Requirement: Deterministic, structured report
The evaluation SHALL produce a structured report, in a machine-readable form and a readable table, computed only from the recorded runs. The same recorded runs SHALL always produce the same report.

#### Scenario: Same input, same report
- **WHEN** the report is computed twice from the same recorded runs
- **THEN** the two reports are identical

### Requirement: Effectiveness targets
The default targets SHALL be, summed over the testbed's cases, median tokens at least 20% lower and median time at least 20% lower than the baseline's. A skill's proposal MAY set stricter targets, never looser ones.

#### Scenario: Stricter target in a proposal
- **WHEN** a skill's proposal sets a token target of 50%
- **THEN** its evaluation classifies against 50% for tokens and the default for time

### Requirement: Effectiveness classification
The report SHALL classify the skill as `meets target` (both targets met, no case worse on either KPI, every plugin run passing its checks), `below target` (some reduction, but not `meets target`, naming each unmet target, worse case and flagged run), `no benefit` (no reduction on either KPI) or `incomplete` (a run produced no result record).

#### Scenario: Significant reduction
- **WHEN** the plugin arm totals 60,000 tokens and 70 seconds against a baseline of 90,000 tokens and 100 seconds, with no case worse and every check passed
- **THEN** the classification is `meets target`

#### Scenario: Borderline result
- **WHEN** tokens drop by 30% but time drops by 12%
- **THEN** the classification is `below target`, naming the time target as unmet

#### Scenario: One case regresses
- **WHEN** the totals meet both targets but one case takes longer with the plugin than without
- **THEN** the classification is `below target` and names that case

### Requirement: Adoption is a person's decision
Whether a skill is adopted SHALL be decided by a person who has read the report and reviewed the deliverables. The decision (`adopt`, `rework` or `reject`) and its reason SHALL be recorded with the evaluation. The classification informs the decision and does not replace it, most of all when the result is borderline.

#### Scenario: Borderline skill adopted
- **WHEN** the classification is `below target` and the person, having compared the deliverables, records `adopt` with a reason
- **THEN** the skill counts as adopted and the reason is kept with the results

### Requirement: One command
The repository SHALL provide one command that runs a skill's testbed and prints the report: per case and in total, both KPIs for both arms, the reductions, the cost, the mechanical checks, the deliverable paths and the classification.

#### Scenario: Running the ERD evaluation
- **WHEN** a developer runs the evaluation command for the ERD skill
- **THEN** it prints the report, and exits non-zero only when the evaluation could not run or is `incomplete`

### Requirement: Recorded results
Each evaluation SHALL write a summary to the repository with the date, the plugin version, the model, the effort, the Claude Code version, every KPI, the cost, the classification and a place for the person's decision. The summary SHALL contain no absolute paths, user names or transcripts; raw run data and the kept deliverables SHALL NOT be committed.

#### Scenario: Summary is shareable
- **WHEN** an evaluation summary is written
- **THEN** it can be committed to a public repository as is, and raw results stay in an ignored folder

### Requirement: Performance in the skill's documentation
Every adopted artifact skill SHALL have its own documentation page, `skills/<skill>/README.md`, describing its capabilities and carrying a Performance section. The Performance section SHALL have the same structure for every skill and SHALL be generated from the adopted evaluation, never written by hand: date, plugin version, model and effort, runs per arm, the per-case and total table of tokens, time and cost for both arms with the change, the classification and the decision.

#### Scenario: Same format for every skill
- **WHEN** the Performance sections of two skills are compared
- **THEN** they have the same headings, columns, order and number formats, and differ only in their values and cases

#### Scenario: Section matches the evaluation
- **WHEN** the structural tests regenerate a skill's Performance section from its adopted evaluation
- **THEN** the result is identical to the section in the skill's README

### Requirement: Skills summary in the repository README
The repository README SHALL carry a skills table with one row per adopted skill: its name linked to its documentation page, a one-line capability summary, the total token and time reductions and the date of the adopted evaluation. The rows SHALL be generated from the same data as the Performance sections.

#### Scenario: New skill appears in the summary
- **WHEN** a skill's evaluation is adopted and the documentation step runs
- **THEN** the README skills table has a row for that skill with the reductions of that evaluation

### Requirement: Evaluation gates a skill change
A change that adds or changes an artifact skill SHALL state its testbed and targets in its proposal, SHALL measure the baseline before the skill is built, and SHALL NOT be archived until an evaluation of its final version is recorded with the person's decision `adopt` and the skill's documentation page and the README skills table show that evaluation.

#### Scenario: Archive blocked
- **WHEN** a skill change has passed the visual review but its final evaluation has no recorded decision, or the decision is `rework` or `reject`
- **THEN** the change is not archived

#### Scenario: Documentation missing
- **WHEN** a skill's evaluation is adopted but its Performance section or README row is missing or out of date
- **THEN** the structural tests fail and the change is not archived
