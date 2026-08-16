import { asLocator } from "../isomorphic/locatorGenerators.mjs";
import { getByAltTextSelector, getByLabelSelector, getByPlaceholderSelector, getByRoleSelector, getByTestIdSelector, getByTextSelector, getByTitleSelector } from "../isomorphic/locatorUtils.mjs";
import { escapeForTextSelector } from "../isomorphic/stringUtils.mjs";
const selectorSymbol = /* @__PURE__ */ Symbol("selector");
class Locator {
  [selectorSymbol];
  element;
  elements;
  constructor(injectedScript, selector, options) {
    if (options?.hasText)
      selector += ` >> internal:has-text=${escapeForTextSelector(options.hasText, false)}`;
    if (options?.hasNotText)
      selector += ` >> internal:has-not-text=${escapeForTextSelector(options.hasNotText, false)}`;
    if (options?.has)
      selector += ` >> internal:has=` + JSON.stringify(options.has[selectorSymbol]);
    if (options?.hasNot)
      selector += ` >> internal:has-not=` + JSON.stringify(options.hasNot[selectorSymbol]);
    if (options?.visible !== void 0)
      selector += ` >> visible=${options.visible ? "true" : "false"}`;
    this[selectorSymbol] = selector;
    if (selector) {
      const parsed = injectedScript.parseSelector(selector);
      this.element = injectedScript.querySelector(parsed, injectedScript.document, false);
      this.elements = injectedScript.querySelectorAll(parsed, injectedScript.document);
    }
    const selectorBase = selector;
    const self = this;
    self.locator = (selector2, options2) => {
      return new Locator(injectedScript, selectorBase ? selectorBase + " >> " + selector2 : selector2, options2);
    };
    self.getByTestId = (testId) => self.locator(getByTestIdSelector(injectedScript.testIdAttributeNameForStrictErrorAndConsoleCodegen(), testId));
    self.getByAltText = (text, options2) => self.locator(getByAltTextSelector(text, options2));
    self.getByLabel = (text, options2) => self.locator(getByLabelSelector(text, options2));
    self.getByPlaceholder = (text, options2) => self.locator(getByPlaceholderSelector(text, options2));
    self.getByText = (text, options2) => self.locator(getByTextSelector(text, options2));
    self.getByTitle = (text, options2) => self.locator(getByTitleSelector(text, options2));
    self.getByRole = (role, options2 = {}) => self.locator(getByRoleSelector(role, options2));
    self.filter = (options2) => new Locator(injectedScript, selector, options2);
    self.first = () => self.locator("nth=0");
    self.last = () => self.locator("nth=-1");
    self.nth = (index) => self.locator(`nth=${index}`);
    self.and = (locator) => new Locator(injectedScript, selectorBase + ` >> internal:and=` + JSON.stringify(locator[selectorSymbol]));
    self.or = (locator) => new Locator(injectedScript, selectorBase + ` >> internal:or=` + JSON.stringify(locator[selectorSymbol]));
  }
}
class ConsoleAPI {
  _injectedScript;
  constructor(injectedScript) {
    this._injectedScript = injectedScript;
  }
  install() {
    if (this._injectedScript.window.playwright)
      return;
    this._injectedScript.window.playwright = {
      $: (selector, strict) => this._querySelector(selector, !!strict),
      $$: (selector) => this._querySelectorAll(selector),
      inspect: (selector) => this._inspect(selector),
      selector: (element) => this._selector(element),
      generateLocator: (element, language) => this._generateLocator(element, language),
      ariaSnapshot: (element, options) => {
        return this._injectedScript.ariaSnapshot(element || this._injectedScript.document.body, options || { mode: "default" });
      },
      resume: () => this._resume(),
      ...new Locator(this._injectedScript, "")
    };
    delete this._injectedScript.window.playwright.filter;
    delete this._injectedScript.window.playwright.first;
    delete this._injectedScript.window.playwright.last;
    delete this._injectedScript.window.playwright.nth;
    delete this._injectedScript.window.playwright.and;
    delete this._injectedScript.window.playwright.or;
  }
  _querySelector(selector, strict) {
    if (typeof selector !== "string")
      throw new Error(`Usage: playwright.query('Playwright >> selector').`);
    const parsed = this._injectedScript.parseSelector(selector);
    return this._injectedScript.querySelector(parsed, this._injectedScript.document, strict);
  }
  _querySelectorAll(selector) {
    if (typeof selector !== "string")
      throw new Error(`Usage: playwright.$$('Playwright >> selector').`);
    const parsed = this._injectedScript.parseSelector(selector);
    return this._injectedScript.querySelectorAll(parsed, this._injectedScript.document);
  }
  _inspect(selector) {
    if (typeof selector !== "string")
      throw new Error(`Usage: playwright.inspect('Playwright >> selector').`);
    this._injectedScript.window.inspect(this._querySelector(selector, false));
  }
  _selector(element) {
    if (!(element instanceof Element))
      throw new Error(`Usage: playwright.selector(element).`);
    return this._injectedScript.generateSelectorSimple(element);
  }
  _generateLocator(element, language) {
    if (!(element instanceof Element))
      throw new Error(`Usage: playwright.locator(element).`);
    const selector = this._injectedScript.generateSelectorSimple(element);
    return asLocator(language || "javascript", selector);
  }
  _resume() {
    if (!this._injectedScript.window.__pw_resume)
      return false;
    this._injectedScript.window.__pw_resume().catch(() => {
    });
  }
}
export {
  ConsoleAPI
};

//# sourceMappingURL=consoleApi.mjs.map
