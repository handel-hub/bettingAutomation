# Betting Automation System: Deep-Dive Browser Architecture

This document is the definitive, developer-level technical reference for the v2 Browser Architecture. It exhaustively details the classes, methods, internal data structures, and event flows that power the engine. After reading this, a developer will be able to write workflows, extend modules, or debug the core without needing to trace through the source code.

---

## 1. The Core Abstraction: `Command.mjs`
The entire architecture revolves around a single data structure: the `Command`. The Execution subsystem **only** accepts `Command` objects. It does not accept raw Playwright objects or arbitrary strings.

### Class: `Command`
**Location:** `src/browser/execution/Command.mjs`

**Constructor Parameters:**
* `id` *(String)*: Unique identifier. If omitted, `crypto.randomUUID()` is generated automatically.
* `type` *(String)*: The precise action type. Supported values: `'click'`, `'input'`, `'navigate'`, `'macro'`.
* `target` *(Array|String)*: Identifies which browsers should execute this. E.g., `['slave_0']`, `ALL`. Usually defaults to `ALL`.
* `payload` *(Object)*: The data needed to execute the action. 
  * For `click`: `{ selector: '.submit-btn' }`
  * For `input`: `{ selector: 'input[name="pwd"]', value: 'secret' }`
  * For `navigate`: `{ url: 'https://...' }`
* `source` *(String)*: Identifies the originator (e.g., `'Master Browser'`, `'MacroEngine'`). Used for logging and debugging tracebacks.
* `executionMode` *(String)*: Routing instructions for the `AutomationController`.
  * `'SLAVES_ONLY'`: Only run on slaves (used when Master mirrors its own clicks).
  * `'ALL'`: Run on everything.
  * `'MASTER_ONLY'`: Run only on the master node.

---

## 2. The Command Hub: `AutomationController.mjs`
**Location:** `src/browser/AutomationController.mjs`

The `AutomationController` initializes and binds all the modules together. It is the central nervous system.

### Internal Flow
1. **Boot:** Reads `accounts.enc`, asks the `ProxyManager` for proxies, and initializes the `BrowserRegistry`.
2. **Master Boot:** Instructs `BrowserLifecycleManager` to spawn `id='master'`, `role='master'`, and binds the `NavigationSynchronizer` and `ActionDispatcher` to it.
3. **Slave Boot:** Maps over `accounts.enc` and asks `LifecycleManager` to spawn slaves (`slave_0`, `slave_1`). Uses `SessionManager` to authenticate them.
4. **Event Routing:** 
   * Listens to `HealthMonitor` for `'HealthFailure'`.
   * Listens to `ActionDispatcher` for `'ExecutionRequested'`.
   * Maps `ExecutionRequested` commands to targets in the `BrowserRegistry` based on the `Command.executionMode`.
   * Dispatches mapped commands via `Promise.allSettled()` to the `ActionSimulator`.

---

## 3. The Coordination Subsystem
**Location:** `src/browser/coordination/`
This subsystem is strictly forbidden from executing betting logic. Its sole purpose is maintaining the health, state, and security of the Playwright nodes.

### 3.1 `BrowserRegistry.mjs`
**Purpose:** $O(1)$ state lookups. Prevents looping through Playwright instances just to check if they are busy.
**API:**
* `register(id, role, username, proxyUrl, browser, context, page)`: Injects a new node into the `Map`. Sets initial state to `'Starting'`.
* `updateState(id, newState)`: Changes state (`'Starting'`, `'Ready'`, `'Busy'`, `'Error'`). Emits a `'StateChanged'` event containing `{ id, oldState, newState }`.
* `get(id)`: Returns the metadata and Playwright objects.
* `getAll(filterFn)`: Returns an array of node objects matching the filter (e.g., `b => b.state === 'Ready'`).
* `remove(id)`: Deletes the node from the map.

### 3.2 `BrowserLifecycleManager.mjs`
**Purpose:** Spawns browsers.
**API:**
* `spawnBrowser(id, role, proxyUrl, username)`: Interacts with the global `StealthEngine` to generate an evasion configuration, launches a Chromium instance over the specific proxy, applies ad-blocking extensions via CLI flags, and registers the returned `browser`, `context`, and `page` into the `BrowserRegistry`.

### 3.3 `SessionManager.mjs`
**Purpose:** Highly secure cookie extraction and injection.
**Internal Crypto Specs:**
* Uses `utils/crypto.mjs` (`scryptSync` derived 32-byte key from `MASTER_KEY`, `AES-256-GCM`).
* **AAD Binding:** Injects the `username` as Authenticated Additional Data during `encrypt(payload, username)`. If decryption is attempted on a file whose name does not match the AAD, `decipher.update()` throws an authentication error.
* Writes JSON ciphertexts strictly using `fs.writeFileSync(..., { mode: 0o600 })`.
**API:**
* `loadSession(id, username)`: Attempts decryption. Returns `{ loaded: boolean, wasLegacy: boolean }`.
* `saveSession(id, username)`: Extracts cookies from `BrowserRegistry.get(id).context` and overwrites `sessions/<username>.json`.
* `verifyLoggedIn(id)`: Polls the DOM on the active page for the `.m-balance` selector. Returns a boolean.
* `restoreOrLogin(id, username, password)`: The single source of truth for authentication. Loads the session. If `verifyLoggedIn` fails (stale cookies), falls back to programmatic username/password filling. If `wasLegacy` is true, immediately forces a re-save to permanently migrate the session to ciphertext.

### 3.4 `HealthMonitor.mjs` & `RecoveryManager.mjs`
**Purpose:** Self-healing the node cluster.
**HealthMonitor API:**
* Extends `EventEmitter`.
* `start()`: Initiates a `setInterval` running every 5000ms.
* `checkHealth()`: Loops over the registry. If `b.page.isClosed()` or `b.context.isClosed()` or the target page crashes, it emits `'HealthFailure'` with the `browserId`.

**RecoveryManager API:**
* Extends `EventEmitter`.
* `heal(browserId)`: 
  1. Checks an internal `Set` to prevent duplicate concurrent heals.
  2. Kills the zombie browser via `closeQuietly()`.
  3. Evicts it from the `BrowserRegistry`.
  4. Attempts to call `SessionManager.restoreOrLogin()` up to `maxAttempts` (default 3) times, employing binary exponential backoff (`delay = baseDelay * 2^(attempt-1)`).
  5. If the node is a Master, it re-injects the `ActionDispatcher` listeners to the brand new page object.
  6. If all 3 attempts fail, it emits `'HealFailed'` with `{ browserId, maxAttempts }`.

### 3.5 `NavigationSynchronizer.mjs`
**Purpose:** Ensures slaves follow the master.
**API:**
* `setupMasterSync()`: Attaches to the Master page's `framenavigated` event. 
* Uses a `setTimeout` debounce wrapper (e.g., 500ms) to ensure that Single Page Application (SPA) routing loops or multiple fast clicks don't cause the slaves to fire overlapping `goto()` commands.
* `syncSlavesTo(url)`: Fetches all `Ready` slaves from the Registry and executes a non-blocking `page.goto(url)`.

---

## 4. The Execution Subsystem
**Location:** `src/browser/execution/`
This subsystem directly manipulates the DOM. It assumes the browsers are healthy and ready.

### 4.1 `ActionDispatcher.mjs`
**Purpose:** Captures human interactions on the Master node.
**API:**
* `injectMasterListeners(masterPage)`: 
  1. Uses `page.exposeFunction('dispatchExecutionEvent')` to open a Node-to-Browser bridge.
  2. Uses `page.addInitScript()` to inject DOM event listeners (`click`, `input`).
  3. **Ad-Filtering Logic:** When a click occurs, a `while(current !== document)` loop runs. It checks `current.tagName === 'IFRAME'` and runs `/(^|[\s_-])ad(s|v|vertisement|banner)?([\s_-]|$)/i` against `current.className` and `current.id`. If an ad is detected, the event is silently dropped to prevent slaves from clicking dynamic 3rd-party ads.
  4. If safe, a deeply precise CSS selector path (e.g., `div#main > ul > li:nth-of-type(2) > a`) is generated and sent across the bridge.
* `recordAction(action)`: Appends the action to `sequences/startup.json` if `Memory.record_action_sequence` is true in `settings.ini`.
* Emits `'ExecutionRequested'` with a fully formed `Command`.

### 4.2 `ActionSimulator.mjs`
**Purpose:** Executes Playwright commands flawlessly.
**API:**
* `execute(browserObj, command)`: The entry point.
  * **Safe Command Serialization:** Maintains `this.queues = new Map()`.
  * It looks up the existing Promise chain for the given `browserObj.id`.
  * It appends the new command to the tail: `prior.then(() => this.runCommand(...))`.
  * This guarantees that if a Macro and a Master click arrive at the *exact* same millisecond, Playwright will execute them sequentially on that specific slave, eliminating `.click()` overlap crashes.
* `runCommand(browserObj, command)`: Destructures the payload and uses `page.click()`, `page.fill()`, or `page.goto()`.
* Emits `'ActionSuccess'` or `'ActionFailure'`.

### 4.3 `MacroEngine.mjs`
**Purpose:** Batch execution of JSON sequences.
**API:**
* `loadSequence(name)`: 
  * Strips traversal syntax using `path.basename(name)`.
  * Reads `sequences/seq_{name}.json`.
  * Maps the raw JSON into standard `Command` class instances with `source: 'MacroEngine'`.
* `validate(commands, readyBrowsers)`: A pre-flight check. Maps over all ready slaves and uses `b.page.locator(selector).count()` to guarantee every required DOM node exists *before* starting the execution sequence.
* `execute(commands, targetBrowsers)`: An `await` loop that runs the sequence via the `ActionSimulator` and breaks if a step fails.
