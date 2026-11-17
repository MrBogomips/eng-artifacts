# CLAUDE.md

Guidance for working in the engartifacts plugin repository.

## Purpose

A Claude Code plugin (`engartifacts`): a collection of skills for the optimized production of software engineering artifacts (WBS, UML, diagrams), produced efficiently and with a coherent visual language across artifact types. Every skill is held to both goals: it makes the artifact cheaper to produce, and its output looks like it belongs with the output of the other skills.

## Product guarantees

Two guarantees bind every change to the plugin:

1. **Visual coherence** among artifacts: one shared visual language, the same role looks the same in every artifact type.
2. **Themable UI with a light/dark switch**: the look is replaceable as a whole, and every theme works in light and in dark.

Their checkable form is the `visual-contract` skill (invariants VC-1 to VC-6). The same guarantees are in `openspec/config.yaml`, which injects them into every OpenSpec artifact: change both together.

The visual design is decided. The role vocabulary and drawing rules (`design.md`) live in the `visual-contract` skill under `references/`; the values live only in the plugin's themes, `shared/themes/default.css` (system fonts, nothing loaded) and `shared/themes/alt.css` (the former default look, a second theme for themability checks, loading its fonts from Google Fonts). Artifact pages are the primary target medium. Changing the principle, the vocabulary or the default values is the user's decision.

## State

The plugin exists (version 0.2.0) with one artifact type, ERD. It is published at `github.com/MrBogomips/engartifacts` (renamed from `artifacts`) and listed in the `mrbogomips` marketplace (`MrBogomips/claude-plugins`): it installs with `claude plugin marketplace add MrBogomips/claude-plugins` then `claude plugin install engartifacts@mrbogomips`. The repository also stays a marketplace of its own (`engartifacts@engartifacts`), as the `plugin-package` spec requires. Single-plugin repository whose root is the plugin, as in `MrBogomips/agentic-harness`: `.claude-plugin/plugin.json` plus a one-entry `.claude-plugin/marketplace.json` pointing at `./`, same version in both (`plugin.json` is the source of truth).

```
.claude-plugin/          manifests (shipped)
shared/themes/           the style source: default.css, alt.css (shipped)
shared/page/             page shell, page.css (the design's role classes and the page chrome), core.js (measurement, primitives, highlight registry), chrome.js (Dark mode toggle, zoom, legend and details cards) (shipped)
shared/scripts/          artifact_page.py, the assembler: validates a model, checks the theme, writes one HTML page (shipped)
skills/erd/              SKILL.md, references/model.md, scripts/erd_model.py (validation), assets/erd.js (renderer), erd-layout.js (layout) and erd.json (pinned elkjs) (shipped)
tests/                   structural tests and fixtures (not shipped)
evals/                   skill testbeds, run.sh, kpi.py (not shipped)
.claude/                 the development harness (not shipped)
```

A later artifact type adds a folder under `skills/` with its own model, validator and renderer, and touches `shared/` only for a new primitive. A page is assembled in a fixed order: theme, page styles, `core.js`, `chrome.js`, the type's external scripts, the type renderer (its `<type>-*.js` helper files first, then `<type>.js`), the model as JSON. External scripts load only from `cdn.jsdelivr.net`, `cdnjs.cloudflare.com` or `unpkg.com`, pinned to an exact version. The ERD layout uses `elkjs` 0.11.1 from jsDelivr, with a grid fallback and a notice when it cannot load.

## Commands

```bash
openspec list                     # changes in flight (--specs for the specs)
openspec validate --all --strict  # validate every change and spec
openspec validate <id> --strict   # validate one change

bash tests/run-structural-tests.sh   # every tests/validate-*.sh and tests/test-*.sh, plus `claude plugin validate . --strict` when claude is on PATH; needs bash, jq, python3
bash tests/validate-themes.sh [dir]  # one structural test on its own
python3 shared/scripts/artifact_page.py --type erd --model <file>.erd.json --theme <default|alt|path> --out <file>.html   # produce a page
python3 skills/erd/scripts/erd_model.py <file>.erd.json   # validate an ERD model

bash evals/run.sh <skill> [--model <id>] [--effort <level>] [--runs N] [-j N] [--baseline]   # evaluate a skill: with the plugin vs without it
python3 evals/kpi.py doc [<skill>] [--check]   # write (or check) the Performance section of each adopted skill and the README skills table
```

`evals/run.sh` starts real agent sessions (3 cases x 2 arms x 3 runs by default, model `claude-opus-5-5`, effort `medium`), with no cost ceiling and no cost confirmation, and never publishes a report. Raw results go to the ignored `evals/results/`; a summary is appended to `evals/<skill>/RESULTS.md` with a `Decision: pending` line that the user fills with `adopt`, `rework` or `reject`. The method is the `skill-eval` harness skill. There is no build or lint command.

Scripts are macOS (BSD) and Linux compatible: no `grep -P`, no `sed -i`, no `((VAR++))` under `set -e`.

## Harness: artifacts

**Goal:** deliver changes to the plugin that are specified first and keep the visual contract intact.

**Spec process:** OpenSpec (2.0.0) — the orchestrator activates it for the change proposal (proposal, spec deltas, design, tasks) and pauses for approval; hand-back via the approved `openspec/changes/<id>/`; at the end the change is archived into `openspec/specs/`.

**Issue tracking:** GitHub Issues (`gh`) — the orchestrator pulls ready work via `gh issue list` or files it with `gh issue create`; status written back via `gh issue comment` and `gh issue close`. Active: the repository is `MrBogomips/engartifacts` on GitHub.

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
| 2026-11-17 | Renamed the plugin and the repository to `engartifacts` (software engineering artifacts) and listed it in the `mrbogomips` marketplace | manifests, `README.md`, `CLAUDE.md`, `openspec/config.yaml`, harness descriptions | user's decision: a specific name for a plugin shared in a common marketplace |

## Working documents

- **Authoritative** (committed): `openspec/specs/`, the current behavior of the plugin.
- **In flight** (committed): `openspec/changes/<id>/`. The approved design of a change is its `design.md`.
- **History** (committed): `openspec/changes/archive/`.
- **Evaluation** (committed): `evals/<skill>/` testbeds (prompts and graders) and `evals/<skill>/RESULTS.md` (sanitized summaries with the user's decisions); `evals/results/` holds raw runs and kept deliverables and is gitignored.
- **Tooling** (committed): `openspec/config.yaml`, edited by hand; `.agents/skills/openspec-*`, linked from `.claude/skills/`, generated by OpenSpec. Never edit the generated skills. `openspec update` regenerates them to match the global profile of whoever runs it; this repository was generated with the `core` profile.
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
