# Phase 3c: validate (orchestrator)

Read when Phase 3c starts. The entry conditions and the routing of the person's answer are in `SKILL.md`. The requirements are the `skill-derivation` capability in `openspec/specs/`, or, while the change is in flight, its spec delta.

A derived skill is not measured: the person looks at one sample page and decides. No cost confirmation, no baseline, no `evals/run.sh`.

1. **The sample model.** `evals/<skill>/sample/` holds one model covering every notation feature the proposal's Derivation section lists. It is checked by step 2: the assembler runs the skill's validator and writes nothing when the model is invalid.
2. **The pages.** Produce both into `_agents_workspace/<change-id>/sample/`, which is gitignored (the pages are never committed). A missing model, or a failure of either command, goes back to the builder: nothing is shown to the person.

   ```
   python3 shared/scripts/artifact_page.py --type <skill> --model <model> --theme default --out _agents_workspace/<change-id>/sample/<name>.default.html
   python3 shared/scripts/artifact_page.py --type <skill> --model <model> --theme alt --out _agents_workspace/<change-id>/sample/<name>.alt.html
   ```

3. **Show.** Open both pages in a browser (or, when none can be opened, give the paths). Give the person the paths and one line per notation feature of the Derivation section: what the page shows for it and where. Say what the visual review checked and found, and anything not verified. Ask one question: accept the sample, or what to fix. Never recommend; never infer the answer from the review's verdict.
4. **Record on accept.** Append this entry to `evals/<skill>/RESULTS.md` (create the file with the heading `# Evaluation results: <skill>` if the skill has none). The plugin version is the one in `.claude-plugin/plugin.json`; the dates are today's; the person's reason ends the decision line:

   ```markdown
   ## <date>: validation

   - Plugin version: <version>
   - Anchor: `<anchor>`
   - Sample: `evals/<skill>/sample/<model file>`
   - Rendered with: default and alt themes, light and dark

   Decision: adopt (validated, not measured; derived from <anchor>) (<date>). <the person's reason>
   ```

   The decision prefix `adopt (validated, not measured` is read by `python3 evals/kpi.py doc` and checked by `bash tests/test-derived-samples.sh`; do not reword it.
5. **Fix.** Route the person's notes as Phase 3c in `SKILL.md` says; after the fix round and the reviews, start again at step 1.
