---
name: erd
description: "Draw an entity relationship diagram (ERD) as a self-contained HTML page with crow's foot notation, three levels of detail, a light/dark toggle and replaceable themes. Use when the user asks for an ERD, an entity relationship diagram, a data model diagram, a schema diagram or a database diagram, wants to see the tables of a database and how their foreign keys join them, or hands over SQL DDL (CREATE TABLE statements, a migration) or an ORM model to draw. Also use to change an ERD this skill produced earlier: add or rename an entity, change a relationship."
---

# ERD

You write a small JSON model; a script validates it, lays the diagram out and produces the page. Never write HTML, CSS, SVG, scripts, colors or coordinates yourself: they come from the plugin, and they are what makes the page match every other artifact of the plugin. The page lets the reader choose the level of detail (all columns, key columns, table names only) and hide referenced relationships, so never trim columns or relationships for an audience: when the user wants a lighter view, model everything the source holds and point them to those controls.

## Steps

1. **Check python3.** Run `python3 --version`. If it is missing, tell the user that `python3` is required to produce the page and stop: produce no partial page.
2. **Choose where to write.** If the user names a file or a folder, use it (a named file is the page; the model goes next to it). Otherwise write to `./erd/<name>.html` and `./erd/<name>.erd.json` in the working directory, with `<name>` taken from the subject (`order-schema`).
3. **Read the model format** in `${CLAUDE_PLUGIN_ROOT}/skills/erd/references/model.md`, once, before writing the model: it holds the fields, the cardinality values and a complete example, which this file does not repeat.
4. **Write the model** `<name>.erd.json`: the only file you write by hand.
   - From a description: entities with sensible columns and types, keys marked, every relationship with its cardinality at both ends.
   - From SQL DDL or an ORM model: every table is an entity, every column keeps its name and type, `PRIMARY KEY` columns get `pk`, foreign key columns get `fk`, a column with its own `UNIQUE` gets `uk`, a column without `NOT NULL` that is not in the primary key gets `nullable`, every foreign key is a relationship from the child (`from`, which holds the key) to the parent (`to`). A `NOT NULL` key gives `toCard` `1`, a nullable one `0..1`; a `UNIQUE` key gives `fromCard` `0..1`, otherwise `0..*`. Use `1..*` only when the user says "at least one".
   - Relationship kind: take it from the user's words (`order_line` owned by `order`; the rest referenced). When they say nothing, set `owned` when the child's primary key includes the joining foreign key, otherwise leave it out (it defaults to `referenced`).
   - Groups: only when the user names areas, subject areas or bounded contexts.
5. **Produce the page.** The theme is `default` unless the user names another (`alt`, or the path of their own theme file):
   ```
   python3 "${CLAUDE_PLUGIN_ROOT}/shared/scripts/artifact_page.py" --type erd --model <name>.erd.json --theme default --out <name>.html
   ```
   On success it prints the page path. On failure it writes nothing and lists every problem: fix the model and run it again. Never patch the page.
6. **Report** the page path and the model path, and say what was drawn in a sentence. The page loads its layout library from a CDN when opened (and the fonts of a theme that uses Google Fonts); offline it falls back to a simple grid, and says so. Publish it as an artifact only when the session can and the user wants it.

## Changing an existing diagram

When the user asks to change an ERD produced earlier, edit its `.erd.json` (keep everything they did not ask to change), run step 5 again, and report. Do not start from scratch. The file already shows the format, so read the model reference (step 3) only when the change needs a field the file does not use yet.
