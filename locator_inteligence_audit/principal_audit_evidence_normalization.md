# Principal Engineering Audit — Subsystem Review: Evidence Normalization

**Document Status:** DRAFT / UNDER REVIEW  
**Classification:** INTERNAL STRICTLY CONFIDENTIAL  
**Subject:** Architectural Review of Evidence Normalization  
**Scope:** String Processing, Allocation Overhead, Information Theory, and Determinism  

---

## 1. Current Architecture

The Evidence Normalization subsystem acts as a middleware pipeline between Evidence Collection and Candidate Ranking. Its purpose is to transform chaotic, highly variable raw DOM attributes (e.g., heavily whitespace-padded `textContent`, viewport-dependent coordinates) into a standardized, mathematical format that the heuristic Scoring Engine can evaluate deterministically.

Currently, it employs procedural sanitization routines:
- **Textual:** Applies `trim()`, `toLowerCase()`, and regular expressions to strip line breaks and zero-width spaces.
- **Topological:** Converts raw depth counters into relative integer deltas.
- **Spatial:** Translates absolute DOM coordinates into mathematical ratios or scalar distances relative to the viewport.

## 2. Responsibilities

- **Noise Reduction:** Strip ephemeral environmental artifacts (e.g., responsive design wrapping, OS-level font rendering quirks) from the evidence vector.
- **Type Coercion:** Ensure all heuristic dimensions map to predictable types (strings $\rightarrow$ normalized tokens; floats $\rightarrow$ bounded scalars $[0, 1]$).
- **Format Alignment:** Ensure the Candidate's evidence shape precisely matches the Master EID's evidence shape for 1:1 similarity scoring.

## 3. Inputs and Outputs

- **Inputs:** Raw `CandidateEvidence` objects (containing raw DOM strings, integers, and `DOMRect` structures) and the Master EID.
- **Outputs:** `NormalizedEvidence` objects containing tokenized arrays, bounded numerical deltas, and normalized boolean flags.

## 4. Data Ownership

Evidence Normalization is fundamentally an **ETL (Extract, Transform, Load)** component. It takes ownership of the raw data structures yielded by Evidence Collection, mutates or clones them into normalized representations, and passes them to the Ranker. It does not own any historical or cross-interaction state.

## 5. State Ownership

The subsystem is entirely **stateless**. It executes as a pure functional pipeline: `f(RawEvidence) -> NormalizedEvidence`. It has no awareness of other candidates or prior normalizations.

## 6. Pipeline Boundaries

The subsystem straddles the memory boundary between raw DOM traversal (V8 DOM bindings) and pure mathematical evaluation (V8 JS heap). 
**Boundary Issue:** Because it operates on every candidate passed by Retrieval/Collection, it multiplies the latency of the pipeline by the number of candidates $K$.

## 7. Hidden Assumptions

- **Assumption 1 (Cost-Free Strings):** It assumes string manipulation (e.g., regex `replace(/\s+/g, ' ')`) is cheap. In V8, complex string allocations and regex engines introduce hidden latency spikes and trigger rapid young-generation Garbage Collection (GC).
- **Assumption 2 (Lossless Normalization):** It assumes converting everything to lowercase and stripping whitespace retains all semantic meaning. In reality, capitalization is often high-entropy (e.g., an icon font mapping 'a' to an arrow and 'A' to a star).
- **Assumption 3 (Symmetry):** It assumes normalization must be applied equally to both the EID and the Candidate at runtime. 

## 8. Coupling Analysis

- **Tightly Coupled** to the idiosyncrasies of HTML/CSS text rendering. 
- **Tightly Coupled** to the Scoring Engine. The normalization routines are explicitly hardcoded to format data exactly as the `SimilarityScore` class demands.

## 9. Data Model

The data model shifts from a dense, unstructured dictionary to an allocated, structured DTO (Data Transfer Object). 
- **Weakness:** Every normalization step allocates new memory. A single text node processed via `toLowerCase().trim().split()` allocates at least three new string objects and one array in the V8 heap per candidate.

## 10. Correctness Guarantees

- **Guaranteed:** The output format will never crash the downstream Scoring Engine.
- **Not Guaranteed:** Semantic integrity. A localized date format ("26/07/2026") normalized blindly might fail to match a Master EID localized differently ("07/26/2026") because normalization lacks semantic type awareness.

## 11. Failure Modes

- **Catastrophic Backtracking (Regex):** Poorly written normalization regexes applied to massively nested DOM text nodes (e.g., `document.body.innerText`) can trigger catastrophic backtracking, locking the main thread for seconds.
- **Memory Pressure Stutters:** If 100 candidates undergo heavy string tokenization simultaneously, the GC is forced to run synchronously during the frame, dropping the frame rate and stalling the automation controller.

## 12. Edge Cases

- **Zero-Width Joiners (ZWJ):** Emojis or complex glyphs contain ZWJ sequences. Naïve string normalization or truncation can split an emoji in half, corrupting the semantic evidence.
- **Responsive Geometry:** Normalizing a $200\times50$ button (Master) against a $50\times200$ button (Slave mobile viewport) via simple Euclidean distance normalization yields massive errors unless normalized *relative to aspect ratio constraints*.

## 13. Complexity Analysis

- **Time Complexity:** $\mathcal{O}(K \cdot L)$, where $K$ is the candidate count and $L$ is the string length of the evidence.
- **Memory Complexity:** $\mathcal{O}(K \cdot L)$. This is the most dangerous aspect of the subsystem. It generates immense temporary memory allocations that exist solely to be scored and immediately discarded.

## 14. Scalability Analysis

The current string-heavy, allocating architecture **does not scale** for high-frequency (60Hz) automation. If the Master broadcasts a hover stream, normalizing $K=50$ candidates 60 times a second will rapidly exhaust the V8 young generation heap, triggering major GC pauses that completely sever the real-time interaction bridge.

## 15. Observability

Observability is **non-existent**. We do not measure the time spent in regex execution, nor do we track the memory allocated by the normalization pipeline.

## 16. Explainability

Normalization transforms evidence, masking the original raw data. If a candidate is rejected due to a normalization mismatch (e.g., whitespace stripping merged two words inappropriately), the telemetry logs the *normalized* string, making it incredibly difficult for an engineer to deduce what the raw DOM actually looked like at runtime.

## 17. Comparison with Analogous Systems

**Search Engines (Tokenization Pipelines):**
Elasticsearch utilizes highly optimized Analyzers (Char Filters $\rightarrow$ Tokenizers $\rightarrow$ Token Filters). They use zero-allocation, read-only slices (e.g., Lucene's `BytesRef`) to compare terms without ever allocating new strings. Our subsystem creates full string copies at every step.

**Compiler Design (Lexical Analysis):**
Compilers do not mutate source code strings. They emit a stream of Tokens containing start/end integer indices pointing to the immutable source string. 

**Database Engines (Vectorization):**
Modern OLAP databases (ClickHouse) process data in vectorized columnar blocks to maintain CPU cache coherency. Our subsystem processes candidates row-by-row, object-by-object, destroying CPU L1/L2 cache locality.

## 18. Ideal Production-Grade Architecture

An ideal Evidence Normalization subsystem is **Zero-Allocation, In-Place, and Type-Aware**.

1. **Zero-Allocation Lexing:** Strings are never mutated or copied. Normalization operates via WebAssembly or highly optimized JS functions that return integer offsets and lengths (views) pointing to the original raw DOM string.
2. **Pre-Normalized Master EID:** The Master EID is normalized exactly *once* on the Node.js server before broadcast. Slave candidates are normalized against an already-optimized reference, cutting computational cost in half.
3. **Semantic Type Awareness:** Normalization applies different strategies based on semantic classification. Dates, currency, and numerical counters are normalized mathematically, whereas prose is normalized via tokenized stemming.
4. **Vectorized Math:** Spatial and topological normalization is computed via flat Float32Arrays, maintaining perfect CPU cache locality and allowing SIMD (Single Instruction, Multiple Data) execution paths.

## 19. Gap Analysis (Current → Ideal)

| Capability | Current State | Ideal State | Gap | Risk if Omitted |
| :--- | :--- | :--- | :--- | :--- |
| **String Processing** | RegEx mutations, deep copies | Zero-allocation index/offset views | Massive | High GC pressure and latency spikes |
| **Data Locality** | Dictionary-of-Objects | Struct-of-Arrays (Float32Array) | High | Cache misses during ranking |
| **Semantic Intelligence** | Blind string lowercase/trim | Type-aware parsing (Dates, Numbers) | High | False negatives on localized interfaces |
| **Execution Redundancy** | Normalizes Master EID repeatedly | Master EID pre-normalized offline | Low | Wasted CPU cycles |

## 20. Engineering Roadmap

To solve the GC pressure and latency bottlenecks, the subsystem must aggressively adopt low-level memory paradigms:

1. **Phase 1: RegEx Eradication (Immediate)**
   - Audit and replace all regex-based string normalization (`/\s+/g`) with fast, linear `for`-loop character iteration that performs in-place evaluation without generating intermediary strings.
2. **Phase 2: Master Pre-Normalization (Short-term)**
   - Shift the normalization of the Master EID upstream. The `CommandRouter` in Node.js should normalize the EID before broadcasting to Slaves, so Slaves only normalize candidate data.
3. **Phase 3: Zero-Allocation String Views (Medium-term)**
   - Implement a custom String Matcher that compares the un-normalized candidate string against the normalized EID using pointer offsets, completely eliminating `.toLowerCase()` and `.trim()` memory allocations.
4. **Phase 4: Struct-of-Arrays Spatial Normalization (Long-term)**
   - Refactor Candidate Spatial Evidence into a single contiguous `Float32Array`. Normalize absolute coordinates into relative ratios using batch vectorized math (`Math.imul`, typed arrays) to maximize CPU cache hits before passing the array to the Scoring Engine.
