# ARB-01 baseline results — 2026-11-20

Two prospective 128-height windows produced **146/256 qualified block samples** and **0/146 positive-gross samples**. These are historical read-only observations of the fixed three-pool, six-size workload. Unsampled or ineligible blocks do not establish zero market yield.

| Window | Block heights | Qualified | Ineligible primary | Observer coverage | Positive gross | Best tested gross |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 26452712–26452839 | 85/128 | 0 | 128/128 | 0/85 | -0.005634 USDC |
| 2 | 26452944–26453071 | 61/128 | 4 | 127/128 | 0/61 | -0.010001 USDC |

Both windows missed the 75% qualified-coverage target. Window 2 also missed the 10-second quote-phase p95 and one-block completion-lag p95 targets. Missing, stale and unavailable samples remain explicit. Window 2 includes one duplicate attempt; the primary selection rule prevents it changing yield.

Research recommendation: **revise the observation/freshness approach before broader yield conclusions**. The supported finding is zero positive gross in the qualified samples; no follow-on task is selected by this closeout.

The experiment used 17,887 actual RPC sends, including 211 preflight sends, within the original limits. Transaction costs, net profit and provider billing remain unavailable.

An Xcode update interrupted the first run after all its closing headers were recorded. Its original failed terminal remains unchanged. After Git was restored, the complete frozen source matched and was preserved. A guarded continuation collected only the unstarted second window, within the original remaining budget. The report retains separate source identities and discloses the control-code revision; it does not claim a matched-source comparison. Both owned producers exited and released ownership.

The [sanitized evidence](ARB-01-baseline-2026-11-20.json) contains exact amounts, per-route/size distributions, timing, coverage, hashes, source identities, interruption and validation details. The [task record](../tasks/ARB-01-baseline-yield-and-freshness.md) owns approval, criteria and limits. Full raw journals, SQLite files, source snapshots and recovery proof remain in the two ignored local run directories.

Reproduce the combined report offline:

```sh
bun run research:arb-01 report --run-dir data/arb-01-91b9a7c3-5761-4952-8f79-7e778513e223
```

The report reproduced byte-for-byte without RPC; SQLite hashes were unchanged. Local checks passed: 300 tests across 14 files, type checking, lint and formatting. These observations establish no capture guarantee and do not rule out opportunities in unsampled blocks, other workloads or intra-block states.
