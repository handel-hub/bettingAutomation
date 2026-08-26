# Amount, Pricing & Edge-Compute Behavioral and State Specification

## 1. Purpose and Scope

The Amount, Pricing & Edge-Compute subsystem determines **how much should be staked for a particular betting opportunity**, given the user's policy, the currently observed market state, platform constraints, previous execution state, and human-oriented behavioral preferences.

The subsystem is not merely an amount calculator.

It is a distributed decision system composed of:

- persistent policy;
- browser-side observation;
- mathematical feasibility;
- infeasibility resolution;
- behavioral selection;
- decision creation;
- execution authorization;
- execution;
- failure handling;
- reconciliation;
- and rebet progression.

Its fundamental purpose is to transform:

> **User intent + current observable market state**

into:

> **One valid, executable, policy-compliant stake decision.**

The architecture deliberately separates **what the user wants**, **what is mathematically possible**, and **which mathematically valid amount is preferable**.

The browser acts as an **edge-compute node** because market information such as odds, balance, availability, and platform constraints can change continuously. It is therefore undesirable to transmit every observation to the Execution Plane merely to perform simple calculations.

The browser is consequently permitted to maintain an autonomous local decision loop.

However, autonomy does not imply authority.

The Execution Plane remains authoritative over long-lived execution state, execution sequencing, rebet state, authorization, and reconciliation.

---

# 2. Core Architectural Principles

The subsystem is governed by several principles.

### 2.1 Policy is persistent intent

The user's configuration represents what the user wants the system to attempt.

It is not itself the current execution state.

Policy is persisted outside the browser and is versioned.

### 2.2 Observation is ephemeral

Market conditions are continuously changing.

Examples include:

- odds;
- available stake limits;
- current balance;
- market availability;
- selection availability;
- platform-imposed limits.

These belong to the current browser observation.

They are not persistent policy.

### 2.3 Mathematical feasibility precedes behavior

The system first determines what amounts are mathematically valid.

Only after that may behavioral functions select among valid candidates.

Therefore:

> **Behavior can rank valid candidates, but behavior cannot create validity.**

### 2.4 Edge computation is autonomous

The browser does not need to continuously ask the Execution Plane:

> "The odds changed. What should I calculate?"

Instead, the browser observes the market and evaluates the locally available policy.

The Execution Plane becomes involved at defined authority boundaries.

### 2.5 Execution authority remains centralized

The browser can calculate a decision, but it cannot unilaterally redefine:

- policy;
- policy version;
- rebet count;
- execution sequence;
- authorization;
- reconciliation state.

### 2.6 A browser crash cannot imply execution failure

Once execution has begun, absence of confirmation does not prove that the bet failed.

This distinction is fundamental.

---

# 3. Terminology

### Policy

The persistent user-defined rules controlling amount calculation and execution behavior.

### Observation

The current state extracted from the browser/platform.

### Candidate

A stake amount mathematically permitted by the current policy and observed constraints.

### Feasible Set

The complete set of stake amounts satisfying all mathematical constraints.

### Behavioral Function

A deterministic preference function that ranks or transforms the ordering of already-valid candidates.

### Decision

The selected candidate plus the observations and policy information from which it was derived.

### Decision Snapshot

An immutable representation of the decision context at the time the decision was produced.

### Execution Sequence

A uniquely identifiable execution attempt controlled by the Execution Plane.

### Uncertain Execution

A state in which execution may have occurred but the system lacks sufficient evidence to determine whether it succeeded.

### Reconciliation

The process of determining the actual platform outcome after an uncertain execution.

### Settlement

The eventual outcome of a placed bet, particularly relevant when the result is unavailable immediately.

---

# 4. Technology and Execution Model

The subsystem is designed around three logical layers.

## Control Plane

Responsible for persistent user intent and configuration.

It owns:

- policies;
- policy versions;
- configuration persistence;
- user authorization;
- configuration updates.

The Control Plane does not continuously participate in browser decision-making.

## Execution Plane

Responsible for authoritative execution coordination.

It owns:

- execution sequences;
- execution authorization;
- rebet counters;
- long-lived execution state;
- uncertain execution state;
- reconciliation;
- settlement lifecycle;
- policy-version validation.

## Browser Edge

Responsible for low-latency market interaction.

It owns the ephemeral computation necessary to react quickly to the platform.

It performs:

- observation;
- candidate calculation;
- feasibility analysis;
- behavioral selection;
- pre-flight verification;
- DOM interaction;
- immediate execution-state observation.

The browser does **not** need to report every observation to the Execution Plane.

This autonomy is an intentional architectural property.

---

# 5. Policy Model

A policy expresses the user's desired staking behavior.

The policy should contain only durable intent.

It should not contain transient browser state such as:

- current odds;
- current balance;
- current candidate set;
- current DOM state.

A policy is versioned.

For example:

```text
Policy v17
```

When the policy changes:

```text
Policy v17 → Policy v18
```

Existing decisions generated under v17 remain identifiable as v17 decisions.

The Execution Plane must never silently treat a v17 decision as if it had been generated under v18.

---

# 6. Observation Model

The browser continuously observes relevant platform state.

The observation may include:

- current odds;
- current available balance;
- current platform minimum;
- current platform maximum;
- available stake increment;
- market availability;
- selection availability;
- currency;
- current account state;
- current betting interface state;
- relevant DOM values;
- relevant execution controls.

Observations are ephemeral.

The browser may continuously update them without sending every change to the Execution Plane.

The observation used for a decision must be captured as part of the decision snapshot.

---

# 7. Mathematical Feasibility Model

The mathematical layer answers one question:

> **Which stake amounts are actually valid right now?**

It must not concern itself with whether a number "looks nice".

Suppose:

- `S_min` = effective minimum stake
- `S_max` = effective maximum stake
- `P_target` = desired profit
- `O` = current odds

For a simple fixed-profit model:

```text
profit = stake × (odds - 1)
```

The mathematical solver determines the stake values satisfying the active constraints.

The important distinction is that the solver must operate over the **actual discrete domain supported by the platform**, not merely produce a continuous mathematical interval.

For example, if a platform accepts only increments of ₦10, then:

```text
500
510
520
...
```

are valid candidate points, while arbitrary fractional values are not.

The solver therefore produces:

> **a discrete feasible candidate set.**

---

# 8. Feasibility Resolution

Mathematical infeasibility must not silently result in:

> "No bet."

Instead, the system explicitly recognizes that the requested policy may be impossible under the current market conditions.

For example:

```text
Requested profit: ₦5,000
Maximum stake:    ₦1,000
Current odds:     1.20
```

The requested profit may be impossible.

The system therefore enters an infeasibility-resolution phase.

Possible resolution strategies include:

### Clamp

Move the desired value toward the closest achievable valid value.

### Reduce Profit Requirement

Relax the desired profit requirement while respecting the policy's minimum acceptable floor.

### Alert

Notify the user that the requested policy cannot currently be satisfied.

The system must never silently invent a new objective.

---

# 9. Mathematical Safety Boundary

The feasibility resolver must preserve the mathematical safety boundary.

A resolution strategy may modify the objective only according to explicitly defined policy.

It may not:

- exceed maximum stake;
- violate minimum stake;
- violate platform increments;
- produce an invalid currency value;
- produce an impossible profit;
- bypass platform restrictions.

Most importantly:

> **An infeasible policy must never be converted into an apparently valid decision by violating a hard constraint.**

---

# 10. Behavioral Function Model

Once the mathematical solver produces valid candidates, the behavioral layer begins.

This layer exists because:

> mathematically valid does not necessarily mean humanly desirable.

For example:

```text
₦12,500
```

and

```text
₦13,591
```

may be mathematically equivalent from the solver's perspective, while being psychologically or operationally different to a user.

Behavioral functions therefore express preferences such as:

- round numbers;
- preferred denominations;
- smooth progression;
- proximity to previous stakes;
- avoidance of awkward values;
- account-specific preferences;
- controlled variation;
- preferred increments.

The behavioral layer ranks candidates.

It cannot manufacture new candidates.

Thus:

```text
Feasible candidates
        ↓
Behavioral ranking
        ↓
Preferred candidate
```

not:

```text
Mathematical result
        ↓
Behavior changes number
        ↓
Maybe mathematically valid
```

---

# 11. Candidate Selection

Candidate selection must be deterministic.

Given identical:

- policy version;
- observation;
- mathematical constraints;
- behavioral configuration;

the same candidate should be selected.

If multiple candidates have equal behavioral scores, a deterministic tie-breaker must exist.

Possible tie-breakers include:

1. preferred lower stake;
2. preferred higher stake;
3. proximity to previous stake;
4. deterministic candidate ordering.

Random selection should not be used unless explicitly introduced as a policy feature.

---

# 12. Decision Snapshot

Once a candidate has been selected, the browser creates an immutable Decision Snapshot.

The snapshot should contain sufficient information to reconstruct why the decision was produced.

Conceptually:

```text
Decision
├── decision_id
├── policy_version
├── execution_sequence_id
├── observation
├── effective_constraints
├── feasible_candidate
├── behavioral_selection
├── selected_stake
└── creation metadata
```

The snapshot is not the source of truth for long-lived execution state.

It is evidence of:

> **what the browser believed was valid when it made the decision.**

---

# 13. Browser Edge State Machine

The browser's state machine is intentionally short-lived.

A conceptual lifecycle is:

```text
IDLE
  ↓
OBSERVING
  ↓
EVALUATING
  ↓
RESOLVING
  ↓
SELECTING
  ↓
READY
  ↓
EXECUTING
  ↓
SUBMITTED
```

The browser should not be responsible for holding a sports bet's lifecycle for hours or days.

Its responsibility ends around submission/confirmation.

Long-lived settlement belongs elsewhere.

---

# 14. Execution Plane State Machine

The Execution Plane owns the durable execution lifecycle.

Conceptually:

```text
CREATED
   ↓
AUTHORIZED
   ↓
EXECUTING
   ↓
CONFIRMED
   ↓
AWAITING_SETTLEMENT
   ↓
SETTLED
   ↓
REBATING / NEXT_SEQUENCE
```

If execution becomes ambiguous:

```text
EXECUTING
    ↓
UNCERTAIN
    ↓
RECONCILING
    ↓
CONFIRMED
```

or:

```text
RECONCILING
    ↓
FAILED
```

depending on what the platform proves.

---

# 15. Execution Authorization

The browser's decision is not automatically authorization to execute.

The Execution Plane validates the execution request.

At minimum it validates:

- policy version;
- execution sequence;
- identity;
- authorization;
- candidate validity;
- current execution state;
- rebet state;
- duplicate execution protection.

The Execution Plane may perform a lightweight mathematical verification of the selected candidate before authorization.

This protects against a compromised or malfunctioning browser.

---

# 16. Pre-Flight Validation

There is a critical temporal gap between:

```text
Observation
```

and:

```text
Execution
```

Odds may change during that interval.

Therefore, immediately before the actual DOM interaction, the browser performs a pre-flight validation.

Conceptually:

```text
Decision Snapshot
       ↓
Current DOM
       ↓
Compare relevant state
       ↓
Match?
 ┌─────┴─────┐
YES         NO
 ↓           ↓
Execute    Re-evaluate
```

The browser must not blindly execute an old decision against a changed market.

---

# 17. Execution Semantics

Execution is considered to have begun at the point where the browser performs the actual platform interaction that can cause the bet to be submitted.

Before that point, the system may safely discard and regenerate the decision.

After that point, uncertainty becomes possible.

This creates an important boundary:

```text
BEFORE EXECUTION
→ decision may be discarded

DURING EXECUTION
→ outcome may become uncertain

AFTER CONFIRMATION
→ execution outcome is known
```

---

# 18. Uncertain Execution

`UNCERTAIN` is not equivalent to `FAILED`.

If the browser crashes immediately after clicking the submit button, the system cannot infer:

```text
Crash = bet failed
```

Nor:

```text
Crash = bet succeeded
```

The only correct conclusion is:

```text
Outcome unknown
```

The Execution Plane therefore freezes the relevant execution sequence.

No automatic retry should occur until reconciliation determines the actual platform state.

This is the primary defense against duplicate betting.

---

# 19. Reconciliation

Reconciliation determines the actual state of the platform after uncertainty.

Possible evidence includes:

- bet history;
- balance changes;
- transaction history;
- platform confirmation;
- active bet records;
- other platform-visible evidence.

The purpose is not merely to detect failure.

It is to answer:

> **Did the intended execution actually happen?**

Only after reconciliation can the sequence resume.

---

# 20. Settlement Lifecycle

For long-running events, settlement is deliberately separated from browser lifetime.

The browser may submit a bet and disappear.

The Execution Plane can retain:

```text
execution_sequence
policy_version
selected_stake
platform_reference
settlement_status
rebet_state
```

for as long as necessary.

This prevents a browser lifecycle event from destroying the logical betting lifecycle.

---

# 21. Policy and Version Consistency

Every decision carries a policy version.

Suppose:

```text
Decision → Policy v17
Current Policy → v18
```

The Execution Plane must not execute the v17 decision as though it were v18.

It must reject or invalidate the stale decision.

The browser then returns to observation and evaluates the new policy.

This prevents configuration changes from racing with execution.

---

# 22. Concurrency and Idempotency

Every execution sequence must have a unique identity.

Execution requests must be idempotent.

If the same execution request arrives twice:

```text
execution_id = X
```

the Execution Plane must recognize that `X` has already been processed.

Likewise, settlement and rebet transitions must be idempotent.

A duplicate settlement event must not cause:

```text
Rebet #3
Rebet #3
```

instead of:

```text
Rebet #3
```

---

# 23. Failure and Recovery Semantics

The system must explicitly define behavior for:

### Market disappears

Return to observation.

### Odds change

Invalidate the current decision and reevaluate.

### Policy changes

Invalidate decisions generated under the old policy where appropriate.

### Platform rejects stake

Capture the platform constraint and reevaluate.

### Browser crashes before execution

Discard the ephemeral decision.

### Browser crashes during execution

Enter `UNCERTAIN`.

### Execution Plane crashes

Recover authoritative sequence state before allowing execution to continue.

### Communication disappears

Do not infer execution outcome merely from communication loss.

### Duplicate event

Process idempotently.

### Reconciliation fails

Keep execution suspended rather than guessing.

---

# 24. Observability Requirements

Every important decision should be traceable.

At minimum, the system should allow reconstruction of:

```text
Policy
   ↓
Observation
   ↓
Mathematical constraints
   ↓
Feasible candidates
   ↓
Resolution
   ↓
Behavior ranking
   ↓
Selected candidate
   ↓
Authorization
   ↓
Execution
   ↓
Outcome
```

Important identifiers include:

- policy version;
- decision ID;
- execution sequence ID;
- execution attempt ID;
- browser/session identity;
- reconciliation ID.

This is particularly important because the browser is performing autonomous computation.

Autonomy without observability becomes impossible to debug.

---

# 25. Security and Authority Boundaries

The browser is an execution edge, not the ultimate authority.

The browser must not be trusted to decide:

- whether a policy version is current;
- whether a user is authorized;
- whether a rebet is permitted;
- how many rebets have occurred;
- whether an uncertain execution succeeded;
- whether a sequence is complete.

The Execution Plane must own those decisions.

The browser may provide evidence and computation.

The Execution Plane provides authority.

The Control Plane provides persistent user intent and authorization context.

This establishes:

```text
Control Plane
    = Policy authority

Execution Plane
    = Execution authority

Browser
    = Observation + edge computation + physical execution
```

---

# 26. Scalability and Acceptance Requirements

The system must scale without requiring every browser observation to pass through the Execution Plane.

The expected architecture is:

```text
Browser 1
 ├── observation
 ├── calculation
 └── decision

Browser 2
 ├── observation
 ├── calculation
 └── decision

Browser 3
 ├── observation
 ├── calculation
 └── decision

          ↓

    Execution Plane
          ↓
   authoritative control
```

Each browser performs its computational work independently.

The Execution Plane should therefore primarily experience traffic around **decision/execution boundaries**, rather than raw DOM observation.

For the initial target, the system should be tested progressively:

```text
1 browser
→ 2
→ 3
→ 5
→ 10
```

At every stage, verify:

- decision correctness;
- execution correctness;
- latency;
- queue behavior;
- memory;
- CPU;
- IPC;
- duplicate prevention;
- policy consistency;
- recovery behavior;
- reconciliation;
- state convergence.

The architectural acceptance criterion is not merely:

> "It can run ten browsers."

It is:

> **Ten independent edge-compute nodes can continuously observe and calculate without creating unacceptable contention in the authoritative execution path.**

---

# Core Invariants

The entire specification ultimately reduces to these invariants:

1. **Invalid mathematical candidates can never reach behavioral selection.**

2. **Behavioral functions may rank valid candidates but may never make an invalid candidate valid.**

3. **A decision generated under policy version N cannot execute under an incompatible policy version.**

4. **The browser must validate relevant market state immediately before execution.**

5. **Loss of communication during execution does not imply execution failure.**

6. **An uncertain execution must be reconciled before retry.**

7. **Rebet state cannot be reset merely because a browser disappears.**

8. **Long-lived settlement state cannot depend on browser lifetime.**

9. **Execution requests must be idempotent.**

10. **The browser may compute autonomously, but authoritative execution state remains outside the browser.**

11. **The Execution Plane must never blindly trust browser-produced policy or authorization claims.**

12. **Identical policy + identical observation + identical constraints must produce a deterministic decision.**

13. **The system must never silently violate a hard stake constraint merely to satisfy a soft profit objective.**

14. **Infeasibility must be explicitly observable and resolved according to policy.**

15. **The system must preserve enough decision evidence to explain why an amount was selected.**

---
