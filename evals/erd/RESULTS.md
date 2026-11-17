# Evaluation results: erd

One entry per evaluation, newest last. Summaries only: raw runs and kept deliverables stay in the ignored `evals/results/` folder.

## 2026-11-17: baseline, before the skill exists

- Plugin version: 0.1.0
- Model: claude-opus-5-5; effort: medium (observed: medium); Claude Code: 2.1.326; runs per arm: 3
- Targets: tokens at least 20% lower, time at least 20% lower
- Classification: **baseline**

| Case | Arm | Tokens median (min-max) | Time s median (min-max) | Cost USD |
|---|---|---:|---:|---:|
| erd-complex | without | 339,092 (227,820-357,551) | 304.2 (246.2-320.8) | 2.6511 |
| erd-complex | with (no skill yet) | 237,502 (224,837-257,081) | 291.5 (245.9-312.8) | 2.3150 |
| erd-easy | without | 179,797 (111,430-204,523) | 135.2 (128.0-159.3) | 1.3452 |
| erd-easy | with (no skill yet) | 208,352 (146,065-222,176) | 163.3 (153.4-171.6) | 1.4714 |
| erd-medium | without | 264,136 (256,002-288,955) | 271.1 (222.7-312.5) | 2.4920 |
| erd-medium | with (no skill yet) | 350,971 (272,009-378,535) | 281.2 (268.7-311.9) | 2.6400 |
| **Total (sum of medians)** | without | 783,025 | 710.4 | 6.4883 |
| **Total (sum of medians)** | with (no skill yet) | 796,825 | 735.9 | 6.4264 |

Change with the plugin: tokens +1.8%, time +3.6%. Total cost of the evaluation: 12.9147 USD.

Deliverables: `evals/results/2026-11-17T14-10-58Z/` (ignored by git; one folder per case, arm and run).

Decision: n/a (baseline, recorded before the skill existed)

<!-- Fill the decision line with `adopt`, `rework` or `reject` and the reason, after comparing the deliverables of both arms. -->
## 2026-11-17: evaluation

- Plugin version: 0.1.0
- Model: claude-opus-5-5; effort: medium (observed: medium); Claude Code: 2.1.326; runs per arm: 5
- Targets: tokens at least 20.0% lower, time at least 20.0% lower
- Classification: **meets target**

| Case | Arm | Tokens median (min-max) | Time s median (min-max) | Cost USD |
|---|---|---:|---:|---:|
| erd-complex | without | 290,942 (208,034-352,047) | 318.2 (268.9-347.6) | 4.5606 |
| erd-complex | with | 113,191 (89,964-116,343) | 30.3 (29.9-32.5) | 1.2492 |
| erd-easy | without | 139,834 (108,767-240,555) | 131.9 (108.1-174.7) | 2.3250 |
| erd-easy | with | 81,834 (81,525-104,676) | 21.3 (20.0-25.1) | 0.8559 |
| erd-medium | without | 252,766 (190,038-509,782) | 295.7 (224.5-347.8) | 4.3258 |
| erd-medium | with | 85,152 (84,859-85,310) | 32.4 (31.7-35.8) | 1.0352 |
| **Total (sum of medians)** | without | 683,542 | 745.8 | 11.2114 |
| **Total (sum of medians)** | with | 280,177 | 84.0 | 3.1403 |

Change with the plugin: tokens -59.0%, time -88.7%. Total cost of the evaluation: 14.3517 USD.

Deliverables: `evals/results/2026-11-17T16-19-26Z/` (ignored by git; one folder per case, arm and run).

Decision: adopt (2026-11-17). Meets target (tokens -59.0%, time -88.7%); the user approved this version for publication.

<!-- Fill the decision line with `adopt`, `rework` or `reject` and the reason, after comparing the deliverables of both arms. -->
