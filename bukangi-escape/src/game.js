// ===== 게임 상태 =====
const shark = {
  x: 0, off: 170, d: 0, vx: 0, voff: 0, tilt: 0, swim: 0, wig: 0,
  hp: 3, maxHp: 3, stamina: 1, dashT: 0, inv: 0, dashInv: 0, slow: 0,
  tangle: null, face: 'normal', faceT: 0, bumpT: 0, noDashT: 0,
};
const game = {
  state: 'title', mode: ['easy', 'normal', 'hard'].includes(store.get('mode', 'normal')) ? store.get('mode', 'normal') : 'normal', seed: 1,
  camD: 0, time: 0, runTime: 0, speedNow: 0,
  score: 0, fish: 0, photos: 0, nears: 0, hits: 0,
  stage: -1, stageHurt: false, resumed: false, check: null,
  shake: 0, flash: 0, photoT: 0, comboN: 0, comboT: 0, endT: 0, overT: 0,
  best: 0,
};
// 난이도별 설정. 어려움(하드코어): 하트 1개, 20% 빠름, 이어 하기 없음
const MODES = {
  easy: { hp: 5, speed: 0.88, mash: 6, mashT: 3.2, regen: 0.035, label: '쉬움' },
  normal: { hp: 3, speed: 1, mash: 8, mashT: 3.2, regen: 0.035, label: '보통' },
  hard: { hp: 1, speed: 1.2, mash: 12, mashT: 2.6, regen: 0.02, label: '어려움' },
};
const bestKey = (m) => (m === 'normal' ? 'best' : 'best_' + m);
function loadBest() { game.best = store.get(bestKey(game.mode), 0) | 0; }
loadBest();
const fx = [];
const texts = [];
const CHEERS = ['찰칵!', '부캉아!', '귀여워!', '잘 가~', '힘내!', '바다로 가자!', '인증샷!'];

function fxAdd(kind, x, d, vx, vd, life, r, color) {
  if (fx.length > 500) fx.shift();
  fx.push({ kind, x, d, vx, vd, life, max: life, r, color });
}
function textAdd(x, d, text, color, size) {
  if (texts.length > 40) texts.shift();
  texts.push({ x: clamp(x, -view.w / 2 + 50, view.w / 2 - 50), d, text, color, size: size || 16, life: 1.1, max: 1.1 });
}
function addShake(v) { game.shake = Math.max(game.shake, reduceMotion ? v * 0.25 : v); }
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 진동 불가 */ } }

function resetShark() {
  Object.assign(shark, {
    x: 0, off: 170, vx: 0, voff: 0, tilt: 0, swim: 0, wig: 0, stamina: 1, dashT: 0, inv: 1.2, dashInv: 0, slow: 0,
    tangle: null, face: 'normal', faceT: 0, bumpT: 0, noDashT: 0,
  });
  shark.maxHp = MODES[game.mode].hp;
  shark.hp = shark.maxHp;
}

function startRun(fromCheck) {
  const g = game;
  if (!fromCheck || !g.check) { g.seed = (Math.random() * 1e9) | 0; g.check = null; fromCheck = false; }
  const L = buildLevel(g.seed, g.mode);
  level.ents = L.ents; level.bank = L.bank;
  const ck = fromCheck ? g.check : null;
  g.camD = ck ? STAGES[ck.stage].start - 140 : -60;
  if (ck) level.ents = level.ents.filter((e) => e.d > g.camD + 360 || e.type === 'ship' || e.type === 'light' || e.type === 'bridge');
  resetShark();
  shark.d = g.camD + shark.off;
  g.score = ck ? ck.score : 0; g.fish = ck ? ck.fish : 0; g.photos = ck ? ck.photos : 0;
  g.nears = ck ? ck.nears : 0; g.hits = ck ? ck.hits : 0; g.runTime = ck ? ck.time : 0;
  g.stage = ck ? ck.stage - 1 : -1;
  g.resumed = !!ck;
  g.stageHurt = false; g.speedNow = STAGES[ck ? ck.stage : 0].speed * 0.6;
  g.shake = 0; g.flash = 0; g.photoT = 0; g.comboN = 0; g.comboT = 0; g.endT = 0;
  fx.length = 0; texts.length = 0;
  input.keys.clear(); input.dragDX = 0; input.dragDY = 0; input.dashQ = false; input.mashQ = 0;
  g.state = 'play';
}

function enterStage(si) {
  const g = game;
  if (g.stage >= 0 && !g.resumed) stageBonus();
  g.resumed = false;
  g.stage = si; g.stageHurt = false;
  g.check = { stage: si, score: g.score, fish: g.fish, photos: g.photos, nears: g.nears, hits: g.hits, time: g.runTime };
  const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const hint = si === 0 && !g.check0 ? (touch ? '화면을 끌어서 움직이고, 돌진 버튼으로 빠르게!' : '방향키로 움직이고, 스페이스로 돌진!') : STAGES[si].sub;
  if (si === 0) g.check0 = true;
  ui.banner(`${si + 1}구간`, STAGES[si].name, hint);
  if (si > 0) audio.sfx('stage');
}
function stageBonus() {
  const g = game;
  const clean = !g.stageHurt;
  g.score += clean ? 800 : 300;
  textAdd(shark.x, shark.d + 70, clean ? '무사고 통과 +800' : '구간 통과 +300', '#ffd35c', 18);
}

function tryDash() {
  const s = shark;
  if (s.tangle || s.dashT > 0.1) return;
  if (s.stamina < 1 / 3 - 1e-6) { textAdd(s.x, s.d + 44, '기운이 모자라요', '#a6c3cc', 13); return; }
  s.stamina -= 1 / 3;
  s.dashT = 0.55; s.dashInv = 0.5;
  audio.sfx('dash');
  for (let i = 0; i < 8; i++) fxAdd('bubble', s.x + (Math.random() - 0.5) * 20, s.d - 20 - Math.random() * 20, (Math.random() - 0.5) * 30, -40, 0.7, 2 + Math.random() * 3);
}

function eat(e) {
  const g = game, s = shark;
  e.dead = true;
  if (e.type === 'gold') {
    g.score += 300;
    if (s.hp < s.maxHp) { s.hp++; textAdd(e.x, e.d + 16, '하트 +1', '#ff5470', 20); }
    else textAdd(e.x, e.d + 16, '+300', '#ffd35c', 18);
    audio.sfx('gold');
    for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; fxAdd('spark', e.x, e.d, Math.cos(a) * 80, Math.sin(a) * 80, 0.7, 3.5); }
  } else {
    g.comboN = g.comboT > 0 ? g.comboN + 1 : 1;
    g.comboT = 1.7;
    const pts = 30 + 5 * Math.min(g.comboN - 1, 10);
    g.score += pts; g.fish++;
    s.stamina = Math.min(1, s.stamina + 0.05);
    textAdd(e.x, e.d + 12, g.comboN > 2 ? `+${pts} ×${g.comboN}` : `+${pts}`, '#eef6f2', 14);
    audio.sfx('eat');
  }
  s.face = 'happy'; s.faceT = 0.45;
  for (let i = 0; i < 4; i++) fxAdd('bubble', e.x + (Math.random() - 0.5) * 10, e.d, (Math.random() - 0.5) * 30, 20, 0.6, 1.5 + Math.random() * 2);
}

function hurt(e, word, soft) {
  const s = shark, g = game;
  e.touched = true;
  if (s.inv > 0 || s.dashInv > 0 || g.state !== 'play') return;
  s.hp--; g.hits++; g.stageHurt = true;
  s.inv = 1.5; s.face = 'hurt'; s.faceT = 0.8;
  g.flash = 0.35; g.comboN = 0; g.comboT = 0;
  addShake(9); buzz(70);
  audio.sfx('hit');
  textAdd(s.x, s.d + 34, word, '#ff8095', 22);
  if (!soft && e.x != null) s.x += (s.x - e.x >= 0 ? 1 : -1) * 16;
  if (e.type === 'trash') {
    e.dead = true;
    for (let i = 0; i < 8; i++) { const a = Math.random() * TAU; fxAdd('drop', e.x, e.d, Math.cos(a) * 60, Math.sin(a) * 60, 0.5, 2.5); }
  }
  if (s.hp <= 0) gameOver();
}

function tangle(e) {
  const s = shark, g = game;
  if (s.tangle || g.state !== 'play') return;
  const md = MODES[g.mode];
  s.tangle = { e, need: md.mash, got: 0, t: md.mashT, max: md.mashT };
  s.face = 'hurt'; s.faceT = 99; s.dashT = 0; s.wig = 0;
  input.mashQ = 0;
  audio.sfx('tangle'); addShake(4); buzz(40);
  ui.mash(true, 0);
}
function freeFromNet(failed) {
  const s = shark, g = game;
  const tg = s.tangle;
  s.tangle = null;
  ui.mash(false);
  const e = tg.e;
  if (e.type === 'net') e.gaps.push({ c0: s.x, c: s.x, w: 66, amp: 0, spd: 0, ph: 0, torn: true });
  else e.dead = true;
  s.face = 'normal'; s.faceT = 0;
  s.noDashT = 0.45;
  for (let i = 0; i < 10; i++) { const a = Math.random() * TAU; fxAdd('drop', s.x, s.d + 10, Math.cos(a) * 70, Math.sin(a) * 70, 0.5, 2.2); }
  if (failed) {
    s.inv = 0;
    hurt({ x: null, type: 'net' }, '아야!', true);
  } else {
    g.score += 50;
    textAdd(s.x, s.d + 40, '그물 찢기 성공! +50', '#ffd35c', 18);
    audio.sfx('free');
  }
  s.inv = Math.max(s.inv, 1.1);
}

function gameOver() {
  const g = game;
  g.state = 'over'; g.overT = 0;
  shark.face = 'hurt'; shark.faceT = 99;
  if (shark.tangle) { shark.tangle = null; ui.mash(false); }
  audio.sfx('over'); audio.stopMusic();
  saveBest();
}
function saveBest() {
  const g = game;
  if (g.score > g.best) { g.best = Math.floor(g.score); store.set(bestKey(g.mode), g.best); return true; }
  return false;
}

function startEnding() {
  const g = game, s = shark;
  g.state = 'ending'; g.endT = 0;
  stageBonus();
  const heartBonus = s.hp * 300;
  g.score += heartBonus;
  setTimeout(() => textAdd(0, s.d + 120, `남은 하트 보너스 +${heartBonus}`, '#ff8095', 18), 500);
  audio.sfx('clear');
  ui.banner('탈출 성공', '넓은 바다다!', '부캉이가 집으로 돌아가요');
}

// ===== 매 프레임 =====
function updateShark(dt) {
  const s = shark, g = game;
  s.faceT -= dt;
  if (s.faceT <= 0 && s.face !== 'normal') s.face = 'normal';
  s.inv = Math.max(0, s.inv - dt);
  s.dashInv = Math.max(0, s.dashInv - dt);
  s.slow = Math.max(0, s.slow - dt);
  s.bumpT = Math.max(0, s.bumpT - dt);
  s.stamina = Math.min(1, s.stamina + dt * MODES[game.mode].regen);
  if (s.tangle) {
    const tg = s.tangle;
    tg.t -= dt;
    s.wig = Math.max(0, s.wig - dt * 10);
    if (input.mashQ > 0) {
      tg.got += input.mashQ; input.mashQ = 0;
      s.wig = 2.2; addShake(2); audio.sfx('mash');
    }
    input.dashQ = false; input.dragDX = 0; input.dragDY = 0;
    ui.mash(true, tg.got / tg.need, tg.t / tg.max);
    if (tg.got >= tg.need) freeFromNet(false);
    else if (tg.t <= 0) freeFromNet(true);
    s.swim += dt * 20;
    return;
  }
  input.mashQ = 0;
  s.noDashT = Math.max(0, s.noDashT - dt);
  if (input.dashQ) { input.dashQ = false; if (s.noDashT <= 0) tryDash(); }
  if (s.dashT > 0) {
    s.dashT -= dt;
    if (Math.random() < 0.5) fxAdd('streak', s.x + (Math.random() - 0.5) * 30, s.d - 30 - Math.random() * 30, 0, 0, 0.3, 26);
  }
  const k = input.keys;
  const kx = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0);
  const ky = (k.has('up') ? 1 : 0) - (k.has('down') ? 1 : 0);
  const maxV = s.slow > 0 ? 150 : 270;
  const ease = 1 - Math.exp(-dt * 10);
  s.vx = lerp(s.vx, kx * maxV, ease);
  s.voff = lerp(s.voff, ky * maxV * 0.8, ease);
  let mx = s.vx * dt, my = s.voff * dt;
  if (input.dragDX || input.dragDY) {
    const mul = s.slow > 0 ? 0.6 : 1.15, cap = 950 * dt;
    mx += clamp(input.dragDX * mul, -cap, cap);
    my += clamp(-input.dragDY * mul, -cap, cap);
    input.dragDX = 0; input.dragDY = 0;
  }
  s.x += mx;
  s.off = clamp(s.off + my, 110, Math.max(140, view.h * 0.62));
  s.d = g.camD + s.off;
  const b = bankAt(s.d), hw = 14;
  if (s.x < b.l + hw || s.x > b.r - hw) {
    if (Math.abs(mx) > 0.6 && s.bumpT <= 0) { audio.sfx('bump'); s.bumpT = 0.35; fxAdd('foam', s.x < 0 ? b.l : b.r, s.d, 0, 0, 0.5, 6); }
    s.x = clamp(s.x, b.l + hw, b.r - hw);
  }
  const lateral = mx / Math.max(dt, 1e-3);
  s.tilt = lerp(s.tilt, clamp(lateral / 620, -0.5, 0.5), 1 - Math.exp(-dt * 8));
  s.swim += dt * (s.dashT > 0 ? 17 : 8.5);
}

function scroll(dt) {
  const g = game, s = shark;
  const base = STAGES[stageIndexAt(s.d)].speed * MODES[g.mode].speed;
  let sp = base * (s.dashT > 0 ? 2.1 : 1) * (s.slow > 0 ? 0.55 : 1);
  if (s.tangle) sp = 0;
  g.speedNow = s.tangle ? 0 : lerp(g.speedNow, sp, 1 - Math.exp(-dt * 5));
  g.camD += g.speedNow * dt;
  s.d = g.camD + s.off;
}

function updatePlay(dt) {
  const g = game, s = shark;
  g.runTime += dt;
  updateShark(dt);
  if (g.state !== 'play') return;
  scroll(dt);
  const si = stageIndexAt(s.d);
  if (si > g.stage) enterStage(si);
  updateEnts(dt);
  collide();
  if (g.state !== 'play') return;
  // 구경꾼 인증샷
  if (si === 0 && !s.tangle) {
    const b = bankAt(s.d);
    const nearL = s.x - b.vl < 44, nearR = b.vr - s.x < 44;
    if (nearL || nearR) {
      g.photoT -= dt;
      if (g.photoT <= 0) {
        g.photoT = 0.3;
        g.photos++; g.score += 10;
        audio.sfx('photo');
        const side = nearL ? -1 : 1, ex = side < 0 ? b.vl : b.vr;
        fxAdd('flash', ex + side * (8 + Math.random() * 26), s.d + (Math.random() - 0.3) * 80, 0, 0, 0.3, 9);
        if (Math.random() < 0.35) textAdd(ex - side * 46, s.d + 60 + Math.random() * 30, CHEERS[(Math.random() * CHEERS.length) | 0], '#ffffff', 14);
      }
    } else g.photoT = Math.min(g.photoT, 0.08);
  }
  g.score += g.speedNow * dt * 0.1;
  g.comboT = Math.max(0, g.comboT - dt);
  if (s.d >= TOTAL) startEnding();
}

function updateEnding(dt) {
  const g = game, s = shark;
  g.endT += dt;
  s.swim += dt * 9;
  s.x = lerp(s.x, 0, 1 - Math.exp(-dt * 1.5));
  s.tilt = lerp(s.tilt, 0, 1 - Math.exp(-dt * 3));
  s.off += dt * (60 + g.endT * 50);
  g.speedNow = lerp(g.speedNow, 90, 1 - Math.exp(-dt * 1.5));
  g.camD += g.speedNow * dt;
  s.d = g.camD + s.off;
  if (Math.random() < dt * 14) {
    const x = (Math.random() - 0.5) * view.w, d = g.camD + Math.random() * view.h;
    fxAdd('spark', x, d, 0, 0, 1.2, 2.5, 'rgba(255,255,255,0.8)');
  }
  updateEnts(dt);
  if (g.endT > 3.4 && g.state === 'ending') {
    g.state = 'clear';
    const isBest = saveBest();
    ui.showClear(isBest);
  }
}

function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i];
    p.life -= dt;
    if (p.life <= 0) { fx.splice(i, 1); continue; }
    p.x += p.vx * dt; p.d += p.vd * dt;
    p.vx *= 1 - dt * 2; p.vd *= 1 - dt * 2;
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= dt;
    if (t.life <= 0) { texts.splice(i, 1); continue; }
    t.d += dt * 40;
  }
}

// 처음 화면 뒤에서 혼자 헤엄치는 모습
function updateAttract(dt) {
  const g = game, s = shark;
  g.camD += dt * 55;
  if (g.camD > 2600 || !level.ents.length) {
    const L = buildLevel(2026, 'normal');
    level.ents = L.ents.filter((e) => e.type === 'fish' || e.type === 'bridge' || e.type === 'pier' || e.type === 'kayak' || e.type === 'trash');
    level.bank = L.bank;
    g.camD = 0;
  }
  s.off = view.h * 0.3;
  s.x = Math.sin(g.time * 0.5) * 50;
  s.tilt = Math.cos(g.time * 0.5) * 0.18;
  s.swim += dt * 7;
  s.d = g.camD + s.off;
  s.face = 'normal'; s.inv = 0; s.tangle = null; s.slow = 0;
  updateEnts(dt);
}
