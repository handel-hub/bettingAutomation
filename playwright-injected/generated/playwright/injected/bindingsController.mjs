import { parseEvaluationResultValue, serializeAsCallArgument } from "../isomorphic/utilityScriptSerializers.mjs";
class BindingsController {
  _global;
  _globalBindingName;
  _bindings = /* @__PURE__ */ new Map();
  constructor(global, globalBindingName) {
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
}
export {
  BindingsController
};

//# sourceMappingURL=bindingsController.mjs.map
