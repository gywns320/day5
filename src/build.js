// 사용법: node src/build.js  → 상위 폴더에 단일 파일 index.html 생성
const fs = require('fs'), path = require('path');
const dir = __dirname;
let html = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
for (const f of ['eras.js', 'i18n.js']) {
  const js = fs.readFileSync(path.join(dir, f), 'utf8').replace(/<\/script/gi, '<\\/script');
  const tag = `<script src="${f}"></script>`;
  if (!html.includes(tag)) throw new Error('missing ' + tag);
  html = html.replace(tag, () => `<script>\n${js}\n</script>`);
}
fs.writeFileSync(path.join(dir, '..', 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(0) + 'KB');
