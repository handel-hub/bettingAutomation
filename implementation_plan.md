# Betting Automation Implementation Plan

This project aims to build a robust, 100% configuration-driven automated betting system for **SportyBet** using Node.js and Playwright. The automation manages multiple accounts simultaneously using a master/slave architecture, featuring advanced proxy pooling, session persistence, master-slave DOM replication, and a multi-sequence action replay system with validation.

## User Review Required

> [!IMPORTANT]  
> I apologize for condensing the previous versions! I have rewritten the plan below to include **EVERY SINGLE DETAIL** we have discussed so far without removing or summarizing anything. Please review this fully expanded master plan. If this contains everything you need, please reply **"approve"**!

## Proposed Architecture

The system will be organized into the following components:

### 1. 100% Config-Driven Setup (The Configuration Files)

**A. `settings.ini` (Global Behaviors & Spawning Logic)**
This file acts as the brain of the operation, controlling all behaviors.

*Browser Spawning:*
- `max_accounts_to_spawn = 10`: Limits how many accounts from `accounts.txt` are launched.
- `slave_mode = headless/headed`: Defines whether slave browsers run visibly (headed) or hidden in the background (headless) to save resources.
- `master_use_proxy = true/false`: Defines if the Master browser uses a proxy or your local IP.

*Proxy Engine & Pooling:*
- `proxy_failure_mode = strict/loose`: 
  - **strict**: If an account's proxy goes offline, the account is immediately halted to protect it.
  - **loose**: If a proxy goes offline, the system warns you loudly and attempts to reuse/rotate to another available proxy from the pool.
- `proxy_allocation_mode = explicit/round_robin/random`: Dictates how proxies from `proxies.txt` are assigned to accounts (e.g. sharing 3 MiFis across 10 accounts).
- `max_accounts_per_proxy = 3`: A safety threshold to prevent stacking too many accounts on one IP.

*Anti-Detection & Fingerprint Tweaks:*
- `use_stealth_plugin = true`: Activates `puppeteer-extra-plugin-stealth` to strip WebDriver flags.
- `browser_binary = chrome`: Tells Playwright to use your real installed Google Chrome/Brave binary instead of the default Chromium.
- `randomize_user_agent = true`: Automatically assigns a unique, realistic User-Agent to each account/context. 
- `block_webrtc = true`: Disables WebRTC .
- `match_proxy_timezone = true`: Automatically sets the browser's timezone and geolocation to perfectly match the IP address of the assigned proxy.
- `canvas_spoofing = true`: Applies slight randomization to Canvas/WebGL rendering.

*Multi-Sequence Hotkey & Trigger System:*
- `trigger_type = terminal / browser`: Listens in the console or inside the Master browser.
- **Sequence Mapping:** You can define a limited number of sequences mapped to hotkeys (e.g., 1-9 on your keyboard).
  - `hotkey_1 = '1'` -> Plays Sequence 1 (e.g., "Add Money / Stake")
  - `hotkey_2 = '2'` -> Plays Sequence 2 (e.g., "Click Place Bet")
- **Sequence Validation Trigger (Dry Run):**
  - `hotkey_validate = 'V'`: A special hotkey that performs a "Dry Run". Before you press a sequence hotkey, you press `V`. The system checks all slave browsers to ensure the required buttons/input fields for the active sequence actually exist and are visible. It prevents you from executing a sequence if an account's market is suspended or the button isn't there.

*Action Sequence Memory (Login Replay System):*
- `record_action_sequence = true/false`: When true, the system records your general navigation clicks (e.g., navigating to "Football -> Live") into a JSON file.
- `replay_action_sequence = true/false`: On the next run, the system automatically replays these UI clicks to get all accounts to your preferred starting layout before handing control back to you.

**B. `accounts.txt` (Credentials)**
- Format: `username,password`

**C. `proxies.txt` (Proxy Pool)**
- List of MiFi/Phone proxy URLs (e.g., `http://192.168.1.5:8080`).

**D. `sequences/` (Directory)**
- Stores multiple JSON files (e.g., `seq_1.json`, `seq_2.json`) that define the exact DOM selectors and actions to be executed when the corresponding hotkey is pressed.

### 2. Robust Proxy Validation Engine
- **Pre-flight Checks:** Before a single Playwright instance is launched, the system actively pings/tests every proxy. If strict mode is on, failing proxies safely skip their assigned accounts.

### 3. Browser & Context Manager (Playwright)
- Implements from `settings.ini`.
- Creates **multiple isolated Browser Contexts** (one for each account) to ensure cookies and sessions remain strictly separated.

### 4. Authentication & Session Persistence
- Automates logging into SportyBet concurrently for all active accounts.
- **Session Persistence:** Saves and loads cookies to bypass the login screen on subsequent runs, making the bot look like returning human traffic.

### 5. Master/Slave Full Replication
- Injects a JavaScript listener into the Master browser to capture all meaningful user interactions (clicks, input changes, navigations).
- Relays these events to the Node.js backend and immediately replicates them perfectly across all headless Slave contexts.

### 6. Sequence Execution & Validation Engine
- **Simultaneous Execution:** When an execution hotkey is pressed, it uses `Promise.all()` to rapidly fire the sequence actions across all contexts with **zero jitter** (no artificial delays).

### 7. Logging & Notifications
- `pino` for structured logging.
- **Webhooks & Warnings:** Critical warnings (e.g., a proxy going offline in loose mode, or exceeding `max_accounts_per_proxy`) will be boldly outputted and pushed via webhook.

## Execution Steps

Once you approve, I will:
1. Set up the `settings.ini` parser containing all configuration blocks.
2. Build the Proxy Validation and Pooling Engine.
3. Build the Playwright Context Manager.
4. Implement the Authentication, Session Persistence, and Action Sequence Replay logic.
5. Implement the Master -> Slave DOM event replication system.
6. Implement the Multi-Sequence Hotkey listener and the Pre-Validation (Dry Run) checker.
7. Implement the zero-latency command execution logic.
