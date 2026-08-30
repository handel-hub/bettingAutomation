# SportyBet Behavioral Edge Adapter Specification v2

This document is a lossless technical extraction, normalization, correlation, and exhaustive summation of all SportyBet mobile web interface investigations (combining Fast Betslip analysis, Full Betslip analysis, and raw resource logs). It serves as the definitive behavioral specification for a Browser Edge adapter. 

---

## A. Executive Behavioral Model

**[OBSERVED]** The target application (`https://www.sportybet.com/ng/m/`) is a Single Page Application (SPA) utilizing Vue.js. 
**[OBSERVED]** The Vue.js framework is explicitly identifiable via `data-v-*` scoped styling attributes across the DOM.
**[OBSERVED]** The application maintains two distinct betslip execution contexts:
1. **The Fast Betslip (`.m-fast-betslip-wrap`)**: An immediate, high z-index overlay for rapid single-bet execution, typically triggered directly from a live odd.
2. **The Full Betslip (`.m-betslips.m-betslips-show`)**: A comprehensive drawer triggered via the bottom navigation icon, supporting multiple selections, settings, and complex bet types (Multiple, System).
**[OBSERVED]** The UI relies on highly reactive DOM replacement. When data changes (such as an odd fluctuation or balance update), the framework frequently replaces the entire DOM node rather than merely updating the `innerText` or `value` properties of an existing node.
**[INFERRED]** Because Vue.js manages the DOM state via a Virtual DOM buffer, standard synchronous browser automation (such as directly setting `.value` on an input or invoking standard `.click()` on custom interactive elements) frequently fails. Interactions require high-fidelity mobile touch simulation (Event Saturation) or explicit `scrollIntoViewIfNeeded()` + `.focus()` mechanics, combined with precise settling delays to allow internal framework tick cycles to complete.
**[OBSERVED]** The application architecture relies heavily on CSS `z-index` layering and absolute positioning within Flexbox containers. Modals and overlays intentionally block click interactions with underlying layers (like `.m-prematch-detail`). If a component is scrolled behind sticky headers (`.m-betslip-header`) or footers (`.fixed-footer-wrapper`), standard clicks will misfire.
**[OBSERVED]** Dynamic background polling (`XHR/Fetch`) continuously updates the interface (e.g., via `quickMarketList`) without page reloads, meaning odds and availability can mutate asynchronously while an interaction is queued.

---

## B. Complete Component Inventory

| Component Name | Purpose | Selector(s) | Tag | Parent | Children / Traits | Stability & Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Full Betslip Overlay**| High-priority bottom sheet for bet management. | `.m-betslips.m-betslips-show` | `div` | App root | Header, Detail, Stake, Footer | **[OBSERVED]** High z-index (223+). Triggered via bottom nav icon. |
| **Fast Betslip Overlay**| Quick bet overlay. | `.m-fast-betslip-wrap` | `div` | App root | Odds, Stake, Keyboard | **[OBSERVED]** Used for immediate single-selection execution. High z-index (>100). |
| **Betslip Trigger** | Icon to expand full betslip. | `.betslip-theme-icon__inner` | `div` | Bottom Nav | `img.betslip-theme-icon__background`, `.betslip-theme-icon__count` | **[OBSERVED]** The container is the functional click target, not the image. |
| **Betslip Header** | Fixed top bar of full betslip.| `.m-betslip-header` | `div` | Full Betslip | `.bet-count`, `.mode-switch-button`, `.user-assets-panel` | **[OBSERVED]** Sticky positioning; can obscure scrolling content. |
| **Balance Container** | Stable observation boundary. | `.avatar-box`, `.user-assets-panel` | `div` | Header | `.currency`, `span:not(.currency)` | **[OBSERVED]** Highly stable ancestor. Survives reactive re-renders. |
| **Balance Amount** | Displays numeric fiat funds. | `.avatar-box span:not(.currency)` | `span` | `.avatar-box` | Text node (e.g., `31.05`) | **[OBSERVED]** Fragile/Replaced. Completely replaced on update. |
| **Balance Currency** | Displays fiat currency code. | `.avatar-box span.currency` | `span` | `.avatar-box` | Text node (e.g., `NGN`) | **[OBSERVED]** Replaced during reactive updates. |
| **Bet Settings** | Toggle for auto-accepting odds.| `.bet-settings` (Gear icon) | `div` | Header | Settings panel | **[OBSERVED]** Opens `.bet-setting-panel-container`. |
| **Auto-Accept Toggle**| Setting to skip odds changes. | `div[data-op="accept_odds_changes"]`| `div` | Settings Panel| `m-icon-check--active` | **[OBSERVED]** Recommended proactive strategy for automation. |
| **Match Detail Root**| Main container for prematch markets. | `.m-prematch-detail` | `div` | App root | Markets, odds | **[OBSERVED]** Blocked from interaction when overlay active. |
| **Live Match List** | Main container for live markets. | `.live-container` | `div` | App root | Match rows | **[OBSERVED]** Dynamic feed of matches. |
| **Match Detail Wrap** | Container for all bet rows. | `.m-bet-detail-wrap` | `div` | Full Betslip | `.m-outcomes-row` | **[OBSERVED]** Scrollable list behind header and footer. |
| **Outcome Row** | Individual selection. | `.m-outcomes-row` | `div` | Detail Wrap | Match info, `.m-outcome-odds`, `.delete` | **[OBSERVED]** Contains exact market details and odds. |
| **Match Teams** | Teams involved in the bet. | `.m-vs-desc` | `span` | Bet Row/Betslip| Text node | **[OBSERVED]** Used for selection validation (e.g., "Bradford City FC vs Burnley"). |
| **Outcome Selection** | Chosen bet outcome. | `.m-outcome-desc` | `span` | Bet Row/Betslip| Text node | **[OBSERVED]** Identifies the selection (e.g., "Home \| 1st Goal"). |
| **Market Description**| Category of the bet. | `.m-desc` | `span` | Bet Row/Betslip| Text node | **[OBSERVED]** Identifies the market type. |
| **Live Odd Value** | Selected multiplier. | `.m-outcome-odds` | `span` | Bet Row/Betslip| Text node (e.g., `1.25`, `2.15`)| **[OBSERVED]** Fluctuates via XHR. Mutation triggers recalculation. |
| **Stake Wrapping** | Container for financials. | `.m-betslips-stake-wrapper` | `div` | Betslip | Input, Total, Potential Win | **[OBSERVED]** Rendered below match selections. |
| **Stake Display** | Custom numeric text mirror. | `span.m-keybord-input`, `.m-keybord-input` | `span` | Stake Wrapper | Text node | **[OBSERVED]** Custom UI, not `<input>`. Gains `.m-input--placeholder` when empty (text: "min. 10.00"), gains `.m-input-err` when invalid. |
| **Potential Win** | Calculated return. | `.stake-info-wrap .value`, `.potential-win` | `span` | Stake Wrapper | Text node | **[OBSERVED]** Reactive. Updates asynchronously upon stake/odd change. |
| **Action Footer** | Fixed execution bar. | `.fixed-footer-wrapper`, `.m-submit`| `div` | Betslip | `.m-book-btn`, `.place-bet` | **[OBSERVED]** Pinned to bottom, obscures underlying scrolled items. |
| **Place Bet Button** | Submission trigger. | `.place-bet`, `.place-bet.real-theme`, `span[data-op="single-placebet"]` | `span`/`button`| Action Footer | Text node, `.m-pay-num` | **[OBSERVED]** Extremely dynamic. Gains `.bet-disabled` on errors, `.bet-accept-change` on odds change. Alternates text ("Place Bet", "Accept & Bet"). |
| **Payment Preview** | Readout of intended stake. | `.m-pay-num` | `span` | `.place-bet` | Text node | **[OBSERVED]** Text reads "About to pay X" (e.g., "About to pay 10.00"). |
| **Numeric Keyboard** | Custom input component. | `.m-keyboard` | `div` | Betslip | Keys, `.right` | **[OBSERVED]** Event-driven custom UI. High z-index blocks screen. |
| **Numeric Keys** | Actionable digits/commands. | `[data-key="X"]`, `.m-keyboard-key` | `span`/`div`| `.m-keyboard` | Text/SVG | **[OBSERVED]** `[data-key]` attributes strongly recommended over text matching. Values: `"0"`-`"9"`, `"clear"`, `"delete"`, `"done"`, `"500"`. |
| **Clear Key** | Empties stake. | `[data-key="clear"]`, `.m-keyboard-delete:has-text("Clear")` | `span`/`div`| `.m-keyboard` | Text "Clear" | **[OBSERVED]** Clears UI to placeholder state. |
| **Done Key** | Closes keyboard. | `[data-key="done"]`, `.m-keyboard .right:has-text("Done")`| `div` | `.m-keyboard` | Text "Done" | **[OBSERVED]** Closes keyboard overlay; does NOT trigger placement API. |
| **Notification Area** | Alerts for odds/market changes. | `.betslip-notification` | `div` | Betslip | Text node, `.af-button--primary` | **[OBSERVED]** Starts empty (`<!---->`). Populates text ("Odds have changed...") and Accept button upon interruption. |
| **Update Default Stake**| Checkbox setting. | `[data-op="r-default-stake-cb"]`, `.update-default-stake` | `div` | Betslip | `<i>`, `<span>` | **[OBSERVED]** Not `<input type="checkbox">`. Checked state indicated by `.m-icon-check--active` on the child `<i>`. |
| **Close Overlay** | Button to dismiss betslip. | `[data-op="betslip-close"]`, `.close` (`.wrapper-item.middle`) | `span`/`button`| Betslip | None | **[OBSERVED]** Used for hard error recovery to reset state. |
| **Login Indicator** | Proves authenticated state. | `.m-login-yes` | `div`/`span`| Header | None | **[OBSERVED]** Stable presence when logged in. |
| **Success Alert** | Terminal success indicator. | `.m-betslip-success`, `.m-icon-success`| `div` | App root | Text | **[OBSERVED]** Definitive visual proof of placement success. |
| **Toast Alert** | Non-blocking error. | `.m-toast` | `div` | App root | Text (e.g. "Insufficient")| **[OBSERVED]** Appears on validation fail without page redirect. |
| **Login Dialog** | Auth interruption. | `.m-login-dialog` | `div` | App root | Email/Phone, Password | **[OBSERVED]** Triggered on session expiry upon clicking Place Bet. |
| **Dialog Mask** | Modal backdrop for post-bet. | `.dialog-mask` | `div` | App root | Modals | **[OBSERVED]** Dynamically created (e.g., `uid=98965`). Exists during confirmation. |
| **Confirm Button** | Final bet approval (FlexiBet). | `button.af-button.af-button--primary.flexibet-confirm` | `button` | Modal | Text: "Confirm" | **[OBSERVED]** Appears if odds change or FlexiBet is active. Requires `.focus()` + `.click()`. Rect: `[x: 135.95, y: 861.75, width: 276.04, height: 52.25]`. |
| **Cancel Button** | Cancels placement modal. | `button.af-button.af-button--primary.flexibet-cancel` | `button` | Modal | Text: "Cancel" | **[OBSERVED]** Rect: `[x: 0, y: 861.75, width: 135.95, height: 52.25]`. Shares Y/Width with Rebet. |
| **Rebet Button** | Restores previous bet context. | `button.af-button.rebet.af-button--primary` | `button` | Modal | Text: "Rebet" | **[OBSERVED]** Appears post-result. Rect: `[x: 0, y: 861.75, width: 135.95, height: 52.25]`. |
| **OK Button** | Acknowledges terminal modals. | `button.btn` | `button` | Modal | Text: "OK" | **[OBSERVED]** Rect: `[x: 262.37, y: 474.40, width: 84.54, height: 39.18]`. |
| **Page Loading** | Transaction buffer animation. | `.m-page-loading-wrap`, `#pageLoading`| `div` | App root | SVG Path | **[OBSERVED]** Transient state while `/placeOrder` is in flight. |

---

## C. DOM Hierarchy and Identity Model

**[OBSERVED]** The application isolates selection context using structural overlays. The relationship chain can be traced hierarchically, but active resolution MUST be scoped to the overlay.
For **Fast Betslip**, the hierarchy is limited to the single active wrapper:
`MATCH` (`.live-container` or `.m-prematch-detail`) → `FAST BETSLIP` (`.m-fast-betslip-wrap`)

For **Full Betslip**, the hierarchy expands to lists:
`BETSLIP OVERLAY` (`.m-betslips.m-betslips-show`) 
→ `DETAIL LIST` (`.m-bet-detail-wrap`) 
→ `ROW` (`.m-outcomes-row`) 
→ `MATCH INFO` (`.m-vs-desc`, e.g., "Freiburg vs Motherwell FC" or "Bradford City FC vs Burnley") & `MARKET` (`.m-desc`) & `SELECTION` (`.m-outcome-desc`) & `ODD` (`.m-outcome-odds`)
→ `STAKE WRAPPER` (`.m-betslips-stake-wrapper`)
→ `POTENTIAL WIN` (`.potential-win` or `.stake-info-wrap .value`)

**[INFERRED]** Because multiple odds exist simultaneously in the `.live-container` background, querying `.m-outcome-odds` globally will return incorrect elements. All interactions must be stringently scoped `document.querySelector('.m-betslips-show').querySelector(...)` or `document.querySelector('.m-fast-betslip-wrap').querySelector(...)` to ensure interaction strictly with the active overlay context. This completely bypasses background UI collision issues.

---

## D. Complete Betting State Machine

| State | Entry Condition | Observable Signature | Event Causing Exit | Interruption / Note | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NO_BETSLIP** | Default state. | `.betslip-theme-icon__count` is empty/missing, or `.m-fast-betslip-wrap` has `offsetParent === null`. | Click `.m-outcome-odds` | N/A | **[OBSERVED]** |
| **BETSLIP_OPEN**| Betslip triggered. | `.m-betslips-show` or `.m-fast-betslip-wrap` present (`display: block`). | Click `.m-keybord-input` | Network loss. | **[OBSERVED]** |
| **STAKE_EDITING** | Keyboard active. | `.m-keyboard` covers screen. `.m-keybord-input` active/focused. | Click `[data-key="done"]` | N/A | **[OBSERVED]** |
| **STAKE_VALIDATING**| Vue ticks triggered. | `.m-keybord-input` text mutates. `.potential-win` recalculates. | Settling Delay completion | Odds change triggers. | **[OBSERVED]** |
| **HARD_ERROR** | Validation failed (e.g., stake > balance).| `.m-input-err` on input, `.bet-disabled` on button, OR `.m-toast` with error text. | Click `.close` or `.betslip-close` | Blocks API placement. | **[OBSERVED]** |
| **READY_TO_SUBMIT** | Input valid, Keyboard closed, delays finished. | `.place-bet` reads "Place Bet", lacks `.bet-disabled`/`.bet-accept-change`. `.betslip-notification` empty. | Click `.place-bet` | Background odds push. | **[OBSERVED]** |
| **ODDS_CHANGED** | XHR odds update during prep. | `.betslip-notification` populates text. `.place-bet` gains `.bet-accept-change`. | Accept action or Close | Stops execution until accepted. | **[OBSERVED]** |
| **AUTH_REQUIRED** | Session expired. | `.m-login-dialog` appears post-click. | Successful Login | Blocks placement. | **[OBSERVED]** |
| **CONFIRM_MODAL** | Pre-bet validation (FlexiBet/Odds).| `.dialog-mask` exists. `.flexibet-confirm` exists. | Click `.flexibet-confirm` | Network Timeout. | **[OBSERVED]** |
| **PROCESSING** | HTTP `placeOrder` in flight. | `.flexibet-confirm` removed, `.m-page-loading-wrap` active, `.dialog-mask` remains with spinner. | XHR Response | HTTP Timeout. | **[OBSERVED]** |
| **SUCCESS** | API returns 200 / code 0. | `.m-betslip-success` or `.m-icon-success` appears. | N/A | Terminal state. | **[OBSERVED]** |
| **FAILURE** | API returns rejection/timeout. | `.loading-page-fail` appears (contains "Reload"). | N/A | Terminal state. | **[OBSERVED]** |
| **RESULT_MODAL** | Completion UI rendered. | `.dialog-mask` exists, `.rebet` or `.btn` (OK) button visible. | Click Rebet or OK | Terminal state. | **[OBSERVED]** |

---

## E. State Transition Table

| Current State | Event | Required Preconditions | Observable DOM Change | Next State | Timing / Sync | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| BROWSING | Click `.betslip-theme-icon__inner`| Selection exists (`.count > 0`) | `.m-betslips` gains `.m-betslips-show` | BETSLIP_OPEN | DOM transition | **[OBSERVED]** |
| BETSLIP_OPEN | Saturation Burst `[data-key="clear"]`| Keyboard open | `.m-input--placeholder` added. Text = "min. X" | STAKE_EDITING | `150 ms` verify | **[OBSERVED]** |
| STAKE_EDITING | Saturation Burst `[data-key="X"]` | Input empty or valid | Text appends digit (e.g. `30` → `301`) | STAKE_VALIDATING | `200 ms` verify | **[OBSERVED]** |
| STAKE_EDITING | Click `[data-key="done"]` | Keyboard open | `.m-keyboard` hidden (`display: none`) | READY_TO_SUBMIT | Instant DOM | **[OBSERVED]** |
| STAKE_VALIDATING | Vue framework tick | Digit successfully captured | `.stake-info-wrap .value` recalculates | READY_TO_SUBMIT | `250 ms` required inter-key | **[OBSERVED]** |
| STAKE_VALIDATING | Input > Balance (`1055` > `31.05`) | Validation failure | `.m-input-err` added. `.bet-disabled` added | HARD_ERROR | Immediate via Vue | **[OBSERVED]** |
| READY_TO_SUBMIT | XHR Background Push | Notification is empty | `.betslip-notification` populates with text | ODDS_CHANGED | Asynchronous | **[OBSERVED]** |
| ODDS_CHANGED | Click `.af-button--primary:has-text("Accept")`| Odds notification present | Notification clears, `.place-bet` resets | READY_TO_SUBMIT | Immediate | **[OBSERVED]** |
| READY_TO_SUBMIT | Saturation Burst `.place-bet` | Balance < Stake | `.m-toast` appears ("Insufficient Balance")| HARD_ERROR | Vue evaluation | **[OBSERVED]** |
| READY_TO_SUBMIT | Saturation Burst `.place-bet` | Needs confirmation (FlexiBet) | `.dialog-mask` & `.flexibet-confirm` appear | CONFIRM_MODAL | `300 ms` modal animate | **[OBSERVED]** |
| CONFIRM_MODAL | `focus()` + `MouseEvent(click)` | Animation complete | `.flexibet-confirm` removed, `.dialog-mask` remains | PROCESSING | Instant removal | **[OBSERVED]** |
| PROCESSING | Network Response (200, code:0)| Pending `/placeOrder` | `.m-betslip-success` appears inside mask | SUCCESS | Variable HTTP time | **[OBSERVED]** |
| PROCESSING | Network Timeout | Pending `/placeOrder` | `.loading-page-fail` appears | FAILURE | Variable HTTP time | **[OBSERVED]** |
| RESULT_MODAL | `focus()` + `MouseEvent(click)` `.rebet` | `.rebet` button present | `.dialog-mask` removed, Stake text restores | BETSLIP_OPEN | Instant DOM | **[OBSERVED]** |

---

## F. Stake Input Contract

**[OBSERVED]** The stake input `.m-keybord-input` is an entirely custom span, not an HTML `<input type="text">` or `<input type="number">`. Native browser `.fill()` or `sendKeys` commands will fail completely against this structure.
**[OBSERVED]** **Empty State:** When the stake is cleared, the input element gains the class `.m-input--placeholder`. Its text content updates to display a minimum value warning (e.g., `"min. 10.00"`).
**[OBSERVED]** **Payment Preview:** `.m-pay-num` inside the `.place-bet` button explicitly tracks and mirrors the total intended deduction (e.g., "About to pay 10.00").
**[OBSERVED]** **Validation State:** Attempting to enter a stake over the balance dynamically adds `.m-input-err` to the input and locks the Place Bet button with `.bet-disabled`. 
**[OBSERVED]** **Asynchronous Calculation:** Altering the stake triggers an asynchronous Vue state update that recalculates the `.stake-info-wrap .value` (Potential Win). This requires a settling delay before the UI is considered stable.

---

## G. Keyboard Interaction Contract

**[OBSERVED]** Keys must be targeted via the `[data-key="X"]` attribute (e.g., `[data-key="1"]`, `[data-key="5"]`, `[data-key="0"]`, `[data-key="clear"]`, `[data-key="delete"]`, `[data-key="done"]`) rather than inner text to avoid localization fragility. Quick stakes also map to specific keys (e.g., `[data-key="500"]` mapped to `r-plus-3`).
**[OBSERVED]** The application actively filters generic DOM click events on the keyboard. 
**[OBSERVED]** **Event Saturation Required:** To guarantee the Vue.js internal `v-on` directives capture the input, an event burst sequence must be dispatched to the key elements:
```javascript
['touchstart', 'touchend', 'mousedown', 'mouseup', 'click'].forEach(type => {
    el.dispatchEvent(new Event(type, { bubbles: true }));
});
```
**[OBSERVED]** The custom keyboard (`.m-keyboard`) occupies a significant portion of the screen (z-index blocking). Automation MUST dispatch an event to `[data-key="done"]` to dismiss the keyboard, unblocking the `.place-bet` button from underlying geometric interaction.
**[OBSERVED]** The `[data-key="done"]` button commits the UI state and hides the keyboard overlay, but does NOT trigger any direct betting network request (like `/placeOrder`).

---

## H. Odds Behavior and Validation Contract

**[OBSERVED]** Odds values (`.m-outcome-odds`) fluctuate asynchronously via XHR without page reloads.
**[OBSERVED]** **ODDS_CHANGED State:** When an odd changes during betslip preparation, the `.betslip-notification` container manages it. Initially a hidden comment node (`<!---->`), it dynamically populates with warning text (e.g., "Odds have changed. Please accept the new odds."). The `.place-bet` action button gains the `.bet-accept-change` CSS class, and its text may change to "Accept & Bet".
**[OBSERVED]** **Proactive Resolution (Auto-Accept):** In the Full Betslip, automation can eliminate the block entirely by activating the setting: open `.bet-settings`, click `div[data-op="accept_odds_changes"]`. This adds `.m-icon-check--active` to the checkbox child and bypasses all future odds change interruptions.
**[OBSERVED]** **Reactive Resolution:** If Auto-Accept is off (or in the Fast Betslip where settings might be hidden), `.betslip-notification` produces an `Accept Changes` button (`.af-button--primary:has-text("Accept")`). Automation must explicitly monitor for and click this to reset the `.place-bet` trigger.

---

## I. Balance Observation and Settlement

**[OBSERVED]** The user's balance is located at `.user-assets-panel` (Full Betslip) or `.avatar-box` (Global Header). The value (`31.05`) is in `span:not(.currency)` and the code (`NGN`) is in `span.currency`.
**[OBSERVED]** The static ancestors are highly stable, but the numeric child `span` is structurally fragile—Vue replaces the entire element during reactive updates.
**[INFERRED]** `MutationObserver` instances MUST target the static ancestor (`.avatar-box` or `.user-assets-panel`) with `{childList: true, characterData: true, subtree: true}` to avoid orphaning.
**[OBSERVED]** **Insufficient Balance Handling:** Clicking `.place-bet` with inadequate funds generates a transient `.m-toast` overlay ("Insufficient Balance") rather than a modal block, OR generates a hard error (`.m-input-err`) in the keyboard state. Automation must monitor for this toast using `Promise.race` during the placement cycle.
**[OBSERVED]** **Settlement Distinction:** Balance mutates reactively. A balance deduction occurs immediately upon successful network placement (confirming execution success independently of the UI modal state). A balance increase occurs asynchronously upon actual bet settlement (win). 

---

## J. Submission Contract

**[OBSERVED]** The submission lifecycle requires strict pre-flight invariant checks before clicking `.place-bet`.
**[OBSERVED]** **Pre-Flight Invariants:**
1. `.m-keyboard` must be hidden (done button clicked).
2. `.place-bet` must NOT contain `.bet-disabled`.
3. `.place-bet` must NOT contain `.bet-accept-change`.
4. `.betslip-notification` must be completely empty (unless Auto-Accept is confirmed on).
5. `.m-pay-num` must accurately match the intended stake.
6. Must execute `scrollIntoViewIfNeeded()` on `.place-bet` to ensure sticky footers do not geometrically block click coordinates.
**[OBSERVED]** If `.place-bet` is clicked, execution branches:
- **Direct Placement:** Immediately invokes `/placeOrder` network request.
- **Confirmation Required:** Spawns `.dialog-mask` and `.flexibet-confirm` button (for FlexiBet risk acceptance or odds changes).
- **Auth Missing:** Spawns `.m-login-dialog`.
- **Balance Low:** Spawns `.m-toast`.
**[OBSERVED]** **Confirmation Mechanism:** Unlike the numeric keyboard, modal buttons (`.flexibet-confirm`, `.rebet`, `.btn`) respond best to a specific focus sequence rather than event saturation:
1. Ensure `300 ms` entry animation completes.
2. Call `.focus()` on the button (critical for arming Vue `v-on` listeners).
3. Dispatch standard `MouseEvent('click', {bubbles: true, cancelable: true})`.

---

## K. Result / Resolution Semantics

**[OBSERVED]** Clicking `.flexibet-confirm` removes the confirm button, but leaves `.dialog-mask` present in the DOM (representing the PROCESSING state via `.m-page-loading-wrap`).
**[OBSERVED]** **Success Definitions:** 
- Network: Status `200` with JSON body `code: 0`.
- DOM: Presence of `.m-betslip-success` or `.m-icon-success`.
**[OBSERVED]** **Failure Definitions:**
- Network: HTTP Timeout or Server Rejection (`code: 10001` odds changed).
- DOM: Presence of `.loading-page-fail` or `.m-toast`.
**[INFERRED]** The disappearance of the `.place-bet` or `.flexibet-confirm` buttons merely indicates a transition to PROCESSING, not success.
**[INFERRED]** A pure DOM timeout without explicit success or failure elements means the resolution state is UNCERTAIN. Automation MUST NOT falsely report failure solely on UI lag, as the backend may have resolved the transaction independently.

---

## L. Rebet Contract

**[OBSERVED]** Following a completed transaction, the Result Modal may offer a `.rebet` button (`button.af-button.rebet.af-button--primary`).
**[OBSERVED]** Invoking the Rebet action (`focus()` + `click()`) dismisses the modal (`dialogVisible: false`) and restores the `.m-betslips.m-betslips-show` overlay.
**[OBSERVED]** **Restoration Semantics:**
- Selection (`.m-outcomes-row`) is preserved.
- Stake (`.m-keybord-input`) is pre-filled with the exact previous amount (e.g., `8000`).
- Live odds are fetched and updated immediately.
**[INFERRED]** The Rebet mechanism bypasses the manual stake entry flow, relying on internal framework state caching of the user's intended bet configuration.
**[OBSERVED]** Automation warning: Rebetting may trigger immediate `.betslip-notification` if live odds differ from the original placed odds. Proactive Auto-Accept settings prevent this friction.

---

## M. Error Taxonomy

| Trigger Condition | DOM State | Elements / Classes Affected | Action / Recovery | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Stake > Balance** | Hard Error | `.m-input-err` on input, `.bet-disabled` on button. | Terminal UI block. Click `[data-op="betslip-close"]` to abort. | **[OBSERVED]** |
| **Balance Fail (Toast)**| Dynamic Validation | `.m-toast` appears containing "Insufficient Balance". | Intercept via Promise.race, fail execution. | **[OBSERVED]** |
| **Odds Changed API** | Server Rejection | Network returns `code: 10001`. UI spawns `.betslip-notification`. | Accept odds manually via `.af-button--primary` or fail. | **[OBSERVED]** |
| **Session Expired** | Pre-Placement Auth | `.m-login-dialog` appears. | Re-authenticate flow required. | **[OBSERVED]** |
| **Timeout/Fail** | Network Dead | `.loading-page-fail` overlay appears. | Click Reload or fail cleanly. | **[OBSERVED]** |
| **Invalid Touch Target**| Keyboard Edit | Virtual buffer drops input values. | Ensure `.m-keyboard` overlay is targeted with saturation. | **[OBSERVED]** |

---

## N. Modal/Dialog Contract

**[OBSERVED]** Modals exist as children of the `body`, anchored by a `.dialog-mask` container (e.g., dynamically generated `uid=98965`).
**[OBSERVED]** Due to `z-index` layering, the appearance of `.dialog-mask` completely blocks interaction with `.m-prematch-detail`, the background betslip, and the detail list.
**[OBSERVED]** Button layout within modals from experimental bounding rectangle output:
- `Cancel`: `[x: 0, y: 861.75, width: 135.95, height: 52.25]`
- `Rebet`: `[x: 0, y: 861.75, width: 135.95, height: 52.25]` (Note: Shares identical footprint as Cancel, active in a different state).
- `Confirm`: `[x: 135.95, y: 861.75, width: 276.04, height: 52.25]` (Adjacent to Cancel/Rebet).
- `OK`: `[x: 262.37, y: 474.40, width: 84.54, height: 39.18]` (Centered).
**[OBSERVED]** Vue bindings on modal buttons ignore synthetic clicks unless `.focus()` is invoked first. Modal lifecycle requires a `~300 ms` CSS transition delay before interaction is safe.

---

## O. Mutation Observation Contract

**[OBSERVED]** "Golden Config" for stable tracking against Vue reactivity:
```javascript
{
  childList: true,      // Essential: Catches Vue replacing element wrappers (e.g., balance)
  characterData: true,  // Essential: Catches direct text mutation (e.g., odds changing)
  subtree: true         // Essential: Monitors nested targets inside stable parents
}
```
**[OBSERVED]** Stable boundaries for observer attachment: `.avatar-box` (Global Balance), `.m-betslips.m-betslips-show` (Full Betslip Root), `.m-fast-betslip-wrap` (Fast Betslip Root).
**[OBSERVED]** For specific state transitions (like the `.place-bet` button gaining `.bet-disabled`), `attributeFilter: ['class']` should be utilized to build synchronous state machines without polling.

---

## P. DOM / Selector Stability Matrix

| Selector | Element | Purpose | Stable Ancestor | Stability | Dynamic? | Multiple Matches? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `.m-betslips-show` | Full Betslip Overlay | State container | App Root | **A** | No | No | Reliable entry hook. |
| `.avatar-box` | Balance Container | Boundary for observer | Header | **A** | No | No | Safe structural boundary. |
| `[data-op="accept_odds_changes"]`| Settings Toggle | Automation Proactive | `.bet-setting-panel-container` | **A** | No | No | Crucial for flow stability. |
| `[data-key="X"]` | Keyboard Key | Target for touch | `.m-keyboard` | **B** | No | No | Standard attribute mapping. Avoid text selectors. |
| `.place-bet` | Place Bet Btn | Submission trigger | `.fixed-footer-wrapper`/`.m-fast-betslip-wrap`| **C** | Yes | No | Classes/Text mutate wildly. |
| `.m-outcome-odds`| Odd Value | Read current price | `.m-betslips`/`.m-fast-betslip-wrap` | **D** | Yes | **Yes** | Replaced frequently. MUST scope to betslip parent. |
| `<input>` | Stake Field | Native input | N/A | **F** | N/A | N/A | Does not exist; uses `.m-keybord-input`. |

---

## Q. Multiple Match and Active-Element Resolution

**[OBSERVED]** The Full Betslip can contain multiple `.m-outcomes-row` elements simultaneously (for Multiple/System bets). The UI also renders multiple unrelated matches, markets, and odds via the background `.live-container` feed.
**[INFERRED]** A global `querySelector('.m-outcome-odds')` will return an array of unrelated prices. The active element resolution strategy requires explicit DOM scoping. Automation MUST limit queries to `document.querySelector('.m-betslips.m-betslips-show').querySelector(...)` or `document.querySelector('.m-fast-betslip-wrap').querySelector(...)`. This isolation strategy completely bypasses background UI collision issues.

---

## R. Timing and Race Conditions

| Operation | Observed Timing | Meaning / Constraint | Race Condition Addressed | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| Post-Mutation Read | `100 ms` | Settling period after observer fires. | Prevents reading old Potential Win state. | **[OBSERVED]** |
| Clear Verification | `150 ms` | Polling delay after `[data-key="clear"]`. | Prevents typing before placeholder restores. | **[OBSERVED]** |
| Virtual DOM Flush | `200 ms` | Delay after digit entry. | Ensures internal Vue model is synced with UI. | **[OBSERVED]** |
| Inter-Digit Input | `250 ms` | Minimum delay between sequential keystrokes. | **CRITICAL:** Prevents Vue buffer overflow/dropped input. | **[OBSERVED]** |
| Modal Animation | `300 ms` | Transition delay after `.dialog-mask` creation. | Prevents clicking un-clickable transitioning boxes. | **[OBSERVED]** |
| `/placeOrder` Request| `1000 - 3000 ms` | Typical duration of risk management API. | Validates state of `.m-page-loading-wrap`. | **[OBSERVED]** |
| Fallback Poll | `5000 ms` | Background safety heartbeat. | Self-heals if MutationObserver detaches on major site update. | **[OBSERVED]** |

---

## S. Network ↔ DOM Correlation

**[OBSERVED]** **Pre-Placement Validation:** Clicking confirm initiates `/api/ng/patron/check` (Validates session/balance. 401 triggers login modal).
**[OBSERVED]** **Core Placement API:** Submitting a bet correlates to a `POST` request sent to `https://www.sportybet.com/api/ng/order/placeOrder` (or `/orders/v2` / `/orders/place`).
**[OBSERVED]** **Required Headers:** 
- `X-Token` (from `localStorage.accessToken` or `ttcsid` cookie; missing returns 401 Unauthorized).
- `terminal: 3` (Mobile web flag)
- `platform: mobile`
- `Content-Type: application/json;charset=UTF-8`
- `X-Requested-With: XMLHttpRequest`
**[OBSERVED]** **Payload Fields:** `selectionId`, `marketId`, `odds` (e.g., `2.15`), `stake` (e.g., `1000`), `flexiBet` flag, `acceptOddsChange` (boolean flag), `source: "wap"`.
**[OBSERVED]** The application actively polls `/api/ng/orders/config` and `/api/ng/promotion/v1/loyalty` in the background. Analytics hit `faro-sportybet.sportydog.net/collect` on confirm clicks.
**[OBSERVED]** **Network Result:** Status `200` with JSON body `code: 0` = Success (Spawns `.m-betslip-success`). `code: 10001` = Odds Changed Error.

---

## T. Framework / Internal State Observations

**[OBSERVED]** The framework is definitively Vue.js, evidenced by DOM attributes such as `data-v-` and dynamic class binding patterns (`.m-input--placeholder`, `.bet-accept-change`). Nodes are completely replaced on state change.
**[INFERRED]** Event listeners are heavily optimized. The requirement for `element.focus()` prior to `element.click()` on specific modal buttons strongly suggests `v-on` event modifiers (like `@click.prevent`) that remain dormant until the element claims active focus.
**[INFERRED]** The existence of "Auto-Accept" preferences (`[data-op="accept_odds_changes"]`) implies an internal application state object (`__vue__` instance) manages behavior overrides before generating payload flags (`acceptOddsChange: true`) for the `/placeOrder` POST request. It may be possible to access this internal state directly if not stripped in production.

---

## U. Authentication / Session Behavior

**[OBSERVED]** The user's authenticated session state is visually proven by the existence of the `.m-login-yes` element in the DOM.
**[OBSERVED]** The `/patron/check` request synchronously validates the session upon clicking Place Bet. 
**[OBSERVED]** Session expiry does NOT result in an immediate page redirect. It intercepts the bet click and dynamically overlays the `.m-login-dialog` requesting Email/Phone and Password, silently blocking bet execution.
**[INFERRED]** Checking for `.m-login-yes` is a mandatory automation pre-flight check. Attempting to parse balance (`.avatar-box`) without this element will throw fatal errors due to the balance UI not existing in the logged-out state.

---

## V. Observed Experiment Registry

### Experiment: Robust Keyboard "Clear" Flow
* **Objective:** Clear the current stake value reliably.
* **Initial State:** Input has existing value.
* **Action:** Event Saturation dispatched to `[data-key="clear"]`.
* **Verification:** Loop with `150 ms` interval (max 3 attempts). Check for `.m-input--placeholder` and text "min. 10.00".
* **Result:** **[OBSERVED]** Success on attempt 1. Proves saturation bypasses custom Vue input logic.

### Experiment: Robust '2' Input Flow
* **Objective:** Input a single digit into empty stake.
* **Initial State:** Placeholder present ("min. X").
* **Action:** Simulate click on `.m-keybord-input` to focus. Fire Event Saturation to `[data-key="2"]`. Wait `200 ms`.
* **Result:** **[OBSERVED]** Success. `.m-input--placeholder` removed. Text equals "2". Vue.js reactivity verified.

### Experiment: Sequential Digit Accumulation ('1' to '30')
* **Objective:** Verify sequential appendage stability.
* **Initial State:** Stake is `30`.
* **Action:** Fire Event Saturation to `[data-key="1"]`. Wait `250 ms`.
* **Result:** **[OBSERVED]** Success. Stake reads `301`. Proves explicit inter-digit delay requirement and data-key mapping chronological string appendage behavior.

### Experiment: Confirmation Modal Button Invocation
* **Objective:** Trigger placement confirmation dynamically.
* **Initial State:** `.dialog-mask` and `.flexibet-confirm` active.
* **Action:** Select button containing text "Confirm". Invoke `.focus()`. Dispatch `MouseEvent('click', { bubbles: true, cancelable: true })`. Wait `300 ms`.
* **Result:** **[OBSERVED]** Success. Confirm button is destroyed, `.m-page-loading-wrap` initiates, `.dialog-mask` remains for processing. Proves focus logic bypasses complex touch requirements for standard buttons.

### Experiment: The Rebet State Cache
* **Objective:** Verify UI recovery via Rebet action.
* **Initial State:** Terminal Result Modal active with `.rebet` button.
* **Action:** `.focus()` + `click()` on `.rebet` button.
* **Result:** **[OBSERVED]** Success. Modal is dismissed (`dialogVisible: false`). Betslip re-opens. Stake input text automatically pre-fills with explicitly restored value `8000`. Proves Rebet preserves state cache.

---

## W. Automation Safety Invariants

**[OBSERVED]** **Execution Constraint (Scroll):** The `.m-bet-detail-wrap` scrolls *behind* the `.fixed-footer-wrapper` and `.m-betslip-header`. Automation MUST execute `scrollIntoViewIfNeeded()` before attempting interactions within the list to avoid geographic click misfires.
**[OBSERVED]** **Execution Constraint (Keyboard Z-Index):** Automation MUST manually click `[data-key="done"]` after typing a stake. Leaving the keyboard open leaves a high `z-index` overlay that blocks access to the final `.place-bet` click coordinates.
**[OBSERVED]** **Pre-Stake Guard:** The system MUST parse `.avatar-box span:not(.currency)` or `.user-assets-panel` to determine the hard cap on valid stakes before initiating keyboard interaction, preventing the `.m-input-err` Hard Error state.
**[OBSERVED]** **Pre-Flight Guard (Odds):** The system MUST verify `.betslip-notification` is empty immediately before clicking `.place-bet`, proving no unaccepted price fluctuations exist.
**[OBSERVED]** **Pre-Flight Guard (Button):** The system MUST verify `.place-bet` absolutely lacks the `.bet-disabled` and `.bet-accept-change` classes.
**[OBSERVED]** **Success Constraint (Network):** A `200` HTTP status alone does not guarantee a bet was placed. The JSON body MUST contain `code: 0`.
**[INFERRED]** **Indeterminate Constraint (Timeout):** If the `/placeOrder` request hangs resulting in `.loading-page-fail` or browser timeout, the script MUST NOT assume failure. The true state of the bet is strictly UNKNOWN until verified against an explicit account history endpoint, as the backend may have resolved the transaction independently of the client dropping the connection.

---

## X. Unknown / Unverified / Conflicting Behaviors

**[CONFLICTING OBSERVATIONS] - [RESOLVED]**
- **Observation A:** Document 1 states the active UI is `.m-fast-betslip-wrap` and notes that Auto-Accept settings are absent.
- **Observation B:** Document 2 states the active UI is `.m-betslips.m-betslips-show` (triggered via bottom nav) and clearly identifies `.bet-settings` containing `[data-op="accept_odds_changes"]`.
- **Resolution:** The platform maintains two completely separate UI pipelines for rapid single bets vs. managed betslips. Both are authoritative. The automation strategy should prioritize the Full Betslip (`.m-betslips-show`) for access to proactive Auto-Accept configurations, or specifically handle the reactive `.betslip-notification` if executing directly inside the Fast Betslip.

**[CONFLICTING OBSERVATIONS] - [RESOLVED]**
- **Observation A:** Interactions require "Event Saturation" (5 simultaneous events) for the `.m-keyboard` and `.place-bet` elements.
- **Observation B:** Interactions successfully utilized standard `.focus()` + `MouseEvent('click')` for Modal buttons (`Confirm`, `Rebet`).
- **Resolution:** This is definitively State-Dependent. Custom Vue UI components (keypad, overlays) require saturation due to mobile touch filters, whereas standard HTML `<button>` elements rendered in system modals rely on standard browser event handling once properly focused. Both mechanisms must be retained in the adapter implementation and mapped to their specific UI elements.

**[UNKNOWN]** **Cancel Action Behavior:** The exact behavior of clicking `.flexibet-cancel` (whether it seamlessly restores the Fast Betslip/UI state or completely aborts and destroys the selection context) was not explicitly tested in the logs.
**[UNKNOWN]** **API Response Semantics:** The specific exact JSON response payloads for `/api/ng/orders/place` determining explicit "Success" vs "Failure" were only partially documented (`code: 0` vs `code: 10001`), meaning full resolution relies heavily on terminal UI modalities (e.g., appearance of the `.rebet` button, `.m-icon-success`) or secondary balance deduction observations.
**[UNVERIFIED]** **Partial Processing Timeout:** It is unverified if the application provides a recovery `/sync` or `/orders/history` endpoint to gracefully query the status of a bet if the `/placeOrder` request times out natively. Defaulting to an external balance check is the safest fallback currently documented.

---
*End of Enriched Specification v2.*
