// 사용법: node src/build.js  → 상위 폴더에 단일 파일 index.html 생성
// legacy/data.js(1단계 파일 데이터)는 API 실패 시 보여 줄 '연습 모드'용 FALLBACK_DATA 로 내장합니다.
const fs = require('fs'), path = require('path');
const dir = __dirname;
let html = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
const inline = { 'data.js': 'legacy/data.js', 'eras.js': 'eras.js', 'i18n.js': 'i18n.js' };
for (const [tagName, file] of Object.entries(inline)) {
  let js = fs.readFileSync(path.join(dir, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  if (tagName === 'data.js') js = js.replace(/^const DATA\s*=/, 'const FALLBACK_DATA =');
  const tag = `<script src="${tagName}"></script>`;
  if (!html.includes(tag)) throw new Error('missing ' + tag);
  html = html.replace(tag, () => `<script>\n${js}\n</script>`);
}
fs.writeFileSync(path.join(dir, '..', 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(0) + 'KB');
