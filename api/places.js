// Vercel 서버리스 함수: 공공데이터포털(data.go.kr) 두 API를 불러와 장소별로 합쳐서 돌려줍니다.
// 인증키는 서버에서만 사용하므로 브라우저(index.html)에는 노출되지 않습니다.
//
// 필요한 환경변수 (Vercel > Project > Settings > Environment Variables)
//   JEJU_CULTURE_INFO_KEY      제주역사문화일반정보 API 인증키
//   JEJU_CULTURE_LOCATION_KEY  제주역사문화위치정보 API 인증키
// 인증키는 코드에 넣지 않고 위 환경변수에서만 읽습니다.

// API 주소는 공개 정보(공공데이터포털 API 명세)라서 코드에 둡니다.
// 로컬 시험용 모의 API를 쓸 때만 JEJU_CULTURE_INFO_URL / JEJU_CULTURE_LOCATION_URL 로 바꿔 끼울 수 있습니다.
const DEFAULT_INFO_URL = 'https://api.odcloud.kr/api/15109587/v1/uddi:56c2b3a4-4b4b-46cd-a1fa-f928ef731ffb';
const DEFAULT_LOCATION_URL = 'https://api.odcloud.kr/api/15109570/v1/uddi:8781448b-81a8-487c-bc95-d26335bafa82';

const PER_PAGE = 500;
const MAX_PAGES = 20;

// 응답 필드(한글 컬럼명) -> 화면에서 쓰는 이름. 공백 차이는 무시하고 찾습니다.
const LOCATION_FIELDS = {
  id: '데이터고유번호', name: '장소명', lat: '위도', lng: '경도', zip: '우편번호',
  addr: '위치', url: '데이터상세보기URL', date: '데이터기준일자',
};
const GENERAL_FIELDS = {
  id: '데이터고유번호', cat: '분류', d1: '디렉토리1', d2: '디렉토리2', title: '제목', subtitle: '부제목',
  author: '저작자', subject: '주제', content: '내용', toc: '목차', abs: '초록', publisher: '발행자',
  pubdate: '발행일', type: '자료유형', scope: '범위', source: '출처', ref: '참고문헌',
};

const squash = s => String(s).replace(/\s+/g, '');

function pick(row, fields) {
  const byKey = {};
  for (const k of Object.keys(row)) byKey[squash(k)] = row[k];
  const out = {};
  for (const [name, col] of Object.entries(fields)) {
    const v = byKey[col];
    out[name] = v === undefined || v === null ? '' : v;
  }
  return out;
}

function withKey(baseUrl, key, page) {
  const u = new URL(baseUrl);
  u.searchParams.set('page', page);
  u.searchParams.set('perPage', PER_PAGE);
  u.searchParams.set('returnType', 'JSON');
  // 포털에서 복사한 "Encoding" 키(% 포함)는 한 번 더 인코딩하지 않도록 직접 붙입니다.
  const q = u.search + '&serviceKey=' + (key.includes('%') ? key : encodeURIComponent(key));
  return u.origin + u.pathname + q;
}

async function fetchAll(label, baseUrl, key) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(withKey(baseUrl, key, page), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${label} API ${res.status}`);
    const body = await res.json();
    const data = Array.isArray(body.data) ? body.data : [];
    rows.push(...data);
    const total = Number(body.totalCount ?? body.matchCount ?? 0);
    if (!data.length || (total && rows.length >= total)) break;
  }
  return rows;
}

function merge(locationRows, generalRows) {
  const general = new Map();
  for (const row of generalRows) {
    const g = pick(row, GENERAL_FIELDS);
    general.set(String(g.id).trim(), g);
  }
  const items = [];
  for (const row of locationRows) {
    const l = pick(row, LOCATION_FIELDS);
    const id = String(l.id).trim();
    const lat = parseFloat(l.lat), lng = parseFloat(l.lng);
    if (!id || Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const g = general.get(id) || {};
    items.push({ ...g, ...l, id: Number(id), lat, lng, zip: String(l.zip) });
  }
  return items.sort((a, b) => a.id - b.id);
}

module.exports = async function handler(req, res) {
  const send = (status, body, headers = {}) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    res.end(JSON.stringify(body));
  };

  const { JEJU_CULTURE_INFO_KEY, JEJU_CULTURE_LOCATION_KEY } = process.env;
  const missing = Object.entries({ JEJU_CULTURE_INFO_KEY, JEJU_CULTURE_LOCATION_KEY })
    .filter(([, v]) => !v || !v.trim()).map(([k]) => k);
  if (missing.length) return send(500, { error: 'missing_env', missing }, { 'Cache-Control': 'no-store' });

  const infoUrl = process.env.JEJU_CULTURE_INFO_URL || DEFAULT_INFO_URL;
  const locationUrl = process.env.JEJU_CULTURE_LOCATION_URL || DEFAULT_LOCATION_URL;

  try {
    const [locationRows, generalRows] = await Promise.all([
      fetchAll('location', locationUrl, JEJU_CULTURE_LOCATION_KEY.trim()),
      fetchAll('info', infoUrl, JEJU_CULTURE_INFO_KEY.trim()),
    ]);
    const items = merge(locationRows, generalRows);
    if (!items.length) return send(502, { error: 'empty', detail: 'API에서 받은 장소가 없습니다. 주소와 인증키를 확인하세요.' }, { 'Cache-Control': 'no-store' });
    // 데이터는 거의 바뀌지 않으므로 하루 동안 Vercel 엣지에 캐시합니다.
    return send(200, { count: items.length, items }, { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' });
  } catch (e) {
    return send(502, { error: 'upstream_failed', detail: String(e.message || e) }, { 'Cache-Control': 'no-store' });
  }
};
