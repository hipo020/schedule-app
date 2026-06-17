# 근무표 정리함 v2.2 - 로그인 콜백 안정화

## 수정 내용
- Supabase 매직링크를 열었을 때 URL의 `code` 값을 세션으로 교환하도록 보강했습니다.
- 기존 방식의 `access_token`/`refresh_token` 링크도 처리합니다.
- 로그인 완료 후 URL의 인증 파라미터를 자동으로 정리합니다.
- 로그인 링크 확인 중/완료/실패 메시지를 표시합니다.

## 배포
GitHub 저장소 최상단에 아래 4개 파일만 덮어씌우세요.

- index.html
- styles.css
- app.js
- README.md

배포 후 Vercel 주소가 Supabase Authentication > URL Configuration에 등록되어 있어야 합니다.
