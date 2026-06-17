# 근무표 정리함 v2.1 - 로그인 안정화 버전

- 이메일 매직링크 로그인 버튼 반응 개선
- 로그인 링크 전송 중 상태 표시
- 오류 메시지 표시 개선
- Supabase CDN/연결 실패 안내 추가
- CSV 데이터 입력, 검수표, 일/주/월/휴무일/공유·엑셀 기능 유지

GitHub 저장소 최상단에 아래 4개 파일만 업로드하세요.

- index.html
- styles.css
- app.js
- README.md

로그인 메일을 눌렀을 때 앱으로 돌아오려면 Supabase > Authentication > URL Configuration에 Vercel 배포 주소가 등록되어 있어야 합니다.
