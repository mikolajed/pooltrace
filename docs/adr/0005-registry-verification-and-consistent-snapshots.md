# 0005: Registry verification and consistent snapshots

- Status: Accepted
- Proposed on: 2026-11-17
- Decision accepted by user: 2026-11-17; registry/snapshot design, including staged liquidity admission
- Related task: [M1-02](../tasks/M1-02-registry-and-consistent-snapshots.md)
- Future implementation: [M1-03](../tasks/M1-03-registry-and-consistent-snapshots.md); quotation design/implementation M1-04/05; storage design M1-09
- Requirement IDs: CR-02, CR-03, CR-09, CR-10; amount representation under CR-01
- Supersedes / superseded by: None

## Context

M1 needs comparable observations from three Ethereum WETH/USDC pools. A sourced address does not
prove a deployed pool's identity or liquidity. A shared block number alone does not bind separate
reads to the same state during a reorganization. This decision defines verification, collection,
and invalidation before implementing those behaviors.

ADR-0001 supplies the Node.js/TypeScript backend and protocol boundaries. ADR-0004 assigns RPC and
collection to the backend. This design keeps those boundaries and M1's read-only workload. It
does not choose storage, implement quotation, or authorize M1-03. All operational defaults below
are accepted engineering policy, not measured provider performance or observed market values.

## Decision

### 1. Fixed workload and sourced candidates

Use exactly one V2 pool and two V3 pools, with V3 fee parameters **500 and 3000**. These provide
a bounded comparison of two documented fee levels; they are candidate tiers, not a claim about
which pools currently have the most liquidity. The factory source initializes these fee amounts
with tick spacings 10 and 60. Verify the deployed factory's mapping at the selected block instead
of assuming the source proves current chain state.
[V3 factory source](https://raw.githubusercontent.com/Uniswap/v3-core/main/contracts/UniswapV3Factory.sol),
[fee conventions](https://developers.uniswap.org/docs/get-started/concepts/fees).

Use the following documentation-sourced candidate identities on chain ID 1. None was verified
through RPC during M1-02:

| Role | Candidate address / expectation | Primary source |
| --- | --- | --- |
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`; expected decimals 6 | [Circle's Ethereum USDC address](https://developers.circle.com/stablecoins/usdc-contract-addresses), [Uniswap token metadata example](https://developers.uniswap.org/docs/sdks/v3/guides/pool-data) |
| WETH9 | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`; expected decimals 18 | [Uniswap Ethereum token metadata](https://developers.uniswap.org/docs/sdks/v3/guides/pool-data) |
| V2 factory | `0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f` | [V2 mainnet deployments](https://developers.uniswap.org/docs/protocols/v2/deployments) |
| V3 factory | `0x1F98431c8aD98523631AE4a59f267346ea31F984` | [V3 Ethereum deployments](https://developers.uniswap.org/docs/protocols/v3/deployments/v3-ethereum-deployments) |

Discover pool addresses through the selected factories at the pinned block: V2 `getPair` and V3
`getPool` for each selected tier. Do not copy example pool addresses, trust a subgraph as the
authoritative registry, or silently substitute another fee tier/venue if a pool is missing or fails
admission. Report the configured workload as unavailable and return the change for review.
[V2 discovery](https://developers.uniswap.org/docs/protocols/v2/guides/getting-pair-addresses),
[V3 factory interface](https://github.com/Uniswap/v3-core/blob/main/contracts/interfaces/IUniswapV3Factory.sol).

The initial source/configuration revision must identify chain, token/factory addresses, source
URLs and retrieval dates, expected metadata, selected fees, and this policy revision. Symbols are
display metadata, never identity keys. Record observed runtime-code hashes for provenance, but do
not describe a nonempty contract or code hash as a security audit or proof of token implementation
behavior. The configured provider and the supported token deployments remain external trust
assumptions, including issuer-controlled upgrades.

### 2. Verification and liquidity admission

Repeat identity and structural state checks for each observation block; do not carry a successful
liquidity check into a different block. Every state read in this section uses the hash/canonical
selector in section 3.

| Check | Required outcome |
| --- | --- |
| Chain and contracts | RPC chain ID equals 1; candidate token/factory/pool addresses have nonempty code. A missing RPC result is unavailable, not evidence of empty code. |
| Tokens | Read token decimals and compare with the sourced expectations. Unexpected/reverting/malformed metadata prevents verification; do not infer decimals from a symbol or silently replace them. |
| Factory lookup | Each discovery result is a nonzero address; any configured expected pool address must match it. The three selected pool identities must be distinct. |
| V2 identity | Pool `factory`, `token0`, and `token1` match the selected factory and the numerically sorted allowlisted token addresses. Map reserve values by those returned identities. |
| V3 identity | Check `factory`, token ordering, `fee`, and `tickSpacing` against the selected factory and its `feeAmountTickSpacing` result; disabled/inconsistent tiers fail verification. |
| V2 structural screen | Both `getReserves` values must be strictly positive. Keep the reported reserve-update timestamp as protocol state; it is not the observation time or a snapshot freshness test. |
| V3 structural screen | Require initialized price (`sqrtPriceX96 > 0`), strictly positive current `liquidity`, and an unlocked pool; retain the returned tick and full `slot0` evidence. |

The relevant fields are defined by the official
[V2 pair interface](https://raw.githubusercontent.com/Uniswap/v2-core/master/contracts/interfaces/IUniswapV2Pair.sol),
[V3 immutable interface](https://github.com/Uniswap/v3-core/blob/main/contracts/interfaces/pool/IUniswapV3PoolImmutables.sol),
and [V3 state interface](https://raw.githubusercontent.com/Uniswap/v3-core/main/contracts/interfaces/pool/IUniswapV3PoolState.sol).
In particular, V3's current liquidity value describes liquidity at the current range; it is not
a token reserve, a dollar value, or proof of depth across the path of a larger swap.

**Separate preliminary checks from trade-size qualification.** M1-03 produces verified candidate
identities and structural screens, with finite-size suitability explicitly **unavailable**. They
may feed the later qualification step, but they are not yet an admitted three-pool analysis
workload. This preserves CR-02: do not configure these candidates as admitted market venues until
the finite-size evidence below exists. M1-03 alone cannot establish all of CR-02.

M1-04 must define the six-size grid, an explicit liquidity/price-impact admission budget, units,
rounding, and the acceptance metric. M1-05 must qualify the selected pools at the same snapshot:
use verified V2 quotation behavior and the official V3 quoter, evaluate both directed legs with
their actual inputs, and retain every size-level success/rejection/unavailable outcome. The second
leg receives the first leg's output. A complete quoted output is necessary but not sufficient;
the approved admission budget must also pass. Do not use token balances or active liquidity alone
as a substitute, or invent a dollar-liquidity floor without a reviewed workload assumption.
[Official V3 quoting workflow](https://developers.uniswap.org/docs/sdks/v3/guides/swapping/quoting).

Qualification is specific to pool, block hash, direction/input, and admission-policy revision;
it expires with that state. Keep rejection evidence for tested sizes rather than dropping them.
Until all three venues meet the reviewed workload admission policy, report that the selected
three-pool workload is unavailable. No pool swap or reduced-workload claim is automatic.
Exact admission budgets and whether every configured size must qualify are decisions for M1-04
and must be settled before admitting the workload; this ADR does not waive them.

This staging is an accepted sequencing clarification: M1-03's preparatory registry/snapshot slice
leaves full liquidity admission dependent on M1-04/05. If the user
wants complete trade-size admission inside M1-03, revise its scope/dependencies before approving
implementation. No quotation implementation is authorized through this proposal.

### 3. One selected block hash per collection attempt

Require an explicitly configured backend HTTP RPC URL, chain ID 1, and EIP-1898 support for both
`eth_call` and `eth_getCode`. EIP-1898 binds state queries to a block hash and permits a request to
require that hash to be canonical. Its rationale explains why number-based before/after checks
cannot exclude every temporary reorganization.
[EIP-1898](https://eips.ethereum.org/EIPS/eip-1898).

For each attempt:

1. Capture wall-clock start time and a monotonic deadline. Check the endpoint's chain ID.
2. Fetch one `latest` block header without transactions. Require a concrete non-null number,
   hash, parent hash, and timestamp. This selects block B; `latest` is never used for state reads.
3. Establish provider capabilities using hash-bound reads at B and negative probes using an
   unknown hash for both methods. A provider returning success for an unknown hash is unsuitable.
   The probe hash is constructed test input, never observed chain data. Retain probe outcomes.
   Provider documentation/support plus these probes are a trust assumption,
   not a proof that an endpoint always honors canonicality or returns honest data.
4. Discover and verify candidates and read their state with B's hash and `requireCanonical: true`
   on **every** contract/code read, including retries. Do not mix results across hashes or attempts.
5. Make fresh network checks of chain ID and the canonical block at B's number after collection.
   Its hash must still equal B. Fetch the current head for lag/freshness checks. Cached or shared
   pre-collection responses cannot serve as these validation reads.
6. Seal collected evidence with its individual outcomes. Allow it into later qualification only
   when required reads are complete and identity, structural, and post-validation checks pass.
   A complete payload can still be rejected/stale/unusable; preserve those separate states.

Changing head height during collection is allowed; state reads remain bound to B. A contradictory
header/chain response makes the attempt unusable. A provider that rejects hash selectors or cannot
serve B's state produces an explicit capability/state-unavailable result. There is **no fallback**
to block-number-only reads, unpinned calls, a public default URL, another provider, or fixtures.

Explicit historical inspection may select a concrete block number and resolve its canonical hash
before following the same flow. Mark it historical, not fresh live market data. This requires
historical-state support for that block; unavailable state is not replaced with current state.
`safe`/`finalized` are not the default for this live research workload; using `latest` makes no
finality or capture claim. Header lookup behavior is described by the
[Ethereum JSON-RPC reference](https://ethereum.org/developers/docs/apis/json-rpc/) and
[viem getBlock](https://viem.sh/docs/actions/public/getBlock).

### 4. Freshness, validation age, and invalidation

Use the following accepted initial limits. They are conservative operational choices to review
and tune with evidence; they are not estimates of Ethereum finality, liquidity, or provider capacity.

| Setting | Initial policy |
| --- | --- |
| Maximum live block age | 30,000 ms, inclusive, measured from B's timestamp |
| Maximum observed head lag | 2 blocks, inclusive; negative lag/contradictory headers are unusable |
| Maximum age of canonicality check before downstream use | 5,000 ms, inclusive |
| Allowed future timestamp tolerance | 2,000 ms; larger future skew makes clock/state validation unavailable |
| Per-request timeout | 5,000 ms |
| Maximum collection-attempt duration | 20,000 ms, including probes, queues, retry waits, and final validation |
| Request concurrency | At most 4 in-flight RPC requests |
| Retry allowance | 1 retry with a 250 ms base wait; at most 2 sends per logical read, within the attempt deadline |

For live data, block age is wall-clock time minus B's timestamp (converted explicitly from seconds
to milliseconds). A future value within tolerance has age zero for the limit check but retains
the signed offset in evidence. Track elapsed time and deadlines monotonically; a backward clock
jump or inconsistent time evidence removes fresh eligibility until a new attempt validates time.
Observation time must not replace block time in age calculations.

Re-evaluate age and lag before exposing/using an observation. Before later quotation consumes it,
require a recent canonicality check; if older than five seconds, perform another fresh number/hash
comparison first. Quote collection must also use B and finish with its own canonicality/freshness
check before publishing results. A retained snapshot is not perpetually valid because its first
check passed. A future long-lived consumer must revalidate on new-head/reorg evidence or at most
every five seconds while presenting live eligibility; M1-03 need not implement a scheduler/UI.

Represent collection completeness, identity/structural admission, canonicality, freshness, and data
origin separately. A complete payload may be stale; a canonicality check may be unavailable even
when its payload is complete. Such observations remain inspectable but are ineligible for current
analysis. Finite-size suitability is a separate gate as described above.

Confirmed hash replacement or an unambiguous noncanonical-block response invalidates B's
observation and all dependent results. Retain the original record and an invalidation reason/time;
never rewrite its hash or resurrect that record if the old hash reappears. A fresh collection is a
new attempt. Validation timeouts/ambiguous errors mean **validation unavailable**, not proof of a
reorganization. Later successful revalidation may resolve unavailable validation if the observation
has not been invalidated and still meets age/lag limits; retain both validation events.

### 5. Errors, retries, and honest outcomes

Retry only transient transport failures, HTTP 429/5xx, and timeouts, once and at the same hash.
Disable automatic transport/client retries so the application allowance is the actual send bound.
Wait at least 250 ms and honor a valid longer `Retry-After` when it fits the remaining budget;
missing/invalid `Retry-After` uses the base wait. A wait that exceeds the remaining budget ends
the attempt instead of extending it.
Cancel or ignore outstanding responses at deadline/cancellation; late responses cannot complete a
different attempt. There is no automatic restart at a new block inside the same attempt.

Wrong chain, invalid configuration, 401/403, unsupported methods/selectors, deterministic contract
reverts, malformed results, missing code/pools, identity mismatch, and structural rejection do not
get a blind retry. Distinguish a transport failure from an authoritative empty-code/zero-address
response. In every case preserve which checks ran and which remained unavailable.

Do not classify errors from their numeric JSON-RPC code alone: EIP-1898 suggests codes rather than
guaranteeing every provider's mapping, and a contract revert is not a reorganization. Use method
context and supported structured evidence; when uncertain, report incomplete/unavailable. Raw
provider errors must be sanitized so URLs, authorization headers, and API keys are not recorded.

### 6. viem integration and module ownership

Use **viem 2.57.20** as the integration baseline, based on its
[official release](https://github.com/wevm/viem/releases/tag/viem@2.57.20). No dependency is installed
by M1-02. Current official docs expose the required capabilities:

- [`createPublicClient`](https://viem.sh/docs/clients/public) with mainnet chain metadata and an
  explicitly supplied [`http`](https://viem.sh/docs/clients/transports/http) transport. Disable
  automatic multicall, HTTP batching, and implicit retries initially; use the bounded reader above.
  Disable caching for head/canonicality validation and prove those checks make fresh requests.
- [`getBlock`](https://viem.sh/docs/actions/public/getBlock) selects/resolves headers and performs
  number/hash revalidation. A configured mainnet client does not replace checking RPC chain ID.
- [`getCode`](https://viem.sh/docs/contract/getCode) reads code with `blockHash` and
  `requireCanonical: true`; an absent result and a failed request have different meanings.
- [`encodeFunctionData`](https://viem.sh/docs/contract/encodeFunctionData),
  [`call`](https://viem.sh/docs/actions/public/call), and
  [`decodeFunctionResult`](https://viem.sh/docs/contract/decodeFunctionResult) provide explicit
  ABI/state-read boundaries. Pass hash/canonicality on the actual call; do not assume an unpinned
  default in a convenience wrapper is safe. Reject missing/malformed return data before decoding.

M1-03 must pin the dependency and verify compile-time and wire-level behavior with this repository's
toolchain before claiming compatibility. Documentation research is not a successful runtime check.
If a baseline API/behavior differs, report it and amend the integration choice; never bypass the
hash requirement with an unsafe cast or silent consistency downgrade.

`packages/protocols` would own sourced candidates, ABI interactions, verification, and pinned RPC
reads. `apps/backend` would own configuration and one-attempt orchestration, clocks, bounded work,
and result delivery. Introduce only the packages needed by the approved M1-03 scope. Domain
calculations remain free of RPC/persistence/time access. A diagnostic entry point and background
lifecycle remain M1-06/12; this proposal does not add an independent collector or browser RPC.

### 7. Provenance and downstream handoff

Define the following information semantically; exact executable types and storage schema are
separately approved work. Do not serialize large integers as lossy JSON numbers.

| Evidence | Required information |
| --- | --- |
| Origin and identity | Live/historical/explicit fixture origin; attempt/reference ID; chain ID; registry/source revision; policy/configuration revision; source retrieval dates; application/dependency version |
| Block and timing | B's number/hash/parent hash/timestamp; collection start/end/observation time; monotonic elapsed duration; head checked; measured age/lag; clock validation; canonicality check events |
| Contract/pool evidence | Candidate and discovered addresses; observed code hashes; token decimals/order; factory/fee/tick spacing; per-check success/rejection/unavailable status |
| Protocol state | V2 reserves with token base units and reserve-update timestamp; V3 sqrtPriceX96 as a Q64.96 square-root ratio, tick, liquidity as a protocol quantity, and slot0 fields; read hash and method identity |
| Failures and lifecycle | Missing/failed reads; sanitized failure reasons; retries and attempts; completeness; structural screen; suitability unavailable until qualification; stale/invalidation/validation-unavailable events |
| Provider | A nonsecret operator-selected provider label and capability outcomes; never the credential-bearing URL, headers, or a purported provider trust proof |

Immutable observation content and subsequent validation/invalidation events must remain traceable.
Future quotations reference the observation, exact inputs, and later qualification evidence.
Consumers must check the eligibility gates at use time rather than treating possession of a
snapshot reference as authorization to calculate current results. M1-09 will choose encoding,
writer/migration behavior, and how this evidence is persisted. No database is created here.

## Alternatives considered

| Alternative | Tradeoff and reason for this decision |
| --- | --- |
| Number-pinned reads with before/after hash checks | Broader provider support, but a temporary fork can evade those checks. Prefer a required hash selector and explicit unavailability over a weaker same-state claim. |
| Independent latest reads or batch requests as the consistency boundary | Simple, but separate requests can see different states. Request batching alone is not the consistency policy. |
| Default safe/finalized observations | Gives an older reference with different reorg exposure; it changes the live workload's latency. Keep it a future explicit observation policy, not an automatic fallback. |
| Multicall or deployless aggregation immediately | Can reduce request overhead, but adds aggregation/deployment assumptions and error semantics. Three pools do not yet justify that extra boundary. |
| Subgraph/TVL ranking or automatic best-liquidity tiers | Convenient discovery, but not authoritative same-block identity/finite-size evidence. Keep explicit candidate tiers and fail admission honestly. |
| Full V3 tick traversal in the first slice | Can model depth but expands the implementation. Keep the official-quoter approach selected for M1 and gate finite-size admission on its reviewed evidence. |
| Multiple RPC providers/failover | Can improve availability, but requires a consistency/trust policy across endpoints. Start with one explicit provider and expose its failures. |

## Consequences and open dependencies

Hash binding strengthens the same-state guarantee for an honest, conforming provider. Strict
capability, freshness, and completeness gates will sometimes leave no usable observations. A
provider can still lie, and a validation result can become outdated immediately afterward; this
is provider-based research evidence, not independent consensus verification, finalized execution,
or proof of capture. No live observation has been made in this task.

The following do **not** block review of this design but do constrain later work:

- Before M1-03 implementation: approve the concrete M1-03 scope. The user has accepted this ADR,
  including the staged admission boundary; that design acceptance does not grant implementation approval.
- During M1-03: obtain the user's backend RPC configuration through an ignored environment file,
  verify provider capabilities, resolve actual pool addresses, and record identity/structural evidence.
  RPC absence leaves live integration unavailable; offline fixtures must stay explicitly labeled.
- Before admitting the three-pool workload/full CR-02 evidence: settle the M1-04 size/admission
  policy and implement/verify its qualification checks in M1-05. Neither positive structural
  screens nor a configuration file can substitute for that evidence.
- The exact provider, pool addresses, observed liquidity, tested input amounts, quote admission
  budget, and runtime compatibility results remain unverified/unselected where stated. These are
  explicit dependencies, not fabricated defaults or permission to broaden M1-03.

Revisit this ADR if provider coverage forces a different consistency policy, measured load justifies
aggregation/failover, a candidate tier repeatedly fails admission, or live/historical workloads
need different freshness budgets. Preserve past evidence and obtain the relevant design approval.

## Acceptance and validation criteria

The design has been accepted against the scope in M1-02. The
[M1-03 validation plan](../tasks/M1-02-registry-and-consistent-snapshots.md#m1-03-validation-plan)
defines the required offline and live evidence; it is not a passing test report.

Acceptance settles the selected tiers, strict hash/canonicality requirement, operational limits,
failure behavior, and staged liquidity admission. Implementation must then
demonstrate those behaviors and disclose remaining qualification/integration gaps without claiming
that M1-03 alone satisfies all of CR-02.

## Approval record

The user approved M1-02's documentation/research task on 2026-11-17. After reviewing the next-step
explanation, the user said “i accept adr5” on 2026-11-17. This accepts ADR-0005's design, including
the selected candidate tiers, strict hash/canonicality policy, operating limits, and staged
liquidity admission. It does not approve M1-03 implementation. Its proposed task record maintains
implementation authorization separately; M1-02 records research and documentation evidence.

## Implementation and evidence

Design documentation only; see M1-02 for research and validation evidence. No registry, snapshot
module, ABI code, dependency installation, application tests, live RPC reads, or fork runs exist
for this ADR. Sources linked above were consulted on **2026-11-17**. Current source/docs
describe intended APIs; the published viem baseline has not been installed or executed here.
