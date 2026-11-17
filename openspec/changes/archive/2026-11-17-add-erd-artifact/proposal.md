# Proposal

## Why

The plugin exists only as a harness and a decided visual design: no plugin package, no style source, no artifact skill. The first change has to prove the whole chain on one artifact type: the model writes only the data, the plugin produces a page in the shared design, and the page works in every theme and in light and dark. ERD is the type chosen to prove it.

## What Changes

- **Plugin package.** The repository root becomes an installable Claude Code plugin: `.claude-plugin/plugin.json` and a one-entry `.claude-plugin/marketplace.json` pointing at `./`, with the same version in both. A README and a license. The development harness under `.claude/` stays outside the plugin.
- **Shared style source.** The default and alternate themes move from the harness (`.claude/skills/visual-contract/references/`) into the plugin, which becomes their only home. Each theme also names the fonts it needs. The `visual-contract` skill points to the plugin's files instead of holding a copy.
- **Artifact page.** A shared, reusable way to turn a data model into one self-contained HTML page built for Artifact pages: theme inlined, a System / Light / Dark switch, a drawing frame that scrolls on its own, a clear message when something cannot be drawn. A theme is chosen when the page is produced, by name or by a path to a project's own theme file.
- **ERD artifact.** A plugin skill that turns a request for an entity relationship diagram into a small JSON model (entities, columns, keys, relationships with cardinality and kind, optional groups), validates it, and produces the page. Tables are drawn as the design's header-band nodes; relationships use crow's foot notation and are laid out automatically.
- **Design extension (approved).** The design fixes ERD notation as "crow's foot for many, two short ticks for one". Real ERDs also need optionality and ownership, so this change adds to the notation rules in `.claude/skills/visual-contract/references/design.md`: the standard ring for "zero" (zero-or-one, zero-or-many, one-or-many), and two relationship kinds the user can choose, `owned` (solid connector) and `referenced` (dashed connector, with the dash pattern the design already uses). No token or color changes.
- **Tests.** Structural tests run with bash, jq and python3: manifests and their version sync, theme completeness, a static check that no style value lives outside the themes (VC-1), and the page assembly on valid and invalid models.
- **Skill effectiveness evaluation.** A skill earns its place only if it makes the artifact cheaper to produce. Every artifact skill gets a testbed of three prompts (easy, medium, complex), run with the plugin and without it (a baseline arm), measuring two KPIs: wall-clock time and tokens consumed, with cost reported beside them. The evaluation produces a structured, deterministic report and classifies the skill against its targets; a person judges the quality of the deliverables and decides whether to adopt the skill, which matters most when the benefit is borderline. The evaluation is part of the OpenSpec workflow: a proposal for a skill states its testbed and targets, the baseline is measured before the skill is built, and the change is not archived until the person records `adopt` on the final evaluation and the skill's documentation shows its capabilities and measured performance, in one standard format for every skill, with a summary row in the repository README. The ERD skill is the first one measured.

## Capabilities

### New Capabilities

- `plugin-package`: what makes the repository an installable plugin: manifests, version sync, what is and is not shipped.
- `visual-theme`: the plugin's single style source: the token set, the default and alternate themes, light and dark values, fonts, and how a project supplies its own theme.
- `artifact-page`: the self-contained page every artifact type is delivered in: assembly from a data model, inlined theme, the light/dark switch, layout constraints for Artifact pages, behaviour when drawing fails.
- `erd-artifact`: entity relationship diagrams: the data model the skill writes, its validation, the notation, and how tables and relationships are drawn with the shared roles.
- `skill-evaluation`: how the effectiveness of an artifact skill is measured: the per-skill testbed, the with/without arms, the time and token KPIs, the mechanical checks, the deterministic report and its classification, the person's quality review and adoption decision, and the recorded results.

### Modified Capabilities

None: no specs exist yet.

## Visual contract

| Invariant | How this change keeps it |
|---|---|
| VC-1 one style source | The themes in the plugin are the only place holding color values and font families. The `visual-contract` references are replaced by a pointer, so no copy remains. A structural test fails on any color literal or font family outside the themes. |
| VC-2 semantic tokens | The renderer and the page use only the token names of the design's role vocabulary. The test checks that every theme defines exactly that set. |
| VC-3 same role, same look | Nodes, header bands, connectors and the switch are drawn by shared primitives that implement the design's formulas, not by ERD code. An ERD table is the design's header-band node. ERD is the only artifact type in this change, so cross-type coherence is checked against the design's role map; the next artifact type must reuse the same primitives. |
| VC-4 themable | A page is produced with any complete theme file and no other edit. The alternate theme ships with the plugin and is used to verify this. |
| VC-5 light and dark | Every theme defines every color token for both modes; the test checks it. The reviewer renders the ERD in both themes and both modes and checks the contrast pairs listed in the design. |
| VC-6 the switch | Every page carries the System / Light / Dark switch, starts from the system preference and applies the choice to the whole page. |

## Effectiveness

The ERD skill is measured with the method this change introduces (`skill-evaluation`):

- **Testbed:** three cases. Easy: a few entities from a short description. Medium: a larger model from prose, with groups and optional relationships. Complex: from SQL DDL, with composite keys, the cardinalities a script can express, a self-relationship, groups, and owned and referenced relationships. Each asks for a self-contained HTML page and never names the plugin.
- **Arms:** with the plugin and without it, same prompt, model `claude-opus-5-5` at effort `medium` (pinned if the eval tool allows it, otherwise recorded as not pinned), three runs each.
- **Targets:** the defaults. Summed over the cases, median tokens at least 20% lower and median time at least 20% lower than without the plugin, no case worse on either, and every plugin run passing its mechanical checks.
- **Cost:** measured and reported, not capped.
- **Decision:** the user reviews the deliverables of both arms and records `adopt`, `rework` or `reject`.
- **Baseline first:** the testbed runs once before the skill is built, to record the baseline and check that the cases are fair.

## Impact

- New at the repository root: `.claude-plugin/`, `shared/`, `skills/erd/`, `tests/`, `evals/`, `README.md`, `LICENSE`.
- Changed in the harness: `.claude/skills/visual-contract/` (theme files replaced by a pointer; ERD notation extended), a new `skill-eval` harness skill, the `artifacts-orchestrator` (an evaluation phase), `openspec/config.yaml` (rules that require a testbed and targets for every skill change), `CLAUDE.md` (structure, test and eval commands, resolved open decisions).
- Evaluation cost: each run of the testbed starts 18 real agent sessions on the developer's account (3 cases × 2 arms × 3 runs). Cost is measured and reported, not capped. Evaluations are not part of the fast structural tests.
- New runtime dependencies, both optional to install and discovered at run time: `python3` (standard library only) to validate and assemble pages; a pinned `elkjs` build loaded by the page from `cdn.jsdelivr.net` for automatic layout. Fonts load from Google Fonts with fallbacks.
- Out of scope: other artifact types, outputs other than the HTML page (standalone SVG, images for documents), publishing the repository, and the relationship with the existing `plantuml` plugin.
