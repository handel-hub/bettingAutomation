# Amount/Pricing System: Validation & Implementation Plan

This document represents the definitive VALIDATION and IMPLEMENTATION-PLANNING audit of the existing generic Amount/Price engine against the finalized SportyBet Browser Edge Behavioral Specification v2. 

---

## 1. PREVIOUS AUDIT VALIDATION MATRIX

| ID | Previous Finding | Specification Requirement | Current Engine Behavior | Validation Result | Evidence | Required Action |
|---|---|---|---|---|---|---|
| 01 | Missing Event Saturation Primitive | Target filters clicks on `.m-keyboard`; requires `touchstart`->`click` burst. | `ActionSimulator.mjs` (L433) invokes standard `loc.click()`. | `[CONFIRMED GAP]` | `ActionSimulator` strictly uses native Playwright clicks. Touch-filtering SPAs will drop these events. | Add `EVENT_BURST` / `TOUCH_CLICK` primitive to `ActionSimulator.mjs`. |
| 02 | Missing Virtual Keyboard Pacing | Target requires 250ms between key clicks; rejects `<input>`. | `ActionSimulator.mjs` (L482) uses `loc.fill()` or `pressSequentially`. | `[ARCHITECTURAL GAP]` | The generic engine assumes string text injection into HTML inputs. | Add generic `MACRO_SEQUENCE` support to execute mapped `EVENT_BURST` commands with strict inter-command delays. |
| 03 | Missing `ODDS_CHANGED` Resolution | Target spawns `.betslip-notification` requiring `.af-button--primary` click. | `EdgeStateMachine.mjs` treats hash mismatch as TOCTOU failure and resets to `OBSERVING`. | `[ARCHITECTURAL GAP]` | The engine lacks an interrupt state for explicitly accepting price mutations. | Add `PRICE_CHANGED` -> `PRICE_ACCEPTANCE` transitions to `EdgeStateMachine`. |
| 04 | Dangerous Timeout Retries | Target processing hangs must yield `UNCERTAIN` to prevent duplicate bets. | `ActionSimulator.mjs` (L320) catches `PlaywrightTimeoutError` and retries execution. | `[CONFIRMED GAP]` | `_executeWithRecovery` loops up to `MAX_EXECUTION_RETRIES`. | Add `idempotent: false` flag to commands. If false, timeouts immediately yield `UNCERTAIN` state. |
| 05 | Rebet Modal Cache Collision | Target caches previous selection and stake in UI upon `.rebet` click. | `SequenceOrchestrator.mjs` generates a new UUID and treats it as a fresh sequence. | `[PARTIALLY VALIDATED]` | The orchestrator doesn't force a UI reset, but fails to inform the edge to utilize the cached UI state. | Pass `continuationState: { isRebet: true }` to Edge to trigger alternate UI paths. |
| 06 | Wait for Derived Value (Win) | Target `.potential-win` calculates asynchronously after stake entry. | `PricingObserver.mjs` waits for generic DOM stability. | `[UNNECESSARY CHANGE]` | The generic hash stability natively captures Vue virtual DOM flushes. | No core engine change. Adapter simply monitors the `.potential-win` node. |

---

## 2. SPECIFICATION → ENGINE TRACEABILITY MATRIX

### A. Amount Representation
* **Stake Representation:** Engine uses `PricingSolver.mjs` `[VALIDATED]`.
* **Minimum/Maximum Constraints:** Handled in `activePolicy` math `[VALIDATED]`.
* **Amount Formatting/Translation:** Engine lacks abstraction mapping a logical amount (`1000`) to specific UI actions (clicking keypad) `[CONFIRMED GAP]`.
* **Empty/Invalid Amount:** Engine assumes inputs are implicitly clearable `[ARCHITECTURAL GAP]`.

### B. Price/Odds Representation
* **Current Price:** Parsed by `PricingObserver.mjs` `[VALIDATED]`.
* **Price Changes:** TOCTOU protected in `PRE_FLIGHT` `[VALIDATED]`.
* **Price Acceptance:** Engine loops instead of explicitly accepting `[CONFIRMED GAP]`.

### C. Potential Win / Derived Values
* **Recalculation Behavior:** Engine captures hash changes during UI ticks `[VALIDATED]`.

### D. Validation
* **Combined Validation (Amount > Balance):** Handled math side `[VALIDATED]`, but UI-side error toasts (`.m-input-err`) lack explicit generic observer states `[CONFIRMED GAP]`.

### E. State Modeling
* **Current engine states:** `IDLE`, `OBSERVING`, `EVALUATING`, `RESOLVING`, `SELECTING`, `READY`, `PRE_FLIGHT`, `EXECUTING`, `SUBMITTED`.
* **Missing required semantics:** `AMOUNT_EDITING`, `PRICE_MUTATED`, `CONFIRMING`, `UNCERTAIN`, `FAILED`. `[ARCHITECTURAL GAP]`.

### F. Event / State Transitions
* **Input -> Validation -> Price Mutation:** Engine resets entirely on mutation, creating a race where rapid odds changes prevent bet placement `[CONFIRMED GAP]`.

### G. Browser Edge Integration
* **DOM-driven state:** Handled by `PricingObserver.mjs` `[VALIDATED]`.
* **Submission Uncertainty:** Treats as Playwright Timeout `[CONFIRMED GAP]`.

---

## 3. VALIDATED CURRENT-STATE ASSESSMENT
The existing generic engine successfully models:
- **Math/Policy Evaluation:** `PricingSolver.mjs` cleanly intersects limits.
- **TOCTOU Safety:** `EdgeStateMachine` ensures the DOM hash at `EVALUATING` strictly matches `PRE_FLIGHT`.
- **Dynamic Stability:** The `DOM_MUTATED` -> `DOM_STABLE` debounce correctly prevents reading mid-render values.
- **Multiple-Match Isolation:** `LocatorResolver` correctly restricts interaction to the provided shadow paths.

---

## 4. CONFIRMED GAPS
1. **Physical Input Primitive:** The generic engine cannot interact with custom touch-filtered virtual keypads because it strictly uses `element.fill()` and native `element.click()`.
2. **Indeterminate Execution State:** `ActionSimulator` indiscriminately retries timeouts. Non-idempotent operations (like clicking `.place-bet`) must return `UNCERTAIN`.
3. **Interrupt Transitions:** The `EdgeStateMachine` lacks a first-class `PRICE_CHANGED` state to handle UI modals that ask for odds acceptance.
4. **Multi-Step Execution Execution:** The `EXECUTING` state assumes a single command. The target requires `Click Submit` -> `Wait for Confirm Modal` -> `Click Confirm`.

---

## 5. ARCHITECTURAL BOUNDARY ASSESSMENT

| Behavior | Responsibility Layer | Reason |
|---|---|---|
| Parsing `.m-outcome-odds` | Browser Edge Adapter | Selectors belong entirely to target-specific adapters. |
| Event Saturation (`touchstart`) | Generic Engine | SPAs globally use touch filtering; engine needs the generic capability. |
| Mapping `1000` to `[data-key="1"]` | Browser Edge Adapter | Keyboard localization and UI flow is target-specific. |
| `250ms` inter-digit typing delay | Browser Edge Adapter | Engine provides the delay feature; adapter sets the value. |
| Detecting `.bet-accept-change` | Browser Edge Adapter | Adapter translates specific CSS into generic `PriceChange` events. |
| Halting execution on PriceChange | Generic Engine | `EdgeStateMachine` must hold execution until explicitly resolved. |
| Defining `UNCERTAIN` result | Generic Engine | The concept of an indeterminate timeout is fundamental to distributed systems. |

---

## 6. DATA MODEL ASSESSMENT
**Entities Needed in Generic Engine:**
- `Amount`: (Value Object) `logicalValue` (Number).
- `Price`: (Value Object) `multiplier` (Number).
- `ExecutionResult`: (Enum) `SUCCESS`, `FAILURE`, `UNCERTAIN`.
- `Command`: Add `idempotent` (Boolean) to flag retry safety.

**Entities Currently Flawed:**
- `Command.payload.value`: Assumes string injectability. Must be refactored to allow an array of sub-commands or rely on adapter-side expansion.

---

## 7. STATE MODEL ASSESSMENT
**Target Generic State Model for `EdgeStateMachine.mjs`:**
* `IDLE`: Awaiting start.
* `OBSERVING`: Hashing DOM, waiting for stability.
* `EVALUATING`: Math intersection.
* `SELECTING`: Behavioral preferences.
* `READY`: Stake locked, waiting authorization.
* `PRE_FLIGHT`: TOCTOU check.
* `EXECUTING`: Commands dispatched.
* **[NEW]** `INTERRUPTED_PRICE`: Target requires explicit price acceptance.
* **[NEW]** `INTERRUPTED_CONFIRM`: Target requires explicit modal confirmation.
* `SUBMITTED`: Explicit receipt observed.
* **[NEW]** `UNCERTAIN`: Timeout occurred on non-idempotent action.
* **[NEW]** `FAILED`: Explicit rejection observed (e.g., balance error).

---

## 8. CONCURRENCY / RACE-CONDITION ASSESSMENT
* **Race:** Odds change while typing stake.
  * **Engine Strategy:** Adapter detects odds change, emits `PRICE_MUTATED`. Engine transitions from `EXECUTING` (input sub-commands) to `INTERRUPTED_PRICE`.
* **Race:** Network timeout during `/placeOrder`.
  * **Engine Strategy:** `Command(idempotent: false)` triggers. `ActionSimulator` catches `PlaywrightTimeoutError`, skips retry loop, and returns `Result: UNCERTAIN`. `EdgeStateMachine` transitions to `UNCERTAIN` and notifies Node via IPC to initiate `ReconciliationDaemon`.

---

## 9. API / INTERFACE ASSESSMENT
**Edge Adapter -> Generic Engine:**
* *Current:* IPC `AUTHORIZE_BET`, `SUBMISSION_RESULT`.
* *Target:* Add `INTERRUPT_REQUIRED` (for odds/confirmations). Add `EXECUTION_UNCERTAIN`.

**Generic Engine -> Execution (`ActionSimulator`):**
* *Current:* `execute(browserObj, command)`
* *Target:* Command must accept `type: 'EVENT_BURST'` and `options: { idempotent: false, timeout: 30000 }`.

---

## 10. DETAILED TARGET ARCHITECTURE
```text
[ Node: SequenceOrchestrator ]
       ↓ (Policy, sequenceId, isRebet)
[ Edge: IPC Bridge ]
       ↓
[ Edge: EdgeStateMachine ] <--- (Generic State Model)
       ↓ (Commands: Event Burst, Click, Await)
[ Edge: ActionSimulator ]  <--- (Generic Playwright Abstraction)
       ↓
[ Browser Edge Adapter ]   <--- (SportyBet Specifics)
       - Translates policy amount to keyboard clicks.
       - Maps `.betslip-notification` to INTERRUPTED_PRICE.
       - Maps `.m-icon-success` to SUCCESS.
```

---

## 11. DETAILED IMPLEMENTATION PLAN

### 1. Implementation Objective
Augment the generic engine with physical input primitives (event bursts, paced macros) and semantic submission safety (`UNCERTAIN` state, interrupt states) so the SportyBet edge adapter can be written securely without leaking specific selectors into the core.

### 2. Validated Current State
The math solvers (`PricingSolver.mjs`), DOM hashing (`PricingObserver.mjs`), and strict locator resolution logic are correct and require no changes.

### 3. Confirmed Gaps
* **Problem 1:** Cannot execute touches. **Desired:** `type: 'EVENT_BURST'` in `ActionSimulator`.
* **Problem 2:** Retries non-idempotent clicks on timeout. **Desired:** `idempotent: false` flag bypassing retries and yielding `UNCERTAIN`.
* **Problem 3:** State machine resets on odds change instead of accepting. **Desired:** `INTERRUPTED_PRICE` state in `EdgeStateMachine`.

---

## 12. MODULE-BY-MODULE CHANGE PLAN

### `src/browser/execution/Command.mjs`
* **Required Change:** Add `idempotent` boolean to constructor (defaults to true). Add `type` support for `EVENT_BURST` and `MACRO_DELAY`.

### `src/browser/execution/ActionSimulator.mjs`
* **Required Change:** 
  1. Add `EVENT_BURST` handler: dispatches `['touchstart', 'touchend', 'mousedown', 'mouseup', 'click']`.
  2. Modify `_executeWithRecovery`: If `!command.idempotent` and a `PlaywrightTimeoutError` occurs, throw a specialized `UncertainStateError` which does NOT loop up to `MAX_EXECUTION_RETRIES`.
  3. Add `MACRO_DELAY` handler: `await new Promise(r => setTimeout(r, command.payload.ms))`.

### `src/browser/pricing/EdgeStateMachine.mjs`
* **Required Change:**
  1. Add `INTERRUPTED_PRICE` and `INTERRUPTED_CONFIRM` to the state `switch`.
  2. When IPC receives `PRICE_ACCEPTED` from Node, transition back to `PRE_FLIGHT`.
  3. Change execution timeout logic: Instead of returning `TIMEOUT` (which implies failure), return `UNCERTAIN` and let the `ReconciliationDaemon` handle it.

---

## 13. EVENT / STATE FLOW PLAN

**Submission with Odds Interrupt:**
```text
READY -> Node Authorizes -> PRE_FLIGHT
PRE_FLIGHT -> Dispatches Place Bet Click -> EXECUTING
Adapter observes `.betslip-notification`
Adapter fires 'DOM_INTERRUPT' -> EdgeStateMachine transitions to INTERRUPTED_PRICE
EdgeStateMachine asks Node -> Node Authorizes Accept -> Dispatches Accept Click
EdgeStateMachine -> PRE_FLIGHT (re-hashes) -> EXECUTING
```

**Uncertain Timeout:**
```text
EXECUTING -> Dispatches Place Bet (idempotent: false)
Network hangs for 30s.
ActionSimulator throws UncertainStateError.
EdgeStateMachine transitions to UNCERTAIN.
IPC sends SUBMISSION_UNCERTAIN to SequenceOrchestrator.
SequenceOrchestrator hands off to ReconciliationDaemon.
```

---

## 14. TESTING STRATEGY
* **Unit Tests (`ActionSimulator`):** Send a command with `idempotent: false` to an unresponsive mock page. Assert that it fails after 1 attempt, not 3, and returns the Uncertain classification.
* **Unit Tests (`Event Burst`):** Provide a mock element with `click` prevented but `touchstart` allowed. Assert `EVENT_BURST` successfully triggers the underlying Vue mock.
* **State-Transition Tests (`EdgeStateMachine`):** Mock `DOM_INTERRUPT` during `EXECUTING`. Assert state successfully halts at `INTERRUPTED_PRICE` and recovers to `PRE_FLIGHT` on authorization.

---

## 15. IMPLEMENTATION ORDER
**Phase 1: Execution Primitives**
* *Objective:* Equip the engine to handle touch and delays.
* *Files:* `Command.mjs`, `ActionSimulator.mjs`.
* *Changes:* Add `EVENT_BURST`, `MACRO_DELAY`, `idempotent` logic.

**Phase 2: State Machine Interruption & Uncertainty**
* *Objective:* Support modal interrupts and indeterminate results.
* *Files:* `EdgeStateMachine.mjs`.
* *Changes:* Add `INTERRUPTED_PRICE`, `INTERRUPTED_CONFIRM`, `UNCERTAIN`.

**Phase 3: Controller Coordination**
* *Objective:* Ensure Node orchestration respects the new states.
* *Files:* `SequenceOrchestrator.mjs`.
* *Changes:* Parse `UNCERTAIN` IPC messages and trigger `ReconciliationDaemon`.

**Phase 4: Edge Adapter (Target Specific)**
* *Objective:* Build the SportyBet integration.
* *Files:* `src/browser/adapters/SportyBetAdapter.mjs` (New).
* *Changes:* Implement the virtual keyboard translator, DOM observers, and CSS mappings leveraging the upgraded generic engine.

---

## 16. ACCEPTANCE CRITERIA
1. **Uncertainty Protection:** Given a `click` command flagged as non-idempotent, if a timeout occurs, the engine makes exactly 1 physical attempt and explicitly returns `UNCERTAIN`, never `FAILED`.
2. **Virtual Keyboard Support:** The engine successfully translates an amount to an array of `EVENT_BURST` commands punctuated by strict time delays, passing through the `ActionSimulator` successfully.
3. **Interrupt Safety:** The state machine halts and enters `INTERRUPTED_PRICE` dynamically when the adapter emits an interrupt signal mid-execution, recovering automatically upon authorization.

---

## 17. MIGRATION / COMPATIBILITY STRATEGY
* **Breaking Change:** `EdgeStateMachine` states expanded. Any existing IPC listeners assuming `TIMEOUT` implies total failure must be updated to handle `UNCERTAIN`.
* **Migration Order:** Update `ActionSimulator` first (backward compatible). Update `EdgeStateMachine` second. Update Node IPC controllers third.

---

## 18. FINAL CHANGE INVENTORY

| Change ID | Module | Change Type | Requirement | Risk | Dependencies | Test Coverage |
|---|---|---|---|---|---|---|
| 001 | `ActionSimulator.mjs` | ADD | `EVENT_BURST` capability | Low | `Command.mjs` | `ActionSimulator.test.js` |
| 002 | `ActionSimulator.mjs` | ADD | `idempotent: false` timeout abort | High | None | `ActionSimulator.timeout.test.js` |
| 003 | `EdgeStateMachine.mjs` | MODIFY | Add `INTERRUPTED_PRICE` state | Medium | IPC Bridge | `EdgeState.test.js` |
| 004 | `EdgeStateMachine.mjs` | MODIFY | Add `UNCERTAIN` terminal state | High | Node Orchestrator | `EdgeState.uncertain.test.js` |
| 005 | `SequenceOrchestrator.mjs` | MODIFY | Handle `UNCERTAIN` IPC message | High | `ReconciliationDaemon` | `Orchestrator.test.js` |

---

## 19. REMAINING UNKNOWNS
* **[UNKNOWN]** It remains unverified if the target application possesses a client-side `/sync` endpoint that the edge adapter can query synchronously upon reaching `UNCERTAIN`, or if the `ReconciliationDaemon` strictly must rely on background polling of the bet history page.
