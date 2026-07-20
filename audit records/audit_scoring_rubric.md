# Audit Scoring Rubric

Version: 1.0

This document standardizes reviewer scoring.

Every review shall use the same scoring model.

Maximum Score: 100

--------------------------------------------------

# Coverage

20 Points

Questions

Were all required files examined?

Were all execution paths covered?

Were dependencies examined?

--------------------------------------------------

# Technical Accuracy

15 Points

Questions

Are conclusions technically correct?

Are claims supported?

--------------------------------------------------

# Evidence Quality

20 Points

Questions

Is every finding evidenced?

Is evidence reproducible?

--------------------------------------------------

# Architectural Reasoning

10 Points

Questions

Does the audit understand architectural intent?

Does it evaluate consistency?

--------------------------------------------------

# Failure Analysis

10 Points

Questions

Were failure paths explored?

Recovery paths?

Timeouts?

--------------------------------------------------

# Concurrency Analysis

10 Points

Questions

Race conditions?

Deadlocks?

Ordering?

State corruption?

--------------------------------------------------

# Maintainability

5 Points

Questions

Extensibility?

Coupling?

Complexity?

--------------------------------------------------

# Performance

5 Points

Questions

CPU

Memory

Latency

Scalability

--------------------------------------------------

# Production Readiness

5 Points

Questions

Can the subsystem safely run in production?

--------------------------------------------------

# Documentation Quality

5 Points

Questions

Organization

Clarity

Completeness

--------------------------------------------------

# Score Interpretation

95–100

Exceptional

Production Certification Quality

90–94

Excellent

Minor improvements only

80–89

Good

Approve with revisions

70–79

Fair

Major revisions

Below 70

Reject

--------------------------------------------------

# Severity Calibration

Critical

Production failure

Security failure

Data corruption

Deadlock

High

Incorrect behavior

Reliability issue

Performance collapse

Medium

Maintainability

Scalability

Design weakness

Low

Minor issue

Code smell

Documentation

Informational

Observation only

--------------------------------------------------

# Confidence Calibration

Very High

Confirmed by evidence

High

Strong evidence

Medium

Partial evidence

Low

Weak evidence