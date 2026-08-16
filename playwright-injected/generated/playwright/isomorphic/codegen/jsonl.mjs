import { asLocator } from "../locatorGenerators.mjs";
import { expectSignalAction, toSignalMap } from "./language.mjs";
class JsonlLanguageGenerator {
  id = "jsonl";
  groupName = "";
  name = "JSONL";
  highlighter = "javascript";
  reset() {
  }
  generateAction(actionInContext, options) {
    const locator = actionInContext.action.selector ? JSON.parse(asLocator("jsonl", actionInContext.action.selector)) : void 0;
    const entry = {
      ...actionInContext.action,
      signals: actionInContext.signals,
      pageGuid: actionInContext.pageGuid,
      locator,
      ariaSnapshot: void 0
    };
    const lines = [JSON.stringify(entry)];
    const expect = toSignalMap(actionInContext).expect;
    if (options.generateExpectSignal && expect)
      lines.push(this.generateAction(expectSignalAction(actionInContext, expect), options));
    return lines.join("\n");
  }
  generateHeader(options) {
    return JSON.stringify(options);
  }
  generateFooter(saveStorage) {
    return "";
  }
}
export {
  JsonlLanguageGenerator
};

//# sourceMappingURL=jsonl.mjs.map
