---
name: erd
description: "Draw an entity relationship diagram (ERD) as a self-contained HTML page with crow's foot notation, a light/dark switch and replaceable themes. Use when the user asks for an ERD, an entity relationship diagram, a data model diagram, a schema diagram or a database diagram, or hands over SQL DDL (CREATE TABLE statements) or an ORM model to draw. Also use to change an ERD this skill produced earlier: add or rename an entity, change a relationship."
---

# ERD

You write a small JSON model; a script validates it, lays the diagram out and produces the page. Never write HTML, CSS, SVG, scripts, colors or coordinates yourself: they come from the plugin, and they are what makes the page match every other artifact of the plugin.

## Steps

1. **Check python3.** Run `python3 --version`. If it is missing, tell the user that `python3` is required to produce the page and stop: produce no partial page.
2. **Choose where to write.** If the user names a file or a folder, use it (a named file is the page; the model goes next to it). Otherwise write to `./erd/<name>.html` and `./erd/<name>.erd.json` in the working directory, with `<name>` taken from the subject (`order-schema`).
3. **Read the model format** in `${CLAUDE_PLUGIN_ROOT}/skills/erd/references/model.md`, once.
4. **Write the model** `<name>.erd.json`: the only file you write by hand.
   - From a description: entities with sensible columns and types, keys marked, every relationship with its cardinality at both ends.
   - From SQL DDL or an ORM model: every table is an entity, every column keeps its name and type, `PRIMARY KEY` columns get `pk`, foreign key columns get `fk`, every foreign key is a relationship from the child (`from`, which holds the key) to the parent (`to`). A `NOT NULL` key gives `toCard` `1`, a nullable one `0..1`; a `UNIQUE` key gives `fromCard` `0..1`, otherwise `0..*`. Use `1..*` only when the user says "at least one".
   - Relationship kind: take it from the user's words (`order_line` owned by `order`; the rest referenced). When they say nothing, set `owned` when the child's primary key includes the joining foreign key, otherwise leave it out (it defaults to `referenced`).
   - Groups: only when the user names areas or contexts, at most five.
5. **Produce the page.** The theme is `default` unless the user names another (`alt`, or the path of their own theme file):
   ```
   python3 "${CLAUDE_PLUGIN_ROOT}/shared/scripts/artifact_page.py" --type erd --model <name>.erd.json --theme default --out <name>.html
   ```
   On success it prints the page path. On failure it writes nothing and lists every problem: fix the model and run it again. Never patch the page.
6. **Report** the page path and the model path, and say what was drawn in a sentence. The page loads its fonts and layout library from a CDN when opened; offline it falls back to system fonts and a simple grid, and says so. Publish it as an artifact only when the session can and the user wants it.

## Changing an existing diagram

When the user asks to change an ERD produced earlier, edit its `.erd.json` (keep everything they did not ask to change), run step 5 again, and report. Do not start from scratch.
