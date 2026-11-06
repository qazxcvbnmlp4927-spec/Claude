// ===== 화면 (HUD, 메뉴) =====
const HEART_PATH = 'M12 21s-7.4-4.5-9.5-9.1C1 8.5 3.1 4.6 6.7 4.6c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.9 4.2 7.3C19.4 16.5 12 21 12 21z';
const fmt = (n) => Math.floor(n).toLocaleString('ko-KR');
const fmtTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const SCREENS = ['titleScreen', 'howScreen', 'pauseScreen', 'overScreen', 'clearScreen'];

const ui = {
  heartsKey: '', scoreShown: -1, bannerTimer: 0,
  show(id) {
    for (const s of SCREENS) $(s).hidden = s !== id;
    const playing = id === null;
    $('hud').hidden = !(playing || id === 'pauseScreen');
    $('dashBtn').hidden = !playing;
    if (id) {
      const btn = $(id).querySelector('.btn.primary');
      if (btn) setTimeout(() => { try { btn.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }, 30);
    } else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },
  hud(force) {
    const s = shark, g = game;
    const key = s.hp + '/' + s.maxHp;
    if (force || key !== ui.heartsKey) {
      const prev = ui.heartsKey ? parseInt(ui.heartsKey, 10) : s.hp;
      let html = '';
      for (let i = 0; i < s.maxHp; i++) {
        const full = i < s.hp;
        const pop = full && i >= prev ? ' pop' : '';
        html += `<svg viewBox="0 0 24 24" class="${full ? 'full' : 'empty'}${pop}" aria-hidden="true"><path d="${HEART_PATH}"></path></svg>`;
      }
      $('hearts').innerHTML = html;
      $('hearts').setAttribute('aria-label', `남은 하트 ${s.hp}개`);
      ui.heartsKey = key;
    }
    const sc = Math.floor(g.score);
    if (sc !== ui.scoreShown) { $('score').textContent = fmt(sc); ui.scoreShown = sc; }
    const p = clamp(s.d / TOTAL, 0, 1) * 100;
    $('routeFill').style.width = p + '%';
    $('routeMark').style.left = p + '%';
    const si = clamp(g.stage, 0, STAGES.length - 1);
    const name = `${si + 1}구간 · ${STAGES[si].name}`;
    if ($('stageName').textContent !== name) $('stageName').textContent = name;
    const db = $('dashBtn');
    db.style.setProperty('--st', s.stamina.toFixed(3));
    db.classList.toggle('low', s.stamina < 1 / 3 - 1e-6);
  },
  banner(small, big, sub) {
    const el = $('banner');
    $('bannerSmall').textContent = small;
    $('bannerBig').textContent = big;
    $('bannerSub').textContent = sub || '';
    el.hidden = true;
    void el.offsetWidth;
    el.hidden = false;
    clearTimeout(ui.bannerTimer);
    ui.bannerTimer = setTimeout(() => { el.hidden = true; }, 2600);
  },
  mash(on, k = 0, left = 1) {
    const el = $('mash');
    if (el.hidden === on) el.hidden = !on;
    if (on) {
      $('mashFill').style.width = clamp(k, 0, 1) * 100 + '%';
      el.style.opacity = String(0.75 + 0.25 * Math.sin(game.time * 20) * (1 - left));
      // 부캉이를 가리지 않게 위쪽(자리가 없으면 아래쪽)에 띄운다
      const sy = (view.h - shark.off) * view.s;
      const above = sy - 70 > 150;
      el.style.top = (above ? sy - 70 : sy + 70) + 'px';
      el.style.transform = above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';
    }
  },
  stats(el, rows) {
    el.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  },
  showOver() {
    const g = game;
    const si = clamp(g.stage, 0, STAGES.length - 1);
    $('overWhere').textContent = `${si + 1}구간 · ${STAGES[si].name}에서`;
    ui.stats($('overStats'), [
      ['점수', fmt(g.score)],
      ['간 거리', `${Math.floor(clamp(shark.d / TOTAL, 0, 1) * 100)}%`],
      ['먹은 고등어', `${g.fish}마리`],
      ['최고 점수', fmt(g.best)],
    ]);
    ui.show('overScreen');
  },
  showClear(isBest) {
    const g = game;
    const sc = Math.floor(g.score);
    const rank = sc >= 11000 ? ['S', '전설의 흑상어'] : sc >= 8500 ? ['A', '북항의 스타'] : sc >= 6000 ? ['B', '씩씩한 상어'] : ['C', '꼬마 상어'];
    $('rankLine').textContent = `${rank[0]}등급 · ${rank[1]}`;
    ui.stats($('clearStats'), [
      ['점수', fmt(sc)],
      ['걸린 시간', fmtTime(g.runTime)],
      ['먹은 고등어', `${g.fish}마리`],
      ['인증샷', `${g.photos}장`],
      ['아슬아슬 피하기', `${g.nears}번`],
      ['부딪힌 횟수', `${g.hits}번`],
    ]);
    $('clearBest').textContent = isBest ? '새 최고 점수예요!' : `최고 점수 ${fmt(g.best)}`;
    ui.show('clearScreen');
  },
  refreshTitle() {
    $('bestLine').textContent = game.best > 0 ? `최고 점수 ${fmt(game.best)}` : '';
    const easy = game.mode === 'easy';
    $('modeEasy').setAttribute('aria-checked', String(easy));
    $('modeNormal').setAttribute('aria-checked', String(!easy));
    ui.soundLabels();
  },
  soundLabels() {
    const t = audio.on ? '소리 켜짐' : '소리 꺼짐';
    $('soundBtn').textContent = t;
    $('pauseSound').textContent = t;
  },
};

function goPlay(fromCheck) {
  audio.ensure();
  audio.sfx('click');
  startRun(fromCheck);
  ui.heartsKey = '';
  ui.show(null);
  ui.hud(true);
  audio.startMusic();
}
function pauseGame() {
  if (game.state !== 'play') return;
  game.state = 'pause';
  input.keys.clear();
  audio.stopMusic();
  ui.show('pauseScreen');
}
function resumeGame() {
  if (game.state !== 'pause') return;
  game.state = 'play';
  input.dragDX = 0; input.dragDY = 0;
  ui.show(null);
  audio.ensure();
  audio.startMusic();
}
function toTitle() {
  game.state = 'title';
  audio.stopMusic();
  level.ents = []; level.bank = [];
  resetShark();
  ui.mash(false);
  $('banner').hidden = true;
  ui.refreshTitle();
  ui.show('titleScreen');
}

// ===== 입력 연결 =====
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
function bindInput() {
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (game.state === 'play') {
      if (k) { input.keys.add(k); e.preventDefault(); if (!e.repeat && shark.tangle) input.mashQ++; }
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyJ') {
        e.preventDefault();
        if (!e.repeat) { input.dashQ = true; input.mashQ++; }
      }
      if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); pauseGame(); }
    } else if (game.state === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) {
      e.preventDefault(); resumeGame();
    }
  });
  window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) input.keys.delete(k); });
  window.addEventListener('blur', () => { input.keys.clear(); pauseGame(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

  cvs.addEventListener('pointerdown', (e) => {
    if (game.state !== 'play') return;
    e.preventDefault();
    input.mashQ++;
    if (input.pid === null) {
      input.pid = e.pointerId; input.lx = e.clientX; input.ly = e.clientY;
      try { cvs.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    }
  });
  cvs.addEventListener('pointermove', (e) => {
    if (e.pointerId !== input.pid) return;
    input.dragDX += (e.clientX - input.lx) / view.s;
    input.dragDY += (e.clientY - input.ly) / view.s;
    input.lx = e.clientX; input.ly = e.clientY;
  });
  const endPtr = (e) => { if (e.pointerId === input.pid) input.pid = null; };
  cvs.addEventListener('pointerup', endPtr);
  cvs.addEventListener('pointercancel', endPtr);
  cvs.addEventListener('lostpointercapture', endPtr);
  cvs.addEventListener('contextmenu', (e) => e.preventDefault());

  const dash = $('dashBtn');
  dash.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); input.dashQ = true; input.mashQ++; });
  dash.addEventListener('click', (e) => { if (e.detail === 0) { input.dashQ = true; input.mashQ++; } });

  const on = (id, fn) => $(id).addEventListener('click', fn);
  on('startBtn', () => goPlay(false));
  on('howBtn', () => { audio.ensure(); audio.sfx('click'); ui.show('howScreen'); });
  on('howClose', () => { audio.sfx('click'); ui.show('titleScreen'); });
  const toggleSound = () => { audio.ensure(); audio.setOn(!audio.on); ui.soundLabels(); audio.sfx('click'); };
  on('soundBtn', toggleSound);
  on('pauseSound', toggleSound);
  on('modeEasy', () => { game.mode = 'easy'; store.set('mode', 'easy'); ui.refreshTitle(); audio.ensure(); audio.sfx('click'); });
  on('modeNormal', () => { game.mode = 'normal'; store.set('mode', 'normal'); ui.refreshTitle(); audio.ensure(); audio.sfx('click'); });
  on('pauseBtn', pauseGame);
  on('resumeBtn', resumeGame);
  on('quitBtn', toTitle);
  on('retryBtn', () => goPlay(true));
  on('restartBtn', () => goPlay(false));
  on('overTitle', toTitle);
  on('againBtn', () => goPlay(false));
  on('clearTitle', toTitle);
}

// ===== 시작 =====
let lastT = 0;
function frame(now) {
  const dt = lastT ? Math.min(0.05, Math.max(0, (now - lastT) / 1000)) : 0.016;
  lastT = now;
  const g = game;
  try {
    if (g.state !== 'pause') {
      g.time += dt;
      if (g.state === 'play') updatePlay(dt);
      else if (g.state === 'ending') updateEnding(dt);
      else if (g.state === 'title') updateAttract(dt);
      else if (g.state === 'over') {
        g.overT += dt;
        updateEnts(dt * 0.3);
        if (g.overT > 1 && $('overScreen').hidden) ui.showOver();
      } else if (g.state === 'clear') updateEnts(dt);
      updateFx(dt);
      g.shake = Math.max(0, g.shake - dt * 30);
      g.flash = Math.max(0, g.flash - dt);
    }
    if (g.state === 'play' || g.state === 'ending') ui.hud();
    render();
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}

function boot() {
  resize();
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  bindInput();
  ui.refreshTitle();
  ui.show('titleScreen');
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.load) document.fonts.load('16px Jua').catch(() => {});
}
try {
  const hot = window.claude && window.claude.hot;
  if (hot && typeof hot.ready === 'function') hot.ready(() => boot());
  else boot();
} catch (e) {
  boot();
}
