# 근무표 정리함 v2 - Google 로그인 재수정 버전

이 버전은 Supabase Google OAuth 콜백을 더 안정적으로 처리하기 위해 OAuth 흐름을 `implicit` 방식으로 단순화했습니다.

## 적용 방법

GitHub 저장소 최상단에 아래 4개 파일만 덮어씌워 업로드하세요.

- index.html
- styles.css
- app.js
- README.md

Vercel 배포가 끝나면 브라우저에서 강력 새로고침을 한 뒤 Google 로그인을 다시 시도하세요.

## Supabase 설정 확인

Authentication > URL Configuration

- Site URL: https://schedule-app-nine-tau.vercel.app
- Redirect URLs: https://schedule-app-nine-tau.vercel.app

## Google Cloud 설정 확인

- 승인된 JavaScript 원본: https://schedule-app-nine-tau.vercel.app
- 승인된 리디렉션 URI: https://fergbabqmwnbkkxjvgkj.supabase.co/auth/v1/callback



## 2026-06-17 로그인 콜백 수정
Google OAuth가 `#access_token` 형태로 돌아오는 경우를 앱 로딩 초기에 먼저 세션으로 저장하도록 수정했습니다.
