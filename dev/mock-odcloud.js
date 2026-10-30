// 로컬 테스트용 모의 API. 두 CSV를 공공데이터포털(odcloud) 응답 형식으로 돌려줍니다.
//   node dev/mock-odcloud.js   → http://localhost:4010/general , /location  (serviceKey=TESTKEY)
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const PORT = process.env.MOCK_PORT || 4010;
const KEY = 'TESTKEY';

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function load(match) {
  const file = fs.readdirSync(root).find(f => f.endsWith('.csv') && f.includes(match));
  const text = new TextDecoder('euc-kr').decode(fs.readFileSync(path.join(root, file)));
  const [head, ...body] = parseCsv(text).filter(r => r.length > 1);
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const data = { general: load('일반정보'), location: load('위치정보') };

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const name = u.pathname.replace('/', '');
  const send = (s, b) => { res.writeHead(s, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(b)); };
  if (!data[name]) return send(404, { msg: 'not found' });
  if (u.searchParams.get('serviceKey') !== KEY) return send(401, { code: -4, msg: '등록되지 않은 인증키 입니다.' });
  const page = +u.searchParams.get('page') || 1, perPage = +u.searchParams.get('perPage') || 10;
  const all = data[name], slice = all.slice((page - 1) * perPage, page * perPage);
  send(200, { page, perPage, totalCount: all.length, currentCount: slice.length, matchCount: all.length, data: slice });
}).listen(PORT, () => console.log(`mock API: http://localhost:${PORT}/general  /location  (serviceKey=${KEY})`));
