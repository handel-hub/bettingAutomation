# Audit Evidence Standards

Version: 1.0

This document defines the minimum acceptable evidence required to support audit findings.

No finding shall be accepted without evidence.

--------------------------------------------------

# General Principles

Evidence must be:

• Relevant

• Reproducible

• Objective

• Traceable

• Verifiable

Evidence must originate from the implementation being audited.

Reasoning alone is never sufficient evidence.

--------------------------------------------------

# Evidence Categories

Evidence is classified into the following categories.

E1 — Source Code

Relevant implementation.

Examples

• Function implementation

• Class implementation

• Configuration

• Interface definition

--------------------------------------------------

E2 — Execution Trace

Evidence gathered by tracing execution.

Examples

• Call graph

• State transition sequence

• Timing sequence

• Lifecycle trace

--------------------------------------------------

E3 — Runtime Observation

Evidence observed while the system executes.

Examples

• Console logs

• Playwright traces

• Heap snapshots

• Flamegraphs

• CPU profiles

• Memory profiles

--------------------------------------------------

E4 — Static Analysis

Evidence obtained through structural inspection.

Examples

• Dependency graph

• Import graph

• Class hierarchy

• Complexity analysis

--------------------------------------------------

E5 — Mathematical Proof

Evidence derived from formal reasoning.

Examples

• Queue correctness

• DAG proof

• Complexity proof

• Invariant proof

--------------------------------------------------

E6 — Experimental Evidence

Evidence produced through controlled testing.

Examples

• Stress tests

• Concurrency tests

• Fault injection

• Recovery testing

--------------------------------------------------

# Minimum Evidence Requirements

Critical

Requires at least TWO independent evidence categories.

One must be runtime or experimental.

High

Requires at least TWO evidence categories.

Medium

Requires one strong evidence category.

Low

Requires source code evidence.

Informational

Source code reference is sufficient.

--------------------------------------------------

# Domain-Specific Evidence

Concurrency

Required

• Execution traces

• State mutation traces

• Lock analysis

• Race analysis

Synchronization

Required

• Timing diagrams

• Dependency graphs

• State transitions

Scheduler

Required

• Queue timelines

• Ordering proof

• TTL analysis

Memory

Required

• Heap snapshot

• Allocation path

• Object lifetime analysis

Performance

Required

• Flamegraph

• CPU profile

• Benchmark

Locator Engine

Required

• Resolution traces

• Candidate ranking

• Failure examples

Recovery

Required

• Recovery timeline

• Failure injection

• Retry analysis

--------------------------------------------------

# Unsupported Evidence

The following are NOT acceptable by themselves.

• Assumptions

• Speculation

• Personal opinion

• "Probably"

• "Likely"

• "Seems"

• "Could"

--------------------------------------------------

# Confidence Rules

Very High

Evidence reproduced.

High

Strong supporting evidence.

Medium

Evidence exists but incomplete.

Low

Evidence insufficient.

--------------------------------------------------

# Missing Evidence

If evidence cannot be obtained:

State:

• what evidence is missing

• why it is unavailable

• how confidence is affected

Never fabricate evidence.