# Greenfield Runtime Architecture Investigation
## First-Principles Investigation of the Locator Intelligence & Interaction Replay System

**Status:** Independent architecture review — no obligation to preserve existing Locator Engine
**Conclusion (preview):** The Locator Engine is not a broken implementation of the right idea. It is a correct implementation of the wrong idea. The cross-machine contract should never have been a selector string.

---

## Phase 1 — Problem Definition

The stated symptom is "all locator candidates exhausted" on 10–20% of interactions. It's tempting to treat this as a selector-engineering problem: better XPath, better scoring, more candidates. That framing is a trap, because it assumes the thing being searched for (a selector) is the thing that actually matters. It isn't.

Strip away the implementation and ask what invariant the system is actually trying to preserve:

> When the Master performs an action on some object, in service of some goal, the Slave should perform the equivalent action on the equivalent object, producing the equivalent effect — even though the Slave's DOM was independently rendered and is never guaranteed to be structurally identical to the Master's.

That is not "finding an element." It's **preserving behavioral equivalence across two independently-rendered, independently-timed, independently-stateful copies of the same application.** Selector resolution is *one possible mechanism* for achieving that — and a fragile one, because it tries to solve a cross-machine identity problem using a single-machine structural artifact (a CSS/XPath path) that was never designed to survive leaving the DOM it was generated from.

**The real problem, precisely stated:** this is an **object identity and intent-replay problem under partial, asynchronous, semantically-equivalent-but-structurally-divergent state** — not a selector-finding problem. Locator generation, scoring, and ranking are downstream implementation details of *one* candidate solution (structural resolution), not the problem itself.

---

## Phase 2 — First Principles

| Concept | Definition | Purpose | Owner | Lifetime | Crosses machine boundary? | Deterministic? |
|---|---|---|---|---|---|---|
| **Interaction** | An atomic user (or synthetic-user) action against the app — click, type, select, scroll | The unit of behavior to reproduce | Master capture layer | Instantaneous, logged | Yes (as a record) | Yes, as captured |
| **Intent** | The semantic goal behind an interaction, abstracted from the DOM node used to express it | Enables replay to survive UI-level change | Capture layer, inferred | Same as interaction | Yes — this is the *preferred* thing to transmit | Should be, by construction |
| **Identity** | A durable, portable descriptor of "which conceptual object this is" | Bridges Master's object to Slave's equivalent object | Our system (not the target app) | Survives across renders/sessions | Yes — this is the *other* thing to transmit | Should be, by construction |
| **Element** | A concrete DOM node in a specific document at a specific moment | Implementation detail of one render | Browser/renderer | Ephemeral, can be invalidated at any time | **No — never** | No |
| **Target** | The Slave-side element that Identity+Intent resolve to at replay time | The thing actually acted upon | Slave-side resolver | Ephemeral, re-derived every replay | No, stays local | No (re-derived fresh) |
| **Behavior** | The observable effect the interaction should cause | What verification checks | Target application | Bounded by the interaction's causal window | No | Should be, modulo app nondeterminism |
| **Replay** | Reproducing Behavior on the Slave via Identity+Intent → Target → execution | The core runtime operation | Our replay engine | One per interaction | N/A (a process) | Best-effort |
| **Synchronization** | Keeping Master/Slave app state convergent over time | The system-level goal | Our sync layer | Session-long | N/A | Eventually, not instantaneously |
| **Determinism** | Whether the same intent under the same logical state resolves the same way | A property to design for, not assume | N/A | N/A | N/A | Target property, not a given |
| **Resolution** | Mapping Identity → Target at replay time | Executes identity lookup | Slave-side resolver | Per-replay | No | Confidence-scored, not binary |
| **Recovery** | What happens when resolution/replay/verification fails | Keeps the system from silently diverging | Recovery engine | Triggered, bounded | No | N/A |
| **Verification** | Confirming the intended Behavior actually occurred | Closes the loop; prevents false success | Verification engine | Per-replay | No | N/A |
| **Convergence** | The state where Master and Slave are semantically equivalent | The end goal of every cycle | Convergence engine | Continuous/periodic | N/A | Eventually consistent |

The single most consequential row in this table is **Element**: "No — never." The existing architecture's core defect is that it lets something with *zero* cross-machine validity (a selector string derived from one DOM instance) stand in for something that must have cross-machine validity (identity). Everything else follows from fixing that one row.

---

## Phase 3 — Questioning Existing Assumptions

Going through the existing architecture's assumptions directly:

- **Should we even transmit locators?** No. A locator is a statement about *one specific DOM instance*. Transmitting it across the machine boundary is transmitting an answer that only made sense for a question that no longer exists once the Slave's DOM diverges even slightly.
- **Should we transmit identity instead?** Yes — a multi-signal, DOM-instance-independent descriptor of "what this object conceptually is," resolved fresh against whatever DOM the Slave currently has.
- **Should selectors exist at all?** Yes, but only as a *disposable, locally-generated execution detail* — Playwright still needs *some* handle to click. The point is selectors are generated fresh, on the Slave, from identity, against the Slave's live DOM, and are never the thing that crossed the wire.
- **Should candidate ranking exist?** Yes, but ranking *identity matches* against the current DOM (semantic confidence scoring), not ranking pre-baked selector strings scraped from a different document.
- **Should replay even begin with locating an element?** No. It should begin with resolving *intent* against current Slave state. If a business-level command is derivable ("place $50 on Team A"), locating a DOM element may not even be the fastest or most reliable path — sometimes the "object" to act on isn't a DOM node's presence but a state transition to induce.
- **Should interaction replay be object-centric instead of selector-centric?** Yes, unambiguously.
- **Should identity survive DOM mutations?** Yes — this is the entire point of having identity as a separate concept from element.
- **Should replay verify semantic correctness rather than structural correctness?** Yes. "Did the click land on the exact pixel" is the wrong question. "Did the bet slip register the wager" is the right one.

---

## Phase 4 — Runtime Ownership

```
User Intent          → owned by the human/business logic driving the Master (outside our system)
Application Logic     → owned by the target website's frontend framework — opaque, we never control it
DOM                    → owned by the browser/renderer — ephemeral, per-instance, per-render
Browser / Renderer     → owned by Chromium
Playwright              → owned by us — the control surface, not the source of truth
Synchronization Layer    → owned by us — the layer that should own cross-session state mapping
Locator / Identity System → owned by us — MUST be independent of the target app's DOM shape
Replay Engine              → owned by us — executes resolved targets/commands
Verification                → owned by us — the layer allowed to declare success/failure
Recovery                     → owned by us — the layer allowed to escalate or heal
Identity                      → owned by us — must NOT be derived from anything the target app controls exclusively
```

**Where ownership currently leaks:** the existing design lets *DOM structure* (something exclusively owned and freely mutated by the target application's frontend framework, which we do not control and cannot pin) become the *cross-machine contract* (something that must be owned and guaranteed by us). A selector string is really a message from "the target app's React tree, at this instant, on this machine" — and the Slave is asked to treat that message as authoritative, even though the target app never agreed to keep that structure stable. That's a boundary violation: we're letting an actor with no stability obligation (the target site's frontend) define the terms of a contract another of our own subsystems (the resolver) is required to honor exactly.

---

## Phase 5 — Why Locator-Based Architectures Eventually Fail

Working through each stressor, the pattern is consistent:

- **Dynamic DOM / React reconciliation:** keyed remounts produce new node instances for logically identical UI; positional/path-based selectors silently point at the wrong (or now-nonexistent) node.
- **Virtual DOM diffing:** the same logical component can materialize different concrete markup across renders depending on unrelated sibling state changes.
- **Hydration:** SSR markup and CSR markup briefly disagree; a selector captured mid-hydration on the Master may target a node shape that never existed on the Slave, or vice versa.
- **Animations:** transient classes, mid-transition inline styles, and temporarily-duplicated nodes (enter/exit transitions) break both structural and attribute-based matching.
- **Portals:** elements render outside their logical DOM ancestry (e.g., a modal rendered at `document.body`), which breaks any selector relying on ancestor chains reflecting logical/component hierarchy.
- **Shadow DOM:** encapsulation silently blocks descendant selectors that assume a single flat traversable tree.
- **Lists / virtualization:** only the visible window is rendered; the Master may have scrolled to a different offset than the Slave, so the "5th row" the Master clicked may not be rendered — or may not exist — in the Slave's DOM at all.
- **Accessibility changes:** ARIA attributes update asynchronously as content loads, so attribute-based selectors captured too early or too late target stale state.
- **Responsive layouts:** different viewport can mean a genuinely different DOM subtree (e.g., a hamburger menu instead of a nav bar) — not a variant of the same element, but literally absent structure.
- **Lazy rendering / SPA routing / server updates:** ordering and timing of async chunk loads differ session to session; a selector assumes a synchronous world that doesn't exist.
- **Race conditions / timing:** the interaction can fire before the Slave's DOM has reached an equivalent logical state, even if it eventually would.
- **Hidden / detached elements:** `display:none` or `aria-hidden` nodes remain in the DOM and can satisfy a selector's structural criteria while being non-interactable — or worse, matched instead of the real target.
- **State-driven content differences:** different accounts/sessions legitimately show different data (odds, balances) — content-based selectors can accidentally encode Master-specific values that will never appear on the Slave.

**The unifying conclusion:** every one of these is an instance of the same root cause — **the architecture assumes synchronous structural equivalence between Master and Slave DOM at the moment of resolution, when reality only ever offers asynchronous, eventual, semantic equivalence.** Locator failure isn't the disease. It's the predictable symptom of designing a synchronous-structural-match system for an environment that only guarantees eventual-semantic-match. No amount of candidate generation or scoring tuning fixes a category error.

This also explains the "non-determinism": the failures look random because they're not actually random — they're a function of *timing relative to an asynchronous convergence process the system has no model of*. There's no telemetry that captures "how far apart were Master/Slave state at resolution time," so failures present as unexplainable even though they are, in principle, fully explicable.

---

## Phase 6 — Greenfield Design

```
 MASTER SIDE                              SLAVE SIDE
┌─────────────────────┐                 ┌──────────────────────────┐
│ Interaction Capture   │                 │ Object Identity Resolver  │
│  ↳ raw interaction     │                 │  ↳ multi-signal match     │
│  ↳ surrounding context │                 │     against live DOM      │
└─────────┬────────────┘                 └────────────┬─────────────┘
          │                                            │
┌─────────▼────────────┐    wire: SID + Command   ┌────▼─────────────┐
│ Semantic Identity      │  (never a selector) →   │ Behavior Replay    │
│ Descriptor (SID)        │───────────────────────▶│ Engine (tiered)    │
│  + Intent Encoder        │                        └────────┬──────────┘
└──────────────────────┘                                    │
                                                    ┌─────────▼──────────┐
                                                    │ Verification Engine │
                                                    │  (semantic diff)    │
                                                    └─────────┬──────────┘
                                                              │ fail
                                                    ┌─────────▼──────────┐
                                                    │ Recovery Engine      │
                                                    │  (tiered escalation) │
                                                    └─────────┬──────────┘
                                                              │
                                                    ┌─────────▼──────────┐
                                                    │ Convergence Engine   │
                                                    │  (periodic + on-fail)│
                                                    └──────────────────────┘
```

Subsystems, from scratch:

1. **Interaction Capture Layer (Master)** — captures the interaction plus *semantic context* (accessible role, text, nearest stable semantic ancestor, data bindings), not a DOM path.
2. **Semantic Identity Descriptor (SID)** — the portable, cross-machine identity contract (detailed in Phase 7). This, not a selector, is what crosses the wire.
3. **Intent Encoder** — attempts to lift the interaction to a business-level **Command** (e.g., `PLACE_BET{selectionId, stake}`); falls back to a UI-level command (`ACTIVATE{sid, purpose}`) when no business semantics are derivable.
4. **Object Identity Resolver (Slave)** — takes an SID and the Slave's *current* DOM, returns confidence-scored target candidates. This is the only component that resembles the old "locator engine," and it never sees or trusts anything captured on the Master's DOM structure directly.
5. **Behavior Replay Engine** — executes the highest-tier viable replay method (Command → Semantic behavior → raw DOM event), see Phase 8.
6. **Verification Engine** — confirms the expected state transition occurred, using semantic (not structural) diffing.
7. **Recovery Engine** — tiered escalation on failure (Phase 10), never a bare retry loop.
8. **Convergence Engine** — periodic/idle-time full-state reconciliation, independent of any single interaction, so drift can't compound silently across a session.

---

## Phase 7 — Identity (the core of this design)

**Identity must not be a single string.** It should be a composite, versioned, multi-signal descriptor — the **Semantic Identity Descriptor (SID)**:

| Signal | Example | Weight rationale |
|---|---|---|
| Semantic role | `button`, `link`, ARIA role | Strong, framework-independent — accessibility tree is closer to app intent than raw tag/class |
| Normalized accessible name / text | "Place Bet", normalized (case/whitespace/locale-aware) | Strong when stable, degrades under localization — weighted accordingly |
| Nearest stable semantic container | recursively-identified ancestor (e.g., "the market row for Team A vs Team B"), not a raw ancestor chain | Replaces brittle ancestry paths with a recursive identity of its own |
| Data bindings | `data-market-id`, `data-selection-id` when present | Strongest possible signal — business-entity-bound, survives virtually everything |
| Positional/collection signature | ordinal + sibling count within a repeating pattern | Weakest signal, fallback only — explicitly deprioritized versus the old design's heavy reliance on it |
| Interactability filter | visible, attached, not `aria-hidden`, not `display:none` | Hard filter, not a scored signal — excludes candidates before scoring even runs |

Resolution is a **confidence-weighted fusion**, not exact match — conceptually similar to how visual-regression and accessibility-testing tools already identify elements robustly, because none of these signals are tied to a specific rendered node instance.

Answering the specific questions directly:

- **Survive DOM mutations?** Yes — no signal depends on a node reference.
- **Survive re-rendering?** Yes — depends on rendered semantic output, not the underlying JS/vdom object graph.
- **Survive framework updates?** Yes, so long as the *visible, accessible contract* of the app is stable — which is exactly the assumption accessibility tooling already relies on safely.
- **Survive React reconciliation?** Yes — reconciliation changes node identity, not accessible role/text/data-bindings.
- **Survive animations?** Yes, provided resolution defers scoring of position/visual signals until a stable-frame heuristic is met.
- **Can identity exist independently of selectors?** Yes — and it must. Selectors are re-derived locally, on the Slave, from the SID, fresh, every time, and are discarded immediately after use. They never persist and never cross the boundary.

---

## Phase 8 — Replay Philosophy

Not everything should be replayed at the same level of abstraction. A strict, falling-back hierarchy:

1. **Command replay (highest reliability):** when intent is cleanly derivable as a business-level action, replay the *command*, not the click — via the app's own UI pathway or, where safe and available, a lower-level API call. This has no dependency on DOM resolution succeeding at all.
2. **Semantic behavior replay:** resolve SID → target, then perform the *action a user performs on an object of that role* (not literally "dispatch a click at coordinates X,Y") — e.g., "activate the primary control matching this SID," letting the automation layer choose the correct interaction primitive for that role.
3. **Raw DOM event replay (lowest reliability, last resort):** literal click/keystroke dispatch. Used only when the above are unavailable, and *always* paired with verification, since this tier has no built-in self-checking.

The system should always attempt the highest tier possible and fall back down, rather than defaulting to tier 3 as the existing architecture effectively does today.

---

## Phase 9 — Verification

Verification must answer discrete questions, not return a boolean:

- **Was the correct object found?** Resolver confidence exceeds threshold *and* role/text is consistent with what was captured.
- **Did the correct behavior occur?** Compare the Slave's pre/post state diff against the *shape* of the Master's pre/post diff — allowing account-specific value differences (different odds, different balances) while requiring structural/semantic equivalence (a bet-slip entry was added; a modal opened; a route changed).
- **Did the correct state change?** Business-level assertion when a Command was used (e.g., "stake in bet slip == requested stake"); UI-level heuristic otherwise (matching DOM pattern appeared).
- **Outcome is a tri-state + confidence:** `succeeded`, `partially succeeded`, `failed` — never a bare boolean, because a click that "landed" but didn't produce the expected state change is not a success.
- **Is recovery required?** Triggered automatically below a confidence/verification threshold — this is the hook into Phase 10.

---

## Phase 10 — Recovery

Recovery is an explicit, tiered escalation ladder — never a bare "retry the same locator again":

1. **Relaxed re-resolution** — wait for async settle, retry SID resolution with relaxed thresholds.
2. **Signal degradation** — drop the weakest failing signal and re-score (e.g., ignore positional signal if list virtualization is suspected).
3. **Replay-tier fallback** — drop from Command → Semantic behavior → raw event, or vice versa if a higher tier just became available.
4. **State healing** — instead of blindly retrying the identical action, take a corrective step to bring the Slave back toward the Master's logical state (re-navigate, clear transient UI state, reset scroll position) before retrying.
5. **Escalation with context bundle** — emit SID, DOM snapshot, network state, and confidence scores to an observability/alerting channel for manual resolution or offline model improvement. This is also what turns "unexplainable" failures into explainable ones — the missing piece in the current system.
6. **Safe abort** — mark the session desynced and halt replay for it rather than let it silently drift into an incorrect-but-successful-looking state. In a betting context specifically, a false "success" is strictly worse than a stopped session — this should be a hard design principle, not a tuning parameter.

**Convergence** is deliberately *not* folded into per-interaction recovery alone — a periodic/idle-time full-state reconciliation pass runs independently, catching slow drift that no single interaction's recovery path would ever trigger.

---

## Phase 11 — Failure Simulation

| Stressor | Outcome under this design |
|---|---|
| React rerenders | Unaffected — identity resolution is not node-reference-based; resolves fresh each time |
| Virtualized lists | Positional signal deprioritized; resolver triggers scroll-into-view for data-bound candidates not currently rendered |
| Animations | Resolution defers position/visual scoring until a stable-frame heuristic is satisfied |
| DOM replacement | Unaffected — identity-based, not reference-based |
| Multiple matching elements | Confidence scoring degrades gracefully; ties escalate to disambiguation recovery tier |
| Delayed rendering | Bounded wait/backoff built into resolution before declaring failure |
| Feature flags / localization | Tolerated via role+structure+data-binding combination; text-only matches get lower confidence and can flag for review |
| Different viewports | Explicitly flagged as a **hard case** — a mobile hamburger menu and a desktop nav item are not structural variants of one element, they're different UI surfaces for the same intent; this needs an app-specific equivalence mapping, not a fully automatic solve, and the design should say so rather than pretend otherwise |
| Different accounts / app state | Expected and tolerated — verification uses relative/structural equivalence, not exact value equality |
| Hidden / detached nodes | Filtered out by the hard interactability filter before scoring even begins |
| Server updates / SPA routing / framework updates | Robust as long as the app's *accessible contract* holds; a genuine UI redesign is a legitimate hard failure requiring re-capture, not a resolver bug |

---

## Phase 12 — Comparison

| Dimension | Locator Engine (current) | Identity + Intent Replay (proposed) |
|---|---|---|
| Correctness | Structural match only; blind to semantic equivalence | Matches on what the object *is*, not where it happens to sit |
| Determinism | Illusory — appears deterministic until DOM shape shifts | Explicit confidence model instead of false certainty |
| Maintainability | Every DOM/framework change risks silent breakage | Decoupled from DOM shape; breaks only on genuine semantic contract change |
| Complexity | Looks simple, but complexity is hidden in ever-growing candidate-scoring heuristics | Higher upfront design complexity, but centralized and principled rather than accreted |
| Recovery | Retry-the-same-locator loops | Tiered escalation ladder with state healing and safe abort |
| Performance | Fast when it works (string match) | Slightly higher per-resolution cost (multi-signal scoring); mitigate with a **local, session-scoped selector cache derived from SID**, never transmitted cross-machine |
| Failure modes | Opaque ("candidates exhausted") | Explainable — structured telemetry ties failures to specific signal degradation |
| Scalability | Degrades as target app complexity grows | Scales with app complexity better because it doesn't depend on structural stability |
| Extensibility | Selector tuning has diminishing returns | New signals (visual embeddings, semantic ML matchers) can be added to the fusion model without re-architecting |

**The proposed architecture is fundamentally superior** on every axis that matters for a long-lived synchronization system running against a UI we don't control. The one real cost — added resolution latency and design complexity — is manageable and is a legitimate, bounded engineering trade-off, not a fundamental defect the way the current architecture's category error is.

---

## Final Deliverable

**The Locator Engine, as the cross-machine contract, is the wrong abstraction.** This is not a claim that locators are inherently bad — Playwright still needs *some* selector to click, and that's fine. The defect is specifically that a selector string derived from one DOM instance was being treated as a durable, transmittable, cross-session identity contract. It never had that property, and no amount of candidate generation, scoring, or ranking tuning can give it that property, because the underlying assumption — synchronous structural equivalence between two independently-rendered DOM trees — does not hold and never will.

**Recommendation:** Replace selector-transmission with:

1. A **Semantic Identity Descriptor (SID)** as the cross-machine identity contract (Phase 7),
2. An **Intent Encoder** that prefers business-level Commands over raw UI actions (Phase 8),
3. A **Slave-local Object Identity Resolver** that generates disposable selectors on demand, never trusts Master-side structure directly,
4. A **tiered Replay Engine** (Command → Semantic behavior → raw event),
5. A **semantic Verification Engine** that checks state transitions, not pixel-perfect structural match,
6. A **tiered Recovery Engine** with explicit escalation and safe-abort, replacing bare retry loops, and
7. A standing **Convergence Engine** for periodic full-state reconciliation independent of any single interaction.

This is a genuine architectural replacement, not an incremental improvement to the existing Locator Engine — and it should be adopted even though it requires retiring the current selector-transmission model entirely.
