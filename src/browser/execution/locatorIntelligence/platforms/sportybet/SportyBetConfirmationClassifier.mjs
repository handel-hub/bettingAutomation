export class SportyBetConfirmationClassifier {
    execute(context) {
        if (!context || !context.element) return context;
        
        // Ensure platform object exists
        if (!context.platform) {
            context.platform = {};
        }

        const features = context.features || {};

        // Platform-specific technical debt for SportyBet Confirmations
        // These signals are explicitly SportyBet-specific heuristics.
        const isConfirm = 
            features.dataAttributes?.['data-op'] === 'betslip-confirm' ||
            (features.tagName === 'BUTTON' && features.text?.toLowerCase().includes('confirm') && features.classes?.includes('m-btn'));

        if (isConfirm) {
            context.platform.classification = 'SPORTYBET_CONFIRMATION';
            context.platform.confidence = 0.95;
            context.schedulingDirective = 'CRITICAL';
        }

        return context;
    }
}
