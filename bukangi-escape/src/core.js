'use strict';
// ===== 기본 도구 =====
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 같은 입력이면 항상 같은 0~1 값 (배경 장식용)
function hash2(a, b) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 0x9e37, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const store = {
  get(k, d) {
    try { const v = localStorage.getItem('bukangi:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('bukangi:' + k, JSON.stringify(v)); } catch (e) { /* 저장 불가: 무시 */ }
  },
};
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// ===== 화면 =====
// 게임 세상의 길이 단위는 '칸'. 화면에는 최소 가로 360칸 × 세로 700칸이 보인다.
const cvs = $('game');
const ctx = cvs.getContext('2d');
if (window.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}
const view = { dpr: 1, s: 1, w: 360, h: 700, cw: 1, ch: 1 };
function resize() {
  const r = cvs.getBoundingClientRect();
  view.cw = Math.max(1, r.width);
  view.ch = Math.max(1, r.height);
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = Math.round(view.cw * view.dpr);
  cvs.height = Math.round(view.ch * view.dpr);
  view.s = Math.min(view.ch / 700, view.cw / 360);
  view.w = view.cw / view.s;
  view.h = view.ch / view.s;
}

// ===== 소리 (모두 직접 합성) =====
const audio = {
  ac: null, master: null, sfxBus: null, musicBus: null, noiseBuf: null,
  on: store.get('sound', true), music: false, step: 0, nextT: 0, timer: 0,
  ensure() {
    if (!this.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ac = new AC();
        this.master = this.ac.createGain();
        this.master.gain.value = this.on ? 0.8 : 0;
        this.master.connect(this.ac.destination);
        this.sfxBus = this.ac.createGain();
        this.sfxBus.connect(this.master);
        this.musicBus = this.ac.createGain();
        this.musicBus.gain.value = 0.3;
        this.musicBus.connect(this.master);
        const len = Math.floor(this.ac.sampleRate * 1);
        this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
        const ch = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      } catch (e) { this.ac = null; return; }
    }
    if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
  },
  setOn(v) {
    this.on = v;
    store.set('sound', v);
    if (this.ac) this.master.gain.setTargetAtTime(v ? 0.8 : 0, this.ac.currentTime, 0.03);
  },
  tone(f, dur, type = 'sine', vol = 0.15, f2 = 0, delay = 0, bus) {
    if (!this.ac || !this.on) return;
    const t = this.ac.currentTime + delay;
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol, freq, type = 'bandpass', f2 = 0, delay = 0, q = 1) {
    if (!this.ac || !this.on) return;
    const t = this.ac.currentTime + delay;
    const src = this.ac.createBufferSource();
    src.buffer = this.noiseBuf;
    const fl = this.ac.createBiquadFilter();
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(freq, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = this.ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(this.sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  },
  sfx(name) {
    if (!this.ac || !this.on) return;
    switch (name) {
      case 'eat': this.tone(620, 0.07, 'square', 0.05, 980); this.tone(980, 0.08, 'square', 0.04, 1320, 0.05); break;
      case 'gold': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.12, 0, i * 0.07)); break;
      case 'hit': this.noise(0.28, 0.5, 500, 'lowpass', 120); this.tone(170, 0.3, 'sawtooth', 0.12, 55); break;
      case 'dash': this.noise(0.38, 0.22, 380, 'bandpass', 2400, 0, 0.8); break;
      case 'splash': this.noise(0.5, 0.4, 1400, 'lowpass', 180); break;
      case 'tangle': this.tone(240, 0.12, 'square', 0.08, 170); this.tone(200, 0.16, 'square', 0.08, 140, 0.1); break;
      case 'mash': this.tone(300 + Math.random() * 140, 0.05, 'square', 0.04); break;
      case 'free': this.tone(523, 0.2, 'triangle', 0.14, 1046); this.noise(0.2, 0.15, 2000, 'highpass'); break;
      case 'photo': this.noise(0.025, 0.12, 3500, 'highpass'); this.noise(0.03, 0.09, 2500, 'highpass', 0, 0.045); break;
      case 'warn': this.tone(880, 0.07, 'square', 0.05); this.tone(880, 0.07, 'square', 0.05, 0, 0.12); break;
      case 'near': this.tone(1250, 0.06, 'sine', 0.06, 1600); break;
      case 'stage': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.12, 0, i * 0.09)); break;
      case 'over': this.tone(392, 0.5, 'triangle', 0.16, 196); this.tone(294, 0.7, 'triangle', 0.12, 147, 0.25); break;
      case 'clear': [523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.13, 0, i * 0.12)); break;
      case 'bump': this.tone(140, 0.08, 'sine', 0.08, 90); break;
      case 'click': this.tone(700, 0.04, 'sine', 0.05); break;
    }
  },
  // 배경 음악: 8분음표 32칸짜리 반복 (C 펜타토닉)
  MEL: [76, 0, 79, 81, 79, 0, 76, 74, 72, 0, 74, 76, 74, 0, 72, 69, 72, 0, 76, 79, 81, 0, 79, 76, 74, 76, 74, 72, 74, 0, 0, 0],
  BASS: [48, 55, 45, 52, 41, 48, 43, 50],
  startMusic() {
    if (!this.ac || this.music) return;
    this.music = true;
    this.nextT = this.ac.currentTime + 0.1;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 80);
  },
  stopMusic() { this.music = false; clearInterval(this.timer); },
  schedule() {
    if (!this.ac || !this.music) return;
    const beat = 0.27;
    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
    while (this.nextT < this.ac.currentTime + 0.3) {
      const i = this.step % 32;
      const delay = Math.max(0, this.nextT - this.ac.currentTime);
      const n = this.MEL[i];
      if (n && this.on) this.tone(midi(n), beat * 0.9, 'triangle', 0.09, 0, delay, this.musicBus);
      if (i % 4 === 0 && this.on) this.tone(midi(this.BASS[(i / 4) | 0]), beat * 1.8, 'sine', 0.13, 0, delay, this.musicBus);
      if (i % 2 === 1 && this.on) this.noise(0.03, 0.025, 6000, 'highpass', 0, delay);
      this.nextT += beat;
      this.step++;
    }
  },
};

// ===== 입력 =====
const input = { keys: new Set(), dragDX: 0, dragDY: 0, pid: null, lx: 0, ly: 0, dashQ: false, mashQ: 0 };
