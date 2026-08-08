import { PipelineStep } from '../engine/PipelineStep.mjs';
import { DataAttributeStrategy } from './strategies/DataAttributeStrategy.mjs';
import { TextStrategy } from './strategies/TextStrategy.mjs';
import { AriaStrategy } from './strategies/AriaStrategy.mjs';
import { RoleStrategy } from './strategies/RoleStrategy.mjs';
import { SemanticClassStrategy } from './strategies/SemanticClassStrategy.mjs';
import { StructuralStrategy } from './strategies/StructuralStrategy.mjs';
import { LocatorCandidate } from '../models/LocatorCandidate.mjs';

export class CandidateGenerator extends PipelineStep {
    constructor() {
        super('CandidateGenerator');
    }

    execute(context) {
        if (!context.features) return;
        
        let candidates = [];
        const strategies = [
            DataAttributeStrategy, TextStrategy, AriaStrategy, RoleStrategy, 
            SemanticClassStrategy, StructuralStrategy
        ];

        for (const strat of strategies) {
            try {
                candidates.push(...strat.generate(context.element, context.features));
            } catch (e) {
                console.warn(`[CandidateGenerator] Strategy ${strat.name} failed`, e);
            }
        }

        context.candidates = candidates;
    }

    executeFromSID(context, sid) {
        const candidates = [];
        let rank = 0;
        
        // DataAttribute strategy
        const testId = sid.semantic?.dataTestId;
        if (testId) {
            candidates.push(new LocatorCandidate({
                strategy: 'data-attribute',
                locator: `[data-testid="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(testId) : testId}"]`,
                rank: rank++,
                reason: 'data-testid from SID'
            }));
        }
        
        const dataAttrs = sid.element?.dataAttributes;
        if (dataAttrs) {
            for (const [key, val] of Object.entries(dataAttrs)) {
                if (key !== 'testid' && val) {
                    candidates.push(new LocatorCandidate({
                        strategy: 'data-attribute',
                        locator: `[data-${key}="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(val) : val}"]`,
                        rank: rank++,
                        reason: `data-${key} from SID`
                    }));
                }
            }
        }
        
        // Text strategy
        const textContent = sid.text?.exact;
        if (textContent && textContent.trim().length > 0 && textContent.trim().length < 100) {
            candidates.push(new LocatorCandidate({
                strategy: 'text',
                locator: `text="${textContent.trim()}"`,
                rank: rank++,
                reason: 'text from SID'
            }));
        }
        
        // Aria strategy
        const ariaLabel = sid.element?.ariaAttributes ? sid.element.ariaAttributes['aria-label'] : null;
        if (ariaLabel) {
            candidates.push(new LocatorCandidate({
                strategy: 'aria',
                locator: `[aria-label="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(ariaLabel) : ariaLabel}"]`,
                rank: rank++,
                reason: 'aria-label from SID'
            }));
        }
        
        // Role strategy
        const role = sid.element?.role || sid.semantic?.ariaRole;
        if (role) {
            let locStr = `role=${role}`;
            if (ariaLabel) {
                locStr = `${(sid.tagName || '').toLowerCase()}[role="${role}"][aria-label="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(ariaLabel) : ariaLabel}"]`;
            } else if (textContent && textContent.trim().length < 50) {
                locStr = `${(sid.tagName || '').toLowerCase()}[role="${role}"]`;
            }
            candidates.push(new LocatorCandidate({
                strategy: 'role',
                locator: locStr,
                rank: rank++,
                reason: 'role from SID'
            }));
        }
        
        // Structural fallback (cssSelector from SID)
        if (sid.cssSelector) {
            candidates.push(new LocatorCandidate({
                strategy: 'structural',
                locator: sid.cssSelector,
                rank: rank++,
                reason: 'cssSelector fallback from SID'
            }));
        }
        
        context.candidates = candidates;
    }
}
