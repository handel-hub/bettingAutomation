Viewed index.mjs:1-36
Viewed IpcIngress.mjs:1-43
Viewed ClusterOrchestrator.mjs:1-100
Viewed ClusterOrchestrator.mjs:101-200

Here is the complete, structured plan to update the **Execution Plane (`C:\Users\John\Documents\CODE\back\bettingAutomation`)** so that it integrates with the **Control Plane (`bettingAutomationControlPlane`)**.

---

### Executive Summary & Strategy

Currently, `bettingAutomation` expects a human operator in a terminal running `launcher/index.mjs`, reading plaintext credentials from `accounts.txt` and pressing keyboard keys (`V, C, B`).

The objective is to upgrade the worker (`src/worker/index.mjs`) into a **secure, managed Execution Worker** that:
1. Authenticates against the Control Plane’s named pipe using the **mutual HMAC-SHA256 handshake**.
2. Ingests credentials and configuration **in-memory from ACP** (no plaintext passwords on disk).
3. Translates ACP UI intents (`[ Place Bet ]`, `[ Cash Out ]`, `Bet Cycle Toggle`) into automated browser workflows.
4. Supports **dynamic runtime account activation & deactivation** without restarting the fleet.
5. Maintains **100% backward compatibility** (it can still run standalone via the legacy terminal launcher if `CONTROL_PLANE_PIPE` is not set).

```
┌────────────────────────────────────────────────────────────┐
│          Control Plane (Supervisor & Authority)            │
│               Named Pipe Server (with SDDL)                │
└───────────────────────────┬────────────────────────────────┘
                            │ (Stdin: 32-byte SessionKey)
                            ▼ (\\.\pipe\control_plane_secure_ipc)
┌────────────────────────────────────────────────────────────┐
│             Execution Plane (bettingAutomation)            │
│                                                            │
│   src/worker/index.mjs (Dual-Mode Bootstrap)               │
│   ├── If CONTROL_PLANE_PIPE set ──► SecureIpcClient        │
│   │                                 (HMAC Auth + Pipe)     │
│   └── Else (Legacy CLI Mode)   ──► process.on('message')   │
│                                                            │
│   src/worker/IpcIngress.mjs                                │
│   ├── TRIGGER_WORKFLOW ('placebet', 'cashout')             │
│   ├── CONTROL_COMMAND ('SET_BETTING_AUTHORIZATION')        │
│   ├── ACTIVATE_ACCOUNT (Dynamic Browser Launch)            │
│   └── DEACTIVATE_ACCOUNT (Single Browser Shutdown)         │
│                                                            │
│   src/browser/coordination/ClusterOrchestrator.mjs         │
│   ├── Dynamic activateAccount(account, proxy)              │
│   └── Dynamic deactivateAccount(accountId)                │
└────────────────────────────────────────────────────────────┘
```

---

### Phase-by-Phase Execution Plan

---

#### Component 1: Dual-Mode Ingress & Handshake Entrypoint
* **Target File**: `C:\Users\John\Documents\CODE\back\bettingAutomation\src\worker\index.mjs`
* **Changes**:
  1. Check if `process.env.CONTROL_PLANE_PIPE` is present:
     * **If Present (Control Plane Mode)**:
       * Read the 32-byte ephemeral session key from `process.stdin`.
       * Connect to the named pipe using `SecureIpcClient`.
       * Compute and transmit the 32-byte `HMAC-SHA256(sessionKey, "IPC_AUTH" + process.pid)` within 2000ms.
       * Forward pipe events into `ipcIngress`.
       * Start periodic heartbeats (`setInterval` sending `{ type: 'HEARTBEAT', pid, activeBrowsers, state }` every 3 seconds).
     * **If Absent (Legacy Standalone Mode)**:
       * Bind to standard `process.on('message')` as it does today.
  2. Ingest `INITIALIZE` payload over the pipe:
     * Receives `{ settings, accounts, proxies, policy }` passed from ACP's in-memory repositories.
     * Instantiates `AutomationController`, starts the browser cluster, and replies:
       ```json
       { "type": "STATE_UPDATE", "state": "READY", "activeBrowsers": 2 }
       ```
  3. Listen for `{ type: 'CONTROL', action: 'SHUTDOWN' }`:
     * Triggers `lifecycleManager.shutdown()` to gracefully save cookies/sessions and close all Chromium instances before exiting with code `0`.

---

#### Component 2: Expanded Command Dispatcher
* **Target File**: `C:\Users\John\Documents\CODE\back\bettingAutomation\src\worker\IpcIngress.mjs`
* **Changes**:
  Currently, `IpcIngress` only parses `TRIGGER_WORKFLOW` and `RUN_MACRO`. We extend it to support:
  1. **Tactical Operations**:
     * `{ type: 'TRIGGER_WORKFLOW', payload: { workflow: 'placebet' | 'cashout' } }` $\rightarrow$ Dispatches to `WorkflowEngine`.
     * Emits `{ type: 'OPERATION_COMPLETED', operationId, status: 'SUCCESS' }` when the bet or cashout completes.
  2. **Bet Cycle Participation Toggle**:
     * `{ type: 'CONTROL_COMMAND', category: 'Control', action: 'SET_BETTING_AUTHORIZATION', payload: { targetBrowserId, isEnabled } }`
     * Calls `AutomationController.bettingAuthorizationRegistry.enable(targetBrowserId)` or `disable(targetBrowserId)`.
  3. **Dynamic Fleet Commands**:
     * `{ type: 'ACTIVATE_ACCOUNT', payload: { account, proxy } }` $\rightarrow$ Hands off to `ClusterOrchestrator.activateAccount()`.
     * `{ type: 'DEACTIVATE_ACCOUNT', payload: { accountId } }` $\rightarrow$ Hands off to `ClusterOrchestrator.deactivateAccount()`.

---

#### Component 3: Dynamic Browser Lifecycle in `ClusterOrchestrator`
* **Target File**: `C:\Users\John\Documents\CODE\back\bettingAutomation\src\browser\coordination\ClusterOrchestrator.mjs`
* **Changes**:
  Currently, `ClusterOrchestrator.start()` spawns all browsers upfront in a static loop. To satisfy **Section 8 & 9 of `automation_workspace.md`** (activating and deactivating accounts during a live run), we add:
  1. **`activateAccount(account, proxyUrl)`**:
     * Allocates a slave identifier: `slave_${this.nextSlaveIndex++}`.
     * Launches a new Chromium instance: `await this.lifecycleManager.spawnBrowser(id, 'slave', proxyUrl, account.username)`.
     * Performs automated login: `await this.sessionManager.restoreOrLogin(id, account.username, account.password)`.
     * Injects state observers and attaches to `stateObserver`.
     * Enables betting authorization in `bettingAuthorizationRegistry`.
     * Emits `{ type: 'ACCOUNT_ACTIVATED', accountId: account.id, browserId: id }`.
  2. **`deactivateAccount(accountIdOrUsername)`**:
     * Finds the browser instance matching the account in `this.registry`.
     * Disables its betting authorization immediately so it takes no further bets.
     * Closes the Chromium page and browser process: `await targetBrowser.browser.close()`.
     * Removes it from `BrowserStateRegistry` and frees the proxy for reuse.
     * Emits `{ type: 'ACCOUNT_DEACTIVATED', accountId: account.id }`.
  3. **`getActiveBrowserCount()`**:
     * Returns `this.registry.getAll().filter(b => b.status === 'READY').length`.

---

#### Component 4: In-Memory Secret Zeroization
* **Target File**: `C:\Users\John\Documents\CODE\back\bettingAutomation\src\browser\coordination\SessionManager.mjs`
* **Changes**:
  * In the existing code, `credentialsMap` stores plaintext passwords in memory permanently.
  * **Hardening**:
    * Once `sessionManager.restoreOrLogin()` successfully verifies the bookmaker session cookies, the plaintext password is deleted from `credentialsMap` or overwritten with zeroes (`Buffer.alloc(pwd.length, 0)`).
    * If re-login is required later, the worker requests a fresh, short-lived credential grant from the Control Plane over the secure IPC pipe.

---

### Deliverables & Files to Update

| File in `bettingAutomation` | Scope of Changes |
| :--- | :--- |
| **`src/worker/SecureIpcClient.mjs`** | **[NEW]** Port the lightweight client (reads `stdin`, computes HMAC, connects to named pipe, frames messages). |
| **`src/worker/index.mjs`** | **[MODIFY]** Add dual-mode bootstrap (detects `CONTROL_PLANE_PIPE`, connects via `SecureIpcClient`, streams heartbeats). |
| **`src/worker/IpcIngress.mjs`** | **[MODIFY]** Accept `CONTROL_COMMAND`, `ACTIVATE_ACCOUNT`, `DEACTIVATE_ACCOUNT` and stream operation completion tokens. |
| **`src/browser/coordination/ClusterOrchestrator.mjs`** | **[MODIFY]** Implement dynamic `activateAccount()`, `deactivateAccount()`, and `getActiveBrowserCount()`. |
| **`src/browser/AutomationController.mjs`** | **[MODIFY]** Expose dynamic fleet hooks to `IpcIngress`. |

---

### Verification & Testing Plan

1. **Standalone Backward-Compatibility Test**:
   * Run `node launcher/index.mjs` in `bettingAutomation` to verify that existing terminal hotkeys (`V, C, B`) and standalone operation continue to work without regression.
2. **Attestation & Handshake Integration Test**:
   * Control Plane launches `bettingAutomation/src/worker/index.mjs` via `NativeCore.spawnExecutionProcess`.
   * Verify the 32-byte session key is read from `stdin`, HMAC validates in Rust, and the pipe status transitions to `CONNECTED`.
3. **Tactical Operations Test**:
   * Trigger `POST /api/v1/automation/operations/place-bet` on the Control Plane.
   * Verify `bettingAutomation` receives `TRIGGER_WORKFLOW (placebet)` and acknowledges execution.
4. **Dynamic Bet-Cycle & Activation Test**:
   * Trigger `PATCH /api/v1/automation/accounts/:id/bet-cycle` on ACP.
   * Verify `bettingAuthorizationRegistry` toggles that browser ID without terminating the Chromium process.
5. **Kill-Switch Test**:
   * Kill ACP or trigger `setRevokedSync(true)`.
   * Verify that the Windows Job Object instantly terminates the worker and all Playwright Chromium windows.

---

### Ready to Proceed?
If this plan matches what you want for the Execution Plane, I can proceed with making these updates to `bettingAutomation`.
