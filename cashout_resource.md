To realistically automate selective cashouts, you need a deterministic way to identify bets and handle the multi-step UI flow. Based on the DOM structure we've explored, here is a comprehensive automation plan.

1. Data Identification (The "Blueprint")
   Each bet item in the list (li.m-bet-item) contains a wrapper with a unique data-op attribute.

Format: openbet-simple-list-item-{BetID}
Timestamp Extraction: The first 12 digits of the BetID (e.g., 260905143203) typically represent the date and time (YYMMDDHHMMSS).
Metadata: You can extract the teams, stake, and current cashout value to make decisions. 2. The Automation Workflow
An automated script should follow these logical steps:

Scan: Iterate through all li.m-bet-item.
Filter: Select a bet based on its BetID or its timestamp.
Trigger: Click the specific button.m-btn--cashout inside that item.
Wait: Wait for the global confirmation popup (.m-cashout-pop) to appear.
Confirm: Click the button containing the text "Confirm". 3. Recommended Code Block (JavaScript/Console)
You can use the following script in the browser console or an automation tool (like Puppeteer/Playwright) to perform a selective cashout.

js

/\*\*

- Automates cashout for a specific Bet ID
- @param {string} targetBetId - The unique ID found in data-op
  \*/
  async function performSelectiveCashout(targetBetId) {
  const selector = `[data-op="openbet-simple-list-item-${targetBetId}"]`;
  const betContainer = document.querySelector(selector);

      if (!betContainer) {
          console.error(`Bet ${targetBetId} not found!`);
          return;
      }

      // 1. Find and click the initial Cashout button
      const cashoutBtn = betContainer.querySelector('button.m-btn--cashout');
      if (!cashoutBtn) {
          console.error("Cashout button not available for this bet.");
          return;
      }

      console.log(`Initiating cashout for Bet: ${targetBetId}...`);
      cashoutBtn.click();

      // 2. Wait for the confirmation popup to appear
      // Using a simple polling mechanism
      const maxWait = 5000; // 5 seconds
      const start = Date.now();

      const interval = setInterval(() => {
          const confirmBtn = Array.from(document.querySelectorAll('button'))
              .find(btn => btn.innerText.includes('Confirm') && btn.offsetParent !== null);

          if (confirmBtn) {
              clearInterval(interval);
              console.log("Confirmation button found. Clicking...");
              confirmBtn.click();
              console.log("Cashout confirmed.");
          } else if (Date.now() - start > maxWait) {
              clearInterval(interval);
              console.error("Timed out waiting for confirmation button.");
          }
      }, 200);

  }

// Example usage:
// performSelectiveCashout("260905143203bet06653643");
Use code snippets with caution

4. Implementation Details for Scaling
   Selective Logic: Instead of hardcoding IDs, you can write a filter: bets.filter(b => b.timestampRaw < '260905120000') to cash out all bets before a certain time.
   Error Handling: The UI might show "Price Changed" instead of "Confirm". Your script should look for a "Accept Changes" button in those cases.
   State Management: Always check if the button.m-btn--cashout is disabled (has the disabled attribute) before trying to click.
   Summary of Captured Data for your Records:
   Unique Selector: li.m-bet-item [data-op^="openbet-simple-list-item-"]
   Confirmation Selector: div.m-cashout-pop button.af-button--primary
   Timestamp Key: First 12 digits of the ID.

## Automated Cashout Process: Bet History

**Context**
Analysis and automation of the "Cashout" workflow for specific bets within a betting application. The goal is to programmatically identify a bet by its unique ID and timestamp, initiate a cashout, and confirm the transaction via a dynamic popup.

**Diagnostics**
The application uses a nested structure for bet items, where unique identifiers are embedded in custom attributes.

| Data Point                 | Technical Selector / Pattern                            |
| :------------------------- | :------------------------------------------------------ |
| **Bet Container**          | `li.m-bet-item`                                         |
| **Unique ID Wrapper**      | `[data-op^="openbet-simple-list-item-"]`                |
| **Initial Cashout Button** | `button.m-btn--cashout`                                 |
| **Confirmation Popup**     | `div.m-cashout-pop`                                     |
| **Confirm Button**         | `button.af-button--primary` (containing "Confirm" text) |

**Actionable Findings**

- **Bet ID Extraction:** The `data-op` attribute contains a unique string (e.g., `openbet-simple-list-item-260905143203bet06653643`).
- **Timestamp Logic:** The first 12 digits of the Bet ID follow the `YYMMDDHHMMSS` format (e.g., `260905143203` represents `2026-09-05 14:32:03`).
- **Multi-Step UI:** The process requires two distinct clicks: one on the specific list item and a second on a global modal that appears asynchronously.

**Code Fixes**
The following JavaScript demonstrates a potential implementation for automating this sequence for a specific `targetBetId`. This script accounts for the asynchronous appearance of the confirmation modal.

```js
/**
 * Automates the two-step cashout process for a specific bet.
 * Framing: This is a technical guidance example for source code implementation.
 */
async function performSelectiveCashout(targetBetId) {
  const selector = `[data-op="openbet-simple-list-item-${targetBetId}"]`;
  const betContainer = document.querySelector(selector);

  if (!betContainer) return;

  // Step 1: Trigger initial cashout state
  const cashoutBtn = betContainer.querySelector("button.m-btn--cashout");
  if (cashoutBtn && !cashoutBtn.disabled) {
    cashoutBtn.click();
  }

  // Step 2: Poll for the confirmation button in the popup
  const maxWait = 5000;
  const startTime = Date.now();

  const poll = setInterval(() => {
    const confirmBtn = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.innerText.includes("Confirm") && btn.offsetParent !== null,
    );

    if (confirmBtn) {
      clearInterval(poll);
      confirmBtn.click();
    } else if (Date.now() - startTime > maxWait) {
      clearInterval(poll);
    }
  }, 200);
}
```

**Recommendations**

- **State Validation:** Ensure the `button.m-btn--cashout` does not have a `disabled` attribute or `pointer-events: none` before execution.
- **Dynamic Price Handling:** Implement a secondary check within the polling loop for "Accept Price Changes" text, as the "Confirm" button may change labels if odds fluctuate during the process.
- **Selective Filtering:** Use the extracted 12-digit timestamp to batch-process bets based on placement time.

_Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides._

## Selective Cashout Automation: Open Bets

**Context**
Analysis of a sports betting interface to automate the multi-step cashout process for specific bets identified by unique IDs and timestamps.

**Diagnostics**
The betting interface uses a specific naming convention for bet items, where the unique identifier contains an embedded timestamp in `YYMMDDHHMMSS` format.

| Bet ID                    | Derived Timestamp   | Event                | Cashout Value |
| :------------------------ | :------------------ | :------------------- | :------------ |
| `260905143203bet06653643` | 2026-09-05 14:32:03 | Inter vs Napoli      | NGN 10.00     |
| `260905143217bet06774671` | 2026-09-05 14:32:17 | Sporting vs Nacional | NGN 10.00     |

- **Primary Selector:** `li.m-bet-item`
- **Unique Wrapper:** `[data-op^="openbet-simple-list-item-"]`
- **Action Trigger:** `button.m-btn--cashout`
- **Confirmation UI:** A global popup `.m-cashout-pop` containing a primary button with the text "Confirm".

**Actionable Findings**

- **Multi-Step Workflow:** A successful cashout requires two distinct interactions: triggering the initial cashout button within the list item and then clicking the confirmation button in a global modal.
- **Dynamic States:** The confirmation button may not be immediately available in the DOM; automation must account for a brief rendering delay after the initial click.
- **Identification:** The first 12 digits of the `data-op` ID provide a deterministic way to filter bets by time of placement.

**Proposed Automation Strategy**
The following JavaScript demonstrates a potential approach for programmatically handling the two-step cashout flow for a specific bet.

```js
/**
 * Automates cashout for a specific Bet ID
 * @param {string} targetBetId - Unique ID from data-op attribute
 */
async function performSelectiveCashout(targetBetId) {
  const selector = `[data-op="openbet-simple-list-item-${targetBetId}"]`;
  const betContainer = document.querySelector(selector);

  if (!betContainer) return;

  // Trigger initial cashout
  const cashoutBtn = betContainer.querySelector("button.m-btn--cashout");
  if (cashoutBtn) cashoutBtn.click();

  // Poll for the confirmation button in the popup
  const maxWait = 5000;
  const start = Date.now();

  const interval = setInterval(() => {
    const confirmBtn = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.innerText.includes("Confirm") && btn.offsetParent !== null,
    );

    if (confirmBtn) {
      clearInterval(interval);
      confirmBtn.click();
    } else if (Date.now() - start > maxWait) {
      clearInterval(interval);
    }
  }, 200);
}
```

_Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides._
