import { analyzeChannels } from "../dsp/analyze.js";

// Runs analyzeStem in a dedicated Worker, transferring the mono array in.
// Falls back to the main thread if Workers are unavailable.
export function analyzeInWorker(channels, sampleRate, opts = {}, onProgress) {
  if (typeof Worker === "undefined") {
    return Promise.resolve(analyzeChannels(channels, sampleRate, opts, onProgress));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./analysis.worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "progress") {
        onProgress?.(msg.value);
      } else if (msg.type === "done") {
        worker.terminate();
        resolve(msg.analysis);
      } else if (msg.type === "error") {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err.error || new Error(err.message || "analysis worker failed"));
    };
    worker.postMessage({ channels, sampleRate, opts }, channels.map((c) => c.buffer));
  });
}
