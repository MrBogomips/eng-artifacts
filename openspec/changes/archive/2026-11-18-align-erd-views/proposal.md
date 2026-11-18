# Proposal

## Why

Since 0.3.0 the ERD page shares zoom, pan, the pinned highlight and the keyboard shortcuts with the class diagram page, but it is still the poorer of the two when it comes to reading a large diagram: the class diagram lets the viewer change the level of detail and hide the weakest connectors, and its counts line says what is drawn per kind; the ERD offers none of that, so a twelve-table schema can only be read at full detail (issue MrBogomips/eng-artifacts#11). The two types should offer the same ways to navigate and read details.

## What Changes

- **Detail levels** on the ERD page, as on the class diagram page and with the same keys: all columns (`1`), key columns only (`2`: the columns with a primary, foreign or unique key chip) and table names only (`3`: the header band). Changing the level redraws and lays the diagram out again, with no gap where hidden columns were.
- **Referenced relationships switch** (`R`, on by default): it hides the referenced (dashed) connectors and the room they took, the analog of the class diagram's Dependencies switch. It is offered only when the model has both owned and referenced relationships.
- **Counts line** following the view: groups, tables and relationships counted per kind (owned, referenced), as the class diagram counts packages, classifiers and relationships per kind.
- The relationships table, the legend and the joining-column highlight follow the view: a hidden connector has no row and no legend sample, a hidden column is not highlighted.
- The plugin goes to 0.4.0.

No change to the shared page: the view-option control, its redraw and the keyboard hint already serve any artifact type. The class diagram page does not change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `erd-artifact`: adds the detail levels, the referenced relationships switch and the counts line; the relationships table follows the view and highlights a joining column only when it is drawn.

## Visual contract

| Invariant | How this change keeps it |
|---|---|
| VC-1 one style source | Kept: the controls are the shared view-option control of `shared/page/`; no value is added to the ERD renderer. |
| VC-2 semantic tokens | Kept: no new role; the control already uses the accent, grid, node, ink and mark roles. |
| VC-3 same role, same look | Strengthened: the ERD and class diagram pages show the same control, the same keys `1`/`2`/`3`, the same switch look and the same counts format. |
| VC-4 themable | Kept: nothing is theme-specific; checked in `default` and `alt`. |
| VC-5 light and dark | Kept: checked in both modes in both themes, every detail level. |
| VC-6 the switch | Kept: the Dark mode toggle and its shortcut `T` are unchanged and do not clash with `R`. |

## Effectiveness

Not a major refactoring: the model, the validator and the skill's instructions keep their shape, and the renderer gains view options on the viewer's side. By the rule of change `add-skill-context-review`, no performance evaluation runs; the ERD skill keeps its last adopted evaluation in its README and in the README skills table.

## Impact

- Changed, shipped: `skills/erd/assets/erd.js` (and `erd-layout.js` only if a band with no rows needs it), `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` (0.4.0).
- Reviewed by the skill review (Phase 3a, change `add-skill-context-review`): `skills/erd/SKILL.md` and `skills/erd/references/model.md`, with no change of substance expected.
- Unchanged: `shared/`, the themes, the model format and its validator, the class diagram skill.
- Documentation: `skills/erd/README.md` (capabilities); its Performance section keeps the last adopted evaluation.
