import { buildStemChain } from "./graph.js";

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
    this.masterTrim = ctx.createGain();
    this.master.disconnect();
    this.master.connect(this.masterTrim);
    this.masterTrim.connect(ctx.destination);
    this.masterAnalyser = ctx.createAnalyser();
    this.masterAnalyser.fftSize = 8192;
    this.masterAnalyser.smoothingTimeConstant = 0;
    this.masterTrim.connect(this.masterAnalyser);
    this._meterBuf = new Float32Array(8192);
  }

  setMasterTrimDb(db) {
    this.masterTrim.gain.setTargetAtTime(Math.pow(10, (db || 0) / 20), this.ctx.currentTime, 0.02);
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
    return { stems, master: read(this.masterAnalyser) };
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
    this.masterAnalyser.disconnect();
  }
}
