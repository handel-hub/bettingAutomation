import { logger } from '../../config.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EventEmitter from 'node:events';
import { Command } from './Command.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ActionDispatcher extends EventEmitter {
    constructor(settings) {
        super();
        this.memorySettings = settings.Memory || {};
    }

    async injectMasterListeners(masterPage) {
        await masterPage.exposeFunction('dispatchExecutionEvent', async (eventData) => {
            logger.info(`[Master Dispatch] ${eventData.type}`);
            
            if (this.memorySettings.record_action_sequence === 'true') {
                this.recordAction(eventData);
            }

            const command = new Command({
                type: eventData.type,
                payload: eventData,
                source: 'Master Browser',
                executionMode: 'SLAVES_ONLY'
            });

            this.emit('ExecutionRequested', command);
        });

        await masterPage.addInitScript(() => {
            function getCssSelector(el) {
                if (!(el instanceof Element)) return;
                let path = [];
                while (el.nodeType === Node.ELEMENT_NODE) {
                    let selector = el.nodeName.toLowerCase();
                    if (el.id) {
                        selector += '#' + el.id;
                        path.unshift(selector);
                        break;
                    } else {
                        let sib = el, nth = 1;
                        while (sib = sib.previousElementSibling) {
                            if (sib.nodeName.toLowerCase() == selector) nth++;
                        }
                        if (nth != 1) selector += ":nth-of-type("+nth+")";
                    }
                    path.unshift(selector);
                    el = el.parentNode;
                }
                return path.join(" > ");
            }

            document.addEventListener('click', (e) => {
                const selector = getCssSelector(e.target);
                if (selector) window.dispatchExecutionEvent({ type: 'click', selector });
            }, true);

            document.addEventListener('input', (e) => {
                const selector = getCssSelector(e.target);
                if (selector) window.dispatchExecutionEvent({ type: 'input', selector, value: e.target.value });
            }, true);
        });
    }

    recordAction(action) {
        const sequenceFile = path.join(__dirname, '..', '..', '..', 'sequences', 'startup.json');
        let actions = [];
        if (fs.existsSync(sequenceFile)) {
            try { actions = JSON.parse(fs.readFileSync(sequenceFile, 'utf-8')); } catch(e) {}
        }
        actions.push(action);
        const dir = path.dirname(sequenceFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(sequenceFile, JSON.stringify(actions, null, 2));
    }
}
