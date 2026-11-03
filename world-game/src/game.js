'use strict';
(() => {
  // ===== 규칙 숫자 =====
  const TICK_MS = 100; // 1틱 = 0.1초
  const SPAWN_MS = 12000;
  const SPAWN_R = 3;
  const START_TROOPS = 30000;
  const START_GOLD = 100000;
  const NEUTRAL_COST = 400; // 빈 평지 한 칸을 차지하는 데 드는 병력
  const TERRAIN_COST = [0, 1, 1.4, 2];
  const TERRAIN_DELAY = [0, 2.2, 3.4, 5]; // 한 칸 나아가는 데 걸리는 틱
  const TERRAIN_NAME = ['바다', '평지', '고지대', '산'];
  const WIN_SHARE = 0.8;
  const MAX_BOATS = 3;
  const BOAT_SPEED = 1.6;
  const SHIP_SPEED = 1.3;
  const DEF_R2 = 10 * 10;
  const SAM_R2 = 24 * 24;
  const RAIL_R2 = 30 * 30;
  const FALLOUT_TICKS = 900;
  const ALLIANCE_TICKS = 3000;
  const TRAITOR_TICKS = 600;
  const GOLD = '#f2c14e';
  const FONT = '"Do Hyeon", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

  const BUILD = {
    city: { name: '도시', base: 125000, grow: 2, max: 1000000, desc: '최대 병력 +125K' },
    port: { name: '항구', base: 125000, grow: 2, max: 1000000, desc: '무역선으로 골드' },
    defense: { name: '방어 기지', base: 50000, grow: 1.5, max: 250000, desc: '주변 땅 방어 강화' },
    factory: { name: '공장', base: 150000, grow: 2, max: 1200000, desc: '기차로 골드' },
    silo: { name: '미사일 기지', base: 1000000, grow: 1, max: 1000000, desc: '핵을 쏠 수 있어요' },
    sam: { name: 'SAM 발사대', base: 1500000, grow: 1, max: 1500000, desc: '날아오는 핵 요격' },
  };
  const BUILD_ORDER = ['city', 'port', 'defense', 'factory', 'silo', 'sam'];
  const NUKES = {
    atom: { name: '원자폭탄', cost: 750000, r: 7, speed: 2.4, sam: 0.85, desc: '좁은 곳을 날려요' },
    hydrogen: { name: '수소폭탄', cost: 5000000, r: 16, speed: 2, sam: 0.55, desc: '넓은 곳을 날려요' },
    mirv: { name: 'MIRV', cost: 25000000, r: 4, speed: 1.8, sam: 0.2, desc: '적 땅 곳곳에 24발', warheads: 24 },
    warhead: { name: '탄두', cost: 0, r: 4, speed: 3, sam: 0.35 },
  };
  const DIFF = {
    easy: { peace: 2400, growth: 0.8, warAt: 0.85, aggr: 0.25, lo: 0.2, hi: 0.3, edge: 1.6, nukeRate: 0, focusHuman: false, build: 0.6, betray: false },
    normal: { peace: 1200, growth: 0.92, warAt: 0.72, aggr: 0.35, lo: 0.25, hi: 0.4, edge: 1.3, nukeRate: 0.015, focusHuman: false, build: 1, betray: false },
    hard: { peace: 300, growth: 1.15, warAt: 0.6, aggr: 0.6, lo: 0.3, hi: 0.5, edge: 1, nukeRate: 0.04, focusHuman: true, build: 1.25, betray: true },
  };
  const OPPONENTS = { few: [18, 6], normal: [32, 12], many: [52, 20] }; // [나라, 부족]
  const TRIBES = ['늑대 부족', '독수리 부족', '곰 부족', '여우 부족', '호랑이 부족', '까마귀 부족', '들소 부족', '매 부족', '사자 부족', '뱀 부족',
    '올빼미 부족', '고래 부족', '상어 부족', '표범 부족', '코뿔소 부족', '사슴 부족', '멧돼지 부족', '황소 부족', '용 부족', '거북 부족'];

  // 지도 아이콘 (24×24 칸 기준). 건설 메뉴 아이콘과 같은 모양을 쓴다.
  const SHAPE_D = {
    city: 'M4.5 4.5h15v15h-15z',
    port: 'M12 4.5a7.5 7.5 0 1 1 0 15a7.5 7.5 0 1 1 0-15z',
    defense: 'M4.5 4.5h15v7.5L12 19.5 4.5 12z',
    factory: 'M4 19.5V9l5 3V9l5 3V5h6v14.5z',
    silo: 'M12 3.5l7 16H5z',
    sam: 'M12 4l8 8-8 8-8-8z',
    boat: 'M3 13.5h18l-3.5 6h-11z M11 3.5h1.5v10H11z M12.5 4.5l6 7.5h-6z',
  };
  const SHAPES = {};
  for (const k in SHAPE_D) SHAPES[k] = new Path2D(SHAPE_D[k]);
  const ICONS = {};
  for (const k of BUILD_ORDER) {
    ICONS[k] = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${SHAPE_D[k]}" fill="currentColor" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }

  // ===== 도우미 =====
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const since = (map, key) => tick - (map.get(key) ?? -1e9);
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function fmt(n) {
    n = Math.max(0, Math.floor(n));
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(n);
  }
  // 받침에 따라 조사를 고른다: josa('중국', '이', '가') → '중국이'
  function josa(word, withBatchim, without) {
    const c = word.charCodeAt(word.length - 1);
    if (c < 0xac00 || c > 0xd7a3) return `${word}${withBatchim}(${without})`;
    return word + ((c - 0xac00) % 28 ? withBatchim : without);
  }
  function mmss(ticks) {
    const s = Math.max(0, Math.floor(ticks / 10));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  function hsl(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h / 30) % 12;
      return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
    };
    return [f(0), f(8), f(4)];
  }

  // ===== 지도 =====
  const W = MAP_W, H = MAP_H, N = W * H;
  const terrain = new Uint8Array(N); // 0 바다, 1 평지, 2 고지대, 3 산
  {
    const bin = atob(MAP_RLE);
    let p = 0;
    for (let k = 0; k < bin.length; k++) {
      const b = bin.charCodeAt(k), len = (b & 63) + 1;
      terrain.fill(b >> 6, p, p + len);
      p += len;
    }
  }
  function nb4(i, out) {
    let c = 0;
    const x = i % W;
    if (x > 0) out[c++] = i - 1;
    if (x < W - 1) out[c++] = i + 1;
    if (i >= W) out[c++] = i - W;
    if (i < N - W) out[c++] = i + W;
    return c;
  }
  const nbuf = new Int32Array(4), obuf = new Int32Array(4), sbuf = new Int32Array(4), abuf = new Int32Array(4);
  const coast = new Uint8Array(N); // 바다와 닿은 육지
  const shore = new Uint8Array(N); // 육지와 닿은 바다
  const shade = new Int8Array(N);
  const landmass = new Int32Array(N).fill(-1);
  const landmassSize = [];
  let LAND = 0;
  for (let i = 0; i < N; i++) {
    const c = nb4(i, nbuf);
    if (terrain[i]) {
      LAND++;
      for (let k = 0; k < c; k++) if (!terrain[nbuf[k]]) { coast[i] = 1; break; }
    } else {
      for (let k = 0; k < c; k++) if (terrain[nbuf[k]]) { shore[i] = 1; break; }
    }
    shade[i] = ((Math.imul(i, 2654435761) >>> 27) % 11) - 5;
  }
  {
    const q = new Int32Array(N);
    for (let s = 0; s < N; s++) {
      if (!terrain[s] || landmass[s] >= 0) continue;
      const id = landmassSize.length;
      let qh = 0, qt = 0;
      q[qt++] = s;
      landmass[s] = id;
      while (qh < qt) {
        const c = nb4(q[qh++], nbuf);
        for (let k = 0; k < c; k++) {
          const j = nbuf[k];
          if (terrain[j] && landmass[j] < 0) { landmass[j] = id; q[qt++] = j; }
        }
      }
      landmassSize.push(qt);
    }
  }

  // ===== 상태 =====
  const owner = new Uint16Array(N);
  const edge = new Uint8Array(N); // 다른 주인 땅과 닿은 국경 칸
  const fallout = new Uint16Array(N); // 핵 낙진이 남은 틱
  const dirty = new Uint8Array(N);
  const dirtyList = [];
  const buildingAt = new Map();
  const pathCache = new Map();
  let players = [null];
  let human = null;
  let attacks = [], boats = [], ships = [], trains = [], nukes = [], buildings = [];
  let falloutTiles = [], answers = [];
  let effects = [], floats = []; // 화면 효과는 실제 시간 기준
  let tick = 0, phase = 'menu', speed = 1, paused = false, spawnLeft = 0, startTick = 0, ended = false;
  let request = null, leader = null, gameNo = 0, nextUid = 1;
  const settings = { name: '나', diff: 'normal', count: 'normal' };

  const PALETTE = [];
  for (let k = 0, h = 8; PALETTE.length < 96; k++, h = (h + 137.508) % 360) {
    if (h > 192 && h < 236) continue; // 파란색은 내 나라 몫
    PALETTE.push(hsl(h, k % 2 ? 56 : 68, [46, 56, 64][k % 3]));
  }
  const ME_COLOR = [47, 141, 255];

  function makePlayer(name, type, color) {
    const p = {
      id: players.length, name, type, color,
      css: `rgb(${color[0]},${color[1]},${color[2]})`,
      edgeColor: type === 'human' ? [205, 232, 255] : color.map((v) => Math.round(v * 0.6)),
      alive: true,
      troops: type === 'bot' ? START_TROOPS * 0.5 : START_TROOPS,
      gold: type === 'human' ? START_GOLD : type === 'nation' ? START_GOLD / 2 : 0,
      tiles: 0, maxTiles: 0, sumX: 0, sumY: 0, lx: 0, ly: 0,
      x0: W, y0: H, x1: 0, y1: 0,
      border: new Set(), out: [], boats: 0, defs: [],
      b: { city: 0, port: 0, defense: 0, factory: 0, silo: 0, sam: 0 },
      allies: new Map(), traitorUntil: -1, hate: new Map(), kills: 0,
      scan: null, scanAt: -99, boatAt: -999, askedAt: -9999, reqAt: -999, warnAt: -999, lastHit: -9999, lastHitBy: 0,
    };
    players.push(p);
    return p;
  }
  const isAllied = (a, b) => a > 0 && b > 0 && a !== b && players[a].allies.has(b);
  function maxTroops(p) {
    const m = 2 * (Math.pow(p.tiles, 0.6) * 1000 + 50000) + p.b.city * 125000;
    return p.type === 'bot' ? m * 0.45 : m;
  }
  const income = (p) => (p.type === 'bot' ? 0 : 12 + Math.sqrt(p.tiles) * 5);
  function buildCost(p, type) {
    const d = BUILD[type];
    return Math.min(d.max, d.base * Math.pow(d.grow, p.b[type]));
  }
  function nextTo(i, pid) {
    const x = i % W;
    return (x > 0 && owner[i - 1] === pid) || (x < W - 1 && owner[i + 1] === pid) ||
      (i >= W && owner[i - W] === pid) || (i < N - W && owner[i + W] === pid);
  }

  // ===== 땅 주인 바꾸기 =====
  function markDirty(i) {
    if (!dirty[i]) { dirty[i] = 1; dirtyList.push(i); }
  }
  function refreshEdge(i) {
    const o = owner[i];
    let e = 0;
    if (o) {
      const x = i % W;
      if ((x > 0 && terrain[i - 1] && owner[i - 1] !== o) || (x < W - 1 && terrain[i + 1] && owner[i + 1] !== o) ||
        (i >= W && terrain[i - W] && owner[i - W] !== o) || (i < N - W && terrain[i + W] && owner[i + W] !== o)) e = 1;
    }
    if (e !== edge[i]) {
      edge[i] = e;
      if (o) {
        if (e) players[o].border.add(i);
        else players[o].border.delete(i);
      }
      markDirty(i);
    }
  }
  function setOwner(i, pid, killer = pid) {
    const old = owner[i];
    if (old === pid) return;
    const x = i % W, y = (i / W) | 0;
    if (old) {
      const o = players[old];
      o.tiles--; o.sumX -= x; o.sumY -= y;
      if (edge[i]) o.border.delete(i);
    }
    edge[i] = 0;
    owner[i] = pid;
    if (pid) {
      const p = players[pid];
      p.tiles++; p.sumX += x; p.sumY += y;
      if (p.tiles > p.maxTiles) p.maxTiles = p.tiles;
      if (x < p.x0) p.x0 = x;
      if (x > p.x1) p.x1 = x;
      if (y < p.y0) p.y0 = y;
      if (y > p.y1) p.y1 = y;
      fallout[i] = 0;
    }
    refreshEdge(i);
    const c = nb4(i, obuf);
    for (let k = 0; k < c; k++) refreshEdge(obuf[k]);
    markDirty(i);
    const b = buildingAt.get(i);
    if (b) captureBuilding(b, pid);
    if (pid) {
      const out = players[pid].out;
      for (let k = 0; k < out.length; k++) out[k].reach(i);
    }
    if (old && players[old].tiles === 0 && phase === 'play') eliminate(players[old], killer);
  }

  // ===== 건물 =====
  function addBuilding(p, type, tile) {
    const b = { uid: nextUid++, type, owner: p.id, tile, x: tile % W, y: (tile / W) | 0, next: tick + 50 + Math.random() * 100, ready: 0, dead: false };
    buildings.push(b);
    buildingAt.set(tile, b);
    p.b[type]++;
    if (type === 'defense') p.defs.push(b);
    return b;
  }
  function captureBuilding(b, pid) {
    const prev = players[b.owner];
    prev.b[b.type]--;
    if (b.type === 'defense') prev.defs.splice(prev.defs.indexOf(b), 1);
    if (!pid || b.type === 'defense') { // 핵에 부서지거나, 빼앗긴 방어 기지는 무너진다
      b.dead = true;
      buildingAt.delete(b.tile);
      buildings.splice(buildings.indexOf(b), 1);
      return;
    }
    const p = players[pid];
    b.owner = pid;
    p.b[b.type]++;
    if (b.type === 'defense') p.defs.push(b);
    if (phase !== 'play') return;
    if (p === human) log(`${josa(BUILD[b.type].name, '을', '를')} 빼앗았어요`, 'good');
    else if (prev === human) log(`${josa(BUILD[b.type].name, '을', '를')} 빼앗겼어요`, 'bad');
  }
  function placeError(p, type, tile) {
    if (!terrain[tile] || owner[tile] !== p.id) return '내 땅에만 지을 수 있어요';
    if (type === 'port' && !coast[tile]) return '항구는 바닷가에만 지어요';
    const x = tile % W, y = (tile / W) | 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && buildingAt.has(yy * W + xx)) return '바로 옆에 다른 건물이 있어요';
      }
    }
    return null;
  }
  function build(p, type, tile) {
    const cost = buildCost(p, type);
    if (p.gold < cost) return '골드가 모자라요';
    const err = placeError(p, type, tile);
    if (err) return err;
    p.gold -= cost;
    addBuilding(p, type, tile);
    return null;
  }

  // ===== 공격 =====
  class Heap { // 우선순위가 작은 칸부터 꺼낸다
    constructor() { this.t = []; this.p = []; }
    get size() { return this.t.length; }
    peek() { return this.p[0]; }
    push(tile, pr) {
      const t = this.t, p = this.p;
      let i = t.length;
      t.push(tile); p.push(pr);
      while (i > 0) {
        const up = (i - 1) >> 1;
        if (p[up] <= pr) break;
        t[i] = t[up]; p[i] = p[up];
        i = up;
      }
      t[i] = tile; p[i] = pr;
    }
    pop() {
      const t = this.t, p = this.p;
      const top = t[0];
      const lt = t.pop(), lp = p.pop();
      const n = t.length;
      if (n) {
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i, mp = lp;
          if (l < n && p[l] < mp) { m = l; mp = p[l]; }
          if (r < n && p[r] < mp) { m = r; mp = p[r]; }
          if (m === i) break;
          t[i] = t[m]; p[i] = p[m];
          i = m;
        }
        t[i] = lt; p[i] = lp;
      }
      return top;
    }
  }

  class Attack {
    constructor(att, tgt, troops) {
      this.uid = nextUid++;
      this.att = att;
      this.tgt = tgt; // 0이면 빈 땅
      this.troops = troops;
      this.heap = new Heap();
      this.clock = 0;
      this.done = false;
    }
    push(j) {
      const A = this.att.id, x = j % W;
      let own = 0;
      if (x > 0 && owner[j - 1] === A) own++;
      if (x < W - 1 && owner[j + 1] === A) own++;
      if (j >= W && owner[j - W] === A) own++;
      if (j < N - W && owner[j + W] === A) own++;
      let d = TERRAIN_DELAY[terrain[j]] * (0.6 + Math.random() * 0.8) - own * 0.45;
      if (this.tgt) {
        const D = players[this.tgt];
        d /= clamp(0.6 + (0.6 * this.troops) / (D.troops + 1), 0.6, 1.8);
        if (nearDefense(D, j)) d *= 1.7;
      } else if (fallout[j]) d *= 1.8;
      this.heap.push(j, this.clock + Math.max(0.25, d));
    }
    reach(i) { // 공격하는 쪽이 i를 얻었을 때 이어서 나아갈 칸을 넣는다
      if (this.done) return;
      const T = this.tgt, x = i % W;
      if (x > 0 && terrain[i - 1] && owner[i - 1] === T) this.push(i - 1);
      if (x < W - 1 && terrain[i + 1] && owner[i + 1] === T) this.push(i + 1);
      if (i >= W && terrain[i - W] && owner[i - W] === T) this.push(i - W);
      if (i < N - W && terrain[i + W] && owner[i + W] === T) this.push(i + W);
    }
    step() {
      if (this.done) return;
      const A = this.att, D = this.tgt ? players[this.tgt] : null;
      if (!A.alive || (D && !D.alive)) { this.finish(A.alive); return; }
      this.clock++;
      const id = A.id;
      let n = 0;
      while (this.heap.size && this.heap.peek() <= this.clock && n < 60) {
        const j = this.heap.pop();
        if (owner[j] !== this.tgt || !terrain[j] || !nextTo(j, id)) continue;
        const cost = tileCost(D, j);
        if (this.troops < cost) { this.finish(true); return; }
        this.troops -= cost;
        if (D) D.troops = Math.max(0, D.troops - D.troops / Math.max(1, D.tiles));
        setOwner(j, id);
        n++;
        if (this.done) return;
      }
      if (!this.heap.size) this.finish(true);
    }
    finish(giveBack) {
      if (this.done) return;
      this.done = true;
      if (giveBack && this.att.alive) this.att.troops += this.troops;
      this.troops = 0;
      const k = this.att.out.indexOf(this);
      if (k >= 0) this.att.out.splice(k, 1);
    }
  }

  function nearDefense(D, j) {
    const defs = D.defs;
    if (!defs.length) return false;
    const x = j % W, y = (j / W) | 0;
    for (let k = 0; k < defs.length; k++) {
      const dx = defs[k].x - x, dy = defs[k].y - y;
      if (dx * dx + dy * dy <= DEF_R2) return true;
    }
    return false;
  }
  function tileCost(D, j) {
    const tm = TERRAIN_COST[terrain[j]];
    if (!D) return NEUTRAL_COST * tm * (fallout[j] ? 2.5 : 1);
    const density = D.troops / Math.max(1, D.tiles);
    let c = (NEUTRAL_COST * 0.5 + density * 1.2) * tm;
    if (nearDefense(D, j)) c *= 2.5;
    if (D.traitorUntil > tick) c *= 0.7;
    return c;
  }
  function seedsFor(A, tgt, lm = -1) {
    const seeds = [];
    for (const b of A.border) {
      const c = nb4(b, sbuf);
      for (let k = 0; k < c; k++) {
        const j = sbuf[k];
        if (terrain[j] && owner[j] === tgt && (lm < 0 || landmass[j] === lm)) seeds.push(j);
      }
    }
    return seeds;
  }
  function startAttack(A, tgt, troops, seeds, free = false) {
    if (!seeds.length || troops < 1 || !A.alive) return false;
    if (tgt && (isAllied(A.id, tgt) || !players[tgt].alive)) return false;
    if (!free) A.troops -= troops;
    if (tgt) {
      const D = players[tgt];
      D.hate.set(A.id, tick);
      D.lastHit = tick;
      D.lastHitBy = A.id;
      // 서로 공격하면 병력끼리 먼저 부딪친다
      const opp = D.out.find((a) => a.tgt === A.id);
      if (opp) {
        const clash = Math.min(opp.troops, troops);
        opp.troops -= clash;
        troops -= clash;
        if (opp.troops < 1) opp.finish(false);
        if (troops < 1) return true;
      }
      if (D === human && tick - A.warnAt > 150) {
        A.warnAt = tick;
        log(`${josa(A.name, '이', '가')} 쳐들어와요!`, 'bad');
      }
    }
    let atk = A.out.find((a) => a.tgt === tgt);
    if (atk) atk.troops += troops;
    else {
      atk = new Attack(A, tgt, troops);
      A.out.push(atk);
      attacks.push(atk);
    }
    for (const j of seeds) atk.push(j);
    return true;
  }

  // ===== 바다 길 찾기, 배 =====
  const bfsSeen = new Uint32Array(N), bfsPrev = new Int32Array(N), bfsQ = new Int32Array(N);
  let bfsGen = 0;
  // 바다 칸만 따라 넓게 찾는다. 찾으면 [목표 … 출발] 순서의 칸 목록을 준다.
  function bfsWater(starts, isGoal) {
    bfsGen++;
    let qh = 0, qt = 0;
    for (const s of starts) {
      if (terrain[s] || bfsSeen[s] === bfsGen) continue;
      bfsSeen[s] = bfsGen;
      bfsPrev[s] = -1;
      bfsQ[qt++] = s;
    }
    while (qh < qt) {
      const w = bfsQ[qh++];
      if (isGoal(w)) {
        const chain = [];
        for (let c = w; c !== -1; c = bfsPrev[c]) chain.push(c);
        return chain;
      }
      const x = w % W, y = (w / W) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if ((!dx && !dy) || xx < 0 || xx >= W) continue;
          const v = yy * W + xx;
          if (terrain[v] || bfsSeen[v] === bfsGen) continue;
          bfsSeen[v] = bfsGen;
          bfsPrev[v] = w;
          bfsQ[qt++] = v;
        }
      }
    }
    return null;
  }
  function waterAround(tile) {
    const out = [];
    const c = nb4(tile, sbuf);
    for (let k = 0; k < c; k++) if (!terrain[sbuf[k]]) out.push(sbuf[k]);
    return out;
  }
  function findLanding(tile) { // 목표 땅에서 가장 가까운 같은 주인의 바닷가
    if (coast[tile]) return tile;
    const o = owner[tile];
    bfsGen++;
    let qh = 0, qt = 0;
    bfsQ[qt++] = tile;
    bfsSeen[tile] = bfsGen;
    while (qh < qt && qt < 4000) {
      const i = bfsQ[qh++];
      if (coast[i]) return i;
      const c = nb4(i, sbuf);
      for (let k = 0; k < c; k++) {
        const j = sbuf[k];
        if (terrain[j] && owner[j] === o && bfsSeen[j] !== bfsGen) { bfsSeen[j] = bfsGen; bfsQ[qt++] = j; }
      }
    }
    return -1;
  }
  function launchBoat(A, tile, troops) {
    if (A.boats >= MAX_BOATS) return `배는 한 번에 ${MAX_BOATS}척까지 보낼 수 있어요`;
    if (troops < 1) return '보낼 병력이 없어요';
    const land = findLanding(tile);
    if (land < 0) return '배를 댈 바닷가가 없어요';
    const id = A.id;
    const path = bfsWater(waterAround(land), (w) => nextTo(w, id));
    if (!path) return '배로 갈 수 없는 곳이에요';
    A.troops -= troops;
    A.boats++;
    boats.push({ owner: id, troops, path, pos: 0, land, done: false });
    return null;
  }
  function boatLand(bt) {
    const A = players[bt.owner];
    A.boats = Math.max(0, A.boats - 1);
    if (!A.alive) return;
    const L = bt.land, o = owner[L];
    if (o === A.id || isAllied(A.id, o)) { A.troops += bt.troops; return; }
    const D = o ? players[o] : null;
    const cost = tileCost(D, L) * 1.5; // 상륙은 조금 더 어렵다
    if (bt.troops < cost) {
      if (A === human) log('상륙에 실패했어요. 병력이 모자라요', 'bad');
      return;
    }
    const left = bt.troops - cost;
    if (D) D.troops = Math.max(0, D.troops - D.troops / Math.max(1, D.tiles));
    setOwner(L, A.id);
    if (D === human) log(`${josa(A.name, '이', '가')} 배를 타고 쳐들어왔어요!`, 'bad');
    const seeds = [];
    const c = nb4(L, abuf);
    for (let k = 0; k < c; k++) if (terrain[abuf[k]] && owner[abuf[k]] === o) seeds.push(abuf[k]);
    if (!startAttack(A, o, left, seeds, true)) A.troops += left;
  }
  function moveBoats() {
    let any = false;
    for (const bt of boats) {
      if (!players[bt.owner].alive) { bt.done = true; any = true; continue; }
      bt.pos += BOAT_SPEED;
      if (bt.pos >= bt.path.length - 1) { bt.done = true; any = true; boatLand(bt); }
    }
    if (any) boats = boats.filter((b) => !b.done);
  }

  // ===== 무역선, 기차 =====
  function hostile(a, b) {
    return players[a].out.some((x) => x.tgt === b) || players[b].out.some((x) => x.tgt === a);
  }
  function shipPath(a, b) {
    const key = a.tile * N + b.tile;
    if (pathCache.has(key)) return pathCache.get(key);
    const goal = new Set(waterAround(b.tile));
    const chain = goal.size ? bfsWater(waterAround(a.tile), (w) => goal.has(w)) : null;
    const path = chain ? chain.reverse() : null;
    pathCache.set(key, path);
    return path;
  }
  function portsUpdate() {
    const ports = buildings.filter((b) => b.type === 'port');
    if (ports.length < 2) return;
    for (const b of ports) {
      if (b.next > tick) continue;
      b.next = tick + 150 + Math.random() * 120;
      const P = players[b.owner];
      let mine = 0;
      for (const s of ships) if (s.owner === b.owner) mine++;
      if (mine >= 3 + P.b.port) continue;
      const dests = ports.filter((o) => o.owner !== b.owner && !hostile(b.owner, o.owner));
      if (!dests.length) continue;
      const d = pick(dests);
      const path = shipPath(b, d);
      if (path && path.length > 1) ships.push({ owner: b.owner, from: b, to: d, path, pos: 0, done: false });
    }
  }
  function moveShips() {
    let any = false;
    for (const s of ships) {
      s.pos += SHIP_SPEED;
      if (s.pos < s.path.length - 1) continue;
      s.done = true;
      any = true;
      if (s.from.dead || s.to.dead) continue;
      const g = 6000 + s.path.length * 90;
      const P = players[s.from.owner], Q = players[s.to.owner];
      P.gold += g;
      Q.gold += g;
      if (P === human) addFloat(s.from.tile, '+' + fmt(g), GOLD);
      if (Q === human) addFloat(s.to.tile, '+' + fmt(g), GOLD);
    }
    if (any) ships = ships.filter((s) => !s.done);
  }
  function stationsOf(f) {
    return buildings.filter((b) => b !== f && b.owner === f.owner && (b.type === 'city' || b.type === 'port' || b.type === 'factory') &&
      (b.x - f.x) ** 2 + (b.y - f.y) ** 2 <= RAIL_R2);
  }
  function factoriesUpdate() {
    for (const f of buildings) {
      if (f.type !== 'factory' || f.next > tick) continue;
      f.next = tick + 90 + Math.random() * 60;
      const st = stationsOf(f);
      if (!st.length) continue;
      const s = pick(st);
      trains.push({ f, s, owner: f.owner, t: 0, dur: Math.max(10, Math.hypot(s.x - f.x, s.y - f.y) / 0.9), done: false });
    }
  }
  function moveTrains() {
    let any = false;
    for (const tr of trains) {
      if (++tr.t < tr.dur) continue;
      tr.done = true;
      any = true;
      if (tr.f.dead || tr.s.dead || tr.f.owner !== tr.owner || tr.s.owner !== tr.owner) continue;
      const P = players[tr.owner];
      const g = Math.round(5000 + tr.dur * 200);
      P.gold += g;
      if (P === human) addFloat(tr.s.tile, '+' + fmt(g), GOLD);
    }
    if (any) trains = trains.filter((t) => !t.done);
  }

  // ===== 핵 =====
  function launchNuke(A, type, tile) {
    const spec = NUKES[type];
    if (A.gold < spec.cost) return `골드가 ${fmt(spec.cost)} 필요해요`;
    const o = owner[tile];
    if (o && isAllied(A.id, o)) return '동맹국에는 쏠 수 없어요';
    const tx = (tile % W) + 0.5, ty = ((tile / W) | 0) + 0.5;
    let silo = null, best = Infinity;
    for (const b of buildings) {
      if (b.type !== 'silo' || b.owner !== A.id || b.ready > tick) continue;
      const d = (b.x - tx) ** 2 + (b.y - ty) ** 2;
      if (d < best) { best = d; silo = b; }
    }
    if (!silo) return A.b.silo ? '미사일 기지가 장전 중이에요' : '미사일 기지가 필요해요';
    A.gold -= spec.cost;
    silo.ready = tick + 60;
    fireNuke(A.id, type, silo.x + 0.5, silo.y + 0.5, tx, ty, o);
    const T = o ? players[o] : null;
    if (T) T.hate.set(A.id, tick);
    if (A === human) log(`${josa(spec.name, '을', '를')} 쐈어요!`);
    else if (T === human) log(`${josa(A.name, '이', '가')} 나에게 ${josa(spec.name, '을', '를')} 쐈어요!`, 'bad');
    else log(`${josa(A.name, '이', '가')} ${T ? T.name + '에 ' : ''}${josa(spec.name, '을', '를')} 쐈어요`);
    return null;
  }
  function fireNuke(ownerId, type, sx, sy, tx, ty, tgtOwner) {
    const dist = Math.hypot(tx - sx, ty - sy);
    nukes.push({ owner: ownerId, type, sx, sy, tx, ty, t: 0, dur: Math.max(12, dist / NUKES[type].speed), lift: Math.min(28, dist * 0.22), tgtOwner, tried: false, done: false });
  }
  function nukePos(nk) {
    const pr = Math.min(1, nk.t / nk.dur);
    return [nk.sx + (nk.tx - nk.sx) * pr, nk.sy + (nk.ty - nk.sy) * pr - Math.sin(Math.PI * pr) * nk.lift];
  }
  function samIntercept(nk) {
    for (const b of buildings) {
      if (b.type !== 'sam' || b.ready > tick || b.owner === nk.owner || isAllied(b.owner, nk.owner)) continue;
      const dx = b.x + 0.5 - nk.tx, dy = b.y + 0.5 - nk.ty;
      if (dx * dx + dy * dy > SAM_R2) continue;
      b.ready = tick + 60;
      const [x, y] = nukePos(nk);
      addEffect('flak', x, y, 2);
      if (Math.random() < NUKES[nk.type].sam) {
        if (b.owner === human.id) log('SAM이 핵을 떨어뜨렸어요!', 'good');
        else if (nk.owner === human.id) log('내 핵이 SAM에 맞아 떨어졌어요', 'bad');
        return true;
      }
    }
    return false;
  }
  function splitMirv(nk) {
    const out = [];
    const T = nk.tgtOwner && players[nk.tgtOwner].alive ? nk.tgtOwner : 0;
    const cx = Math.floor(nk.tx), cy = Math.floor(nk.ty);
    for (let k = 0, tries = 0; k < NUKES.mirv.warheads && tries < 500; tries++) {
      const x = cx + Math.round(rand(-40, 40)), y = cy + Math.round(rand(-30, 30));
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      if (!terrain[i] || (T && owner[i] !== T && tries < 400)) continue;
      out.push({ owner: nk.owner, type: 'warhead', sx: nk.tx, sy: nk.ty, tx: x + 0.5, ty: y + 0.5, t: 0, dur: 14 + Math.random() * 10, lift: 6, tgtOwner: owner[i], tried: false, done: false });
      k++;
    }
    return out;
  }
  function detonate(nk) {
    const r = NUKES[nk.type].r, r2 = r * r, cx = nk.tx, cy = nk.ty;
    const hit = new Map();
    const tiles = [];
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.ceil(cy + r)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d2 = dx * dx + dy * dy;
        const i = y * W + x;
        if (d2 > r2 || !terrain[i]) continue;
        if (d2 > r2 * 0.7 && Math.random() < 0.35) continue; // 가장자리는 듬성듬성
        tiles.push(i);
        if (owner[i]) hit.set(owner[i], (hit.get(owner[i]) || 0) + 1);
      }
    }
    for (const [o, n] of hit) {
      const P = players[o];
      P.troops = Math.max(0, P.troops * (1 - Math.min(1, (n / Math.max(1, P.tiles)) * 1.5)));
      if (o !== nk.owner) P.hate.set(nk.owner, tick);
    }
    for (const i of tiles) {
      if (owner[i]) setOwner(i, 0, nk.owner);
      if (!fallout[i]) falloutTiles.push(i);
      fallout[i] = FALLOUT_TICKS;
      markDirty(i);
    }
    addEffect('boom', cx, cy, r);
    if (human && hit.has(human.id) && nk.owner !== human.id && nk.type !== 'warhead') log('핵이 내 땅에 떨어졌어요', 'bad');
  }
  function moveNukes() {
    const born = [];
    for (const nk of nukes) {
      nk.t++;
      const pr = nk.t / nk.dur;
      if (!nk.tried && pr >= 0.6) {
        nk.tried = true;
        if (samIntercept(nk)) { nk.done = true; continue; }
      }
      if (pr < 1) continue;
      nk.done = true;
      if (nk.type === 'mirv') born.push(...splitMirv(nk));
      else detonate(nk);
    }
    if (nukes.some((n) => n.done)) nukes = nukes.filter((n) => !n.done);
    if (born.length) nukes.push(...born);
  }
  function decayFallout() {
    if (!falloutTiles.length) return;
    const keep = [];
    for (const i of falloutTiles) {
      if (!fallout[i]) continue;
      fallout[i] = fallout[i] > 10 ? fallout[i] - 10 : 0;
      if (fallout[i]) keep.push(i);
      else markDirty(i);
    }
    falloutTiles = keep;
  }

  // ===== 동맹 =====
  function ally(a, b) {
    const until = tick + ALLIANCE_TICKS;
    a.allies.set(b.id, until);
    b.allies.set(a.id, until);
    for (const x of [...a.out]) if (x.tgt === b.id) x.finish(true);
    for (const x of [...b.out]) if (x.tgt === a.id) x.finish(true);
  }
  function breakAlliance(a, b, traitor) {
    a.allies.delete(b.id);
    b.allies.delete(a.id);
    if (traitor) {
      traitor.traitorUntil = tick + TRAITOR_TICKS;
      (traitor === a ? b : a).hate.set(traitor.id, tick);
    }
  }
  function requestAlliance(P) {
    if (tick - P.reqAt < 300) { log('조금 뒤에 다시 물어볼 수 있어요'); return; }
    P.reqAt = tick;
    answers.push({ id: P.id, at: tick + 15 });
    log(`${P.name}에게 동맹을 요청했어요`);
  }
  function answerAlliance(P) {
    if (!P.alive || !human.alive) return;
    const renew = isAllied(P.id, human.id);
    let chance = renew ? 0.8 : 0.5;
    if (since(P.hate, human.id) < 900) chance -= 0.4;
    if (human.traitorUntil > tick) chance -= 0.35;
    const r = human.troops / (P.troops + 1);
    if (r > 1.5) chance += 0.25;
    else if (r < 0.6) chance -= 0.2;
    if (P.scan) for (const [id] of P.scan.enemies) if (id !== human.id && players[id].troops > P.troops * 1.5) { chance += 0.15; break; }
    if (Math.random() < chance) {
      ally(human, P);
      log(renew ? `${josa(P.name, '과', '와')} 동맹을 연장했어요` : `${josa(P.name, '이', '가')} 동맹을 받아들였어요`, 'good');
    } else log(`${josa(P.name, '이', '가')} 동맹을 거절했어요`, 'bad');
  }
  function donate(P, kind) {
    if (kind === 'troops') {
      const n = human.troops * ratio();
      human.troops -= n;
      P.troops += n;
      log(`${P.name}에게 병력 ${fmt(n)} 지원`);
    } else {
      const n = human.gold * 0.25;
      human.gold -= n;
      P.gold += n;
      log(`${P.name}에게 골드 ${fmt(n)} 지원`);
    }
  }
  function allianceUpdate() {
    if (!human) return;
    for (const [id, until] of [...human.allies]) {
      const P = players[id], left = until - tick;
      if (left <= 0) {
        breakAlliance(human, P, null);
        log(`${josa(P.name, '과', '와')} 동맹이 끝났어요`);
      } else if (left > 290 && left <= 300) log(`${josa(P.name, '과', '와')} 동맹이 30초 뒤 끝나요`);
    }
    if (request && (tick > request.until || !players[request.from].alive)) hideRequest();
    while (answers.length && answers[0].at <= tick) answerAlliance(players[answers.shift().id]);
  }

  // ===== 컴퓨터 나라 =====
  function scanNeighbors(p) {
    let neutral = false;
    const enemies = new Map();
    for (const b of p.border) {
      const c = nb4(b, sbuf);
      for (let k = 0; k < c; k++) {
        const j = sbuf[k];
        if (!terrain[j]) continue;
        const o = owner[j];
        if (o === p.id) continue;
        if (!o) neutral = true;
        else enemies.set(o, (enemies.get(o) || 0) + 1);
      }
    }
    return { neutral, enemies };
  }
  function aiThink(p) {
    const D = DIFF[settings.diff];
    if (tick - p.scanAt >= 20) { p.scan = scanNeighbors(p); p.scanAt = tick; }
    const { neutral, enemies } = p.scan;
    const fill = p.troops / maxTroops(p);
    if (neutral && fill > 0.15 && !p.out.some((a) => a.tgt === 0)) {
      startAttack(p, 0, p.troops * (p.type === 'bot' ? 0.4 : rand(0.35, 0.55)), seedsFor(p, 0));
    }
    if (fill > D.warAt && Math.random() < D.aggr && p.out.length < 3) {
      let best = null, bestScore = 0;
      for (const [id] of enemies) {
        const T = players[id];
        if (!T.alive || isAllied(p.id, id) || p.out.some((a) => a.tgt === id)) continue;
        if (T === human && tick - startTick < D.peace) continue; // 처음 몇 분은 사람을 건드리지 않는다
        let s = p.troops / (T.troops + 1);
        if (T.type === 'bot') s *= 1.4;
        if (since(p.hate, id) < 600) s *= 1.6;
        if (T.traitorUntil > tick) s *= 1.3;
        if (D.focusHuman && T === human && leader === human) s *= 1.5;
        if (neutral) s *= 0.6;
        if (s > bestScore) { bestScore = s; best = T; }
      }
      if (best && bestScore > D.edge) startAttack(p, best.id, p.troops * rand(D.lo, D.hi), seedsFor(p, best.id));
    }
    if (!neutral && p.boats < 2 && fill > 0.5 && tick - p.boatAt > 120 && (enemies.size === 0 || Math.random() < 0.15)) {
      p.boatAt = tick;
      const land = aiBoatTarget(p, D);
      if (land >= 0) launchBoat(p, land, p.troops * rand(0.3, 0.45));
    }
    if (p.type === 'nation') {
      aiBuild(p, D);
      aiNuke(p, D);
      if (D.betray) aiBetray(p);
    }
  }
  function aiBoatTarget(p, D) {
    const starts = [];
    for (let y = p.y0; y <= p.y1; y++) {
      for (let x = p.x0; x <= p.x1; x++) {
        const i = y * W + x;
        if (owner[i] === p.id && coast[i]) starts.push(...waterAround(i));
      }
    }
    if (!starts.length) return -1;
    // 작은 섬은 한 칸 먹고 끝나므로 큰 땅덩이를 먼저 노리고, 빈 땅보다 약한 나라를 더 자주 노린다
    const id = p.id;
    let empty = -1, foe = -1, smallEmpty = -1, smallFoe = -1;
    bfsWater(starts, (w) => {
      const c = nb4(w, abuf);
      for (let k = 0; k < c; k++) {
        const j = abuf[k], o = owner[j];
        if (!terrain[j] || o === id || isAllied(id, o)) continue;
        const big = landmassSize[landmass[j]] >= 150;
        if (!o) {
          if (big && empty < 0) empty = j;
          else if (!big && smallEmpty < 0) smallEmpty = j;
          continue;
        }
        if (players[o].troops > p.troops * 0.9 || (o === human.id && tick - startTick < D.peace)) continue;
        if (!big) {
          if (smallFoe < 0) smallFoe = j;
          continue;
        }
        foe = j;
        return true;
      }
      return false;
    });
    if (foe >= 0 && (empty < 0 || Math.random() < 0.7)) return foe;
    if (empty >= 0) return empty;
    return smallFoe >= 0 ? smallFoe : smallEmpty;
  }
  function aiPlace(p, type) {
    if (type === 'defense') {
      let k = 0;
      for (const b of p.border) {
        if (++k > 400) break;
        if (p.lastHitBy && !nextTo(b, p.lastHitBy)) continue;
        if (!placeError(p, type, b)) return b;
      }
      return -1;
    }
    const tries = type === 'port' ? 500 : 150;
    for (let k = 0; k < tries; k++) {
      const x = p.x0 + ((Math.random() * (p.x1 - p.x0 + 1)) | 0), y = p.y0 + ((Math.random() * (p.y1 - p.y0 + 1)) | 0);
      const i = y * W + x;
      if (owner[i] !== p.id || (type === 'port' ? !coast[i] : edge[i])) continue;
      if (!placeError(p, type, i)) return i;
    }
    return -1;
  }
  function aiBuild(p, D) {
    if (Math.random() > 0.5 * D.build) return;
    const wants = [];
    if (tick - p.lastHit < 300 && p.b.defense < Math.min(8, 1 + p.tiles / 1500)) wants.push('defense');
    if (D.nukeRate && tick > 2400 && p.tiles > 1000 && p.b.silo < (D.focusHuman ? 2 : 1)) wants.push('silo');
    if (D.nukeRate && p.b.silo && p.b.sam < 2) wants.push('sam');
    if (p.b.city < Math.min(24, 2 + p.tiles / 600)) wants.push('city');
    if (p.b.port < Math.min(4, 1 + p.tiles / 2500)) wants.push('port');
    if (p.b.factory < Math.floor((p.b.city + p.b.port) / 2)) wants.push('factory');
    if (!wants.length && p.gold > 3e6) wants.push('city');
    for (const type of wants) {
      const cost = buildCost(p, type);
      if (p.gold < cost) return; // 가장 원하는 건물을 위해 모은다
      const tile = aiPlace(p, type);
      if (tile < 0) continue;
      p.gold -= cost;
      addBuilding(p, type, tile);
      return;
    }
  }
  function aiNuke(p, D) {
    if (!D.nukeRate || !p.b.silo || p.gold < NUKES.atom.cost || Math.random() > D.nukeRate) return;
    let T = null;
    if (D.focusHuman && leader === human && human.alive && !isAllied(p.id, human.id)) T = human;
    if (!T && p.scan) {
      let best = 0;
      for (const [id] of p.scan.enemies) {
        const Q = players[id];
        if (!Q.alive || isAllied(p.id, id)) continue;
        const s = Q.troops * (since(p.hate, id) < 900 ? 2 : 1);
        if (s > best) { best = s; T = Q; }
      }
    }
    if (!T && leader && leader !== p && !isAllied(p.id, leader.id)) T = leader;
    if (!T || T.tiles < 200) return;
    const targets = buildings.filter((b) => b.owner === T.id && (b.type === 'city' || b.type === 'silo' || b.type === 'port'));
    const tile = targets.length ? pick(targets).tile : Math.floor(T.ly) * W + Math.floor(T.lx);
    if (owner[tile] !== T.id) return;
    let type = 'atom';
    if (p.gold >= NUKES.mirv.cost && D.focusHuman && T === leader) type = 'mirv';
    else if (p.gold >= NUKES.hydrogen.cost && T.tiles > 1500) type = 'hydrogen';
    launchNuke(p, type, tile);
  }
  function aiBetray(p) {
    if (!human || !isAllied(p.id, human.id) || Math.random() > 0.004 || human.tiles < p.tiles * 2.5) return;
    breakAlliance(p, human, p);
    log(`${josa(p.name, '이', '가')} 동맹을 깨고 배신했어요!`, 'bad');
  }
  function aiProposals() {
    if (request || !human || !human.alive || human.traitorUntil > tick || Math.random() > 0.35) return;
    const cands = players.filter((p) => p && p.alive && p.type === 'nation' && !isAllied(p.id, human.id) &&
      p.scan && p.scan.enemies.has(human.id) && since(p.hate, human.id) > 900 && tick - p.askedAt > 1500);
    if (!cands.length) return;
    const p = pick(cands);
    p.askedAt = tick;
    request = { from: p.id, until: tick + 150 };
    ui.requestText.textContent = `${josa(p.name, '이', '가')} 동맹을 맺자고 해요`;
    ui.request.hidden = false;
  }

  // ===== 게임 흐름 =====
  function eliminate(P, killerId) {
    if (!P.alive) return;
    P.alive = false;
    P.troops = 0;
    for (const a of [...P.out]) a.finish(false);
    for (const [id] of P.allies) players[id].allies.delete(P.id);
    P.allies.clear();
    const K = killerId ? players[killerId] : null;
    if (P === human) {
      log('내 나라가 멸망했어요', 'bad');
      endGame(false, K ? `${josa(K.name, '이', '가')} 내 마지막 땅을 차지했어요.` : '내 나라가 사라졌어요.');
      return;
    }
    if (K === human) {
      human.kills++;
      log(`${josa(P.name, '을', '를')} 멸망시켰어요!`, 'good');
    } else if (P.type === 'nation') log(`${josa(P.name, '이', '가')} 멸망했어요`);
  }
  function updateLabels() {
    let top = null;
    for (let k = 1; k < players.length; k++) {
      const p = players[k];
      if (!p.alive || !p.tiles) continue;
      if (!top || p.tiles > top.tiles) top = p;
      let x = Math.round(p.sumX / p.tiles), y = Math.round(p.sumY / p.tiles);
      if (owner[y * W + x] !== p.id) {
        const t = nearestOwned(p.id, x, y, 24);
        if (t >= 0) { x = t % W; y = (t / W) | 0; }
        else if (p.border.size) {
          const b = p.border.values().next().value;
          x = b % W; y = (b / W) | 0;
        }
      }
      p.lx = x + 0.5;
      p.ly = y + 0.5;
    }
    leader = top;
  }
  function nearestOwned(pid, x, y, R) {
    for (let r = 1; r <= R; r++) {
      for (let k = -r; k <= r; k++) {
        const cand = [x + k, y - r, x + k, y + r, x - r, y + k, x + r, y + k];
        for (let m = 0; m < 8; m += 2) {
          const xx = cand[m], yy = cand[m + 1];
          if (xx >= 0 && yy >= 0 && xx < W && yy < H && owner[yy * W + xx] === pid) return yy * W + xx;
        }
      }
    }
    return -1;
  }
  function checkEnd() {
    if (ended || !human || !human.alive) return;
    if (human.tiles / LAND >= WIN_SHARE) { endGame(true, '세계 땅의 80%를 차지했어요!'); return; }
    let others = 0;
    for (let k = 1; k < players.length; k++) {
      const p = players[k];
      if (p === human || !p.alive) continue;
      others++;
      if (p.tiles / LAND >= WIN_SHARE) { endGame(false, `${josa(p.name, '이', '가')} 세계 땅의 80%를 차지했어요.`); return; }
    }
    if (!others) endGame(true, '다른 나라를 모두 이겼어요!');
  }

  function step() {
    tick++;
    const D = DIFF[settings.diff];
    for (let k = 1; k < players.length; k++) {
      const p = players[k];
      if (!p.alive) continue;
      let add = (10 + Math.pow(p.troops, 0.73) / 4) * (1 - p.troops / maxTroops(p));
      if (p.type !== 'human') add *= D.growth;
      p.troops = Math.max(0, p.troops + add);
      p.gold += income(p);
    }
    for (const a of attacks) a.step();
    if (attacks.some((a) => a.done)) attacks = attacks.filter((a) => !a.done);
    moveBoats();
    moveShips();
    moveTrains();
    moveNukes();
    if (tick % 10 === 0) {
      decayFallout();
      allianceUpdate();
      portsUpdate();
      factoriesUpdate();
      updateLabels();
      checkEnd();
    }
    if (tick % 150 === 0) aiProposals();
    for (let k = 1; k < players.length; k++) {
      const p = players[k];
      if (p.alive && p.type !== 'human' && (tick + k * 3) % 10 === 0) aiThink(p);
    }
  }

  // ===== 시작 위치 =====
  function claimSpawn(p, center) {
    const cx = center % W, cy = (center / W) | 0, lm = landmass[center];
    for (let dy = -SPAWN_R; dy <= SPAWN_R; dy++) {
      for (let dx = -SPAWN_R; dx <= SPAWN_R; dx++) {
        const x = cx + dx, y = cy + dy;
        if (dx * dx + dy * dy > SPAWN_R * SPAWN_R + 1 || x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = y * W + x;
        if (terrain[i] && !owner[i] && landmass[i] === lm) setOwner(i, p.id);
      }
    }
  }
  function releaseSpawn(p) {
    for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) if (owner[y * W + x] === p.id) setOwner(y * W + x, 0);
    p.x0 = W; p.y0 = H; p.x1 = 0; p.y1 = 0;
  }
  function freeTileNear(tile, R) {
    if (terrain[tile] && !owner[tile]) return tile;
    const x = tile % W, y = (tile / W) | 0;
    for (let r = 1; r <= R; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const i = yy * W + xx;
          if (terrain[i] && !owner[i]) return i;
        }
      }
    }
    return -1;
  }
  function clearAround(i, r) {
    const x = i % W, y = (i / W) | 0;
    for (let dy = -r; dy <= r; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < W && owner[yy * W + xx]) return false;
      }
    }
    return true;
  }
  function randomSpawnTile(minDist) {
    for (let k = 0; k < 800; k++) {
      const i = (Math.random() * N) | 0;
      if (terrain[i] && !owner[i] && landmassSize[landmass[i]] >= 300 && clearAround(i, minDist)) return i;
    }
    for (let k = 0; k < 4000; k++) {
      const i = (Math.random() * N) | 0;
      if (terrain[i] && !owner[i]) return i;
    }
    return -1;
  }

  function newGame() {
    gameNo++;
    owner.fill(0); edge.fill(0); fallout.fill(0);
    players = [null];
    attacks = []; boats = []; ships = []; trains = []; nukes = []; buildings = [];
    falloutTiles = []; answers = []; effects = []; floats = [];
    buildingAt.clear();
    tick = 0; speed = 1; paused = false; ended = false; request = null; leader = null;
    human = makePlayer(settings.name, 'human', ME_COLOR);
    const [nNations, nBots] = OPPONENTS[settings.count];
    shuffle(NATIONS.slice()).slice(0, nNations).forEach(([name, x, y], k) => {
      const p = makePlayer(name, 'nation', PALETTE[k % PALETTE.length]);
      const t = freeTileNear(y * W + x, 6);
      if (t >= 0) claimSpawn(p, t);
      else p.alive = false;
    });
    const tribes = shuffle(TRIBES.slice());
    for (let k = 0; k < nBots; k++) {
      const p = makePlayer(tribes[k % tribes.length], 'bot', PALETTE[(nNations + k) % PALETTE.length]);
      const t = randomSpawnTile(10);
      if (t >= 0) claimSpawn(p, t);
      else p.alive = false;
    }
    human.spawned = false;
    for (let i = 0; i < N; i++) paint(i);
    dirtyList.length = 0;
    dirty.fill(0);
    mapCtx.putImageData(img, 0, 0);
    updateLabels();
    phase = 'spawn';
    spawnLeft = SPAWN_MS;
  }
  function humanSpawn(tile) {
    if (!terrain[tile]) return;
    const t = freeTileNear(tile, 3);
    if (t < 0) { flashBanner('다른 나라 땅이에요. 빈 곳을 골라요'); return; }
    if (human.spawned) releaseSpawn(human);
    claimSpawn(human, t);
    human.spawned = true;
    ui.bannerGo.hidden = false;
    addEffect('ripple', (t % W) + 0.5, ((t / W) | 0) + 0.5, 4);
    updateLabels();
  }
  function beginPlay() {
    if (!human.spawned) {
      const t = randomSpawnTile(8);
      if (t >= 0) claimSpawn(human, t);
      human.spawned = true;
    }
    phase = 'play';
    startTick = tick;
    ui.banner.hidden = true;
    ui.hint.hidden = true;
    ui.hud.hidden = false;
    updateLabels();
    focusOn(human.lx, human.ly, Math.max(view.minS * 3, 3.5));
    log('시작! 빈 땅을 누르면 땅이 넓어져요', 'good');
    const g = gameNo;
    setTimeout(() => g === gameNo && phase === 'play' && log('내 땅을 누르면 건물을 지을 수 있어요'), 6000);
    setTimeout(() => g === gameNo && phase === 'play' && log('다른 나라를 길게 누르면 동맹·핵 메뉴가 나와요'), 14000);
  }
  function endGame(win, text) {
    if (ended) return;
    ended = true;
    paused = true;
    closeSheet();
    ui.over.classList.toggle('win', win);
    ui.overTitle.textContent = win ? '승리!' : '패배';
    ui.overText.textContent = text;
    ui.oTime.textContent = mmss(tick - startTick);
    ui.oMax.textContent = ((human.maxTiles / LAND) * 100).toFixed(1) + '%';
    ui.oKills.textContent = String(human.kills);
    ui.watch.textContent = win ? '계속 하기' : '지켜보기';
    ui.over.hidden = false;
  }
  function toMenu() {
    phase = 'menu';
    paused = false;
    closeSheet();
    hideRequest();
    ui.hud.hidden = true;
    ui.banner.hidden = true;
    ui.hint.hidden = true;
    ui.over.hidden = true;
    ui.pause.hidden = true;
    ui.menu.hidden = false;
  }

  // ===== 사람 조작 =====
  function ratio() { return +ui.ratio.value / 100; }
  function humanAttack(tile) {
    const o = owner[tile];
    const troops = human.troops * ratio();
    if (troops < 1) { log('보낼 병력이 없어요', 'bad'); return; }
    if (o && isAllied(human.id, o)) { log(`${josa(players[o].name, '은', '는')} 동맹이에요`); return; }
    const seeds = seedsFor(human, o, o ? -1 : landmass[tile]);
    if (seeds.length) {
      startAttack(human, o, troops, seeds);
      addFloat(tile, '-' + fmt(troops), '#ffffff');
      addEffect('ripple', (tile % W) + 0.5, ((tile / W) | 0) + 0.5, 3);
      return;
    }
    const err = launchBoat(human, tile, troops);
    if (err) { log(err, 'bad'); return; }
    addEffect('ripple', (tile % W) + 0.5, ((tile / W) | 0) + 0.5, 3);
    log(o ? `${josa(players[o].name, '을', '를')} 향해 배를 보냈어요` : '빈 땅으로 배를 보냈어요');
  }
  function retreat(a) {
    a.troops *= 0.75;
    a.finish(true);
    log('공격을 멈추고 병력을 돌렸어요 (25% 잃음)');
  }

  // ===== 화면 =====
  const $ = (id) => document.getElementById(id);
  const ui = {
    canvas: $('map'), hud: $('hud'), troops: $('s-troops'), max: $('s-max'), bar: $('s-bar'), gold: $('s-gold'), income: $('s-income'),
    land: $('s-land'), meChip: $('me-chip'), meName: $('me-name'), fronts: $('fronts'), board: $('board-list'), feed: $('feed'),
    ratio: $('ratio'), ratioText: $('ratio-text'), pauseBtn: $('btn-pause'), speedBtn: $('btn-speed'), homeBtn: $('btn-home'),
    banner: $('banner'), bannerText: $('banner-text'), bannerGo: $('banner-go'), hint: $('hint'),
    request: $('request'), requestText: $('request-text'), reqYes: $('req-yes'), reqNo: $('req-no'),
    sheet: $('sheet'), sheetChip: $('sheet-chip'), sheetTitle: $('sheet-title'), sheetSub: $('sheet-sub'), sheetBody: $('sheet-body'), sheetClose: $('sheet-close'),
    menu: $('menu'), start: $('btn-start'), optName: $('opt-name'),
    pause: $('pause'), resume: $('btn-resume'), quit: $('btn-quit'),
    over: $('over'), overTitle: $('over-title'), overText: $('over-text'), oTime: $('o-time'), oMax: $('o-max'), oKills: $('o-kills'),
    again: $('btn-again'), watch: $('btn-watch'),
  };
  const canvas = ui.canvas;
  const ctx = canvas.getContext('2d');
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = W;
  mapCanvas.height = H;
  const mapCtx = mapCanvas.getContext('2d');
  const img = mapCtx.createImageData(W, H);
  const px = img.data;
  const view = { ox: 0, oy: 0, s: 1, cw: 1, ch: 1, dpr: 1, minS: 0.5 };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let camAnim = null;

  const SEA = [16, 36, 59], SHALLOW = [27, 57, 88], FALLOUT_RGB = [84, 90, 58];
  const TERRAIN_RGB = [SEA, [146, 174, 112], [184, 166, 118], [212, 206, 192]];
  function paint(i) {
    const k = i << 2, t = terrain[i];
    let r, g, b;
    if (!t) {
      const c = shore[i] ? SHALLOW : SEA;
      r = c[0]; g = c[1]; b = c[2];
    } else {
      const o = owner[i], sh = shade[i];
      if (o) {
        const p = players[o];
        if (edge[i]) {
          const e = p.edgeColor;
          r = e[0]; g = e[1]; b = e[2];
        } else {
          const base = TERRAIN_RGB[t], c = p.color;
          r = base[0] * 0.42 + c[0] * 0.58 + sh;
          g = base[1] * 0.42 + c[1] * 0.58 + sh;
          b = base[2] * 0.42 + c[2] * 0.58 + sh;
        }
      } else {
        const base = fallout[i] ? FALLOUT_RGB : TERRAIN_RGB[t];
        r = base[0] + sh; g = base[1] + sh; b = base[2] + sh;
      }
    }
    px[k] = r; px[k + 1] = g; px[k + 2] = b; px[k + 3] = 255;
  }

  function clampTo(v) {
    v.s = clamp(v.s, view.minS, 40);
    const mw = W * v.s, mh = H * v.s;
    v.ox = mw <= view.cw ? (view.cw - mw) / 2 : clamp(v.ox, view.cw * 0.7 - mw, view.cw * 0.3);
    v.oy = mh <= view.ch ? (view.ch - mh) / 2 : clamp(v.oy, view.ch * 0.7 - mh, view.ch * 0.3);
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    const fitted = Math.abs(view.s - view.minS) < 1e-6;
    view.cw = Math.max(1, r.width);
    view.ch = Math.max(1, r.height);
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(view.cw * view.dpr);
    canvas.height = Math.round(view.ch * view.dpr);
    view.minS = Math.min(view.cw / W, view.ch / H);
    if (fitted) view.s = view.minS;
    clampTo(view);
  }
  function fitAll() {
    view.s = view.minS;
    clampTo(view);
  }
  function zoomAt(sx, sy, factor) {
    const tx = (sx - view.ox) / view.s, ty = (sy - view.oy) / view.s;
    view.s = clamp(view.s * factor, view.minS, 40);
    view.ox = sx - tx * view.s;
    view.oy = sy - ty * view.s;
    clampTo(view);
    camAnim = null;
  }
  function focusOn(tx, ty, s) {
    const to = { s: clamp(s, view.minS, 40) };
    to.ox = view.cw / 2 - tx * to.s;
    to.oy = view.ch / 2 - ty * to.s;
    clampTo(to);
    if (reduceMotion) { Object.assign(view, to); return; }
    camAnim = { from: { ox: view.ox, oy: view.oy, s: view.s }, to, t0: performance.now(), dur: 700 };
  }
  function tileAt(sx, sy) {
    const x = Math.floor((sx - view.ox) / view.s), y = Math.floor((sy - view.oy) / view.s);
    return x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x;
  }
  const scr = (tx, ty) => [view.ox + tx * view.s, view.oy + ty * view.s];

  function addEffect(kind, x, y, r) {
    if (reduceMotion && kind === 'ripple') return;
    effects.push({ kind, x, y, r, t0: performance.now(), dur: kind === 'boom' ? 1400 : kind === 'flak' ? 500 : 650 });
  }
  function addFloat(tile, text, color) {
    floats.push({ x: (tile % W) + 0.5, y: ((tile / W) | 0) + 0.5, text, color, t0: performance.now() });
    if (floats.length > 40) floats.shift();
  }

  function render(now) {
    if (camAnim) {
      const k = Math.min(1, (now - camAnim.t0) / camAnim.dur), e = 1 - (1 - k) ** 3;
      const { from, to } = camAnim;
      view.s = from.s + (to.s - from.s) * e;
      view.ox = from.ox + (to.ox - from.ox) * e;
      view.oy = from.oy + (to.oy - from.oy) * e;
      if (k >= 1) camAnim = null;
    }
    if (dirtyList.length) {
      for (let k = 0; k < dirtyList.length; k++) {
        const i = dirtyList[k];
        dirty[i] = 0;
        paint(i);
      }
      dirtyList.length = 0;
      mapCtx.putImageData(img, 0, 0);
    }
    const s = view.s;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = 'rgb(16,36,59)';
    ctx.fillRect(0, 0, view.cw, view.ch);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mapCanvas, view.ox, view.oy, W * s, H * s);
    ctx.lineJoin = 'round';
    drawRails(s);
    drawBuildings(s);
    drawShips(s);
    drawTrains(s);
    drawBoats(s);
    drawNukes(s, now);
    drawEffects(now);
    drawLabels(s);
    drawFloats(now);
  }
  const onScreen = (x, y, m) => x > -m && y > -m && x < view.cw + m && y < view.ch + m;
  function drawRails(s) {
    if (s < 2.5) return;
    ctx.strokeStyle = 'rgba(240, 232, 210, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (const f of buildings) {
      if (f.type !== 'factory') continue;
      const [fx, fy] = scr(f.x + 0.5, f.y + 0.5);
      for (const st of stationsOf(f)) {
        const [x, y] = scr(st.x + 0.5, st.y + 0.5);
        ctx.moveTo(fx, fy);
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function drawShape(shape, x, y, z, fill) {
    ctx.save();
    ctx.translate(x - z / 2, y - z / 2);
    ctx.scale(z / 24, z / 24);
    ctx.fillStyle = fill;
    ctx.fill(shape);
    ctx.stroke(shape);
    ctx.restore();
  }
  function drawBuildings(s) {
    const z = Math.min(18, s * 2.6);
    if (z < 4.5) return;
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#fff';
    for (const b of buildings) {
      const [x, y] = scr(b.x + 0.5, b.y + 0.5);
      if (onScreen(x, y, 20)) drawShape(SHAPES[b.type], x, y, z, players[b.owner].css);
    }
  }
  function pathPos(path, pos) {
    const k = Math.min(path.length - 1, Math.floor(pos)), k2 = Math.min(path.length - 1, k + 1), f = pos - Math.floor(pos);
    const a = path[k], b = path[k2];
    const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0;
    return [ax + 0.5 + (bx - ax) * f, ay + 0.5 + (by - ay) * f];
  }
  function drawShips(s) {
    const r = clamp(s * 0.55, 1.4, 3.5);
    ctx.fillStyle = GOLD;
    ctx.strokeStyle = 'rgba(10, 16, 24, 0.7)';
    ctx.lineWidth = 1;
    for (const sh of ships) {
      const [tx, ty] = pathPos(sh.path, sh.pos);
      const [x, y] = scr(tx, ty);
      if (!onScreen(x, y, 10)) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  function drawTrains(s) {
    if (s < 2.5) return;
    ctx.fillStyle = '#fff8e6';
    for (const tr of trains) {
      const k = tr.t / tr.dur;
      const [x, y] = scr(tr.f.x + 0.5 + (tr.s.x - tr.f.x) * k, tr.f.y + 0.5 + (tr.s.y - tr.f.y) * k);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }
  function drawBoats(s) {
    const z = clamp(s * 3, 10, 24);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    for (const bt of boats) {
      const [tx, ty] = pathPos(bt.path, bt.pos);
      const [x, y] = scr(tx, ty);
      if (!onScreen(x, y, 30)) continue;
      drawShape(SHAPES.boat, x, y, z, players[bt.owner].css);
      if (s >= 2.5) labelText(fmt(bt.troops), x, y - z * 0.75, 12, '#fff');
    }
  }
  function drawNukes(s, now) {
    for (const nk of nukes) {
      const [tx, ty] = scr(nk.tx, nk.ty);
      if (nk.type !== 'warhead') {
        const R = Math.max(6, NUKES[nk.type === 'mirv' ? 'hydrogen' : nk.type].r * s);
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(255, 96, 80, ${reduceMotion ? 0.8 : 0.55 + 0.35 * Math.sin(now / 120)})`;
        ctx.beginPath();
        ctx.arc(tx, ty, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const [x1, y1] = scr(...nukePos(nk));
      const back = { ...nk, t: Math.max(0, nk.t - nk.dur * 0.08) };
      const [x0, y0] = scr(...nukePos(back));
      ctx.strokeStyle = 'rgba(255, 220, 150, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.fillStyle = '#ffe2a0';
      ctx.beginPath();
      ctx.arc(x1, y1, nk.type === 'warhead' ? 2 : 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawEffects(now) {
    effects = effects.filter((f) => now - f.t0 < f.dur);
    for (const f of effects) {
      const k = clamp((now - f.t0) / f.dur, 0, 1);
      const [x, y] = scr(f.x, f.y);
      if (f.kind === 'boom') {
        const R = Math.max(10, f.r * view.s) * (0.35 + 0.9 * (1 - (1 - k) ** 3));
        const g = ctx.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, `rgba(255, 250, 235, ${0.95 * (1 - k)})`);
        g.addColorStop(0.45, `rgba(255, 170, 80, ${0.75 * (1 - k)})`);
        g.addColorStop(1, 'rgba(255, 90, 40, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const R = f.kind === 'flak' ? 4 + 10 * k : Math.max(8, f.r * view.s) * (0.4 + k);
        ctx.strokeStyle = f.kind === 'flak' ? `rgba(255, 255, 255, ${1 - k})` : `rgba(255, 255, 255, ${0.9 * (1 - k)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  function labelText(text, x, y, size, color) {
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size * 0.22);
    ctx.strokeStyle = 'rgba(6, 12, 20, 0.72)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
  function drawLabels(s) {
    for (let k = 1; k < players.length; k++) {
      const p = players[k];
      if (!p.alive || !p.tiles) continue;
      const size = Math.min(40, Math.sqrt(p.tiles) * s * 0.36);
      if (size < 8 && p !== human) continue;
      const [x, y] = scr(p.lx, p.ly);
      if (!onScreen(x, y, 120)) continue;
      const sz = Math.max(size, 11);
      const color = p === human ? '#ffffff' : human && isAllied(human.id, p.id) ? '#c9f7d6' : p.traitorUntil > tick ? '#ffc4bd' : '#eef3f8';
      labelText(p.name, x, y - sz * 0.45, sz, color);
      labelText(fmt(p.troops), x, y + sz * 0.5, sz * 0.78, color);
    }
  }
  function drawFloats(now) {
    floats = floats.filter((f) => now - f.t0 < 1300);
    for (const f of floats) {
      const k = clamp((now - f.t0) / 1300, 0, 1);
      const [x, y] = scr(f.x, f.y);
      ctx.globalAlpha = 1 - k * k;
      labelText(f.text, x, y - 10 - k * 24, 15, f.color);
    }
    ctx.globalAlpha = 1;
  }

  // ===== 메뉴 판 (아래에서 올라옴) =====
  let sheet = null; // { kind: 'build' | 'info', tile }
  function openSheet(kind, tile) {
    sheet = { kind, tile };
    renderSheet(true);
  }
  function closeSheet() {
    sheet = null;
    ui.sheet.hidden = true;
  }
  function sheetSpec() {
    if (!sheet || !human) return null;
    return owner[sheet.tile] === human.id || sheet.kind === 'build' ? buildSheet(sheet.tile) : infoSheet(sheet.tile);
  }
  function renderSheet(rebuild) {
    const spec = sheetSpec();
    if (!spec) { closeSheet(); return; }
    ui.sheetChip.style.background = spec.chip;
    ui.sheetTitle.textContent = spec.title;
    ui.sheetSub.textContent = spec.sub;
    const body = ui.sheetBody;
    const sig = spec.actions.map((a) => a.key).join('|');
    if (rebuild || body.dataset.sig !== sig) {
      body.dataset.sig = sig;
      body.replaceChildren();
      for (const a of spec.actions) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'act' + (a.tone ? ' ' + a.tone : '') + (a.icon ? '' : ' plain');
        btn.dataset.key = a.key;
        if (a.icon) btn.insertAdjacentHTML('afterbegin', a.icon);
        const name = document.createElement('span');
        name.className = 'act-name';
        const meta = document.createElement('span');
        meta.className = 'act-meta';
        btn.append(name, meta);
        body.append(btn);
      }
    }
    spec.actions.forEach((a, k) => {
      const btn = body.children[k];
      btn.querySelector('.act-name').textContent = a.name;
      btn.querySelector('.act-meta').textContent = a.off || a.meta;
      btn.disabled = !!a.off;
    });
    ui.sheet.hidden = false;
  }
  function portSpot(tile) { // 누른 곳에서 가장 가까운, 항구를 지을 수 있는 내 바닷가
    if (coast[tile] && !placeError(human, 'port', tile)) return tile;
    let best = -1, bd = Infinity;
    const x = tile % W, y = (tile / W) | 0;
    for (let dy = -8; dy <= 8; dy++) {
      for (let dx = -8; dx <= 8; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const i = yy * W + xx, d = dx * dx + dy * dy;
        if (d < bd && coast[i] && !placeError(human, 'port', i)) { bd = d; best = i; }
      }
    }
    return best;
  }
  function buildSheet(tile) {
    if (!human.alive || owner[tile] !== human.id) return null;
    return {
      chip: human.css,
      title: '내 땅에 짓기',
      sub: `${TERRAIN_NAME[terrain[tile]]}${coast[tile] ? ' · 바닷가' : ''} · 가진 골드 ${fmt(human.gold)}`,
      actions: BUILD_ORDER.map((type) => {
        const d = BUILD[type], cost = buildCost(human, type);
        const where = type === 'port' ? portSpot(tile) : tile;
        let off = null;
        if (where < 0) off = '근처에 지을 바닷가가 없어요';
        else off = placeError(human, type, where) || (human.gold < cost ? `골드 ${fmt(cost)} 필요` : null);
        return {
          key: type, icon: ICONS[type], name: human.b[type] ? `${d.name} (${human.b[type]})` : d.name,
          meta: `${fmt(cost)} · ${d.desc}`, off,
          run: () => {
            const err = build(human, type, where);
            if (err) log(err, 'bad');
            else {
              addFloat(where, d.name, '#ffffff');
              addEffect('ripple', (where % W) + 0.5, ((where / W) | 0) + 0.5, 3);
            }
          },
        };
      }),
    };
  }
  function infoSheet(tile) {
    if (!terrain[tile]) return null;
    const o = owner[tile];
    const P = o ? players[o] : null;
    const send = human.troops * ratio();
    const allied = isAllied(human.id, o);
    const acts = [];
    if (human.alive && !allied) {
      acts.push({ key: 'attack', name: '공격', meta: `병력 ${fmt(send)} 보내기`, off: send < 1 ? '보낼 병력이 없어요' : null, run: () => humanAttack(tile) });
    }
    if (P && human.alive) {
      const wait = tick - P.reqAt < 300 ? '잠시 뒤에 다시 요청해요' : null;
      if (P.type === 'bot') acts.push({ key: 'ally', name: '동맹 요청', meta: '', off: '부족은 동맹을 맺지 않아요', run() {} });
      else if (allied) {
        acts.push({ key: 'renew', tone: 'good', name: '동맹 연장', meta: `${mmss(human.allies.get(o) - tick)} 남음`, off: wait, run: () => requestAlliance(P) });
        acts.push({ key: 'troops', name: '병력 지원', meta: `${fmt(send)} 보내기`, off: send < 1 ? '보낼 병력이 없어요' : null, run: () => donate(P, 'troops') });
        acts.push({ key: 'gold', name: '골드 지원', meta: `${fmt(human.gold * 0.25)} 보내기`, off: human.gold < 1000 ? '보낼 골드가 없어요' : null, run: () => donate(P, 'gold') });
        acts.push({
          key: 'break', tone: 'warn', name: '동맹 깨기', meta: '60초 동안 배신자가 돼요', off: null,
          run: () => { breakAlliance(human, P, human); log('동맹을 깼어요. 60초 동안 방어가 약해져요', 'bad'); },
        });
      } else acts.push({ key: 'ally', tone: 'good', name: '동맹 요청', meta: '받아들일지는 상대가 정해요', off: wait, run: () => requestAlliance(P) });
      if (!allied) {
        const ready = buildings.some((b) => b.type === 'silo' && b.owner === human.id && b.ready <= tick);
        for (const type of ['atom', 'hydrogen', 'mirv']) {
          const n = NUKES[type];
          const off = !human.b.silo ? '미사일 기지가 필요해요' : human.gold < n.cost ? `골드 ${fmt(n.cost)} 필요` : !ready ? '미사일 기지 장전 중' : null;
          acts.push({
            key: type, tone: 'warn', name: n.name, meta: `${fmt(n.cost)} · ${n.desc}`, off,
            run: () => { const e = launchNuke(human, type, tile); if (e) log(e, 'bad'); },
          });
        }
      }
    }
    const tags = P ? [P.type === 'bot' ? '부족' : '나라', `병력 ${fmt(P.troops)}`, `영토 ${((P.tiles / LAND) * 100).toFixed(1)}%`] : [];
    if (allied) tags.push('동맹');
    if (P && P.traitorUntil > tick) tags.push('배신자');
    return {
      chip: P ? P.css : 'transparent',
      title: P ? P.name : '빈 땅',
      sub: P ? tags.join(' · ') : `${TERRAIN_NAME[terrain[tile]]} · 아직 주인이 없어요`,
      actions: acts,
    };
  }
  ui.sheetBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.act');
    if (!btn || btn.disabled || !sheet) return;
    const spec = sheetSpec();
    const a = spec && spec.actions.find((x) => x.key === btn.dataset.key);
    if (!a || a.off) return;
    a.run();
    closeSheet();
  });
  ui.sheetClose.addEventListener('click', closeSheet);

  // ===== 상태판 =====
  const feedItems = [];
  function log(text, kind = 'info') {
    const li = document.createElement('li');
    li.textContent = text;
    if (kind !== 'info') li.className = kind;
    ui.feed.append(li);
    feedItems.push({ li, t: performance.now() });
    while (feedItems.length > 5) feedItems.shift().li.remove();
  }
  function fadeFeed(now) {
    for (let k = feedItems.length - 1; k >= 0; k--) {
      const f = feedItems[k], age = now - f.t;
      if (age > 9000) { f.li.remove(); feedItems.splice(k, 1); }
      else if (age > 8000) f.li.classList.add('fade');
    }
  }
  function flashBanner(text) {
    ui.bannerText.textContent = text;
    ui.bannerText.dataset.until = String(performance.now() + 1600);
  }
  let boardSig = '';
  function renderBoard() {
    const ranked = players.filter((p) => p && p.alive && p.tiles).sort((a, b) => b.tiles - a.tiles);
    const rows = ranked.slice(0, 5);
    const mine = ranked.indexOf(human);
    if (mine >= 5) rows.push(human);
    const sig = rows.map((p) => `${p.id}:${((p.tiles / LAND) * 100).toFixed(1)}`).join(',');
    if (sig === boardSig) return;
    boardSig = sig;
    ui.board.replaceChildren(...rows.map((p) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'board-row' + (p === human ? ' me' : '');
      btn.dataset.id = p.id;
      const parts = [['rank', String(ranked.indexOf(p) + 1)], ['chip', ''], ['name', p.name], ['pct', `${((p.tiles / LAND) * 100).toFixed(1)}%`]];
      for (const [cls, text] of parts) {
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = text;
        if (cls === 'chip') span.style.background = p.css;
        btn.append(span);
      }
      li.append(btn);
      return li;
    }));
  }
  function renderFronts() {
    const rows = [];
    for (const a of human.out) rows.push({ cls: 'front', text: a.tgt ? `${players[a.tgt].name} 공격` : '빈 땅 넓히기', n: a.troops, uid: a.uid });
    for (const a of attacks) if (!a.done && a.tgt === human.id) rows.push({ cls: 'front in', text: `${a.att.name}의 공격`, n: a.troops });
    let sea = 0, seaTroops = 0;
    for (const b of boats) if (b.owner === human.id) { sea++; seaTroops += b.troops; }
    if (sea) rows.push({ cls: 'front boat', text: `배 ${sea}척 가는 중`, n: seaTroops });
    ui.fronts.replaceChildren(...rows.slice(0, 6).map((r) => {
      const div = document.createElement('div');
      div.className = r.cls;
      const t = document.createElement('span');
      t.className = 't';
      t.textContent = r.text;
      const b = document.createElement('b');
      b.textContent = fmt(r.n);
      div.append(t, b);
      if (r.uid) {
        const x = document.createElement('button');
        x.type = 'button';
        x.dataset.uid = r.uid;
        x.setAttribute('aria-label', '공격 멈추기');
        x.textContent = '×';
        div.append(x);
      }
      return div;
    }));
  }
  function onFrontPress(e) {
    const btn = e.target.closest('button[data-uid]');
    if (!btn) return;
    e.preventDefault();
    const a = human.out.find((x) => x.uid === +btn.dataset.uid);
    if (a) retreat(a);
  }
  ui.fronts.addEventListener('pointerdown', onFrontPress);
  ui.fronts.addEventListener('click', onFrontPress);
  ui.board.addEventListener('click', (e) => {
    const btn = e.target.closest('.board-row');
    const p = btn && players[+btn.dataset.id];
    if (p && p.alive) focusOn(p.lx, p.ly, Math.max(view.s, 2.5));
  });

  let hudAt = 0;
  function updateHud(now) {
    if (now - hudAt < 250) return;
    hudAt = now;
    if (phase === 'spawn') {
      if (+(ui.bannerText.dataset.until || 0) < now) {
        const sec = Math.ceil(spawnLeft / 1000);
        ui.bannerText.textContent = human.spawned ? `${sec}초 뒤 시작` : `시작할 곳을 누르세요 · ${sec}초`;
      }
      return;
    }
    if (phase !== 'play' || !human) return;
    const max = maxTroops(human);
    ui.meChip.style.background = human.css;
    ui.meName.textContent = human.alive ? human.name : `${human.name} (지켜보는 중)`;
    ui.troops.textContent = fmt(human.troops);
    ui.max.textContent = `/ ${fmt(max)}`;
    ui.bar.style.width = `${clamp((human.troops / max) * 100, 0, 100)}%`;
    ui.gold.textContent = fmt(human.gold);
    ui.income.textContent = `+${fmt(income(human) * 10)}/초`;
    ui.land.textContent = `${((human.tiles / LAND) * 100).toFixed(1)}%`;
    ui.ratioText.textContent = `${ui.ratio.value}% · ${fmt(human.troops * ratio())}`;
    ui.speedBtn.textContent = `속도 ${speed}×`;
    renderBoard();
    renderFronts();
    fadeFeed(now);
    if (sheet) renderSheet(false);
  }

  // ===== 입력 =====
  const pointers = new Map();
  let press = null, pinch = null, pressTimer = 0;
  function local(e) {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function pinchState() {
    const [a, b] = [...pointers.values()];
    return { d: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const [x, y] = local(e);
    pointers.set(e.pointerId, { x, y });
    clearTimeout(pressTimer);
    if (pointers.size === 1) {
      press = { x, y, moved: false, long: false, button: e.button };
      if (e.button === 0) {
        pressTimer = setTimeout(() => {
          if (press && !press.moved) { press.long = true; onLongPress(press.x, press.y); }
        }, 480);
      }
    } else {
      press = null;
      pinch = pointers.size === 2 ? pinchState() : null;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const pt = pointers.get(e.pointerId);
    if (!pt) return;
    const [x, y] = local(e);
    const dx = x - pt.x, dy = y - pt.y;
    pt.x = x;
    pt.y = y;
    if (pointers.size === 1) {
      if (press && !press.moved && Math.hypot(x - press.x, y - press.y) > 8) {
        press.moved = true;
        clearTimeout(pressTimer);
      }
      if (!press || press.moved) {
        view.ox += dx;
        view.oy += dy;
        clampTo(view);
        camAnim = null;
      }
    } else if (pointers.size === 2 && pinch) {
      const now = pinchState();
      zoomAt(now.cx, now.cy, now.d / pinch.d);
      view.ox += now.cx - pinch.cx;
      view.oy += now.cy - pinch.cy;
      clampTo(view);
      pinch = now;
    }
  });
  function endPointer(e, cancelled) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    clearTimeout(pressTimer);
    if (pointers.size < 2) pinch = null;
    if (!cancelled && press && !press.moved && !press.long && press.button === 0 && pointers.size === 0) onTap(press.x, press.y);
    if (pointers.size === 0) press = null;
  }
  canvas.addEventListener('pointerup', (e) => endPointer(e, false));
  canvas.addEventListener('pointercancel', (e) => endPointer(e, true));
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const [x, y] = local(e);
    onLongPress(x, y);
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [x, y] = local(e);
    zoomAt(x, y, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });

  function onTap(sx, sy) {
    if (sheet) { closeSheet(); return; }
    const tile = tileAt(sx, sy);
    if (tile < 0) return;
    if (phase === 'spawn') { humanSpawn(tile); return; }
    if (phase !== 'play' || paused || !human.alive || !terrain[tile]) return;
    const o = owner[tile];
    if (o === human.id) openSheet('build', tile);
    else if (isAllied(human.id, o)) openSheet('info', tile);
    else humanAttack(tile);
  }
  function onLongPress(sx, sy) {
    const tile = tileAt(sx, sy);
    if (tile < 0 || !terrain[tile] || phase !== 'play' || !human) return;
    openSheet(owner[tile] === human.id ? 'build' : 'info', tile);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheet();
  });

  ui.ratio.addEventListener('input', () => { hudAt = 0; });
  ui.pauseBtn.addEventListener('click', () => {
    paused = true;
    ui.pause.hidden = false;
  });
  ui.resume.addEventListener('click', () => {
    paused = false;
    ui.pause.hidden = true;
  });
  ui.quit.addEventListener('click', toMenu);
  ui.speedBtn.addEventListener('click', () => {
    speed = speed === 3 ? 1 : speed + 1;
    hudAt = 0;
  });
  ui.homeBtn.addEventListener('click', () => {
    if (human && human.tiles) focusOn(human.lx, human.ly, Math.max(view.s, 3.5));
  });
  ui.bannerGo.addEventListener('click', () => { if (phase === 'spawn') beginPlay(); });
  ui.reqYes.addEventListener('click', () => {
    const p = request && players[request.from];
    if (p && p.alive && human.alive) {
      ally(human, p);
      log(`${josa(p.name, '과', '와')} 동맹을 맺었어요`, 'good');
    }
    hideRequest();
  });
  ui.reqNo.addEventListener('click', hideRequest);
  function hideRequest() {
    request = null;
    ui.request.hidden = true;
  }
  ui.again.addEventListener('click', toMenu);
  ui.watch.addEventListener('click', () => {
    ui.over.hidden = true;
    paused = false;
  });

  // ===== 시작 화면 =====
  const SETTINGS_KEY = 'ttang-world-settings';
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (saved) Object.assign(settings, saved);
  } catch { /* 저장소를 못 쓰는 환경 */ }
  ui.optName.value = settings.name;
  for (const [group, value] of [['diff', settings.diff], ['count', settings.count]]) {
    const input = document.getElementById(`${group}-${value}`);
    if (input) input.checked = true;
  }
  ui.start.addEventListener('click', () => {
    settings.name = ui.optName.value.trim().slice(0, 10) || '나';
    settings.diff = document.querySelector('input[name="diff"]:checked')?.value || 'normal';
    settings.count = document.querySelector('input[name="count"]:checked')?.value || 'normal';
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* 저장 안 돼도 게임은 된다 */ }
    for (const f of feedItems.splice(0)) f.li.remove();
    boardSig = '';
    closeSheet();
    hideRequest();
    newGame();
    ui.menu.hidden = true;
    ui.over.hidden = true;
    ui.pause.hidden = true;
    ui.hud.hidden = true;
    ui.banner.hidden = false;
    ui.bannerGo.hidden = true;
    ui.hint.textContent = coarse ? '두 손가락으로 확대·이동할 수 있어요' : '마우스 휠로 확대하고, 끌어서 움직여요';
    ui.hint.hidden = false;
    fitAll();
  });

  // ===== 반복 =====
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(250, now - last);
    last = now;
    if (phase === 'spawn') {
      spawnLeft -= dt;
      if (spawnLeft <= 0) beginPlay();
    } else if (phase === 'play' && !paused) {
      acc += dt * speed;
      let n = 0;
      while (acc >= TICK_MS && n < 6) {
        step();
        acc -= TICK_MS;
        n++;
      }
      if (n === 6) acc = 0;
    }
    render(now);
    updateHud(now);
    requestAnimationFrame(frame);
  }

  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();
  fitAll();
  for (let i = 0; i < N; i++) paint(i);
  mapCtx.putImageData(img, 0, 0);
  if (document.fonts) document.fonts.load(`20px ${FONT}`).catch(() => {});
  requestAnimationFrame(frame);

  // 자동 시험용 손잡이
  window.__wg = {
    get tick() { return tick; },
    get phase() { return phase; },
    get players() { return players; },
    get human() { return human; },
    LAND, W, H, owner, terrain, view,
    spawn: humanSpawn,
    begin: beginPlay,
    attack: humanAttack,
    build: (type, tile) => build(human, type, tile),
    run(n) { for (let k = 0; k < n; k++) step(); },
  };
})();
