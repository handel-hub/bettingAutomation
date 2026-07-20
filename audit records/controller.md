# BETTING AUTOMATION AUDIT SYSTEM CONTROLLER

This document is the single entry point into the Engineering Audit System.

It is responsible for initializing the audit environment, validating the current system state, selecting the appropriate operating framework, and executing exactly one lifecycle stage.

The Controller never performs an audit itself.

The Controller never performs a review itself.

The Controller selects the appropriate framework and transfers control.

--------------------------------------------------
COMMAND
--------------------------------------------------

A command will always be supplied.

Supported commands are

AUDIT

REVIEW

No other commands are valid.

--------------------------------------------------
INITIALIZATION
--------------------------------------------------

Before taking any action:

Read every governing document inside the audit records directory.

This includes but is not limited to

• architecture_inventory.md

• audit_blueprint.md

• audit_framework.md

• reviewer_framework.md

• audit_evidence_standards.md

• audit_scoring_rubric.md

• risk_register.md

• audit_state.json

• review_state.json

Treat these documents as the governing authority.

--------------------------------------------------
SYSTEM VALIDATION
--------------------------------------------------

Before continuing:

Validate the audit system.

Verify

• required documents exist

• state files are valid

• audit records are internally consistent

• completed reports exist

• review reports exist

• dependencies are satisfiable

If inconsistencies are discovered

STOP

Report every inconsistency.

--------------------------------------------------
COMMAND DISPATCH
--------------------------------------------------

If the command is

AUDIT

Then

Resolve the audit lifecycle.

If rejected audits require revision

perform the oldest required revision.

Otherwise

select the next eligible audit domain.

Transfer control completely to

audit_framework.md

Follow it exactly.

When the framework reaches its stop condition

STOP.

--------------------------------------------------

If the command is

REVIEW

Then

Locate the oldest completed audit that has not yet received a final review.

Transfer control completely to

reviewer_framework.md

Follow it exactly.

When the framework reaches its stop condition

STOP.

--------------------------------------------------
GENERAL RULES
--------------------------------------------------

Never execute both commands.

Never perform multiple lifecycle stages.

Never bypass dependency validation.

Never bypass state validation.

Never ignore framework instructions.

The Controller does not redefine framework behavior.

The framework documents remain authoritative.

--------------------------------------------------
STOP CONDITION
--------------------------------------------------

Immediately terminate when the selected framework terminates.