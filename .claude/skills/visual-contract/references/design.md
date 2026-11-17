# The visual design

The look every artifact of the plugin shares. Decided on 2026-11-17 from three explored directions, then aligned the same day with the reference ERD page the user preferred: pale header bands on plain nodes, a tinted zone per group, colored key chips, grey ink and connectors on a cool grey ground, system fonts, rose for the element under discussion. The first design (navy ink, solid bands, a geometric display face) lives on as the alternate theme.

The palette, the fonts and the geometry are in the plugin's `shared/themes/default.css`, and only there. This file says what each token is for and how the roles are drawn.

## Contents

1. [Principle](#principle)
2. [Target medium](#target-medium)
3. [Roles and tokens](#roles-and-tokens)
4. [How a role is drawn](#how-a-role-is-drawn)
5. [Type](#type)
6. [Geometry](#geometry)
7. [Status marks](#status-marks)
8. [Notation shapes are fixed](#notation-shapes-are-fixed)
9. [The same roles in each artifact type](#the-same-roles-in-each-artifact-type)
10. [Making a theme](#making-a-theme)

## Principle

**Structure carries the meaning.** A header band names every node that has a name over content: a work package, a class, a table, a pool. The band is a tint of the node's group color with ink text, and the body under it stays plain. A reader who has learned one artifact type can read the next, because a WBS work package, a UML class and an ERD table are the same object.

Color has three jobs and no others. A **group** color says what a node belongs to (a workstream, a lane, a bounded context); a **zone** draws the same belonging as an area that contains the nodes of one group. The **mark** color says what is critical or under discussion: the critical path, a milestone, today, the element the viewer points at. A **key** color tells the kind of a small chip (primary, foreign, unique). Decoration gets no color.

## Target medium

Artifacts are built for Artifact pages first. The rules that follow from that medium:

- Every color is a token with a light and a dark value, in the shape of the theme files in `shared/themes/`: light on `:root`, dark under the system preference, dark again under an explicit choice. A value that is not a color (a length, a mix, an opacity) is one value for both modes. No component rule holds a literal color.
- The page sets `body { background: var(--canvas); color: var(--ink) }`. The host paints its own ground behind the page, so a transparent body shows the wrong theme.
- The page body never scrolls sideways. A drawing wider than the screen sits in its own `overflow-x: auto` frame and starts at its drawn size; only the viewer's own zoom scales it, and Fit is a button, never the starting state.
- Text in a drawing is 10.5px or larger at drawn size.
- A theme names system font stacks, or loads web fonts from Google Fonts only; every font token has a fallback stack. A theme with system fonts only makes no font request. No script library is needed to draw; shapes are inline SVG.
- The light/dark control is a two-state toggle labelled "Dark mode". With no stored choice it shows the viewer's system preference; turning it on or off sets `data-theme="dark"` or `data-theme="light"` on the root element. The theme files keep their system-preference block, so a page without script still follows the system. The toggle's track is `--grid` when off and `--accent` when on, its thumb is `--node` with a `--line` outline, and keyboard focus draws a 2px `--mark` ring offset 2px, so on, off and focused are told apart by position, by a color that reaches 3:1 against `--surface`, and by the ring.
- Under the drawing a page may carry two cards on `--surface` with a `--grid` border and `--panel-radius` corners: a legend card that explains every notation, line kind, chip and group the drawing uses, drawn with the same roles, and a details table that lists the drawing's connections, linked to the drawing by highlighting. Side by side above 900px, stacked below; the table scrolls inside its card.

## Roles and tokens

An artifact skill references these names and no others. A need that none of them covers is a missing role: add it here and to every theme, never to one skill.

| Token | Role |
|---|---|
| `--canvas` | The page ground. |
| `--surface` | The panels: the frame a drawing sits on, the page head, the cards, the ground of a zone before its tint. |
| `--node` | The body of a node. |
| `--ink` | Primary text. |
| `--ink-2` | Secondary text: sublabels, identifiers, multiplicities, edge labels. |
| `--line` | Connectors and neutral borders. |
| `--grid` | Gridlines and hairlines that organize but carry no meaning. |
| `--neutral` | The group color of a node that is outside every group of a diagram that has groups (an external system, a client, an ungrouped table). |
| `--accent` | The group color of a node when the diagram defines no groups; the toggle's on track. |
| `--mark` | Critical path, milestone, today, an emphasized edge, the highlighted element, the keyboard focus ring. One meaning per drawing. |
| `--band-ink` | Text on a header band: the ink color when bands are pale, an inverted color when they are solid. |
| `--status-done`, `--status-active`, `--status-risk`, `--status-late`, `--status-todo` | The five states of a work item. Always with their shape, never color alone. |
| `--group-1` … `--group-5` | Categorical groups, assigned in order of first appearance. More than five groups: reuse is not allowed; merge groups or split the drawing. |
| `--key-primary`, `--key-foreign`, `--key-unique` | The text of a key chip; its ground is the same color mixed into `--node`. A chip carries its color in `--k`, as a node carries its group in `--c`. |
| `--font-display`, `--font-body`, `--font-data` | Titles; labels; identifiers, numbers and code. |
| `--radius`, `--stroke`, `--arrowhead`, `--panel-radius`, `--zone-radius` | Node corners; line weight; arrowhead length (also the unit of a drawing's spacing); the frame around a drawing and the cards; the corners of a zone. |
| `--fill-mix`, `--stroke-mix`, `--band-mix`, `--bar-mix`, `--lane-mix` | How much of a node's group color goes into its body, outline, header band, the unfinished part of a schedule bar, and a lane header. |
| `--zone-mix`, `--chip-mix`, `--highlight-mix` | How much of a group color goes into its zone's ground; how much of a chip's color goes into its ground; how much of `--mark` goes into the ground of a highlighted row. |
| `--dim` | Opacity of the nodes and connectors that are not highlighted while one element is. |

## How a role is drawn

A shape names its role; the tokens decide how it looks. A node takes its group from a custom property set on it or on an ancestor: `--c: var(--group-2)`. With none set it falls back to `--accent`. A diagram that defines groups gives every node outside them `--neutral`, so an ungrouped node cannot be mistaken for the first group; a diagram that defines none draws every node in `--accent`.

These formulas are normative. They are what makes one theme file restyle every artifact:

```css
/* node body, outline, header band */
.node      { fill: color-mix(in oklab, var(--c, var(--accent)) var(--fill-mix), var(--node));
             stroke: color-mix(in oklab, var(--c, var(--accent)) var(--stroke-mix), var(--line));
             stroke-width: var(--stroke); }
/* the outline drawn again over a header band (no fill), and the line under the band */
.node-outline, .node-rule { fill: none;
             stroke: color-mix(in oklab, var(--c, var(--accent)) var(--stroke-mix), var(--line));
             stroke-width: var(--stroke); }
.band      { fill: color-mix(in oklab, var(--c, var(--accent)) var(--band-mix), var(--node)); }
.band-text { fill: var(--band-ink); }

/* a node outside every group of a diagram that has groups: the same node with a dashed outline */
.node.ungrouped, .node-outline.ungrouped { stroke-dasharray: 5 3; }

/* a row of a header-band node: a hairline above it, inset from the outline, and a ground that is
   tinted when the row is highlighted */
.row-sep   { stroke: var(--grid); stroke-width: 1px; }
.row-bg    { fill: transparent; }
.row.hl .row-bg { fill: color-mix(in oklab, var(--mark) var(--highlight-mix), var(--node)); }

/* zone: an area that holds the nodes of one group, with its label; its corners are --zone-radius,
   set on the shape by the primitive, as node corners are set from --radius */
.zone       { fill: color-mix(in oklab, var(--c, var(--accent)) var(--zone-mix), var(--surface));
              stroke: var(--c, var(--accent)); stroke-width: var(--stroke); }
.zone-label { fill: var(--c, var(--accent)); font: 700 12px var(--font-body);
              letter-spacing: .08em; text-transform: uppercase; }

/* chip: a small tinted label; --k is one of the key tokens */
.chip       { fill: color-mix(in oklab, var(--k) var(--chip-mix), var(--node)); }
.chip-text  { fill: var(--k); }

/* schedule bar: the unfinished part is a tint, the finished part is the full group color */
.bar       { fill: color-mix(in oklab, var(--c, var(--accent)) var(--bar-mix), var(--node));
             stroke: var(--c, var(--accent)); stroke-width: var(--stroke); }
.bar-done  { fill: var(--c, var(--accent)); }

/* lane header */
.lane-head { fill: color-mix(in oklab, var(--c, var(--accent)) var(--lane-mix), var(--node)); }

/* connector, and the emphasized variant */
.edge      { fill: none; stroke: var(--line); stroke-width: var(--stroke); }
.edge-head { fill: var(--line); }
.edge.mark { stroke: var(--mark); stroke-width: calc(var(--stroke) + 0.75px); }

/* connector, dashed variant: the same line with a longer dash pattern than a boundary's, for a
   weaker tie (an ERD referenced relationship); it combines with .mark */
.edge.dashed { stroke-dasharray: 7 5; }

/* notation marks at a connector's end (an ERD's bars, crow's foot and ring): the line role, with
   round caps; a hollow mark, here the ring, is filled with the node color, as the hollow UML triangle is */
.notation      { fill: none; stroke: var(--line); stroke-width: var(--stroke); stroke-linecap: round; }
.notation-ring { fill: var(--node); stroke: var(--line); stroke-width: var(--stroke); }

/* highlight: while the viewer points at an element, it and what it connects take the mark color,
   and everything else dims. The connector group carries .hl, so its line, its marks and its head
   all follow */
.hl .node-outline, .edge-group.hl .edge, .edge-group.hl .notation, .edge-group.hl .notation-ring
               { stroke: var(--mark); stroke-width: calc(var(--stroke) + 0.75px); }
.edge-group.hl .edge-head { fill: var(--mark); }
.hovering .edge-group:not(.hl), .hovering .edge-label:not(.hl), .hovering .node-group:not(.hl)
               { opacity: var(--dim); }

/* a boundary around nodes that belong together */
.boundary  { fill: color-mix(in oklab, var(--ink) 3%, var(--surface));
             stroke: var(--line); stroke-width: var(--stroke); stroke-dasharray: 5 4; }

/* status mark: --s is one of the five status tokens */
.status      { fill: var(--s); }
.status-open { fill: var(--node); stroke: var(--s); stroke-width: 1.5px; }

/* a label that crosses lines keeps a halo of the surface behind it */
.edge-label { fill: var(--ink-2); paint-order: stroke; stroke: var(--surface); stroke-width: 3px; }
```

A node with a header band is drawn in this order: body, band (rounded on its top corners only), the line under the band, then the outline again with no fill, so the outline stays crisp over the band. The text on the band is left-aligned and centered vertically.

Every header-band node has the same proportions, whatever the artifact type: a band 34px high, body rows 24px high, the title 12px from the left edge, chips and row hairlines 8px from it, row content 10px from each side, 4px under the last row. A chip is 16px high. The shared header-band primitive owns these sizes; an artifact skill places its rows with it and never sets its own.

A zone has room for its label above its nodes and an even padding at the other sides; the nodes of its group lie inside it and no other node does. The shared zone primitive owns the label's place.

## Type

| Use | Face | Size and weight |
|---|---|---|
| Page and figure titles | `--font-display` | 600 |
| Node label | `--font-body` | 12px, 500; a name over a sublabel is 600 |
| Label in a small node | `--font-body` | 11.5px, 500 |
| Sublabel, edge label, legend | `--font-body` | 10.5px, 400 to 500 |
| Text on a header band | `--font-body` | 13px, 700 |
| Table column, class member name | `--font-body` | 12px, 400; a primary key 600 |
| Column type, identifier, code, effort, multiplicity, week label | `--font-data` | 11px, 400, tabular numerals, `--ink-2` |
| Chip | `--font-body` | 10.5px, 700, letter-spacing 0.03em |
| Nullable marker | `--font-data` | 10.5px, italic, `--ink-2` |
| Zone label | `--font-body` | 12px, 700, uppercase, letter-spacing 0.08em |

An abstract class name is italic. Nothing is smaller than 10.5px. The default theme names system font stacks and loads nothing; the alternate theme loads Space Grotesk and Inter from Google Fonts.

## Geometry

- Node corners are `--radius`. A schedule bar uses the smaller of `--radius` and 7px; a chip and a legend swatch the smaller of `--radius` and 4px. A zone's corners are `--zone-radius`.
- Lines are `--stroke`. An emphasized line adds 0.75px.
- Connectors are orthogonal: horizontal and vertical runs with square turns. They end in a filled head `--arrowhead` long and 0.9 times that wide, following the last segment.
- Shapes sit on a grid: shared baselines, even gaps. A connector label sits above the run it names, centered.
- The frame around a drawing, and each card under it, have `--panel-radius` corners and a `--grid` border on `--surface`.

## Status marks

The state is in the shape as well as in the color, so it survives a grayscale print and a color-blind reader.

| State | Shape | Token |
|---|---|---|
| Done | filled disc | `--status-done` |
| In progress | ring, right half filled | `--status-active` |
| At risk | filled triangle, point up | `--status-risk` |
| Late | filled square | `--status-late` |
| Not started | empty ring | `--status-todo` |

A status mark is about 9px across. A legend lists the five whenever status marks appear.

## Notation shapes are fixed

A design sets stroke, fill and type. It never changes a shape that a notation defines.

- **BPMN**: an event is a circle (an end event's line is 2.6 times `--stroke`); a task is a rectangle with rounded corners, at least 6px whatever `--radius` is; a gateway is a diamond, with its marker inside.
- **UML**: composition is a filled diamond at the owner; generalization is a hollow triangle at the parent; a navigable association ends in the standard arrowhead.
- **ERD**: information engineering marks at each end of a relationship: a bar for one, a crow's foot for many, a ring for zero. The four cardinalities are two bars (`1`), ring and bar (`0..1`), bar and crow's foot (`1..*`), ring and crow's foot (`0..*`); the ring sits farthest from the table, the crow's foot nearest to it, and in `1..*` the bar sits outside the foot. A relationship is of one of two kinds: owned (identifying: the child exists only as part of the parent) is drawn solid, referenced (non-identifying: the child only points to the parent) is drawn dashed, in the `.edge.dashed` variant. A self-relationship is a loop on the table's right side. When a relationship names its joining columns, its ends sit inside those rows; ends that share a row are spread within it, at least a bar and its caps apart, and a row with more ends than one side can separate sends the extras to the other side of the table. An end of a relationship without joining columns sits on the straight part of a side, clear of the corner radius by the mark's reach. The grid fallback, used when the layout library is unavailable, spreads ends along the side instead. A connector runs straight out of a table for at least the length of the longest mark set, and two tables that face each other leave room for the marks of both ends and a visible run. Keys are chips in the order primary, foreign, unique; a nullable column shows the nullable marker before its type.

## The same roles in each artifact type

This is the coherence map. A new artifact type gets a column here before it gets a skill.

| Role | WBS | Gantt | Component diagram | UML class | ERD | BPMN |
|---|---|---|---|---|---|---|
| Node with header band (pale band, left title, 34 high, rows 24) | work package: title in the band, code and effort in the body | | | class: name in the band, members below | table: name in the band, columns below | pool: name in the band |
| Plain node | task: code, title, status mark | | component, store, queue | | | task, event, gateway |
| Group color | workstream | workstream, on the bar | bounded context: a service and its store | none set: accent | schema area (a bounded context); a table outside every group: neutral with a dashed outline; no groups defined: accent | lane (a lane keeps `lane-head`) |
| Zone | | | bounded context | package, when used | schema area: the tables of one group | |
| Chip | code | | | stereotype | key: PK, FK, UK | |
| Mark | | critical path, milestone, today | the edge under discussion | | | |
| Highlight | subtree | dependency chain, critical path | call path | association | relationship: connector, both tables and joining rows | sequence flow |
| Details table | work packages | tasks and dates | interfaces | | relationships: child, parent, kind, cardinality in words | |
| Status mark | on each task | beside each task name | | | | |
| Data face | codes, effort | week labels | | types of members, multiplicities | column types | |
| Connector | tree lines, no head | dependency, with head | call or data flow, with head and label | association, with notation ends | relation, with notation ends | sequence flow, with head |

## Making a theme

Copy `shared/themes/default.css`, change values, keep every token. Nothing outside the file changes. `shared/themes/alt.css` is a second complete theme kept for checking exactly that: it differs from the default in every group of tokens (surfaces, ink, emphasis, status, groups, keys, fonts, geometry, treatment).

The treatment tokens change the character of a theme more than the palette does:

| Character | `--fill-mix` | `--stroke-mix` | `--band-mix` |
|---|---|---|---|
| Pale bands on plain bodies (the default) | 0% | 100% | 20% |
| Solid bands (`alt.css`) | 5% | 65% | 100% |
| Tinted fills | 13% | 100% | 27% |
| Outlines only | 0% | 100% | 9% |

`--band-ink` follows `--band-mix`: with solid bands it inverts against the group colors; with pale bands it equals `--ink`.

A project theme may name system font stacks only, or load web fonts from Google Fonts; either way each font token ends in a generic family.

A theme is acceptable when these pairs reach their contrast ratio in light and in dark:

- 4.5:1: `--ink` and `--ink-2` on `--canvas`, on `--surface`, on `--node`, and on a node body and a lane header of every group color; `--band-ink` on a header band of every group color, of `--neutral` and of `--accent`; `--mark` on `--surface`; each key color on its chip ground (the key color mixed at `--chip-mix` into `--node`); each group color, as a zone label, on its zone ground (at `--zone-mix` into `--surface`); `--ink` and `--ink-2` on a highlighted row (`--mark` at `--highlight-mix` into `--node`).
- 3:1: `--line` on `--surface`, which is also the toggle's outline and its thumb's; every status token on `--node`; every group color, and its outline mix, on `--surface`; the accent outline mix (`color-mix` of `--accent` at `--stroke-mix` with `--line`) on `--surface`; `--accent` on `--surface`, the toggle's on track.
