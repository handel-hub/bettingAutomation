# Principal Engineering Audit — Subsystem Review: Telemetry

**Document Status:** DRAFT / UNDER REVIEW  
**Classification:** INTERNAL STRICTLY CONFIDENTIAL  
**Subject:** Architectural Review of Telemetry & Metrics  
**Scope:** Observability, Serialization, Ring Buffers, and Network Saturation  

---

## 1. Current Architecture

The Telemetry subsystem acts as the primary observability layer for Locator Intelligence. It consists of a `TelemetryCollector` that intercepts execution events and a `MetricsRegistry` that maintains aggregate statistics (e.g., success rates, recovery loop counts). 

Currently, telemetry operates as a **Synchronous Push Model**. When the Ranker completes, or a recovery loop triggers, the system allocates a JSON payload containing the event type, timestamps, the EID, and the resulting score. This payload is passed to the IPC layer (WebSocket) and streamed to the Node.js controller immediately. 

## 2. Responsibilities

- **Systemic Health Monitoring:** Provide the aggregates required by the `HealthMonitor` to detect cascading infrastructure failures.
- **Offline Analytics:** Stream high-fidelity ground truth data to offline data lakes to train the future Learning-to-Rank (LTR) models and calibrate confidence thresholds.
- **Performance Profiling:** Track execution latencies across the pipeline (Retrieval, Ranking, Verification).

## 3. Inputs and Outputs

- **Inputs:** Synchronous hook calls from pipeline stages (e.g., `collector.emit('RESOLUTION_COMPLETED', { score, duration })`).
- **Outputs:** Serialized string payloads broadcast over the local network (WebSocket / CDP) to the master automation process.

## 4. Data Ownership

Telemetry owns the **Observability State**. It maintains sliding windows of recent events and aggregate counters. It does not own the DOM, the EID, or the execution policy.

## 5. State Ownership

The subsystem is highly **Stateful**. The `MetricsRegistry` maintains persistent counters, histograms, and rolling window caches in the V8 heap throughout the lifecycle of the browser session.

## 6. Pipeline Boundaries

Telemetry is inherently a **Cross-Cutting Concern**. It hooks into every other subsystem.
**Boundary Issue:** Because it is invoked directly on the critical path (the V8 main thread), its execution cost is indistinguishable from the cost of the automation itself. If telemetry is slow, Locator Intelligence is slow.

## 7. Hidden Assumptions

- **Assumption 1 (Cost-Free Serialization):** The architecture assumes `JSON.stringify` and object allocation are cheap enough to invoke dozens of times per second. In reality, allocating telemetry strings dominates young-generation GC pauses.
- **Assumption 2 (Infinite Bandwidth):** It assumes the WebSocket layer can handle an infinite stream of event data. It ignores the TCP/WebSocket backpressure that occurs when the Node.js process is too busy to drain the socket buffer, which eventually stalls the browser.
- **Assumption 3 (Exhaustive Capture is Necessary):** It assumes every single interaction (including 500 consecutive `mousemove` events) must be logged with full EID context to accurately model the system.

## 8. Coupling Analysis

- **Tightly Coupled** to the schema of the EID and the Ranker. If a new heuristic is added, the Telemetry serializers must be manually updated to capture it.
- **Tightly Coupled** to the Network Transport layer. The collector pushes directly to the transport interface without a buffering abstraction.

## 9. Data Model

The data is modeled as verbose JSON documents. Aggregate metrics are modeled as simple Javascript Objects (Hash Maps) mapping strings to integers.

## 10. Correctness Guarantees

- **Guaranteed:** If an event successfully reaches Node.js, it accurately reflects the state passed to the Collector.
- **Not Guaranteed:** Complete causality. If the browser crashes (OOM or Page Crash) mid-resolution, the telemetry payloads sitting in the WebSocket buffer are destroyed. The system dies silently without emitting its final fatal telemetry.

## 11. Failure Modes

- **The Observer Effect (OOM Crash):** On complex, long-running pages, the `RollingWindow` array in the `MetricsRegistry` continues to capture massive EID objects without a strict memory cap. This causes a memory leak. As memory pressure rises, GC thrashes, the browser slows down, and eventually throws an Out of Memory (OOM) exception. Telemetry effectively kills the host it was monitoring.
- **Network Saturation Blockade:** If the Node.js Master process is CPU-bound and stops reading from the WebSocket, the Slave's WebSocket buffer fills up. When the Slave attempts to write the next telemetry payload, the write blocks synchronously, halting the entire Locator Intelligence pipeline over a completely unrelated networking issue.

## 12. Edge Cases

- **Sensitive Data Leakage:** PII (Personally Identifiable Information) can easily leak into telemetry. If a user clicks a `<input>` containing a Social Security Number, the raw DOM attributes might be captured in the EID and logged as a telemetry string.
- **Time Drift:** Comparing $t_{start}$ on the Master with $t_{end}$ on the Slave assumes clock synchronization. Browser processes frequently experience clock drift, invalidating cross-machine latency metrics.

## 13. Complexity Analysis

- **Time Complexity:** $\mathcal{O}(V)$ where $V$ is the volume of string data serialized.
- **Memory Complexity:** $\mathcal{O}(W)$ where $W$ is the size of the rolling window caches.

## 14. Scalability Analysis

The current synchronous, exhaustive JSON telemetry model does not scale to ultra-high-frequency (UHF) automation (e.g., $60\text{Hz}$ mouse dragging). It will instantly saturate the IPC bridge.

## 15. Observability

Meta-observability is zero. The system does not track how much memory the `MetricsRegistry` is consuming or how much latency the `JSON.stringify` calls are adding to the pipeline.

## 16. Explainability

Telemetry provides raw data, but it is not inherently explainable. It requires offline data scientists to piece together asynchronous events to form a cohesive narrative. (Note: True explainability should be handled by the specialized *Explainability* subsystem, not general telemetry).

## 17. Comparison with Analogous Systems

**High-Frequency Trading (HFT) Logging:**
HFT systems never execute `printf` or stringify data on the critical trading thread. They write binary structs to a pre-allocated Ring Buffer. A secondary thread reads the buffer and writes to disk asynchronously. 

**Browser Engine Profilers (Chrome Tracing):**
Chrome's internal tracing (Perfetto) does not emit JSON over IPC synchronously. It writes to shared memory buffers in C++ and flushes them asynchronously. 

**Distributed Tracing (OpenTelemetry):**
OpenTelemetry heavily utilizes **Sampling**. It knows that logging $100\%$ of transactions is catastrophic. It samples $1\%$ of successful traces, but forces a $100\%$ capture rate for traces containing an Error.

## 18. Ideal Production-Grade Architecture

An ideal Telemetry subsystem is a **Zero-Allocation, Sampled, Asynchronous Ring Buffer**.

1. **The SharedMemory Ring Buffer:** Telemetry is written as binary structs (e.g., FlatBuffers or simple TypedArrays) into a pre-allocated Ring Buffer. This ensures absolute zero GC pressure and guarantees $\mathcal{O}(1)$ time complexity for logging.
2. **Asynchronous Drain (Web Workers):** A dedicated background Web Worker polls the Ring Buffer, serializes the data into compact binary payloads, and manages the WebSocket IPC transmission, entirely offloading networking and serialization from the main V8 thread.
3. **Adaptive Sampling Policy:** The collector defaults to logging $1\%$ of successful, high-confidence interactions. However, if the Ranker score falls below a threshold, or a recovery loop triggers, the sampler dynamically shifts to $100\%$ capture rate to ensure all failure data is preserved.
4. **Data Masking (PII):** A strict, hardcoded hashing mask ensures that any strings flagged as potentially sensitive (e.g., `input[type="password"]` values) are SHA-256 hashed *before* entering the Ring Buffer.

## 19. Gap Analysis (Current → Ideal)

| Capability | Current State | Ideal State | Gap | Risk if Omitted |
| :--- | :--- | :--- | :--- | :--- |
| **Serialization Model** | Synchronous JSON | Asynchronous Binary (Web Worker) | Massive | Network bottlenecking & Latency |
| **Memory Allocation** | Ephemeral Objects & Arrays | Fixed-size Ring Buffer | High | GC Micro-stutters and OOM crashes |
| **Capture Policy** | $100\%$ Exhaustive | Adaptive Sampling | High | CPU saturation on heavy workloads |
| **Privacy / PII** | No formal scrubbing | Upstream cryptographic hashing | Critical| PII violation in offline data lakes |

## 20. Engineering Roadmap

1. **Phase 1: Memory Capping & Scrubbing (Immediate)**
   - Hardcode strict maximum lengths for the `RollingWindow` arrays (e.g., max 100 events). Enforce `.shift()` on overflow to instantly plug the memory leak.
   - Implement a basic Regex scrubber to mask numerical sequences resembling credit cards/SSNs in EID `textContent`.
2. **Phase 2: Adaptive Sampling (Short-term)**
   - Introduce a `samplingRate` configuration. Suppress telemetry emission for mundane, highly confident `mousemove` or `scroll` commands, logging only 1 in 100. Always log `click` and `keypress`. Always log errors.
3. **Phase 3: Asynchronous Dispatch (Medium-term)**
   - Decouple the Collector from the WebSocket. Have the Collector push plain objects into an array. Use `requestIdleCallback` to drain the array, serialize to JSON, and transmit. This immediately removes JSON serialization from the critical path.
4. **Phase 4: Zero-Allocation Binary Buffers (Long-term)**
   - Rewrite the telemetry interface to accept strictly typed numbers (e.g., `emitScore(commandId: Int32, score: Float32)`). Write these directly into a `SharedArrayBuffer`. 
   - Spin up a Web Worker that reads the `SharedArrayBuffer` and streams raw binary data over the WebSocket to Node.js, achieving HFT-grade observability with strictly zero main-thread overhead.
