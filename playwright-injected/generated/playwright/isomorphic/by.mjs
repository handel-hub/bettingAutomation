import { getByAltTextSelector, getByLabelSelector, getByPlaceholderSelector, getByRoleSelector, getByTestIdSelector, getByTextSelector, getByTitleSelector } from "./locatorUtils.mjs";
import { escapeForTextSelector } from "./stringUtils.mjs";
class ByImpl {
  _build;
  constructor(build) {
    this._build = build;
  }
  _append(build) {
    return new ByImpl((testIdAttributeName) => {
      const parent = this._build(testIdAttributeName);
      const child = build(testIdAttributeName);
      return parent ? `${parent} >> ${child}` : child;
    });
  }
  altText(text, options) {
    return this._append(() => getByAltTextSelector(text, options));
  }
  and(by2) {
    return this._append((name) => `internal:and=` + JSON.stringify(resolveBy(by2, name)));
  }
  describe(description) {
    return this._append(() => `internal:describe=` + JSON.stringify(description));
  }
  filter(options) {
    let result = this;
    if (options?.hasText)
      result = result._append(() => `internal:has-text=${escapeForTextSelector(options.hasText, false)}`);
    if (options?.hasNotText)
      result = result._append(() => `internal:has-not-text=${escapeForTextSelector(options.hasNotText, false)}`);
    if (options?.has)
      result = result._append((name) => `internal:has=` + JSON.stringify(resolveBy(options.has, name)));
    if (options?.hasNot)
      result = result._append((name) => `internal:has-not=` + JSON.stringify(resolveBy(options.hasNot, name)));
    if (options?.visible !== void 0)
      result = result._append(() => `visible=${options.visible ? "true" : "false"}`);
    return result;
  }
  first() {
    return this.nth(0);
  }
  get(selectorOrBy) {
    return this._append((name) => typeof selectorOrBy === "string" ? selectorOrBy : resolveBy(selectorOrBy, name));
  }
  label(text, options) {
    return this._append(() => getByLabelSelector(text, options));
  }
  last() {
    return this.nth(-1);
  }
  nth(index) {
    return this._append(() => `nth=${index}`);
  }
  or(by2) {
    return this._append((name) => `internal:or=` + JSON.stringify(resolveBy(by2, name)));
  }
  placeholder(text, options) {
    return this._append(() => getByPlaceholderSelector(text, options));
  }
  role(role, options) {
    return this._append(() => getByRoleSelector(role, options));
  }
  testId(testId) {
    return this._append((name) => getByTestIdSelector(name, testId));
  }
  text(text, options) {
    return this._append(() => getByTextSelector(text, options));
  }
  title(text, options) {
    return this._append(() => getByTitleSelector(text, options));
  }
}
const by = new ByImpl(() => "");
function resolveBy(by2, testIdAttributeName) {
  const selector = by2._build(testIdAttributeName);
  if (!selector)
    throw new Error(`Empty "by" locator. Start with one of by.role(), by.text(), by.testId() and friends.`);
  return selector;
}
export {
  by,
  resolveBy
};

//# sourceMappingURL=by.mjs.map
