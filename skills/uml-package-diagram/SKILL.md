---
name: uml-package-diagram
description: "Draw a UML package diagram as a self-contained HTML page: packages as folders, nested to any depth, with stereotypes, the elements they own, and the import, access and merge dependencies between them, two levels of detail, a light/dark toggle and replaceable themes. Use when the user asks for a package diagram, the module or namespace structure of a system, the dependencies between modules, packages or folders, the layers of an architecture (presentation, application, domain, infrastructure) and which layer uses which, or hands over a source tree or its imports to draw. Also use to change a package diagram this skill produced earlier: add a package, move one, add a dependency. For the classes inside the packages and how they relate, use the class diagram skill."
---

# UML package diagram

You write a small JSON model; a script validates it, lays the diagram out and produces the page. Never write HTML, CSS, SVG, scripts, colors or coordinates yourself: they come from the plugin, and they are what makes the page match every other artifact of the plugin. The page lets the reader choose the level of detail (members shown, package names only), so never trim members or dependencies for an audience.

## Steps

1. **Check python3.** Run `python3 --version`. If it is missing, tell the user that `python3` is required to produce the page and stop: produce no partial page.
2. **Choose where to write.** If the user names a file or a folder, use it (a named file is the page; the model goes next to it). Otherwise write to `./uml/<name>.html` and `./uml/<name>.package.uml.json` in the working directory, with `<name>` taken from the subject (`shop-layers`).
3. **Read the model format** in `${CLAUDE_PLUGIN_ROOT}/skills/uml-package-diagram/references/model.md`, once, before writing the model: it holds the fields, the nesting and dependency rules, the dependency kinds and a complete example, which this file does not repeat.
4. **Write the model** `<name>.package.uml.json`: the only file you write by hand. By source:
   - **A source tree.**
     - Every folder, module or namespace that holds code is a package, nested as the tree is (`parent`); `id` is its path, `name` its folder name. A folder that only groups other folders is still a package.
     - An import from a file of one folder to a file of another is one `import` dependency from the importing package to the imported one, whatever the number of files. Leave out imports inside one package, and an import of a package from its own parent or child: nesting says so.
     - Use `access` or `merge` only when the source or the user says so (a private import, a package extension); a use that is not an import (configuration, a runtime lookup) is a plain `dependency` with a `label`.
     - A stereotype only when the folder says what it is. List `members` (public classes, interfaces, enums) only when the user wants the content shown; mark an interface or an enumeration with its `kind`.
   - **A layered or modular architecture described in prose.** One package per layer or module, nested when the text says one holds another; one dependency per "uses" (`import` unless the text says otherwise), from the user to the used. A stereotype only when the text names one (`model`, `profile`, `layer`).
   - **A class diagram model.** Each package of the model becomes a package, its classifiers become `members`, and a dependency between packages is added for every relationship that joins classifiers of two different packages, once per pair.
5. **Produce the page.** The theme is `default` unless the user names another (`alt`, or the path of their own theme file):
   ```
   python3 "${CLAUDE_PLUGIN_ROOT}/shared/scripts/artifact_page.py" --type uml-package-diagram --model <name>.package.uml.json --theme default --out <name>.html
   ```
   On success it prints the page path. On failure it writes nothing and lists every problem: fix the model and run it again. Never patch the page.
6. **Report** the page path and the model path, and say what was drawn in a sentence. The page loads its layout library from a CDN when opened (and the fonts of a theme that uses Google Fonts); offline it falls back to a simple grid that keeps the nesting, and says so. Publish it as an artifact only when the session can and the user wants it.

## Changing an existing diagram

When the user asks to change a package diagram produced earlier, edit its `.package.uml.json` (keep everything they did not ask to change), run step 5 again, and report. Do not start from scratch. The file already shows the format, so read the model reference (step 3) only when the change needs a field or a dependency kind the file does not use yet.
