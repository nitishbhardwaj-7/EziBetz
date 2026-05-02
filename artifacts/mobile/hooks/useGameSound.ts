import { Platform } from "react-native";

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    if (!_ctx) {
      _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  duration: number,
  startAt: number,
  type: OscillatorType = "sine",
  gainPeak = 0.3
) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
  gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
  gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
  osc.start(ctx.currentTime + startAt);
  osc.stop(ctx.currentTime + startAt + duration + 0.01);
}

export function useGameSound() {
  const playWin = () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, 0.22, i * 0.1, "sine", 0.35));
  };

  const playJackpot = () => {
    const notes = [523, 659, 784, 880, 1047, 1319, 1568];
    notes.forEach((f, i) => {
      tone(f, 0.3, i * 0.1, "sine", 0.45);
      tone(f * 0.5, 0.3, i * 0.1, "sine", 0.2);
    });
  };

  const playLose = () => {
    tone(320, 0.25, 0, "sawtooth", 0.22);
    tone(260, 0.28, 0.18, "sawtooth", 0.18);
    tone(200, 0.35, 0.38, "sawtooth", 0.15);
  };

  const playRoll = () => {
    for (let i = 0; i < 10; i++) {
      const f = 180 + Math.random() * 300;
      tone(f, 0.06, i * 0.055, "square", 0.12);
    }
  };

  const playSpin = () => {
    for (let i = 0; i < 14; i++) {
      tone(260 + i * 35, 0.09, i * 0.07, "sawtooth", 0.1);
    }
  };

  const playDeal = () => {
    tone(900, 0.07, 0, "square", 0.22);
    tone(650, 0.07, 0.09, "square", 0.16);
  };

  const playClick = () => {
    tone(480, 0.06, 0, "sine", 0.2);
  };

  const playDrum = () => {
    for (let i = 0; i < 6; i++) {
      tone(90, 0.1, i * 0.11, "square", 0.38);
      tone(130, 0.08, i * 0.11 + 0.03, "sawtooth", 0.25);
    }
  };

  const playReveal = () => {
    tone(660, 0.08, 0, "sine", 0.2);
    tone(880, 0.08, 0.07, "sine", 0.18);
  };

  return { playWin, playJackpot, playLose, playRoll, playSpin, playDeal, playClick, playDrum, playReveal };
}
