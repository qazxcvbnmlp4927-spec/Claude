// ===== 그리기: 물, 땅, 다리, 배 =====
const SY = (d) => view.h - (d - game.camD);
const C = {
  pave: '#d8cdb8', wall: '#9a9387', wallDark: '#4f5d59', rail: '#f6f1e7',
  grass: '#a3cb8c', tree: '#6aa966', tree2: '#58975a', road: '#5d6268', roadLine: '#ece8dc',
  quay: '#b7bab9', quayEdge: '#737a7c', safety: '#e8c547', bollard: '#3a4044', rail2: '#8a8f92',
  brk: '#aeb1ab', tetra: '#cdd0c9', tetraShade: '#8b908a',
  roofs: ['#e7e2d8', '#c8d2db', '#efcaa6', '#b9c8b1', '#d7c3d6', '#f2e3b3', '#c4cfd8'],
  shirts: ['#ff6b6b', '#ffd166', '#4dabf7', '#ffffff', '#69db7c', '#f783ac', '#845ef7', '#ff922b', '#343a40', '#20c997'],
  hair: ['#2b2420', '#3b2a20', '#14110f', '#6b4a2f'],
  boxes: ['#d9544d', '#3f7fbf', '#e3a33b', '#4a9a6a', '#8e5fb0', '#2f9aa0', '#c2c7cc'],
};
const rgb = (c, k = 1) => `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
const mixC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function waterAt(d) {
  const i = stageIndexAt(d);
  const st = STAGES[i];
  let c = st.water;
  if (i > 0 && d < st.start + 300) c = mixC(STAGES[i - 1].water, st.water, smooth(clamp((d - st.start + 300) / 600, 0, 1)));
  else if (i < STAGES.length - 1 && d > st.end - 300) c = mixC(st.water, STAGES[i + 1].water, smooth(clamp((d - st.end + 300) / 600, 0, 1)));
  if (d > TOTAL - 200) c = mixC(c, [18, 78, 150], smooth(clamp((d - TOTAL + 200) / 900, 0, 1)));
  return c;
}

function drawWater() {
  const g = game, top = g.camD + view.h, W = view.w / 2 + 30;
  const grad = ctx.createLinearGradient(0, view.h, 0, 0);
  grad.addColorStop(0, rgb(waterAt(g.camD)));
  grad.addColorStop(0.5, rgb(waterAt(g.camD + view.h / 2)));
  grad.addColorStop(1, rgb(waterAt(top)));
  ctx.fillStyle = grad;
  ctx.fillRect(-W, -30, W * 2, view.h + 60);
  // 잔물결
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  const cw = 92, chh = 64;
  const i0 = Math.floor(-W / cw), i1 = Math.ceil(W / cw);
  const j0 = Math.floor((g.camD - 40) / chh), j1 = Math.ceil((top + 40) / chh);
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const h = hash2(i, j);
      const x = i * cw + h * cw, d = j * chh + hash2(j, i + 77) * chh;
      const y = SY(d);
      const len = 10 + h * 16;
      const wob = Math.sin(g.time * 1.4 + h * 20) * 3;
      ctx.strokeStyle = `rgba(255,255,255,${0.08 + 0.12 * hash2(i + 5, j - 3)})`;
      ctx.beginPath();
      ctx.moveTo(x - len, y + wob * 0.3);
      ctx.quadraticCurveTo(x - len / 2, y - 3 + wob * 0.5, x, y + wob * 0.3);
      ctx.quadraticCurveTo(x + len / 2, y + 3 + wob * 0.5, x + len, y + wob * 0.3);
      ctx.stroke();
    }
  }
}

// ---- 장식 (같은 칸이면 항상 같은 모양) ----
const decoCache = new Map();
function decoSeg(key, k, s) {
  const id = key + ':' + k + ':' + s;
  let v = decoCache.get(id);
  if (v) return v;
  if (decoCache.size > 800) decoCache.clear();
  v = [];
  const h = (n) => hash2(k * 31 + n * 7, s * 977 + key.charCodeAt(0) * 13 + n);
  const d0 = k * 100;
  if (key === 'canal') {
    const n = 7 + ((h(1) * 5) | 0);
    for (let i = 0; i < n; i++) {
      v.push({ t: 'p', d: d0 + h(i + 10) * 100, o: 10 + Math.pow(h(i + 40), 1.6) * 34, c: C.shirts[(h(i + 70) * C.shirts.length) | 0], hc: C.hair[(h(i + 99) * 4) | 0], ph: h(i + 130), phone: h(i + 160) < 0.45 });
    }
    for (let i = 0; i < 2; i++) v.push({ t: 'tree', d: d0 + 22 + i * 52 + h(i + 200) * 10, o: 68 + h(i + 210) * 12, r: 10 + h(i + 220) * 6 });
    let o = 150, j = 0;
    const len = 62 + h(320) * 26;
    while (o < 700) {
      const w = 46 + h(300 + j) * 74;
      v.push({ t: 'bld', d: d0 + 50, o: o + w / 2, w, len, c: C.roofs[(h(340 + j) * C.roofs.length) | 0], ac: h(360 + j) });
      o += w + 12 + h(380 + j) * 14; j++;
    }
  } else if (key === 'dock') {
    v.push({ t: 'bollard', d: d0 + 50, o: 6 });
    if (h(2) < 0.25) v.push({ t: 'p', d: d0 + h(3) * 100, o: 14 + h(4) * 16, c: '#ff8a1f', hc: '#f4f4f4', ph: h(5) });
    let o = 70, j = 0;
    while (o < 700) {
      const rows = 2 + ((h(400 + j) * 3) | 0);
      for (let r = 0; r < rows; r++) {
        if (h(450 + j * 5 + r) < 0.18) continue;
        v.push({ t: 'box', d: d0 + 12 + r * 24, o: o + 22, w: 44, len: 18, c: C.boxes[(h(500 + j * 5 + r) * C.boxes.length) | 0] });
      }
      o += 56 + (h(600 + j) < 0.3 ? 40 : 0); j++;
    }
  } else if (key === 'net') {
    for (let i = 0; i < 4; i++) v.push({ t: 'tetra', d: d0 + i * 25 + h(i + 20) * 8, o: 7 + h(i + 30) * 6, a: h(i + 40) * TAU });
    if (h(9) < 0.5) v.push({ t: 'tetra', d: d0 + 50, o: 20, a: h(11) * TAU });
  }
  decoCache.set(id, v);
  return v;
}

// 물가를 따라가는 띠 모양 (o1~o2: 물가에서 땅 쪽으로 떨어진 거리)
function bandPath(samples, s, o1, o2) {
  ctx.beginPath();
  for (let i = 0; i < samples.length; i++) {
    const [d, b] = samples[i];
    const e = s < 0 ? b.vl : b.vr;
    const x = e + s * o1;
    if (i === 0) ctx.moveTo(x, SY(d)); else ctx.lineTo(x, SY(d));
  }
  for (let i = samples.length - 1; i >= 0; i--) {
    const [d, b] = samples[i];
    const e = s < 0 ? b.vl : b.vr;
    ctx.lineTo(o2 === Infinity ? s * (view.w / 2 + 40) : e + s * o2, SY(d));
  }
  ctx.closePath();
}
function edgePath(samples, s, o) {
  ctx.beginPath();
  for (let i = 0; i < samples.length; i++) {
    const [d, b] = samples[i];
    const x = (s < 0 ? b.vl : b.vr) + s * o;
    if (i === 0) ctx.moveTo(x, SY(d)); else ctx.lineTo(x, SY(d));
  }
}

function drawLand() {
  const g = game;
  const lo = g.camD - 40, hi = g.camD + view.h + 40;
  for (let si = 0; si < STAGES.length; si++) {
    const st = STAGES[si];
    const a = Math.max(lo, st.start), b = Math.min(hi, st.end);
    if (a >= b) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-view.w, SY(b), view.w * 2, SY(a) - SY(b));
    ctx.clip();
    const samples = [];
    for (let d = a - 14; d <= b + 14; d += 14) samples.push([d, bankAt(d)]);
    for (const s of [-1, 1]) drawLandSide(st, samples, s, a, b);
    ctx.restore();
  }
}

function drawLandSide(st, samples, s, a, b) {
  const key = st.key;
  if (key === 'sea') {
    // 항로 끝을 알리는 부표 줄
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    edgePath(samples, s, 4);
    ctx.stroke();
    ctx.setLineDash([]);
    bandPath(samples, s, 6, Infinity);
    ctx.fillStyle = 'rgba(4,22,48,0.22)';
    ctx.fill();
    const k0 = Math.floor(a / 46), k1 = Math.ceil(b / 46);
    for (let k = k0; k <= k1; k++) {
      const d = k * 46;
      if (d > TOTAL - 40) continue;
      const bk = bankAt(d), x = (s < 0 ? bk.vl : bk.vr) + s * 4, y = SY(d) + Math.sin(game.time * 2 + k) * 1.5;
      ctx.fillStyle = k % 2 ? '#ffd35c' : '#ff7a33';
      ctx.beginPath(); ctx.arc(x, y, 4.2, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(x - 1.2, y - 1.2, 1.3, 0, TAU); ctx.fill();
    }
    return;
  }
  if (key === 'canal') {
    bandPath(samples, s, 0, Infinity); ctx.fillStyle = C.pave; ctx.fill();
    bandPath(samples, s, 50, 94); ctx.fillStyle = C.grass; ctx.fill();
    bandPath(samples, s, 94, 138); ctx.fillStyle = C.road; ctx.fill();
    ctx.strokeStyle = C.roadLine; ctx.lineWidth = 1.5; ctx.setLineDash([10, 10]);
    edgePath(samples, s, 116); ctx.stroke(); ctx.setLineDash([]);
    bandPath(samples, s, 0, 7); ctx.fillStyle = C.wall; ctx.fill();
    ctx.strokeStyle = C.wallDark; ctx.lineWidth = 2; edgePath(samples, s, 0); ctx.stroke();
    ctx.strokeStyle = C.rail; ctx.lineWidth = 1.4; edgePath(samples, s, 8.5); ctx.stroke();
  } else if (key === 'dock') {
    bandPath(samples, s, 0, Infinity); ctx.fillStyle = C.quay; ctx.fill();
    ctx.strokeStyle = C.rail2; ctx.lineWidth = 2;
    edgePath(samples, s, 26); ctx.stroke();
    edgePath(samples, s, 52); ctx.stroke();
    bandPath(samples, s, 0, 5); ctx.fillStyle = C.quayEdge; ctx.fill();
    ctx.strokeStyle = C.safety; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    edgePath(samples, s, 12); ctx.stroke(); ctx.setLineDash([]);
  } else if (key === 'net') {
    bandPath(samples, s, 30, Infinity); ctx.fillStyle = 'rgba(6,30,60,0.32)'; ctx.fill();
    bandPath(samples, s, 0, 30); ctx.fillStyle = C.brk; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; edgePath(samples, s, 15); ctx.stroke();
  }
  // 장식
  const k0 = Math.floor((a - 100) / 100), k1 = Math.ceil(b / 100);
  for (let k = k0; k <= k1; k++) {
    for (const it of decoSeg(key, k, s)) drawDeco(it, s);
  }
  if (key === 'net' && b >= st.end - 1) drawBreakwaterTip(s, st);
}

function drawDeco(it, s) {
  const bk = bankAt(it.d);
  const e = s < 0 ? bk.vl : bk.vr;
  const x = e + s * it.o, y = SY(it.d);
  if (Math.abs(x) > view.w / 2 + 80) return;
  switch (it.t) {
    case 'p': { // 사람 (위에서 본 모습)
      const bob = Math.sin(game.time * 3 + it.ph * 9) * 0.6;
      ctx.fillStyle = it.c;
      ctx.beginPath(); ctx.ellipse(x, y + bob, 4.6, 3.3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = it.hc;
      ctx.beginPath(); ctx.arc(x - s * 0.6, y + bob, 2.5, 0, TAU); ctx.fill();
      if (it.phone) { ctx.fillStyle = '#e9f1ff'; ctx.fillRect(x - s * 5.5 - 1.2, y + bob - 1.6, 2.4, 3.2); }
      break;
    }
    case 'tree':
      ctx.fillStyle = 'rgba(0,40,20,0.18)';
      ctx.beginPath(); ctx.arc(x + 3, y + 3, it.r, 0, TAU); ctx.fill();
      ctx.fillStyle = C.tree2; ctx.beginPath(); ctx.arc(x, y, it.r, 0, TAU); ctx.fill();
      ctx.fillStyle = C.tree; ctx.beginPath(); ctx.arc(x - it.r * 0.25, y - it.r * 0.25, it.r * 0.68, 0, TAU); ctx.fill();
      break;
    case 'bld': {
      const x0 = x - it.w / 2, y0 = y - it.len / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x0 + 5, y0 + 5, it.w, it.len);
      ctx.fillStyle = it.c; ctx.fillRect(x0, y0, it.w, it.len);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, y0 + 1, it.w - 2, it.len - 2);
      ctx.fillStyle = 'rgba(80,90,100,0.35)';
      ctx.fillRect(x0 + it.w * (0.15 + it.ac * 0.4), y0 + it.len * 0.25, 9, 7);
      if (it.ac > 0.5) ctx.fillRect(x0 + it.w * 0.62, y0 + it.len * 0.6, 7, 6);
      break;
    }
    case 'bollard':
      ctx.fillStyle = C.bollard; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fill();
      break;
    case 'box':
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x - it.w / 2 + 3, y - it.len / 2 + 3, it.w, it.len);
      ctx.fillStyle = it.c; ctx.fillRect(x - it.w / 2, y - it.len / 2, it.w, it.len);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) { const xx = x - it.w / 2 + (it.w / 6) * i; ctx.beginPath(); ctx.moveTo(xx, y - it.len / 2 + 2); ctx.lineTo(xx, y + it.len / 2 - 2); ctx.stroke(); }
      break;
    case 'tetra': {
      ctx.save(); ctx.translate(x, y); ctx.rotate(it.a);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU;
        ctx.fillStyle = C.tetraShade;
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * 5 + 1.5, Math.sin(a) * 5 + 1.5, 5, 3.6, a, 0, TAU); ctx.fill();
        ctx.fillStyle = C.tetra;
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * 5, Math.sin(a) * 5, 5, 3.6, a, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#dfe1db'; ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, TAU); ctx.fill();
      ctx.restore();
      break;
    }
  }
}

function drawBreakwaterTip(s, st) {
  const bk = bankAt(st.end - 1);
  const e = s < 0 ? bk.vl : bk.vr;
  ctx.fillStyle = C.brk;
  ctx.beginPath(); ctx.arc(e + s * 15, SY(st.end), 15, Math.PI, TAU); ctx.fill();
}

function drawBridge(e) {
  const y = SY(e.d), hh = e.h / 2, W = view.w / 2 + 20;
  const bk = bankAt(e.d);
  ctx.fillStyle = 'rgba(0,30,40,0.22)';
  ctx.fillRect(bk.vl, y - hh + 10, bk.vr - bk.vl, e.h);
  const col = e.style === 1 ? '#c79d6e' : e.style === 2 ? '#4b78ad' : '#6b7077';
  const parts = [[-W, bk.vl, 1], [bk.vl, bk.vr, 0.68], [bk.vr, W, 1]];
  for (const [x0, x1, al] of parts) {
    if (x1 <= x0) continue;
    ctx.globalAlpha = al;
    ctx.fillStyle = col; ctx.fillRect(x0, y - hh, x1 - x0, e.h);
    if (e.style === 1) {
      ctx.strokeStyle = 'rgba(80,50,20,0.35)'; ctx.lineWidth = 1;
      for (let x = Math.ceil(x0 / 9) * 9; x < x1; x += 9) { ctx.beginPath(); ctx.moveTo(x, y - hh); ctx.lineTo(x, y + hh); ctx.stroke(); }
    } else if (e.style === 0) {
      ctx.strokeStyle = C.roadLine; ctx.lineWidth = 1.5; ctx.setLineDash([12, 10]);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#9ea3a8'; ctx.fillRect(x0, y - hh, x1 - x0, 8); ctx.fillRect(x0, y + hh - 8, x1 - x0, 8);
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2;
      for (let x = Math.ceil(x0 / 16) * 16; x < x1; x += 16) { ctx.beginPath(); ctx.moveTo(x, y - hh); ctx.lineTo(x + 8, y + hh); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(x0, y - hh, x1 - x0, 2); ctx.fillRect(x0, y + hh - 2, x1 - x0, 2);
  }
  ctx.globalAlpha = 1;
  // 다리 위 구경꾼
  if (stageIndexAt(e.d) === 0) {
    for (let i = 0; i < 14; i++) {
      const hx = hash2(i, e.d | 0), x = lerp(bk.vl + 6, bk.vr - 6, hx);
      const yy = y + (i % 2 ? -hh + 12 : hh - 12) + Math.sin(game.time * 3 + i) * 0.5;
      ctx.fillStyle = C.shirts[i % C.shirts.length];
      ctx.beginPath(); ctx.ellipse(x, yy, 3.4, 4.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C.hair[i % 4]; ctx.beginPath(); ctx.arc(x, yy, 2.3, 0, TAU); ctx.fill();
    }
  }
}

function drawShip(e) {
  const s = e.side, xi = s * e.inner, xo = s * (STAGES[1].half + 4);
  const y0 = SY(e.d1), y1 = SY(e.d0);
  if (y1 < -40 || y0 > view.h + 40) return;
  const xm = (xi + xo) / 2, bow = 70;
  const hull = () => {
    ctx.beginPath();
    ctx.moveTo(xm, y0 - 6);
    ctx.quadraticCurveTo(xi, y0 + 10, xi, y0 + bow);
    ctx.lineTo(xi, y1 - 18);
    ctx.quadraticCurveTo(xi, y1, xi + (xo - xi) * 0.2, y1);
    ctx.lineTo(xo - (xo - xi) * 0.05, y1);
    ctx.lineTo(xo, y0 + bow);
    ctx.quadraticCurveTo(xo, y0 + 10, xm, y0 - 6);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(-s * 6, 6); hull(); ctx.fillStyle = 'rgba(0,25,40,0.28)'; ctx.fill();
  ctx.restore();
  hull();
  const hulls = ['#8e2f2b', '#24476b', '#2f5d4a', '#3b3f46'];
  ctx.fillStyle = e.kind === 1 ? '#f3f5f6' : hulls[e.hue];
  ctx.fill();
  ctx.save(); hull(); ctx.clip();
  const ww = Math.abs(xo - xi), xl = Math.min(xi, xo);
  if (e.kind === 1) { // 여객선
    ctx.fillStyle = '#2b6cb0'; ctx.fillRect(xl, y0, 6, y1 - y0); ctx.fillRect(xl + ww - 6, y0, 6, y1 - y0);
    ctx.fillStyle = '#dfe6ea'; ctx.fillRect(xl + 16, y0 + bow + 10, ww - 32, (y1 - y0) - bow - 60);
    ctx.fillStyle = '#c7d2d9';
    for (let y = y0 + bow + 24; y < y1 - 60; y += 26) ctx.fillRect(xl + 24, y, ww - 48, 12);
    ctx.fillStyle = '#ff7a33';
    for (let y = y0 + bow + 30; y < y1 - 70; y += 48) { ctx.fillRect(xl + 9, y, 7, 18); ctx.fillRect(xl + ww - 16, y, 7, 18); }
    ctx.fillStyle = '#d64545'; ctx.beginPath(); ctx.arc(xm, y1 - 90, 12, 0, TAU); ctx.fill();
  } else { // 화물선: 컨테이너
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(xl + 8, y0 + bow - 10, ww - 16, (y1 - y0) - bow - 40);
    let r = 0;
    for (let y = y0 + bow; y < y1 - 110; y += 22) {
      for (let c = 0; c < 4; c++) {
        const cw = (ww - 24) / 4;
        ctx.fillStyle = C.boxes[(hash2(r, c + e.hue * 9) * C.boxes.length) | 0];
        ctx.fillRect(xl + 12 + c * cw + 1, y, cw - 2, 18);
      }
      r++;
    }
    ctx.fillStyle = '#f1f3f4'; ctx.fillRect(xl + 14, y1 - 90, ww - 28, 46);
    ctx.fillStyle = '#28323a';
    for (let x = xl + 22; x < xl + ww - 22; x += 12) ctx.fillRect(x, y1 - 84, 7, 6);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; hull(); ctx.stroke();
}

function drawLight(e) {
  const st = STAGES[2];
  const bk = bankAt(st.end - 1);
  const x = (e.side < 0 ? bk.vl : bk.vr) + e.side * 15, y = SY(e.d);
  const ang = game.time * 1.3 + (e.side > 0 ? Math.PI : 0);
  ctx.fillStyle = 'rgba(255,240,170,0.13)';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 260, ang - 0.18, ang + 0.18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.arc(x + 4, y + 4, 15, 0, TAU); ctx.fill();
  ctx.fillStyle = e.color === 'red' ? '#e03b3b' : '#f6f6f2';
  ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
  ctx.strokeStyle = e.color === 'red' ? '#ffd0d0' : '#c9ccd1'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
}
