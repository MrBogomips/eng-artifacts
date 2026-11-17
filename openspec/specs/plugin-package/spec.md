# plugin-package Specification

## Purpose
Makes the repository installable as a Claude Code plugin from its own marketplace entry, and fixes what the plugin ships and what stays development-only.

## Requirements

### Requirement: Plugin manifest at the repository root
The repository root SHALL be the plugin: it SHALL contain `.claude-plugin/plugin.json` with a name, a semantic version, a description, an author and a license.

#### Scenario: Manifest is valid
- **WHEN** the structural tests read `.claude-plugin/plugin.json`
- **THEN** it parses as JSON and has a non-empty `name`, `version` in `MAJOR.MINOR.PATCH` form, `description`, `author` and `license`

### Requirement: Single-plugin marketplace
The repository SHALL contain `.claude-plugin/marketplace.json` with exactly one plugin entry whose source is `./`, so the repository can be added as a marketplace and the plugin installed from it.

#### Scenario: One entry pointing at the root
- **WHEN** the structural tests read `.claude-plugin/marketplace.json`
- **THEN** it lists exactly one plugin, with the same `name` as `plugin.json` and `source` equal to `./`

### Requirement: Versions stay in sync
The version in `plugin.json` SHALL be the source of truth, and the marketplace entry SHALL carry the same version.

#### Scenario: Version mismatch fails the tests
- **WHEN** `plugin.json` and the marketplace entry carry different versions
- **THEN** the structural tests fail and name both versions

### Requirement: Development harness is not shipped
Plugin components SHALL live only in the plugin's own locations (`skills/`, `shared/`); nothing under `.claude/`, `.agents/`, `openspec/`, `tests/`, `evals/` or `_agents_workspace/` SHALL be required by a plugin component at run time.

#### Scenario: No component reaches into the harness
- **WHEN** the structural tests search the plugin's skills and shared files
- **THEN** none references a path under `.claude/`, `.agents/`, `openspec/`, `tests/`, `evals/` or `_agents_workspace/`

### Requirement: Generic use
Plugin components SHALL NOT depend on a particular user's paths, global instructions or installed tools; a component that needs a tool SHALL check for it at run time and tell the user what is missing.

#### Scenario: Missing tool is reported
- **WHEN** a skill needs `python3` and it is not available
- **THEN** the skill tells the user that `python3` is required to produce the page, and produces no partial page

### Requirement: Structural tests
The repository SHALL provide one command that runs every structural test and exits non-zero when any fails, needing only bash, jq and python3.

#### Scenario: One command runs everything
- **WHEN** a developer runs `bash tests/run-structural-tests.sh`
- **THEN** every structural test runs, each failure names the file and the problem, and the exit status is non-zero if any test failed
