// src/ 의 파일을 하나로 합쳐 index.html 을 만든다.
// 사용법: npm run build            → index.html (브라우저로 바로 여는 파일)
//         node tools/bundle.mjs 경로 → 같은 내용을 <html>/<head> 없이 한 번 더 저장 (웹 페이지로 올릴 때)
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');

const title = '땅따먹기 월드';
const fonts = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Do+Hyeon&display=swap">',
].join('\n');
const inner = `<style>\n${read('src/style.css')}</style>\n${read('src/body.html')}<script>\n${read('src/map-data.js')}\n${read('src/game.js')}</script>\n`;

const full = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
${fonts}
</head>
<body>
${inner}</body>
</html>
`;
fs.writeFileSync(new URL('index.html', root), full);
console.log(`index.html ${(full.length / 1024).toFixed(0)} KB`);

const out = process.argv[2];
if (out) {
  fs.writeFileSync(out, `<title>${title}</title>\n${fonts}\n${inner}`);
  console.log(`${out} 저장`);
}
