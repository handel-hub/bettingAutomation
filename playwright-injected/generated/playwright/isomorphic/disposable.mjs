async function disposeAll(disposables) {
  const copy = [...disposables];
  disposables.length = 0;
  await Promise.all(copy.map((d) => d.dispose()));
}
export {
  disposeAll
};

//# sourceMappingURL=disposable.mjs.map
