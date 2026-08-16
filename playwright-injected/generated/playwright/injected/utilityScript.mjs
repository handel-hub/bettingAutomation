import { parseEvaluationResultValue, serializeAsCallArgument } from "../isomorphic/utilityScriptSerializers.mjs";
class UtilityScript {
  global;
  // Builtins protect injected code from clock emulation.
  builtins;
  isUnderTest;
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
}
export {
  UtilityScript
};

//# sourceMappingURL=utilityScript.mjs.map
