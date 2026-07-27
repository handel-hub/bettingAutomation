const fs = require('fs');
const file = 'src/browser/execution/ActionSimulator.mjs';
let content = fs.readFileSync(file, 'utf8');

// Update method signature
content = content.replace(
    /_executeWithRecovery\(command, page, interactionType, actionFn, browserObj = null, deadlineBudget = null\)/g,
    '_executeWithRecovery(command, page, interactionType, actionFn, browserObj = null, deadlineBudget = null, executionContext = null)'
);

// Update calls to pass options.executionContext
content = content.replace(/deadlineBudget\);/g, 'deadlineBudget, options.executionContext);');

// Update resolveOpts to include executionContext
content = content.replace(
    /commandId: command\.id,\n\s*interactionId: command\.payload\?\.interactionId\n\s*\};/,
    'commandId: command.id,\n                interactionId: command.payload?.interactionId,\n                executionContext\n            };'
);

fs.writeFileSync(file, content);
