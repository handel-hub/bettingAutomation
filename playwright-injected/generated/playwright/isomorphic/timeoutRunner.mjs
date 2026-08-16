import { monotonicTime } from "./time.mjs";
async function raceAgainstDeadline(cb, deadline) {
  let timer;
  return await Promise.race([
    cb().then((result) => {
      return { result, timedOut: false };
    }),
    new Promise((resolve) => {
      if (!deadline)
        return;
      timer = setTimeout(() => resolve({ timedOut: true }), deadline - monotonicTime());
    })
  ]).finally(() => {
    clearTimeout(timer);
  });
}
async function pollAgainstDeadline(callback, deadline, [...pollIntervals] = [100, 250, 500, 1e3]) {
  const lastPollInterval = pollIntervals.pop() ?? 1e3;
  let lastResult;
  const wrappedCallback = () => Promise.resolve().then(callback);
  while (true) {
    const time = monotonicTime();
    if (deadline && time >= deadline)
      break;
    const received = await raceAgainstDeadline(wrappedCallback, deadline);
    if (received.timedOut)
      break;
    lastResult = received.result.result;
    if (!received.result.continuePolling)
      return { result: lastResult, timedOut: false };
    const interval = pollIntervals.shift() ?? lastPollInterval;
    if (deadline && deadline <= monotonicTime() + interval)
      break;
    await new Promise((x) => setTimeout(x, interval));
  }
  return { timedOut: true, result: lastResult };
}
export {
  pollAgainstDeadline,
  raceAgainstDeadline
};

//# sourceMappingURL=timeoutRunner.mjs.map
