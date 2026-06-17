# 근무표 정리함 v2 - Supabase 로그인/클라우드 저장 버전

## 포함 기능

- 이메일 매직링크 로그인
- Supabase Storage에 월별 근무표 이미지 저장
- Supabase Database에 월별 스케줄 검수 데이터 저장
- 다른 기기에서 로그인 후 월별 근무표 다시 불러오기
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

1. 이메일 입력 후 로그인 링크 보내기
2. 메일에서 로그인 링크 클릭
3. 기준 연도/월 선택
4. 근무표 이미지 업로드
5. 자동추출 또는 검수표 직접 입력
6. 저장 버튼 또는 상단 클라우드 저장 버튼 클릭
7. 월별 보관함에서 저장된 월 불러오기

## 주의

- 이메일 매직링크 로그인을 사용하려면 Supabase Redirect URL에 실제 Vercel 주소를 등록해야 합니다.
- OCR은 베타 기능이므로 추출 후 검수표에서 반드시 확인하세요.
- Supabase Storage bucket 이름은 반드시 `schedule-images`로 만들어야 합니다.
