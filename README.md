# 근무표 정리함 v2.2 - Google 로그인 버전

## 배포 방법

GitHub 저장소 최상단에 아래 4개 파일만 업로드하세요.

- index.html
- styles.css
- app.js
- README.md

## Google 로그인 설정 필요

이 버전은 Supabase Google Provider 설정이 완료되어야 로그인됩니다.

1. Google Cloud / Google Auth Platform에서 OAuth Client ID를 생성합니다.
2. 애플리케이션 유형은 Web application으로 선택합니다.
3. Authorized JavaScript origins에는 Vercel 앱 주소를 넣습니다.
4. Authorized redirect URIs에는 Supabase Google provider 화면에 표시되는 Callback URL을 넣습니다.
5. 생성된 Client ID와 Client Secret을 Supabase Authentication > Providers > Google에 입력하고 활성화합니다.
6. Supabase Authentication > URL Configuration의 Site URL / Redirect URLs에 Vercel 앱 주소를 등록합니다.

## 참고

Google 로그인 버튼은 Supabase `signInWithOAuth({ provider: 'google' })` 방식으로 동작합니다.


## v2 Google 로그인 버튼 수정
- 로그인 없이 임시로 사용하기 버튼 제거
- Google 로그인 버튼 직접 연결 보강
- Supabase SDK 로딩이 늦어도 클릭 이벤트가 동작하도록 fallback 추가
