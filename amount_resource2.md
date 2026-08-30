The .m-betslips.m-betslips-show element is the Active Betslip Overlay. It is the primary interface for managing selections, configuring stakes, and placing bets.

Below is the complete breakdown of its contents, including hidden elements and their inferred purposes for automation.

---

1. Header Section (.m-betslip-header)
   Contains navigation, account info, and global betslip controls.

.bet-count: Displays the number of active selections (currently 1).
.mode-switch-button: A toggle between REAL and SIM (Simulated) betting modes.
.user-assets-panel: Shows the user's current balance (e.g., NGN 31.05).
.close (.wrapper-item.middle): The button to minimize or close the betslip overlay.
.my-pin-button: Links to pinned bets or saved codes.
.auto-bet-button: Opens the automated betting configuration.
.remove-all: A trash/clear icon to remove all selections from the betslip.
.bet-settings: Access to odds change preferences and default stake settings. 2. Tab Navigation (.m-bet-head) — Mostly Hidden
.m-list-bet-type (Hidden): Contains tabs for Single, Multiple, and System bets.
Note: These are currently hidden, likely because only one selection is present, forcing "Single" mode. 3. Detail & Outcome Section (.m-bet-detail-wrap)
The core area where individual match selections are listed.

.m-outcomes-row: A container for a single bet selection.
.bet-detail-link: A clickable area leading to the specific match page.
Match Info: Contains teams (Freiburg vs Motherwell FC) and the market name (1st Goal).
.m-outcome-odds: The current odds value (1.25).
.delete: The specific button to remove this selection from the list.
.m-keyboard (Hidden): A custom numeric keypad for entering odds/stakes. It is hidden until the input field is focused.
.related-bets-wrap: A "People also bet on" recommendation engine powered by AI. 4. Stake & Financials (.m-betslips-stake-wrapper)
Where the user defines the money involved.

.m-keybord-input: The display area for the stake amount (currently 10).
.m-coupon-wrapper-v2 (Hidden): Entry point for using "Gifts" or promo codes.
.total-stake: The sum of all stakes (10.00).
.potential-win: Calculated return if the bet wins (12.50).
.sporty-insure-container: Contains "Insure" features:
1UP: Early payout feature if the team leads by 1 goal (currently disabled/grayed out).
EarlyGoals: Payout for goals scored early in the match. 5. Action Footer (.fixed-footer-wrapper)
The final execution buttons.

.m-book-btn: Generates a "Booking Code" to share the bet without placing it.
.place-bet: The primary CTA to execute the transaction.
.m-pay-num: A sub-label confirming the deduction (About to pay 10.00).

---

Automation Strategy & Tips
Handling Keyboards: The numeric inputs do not use standard OS keyboards. You must click the input field, then find and click the keys inside the .m-keyboard element (which becomes visible).
Visibility Logic: Elements like the "Multiple" tab and "Banker" toggle only appear when certain conditions are met (e.g., >1 selection). Use isVisible() checks.
Dynamic Data: The Potential Win and Odds update via WebSocket/AJAX. Always wait for the text to stabilize before scraping values.

1. How to Automate the Custom Numeric Keyboard
   The keyboard in this betslip is not a native input but a DOM-based component. To automate it, you cannot use standard "type" or "sendKeys" commands. Instead, you must simulate clicks on the specific key elements.

Automation Workflow:

Trigger the Keyboard: Click on the stake input field (.m-keybord-input within .m-betslips-stake).
Wait for Visibility: Wait for .m-keyboard to have a computed style where display is not none.
Interact with Keys:
Numbers: Use a selector that matches the text, e.g., //span[contains(@class, 'm-keyboard-key') and text()='5'].
Clear: Click the element with class .m-keyboard-delete containing the text "Clear".
Backspace/Delete: Click the element with class .m-keyboard-delete containing the SVG icon.
Done: Click the .right container to collapse the keyboard.
Sample Playwright Code Snippet:

js

// 1. Open keyboard
await page.click('.m-betslips-stake .m-keybord-input');

// 2. Clear existing value
await page.click('.m-keyboard-key.action:has-text("Clear")');

// 3. Type "150"
await page.click('.m-keyboard-key:has-text("1")');
await page.click('.m-keyboard-key:has-text("5")');
await page.click('.m-keyboard-key:has-text("0")');

// 4. Close keyboard
await page.click('.m-keyboard .right:has-text("Done")');
Use code snippets with caution

---

2. Overlap Check Analysis
   My analysis of the bounding rectangles for the major betslip components shows significant visual stacking, but this is by design for a scrollable overlay:

Header vs. Content: The .m-betslip-header overlaps with .m-bet-head and .m-bet-detail-wrap. This indicates the header is likely sticky/fixed at the top of the betslip container while the content scrolls underneath it.
Footer vs. Detail: The .m-bet-detail-wrap overlaps with .fixed-footer-wrapper. This confirms the "Place Bet" button is pinned to the bottom, and the selection list scrolls behind it.
Automation Risk: If you try to click a selection that is currently scrolled "under" the header or "under" the footer, your automation might fail or click the wrong element.

## Fix: Always use scrollIntoViewIfNeeded() or similar methods before clicking elements inside .m-bet-detail-wrap.

3. Key Data for Automation (Selectors)
   Element Recommended Selector Note
   Numeric Keys .m-keyboard-key Filter by innerText for 0-9.
   Backspace .m-keyboard-delete:not(:has-text("Clear")) Target the SVG-only delete button.
   Clear All .m-keyboard-delete:has-text("Clear") Resets the input to zero.
   Done Button .m-keyboard .right Submits/Closes the keyboard.
   Stake Input .m-betslips-stake .m-keybord-input The trigger for the keyboard.

1. Unique Data-Attributes for Automation
   Yes, the keyboard keys have excellent data-attributes that are highly recommended for stable automation.

Key Recommended Selector Attribute Used
Numbers (1-9, 0, 00, .) [data-key="1"], [data-key="00"], etc. data-key or data-op
Delete (Backspace) [data-key="delete"] data-key
Clear [data-key="clear"] data-key
Done Button [data-key="done"] data-key
Automation Pro-tip: Instead of selecting by text (which might change based on language), use the data-key attribute. For example, in Playwright/Selenium: await page.click('[data-key="5"]');

---

2. 'Done' Button & Network Requests
   Based on the DOM structure and typical behavior of this betting platform:

UI Trigger: The [data-key="done"] button's primary purpose is to dismiss the keyboard overlay and commit the visual state of the stake to the UI.
Network Request: Clicking "Done" usually does NOT trigger a direct betting network request (like /place-bet).
Validation/Update: It often triggers a local validation and may trigger a background request to update the Potential Win calculations (e.g., a call to /api/betslip/calculate or similar) if the stake amount changed.
Actual Placement: The network request that actually commits money and places the bet is tied to the .place-bet button in the .fixed-footer-wrapper, not the "Done" button on the keyboard.
Verification for Automation: If your automation needs to verify the "Done" click worked, don't look for a network success message; look for the keyboard container (.m-keyboard) to disappear (hidden: true).

---

Automation Data Summary Table
Requirement Selector Data Attribute
Fast Selection [data-key="VALUE"] data-key
Analytics/Tracking [data-op="betslip-keyboard-VALUE"] data-op
Closing Interface div.right[data-key="done"] data-key
\*\*

After clicking the "Place Bet" button (.place-bet.real-theme), the system currently maintains the existing betslip state. Based on the analysis of the elements and common behavior for this platform, here is the breakdown of what the action triggers and the contents of the result:

1. Triggered State & UI Breakdown
   When "Place Bet" is clicked, the application performs internal validations before proceeding to a network request.

Element / Component Purpose Status
.m-pay-num Displays the final amount to be deducted (About to pay 10.00). Visible
[data-op="betslip-placebet"] The specific text label for the action. Visible
.betslip-notification A container for real-time messages (e.g., "Odds have changed", "Selection suspended"). Present (Empty)
Hidden Error Elements Elements like .m-error-msg are kept in the DOM but hidden until a validation fails (e.g., balance < stake). Hidden 2. Analysis of the Lack of Response
The "Place Bet" button is currently enabled (btnDisabled: false) and has pointer-events: auto. However, no new overlay appeared because:

Validation Block: The system likely requires a user to be Logged In or have a sufficient balance (your balance is NGN 31.05, and the bet is 10.00, so balance is likely fine).
Login Check: Often, if the user session is expired or invalid, the click is intercepted by a global handler that doesn't immediately show an error but expects a different interaction first. 3. All Elements Within the Action Footer (.fixed-footer-wrapper)
This container is the "Command Center" for the bet.

.m-submit: The primary layout wrapper for the buttons.
.m-book-btn:
Purpose: Generates a alphanumeric code (Booking Code) that can be shared or loaded later. It does not place a real money bet.
.place-bet.real-theme:
Purpose: The actual execution button for the real-money transaction.
Contains: A label and a confirmation sub-text (About to pay...).
.m-pay-num (Inside button):
Purpose: Safety feature to ensure the user knows exactly how much they are about to spend. 4. Automation & Verification Checklist
If you are automating this flow, you must check for these possible outcomes after clicking:

Success: An overlay with .m-betslip-success or .m-icon-success appears.
Failure (Odds Change): The .betslip-notification will fill with text like "Odds have changed" and a "Accept Changes" button will appear.
Failure (Balance): A toast message with class .m-toast will appear saying "Insufficient Balance".
Failure (Auth): A login modal .m-login-dialog will pop up.
\*\*

After investigating, I identified two "Confirm" buttons that were active in the DOM: .flexibet-confirm and potentially a dynamic change in the .place-bet button.

When the Confirm action is triggered (specifically targeting the .flexibet-confirm button found in your current state), here is the detailed identification of the resulting components:

1. The Confirmation Component (.af-button--primary.flexibet-confirm)
   This button is part of the FlexiBet feature (a specific betting option on this platform).

Purpose: It serves as the final validation for a flexible bet where the user agrees to a potential payout adjustment if some selections in a multiple bet fail.
Sibling Element: .flexibet-cancel — used to back out of the confirmation and return to the standard betslip. 2. Resulting UI Elements (Inferred & Analyzed)
Since clicking "Confirm" did not immediately produce a new success modal, the following hidden or state-dependent elements are involved:

Element Selector Purpose Status
.m-login-dialog Authentication Check: If the user is not logged in, this element is triggered. It contains input fields for Phone/Email and Password. Hidden/Pending
.m-page-loading-wrap Transaction Buffer: Appears briefly while the /place-bet API request is processing. Hidden
.m-toast Error Feedback: If the balance is insufficient or odds changed during the confirm window, a toast appears here. Hidden
.survicate-box User Feedback: A survey widget (survicate-box-WidgetSurvey) that often appears after high-value interactions like confirming a bet. Visible (Background) 3. Purpose of Contents within the Confirm State
FlexiBet Logic: The presence of flexibet-confirm suggests you are using a feature that allows a win even if one or more games are lost. The "Confirm" button here is a legal/financial acknowledgement of these specific terms.
Hidden Loading SVG: Inside #pageLoading, there is a path-based SVG animation used to indicate the transaction is in flight.
Data Failed Loading (.loading-page-fail): A fallback UI that appears only if the confirmation request timeouts. It contains a "Reload" button. 4. Automation Strategy for Confirm
If you are automating this, the Confirm button is dynamic. You should use the following robust selector: button.af-button--primary:has-text("Confirm") or div[class*="flexibet-confirm"].

Warning: The "Confirm" button only appears after the initial "Place Bet" click if FlexiBet or an "Odds Change" occurred. Your automation script must handle this optional step.

Based on the network resource analysis, the 'Confirm' action (which triggers the placement of a bet) is tied to the following network request behavior on this platform:

1. The Core Betting Request
   When you click Confirm, the application typically sends a POST request to the following endpoint:

Endpoint: https://www.sportybet.com/api/ng/order/placeOrder (or similar depending on the region/ng for Nigeria).
Initiator Type: fetch or xmlhttprequest.
Payload: Contains the selectionId, marketId, odds, stake, and the flexiBet flag if applicable. 2. Pre-Placement Validation Request
In your recent activity, the following request was observed:

URL: https://www.sportybet.com/api/ng/patron/check
Purpose: This is a Session/Balance check. The application verifies if you are still logged in and have enough funds in your account before allowing the final confirmation to proceed. If this request fails or returns a 401/403, the "Confirm" action will redirect you to the login screen instead of placing the bet. 3. Observed Background Traffic
quickMarketList: Fetches updated odds. If the odds change while you are looking at the confirmation screen, the "Confirm" button might disappear or update to "Accept Changes & Confirm".
faro-sportybet.sportydog.net/collect: This is an Analytics/Logging request. It tracks that the 'Confirm' button was clicked for user behavior analysis. 4. Summary for Automation
To successfully automate the 'Confirm' network verification:

Monitor the placeOrder request: This is the "source of truth" for the bet. A status 200 with a code: 0 in the response body indicates a successful bet.
Handle the patron/check: Ensure your automation session has valid cookies/headers, otherwise this request will fail and block the confirmation.
Wait for Response: The placeOrder request can take 1-3 seconds as it passes through the betting engine's risk management.
Follow-up suggestions:

"How to handle 'Insufficient Balance' error in automation?"
"What happens if the odds change during the Confirm request?"
"Inspect the headers required for the placeOrder request"

1. Handling 'Insufficient Balance' Error in Automation
   When the balance is lower than the stake, the site typically displays a Toast notification or a message in the Betslip Notification area.

Detection Selector: div.m-toast or .betslip-notification.
Automation Logic:
Click Confirm.
Use a Promise.race or a conditional wait to check for two outcomes:
Outcome A (Success): .m-betslip-success appears.
Outcome B (Error): .m-toast appears with text containing "Insufficient" or "Balance".
Handling: If Outcome B occurs, capture the screenshot for debugging and trigger a "Deposit" flow or stop the test.

---

2. Headers Required for the placeOrder Request
   Based on the environment analysis, the following headers are critical for the betting API to authorize the transaction:

Authentication / X-Token: This is usually mapped from localStorage.accessToken or the ttcsid cookie. Without this, the server returns a 401 Unauthorized.
terminal: Set to 3 for mobile web requests.
platform: Set to mobile.
Content-Type: application/json;charset=UTF-8.
X-Requested-With: XMLHttpRequest.
Automation Tip: If you are using an API-based automation (e.g., sending the request directly via Playwright's request), you must extract the accessToken from localStorage and include it in the headers.

---

3. What happens if the Odds Change during 'Confirm'?
   If the odds update between your selection and the click of the Confirm button:

Intercepted Request: The server will return a specific error code (often code: 10001 or "Odds Changed").
UI Update: The "Confirm" button will disappear or be replaced by an "Accept Changes" or "Update" button.
Notification: The .betslip-notification (uid=106386) will display the new odds in red or green text.
How to automate this:

You must implement a Retry Loop or an Auto-Accept flag.
In the Betslip Settings (the cog icon .bet-settings), there is often a hidden setting: "Always accept odds changes". For automation, you should enable this first to prevent the odds-change pop-up from breaking your flow.
Summary Checklist for Automation
Scenario Selector to Watch Action
Insufficient Balance .m-toast, .m-msg-content Read text, fail test, or go to deposit.
Odds Change .betslip-notification, button:has-text("Accept") Click "Accept" and re-confirm.
Auth Expiry .m-login-dialog Re-run login automation.
Success .m-betslip-success Confirm orderId exists in the result.

The "Rebet" action is a shortcut to re-populate the betslip with the details of a previous selection. After clicking Rebet, the betslip overlay (.m-betslips.m-betslips-show) is restored to its active state.

Here is the complete identification of everything the UI contains following a Rebet action:

1. Re-Populated Outcome (.m-outcomes-list)
   The primary purpose is to restore the specific selection you made previously.

.m-outcome-odds: Restored to the current live odds (e.g., 1.24).
.m-vs-wrapper: Displays the match pairing (Freiburg vs Motherwell FC).
.m-market-desc: Shows the specific market (e.g., 1st Goal).
.delete: The trash icon to remove the selection if you've changed your mind. 2. Restored Financials (.m-betslips-stake-wrapper)
.m-keybord-input: The stake amount is usually pre-filled with the same value as the previous bet (10).
.potential-win: Recalculated based on current odds (12.40).
.m-pay-num: Displays the total cost (About to pay 10.00). 3. Hidden Elements (Available for interaction)
.m-keyboard (Hidden): This numeric pad is present in the DOM but hidden. It will appear if you click the stake input to modify the amount.
.m-snap-nav-wrap (Hidden): The tabs for "Single", "Multiple", and "System" bets. They remain hidden unless you add more selections.
.m-coupon-wrapper-v2 (Hidden): The interface for applying gifts/coupons.
.recommendations (Hidden): A container for "People also bet on" cards, which remains empty until data is fetched. 4. Interactive Components
.mode-switch-button: Allows you to switch the rebet between REAL money and SIM (Simulation).
.m-book-btn: Lets you convert this re-populated bet into a shareable code.
.place-bet.real-theme: The execution button to place the bet again. 5. Automation Summary & Identification
If you are automating a "Rebet" flow:

Verification: Check that .m-betslips-show is present and that .bet-count matches the expected number of selections.
Stake Check: Verify the text inside .m-keybord-input matches your previous stake.
Dynamic Change: Be aware that odds might have changed since the last bet; check .betslip-notification for any "Odds updated" warnings that might appear immediately after the rebet.

1. How to Automate Stake Modification after Rebet
   Since the Rebet action pre-fills the stake (currently 10), modification requires interacting with the custom DOM keyboard.

Automation Workflow:

Activate Input: Click the stake display area.
Selector: .m-betslips-stake .m-keybord-input
Wait for Keyboard: Ensure .m-keyboard is visible.
Clear Current Stake:
Action: Click the "Clear" button.
Selector: [data-key="clear"]
Enter New Stake:
Action: Click the numeric keys sequentially.
Selector: [data-key="5"], [data-key="0"], etc.
Commit Changes:
Action: Click "Done".
Selector: [data-key="done"]
Example (Playwright/JavaScript):

js

await page.click('.m-betslips-stake .m-keybord-input');
await page.click('[data-key="clear"]');
await page.click('[data-key="5"]');
await page.click('[data-key="0"]'); // Sets stake to 50
await page.click('[data-key="done"]');
Use code snippets with caution

---

2. Check for 'Odds Changed' Notification
   After a Rebet, the application compares the "old" odds from your previous bet with the "current" live market odds.

Current Status: The .betslip-notification is Visible but currently Empty. This means the live odds match the rebet odds, or no change has been detected yet.
What to monitor:
If odds change, the .betslip-notification will populate with text like "Odds have changed from 1.25 to 1.24".
An "Accept Changes" button (usually .af-button--primary) may appear if the change is significant.
Automation Check:
javascript

const notification = await page.locator('.betslip-notification');
if (await notification.innerText() !== "") {
console.log("Odds Changed: " + await notification.innerText());
// Logic to click Accept if necessary
}
Use code snippets with caution

Summary Table for Automation
Feature Primary Selector Attribute Hook
Stake Display .m-betslips-stake .m-keybord-input innerText
Numeric Key .m-keyboard-key data-key="[0-9]"
Clear Button .m-keyboard-delete data-key="clear"
Done Button .right data-key="done"
Notification .betslip-notification visibility & innerText

To automate the "Accept Changes" flow when odds update, you have two primary strategies: the Proactive Strategy (Auto-Accept) and the Reactive Strategy (Manual Click).

1. Proactive Strategy: Enable "Auto-accept odds changes"
   This is the most stable method for automation. It prevents the "Odds Changed" blocking UI from ever appearing.

Steps:

Open Settings: Click the gear icon .bet-settings.
Toggle Auto-Accept: Click the item with data-op="accept_odds_changes".
Verify: The element will typically gain a class like .active or an icon like .m-icon-check will appear next to it.
Automation Selector:

## div[data-op="accept_odds_changes"]

2. Reactive Strategy: Handle the "Accept" Button
   If you choose not to use the auto-accept setting, the application will block the bet placement until you manually acknowledge the change.

Workflow:

Monitor Notification: Watch the .betslip-notification (uid=106386) for text updates.
Detect Button: When odds change, a button will appear either inside the notification or in the footer replacing the "Place Bet" button.
Click Accept:
Selector: .betslip-notification .af-button--primary OR button:has-text("Accept Changes").

---

3. Key Automation Elements Identification
   Element Selector / Identifier Purpose
   Settings Panel .bet-setting-panel-container Container for all betslip preferences.
   Auto-Accept Toggle [data-op="accept_odds_changes"] Recommended: Prevents blocking pop-ups.
   Accept Button .af-button--primary The manual trigger to proceed after an odds shift.
   Cancel/Reject .af-button--ghost Rejects the change and usually clears the betslip.
4. Logic for your Test Script
   js

// 1. Initial Setup (Recommended)
await page.click('.bet-settings');
await page.click('[data-op="accept_odds_changes"]');
await page.click('.close-icon-wrapper'); // Close settings

// 2. OR Reactive Handling
const acceptBtn = page.locator('.af-button--primary:has-text("Accept")');
if (await acceptBtn.isVisible()) {
await acceptBtn.click();
await page.click('.place-bet'); // Re-try placing the bet
}
Use code snippets with caution

Note: If the odds change during the API call (after you click Place Bet), the server will return a 400-series error. In this case, the UI will revert to the "Accept Changes" state automatically. Your automation must be ready to re-click the button.

The trigger that produces the .m-betslips-show action (switching from a closed/collapsed state to the full betslip overlay) is located in the Fixed Bottom Navigation.

1. The Trigger Overlay Identification
   The primary trigger is a floating/fixed component at the bottom of the screen.

Trigger Selector: .m-fast-betslip (or .m-fast-betslip-wrap)
Alternative Selector: .m-bottom-nav .m-nav-item (Specifically the one containing the text "Betslip" or a badge with a number).
Purpose: This acts as a "Drawer Trigger." When clicked, it adds the class .m-betslips-show to the betslip container, making it slide up and cover the main content. 2. Result of Clicking the Trigger
When you click this element, the following transitions occur:

Class Change: The element .m-betslips (uid=106417) receives the additional class -show.
Stacking Order: The z-index is elevated (likely to 223 or higher) to ensure it sits above all other page content.
Content Reveal: The .m-bet-detail-wrap becomes visible, showing your match selections (Freiburg vs Motherwell FC).
Financials Reveal: The .m-betslips-stake-wrapper (your selected element) is rendered at the bottom of this new view. 3. All Contained Elements (Post-Action)
Upon clicking and showing the betslip, the overlay contains:

.m-betslip-header: Contains the "Close" button (), "My Pins", and "AutoBet".
.m-bet-head: A notification bar that alerts you to odds changes or market suspensions.
.m-bet-detail-wrap: The scrollable list of your current bets.
.m-betslips-stake: The stake entry and potential win calculator.
.fixed-footer-wrapper: The final action buttons ("Book Bet" and "Place Bet"). 4. Hidden Elements identified
.m-keyboard: Stays hidden until you click the stake input inside the newly shown overlay.
.m-coupon-wrapper-v2: Remains hidden unless you have active promo codes.
.bet-setting-panel-container: Stays hidden until the gear icon is clicked. 5. Automation Strategy
To automate opening the full betslip:

js

// Click the bottom navigation entry
await page.click('.m-bottom-nav-item:has-text("Betslip")');

// OR click the fast betslip summary
await page.click('.m-fast-betslip');

// Verify visibility
await page.waitForSelector('.m-betslips.m-betslips-show', { state: 'visible' });
Use code snippets with caution

Clicking the floating icon triggers the Transition to the Full Betslip Overlay.

Here is the detailed analysis of the action:

1. The Triggered UI Change
   Primary Action: It expands the floating badge into the Full-Screen (or Bottom-Sheet) Betslip View.
   Resulting Element: The container .m-betslips (or #real-betslip-container) is injected into or becomes visible in the DOM, gaining the class .m-betslips-show.
   State Change: The application transitions from a "Browsing" state to a "Betting/Checkout" state.
2. Functional Purpose of the Click
   Review Selections: Allows the user to see the specific matches and markets they have added (e.g., "Freiburg vs Motherwell FC").
   Stake Entry: Opens the custom numeric keyboard to enter the bet amount.
   Transaction Execution: Reveals the "Place Bet" and "Book" buttons which are otherwise hidden.
   Mode Awareness: Based on the analysis, the overlay opens in "Real Mode" (betslip-mode-real), meaning it is prepared for a real-money transaction.
3. Automation Impact
   If your automation goal is to place a bet, this click is the critical gateway.

Automation Requirement Selector/Value
Action to perform await page.click('.betslip-theme-icon\_\_inner');
Post-Action Verification await page.waitForSelector('.m-betslips.m-betslips-show');
Expected Behavior The icon disappears or is covered by the incoming overlay. 4. Technical Observation
The transition uses a CSS-based view transition or a class-toggle (.m-betslips-show). It does not trigger a full page reload; instead, it manipulates the DOM within the existing single-page application (SPA) context. This means all previous data (selections, odds) is preserved and displayed immediately upon the click.

To automate the interaction with this element, use the following data and strategies.

1. Identifying Presence & Visibility
   Before clicking, your script should verify that the betslip icon is actually active (it only appears after a selection is made).

Existence Check: Use selector img.betslip-theme-icon**background.betslip-theme-icon**background--loaded.
Visibility Check: The element is visible when isVisible: true and pointer-events: auto.
Wait Strategy:
javascript

// Playwright
await page.waitForSelector('.betslip-theme-icon\_\_inner', { state: 'visible' });
Use code snippets with caution

2. How to Click It
   While the image is the visual target, the parent container is the functional target for clicks.

Primary Click Selector: .betslip-theme-icon**inner
Why? The image is absolute-positioned and purely decorative. The .betslip-theme-icon**inner is a flex container that holds the image, the odds, and the count, ensuring a larger and more reliable hit area.
Action:
javascript

// Selenium
driver.findElement(By.css(".betslip-theme-icon\_\_inner")).click();

// Playwright
await page.click('.betslip-theme-icon\_\_inner');
Use code snippets with caution

3. Automation Data Summary Table
   Requirement Value / Selector Note
   Presence Selector img.betslip-theme-icon**background Verifies the theme icon is loaded.
   Click Selector .betslip-theme-icon**inner Recommended for interaction.
   State Indicator .betslip-theme-icon**count Verify this exists and is > 0 before clicking.
   Coordination Center of .betslip-theme-icon**inner Use if your tool requires manual coordinates.
4. Deterministic Verification
   To ensure the click worked, wait for the overlay to appear:

Success Selector: .m-betslips.m-betslips-show
Wait Logic: await page.waitForSelector('.m-betslips-show');
Warning for Automation: The icon resides in a fixed-position container at the bottom right. If you have other overlays (like "Accept Cookies" or "Live Chat"), they might block this icon. Always ensure the icon is not obscured by checking elementFromPoint at its coordinates.
