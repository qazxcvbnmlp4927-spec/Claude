// ===== 구간과 지형 =====
// d: 출발점에서 바다 쪽으로 간 거리(칸). x: 수로 가운데가 0, 오른쪽이 +.
const STAGES = [
  { key: 'canal', name: '친수공원 수로', sub: '구경꾼 사이로 쓰레기와 카약을 피해요', len: 5000, speed: 128, half: 128,
    water: [62, 176, 164], pats: { fish: 3, trash: 3, bridge: 2.2, kayak: 2, narrow: 1.6, duck: 1.4 } },
  { key: 'dock', name: '북항 부두', sub: '예인선이 가로지르고 닻이 떨어져요', len: 5600, speed: 145, half: 152,
    water: [44, 150, 172], pats: { fish: 2.4, ship: 2.2, tug: 3, anchor: 2.2, drums: 2 } },
  { key: 'net', name: '방파제 그물길', sub: '그물 사이 틈으로 빠져나가요', len: 5000, speed: 145, half: 158,
    water: [34, 124, 170], pats: { net: 4, netMove: 2.6, netDouble: 1.6, buoys: 2, ghost: 1.4, fish: 2 } },
  { key: 'sea', name: '넓은 바다', sub: '기름띠와 해파리를 지나면 탈출!', len: 5600, speed: 160, half: 178,
    water: [24, 94, 156], pats: { oil: 3, jelly: 3, ghost: 1.4, boat: 2, oilPair: 1.6, fish: 2.4 } },
];
{
  let acc = 0;
  for (const st of STAGES) { st.start = acc; acc += st.len; st.end = acc; }
}
const TOTAL = STAGES[STAGES.length - 1].end;
const HARD = { narrow: 1, netDouble: 1, oilPair: 1, anchor: 1 };

function stageIndexAt(d) {
  for (let i = STAGES.length - 1; i >= 0; i--) if (d >= STAGES[i].start) return i;
  return 0;
}

const level = { ents: [], bank: [] };

// 물가 위치. l, r: 부캉이가 다닐 수 있는 물의 양 끝. vl, vr: 눈에 보이는 땅 끝 (배가 대어 있으면 다름)
function bankAt(d) {
  const b = level.bank;
  if (!b.length) return { l: -128, r: 128, vl: -128, vr: 128 };
  if (d <= b[0].d) return b[0];
  const last = b[b.length - 1];
  if (d >= last.d) return last;
  let lo = 0, hi = b.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (b[m].d <= d) lo = m; else hi = m;
  }
  const p = b[lo], q = b[hi];
  const t = smooth(clamp((d - p.d) / ((q.d - p.d) || 1), 0, 1));
  return { l: lerp(p.l, q.l, t), r: lerp(p.r, q.r, t), vl: lerp(p.vl, q.vl, t), vr: lerp(p.vr, q.vr, t) };
}
const B = (d, half, vhalf = half) => ({ d, l: -half, r: half, vl: -vhalf, vr: vhalf });
const mk = (type, x, d, o) => Object.assign({ type, x, d, r: 10, dead: false, t: 0, ph: 0 }, o);

function addFish(c, d0, n, cx, amp, gap) {
  const ph = c.R() * TAU;
  const lim = c.half - 22;
  let goldAt = -1;
  if (c.gold > 0 && c.t > 0.25 && c.R() < 0.35) { goldAt = (n / 2) | 0; c.gold--; }
  for (let i = 0; i < n; i++) {
    const x = clamp(cx + Math.sin(ph + i * 0.75) * amp, -lim, lim);
    const gold = i === goldAt;
    c.ents.push(mk(gold ? 'gold' : 'fish', x, d0 + i * gap, { r: gold ? 12 : 10, ang: c.R() * TAU, ph: c.R() * TAU }));
  }
}

// 겹치지 않게 흩어 놓기
function scatter(c, type, n, d0, span, minGap, extra, lim = c.half - 24) {
  const placed = [];
  for (let i = 0; i < n; i++) {
    for (let tries = 0; tries < 40; tries++) {
      const x = (c.R() * 2 - 1) * lim;
      const d = d0 + c.R() * span;
      if (placed.every((p) => Math.hypot(p.x - x, p.d - d) > minGap)) {
        const e = mk(type, x, d, extra ? extra() : {});
        placed.push(e); c.ents.push(e);
        break;
      }
    }
  }
  return placed;
}
const gapW = (c) => 104 - c.t * 22 + (c.mode === 'easy' ? 24 : 0);
const fewer = (c, n) => Math.max(2, c.mode === 'easy' ? n - 1 : n);

const PAT = {
  fish(c) {
    const n = 6 + ((c.R() * 3) | 0);
    addFish(c, c.d + 40, n, (c.R() - 0.5) * c.half, c.half * 0.45, 44);
    return c.d + 60 + n * 44;
  },
  // ---- 친수공원 수로 ----
  trash(c) {
    const n = fewer(c, 3 + Math.round(c.t * 3 + c.R()));
    scatter(c, 'trash', n, c.d + 30, 320, 66, () => ({ kind: ['bottle', 'bag', 'can'][(c.R() * 3) | 0], r: 11, rot: c.R() * TAU, ph: c.R() * TAU }));
    if (c.R() < 0.5) addFish(c, c.d + 70, 4, (c.R() - 0.5) * c.half, 26, 54);
    return c.d + 380;
  },
  bridge(c) {
    const dd = c.d + 150;
    c.ents.push(mk('bridge', 0, dd, { h: 62, style: (c.R() * 3) | 0 }));
    const xs = [-c.half / 3, c.half / 3];
    for (const x of xs) c.ents.push(mk('pier', x, dd, { r: c.t > 0.5 ? 16 : 14 }));
    const lane = [-c.half * 0.68, 0, c.half * 0.68][(c.R() * 3) | 0];
    addFish(c, dd - 70, 4, lane, 0, 46);
    return dd + 190;
  },
  kayak(c) {
    const dd = c.d + 170;
    const dir = c.R() < 0.5 ? -1 : 1;
    c.ents.push(mk('kayak', (c.R() - 0.5) * c.half, dd, { kind: 'kayak', hw: 24, hh: 8, vx: dir * (48 + c.t * 50), ph: c.R() * TAU }));
    let end = dd + 200;
    if (c.t > 0.45) {
      c.ents.push(mk('kayak', (c.R() - 0.5) * c.half, dd + 160, { kind: 'kayak', hw: 24, hh: 8, vx: -dir * (55 + c.t * 40), ph: c.R() * TAU }));
      end += 160;
    }
    addFish(c, dd - 110, 3, (c.R() - 0.5) * c.half, 30, 40);
    return end;
  },
  duck(c) {
    const dd = c.d + 160;
    const dir = c.R() < 0.5 ? -1 : 1;
    c.ents.push(mk('kayak', -dir * c.half * 0.5, dd, { kind: 'duck', hw: 17, hh: 14, vx: dir * (40 + c.t * 40), ph: c.R() * TAU }));
    c.ents.push(mk('kayak', dir * c.half * 0.5, dd + 120, { kind: 'duck', hw: 17, hh: 14, vx: -dir * (45 + c.t * 40), ph: c.R() * TAU }));
    addFish(c, dd + 20, 3, 0, 40, 40);
    return dd + 280;
  },
  narrow(c) {
    if (c.room < 700) return PAT.trash(c);
    const L = 560;
    const nh = 92 + (c.mode === 'easy' ? 14 : 0);
    c.bank.push(B(c.d, c.half), B(c.d + 130, nh), B(c.d + L - 130, nh), B(c.d + L, c.half));
    addFish(c, c.d + 150, 6, 0, nh * 0.45, 44);
    if (c.t > 0.3) {
      const s = c.R() < 0.5 ? -1 : 1;
      c.ents.push(mk('trash', s * (nh - 30), c.d + 250, { kind: 'bag', r: 11, rot: 0, ph: 1 }));
      c.ents.push(mk('trash', -s * (nh - 30), c.d + 380, { kind: 'bottle', r: 11, rot: 1, ph: 2 }));
    }
    return c.d + L + 30;
  },
  // ---- 북항 부두 ----
  ship(c) {
    if (c.room < 760) return PAT.drums(c);
    const side = c.R() < 0.5 ? -1 : 1;
    const L = 480 + c.R() * 140;
    const inner = 40 + (c.mode === 'easy' ? 14 : 0);
    const nb = (d) => {
      const p = B(d, c.half);
      if (side < 0) p.l = -inner; else p.r = inner;
      return p;
    };
    c.bank.push(B(c.d, c.half), nb(c.d + 100), nb(c.d + L - 100), B(c.d + L, c.half));
    c.ents.push(mk('ship', 0, c.d + L / 2, { side, d0: c.d + 20, d1: c.d + L - 20, inner, kind: (c.R() * 2) | 0, hue: (c.R() * 4) | 0 }));
    const mid = side < 0 ? (inner + c.half) / 2 : -(inner + c.half) / 2;
    addFish(c, c.d + 140, 5, mid, 36, 60);
    if (c.t > 0.35) c.ents.push(mk('drum', mid + (c.R() - 0.5) * 60, c.d + L * 0.62, { r: 13 }));
    return c.d + L + 30;
  },
  tug(c) {
    const dd = c.d + 220;
    const dir = c.R() < 0.5 ? 1 : -1;
    c.ents.push(mk('boat', 0, dd, { kind: 'tug', hw: 40, hh: 15, speed: 150 + c.t * 80 + c.R() * 30, dir, active: false }));
    let end = dd + 200;
    if (c.t > 0.4 && c.R() < 0.6) {
      c.ents.push(mk('boat', 0, dd + 190, { kind: 'tug', hw: 40, hh: 15, speed: 160 + c.t * 70, dir: -dir, active: false }));
      end += 190;
    }
    addFish(c, dd - 160, 3, (c.R() - 0.5) * c.half, 40, 44);
    return end;
  },
  anchor(c) {
    const n = c.t > 0.5 && c.mode !== 'easy' ? 3 : 2;
    for (let i = 0; i < n; i++) {
      c.ents.push(mk('anchor', 0, c.d + 160 + i * 170, { state: 'wait', r: 30, aim: (c.R() - 0.5) * 40 }));
    }
    addFish(c, c.d + 120, 4, (c.R() - 0.5) * c.half, 60, 70);
    return c.d + 160 + n * 170 + 40;
  },
  drums(c) {
    scatter(c, 'drum', fewer(c, 4 + Math.round(c.t * 3)), c.d + 30, 340, 74, () => ({ r: 13, rot: c.R() * TAU }));
    if (c.R() < 0.5) addFish(c, c.d + 60, 4, (c.R() - 0.5) * c.half, 40, 60);
    return c.d + 400;
  },
  // ---- 방파제 그물길 ----
  net(c) {
    const dd = c.d + 170;
    const w = gapW(c);
    const gc = (c.R() * 2 - 1) * (c.half - w / 2 - 22);
    c.ents.push(mk('net', 0, dd, { gaps: [{ c0: gc, w, amp: 0, spd: 0, ph: 0 }], thick: 10 }));
    addFish(c, dd - 90, 3, gc, 0, 45);
    return dd + 190;
  },
  netMove(c) {
    const dd = c.d + 190;
    const w = gapW(c) + 6;
    const amp = Math.min(76, c.half - w / 2 - 24);
    c.ents.push(mk('net', 0, dd, { gaps: [{ c0: 0, w, amp, spd: 0.85 + c.t * 0.55, ph: c.R() * TAU }], thick: 10 }));
    addFish(c, dd - 150, 3, (c.R() - 0.5) * 80, 30, 40);
    return dd + 200;
  },
  netDouble(c) {
    const dd = c.d + 170;
    const w = gapW(c) + 8;
    const s = c.R() < 0.5 ? -1 : 1;
    const g1 = s * (c.half - w / 2 - 26), g2 = -s * (c.half - w / 2 - 26);
    c.ents.push(mk('net', 0, dd, { gaps: [{ c0: g1, w, amp: 0, spd: 0, ph: 0 }], thick: 10 }));
    c.ents.push(mk('net', 0, dd + 190, { gaps: [{ c0: g2, w, amp: 0, spd: 0, ph: 0 }], thick: 10 }));
    addFish(c, dd + 40, 4, 0, (g2 - g1) / 2.2, 36);
    return dd + 380;
  },
  buoys(c) {
    scatter(c, 'buoy', fewer(c, 4 + Math.round(c.t * 3)), c.d + 30, 340, 72, () => ({ r: 12, ph: c.R() * TAU }));
    addFish(c, c.d + 60, 4, (c.R() - 0.5) * c.half, 50, 60);
    return c.d + 400;
  },
  ghost(c) {
    scatter(c, 'ghost', fewer(c, 2 + Math.round(c.t * 2)), c.d + 40, 300, 110, () => ({ r: 21, vx: (c.R() < 0.5 ? -1 : 1) * (12 + c.R() * 18), ph: c.R() * TAU }));
    return c.d + 380;
  },
  // ---- 넓은 바다 ----
  oil(c, at, cx) {
    const dd = at || c.d + 190;
    const x0 = cx != null ? cx : (c.R() * 2 - 1) * (c.half - 110);
    const blobs = [];
    const k = 4 + ((c.R() * 3) | 0);
    for (let i = 0; i < k; i++) blobs.push({ dx: (c.R() - 0.5) * 96, dd: (c.R() - 0.5) * 84, r: 24 + c.R() * 22 });
    c.ents.push(mk('oil', x0, dd, { blobs, r: 95, ph: c.R() * TAU }));
    if (!at) addFish(c, dd - 160, 3, x0 > 0 ? x0 - 150 : x0 + 150, 20, 50);
    return dd + 200;
  },
  oilPair(c) {
    const s = c.R() < 0.5 ? -1 : 1;
    PAT.oil(c, c.d + 150, s * (c.half - 92));
    PAT.oil(c, c.d + 360, -s * (c.half - 92));
    addFish(c, c.d + 200, 4, 0, 30, 50);
    return c.d + 560;
  },
  jelly(c) {
    scatter(c, 'jelly', fewer(c, 4 + Math.round(c.t * 3)), c.d + 30, 380, 70, () => ({ r: 13, vx: (c.R() - 0.5) * 34, ph: c.R() * TAU }));
    return c.d + 440;
  },
  boat(c) {
    const dd = c.d + 220;
    c.ents.push(mk('boat', 0, dd, { kind: 'fishing', hw: 48, hh: 17, speed: 115 + c.t * 50, dir: c.R() < 0.5 ? 1 : -1, active: false }));
    addFish(c, dd - 150, 4, (c.R() - 0.5) * c.half, 50, 44);
    return dd + 220;
  },
};

function pickPattern(c) {
  const entries = Object.entries(c.st.pats);
  let sum = 0;
  const ws = entries.map(([name, w]) => {
    if (name === c.last && name !== 'fish') w *= 0.2;
    if (c.t < 0.15 && HARD[name]) w *= 0.25;
    sum += w;
    return w;
  });
  let r = c.R() * sum;
  for (let i = 0; i < entries.length; i++) {
    r -= ws[i];
    if (r <= 0) return entries[i][0];
  }
  return entries[0][0];
}

function buildLevel(seed, mode) {
  const R = mulberry32(seed);
  const ents = [];
  const bank = [B(-3000, STAGES[0].half)];
  for (let si = 0; si < STAGES.length; si++) {
    const st = STAGES[si];
    if (si > 0) bank.push(B(st.start, STAGES[si - 1].half), B(st.start + 260, st.half));
    const c = { R, ents, bank, half: st.half, mode, st, d: st.start + (si === 0 ? 520 : 330), t: 0, room: 0, gold: mode === 'easy' ? 2 : 1, last: '' };
    while (c.d < st.end - 680) {
      c.t = (c.d - st.start) / st.len;
      c.room = st.end - 80 - c.d;
      const name = pickPattern(c);
      c.d = PAT[name](c) + 30 + R() * 70 * (1 - c.t);
      c.last = name;
    }
  }
  bank.push(B(TOTAL, STAGES[3].half), B(TOTAL + 900, 900));
  // 구간 경계를 덮는 다리 (수로 출구, 부두 끝 보행교)
  ents.push(mk('bridge', 0, STAGES[1].start, { h: 84, style: 0 }));
  ents.push(mk('bridge', 0, STAGES[2].start, { h: 46, style: 2 }));
  // 방파제 끝 등대 두 개
  const nst = STAGES[2];
  ents.push(mk('light', -1, nst.end - 120, { side: -1, color: 'white' }));
  ents.push(mk('light', 1, nst.end - 120, { side: 1, color: 'red' }));
  ents.sort((a, b) => a.d - b.d);
  return { ents, bank };
}
