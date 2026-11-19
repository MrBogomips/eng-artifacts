# AGENTS.md

Guidance for working in the eng-artifacts plugin repository.

## Purpose

A Claude Code plugin (`eng-artifacts`): a collection of skills for the optimized production of software engineering artifacts (WBS, UML, diagrams), produced efficiently and with a coherent visual language across artifact types. Every skill is held to both goals: it makes the artifact cheaper to produce, and its output looks like it belongs with the output of the other skills.

## Product guarantees

Two guarantees bind every change to the plugin:

1. **Visual coherence** among artifacts: one shared visual language, the same role looks the same in every artifact type.
2. **Themable UI with a light/dark switch**: the look is replaceable as a whole, and every theme works in light and in dark.

Their checkable form is the `visual-contract` skill (invariants VC-1 to VC-6). The same guarantees are in `openspec/config.yaml`, which injects them into every OpenSpec artifact: change both together.

The visual design is decided. The role vocabulary and drawing rules (`design.md`) live in the `visual-contract` skill under `references/`; the values live only in the plugin's themes, `shared/themes/default.css` (system fonts, nothing loaded) and `shared/themes/alt.css` (the former default look, a second theme for themability checks, loading its fonts from Google Fonts). Artifact pages are the primary target medium. Changing the principle, the vocabulary or the default values is the user's decision.

## State

The plugin exists (version 0.5.0) with four artifact types: ERD, UML class diagram, UML object diagram and UML package diagram (the last two derived from the class diagram). It is published at `github.com/MrBogomips/eng-artifacts` (renamed from `artifacts`, then `engartifacts`) and listed in the `mrbogomips` marketplace (`MrBogomips/claude-plugins`): it installs with `claude plugin marketplace add MrBogomips/claude-plugins` then `claude plugin install eng-artifacts@mrbogomips`. The repository also stays a marketplace of its own (`eng-artifacts@eng-artifacts`), as the `plugin-package` spec requires. Single-plugin repository whose root is the plugin, as in `MrBogomips/agentic-harness`: `.claude-plugin/plugin.json` plus a one-entry `.claude-plugin/marketplace.json` pointing at `./`, same version in both (`plugin.json` is the source of truth).

```
.claude-plugin/          manifests (shipped)
shared/themes/           the style source: default.css, alt.css (shipped)
shared/page/             page shell, page.css (the design's role classes and the page chrome), core.js (measurement, primitives, line hops, highlight registry with the pinned highlight), chrome.js (Dark mode toggle, zoom with pan, Ctrl/pinch and keyboard shortcuts, view options, legend and details cards) (shipped)
shared/scripts/          artifact_page.py, the assembler: validates a model, checks the theme, writes one HTML page (shipped)
shared/uml/              the UML notation and graph layout the UML types share: uml-layout.js (geometry, elkjs layout with compound nodes nested to any depth, self-loops, grid fallbacks, label placement), uml-notation.js (connector ends and labels, the header-band node with an underlined-title option, the folder-tab node, member rows, legend samples) (shipped)
skills/erd/              SKILL.md, references/model.md, scripts/erd_model.py (validation), assets/erd.js (renderer), erd-layout.js (layout) and erd.json (pinned elkjs) (shipped)
skills/uml-class-diagram/ SKILL.md, README.md, references/model.md, scripts/uml_class_diagram_model.py (validation), assets/uml-class-diagram.js (renderer: what is the class diagram's own) and uml-class-diagram.json (pinned elkjs, the shared UML scripts) (shipped)
skills/uml-object-diagram/ SKILL.md, README.md, references/model.md, scripts/uml_object_diagram_model.py (validation), assets/uml-object-diagram.js (renderer) and uml-object-diagram.json (pinned elkjs, the shared UML scripts) (shipped)
skills/uml-package-diagram/ SKILL.md, README.md, references/model.md, scripts/uml_package_diagram_model.py (validation), assets/uml-package-diagram.js (renderer) and uml-package-diagram.json (pinned elkjs, the shared UML scripts) (shipped)
tests/                   structural tests and fixtures (not shipped)
evals/                   skill testbeds (a derived skill has a sample model instead), run.sh, kpi.py, sketch.sh, sketch.py (not shipped)
.claude/                 the development harness (not shipped)
```

A later artifact type adds a folder under `skills/` with its own model, validator and renderer, and touches `shared/` only for a new primitive. A page is assembled in a fixed order: theme, page styles, `core.js`, `chrome.js`, the type's external scripts, the type's shared scripts (the optional `"shared"` list of `assets/<type>.json`: paths relative to `shared/`, each an existing `.js` file inside it, inlined in the order named; the UML types list `uml/uml-layout.js` then `uml/uml-notation.js`), the type renderer (its `<type>-*.js` helper files first, then `<type>.js`), the model as JSON. External scripts load only from `cdn.jsdelivr.net`, `cdnjs.cloudflare.com` or `unpkg.com`, pinned to an exact version. The ERD and UML class diagram layouts use `elkjs` 0.11.1 from jsDelivr, with a grid fallback and a notice when it cannot load. The assembler reads a type's validator from `scripts/<type with hyphens as underscores>_model.py`, so the type `uml-class-diagram` has `uml_class_diagram_model.py`; model files are named `<name>.erd.json` (ERD), `<name>.uml.json` (class diagram), `<name>.object.uml.json` (object diagram) and `<name>.package.uml.json` (package diagram). A type with view options (a level of detail, a layer that can be hidden) describes them with `A.viewOptions` and redraws through `A.redraw`.

## Commands

```bash
openspec list                     # changes in flight (--specs for the specs)
openspec validate --all --strict  # validate every change and spec
openspec validate <id> --strict   # validate one change

bash tests/run-structural-tests.sh   # every tests/validate-*.sh and tests/test-*.sh, plus `claude plugin validate . --strict` when claude is on PATH; needs bash, jq, python3
bash tests/validate-themes.sh [dir]  # one structural test on its own
python3 shared/scripts/artifact_page.py --type erd --model <file>.erd.json --theme <default|alt|path> --out <file>.html   # produce a page
python3 skills/erd/scripts/erd_model.py <file>.erd.json   # validate an ERD model
python3 shared/scripts/artifact_page.py --type uml-class-diagram --model <file>.uml.json --theme <default|alt|path> --out <file>.html   # produce a UML class diagram page
python3 skills/uml-class-diagram/scripts/uml_class_diagram_model.py <file>.uml.json   # validate a UML class diagram model
python3 shared/scripts/artifact_page.py --type uml-object-diagram --model <file>.object.uml.json --theme <default|alt|path> --out <file>.html   # produce a UML object diagram page
python3 skills/uml-object-diagram/scripts/uml_object_diagram_model.py <file>.object.uml.json   # validate a UML object diagram model
python3 shared/scripts/artifact_page.py --type uml-package-diagram --model <file>.package.uml.json --theme <default|alt|path> --out <file>.html   # produce a UML package diagram page
python3 skills/uml-package-diagram/scripts/uml_package_diagram_model.py <file>.package.uml.json   # validate a UML package diagram model

bash evals/run.sh <skill> [--model <id>] [--effort <level>] [--runs N] [-j N] [--baseline]   # evaluate a skill: with the plugin vs without it
python3 evals/kpi.py doc [<skill>] [--check]   # write (or check) the Performance section of each adopted skill (measured, or validated and not measured when derived) and the README skills table

bash evals/sketch.sh <cases-dir> [--model <id>] [--effort <level>] [-j N]   # the exploration of a new artifact skill: the one complex case run three times, unassisted, and their report
```

`evals/run.sh` starts real agent sessions (3 cases x 2 arms x 3 runs by default, model `claude-opus-5-5`, effort `medium`), with no cost ceiling and no cost confirmation, and never publishes a report. Raw results go to the ignored `evals/results/`; a summary is appended to `evals/<skill>/RESULTS.md` with a `Decision: pending` line that the user fills with `adopt`, `rework` or `reject`. The method is the `skill-eval` harness skill. It runs only for a new artifact skill, a major refactoring of an existing one (declared in its proposal) or on the person's explicit request; any other change to an existing skill runs no evaluation, and neither does a new derived skill (below). A derived skill has no testbed: it has `evals/<skill>/sample/`, its sample model, and its `RESULTS.md` holds a validation entry (`Decision: adopt (validated, not measured; derived from <anchor>)`) in place of an evaluation; `python3 evals/kpi.py doc` renders it as "not measured" with its anchor, and `tests/test-derived-samples.sh` checks that the sample exists and that the skill's validator accepts it. `evals/sketch.sh` takes a folder holding the one case `complex/` and runs its identical prompt three times (three isolated sessions, each in its own sandbox of `claude plugin eval`, on an empty stub plugin with the Skill and Agent tools disallowed, so no skill, project instructions, memory, design or other run reaches them; model `claude-opus-5-5`, effort `xhigh` by default) and prints a sketch report: per run the kept deliverable, whether it exists and the session was skill-free, the effort observed, tokens, time and cost, then the total cost and the fingerprint of the shared prompt. An `easy/` or `medium/` case in the folder is ignored with a notice. It never publishes and has no cost ceiling; raw output goes to the ignored `evals/results/sketch-<run-id>/`. There is no build or lint command.

Scripts are macOS (BSD) and Linux compatible: no `grep -P`, no `sed -i`, no `((VAR++))` under `set -e`.

## Harness: artifacts

**Goal:** deliver changes to the plugin that are specified first and keep the visual contract intact.

**Exploration:** a new artifact skill is explored before it is proposed (Phase 0b of the orchestrator): the person's brief, one complex prompt run three times unassisted by `evals/sketch.sh`, the person's choice of a run (or none) and hints, recorded on the issue. A change to an existing skill skips it, and so does a **derived** skill (below).

**Derived skills:** a new artifact skill that only extends an adopted one (its anchor: same renderer, model conventions, layout engine and visual vocabulary, notation shapes added) is declared derived in its proposal, in a Derivation section the person approves. It skips the exploration and the performance evaluation. Its gate is Phase 3c of the orchestrator: the builder writes one sample model under `evals/<skill>/sample/`, the orchestrator renders it with the `default` and `alt` themes into `_agents_workspace/<change-id>/sample/`, the person opens both pages and records the validation in `evals/<skill>/RESULTS.md`, or asks for a fix (two rounds at most). A skill that needs a new layout engine or notation vocabulary, or whose validation still fails, goes back to the spec process and takes the full path as an anchor. Every new notation shape still goes into the visual contract with the person's approval.

**Skill review:** every `SKILL.md` a change adds or changes (plugin or harness skill) is reviewed with `skill-creator` in Phase 3a of the orchestrator, after the visual review and before the evaluation: the focus is how the skill describes its context management, the edits go straight into its `SKILL.md` and `references/`, a report goes to `_agents_workspace/<change-id>/03a_skill_review.md`, and no test or eval runs.

**Spec process:** OpenSpec (2.0.0) — the orchestrator activates it for the change proposal (proposal, spec deltas, design, tasks) and pauses for approval; hand-back via the approved `openspec/changes/<id>/`; at the end the change is archived into `openspec/specs/`.

**Issue tracking:** GitHub Issues (`gh`) — the orchestrator pulls ready work via `gh issue list` or files it with `gh issue create`; status written back via `gh issue comment` and `gh issue close`. Active: the repository is `MrBogomips/eng-artifacts` on GitHub.

**Entry point — applies to every prompt in this repo:** You MUST invoke the `artifacts-orchestrator` skill *before* responding to any request — new work, a follow-up, a re-run, a question, or a change to a previous result. It is the single entry point; do not craft a response outside it. The orchestrator decides what happens next: it answers trivial or out-of-scope requests directly and runs the agents only when the work warrants it.

**Change history:**
| Date | Change | Target | Reason |
|------|--------|--------|--------|
| 2026-11-17 | Initial setup: OpenSpec, `artifact-builder`, `visual-reviewer`, `artifacts-orchestrator`, `visual-contract` | All | — |
| 2026-11-17 | Pinned model and effort: builder `claude-sonnet-5-5` / high, reviewer `claude-opus-5-5` / high | `agents/artifact-builder.md`, `agents/visual-reviewer.md` | results must not vary with the session's model |
| 2026-11-17 | Added the visual design: role vocabulary, drawing rules, default theme, alternate theme | `skills/visual-contract` | design chosen by the user from three explored directions |
| 2026-11-17 | Theme values moved to the plugin's `shared/themes/`; `visual-contract` points to them; ERD notation extended (ring, owned and referenced lines, dashed connector variant) | `skills/visual-contract` | one style source (VC-1); real ERDs need optionality and ownership |
| 2026-11-17 | Added the `skill-eval` harness skill, Phase 3b (evaluate) in the orchestrator, and the Effectiveness rules in `openspec/config.yaml` | `skills/skill-eval`, `skills/artifacts-orchestrator`, `openspec/config.yaml` | an artifact skill must prove it makes the artifact cheaper to produce, and the user decides adoption |
| 2026-11-17 | Reference-aligned design (user's decision, change `align-design-with-reference-erd`): pale 34/24 left-aligned header bands, zones, key chips, system fonts in the default theme, highlighting, details table, zoom from 1:1, a two-state Dark mode toggle in place of the System / Light / Dark switch; the former default becomes the alternate theme | `skills/visual-contract`, `shared/`, `skills/erd` | the plugin's ERD read worse than a reference page the user preferred; align the whole design while ERD is the only type |
| 2026-11-17 | Documentation step: after `adopt`, `python3 evals/kpi.py doc` writes the skill's Performance section and the README skills table; the structural tests check them | `skills/skill-eval`, `skills/artifacts-orchestrator`, `openspec/config.yaml` | capabilities and measured performance are part of a skill's delivery, in one format for every skill |
| 2026-11-17 | Renamed the plugin and the repository to `eng-artifacts` (software engineering artifacts) and listed it in the `mrbogomips` marketplace | manifests, `README.md`, `CLAUDE.md`, `openspec/config.yaml`, harness descriptions | user's decision: a specific name for a plugin shared in a common marketplace |
| 2026-11-18 | Added the exploration phase for a new artifact skill (Phase 0b in the orchestrator, `evals/sketch.sh`, the proposal's Exploration section, the testbed seeded from the sketches) | `skills/artifacts-orchestrator`, `skills/skill-eval`, `evals/`, `openspec/config.yaml`, `CLAUDE.md` | a new skill was specified from a description alone; the person now sees three unassisted renderings first and picks the reference (change `add-skill-exploration`) |
| 2026-11-18 | The exploration runs one complex prompt three times, at `claude-opus-5-5` / `xhigh`, in place of three prompts of rising difficulty; the report is per run and states the shared prompt; the testbed's easy and medium cases are derived from the complex prompt | `evals/sketch.sh`, `evals/sketch.py`, `skills/artifacts-orchestrator`, `skills/skill-eval`, `openspec/config.yaml`, `CLAUDE.md` | an unassisted model handles easy artifacts well; what shapes a skill is its results on advanced cases and how much they vary between attempts (change `revise-skill-exploration`) |
| 2026-11-18 | Design extended for the second artifact type (user's decisions, change `add-uml-class-diagram-artifact`): a fourth key role `--key-stereotype` for the stereotype chip, up to sixteen groups with the five group colors cycling (ERD groups and UML packages alike), the UML notation shapes completed (six kinds, open arrowhead, generic box, compartment rule), line hops at crossings, the `.focus-ring` class | `skills/visual-contract`, `shared/themes/`, `shared/page/` | a class diagram needs stereotypes and more packages than five, and real diagrams cross lines |
| 2026-11-18 | Shared page interactions added for every artifact type, ERD included: a click pins the highlight (also by keyboard), drag to pan, Ctrl/Cmd wheel and pinch zoom, keyboard shortcuts, a view-options control that redraws; the assembler reads `scripts/<type with - as _>_model.py`; the plugin goes to 0.3.0 with the `uml-class-diagram` skill | `shared/page/`, `shared/scripts/artifact_page.py`, `skills/uml-class-diagram`, manifests | chosen by the user from the exploration of the class diagram (issue #5); the two types stay coherent |
| 2026-11-18 | Added the skill review (Phase 3a in the orchestrator): every skill a change adds or changes is reviewed with `skill-creator` for how it describes its context management, edits applied, no tests or evals, before the evaluation | `skills/artifacts-orchestrator`, `openspec/config.yaml`, `CLAUDE.md` | a skill's text is loaded on every trigger and nothing reviewed it for context cost (change `add-skill-context-review`, issue #10) |
| 2026-11-18 | The performance evaluation runs only for a new artifact skill, a major refactoring declared in the proposal, or on explicit request; other changes to an existing skill run none | `skills/artifacts-orchestrator`, `skills/skill-eval`, `openspec/config.yaml`, `CLAUDE.md` | user's decision: re-evaluating an adopted skill on every change wastes time, tokens and money (change `add-skill-context-review`) |
| 2026-11-18 | ERD view options aligned with the class diagram (change `align-erd-views`): detail levels all columns / key columns / table names (keys `1`/`2`/`3`), a Referenced switch (`R`, offered only when the model has owned and referenced relationships), a counts line per kind; the relationships table, the legend and the joining-column highlight follow the view; the plugin goes to 0.4.0 | `skills/erd/assets/`, manifests | the ERD could be read only at full detail while the class diagram offered levels and a switch (issue #11); the two types offer the same reading tools |
| 2026-11-18 | Added the derived-skill path: a new artifact skill that extends an adopted anchor skips the exploration and the performance evaluation and is gated by the person's validation of a sample page (Phase 3c in the orchestrator, `evals/<skill>/sample/`, a validation entry in `RESULTS.md`); `kpi.py doc` documents it as not measured, derived from its anchor; the fourth task rule of `openspec/config.yaml` is quoted so the task rules apply again | `skills/artifacts-orchestrator`, `skills/skill-eval`, `evals/kpidoc.py`, `tests/`, `openspec/config.yaml`, `CLAUDE.md` | twelve UML types remain and most differ little from an adopted one; measuring each would cost several hundred USD to confirm a renderer already measured (change `add-derived-skill-path`, issue #15) |
| 2026-11-18 | Added the `uml-object-diagram` and `uml-package-diagram` skills (derived from `uml-class-diagram`); the UML notation and graph layout the UML types share moved out of the class diagram's renderer into `shared/uml/` (the class diagram renders exactly as before), named per type in a `"shared"` list of `assets/<type>.json` that the assembler inlines before the type's renderer; new notation shapes in the visual contract: the instance node (underlined title), the link, the folder-tab package node and the keyword dependency, with two coherence-map columns (user's approval with the proposal); the plugin goes to 0.5.0 | `shared/uml/`, `shared/scripts/artifact_page.py`, `skills/uml-object-diagram`, `skills/uml-package-diagram`, `skills/uml-class-diagram`, `skills/visual-contract`, manifests, `tests/` | two more UML types at the cost of a build and a sample validation, and one copy of the UML notation for the derived types still to come (change `add-uml-object-and-package-diagrams`, issues #16 and #17) |
| 2026-11-19 | `CLAUDE.md` replaced by `AGENTS.md` as the project's only context file (Claude Code reads `AGENTS.md` when no `CLAUDE.md` applies, at the root and in subfolders); the untracked Codex port (`.codex/`, harness skill copies under `.agents/skills/`) removed: Codex is not a target | `AGENTS.md`, `skills/artifacts-orchestrator`, `openspec/config.yaml`, `tests/run-structural-tests.sh` | user's decision: one context file under its tool-neutral name; the plugin's skills are built for Claude Code and Artifacts only |

## Working documents

- **Authoritative** (committed): `openspec/specs/`, the current behavior of the plugin.
- **In flight** (committed): `openspec/changes/<id>/`. The approved design of a change is its `design.md`.
- **History** (committed): `openspec/changes/archive/`.
- **Evaluation** (committed): `evals/<skill>/` testbeds (prompts and graders), `evals/<skill>/sample/` (the sample model of a derived skill: data only, its pages are produced again and never committed) and `evals/<skill>/RESULTS.md` (sanitized summaries with the user's decisions); `evals/results/` holds raw runs and kept deliverables and is gitignored.
- **Tooling** (committed): `openspec/config.yaml`, edited by hand; `.agents/skills/openspec-*`, linked from `.claude/skills/`, generated by OpenSpec. Never edit the generated skills. `openspec update` regenerates them to match the global profile of whoever runs it; this repository was generated with the `core` profile.
- **Exploration** (gitignored): the cases of a new skill's exploration in `_agents_workspace/explore-<slug>/cases/`, the three runs in `evals/results/sketch-<run-id>/`. The brief, the choice and the hints are recorded on the skill's GitHub issue; the proposal's Exploration section carries them into the change.
- **Scratch** (gitignored): `_agents_workspace/`, the intermediate files of a harness run. Tool defaults such as `docs/superpowers/...` go here instead.

Create, change and archive OpenSpec artifacts only through its own workflow (the `openspec-*` skills and the `openspec` CLI).

## Open decisions

Settle these through an OpenSpec change; none is decided, so do not assume an answer.

- **Relationship with the existing `plantuml` plugin** (in `MrBogomips/claude-code`): it already authors UML, WBS, Gantt, C4 and other diagram types with policy-driven theming and multi-target rendering. This plugin may build on it, depend on it, or replace part of it.
- **Secondary rendering targets**: Artifact pages are the primary medium (decided); which other formats the skills emit (diagram source, standalone SVG, images for documents) is open.

Decided by the `add-erd-artifact` change: the mechanism of the shared visual language. The style source is `shared/themes/` (CSS files carrying their fonts), a project supplies its own theme as a file with the same token set (`--theme <path>`), the toggle is built in `shared/page/chrome.js` (it was a three-button switch in `core.js` until 0.2.0), and `artifact_page.py` assembles the page.

## Reference repositories

The author's other plugin repositories carry conventions worth reusing here. Read them before inventing a layout; record in this file whichever ones this repository adopts.

- `MrBogomips/agentic-harness` (adopted: single-plugin layout, manifests kept in sync, structural tests under `tests/` run by one `run-structural-tests.sh`): single-plugin layout (`.claude-plugin/plugin.json` plus a one-entry `marketplace.json` pointing at `./`), `skills/*/SKILL.md`, shared knowledge under `shared/` referenced as `${CLAUDE_PLUGIN_ROOT}/shared/...`, version kept in sync between the two manifests, structural tests in `tests/`.
- `MrBogomips/claude-code`: multi-plugin marketplace. Its `CLAUDE.md` lists skill frontmatter semantics that are easy to get wrong, the generic-usage principle (no dependence on the author's paths, global instructions or installed tools), and BSD-compatible shell rules. Its `plantuml/` plugin is the closest prior art for policy-driven visual consistency.

On the author's machine both are checked out as siblings of this repository.

## Git / PR Working Policy
- Worktree usage: disabled
- Worktree location: n/a (topic branch in main checkout)
- Base branch: main
- Recorded on: 2026-11-17
