# Design

## Context

See `proposal.md` for the motivation and the decisions. The reference is a single page written by hand, with its own tokens (`--bg`, `--panel`, `--text`, `--muted`, `--border`, `--edge`, per-area `--sales`/`--sales-head`/`--sales-fill`, per-key `--pk`/`--pk-bg`…). The plugin draws from a fixed role vocabulary through shared primitives (`shared/page/page.css`, `shared/page/core.js`) and a type renderer (`skills/erd/assets/erd.js`). Aligning means **translating** the reference's roles into the vocabulary and adding the roles it lacks. Copying the reference's values into page or skill files would break VC-1 (`tests/validate-style-source.sh`).

Most of the reference's table look is already expressible with the existing treatment tokens: `--fill-mix` 0% gives a plain body, `--stroke-mix` 100% a full group outline, a low `--band-mix` with `--band-ink` = `--ink` a pale band with dark text. The genuinely new parts are zones, key chips, highlighting, the cards under the drawing, zoom and the toggle.

## Goals / Non-Goals

**Goals:**
- The default theme reproduces the reference look in light and dark with no ERD-specific style code.
- Every new visual element is a shared role or primitive that the next artifact types reuse.
- The skill stays as cheap as today: the model gains two optional booleans and nothing else.

**Non-Goals:**
- Pixel identity with the reference: its 9px badges and its default Fit at 58% break the 10.5px floor and are not adopted.
- The reference's notation: its ring is unfilled and it never draws `1..*`. The design's fixed ERD notation stays.
- New artifact types, secondary rendering targets.

## Decisions

### 1. Role translation

| Reference | Vocabulary | Note |
|---|---|---|
| `--bg`, `--panel`, `--table-bg` | `--canvas`, `--surface`, `--node` | new values |
| `--text`, `--muted` | `--ink`, `--ink-2` | new values |
| `--border`, `--row-sep` | `--grid` | row separators inset 8px from the outline |
| `--edge` | `--line` | |
| `--accent` (rose, hover) | `--mark` | "the edge under discussion" is already the mark's meaning |
| `--row-hl` | `color-mix(--mark at --highlight-mix, --node)` | new treatment token |
| `--<area>` | `--group-N` | assigned in order of first appearance, as today |
| `--<area>-head` | `.band` with low `--band-mix` | |
| `--<area>-fill` | `.zone` with `--zone-mix` | new role |
| `--none`, `--none-head` | `--neutral` | plus the dashed outline of an ungrouped node |
| `--pk`/`--fk`/`--uk` (+ `-bg`) | `--key-primary`/`--key-foreign`/`--key-unique`; ground = `color-mix(key at --chip-mix, --node)` | new roles |

### 2. Token roles added or changed, and their consumers

| Token | Status | Role | Consumers |
|---|---|---|---|
| `--key-primary`, `--key-foreign`, `--key-unique` | added | text of a key chip; its ground is a mix of the same color into `--node` | ERD now; the chip primitive is shared (`--k` carries the color, as `--c` carries a group), for UML stereotypes and WBS codes later |
| `--chip-mix` | added | how much of a chip's color goes into its ground | chip primitive |
| `--zone-mix` | added | how much of a group color goes into its zone's ground | zone primitive: ERD groups; component-diagram bounded contexts later |
| `--zone-radius` | added | corners of a zone | zone primitive |
| `--highlight-mix` | added | how much of `--mark` goes into a highlighted row's ground | highlight primitive, details table: every type |
| `--dim` | added | opacity of the elements not highlighted | highlight primitive: every type |
| `--canvas` … `--status-*`, `--group-*` | changed values | as today | every type |
| `--band-ink` | changed meaning in the default | equals `--ink` with pale bands (the "tinted" character already in the design) | header band |
| `--font-*` | changed values | system stacks in the default | every type |
| `--radius`, `--stroke`, `--panel-radius` | changed values | 8px, 1.5px, 10px in the default | every type |
| `--fill-mix`, `--stroke-mix`, `--band-mix` | changed values | 0%, 100%, about 20% in the default | header-band nodes |

The two key colors in the reference's light mode (amber text on a yellow ground) are not a mix of one hue. The builder tunes each `--key-*` value and `--chip-mix` so that text on ground reaches 4.5:1 in both modes and the chip reads as the reference's at normal size. It does not add separate ground tokens.

### 3. Default theme values (starting point, verified on render)

Light: canvas `#f5f6f8`, surface and node `#ffffff`, ink `#1f2933`, ink-2 `#67707c`, line `#4f5966`, grid `#d7dbe1`, neutral `#6b7280`, accent `#2563eb`, mark `#e11d48`, band-ink = ink; groups `#2563eb`, `#05875f`, `#c2410c`, `#7c3aed`, `#a16207`; keys amber, violet, cyan from the reference. Dark: canvas `#0e1217`, surface `#161b22`, node `#1a2028`, ink `#e5e8ec`, ink-2 `#98a1ac`, line `#a7b0bb`, grid `#2d3540`, neutral `#9ca3af`, accent `#6aa8fb`, mark `#fb7185`; groups `#6aa8fb`, `#3fd39d`, `#fb9a52`, `#b39dfa`, `#e0b866`; keys `#fcd34d`, `#c9bbfd`, `#6ee7f9`. Status colors are picked in the same family and checked against the contrast pairs. Groups 4 and 5 are not in the reference; the user sees them in the review renders.

Fonts: `--font-display` and `--font-body` = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`; `--font-data` = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. No `@import`.

`alt.css` becomes the former default (navy, solid bands, Space Grotesk and Inter from Google Fonts, `--band-mix` 100%, `--radius` 3px), plus values for every new token. It must still differ from the new default in every group, keys included.

Alternative rejected: a separate token per area as in the reference (`--sales-head`). Areas are model content, not roles, and five group tokens with treatment mixes already cover them.

### 4. Header band and type

`A.headerMetrics` becomes band 34, row 24, title inset 12, chip inset 8, content inset 10, 4 under the last row. The band text is left-aligned and vertically centered. `design.md` updates the proportions, the drawing order (unchanged) and the type table:

| Use | Face | Size and weight |
|---|---|---|
| Text on a header band | `--font-body` | 13px, 700 |
| Table column / class member name | `--font-body` | 12px, 400; a primary key 600 |
| Column type, identifiers | `--font-data` | 11px, 400 |
| Chip | `--font-body` | 10.5px, 700, letter-spacing 0.03em |
| Nullable marker | `--font-data` | 10.5px italic, `--ink-2` |

Chips are 16px high in a 24px row. Nothing goes below 10.5px.

### 5. New drawing formulas (normative, added to `design.md`)

```css
.zone       { fill: color-mix(in oklab, var(--c) var(--zone-mix), var(--surface));
              stroke: var(--c); stroke-width: var(--stroke); rx: var(--zone-radius); }
.zone-label { fill: var(--c); font: 700 12px var(--font-body); letter-spacing: .08em; text-transform: uppercase; }
.node.ungrouped, .node-outline.ungrouped { stroke-dasharray: 5 3; }
.chip       { fill: color-mix(in oklab, var(--k) var(--chip-mix), var(--node)); }
.chip-text  { fill: var(--k); }
.hl .node-outline, .edge.hl { stroke: var(--mark); stroke-width: calc(var(--stroke) + .75px); }
.row.hl     { fill: color-mix(in oklab, var(--mark) var(--highlight-mix), var(--node)); }
.hovering .edge:not(.hl), .hovering .node-group:not(.hl) { opacity: var(--dim); }
.edge.dashed { stroke-dasharray: 7 5; }
.notation   { stroke-linecap: round; }
```

The zone label is 12px, not the reference's 15px: it is a group label, not a title. `.notation-ring` keeps its `--node` fill (hollow marks are filled with the node color).

### 6. Page shell: toggle, head, cards, zoom

- **Toggle:** a labelled checkbox switch ("Dark mode"). The track is off in `--grid` and on in `--accent`; the thumb is `--node` with a `--line` outline (no shadow literal); focus is a 2px `--mark` ring offset 2px. Its state is stored under one key per page origin; a stored `system` value from 0.1.0 counts as no choice. The theme files keep their media-query dark block, so a page without script still follows the system.
- **Head:** a sticky bar on `--surface` with a `--grid` rule. It holds the title, the description and a counts line the renderer supplies (`12 tables · 13 relationships`), with the zoom controls and the toggle on the right; it wraps at phone width.
- **Cards:** the legend card and the details table card under the drawing, side by side above 900px and stacked below. They use `--surface`, `--grid` and `--panel-radius`, and the table scrolls inside its card.
- **Zoom:** the drawing's SVG width and height follow its viewBox times the scale, between 0.3 and 3. It starts at 1:1. Fit is a button and never the initial state (decided against the reference, whose 58% Fit makes text unreadable).

### 7. Highlight primitive

`core.js` exposes a registry: a renderer registers nodes (id → group element), connectors (element, the two node ids, optional row elements at each end) and, through the details table primitive, rows. Hover on any of them adds `hovering` to the SVG and `hl` to the connected set. The renderer only declares links. A hint line under the frame explains the interaction. Touch: a tap toggles the same state.

### 8. ERD layout with zones

- **ELK:** each group becomes a compound node holding its tables, with top padding for the label and `elk.hierarchyHandling: INCLUDE_CHILDREN`. Ungrouped tables and all edges sit at the root, so edge sections come back in root coordinates. Child positions are relative to their group and are turned into absolute ones. The zone rectangle is the group node's box. The loop strip and the label placement keep working on absolute coordinates.
- **Column-anchored ends:** when a relationship names its `columns`, its ends attach at the height of those rows through ELK ports on the table's sides (`FIXED_POS`), as in the reference. With no `columns`, ends spread along the side as today.
- **Grid fallback:** tables are ordered by group, and each group starts a new block of rows. A zone is its block's bounding box plus padding, and gutters are widened by the zone padding so lanes never cross a zone label. The ungrouped tables form the last block, with no zone.

Alternative rejected: drawing zones as bounding boxes after a flat ELK layout. Groups would interleave and zones overlap, which breaks the new layout requirement.

### 9. Model and validation

`uk` and `nullable` are optional booleans; `erd_model.py` rejects other types and keeps rejecting unknown fields. `SKILL.md` maps DDL: `UNIQUE` → `uk`, a column without `NOT NULL` and not in the primary key → `nullable`. `model.md` documents both in one line each, to keep the skill's reading cost flat.

### 10. Role map for future types (added to `design.md`)

| Role | WBS | Gantt | Component diagram | UML class | ERD | BPMN |
|---|---|---|---|---|---|---|
| Header band (pale, left title, 34/24) | work package | | | class | table | pool |
| Zone | | | bounded context | package (optional) | schema area | (lanes keep `lane-head`) |
| Chip | code | | | stereotype | key | |
| Highlight | subtree | dependency chain, critical path | call path | association | relationship | sequence flow |
| Details table | work packages | tasks and dates | interfaces | | relationships | |

### 11. Testbed (unchanged)

| Case | Prompt in outline | Mechanical graders |
|---|---|---|
| easy | four entities (author, book, loan, member) from a short description; one HTML page `erd.html` | `erd.html` exists; each entity name present; Skill tool used (with-arm only) |
| medium | about eight entities from prose, two groups, optional relationships | `erd.html` exists; seven entity names present; Skill tool used |
| complex | the twelve-table `CREATE TABLE` script with UNIQUE and nullable columns, three areas, owned and referenced relationships | `erd.html` exists; twelve table names present; Skill tool used |

No model-judged grader. The cases already contain UNIQUE and nullable columns, so they exercise the new fields without changing a prompt.

## Risks / Trade-offs

- [ELK compound layout with fixed ports produces worse routes than today's flat layout] → the reviewer compares the complex case with the 0.1.0 render; if routes degrade, the ports fall back to free placement within the side (a renderer setting, no spec change).
- [System fonts differ across OSes, so text widths vary] → widths are measured at render time as today; the page uses no fixed text width.
- [Pale bands lower the band's visual weight in the alternate and project themes] → the treatment tokens let any theme return to solid bands; `alt.css` does exactly that.
- [The toggle loses the explicit "System" choice] → the user decided it; with no stored choice the page follows the system, and the theme's media-query block covers the no-script case.
- [Key chip colors from one mix cannot match the reference's light chips exactly] → tuned within contrast limits and shown to the user in the review renders.
- [Evaluation: a richer page costs the renderer, not the model, so tokens should hold; time may rise slightly from layout] → measured with three runs per case and arm; the user decides.

## Migration Plan

Pages are files: a 0.1.0 page keeps its look. Producing it again with 0.2.0 gives the new look from the same model, because the model change is additive. A project theme written for 0.1.0 lacks the new tokens and is rejected with the list of missing tokens (the existing project-theme requirement); the README explains how to add them. To roll back, reinstall 0.1.0.

## Open Questions

- The exact values of groups 4 and 5 and of the status colors in the default theme: picked by the builder within the contrast pairs and shown to the user in the review; they change no spec, approach or task.
