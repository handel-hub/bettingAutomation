import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

export class CandidateValidator extends PipelineStep {
    constructor() {
        super('CandidateValidator');
    }

    execute(context) {
        if (!context.candidates || context.candidates.length === 0) return;

        for (const candidate of context.candidates) {
            const valStart = Date.now();
            let method = 'CSS';
            let status = 'PENDING';
            let matchCount = 0;
            let errors = [];

            // Simple syntax check
            if (!candidate.locator || typeof candidate.locator !== 'string') {
                status = 'INVALID';
                errors.push('Empty or invalid locator string');
            } else if (candidate.locator.startsWith('text=')) {
                // Pseudo-selector unsupported by native querySelectorAll
                method = 'Unsupported';
                status = 'NOT_VERIFIABLE';
            } else {
                try {
                    const matches = document.querySelectorAll(candidate.locator);
                    matchCount = matches.length;
                    
                    if (matchCount === 1) {
                        status = 'UNIQUE';
                    } else if (matchCount > 1) {
                        status = 'AMBIGUOUS';
                    } else {
                        status = 'MISSING';
                    }
                } catch (e) {
                    method = 'Unsupported'; // fallback if querySelectorAll fails (e.g. xpath/pseudo)
                    status = 'NOT_VERIFIABLE';
                    errors.push(e.message);
                }
            }

            candidate.validation.status = status;
            candidate.validation.matchCount = matchCount;
            candidate.validation.errors = errors;
            candidate.validation.method = method;
            candidate.validation.duration = Date.now() - valStart;
            
            candidate.telemetry.validatedAt = Date.now();
            TelemetryCollector.recordValidation(status);
        }
    }
}
