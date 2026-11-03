// 세계 지도 데이터를 만든다: Natural Earth 육지(world-atlas)를 격자로 바꾸고
// 산맥/고원 위치로 지형을 정한 뒤 src/map-data.js 로 저장한다.
// 사용법: npm run build:map
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoPath } from 'd3-geo';
import { geoMiller } from 'd3-geo-projection';

const require = createRequire(import.meta.url);
const land50 = require('world-atlas/land-50m.json');

const W = 512;
const LAT_N = 80, LAT_S = -56;
const rad = (d) => (d * Math.PI) / 180;
const millerY = (phi) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * phi));
const S = W / (2 * Math.PI);
const Y_N = millerY(rad(LAT_N));
const H = Math.round(S * (Y_N - millerY(rad(LAT_S))));
const N = W * H;

const projection = geoMiller().scale(S).translate([W / 2, S * Y_N]).precision(0.05);
const project = (lon, lat) => projection([lon, lat]);

// ---------- 다각형 → 격자 (짝홀 규칙 스캔라인) ----------
function collectRings(geo) {
  const rings = [];
  let ring = null;
  const ctx = {
    moveTo(x, y) { ring = [[x, y]]; rings.push(ring); },
    lineTo(x, y) { ring.push([x, y]); },
    closePath() {},
    arc() {},
  };
  geoPath(projection, ctx)(geo);
  return rings;
}

function ringsFromLonLat(list) {
  return list.map((pts) => pts.map(([lon, lat]) => project(lon, lat)));
}

function fillRings(rings, out, value) {
  const rows = Array.from({ length: H }, () => []);
  for (const r of rings) {
    for (let k = 0; k < r.length; k++) {
      const [x1, y1] = r[k];
      const [x2, y2] = r[(k + 1) % r.length];
      if (y1 === y2) continue;
      const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
      for (let row = Math.max(0, Math.ceil(lo - 0.5)); row < H; row++) {
        const yc = row + 0.5;
        if (yc >= hi) break;
        if (yc < lo) continue;
        rows[row].push(x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
  }
  for (let row = 0; row < H; row++) {
    const xs = rows[row].sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] - 0.5));
      const to = Math.min(W - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
      for (let c = from; c <= to; c++) out[row * W + c] = value;
    }
  }
}

function ringArea(r) {
  let a = 0;
  for (let k = 0; k < r.length; k++) {
    const [x1, y1] = r[k];
    const [x2, y2] = r[(k + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

// ---------- 육지 ----------
const landMask = new Uint8Array(N);
const landRings = collectRings(feature(land50, land50.objects.land));
fillRings(landRings, landMask, 1);

// 칸 중심을 덮지 못한 작은 섬도 한 칸으로 남긴다 (하와이, 카리브해 섬 등)
for (const r of landRings) {
  if (ringArea(r) < 0.3) continue;
  let cx = 0, cy = 0;
  for (const [x, y] of r) { cx += x; cy += y; }
  cx = Math.floor(cx / r.length); cy = Math.floor(cy / r.length);
  if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
  let covered = false;
  for (const [x, y] of r) {
    const i = Math.floor(y) * W + Math.floor(x);
    if (landMask[i]) { covered = true; break; }
  }
  if (!covered) landMask[cy * W + cx] = 1;
}

// 큰 호수 (Natural Earth 국가 육지에는 호수가 메워져 있다)
const LAKES = [
  [[-92.1, 46.7], [-89.5, 48.0], [-86.5, 48.7], [-84.8, 47.0], [-84.6, 46.5], [-87, 46.5], [-90, 46.6]],
  [[-87.9, 44.0], [-87.5, 41.7], [-86.6, 41.9], [-86.2, 43.5], [-85.5, 45.5], [-84.8, 45.8], [-86.5, 45.9], [-87.6, 45.2]],
  [[-84.6, 45.9], [-83.5, 46.0], [-81.5, 45.8], [-80.0, 45.0], [-81.7, 43.5], [-82.4, 43.0], [-83.4, 44.0], [-83.4, 45.2]],
  [[-83.4, 41.8], [-81.5, 41.5], [-79.0, 42.5], [-79.2, 42.9], [-81.0, 42.6], [-83.0, 42.0]],
  [[-79.8, 43.3], [-76.3, 43.5], [-76.2, 44.1], [-77.5, 44.0], [-79.5, 43.6]],
  [[31.6, -0.3], [33.0, 0.3], [34.1, -0.3], [33.8, -1.8], [32.3, -2.6], [31.7, -1.5]],
  [[103.7, 51.6], [105.0, 51.5], [107.0, 52.5], [109.5, 54.5], [109.8, 55.7], [109.0, 55.8], [107.0, 53.5], [104.5, 52.0]],
  [[29.8, 60.0], [32.8, 60.5], [32.6, 61.5], [30.8, 61.6], [29.9, 61.0]],
];
fillRings(ringsFromLonLat(LAKES), landMask, 0);

// ---------- 지형 ----------
// 산맥: [굵기, [경도, 위도]...]
const RANGES = [
  [1.7, [[73, 35.5], [77, 33], [81, 30.5], [85, 28], [88, 27.8], [92, 27.5], [95, 28.5], [97, 28]]], // 히말라야
  [1.3, [[68, 34], [71, 35.5], [74, 36], [77, 35.5]]], // 힌두쿠시·카라코람
  [1.2, [[78, 36.5], [85, 36], [92, 36], [98, 35.5]]], // 쿤룬
  [1.2, [[69, 41.5], [75, 41], [80, 42], [85, 43], [90, 43.5], [94, 43]]], // 톈산
  [1.0, [[85, 50], [88, 49], [90, 48], [95, 46]]], // 알타이
  [0.9, [[59, 67], [60, 62], [59, 57], [58, 53], [58, 51]]], // 우랄
  [1.0, [[40, 43.5], [43, 43], [46, 42], [49, 41]]], // 캅카스
  [1.1, [[45, 36.5], [48, 34], [51, 31], [54, 29], [57, 27.5]]], // 자그로스
  [1.0, [[29, 37], [32, 37], [35, 37.3], [38, 38], [42, 38.5]]], // 토로스
  [1.0, [[6, 44], [7, 46], [9.5, 46.5], [12, 47], [15, 47.3]]], // 알프스
  [0.8, [[-1.5, 43], [0.5, 42.7], [3, 42.5]]], // 피레네
  [0.9, [[17.5, 49], [20, 49.3], [23, 48.8], [25, 47.5], [25.5, 45.8], [23, 45.3], [22, 44.8]]], // 카르파티아
  [0.8, [[15, 45], [17.5, 43.5], [19.5, 42], [21, 40.5]]], // 디나르알프스
  [0.9, [[6, 59], [8, 61.5], [12, 63], [14.5, 66], [17, 68], [20, 69.5]]], // 스칸디나비아
  [1.0, [[-9, 30.5], [-6, 32], [-3, 33.5], [1, 34.5], [5, 35.5], [9, 35.5]]], // 아틀라스
  [0.8, [[36, 0], [37.3, -3], [35, -8], [33.5, -10]]], // 동아프리카 지구대
  [0.8, [[27, -31], [29, -29.5], [30.5, -27.5]]], // 드라켄즈버그
  [0.8, [[35, 28], [38, 24], [40, 20], [43, 16], [44, 13]]], // 히자즈
  [1.4, [[-75, 10], [-73, 7], [-76, 3], [-78, -1], [-79, -5], [-76, -10], [-73, -14], [-69, -17], [-68, -22], [-69, -27], [-70, -33], [-71, -38], [-72, -43], [-73, -48], [-73, -52]]], // 안데스
  [1.0, [[-154, 62], [-149, 63.3], [-143, 62]]], // 알래스카산맥
  [0.9, [[-160, 68], [-150, 68.3], [-142, 69]]], // 브룩스
  [1.5, [[-140, 61], [-130, 57], [-125, 53], [-117, 51], [-114, 48], [-111, 45], [-107, 41], [-106, 37], [-105, 34]]], // 로키
  [0.9, [[-121.5, 48], [-122, 44], [-121, 40], [-119, 37], [-118, 35.5]]], // 시에라네바다·캐스케이드
  [1.0, [[-108, 30], [-105, 25], [-103, 21], [-99, 19], [-97, 17]]], // 시에라마드레
  [0.8, [[-85, 34], [-82, 36], [-79, 38], [-77, 40.5], [-74, 42], [-72, 44], [-69, 46]]], // 애팔래치아
  [0.8, [[145, -15], [146, -20], [148, -25], [151, -29], [150, -33], [148, -36], [146.5, -37.5]]], // 그레이트디바이딩
  [0.8, [[136, 35], [138, 36.5], [140, 38.5], [141, 40.5]]], // 일본 알프스
  [0.6, [[128, 38.5], [128.5, 37], [128, 35.5]]], // 태백산맥
  [1.0, [[125, 72], [128, 68], [135, 64], [140, 62]]], // 베르호얀스크
  [0.9, [[142, 68], [148, 65], [153, 63]]], // 체르스키
  [0.8, [[158, 52], [160, 56], [162, 58]]], // 캄차카
  [1.0, [[98, 28], [99, 24], [100, 21], [102, 18]]], // 윈난·인도차이나
  [0.8, [[105, 19], [107, 16], [108, 13]]], // 안남
  [0.8, [[104, 34], [108, 33.8], [112, 33.5]]], // 친링
  [0.6, [[121, 24.8], [120.8, 22.5]]], // 타이완
  [0.7, [[73.5, 18], [75, 13], [77, 9]]], // 서고츠
  [0.8, [[135, -3.5], [140, -4.5], [145, -6], [147, -7]]], // 뉴기니
  [0.7, [[95.5, 5], [100, 0], [103, -3], [104.5, -5]]], // 바리산
  [0.7, [[47, -13], [47, -19], [46.5, -23]]], // 마다가스카르
  [0.7, [[167, -46], [170, -43.5], [173, -41.5]]], // 서던알프스
];
// 고원: 대부분 고지대, 군데군데 산
const PLATEAUS = [
  [[78, 34], [80, 36], [86, 36.5], [92, 36], [98, 35], [100, 33], [99, 30], [94, 29.5], [88, 29.5], [82, 30.5]], // 티베트
  [[45, 38], [50, 37], [58, 37], [61, 33], [60, 28], [57, 26.5], [52, 28], [48, 31], [46, 35]], // 이란
  [[61, 35], [66, 37], [71, 37], [72, 34], [68, 31], [64, 31]], // 아프가니스탄
  [[29, 39], [33, 40], [38, 40.5], [42, 40], [44, 39], [41, 37.5], [36, 37], [32, 37.5]], // 아나톨리아
  [[36, 14], [39.5, 14], [41, 11], [40, 7], [38, 5.5], [35.5, 7], [35, 10]], // 에티오피아
  [[-71, -14], [-67, -15], [-65, -20], [-66, -24], [-68, -24], [-70, -19]], // 알티플라노
  [[-120, 42], [-112, 44], [-106, 41], [-104, 36], [-108, 33], [-114, 34], [-118, 37]], // 그레이트베이슨·콜로라도
  [[-106, 29], [-100, 27], [-98, 22], [-99, 19.5], [-103, 20], [-105, 24]], // 멕시코 고원
  [[-48, -10], [-42, -12], [-41, -20], [-45, -23], [-50, -20], [-50, -14]], // 브라질 고원
  [[88, 49], [100, 51], [110, 48], [115, 45], [108, 41], [98, 42], [90, 45]], // 몽골 고원
  [[95, 58], [105, 62], [110, 67], [100, 70], [92, 66]], // 중앙시베리아 고원
  [[74, 21], [80, 22], [83, 19], [79, 13], [76, 13], [74, 17]], // 데칸
  [[20, -20], [30, -18], [32, -25], [28, -30], [20, -29]], // 남아프리카 고원
  [[-64, 6], [-60, 6], [-58, 3], [-62, 2], [-65, 3]], // 기아나 고지
];

// 결정적 값 노이즈
function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(x, y, seed) {
  let v = 0, amp = 0.5, f = 1, total = 0;
  for (let o = 0; o < 4; o++) {
    v += amp * valueNoise(x * f, y * f, seed + o * 17);
    total += amp; amp *= 0.5; f *= 2;
  }
  return v / total;
}

const rangeDist = new Float32Array(N).fill(1e9);
for (const [width, pts] of RANGES) {
  const p = pts.map(([lon, lat]) => project(lon, lat));
  for (let k = 0; k + 1 < p.length; k++) {
    const [ax, ay] = p[k], [bx, by] = p[k + 1];
    const pad = 8;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - pad)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + pad));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - pad)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + pad));
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        const ex = ax + t * dx - px, ey = ay + t * dy - py;
        const d = Math.sqrt(ex * ex + ey * ey) / width;
        const i = y * W + x;
        if (d < rangeDist[i]) rangeDist[i] = d;
      }
    }
  }
}
const plateau = new Uint8Array(N);
fillRings(ringsFromLonLat(PLATEAUS), plateau, 1);

// 0 바다, 1 평지, 2 고지대, 3 산
const tiles = new Uint8Array(N);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!landMask[i]) continue;
    const n = fbm(x * 0.18, y * 0.18, 7);
    const n2 = fbm(x * 0.09, y * 0.09, 91);
    const n3 = fbm(x * 0.45, y * 0.45, 33);
    const d = rangeDist[i];
    let t = 1;
    if (d < 0.5 + 1.8 * n && n3 > 0.32) t = 3;
    else if (d < 1.8 + 3.4 * n) t = 2;
    else if (plateau[i]) t = n > 0.74 ? 3 : n > 0.3 ? 2 : 1;
    else if (n2 > 0.7) t = 2;
    tiles[i] = t;
  }
}

// ---------- 나라 시작 위치 ----------
const NATIONS = [
  ['미국', -98, 39], ['캐나다', -104, 55], ['멕시코', -102, 23], ['쿠바', -79, 21.8],
  ['브라질', -50, -12], ['아르헨티나', -64, -35], ['콜롬비아', -74, 4], ['페루', -75, -10],
  ['칠레', -70.6, -33.5], ['베네수엘라', -66, 8], ['볼리비아', -64.5, -17],
  ['영국', -1.8, 52.8], ['프랑스', 2.5, 46.8], ['스페인', -3.7, 40], ['독일', 10.4, 51],
  ['이탈리아', 12.8, 42.8], ['폴란드', 19.4, 52], ['노르웨이', 9.5, 61.5], ['스웨덴', 16, 62.5],
  ['핀란드', 26, 63], ['우크라이나', 31.5, 49], ['러시아', 40, 56], ['튀르키예', 35, 39],
  ['루마니아', 25, 46],
  ['이집트', 30.5, 27], ['리비아', 17, 27], ['알제리', 3, 28], ['모로코', -6.5, 32],
  ['말리', -2, 17], ['나이지리아', 8, 9.5], ['에티오피아', 39.5, 8.5], ['수단', 30, 15],
  ['콩고', 23.5, -3], ['케냐', 37.5, 0.5], ['앙골라', 17.5, -12], ['남아공', 25, -29.5],
  ['마다가스카르', 46.8, -19.5],
  ['사우디아라비아', 45, 24], ['이란', 53.5, 32.5], ['파키스탄', 69.5, 29.5], ['카자흐스탄', 67, 48],
  ['인도', 78.5, 22], ['중국', 110, 33.5], ['몽골', 103, 46.5], ['대한민국', 127.8, 36.4],
  ['일본', 138.5, 36.3], ['태국', 101, 15.5], ['베트남', 105.8, 21], ['인도네시아', 113.9, -1],
  ['필리핀', 121, 16], ['호주', 134, -25], ['뉴질랜드', 172.5, -42],
];

function nearestLand(x, y) {
  for (let r = 0; r < 30; r++) {
    let best = -1, bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const cx = x + dx, cy = y + dy;
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
        const i = cy * W + cx;
        if (!tiles[i]) continue;
        const dd = dx * dx + dy * dy;
        if (dd < bestD) { bestD = dd; best = i; }
      }
    }
    if (best >= 0) return best;
  }
  throw new Error(`no land near ${x},${y}`);
}

const nations = NATIONS.map(([name, lon, lat]) => {
  const [px, py] = project(lon, lat);
  const i = nearestLand(Math.floor(px), Math.floor(py));
  return [name, i % W, Math.floor(i / W)];
});

// ---------- 압축 (런 길이 부호화 + base64) ----------
// 한 바이트 = 지형(위 2비트) + 길이-1(아래 6비트)
const bytes = [];
for (let i = 0; i < N;) {
  const v = tiles[i];
  let len = 1;
  while (i + len < N && tiles[i + len] === v && len < 64) len++;
  bytes.push((v << 6) | (len - 1));
  i += len;
}
const b64 = Buffer.from(bytes).toString('base64');

let landCount = 0;
const counts = [0, 0, 0, 0];
for (let i = 0; i < N; i++) { counts[tiles[i]]++; if (tiles[i]) landCount++; }

const out = `// 자동 생성 파일: tools/build-map.mjs (Natural Earth 육지 데이터 기반)
const MAP_W = ${W};
const MAP_H = ${H};
const MAP_RLE = '${b64}';
const NATIONS = ${JSON.stringify(nations)};
`;
fs.writeFileSync(new URL('../src/map-data.js', import.meta.url), out);
console.log(`map ${W}x${H}, land ${landCount} (plains ${counts[1]}, highland ${counts[2]}, mountain ${counts[3]}), rle ${bytes.length} bytes, b64 ${b64.length}`);
