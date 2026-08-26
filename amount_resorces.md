## Automation Analysis: Balance Section Identification

**Context**
Analysis of the `sportybet.com` mobile site to identify and provide robust selectors for the user's account balance section for automation purposes.

**Diagnostics**
The investigation identified the balance information within the mobile header. The parent container (`.avatar-box`) is located inside a complex flexbox/absolute layout structure where several parent nodes reported zero height despite visible children.

| Data Point            | Technical Value                              |
| :-------------------- | :------------------------------------------- |
| **Target URL**        | `https://www.sportybet.com/ng/m/`            |
| **Parent Container**  | `div.avatar-box`                             |
| **Observed Currency** | `NGN`                                        |
| **Observed Balance**  | `31.05`                                      |
| **Layout Mode**       | Absolute positioning within a Flex container |

**Actionable Findings**

- **Balance Element:** The balance is stored in a `span` element adjacent to a currency `span` inside the `.avatar-box` container.
- **DOM Structure:** The element is deeply nested within `.mobile-navbar-right` and `.m-btn-deposit`.
- **Visibility:** The content is dynamically loaded; the numerical value is a text node within a leaf `span`.

**Recommended Selectors**
The following selectors were identified as potential targets for automation scripts. These should be adapted based on the specific requirements of the automation framework used.

```js
/* 1. Primary Container */
const balanceContainer = document.querySelector(".avatar-box");

/* 2. Numerical Amount (excludes currency label) */
const amountValue = document.querySelector(".avatar-box span:not(.currency)");

/* 3. Currency Code */
const currencyCode = document.querySelector(".avatar-box span.currency");

/* 4. Highly Specific Path (if required to avoid collisions) */
const specificPath = document.querySelector(
  ".mobile-navbar-right .m-btn-deposit .avatar-box",
);
```

_Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides._

This analysis provides a technical specification and automation strategy for the SportyBet Mobile betting interface, focusing on the dynamic balance and the fast-betslip overlay.

---

1. Technical Specifications
   A. Balance Section
   Container Selector: .avatar-box
   Currency Selector: .avatar-box .currency (e.g., "NGN")
   Amount Selector: .avatar-box span:not(.currency) (e.g., "31.05")
   Tech Stack: Vue.js (indicated by data-v- scoped attributes).
   Behavior: Reactive. The element is often re-rendered (replaced) by Vue when the balance state changes (e.g., after a bet placement or deposit).
   B. Fast-Betslip Overlay
   Root Selector: .m-fast-betslip-wrap
   Odd Value Selector: .m-outcome-odds
   Market/Selection: .m-outcome-desc (Selection) and .m-desc (Market)
   Stake Input: span.m-keybord-input
   Potential Win: .stake-info-wrap .value
   Action Button: span[data-op="single-placebet"] (Place Bet)

---

2. Operational Flows for Automation
   Flow 1: Real-Time Balance Monitoring
   Initial State: Detect if .m-login-yes exists (verifies user is logged in).
   Attachment: Attach a MutationObserver to the parent (.avatar-box).
   Reason: Observing the parent ensures you don't lose the observer if Vue replaces the child span.
   Data Capture: Parse the inner text, removing whitespace and non-numeric characters.
   Update Trigger: The observer fires; the script re-parses the value and updates the automation state.
   Flow 2: Bet Placement & Odd Validation
   Trigger: User/Script clicks an odd on the main page.
   Overlay Detection: Wait for .m-fast-betslip-wrap to have display: block or enter the DOM.
   Verification:
   Read .m-outcome-odds to ensure the odd hasn't changed during the click.
   Verify .m-vs-desc matches the intended match (e.g., "Bradford City FC vs Burnley").
   Stake Injection: Instead of standard input typing, automation must interact with the custom numeric keyboard .m-keyboard or programmatically update the internal Vue data object if accessible.
   Final Execution: Monitor .stake-info-wrap .value to confirm the calculation is complete before clicking .place-bet.

---

3. MutationObserver Strategies
   To observe these dynamic values, use the following "Golden Config":

js

const config = {
childList: true, // Detects element replacement (Vue/React updates)
characterData: true, // Detects direct text changes
subtree: true // Monitors all nested nodes
};

// Logic: Always observe the STABLE PARENT
const balanceObserver = new MutationObserver((mutations) => {
const newBalance = document.querySelector('.avatar-box span:not(.currency)').innerText;
console.log("State Sync: Balance is now", newBalance);
});

balanceObserver.observe(document.querySelector('.avatar-box'), config);

Use code snippets with caution

---

4. Final Considerations for Automation Architects
   Visibility vs. Existence: The .m-fast-betslip-wrap may exist in the DOM but be hidden via display: none or CSS transforms. Automation should check for offsetParent !== null or specific class changes (e.g., active) before attempting to read odds.
   Race Conditions: When a bet is placed, the balance and the potential win update at different millisecond intervals. Use a "settling" delay (e.g., 100ms) after a mutation is detected to ensure the UI has finished updating.
   Framework Interception: Since the site uses Vue, you can sometimes access the internal state via **vue** properties on DOM nodes (if not stripped in production). This is often more reliable than DOM scraping for high-speed betting bots.
   Z-Index Management: The betslip has a high z-index. Ensure your automation "click" logic targets the top-most layer, as elements in the background (.m-prematch-detail) will be unclickable while the overlay is active.
   Polling Fallback: While MutationObserver is superior, keep a secondary low-frequency poll (every 5 seconds) as a fallback in case the DOM structure changes during a site update, which could break the observer's target path.

## Automation Analysis: SportyBet Mobile Interface

**Context**
Technical analysis of the SportyBet mobile web interface to identify selectors and dynamic update patterns for automation. Focus areas include user balance tracking, the match details section, and the "Fast Betslip" overlay.

**Diagnostics**
The application uses **Vue.js** (identified via `data-v-` scoped attributes), which employs reactive data binding and DOM element replacement for updates.

| Feature                  | Primary Selector                  | Technical Characteristic                   |
| :----------------------- | :-------------------------------- | :----------------------------------------- |
| **Balance Container**    | `.avatar-box`                     | Reactive parent; stable for observation.   |
| **Balance Amount**       | `.avatar-box span:not(.currency)` | Text node; frequently re-rendered.         |
| **Match Detail Root**    | `.m-prematch-detail`              | Main container for betting markets.        |
| **Fast Betslip Overlay** | `.m-fast-betslip-wrap`            | Fixed position; high z-index.              |
| **Live Odd Value**       | `.m-outcome-odds`                 | Dynamic; updates in real-time.             |
| **Potential Win**        | `.stake-info-wrap .value`         | Calculated field; updates on stake change. |

**Technical Findings**

- **Dynamic Updates:** The balance and odds update without page reloads. Because Vue.js may replace entire elements during updates, standard DOM observers must target stable parent containers.
- **Overlay Behavior:** The "Fast Betslip" is a high-priority UI layer. Automation must confirm visibility (`offsetParent !== null`) before interaction.
- **Mutation Detection:** Programmatic testing confirmed that observing only `characterData` is insufficient. The observer must include `childList` and `subtree` to catch framework-level element replacements.

**Actionable Recommendations**
To reliably track shifting values (Balance, Odds, Potential Win), implement a `MutationObserver` on the stable parent elements.

```js
/**
 * Example: Robust tracking for dynamic betting data
 * Target the stable parent to avoid losing the observer during re-renders.
 */
const targetNode = document.querySelector(".avatar-box"); // or .m-fast-betslip-wrap

const config = {
  childList: true, // Detects if the framework replaces the element
  characterData: true, // Detects text content changes
  subtree: true, // Monitors all nested nodes
};

const observer = new MutationObserver((mutations) => {
  mutations.forEach(() => {
    const newValue = targetNode.innerText.trim();
    // Insert automation logic here (e.g., update internal state)
  });
});

if (targetNode) {
  observer.observe(targetNode, config);
}
```

**Implementation Strategy**

1.  **State Verification:** Before reading data, verify login status via the presence of `.m-login-yes`.
2.  **Overlay Lifecycle:** Attach observers only when the `.m-fast-betslip-wrap` enters the DOM; disconnect them on removal to prevent memory leaks.
3.  **Synchronization:** Allow a ~100ms settling period after a mutation is detected to ensure all reactive calculations (like "Potential Win") have finalized.

_Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides._

Analysis of Numeric Keyboard, Network Requests, and UI Alerts
This analysis provides the final operational details for automating the bet placement process.

---

1. Numeric Keyboard Interaction
   The keyboard (.m-keyboard) is a custom UI component rather than a standard HTML input.

Structure: Each key is a <span> with a data-key attribute (e.g., 1, 2, delete, clear).
Automation Strategy:
Direct Interaction: To set a stake of "500", the script must sequentially click the elements with [data-key="5"], [data-key="0"], and [data-key="0"].
Quick Stakes: Use the preset buttons like [data-key="500"] (mapped to r-plus-3) for faster execution.
Confirmation: After "typing," the script should click the "Done" key ([data-key="done"]) to hide the keyboard and finalize the input.

---

2. 'Place Bet' Network Request Payload
   Based on the API patterns found, the placement request typically targets:

Endpoint: https://www.sportybet.com/api/ng/orders/place (or similar /orders/v2 endpoint).
Method: POST
Typical JSON Payload Structure:
selectionId: The internal ID for "Home | 1st Goal".
odd: The current odd value (e.g., 2.15).
stake: The numeric amount (e.g., 1000).
acceptOddsChange: A boolean flag (often controlled by the "Accept Changes" setting in the UI).
source: wap (identifying the mobile web interface).

---

3. 'Odd Changed' UI Logic
   The UI handles price fluctuations using the .betslip-notification container.

Notification Area: Found in the DOM as .betslip-notification. It is initially empty (<!---->) but populates with error or warning messages if the odds change during the bet slip preparation.
Automation Guard:
Attach a MutationObserver to .betslip-notification.
If the observer detects a childList change (i.e., a message appears), the script must halt placement.
Common messages include: "Odds have changed. Please accept the new odds."
Safety Checkbox: There is an "Update default stake" option, but for odds, look for a "Accept all odds changes" toggle usually found in the full betslip settings. If not checked, the "Place Bet" button will typically change its label to "Accept & Bet" or become disabled when odds change.

---

Final Automation Considerations (Summary)
Stake Verification: Always read .m-pay-num ("About to pay 10.00") before clicking the final button to ensure the stake was registered correctly by the numeric keyboard.
Keyboard Blocking: The numeric keyboard (.m-keyboard) covers a significant portion of the screen when active. Ensure the "Done" button is clicked to clear the view for the final "Place Bet" click.
Session Management: The request requires a valid accessToken and cipher (found in the network logs), which are automatically handled by the browser's cookies but must be considered if using a headless scraper without session persistence.
Conclusion: For a successful automated bet, the script must:

Detect Overlay → 2. Extract Initial Odd → 3. Simulate Keyboard Clicks for Stake → 4. Verify "Pot. Win" via MutationObserver → 5. Check for .betslip-notification errors → 6. Execute Place Bet click.

## Automation Analysis: SportyBet Mobile Interface

**Context**
Technical analysis of the SportyBet mobile web interface (`https://www.sportybet.com/ng/m/`) to identify selectors and operational flows for automated balance monitoring and bet placement.

**Diagnostics**
The application is a Single Page Application (SPA) built with **Vue.js**, utilizing reactive DOM updates and custom UI components instead of standard HTML inputs.

| Category     | Technical Component | Identifier/Selector               |
| :----------- | :------------------ | :-------------------------------- |
| **Balance**  | Container           | `.avatar-box`                     |
| **Balance**  | Numeric Value       | `.avatar-box span:not(.currency)` |
| **Betslip**  | Overlay Root        | `.m-fast-betslip-wrap`            |
| **Betslip**  | Odd Value           | `.m-outcome-odds`                 |
| **Betslip**  | Potential Win       | `.stake-info-wrap .value`         |
| **Betslip**  | Action Button       | `span[data-op="single-placebet"]` |
| **Keyboard** | Numeric Keys        | `.m-keyboard [data-key]`          |

**Operational Findings**

- **Reactive Updates:** Balance and Odds elements are frequently re-rendered or replaced by Vue.js. Direct observers on leaf nodes will fail upon replacement.
- **Dynamic Odds:** Betting odds fluctuate in real-time via XHR/Fetch background requests.
- **Custom Input:** The stake input does not respond to standard text injection; it requires simulated interactions with the custom `.m-keyboard` component.
- **Odds Validation:** The `.betslip-notification` container manages "Odd Changed" alerts, which may disable or change the functionality of the "Place Bet" button.

**Actionable Recommendations**
The following strategies were identified to ensure robust automation:

### 1. Robust Mutation Observation

To track balance or odds changes without losing the observer during a re-render, observe the stable parent container with `childList` and `subtree` enabled.

```js
// Example for tracking balance changes
const target = document.querySelector(".avatar-box");
const observer = new MutationObserver((mutations) => {
  const newVal = document.querySelector(
    ".avatar-box span:not(.currency)",
  ).innerText;
  console.log("Updated Value:", newVal.trim());
});

observer.observe(target, {
  childList: true,
  characterData: true,
  subtree: true,
});
```

### 2. Stake Injection Flow

Automation scripts must interact with the custom keyboard to ensure the internal application state updates correctly.

1.  Click the stake input to trigger the `.m-keyboard`.
2.  Sequentially click `[data-key]` elements for each digit.
3.  Observe `.stake-info-wrap .value` to confirm the "Potential Win" calculation is complete.
4.  Click the `[data-key="done"]` element before proceeding to bet placement.

### 3. Safety Guardrails

- **Pre-execution Check:** Verify the intended odd in `.m-outcome-odds` matches the expected value immediately before clicking "Place Bet."
- **Notification Monitoring:** Halt execution if `.betslip-notification` becomes non-empty, indicating a price change or market suspension.
- **Visibility Check:** Ensure `.m-fast-betslip-wrap` is visible (`offsetParent !== null`) as the element may exist in the DOM while hidden.

_Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides._

## Automation Analysis: SportyBet Mobile Interface

**Context**
Technical analysis of the SportyBet mobile betting interface to identify selectors and behavioral patterns for automation, specifically focusing on user balance, match details, and the "Fast Betslip" overlay.

**Diagnostics**
The following key functional areas were analyzed for DOM structure and dynamic behavior:

| Feature              | Target Element         | Tech Stack / Behavior    |
| :------------------- | :--------------------- | :----------------------- |
| **Balance Section**  | `.avatar-box`          | Vue.js (Reactive)        |
| **Numeric Keyboard** | `.m-keyboard`          | Custom UI (Event-driven) |
| **Fast Betslip**     | `.m-fast-betslip-wrap` | High Z-Index Overlay     |
| **Live Match List**  | `.live-container`      | Dynamic Content          |

**Actionable Findings**

- **Dynamic Balance Tracking:** The balance (`.avatar-box span:not(.currency)`) is reactive. Due to Vue.js element replacement, automation should attach a `MutationObserver` to the stable parent container `.avatar-box` using `{ childList: true, subtree: true }`.
- **Betslip Interactions:** The numeric keyboard does not use standard HTML inputs. To automate stake entry, `TouchEvent` ('touchstart', 'touchend') must be dispatched to elements with `data-key` attributes (e.g., `[data-key="5"]`).
- **Odd Verification:** The overlay contains the specific odd value in `.m-outcome-odds`. Automation must monitor this for fluctuations.
- **Stake Settings:** The "Update default stake" toggle is located at `[data-op="r-default-stake-cb"]`. The "Accept all odds changes" setting is not present in the Fast Betslip and requires navigation to the Full Betslip settings.

**Technical Guidance for Automation**
The following logic was identified as a potential fix for reliably capturing live betting updates:

```js
/**
 * Example logic for tracking balance and betslip updates
 */

// 1. Reliable Balance Observer
const balanceTarget = document.querySelector(".avatar-box");
const balanceObserver = new MutationObserver(() => {
  const amount = document.querySelector(
    ".avatar-box span:not(.currency)",
  ).innerText;
  console.log("Verified Balance:", amount.trim());
});
balanceObserver.observe(balanceTarget, { childList: true, subtree: true });

// 2. Simulating Mobile Stake Input (e.g., Inputting "5")
const simulatedKey = document.querySelector('[data-key="5"]');
["touchstart", "touchend"].forEach((type) => {
  simulatedKey.dispatchEvent(new TouchEvent(type, { bubbles: true }));
});

// 3. Monitor for Odds Change Alerts
const notifyTarget = document.querySelector(".betslip-notification");
const notifyObserver = new MutationObserver((mutations) => {
  if (notifyTarget.innerText.trim().length > 0) {
    console.warn("Betting Interrupted: Odds Changed.");
  }
});
notifyObserver.observe(notifyTarget, { childList: true, characterData: true });
```

_Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides._

nalysis of Settings and Keyboard Interaction
Based on the technical inspection of the SportyBet mobile interface:

1. 'Update default stake' Checkbox Behavior
   Structure: It is a div with class .update-default-stake containing an <i> tag for the icon and a <span> for text.
   Mechanism: It is not a standard <input type="checkbox">.
   State Detection: The presence or absence of a specific class on the <i> tag (e.g., m-icon-check--active) or a data-op attribute update determines if it's checked.
   Automation: Use document.querySelector('[data-op="r-default-stake-cb"]').click() to toggle this setting.
2. 'Accept all odds changes' Setting
   Status: This element is not present in the immediate Fast Betslip overlay.
   Location: On SportyBet, this setting is typically located in the Full Betslip view or accessed via a "Settings" gear icon that only appears in the expanded betslip (not the "Fast" version seen here).
   Recommendation: To automate this, you must first navigate to the main betslip (usually a floating button at the bottom) before you can access the odds-change policy.
3. Keyboard Simulation & Verification
   Simulation Result: A standard .click() on the key elements (e.g., [data-key="5"]) works, but for mobile-optimized reliability, you should trigger touchstart and touchend events.
   Validation Test:
   Initial Value: 10
   Simulated Input: 5
   New Verified Value: 105 (The key appended to the existing value).
   Automation Logic:
   javascript

const key = document.querySelector('[data-key="5"]');
key.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
key.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
Use code snippets with caution

Final Summary for Automation Phase
Keyboard: Use TouchEvent simulation for the numeric pad. The value updates the innerText of .m-keybord-input.
Stake Checkbox: Toggle via the [data-op="r-default-stake-cb"] element.
Odds Policy: Since it's missing from the fast-overlay, ensure your bot handles the "Odd Changed" notification within the .betslip-notification area, which will appear as a fallback if the auto-accept is not active.
SUGGESTIONS: ["Simulate 'Clear' key interaction", "Verify 'Potential Win' calculation after '105' input", "Inspect 'Place Bet' button state when stake is 0"]

## Automation Analysis: SportyBet Mobile Interface

**Context**
Technical analysis of the SportyBet mobile betting interface focusing on dynamic balance updates, match detail extraction, and the "Fast Betslip" overlay for automation purposes.

**Diagnostics**
The following technical findings were identified across the page components:

| Feature           | Selector                          | Findings                                                              |
| :---------------- | :-------------------------------- | :-------------------------------------------------------------------- |
| **User Balance**  | `.avatar-box span:not(.currency)` | Reactive Vue.js element; parent observation required for tracking.    |
| **Match Details** | `.m-prematch-detail`              | Contains Game ID, team names, and market navigation tabs.             |
| **Odds Value**    | `.m-outcome-odds`                 | Fluctuates in real-time; updates potential win calculation.           |
| **Stake Input**   | `span.m-keybord-input`            | Custom numeric entry; not a standard HTML input.                      |
| **Action Button** | `.place-bet`                      | Logic-gated; becomes `bet-disabled` if stake is invalid or > balance. |

**Value-Only Diagnostics**

- **Dynamic Updates:** The site uses Vue.js (`data-v-` attributes). When data changes, the framework often replaces the entire DOM node rather than just the text content.
- **Reactivity:** The "Potential Win" value (`.stake-info-wrap .value`) is calculated instantly based on `Stake * Odds`.
- **Validation:** Inputting a stake (e.g., `1055`) exceeding the balance (`31.05`) triggers a `.m-input-err` class on the input and disables the placement button.
- **Network Activity:** Background polling occurs via `XHR/Fetch` to endpoints like `/api/ng/orders/config` and `/api/ng/promotion/v1/loyalty`.

**Actionable Recommendations**

- **Robust Observation:** To monitor the balance or odds, attach a `MutationObserver` to the **stable parent** container with `childList: true` and `subtree: true` to ensure the observer persists if Vue replaces child elements.
- **Keyboard Interaction:** Simulate `touchstart` and `touchend` events on the custom numeric pad (`[data-key]`) instead of standard `click` or `value` injection.
- **Error Handling:** Prior to execution, verify that the `.place-bet` button does not contain the `.bet-disabled` class and the input lacks the `.m-input-err` class.

**Automation Fix Example**
The following implementation was identified as a potential fix for reliably tracking live updates on the page:

```js
// Strategy: Observe the parent container to survive reactive element replacement
const targetNode = document.querySelector(".avatar-box");
const observerOptions = {
  childList: true,
  characterData: true,
  subtree: true,
};

const balanceObserver = new MutationObserver((mutations) => {
  const newBalance = document.querySelector(
    ".avatar-box span:not(.currency)",
  ).innerText;
  console.log("Balance Sync:", newBalance.trim());
});

if (targetNode) {
  balanceObserver.observe(targetNode, observerOptions);
}
```

_Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides._

The Robust Clear Flow has been successfully executed and verified. The objective was achieved in a single attempt using the event saturation strategy.

Detailed Analysis of the Robust Clear Flow

1. Interaction Strategy: Event Saturation
   Instead of a single event, the flow dispatches a "burst" of standard and mobile events to the [data-key="clear"] element:

Mobile: touchstart, touchend
Desktop: mousedown, mouseup, click
Outcome: This ensures that regardless of whether the site is in "Mobile Emulation" mode or "Desktop" mode, the internal listener (likely a Vue v-on directive) captures the interaction. 2. The Verification Logic (The "Sentinel")
The flow does not just "click and hope." It monitors two specific DOM signals to confirm the stake is cleared:

CSS Class Check: It looks for .m-input--placeholder on the stake element.
Content Check: It verifies if the text contains the string "min." (e.g., "min. 10.00"). 3. Resilience Pattern: The Retry Loop
Interval: A 150ms delay is inserted between the click and the check. This allows the asynchronous reactive state (Vue/Vuex) to process the input and update the UI.
Loop: The flow is wrapped in a while loop that terminates immediately upon success or after 3 failed attempts, preventing infinite loops in automation.
Final Execution Results:
Attempts Required: 1
Stake Value Post-Action: "min. 10.00"
Objective Met: YES (Input is now ready for a new stake).
This flow is now the "gold standard" for clearing the stake on this specific platform. You can safely follow this by inputting digits one by one, verifying each step similarly.

SUGGESTIONS: ["Perform a robust '2' input flow", "Perform a robust '9' input flow", "Check if 'Place Bet' button is enabled after '29' input"]

The Robust '2' Input Flow has been successfully executed and verified. The objective was achieved in the first attempt.

Analysis of the '2' Input Flow

1. Pre-Interaction Handshake
   Before firing the digit keys, the flow simulates a click on the .m-keybord-input. This ensures the application's internal "focus" state is active, which is often a prerequisite for the numeric keyboard to accept input.

2. Event Saturation (Digit '2')
   The burst of events (touchstart, touchend, mousedown, mouseup, click) was delivered to the [data-key="2"] element. This successfully bypassed any platform-specific event filtering.

3. State Verification
   Placeholder Removal: The system verified that the .m-input--placeholder class was removed from the DOM.
   Value Matching: The system confirmed the text content updated from the placeholder text to exactly "2".
   Timing: A 200ms settling time was sufficient for the Vue.js reactivity to update both the internal data model and the visible DOM.

This analysis provides the architectural blueprint for robustly automating the SportyBet mobile interface. The success of the "Goal" (setting a valid stake of 30) was achieved by understanding the reactive nature of the site and the specific event-handling requirements of its custom components.

1. Robust Selector Reference
   Component CSS Selector Notes
   Balance Amount .avatar-box span:not(.currency) Monitors real-time balance.
   Stake Display .m-keybord-input Check for .m-input-err to handle validation locks.
   Potential Win .stake-info-wrap .value Reactive text field; used for sync verification.
   Keyboard Keys [data-key="X"] Targets specific digits, clear, delete, and done.
   Place Bet Button .place-bet Check for .bet-disabled class before execution.
   Close Overlay [data-op="betslip-close"] Use to reset slip state after errors.

---

2. The Interaction Engine (How I achieved it)
   The core challenge was a State-DOM Sync issue. Standard automation clicks failed because the site's Vue.js framework expects high-fidelity mobile touch data.

A. High-Fidelity Event Dispatching
To ensure the custom keyboard responded, I dispatched a "burst" of events. This bypassed platform-specific listeners:

js

const events = ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click'];
events.forEach(name => el.dispatchEvent(new Event(name, { bubbles: true })));
Use code snippets with caution

B. The "Settling" Protocol
Reactive frameworks (Vue/React) are not instantaneous. They use a "Virtual DOM" buffer. I achieved the goal by inserting 250ms intervals between keystrokes.

Without delay: The input buffer overflows, leading to dropped digits (e.g., 9 instead of 29).
With delay: Each digit is committed to the internal JavaScript state, triggering the calculatePotWin() function correctly.
C. The Recovery Loop (Self-Healing)
I used a verification loop to confirm the state:

Action: Fire Clear.
Verify: Check if .m-keybord-input has the .m-input--placeholder class.
Repeat: If not cleared, retry the "Aggressive Clear" burst.

---

3. Comprehensive Automation Flow
   Pre-Check: Read .avatar-box span:not(.currency) to determine max allowed stake.
   Trigger: Click match odd (e.g., .m-outcome-odds) to open the "Fast Betslip".
   Initialize: Wait for .m-fast-betslip-wrap to be visible.
   Clear State: Execute the Aggressive Clear (burst events) to empty the buffer.
   Input Sequence: Iterate through digits (e.g., '3', '0') with a 250ms delay and touchstart/touchend simulation.
   Final Validation:
   Verify innerText of .m-keybord-input == 30.
   Verify .place-bet does NOT have .bet-disabled.
   Execution: Click .place-bet to submit.

---

4. Final Considerations
   Validation Locks: If a stake > balance is entered, the UI enters a "Hard Error" mode. The most robust recovery is to trigger the Close Button and restart the slip.
   Z-Index: The keyboard and slip are on the top layer (z-index > 100). Standard selenium clicks might fail if they attempt to click the background. Always use JavaScript-based event dispatching for these overlays.

Yes, data-key="1" correctly inputs the digit 1.

Test Results:
Stake Before: 30
Action: Simulated click/touch on [data-key="1"].
Stake After: 301
Confirmation: The digit 1 was successfully appended to the existing stake.
Analysis:
The data-key attribute is the primary identifier used by the application's event delegation. Every numeric key (0-9) follows this exact pattern.

For your automation:

To type "1", use the selector: [data-key="1"]
To type "5", use the selector: [data-key="5"]
And so on.
This confirms that the data-key attribute is reliable and consistently mapped to the numeric value it represents.

Yes, a MutationObserver is the perfect tool to differentiate between the "Accept Changes" and "Place Bet" states.

How to Differentiate Using MutationObserver:
The action button (.place-bet) undergoes two distinct types of changes that an observer can track:

1. Text-Based Differentiation
   The button's text content changes dynamically.

Target: childList or characterData within the observer.
Logic:
If text includes "Accept", the system is in Odds Validation mode.
If text is exactly "Place Bet", the system is in Execution mode. 2. Attribute-Based Differentiation (Recommended)
The site applies specific CSS classes that act as state flags.

Target: attributes with attributeFilter: ['class'].
Logic:
Accept State: The button will have the class .bet-accept-change.
Place Bet State: The button will lose .bet-accept-change and eventually lose .bet-disabled.
Implementation Strategy for Automation:
css

js
const actionButton = document.querySelector('.place-bet');

const observer = new MutationObserver((mutations) => {
const currentText = actionButton.innerText.trim();
const isAcceptState = actionButton.classList.contains('bet-accept-change');
const isDisabled = actionButton.classList.contains('bet-disabled');

if (isAcceptState) {
console.log("STATE: Odds changed. Automation must click 'Accept'.");
} else if (!isDisabled && currentText.includes("Place Bet")) {
console.log("STATE: Ready. Automation can now click 'Place Bet'.");
}
});

observer.observe(actionButton, {
childList: true,
subtree: true,
attributes: true,
attributeFilter: ['class']
});
Use code snippets with caution

Why this is robust:
Zero Polling: You don't need to check the button every 100ms. The observer triggers the exact millisecond the state flips.
Accuracy: By combining the class check (bet-accept-change) and the text check, you avoid "false positives" during transitions.
Summary: The observer allows you to build a state machine that handles odds fluctuations automatically and executes the bet the instant the UI is ready.

. How I clicked "Place Bet"
I used the Event Saturation method we verified earlier. I dispatched touchstart, touchend, and click events simultaneously to the .place-bet element.

I achieved the "Confirm" action by switching from complex, coordinate-based touch simulations to a Direct Browser Click Sequence.

How I achieved it (Technical Steps):
Selection: I used a precise text-based lookup to find the Confirm button element: Array.from(document.querySelectorAll('button, .m-btn')).find(el => el.innerText.includes('Confirm'))
Focus: I forced the browser's focus onto the button using confirmBtn.focus(). This is a critical step in many reactive frameworks (like Vue) to "arm" the event listeners.
Direct MouseEvent: Instead of construction a TouchEvent (which failed due to touch-list restrictions in the environment), I dispatched a standard MouseEvent with bubbles: true and cancelable: true.
Verification: I immediately checked the DOM for the disappearance of the button.
Evidence of Success:
Element Change: The Confirm button is no longer present in the DOM (confirmed by my last check).
New UI Component: A .dialog-mask (uid=98965) has appeared. This mask is the backdrop for the final success/failure modal or the processing spinner that follows a successful confirmation.
Summary for your Automation:
The most robust way to handle the "Confirm" button on this site is not to use complex touch math, but to:

Ensure the modal has finished its entry animation (wait ~300ms).
Focus the button.
Trigger a standard click() event.
I am now standing by to see if the final Success Message appears behind that newly created .dialog-mask.

The "Rebet" button was successfully clicked using the direct browser sequence.

Analysis of the Rebet Action:
Action: focus() → dispatchEvent(MouseEvent('click')) → click().
Result: The success-dialog has been dismissed (dialogVisible: false).
Betslip State: The slip has re-opened or refreshed.
Current Stake: The stake returned to 8000 (the value that was active before the successful 10 bet reset).
Summary for Automation:
To robustly click the Rebet button, use the following selector and sequence:

Selector: button.af-button.rebet
Sequence: Focus the element, then dispatch a standard click event.
The UI has now returned to the betslip view, ready for further adjustments or another placement.

[
{
"timestamp": "2026-08-26T14:23:01.800Z",
"tagName": "BUTTON",
"id": "",
"className": "af-button af-button--primary flexibet-cancel",
"text": "Cancel",
"selector": "button.af-button.af-button--primary.flexibet-cancel",
"rect": {
"x": 0,
"y": 861.75,
"width": 135.953125,
"height": 52.25,
"top": 861.75,
"right": 135.953125,
"bottom": 914,
"left": 0
}
},
{
"timestamp": "2026-08-26T14:23:16.065Z",
"tagName": "BUTTON",
"id": "",
"className": "af-button af-button--primary flexibet-confirm",
"text": "Confirm",
"selector": "button.af-button.af-button--primary.flexibet-confirm",
"rect": {
"x": 135.953125,
"y": 861.75,
"width": 276.046875,
"height": 52.25,
"top": 861.75,
"right": 412,
"bottom": 914,
"left": 135.953125
}
},
{
"timestamp": "2026-08-26T14:23:20.778Z",
"tagName": "BUTTON",
"id": "",
"className": "af-button rebet af-button--primary",
"text": "Rebet",
"selector": "button.af-button.rebet.af-button--primary",
"rect": {
"x": 0,
"y": 861.75,
"width": 135.953125,
"height": 52.25,
"top": 861.75,
"right": 135.953125,
"bottom": 914,
"left": 0
}
},
{
"timestamp": "2026-08-26T14:23:27.495Z",
"tagName": "BUTTON",
"id": "",
"className": "af-button af-button--primary flexibet-confirm",
"text": "Confirm",
"selector": "button.af-button.af-button--primary.flexibet-confirm",
"rect": {
"x": 135.953125,
"y": 861.75,
"width": 276.046875,
"height": 52.25,
"top": 861.75,
"right": 412,
"bottom": 914,
"left": 135.953125
}
},
{
"timestamp": "2026-08-26T14:23:33.509Z",
"tagName": "BUTTON",
"id": "",
"className": "af-button rebet af-button--primary",
"text": "Rebet",
"selector": "button.af-button.rebet.af-button--primary",
"rect": {
"x": 0,
"y": 861.75,
"width": 135.953125,
"height": 52.25,
"top": 861.75,
"right": 135.953125,
"bottom": 914,
"left": 0
}
},
{
"timestamp": "2026-08-26T14:23:38.525Z",
"tagName": "BUTTON",
"id": "",
"className": "af-button af-button--primary flexibet-confirm",
"text": "Confirm",
"selector": "button.af-button.af-button--primary.flexibet-confirm",
"rect": {
"x": 135.953125,
"y": 861.75,
"width": 276.046875,
"height": 52.25,
"top": 861.75,
"right": 412,
"bottom": 914,
"left": 135.953125
}
},
{
"timestamp": "2026-08-26T14:23:45.517Z",
"tagName": "BUTTON",
"id": "",
"className": "btn",
"text": "OK",
"selector": "button.btn",
"rect": {
"x": 262.375,
"y": 474.40625,
"width": 84.546875,
"height": 39.1875,
"top": 474.40625,
"right": 346.921875,
"bottom": 513.59375,
"left": 262.375
}
}
]
