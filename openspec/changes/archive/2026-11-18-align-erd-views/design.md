# Design

## Context

The class diagram page already uses the shared view options: `registerOptions(model)` calls `A.viewOptions` once with a `choice` (detail) and a `switch` (deps, `hidden` when it does not apply). Its renderer reads `A.view`, and `prepare(model, view)` filters members and relationships before measurement and layout. `chrome.js` builds the controls, binds their keys, lists them in the hint line, and on change calls `A.redraw` (`core.js`), which clears the pin, resets the cards and keeps the zoom. The ERD renderer (`skills/erd/assets/erd.js`) has `prepare(model)` with no view, sets the counts line inline, and calls `A.details` only when there are relationships. Motivation: see proposal.md.

## Goals / Non-Goals

**Goals:**
- The ERD page offers the same reading tools as the class diagram page, through the same shared mechanism, with no change to `shared/`.
- The meaning of the levels carries over: the full content, the content that matters to the structure, the names only.

**Non-Goals:**
- Changing the class diagram page. Its model has no joining members, so the ERD's joining-column highlight has no counterpart there.
- New model fields: no level or switch is set from the model.

## Decisions

**Levels `all` / `keys` / `names`, labelled "All columns", "Key columns", "Table names", keys `1`/`2`/`3`.** "Key columns" is the ERD counterpart of "Public members": the part of a table that carries the structure (primary, foreign and unique keys).
*Alternative rejected:* a level that hides data types only. It does not shrink tables enough to change the layout, and it has no counterpart in the class diagram.

**Switch `refs`, "Referenced", key `R`, hidden unless the model has both kinds.** Referenced connectors are the ERD's weakest links, as dependencies are in a class diagram. Hiding them leaves the owned structure (aggregates). With one kind only, the switch would either do nothing or blank the drawing, so it is not offered. `hidden: true` already removes it from the head and the hint line.
*Alternative rejected:* a switch for owned connectors as well. It doubles the controls for a view nobody asked for.

**Filtering in `prepare(model, view)`.** Rows are filtered by level before `measureEntity`. Relationships are filtered by kind before the self-loop and layout bookkeeping, so ELK and the grid fallback never see hidden ones. `rowIndex` maps a column name to its index among the rows drawn, so a hidden joining column is simply not found and no row is passed to `A.hl.link`. Relationship ids stay `r<n>` over the relationships drawn, as in the class diagram.

**Counts and cards from the drawn view.** A `buildCounts(p)` in the format of the class diagram (`plural` per part, a per-kind list in parentheses, kinds in the order owned, referenced). The legend's `usage` is computed from the prepared drawing, not from the model, so a hidden kind or a chip no longer drawn drops out. `A.details` is called even with no rows, so a redraw clears the card.

**Version 0.4.0.** A new viewer feature with no model change: minor.

## Risks / Trade-offs

- [At `names`, a table with no rows is a band alone] → `A.headerNodeHeight(0)` already returns the band height, and the class diagram's names level uses the same path. The visual review checks the corner radius and the zones at that level.
- [Self-loop room computed for a hidden relationship] → the filtering happens before the loop bookkeeping, so the room is never reserved.
- [The layout changes between levels, so the viewer loses their place] → the same trade-off as in the class diagram, accepted there. The zoom scale is kept.

## Migration Plan

None: pages produced before 0.4.0 keep working, and a page produced again from the same model gets the controls. The installed plugin is updated with `claude plugin update eng-artifacts@mrbogomips`.
