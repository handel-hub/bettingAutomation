# SportyBet Compatibility Audit Report

## A. AUDIT SUMMARY
This audit evaluates the compatibility between the SportyBet Browser Edge Target (Behavioral Specification v2) and the Existing Generic Automation Engine (v2 Architecture + Edge-Compute Amount/Pricing Subsystem). The overarching finding is that while the generic engine possesses a robust Playwright-based execution loop and an autonomous edge computation model for pricing, its foundational assumptions regarding DOM interaction, state lifecycle, error resolution, and submission semantics are in deep conflict with the target's Vue.js-driven reactive reality.

The generic engine relies heavily on standard DOM interaction (`.click()`, `.fill()`) and strict locator resolution. SportyBet completely rejects `.fill()` on custom UI elements and filters synthetic `.click()` without focus/touch-saturation. Furthermore, the generic engine's state machine collapses complex target UI transitions (e.g., `CONFIRM_MODAL`, `ODDS_CHANGED`, `RESULT_MODAL`) into overly simplistic `PRE_FLIGHT` and `EXECUTING` states, causing dangerous race conditions and false-negative timeouts.

**Final Status:** **NOT_READY**. Fundamental generic engine interaction assumptions conflict with the target, requiring missing generic primitives (like event saturation and stateful submission lifecycles) before an adapter can be safely implemented.

---

## B. EXISTING ENGINE CAPABILITY MODEL

### 1. Execution Layer (`ActionSimulator.mjs`)
* **Purpose:** Physical DOM manipulation and fallback resolution.
* **Inputs:** `Command` objects (`type`, `payload: { selector }`).
* **Outputs:** Success/Failure emission, telemetry transitions.
* **State:** Queue depth, Retry attempts (MAX_EXECUTION_RETRIES = 3).
* **Dependencies:** Playwright `Page`, `LocatorResolver`, CDP Network.
* **Public Interface:** `execute(browserObj, command)`
* **Assumptions:** HTML standard inputs exist for `type='input'`; elements respond to native Playwright `.click()`; `timeout` implies execution failure.
* **Generic Capability:** Playwright DOM abstraction, CDP navigation sync, automatic DOM stability wait (`waitFor({state: 'attached'})`).

### 2. Autonomous Edge Computing (`EdgeStateMachine.mjs` / `PricingSolver.mjs`)
* **Purpose:** Continuous local evaluation of policy against current odds.
* **Inputs:** DOM Snapshot (odds, balance), Policy (constraints).
* **Outputs:** `AUTHORIZE_BET` requests to Node.
* **State:** `IDLE` -> `OBSERVING` -> `EVALUATING` -> `RESOLVING` -> `SELECTING` -> `READY` -> `PRE_FLIGHT` -> `EXECUTING` -> `SUBMITTED`.
* **Dependencies:** `PricingObserver` (DOM hash), Node IPC.
* **Public Interface:** `transition()`, `handleEvent()`, `solve()`.
* **Assumptions:** State transitions are unidirectional and stateless beyond the snapshot; executing a bet is a single atomic click (`performDOMClick()`).

### 3. Coordination Layer (`SequenceOrchestrator.mjs` / `BrowserRegistry.mjs`)
* **Purpose:** Node health, rebet sequence spawning, authentication session management.
* **Assumptions:** `SessionManager` assumes presence of `.m-balance` proves auth; Rebetting merely involves initiating a new sequence with a new UUID.

---

## C. SPECIFICATION → ENGINE TRACEABILITY

| Specification Requirement | Existing Engine Component | Capability | Compatibility | Gap | Consequence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[OBSERVED]** SPA/Vue.js DOM Node Replacement | `ActionSimulator.mjs` | Locator strict resolution | `[PARTIALLY COMPATIBLE]` | Engine resolves locators cleanly, but lacks observation boundary limits. | Execution throws `ElementDetachedError`. |
| **[OBSERVED]** Fast vs Full Betslip isolation | `Command.mjs` | `shadowPath` / Locators | `[COMPATIBLE]` | The generic locator engine supports scoping. | N/A |
| **[OBSERVED]** Stake Input Custom Element (`.m-keybord-input`) | `ActionSimulator.mjs` (`type: input`) | `.fill()` / `.pressSequentially()` | `[INCOMPATIBLE]` | Engine assumes `<input>` and calls `.fill()`. Target is a `<span>` utilizing a custom virtual keyboard. | `.fill()` will immediately throw or fail silently. |
| **[OBSERVED]** Keyboard Event Saturation | `ActionSimulator.mjs` (`type: click`) | `page.locator().click()` | `[INCOMPATIBLE]` | Engine uses standard native clicks. Target requires `touchstart` -> `click` array saturation. | Clicks on numeric keypad will be ignored by Vue `v-on`. |
| **[OBSERVED]** Modal Confirmation Focus Requirement | `ActionSimulator.mjs` (`type: click`) | `page.locator().click()` | `[INCOMPATIBLE]` | Engine does not call `.focus()` before `.click()` unless explicitly sent as a separate command. | Target confirm buttons fail to trigger placement logic. |
| **[OBSERVED]** Odds Changed Notification state | `EdgeStateMachine.mjs` | TOCTOU Hash checking | `[PARTIALLY COMPATIBLE]` | Engine detects hash change and aborts. | Engine aborts rather than actively invoking the reactive `Accept Changes` button. |
| **[OBSERVED]** Asynchronous Potential Win Calculation | `EdgeStateMachine.mjs` / `PricingObserver.mjs`| Delay loops | `[MISSING]` | Engine lacks semantic understanding of derived-value settling. | Engine may read stale potential win amount before Vue tick finishes. |
| **[OBSERVED]** Rebet Modal Cache Restoration | `SequenceOrchestrator.mjs` | New Sequence UUID | `[INCOMPATIBLE]` | Engine treats Rebet as starting a fresh sequence. Target Rebet inherently inherits state in the DOM cache. | Engine will incorrectly attempt to re-type stake, causing DOM collisions. |
| **[OBSERVED]** Unknown Timeout State | `ActionSimulator.mjs` / `EdgeStateMachine.mjs` | Terminal `PlaywrightTimeoutError` / `ABORTED` | `[INCOMPATIBLE]` | Engine treats network timeout as `FAILURE`. | Target may process bet successfully while engine abandons sequence. |

---

## D. COMPATIBILITY MATRIX

| Requirement | Specification Evidence | Existing Engine Component | Capability | Status | Gap | Correct Layer | Consequence |
|---|---|---|---|---|---|---|---|
| Semantic Locator Scoping | Section C | LocatorResolver | Scoped resolution | SUPPORTED | None | Generic Engine | Clean target acquisition. |
| Vue.js Node Replacement | Section O | MutationObserver | `childList` | SUPPORTED | None | Generic Engine | Dynamic detection. |
| Custom `span` Input | Section F | `ActionSimulator` | `fill()` | INCOMPATIBLE | Lacks custom input sequence primitive. | Edge Adapter | Target fails to receive stake. |
| Event Saturation (`touchstart`) | Section G | `ActionSimulator` | `click()` | INCOMPATIBLE | Generic engine lacks touch/burst event primitive. | Generic Engine | Keypad completely ignores clicks. |
| Modal `.focus()` | Section N | `ActionSimulator` | `focus`, `click` | PARTIALLY_SUPPORTED | Requires 2 separate generic commands; no atomic primitive. | Generic Engine | Race condition between focus and click. |
| Inter-digit Delay (250ms) | Section R | `ActionSimulator` | `pressSequentially` | UNSUPPORTED | Doesn't apply to custom keyboard clicks. | Generic Engine | Vue buffer overflow (drops digits). |
| Wait for Derived Value (Win) | Section F | `PricingObserver` | Hash stability | UNCLEAR | Stable hash may not guarantee value is fully recalculated. | Edge Adapter | Incorrect math validation. |
| Odds Change Resolution | Section H | `EdgeStateMachine` | `OBSERVING` loop | INCOMPATIBLE | Aborts rather than navigating `ACCEPT_ODDS` state. | Edge Adapter | Infinite loop if odds constantly fluctuate. |
| Sticky Footer Bypass | Section W | `ActionSimulator` | Native Playwright | SUPPORTED | Playwright natively scrolls to elements. | Generic Engine | N/A |

---

## E. AMOUNT / STAKE AUDIT
**CONCEPT:** Amount
**EXISTING REPRESENTATION:** `PricingSolver.mjs` determines feasible amounts based on policy math.
**ADEQUATE?** No.
**WHY?** The generic mathematical engine correctly determines the integer target (e.g., `1500`), but the generic execution engine (`ActionSimulator`) assumes it can merely inject this number via `page.fill()`. The target requires a sequential translation: `[1, 5, 0, 0]` mapped to specific `[data-key="X"]` touch events with mandatory 250ms inter-digit delays.
**MISSING INFORMATION:** The engine is unaware that the UI doesn't accept direct text injection.
**REQUIRED CHANGE:** The execution engine must support a `VIRTUAL_KEYBOARD` input primitive that translates strings to specific target element bursts.

## F. PRICE / ODDS AUDIT
**CONCEPT:** Price / Odds
**EXISTING REPRESENTATION:** Parsed dynamically by `PricingObserver.mjs`, passed to `EdgeStateMachine.mjs`.
**ADEQUATE?** Partially.
**WHY?** It successfully prevents placing a bet on bad odds via the `PRE_FLIGHT` hash check. However, it lacks the semantic state required to resolve an active price block. The target explicitly blocks the UI with `.betslip-notification` and changes the button to `.bet-accept-change`. The generic engine treats this as a hash mismatch and loops back to `OBSERVING`, potentially looping forever instead of clicking the `Accept` button.
**REQUIRED CHANGE:** State machine must model the `ODDS_CHANGED` -> `ACCEPT_ODDS` transition as a first-class state, not just a TOCTOU error.

## G. STATE MACHINE AUDIT
The Generic `EdgeStateMachine.mjs` is linear:
`IDLE -> OBSERVING -> EVALUATING -> RESOLVING -> SELECTING -> READY -> PRE_FLIGHT -> EXECUTING -> SUBMITTED`

The Target Behavioral Machine is highly modal and interrupt-driven:
`BETSLIP_OPEN -> STAKE_EDITING -> STAKE_VALIDATING -> READY_TO_SUBMIT -> (ODDS_CHANGED) -> (CONFIRM_MODAL) -> PROCESSING -> SUCCESS/FAILURE/UNKNOWN`

**Gaps:**
1. Generic engine lacks `STAKE_EDITING`. It assumes typing is a synchronous instant (`Command`).
2. Generic engine lacks `CONFIRM_MODAL`. It assumes execution is one click.
3. Generic engine lacks `ODDS_CHANGED` active resolution.
4. Generic engine lacks `UNKNOWN` state (defaults to `ABORTED` on timeout).

## H. DOM / OBSERVATION AUDIT
The generic `PricingObserver.mjs` hashes the DOM to detect stability. The target Vue.js DOM utilizes structural replacement (`childList` mutation on `.avatar-box`).
The existing observation boundary is compatible if the target adapter configures `.m-betslips-show` as the root boundary. The engine supports `attributeFilter`, fulfilling the requirement to track `.bet-disabled`.

## I. LOCATOR / IDENTITY AUDIT
The generic `LocatorResolver` is robust and supports document scoping. It mitigates the multiple-match issue (e.g., `.m-outcome-odds` occurring in the background) perfectly as long as the adapter provides the correct `shadowPath` mapping to the active overlay.

## J. EVENT / INTERACTION AUDIT
**Critical Failure.** `ActionSimulator.mjs` relies entirely on native `loc.click()` and `page.mouse`. The specification exhaustively details the necessity of Event Saturation (`touchstart`, `touchend`, `mousedown`, `mouseup`, `click`) for the `.m-keyboard`, and `focus()` + `click()` for Vue modal buttons. The generic engine must implement an `event_burst` or `touch_click` interaction abstraction. Assuming `element.click()` is universally sufficient is fundamentally incorrect for this target.

## K. SUBMISSION LIFECYCLE AUDIT
Generic assumes: Send Click Command -> Playwright Awaits -> Resolve Success.
Target requires: Send Click -> Wait for transition to `PROCESSING` -> Handle optional `CONFIRM_MODAL` -> Wait for explicit `.m-icon-success` OR network `code: 0`.
The generic engine interprets network timeouts as `FAILURE` (triggering retry), which is catastrophically dangerous on the target, as it may result in duplicate real-money submissions.

## L. RESULT / SETTLEMENT AUDIT
The generic engine conflates Submission (`RECEIPT_OK`) with final success. The specification requires reconciliation (distinguishing between the submission leaving the client and the settlement hitting the balance). The `ReconciliationDaemon.mjs` currently polls for generic uncertainty, but the edge execution loop does not return `UNCERTAIN` cleanly.

## M. REBET AUDIT
The generic engine (via `SequenceOrchestrator`) assumes Rebet means "generate a new sequence and start over". The target defines Rebet as clicking `.rebet` to instantly restore the cached betslip containing the previous selection and pre-filled stake. The generic engine's approach will violently collide with the target's pre-filled state cache.

## N. TIMING / ASYNCHRONY AUDIT
The generic engine uses explicit delays (e.g., `150ms` cooldown after failure). It lacks a primitive for the target's strict `250ms` inter-digit delay constraint. Without this, the generic engine will execute inputs synchronously, overflowing the Vue virtual DOM buffer and truncating stakes (e.g., `1000` becomes `10`).

## O. RACE-CONDITION AUDIT
| Operation | Race Condition | Engine Protection | Missing Protection | Consequence |
|---|---|---|---|---|
| Place Bet | DOM mutates during click execution. | `PRE_FLIGHT` hash check. | None | Target intercepts click safely. |
| Keyboard Input | Vue buffer drops rapid key clicks. | None | Inter-digit pacing lock. | Intended 1000 -> Placed 10. |
| Modal Interaction | Clicking before CSS transition finishes. | Playwright `waitFor`. | None | Playwright handles natively. |
| Result Timeout | API hangs, connection drops. | Throws `PlaywrightTimeoutError`. | Fallback to `UNCERTAIN` state. | **Duplicate bets.** |

## P. ERROR MODEL AUDIT
Generic Engine throws: `LocatorResolutionError`, `OverlayInterceptionError`, `PlaywrightTimeoutError`.
Target Taxonomy: Stake > Balance (`.m-input-err`), Balance Toast, Odds Changed, Session Expired, Server Timeout.
The generic engine collapses all UI blocks into a `GlobalTimeoutError` because it fails to find the next element. The lost semantic information means the system cannot gracefully heal (e.g., re-authenticating on `.m-login-dialog`).

## Q. SESSION MODEL AUDIT
The `SessionManager` uses `.m-balance` to verify login. This conflicts with the specification which explicitly flags `.m-login-yes` as the canonical auth indicator, and `.m-login-dialog` as the mid-execution interruption trigger.

## R. NETWORK ↔ DOM CORRELATION AUDIT
The generic engine (`ActionSimulator`) listens to CDP `Network.requestWillBeSent` and emits telemetry, but does not parse response bodies natively. The specification mandates reading the `code: 0` vs `code: 10001` JSON payload of the `/placeOrder` POST response to definitively prove success/failure. 

## S. FRAMEWORK / REACTIVE UI AUDIT
The generic engine handles Vue DOM replacement cleanly via Playwright's lazy re-evaluation (`locator.click()` re-fetches elements). However, it completely fails against Vue's `v-on` event masking, which filters synthetic generic events (necessitating focus or saturation bursts).

---

## T. GENERIC ENGINE VS EDGE ADAPTER RESPONSIBILITY

**Generic Engine Additions Required:**
- `EventSaturationPrimitive`: Ability to configure an array of event types (e.g., `touchstart`->`click`) dispatched to a single element.
- `VirtualKeyboardPrimitive`: Ability to map strings to specific localized locator clicks with enforced timing intervals.
- `ResultState.UNCERTAIN`: Core lifecycle must natively support indeterminate timeouts.

**Edge Adapter Configurations (Do NOT put in Generic Engine):**
- The fact that SportyBet specifically uses `[data-key="X"]`.
- The fact that SportyBet intercepts odds via `.betslip-notification`.
- The 250ms timing value.

---

## U. FALSE GAPS
**False Gap:** The target renders multiple overlapping `.m-outcome-odds` elements, seemingly requiring advanced visual ML.
**Existing Capability:** The generic engine's `LocatorResolver` natively supports scoped query contexts. Specifying `.m-betslips-show` as the root identity perfectly resolves this without architectural changes.

---

## V. DANGEROUSLY COMPATIBLE AREAS

**DANGEROUSLY_COMPATIBLE: `.place-bet` Submission**
* **Existing capability:** `ActionSimulator` uses `loc.click()`. Playwright successfully clicks the button.
* **Why it is dangerous:** The click initiates a network request. If the network request takes 31 seconds, Playwright throws a `PlaywrightTimeoutError`. The generic Engine catches this, assumes the action failed, and retries the command. On the target, the network request may have completed on the backend at 30.5 seconds. Retrying sends a second real-money bet.

**DANGEROUSLY_COMPATIBLE: Rebet Initiation**
* **Existing capability:** `SequenceOrchestrator` generates a new command sequence for the same match.
* **Why it is dangerous:** When SportyBet completes a bet, the UI opens a modal with a `.rebet` button. If the generic engine ignores this and tries to manually navigate back to the market to "start a new sequence", it will collide with the active modal overlay.

---

## W. ACTUAL MISSING GENERIC PRIMITIVES
1. **Event Burst Dispatcher:**
   * *Why:* Vue components filter standard clicks on mobile emulation.
   * *Gap:* `ActionSimulator` only supports native `.click()`.
   * *Generic?* Yes. Many SPAs employ touch-event filtering.
2. **Stateful Submission Lifecycle:**
   * *Why:* Executing a real monetary transaction is not just "Click". It's "Click -> Await Transition -> Await Confirm -> Await Receipt".
   * *Gap:* Generic engine treats it as a single synchronous command execution.
   * *Generic?* Yes. Submission is a universal concept.
3. **Uncertain Result State (`UNCERTAIN`):**
   * *Why:* Network drops do not mean execution failure.
   * *Gap:* Error taxonomy lacks indeterminate states.
   * *Generic?* Yes. Idempotent recovery requires it.

## X. ACTUAL MISSING EDGE-ADAPTER CAPABILITIES
1. **Odds Change Resolver:** Logic to detect `.bet-accept-change` and explicitly click `.af-button--primary:has-text("Accept")`.
2. **Virtual Keyboard Mapper:** Translator that converts an integer (e.g., `1000`) into a sequential queue of commands targeting `[data-key="1"]`, `[data-key="0"]`, etc., spaced by 250ms.
3. **Modal Focus Interceptor:** Logic mapping modal confirmation steps to `focus()` prior to `click()`.

## Y. TARGET-SPECIFIC CONFIGURATION REQUIREMENTS
The adapter will need JSON configuration specifying the exact modal bounding boxes, the `.m-betslips-show` shadow boundary, and the `/api/ng/order/placeOrder` CDP network interception path.

## Z. UNKNOWN / UNVERIFIED AREAS
It remains unverified whether SportyBet exposes a reliable `/orders/history` endpoint that can be queried synchronously to resolve `UNCERTAIN` timeouts without relying strictly on `.avatar-box` deduction logic.

## AA. RECOMMENDED PRE-IMPLEMENTATION CHANGES
1. Upgrade `ActionSimulator.mjs` to accept `type: 'event_burst'` commands.
2. Implement a `VirtualKeyboardManager` abstract class that translates a numeric string into localized click queues with inter-command delay promises.
3. Upgrade `EdgeStateMachine.mjs` to introduce the `UNCERTAIN` terminal state alongside `SUBMITTED` and `ABORTED`.
4. Ensure `ActionSimulator` captures timeout exceptions (`PlaywrightTimeoutError`) during submissions and explicitly routes them to `UNCERTAIN` instead of transparently retrying.

## AB. IMPLEMENTATION READINESS ASSESSMENT

**Status: NOT_READY**

1. **What the existing engine already handles correctly:** DOM isolation, multiple-match disambiguation, element observation hashing (stability), error telemetry, and Playwright execution routing.
2. **What is genuinely missing:** A primitive for Event Saturation (touch emulation), a Virtual Keyboard abstraction with strict intra-command pacing, and an `UNCERTAIN` state for network timeouts.
3. **What is merely target-specific:** The mapping of `1000` to `[data-key="1"]`, `.betslip-notification` logic, and `.m-login-yes` auth flags.
4. **What is dangerous despite appearing supported:** Generic execution retries on timeout. If `/placeOrder` hangs, retrying the click will cause duplicate bets.
5. **What must be changed before adapter implementation:** The `ActionSimulator` must be extended to support custom event arrays and non-fatal timeouts. The `EdgeStateMachine` must be decoupled from a naive `PRE_FLIGHT` -> `EXECUTING` jump to handle active UI interruptions (like Odds Changed modals).
6. **What does NOT need to be changed:** The generic locator engine, the node/playwright routing structure, and the mathematical `PricingSolver` constraints.
7. **What should remain outside the generic engine:** All selector strings, the 250ms exact timing constant, and the specific `acceptOddsChange` HTTP headers.
