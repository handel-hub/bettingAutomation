function assertionAbortedMessage(reason) {
  const detail = reason instanceof Error ? reason.message : reason === void 0 || reason === null ? "" : String(reason);
  return "The assertion was aborted" + (detail ? `: ${detail}` : "");
}
export {
  assertionAbortedMessage
};

//# sourceMappingURL=abortSignal.mjs.map
