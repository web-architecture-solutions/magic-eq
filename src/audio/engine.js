import { buildStemChain } from "./graph.js";
import { kWeightingCoefficients } from "../dsp/loudness.js";

const START_LATENCY = 0.05;

// Live playback of all stems through their chains, summed into a master bus.
// Specs are pushed from React; the engine diffs nothing and simply applies.
export class LiveEngine {
  constructor(ctx) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.chains = new Map(); // id -> chain
    this.specs = new Map(); // id -> { ...spec, timeline }
    this.duration = 0;
    this.playing = false;
    this.startCtx = 0;
    this.startOffset = 0;
    this.pausedOffset = 0;
    this.onEnded = null;
    this._endTimer = null;
    // master -> master trim (part of the mix, exported) -> monitor (listening
    // level only, never exported) -> speakers. The monitor is forced to
    // stereo so a mono session meters the way it plays: on both speakers.
    this.masterTrim = ctx.createGain();
    this.monitor = ctx.createGain();
    this.monitor.channelCount = 2;
    this.monitor.channelCountMode = "explicit";
    this.monitor.channelInterpretation = "speakers";
    this.master.disconnect();
    this.master.connect(this.masterTrim);
    this.masterTrim.connect(this.monitor);
    this.monitor.connect(ctx.destination);
    this.masterAnalyser = ctx.createAnalyser();
    this.masterAnalyser.fftSize = 8192;
    this.masterAnalyser.smoothingTimeConstant = 0;
    this.monitor.connect(this.masterAnalyser);
    this._meterBuf = new Float32Array(8192);
    this._buildLoudnessMeter();
  }

  // BS.1770 K-weighting per channel (one 4th-order IIR: shelf * high-pass),
  // tapped after the monitor, so it reads what you hear.
  _buildLoudnessMeter() {
    const { shelf, hp } = kWeightingCoefficients(this.ctx.sampleRate);
    const mul = (p, q) => [p[0] * q[0], p[0] * q[1] + p[1] * q[0], p[0] * q[2] + p[1] * q[1] + p[2] * q[0], p[1] * q[2] + p[2] * q[1], p[2] * q[2]];
    const ff = mul([shelf.b0, shelf.b1, shelf.b2], [hp.b0, hp.b1, hp.b2]);
    const fb = mul([1, shelf.a1, shelf.a2], [1, hp.a1, hp.a2]);
    this.kSplit = this.ctx.createChannelSplitter(2);
    this.monitor.connect(this.kSplit);
    this.kAnalysers = [0, 1].map((ch) => {
      const iir = this.ctx.createIIRFilter(ff, fb);
      const an = this.ctx.createAnalyser();
      an.fftSize = 4096;
      an.smoothingTimeConstant = 0;
      this.kSplit.connect(iir, ch);
      iir.connect(an);
      return { iir, an };
    });
    this._kBuf = new Float32Array(4096);
    this._kRing = [];
  }

  resetLoudness() {
    this._kRing = [];
  }

  setMasterTrimDb(db) {
    this.masterTrim.gain.setTargetAtTime(Math.pow(10, (db || 0) / 20), this.ctx.currentTime, 0.02);
  }

  setMonitorDb(db) {
    this.monitor.gain.setTargetAtTime(Math.pow(10, (db || 0) / 20), this.ctx.currentTime, 0.01);
  }

  // Momentary (~0.4 s) and short-term (3 s) loudness of what is playing,
  // from the K-weighted taps, one reading per meter tick (100 ms).
  _loudness() {
    let p = 0;
    for (const { an } of this.kAnalysers) {
      an.getFloatTimeDomainData(this._kBuf);
      let acc = 0;
      for (let i = 0; i < this._kBuf.length; i++) acc += this._kBuf[i] * this._kBuf[i];
      p += acc / this._kBuf.length;
    }
    this._kRing.push(p);
    if (this._kRing.length > 30) this._kRing.shift();
    const lufs = (n) => {
      const r = this._kRing.slice(-n);
      const m = r.reduce((a, b) => a + b, 0) / r.length;
      return m > 0 ? -0.691 + 10 * Math.log10(m) : -Infinity;
    };
    return { lufsM: lufs(4), lufsS: lufs(30), lufsSFull: this._kRing.length >= 30 };
  }

  // Mono-average RMS and peak (dBFS) per stem and on the master, read from
  // AnalyserNode taps. fftSize 8192 covers more than one 100 ms tick.
  meters() {
    const read = (an) => {
      an.getFloatTimeDomainData(this._meterBuf);
      let acc = 0;
      let pk = 0;
      for (let i = 0; i < this._meterBuf.length; i++) {
        const v = this._meterBuf[i];
        acc += v * v;
        const a = v < 0 ? -v : v;
        if (a > pk) pk = a;
      }
      const rms = Math.sqrt(acc / this._meterBuf.length);
      return { rmsDb: rms > 0 ? 20 * Math.log10(rms) : -120, peakDb: pk > 0 ? 20 * Math.log10(pk) : -120 };
    };
    const stems = {};
    for (const [id, chain] of this.chains) if (chain.analyser) stems[id] = read(chain.analyser);
    return { stems, master: { ...read(this.masterAnalyser), ...this._loudness() } };
  }

  load(stems) {
    const keep = new Set(stems.map((s) => s.id));
    for (const [id, chain] of this.chains) {
      if (!keep.has(id)) {
        chain.analyser?.disconnect();
        chain.dispose();
        this.chains.delete(id);
        this.specs.delete(id);
      }
    }
    this.duration = 0;
    for (const s of stems) {
      this.duration = Math.max(this.duration, s.buffer.duration);
      if (this.chains.has(s.id)) continue;
      const chain = buildStemChain(this.ctx, s.buffer, null);
      chain.out.connect(this.master);
      chain.analyser = this.ctx.createAnalyser();
      chain.analyser.fftSize = 8192;
      chain.analyser.smoothingTimeConstant = 0;
      chain.out.connect(chain.analyser);
      this.chains.set(s.id, chain);
    }
  }

  // specs: [{ id, faderDb, makeupDb, gains, timeline, bypass, muted }]
  update(specs) {
    for (const spec of specs) {
      const chain = this.chains.get(spec.id);
      if (!chain) continue;
      this.specs.set(spec.id, spec);
      chain.setStatic(spec);
      if (this.playing && spec.timeline) {
        chain.schedule(spec.timeline, this.startCtx - this.startOffset, this.position());
      } else if (spec.timeline) {
        chain.setGains(spec.timeline.initial);
      } else {
        chain.setGains(spec.gains);
      }
    }
  }

  async play(offset = this.pausedOffset) {
    if (this.ctx.state !== "running") await this.ctx.resume();
    this.stopSources();
    this.resetLoudness();
    const when = this.ctx.currentTime + START_LATENCY;
    this.startCtx = when;
    this.startOffset = Math.max(0, Math.min(offset, this.duration));
    for (const [id, chain] of this.chains) {
      chain.start(when, this.startOffset);
      const spec = this.specs.get(id);
      if (spec?.timeline) chain.schedule(spec.timeline, when - this.startOffset, this.startOffset);
    }
    this.playing = true;
    clearTimeout(this._endTimer);
    const remaining = this.duration - this.startOffset + START_LATENCY;
    this._endTimer = setTimeout(() => {
      if (this.playing) {
        this.stop();
        this.pausedOffset = 0;
        this.onEnded?.();
      }
    }, remaining * 1000 + 50);
  }

  stop() {
    if (this.playing) this.pausedOffset = this.position();
    this.stopSources();
    this.playing = false;
    clearTimeout(this._endTimer);
  }

  seek(offset) {
    const wasPlaying = this.playing;
    this.stopSources();
    this.playing = false;
    clearTimeout(this._endTimer);
    this.pausedOffset = Math.max(0, Math.min(offset, this.duration));
    if (wasPlaying) return this.play(this.pausedOffset);
    return Promise.resolve();
  }

  position() {
    if (!this.playing) return this.pausedOffset;
    const p = this.startOffset + (this.ctx.currentTime - this.startCtx);
    return Math.max(0, Math.min(p, this.duration));
  }

  stopSources() {
    for (const chain of this.chains.values()) chain.stop();
  }

  dispose() {
    this.stop();
    for (const chain of this.chains.values()) chain.dispose();
    this.chains.clear();
    this.specs.clear();
    this.master.disconnect();
    this.masterTrim.disconnect();
    this.monitor.disconnect();
    this.masterAnalyser.disconnect();
    this.kSplit.disconnect();
    for (const { iir, an } of this.kAnalysers) {
      iir.disconnect();
      an.disconnect();
    }
  }
}
