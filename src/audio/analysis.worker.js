import { analyzeStem } from "../dsp/analyze.js";

self.onmessage = (e) => {
  const { mono, sampleRate, opts } = e.data;
  try {
    const analysis = analyzeStem(mono, sampleRate, opts, (value) => {
      self.postMessage({ type: "progress", value });
    });
    const transfer = [
      analysis.bandPower.buffer,
      analysis.bandDb.buffer,
      analysis.S.buffer,
      analysis.E.buffer,
      analysis.frameRmsDb.buffer,
    ];
    self.postMessage({ type: "done", analysis }, transfer);
  } catch (err) {
    self.postMessage({ type: "error", message: String(err?.message || err) });
  }
};
