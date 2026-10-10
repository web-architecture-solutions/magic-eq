import { analyzeChannels } from "../dsp/analyze.js";

self.onmessage = (e) => {
  const { channels, sampleRate, opts } = e.data;
  try {
    const analysis = analyzeChannels(channels, sampleRate, opts, (value) => {
      self.postMessage({ type: "progress", value });
    });
    const transfer = [
      analysis.bandPower.buffer,
      analysis.bandDb.buffer,
      analysis.S.buffer,
      analysis.frameRmsDb.buffer,
      analysis.active.buffer,
      analysis.erb.energies.buffer,
      analysis.erb.meanDb.buffer,
      analysis.framePeaksDb.buffer,
    ];
    self.postMessage({ type: "done", analysis }, transfer);
  } catch (err) {
    self.postMessage({ type: "error", message: String(err?.message || err) });
  }
};
