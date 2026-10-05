let live = null;

// One live AudioContext at the session's sample rate. Created suspended;
// resumeLive() must be called from a user gesture before playback.
export function getLiveContext(sampleRate) {
  if (live && sampleRate && live.sampleRate !== sampleRate) {
    live.close().catch(() => {});
    live = null;
  }
  if (!live) {
    live = sampleRate ? new AudioContext({ sampleRate }) : new AudioContext();
  }
  return live;
}

export async function resumeLive() {
  if (live && live.state !== "running") await live.resume();
  return live;
}

export async function closeLive() {
  if (live) {
    const c = live;
    live = null;
    await c.close().catch(() => {});
  }
}

export function dbToGain(db) {
  return Math.pow(10, db / 20);
}
