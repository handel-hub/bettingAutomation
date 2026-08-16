class LRUCache {
  _maxSize;
  _map;
  _size;
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
}
export {
  LRUCache
};

//# sourceMappingURL=lruCache.mjs.map
