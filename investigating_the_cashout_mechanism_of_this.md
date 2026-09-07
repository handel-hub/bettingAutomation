# Exported Chat from Chrome DevTools AI Assistance

**Export Timestamp (UTC):** 2026-09-05T16:15:24.214Z

---

## User

You are investigating the **cashout mechanism of this live web application** from inside Chrome DevTools.
This is a forensic investigation, NOT a redesign.
Your objective is to determine exactly what happens in the browser when a user performs a cashout, what browser state represents the cashout, what network request actually commits it, how the target bet is identified, and what can cause the operation to fail or become ambiguous.
Do not give me generic advice. Inspect the actual page, DOM, JavaScript runtime, event listeners, network activity, and browser state available through DevTools.
Clearly distinguish:
* VERIFIED — directly observed in the browser
* STRONGLY SUPPORTED — supported by multiple observations
* INFERRED — reasonable but not directly demonstrated
* UNKNOWN — cannot be determined
Do not invent missing information.
## 1. DISCOVER THE CASHOUT UI
Locate all elements associated with cashout.
Identify:
* Cash Out buttons
* cashout values
* confirmation buttons
* dialogs/modals
* bet cards
* open-bet containers
* status indicators
* success/failure notifications
* disabled/enabled states
For every important element report:
* tag
* classes
* IDs
* data-* attributes
* ARIA attributes
* visible text
* DOM ancestry
* relevant attributes
* whether the element is dynamically generated
* whether the element changes after interaction.
Determine whether multiple open bets can exist simultaneously.
## 2. IDENTIFY THE TARGET BET
Determine how the page distinguishes one open bet from another.
Look for:
* bet IDs
* transaction IDs
* data attributes
* React/Vue/Angular component state
* JavaScript objects
* internal IDs
* DOM keys
* list indexes
* text labels
* selectors
* hidden attributes.
Determine whether the cashout button itself contains an identifier linking it to a specific bet.
Investigate the dangerous case:
> Bet A is identified, the DOM rerenders, and Bet B occupies the same visual/index position.
Could the application accidentally target the wrong bet?
Give evidence.
## 3. CAPTURE THE ACTUAL CASHOUT INTERACTION
Before clicking Cash Out, inspect the relevant element and its event handling.
Determine:
* event listeners
* click handlers
* delegated listeners
* framework event handlers
* custom JavaScript handlers
* whether the event is stopped/prevented
* whether clicking the element invokes another function
* whether the application uses synthetic events.
Trace the event as far as DevTools allows.
The goal is:
```text
USER CLICK
→ DOM EVENT
→ HANDLER
→ APPLICATION LOGIC
→ NETWORK/API ACTION
```
## 4. OBSERVE THE NETWORK TRANSACTION
With DevTools Network available, perform one controlled cashout if possible.
Identify the exact request(s) associated with cashout.
For each relevant request determine:
* URL/path
* HTTP method
* request timing
* request payload structure
* relevant identifiers
* response status
* response body structure where visible
* whether authentication/session state is involved
* whether there are preceding requests
* whether confirmation causes another request
* whether the request is XHR/fetch/WebSocket/other.
Determine which request appears to be the **actual transaction submission**.
Distinguish:
```text
UI click
```
from:
```text
actual server transaction
```
Do not assume the first request is the commit request.
## 5. FIND THE TRUE TRANSACTION BOUNDARY
Determine:
### Logical boundary
When does the browser/application consider cashout to have started?
### Physical/server boundary
Which exact operation sends the transaction to the server?
### Confirmation boundary
If confirmation exists, determine whether:
```text
Cash Out
```
only opens a confirmation UI or actually submits the transaction.
Determine the smallest browser operation after which cancelling/revoking the action would no longer prevent the cashout.
If this cannot be established, say UNKNOWN.
## 6. CASHOUT VALUE
Inspect how the cashout amount/value is represented.
Determine whether it is:
* DOM text
* attribute
* JavaScript state
* network response
* continuously updated value
* server-provided value
* locally calculated value.
Observe whether the value changes while the bet remains open.
Determine what happens if:
```text
Observed value = X
↓
cashout initiated
↓
server value = Y
```
Can the browser detect this?
Is the displayed value authoritative or merely UI state?
---
## 7. CASHOUT STATE MACHINE
Observe the actual state transitions during cashout.
For example:
```text
OPEN BET
→ CASHOUT AVAILABLE
→ CASHOUT CLICKED
→ CONFIRMATION
→ SUBMITTED
→ PROCESSING
→ SUCCESS/FAILURE
```
Do not assume these states exist.
Report the actual states you can observe.
For each state identify the evidence:
* DOM
* network
* JavaScript state
* notification
* button state
* bet disappearance
* balance change.
## 8. SUCCESS / FAILURE / UNKNOWN
Determine exactly how success can be established.
Look for:
* successful network response
* bet disappearance
* status change
* balance update
* success notification
* server acknowledgement
* UI state change.
Critically investigate:
```text
request sent
↓
network timeout/disconnect
↓
browser does not receive response
```
Can we know whether the cashout failed?
Or could the server have processed it successfully?
If the browser cannot distinguish these states, explicitly classify the result as:
```text
UNKNOWN
```
Do not equate timeout with failure.
## 9. DUPLICATE CASHOUT
Investigate what happens if the same cashout action is triggered twice.
Determine whether the application prevents:
```text
cashout
cashout
```
through:
* disabled button
* state transition
* request deduplication
* transaction ID
* server-side rejection
* client-side locking.
Determine whether duplicate submission could cause:
* two transactions
* one transaction
* second request rejected
* unknown outcome.
Do not deliberately cause financial harm. If live experimentation is unsafe, inspect the implementation/network evidence instead.
## 10. DOM RERENDER / STALE TARGET
Determine whether cashout elements are replaced during:
* odds updates
* cashout-value updates
* polling
* React/Vue rerender
* bet state updates
* animation
* modal opening.
Determine whether an element reference/locator can become stale.
Investigate whether identifying a cashout button by:
```text
index
position
text
CSS selector
DOM path
```
could select a different bet after rerender.
## 11. MULTIPLE BETS
If multiple open bets exist, determine:
* how each bet is represented
* how each cashout button maps to its bet
* whether bet identity is stable
* whether ordering can change
* whether newly added bets change indexes
* whether removed bets shift positions.
Determine the safest observable identity mechanism.
## 12. APPLICATION STATE
Inspect the JavaScript runtime for relevant application state.
Look for objects containing:
* open bets
* bet IDs
* cashout values
* cashout status
* account state
* transaction state
* loading state
* request state.
If the application uses React/Vue/Angular or another framework, identify the relevant component/state representation where possible.
Do not modify application state.
## 13. PAGE LIFECYCLE
Investigate what happens to cashout state during:
* page reload
* navigation
* SPA route change
* DOM replacement
* session refresh
* reconnect
* browser/tab visibility changes.
Determine whether a previously identified cashout target remains valid.
## 14. MASTER → SLAVE IMPLICATIONS
This investigation is also intended to inform a browser-synchronization system.
Determine what information would actually need to be synchronized for another browser to perform the **corresponding cashout**.
Compare:
### Model A
Replicate the original click.
### Model B
Replicate the target bet identity and perform an equivalent click.
### Model C
Replicate the cashout intent and independently resolve the target.
### Model D
Replicate the resulting transaction/state.
Determine which model is most faithful to what the website actually does.
Pay special attention to whether different browser instances could have:
* different cashout values
* different bet ordering
* different DOM structures
* different available cashout states
* different server state.
## 15. FINAL FORENSIC REPORT
Produce the following:
### A. Cashout DOM Map
Important elements and their relationships.
### B. Event Flow
```text
click
→ handler
→ application logic
→ request
```
### C. Network Flow
Identify the actual cashout request and relevant identifiers.
### D. Transaction Boundary
Clearly identify:
* logical boundary
* physical/server boundary
* confirmation boundary.
### E. Target Identity
Explain exactly how the browser identifies the bet.
### F. State Machine
Actual observed states and transitions.
### G. Success/Failure/Unknown
Explain how each can be distinguished.
### H. Duplicate/Idempotency
Explain duplicate behavior.
### I. Dynamic DOM Risks
Explain rerender/stale-target risks.
### J. Multi-Bet Risks
Explain whether the wrong bet can theoretically be targeted.
### K. Master/Slave Synchronization Requirements
Identify the minimum information required to reproduce the corresponding cashout.
### L. Failure Modes
List:
* stale target
* DOM mutation
* changed cashout value
* timeout
* duplicate request
* lost request
* delayed request
* navigation
* session change
* server rejection
* browser crash.
For each state whether it is:
```text
SAFE
RECOVERABLE
AMBIGUOUS
DANGEROUS
UNKNOWN
```
### M. Strongest Mechanisms
Identify the strongest mechanisms already present in the website.
### N. Weakest Mechanisms
Identify the weakest assumptions.
### O. Most Important Finding
Answer:
> What is the single most important mechanical fact about cashout discovered from the live browser?
### P. Evidence Quality
For every major conclusion state:
```text
VERIFIED
STRONGLY SUPPORTED
INFERRED
UNKNOWN
```
Do not provide a redesign or implementation plan yet.
The goal is to establish the actual browser-side mechanical truth of cashout before any architecture is changed.


## AI

### Analyzing data

**Data used:**
````
* Element's uid is 58580.
* Its selector is `.m-sportBets`
* It has 2 child element nodes: `.open-bets-header-wrap` (uid=58567), `div` (uid=58579)
* It doesn't have any child text nodes
* It has a next sibling and it is an element (uid=58581) node
* It has a previous sibling and it is a non element node
* Its parent's selector is `.m-main-mid.m-has-bottom-nav.has-bg-color` (uid=58618)
* Its parent is an element node
* Its parent has 3 child element nodes: `.m-sportBets` (uid=58580), `span` (uid=58581), `.m-bottom-nav` (uid=58617)
````

### Inspect .m-sportBets structure

I need to see the internal structure of the .m-sportBets container to identify bet cards, buttons, and identifiers.

**Code executed:**
```
const sportBets = document.querySelector('.m-sportBets');
const data = {
  html: sportBets ? sportBets.outerHTML.substring(0, 2000) : 'Not found',
  children: Array.from(sportBets?.children || []).map(child => ({
    tagName: child.tagName,
    className: child.className,
    text: child.innerText?.substring(0, 50)
  })),
  parent: sportBets?.parentElement?.className
};
```

**Data returned:**
```
{"html":"<div data-op=\"open-bets-login\" class=\"m-sportBets\"><div data-op=\"open-bets-header\" class=\"open-bets-header-wrap\"><div><!----> <div class=\"m-openbet-header\"><div><div data-op=\"open_bets__how_to_cashout_link\" class=\"how-to-cashout-entry\"><div data-v-da651318=\"\" class=\"how-to-cashout-icon icon-font-base\" style=\"font-size: 1.33333rem;\"></div> <span data-cms-key=\"how_to_cashout\" data-cms-page=\"cashout\">How to Cashout?</span></div></div> <div><div class=\"is-login\"><div data-v-506e0cfc=\"\" class=\"avatar-wrap\"><img data-v-506e0cfc=\"\" src=\"//s.sporty.net/common/avatar/14.png\" class=\"avatar-image\"><img data-v-506e0cfc=\"\" src=\"//s.sporty.net/common/avatar_frame/tier_empty.png\" class=\"avatar-frame\"></div> <span class=\"balance\"><span>NGN </span> <span>11.43</span></span></div></div></div></div> <div data-v-54aad518=\"\" class=\"m-snap-nav-wrap m-list-nav-type m-bets--nav\" style=\"overflow: hidden;\"> <ul class=\"m-snap-nav flex\" style=\"transform: translate(0px, 0px) translateZ(0px); transition-duration: 350ms; transition-timing-function: cubic-bezier(0.1, 0.57, 0.1, 1); width: 358px;\"><li data-v-54aad518=\"\" class=\"m-list-nav-type-item m-snap-nav-item active\"><span data-v-54aad518=\"\" data-cms-key=\"open_bets\" data-cms-page=\"common_functions\">Open Bets</span> <span data-v-54aad518=\"\" data-op=\"openbet-header-list-count\">\n      (2)\n    </span></li><li data-v-54aad518=\"\" class=\"m-list-nav-type-item m-snap-nav-item\"><span data-v-54aad518=\"\" data-cms-key=\"bet_history\" data-cms-page=\"common_functions\">Bet History</span> <!----></li></ul> <i class=\"controls left-controls\"></i> <i class=\"controls right-controls\"></i> </div></div> <div data-v-3908e328=\"\"><div data-v-3908e328=\"\" class=\"\"></div> <div data-v-43268b7d=\"\" data-v-3908e328=\"\" class=\"m-openbet\"><div data-v-43268b7d=\"\" class=\"open-bets-list-operation\"><div data-v-43268b7d=\"\" class=\"top-bar__content\"><ul data-v-43268b7d=\"\" class=\"m-uc-nav m-open-bet-filter\"><li data-op=\"openbet-nav-all\" class=\"m-nav-item m-nav-item--active\"><span data-cms-","children":[{"tagName":"DIV","className":"open-bets-header-wrap","text":"\nHow to Cashout?\nNGN 11.43\nOpen Bets (2)\nBet Hist"},{"tagName":"DIV","className":"","text":"All\nCashout Available\nLive Games\nSingles\nRebet\nSIM"}],"parent":"m-main-mid m-has-bottom-nav has-bg-color"}
```

### Locate bet cards and cashout buttons

I need to find the individual bet cards and identify how they are represented in the DOM, including any unique IDs and the presence of cashout buttons.

**Code executed:**
```
const openBetContainer = document.querySelector('.m-openbet');
const betCards = Array.from(openBetContainer.querySelectorAll('.m-bet-card, [class*="bet-card"], .m-bet-item, [class*="bet-item"]'));

const data = {
  betCount: betCards.length,
  betDetails: betCards.map(card => ({
    className: card.className,
    id: card.id,
    dataAttributes: Object.keys(card.dataset).reduce((acc, key) => {
        acc[key] = card.dataset[key];
        return acc;
    }, {}),
    htmlSnippet: card.outerHTML.substring(0, 500),
    cashoutButton: card.querySelector('button, .m-btn, .cashout-btn, [class*="cashout"]')?.className,
    cashoutValue: card.querySelector('.cashout-amount, [class*="cashout-value"], .m-cashout-btn')?.innerText
  }))
};
```

**Data returned:**
```
{"betCount":2,"betDetails":[{"className":"m-bet-item","id":"","dataAttributes":{"op":"openbet-item-wrapper-260905154630bet56580023"},"htmlSnippet":"<li data-op=\"openbet-item-wrapper-260905154630bet56580023\" class=\"m-bet-item\"><div><div class=\"m-item-wrap\"><div class=\"m-title\"><div class=\"left-section\"><span data-op=\"openbet-item-title\" class=\"m-t-14 m-t-bold m-list-t-default title-text\">\n                  Singles\n                </span> <div class=\"match-live-insure-wrapper\"><span data-op=\"openbet-item-live-tag\" style=\"display: none;\"><span class=\"m-i-live m-t-b5\" data-cms-key=\"live\" data-cms-page=\"common_functions\">Live</span></span> <!---","cashoutButton":"af-button af-button--primary m-btn--cashout simple"},{"className":"m-bet-item","id":"","dataAttributes":{"op":"openbet-item-wrapper-260905154619bet56419473"},"htmlSnippet":"<li data-op=\"openbet-item-wrapper-260905154619bet56419473\" class=\"m-bet-item\"><div><div class=\"m-item-wrap\"><div class=\"m-title\"><div class=\"left-section\"><span data-op=\"openbet-item-title\" class=\"m-t-14 m-t-bold m-list-t-default title-text\">\n                  Singles\n                </span> <div class=\"match-live-insure-wrapper\"><span data-op=\"openbet-item-live-tag\" style=\"display: none;\"><span class=\"m-i-live m-t-b5\" data-cms-key=\"live\" data-cms-page=\"common_functions\">Live</span></span> <!---","cashoutButton":"af-button af-button--primary m-btn--cashout simple"}]}
```

### Detailed inspection of bet items and cashout buttons

Inspecting the specific identifiers on the bet items and the cashout buttons. Looking for IDs in data-op and checking the button text/attributes for cashout values.

**Code executed:**
```
const betItems = document.querySelectorAll('.m-bet-item');
const data = Array.from(betItems).map(item => {
  const cashoutBtn = item.querySelector('.m-btn--cashout');
  return {
    betIdFromDataOp: item.dataset.op,
    buttonClasses: cashoutBtn?.className,
    buttonText: cashoutBtn?.innerText,
    buttonData: cashoutBtn ? Object.keys(cashoutBtn.dataset).reduce((acc, key) => {
        acc[key] = cashoutBtn.dataset[key];
        return acc;
    }, {}) : null,
    cashoutValue: item.querySelector('.m-cashout-value')?.innerText || item.querySelector('.m-btn--cashout')?.innerText
  };
});
```

**Data returned:**
```
[{"betIdFromDataOp":"openbet-item-wrapper-260905154630bet56580023","buttonClasses":"af-button af-button--primary m-btn--cashout simple","buttonText":"Cashout\nNGN 10.00","buttonData":{"v-7595d402":"","op":"openbet__cashout_btn"},"cashoutValue":"Cashout\nNGN 10.00"},{"betIdFromDataOp":"openbet-item-wrapper-260905154619bet56419473","buttonClasses":"af-button af-button--primary m-btn--cashout simple","buttonText":"Cashout\nNGN 10.00","buttonData":{"v-7595d402":"","op":"openbet__cashout_btn"},"cashoutValue":"Cashout\nNGN 10.00"}]
```

### Identify event handling on cashout button

Identifying how the event is handled. Checking for framework-specific properties on the button to see if it's managed by Vue/React.

**Code executed:**
```
const betId = "260905154630bet56580023"; // Extracted from data-op="openbet-item-wrapper-260905154630bet56580023"
const betItem = document.querySelector(`[data-op*="${betId}"]`);
const cashoutBtn = betItem.querySelector('.m-btn--cashout');

// Check for event listeners using getEventListeners if possible (Chrome console only)
// Since I can't use getEventListeners here, I'll check for common framework properties
const data = {
  tagName: cashoutBtn.tagName,
  attributes: Array.from(cashoutBtn.attributes).map(a => ({ name: a.name, value: a.value })),
  reactProps: Object.keys(cashoutBtn).filter(k => k.startsWith('__react')),
  vueProps: Object.keys(cashoutBtn).filter(k => k.startsWith('__vue')),
  angularProps: Object.keys(cashoutBtn).filter(k => k.startsWith('__ng'))
};
```

**Data returned:**
```
{"tagName":"BUTTON","attributes":[{"name":"data-v-7595d402","value":""},{"name":"class","value":"af-button af-button--primary m-btn--cashout simple"},{"name":"type","value":"button"},{"name":"data-op","value":"openbet__cashout_btn"}],"reactProps":[],"vueProps":[],"angularProps":[]}
```

### Check for Vue.js presence

Checking for Vue.js instances. The 'data-v-...' attributes strongly suggest Vue.

**Code executed:**
```
const betItem = document.querySelector('.m-bet-item');
const data = {
  vueInstance: betItem.__vue__ ? 'Found Vue instance' : 'Not found',
  vueParent: betItem.parentElement?.__vue__ ? 'Found Vue instance on parent' : 'Not found',
  vueRoot: document.querySelector('#app')?.__vue__ ? 'Found Vue instance on root' : 'Not found'
};
```

**Data returned:**
```
{"vueInstance":"Not found","vueParent":"Not found","vueRoot":"Not found"}
```

### Search for bet ID in storage and window properties

Looking for where the bet data might be stored in the browser state.

**Code executed:**
```
// Search for the bet ID in the global scope or common storage places
const betId = "260905154630bet56580023";
const data = {
  localStorage: Object.keys(localStorage).filter(k => k.includes('bet') || localStorage[k].includes(betId)),
  sessionStorage: Object.keys(sessionStorage).filter(k => k.includes('bet') || sessionStorage[k].includes(betId)),
  windowProps: Object.keys(window).filter(k => k.toLowerCase().includes('state') || k.toLowerCase().includes('store'))
};
```

**Data returned:**
```
{"localStorage":["wap_betslip_settings_red_dot_clicked","desktop_betslip_country","h5_betslip_boost_guide","ethereum-https://www.sportybet.com","binance-https://www.sportybet.com","betTipsStatus","wap_last_betslip_mode","wap_bet_settings_new_badge_seen_time","betslipsBankers","has_been_shown_sim_openbet_tooltip","retainSelectionsAfterRebet_A230219141836puid15606512","place_bet_count","retainSelectionsAfterRebet_p231008150453puid60903174","betslipsSelections","betslip_floating_position","h5_openbet","wap_fast_betslip","betslips","betslip_show_more_options","wap_betslip_country","wap_betslip_settings_red_dot_seen_time","retainSelectionsAfterRebet_p210904182345puid01753701"],"sessionStorage":[],"windowProps":["oncontentvisibilityautostatechange","oncontextrestored","onpopstate","cookieStore"]}
```

### Inspect relevant local storage keys

Inspecting relevant local storage keys discovered in the previous step.

**Code executed:**
```
const data = {
  h5_openbet: localStorage.getItem('h5_openbet'),
  betslips: localStorage.getItem('betslips')
};
```

**Data returned:**
```
{"h5_openbet":"0","betslips":"[{\"home\":\"Udinese\",\"away\":\"Shabab Al Ahli Dubai\",\"desc\":\"4th Goal\",\"estimateStartTime\":1785252600000,\"marketInfo\":{\"id\":\"8?goalnr=4\",\"desc\":\"4th Goal\",\"group\":\"Main\",\"groupId\":\"171121135724MGI11262166\",\"status\":3,\"product\":1,\"specifier\":\"goalnr=4\",\"marketId\":\"8\",\"marketGuide\":\"Predict which team will score the Nth goal in the match. Overtime not included.\",\"sourceType\":\"BET_RADAR\",\"favourite\":0,\"pushTime\":\"1785259195076\"},\"outcomeInfo\":{\"id\":\"6\",\"odds\":\"5.40\",\"probability\":\"0.0913013225\",\"voidProbability\":\"0E-10\",\"isActive\":0,\"desc\":\"Home\",\"statusDesc\":\"unavailable\",\"showOdds\":false},\"eventId\":\"sr:match:72827740\",\"sportId\":\"sr:sport:1\",\"sportName\":\"football\",\"categoryId\":\"sr:category:393\",\"tournamentId\":\"sr:tournament:853\",\"key\":\"sr:sport:1_sr:match:72827740_8?goalnr=4_6\",\"topic\":\"1^393^sr:tournament:853^sr:match:72827740^~^8^goalnr=4\",\"baseTopic\":\"1^393^sr:tournament:853^sr:match:72827740\",\"simInvalid\":null,\"pushTime\":\"1785259195076\",\"isFinish\":true}]"}
```

### Confirm Bet ID location in DOM

Looking deeper into the bet item for identifiers. The data-op on the item (e.g., openbet-item-wrapper-260905154630bet56580023) seems to contain the Bet ID.

**Code executed:**
```
const betItem = document.querySelector('.m-bet-item');
const data = {
  itemDataOp: betItem.dataset.op,
  buttonDataOp: betItem.querySelector('.m-btn--cashout').dataset.op,
  betDetailHtml: betItem.querySelector('.m-bet-detail')?.innerHTML.substring(0, 500)
};
```

**Data returned:**
```
{"itemDataOp":"openbet-item-wrapper-260905154630bet56580023","buttonDataOp":"openbet__cashout_btn"}
```

### Extract Bet IDs from DOM attributes

Extracting the bet IDs for all open bets to see how they are structured.

**Code executed:**
```
const betItems = document.querySelectorAll('.m-bet-item');
const data = Array.from(betItems).map(item => {
  const cashoutBtn = item.querySelector('.m-btn--cashout');
  const betIdMatch = item.dataset.op.match(/wrapper-(.+)$/);
  const betId = betIdMatch ? betIdMatch[1] : null;

  return {
    betId,
    fullDataOp: item.dataset.op,
    cashoutValue: cashoutBtn?.innerText
  };
});
```

**Data returned:**
```
[{"betId":"260905154630bet56580023","fullDataOp":"openbet-item-wrapper-260905154630bet56580023","cashoutValue":"Cashout\nNGN 10.00"},{"betId":"260905154619bet56419473","fullDataOp":"openbet-item-wrapper-260905154619bet56419473","cashoutValue":"Cashout\nNGN 10.00"}]
```

### Deep dive into bet item attributes and children

Inspecting all attributes and children of the bet item to find more identifiers or state indicators.

**Code executed:**
```
const betItem = document.querySelector('.m-bet-item');
const data = {
  allAttrs: Array.from(betItem.attributes).map(a => ({ name: a.name, value: a.value })),
  childAttrs: Array.from(betItem.querySelectorAll('*')).slice(0, 10).map(el => ({
    tagName: el.tagName,
    className: el.className,
    dataset: el.dataset
  }))
};
```

**Data returned:**
```
{"allAttrs":[{"name":"data-op","value":"openbet-item-wrapper-260905154630bet56580023"},{"name":"class","value":"m-bet-item"}],"childAttrs":[{"tagName":"DIV","className":"","dataset":{}},{"tagName":"DIV","className":"m-item-wrap","dataset":{}},{"tagName":"DIV","className":"m-title","dataset":{}},{"tagName":"DIV","className":"left-section","dataset":{}},{"tagName":"SPAN","className":"m-t-14 m-t-bold m-list-t-default title-text","dataset":{"op":"openbet-item-title"}},{"tagName":"DIV","className":"match-live-insure-wrapper","dataset":{}},{"tagName":"SPAN","className":"","dataset":{"op":"openbet-item-live-tag"}},{"tagName":"SPAN","className":"m-i-live m-t-b5","dataset":{"cmsKey":"live","cmsPage":"common_functions"}},{"tagName":"DIV","className":"right-section","dataset":{}},{"tagName":"DIV","className":"rebet-button","dataset":{"op":"open_bets__rebet"}}]}
```