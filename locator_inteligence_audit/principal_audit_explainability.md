# Principal Engineering Audit — Subsystem Review: Explainability

**Document Status:** DRAFT / UNDER REVIEW  
**Classification:** INTERNAL STRICTLY CONFIDENTIAL  
**Subject:** Architectural Review of Explainability  
**Scope:** Decision Tracing, Telemetry, Causal Inference, and Serialization  

---

## 1. Current Architecture

Explainability is currently conflated with the **Telemetry** subsystem in the V3 architecture. 

When the Locator Intelligence engine reaches a conclusion (e.g., `ACCEPT` or `REJECT`), it constructs an event payload containing the final decision, the Master EID, and a scalar summary of the `RankingResult` (e.g., `totalScore: 0.85, semantic: 0.9, visual: 0.8`). This payload is serialized and emitted via the telemetry bus.

There is no dedicated Explainability engine that explicitly builds a causal graph of *why* the mathematical operations resulted in those final scalars.

## 2. Responsibilities

If treated as a distinct subsystem, the responsibilities of Explainability would be:
- **Causal Tracing:** Document the critical path of logic that led to a decision (e.g., "Candidate A won over Candidate B because B failed a hard visibility constraint").
- **Cost-Free Transparency:** Provide maximum human readability of the heuristic engine's decisions without impacting the runtime latency or memory footprint of the automation execution.
- **Root Cause Isolation:** Provide sufficient offline context to determine if a failure was due to DOM absence, layout occlusion, or a flaw in the ranking polynomial.

## 3. Inputs and Outputs

- **Inputs (Current):** Raw telemetry scalars.
- **Inputs (Ideal):** Intercepted hooks from Retrieval, Evidence Collection, Ranking, and Verification.
- **Outputs (Ideal):** An `EXPLAIN` query plan (similar to a SQL `EXPLAIN ANALYZE` output), representing a localized Abstract Syntax Tree (AST) of the decision logic.

## 4. Data Ownership

Explainability does not own operational data. It owns the **Decision Trace**. It takes ownership of interpreting raw mathematical weights into human-readable causal relationships.

## 5. State Ownership

The subsystem is **stateless**. The decision trace for command $N$ is constructed independently of command $N-1$. It generates a transient record meant strictly for offline serialization.

## 6. Pipeline Boundaries

Explainability is an **Orthogonal (Cross-cutting) Concern**. It must transparently observe Retrieval, Collection, Ranking, and Verification. 
**Boundary Issue:** Because it lacks formal boundaries, the current codebase heavily peppers the hot path with `console.log()` or `telemetry.emit()` calls. Mixing IO/serialization logic into the $\mathcal{O}(N)$ tight loop of Candidate Ranking destroys CPU L1/L2 cache coherency.

## 7. Hidden Assumptions

- **Assumption 1 (Scores == Explanation):** The system assumes that knowing the final heuristic scores (`semantic=0.5`) is enough to debug a failure. It is not. If semantic score is $0.5$, an engineer needs to know *what string was actually extracted* to cause that $50\%$ penalty.
- **Assumption 2 (Symmetrical Cost):** It assumes generating telemetry/explanations for successful clicks is as important as generating them for failures. Successful clicks rarely require deep explainability; failures require extreme detail. The current system emits the same uniform payload for both.

## 8. Coupling Analysis

- **Tightly Coupled** to the payload structure of the `TelemetryCollector`.
- **Severely Coupled** to the execution context. Serializing JSON objects mid-resolution blocks the JavaScript main thread, delaying the actual automation execution.

## 9. Data Model

Currently, explainability data is modeled as a flat JSON dictionary.
**Ideal Data Model:** A **Decision Tree Trace**. Modeled either as a highly compressed bitmask (for successful paths) or a minimal JSON AST describing branch evaluation (e.g., `Node { type: 'ConstraintCheck', property: 'Visibility', result: 'Fail' }`).

## 10. Correctness Guarantees

- **Guaranteed:** The emitted score summary will match the variables that triggered the Execution engine.
- **Not Guaranteed:** Completeness of the decision logic. Short-circuited logic (e.g., a candidate dropped early in Retrieval) leaves no trace in the final telemetry, making it invisible to debugging.

## 11. Failure Modes

- **The GC Death Spiral:** In an attempt to improve explainability, developers add deep object logging (e.g., serializing the EID and evidence vector of all 50 candidates). This triggers massive memory allocation. The garbage collector stalls the V8 thread for $50\text{ms}$, causing Playwright to miss an animation frame and fail the automation. Explainability actually *causes* the failure it intends to observe.
- **The "Black Box" Rejection:** The system emits a `REJECT (Score 0.42 < 0.45)`. The engineer checks the application and sees the button perfectly visible. Because the trace does not include the intermediate Evidence vectors (e.g., showing that the slave button actually rendered as a generic `<a>` tag instead of a `<button>`), the rejection remains a mathematical mystery.

## 12. Edge Cases

- **Ambiguity Ties:** When two elements score exactly $0.95$, the current telemetry just logs the winner. Explainability must explicitly state that a tie-break occurred and denote the exact logic used to resolve the twin.
- **Silent Cullings:** If Candidate Retrieval culls 5,000 nodes and only returns 1, the Explainability engine currently only knows about the 1. It cannot explain *why* the other 5,000 were ignored.

## 13. Complexity Analysis

- **Time Complexity:** Stringifying objects takes $\mathcal{O}(V)$ where $V$ is the volume of data. If executed during the synchronous resolution loop, this adds severe latency.
- **Memory Complexity:** High. Constructing deep JSON objects creates immense heap pressure.

## 14. Scalability Analysis

The current verbose JSON-based approach does not scale. At $60\text{Hz}$ interaction rates (e.g., dragging, drawing), emitting deep JSON traces for every frame will instantly crash the WebSocket connection and run the Node.js process out of memory. Explainability must be decoupled from standard telemetry and aggressively compressed.

## 15. Observability

Observability of the *explainability subsystem itself* is low. We do not track the latency overhead imposed by constructing the trace logs.

## 16. Explainability (Meta)

Explainability is currently low-level and mathematical. It lacks **Semantic Translation**. It says "Levenshtein distance = 12", rather than "Master text was 'Submit', Slave text was 'Submit Payment'".

## 17. Comparison with Analogous Systems

**Database Query Planners (`EXPLAIN ANALYZE`):**
PostgreSQL doesn't dump internal C++ struct memory to explain a query. It emits a formalized Query Plan AST detailing exactly which indices were used, how many rows were scanned, and the cost of the joins. 

**Compiler Diagnostics:**
LLVM or TypeScript don't just say "Type Error". They trace the type constraint failure up the AST and pinpoint the exact source line causing the divergence.

**Black Box Flight Recorders:**
Flight recorders stream compressed, fixed-width binary data during normal operation. They do not write verbose XML documents.

## 18. Ideal Production-Grade Architecture

An ideal Explainability subsystem is a **Zero-Allocation, Asymmetrical Trace Compiler**.

1. **Asymmetrical Verbosity:** During a successful `ACCEPT`, the system emits a 32-bit integer bitmask (e.g., `0b00101` means "Matched via Semantic Hash, passed Visibility, no ambiguity"). During a `REJECT` or `LF-603`, the system dynamically switches to "Verbose Mode" and captures a deep AST.
2. **The Decision AST:** Rather than logging raw variables, the engine constructs a lightweight Decision Graph. It explicitly tracks constraint failures (e.g., `Path: Retrieval -> TextCull -> PASS. Evidence -> Spatial -> FAIL(Occluded)`).
3. **Deferred Serialization:** Explainability ASTs are never serialized synchronously. They are pushed to an array buffer and serialized via `requestIdleCallback` or handed to a Web Worker, removing all JSON parsing overhead from the critical path.
4. **Offline Reconstruction:** The automation backend (Node.js) takes the compressed bitmask or AST and translates it into a human-readable English diagnostic report only when a developer requests to view the log in the dashboard.

## 19. Gap Analysis (Current → Ideal)

| Capability | Current State | Ideal State | Gap | Risk if Omitted |
| :--- | :--- | :--- | :--- | :--- |
| **Data Format** | Heavy JSON Object | 32-bit Integer Bitmask / AST | Massive | GC pressure and network saturation |
| **Serialization Timing** | Synchronous (blocks main thread) | Deferred (Idle callback / Worker) | High | Automation latency spikes |
| **Logic Tracing** | Mathematical scalars only | Causal boolean constraint traces | High | Un-debuggable false negatives |
| **Verbosity Policy** | Symmetrical (Always heavy) | Asymmetrical (Heavy only on fail) | Med | Wasted CPU cycles on 99% of successes |

## 20. Engineering Roadmap

1. **Phase 1: Asymmetrical Logging (Immediate)**
   - Disable all deep object serialization for successful `ACCEPT` resolutions. Emit only the final score and candidate ID. Retain deep logging *only* for `REJECT` and `LF-60X` error codes, instantly clawing back CPU overhead for the happy path.
2. **Phase 2: Deferred Telemetry (Short-term)**
   - Remove `JSON.stringify` from the resolution hot path. Push explainability objects into a global `Array` and schedule a `MessageChannel` macro-task or `requestIdleCallback` to serialize and transmit them to Node.js outside of the automation frame budget.
3. **Phase 3: The Decision AST (Medium-term)**
   - Standardize an `ExplainPlan` data structure. Instead of logging math, log decisions. (e.g., `culledBy: 'VisibilityCheck'`, `ambiguityTieBreaker: 'SpatialNearest'`). 
4. **Phase 4: Zero-Allocation Bitmasking (Long-term)**
   - For ultra-high-frequency events (hovers, scrolls), replace the AST entirely with a bitmask schema. The Slave emits an integer (e.g., `4021`); Node.js decodes this integer into a fully human-readable explanation of the pipeline traversal, completely neutralizing the observability vs. performance tradeoff.
