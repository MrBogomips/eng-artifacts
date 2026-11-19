## ADDED Requirements

### Requirement: Shared scripts of an artifact family
An artifact type MAY name shared scripts, files under the plugin's `shared/` folder that several types of one family use. The page SHALL inline them after the type's external scripts and before the type's own renderer files, in the order named. A named file that is missing, outside `shared/`, or not a script SHALL stop the page with an error that names the type and the file, and no page SHALL be written.

#### Scenario: Shared UML scripts inlined
- **WHEN** a class, an object and a package diagram page are produced
- **THEN** each inlines the same shared UML scripts once, before its own renderer, and the page stays one self-contained file

#### Scenario: Missing shared script
- **WHEN** a type names a shared script that does not exist
- **THEN** no page is written, the command exits non-zero, and the error names the type and the file

#### Scenario: Path outside shared rejected
- **WHEN** a type names a shared script whose path leaves the `shared/` folder
- **THEN** no page is written and the error names the type and the path
