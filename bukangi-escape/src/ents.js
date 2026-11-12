// ===== 물체 움직임 =====
function updateEnts(dt) {
  const g = game;
  const near = g.camD + view.h + 260;
  for (const e of level.ents) {
    if (e.dead) continue;
    if (e.d > near && !(e.type === 'boat')) continue;
    e.t += dt;
    switch (e.type) {
      case 'fish': case 'gold': {
        const dx = shark.x - e.x, dd = shark.d + 18 - e.d;
        const dist = Math.hypot(dx, dd);
        if (dist < 58 && g.state === 'play') { // 입 쪽으로 끌려옴
          const pull = (1 - dist / 58) * 260 * dt;
          e.x += (dx / (dist || 1)) * pull;
          e.d += (dd / (dist || 1)) * pull;
        } else {
          e.ang += Math.sin(e.t * 0.7 + e.ph) * dt * 0.8;
          e.x += Math.cos(e.ang) * 12 * dt;
          e.d += Math.sin(e.ang) * 12 * dt;
        }
        break;
      }
      case 'kayak': {
        const b = bankAt(e.d);
        e.x += e.vx * dt;
        if (e.x - e.hw < b.l + 4) { e.x = b.l + 4 + e.hw; e.vx = Math.abs(e.vx); }
        if (e.x + e.hw > b.r - 4) { e.x = b.r - 4 - e.hw; e.vx = -Math.abs(e.vx); }
        break;
      }
      case 'boat': updateBoat(e, dt); break;
      case 'anchor': updateAnchor(e, dt); break;
      case 'ghost': case 'jelly': {
        const b = bankAt(e.d);
        e.x += e.vx * dt;
        if (e.x - e.r < b.l + 6) e.vx = Math.abs(e.vx);
        if (e.x + e.r > b.r - 6) e.vx = -Math.abs(e.vx);
        if (e.type === 'jelly') e.d += Math.sin(e.t * 1.6 + e.ph) * 6 * dt;
        break;
      }
      case 'net': {
        for (const gp of e.gaps) gp.c = gp.c0 + gp.amp * Math.sin(g.time * gp.spd + gp.ph);
        break;
      }
    }
    if (e.d < g.camD - 260 && e.type !== 'ship') e.dead = true;
  }
}

function boatEdges(e) {
  const b = bankAt(e.d);
  const sea = e.kind === 'fishing';
  const far = Math.max(view.w / 2, 200) + e.hw + 30;
  // 부두에서는 땅 밑(선착장)에서 나오고, 바다에서는 화면 밖에서 온다
  const startX = sea ? -e.dir * far : (e.dir > 0 ? b.vl - e.hw - 4 : b.vr + e.hw + 4);
  return { b, startX, far };
}
function updateBoat(e, dt) {
  const g = game;
  if (!e.active) {
    if (g.state !== 'play' && g.state !== 'ending') return;
    const { startX } = boatEdges(e);
    const tBoat = Math.abs(startX - shark.x) / (e.speed * (MODES[g.mode].boat || 1));
    const tShark = (e.d - shark.d) / Math.max(60, g.speedNow);
    if (e.d - g.camD < view.h + 120 && tShark <= tBoat + 0.25) {
      e.active = true;
      e.x = startX;
      e.warnT = 0;
      if (e.d - shark.d > 0) audio.sfx('warn');
    }
    return;
  }
  e.x += e.dir * e.speed * (MODES[g.mode].boat || 1) * dt;
  e.warnT += dt;
  const { far } = boatEdges(e);
  if ((e.dir > 0 && e.x > far) || (e.dir < 0 && e.x < -far)) e.dead = true;
  if (g.time - (e.lastWake || 0) > 0.06) {
    e.lastWake = g.time;
    fxAdd('foam', e.x - e.dir * e.hw, e.d + (Math.random() - 0.5) * e.hh * 1.6, -e.dir * 20, 0, 0.9, 5 + Math.random() * 5);
  }
}

function updateAnchor(e, dt) {
  const g = game;
  if (e.state === 'wait') {
    const warn = MODES[g.mode].anchorWarn || 1.2;
    if (g.state === 'play' && e.d - shark.d < Math.max(80, g.speedNow) * (warn + 0.05) + 20) {
      const b = bankAt(e.d);
      e.state = 'warn'; e.t = 0; e.dur = warn;
      e.x = clamp(shark.x + e.aim, b.l + 26, b.r - 26);
      audio.sfx('warn');
    }
  } else if (e.state === 'warn') {
    if (e.t >= e.dur) {
      e.state = 'drop'; e.t = 0;
      audio.sfx('splash');
      addShake(5);
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * TAU, sp = 40 + Math.random() * 90;
        fxAdd('drop', e.x, e.d, Math.cos(a) * sp, Math.sin(a) * sp, 0.6, 3 + Math.random() * 3);
      }
      fxAdd('ring', e.x, e.d, 0, 0, 0.7, 34);
    }
  } else if (e.state === 'drop' && e.t > 0.3) {
    e.state = 'sunk'; e.t = 0;
  }
}

// ===== 충돌 =====
// 부캉이 몸은 원 두 개(머리, 몸통)로 본다
function sharkCircles() {
  const s = shark;
  const lean = Math.sin(s.tilt) * 10;
  return [
    { x: s.x + lean, d: s.d + 15, r: 10 },
    { x: s.x - lean * 0.4, d: s.d - 6, r: 12 },
  ];
}
function hitCircle(cs, x, d, r) {
  for (const c of cs) if (Math.hypot(c.x - x, c.d - d) < c.r + r) return true;
  return false;
}
function hitRect(cs, x, d, hw, hh) {
  for (const c of cs) {
    const nx = clamp(c.x, x - hw, x + hw), nd = clamp(c.d, d - hh, d + hh);
    if (Math.hypot(c.x - nx, c.d - nd) < c.r) return true;
  }
  return false;
}
function rectDist(cs, x, d, hw, hh) {
  let m = 1e9;
  for (const c of cs) {
    const nx = clamp(c.x, x - hw, x + hw), nd = clamp(c.d, d - hh, d + hh);
    m = Math.min(m, Math.hypot(c.x - nx, c.d - nd) - c.r);
  }
  return m;
}
function circDist(cs, x, d, r) {
  let m = 1e9;
  for (const c of cs) m = Math.min(m, Math.hypot(c.x - x, c.d - d) - c.r - r);
  return m;
}

function collide() {
  const s = shark, g = game;
  const cs = sharkCircles();
  for (const e of level.ents) {
    if (e.dead) continue;
    if (e.d > s.d + 160 || e.d < s.d - 160) {
      if (e.d < s.d - 160) nearMissCheck(e);
      if (!(e.type === 'oil' && Math.abs(e.d - s.d) < 200)) continue;
    }
    switch (e.type) {
      case 'fish': case 'gold':
        if (hitCircle(cs, e.x, e.d, e.r + 4)) eat(e);
        break;
      case 'trash': case 'pier': case 'drum': case 'buoy': case 'jelly': {
        const dist = circDist(cs, e.x, e.d, e.r * 0.85);
        trackNear(e, dist);
        if (dist < 0) hurt(e, e.type === 'trash' ? '웩!' : e.type === 'jelly' ? '찌릿!' : '쿵!');
        break;
      }
      case 'kayak': case 'boat': {
        if (e.type === 'boat' && !e.active) break;
        const dist = rectDist(cs, e.x, e.d, e.hw, e.hh);
        trackNear(e, dist);
        if (dist < 0) hurt(e, '쿵!');
        break;
      }
      case 'anchor':
        if (e.state === 'drop' && hitCircle(cs, e.x, e.d, 24)) hurt(e, '꽝!');
        else if (e.state === 'sunk') {
          const dist = circDist(cs, e.x, e.d, 7);
          trackNear(e, dist);
          if (dist < 0) hurt(e, '쿵!');
        }
        break;
      case 'net': {
        if (s.tangle) break;
        const b = bankAt(e.d);
        for (const c of cs) {
          if (Math.abs(c.d - e.d) > c.r + e.thick / 2) continue;
          if (c.x < b.l - 4 || c.x > b.r + 4) continue;
          const inGap = e.gaps.some((gp) => Math.abs(c.x - gp.c) < gp.w / 2 - c.r * 0.55);
          if (!inGap) { tangle(e); break; }
        }
        break;
      }
      case 'ghost':
        if (!s.tangle && hitCircle(cs, e.x, e.d, e.r * 0.8)) tangle(e);
        break;
      case 'oil': {
        let inside = false;
        for (const bl of e.blobs) if (hitCircle(cs, e.x + bl.dx, e.d + bl.dd, bl.r * 0.78)) { inside = true; break; }
        if (inside) {
          s.slow = 0.35;
          hurt(e, '끈적!', true);
        }
        break;
      }
    }
  }
}

function trackNear(e, dist) {
  if (e.minDist == null || dist < e.minDist) e.minDist = dist;
}
function nearMissCheck(e) {
  if (e.nearDone || e.minDist == null) return;
  e.nearDone = true;
  if (!e.touched && e.minDist >= 0 && e.minDist < 16 && game.state === 'play') {
    game.score += 25;
    game.nears++;
    textAdd(shark.x, shark.d + 40, '아슬아슬! +25', '#ffd35c', 15);
    audio.sfx('near');
  }
}
