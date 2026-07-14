# Betting Automation Engine

Welcome to the Betting Automation Engine. This system uses Playwright to drive a Master browser and multiple Slave browsers concurrently. Actions performed in the Master browser (clicks, typing, cashouts) can be mirrored to the Slaves, or recorded as macros for later playback.

## 1. Prerequisites & Setup

Ensure you have [Node.js](https://nodejs.org/) (v18 or higher) installed.

Open your terminal in the project directory and install the dependencies:
```bash
npm install
```

### The `.env` File
Create a `.env` file in the root directory (if it doesn't already exist) and define a `MASTER_KEY`. This key encrypts your account passwords on disk.
```env
MASTER_KEY=your_super_secret_key_here
```
> **CAUTION:** If you ever change this `MASTER_KEY`, you must delete `accounts.enc` and recreate your plaintext `accounts.txt` file, otherwise the system will fail to decrypt your accounts and will refuse to start.

## 2. Configuration Files

Before starting the system, you need to configure your accounts, proxies, and settings.

### `accounts.txt`
Create a file named `accounts.txt` in the root directory. Add your accounts in the format `username,password`, one per line:
```text
user1@email.com,Password123
user2@email.com,Password456
```
*(On the first run, the system will read this file, encrypt it to `accounts.enc`, and automatically delete `accounts.txt` for security.)*

### `proxies.txt` (Optional)
If you want to route slave browsers through proxies, create `proxies.txt` in the root directory. Add your proxy URLs, one per line:
```text
http://user:pass@12.34.56.78:8080
http://user:pass@87.65.43.21:8080
```

### `settings.ini`
This file controls the core behavior of the system.
- `max_accounts_to_spawn`: How many slaves to launch.
- `master_use_proxy`: Set to `true` or `false`.
- `record_action_sequence`: Set to `true` to record your Master browser clicks into a macro.
- `hotkey_validate`: The key to press to enter "Dry-Run/Validation" mode (default: `V`).
- `hotkey_cashout`: The key to press to trigger the Cashout workflow (e.g., `C`).
- `hotkey_1`: The key to playback macro 1 (default: `1`).

## 3. Starting the System

To launch the system, simply run:
```bash
npm start
```
1. The system will load the config and decrypt your accounts.
2. It will launch the **Master Browser** (a visible Chrome window).
3. It will launch the **Slave Browsers** (hidden in the background by default) and automatically log them in.
4. The terminal will display live logs showing the health and status of the slaves.

## 4. Using the System

### Recording a Macro
If `record_action_sequence = true` in `settings.ini`, any click or text input you perform in the Master Browser is recorded into `sequences/startup.json`. 
- **Tip**: Do your bet placement sequence slowly. The system will record it. When you close the program, the sequence is saved. Rename `startup.json` to `seq_1.json` to map it to `hotkey_1`.

### Playback & Hotkeys
With the terminal window focused, press your configured hotkeys:
- **`1` (or your `hotkey_1` config)**: Commands all ready slaves to blindly playback the macro saved in `seq_1.json`.
- **`C` (or your `hotkey_cashout` config)**: Triggers the robust Cashout Workflow. The system will safely lock accounts, find open tickets, and click cashout independently of what the master is doing.

### Validation Mode (Dry-Run)
Press **`V`** (or your `hotkey_validate` config). The terminal will say `[Validation Mode ON]`. 
Next, press a macro hotkey (e.g., `1`). Instead of actually clicking, the system will check the DOM of every slave to ensure the required buttons/elements are visible, and report back if it's safe to run!
