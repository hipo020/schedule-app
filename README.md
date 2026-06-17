# 근무표 정리함 v2 - Google 로그인 단순화 안정화 버전

사용자가 공유한 다른 웹앱의 Google 로그인 구조를 참고해, 로그인 흐름을 다시 단순화한 버전입니다.

## 적용 파일

GitHub 저장소 최상단에 아래 4개 파일만 덮어씌워 업로드하세요.

- index.html
- styles.css
- app.js
- README.md

이번 버전에서는 `auth-callback.html`을 사용하지 않습니다.
기존에 GitHub에 `auth-callback.html`을 올렸다면 삭제해도 됩니다.

## 로그인 방식

Google 로그인 후 앱 루트 주소로 돌아옵니다.

```text
https://schedule-app-nine-tau.vercel.app
```

앱이 `?code=...` 또는 `#access_token=...` 형태의 로그인 정보를 받아 세션으로 저장한 뒤, 주소를 자동으로 정리합니다.

## Supabase 설정

Supabase > Authentication > URL Configuration

- Site URL: `https://schedule-app-nine-tau.vercel.app`
- Redirect URLs: `https://schedule-app-nine-tau.vercel.app`

`auth-callback.html` 주소는 더 이상 필요하지 않습니다.

## Google Cloud 설정

Google Cloud > Google Auth Platform > Clients

- 승인된 JavaScript 원본: `https://schedule-app-nine-tau.vercel.app`
- 승인된 리디렉션 URI: `https://fergbabqmwnbkkxjvgkj.supabase.co/auth/v1/callback`

## 테스트 방법

1. GitHub에 4개 파일 업로드
2. Vercel 배포 완료 확인
3. 브라우저에서 강력 새로고침
   - Windows: Ctrl + F5
   - Mac: Cmd + Shift + R
4. 기본 주소로 접속
5. Google 로그인 버튼 클릭

