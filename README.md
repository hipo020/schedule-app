# 근무표 정리함

## 포함 기능

- 이메일 매직링크 로그인
- 월별 근무표 이미지 저장
- 월별 스케줄 검수 데이터 저장
- 다른 기기에서 로그인 후 월별 근무표 다시 불러오기
- ChatGPT/Gemini 추출 프롬프트 복사
- CSV 파일 업로드 또는 CSV 붙여넣기
- CSV 데이터를 검수표에 자동 반영
- 이미지 OCR 자동 추출 베타
- 검수표 수동 수정
- 일간 / 주간 / 월간 / 오늘 출근 / 휴무일 보기
- 카톡 공유 텍스트 복사
- 엑셀 다운로드
- 근무 코드 설정

## GitHub 업로드

압축을 풀고 아래 4개 파일만 GitHub 저장소 최상단에 업로드하세요.

```text
index.html
styles.css
app.js
README.md
```

폴더째 올리지 말고 파일만 올리는 것을 추천합니다.

## Supabase 설정 필요 항목

1. Database 테이블 생성 SQL 실행
2. `schedule-images` Storage bucket 생성
3. Storage 정책 SQL 실행
4. Authentication > URL Configuration에 Vercel 주소 등록

## Supabase 연결 정보

`app.js` 상단에 아래 값이 들어 있습니다.

```js
const SUPABASE_URL = "https://fergbabqmwnbkkxjvgkj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4kIgpTwod32qPE4gfzT_mg_d7MWHshv";
```

Secret key는 절대 넣지 마세요.

## 사용 흐름

1. 이메일 입력 후 Google 로그인 보내기
2. 메일에서 Google 로그인 클릭
3. 기준 연도/월 선택
4. 근무표 이미지 업로드
5. 데이터 입력 탭에서 추출 프롬프트 복사
6. ChatGPT/Gemini에 근무표 이미지와 프롬프트를 넣어 CSV 추출
7. 앱의 데이터 입력 탭에 CSV 붙여넣기 또는 업로드
8. CSV를 검수표에 반영 후 확인
9. 저장 버튼 또는 상단 저장 버튼 클릭
10. 월별 보관함에서 저장된 월 불러오기

## 주의

- 이메일 매직링크 로그인을 사용하려면 Supabase Redirect URL에 실제 Vercel 주소를 등록해야 합니다.
- 데이터 입력 탭의 프롬프트는 화면에 길게 표시하지 않고 복사 버튼으로 제공합니다.
- OCR은 베타 기능이므로 권장 방식은 ChatGPT/Gemini로 CSV를 추출한 뒤 앱에 입력하는 방식입니다.
- Supabase Storage bucket 이름은 반드시 `schedule-images`로 만들어야 합니다.


## Google 로그인 적용 안내

이 버전은 기존 정상 작동 버전에서 로그인 방식만 Google OAuth로 변경한 버전입니다.

- GitHub에는 `index.html`, `styles.css`, `app.js`, `README.md` 4개 파일만 업로드하면 됩니다.
- `auth-callback.html`은 사용하지 않습니다.
- Supabase Authentication > Providers > Google에서 Google Provider를 켜고 Client ID / Client Secret을 저장해야 합니다.
- Supabase Authentication > URL Configuration의 Site URL과 Redirect URLs에는 Vercel 앱 기본 주소를 넣습니다.
- Google Cloud OAuth 클라이언트의 승인된 JavaScript 원본에는 Vercel 앱 주소를 넣고, 승인된 리디렉션 URI에는 Supabase Callback URL을 넣습니다.


## v2 UX 반영 사항
- Google 로그인 정상 동작 버전을 기준으로 유지했습니다.
- OCR 보조 탭의 기본 이름 목록을 현재 팀 순서로 교체했습니다.
- 데이터 입력과 입력 후 확인 화면을 더 명확히 분리했습니다.
- OCR은 주 입력 방식이 아닌 보조 기능으로 한구석에 유지했습니다.
- 주간, 월간, 휴무일, 공유·엑셀 화면의 UI를 정리했습니다.
- 공유·엑셀 화면은 선택일 기준 `[월/일 출근 현황]` 형식의 공유문을 우선 표시합니다.

## v2.2 UX patch
- 주간 보기에서 저번주/다음주 이동 버튼을 추가했습니다.
- 월간 캘린더 코드 위치를 중앙 정렬하고 모바일 잘림을 보정했습니다.
- 휴무일 탭에 다음 휴무, 휴무/연차 요약, 연속 휴무 구간을 추가했습니다.
- 코드 설정을 가로로 긴 행 대신 카드형 그리드로 정리했습니다.
- 데이터 확인 표는 모바일에서 이름 열을 고정하고 가로 스크롤 사용성을 보정했습니다.
- OCR 보조 기본 이름을 현재 팀 10명 기준으로 정리했습니다.


## v2.3 업데이트

- 상위 카테고리형 내비게이션 추가: `근무표 보기`, `데이터 관리`, `보관 · 내보내기`
- 하위 메뉴는 선택한 카테고리에 맞춰서만 표시됩니다.
- 참고 디자인처럼 파스텔 배경, 둥근 카드, 부드러운 모바일 UI를 강화했습니다.
- 모바일 데이터 확인 테이블의 이름 열 고정과 월간 캘린더 잘림을 보정했습니다.
- 코드 설정은 긴 가로 박스 대신 미니 카드형 그리드로 정리했습니다.
- OCR 보조 기본 이름은 `이준호 류선협 이상민 김도영 이승호 곽병우 이미현 이다연 김성민 정세환` 순서입니다.


## v2.4 카테고리 탭 복구 패치

- 상위 카테고리(`근무표 보기`, `데이터 관리`, `보관 · 내보내기`)를 눌렀을 때 해당 카테고리의 하위 탭만 보이도록 수정했습니다.
- Gemini 수정 중 모든 하위 탭이 한 줄에 함께 노출되던 문제를 CSS와 JS 양쪽에서 보정했습니다.
- 모바일에서도 상위 카테고리는 3개 버튼, 하위 탭은 선택 카테고리 안에서만 가로 스크롤로 보이도록 정리했습니다.


## v2.4 안전 롤백 기반 PC UX 정리

- `schedule-app-v2-category-tab-fix` 버전을 기준으로 작업했습니다.
- 로그인 관련 HTML ID와 Supabase 인증 로직은 건드리지 않았습니다.
- 홈 요약 카드를 PC에서 3열 카드형으로 정리했습니다.
- 주간 보기는 PC에서 7일 카드가 가로로 보이도록 수정했습니다.
- 휴무/연차 색상은 범례와 배지를 빨간 계열로 통일했습니다.
- 데이터 입력 버튼명을 `검수표에 반영` / `반영 후 저장`으로 정리했습니다.
- 코드 설정은 PC에서 카드 그리드 형태로 표시됩니다.
- OCR 보조의 이전 임시 이름 목록은 현재 팀 기본 이름으로 자동 교체됩니다.
