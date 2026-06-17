// Supabase 연결 정보
const SUPABASE_URL = "https://fergbabqmwnbkkxjvgkj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4kIgpTwod32qPE4gfzT_mg_d7MWHshv";
let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (window.__scheduleSupabaseClient) {
    supabaseClient = window.__scheduleSupabaseClient;
    return supabaseClient;
  }
  if (!window.supabase?.createClient) {
    console.warn('Supabase SDK가 아직 로드되지 않았어요.', window.supabase);
    return null;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // MUST BE TRUE
      flowType: 'pkce', // MUST BE PKCE
    },
  });
  window.__scheduleSupabaseClient = supabaseClient;
  return supabaseClient;
}

let currentSession = null;
let currentUser = null;
let isGuestMode = false;
let isCloudBusy = false;
window.__scheduleAppAuthBound = false;

const state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  myName: '',
  selectedDate: toDateInputValue(new Date()),
  people: [],
  codes: getDefaultCodes(),
  activePage: 'home',
  imageData: '',
  imageName: '',
  imageUpdatedAt: '',
  monthStore: {},
  archiveMeta: [],
  ocr: getDefaultOcrState(),
};

const el = (id) => document.getElementById(id);
function on(id, eventName, handler) {
  const node = el(id);
  if (!node) return;
  node.addEventListener(eventName, handler);
}
const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
const STORAGE_KEY = 'shift-organizer-v1';
const IMAGE_DB_NAME = 'shift-organizer-images-v1';
const IMAGE_STORE_NAME = 'monthlyImages';
const MAX_STORED_IMAGE_WIDTH = 2400;
const MAX_STORED_IMAGE_HEIGHT = 1600;
const THUMB_WIDTH = 360;
const THUMB_HEIGHT = 240;
const DEFAULT_CULINARY_NAMES = ['이준호', '류선협', '이상민', '김도영', '이승호', '곽병우', '이미현', '이다연', '김성민', '정세환'];

// --- [OCR & Utilities Functions Omitted for brevity: keep everything from getExtractionPrompt downwards the same] ---
// 이 아래로는 기존 app.js에 있던 기본 유틸 함수들 그대로입니다. 
// auth 관련 부분만 새로 작성했습니다.

function getExtractionPrompt() {
  return `당신은 근무표 이미지에서 데이터를 정확히 추출하는 데이터 변환 담당자입니다.

[목표]
첨부된 근무표 이미지에서 상단 메인 근무표만 읽어, 아래에 지정한 CSV 형식으로만 출력해 주세요.
결과 CSV는 이후 웹앱에 그대로 업로드할 예정이므로, 형식이 매번 완전히 동일해야 합니다.

[기준 정보]
- 기준 연도: ${state.year}
- 기준 월: ${state.month}
- 기준 부서명: 이미지에서 확인되는 부서명을 사용하되, 확인이 어려우면 빈칸으로 둡니다.

[추출 대상]
1. 이미지 상단의 메인 근무표만 추출합니다.
2. 사람별 이름, 사번, 입사일, 1일~말일까지의 근무 코드만 추출합니다.
3. 이름 사이에 빈 행이 있으면 그 빈 행은 제외합니다.
4. 표가 위/아래 그룹으로 나뉘어 있어도, 상단 메인 근무표 안에 있는 실제 사람 행은 위에서 아래 순서대로 모두 추출합니다.

[제외 대상]
아래 내용은 절대 CSV에 포함하지 마세요.
- 오른쪽 휴무/PH/SD/이월/사용연차/남은연차 요약표
- 점심 행사 / 저녁 행사 표
- 하단 조리부 OT 표
- 하단 근무 코드별 시간표
- 노란 메모 박스
- 제목, 설명 문구, 합계 행, 색상만 있는 행

[출력 형식]
반드시 CSV 텍스트만 출력합니다.
마크다운 코드블록, 설명문, 요약문, 불릿, 주석은 절대 쓰지 마세요.
첫 번째 줄은 반드시 아래 헤더와 완전히 동일해야 합니다.

year,month,department,employee_id,person_name,hire_date,d01,d02,d03,d04,d05,d06,d07,d08,d09,d10,d11,d12,d13,d14,d15,d16,d17,d18,d19,d20,d21,d22,d23,d24,d25,d26,d27,d28,d29,d30,d31

[컬럼 규칙]
- year: 기준 연도를 숫자로 입력합니다. 예: 2026
- month: 기준 월을 숫자로 입력합니다. 예: 6
- department: 이미지에 보이는 부서명. 예: Culinary
- employee_id: 왼쪽 사번 칸의 값. 확인이 어려우면 빈칸
- person_name: 이름 칸의 한글 이름. 이미지에 보이는 그대로 입력
- hire_date: 입사일. 가능하면 YYYY-MM-DD로 정규화. 확인이 어려우면 이미지에 보이는 그대로 또는 빈칸
- d01~d31: 각 날짜의 근무 코드

[날짜 규칙]
- 모든 결과는 d01부터 d31까지 31개 날짜 컬럼을 항상 유지합니다.
- 해당 월에 없는 날짜는 빈칸으로 둡니다. 예: 6월이면 d31은 빈칸
- 빈 셀은 빈칸으로 둡니다.

[근무 코드 규칙]
- 셀 안의 코드는 대문자 영문 그대로 입력합니다. 예: BM, DO, AL, PH, SD, AD, AT, AQ, RT
- 숫자 0처럼 보이지만 문맥상 휴무 코드라면 DO로 보정합니다. 예: D0 -> DO
- 8M처럼 보이지만 문맥상 BM이면 BM으로 보정합니다.
- 명확하지 않은 값은 추측하지 말고 확인필요 라고 입력합니다.
- 셀 배경색은 참고만 하고, 실제 텍스트 코드를 우선합니다.

[CSV 값 규칙]
- 쉼표가 포함된 값이 있으면 큰따옴표로 감싸세요.
- 각 사람은 한 줄로 출력합니다.
- 사람 순서는 이미지에서 위에서 아래로 보이는 순서를 유지합니다.
- 같은 사람을 중복 출력하지 마세요.
- CSV 외의 문장은 절대 출력하지 마세요.

[최종 검토]
출력 전 아래를 확인하세요.
1. 헤더가 정확히 37개 컬럼인지 확인합니다.
2. 모든 데이터 행도 헤더와 같은 컬럼 수인지 확인합니다.
3. d01~d31 컬럼이 빠지거나 순서가 바뀌지 않았는지 확인합니다.
4. 상단 메인 근무표 외의 OT, 메모, 요약표 데이터가 섞이지 않았는지 확인합니다.`;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function getDefaultCodes() {
  return {
    BI: { label: '근무', start: '03:30', end: '12:00', type: 'work' },
    BK: { label: '근무', start: '04:00', end: '13:00', type: 'work' },
    BL: { label: '근무', start: '04:30', end: '13:30', type: 'work' },
    BM: { label: '근무', start: '05:00', end: '14:00', type: 'work' },
    AA: { label: '근무', start: '05:30', end: '14:30', type: 'work' },
    AB: { label: '근무', start: '06:00', end: '15:00', type: 'work' },
    AC: { label: '근무', start: '06:30', end: '15:30', type: 'work' },
    AD: { label: '근무', start: '07:00', end: '16:00', type: 'work' },
    AE: { label: '근무', start: '07:30', end: '16:30', type: 'work' },
    AF: { label: '근무', start: '08:00', end: '17:00', type: 'work' },
    AG: { label: '근무', start: '08:30', end: '17:30', type: 'work' },
    AH: { label: '근무', start: '09:00', end: '18:00', type: 'work' },
    AI: { label: '근무', start: '09:30', end: '18:30', type: 'work' },
    AJ: { label: '근무', start: '10:00', end: '19:00', type: 'work' },
    AK: { label: '근무', start: '10:30', end: '19:30', type: 'work' },
    AM: { label: '근무', start: '11:00', end: '20:00', type: 'work' },
    AN: { label: '근무', start: '11:3
