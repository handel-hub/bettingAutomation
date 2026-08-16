function inject(globalThis) {
  if (globalThis.__pwWebAuthnInstalled)
    return;
  globalThis.__pwWebAuthnInstalled = true;
  const binding = globalThis.__pwWebAuthnBinding;
  if (!binding || !globalThis.navigator)
    return;
  if (!globalThis.navigator.credentials) {
    Object.defineProperty(globalThis.navigator, "credentials", {
      value: { create: async () => null, get: async () => null },
      writable: true,
      configurable: true
    });
  }
  function toBase64Url(buf) {
    const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    let s = "";
    for (let i = 0; i < bytes.length; i++)
      s += String.fromCharCode(bytes[i]);
    return globalThis.btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }
  function fromBase64Url(s) {
    let str = s.replaceAll("-", "+").replaceAll("_", "/");
    while (str.length % 4)
      str += "=";
    const bin = globalThis.atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
      out[i] = bin.charCodeAt(i);
    return out.buffer;
  }
  const PublicKeyCredentialCtor = globalThis.PublicKeyCredential;
  const AuthAttestationResponseCtor = globalThis.AuthenticatorAttestationResponse;
  const AuthAssertionResponseCtor = globalThis.AuthenticatorAssertionResponse;
  function defineReadonly(target, props) {
    for (const k of Object.keys(props))
      Object.defineProperty(target, k, { value: props[k], enumerable: true, configurable: true });
  }
  function makeAttestationResponse(clientDataJSON, attestationObject) {
    const proto = AuthAttestationResponseCtor?.prototype || Object.prototype;
    const r = Object.create(proto);
    defineReadonly(r, { clientDataJSON, attestationObject });
    r.getTransports = () => ["internal"];
    r.getAuthenticatorData = () => {
      return attestationObject;
    };
    r.getPublicKey = () => null;
    r.getPublicKeyAlgorithm = () => -7;
    return r;
  }
  function makeAssertionResponse(clientDataJSON, authenticatorData, signature, userHandle) {
    const proto = AuthAssertionResponseCtor?.prototype || Object.prototype;
    const r = Object.create(proto);
    defineReadonly(r, { clientDataJSON, authenticatorData, signature, userHandle });
    return r;
  }
  function makePublicKeyCredential(id, response) {
    const proto = PublicKeyCredentialCtor?.prototype || Object.prototype;
    const cred = Object.create(proto);
    defineReadonly(cred, {
      id,
      rawId: fromBase64Url(id),
      type: "public-key",
      authenticatorAttachment: "platform",
      response
    });
    cred.getClientExtensionResults = () => ({});
    cred.toJSON = () => ({ id, rawId: id, type: "public-key", response: {} });
    return cred;
  }
  function toBuf(x) {
    if (!x)
      return new ArrayBuffer(0);
    if (x instanceof ArrayBuffer)
      return x;
    const v = x;
    const out = new Uint8Array(v.byteLength);
    out.set(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
    return out.buffer;
  }
  function failure(name, message) {
    const Ctor = globalThis.DOMException || Error;
    throw new Ctor(message, name);
  }
  const origCreate = globalThis.navigator.credentials.create.bind(globalThis.navigator.credentials);
  const origGet = globalThis.navigator.credentials.get.bind(globalThis.navigator.credentials);
  globalThis.navigator.credentials.create = async function(options) {
    if (!options || !options.publicKey)
      return origCreate(options);
    const pk = options.publicKey;
    const req = {
      type: "create",
      origin: globalThis.location.origin,
      challenge: toBase64Url(toBuf(pk.challenge)),
      rp: { id: pk.rp?.id, name: pk.rp?.name || "" },
      user: {
        id: toBase64Url(toBuf(pk.user?.id)),
        name: pk.user?.name || "",
        displayName: pk.user?.displayName || ""
      },
      pubKeyCredParams: (pk.pubKeyCredParams || []).map((p) => ({ type: p.type, alg: p.alg })),
      excludeCredentials: (pk.excludeCredentials || []).map((c) => ({ type: c.type, id: toBase64Url(toBuf(c.id)) })),
      userVerification: pk.authenticatorSelection?.userVerification,
      residentKey: pk.authenticatorSelection?.residentKey
    };
    const result = await binding(req);
    if (!result.ok)
      failure(result.name, result.message);
    const resp = makeAttestationResponse(fromBase64Url(result.clientDataJSON), fromBase64Url(result.attestationObject));
    return makePublicKeyCredential(result.id, resp);
  };
  globalThis.navigator.credentials.get = async function(options) {
    if (!options || !options.publicKey)
      return origGet(options);
    const pk = options.publicKey;
    const req = {
      type: "get",
      origin: globalThis.location.origin,
      challenge: toBase64Url(toBuf(pk.challenge)),
      rpId: pk.rpId || new URL(globalThis.location.origin).hostname,
      allowCredentials: (pk.allowCredentials || []).map((c) => ({ type: c.type, id: toBase64Url(toBuf(c.id)) })),
      userVerification: pk.userVerification
    };
    const result = await binding(req);
    if (!result.ok)
      failure(result.name, result.message);
    const resp = makeAssertionResponse(
      fromBase64Url(result.clientDataJSON),
      fromBase64Url(result.authenticatorData),
      fromBase64Url(result.signature),
      result.userHandle ? fromBase64Url(result.userHandle) : null
    );
    return makePublicKeyCredential(result.id, resp);
  };
  if (PublicKeyCredentialCtor) {
    PublicKeyCredentialCtor.isUserVerifyingPlatformAuthenticatorAvailable = async () => true;
    PublicKeyCredentialCtor.isConditionalMediationAvailable = async () => true;
  }
}
export {
  inject
};

//# sourceMappingURL=webAuthn.mjs.map
