# The visual design

The look every artifact of the plugin shares. Decided on 2026-11-17 from three explored directions: the structure of the third (header bands), the type of the second (a geometric display face over a plain sans), the palette of the first (navy ink on cool paper, one orange mark).

The palette, the fonts and the geometry are in `default-theme.css`, next to this file, and only there. This file says what each token is for and how the roles are drawn.

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

**Structure carries the meaning.** A solid header band names every node that has a name over content: a work package, a class, a table, a pool. The body under it stays plain. A reader who has learned one artifact type can read the next, because a WBS work package, a UML class and an ERD table are the same object.

Color has two jobs and no others. A **group** color says what a node belongs to (a workstream, a lane, a bounded context). The **mark** color says what is critical: the critical path, a milestone, today, the edge under discussion. Decoration gets no color.

## Target medium

Artifacts are built for Artifact pages first. The rules that follow from that medium:

- Every color is a token with a light and a dark value, in the shape of `default-theme.css`: light on `:root`, dark under the system preference, dark again under an explicit choice. No component rule holds a literal color.
- The page sets `body { background: var(--canvas); color: var(--ink) }`. The host paints its own ground behind the page, so a transparent body shows the wrong theme.
- The page body never scrolls sideways. A drawing wider than the screen sits in its own `overflow-x: auto` frame; it is not scaled down until its text is unreadable.
- Text in a drawing is 10.5px or larger at drawn size.
- Fonts load from Google Fonts only, each with a fallback stack. No script library is needed to draw; shapes are inline SVG.
- The light/dark switch sets `data-theme="light"` or `data-theme="dark"` on the root element, or removes the attribute to follow the system.

## Roles and tokens

An artifact skill references these names and no others. A need that none of them covers is a missing role: add it here and to every theme, never to one skill.

| Token | Role |
|---|---|
| `--canvas` | The page ground. |
| `--surface` | The panel a drawing sits on. |
| `--node` | The body of a node. |
| `--ink` | Primary text. |
| `--ink-2` | Secondary text: sublabels, identifiers, multiplicities, edge labels. |
| `--line` | Connectors and neutral borders. |
| `--grid` | Gridlines and hairlines that organize but carry no meaning. |
| `--neutral` | The group color of a node that is outside every group (an external system, a client). |
| `--accent` | The group color of a node when no group is set. |
| `--mark` | Critical path, milestone, today, an emphasized edge. One meaning per drawing. |
| `--band-ink` | Text on a header band. |
| `--status-done`, `--status-active`, `--status-risk`, `--status-late`, `--status-todo` | The five states of a work item. Always with their shape, never color alone. |
| `--group-1` … `--group-5` | Categorical groups, assigned in order of first appearance. More than five groups: reuse is not allowed; merge groups or split the drawing. |
| `--font-display`, `--font-body`, `--font-data` | Titles; labels; identifiers, numbers and code. |
| `--radius`, `--stroke`, `--arrowhead`, `--panel-radius` | Node corners; line weight; arrowhead length; the frame around a drawing. |
| `--fill-mix`, `--stroke-mix`, `--band-mix`, `--bar-mix`, `--lane-mix` | How much of a node's group color goes into its body, outline, header band, the unfinished part of a schedule bar, and a lane header. |

## How a role is drawn

A shape names its role; the tokens decide how it looks. A node takes its group from a custom property set on it or on an ancestor: `--c: var(--group-2)`. With none set it falls back to `--accent`.

These formulas are normative. They are what makes one theme file restyle every artifact:

```css
/* node body, outline, header band */
.node      { fill: color-mix(in oklab, var(--c, var(--accent)) var(--fill-mix), var(--node));
             stroke: color-mix(in oklab, var(--c, var(--accent)) var(--stroke-mix), var(--line));
             stroke-width: var(--stroke); }
.band      { fill: color-mix(in oklab, var(--c, var(--accent)) var(--band-mix), var(--node)); }
.band-text { fill: var(--band-ink); }

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

/* a boundary around nodes that belong together */
.boundary  { fill: color-mix(in oklab, var(--ink) 3%, var(--surface));
             stroke: var(--line); stroke-width: var(--stroke); stroke-dasharray: 5 4; }

/* status mark: --s is one of the five status tokens */
.status      { fill: var(--s); }
.status-open { fill: var(--node); stroke: var(--s); stroke-width: 1.5px; }

/* a label that crosses lines keeps a halo of the surface behind it */
.edge-label { fill: var(--ink-2); paint-order: stroke; stroke: var(--surface); stroke-width: 3px; }
```

A node with a header band is drawn in this order: body, band (rounded on its top corners only), the line under the band, then the outline again with no fill, so the outline stays crisp over the band.

## Type

| Use | Face | Size and weight |
|---|---|---|
| Page and figure titles | `--font-display` | 600 |
| Node label | `--font-body` | 12px, 500; a name over a sublabel is 600 |
| Label in a small node | `--font-body` | 11.5px, 500 |
| Sublabel, edge label, legend | `--font-body` | 10.5px, 400 to 500 |
| Text on a header band | `--font-body` | 12px, 600 |
| Identifier, code, effort, multiplicity, week label | `--font-data` | 10.5px, 500, tabular numerals |
| Class member, table column | `--font-data` | 11px, 400; a primary key is 600 |

An abstract class name is italic. Nothing is smaller than 10.5px. The default theme loads Space Grotesk (500, 600) and Inter (400, 500, 600, and 600 italic) from Google Fonts.

## Geometry

- Node corners are `--radius`. A schedule bar uses the smaller of `--radius` and 7px; a legend chip the smaller of `--radius` and 5px.
- Lines are `--stroke`. An emphasized line adds 0.75px.
- Connectors are orthogonal: horizontal and vertical runs with square turns. They end in a filled head `--arrowhead` long and 0.9 times that wide, following the last segment.
- Shapes sit on a grid: shared baselines, even gaps. A connector label sits above the run it names, centered.
- The frame around a drawing has `--panel-radius` corners and a `--grid` border on `--surface`.

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
- **ERD**: crow's foot for many, two short ticks for one.

## The same roles in each artifact type

This is the coherence map. A new artifact type gets a column here before it gets a skill.

| Role | WBS | Gantt | Component diagram | UML class | ERD | BPMN |
|---|---|---|---|---|---|---|
| Node with header band | work package: code and effort in the band, title in the body | | | class: name in the band, members below | table: name in the band, columns below | pool: name in the band |
| Plain node | task: code, title, status mark | | component, store, queue | | | task, event, gateway |
| Group color | workstream | workstream, on the bar | bounded context: a service and its store | none set: accent | none set: accent | lane |
| Mark | | critical path, milestone, today | the edge under discussion | | | |
| Status mark | on each task | beside each task name | | | | |
| Data face | codes, effort | week labels | | members, multiplicities | keys, columns, types | |
| Connector | tree lines, no head | dependency, with head | call or data flow, with head and label | association, with notation ends | relation, with notation ends | sequence flow, with head |

## Making a theme

Copy `default-theme.css`, change values, keep every token. Nothing outside the file changes. `alt-theme.css` is a second complete theme kept for checking exactly that: it differs from the default in every group of tokens.

The treatment tokens change the character of a theme more than the palette does:

| Character | `--fill-mix` | `--stroke-mix` | `--band-mix` |
|---|---|---|---|
| Header bands (the default) | 5% | 65% | 100% |
| Tinted fills (`alt-theme.css`) | 13% | 100% | 27% |
| Outlines only | 0% | 100% | 9% |

`--band-ink` follows `--band-mix`: with solid bands it inverts against the group colors; with faint bands it equals `--ink`.

A theme is acceptable when these pairs reach their contrast ratio in light and in dark:

- 4.5:1: `--ink` and `--ink-2` on `--canvas`, on `--surface`, on `--node`, and on a node body and a lane header of every group color; `--band-ink` on a header band of every group color and of `--accent`; `--mark` on `--surface`.
- 3:1: `--line` on `--surface`; every status token on `--node`; every group color, and its outline mix, on `--surface`.
