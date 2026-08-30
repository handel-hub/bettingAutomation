# SportyBet Behavioral Edge Adapter Specification

This document is a lossless technical extraction, normalization, correlation, and extrapolation of the SportyBet mobile web interface investigation. It serves as the behavioral specification for a Browser Edge adapter.

---

## A. Executive Behavioral Model

**[OBSERVED]** The target application (`https://www.sportybet.com/ng/m/`) is a Single Page Application (SPA).
**[OBSERVED]** The frontend utilizes Vue.js, identifiable by `data-v-` scoped attributes.
**[OBSERVED]** The UI is highly reactive. State changes (like balance updates or odds fluctuations) result in dynamic element replacement rather than simple text updates.
**[INFERRED]** Because Vue.js manages the DOM via a Virtual DOM buffer, standard synchronous browser automation interactions (like typing into inputs) fail. Interactions must simulate high-fidelity mobile touch events and respect specific settling delays to align with internal framework tick cycles.
**[OBSERVED]** The application uses complex CSS layering (z-index) and absolute positioning within flex containers. Modals and overlays (`.m-fast-betslip-wrap`, `.dialog-mask`) block interaction with underlying elements.

---

## B. Complete Component Inventory

| Component Name           | Purpose                                  | Selector(s)                                                  | Tag             | Parent                 | Children / Traits                      | Stability & Behavior                                                                                                                                              |
| :----------------------- | :--------------------------------------- | :----------------------------------------------------------- | :-------------- | :--------------------- | :------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Balance Container**    | Stable observation boundary for balance  | `.avatar-box`                                                | `div`           | Complex flexbox        | `.currency`, `span:not(.currency)`     | **[OBSERVED]** Stable. Survives Vue re-renders.                                                                                                                   |
| **Balance Amount**       | Displays numeric user funds              | `.avatar-box span:not(.currency)`                            | `span`          | `.avatar-box`          | Text node (e.g., `31.05`)              | **[OBSERVED]** Highly dynamic. Element is completely replaced on update.                                                                                          |
| **Balance Currency**     | Displays fiat currency                   | `.avatar-box span.currency`                                  | `span`          | `.avatar-box`          | Text node (e.g., `NGN`)                | **[OBSERVED]** Replaced during reactive updates.                                                                                                                  |
| **Match Detail Root**    | Main container for betting markets       | `.m-prematch-detail`                                         | `div`           | `body`/app root        | Markets, odds                          | **[OBSERVED]** Background layer, unclickable when overlay active.                                                                                                 |
| **Live Match List**      | Dynamic match feed                       | `.live-container`                                            | `div`           | `body`/app root        | Match rows                             | **[OBSERVED]** Dynamic content area.                                                                                                                              |
| **Fast Betslip Overlay** | High-priority UI layer for rapid betting | `.m-fast-betslip-wrap`                                       | `div`           | App root               | Odds, Stake, Keyboard                  | **[OBSERVED]** High z-index (>100). Exists in DOM even if hidden. Must check `offsetParent !== null` or `display: block`.                                         |
| **Live Odd Value**       | Displays selected odd multiplier         | `.m-outcome-odds`                                            | `span`          | `.m-fast-betslip-wrap` | Text node (e.g., `2.15`)               | **[OBSERVED]** Fluctuates via XHR. Updates trigger Potential Win recalculation.                                                                                   |
| **Outcome Selection**    | Description of chosen outcome            | `.m-outcome-desc`                                            | `span`          | `.m-fast-betslip-wrap` | Text node                              | **[OBSERVED]** Contains selection name.                                                                                                                           |
| **Market Description**   | Description of market category           | `.m-desc`                                                    | `span`          | `.m-fast-betslip-wrap` | Text node                              | **[OBSERVED]** Contains market name.                                                                                                                              |
| **Stake Display**        | Custom numeric input mirror              | `span.m-keybord-input` / `.m-keybord-input`                  | `span`          | `.m-fast-betslip-wrap` | Text node (e.g., `1055`, `min. 10.00`) | **[OBSERVED]** Custom UI, not standard `<input>`. Receives `.m-input--placeholder` when empty, `.m-input-err` when invalid.                                       |
| **Potential Win**        | Calculated return                        | `.stake-info-wrap .value`                                    | `span`          | `.m-fast-betslip-wrap` | Text node                              | **[OBSERVED]** Reactive field. Updates asynchronously based on Stake \* Odds.                                                                                     |
| **Place Bet Button**     | Main submission trigger                  | `.place-bet`, `span[data-op="single-placebet"]`              | `span`/`button` | `.m-fast-betslip-wrap` | Text node                              | **[OBSERVED]** Logic-gated. Receives `.bet-disabled` on errors, `.bet-accept-change` on odds fluctuation. Text alternates between "Place Bet" and "Accept & Bet". |
| **Numeric Keyboard**     | Custom input component                   | `.m-keyboard`                                                | `div`           | `.m-fast-betslip-wrap` | Keys                                   | **[OBSERVED]** Event-driven custom UI. High z-index blocks screen.                                                                                                |
| **Numeric Keys**         | Individual digits / actions              | `[data-key="X"]` (e.g., `"1"`, `"clear"`, `"done"`, `"500"`) | `span` / `div`  | `.m-keyboard`          | None                                   | **[OBSERVED]** Requires `touchstart`/`touchend` or event saturation to trigger. Preset `"500"` mapped to `r-plus-3`.                                              |
| **Notification Area**    | Alerts for odds changes/errors           | `.betslip-notification`                                      | `div`           | `.m-fast-betslip-wrap` | Text node                              | **[OBSERVED]** Empty (`<!---->`) initially. Populates text on error (e.g. "Odds have changed...").                                                                |
| **Update Default Stake** | Checkbox setting                         | `[data-op="r-default-stake-cb"]`, `.update-default-stake`    | `div`           | `.m-fast-betslip-wrap` | `<i>`, `<span>`                        | **[OBSERVED]** Not a true `<input>`. State tracked by `.m-icon-check--active` on child `<i>`.                                                                     |
| **Close Overlay**        | Button to dismiss slip                   | `[data-op="betslip-close"]`                                  | `span`/`button` | `.m-fast-betslip-wrap` | None                                   | **[OBSERVED]** Used to reset state after hard errors.                                                                                                             |
| **Login Indicator**      | Proves authenticated state               | `.m-login-yes`                                               | `div`/`span`    | Header                 | None                                   | **[OBSERVED]** Used as a pre-execution guard.                                                                                                                     |
| **Dialog Mask**          | Modal backdrop                           | `.dialog-mask`                                               | `div`           | App root               | Modals                                 | **[OBSERVED]** Dynamic modal backdrop (e.g., `uid=98965`). Appears after confirming bet.                                                                          |
| **Confirm Button**       | Final placement approval                 | `button.af-button.af-button--primary.flexibet-confirm`       | `button`        | Modal                  | Text: "Confirm"                        | **[OBSERVED]** Appears dynamically. Requires `focus()` then `MouseEvent('click')`.                                                                                |
| **Cancel Button**        | Cancels placement                        | `button.af-button.af-button--primary.flexibet-cancel`        | `button`        | Modal                  | Text: "Cancel"                         | **[OBSERVED]** Appears alongside Confirm.                                                                                                                         |
| **Rebet Button**         | Restores betslip                         | `button.af-button.rebet.af-button--primary`                  | `button`        | Modal                  | Text: "Rebet"                          | **[OBSERVED]** Appears post-result. Restores previous stake (e.g., `8000`).                                                                                       |
| **OK Button**            | Acknowledges modal                       | `button.btn`                                                 | `button`        | Modal                  | Text: "OK"                             | **[OBSERVED]** Standard modal dismissal.                                                                                                                          |

---

## C. Identity / Relationship Model

**[OBSERVED]** Target path for isolation:
`MATCH` (`.live-container` / `.m-prematch-detail`)
→ `MARKET` (`.m-desc`)
→ `SELECTION` (`.m-outcome-desc`)
→ `ODD` (`.m-outcome-odds`)
→ `BETSLIP` (`.m-fast-betslip-wrap`)
→ `STAKE` (`.m-keybord-input`)
→ `POTENTIAL WIN` (`.stake-info-wrap .value`)

**[INFERRED]** The identity chain relies on the overlay isolation. Because `.m-fast-betslip-wrap` utilizes a high z-index and blocks background interactions, only one Selection context can be actively modeled in the Fast Betslip at any given time. Validation of `.m-outcome-desc` and `.m-vs-desc` inside the wrapper provides deterministic confirmation of the intended identity.

---

## D. Observable State Machine

| State                 | Entry Condition             | Observable Signature                                                                                                    | Interruptions                   |
| :-------------------- | :-------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :------------------------------ |
| **NO_BETSLIP**        | Default state.              | `.m-fast-betslip-wrap` has `offsetParent === null` or is missing.                                                       | N/A                             |
| **FAST_BETSLIP_OPEN** | Click on `.m-outcome-odds`  | `.m-fast-betslip-wrap` is visible (`display: block`).                                                                   | Network failure.                |
| **STAKE_EDITING**     | Click on `.m-keybord-input` | `.m-keyboard` covers screen. `.m-input--placeholder` may be present.                                                    | N/A                             |
| **STAKE_VALIDATING**  | Internal Vue evaluation     | `.m-keybord-input` value updates, `.stake-info-wrap .value` recalculating.                                              | Odds change during calculation. |
| **READY_TO_SUBMIT**   | Settling delays complete    | `.place-bet` has text "Place Bet", lacks `.bet-disabled`, lacks `.bet-accept-change`. `.betslip-notification` is empty. | Odds change.                    |
| **ODDS_CHANGED**      | XHR background push         | `.betslip-notification` populates text. `.place-bet` text includes "Accept" or gains `.bet-accept-change`.              | Market suspension.              |
| **HARD_ERROR**        | Stake > Balance             | `.m-keybord-input` has `.m-input-err`. `.place-bet` has `.bet-disabled`.                                                | Close action.                   |
| **CONFIRM_MODAL**     | Clicked Place Bet           | `.dialog-mask` exists. `flexibet-confirm` is visible.                                                                   | Network timeout.                |
| **PROCESSING**        | Clicked Confirm             | `flexibet-confirm` disappears. `.dialog-mask` remains with spinner.                                                     | Network timeout.                |
| **RESULT_MODAL**      | Processing finished         | `.dialog-mask` exists. `rebet` or `btn` (OK) buttons appear.                                                            | N/A                             |

---

## E. State Transition Table

| Current State    | Event (Action)              | Observable Change                                  | Next State       | Evidence       | Timing                |
| :--------------- | :-------------------------- | :------------------------------------------------- | :--------------- | :------------- | :-------------------- |
| FAST_BETSLIP     | Saturation Clear Event      | `.m-input--placeholder` appears, text = "min. X"   | STAKE_EDITING    | **[OBSERVED]** | 150ms verification    |
| STAKE_EDITING    | Saturation Digit Event      | Text appends digit (e.g. `10` -> `105`)            | STAKE_VALIDATING | **[OBSERVED]** | 200ms settling        |
| STAKE_VALIDATING | Vue framework tick          | `.stake-info-wrap .value` updates                  | READY_TO_SUBMIT  | **[OBSERVED]** | 250ms total           |
| READY_TO_SUBMIT  | Saturation Place Bet        | `.dialog-mask` appears, Confirm button present     | CONFIRM_MODAL    | **[OBSERVED]** | 300ms modal animation |
| CONFIRM_MODAL    | `focus()` + `click()`       | `flexibet-confirm` removed, `.dialog-mask` remains | PROCESSING       | **[OBSERVED]** | N/A                   |
| PROCESSING       | Network Response            | `rebet` or `btn` appears                           | RESULT_MODAL     | **[OBSERVED]** | Variable              |
| RESULT_MODAL     | `focus()` + `click()` Rebet | Modal dismisses, Stake restores (e.g., `8000`)     | FAST_BETSLIP     | **[OBSERVED]** | N/A                   |
| READY_TO_SUBMIT  | Odds XHR Update             | `.betslip-notification` populates                  | ODDS_CHANGED     | **[OBSERVED]** | Asynchronous          |
| STAKE_VALIDATING | Invalid stake (e.g., > Bal) | `.m-input-err` added, `.bet-disabled` added        | HARD_ERROR       | **[OBSERVED]** | Instant via Vue       |

---

## F. Stake Input Contract

**[OBSERVED]** The stake input is entirely custom. It does not accept standard HTML `<input type="text">` injection.
**[OBSERVED]** When empty, the `.m-keybord-input` element gains the class `.m-input--placeholder` and its inner text changes to a minimum indicator (e.g., "min. 10.00").
**[OBSERVED]** A valid digit append (e.g., sending `5` to a baseline of `10` resulting in `105`) triggers internal Vue logic that recalculates the Potential Win.
**[OBSERVED]** Inputting a stake (e.g., `1055`) that exceeds the observed balance (`31.05`) immediately triggers the `.m-input-err` class on the input and disables the placement button.

---

## G. Keyboard Interaction Contract

**[OBSERVED]** Keyboard keys are identified by the `data-key` attribute (e.g., `[data-key="1"]`, `[data-key="clear"]`, `[data-key="done"]`).
**[OBSERVED]** "Event Saturation" strategy is strictly required. Standard clicks fail due to Vue expecting mobile events.
**[OBSERVED]** Event Burst Sequence: `['touchstart', 'touchend', 'mousedown', 'mouseup', 'click']` all dispatched with `{ bubbles: true }`.
**[OBSERVED]** After typing is complete, the script should click `[data-key="done"]` to hide the keyboard and clear the viewport for the `.place-bet` button.

---

## H. Odds Validation Contract

**[OBSERVED]** Odds change alerts are managed by the `.betslip-notification` container.
**[OBSERVED]** The container is normally empty `<!---->`. It populates with text (e.g., "Odds have changed. Please accept the new odds.") when fluctuations occur.
**[OBSERVED]** The `place-bet` button visually and structurally changes during odds fluctuations:

- Text may change to "Accept & Bet".
- The class `.bet-accept-change` is appended.
  **[INFERRED]** The "Accept all odds changes" setting is absent from the Fast Betslip overlay. Automation must rely on the `.betslip-notification` observer as a synchronous pre-flight guard.

---

## I. Balance Observation Contract

**[OBSERVED]** Target URL: `https://www.sportybet.com/ng/m/`. Observed Currency: `NGN`.
**[OBSERVED]** The balance value (`31.05`) resides in `.avatar-box span:not(.currency)`.
**[OBSERVED]** The parent `.avatar-box` is highly stable. The child `span` is structurally volatile (destroyed and re-created by Vue on update).
**[INFERRED]** A `MutationObserver` on the leaf node will orphan. Automation must observe `.avatar-box` with `{ childList: true, characterData: true, subtree: true }` configuration.

---

## J. Submission Contract

**[OBSERVED]** The `place-bet` button triggers the validation sequence.
**[OBSERVED]** Standard interaction: Event Saturation burst on `.place-bet`.
**[OBSERVED]** Pre-Flight Invariants: `.m-keybord-input` must lack `.m-input-err`. `.place-bet` must lack `.bet-disabled` and `.bet-accept-change`. `.betslip-notification` must be empty.

---

## K. Processing Contract

**[OBSERVED]** After `.place-bet`, a modal appears with a Confirm button (`.flexibet-confirm`).
**[OBSERVED]** To successfully click Confirm, complex touch logic is inferior to a Direct Browser Click Sequence.
**[OBSERVED]** Sequence:

1. Wait ~300ms for entry animation.
2. `document.querySelector('button.flexibet-confirm').focus()` (Critical to "arm" Vue listeners).
3. Dispatch standard `MouseEvent('click', { bubbles: true, cancelable: true })`.
   **[OBSERVED]** Following confirmation, the button disappears but `.dialog-mask` remains during network processing.

---

## L. Result Contract

**[OBSERVED]** The resolution of the `.dialog-mask` phase results in new buttons appearing (`rebet` or `btn` OK).
**[INFERRED]** Do not infer success merely from button disappearance. Success or failure is strictly defined by the appearance of the terminal modal state buttons or specific API payload responses.

---

## M. Settlement Contract

**[INFERRED]** The source material distinguishes balance mutation from bet submission. The balance updates reactively upon successful placement and again upon settlement (win/loss). A balance drop confirms execution success independently of the UI modal state.

---

## N. Rebet Contract

**[OBSERVED]** The `button.af-button.rebet` was successfully clicked using the `focus()` + `click()` sequence.
**[OBSERVED]** Result of Rebet action: The success-dialog is dismissed (`dialogVisible: false`), the betslip re-opens, and the **stake is restored to its previous value** (e.g., returning to `8000` after a successful `10` bet reset).
**[INFERRED]** Rebet maintains a local cache of the user's intended state, bypassing the need to re-execute the Stake Input Contract.

---

## O. Error Taxonomy

| Trigger / Condition                | Observable State                                                  | Resolution / Action                                       | Evidence       |
| :--------------------------------- | :---------------------------------------------------------------- | :-------------------------------------------------------- | :------------- |
| Stake > Balance (`1055` > `31.05`) | `.m-input-err` on input, `.bet-disabled` on button                | Hard Error. Click `[data-op="betslip-close"]` to restart. | **[OBSERVED]** |
| Odds Change                        | `.betslip-notification` populates, `.bet-accept-change` on button | Interruption. Must halt placement or accept odds.         | **[OBSERVED]** |

---

## P. Modal/Dialog Contract

**[OBSERVED]** Modals exist under `.dialog-mask`.
**[OBSERVED]** Z-index issues are prevalent. Elements underneath (`.m-prematch-detail`) are completely blocked.
**[OBSERVED]** Focus management is mandatory. Buttons inside modals (`flexibet-confirm`, `rebet`, `btn`) must receive a `.focus()` call prior to receiving a synthetic `click()` event, otherwise Vue discards the interaction.

---

## Q. Mutation Observation Contract

**[OBSERVED]** The "Golden Config" for Vue.js stability tracking is:

```javascript
{
  childList: true,      // Detects Vue replacing the element wrapper
  characterData: true,  // Detects direct text mutation
  subtree: true         // Monitors all nested nodes inside the stable parent
}
```

**[OBSERVED]** For `.place-bet` state monitoring, `attributeFilter: ['class']` is highly recommended to precisely detect the addition/removal of `.bet-disabled` and `.bet-accept-change` without polling.

---

## R. DOM Stability / Selector Contract

| Selector          | Element        | Stability Classification  | Notes                                   |
| :---------------- | :------------- | :------------------------ | :-------------------------------------- |
| `.avatar-box`     | Balance Parent | **A (Highly Stable)**     | Safe structural boundary                |
| `[data-key="X"]`  | Keyboard Keys  | **B (Reasonably Stable)** | Standard attribute mapping              |
| `.place-bet`      | Action Button  | **C (Dynamic)**           | Classes and text mutate wildly          |
| `.m-outcome-odds` | Price Value    | **D (Text-dependent)**    | Replaced frequently                     |
| `<input>`         | Stake Field    | **F (Unsafe)**            | Does not exist; uses `.m-keybord-input` |

---

## S. Multiple-Element / Identity Resolution

**[OBSERVED]** Only one Fast Betslip overlay operates at a time (`.m-fast-betslip-wrap`).
**[INFERRED]** While multiple odds exist on the page (`.m-outcome-odds` in the `.live-container`), the active identity is perfectly isolated once the Fast Betslip is triggered. Scoping `querySelector` to `.m-fast-betslip-wrap` guarantees single-element resolution for odds, stake, and buttons.

---

## T. Event Contract

**[OBSERVED]** Standard `element.click()` fails on interactive betting components (Keyboard, Overlay buttons).
**[OBSERVED]** The Event Saturation burst guarantees interaction by bypassing platform-specific device filters:

```javascript
const events = ["touchstart", "touchend", "mousedown", "mouseup", "click"];
events.forEach((name) => el.dispatchEvent(new Event(name, { bubbles: true })));
```

**[OBSERVED]** Conversely, for Modal buttons (`Confirm`, `Rebet`), the Saturation burst is replaced by the Focus-Click pattern: `el.focus(); el.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));`

---

## U. Timing and Race Conditions

| Operation                 | Observed Timing | Meaning / Purpose                                                                                                     |
| :------------------------ | :-------------- | :-------------------------------------------------------------------------------------------------------------------- |
| Post-Mutation Settling    | `100 ms`        | Minimum delay required after a DOM mutation before reading derived values (e.g., Potential Win).                      |
| Clear Stake Verification  | `150 ms`        | Delay required between firing `clear` and verifying `.m-input--placeholder`.                                          |
| Single Digit Verification | `200 ms`        | Delay required for Vue to update the Virtual DOM and reflect a typed digit.                                           |
| Inter-Digit Keystroke     | `250 ms`        | **CRITICAL:** Delay required between sequential numeric key presses. Prevents Vue buffer overflow and dropped digits. |
| Modal Entry Animation     | `300 ms`        | Wait time required for `.dialog-mask` and `flexibet-confirm` to finish animating before firing `focus()`.             |
| Fallback Polling          | `5000 ms`       | Background safety poll interval to recover if MutationObserver paths break.                                           |

---

## V. Network ↔ DOM Correlation

**[OBSERVED]** The 'Place Bet' action triggers a POST to `https://www.sportybet.com/api/ng/orders/place` (or `/orders/v2`).
**[OBSERVED]** Payload fields identified: `selectionId`, `odd` (e.g., `2.15`), `stake` (e.g., `1000`), `acceptOddsChange`, `source` (`"wap"`).
**[OBSERVED]** Network requires valid `accessToken` and `cipher`.
**[OBSERVED]** Background polling identified on `/api/ng/orders/config` and `/api/ng/promotion/v1/loyalty`.

---

## W. Framework Behavior

**[OBSERVED]** Framework is Vue.js.
**[OBSERVED]** Nodes are completely replaced on state change, requiring parent-level observation.
**[OBSERVED]** Event listeners are heavily optimized. Some elements require explicit `.focus()` to arm the internal Vue `v-on` directives prior to synthetic event dispatch.
**[INFERRED]** It may be possible to access internal state via `__vue__` properties on DOM nodes if not stripped in production, providing an alternative to strict DOM scraping.

---

## X. Authentication / Session Behavior

**[OBSERVED]** Authenticated state is confirmed by the presence of `.m-login-yes` in the DOM.
**[INFERRED]** Without `.m-login-yes`, the script should not attempt to observe the balance or place bets.

---

## Y. Automation Safety Invariants

**[OBSERVED]** **Pre-Stake Invariant:** Must read `.avatar-box span:not(.currency)` to determine the hard cap on valid stakes before initiating keyboard interaction.
**[OBSERVED]** **Execution Guard 1:** `.place-bet` must absolutely lack the `.bet-disabled` class.
**[OBSERVED]** **Execution Guard 2:** `.betslip-notification` must be empty, proving no unaccepted price fluctuations exist.
**[OBSERVED]** **Keyboard Exit:** Must click `[data-key="done"]` to ensure the high z-index `.m-keyboard` does not block the final `place-bet` click coordinates.

---

## Z. Unknown / Unverified Behaviors

**[UNKNOWN]** The exact API response payload for successful vs failed bet placement was not documented, meaning resolution relies heavily on terminal UI states (`rebet` button presence) or subsequent balance mutation.
**[UNKNOWN]** Whether `.flexibet-cancel` gracefully restores the Fast Betslip or completely destroys the selection context was not explicitly tested.

---

# Observed Experiment Registry

### Experiment: Robust Clear Flow

- **Objective:** Clear the current stake value.
- **Initial State:** Input has existing value.
- **Action:** Event Saturation on `[data-key="clear"]`.
- **Timing:** `150ms` loop.
- **DOM After:** `.m-keybord-input` gains `.m-input--placeholder`. Text changes to "min. 10.00".
- **Result:** **[OBSERVED]** Success on attempt 1.

### Experiment: Robust '2' Input Flow

- **Objective:** Append digit to empty stake.
- **Initial State:** Stake is empty (placeholder present).
- **Action:** 1) `click()` on `.m-keybord-input` to focus. 2) Event Saturation on `[data-key="2"]`.
- **Timing:** `200ms` settling.
- **DOM After:** `.m-input--placeholder` removed. Text exactly matches "2".
- **Result:** **[OBSERVED]** Success. Vue.js reactivity verified.

### Experiment: Digit Append ('1' to '30')

- **Objective:** Verify digit accumulation.
- **Initial State:** Stake value is `30`.
- **Action:** Event Saturation on `[data-key="1"]`.
- **Timing:** `250ms` simulated.
- **DOM After:** Stake value is `301`.
- **Result:** **[OBSERVED]** Success. Proves data-key mapping and string appendage behavior.

### Experiment: Confirm Button Execution

- **Objective:** Successfully click the dynamic modal confirm button.
- **Initial State:** `.dialog-mask` and `flexibet-confirm` present.
- **Action:** `.focus()` followed by `MouseEvent('click')`.
- **DOM After:** Confirm button removed from DOM. `.dialog-mask` remains for processing.
- **Result:** **[OBSERVED]** Success. Proves saturation is unnecessary for modal buttons if focus is managed.

### Experiment: Rebet Execution

- **Objective:** Click Rebet and observe state restoration.
- **Initial State:** Result modal present with `.rebet` button.
- **Action:** `.focus()` followed by `click()`.
- **DOM After:** Modal dismisses. Betslip re-opens. Stake text restores to `8000` (previous value).
- **Result:** **[OBSERVED]** Success. Proves Rebet preserves state cache.

---

_End of Specification._
