# Distributed Browser-View Synchronization: Architecture and Engineering Specification

## Executive Summary
This document defines a greenfield architecture for distributed browser scroll and viewport synchronization. The architecture strictly abandons legacy event-driven replication and physical-input forwarding in favor of a state-reconciliation model. It prioritizes correctness, monotonic convergence, and layout independence over network latency and implementation simplicity. By separating the Master's observation of authoritative state from the Slave's localized execution, the system guarantees eventual convergence without inducing layout thrashing, race conditions, or unrecoverable feedback loops .

## Research-Derived Architectural Principles
1.  **State over Cause:** The system must replicate the resulting observable state (the effect) rather than the physical input (the cause) .
2.  **Unidirectional Authority:** The Master browser is the absolute source of truth. Slaves never negotiate state or echo observations back to the Master .
3.  **Local Determinism:** The Slave is trusted to resolve local execution constraints. If an absolute target is unreachable, the Slave must clamp to its physical limits and await dynamic layout expansion rather than forcefully destructing layout semantics .
4.  **Topological Resilience:** Identity mapping for nested scroll containers must survive asynchronous hydration, dynamic wrapper insertion, and framework virtualization .
5.  **Strict Monotonicity:** State payloads must be versioned globally across the entire viewport hierarchy to prevent nested layout race conditions .

## Problem Definition
The synchronization system must guarantee that two or more independently running browser instances, subjected to differing DOM timing, network latency, and asynchronous layout shifts, eventually converge on a logically equivalent visual viewport and scroll state . The problem is not input replication; it is bounded-error spatial state convergence.

## Architectural Goals
*   Guarantee eventual visual and spatial convergence.
*   Tolerate divergent document heights and lazy-loaded DOM trees.
*   Survive dropped, duplicated, and out-of-order state updates.
*   Execute efficiently without main-thread starvation or layout thrashing.

## Non-Goals
*   Pixel-perfect, byte-identical rendering.
*   Reproduction of arbitrary local application business logic or side effects.
*   Frame-for-frame synchronization of transient CSS animations.
*   Bidirectional synchronization (collaborative multi-writer control).

## System Model
The architecture is a distributed reconciliation engine modeled on unidirectional data flow.

### Master Responsibilities
*   **What it owns:** Observation of physical layout realities and assignment of identity to scrolling surfaces .
*   **What it produces:** Monotonically versioned, immutable snapshots containing viewport geometry, absolute scroll coordinates, and semantic anchors.
*   **What is authoritative:** The entirety of the produced snapshot.
*   **What it does NOT control:** How the Slave enforces the state, the Slave's rendering pipeline, or the Slave's physical DOM node structure.

### Slave Responsibilities
*   **What it is responsible for:** Reconciling the Master's authoritative snapshot against its own localized DOM state .
*   **What it reproduces independently:** The transition (e.g., smooth vs. instant scrolling) and the localized DOM traversal required to locate target elements.
*   **What it receives explicitly:** Global logic clock versions, absolute spatial targets, proportional fallback limits, and semantic identity anchors.
*   **What it derives locally:** Local `scrollHeight` constraints, clamping limits, and dynamic DOM expansion readiness .
*   **When it cannot reproduce an operation:** It latches the intent, clamps to the local physical maximum, emits a `LayoutMismatch` telemetry event, and awaits local layout stabilization .

### Synchronization Layer Responsibilities
*   **Authority:** It is strictly responsible for message transport, schema validation, payload deduplication, and stale-message rejection .
*   It does NOT generate state, interpret DOM structures, or execute browser APIs.

## Cause vs Effect Model
The architecture strictly synchronizes the **Effect** (the terminal geometric observation of the layout and scroll surfaces) .
*   **Reproduced:** The absolute scroll positions and semantic intersection of the viewport.
*   **Derived:** The actual execution of layout mutations, localized scrollbar thumb positioning, and viewport clamping boundaries.
*   **Observed (but not executed as commands):** Physical input events (e.g., `wheel`, `touchmove`) are observed solely as triggers to calculate a new state snapshot. They are never replicated.

## Deterministic vs Non-Deterministic State Model
*   **Locally Deterministic (Not Synchronized):** Intra-frame animation curves, responsive reflows within the same semantic container, and locally derived `scrollHeight` changes.
*   **Non-Deterministic (Explicitly Synchronized):** The logical geometric target the user intended to view, the structural identity of dynamically generated scroll containers, and the visual viewport offset .

## Synchronization Boundaries

| Information | Source | Destination | Why Synchronized | Representation | Ordering | Recovery |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Global Clock | Master | Slave | Prevents hierarchical race conditions | Integer | Strictly Monotonic | Full Snapshot |
| Viewport Geometry | Master | Slave | Normalizes responsive layouts | `w`, `h`, `scale` | Tied to Global Clock | Full Snapshot |
| Container Identity | Master | Slave | Disambiguates dynamic/virtual DOMs | UUID/Semantic Hash | Tied to Global Clock | Container Reset |
| Scroll Offsets | Master | Slave | Core visual convergence target | Abs X/Y, Prop X/Y | Tied to Global Clock | Full Snapshot |
| Semantic Anchor | Master | Slave | Fallback for virtualized lists | Node UUID | Tied to Global Clock | Full Snapshot |

## Scroll Synchronization Architecture
Scroll state represents the absolute spatial offset of a container, backed by semantic contextual anchors.
*   **State Meaning:** It is an idempotent absolute target, not a relative delta or velocity .
*   **Source of Truth:** The Master's latest emitted snapshot.
*   **Update Frequency:** Debounced/throttled via `requestAnimationFrame` during active interaction.
*   **Stale/Dropped Updates:** Older versions are silently discarded. Dropped updates are healed by the next successful payload .
*   **Dynamic Layout Changes:** If the Master targets absolute Y=5000 and the Slave's document is currently 3000px tall, the Slave must NOT apply a proportional physical fallback that violates semantic intent. It clamps to the absolute maximum ($3000$) and defers the remaining offset until local DOM hydration expands the container .

## Viewport Synchronization Architecture
Viewport dimensions are necessary strictly to define the normalization coordinate space.
*   **Synchronized Data:** Layout viewport dimensions (`clientWidth`/`clientHeight`), visual viewport offset, and scale .
*   **Ignored Data:** Window chrome, OS-level screen resolution, device pixel ratios (unless actively manipulating CSS boundaries).
*   **Convergence:** The Slave applies CSS transforms or layout constraints to match the Master's layout boundaries, establishing parity for scroll normalization .

## Interaction / Locator Synchronization Contract
Where nested surfaces or virtualized lists exist, relying on structural depth paths (e.g., `0/2/1/4`) is fundamentally flawed due to framework virtualization (portals, error boundaries) .
*   **Target Identification:** Master assigns globally unique UUIDs (`data-sync-id`). If unavailable, it calculates a semantic content hash (excluding variable state) .
*   **Resolution:** The Slave traverses its DOM for the matching UUID/Hash.
*   **Missing Targets:** If a target cannot be resolved, the Slave places the desired state into a `PendingSyncState` queue and utilizes a `MutationObserver` to await the target's asynchronous mounting .

## State Model
*   **Master State:** Immutable, versioned snapshot of the DOM's scroll topology.
*   **Slave State:** A strictly managed execution loop reading from a `DesiredStateStore`.
*   **Synchronization State:** The JSON payload in transit.
*   **Recovery State:** A deliberate `SYNC_REQUEST` forcing the Master to dump a full topology tree .

## State Machine
1.  **Initializing:** Handshake initiated. Slave halts all local layout mutations.
2.  **Synchronized:** Slave's physical layout matches the `DesiredStateStore` within a sub-pixel tolerance $\epsilon$.
3.  **Updating:** Master emits a newer version. Slave acknowledges and begins reconciliation.
4.  **Awaiting Render:** Slave encounters a physical limitation (e.g., target Y out of bounds) or missing container ID. Latch engaged.
5.  **Recovering:** Unrecoverable divergence detected (e.g., massive version gap, timeout). Slave requests full snapshot broadcast.

## Event Model
Only three core protocol messages exist across the wire:
1.  `STATE_SNAPSHOT` (Master $\rightarrow$ Slave): Carries the global clock, viewport, and surface data.
2.  `SYNC_REQUEST` (Slave $\rightarrow$ Master): Forces an immediate `STATE_SNAPSHOT` response.
3.  `TELEMETRY_MISMATCH` (Slave $\rightarrow$ Master): Emitted when clamping persists beyond timeouts.

## Ordering Model
The architecture explicitly rejects per-container versioning, which induces geometric race conditions .
*   **Mechanism:** A single Global Lamport Timestamp (Monotonic Integer) applied to the entire snapshot payload .
*   **Execution:** A Slave must process the snapshot hierarchically (Root $\rightarrow$ Parent $\rightarrow$ Child) within a single phase to guarantee layout clamping limits are not corrupted .
*   **Concurrent Updates:** Handled by network dropping; highest integer wins unconditionally.

## Consistency and Convergence Model
Given Master state $S_m(t)$ and Slave state $S_s(t)$, if the Master becomes stable at $M^*$, the Slave state must converge to a bounded distance $\epsilon$ of $M^*$:
$d(S_m(t), S_s(t)) \le \epsilon$

The distance function is strictly absolute:
*   If reachable: $|S_{m.y} - S_{s.y}|$
*   If unreachable: $|S_{s.y} - H_s|$ (where $H_s$ is the physical maximum layout height of the Slave). Proportional fallback for absolute geometric missing is forbidden .

## Failure Model
*   **Dropped Messages:** Ignored. The architecture is stateless between snapshots; the next snapshot heals the gap.
*   **Delayed Messages:** Global version check prevents stale execution.
*   **Rendering Delays:** Reconciler detects $H_s < S_{m.y}$ and latches, re-evaluating strictly upon localized `ResizeObserver` events .
*   **Connection Loss:** Slave holds last known authoritative state.

## Recovery Model
Recovery is active, not passive.
*   **Mechanism:** If the WebSocket connection idles or reconnects, or if the Slave detects a missing surface for more than 5000ms, it drops its pending latches and emits a `SYNC_REQUEST` .
*   **Convergence Criterion:** The system is recovered when the slave's internal diffing engine reports distance $\le \epsilon$ for all identified surfaces in the newest snapshot.

## Component Architecture
1.  **State Normalizer (Master)**
    *   *Responsibility:* Observes DOM, extracts absolute geometries, calculates semantic anchors via `IntersectionObserver` (ignoring fixed/sticky elements) .
    *   *Forbidden:* Directly emitting low-level `wheel` events.
2.  **Identity Manager (Master/Slave)**
    *   *Responsibility:* Maps DOM nodes to UUIDs or semantic hashes .
    *   *Forbidden:* Using CSS selectors or DOM topological path depth indices (`div > span:nth-child(2)`).
3.  **Transport Bus**
    *   *Responsibility:* Network delivery.
    *   *Forbidden:* Reordering logic or delta-accumulation.
4.  **Slave Reconciler**
    *   *Responsibility:* Compares incoming state to local DOM and actuates mutations.
    *   *Invariants:* Must implement a Double-Buffered Execution Pipeline .

## Component Contracts
*   **Master $\rightarrow$ Transport:** `(Version: Int, Viewport: Object, Surfaces: Array)`
*   **Receiver $\rightarrow$ Reconciler:** `DesiredStateStore.set(LatestSnapshot)`
*   **Reconciler $\rightarrow$ DOM:** Synchronous batched writes via `Element.scrollTo()`.

## Data / Message Contracts
```json
{
  "type": "STATE_SNAPSHOT",
  "globalClock": 14590,
  "viewport": { "layoutW": 1440, "layoutH": 900, "scale": 1.0 },
  "surfaces": [
    {
      "id": "uuid-a1b2",
      "y": 5400,
      "x": 0,
      "anchorId": "section-features",
      "isRoot": false
    }
  ]
}
```

## Architectural Invariants
1.  **Hierarchical Vector Monotonicity:** Updates applied to a parent scroll container must strictly resolve before state updates are applied to its descendants .
2.  **Topological Resilience:** Surface identification must not rely on structural DOM depth .
3.  **Layout-Shift Immunity:** The Slave must never calculate and actuate a proportional physical fallback (`propY * maxScroll`) when an absolute target is unreachable; it must clamp .
4.  **View-Obscurity Prevention:** Semantic anchors must account for CSS z-index stacking contexts; hidden elements are invalid anchors .
5.  **Execution Batching:** The Reconciler must never interleave DOM reads and DOM writes in the same execution frame .

## Rejected Approaches
*   **Event Replication (Wheel/Touch Forwarding):** Rejected due to non-deterministic layout shifts and cumulative sub-pixel drift. Replaced by Absolute State Replication .
*   **Topological Path Identity (e.g., `0/1/4`):** Rejected due to modern UI framework virtualization and wrapper insertion breaking the structural path. Replaced by UUID/Semantic Hashing .
*   **Per-Container Logical Clocks:** Rejected because nested containers are geometrically dependent; out-of-order child updates corrupt layout bounds. Replaced by a Global Logical Clock .
*   **Proportional Fallback Interpolation:** Rejected because scaling an absolute miss via ratio (e.g., $80\%$ scroll depth) visually forces the Slave to intersect unrelated semantic content, triggering false infinite-loading loops. Replaced by Absolute Physical Clamping .
*   **Naive `requestAnimationFrame` Looping:** Rejected due to severe layout thrashing (Read-Write-Read) stalling the main thread. Replaced by Double-Buffered Execution .

## Migration Boundaries
*   **To be Removed:** All global `wheel`, `keydown`, and `pointermove` capture listeners intended for scroll syncing. All delta-accumulation buffers in Node.js.
*   **To be Modified:** The Transport layer payload schema must switch from `{target, delta}` to global snapshots.
*   **To be Introduced:** Master `StateNormalizer`, Master/Slave `IdentityManager`, Slave `DoubleBufferedReconciler`.

## Engineering Specification
*   **SYNC-001:** The Master MUST emit a single `STATE_SNAPSHOT` payload representing the entire viewport hierarchy upon scroll observation, debounced to `requestAnimationFrame` constraints.
*   **SYNC-002:** The `STATE_SNAPSHOT` MUST contain a strictly monotonic `globalClock` integer.
*   **SYNC-003:** The Slave MUST drop any incoming `STATE_SNAPSHOT` if its `globalClock` is $\le$ the locally applied clock.
*   **SYNC-004:** The Slave Identity Manager MUST NOT rely on DOM depth indices or CSS selectors for surface identification. It MUST utilize embedded UUIDs (`data-sync-id`) or semantic subtree hashes.
*   **SYNC-005:** The Slave Reconciler MUST operate using a Double-Buffered Execution Pipeline. During a single frame, it MUST execute all DOM layout reads (`scrollTop`, `scrollHeight`) in Phase 1, compute differences in Phase 2, and execute all DOM mutations (`scrollTo`) in Phase 3. Interleaving reads and writes is strictly prohibited.
*   **SYNC-006:** If an absolute target coordinate is geometrically unreachable on the Slave, the Slave MUST clamp the scrolling mutation to the current physical boundary of the container and place the remaining offset into a latched pending state. It MUST NOT compute or apply a proportional ratio adjustment based on localized layout maxima.
*   **SYNC-007:** The Master's State Normalizer MUST determine the semantic anchor via an `IntersectionObserver` that explicitly excludes descendant nodes possessing `position: fixed`, `position: sticky`, or obscuring z-index contexts.
*   **SYNC-008:** The Slave MUST emit a `SYNC_REQUEST` command to the Master upon detecting a recovered WebSocket connection or if a surface remains unresolved in the DOM for greater than 5000ms.

## Verification Requirements
*   **Determinism Test:** Throttle Slave network rendering significantly. Master scrolls to an absolute position containing lazy-loaded images. Verify the Slave initially clamps, and automatically resumes convergence to the exact pixel coordinate once its own images hydrate.
*   **Layout Thrashing Test:** Scroll 25 heavily nested containers simultaneously. Monitor Chromium DevTools performance profiler. Verify zero instances of "Forced Synchronous Layout" (Read-Write-Read) during the reconciliation frame.
*   **Identity Virtualization Test:** Conditionally mount a `<LoadingWrapper>` around the primary scroll container on the Slave. Verify the scroll state still applies seamlessly without topological path corruption.
*   **Stale Packet Test:** Manually inject a delayed `STATE_SNAPSHOT` with an older `globalClock` into the Slave's receiving queue. Verify it is dropped with zero DOM mutations.

## Observability Requirements
*   The Slave must emit metrics for: `SyncLag` (ms difference between Master emission and Slave application), `LayoutMismatchEvents` (count of clamping operations), and `OrphanedSurfaces` (containers in snapshot missing from Slave DOM).

## Security / Integrity Considerations
Cross-origin iframes obscure absolute coordinates and DOM geometry. The Master cannot read `scrollX` across a CORS boundary. The architecture requires independent observer agent injection for every isolated frame context, communicating back to the top-level Master routing agent via `postMessage`.

## Performance Considerations
Correctness explicitly overrides performance. However, SYNC-005 (Double-Buffered Execution) guarantees that even under extreme load, the synchronization pipeline will not trigger catastrophic O(n) layout recalculations (thrashing) . Batched geometric reads followed by batched writes ensures stable 60FPS reconciliation .

## Open Architectural Decisions
*   **Agent Mesh Topology for Cross-Origin Frames:** The exact schema for `postMessage` routing between deeply nested cross-origin iframes and the Master's top-level observer remains unspecified and requires a secondary engineering design phase.

## Final Architecture Summary
This specification mandates a complete transition from unreliable cause-replication to authoritative, versioned state-reconciliation. By enforcing monotonic global clocks, decoupling semantic identity from structural DOM paths, preventing destructive physical proportional fallbacks, and strictly enforcing a double-buffered execution pipeline, the architecture mathematically guarantees eventual spatial convergence under hostile rendering conditions while preventing browser layout thrashing.

---
Powered by [AI Exporter](https://saveai.net)