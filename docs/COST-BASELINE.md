# Cost baseline: cost per successful workflow

This page records one measured optimization of the `sdd-engineering` workflow: what it cost before, what it costs after, and the quality gate that had to stay green. Hosting is not part of the experiment: the catalog is static GitHub Pages and the build runs in GitHub Actions within the free plan.

## Metric

**Cost per successful workflow** = total agent cost of all runs of the workflow eval ÷ number of runs that passed every grader.

- The workflow is the specification stage of SDD: `spec-creator` writes a spec, then `implementation-planner` turns it into a plan, for one fixed feature (a `--json` flag for a todo CLI). Eval case: [evals/sdd-engineering/workflow-spec-to-plan](../evals/sdd-engineering/workflow-spec-to-plan/prompt.md).
- Cost is the `costUsd` that `claude plugin eval` reports per run (list-price estimate including subagent calls). Judge-model cost for the LLM grader (about $0.002 per run) is a measurement overhead and is excluded.
- Failed runs still count toward the numerator, so an optimization cannot look cheaper by failing more.
- Claude Code 2.1.302, plugin code from this repository, no baseline arm (`--ablation none`).

## Quality gate

An optimization is accepted only if, over the same case and graders, the pass rate does not drop below the baseline's:

| Grader | Checks |
|---|---|
| spec-file, plan-file | both files exist at the requested paths |
| used-spec-creator, used-planner, spec-order | the right agents ran, spec first |
| spec-ears | the spec contains `AC-1` and EARS "the system shall" wording |
| plan-structure | plan header `Approved:`, a `- [ ]` step list, `AC-1` references and `Files owned` |
| quality | LLM judge, 2 of 3 votes: IDs in EARS form, an error/edge case, non-goals, behavior rather than implementation |

## Baseline (before): sdd-engineering 1.0.0

`spec-creator` on Opus, `implementation-planner` on Opus.

| Run | Cost, USD | Duration | Score |
|---|---|---|---|
| 1 | 0.933 | 277 s | 1 |
| 2 | 0.581 | 178 s | 1 |
| 3 | 0.923 | 307 s | 1 |
| 4 | 0.868 | 291 s | 1 |
| 5 | 0.781 | 247 s | 1 |

Passed 5/5. Total $4.086. **Cost per successful workflow: $0.817** (min 0.581, max 0.933, mean duration 260 s).

## Optimization: planner on Sonnet (sdd-engineering 1.1.0)

One change: `model: sonnet` in `agents/implementation-planner.md` instead of `opus`. The planner mostly restructures an already-written spec into steps and is checked by the verifier and a human approval gate, while `spec-creator` keeps Opus because the spec is where quality is decided.

| Run | Cost, USD | Duration | Score |
|---|---|---|---|
| 1 | 0.457 | 148 s | 1 |
| 2 | 0.413 | 198 s | 1 |
| 3 | 0.430 | 145 s | 1 |
| 4 | 0.455 | 158 s | 1 |
| 5 | 0.468 | 154 s | 1 |

Passed 5/5. Total $2.223. **Cost per successful workflow: $0.445** (min 0.413, max 0.468, mean duration 161 s).

## Result

| | Before (1.0.0) | After (1.1.0) | Change |
|---|---|---|---|
| Pass rate | 5/5 | 5/5 | gate held |
| Cost per successful workflow | $0.817 | $0.445 | **-46%** |
| Mean duration | 260 s | 161 s | -38% |

## Limits of this measurement

- One fixture feature and one workflow stage; n = 5 per arm. The spread of the baseline ($0.58–$0.93) is wide, so treat the exact percentage as indicative, the direction as reliable.
- The gate checks structure plus one LLM judge on the **spec**. It does not grade the plan's content beyond the structure regex, so a subtler plan-quality loss would not be caught; the downstream `plan-verifier` and the human approval of the plan remain the real safety net.
- The baseline runs used the working tree before the model change; that tree already contained the 1.1.0 `plan-verifier` verdict block, which the workflow does not invoke, so it does not affect the numbers.
- `implementer`, `plan-verifier`, `test-writer` and `doc-writer` already ran on Sonnet and are unchanged.

## Reproduce

```bash
claude plugin eval . --case workflow-spec-to-plan --runs 5 --ablation none --allow-tools Write Edit   --trust-plugin --no-publish --max-cost-usd 8 --json result.json
# cost per successful workflow = sum(costUsd of all runs) / count(runs with score 1)
```

For the baseline, run the same command in a checkout of tag `sdd-engineering--v1.0.0`.
