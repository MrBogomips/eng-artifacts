---
name: uml-object-diagram
description: "Draw a UML object diagram (instance diagram) as a self-contained HTML page: named and anonymous instances with their slot values, enumeration literals, the links between them, packages, two levels of detail, a light/dark toggle and replaceable themes. Use when the user asks for an object diagram or an instance diagram, a snapshot of objects at one moment, or wants example data, test data or fixtures (records, rows, JSON) drawn as the objects they make up and how they refer to each other. Also use to change an object diagram this skill produced earlier: add an instance, change a slot or a link. For the classes themselves use the class diagram skill."
---

# UML object diagram

You write a small JSON model; a script validates it, lays the diagram out and produces the page. Never write HTML, CSS, SVG, scripts, colors or coordinates yourself: they come from the plugin, and they are what makes the page match every other artifact of the plugin. The page lets the reader choose the level of detail (all slots, object names only), so never trim slots or links for an audience.

## Steps

1. **Check python3.** Run `python3 --version`. If it is missing, tell the user that `python3` is required to produce the page and stop: produce no partial page.
2. **Choose where to write.** If the user names a file or a folder, use it (a named file is the page; the model goes next to it). Otherwise write to `./uml/<name>.html` and `./uml/<name>.object.uml.json` in the working directory, with `<name>` taken from the subject (`library-afternoon`).
3. **Read the model format** in `${CLAUDE_PLUGIN_ROOT}/skills/uml-object-diagram/references/model.md`, once, before writing the model: it holds the fields, how titles, slots, literals and links are written and drawn, and a complete example, which this file does not repeat.
4. **Write the model** `<name>.object.uml.json`: the only file you write by hand. An object diagram shows one situation, so draw only the instances the source or the description gives; invent none. By source:
   - **A description of a situation.** Each thing the text names (a member, a loan, a copy) is an object of its class: `name` is how the text calls it, an unnamed one is anonymous. Values the text states become slots (a `type` only when the text gives one); relations between the things become links, with `role` at an end when the text names it and `navigable` when one side refers to the other. Group into packages only when the text names areas.
   - **Test data, fixtures, records or rows.** Each record is an object of its class (`class`), its field values are slots (`value` is text as it is shown), and a field that refers to another record is not a slot but a link to that record's object, with the field's name as the `role` at the target end and `navigable: true`. A table or a folder of records may become a package.
   - **A class diagram model plus example data.** Class names come from the classifiers, slot names and types from the attributes, link roles from the association ends (a `Loan` record with `member: alice` gives a link from the loan to `alice` with the role `member` at `alice`'s end), navigable where the class diagram's end is; the class diagram's multiplicities are not drawn (a link joins exactly two instances).
   - **An enumeration value in use.** A state or a kind that an object holds is an enumeration literal object, linked from the object that holds it.
5. **Produce the page.** The theme is `default` unless the user names another (`alt`, or the path of their own theme file):
   ```
   python3 "${CLAUDE_PLUGIN_ROOT}/shared/scripts/artifact_page.py" --type uml-object-diagram --model <name>.object.uml.json --theme default --out <name>.html
   ```
   On success it prints the page path. On failure it writes nothing and lists every problem: fix the model and run it again. Never patch the page.
6. **Report** the page path and the model path, and say what was drawn in a sentence. The page loads its layout library from a CDN when opened (and the fonts of a theme that uses Google Fonts); offline it falls back to a simple grid, and says so. Publish it as an artifact only when the session can and the user wants it.

## Changing an existing diagram

When the user asks to change an object diagram produced earlier, edit its `.object.uml.json` (keep everything they did not ask to change), run step 5 again, and report. Do not start from scratch. The file already shows the format, so read the model reference (step 3) only when the change needs a field the file does not use yet.
