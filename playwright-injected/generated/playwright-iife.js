var __PlaywrightExports = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // playwright-injected/generated/playwright-bundle.js
  var playwright_bundle_exports = {};
  __export(playwright_bundle_exports, {
    AtKeywordToken: () => AtKeywordToken,
    BadStringToken: () => BadStringToken,
    BadURLToken: () => BadURLToken,
    BidiInsertTextInstaller: () => BidiInsertTextInstaller,
    BindingsController: () => BindingsController,
    CDCToken: () => CDCToken,
    CDOToken: () => CDOToken,
    CSSParserToken: () => CSSParserToken,
    CSharpLocatorFactory: () => CSharpLocatorFactory,
    ClockController: () => ClockController,
    CloseCurlyToken: () => CloseCurlyToken,
    CloseParenToken: () => CloseParenToken,
    CloseSquareToken: () => CloseSquareToken,
    ColonToken: () => ColonToken,
    ColumnToken: () => ColumnToken,
    CommaToken: () => CommaToken,
    ConsoleAPI: () => ConsoleAPI,
    DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT: () => DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT,
    DEFAULT_PLAYWRIGHT_TIMEOUT: () => DEFAULT_PLAYWRIGHT_TIMEOUT,
    DashMatchToken: () => DashMatchToken,
    DelimToken: () => DelimToken,
    DimensionToken: () => DimensionToken,
    EOFToken: () => EOFToken,
    FunctionToken: () => FunctionToken,
    GroupingToken: () => GroupingToken,
    HashToken: () => HashToken,
    Highlight: () => Highlight,
    IdentToken: () => IdentToken,
    IncludeMatchToken: () => IncludeMatchToken,
    InjectedScript: () => InjectedScript,
    InvalidCharacterError: () => InvalidCharacterError,
    InvalidSelectorError: () => InvalidSelectorError,
    JavaLocatorFactory: () => JavaLocatorFactory,
    JavaScriptLocatorFactory: () => JavaScriptLocatorFactory,
    JsonlLocatorFactory: () => JsonlLocatorFactory,
    KeyParser: () => KeyParser,
    LRUCache: () => LRUCache,
    LongStandingScope: () => LongStandingScope,
    ManualPromise: () => ManualPromise,
    MultiMap: () => MultiMap,
    NumberToken: () => NumberToken,
    OpenCurlyToken: () => OpenCurlyToken,
    OpenParenToken: () => OpenParenToken,
    OpenSquareToken: () => OpenSquareToken,
    PW_SOURCE_DATE: () => PW_SOURCE_DATE,
    PW_SOURCE_HASH: () => PW_SOURCE_HASH,
    ParserError: () => ParserError,
    PercentageToken: () => PercentageToken,
    PrefixMatchToken: () => PrefixMatchToken,
    PythonLocatorFactory: () => PythonLocatorFactory,
    SelectorEvaluatorImpl: () => SelectorEvaluatorImpl,
    Semaphore: () => Semaphore,
    SemicolonToken: () => SemicolonToken,
    SnapshotServer: () => SnapshotServer,
    SnapshotStorage: () => SnapshotStorage,
    StorageScript: () => StorageScript,
    StringToken: () => StringToken,
    StringValuedToken: () => StringValuedToken,
    SubstringMatchToken: () => SubstringMatchToken,
    SuffixMatchToken: () => SuffixMatchToken,
    TraceLoader: () => TraceLoader,
    TraceModel: () => TraceModel,
    URLToken: () => URLToken,
    UtilityScript: () => UtilityScript,
    WhitespaceToken: () => WhitespaceToken,
    XPathEngine: () => XPathEngine,
    ansiRegex: () => ansiRegex,
    asLocator: () => asLocator,
    asLocatorDescription: () => asLocatorDescription,
    asLocators: () => asLocators,
    assert: () => assert,
    assertionAbortedMessage: () => assertionAbortedMessage,
    base64ByteLength: () => base64ByteLength,
    beginAriaCaches: () => beginAriaCaches,
    beginDOMCaches: () => beginDOMCaches,
    buildActionTree: () => buildActionTree,
    by: () => by,
    bytesToString: () => bytesToString,
    cacheNormalizedWhitespaces: () => cacheNormalizedWhitespaces,
    closestCrossShadow: () => closestCrossShadow,
    computeBox: () => computeBox,
    constructURLBasedOnBaseURL: () => constructURLBasedOnBaseURL,
    createClock: () => createClock,
    createRoleEngine: () => createRoleEngine,
    customCSSNames: () => customCSSNames,
    deserializeURLMatch: () => deserializeURLMatch,
    deviceDescriptors: () => deviceDescriptors,
    disposeAll: () => disposeAll,
    distillAriaSnapshot: () => distillAriaSnapshot,
    elementMatchesText: () => elementMatchesText,
    elementSafeTagName: () => elementSafeTagName,
    elementText: () => elementText,
    enclosingElement: () => enclosingElement,
    enclosingShadowRootOrDocument: () => enclosingShadowRootOrDocument,
    encodeTestIdAttributeName: () => encodeTestIdAttributeName,
    endAriaCaches: () => endAriaCaches,
    endDOMCaches: () => endDOMCaches,
    escapeForAttributeSelector: () => escapeForAttributeSelector,
    escapeForTextSelector: () => escapeForTextSelector,
    escapeHTML: () => escapeHTML,
    escapeHTMLAttribute: () => escapeHTMLAttribute,
    escapeRegExp: () => escapeRegExp,
    escapeTemplateString: () => escapeTemplateString,
    escapeWithQuotes: () => escapeWithQuotes,
    findNewElement: () => findNewElement,
    findNewNode: () => findNewNode,
    formatObject: () => formatObject,
    formatObjectOrVoid: () => formatObjectOrVoid,
    formatProtocolParam: () => formatProtocolParam,
    generateAriaTree: () => generateAriaTree,
    generateSelector: () => generateSelector,
    getActionGroup: () => getActionGroup,
    getAllElementsMatchingExpectAriaTemplate: () => getAllElementsMatchingExpectAriaTemplate,
    getAriaChecked: () => getAriaChecked,
    getAriaDisabled: () => getAriaDisabled,
    getAriaExpanded: () => getAriaExpanded,
    getAriaInvalid: () => getAriaInvalid,
    getAriaLabelledByElements: () => getAriaLabelledByElements,
    getAriaLevel: () => getAriaLevel,
    getAriaPressed: () => getAriaPressed,
    getAriaRole: () => getAriaRole,
    getAriaSelected: () => getAriaSelected,
    getByAltTextSelector: () => getByAltTextSelector,
    getByLabelSelector: () => getByLabelSelector,
    getByPlaceholderSelector: () => getByPlaceholderSelector,
    getByRoleSelector: () => getByRoleSelector,
    getByTestIdSelector: () => getByTestIdSelector,
    getByTextSelector: () => getByTextSelector,
    getByTitleSelector: () => getByTitleSelector,
    getCSSContent: () => getCSSContent,
    getCheckedAllowMixed: () => getCheckedAllowMixed,
    getCheckedWithoutMixed: () => getCheckedWithoutMixed,
    getElementAccessibleDescription: () => getElementAccessibleDescription,
    getElementAccessibleErrorMessage: () => getElementAccessibleErrorMessage,
    getElementAccessibleName: () => getElementAccessibleName,
    getElementAccessibleNameText: () => getElementAccessibleNameText,
    getElementComputedStyle: () => getElementComputedStyle,
    getElementLabels: () => getElementLabels,
    getExtensionForMimeType: () => getExtensionForMimeType,
    getGlobalOptions: () => getGlobalOptions,
    getMetainfo: () => getMetainfo,
    getMimeTypeForPath: () => getMimeTypeForPath,
    getReadonly: () => getReadonly,
    globToRegexPattern: () => globToRegexPattern,
    hasPointerCursor: () => hasPointerCursor,
    headersArrayToObject: () => headersArrayToObject,
    headersObjectToArray: () => headersObjectToArray,
    install: () => install,
    isElementHiddenForAria: () => isElementHiddenForAria,
    isElementIgnoredForAria: () => isElementIgnoredForAria,
    isElementStyleVisibilityVisible: () => isElementStyleVisibilityVisible,
    isElementVisible: () => isElementVisible,
    isError: () => isError2,
    isHttpUrl: () => isHttpUrl,
    isInsideScope: () => isInsideScope,
    isInvalidSelectorError: () => isInvalidSelectorError,
    isJsonMimeType: () => isJsonMimeType,
    isObject: () => isObject,
    isRegExp: () => isRegExp3,
    isRegexString: () => isRegexString,
    isString: () => isString,
    isTextualMimeType: () => isTextualMimeType,
    isURLPattern: () => isURLPattern,
    isVisibleTextNode: () => isVisibleTextNode,
    isXmlMimeType: () => isXmlMimeType,
    kAriaCheckedRoles: () => kAriaCheckedRoles,
    kAriaDisabledRoles: () => kAriaDisabledRoles,
    kAriaExpandedRoles: () => kAriaExpandedRoles,
    kAriaInvalidRoles: () => kAriaInvalidRoles,
    kAriaLevelRoles: () => kAriaLevelRoles,
    kAriaPressedRoles: () => kAriaPressedRoles,
    kAriaSelectedRoles: () => kAriaSelectedRoles,
    kBindingsControllerProperty: () => kBindingsControllerProperty,
    kFunctionBindingPrefix: () => kFunctionBindingPrefix,
    kLayoutSelectorNames: () => kLayoutSelectorNames,
    layoutSelectorScore: () => layoutSelectorScore,
    locatorCustomDescription: () => locatorCustomDescription,
    locatorOrSelectorAsSelector: () => locatorOrSelectorAsSelector,
    longestCommonSubstring: () => longestCommonSubstring,
    matchesAttributePart: () => matchesAttributePart,
    matchesComponentAttribute: () => matchesComponentAttribute,
    matchesExpectAriaTemplate: () => matchesExpectAriaTemplate,
    methodMetainfo: () => methodMetainfo,
    monotonicTime: () => monotonicTime,
    msToString: () => msToString,
    nextActionByStartTime: () => nextActionByStartTime,
    noColors: () => noColors,
    normalizeEscapedRegexQuotes: () => normalizeEscapedRegexQuotes,
    normalizeWhiteSpace: () => normalizeWhiteSpace,
    padImageToSize: () => padImageToSize,
    parentElementOrShadowHost: () => parentElementOrShadowHost,
    parseAriaSnapshot: () => parseAriaSnapshot,
    parseAriaSnapshotUnsafe: () => parseAriaSnapshotUnsafe,
    parseAttributeSelector: () => parseAttributeSelector,
    parseCSS: () => parseCSS,
    parseClientSideCallMetadata: () => parseClientSideCallMetadata,
    parseEvaluationResultValue: () => parseEvaluationResultValue,
    parseRegex: () => parseRegex,
    parseSelector: () => parseSelector,
    pollAgainstDeadline: () => pollAgainstDeadline,
    previousActionByEndTime: () => previousActionByEndTime,
    quoteCSSAttributeValue: () => quoteCSSAttributeValue,
    raceAgainstDeadline: () => raceAgainstDeadline,
    receivesPointerEvents: () => receivesPointerEvents,
    renderAriaSnapshotAsYaml: () => renderAriaSnapshotAsYaml,
    renderAriaTreeAsJSON: () => renderAriaTreeAsJSON,
    renderTitleForCall: () => renderTitleForCall,
    resolveBy: () => resolveBy,
    resolveGlobToRegexPattern: () => resolveGlobToRegexPattern,
    scaleImageToSize: () => scaleImageToSize,
    serializeAsCallArgument: () => serializeAsCallArgument,
    serializeClientSideCallMetadata: () => serializeClientSideCallMetadata,
    serializeSelector: () => serializeSelector,
    serializeURLMatch: () => serializeURLMatch,
    serializeURLPattern: () => serializeURLPattern,
    setGlobalOptions: () => setGlobalOptions,
    setTimeOrigin: () => setTimeOrigin,
    shouldSkipForTextMatching: () => shouldSkipForTextMatching,
    signalToPromise: () => signalToPromise,
    sortInDOMOrder: () => sortInDOMOrder,
    splitSelectorByFrame: () => splitSelectorByFrame,
    splitTestIdAttributeNames: () => splitTestIdAttributeNames,
    stringifySelector: () => stringifySelector,
    stripAnsiEscapes: () => stripAnsiEscapes,
    textValue: () => textValue,
    timeOrigin: () => timeOrigin,
    toSnakeCase: () => toSnakeCase,
    toTitleCase: () => toTitleCase,
    tokenize: () => tokenize,
    tomlArray: () => tomlArray,
    tomlBasicString: () => tomlBasicString,
    tomlMultilineBasicString: () => tomlMultilineBasicString,
    trimString: () => trimString,
    trimStringWithEllipsis: () => trimStringWithEllipsis,
    truncateDataUrl: () => truncateDataUrl,
    unsafeLocatorOrSelectorAsSelector: () => unsafeLocatorOrSelectorAsSelector,
    urlMatches: () => urlMatches,
    urlMatchesEqual: () => urlMatchesEqual,
    validate: () => validate,
    visitAllSelectorParts: () => visitAllSelectorParts,
    webColors: () => webColors,
    yamlEscapeKeyIfNeeded: () => yamlEscapeKeyIfNeeded,
    yamlEscapeValueIfNeeded: () => yamlEscapeValueIfNeeded
  });
  function hasPointerCursor(ariaNode) {
    return ariaNode.box.cursor === "pointer";
  }
  function parseAriaSnapshotUnsafe(yaml, text, options = {}) {
    const result = parseAriaSnapshot(yaml, text, options);
    if (result.errors.length)
      throw new Error(result.errors[0].message);
    return result.fragment;
  }
  function parseAriaSnapshot(yaml, text, options = {}) {
    const lineCounter = new yaml.LineCounter();
    const parseOptions = {
      keepSourceTokens: true,
      lineCounter,
      ...options
    };
    const yamlDoc = yaml.parseDocument(text, parseOptions);
    const errors = [];
    const convertRange = (range) => {
      return [lineCounter.linePos(range[0]), lineCounter.linePos(range[1])];
    };
    const addError = (error) => {
      errors.push({
        message: error.message,
        range: [lineCounter.linePos(error.pos[0]), lineCounter.linePos(error.pos[1])]
      });
    };
    const convertSeq = (container, seq) => {
      for (const item of seq.items) {
        const itemIsString = item instanceof yaml.Scalar && typeof item.value === "string";
        if (itemIsString) {
          const childNode = KeyParser.parse(item, parseOptions, errors);
          if (childNode) {
            container.children = container.children || [];
            container.children.push(childNode);
          }
          continue;
        }
        const itemIsMap = item instanceof yaml.YAMLMap;
        if (itemIsMap) {
          convertMap(container, item);
          continue;
        }
        errors.push({
          message: "Sequence items should be strings or maps",
          range: convertRange(item.range || seq.range)
        });
      }
    };
    const convertMap = (container, map) => {
      for (const entry of map.items) {
        container.children = container.children || [];
        const keyIsString = entry.key instanceof yaml.Scalar && typeof entry.key.value === "string";
        if (!keyIsString) {
          errors.push({
            message: "Only string keys are supported",
            range: convertRange(entry.key.range || map.range)
          });
          continue;
        }
        const key = entry.key;
        const value = entry.value;
        if (key.value === "text") {
          const valueIsString = value instanceof yaml.Scalar && typeof value.value === "string";
          if (!valueIsString) {
            errors.push({
              message: "Text value should be a string",
              range: convertRange(entry.value.range || map.range)
            });
            continue;
          }
          container.children.push({
            kind: "text",
            text: textValue(value.value)
          });
          continue;
        }
        if (key.value === "/children") {
          const valueIsString = value instanceof yaml.Scalar && typeof value.value === "string";
          if (!valueIsString || value.value !== "contain" && value.value !== "equal" && value.value !== "deep-equal") {
            errors.push({
              message: 'Strict value should be "contain", "equal" or "deep-equal"',
              range: convertRange(entry.value.range || map.range)
            });
            continue;
          }
          container.containerMode = value.value;
          continue;
        }
        if (key.value.startsWith("/")) {
          const valueIsString = value instanceof yaml.Scalar && typeof value.value === "string";
          if (!valueIsString) {
            errors.push({
              message: "Property value should be a string",
              range: convertRange(entry.value.range || map.range)
            });
            continue;
          }
          container.props = container.props ?? {};
          container.props[key.value.slice(1)] = textValue(value.value);
          continue;
        }
        const childNode = KeyParser.parse(key, parseOptions, errors);
        if (!childNode)
          continue;
        const valueIsScalar = value instanceof yaml.Scalar;
        if (valueIsScalar) {
          const type = typeof value.value;
          if (type !== "string" && type !== "number" && type !== "boolean") {
            errors.push({
              message: "Node value should be a string or a sequence",
              range: convertRange(entry.value.range || map.range)
            });
            continue;
          }
          container.children.push({
            ...childNode,
            children: [{
              kind: "text",
              text: textValue(String(value.value))
            }]
          });
          continue;
        }
        const valueIsSequence = value instanceof yaml.YAMLSeq;
        if (valueIsSequence) {
          container.children.push(childNode);
          convertSeq(childNode, value);
          continue;
        }
        errors.push({
          message: "Map values should be strings or sequences",
          range: convertRange(entry.value.range || map.range)
        });
      }
    };
    const fragment = { kind: "role", role: "fragment" };
    yamlDoc.errors.forEach(addError);
    if (errors.length)
      return { errors, fragment };
    if (!(yamlDoc.contents instanceof yaml.YAMLSeq)) {
      errors.push({
        message: 'Aria snapshot must be a YAML sequence, elements starting with " -"',
        range: yamlDoc.contents ? convertRange(yamlDoc.contents.range) : [{ line: 0, col: 0 }, { line: 0, col: 0 }]
      });
    }
    if (errors.length)
      return { errors, fragment };
    convertSeq(fragment, yamlDoc.contents);
    if (errors.length)
      return { errors, fragment: emptyFragment };
    if (fragment.children?.length === 1 && (!fragment.containerMode || fragment.containerMode === "contain"))
      return { fragment: fragment.children[0], errors: [] };
    return { fragment, errors: [] };
  }
  var emptyFragment = { kind: "role", role: "fragment" };
  function normalizeWhitespace(text) {
    return text.replace(/[\u200b\u00ad]/g, "").replace(/[\r\n\s\t]+/g, " ").trim();
  }
  function textValue(value) {
    return {
      raw: value,
      normalized: normalizeWhitespace(value)
    };
  }
  var KeyParser = class _KeyParser {
    static parse(text, options, errors) {
      try {
        return new _KeyParser(text.value)._parse();
      } catch (e) {
        if (e instanceof ParserError) {
          const message = options.prettyErrors === false ? e.message : e.message + ":\n\n" + text.value + "\n" + " ".repeat(e.pos) + "^\n";
          errors.push({
            message,
            range: [options.lineCounter.linePos(text.range[0]), options.lineCounter.linePos(text.range[0] + e.pos)]
          });
          return null;
        }
        throw e;
      }
    }
    constructor(input) {
      this._input = input;
      this._pos = 0;
      this._length = input.length;
    }
    _peek() {
      return this._input[this._pos] || "";
    }
    _next() {
      if (this._pos < this._length)
        return this._input[this._pos++];
      return null;
    }
    _eof() {
      return this._pos >= this._length;
    }
    _isWhitespace() {
      return !this._eof() && /\s/.test(this._peek());
    }
    _skipWhitespace() {
      while (this._isWhitespace())
        this._pos++;
    }
    _readIdentifier(type) {
      if (this._eof())
        this._throwError(`Unexpected end of input when expecting ${type}`);
      const start = this._pos;
      while (!this._eof() && /[a-zA-Z]/.test(this._peek()))
        this._pos++;
      return this._input.slice(start, this._pos);
    }
    _readString() {
      let result = "";
      let escaped2 = false;
      while (!this._eof()) {
        const ch = this._next();
        if (escaped2) {
          result += ch;
          escaped2 = false;
        } else if (ch === "\\") {
          escaped2 = true;
        } else if (ch === '"') {
          return result;
        } else {
          result += ch;
        }
      }
      this._throwError("Unterminated string");
    }
    _throwError(message, offset = 0) {
      throw new ParserError(message, offset || this._pos);
    }
    _readRegex() {
      let result = "";
      let escaped2 = false;
      let insideClass = false;
      while (!this._eof()) {
        const ch = this._next();
        if (escaped2) {
          result += ch;
          escaped2 = false;
        } else if (ch === "\\") {
          escaped2 = true;
          result += ch;
        } else if (ch === "/" && !insideClass) {
          return { pattern: result };
        } else if (ch === "[") {
          insideClass = true;
          result += ch;
        } else if (ch === "]" && insideClass) {
          result += ch;
          insideClass = false;
        } else {
          result += ch;
        }
      }
      this._throwError("Unterminated regex");
    }
    _readStringOrRegex() {
      const ch = this._peek();
      if (ch === '"') {
        this._next();
        return normalizeWhitespace(this._readString());
      }
      if (ch === "/") {
        this._next();
        return this._readRegex();
      }
      return null;
    }
    _readAttributes(result) {
      let errorPos = this._pos;
      while (true) {
        this._skipWhitespace();
        if (this._peek() === "[") {
          this._next();
          this._skipWhitespace();
          errorPos = this._pos;
          const flagName = this._readIdentifier("attribute");
          this._skipWhitespace();
          let flagValue = "";
          if (this._peek() === "=") {
            this._next();
            this._skipWhitespace();
            errorPos = this._pos;
            while (this._peek() !== "]" && !this._isWhitespace() && !this._eof())
              flagValue += this._next();
          }
          this._skipWhitespace();
          if (this._peek() !== "]")
            this._throwError("Expected ]");
          this._next();
          this._applyAttribute(result, flagName, flagValue || "true", errorPos);
        } else {
          break;
        }
      }
    }
    _parse() {
      this._skipWhitespace();
      const role = this._readIdentifier("role");
      this._skipWhitespace();
      const name = this._readStringOrRegex() || "";
      const result = { kind: "role", role, name };
      this._readAttributes(result);
      this._skipWhitespace();
      if (!this._eof())
        this._throwError("Unexpected input");
      return result;
    }
    _applyAttribute(node, key, value, errorPos) {
      if (key === "checked") {
        this._assert(value === "true" || value === "false" || value === "mixed", 'Value of "checked" attribute must be a boolean or "mixed"', errorPos);
        node.checked = value === "true" ? true : value === "false" ? false : "mixed";
        return;
      }
      if (key === "disabled") {
        this._assert(value === "true" || value === "false", 'Value of "disabled" attribute must be a boolean', errorPos);
        node.disabled = value === "true";
        return;
      }
      if (key === "expanded") {
        this._assert(value === "true" || value === "false", 'Value of "expanded" attribute must be a boolean', errorPos);
        node.expanded = value === "true";
        return;
      }
      if (key === "active") {
        this._assert(value === "true" || value === "false", 'Value of "active" attribute must be a boolean', errorPos);
        node.active = value === "true";
        return;
      }
      if (key === "invalid") {
        this._assert(value === "true" || value === "false" || value === "grammar" || value === "spelling", 'Value of "invalid" attribute must be a boolean, "grammar" or "spelling"', errorPos);
        node.invalid = value === "true" ? true : value === "false" ? false : value;
        return;
      }
      if (key === "level") {
        this._assert(!isNaN(Number(value)), 'Value of "level" attribute must be a number', errorPos);
        node.level = Number(value);
        return;
      }
      if (key === "pressed") {
        this._assert(value === "true" || value === "false" || value === "mixed", 'Value of "pressed" attribute must be a boolean or "mixed"', errorPos);
        node.pressed = value === "true" ? true : value === "false" ? false : "mixed";
        return;
      }
      if (key === "selected") {
        this._assert(value === "true" || value === "false", 'Value of "selected" attribute must be a boolean', errorPos);
        node.selected = value === "true";
        return;
      }
      this._assert(false, `Unsupported attribute [${key}]`, errorPos);
    }
    _assert(value, message, valuePos) {
      if (!value)
        this._throwError(message || "Assertion error", valuePos);
    }
  };
  var ParserError = class extends Error {
    constructor(message, pos) {
      super(message);
      this.pos = pos;
    }
  };
  function findNewNode(from, to) {
    function fillMap(root, map, position) {
      let size = 1;
      let childPosition = position + size;
      for (const child of root.children || []) {
        if (typeof child === "string") {
          size++;
          childPosition++;
        } else {
          size += fillMap(child, map, childPosition);
          childPosition += size;
        }
      }
      if (!["none", "presentation", "fragment", "iframe", "generic"].includes(root.role) && root.name) {
        let byRole = map.get(root.role);
        if (!byRole) {
          byRole = /* @__PURE__ */ new Map();
          map.set(root.role, byRole);
        }
        const existing = byRole.get(root.name);
        const sizeAndPosition = size * 100 - position;
        if (!existing || existing.sizeAndPosition < sizeAndPosition)
          byRole.set(root.name, { node: root, sizeAndPosition });
      }
      return size;
    }
    const fromMap = /* @__PURE__ */ new Map();
    if (from)
      fillMap(from, fromMap, 0);
    const toMap = /* @__PURE__ */ new Map();
    fillMap(to, toMap, 0);
    const result = [];
    for (const [role, byRole] of toMap) {
      for (const [name, byName] of byRole) {
        const inFrom = fromMap.get(role)?.get(name);
        if (!inFrom)
          result.push(byName);
      }
    }
    result.sort((a, b) => b.sizeAndPosition - a.sizeAndPosition);
    return result[0]?.node;
  }
  function escapeWithQuotes(text, char = "'") {
    const stringified = JSON.stringify(text);
    const escapedText = stringified.substring(1, stringified.length - 1).replace(/\\"/g, '"');
    if (char === "'")
      return char + escapedText.replace(/[']/g, "\\'") + char;
    if (char === '"')
      return char + escapedText.replace(/["]/g, '\\"') + char;
    if (char === "`")
      return char + escapedText.replace(/[`]/g, "\\`") + char;
    throw new Error("Invalid escape char");
  }
  function escapeTemplateString(text) {
    return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  }
  function isString(obj) {
    return typeof obj === "string" || obj instanceof String;
  }
  function toTitleCase(name) {
    return name.charAt(0).toUpperCase() + name.substring(1);
  }
  function toSnakeCase(name) {
    return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase();
  }
  function formatObject(value, indent2 = "  ", mode = "multiline") {
    if (typeof value === "string")
      return escapeWithQuotes(value, "'");
    if (Array.isArray(value))
      return `[${value.map((o) => formatObject(o)).join(", ")}]`;
    if (typeof value === "object") {
      const keys = Object.keys(value).filter((key) => key !== "timeout" && value[key] !== void 0).sort();
      if (!keys.length)
        return "{}";
      const tokens = [];
      for (const key of keys)
        tokens.push(`${key}: ${formatObject(value[key])}`);
      if (mode === "multiline")
        return `{
${tokens.map((t) => indent2 + t).join(`,
`)}
}`;
      return `{ ${tokens.join(", ")} }`;
    }
    return String(value);
  }
  function formatObjectOrVoid(value, indent2 = "  ") {
    const result = formatObject(value, indent2);
    return result === "{}" ? "" : result;
  }
  function quoteCSSAttributeValue(text) {
    return `"${text.replace(/["\\]/g, (char) => "\\" + char)}"`;
  }
  var normalizedWhitespaceCache;
  function cacheNormalizedWhitespaces() {
    normalizedWhitespaceCache = /* @__PURE__ */ new Map();
  }
  function normalizeWhiteSpace(text) {
    let result = normalizedWhitespaceCache?.get(text);
    if (result === void 0) {
      result = text.replace(/[\u200b\u00ad]/g, "").trim().replace(/\s+/g, " ");
      normalizedWhitespaceCache?.set(text, result);
    }
    return result;
  }
  function normalizeEscapedRegexQuotes(source) {
    return source.replace(/(^|[^\\])(\\\\)*\\(['"`])/g, "$1$2$3");
  }
  function escapeRegexForSelector(re) {
    if (re.unicode || re.unicodeSets)
      return String(re);
    return String(re).replace(/(^|[^\\])(\\\\)*(["'`])/g, "$1$2\\$3").replace(/>>/g, "\\>\\>");
  }
  function escapeForTextSelector(text, exact) {
    if (typeof text !== "string")
      return escapeRegexForSelector(text);
    return `${JSON.stringify(text)}${exact ? "s" : "i"}`;
  }
  function escapeForAttributeSelector(value, exact) {
    if (typeof value !== "string")
      return escapeRegexForSelector(value);
    return `"${value.replace(/\\/g, "\\\\").replace(/["]/g, '\\"')}"${exact ? "s" : "i"}`;
  }
  function trimString(input, cap, suffix = "") {
    if (input.length <= cap)
      return input;
    const chars = [...input];
    if (chars.length > cap)
      return chars.slice(0, cap - suffix.length).join("") + suffix;
    return chars.join("");
  }
  function trimStringWithEllipsis(input, cap) {
    return trimString(input, cap, "\u2026");
  }
  function truncateDataUrl(url) {
    if (!url.startsWith("data:"))
      return url;
    const comma = url.indexOf(",");
    if (comma === -1)
      return url;
    return url.slice(0, comma + 1) + "\u2026";
  }
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  var escaped = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function escapeHTMLAttribute(s) {
    return s.replace(/[&<>"']/ug, (char) => escaped[char]);
  }
  function escapeHTML(s) {
    return s.replace(/[&<]/ug, (char) => escaped[char]);
  }
  function longestCommonSubstring(s1, s2) {
    const n = s1.length;
    const m = s2.length;
    let maxLen = 0;
    let endingIndex = 0;
    const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          if (dp[i][j] > maxLen) {
            maxLen = dp[i][j];
            endingIndex = i;
          }
        }
      }
    }
    return s1.slice(endingIndex - maxLen, endingIndex);
  }
  function parseRegex(regex) {
    if (regex[0] !== "/")
      throw new Error(`Invalid regex, must start with '/': ${regex}`);
    const lastSlash = regex.lastIndexOf("/");
    if (lastSlash <= 0)
      throw new Error(`Invalid regex, must end with '/' followed by optional flags: ${regex}`);
    const source = regex.slice(1, lastSlash);
    const flags = regex.slice(lastSlash + 1);
    return new RegExp(source, flags);
  }
  function tomlBasicString(value) {
    return JSON.stringify(value);
  }
  function tomlArray(values) {
    return `[${values.map((value) => tomlBasicString(value)).join(", ")}]`;
  }
  function tomlMultilineBasicString(value) {
    const escaped2 = value.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');
    return `"""
${escaped2}
"""`;
  }
  var ansiRegex = new RegExp("([\\u001B\\u009B][[\\]()#?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{0,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~])))", "g");
  function stripAnsiEscapes(str) {
    return str.replace(ansiRegex, "");
  }
  function yamlEscapeKeyIfNeeded(str) {
    if (!yamlStringNeedsQuotes(str))
      return str;
    return `'` + str.replace(/'/g, `''`) + `'`;
  }
  function yamlEscapeValueIfNeeded(str) {
    if (!yamlStringNeedsQuotes(str))
      return str;
    return '"' + str.replace(/[\\"\x00-\x1f\x7f-\x9f]/g, (c) => {
      switch (c) {
        case "\\":
          return "\\\\";
        case '"':
          return '\\"';
        case "\b":
          return "\\b";
        case "\f":
          return "\\f";
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case "	":
          return "\\t";
        default:
          const code = c.charCodeAt(0);
          return "\\x" + code.toString(16).padStart(2, "0");
      }
    }) + '"';
  }
  function yamlStringNeedsQuotes(str) {
    if (str.length === 0)
      return true;
    if (/^\s|\s$/.test(str))
      return true;
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(str))
      return true;
    if (/^-/.test(str))
      return true;
    if (/[\n:](\s|$)/.test(str))
      return true;
    if (/\s#/.test(str))
      return true;
    if (/[\n\r]/.test(str))
      return true;
    if (/^[&*\],?!>|@"'#%]/.test(str))
      return true;
    if (/[{}`]/.test(str))
      return true;
    if (/^\[/.test(str))
      return true;
    if (!isNaN(Number(str)) || ["y", "n", "yes", "no", "true", "false", "on", "off", "null"].includes(str.toLowerCase()))
      return true;
    return false;
  }
  function renderAriaSnapshotAsYaml(snapshot, options = {}) {
    const lines = [];
    const includeText = options.convertStringsToRegex ? textContributesInfo : () => true;
    const renderString = options.convertStringsToRegex ? convertToBestGuessRegex : (str) => str;
    const visitText = (text, depth) => {
      const escaped2 = yamlEscapeValueIfNeeded(renderString(text));
      if (escaped2)
        lines.push(indent(depth) + "- text: " + escaped2);
    };
    const createKey = (node) => {
      let key = node.role;
      if (node.name && node.name.length <= 900) {
        const name = renderString(node.name);
        if (name) {
          const stringifiedName = name.startsWith("/") && name.endsWith("/") ? name : JSON.stringify(name);
          key += " " + stringifiedName;
        }
      }
      if (node.checked === "mixed")
        key += ` [checked=mixed]`;
      if (node.checked === true)
        key += ` [checked]`;
      if (node.disabled)
        key += ` [disabled]`;
      if (node.expanded)
        key += ` [expanded]`;
      if (node.active)
        key += ` [active]`;
      if (node.invalid === "grammar" || node.invalid === "spelling")
        key += ` [invalid=${node.invalid}]`;
      if (node.invalid === true)
        key += ` [invalid]`;
      if (node.level)
        key += ` [level=${node.level}]`;
      if (node.pressed === "mixed")
        key += ` [pressed=mixed]`;
      if (node.pressed === true)
        key += ` [pressed]`;
      if (node.selected === true)
        key += ` [selected]`;
      if (node.ref) {
        key += ` [ref=${node.ref}]`;
        if (node.cursor === "pointer")
          key += " [cursor=pointer]";
      }
      if (node.box)
        key += ` [box=${node.box.x},${node.box.y},${node.box.width},${node.box.height}]`;
      return key;
    };
    const visit = (node, depth) => {
      if (node.role === "text") {
        visitText(node.text || "", depth);
        return;
      }
      options.lineToNode?.set(lines.length, node);
      const escapedKey = indent(depth) + "- " + yamlEscapeKeyIfNeeded(createKey(node));
      const props = [];
      if (node.url !== void 0)
        props.push(["url", node.url]);
      if (node.placeholder !== void 0)
        props.push(["placeholder", node.placeholder]);
      if (node.text === void 0 && !props.length && !node.children?.length) {
        lines.push(escapedKey);
      } else if (node.text !== void 0 && !props.length) {
        if (includeText(node, node.text))
          lines.push(escapedKey + ": " + yamlEscapeValueIfNeeded(renderString(node.text)));
        else
          lines.push(escapedKey);
      } else {
        lines.push(escapedKey + ":");
        for (const [name, value] of props)
          lines.push(indent(depth + 1) + "- /" + name + ": " + yamlEscapeValueIfNeeded(value));
        if (node.text !== void 0) {
          visitText(includeText(node, node.text) ? node.text : "", depth + 1);
        } else {
          for (const child of node.children || []) {
            if (typeof child === "string")
              visitText(includeText(node, child) ? child : "", depth + 1);
            else
              visit(child, depth + 1);
          }
        }
      }
    };
    for (const node of snapshot)
      visit(node, 0);
    return lines.join("\n");
  }
  function indent(depth) {
    return "  ".repeat(depth);
  }
  function convertToBestGuessRegex(text) {
    const dynamicContent = [
      // 550e8400-e29b-41d4-a716-446655440000
      { regex: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/, replacement: "[0-9a-fA-F-]+" },
      // 2mb
      { regex: /\b[\d,.]+[bkmBKM]+\b/, replacement: "[\\d,.]+[bkmBKM]+" },
      // 2ms, 20s
      { regex: /\b\d+[hmsp]+\b/, replacement: "\\d+[hmsp]+" },
      { regex: /\b[\d,.]+[hmsp]+\b/, replacement: "[\\d,.]+[hmsp]+" },
      // Do not replace single digits with regex by default.
      // 2+ digits: [Issue 22, 22.3, 2.33, 2,333]
      { regex: /\b\d+,\d+\b/, replacement: "\\d+,\\d+" },
      { regex: /\b\d+\.\d{2,}\b/, replacement: "\\d+\\.\\d+" },
      { regex: /\b\d{2,}\.\d+\b/, replacement: "\\d+\\.\\d+" },
      { regex: /\b\d{2,}\b/, replacement: "\\d+" }
    ];
    let pattern = "";
    let lastIndex = 0;
    const combinedRegex = new RegExp(dynamicContent.map((r) => "(" + r.regex.source + ")").join("|"), "g");
    text.replace(combinedRegex, (match, ...args) => {
      const offset = args[args.length - 2];
      const groups = args.slice(0, -2);
      pattern += escapeRegExp(text.slice(lastIndex, offset));
      for (let i = 0; i < groups.length; i++) {
        if (groups[i]) {
          const { replacement } = dynamicContent[i];
          pattern += replacement;
          break;
        }
      }
      lastIndex = offset + match.length;
      return match;
    });
    if (!pattern)
      return text;
    pattern += escapeRegExp(text.slice(lastIndex));
    return String(new RegExp(pattern));
  }
  function textContributesInfo(node, text) {
    if (!text.length)
      return false;
    if (!node.name)
      return true;
    const substr = text.length <= 200 && node.name.length <= 200 ? longestCommonSubstring(text, node.name) : "";
    let filtered = text;
    while (substr && filtered.includes(substr))
      filtered = filtered.replace(substr, "");
    return filtered.trim().length / text.length > 0.1;
  }
  function distillAriaSnapshot(snapshot, options) {
    runPlugins(snapshot, options.mode === "ai" ? aiPlugins : normalizePlugins, options);
  }
  function runPlugins(snapshot, plugins, options) {
    const ctx = { snapshot, depth: -1, maxDepth: options.depth, ancestors: [], pendingContentRefs: /* @__PURE__ */ new Set() };
    const traverse = (node, depth) => {
      const children = [];
      const visitChild = (child) => {
        if (typeof child === "string") {
          children.push(child);
          return;
        }
        ctx.depth = depth + 1;
        for (const plugin of plugins) {
          const result = plugin.enter?.(child, ctx);
          if (result === "remove")
            return;
          if (result === "unwrap") {
            child.children.forEach(visitChild);
            return;
          }
        }
        traverse(child, depth + 1);
        ctx.depth = depth + 1;
        for (const plugin of plugins) {
          const result = plugin.exit?.(child, ctx);
          if (result === "remove")
            return;
          if (result === "unwrap") {
            children.push(...child.children);
            return;
          }
        }
        children.push(child);
      };
      ctx.ancestors.push(node);
      node.children.forEach(visitChild);
      ctx.ancestors.pop();
      node.children = children;
    };
    for (const plugin of plugins)
      plugin.enter?.(snapshot.root, ctx);
    traverse(snapshot.root, -1);
    ctx.depth = -1;
    for (const plugin of plugins)
      plugin.exit?.(snapshot.root, ctx);
  }
  function isLeafGeneric(node) {
    return node.role === "generic" && node.children.every((child) => typeof child === "string");
  }
  function isClickTargetRoot(node, ctx) {
    return !!node.ref && hasPointerCursor(node) && !ctx.ancestors.some((ancestor) => !!ancestor.ref && hasPointerCursor(ancestor));
  }
  var mergeStringChildren = {
    name: "mergeStringChildren",
    exit(node) {
      const children = [];
      const buffer = [];
      const flush = () => {
        if (!buffer.length)
          return;
        const text = normalizeWhiteSpace(buffer.join(""));
        if (text)
          children.push(text);
        buffer.length = 0;
      };
      for (const child of node.children) {
        if (typeof child === "string") {
          buffer.push(child);
        } else {
          flush();
          children.push(child);
        }
      }
      flush();
      node.children = children;
      if (node.children.length === 1 && node.children[0] === node.name)
        node.children = [];
    }
  };
  var unwrapSingleChildGenerics = {
    name: "unwrapSingleChildGenerics",
    exit(node, ctx) {
      if (node.role !== "generic" || node.name || node.children.length > 1 || !node.children.every((child) => typeof child !== "string" && !!child.ref))
        return;
      if (!node.children.length && isClickTargetRoot(node, ctx))
        return;
      return "unwrap";
    }
  };
  var removeNamelessImages = {
    name: "removeNamelessImages",
    exit(node, ctx) {
      if (node.role === "img" && !node.name && !node.children.length && !isClickTargetRoot(node, ctx))
        return "remove";
    }
  };
  var removeRedundantNames = {
    name: "removeRedundantNames",
    enter(node, ctx) {
      if (!node.ref)
        return;
      for (const ref of ctx.snapshot.info.get(node.ref)?.nameFromContentRefs || [])
        ctx.pendingContentRefs.add(ref);
      const beyondDepth = !!ctx.maxDepth && ctx.depth > ctx.maxDepth;
      if (!beyondDepth && !isLeafGeneric(node))
        ctx.pendingContentRefs.delete(node.ref);
    },
    exit(node, ctx) {
      if (!node.ref)
        return;
      const nameFromContentRefs = ctx.snapshot.info.get(node.ref)?.nameFromContentRefs;
      if (!nameFromContentRefs?.length)
        return;
      if (nameFromContentRefs.every((ref) => !ctx.pendingContentRefs.has(ref))) {
        node.name = "";
      } else {
        for (const ref of nameFromContentRefs)
          ctx.pendingContentRefs.delete(ref);
      }
    }
  };
  var removeNameRepeatingChild = {
    name: "removeNameRepeatingChild",
    exit(node, ctx) {
      const parent = ctx.ancestors[ctx.ancestors.length - 1];
      if (!parent?.name || node.role !== "generic" || node.active || Object.keys(node.props).length)
        return;
      const singleTextChild = node.children.length === 1 && typeof node.children[0] === "string" ? node.children[0] : void 0;
      const text = node.name ? node.children.length ? void 0 : node.name : singleTextChild;
      if (text && text === parent.name) {
        if (node.ref)
          ctx.pendingContentRefs.add(node.ref);
        return "remove";
      }
    }
  };
  var inlineTextIntoGeneric = {
    name: "inlineTextIntoGeneric",
    exit(node) {
      if (node.role !== "generic" || Object.keys(node.props).length || node.children.length !== 1)
        return;
      const child = node.children[0];
      if (typeof child === "string")
        return;
      if (child.role !== "generic" || child.name || child.active || Object.keys(child.props).length)
        return;
      if (child.children.length === 1 && typeof child.children[0] === "string")
        node.children = [child.children[0]];
    }
  };
  var normalizePlugins = [
    mergeStringChildren,
    unwrapSingleChildGenerics
  ];
  var aiPlugins = [
    mergeStringChildren,
    removeNamelessImages,
    removeRedundantNames,
    inlineTextIntoGeneric,
    removeNameRepeatingChild,
    unwrapSingleChildGenerics
  ];
  var globalOptions = {};
  function setGlobalOptions(options) {
    globalOptions = options;
  }
  function getGlobalOptions() {
    return globalOptions;
  }
  function isInsideScope(scope, element) {
    while (element) {
      if (scope.contains(element))
        return true;
      element = enclosingShadowHost(element);
    }
    return false;
  }
  function enclosingElement(node) {
    if (node.nodeType === 1)
      return node;
    return node.parentElement ?? void 0;
  }
  function parentElementOrShadowHost(element) {
    if (element.parentElement)
      return element.parentElement;
    if (!element.parentNode)
      return;
    if (element.parentNode.nodeType === 11 && element.parentNode.host)
      return element.parentNode.host;
  }
  function enclosingShadowRootOrDocument(element) {
    let node = element;
    while (node.parentNode)
      node = node.parentNode;
    if (node.nodeType === 11 || node.nodeType === 9)
      return node;
  }
  function enclosingShadowHost(element) {
    while (element.parentElement)
      element = element.parentElement;
    return parentElementOrShadowHost(element);
  }
  function closestCrossShadow(element, css, scope) {
    while (element) {
      const closest = element.closest(css);
      if (scope && closest !== scope && closest?.contains(scope))
        return;
      if (closest)
        return closest;
      element = enclosingShadowHost(element);
    }
  }
  function getElementComputedStyle(element, pseudo) {
    const cache = pseudo === "::before" ? cacheStyleBefore : pseudo === "::after" ? cacheStyleAfter : cacheStyle;
    if (cache && cache.has(element))
      return cache.get(element);
    const style = element.ownerDocument && element.ownerDocument.defaultView ? element.ownerDocument.defaultView.getComputedStyle(element, pseudo) : void 0;
    cache?.set(element, style);
    return style;
  }
  function isElementStyleVisibilityVisible(element, style) {
    const cached = cacheStyleVisibility?.get(element);
    if (cached !== void 0)
      return cached;
    const result = computeElementStyleVisibilityVisible(element, style);
    cacheStyleVisibility?.set(element, result);
    return result;
  }
  function computeElementStyleVisibilityVisible(element, style) {
    style = style ?? getElementComputedStyle(element);
    if (!style)
      return true;
    if (Element.prototype.checkVisibility && globalOptions.browserNameForWorkarounds !== "webkit") {
      if (!element.checkVisibility())
        return false;
    } else {
      const detailsOrSummary = element.closest("details,summary");
      if (detailsOrSummary !== element && detailsOrSummary?.nodeName === "DETAILS" && !detailsOrSummary.open)
        return false;
    }
    if (style.visibility !== "visible")
      return false;
    return true;
  }
  function computeBox(element) {
    const style = getElementComputedStyle(element);
    if (!style)
      return { visible: true, inline: false };
    const cursor = style.cursor;
    if (style.display === "contents") {
      for (let child = element.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === 1 && isElementVisible(child))
          return { visible: true, inline: false, cursor };
        if (child.nodeType === 3 && isVisibleTextNode(child))
          return { visible: true, inline: true, cursor };
      }
      return { visible: false, inline: false, cursor };
    }
    if (!isElementStyleVisibilityVisible(element, style))
      return { cursor, visible: false, inline: false };
    const rect = element.getBoundingClientRect();
    return { cursor, visible: rect.width > 0 && rect.height > 0, inline: style.display === "inline" };
  }
  function isElementVisible(element) {
    return computeBox(element).visible;
  }
  function isVisibleTextNode(node) {
    const range = node.ownerDocument.createRange();
    range.selectNode(node);
    const rect = range.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  function elementSafeTagName(element) {
    const tagName = element.tagName;
    if (typeof tagName === "string") {
      const firstCharCode = tagName.charCodeAt(0);
      if (firstCharCode >= 97 && firstCharCode <= 122)
        return tagName.toUpperCase();
      return tagName;
    }
    if (element instanceof HTMLFormElement)
      return "FORM";
    return element.tagName.toUpperCase();
  }
  var cacheStyle;
  var cacheStyleBefore;
  var cacheStyleAfter;
  var cacheStyleVisibility;
  var cachesCounter = 0;
  function beginDOMCaches() {
    ++cachesCounter;
    cacheStyle ?? (cacheStyle = /* @__PURE__ */ new Map());
    cacheStyleBefore ?? (cacheStyleBefore = /* @__PURE__ */ new Map());
    cacheStyleAfter ?? (cacheStyleAfter = /* @__PURE__ */ new Map());
    cacheStyleVisibility ?? (cacheStyleVisibility = /* @__PURE__ */ new Map());
  }
  function endDOMCaches() {
    if (!--cachesCounter) {
      cacheStyle = void 0;
      cacheStyleBefore = void 0;
      cacheStyleAfter = void 0;
      cacheStyleVisibility = void 0;
    }
  }
  var between = function(num, first, last) {
    return num >= first && num <= last;
  };
  function digit(code) {
    return between(code, 48, 57);
  }
  function hexdigit(code) {
    return digit(code) || between(code, 65, 70) || between(code, 97, 102);
  }
  function uppercaseletter(code) {
    return between(code, 65, 90);
  }
  function lowercaseletter(code) {
    return between(code, 97, 122);
  }
  function letter(code) {
    return uppercaseletter(code) || lowercaseletter(code);
  }
  function nonascii(code) {
    return code >= 128;
  }
  function namestartchar(code) {
    return letter(code) || nonascii(code) || code === 95;
  }
  function namechar(code) {
    return namestartchar(code) || digit(code) || code === 45;
  }
  function nonprintable(code) {
    return between(code, 0, 8) || code === 11 || between(code, 14, 31) || code === 127;
  }
  function newline(code) {
    return code === 10;
  }
  function whitespace(code) {
    return newline(code) || code === 9 || code === 32;
  }
  var maximumallowedcodepoint = 1114111;
  var InvalidCharacterError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "InvalidCharacterError";
    }
  };
  function preprocess(str) {
    const codepoints = [];
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      if (code === 13 && str.charCodeAt(i + 1) === 10) {
        code = 10;
        i++;
      }
      if (code === 13 || code === 12)
        code = 10;
      if (code === 0)
        code = 65533;
      if (between(code, 55296, 56319) && between(str.charCodeAt(i + 1), 56320, 57343)) {
        const lead = code - 55296;
        const trail = str.charCodeAt(i + 1) - 56320;
        code = Math.pow(2, 16) + lead * Math.pow(2, 10) + trail;
        i++;
      }
      codepoints.push(code);
    }
    return codepoints;
  }
  function stringFromCode(code) {
    if (code <= 65535)
      return String.fromCharCode(code);
    code -= Math.pow(2, 16);
    const lead = Math.floor(code / Math.pow(2, 10)) + 55296;
    const trail = code % Math.pow(2, 10) + 56320;
    return String.fromCharCode(lead) + String.fromCharCode(trail);
  }
  function tokenize(str1) {
    const str = preprocess(str1);
    let i = -1;
    const tokens = [];
    let code;
    let line = 0;
    let column = 0;
    let lastLineLength = 0;
    const incrLineno = function() {
      line += 1;
      lastLineLength = column;
      column = 0;
    };
    const locStart = { line, column };
    const codepoint = function(i2) {
      if (i2 >= str.length)
        return -1;
      return str[i2];
    };
    const next = function(num) {
      if (num === void 0)
        num = 1;
      if (num > 3)
        throw "Spec Error: no more than three codepoints of lookahead.";
      return codepoint(i + num);
    };
    const consume = function(num) {
      if (num === void 0)
        num = 1;
      i += num;
      code = codepoint(i);
      if (newline(code))
        incrLineno();
      else
        column += num;
      return true;
    };
    const reconsume = function() {
      i -= 1;
      if (newline(code)) {
        line -= 1;
        column = lastLineLength;
      } else {
        column -= 1;
      }
      locStart.line = line;
      locStart.column = column;
      return true;
    };
    const eof = function(codepoint2) {
      if (codepoint2 === void 0)
        codepoint2 = code;
      return codepoint2 === -1;
    };
    const donothing = function() {
    };
    const parseerror = function() {
    };
    const consumeAToken = function() {
      consumeComments();
      consume();
      if (whitespace(code)) {
        while (whitespace(next()))
          consume();
        return new WhitespaceToken();
      } else if (code === 34) {
        return consumeAStringToken();
      } else if (code === 35) {
        if (namechar(next()) || areAValidEscape(next(1), next(2))) {
          const token = new HashToken("");
          if (wouldStartAnIdentifier(next(1), next(2), next(3)))
            token.type = "id";
          token.value = consumeAName();
          return token;
        } else {
          return new DelimToken(code);
        }
      } else if (code === 36) {
        if (next() === 61) {
          consume();
          return new SuffixMatchToken();
        } else {
          return new DelimToken(code);
        }
      } else if (code === 39) {
        return consumeAStringToken();
      } else if (code === 40) {
        return new OpenParenToken();
      } else if (code === 41) {
        return new CloseParenToken();
      } else if (code === 42) {
        if (next() === 61) {
          consume();
          return new SubstringMatchToken();
        } else {
          return new DelimToken(code);
        }
      } else if (code === 43) {
        if (startsWithANumber()) {
          reconsume();
          return consumeANumericToken();
        } else {
          return new DelimToken(code);
        }
      } else if (code === 44) {
        return new CommaToken();
      } else if (code === 45) {
        if (startsWithANumber()) {
          reconsume();
          return consumeANumericToken();
        } else if (next(1) === 45 && next(2) === 62) {
          consume(2);
          return new CDCToken();
        } else if (startsWithAnIdentifier()) {
          reconsume();
          return consumeAnIdentlikeToken();
        } else {
          return new DelimToken(code);
        }
      } else if (code === 46) {
        if (startsWithANumber()) {
          reconsume();
          return consumeANumericToken();
        } else {
          return new DelimToken(code);
        }
      } else if (code === 58) {
        return new ColonToken();
      } else if (code === 59) {
        return new SemicolonToken();
      } else if (code === 60) {
        if (next(1) === 33 && next(2) === 45 && next(3) === 45) {
          consume(3);
          return new CDOToken();
        } else {
          return new DelimToken(code);
        }
      } else if (code === 64) {
        if (wouldStartAnIdentifier(next(1), next(2), next(3)))
          return new AtKeywordToken(consumeAName());
        else
          return new DelimToken(code);
      } else if (code === 91) {
        return new OpenSquareToken();
      } else if (code === 92) {
        if (startsWithAValidEscape()) {
          reconsume();
          return consumeAnIdentlikeToken();
        } else {
          parseerror();
          return new DelimToken(code);
        }
      } else if (code === 93) {
        return new CloseSquareToken();
      } else if (code === 94) {
        if (next() === 61) {
          consume();
          return new PrefixMatchToken();
        } else {
          return new DelimToken(code);
        }
      } else if (code === 123) {
        return new OpenCurlyToken();
      } else if (code === 124) {
        if (next() === 61) {
          consume();
          return new DashMatchToken();
        } else if (next() === 124) {
          consume();
          return new ColumnToken();
        } else {
          return new DelimToken(code);
        }
      } else if (code === 125) {
        return new CloseCurlyToken();
      } else if (code === 126) {
        if (next() === 61) {
          consume();
          return new IncludeMatchToken();
        } else {
          return new DelimToken(code);
        }
      } else if (digit(code)) {
        reconsume();
        return consumeANumericToken();
      } else if (namestartchar(code)) {
        reconsume();
        return consumeAnIdentlikeToken();
      } else if (eof()) {
        return new EOFToken();
      } else {
        return new DelimToken(code);
      }
    };
    const consumeComments = function() {
      while (next(1) === 47 && next(2) === 42) {
        consume(2);
        while (true) {
          consume();
          if (code === 42 && next() === 47) {
            consume();
            break;
          } else if (eof()) {
            parseerror();
            return;
          }
        }
      }
    };
    const consumeANumericToken = function() {
      const num = consumeANumber();
      if (wouldStartAnIdentifier(next(1), next(2), next(3))) {
        const token = new DimensionToken();
        token.value = num.value;
        token.repr = num.repr;
        token.type = num.type;
        token.unit = consumeAName();
        return token;
      } else if (next() === 37) {
        consume();
        const token = new PercentageToken();
        token.value = num.value;
        token.repr = num.repr;
        return token;
      } else {
        const token = new NumberToken();
        token.value = num.value;
        token.repr = num.repr;
        token.type = num.type;
        return token;
      }
    };
    const consumeAnIdentlikeToken = function() {
      const str2 = consumeAName();
      if (str2.toLowerCase() === "url" && next() === 40) {
        consume();
        while (whitespace(next(1)) && whitespace(next(2)))
          consume();
        if (next() === 34 || next() === 39)
          return new FunctionToken(str2);
        else if (whitespace(next()) && (next(2) === 34 || next(2) === 39))
          return new FunctionToken(str2);
        else
          return consumeAURLToken();
      } else if (next() === 40) {
        consume();
        return new FunctionToken(str2);
      } else {
        return new IdentToken(str2);
      }
    };
    const consumeAStringToken = function(endingCodePoint) {
      if (endingCodePoint === void 0)
        endingCodePoint = code;
      let string = "";
      while (consume()) {
        if (code === endingCodePoint || eof()) {
          return new StringToken(string);
        } else if (newline(code)) {
          parseerror();
          reconsume();
          return new BadStringToken();
        } else if (code === 92) {
          if (eof(next()))
            donothing();
          else if (newline(next()))
            consume();
          else
            string += stringFromCode(consumeEscape());
        } else {
          string += stringFromCode(code);
        }
      }
      throw new Error("Internal error");
    };
    const consumeAURLToken = function() {
      const token = new URLToken("");
      while (whitespace(next()))
        consume();
      if (eof(next()))
        return token;
      while (consume()) {
        if (code === 41 || eof()) {
          return token;
        } else if (whitespace(code)) {
          while (whitespace(next()))
            consume();
          if (next() === 41 || eof(next())) {
            consume();
            return token;
          } else {
            consumeTheRemnantsOfABadURL();
            return new BadURLToken();
          }
        } else if (code === 34 || code === 39 || code === 40 || nonprintable(code)) {
          parseerror();
          consumeTheRemnantsOfABadURL();
          return new BadURLToken();
        } else if (code === 92) {
          if (startsWithAValidEscape()) {
            token.value += stringFromCode(consumeEscape());
          } else {
            parseerror();
            consumeTheRemnantsOfABadURL();
            return new BadURLToken();
          }
        } else {
          token.value += stringFromCode(code);
        }
      }
      throw new Error("Internal error");
    };
    const consumeEscape = function() {
      consume();
      if (hexdigit(code)) {
        const digits = [code];
        for (let total = 0; total < 5; total++) {
          if (hexdigit(next())) {
            consume();
            digits.push(code);
          } else {
            break;
          }
        }
        if (whitespace(next()))
          consume();
        let value = parseInt(digits.map(function(x) {
          return String.fromCharCode(x);
        }).join(""), 16);
        if (value > maximumallowedcodepoint)
          value = 65533;
        return value;
      } else if (eof()) {
        return 65533;
      } else {
        return code;
      }
    };
    const areAValidEscape = function(c1, c2) {
      if (c1 !== 92)
        return false;
      if (newline(c2))
        return false;
      return true;
    };
    const startsWithAValidEscape = function() {
      return areAValidEscape(code, next());
    };
    const wouldStartAnIdentifier = function(c1, c2, c3) {
      if (c1 === 45)
        return namestartchar(c2) || c2 === 45 || areAValidEscape(c2, c3);
      else if (namestartchar(c1))
        return true;
      else if (c1 === 92)
        return areAValidEscape(c1, c2);
      else
        return false;
    };
    const startsWithAnIdentifier = function() {
      return wouldStartAnIdentifier(code, next(1), next(2));
    };
    const wouldStartANumber = function(c1, c2, c3) {
      if (c1 === 43 || c1 === 45) {
        if (digit(c2))
          return true;
        if (c2 === 46 && digit(c3))
          return true;
        return false;
      } else if (c1 === 46) {
        if (digit(c2))
          return true;
        return false;
      } else if (digit(c1)) {
        return true;
      } else {
        return false;
      }
    };
    const startsWithANumber = function() {
      return wouldStartANumber(code, next(1), next(2));
    };
    const consumeAName = function() {
      let result = "";
      while (consume()) {
        if (namechar(code)) {
          result += stringFromCode(code);
        } else if (startsWithAValidEscape()) {
          result += stringFromCode(consumeEscape());
        } else {
          reconsume();
          return result;
        }
      }
      throw new Error("Internal parse error");
    };
    const consumeANumber = function() {
      let repr = "";
      let type = "integer";
      if (next() === 43 || next() === 45) {
        consume();
        repr += stringFromCode(code);
      }
      while (digit(next())) {
        consume();
        repr += stringFromCode(code);
      }
      if (next(1) === 46 && digit(next(2))) {
        consume();
        repr += stringFromCode(code);
        consume();
        repr += stringFromCode(code);
        type = "number";
        while (digit(next())) {
          consume();
          repr += stringFromCode(code);
        }
      }
      const c1 = next(1);
      const c2 = next(2);
      const c3 = next(3);
      if ((c1 === 69 || c1 === 101) && digit(c2)) {
        consume();
        repr += stringFromCode(code);
        consume();
        repr += stringFromCode(code);
        type = "number";
        while (digit(next())) {
          consume();
          repr += stringFromCode(code);
        }
      } else if ((c1 === 69 || c1 === 101) && (c2 === 43 || c2 === 45) && digit(c3)) {
        consume();
        repr += stringFromCode(code);
        consume();
        repr += stringFromCode(code);
        consume();
        repr += stringFromCode(code);
        type = "number";
        while (digit(next())) {
          consume();
          repr += stringFromCode(code);
        }
      }
      const value = convertAStringToANumber(repr);
      return { type, value, repr };
    };
    const convertAStringToANumber = function(string) {
      return +string;
    };
    const consumeTheRemnantsOfABadURL = function() {
      while (consume()) {
        if (code === 41 || eof()) {
          return;
        } else if (startsWithAValidEscape()) {
          consumeEscape();
          donothing();
        } else {
          donothing();
        }
      }
    };
    let iterationCount = 0;
    while (!eof(next())) {
      tokens.push(consumeAToken());
      iterationCount++;
      if (iterationCount > str.length * 2)
        throw new Error("I'm infinite-looping!");
    }
    return tokens;
  }
  var CSSParserToken = class {
    constructor() {
      this.tokenType = "";
    }
    toJSON() {
      return { token: this.tokenType };
    }
    toString() {
      return this.tokenType;
    }
    toSource() {
      return "" + this;
    }
  };
  var BadStringToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "BADSTRING";
    }
  };
  var BadURLToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "BADURL";
    }
  };
  var WhitespaceToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "WHITESPACE";
    }
    toString() {
      return "WS";
    }
    toSource() {
      return " ";
    }
  };
  var CDOToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "CDO";
    }
    toSource() {
      return "<!--";
    }
  };
  var CDCToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "CDC";
    }
    toSource() {
      return "-->";
    }
  };
  var ColonToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = ":";
    }
  };
  var SemicolonToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = ";";
    }
  };
  var CommaToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = ",";
    }
  };
  var GroupingToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.value = "";
      this.mirror = "";
    }
  };
  var OpenCurlyToken = class extends GroupingToken {
    constructor() {
      super();
      this.tokenType = "{";
      this.value = "{";
      this.mirror = "}";
    }
  };
  var CloseCurlyToken = class extends GroupingToken {
    constructor() {
      super();
      this.tokenType = "}";
      this.value = "}";
      this.mirror = "{";
    }
  };
  var OpenSquareToken = class extends GroupingToken {
    constructor() {
      super();
      this.tokenType = "[";
      this.value = "[";
      this.mirror = "]";
    }
  };
  var CloseSquareToken = class extends GroupingToken {
    constructor() {
      super();
      this.tokenType = "]";
      this.value = "]";
      this.mirror = "[";
    }
  };
  var OpenParenToken = class extends GroupingToken {
    constructor() {
      super();
      this.tokenType = "(";
      this.value = "(";
      this.mirror = ")";
    }
  };
  var CloseParenToken = class extends GroupingToken {
    constructor() {
      super();
      this.tokenType = ")";
      this.value = ")";
      this.mirror = "(";
    }
  };
  var IncludeMatchToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "~=";
    }
  };
  var DashMatchToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "|=";
    }
  };
  var PrefixMatchToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "^=";
    }
  };
  var SuffixMatchToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "$=";
    }
  };
  var SubstringMatchToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "*=";
    }
  };
  var ColumnToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "||";
    }
  };
  var EOFToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.tokenType = "EOF";
    }
    toSource() {
      return "";
    }
  };
  var DelimToken = class extends CSSParserToken {
    constructor(code) {
      super();
      this.tokenType = "DELIM";
      this.value = "";
      this.value = stringFromCode(code);
    }
    toString() {
      return "DELIM(" + this.value + ")";
    }
    toJSON() {
      const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
      json.value = this.value;
      return json;
    }
    toSource() {
      if (this.value === "\\")
        return "\\\n";
      else
        return this.value;
    }
  };
  var StringValuedToken = class extends CSSParserToken {
    constructor() {
      super(...arguments);
      this.value = "";
    }
    ASCIIMatch(str) {
      return this.value.toLowerCase() === str.toLowerCase();
    }
    toJSON() {
      const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
      json.value = this.value;
      return json;
    }
  };
  var IdentToken = class extends StringValuedToken {
    constructor(val) {
      super();
      this.tokenType = "IDENT";
      this.value = val;
    }
    toString() {
      return "IDENT(" + this.value + ")";
    }
    toSource() {
      return escapeIdent(this.value);
    }
  };
  var FunctionToken = class extends StringValuedToken {
    constructor(val) {
      super();
      this.tokenType = "FUNCTION";
      this.value = val;
      this.mirror = ")";
    }
    toString() {
      return "FUNCTION(" + this.value + ")";
    }
    toSource() {
      return escapeIdent(this.value) + "(";
    }
  };
  var AtKeywordToken = class extends StringValuedToken {
    constructor(val) {
      super();
      this.tokenType = "AT-KEYWORD";
      this.value = val;
    }
    toString() {
      return "AT(" + this.value + ")";
    }
    toSource() {
      return "@" + escapeIdent(this.value);
    }
  };
  var HashToken = class extends StringValuedToken {
    constructor(val) {
      super();
      this.tokenType = "HASH";
      this.value = val;
      this.type = "unrestricted";
    }
    toString() {
      return "HASH(" + this.value + ")";
    }
    toJSON() {
      const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
      json.value = this.value;
      json.type = this.type;
      return json;
    }
    toSource() {
      if (this.type === "id")
        return "#" + escapeIdent(this.value);
      else
        return "#" + escapeHash(this.value);
    }
  };
  var StringToken = class extends StringValuedToken {
    constructor(val) {
      super();
      this.tokenType = "STRING";
      this.value = val;
    }
    toString() {
      return '"' + escapeString(this.value) + '"';
    }
  };
  var URLToken = class extends StringValuedToken {
    constructor(val) {
      super();
      this.tokenType = "URL";
      this.value = val;
    }
    toString() {
      return "URL(" + this.value + ")";
    }
    toSource() {
      return 'url("' + escapeString(this.value) + '")';
    }
  };
  var NumberToken = class extends CSSParserToken {
    constructor() {
      super();
      this.tokenType = "NUMBER";
      this.type = "integer";
      this.repr = "";
    }
    toString() {
      if (this.type === "integer")
        return "INT(" + this.value + ")";
      return "NUMBER(" + this.value + ")";
    }
    toJSON() {
      const json = super.toJSON();
      json.value = this.value;
      json.type = this.type;
      json.repr = this.repr;
      return json;
    }
    toSource() {
      return this.repr;
    }
  };
  var PercentageToken = class extends CSSParserToken {
    constructor() {
      super();
      this.tokenType = "PERCENTAGE";
      this.repr = "";
    }
    toString() {
      return "PERCENTAGE(" + this.value + ")";
    }
    toJSON() {
      const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
      json.value = this.value;
      json.repr = this.repr;
      return json;
    }
    toSource() {
      return this.repr + "%";
    }
  };
  var DimensionToken = class extends CSSParserToken {
    constructor() {
      super();
      this.tokenType = "DIMENSION";
      this.type = "integer";
      this.repr = "";
      this.unit = "";
    }
    toString() {
      return "DIM(" + this.value + "," + this.unit + ")";
    }
    toJSON() {
      const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
      json.value = this.value;
      json.type = this.type;
      json.repr = this.repr;
      json.unit = this.unit;
      return json;
    }
    toSource() {
      const source = this.repr;
      let unit = escapeIdent(this.unit);
      if (unit[0].toLowerCase() === "e" && (unit[1] === "-" || between(unit.charCodeAt(1), 48, 57))) {
        unit = "\\65 " + unit.slice(1, unit.length);
      }
      return source + unit;
    }
  };
  function escapeIdent(string) {
    string = "" + string;
    let result = "";
    const firstcode = string.charCodeAt(0);
    for (let i = 0; i < string.length; i++) {
      const code = string.charCodeAt(i);
      if (code === 0)
        throw new InvalidCharacterError("Invalid character: the input contains U+0000.");
      if (between(code, 1, 31) || code === 127 || i === 0 && between(code, 48, 57) || i === 1 && between(code, 48, 57) && firstcode === 45)
        result += "\\" + code.toString(16) + " ";
      else if (code >= 128 || code === 45 || code === 95 || between(code, 48, 57) || between(code, 65, 90) || between(code, 97, 122))
        result += string[i];
      else
        result += "\\" + string[i];
    }
    return result;
  }
  function escapeHash(string) {
    string = "" + string;
    let result = "";
    for (let i = 0; i < string.length; i++) {
      const code = string.charCodeAt(i);
      if (code === 0)
        throw new InvalidCharacterError("Invalid character: the input contains U+0000.");
      if (code >= 128 || code === 45 || code === 95 || between(code, 48, 57) || between(code, 65, 90) || between(code, 97, 122))
        result += string[i];
      else
        result += "\\" + code.toString(16) + " ";
    }
    return result;
  }
  function escapeString(string) {
    string = "" + string;
    let result = "";
    for (let i = 0; i < string.length; i++) {
      const code = string.charCodeAt(i);
      if (code === 0)
        throw new InvalidCharacterError("Invalid character: the input contains U+0000.");
      if (between(code, 1, 31) || code === 127)
        result += "\\" + code.toString(16) + " ";
      else if (code === 34 || code === 92)
        result += "\\" + string[i];
      else
        result += string[i];
    }
    return result;
  }
  function hasExplicitAccessibleName(e) {
    return e.hasAttribute("aria-label") || e.hasAttribute("aria-labelledby");
  }
  var kAncestorPreventingLandmark = "article:not([role]), aside:not([role]), main:not([role]), nav:not([role]), section:not([role]), [role=article], [role=complementary], [role=main], [role=navigation], [role=region]";
  var kGlobalAriaAttributes = [
    ["aria-atomic", void 0],
    ["aria-busy", void 0],
    ["aria-controls", void 0],
    ["aria-current", void 0],
    ["aria-describedby", void 0],
    ["aria-details", void 0],
    // Global use deprecated in ARIA 1.2
    // ['aria-disabled', undefined],
    ["aria-dropeffect", void 0],
    // Global use deprecated in ARIA 1.2
    // ['aria-errormessage', undefined],
    ["aria-flowto", void 0],
    ["aria-grabbed", void 0],
    // Global use deprecated in ARIA 1.2
    // ['aria-haspopup', undefined],
    ["aria-hidden", void 0],
    // Global use deprecated in ARIA 1.2
    // ['aria-invalid', undefined],
    ["aria-keyshortcuts", void 0],
    ["aria-label", ["caption", "code", "deletion", "emphasis", "generic", "insertion", "paragraph", "presentation", "strong", "subscript", "superscript"]],
    ["aria-labelledby", ["caption", "code", "deletion", "emphasis", "generic", "insertion", "paragraph", "presentation", "strong", "subscript", "superscript"]],
    ["aria-live", void 0],
    ["aria-owns", void 0],
    ["aria-relevant", void 0],
    ["aria-roledescription", ["generic"]]
  ];
  function hasGlobalAriaAttribute(element, forRole) {
    return kGlobalAriaAttributes.some(([attr, prohibited]) => {
      return !prohibited?.includes(forRole || "") && element.hasAttribute(attr);
    });
  }
  function hasTabIndex(element) {
    return !Number.isNaN(Number(String(element.getAttribute("tabindex"))));
  }
  function isFocusable(element) {
    return !isNativelyDisabled(element) && (isNativelyFocusable(element) || hasTabIndex(element));
  }
  function isNativelyFocusable(element) {
    const tagName = elementSafeTagName(element);
    if (["BUTTON", "DETAILS", "SELECT", "TEXTAREA"].includes(tagName))
      return true;
    if (tagName === "A" || tagName === "AREA")
      return element.hasAttribute("href");
    if (tagName === "INPUT")
      return !element.hidden;
    return false;
  }
  var kImplicitRoleByTagName = {
    "A": (e) => {
      return e.hasAttribute("href") ? "link" : null;
    },
    "AREA": (e) => {
      return e.hasAttribute("href") ? "link" : null;
    },
    "ARTICLE": () => "article",
    "ASIDE": () => "complementary",
    "BLOCKQUOTE": () => "blockquote",
    "BUTTON": () => "button",
    "CAPTION": () => "caption",
    "CODE": () => "code",
    "DATALIST": () => "listbox",
    "DD": () => "definition",
    "DEL": () => "deletion",
    "DETAILS": () => "group",
    "DFN": () => "term",
    "DIALOG": () => "dialog",
    "DT": () => "term",
    "EM": () => "emphasis",
    "FIELDSET": () => "group",
    "FIGURE": () => "figure",
    "FOOTER": (e) => closestCrossShadow(e, kAncestorPreventingLandmark) ? null : "contentinfo",
    "FORM": (e) => hasExplicitAccessibleName(e) ? "form" : null,
    "H1": () => "heading",
    "H2": () => "heading",
    "H3": () => "heading",
    "H4": () => "heading",
    "H5": () => "heading",
    "H6": () => "heading",
    "HEADER": (e) => closestCrossShadow(e, kAncestorPreventingLandmark) ? null : "banner",
    "HR": () => "separator",
    "HTML": () => "document",
    "IMG": (e) => e.getAttribute("alt") === "" && !e.getAttribute("title") && !hasGlobalAriaAttribute(e) && !hasTabIndex(e) ? "presentation" : "img",
    "INPUT": (e) => {
      const type = e.type.toLowerCase();
      if (["email", "search", "tel", "text", "url", ""].includes(type)) {
        const list = getIdRefs(e, e.getAttribute("list"))[0];
        if (list && elementSafeTagName(list) === "DATALIST")
          return "combobox";
        return type === "search" ? "searchbox" : "textbox";
      }
      if (type === "hidden")
        return null;
      if (type === "file")
        return "button";
      return inputTypeToRole[type] || "textbox";
    },
    "INS": () => "insertion",
    "LI": () => "listitem",
    "MAIN": () => "main",
    "MARK": () => "mark",
    "MATH": () => "math",
    "MENU": () => "list",
    "METER": () => "meter",
    "NAV": () => "navigation",
    "OL": () => "list",
    "OPTGROUP": () => "group",
    "OPTION": () => "option",
    "OUTPUT": () => "status",
    "P": () => "paragraph",
    "PROGRESS": () => "progressbar",
    "SEARCH": () => "search",
    "SECTION": (e) => hasExplicitAccessibleName(e) ? "region" : null,
    "SELECT": (e) => e.hasAttribute("multiple") || e.size > 1 ? "listbox" : "combobox",
    "STRONG": () => "strong",
    "SUB": () => "subscript",
    "SUP": () => "superscript",
    // For <svg> we default to Chrome behavior:
    // - Chrome reports 'img'.
    // - Firefox reports 'diagram' that is not in official ARIA spec yet.
    // - Safari reports 'no role', but still computes accessible name.
    "SVG": () => "img",
    "TABLE": () => "table",
    "TBODY": () => "rowgroup",
    "TD": (e) => {
      const table = closestCrossShadow(e, "table");
      const role = table ? getExplicitAriaRole(table) : "";
      return role === "grid" || role === "treegrid" ? "gridcell" : "cell";
    },
    "TEXTAREA": () => "textbox",
    "TFOOT": () => "rowgroup",
    "TH": (e) => {
      const scope = e.getAttribute("scope");
      if (scope === "col" || scope === "colgroup")
        return "columnheader";
      if (scope === "row" || scope === "rowgroup")
        return "rowheader";
      const nextSibling = e.nextElementSibling;
      const prevSibling = e.previousElementSibling;
      const row = !!e.parentElement && elementSafeTagName(e.parentElement) === "TR" ? e.parentElement : void 0;
      if (!nextSibling && !prevSibling) {
        if (row) {
          const table = closestCrossShadow(row, "table");
          if (table && table.rows.length <= 1)
            return null;
        }
        return "columnheader";
      }
      if (isHeaderCell(nextSibling) && isHeaderCell(prevSibling))
        return "columnheader";
      if (isNonEmptyDataCell(nextSibling) || isNonEmptyDataCell(prevSibling))
        return "rowheader";
      return "columnheader";
    },
    "THEAD": () => "rowgroup",
    "TIME": () => "time",
    "TR": () => "row",
    "UL": () => "list"
  };
  function isHeaderCell(element) {
    return !!element && elementSafeTagName(element) === "TH";
  }
  function isNonEmptyDataCell(element) {
    if (!element || elementSafeTagName(element) !== "TD")
      return false;
    return !!(element.textContent?.trim() || element.children.length > 0);
  }
  var kPresentationInheritanceParents = {
    "DD": ["DL", "DIV"],
    "DIV": ["DL"],
    "DT": ["DL", "DIV"],
    "LI": ["OL", "UL"],
    "TBODY": ["TABLE"],
    "TD": ["TR"],
    "TFOOT": ["TABLE"],
    "TH": ["TR"],
    "THEAD": ["TABLE"],
    "TR": ["THEAD", "TBODY", "TFOOT", "TABLE"]
  };
  function getImplicitAriaRole(element) {
    const implicitRole = kImplicitRoleByTagName[elementSafeTagName(element)]?.(element) || "";
    if (!implicitRole)
      return null;
    let ancestor = element;
    while (ancestor) {
      const parent = parentElementOrShadowHost(ancestor);
      const parents = kPresentationInheritanceParents[elementSafeTagName(ancestor)];
      if (!parents || !parent || !parents.includes(elementSafeTagName(parent)))
        break;
      const parentExplicitRole = getExplicitAriaRole(parent);
      if ((parentExplicitRole === "none" || parentExplicitRole === "presentation") && !hasPresentationConflictResolution(parent, parentExplicitRole))
        return parentExplicitRole;
      ancestor = parent;
    }
    return implicitRole;
  }
  var validRoles = [
    "alert",
    "alertdialog",
    "application",
    "article",
    "banner",
    "blockquote",
    "button",
    "caption",
    "cell",
    "checkbox",
    "code",
    "columnheader",
    "combobox",
    "complementary",
    "contentinfo",
    "definition",
    "deletion",
    "dialog",
    "directory",
    "document",
    "emphasis",
    "feed",
    "figure",
    "form",
    "generic",
    "grid",
    "gridcell",
    "group",
    "heading",
    "img",
    "insertion",
    "link",
    "list",
    "listbox",
    "listitem",
    "log",
    "main",
    "mark",
    "marquee",
    "math",
    "meter",
    "menu",
    "menubar",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "navigation",
    "none",
    "note",
    "option",
    "paragraph",
    "presentation",
    "progressbar",
    "radio",
    "radiogroup",
    "region",
    "row",
    "rowgroup",
    "rowheader",
    "scrollbar",
    "search",
    "searchbox",
    "separator",
    "slider",
    "spinbutton",
    "status",
    "strong",
    "subscript",
    "superscript",
    "switch",
    "tab",
    "table",
    "tablist",
    "tabpanel",
    "term",
    "textbox",
    "time",
    "timer",
    "toolbar",
    "tooltip",
    "tree",
    "treegrid",
    "treeitem"
  ];
  function getExplicitAriaRole(element) {
    const roles = (element.getAttribute("role") || "").split(" ").map((role) => role.trim());
    return roles.find((role) => validRoles.includes(role)) || null;
  }
  function hasPresentationConflictResolution(element, role) {
    return hasGlobalAriaAttribute(element, role) || isFocusable(element);
  }
  function getAriaRole(element) {
    const cached = cacheAriaRole?.get(element);
    if (cached !== void 0)
      return cached;
    const role = computeAriaRole(element);
    cacheAriaRole?.set(element, role);
    return role;
  }
  function computeAriaRole(element) {
    const explicitRole = getExplicitAriaRole(element);
    if (!explicitRole)
      return getImplicitAriaRole(element);
    if (explicitRole === "none" || explicitRole === "presentation") {
      const implicitRole = getImplicitAriaRole(element);
      if (hasPresentationConflictResolution(element, implicitRole))
        return implicitRole;
    }
    return explicitRole;
  }
  function getAriaBoolean(attr) {
    return attr === null ? void 0 : attr.toLowerCase() === "true";
  }
  function isElementIgnoredForAria(element) {
    return ["STYLE", "SCRIPT", "NOSCRIPT", "TEMPLATE"].includes(elementSafeTagName(element));
  }
  function isElementHiddenForAria(element) {
    if (isElementIgnoredForAria(element))
      return true;
    const style = getElementComputedStyle(element);
    const isSlot = element.nodeName === "SLOT";
    if (style?.display === "contents" && !isSlot) {
      for (let child = element.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === 1 && !isElementHiddenForAria(child))
          return false;
        if (child.nodeType === 3 && isVisibleTextNode(child))
          return false;
      }
      return true;
    }
    const isOptionInsideSelect = element.nodeName === "OPTION" && !!element.closest("select");
    if (!isOptionInsideSelect && !isSlot && !isElementStyleVisibilityVisible(element, style))
      return true;
    return belongsToDisplayNoneOrAriaHiddenOrNonSlotted(element);
  }
  function belongsToDisplayNoneOrAriaHiddenOrNonSlotted(element) {
    let hidden = cacheIsHidden?.get(element);
    if (hidden === void 0) {
      hidden = false;
      if (element.parentElement && element.parentElement.shadowRoot && !element.assignedSlot)
        hidden = true;
      if (!hidden) {
        const style = getElementComputedStyle(element);
        hidden = !style || style.display === "none" || getAriaBoolean(element.getAttribute("aria-hidden")) === true;
      }
      if (!hidden) {
        const parent = parentElementOrShadowHost(element);
        if (parent)
          hidden = belongsToDisplayNoneOrAriaHiddenOrNonSlotted(parent);
      }
      cacheIsHidden?.set(element, hidden);
    }
    return hidden;
  }
  function getIdRefs(element, ref) {
    if (!ref)
      return [];
    const root = enclosingShadowRootOrDocument(element);
    if (!root)
      return [];
    try {
      const ids = ref.split(" ").filter((id) => !!id);
      const result = [];
      for (const id of ids) {
        const firstElement = root.querySelector("#" + CSS.escape(id));
        if (firstElement && !result.includes(firstElement))
          result.push(firstElement);
      }
      return result;
    } catch (e) {
      return [];
    }
  }
  function trimFlatString(s) {
    return s.trim();
  }
  function asFlatString(s) {
    return s.split("\xA0").map((chunk) => chunk.replace(/\r\n/g, "\n").replace(/[\u200b\u00ad]/g, "").replace(/\s\s*/g, " ")).join("\xA0").trim();
  }
  function queryInAriaOwned(element, selector) {
    const result = [...element.querySelectorAll(selector)];
    for (const owned of getIdRefs(element, element.getAttribute("aria-owns"))) {
      if (owned.matches(selector))
        result.push(owned);
      result.push(...owned.querySelectorAll(selector));
    }
    return result;
  }
  function getCSSContent(element, pseudo) {
    const cache = pseudo === "::before" ? cachePseudoContentBefore : pseudo === "::after" ? cachePseudoContentAfter : cachePseudoContent;
    if (cache?.has(element))
      return cache?.get(element);
    const style = getElementComputedStyle(element, pseudo);
    let content;
    if (style) {
      const contentValue = style.content;
      if (contentValue && contentValue !== "none" && contentValue !== "normal") {
        if (style.display !== "none" && style.visibility !== "hidden") {
          content = parseCSSContentPropertyAsString(element, contentValue, !!pseudo);
        }
      }
    }
    if (pseudo && content !== void 0) {
      const display = style?.display || "inline";
      if (display !== "inline")
        content = " " + content + " ";
    }
    if (cache)
      cache.set(element, content);
    return content;
  }
  function parseCSSContentPropertyAsString(element, content, isPseudo) {
    if (!content || content === "none" || content === "normal") {
      return;
    }
    try {
      let tokens = tokenize(content).filter((token) => !(token instanceof WhitespaceToken));
      const delimIndex = tokens.findIndex((token) => token instanceof DelimToken && token.value === "/");
      if (delimIndex !== -1) {
        tokens = tokens.slice(delimIndex + 1);
      } else if (!isPseudo) {
        return;
      }
      const accumulated = [];
      let index = 0;
      while (index < tokens.length) {
        if (tokens[index] instanceof StringToken) {
          accumulated.push(tokens[index].value);
          index++;
        } else if (index + 2 < tokens.length && tokens[index] instanceof FunctionToken && tokens[index].value === "attr" && tokens[index + 1] instanceof IdentToken && tokens[index + 2] instanceof CloseParenToken) {
          const attrName = tokens[index + 1].value;
          accumulated.push(element.getAttribute(attrName) || "");
          index += 3;
        } else {
          return;
        }
      }
      return accumulated.join("");
    } catch {
    }
  }
  function getAriaLabelledByElements(element) {
    const ref = element.getAttribute("aria-labelledby");
    if (ref === null)
      return null;
    const refs = getIdRefs(element, ref);
    return refs.length ? refs : null;
  }
  function allowsNameFromContent(role, targetDescendant) {
    const alwaysAllowsNameFromContent = ["button", "cell", "checkbox", "columnheader", "gridcell", "heading", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "radio", "row", "rowheader", "switch", "tab", "tooltip", "treeitem"].includes(role);
    const descendantAllowsNameFromContent = targetDescendant && ["", "caption", "code", "contentinfo", "definition", "deletion", "emphasis", "insertion", "list", "listitem", "mark", "none", "paragraph", "presentation", "region", "row", "rowgroup", "section", "strong", "subscript", "superscript", "table", "term", "time"].includes(role);
    return alwaysAllowsNameFromContent || descendantAllowsNameFromContent;
  }
  function computeAccessibleNameComposite(element, includeHidden, collectElements) {
    const elementProhibitsNaming = ["caption", "code", "definition", "deletion", "emphasis", "generic", "insertion", "mark", "paragraph", "presentation", "strong", "subscript", "suggestion", "superscript", "term", "time"].includes(getAriaRole(element) || "");
    if (elementProhibitsNaming)
      return { ...emptyCompositeString(), derivedFromContent: false };
    const outDerivedFromContent = { value: false };
    const result = getTextAlternativeInternal(element, {
      includeHidden,
      collectElements,
      outDerivedFromContent,
      visitedElements: /* @__PURE__ */ new Set(),
      embeddedInTargetElement: "self"
    });
    return { text: asFlatString(result.text), elements: result.elements, derivedFromContent: outDerivedFromContent.value };
  }
  function getElementAccessibleName(element, includeHidden) {
    const cache = includeHidden ? cacheAccessibleNameHidden : cacheAccessibleName;
    let accessibleName = cache?.get(element);
    if (accessibleName === void 0) {
      accessibleName = computeAccessibleNameComposite(
        element,
        includeHidden,
        true
        /* collectElements */
      );
      cache?.set(element, accessibleName);
    }
    return accessibleName;
  }
  function getElementAccessibleNameText(element, includeHidden) {
    const composite = (includeHidden ? cacheAccessibleNameHidden : cacheAccessibleName)?.get(element);
    if (composite !== void 0)
      return composite.text;
    const cache = includeHidden ? cacheAccessibleNameTextHidden : cacheAccessibleNameText;
    let text = cache?.get(element);
    if (text === void 0) {
      text = computeAccessibleNameComposite(
        element,
        includeHidden,
        false
        /* collectElements */
      ).text;
      cache?.set(element, text);
    }
    return text;
  }
  function getElementAccessibleDescription(element, includeHidden) {
    const cache = includeHidden ? cacheAccessibleDescriptionHidden : cacheAccessibleDescription;
    let accessibleDescription = cache?.get(element);
    if (accessibleDescription === void 0) {
      accessibleDescription = { text: "", derivedFromContent: false };
      if (element.hasAttribute("aria-describedby")) {
        const describedBy = getIdRefs(element, element.getAttribute("aria-describedby"));
        accessibleDescription.text = asFlatString(describedBy.map((ref) => getTextAlternativeInternal(ref, {
          includeHidden,
          visitedElements: /* @__PURE__ */ new Set(),
          embeddedInDescribedBy: { element: ref, hidden: isElementHiddenForAria(ref) }
        }).text).join(" "));
        accessibleDescription.derivedFromContent = describedBy.some((ref) => ref === element || element.contains(ref));
      } else if (element.hasAttribute("aria-description")) {
        accessibleDescription.text = asFlatString(element.getAttribute("aria-description") || "");
      } else {
        accessibleDescription.text = asFlatString(element.getAttribute("title") || "");
      }
      cache?.set(element, accessibleDescription);
    }
    return accessibleDescription;
  }
  var kAriaInvalidRoles = [
    "application",
    "checkbox",
    "columnheader",
    "combobox",
    "gridcell",
    "listbox",
    "radiogroup",
    "rowheader",
    "searchbox",
    "slider",
    "spinbutton",
    "switch",
    "textbox",
    "tree"
  ];
  function getAriaInvalid(element) {
    const ariaInvalid = element.getAttribute("aria-invalid");
    if (!ariaInvalid || ariaInvalid.trim() === "" || ariaInvalid.toLocaleLowerCase() === "false")
      return "false";
    if (ariaInvalid === "true" || ariaInvalid === "grammar" || ariaInvalid === "spelling")
      return ariaInvalid;
    return "true";
  }
  function getValidityInvalid(element) {
    if ("validity" in element) {
      const validity = element.validity;
      return validity?.valid === false;
    }
    return false;
  }
  function getElementAccessibleErrorMessage(element) {
    const cache = cacheAccessibleErrorMessage;
    let accessibleErrorMessage = cacheAccessibleErrorMessage?.get(element);
    if (accessibleErrorMessage === void 0) {
      accessibleErrorMessage = "";
      const isAriaInvalid = getAriaInvalid(element) !== "false";
      const isValidityInvalid = getValidityInvalid(element);
      if (isAriaInvalid || isValidityInvalid) {
        const errorMessageId = element.getAttribute("aria-errormessage");
        const errorMessages = getIdRefs(element, errorMessageId);
        const parts = errorMessages.map((errorMessage) => asFlatString(
          getTextAlternativeInternal(errorMessage, {
            visitedElements: /* @__PURE__ */ new Set(),
            embeddedInDescribedBy: { element: errorMessage, hidden: isElementHiddenForAria(errorMessage) }
          }).text
        ));
        accessibleErrorMessage = parts.join(" ").trim();
      }
      cache?.set(element, accessibleErrorMessage);
    }
    return accessibleErrorMessage;
  }
  function insideTargetElement(options) {
    return options.embeddedInTargetElement === "self" || options.embeddedInTargetElement === "descendant";
  }
  function getTextAlternativeInternal(element, options) {
    if (options.visitedElements.has(element))
      return emptyCompositeString();
    const childOptions = {
      ...options,
      embeddedInTargetElement: options.embeddedInTargetElement === "self" ? "descendant" : options.embeddedInTargetElement
    };
    if (!options.includeHidden) {
      const isEmbeddedInHiddenReferenceTraversal = !!options.embeddedInLabelledBy?.hidden || !!options.embeddedInDescribedBy?.hidden || !!options.embeddedInNativeTextAlternative?.hidden || !!options.embeddedInLabel?.hidden;
      if (isElementIgnoredForAria(element) || !isEmbeddedInHiddenReferenceTraversal && isElementHiddenForAria(element)) {
        options.visitedElements.add(element);
        return emptyCompositeString();
      }
    }
    const labelledBy = getAriaLabelledByElements(element);
    if (!options.embeddedInLabelledBy) {
      const accessibleName = joinCompositeString((labelledBy || []).map((ref) => getTextAlternativeInternal(ref, {
        ...options,
        embeddedInLabelledBy: { element: ref, hidden: isElementHiddenForAria(ref) },
        embeddedInDescribedBy: void 0,
        embeddedInTargetElement: void 0,
        embeddedInLabel: void 0,
        embeddedInNativeTextAlternative: void 0
      })), " ", options.collectElements);
      if (accessibleName.text) {
        if (options.outDerivedFromContent && insideTargetElement(options) && (labelledBy || []).some((ref) => ref === element || element.contains(ref)))
          options.outDerivedFromContent.value = true;
        return accessibleName;
      }
    }
    const role = getAriaRole(element) || "";
    const tagName = elementSafeTagName(element);
    if (!!options.embeddedInLabel || !!options.embeddedInLabelledBy || options.embeddedInTargetElement === "descendant") {
      const isOwnLabel = [...element.labels || []].includes(element);
      const isOwnLabelledBy = (labelledBy || []).includes(element);
      if (!isOwnLabel && !isOwnLabelledBy) {
        if (role === "textbox") {
          options.visitedElements.add(element);
          if (tagName === "INPUT" || tagName === "TEXTAREA")
            return compositeString(element.value, element, options.collectElements);
          return compositeString(element.textContent, element, options.collectElements);
        }
        if (["combobox", "listbox"].includes(role)) {
          options.visitedElements.add(element);
          let selectedOptions;
          if (tagName === "SELECT") {
            selectedOptions = [...element.selectedOptions];
            if (!selectedOptions.length && element.options.length)
              selectedOptions.push(element.options[0]);
          } else {
            const listbox = role === "combobox" ? queryInAriaOwned(element, "*").find((e) => getAriaRole(e) === "listbox") : element;
            selectedOptions = listbox ? queryInAriaOwned(listbox, '[aria-selected="true"]').filter((e) => getAriaRole(e) === "option") : [];
          }
          if (!selectedOptions.length && tagName === "INPUT") {
            return compositeString(element.value, element, options.collectElements);
          }
          return joinCompositeString(selectedOptions.map((option) => getTextAlternativeInternal(option, childOptions)), " ", options.collectElements);
        }
        if (["progressbar", "scrollbar", "slider", "spinbutton", "meter"].includes(role)) {
          options.visitedElements.add(element);
          if (element.hasAttribute("aria-valuetext"))
            return compositeString(element.getAttribute("aria-valuetext"), element, options.collectElements);
          if (element.hasAttribute("aria-valuenow"))
            return compositeString(element.getAttribute("aria-valuenow"), element, options.collectElements);
          return compositeString(element.getAttribute("value"), element, options.collectElements);
        }
        if (["menu"].includes(role)) {
          options.visitedElements.add(element);
          return emptyCompositeString();
        }
      }
    }
    const ariaLabel = element.getAttribute("aria-label") || "";
    if (trimFlatString(ariaLabel)) {
      options.visitedElements.add(element);
      return compositeString(ariaLabel, element, options.collectElements);
    }
    if (!["presentation", "none"].includes(role)) {
      if (tagName === "INPUT" && ["button", "submit", "reset"].includes(element.type)) {
        options.visitedElements.add(element);
        const value = element.value || "";
        if (trimFlatString(value))
          return compositeString(value, element, options.collectElements);
        if (element.type === "submit")
          return compositeString("Submit", element, options.collectElements);
        if (element.type === "reset")
          return compositeString("Reset", element, options.collectElements);
        const title = element.getAttribute("title") || "";
        return compositeString(title, element, options.collectElements);
      }
      if (tagName === "INPUT" && element.type === "file") {
        options.visitedElements.add(element);
        const labels = element.labels || [];
        if (labels.length && !options.embeddedInLabelledBy)
          return getAccessibleNameFromAssociatedLabels(labels, options);
        return compositeString("Choose File", element, options.collectElements);
      }
      if (tagName === "INPUT" && element.type === "image") {
        options.visitedElements.add(element);
        const labels = element.labels || [];
        if (labels.length && !options.embeddedInLabelledBy)
          return getAccessibleNameFromAssociatedLabels(labels, options);
        const alt = element.getAttribute("alt") || "";
        if (trimFlatString(alt))
          return compositeString(alt, element, options.collectElements);
        const title = element.getAttribute("title") || "";
        if (trimFlatString(title))
          return compositeString(title, element, options.collectElements);
        return compositeString("Submit", element, options.collectElements);
      }
      if (!labelledBy && tagName === "BUTTON") {
        options.visitedElements.add(element);
        const labels = element.labels || [];
        if (labels.length)
          return getAccessibleNameFromAssociatedLabels(labels, options);
      }
      if (!labelledBy && tagName === "OUTPUT") {
        options.visitedElements.add(element);
        const labels = element.labels || [];
        if (labels.length)
          return getAccessibleNameFromAssociatedLabels(labels, options);
        return compositeString(element.getAttribute("title") || "", element, options.collectElements);
      }
      if (!labelledBy && (tagName === "TEXTAREA" || tagName === "SELECT" || tagName === "INPUT" || tagName === "METER" || tagName === "PROGRESS")) {
        options.visitedElements.add(element);
        const labels = element.labels || [];
        if (labels.length)
          return getAccessibleNameFromAssociatedLabels(labels, options);
        const usePlaceholder = tagName === "INPUT" && ["text", "password", "number", "search", "tel", "email", "url"].includes(element.type) || tagName === "TEXTAREA";
        const placeholder = element.getAttribute("placeholder") || "";
        const title = element.getAttribute("title") || "";
        if (!usePlaceholder || title)
          return compositeString(title, element, options.collectElements);
        return compositeString(placeholder, element, options.collectElements);
      }
      if (!labelledBy && tagName === "FIELDSET") {
        options.visitedElements.add(element);
        for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
          if (elementSafeTagName(child) === "LEGEND") {
            return getTextAlternativeInternal(child, {
              ...childOptions,
              embeddedInNativeTextAlternative: { element: child, hidden: isElementHiddenForAria(child) }
            });
          }
        }
        const title = element.getAttribute("title") || "";
        return compositeString(title, element, options.collectElements);
      }
      if (!labelledBy && tagName === "FIGURE") {
        options.visitedElements.add(element);
        for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
          if (elementSafeTagName(child) === "FIGCAPTION") {
            return getTextAlternativeInternal(child, {
              ...childOptions,
              embeddedInNativeTextAlternative: { element: child, hidden: isElementHiddenForAria(child) }
            });
          }
        }
        const title = element.getAttribute("title") || "";
        return compositeString(title, element, options.collectElements);
      }
      if (tagName === "IMG") {
        options.visitedElements.add(element);
        const alt = element.getAttribute("alt") || "";
        if (trimFlatString(alt))
          return compositeString(alt, element, options.collectElements);
        const title = element.getAttribute("title") || "";
        return compositeString(title, element, options.collectElements);
      }
      if (tagName === "TABLE") {
        options.visitedElements.add(element);
        for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
          if (elementSafeTagName(child) === "CAPTION") {
            return getTextAlternativeInternal(child, {
              ...childOptions,
              embeddedInNativeTextAlternative: { element: child, hidden: isElementHiddenForAria(child) }
            });
          }
        }
        const summary = element.getAttribute("summary") || "";
        if (summary)
          return compositeString(summary, element, options.collectElements);
      }
      if (tagName === "AREA") {
        options.visitedElements.add(element);
        const alt = element.getAttribute("alt") || "";
        if (trimFlatString(alt))
          return compositeString(alt, element, options.collectElements);
        const title = element.getAttribute("title") || "";
        return compositeString(title, element, options.collectElements);
      }
      if (tagName === "SVG" || element.ownerSVGElement) {
        options.visitedElements.add(element);
        for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
          if (elementSafeTagName(child) === "TITLE" && child.ownerSVGElement) {
            return getTextAlternativeInternal(child, {
              ...childOptions,
              embeddedInLabelledBy: { element: child, hidden: isElementHiddenForAria(child) }
            });
          }
        }
      }
      if (element.ownerSVGElement && tagName === "A") {
        const title = element.getAttribute("xlink:title") || "";
        if (trimFlatString(title)) {
          options.visitedElements.add(element);
          return compositeString(title, element, options.collectElements);
        }
      }
    }
    const shouldNameFromContentForSummary = tagName === "SUMMARY" && !["presentation", "none"].includes(role);
    if (allowsNameFromContent(role, options.embeddedInTargetElement === "descendant") || shouldNameFromContentForSummary || !!options.embeddedInLabelledBy || !!options.embeddedInDescribedBy || !!options.embeddedInLabel || !!options.embeddedInNativeTextAlternative) {
      options.visitedElements.add(element);
      const accessibleName = innerAccumulatedElementText(element, childOptions);
      const maybeTrimmedAccessibleName = options.embeddedInTargetElement === "self" ? trimFlatString(accessibleName.text) : accessibleName.text;
      if (maybeTrimmedAccessibleName) {
        if (options.outDerivedFromContent && insideTargetElement(options) && trimFlatString(accessibleName.text))
          options.outDerivedFromContent.value = true;
        accessibleName.elements?.add(element);
        return accessibleName;
      }
    }
    if (!["presentation", "none"].includes(role) || tagName === "IFRAME" || tagName === "FRAME") {
      options.visitedElements.add(element);
      const title = element.getAttribute("title") || "";
      if (trimFlatString(title))
        return compositeString(title, element, options.collectElements);
    }
    options.visitedElements.add(element);
    return emptyCompositeString();
  }
  function innerAccumulatedElementText(element, options) {
    const tokens = [];
    const elements = options.collectElements ? /* @__PURE__ */ new Set() : void 0;
    const visit = (node, skipSlotted) => {
      if (skipSlotted && node.assignedSlot)
        return;
      if (node.nodeType === 1) {
        const display = getElementComputedStyle(node)?.display || "inline";
        const childComposite = getTextAlternativeInternal(node, options);
        let token = childComposite.text;
        for (const contributor of childComposite.elements || [])
          elements?.add(contributor);
        if (display !== "inline" || node.nodeName === "BR")
          token = " " + token + " ";
        tokens.push(token);
      } else if (node.nodeType === 3) {
        tokens.push(node.textContent || "");
      }
    };
    tokens.push(getCSSContent(element, "::before") || "");
    const content = getCSSContent(element);
    if (content !== void 0) {
      tokens.push(content);
    } else {
      const assignedNodes = element.nodeName === "SLOT" ? element.assignedNodes() : [];
      if (assignedNodes.length) {
        for (const child of assignedNodes)
          visit(child, false);
      } else {
        for (let child = element.firstChild; child; child = child.nextSibling)
          visit(child, true);
        if (element.shadowRoot) {
          for (let child = element.shadowRoot.firstChild; child; child = child.nextSibling)
            visit(child, true);
        }
        for (const owned of getIdRefs(element, element.getAttribute("aria-owns")))
          visit(owned, true);
      }
    }
    tokens.push(getCSSContent(element, "::after") || "");
    return { text: tokens.join(""), elements };
  }
  var kAriaSelectedRoles = ["gridcell", "option", "row", "tab", "rowheader", "columnheader", "treeitem"];
  function getAriaSelected(element) {
    if (elementSafeTagName(element) === "OPTION")
      return element.selected;
    if (kAriaSelectedRoles.includes(getAriaRole(element) || ""))
      return getAriaBoolean(element.getAttribute("aria-selected")) === true;
    return false;
  }
  var kAriaCheckedRoles = ["checkbox", "menuitemcheckbox", "option", "radio", "switch", "menuitemradio", "treeitem"];
  function getAriaChecked(element) {
    const result = getChecked(element, true);
    return result === "error" ? false : result;
  }
  function getCheckedAllowMixed(element) {
    return getChecked(element, true);
  }
  function getCheckedWithoutMixed(element) {
    const result = getChecked(element, false);
    return result;
  }
  function getChecked(element, allowMixed) {
    const tagName = elementSafeTagName(element);
    if (allowMixed && tagName === "INPUT" && element.indeterminate)
      return "mixed";
    if (tagName === "INPUT" && ["checkbox", "radio"].includes(element.type))
      return element.checked;
    if (kAriaCheckedRoles.includes(getAriaRole(element) || "")) {
      const checked = element.getAttribute("aria-checked");
      if (checked === "true")
        return true;
      if (allowMixed && checked === "mixed")
        return "mixed";
      return false;
    }
    return "error";
  }
  var kAriaReadonlyRoles = ["checkbox", "combobox", "grid", "gridcell", "listbox", "radiogroup", "slider", "spinbutton", "textbox", "columnheader", "rowheader", "searchbox", "switch", "treegrid"];
  function getReadonly(element) {
    const tagName = elementSafeTagName(element);
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName))
      return element.hasAttribute("readonly");
    if (kAriaReadonlyRoles.includes(getAriaRole(element) || ""))
      return element.getAttribute("aria-readonly") === "true";
    if (element.isContentEditable)
      return false;
    return "error";
  }
  var kAriaPressedRoles = ["button"];
  function getAriaPressed(element) {
    if (kAriaPressedRoles.includes(getAriaRole(element) || "")) {
      const pressed = element.getAttribute("aria-pressed");
      if (pressed === "true")
        return true;
      if (pressed === "mixed")
        return "mixed";
    }
    return false;
  }
  var kAriaExpandedRoles = ["application", "button", "checkbox", "combobox", "gridcell", "link", "listbox", "menuitem", "row", "rowheader", "tab", "treeitem", "columnheader", "menuitemcheckbox", "menuitemradio", "rowheader", "switch"];
  function getAriaExpanded(element) {
    if (elementSafeTagName(element) === "DETAILS")
      return element.open;
    if (kAriaExpandedRoles.includes(getAriaRole(element) || "")) {
      const expanded = element.getAttribute("aria-expanded");
      if (expanded === null)
        return void 0;
      if (expanded === "true")
        return true;
      return false;
    }
    return void 0;
  }
  var kAriaLevelRoles = ["heading", "listitem", "row", "treeitem"];
  function getAriaLevel(element) {
    const native = { "H1": 1, "H2": 2, "H3": 3, "H4": 4, "H5": 5, "H6": 6 }[elementSafeTagName(element)];
    if (native)
      return native;
    if (kAriaLevelRoles.includes(getAriaRole(element) || "")) {
      const attr = element.getAttribute("aria-level");
      const value = attr === null ? Number.NaN : Number(attr);
      if (Number.isInteger(value) && value >= 1)
        return value;
    }
    return 0;
  }
  var kAriaDisabledRoles = ["application", "button", "composite", "gridcell", "group", "input", "link", "menuitem", "scrollbar", "separator", "tab", "checkbox", "columnheader", "combobox", "grid", "listbox", "menu", "menubar", "menuitemcheckbox", "menuitemradio", "option", "radio", "radiogroup", "row", "rowheader", "searchbox", "select", "slider", "spinbutton", "switch", "tablist", "textbox", "toolbar", "tree", "treegrid", "treeitem"];
  function getAriaDisabled(element) {
    return isNativelyDisabled(element) || hasExplicitAriaDisabled(element);
  }
  function isNativelyDisabled(element) {
    const isNativeFormControl = ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "OPTION", "OPTGROUP"].includes(elementSafeTagName(element));
    return isNativeFormControl && (element.hasAttribute("disabled") || belongsToDisabledOptGroup(element) || belongsToDisabledFieldSet(element));
  }
  function belongsToDisabledOptGroup(element) {
    return elementSafeTagName(element) === "OPTION" && !!element.closest("OPTGROUP[DISABLED]");
  }
  function belongsToDisabledFieldSet(element) {
    const fieldSetElement = element?.closest("FIELDSET[DISABLED]");
    if (!fieldSetElement)
      return false;
    const legendElement = fieldSetElement.querySelector(":scope > LEGEND");
    return !legendElement || !legendElement.contains(element);
  }
  function hasExplicitAriaDisabled(element) {
    if (!kAriaDisabledRoles.includes(getAriaRole(element) || ""))
      return false;
    return hasAriaDisabledInChain(element);
  }
  function hasAriaDisabledInChain(element) {
    let result = cacheAriaDisabled?.get(element);
    if (result === void 0) {
      const attribute = (element.getAttribute("aria-disabled") || "").toLowerCase();
      if (attribute === "true") {
        result = true;
      } else if (attribute === "false") {
        result = false;
      } else {
        const parent = parentElementOrShadowHost(element);
        result = parent ? hasAriaDisabledInChain(parent) : false;
      }
      cacheAriaDisabled?.set(element, result);
    }
    return result;
  }
  function getAccessibleNameFromAssociatedLabels(labels, options) {
    return joinCompositeString([...labels].map((label) => getTextAlternativeInternal(label, {
      ...options,
      embeddedInLabel: { element: label, hidden: isElementHiddenForAria(label) },
      embeddedInNativeTextAlternative: void 0,
      embeddedInLabelledBy: void 0,
      embeddedInDescribedBy: void 0,
      embeddedInTargetElement: void 0
    })).filter((accessibleName) => !!accessibleName.text), " ", options.collectElements);
  }
  function receivesPointerEvents(element) {
    const cache = cachePointerEvents;
    let e = element;
    let result;
    const parents = [];
    for (; e; e = parentElementOrShadowHost(e)) {
      const cached = cache.get(e);
      if (cached !== void 0) {
        result = cached;
        break;
      }
      parents.push(e);
      const style = getElementComputedStyle(e);
      if (!style) {
        result = true;
        break;
      }
      const value = style.pointerEvents;
      if (value) {
        result = value !== "none";
        break;
      }
    }
    if (result === void 0)
      result = true;
    for (const parent of parents)
      cache.set(parent, result);
    return result;
  }
  var cacheAccessibleName;
  var cacheAccessibleNameHidden;
  var cacheAccessibleNameText;
  var cacheAccessibleNameTextHidden;
  var cacheAccessibleDescription;
  var cacheAccessibleDescriptionHidden;
  var cacheAccessibleErrorMessage;
  var cacheIsHidden;
  var cachePseudoContent;
  var cachePseudoContentBefore;
  var cachePseudoContentAfter;
  var cachePointerEvents;
  var cacheAriaRole;
  var cacheAriaDisabled;
  var cachesCounter2 = 0;
  function beginAriaCaches() {
    beginDOMCaches();
    ++cachesCounter2;
    cacheAriaRole ?? (cacheAriaRole = /* @__PURE__ */ new Map());
    cacheAriaDisabled ?? (cacheAriaDisabled = /* @__PURE__ */ new Map());
    cacheAccessibleName ?? (cacheAccessibleName = /* @__PURE__ */ new Map());
    cacheAccessibleNameHidden ?? (cacheAccessibleNameHidden = /* @__PURE__ */ new Map());
    cacheAccessibleNameText ?? (cacheAccessibleNameText = /* @__PURE__ */ new Map());
    cacheAccessibleNameTextHidden ?? (cacheAccessibleNameTextHidden = /* @__PURE__ */ new Map());
    cacheAccessibleDescription ?? (cacheAccessibleDescription = /* @__PURE__ */ new Map());
    cacheAccessibleDescriptionHidden ?? (cacheAccessibleDescriptionHidden = /* @__PURE__ */ new Map());
    cacheAccessibleErrorMessage ?? (cacheAccessibleErrorMessage = /* @__PURE__ */ new Map());
    cacheIsHidden ?? (cacheIsHidden = /* @__PURE__ */ new Map());
    cachePseudoContent ?? (cachePseudoContent = /* @__PURE__ */ new Map());
    cachePseudoContentBefore ?? (cachePseudoContentBefore = /* @__PURE__ */ new Map());
    cachePseudoContentAfter ?? (cachePseudoContentAfter = /* @__PURE__ */ new Map());
    cachePointerEvents ?? (cachePointerEvents = /* @__PURE__ */ new Map());
  }
  function endAriaCaches() {
    if (!--cachesCounter2) {
      cacheAccessibleName = void 0;
      cacheAccessibleNameHidden = void 0;
      cacheAccessibleNameText = void 0;
      cacheAccessibleNameTextHidden = void 0;
      cacheAccessibleDescription = void 0;
      cacheAccessibleDescriptionHidden = void 0;
      cacheAccessibleErrorMessage = void 0;
      cacheIsHidden = void 0;
      cachePseudoContent = void 0;
      cachePseudoContentBefore = void 0;
      cachePseudoContentAfter = void 0;
      cachePointerEvents = void 0;
      cacheAriaRole = void 0;
      cacheAriaDisabled = void 0;
    }
    endDOMCaches();
  }
  var inputTypeToRole = {
    "button": "button",
    "checkbox": "checkbox",
    "image": "button",
    "number": "spinbutton",
    "radio": "radio",
    "range": "slider",
    "reset": "button",
    "submit": "button"
  };
  function emptyCompositeString() {
    return { text: "" };
  }
  function compositeString(text, element, collectElements) {
    const elements = text && collectElements ? /* @__PURE__ */ new Set([element]) : void 0;
    return { text: text || "", elements };
  }
  function joinCompositeString(parts, separator, collectElements) {
    let elements;
    if (collectElements) {
      elements = /* @__PURE__ */ new Set();
      for (const part of parts) {
        for (const element of part.elements || [])
          elements.add(element);
      }
    }
    return { text: parts.map((part) => part.text).join(separator), elements };
  }
  var lastRef = 0;
  function toInternalOptions(options) {
    const renderBoxes = options.boxes;
    if (options.mode === "ai") {
      return {
        visibility: "ariaOrVisible",
        refs: "interactable",
        refPrefix: options.refPrefix,
        includeGenericRole: true,
        renderActive: !options.doNotRenderActive,
        renderCursorPointer: true,
        renderBoxes
      };
    }
    if (options.mode === "autoexpect") {
      return { visibility: "ariaAndVisible", refs: "none", renderBoxes };
    }
    return { visibility: "aria", refs: "none", renderBoxes };
  }
  function generateAriaTree(rootElement, publicOptions) {
    const options = toInternalOptions(publicOptions);
    const visited = /* @__PURE__ */ new Set();
    const nameSourceElements = /* @__PURE__ */ new Map();
    const snapshot = {
      root: { role: "fragment", name: "", children: [], props: {}, box: computeBox(rootElement), receivesPointerEvents: true },
      info: /* @__PURE__ */ new Map(),
      refs: /* @__PURE__ */ new Map(),
      iframeRefs: []
    };
    setAriaNodeElement(snapshot.root, rootElement);
    const visit = (ariaNode, node, parentElementVisible) => {
      if (visited.has(node))
        return;
      visited.add(node);
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        if (!parentElementVisible)
          return;
        const text = node.nodeValue;
        if (ariaNode.role !== "textbox" && text)
          ariaNode.children.push(node.nodeValue || "");
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE)
        return;
      const element = node;
      const isElementVisibleForAria = !isElementHiddenForAria(element);
      let visible = isElementVisibleForAria;
      if (options.visibility === "ariaOrVisible")
        visible = isElementVisibleForAria || isElementVisible(element);
      if (options.visibility === "ariaAndVisible")
        visible = isElementVisibleForAria && isElementVisible(element);
      if (options.visibility === "aria" && !visible)
        return;
      const ariaChildren = [];
      if (element.hasAttribute("aria-owns")) {
        const ids = element.getAttribute("aria-owns").split(/\s+/);
        for (const id of ids) {
          const ownedElement = rootElement.ownerDocument.getElementById(id);
          if (ownedElement)
            ariaChildren.push(ownedElement);
        }
      }
      const childAriaNode = visible ? toAriaNode(element, options, nameSourceElements) : null;
      let elementInfo;
      if (childAriaNode) {
        if (childAriaNode.ref) {
          elementInfo = { element, nameFromContentRefs: [] };
          snapshot.info.set(childAriaNode.ref, elementInfo);
          snapshot.refs.set(element, childAriaNode.ref);
          if (childAriaNode.role === "iframe")
            snapshot.iframeRefs.push(childAriaNode.ref);
        }
        ariaNode.children.push(childAriaNode);
      }
      processElement(childAriaNode || ariaNode, element, ariaChildren, visible);
      if (elementInfo) {
        for (const contributor of nameSourceElements.get(childAriaNode) || []) {
          const ref = snapshot.refs.get(contributor);
          if (ref && ref !== childAriaNode.ref)
            elementInfo.nameFromContentRefs.push(ref);
        }
      }
    };
    function processElement(ariaNode, element, ariaChildren, parentElementVisible) {
      const display = getElementComputedStyle(element)?.display || "inline";
      const treatAsBlock = display !== "inline" || element.nodeName === "BR" ? " " : "";
      if (treatAsBlock)
        ariaNode.children.push(treatAsBlock);
      ariaNode.children.push(getCSSContent(element, "::before") || "");
      const assignedNodes = element.nodeName === "SLOT" ? element.assignedNodes() : [];
      if (assignedNodes.length) {
        for (const child of assignedNodes)
          visit(ariaNode, child, parentElementVisible);
      } else {
        for (let child = element.firstChild; child; child = child.nextSibling) {
          if (!child.assignedSlot)
            visit(ariaNode, child, parentElementVisible);
        }
        if (element.shadowRoot) {
          for (let child = element.shadowRoot.firstChild; child; child = child.nextSibling)
            visit(ariaNode, child, parentElementVisible);
        }
      }
      for (const child of ariaChildren)
        visit(ariaNode, child, parentElementVisible);
      ariaNode.children.push(getCSSContent(element, "::after") || "");
      if (treatAsBlock)
        ariaNode.children.push(treatAsBlock);
      if (ariaNode.children.length === 1 && ariaNode.name === ariaNode.children[0])
        ariaNode.children = [];
      if (ariaNode.role === "link" && element.hasAttribute("href")) {
        const href = element.getAttribute("href");
        ariaNode.props["url"] = truncateDataUrl(href);
      }
      if (ariaNode.role === "textbox" && element.hasAttribute("placeholder") && element.getAttribute("placeholder") !== ariaNode.name) {
        const placeholder = element.getAttribute("placeholder");
        ariaNode.props["placeholder"] = placeholder;
      }
    }
    beginAriaCaches();
    try {
      visit(snapshot.root, rootElement, true);
    } finally {
      endAriaCaches();
    }
    distillAriaSnapshot(snapshot, publicOptions);
    return snapshot;
  }
  function computeAriaRef(ariaNode, options) {
    if (options.refs === "none")
      return;
    if (options.refs === "interactable" && (!ariaNode.box.visible || !ariaNode.receivesPointerEvents))
      return;
    const element = ariaNodeElement(ariaNode);
    let ariaRef = element._ariaRef;
    if (!ariaRef || ariaRef.role !== ariaNode.role || ariaRef.name !== ariaNode.name) {
      ariaRef = { role: ariaNode.role, name: ariaNode.name, ref: (options.refPrefix ?? "") + "e" + ++lastRef };
      element._ariaRef = ariaRef;
    }
    ariaNode.ref = ariaRef.ref;
  }
  function toAriaNode(element, options, nameSourceElements) {
    const active = element.ownerDocument.activeElement === element && element.ownerDocument.hasFocus();
    if (element.nodeName === "IFRAME" || element.nodeName === "FRAME") {
      const ariaNode = {
        role: "iframe",
        name: "",
        children: [],
        props: {},
        box: computeBox(element),
        receivesPointerEvents: true,
        active
      };
      setAriaNodeElement(ariaNode, element);
      computeAriaRef(ariaNode, options);
      return ariaNode;
    }
    const defaultRole = options.includeGenericRole ? "generic" : null;
    const role = getAriaRole(element) ?? defaultRole;
    if (!role || role === "presentation" || role === "none")
      return null;
    const name = getElementAccessibleName(element, false);
    const receivesPointerEvents2 = receivesPointerEvents(element);
    const box = computeBox(element);
    if (role === "generic" && box.inline && element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE)
      return null;
    const result = {
      role,
      name: normalizeWhiteSpace(name.text),
      children: [],
      props: {},
      box,
      receivesPointerEvents: receivesPointerEvents2,
      active
    };
    setAriaNodeElement(result, element);
    nameSourceElements.set(result, name.elements);
    computeAriaRef(result, options);
    if (kAriaCheckedRoles.includes(role))
      result.checked = getAriaChecked(element);
    if (kAriaDisabledRoles.includes(role))
      result.disabled = getAriaDisabled(element);
    if (kAriaExpandedRoles.includes(role))
      result.expanded = getAriaExpanded(element);
    if (kAriaInvalidRoles.includes(role)) {
      const invalid = getAriaInvalid(element);
      result.invalid = invalid === "false" ? false : invalid === "true" ? true : invalid;
    }
    if (kAriaLevelRoles.includes(role))
      result.level = getAriaLevel(element);
    if (kAriaPressedRoles.includes(role))
      result.pressed = getAriaPressed(element);
    if (kAriaSelectedRoles.includes(role))
      result.selected = getAriaSelected(element);
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (element.type !== "checkbox" && element.type !== "radio" && element.type !== "file")
        result.children = [element.value];
    }
    return result;
  }
  function matchesStringOrRegex(text, template) {
    if (!template)
      return true;
    if (!text)
      return false;
    if (typeof template === "string")
      return text === template;
    return !!text.match(new RegExp(template.pattern));
  }
  function matchesTextValue(text, template) {
    if (!template?.normalized)
      return true;
    if (!text)
      return false;
    if (text === template.normalized)
      return true;
    if (text === template.raw)
      return true;
    const regex = cachedRegex(template);
    if (regex)
      return !!text.match(regex);
    return false;
  }
  var cachedRegexSymbol = /* @__PURE__ */ Symbol("cachedRegex");
  function cachedRegex(template) {
    if (template[cachedRegexSymbol] !== void 0)
      return template[cachedRegexSymbol];
    const { raw } = template;
    const canBeRegex = raw.startsWith("/") && raw.endsWith("/") && raw.length > 1;
    let regex;
    try {
      regex = canBeRegex ? new RegExp(raw.slice(1, -1)) : null;
    } catch (e) {
      regex = null;
    }
    template[cachedRegexSymbol] = regex;
    return regex;
  }
  function matchesExpectAriaTemplate(rootElement, template) {
    const snapshot = generateAriaTree(rootElement, { mode: "default" });
    const matches = matchesNodeDeep(snapshot.root, template, false, false);
    const { json } = renderAriaTreeAsJSON(snapshot, { mode: "default" });
    return {
      matches,
      received: {
        raw: renderAriaSnapshotAsYaml(json),
        regex: renderAriaSnapshotAsYaml(json, { convertStringsToRegex: true })
      }
    };
  }
  function getAllElementsMatchingExpectAriaTemplate(rootElement, template) {
    const root = generateAriaTree(rootElement, { mode: "default" }).root;
    const matches = matchesNodeDeep(root, template, true, false);
    return matches.map((n) => ariaNodeElement(n));
  }
  function matchesNode(node, template, isDeepEqual) {
    if (typeof node === "string" && template.kind === "text")
      return matchesTextValue(node, template.text);
    if (node === null || typeof node !== "object" || template.kind !== "role")
      return false;
    if (template.role !== "fragment" && template.role !== node.role)
      return false;
    if (template.checked !== void 0 && template.checked !== node.checked)
      return false;
    if (template.disabled !== void 0 && template.disabled !== node.disabled)
      return false;
    if (template.expanded !== void 0 && template.expanded !== node.expanded)
      return false;
    if (template.invalid !== void 0 && template.invalid !== node.invalid)
      return false;
    if (template.level !== void 0 && template.level !== node.level)
      return false;
    if (template.pressed !== void 0 && template.pressed !== node.pressed)
      return false;
    if (template.selected !== void 0 && template.selected !== node.selected)
      return false;
    if (!matchesStringOrRegex(node.name, template.name))
      return false;
    if (!matchesTextValue(node.props.url, template.props?.url))
      return false;
    if (template.containerMode === "contain")
      return containsList(node.children || [], template.children || []);
    if (template.containerMode === "equal")
      return listEqual(node.children || [], template.children || [], false);
    if (template.containerMode === "deep-equal" || isDeepEqual)
      return listEqual(node.children || [], template.children || [], true);
    return containsList(node.children || [], template.children || []);
  }
  function listEqual(children, template, isDeepEqual) {
    if (template.length !== children.length)
      return false;
    for (let i = 0; i < template.length; ++i) {
      if (!matchesNode(children[i], template[i], isDeepEqual))
        return false;
    }
    return true;
  }
  function containsList(children, template) {
    if (template.length > children.length)
      return false;
    const cc = children.slice();
    const tt = template.slice();
    for (const t of tt) {
      let c = cc.shift();
      while (c) {
        if (matchesNode(c, t, false))
          break;
        c = cc.shift();
      }
      if (!c)
        return false;
    }
    return true;
  }
  function matchesNodeDeep(root, template, collectAll, isDeepEqual) {
    const results = [];
    const visit = (node, parent) => {
      if (matchesNode(node, template, isDeepEqual)) {
        const result = typeof node === "string" ? parent : node;
        if (result)
          results.push(result);
        return !collectAll;
      }
      if (typeof node === "string")
        return false;
      for (const child of node.children || []) {
        if (visit(child, node))
          return true;
      }
      return false;
    };
    visit(root, null);
    return results;
  }
  function renderAriaTreeAsJSON(ariaSnapshot, publicOptions) {
    const options = toInternalOptions(publicOptions);
    const iframeDepths = {};
    const visit = (ariaNode, depth, renderCursorPointer) => {
      if (ariaNode.role === "iframe" && ariaNode.ref)
        iframeDepths[ariaNode.ref] = depth;
      const node = { role: ariaNode.role };
      if (ariaNode.name)
        node.name = ariaNode.name;
      if (ariaNode.checked === "mixed" || ariaNode.checked === true)
        node.checked = ariaNode.checked;
      if (ariaNode.disabled)
        node.disabled = true;
      if (ariaNode.expanded)
        node.expanded = true;
      if (ariaNode.active && options.renderActive)
        node.active = true;
      if (ariaNode.invalid)
        node.invalid = ariaNode.invalid;
      if (ariaNode.level)
        node.level = ariaNode.level;
      if (ariaNode.pressed === "mixed" || ariaNode.pressed === true)
        node.pressed = ariaNode.pressed;
      if (ariaNode.selected === true)
        node.selected = true;
      if (ariaNode.ref) {
        node.ref = ariaNode.ref;
        if (renderCursorPointer && hasPointerCursor(ariaNode))
          node.cursor = "pointer";
      }
      if (options.renderBoxes) {
        const element = ariaNodeElement(ariaNode);
        if (element) {
          const r = element.getBoundingClientRect();
          node.box = { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
        }
      }
      if (ariaNode.props.url !== void 0)
        node.url = ariaNode.props.url;
      if (ariaNode.props.placeholder !== void 0)
        node.placeholder = ariaNode.props.placeholder;
      const singleTextChild = ariaNode.children.length === 1 && typeof ariaNode.children[0] === "string" ? ariaNode.children[0] : void 0;
      const isAtDepthLimit = !!publicOptions.depth && depth === publicOptions.depth;
      if (singleTextChild !== void 0) {
        node.text = singleTextChild;
      } else if (!isAtDepthLimit && ariaNode.children.length) {
        const inCursorPointer = !!ariaNode.ref && renderCursorPointer && hasPointerCursor(ariaNode);
        node.children = ariaNode.children.map((child) => {
          if (typeof child === "string")
            return child;
          return visit(child, depth + 1, renderCursorPointer && !inCursorPointer);
        });
      }
      return node;
    };
    const json = [];
    const nodesToRender = ariaSnapshot.root.role === "fragment" ? ariaSnapshot.root.children : [ariaSnapshot.root];
    for (const nodeToRender of nodesToRender) {
      if (typeof nodeToRender === "string")
        json.push({ role: "text", text: nodeToRender });
      else
        json.push(visit(nodeToRender, 0, !!options.renderCursorPointer));
    }
    return { json, iframeDepths };
  }
  var elementSymbol = /* @__PURE__ */ Symbol("element");
  function ariaNodeElement(ariaNode) {
    return ariaNode[elementSymbol];
  }
  function setAriaNodeElement(ariaNode, element) {
    ariaNode[elementSymbol] = element;
  }
  function findNewElement(from, to) {
    const node = findNewNode(from, to);
    return node ? ariaNodeElement(node) : void 0;
  }
  function bidiInsertText(window2, text) {
    let element = window2.document.activeElement;
    while (element?.shadowRoot)
      element = element.shadowRoot.activeElement;
    if (!element)
      return;
    const elementType = element.nodeName.toLocaleLowerCase();
    if (elementType === "iframe" || elementType === "frame") {
      return element;
    } else if (elementType === "input" || elementType === "textarea") {
      const inputElement = element;
      const start = inputElement.selectionStart;
      if (start === null) {
        inputElement.value += text;
      } else {
        let value = inputElement.value;
        value = value.substring(0, start) + text + value.substring(inputElement.selectionEnd);
        inputElement.value = value;
        const caretPosition = start + text.length;
        inputElement.setSelectionRange(caretPosition, caretPosition);
      }
      inputElement.dispatchEvent(new InputEvent("input", { data: text, bubbles: true, composed: true }));
    } else if (element instanceof HTMLElement && element.isContentEditable) {
      const selection = window2.getSelection();
      let range;
      if (selection.rangeCount)
        range = selection.getRangeAt(0);
      if (!range || !element.contains(range.commonAncestorContainer)) {
        range = window2.document.createRange();
        range.selectNodeContents(element);
        range.collapse(true);
      }
      range.deleteContents();
      const lines = text.split("\n");
      for (let i = lines.length - 1; i >= 0; i--) {
        range.insertNode(window2.document.createTextNode(lines[i]));
        if (i > 0)
          range.insertNode(window2.document.createElement("br"));
      }
      range.collapse();
      selection.removeAllRanges();
      selection.addRange(range);
      element.dispatchEvent(new InputEvent("input", { data: text, bubbles: true, composed: true }));
    }
  }
  var BidiInsertTextInstaller = class {
    constructor(injectedScript) {
      const window2 = injectedScript.window;
      window2.__pw_bidiInsertText = (text) => bidiInsertText(window2, text);
    }
  };
  var kFunctionBindingPrefix = "__pw_fn_";
  var kBindingsControllerProperty = "__playwright__binding__controller__";
  function isRegExp(obj) {
    try {
      return obj instanceof RegExp || Object.prototype.toString.call(obj) === "[object RegExp]";
    } catch (error) {
      return false;
    }
  }
  function isDate(obj) {
    try {
      return obj instanceof Date || Object.prototype.toString.call(obj) === "[object Date]";
    } catch (error) {
      return false;
    }
  }
  function isURL(obj) {
    try {
      return obj instanceof URL || Object.prototype.toString.call(obj) === "[object URL]";
    } catch (error) {
      return false;
    }
  }
  function isError(obj) {
    try {
      return obj instanceof Error || obj && Object.getPrototypeOf(obj)?.name === "Error";
    } catch (error) {
      return false;
    }
  }
  function isTypedArray(obj, constructor) {
    try {
      return obj instanceof constructor || Object.prototype.toString.call(obj) === `[object ${constructor.name}]`;
    } catch (error) {
      return false;
    }
  }
  function isArrayBuffer(obj) {
    try {
      return obj instanceof ArrayBuffer || Object.prototype.toString.call(obj) === "[object ArrayBuffer]";
    } catch (error) {
      return false;
    }
  }
  var typedArrayConstructors = {
    i8: Int8Array,
    ui8: Uint8Array,
    ui8c: Uint8ClampedArray,
    i16: Int16Array,
    ui16: Uint16Array,
    i32: Int32Array,
    ui32: Uint32Array,
    // TODO: add Float16Array once it's in baseline
    f32: Float32Array,
    f64: Float64Array,
    bi64: BigInt64Array,
    bui64: BigUint64Array
  };
  function typedArrayToBase64(array) {
    if ("toBase64" in array)
      return array.toBase64();
    const binary = Array.from(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)).map((b) => String.fromCharCode(b)).join("");
    return btoa(binary);
  }
  function base64ToTypedArray(base64, TypedArrayConstructor) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++)
      bytes[i] = binary.charCodeAt(i);
    return new TypedArrayConstructor(bytes.buffer);
  }
  function parseEvaluationResultValue(value, handles = [], refs = /* @__PURE__ */ new Map()) {
    if (Object.is(value, void 0))
      return void 0;
    if (typeof value === "object" && value) {
      if ("ref" in value)
        return refs.get(value.ref);
      if ("v" in value) {
        if (value.v === "undefined")
          return void 0;
        if (value.v === "null")
          return null;
        if (value.v === "NaN")
          return NaN;
        if (value.v === "Infinity")
          return Infinity;
        if (value.v === "-Infinity")
          return -Infinity;
        if (value.v === "-0")
          return -0;
        return void 0;
      }
      if ("d" in value) {
        return new Date(value.d);
      }
      if ("u" in value)
        return new URL(value.u);
      if ("bi" in value)
        return BigInt(value.bi);
      if ("e" in value) {
        const error = new Error(value.e.m);
        error.name = value.e.n;
        error.stack = value.e.s;
        return error;
      }
      if ("r" in value)
        return new RegExp(value.r.p, value.r.f);
      if ("a" in value) {
        const result = [];
        refs.set(value.id, result);
        for (const a of value.a)
          result.push(parseEvaluationResultValue(a, handles, refs));
        return result;
      }
      if ("o" in value) {
        const result = {};
        refs.set(value.id, result);
        for (const { k, v } of value.o) {
          if (k === "__proto__")
            continue;
          result[k] = parseEvaluationResultValue(v, handles, refs);
        }
        return result;
      }
      if ("h" in value)
        return handles[value.h];
      if ("fn" in value) {
        const name = value.fn;
        return (...args) => globalThis[kBindingsControllerProperty].callBinding(name, ...args);
      }
      if ("ta" in value)
        return base64ToTypedArray(value.ta.b, typedArrayConstructors[value.ta.k]);
      if ("ab" in value)
        return base64ToTypedArray(value.ab.b, Uint8Array).buffer;
    }
    return value;
  }
  function serializeAsCallArgument(value, handleSerializer) {
    return serialize(value, handleSerializer, { visited: /* @__PURE__ */ new Map(), lastId: 0 });
  }
  function serialize(value, handleSerializer, visitorInfo) {
    if (value && typeof value === "object") {
      if (typeof globalThis.Window === "function" && value instanceof globalThis.Window)
        return "ref: <Window>";
      if (typeof globalThis.Document === "function" && value instanceof globalThis.Document)
        return "ref: <Document>";
      if (typeof globalThis.Node === "function" && value instanceof globalThis.Node)
        return "ref: <Node>";
    }
    return innerSerialize(value, handleSerializer, visitorInfo);
  }
  function innerSerialize(value, handleSerializer, visitorInfo) {
    const result = handleSerializer(value);
    if ("fallThrough" in result)
      value = result.fallThrough;
    else
      return result;
    if (typeof value === "symbol")
      return { v: "undefined" };
    if (Object.is(value, void 0))
      return { v: "undefined" };
    if (Object.is(value, null))
      return { v: "null" };
    if (Object.is(value, NaN))
      return { v: "NaN" };
    if (Object.is(value, Infinity))
      return { v: "Infinity" };
    if (Object.is(value, -Infinity))
      return { v: "-Infinity" };
    if (Object.is(value, -0))
      return { v: "-0" };
    if (typeof value === "boolean")
      return value;
    if (typeof value === "number")
      return value;
    if (typeof value === "string")
      return value;
    if (typeof value === "bigint")
      return { bi: value.toString() };
    if (isError(value)) {
      let stack;
      if (value.stack?.startsWith(value.name + ": " + value.message)) {
        stack = value.stack;
      } else {
        stack = `${value.name}: ${value.message}
${value.stack}`;
      }
      return { e: { n: value.name, m: value.message, s: stack } };
    }
    if (isDate(value))
      return { d: value.toJSON() };
    if (isURL(value))
      return { u: value.toJSON() };
    if (isRegExp(value))
      return { r: { p: value.source, f: value.flags } };
    for (const [k, ctor] of Object.entries(typedArrayConstructors)) {
      if (isTypedArray(value, ctor))
        return { ta: { b: typedArrayToBase64(value), k } };
    }
    if (isArrayBuffer(value))
      return { ab: { b: typedArrayToBase64(new Uint8Array(value)) } };
    const id = visitorInfo.visited.get(value);
    if (id)
      return { ref: id };
    if (Array.isArray(value)) {
      const a = [];
      const id2 = ++visitorInfo.lastId;
      visitorInfo.visited.set(value, id2);
      for (let i = 0; i < value.length; ++i)
        a.push(serialize(value[i], handleSerializer, visitorInfo));
      return { a, id: id2 };
    }
    if (typeof value === "object") {
      const o = [];
      const id2 = ++visitorInfo.lastId;
      visitorInfo.visited.set(value, id2);
      for (const name of Object.keys(value)) {
        let item;
        try {
          item = value[name];
        } catch (e) {
          continue;
        }
        if (name === "toJSON" && typeof item === "function")
          o.push({ k: name, v: { o: [], id: 0 } });
        else
          o.push({ k: name, v: serialize(item, handleSerializer, visitorInfo) });
      }
      let jsonWrapper;
      try {
        if (o.length === 0 && value.toJSON && typeof value.toJSON === "function")
          jsonWrapper = { value: value.toJSON() };
      } catch (e) {
      }
      if (jsonWrapper)
        return innerSerialize(jsonWrapper.value, handleSerializer, visitorInfo);
      return { o, id: id2 };
    }
    if (typeof value === "function" && value.name.startsWith(kFunctionBindingPrefix))
      return { fn: value.name };
  }
  var BindingsController = class {
    constructor(global, globalBindingName) {
      this._bindings = /* @__PURE__ */ new Map();
      this._global = global;
      this._globalBindingName = globalBindingName;
    }
    addBinding(bindingName, noGlobal) {
      const data = {
        callbacks: /* @__PURE__ */ new Map(),
        lastSeq: 0,
        removed: false
      };
      this._bindings.set(bindingName, data);
      if (!noGlobal)
        this._global[bindingName] = (...args) => this.callBinding(bindingName, ...args);
    }
    callBinding(bindingName, ...args) {
      const data = this._bindings.get(bindingName);
      if (!data || data.removed)
        throw new Error(`binding "${bindingName}" has been removed`);
      const seq = ++data.lastSeq;
      const promise = new Promise((resolve, reject) => data.callbacks.set(seq, { resolve, reject }));
      const serializedArgs = [];
      for (let i = 0; i < args.length; i++) {
        serializedArgs[i] = serializeAsCallArgument(args[i], (v) => {
          return { fallThrough: v };
        });
      }
      const payload = { name: bindingName, seq, serializedArgs };
      this._global[this._globalBindingName](JSON.stringify(payload));
      return promise;
    }
    parseInitScriptArg(value) {
      return parseEvaluationResultValue(value);
    }
    removeBinding(bindingName) {
      const data = this._bindings.get(bindingName);
      if (data)
        data.removed = true;
      this._bindings.delete(bindingName);
      delete this._global[bindingName];
    }
    deliverBindingResult(arg) {
      const callbacks = this._bindings.get(arg.name).callbacks;
      if ("error" in arg)
        callbacks.get(arg.seq).reject(arg.error);
      else
        callbacks.get(arg.seq).resolve(arg.result);
      callbacks.delete(arg.seq);
    }
  };
  var ClockController = class {
    constructor(embedder) {
      this._duringTick = false;
      this._uniqueTimerId = idCounterStart;
      this.disposables = [];
      this._log = [];
      this._timers = /* @__PURE__ */ new Map();
      this._now = { time: asWallTime(0), isFixedTime: false, ticks: 0, origin: asWallTime(-1) };
      this._embedder = embedder;
    }
    uninstall() {
      this.disposables.forEach((dispose) => dispose());
      this.disposables.length = 0;
    }
    now() {
      this._replayLogOnce();
      this._syncRealTime();
      return this._now.time;
    }
    install(time) {
      this._replayLogOnce();
      this._innerInstall(asWallTime(time));
    }
    setSystemTime(time) {
      this._replayLogOnce();
      this._innerSetTime(asWallTime(time));
    }
    setFixedTime(time) {
      this._replayLogOnce();
      this._innerSetFixedTime(asWallTime(time));
    }
    performanceNow() {
      this._replayLogOnce();
      this._syncRealTime();
      return this._now.ticks;
    }
    _syncRealTime() {
      if (!this._realTime)
        return;
      const now = this._embedder.performanceNow();
      const sinceLastSync = now - this._realTime.lastSyncTicks;
      if (sinceLastSync > 0) {
        this._advanceNow(shiftTicks(this._now.ticks, sinceLastSync));
        this._realTime.lastSyncTicks = now;
      }
    }
    _innerSetTime(time) {
      this._now.time = time;
      this._now.isFixedTime = false;
      if (this._now.origin < 0)
        this._now.origin = this._now.time;
    }
    _innerInstall(time) {
      if (this._now.origin < 0)
        this._now.ticks = 0;
      this._innerSetTime(time);
    }
    _innerSetFixedTime(time) {
      this._innerSetTime(time);
      this._now.isFixedTime = true;
    }
    _advanceNow(to) {
      if (this._now.ticks > to) {
        return;
      }
      if (!this._now.isFixedTime)
        this._now.time = asWallTime(this._now.time + to - this._now.ticks);
      this._now.ticks = to;
    }
    async log(type, time, param) {
      this._log.push({ type, time, param });
    }
    async runFor(ticks) {
      this._replayLogOnce();
      if (ticks < 0)
        throw new TypeError("Negative ticks are not supported");
      await this._runWithDisabledRealTimeSync(async () => {
        await this._runTo(shiftTicks(this._now.ticks, ticks));
      });
    }
    async _runTo(to) {
      to = Math.ceil(to);
      if (this._now.ticks > to)
        return;
      let firstException;
      while (true) {
        const result = await this._callFirstTimer(to);
        if (!result.timerFound)
          break;
        firstException = firstException || result.error;
      }
      this._advanceNow(to);
      if (firstException)
        throw firstException;
    }
    async pauseAt(time) {
      this._replayLogOnce();
      await this._innerPause();
      const toConsume = time - this._now.time;
      await this._innerFastForwardTo(shiftTicks(this._now.ticks, toConsume));
      return toConsume;
    }
    async _innerPause() {
      this._realTime = void 0;
      await this._currentRealTimeTimer?.dispose();
      this._currentRealTimeTimer = void 0;
    }
    resume() {
      this._replayLogOnce();
      this._innerResume();
    }
    _innerResume() {
      const now = this._embedder.performanceNow();
      this._realTime = { startTicks: now, lastSyncTicks: now };
      this._updateRealTimeTimer();
    }
    _updateRealTimeTimer() {
      if (this._currentRealTimeTimer?.promise) {
        return;
      }
      const firstTimer = this._firstTimer();
      const nextTick = Math.min(firstTimer ? firstTimer.callAt : this._now.ticks + maxTimeout, this._now.ticks + 100);
      const callAt = this._currentRealTimeTimer ? Math.min(this._currentRealTimeTimer.callAt, nextTick) : nextTick;
      if (this._currentRealTimeTimer) {
        this._currentRealTimeTimer.cancel();
        this._currentRealTimeTimer = void 0;
      }
      const realTimeTimer = {
        callAt,
        promise: void 0,
        cancel: this._embedder.setTimeout(() => {
          this._syncRealTime();
          realTimeTimer.promise = this._runTo(this._now.ticks).catch((e) => console.error(e));
          void realTimeTimer.promise.then(() => {
            this._currentRealTimeTimer = void 0;
            if (this._realTime)
              this._updateRealTimeTimer();
          });
        }, callAt - this._now.ticks),
        dispose: async () => {
          realTimeTimer.cancel();
          await realTimeTimer.promise;
        }
      };
      this._currentRealTimeTimer = realTimeTimer;
    }
    async _runWithDisabledRealTimeSync(fn) {
      if (!this._realTime) {
        await fn();
        return;
      }
      await this._innerPause();
      try {
        await fn();
      } finally {
        this._innerResume();
      }
    }
    async fastForward(ticks) {
      this._replayLogOnce();
      await this._runWithDisabledRealTimeSync(async () => {
        await this._innerFastForwardTo(shiftTicks(this._now.ticks, ticks | 0));
      });
    }
    async _innerFastForwardTo(to) {
      if (to < this._now.ticks)
        throw new Error("Cannot fast-forward to the past");
      for (const timer of this._timers.values()) {
        if (to > timer.callAt)
          timer.callAt = to;
      }
      await this._runTo(to);
    }
    addTimer(options) {
      this._replayLogOnce();
      if (options.type === "AnimationFrame" && !options.func)
        throw new Error("Callback must be provided to requestAnimationFrame calls");
      if (options.type === "IdleCallback" && !options.func)
        throw new Error("Callback must be provided to requestIdleCallback calls");
      if ([
        "Timeout",
        "Interval"
        /* Interval */
      ].includes(options.type) && !options.func && options.delay === void 0)
        throw new Error("Callback must be provided to timer calls");
      let delay = options.delay ? +options.delay : 0;
      if (!Number.isFinite(delay))
        delay = 0;
      delay = delay > maxTimeout ? 1 : delay;
      delay = Math.max(0, delay);
      const timer = {
        type: options.type,
        func: options.func,
        args: options.args || [],
        delay,
        callAt: shiftTicks(this._now.ticks, delay || (this._duringTick ? 1 : 0)),
        createdAt: this._now.ticks,
        id: this._uniqueTimerId++,
        error: new Error()
      };
      this._timers.set(timer.id, timer);
      if (this._realTime)
        this._updateRealTimeTimer();
      return timer.id;
    }
    countTimers() {
      return this._timers.size;
    }
    _firstTimer(beforeTick) {
      let firstTimer = null;
      for (const timer of this._timers.values()) {
        const isInRange = beforeTick === void 0 || timer.callAt <= beforeTick;
        if (isInRange && (!firstTimer || compareTimers(firstTimer, timer) === 1))
          firstTimer = timer;
      }
      return firstTimer;
    }
    _takeFirstTimer(beforeTick) {
      const timer = this._firstTimer(beforeTick);
      if (!timer)
        return null;
      this._advanceNow(timer.callAt);
      if (timer.type === "Interval")
        timer.callAt = shiftTicks(timer.callAt, timer.delay);
      else
        this._timers.delete(timer.id);
      return timer;
    }
    async _callFirstTimer(beforeTick) {
      const timer = this._takeFirstTimer(beforeTick);
      if (!timer)
        return { timerFound: false };
      this._duringTick = true;
      try {
        if (typeof timer.func !== "function") {
          let error2;
          try {
            (() => {
              globalThis.eval(timer.func);
            })();
          } catch (e) {
            error2 = e;
          }
          await new Promise((f) => this._embedder.setTimeout(f));
          return { timerFound: true, error: error2 };
        }
        let args = timer.args;
        if (timer.type === "AnimationFrame")
          args = [this._now.ticks];
        else if (timer.type === "IdleCallback")
          args = [{ didTimeout: false, timeRemaining: () => 0 }];
        let error;
        try {
          timer.func.apply(null, args);
        } catch (e) {
          error = e;
        }
        await new Promise((f) => this._embedder.setTimeout(f));
        return { timerFound: true, error };
      } finally {
        this._duringTick = false;
      }
    }
    getTimeToNextFrame() {
      this._replayLogOnce();
      return 16 - this._now.ticks % 16;
    }
    clearTimer(timerId, type) {
      this._replayLogOnce();
      if (!timerId) {
        return;
      }
      const id = Number(timerId);
      if (Number.isNaN(id) || id < idCounterStart) {
        const handlerName = getClearHandler(type);
        new Error(`Clock: ${handlerName} was invoked to clear a native timer instead of one created by the clock library.`);
      }
      const timer = this._timers.get(id);
      if (timer) {
        if (timer.type === type || timer.type === "Timeout" && type === "Interval" || timer.type === "Interval" && type === "Timeout") {
          this._timers.delete(id);
        } else {
          const clear = getClearHandler(type);
          const schedule = getScheduleHandler(timer.type);
          throw new Error(
            `Cannot clear timer: timer created with ${schedule}() but cleared with ${clear}()`
          );
        }
      }
    }
    _replayLogOnce() {
      if (!this._log.length)
        return;
      let lastLogTime = -1;
      let isPaused = false;
      for (const { type, time, param } of this._log) {
        if (!isPaused && lastLogTime !== -1)
          this._advanceNow(shiftTicks(this._now.ticks, time - lastLogTime));
        lastLogTime = time;
        if (type === "install") {
          this._innerInstall(asWallTime(param));
        } else if (type === "fastForward" || type === "runFor") {
          this._advanceNow(shiftTicks(this._now.ticks, param));
        } else if (type === "pauseAt") {
          isPaused = true;
          this._innerSetTime(asWallTime(param));
        } else if (type === "resume") {
          isPaused = false;
        } else if (type === "setFixedTime") {
          this._innerSetFixedTime(asWallTime(param));
        } else if (type === "setSystemTime") {
          this._innerSetTime(asWallTime(param));
        }
      }
      if (!isPaused) {
        if (lastLogTime > 0)
          this._advanceNow(shiftTicks(this._now.ticks, this._embedder.dateNow() - lastLogTime));
        this._innerResume();
      } else {
        this._realTime = void 0;
      }
      this._log.length = 0;
    }
  };
  function mirrorDateProperties(target, source) {
    for (const prop in source) {
      if (source.hasOwnProperty(prop))
        target[prop] = source[prop];
    }
    target.toString = () => source.toString();
    target.prototype = source.prototype;
    target.parse = source.parse;
    target.UTC = source.UTC;
    target.prototype.toUTCString = source.prototype.toUTCString;
    target.isFake = true;
    return target;
  }
  function createDate(clock, NativeDate) {
    function ClockDate(year, month, date, hour, minute, second, ms) {
      if (!(this instanceof ClockDate))
        return new NativeDate(clock.now()).toString();
      switch (arguments.length) {
        case 0:
          return new NativeDate(clock.now());
        case 1:
          return new NativeDate(year);
        case 2:
          return new NativeDate(year, month);
        case 3:
          return new NativeDate(year, month, date);
        case 4:
          return new NativeDate(year, month, date, hour);
        case 5:
          return new NativeDate(year, month, date, hour, minute);
        case 6:
          return new NativeDate(
            year,
            month,
            date,
            hour,
            minute,
            second
          );
        default:
          return new NativeDate(
            year,
            month,
            date,
            hour,
            minute,
            second,
            ms
          );
      }
    }
    ClockDate.now = () => clock.now();
    return mirrorDateProperties(ClockDate, NativeDate);
  }
  function createIntl(clock, NativeIntl) {
    const ClockIntl = {};
    for (const key of Object.getOwnPropertyNames(NativeIntl))
      ClockIntl[key] = NativeIntl[key];
    ClockIntl.DateTimeFormat = function(...args) {
      const realFormatter = new NativeIntl.DateTimeFormat(...args);
      const formatter = {
        formatRange: realFormatter.formatRange.bind(realFormatter),
        formatRangeToParts: realFormatter.formatRangeToParts.bind(realFormatter),
        resolvedOptions: realFormatter.resolvedOptions.bind(realFormatter),
        format: (date) => realFormatter.format(date || clock.now()),
        formatToParts: (date) => realFormatter.formatToParts(date || clock.now())
      };
      return formatter;
    };
    ClockIntl.DateTimeFormat.prototype = Object.create(
      NativeIntl.DateTimeFormat.prototype
    );
    ClockIntl.DateTimeFormat.supportedLocalesOf = NativeIntl.DateTimeFormat.supportedLocalesOf;
    return ClockIntl;
  }
  function compareTimers(a, b) {
    if (a.callAt < b.callAt)
      return -1;
    if (a.callAt > b.callAt)
      return 1;
    if (a.type === "Immediate" && b.type !== "Immediate")
      return -1;
    if (a.type !== "Immediate" && b.type === "Immediate")
      return 1;
    if (a.createdAt < b.createdAt)
      return -1;
    if (a.createdAt > b.createdAt)
      return 1;
    if (a.id < b.id)
      return -1;
    if (a.id > b.id)
      return 1;
  }
  var maxTimeout = Math.pow(2, 31) - 1;
  var idCounterStart = 1e12;
  function platformOriginals(globalObject) {
    const raw = {
      setTimeout: globalObject.setTimeout,
      clearTimeout: globalObject.clearTimeout,
      setInterval: globalObject.setInterval,
      clearInterval: globalObject.clearInterval,
      requestAnimationFrame: globalObject.requestAnimationFrame ? globalObject.requestAnimationFrame : void 0,
      cancelAnimationFrame: globalObject.cancelAnimationFrame ? globalObject.cancelAnimationFrame : void 0,
      requestIdleCallback: globalObject.requestIdleCallback ? globalObject.requestIdleCallback : void 0,
      cancelIdleCallback: globalObject.cancelIdleCallback ? globalObject.cancelIdleCallback : void 0,
      Date: globalObject.Date,
      performance: globalObject.performance,
      Intl: globalObject.Intl,
      AbortSignal: globalObject.AbortSignal
    };
    const bound = { ...raw };
    for (const key of Object.keys(bound)) {
      if (key !== "Date" && key !== "AbortSignal" && typeof bound[key] === "function")
        bound[key] = bound[key].bind(globalObject);
    }
    return { raw, bound };
  }
  function getScheduleHandler(type) {
    if (type === "IdleCallback" || type === "AnimationFrame")
      return `request${type}`;
    return `set${type}`;
  }
  function createApi(clock, originals, browserName) {
    return {
      setTimeout: (func, timeout, ...args) => {
        const delay = timeout ? +timeout : timeout;
        return clock.addTimer({
          type: "Timeout",
          func,
          args,
          delay
        });
      },
      clearTimeout: (timerId) => {
        if (timerId)
          clock.clearTimer(
            timerId,
            "Timeout"
            /* Timeout */
          );
      },
      setInterval: (func, timeout, ...args) => {
        const delay = timeout ? +timeout : timeout;
        return clock.addTimer({
          type: "Interval",
          func,
          args,
          delay
        });
      },
      clearInterval: (timerId) => {
        if (timerId)
          return clock.clearTimer(
            timerId,
            "Interval"
            /* Interval */
          );
      },
      requestAnimationFrame: (callback) => {
        return clock.addTimer({
          type: "AnimationFrame",
          func: callback,
          delay: clock.getTimeToNextFrame()
        });
      },
      cancelAnimationFrame: (timerId) => {
        if (timerId)
          return clock.clearTimer(
            timerId,
            "AnimationFrame"
            /* AnimationFrame */
          );
      },
      requestIdleCallback: (callback, options) => {
        let timeToNextIdlePeriod = 0;
        if (clock.countTimers() > 0)
          timeToNextIdlePeriod = 50;
        return clock.addTimer({
          type: "IdleCallback",
          func: callback,
          delay: options?.timeout ? Math.min(options?.timeout, timeToNextIdlePeriod) : timeToNextIdlePeriod
        });
      },
      cancelIdleCallback: (timerId) => {
        if (timerId)
          return clock.clearTimer(
            timerId,
            "IdleCallback"
            /* IdleCallback */
          );
      },
      Intl: originals.Intl ? createIntl(clock, originals.Intl) : void 0,
      Date: createDate(clock, originals.Date),
      performance: originals.performance ? fakePerformance(clock, originals.performance) : void 0,
      AbortSignal: originals.AbortSignal ? fakeAbortSignal(clock, originals.AbortSignal, browserName) : void 0
    };
  }
  function getClearHandler(type) {
    if (type === "IdleCallback" || type === "AnimationFrame")
      return `cancel${type}`;
    return `clear${type}`;
  }
  var FakePerformanceEntry = class {
    constructor(name, entryType, startTime, duration) {
      this.name = name;
      this.entryType = entryType;
      this.startTime = startTime;
      this.duration = duration;
    }
    toJSON() {
      return JSON.stringify({ ...this });
    }
  };
  function fakePerformance(clock, performance2) {
    const result = {
      now: () => clock.performanceNow()
    };
    result.__defineGetter__("timeOrigin", () => clock._now.origin || 0);
    for (const key of Object.keys(performance2.__proto__)) {
      if (key === "now" || key === "timeOrigin")
        continue;
      if (key === "getEntries" || key === "getEntriesByName" || key === "getEntriesByType")
        result[key] = () => [];
      else if (key === "mark")
        result[key] = (name) => new FakePerformanceEntry(name, "mark", 0, 0);
      else if (key === "measure")
        result[key] = (name) => new FakePerformanceEntry(name, "measure", 0, 50);
      else
        result[key] = () => {
        };
    }
    return result;
  }
  function fakeAbortSignal(clock, abortSignal, browserName) {
    Object.defineProperty(abortSignal, "timeout", {
      value(ms) {
        const controller = new AbortController();
        clock.addTimer({
          delay: ms,
          type: "Timeout",
          func: () => controller.abort(
            new DOMException(
              browserName === "chromium" ? "signal timed out" : "The operation timed out.",
              "TimeoutError"
            )
          )
        });
        return controller.signal;
      }
    });
    return abortSignal;
  }
  function createClock(globalObject, config = {}) {
    const originals = platformOriginals(globalObject);
    const embedder = {
      dateNow: () => originals.raw.Date.now(),
      performanceNow: () => Math.ceil(originals.raw.performance.now()),
      setTimeout: (task, timeout) => {
        const timerId = originals.bound.setTimeout(task, timeout);
        return () => originals.bound.clearTimeout(timerId);
      },
      setInterval: (task, delay) => {
        const intervalId = originals.bound.setInterval(task, delay);
        return () => originals.bound.clearInterval(intervalId);
      }
    };
    const clock = new ClockController(embedder);
    const api = createApi(clock, originals.bound, config.browserName);
    return { clock, api, originals: originals.raw };
  }
  function install(globalObject, config = {}) {
    if (globalObject.Date?.isFake) {
      throw new TypeError(`Can't install fake timers twice on the same global object.`);
    }
    const { clock, api, originals } = createClock(globalObject, config);
    const toFake = config.toFake?.length ? config.toFake : Object.keys(originals);
    for (const method of toFake) {
      if (method === "Date") {
        globalObject.Date = mirrorDateProperties(api.Date, globalObject.Date);
      } else if (method === "Intl") {
        globalObject.Intl = api[method];
      } else if (method === "AbortSignal") {
        globalObject.AbortSignal = api[method];
      } else if (method === "performance") {
        globalObject.performance = api[method];
        const kEventTimeStamp = /* @__PURE__ */ Symbol("playwrightEventTimeStamp");
        Object.defineProperty(Event.prototype, "timeStamp", {
          get() {
            if (!this[kEventTimeStamp])
              this[kEventTimeStamp] = api.performance?.now();
            return this[kEventTimeStamp];
          }
        });
      } else {
        globalObject[method] = (...args) => {
          return api[method].apply(api, args);
        };
      }
      clock.disposables.push(() => {
        globalObject[method] = originals[method];
      });
    }
    return { clock, api, originals };
  }
  function asWallTime(n) {
    return n;
  }
  function shiftTicks(ticks, ms) {
    return ticks + ms;
  }
  var InvalidSelectorError = class extends Error {
  };
  function isInvalidSelectorError(error) {
    return error instanceof InvalidSelectorError;
  }
  function parseCSS(selector, customNames) {
    let tokens;
    try {
      tokens = tokenize(selector);
      if (!(tokens[tokens.length - 1] instanceof EOFToken))
        tokens.push(new EOFToken());
    } catch (e) {
      const newMessage = e.message + ` while parsing css selector "${selector}". Did you mean to CSS.escape it?`;
      const index = (e.stack || "").indexOf(e.message);
      if (index !== -1)
        e.stack = e.stack.substring(0, index) + newMessage + e.stack.substring(index + e.message.length);
      e.message = newMessage;
      throw e;
    }
    const unsupportedToken = tokens.find((token) => {
      return token instanceof AtKeywordToken || token instanceof BadStringToken || token instanceof BadURLToken || token instanceof ColumnToken || token instanceof CDOToken || token instanceof CDCToken || token instanceof SemicolonToken || // TODO: Consider using these for something, e.g. to escape complex strings.
      // For example :xpath{ (//div/bar[@attr="foo"])[2]/baz }
      // Or this way :xpath( {complex-xpath-goes-here("hello")} )
      token instanceof OpenCurlyToken || token instanceof CloseCurlyToken || // TODO: Consider treating these as strings?
      token instanceof URLToken || token instanceof PercentageToken;
    });
    if (unsupportedToken)
      throw new InvalidSelectorError(`Unsupported token "${unsupportedToken.toSource()}" while parsing css selector "${selector}". Did you mean to CSS.escape it?`);
    let pos = 0;
    const names = /* @__PURE__ */ new Set();
    function unexpected() {
      return new InvalidSelectorError(`Unexpected token "${tokens[pos].toSource()}" while parsing css selector "${selector}". Did you mean to CSS.escape it?`);
    }
    function skipWhitespace() {
      while (tokens[pos] instanceof WhitespaceToken)
        pos++;
    }
    function isIdent(p = pos) {
      return tokens[p] instanceof IdentToken;
    }
    function isString2(p = pos) {
      return tokens[p] instanceof StringToken;
    }
    function isNumber(p = pos) {
      return tokens[p] instanceof NumberToken;
    }
    function isComma(p = pos) {
      return tokens[p] instanceof CommaToken;
    }
    function isOpenParen(p = pos) {
      return tokens[p] instanceof OpenParenToken;
    }
    function isCloseParen(p = pos) {
      return tokens[p] instanceof CloseParenToken;
    }
    function isFunction(p = pos) {
      return tokens[p] instanceof FunctionToken;
    }
    function isStar(p = pos) {
      return tokens[p] instanceof DelimToken && tokens[p].value === "*";
    }
    function isEOF(p = pos) {
      return tokens[p] instanceof EOFToken;
    }
    function isClauseCombinator(p = pos) {
      return tokens[p] instanceof DelimToken && [">", "+", "~"].includes(tokens[p].value);
    }
    function isSelectorClauseEnd(p = pos) {
      return isComma(p) || isCloseParen(p) || isEOF(p) || isClauseCombinator(p) || tokens[p] instanceof WhitespaceToken;
    }
    function consumeFunctionArguments() {
      const result2 = [consumeArgument()];
      while (true) {
        skipWhitespace();
        if (!isComma())
          break;
        pos++;
        result2.push(consumeArgument());
      }
      return result2;
    }
    function consumeArgument() {
      skipWhitespace();
      if (isNumber())
        return tokens[pos++].value;
      if (isString2())
        return tokens[pos++].value;
      return consumeComplexSelector();
    }
    function consumeComplexSelector() {
      const result2 = { simples: [] };
      skipWhitespace();
      if (isClauseCombinator()) {
        result2.simples.push({ selector: { functions: [{ name: "scope", args: [] }] }, combinator: "" });
      } else {
        result2.simples.push({ selector: consumeSimpleSelector(), combinator: "" });
      }
      while (true) {
        skipWhitespace();
        if (isClauseCombinator()) {
          result2.simples[result2.simples.length - 1].combinator = tokens[pos++].value;
          skipWhitespace();
        } else if (isSelectorClauseEnd()) {
          break;
        }
        result2.simples.push({ combinator: "", selector: consumeSimpleSelector() });
      }
      return result2;
    }
    function consumeSimpleSelector() {
      let rawCSSString = "";
      const functions = [];
      while (!isSelectorClauseEnd()) {
        if (isIdent() || isStar()) {
          rawCSSString += tokens[pos++].toSource();
        } else if (tokens[pos] instanceof HashToken) {
          rawCSSString += tokens[pos++].toSource();
        } else if (tokens[pos] instanceof DelimToken && tokens[pos].value === ".") {
          pos++;
          if (isIdent())
            rawCSSString += "." + tokens[pos++].toSource();
          else
            throw unexpected();
        } else if (tokens[pos] instanceof ColonToken) {
          pos++;
          if (isIdent()) {
            if (!customNames.has(tokens[pos].value.toLowerCase())) {
              rawCSSString += ":" + tokens[pos++].toSource();
            } else {
              const name = tokens[pos++].value.toLowerCase();
              functions.push({ name, args: [] });
              names.add(name);
            }
          } else if (isFunction()) {
            const name = tokens[pos++].value.toLowerCase();
            if (!customNames.has(name)) {
              rawCSSString += `:${name}(${consumeBuiltinFunctionArguments()})`;
            } else {
              functions.push({ name, args: consumeFunctionArguments() });
              names.add(name);
            }
            skipWhitespace();
            if (!isCloseParen())
              throw unexpected();
            pos++;
          } else {
            throw unexpected();
          }
        } else if (tokens[pos] instanceof OpenSquareToken) {
          rawCSSString += "[";
          pos++;
          while (!(tokens[pos] instanceof CloseSquareToken) && !isEOF())
            rawCSSString += tokens[pos++].toSource();
          if (!(tokens[pos] instanceof CloseSquareToken))
            throw unexpected();
          rawCSSString += "]";
          pos++;
        } else {
          throw unexpected();
        }
      }
      if (!rawCSSString && !functions.length)
        throw unexpected();
      return { css: rawCSSString || void 0, functions };
    }
    function consumeBuiltinFunctionArguments() {
      let s = "";
      let balance = 1;
      while (!isEOF()) {
        if (isOpenParen() || isFunction())
          balance++;
        if (isCloseParen())
          balance--;
        if (!balance)
          break;
        s += tokens[pos++].toSource();
      }
      return s;
    }
    const result = consumeFunctionArguments();
    if (!isEOF())
      throw unexpected();
    if (result.some((arg) => typeof arg !== "object" || !("simples" in arg)))
      throw new InvalidSelectorError(`Error while parsing css selector "${selector}". Did you mean to CSS.escape it?`);
    return { selector: result, names: Array.from(names) };
  }
  function serializeSelector(args) {
    return args.map((arg) => {
      if (typeof arg === "string")
        return `"${arg}"`;
      if (typeof arg === "number")
        return String(arg);
      return arg.simples.map(({ selector, combinator }) => {
        let s = selector.css || "";
        s = s + selector.functions.map((func) => `:${func.name}(${serializeSelector(func.args)})`).join("");
        if (combinator)
          s += " " + combinator;
        return s;
      }).join(" ");
    }).join(", ");
  }
  var kNestedSelectorNames = /* @__PURE__ */ new Set(["internal:has", "internal:has-not", "internal:and", "internal:or", "internal:chain", "left-of", "right-of", "above", "below", "near"]);
  var kNestedSelectorNamesWithDistance = /* @__PURE__ */ new Set(["left-of", "right-of", "above", "below", "near"]);
  var customCSSNames = /* @__PURE__ */ new Set(["not", "is", "where", "has", "scope", "light", "visible", "text", "text-matches", "text-is", "has-text", "above", "below", "right-of", "left-of", "near", "nth-match"]);
  function parseSelector(selector) {
    const parsedStrings = parseSelectorString(selector);
    const parts = [];
    for (const part of parsedStrings.parts) {
      if (part.name === "css" || part.name === "css:light") {
        if (part.name === "css:light")
          part.body = ":light(" + part.body + ")";
        const parsedCSS = parseCSS(part.body, customCSSNames);
        parts.push({
          name: "css",
          body: parsedCSS.selector,
          source: part.body
        });
        continue;
      }
      if (kNestedSelectorNames.has(part.name)) {
        let innerSelector;
        let distance;
        try {
          const unescaped = JSON.parse("[" + part.body + "]");
          if (!Array.isArray(unescaped) || unescaped.length < 1 || unescaped.length > 2 || typeof unescaped[0] !== "string")
            throw new InvalidSelectorError(`Malformed selector: ${part.name}=` + part.body);
          innerSelector = unescaped[0];
          if (unescaped.length === 2) {
            if (typeof unescaped[1] !== "number" || !kNestedSelectorNamesWithDistance.has(part.name))
              throw new InvalidSelectorError(`Malformed selector: ${part.name}=` + part.body);
            distance = unescaped[1];
          }
        } catch (e) {
          throw new InvalidSelectorError(`Malformed selector: ${part.name}=` + part.body);
        }
        const nested = { name: part.name, source: part.body, body: { parsed: parseSelector(innerSelector), distance } };
        const lastFrame = [...nested.body.parsed.parts].reverse().find((part2) => part2.name === "internal:control" && part2.body === "enter-frame");
        const lastFrameIndex = lastFrame ? nested.body.parsed.parts.indexOf(lastFrame) : -1;
        if (lastFrameIndex !== -1 && selectorPartsEqual(nested.body.parsed.parts.slice(0, lastFrameIndex + 1), parts.slice(0, lastFrameIndex + 1)))
          nested.body.parsed.parts.splice(0, lastFrameIndex + 1);
        parts.push(nested);
        continue;
      }
      parts.push({ ...part, source: part.body });
    }
    if (kNestedSelectorNames.has(parts[0].name))
      throw new InvalidSelectorError(`"${parts[0].name}" selector cannot be first`);
    return {
      capture: parsedStrings.capture,
      parts
    };
  }
  function splitSelectorByFrame(selectorText, pierceByDefault) {
    const selector = parseSelector(selectorText);
    const chunks = [];
    let chunk = {
      parts: []
    };
    let pierce = !!pierceByDefault;
    let pierceToken = false;
    let chunkStartIndex = 0;
    for (let i = 0; i < selector.parts.length; ++i) {
      const part = selector.parts[i];
      if (part.name === "internal:control" && (part.body === "pierce-frames" || part.body === "no-pierce-frames")) {
        if (i !== 0)
          throw new InvalidSelectorError(`"${part.body}" is only allowed as the first selector token, while parsing selector ${selectorText}`);
        pierce = part.body === "pierce-frames";
        pierceToken = true;
        chunkStartIndex = i + 1;
        continue;
      }
      if (part.name === "internal:control" && part.body === "enter-frame") {
        const lastPart2 = chunk.parts[chunk.parts.length - 1];
        if (!lastPart2 || lastPart2.name === "internal:control" && lastPart2.body === "enter-frame")
          throw new InvalidSelectorError("Selector cannot start with entering frame, select the iframe first");
        if (pierce) {
          chunk.parts.push(part);
          continue;
        }
        chunks.push(chunk);
        chunk = { parts: [] };
        chunkStartIndex = i + 1;
        continue;
      }
      if (selector.capture === i)
        chunk.capture = i - chunkStartIndex;
      chunk.parts.push(part);
    }
    if (!chunk.parts.length) {
      if (pierceToken)
        throw new InvalidSelectorError(`Selector cannot be empty when piercing frames, while parsing selector ${selectorText}`);
      throw new InvalidSelectorError(`Selector cannot end with entering frame, while parsing selector ${selectorText}`);
    }
    const lastPart = chunk.parts[chunk.parts.length - 1];
    if (lastPart.name === "internal:control" && lastPart.body === "enter-frame")
      throw new InvalidSelectorError(`Selector cannot end with entering frame, while parsing selector ${selectorText}`);
    chunks.push(chunk);
    if (typeof selector.capture === "number" && typeof chunks[chunks.length - 1].capture !== "number")
      throw new InvalidSelectorError(`Can not capture the selector before diving into the frame. Only use * after the last frame has been selected`);
    if (typeof selector.capture === "number" && pierce)
      throw new InvalidSelectorError(`Can not *-capture inside a frame-piercing selector, while parsing selector ${selectorText}`);
    return { pierce, chunks };
  }
  function selectorPartsEqual(list1, list2) {
    return stringifySelector({ parts: list1 }) === stringifySelector({ parts: list2 });
  }
  function stringifySelector(selector, forceEngineName) {
    if (typeof selector === "string")
      return selector;
    return selector.parts.map((p, i) => {
      let includeEngine = true;
      if (!forceEngineName && i !== selector.capture) {
        if (p.name === "css")
          includeEngine = false;
        else if (p.name === "xpath" && (p.source.startsWith("//") || p.source.startsWith("..")))
          includeEngine = false;
      }
      const prefix = includeEngine ? p.name + "=" : "";
      return `${i === selector.capture ? "*" : ""}${prefix}${p.source}`;
    }).join(" >> ");
  }
  function visitAllSelectorParts(selector, visitor) {
    const visit = (selector2, nested) => {
      for (const part of selector2.parts) {
        visitor(part, nested);
        if (kNestedSelectorNames.has(part.name))
          visit(part.body.parsed, true);
      }
    };
    visit(selector, false);
  }
  function parseSelectorString(selector) {
    let index = 0;
    let quote;
    let start = 0;
    const result = { parts: [] };
    const append = () => {
      const part = selector.substring(start, index).trim();
      const eqIndex = part.indexOf("=");
      let name;
      let body;
      if (eqIndex !== -1 && part.substring(0, eqIndex).trim().match(/^[a-zA-Z_0-9-+:*]+$/)) {
        name = part.substring(0, eqIndex).trim();
        body = part.substring(eqIndex + 1);
      } else if (part.length > 1 && part[0] === '"' && part[part.length - 1] === '"') {
        name = "text";
        body = part;
      } else if (part.length > 1 && part[0] === "'" && part[part.length - 1] === "'") {
        name = "text";
        body = part;
      } else if (/^\(*\/\//.test(part) || part.startsWith("..")) {
        name = "xpath";
        body = part;
      } else {
        name = "css";
        body = part;
      }
      let capture = false;
      if (name[0] === "*") {
        capture = true;
        name = name.substring(1);
      }
      result.parts.push({ name, body });
      if (capture) {
        if (result.capture !== void 0)
          throw new InvalidSelectorError(`Only one of the selectors can capture using * modifier`);
        result.capture = result.parts.length - 1;
      }
    };
    if (!selector.includes(">>")) {
      index = selector.length;
      append();
      return result;
    }
    const shouldIgnoreTextSelectorQuote = () => {
      const prefix = selector.substring(start, index);
      const match = prefix.match(/^\s*text\s*=(.*)$/);
      return !!match && !!match[1];
    };
    while (index < selector.length) {
      const c = selector[index];
      if (c === "\\" && index + 1 < selector.length) {
        index += 2;
      } else if (c === quote) {
        quote = void 0;
        index++;
      } else if (!quote && (c === '"' || c === "'" || c === "`") && !shouldIgnoreTextSelectorQuote()) {
        quote = c;
        index++;
      } else if (!quote && c === ">" && selector[index + 1] === ">") {
        append();
        index += 2;
        start = index;
      } else {
        index++;
      }
    }
    append();
    return result;
  }
  function parseAttributeSelector(selector, allowUnquotedStrings) {
    let wp = 0;
    let EOL = selector.length === 0;
    const next = () => selector[wp] || "";
    const eat1 = () => {
      const result2 = next();
      ++wp;
      EOL = wp >= selector.length;
      return result2;
    };
    const syntaxError = (stage) => {
      if (EOL)
        throw new InvalidSelectorError(`Unexpected end of selector while parsing selector \`${selector}\``);
      throw new InvalidSelectorError(`Error while parsing selector \`${selector}\` - unexpected symbol "${next()}" at position ${wp}` + (stage ? " during " + stage : ""));
    };
    function skipSpaces() {
      while (!EOL && /\s/.test(next()))
        eat1();
    }
    function isCSSNameChar(char) {
      return char >= "\x80" || char >= "0" && char <= "9" || char >= "A" && char <= "Z" || char >= "a" && char <= "z" || char >= "0" && char <= "9" || char === "_" || char === "-";
    }
    function readIdentifier() {
      let result2 = "";
      skipSpaces();
      while (!EOL && isCSSNameChar(next()))
        result2 += eat1();
      return result2;
    }
    function readQuotedString(quote) {
      let result2 = eat1();
      if (result2 !== quote)
        syntaxError("parsing quoted string");
      while (!EOL && next() !== quote) {
        if (next() === "\\")
          eat1();
        result2 += eat1();
      }
      if (next() !== quote)
        syntaxError("parsing quoted string");
      result2 += eat1();
      return result2;
    }
    function readRegularExpression() {
      if (eat1() !== "/")
        syntaxError("parsing regular expression");
      let source = "";
      let inClass = false;
      while (!EOL) {
        if (next() === "\\") {
          source += eat1();
          if (EOL)
            syntaxError("parsing regular expression");
        } else if (inClass && next() === "]") {
          inClass = false;
        } else if (!inClass && next() === "[") {
          inClass = true;
        } else if (!inClass && next() === "/") {
          break;
        }
        source += eat1();
      }
      if (eat1() !== "/")
        syntaxError("parsing regular expression");
      let flags = "";
      while (!EOL && next().match(/[dgimsuvy]/))
        flags += eat1();
      try {
        return new RegExp(source, flags);
      } catch (e) {
        throw new InvalidSelectorError(`Error while parsing selector \`${selector}\`: ${e.message}`);
      }
    }
    function readAttributeToken() {
      let token = "";
      skipSpaces();
      if (next() === `'` || next() === `"`)
        token = readQuotedString(next()).slice(1, -1);
      else
        token = readIdentifier();
      if (!token)
        syntaxError("parsing property path");
      return token;
    }
    function readOperator() {
      skipSpaces();
      let op = "";
      if (!EOL)
        op += eat1();
      if (!EOL && op !== "=")
        op += eat1();
      if (!["=", "*=", "^=", "$=", "|=", "~="].includes(op))
        syntaxError("parsing operator");
      return op;
    }
    function readAttribute() {
      eat1();
      const jsonPath = [];
      jsonPath.push(readAttributeToken());
      skipSpaces();
      while (next() === ".") {
        eat1();
        jsonPath.push(readAttributeToken());
        skipSpaces();
      }
      if (next() === "]") {
        eat1();
        return { name: jsonPath.join("."), jsonPath, op: "<truthy>", value: null, caseSensitive: false };
      }
      const operator = readOperator();
      let value = void 0;
      let caseSensitive = true;
      skipSpaces();
      if (next() === "/") {
        if (operator !== "=")
          throw new InvalidSelectorError(`Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with regular expression`);
        value = readRegularExpression();
      } else if (next() === `'` || next() === `"`) {
        value = readQuotedString(next()).slice(1, -1);
        skipSpaces();
        if (next() === "i" || next() === "I") {
          caseSensitive = false;
          eat1();
        } else if (next() === "s" || next() === "S") {
          caseSensitive = true;
          eat1();
        }
      } else {
        value = "";
        while (!EOL && (isCSSNameChar(next()) || next() === "+" || next() === "."))
          value += eat1();
        if (value === "true") {
          value = true;
        } else if (value === "false") {
          value = false;
        } else {
          if (!allowUnquotedStrings) {
            value = +value;
            if (Number.isNaN(value))
              syntaxError("parsing attribute value");
          }
        }
      }
      skipSpaces();
      if (next() !== "]")
        syntaxError("parsing attribute value");
      eat1();
      if (operator !== "=" && typeof value !== "string")
        throw new InvalidSelectorError(`Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with non-string matching value - ${value}`);
      return { name: jsonPath.join("."), jsonPath, op: operator, value, caseSensitive };
    }
    const result = {
      name: "",
      attributes: []
    };
    result.name = readIdentifier();
    skipSpaces();
    while (next() === "[") {
      result.attributes.push(readAttribute());
      skipSpaces();
    }
    if (!EOL)
      syntaxError(void 0);
    if (!result.name && !result.attributes.length)
      throw new InvalidSelectorError(`Error while parsing selector \`${selector}\` - selector cannot be empty`);
    return result;
  }
  function asLocatorDescription(lang, selector) {
    try {
      const parsed = parseSelector(selector);
      const customDescription = parseCustomDescription(parsed);
      if (customDescription)
        return customDescription;
      return innerAsLocators(new generators[lang](), parsed, false, 1)[0];
    } catch (e) {
      return selector;
    }
  }
  function locatorCustomDescription(selector) {
    try {
      const parsed = parseSelector(selector);
      return parseCustomDescription(parsed);
    } catch (e) {
      return void 0;
    }
  }
  function parseCustomDescription(parsed) {
    const lastPart = parsed.parts[parsed.parts.length - 1];
    if (lastPart?.name === "internal:describe") {
      const description = JSON.parse(lastPart.body);
      if (typeof description === "string")
        return description;
    }
    return void 0;
  }
  function asLocator(lang, selector, isFrameLocator = false) {
    return asLocators(lang, selector, isFrameLocator, 1)[0];
  }
  function asLocators(lang, selector, isFrameLocator = false, maxOutputSize = 20, preferredQuote) {
    try {
      return innerAsLocators(new generators[lang](preferredQuote), parseSelector(selector), isFrameLocator, maxOutputSize);
    } catch (e) {
      return [selector];
    }
  }
  function innerAsLocators(factory, parsed, isFrameLocator = false, maxOutputSize = 20) {
    const parts = [...parsed.parts];
    const tokens = [];
    let nextBase = isFrameLocator ? "frame-locator" : "page";
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const base = nextBase;
      nextBase = "locator";
      if (part.name === "internal:describe")
        continue;
      if (part.name === "nth") {
        if (part.body === "0")
          tokens.push([factory.generateLocator(base, "first", ""), factory.generateLocator(base, "nth", "0")]);
        else if (part.body === "-1")
          tokens.push([factory.generateLocator(base, "last", ""), factory.generateLocator(base, "nth", "-1")]);
        else
          tokens.push([factory.generateLocator(base, "nth", part.body)]);
        continue;
      }
      if (part.name === "visible") {
        tokens.push([factory.generateLocator(base, "visible", part.body), factory.generateLocator(base, "default", `visible=${part.body}`)]);
        continue;
      }
      if (part.name === "internal:text") {
        const { exact, text } = detectExact(part.body);
        tokens.push([factory.generateLocator(base, "text", text, { exact })]);
        continue;
      }
      if (part.name === "internal:has-text") {
        const { exact, text } = detectExact(part.body);
        if (!exact) {
          tokens.push([factory.generateLocator(base, "has-text", text, { exact })]);
          continue;
        }
      }
      if (part.name === "internal:has-not-text") {
        const { exact, text } = detectExact(part.body);
        if (!exact) {
          tokens.push([factory.generateLocator(base, "has-not-text", text, { exact })]);
          continue;
        }
      }
      if (part.name === "internal:has") {
        const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
        tokens.push(inners.map((inner) => factory.generateLocator(base, "has", inner)));
        continue;
      }
      if (part.name === "internal:has-not") {
        const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
        tokens.push(inners.map((inner) => factory.generateLocator(base, "hasNot", inner)));
        continue;
      }
      if (part.name === "internal:and") {
        const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
        tokens.push(inners.map((inner) => factory.generateLocator(base, "and", inner)));
        continue;
      }
      if (part.name === "internal:or") {
        const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
        tokens.push(inners.map((inner) => factory.generateLocator(base, "or", inner)));
        continue;
      }
      if (part.name === "internal:chain") {
        const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
        tokens.push(inners.map((inner) => factory.generateLocator(base, "chain", inner)));
        continue;
      }
      if (part.name === "internal:label") {
        const { exact, text } = detectExact(part.body);
        tokens.push([factory.generateLocator(base, "label", text, { exact })]);
        continue;
      }
      if (part.name === "internal:role") {
        const attrSelector = parseAttributeSelector(part.body, true);
        const options = { attrs: [] };
        for (const attr of attrSelector.attributes) {
          if (attr.name === "name") {
            if (options.exact !== void 0 && options.exact !== attr.caseSensitive)
              throw new Error(`Conflicting exactness in internal:role selector: ${stringifySelector({ parts: [part] })}`);
            options.exact = attr.caseSensitive;
            options.name = attr.value;
          } else if (attr.name === "description") {
            if (options.exact !== void 0 && options.exact !== attr.caseSensitive)
              throw new Error(`Conflicting exactness in internal:role selector: ${stringifySelector({ parts: [part] })}`);
            options.exact = attr.caseSensitive;
            options.description = attr.value;
          } else {
            if (attr.name === "level" && typeof attr.value === "string")
              attr.value = +attr.value;
            options.attrs.push({ name: attr.name === "include-hidden" ? "includeHidden" : attr.name, value: attr.value });
          }
        }
        tokens.push([factory.generateLocator(base, "role", attrSelector.name, options)]);
        continue;
      }
      if (part.name === "internal:testid") {
        const attrSelector = parseAttributeSelector(part.body, true);
        const { value } = attrSelector.attributes[0];
        tokens.push([factory.generateLocator(base, "test-id", value)]);
        continue;
      }
      if (part.name === "internal:attr") {
        const attrSelector = parseAttributeSelector(part.body, true);
        const { name, value, caseSensitive } = attrSelector.attributes[0];
        const text = value;
        const exact = !!caseSensitive;
        if (name === "placeholder") {
          tokens.push([factory.generateLocator(base, "placeholder", text, { exact })]);
          continue;
        }
        if (name === "alt") {
          tokens.push([factory.generateLocator(base, "alt", text, { exact })]);
          continue;
        }
        if (name === "title") {
          tokens.push([factory.generateLocator(base, "title", text, { exact })]);
          continue;
        }
      }
      if (part.name === "internal:control" && (part.body === "pierce-frames" || part.body === "no-pierce-frames")) {
        tokens.push([factory.generateLocator(base, part.body, "")]);
        nextBase = "frame-locator";
        continue;
      }
      if (part.name === "internal:control" && part.body === "enter-frame") {
        const lastTokens = tokens[tokens.length - 1];
        const lastPart = parts[index - 1];
        const transformed = lastTokens.map((token) => factory.chainLocators([token, factory.generateLocator(base, "frame", "")]));
        if (["xpath", "css"].includes(lastPart.name)) {
          transformed.push(
            factory.generateLocator(base, "frame-locator", stringifySelector({ parts: [lastPart] })),
            factory.generateLocator(base, "frame-locator", stringifySelector({ parts: [lastPart] }, true))
          );
        }
        lastTokens.splice(0, lastTokens.length, ...transformed);
        nextBase = "frame-locator";
        continue;
      }
      const nextPart = parts[index + 1];
      const selectorPart = stringifySelector({ parts: [part] });
      const locatorPart = factory.generateLocator(base, "default", selectorPart);
      if (nextPart && ["internal:has-text", "internal:has-not-text"].includes(nextPart.name)) {
        const { exact, text } = detectExact(nextPart.body);
        if (!exact) {
          const nextLocatorPart = factory.generateLocator("locator", nextPart.name === "internal:has-text" ? "has-text" : "has-not-text", text, { exact });
          const options = {};
          if (nextPart.name === "internal:has-text")
            options.hasText = text;
          else
            options.hasNotText = text;
          const combinedPart = factory.generateLocator(base, "default", selectorPart, options);
          tokens.push([factory.chainLocators([locatorPart, nextLocatorPart]), combinedPart]);
          index++;
          continue;
        }
      }
      let locatorPartWithEngine;
      if (["xpath", "css"].includes(part.name)) {
        const selectorPart2 = stringifySelector(
          { parts: [part] },
          /* forceEngineName */
          true
        );
        locatorPartWithEngine = factory.generateLocator(base, "default", selectorPart2);
      }
      tokens.push([locatorPart, locatorPartWithEngine].filter(Boolean));
    }
    return combineTokens(factory, tokens, maxOutputSize);
  }
  function combineTokens(factory, tokens, maxOutputSize) {
    const currentTokens = tokens.map(() => "");
    const result = [];
    const visit = (index) => {
      if (index === tokens.length) {
        result.push(factory.chainLocators(currentTokens));
        return result.length < maxOutputSize;
      }
      for (const taken of tokens[index]) {
        currentTokens[index] = taken;
        if (!visit(index + 1))
          return false;
      }
      return true;
    };
    visit(0);
    return result;
  }
  function detectExact(text) {
    let exact = false;
    const match = text.match(/^\/(.*)\/([igm]*)$/);
    if (match)
      return { text: new RegExp(match[1], match[2]) };
    if (text.endsWith('"')) {
      text = JSON.parse(text);
      exact = true;
    } else if (text.endsWith('"s')) {
      text = JSON.parse(text.substring(0, text.length - 1));
      exact = true;
    } else if (text.endsWith('"i')) {
      text = JSON.parse(text.substring(0, text.length - 1));
      exact = false;
    }
    return { exact, text };
  }
  var JavaScriptLocatorFactory = class {
    constructor(preferredQuote) {
      this.preferredQuote = preferredQuote;
    }
    generateLocator(base, kind, body, options = {}) {
      switch (kind) {
        case "default":
          if (options.hasText !== void 0)
            return `locator(${this.quote(body)}, { hasText: ${this.toHasText(options.hasText)} })`;
          if (options.hasNotText !== void 0)
            return `locator(${this.quote(body)}, { hasNotText: ${this.toHasText(options.hasNotText)} })`;
          return `locator(${this.quote(body)})`;
        case "frame-locator":
          return `frameLocator(${this.quote(body)})`;
        case "frame":
          return `contentFrame()`;
        case "pierce-frames":
          return `pierceFrames()`;
        case "no-pierce-frames":
          return `pierceFrames({ pierce: false })`;
        case "nth":
          return `nth(${body})`;
        case "first":
          return `first()`;
        case "last":
          return `last()`;
        case "visible":
          return `filter({ visible: ${body === "true" ? "true" : "false"} })`;
        case "role":
          const attrs = [];
          if (isRegExp2(options.name))
            attrs.push(`name: ${this.regexToSourceString(options.name)}`);
          else if (typeof options.name === "string")
            attrs.push(`name: ${this.quote(options.name)}`);
          if (isRegExp2(options.description))
            attrs.push(`description: ${this.regexToSourceString(options.description)}`);
          else if (typeof options.description === "string")
            attrs.push(`description: ${this.quote(options.description)}`);
          if (options.exact && (typeof options.name === "string" || typeof options.description === "string"))
            attrs.push(`exact: true`);
          for (const { name, value } of options.attrs)
            attrs.push(`${name}: ${typeof value === "string" ? this.quote(value) : value}`);
          const attrString = attrs.length ? `, { ${attrs.join(", ")} }` : "";
          return `getByRole(${this.quote(body)}${attrString})`;
        case "has-text":
          return `filter({ hasText: ${this.toHasText(body)} })`;
        case "has-not-text":
          return `filter({ hasNotText: ${this.toHasText(body)} })`;
        case "has":
          return `filter({ has: ${body} })`;
        case "hasNot":
          return `filter({ hasNot: ${body} })`;
        case "and":
          return `and(${body})`;
        case "or":
          return `or(${body})`;
        case "chain":
          return `locator(${body})`;
        case "test-id":
          return `getByTestId(${this.toTestIdValue(body)})`;
        case "text":
          return this.toCallWithExact("getByText", body, !!options.exact);
        case "alt":
          return this.toCallWithExact("getByAltText", body, !!options.exact);
        case "placeholder":
          return this.toCallWithExact("getByPlaceholder", body, !!options.exact);
        case "label":
          return this.toCallWithExact("getByLabel", body, !!options.exact);
        case "title":
          return this.toCallWithExact("getByTitle", body, !!options.exact);
        default:
          throw new Error("Unknown selector kind " + kind);
      }
    }
    chainLocators(locators) {
      return locators.join(".");
    }
    regexToSourceString(re) {
      return normalizeEscapedRegexQuotes(String(re));
    }
    toCallWithExact(method, body, exact) {
      if (isRegExp2(body))
        return `${method}(${this.regexToSourceString(body)})`;
      return exact ? `${method}(${this.quote(body)}, { exact: true })` : `${method}(${this.quote(body)})`;
    }
    toHasText(body) {
      if (isRegExp2(body))
        return this.regexToSourceString(body);
      return this.quote(body);
    }
    toTestIdValue(value) {
      if (isRegExp2(value))
        return this.regexToSourceString(value);
      return this.quote(value);
    }
    quote(text) {
      return escapeWithQuotes(text, this.preferredQuote ?? "'");
    }
  };
  var PythonLocatorFactory = class {
    generateLocator(base, kind, body, options = {}) {
      switch (kind) {
        case "default":
          if (options.hasText !== void 0)
            return `locator(${this.quote(body)}, has_text=${this.toHasText(options.hasText)})`;
          if (options.hasNotText !== void 0)
            return `locator(${this.quote(body)}, has_not_text=${this.toHasText(options.hasNotText)})`;
          return `locator(${this.quote(body)})`;
        case "frame-locator":
          return `frame_locator(${this.quote(body)})`;
        case "frame":
          return `content_frame`;
        case "pierce-frames":
          return `pierce_frames`;
        case "no-pierce-frames":
          return `pierce_frames(pierce=False)`;
        case "nth":
          return `nth(${body})`;
        case "first":
          return `first`;
        case "last":
          return `last`;
        case "visible":
          return `filter(visible=${body === "true" ? "True" : "False"})`;
        case "role":
          const attrs = [];
          if (isRegExp2(options.name))
            attrs.push(`name=${this.regexToString(options.name)}`);
          else if (typeof options.name === "string")
            attrs.push(`name=${this.quote(options.name)}`);
          if (isRegExp2(options.description))
            attrs.push(`description=${this.regexToString(options.description)}`);
          else if (typeof options.description === "string")
            attrs.push(`description=${this.quote(options.description)}`);
          if (options.exact && (typeof options.name === "string" || typeof options.description === "string"))
            attrs.push(`exact=True`);
          for (const { name, value } of options.attrs) {
            let valueString = typeof value === "string" ? this.quote(value) : value;
            if (typeof value === "boolean")
              valueString = value ? "True" : "False";
            attrs.push(`${toSnakeCase(name)}=${valueString}`);
          }
          const attrString = attrs.length ? `, ${attrs.join(", ")}` : "";
          return `get_by_role(${this.quote(body)}${attrString})`;
        case "has-text":
          return `filter(has_text=${this.toHasText(body)})`;
        case "has-not-text":
          return `filter(has_not_text=${this.toHasText(body)})`;
        case "has":
          return `filter(has=${body})`;
        case "hasNot":
          return `filter(has_not=${body})`;
        case "and":
          return `and_(${body})`;
        case "or":
          return `or_(${body})`;
        case "chain":
          return `locator(${body})`;
        case "test-id":
          return `get_by_test_id(${this.toTestIdValue(body)})`;
        case "text":
          return this.toCallWithExact("get_by_text", body, !!options.exact);
        case "alt":
          return this.toCallWithExact("get_by_alt_text", body, !!options.exact);
        case "placeholder":
          return this.toCallWithExact("get_by_placeholder", body, !!options.exact);
        case "label":
          return this.toCallWithExact("get_by_label", body, !!options.exact);
        case "title":
          return this.toCallWithExact("get_by_title", body, !!options.exact);
        default:
          throw new Error("Unknown selector kind " + kind);
      }
    }
    chainLocators(locators) {
      return locators.join(".");
    }
    regexToString(body) {
      const suffix = body.flags.includes("i") ? ", re.IGNORECASE" : "";
      return `re.compile(r"${normalizeEscapedRegexQuotes(body.source).replace(/\\\//, "/").replace(/"/g, '\\"')}"${suffix})`;
    }
    toCallWithExact(method, body, exact) {
      if (isRegExp2(body))
        return `${method}(${this.regexToString(body)})`;
      if (exact)
        return `${method}(${this.quote(body)}, exact=True)`;
      return `${method}(${this.quote(body)})`;
    }
    toHasText(body) {
      if (isRegExp2(body))
        return this.regexToString(body);
      return `${this.quote(body)}`;
    }
    toTestIdValue(value) {
      if (isRegExp2(value))
        return this.regexToString(value);
      return this.quote(value);
    }
    quote(text) {
      return escapeWithQuotes(text, '"');
    }
  };
  var JavaLocatorFactory = class {
    generateLocator(base, kind, body, options = {}) {
      let clazz;
      switch (base) {
        case "page":
          clazz = "Page";
          break;
        case "frame-locator":
          clazz = "FrameLocator";
          break;
        case "locator":
          clazz = "Locator";
          break;
      }
      switch (kind) {
        case "default":
          if (options.hasText !== void 0)
            return `locator(${this.quote(body)}, new ${clazz}.LocatorOptions().setHasText(${this.toHasText(options.hasText)}))`;
          if (options.hasNotText !== void 0)
            return `locator(${this.quote(body)}, new ${clazz}.LocatorOptions().setHasNotText(${this.toHasText(options.hasNotText)}))`;
          return `locator(${this.quote(body)})`;
        case "frame-locator":
          return `frameLocator(${this.quote(body)})`;
        case "frame":
          return `contentFrame()`;
        case "pierce-frames":
          return `pierceFrames()`;
        case "no-pierce-frames":
          return `pierceFrames(new ${clazz}.PierceFramesOptions().setPierce(false))`;
        case "nth":
          return `nth(${body})`;
        case "first":
          return `first()`;
        case "last":
          return `last()`;
        case "visible":
          return `filter(new ${clazz}.FilterOptions().setVisible(${body === "true" ? "true" : "false"}))`;
        case "role":
          const attrs = [];
          if (isRegExp2(options.name))
            attrs.push(`.setName(${this.regexToString(options.name)})`);
          else if (typeof options.name === "string")
            attrs.push(`.setName(${this.quote(options.name)})`);
          if (isRegExp2(options.description))
            attrs.push(`.setDescription(${this.regexToString(options.description)})`);
          else if (typeof options.description === "string")
            attrs.push(`.setDescription(${this.quote(options.description)})`);
          if (options.exact && (typeof options.name === "string" || typeof options.description === "string"))
            attrs.push(`.setExact(true)`);
          for (const { name, value } of options.attrs)
            attrs.push(`.set${toTitleCase(name)}(${typeof value === "string" ? this.quote(value) : value})`);
          const attrString = attrs.length ? `, new ${clazz}.GetByRoleOptions()${attrs.join("")}` : "";
          return `getByRole(AriaRole.${toSnakeCase(body).toUpperCase()}${attrString})`;
        case "has-text":
          return `filter(new ${clazz}.FilterOptions().setHasText(${this.toHasText(body)}))`;
        case "has-not-text":
          return `filter(new ${clazz}.FilterOptions().setHasNotText(${this.toHasText(body)}))`;
        case "has":
          return `filter(new ${clazz}.FilterOptions().setHas(${body}))`;
        case "hasNot":
          return `filter(new ${clazz}.FilterOptions().setHasNot(${body}))`;
        case "and":
          return `and(${body})`;
        case "or":
          return `or(${body})`;
        case "chain":
          return `locator(${body})`;
        case "test-id":
          return `getByTestId(${this.toTestIdValue(body)})`;
        case "text":
          return this.toCallWithExact(clazz, "getByText", body, !!options.exact);
        case "alt":
          return this.toCallWithExact(clazz, "getByAltText", body, !!options.exact);
        case "placeholder":
          return this.toCallWithExact(clazz, "getByPlaceholder", body, !!options.exact);
        case "label":
          return this.toCallWithExact(clazz, "getByLabel", body, !!options.exact);
        case "title":
          return this.toCallWithExact(clazz, "getByTitle", body, !!options.exact);
        default:
          throw new Error("Unknown selector kind " + kind);
      }
    }
    chainLocators(locators) {
      return locators.join(".");
    }
    regexToString(body) {
      const suffix = body.flags.includes("i") ? ", Pattern.CASE_INSENSITIVE" : "";
      return `Pattern.compile(${this.quote(normalizeEscapedRegexQuotes(body.source))}${suffix})`;
    }
    toCallWithExact(clazz, method, body, exact) {
      if (isRegExp2(body))
        return `${method}(${this.regexToString(body)})`;
      if (exact)
        return `${method}(${this.quote(body)}, new ${clazz}.${toTitleCase(method)}Options().setExact(true))`;
      return `${method}(${this.quote(body)})`;
    }
    toHasText(body) {
      if (isRegExp2(body))
        return this.regexToString(body);
      return this.quote(body);
    }
    toTestIdValue(value) {
      if (isRegExp2(value))
        return this.regexToString(value);
      return this.quote(value);
    }
    quote(text) {
      return escapeWithQuotes(text, '"');
    }
  };
  var CSharpLocatorFactory = class {
    generateLocator(base, kind, body, options = {}) {
      switch (kind) {
        case "default":
          if (options.hasText !== void 0)
            return `Locator(${this.quote(body)}, new() { ${this.toHasText(options.hasText)} })`;
          if (options.hasNotText !== void 0)
            return `Locator(${this.quote(body)}, new() { ${this.toHasNotText(options.hasNotText)} })`;
          return `Locator(${this.quote(body)})`;
        case "frame-locator":
          return `FrameLocator(${this.quote(body)})`;
        case "frame":
          return `ContentFrame`;
        case "pierce-frames":
          return `PierceFrames`;
        case "no-pierce-frames":
          return `PierceFrames(new() { Pierce = false })`;
        case "nth":
          return `Nth(${body})`;
        case "first":
          return `First`;
        case "last":
          return `Last`;
        case "visible":
          return `Filter(new() { Visible = ${body === "true" ? "true" : "false"} })`;
        case "role":
          const attrs = [];
          if (isRegExp2(options.name))
            attrs.push(`NameRegex = ${this.regexToString(options.name)}`);
          else if (typeof options.name === "string")
            attrs.push(`Name = ${this.quote(options.name)}`);
          if (isRegExp2(options.description))
            attrs.push(`DescriptionRegex = ${this.regexToString(options.description)}`);
          else if (typeof options.description === "string")
            attrs.push(`Description = ${this.quote(options.description)}`);
          if (options.exact && (typeof options.name === "string" || typeof options.description === "string"))
            attrs.push(`Exact = true`);
          for (const { name, value } of options.attrs)
            attrs.push(`${toTitleCase(name)} = ${typeof value === "string" ? this.quote(value) : value}`);
          const attrString = attrs.length ? `, new() { ${attrs.join(", ")} }` : "";
          return `GetByRole(AriaRole.${toTitleCase(body)}${attrString})`;
        case "has-text":
          return `Filter(new() { ${this.toHasText(body)} })`;
        case "has-not-text":
          return `Filter(new() { ${this.toHasNotText(body)} })`;
        case "has":
          return `Filter(new() { Has = ${body} })`;
        case "hasNot":
          return `Filter(new() { HasNot = ${body} })`;
        case "and":
          return `And(${body})`;
        case "or":
          return `Or(${body})`;
        case "chain":
          return `Locator(${body})`;
        case "test-id":
          return `GetByTestId(${this.toTestIdValue(body)})`;
        case "text":
          return this.toCallWithExact("GetByText", body, !!options.exact);
        case "alt":
          return this.toCallWithExact("GetByAltText", body, !!options.exact);
        case "placeholder":
          return this.toCallWithExact("GetByPlaceholder", body, !!options.exact);
        case "label":
          return this.toCallWithExact("GetByLabel", body, !!options.exact);
        case "title":
          return this.toCallWithExact("GetByTitle", body, !!options.exact);
        default:
          throw new Error("Unknown selector kind " + kind);
      }
    }
    chainLocators(locators) {
      return locators.join(".");
    }
    regexToString(body) {
      const suffix = body.flags.includes("i") ? ", RegexOptions.IgnoreCase" : "";
      return `new Regex(${this.quote(normalizeEscapedRegexQuotes(body.source))}${suffix})`;
    }
    toCallWithExact(method, body, exact) {
      if (isRegExp2(body))
        return `${method}(${this.regexToString(body)})`;
      if (exact)
        return `${method}(${this.quote(body)}, new() { Exact = true })`;
      return `${method}(${this.quote(body)})`;
    }
    toHasText(body) {
      if (isRegExp2(body))
        return `HasTextRegex = ${this.regexToString(body)}`;
      return `HasText = ${this.quote(body)}`;
    }
    toTestIdValue(value) {
      if (isRegExp2(value))
        return this.regexToString(value);
      return this.quote(value);
    }
    toHasNotText(body) {
      if (isRegExp2(body))
        return `HasNotTextRegex = ${this.regexToString(body)}`;
      return `HasNotText = ${this.quote(body)}`;
    }
    quote(text) {
      return escapeWithQuotes(text, '"');
    }
  };
  var JsonlLocatorFactory = class {
    generateLocator(base, kind, body, options = {}) {
      return JSON.stringify({
        kind,
        body,
        options
      });
    }
    chainLocators(locators) {
      const objects = locators.map((l) => JSON.parse(l));
      for (let i = 0; i < objects.length - 1; ++i) {
        let tail = objects[i];
        while (tail.next)
          tail = tail.next;
        tail.next = objects[i + 1];
      }
      return JSON.stringify(objects[0]);
    }
  };
  var generators = {
    javascript: JavaScriptLocatorFactory,
    python: PythonLocatorFactory,
    java: JavaLocatorFactory,
    csharp: CSharpLocatorFactory,
    jsonl: JsonlLocatorFactory
  };
  function isRegExp2(obj) {
    return obj instanceof RegExp;
  }
  function getByAttributeTextSelector(attrName, text, options) {
    return `internal:attr=[${attrName}=${escapeForAttributeSelector(text, options?.exact || false)}]`;
  }
  function splitTestIdAttributeNames(testIdAttributeName) {
    return testIdAttributeName.split(",");
  }
  function encodeTestIdAttributeName(testIdAttributeName) {
    return testIdAttributeName.includes(",") ? JSON.stringify(testIdAttributeName) : testIdAttributeName;
  }
  function getByTestIdSelector(testIdAttributeName, testId) {
    return `internal:testid=[${encodeTestIdAttributeName(testIdAttributeName)}=${escapeForAttributeSelector(testId, true)}]`;
  }
  function getByLabelSelector(text, options) {
    return "internal:label=" + escapeForTextSelector(text, !!options?.exact);
  }
  function getByAltTextSelector(text, options) {
    return getByAttributeTextSelector("alt", text, options);
  }
  function getByTitleSelector(text, options) {
    return getByAttributeTextSelector("title", text, options);
  }
  function getByPlaceholderSelector(text, options) {
    return getByAttributeTextSelector("placeholder", text, options);
  }
  function getByTextSelector(text, options) {
    return "internal:text=" + escapeForTextSelector(text, !!options?.exact);
  }
  function getByRoleSelector(role, options = {}) {
    const props = [];
    if (options.checked !== void 0)
      props.push(["checked", String(options.checked)]);
    if (options.disabled !== void 0)
      props.push(["disabled", String(options.disabled)]);
    if (options.selected !== void 0)
      props.push(["selected", String(options.selected)]);
    if (options.expanded !== void 0)
      props.push(["expanded", String(options.expanded)]);
    if (options.includeHidden !== void 0)
      props.push(["include-hidden", String(options.includeHidden)]);
    if (options.level !== void 0)
      props.push(["level", String(options.level)]);
    if (options.name !== void 0)
      props.push(["name", escapeForAttributeSelector(options.name, !!options.exact)]);
    if (options.description !== void 0)
      props.push(["description", escapeForAttributeSelector(options.description, !!options.exact)]);
    if (options.pressed !== void 0)
      props.push(["pressed", String(options.pressed)]);
    return `internal:role=${role}${props.map(([n, v]) => `[${n}=${v}]`).join("")}`;
  }
  var selectorSymbol = /* @__PURE__ */ Symbol("selector");
  var _Locator = class _Locator2 {
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
        return new _Locator2(injectedScript, selectorBase ? selectorBase + " >> " + selector2 : selector2, options2);
      };
      self.getByTestId = (testId) => self.locator(getByTestIdSelector(injectedScript.testIdAttributeNameForStrictErrorAndConsoleCodegen(), testId));
      self.getByAltText = (text, options2) => self.locator(getByAltTextSelector(text, options2));
      self.getByLabel = (text, options2) => self.locator(getByLabelSelector(text, options2));
      self.getByPlaceholder = (text, options2) => self.locator(getByPlaceholderSelector(text, options2));
      self.getByText = (text, options2) => self.locator(getByTextSelector(text, options2));
      self.getByTitle = (text, options2) => self.locator(getByTitleSelector(text, options2));
      self.getByRole = (role, options2 = {}) => self.locator(getByRoleSelector(role, options2));
      self.filter = (options2) => new _Locator2(injectedScript, selector, options2);
      self.first = () => self.locator("nth=0");
      self.last = () => self.locator("nth=-1");
      self.nth = (index) => self.locator(`nth=${index}`);
      self.and = (locator) => new _Locator2(injectedScript, selectorBase + ` >> internal:and=` + JSON.stringify(locator[selectorSymbol]));
      self.or = (locator) => new _Locator2(injectedScript, selectorBase + ` >> internal:or=` + JSON.stringify(locator[selectorSymbol]));
    }
  };
  var Locator = _Locator;
  var ConsoleAPI = class {
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
  };
  var highlight_default = ":host{font-size:13px;font-family:system-ui,Ubuntu,Droid Sans,sans-serif;color:#333;color-scheme:light}svg{position:absolute;height:0}x-pw-tooltip{backdrop-filter:blur(5px);background-color:#fff;border-radius:6px;box-shadow:0 .5rem 1.2rem #0000004d;display:none;font-size:12.8px;font-weight:400;left:0;line-height:1.5;max-width:600px;position:absolute;top:0;padding:0;flex-direction:column;overflow:hidden}x-pw-tooltip-line{display:flex;max-width:600px;padding:6px;user-select:none;cursor:pointer}x-pw-tooltip-footer{display:flex;max-width:600px;padding:6px;user-select:none;color:#777}x-pw-dialog{background-color:#fff;pointer-events:auto;border-radius:6px;box-shadow:0 .5rem 1.2rem #0000004d;display:flex;flex-direction:column;position:absolute;z-index:10;font-size:13px}x-pw-dialog:not(.autosize){width:400px;height:150px}x-pw-dialog-body{display:flex;flex-direction:column;flex:auto}x-pw-dialog-body label{margin:5px 8px;display:flex;flex-direction:row;align-items:center}x-pw-highlight{position:absolute;top:0;left:0;width:0;height:0}x-pw-action-point{position:absolute;width:20px;height:20px;background:red;border-radius:10px;margin:-10px 0 0 -10px;z-index:2}x-pw-action-cursor{position:absolute;width:18px;height:22px;pointer-events:none;z-index:4;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))}x-pw-action-cursor svg{width:100%;height:100%;position:static}x-pw-title{position:absolute;backdrop-filter:blur(5px);background-color:#00000080;color:#fff;border-radius:6px;padding:6px;font-size:24px;line-height:1.4;white-space:nowrap;user-select:none;z-index:3}x-pw-user-overlays,x-pw-user-overlay{position:absolute;inset:0}@keyframes pw-fade-out{0%{opacity:1}to{opacity:0}}x-pw-separator{height:1px;margin:6px 9px;background:#949494e5}x-pw-tool-gripper{height:28px;width:24px;margin:2px 0;cursor:grab}x-pw-tool-gripper:active{cursor:grabbing}x-pw-tool-gripper>x-div{width:16px;height:16px;margin:6px 4px;clip-path:url(#icon-gripper);background-color:#555}x-pw-tools-list>label{display:flex;align-items:center;margin:0 10px;user-select:none}x-pw-tools-list{display:flex;width:100%;border-bottom:1px solid #dddddd}x-pw-tool-item{pointer-events:auto;height:28px;width:28px;border-radius:3px}x-pw-tool-item:not(.disabled){cursor:pointer}x-pw-tool-item:not(.disabled):hover{background-color:#dbdbdb}x-pw-tool-item.toggled{background-color:#8acae480}x-pw-tool-item.toggled:not(.disabled):hover{background-color:#8acae4c4}x-pw-tool-item>x-div{width:16px;height:16px;margin:6px;background-color:#3a3a3a}x-pw-tool-item.disabled>x-div{background-color:#61616180;cursor:default}x-pw-tool-item.record.toggled{background-color:transparent}x-pw-tool-item.record.toggled:not(.disabled):hover{background-color:#dbdbdb}x-pw-tool-item.record.toggled>x-div{background-color:#a1260d}x-pw-tool-item.record.disabled.toggled>x-div{opacity:.8}x-pw-tool-item.accept>x-div{background-color:#388a34}x-pw-tool-item.record>x-div{clip-path:url(#icon-circle-large-filled)}x-pw-tool-item.record.toggled>x-div{clip-path:url(#icon-stop-circle)}x-pw-tool-item.pick-locator>x-div{clip-path:url(#icon-inspect)}x-pw-tool-item.text>x-div{clip-path:url(#icon-whole-word)}x-pw-tool-item.visibility>x-div{clip-path:url(#icon-eye)}x-pw-tool-item.value>x-div{clip-path:url(#icon-symbol-constant)}x-pw-tool-item.snapshot>x-div{clip-path:url(#icon-gist)}x-pw-tool-item.accept>x-div{clip-path:url(#icon-check)}x-pw-tool-item.cancel>x-div{clip-path:url(#icon-close)}x-pw-tool-item.succeeded>x-div{clip-path:url(#icon-pass);background-color:#388a34!important}x-pw-overlay{position:absolute;top:0;max-width:min-content;z-index:2147483647;background:transparent;pointer-events:auto}x-pw-overlay x-pw-tools-list{background-color:#fffd;box-shadow:#0000001a 0 5px 5px;border-radius:3px;border-bottom:none}x-pw-overlay x-pw-tool-item{margin:2px}textarea.text-editor{font-family:system-ui,Ubuntu,Droid Sans,sans-serif;flex:auto;border:none;margin:6px 10px;color:#333;outline:1px solid transparent!important;resize:none;padding:0;font-size:13px}textarea.text-editor.does-not-match{outline:1px solid red!important}x-div{display:block}x-spacer{flex:auto}*{box-sizing:border-box}*[hidden]{display:none!important}x-locator-editor{flex:none;width:100%;height:60px;padding:4px;border-bottom:1px solid #dddddd;outline:1px solid transparent}x-locator-editor.does-not-match{outline:1px solid red}.CodeMirror{width:100%!important;height:100%!important}x-pw-action-list{flex:auto;display:flex;flex-direction:column;user-select:none}x-pw-action-item{padding:6px 10px;cursor:pointer;overflow:hidden}x-pw-action-item:hover{background-color:#f2f2f2}x-pw-action-item:last-child{border-bottom-left-radius:6px;border-bottom-right-radius:6px}\n";
  var Highlight = class {
    constructor(injectedScript) {
      this._renderedEntries = [];
      this._userOverlays = /* @__PURE__ */ new Map();
      this._userOverlayHidden = false;
      this._language = "javascript";
      this._elementHighlightSelectors = /* @__PURE__ */ new Map();
      this._injectedScript = injectedScript;
      const document = injectedScript.document;
      this._isUnderTest = injectedScript.isUnderTest;
      this._glassPaneElement = document.createElement("x-pw-glass");
      this._glassPaneElement.setAttribute("popover", "manual");
      this._glassPaneElement.style.inset = "0";
      this._glassPaneElement.style.width = "100%";
      this._glassPaneElement.style.height = "100%";
      this._glassPaneElement.style.maxWidth = "none";
      this._glassPaneElement.style.maxHeight = "none";
      this._glassPaneElement.style.padding = "0";
      this._glassPaneElement.style.margin = "0";
      this._glassPaneElement.style.border = "none";
      this._glassPaneElement.style.overflow = "visible";
      this._glassPaneElement.style.pointerEvents = "none";
      this._glassPaneElement.style.display = "flex";
      this._glassPaneElement.style.backgroundColor = "transparent";
      this._actionPointElement = document.createElement("x-pw-action-point");
      this._actionPointElement.setAttribute("hidden", "true");
      this._actionCursorElement = document.createElement("x-pw-action-cursor");
      this._actionCursorElement.style.visibility = "hidden";
      this._actionCursorElement.appendChild(this._createCursorSvg(document));
      this._titleElement = document.createElement("x-pw-title");
      this._titleElement.setAttribute("hidden", "true");
      this._userOverlayContainer = document.createElement("x-pw-user-overlays");
      this._userOverlayContainer.setAttribute("hidden", "true");
      this._glassPaneShadow = this._glassPaneElement.attachShadow({ mode: this._isUnderTest ? "open" : "closed" });
      if (typeof this._glassPaneShadow.adoptedStyleSheets.push === "function") {
        const sheet = new this._injectedScript.window.CSSStyleSheet();
        sheet.replaceSync(highlight_default);
        this._glassPaneShadow.adoptedStyleSheets.push(sheet);
      } else {
        const styleElement = this._injectedScript.document.createElement("style");
        styleElement.textContent = highlight_default;
        this._glassPaneShadow.appendChild(styleElement);
      }
      this._glassPaneShadow.appendChild(this._actionPointElement);
      this._glassPaneShadow.appendChild(this._actionCursorElement);
      this._glassPaneShadow.appendChild(this._titleElement);
      this._glassPaneShadow.appendChild(this._userOverlayContainer);
    }
    install() {
      if (!this._injectedScript.document.documentElement)
        return;
      if (!this._injectedScript.document.documentElement.contains(this._glassPaneElement) || this._glassPaneElement.nextElementSibling)
        this._injectedScript.document.documentElement.appendChild(this._glassPaneElement);
      this._bringToFront();
    }
    _bringToFront() {
      this._glassPaneElement.hidePopover();
      this._glassPaneElement.showPopover();
    }
    setLanguage(language) {
      this._language = language;
    }
    addElementHighlight(selector, cssStyle) {
      const key = stringifySelector(selector);
      this._elementHighlightSelectors.set(key, { selector, cssStyle });
      this._ensureElementHighlightRaf();
    }
    removeElementHighlight(selector) {
      const key = stringifySelector(selector);
      if (!this._elementHighlightSelectors.delete(key))
        return;
      if (this._elementHighlightSelectors.size === 0) {
        if (this._rafRequest) {
          this._injectedScript.utils.builtins.cancelAnimationFrame(this._rafRequest);
          this._rafRequest = void 0;
        }
        this.clearHighlight();
      }
    }
    _ensureElementHighlightRaf() {
      if (this._rafRequest)
        return;
      const tick = () => {
        const entries = [];
        for (const { selector, cssStyle } of this._elementHighlightSelectors.values()) {
          const elements = this._injectedScript.querySelectorAll(selector, this._injectedScript.document.documentElement);
          const locator = asLocator(this._language, stringifySelector(selector));
          const color = elements.length > 1 ? "#f6b26b7f" : "#6fa8dc7f";
          for (let i = 0; i < elements.length; ++i) {
            const suffix = elements.length > 1 ? ` [${i + 1} of ${elements.length}]` : "";
            entries.push({ element: elements[i], color, tooltipText: locator + suffix, cssStyle });
          }
        }
        this.updateHighlight(entries);
        this._rafRequest = this._injectedScript.utils.builtins.requestAnimationFrame(tick);
      };
      this._rafRequest = this._injectedScript.utils.builtins.requestAnimationFrame(tick);
    }
    uninstall() {
      if (this._rafRequest) {
        this._injectedScript.utils.builtins.cancelAnimationFrame(this._rafRequest);
        this._rafRequest = void 0;
      }
      this._elementHighlightSelectors.clear();
      this._glassPaneElement.remove();
    }
    showActionPoint(x, y, fadeDuration) {
      this._actionPointElement.style.top = y + "px";
      this._actionPointElement.style.left = x + "px";
      this._actionPointElement.hidden = false;
      if (fadeDuration)
        this._actionPointElement.style.animation = `pw-fade-out ${fadeDuration}ms ease-out forwards`;
      else
        this._actionPointElement.style.animation = "";
    }
    hideActionPoint() {
      this._actionPointElement.hidden = true;
    }
    moveActionCursor(x, y, fadeDuration) {
      const moveDuration = fadeDuration ? Math.max(80, Math.min(fadeDuration * 0.6, 400)) : 0;
      this._actionCursorElement.style.transition = `top ${moveDuration}ms ease, left ${moveDuration}ms ease`;
      this._actionCursorElement.style.left = x + "px";
      this._actionCursorElement.style.top = y + "px";
      this._actionCursorElement.style.visibility = "visible";
    }
    hideActionCursor() {
      this._actionCursorElement.style.visibility = "hidden";
    }
    _createCursorSvg(document) {
      const svgNs = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNs, "svg");
      svg.setAttribute("viewBox", "0 0 18 22");
      const path = document.createElementNS(svgNs, "path");
      path.setAttribute("d", "M1 1 L1 17 L5.5 13 L8 20.5 L11 19.5 L8.5 12 L15 12 Z");
      path.setAttribute("fill", "white");
      path.setAttribute("stroke", "black");
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("stroke-linejoin", "round");
      svg.appendChild(path);
      return svg;
    }
    showActionTitle(text, fadeDuration, position, fontSize) {
      this._titleElement.textContent = text;
      this._titleElement.hidden = false;
      if (fadeDuration) {
        const fadeTime = fadeDuration / 4;
        this._titleElement.style.animation = `pw-fade-out ${fadeTime}ms ease-out ${fadeDuration - fadeTime}ms forwards`;
      } else {
        this._titleElement.style.animation = "";
      }
      this._titleElement.style.top = "";
      this._titleElement.style.bottom = "";
      this._titleElement.style.left = "";
      this._titleElement.style.right = "";
      this._titleElement.style.transform = "";
      switch (position) {
        case "top-left":
          this._titleElement.style.top = "6px";
          this._titleElement.style.left = "6px";
          break;
        case "top":
          this._titleElement.style.top = "6px";
          this._titleElement.style.left = "50%";
          this._titleElement.style.transform = "translateX(-50%)";
          break;
        case "bottom-left":
          this._titleElement.style.bottom = "6px";
          this._titleElement.style.left = "6px";
          break;
        case "bottom":
          this._titleElement.style.bottom = "6px";
          this._titleElement.style.left = "50%";
          this._titleElement.style.transform = "translateX(-50%)";
          break;
        case "bottom-right":
          this._titleElement.style.bottom = "6px";
          this._titleElement.style.right = "6px";
          break;
        case "top-right":
        default:
          this._titleElement.style.top = "6px";
          this._titleElement.style.right = "6px";
          break;
      }
      if (fontSize)
        this._titleElement.style.fontSize = fontSize + "px";
    }
    hideActionTitle() {
      this._titleElement.hidden = true;
    }
    addUserOverlay(id, html) {
      const element = this._injectedScript.document.createElement("div");
      element.className = "x-pw-user-overlay";
      element.innerHTML = html;
      for (const script of element.querySelectorAll("script"))
        script.remove();
      for (const el of element.querySelectorAll("*")) {
        for (const attr of [...el.attributes]) {
          if (attr.name.startsWith("on"))
            el.removeAttribute(attr.name);
        }
      }
      this._userOverlays.set(id, element);
      this._userOverlayContainer.appendChild(element);
      this._userOverlayContainer.hidden = this._userOverlayHidden;
      return id;
    }
    getUserOverlay(id) {
      return this._userOverlays.get(id);
    }
    removeUserOverlay(id) {
      const element = this._userOverlays.get(id);
      if (element) {
        element.remove();
        this._userOverlays.delete(id);
      }
      if (this._userOverlays.size === 0)
        this._userOverlayContainer.hidden = true;
    }
    setUserOverlaysVisible(visible) {
      this._userOverlayHidden = !visible;
      this._userOverlayContainer.hidden = !visible || this._userOverlays.size === 0;
    }
    clearHighlight() {
      for (const entry of this._renderedEntries) {
        entry.highlightElement?.remove();
        entry.tooltipElement?.remove();
      }
      this._renderedEntries = [];
    }
    addMaskedElements(elements, color) {
      const existingEntries = this._renderedEntries.map((e) => ({ element: e.targetElement, color: e.color }));
      const newEntries = elements.map((element) => ({ element, color }));
      this.updateHighlight([...existingEntries, ...newEntries]);
    }
    updateHighlight(entries) {
      if (this._highlightIsUpToDate(entries))
        return;
      this.clearHighlight();
      for (const entry of entries) {
        const highlightElement = this._createHighlightElement();
        this._glassPaneShadow.appendChild(highlightElement);
        let tooltipElement;
        if (entry.tooltipText) {
          tooltipElement = this._injectedScript.document.createElement("x-pw-tooltip");
          this._glassPaneShadow.appendChild(tooltipElement);
          tooltipElement.style.top = "0";
          tooltipElement.style.left = "0";
          tooltipElement.style.display = "flex";
          const lineElement = this._injectedScript.document.createElement("x-pw-tooltip-line");
          lineElement.textContent = entry.tooltipText;
          tooltipElement.appendChild(lineElement);
        }
        this._renderedEntries.push({ targetElement: entry.element, box: toDOMRect(entry.box), color: entry.color, borderColor: entry.borderColor, fadeDuration: entry.fadeDuration, cssStyle: entry.cssStyle, tooltipElement, highlightElement });
      }
      for (const entry of this._renderedEntries) {
        if (!entry.box && !entry.targetElement)
          continue;
        entry.box = entry.box || entry.targetElement.getBoundingClientRect();
        if (!entry.tooltipElement)
          continue;
        const { anchorLeft, anchorTop } = this.tooltipPosition(entry.box, entry.tooltipElement);
        entry.tooltipTop = anchorTop;
        entry.tooltipLeft = anchorLeft;
      }
      for (const entry of this._renderedEntries) {
        if (entry.tooltipElement) {
          entry.tooltipElement.style.top = entry.tooltipTop + "px";
          entry.tooltipElement.style.left = entry.tooltipLeft + "px";
        }
        const box = entry.box;
        entry.highlightElement.style.backgroundColor = entry.color;
        entry.highlightElement.style.left = box.x + "px";
        entry.highlightElement.style.top = box.y + "px";
        entry.highlightElement.style.width = box.width + "px";
        entry.highlightElement.style.height = box.height + "px";
        entry.highlightElement.style.display = "block";
        if (entry.borderColor)
          entry.highlightElement.style.border = "2px solid " + entry.borderColor;
        if (entry.fadeDuration)
          entry.highlightElement.style.animation = `pw-fade-out ${entry.fadeDuration}ms ease-out forwards`;
        if (entry.cssStyle)
          entry.highlightElement.style.cssText += ";" + entry.cssStyle;
        if (this._isUnderTest)
          console.error("Highlight box for test: " + JSON.stringify({ x: box.x, y: box.y, width: box.width, height: box.height }));
      }
    }
    firstBox() {
      return this._renderedEntries[0]?.box;
    }
    firstTooltipBox() {
      const entry = this._renderedEntries[0];
      if (!entry || !entry.tooltipElement || entry.tooltipLeft === void 0 || entry.tooltipTop === void 0)
        return;
      return {
        x: entry.tooltipLeft,
        y: entry.tooltipTop,
        left: entry.tooltipLeft,
        top: entry.tooltipTop,
        width: entry.tooltipElement.offsetWidth,
        height: entry.tooltipElement.offsetHeight,
        bottom: entry.tooltipTop + entry.tooltipElement.offsetHeight,
        right: entry.tooltipLeft + entry.tooltipElement.offsetWidth,
        toJSON: () => {
        }
      };
    }
    // Note: there is a copy of this method in dialog.tsx. Please fix bugs in both places.
    tooltipPosition(box, tooltipElement) {
      const tooltipWidth = tooltipElement.offsetWidth;
      const tooltipHeight = tooltipElement.offsetHeight;
      const totalWidth = this._glassPaneElement.offsetWidth;
      const totalHeight = this._glassPaneElement.offsetHeight;
      let anchorLeft = Math.max(5, box.left);
      if (anchorLeft + tooltipWidth > totalWidth - 5)
        anchorLeft = totalWidth - tooltipWidth - 5;
      let anchorTop = Math.max(0, box.bottom) + 5;
      if (anchorTop + tooltipHeight > totalHeight - 5) {
        if (Math.max(0, box.top) > tooltipHeight + 5) {
          anchorTop = Math.max(0, box.top) - tooltipHeight - 5;
        } else {
          anchorTop = totalHeight - 5 - tooltipHeight;
        }
      }
      return { anchorLeft, anchorTop };
    }
    _highlightIsUpToDate(entries) {
      if (entries.length !== this._renderedEntries.length)
        return false;
      for (let i = 0; i < this._renderedEntries.length; ++i) {
        if (entries[i].element !== this._renderedEntries[i].targetElement)
          return false;
        if (entries[i].color !== this._renderedEntries[i].color)
          return false;
        if (entries[i].cssStyle !== this._renderedEntries[i].cssStyle)
          return false;
        const oldBox = this._renderedEntries[i].box;
        if (!oldBox)
          return false;
        const box = entries[i].box ? toDOMRect(entries[i].box) : entries[i].element.getBoundingClientRect();
        if (box.top !== oldBox.top || box.right !== oldBox.right || box.bottom !== oldBox.bottom || box.left !== oldBox.left)
          return false;
      }
      return true;
    }
    _createHighlightElement() {
      return this._injectedScript.document.createElement("x-pw-highlight");
    }
    appendChild(element) {
      this._glassPaneShadow.appendChild(element);
    }
    onGlassPaneClick(handler) {
      this._glassPaneElement.style.pointerEvents = "auto";
      this._glassPaneElement.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
      this._glassPaneElement.addEventListener("click", handler);
    }
    offGlassPaneClick(handler) {
      this._glassPaneElement.style.pointerEvents = "none";
      this._glassPaneElement.style.backgroundColor = "transparent";
      this._glassPaneElement.removeEventListener("click", handler);
    }
  };
  function toDOMRect(box) {
    if (!box)
      return void 0;
    return new DOMRect(box.x, box.y, box.width, box.height);
  }
  function boxRightOf(box1, box2, maxDistance) {
    const distance = box1.left - box2.right;
    if (distance < 0 || maxDistance !== void 0 && distance > maxDistance)
      return;
    return distance + Math.max(box2.bottom - box1.bottom, 0) + Math.max(box1.top - box2.top, 0);
  }
  function boxLeftOf(box1, box2, maxDistance) {
    const distance = box2.left - box1.right;
    if (distance < 0 || maxDistance !== void 0 && distance > maxDistance)
      return;
    return distance + Math.max(box2.bottom - box1.bottom, 0) + Math.max(box1.top - box2.top, 0);
  }
  function boxAbove(box1, box2, maxDistance) {
    const distance = box2.top - box1.bottom;
    if (distance < 0 || maxDistance !== void 0 && distance > maxDistance)
      return;
    return distance + Math.max(box1.left - box2.left, 0) + Math.max(box2.right - box1.right, 0);
  }
  function boxBelow(box1, box2, maxDistance) {
    const distance = box1.top - box2.bottom;
    if (distance < 0 || maxDistance !== void 0 && distance > maxDistance)
      return;
    return distance + Math.max(box1.left - box2.left, 0) + Math.max(box2.right - box1.right, 0);
  }
  function boxNear(box1, box2, maxDistance) {
    const kThreshold = maxDistance === void 0 ? 50 : maxDistance;
    let score = 0;
    if (box1.left - box2.right >= 0)
      score += box1.left - box2.right;
    if (box2.left - box1.right >= 0)
      score += box2.left - box1.right;
    if (box2.top - box1.bottom >= 0)
      score += box2.top - box1.bottom;
    if (box1.top - box2.bottom >= 0)
      score += box1.top - box2.bottom;
    return score > kThreshold ? void 0 : score;
  }
  var kLayoutSelectorNames = ["left-of", "right-of", "above", "below", "near"];
  function layoutSelectorScore(name, element, inner, maxDistance) {
    const box = element.getBoundingClientRect();
    const scorer = { "left-of": boxLeftOf, "right-of": boxRightOf, "above": boxAbove, "below": boxBelow, "near": boxNear }[name];
    let bestScore;
    for (const e of inner) {
      if (e === element)
        continue;
      const score = scorer(box, e.getBoundingClientRect(), maxDistance);
      if (score === void 0)
        continue;
      if (bestScore === void 0 || score < bestScore)
        bestScore = score;
    }
    return bestScore;
  }
  function matchesComponentAttribute(obj, attr) {
    for (const token of attr.jsonPath) {
      if (obj !== void 0 && obj !== null)
        obj = obj[token];
    }
    return matchesAttributePart(obj, attr);
  }
  function matchesAttributePart(value, attr) {
    const objValue = typeof value === "string" && !attr.caseSensitive ? value.toUpperCase() : value;
    const attrValue = typeof attr.value === "string" && !attr.caseSensitive ? attr.value.toUpperCase() : attr.value;
    if (attr.op === "<truthy>")
      return !!objValue;
    if (attr.op === "=") {
      if (attrValue instanceof RegExp)
        return typeof objValue === "string" && !!objValue.match(attrValue);
      return objValue === attrValue;
    }
    if (typeof objValue !== "string" || typeof attrValue !== "string")
      return false;
    if (attr.op === "*=")
      return objValue.includes(attrValue);
    if (attr.op === "^=")
      return objValue.startsWith(attrValue);
    if (attr.op === "$=")
      return objValue.endsWith(attrValue);
    if (attr.op === "|=")
      return objValue === attrValue || objValue.startsWith(attrValue + "-");
    if (attr.op === "~=")
      return objValue.split(" ").includes(attrValue);
    return false;
  }
  function shouldSkipForTextMatching(element) {
    const document = element.ownerDocument;
    return element.nodeName === "SCRIPT" || element.nodeName === "NOSCRIPT" || element.nodeName === "STYLE" || document.head && document.head.contains(element);
  }
  function elementText(cache, root) {
    let value = cache.get(root);
    if (value === void 0) {
      value = { full: "", normalized: "", immediate: [] };
      if (!shouldSkipForTextMatching(root)) {
        let currentImmediate = "";
        if (root instanceof HTMLInputElement && (root.type === "submit" || root.type === "button" || root.type === "reset")) {
          value = { full: root.value, normalized: normalizeWhiteSpace(root.value), immediate: [root.value] };
        } else {
          for (let child = root.firstChild; child; child = child.nextSibling) {
            if (child.nodeType === Node.TEXT_NODE) {
              value.full += child.nodeValue || "";
              currentImmediate += child.nodeValue || "";
            } else if (child.nodeType === Node.COMMENT_NODE) {
              continue;
            } else {
              if (currentImmediate)
                value.immediate.push(currentImmediate);
              currentImmediate = "";
              if (child.nodeType === Node.ELEMENT_NODE)
                value.full += elementText(cache, child).full;
            }
          }
          if (currentImmediate)
            value.immediate.push(currentImmediate);
          if (root.shadowRoot)
            value.full += elementText(cache, root.shadowRoot).full;
          if (value.full)
            value.normalized = normalizeWhiteSpace(value.full);
        }
      }
      cache.set(root, value);
    }
    return value;
  }
  function elementMatchesText(cache, element, matcher) {
    if (shouldSkipForTextMatching(element))
      return "none";
    if (!matcher(elementText(cache, element)))
      return "none";
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === Node.ELEMENT_NODE && matcher(elementText(cache, child)))
        return "selfAndChildren";
    }
    if (element.shadowRoot && matcher(elementText(cache, element.shadowRoot)))
      return "selfAndChildren";
    return "self";
  }
  function getElementLabels(textCache, element, options) {
    let labels = getAriaLabelledByElements(element);
    if (labels) {
      if (options?.skipRefsInsideElement)
        labels = labels.filter((label) => label !== element && !element.contains(label));
      return labels.map((label) => elementText(textCache, label));
    }
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel !== null && !!ariaLabel.trim())
      return [{ full: ariaLabel, normalized: normalizeWhiteSpace(ariaLabel), immediate: [ariaLabel] }];
    const isNonHiddenInput = element.nodeName === "INPUT" && element.type !== "hidden";
    if (["BUTTON", "METER", "OUTPUT", "PROGRESS", "SELECT", "TEXTAREA"].includes(element.nodeName) || isNonHiddenInput) {
      const labels2 = element.labels;
      if (labels2)
        return [...labels2].map((label) => elementText(textCache, label));
    }
    return [];
  }
  var kSupportedAttributes = ["selected", "checked", "pressed", "expanded", "level", "disabled", "name", "description", "include-hidden"];
  kSupportedAttributes.sort();
  function validateSupportedRole(attr, roles, role) {
    if (!roles.includes(role))
      throw new Error(`"${attr}" attribute is only supported for roles: ${roles.slice().sort().map((role2) => `"${role2}"`).join(", ")}`);
  }
  function validateSupportedValues(attr, values) {
    if (attr.op !== "<truthy>" && !values.includes(attr.value))
      throw new Error(`"${attr.name}" must be one of ${values.map((v) => JSON.stringify(v)).join(", ")}`);
  }
  function validateSupportedOp(attr, ops) {
    if (!ops.includes(attr.op))
      throw new Error(`"${attr.name}" does not support "${attr.op}" matcher`);
  }
  function validateAttributes(attrs, role) {
    const options = { role };
    for (const attr of attrs) {
      switch (attr.name) {
        case "checked": {
          validateSupportedRole(attr.name, kAriaCheckedRoles, role);
          validateSupportedValues(attr, [true, false, "mixed"]);
          validateSupportedOp(attr, ["<truthy>", "="]);
          options.checked = attr.op === "<truthy>" ? true : attr.value;
          break;
        }
        case "pressed": {
          validateSupportedRole(attr.name, kAriaPressedRoles, role);
          validateSupportedValues(attr, [true, false, "mixed"]);
          validateSupportedOp(attr, ["<truthy>", "="]);
          options.pressed = attr.op === "<truthy>" ? true : attr.value;
          break;
        }
        case "selected": {
          validateSupportedRole(attr.name, kAriaSelectedRoles, role);
          validateSupportedValues(attr, [true, false]);
          validateSupportedOp(attr, ["<truthy>", "="]);
          options.selected = attr.op === "<truthy>" ? true : attr.value;
          break;
        }
        case "expanded": {
          validateSupportedRole(attr.name, kAriaExpandedRoles, role);
          validateSupportedValues(attr, [true, false]);
          validateSupportedOp(attr, ["<truthy>", "="]);
          options.expanded = attr.op === "<truthy>" ? true : attr.value;
          break;
        }
        case "level": {
          validateSupportedRole(attr.name, kAriaLevelRoles, role);
          if (typeof attr.value === "string")
            attr.value = +attr.value;
          if (attr.op !== "=" || typeof attr.value !== "number" || Number.isNaN(attr.value))
            throw new Error(`"level" attribute must be compared to a number`);
          options.level = attr.value;
          break;
        }
        case "disabled": {
          validateSupportedValues(attr, [true, false]);
          validateSupportedOp(attr, ["<truthy>", "="]);
          options.disabled = attr.op === "<truthy>" ? true : attr.value;
          break;
        }
        case "name": {
          if (attr.op === "<truthy>")
            throw new Error(`"name" attribute must have a value`);
          if (typeof attr.value !== "string" && !(attr.value instanceof RegExp))
            throw new Error(`"name" attribute must be a string or a regular expression`);
          options.name = attr.value;
          options.nameOp = attr.op;
          options.nameExact = attr.caseSensitive;
          break;
        }
        case "description": {
          if (attr.op === "<truthy>")
            throw new Error(`"description" attribute must have a value`);
          if (typeof attr.value !== "string" && !(attr.value instanceof RegExp))
            throw new Error(`"description" attribute must be a string or a regular expression`);
          options.description = attr.value;
          options.descriptionOp = attr.op;
          options.descriptionExact = attr.caseSensitive;
          break;
        }
        case "include-hidden": {
          validateSupportedValues(attr, [true, false]);
          validateSupportedOp(attr, ["<truthy>", "="]);
          options.includeHidden = attr.op === "<truthy>" ? true : attr.value;
          break;
        }
        default: {
          throw new Error(`Unknown attribute "${attr.name}", must be one of ${kSupportedAttributes.map((a) => `"${a}"`).join(", ")}.`);
        }
      }
    }
    return options;
  }
  function queryRole(scope, options, internal) {
    const result = [];
    const match = (element) => {
      if (getAriaRole(element) !== options.role)
        return;
      if (options.selected !== void 0 && getAriaSelected(element) !== options.selected)
        return;
      if (options.checked !== void 0 && getAriaChecked(element) !== options.checked)
        return;
      if (options.pressed !== void 0 && getAriaPressed(element) !== options.pressed)
        return;
      if (options.expanded !== void 0 && getAriaExpanded(element) !== options.expanded)
        return;
      if (options.level !== void 0 && getAriaLevel(element) !== options.level)
        return;
      if (options.disabled !== void 0 && getAriaDisabled(element) !== options.disabled)
        return;
      if (!options.includeHidden) {
        const isHidden = isElementHiddenForAria(element);
        if (isHidden)
          return;
      }
      if (options.name !== void 0) {
        const accessibleName = normalizeWhiteSpace(getElementAccessibleNameText(element, !!options.includeHidden));
        if (typeof options.name === "string")
          options.name = normalizeWhiteSpace(options.name);
        if (internal && !options.nameExact && options.nameOp === "=")
          options.nameOp = "*=";
        if (!matchesAttributePart(accessibleName, { name: "", jsonPath: [], op: options.nameOp || "=", value: options.name, caseSensitive: !!options.nameExact }))
          return;
      }
      if (options.description !== void 0) {
        const accessibleDescription = normalizeWhiteSpace(getElementAccessibleDescription(element, !!options.includeHidden).text);
        if (typeof options.description === "string")
          options.description = normalizeWhiteSpace(options.description);
        if (internal && !options.descriptionExact && options.descriptionOp === "=")
          options.descriptionOp = "*=";
        if (!matchesAttributePart(accessibleDescription, { name: "", jsonPath: [], op: options.descriptionOp || "=", value: options.description, caseSensitive: !!options.descriptionExact }))
          return;
      }
      result.push(element);
    };
    const query = (root) => {
      const shadows = [];
      if (root.shadowRoot)
        shadows.push(root.shadowRoot);
      for (const element of root.querySelectorAll("*")) {
        match(element);
        if (element.shadowRoot)
          shadows.push(element.shadowRoot);
      }
      shadows.forEach(query);
    };
    query(scope);
    return result;
  }
  function createRoleEngine(internal) {
    return {
      queryAll: (scope, selector) => {
        const parsed = parseAttributeSelector(selector, true);
        const role = parsed.name.toLowerCase();
        if (!role)
          throw new Error(`Role must not be empty`);
        const options = validateAttributes(parsed.attributes, role);
        beginAriaCaches();
        try {
          return queryRole(scope, options, internal);
        } finally {
          endAriaCaches();
        }
      }
    };
  }
  var SelectorEvaluatorImpl = class {
    constructor() {
      this._retainCacheCounter = 0;
      this._cacheText = /* @__PURE__ */ new Map();
      this._cacheQueryCSS = /* @__PURE__ */ new Map();
      this._cacheMatches = /* @__PURE__ */ new Map();
      this._cacheQuery = /* @__PURE__ */ new Map();
      this._cacheMatchesSimple = /* @__PURE__ */ new Map();
      this._cacheMatchesParents = /* @__PURE__ */ new Map();
      this._cacheCallMatches = /* @__PURE__ */ new Map();
      this._cacheCallQuery = /* @__PURE__ */ new Map();
      this._cacheQuerySimple = /* @__PURE__ */ new Map();
      this._engines = /* @__PURE__ */ new Map();
      this._engines.set("not", notEngine);
      this._engines.set("is", isEngine);
      this._engines.set("where", isEngine);
      this._engines.set("has", hasEngine);
      this._engines.set("scope", scopeEngine);
      this._engines.set("light", lightEngine);
      this._engines.set("visible", visibleEngine);
      this._engines.set("text", textEngine);
      this._engines.set("text-is", textIsEngine);
      this._engines.set("text-matches", textMatchesEngine);
      this._engines.set("has-text", hasTextEngine);
      this._engines.set("right-of", createLayoutEngine("right-of"));
      this._engines.set("left-of", createLayoutEngine("left-of"));
      this._engines.set("above", createLayoutEngine("above"));
      this._engines.set("below", createLayoutEngine("below"));
      this._engines.set("near", createLayoutEngine("near"));
      this._engines.set("nth-match", nthMatchEngine);
      const allNames = [...this._engines.keys()];
      allNames.sort();
      const parserNames = [...customCSSNames];
      parserNames.sort();
      if (allNames.join("|") !== parserNames.join("|"))
        throw new Error(`Please keep customCSSNames in sync with evaluator engines: ${allNames.join("|")} vs ${parserNames.join("|")}`);
    }
    begin() {
      ++this._retainCacheCounter;
    }
    end() {
      --this._retainCacheCounter;
      if (!this._retainCacheCounter) {
        this._cacheQueryCSS.clear();
        this._cacheMatches.clear();
        this._cacheQuery.clear();
        this._cacheMatchesSimple.clear();
        this._cacheMatchesParents.clear();
        this._cacheCallMatches.clear();
        this._cacheCallQuery.clear();
        this._cacheQuerySimple.clear();
        this._cacheText.clear();
      }
    }
    _cached(cache, main, rest, cb) {
      if (!cache.has(main))
        cache.set(main, []);
      const entries = cache.get(main);
      const entry = entries.find((e) => rest.every((value, index) => e.rest[index] === value));
      if (entry)
        return entry.result;
      const result = cb();
      entries.push({ rest, result });
      return result;
    }
    _checkSelector(s) {
      const wellFormed = typeof s === "object" && s && (Array.isArray(s) || "simples" in s && s.simples.length);
      if (!wellFormed)
        throw new Error(`Malformed selector "${s}"`);
      return s;
    }
    matches(element, s, context) {
      const selector = this._checkSelector(s);
      this.begin();
      try {
        return this._cached(this._cacheMatches, element, [selector, context.scope, context.pierceShadow, context.originalScope], () => {
          if (Array.isArray(selector))
            return this._matchesEngine(isEngine, element, selector, context);
          if (this._hasScopeClause(selector))
            context = this._expandContextForScopeMatching(context);
          if (!this._matchesSimple(element, selector.simples[selector.simples.length - 1].selector, context))
            return false;
          return this._matchesParents(element, selector, selector.simples.length - 2, context);
        });
      } finally {
        this.end();
      }
    }
    query(context, s) {
      const selector = this._checkSelector(s);
      this.begin();
      try {
        return this._cached(this._cacheQuery, selector, [context.scope, context.pierceShadow, context.originalScope], () => {
          if (Array.isArray(selector))
            return this._queryEngine(isEngine, context, selector);
          if (this._hasScopeClause(selector))
            context = this._expandContextForScopeMatching(context);
          const previousScoreMap = this._scoreMap;
          this._scoreMap = /* @__PURE__ */ new Map();
          let elements = this._querySimple(context, selector.simples[selector.simples.length - 1].selector);
          elements = elements.filter((element) => this._matchesParents(element, selector, selector.simples.length - 2, context));
          if (this._scoreMap.size) {
            elements.sort((a, b) => {
              const aScore = this._scoreMap.get(a);
              const bScore = this._scoreMap.get(b);
              if (aScore === bScore)
                return 0;
              if (aScore === void 0)
                return 1;
              if (bScore === void 0)
                return -1;
              return aScore - bScore;
            });
          }
          this._scoreMap = previousScoreMap;
          return elements;
        });
      } finally {
        this.end();
      }
    }
    _markScore(element, score) {
      if (this._scoreMap)
        this._scoreMap.set(element, score);
    }
    _hasScopeClause(selector) {
      return selector.simples.some((simple) => simple.selector.functions.some((f) => f.name === "scope"));
    }
    _expandContextForScopeMatching(context) {
      if (context.scope.nodeType !== 1)
        return context;
      const scope = parentElementOrShadowHost(context.scope);
      if (!scope)
        return context;
      return { ...context, scope, originalScope: context.originalScope || context.scope };
    }
    _matchesSimple(element, simple, context) {
      return this._cached(this._cacheMatchesSimple, element, [simple, context.scope, context.pierceShadow, context.originalScope], () => {
        if (element === context.scope)
          return false;
        if (simple.css && !this._matchesCSS(element, simple.css))
          return false;
        for (const func of simple.functions) {
          if (!this._matchesEngine(this._getEngine(func.name), element, func.args, context))
            return false;
        }
        return true;
      });
    }
    _querySimple(context, simple) {
      if (!simple.functions.length)
        return this._queryCSS(context, simple.css || "*");
      return this._cached(this._cacheQuerySimple, simple, [context.scope, context.pierceShadow, context.originalScope], () => {
        let css = simple.css;
        const funcs = simple.functions;
        if (css === "*" && funcs.length)
          css = void 0;
        let elements;
        let firstIndex = -1;
        if (css !== void 0) {
          elements = this._queryCSS(context, css);
        } else {
          firstIndex = funcs.findIndex((func) => this._getEngine(func.name).query !== void 0);
          if (firstIndex === -1)
            firstIndex = 0;
          elements = this._queryEngine(this._getEngine(funcs[firstIndex].name), context, funcs[firstIndex].args);
        }
        for (let i = 0; i < funcs.length; i++) {
          if (i === firstIndex)
            continue;
          const engine = this._getEngine(funcs[i].name);
          if (engine.matches !== void 0)
            elements = elements.filter((e) => this._matchesEngine(engine, e, funcs[i].args, context));
        }
        for (let i = 0; i < funcs.length; i++) {
          if (i === firstIndex)
            continue;
          const engine = this._getEngine(funcs[i].name);
          if (engine.matches === void 0)
            elements = elements.filter((e) => this._matchesEngine(engine, e, funcs[i].args, context));
        }
        return elements;
      });
    }
    _matchesParents(element, complex, index, context) {
      if (index < 0)
        return true;
      return this._cached(this._cacheMatchesParents, element, [complex, index, context.scope, context.pierceShadow, context.originalScope], () => {
        const { selector: simple, combinator } = complex.simples[index];
        if (combinator === ">") {
          const parent = parentElementOrShadowHostInContext(element, context);
          if (!parent || !this._matchesSimple(parent, simple, context))
            return false;
          return this._matchesParents(parent, complex, index - 1, context);
        }
        if (combinator === "+") {
          const previousSibling = previousSiblingInContext(element, context);
          if (!previousSibling || !this._matchesSimple(previousSibling, simple, context))
            return false;
          return this._matchesParents(previousSibling, complex, index - 1, context);
        }
        if (combinator === "") {
          let parent = parentElementOrShadowHostInContext(element, context);
          while (parent) {
            if (this._matchesSimple(parent, simple, context)) {
              if (this._matchesParents(parent, complex, index - 1, context))
                return true;
              if (complex.simples[index - 1].combinator === "")
                break;
            }
            parent = parentElementOrShadowHostInContext(parent, context);
          }
          return false;
        }
        if (combinator === "~") {
          let previousSibling = previousSiblingInContext(element, context);
          while (previousSibling) {
            if (this._matchesSimple(previousSibling, simple, context)) {
              if (this._matchesParents(previousSibling, complex, index - 1, context))
                return true;
              if (complex.simples[index - 1].combinator === "~")
                break;
            }
            previousSibling = previousSiblingInContext(previousSibling, context);
          }
          return false;
        }
        if (combinator === ">=") {
          let parent = element;
          while (parent) {
            if (this._matchesSimple(parent, simple, context)) {
              if (this._matchesParents(parent, complex, index - 1, context))
                return true;
              if (complex.simples[index - 1].combinator === "")
                break;
            }
            parent = parentElementOrShadowHostInContext(parent, context);
          }
          return false;
        }
        throw new Error(`Unsupported combinator "${combinator}"`);
      });
    }
    _matchesEngine(engine, element, args, context) {
      if (engine.matches)
        return this._callMatches(engine, element, args, context);
      if (engine.query)
        return this._callQuery(engine, args, context).includes(element);
      throw new Error(`Selector engine should implement "matches" or "query"`);
    }
    _queryEngine(engine, context, args) {
      if (engine.query)
        return this._callQuery(engine, args, context);
      if (engine.matches)
        return this._queryCSS(context, "*").filter((element) => this._callMatches(engine, element, args, context));
      throw new Error(`Selector engine should implement "matches" or "query"`);
    }
    _callMatches(engine, element, args, context) {
      return this._cached(this._cacheCallMatches, element, [engine, context.scope, context.pierceShadow, context.originalScope, ...args], () => {
        return engine.matches(element, args, context, this);
      });
    }
    _callQuery(engine, args, context) {
      return this._cached(this._cacheCallQuery, engine, [context.scope, context.pierceShadow, context.originalScope, ...args], () => {
        return engine.query(context, args, this);
      });
    }
    _matchesCSS(element, css) {
      return element.matches(css);
    }
    _queryCSS(context, css) {
      return this._cached(this._cacheQueryCSS, css, [context.scope, context.pierceShadow, context.originalScope], () => {
        let result = [];
        function query(root) {
          result = result.concat([...root.querySelectorAll(css)]);
          if (!context.pierceShadow)
            return;
          if (root.shadowRoot)
            query(root.shadowRoot);
          for (const element of root.querySelectorAll("*")) {
            if (element.shadowRoot)
              query(element.shadowRoot);
          }
        }
        query(context.scope);
        return result;
      });
    }
    _getEngine(name) {
      const engine = this._engines.get(name);
      if (!engine)
        throw new Error(`Unknown selector engine "${name}"`);
      return engine;
    }
  };
  var isEngine = {
    matches(element, args, context, evaluator) {
      if (args.length === 0)
        throw new Error(`"is" engine expects non-empty selector list`);
      return args.some((selector) => evaluator.matches(element, selector, context));
    },
    query(context, args, evaluator) {
      if (args.length === 0)
        throw new Error(`"is" engine expects non-empty selector list`);
      let elements = [];
      for (const arg of args)
        elements = elements.concat(evaluator.query(context, arg));
      return args.length === 1 ? elements : sortInDOMOrder(elements);
    }
  };
  var hasEngine = {
    matches(element, args, context, evaluator) {
      if (args.length === 0)
        throw new Error(`"has" engine expects non-empty selector list`);
      return evaluator.query({ ...context, scope: element }, args).length > 0;
    }
    // TODO: we can implement efficient "query" by matching "args" and returning
    // all parents/descendants, just have to be careful with the ":scope" matching.
  };
  var scopeEngine = {
    matches(element, args, context, evaluator) {
      if (args.length !== 0)
        throw new Error(`"scope" engine expects no arguments`);
      const actualScope = context.originalScope || context.scope;
      if (actualScope.nodeType === 9)
        return element === actualScope.documentElement;
      return element === actualScope;
    },
    query(context, args, evaluator) {
      if (args.length !== 0)
        throw new Error(`"scope" engine expects no arguments`);
      const actualScope = context.originalScope || context.scope;
      if (actualScope.nodeType === 9) {
        const root = actualScope.documentElement;
        return root ? [root] : [];
      }
      if (actualScope.nodeType === 1)
        return [actualScope];
      return [];
    }
  };
  var notEngine = {
    matches(element, args, context, evaluator) {
      if (args.length === 0)
        throw new Error(`"not" engine expects non-empty selector list`);
      return !evaluator.matches(element, args, context);
    }
  };
  var lightEngine = {
    query(context, args, evaluator) {
      return evaluator.query({ ...context, pierceShadow: false }, args);
    },
    matches(element, args, context, evaluator) {
      return evaluator.matches(element, args, { ...context, pierceShadow: false });
    }
  };
  var visibleEngine = {
    matches(element, args, context, evaluator) {
      if (args.length)
        throw new Error(`"visible" engine expects no arguments`);
      return isElementVisible(element);
    }
  };
  var textEngine = {
    matches(element, args, context, evaluator) {
      if (args.length !== 1 || typeof args[0] !== "string")
        throw new Error(`"text" engine expects a single string`);
      const text = normalizeWhiteSpace(args[0]).toLowerCase();
      const matcher = (elementText2) => elementText2.normalized.toLowerCase().includes(text);
      return elementMatchesText(evaluator._cacheText, element, matcher) === "self";
    }
  };
  var textIsEngine = {
    matches(element, args, context, evaluator) {
      if (args.length !== 1 || typeof args[0] !== "string")
        throw new Error(`"text-is" engine expects a single string`);
      const text = normalizeWhiteSpace(args[0]);
      const matcher = (elementText2) => {
        if (!text && !elementText2.immediate.length)
          return true;
        return elementText2.immediate.some((s) => normalizeWhiteSpace(s) === text);
      };
      return elementMatchesText(evaluator._cacheText, element, matcher) !== "none";
    }
  };
  var textMatchesEngine = {
    matches(element, args, context, evaluator) {
      if (args.length === 0 || typeof args[0] !== "string" || args.length > 2 || args.length === 2 && typeof args[1] !== "string")
        throw new Error(`"text-matches" engine expects a regexp body and optional regexp flags`);
      const re = new RegExp(args[0], args.length === 2 ? args[1] : void 0);
      const matcher = (elementText2) => re.test(elementText2.full);
      return elementMatchesText(evaluator._cacheText, element, matcher) === "self";
    }
  };
  var hasTextEngine = {
    matches(element, args, context, evaluator) {
      if (args.length !== 1 || typeof args[0] !== "string")
        throw new Error(`"has-text" engine expects a single string`);
      if (shouldSkipForTextMatching(element))
        return false;
      const text = normalizeWhiteSpace(args[0]).toLowerCase();
      const matcher = (elementText2) => elementText2.normalized.toLowerCase().includes(text);
      return matcher(elementText(evaluator._cacheText, element));
    }
  };
  function createLayoutEngine(name) {
    return {
      matches(element, args, context, evaluator) {
        const maxDistance = args.length && typeof args[args.length - 1] === "number" ? args[args.length - 1] : void 0;
        const queryArgs = maxDistance === void 0 ? args : args.slice(0, args.length - 1);
        if (args.length < 1 + (maxDistance === void 0 ? 0 : 1))
          throw new Error(`"${name}" engine expects a selector list and optional maximum distance in pixels`);
        const inner = evaluator.query(context, queryArgs);
        const score = layoutSelectorScore(name, element, inner, maxDistance);
        if (score === void 0)
          return false;
        evaluator._markScore(element, score);
        return true;
      }
    };
  }
  var nthMatchEngine = {
    query(context, args, evaluator) {
      let index = args[args.length - 1];
      if (args.length < 2)
        throw new Error(`"nth-match" engine expects non-empty selector list and an index argument`);
      if (typeof index !== "number" || index < 1)
        throw new Error(`"nth-match" engine expects a one-based index as the last argument`);
      const elements = isEngine.query(context, args.slice(0, args.length - 1), evaluator);
      index--;
      return index < elements.length ? [elements[index]] : [];
    }
  };
  function parentElementOrShadowHostInContext(element, context) {
    if (element === context.scope)
      return;
    if (!context.pierceShadow)
      return element.parentElement || void 0;
    return parentElementOrShadowHost(element);
  }
  function previousSiblingInContext(element, context) {
    if (element === context.scope)
      return;
    return element.previousElementSibling || void 0;
  }
  function sortInDOMOrder(elements) {
    const elementToEntry = /* @__PURE__ */ new Map();
    const roots = [];
    const result = [];
    function append(element) {
      let entry = elementToEntry.get(element);
      if (entry)
        return entry;
      const parent = parentElementOrShadowHost(element);
      if (parent) {
        const parentEntry = append(parent);
        parentEntry.children.push(element);
      } else {
        roots.push(element);
      }
      entry = { children: [], taken: false };
      elementToEntry.set(element, entry);
      return entry;
    }
    for (const e of elements)
      append(e).taken = true;
    function visit(element) {
      const entry = elementToEntry.get(element);
      if (entry.taken)
        result.push(element);
      if (entry.children.length > 1) {
        const set = new Set(entry.children);
        entry.children = [];
        let child = element.firstElementChild;
        while (child && entry.children.length < set.size) {
          if (set.has(child))
            entry.children.push(child);
          child = child.nextElementSibling;
        }
        child = element.shadowRoot ? element.shadowRoot.firstElementChild : null;
        while (child && entry.children.length < set.size) {
          if (set.has(child))
            entry.children.push(child);
          child = child.nextElementSibling;
        }
      }
      entry.children.forEach(visit);
    }
    roots.forEach(visit);
    return result;
  }
  var kTextScoreRange = 10;
  var kExactPenalty = kTextScoreRange / 2;
  var kTestIdScore = 1;
  var kOtherTestIdScore = 2;
  var kIframeByAttributeScore = 10;
  var kBeginPenalizedScore = 50;
  var kRoleWithNameScore = 100;
  var kPlaceholderScore = 120;
  var kLabelScore = 140;
  var kAltTextScore = 160;
  var kTextScore = 180;
  var kTitleScore = 200;
  var kTextScoreRegex = 250;
  var kPlaceholderScoreExact = kPlaceholderScore + kExactPenalty;
  var kLabelScoreExact = kLabelScore + kExactPenalty;
  var kRoleWithNameScoreExact = kRoleWithNameScore + kExactPenalty;
  var kAltTextScoreExact = kAltTextScore + kExactPenalty;
  var kTextScoreExact = kTextScore + kExactPenalty;
  var kTitleScoreExact = kTitleScore + kExactPenalty;
  var kEndPenalizedScore = 300;
  var kCSSIdScore = 500;
  var kRoleWithoutNameScore = 510;
  var kCSSInputTypeNameScore = 520;
  var kCSSTagNameScore = 530;
  var kNthScore = 1e4;
  var kCSSFallbackScore = 1e7;
  var kScoreThresholdForTextExpect = 1e3;
  function generateSelector(injectedScript, targetElement, options) {
    injectedScript._evaluator.begin();
    const cache = { allowText: /* @__PURE__ */ new Map(), disallowText: /* @__PURE__ */ new Map() };
    beginAriaCaches();
    beginDOMCaches();
    try {
      let targetTokens;
      if (options.forTextExpect) {
        targetTokens = cssFallback(injectedScript, targetElement.ownerDocument.documentElement, options);
        for (let element = targetElement; element; element = parentElementOrShadowHost(element)) {
          const tokens = generateSelectorFor(cache, injectedScript, element, { ...options, noText: true });
          if (!tokens)
            continue;
          const score = combineScores(tokens);
          if (score <= kScoreThresholdForTextExpect) {
            targetTokens = tokens;
            break;
          }
        }
      } else {
        if (!targetElement.matches("input,textarea,select") && !targetElement.isContentEditable) {
          const interactiveParent = closestCrossShadow(targetElement, "button,select,input,[role=button],[role=checkbox],[role=radio],a,[role=link]", options.root);
          if (interactiveParent && isElementVisible(interactiveParent))
            targetElement = interactiveParent;
        }
        targetTokens = generateSelectorFor(cache, injectedScript, targetElement, options) || cssFallback(injectedScript, targetElement, options);
      }
      const selector = joinTokens(targetTokens);
      const parsedSelector = injectedScript.parseSelector(selector);
      return {
        selector,
        elements: injectedScript.querySelectorAll(parsedSelector, options.root ?? targetElement.ownerDocument)
      };
    } finally {
      endDOMCaches();
      endAriaCaches();
      injectedScript._evaluator.end();
    }
  }
  function generateSelectorFor(cache, injectedScript, targetElement, options) {
    if (options.root && !isInsideScope(options.root, targetElement))
      throw new Error(`Target element must belong to the root's subtree`);
    if (targetElement === options.root)
      return [{ engine: "css", selector: ":scope", score: 1 }];
    if (targetElement.ownerDocument.documentElement === targetElement)
      return [{ engine: "css", selector: "html", score: 1 }];
    let result = null;
    const updateResult = (candidate) => {
      if (!result || combineScores(candidate) < combineScores(result))
        result = candidate;
    };
    const candidates = [];
    for (const candidate of buildTextCandidates(injectedScript, targetElement, !options.isRecursive, options))
      candidates.push({ candidate, isTextCandidate: true });
    for (const token of buildNoTextCandidates(injectedScript, targetElement, options)) {
      if (options.omitInternalEngines && token.engine.startsWith("internal:"))
        continue;
      candidates.push({ candidate: [token], isTextCandidate: false });
    }
    candidates.sort((a, b) => combineScores(a.candidate) - combineScores(b.candidate));
    for (const { candidate, isTextCandidate } of candidates) {
      const elements = injectedScript.querySelectorAll(injectedScript.parseSelector(joinTokens(candidate)), options.root ?? targetElement.ownerDocument);
      if (!elements.includes(targetElement)) {
        continue;
      }
      if (elements.length === 1) {
        updateResult(candidate);
        break;
      }
      const index = elements.indexOf(targetElement);
      if (index > 5) {
        continue;
      }
      updateResult([...candidate, { engine: "nth", selector: String(index), score: kNthScore }]);
      if (options.isRecursive) {
        continue;
      }
      for (let parent = parentElementOrShadowHost(targetElement); parent && parent !== options.root; parent = parentElementOrShadowHost(parent)) {
        const filtered = elements.filter((e) => isInsideScope(parent, e) && e !== parent);
        const newIndex = filtered.indexOf(targetElement);
        if (filtered.length > 5 || newIndex === -1 || newIndex === index && filtered.length > 1) {
          continue;
        }
        const inParent = filtered.length === 1 ? candidate : [...candidate, { engine: "nth", selector: String(newIndex), score: kNthScore }];
        const idealSelectorForParent = { engine: "", selector: "", score: 1 };
        if (result && combineScores([idealSelectorForParent, ...inParent]) >= combineScores(result)) {
          continue;
        }
        const noText = !!options.noText || isTextCandidate;
        const cacheMap = noText ? cache.disallowText : cache.allowText;
        let parentTokens = cacheMap.get(parent);
        if (parentTokens === void 0) {
          parentTokens = generateSelectorFor(cache, injectedScript, parent, { ...options, isRecursive: true, noText }) || cssFallback(injectedScript, parent, options);
          cacheMap.set(parent, parentTokens);
        }
        if (!parentTokens)
          continue;
        updateResult([...parentTokens, ...inParent]);
      }
    }
    return result;
  }
  function buildNoTextCandidates(injectedScript, element, options) {
    const candidates = [];
    const testIdAttributeNames = splitTestIdAttributeNames(options.testIdAttributeName);
    {
      for (const attr of ["data-testid", "data-test-id", "data-test"]) {
        if (!testIdAttributeNames.includes(attr) && element.getAttribute(attr))
          candidates.push({ engine: "css", selector: `[${attr}=${quoteCSSAttributeValue(element.getAttribute(attr))}]`, score: kOtherTestIdScore });
      }
      const idAttr = element.getAttribute("id");
      if (idAttr && !isGuidLike(idAttr))
        candidates.push({ engine: "css", selector: makeSelectorForId(idAttr), score: kCSSIdScore });
      candidates.push({ engine: "css", selector: escapeNodeName(element), score: kCSSTagNameScore });
    }
    if (element.nodeName === "IFRAME" || element.nodeName === "FRAME") {
      for (const attribute of ["name", "title"]) {
        if (element.getAttribute(attribute))
          candidates.push({ engine: "css", selector: `${escapeNodeName(element)}[${attribute}=${quoteCSSAttributeValue(element.getAttribute(attribute))}]`, score: kIframeByAttributeScore });
      }
      for (const testIdAttr of testIdAttributeNames) {
        if (element.getAttribute(testIdAttr))
          candidates.push({ engine: "css", selector: `[${testIdAttr}=${quoteCSSAttributeValue(element.getAttribute(testIdAttr))}]`, score: kTestIdScore });
      }
      penalizeScoreForLength([candidates]);
      return candidates;
    }
    for (const testIdAttr of testIdAttributeNames) {
      if (element.getAttribute(testIdAttr))
        candidates.push({ engine: "internal:testid", selector: `[${testIdAttr}=${escapeForAttributeSelector(element.getAttribute(testIdAttr), true)}]`, score: kTestIdScore });
    }
    if (element.nodeName === "INPUT" || element.nodeName === "TEXTAREA") {
      const input = element;
      if (input.placeholder) {
        candidates.push({ engine: "internal:attr", selector: `[placeholder=${escapeForAttributeSelector(input.placeholder, true)}]`, score: kPlaceholderScoreExact });
        for (const alternative of suitableTextAlternatives(input.placeholder))
          candidates.push({ engine: "internal:attr", selector: `[placeholder=${escapeForAttributeSelector(alternative.text, false)}]`, score: kPlaceholderScore - alternative.scoreBonus });
      }
    }
    const labels = getElementLabels(injectedScript._evaluator._cacheText, element, { skipRefsInsideElement: options.noText });
    for (const label of labels) {
      const labelText = label.normalized;
      candidates.push({ engine: "internal:label", selector: escapeForTextSelector(labelText, true), score: kLabelScoreExact });
      for (const alternative of suitableTextAlternatives(labelText))
        candidates.push({ engine: "internal:label", selector: escapeForTextSelector(alternative.text, false), score: kLabelScore - alternative.scoreBonus });
    }
    const ariaRole = getAriaRole(element);
    if (ariaRole && !["none", "presentation"].includes(ariaRole))
      candidates.push({ engine: "internal:role", selector: ariaRole, score: kRoleWithoutNameScore });
    if (element.getAttribute("name") && ["BUTTON", "FORM", "FIELDSET", "FRAME", "IFRAME", "INPUT", "KEYGEN", "OBJECT", "OUTPUT", "SELECT", "TEXTAREA", "MAP", "META", "PARAM"].includes(element.nodeName))
      candidates.push({ engine: "css", selector: `${escapeNodeName(element)}[name=${quoteCSSAttributeValue(element.getAttribute("name"))}]`, score: kCSSInputTypeNameScore });
    if (["INPUT", "TEXTAREA"].includes(element.nodeName) && element.getAttribute("type") !== "hidden") {
      if (element.getAttribute("type"))
        candidates.push({ engine: "css", selector: `${escapeNodeName(element)}[type=${quoteCSSAttributeValue(element.getAttribute("type"))}]`, score: kCSSInputTypeNameScore });
    }
    if (["INPUT", "TEXTAREA", "SELECT"].includes(element.nodeName) && element.getAttribute("type") !== "hidden")
      candidates.push({ engine: "css", selector: escapeNodeName(element), score: kCSSInputTypeNameScore + 1 });
    penalizeScoreForLength([candidates]);
    return candidates;
  }
  function buildTextCandidates(injectedScript, element, isTargetNode, options) {
    if (element.nodeName === "SELECT")
      return [];
    const candidates = [];
    if (!options.noText) {
      const title = element.getAttribute("title");
      if (title) {
        candidates.push([{ engine: "internal:attr", selector: `[title=${escapeForAttributeSelector(title, true)}]`, score: kTitleScoreExact }]);
        for (const alternative of suitableTextAlternatives(title))
          candidates.push([{ engine: "internal:attr", selector: `[title=${escapeForAttributeSelector(alternative.text, false)}]`, score: kTitleScore - alternative.scoreBonus }]);
      }
      const alt = element.getAttribute("alt");
      if (alt && ["APPLET", "AREA", "IMG", "INPUT"].includes(element.nodeName)) {
        candidates.push([{ engine: "internal:attr", selector: `[alt=${escapeForAttributeSelector(alt, true)}]`, score: kAltTextScoreExact }]);
        for (const alternative of suitableTextAlternatives(alt))
          candidates.push([{ engine: "internal:attr", selector: `[alt=${escapeForAttributeSelector(alternative.text, false)}]`, score: kAltTextScore - alternative.scoreBonus }]);
      }
    }
    const text = options.noText ? "" : elementText(injectedScript._evaluator._cacheText, element).normalized;
    const textAlternatives = text ? suitableTextAlternatives(text) : [];
    if (text) {
      if (isTargetNode) {
        if (text.length <= 80)
          candidates.push([{ engine: "internal:text", selector: escapeForTextSelector(text, true), score: kTextScoreExact }]);
        for (const alternative of textAlternatives)
          candidates.push([{ engine: "internal:text", selector: escapeForTextSelector(alternative.text, false), score: kTextScore - alternative.scoreBonus }]);
      }
      const cssToken = { engine: "css", selector: escapeNodeName(element), score: kCSSTagNameScore };
      for (const alternative of textAlternatives)
        candidates.push([cssToken, { engine: "internal:has-text", selector: escapeForTextSelector(alternative.text, false), score: kTextScore - alternative.scoreBonus }]);
      if (isTargetNode && text.length <= 80) {
        const re = new RegExp("^" + escapeRegExp(text) + "$");
        candidates.push([cssToken, { engine: "internal:has-text", selector: escapeForTextSelector(re, false), score: kTextScoreRegex }]);
      }
    }
    const ariaRole = getAriaRole(element);
    if (ariaRole && !["none", "presentation"].includes(ariaRole)) {
      const accessibleName = getElementAccessibleName(element, false);
      const ariaName = options.noText && accessibleName.derivedFromContent ? "" : accessibleName.text;
      const accessibleDescription = getElementAccessibleDescription(element, false);
      const ariaDescription = options.noText && accessibleDescription.derivedFromContent ? "" : accessibleDescription.text;
      if (ariaName && !ariaName.match(/^\p{Co}+$/u)) {
        const roleToken = { engine: "internal:role", selector: `${ariaRole}[name=${escapeForAttributeSelector(ariaName, true)}]`, score: kRoleWithNameScoreExact };
        candidates.push([roleToken]);
        for (const alternative of suitableTextAlternatives(ariaName))
          candidates.push([{ engine: "internal:role", selector: `${ariaRole}[name=${escapeForAttributeSelector(alternative.text, false)}]`, score: kRoleWithNameScore - alternative.scoreBonus }]);
        if (ariaDescription) {
          candidates.push([{ engine: "internal:role", selector: `${ariaRole}[name=${escapeForAttributeSelector(ariaName, true)}][description=${escapeForAttributeSelector(ariaDescription, true)}]`, score: kRoleWithNameScoreExact + 1 }]);
          for (const alternative of suitableTextAlternatives(ariaName))
            candidates.push([{ engine: "internal:role", selector: `${ariaRole}[name=${escapeForAttributeSelector(alternative.text, false)}][description=${escapeForAttributeSelector(ariaDescription, false)}]`, score: kRoleWithNameScore - alternative.scoreBonus + 1 }]);
        }
      } else {
        const roleToken = { engine: "internal:role", selector: `${ariaRole}`, score: kRoleWithoutNameScore };
        if (ariaDescription)
          candidates.push([{ engine: "internal:role", selector: `${ariaRole}[description=${escapeForAttributeSelector(ariaDescription, true)}]`, score: kRoleWithoutNameScore + 1 }]);
        for (const alternative of textAlternatives)
          candidates.push([roleToken, { engine: "internal:has-text", selector: escapeForTextSelector(alternative.text, false), score: kTextScore - alternative.scoreBonus }]);
        if (!options.noText && isTargetNode && text.length <= 80) {
          const re = new RegExp("^" + escapeRegExp(text) + "$");
          candidates.push([roleToken, { engine: "internal:has-text", selector: escapeForTextSelector(re, false), score: kTextScoreRegex }]);
        }
      }
    }
    penalizeScoreForLength(candidates);
    return candidates;
  }
  function makeSelectorForId(id) {
    return /^[a-zA-Z][a-zA-Z0-9\-\_]+$/.test(id) ? "#" + id : `[id=${quoteCSSAttributeValue(id)}]`;
  }
  function cssFallback(injectedScript, targetElement, options) {
    const root = options.root ?? targetElement.ownerDocument;
    const tokens = [];
    function uniqueCSSSelector(prefix) {
      const path = tokens.slice();
      if (prefix)
        path.unshift(prefix);
      const selector = path.join(" > ");
      const parsedSelector = injectedScript.parseSelector(selector);
      const node = injectedScript.querySelector(parsedSelector, root, false);
      return node === targetElement ? selector : void 0;
    }
    function makeStrict(selector) {
      const token = { engine: "css", selector, score: kCSSFallbackScore };
      const parsedSelector = injectedScript.parseSelector(selector);
      const elements = injectedScript.querySelectorAll(parsedSelector, root);
      if (elements.length === 1)
        return [token];
      const nth = { engine: "nth", selector: String(elements.indexOf(targetElement)), score: kNthScore };
      return [token, nth];
    }
    for (let element = targetElement; element && element !== root; element = parentElementOrShadowHost(element)) {
      let bestTokenForLevel = "";
      if (element.id) {
        const token = makeSelectorForId(element.id);
        const selector = uniqueCSSSelector(token);
        if (selector)
          return makeStrict(selector);
        bestTokenForLevel = token;
      }
      const parent = element.parentNode;
      const classes = [...element.classList].map(escapeClassName);
      for (let i = 0; i < classes.length; ++i) {
        const token = "." + classes.slice(0, i + 1).join(".");
        const selector = uniqueCSSSelector(token);
        if (selector)
          return makeStrict(selector);
        if (!bestTokenForLevel && parent) {
          const sameClassSiblings = parent.querySelectorAll(token);
          if (sameClassSiblings.length === 1)
            bestTokenForLevel = token;
        }
      }
      if (parent) {
        const siblings = [...parent.children];
        const nodeName = element.nodeName;
        const sameTagSiblings = siblings.filter((sibling) => sibling.nodeName === nodeName);
        const token = sameTagSiblings.indexOf(element) === 0 ? escapeNodeName(element) : `${escapeNodeName(element)}:nth-child(${1 + siblings.indexOf(element)})`;
        const selector = uniqueCSSSelector(token);
        if (selector)
          return makeStrict(selector);
        if (!bestTokenForLevel)
          bestTokenForLevel = token;
      } else if (!bestTokenForLevel) {
        bestTokenForLevel = escapeNodeName(element);
      }
      tokens.unshift(bestTokenForLevel);
    }
    return makeStrict(uniqueCSSSelector());
  }
  function penalizeScoreForLength(groups) {
    for (const group of groups) {
      for (const token of group) {
        if (token.score > kBeginPenalizedScore && token.score < kEndPenalizedScore)
          token.score += Math.min(kTextScoreRange, token.selector.length / 10 | 0);
      }
    }
  }
  function joinTokens(tokens) {
    const parts = [];
    let lastEngine = "";
    for (const { engine, selector } of tokens) {
      if (parts.length && (lastEngine !== "css" || engine !== "css" || selector.startsWith(":nth-match(")))
        parts.push(">>");
      lastEngine = engine;
      if (engine === "css")
        parts.push(selector);
      else
        parts.push(`${engine}=${selector}`);
    }
    return parts.join(" ");
  }
  function combineScores(tokens) {
    let score = 0;
    for (let i = 0; i < tokens.length; i++)
      score += tokens[i].score * (tokens.length - i);
    return score;
  }
  function isGuidLike(id) {
    let lastCharacterType;
    let transitionCount = 0;
    for (let i = 0; i < id.length; ++i) {
      const c = id[i];
      let characterType;
      if (c === "-" || c === "_")
        continue;
      if (c >= "a" && c <= "z")
        characterType = "lower";
      else if (c >= "A" && c <= "Z")
        characterType = "upper";
      else if (c >= "0" && c <= "9")
        characterType = "digit";
      else
        characterType = "other";
      if (characterType === "lower" && lastCharacterType === "upper") {
        lastCharacterType = characterType;
        continue;
      }
      if (lastCharacterType && lastCharacterType !== characterType)
        ++transitionCount;
      lastCharacterType = characterType;
    }
    return transitionCount >= id.length / 4;
  }
  function trimWordBoundary(text, maxLength) {
    if (text.length <= maxLength)
      return text;
    text = text.substring(0, maxLength);
    const match = text.match(/^(.*)\b(.+?)$/);
    if (!match)
      return "";
    return match[1].trimEnd();
  }
  function suitableTextAlternatives(text) {
    let result = [];
    {
      const match = text.match(/^([\d.,]+)[^.,\w]/);
      const leadingNumberLength = match ? match[1].length : 0;
      if (leadingNumberLength) {
        const alt = trimWordBoundary(text.substring(leadingNumberLength).trimStart(), 80);
        result.push({ text: alt, scoreBonus: alt.length <= 30 ? 2 : 1 });
      }
    }
    {
      const match = text.match(/[^.,\w]([\d.,]+)$/);
      const trailingNumberLength = match ? match[1].length : 0;
      if (trailingNumberLength) {
        const alt = trimWordBoundary(text.substring(0, text.length - trailingNumberLength).trimEnd(), 80);
        result.push({ text: alt, scoreBonus: alt.length <= 30 ? 2 : 1 });
      }
    }
    if (text.length <= 30) {
      result.push({ text, scoreBonus: 0 });
    } else {
      result.push({ text: trimWordBoundary(text, 80), scoreBonus: 0 });
      result.push({ text: trimWordBoundary(text, 30), scoreBonus: 1 });
    }
    result = result.filter((r) => r.text);
    if (!result.length)
      result.push({ text: text.substring(0, 80), scoreBonus: 0 });
    return result;
  }
  function escapeNodeName(node) {
    return node.nodeName.toLocaleLowerCase().replace(/[:\.]/g, (char) => "\\" + char);
  }
  function escapeClassName(className) {
    let result = "";
    for (let i = 0; i < className.length; i++)
      result += cssEscapeCharacter(className, i);
    return result;
  }
  function cssEscapeCharacter(s, i) {
    const c = s.charCodeAt(i);
    if (c === 0)
      return "\uFFFD";
    if (c >= 1 && c <= 31 || c >= 48 && c <= 57 && (i === 0 || i === 1 && s.charCodeAt(0) === 45))
      return "\\" + c.toString(16) + " ";
    if (i === 0 && c === 45 && s.length === 1)
      return "\\" + s.charAt(i);
    if (c >= 128 || c === 45 || c === 95 || c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122)
      return s.charAt(i);
    return "\\" + s.charAt(i);
  }
  var XPathEngine = {
    queryAll(root, selector) {
      if (selector.startsWith("/") && root.nodeType !== Node.DOCUMENT_NODE)
        selector = "." + selector;
      const result = [];
      const document = root.ownerDocument || root;
      if (!document)
        return result;
      const it = document.evaluate(selector, root, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE);
      for (let node = it.iterateNext(); node; node = it.iterateNext()) {
        if (node.nodeType === Node.ELEMENT_NODE)
          result.push(node);
      }
      return result;
    }
  };
  var UtilityScript = class {
    constructor(global, isUnderTest) {
      this.global = global;
      this.isUnderTest = isUnderTest;
      if (global.__pwClock) {
        this.builtins = global.__pwClock.builtins;
      } else {
        this.builtins = {
          setTimeout: global.setTimeout?.bind(global),
          clearTimeout: global.clearTimeout?.bind(global),
          setInterval: global.setInterval?.bind(global),
          clearInterval: global.clearInterval?.bind(global),
          requestAnimationFrame: global.requestAnimationFrame?.bind(global),
          cancelAnimationFrame: global.cancelAnimationFrame?.bind(global),
          requestIdleCallback: global.requestIdleCallback?.bind(global),
          cancelIdleCallback: global.cancelIdleCallback?.bind(global),
          performance: global.performance,
          Intl: global.Intl,
          Date: global.Date,
          AbortSignal: global.AbortSignal
        };
      }
      if (this.isUnderTest)
        global.builtins = this.builtins;
    }
    evaluate(isFunction, returnByValue, expression, argCount, ...argsAndHandles) {
      const args = argsAndHandles.slice(0, argCount);
      const handles = argsAndHandles.slice(argCount);
      const parameters = [];
      for (let i = 0; i < args.length; i++)
        parameters[i] = parseEvaluationResultValue(args[i], handles);
      let result = this.global.eval(expression);
      if (isFunction === true) {
        result = result(...parameters);
      } else if (isFunction === false) {
        result = result;
      } else {
        if (typeof result === "function")
          result = result(...parameters);
      }
      return returnByValue ? this._promiseAwareJsonValueNoThrow(result) : result;
    }
    jsonValue(returnByValue, value) {
      if (value === void 0)
        return void 0;
      return serializeAsCallArgument(value, (value2) => ({ fallThrough: value2 }));
    }
    _promiseAwareJsonValueNoThrow(value) {
      const safeJson = (value2) => {
        try {
          return this.jsonValue(true, value2);
        } catch (e) {
          return void 0;
        }
      };
      if (value && typeof value === "object" && typeof value.then === "function") {
        return (async () => {
          const promiseValue = await value;
          return safeJson(promiseValue);
        })();
      }
      return safeJson(value);
    }
  };
  var InjectedScript = class {
    constructor(window2, options) {
      this._testIdAttributeNameForStrictErrorAndConsoleCodegen = "data-testid";
      this.utils = {
        asLocator,
        cacheNormalizedWhitespaces,
        elementText,
        getAriaRole,
        getElementAccessibleNameText,
        getElementAccessibleDescription,
        isElementVisible,
        isInsideScope,
        normalizeWhiteSpace,
        parseAriaSnapshot,
        generateAriaTree,
        findNewElement,
        // Builtins protect injected code from clock emulation.
        builtins: null
      };
      this.window = window2;
      this.document = window2.document;
      this.isUnderTest = options.isUnderTest;
      this.utils.builtins = new UtilityScript(window2, options.isUnderTest).builtins;
      this._sdkLanguage = options.sdkLanguage;
      this._frameSeq = options.frameSeq;
      this._testIdAttributeNameForStrictErrorAndConsoleCodegen = options.testIdAttributeName;
      this._evaluator = new SelectorEvaluatorImpl();
      this.consoleApi = new ConsoleAPI(this);
      this.onGlobalListenersRemoved = /* @__PURE__ */ new Set();
      this._autoClosingTags = /* @__PURE__ */ new Set(["AREA", "BASE", "BR", "COL", "COMMAND", "EMBED", "HR", "IMG", "INPUT", "KEYGEN", "LINK", "MENUITEM", "META", "PARAM", "SOURCE", "TRACK", "WBR"]);
      this._booleanAttributes = /* @__PURE__ */ new Set(["checked", "selected", "disabled", "readonly", "multiple"]);
      this._eventTypes = /* @__PURE__ */ new Map([
        ["auxclick", "mouse"],
        ["click", "mouse"],
        ["dblclick", "mouse"],
        ["mousedown", "mouse"],
        ["mouseeenter", "mouse"],
        ["mouseleave", "mouse"],
        ["mousemove", "mouse"],
        ["mouseout", "mouse"],
        ["mouseover", "mouse"],
        ["mouseup", "mouse"],
        ["mouseleave", "mouse"],
        ["mousewheel", "mouse"],
        ["keydown", "keyboard"],
        ["keyup", "keyboard"],
        ["keypress", "keyboard"],
        ["textInput", "keyboard"],
        ["touchstart", "touch"],
        ["touchmove", "touch"],
        ["touchend", "touch"],
        ["touchcancel", "touch"],
        ["pointerover", "pointer"],
        ["pointerout", "pointer"],
        ["pointerenter", "pointer"],
        ["pointerleave", "pointer"],
        ["pointerdown", "pointer"],
        ["pointerup", "pointer"],
        ["pointermove", "pointer"],
        ["pointercancel", "pointer"],
        ["gotpointercapture", "pointer"],
        ["lostpointercapture", "pointer"],
        ["focus", "focus"],
        ["blur", "focus"],
        ["drag", "drag"],
        ["dragstart", "drag"],
        ["dragend", "drag"],
        ["dragover", "drag"],
        ["dragenter", "drag"],
        ["dragleave", "drag"],
        ["dragexit", "drag"],
        ["drop", "drag"],
        ["wheel", "wheel"],
        ["deviceorientation", "deviceorientation"],
        ["deviceorientationabsolute", "deviceorientation"],
        ["devicemotion", "devicemotion"]
      ]);
      this._hoverHitTargetInterceptorEvents = /* @__PURE__ */ new Set(["mousemove"]);
      this._tapHitTargetInterceptorEvents = /* @__PURE__ */ new Set(["pointerdown", "pointerup", "touchstart", "touchend", "touchcancel"]);
      this._mouseHitTargetInterceptorEvents = /* @__PURE__ */ new Set(["mousedown", "mouseup", "pointerdown", "pointerup", "click", "auxclick", "dblclick", "contextmenu"]);
      this._allHitTargetInterceptorEvents = /* @__PURE__ */ new Set([...this._hoverHitTargetInterceptorEvents, ...this._tapHitTargetInterceptorEvents, ...this._mouseHitTargetInterceptorEvents]);
      this._engines = /* @__PURE__ */ new Map();
      this._engines.set("xpath", XPathEngine);
      this._engines.set("xpath:light", XPathEngine);
      this._engines.set("role", createRoleEngine(false));
      this._engines.set("text", this._createTextEngine(true, false));
      this._engines.set("text:light", this._createTextEngine(false, false));
      this._engines.set("id", this._createAttributeEngine("id", true));
      this._engines.set("id:light", this._createAttributeEngine("id", false));
      this._engines.set("data-testid", this._createAttributeEngine("data-testid", true));
      this._engines.set("data-testid:light", this._createAttributeEngine("data-testid", false));
      this._engines.set("data-test-id", this._createAttributeEngine("data-test-id", true));
      this._engines.set("data-test-id:light", this._createAttributeEngine("data-test-id", false));
      this._engines.set("data-test", this._createAttributeEngine("data-test", true));
      this._engines.set("data-test:light", this._createAttributeEngine("data-test", false));
      this._engines.set("css", this._createCSSEngine());
      this._engines.set("nth", { queryAll: () => [] });
      this._engines.set("visible", this._createVisibleEngine());
      this._engines.set("internal:control", this._createControlEngine());
      this._engines.set("internal:has", this._createHasEngine());
      this._engines.set("internal:has-not", this._createHasNotEngine());
      this._engines.set("internal:and", { queryAll: () => [] });
      this._engines.set("internal:or", { queryAll: () => [] });
      this._engines.set("internal:chain", this._createInternalChainEngine());
      this._engines.set("internal:label", this._createInternalLabelEngine());
      this._engines.set("internal:text", this._createTextEngine(true, true));
      this._engines.set("internal:has-text", this._createInternalHasTextEngine());
      this._engines.set("internal:has-not-text", this._createInternalHasNotTextEngine());
      this._engines.set("internal:attr", this._createNamedAttributeEngine());
      this._engines.set("internal:testid", this._createTestIdEngine());
      this._engines.set("internal:role", createRoleEngine(true));
      this._engines.set("internal:describe", this._createDescribeEngine());
      this._engines.set("aria-ref", this._createAriaRefEngine());
      for (const { name, source } of options.customEngines)
        this._engines.set(name, this.eval(source));
      this._stableRafCount = options.stableRafCount;
      this._browserName = options.browserName;
      this._shouldPrependErrorPrefix = !!options.shouldPrependErrorPrefix;
      this._isUtilityWorld = !!options.isUtilityWorld;
      setGlobalOptions({ browserNameForWorkarounds: options.browserName });
      this._setupGlobalListenersRemovalDetection();
      this._setupHitTargetInterceptors();
      if (this.isUnderTest)
        this.window.__injectedScript = this;
    }
    eval(expression) {
      return this.window.eval(expression);
    }
    testIdAttributeNameForStrictErrorAndConsoleCodegen() {
      return this._testIdAttributeNameForStrictErrorAndConsoleCodegen;
    }
    parseSelector(selector) {
      const result = parseSelector(selector);
      visitAllSelectorParts(result, (part) => {
        if (!this._engines.has(part.name))
          throw this.createStacklessError(`Unknown engine "${part.name}" while parsing selector ${selector}`);
      });
      return result;
    }
    generateSelector(targetElement, options) {
      return generateSelector(this, targetElement, options);
    }
    generateSelectorSimple(targetElement, options) {
      return generateSelector(this, targetElement, { ...options, testIdAttributeName: this._testIdAttributeNameForStrictErrorAndConsoleCodegen }).selector;
    }
    querySelector(selector, root, strict) {
      const result = this.querySelectorAll(selector, root);
      if (strict && result.length > 1)
        throw this.strictModeViolationError(selector, result);
      this.checkDeprecatedSelectorUsage(selector, result);
      return result[0];
    }
    _queryNth(elements, part) {
      const list = [...elements];
      let nth = +part.body;
      if (nth === -1)
        nth = list.length - 1;
      return new Set(list.slice(nth, nth + 1));
    }
    _queryLayoutSelector(elements, part, originalRoot) {
      const name = part.name;
      const body = part.body;
      const result = [];
      const inner = this.querySelectorAll(body.parsed, originalRoot);
      for (const element of elements) {
        const score = layoutSelectorScore(name, element, inner, body.distance);
        if (score !== void 0)
          result.push({ element, score });
      }
      result.sort((a, b) => a.score - b.score);
      return new Set(result.map((r) => r.element));
    }
    ariaSnapshot(node, options) {
      const { json } = this.ariaSnapshotJSON(node, options);
      return renderAriaSnapshotAsYaml(json, { convertStringsToRegex: options.mode === "codegen" });
    }
    ariaSnapshotJSON(node, options) {
      if (node.nodeType !== Node.ELEMENT_NODE)
        throw this.createStacklessError("Can only capture aria snapshot of Element nodes.");
      options = { ...options, refPrefix: this._frameSeq && options.mode === "ai" ? "f" + this._frameSeq : "" };
      const ariaSnapshot = generateAriaTree(node, options);
      const rendered = renderAriaTreeAsJSON(ariaSnapshot, options);
      this._lastAriaSnapshotForQuery = ariaSnapshot;
      return { json: rendered.json, iframeRefs: ariaSnapshot.iframeRefs, iframeDepths: rendered.iframeDepths };
    }
    ariaSnapshotForRecorder() {
      const tree = generateAriaTree(this.document.body, { mode: "ai" });
      const { json } = renderAriaTreeAsJSON(tree, { mode: "ai" });
      return { ariaSnapshot: renderAriaSnapshotAsYaml(json), refs: tree.refs };
    }
    ariaSnapshotForExpectFailure(element, options) {
      const { json } = renderAriaTreeAsJSON(generateAriaTree(element, options), options);
      return renderAriaSnapshotAsYaml(json);
    }
    getAllElementsMatchingExpectAriaTemplate(document, template) {
      return getAllElementsMatchingExpectAriaTemplate(document.documentElement, template);
    }
    querySelectorAll(selector, root) {
      if (selector.capture !== void 0) {
        if (selector.parts.some((part) => part.name === "nth"))
          throw this.createStacklessError(`Can't query n-th element in a request with the capture.`);
        const withHas = { parts: selector.parts.slice(0, selector.capture + 1) };
        if (selector.capture < selector.parts.length - 1) {
          const parsed = { parts: selector.parts.slice(selector.capture + 1) };
          const has = { name: "internal:has", body: { parsed }, source: stringifySelector(parsed) };
          withHas.parts.push(has);
        }
        return this.querySelectorAll(withHas, root);
      }
      if (!root["querySelectorAll"])
        throw this.createStacklessError("Node is not queryable.");
      if (selector.capture !== void 0) {
        throw this.createStacklessError("Internal error: there should not be a capture in the selector.");
      }
      if (root.nodeType === 11 && selector.parts.length === 1 && selector.parts[0].name === "css" && selector.parts[0].source === ":scope")
        return [root];
      this._evaluator.begin();
      try {
        let roots = /* @__PURE__ */ new Set([root]);
        for (const part of selector.parts) {
          if (part.name === "nth") {
            roots = this._queryNth(roots, part);
          } else if (part.name === "internal:and") {
            const andElements = this.querySelectorAll(part.body.parsed, root);
            roots = new Set(andElements.filter((e) => roots.has(e)));
          } else if (part.name === "internal:or") {
            const orElements = this.querySelectorAll(part.body.parsed, root);
            roots = new Set(sortInDOMOrder(/* @__PURE__ */ new Set([...roots, ...orElements])));
          } else if (kLayoutSelectorNames.includes(part.name)) {
            roots = this._queryLayoutSelector(roots, part, root);
          } else {
            const next = /* @__PURE__ */ new Set();
            for (const root2 of roots) {
              const all = this._queryEngineAll(part, root2);
              for (const one of all)
                next.add(one);
            }
            roots = next;
          }
        }
        return [...roots];
      } finally {
        this._evaluator.end();
      }
    }
    _queryEngineAll(part, root) {
      const result = this._engines.get(part.name).queryAll(root, part.body);
      for (const element of result) {
        if (!("nodeName" in element))
          throw this.createStacklessError(`Expected a Node but got ${Object.prototype.toString.call(element)}`);
      }
      return result;
    }
    _createAttributeEngine(attribute, shadow) {
      const toCSS = (selector) => {
        const css = `[${attribute}=${JSON.stringify(selector)}]`;
        return [{ simples: [{ selector: { css, functions: [] }, combinator: "" }] }];
      };
      return {
        queryAll: (root, selector) => {
          return this._evaluator.query({ scope: root, pierceShadow: shadow }, toCSS(selector));
        }
      };
    }
    _createCSSEngine() {
      return {
        queryAll: (root, body) => {
          return this._evaluator.query({ scope: root, pierceShadow: true }, body);
        }
      };
    }
    _createTextEngine(shadow, internal) {
      const queryAll = (root, selector) => {
        const { matcher, kind } = createTextMatcher(selector, internal);
        const result = [];
        let lastDidNotMatchSelf = null;
        const appendElement = (element) => {
          if (kind === "lax" && lastDidNotMatchSelf && lastDidNotMatchSelf.contains(element))
            return false;
          const matches = elementMatchesText(this._evaluator._cacheText, element, matcher);
          if (matches === "none")
            lastDidNotMatchSelf = element;
          if (matches === "self" || matches === "selfAndChildren" && kind === "strict" && !internal)
            result.push(element);
        };
        if (root.nodeType === Node.ELEMENT_NODE)
          appendElement(root);
        const elements = this._evaluator._queryCSS({ scope: root, pierceShadow: shadow }, "*");
        for (const element of elements)
          appendElement(element);
        return result;
      };
      return { queryAll };
    }
    _createInternalHasTextEngine() {
      return {
        queryAll: (root, selector) => {
          if (root.nodeType !== 1)
            return [];
          const element = root;
          const text = elementText(this._evaluator._cacheText, element);
          const { matcher } = createTextMatcher(selector, true);
          return matcher(text) ? [element] : [];
        }
      };
    }
    _createInternalHasNotTextEngine() {
      return {
        queryAll: (root, selector) => {
          if (root.nodeType !== 1)
            return [];
          const element = root;
          const text = elementText(this._evaluator._cacheText, element);
          const { matcher } = createTextMatcher(selector, true);
          return matcher(text) ? [] : [element];
        }
      };
    }
    _createInternalLabelEngine() {
      return {
        queryAll: (root, selector) => {
          const { matcher } = createTextMatcher(selector, true);
          const allElements = this._evaluator._queryCSS({ scope: root, pierceShadow: true }, "*");
          return allElements.filter((element) => {
            return getElementLabels(this._evaluator._cacheText, element).some((label) => matcher(label));
          });
        }
      };
    }
    _createNamedAttributeEngine() {
      const queryAll = (root, selector) => {
        const parsed = parseAttributeSelector(selector, true);
        if (parsed.name || parsed.attributes.length !== 1)
          throw new Error("Malformed attribute selector: " + selector);
        const { name } = parsed.attributes[0];
        const matcher = createAttributeMatcher(parsed.attributes[0]);
        const elements = this._evaluator._queryCSS({ scope: root, pierceShadow: true }, `[${name}]`);
        return elements.filter((e) => matcher(e.getAttribute(name)));
      };
      return { queryAll };
    }
    _createTestIdEngine() {
      const queryAll = (root, selector) => {
        const parsed = parseAttributeSelector(selector, true);
        if (parsed.name || parsed.attributes.length !== 1)
          throw new Error("Malformed test id selector: " + selector);
        const names = splitTestIdAttributeNames(parsed.attributes[0].name);
        const matcher = createAttributeMatcher(parsed.attributes[0]);
        const cssQuery = names.map((n) => `[${n}]`).join(",");
        const elements = this._evaluator._queryCSS({ scope: root, pierceShadow: true }, cssQuery);
        return elements.filter((e) => names.some((n) => {
          const actual = e.getAttribute(n);
          return actual !== null && matcher(actual);
        }));
      };
      return { queryAll };
    }
    _createDescribeEngine() {
      const queryAll = (root) => {
        if (root.nodeType !== 1)
          return [];
        return [root];
      };
      return { queryAll };
    }
    _createControlEngine() {
      return {
        queryAll(root, body) {
          if (body === "enter-frame")
            return [];
          if (body === "pierce-frames")
            return [];
          if (body === "return-empty")
            return [];
          if (body === "component") {
            if (root.nodeType !== 1)
              return [];
            return [root.childElementCount === 1 ? root.firstElementChild : root];
          }
          throw new Error(`Internal error, unknown internal:control selector ${body}`);
        }
      };
    }
    _createHasEngine() {
      const queryAll = (root, body) => {
        if (root.nodeType !== 1)
          return [];
        const has = !!this.querySelector(body.parsed, root, false);
        return has ? [root] : [];
      };
      return { queryAll };
    }
    _createHasNotEngine() {
      const queryAll = (root, body) => {
        if (root.nodeType !== 1)
          return [];
        const has = !!this.querySelector(body.parsed, root, false);
        return has ? [] : [root];
      };
      return { queryAll };
    }
    _createVisibleEngine() {
      const queryAll = (root, body) => {
        if (root.nodeType !== 1)
          return [];
        const visible = body === "true";
        return isElementVisible(root) === visible ? [root] : [];
      };
      return { queryAll };
    }
    _createInternalChainEngine() {
      const queryAll = (root, body) => {
        return this.querySelectorAll(body.parsed, root);
      };
      return { queryAll };
    }
    extend(source, params) {
      const constrFunction = this.window.eval(`
    (() => {
      const module = {};
      ${source}
      return module.exports.default();
    })()`);
      return new constrFunction(this, params);
    }
    async viewportRatio(element) {
      return await new Promise((resolve) => {
        const observer = new IntersectionObserver((entries) => {
          resolve(entries[0].intersectionRatio);
          observer.disconnect();
        });
        observer.observe(element);
        this.utils.builtins.requestAnimationFrame(() => {
        });
      });
    }
    getElementBorderWidth(node) {
      if (node.nodeType !== Node.ELEMENT_NODE || !node.ownerDocument || !node.ownerDocument.defaultView)
        return { left: 0, top: 0 };
      const style = node.ownerDocument.defaultView.getComputedStyle(node);
      return { left: parseInt(style.borderLeftWidth || "", 10), top: parseInt(style.borderTopWidth || "", 10) };
    }
    describeIFrameStyle(iframe) {
      if (!iframe.ownerDocument || !iframe.ownerDocument.defaultView)
        return "error:notconnected";
      const defaultView = iframe.ownerDocument.defaultView;
      for (let e = iframe; e; e = parentElementOrShadowHost(e)) {
        if (defaultView.getComputedStyle(e).transform !== "none")
          return "transformed";
      }
      const iframeStyle = defaultView.getComputedStyle(iframe);
      return {
        left: parseInt(iframeStyle.borderLeftWidth || "", 10) + parseInt(iframeStyle.paddingLeft || "", 10),
        top: parseInt(iframeStyle.borderTopWidth || "", 10) + parseInt(iframeStyle.paddingTop || "", 10)
      };
    }
    retarget(node, behavior) {
      let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!element)
        return null;
      if (behavior === "none")
        return element;
      if (!element.matches("input, textarea, select") && !element.isContentEditable) {
        if (behavior === "button-link")
          element = element.closest("button, [role=button], a, [role=link]") || element;
        else
          element = element.closest("button, [role=button], [role=checkbox], [role=radio]") || element;
      }
      if (behavior === "follow-label") {
        if (!element.matches("a, input, textarea, button, select, [role=link], [role=button], [role=checkbox], [role=radio]") && !element.isContentEditable) {
          const enclosingLabel = element.closest("label");
          if (enclosingLabel && enclosingLabel.control)
            element = enclosingLabel.control;
        }
      }
      return element;
    }
    async checkElementStates(node, states) {
      if (states.includes("stable")) {
        const stableResult = await this._checkElementIsStable(node);
        if (stableResult === false)
          return { missingState: "stable" };
        if (stableResult === "error:notconnected")
          return "error:notconnected";
      }
      for (const state of states) {
        if (state !== "stable") {
          const result = this.elementState(node, state);
          if (result.received === "error:notconnected")
            return "error:notconnected";
          if (!result.matches)
            return { missingState: state };
        }
      }
    }
    async _checkElementIsStable(node) {
      const continuePolling = /* @__PURE__ */ Symbol("continuePolling");
      let lastRect;
      let stableRafCounter = 0;
      let lastTime = 0;
      const check = () => {
        const element = this.retarget(node, "no-follow-label");
        if (!element)
          return "error:notconnected";
        const time = this.utils.builtins.performance.now();
        if (this._stableRafCount > 1 && time - lastTime < 15)
          return continuePolling;
        lastTime = time;
        const clientRect = element.getBoundingClientRect();
        const rect = { x: clientRect.top, y: clientRect.left, width: clientRect.width, height: clientRect.height };
        if (lastRect) {
          const samePosition = rect.x === lastRect.x && rect.y === lastRect.y && rect.width === lastRect.width && rect.height === lastRect.height;
          if (!samePosition)
            return false;
          if (++stableRafCounter >= this._stableRafCount)
            return true;
        }
        lastRect = rect;
        return continuePolling;
      };
      let fulfill;
      let reject;
      const result = new Promise((f, r) => {
        fulfill = f;
        reject = r;
      });
      const raf = () => {
        try {
          const success = check();
          if (success !== continuePolling)
            fulfill(success);
          else
            this.utils.builtins.requestAnimationFrame(raf);
        } catch (e) {
          reject(e);
        }
      };
      this.utils.builtins.requestAnimationFrame(raf);
      return result;
    }
    _createAriaRefEngine() {
      const queryAll = (root, selector) => {
        const result = this._lastAriaSnapshotForQuery?.info?.get(selector);
        return result && result.element.isConnected ? [result.element] : [];
      };
      return { queryAll };
    }
    elementState(node, state) {
      const element = this.retarget(node, ["visible", "hidden"].includes(state) ? "none" : "follow-label");
      if (!element || !element.isConnected) {
        if (state === "hidden")
          return { matches: true, received: "hidden" };
        return { matches: false, received: "error:notconnected" };
      }
      if (state === "visible" || state === "hidden") {
        const visible = isElementVisible(element);
        return {
          matches: state === "visible" ? visible : !visible,
          received: visible ? "visible" : "hidden"
        };
      }
      if (state === "disabled" || state === "enabled") {
        const disabled = getAriaDisabled(element);
        return {
          matches: state === "disabled" ? disabled : !disabled,
          received: disabled ? "disabled" : "enabled"
        };
      }
      if (state === "editable") {
        const disabled = getAriaDisabled(element);
        const readonly = getReadonly(element);
        if (readonly === "error")
          throw this.createStacklessError("Element is not an <input>, <textarea>, <select> or [contenteditable] and does not have a role allowing [aria-readonly]");
        return {
          matches: !disabled && !readonly,
          received: disabled ? "disabled" : readonly ? "readOnly" : "editable"
        };
      }
      if (state === "checked" || state === "unchecked") {
        const need = state === "checked";
        const checked = getCheckedWithoutMixed(element);
        if (checked === "error")
          throw this.createStacklessError("Not a checkbox or radio button");
        const isRadio = element.nodeName === "INPUT" && element.type === "radio";
        return {
          matches: need === checked,
          received: checked ? "checked" : "unchecked",
          isRadio
        };
      }
      if (state === "indeterminate") {
        const checked = getCheckedAllowMixed(element);
        if (checked === "error")
          throw this.createStacklessError("Not a checkbox or radio button");
        return {
          matches: checked === "mixed",
          received: checked === true ? "checked" : checked === false ? "unchecked" : "mixed"
        };
      }
      throw this.createStacklessError(`Unexpected element state "${state}"`);
    }
    selectOptions(node, optionsToSelect) {
      const element = this.retarget(node, "follow-label");
      if (!element)
        return "error:notconnected";
      if (element.nodeName.toLowerCase() !== "select")
        throw this.createStacklessError("Element is not a <select> element");
      const select = element;
      const options = [...select.options];
      const selectedOptions = [];
      let remainingOptionsToSelect = optionsToSelect.slice();
      for (let index = 0; index < options.length; index++) {
        const option = options[index];
        const normalizedOptionLabel = normalizeWhiteSpace(option.label);
        const filter = (optionToSelect) => {
          if (optionToSelect instanceof Node)
            return option === optionToSelect;
          const matchesLabel = (label) => label === option.label || normalizeWhiteSpace(label) === normalizedOptionLabel;
          let matches = true;
          if (optionToSelect.valueOrLabel !== void 0)
            matches = matches && (optionToSelect.valueOrLabel === option.value || matchesLabel(optionToSelect.valueOrLabel));
          if (optionToSelect.value !== void 0)
            matches = matches && optionToSelect.value === option.value;
          if (optionToSelect.label !== void 0)
            matches = matches && matchesLabel(optionToSelect.label);
          if (optionToSelect.index !== void 0)
            matches = matches && optionToSelect.index === index;
          return matches;
        };
        if (!remainingOptionsToSelect.some(filter))
          continue;
        if (!this.elementState(option, "enabled").matches)
          return "error:optionnotenabled";
        selectedOptions.push(option);
        if (select.multiple) {
          remainingOptionsToSelect = remainingOptionsToSelect.filter((o) => !filter(o));
        } else {
          remainingOptionsToSelect = [];
          break;
        }
      }
      if (remainingOptionsToSelect.length)
        return "error:optionsnotfound";
      select.value = void 0;
      selectedOptions.forEach((option) => option.selected = true);
      select.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return selectedOptions.map((option) => option.value);
    }
    fill(node, value) {
      const element = this.retarget(node, "follow-label");
      if (!element)
        return "error:notconnected";
      if (element.nodeName.toLowerCase() === "input") {
        const input = element;
        const type = input.type.toLowerCase();
        const kInputTypesToSetValue = /* @__PURE__ */ new Set(["color", "date", "time", "datetime-local", "month", "range", "week"]);
        const kInputTypesToTypeInto = /* @__PURE__ */ new Set(["", "email", "number", "password", "search", "tel", "text", "url"]);
        if (!kInputTypesToTypeInto.has(type) && !kInputTypesToSetValue.has(type))
          throw this.createStacklessError(`Input of type "${type}" cannot be filled`);
        if (type === "number") {
          value = value.trim();
          if (isNaN(Number(value)))
            throw this.createStacklessError("Cannot type text into input[type=number]");
        }
        if (type === "color")
          value = value.toLowerCase();
        if (kInputTypesToSetValue.has(type)) {
          value = value.trim();
          input.focus();
          input.value = value;
          if (input.value !== value)
            throw this.createStacklessError("Malformed value");
          element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return "done";
        }
      } else if (element.nodeName.toLowerCase() === "textarea") {
      } else if (!element.isContentEditable) {
        throw this.createStacklessError("Element is not an <input>, <textarea> or [contenteditable] element");
      }
      this.selectText(element);
      return "needsinput";
    }
    selectText(node) {
      const element = this.retarget(node, "follow-label");
      if (!element)
        return "error:notconnected";
      if (element.nodeName.toLowerCase() === "input") {
        const input = element;
        input.select();
        input.focus();
        return "done";
      }
      if (element.nodeName.toLowerCase() === "textarea") {
        const textarea = element;
        textarea.selectionStart = 0;
        textarea.selectionEnd = textarea.value.length;
        textarea.focus();
        return "done";
      }
      element.focus();
      const range = element.ownerDocument.createRange();
      range.selectNodeContents(element);
      const selection = element.ownerDocument.defaultView.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      return "done";
    }
    _activelyFocused(node) {
      const activeElement = node.getRootNode().activeElement;
      const isFocused = activeElement === node && !!node.ownerDocument && node.ownerDocument.hasFocus();
      return { activeElement, isFocused };
    }
    focusNode(node, resetSelectionIfNotFocused) {
      if (!node.isConnected)
        return "error:notconnected";
      if (node.nodeType !== Node.ELEMENT_NODE)
        throw this.createStacklessError("Node is not an element");
      const { activeElement, isFocused: wasFocused } = this._activelyFocused(node);
      if (node.isContentEditable && !wasFocused && activeElement && activeElement.blur) {
        activeElement.blur();
      }
      node.focus();
      node.focus();
      if (resetSelectionIfNotFocused && !wasFocused && node.nodeName.toLowerCase() === "input") {
        try {
          const input = node;
          input.setSelectionRange(0, 0);
        } catch (e) {
        }
      }
      return "done";
    }
    blurNode(node) {
      if (!node.isConnected)
        return "error:notconnected";
      if (node.nodeType !== Node.ELEMENT_NODE)
        throw this.createStacklessError("Node is not an element");
      node.blur();
      return "done";
    }
    setInputFiles(node, payloads) {
      if (node.nodeType !== Node.ELEMENT_NODE)
        return "Node is not of type HTMLElement";
      const element = node;
      if (element.nodeName !== "INPUT")
        return "Not an <input> element";
      const input = element;
      const type = (input.getAttribute("type") || "").toLowerCase();
      if (type !== "file")
        return "Not an input[type=file] element";
      const files = payloads.map((file) => {
        const bytes = Uint8Array.from(atob(file.buffer), (c) => c.charCodeAt(0));
        return new File([bytes], file.name, { type: file.mimeType, lastModified: file.lastModifiedMs });
      });
      const dt = new DataTransfer();
      for (const file of files)
        dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    expectHitTarget(hitPoint, targetElement) {
      const roots = [];
      let parentElement = targetElement;
      while (parentElement) {
        const root = enclosingShadowRootOrDocument(parentElement);
        if (!root)
          break;
        roots.push(root);
        if (root.nodeType === 9)
          break;
        parentElement = root.host;
      }
      let hitElement;
      for (let index = roots.length - 1; index >= 0; index--) {
        const root = roots[index];
        const elements = root.elementsFromPoint(hitPoint.x, hitPoint.y);
        const singleElement = root.elementFromPoint(hitPoint.x, hitPoint.y);
        if (singleElement && elements[0] && parentElementOrShadowHost(singleElement) === elements[0]) {
          const style = this.window.getComputedStyle(singleElement);
          if (style?.display === "contents") {
            elements.unshift(singleElement);
          }
        }
        if (elements[0] && elements[0].shadowRoot === root && elements[1] === singleElement) {
          elements.shift();
        }
        const innerElement = elements[0];
        if (!innerElement)
          break;
        hitElement = innerElement;
        if (index && innerElement !== roots[index - 1].host)
          break;
      }
      const hitParents = [];
      while (hitElement && hitElement !== targetElement) {
        hitParents.push(hitElement);
        hitElement = hitElement.assignedSlot ?? parentElementOrShadowHost(hitElement);
      }
      if (hitElement === targetElement)
        return "done";
      const hitTargetDescription = this.previewNode(hitParents[0] || this.document.documentElement);
      let rootHitTargetDescription;
      let element = targetElement;
      while (element) {
        const index = hitParents.indexOf(element);
        if (index !== -1) {
          if (index > 1)
            rootHitTargetDescription = this.previewNode(hitParents[index - 1]);
          break;
        }
        element = parentElementOrShadowHost(element);
      }
      if (rootHitTargetDescription)
        return { hitTargetDescription: `${hitTargetDescription} from ${rootHitTargetDescription} subtree` };
      return { hitTargetDescription };
    }
    // Life of a pointer action, for example click.
    //
    // 0. Retry items 1 and 2 while action fails due to navigation or element being detached.
    //   1. Resolve selector to an element.
    //   2. Retry the following steps until the element is detached or frame navigates away.
    //     2a. Wait for the element to be stable (not moving), visible and enabled.
    //     2b. Scroll element into view. Scrolling alternates between:
    //         - Built-in protocol scrolling.
    //         - Anchoring to the top/left, bottom/right and center/center.
    //         This is to scroll elements from under sticky headers/footers.
    //     2c. Click point is calculated, either based on explicitly specified position,
    //         or some visible point of the element based on protocol content quads.
    //     2d. Click point relative to page viewport is converted relative to the target iframe
    //         for the next hit-point check.
    //     2e. (injected) Hit target at the click point must be a descendant of the target element.
    //         This prevents mis-clicking in edge cases like <iframe> overlaying the target.
    //     2f. (injected) Events specific for click (or some other action type) are intercepted on
    //         the Window with capture:true. See 2i for details.
    //         Note: this step is skipped for drag&drop (see inline comments for the reason).
    //     2g. Necessary keyboard modifiers are pressed.
    //     2h. Click event is issued (mousemove + mousedown + mouseup).
    //     2i. (injected) For each event, we check that hit target at the event point
    //         is a descendant of the target element.
    //         This guarantees no race between issuing the event and handling it in the page,
    //         for example due to layout shift.
    //         When hit target check fails, we block all future events in the page.
    //     2j. Keyboard modifiers are restored.
    //     2k. (injected) Event interceptor is removed.
    //     2l. All navigations triggered between 2g-2k are awaited to be either committed or canceled.
    //     2m. If failed, wait for increasing amount of time before the next retry.
    setupHitTargetInterceptor(node, action, hitPoint, blockAllEvents) {
      const element = this.retarget(node, "button-link");
      if (!element || !element.isConnected)
        return "error:notconnected";
      if (hitPoint) {
        const preliminaryResult = this.expectHitTarget(hitPoint, element);
        if (preliminaryResult !== "done")
          return preliminaryResult.hitTargetDescription;
      }
      if (action === "drag")
        return { stop: () => "done" };
      const events = {
        "hover": this._hoverHitTargetInterceptorEvents,
        "tap": this._tapHitTargetInterceptorEvents,
        "mouse": this._mouseHitTargetInterceptorEvents
      }[action];
      let result;
      let listener = (event) => {
        if (!events.has(event.type))
          return;
        if (!event.isTrusted && !event.__pwTrustedSynthetic)
          return;
        const point = !!this.window.TouchEvent && event instanceof this.window.TouchEvent ? event.touches[0] : event;
        if (result === void 0 && point)
          result = this.expectHitTarget({ x: point.clientX, y: point.clientY }, element);
        if (blockAllEvents || result !== "done" && result !== void 0) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        }
      };
      const stop = () => {
        if (this._hitTargetInterceptor === listener)
          this._hitTargetInterceptor = void 0;
        listener = void 0;
        return result || "done";
      };
      this._hitTargetInterceptor = listener;
      return { stop };
    }
    dispatchEvent(node, type, eventInitObj) {
      let event;
      const eventInit = { bubbles: true, cancelable: true, composed: true, ...eventInitObj };
      switch (this._eventTypes.get(type)) {
        case "mouse":
          event = new MouseEvent(type, eventInit);
          break;
        case "keyboard":
          event = new KeyboardEvent(type, eventInit);
          break;
        case "touch": {
          if (this._browserName === "webkit") {
            const createTouch = (t) => {
              if (t instanceof Touch)
                return t;
              let pageX = t.pageX;
              if (pageX === void 0 && t.clientX !== void 0)
                pageX = t.clientX + (this.document.scrollingElement?.scrollLeft || 0);
              let pageY = t.pageY;
              if (pageY === void 0 && t.clientY !== void 0)
                pageY = t.clientY + (this.document.scrollingElement?.scrollTop || 0);
              return this.document.createTouch(this.window, t.target ?? node, t.identifier, pageX, pageY, t.screenX, t.screenY, t.radiusX, t.radiusY, t.rotationAngle, t.force);
            };
            const createTouchList = (touches) => {
              if (touches instanceof TouchList || !touches)
                return touches;
              return this.document.createTouchList(...touches.map(createTouch));
            };
            eventInit.target ?? (eventInit.target = node);
            eventInit.touches = createTouchList(eventInit.touches);
            eventInit.targetTouches = createTouchList(eventInit.targetTouches);
            eventInit.changedTouches = createTouchList(eventInit.changedTouches);
            event = new TouchEvent(type, eventInit);
          } else {
            eventInit.target ?? (eventInit.target = node);
            eventInit.touches = eventInit.touches?.map((t) => t instanceof Touch ? t : new Touch({ ...t, target: t.target ?? node }));
            eventInit.targetTouches = eventInit.targetTouches?.map((t) => t instanceof Touch ? t : new Touch({ ...t, target: t.target ?? node }));
            eventInit.changedTouches = eventInit.changedTouches?.map((t) => t instanceof Touch ? t : new Touch({ ...t, target: t.target ?? node }));
            event = new TouchEvent(type, eventInit);
          }
          break;
        }
        case "pointer":
          event = new PointerEvent(type, eventInit);
          break;
        case "focus":
          event = new FocusEvent(type, eventInit);
          break;
        case "drag":
          event = new DragEvent(type, eventInit);
          break;
        case "wheel":
          event = new WheelEvent(type, eventInit);
          break;
        case "deviceorientation":
          try {
            event = new DeviceOrientationEvent(type, eventInit);
          } catch {
            const { bubbles, cancelable, alpha, beta, gamma, absolute } = eventInit;
            event = this.document.createEvent("DeviceOrientationEvent");
            event.initDeviceOrientationEvent(type, bubbles, cancelable, alpha, beta, gamma, absolute);
          }
          break;
        case "devicemotion":
          try {
            event = new DeviceMotionEvent(type, eventInit);
          } catch {
            const { bubbles, cancelable, acceleration, accelerationIncludingGravity, rotationRate, interval } = eventInit;
            event = this.document.createEvent("DeviceMotionEvent");
            event.initDeviceMotionEvent(type, bubbles, cancelable, acceleration, accelerationIncludingGravity, rotationRate, interval);
          }
          break;
        default:
          event = new Event(type, eventInit);
          break;
      }
      node.dispatchEvent(event);
    }
    previewNode(node) {
      if (node.nodeType === Node.TEXT_NODE)
        return oneLine(`#text=${node.nodeValue || ""}`);
      if (node.nodeType !== Node.ELEMENT_NODE)
        return oneLine(`<${node.nodeName.toLowerCase()} />`);
      const element = node;
      const attrs = [];
      for (let i = 0; i < element.attributes.length; i++) {
        const { name, value } = element.attributes[i];
        if (name === "style")
          continue;
        if (!value && this._booleanAttributes.has(name))
          attrs.push(` ${name}`);
        else
          attrs.push(` ${name}="${value}"`);
      }
      attrs.sort((a, b) => a.length - b.length);
      const attrText = trimStringWithEllipsis(attrs.join(""), 500);
      if (this._autoClosingTags.has(element.nodeName))
        return oneLine(`<${element.nodeName.toLowerCase()}${attrText}/>`);
      const children = element.childNodes;
      let onlyText = false;
      if (children.length <= 5) {
        onlyText = true;
        for (let i = 0; i < children.length; i++)
          onlyText = onlyText && children[i].nodeType === Node.TEXT_NODE;
      }
      const text = onlyText ? element.textContent || "" : children.length ? "\u2026" : "";
      return oneLine(`<${element.nodeName.toLowerCase()}${attrText}>${trimStringWithEllipsis(text, 50)}</${element.nodeName.toLowerCase()}>`);
    }
    _generateSelectors(elements) {
      this._evaluator.begin();
      beginAriaCaches();
      beginDOMCaches();
      try {
        const maxElements = this._isUtilityWorld && this._browserName === "firefox" ? 2 : 10;
        const infos = elements.slice(0, maxElements).map((m) => ({
          preview: this.previewNode(m),
          selector: this.generateSelectorSimple(m)
        }));
        return infos.map((info, i) => `${i + 1}) ${info.preview} aka ${asLocator(this._sdkLanguage, info.selector)}`);
      } finally {
        endDOMCaches();
        endAriaCaches();
        this._evaluator.end();
      }
    }
    strictModeViolationError(selector, matches) {
      const lines = this._generateSelectors(matches).map((line) => `
    ` + line);
      if (lines.length < matches.length)
        lines.push("\n    ...");
      return this.createStacklessError(`strict mode violation: ${asLocator(this._sdkLanguage, stringifySelector(selector))} resolved to ${matches.length} elements:${lines.join("")}
`);
    }
    checkDeprecatedSelectorUsage(selector, matches) {
      const kDeprecatedSelectors = /* @__PURE__ */ new Set([
        "_react",
        "_vue",
        "xpath:light",
        "text:light",
        "id:light",
        "data-testid:light",
        "data-test-id:light",
        "data-test:light"
      ]);
      if (!matches.length)
        return;
      const deperecated = selector.parts.find((part) => kDeprecatedSelectors.has(part.name));
      if (!deperecated)
        return;
      const lines = this._generateSelectors(matches).map((line) => `
    ` + line);
      if (lines.length < matches.length)
        lines.push("\n    ...");
      throw this.createStacklessError(`"${deperecated.name}" selector is not supported: ${asLocator(this._sdkLanguage, stringifySelector(selector))} resolved to ${matches.length} element${matches.length === 1 ? "" : "s"}:${lines.join("")}
`);
    }
    createStacklessError(message) {
      const error = this._shouldPrependErrorPrefix ? new Error("Error: " + message) : new Error(message);
      if (this._browserName === "firefox") {
        error.stack = "";
        return error;
      }
      delete error.stack;
      return error;
    }
    createHighlight() {
      return new Highlight(this);
    }
    addMaskedElements(elements, color) {
      const highlight = this._ensureHighlight();
      highlight.addMaskedElements(elements, color);
    }
    _ensureHighlight() {
      if (!this._highlight) {
        this._highlight = new Highlight(this);
        this._highlight.install();
      }
      return this._highlight;
    }
    addHighlight(selector, style) {
      const highlight = this._ensureHighlight();
      highlight.addElementHighlight(selector, style);
    }
    removeHighlight(selector) {
      const highlight = this._ensureHighlight();
      highlight.removeElementHighlight(selector);
    }
    setScreencastAnnotation(annotation) {
      const highlight = this._ensureHighlight();
      if (!annotation) {
        highlight.updateHighlight([]);
        highlight.hideActionPoint();
        highlight.hideActionTitle();
        highlight.hideActionCursor();
        return;
      }
      const fadeDuration = annotation.duration ?? 500;
      if (annotation.box) {
        highlight.updateHighlight([{
          box: annotation.box,
          color: "rgba(0, 128, 255, 0.15)",
          borderColor: "rgba(0, 128, 255, 0.6)",
          fadeDuration
        }]);
      }
      if (annotation.point) {
        if (annotation.cursor !== "none")
          highlight.moveActionCursor(annotation.point.x, annotation.point.y, fadeDuration);
        highlight.showActionPoint(annotation.point.x, annotation.point.y, fadeDuration);
      }
      if (annotation.actionTitle)
        highlight.showActionTitle(annotation.actionTitle, fadeDuration, annotation.position, annotation.fontSize);
    }
    addUserOverlay(id, html) {
      const highlight = this._ensureHighlight();
      highlight.addUserOverlay(id, html);
    }
    getUserOverlay(id) {
      const highlight = this._ensureHighlight();
      return highlight.getUserOverlay(id);
    }
    removeUserOverlay(id) {
      const highlight = this._ensureHighlight();
      highlight.removeUserOverlay(id);
    }
    setUserOverlaysVisible(visible) {
      const highlight = this._ensureHighlight();
      highlight.setUserOverlaysVisible(visible);
    }
    hideHighlight() {
      if (this._highlight) {
        this._highlight.uninstall();
        delete this._highlight;
      }
    }
    markTargetElements(markedElements) {
      const resetEvent = new CustomEvent("__playwright_reset_targets__", {
        bubbles: true,
        cancelable: true,
        composed: true
      });
      this.document.dispatchEvent(resetEvent);
      const markEvent = new CustomEvent("__playwright_mark_target__", {
        bubbles: true,
        cancelable: true,
        composed: true
      });
      for (const element of markedElements)
        element.dispatchEvent(markEvent);
    }
    _setupGlobalListenersRemovalDetection() {
      const customEventName = "__playwright_global_listeners_check__";
      let seenEvent = false;
      const handleCustomEvent = () => seenEvent = true;
      this.window.addEventListener(customEventName, handleCustomEvent);
      new MutationObserver((entries) => {
        const newDocumentElement = entries.some((entry) => Array.from(entry.addedNodes).includes(this.document.documentElement));
        if (!newDocumentElement)
          return;
        seenEvent = false;
        this.window.dispatchEvent(new CustomEvent(customEventName));
        if (seenEvent)
          return;
        this.window.addEventListener(customEventName, handleCustomEvent);
        for (const callback of this.onGlobalListenersRemoved)
          callback();
      }).observe(this.document, { childList: true });
    }
    _setupHitTargetInterceptors() {
      const listener = (event) => this._hitTargetInterceptor?.(event);
      const addHitTargetInterceptorListeners = () => {
        for (const event of this._allHitTargetInterceptorEvents)
          this.window.addEventListener(event, listener, { capture: true, passive: false });
      };
      addHitTargetInterceptorListeners();
      this.onGlobalListenersRemoved.add(addHitTargetInterceptorListeners);
    }
    async expect(element, options, elements) {
      const isArray = options.expression === "to.have.count" || options.expression.endsWith(".array");
      const core = isArray ? this.expectArray(elements, options) : await this.expectSingleElement(element, options);
      const ariaSnapshot = core.matches !== options.isNot ? void 0 : this._ariaSnapshotForExpect(element, options);
      if (core.received === void 0 && ariaSnapshot === void 0)
        return { matches: core.matches };
      return { matches: core.matches, received: { value: core.received, ariaSnapshot } };
    }
    _ariaSnapshotForExpect(element, options) {
      const expression = options.expression;
      if (expression === "to.have.count" || expression.endsWith(".array") || expression === "to.match.aria")
        return void 0;
      if (isElementVisible(element) && expression !== "to.have.title" && expression !== "to.have.url") {
        const isContainment = expression === "to.have.text";
        return this.ariaSnapshotForExpectFailure(element, { mode: "default", depth: isContainment ? void 0 : 1 });
      }
      if (!this.document.body)
        return void 0;
      return this.ariaSnapshotForExpectFailure(this.document.body, { mode: "default" });
    }
    async expectSingleElement(element, options) {
      const expression = options.expression;
      {
        if (expression === "to.have.title") {
          const received = this.document.title;
          return { received, matches: new ExpectedTextMatcher(options.expectedText[0]).matches(received) };
        }
        if (expression === "to.have.url") {
          const received = this.document.location.href;
          return { received, matches: new ExpectedTextMatcher(options.expectedText[0]).matches(received) };
        }
      }
      {
        let result;
        if (expression === "to.have.attribute") {
          const hasAttribute = element.hasAttribute(options.expressionArg);
          result = {
            matches: hasAttribute,
            received: hasAttribute ? "attribute present" : "attribute not present"
          };
        } else if (expression === "to.be.checked") {
          const { checked, indeterminate } = options.expectedValue;
          if (indeterminate) {
            if (checked !== void 0)
              throw this.createStacklessError("Can't assert indeterminate and checked at the same time");
            result = this.elementState(element, "indeterminate");
          } else {
            result = this.elementState(element, checked === false ? "unchecked" : "checked");
          }
        } else if (expression === "to.be.disabled") {
          result = this.elementState(element, "disabled");
        } else if (expression === "to.be.editable") {
          result = this.elementState(element, "editable");
        } else if (expression === "to.be.readonly") {
          result = this.elementState(element, "editable");
          result.matches = !result.matches;
        } else if (expression === "to.be.empty") {
          if (element.nodeName === "INPUT" || element.nodeName === "TEXTAREA") {
            const value = element.value;
            result = { matches: !value, received: value ? "notEmpty" : "empty" };
          } else {
            const text = element.textContent?.trim();
            result = { matches: !text, received: text ? "notEmpty" : "empty" };
          }
        } else if (expression === "to.be.enabled") {
          result = this.elementState(element, "enabled");
        } else if (expression === "to.be.focused") {
          const focused = this._activelyFocused(element).isFocused;
          result = {
            matches: focused,
            received: focused ? "focused" : "inactive"
          };
        } else if (expression === "to.be.hidden") {
          result = this.elementState(element, "hidden");
        } else if (expression === "to.be.visible") {
          result = this.elementState(element, "visible");
        } else if (expression === "to.be.attached") {
          result = {
            matches: true,
            received: "attached"
          };
        } else if (expression === "to.be.detached") {
          result = {
            matches: false,
            received: "attached"
          };
        }
        if (result) {
          if (result.received === "error:notconnected")
            throw this.createStacklessError("Element is not connected");
          return result;
        }
      }
      {
        if (expression === "to.have.property") {
          let target = element;
          const properties = options.expressionArg.split(".");
          for (let i = 0; i < properties.length - 1; i++) {
            if (typeof target !== "object" || !(properties[i] in target))
              return { received: void 0, matches: false };
            target = target[properties[i]];
          }
          const received = target[properties[properties.length - 1]];
          const matches = deepEquals(received, options.expectedValue);
          return { received, matches };
        }
      }
      {
        if (expression === "to.be.in.viewport") {
          const ratio = await this.viewportRatio(element);
          return { received: `viewport ratio ${ratio}`, matches: ratio > 0 && ratio > (options.expectedNumber ?? 0) - 1e-9 };
        }
      }
      {
        if (expression === "to.have.values") {
          element = this.retarget(element, "follow-label");
          if (element.nodeName !== "SELECT" || !element.multiple)
            throw this.createStacklessError("Not a select element with a multiple attribute");
          const received = [...element.selectedOptions].map((o) => o.value);
          if (received.length !== options.expectedText.length)
            return { received, matches: false };
          return { received, matches: received.map((r, i) => new ExpectedTextMatcher(options.expectedText[i]).matches(r)).every(Boolean) };
        }
      }
      {
        if (expression === "to.match.aria") {
          const result = matchesExpectAriaTemplate(element, options.expectedValue);
          return {
            received: result.received,
            matches: !!result.matches.length
          };
        }
      }
      {
        let received;
        if (expression === "to.have.attribute.value") {
          const value = element.getAttribute(options.expressionArg);
          if (value === null)
            return { received: null, matches: false };
          received = value;
        } else if (["to.have.class", "to.contain.class"].includes(expression)) {
          if (!options.expectedText)
            throw this.createStacklessError("Expected text is not provided for " + expression);
          return {
            received: element.classList.toString(),
            matches: new ExpectedTextMatcher(options.expectedText[0]).matchesClassList(
              this,
              element.classList,
              /* partial */
              expression === "to.contain.class"
            )
          };
        } else if (expression === "to.have.css") {
          received = this.window.getComputedStyle(element, options.pseudo ? `::${options.pseudo}` : void 0).getPropertyValue(options.expressionArg);
        } else if (expression === "to.have.id") {
          received = element.id;
        } else if (expression === "to.have.text") {
          received = options.useInnerText ? element.innerText : elementText(/* @__PURE__ */ new Map(), element).full;
        } else if (expression === "to.have.accessible.name") {
          received = getElementAccessibleNameText(
            element,
            false
            /* includeHidden */
          );
        } else if (expression === "to.have.accessible.description") {
          received = getElementAccessibleDescription(
            element,
            false
            /* includeHidden */
          ).text;
        } else if (expression === "to.have.accessible.error.message") {
          received = getElementAccessibleErrorMessage(element);
        } else if (expression === "to.have.role") {
          received = getAriaRole(element) || "";
        } else if (expression === "to.have.value") {
          element = this.retarget(element, "follow-label");
          if (element.nodeName !== "INPUT" && element.nodeName !== "TEXTAREA" && element.nodeName !== "SELECT")
            throw this.createStacklessError("Not an input element");
          received = element.value;
        }
        if (received !== void 0 && options.expectedText) {
          const matcher = new ExpectedTextMatcher(options.expectedText[0]);
          return { received, matches: matcher.matches(received) };
        }
      }
      throw this.createStacklessError("Unknown expect matcher: " + expression);
    }
    expectArray(elements, options) {
      const expression = options.expression;
      if (expression === "to.have.count") {
        const received2 = elements.length;
        const matches2 = received2 === options.expectedNumber;
        return { received: received2, matches: matches2 };
      }
      if (!options.expectedText)
        throw this.createStacklessError("Expected text is not provided for " + expression);
      if (["to.have.class.array", "to.contain.class.array"].includes(expression)) {
        const receivedClassLists = elements.map((e) => e.classList);
        const received2 = receivedClassLists.map(String);
        if (receivedClassLists.length !== options.expectedText.length)
          return { received: received2, matches: false };
        const matches2 = this._matchSequentially(
          options.expectedText,
          receivedClassLists,
          (matcher, r) => matcher.matchesClassList(
            this,
            r,
            /* partial */
            expression === "to.contain.class.array"
          )
        );
        return {
          received: received2,
          matches: matches2
        };
      }
      if (!["to.contain.text.array", "to.have.text.array"].includes(expression))
        throw this.createStacklessError("Unknown expect matcher: " + expression);
      const received = elements.map((e) => options.useInnerText ? e.innerText : elementText(/* @__PURE__ */ new Map(), e).full);
      const lengthShouldMatch = expression !== "to.contain.text.array";
      const matchesLength = received.length === options.expectedText.length || !lengthShouldMatch;
      if (!matchesLength)
        return { received, matches: false };
      const matches = this._matchSequentially(options.expectedText, received, (matcher, r) => matcher.matches(r));
      return { received, matches };
    }
    _matchSequentially(expectedText, received, matchFn) {
      const matchers = expectedText.map((e) => new ExpectedTextMatcher(e));
      let mIndex = 0;
      let rIndex = 0;
      while (mIndex < matchers.length && rIndex < received.length) {
        if (matchFn(matchers[mIndex], received[rIndex]))
          ++mIndex;
        ++rIndex;
      }
      return mIndex === matchers.length;
    }
  };
  function oneLine(s) {
    return s.replace(/\n/g, "\u21B5").replace(/\t/g, "\u21C6");
  }
  function createAttributeMatcher(part) {
    const { value, caseSensitive } = part;
    if (value instanceof RegExp)
      return (s) => !!s.match(value);
    if (caseSensitive)
      return (s) => s === value;
    const lowerCaseValue = value.toLowerCase();
    return (s) => s.toLowerCase().includes(lowerCaseValue);
  }
  function cssUnquote(s) {
    s = s.substring(1, s.length - 1);
    if (!s.includes("\\"))
      return s;
    const r = [];
    let i = 0;
    while (i < s.length) {
      if (s[i] === "\\" && i + 1 < s.length)
        i++;
      r.push(s[i++]);
    }
    return r.join("");
  }
  function createTextMatcher(selector, internal) {
    if (selector[0] === "/" && selector.lastIndexOf("/") > 0) {
      const lastSlash = selector.lastIndexOf("/");
      const re = new RegExp(selector.substring(1, lastSlash), selector.substring(lastSlash + 1));
      return { matcher: (elementText2) => re.test(elementText2.full), kind: "regex" };
    }
    const unquote = internal ? JSON.parse.bind(JSON) : cssUnquote;
    let strict = false;
    if (selector.length > 1 && selector[0] === '"' && selector[selector.length - 1] === '"') {
      selector = unquote(selector);
      strict = true;
    } else if (internal && selector.length > 1 && selector[0] === '"' && selector[selector.length - 2] === '"' && selector[selector.length - 1] === "i") {
      selector = unquote(selector.substring(0, selector.length - 1));
      strict = false;
    } else if (internal && selector.length > 1 && selector[0] === '"' && selector[selector.length - 2] === '"' && selector[selector.length - 1] === "s") {
      selector = unquote(selector.substring(0, selector.length - 1));
      strict = true;
    } else if (selector.length > 1 && selector[0] === "'" && selector[selector.length - 1] === "'") {
      selector = unquote(selector);
      strict = true;
    }
    selector = normalizeWhiteSpace(selector);
    if (strict) {
      if (internal)
        return { kind: "strict", matcher: (elementText2) => elementText2.normalized === selector };
      const strictTextNodeMatcher = (elementText2) => {
        if (!selector && !elementText2.immediate.length)
          return true;
        return elementText2.immediate.some((s) => normalizeWhiteSpace(s) === selector);
      };
      return { matcher: strictTextNodeMatcher, kind: "strict" };
    }
    selector = selector.toLowerCase();
    return { kind: "lax", matcher: (elementText2) => elementText2.normalized.toLowerCase().includes(selector) };
  }
  var ExpectedTextMatcher = class {
    constructor(expected) {
      this._normalizeWhiteSpace = expected.normalizeWhiteSpace;
      this._ignoreCase = expected.ignoreCase;
      this._string = expected.matchSubstring ? void 0 : this.normalize(expected.string);
      this._substring = expected.matchSubstring ? this.normalize(expected.string) : void 0;
      if (expected.regexSource) {
        const flags = new Set((expected.regexFlags || "").split(""));
        if (expected.ignoreCase === false)
          flags.delete("i");
        if (expected.ignoreCase === true)
          flags.add("i");
        this._regex = new RegExp(expected.regexSource, [...flags].join(""));
      }
    }
    matches(text) {
      if (!this._regex)
        text = this.normalize(text);
      if (this._string !== void 0)
        return text === this._string;
      if (this._substring !== void 0)
        return text.includes(this._substring);
      if (this._regex)
        return !!this._regex.test(text);
      return false;
    }
    matchesClassList(injectedScript, classList, partial) {
      if (partial) {
        if (this._regex)
          throw injectedScript.createStacklessError("Partial matching does not support regular expressions. Please provide a string value.");
        return this._string.split(/\s+/g).filter(Boolean).every((className) => classList.contains(className));
      }
      return this.matches(classList.toString());
    }
    normalize(s) {
      if (!s)
        return s;
      if (this._normalizeWhiteSpace)
        s = normalizeWhiteSpace(s);
      if (this._ignoreCase)
        s = s.toLocaleLowerCase();
      return s;
    }
  };
  function deepEquals(a, b) {
    if (a === b)
      return true;
    if (a && b && typeof a === "object" && typeof b === "object") {
      if (a.constructor !== b.constructor)
        return false;
      if (Array.isArray(a)) {
        if (a.length !== b.length)
          return false;
        for (let i = 0; i < a.length; ++i) {
          if (!deepEquals(a[i], b[i]))
            return false;
        }
        return true;
      }
      if (a instanceof RegExp)
        return a.source === b.source && a.flags === b.flags;
      if (a.valueOf !== Object.prototype.valueOf)
        return a.valueOf() === b.valueOf();
      if (a.toString !== Object.prototype.toString)
        return a.toString() === b.toString();
      const keys = Object.keys(a);
      if (keys.length !== Object.keys(b).length)
        return false;
      for (let i = 0; i < keys.length; ++i) {
        if (!b.hasOwnProperty(keys[i]))
          return false;
      }
      for (const key of keys) {
        if (!deepEquals(a[key], b[key]))
          return false;
      }
      return true;
    }
    if (typeof a === "number" && typeof b === "number")
      return isNaN(a) && isNaN(b);
    return false;
  }
  var StorageScript = class {
    constructor(isFirefox) {
      this._isFirefox = isFirefox;
      this._global = globalThis;
    }
    _idbRequestToPromise(request) {
      return new Promise((resolve, reject) => {
        request.addEventListener("success", () => resolve(request.result));
        request.addEventListener("error", () => reject(request.error));
      });
    }
    _isPlainObject(v) {
      const ctor = v?.constructor;
      if (this._isFirefox) {
        const constructorImpl = ctor?.toString();
        if (constructorImpl?.startsWith("function Object() {") && constructorImpl?.includes("[native code]"))
          return true;
      }
      return ctor === Object;
    }
    _trySerialize(value) {
      let trivial = true;
      const encoded = serializeAsCallArgument(value, (v) => {
        const isTrivial = this._isPlainObject(v) || Array.isArray(v) || typeof v === "string" || typeof v === "number" || typeof v === "boolean" || Object.is(v, null);
        if (!isTrivial)
          trivial = false;
        return { fallThrough: v };
      });
      if (trivial)
        return { trivial: value };
      return { encoded };
    }
    async _collectDB(dbInfo) {
      if (!dbInfo.name)
        throw new Error("Database name is empty");
      if (!dbInfo.version)
        throw new Error("Database version is unset");
      const db = await this._idbRequestToPromise(indexedDB.open(dbInfo.name));
      if (db.objectStoreNames.length === 0)
        return { name: dbInfo.name, version: dbInfo.version, stores: [] };
      const transaction = db.transaction(db.objectStoreNames, "readonly");
      const stores = await Promise.all([...db.objectStoreNames].map(async (storeName) => {
        const objectStore = transaction.objectStore(storeName);
        const keys = await this._idbRequestToPromise(objectStore.getAllKeys());
        const records = await Promise.all(keys.map(async (key) => {
          const record = {};
          if (objectStore.keyPath === null) {
            const { encoded: encoded2, trivial: trivial2 } = this._trySerialize(key);
            if (trivial2)
              record.key = trivial2;
            else
              record.keyEncoded = encoded2;
          }
          const value = await this._idbRequestToPromise(objectStore.get(key));
          const { encoded, trivial } = this._trySerialize(value);
          if (trivial)
            record.value = trivial;
          else
            record.valueEncoded = encoded;
          return record;
        }));
        const indexes = [...objectStore.indexNames].map((indexName) => {
          const index = objectStore.index(indexName);
          return {
            name: index.name,
            keyPath: typeof index.keyPath === "string" ? index.keyPath : void 0,
            keyPathArray: Array.isArray(index.keyPath) ? index.keyPath : void 0,
            multiEntry: index.multiEntry,
            unique: index.unique
          };
        });
        return {
          name: storeName,
          records,
          indexes,
          autoIncrement: objectStore.autoIncrement,
          keyPath: typeof objectStore.keyPath === "string" ? objectStore.keyPath : void 0,
          keyPathArray: Array.isArray(objectStore.keyPath) ? objectStore.keyPath : void 0
        };
      }));
      return {
        name: dbInfo.name,
        version: dbInfo.version,
        stores
      };
    }
    async collect(recordIndexedDB) {
      const localStorage = Object.keys(this._global.localStorage).map((name) => ({ name, value: this._global.localStorage.getItem(name) }));
      if (!recordIndexedDB)
        return { localStorage };
      try {
        const databases = await this._global.indexedDB.databases();
        const indexedDB2 = await Promise.all(databases.map((db) => this._collectDB(db)));
        return { localStorage, indexedDB: indexedDB2 };
      } catch (e) {
        throw new Error("Unable to serialize IndexedDB: " + e.message);
      }
    }
    async _restoreDB(dbInfo) {
      const openRequest = this._global.indexedDB.open(dbInfo.name, dbInfo.version);
      openRequest.addEventListener("upgradeneeded", () => {
        const db2 = openRequest.result;
        for (const store of dbInfo.stores) {
          const objectStore = db2.createObjectStore(store.name, { autoIncrement: store.autoIncrement, keyPath: store.keyPathArray ?? store.keyPath });
          for (const index of store.indexes)
            objectStore.createIndex(index.name, index.keyPathArray ?? index.keyPath, { unique: index.unique, multiEntry: index.multiEntry });
        }
      });
      const db = await this._idbRequestToPromise(openRequest);
      if (db.objectStoreNames.length === 0)
        return;
      const transaction = db.transaction(db.objectStoreNames, "readwrite");
      await Promise.all(dbInfo.stores.map(async (store) => {
        const objectStore = transaction.objectStore(store.name);
        await Promise.all(store.records.map(async (record) => {
          await this._idbRequestToPromise(
            objectStore.add(
              record.value ?? parseEvaluationResultValue(record.valueEncoded),
              record.key ?? parseEvaluationResultValue(record.keyEncoded)
            )
          );
        }));
      }));
    }
    async restore(originState) {
      const registrations = this._global.navigator.serviceWorker ? await this._global.navigator.serviceWorker.getRegistrations() : [];
      await Promise.all(registrations.map(async (r) => {
        if (!r.installing && !r.waiting && !r.active)
          r.unregister().catch(() => {
          });
        else
          await r.unregister().catch(() => {
          });
      }));
      try {
        for (const db of await this._global.indexedDB.databases?.() || []) {
          if (db.name)
            this._global.indexedDB.deleteDatabase(db.name);
        }
        await Promise.all((originState?.indexedDB ?? []).map((dbInfo) => this._restoreDB(dbInfo)));
      } catch (e) {
        throw new Error("Unable to restore IndexedDB: " + e.message);
      }
      this._global.sessionStorage.clear();
      this._global.localStorage.clear();
      for (const { name, value } of originState?.localStorage || [])
        this._global.localStorage.setItem(name, value);
    }
  };
  function assertionAbortedMessage(reason) {
    const detail = reason instanceof Error ? reason.message : reason === void 0 || reason === null ? "" : String(reason);
    return "The assertion was aborted" + (detail ? `: ${detail}` : "");
  }
  function assert(value, message) {
    if (!value)
      throw new Error(message || "Assertion error");
  }
  function base64ByteLength(data) {
    if (!data)
      return 0;
    const padding = data[data.length - 2] === "=" ? 2 : data[data.length - 1] === "=" ? 1 : 0;
    return Math.max(0, Math.floor(data.length * 3 / 4) - padding);
  }
  var ByImpl = class _ByImpl {
    constructor(build) {
      this._build = build;
    }
    _append(build) {
      return new _ByImpl((testIdAttributeName) => {
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
  };
  var by = new ByImpl(() => "");
  function resolveBy(by2, testIdAttributeName) {
    const selector = by2._build(testIdAttributeName);
    if (!selector)
      throw new Error(`Empty "by" locator. Start with one of by.role(), by.text(), by.testId() and friends.`);
    return selector;
  }
  var webColors = {
    enabled: true,
    reset: (text) => applyStyle(0, 0, text),
    bold: (text) => applyStyle(1, 22, text),
    dim: (text) => applyStyle(2, 22, text),
    italic: (text) => applyStyle(3, 23, text),
    underline: (text) => applyStyle(4, 24, text),
    inverse: (text) => applyStyle(7, 27, text),
    hidden: (text) => applyStyle(8, 28, text),
    strikethrough: (text) => applyStyle(9, 29, text),
    black: (text) => applyStyle(30, 39, text),
    red: (text) => applyStyle(31, 39, text),
    green: (text) => applyStyle(32, 39, text),
    yellow: (text) => applyStyle(33, 39, text),
    blue: (text) => applyStyle(34, 39, text),
    magenta: (text) => applyStyle(35, 39, text),
    cyan: (text) => applyStyle(36, 39, text),
    white: (text) => applyStyle(37, 39, text),
    gray: (text) => applyStyle(90, 39, text),
    grey: (text) => applyStyle(90, 39, text)
  };
  var noColors = {
    enabled: false,
    reset: (t) => t,
    bold: (t) => t,
    dim: (t) => t,
    italic: (t) => t,
    underline: (t) => t,
    inverse: (t) => t,
    hidden: (t) => t,
    strikethrough: (t) => t,
    black: (t) => t,
    red: (t) => t,
    green: (t) => t,
    yellow: (t) => t,
    blue: (t) => t,
    magenta: (t) => t,
    cyan: (t) => t,
    white: (t) => t,
    gray: (t) => t,
    grey: (t) => t
  };
  var applyStyle = (open, close, text) => `\x1B[${open}m${text}\x1B[${close}m`;
  var deviceDescriptorsSource_default = {
    "Blackberry PlayBook": {
      userAgent: "Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/26.5 Safari/536.2+",
      viewport: {
        width: 600,
        height: 1024
      },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Blackberry PlayBook landscape": {
      userAgent: "Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/26.5 Safari/536.2+",
      viewport: {
        width: 1024,
        height: 600
      },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "BlackBerry Z30": {
      userAgent: "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/26.5 Mobile Safari/537.10+",
      viewport: {
        width: 360,
        height: 640
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "BlackBerry Z30 landscape": {
      userAgent: "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/26.5 Mobile Safari/537.10+",
      viewport: {
        width: 640,
        height: 360
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Galaxy Note 3": {
      userAgent: "Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/26.5 Mobile Safari/534.30",
      viewport: {
        width: 360,
        height: 640
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Galaxy Note 3 landscape": {
      userAgent: "Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/26.5 Mobile Safari/534.30",
      viewport: {
        width: 640,
        height: 360
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Galaxy Note II": {
      userAgent: "Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/26.5 Mobile Safari/534.30",
      viewport: {
        width: 360,
        height: 640
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Galaxy Note II landscape": {
      userAgent: "Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/26.5 Mobile Safari/534.30",
      viewport: {
        width: 640,
        height: 360
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Galaxy S III": {
      userAgent: "Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/26.5 Mobile Safari/534.30",
      viewport: {
        width: 360,
        height: 640
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Galaxy S III landscape": {
      userAgent: "Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/26.5 Mobile Safari/534.30",
      viewport: {
        width: 640,
        height: 360
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Galaxy S5": {
      userAgent: "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 360,
        height: 640
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy S5 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 640,
        height: 360
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy S8": {
      userAgent: "Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 360,
        height: 740
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy S8 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 740,
        height: 360
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy S9+": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 320,
        height: 658
      },
      deviceScaleFactor: 4.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy S9+ landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 658,
        height: 320
      },
      deviceScaleFactor: 4.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy S24": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S921U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 360,
        height: 780
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy S24 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S921U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 780,
        height: 360
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy A55": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 480,
        height: 1040
      },
      deviceScaleFactor: 2.25,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy A55 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 1040,
        height: 480
      },
      deviceScaleFactor: 2.25,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Tab S4": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.1.0; SM-T837A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36",
      viewport: {
        width: 712,
        height: 1138
      },
      deviceScaleFactor: 2.25,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Tab S4 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.1.0; SM-T837A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36",
      viewport: {
        width: 1138,
        height: 712
      },
      deviceScaleFactor: 2.25,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Tab S9": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36",
      viewport: {
        width: 640,
        height: 1024
      },
      deviceScaleFactor: 2.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Tab S9 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36",
      viewport: {
        width: 1024,
        height: 640
      },
      deviceScaleFactor: 2.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Fold 6": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F956U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 928,
        height: 1080
      },
      viewport: {
        width: 928,
        height: 1004
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Fold 6 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F956U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 1080,
        height: 928
      },
      viewport: {
        width: 1028,
        height: 876
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Fold 6 Cover": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F956U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 484,
        height: 1188
      },
      viewport: {
        width: 484,
        height: 1112
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Fold 6 Cover landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F956U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 1188,
        height: 484
      },
      viewport: {
        width: 1136,
        height: 432
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Fold 7": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F966U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 984,
        height: 1092
      },
      viewport: {
        width: 984,
        height: 1016
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Fold 7 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F966U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 1092,
        height: 984
      },
      viewport: {
        width: 1040,
        height: 932
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Fold 7 Cover": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F966U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 360,
        height: 840
      },
      viewport: {
        width: 360,
        height: 764
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Fold 7 Cover landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F966U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 840,
        height: 360
      },
      viewport: {
        width: 788,
        height: 308
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Flip 6": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F741U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 360,
        height: 880
      },
      viewport: {
        width: 360,
        height: 804
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Flip 6 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F741U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 880,
        height: 360
      },
      viewport: {
        width: 828,
        height: 308
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Flip 6 Cover": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F741U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 360,
        height: 374
      },
      viewport: {
        width: 360,
        height: 298
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Flip 6 Cover landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F741U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 374,
        height: 360
      },
      viewport: {
        width: 322,
        height: 308
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Flip 7": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F761U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 360,
        height: 840
      },
      viewport: {
        width: 360,
        height: 764
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Flip 7 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F761U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 840,
        height: 360
      },
      viewport: {
        width: 788,
        height: 308
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Flip 7 Cover": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F761U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 474,
        height: 524
      },
      viewport: {
        width: 474,
        height: 448
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Galaxy Z Flip 7 Cover landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; SM-F761U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 524,
        height: 474
      },
      viewport: {
        width: 472,
        height: 422
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "iPad (gen 5)": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 768,
        height: 1024
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPad (gen 5) landscape": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 1024,
        height: 768
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPad (gen 6)": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 768,
        height: 1024
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPad (gen 6) landscape": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 1024,
        height: 768
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPad (gen 7)": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 810,
        height: 1080
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPad (gen 7) landscape": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 1080,
        height: 810
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPad (gen 11)": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/19E241 Safari/604.1",
      viewport: {
        width: 656,
        height: 944
      },
      deviceScaleFactor: 2.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPad (gen 11) landscape": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/19E241 Safari/604.1",
      viewport: {
        width: 944,
        height: 656
      },
      deviceScaleFactor: 2.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPad Mini": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 768,
        height: 1024
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPad Mini landscape": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 1024,
        height: 768
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPad Pro 11": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 834,
        height: 1194
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPad Pro 11 landscape": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 1194,
        height: 834
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 6": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 375,
        height: 667
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 6 landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 667,
        height: 375
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 6 Plus": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 414,
        height: 736
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 6 Plus landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 736,
        height: 414
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 7": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 375,
        height: 667
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 7 landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 667,
        height: 375
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 7 Plus": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 414,
        height: 736
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 7 Plus landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 736,
        height: 414
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 8": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 375,
        height: 667
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 8 landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 667,
        height: 375
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 8 Plus": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 414,
        height: 736
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 8 Plus landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 736,
        height: 414
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone SE": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/26.5 Mobile/14E304 Safari/602.1",
      viewport: {
        width: 320,
        height: 568
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone SE landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/26.5 Mobile/14E304 Safari/602.1",
      viewport: {
        width: 568,
        height: 320
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone SE (3rd gen)": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/26.5 Mobile/19E241 Safari/602.1",
      viewport: {
        width: 375,
        height: 667
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone SE (3rd gen) landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/26.5 Mobile/19E241 Safari/602.1",
      viewport: {
        width: 667,
        height: 375
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone X": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 375,
        height: 812
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone X landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/26.5 Mobile/15A372 Safari/604.1",
      viewport: {
        width: 812,
        height: 375
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone XR": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 414,
        height: 896
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone XR landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      viewport: {
        width: 896,
        height: 414
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 11": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 414,
        height: 896
      },
      viewport: {
        width: 414,
        height: 715
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 11 landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 414,
        height: 896
      },
      viewport: {
        width: 800,
        height: 364
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 11 Pro": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 375,
        height: 812
      },
      viewport: {
        width: 375,
        height: 635
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 11 Pro landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 375,
        height: 812
      },
      viewport: {
        width: 724,
        height: 325
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 11 Pro Max": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 414,
        height: 896
      },
      viewport: {
        width: 414,
        height: 715
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 11 Pro Max landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 414,
        height: 896
      },
      viewport: {
        width: 808,
        height: 364
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 12": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 390,
        height: 664
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 12 landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 750,
        height: 340
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 12 Pro": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 390,
        height: 664
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 12 Pro landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 750,
        height: 340
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 12 Pro Max": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 428,
        height: 926
      },
      viewport: {
        width: 428,
        height: 746
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 12 Pro Max landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 428,
        height: 926
      },
      viewport: {
        width: 832,
        height: 378
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 12 Mini": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 375,
        height: 812
      },
      viewport: {
        width: 375,
        height: 629
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 12 Mini landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 375,
        height: 812
      },
      viewport: {
        width: 712,
        height: 325
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 13": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 390,
        height: 664
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 13 landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 750,
        height: 342
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 13 Pro": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 390,
        height: 664
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 13 Pro landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 750,
        height: 342
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 13 Pro Max": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 428,
        height: 926
      },
      viewport: {
        width: 428,
        height: 746
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 13 Pro Max landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 428,
        height: 926
      },
      viewport: {
        width: 832,
        height: 380
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 13 Mini": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 375,
        height: 812
      },
      viewport: {
        width: 375,
        height: 629
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 13 Mini landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 375,
        height: 812
      },
      viewport: {
        width: 712,
        height: 327
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 14": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 390,
        height: 664
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 14 landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 750,
        height: 340
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 14 Plus": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 428,
        height: 926
      },
      viewport: {
        width: 428,
        height: 746
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 14 Plus landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 428,
        height: 926
      },
      viewport: {
        width: 832,
        height: 378
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 14 Pro": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 393,
        height: 852
      },
      viewport: {
        width: 393,
        height: 660
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 14 Pro landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 393,
        height: 852
      },
      viewport: {
        width: 734,
        height: 343
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 14 Pro Max": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 430,
        height: 932
      },
      viewport: {
        width: 430,
        height: 740
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 14 Pro Max landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 430,
        height: 932
      },
      viewport: {
        width: 814,
        height: 380
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 15": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 393,
        height: 852
      },
      viewport: {
        width: 393,
        height: 659
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 15 landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 393,
        height: 852
      },
      viewport: {
        width: 734,
        height: 343
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 15 Plus": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 430,
        height: 932
      },
      viewport: {
        width: 430,
        height: 739
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 15 Plus landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 430,
        height: 932
      },
      viewport: {
        width: 814,
        height: 380
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 15 Pro": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 393,
        height: 852
      },
      viewport: {
        width: 393,
        height: 659
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 15 Pro landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 393,
        height: 852
      },
      viewport: {
        width: 734,
        height: 343
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 15 Pro Max": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 430,
        height: 932
      },
      viewport: {
        width: 430,
        height: 739
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 15 Pro Max landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 430,
        height: 932
      },
      viewport: {
        width: 814,
        height: 380
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 16": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 393,
        height: 852
      },
      viewport: {
        width: 393,
        height: 659
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 16 landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 393,
        height: 852
      },
      viewport: {
        width: 734,
        height: 343
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 16 Plus": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 430,
        height: 932
      },
      viewport: {
        width: 430,
        height: 739
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 16 Plus landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 430,
        height: 932
      },
      viewport: {
        width: 814,
        height: 380
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 16 Pro": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 402,
        height: 874
      },
      viewport: {
        width: 402,
        height: 681
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 16 Pro landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 402,
        height: 874
      },
      viewport: {
        width: 756,
        height: 352
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 16 Pro Max": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 440,
        height: 956
      },
      viewport: {
        width: 440,
        height: 763
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 16 Pro Max landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 440,
        height: 956
      },
      viewport: {
        width: 838,
        height: 390
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 16e": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 390,
        height: 651
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 16e landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 726,
        height: 340
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 17": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 402,
        height: 874
      },
      viewport: {
        width: 402,
        height: 681
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 17 landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 402,
        height: 874
      },
      viewport: {
        width: 756,
        height: 352
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone Air": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 420,
        height: 912
      },
      viewport: {
        width: 420,
        height: 719
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone Air landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 420,
        height: 912
      },
      viewport: {
        width: 794,
        height: 370
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 17 Pro": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 402,
        height: 874
      },
      viewport: {
        width: 402,
        height: 681
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 17 Pro landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 402,
        height: 874
      },
      viewport: {
        width: 756,
        height: 352
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 17 Pro Max": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 440,
        height: 956
      },
      viewport: {
        width: 440,
        height: 763
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 17 Pro Max landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 440,
        height: 956
      },
      viewport: {
        width: 838,
        height: 390
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 17e": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 390,
        height: 651
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "iPhone 17e landscape": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      screen: {
        width: 390,
        height: 844
      },
      viewport: {
        width: 726,
        height: 340
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Kindle Fire HDX": {
      userAgent: "Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true",
      viewport: {
        width: 800,
        height: 1280
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Kindle Fire HDX landscape": {
      userAgent: "Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true",
      viewport: {
        width: 1280,
        height: 800
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "LG Optimus L70": {
      userAgent: "Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; LGMS323 Build/KOT49I.MS32310c) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 384,
        height: 640
      },
      deviceScaleFactor: 1.25,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "LG Optimus L70 landscape": {
      userAgent: "Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; LGMS323 Build/KOT49I.MS32310c) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 640,
        height: 384
      },
      deviceScaleFactor: 1.25,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Microsoft Lumia 550": {
      userAgent: "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 550) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36 Edge/14.14263",
      viewport: {
        width: 360,
        height: 640
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Microsoft Lumia 550 landscape": {
      userAgent: "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 550) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36 Edge/14.14263",
      viewport: {
        width: 640,
        height: 360
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Microsoft Lumia 950": {
      userAgent: "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36 Edge/14.14263",
      viewport: {
        width: 360,
        height: 640
      },
      deviceScaleFactor: 4,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Microsoft Lumia 950 landscape": {
      userAgent: "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36 Edge/14.14263",
      viewport: {
        width: 640,
        height: 360
      },
      deviceScaleFactor: 4,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 10": {
      userAgent: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 10 Build/MOB31T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36",
      viewport: {
        width: 800,
        height: 1280
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 10 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 10 Build/MOB31T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36",
      viewport: {
        width: 1280,
        height: 800
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 4": {
      userAgent: "Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 384,
        height: 640
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 4 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 640,
        height: 384
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 5": {
      userAgent: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 360,
        height: 640
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 5 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 640,
        height: 360
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 5X": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 412,
        height: 732
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 5X landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 732,
        height: 412
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 6": {
      userAgent: "Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 412,
        height: 732
      },
      deviceScaleFactor: 3.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 6 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 732,
        height: 412
      },
      deviceScaleFactor: 3.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 6P": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 412,
        height: 732
      },
      deviceScaleFactor: 3.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 6P landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 732,
        height: 412
      },
      deviceScaleFactor: 3.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 7": {
      userAgent: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36",
      viewport: {
        width: 600,
        height: 960
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nexus 7 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36",
      viewport: {
        width: 960,
        height: 600
      },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nokia Lumia 520": {
      userAgent: "Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)",
      viewport: {
        width: 320,
        height: 533
      },
      deviceScaleFactor: 1.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nokia Lumia 520 landscape": {
      userAgent: "Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)",
      viewport: {
        width: 533,
        height: 320
      },
      deviceScaleFactor: 1.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Nokia N9": {
      userAgent: "Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13",
      viewport: {
        width: 480,
        height: 854
      },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Nokia N9 landscape": {
      userAgent: "Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13",
      viewport: {
        width: 854,
        height: 480
      },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "webkit"
    },
    "Pixel 2": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 411,
        height: 731
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 2 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 731,
        height: 411
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 2 XL": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 411,
        height: 823
      },
      deviceScaleFactor: 3.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 2 XL landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 823,
        height: 411
      },
      deviceScaleFactor: 3.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 3": {
      userAgent: "Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181105.017.A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 393,
        height: 786
      },
      deviceScaleFactor: 2.75,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 3 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181105.017.A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 786,
        height: 393
      },
      deviceScaleFactor: 2.75,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 4": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 353,
        height: 745
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 4 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 745,
        height: 353
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 4a (5G)": {
      userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 4a (5G)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 412,
        height: 892
      },
      viewport: {
        width: 412,
        height: 765
      },
      deviceScaleFactor: 2.63,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 4a (5G) landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 4a (5G)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        height: 892,
        width: 412
      },
      viewport: {
        width: 840,
        height: 312
      },
      deviceScaleFactor: 2.63,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 5": {
      userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 393,
        height: 851
      },
      viewport: {
        width: 393,
        height: 727
      },
      deviceScaleFactor: 2.75,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 5 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 851,
        height: 393
      },
      viewport: {
        width: 802,
        height: 293
      },
      deviceScaleFactor: 2.75,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 6": {
      userAgent: "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 412,
        height: 915
      },
      viewport: {
        width: 412,
        height: 839
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 6 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 915,
        height: 412
      },
      viewport: {
        width: 863,
        height: 360
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 6 Pro": {
      userAgent: "Mozilla/5.0 (Linux; Android 12; Pixel 6 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 412,
        height: 892
      },
      viewport: {
        width: 412,
        height: 816
      },
      deviceScaleFactor: 3.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 6 Pro landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 12; Pixel 6 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 892,
        height: 412
      },
      viewport: {
        width: 840,
        height: 360
      },
      deviceScaleFactor: 3.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 6a": {
      userAgent: "Mozilla/5.0 (Linux; Android 12; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 412,
        height: 915
      },
      viewport: {
        width: 412,
        height: 839
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 6a landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 12; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 915,
        height: 412
      },
      viewport: {
        width: 863,
        height: 360
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 7": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 412,
        height: 915
      },
      viewport: {
        width: 412,
        height: 839
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 7 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 915,
        height: 412
      },
      viewport: {
        width: 863,
        height: 360
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 7 Pro": {
      userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 412,
        height: 892
      },
      viewport: {
        width: 412,
        height: 816
      },
      deviceScaleFactor: 3.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 7 Pro landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 892,
        height: 412
      },
      viewport: {
        width: 840,
        height: 360
      },
      deviceScaleFactor: 3.5,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 7a": {
      userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 412,
        height: 915
      },
      viewport: {
        width: 412,
        height: 839
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 7a landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 915,
        height: 412
      },
      viewport: {
        width: 863,
        height: 360
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 8": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 412,
        height: 915
      },
      viewport: {
        width: 412,
        height: 839
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 8 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 915,
        height: 412
      },
      viewport: {
        width: 863,
        height: 360
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 8 Pro": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 448,
        height: 997
      },
      viewport: {
        width: 448,
        height: 921
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 8 Pro landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 997,
        height: 448
      },
      viewport: {
        width: 945,
        height: 396
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 8a": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 412,
        height: 915
      },
      viewport: {
        width: 412,
        height: 839
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 8a landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 915,
        height: 412
      },
      viewport: {
        width: 863,
        height: 360
      },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 9": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 360,
        height: 808
      },
      viewport: {
        width: 360,
        height: 732
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 9 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 808,
        height: 360
      },
      viewport: {
        width: 756,
        height: 308
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 9 Pro": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 427,
        height: 952
      },
      viewport: {
        width: 427,
        height: 876
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 9 Pro landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 952,
        height: 427
      },
      viewport: {
        width: 900,
        height: 375
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 9 Pro XL": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 448,
        height: 997
      },
      viewport: {
        width: 448,
        height: 921
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 9 Pro XL landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 997,
        height: 448
      },
      viewport: {
        width: 945,
        height: 396
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 10": {
      userAgent: "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 360,
        height: 808
      },
      viewport: {
        width: 360,
        height: 732
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 10 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 808,
        height: 360
      },
      viewport: {
        width: 756,
        height: 308
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 10 Pro": {
      userAgent: "Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 427,
        height: 952
      },
      viewport: {
        width: 427,
        height: 876
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 10 Pro landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 952,
        height: 427
      },
      viewport: {
        width: 900,
        height: 375
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 10 Pro XL": {
      userAgent: "Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 448,
        height: 997
      },
      viewport: {
        width: 448,
        height: 921
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Pixel 10 Pro XL landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      screen: {
        width: 997,
        height: 448
      },
      viewport: {
        width: 945,
        height: 396
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Moto G4": {
      userAgent: "Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 360,
        height: 640
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Moto G4 landscape": {
      userAgent: "Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Mobile Safari/537.36",
      viewport: {
        width: 640,
        height: 360
      },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: "chromium"
    },
    "Desktop Chrome HiDPI": {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36",
      screen: {
        width: 1792,
        height: 1120
      },
      viewport: {
        width: 1280,
        height: 720
      },
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: false,
      defaultBrowserType: "chromium"
    },
    "Desktop Edge HiDPI": {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36 Edg/152.0.7977.8",
      screen: {
        width: 1792,
        height: 1120
      },
      viewport: {
        width: 1280,
        height: 720
      },
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: false,
      defaultBrowserType: "chromium"
    },
    "Desktop Firefox HiDPI": {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0",
      screen: {
        width: 1792,
        height: 1120
      },
      viewport: {
        width: 1280,
        height: 720
      },
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: false,
      defaultBrowserType: "firefox"
    },
    "Desktop Safari": {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15",
      screen: {
        width: 1792,
        height: 1120
      },
      viewport: {
        width: 1280,
        height: 720
      },
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: false,
      defaultBrowserType: "webkit"
    },
    "Desktop Chrome": {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36",
      screen: {
        width: 1920,
        height: 1080
      },
      viewport: {
        width: 1280,
        height: 720
      },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      defaultBrowserType: "chromium"
    },
    "Desktop Edge": {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.8 Safari/537.36 Edg/152.0.7977.8",
      screen: {
        width: 1920,
        height: 1080
      },
      viewport: {
        width: 1280,
        height: 720
      },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      defaultBrowserType: "chromium"
    },
    "Desktop Firefox": {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0",
      screen: {
        width: 1920,
        height: 1080
      },
      viewport: {
        width: 1280,
        height: 720
      },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      defaultBrowserType: "firefox"
    }
  };
  var deviceDescriptors = deviceDescriptorsSource_default;
  async function disposeAll(disposables) {
    const copy = [...disposables];
    disposables.length = 0;
    await Promise.all(copy.map((d) => d.dispose()));
  }
  function msToString(ms) {
    if (ms < 0 || !isFinite(ms))
      return "-";
    if (ms === 0)
      return "0ms";
    if (ms < 1e3)
      return ms.toFixed(0) + "ms";
    const seconds = ms / 1e3;
    if (seconds < 60)
      return seconds.toFixed(1) + "s";
    const minutes = seconds / 60;
    if (minutes < 60)
      return minutes.toFixed(1) + "m";
    const hours = minutes / 60;
    if (hours < 24)
      return hours.toFixed(1) + "h";
    const days = hours / 24;
    return days.toFixed(1) + "d";
  }
  function bytesToString(bytes) {
    if (bytes < 0 || !isFinite(bytes))
      return "-";
    if (bytes === 0)
      return "0";
    if (bytes < 1e3)
      return bytes.toFixed(0);
    const kb = bytes / 1024;
    if (kb < 1e3)
      return kb.toFixed(1) + "K";
    const mb = kb / 1024;
    if (mb < 1e3)
      return mb.toFixed(1) + "M";
    const gb = mb / 1024;
    return gb.toFixed(1) + "G";
  }
  function headersObjectToArray(headers, separator, setCookieSeparator) {
    if (!setCookieSeparator)
      setCookieSeparator = separator;
    const result = [];
    for (const name in headers) {
      const values = headers[name];
      if (values === void 0)
        continue;
      if (separator) {
        const sep = name.toLowerCase() === "set-cookie" ? setCookieSeparator : separator;
        for (const value of values.split(sep))
          result.push({ name, value: value.trim() });
      } else {
        result.push({ name, value: values });
      }
    }
    return result;
  }
  function headersArrayToObject(headers, lowerCase) {
    const result = {};
    for (const { name, value } of headers)
      result[lowerCase ? name.toLowerCase() : name] = value;
    return result;
  }
  function padImageToSize(image, size) {
    if (image.width === size.width && image.height === size.height)
      return image;
    const buffer = new Uint8Array(size.width * size.height * 4);
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        const to = (y * size.width + x) * 4;
        if (y < image.height && x < image.width) {
          const from = (y * image.width + x) * 4;
          buffer[to] = image.data[from];
          buffer[to + 1] = image.data[from + 1];
          buffer[to + 2] = image.data[from + 2];
          buffer[to + 3] = image.data[from + 3];
        } else {
          buffer[to] = 0;
          buffer[to + 1] = 0;
          buffer[to + 2] = 0;
          buffer[to + 3] = 0;
        }
      }
    }
    return { data: Buffer.from(buffer), width: size.width, height: size.height };
  }
  function scaleImageToSize(image, size) {
    const { data: src, width: w1, height: h1 } = image;
    const w2 = Math.max(1, Math.floor(size.width));
    const h2 = Math.max(1, Math.floor(size.height));
    if (w1 === w2 && h1 === h2)
      return image;
    if (w1 <= 0 || h1 <= 0)
      throw new Error("Invalid input image");
    if (size.width <= 0 || size.height <= 0 || !isFinite(size.width) || !isFinite(size.height))
      throw new Error("Invalid output dimensions");
    const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
    const weights = (t, o) => {
      const t2 = t * t;
      const t3 = t2 * t;
      o[0] = -0.5 * t + 1 * t2 - 0.5 * t3;
      o[1] = 1 - 2.5 * t2 + 1.5 * t3;
      o[2] = 0.5 * t + 2 * t2 - 1.5 * t3;
      o[3] = -0.5 * t2 + 0.5 * t3;
    };
    const srcRowStride = w1 * 4;
    const dstRowStride = w2 * 4;
    const xOff = new Int32Array(w2 * 4);
    const xW = new Float32Array(w2 * 4);
    const wx = new Float32Array(4);
    const xScale = w1 / w2;
    for (let x = 0; x < w2; x++) {
      const sx = (x + 0.5) * xScale - 0.5;
      const sxi = Math.floor(sx);
      const t = sx - sxi;
      weights(t, wx);
      const b = x * 4;
      const i0 = clamp(sxi - 1, 0, w1 - 1);
      const i1 = clamp(sxi + 0, 0, w1 - 1);
      const i2 = clamp(sxi + 1, 0, w1 - 1);
      const i3 = clamp(sxi + 2, 0, w1 - 1);
      xOff[b + 0] = i0 << 2;
      xOff[b + 1] = i1 << 2;
      xOff[b + 2] = i2 << 2;
      xOff[b + 3] = i3 << 2;
      xW[b + 0] = wx[0];
      xW[b + 1] = wx[1];
      xW[b + 2] = wx[2];
      xW[b + 3] = wx[3];
    }
    const yRow = new Int32Array(h2 * 4);
    const yW = new Float32Array(h2 * 4);
    const wy = new Float32Array(4);
    const yScale = h1 / h2;
    for (let y = 0; y < h2; y++) {
      const sy = (y + 0.5) * yScale - 0.5;
      const syi = Math.floor(sy);
      const t = sy - syi;
      weights(t, wy);
      const b = y * 4;
      const j0 = clamp(syi - 1, 0, h1 - 1);
      const j1 = clamp(syi + 0, 0, h1 - 1);
      const j2 = clamp(syi + 1, 0, h1 - 1);
      const j3 = clamp(syi + 2, 0, h1 - 1);
      yRow[b + 0] = j0 * srcRowStride;
      yRow[b + 1] = j1 * srcRowStride;
      yRow[b + 2] = j2 * srcRowStride;
      yRow[b + 3] = j3 * srcRowStride;
      yW[b + 0] = wy[0];
      yW[b + 1] = wy[1];
      yW[b + 2] = wy[2];
      yW[b + 3] = wy[3];
    }
    const dst = new Uint8Array(w2 * h2 * 4);
    for (let y = 0; y < h2; y++) {
      const yb = y * 4;
      const rb0 = yRow[yb + 0];
      const rb1 = yRow[yb + 1];
      const rb2 = yRow[yb + 2];
      const rb3 = yRow[yb + 3];
      const wy0 = yW[yb + 0];
      const wy1 = yW[yb + 1];
      const wy2 = yW[yb + 2];
      const wy3 = yW[yb + 3];
      const dstBase = y * dstRowStride;
      for (let x = 0; x < w2; x++) {
        const xb = x * 4;
        const xo0 = xOff[xb + 0];
        const xo1 = xOff[xb + 1];
        const xo2 = xOff[xb + 2];
        const xo3 = xOff[xb + 3];
        const wx0 = xW[xb + 0];
        const wx1 = xW[xb + 1];
        const wx2 = xW[xb + 2];
        const wx3 = xW[xb + 3];
        const di = dstBase + (x << 2);
        for (let c = 0; c < 4; c++) {
          const r0 = src[rb0 + xo0 + c] * wx0 + src[rb0 + xo1 + c] * wx1 + src[rb0 + xo2 + c] * wx2 + src[rb0 + xo3 + c] * wx3;
          const r1 = src[rb1 + xo0 + c] * wx0 + src[rb1 + xo1 + c] * wx1 + src[rb1 + xo2 + c] * wx2 + src[rb1 + xo3 + c] * wx3;
          const r2 = src[rb2 + xo0 + c] * wx0 + src[rb2 + xo1 + c] * wx1 + src[rb2 + xo2 + c] * wx2 + src[rb2 + xo3 + c] * wx3;
          const r3 = src[rb3 + xo0 + c] * wx0 + src[rb3 + xo1 + c] * wx1 + src[rb3 + xo2 + c] * wx2 + src[rb3 + xo3 + c] * wx3;
          const v = r0 * wy0 + r1 * wy1 + r2 * wy2 + r3 * wy3;
          dst[di + c] = v < 0 ? 0 : v > 255 ? 255 : v | 0;
        }
      }
    }
    return { data: Buffer.from(dst.buffer), width: w2, height: h2 };
  }
  var regexCache = /* @__PURE__ */ new Map();
  function validate(value, schema, path) {
    const errors = [];
    if (schema.oneOf) {
      let bestErrors;
      for (const variant of schema.oneOf) {
        const variantErrors = validate(value, variant, path);
        if (variantErrors.length === 0)
          return [];
        if (!bestErrors || variantErrors.length < bestErrors.length)
          bestErrors = variantErrors;
      }
      if (bestErrors.length === 1 && bestErrors[0].startsWith(`${path}: expected `))
        return [`${path}: does not match any of the expected types`];
      return bestErrors;
    }
    if (schema.type === "string") {
      if (typeof value !== "string") {
        errors.push(`${path}: expected string, got ${typeof value}`);
        return errors;
      }
      if (schema.pattern && !cachedRegex2(schema.pattern).test(value))
        errors.push(schema.patternError || `${path}: must match pattern "${schema.pattern}"`);
      return errors;
    }
    if (schema.type === "array") {
      if (!Array.isArray(value)) {
        errors.push(`${path}: expected array, got ${typeof value}`);
        return errors;
      }
      if (schema.items) {
        for (let i = 0; i < value.length; i++)
          errors.push(...validate(value[i], schema.items, `${path}[${i}]`));
      }
      return errors;
    }
    if (schema.type === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        errors.push(`${path}: expected object, got ${Array.isArray(value) ? "array" : typeof value}`);
        return errors;
      }
      const obj = value;
      for (const key of schema.required || []) {
        if (obj[key] === void 0)
          errors.push(`${path}.${key}: required`);
      }
      for (const [key, propSchema] of Object.entries(schema.properties || {})) {
        if (obj[key] !== void 0)
          errors.push(...validate(obj[key], propSchema, `${path}.${key}`));
      }
      return errors;
    }
    return errors;
  }
  function cachedRegex2(pattern) {
    let regex = regexCache.get(pattern);
    if (!regex) {
      regex = new RegExp(pattern);
      regexCache.set(pattern, regex);
    }
    return regex;
  }
  var ManualPromise = class extends Promise {
    constructor() {
      let resolve;
      let reject;
      super((f, r) => {
        resolve = f;
        reject = r;
      });
      this._isDone = false;
      this._resolve = resolve;
      this._reject = reject;
    }
    isDone() {
      return this._isDone;
    }
    resolve(t) {
      this._isDone = true;
      this._resolve(t);
    }
    reject(e) {
      this._isDone = true;
      this._reject(e);
    }
    static get [Symbol.species]() {
      return Promise;
    }
    get [Symbol.toStringTag]() {
      return "ManualPromise";
    }
  };
  var LongStandingScope = class {
    constructor() {
      this._terminatePromises = /* @__PURE__ */ new Map();
      this._isClosed = false;
    }
    reject(error) {
      this._isClosed = true;
      this._terminateError = error;
      for (const p of this._terminatePromises.keys())
        p.resolve(error);
    }
    close(error) {
      this._isClosed = true;
      this._closeError = error;
      for (const [p, frames] of this._terminatePromises)
        p.resolve(cloneError(error, frames));
    }
    isClosed() {
      return this._isClosed;
    }
    static async raceMultiple(scopes, promise) {
      return Promise.race(scopes.map((s) => s.race(promise)));
    }
    async race(promise) {
      return this._race(Array.isArray(promise) ? promise : [promise], false);
    }
    async safeRace(promise, defaultValue) {
      return this._race([promise], true, defaultValue);
    }
    async _race(promises, safe, defaultValue) {
      const terminatePromise = new ManualPromise();
      const frames = (new Error().stack || "").split("\n");
      if (this._terminateError)
        terminatePromise.resolve(this._terminateError);
      if (this._closeError)
        terminatePromise.resolve(cloneError(this._closeError, frames));
      this._terminatePromises.set(terminatePromise, frames);
      try {
        return await Promise.race([
          terminatePromise.then((e) => safe ? defaultValue : Promise.reject(e)),
          ...promises
        ]);
      } finally {
        this._terminatePromises.delete(terminatePromise);
      }
    }
  };
  function signalToPromise(signal) {
    if (signal.aborted)
      return { promise: Promise.resolve(), dispose: () => {
      } };
    let dispose;
    const promise = new Promise((resolve) => {
      const onAbort = () => resolve();
      signal.addEventListener("abort", onAbort, { once: true });
      dispose = () => signal.removeEventListener("abort", onAbort);
    });
    return { promise, dispose };
  }
  function cloneError(error, frames) {
    const clone = new Error();
    clone.name = error.name;
    clone.message = error.message;
    clone.stack = [error.name + ":" + error.message, ...frames].join("\n");
    return clone;
  }
  function isJsonMimeType(mimeType) {
    return !!mimeType.match(/^(application\/json|application\/.*?\+json|text\/(x-)?json)(;\s*charset=.*)?$/);
  }
  function isXmlMimeType(mimeType) {
    return !!mimeType.match(/^(application\/xml|application\/.*?\+xml|text\/xml)(;\s*charset=.*)?$/);
  }
  function isTextualMimeType(mimeType) {
    return !!mimeType.match(/^(text\/.*?|application\/(json|(x-)?javascript|xml.*?|ecmascript|graphql|x-www-form-urlencoded)|image\/svg(\+xml)?|application\/.*?(\+json|\+xml))(;\s*charset=.*)?$/);
  }
  function getMimeTypeForPath(path) {
    const dotIndex = path.lastIndexOf(".");
    if (dotIndex === -1)
      return null;
    const extension = path.substring(dotIndex + 1);
    return types.get(extension) || null;
  }
  function getExtensionForMimeType(contentType) {
    const subtype = (contentType ?? "").split(";")[0].split("/")[1]?.trim().toLowerCase() ?? "";
    if (!subtype)
      return "bin";
    const tail = subtype.includes("+") ? subtype.split("+").pop() : subtype;
    if (tail === "plain")
      return "txt";
    if (tail === "javascript" || tail === "ecmascript")
      return "js";
    if (tail === "jpeg")
      return "jpg";
    return tail.replace(/[^a-z0-9]/g, "") || "bin";
  }
  var types = /* @__PURE__ */ new Map([
    ["ez", "application/andrew-inset"],
    ["aw", "application/applixware"],
    ["atom", "application/atom+xml"],
    ["atomcat", "application/atomcat+xml"],
    ["atomdeleted", "application/atomdeleted+xml"],
    ["atomsvc", "application/atomsvc+xml"],
    ["dwd", "application/atsc-dwd+xml"],
    ["held", "application/atsc-held+xml"],
    ["rsat", "application/atsc-rsat+xml"],
    ["bdoc", "application/bdoc"],
    ["xcs", "application/calendar+xml"],
    ["ccxml", "application/ccxml+xml"],
    ["cdfx", "application/cdfx+xml"],
    ["cdmia", "application/cdmi-capability"],
    ["cdmic", "application/cdmi-container"],
    ["cdmid", "application/cdmi-domain"],
    ["cdmio", "application/cdmi-object"],
    ["cdmiq", "application/cdmi-queue"],
    ["cu", "application/cu-seeme"],
    ["mpd", "application/dash+xml"],
    ["davmount", "application/davmount+xml"],
    ["dbk", "application/docbook+xml"],
    ["dssc", "application/dssc+der"],
    ["xdssc", "application/dssc+xml"],
    ["ecma", "application/ecmascript"],
    ["es", "application/ecmascript"],
    ["emma", "application/emma+xml"],
    ["emotionml", "application/emotionml+xml"],
    ["epub", "application/epub+zip"],
    ["exi", "application/exi"],
    ["exp", "application/express"],
    ["fdt", "application/fdt+xml"],
    ["pfr", "application/font-tdpfr"],
    ["geojson", "application/geo+json"],
    ["gml", "application/gml+xml"],
    ["gpx", "application/gpx+xml"],
    ["gxf", "application/gxf"],
    ["gz", "application/gzip"],
    ["hjson", "application/hjson"],
    ["stk", "application/hyperstudio"],
    ["ink", "application/inkml+xml"],
    ["inkml", "application/inkml+xml"],
    ["ipfix", "application/ipfix"],
    ["its", "application/its+xml"],
    ["ear", "application/java-archive"],
    ["jar", "application/java-archive"],
    ["war", "application/java-archive"],
    ["ser", "application/java-serialized-object"],
    ["class", "application/java-vm"],
    ["js", "application/javascript"],
    ["mjs", "application/javascript"],
    ["json", "application/json"],
    ["map", "application/json"],
    ["json5", "application/json5"],
    ["jsonml", "application/jsonml+json"],
    ["jsonld", "application/ld+json"],
    ["lgr", "application/lgr+xml"],
    ["lostxml", "application/lost+xml"],
    ["hqx", "application/mac-binhex40"],
    ["cpt", "application/mac-compactpro"],
    ["mads", "application/mads+xml"],
    ["webmanifest", "application/manifest+json"],
    ["mrc", "application/marc"],
    ["mrcx", "application/marcxml+xml"],
    ["ma", "application/mathematica"],
    ["mb", "application/mathematica"],
    ["nb", "application/mathematica"],
    ["mathml", "application/mathml+xml"],
    ["mbox", "application/mbox"],
    ["mscml", "application/mediaservercontrol+xml"],
    ["metalink", "application/metalink+xml"],
    ["meta4", "application/metalink4+xml"],
    ["mets", "application/mets+xml"],
    ["maei", "application/mmt-aei+xml"],
    ["musd", "application/mmt-usd+xml"],
    ["mods", "application/mods+xml"],
    ["m21", "application/mp21"],
    ["mp21", "application/mp21"],
    ["m4p", "application/mp4"],
    ["mp4s", "application/mp4"],
    ["doc", "application/msword"],
    ["dot", "application/msword"],
    ["mxf", "application/mxf"],
    ["nq", "application/n-quads"],
    ["nt", "application/n-triples"],
    ["cjs", "application/node"],
    ["bin", "application/octet-stream"],
    ["bpk", "application/octet-stream"],
    ["buffer", "application/octet-stream"],
    ["deb", "application/octet-stream"],
    ["deploy", "application/octet-stream"],
    ["dist", "application/octet-stream"],
    ["distz", "application/octet-stream"],
    ["dll", "application/octet-stream"],
    ["dmg", "application/octet-stream"],
    ["dms", "application/octet-stream"],
    ["dump", "application/octet-stream"],
    ["elc", "application/octet-stream"],
    ["exe", "application/octet-stream"],
    ["img", "application/octet-stream"],
    ["iso", "application/octet-stream"],
    ["lrf", "application/octet-stream"],
    ["mar", "application/octet-stream"],
    ["msi", "application/octet-stream"],
    ["msm", "application/octet-stream"],
    ["msp", "application/octet-stream"],
    ["pkg", "application/octet-stream"],
    ["so", "application/octet-stream"],
    ["oda", "application/oda"],
    ["opf", "application/oebps-package+xml"],
    ["ogx", "application/ogg"],
    ["omdoc", "application/omdoc+xml"],
    ["onepkg", "application/onenote"],
    ["onetmp", "application/onenote"],
    ["onetoc", "application/onenote"],
    ["onetoc2", "application/onenote"],
    ["oxps", "application/oxps"],
    ["relo", "application/p2p-overlay+xml"],
    ["xer", "application/patch-ops-error+xml"],
    ["pdf", "application/pdf"],
    ["pgp", "application/pgp-encrypted"],
    ["asc", "application/pgp-signature"],
    ["sig", "application/pgp-signature"],
    ["prf", "application/pics-rules"],
    ["p10", "application/pkcs10"],
    ["p7c", "application/pkcs7-mime"],
    ["p7m", "application/pkcs7-mime"],
    ["p7s", "application/pkcs7-signature"],
    ["p8", "application/pkcs8"],
    ["ac", "application/pkix-attr-cert"],
    ["cer", "application/pkix-cert"],
    ["crl", "application/pkix-crl"],
    ["pkipath", "application/pkix-pkipath"],
    ["pki", "application/pkixcmp"],
    ["pls", "application/pls+xml"],
    ["ai", "application/postscript"],
    ["eps", "application/postscript"],
    ["ps", "application/postscript"],
    ["provx", "application/provenance+xml"],
    ["pskcxml", "application/pskc+xml"],
    ["raml", "application/raml+yaml"],
    ["owl", "application/rdf+xml"],
    ["rdf", "application/rdf+xml"],
    ["rif", "application/reginfo+xml"],
    ["rnc", "application/relax-ng-compact-syntax"],
    ["rl", "application/resource-lists+xml"],
    ["rld", "application/resource-lists-diff+xml"],
    ["rs", "application/rls-services+xml"],
    ["rapd", "application/route-apd+xml"],
    ["sls", "application/route-s-tsid+xml"],
    ["rusd", "application/route-usd+xml"],
    ["gbr", "application/rpki-ghostbusters"],
    ["mft", "application/rpki-manifest"],
    ["roa", "application/rpki-roa"],
    ["rsd", "application/rsd+xml"],
    ["rss", "application/rss+xml"],
    ["rtf", "application/rtf"],
    ["sbml", "application/sbml+xml"],
    ["scq", "application/scvp-cv-request"],
    ["scs", "application/scvp-cv-response"],
    ["spq", "application/scvp-vp-request"],
    ["spp", "application/scvp-vp-response"],
    ["sdp", "application/sdp"],
    ["senmlx", "application/senml+xml"],
    ["sensmlx", "application/sensml+xml"],
    ["setpay", "application/set-payment-initiation"],
    ["setreg", "application/set-registration-initiation"],
    ["shf", "application/shf+xml"],
    ["sieve", "application/sieve"],
    ["siv", "application/sieve"],
    ["smi", "application/smil+xml"],
    ["smil", "application/smil+xml"],
    ["rq", "application/sparql-query"],
    ["srx", "application/sparql-results+xml"],
    ["gram", "application/srgs"],
    ["grxml", "application/srgs+xml"],
    ["sru", "application/sru+xml"],
    ["ssdl", "application/ssdl+xml"],
    ["ssml", "application/ssml+xml"],
    ["swidtag", "application/swid+xml"],
    ["tei", "application/tei+xml"],
    ["teicorpus", "application/tei+xml"],
    ["tfi", "application/thraud+xml"],
    ["tsd", "application/timestamped-data"],
    ["toml", "application/toml"],
    ["trig", "application/trig"],
    ["ttml", "application/ttml+xml"],
    ["ubj", "application/ubjson"],
    ["rsheet", "application/urc-ressheet+xml"],
    ["td", "application/urc-targetdesc+xml"],
    ["vxml", "application/voicexml+xml"],
    ["wasm", "application/wasm"],
    ["wgt", "application/widget"],
    ["hlp", "application/winhlp"],
    ["wsdl", "application/wsdl+xml"],
    ["wspolicy", "application/wspolicy+xml"],
    ["xaml", "application/xaml+xml"],
    ["xav", "application/xcap-att+xml"],
    ["xca", "application/xcap-caps+xml"],
    ["xdf", "application/xcap-diff+xml"],
    ["xel", "application/xcap-el+xml"],
    ["xns", "application/xcap-ns+xml"],
    ["xenc", "application/xenc+xml"],
    ["xht", "application/xhtml+xml"],
    ["xhtml", "application/xhtml+xml"],
    ["xlf", "application/xliff+xml"],
    ["rng", "application/xml"],
    ["xml", "application/xml"],
    ["xsd", "application/xml"],
    ["xsl", "application/xml"],
    ["dtd", "application/xml-dtd"],
    ["xop", "application/xop+xml"],
    ["xpl", "application/xproc+xml"],
    ["*xsl", "application/xslt+xml"],
    ["xslt", "application/xslt+xml"],
    ["xspf", "application/xspf+xml"],
    ["mxml", "application/xv+xml"],
    ["xhvml", "application/xv+xml"],
    ["xvm", "application/xv+xml"],
    ["xvml", "application/xv+xml"],
    ["yang", "application/yang"],
    ["yin", "application/yin+xml"],
    ["zip", "application/zip"],
    ["*3gpp", "audio/3gpp"],
    ["adp", "audio/adpcm"],
    ["amr", "audio/amr"],
    ["au", "audio/basic"],
    ["snd", "audio/basic"],
    ["kar", "audio/midi"],
    ["mid", "audio/midi"],
    ["midi", "audio/midi"],
    ["rmi", "audio/midi"],
    ["mxmf", "audio/mobile-xmf"],
    ["*mp3", "audio/mp3"],
    ["m4a", "audio/mp4"],
    ["mp4a", "audio/mp4"],
    ["m2a", "audio/mpeg"],
    ["m3a", "audio/mpeg"],
    ["mp2", "audio/mpeg"],
    ["mp2a", "audio/mpeg"],
    ["mp3", "audio/mpeg"],
    ["mpga", "audio/mpeg"],
    ["oga", "audio/ogg"],
    ["ogg", "audio/ogg"],
    ["opus", "audio/ogg"],
    ["spx", "audio/ogg"],
    ["s3m", "audio/s3m"],
    ["sil", "audio/silk"],
    ["wav", "audio/wav"],
    ["*wav", "audio/wave"],
    ["weba", "audio/webm"],
    ["xm", "audio/xm"],
    ["ttc", "font/collection"],
    ["otf", "font/otf"],
    ["ttf", "font/ttf"],
    ["woff", "font/woff"],
    ["woff2", "font/woff2"],
    ["exr", "image/aces"],
    ["apng", "image/apng"],
    ["avif", "image/avif"],
    ["bmp", "image/bmp"],
    ["cgm", "image/cgm"],
    ["drle", "image/dicom-rle"],
    ["emf", "image/emf"],
    ["fits", "image/fits"],
    ["g3", "image/g3fax"],
    ["gif", "image/gif"],
    ["heic", "image/heic"],
    ["heics", "image/heic-sequence"],
    ["heif", "image/heif"],
    ["heifs", "image/heif-sequence"],
    ["hej2", "image/hej2k"],
    ["hsj2", "image/hsj2"],
    ["ief", "image/ief"],
    ["jls", "image/jls"],
    ["jp2", "image/jp2"],
    ["jpg2", "image/jp2"],
    ["jpe", "image/jpeg"],
    ["jpeg", "image/jpeg"],
    ["jpg", "image/jpeg"],
    ["jph", "image/jph"],
    ["jhc", "image/jphc"],
    ["jpm", "image/jpm"],
    ["jpf", "image/jpx"],
    ["jpx", "image/jpx"],
    ["jxr", "image/jxr"],
    ["jxra", "image/jxra"],
    ["jxrs", "image/jxrs"],
    ["jxs", "image/jxs"],
    ["jxsc", "image/jxsc"],
    ["jxsi", "image/jxsi"],
    ["jxss", "image/jxss"],
    ["ktx", "image/ktx"],
    ["ktx2", "image/ktx2"],
    ["png", "image/png"],
    ["sgi", "image/sgi"],
    ["svg", "image/svg+xml"],
    ["svgz", "image/svg+xml"],
    ["t38", "image/t38"],
    ["tif", "image/tiff"],
    ["tiff", "image/tiff"],
    ["tfx", "image/tiff-fx"],
    ["webp", "image/webp"],
    ["wmf", "image/wmf"],
    ["disposition-notification", "message/disposition-notification"],
    ["u8msg", "message/global"],
    ["u8dsn", "message/global-delivery-status"],
    ["u8mdn", "message/global-disposition-notification"],
    ["u8hdr", "message/global-headers"],
    ["eml", "message/rfc822"],
    ["mime", "message/rfc822"],
    ["3mf", "model/3mf"],
    ["gltf", "model/gltf+json"],
    ["glb", "model/gltf-binary"],
    ["iges", "model/iges"],
    ["igs", "model/iges"],
    ["mesh", "model/mesh"],
    ["msh", "model/mesh"],
    ["silo", "model/mesh"],
    ["mtl", "model/mtl"],
    ["obj", "model/obj"],
    ["stpx", "model/step+xml"],
    ["stpz", "model/step+zip"],
    ["stpxz", "model/step-xml+zip"],
    ["stl", "model/stl"],
    ["vrml", "model/vrml"],
    ["wrl", "model/vrml"],
    ["*x3db", "model/x3d+binary"],
    ["x3dbz", "model/x3d+binary"],
    ["x3db", "model/x3d+fastinfoset"],
    ["*x3dv", "model/x3d+vrml"],
    ["x3dvz", "model/x3d+vrml"],
    ["x3d", "model/x3d+xml"],
    ["x3dz", "model/x3d+xml"],
    ["x3dv", "model/x3d-vrml"],
    ["appcache", "text/cache-manifest"],
    ["manifest", "text/cache-manifest"],
    ["ics", "text/calendar"],
    ["ifb", "text/calendar"],
    ["coffee", "text/coffeescript"],
    ["litcoffee", "text/coffeescript"],
    ["css", "text/css"],
    ["csv", "text/csv"],
    ["htm", "text/html"],
    ["html", "text/html"],
    ["shtml", "text/html"],
    ["jade", "text/jade"],
    ["jsx", "text/jsx"],
    ["less", "text/less"],
    ["markdown", "text/markdown"],
    ["md", "text/markdown"],
    ["mml", "text/mathml"],
    ["mdx", "text/mdx"],
    ["n3", "text/n3"],
    ["conf", "text/plain"],
    ["def", "text/plain"],
    ["in", "text/plain"],
    ["ini", "text/plain"],
    ["list", "text/plain"],
    ["log", "text/plain"],
    ["text", "text/plain"],
    ["txt", "text/plain"],
    ["rtx", "text/richtext"],
    ["*rtf", "text/rtf"],
    ["sgm", "text/sgml"],
    ["sgml", "text/sgml"],
    ["shex", "text/shex"],
    ["slim", "text/slim"],
    ["slm", "text/slim"],
    ["spdx", "text/spdx"],
    ["styl", "text/stylus"],
    ["stylus", "text/stylus"],
    ["tsv", "text/tab-separated-values"],
    ["man", "text/troff"],
    ["me", "text/troff"],
    ["ms", "text/troff"],
    ["roff", "text/troff"],
    ["t", "text/troff"],
    ["tr", "text/troff"],
    ["ttl", "text/turtle"],
    ["uri", "text/uri-list"],
    ["uris", "text/uri-list"],
    ["urls", "text/uri-list"],
    ["vcard", "text/vcard"],
    ["vtt", "text/vtt"],
    ["*xml", "text/xml"],
    ["yaml", "text/yaml"],
    ["yml", "text/yaml"],
    ["3gp", "video/3gpp"],
    ["3gpp", "video/3gpp"],
    ["3g2", "video/3gpp2"],
    ["h261", "video/h261"],
    ["h263", "video/h263"],
    ["h264", "video/h264"],
    ["m4s", "video/iso.segment"],
    ["jpgv", "video/jpeg"],
    ["jpm", "video/jpm"],
    ["jpgm", "video/jpm"],
    ["mj2", "video/mj2"],
    ["mjp2", "video/mj2"],
    ["ts", "application/typescript"],
    ["mp4", "video/mp4"],
    ["mp4v", "video/mp4"],
    ["mpg4", "video/mp4"],
    ["m1v", "video/mpeg"],
    ["m2v", "video/mpeg"],
    ["mpe", "video/mpeg"],
    ["mpeg", "video/mpeg"],
    ["mpg", "video/mpeg"],
    ["ogv", "video/ogg"],
    ["mov", "video/quicktime"],
    ["qt", "video/quicktime"],
    ["webm", "video/webm"]
  ]);
  var MultiMap = class {
    constructor() {
      this._map = /* @__PURE__ */ new Map();
    }
    set(key, value) {
      let values = this._map.get(key);
      if (!values) {
        values = [];
        this._map.set(key, values);
      }
      values.push(value);
    }
    get(key) {
      return this._map.get(key) || [];
    }
    has(key) {
      return this._map.has(key);
    }
    delete(key, value) {
      const values = this._map.get(key);
      if (!values)
        return;
      if (values.includes(value))
        this._map.set(key, values.filter((v) => value !== v));
    }
    deleteAll(key) {
      this._map.delete(key);
    }
    hasValue(key, value) {
      const values = this._map.get(key);
      if (!values)
        return false;
      return values.includes(value);
    }
    get size() {
      return this._map.size;
    }
    [Symbol.iterator]() {
      return this._map[Symbol.iterator]();
    }
    keys() {
      return this._map.keys();
    }
    values() {
      const result = [];
      for (const key of this.keys())
        result.push(...this.get(key));
      return result;
    }
    clear() {
      this._map.clear();
    }
  };
  var methodMetainfo = /* @__PURE__ */ new Map([
    ["Android.devices", { internal: true }],
    ["AndroidSocket.write", { internal: true }],
    ["AndroidSocket.close", { internal: true }],
    ["AndroidDevice.wait", { title: "Wait" }],
    ["AndroidDevice.fill", { title: 'Fill "{text}"' }],
    ["AndroidDevice.tap", { title: "Tap" }],
    ["AndroidDevice.drag", { title: "Drag" }],
    ["AndroidDevice.fling", { title: "Fling" }],
    ["AndroidDevice.longTap", { title: "Long tap" }],
    ["AndroidDevice.pinchClose", { title: "Pinch close" }],
    ["AndroidDevice.pinchOpen", { title: "Pinch open" }],
    ["AndroidDevice.scroll", { title: "Scroll" }],
    ["AndroidDevice.swipe", { title: "Swipe" }],
    ["AndroidDevice.info", { internal: true }],
    ["AndroidDevice.screenshot", { title: "Screenshot" }],
    ["AndroidDevice.inputType", { title: "Type" }],
    ["AndroidDevice.inputPress", { title: "Press" }],
    ["AndroidDevice.inputTap", { title: "Tap" }],
    ["AndroidDevice.inputSwipe", { title: "Swipe" }],
    ["AndroidDevice.inputDrag", { title: "Drag" }],
    ["AndroidDevice.launchBrowser", { title: "Launch browser" }],
    ["AndroidDevice.open", { title: "Open app" }],
    ["AndroidDevice.shell", { title: "Execute shell command", group: "configuration" }],
    ["AndroidDevice.installApk", { title: "Install apk" }],
    ["AndroidDevice.push", { title: "Push" }],
    ["AndroidDevice.connectToWebView", { title: "Connect to Web View" }],
    ["AndroidDevice.close", { internal: true }],
    ["APIRequestContext.fetch", { title: '{method} "{url}"' }],
    ["APIRequestContext.fetchResponseBody", { title: "Get response body", group: "getter" }],
    ["APIRequestContext.fetchLog", { internal: true }],
    ["APIRequestContext.storageState", { title: "Get storage state", group: "configuration" }],
    ["APIRequestContext.disposeAPIResponse", { internal: true }],
    ["APIRequestContext.dispose", { internal: true }],
    ["Artifact.pathAfterFinished", { internal: true }],
    ["Artifact.saveAs", { internal: true }],
    ["Artifact.saveAsStream", { internal: true }],
    ["Artifact.failure", { internal: true }],
    ["Artifact.stream", { internal: true }],
    ["Artifact.cancel", { internal: true }],
    ["Artifact.delete", { internal: true }],
    ["Stream.read", { internal: true }],
    ["Stream.close", { internal: true }],
    ["WritableStream.write", { internal: true }],
    ["WritableStream.close", { internal: true }],
    ["Browser.startServer", { title: "Start server" }],
    ["Browser.stopServer", { title: "Stop server" }],
    ["Browser.close", { title: "Close browser", pause: true }],
    ["Browser.killForTests", { internal: true }],
    ["Browser.defaultUserAgentForTest", { internal: true }],
    ["Browser.newContext", { title: "Create context" }],
    ["Browser.newContextForReuse", { internal: true }],
    ["Browser.disconnectFromReusedContext", { internal: true }],
    ["Browser.newBrowserCDPSession", { title: "Create CDP session", group: "configuration" }],
    ["Browser.startTracing", { title: "Start browser tracing", group: "configuration" }],
    ["Browser.stopTracing", { title: "Stop browser tracing", group: "configuration" }],
    ["BrowserContext.addCookies", { title: "Add cookies", group: "configuration" }],
    ["BrowserContext.addInitScript", { title: "Add init script", group: "configuration" }],
    ["BrowserContext.clearCookies", { title: "Clear cookies", group: "configuration" }],
    ["BrowserContext.clearPermissions", { title: "Clear permissions", group: "configuration" }],
    ["BrowserContext.close", { title: "Close context", pause: true }],
    ["BrowserContext.cookies", { title: "Get cookies", group: "getter" }],
    ["BrowserContext.exposeBinding", { title: "Expose binding", group: "configuration" }],
    ["BrowserContext.grantPermissions", { title: "Grant permissions", group: "configuration" }],
    ["BrowserContext.newPage", { title: "Create page" }],
    ["BrowserContext.registerSelectorEngine", { internal: true }],
    ["BrowserContext.setTestIdAttributeName", { internal: true }],
    ["BrowserContext.setExtraHTTPHeaders", { title: "Set extra HTTP headers", group: "configuration" }],
    ["BrowserContext.setGeolocation", { title: "Set geolocation", group: "configuration" }],
    ["BrowserContext.setHTTPCredentials", { title: "Set HTTP credentials", group: "configuration" }],
    ["BrowserContext.setNetworkInterceptionPatterns", { title: "Route requests", group: "route" }],
    ["BrowserContext.setWebSocketInterceptionPatterns", { title: "Route WebSockets", group: "route" }],
    ["BrowserContext.setOffline", { title: "Set offline mode" }],
    ["BrowserContext.storageState", { title: "Get storage state", group: "configuration" }],
    ["BrowserContext.setStorageState", { title: "Set storage state", group: "configuration" }],
    ["BrowserContext.pause", { title: "Pause" }],
    ["BrowserContext.enableRecorder", { internal: true }],
    ["BrowserContext.disableRecorder", { internal: true }],
    ["BrowserContext.exposeConsoleApi", { internal: true }],
    ["BrowserContext.newCDPSession", { title: "Create CDP session", group: "configuration" }],
    ["BrowserContext.createTempFiles", { internal: true }],
    ["BrowserContext.updateSubscription", { internal: true }],
    ["BrowserContext.clockFastForward", { title: 'Fast forward clock "{ticksNumber|ticksString}"' }],
    ["BrowserContext.clockInstall", { title: 'Install clock "{timeNumber|timeString}"' }],
    ["BrowserContext.clockPauseAt", { title: 'Pause clock "{timeNumber|timeString}"' }],
    ["BrowserContext.clockResume", { title: "Resume clock" }],
    ["BrowserContext.clockRunFor", { title: 'Run clock "{ticksNumber|ticksString}"' }],
    ["BrowserContext.clockSetFixedTime", { title: 'Set fixed time "{timeNumber|timeString}"' }],
    ["BrowserContext.clockSetSystemTime", { title: 'Set system time "{timeNumber|timeString}"' }],
    ["BrowserContext.credentialsInstall", { title: "Install virtual WebAuthn authenticator", group: "configuration" }],
    ["BrowserContext.credentialsCreate", { title: 'Create virtual credential for "{rpId}"', group: "configuration" }],
    ["BrowserContext.credentialsGet", { title: "Get virtual credentials", group: "configuration" }],
    ["BrowserContext.credentialsDelete", { title: "Delete virtual credential", group: "configuration" }],
    ["BrowserType.launch", { title: "Launch browser" }],
    ["BrowserType.launchPersistentContext", { title: "Launch persistent context" }],
    ["BrowserType.connectOverCDP", { title: "Connect over CDP" }],
    ["BrowserType.connectToWorker", { title: "Connect to worker" }],
    ["Disposable.dispose", { internal: true }],
    ["Electron.launch", { title: "Launch electron" }],
    ["ElectronApplication.browserWindow", { internal: true }],
    ["ElectronApplication.evaluateExpression", { title: "Evaluate" }],
    ["ElectronApplication.evaluateExpressionHandle", { title: "Evaluate" }],
    ["ElectronApplication.updateSubscription", { internal: true }],
    ["Frame.evalOnSelector", { title: "Evaluate", snapshot: true, pause: true }],
    ["Frame.evalOnSelectorAll", { title: "Evaluate", snapshot: true, pause: true }],
    ["Frame.addScriptTag", { title: "Add script tag", snapshot: true, pause: true }],
    ["Frame.addStyleTag", { title: "Add style tag", snapshot: true, pause: true }],
    ["Frame.ariaSnapshot", { title: "Aria snapshot", group: "getter" }],
    ["Frame.ariaSnapshotJSON", { title: "Aria snapshot JSON", group: "getter" }],
    ["Frame.blur", { title: "Blur", slowMo: true, snapshot: true, pause: true }],
    ["Frame.check", { title: "Check", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.click", { title: "Click", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.content", { title: "Get content", snapshot: true, pause: true }],
    ["Frame.dragAndDrop", { title: "Drag and drop", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.drop", { title: "Drop files or data onto an element", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.dblclick", { title: "Double click", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.dispatchEvent", { title: 'Dispatch "{type}"', slowMo: true, snapshot: true, pause: true }],
    ["Frame.evaluateExpression", { title: "Evaluate", snapshot: true, pause: true }],
    ["Frame.evaluateExpressionHandle", { title: "Evaluate", snapshot: true, pause: true }],
    ["Frame.fill", { title: 'Fill "{value}"', slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.focus", { title: "Focus", slowMo: true, snapshot: true, pause: true }],
    ["Frame.frameElement", { title: "Get frame element", group: "getter" }],
    ["Frame.resolveSelector", { internal: true }],
    ["Frame.highlight", { internal: true }],
    ["Frame.hideHighlight", { internal: true }],
    ["Frame.getAttribute", { title: 'Get attribute "{name}"', snapshot: true, pause: true, group: "getter" }],
    ["Frame.goto", { title: 'Navigate to "{url}"', slowMo: true, snapshot: true, pause: true }],
    ["Frame.hover", { title: "Hover", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.innerHTML", { title: "Get HTML", snapshot: true, pause: true, group: "getter" }],
    ["Frame.innerText", { title: "Get inner text", snapshot: true, pause: true, group: "getter" }],
    ["Frame.inputValue", { title: "Get input value", snapshot: true, pause: true, group: "getter" }],
    ["Frame.isChecked", { title: "Is checked", snapshot: true, pause: true, group: "getter" }],
    ["Frame.isDisabled", { title: "Is disabled", snapshot: true, pause: true, group: "getter" }],
    ["Frame.isEnabled", { title: "Is enabled", snapshot: true, pause: true, group: "getter" }],
    ["Frame.isHidden", { title: "Is hidden", snapshot: true, pause: true, group: "getter" }],
    ["Frame.isVisible", { title: "Is visible", snapshot: true, pause: true, group: "getter" }],
    ["Frame.isEditable", { title: "Is editable", snapshot: true, pause: true, group: "getter" }],
    ["Frame.press", { title: 'Press "{key}"', slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.querySelector", { title: "Query selector", snapshot: true }],
    ["Frame.querySelectorAll", { title: "Query selector all", snapshot: true }],
    ["Frame.queryCount", { title: "Query count", snapshot: true, pause: true }],
    ["Frame.selectOption", { title: "Select option", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.setContent", { title: "Set content", snapshot: true, pause: true }],
    ["Frame.setInputFiles", { title: "Set input files", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.tap", { title: "Tap", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.textContent", { title: "Get text content", snapshot: true, pause: true, group: "getter" }],
    ["Frame.title", { title: "Get page title", group: "getter" }],
    ["Frame.type", { title: 'Type "{text}"', slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.uncheck", { title: "Uncheck", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["Frame.waitForTimeout", { title: "Wait for timeout", snapshot: true }],
    ["Frame.waitForFunction", { title: "Wait for function", snapshot: true, pause: true }],
    ["Frame.waitForSelector", { title: "Wait for selector", snapshot: true }],
    ["Frame.expect", { title: 'Expect "{expression}"', snapshot: true, pause: true }],
    ["JSHandle.dispose", { internal: true }],
    ["ElementHandle.dispose", { internal: true }],
    ["JSHandle.evaluateExpression", { title: "Evaluate", snapshot: true, pause: true }],
    ["ElementHandle.evaluateExpression", { title: "Evaluate", snapshot: true, pause: true }],
    ["JSHandle.evaluateExpressionHandle", { title: "Evaluate", snapshot: true, pause: true }],
    ["ElementHandle.evaluateExpressionHandle", { title: "Evaluate", snapshot: true, pause: true }],
    ["JSHandle.getPropertyList", { title: "Get property list", group: "getter" }],
    ["ElementHandle.getPropertyList", { title: "Get property list", group: "getter" }],
    ["JSHandle.getProperty", { title: "Get JS property", group: "getter" }],
    ["ElementHandle.getProperty", { title: "Get JS property", group: "getter" }],
    ["JSHandle.jsonValue", { title: "Get JSON value", group: "getter" }],
    ["ElementHandle.jsonValue", { title: "Get JSON value", group: "getter" }],
    ["ElementHandle.evalOnSelector", { title: "Evaluate", snapshot: true, pause: true }],
    ["ElementHandle.evalOnSelectorAll", { title: "Evaluate", snapshot: true, pause: true }],
    ["ElementHandle.boundingBox", { title: "Get bounding box", snapshot: true, pause: true }],
    ["ElementHandle.check", { title: "Check", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["ElementHandle.click", { title: "Click", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["ElementHandle.contentFrame", { title: "Get content frame", group: "getter" }],
    ["ElementHandle.dblclick", { title: "Double click", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["ElementHandle.dispatchEvent", { title: "Dispatch event", slowMo: true, snapshot: true, pause: true }],
    ["ElementHandle.fill", { title: 'Fill "{value}"', slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["ElementHandle.focus", { title: "Focus", slowMo: true, snapshot: true, pause: true }],
    ["ElementHandle.getAttribute", { title: "Get attribute", snapshot: true, pause: true, group: "getter" }],
    ["ElementHandle.hover", { title: "Hover", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["ElementHandle.innerHTML", { title: "Get HTML", snapshot: true, pause: true, group: "getter" }],
    ["ElementHandle.innerText", { title: "Get inner text", snapshot: true, pause: true, group: "getter" }],
    ["ElementHandle.inputValue", { title: "Get input value", snapshot: true, pause: true, group: "getter" }],
    ["ElementHandle.isChecked", { title: "Is checked", snapshot: true, pause: true, group: "getter" }],
    ["ElementHandle.isDisabled", { title: "Is disabled", snapshot: true, pause: true, group: "getter" }],
    ["ElementHandle.isEditable", { title: "Is editable", snapshot: true, pause: true, group: "getter" }],
    ["ElementHandle.isEnabled", { title: "Is enabled", snapshot: true, pause: true, group: "getter" }],
    ["ElementHandle.isHidden", { title: "Is hidden", snapshot: true, pause: true, group: "getter" }],
    ["ElementHandle.isVisible", { title: "Is visible", snapshot: true, pause: true, group: "getter" }],
    ["ElementHandle.ownerFrame", { title: "Get owner frame", group: "getter" }],
    ["ElementHandle.press", { title: 'Press "{key}"', slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["ElementHandle.querySelector", { title: "Query selector", snapshot: true }],
    ["ElementHandle.querySelectorAll", { title: "Query selector all", snapshot: true }],
    ["ElementHandle.screenshot", { title: "Screenshot", snapshot: true, pause: true }],
    ["ElementHandle.scrollIntoViewIfNeeded", { title: "Scroll into view", slowMo: true, snapshot: true, pause: true }],
    ["ElementHandle.selectOption", { title: "Select option", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["ElementHandle.selectText", { title: "Select text", slowMo: true, snapshot: true, pause: true }],
    ["ElementHandle.setInputFiles", { title: "Set input files", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["ElementHandle.tap", { title: "Tap", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["ElementHandle.textContent", { title: "Get text content", snapshot: true, pause: true, group: "getter" }],
    ["ElementHandle.type", { title: "Type", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["ElementHandle.uncheck", { title: "Uncheck", slowMo: true, snapshot: true, pause: true, input: true, isAutoWaiting: true }],
    ["ElementHandle.waitForElementState", { title: "Wait for state", snapshot: true, pause: true }],
    ["ElementHandle.waitForSelector", { title: "Wait for selector", snapshot: true }],
    ["LocalUtils.zip", { internal: true }],
    ["LocalUtils.harOpen", { internal: true }],
    ["LocalUtils.harLookup", { internal: true }],
    ["LocalUtils.harClose", { internal: true }],
    ["LocalUtils.harUnzip", { internal: true }],
    ["LocalUtils.connect", { internal: true }],
    ["LocalUtils.tracingStarted", { internal: true }],
    ["LocalUtils.addStackToTracingNoReply", { internal: true }],
    ["LocalUtils.traceDiscarded", { internal: true }],
    ["LocalUtils.globToRegex", { internal: true }],
    ["Request.response", { internal: true }],
    ["Request.rawRequestHeaders", { internal: true }],
    ["Route.redirectNavigationRequest", { internal: true }],
    ["Route.abort", { title: "Abort request", group: "route" }],
    ["Route.continue", { title: "Continue request", group: "route" }],
    ["Route.fulfill", { title: "Fulfill request", group: "route" }],
    ["WebSocketRoute.connect", { title: "Connect WebSocket to server", group: "route" }],
    ["WebSocketRoute.ensureOpened", { internal: true }],
    ["WebSocketRoute.sendToPage", { title: "Send WebSocket message", group: "route" }],
    ["WebSocketRoute.sendToServer", { title: "Send WebSocket message", group: "route" }],
    ["WebSocketRoute.closePage", { internal: true }],
    ["WebSocketRoute.closeServer", { internal: true }],
    ["Response.body", { title: "Get response body", group: "getter" }],
    ["Response.securityDetails", { internal: true }],
    ["Response.serverAddr", { internal: true }],
    ["Response.rawResponseHeaders", { internal: true }],
    ["Response.httpVersion", { internal: true }],
    ["Response.sizes", { internal: true }],
    ["Page.addInitScript", { title: "Add init script", group: "configuration" }],
    ["Page.close", { title: "Close page", pause: true }],
    ["Page.runBeforeUnload", { title: "Run beforeunload", pause: true }],
    ["Page.clearConsoleMessages", { title: "Clear console messages" }],
    ["Page.consoleMessages", { title: "Get console messages", group: "getter" }],
    ["Page.emulateMedia", { title: "Emulate media", snapshot: true, pause: true }],
    ["Page.exposeBinding", { title: "Expose binding", group: "configuration" }],
    ["Page.goBack", { title: "Go back", slowMo: true, snapshot: true, pause: true }],
    ["Page.goForward", { title: "Go forward", slowMo: true, snapshot: true, pause: true }],
    ["Page.requestGC", { title: "Request garbage collection", group: "configuration" }],
    ["Page.registerLocatorHandler", { title: "Register locator handler" }],
    ["Page.resolveLocatorHandlerNoReply", { internal: true }],
    ["Page.unregisterLocatorHandler", { title: "Unregister locator handler" }],
    ["Page.reload", { title: "Reload", slowMo: true, snapshot: true, pause: true }],
    ["Page.expectScreenshot", { title: "Expect screenshot", snapshot: true, pause: true }],
    ["Page.screenshot", { title: "Screenshot", snapshot: true, pause: true }],
    ["Page.setExtraHTTPHeaders", { title: "Set extra HTTP headers", group: "configuration" }],
    ["Page.setNetworkInterceptionPatterns", { title: "Route requests", group: "route" }],
    ["Page.setWebSocketInterceptionPatterns", { title: "Route WebSockets", group: "route" }],
    ["Page.setViewportSize", { title: "Set viewport size", snapshot: true, pause: true }],
    ["Page.keyboardDown", { title: 'Key down "{key}"', slowMo: true, snapshot: true, pause: true, input: true }],
    ["Page.keyboardUp", { title: 'Key up "{key}"', slowMo: true, snapshot: true, pause: true, input: true }],
    ["Page.keyboardInsertText", { title: 'Insert "{text}"', slowMo: true, snapshot: true, pause: true, input: true }],
    ["Page.keyboardType", { title: 'Type "{text}"', slowMo: true, snapshot: true, pause: true, input: true }],
    ["Page.keyboardPress", { title: 'Press "{key}"', slowMo: true, snapshot: true, pause: true, input: true }],
    ["Page.mouseMove", { title: "Mouse move", slowMo: true, snapshot: true, pause: true, input: true }],
    ["Page.mouseDown", { title: "Mouse down", slowMo: true, snapshot: true, pause: true, input: true }],
    ["Page.mouseUp", { title: "Mouse up", slowMo: true, snapshot: true, pause: true, input: true }],
    ["Page.mouseClick", { title: "Click", slowMo: true, snapshot: true, pause: true, input: true }],
    ["Page.mouseWheel", { title: "Mouse wheel", slowMo: true, snapshot: true, pause: true, input: true }],
    ["Page.touchscreenTap", { title: "Tap", slowMo: true, snapshot: true, pause: true, input: true }],
    ["Page.clearPageErrors", { title: "Clear page errors" }],
    ["Page.pageErrors", { title: "Get page errors", group: "getter" }],
    ["Page.pdf", { title: "PDF" }],
    ["Page.requests", { title: "Get network requests", group: "getter" }],
    ["Page.startJSCoverage", { title: "Start JS coverage", group: "configuration" }],
    ["Page.stopJSCoverage", { title: "Stop JS coverage", group: "configuration" }],
    ["Page.startCSSCoverage", { title: "Start CSS coverage", group: "configuration" }],
    ["Page.stopCSSCoverage", { title: "Stop CSS coverage", group: "configuration" }],
    ["Page.bringToFront", { title: "Bring to front" }],
    ["Page.pickLocator", { title: "Pick locator", group: "configuration" }],
    ["Page.cancelPickLocator", { title: "Cancel pick locator", group: "configuration" }],
    ["Page.hideHighlight", { title: "Hide all element highlights", group: "configuration" }],
    ["Page.screencastShowOverlay", { title: "Show overlay", group: "configuration" }],
    ["Page.screencastRemoveOverlay", { title: "Remove overlay", group: "configuration" }],
    ["Page.screencastChapter", { title: "Show chapter overlay", group: "configuration" }],
    ["Page.screencastSetOverlayVisible", { title: "Set overlay visibility", group: "configuration" }],
    ["Page.screencastShowActions", { title: "Show actions", group: "configuration" }],
    ["Page.screencastHideActions", { title: "Remove actions", group: "configuration" }],
    ["Page.screencastStart", { title: "Start screencast", group: "configuration" }],
    ["Page.screencastFrameAck", { internal: true }],
    ["Page.screencastStop", { title: "Stop screencast", group: "configuration" }],
    ["Page.updateSubscription", { internal: true }],
    ["Page.setDockTile", { internal: true }],
    ["Page.webStorageItems", { title: "Get WebStorage items", group: "getter" }],
    ["Page.webStorageGetItem", { title: "Get WebStorage item", group: "getter" }],
    ["Page.webStorageSetItem", { title: "Set WebStorage item", group: "configuration" }],
    ["Page.webStorageRemoveItem", { title: "Remove WebStorage item", group: "configuration" }],
    ["Page.webStorageClear", { title: "Clear WebStorage", group: "configuration" }],
    ["Root.initialize", { internal: true }],
    ["Playwright.newRequest", { title: "Create request context" }],
    ["DebugController.initialize", { internal: true }],
    ["DebugController.setReportStateChanged", { internal: true }],
    ["DebugController.setRecorderMode", { internal: true }],
    ["DebugController.highlight", { internal: true }],
    ["DebugController.hideHighlight", { internal: true }],
    ["DebugController.resume", { internal: true }],
    ["DebugController.kill", { internal: true }],
    ["SocksSupport.socksConnected", { internal: true }],
    ["SocksSupport.socksFailed", { internal: true }],
    ["SocksSupport.socksData", { internal: true }],
    ["SocksSupport.socksError", { internal: true }],
    ["SocksSupport.socksEnd", { internal: true }],
    ["JsonPipe.send", { internal: true }],
    ["JsonPipe.close", { internal: true }],
    ["CDPSession.send", { title: "Send CDP command", group: "configuration" }],
    ["CDPSession.detach", { title: "Detach CDP session", group: "configuration" }],
    ["BindingCall.reject", { internal: true }],
    ["BindingCall.resolve", { internal: true }],
    ["Debugger.requestPause", { title: "Pause on next call", group: "configuration" }],
    ["Debugger.resume", { title: "Resume", group: "configuration" }],
    ["Debugger.next", { title: "Step to next call", group: "configuration" }],
    ["Debugger.runTo", { title: "Run to location", group: "configuration" }],
    ["Debugger.enable", { internal: true }],
    ["Dialog.accept", { title: "Accept dialog" }],
    ["Dialog.dismiss", { title: "Dismiss dialog" }],
    ["Tracing.tracingStart", { title: "Start tracing", group: "configuration" }],
    ["Tracing.tracingStartChunk", { title: "Start tracing", group: "configuration" }],
    ["Tracing.tracingGroup", { title: 'Trace "{name}"' }],
    ["Tracing.tracingGroupEnd", { title: "Group end" }],
    ["Tracing.tracingStopChunk", { title: "Stop tracing", group: "configuration" }],
    ["Tracing.tracingStop", { title: "Stop tracing", group: "configuration" }],
    ["Tracing.harStart", { internal: true }],
    ["Tracing.harExport", { internal: true }],
    ["Worker.disconnect", { title: "Disconnect from worker" }],
    ["Worker.evaluateExpression", { title: "Evaluate" }],
    ["Worker.evaluateExpressionHandle", { title: "Evaluate" }],
    ["Worker.updateSubscription", { internal: true }]
  ]);
  function getMetainfo(metadata) {
    return methodMetainfo.get(metadata.type + "." + metadata.method);
  }
  function formatProtocolParam(params, alternatives) {
    return _formatProtocolParam(params, alternatives)?.replaceAll("\n", "\\n");
  }
  function _formatProtocolParam(params, alternatives) {
    if (!params)
      return void 0;
    for (const name of alternatives.split("|")) {
      if (name === "url") {
        try {
          const urlObject = new URL(params[name]);
          if (urlObject.protocol === "data:")
            return urlObject.protocol;
          if (["about:", "chrome:", "edge:"].includes(urlObject.protocol))
            return params[name];
          return urlObject.pathname + urlObject.search;
        } catch (error) {
          if (params[name] !== void 0)
            return params[name];
        }
      }
      if (name === "timeNumber" && params[name] !== void 0) {
        return new Date(params[name]).toString();
      }
      const value = deepParam(params, name);
      if (value !== void 0)
        return value;
    }
  }
  function deepParam(params, name) {
    const tokens = name.split(".");
    let current = params;
    for (const token of tokens) {
      if (typeof current !== "object" || current === null)
        return void 0;
      current = current[token];
    }
    if (current === void 0)
      return void 0;
    return String(current);
  }
  function renderTitleForCall(metadata) {
    const titleFormat = metadata.title ?? getMetainfo(metadata)?.title ?? metadata.method;
    return titleFormat.replace(/\{([^}]+)\}/g, (fullMatch, p1) => {
      return formatProtocolParam(metadata.params, p1) ?? fullMatch;
    });
  }
  function getActionGroup(metadata) {
    return getMetainfo(metadata)?.group;
  }
  function isRegExp3(obj) {
    return obj instanceof RegExp || Object.prototype.toString.call(obj) === "[object RegExp]";
  }
  function isRegexString(value) {
    try {
      new RegExp(value);
      return true;
    } catch {
      return false;
    }
  }
  function isObject(obj) {
    return typeof obj === "object" && obj !== null;
  }
  function isError2(obj) {
    return obj instanceof Error || obj && Object.getPrototypeOf(obj)?.name === "Error";
  }
  var Semaphore = class {
    constructor(max) {
      this._acquired = 0;
      this._queue = [];
      this._max = max;
    }
    setMax(max) {
      this._max = max;
    }
    acquire() {
      const lock = new ManualPromise();
      this._queue.push(lock);
      this._flush();
      return lock;
    }
    release() {
      --this._acquired;
      this._flush();
    }
    _flush() {
      while (this._acquired < this._max && this._queue.length) {
        ++this._acquired;
        this._queue.shift().resolve();
      }
    }
  };
  var _timeOrigin = performance.timeOrigin;
  var _timeShift = 0;
  function setTimeOrigin(origin) {
    _timeOrigin = origin;
    _timeShift = performance.timeOrigin - origin;
  }
  function timeOrigin() {
    return _timeOrigin;
  }
  function monotonicTime() {
    return Math.floor((performance.now() + _timeShift) * 1e3) / 1e3;
  }
  var DEFAULT_PLAYWRIGHT_TIMEOUT = 3e4;
  var DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT = 3 * 60 * 1e3;
  async function raceAgainstDeadline(cb, deadline) {
    let timer;
    return await Promise.race([
      cb().then((result) => {
        return { result, timedOut: false };
      }),
      new Promise((resolve) => {
        if (!deadline)
          return;
        timer = setTimeout(() => resolve({ timedOut: true }), deadline - monotonicTime());
      })
    ]).finally(() => {
      clearTimeout(timer);
    });
  }
  async function pollAgainstDeadline(callback, deadline, [...pollIntervals] = [100, 250, 500, 1e3]) {
    const lastPollInterval = pollIntervals.pop() ?? 1e3;
    let lastResult;
    const wrappedCallback = () => Promise.resolve().then(callback);
    while (true) {
      const time = monotonicTime();
      if (deadline && time >= deadline)
        break;
      const received = await raceAgainstDeadline(wrappedCallback, deadline);
      if (received.timedOut)
        break;
      lastResult = received.result.result;
      if (!received.result.continuePolling)
        return { result: lastResult, timedOut: false };
      const interval = pollIntervals.shift() ?? lastPollInterval;
      if (deadline && deadline <= monotonicTime() + interval)
        break;
      await new Promise((x) => setTimeout(x, interval));
    }
    return { timedOut: true, result: lastResult };
  }
  var SnapshotServer = class {
    constructor(snapshotStorage, resourceLoader) {
      this._snapshotIds = /* @__PURE__ */ new Map();
      this._snapshotStorage = snapshotStorage;
      this._resourceLoader = resourceLoader;
    }
    serveSnapshot(pageOrFrameId, searchParams, snapshotUrl) {
      const snapshot = this._snapshot(pageOrFrameId, searchParams);
      if (!snapshot)
        return new Response(null, { status: 404 });
      const renderedSnapshot = snapshot.render();
      this._snapshotIds.set(snapshotUrl, snapshot);
      return new Response(renderedSnapshot.html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    async serveClosestScreenshot(pageOrFrameId, searchParams) {
      const snapshot = this._snapshot(pageOrFrameId, searchParams);
      const file = snapshot?.closestScreenshot();
      if (!file)
        return new Response(null, { status: 404 });
      return new Response(await this._resourceLoader(file));
    }
    serveSnapshotInfo(pageOrFrameId, searchParams) {
      const snapshot = this._snapshot(pageOrFrameId, searchParams);
      return this._respondWithJson(snapshot ? {
        viewport: snapshot.viewport(),
        url: snapshot.snapshot().frameUrl,
        timestamp: snapshot.snapshot().timestamp,
        wallTime: snapshot.snapshot().wallTime
      } : {
        error: "No snapshot found"
      });
    }
    _snapshot(pageOrFrameId, params) {
      const name = params.get("name");
      return this._snapshotStorage.snapshotByName(pageOrFrameId, name);
    }
    _respondWithJson(object) {
      return new Response(JSON.stringify(object), {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=31536000",
          "Content-Type": "application/json"
        }
      });
    }
    async serveResource(requestUrlAlternatives, method, snapshotUrl) {
      let resource;
      const snapshot = this._snapshotIds.get(snapshotUrl);
      for (const requestUrl of requestUrlAlternatives) {
        resource = snapshot?.resourceByUrl(removeHash(requestUrl), method);
        if (resource)
          break;
      }
      if (!resource)
        return new Response(null, { status: 404 });
      const file = resource.response.content._file;
      const content = file ? await this._resourceLoader(file) || new Blob([]) : new Blob([]);
      let contentType = resource.response.content.mimeType;
      const isTextEncoding = /^text\/|^application\/(javascript|json)/.test(contentType);
      if (isTextEncoding && !contentType.includes("charset"))
        contentType = `${contentType}; charset=utf-8`;
      const headers = new Headers();
      if (contentType !== "x-unknown")
        headers.set("Content-Type", contentType);
      for (const { name, value } of resource.response.headers)
        headers.set(name, value);
      headers.delete("Content-Encoding");
      headers.delete("Access-Control-Allow-Origin");
      headers.set("Access-Control-Allow-Origin", "*");
      headers.delete("Content-Length");
      headers.set("Content-Length", String(content.size));
      if (this._snapshotStorage.hasResourceOverride(resource.request.url))
        headers.set("Cache-Control", "no-store, no-cache, max-age=0");
      else
        headers.set("Cache-Control", "public, max-age=31536000");
      const { status } = resource.response;
      const isNullBodyStatus = status === 101 || status === 204 || status === 205 || status === 304;
      return new Response(isNullBodyStatus ? null : content, {
        headers,
        status: resource.response.status,
        statusText: resource.response.statusText
      });
    }
  };
  function removeHash(url) {
    try {
      const u = new URL(url);
      u.hash = "";
      return u.toString();
    } catch (e) {
      return url;
    }
  }
  function isHttpUrl(url, base) {
    try {
      return ["http:", "https:"].includes(new URL(url, base).protocol);
    } catch {
      return false;
    }
  }
  var escapedChars = /* @__PURE__ */ new Set(["$", "^", "+", ".", "*", "(", ")", "|", "\\", "?", "{", "}", "[", "]"]);
  function globToRegexPattern(glob) {
    const tokens = ["^"];
    let inGroup = false;
    for (let i = 0; i < glob.length; ++i) {
      const c = glob[i];
      if (c === "\\" && i + 1 < glob.length) {
        const char = glob[++i];
        tokens.push(escapedChars.has(char) ? "\\" + char : char);
        continue;
      }
      if (c === "*") {
        const charBefore = glob[i - 1];
        let starCount = 1;
        while (glob[i + 1] === "*") {
          starCount++;
          i++;
        }
        if (starCount > 1) {
          const charAfter = glob[i + 1];
          if (charAfter === "/") {
            if (charBefore === "/")
              tokens.push("((.+/)|)");
            else
              tokens.push("(.*/)");
            ++i;
          } else {
            tokens.push("(.*)");
          }
        } else {
          tokens.push("([^/]*)");
        }
        continue;
      }
      switch (c) {
        case "{":
          if (inGroup)
            throw new Error(`Invalid glob pattern ${JSON.stringify(glob)}: nested '{' is not supported`);
          inGroup = true;
          tokens.push("(");
          break;
        case "}":
          if (!inGroup)
            throw new Error(`Invalid glob pattern ${JSON.stringify(glob)}: unmatched '}'`);
          inGroup = false;
          tokens.push(")");
          break;
        case ",":
          if (inGroup) {
            tokens.push("|");
            break;
          }
          tokens.push("\\" + c);
          break;
        default:
          tokens.push(escapedChars.has(c) ? "\\" + c : c);
      }
    }
    if (inGroup)
      throw new Error(`Invalid glob pattern ${JSON.stringify(glob)}: unmatched '{'`);
    tokens.push("$");
    return tokens.join("");
  }
  function isRegExp4(obj) {
    return obj instanceof RegExp || Object.prototype.toString.call(obj) === "[object RegExp]";
  }
  var isURLPattern = (v) => typeof globalThis.URLPattern === "function" && v instanceof globalThis.URLPattern;
  function serializeURLPattern(v) {
    return {
      hash: v.hash,
      hostname: v.hostname,
      password: v.password,
      pathname: v.pathname,
      port: v.port,
      protocol: v.protocol,
      search: v.search,
      username: v.username
    };
  }
  function serializeURLMatch(match) {
    if (isString(match))
      return { glob: match };
    if (isRegExp4(match))
      return { regexSource: match.source, regexFlags: match.flags };
    if (isURLPattern(match))
      return { urlPattern: serializeURLPattern(match) };
    return void 0;
  }
  function deserializeURLPattern(v) {
    if (typeof globalThis.URLPattern !== "function")
      return () => true;
    return new globalThis.URLPattern({
      hash: v.hash,
      hostname: v.hostname,
      password: v.password,
      pathname: v.pathname,
      port: v.port,
      protocol: v.protocol,
      search: v.search,
      username: v.username
    });
  }
  function deserializeURLMatch(match) {
    if (match.regexSource)
      return new RegExp(match.regexSource, match.regexFlags);
    if (match.urlPattern)
      return deserializeURLPattern(match.urlPattern);
    return match.glob;
  }
  function urlMatchesEqual(match1, match2) {
    if (isRegExp4(match1) && isRegExp4(match2))
      return match1.source === match2.source && match1.flags === match2.flags;
    return match1 === match2;
  }
  function urlMatches(baseURL, urlString, match, webSocketUrl) {
    if (match === void 0 || match === "")
      return true;
    if (isString(match))
      match = new RegExp(resolveGlobToRegexPattern(baseURL, match, webSocketUrl));
    if (isRegExp4(match)) {
      match.lastIndex = 0;
      return match.test(urlString);
    }
    const url = parseURL(urlString);
    if (!url)
      return false;
    if (isURLPattern(match))
      return match.test(url.href);
    if (typeof match !== "function")
      throw new Error("url parameter should be string, RegExp, URLPattern or function");
    return match(url);
  }
  function resolveGlobToRegexPattern(baseURL, glob, webSocketUrl) {
    if (webSocketUrl)
      baseURL = toWebSocketBaseUrl(baseURL);
    glob = resolveGlobBase(baseURL, glob);
    return globToRegexPattern(glob);
  }
  function toWebSocketBaseUrl(baseURL) {
    if (baseURL && /^https?:\/\//i.test(baseURL))
      baseURL = baseURL.replace(/^https?/i, (scheme) => scheme.toLowerCase() === "https" ? "wss" : "ws");
    return baseURL;
  }
  function resolveGlobBase(baseURL, match) {
    if (!match.startsWith("*")) {
      let mapToken2 = function(original, replacement) {
        if (original.length === 0)
          return "";
        tokenMap.set(replacement, original);
        return replacement;
      };
      var mapToken = mapToken2;
      const tokenMap = /* @__PURE__ */ new Map();
      match = match.replaceAll(/\\\\\?/g, "?");
      if (match.startsWith("about:") || match.startsWith("data:") || match.startsWith("chrome:") || match.startsWith("edge:") || match.startsWith("file:"))
        return match;
      const relativePath = match.split("/").map((token, index) => {
        if (token === "." || token === ".." || token === "")
          return token;
        if (index === 0 && token.endsWith(":")) {
          if (token.indexOf("*") !== -1 || token.indexOf("{") !== -1)
            return mapToken2(token, "http:");
          return token;
        }
        if (!/[*?{}\\]/.test(token))
          return token;
        const questionIndex = token.indexOf("?");
        if (questionIndex === -1)
          return mapToken2(token, `$_${index}_$`);
        const newPrefix = mapToken2(token.substring(0, questionIndex), `$_${index}_$`);
        const newSuffix = mapToken2(token.substring(questionIndex), `?$_${index}_$`);
        return newPrefix + newSuffix;
      }).join("/");
      const result = resolveBaseURL(baseURL, relativePath);
      let resolved = result.resolved;
      for (const [token, original] of tokenMap) {
        const normalize = result.caseInsensitivePart?.includes(token);
        const replacement = normalize ? original.toLowerCase() : original;
        resolved = resolved.replace(token, () => replacement);
      }
      match = resolved;
    }
    return match;
  }
  function parseURL(url) {
    try {
      return new URL(url);
    } catch (e) {
      return null;
    }
  }
  function constructURLBasedOnBaseURL(baseURL, givenURL) {
    try {
      return resolveBaseURL(baseURL, givenURL).resolved;
    } catch (e) {
      return givenURL;
    }
  }
  function resolveBaseURL(baseURL, givenURL) {
    try {
      const url = new URL(givenURL, baseURL);
      const resolved = url.toString();
      const caseInsensitivePrefix = url.origin;
      return { resolved, caseInsensitivePart: caseInsensitivePrefix };
    } catch (e) {
      return { resolved: givenURL };
    }
  }
  function parseLocator(locator, testIdAttributeName) {
    locator = locator.replace(/AriaRole\s*\.\s*([\w]+)/g, (_, group) => group.toLowerCase()).replace(/(get_by_role|getByRole)\s*\(\s*(?:["'`])([^'"`]+)['"`]/g, (_, group1, group2) => `${group1}(${group2.toLowerCase()}`);
    const params = [];
    let template = "";
    for (let i = 0; i < locator.length; ++i) {
      const quote = locator[i];
      if (quote !== '"' && quote !== "'" && quote !== "`" && quote !== "/") {
        template += quote;
        continue;
      }
      const isRegexEscaping = locator[i - 1] === "r" || locator[i] === "/";
      ++i;
      let text = "";
      while (i < locator.length) {
        if (locator[i] === "\\") {
          if (isRegexEscaping) {
            if (locator[i + 1] !== quote)
              text += locator[i];
            ++i;
            text += locator[i];
          } else {
            ++i;
            if (locator[i] === "n")
              text += "\n";
            else if (locator[i] === "r")
              text += "\r";
            else if (locator[i] === "t")
              text += "	";
            else
              text += locator[i];
          }
          ++i;
          continue;
        }
        if (locator[i] !== quote) {
          text += locator[i++];
          continue;
        }
        break;
      }
      params.push({ quote, text });
      template += (quote === "/" ? "r" : "") + "$" + params.length;
    }
    template = template.toLowerCase().replace(/get_by_alt_text/g, "getbyalttext").replace(/get_by_test_id/g, "getbytestid").replace(/get_by_([\w]+)/g, "getby$1").replace(/has_not_text/g, "hasnottext").replace(/has_text/g, "hastext").replace(/has_not/g, "hasnot").replace(/frame_locator/g, "framelocator").replace(/content_frame/g, "contentframe").replace(/pierce_frames/g, "pierceframes").replace(/[{}\s]/g, "").replace(/new\(\)/g, "").replace(/new[\w]+\.[\w]+options\(\)/g, "").replace(/\.set/g, ",set").replace(/\.or_\(/g, "or(").replace(/\.and_\(/g, "and(").replace(/:/g, "=").replace(/,re\.ignorecase/g, "i").replace(/,pattern.case_insensitive/g, "i").replace(/,regexoptions.ignorecase/g, "i").replace(/re.compile\(([^)]+)\)/g, "$1").replace(/pattern.compile\(([^)]+)\)/g, "r$1").replace(/newregex\(([^)]+)\)/g, "r$1").replace(/string=/g, "=").replace(/regex=/g, "=").replace(/,,/g, ",").replace(/,\)/g, ")");
    const preferredQuote = params.map((p) => p.quote).filter((quote) => "'\"`".includes(quote))[0];
    return { selector: transform(template, params, testIdAttributeName), preferredQuote };
  }
  function countParams(template) {
    return [...template.matchAll(/\$\d+/g)].length;
  }
  function shiftParams(template, sub) {
    return template.replace(/\$(\d+)/g, (_, ordinal) => `$${ordinal - sub}`);
  }
  function transform(template, params, testIdAttributeName) {
    while (true) {
      const hasMatch = template.match(/filter\(,?(has=|hasnot=|sethas\(|sethasnot\()/);
      if (!hasMatch)
        break;
      const start = hasMatch.index + hasMatch[0].length;
      let balance = 0;
      let end = start;
      for (; end < template.length; end++) {
        if (template[end] === "(")
          balance++;
        else if (template[end] === ")")
          balance--;
        if (balance < 0)
          break;
      }
      let prefix = template.substring(0, start);
      let extraSymbol = 0;
      if (["sethas(", "sethasnot("].includes(hasMatch[1])) {
        extraSymbol = 1;
        prefix = prefix.replace(/sethas\($/, "has=").replace(/sethasnot\($/, "hasnot=");
      }
      const paramsCountBeforeHas = countParams(template.substring(0, start));
      const hasTemplate = shiftParams(template.substring(start, end), paramsCountBeforeHas);
      const paramsCountInHas = countParams(hasTemplate);
      const hasParams = params.slice(paramsCountBeforeHas, paramsCountBeforeHas + paramsCountInHas);
      const hasSelector = JSON.stringify(transform(hasTemplate, hasParams, testIdAttributeName));
      template = prefix.replace(/=$/, "2=") + `$${paramsCountBeforeHas + 1}` + shiftParams(template.substring(end + extraSymbol), paramsCountInHas - 1);
      const paramsBeforeHas = params.slice(0, paramsCountBeforeHas);
      const paramsAfterHas = params.slice(paramsCountBeforeHas + paramsCountInHas);
      params = paramsBeforeHas.concat([{ quote: '"', text: hasSelector }]).concat(paramsAfterHas);
    }
    template = template.replace(/\,set([\w]+)\(([^)]+)\)/g, (_, group1, group2) => "," + group1.toLowerCase() + "=" + group2.toLowerCase()).replace(/framelocator\(([^)]+)\)/g, "$1.internal:control=enter-frame").replace(/contentframe(\(\))?/g, "internal:control=enter-frame").replace(/pierceframes(\(\))?/g, "internal:control=pierce-frames").replace(/locator\(([^)]+),hastext=([^),]+)\)/g, "locator($1).internal:has-text=$2").replace(/locator\(([^)]+),hasnottext=([^),]+)\)/g, "locator($1).internal:has-not-text=$2").replace(/locator\(([^)]+),hastext=([^),]+)\)/g, "locator($1).internal:has-text=$2").replace(/locator\(([^)]+)\)/g, "$1").replace(/getbyrole\(([^)]+)\)/g, "internal:role=$1").replace(/getbytext\(([^)]+)\)/g, "internal:text=$1").replace(/getbylabel\(([^)]+)\)/g, "internal:label=$1").replace(/getbytestid\(([^)]+)\)/g, `internal:testid=[${encodeTestIdAttributeName(testIdAttributeName)}=$1]`).replace(/getby(placeholder|alt|title)(?:text)?\(([^)]+)\)/g, "internal:attr=[$1=$2]").replace(/first(\(\))?/g, "nth=0").replace(/last(\(\))?/g, "nth=-1").replace(/nth\(([^)]+)\)/g, "nth=$1").replace(/filter\(,?visible=true\)/g, "visible=true").replace(/filter\(,?visible=false\)/g, "visible=false").replace(/filter\(,?hastext=([^)]+)\)/g, "internal:has-text=$1").replace(/filter\(,?hasnottext=([^)]+)\)/g, "internal:has-not-text=$1").replace(/filter\(,?has2=([^)]+)\)/g, "internal:has=$1").replace(/filter\(,?hasnot2=([^)]+)\)/g, "internal:has-not=$1").replace(/,exact=false/g, "").replace(/(,name=\$\d+)(,description=\$\d+),exact=true/g, "$1s$2s").replace(/,exact=true/g, "s").replace(/,includehidden=/g, ",include-hidden=").replace(/\,/g, "][");
    const parts = template.split(".");
    for (let index = 0; index < parts.length - 1; index++) {
      if (parts[index] === "internal:control=enter-frame" && parts[index + 1].startsWith("nth=")) {
        const [nth] = parts.splice(index, 1);
        parts.splice(index + 1, 0, nth);
      }
    }
    return parts.map((t) => {
      if (!t.startsWith("internal:") || t === "internal:control")
        return t.replace(/\$(\d+)/g, (_, ordinal) => {
          const param = params[+ordinal - 1];
          return param.text;
        });
      t = t.includes("[") ? t.replace(/\]/, "") + "]" : t;
      t = t.replace(/(?:r)\$(\d+)(i)?/g, (_, ordinal, suffix) => {
        const param = params[+ordinal - 1];
        if (t.startsWith("internal:attr") || t.startsWith("internal:testid") || t.startsWith("internal:role"))
          return escapeForAttributeSelector(new RegExp(param.text), false) + (suffix || "");
        return escapeForTextSelector(new RegExp(param.text, suffix), false);
      }).replace(/\$(\d+)(i|s)?/g, (_, ordinal, suffix) => {
        const param = params[+ordinal - 1];
        if (t.startsWith("internal:has=") || t.startsWith("internal:has-not="))
          return param.text;
        if (t.startsWith("internal:testid"))
          return escapeForAttributeSelector(param.text, true);
        if (t.startsWith("internal:attr") || t.startsWith("internal:role"))
          return escapeForAttributeSelector(param.text, suffix === "s");
        return escapeForTextSelector(param.text, suffix === "s");
      });
      return t;
    }).join(" >> ");
  }
  function locatorOrSelectorAsSelector(language, locator, testIdAttributeName = "data-testid") {
    try {
      return unsafeLocatorOrSelectorAsSelector(language, locator, testIdAttributeName);
    } catch (e) {
      return "";
    }
  }
  function unsafeLocatorOrSelectorAsSelector(language, locator, testIdAttributeName = "data-testid") {
    try {
      parseSelector(locator);
      return locator;
    } catch (e) {
    }
    const { selector, preferredQuote } = parseLocator(locator, testIdAttributeName);
    const locators = asLocators(language, selector, void 0, void 0, preferredQuote);
    const digest = digestForComparison(language, locator);
    if (locators.some((candidate) => digestForComparison(language, candidate) === digest))
      return selector;
    return "";
  }
  function digestForComparison(language, locator) {
    locator = locator.replace(/\s/g, "");
    if (language === "javascript")
      locator = locator.replace(/\\?["`]/g, "'").replace(/,{}/g, "");
    return locator;
  }
  function findClosest(items, metric, target) {
    return items.find((item, index) => {
      if (index === items.length - 1)
        return true;
      const next = items[index + 1];
      return Math.abs(metric(item) - target) < Math.abs(metric(next) - target);
    });
  }
  function isNodeNameAttributesChildNodesSnapshot(n) {
    return Array.isArray(n) && typeof n[0] === "string";
  }
  function isSubtreeReferenceSnapshot(n) {
    return Array.isArray(n) && Array.isArray(n[0]);
  }
  var SnapshotRenderer = class {
    constructor(htmlCache, resources, snapshots, screencastFrames, index) {
      this._htmlCache = htmlCache;
      this._resources = resources;
      this._snapshots = snapshots;
      this._index = index;
      this._snapshot = snapshots[index];
      this._callId = snapshots[index].callId;
      this._screencastFrames = screencastFrames;
      this.snapshotName = snapshots[index].snapshotName;
    }
    snapshot() {
      return this._snapshots[this._index];
    }
    viewport() {
      return this._snapshots[this._index].viewport;
    }
    closestScreenshot() {
      const { wallTime, timestamp } = this.snapshot();
      const closestFrame = wallTime && this._screencastFrames[0]?.frameSwapWallTime ? findClosest(this._screencastFrames, (frame) => frame.frameSwapWallTime, wallTime) : findClosest(this._screencastFrames, (frame) => frame.timestamp, timestamp);
      return closestFrame?.file;
    }
    render() {
      const result = [];
      const visit = (n, snapshotIndex, parentTag, parentAttrs) => {
        if (typeof n === "string") {
          if (parentTag === "STYLE" || parentTag === "style")
            result.push(escapeURLsInStyleSheet(rewriteURLsInStyleSheetForCustomProtocol(n)));
          else
            result.push(escapeHTML(n));
          return;
        }
        if (isSubtreeReferenceSnapshot(n)) {
          const referenceIndex = snapshotIndex - n[0][0];
          if (referenceIndex >= 0 && referenceIndex <= snapshotIndex) {
            const nodes = snapshotNodes(this._snapshots[referenceIndex]);
            const nodeIndex = n[0][1];
            if (nodeIndex >= 0 && nodeIndex < nodes.length)
              return visit(nodes[nodeIndex], referenceIndex, parentTag, parentAttrs);
          }
        } else if (isNodeNameAttributesChildNodesSnapshot(n)) {
          const [name, nodeAttrs, ...children] = n;
          if (name.toUpperCase() === "SCRIPT")
            return;
          const upperName = name.toUpperCase();
          const nodeName = upperName === "NOSCRIPT" ? "X-NOSCRIPT" : name;
          const attrs = Object.entries(nodeAttrs || {});
          result.push("<", nodeName);
          const kCurrentSrcAttribute = "__playwright_current_src__";
          const isFrame = upperName === "IFRAME" || upperName === "FRAME";
          const isAnchor = upperName === "A";
          const isImg = upperName === "IMG";
          const isMeta = upperName === "META";
          const isImgWithCurrentSrc = isImg && attrs.some((a) => a[0] === kCurrentSrcAttribute);
          const isSourceInsidePictureWithCurrentSrc = upperName === "SOURCE" && parentTag === "PICTURE" && parentAttrs?.some((a) => a[0] === kCurrentSrcAttribute);
          const hasUnsafeHttpEquiv = isMeta && attrs.some((a) => a[0].toLowerCase() === "http-equiv" && !kAllowedMetaHttpEquivs.has(a[1].trim().toLowerCase()));
          for (const [attr, value] of attrs) {
            let attrName = attr;
            if (attr.toLowerCase().startsWith("on"))
              continue;
            if (isFrame && attr.toLowerCase() === "src") {
              attrName = "__playwright_src__";
            }
            if (isFrame && (attr.toLowerCase() === "srcdoc" || attr.toLowerCase() === "sandbox")) {
              attrName = "__playwright_" + attr.toLowerCase() + "__";
            }
            if (upperName === "OBJECT" && attr.toLowerCase() === "data")
              attrName = "__playwright_data__";
            if (upperName === "EMBED" && attr.toLowerCase() === "src")
              attrName = "__playwright_src__";
            if (isImg && attr === kCurrentSrcAttribute) {
              attrName = "src";
            }
            if (["src", "srcset"].includes(attr.toLowerCase()) && (isImgWithCurrentSrc || isSourceInsidePictureWithCurrentSrc)) {
              attrName = "_" + attrName;
            }
            if (hasUnsafeHttpEquiv && (attr.toLowerCase() === "http-equiv" || attr.toLowerCase() === "content")) {
              attrName = "_" + attr;
            }
            let attrValue = value;
            if (!isAnchor && (attr.toLowerCase() === "href" || attr.toLowerCase() === "src" || attr === kCurrentSrcAttribute))
              attrValue = rewriteURLForCustomProtocol(value);
            result.push(" ", attrName, '="', escapeHTMLAttribute(attrValue), '"');
          }
          result.push(">");
          for (const child of children)
            visit(child, snapshotIndex, nodeName, attrs);
          if (!autoClosing.has(nodeName))
            result.push("</", nodeName, ">");
          return;
        } else {
          return;
        }
      };
      const snapshot = this._snapshot;
      const html = this._htmlCache.getOrCompute(this, () => {
        visit(snapshot.html, this._index, void 0, void 0);
        const safeDoctype = snapshot.doctype?.replace(/[^a-zA-Z0-9]/g, "");
        const prefix = safeDoctype ? `<!DOCTYPE ${safeDoctype}>` : "";
        const html2 = prefix + [
          // Hide the document in order to prevent flickering. We will unhide once script has processed shadow.
          "<style>*,*::before,*::after { visibility: hidden }</style>",
          `<script>${snapshotScript(this.viewport(), this._callId, this.snapshotName)}<\/script>`
        ].join("") + result.join("");
        return { value: html2, size: html2.length };
      });
      return { html, pageId: snapshot.pageId, frameId: snapshot.frameId, index: this._index };
    }
    resourceByUrl(url, method) {
      const snapshot = this._snapshot;
      let sameFrameResource;
      let otherFrameResource;
      for (const resource of this._resources) {
        if (typeof resource._monotonicTime === "number" && resource._monotonicTime >= snapshot.timestamp)
          break;
        if (resource.response.status === 304) {
          continue;
        }
        if (resource.request.url === url && resource.request.method === method) {
          if (resource._frameref === snapshot.frameId)
            sameFrameResource = resource;
          else
            otherFrameResource = resource;
        }
      }
      let result = sameFrameResource ?? otherFrameResource;
      if (result && method.toUpperCase() === "GET") {
        let override = snapshot.resourceOverrides.find((o) => o.url === url);
        if (override?.ref) {
          const index = this._index - override.ref;
          if (index >= 0 && index < this._snapshots.length)
            override = this._snapshots[index].resourceOverrides.find((o) => o.url === url);
        }
        if (override?.file) {
          result = {
            ...result,
            response: {
              ...result.response,
              content: {
                ...result.response.content,
                _file: override.file
              }
            }
          };
        }
      }
      return result;
    }
  };
  var autoClosing = /* @__PURE__ */ new Set(["AREA", "BASE", "BR", "COL", "COMMAND", "EMBED", "HR", "IMG", "INPUT", "KEYGEN", "LINK", "MENUITEM", "META", "PARAM", "SOURCE", "TRACK", "WBR"]);
  var kAllowedMetaHttpEquivs = /* @__PURE__ */ new Set(["content-type", "content-language", "default-style", "x-ua-compatible"]);
  function snapshotNodes(snapshot) {
    if (!snapshot._nodes) {
      const nodes = [];
      const visit = (n) => {
        if (typeof n === "string") {
          nodes.push(n);
        } else if (isNodeNameAttributesChildNodesSnapshot(n)) {
          const [, , ...children] = n;
          for (const child of children)
            visit(child);
          nodes.push(n);
        }
      };
      visit(snapshot.html);
      snapshot._nodes = nodes;
    }
    return snapshot._nodes;
  }
  function snapshotScript(viewport, ...targetIds) {
    function applyPlaywrightAttributes(blankSnapshotUrl2, viewport2, ...targetIds2) {
      const win = window;
      const searchParams = new URLSearchParams(win.location.search);
      const shouldPopulateCanvasFromScreenshot = searchParams.has("shouldPopulateCanvasFromScreenshot");
      const isUnderTest = searchParams.has("isUnderTest");
      const frameBoundingRectsInfo = {
        viewport: viewport2,
        frames: /* @__PURE__ */ new WeakMap()
      };
      win["__playwright_frame_bounding_rects__"] = frameBoundingRectsInfo;
      const kPointerWarningTitle = "Recorded click position in absolute coordinates did not match the center of the clicked element. This is either due to the use of provided offset, or due to a difference between the test runner and the trace viewer operating systems.";
      const scrollTops = [];
      const scrollLefts = [];
      const targetElements = [];
      const canvasElements = [];
      let topSnapshotWindow = win;
      while (topSnapshotWindow !== topSnapshotWindow.parent && !topSnapshotWindow.location.pathname.match(/\/page@[a-z0-9]+$/))
        topSnapshotWindow = topSnapshotWindow.parent;
      const visit = (root) => {
        for (const e of root.querySelectorAll(`[__playwright_scroll_top_]`))
          scrollTops.push(e);
        for (const e of root.querySelectorAll(`[__playwright_scroll_left_]`))
          scrollLefts.push(e);
        for (const element of root.querySelectorAll(`[__playwright_value_]`)) {
          const inputElement = element;
          if (inputElement.type !== "file")
            inputElement.value = inputElement.getAttribute("__playwright_value_");
          element.removeAttribute("__playwright_value_");
        }
        for (const element of root.querySelectorAll(`[__playwright_checked_]`)) {
          element.checked = element.getAttribute("__playwright_checked_") === "true";
          element.removeAttribute("__playwright_checked_");
        }
        for (const element of root.querySelectorAll(`[__playwright_selected_]`)) {
          element.selected = element.getAttribute("__playwright_selected_") === "true";
          element.removeAttribute("__playwright_selected_");
        }
        for (const element of root.querySelectorAll(`[__playwright_popover_open_]`)) {
          try {
            element.showPopover();
          } catch {
          }
          element.removeAttribute("__playwright_popover_open_");
        }
        for (const element of root.querySelectorAll(`[__playwright_dialog_open_]`)) {
          try {
            if (element.getAttribute("__playwright_dialog_open_") === "modal")
              element.showModal();
            else
              element.show();
          } catch {
          }
          element.removeAttribute("__playwright_dialog_open_");
        }
        const highlightTarget = (target) => {
          const style = target.style;
          style.outline = "2px solid #006ab1";
          style.backgroundColor = "#6fa8dc7f";
          targetElements.push(target);
        };
        for (const target of root.querySelectorAll(`[__playwright_target__=""]`))
          highlightTarget(target);
        for (const targetId of targetIds2) {
          if (!targetId)
            continue;
          for (const target of root.querySelectorAll(`[__playwright_target__="${targetId}"]`))
            highlightTarget(target);
        }
        for (const iframe of root.querySelectorAll("iframe, frame")) {
          const boundingRectJson = iframe.getAttribute("__playwright_bounding_rect__");
          iframe.removeAttribute("__playwright_bounding_rect__");
          const boundingRect = boundingRectJson ? JSON.parse(boundingRectJson) : void 0;
          if (boundingRect)
            frameBoundingRectsInfo.frames.set(iframe, { boundingRect, scrollLeft: 0, scrollTop: 0 });
          const src = iframe.getAttribute("__playwright_src__");
          if (!src) {
            iframe.setAttribute("src", blankSnapshotUrl2);
          } else {
            const url = new URL(win.location.href);
            const index = url.pathname.lastIndexOf("/snapshot/");
            if (index !== -1)
              url.pathname = url.pathname.substring(0, index + 1);
            url.pathname += src.substring(1);
            iframe.setAttribute("src", url.toString());
          }
        }
        {
          const body = root.querySelector(`body[__playwright_custom_elements__]`);
          if (body && win.customElements) {
            const customElements = (body.getAttribute("__playwright_custom_elements__") || "").split(",");
            for (const elementName of customElements)
              win.customElements.define(elementName, class extends HTMLElement {
              });
          }
        }
        for (const element of root.querySelectorAll(`template[__playwright_shadow_root_]`)) {
          const template = element;
          const shadowRoot = template.parentElement.attachShadow({ mode: "open" });
          shadowRoot.appendChild(template.content);
          template.remove();
          visit(shadowRoot);
        }
        for (const element of root.querySelectorAll("a"))
          element.addEventListener("click", (event) => {
            event.preventDefault();
          });
        if ("adoptedStyleSheets" in root) {
          const adoptedSheets = [...root.adoptedStyleSheets];
          for (const element of root.querySelectorAll(`template[__playwright_style_sheet_]`)) {
            const template = element;
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(template.getAttribute("__playwright_style_sheet_"));
            adoptedSheets.push(sheet);
          }
          root.adoptedStyleSheets = adoptedSheets;
        }
        canvasElements.push(...root.querySelectorAll("canvas"));
      };
      const onLoad = () => {
        win.removeEventListener("load", onLoad);
        for (const element of scrollTops) {
          element.scrollTop = +element.getAttribute("__playwright_scroll_top_");
          element.removeAttribute("__playwright_scroll_top_");
          if (frameBoundingRectsInfo.frames.has(element))
            frameBoundingRectsInfo.frames.get(element).scrollTop = element.scrollTop;
        }
        for (const element of scrollLefts) {
          element.scrollLeft = +element.getAttribute("__playwright_scroll_left_");
          element.removeAttribute("__playwright_scroll_left_");
          if (frameBoundingRectsInfo.frames.has(element))
            frameBoundingRectsInfo.frames.get(element).scrollLeft = element.scrollLeft;
        }
        win.document.styleSheets[0].disabled = true;
        const search = new URL(win.location.href).searchParams;
        const isTopFrame = win === topSnapshotWindow;
        if (isTopFrame && search.get("pointX") && search.get("pointY")) {
          const pointX = +search.get("pointX");
          const pointY = +search.get("pointY");
          const pointElement = win.document.createElement("x-pw-pointer");
          pointElement.style.position = "fixed";
          pointElement.style.backgroundColor = "#f44336";
          pointElement.style.width = "20px";
          pointElement.style.height = "20px";
          pointElement.style.borderRadius = "10px";
          pointElement.style.margin = "-10px 0 0 -10px";
          pointElement.style.zIndex = "2147483646";
          pointElement.style.display = "flex";
          pointElement.style.alignItems = "center";
          pointElement.style.justifyContent = "center";
          const target = targetElements[0];
          const targetBox = target?.getBoundingClientRect();
          const targetCenter = target ? { x: targetBox.left + targetBox.width / 2, y: targetBox.top + targetBox.height / 2 } : null;
          pointElement.style.left = (targetCenter?.x ?? pointX) + "px";
          pointElement.style.top = (targetCenter?.y ?? pointY) + "px";
          const isAligned = !targetCenter || Math.abs(targetCenter.x - pointX) <= 10 && Math.abs(targetCenter.y - pointY) <= 10;
          if (!isAligned) {
            const warningElement = win.document.createElement("x-pw-pointer-warning");
            warningElement.textContent = "\u26A0";
            warningElement.style.fontSize = "19px";
            warningElement.style.color = "white";
            warningElement.style.marginTop = "-3.5px";
            warningElement.style.userSelect = "none";
            pointElement.appendChild(warningElement);
            pointElement.setAttribute("title", kPointerWarningTitle);
          }
          win.document.documentElement.appendChild(pointElement);
        }
        if (canvasElements.length > 0) {
          let drawCheckerboard2 = function(context, canvas) {
            function createCheckerboardPattern() {
              const pattern = win.document.createElement("canvas");
              pattern.width = pattern.width / Math.floor(pattern.width / 24);
              pattern.height = pattern.height / Math.floor(pattern.height / 24);
              const context2 = pattern.getContext("2d");
              context2.fillStyle = "lightgray";
              context2.fillRect(0, 0, pattern.width, pattern.height);
              context2.fillStyle = "white";
              context2.fillRect(0, 0, pattern.width / 2, pattern.height / 2);
              context2.fillRect(pattern.width / 2, pattern.height / 2, pattern.width, pattern.height);
              return context2.createPattern(pattern, "repeat");
            }
            context.fillStyle = createCheckerboardPattern();
            context.fillRect(0, 0, canvas.width, canvas.height);
          };
          var drawCheckerboard = drawCheckerboard2;
          const img = new Image();
          img.onload = () => {
            for (const canvas of canvasElements) {
              const context = canvas.getContext("2d");
              const boundingRectAttribute = canvas.getAttribute("__playwright_bounding_rect__");
              canvas.removeAttribute("__playwright_bounding_rect__");
              if (!boundingRectAttribute)
                continue;
              let boundingRect;
              try {
                boundingRect = JSON.parse(boundingRectAttribute);
              } catch (e) {
                continue;
              }
              let currWindow = win;
              while (currWindow !== topSnapshotWindow) {
                const iframe = currWindow.frameElement;
                currWindow = currWindow.parent;
                const iframeInfo = currWindow["__playwright_frame_bounding_rects__"]?.frames.get(iframe);
                if (!iframeInfo?.boundingRect)
                  break;
                const leftOffset = iframeInfo.boundingRect.left - iframeInfo.scrollLeft;
                const topOffset = iframeInfo.boundingRect.top - iframeInfo.scrollTop;
                boundingRect.left += leftOffset;
                boundingRect.top += topOffset;
                boundingRect.right += leftOffset;
                boundingRect.bottom += topOffset;
              }
              const { width, height } = topSnapshotWindow["__playwright_frame_bounding_rects__"].viewport;
              boundingRect.left = boundingRect.left / width;
              boundingRect.top = boundingRect.top / height;
              boundingRect.right = boundingRect.right / width;
              boundingRect.bottom = boundingRect.bottom / height;
              const partiallyUncaptured = boundingRect.right > 1 || boundingRect.bottom > 1;
              const fullyUncaptured = boundingRect.left > 1 || boundingRect.top > 1;
              if (fullyUncaptured) {
                canvas.title = `Playwright couldn't capture canvas contents because it's located outside the viewport.`;
                continue;
              }
              drawCheckerboard2(context, canvas);
              if (shouldPopulateCanvasFromScreenshot) {
                context.drawImage(img, boundingRect.left * img.width, boundingRect.top * img.height, (boundingRect.right - boundingRect.left) * img.width, (boundingRect.bottom - boundingRect.top) * img.height, 0, 0, canvas.width, canvas.height);
                if (partiallyUncaptured)
                  canvas.title = `Playwright couldn't capture full canvas contents because it's located partially outside the viewport.`;
                else
                  canvas.title = `Canvas contents are displayed on a best-effort basis based on viewport screenshots taken during test execution.`;
              } else {
                canvas.title = "Canvas content display is disabled.";
              }
              if (isUnderTest)
                console.log(`canvas drawn:`, JSON.stringify([boundingRect.left, boundingRect.top, boundingRect.right - boundingRect.left, boundingRect.bottom - boundingRect.top].map((v) => Math.floor(v * 100))));
            }
          };
          img.onerror = () => {
            for (const canvas of canvasElements) {
              const context = canvas.getContext("2d");
              drawCheckerboard2(context, canvas);
              canvas.title = `Playwright couldn't show canvas contents because the screenshot failed to load.`;
            }
          };
          img.src = location.href.replace("/snapshot", "/closest-screenshot");
        }
      };
      const onDOMContentLoaded = () => visit(win.document);
      win.addEventListener("load", onLoad);
      win.addEventListener("DOMContentLoaded", onDOMContentLoaded);
    }
    const safe = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
    return `
(${applyPlaywrightAttributes.toString()})(${safe(blankSnapshotUrl)},${safe(viewport)}${targetIds.map((id) => `, ${safe(String(id))}`).join("")})`;
  }
  var schemas = ["about:", "blob:", "data:", "file:", "ftp:", "http:", "https:", "mailto:", "sftp:", "ws:", "wss:"];
  var kLegacyBlobPrefix = "http://playwright.bloburl/#";
  function rewriteURLForCustomProtocol(href) {
    if (href.startsWith(kLegacyBlobPrefix))
      href = href.substring(kLegacyBlobPrefix.length);
    try {
      const url = new URL(href);
      if (url.protocol === "javascript:" || url.protocol === "vbscript:")
        return "javascript:void(0)";
      const isBlob = url.protocol === "blob:";
      const isFile = url.protocol === "file:";
      if (!isBlob && !isFile && schemas.includes(url.protocol))
        return href;
      const prefix = "pw-" + url.protocol.slice(0, url.protocol.length - 1);
      if (!isFile)
        url.protocol = "https:";
      url.hostname = url.hostname ? `${prefix}--${url.hostname}` : prefix;
      if (isFile) {
        url.protocol = "https:";
      }
      return url.toString();
    } catch {
      return href;
    }
  }
  var urlInCSSRegex = /url\(['"]?([\w-]+:)\/\//ig;
  function rewriteURLsInStyleSheetForCustomProtocol(text) {
    return text.replace(urlInCSSRegex, (match, protocol) => {
      const isBlob = protocol === "blob:";
      const isFile = protocol === "file:";
      if (!isBlob && !isFile && schemas.includes(protocol))
        return match;
      return match.replace(protocol + "//", `https://pw-${protocol.slice(0, -1)}--`);
    });
  }
  var urlToEscapeRegex1 = /url\(\s*'([^']*)'\s*\)/ig;
  var urlToEscapeRegex2 = /url\(\s*"([^"]*)"\s*\)/ig;
  function escapeURLsInStyleSheet(text) {
    const replacer = (match, url) => {
      if (url.includes("</"))
        return match.replace(url, encodeURI(url));
      return match;
    };
    return text.replace(urlToEscapeRegex1, replacer).replace(urlToEscapeRegex2, replacer);
  }
  var blankSnapshotUrl = "data:text/html;base64," + btoa(`<body></body><style>body { color-scheme: light dark; background: light-dark(white, #333) }</style>`);
  var LRUCache = class {
    constructor(maxSize) {
      this._maxSize = maxSize;
      this._map = /* @__PURE__ */ new Map();
      this._size = 0;
    }
    getOrCompute(key, compute) {
      if (this._map.has(key)) {
        const result2 = this._map.get(key);
        this._map.delete(key);
        this._map.set(key, result2);
        return result2.value;
      }
      const result = compute();
      while (this._map.size && this._size + result.size > this._maxSize) {
        const [firstKey, firstValue] = this._map.entries().next().value;
        this._size -= firstValue.size;
        this._map.delete(firstKey);
      }
      this._map.set(key, result);
      this._size += result.size;
      return result.value;
    }
  };
  var SnapshotStorage = class {
    constructor() {
      this._frameSnapshots = /* @__PURE__ */ new Map();
      this._cache = new LRUCache(1e8);
      this._resources = [];
      this._resourceUrlsWithOverrides = /* @__PURE__ */ new Set();
    }
    addResource(resource) {
      resource.request.url = rewriteURLForCustomProtocol(resource.request.url);
      this._resources.push(resource);
    }
    addFrameSnapshot(snapshot, screencastFrames) {
      for (const override of snapshot.resourceOverrides)
        override.url = rewriteURLForCustomProtocol(override.url);
      let frameSnapshots = this._frameSnapshots.get(snapshot.frameId);
      if (!frameSnapshots) {
        frameSnapshots = {
          raw: [],
          renderers: []
        };
        this._frameSnapshots.set(snapshot.frameId, frameSnapshots);
        if (snapshot.isMainFrame)
          this._frameSnapshots.set(snapshot.pageId, frameSnapshots);
      }
      frameSnapshots.raw.push(snapshot);
      const renderer = new SnapshotRenderer(this._cache, this._resources, frameSnapshots.raw, screencastFrames, frameSnapshots.raw.length - 1);
      frameSnapshots.renderers.push(renderer);
      return renderer;
    }
    snapshotByName(pageOrFrameId, snapshotName) {
      const snapshot = this._frameSnapshots.get(pageOrFrameId);
      return snapshot?.renderers.find((r) => r.snapshotName === snapshotName);
    }
    snapshotsForTest() {
      return [...this._frameSnapshots.keys()];
    }
    finalize() {
      this._resources.sort((a, b) => (a._monotonicTime || 0) - (b._monotonicTime || 0));
      for (const frameSnapshots of this._frameSnapshots.values()) {
        for (const snapshot of frameSnapshots.raw) {
          for (const override of snapshot.resourceOverrides)
            this._resourceUrlsWithOverrides.add(override.url);
        }
      }
    }
    hasResourceOverride(url) {
      return this._resourceUrlsWithOverrides.has(url);
    }
  };
  function parseClientSideCallMetadata(data) {
    const result = /* @__PURE__ */ new Map();
    const { files, stacks } = data;
    for (const s of stacks) {
      const [id, ff] = s;
      result.set(`call@${id}`, ff.map((f) => ({ file: files[f[0]], line: f[1], column: f[2], function: f[3] })));
    }
    return result;
  }
  function serializeClientSideCallMetadata(metadatas) {
    const fileNames = /* @__PURE__ */ new Map();
    const stacks = [];
    for (const m of metadatas) {
      if (!m.stack || !m.stack.length)
        continue;
      const stack = [];
      for (const frame of m.stack) {
        let ordinal = fileNames.get(frame.file);
        if (typeof ordinal !== "number") {
          ordinal = fileNames.size;
          fileNames.set(frame.file, ordinal);
        }
        const stackFrame = [ordinal, frame.line || 0, frame.column || 0, frame.function || ""];
        stack.push(stackFrame);
      }
      stacks.push([m.id, stack]);
    }
    return { files: [...fileNames.keys()], stacks };
  }
  var TraceVersionError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "TraceVersionError";
    }
  };
  var latestVersion = 8;
  var TraceModernizer = class {
    constructor(contextEntry, snapshotStorage) {
      this._actionMap = /* @__PURE__ */ new Map();
      this._pageEntries = /* @__PURE__ */ new Map();
      this._jsHandles = /* @__PURE__ */ new Map();
      this._consoleObjects = /* @__PURE__ */ new Map();
      this._contextEntry = contextEntry;
      this._snapshotStorage = snapshotStorage;
    }
    appendTrace(trace) {
      for (const line of trace.split("\n"))
        this._appendEvent(line);
    }
    actions() {
      return [...this._actionMap.values()];
    }
    _pageEntry(pageId) {
      let pageEntry = this._pageEntries.get(pageId);
      if (!pageEntry) {
        pageEntry = {
          pageId,
          screencastFrames: []
        };
        this._pageEntries.set(pageId, pageEntry);
        this._contextEntry.pages.push(pageEntry);
      }
      return pageEntry;
    }
    _appendEvent(line) {
      if (!line)
        return;
      const events = this._modernize(JSON.parse(line));
      for (const event of events)
        this._innerAppendEvent(event);
    }
    _innerAppendEvent(event) {
      const contextEntry = this._contextEntry;
      switch (event.type) {
        case "context-options": {
          if (event.version > latestVersion)
            throw new TraceVersionError("The trace was created by a newer version of Playwright and is not supported by this version of the viewer. Please use latest Playwright to open the trace.");
          this._version = event.version;
          contextEntry.origin = event.origin;
          contextEntry.browserName = event.browserName;
          contextEntry.channel = event.channel;
          contextEntry.title = event.title;
          contextEntry.platform = event.platform;
          contextEntry.playwrightVersion = event.playwrightVersion;
          contextEntry.wallTime = event.wallTime;
          contextEntry.monotonicTime = event.monotonicTime;
          contextEntry.startTime = event.monotonicTime;
          contextEntry.sdkLanguage = event.sdkLanguage;
          contextEntry.options = event.options;
          contextEntry.testIdAttributeName = event.testIdAttributeName;
          contextEntry.testTimeout = event.testTimeout;
          contextEntry.annotations = event.annotations;
          break;
        }
        case "screencast-frame": {
          this._pageEntry(event.pageId).screencastFrames.push(event);
          break;
        }
        case "screenshot": {
          contextEntry.screenshots.push(event);
          break;
        }
        case "aria-snapshot": {
          contextEntry.ariaSnapshots.push(event);
          break;
        }
        case "before": {
          this._actionMap.set(event.callId, { ...event, type: "action", endTime: 0, log: [] });
          break;
        }
        case "input": {
          const existing = this._actionMap.get(event.callId);
          existing.inputSnapshot = event.inputSnapshot;
          existing.point = event.point;
          existing.box = event.box;
          break;
        }
        case "log": {
          const existing = this._actionMap.get(event.callId);
          if (!existing)
            return;
          existing.log.push({
            time: event.time,
            message: event.message
          });
          break;
        }
        case "after": {
          const existing = this._actionMap.get(event.callId);
          existing.afterSnapshot = event.afterSnapshot;
          existing.endTime = event.endTime;
          existing.result = event.result;
          existing.error = event.error;
          existing.attachments = event.attachments;
          existing.annotations = event.annotations;
          if (event.point)
            existing.point = event.point;
          break;
        }
        case "action": {
          this._actionMap.set(event.callId, { ...event, log: [] });
          break;
        }
        case "event": {
          contextEntry.events.push(event);
          break;
        }
        case "stdout": {
          contextEntry.stdio.push(event);
          break;
        }
        case "stderr": {
          contextEntry.stdio.push(event);
          break;
        }
        case "error": {
          contextEntry.errors.push(event);
          break;
        }
        case "console": {
          contextEntry.events.push(event);
          break;
        }
        case "resource-snapshot":
          this._snapshotStorage.addResource(event.snapshot);
          contextEntry.resources.push(event.snapshot);
          break;
        case "frame-snapshot":
          this._snapshotStorage.addFrameSnapshot(event.snapshot, this._pageEntry(event.snapshot.pageId).screencastFrames);
          break;
      }
      if ("pageId" in event && event.pageId)
        this._pageEntry(event.pageId);
      if (event.type === "action" || event.type === "before")
        contextEntry.startTime = Math.min(contextEntry.startTime, event.startTime);
      if (event.type === "action" || event.type === "after")
        contextEntry.endTime = Math.max(contextEntry.endTime, event.endTime);
      if (event.type === "event") {
        contextEntry.startTime = Math.min(contextEntry.startTime, event.time);
        contextEntry.endTime = Math.max(contextEntry.endTime, event.time);
      }
      if (event.type === "screencast-frame") {
        contextEntry.startTime = Math.min(contextEntry.startTime, event.timestamp);
        contextEntry.endTime = Math.max(contextEntry.endTime, event.timestamp);
      }
    }
    _processedContextCreatedEvent() {
      return this._version !== void 0;
    }
    _modernize(event) {
      let version = this._version ?? event.version ?? 6;
      let events = [event];
      for (; version < latestVersion; ++version)
        events = this[`_modernize_${version}_to_${version + 1}`].call(this, events);
      for (const e of events)
        this._normalizeResourceReferences(e);
      return events;
    }
    // Traces recorded before trace-relative paths referenced blobs by bare sha1-style names:
    // `_sha1` in har entry content, `sha1` in snapshot resource overrides, screencast frames
    // and attachments.
    _normalizeResourceReferences(event) {
      if (event.type === "resource-snapshot") {
        const { request, response } = event.snapshot;
        if (request?.postData?._sha1) {
          request.postData._file = "resources/" + request.postData._sha1;
          delete request.postData._sha1;
        }
        if (response?.content?._sha1) {
          response.content._file = "resources/" + response.content._sha1;
          delete response.content._sha1;
        }
      }
      if (event.type === "frame-snapshot") {
        for (const override of event.snapshot.resourceOverrides || []) {
          if (override.sha1) {
            override.file = "resources/" + override.sha1;
            delete override.sha1;
          }
        }
      }
      if (event.type === "screencast-frame" && event.sha1) {
        event.file = "resources/" + event.sha1;
        delete event.sha1;
      }
      if (event.type === "after" || event.type === "action") {
        for (const attachment of event.attachments || []) {
          if (attachment.sha1) {
            attachment.file = "resources/" + attachment.sha1;
            delete attachment.sha1;
          }
        }
      }
    }
    _modernize_0_to_1(events) {
      for (const event of events) {
        if (event.type !== "action")
          continue;
        if (typeof event.metadata.error === "string")
          event.metadata.error = { error: { name: "Error", message: event.metadata.error } };
      }
      return events;
    }
    _modernize_1_to_2(events) {
      for (const event of events) {
        if (event.type !== "frame-snapshot" || !event.snapshot.isMainFrame)
          continue;
        event.snapshot.viewport = this._contextEntry.options?.viewport || { width: 1280, height: 720 };
      }
      return events;
    }
    _modernize_2_to_3(events) {
      for (const event of events) {
        if (event.type !== "resource-snapshot" || event.snapshot.request)
          continue;
        const resource = event.snapshot;
        event.snapshot = {
          _frameref: resource.frameId,
          request: {
            url: resource.url,
            method: resource.method,
            headers: resource.requestHeaders,
            postData: resource.requestSha1 ? { _sha1: resource.requestSha1 } : void 0
          },
          response: {
            status: resource.status,
            headers: resource.responseHeaders,
            content: {
              mimeType: resource.contentType,
              _sha1: resource.responseSha1
            }
          },
          _monotonicTime: resource.timestamp
        };
      }
      return events;
    }
    _modernize_3_to_4(events) {
      const result = [];
      for (const event of events) {
        const e = this._modernize_event_3_to_4(event);
        if (e)
          result.push(e);
      }
      return result;
    }
    _modernize_event_3_to_4(event) {
      if (event.type !== "action" && event.type !== "event") {
        return event;
      }
      const metadata = event.metadata;
      if (metadata.internal || metadata.method.startsWith("tracing"))
        return null;
      if (event.type === "event") {
        if (metadata.method === "__create__" && metadata.type === "ConsoleMessage") {
          return {
            type: "object",
            class: metadata.type,
            guid: metadata.params.guid,
            initializer: metadata.params.initializer
          };
        }
        return {
          type: "event",
          time: metadata.startTime,
          class: metadata.type,
          method: metadata.method,
          params: metadata.params,
          pageId: metadata.pageId
        };
      }
      return {
        type: "action",
        callId: metadata.id,
        startTime: metadata.startTime,
        endTime: metadata.endTime,
        apiName: metadata.apiName || metadata.type + "." + metadata.method,
        class: metadata.type,
        method: metadata.method,
        params: metadata.params,
        // eslint-disable-next-line no-restricted-globals
        wallTime: metadata.wallTime || Date.now(),
        log: metadata.log,
        beforeSnapshot: metadata.snapshots.find((s) => s.title === "before")?.snapshotName,
        inputSnapshot: metadata.snapshots.find((s) => s.title === "input")?.snapshotName,
        afterSnapshot: metadata.snapshots.find((s) => s.title === "after")?.snapshotName,
        error: metadata.error?.error,
        result: metadata.result,
        point: metadata.point,
        pageId: metadata.pageId
      };
    }
    _modernize_4_to_5(events) {
      const result = [];
      for (const event of events) {
        const e = this._modernize_event_4_to_5(event);
        if (e)
          result.push(e);
      }
      return result;
    }
    _modernize_event_4_to_5(event) {
      if (event.type === "event" && event.method === "__create__" && event.class === "JSHandle")
        this._jsHandles.set(event.params.guid, event.params.initializer);
      if (event.type === "object") {
        if (event.class !== "ConsoleMessage")
          return null;
        const args = event.initializer.args?.map((arg) => {
          if (arg.guid) {
            const handle = this._jsHandles.get(arg.guid);
            return { preview: handle?.preview || "", value: "" };
          }
          return { preview: arg.preview || "", value: arg.value || "" };
        });
        this._consoleObjects.set(event.guid, {
          type: event.initializer.type,
          text: event.initializer.text,
          location: event.initializer.location,
          args
        });
        return null;
      }
      if (event.type === "event" && event.method === "console") {
        const consoleMessage = this._consoleObjects.get(event.params.message?.guid || "");
        if (!consoleMessage)
          return null;
        return {
          type: "console",
          time: event.time,
          pageId: event.pageId,
          messageType: consoleMessage.type,
          text: consoleMessage.text,
          args: consoleMessage.args,
          location: consoleMessage.location
        };
      }
      return event;
    }
    _modernize_5_to_6(events) {
      const result = [];
      for (const event of events) {
        result.push(event);
        if (event.type !== "after" || !event.log.length)
          continue;
        for (const log of event.log) {
          result.push({
            type: "log",
            callId: event.callId,
            message: log,
            time: -1
          });
        }
      }
      return result;
    }
    _modernize_6_to_7(events) {
      const result = [];
      if (!this._processedContextCreatedEvent() && events[0].type !== "context-options") {
        const event = {
          type: "context-options",
          origin: "testRunner",
          version: 6,
          browserName: "",
          options: {},
          platform: "unknown",
          wallTime: 0,
          monotonicTime: 0,
          sdkLanguage: "javascript",
          contextId: ""
        };
        result.push(event);
      }
      for (const event of events) {
        if (event.type === "context-options") {
          result.push({ ...event, monotonicTime: 0, origin: "library", contextId: "" });
          continue;
        }
        if (event.type === "before" || event.type === "action") {
          if (!this._contextEntry.monotonicTime) {
            this._contextEntry.monotonicTime = event.startTime;
            this._contextEntry.wallTime = event.wallTime;
          }
          const eventAsV6 = event;
          const eventAsV7 = event;
          eventAsV7.stepId = `${eventAsV6.apiName}@${eventAsV6.wallTime}`;
          result.push(eventAsV7);
        } else {
          result.push(event);
        }
      }
      return result;
    }
    _modernize_7_to_8(events) {
      const result = [];
      for (const event of events) {
        if (event.type === "before" || event.type === "action") {
          const eventAsV7 = event;
          const eventAsV8 = event;
          if (eventAsV7.apiName) {
            eventAsV8.title = eventAsV7.apiName;
            delete eventAsV8.apiName;
          }
          eventAsV8.stepId = eventAsV7.stepId ?? eventAsV7.callId;
          result.push(eventAsV8);
        } else {
          result.push(event);
        }
      }
      return result;
    }
  };
  var TraceLoader = class {
    constructor() {
      this.contextEntries = [];
      this._resourceToContentType = /* @__PURE__ */ new Map();
    }
    async load(backend, traceFile, unzipProgress) {
      this._backend = backend;
      const prefix = traceFile?.match(/(.+)\.trace$/)?.[1];
      const prefixes = [];
      let hasSource = false;
      for (const entryName of await this._backend.entryNames()) {
        const match = entryName.match(/(.+)\.trace$/);
        if (match && (!prefix || prefix === match[1]))
          prefixes.push(match[1] || "");
        if (entryName.startsWith("src/") || entryName.includes("src@"))
          hasSource = true;
      }
      if (!prefixes.length)
        throw new Error("Cannot find .trace file");
      this._snapshotStorage = new SnapshotStorage();
      const total = prefixes.length * 3;
      let done = 0;
      for (const prefix2 of prefixes) {
        const contextEntry = createEmptyContext();
        contextEntry.hasSource = hasSource;
        const modernizer = new TraceModernizer(contextEntry, this._snapshotStorage);
        const trace = await this._backend.readText(prefix2 + ".trace") || "";
        modernizer.appendTrace(trace);
        unzipProgress?.(++done, total);
        const network = await this._backend.readText(prefix2 + ".network") || "";
        modernizer.appendTrace(network);
        unzipProgress?.(++done, total);
        contextEntry.actions = modernizer.actions().sort((a1, a2) => a1.startTime - a2.startTime);
        if (!backend.isLive()) {
          for (const action of contextEntry.actions.slice().reverse()) {
            if (!action.endTime && !action.error) {
              for (const a of contextEntry.actions) {
                if (a.parentId === action.callId && action.endTime < a.endTime)
                  action.endTime = a.endTime;
              }
            }
          }
        }
        const stacks = await this._backend.readText(prefix2 + ".stacks");
        if (stacks) {
          const callMetadata = parseClientSideCallMetadata(JSON.parse(stacks));
          for (const action of contextEntry.actions)
            action.stack = action.stack || callMetadata.get(action.callId);
        }
        unzipProgress?.(++done, total);
        for (const resource of contextEntry.resources) {
          if (resource.request.postData?._file)
            this._resourceToContentType.set(resource.request.postData._file, stripEncodingFromContentType(resource.request.postData.mimeType));
          if (resource.response.content?._file)
            this._resourceToContentType.set(resource.response.content._file, stripEncodingFromContentType(resource.response.content.mimeType));
        }
        this.contextEntries.push(contextEntry);
      }
      this._snapshotStorage.finalize();
    }
    async hasEntry(filename) {
      return this._backend.hasEntry(filename);
    }
    async resourceEntry(file) {
      const blob = await this._backend.readBlob(file);
      const contentType = this._resourceToContentType.get(file);
      if (!blob || contentType === void 0 || contentType === "x-unknown")
        return blob;
      return new Blob([blob], { type: contentType });
    }
    storage() {
      return this._snapshotStorage;
    }
  };
  function stripEncodingFromContentType(contentType) {
    const charset = contentType.match(/^(.*);\s*charset=.*$/);
    if (charset)
      return charset[1];
    return contentType;
  }
  function createEmptyContext() {
    return {
      origin: "testRunner",
      startTime: Number.MAX_SAFE_INTEGER,
      wallTime: Number.MAX_SAFE_INTEGER,
      monotonicTime: 0,
      endTime: 0,
      browserName: "",
      options: {
        deviceScaleFactor: 1,
        isMobile: false,
        viewport: { width: 1280, height: 800 }
      },
      pages: [],
      resources: [],
      actions: [],
      screenshots: [],
      ariaSnapshots: [],
      events: [],
      errors: [],
      stdio: [],
      hasSource: false
    };
  }
  var prevByEndTimeSymbol = /* @__PURE__ */ Symbol("prevByEndTime");
  var nextByStartTimeSymbol = /* @__PURE__ */ Symbol("nextByStartTime");
  var TraceModel = class {
    constructor(traceUri, contexts) {
      this.pagerefToTitle = /* @__PURE__ */ new Map();
      this._eventsForAction = /* @__PURE__ */ new Map();
      this._screenshots = /* @__PURE__ */ new Map();
      this._ariaSnapshots = /* @__PURE__ */ new Map();
      const libraryContext = contexts.find((context) => context.origin === "library");
      this.traceUri = traceUri;
      this.browserName = libraryContext?.browserName || "";
      this.sdkLanguage = libraryContext?.sdkLanguage;
      this.channel = libraryContext?.channel;
      this.testIdAttributeName = libraryContext?.testIdAttributeName;
      this.platform = libraryContext?.platform || "";
      this.playwrightVersion = contexts.find((c) => c.playwrightVersion)?.playwrightVersion;
      this.title = libraryContext?.title || "";
      this.options = libraryContext?.options || {};
      this.testTimeout = contexts.find((c) => c.origin === "testRunner")?.testTimeout;
      this.annotations = contexts.find((c) => c.origin === "testRunner")?.annotations;
      this.actions = mergeActionsAndUpdateTiming(contexts);
      this.pages = [].concat(...contexts.map((c) => c.pages));
      this.wallTime = contexts.map((c) => c.wallTime).reduce((prev, cur) => Math.min(prev || Number.MAX_VALUE, cur), Number.MAX_VALUE);
      this.startTime = contexts.map((c) => c.startTime).reduce((prev, cur) => Math.min(prev, cur), Number.MAX_VALUE);
      this.endTime = contexts.map((c) => c.endTime).reduce((prev, cur) => Math.max(prev, cur), Number.MIN_VALUE);
      this.events = [].concat(...contexts.map((c) => c.events));
      this.stdio = [].concat(...contexts.map((c) => c.stdio));
      this.errors = [].concat(...contexts.map((c) => c.errors));
      this.hasSource = contexts.some((c) => c.hasSource);
      this.hasStepData = contexts.some((context) => context.origin === "testRunner");
      this.resources = [];
      let lastApiContextId = 0;
      let lastBrowserContextId = 0;
      for (const context of contexts) {
        const contextTitle = context.resources.some((resource) => resource._apiRequest) ? "api#" + ++lastApiContextId : "browser#" + ++lastBrowserContextId;
        for (const entry of context.resources)
          this.resources.push({ ...entry, id: `${entry.pageref ?? lastApiContextId}-${entry.startedDateTime}-${entry.request.url}`, contextTitle });
      }
      for (const context of contexts) {
        for (const event of context.screenshots || [])
          this._screenshots.set(`${event.callId}/${event.phase}`, event);
        for (const event of context.ariaSnapshots || [])
          this._ariaSnapshots.set(`${event.callId}/${event.phase}`, event);
      }
      this.attachments = this.actions.flatMap((action) => action.attachments?.map((attachment) => ({ ...attachment, callId: action.callId, traceUri })) ?? []);
      this.visibleAttachments = this.attachments.filter((attachment) => !attachment.name.startsWith("_"));
      this.pages.forEach((page, index) => this.pagerefToTitle.set(page.pageId, "page#" + (index + 1)));
      this.events.sort((a1, a2) => a1.time - a2.time);
      this.resources.sort((a1, a2) => a1._monotonicTime - a2._monotonicTime);
      this.errorDescriptors = this.hasStepData ? this._errorDescriptorsFromTestRunner() : this._errorDescriptorsFromActions();
      this.sources = collectSources(this.actions, this.errorDescriptors);
      this.actionCounters = /* @__PURE__ */ new Map();
      for (const action of this.actions) {
        action.group = action.group ?? getActionGroup({ type: action.class, method: action.method });
        if (action.group)
          this.actionCounters.set(action.group, 1 + (this.actionCounters.get(action.group) || 0));
      }
    }
    createRelativeUrl(path) {
      const url = new URL("http://localhost/" + path);
      url.searchParams.set("trace", this.traceUri);
      return url.toString().substring("http://localhost/".length);
    }
    failedAction() {
      return this.actions.findLast((a) => a.error);
    }
    screenshotForCall(callId, phase) {
      return this._screenshots.get(`${callId}/${phase}`);
    }
    ariaSnapshotForCall(callId, phase) {
      return this._ariaSnapshots.get(`${callId}/${phase}`);
    }
    eventsForAction(action) {
      let result = this._eventsForAction.get(action);
      if (result)
        return result;
      let nextAction = nextActionByStartTime(action);
      while (nextAction && nextAction.class === "Route")
        nextAction = nextActionByStartTime(nextAction);
      result = this.events.filter((event) => {
        return event.time >= action.startTime && (!nextAction || event.time < nextAction.startTime);
      });
      this._eventsForAction.set(action, result);
      return result;
    }
    stats(action) {
      let errors = 0;
      let warnings = 0;
      for (const event of this.eventsForAction(action)) {
        if (event.type === "console") {
          const type = event.messageType;
          if (type === "warning")
            ++warnings;
          else if (type === "error")
            ++errors;
        }
        if (event.type === "event" && event.method === "pageError")
          ++errors;
      }
      return { errors, warnings };
    }
    filteredActions(actionsFilter) {
      const filter = new Set(actionsFilter);
      return this.actions.filter((action) => !action.group || filter.has(action.group));
    }
    renderActionTree(filter) {
      const actions = this.filteredActions(filter ?? []);
      const { rootItem } = buildActionTree(actions);
      const actionTree = [];
      const visit = (actionItem, indent2) => {
        const title = renderTitleForCall({ ...actionItem.action, type: actionItem.action.class });
        actionTree.push(`${indent2}${title || actionItem.id}`);
        for (const child of actionItem.children)
          visit(child, indent2 + "  ");
      };
      rootItem.children.forEach((a) => visit(a, ""));
      return actionTree;
    }
    _errorDescriptorsFromActions() {
      const errors = [];
      for (const action of this.actions || []) {
        if (!action.error?.message)
          continue;
        errors.push({
          action,
          stack: action.stack,
          message: action.error.message
        });
      }
      return errors;
    }
    _errorDescriptorsFromTestRunner() {
      return this.errors.filter((e) => !!e.message).map((error, i) => ({
        stack: error.stack,
        message: error.message
      }));
    }
  };
  function mergeActionsAndUpdateTiming(contexts) {
    const result = mergeActionsAndUpdateTimingSameTrace(contexts);
    result.sort((a1, a2) => {
      if (a2.parentId === a1.callId)
        return 1;
      if (a1.parentId === a2.callId)
        return -1;
      return a1.endTime - a2.endTime;
    });
    for (let i = 1; i < result.length; ++i)
      result[i][prevByEndTimeSymbol] = result[i - 1];
    result.sort((a1, a2) => {
      if (a2.parentId === a1.callId)
        return -1;
      if (a1.parentId === a2.callId)
        return 1;
      return a1.startTime - a2.startTime;
    });
    for (let i = 0; i + 1 < result.length; ++i)
      result[i][nextByStartTimeSymbol] = result[i + 1];
    return result;
  }
  var lastTmpStepId = 0;
  function mergeActionsAndUpdateTimingSameTrace(contexts) {
    const map = /* @__PURE__ */ new Map();
    const libraryContexts = contexts.filter((context) => context.origin === "library");
    const testRunnerContexts = contexts.filter((context) => context.origin === "testRunner");
    if (!testRunnerContexts.length || !libraryContexts.length) {
      return contexts.map((context) => {
        return context.actions.map((action) => ({ ...action }));
      }).flat();
    }
    const timeOrigin2 = (context) => context.wallTime - context.monotonicTime;
    const runnerContext = testRunnerContexts.find((context) => context.monotonicTime);
    for (const context of libraryContexts) {
      if (runnerContext && context.monotonicTime)
        adjustMonotonicTime(context, timeOrigin2(context) - timeOrigin2(runnerContext));
    }
    for (const context of libraryContexts) {
      for (const action of context.actions) {
        map.set(action.stepId || `tmp-step@${++lastTmpStepId}`, { ...action });
      }
    }
    const nonPrimaryIdToPrimaryId = /* @__PURE__ */ new Map();
    for (const context of testRunnerContexts) {
      for (const action of context.actions) {
        const existing = action.stepId && map.get(action.stepId);
        if (existing) {
          nonPrimaryIdToPrimaryId.set(action.callId, existing.callId);
          if (action.error)
            existing.error = action.error;
          if (action.attachments)
            existing.attachments = action.attachments;
          if (action.annotations)
            existing.annotations = action.annotations;
          if (action.parentId)
            existing.parentId = nonPrimaryIdToPrimaryId.get(action.parentId) ?? action.parentId;
          if (action.group)
            existing.group = action.group;
          existing.startTime = action.startTime;
          existing.endTime = action.endTime;
          continue;
        }
        if (action.parentId)
          action.parentId = nonPrimaryIdToPrimaryId.get(action.parentId) ?? action.parentId;
        map.set(action.stepId || `tmp-step@${++lastTmpStepId}`, { ...action });
      }
    }
    return [...map.values()];
  }
  function adjustMonotonicTime(context, monotonicTimeDelta) {
    if (!monotonicTimeDelta)
      return;
    context.startTime += monotonicTimeDelta;
    context.endTime += monotonicTimeDelta;
    context.monotonicTime += monotonicTimeDelta;
    for (const action of context.actions) {
      if (action.startTime)
        action.startTime += monotonicTimeDelta;
      if (action.endTime)
        action.endTime += monotonicTimeDelta;
    }
    for (const event of context.events)
      event.time += monotonicTimeDelta;
    for (const event of context.stdio)
      event.timestamp += monotonicTimeDelta;
    for (const page of context.pages) {
      for (const frame of page.screencastFrames)
        frame.timestamp += monotonicTimeDelta;
    }
    for (const resource of context.resources) {
      if (resource._monotonicTime)
        resource._monotonicTime += monotonicTimeDelta;
    }
  }
  function buildActionTree(actions) {
    const itemMap = /* @__PURE__ */ new Map();
    for (const action of actions) {
      itemMap.set(action.callId, {
        id: action.callId,
        parent: void 0,
        children: [],
        action
      });
    }
    const rootItem = { action: { ...kFakeRootAction }, id: "", parent: void 0, children: [] };
    for (const item of itemMap.values()) {
      rootItem.action.startTime = Math.min(rootItem.action.startTime, item.action.startTime);
      rootItem.action.endTime = Math.max(rootItem.action.endTime, item.action.endTime);
      const parent = item.action.parentId ? itemMap.get(item.action.parentId) || rootItem : rootItem;
      parent.children.push(item);
      item.parent = parent;
    }
    const inheritStack = (item) => {
      for (const child of item.children) {
        child.action.stack = child.action.stack ?? item.action.stack;
        inheritStack(child);
      }
    };
    inheritStack(rootItem);
    return { rootItem, itemMap };
  }
  function previousActionByEndTime(action) {
    return action[prevByEndTimeSymbol];
  }
  function nextActionByStartTime(action) {
    return action[nextByStartTimeSymbol];
  }
  function collectSources(actions, errorDescriptors) {
    const result = /* @__PURE__ */ new Map();
    for (const action of actions) {
      for (const frame of action.stack || []) {
        let source = result.get(frame.file);
        if (!source) {
          source = { errors: [], content: void 0 };
          result.set(frame.file, source);
        }
      }
    }
    for (const error of errorDescriptors) {
      const { action, stack, message } = error;
      if (!action || !stack)
        continue;
      result.get(stack[0].file)?.errors.push({
        line: stack[0].line || 0,
        message
      });
    }
    return result;
  }
  var kFakeRootAction = {
    type: "action",
    callId: "",
    startTime: 0,
    endTime: 0,
    class: "",
    method: "",
    params: {},
    log: []
  };
  var PW_SOURCE_HASH = "e4a6eeb6e6f51cd76a91420510bda49902dbaca3";
  var PW_SOURCE_DATE = "2026-08-14 14:34:02 +0100";
  return __toCommonJS(playwright_bundle_exports);
})();
