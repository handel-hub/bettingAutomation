# Principal Engineering Audit — Subsystem Review: Evidence Collection

**Document Status:** DRAFT / UNDER REVIEW  
**Classification:** INTERNAL STRICTLY CONFIDENTIAL  
**Subject:** Architectural Review of Evidence Collection  
**Scope:** Latency, Information Theory, Orthogonality, and Determinism  

---

## 1. Current Architecture

The Evidence Collection subsystem executes during the Candidate Evaluation phase within the Slave browser's JavaScript environment. For every candidate node returned by the Retrieval Layer, the subsystem synchronously interrogates the DOM to extract four vectors of evidence:
1. **Structural:** Tag name, attributes, depth.
2. **Semantic:** `textContent`, `aria-roles`.
3. **Visual/Spatial:** Bounding box dimensions, absolute coordinates, visibility state.
4. **Topological:** XPath distance from the root.

This collected evidence is then passed directly to the Candidate Ranking (Scoring) subsystem to be compared against the Master Element Identity Document (EID).

## 2. Responsibilities

- **Information Extraction:** Extract ground-truth reality from candidate DOM nodes.
- **Normalization:** Format raw DOM attributes into normalized structures comparable against the master EID.
- **Signal Generation:** Provide the mathematical signals required by the Reasoning Layer to compute probabilistic identity scores.

## 3. Inputs and Outputs

- **Inputs:** An array of physical `HTMLElement` candidates and the Master EID.
- **Outputs:** An array of `CandidateEvidence` data structures representing the localized physical and semantic state of each candidate.

## 4. Data Ownership

Evidence Collection does not own state. It is a **transducer**. It observes the transient state of the DOM engine, formats it, and passes it forward. It owns the logic determining *how* a feature is measured (e.g., calculating Levenshtein distance for text, or Euclidean distance for coordinates).

## 5. State Ownership

The subsystem is perfectly **stateless**. It retains no memory of previous evidence collected, nor does it cache evidence across evaluations of the same DOM node in subsequent commands.

## 6. Pipeline Boundaries

Evidence Collection bridges the gap between Retrieval (raw pointers) and Ranking (mathematical inference).
**Boundary Issue:** It executes eagerly. If Retrieval returns 50 candidates, Evidence Collection synchronously extracts 4 vectors of evidence for all 50 candidates before returning control to the pipeline.

## 7. Hidden Assumptions

- **Assumption 1 (Symmetrical Cost):** It assumes all evidence is equally cheap to collect. Fetching `.tagName` is $\mathcal{O}(1)$ string reference, while fetching `.getBoundingClientRect()` triggers a synchronous V8/Blink layout cascade ($\mathcal{O}(N)$). The subsystem treats them identically.
- **Assumption 2 (Orthogonality):** It assumes evidence vectors are mathematically independent. In reality, DOM depth (Structural) and element dimensions (Visual) are highly correlated (entropy overlap).
- **Assumption 3 (Positive Corroboration):** It assumes the goal of evidence collection is to find *matching* features (positive evidence). It ignores the profound information gain of *negative* evidence (explicit mismatches).

## 8. Coupling Analysis

- **Tightly Coupled** to the DOM API and the CSS Layout Engine. 
- **Tightly Coupled** to Candidate Ranking. The Evidence Collection output schema is completely dictated by the hardcoded inputs expected by the `ScoringWeightsAndRules` engine.

## 9. Data Model

The data model is a flat structure mapping heuristic identifiers to scalar or string values (e.g., `{ text: 'Submit', width: 120, height: 40 }`). It lacks metadata about the *reliability* or *variance* of the collected evidence.

## 10. Correctness Guarantees

- **Guaranteed:** The collected spatial evidence represents the physical screen state at the exact millisecond of capture.
- **Not Guaranteed:** Textual evidence accuracy. CSS `text-transform` or pseudo-elements (`::before { content: 'X' }`) are rarely captured correctly by standard DOM `textContent` APIs, creating systemic false negatives.

## 11. Failure Modes

- **Layout Thrashing (Synchronous Stall):** If candidate count is high ($K > 50$), invoking spatial evidence collection forces the browser to recompute layout 50 times in a single frame. This causes severe micro-stutters, CPU spiking, and can trigger Playwright connection timeouts.
- **Reflow Feedback Loops:** If a site utilizes resize observers or scroll listeners that mutate the DOM during layout queries, Evidence Collection can trap the browser in a catastrophic continuous reflow loop.

## 12. Edge Cases

- **Virtual / Culling Containers:** Evidence collected on elements that are conditionally visible but physically present often yields $(x=0, y=0, w=0, h=0)$.
- **Iframes / Cross-Origin Boundaries:** Bounding boxes relative to the document fail entirely if the element sits inside a cross-origin iframe due to security constraints.
- **Obscured Elements:** An element may have identical visual dimensions to the EID but be completely obscured by a higher z-index modal, which simple spatial evidence collection fails to detect without expensive `elementFromPoint` rays.

## 13. Complexity Analysis

- **Time Complexity:** Eager collection evaluates all evidence on all candidates: $\mathcal{O}(K \cdot E)$, where $K$ is candidate count and $E$ is evidence dimension count. However, visual evidence hides a massive constant factor: $\mathcal{O}(K \cdot (E_{cheap} + \text{Layout Cost}))$.
- **Memory Complexity:** Allocates a new dictionary for every candidate evaluated. At high frequency, this causes significant young-generation garbage collection churn.

## 14. Scalability Analysis

The current architecture is anti-scalable. The computational cost scales linearly with the number of candidates returned by retrieval. As UI complexity increases, fallback retrievals yield larger candidate pools, causing Evidence Collection to exponentially degrade pipeline throughput.

## 15. Observability

Observability is **poor**. There is no granular telemetry tracking the latency cost per evidence vector. We do not know if spatial evidence collection took $0.1\text{ms}$ or $12\text{ms}$.

## 16. Explainability

The evidence output is fully transparent (we log exactly what was collected), but the *rationale* for collecting it is absent. The system cannot explain why it forced a layout calculation when text-matching alone might have reduced entropy to zero.

## 17. Comparison with Analogous Systems

**Compiler Optimization (Short-Circuit Evaluation):**
Compilers evaluate boolean expressions via short-circuiting (`A && B`). If `A` is false, `B` is never evaluated because it cannot change the outcome. Our Evidence Collection evaluates `B` (expensive layout) even if `A` (semantic mismatch) already guarantees the candidate will fail.

**Database Query Execution (Cost-Based Optimizers):**
A cost-based optimizer estimates the cost of a predicate. It applies cheap, highly selective predicates first to cull rows before applying expensive UDFs (User Defined Functions). Our subsystem currently applies the "expensive UDF" (layout) to every row (candidate).

**Information Theory (Entropy Reduction):**
Evidence collection is fundamentally the process of reducing uncertainty ($H$). High-entropy evidence (e.g., exact text match) provides massive information gain cheaply. Low-entropy evidence (e.g., tag is `div`) provides almost no information but costs the same to collect in the current model.

## 18. Ideal Production-Grade Architecture

An ideal Evidence Collection subsystem utilizes **Lazy, Information-Theoretic Evaluation**.

1. **Lazy Evaluation Pipeline:** Evidence is *never* collected eagerly. Candidates are wrapped in Lazy Evaluators.
2. **Cost-Based Evidence Scheduling:** Evidence vectors are strictly ordered by a static cost/selectivity matrix. 
   - *Phase 1 (Micro-cost):* Collect structural and semantic evidence (String equality, XPath).
   - *Phase 2 (Culling):* The Reasoner eliminates candidates mathematically incapable of passing confidence thresholds based on Phase 1 alone.
   - *Phase 3 (Macro-cost):* Collect expensive spatial/visual evidence *only* for the surviving ambiguous candidates ($K \le 3$).
3. **Negative Evidence Capture:** Deliberately seek out explicit violations (e.g., "Master EID has `disabled=true`, Candidate has `disabled=false`"). A single negative violation provides more information gain than 10 positive corroborations.
4. **Covariance Modeling:** Group correlated evidence vectors. Instead of collecting width, height, x, and y independently, collect a unified "Spatial State" vector to prevent double-counting dependent variables.

## 19. Gap Analysis (Current → Ideal)

| Capability | Current State | Ideal State | Gap | Risk if Omitted |
| :--- | :--- | :--- | :--- | :--- |
| **Execution Model** | Eager ($\forall K$, collect all $E$) | Lazy (Collect $E_i$, cull, collect $E_{i+1}$) | Massive | Severe latency on large DOMs |
| **Cost Awareness** | None (All evidence treated equal) | Cost-based Short-Circuiting | High | Layout thrashing |
| **Evidence Type** | Positive corroboration only | Positive + Explicit Negative Penalities | Med | High false positive rate |
| **Memory Allocation** | Fresh object per candidate | Zero-allocation struct pooling | Low | Minor GC stutter |

## 20. Engineering Roadmap

1. **Phase 1: Latency Instrumentation (Immediate)**
   - Wrap `getBoundingClientRect` and other spatial calls in high-resolution timers `performance.now()`. Export telemetry to identify exact layout thrashing boundaries.
2. **Phase 2: Negative Evidence Integration (Short-term)**
   - Introduce explicitly fatal evidence vectors. If a candidate explicitly violates a rigid semantic constraint, halt further evidence collection for that candidate and mark it `REJECTED`.
3. **Phase 3: Multi-Stage Lazy Evaluation (Medium-term)**
   - Refactor the Candidate Ranking loop. Instead of `Score(CollectAll(Candidates))`, implement `Ranker.feed(Candidates)`. The Ranker requests cheap evidence first, culls the pool, and only requests spatial evidence for the remaining slice.
4. **Phase 4: Shared Intersection Cache (Long-term)**
   - Deprecate synchronous spatial evidence collection entirely. Read spatial evidence exclusively from the Phase 2 Retrieval Layer's continuous asynchronous `IntersectionObserver` Scene Graph, driving the cost of visual evidence collection from $\mathcal{O}(N_{\text{layout}})$ to $\mathcal{O}(1)$.
