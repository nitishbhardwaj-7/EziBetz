import { Platform } from "react-native";

type WaveType = "sine" | "square" | "sawtooth" | "triangle";

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  try {
    const W = window as any;
    const Ctor = W.AudioContext || W.webkitAudioContext;
    if (!Ctor) return null;
    if (!_ctx) _ctx = new Ctor() as AudioContext;
    return _ctx;
  } catch {
    return null;
  }
}

async function tone(
  freq: number,
  duration: number,
  startDelayMs = 0,
  wave: WaveType = "sine",
  gainPeak = 0.28
) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    // Always resume — safe to call even if already running
    if (ctx.state === "suspended") await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = wave;
    const t = ctx.currentTime + startDelayMs / 1000;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainPeak, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  } catch {
    // silently ignore — some browsers block even after resume
  }
}

export function useGameSound() {
  const playWin = () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, i * 100, "sine", 0.32));
  };

  const playJackpot = () => {
    [523, 659, 784, 880, 1047, 1319, 1568].forEach((f, i) => {
      tone(f, 0.3, i * 100, "sine", 0.42);
      tone(f * 0.5, 0.28, i * 100, "sine", 0.18);
    });
  };

  const playLose = () => {
    tone(320, 0.25, 0, "sawtooth", 0.2);
    tone(260, 0.28, 180, "sawtooth", 0.16);
    tone(200, 0.35, 380, "sawtooth", 0.13);
  };

  const playRoll = () => {
    for (let i = 0; i < 10; i++) {
      tone(180 + Math.random() * 300, 0.06, i * 55, "square", 0.11);
    }
  };

  const playSpin = () => {
    for (let i = 0; i < 14; i++) {
      tone(260 + i * 35, 0.09, i * 70, "sawtooth", 0.09);
    }
  };

  const playDeal = () => {
    tone(900, 0.07, 0, "square", 0.2);
    tone(650, 0.07, 90, "square", 0.14);
  };

  const playClick = () => {
    tone(480, 0.06, 0, "sine", 0.18);
  };

  const playDrum = () => {
    for (let i = 0; i < 6; i++) {
      tone(90, 0.1, i * 110, "square", 0.35);
      tone(130, 0.08, i * 110 + 30, "sawtooth", 0.22);
    }
  };

  const playReveal = () => {
    tone(660, 0.08, 0, "sine", 0.18);
    tone(880, 0.08, 70, "sine", 0.16);
  };

  return { playWin, playJackpot, playLose, playRoll, playSpin, playDeal, playClick, playDrum, playReveal };
}
