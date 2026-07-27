# Principal Engineering Audit — Subsystem Review: Candidate Retrieval

**Document Status:** DRAFT / UNDER REVIEW  
**Classification:** INTERNAL STRICTLY CONFIDENTIAL  
**Subject:** Architectural Review of Candidate Retrieval  
**Scope:** Latency, Indexing, Algorithm Complexity, and Information Retrieval  

---

## 1. Current Architecture

The Candidate Retrieval subsystem operates exclusively within the Slave browser's JavaScript context. Triggered upon receipt of a command, it synchronously queries the live Document Object Model (DOM) to fetch a pool of potential matches (candidates) based on the Element Identity Document (EID). 
It employs a **Progressive Narrowing / Fallback** cascade:
1. Attempt exact structural match via `cssSelector` or `xpath`.
2. Fall back to semantic identifiers (e.g., `[data-testid]`, `role`).
3. Fall back to broad tag-based retrieval (e.g., `getElementsByTagName('button')`).

## 2. Responsibilities

- **Recall Maximization:** Ensure the true target node is included within the returned subset. 
- **DOM Culling:** Reduce the ambient search space (which may contain $>10,000$ nodes) down to a computationally viable candidate pool ($K < 50$) for the heavy, downstream Reasoning Layer to evaluate.
- **Node Dereferencing:** Map serialized EID heuristics into live, physical DOM node references.

## 3. Inputs and Outputs

- **Input:** A serialized `ElementIdentityDocument` (EID) and the stochastic state of the Slave DOM.
- **Output:** An array of live DOM `HTMLElement` references.

## 4. Data Ownership

Candidate Retrieval is fundamentally a **consumer** of the DOM and a **producer** of candidate arrays. It does not own the state it queries. It owns the retrieval strategy execution lifecycle. 

## 5. State Ownership

The subsystem is **stateless**. Every retrieval is a cold-start operation. It retains no memory of previous queries, nor does it index the DOM structure across frames.

## 6. Pipeline Boundaries

Candidate Retrieval sits directly between the Network Ingress (receiving the command) and the Reasoning Engine (scoring candidates). 
**Boundary Issue:** It acts as a synchronous bottleneck. The pipeline completely halts until the browser's CSS query engine traverses the DOM and returns a node list. 

## 7. Hidden Assumptions

- **Assumption 1 (Structural Invariance):** The primary retrieval strategy assumes that the DOM topology (CSS Path / XPath) is highly stable between Master and Slave. 
- **Assumption 2 (DOM Traversal is Optimal):** It assumes relying on the browser's native `querySelectorAll` engine is the most performant way to find elements. While fast for simple selectors, fallback queries like broad tag scans generate massive arrays that cause V8 memory pressure.
- **Assumption 3 (Cold Starts are Acceptable):** It assumes maintaining a persistent index is too expensive, thus opting to pay the traversal cost on every single command.

## 8. Coupling Analysis

- **Tightly Coupled** to the DOM tree hierarchy. If the tree structure changes (e.g., a React component wraps a button in an invisible `div`), the primary retrieval fails.
- **Loosely Coupled** to semantic meaning. It uses semantic fallbacks only when structure breaks. 

## 9. Data Model

The subsystem uses an implicit data model: the DOM Tree itself. It relies entirely on the browser's internal C++ implementation of the node tree for traversal.

## 10. Correctness Guarantees

- **Not Guaranteed:** There is absolutely no guarantee of $100\%$ recall. If a UI shifts completely from standard HTML to an ARIA-heavy `div` structure, structural fallbacks yield zero candidates, silently dropping the target.
- **Guaranteed:** Any node returned physically exists in the DOM at the exact millisecond of retrieval.

## 11. Failure Modes

- **Candidate Explosion (Memory Spikes):** If structural constraints fail and the subsystem falls back to querying `div` or `span`, it may return $5,000+$ elements. Serializing this to an array triggers immense GC pressure and forces the downstream scoring engine to evaluate $5,000$ nodes, violating the $15\text{ms}$ latency budget.
- **Shadow DOM Traversal Blocking:** Standard `querySelectorAll` stops at closed shadow boundaries. Unless explicitly piercing composed trees, targets hidden inside Web Components will silently evade retrieval.

## 12. Edge Cases

- **Virtualized Grids:** Nodes are culled from the DOM when scrolled out of view. Retrieval will return 0 candidates, requiring the system to scroll and retry, which breaks deterministic execution constraints.
- **Detached Nodes:** Elements currently animating out or waiting for garbage collection may be retrieved, leading to interaction on a "dead" element.

## 13. Complexity Analysis

- **Time Complexity:** $\mathcal{O}(N)$ where $N$ is the size of the DOM, because CSS selectors inherently traverse tree structures. In the worst-case (Candidate Explosion), the downstream complexity becomes $\mathcal{O}(M)$ where $M$ is the number of candidates passed to the heavy Reasoner.
- **Memory Complexity:** $\mathcal{O}(M)$ to allocate the array of matched node references. If $M \approx N$, the memory spike causes GC micro-stutters.

## 14. Scalability Analysis

The current retrieval architecture scales poorly with DOM complexity. As SPAs become heavier (e.g., large data tables, infinite scrolls), $\mathcal{O}(N)$ retrieval on every mouse movement or interaction creates an inescapable CPU ceiling. It cannot support high-frequency interaction replays (e.g., $60\text{Hz}$ mouse trails) without causing severe browser jank.

## 15. Observability

Retrieval observability is low. We know how many candidates are returned, but we do not track the **precision** (how many candidates were useless) or the **latency distribution** of specific CSS query executions.

## 16. Explainability

Retrieval decisions are entirely black-boxed inside the browser's C++ CSS engine. We cannot explain *why* the browser matched a specific element other than assuming the selector was valid.

## 17. Comparison with Analogous Systems

**Search Engines (Lucene / Elasticsearch):**
Search engines solve candidate retrieval via **Inverted Indices**. Instead of traversing documents to find a word (DOM traversal), they look up the word to find the documents ($\mathcal{O}(1)$ lookup).

**Database Query Planners:**
A DB query planner analyzes indices (e.g., B-Trees) and executes the most *selective* index first. If we are searching for a button with text "Submit", a DB wouldn't scan all buttons; it would look up "Submit" in the text index. Our current system blindly executes structural scans before considering semantic selectivity.

**Game Engines (Spatial Partitioning):**
Game engines use QuadTrees or BSP trees to rapidly retrieve objects within a viewport. We currently retrieve objects topologically, ignoring spatial grouping entirely.

## 18. Ideal Production-Grade Architecture

An ideal Retrieval Layer Abandons cold-start synchronous DOM traversal entirely.

1. **Continuous Scene Graph (Inverted Index):** A background thread (or idle callback) maintains an inverted index mapping high-entropy semantic properties (e.g., `textContent`, `aria-label`) to DOM node references.
2. **Database-style Query Planning:** When an EID arrives, a lightweight Query Planner determines the most selective heuristic. If the EID contains `textContent="Checkout"`, it queries the inverted index in $\mathcal{O}(1)$ rather than traversing the DOM.
3. **Continuous Spatial Indexing (R-Tree):** Maintain a low-resolution R-Tree of element bounding boxes via `IntersectionObserver`. When relational anchors are required, retrieve candidates spatially ($\mathcal{O}(\log N)$) rather than walking the tree.
4. **Mutation-Driven Cache Invalidation:** The indices are updated incrementally via `MutationObserver` batched microtasks, eliminating synchronous $\mathcal{O}(N)$ penalties on the critical path.

## 19. Gap Analysis (Current → Ideal)

| Capability | Current State | Ideal State | Gap | Risk if Omitted |
| :--- | :--- | :--- | :--- | :--- |
| **Retrieval Mechanism** | Synchronous DOM Traversal ($\mathcal{O}(N)$) | Inverted Index / Hash Map ($\mathcal{O}(1)$) | Massive | CPU bottlenecks on dense SPAs |
| **Query Strategy** | Fallback Cascade (Hardcoded) | Dynamic Query Planner (Selectivity-based) | High | Candidate explosion |
| **Spatial Retrieval** | Non-existent (Handled post-retrieval) | Pre-filtered via spatial index (R-Tree) | Massive | Cannot resolve ambiguous grids efficiently |
| **State Coherency** | Cold start per command | Continuously updated via MutationObserver | High | Subsystem remains reactive instead of proactive |

## 20. Engineering Roadmap

To eliminate synchronous traversal costs without breaking the current Reasoner, we must incrementally introduce indexing:

1. **Phase 1: Query Planner & Selectivity Priority (Short-term)**
   - Stop using structural CSS paths as the first query. Evaluate the EID for highly selective attributes (`data-testid`, unique `aria-labels`) and query those first using `querySelectorAll([attribute])`.
2. **Phase 2: Text Inverted Index (Medium-term)**
   - Implement a lightweight, background `MutationObserver` that maps visible text nodes to their parent elements in a JS `Map`. 
   - Update Candidate Retrieval to look up candidates by text in $\mathcal{O}(1)$ before falling back to CSS traversal.
3. **Phase 3: Spatial Filtering (Medium-term)**
   - Integrate an `IntersectionObserver` to track the visibility and rough position of interactive elements.
   - Cull the candidate pool spatially *before* handing it to the Reasoner.
4. **Phase 4: Full Scene Graph Synchronization (Long-term)**
   - Replace direct DOM queries entirely. Build an isolated Scene Graph representation (Accessibility + Spatial) that remains perfectly synced with the DOM via microtask batching. 
   - Retrieval queries the Scene Graph synchronously ($\approx 0.1\text{ms}$) while the DOM updates asynchronously, maximizing pipeline throughput.
