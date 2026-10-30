# 제주 시대별 역사유적 안내 (2단계: API 연동)

장소 데이터를 CSV 대신 **공공데이터포털 API**에서 받아옵니다.
브라우저가 API를 직접 부르지 않고, Vercel 서버 함수(`api/places.js`)가 대신 호출해서 두 데이터를 합쳐 줍니다. 그래서 **인증키가 화면 코드에 노출되지 않습니다.**

```
브라우저(index.html) → /api/places (Vercel 함수) → 공공데이터포털 API 2개
```

## Vercel 환경변수 (Settings → Environment Variables)

| 이름 | 값 |
|---|---|
| `JEJU_API_KEY` | 공공데이터포털 인증키 |
| `JEJU_GENERAL_API_URL` | 제주역사문화**일반정보**(15109587) API 주소 |
| `JEJU_LOCATION_API_URL` | 제주역사문화**위치정보**(15109570) API 주소 |

- API 주소는 공공데이터포털 마이페이지 → 활용신청 현황 → 해당 API 상세에서 확인합니다.
  (`https://api.odcloud.kr/api/15109587/v1/uddi:...` 형태. `?page=` 이후 부분은 빼고 입력)
- 값을 넣은 뒤에는 **Redeploy** 해야 반영됩니다.
- 응답은 하루 동안 Vercel 엣지에 캐시됩니다.

## 로컬 실행

`.env.example` 을 `.env.local` 로 복사해 값을 채운 뒤 `npm run dev` → http://localhost:3000

**키 없이 시험** (CSV를 모의 API로 사용): `.env.local` 을 아래처럼 채우고, 터미널 두 개에서 각각 실행합니다.

```
JEJU_API_KEY=TESTKEY
JEJU_GENERAL_API_URL=http://localhost:4010/general
JEJU_LOCATION_API_URL=http://localhost:4010/location
```

```bash
npm run mock
```

```bash
npm run dev
```

실제 API로 바꿀 때는 `.env.local` 의 세 값을 진짜 값으로 교체합니다.

## 파일 구조

- `index.html` — 화면 (`src/` 를 합쳐 만든 파일)
- `api/places.js` — API 함수
- `src/template.html`, `src/eras.js`, `src/i18n.js` — 화면 원본 / 시대 분류 / 번역. 수정 후 `npm run build`
- `dev/` — 로컬 시험용 모의 API와 개발 서버
- `src/legacy/` — CSV 방식이던 1단계 화면 보관

## 알아둘 점

- 시대 분류(`src/eras.js`)와 번역(`src/i18n.js`)은 `데이터 고유번호`를 기준으로 연결돼 있습니다. API에 장소가 추가되면 "그 외 장소"에 들어가며, 시대를 지정하려면 `eras.js` 에 추가하세요.
- 이제 `index.html` 을 파일로 더블클릭해서는 열 수 없습니다. (API 호출에 서버가 필요) Vercel 배포 주소나 `npm run dev` 로 여세요.
