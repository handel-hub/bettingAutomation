Yes. Given the context we've built, I think the right move is to create a **single system-level specification**, not nine disconnected mini-documents.

The nine areas should become nine sections of one coherent specification, because they depend on each other:

**Policy → Mathematics → Behavior → Edge State Machine → Execution → Rebet → Settlement → Consistency → Failure/Recovery → Invariants**

And importantly, this specification will be **implementation-independent**. We won't map things to your existing folders, Node modules, Playwright code, IPC channels, or database tables yet.

# Amount & Pricing / Autonomous Edge Policy System

## System Specification — Draft 1

---

# 1. System Purpose and Scope

The Amount and Pricing System is an autonomous policy-execution subsystem responsible for determining, adapting, and executing monetary decisions within a browser-based automation environment.

Its purpose is to transform a persistent user-defined policy into concrete executable amounts while continuously adapting to rapidly changing browser-local conditions.

The system is deliberately divided into three conceptual domains:

1. **Persistent Policy Domain**
2. **Execution Domain**
3. **Browser Edge Domain**

The persistent policy defines **what the user wants**.

The execution domain maintains durable runtime and execution identity.

The browser edge domain continuously observes rapidly changing local conditions and autonomously evaluates the policy against those conditions.

The browser is therefore not merely a UI client. It is an **autonomous edge-compute execution environment**.

During normal operation, the browser does not require a central round trip for every change in odds, balance, market state, candidate calculation, or behavioral decision.

The architecture is specifically designed around the fact that browser-local conditions can change much faster than centralized coordination should be expected to operate.

---

# 2. Core Architectural Model

The system follows this conceptual relationship:

```text
Persistent Policy
       │
       ▼
Policy Distribution
       │
       ▼
Browser Edge Policy Instance
       │
       ├── Observe local state
       ├── Evaluate constraints
       ├── Generate candidates
       ├── Resolve infeasibility
       ├── Apply behavioral preferences
       ├── Validate current state
       └── Execute
```

The execution plane exists alongside this process rather than sitting in the middle of every calculation.

The distinction is important.

The browser does not continuously ask:

> "What amount should I use?"

Instead, it receives the policy and becomes capable of answering that question itself using its current local state.

The execution plane remains responsible for durable execution identity, lifecycle coordination, recovery, reconciliation, and other state that must survive the destruction of a browser instance.

The browser is therefore **autonomous but not authoritative over persistent policy**.

---

# 3. Policy Specification

## 3.1 Policy Definition

A policy is a persistent description of how monetary decisions should be generated and how the system should behave under changing conditions.

A policy contains configuration rather than transient observations.

Conceptually:

```text
Policy
 ├── Stake constraints
 ├── Profit constraints
 ├── Rebet configuration
 ├── Infeasibility strategy
 ├── Behavioral preferences
 └── Policy metadata/version
```

The exact set of parameters remains extensible.

The important architectural rule is that policy must remain independent of runtime observations.

For example:

```text
Policy:
    stake range = ₦X–₦Y
    desired profit = ₦Z
```

is different from:

```text
Current odds = 2.35
Current balance = ₦100,000
```

The first is policy.

The second is environment state.

---

## 3.2 Policy Versioning

Every persistent policy must have a monotonically identifiable version.

Example:

```text
Policy v17
Policy v18
Policy v19
```

A browser must know which version it currently has instantiated.

Every decision generated from a policy should carry the policy version from which it originated.

A decision generated under an obsolete policy must never silently become an execution of the newer policy.

Policy changes therefore invalidate or supersede previously generated decisions according to explicitly defined transition rules.

---

## 3.3 Policy Distribution

Policy distribution is a control operation.

It is not part of the hot calculation loop.

A browser receives a policy and constructs or updates its local policy instance.

After that, local observations can drive autonomous evaluation.

A policy update therefore behaves more like:

```text
Policy update
      ↓
Browser policy replacement
      ↓
Local state-machine reconciliation
      ↓
Autonomous evaluation resumes
```

rather than:

```text
Every observation
      ↓
Central request
      ↓
Central calculation
      ↓
Browser response
```

---

# 4. Mathematical Solver Specification

The mathematical solver is responsible for determining **what is mathematically permissible**.

It must not make human-preference decisions.

It must not know whether ₦12,500 "looks better" than ₦13,591.

It only determines feasibility.

---

## 4.1 Solver Inputs

The solver receives:

- active policy;
- current odds;
- current balance;
- platform constraints;
- monetary precision;
- permitted stake increments;
- current execution/rebet state where relevant;
- other explicitly defined mathematical inputs.

The solver must operate against a coherent decision snapshot.

---

## 4.2 Constraint Intersection

The valid solution space is the intersection of all applicable constraints.

Conceptually:

```text
User Policy
      ∩
Platform Constraints
      ∩
Runtime Constraints
      ∩
Monetary Domain
      =
Feasible Solution Space
```

A candidate is valid only if it belongs to that intersection.

---

## 4.3 Discrete Monetary Domain

The solver must reason about actual monetary values rather than an abstract continuous mathematical space.

For example, if a platform only permits:

```text
₦500
₦550
₦600
...
```

then the solver must operate over those permissible values.

A continuous mathematical solution such as:

```text
₦533.333333...
```

does not automatically constitute an executable solution.

Currency precision and platform increments are therefore mathematical constraints rather than post-processing concerns.

---

## 4.4 Feasible Policy

A policy is feasible when at least one executable monetary candidate satisfies all applicable constraints.

The solver should conceptually return:

```text
FEASIBLE
    candidate-space
    effective constraints
```

rather than merely returning a boolean.

---

## 4.5 Infeasible Policy

A policy is infeasible when no candidate satisfies the complete constraint set.

The system must **not silently reject or skip the operation**.

Instead:

```text
Infeasible
   ↓
Alert
   ↓
Configured resolution strategy
```

The original policy must remain distinguishable from the resulting effective policy.

---

# 5. Infeasibility Resolution

Two primary strategies exist.

## 5.1 Clamp

Clamp the requested requirement toward the nearest executable boundary.

Example conceptually:

```text
Requested:
profit = ₦5,000

Maximum achievable:
profit = ₦4,600

Resolution:
effective profit = ₦4,600
```

The original policy remains ₦5,000.

The effective runtime requirement becomes ₦4,600.

---

## 5.2 Reduce Profit Requirement

The system may reduce the profit requirement to the maximum achievable value.

This must never create a candidate that violates other constraints.

The resulting decision must still pass:

- stake constraints;
- balance constraints;
- platform constraints;
- monetary constraints;
- other active mathematical requirements.

The system must not blindly continue reducing the target indefinitely.

A future policy may introduce an explicit minimum acceptable profit boundary if required.

---

# 6. Candidate Generation

The solver produces one or more mathematically valid candidates.

Conceptually:

```text
Policy
   ↓
Constraint Solver
   ↓
Feasible Domain
   ↓
Candidate Generator
   ↓
Valid Candidates
```

Every candidate carries the guarantee:

> **This candidate satisfies the mathematical constraints under the snapshot from which it was generated.**

Candidate generation must not incorporate subjective human preference.

---

# 7. Behavioral Function Specification

This is the layer that handles the difference between:

> mathematically correct

and:

> humanly desirable.

For example:

```text
₦12,500
```

and:

```text
₦13,591
```

may both be mathematically valid.

But a human may strongly prefer one.

Behavior functions therefore rank or transform the **selection order**, not the mathematical domain.

---

## 7.1 Fundamental Invariant

A behavior function cannot create mathematical validity.

It can only select from the valid candidate set.

Conceptually:

```text
Mathematical Solver
        ↓
[₦12,500, ₦13,000, ₦13,500, ₦14,000]
        ↓
Behavior Functions
        ↓
Preferred candidate
```

Never:

```text
Mathematical Solver
        ↓
Valid candidate
        ↓
Behavior Function
        ↓
Invalid candidate
```

---

## 7.2 Possible Behavioral Functions

The system may eventually support:

- round-number preference;
- preferred increments;
- proximity to previous amount;
- smooth progression;
- conservative selection;
- aggressive selection;
- minimum stake preference;
- maximum stake preference;
- profit proximity;
- amount aesthetics;
- deterministic normalization.

These functions are extensible.

They should not alter the mathematical definition of validity.

---

## 7.3 Determinism

Given identical:

```text
policy
+
snapshot
+
candidate set
+
behavior configuration
```

the system should produce the same selected candidate.

Tie-breaking must therefore be deterministic.

This makes decisions reproducible and auditable.

---

# 8. Browser Edge-Compute Specification

This is the defining component of the architecture.

The browser contains an autonomous policy execution state machine.

It receives policy and execution configuration from the surrounding system, but once initialized it can continuously operate against rapidly changing local state.

---

## 8.1 Browser Responsibilities

The browser edge subsystem owns:

- local observation;
- odds observation;
- local balance observation where available;
- local platform state;
- candidate calculation;
- mathematical evaluation;
- infeasibility resolution;
- behavioral selection;
- final pre-execution validation;
- DOM interaction;
- local policy execution state.

---

## 8.2 Edge Autonomy

The browser must not require central communication for every state change.

For example:

```text
Odds = 2.40
      ↓
Calculate
      ↓
Candidate = ₦10,000

Odds = 2.35
      ↓
Recalculate

Odds = 2.20
      ↓
Recalculate

Market suspended
      ↓
Pause

Market reopened
      ↓
Resume
```

All of those transitions may occur entirely within the browser.

The execution plane does not need to participate in every one.

---

# 9. Browser State Machine

A conceptual state model is:

```text
IDLE
 ↓
OBSERVING
 ↓
EVALUATING
 ↓
RESOLVING ──────┐
 ↓              │
SELECTING ◄─────┘
 ↓
READY
 ↓
EXECUTING
 ↓
SUBMITTED / CONFIRMED
```

The exact names are not yet implementation contracts.

They are semantic states.

---

## 9.1 OBSERVING

The browser continuously observes relevant local state.

Examples:

- odds;
- balance;
- market availability;
- DOM state;
- platform restrictions;
- current execution context.

---

## 9.2 EVALUATING

The current snapshot is evaluated against the policy.

If feasible:

```text
EVALUATING → SELECTING
```

If infeasible:

```text
EVALUATING → RESOLVING
```

---

## 9.3 RESOLVING

The configured infeasibility strategy is applied.

After resolution:

```text
RESOLVING → SELECTING
```

If resolution produces no executable candidate:

```text
RESOLVING → ABORTED / OBSERVING
```

according to policy.

The system still emits an alert.

---

## 9.4 SELECTING

Behavior functions select the preferred candidate from the mathematically valid set.

---

## 9.5 READY

A candidate has been selected and is waiting for final validation/execution.

This state should be short-lived.

---

## 9.6 EXECUTING

The browser performs the external UI operation.

This is the most sensitive state because it crosses from computation into an external side effect.

---

## 9.7 SUBMITTED / CONFIRMED

The browser has established whatever level of evidence the platform provides that the operation was submitted or accepted.

This should be distinguished from long-term settlement.

---

# 10. Final Pre-Execution Validation

Because the browser owns the live environment, the browser should perform the final local validation immediately before the irreversible UI action.

Conceptually:

```text
Candidate
   ↓
Current DOM/state check
   ↓
Still valid?
   ├── YES → Execute
   └── NO  → Discard → Re-evaluate
```

This closes the most important local TOCTOU window.

The execution plane does not need to approve every decision for this mechanism to work.

---

# 11. Execution Specification

Execution represents the transition from:

> "I have determined what should happen"

to:

> "I am causing an external side effect."

The execution subsystem must therefore distinguish between:

- decision creation;
- execution attempt;
- successful observation;
- failed execution;
- uncertain execution.

---

## 11.1 Uncertain Execution

The most important failure state is:

```text
UNCERTAIN
```

This occurs when the system cannot determine whether the external side effect occurred.

Example:

```text
Click Place Bet
       ↓
Browser crashes
       ↓
Did the platform receive it?
       ↓
UNKNOWN
```

The system must **not assume failure**.

Nor should it assume success.

It must enter reconciliation.

---

# 12. Reconciliation

Reconciliation determines the actual external state after an ambiguous operation.

Possible evidence includes:

- bet history;
- balance changes;
- platform confirmation;
- transaction identifier;
- platform-specific state;
- other authoritative external evidence.

The purpose is:

```text
UNKNOWN
   ↓
RECONCILIATION
   ↓
CONFIRMED SUCCESS
       OR
CONFIRMED FAILURE
```

Only after reconciliation can the sequence safely continue.

This prevents duplicate external operations.

---

# 13. Rebet Specification

Rebet is defined as a continuation mechanism.

It is **not inherently a loss-management mechanism**.

Loss-based progression is outside the current V1 scope.

---

## 13.1 Rebet State

Rebet state represents the continuation of an active policy sequence.

It may include:

- sequence identity;
- current rebet iteration;
- maximum permitted iterations;
- current policy version;
- previous decision;
- previous execution result;
- continuation status.

---

## 13.2 Rebet Trigger

The precise trigger must be defined by the policy.

It may be based on successful execution or another explicitly defined event.

The architecture should not implicitly equate:

```text
rebet = loss
```

or:

```text
rebet = settlement
```

---

## 13.3 Rebet Idempotency

A single logical event must not produce multiple rebet transitions.

For example:

```text
Result event #781
Result event #781 duplicated
```

must not produce:

```text
Rebet 3
Rebet 4
```

It should produce only one logical transition.

---

# 14. Settlement Specification

Settlement is conceptually different from submission.

A bet can be:

```text
submitted now
settled hours later
```

Therefore:

```text
SUBMITTED
```

must not necessarily mean:

```text
SETTLED
```

The long-term settlement lifecycle may exist outside the browser's short-lived edge execution lifecycle.

The browser does not need to remain alive for the entire lifetime of a sports event merely to preserve state.

The durable system must instead be capable of associating eventual results with the original execution identity.

---

# 15. Consistency and Versioning Specification

Every important state transition must have an identifiable logical context.

Relevant identifiers may include:

- policy version;
- execution sequence;
- decision ID;
- rebet sequence;
- execution attempt;
- external operation identity.

The exact identifier hierarchy will be refined later.

The important principle is:

> **A decision must be attributable to the exact policy and execution context under which it was produced.**

---

## 15.1 Stale Policy

If:

```text
Browser → Policy v17
```

and later:

```text
Policy v18
```

is activated, the browser must not silently continue treating v17 as current.

The browser should reconcile its state with the new policy.

---

## 15.2 Stale Decision

A decision generated from stale conditions must be discarded rather than forced through execution.

---

## 15.3 Duplicate Events

Events must be safely idempotent wherever repetition is possible.

---

## 15.4 Ordering

Where ordering affects correctness, events must have explicit ordering semantics.

Not every event requires global ordering.

This distinction is important for scalability.

---

# 16. Failure and Recovery Specification

The system must distinguish between:

### Known failure

Example:

```text
Platform rejected bet.
```

The outcome is known.

### Unknown outcome

Example:

```text
Browser died immediately after clicking.
```

The outcome is unknown.

These are fundamentally different.

---

## 16.1 Failure Classification

At minimum:

```text
REJECTED
FAILED
CANCELLED
STALE
ABORTED
UNCERTAIN
RECOVERING
```

The final taxonomy will be refined during implementation-independent specification review.

---

# 17. Scalability Specification

Each browser edge instance should primarily operate on its own local state.

Therefore the dominant scaling model is:

```text
Browser 1 → local state
Browser 2 → local state
Browser 3 → local state
...
Browser N → local state
```

The architecture should avoid introducing unnecessary shared queues or centralized hot-path calculations.

The central system should primarily handle:

- policy distribution;
- durable execution state;
- lifecycle management;
- reconciliation;
- auditing;
- exceptional coordination.

The browser's high-frequency observation loop should remain local.

---

# 18. Observability Specification

The system must provide sufficient telemetry to reconstruct important decisions.

Important events include:

```text
Policy activated
Observation started
Snapshot created
Candidate generated
Policy feasible
Policy infeasible
Resolution applied
Behavior selected
Preflight passed
Preflight failed
Execution started
Execution confirmed
Execution failed
Execution uncertain
Reconciliation started
Reconciliation completed
Rebet transition
Policy changed
State recovery
```

Telemetry should capture the relevant identifiers:

```text
policyVersion
decisionId
executionId
sequenceId
timestamp
state
```

where applicable.

The goal is not to log every DOM mutation.

The goal is to make important state transitions reconstructable.

---

# 19. Core System Invariants

These are the most important part of the specification.

### Mathematical Integrity

**1. No mathematically invalid candidate may enter behavioral selection.**

**2. No behavioral function may expand the mathematical feasible space.**

**3. Every executed amount must belong to the executable monetary domain.**

---

### Policy Integrity

**4. A decision must be attributable to a specific policy version.**

**5. A superseded policy must not silently execute through an old decision.**

---

### Edge Autonomy

**6. Normal policy evaluation must not require a central round trip for every rapidly changing browser observation.**

**7. The browser may autonomously recompute decisions as local conditions change.**

---

### Execution Integrity

**8. A decision must pass final local validity checks immediately before execution.**

**9. An ambiguous external side effect must never be treated as confirmed failure.**

**10. An ambiguous external side effect must never be blindly repeated.**

---

### Rebet Integrity

**11. One logical rebet trigger can produce at most one rebet transition.**

**12. Rebet state must respect its configured limits.**

**13. Rebet is not inherently a loss-management mechanism.**

---

### Recovery Integrity

**14. Browser destruction must not corrupt durable execution identity.**

**15. Recovery must reconstruct or reconcile state rather than assume success or failure.**

---

# 20. Explicit Non-Goals for V1

The following are deliberately excluded unless later requirements demand them:

- sophisticated loss-based progression;
- Martingale-style strategies;
- centralized calculation of every browser observation;
- continuous odds streaming to Node;
- complex distributed leader election;
- unnecessary global synchronization;
- behavioral optimization for performance;
- premature Rust optimization;
- implementation-specific module architecture.

The first objective is **correct autonomous policy execution**, not maximum sophistication.

---

# 21. Fundamental Architectural Principle

The entire subsystem can ultimately be summarized as:

> **The persistent policy defines intent. The browser autonomously evaluates that intent against rapidly changing local reality. The mathematical layer defines what is permissible. The behavioral layer determines what is preferred. The browser performs the final validity check and execution. Durable infrastructure preserves identity, handles recovery, and reconciles ambiguous external effects.**
