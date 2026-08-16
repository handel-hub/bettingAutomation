function base64ByteLength(data) {
  if (!data)
    return 0;
  const padding = data[data.length - 2] === "=" ? 2 : data[data.length - 1] === "=" ? 1 : 0;
  return Math.max(0, Math.floor(data.length * 3 / 4) - padding);
}
export {
  base64ByteLength
};

//# sourceMappingURL=base64.mjs.map
