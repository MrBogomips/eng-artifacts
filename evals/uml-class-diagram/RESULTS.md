# Evaluation results: uml-class-diagram

One entry per evaluation, newest last. Summaries only: raw runs and kept deliverables stay in the ignored `evals/results/` folder.

## 2026-11-18: baseline, before the skill exists

- Plugin version: 0.2.0
- Model: claude-opus-5-5; effort: medium (observed: medium); Claude Code: 2.1.327; runs per arm: 3
- Targets: tokens at least 20.0% lower, time at least 20.0% lower
- Classification: **baseline**

| Case | Arm | Tokens median (min-max) | Time s median (min-max) | Cost USD |
|---|---|---:|---:|---:|
| uml-class-diagram-complex | without | 2,614,569 (2,213,649-2,635,990) | 998.3 (915.4-1236.6) | 10.8826 |
| uml-class-diagram-complex | with (no skill yet) | 1,370,756 (781,273-1,456,817) | 854.8 (755.2-865.8) | 8.1943 |
| uml-class-diagram-easy | without | 49,119 (48,892-97,720) | 60.3 (59.8-65.1) | 0.8278 |
| uml-class-diagram-easy | with (no skill yet) | 47,910 (47,636-71,196) | 52.7 (52.4-53.2) | 0.7510 |
| uml-class-diagram-medium | without | 565,718 (483,439-902,704) | 579.5 (328.7-590.2) | 4.4140 |
| uml-class-diagram-medium | with (no skill yet) | 334,406 (247,607-729,360) | 360.2 (233.1-590.2) | 3.4317 |
| **Total (sum of medians)** | without | 3,229,406 | 1638.0 | 16.1244 |
| **Total (sum of medians)** | with (no skill yet) | 1,753,072 | 1267.7 | 12.3770 |

Change with the plugin: tokens -45.7%, time -22.6%. Total cost of the evaluation: 28.5014 USD.

Deliverables: `evals/results/2026-11-18T08-14-06Z/` (ignored by git; one folder per case, arm and run).

Decision: n/a (baseline recording, before the skill existed)

<!-- Fill the decision line with `adopt`, `rework` or `reject` and the reason, after comparing the deliverables of both arms. -->
## 2026-11-18: evaluation

- Plugin version: 0.3.0
- Model: claude-opus-5-5; effort: medium (observed: medium); Claude Code: 2.1.327; runs per arm: 3
- Targets: tokens at least 20.0% lower, time at least 20.0% lower
- Classification: **below target**
- Worse with the plugin: uml-class-diagram-easy (tokens)

| Case | Arm | Tokens median (min-max) | Time s median (min-max) | Cost USD |
|---|---|---:|---:|---:|
| uml-class-diagram-complex | without | 2,266,188 (925,434-3,140,873) | 978.1 (658.7-1191.4) | 8.3250 |
| uml-class-diagram-complex | with | 190,664 (190,567-224,928) | 88.6 (88.1-91.9) | 1.6264 |
| uml-class-diagram-easy | without | 50,032 (49,579-51,360) | 67.4 (66.4-71.5) | 0.8651 |
| uml-class-diagram-easy | with | 114,087 (89,256-114,985) | 21.2 (21.1-26.7) | 0.5981 |
| uml-class-diagram-medium | without | 463,037 (460,803-1,025,929) | 445.4 (393.7-521.9) | 4.0613 |
| uml-class-diagram-medium | with | 97,124 (94,504-122,956) | 42.5 (35.0-48.7) | 0.8130 |
| **Total (sum of medians)** | without | 2,779,257 | 1490.9 | 13.2514 |
| **Total (sum of medians)** | with | 401,875 | 152.3 | 3.0375 |

Change with the plugin: tokens -85.5%, time -89.8%. Total cost of the evaluation: 16.2889 USD.

Deliverables: `evals/results/2026-11-18T11-06-40Z/` (ignored by git; one folder per case, arm and run).

Decision: adopt (2026-11-18). Below target only by the per-case rule: the easy case uses more tokens with the skill (+128.0%) while taking less time (-68.5%) and costing less; overall tokens -85.5%, time -89.8%, all checks passed. The user adopted this version after comparing the deliverables of both arms.

<!-- Fill the decision line with `adopt`, `rework` or `reject` and the reason, after comparing the deliverables of both arms. -->
