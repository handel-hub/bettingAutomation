# Principal Engineering Audit — Subsystem Review: Candidate Ranking

**Document Status:** DRAFT / UNDER REVIEW  
**Classification:** INTERNAL STRICTLY CONFIDENTIAL  
**Subject:** Architectural Review of Candidate Ranking (Scoring Engine)  
**Scope:** Decision Theory, Bayesian Inference, Latency, and Information Theory  

---

## 1. Current Architecture

The Candidate Ranking subsystem operates at the core of the Locator Intelligence reasoning layer. It receives normalized evidence vectors for a set of candidate nodes ($K$) and computes a similarity score against the Master Element Identity Document (EID). 
It employs a **Weighted Additive Scoring** algorithm:
$$Score = (W_{sem} \times Sem) + (W_{str} \times Str) + (W_{vis} \times Vis) + (W_{top} \times Top)$$
Where $W$ represents hardcoded scalar weights summing to 1.0, and the variables represent normalized similarity distances in $[0, 1]$. The subsystem evaluates all candidates, sorts them by descending score, and passes the ranked list to the Verification and Confidence Gate layer.

## 2. Responsibilities

- **Inference:** Deduce the mathematically most probable semantic match from a pool of ambiguous physical candidates.
- **Dimensional Reduction:** Compress a multi-dimensional feature space (Text, Tag, Bounding Box, Depth, Role) into a single, sortable scalar confidence metric.
- **Tie-Breaking Foundation:** Provide the numerical granularity required for upstream subsystems to detect and resolve ambiguity when two candidates score identically.

## 3. Inputs and Outputs

- **Inputs:** An array of $K$ normalized candidate evidence structures and the Master EID reference.
- **Outputs:** An array of `RankingResult` objects, containing candidate references, their final scalar scores, and the decomposed vector sub-scores, sorted by descending score.

## 4. Data Ownership

Candidate Ranking owns the **Heuristic Policy**. It owns the hardcoded mathematical weights and distance formulas. It does not own the evidence it evaluates, nor does it own the final execution decision (owned by `ConfidenceGate`). 

## 5. State Ownership

The subsystem is purely **stateless**. The ranking of candidate $A$ depends entirely on its own evidence compared to the Master EID. It possesses no historical memory of previous resolutions, meaning it learns nothing from failure or success over time.

## 6. Pipeline Boundaries

The subsystem executes entirely within the synchronous JavaScript heap on the Slave browser. It represents the computational apex of the verification pipeline. Its boundary is cleanly defined: it accepts numbers and strings, and it outputs sorted numbers. 

## 7. Hidden Assumptions

- **Assumption 1 (Evidence Independence):** The additive model assumes that all evidence vectors are statistically independent. In reality, DOM depth (Topological) and bounding box size (Visual) are highly covariant (deeply nested elements are generally smaller). Additive scoring overweights covariant features, mathematically violating Naïve Bayes independence assumptions.
- **Assumption 2 (Linear Substitution):** Additive scoring fundamentally assumes that strong evidence in one dimension compensates for weak evidence in another. A $1.0$ spatial match can "make up for" a $0.0$ semantic text match, artificially inflating the score of a nearby but semantically incorrect element.
- **Assumption 3 (Symmetric Variance):** It assumes a $10\%$ deviation in text matching is mathematically equivalent to a $10\%$ deviation in bounding box width. 

## 8. Coupling Analysis

- **Loosely Coupled** to the DOM. The Ranking subsystem operates purely on DTOs and abstract mathematical distances; it has no knowledge of `HTMLElements` internally.
- **Tightly Coupled** to the schema of the Evidence Normalizer. Changes to the EID schema require corresponding hardcoded updates to the scoring polynomial.

## 9. Data Model

The data model relies on iterating through fixed property dictionaries. 
- **Weakness:** The object-oriented allocation of a new `RankingResult` class instance per candidate generates transient objects that exist only to be sorted and immediately garbage-collected.

## 10. Correctness Guarantees

- **Guaranteed:** The output array will always be strictly sorted, enabling downstream $O(1)$ access to the "best" heuristic match.
- **Not Guaranteed:** Accuracy of identity. Because additive scoring allows substitution (masking failures), the #1 ranked candidate is frequently a false positive when the true element is missing but a structurally similar sibling exists.

## 11. Failure Modes

- **The False Positive Masking Trap:** If the target button "Submit" disappears (e.g., loading state), but a structurally identical "Cancel" button sits exactly in the same spatial location, the candidate will score $0.0$ on text, but $1.0$ on structure, topology, and visual dimensions. The additive sum might reach $0.70$, easily passing downstream confidence thresholds and causing the system to click "Cancel" instead of waiting.
- **Score Compression:** As UI complexity grows and more heuristic weights are added to the equation, the mathematical impact of any single piece of evidence is diluted. All candidates regress toward a mean score of $0.5$, destroying the mathematical spacing needed to detect ambiguity.

## 12. Edge Cases

- **Exact Score Ties:** Sibling nodes generated by a `.map()` loop (e.g., list items) often possess identical tags, empty text, and identical dimensions, yielding exact mathematical score ties down to floating-point precision, forcing arbitrary array-index tie-breaking.
- **Empty EIDs:** If the Master EID was generated on an SVG without text, standard text weights evaluate to $0$, penalizing the candidate unfairly for lacking an attribute that the Master also lacked.

## 13. Complexity Analysis

- **Time Complexity:** $\mathcal{O}(K \log K)$ dominated by the final `Array.prototype.sort()`. The scoring loop itself is $\mathcal{O}(K \cdot D)$ where $D$ is the number of evidence dimensions. Since $D$ is small, it behaves linearly.
- **Memory Complexity:** $\mathcal{O}(K)$ allocations for result wrappers. At high frequencies, this causes minor, continuous GC pressure.

## 14. Scalability Analysis

Mathematically, the subsystem scales perfectly with $K$ regarding CPU execution (simple arithmetic). However, it **does not scale logically**. As the application scales in complexity, the static weights ($W_{sem}=40\%$, etc.) become increasingly brittle. A heuristic weight tuned for a simple login page will inevitably fail on a complex trading dashboard. Static polynomial ranking cannot scale across diverse UI paradigms.

## 15. Observability

Observability is **Moderate**. The decomposed sub-scores (Semantic, Structural, etc.) are attached to the `RankingResult` and frequently logged via telemetry, allowing engineers to reverse-engineer the math.

## 16. Explainability

The additive math is highly explainable ("Score is $0.8$ because Visual was $1.0$ and Semantic was $0.5$"). However, the *rationale for the weights* is completely unexplainable. There is no mathematical justification for why Semantic is weighted at exactly $0.40$; it is merely an empirical guess.

## 17. Comparison with Analogous Systems

**Machine Learning (Learning to Rank - LTR):**
Search engines (Google, Elasticsearch) abandoned static additive scoring decades ago. They use Gradient Boosted Decision Trees (GBDTs like XGBoost or LambdaMART) to learn non-linear relationships. If text matches perfectly, a tree can learn to completely ignore spatial deviations. Additive polynomials cannot model non-linear "IF-THEN" relationships.

**Probabilistic Systems (Naive Bayes):**
Spam filters use multiplicative probabilities ($P(A) \times P(B)$). If a required piece of evidence is missing ($P(A) = 0$), the entire probability falls to $0$. Our system allows $0 + 1 = 1$, which defies probabilistic identity resolution.

**Constraint Solvers:**
Solvers treat rules as rigid boundaries. If an element is `hidden`, it is eliminated from the search space entirely, regardless of how well its text matches.

## 18. Ideal Production-Grade Architecture

An ideal Candidate Ranking subsystem relies on **Multiplicative Probabilities and Pre-Compiled Decision Trees**.

1. **Multiplicative Bayes over Additive Heuristics:** To prevent failure masking, scores must be multiplied, not added. Identity requires a logical AND across critical dimensions. If semantic mismatch probability is $100\%$, the total identity probability must drop to $0\%$.
2. **Hard Constraint Gating:** Before ranking, candidates must pass a boolean constraint solver (e.g., Visibility = true).
3. **Wasm-Compiled LTR (Learning to Rank):** The subsystem runs a lightweight, depth-limited Decision Tree (trained offline via telemetry) compiled to WebAssembly. This allows the ranker to evaluate non-linear evidence (e.g., "If Tag=Button AND Text=Submit, ignore Spatial Coordinates entirely because text is highly selective").
4. **Float64 Data-Oriented Design:** Candidates and weights are stored in typed arrays (`Float64Array`). Ranking evaluates the arrays sequentially in a tight V8 loop without allocating single intermediary JavaScript objects, completely eliminating GC overhead.

## 19. Gap Analysis (Current → Ideal)

| Capability | Current State | Ideal State | Gap | Risk if Omitted |
| :--- | :--- | :--- | :--- | :--- |
| **Mathematical Foundation**| Additive Heuristics (Linear) | Multiplicative / Probabilistic (Non-linear) | Massive | False positives via score substitution |
| **Weighting Strategy** | Static magic numbers | Offline telemetry-trained LTR models | High | Brittleness across diverse UIs |
| **Memory Allocation** | OOP Wrapper per candidate | Struct-of-Arrays (Zero Allocation) | Med | CPU cache misses, GC pressure |
| **Negative Evidence** | Not supported mathematically | Constraint solver elimination | High | Masked logical failures |

## 20. Engineering Roadmap

1. **Phase 1: Multiplicative Constraint Injection (Immediate)**
   - Modify the additive polynomial to support a multiplicative penalty scalar $[0,1]$. If critical evidence completely fails (e.g., $100\%$ text mismatch on a high-entropy string), multiply the final additive score by $0.1$ to simulate probabilistic elimination.
2. **Phase 2: Data-Oriented Refactoring (Short-term)**
   - Strip object allocation from the scoring loop. Pass normalized evidence as flattened typed arrays, evaluate scores in a tight loop, and return an `Int32Array` of sorted candidate indices, yielding a zero-allocation ranking phase.
3. **Phase 3: Decision Tree Execution (Medium-term)**
   - Replace the polynomial equation with a hardcoded, hand-tuned Decision Tree evaluating evidence sequentially. This immediately unlocks non-linear ranking (ignoring unstable spatial data if semantic data is overwhelmingly strong).
4. **Phase 4: Offline Telemetry Pipeline (Long-term)**
   - Route historical ranking telemetry (successes and recovery failures) to an offline data pipeline. Train a lightweight XGBoost model to optimize the tree structure, and deploy the updated ruleset to the fleet dynamically via the `FeatureFlagManager`.
