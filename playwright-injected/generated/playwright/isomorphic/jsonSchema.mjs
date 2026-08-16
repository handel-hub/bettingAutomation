const regexCache = /* @__PURE__ */ new Map();
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
    if (schema.pattern && !cachedRegex(schema.pattern).test(value))
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
function cachedRegex(pattern) {
  let regex = regexCache.get(pattern);
  if (!regex) {
    regex = new RegExp(pattern);
    regexCache.set(pattern, regex);
  }
  return regex;
}
export {
  validate
};

//# sourceMappingURL=jsonSchema.mjs.map
