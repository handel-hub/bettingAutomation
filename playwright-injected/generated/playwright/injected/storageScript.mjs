import { parseEvaluationResultValue, serializeAsCallArgument } from "../isomorphic/utilityScriptSerializers.mjs";
class StorageScript {
  _isFirefox;
  _global;
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
}
export {
  StorageScript
};

//# sourceMappingURL=storageScript.mjs.map
