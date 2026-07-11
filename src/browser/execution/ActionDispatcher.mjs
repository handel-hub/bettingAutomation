import { logger } from '../../config.mjs';
import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
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
        
        this.sequenceFile = path.join(__dirname, '..', '..', '..', 'sequences', 'startup.json');
        this.actions = [];
        this.saveTimeout = null;

        if (fs.existsSync(this.sequenceFile)) {
            try { this.actions = JSON.parse(fs.readFileSync(this.sequenceFile, 'utf-8')); } catch(e) {}
        }

        process.on('SIGINT', () => this.flushSync());
        process.on('beforeExit', () => this.flushSync());
    }

    async injectMasterListeners(masterPage) {
        await masterPage.exposeFunction('dispatchExecutionEvent', async (eventData) => {
            logger.info(`[Master Dispatch] ${eventData.type}`);
            
            if (this.memorySettings.record_action_sequence === 'true') {
                this.recordAction(eventData);
            }

            const command = new Command({
                category: 'Execution',
                type: eventData.type,
                payload: eventData,
                source: 'Master Browser',
                executionMode: 'SLAVES_ONLY'
            });

            this.emit('Command', command);
        });

        await masterPage.addInitScript(() => {
            function getCssSelector(el) {
                if (!(el instanceof Element)) return;
                
                let current = el;
                let isBad = false;
                const adRegex = /(^|[\s_-])ad(s|v|vertisement|banner)?([\s_-]|$)/i;
                
                while (current && current !== document) {
                    if (current.tagName === 'IFRAME') {
                        isBad = true;
                        break;
                    }
                    const className = (typeof current.className === 'string') ? current.className : '';
                    const id = (typeof current.id === 'string') ? current.id : '';
                    
                    if (adRegex.test(className) || adRegex.test(id)) {
                        isBad = true;
                        break;
                    }
                    current = current.parentNode;
                }
                if (isBad) return null;
                
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
        this.actions.push(action);
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        
        this.saveTimeout = setTimeout(async () => {
            try {
                const dir = path.dirname(this.sequenceFile);
                if (!fs.existsSync(dir)) await fsPromises.mkdir(dir, { recursive: true });
                await fsPromises.writeFile(this.sequenceFile, JSON.stringify(this.actions, null, 2));
            } catch (err) {
                logger.error(`ActionDispatcher: Failed to flush sequence async: ${err.message}`);
            }
        }, 1000);
    }

    flushSync() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        if (this.actions.length > 0) {
            try {
                const dir = path.dirname(this.sequenceFile);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(this.sequenceFile, JSON.stringify(this.actions, null, 2));
            } catch (e) {
                console.error(`ActionDispatcher: Failed to flush sequence sync on exit: ${e.message}`);
            }
        }
    }
}
