# Design

## Context

See proposal.md for the motivation. The repository holds only the development harness and the decided visual design: the role vocabulary and drawing formulas in `.claude/skills/visual-contract/references/design.md`, the theme values in `default-theme.css` and `alt-theme.css` beside it. Nothing of the plugin exists yet.

Constraints that shape every decision below:

- **Artifact pages** are the primary medium. External scripts load only from allowed CDNs, pinned to an exact version; stylesheets only from Google Fonts; everything else is inlined.
- **Cost of production** is a product goal, now measured (`skill-evaluation`). Whatever the model has to write per artifact is the cost; whatever the plugin brings ready-made is free.
- **Generic use**: the plugin runs on machines it knows nothing about.

## Goals / Non-Goals

**Goals:**

- One path from request to page that later artifact types reuse unchanged: themes, page shell, switch, drawing primitives, assembler, evaluation.
- The model writes a small JSON model, never markup or coordinates.
- A measured, repeatable answer to "does this skill pay for itself?".

**Non-Goals:**

- Edges attached to individual column rows. Relationships attach to table sides in this change.
- Pixel-level checks in the structural tests. Rendering stays with the visual-reviewer.
- An automated judgement of quality. The evaluation measures and checks mechanically; a person judges quality and decides adoption.

## Decisions

### D1. Plugin layout

```
.claude-plugin/plugin.json, marketplace.json
shared/themes/default.css, alt.css          style source (D2)
shared/page/shell.html, page.css, core.js   page shell, switch, primitives (D4)
shared/scripts/artifact_page.py             assembler (D3)
skills/erd/SKILL.md                         the ERD skill
skills/erd/references/model.md              the ERD model format
skills/erd/scripts/erd_model.py             ERD validation
skills/erd/assets/erd.js                    ERD renderer
tests/                                      structural tests (D10), not shipped
evals/                                      testbeds and KPI tooling (D8), not shipped
```

`shared/` is the reuse boundary: a second artifact type adds a folder under `skills/` with its own model, validator and renderer, and touches nothing in `shared/` unless it needs a new primitive. `plugin.json` sets `experimental.evals` to `evals`.

### D2. Style source: theme files that also carry their fonts

The plugin's `shared/themes/<name>.css` become the single home of all values. `default.css` takes the values of the current `default-theme.css`, `alt.css` those of `alt-theme.css`, except its fonts, which become Fraunces, DM Sans and IBM Plex Mono so the alternate theme differs from the default in every token group, fonts included (confirmed by the user); both harness copies are deleted and `visual-contract` points to the plugin files. `design.md` stays in the harness: it defines the vocabulary and the formulas, not values.

Each theme opens with an `@import` of the Google Fonts stylesheet it needs, so fonts change with the theme and nothing else (VC-4).

- *Alternative: fonts declared by the page shell.* Rejected: a theme with other fonts would need a shell edit.
- *Alternative: a theme as JSON, compiled to CSS.* Rejected for now: one more step and one more format, for no gain while themes are hand-written.

The token set is defined by `default.css`. A test compares it with the vocabulary table in `design.md`, so the two cannot drift.

### D3. Assembler in python3, standard library only

`artifact_page.py --type erd --model <file> --theme <name|path> --out <file>` loads the type's validator, validates the model, checks the theme against the default's token set, and writes one HTML file. It prints the output path on success; on failure it writes nothing and prints every error.

- *Alternative: the model writes the HTML.* Rejected: the renderer and theme would be re-emitted on every request, which is the cost the skill exists to remove.
- *Alternative: node.* Not guaranteed: the native Claude Code installer does not need it.
- *Alternative: POSIX shell.* Concatenation is easy, but JSON validation is not without jq, which is not guaranteed either.

`python3` is present on most developer machines. The skill checks it first and stops with a clear message when it is missing.

### D4. Page shell and drawing primitives

The page is assembled in a fixed order: theme `<style>` first (an `@import` must open its stylesheet), page `<style>`, `core.js`, the type renderer, then the model as `<script type="application/json">`. `page.css` implements the design's drawing formulas as role classes, using tokens only.

`core.js` holds what every type needs:

- the System / Light / Dark switch, setting or removing `data-theme`, remembered in `localStorage` inside `try`;
- text measurement once `document.fonts.ready` resolves, capped by a timeout so missing fonts never block drawing;
- primitives: header-band node, plain node, orthogonal edge with head, status mark, label with halo;
- the error and notice areas required by `artifact-page`.

The page is static HTML plus these scripts: it renders the same opened from disk, published as an artifact, or shown in a browser.

### D5. Layout with ELK in the page

The ERD renderer measures each table from its text, then lays out with elkjs: algorithm `layered`, edge routing `ORTHOGONAL`, spacing from the theme's geometry. It is loaded from `cdn.jsdelivr.net/npm/elkjs@<exact>/lib/elk.bundled.js`; the version is pinned at implementation from the 0.11 line, checked to be published more than two weeks earlier. When ELK cannot load, a fallback places tables in a grid and routes edges with simple orthogonal paths, with a notice.

- *Alternative: the model computes positions.* Rejected: many output tokens, and overlaps the model cannot see.
- *Alternative: Mermaid, which Artifact pages render natively.* Rejected: its theming cannot carry the design's formulas, the switch, or the header-band node.
- *Alternative: PlantUML.* Rejected: static images with baked colors cannot follow the switch. Its relationship with this plugin stays out of scope.
- *Alternative: dagre.* Rejected: no maintained orthogonal routing.

Layout at view time means the page needs the network once. That is acceptable for Artifact pages; the fallback covers offline viewing.

### D6. ERD model and notation

The model format, in `skills/erd/references/model.md`, holds:

```json
{
  "title": "Order schema",
  "description": "optional",
  "groups": [{ "id": "sales", "label": "Sales" }],
  "entities": [
    { "name": "order", "group": "sales",
      "columns": [{ "name": "id", "type": "uuid", "pk": true },
                  { "name": "customer_id", "type": "uuid", "fk": true }] }
  ],
  "relationships": [
    { "from": "order", "to": "customer", "fromCard": "0..*", "toCard": "1",
      "kind": "referenced", "columns": ["customer_id", "id"], "label": "placed by" }
  ]
}
```

Cardinality ends use information engineering marks: bar for one, crow's foot for many, ring for zero. `1` is two bars, `0..1` a ring and a bar, `1..*` a bar and a crow's foot, `0..*` a ring and a crow's foot. This adds the ring to the ERD line of `design.md`'s fixed notation shapes, which the user approves with this proposal. A self-relationship is drawn as a loop on the table's right side.

Each relationship has a `kind`, chosen by the user or inferred by the skill, default `referenced`:

- `owned` (identifying): the child exists only as part of the parent and its primary key includes the joining foreign key. Solid connector.
- `referenced` (non-identifying): the child only points to the parent. Dashed connector, with the dash pattern the design already uses for boundaries (`5 4`).

Both additions, the ring and the two line kinds, go into the ERD line of `design.md`'s fixed notation shapes, and the dashed connector becomes a named variant of the connector formula there; both were approved with this proposal. No token changes.

Band color: the entity's group role; when the model has groups, an ungrouped entity takes the neutral role, because in the default dark theme the accent and the first group are too close to tell apart; when the model has no groups, every band takes the accent role. Decided by the user after the first visual review.

### D7. The ERD skill

`SKILL.md` stays short. It covers:

- check `python3`;
- choose the output folder: the one the user names, else `./erd/` in the working directory;
- write or edit `<name>.erd.json` only;
- run the assembler with the default theme unless the user names another;
- report the page path, and publish it as an artifact when the session can and the user wants.

Its description triggers on ERD, entity relationship diagram, data model, schema diagram, and on SQL DDL handed over for drawing. The model format is read from `references/` only when the skill fires.

### D8. Evaluation on top of `claude plugin eval`

`claude plugin eval` already provides what the method needs and is hard to rebuild:

- a no-plugin baseline arm;
- an isolated temporary home, working folder and configuration per run;
- graders (`file_exists`, `regex` on file contents, `llm`, and `tool_used` as a with-only check that the skill fired);
- a pinned model and repetitions.

What it does not report is time and tokens per arm. Each run's trace does, in its final `result` record: `duration_ms`, `usage` and `modelUsage` per model, `total_cost_usd`, `num_turns`. The traces survive only with `--keep-temp`.

So the evaluation is:

- **`evals/<skill>/<case>/prompt.md` + `graders/*.md`**: the testbed, in the eval command's own layout. Every case is tagged with its skill's name. Every prompt names a self-contained HTML deliverable and its file name, and never mentions the plugin.
- **`evals/run.sh <skill> [--model <id>] [--effort <level>] [--runs N] [-j N]`**: runs `claude plugin eval . --tag <skill> --model <id> --keep-temp --no-publish --json <raw> --allow-tools Bash Write Edit`, with no cost ceiling, then `evals/kpi.py`. It never publishes reports. The effort is passed to the child sessions by the mechanism task 3.5 finds; if none exists, the report says the effort was not pinned.
- **`evals/kpi.py`**: reads the aggregate JSON and each run's trace and computes the KPIs, the cost and the mechanical checks of `skill-evaluation`, then the classification. It copies every deliverable to `evals/results/<run-id>/<case>/<arm>-<n>/` for the person's review, deletes the temporary folders it read, writes `report.json` and `report.md` beside them, and appends a sanitized entry to `evals/<skill>/RESULTS.md` (committed) with an empty decision line for the person to fill. Everything under `evals/results/` is ignored. A trace without the expected fields stops it with an error naming the field, because the trace format is not a documented contract.
- **Deterministic report**: `kpi.py` computes only from the recorded runs, sorts cases, arms and runs by name, rounds with fixed rules, and puts the date only in the RESULTS.md entry, so the same runs always give the same `report.json` and `report.md`. No model judges anything.
- **Defaults**: model `claude-opus-5-5`, effort `medium`, three runs per arm (the final ERD evaluation uses five, because the baseline showed up to 30% run-to-run spread per case), concurrency 2, targets 20% tokens and 20% time. A suite's KPI is the sum over cases of each arm's median.

ERD testbed, three cases:

| Case | Asks for |
|---|---|
| `erd/easy` | 4 entities from a short description |
| `erd/medium` | about 8 entities from a longer description, with two groups and optional relationships |
| `erd/complex` | the diagram of a `CREATE TABLE` script of about 12 tables, with composite keys, the cardinalities a script can express (`1`, `0..1`, `0..*`; `1..*` is covered by the structural fixtures), a self-relationship, three groups, and relationships the prompt names as owned or referenced |

Each case's graders are mechanical: the HTML file exists; a regex per expected entity name on its contents; and, plugin arm only, `tool_used: Skill`. No `llm` grader: quality is judged by a person from the kept deliverables, and looks stay with the visual-reviewer.

- *Alternative: a custom runner over `claude -p`.* Rejected: it would have to rebuild the isolation and grading.
- *Alternative: measuring inside the current session with subagents.* Rejected: the session's context and instructions leak into both arms.

### D9. Evaluation inside the OpenSpec workflow

**Rules in `openspec/config.yaml`.** A proposal that adds or changes an artifact skill gets an "Effectiveness" section: the testbed cases (easy, medium, complex) and the targets, the defaults or stricter ones. Its design lists cases and graders. Its tasks:

- write the testbed and run it once before the skill exists, to record the baseline and check the cases are fair;
- end with an evaluation task after the visual-reviewer task;
- archive only after the person's recorded `adopt` decision on the final evaluation.

**Harness skill `skill-eval`.** It holds the method: how to write fair cases and mechanical graders, how to read the report, how to review the kept deliverables, how to record the decision. It points to `evals/run.sh` for the mechanics instead of repeating them.

**Orchestrator Phase 3b, evaluate.** It runs after a `pass` from the visual review, with no cost confirmation:

1. Run `evals/run.sh`.
2. Give the user the report: classification, KPI table, cost, flagged runs, and the paths of the deliverables to compare.
3. Ask for the decision and record it in `RESULTS.md`:
   - `adopt`: go to Phase 4;
   - `rework`: a builder fix round with the report and the user's notes as input, within the same two-round cap as the review, then evaluate again;
   - `reject`: stop; no archive.
4. An `incomplete` report is re-run once; if it is still incomplete, the user is told which runs failed.

No new agent: the numbers come from the script and the judgement from the user.

### D10. Structural tests

`tests/run-structural-tests.sh` runs:

- `validate-manifests.sh`: manifest validity and version sync, with jq;
- `validate-themes.sh`: same token set in every theme and every block, identical dark blocks, vocabulary equal to the default;
- `validate-style-source.sh`: no color literal or font family outside `shared/themes/`, ignoring sample data models; no plugin file referencing harness paths;
- `test-assembler.sh`: pages built from valid ERD fixtures under every theme; every invalid fixture rejected with its expected message; external script URLs pinned.

Each script prints `file: problem` per failure. `claude plugin validate --strict` runs too when `claude` is on `PATH`, on a temporary copy of the plugin without the development files: at the repository root the development `CLAUDE.md` makes strict validation fail, as in the reference repository.

### D11. Capabilities and performance in the documentation

Documenting what a skill does and what it saves is the last step of its delivery, required by the user.

- **Where:** each skill's documentation is `skills/<skill>/README.md`: what the skill produces, the inputs it accepts, the options, an example, and the Performance section. Not `SKILL.md`: that file is loaded into the model's context every time the skill fires, so performance tables there would cost tokens on every use.
- **Data:** when an evaluation runs, `kpi.py` also writes a sanitized machine-readable summary, `evals/<skill>/runs/<run-id>.json` (committed, no paths or names). The adopted evaluation is the newest RESULTS.md entry whose decision is `adopt`; its summary JSON is the single source for the documentation.
- **Generator:** `python3 evals/kpi.py doc [<skill>]` renders the Performance section from that JSON with a fixed template and writes it between `<!-- performance:start -->` and `<!-- performance:end -->` in the skill's README, and the skills table between `<!-- skills:start -->` and `<!-- skills:end -->` in the root README, one row per skill with an adopted evaluation, sorted by name. The capability summary of each row comes from a `summary:` line in the skill README's front block.
- **Check:** `tests/test-docs.sh` regenerates both blocks with `--check` and fails, naming the file, when they are missing or differ.

- *Alternative: hand-written sections.* Rejected: the format would drift between skills.
- *Alternative: generate from RESULTS.md.* Rejected: parsing Markdown tables is fragile; the JSON is written by the same code that computes the numbers.

## Risks / Trade-offs

- **The eval sandbox blocks `python3` or Bash** → the plugin arm cannot assemble. The baseline task runs one plugin-arm case early, to find out before the skill is finished; `--allow-tools Bash Write Edit` is the documented grant.
- **Trace fields change between Claude Code versions** → `kpi.py` fails loudly naming the missing field; every summary records the Claude Code version.
- **`claude plugin eval` has no effort option** → task 3.5 looks for a way to pass `medium` to the child sessions; if there is none, both arms run at the same default effort, so the comparison stays fair, and the report says the effort was not pinned. The model, effort and Claude Code version are recorded with each result.
- **Variance between runs** → three runs per arm, medians, min and max reported; a borderline result goes to the person, who may ask for a re-run.
- **Evaluation cost** → not capped, as decided by the user; measured and reported per run and in total. One evaluation is 3 cases × 2 arms × 3 runs = 18 sessions on Opus; only the skill under change is evaluated.
- **Mechanical checks see only text** → they prove the deliverable exists and names the entities; the person judges correctness and the visual-reviewer judges looks.
- **ELK on the CDN is unreachable** → grid fallback with a notice, as `artifact-page` requires.
- **Fonts load late and text is mismeasured** → measure after `document.fonts.ready`, with a timeout, and re-lay out once if the fonts arrive after the first drawing.

## Migration Plan

Greenfield. In the same change:

- move the theme values from `.claude/skills/visual-contract/references/` into `shared/themes/`, delete the harness copies and point `visual-contract` at the plugin files;
- add `evals/results/` to `.gitignore`.

Rollback is reverting the branch.
