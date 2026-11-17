# Proposal

## Why

In the evaluation of 2026-11-17, the ERD page produced without the plugin (complex case) read better than the plugin's own. It has pale group headers on white tables, schema areas drawn as zones, colored key badges, hover highlighting linked to a relationships table, and system fonts. The user has decided to adopt that look for the ERD artifact and to align the plugin's whole visual design with it, now, while ERD is still the only artifact type and the cost of changing the shared language is lowest. Tracked in issue #1.

## What Changes

- **BREAKING (look):** the default theme takes the reference palette: a cool grey ground, white panel and nodes, grey ink and connectors, blue/green/orange as the first three groups, and rose as the mark. The former default design (navy ink, solid header bands, orange mark) becomes the alternate theme, so the plugin still ships two themes that differ in every token group.
- **BREAKING (look):** header-band nodes of every artifact type use the reference geometry: a 34px band, 24px rows, a left-aligned title. The band is a pale tint of the group color with ink text, the body is plain, and the outline is the full group color with larger corners. This replaces the 28/22/10/6 centered band.
- Fonts: a theme may use system font stacks with no external font source. The default uses the system stack for text and a monospace system stack for data. Google Fonts remain allowed (the alternate theme keeps them).
- New roles in the vocabulary: **zone** (a rounded area tinted with its group color, with an uppercase label, for the nodes of one group), **chip** (a small tinted label; the ERD uses it for PK/FK/UK keys), **highlight** (the hovered element and what it connects, in the mark color; the rest dims).
- New shared page primitives: linked hover highlighting, a details table linked to the drawing, a legend card, zoom controls, and a page head with derived counts.
- **BREAKING (switch):** a two-state "Dark mode" toggle replaces the System / Light / Dark switch. It starts from the viewer's system preference and remembers the viewer's choice. The explicit return to System is removed.
- The drawing starts at its drawn size. Only the viewer's own zoom may scale it down; it is never fitted down automatically.
- ERD: groups are drawn as zones that contain their tables, and ungrouped tables get the neutral role with a dashed outline. Keys appear as chips, nullable columns are marked, and a relationships table and a legend card sit under the drawing, linked to it by hover.
- ERD model: optional `uk` (unique) and `nullable` booleans per column. Existing models remain valid.
- Plugin version 0.1.0 → 0.2.0.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-theme`: the token set gains the zone, chip (keys) and highlight groups; themes may use system font stacks; the shipped default carries the reference-aligned design and the alternate carries the former default.
- `artifact-page`: the switch becomes a two-state toggle that starts from the system preference; the drawing starts at its drawn size, and only viewer zoom scales it; new requirements for linked highlighting, a details table, a legend card and zoom.
- `erd-artifact`: columns may be `uk` and `nullable`; tables use the new header band with key chips and the nullable marker; groups are drawn as zones; the layout keeps zones apart and their tables inside; new requirements for the relationships table and hover highlighting.

## Visual contract

| Invariant | How this change keeps it |
|---|---|
| VC-1 one style source | Every new value (zone, chip, highlight tints, new geometry, system font stacks) is a token in `shared/themes/`. The reference page is translated into roles; none of its values is copied into `shared/page/` or `skills/`, and `validate-style-source.sh` still has to pass. The reference copy stays in the gitignored workspace. |
| VC-2 semantic tokens | The new tokens are named for roles (`--key-primary`, `--key-foreign`, `--key-unique`, `--chip-mix`, `--zone-mix`, `--highlight-mix`, `--zone-radius`), not appearances. They are added to the vocabulary in `design.md` first, and the test that compares the vocabulary with `default.css` keeps them in step. |
| VC-3 same role, same look | Zone, chip, highlight, details table, legend card and zoom are shared primitives in `shared/page/`, not ERD code. The header band changes for every type at once through `headerMetrics`. The role map in `design.md` gets the new roles for WBS, Gantt, component diagram, UML class and BPMN before any of those types exists. |
| VC-4 themable | Both shipped themes define every token, the new ones included. The alternate theme, which now carries the former default, differs from the default in every group (the new groups included). A page changes look by its theme alone. |
| VC-5 light and dark | Every new color token has light and dark values in both dark blocks of each theme. The contrast pairs in `design.md` gain the key chips on their tint, zone labels on a zone, and the highlighted row. The reviewer renders ERD in both themes and both modes. |
| VC-6 the switch | Every page carries a visible toggle, starts from the viewer's system preference and applies the choice to the whole page; that is all VC-6 requires. The reviewer checks the toggle's checked, unchecked and focused states in every theme and mode, because those states were missed in the previous change. |

## Effectiveness

The ERD skill changes (model fields, renderer), so it is measured again with the `skill-evaluation` method:

- **Testbed:** the existing three cases in `evals/erd/`, unchanged unless a grader needs a fix. Easy: a few entities from a short description. Medium: a larger model from prose, with groups and optional relationships. Complex: from SQL DDL, with composite keys, mandatory, optional and unique foreign keys, a self-relationship, three groups, and owned and referenced relationships. The DDL already states UNIQUE and nullability, so the new fields need no new case.
- **Arms:** with the plugin and without it, same prompt, model `claude-opus-5-5` at effort `medium`, three runs per case and arm (the testbed's default, `runs: 3`).
- **Targets:** the defaults (summed over the cases, median tokens and median time each at least 20% lower than without the plugin, no case worse on either, every plugin run passing its mechanical checks). The adopted evaluation measured −59.0% tokens and −88.7% time; a large drop from those numbers is reported to the user even if the defaults are met.
- **Cost:** measured and reported, not capped.
- **Decision:** the user compares the deliverables of both arms, including against the reference page, and records `adopt`, `rework` or `reject` in `evals/erd/RESULTS.md`.

## Impact

- Plugin: `shared/themes/default.css`, `shared/themes/alt.css`, `shared/page/page.css`, `shared/page/core.js`, `shared/page/shell.html`, possibly `shared/scripts/artifact_page.py` (theme font check); `skills/erd/assets/erd.js`, `skills/erd/scripts/erd_model.py`, `skills/erd/references/model.md`, `skills/erd/SKILL.md`, `skills/erd/README.md`; manifests (version).
- Harness: `.claude/skills/visual-contract/references/design.md` and the summary in `.claude/skills/visual-contract/SKILL.md` (the user's design decision, recorded in this change); a row in the `CLAUDE.md` change history.
- Tests: `tests/validate-themes.sh` (system fonts, new tokens), ERD model tests and fixtures (`uk`, `nullable`), assembler tests (toggle markup).
- Pages produced by 0.1.0 keep working as files; pages produced again with 0.2.0 change look.
- Layout: ELK's hierarchical handling (groups as compound nodes) uses the same pinned `elkjs` 0.11.1; the grid fallback clusters tables by group.
- Evaluation cost: 18 agent sessions (3 cases × 2 arms × 3 runs), reported, not capped.
- Out of scope: other artifact types, secondary rendering targets, the relationship with the `plantuml` plugin.
