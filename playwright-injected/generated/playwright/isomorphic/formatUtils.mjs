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
export {
  bytesToString,
  msToString
};

//# sourceMappingURL=formatUtils.mjs.map
