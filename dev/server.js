// 로컬 개발 서버: index.html 과 /api/places 를 함께 제공합니다. (Vercel 배포 환경과 같은 구조)
//   node dev/server.js   → http://localhost:3000
// 환경변수는 .env.local 파일에서 읽습니다. (.env.example 참고)
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');

const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const places = require('../api/places.js');
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (p === '/api/places') return places(req, res);
  if (p === '/' || p === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(root, 'index.html')));
  }
  res.writeHead(404); res.end('not found');
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
