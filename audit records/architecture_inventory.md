# System Architecture Inventory: Betting Automation System (v2 Architecture)

## 1. Executive Summary
The Betting Automation System is a distributed, event-driven, multi-browser orchestration framework designed for synchronized execution across a "master" browser and one or more "slave" browsers. It employs a complex architecture to capture actions on the master instance, decouple them into robust locators via an injected locator intelligence pipeline, and safely replicate these actions on slave instances. The architecture heavily features advanced synchronization barriers, an abstraction-rich execution pipeline, and a dedicated stealth/anti-detection subsystem to operate seamlessly.

## 2. High-Level Architecture
The system operates using a localized Master-Slave distributed architecture model:
- **Master Browser**: Acts as the single source of truth and user-interaction proxy. It captures raw DOM events, interprets interactions using an injected Intelligence Engine, and broadcasts "Execution Events".
- **Controller & Router**: The central nervous system (`AutomationController`, `CommandRouter`) coordinates event propagation, subsystem initialization, and dependency injection.
- **Slave Browsers**: Replicate the actions performed on the master browser. Each slave processes a queued stream of Commands, waiting for specific environmental conditions (Synchronization Barriers) before physical execution (`ActionSimulator`).

## 3. Subsystem Inventory

### Browser Coordination
- **Purpose**: Manage the lifecycle, registry, health, and sessions of all browser instances.
- **Components**: `AutomationController` (Orchestrator), `BrowserLifecycleManager`, `BrowserRegistry`, `SessionManager`, `HealthMonitor`, `NavigationSynchronizer`, `TargetResolver`, `AccountLockManager`.
- **Dependencies**: Depends on the Detection/Stealth subsystem for spawning, and the Synchronization subsystem for capability tracking.

### Synchronization Engine
- **Purpose**: Prevent execution drift and ensure target browsers are in the correct state (DOM, Network, Viewport) before actions are executed.
- **Components**: `SynchronizationManager`, `SynchronizationCoordinator`, `SynchronizationBarrier`, `ConsistencyEvaluator`, `RecoveryCoordinator`, `BrowserStateRegistry`, `CapabilityRegistry`.
- **Capability Providers**: Abstracted conditions required before execution (`DOMCapabilityProvider`, `ConnectionCapabilityProvider`, `NavigationCapabilityProvider`, etc.).
- **Lifecycle**: Wraps command execution; evaluates capability states constantly.

### Execution Pipeline
- **Purpose**: Capture, schedule, and simulate actions robustly on target browsers.
- **Components**: `ActionDispatcher` (Event ingestion), `ExecutionScheduler` (Priority-based queuing and throttling), `ActionSimulator` (Physical Playwright execution), `CommandReceiver`, `MacroEngine`, `WorkflowEngine` (High-level procedural automation like Cashout).
- **Locator Engine**: Injected directly into the master page. Captures complex paths (Shadow DOM, iframes), validates them, and serializes locators (via strategies like DataAttribute, Text, Aria).

### Detection (Stealth & Proxies)
- **Purpose**: Prevent bot mitigation systems from identifying the browser instances.
- **Components**: `ProxyManager` (Proxy allocation/validation), `StealthEngine` (Puppeteer stealth plugins, UA randomization, OS/Screen dimension spoofing for Mobile targets).

## 4. Dependency Graph
- **AutomationController** -> owns `BrowserRegistry`, `BrowserLifecycleManager`, `SessionManager`, `ExecutionScheduler`, `ActionDispatcher`, `WorkflowEngine`, `CommandRouter`, `SynchronizationManager`.
- **CommandRouter** -> Routes between *Coordination*, *Execution*, and *Recovery*.
- **ActionDispatcher** -> Depends on Playwright page bindings to receive events from the injected *Locator Intelligence Engine*.
- **ExecutionScheduler** -> Depends on `SynchronizationBarrier` (to wait for state) and `ActionSimulator` (to execute).
- **SynchronizationManager** -> Depends on `CapabilityRegistry` (Providers) and `BrowserStateRegistry` (Truth).
- **BrowserLifecycleManager** -> Depends on `StealthEngine` and `ProxyManager`.

## 5. Runtime Data Flow
1. **Startup**: `AutomationController` spawns master and slaves via `BrowserLifecycleManager`. Proxies and stealth configurations are applied. Sessions are restored via `SessionManager`.
2. **Injection**: `ActionDispatcher` injects the Locator Intelligence Engine and Interaction Collector scripts into the master browser.
3. **Capture**: User acts on the master browser. `InteractionCollector` aggregates physical events (e.g., clicks, scrolls) and invokes the `LocatorIntelligenceEngine`.
4. **Broadcast**: `window.dispatchExecutionEvent` sends the payload to Node.js `ActionDispatcher`, which wraps it in a `Command` object and emits it.
5. **Routing**: `CommandRouter` routes the Command to `ExecutionScheduler` targeting valid slaves.
6. **Scheduling**: `ExecutionScheduler` classifies the command (Discrete, Continuous, Aggregated) and pushes it into the corresponding queue bucket.
7. **Synchronization**: `ExecutionScheduler._drain` pops the command and asks `SynchronizationBarrier.wait()` to verify target capabilities (DOM readiness, network idle).
8. **Execution**: If the barrier passes, `ActionSimulator.execute` triggers Playwright automation on the slave. If physical execution fails (e.g., detached DOM), `ActionSimulator` retries resolution up to 3 times before throwing.
9. **Telemetry**: Events update `BrowserStateRegistry` and `SynchronizationTelemetry`.

## 6. State Models
### BrowserStateModel (`BrowserStateRegistry`)
- **State Owned**: Holds the monolithic runtime state of a browser instance.
- **Components**:
  - `lifecycleState` (Initializing, Ready, Busy, Error)
  - `navigationContext` (URL, epoch, navigationId)
  - `executionContext` (Frames, shadows)
  - `capabilities` (Map of capability satisfaction)
  - `consistencyState` (Consistency score)
- **Transitions**: Mutated exclusively by `BrowserStateRegistry.update()`.
- **Persistence**: Exists entirely in-memory during the application lifecycle.

## 7. Event Model
The system uses an asynchronous event-driven architecture, primarily brokered through standard Node.js `EventEmitter` and the centralized `CommandRouter`.
- **Producers**: 
  - *Browser/DOM*: The injected script on the master page produces `ExecutionEvents`.
  - *ActionDispatcher*: Produces `Command` objects.
  - *ActionSimulator*: Produces `ActionSuccess` or `ActionFailure`.
  - *SynchronizationCoordinator*: Produces `StateChanged`, `InvalidationRequested`.
- **Consumers**: `CommandRouter`, `AutomationController`, `ExecutionScheduler`, `RecoveryManager`.
- **Event Types**: Commands are categorized (`Execution`, `Navigation`, `Recovery`, `Workflow`) and typed (`CLICK`, `SCROLL`, `navigate`, `HEAL_REQUESTED`).

## 8. Architectural Layers
1. **Infrastructure Layer**: `playwright.mjs`, `crypto.mjs`, `errors.mjs`, detection/stealth plugins, logging configuration.
2. **Domain/Coordination Layer**: `AutomationController`, `CommandRouter`, `BrowserRegistry`, `BrowserLifecycleManager`, `TargetResolver`.
3. **Synchronization Layer**: The barrier system (`SynchronizationManager`, `Providers`, `Coordinators`) preventing action desynchronization.
4. **Execution Layer**: The queueing and execution logic (`ExecutionScheduler`, `ActionSimulator`, `ActionDispatcher`).
5. **Injected Execution Layer**: The JavaScript (`debug_injected.js`) living inside the Chromium isolate performing real-time interaction tracking and locator ranking.

## 9. Extension Points
- **Capability Providers**: New synchronization checks can be added by extending `CapabilityProvider` and registering it in `CapabilityRegistry`.
- **Workflows**: Complex logic (like the `CashoutWorkflow`) can be added to `WorkflowEngine` to execute macro-level commands.
- **Locator Generation Strategies**: The locator pipeline inside the injected script uses a strategy pattern (`DataAttributeStrategy`, `AriaStrategy`, etc.) which can be expanded for new DOM frameworks.
- **Command Routing**: Handlers can be seamlessly attached to `CommandRouter` via `register(category, type, handler)` without modifying core dispatcher logic.
- **Ranking Rules**: Locator validation relies on `RankingRule` instances (`SpecificityRule`, `ComplexityRule`, etc.) which are dynamically pluggable.

## 10. Runtime Lifecycle
1. **Initialization**: Config loading, stealth and proxy validation. DI Bootstrap of Capability Providers.
2. **Dependency Construction**: `AutomationController` initializes managers, engines, and registries.
3. **Spawning**: Browsers are spawned using `playwright-extra` with specific mobile dimensions and stealth features.
4. **Runtime Execution**: The system enters an event loop waiting for `Command` dispatches from the master browser. Slaves drain their `ExecutionScheduler` queues.
5. **Recovery Phase**: Triggered automatically if health monitors detect slave drift or barrier timeouts.
6. **Disposal**: `process.on('SIGINT')` or equivalent exits. `ActionDispatcher` flushes pending action sequences to disk synchronously.

## 11. Glossary of Major Components
- **AutomationController**: The central bootstrapper and orchestrator.
- **ExecutionScheduler**: Prioritizes and paces commands (coalescing scrolls, dropping stale hovers) for slaves.
- **ActionSimulator**: Uses Playwright to physically interact with elements on slaves.
- **SynchronizationBarrier**: Ensures target browsers match the environmental conditions of the master browser at the time a command was recorded.
- **LocatorResolver**: Translates the rich metadata recorded by the master into a physical Playwright locator on the slave.
- **CommandRouter**: Centralized event bus for decoupling subsystem communication.
