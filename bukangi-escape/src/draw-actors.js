// ===== 그리기: 부캉이와 물체들 =====
function drawShark(x, y, opt) {
  const t = opt.swim, amp = opt.amp;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(opt.tilt);
  ctx.scale(1.15, 1.15);
  const L = 76, N = 12;
  const spine = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    spine.push([Math.sin(t - u * 3.4) * amp * u * u, -L / 2 + u * L * 0.8]);
  }
  const wAt = (u) => (u < 0.2 ? lerp(3.5, 11.5, smooth(u / 0.2)) : u < 0.42 ? lerp(11.5, 12.5, (u - 0.2) / 0.22) : lerp(12.5, 2.4, smooth((u - 0.42) / 0.58)));
  const tail = spine[N];
  const tailAng = Math.sin(t - 3.4) * amp * 0.05;
  // 그림자
  if (!opt.noShadow) {
    ctx.fillStyle = 'rgba(0,30,40,0.2)';
    ctx.beginPath(); ctx.ellipse(6, 9, 14, 40, 0, 0, TAU); ctx.fill();
  }
  const body = opt.tint || '#74889a', dark = '#55687a', rim = '#a9bccb';
  // 꼬리지느러미
  ctx.save();
  ctx.translate(tail[0], tail[1]);
  ctx.rotate(tailAng);
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(-8, 6, -17, 16);
  ctx.quadraticCurveTo(-6, 12, 0, 8);
  ctx.quadraticCurveTo(5, 11, 12, 12);
  ctx.quadraticCurveTo(6, 5, 0, -2);
  ctx.fill();
  ctx.restore();
  // 가슴지느러미
  const pi = 4, ps = spine[pi], pw = wAt(pi / N), flap = Math.sin(t * 0.5) * 0.12;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(ps[0] + s * (pw - 2), ps[1] + 2);
    ctx.rotate(s * (0.25 + flap));
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(s * 14, 2, s * 19, 14);
    ctx.quadraticCurveTo(s * 9, 9, 0, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // 배지느러미
  const qs = spine[8], qw = wAt(8 / N);
  ctx.fillStyle = dark;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(qs[0] + s * (qw - 1), qs[1] - 2);
    ctx.lineTo(qs[0] + s * (qw + 7), qs[1] + 7);
    ctx.lineTo(qs[0] + s * (qw - 1), qs[1] + 5);
    ctx.fill();
  }
  // 몸통
  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(spine[0][0], spine[0][1] - 3);
    for (let i = 0; i <= N; i++) ctx.lineTo(spine[i][0] + wAt(i / N), spine[i][1]);
    for (let i = N; i >= 0; i--) ctx.lineTo(spine[i][0] - wAt(i / N), spine[i][1]);
    ctx.closePath();
  };
  bodyPath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.save();
  bodyPath(); ctx.clip();
  ctx.fillStyle = rim;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) ctx.lineTo(spine[i][0] - wAt(i / N) * 0.35, spine[i][1]);
  for (let i = N; i >= 0; i--) ctx.lineTo(spine[i][0] - wAt(i / N) * 1.1, spine[i][1]);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  // 등지느러미 (물 위로 나옴)
  const a = spine[4], b = spine[7];
  ctx.fillStyle = '#4a5c6d';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(a[0] + 4.2, (a[1] + b[1]) / 2, b[0] + 1, b[1] + 3);
  ctx.quadraticCurveTo(b[0] - 3, (a[1] + b[1]) / 2, a[0], a[1]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(a[0] + 0.5, a[1] + 1); ctx.quadraticCurveTo(a[0] + 3.4, (a[1] + b[1]) / 2, b[0] + 1, b[1] + 2); ctx.stroke();
  // 눈과 볼
  const h = spine[2], hw = wAt(2 / N);
  ctx.fillStyle = 'rgba(255,150,165,0.45)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(h[0] + s * (hw - 3.2), h[1] + 7, 2.8, 1.8, 0, 0, TAU); ctx.fill(); }
  for (const s of [-1, 1]) {
    const ex = h[0] + s * (hw - 2.3), ey = h[1];
    ctx.strokeStyle = '#16212b'; ctx.fillStyle = '#16212b'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    if (opt.face === 'happy') {
      ctx.beginPath(); ctx.arc(ex, ey + 1, 2.3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else if (opt.face === 'hurt') {
      ctx.beginPath(); ctx.moveTo(ex - 2, ey - 2); ctx.lineTo(ex + s * 1.5, ey); ctx.lineTo(ex - 2, ey + 2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(ex, ey, 2.2, 2.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 0.7, ey - 0.9, 0.9, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

function drawFishBody(x, y, ang, t, gold) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang + Math.PI / 2);
  const w = Math.sin(t * 9) * 0.25;
  ctx.fillStyle = gold ? '#e8a91c' : '#2b5b74';
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(-4 + w * 6, 14); ctx.lineTo(4 + w * 6, 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = gold ? '#ffd35c' : '#cfe3ea';
  ctx.beginPath(); ctx.ellipse(0, 0, 4.4, 10, w * 0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = gold ? '#f0b52a' : '#305f78';
  ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 9, w * 0.3, 0, TAU); ctx.fill();
  if (!gold) {
    ctx.strokeStyle = '#163244'; ctx.lineWidth = 0.9;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-2.2, i * 3); ctx.quadraticCurveTo(0, i * 3 - 1.6, 2.2, i * 3); ctx.stroke(); }
  }
  ctx.fillStyle = '#0d1b24';
  ctx.beginPath(); ctx.arc(-2.6, -6, 0.9, 0, TAU); ctx.arc(2.6, -6, 0.9, 0, TAU); ctx.fill();
  ctx.restore();
  if (gold) {
    const s = 0.6 + 0.4 * Math.sin(t * 6);
    ctx.strokeStyle = `rgba(255,240,180,${0.7 * s})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 15 + s * 3, 0, TAU); ctx.stroke();
  }
}

function drawTrash(e, y) {
  const bob = Math.sin(e.t * 2 + e.ph) * 1.2;
  ctx.save(); ctx.translate(e.x, y + bob); ctx.rotate(e.rot + Math.sin(e.t * 0.8 + e.ph) * 0.2);
  ctx.fillStyle = 'rgba(0,30,40,0.18)'; ctx.beginPath(); ctx.ellipse(3, 4, 11, 8, 0, 0, TAU); ctx.fill();
  if (e.kind === 'bottle') {
    ctx.fillStyle = 'rgba(200,235,255,0.85)'; ctx.beginPath(); ctx.roundRect(-5, -11, 10, 20, 4); ctx.fill();
    ctx.fillStyle = '#3d8bfd'; ctx.fillRect(-3, -15, 6, 4);
    ctx.fillStyle = '#ff6b6b'; ctx.fillRect(-5, -3, 10, 5);
  } else if (e.kind === 'bag') {
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.beginPath();
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, r = 10 + Math.sin(i * 2.3 + e.t * 2) * 2.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(150,170,180,0.6)'; ctx.lineWidth = 1; ctx.stroke();
  } else {
    ctx.fillStyle = '#d63c3c'; ctx.beginPath(); ctx.roundRect(-6, -9, 12, 18, 3); ctx.fill();
    ctx.fillStyle = '#e9edf0'; ctx.fillRect(-6, -9, 12, 3); ctx.fillRect(-6, 6, 12, 3);
  }
  ctx.restore();
}

function drawBoat(e, y) {
  const g = game;
  ctx.save(); ctx.translate(e.x, y);
  const dir = e.type === 'kayak' ? (e.vx >= 0 ? 1 : -1) : e.dir;
  ctx.scale(dir, 1);
  ctx.fillStyle = 'rgba(0,30,40,0.22)'; ctx.beginPath(); ctx.ellipse(4, 5, e.hw + 2, e.hh + 2, 0, 0, TAU); ctx.fill();
  if (e.kind === 'kayak') {
    ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.ellipse(0, 0, 25, 7.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 4.5, 0, 0, TAU); ctx.fill();
    const pa = Math.sin(e.t * 5 + e.ph) * 0.7;
    ctx.save(); ctx.rotate(pa); ctx.strokeStyle = '#3a3f44'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 16); ctx.stroke();
    ctx.fillStyle = '#4dabf7'; ctx.fillRect(-2.5, -19, 5, 6); ctx.fillRect(-2.5, 13, 5, 6);
    ctx.restore();
    ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(0, 0, 4.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b2420'; ctx.beginPath(); ctx.arc(1, 0, 2.6, 0, TAU); ctx.fill();
  } else if (e.kind === 'duck') {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 17, 14, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f1f3f5'; ctx.beginPath(); ctx.arc(11, 0, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb703'; ctx.beginPath(); ctx.moveTo(18, -3); ctx.lineTo(25, 0); ctx.lineTo(18, 3); ctx.fill();
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(13, -4, 1.4, 0, TAU); ctx.arc(13, 4, 1.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#74c0fc'; ctx.fillRect(-11, -8, 14, 16);
    ctx.fillStyle = C.shirts[((e.ph * 3) | 0) % C.shirts.length]; ctx.beginPath(); ctx.arc(-4, -4, 3, 0, TAU); ctx.arc(-4, 4, 3, 0, TAU); ctx.fill();
  } else {
    const fishing = e.kind === 'fishing';
    const hw = e.hw, hh = e.hh;
    ctx.fillStyle = fishing ? '#e9eef2' : '#c8402e';
    ctx.beginPath();
    ctx.moveTo(hw + 6, 0);
    ctx.quadraticCurveTo(hw - 2, -hh, hw - 16, -hh);
    ctx.lineTo(-hw + 4, -hh); ctx.quadraticCurveTo(-hw, -hh, -hw, -hh + 4);
    ctx.lineTo(-hw, hh - 4); ctx.quadraticCurveTo(-hw, hh, -hw + 4, hh);
    ctx.lineTo(hw - 16, hh); ctx.quadraticCurveTo(hw - 2, hh, hw + 6, 0);
    ctx.fill();
    ctx.strokeStyle = fishing ? '#2b6cb0' : '#1f2328'; ctx.lineWidth = fishing ? 3 : 4; ctx.stroke();
    ctx.fillStyle = fishing ? '#2b6cb0' : '#f6f6f2';
    ctx.fillRect(-hw * 0.35, -hh * 0.6, hw * 0.75, hh * 1.2);
    ctx.fillStyle = fishing ? '#ffd35c' : '#262a2f';
    ctx.fillRect(-hw * 0.6, -4, 7, 8);
    if (fishing) { ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(-hw + 9, -hh + 7, 3, 0, TAU); ctx.arc(-hw + 9, hh - 7, 3, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

function drawNet(e, y) {
  const bk = bankAt(e.d);
  const x0 = bk.l - 14, x1 = bk.r + 14, th = e.thick;
  const gaps = e.gaps.map((gp) => [gp.c - gp.w / 2, gp.c + gp.w / 2, gp]).sort((a, b) => a[0] - b[0]);
  const segs = [];
  let cur = x0;
  for (const [a, b] of gaps) { if (a > cur) segs.push([cur, a]); cur = Math.max(cur, b); }
  if (cur < x1) segs.push([cur, x1]);
  ctx.fillStyle = 'rgba(0,30,40,0.18)';
  for (const [a, b] of segs) ctx.fillRect(a + 3, y - th / 2 + 4, b - a, th);
  ctx.strokeStyle = 'rgba(226,240,236,0.85)'; ctx.lineWidth = 1;
  for (const [a, b] of segs) {
    ctx.save(); ctx.beginPath(); ctx.rect(a, y - th / 2, b - a, th); ctx.clip();
    ctx.beginPath();
    for (let x = Math.floor(a / 6) * 6 - th; x < b + th; x += 6) { ctx.moveTo(x, y - th / 2); ctx.lineTo(x + th, y + th / 2); ctx.moveTo(x + th, y - th / 2); ctx.lineTo(x, y + th / 2); }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#f4e9d8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a, y - th / 2); ctx.lineTo(b, y - th / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(226,240,236,0.85)'; ctx.lineWidth = 1;
    for (let x = Math.ceil(a / 24) * 24; x < b; x += 24) {
      ctx.fillStyle = '#ff7a33'; ctx.beginPath(); ctx.ellipse(x, y - th / 2, 4.2, 3.2, 0, 0, TAU); ctx.fill();
    }
  }
  for (const [a, b, gp] of gaps) {
    if (gp.torn) continue;
    for (const x of [a, b]) {
      if (x < x0 || x > x1) continue;
      ctx.fillStyle = '#e8413b'; ctx.beginPath(); ctx.arc(x, y - th / 2, 5.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 1.5, y - th / 2 - 1.5, 1.6, 0, TAU); ctx.fill();
    }
  }
}

function drawThing(e) {
  const y = SY(e.d);
  switch (e.type) {
    case 'fish': case 'gold': drawFishBody(e.x, y, -e.ang, e.t, e.type === 'gold'); break;
    case 'trash': drawTrash(e, y); break;
    case 'pier':
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, y, e.r + 4 + Math.sin(game.time * 3) * 1.5, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#7d8580'; ctx.beginPath(); ctx.arc(e.x, y, e.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#9ba39d'; ctx.beginPath(); ctx.arc(e.x - 3, y - 3, e.r * 0.65, 0, TAU); ctx.fill();
      break;
    case 'kayak': case 'boat': drawBoat(e, y); break;
    case 'drum': {
      const bob = Math.sin(game.time * 2 + e.x) * 1;
      ctx.fillStyle = 'rgba(0,30,40,0.2)'; ctx.beginPath(); ctx.arc(e.x + 3, y + 4, e.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2f6fbf'; ctx.beginPath(); ctx.arc(e.x, y + bob, e.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd35c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(e.x, y + bob, e.r * 0.62, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#1d4f8f'; ctx.beginPath(); ctx.arc(e.x + 3, y + bob - 3, 2.4, 0, TAU); ctx.fill();
      break;
    }
    case 'buoy': {
      const bob = Math.sin(game.time * 2.4 + e.ph) * 1.5;
      ctx.fillStyle = 'rgba(0,30,40,0.2)'; ctx.beginPath(); ctx.arc(e.x + 3, y + 4, e.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8413b'; ctx.beginPath(); ctx.arc(e.x, y + bob, e.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, y + bob, e.r * 0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8413b'; ctx.beginPath(); ctx.arc(e.x, y + bob, e.r * 0.3, 0, TAU); ctx.fill();
      break;
    }
    case 'net': drawNet(e, y); break;
    case 'ghost': {
      ctx.save(); ctx.translate(e.x, y); ctx.rotate(e.t * 0.3 + e.ph);
      ctx.fillStyle = 'rgba(70,110,70,0.45)'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, r = e.r * (0.75 + 0.3 * hash2(i, e.ph * 100 | 0)); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(210,230,200,0.75)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = -3; i <= 3; i++) { ctx.moveTo(-e.r * 0.8, i * 5); ctx.lineTo(e.r * 0.8, i * 5 + 4); ctx.moveTo(i * 5, -e.r * 0.8); ctx.lineTo(i * 5 + 4, e.r * 0.8); }
      ctx.stroke();
      ctx.fillStyle = '#ff7a33'; ctx.beginPath(); ctx.arc(e.r * 0.5, -e.r * 0.4, 3.5, 0, TAU); ctx.fill();
      ctx.restore();
      break;
    }
    case 'oil':
      for (const bl of e.blobs) {
        const x = e.x + bl.dx, yy = SY(e.d + bl.dd);
        const gr = ctx.createRadialGradient(x, yy, 2, x, yy, bl.r);
        gr.addColorStop(0, 'rgba(20,14,28,0.9)'); gr.addColorStop(0.7, 'rgba(28,20,40,0.82)'); gr.addColorStop(1, 'rgba(28,20,40,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, yy, bl.r, 0, TAU); ctx.fill();
      }
      ctx.lineWidth = 2;
      for (const bl of e.blobs) {
        const hue = (game.time * 40 + bl.r * 7) % 360;
        ctx.strokeStyle = `hsla(${hue},80%,70%,0.28)`;
        ctx.beginPath(); ctx.arc(e.x + bl.dx, SY(e.d + bl.dd), bl.r * 0.6, 0.3, 2.4); ctx.stroke();
      }
      break;
    case 'jelly': {
      const p = 1 + Math.sin(e.t * 3 + e.ph) * 0.12;
      ctx.strokeStyle = 'rgba(255,200,230,0.55)'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + e.ph;
        ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * 6, y + Math.sin(a) * 6);
        ctx.quadraticCurveTo(e.x + Math.cos(a) * 16 + Math.sin(e.t * 3 + i) * 4, y + Math.sin(a) * 16, e.x + Math.cos(a) * 22, y + Math.sin(a) * 22);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,170,215,0.55)'; ctx.beginPath(); ctx.arc(e.x, y, e.r * p, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(e.x, y, e.r * 0.55 * p, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(220,90,160,0.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(e.x, y, e.r * 0.3 * p, 0, TAU); ctx.stroke();
      break;
    }
    case 'anchor': drawAnchor(e, y); break;
  }
}

function drawAnchor(e, y) {
  if (e.state === 'warn') {
    const k = clamp(e.t / e.dur, 0, 1);
    ctx.fillStyle = `rgba(0,10,20,${0.15 + k * 0.35})`;
    ctx.beginPath(); ctx.arc(e.x, y, 8 + k * 20, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,90,80,${0.5 + 0.5 * Math.sin(e.t * 20)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, y, 28, 0, TAU); ctx.stroke();
    warnSign(e.x, y - 40);
  } else if (e.state === 'drop' || e.state === 'sunk') {
    ctx.fillStyle = '#2d3338'; ctx.beginPath(); ctx.arc(e.x, y, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8b949b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, y, 4, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(e.x, y, 11 + Math.sin(game.time * 3) * 1.5, 0, TAU); ctx.stroke();
  }
}

function warnSign(x, y) {
  const p = 1 + Math.sin(game.time * 14) * 0.08;
  ctx.save(); ctx.translate(x, y); ctx.scale(p, p);
  ctx.fillStyle = '#ffd35c'; ctx.strokeStyle = '#1a1206'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(12, 9); ctx.lineTo(-12, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a1206'; ctx.fillRect(-1.6, -6, 3.2, 8); ctx.fillRect(-1.6, 4, 3.2, 3);
  ctx.restore();
}

function drawFx() {
  for (const p of fx) {
    const k = p.life / p.max, y = SY(p.d);
    switch (p.kind) {
      case 'foam': ctx.fillStyle = `rgba(255,255,255,${0.5 * k})`; ctx.beginPath(); ctx.arc(p.x, y, p.r * (1.4 - k * 0.4), 0, TAU); ctx.fill(); break;
      case 'bubble': ctx.strokeStyle = `rgba(255,255,255,${0.7 * k})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, y, p.r, 0, TAU); ctx.stroke(); break;
      case 'drop': ctx.fillStyle = `rgba(230,250,255,${0.85 * k})`; ctx.beginPath(); ctx.arc(p.x, y, p.r, 0, TAU); ctx.fill(); break;
      case 'ring': ctx.strokeStyle = `rgba(255,255,255,${0.7 * k})`; ctx.lineWidth = 3 * k + 0.5; ctx.beginPath(); ctx.arc(p.x, y, p.r * (1.6 - k), 0, TAU); ctx.stroke(); break;
      case 'spark': ctx.fillStyle = p.color || `rgba(255,230,140,${k})`; ctx.globalAlpha = k; ctx.beginPath(); ctx.arc(p.x, y, p.r * k + 0.5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; break;
      case 'flash': {
        const r = p.r * (0.6 + (1 - k) * 0.8);
        ctx.fillStyle = `rgba(255,255,255,${0.95 * k})`;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(p.x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'flow': ctx.strokeStyle = `rgba(170,235,255,${0.5 * Math.min(1, k * 2)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x - Math.sign(p.vx) * p.r, y); ctx.stroke(); break;
      case 'streak': ctx.strokeStyle = `rgba(255,255,255,${0.55 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x, y + p.r); ctx.stroke(); break;
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const t of texts) {
    const k = t.life / t.max, y = SY(t.d);
    ctx.globalAlpha = Math.min(1, k * 2.5);
    ctx.font = `${t.size}px Jua, 'Apple SD Gothic Neo', sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,30,44,0.85)'; ctx.strokeText(t.text, t.x, y);
    ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, y);
  }
  ctx.globalAlpha = 1;
}

// 지옥 모드: 밤바다. 부캉이 주변만 밝다
function drawNight() {
  const s = shark, y = SY(s.d), W = view.w / 2 + 40;
  const r1 = (MODES[game.mode].night || 250) + Math.sin(game.time * 1.7) * 8, r0 = r1 * 0.28;
  const gr = ctx.createRadialGradient(s.x, y - 40, r0, s.x, y - 40, r1);
  gr.addColorStop(0, 'rgba(2,8,22,0)');
  gr.addColorStop(0.55, 'rgba(2,8,22,0.55)');
  gr.addColorStop(1, 'rgba(2,8,22,0.93)');
  ctx.fillStyle = gr;
  ctx.fillRect(-W, -40, W * 2, view.h + 80);
}

function render() {
  const g = game;
  const k = view.dpr * view.s;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0a1e2c';
  ctx.fillRect(0, 0, cvs.width, cvs.height);
  const sx = g.shake ? (Math.random() - 0.5) * g.shake : 0, sy = g.shake ? (Math.random() - 0.5) * g.shake : 0;
  ctx.setTransform(k, 0, 0, k, (view.w / 2 + sx) * k, sy * k);
  drawWater();
  const lo = g.camD - 120, hi = g.camD + view.h + 140;
  const vis = [];
  for (const e of level.ents) {
    if (e.dead) continue;
    if (e.type === 'ship') { if (e.d1 > lo && e.d0 < hi) vis.push(e); continue; }
    if (e.d > lo - (e.type === 'oil' ? 80 : 0) && e.d < hi + (e.type === 'oil' ? 80 : 0)) vis.push(e);
  }
  const under = { fish: 1, gold: 1, jelly: 1, ghost: 1, oil: 1, anchor: 1, pier: 1 };
  for (const e of vis) if (under[e.type]) drawThing(e);
  const s = shark;
  {
    const blink = s.inv > 0 && !s.tangle && Math.floor(g.time * 12) % 2 === 0;
    ctx.globalAlpha = blink ? 0.35 : 1;
    drawShark(s.x + (s.tangle ? Math.sin(g.time * 40) * s.wig : 0), SY(s.d), {
      swim: s.swim, amp: s.tangle ? 2 : s.dashT > 0 ? 7 : 4.5, tilt: s.tilt, face: s.face,
      tint: s.slow > 0 ? '#5b6170' : null,
    });
    ctx.globalAlpha = 1;
  }
  for (const e of vis) if (!under[e.type] && e.type !== 'bridge' && e.type !== 'ship' && e.type !== 'light') drawThing(e);
  if (s.tangle) { // 몸에 감긴 그물
    const y = SY(s.d);
    ctx.strokeStyle = 'rgba(240,250,245,0.85)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) { ctx.moveTo(s.x - 18, y + i * 7 - 6); ctx.lineTo(s.x + 18, y + i * 7 + 6); ctx.moveTo(s.x + 18, y + i * 7 - 6); ctx.lineTo(s.x - 18, y + i * 7 + 6); }
    ctx.stroke();
  }
  drawLand();
  for (const e of vis) if (e.type === 'ship') drawShip(e);
  for (const e of vis) if (e.type === 'light') drawLight(e);
  for (const e of vis) if (e.type === 'bridge') drawBridge(e);
  if (MODES[g.mode].night && g.state !== 'title') drawNight();
  // 배가 들어오기 전 경고
  for (const e of vis) {
    if (e.type !== 'boat' || !e.active) continue;
    const bk = bankAt(e.d);
    const outside = e.dir > 0 ? e.x + e.hw < bk.l + 6 : e.x - e.hw > bk.r - 6;
    if (outside) warnSign(e.dir > 0 ? Math.max(bk.l + 18, -view.w / 2 + 18) : Math.min(bk.r - 18, view.w / 2 - 18), SY(e.d));
  }
  drawFx();
  // 화면 효과
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (g.flash > 0) { ctx.fillStyle = `rgba(255,60,80,${g.flash * 0.6})`; ctx.fillRect(0, 0, cvs.width, cvs.height); }
  if ((g.state === 'play' || g.state === 'pause') && s.hp === 1 && s.maxHp > 1) {
    const a = 0.25 + 0.15 * Math.sin(g.time * 5);
    const gr = ctx.createRadialGradient(cvs.width / 2, cvs.height / 2, Math.min(cvs.width, cvs.height) * 0.35, cvs.width / 2, cvs.height / 2, Math.max(cvs.width, cvs.height) * 0.75);
    gr.addColorStop(0, 'rgba(255,40,70,0)'); gr.addColorStop(1, `rgba(255,40,70,${a})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, cvs.width, cvs.height);
  }
}
