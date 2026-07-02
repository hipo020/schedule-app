// Supabase 연결 정보
// Publishable key는 브라우저에서 사용하는 공개용 키입니다.
// Secret key는 절대 이 파일에 넣지 마세요.
const SUPABASE_URL = "https://fergbabqmwnbkkxjvgkj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4kIgpTwod32qPE4gfzT_mg_d7MWHshv";
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

let currentSession = null;
let currentUser = null;
let isCloudBusy = false;
let hasUnsavedCloudChanges = false;
let suppressDirtyFlag = false;
let lastCloudStatus = { kind: 'checking', message: '저장 상태를 확인하고 있어요.', updatedAt: '' };
let undoStack = [];
const MAX_UNDO_STACK = 20;


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
  editorFilter: 'all',
  shareTemplate: 'detailed',
  reviewCompareOpen: false,
  memo: getDefaultMemoState(),
  defaultNames: getInitialDefaultNames(),
  themeMode: 'cheer',
};

const el = (id) => document.getElementById(id);
const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
const STORAGE_KEY = 'shift-organizer-v1';
const IMAGE_DB_NAME = 'shift-organizer-images-v1';
const IMAGE_STORE_NAME = 'monthlyImages';
const MAX_STORED_IMAGE_WIDTH = 2400;
const MAX_STORED_IMAGE_HEIGHT = 1600;
const THUMB_WIDTH = 360;
const THUMB_HEIGHT = 240;
const THEME_STORAGE_KEY = 'shift-organizer-theme-mode';
const THEME_MODES = {
  cheer: {
    label: '응원',
    title: '오늘의 선협이',
    eyebrow: 'Soft Shift Diary',
    heroDesc: '출근도 휴무도, 오늘 하루 잘 보내길',
    authDesc: 'Google 계정으로 로그인하면 선협이 스케줄과 원본 근무표를 월별로 안전하게 챙겨둘 수 있어요.',
    cloudReady: '오늘도 같이 체크해볼까 ☁️',
    readyLabel: '응원 준비됨',
  },
  peach: {
    label: '복숭아',
    title: '말랑 복숭아',
    eyebrow: 'Peach Shift Diary',
    heroDesc: '오늘도 달달하게 잘 다녀오기',
    authDesc: 'Google 계정으로 로그인하면 스케줄과 원본 근무표를 월별로 포근하게 저장할 수 있어요.',
    cloudReady: '달달하게 응원 준비 완료 🍑',
    readyLabel: '복숭아 준비됨',
  },
  sky: {
    label: '하늘',
    title: '몽글 하늘',
    eyebrow: 'Cloudy Shift Diary',
    heroDesc: '오늘 스케줄을 가볍게 확인해요',
    authDesc: 'Google 계정으로 로그인하면 스케줄과 원본 근무표를 월별로 산뜻하게 저장할 수 있어요.',
    cloudReady: '몽글몽글 스케줄 확인 준비 🫧',
    readyLabel: '하늘 준비됨',
  },
  butter: {
    label: '버터',
    title: '버터 응원',
    eyebrow: 'Butter Shift Diary',
    heroDesc: '오늘도 반짝 응원 중',
    authDesc: 'Google 계정으로 로그인하면 스케줄과 원본 근무표를 월별로 따뜻하게 저장할 수 있어요.',
    cloudReady: '오늘도 반짝 응원 중 ⭐',
    readyLabel: '버터 준비됨',
  },
  night: {
    label: '밤근무',
    title: '밤근무 모드',
    eyebrow: 'Night Shift Diary',
    heroDesc: '늦은 근무도 조심히 다녀오기',
    authDesc: 'Google 계정으로 로그인하면 스케줄과 원본 근무표를 월별로 차분하게 저장할 수 있어요.',
    cloudReady: '밤근무도 조심히 다녀오기 🌙',
    readyLabel: '밤근무 준비됨',
  },
  simple: {
    label: '무난',
    title: '스케줄 정리함',
    eyebrow: 'Shift Organizer',
    heroDesc: '개인 근무와 휴무를 한눈에 확인해요',
    authDesc: 'Google 계정으로 로그인하면 스케줄과 원본 근무표를 월별로 저장할 수 있어요.',
    cloudReady: '오늘 스케줄을 확인할 수 있어요.',
    readyLabel: '준비됨',
  },
};
const THEME_MODE_KEYS = Object.keys(THEME_MODES);

const PAGE_CATEGORY = {
  home: 'view',
  daily: 'view',
  weekly: 'view',
  monthly: 'view',
  offDays: 'view',
  setup: 'manage',
  dataInput: 'manage',
  editor: 'manage',
  settings: 'manage',
  extract: 'manage',
  archive: 'export',
  share: 'export',
  help: 'export',
  dayRoster: 'view',
};
const CATEGORY_DEFAULT_PAGE = {
  view: 'home',
  manage: 'dataInput',
  export: 'archive',
};


function normalizeThemeMode(mode = '') {
  return THEME_MODES[mode] ? mode : 'cheer';
}

function getThemeMode() {
  return normalizeThemeMode(state.themeMode);
}

function isSimpleTheme() {
  return getThemeMode() === 'simple';
}

function getThemeCopy() {
  return THEME_MODES[getThemeMode()] || THEME_MODES.cheer;
}

function loadThemePreference() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  state.themeMode = normalizeThemeMode(saved || state.themeMode);
}

function applyTheme(mode = state.themeMode || 'cheer') {
  const nextMode = normalizeThemeMode(mode);
  state.themeMode = nextMode;
  localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  document.documentElement.dataset.theme = nextMode;
  document.body?.setAttribute('data-theme', nextMode);
  const copy = getThemeCopy();
  document.title = copy.title;
  const textTargets = [
    ['authEyebrow', copy.eyebrow],
    ['appEyebrow', copy.eyebrow],
    ['authTitle', copy.title],
    ['appTitle', copy.title],
    ['heroDesc', copy.heroDesc],
    ['authDesc', copy.authDesc],
  ];
  textTargets.forEach(([id, value]) => {
    const node = el(id);
    if (node) node.textContent = value;
  });
  document.querySelectorAll('[data-theme-mode]').forEach((button) => {
    const active = button.dataset.themeMode === nextMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.setAttribute('title', `${button.textContent.trim()} 테마`);
  });
  const statusNode = el('cloudStatus');
  if (statusNode && !statusNode.querySelector('.save-status-main')) {
    statusNode.textContent = copy.cloudReady;
  }
}

function setThemeMode(mode) {
  applyTheme(mode);
  renderAll();
  saveState(false);
}

function getPageCategory(page) {
  return PAGE_CATEGORY[page] || 'view';
}

function getSaveStatusLabel(kind) {
  if (kind === 'saved') return '저장됨';
  if (kind === 'dirty') return '수정됨 · 저장 필요';
  if (kind === 'saving') return '저장 중...';
  if (kind === 'loading') return '불러오는 중...';
  if (kind === 'error') return '저장 실패';
  if (kind === 'loaded') return '불러오기 완료';
  return getThemeCopy().readyLabel;
}

function inferSaveStatusKind(message = '', type = '') {
  const text = String(message || '');
  if (type === 'error' || text.includes('실패') || text.includes('못했')) return 'error';
  if (text.includes('저장하지 않은') || text.includes('저장 버튼') || text.includes('반영해 주세요') || text.includes('저장 필요')) return 'dirty';
  if (text.includes('저장하는 중')) return 'saving';
  if (text.includes('불러오는 중')) return 'loading';
  if (text.includes('불러왔')) return 'loaded';
  if (text.includes('저장 완료') || text.includes('저장했어요')) return 'saved';
  if (type === 'ok') return hasUnsavedCloudChanges ? 'dirty' : 'ready';
  if (type === 'warn') return 'dirty';
  return hasUnsavedCloudChanges ? 'dirty' : 'ready';
}

function getStatusTimeText(value = new Date().toISOString()) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function updateSaveActionButtons() {
  const buttons = [el('cloudSaveButton'), el('saveButton'), el('saveCodesButton')].filter(Boolean);
  buttons.forEach((button) => {
    button.disabled = Boolean(isCloudBusy);
  });
  const cloudSave = el('cloudSaveButton');
  if (cloudSave) cloudSave.textContent = isCloudBusy ? '저장 중' : (hasUnsavedCloudChanges ? '저장 필요' : '저장');
}

function setSaveStatus(kind, message = '', type = '') {
  lastCloudStatus = { kind, message, type, updatedAt: new Date().toISOString() };
  const node = el('cloudStatus');
  if (node) {
    const label = getSaveStatusLabel(kind);
    const time = getStatusTimeText(lastCloudStatus.updatedAt);
    node.className = `cloud-status ${type || ''} save-status-${kind}`.trim();
    node.innerHTML = `
      <div class="save-status-main">
        <span class="save-status-dot" aria-hidden="true"></span>
        <strong>${escapeHtml(label)}</strong>
        <em>${escapeHtml(time)}</em>
      </div>
      <p>${escapeHtml(message || label)}</p>
    `;
  }
  updateSaveActionButtons();
}


function markUnsavedChanges(message = '') {
  if (suppressDirtyFlag) return;
  hasUnsavedCloudChanges = true;
  showUnsavedStatus(message || '저장하지 않은 변경사항이 있어요. 저장 버튼을 눌러 반영해 주세요.');
}

function markCloudSaved() {
  hasUnsavedCloudChanges = false;
  updateSaveActionButtons();
}

function showUnsavedStatus(message) {
  if (!message) return;
  setSaveStatus('dirty', message, 'warn');
}

async function confirmUnsavedBeforeMove() {
  if (!hasUnsavedCloudChanges || !currentUser) return true;
  const shouldSave = confirm('저장하지 않은 변경사항이 있어요. 저장하고 이동할까요?\n\n확인: 저장 후 이동\n취소: 이동 취소');
  if (!shouldSave) return false;
  await saveCurrentMonthToCloud(false);
  return !hasUnsavedCloudChanges;
}

window.addEventListener('beforeunload', (event) => {
  if (!hasUnsavedCloudChanges) return;
  event.preventDefault();
  event.returnValue = '';
});

function makeUndoSnapshot(label = '수정 전') {
  return {
    label,
    savedAt: new Date().toISOString(),
    year: state.year,
    month: state.month,
    myName: state.myName,
    selectedDate: state.selectedDate,
    people: clonePlain(state.people || []),
    codes: clonePlain(state.codes || {}),
  };
}

function pushUndoSnapshot(label = '수정 전') {
  undoStack.push(makeUndoSnapshot(label));
  if (undoStack.length > MAX_UNDO_STACK) undoStack.shift();
  updateReviewToolbarState();
}

function restoreLastUndo() {
  const snapshot = undoStack.pop();
  if (!snapshot) {
    alert('되돌릴 수정 내역이 없어요.');
    return;
  }
  state.year = snapshot.year;
  state.month = snapshot.month;
  state.myName = snapshot.myName || '';
  state.selectedDate = snapshot.selectedDate || `${state.year}-${String(state.month).padStart(2, '0')}-01`;
  state.people = clonePlain(snapshot.people || []);
  state.codes = clonePlain(snapshot.codes || getDefaultCodes());
  ensurePeople();
  normalizePeopleDays();
  markReviewNeedsCheck();
  syncInputs();
  renderScheduleTable();
  renderAll();
  markUnsavedChanges(`${snapshot.label || '이전 상태'}로 되돌렸어요. 저장 버튼을 눌러 반영해 주세요.`);
  saveState(false);
  alert('이전 상태로 되돌렸어요.');
}

function getReviewMeta(key = monthKey()) {
  ensureMonthStore();
  return state.monthStore?.[key]?.review || { status: 'pending' };
}

function setReviewMeta(meta) {
  saveCurrentMonthToStore();
  const key = monthKey();
  state.monthStore[key].review = { ...meta, updatedAt: new Date().toISOString() };
}

function getReviewStatusText(meta = getReviewMeta()) {
  if (meta.status === 'done') return `검수 완료${meta.reviewedAt ? ` · ${formatSavedDate(meta.reviewedAt)}` : ''}`;
  if (meta.status === 'needs_review') return '수정됨 · 재검수 필요';
  return '검수 전';
}

function markReviewNeedsCheck() {
  ensureMonthStore();
  const key = monthKey();
  const review = state.monthStore?.[key]?.review;
  if (review?.status === 'done') {
    state.monthStore[key].review = {
      ...review,
      status: 'needs_review',
      changedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

function markCurrentMonthReviewed() {
  const issues = validatePeopleData();
  if (issues.length && !confirm(`확인 필요 항목이 ${issues.length}개 남아 있어요. 그래도 검수 완료로 표시할까요?`)) return;
  setReviewMeta({
    status: 'done',
    reviewedAt: new Date().toISOString(),
    issueCount: issues.length,
    reviewedBy: state.myName || currentUser?.email || '',
  });
  showUnsavedStatus('검수 완료 상태가 표시됐어요. 저장 버튼을 눌러 현재 월 데이터와 함께 저장해 주세요.');
  saveState(false);
  renderScheduleTable();
  renderAll();
}

function reopenCurrentMonthReview() {
  setReviewMeta({ status: 'pending', reopenedAt: new Date().toISOString() });
  showUnsavedStatus('검수 상태를 다시 확인 중으로 바꿨어요. 필요하면 저장해 주세요.');
  saveState(false);
  renderScheduleTable();
  renderAll();
}

function updateReviewToolbarState() {
  const undoButton = el('undoScheduleButton');
  if (undoButton) undoButton.disabled = !undoStack.length;
  const compareButton = el('toggleReviewCompareButton');
  if (compareButton) compareButton.textContent = state.reviewCompareOpen ? '나란히 보기 닫기' : '원본과 나란히 보기';
  const reviewedButton = el('markReviewCompleteButton');
  if (reviewedButton) reviewedButton.textContent = getReviewMeta().status === 'done' ? '검수 다시 하기' : '검수 완료';
}

async function getCurrentReviewImageSrc() {
  if (state.imageData) return state.imageData;
  try {
    const stored = await getStoredImage(monthKey());
    if (stored?.imageData) {
      state.imageData = stored.imageData;
      return stored.imageData;
    }
  } catch (error) {
    console.warn('검수용 원본 이미지 로드 실패', error);
  }
  const record = (state.archiveMeta || []).find((item) => item.key === monthKey());
  return record?.thumbData || '';
}

async function refreshReviewComparePane() {
  const wrap = el('reviewCompareWrap');
  const pane = el('reviewImagePane');
  const img = el('reviewCompareImage');
  const empty = el('reviewCompareEmpty');
  const info = el('reviewCompareInfo');
  if (!wrap || !pane || !img || !empty) return;

  wrap.classList.toggle('compare-active', Boolean(state.reviewCompareOpen));
  pane.classList.toggle('is-hidden', !state.reviewCompareOpen);
  updateReviewToolbarState();
  if (!state.reviewCompareOpen) return;

  if (info) info.textContent = `${state.year}년 ${state.month}월 원본 이미지와 검수표를 함께 보고 있어요.`;
  const src = await getCurrentReviewImageSrc();
  if (src) {
    img.src = src;
    img.style.display = 'block';
    empty.style.display = 'none';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
    empty.textContent = '현재 월에 저장된 원본 이미지가 없어요.';
    empty.style.display = 'grid';
  }
}

function toggleReviewCompare() {
  state.reviewCompareOpen = !state.reviewCompareOpen;
  refreshReviewComparePane();
  saveState(false);
}

function addMissingCodeToSettings(rawCode) {
  const code = stripUncertaintyMarker(rawCode);
  if (!code || code === '확인필요') return;
  if (state.codes[code]) {
    alert(`${code} 코드는 이미 코드 설정에 있어요.`);
    return;
  }
  pushUndoSnapshot(`${code} 코드 추가 전`);
  const defaultInfo = getDefaultCodes()[code];
  state.codes[code] = defaultInfo ? clonePlain(defaultInfo) : { label: '근무', start: '', end: '', type: 'work' };
  markUnsavedChanges(`${code} 코드를 임시로 추가했어요. 시간 정보가 필요하면 코드 설정에서 수정한 뒤 저장해 주세요.`);
  renderScheduleTable();
  renderAll();
  saveState(false);
}


function getExtractionPrompt() {
  return `당신은 근무표 이미지에서 데이터를 한 치의 오차 없이 정확히 추출하는 전문 데이터 변환 담당자입니다.

[목표]
첨부된 근무표 이미지에서 상단 메인 근무표만 읽어, 아래에 지정한 정규 CSV 형식으로만 출력해 주세요.
결과 CSV는 이후 시스템에 그대로 업로드할 예정이므로, 형식이 매번 완전히 동일해야 하며 각 데이터 행마다 반드시 줄바꿈(Enter)이 적용되어야 합니다.

[기준 정보 판독 규칙]
- year (연도): 프롬프트에서 별도 지정이 없거나 이미지에 연도가 보이지 않는 경우, 기본값으로 2026을 입력합니다.
- month (월): 이미지 상단 제목(예: '6월 스케줄', '7월 스케줄')에서 숫자를 자동으로 인식하여 숫자로만 입력합니다. (예: 6월 스케줄이면 6, 7월 스케줄이면 7)
- department (부서명): 이미지 좌측 상단 등에 보이는 부서명을 입력합니다. (예: Culinary, 조리부 등. 확인이 어려우면 빈칸)

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
- 노란색 메모 박스
- 제목, 설명 문구, 합계 행, 색상만 있는 행

[출력 형식 및 줄바꿈 규칙 - 매우 중요]
- 반드시 순수 CSV 텍스트만 출력합니다. 마크다운 코드블록, 설명문, 요약문, 불릿, 주석은 절대 쓰지 마세요.
- [핵심] 모든 사람의 데이터는 한 줄에 하나씩 출력하고, 반드시 끝에 줄바꿈(Enter)을 넣으세요. 하나의 긴 줄로 이어서 출력하면 절대 안 됩니다.
- 첫 번째 줄은 반드시 아래 헤더와 완전히 동일해야 하며, 그다음 줄부터 바로 데이터가 이어져야 합니다.

year,month,department,employee_id,person_name,hire_date,d01,d02,d03,d04,d05,d06,d07,d08,d09,d10,d11,d12,d13,d14,d15,d16,d17,d18,d19,d20,d21,d22,d23,d24,d25,d26,d27,d28,d29,d30,d31

[컬럼 규칙]
- employee_id: 왼쪽 사번 칸의 값 (없으면 빈칸)
- person_name: 한글 이름 (이미지에 보이는 그대로)
- hire_date: YYYY-MM-DD 형식 권장 (어려우면 보이는 대로 또는 빈칸)
- d01~d31: 각 날짜의 근무 코드

[날짜 및 밀림 방지 규칙 - 매우 중요]
- 모든 결과는 해당 월의 일수와 상관없이 d01부터 d31까지 31개의 날짜 컬럼 개수를 무조건 유지해야 합니다.
- [월별 말일 처리]: 해당 월에 존재하지 않는 날짜는 빈칸으로 둡니다.
  * 예: 6월, 9월, 11월처럼 30일까지 있는 달은 d31을 빈칸으로 비워둠 (쉼표로만 마감)
  * 예: 7월, 8월, 10월처럼 31일까지 있는 달은 d31까지 근무 코드를 모두 채움
  * 예: 2월처럼 28일이나 29일까지 있는 달은 d29~d31 또는 d30~d31을 빈칸으로 비워둠
- 특정 칸의 배경색이 파란색, 노란색, 초록색 등으로 칠해져 있어도 절대 건너뛰지 마세요. 한 칸이라도 누락하면 뒤의 날짜 데이터가 모두 앞으로 당겨지는 치명적인 오류가 발생합니다.

[근무 코드 판독 규칙]
- 셀 안의 코드는 대문자 영문 그대로 입력합니다. (예: BM, DO, AL, PH, SD, AD, AT, AQ, RT)
- 숫자 0처럼 보이지만 문맥상 휴무 코드라면 DO로 보정합니다. (예: D0 -> DO)
- 8M처럼 보이지만 문맥상 BM이면 BM으로 보정합니다.
- [핵심] 셀 배경에 색상이 있거나, 글자에 빨간색 취소선/밑줄이 그어져 있어 지저분해 보이더라도, 그 안에 쓰인 영문자(BM, DO 등)를 끝까지 판독하여 입력하세요. '확인필요'라는 단어는 아예 글자가 뭉개져서 도저히 읽을 수 없을 때만 최후의 수단으로 사용합니다.

[불확실 데이터 표시 규칙 - 매우 중요]
- 셀의 값이 어느 정도 읽히지만 100% 확실하지 않은 경우, 추정 코드 뒤에 물음표(?)를 붙여 입력합니다.
  예: AO처럼 보이지만 애매하면 AO?, BM처럼 보이지만 애매하면 BM?, DO처럼 보이지만 애매하면 DO?
- 물음표(?)가 붙은 값은 검수 대상입니다. 임의로 확정 코드처럼 바꾸지 마세요.
- 도저히 어떤 코드인지 추정할 수 없는 경우에만 확인필요라고 입력합니다.
- 빈칸은 실제로 해당 날짜 값이 없거나 월에 존재하지 않는 날짜일 때만 비워둡니다.
- 즉, AO? = 추정값 있음 / 확인필요 = 판독 불가 / 빈칸 = 값 없음 으로 구분합니다.

[최종 검토]
출력 전 아래를 확인하세요.
1. 마크다운 기호 없이 텍스트로만 시작하고 끝났는가?
2. 헤더 포함 모든 행이 정확히 37개 컬럼(쉼표 36개)으로 구성되었는가?
3. 각 사람마다 줄바꿈이 정상적으로 들어가서 여러 줄의 표 형태로 출력되었는가?
4. 파란색, 초록색 배경 칸의 값을 누락하여 데이터가 밀린 곳은 없는가?`;
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
    AN: { label: '근무', start: '11:30', end: '20:30', type: 'work' },
    AO: { label: '근무', start: '12:00', end: '21:00', type: 'work' },
    AP: { label: '근무', start: '12:30', end: '21:30', type: 'work' },
    AQ: { label: '근무', start: '13:00', end: '22:00', type: 'work' },
    AR: { label: '근무', start: '13:30', end: '22:30', type: 'work' },
    AT: { label: '근무', start: '14:00', end: '23:00', type: 'work' },
    AU: { label: '근무', start: '14:30', end: '21:00', type: 'work' },
    AV: { label: '근무', start: '14:30', end: '23:30', type: 'work' },
    AW: { label: '근무', start: '15:00', end: '00:00', type: 'work' },
    AY: { label: '근무', start: '15:30', end: '00:30', type: 'work' },
    AZ: { label: '근무', start: '16:00', end: '01:00', type: 'work' },
    BA: { label: '근무', start: '17:00', end: '02:00', type: 'work' },
    BB: { label: '근무', start: '18:00', end: '03:00', type: 'work' },
    BC: { label: '근무', start: '21:00', end: '06:00', type: 'work' },
    BD: { label: '근무', start: '22:00', end: '07:00', type: 'work' },
    BE: { label: '근무', start: '22:30', end: '07:30', type: 'work' },
    BF: { label: '근무', start: '23:00', end: '08:00', type: 'work' },
    BG: { label: '근무', start: '23:30', end: '08:30', type: 'work' },
    BH: { label: '근무', start: '00:00', end: '09:00', type: 'work' },
    AL: { label: '연차', start: '', end: '', type: 'leave' },
    DO: { label: '휴무', start: '', end: '', type: 'off' },
    PH: { label: '연휴', start: '', end: '', type: 'off' },
    SD: { label: '남은휴무', start: '', end: '', type: 'off' },
    RT: { label: '예비군', start: '', end: '', type: 'off' },
    OC: { label: '사내행사', start: '', end: '', type: 'off' },
    MH: { label: '병가', start: '', end: '', type: 'off' },
    CC: { label: '경조휴가', start: '', end: '', type: 'off' },
  };
}

function getInitialDefaultNames() {
  return ['이준호', '류선협', '이상민', '김도영', '이승호', '곽병우', '이미현', '이다연', '김성민', '정세환'];
}

function getDefaultNamesText() {
  const names = Array.isArray(state.defaultNames) && state.defaultNames.length ? state.defaultNames : getInitialDefaultNames();
  return names.map((name) => String(name || '').trim()).filter(Boolean).join(' ');
}

function parseDefaultNames(value) {
  return String(value || '').split(/[\n,\s]+/).map((name) => name.trim()).filter(Boolean);
}

function getCodeSetGaps(sourceCodes = state.codes) {
  const defaults = getDefaultCodes();
  const current = sourceCodes || {};
  const missing = Object.keys(defaults).filter((code) => !current[code]);
  const extra = Object.keys(current).filter((code) => !defaults[code]).sort();
  const different = Object.entries(defaults).filter(([code, info]) => {
    const currentInfo = current[code];
    if (!currentInfo) return false;
    return (currentInfo.label || '') !== (info.label || '') ||
      (currentInfo.start || '') !== (info.start || '') ||
      (currentInfo.end || '') !== (info.end || '') ||
      deriveCodeType(code, currentInfo) !== deriveCodeType(code, info);
  }).map(([code]) => code);
  return { missing, extra, different };
}

function mergeMissingDefaultCodes(announce = false) {
  const defaults = getDefaultCodes();
  if (!state.codes || typeof state.codes !== 'object') state.codes = {};
  const added = [];
  Object.entries(defaults).forEach(([code, info]) => {
    if (!state.codes[code]) {
      state.codes[code] = { ...info };
      added.push(code);
    }
  });
  if (added.length && announce) {
    showCloudStatus(`기본 코드 ${added.length}개를 보정했어요. 저장하면 Supabase 코드표에도 반영됩니다.`, 'warn');
  }
  return added;
}

function resetCodesToDefaultTable() {
  state.codes = getDefaultCodes();
  renderViews();
  renderScheduleTable();
  renderAll();
  markUnsavedChanges('근무 코드표를 이미지 하단 기본 코드 기준으로 초기화했어요. 저장 버튼을 눌러 반영해 주세요.');
  saveState(false);
}

function formatCodeGapSummary(gaps, sourceName = '현재 코드표') {
  const missing = gaps?.missing || [];
  const extra = gaps?.extra || [];
  const different = gaps?.different || [];
  const part = [
    `누락 ${missing.length}개`,
    `수정됨 ${different.length}개`,
    `추가 코드 ${extra.length}개`,
  ].join(' · ');
  const missingText = missing.length ? `<p><strong>누락 코드</strong><span>${missing.join(', ')}</span></p>` : '<p><strong>누락 코드</strong><span>없음</span></p>';
  const differentText = different.length ? `<p><strong>기본값과 다른 코드</strong><span>${different.join(', ')}</span></p>` : '<p><strong>기본값과 다른 코드</strong><span>없음</span></p>';
  const extraText = extra.length ? `<p><strong>사용자 추가 코드</strong><span>${extra.join(', ')}</span></p>` : '<p><strong>사용자 추가 코드</strong><span>없음</span></p>';
  return `
    <div class="code-check-result">
      <h4>${sourceName} 확인 결과</h4>
      <div class="code-check-count">${part}</div>
      ${missingText}
      ${differentText}
      ${extraText}
      <small>기본 코드 누락은 앱이 자동으로 보정합니다. 현재 화면의 코드표를 저장하려면 저장 버튼을 눌러 주세요.</small>
    </div>
  `;
}

function setCodeCheckStatus(html, type = '') {
  const node = el('codeCheckStatus');
  if (!node) return;
  node.className = `code-check-status ${type}`;
  node.innerHTML = html;
}

function getDefaultOcrState() {
  return {
    names: getInitialDefaultNames().join(' '),
    rect: { x: 18.3, y: 12.1, w: 49.6, h: 25.5 },
    results: [],
  };
}

function getDefaultMemoState() {
  return {
    text: '',
    rect: { x: 67, y: 66, w: 30, h: 19 },
    updatedAt: '',
  };
}

function normalizeOcrDefaultNames() {
  const currentDefault = getDefaultNamesText();
  const legacyDefaults = [
    ['곽병우', '이준호', '유희수', '김도영', '이다운', '이상민', '정세완'].join(' '),
    ['곽병우', '이준호', '유희수', '김도영', '이다운', '이상민', '정세완'].join('\n'),
  ];
  if (!state.ocr) state.ocr = getDefaultOcrState();
  const normalized = String(state.ocr.names || '').trim().replace(/\s+/g, ' ');
  if (!normalized || legacyDefaults.map(v => v.trim().replace(/\s+/g, ' ')).includes(normalized)) {
    state.ocr.names = currentDefault;
  }
}

async function init() {
  loadState();
  loadThemePreference();
  applyTheme(state.themeMode);
  normalizeOcrDefaultNames();
  initMonthSelect();
  bindEvents();
  bindAuthEvents();

  const authenticated = await initAuth();
  if (!authenticated) {
    showAuthGate('Google 로그인이 필요합니다. 아래 버튼을 눌러 로그인해 주세요.');
    return;
  }

  showAppShell();
  await ensureProfile();
  await loadCloudInitialData();

  ensurePeople();
  normalizePeopleDays();
  syncInputs();
  if (!currentUser) await loadImageForCurrentMonth();
  await refreshArchiveMeta();
  renderUploadedImage();
  syncOcrInputs();
  renderOcrResultTable();
  setTimeout(drawOcrPreview, 0);
  renderScheduleTable();
  renderAll();
}

function bindEvents() {
  el('yearInput').addEventListener('input', async (e) => { await changeActiveMonth(Number(e.target.value), state.month); });
  el('monthInput').addEventListener('change', async (e) => { await changeActiveMonth(state.year, Number(e.target.value)); });
  el('myNameInput').addEventListener('input', (e) => { state.myName = e.target.value.trim(); renderAll(); markUnsavedChanges(); saveState(false); });
  el('selectedDateInput').addEventListener('change', (e) => { state.selectedDate = e.target.value; renderAll(); saveState(false); });
  el('uploadButton').addEventListener('click', () => el('imageInput').click());
  el('imageInput').addEventListener('change', handleImageUpload);
  el('loadSampleButton').addEventListener('click', loadSample);
  el('loadSampleFromUploadButton')?.addEventListener('click', () => { loadSample(); switchPage('home', true); });
  bindDataInputEvents();
  el('cloudSaveButton')?.addEventListener('click', async () => {
    saveState(false);
    await saveCurrentMonthToCloud(true);
  });
  el('cloudReloadButton')?.addEventListener('click', async () => {
    await loadCloudInitialData(true);
    renderScheduleTable();
    renderUploadedImage();
    renderAll();
  });
  el('clearButton').addEventListener('click', clearAll);
  el('saveButton').addEventListener('click', async () => {
    saveState(false);
    await saveCurrentMonthToCloud(true);
  });
  el('addPersonButton').addEventListener('click', addPerson);
  el('removeEmptyRowsButton').addEventListener('click', removeEmptyRows);
  el('undoScheduleButton')?.addEventListener('click', restoreLastUndo);
  el('toggleReviewCompareButton')?.addEventListener('click', toggleReviewCompare);
  el('markReviewCompleteButton')?.addEventListener('click', () => {
    if (getReviewMeta().status === 'done') reopenCurrentMonthReview();
    else markCurrentMonthReviewed();
  });
  document.querySelectorAll('.sheet-tab').forEach((button) => {
    button.addEventListener('click', () => switchPage(button.dataset.page, true));
  });
  document.querySelectorAll('.category-tab').forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;
      const currentCategory = getPageCategory(state.activePage);
      if (category === currentCategory) return;
      switchPage(CATEGORY_DEFAULT_PAGE[category] || 'home', true);
    });
  });
  document.querySelectorAll('.page-shortcut').forEach((button) => {
    button.addEventListener('click', () => switchPage(button.dataset.goPage, true));
  });
  document.querySelectorAll('[data-theme-mode]').forEach((button) => {
    button.addEventListener('click', () => setThemeMode(button.dataset.themeMode || 'cheer'));
  });

  bindOcrEvents();
  bindImageViewerEvents();
}

function initMonthSelect() {
  el('monthInput').innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}월</option>`).join('');
}

function monthKey(year = state.year, month = state.month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseMonthKey(key) {
  const [year, month] = String(key).split('-').map(Number);
  return { year, month };
}


function bindAuthEvents() {
  el('googleLoginButton')?.addEventListener('click', signInWithGoogle);
  el('logoutButton')?.addEventListener('click', async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    currentSession = null;
    currentUser = null;
    showAuthGate('로그아웃했어요. 다시 사용하려면 Google로 로그인해 주세요.');
  });
}

async function initAuth() {
  if (!supabaseClient) return false;
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.warn('세션 확인 실패', error);
    return false;
  }
  currentSession = data?.session || null;
  currentUser = currentSession?.user || null;
  if (currentUser && (window.location.hash || window.location.search.includes('code='))) {
    window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    currentSession = session || null;
    currentUser = session?.user || null;
    if (event === 'SIGNED_IN' && currentUser) {
      if (window.location.hash || window.location.search.includes('code=')) {
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
      }
      showAppShell();
      showCloudStatus(isSimpleTheme() ? '로그인 완료. 스케줄을 불러오는 중이에요.' : '로그인 완료. 선협이 스케줄을 불러오는 중이에요 ☁️', 'ok');
      ensureProfile();
      loadCloudInitialData(true).then(() => {
        syncInputs();
        renderScheduleTable();
        renderUploadedImage();
        renderAll();
      });
    }
    if (event === 'SIGNED_OUT') {
      showAuthGate('로그아웃했어요. 다시 사용하려면 Google로 로그인해 주세요.');
    }
  });

  return Boolean(currentUser);
}

async function signInWithGoogle() {
  if (!supabaseClient) {
    setAuthMessage('로그인 연결 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    return;
  }

  const button = el('googleLoginButton');
  const previousHtml = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.innerHTML = '<span class="google-mark">G</span><span>Google 로그인으로 이동 중...</span>';
  }
  setAuthMessage('Google 로그인 화면으로 이동하고 있어요.', 'ok');

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error('Google 로그인 실패', error);
    if (button) {
      button.disabled = false;
      button.innerHTML = previousHtml || '<span class="google-mark">G</span><span>Google로 로그인</span>';
    }
    setAuthMessage(`Google 로그인 연결 실패: ${error.message}`, 'error');
  }
}

function setAuthMessage(message, type = '') {
  const node = el('authMessage');
  if (!node) return;
  node.textContent = message;
  node.className = `auth-message ${type}`;
}

function showAuthGate(message = '') {
  el('authGate')?.classList.remove('is-hidden');
  el('appShell')?.classList.add('is-hidden');
  if (message) setAuthMessage(message);
}

function showAppShell() {
  el('authGate')?.classList.add('is-hidden');
  el('appShell')?.classList.remove('is-hidden');
  if (el('userEmailText')) el('userEmailText').textContent = currentUser?.email || '로그인됨';
  showCloudStatus('로그인 완료. 오늘도 같이 체크해볼까 ☁️', 'ok');
}

function showCloudStatus(message, type = '') {
  const kind = inferSaveStatusKind(message, type);
  setSaveStatus(kind, message, type);
}

function requireUser() {
  if (!currentUser) {
    showCloudStatus('로그인이 필요해요.', 'warn');
    return null;
  }
  return currentUser;
}

async function ensureProfile() {
  const user = requireUser();
  if (!user || !supabaseClient) return;
  const { error } = await supabaseClient.from('profiles').upsert({
    id: user.id,
    email: user.email || '',
    display_name: state.myName || user.email || '',
  });
  if (error) console.warn('프로필 저장 실패', error);
}


function ensureMonthStore() {
  if (!state.monthStore || typeof state.monthStore !== 'object') state.monthStore = {};
  if (!state.archiveMeta || !Array.isArray(state.archiveMeta)) state.archiveMeta = [];
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function sanitizeOcrForStorage(ocr) {
  const next = { ...getDefaultOcrState(), ...(ocr || {}) };
  if (Array.isArray(next.results)) {
    next.results = next.results.map((row) => ({
      name: row.name,
      schedules: row.schedules || [],
      confidence: row.confidence || 0,
      rawText: '',
    }));
  }
  return next;
}

function saveCurrentMonthToStore() {
  ensureMonthStore();
  normalizePeopleDays();
  const key = monthKey();
  state.monthStore[key] = {
    key,
    year: state.year,
    month: state.month,
    people: clonePlain(state.people || []),
    ocr: sanitizeOcrForStorage(state.ocr),
    imageName: state.imageName || state.monthStore[key]?.imageName || '',
    imageUpdatedAt: state.imageUpdatedAt || state.monthStore[key]?.imageUpdatedAt || '',
    memo: clonePlain(state.memo || getDefaultMemoState()),
    review: state.monthStore[key]?.review || null,
    updatedAt: new Date().toISOString(),
  };
}

function loadMonthDataFromStore(key = monthKey()) {
  ensureMonthStore();
  const saved = state.monthStore[key];
  if (saved) {
    state.people = clonePlain(saved.people || []);
    state.ocr = { ...getDefaultOcrState(), ...(saved.ocr || {}) };
    state.memo = { ...getDefaultMemoState(), ...(saved.memo || {}) };
    state.imageName = saved.imageName || '';
    state.imageUpdatedAt = saved.imageUpdatedAt || '';
  } else {
    state.people = [makePerson(''), makePerson(''), makePerson(''), makePerson(''), makePerson('')];
    state.ocr = getDefaultOcrState();
    state.memo = getDefaultMemoState();
    state.imageName = '';
    state.imageUpdatedAt = '';
  }
  ensurePeople();
  normalizePeopleDays();
}

async function changeActiveMonth(nextYear, nextMonth) {
  if (!Number.isFinite(nextYear) || !Number.isFinite(nextMonth)) return false;
  if (!(await confirmUnsavedBeforeMove())) {
    syncInputs();
    return false;
  }
  saveCurrentMonthToStore();
  state.year = nextYear;
  state.month = nextMonth;
  const currentDay = Number(String(state.selectedDate || '').slice(-2)) || 1;
  const clampedDay = Math.min(currentDay, daysInMonth(state.year, state.month));
  state.selectedDate = `${state.year}-${String(state.month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
  if (currentUser) {
    await loadCloudMonthData(state.year, state.month);
  } else {
    loadMonthDataFromStore(monthKey());
    await loadImageForCurrentMonth();
  }
  await refreshArchiveMeta();
  syncInputs();
  renderUploadedImage();
  syncOcrInputs();
  renderOcrResultTable();
  setTimeout(drawOcrPreview, 0);
  renderScheduleTable();
  renderAll();
  saveState(false);
  return true;
}


async function loadCloudInitialData(showMessage = false) {
  const user = requireUser();
  if (!user || !supabaseClient || isCloudBusy) return;
  isCloudBusy = true;
  updateSaveActionButtons();
  try {
    if (showMessage) showCloudStatus('클라우드 데이터를 불러오는 중이에요.', 'warn');
    await loadWorkCodesFromCloud();
    await loadCloudMonthData(state.year, state.month);
    await refreshArchiveMeta();
    markCloudSaved();
    if (showMessage) showCloudStatus(isSimpleTheme() ? '불러오기 완료. 최신 스케줄을 확인해요.' : '불러오기 완료. 다시 이어서 확인해요.', 'ok');
  } catch (error) {
    console.error('클라우드 로드 실패', error);
    showCloudStatus(`클라우드 데이터를 불러오지 못했어요: ${error.message || error}`, 'error');
  } finally {
    isCloudBusy = false;
    updateSaveActionButtons();
  }
}

async function loadWorkCodesFromCloud() {
  const user = requireUser();
  if (!user || !supabaseClient) return;
  const { data, error } = await supabaseClient
    .from('work_codes')
    .select('*')
    .eq('user_id', user.id)
    .order('code', { ascending: true });
  if (error) throw error;
  if (!data?.length) {
    await saveWorkCodesToCloud(false);
    return;
  }
  const codes = {};
  data.forEach((row) => {
    codes[row.code] = {
      label: row.label || '근무',
      start: row.start_time || '',
      end: row.end_time || '',
      type: row.is_off ? (row.code === 'AL' ? 'leave' : 'off') : deriveCodeType(row.code, { start: row.start_time || '', end: row.end_time || '' }),
    };
  });
  state.codes = codes;
  mergeMissingDefaultCodes(true);
}

async function saveWorkCodesToCloud(throwOnError = true) {
  const user = requireUser();
  if (!user || !supabaseClient) return;
  const rows = Object.entries(state.codes || {}).map(([code, info]) => ({
    user_id: user.id,
    code,
    label: info.label || '',
    start_time: info.start || '',
    end_time: info.end || '',
    is_off: ['off', 'leave'].includes(deriveCodeType(code, info)),
  }));
  if (!rows.length) return;
  const { error } = await supabaseClient.from('work_codes').upsert(rows, { onConflict: 'user_id,code' });
  if (error && throwOnError) throw error;
  if (error) console.warn('근무 코드 저장 실패', error);
}

async function getCloudMonthRow(year = state.year, month = state.month) {
  const user = requireUser();
  if (!user || !supabaseClient) return null;
  const { data, error } = await supabaseClient
    .from('schedule_months')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function upsertCloudMonth(imagePath = undefined) {
  const user = requireUser();
  if (!user || !supabaseClient) return null;
  const payload = {
    user_id: user.id,
    year: state.year,
    month: state.month,
    title: `${state.year}년 ${state.month}월 근무표`,
    selected_name: state.myName || '',
  };
  if (imagePath !== undefined) payload.image_path = imagePath;
  const { data, error } = await supabaseClient
    .from('schedule_months')
    .upsert(payload, { onConflict: 'user_id,year,month' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function saveCurrentMonthToCloud(showAlert = false) {
  const user = requireUser();
  if (!user || !supabaseClient || isCloudBusy) return;
  isCloudBusy = true;
  updateSaveActionButtons();
  try {
    showCloudStatus('현재 월 데이터를 저장하는 중이에요.', 'warn');
    saveCurrentMonthToStore();
    await ensureProfile();
    await saveWorkCodesToCloud(true);
    const monthRow = await upsertCloudMonth();
    const monthId = monthRow.id;
    const days = daysInMonth(state.year, state.month);
    const rows = [];
    state.people.filter((p) => p.name).forEach((person) => {
      for (let i = 0; i < days; i++) {
        rows.push({
          schedule_month_id: monthId,
          user_id: user.id,
          day: i + 1,
          person_name: person.name,
          code: person.schedules?.[i] || '',
          note: '',
        });
      }
    });
    await supabaseClient
      .from('schedule_entries')
      .delete()
      .eq('schedule_month_id', monthId)
      .eq('user_id', user.id);
    if (rows.length) {
      const { error: insertError } = await supabaseClient.from('schedule_entries').insert(rows);
      if (insertError) throw insertError;
    }
    await refreshArchiveMeta();
    markCloudSaved();
    showCloudStatus(isSimpleTheme() ? '저장 완료. 최신 데이터로 정리했어요.' : '저장 완료. 오늘도 정리 성공!', 'ok');
    renderAll();
    if (showAlert) alert('클라우드에 저장했어요.');
  } catch (error) {
    console.error('저장 실패', error);
    showCloudStatus(`저장 실패: ${error.message || error}`, 'error');
    if (showAlert) alert(`저장 실패: ${error.message || error}`);
  } finally {
    isCloudBusy = false;
    updateSaveActionButtons();
  }
}

async function loadCloudMonthData(year = state.year, month = state.month) {
  const user = requireUser();
  if (!user || !supabaseClient) return false;
  const monthRow = await getCloudMonthRow(year, month);
  if (!monthRow) {
    loadMonthDataFromStore(monthKey(year, month));
    state.imageData = '';
    state.imageName = '';
    state.imageUpdatedAt = '';
    return false;
  }
  state.myName = monthRow.selected_name || state.myName || '';
  state.imageName = monthRow.image_path ? monthRow.image_path.split('/').pop() : '';
  state.imageUpdatedAt = monthRow.updated_at || monthRow.created_at || '';

  const { data: entries, error: entriesError } = await supabaseClient
    .from('schedule_entries')
    .select('*')
    .eq('schedule_month_id', monthRow.id)
    .eq('user_id', user.id)
    .order('person_name', { ascending: true })
    .order('day', { ascending: true });
  if (entriesError) throw entriesError;

  const peopleMap = new Map();
  const days = daysInMonth(year, month);
  (entries || []).forEach((row) => {
    if (!peopleMap.has(row.person_name)) {
      peopleMap.set(row.person_name, { name: row.person_name, schedules: Array.from({ length: days }, () => '') });
    }
    const person = peopleMap.get(row.person_name);
    if (row.day >= 1 && row.day <= days) person.schedules[row.day - 1] = row.code || '';
  });
  state.people = Array.from(peopleMap.values());
  ensurePeople();
  normalizePeopleDays();
  state.memo = { ...getDefaultMemoState(), ...(state.monthStore?.[monthKey(year, month)]?.memo || {}) };

  if (monthRow.image_path) {
    state.imageData = await loadImageDataFromCloud(monthRow.image_path);
  } else {
    state.imageData = '';
  }
  saveCurrentMonthToStore();
  saveState(false);
  return true;
}

async function uploadImageDataToCloud(dataUrl, originalName = 'schedule.jpg') {
  const user = requireUser();
  if (!user || !supabaseClient || !dataUrl) return null;
  const blob = await dataUrlToBlob(dataUrl);
  const path = `${user.id}/${monthKey()}/schedule.jpg`;
  const { error } = await supabaseClient.storage
    .from('schedule-images')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;
  await upsertCloudMonth(path);
  return path;
}

async function loadImageDataFromCloud(path) {
  if (!path || !supabaseClient) return '';
  const { data, error } = await supabaseClient.storage
    .from('schedule-images')
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  const res = await fetch(data.signedUrl);
  const blob = await res.blob();
  return await blobToDataUrl(blob);
}

function dataUrlToBlob(dataUrl) {
  const [header, body] = String(dataUrl).split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(body || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function openScheduleImageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withImageStore(mode, callback) {
  const db = await openScheduleImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, mode);
    const store = tx.objectStore(IMAGE_STORE_NAME);
    let callbackResult;
    try {
      callbackResult = callback(store);
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => {
      db.close();
      resolve(callbackResult);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putStoredImage(record) {
  await withImageStore('readwrite', (store) => store.put(record));
}

async function getStoredImage(key) {
  const db = await openScheduleImageDb();
  try {
    const tx = db.transaction(IMAGE_STORE_NAME, 'readonly');
    const store = tx.objectStore(IMAGE_STORE_NAME);
    return await requestToPromise(store.get(key));
  } finally {
    db.close();
  }
}

async function getAllStoredImages() {
  const db = await openScheduleImageDb();
  try {
    const tx = db.transaction(IMAGE_STORE_NAME, 'readonly');
    const store = tx.objectStore(IMAGE_STORE_NAME);
    return await requestToPromise(store.getAll());
  } finally {
    db.close();
  }
}

async function deleteStoredImage(key) {
  await withImageStore('readwrite', (store) => store.delete(key));
}

async function loadImageForCurrentMonth() {
  try {
    const record = await getStoredImage(monthKey());
    if (record?.imageData) {
      state.imageData = record.imageData;
      state.imageName = record.imageName || state.imageName || '';
      state.imageUpdatedAt = record.updatedAt || state.imageUpdatedAt || '';
    } else {
      state.imageData = '';
    }
  } catch (error) {
    console.warn('저장 이미지 로드 실패', error);
    state.imageData = '';
  }
}

async function refreshArchiveMeta() {
  if (currentUser && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('schedule_months')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (error) throw error;
      const records = [];
      for (const row of data || []) {
        let thumbData = '';
        if (row.image_path) {
          try {
            const { data: signed } = await supabaseClient.storage
              .from('schedule-images')
              .createSignedUrl(row.image_path, 60 * 60);
            thumbData = signed?.signedUrl || '';
          } catch (e) {
            thumbData = '';
          }
        }
        records.push({
          key: monthKey(row.year, row.month),
          year: row.year,
          month: row.month,
          imageName: row.image_path ? row.image_path.split('/').pop() : '',
          updatedAt: row.updated_at || row.created_at || '',
          thumbData,
          cloud: true,
        });
      }
      state.archiveMeta = records;
      return;
    } catch (error) {
      console.warn('클라우드 월별 보관함 로드 실패', error);
      showCloudStatus(`월별 보관함을 불러오지 못했어요: ${error.message || error}`, 'error');
    }
  }

  try {
    const records = await getAllStoredImages();
    state.archiveMeta = records.map((record) => ({
      key: record.key,
      year: record.year,
      month: record.month,
      imageName: record.imageName || '',
      updatedAt: record.updatedAt || '',
      thumbData: record.thumbData || record.imageData || '',
    })).sort((a, b) => String(b.key).localeCompare(String(a.key)));
  } catch (error) {
    console.warn('월별 보관함 로드 실패', error);
    state.archiveMeta = state.archiveMeta || [];
  }
}

function syncInputs() {
  el('yearInput').value = state.year;
  el('monthInput').value = state.month;
  el('myNameInput').value = state.myName;
  el('selectedDateInput').value = state.selectedDate;
  syncOcrInputs();
}

function ensurePeople() {
  if (!state.people.length) {
    state.people = [
      makePerson(''), makePerson(''), makePerson(''), makePerson(''), makePerson('')
    ];
  }
}

function makePerson(name = '') {
  const days = daysInMonth(state.year, state.month);
  return { name, schedules: Array.from({ length: days }, () => '') };
}

function normalizePeopleDays() {
  const days = daysInMonth(state.year, state.month);
  state.people.forEach((person) => {
    if (!Array.isArray(person.schedules)) person.schedules = [];
    if (person.schedules.length < days) {
      person.schedules = person.schedules.concat(Array.from({ length: days - person.schedules.length }, () => ''));
    }
    if (person.schedules.length > days) person.schedules = person.schedules.slice(0, days);
  });
}


function getKnownCodesSet() {
  return new Set(Object.keys(state.codes || {}));
}

function normalizeScheduleCodeValue(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

function hasUncertaintyMarker(code) {
  const value = normalizeScheduleCodeValue(code);
  return value.endsWith('?') || value.endsWith('？');
}

function stripUncertaintyMarker(code) {
  return normalizeScheduleCodeValue(code).replace(/[?？]+$/g, '');
}

function isKnownScheduleCode(code) {
  const value = normalizeScheduleCodeValue(code);
  if (!value || value === '확인필요') return true;
  const baseCode = stripUncertaintyMarker(value);
  return getKnownCodesSet().has(baseCode);
}

function validatePeopleData(people = state.people, year = state.year, month = state.month) {
  const days = daysInMonth(year, month);
  const issues = [];
  (people || []).forEach((person, personIndex) => {
    const name = String(person.name || '').trim() || `이름 없는 행 ${personIndex + 1}`;
    for (let i = 0; i < days; i++) {
      const day = i + 1;
      const code = normalizeScheduleCodeValue(person.schedules?.[i] || '');
      if (!code) {
        issues.push({ type: 'empty', personIndex, name, day, code, message: `${name} ${day}일 값이 비어 있어요.` });
      } else if (code === '확인필요') {
        issues.push({ type: 'check', personIndex, name, day, code, message: `${name} ${day}일은 판독 불가라 원본 확인이 필요해요.` });
      } else if (hasUncertaintyMarker(code)) {
        const baseCode = stripUncertaintyMarker(code);
        const known = isKnownScheduleCode(code);
        issues.push({
          type: 'uncertain',
          personIndex,
          name,
          day,
          code,
          baseCode,
          known,
          message: known
            ? `${name} ${day}일 코드 ${code}는 추정값이에요. 원본 확인 후 맞으면 ?를 지워 주세요.`
            : `${name} ${day}일 코드 ${code}는 추정값이지만 코드 설정에 없어요. 원본 확인 후 코드 설정도 확인해 주세요.`,
        });
      } else if (!isKnownScheduleCode(code)) {
        issues.push({ type: 'unknown', personIndex, name, day, code, message: `${name} ${day}일 코드 ${code}가 코드 설정에 없어요.` });
      }
    }
  });
  return issues;
}

function getPersonValidationTypes(person, personIndex) {
  const types = new Set(validatePeopleData([person], state.year, state.month).map((issue) => issue.type));
  const hasOff = (person.schedules || []).some((code) => ['off', 'leave'].includes(getCodeInfo(code).type));
  if (hasOff) types.add('off');
  return types;
}

function shouldShowPersonInEditor(person, rowIndex) {
  const filter = state.editorFilter || 'all';
  if (filter === 'all') return true;
  const types = getPersonValidationTypes(person, rowIndex);
  if (filter === 'empty') return types.has('empty');
  if (filter === 'unknown') return types.has('unknown') || types.has('check') || types.has('uncertain');
  if (filter === 'off') return types.has('off');
  return true;
}

function getIssueTypeLabel(type) {
  if (type === 'empty') return '미입력';
  if (type === 'unknown') return '미등록';
  if (type === 'check') return '확인필요';
  if (type === 'uncertain') return '불확실';
  return '확인';
}

function renderValidationSummary() {
  const target = el('validationSummary');
  if (!target) return;
  const issues = validatePeopleData();
  const empty = issues.filter((issue) => issue.type === 'empty').length;
  const unknownIssues = issues.filter((issue) => issue.type === 'unknown');
  const uncertainIssues = issues.filter((issue) => issue.type === 'uncertain');
  const unknown = unknownIssues.length;
  const uncertain = uncertainIssues.length;
  const check = issues.filter((issue) => issue.type === 'check').length;

  function renderGroupedIssues(title, groupIssues, className = '') {
    if (!groupIssues.length) return '';
    const groupByCode = groupIssues.reduce((acc, issue) => {
      const code = issue.code || '빈 코드';
      if (!acc[code]) acc[code] = [];
      acc[code].push(issue);
      return acc;
    }, {});
    const cards = Object.entries(groupByCode)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([code, items]) => {
        const positions = items.map((issue) => `
          <span class="validation-position-chip">${escapeHtml(issue.name)} ${issue.day}일</span>
        `).join('');
        const addButton = className === 'unknown'
          ? `<button class="tiny-action-btn" data-add-missing-code="${escapeHtml(code)}" type="button">코드로 추가</button>`
          : '';
        return `
          <details class="validation-code-card ${className}">
            <summary>
              <span class="validation-code-name">${escapeHtml(code)}</span>
              <span class="validation-code-count">${items.length}건</span>
              <small>위치 보기</small>
              ${addButton}
            </summary>
            <div class="validation-position-grid">${positions}</div>
          </details>
        `;
      }).join('');
    return `<section class="validation-code-groups"><h4>${title}</h4><div class="validation-code-grid">${cards}</div></section>`;
  }

  const uncertainGroups = renderGroupedIssues('불확실 코드 요약', uncertainIssues, 'uncertain');
  const unknownGroups = renderGroupedIssues('미등록 코드 요약', unknownIssues, 'unknown');

  const issueList = issues.map((issue) => {
    const typeLabel = getIssueTypeLabel(issue.type);
    return `<li><span class="validation-type-badge ${issue.type}">${typeLabel}</span><b>${escapeHtml(issue.message)}</b></li>`;
  }).join('');

  const helperText = [
    uncertain ? '?가 붙은 코드는 추정값이에요. 원본 확인 후 맞으면 ?만 지워 주세요.' : '',
    unknown ? '미등록 코드는 코드 설정에 추가하면 확인 목록에서 사라져요.' : '',
    check ? '확인필요는 판독 불가 값이라 원본을 보고 직접 입력해 주세요.' : '',
  ].filter(Boolean).join(' ');

  const review = getReviewMeta();
  const reviewStatusClass = review.status === 'done' ? 'done' : review.status === 'needs_review' ? 'warn' : 'pending';
  const reviewButtonLabel = review.status === 'done' ? '검수 다시 하기' : '검수 완료 처리';

  target.innerHTML = `
    <div class="validation-card ${issues.length ? 'has-issues' : 'ok'}">
      <div class="review-status-row">
        <span class="review-status-pill ${reviewStatusClass}">${getReviewStatusText(review)}</span>
        <div class="review-status-actions">
          <button class="ghost-btn" data-undo-last type="button" ${undoStack.length ? '' : 'disabled'}>되돌리기</button>
          <button class="ghost-btn" data-review-compare type="button">${state.reviewCompareOpen ? '나란히 보기 닫기' : '원본과 나란히 보기'}</button>
          <button class="secondary-btn" data-mark-reviewed type="button">${reviewButtonLabel}</button>
        </div>
      </div>
      <div class="validation-head">
        <div>
          <strong>${issues.length ? '확인 필요 항목' : '검수 상태 좋음'}</strong>
          <span>${issues.length ? `미입력 ${empty}개 · 미등록 ${unknown}개 · 불확실 ${uncertain}개 · 확인필요 ${check}개` : '미입력/미등록/불확실 코드가 없습니다.'}</span>
        </div>
        ${helperText ? `<p>${helperText}</p>` : ''}
      </div>
      ${issues.length ? `
        <div class="validation-body validation-body-compact">
          ${uncertainGroups}
          ${unknownGroups}
          <details class="validation-all-list">
            <summary>전체 확인 목록 ${issues.length}개 보기</summary>
            <ul>${issueList}</ul>
          </details>
        </div>
      ` : ''}
    </div>
  `;

  target.querySelectorAll('[data-add-missing-code]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      addMissingCodeToSettings(button.dataset.addMissingCode || '');
    });
  });
  target.querySelector('[data-mark-reviewed]')?.addEventListener('click', () => {
    if (getReviewMeta().status === 'done') reopenCurrentMonthReview();
    else markCurrentMonthReviewed();
  });
  target.querySelector('[data-review-compare]')?.addEventListener('click', toggleReviewCompare);
  target.querySelector('[data-undo-last]')?.addEventListener('click', restoreLastUndo);
  updateReviewToolbarState();
}
function renderScheduleTable() {
  normalizePeopleDays();
  const days = daysInMonth(state.year, state.month);
  let html = '<thead><tr><th>이름</th>';
  for (let d = 1; d <= days; d++) html += `<th>${d}</th>`;
  html += '<th>삭제</th></tr></thead><tbody>';
  state.people.forEach((person, rowIndex) => {
    if (!shouldShowPersonInEditor(person, rowIndex)) return;
    html += `<tr><td><input class="name-input" data-row="${rowIndex}" data-field="name" value="${escapeHtml(person.name)}" placeholder="이름" /></td>`;
    for (let d = 0; d < days; d++) {
      const cellCode = normalizeScheduleCodeValue(person.schedules[d] || '');
      const issueClass = !cellCode ? 'cell-empty' : cellCode === '확인필요' ? 'cell-check' : hasUncertaintyMarker(cellCode) ? 'cell-uncertain' : !isKnownScheduleCode(cellCode) ? 'cell-unknown' : '';
      html += `<td class="${issueClass}"><input class="schedule-code-input ${issueClass}" maxlength="6" data-row="${rowIndex}" data-day="${d}" value="${escapeHtml(person.schedules[d] || '')}" /></td>`;
    }
    html += `<td><button class="ghost-btn row-delete" data-row="${rowIndex}">×</button></td></tr>`;
  });
  html += '</tbody>';
  el('scheduleTable').innerHTML = html;
  renderValidationSummary();
  refreshReviewComparePane();
  updateReviewToolbarState();
  document.querySelectorAll('[data-editor-filter]').forEach((button) => {
    button.classList.toggle('active', (state.editorFilter || 'all') === button.dataset.editorFilter);
  });

  el('scheduleTable').querySelectorAll('input').forEach((input) => {
    input.addEventListener('focus', () => {
      if (!input.dataset.undoCaptured) {
        pushUndoSnapshot('셀 수정 전');
        input.dataset.undoCaptured = 'true';
      }
    });
    input.addEventListener('input', handleScheduleInput);
  });
  el('scheduleTable').querySelectorAll('.row-delete').forEach((button) => {
    button.addEventListener('click', () => {
      pushUndoSnapshot('행 삭제 전');
      state.people.splice(Number(button.dataset.row), 1);
      markReviewNeedsCheck();
      ensurePeople();
      renderScheduleTable();
      renderAll();
      markUnsavedChanges();
      saveState(false);
    });
  });
}

function handleScheduleInput(e) {
  const row = Number(e.target.dataset.row);
  if (e.target.dataset.field === 'name') {
    state.people[row].name = e.target.value.trim();
  } else {
    const day = Number(e.target.dataset.day);
    const normalizedInput = e.target.value.trim().toUpperCase().replace(/？/g, '?');
    state.people[row].schedules[day] = normalizedInput;
    e.target.value = normalizedInput;
  }
  markReviewNeedsCheck();
  renderAll();
  markUnsavedChanges();
  saveState(false);
}

function addPerson() {
  pushUndoSnapshot('사람 추가 전');
  state.people.push(makePerson(''));
  markReviewNeedsCheck();
  renderScheduleTable();
  markUnsavedChanges();
  saveState(false);
}

function removeEmptyRows() {
  pushUndoSnapshot('빈 행 정리 전');
  state.people = state.people.filter((p) => p.name || p.schedules.some(Boolean));
  markReviewNeedsCheck();
  ensurePeople();
  renderScheduleTable();
  renderAll();
  markUnsavedChanges();
  saveState(false);
}

function clearAll() {
  if (!confirm('입력한 스케줄 데이터를 모두 비울까요?')) return;
  pushUndoSnapshot('전체 비우기 전');
  state.people = [makePerson(''), makePerson(''), makePerson(''), makePerson(''), makePerson('')];
  markReviewNeedsCheck();
  renderScheduleTable();
  renderAll();
  markUnsavedChanges();
  saveState(false);
}

function loadSample() {
  pushUndoSnapshot('샘플 적용 전');
  state.year = 2026;
  state.month = 6;
  state.myName = '유희수';
  state.selectedDate = '2026-06-12';
  const names = ['곽병우', '이준호', '유희수', '김도영', '이다운', '이상민', '정세완'];
  const patterns = [
    ['DO','DO','AM','BM','BM','BM','BM','PH','DO','BM','BM','BM','AM','BM','DO','DO','BM','BM','DO','AL','AL','DO','DO','BM','BM','BM','BM','BM','SD','DO'],
    ['AM','BM','PH','DO','BM','BM','BM','BM','BM','DO','DO','BM','BM','BM','BM','DO','DO','BM','BM','AL','AL','DO','BM','BM','BM','BM','BM','BM','BM','DO'],
    ['DO','BM','BM','BM','DO','BM','BM','PH','BM','BM','BM','AM','BM','BM','BM','DO','DO','BM','BM','BM','BM','BM','DO','DO','BM','BM','BM','BM','BM','BM'],
    ['BM','DO','PH','DO','BM','SD','BM','BM','BM','BM','BM','DO','SD','BM','BM','BM','DO','DO','BM','AL','AL','BM','BM','DO','DO','BM','BM','BM','BM','DO'],
    ['BM','BM','BM','BM','BM','PH','DO','BM','BM','BM','BM','BM','AD','DO','DO','AL','AL','BM','BM','BM','BM','DO','DO','BM','BM','BM','BM','DO','DO','BM'],
    ['AD','AD','AT','AT','DO','PH','DO','AD','AT','AT','AM','DO','DO','AD','AD','AT','AT','AT','DO','DO','AD','AD','AT','AT','AT','DO','DO','AD','AT','AT'],
    ['DO','DO','AL','DO','AM','AM','AL','PH','DO','AM','AM','AD','AM','AQ','DO','DO','AM','AM','AM','AM','AM','DO','DO','AM','AQ','AQ','AQ','AL','DO','AM'],
  ];
  state.people = names.map((name, i) => ({ name, schedules: patterns[i] }));
  markReviewNeedsCheck();
  syncInputs();
  renderUploadedImage();
  syncOcrInputs();
  renderOcrResultTable();
  setTimeout(drawOcrPreview, 0);
  renderScheduleTable();
  renderAll();
  markUnsavedChanges('샘플 데이터가 반영됐어요. 실제 데이터라면 저장해 주세요.');
  saveState(true);
}

async function handleImageUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드할 수 있어요.');
    return;
  }

  const status = el('imageStatus');
  if (status) {
    status.innerHTML = `<strong>${state.year}년 ${state.month}월 이미지 처리 중</strong><span>큰 사진은 앱에서 자동으로 가볍게 변환하고 있어요.</span>`;
    status.classList.add('uploaded');
  }

  try {
    const originalDataUrl = await readFileAsDataUrl(file);
    const compressedDataUrl = await resizeImageDataUrl(originalDataUrl, MAX_STORED_IMAGE_WIDTH, MAX_STORED_IMAGE_HEIGHT, 0.88);
    const thumbDataUrl = await resizeImageDataUrl(originalDataUrl, THUMB_WIDTH, THUMB_HEIGHT, 0.76);
    const key = monthKey();
    const now = new Date().toISOString();
    state.imageData = compressedDataUrl;
    state.imageName = file.name;
    state.imageUpdatedAt = now;
    await putStoredImage({
      key,
      year: state.year,
      month: state.month,
      imageName: file.name,
      imageData: compressedDataUrl,
      thumbData: thumbDataUrl,
      updatedAt: now,
    });
    saveCurrentMonthToStore();
    if (currentUser) {
      showCloudStatus('이미지를 저장하는 중이에요.', 'warn');
      await uploadImageDataToCloud(compressedDataUrl, file.name);
      showCloudStatus('이미지 업로드 완료. 스케줄 검수 후 저장 버튼을 눌러 주세요.', 'ok');
    }
    await refreshArchiveMeta();
    renderUploadedImage();
    drawOcrPreview();
    renderAll();
    markUnsavedChanges('이미지가 변경됐어요. 저장 버튼을 눌러 반영해 주세요.');
    saveState(false);
  } catch (error) {
    console.error('이미지 업로드 실패', error);
    alert('이미지를 저장하지 못했어요. 브라우저 저장 공간이 부족하거나 이미지가 너무 클 수 있어요. 다른 이미지로 다시 시도해 주세요.');
  } finally {
    e.target.value = '';
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function resizeImageDataUrl(src, maxWidth, maxHeight, quality = 0.9) {
  const img = await loadImage(src);
  const ratio = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
  const width = Math.max(1, Math.round(img.naturalWidth * ratio));
  const height = Math.max(1, Math.round(img.naturalHeight * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

function renderUploadedImage() {
  const image = el('imagePreview');
  const emptyPreview = el('emptyPreview');
  const status = el('imageStatus');
  const actions = el('uploadNextActions');

  if (!image || !emptyPreview) return;

  if (state.imageData) {
    image.src = state.imageData;
    image.style.display = 'block';
    emptyPreview.style.display = 'none';
    if (status) {
      status.innerHTML = `<strong>${state.year}년 ${state.month}월 근무표 저장됨</strong><span>${escapeHtml(state.imageName || '스케줄표 이미지')}</span><small>로그인 상태에서는 다른 기기에서도 불러올 수 있어요.</small>`;
      status.classList.add('uploaded');
    }
    if (actions) actions.classList.add('show');
  } else {
    image.removeAttribute('src');
    image.style.display = 'none';
    emptyPreview.style.display = 'grid';
    if (status) {
      status.innerHTML = `<strong>${state.year}년 ${state.month}월 이미지 없음</strong><span>이 월의 근무표 이미지를 업로드해 주세요.</span>`;
      status.classList.remove('uploaded');
    }
    if (actions) actions.classList.remove('show');
  }
}


function bindOcrEvents() {
  const ids = ['ocrNamesInput', 'ocrXInput', 'ocrYInput', 'ocrWInput', 'ocrHInput'];
  ids.forEach((id) => {
    const node = el(id);
    if (!node) return;
    node.addEventListener('input', () => {
      updateOcrStateFromInputs();
      drawOcrPreview();
      saveState(false);
    });
  });
  el('loadDefaultNamesButton')?.addEventListener('click', () => {
    state.ocr.names = getDefaultNamesText();
    syncOcrInputs();
    saveState(false);
  });
  el('useTopTablePresetButton')?.addEventListener('click', () => {
    state.ocr.rect = { x: 18.3, y: 12.1, w: 49.6, h: 25.5 };
    syncOcrInputs();
    drawOcrPreview();
    saveState(false);
  });
  el('drawOcrPreviewButton')?.addEventListener('click', drawOcrPreview);
  el('runOcrButton')?.addEventListener('click', runOcrExtraction);
  el('applyOcrToEditorButton')?.addEventListener('click', applyOcrResultsToEditor);

  ['memoTextInput', 'memoXInput', 'memoYInput', 'memoWInput', 'memoHInput'].forEach((id) => {
    const node = el(id);
    if (!node) return;
    node.addEventListener('input', () => {
      updateMemoStateFromInputs();
      state.memo.updatedAt = new Date().toISOString();
      markUnsavedChanges('메모 내용이 변경됐어요. 저장 버튼을 눌러 반영해 주세요.');
      saveState(false);
    });
  });
  el('useMemoPresetButton')?.addEventListener('click', () => {
    state.memo = { ...getDefaultMemoState(), ...(state.memo || {}), rect: getDefaultMemoState().rect };
    syncMemoInputs();
    saveState(false);
  });
  el('runMemoOcrButton')?.addEventListener('click', runMemoExtraction);
  el('saveMemoButton')?.addEventListener('click', () => {
    updateMemoStateFromInputs();
    state.memo.updatedAt = new Date().toISOString();
    markUnsavedChanges('메모를 저장했어요. 클라우드 저장 버튼을 눌러 현재 월에 반영해 주세요.');
    saveState(false);
    alert('메모를 현재 월에 저장했어요.');
  });
}

function syncOcrInputs() {
  state.ocr = { ...getDefaultOcrState(), ...(state.ocr || {}) };
  if (el('ocrNamesInput')) el('ocrNamesInput').value = state.ocr.names || '';
  const rect = state.ocr.rect || getDefaultOcrState().rect;
  if (el('ocrXInput')) el('ocrXInput').value = rect.x;
  if (el('ocrYInput')) el('ocrYInput').value = rect.y;
  if (el('ocrWInput')) el('ocrWInput').value = rect.w;
  if (el('ocrHInput')) el('ocrHInput').value = rect.h;
  syncMemoInputs();
}

function syncMemoInputs() {
  state.memo = { ...getDefaultMemoState(), ...(state.memo || {}) };
  const memoRect = state.memo.rect || getDefaultMemoState().rect;
  if (el('memoTextInput')) el('memoTextInput').value = state.memo.text || '';
  if (el('memoXInput')) el('memoXInput').value = memoRect.x;
  if (el('memoYInput')) el('memoYInput').value = memoRect.y;
  if (el('memoWInput')) el('memoWInput').value = memoRect.w;
  if (el('memoHInput')) el('memoHInput').value = memoRect.h;
}

function updateOcrStateFromInputs() {
  state.ocr = { ...getDefaultOcrState(), ...(state.ocr || {}) };
  if (el('ocrNamesInput')) state.ocr.names = el('ocrNamesInput').value;
  state.ocr.rect = {
    x: clampNumber(Number(el('ocrXInput')?.value || 0), 0, 99),
    y: clampNumber(Number(el('ocrYInput')?.value || 0), 0, 99),
    w: clampNumber(Number(el('ocrWInput')?.value || 1), 1, 100),
    h: clampNumber(Number(el('ocrHInput')?.value || 1), 1, 100),
  };
}

function updateMemoStateFromInputs() {
  state.memo = { ...getDefaultMemoState(), ...(state.memo || {}) };
  if (el('memoTextInput')) state.memo.text = el('memoTextInput').value;
  state.memo.rect = {
    x: clampNumber(Number(el('memoXInput')?.value || 0), 0, 99),
    y: clampNumber(Number(el('memoYInput')?.value || 0), 0, 99),
    w: clampNumber(Number(el('memoWInput')?.value || 1), 1, 100),
    h: clampNumber(Number(el('memoHInput')?.value || 1), 1, 100),
  };
}

async function drawOcrPreview() {
  const canvas = el('ocrPreviewCanvas');
  const empty = el('ocrEmptyPreview');
  if (!canvas || !empty) return;
  if (!state.imageData) {
    canvas.style.display = 'none';
    empty.style.display = 'grid';
    return;
  }
  const img = await loadImage(state.imageData);
  const maxWidth = 920;
  const ratio = Math.min(1, maxWidth / img.naturalWidth);
  canvas.width = Math.round(img.naturalWidth * ratio);
  canvas.height = Math.round(img.naturalHeight * ratio);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const rect = state.ocr?.rect || getDefaultOcrState().rect;
  const x = canvas.width * rect.x / 100;
  const y = canvas.height * rect.y / 100;
  const w = canvas.width * rect.w / 100;
  const h = canvas.height * rect.h / 100;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 214, 10, 0.18)';
  ctx.strokeStyle = 'rgba(255, 183, 0, 0.95)';
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  const names = getOcrNames();
  if (names.length) {
    ctx.strokeStyle = 'rgba(255, 183, 0, 0.55)';
    ctx.lineWidth = 1;
    for (let i = 1; i < names.length; i++) {
      const lineY = y + (h / names.length) * i;
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + w, lineY);
      ctx.stroke();
    }
  }
  ctx.restore();
  canvas.style.display = 'block';
  empty.style.display = 'none';
}

function getOcrNames() {
  const raw = state.ocr?.names || '';
  return raw.split(/[\s,]+/).map((name) => name.trim()).filter(Boolean);
}

async function runOcrExtraction() {
  updateOcrStateFromInputs();
  const progress = el('ocrProgress');
  if (!state.imageData) {
    alert('먼저 설정·이미지 페이지에서 스케줄표 이미지를 업로드해 주세요.');
    switchPage('setup', true);
    return;
  }
  if (!window.Tesseract) {
    alert('OCR 라이브러리를 불러오지 못했어요. 인터넷 연결 상태를 확인한 뒤 새로고침해 주세요.');
    return;
  }
  const names = getOcrNames();
  if (!names.length) {
    alert('추출할 사람 이름을 위에서 아래 순서대로 입력해 주세요.');
    return;
  }

  const days = daysInMonth(state.year, state.month);
  const img = await loadImage(state.imageData);
  const results = [];
  if (progress) progress.textContent = `OCR 준비 중... 총 ${names.length}개 행을 읽습니다.`;

  for (let row = 0; row < names.length; row++) {
    if (progress) progress.textContent = `OCR 진행 중 ${row + 1}/${names.length}: ${names[row]}`;
    const cropDataUrl = cropOcrRow(img, row, names.length);
    let text = '';
    let confidence = 0;
    try {
      const result = await Tesseract.recognize(cropDataUrl, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && progress) {
            const pct = Math.round((m.progress || 0) * 100);
            progress.textContent = `OCR 진행 중 ${row + 1}/${names.length}: ${names[row]} · ${pct}%`;
          }
        },
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
      });
      text = result?.data?.text || '';
      confidence = Math.round(result?.data?.confidence || 0);
    } catch (error) {
      console.warn('OCR row failed', error);
      text = '';
      confidence = 0;
    }
    const codes = extractCodesFromOcrText(text, days);
    results.push({ name: names[row], schedules: codes, rawText: text, confidence });
    state.ocr.results = results;
    renderOcrResultTable();
  }

  state.ocr.results = results;
  renderOcrResultTable();
  saveState(false);
  if (progress) progress.textContent = `추출 완료 · 아래 결과를 확인한 뒤 “추출 결과 검수표에 반영”을 눌러 주세요.`;
}

function cropOcrRow(img, rowIndex, rowCount) {
  const rect = state.ocr.rect || getDefaultOcrState().rect;
  const sx = img.naturalWidth * rect.x / 100;
  const sy = img.naturalHeight * rect.y / 100 + (img.naturalHeight * rect.h / 100 / rowCount) * rowIndex;
  const sw = img.naturalWidth * rect.w / 100;
  const sh = img.naturalHeight * rect.h / 100 / rowCount;
  const scale = 4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = gray < 165 ? 0 : 255;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function extractCodesFromOcrText(text, days) {
  const known = new Set(Object.keys(state.codes || getDefaultCodes()));
  const replacements = {
    'D0': 'DO', '0O': 'DO', 'O0': 'DO',
    '8M': 'BM', '6M': 'BM', 'B1': 'BI',
    'A1': 'AI', 'Al': 'AI', 'A|': 'AI',
    'P H': 'PH', 'D O': 'DO', 'B M': 'BM', 'A M': 'AM', 'A L': 'AL',
  };
  let normalized = String(text || '').toUpperCase();
  Object.entries(replacements).forEach(([from, to]) => {
    normalized = normalized.split(from.toUpperCase()).join(to);
  });
  normalized = normalized.replace(/0/g, 'O').replace(/8/g, 'B').replace(/1/g, 'I');

  const wordMatches = normalized.match(/[A-Z]{2}/g) || [];
  let codes = wordMatches.filter((token) => known.has(token));

  if (codes.length < Math.floor(days * 0.5)) {
    const letters = normalized.replace(/[^A-Z]/g, '');
    const chunked = [];
    for (let i = 0; i < letters.length - 1; i += 2) {
      const pair = letters.slice(i, i + 2);
      if (known.has(pair)) chunked.push(pair);
    }
    if (chunked.length > codes.length) codes = chunked;
  }

  if (codes.length < days) {
    codes = codes.concat(Array.from({ length: days - codes.length }, () => ''));
  }
  return codes.slice(0, days);
}

function renderOcrResultTable() {
  const table = el('ocrResultTable');
  if (!table) return;
  const results = state.ocr?.results || [];
  const days = daysInMonth(state.year, state.month);
  if (!results.length) {
    table.innerHTML = '<tbody><tr><td>아직 추출 결과가 없습니다.</td></tr></tbody>';
    return;
  }
  let html = '<thead><tr><th>이름</th>';
  for (let d = 1; d <= days; d++) html += `<th>${d}</th>`;
  html += '<th>신뢰도</th></tr></thead><tbody>';
  results.forEach((row) => {
    html += `<tr><td><strong>${escapeHtml(row.name)}</strong></td>`;
    for (let d = 0; d < days; d++) html += `<td>${escapeHtml(row.schedules?.[d] || '')}</td>`;
    html += `<td><span class="ocr-confidence">${row.confidence || 0}</span></td></tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;
}

function applyOcrResultsToEditor() {
  const results = state.ocr?.results || [];
  if (!results.length) {
    alert('먼저 자동 추출을 실행해 주세요.');
    return;
  }
  pushUndoSnapshot('OCR 반영 전');
  state.people = results.map((row) => ({ name: row.name, schedules: row.schedules || [] }));
  markReviewNeedsCheck();
  normalizePeopleDays();
  if (!state.myName && state.people[0]?.name) state.myName = state.people[0].name;
  syncInputs();
  renderScheduleTable();
  renderAll();
  markUnsavedChanges('OCR 결과가 검수표에 반영됐어요. 확인 후 저장해 주세요.');
  saveState(true);
  switchPage('editor', true);
}

async function runMemoExtraction() {
  updateMemoStateFromInputs();
  if (!state.imageData) {
    alert('먼저 설정·이미지 페이지에서 스케줄표 이미지를 업로드해 주세요.');
    switchPage('setup', true);
    return;
  }
  if (!window.Tesseract) {
    alert('OCR 라이브러리를 불러오지 못했어요. 인터넷 연결 상태를 확인한 뒤 새로고침해 주세요.');
    return;
  }
  const progress = el('memoOcrStatus');
  try {
    if (progress) progress.textContent = '메모 영역을 읽는 중이에요...';
    const img = await loadImage(state.imageData);
    const cropDataUrl = cropImageByPercentRect(img, state.memo.rect || getDefaultMemoState().rect, 3);
    const result = await Tesseract.recognize(cropDataUrl, 'kor+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && progress) {
          progress.textContent = `메모 OCR 진행 중 · ${Math.round((m.progress || 0) * 100)}%`;
        }
      },
    });
    const text = String(result?.data?.text || '').replace(/\n{3,}/g, '\n\n').trim();
    state.memo.text = text;
    state.memo.updatedAt = new Date().toISOString();
    syncMemoInputs();
    markUnsavedChanges('메모 영역 추출 결과가 저장됐어요. 필요하면 수정 후 저장해 주세요.');
    saveState(false);
    if (progress) progress.textContent = text ? '메모 추출 완료. 내용을 확인해 주세요.' : '읽힌 메모가 없어요. 영역을 조정해 다시 시도해 주세요.';
  } catch (error) {
    console.warn('메모 OCR 실패', error);
    if (progress) progress.textContent = '메모 추출 실패. 영역을 조정하거나 직접 입력해 주세요.';
    alert(`메모 추출 실패: ${error.message || error}`);
  }
}

function cropImageByPercentRect(img, rect, scale = 2) {
  const sx = img.naturalWidth * rect.x / 100;
  const sy = img.naturalHeight * rect.y / 100;
  const sw = img.naturalWidth * rect.w / 100;
  const sh = img.naturalHeight * rect.h / 100;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}


function bindDataInputEvents() {
  const copyButtons = [el('copyExtractionPromptButton'), el('copyExtractionPromptButton2')].filter(Boolean);
  copyButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await copyTextToClipboard(getExtractionPrompt());
        setPromptCopyStatus('추출 프롬프트를 복사했어요. 이미지와 함께 붙여넣어 주세요.', 'ok');
      } catch (error) {
        setPromptCopyStatus('복사에 실패했어요. 브라우저 권한을 확인해 주세요.', 'error');
      }
    });
  });
  el('chooseCsvFileButton')?.addEventListener('click', () => el('csvFileInput')?.click());
  el('csvFileInput')?.addEventListener('change', handleCsvFileSelect);
  el('clearCsvInputButton')?.addEventListener('click', () => {
    if (el('csvDataInput')) el('csvDataInput').value = '';
    setCsvInputStatus('입력칸을 비웠어요. AI가 반환한 CSV를 붙여넣어 주세요.');
    renderCsvPreview();
  });
  el('csvDataInput')?.addEventListener('input', renderCsvPreview);
  el('importCsvButton')?.addEventListener('click', () => importCsvFromInput(false));
  el('saveImportedCsvButton')?.addEventListener('click', async () => {
    const imported = importCsvFromInput(false);
    if (!imported) return;
    await saveCurrentMonthToCloud(true);
  });
}

function setPromptCopyStatus(message, type = '') {
  const node = el('promptCopyStatus');
  if (!node) return;
  node.textContent = message;
  node.className = `helper-text ${type}`;
}

function setCsvInputStatus(message, type = '') {
  const node = el('csvInputStatus');
  if (!node) return;
  node.textContent = message;
  node.className = `helper-text ${type}`;
}

function handleCsvFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (el('csvDataInput')) el('csvDataInput').value = String(reader.result || '');
    setCsvInputStatus(`${file.name} 파일을 불러왔어요. 검수표에 반영 버튼을 눌러 주세요.`, 'ok');
    renderCsvPreview();
  };
  reader.onerror = () => setCsvInputStatus('CSV 파일을 읽지 못했어요.', 'error');
  reader.readAsText(file, 'utf-8');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const input = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char === '\r') {
        // ignore CR
      } else {
        field += char;
      }
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
}

function normalizeCsvCode(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw === '확인필요') return raw;
  return raw.toUpperCase().replace(/？/g, '?').replace(/\s+/g, '');
}

function csvRowsToPeople(rows) {
  if (!rows.length) throw new Error('CSV 내용이 비어 있어요.');
  const header = rows[0].map((h) => String(h).trim());
  const index = new Map(header.map((name, i) => [name, i]));
  const required = ['year', 'month', 'person_name', 'd01'];
  const missing = required.filter((name) => !index.has(name));
  if (missing.length) throw new Error(`필수 헤더가 없어요: ${missing.join(', ')}`);
  for (let d = 1; d <= 31; d++) {
    const key = `d${String(d).padStart(2, '0')}`;
    if (!index.has(key)) throw new Error(`날짜 헤더가 없어요: ${key}`);
  }

  const firstData = rows.slice(1).find((r) => r.some((cell) => String(cell).trim()));
  const importedYear = Number(firstData?.[index.get('year')]);
  const importedMonth = Number(firstData?.[index.get('month')]);
  const nextYear = Number.isFinite(importedYear) && importedYear >= 2020 ? importedYear : state.year;
  const nextMonth = Number.isFinite(importedMonth) && importedMonth >= 1 && importedMonth <= 12 ? importedMonth : state.month;
  const days = daysInMonth(nextYear, nextMonth);

  const people = [];
  const csvIssues = [];
  rows.slice(1).forEach((row) => {
    const name = String(row[index.get('person_name')] || '').trim();
    if (!name) return;
    const schedules = [];
    for (let d = 1; d <= days; d++) {
      const key = `d${String(d).padStart(2, '0')}`;
      const code = normalizeCsvCode(row[index.get(key)] || '');
      schedules.push(code);
      if (!code) csvIssues.push(`${name} ${d}일 값이 비어 있어요.`);
      else if (code === '확인필요') csvIssues.push(`${name} ${d}일은 판독 불가라 원본 확인이 필요해요.`);
      else if (hasUncertaintyMarker(code)) csvIssues.push(`${name} ${d}일 코드 ${code}는 추정값이에요. 원본 확인 후 맞으면 ?를 지워 주세요.`);
      else if (!isKnownScheduleCode(code)) csvIssues.push(`${name} ${d}일 코드 ${code}가 코드 설정에 없어요.`);
    }
    for (let d = days + 1; d <= 31; d++) {
      const key = `d${String(d).padStart(2, '0')}`;
      const extra = normalizeCsvCode(row[index.get(key)] || '');
      if (extra) csvIssues.push(`${name} ${d}일은 ${nextMonth}월에 없는 날짜라 저장하지 않았어요.`);
    }
    people.push({ name, schedules });
  });
  if (!people.length) throw new Error('person_name이 있는 데이터 행을 찾지 못했어요.');
  return { year: nextYear, month: nextMonth, people, header, issues: csvIssues };
}

function importCsvFromInput(showAlert = true) {
  const text = el('csvDataInput')?.value || '';
  if (!text.trim()) {
    setCsvInputStatus('붙여넣은 CSV 데이터가 없어요.', 'error');
    return false;
  }
  try {
    const parsed = csvRowsToPeople(parseCsv(text));
    const hasExisting = state.people.some((p) => p.name || p.schedules?.some(Boolean));
    if (hasExisting && !confirm('현재 검수표 데이터를 CSV 내용으로 교체할까요?')) return false;
    pushUndoSnapshot('CSV 반영 전');
    state.year = parsed.year;
    state.month = parsed.month;
    state.people = parsed.people;
    if (!state.myName && parsed.people[0]?.name) state.myName = parsed.people[0].name;
    const selectedDay = Math.min(Number(String(state.selectedDate || '').slice(-2)) || 1, daysInMonth(state.year, state.month));
    state.selectedDate = `${state.year}-${String(state.month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    normalizePeopleDays();
    markReviewNeedsCheck();
    saveCurrentMonthToStore();
    syncInputs();
    renderScheduleTable();
    renderAll();
    markUnsavedChanges('CSV 데이터가 검수표에 반영됐어요. 확인 후 저장해 주세요.');
    saveState(false);
    setCsvInputStatus(`${state.year}년 ${state.month}월 데이터 ${parsed.people.length}명을 검수표에 반영했어요.`, 'ok');
    renderCsvPreview();
    if (showAlert) alert('CSV 데이터를 검수표에 반영했어요. 확인 후 저장해 주세요.');
    return true;
  } catch (error) {
    setCsvInputStatus(error.message || String(error), 'error');
    renderCsvPreview(error.message || String(error));
    return false;
  }
}

function renderCsvPreview(errorMessage = '') {
  const wrap = el('csvPreviewWrap');
  if (!wrap) return;
  const text = el('csvDataInput')?.value || '';
  if (!text.trim()) {
    wrap.innerHTML = '<div class="notice"><strong>미리보기</strong><span>CSV를 붙여넣으면 인식된 인원과 날짜 컬럼을 먼저 확인할 수 있어요.</span></div>';
    return;
  }
  try {
    const parsed = csvRowsToPeople(parseCsv(text));
    const sample = parsed.people.slice(0, 5).map((p) => `<div class="list-row"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.schedules.slice(0, 7).join(' / '))}</span><span>${p.schedules.length}일</span></div>`).join('');
    wrap.innerHTML = `
      <div class="info-card csv-preview-card">
        <h4>CSV 미리보기</h4>
        <p>${parsed.year}년 ${parsed.month}월 · ${parsed.people.length}명 인식됨${parsed.issues?.length ? ` · 확인 필요 ${parsed.issues.length}개` : ''}</p>
        <div class="list">${sample}</div>
        ${parsed.issues?.length ? `<div class="csv-issue-list">${parsed.issues.slice(0, 6).map((issue) => `<span>${escapeHtml(issue)}</span>`).join('')}${parsed.issues.length > 6 ? `<span>외 ${parsed.issues.length - 6}개 더 있음</span>` : ''}</div>` : ''}
      </div>
    `;
  } catch (error) {
    wrap.innerHTML = `<div class="notice error"><strong>CSV 확인 필요</strong><span>${escapeHtml(errorMessage || error.message || error)}</span></div>`;
  }
}

function renderDataInput() {
  renderCsvPreview();
  return '';
}

function renderAll() {
  renderSummary();
  renderViews();
  switchPage(state.activePage || 'home', false);
}

function getMyPerson() {
  if (!state.myName) return null;
  return state.people.find((p) => p.name.trim() === state.myName.trim()) || null;
}

function hasKoreanFinalConsonant(text = '') {
  const last = String(text || '').trim().slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return ((code - 0xac00) % 28) !== 0;
}

function getFriendlyScheduleOwnerName(name = state.myName) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '';
  const koreanOnly = /^[가-힣]{2,4}$/.test(trimmed);
  const displayName = koreanOnly && trimmed.length >= 3 ? trimmed.slice(1) : trimmed;
  if (displayName.endsWith('이')) return displayName;
  return hasKoreanFinalConsonant(displayName) ? `${displayName}이` : displayName;
}

function getDateObj(day) {
  return new Date(state.year, state.month - 1, day);
}

function getCodeInfo(code) {
  const value = normalizeScheduleCodeValue(code);
  if (!value) return { label: '미입력', start: '', end: '', type: 'empty' };
  if (value === '확인필요') return { label: '확인 필요', start: '', end: '', type: 'uncertain' };
  if (hasUncertaintyMarker(value)) {
    const baseCode = stripUncertaintyMarker(value);
    const baseInfo = state.codes[baseCode];
    if (baseInfo) return { ...baseInfo, label: `${baseInfo.label || '근무'} 확인 필요`, type: 'uncertain', baseCode };
    return { label: '추정 코드 확인 필요', start: '', end: '', type: 'uncertain', baseCode };
  }
  return state.codes[value] || { label: '코드 미등록', start: '', end: '', type: 'unknown' };
}

function getScheduleRowsForPerson(person) {
  const days = daysInMonth(state.year, state.month);
  return Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const code = person?.schedules[i] || '';
    const info = getCodeInfo(code);
    const date = getDateObj(day);
    return { day, date, dateText: `${state.month}/${day}(${dayNames[date.getDay()]})`, code, ...info };
  });
}


function getDailyCheerMessage(info = {}, code = '', selectedDay = 1) {
  const startMinutes = timeToMinutes(info.start || '');
  if (isSimpleTheme()) {
    if (info.type === 'work') return info.start ? `${info.start} 출근 일정이 있어요.` : '근무 일정이 등록되어 있어요.';
    if (info.type === 'off') return '휴무 일정으로 표시되어 있어요.';
    if (info.type === 'leave') return '연차 일정으로 표시되어 있어요.';
    if (code) return '일정 코드를 한 번 확인해 주세요.';
    return '근무표를 입력하면 일정 요약을 보여줘요.';
  }
  if (info.type === 'work') {
    if (startMinutes !== null && startMinutes >= 13 * 60) return '오후 출근이야. 천천히 페이스 맞추기 ☁️';
    if (startMinutes !== null && startMinutes <= 8 * 60) return '이른 출근도 차근차근, 물도 꼭 챙기기 💛';
    return '오늘도 무리하지 말고 안전하게 다녀오기 ⭐';
  }
  if (info.type === 'off') return '오늘은 푹 쉬는 날. 제대로 충전하기 🍀';
  if (info.type === 'leave') return '연차는 소중하니까 마음 편히 쉬기 🎀';
  if (code) return '애매한 일정은 한 번만 확인하고 마음 놓기.';
  return '근무표를 넣으면 오늘의 응원을 보여줄게 ☁️';
}

function getCheerStickerText(info = {}, code = '') {
  if (isSimpleTheme()) {
    if (info.type === 'work') return '근무';
    if (info.type === 'off') return '휴무';
    if (info.type === 'leave') return '연차';
    if (code) return '확인';
    return '일정';
  }
  if (info.type === 'work') return '출근 응원';
  if (info.type === 'off') return '쉬는 날';
  if (info.type === 'leave') return '충전 day';
  if (code) return '확인 포인트';
  return '스케줄 노트';
}

function renderChefCheerCard(info = {}, code = '', selectedDay = 1) {
  const message = getDailyCheerMessage(info, code, selectedDay);
  const sticker = getCheerStickerText(info, code);
  const typeClass = badgeClass(info.type || 'empty');
  const icon = isSimpleTheme() ? '✓' : '☁️';
  const title = isSimpleTheme() ? '일정 요약' : '오늘의 응원';
  return `
    <section class="chef-cheer-card compact-cheer-banner ${typeClass}" aria-label="${escapeHtml(title)}">
      <span class="chef-cheer-icon" aria-hidden="true">${escapeHtml(icon)}</span>
      <div class="chef-cheer-copy">
        <p>${escapeHtml(sticker)}</p>
        <strong>${escapeHtml(message)}</strong>
      </div>
    </section>
  `;
}

function getRestCheerText(nextOff, focusDay, rows = []) {
  if (!rows.length) return '이번 달 휴무가 보이면 여기서 바로 응원해줄게요.';
  if (!nextOff) return '이번 달도 차근차근 마무리해요.';
  const diff = Math.max(nextOff.day - focusDay, 0);
  if (diff === 0) return '오늘은 충전하는 날. 푹 쉬어도 괜찮아요.';
  if (diff === 1) return '다음 휴무까지 하루! 조금만 더 힘내기.';
  return `다음 휴무까지 ${diff}일 남았어요. 무리하지 말고 페이스 유지!`;
}

function renderSummary() {
  const person = getMyPerson();
  const selected = new Date(state.selectedDate || Date.now());
  const selectedDay = isSameMonth(selected) ? selected.getDate() : 1;
  const todayCode = person?.schedules[selectedDay - 1] || '';
  const todayInfo = getCodeInfo(todayCode);
  const rows = person ? getScheduleRowsForPerson(person) : [];
  const nextOff = rows.find((row) => row.day >= selectedDay && ['off', 'leave'].includes(row.type));
  const workCount = rows.filter((row) => row.type === 'work').length;
  const offCount = rows.filter((row) => row.type === 'off').length;
  const leaveCount = rows.filter((row) => row.type === 'leave').length;
  const selectedLabel = `${state.month}/${selectedDay}(${dayNames[getDateObj(selectedDay).getDay()]})`;
  const ownerName = getFriendlyScheduleOwnerName();
  const isToday = (() => {
    const now = new Date();
    return now.getFullYear() === state.year && now.getMonth() + 1 === state.month && now.getDate() === selectedDay;
  })();
  let scheduleHeadline = '일정 없음';
  if (todayInfo.type === 'work') {
    scheduleHeadline = todayInfo.start ? `${todayInfo.start} 출근` : `${todayCode || '근무'} 근무`;
  } else if (todayInfo.type === 'off') {
    scheduleHeadline = isToday ? '오늘은 휴무' : `${selectedLabel} 휴무`;
  } else if (todayInfo.type === 'leave') {
    scheduleHeadline = isToday ? '오늘은 연차' : `${selectedLabel} 연차`;
  } else if (todayCode) {
    scheduleHeadline = todayInfo.label || todayCode;
  }
  const scheduleSubText = todayCode
    ? `${todayCode} · ${formatTime(todayInfo) || todayInfo.label || '시간 정보 없음'}`
    : '스케줄 데이터가 없어요.';
  const mainScheduleTitle = isSimpleTheme()
    ? (state.myName ? `${state.myName} ${isToday ? '오늘' : selectedLabel} 일정` : '선택일 일정')
    : (ownerName ? `${ownerName} ${isToday ? '오늘' : selectedLabel} 일정` : '선택일 내 일정');
  const homeCheerLine = getDailyCheerMessage(todayInfo, todayCode, selectedDay);
  const memoText = getCurrentMemoText();
  const memoLabel = isSimpleTheme() ? '메모' : '응원 메모';
  const memoStrong = memoText ? (isSimpleTheme() ? '메모 있음' : '메모 저장됨') : '메모 없음';
  const memoEmptyText = isSimpleTheme() ? '메모를 입력해 주세요.' : '오늘 챙겨둘 말을 적어줘.';

  const stats = getMonthlyWorkStats(person);
  el('summaryCards').innerHTML = `
    <div class="summary-card main-schedule-card cheer-summary-card"><i class="home-card-sticker" aria-hidden="true">☁️</i><p>${escapeHtml(mainScheduleTitle)}</p><strong>${escapeHtml(scheduleHeadline)}</strong><span>${escapeHtml(scheduleSubText)}</span><small class="home-cheer-line">${escapeHtml(homeCheerLine)}</small></div>
    <div class="home-mini-summary-grid" aria-label="홈 요약">
      <div class="summary-card home-mini-card home-mini-off"><i aria-hidden="true">🍀</i><p>다음 휴무</p><strong>${nextOff ? nextOff.dateText : '-'}</strong><span>${nextOff ? `${nextOff.code} ${nextOff.label}` : '남은 휴무 없음'}</span></div>
      <div class="summary-card home-mini-card home-mini-month"><i aria-hidden="true">⭐</i><p>이번 달</p><strong>${workCount}일 근무</strong><span>휴무 ${offCount} · 연차 ${leaveCount}</span></div>
      <div class="summary-card home-mini-card home-mini-stat"><i aria-hidden="true">💛</i><p>통계</p><strong>${stats.mostCode || '-'}</strong><span>${stats.summaryText}</span></div>
      <div class="summary-card home-mini-card home-mini-memo memo-summary-card"><i aria-hidden="true">🎀</i><p>${escapeHtml(memoLabel)}</p><strong>${escapeHtml(memoStrong)}</strong><span>${escapeHtml(memoText ? compactText(memoText, 24) : memoEmptyText)}</span></div>
    </div>
  `;
  const guide = el('workflowGuide');
  if (guide) guide.innerHTML = `${renderChefCheerCard(todayInfo, todayCode, selectedDay)}${renderWorkflowGuide()}`;
}

function getWorkflowStepStatus() {
  const issueCount = validatePeopleData(state.people || [], state.year, state.month).length;
  const review = getReviewMeta();
  return {
    hasImage: Boolean(state.imageData),
    hasPeople: Boolean((state.people || []).filter((person) => person.name).length),
    issueCount,
    reviewStatus: review.status || 'pending',
    isSaved: !hasUnsavedCloudChanges,
  };
}

function renderWorkflowGuide() {
  const status = getWorkflowStepStatus();
  const steps = [
    { title: '1. 이미지 업로드', page: 'setup', desc: status.hasImage ? '원본 이미지가 저장되어 있어요.' : '기준 월을 맞추고 근무표 이미지를 올려 주세요.', state: status.hasImage ? 'done' : 'todo' },
    { title: '2. 데이터 입력', page: 'dataInput', desc: status.hasPeople ? `${(state.people || []).filter((p) => p.name).length}명의 데이터가 있어요.` : 'CSV를 붙여넣어 주세요.', state: status.hasPeople ? 'done' : 'todo' },
    { title: '3. 데이터 확인', page: 'editor', desc: status.issueCount ? `확인할 항목 ${status.issueCount}개가 있어요.` : '검수할 항목이 없거나 아직 데이터가 없어요.', state: status.reviewStatus === 'done' ? 'done' : (status.issueCount ? 'warn' : 'todo') },
    { title: '4. 저장·공유', page: 'share', desc: status.isSaved ? '현재 변경사항은 저장된 상태예요.' : '저장 버튼을 눌러 반영해 주세요.', state: status.isSaved ? 'done' : 'warn' },
  ];
  return `
    <section class="workflow-guide-card" aria-label="사용 흐름 안내">
      <div class="workflow-guide-head">
        <div>
          <p>QUICK FLOW</p>
          <h3>입력부터 저장까지</h3>
        </div>
        <button class="ghost-btn workflow-help-btn" data-help-page="help" type="button">사용법 보기</button>
      </div>
      <div class="workflow-step-grid">
        ${steps.map((step) => `
          <button class="workflow-step ${step.state}" data-help-page="${step.page}" type="button">
            <strong>${escapeHtml(step.title)}</strong>
            <span>${escapeHtml(step.desc)}</span>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function renderViews() {
  const map = {
    daily: renderDaily,
    weekly: renderWeekly,
    monthly: renderMonthly,
    dayRoster: renderDayRoster,
    offDays: renderOffDays,
    share: renderShare,
    archive: renderArchive,
    settings: renderSettings,
    help: renderHelp,
    dataInput: renderDataInput,
  };
  Object.entries(map).forEach(([page, renderer]) => {
    const target = el(`${page}Content`);
    if (target) target.innerHTML = renderer();
  });
  bindViewEvents();
}

function switchPage(page, shouldSave = true) {
  const pages = Array.from(document.querySelectorAll('.app-page')).map((section) => section.dataset.page);
  if (!page || !pages.includes(page)) page = 'home';
  state.activePage = page;
  const activeCategory = getPageCategory(page);
  const categoryShell = document.querySelector('.category-shell');
  if (categoryShell) categoryShell.dataset.activeCategory = activeCategory;
  document.querySelectorAll('.category-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.category === activeCategory);
  });
  document.querySelectorAll('.app-page').forEach((section) => {
    section.classList.toggle('active', section.dataset.page === page);
  });
  document.querySelectorAll('.sheet-tab').forEach((button) => {
    const belongsToActiveCategory = !button.dataset.category || button.dataset.category === activeCategory;
    button.hidden = !belongsToActiveCategory;
    button.setAttribute('aria-hidden', String(!belongsToActiveCategory));
    button.classList.toggle('active', belongsToActiveCategory && button.dataset.page === page);
  });
  if (page === 'extract') setTimeout(drawOcrPreview, 0);
  if (page === 'dataInput') renderCsvPreview();
  if (shouldSave) saveState(false);
  if (shouldSave) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPersonPicker(title = '보기 기준') {
  const people = state.people.filter((p) => p.name);
  if (!people.length) return '';
  const current = state.myName || people[0].name;
  return `
    <label class="person-view-picker">
      <span>${title}</span>
      <select data-person-select="true">
        ${people.map((person) => `<option value="${escapeHtml(person.name)}" ${person.name === current ? 'selected' : ''}>${escapeHtml(person.name)}</option>`).join('')}
      </select>
    </label>
  `;
}

function timeToMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function minutesToTimelineLabel(totalMinutes) {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function getTimelineItems(day) {
  const workItems = [];
  const offPeople = [];
  const noTimePeople = [];
  state.people.filter((p) => p.name).forEach((person) => {
    const rawCode = person.schedules[day - 1] || '';
    const code = normalizeScheduleCodeValue(rawCode);
    const info = getCodeInfo(code);
    const start = timeToMinutes(info.start);
    let end = timeToMinutes(info.end);
    const hasTimelineTime = start !== null && end !== null;

    if (hasTimelineTime && !['off', 'leave', 'empty'].includes(info.type)) {
      if (end <= start) end += 1440;
      workItems.push({
        name: person.name,
        code,
        info,
        start,
        end,
        startLabel: minutesToTimelineLabel(start),
        endLabel: minutesToTimelineLabel(end),
        isUncertain: info.type === 'uncertain' || hasUncertaintyMarker(code),
      });
    } else if (['off', 'leave'].includes(info.type)) {
      offPeople.push({ name: person.name, code, info });
    } else if (code) {
      noTimePeople.push({ name: person.name, code, info });
    }
  });

  workItems.sort((a, b) => a.start - b.start || a.end - b.end || a.name.localeCompare(b.name));
  return { workItems, offPeople, noTimePeople };
}

function getTimelineWindow(items) {
  if (!items.length) return { start: 6 * 60, end: 23 * 60, hours: [] };
  const minStart = Math.min(...items.map((item) => item.start));
  const maxEnd = Math.max(...items.map((item) => item.end));
  const start = Math.max(0, Math.floor(minStart / 60) * 60 - 60);
  const end = Math.min(36 * 60, Math.ceil(maxEnd / 60) * 60 + 60);
  const hours = [];
  for (let minute = start; minute <= end; minute += 60) hours.push(minute);
  return { start, end, hours };
}

function getPeakCoveragePoint(items, timelineWindow = null) {
  if (!items.length) return { count: 0, minute: 0 };
  const window = timelineWindow || getTimelineWindow(items);
  let best = { count: 0, minute: window.start };
  for (let minute = window.start; minute < window.end; minute += 30) {
    const count = items.filter((item) => item.start <= minute && item.end > minute).length;
    if (count > best.count) best = { count, minute };
  }
  return best;
}

function getPeakCoverage(items) {
  const best = getPeakCoveragePoint(items);
  if (!best.count) return '-';
  return `${minutesToTimelineLabel(best.minute)} 전후 ${best.count}명`;
}

function getTimelineToneClass(code = '') {
  const value = stripUncertaintyMarker(normalizeScheduleCodeValue(code)).toUpperCase();
  if (/^BM/.test(value)) return 'tone-blue';
  if (/^A[O0M]/.test(value) || value === 'AM') return 'tone-mint';
  if (/^A[QT47]/.test(value) || /^A[4-9]/.test(value)) return 'tone-orange';
  return 'tone-blue';
}

function renderDailyTimeline(day) {
  const { workItems, offPeople, noTimePeople } = getTimelineItems(day);
  if (!workItems.length && !offPeople.length && !noTimePeople.length) {
    return `<div class="info-card roster-card"><p>해당 날짜에 입력된 스케줄 데이터가 없어요.</p></div>`;
  }

  const window = getTimelineWindow(workItems);
  const hourWidth = 78;
  const totalWidth = Math.max((window.end - window.start) / 60 * hourWidth, 720);
  const hourCells = window.hours.map((minute) => `<span style="width:${hourWidth}px">${minutesToTimelineLabel(minute)}</span>`).join('');
  const desktopRows = workItems.map((item) => {
    const myClass = state.myName && item.name === state.myName ? 'is-my-row' : '';
    const left = ((item.start - window.start) / (window.end - window.start)) * totalWidth;
    const width = Math.max(((item.end - item.start) / (window.end - window.start)) * totalWidth, 56);
    return `
      <div class="timeline-row ${item.isUncertain ? 'uncertain' : ''} ${myClass}">
        <div class="timeline-person"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.code)}</small></div>
        <div class="timeline-track" style="width:${totalWidth}px">
          <span class="timeline-bar ${item.isUncertain ? 'uncertain' : ''}" style="left:${left}px;width:${width}px">
            <strong>${escapeHtml(item.code)}</strong><small>${item.startLabel}~${item.endLabel}</small>
          </span>
        </div>
      </div>`;
  }).join('');

  const range = Math.max(window.end - window.start, 60);
  const startGroups = new Map();
  workItems.forEach((item) => {
    const key = item.startLabel;
    if (!startGroups.has(key)) startGroups.set(key, []);
    startGroups.get(key).push(item);
  });
  const startEntries = Array.from(startGroups.entries());
  const startChips = startEntries.slice(0, 3).map(([time, items]) => {
    const first = items[0];
    const extra = items.length > 1 ? ` 외 ${items.length - 1}명` : '';
    return `<span class="mobile-start-chip"><b>${escapeHtml(time)}</b><em>${escapeHtml(first.name)}${extra}</em></span>`;
  }).join('');
  const hiddenStartCount = Math.max(startEntries.length - 3, 0);
  const startChipSummary = hiddenStartCount ? `<span class="mobile-start-chip more"><b>+${hiddenStartCount}</b><em>더보기</em></span>` : '';

  const mobileRows = workItems.map((item) => {
    const myClass = state.myName && item.name === state.myName ? 'is-my-row' : '';
    const toneClass = getTimelineToneClass(item.code);
    const left = Math.max(0, ((item.start - window.start) / range) * 100);
    const width = Math.min(100 - left, Math.max(((item.end - item.start) / range) * 100, 10));
    return `
      <article class="mobile-simple-row ${toneClass} ${myClass} ${item.isUncertain ? 'uncertain' : ''}">
        <div class="mobile-simple-time"><strong>${escapeHtml(item.startLabel)}</strong><small>${escapeHtml(item.endLabel)} 퇴근</small></div>
        <div class="mobile-simple-main">
          <div class="mobile-simple-person"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.code)}</span></div>
          <div class="mobile-simple-track" aria-hidden="true">
            <i style="left:${left}%;width:${width}%"></i>
          </div>
        </div>
      </article>`;
  }).join('');

  const mobileRowsWrap = workItems.length ? `
    <div class="mobile-simple-timeline">
      <div class="mobile-start-chip-row">${startChips}${startChipSummary}</div>
      <div class="mobile-simple-scale"><span>${minutesToTimelineLabel(window.start)}</span><span>${minutesToTimelineLabel(window.end)}</span></div>
      <div class="mobile-simple-list">${mobileRows}</div>
    </div>
  ` : '';

  const offHtml = offPeople.map((p) => `<span class="person-pill ${badgeClass(p.info.type)}">${escapeHtml(p.name)} <small>${escapeHtml(p.code)}</small></span>`).join('') || '<span class="person-pill">없음</span>';
  const noTimeHtml = noTimePeople.map((p) => `<span class="person-pill ${badgeClass(p.info.type)}">${escapeHtml(p.name)} <small>${escapeHtml(p.code)}</small></span>`).join('');

  return `
    <section class="daily-timeline-card">
      <div class="timeline-card-head">
        <div>
          <h4>근무 타임라인</h4>
          <p>출근 시간과 퇴근 시간을 한눈에 확인해요.</p>
        </div>
        <span>근무 ${workItems.length}명 · 피크 ${getPeakCoverage(workItems)}</span>
      </div>
      <div class="daily-timeline-desktop">
        <div class="timeline-scale" style="margin-left:132px;width:${totalWidth}px">${hourCells}</div>
        <div class="timeline-body">${desktopRows || '<p>시간 정보가 있는 근무자가 없어요.</p>'}</div>
      </div>
      <div class="daily-timeline-mobile">${mobileRowsWrap || '<p>시간 정보가 있는 근무자가 없어요.</p>'}</div>
      ${noTimeHtml ? `<div class="timeline-sub-section"><h4>시간 정보 없는 코드</h4><div class="roster-pill-wrap">${noTimeHtml}</div></div>` : ''}
      <div class="timeline-sub-section timeline-off-section"><h4>휴무/연차 ${offPeople.length}명</h4><div class="roster-pill-wrap">${offHtml}</div></div>
    </section>
  `;
}


function getCurrentMemoText() {
  return String(state.memo?.text || '').trim();
}

function compactText(value, maxLength = 60) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getMonthlyWorkStats(person = getMyPerson()) {
  const rows = person ? getScheduleRowsForPerson(person) : [];
  const workRows = rows.filter((row) => row.type === 'work');
  const offRows = rows.filter((row) => row.type === 'off');
  const leaveRows = rows.filter((row) => row.type === 'leave');
  const codeCounts = workRows.reduce((acc, row) => {
    const code = row.code || '-';
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});
  const mostCode = Object.entries(codeCounts).sort((a, b) => b[1] - a[1])[0];
  const startTimes = workRows.map((row) => row.start).filter(Boolean).sort();
  const nightCount = workRows.filter((row) => {
    const start = timeToMinutes(row.start);
    const end = timeToMinutes(row.end);
    return start !== null && (start >= 21 * 60 || (end !== null && end <= 9 * 60));
  }).length;
  return {
    workCount: workRows.length,
    offCount: offRows.length,
    leaveCount: leaveRows.length,
    mostCode: mostCode ? `${mostCode[0]} ${mostCode[1]}회` : '',
    earliest: startTimes[0] || '-',
    nightCount,
    summaryText: `근무 ${workRows.length}일 · 휴무 ${offRows.length}일 · 연차 ${leaveRows.length}일 · 야간 ${nightCount}일`,
  };
}

function getTeamDaySummary(day) {
  const roster = getDayRoster(day);
  const workNames = Object.values(roster.byStart).flat().map((p) => p.name);
  return { roster, workNames, offNames: roster.offPeople.map((p) => p.name) };
}

function getCoworkersForDay(day, targetName = state.myName) {
  const target = state.people.find((person) => person.name === targetName);
  if (!target) return { sameStart: [], overlap: [], targetCode: '', targetInfo: { type: 'empty' } };
  const targetCode = target.schedules?.[day - 1] || '';
  const targetInfo = getCodeInfo(targetCode);
  const targetStart = timeToMinutes(targetInfo.start);
  let targetEnd = timeToMinutes(targetInfo.end);
  if (targetStart === null || targetEnd === null || ['off', 'leave', 'empty'].includes(targetInfo.type)) {
    return { sameStart: [], overlap: [], targetCode, targetInfo };
  }
  if (targetEnd <= targetStart) targetEnd += 1440;
  const sameStart = [];
  const overlap = [];
  state.people.filter((person) => person.name && person.name !== targetName).forEach((person) => {
    const code = person.schedules?.[day - 1] || '';
    const info = getCodeInfo(code);
    let start = timeToMinutes(info.start);
    let end = timeToMinutes(info.end);
    if (start === null || end === null || ['off', 'leave', 'empty'].includes(info.type)) return;
    if (end <= start) end += 1440;
    const overlaps = Math.max(targetStart, start) < Math.min(targetEnd, end);
    const item = { name: person.name, code, info, start, end };
    if (info.start === targetInfo.start) sameStart.push(item);
    else if (overlaps) overlap.push(item);
  });
  return { sameStart, overlap, targetCode, targetInfo };
}

function renderCoworkersCard(day) {
  const coworkers = getCoworkersForDay(day);
  const sameHtml = coworkers.sameStart.map((p) => `<span class="person-pill">${escapeHtml(p.name)} <small>${escapeHtml(p.code)}</small></span>`).join('');
  const overlapHtml = coworkers.overlap.map((p) => `<span class="person-pill muted">${escapeHtml(p.name)} <small>${escapeHtml(p.code)}</small></span>`).join('');
  if (!state.myName) {
    return `<section class="info-card coworker-card"><h4>같이 근무하는 사람</h4><p>내 이름을 선택하면 같은 시간대에 근무하는 사람을 보여줘요.</p></section>`;
  }
  if (!coworkers.targetCode || ['off', 'leave', 'empty'].includes(coworkers.targetInfo.type)) {
    return `<section class="info-card coworker-card"><h4>같이 근무하는 사람</h4><p>${escapeHtml(state.myName)}님은 선택일에 근무 시간이 없어요.</p></section>`;
  }
  return `
    <section class="info-card coworker-card">
      <h4>같이 근무하는 사람</h4>
      <p>${escapeHtml(state.myName)} · ${escapeHtml(coworkers.targetCode)} ${formatTime(coworkers.targetInfo) || coworkers.targetInfo.label}</p>
      <div class="coworker-group"><strong>같은 출근</strong><div class="roster-pill-wrap">${sameHtml || '<span class="person-pill">없음</span>'}</div></div>
      <div class="coworker-group"><strong>시간 겹침</strong><div class="roster-pill-wrap">${overlapHtml || '<span class="person-pill muted">없음</span>'}</div></div>
    </section>
  `;
}


function getDailyCoworkerSummary(day) {
  const coworkers = getCoworkersForDay(day);
  if (!state.myName) {
    return {
      main: '이름 선택 필요',
      sub: '보기 기준에서 내 이름을 골라 주세요.',
    };
  }
  if (!coworkers.targetCode || ['off', 'leave', 'empty'].includes(coworkers.targetInfo.type)) {
    return {
      main: '같이 근무 없음',
      sub: '선택일에 근무 시간이 없는 일정이에요.',
    };
  }
  const sameNames = coworkers.sameStart.map((p) => p.name);
  const overlapNames = coworkers.overlap.map((p) => p.name);
  const sameText = sameNames.length ? `${sameNames.slice(0, 2).join(', ')}${sameNames.length > 2 ? ` 외 ${sameNames.length - 2}명` : ''}` : '같은 출근 없음';
  const overlapText = overlapNames.length ? `겹침 ${overlapNames.slice(0, 2).join(', ')}${overlapNames.length > 2 ? ` 외 ${overlapNames.length - 2}명` : ''}` : '시간 겹침 없음';
  return {
    main: sameText,
    sub: overlapText,
  };
}

function renderDailyInsightCard(day, timeline, roster) {
  const coworkers = getCoworkersForDay(day);
  const peakText = getPeakCoverage(timeline.workItems);
  const coworkerCount = coworkers.sameStart.length + coworkers.overlap.length;
  const coworkerText = !state.myName
    ? '이름 선택'
    : (!coworkers.targetCode || ['off', 'leave', 'empty'].includes(coworkers.targetInfo.type))
      ? '근무 없음'
      : coworkerCount ? `${coworkerCount}명` : '없음';
  const coworkerSub = !state.myName
    ? '내 이름을 고르면 보여줄게.'
    : (!coworkers.targetCode || ['off', 'leave', 'empty'].includes(coworkers.targetInfo.type))
      ? '선택한 날 기준이야.'
      : coworkerCount ? `같은 출근 ${coworkers.sameStart.length}명` : '겹치는 근무자 없음';
  return `
    <div class="info-card daily-insight-card daily-insight-card-simple daily-summary-polished-card">
      <div class="daily-polished-head">
        <div>
          <span class="daily-card-eyebrow">TODAY</span>
          <h4>오늘 요약</h4>
        </div>
        <span class="daily-count-chip">${timeline.workItems.length}명 근무</span>
      </div>
      <div class="daily-insight-total-row">
        <span>휴무/연차</span>
        <strong>${timeline.offPeople.length}명</strong>
        <small>${roster.earliest ? `첫 출근 ${roster.earliest}` : '출근 정보 없음'}</small>
      </div>
      <div class="daily-insight-simple-list">
        <div class="daily-insight-simple-row highlight">
          <span>집중 시간</span>
          <strong>${escapeHtml(peakText)}</strong>
        </div>
        <div class="daily-insight-simple-row muted">
          <span>같이 근무</span>
          <strong>${escapeHtml(coworkerText)}</strong>
          <small>${escapeHtml(coworkerSub)}</small>
        </div>
      </div>
    </div>
  `;
}

function renderSelectedDayDetail(day = getSelectedRosterDay()) {
  const person = getMyPerson();
  const code = person?.schedules?.[day - 1] || '';
  const info = getCodeInfo(code);
  const { roster, workNames, offNames } = getTeamDaySummary(day);
  const coworker = getCoworkersForDay(day);
  const sameNames = coworker.sameStart.map((p) => `${p.name} ${p.code}`).join(', ') || '없음';
  const overlapNames = coworker.overlap.map((p) => `${p.name} ${p.code}`).join(', ') || '없음';
  const workGroups = Object.entries(roster.byStart).sort(([a], [b]) => a.localeCompare(b)).map(([time, people]) => `
    <div class="day-detail-group"><strong>${time}</strong><span>${people.map((p) => `${escapeHtml(p.name)} ${escapeHtml(p.code)}`).join(', ')}</span></div>
  `).join('') || '<p>출근자가 없어요.</p>';
  return `
    <section class="day-detail-card">
      <div class="day-detail-head">
        <div><h4>${state.month}/${day}(${dayNames[getDateObj(day).getDay()]}) 상세 보기</h4><p>월간에서 날짜를 누르면 이 영역이 바뀝니다.</p></div>
        <button class="secondary-btn go-daily-day" data-go-daily-day="${day}" type="button">일간 타임라인 보기</button>
      </div>
      <div class="day-detail-grid">
        <div><span>내 일정</span><strong>${escapeHtml(code || '-')}</strong><small>${escapeHtml(formatTime(info) || info.label || '시간 정보 없음')}</small></div>
        <div><span>출근자</span><strong>${workNames.length}명</strong><small>${escapeHtml(workNames.join(', ') || '없음')}</small></div>
        <div><span>휴무/연차</span><strong>${offNames.length}명</strong><small>${escapeHtml(offNames.join(', ') || '없음')}</small></div>
      </div>
      <div class="day-detail-split">
        <div><h5>출근 시간별</h5>${workGroups}</div>
        <div><h5>같이 근무</h5><p><strong>같은 출근</strong> ${escapeHtml(sameNames)}</p><p><strong>시간 겹침</strong> ${escapeHtml(overlapNames)}</p></div>
      </div>
    </section>
  `;
}

function renderTeamOffOnlySection() {
  const day = getSelectedRosterDay();
  const roster = getDayRoster(day);
  const days = daysInMonth(state.year, state.month);
  const monthly = [];
  for (let d = 1; d <= days; d++) {
    const offPeople = getDayRoster(d).offPeople;
    if (offPeople.length) monthly.push({ day: d, offPeople });
  }
  return `
    <section class="team-off-card">
      <div class="section-title compact-title"><div><p>TEAM OFF</p><h3>휴무자만 보기</h3></div><span>${state.month}/${day} 기준 ${roster.offPeople.length}명</span></div>
      <div class="roster-pill-wrap off-only-selected">
        ${roster.offPeople.length ? roster.offPeople.map((p) => `<span class="person-pill ${badgeClass(p.info.type)}">${escapeHtml(p.name)} <small>${escapeHtml(p.code)}</small></span>`).join('') : '<span class="person-pill">선택일 휴무자가 없어요.</span>'}
      </div>
      <details class="off-only-details">
        <summary>이번 달 휴무자 전체 보기</summary>
        <div class="off-only-month-list">
          ${monthly.map((item) => `<button class="off-only-day" data-pick-day="${item.day}"><strong>${state.month}/${item.day}</strong><span>${item.offPeople.map((p) => `${escapeHtml(p.name)} ${escapeHtml(p.code)}`).join(', ')}</span></button>`).join('') || '<p>이번 달 휴무자가 없어요.</p>'}
        </div>
      </details>
    </section>
  `;
}

function renderDailyDateSelector(currentDay) {
  const totalDays = daysInMonth(state.year, state.month);
  const currentDateValue = `${state.year}-${String(state.month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const minDate = `${state.year}-${String(state.month).padStart(2, '0')}-01`;
  const maxDate = `${state.year}-${String(state.month).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`;
  const dayButtons = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const date = getDateObj(day);
    const dayName = dayNames[date.getDay()];
    const isSelected = day === currentDay;
    const weekendClass = date.getDay() === 0 ? 'sun' : date.getDay() === 6 ? 'sat' : '';
    return `<button class="daily-day-chip ${isSelected ? 'active' : ''} ${weekendClass}" data-pick-day="${day}" type="button"><strong>${day}</strong><span>${dayName}</span></button>`;
  }).join('');
  return `
    <section class="daily-date-selector" aria-label="일간 날짜 선택">
      <div class="daily-date-selector-head">
        <div>
          <span>날짜 선택</span>
          <strong>보고 싶은 날을 골라봐</strong>
        </div>
        <div class="daily-date-control">
          <button class="daily-date-step" data-daily-step="-1" type="button" ${currentDay <= 1 ? 'disabled' : ''}>‹</button>
          <input class="daily-date-input" data-daily-date-input type="date" min="${minDate}" max="${maxDate}" value="${currentDateValue}" aria-label="일간 날짜 직접 선택" />
          <button class="daily-date-step" data-daily-step="1" type="button" ${currentDay >= totalDays ? 'disabled' : ''}>›</button>
        </div>
      </div>
      <div class="daily-day-strip" aria-label="이번 달 날짜 바로 선택">
        ${dayButtons}
      </div>
    </section>
  `;
}

function renderDaily() {
  const person = getMyPerson();
  const selected = new Date(state.selectedDate || Date.now());
  const day = isSameMonth(selected) ? selected.getDate() : 1;
  const code = person?.schedules[day - 1] || '';
  const info = getCodeInfo(code);
  const timeText = formatTime(info) || '시간 정보 없음';
  const roster = getDayRoster(day);
  const timeline = getTimelineItems(day);
  const dailyMain = renderDailyTimeline(day);
  return `
    <div class="view-title with-actions daily-mobile-head">
      <div>
        <h3>${state.month}/${day}(${dayNames[getDateObj(day).getDay()]}) 일간 보기</h3>
        <p>선택한 날의 근무 흐름을 한눈에 확인해요.</p>
      </div>
      <div class="daily-title-actions">${renderPersonPicker('기준')}</div>
    </div>
    ${renderDailyDateSelector(day)}
    <div class="card-grid daily-summary-grid daily-summary-grid-compact daily-summary-polished-grid">
      <div class="info-card daily-my-schedule-card daily-my-schedule-simple daily-summary-polished-card">
        <div class="daily-polished-head">
          <div>
            <span class="daily-card-eyebrow">MY SHIFT</span>
            <h4>내 스케줄</h4>
          </div>
          <span class="badge daily-code-chip ${badgeClass(info.type)}">${code || '-'}</span>
        </div>
        <div class="daily-my-simple-primary daily-my-polished-body">
          <span class="daily-my-simple-time">${escapeHtml(timeText)}</span>
          <strong class="daily-my-simple-name">${escapeHtml(state.myName || '이름 미입력')}</strong>
        </div>
        <div class="daily-my-polished-foot">
          <span class="daily-my-simple-state">${escapeHtml(info.label || '일정 없음')}</span>
          <small>${escapeHtml(dayNames[getDateObj(day).getDay()])}요일 기준</small>
        </div>
      </div>
      ${renderDailyInsightCard(day, timeline, roster)}
    </div>
    ${dailyMain}
  `;
}

function getSelectedRosterDay() {
  const selected = new Date(state.selectedDate || Date.now());
  return isSameMonth(selected) ? selected.getDate() : 1;
}

function renderWeekly() {
  const person = getMyPerson();
  const selected = new Date(state.selectedDate || `${state.year}-${String(state.month).padStart(2, '0')}-01`);
  const baseDay = isSameMonth(selected) ? selected.getDate() : 1;
  const baseDate = getDateObj(baseDay);
  const mondayOffset = (baseDate.getDay() + 6) % 7;
  const mondayDate = new Date(baseDate);
  mondayDate.setDate(baseDate.getDate() - mondayOffset);

  const rows = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + i);
    const inMonth = date.getFullYear() === state.year && date.getMonth() + 1 === state.month;
    const day = date.getDate();
    const code = inMonth ? (person?.schedules[day - 1] || '') : '';
    const info = inMonth ? getCodeInfo(code) : { label: '다른 달', start: '', end: '', type: 'empty' };
    return { day, date, inMonth, code, info };
  });

  const inMonthRows = rows.filter((r) => r.inMonth);
  const workCount = inMonthRows.filter((r) => r.info.type === 'work').length;
  const offCount = inMonthRows.filter((r) => ['off', 'leave'].includes(r.info.type)).length;
  const earliest = inMonthRows.filter((r) => r.info.type === 'work' && r.info.start).map((r) => r.info.start).sort()[0] || '-';
  const startLabel = `${mondayDate.getMonth() + 1}/${mondayDate.getDate()}`;
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);
  const endLabel = `${sundayDate.getMonth() + 1}/${sundayDate.getDate()}`;

  return `
    <div class="view-title week-title week-title-with-nav">
      <div>
        <h3>주간 보기</h3>
        <p>${startLabel} ~ ${endLabel} 기준 · 선택일 ${state.month}/${baseDay}</p>
      </div>
      <div class="week-nav">
        ${renderPersonPicker()}
        <div class="week-nav-inline">
          <button class="ghost-btn week-nav-btn" data-week-shift="-1" type="button">‹ 저번주</button>
          <span>근무 ${workCount}일 · 휴무/연차 ${offCount}일</span>
          <button class="ghost-btn week-nav-btn" data-week-shift="1" type="button">다음주 ›</button>
        </div>
      </div>
    </div>
    <div class="mini-stat-row weekly-stat-row">
      <div class="mini-stat week-summary-block work"><span>근무</span><strong>${workCount}일</strong></div>
      <div class="mini-stat week-summary-block off"><span>휴무/연차</span><strong>${offCount}일</strong></div>
      <div class="mini-stat week-summary-block neutral"><span>가장 이른 출근</span><strong>${earliest}</strong></div>
    </div>
    <div class="week-grid improved-week-grid boxed-week-grid">
      ${rows.map(({ day, date, inMonth, code, info }) => {
        const dayLabel = `${date.getMonth() + 1}/${day}`;
        const selectedClass = inMonth && day === baseDay ? 'selected-week-day' : '';
        const disabled = inMonth ? '' : 'disabled';
        const dataAttr = inMonth ? `data-pick-day="${day}"` : '';
        return `
          <button class="week-day-card ${badgeClass(info.type)} ${selectedClass} ${inMonth ? '' : 'other-month'}" ${dataAttr} ${disabled}>
            <span class="week-day-name">${dayNames[date.getDay()]}</span>
            <strong>${dayLabel}</strong>
            <em class="badge week-code-pill ${badgeClass(info.type)}">${inMonth ? (code || '-') : '-'}</em>
            <small class="week-time-text">${inMonth ? (formatTime(info) || info.label) : '이번 달 외'}</small>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderMonthly() {
  const person = getMyPerson();
  const days = daysInMonth(state.year, state.month);
  const first = new Date(state.year, state.month - 1, 1).getDay();
  const selected = new Date(state.selectedDate || Date.now());
  const selectedDay = isSameMonth(selected) ? selected.getDate() : 0;
  const rows = person ? getScheduleRowsForPerson(person) : [];
  const workCount = rows.filter((row) => row.type === 'work').length;
  const offCount = rows.filter((row) => ['off', 'leave'].includes(row.type)).length;
  const leaveCount = rows.filter((row) => row.type === 'leave').length;
  let html = `
    <div class="view-title month-title">
      <div>
        <h3>${state.year}년 ${state.month}월 월간</h3>
        <p>날짜를 누르면 일간 보기로 이동해요.</p>
      </div>
      <div class="view-title-side">${renderPersonPicker()}<span>근무 ${workCount}일 · 휴무 ${offCount - leaveCount}일 · 연차 ${leaveCount}일</span></div>
    </div>
    <div class="month-legend">
      <span><i class="legend-dot work"></i>근무</span>
      <span><i class="legend-dot off"></i>휴무</span>
      <span><i class="legend-dot leave"></i>연차</span>
      <span><i class="legend-dot empty"></i>미입력</span>
    </div>
    <div class="monthly-calendar-wrap">
      <div class="calendar refined-calendar improved-month-calendar boxed-month-calendar">`;
  dayNames.forEach((name, index) => html += `<div class="calendar-head ${index === 0 ? 'sun' : index === 6 ? 'sat' : ''}">${name}</div>`);
  for (let i = 0; i < first; i++) html += `<div class="day-cell empty"></div>`;
  for (let day = 1; day <= days; day++) {
    const code = person?.schedules[day - 1] || '';
    const info = getCodeInfo(code);
    const typeClass = badgeClass(info.type);
    const todayClass = day === selectedDay ? 'today' : '';
    const dow = getDateObj(day).getDay();
    const weekendClass = dow === 0 ? 'sun' : dow === 6 ? 'sat' : '';
    html += `
      <button class="day-cell ${typeClass} ${todayClass} ${weekendClass}" data-month-detail-day="${day}">
        <span class="day-number">${day}</span>
        <span class="month-day-main boxed">
          <span class="badge day-code ${typeClass}">${code || '-'}</span>
          <small class="month-time-text">${formatTime(info) || info.label}</small>
        </span>
      </button>`;
  }
  html += '</div></div>';
  return html;
}

function renderDayRoster() {
  const day = getSelectedRosterDay();
  return `<div class="view-title"><h3>${state.month}/${day} 출근 현황</h3></div>${renderRosterBlocks(day)}`;
}

function renderRosterBlocks(day) {
  const roster = getDayRoster(day);
  const workSections = Object.entries(roster.byStart).sort(([a], [b]) => a.localeCompare(b)).map(([time, people]) => `
    <div class="roster-section"><h4>${time} 출근</h4><div class="roster-pill-wrap">${people.map((p) => `<span class="person-pill">${escapeHtml(p.name)} <small>${p.code}</small></span>`).join('')}</div></div>
  `).join('') || '<p>출근자가 없거나 입력된 근무 코드가 없습니다.</p>';
  const off = roster.offPeople.map((p) => `<span class="person-pill">${escapeHtml(p.name)} <small>${p.code}</small></span>`).join('') || '<span class="person-pill">없음</span>';
  return `<div class="info-card roster-card">${workSections}<div class="roster-section"><h4>휴무/연차</h4><div class="roster-pill-wrap">${off}</div></div></div>`;
}

function getSameOffPeopleText(day) {
  const roster = getDayRoster(day);
  const names = roster.offPeople.map((p) => p.name).filter((name) => name && name !== state.myName);
  return names.length ? ` · 같이 쉬는 사람: ${names.join(', ')}` : '';
}

function renderOffDays() {
  const person = getMyPerson();
  if (!state.people.length) {
    return `<div class="empty-archive"><h3>휴무 현황 데이터가 없어요.</h3><p>스케줄 데이터를 입력하면 휴무와 팀 휴무 현황을 한눈에 확인할 수 있어요.</p></div>`;
  }

  const rows = person ? getScheduleRowsForPerson(person).filter((row) => ['off', 'leave'].includes(row.type)) : [];
  const days = daysInMonth(state.year, state.month);
  const today = new Date();
  const selected = new Date(state.selectedDate || `${state.year}-${String(state.month).padStart(2, '0')}-01`);
  const focusDay = today.getFullYear() === state.year && today.getMonth() + 1 === state.month
    ? today.getDate()
    : (isSameMonth(selected) ? selected.getDate() : 1);
  const nextFutureOff = rows.find((row) => row.day >= focusDay) || null;
  const nextOff = nextFutureOff || rows[0] || null;
  const leaveRows = rows.filter((row) => row.type === 'leave');
  const pureOffRows = rows.filter((row) => row.type === 'off');
  const ownerName = getFriendlyScheduleOwnerName() || '선택한 사람';
  const simple = isSimpleTheme();

  const streaks = [];
  rows.forEach((row) => {
    const last = streaks[streaks.length - 1];
    if (last && row.day === last.end.day + 1) {
      last.end = row;
      last.items.push(row);
    } else {
      streaks.push({ start: row, end: row, items: [row] });
    }
  });
  const usefulStreaks = streaks.filter((streak) => streak.items.length >= 2).slice(0, 4);
  const longestStreak = streaks.reduce((max, streak) => Math.max(max, streak.items.length), 0);

  const getPills = (people, emptyText = '없음') => people.length
    ? people.map((p) => `<span class="person-pill ${badgeClass(p.info?.type || 'off')}">${escapeHtml(p.name)} <small>${escapeHtml(p.code || '')}</small></span>`).join('')
    : `<span class="person-pill muted">${emptyText}</span>`;

  const focusRoster = getDayRoster(focusDay);
  const focusLabel = `${state.month}/${focusDay}(${dayNames[getDateObj(focusDay).getDay()]})`;
  const nextOffRoster = nextOff ? getDayRoster(nextOff.day) : { offPeople: [] };
  const sameOffPeople = nextOffRoster.offPeople.filter((p) => !state.myName || p.name.trim() !== state.myName.trim());
  const ddayDiff = nextFutureOff ? Math.max(nextFutureOff.day - focusDay, 0) : null;
  const ddayLabel = nextFutureOff
    ? (ddayDiff === 0 ? 'D-DAY' : `D-${ddayDiff}`)
    : (nextOff ? '이번 달' : '-');
  const nextOffTitle = nextOff
    ? `${nextOff.dateText} ${nextOff.label || '휴무'}`
    : '이번 달 휴무가 없어요';
  const nextOffSub = nextOff
    ? `${nextOff.code} · ${nextOff.label || '휴무'}${nextFutureOff ? '' : ' · 지난 휴무'}`
    : '휴무/연차 데이터가 없어요.';
  const nextOffMessage = simple
    ? (nextOff ? '다음 휴무 정보를 확인해요.' : '이번 달 등록된 휴무가 없어요.')
    : (nextOff
      ? (ddayDiff === 0 ? '오늘은 충전하는 날. 푹 쉬어가기 ☁️' : `쉬는 날까지 조금만 더, ${ownerName} 응원 중 ☁️`)
      : '쉬는 날이 생기면 여기서 바로 챙겨볼게 ☁️');

  const mondayOffset = (getDateObj(focusDay).getDay() + 6) % 7;
  const mondayDate = getDateObj(focusDay);
  mondayDate.setDate(mondayDate.getDate() - mondayOffset);
  const weekRows = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + i);
    const inMonth = date.getFullYear() === state.year && date.getMonth() + 1 === state.month;
    if (!inMonth) return null;
    const day = date.getDate();
    const roster = getDayRoster(day);
    const mine = rows.find((row) => row.day === day) || null;
    return { day, date, roster, mine };
  }).filter(Boolean);
  const weekOffRows = weekRows.filter((item) => item.mine || item.roster.offPeople.length);

  const monthlyOffRows = [];
  for (let d = 1; d <= days; d++) {
    const roster = getDayRoster(d);
    if (roster.offPeople.length) monthlyOffRows.push({ day: d, roster });
  }
  const topOffDays = monthlyOffRows
    .slice()
    .sort((a, b) => b.roster.offPeople.length - a.roster.offPeople.length || a.day - b.day)
    .slice(0, 3);

  const grouped = rows.reduce((acc, row) => {
    const key = row.type === 'leave' ? '연차' : '휴무';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const detailGroups = [
    { key: '휴무', type: 'off', items: grouped['휴무'] || [] },
    { key: '연차', type: 'leave', items: grouped['연차'] || [] },
  ].filter((group) => group.items.length);

  return `
    <div class="view-title offday-title off-wait-title">
      <div>
        <h3>${simple ? '휴무 현황' : '휴무 기다림'}</h3>
        <p>${simple ? '개인 휴무와 팀 휴무를 확인해요.' : '쉬는 날까지 얼마나 남았는지 같이 체크해요.'}</p>
      </div>
      <div class="view-title-side">${renderPersonPicker()}<span>내 휴무 ${rows.length}일</span></div>
    </div>

    <section class="off-next-hero-card ${nextOff ? '' : 'is-empty'}">
      <div class="off-next-hero-copy">
        <span class="off-next-kicker">${simple ? 'NEXT OFF' : '다음 충전일'}</span>
        <h4>다음 휴무까지 <em>${escapeHtml(ddayLabel)}</em></h4>
        <strong>${escapeHtml(nextOffTitle)}</strong>
        <p>${escapeHtml(nextOffSub)}</p>
        <small>${escapeHtml(nextOffMessage)}</small>
      </div>
      ${nextOff ? `<button class="ghost-btn slim-action" data-pick-day="${nextOff.day}" type="button">일간 보기</button>` : ''}
    </section>

    <div class="off-quick-summary-grid">
      <section class="off-quick-card"><span>이번 달 휴무</span><strong>${pureOffRows.length}일</strong><small>DO/PH/SD 등</small></section>
      <section class="off-quick-card leave"><span>연차</span><strong>${leaveRows.length}일</strong><small>AL 기준</small></section>
      <section class="off-quick-card streak"><span>연속 휴무</span><strong>${longestStreak || 0}일</strong><small>${usefulStreaks.length ? '이어 쉬는 구간 있음' : '연속 구간 없음'}</small></section>
    </div>

    <section class="off-dashboard-card next-off-team-card">
      <div class="off-card-head"><span>${simple ? 'TOGETHER' : '같이 쉬는 날'}</span><h4>다음 휴무 같이 쉬는 사람</h4></div>
      <div class="roster-pill-wrap off-dashboard-pills">${nextOff ? getPills(sameOffPeople, '같이 쉬는 사람은 아직 없어요.') : getPills([], '다음 휴무가 없어요.')}</div>
    </section>

    <section class="off-dashboard-card week-off-card compact-week-off-card">
      <div class="off-card-head"><span>WEEK</span><h4>이번 주 휴무</h4></div>
      <div class="off-week-list compact-off-week-list">
        ${weekOffRows.length ? weekOffRows.map((item) => `
          <button class="off-week-day ${item.mine ? 'my-week-off' : ''}" data-pick-day="${item.day}" type="button">
            <strong>${state.month}/${item.day}(${dayNames[item.date.getDay()]})</strong>
            <span>${item.mine ? `내 일정 ${escapeHtml(item.mine.code)} · ${escapeHtml(item.mine.label)}` : `${item.roster.offPeople.length}명 휴무`}</span>
            <small>${item.roster.offPeople.map((p) => `${escapeHtml(p.name)} ${escapeHtml(p.code)}`).join(', ')}</small>
          </button>
        `).join('') : '<p class="offday-empty-note">이번 주 휴무자가 없어요.</p>'}
      </div>
    </section>

    ${usefulStreaks.length ? `
      <section class="off-dashboard-card off-streak-card compact-rest-streak-card">
        <div class="off-card-head"><span>STREAK</span><h4>이어 쉬는 구간</h4></div>
        <div class="off-streak-grid compact-streak-grid">
          ${usefulStreaks.map((streak) => `
            <button class="off-streak-item" data-pick-day="${streak.start.day}" type="button">
              <strong>${streak.start.dateText} ~ ${streak.end.dateText}</strong>
              <span>${streak.items.length}일 연속</span>
              <small>${streak.items.map((item) => item.code).join(' / ')}</small>
            </button>
          `).join('')}
        </div>
      </section>
    ` : ''}

    <section class="off-dashboard-card off-detail-card off-all-list-card">
      <div class="off-card-head"><span>LIST</span><h4>전체 휴무 목록</h4></div>
      <div class="off-all-list-groups">
        ${detailGroups.length ? detailGroups.map((group) => `
          <div class="off-all-list-group ${group.type}">
            <h5>${group.key} <span>${group.items.length}일</span></h5>
            <div class="off-detail-list compact-off-detail-list">
              ${group.items.map((row) => `
                <button class="off-detail-item ${badgeClass(row.type)}" data-pick-day="${row.day}" type="button">
                  <div class="off-detail-main">
                    <strong>${row.dateText}</strong>
                    <small>${getSameOffPeopleText(row.day) || '같이 쉬는 사람 없음'}</small>
                  </div>
                  <span class="off-detail-code">${row.code}</span>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('') : '<p class="offday-empty-note">이번 달 내 휴무/연차가 아직 없어요.</p>'}
      </div>
    </section>

    <details class="off-dashboard-card off-team-analysis-card">
      <summary>
        <div><span>TEAM</span><strong>팀 휴무 분석</strong></div>
        <em>펼쳐보기</em>
      </summary>
      <div class="off-team-analysis-grid">
        <section>
          <div class="off-card-head"><span>TODAY</span><h4>${focusLabel} 휴무자</h4></div>
          <div class="roster-pill-wrap off-dashboard-pills">${getPills(focusRoster.offPeople, '선택일 휴무자가 없어요.')}</div>
          <button class="ghost-btn slim-action" data-pick-day="${focusDay}" type="button">일간 보기로 이동</button>
        </section>
        <section>
          <div class="off-card-head"><span>MONTH</span><h4>휴무 많은 날</h4></div>
          <div class="off-top-list">
            ${topOffDays.length ? topOffDays.map((item, index) => `
              <button class="off-top-day" data-pick-day="${item.day}" type="button">
                <em>${index + 1}</em>
                <strong>${state.month}/${item.day}</strong>
                <span>${item.roster.offPeople.length}명</span>
                <small>${item.roster.offPeople.map((p) => escapeHtml(p.name)).join(', ')}</small>
              </button>
            `).join('') : '<p class="offday-empty-note">이번 달 휴무자가 없어요.</p>'}
          </div>
        </section>
      </div>
    </details>
  `;
}
function makeRosterShareText(template = state.shareTemplate || 'detailed') {
  const day = getSelectedRosterDay();
  const roster = getDayRoster(day);
  const sortedEntries = Object.entries(roster.byStart).sort(([a], [b]) => a.localeCompare(b));
  const offNames = roster.offPeople.map((p) => p.name).join(', ') || '없음';
  if (template === 'simple') {
    const workNames = sortedEntries.flatMap(([, people]) => people.map((p) => p.name)).join(', ') || '없음';
    return `[${state.month}/${day} 출근 현황]\n출근: ${workNames}\n휴무/연차: ${offNames}`;
  }
  if (template === 'names') {
    const workNames = sortedEntries.flatMap(([, people]) => people.map((p) => p.name)).join(', ') || '없음';
    return `[${state.month}/${day} 인원 요약]\n근무자: ${workNames}\n휴무자: ${offNames}`;
  }
  const rosterText = sortedEntries
    .map(([time, people]) => `${time} 출근: ${people.map((p) => p.name).join(', ')}`)
    .join('\n');
  return `[${state.month}/${day} 출근 현황]\n${rosterText || '출근자 없음'}\n휴무/연차: ${offNames}`;
}

function makePersonalScheduleText() {
  const person = getMyPerson();
  if (!person) return '내 이름을 입력하고, 해당 이름의 스케줄을 먼저 입력해 주세요.';
  const rows = getScheduleRowsForPerson(person);
  const offRows = rows.filter((row) => ['off', 'leave'].includes(row.type));
  const main = rows.map((row) => `${row.dateText} ${row.code || '-'} ${formatTime(row) || row.label}`).join('\n');
  const off = offRows.map((row) => row.dateText).join(', ') || '없음';
  return `[${state.year}년 ${state.month}월 ${state.myName} 스케줄]\n\n${main}\n\n[휴무일]\n${off}`;
}

function renderShare() {
  const rosterText = makeRosterShareText(state.shareTemplate || 'detailed');
  const personalText = makePersonalScheduleText();
  return `
    <div class="view-title"><div><h3>공유·엑셀</h3><p>선택일 기준 출근 현황을 바로 복사하고, 엑셀에는 전체 데이터와 출근 현황이 함께 저장됩니다.</p></div></div>
    <div class="template-toggle">
      <button class="ghost-btn ${state.shareTemplate === 'detailed' ? 'active' : ''}" data-share-template="detailed" type="button">상세형</button>
      <button class="ghost-btn ${state.shareTemplate === 'simple' ? 'active' : ''}" data-share-template="simple" type="button">간단형</button>
      <button class="ghost-btn ${state.shareTemplate === 'names' ? 'active' : ''}" data-share-template="names" type="button">이름만</button>
    </div>
    <div class="share-layout">
      <section class="share-card primary-share">
        <h4>출근 현황 공유문</h4>
        <textarea id="shareText" class="share-box roster-share-box" readonly>${escapeHtml(rosterText)}</textarea>
        <button id="copyShareButton" class="primary-btn">출근 현황 복사</button>
      </section>
      <section class="share-card">
        <h4>내 월간 스케줄 백업</h4>
        <textarea id="personalShareText" class="share-box compact-share-box" readonly>${escapeHtml(personalText)}</textarea>
        <button id="copyPersonalShareButton" class="secondary-btn">내 스케줄 복사</button>
      </section>
    </div>
    <div class="action-row" style="margin-top:12px;">
      <button id="downloadExcelButton" class="secondary-btn">엑셀 다운로드</button>
    </div>
  `;
}

function makeShareText() {
  return makeRosterShareText(state.shareTemplate || 'detailed');
}

function getMonthPeopleCount(savedMonth) {
  return savedMonth?.people?.filter((p) => String(p.name || '').trim()).length || 0;
}

function getReviewBadge(review, peopleCount) {
  if (review?.status === 'done') return { label: '검수 완료', type: 'review-done' };
  if (review?.status === 'needs_review') return { label: '재검수 필요', type: 'review-warn' };
  if (peopleCount) return { label: '검수 전', type: 'review-pending' };
  return null;
}

function getMonthIssueCount(savedMonth, year, month) {
  if (!savedMonth?.people?.length) return null;
  try {
    return validatePeopleData(savedMonth.people, year, month).length;
  } catch (error) {
    console.warn('월별 상태 검사 실패', error);
    return null;
  }
}

function getArchiveStatusBadges(record) {
  const savedMonth = state.monthStore?.[record.key];
  const isCurrent = record.key === monthKey();
  const currentPeopleCount = isCurrent ? state.people.filter((p) => String(p.name || '').trim()).length : 0;
  const peopleCount = getMonthPeopleCount(savedMonth) || currentPeopleCount;
  const imageExists = Boolean(record.imageName || record.thumbData || (isCurrent && state.imageData));
  const issueCount = getMonthIssueCount(savedMonth || (isCurrent ? { people: state.people } : null), record.year, record.month);
  const reviewBadge = getReviewBadge(savedMonth?.review, peopleCount);
  const badges = [
    { label: imageExists ? '이미지 있음' : '이미지 없음', type: imageExists ? 'image-ok' : 'image-empty' },
    peopleCount ? { label: `데이터 ${peopleCount}명`, type: 'data-ok' } : { label: record.cloud ? '클라우드 저장됨' : '데이터 없음', type: record.cloud ? 'cloud-ok' : 'data-empty' },
  ];
  if (reviewBadge) badges.push(reviewBadge);
  if (issueCount !== null && peopleCount) {
    badges.push(issueCount ? { label: `확인 ${issueCount}개`, type: 'issue-warn' } : { label: '문제 없음', type: 'issue-ok' });
  }
  if (isCurrent && hasUnsavedCloudChanges) {
    badges.push({ label: '저장 필요', type: 'save-dirty' });
  } else if (record.cloud) {
    badges.push({ label: '클라우드 저장', type: 'save-cloud' });
  } else {
    badges.push({ label: '브라우저 보관', type: 'save-local' });
  }
  return badges;
}

function renderArchive() {
  const records = state.archiveMeta || [];
  if (!records.length) {
    return `
      <div class="empty-archive">
        <h3>아직 저장된 근무표 이미지가 없어요.</h3>
        <p>설정·이미지 페이지에서 기준 연도와 월을 맞춘 뒤 이미지를 업로드하면 5월, 6월처럼 월별로 쌓입니다.</p>
      </div>
    `;
  }
  return `
    <div class="archive-grid">
      ${records.map((record) => {
        const savedMonth = state.monthStore?.[record.key];
        const statusBadges = getArchiveStatusBadges(record);
        const activeClass = record.key === monthKey() ? 'active' : '';
        return `
          <article class="archive-card ${activeClass}">
            <div class="archive-thumb">${record.thumbData ? `<img src="${record.thumbData}" alt="${record.key} 근무표" />` : '<span>이미지</span>'}</div>
            <div class="archive-body">
              <strong>${record.year}년 ${record.month}월</strong>
              <span>${escapeHtml(record.imageName || '스케줄표 이미지')}</span>
              <div class="archive-status">${statusBadges.map((badge) => `<em class="status-${escapeHtml(badge.type)}">${escapeHtml(badge.label)}</em>`).join('')}</div><small>저장 ${formatSavedDate(record.updatedAt)}</small>
            </div>
            <div class="archive-actions">
              <button class="primary-btn load-month" data-month-key="${record.key}">불러오기</button>
              <button class="ghost-btn delete-month-image" data-month-key="${record.key}">이미지 삭제</button>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function formatSavedDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
}

function renderSettings() {
  const typeOptions = [
    ['work', '근무'],
    ['off', '휴무'],
    ['leave', '연차'],
    ['unknown', '기타/미정'],
  ];
  const rows = Object.entries(state.codes).map(([code, info]) => `
    <div class="code-editor-row compact-code-card">
      <label><span>코드</span><input data-code-key="${code}" value="${escapeHtml(code)}" /></label>
      <label><span>의미</span><input data-code-prop="label" data-code="${code}" value="${escapeHtml(info.label)}" placeholder="의미" /></label>
      <label><span>유형</span><select data-code-prop="type" data-code="${code}">${typeOptions.map(([value, label]) => `<option value="${value}" ${deriveCodeType(code, info) === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <label><span>출근</span><input data-code-prop="start" data-code="${code}" value="${escapeHtml(info.start)}" placeholder="출근" /></label>
      <label><span>퇴근</span><input data-code-prop="end" data-code="${code}" value="${escapeHtml(info.end)}" placeholder="퇴근" /></label>
      <button class="ghost-btn delete-code" data-code="${code}" type="button">삭제</button>
    </div>
  `).join('');
  return `
    <div class="view-title settings-title">
      <div>
        <h3>근무 코드 설정</h3>
        <p>코드별 의미, 시간, 유형을 카드 형태로 관리합니다. 기본 코드 누락은 앱이 자동으로 보정해요.</p>
      </div>
      <div class="action-row settings-main-actions">
        <button id="addCodeButton" class="secondary-btn">코드 추가</button>
        <button id="saveCodesButton" class="secondary-btn">저장</button>
      </div>
    </div>
    <div class="settings-helper-grid">
      <section class="data-guide-card default-names-card">
        <h3>기본 직원 목록</h3>
        <p>OCR 보조와 사람 추가 시 기본으로 사용할 이름 목록입니다. 한 줄 또는 공백으로 구분해 입력해 주세요.</p>
        <textarea id="defaultNamesInput" class="share-box" rows="4">${escapeHtml(getDefaultNamesText())}</textarea>
        <button id="saveDefaultNamesButton" class="secondary-btn" type="button">기본 이름 저장</button>
      </section>
      <section class="data-guide-card code-table-card">
        <h3>코드표 상태</h3>
        <p>미등록 코드가 생기면 앱이 먼저 기본 코드 누락을 자동으로 보정합니다. 자세한 확인은 필요할 때만 고급 설정을 열어 주세요.</p>
        <div id="codeCheckStatus" class="code-check-status">
          <span>기본 코드는 자동 보정됩니다. 코드 수정 후에는 저장 버튼을 눌러 반영해 주세요.</span>
        </div>
        <details class="advanced-code-details">
          <summary>고급 설정 열기</summary>
          <div class="action-row code-table-actions advanced-code-actions">
            <button id="checkLocalCodesButton" class="secondary-btn" type="button">현재 코드 확인</button>
            <button id="checkCloudCodesButton" class="secondary-btn" type="button">저장된 코드 확인</button>
            <button id="resetDefaultCodesButton" class="ghost-btn" type="button">기본값으로 되돌리기</button>
          </div>
          <p class="helper-text">현재 코드 확인은 지금 앱에서 사용 중인 코드표, 저장된 코드 확인은 Supabase에 저장된 코드표를 비교합니다.</p>
        </details>
      </section>
      <div class="notice"><strong>유형 규칙</strong><span>근무/휴무/연차를 직접 지정할 수 있어요. 출근·퇴근 시간이 있는 코드는 기본적으로 근무로 인식됩니다. OC는 사내행사, MH는 병가로 기본 등록됩니다.</span></div>
    </div>
    <div id="codeEditor" class="code-editor-grid">${rows}</div>
  `;
}

function renderHelp() {
  const status = getWorkflowStepStatus();
  const hasIssueText = status.issueCount ? `확인 항목 ${status.issueCount}개` : '확인 항목 없음';
  const reviewLabel = status.reviewStatus === 'done' ? '검수 완료' : status.reviewStatus === 'needs-review' ? '재검수 필요' : '검수 전';
  return `
    <div class="view-title help-title">
      <div>
        <p>HELP</p>
        <h3>사용법 · 정리 가이드</h3>
        <p>평소에는 아래 4단계만 따라가면 돼요. 고급 기능은 문제가 생겼을 때만 확인하면 됩니다.</p>
      </div>
      <div class="help-status-mini">
        <span>${status.hasImage ? '이미지 있음' : '이미지 없음'}</span>
        <span>${status.hasPeople ? `데이터 ${(state.people || []).filter((p) => p.name).length}명` : '데이터 없음'}</span>
        <span>${escapeHtml(reviewLabel)}</span>
        <span>${escapeHtml(hasIssueText)}</span>
      </div>
    </div>

    <section class="help-flow-panel">
      <article>
        <b>1</b>
        <h4>시작하기</h4>
        <p>기준 연도/월, 내 이름을 정하고 원본 근무표 이미지를 업로드합니다.</p>
        <button class="ghost-btn" data-help-page="setup" type="button">시작하기로 이동</button>
      </article>
      <article>
        <b>2</b>
        <h4>데이터 입력</h4>
        <p>CSV를 붙여넣거나 파일로 업로드합니다.</p>
        <button class="ghost-btn" data-help-page="dataInput" type="button">데이터 입력으로 이동</button>
      </article>
      <article>
        <b>3</b>
        <h4>데이터 확인</h4>
        <p>원본과 입력 데이터를 비교하고 필요한 부분을 수정합니다.</p>
        <button class="ghost-btn" data-help-page="editor" type="button">데이터 확인으로 이동</button>
      </article>
      <article>
        <b>4</b>
        <h4>저장·공유</h4>
        <p>검수 후 저장하고, 공유 문구나 엑셀 파일로 내보냅니다.</p>
        <button class="ghost-btn" data-help-page="share" type="button">공유·엑셀로 이동</button>
      </article>
    </section>

    <section class="help-grid-panel">
      <div class="help-card soft-blue">
        <h4>검수할 때 자주 보는 것</h4>
        <p><strong>미등록 코드</strong>는 코드표에 없는 값, <strong>불확실 코드</strong>는 AO?처럼 애매하게 읽힌 값, <strong>확인필요</strong>는 판독 불가 값이에요.</p>
      </div>
      <div class="help-card soft-yellow">
        <h4>실수했을 때</h4>
        <p>데이터 확인 탭의 <strong>되돌리기</strong>를 누르면 최근 수정 전 상태로 돌아갈 수 있어요. 저장 전이라도 브라우저에 임시 보관됩니다.</p>
      </div>
      <div class="help-card soft-green">
        <h4>월별 관리</h4>
        <p>보관함에서 월별 이미지, 데이터, 검수 상태를 확인하고 다시 불러올 수 있어요.</p>
      </div>
      <div class="help-card soft-peach">
        <h4>문제가 생겼을 때</h4>
        <p>미등록 코드가 계속 뜰 때만 코드 설정의 고급 설정을 확인해 주세요.</p>
      </div>
    </section>
  `;
}

async function moveSelectedWeek(direction) {
  const base = new Date(state.selectedDate || `${state.year}-${String(state.month).padStart(2, '0')}-01`);
  if (Number.isNaN(base.getTime())) return;
  const target = new Date(base);
  target.setDate(base.getDate() + Number(direction) * 7);
  const targetValue = toDateInputValue(target);
  const targetYear = target.getFullYear();
  const targetMonth = target.getMonth() + 1;

  if (targetYear !== state.year || targetMonth !== state.month) {
    await changeActiveMonth(targetYear, targetMonth);
  }
  state.selectedDate = targetValue;
  syncInputs();
  renderAll();
  saveState(false);
}

async function checkCloudWorkCodes() {
  const user = requireUser();
  if (!user || !supabaseClient) {
    setCodeCheckStatus('<span>로그인 후 Supabase 코드표를 확인할 수 있어요.</span>', 'warn');
    return;
  }
  setCodeCheckStatus('<span>저장된 코드표를 확인하는 중이에요...</span>', 'warn');
  const { data, error } = await supabaseClient
    .from('work_codes')
    .select('*')
    .eq('user_id', user.id)
    .order('code', { ascending: true });

  if (error) {
    setCodeCheckStatus(`<span>저장된 코드표 확인 실패: ${escapeHtml(error.message || error)}</span>`, 'error');
    return;
  }

  const cloudCodes = {};
  (data || []).forEach((row) => {
    cloudCodes[row.code] = {
      label: row.label || '',
      start: row.start_time || '',
      end: row.end_time || '',
      type: row.is_off ? (row.code === 'AL' ? 'leave' : 'off') : deriveCodeType(row.code, { start: row.start_time || '', end: row.end_time || '' }),
    };
  });

  if (!data?.length) {
    setCodeCheckStatus('<span>저장된 코드표가 아직 없어요. 저장 버튼을 누르면 현재 코드표가 저장됩니다.</span>', 'warn');
    return;
  }

  setCodeCheckStatus(formatCodeGapSummary(getCodeSetGaps(cloudCodes), `저장된 코드표 ${data.length}개`));
}

function bindViewEvents() {
  document.querySelectorAll('[data-editor-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.editorFilter = button.dataset.editorFilter || 'all';
      renderScheduleTable();
      saveState(false);
    });
  });
  document.querySelectorAll('[data-person-select]').forEach((select) => {
    select.addEventListener('change', () => {
      state.myName = select.value;
      syncInputs();
      renderAll();
      saveState(false);
    });
  });
  document.querySelectorAll('[data-share-template]').forEach((button) => {
    button.addEventListener('click', () => {
      state.shareTemplate = button.dataset.shareTemplate || 'detailed';
      renderViews();
      saveState(false);
    });
  });
  document.querySelectorAll('[data-daily-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const selected = new Date(state.selectedDate || `${state.year}-${String(state.month).padStart(2, '0')}-01`);
      const day = isSameMonth(selected) ? selected.getDate() : 1;
      const nextDay = Math.min(Math.max(day + Number(button.dataset.dailyStep || 0), 1), daysInMonth(state.year, state.month));
      state.selectedDate = `${state.year}-${String(state.month).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
      syncInputs();
      renderAll();
      saveState(false);
    });
  });
  document.querySelectorAll('[data-daily-date-input]').forEach((input) => {
    input.addEventListener('change', () => {
      const picked = new Date(input.value || '');
      if (Number.isNaN(picked.getTime())) return;
      if (picked.getFullYear() !== state.year || picked.getMonth() + 1 !== state.month) return;
      state.selectedDate = input.value;
      syncInputs();
      renderAll();
      saveState(false);
    });
  });
  document.querySelectorAll('[data-help-page]').forEach((button) => {
    button.addEventListener('click', () => {
      switchPage(button.dataset.helpPage || 'home', true);
    });
  });
  el('saveDefaultNamesButton')?.addEventListener('click', () => {
    const names = parseDefaultNames(el('defaultNamesInput')?.value || '');
    if (!names.length) {
      alert('기본 이름을 한 명 이상 입력해 주세요.');
      return;
    }
    state.defaultNames = names;
    state.ocr.names = names.join(' ');
    syncOcrInputs();
    markUnsavedChanges('기본 직원 목록이 변경됐어요. 저장 버튼을 눌러 반영해 주세요.');
    saveState(false);
    alert('기본 직원 목록을 저장했어요.');
  });
  document.querySelectorAll('[data-month-detail-day]').forEach((button) => {
    button.addEventListener('click', () => {
      const day = String(button.dataset.monthDetailDay).padStart(2, '0');
      state.selectedDate = `${state.year}-${String(state.month).padStart(2, '0')}-${day}`;
      state.activePage = 'daily';
      syncInputs();
      renderAll();
      saveState(false);
    });
  });
  document.querySelectorAll('[data-go-daily-day]').forEach((button) => {
    button.addEventListener('click', () => {
      const day = String(button.dataset.goDailyDay).padStart(2, '0');
      state.selectedDate = `${state.year}-${String(state.month).padStart(2, '0')}-${day}`;
      syncInputs();
      switchPage('daily', true);
      renderAll();
      saveState(false);
    });
  });
  document.querySelectorAll('[data-pick-day]').forEach((button) => {
    button.addEventListener('click', () => {
      const day = String(button.dataset.pickDay).padStart(2, '0');
      state.selectedDate = `${state.year}-${String(state.month).padStart(2, '0')}-${day}`;
      state.activePage = 'daily';
      syncInputs();
      renderAll();
      saveState(false);
    });
  });
  document.querySelectorAll('[data-week-shift]').forEach((button) => {
    button.addEventListener('click', async () => {
      await moveSelectedWeek(Number(button.dataset.weekShift));
    });
  });
  el('copyShareButton')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(el('shareText').value);
    alert('출근 현황 공유문을 복사했어요.');
  });
  el('copyPersonalShareButton')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(el('personalShareText').value);
    alert('내 월간 스케줄을 복사했어요.');
  });
  el('downloadExcelButton')?.addEventListener('click', downloadExcel);
  document.querySelectorAll('.load-month').forEach((button) => {
    button.addEventListener('click', async () => {
      const { year, month } = parseMonthKey(button.dataset.monthKey);
      const changed = await changeActiveMonth(year, month);
      if (changed) switchPage('setup', true);
    });
  });
  document.querySelectorAll('.delete-month-image').forEach((button) => {
    button.addEventListener('click', async () => {
      const key = button.dataset.monthKey;
      if (!confirm(`${key} 근무표 이미지만 삭제할까요? 입력한 스케줄 데이터는 유지됩니다.`)) return;
      if (currentUser && supabaseClient) {
        try {
          const { year, month } = parseMonthKey(key);
          const row = await getCloudMonthRow(year, month);
          if (row?.image_path) {
            await supabaseClient.storage.from('schedule-images').remove([row.image_path]);
            await supabaseClient.from('schedule_months').update({ image_path: null }).eq('id', row.id).eq('user_id', currentUser.id);
          }
        } catch (error) {
          alert(`클라우드 이미지 삭제 실패: ${error.message || error}`);
          return;
        }
      }
      await deleteStoredImage(key);
      if (key === monthKey()) {
        state.imageData = '';
        state.imageName = '';
        state.imageUpdatedAt = '';
      }
      if (state.monthStore?.[key]) {
        state.monthStore[key].imageName = '';
        state.monthStore[key].imageUpdatedAt = '';
      }
      await refreshArchiveMeta();
      renderUploadedImage();
      renderAll();
      saveState(false);
    });
  });
  el('checkLocalCodesButton')?.addEventListener('click', () => {
    setCodeCheckStatus(formatCodeGapSummary(getCodeSetGaps(state.codes), `현재 코드표 ${Object.keys(state.codes || {}).length}개`));
  });
  el('checkCloudCodesButton')?.addEventListener('click', checkCloudWorkCodes);
  el('resetDefaultCodesButton')?.addEventListener('click', () => {
    if (!confirm('현재 코드 설정을 이미지 하단 기본 코드표 기준으로 되돌릴까요? 직접 추가한 코드나 수정한 시간은 사라질 수 있어요.')) return;
    resetCodesToDefaultTable();
    setCodeCheckStatus(formatCodeGapSummary(getCodeSetGaps(state.codes), `기본값으로 되돌린 코드표 ${Object.keys(state.codes || {}).length}개`), 'ok');
  });
  el('saveCodesButton')?.addEventListener('click', async () => {
    saveState(false);
    await saveCurrentMonthToCloud(true);
    setCodeCheckStatus('<span>현재 코드표를 저장했어요. Supabase 저장 공간에도 반영됐습니다.</span>', 'ok');
  });
  el('addCodeButton')?.addEventListener('click', () => {
    let key = prompt('추가할 코드를 입력하세요. 예: AQ');
    if (!key) return;
    key = key.trim().toUpperCase();
    state.codes[key] = { label: '근무', start: '', end: '', type: 'work' };
    renderViews();
    saveState(false);
  });
  document.querySelectorAll('[data-code-prop]').forEach((input) => {
    input.addEventListener('input', () => {
      const code = input.dataset.code;
      const prop = input.dataset.codeProp;
      state.codes[code][prop] = input.value;
      if (prop === 'type') state.codes[code].type = input.value;
      else state.codes[code].type = deriveCodeType(code, state.codes[code]);
      renderAll();
      markUnsavedChanges('근무 코드 설정이 변경됐어요. 저장 버튼을 눌러 반영해 주세요.');
      saveState(false);
    });
  });
  document.querySelectorAll('.delete-code').forEach((button) => {
    button.addEventListener('click', () => {
      delete state.codes[button.dataset.code];
      renderViews();
      markUnsavedChanges('근무 코드가 삭제됐어요. 저장 버튼을 눌러 반영해 주세요.');
      saveState(false);
    });
  });
}

function getDayRoster(day) {
  const byStart = {};
  const offPeople = [];
  let workTotal = 0;
  let offTotal = 0;
  state.people.filter((p) => p.name).forEach((person) => {
    const code = person.schedules[day - 1] || '';
    const info = getCodeInfo(code);
    if (info.start && info.end && !['off', 'leave', 'empty'].includes(info.type)) {
      workTotal += 1;
      if (!byStart[info.start]) byStart[info.start] = [];
      byStart[info.start].push({ name: person.name, code, info });
    } else if (['off', 'leave'].includes(info.type)) {
      offTotal += 1;
      offPeople.push({ name: person.name, code, info });
    }
  });
  const earliest = Object.keys(byStart).sort()[0] || '';
  return { byStart, offPeople, workTotal, offTotal, earliest };
}

function downloadExcel() {
  const wb = XLSX.utils.book_new();
  const person = getMyPerson();
  const myRows = person ? getScheduleRowsForPerson(person).map((row) => ({ 날짜: row.dateText, 코드: row.code, 의미: row.label, 출근: row.start, 퇴근: row.end })) : [];
  const allRows = [];
  state.people.filter((p) => p.name).forEach((person) => {
    person.schedules.forEach((code, index) => {
      const day = index + 1;
      const info = getCodeInfo(code);
      allRows.push({ 이름: person.name, 날짜: `${state.year}-${String(state.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, 코드: code, 의미: info.label, 출근: info.start, 퇴근: info.end });
    });
  });
  const offRows = myRows.filter((row) => ['휴무', '연차', '남은휴무', '예비군', '경조휴가'].includes(row.의미));
  const codeRows = Object.entries(state.codes).map(([코드, info]) => ({ 코드, 의미: info.label, 출근: info.start, 퇴근: info.end, 유형: info.type }));
  const stats = getMonthlyWorkStats(person);
  const statsRows = [
    { 항목: '근무일', 값: stats.workCount },
    { 항목: '휴무일', 값: stats.offCount },
    { 항목: '연차일', 값: stats.leaveCount },
    { 항목: '가장 많은 코드', 값: stats.mostCode || '-' },
    { 항목: '가장 이른 출근', 값: stats.earliest || '-' },
    { 항목: '야간/심야성 근무', 값: stats.nightCount },
    { 항목: '메모', 값: getCurrentMemoText() || '-' },
  ];
  const rosterDay = getSelectedRosterDay();
  const roster = getDayRoster(rosterDay);
  const rosterRows = [];
  Object.entries(roster.byStart).sort(([a], [b]) => a.localeCompare(b)).forEach(([time, people]) => {
    people.forEach((p) => rosterRows.push({ 날짜: `${state.year}-${String(state.month).padStart(2, '0')}-${String(rosterDay).padStart(2, '0')}`, 구분: `${time} 출근`, 이름: p.name, 코드: p.code }));
  });
  roster.offPeople.forEach((p) => rosterRows.push({ 날짜: `${state.year}-${String(state.month).padStart(2, '0')}-${String(rosterDay).padStart(2, '0')}`, 구분: '휴무/연차', 이름: p.name, 코드: p.code }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(myRows), '내 스케줄');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offRows), '휴무일');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRows), '전체 데이터');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rosterRows), '출근 현황');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(codeRows), '코드표');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsRows), '근무 통계');
  XLSX.writeFile(wb, `schedule_${state.year}_${String(state.month).padStart(2, '0')}_${state.myName || 'me'}.xlsx`);
}

function deriveCodeType(code, info = {}) {
  if (['work', 'off', 'leave', 'unknown'].includes(info.type)) return info.type;
  if (info.start || info.end) return 'work';
  if (code === 'AL') return 'leave';
  if (['DO', 'PH', 'SD', 'RT', 'OC', 'MH', 'CC'].includes(code)) return 'off';
  return 'unknown';
}

function formatTime(info) {
  if (info.start && info.end) return `${info.start}~${info.end}`;
  return '';
}

function badgeClass(type) {
  if (type === 'work') return 'work';
  if (type === 'leave') return 'leave';
  if (type === 'off') return 'off';
  if (type === 'uncertain') return 'uncertain';
  return '';
}

function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
function toDateInputValue(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function isSameMonth(date) { return date.getFullYear() === state.year && date.getMonth() + 1 === state.month; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }

function getPersistableState() {
  saveCurrentMonthToStore();
  const persistable = { ...state };
  // 이미지 원본/base64는 IndexedDB에 월별로 저장하고, localStorage에는 스케줄 데이터만 저장합니다.
  persistable.imageData = '';
  persistable.archiveMeta = (state.archiveMeta || []).map((record) => ({
    key: record.key,
    year: record.year,
    month: record.month,
    imageName: record.imageName || '',
    updatedAt: record.updatedAt || '',
  }));
  return persistable;
}

function saveState(showAlert = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistableState()));
    if (showAlert) alert('브라우저에 저장했어요. 로그인 상태에서는 저장 버튼으로 클라우드에도 저장됩니다.');
  } catch (error) {
    console.warn('저장 실패', error);
    try {
      const lightState = getPersistableState();
      if (lightState.ocr?.results) {
        lightState.ocr.results = lightState.ocr.results.map((row) => ({
          name: row.name,
          schedules: row.schedules,
          confidence: row.confidence || 0,
          rawText: '',
        }));
      }
      Object.values(lightState.monthStore || {}).forEach((month) => {
        if (month.ocr?.results) {
          month.ocr.results = month.ocr.results.map((row) => ({
            name: row.name,
            schedules: row.schedules,
            confidence: row.confidence || 0,
            rawText: '',
          }));
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightState));
      if (showAlert) alert('OCR 원문 일부를 제외하고 저장했어요. 월별 스케줄 데이터는 유지됩니다.');
    } catch (secondError) {
      alert('브라우저 저장 공간이 부족해서 저장하지 못했어요. 오래된 월 데이터를 정리하거나 다른 브라우저에서 시도해 주세요.');
    }
  }
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    parsed.imageData = '';
    Object.assign(state, parsed);
    state.imageData = '';
    state.codes = parsed.codes || getDefaultCodes();
    state.monthStore = parsed.monthStore || {};
    state.archiveMeta = Array.isArray(parsed.archiveMeta) ? parsed.archiveMeta : [];
    state.ocr = { ...getDefaultOcrState(), ...(parsed.ocr || {}) };
    state.memo = { ...getDefaultMemoState(), ...(parsed.memo || {}) };
    state.defaultNames = Array.isArray(parsed.defaultNames) && parsed.defaultNames.length ? parsed.defaultNames : getInitialDefaultNames();
    state.editorFilter = parsed.editorFilter || 'all';
    state.shareTemplate = parsed.shareTemplate || 'detailed';
    state.reviewCompareOpen = false;
    state.activePage = parsed.activePage || parsed.activeTab || 'home';
    state.themeMode = normalizeThemeMode(parsed.themeMode || state.themeMode);
    ensureMonthStore();
    normalizeOcrDefaultNames();
  } catch (e) {
    console.warn('저장 데이터 로드 실패', e);
  }
}

init();


function getImageViewerRecords() {
  const records = Array.isArray(state.archiveMeta) ? [...state.archiveMeta] : [];
  const currentKey = monthKey();
  const hasCurrentRecord = records.some((record) => record.key === currentKey);

  if (!hasCurrentRecord && (state.imageData || state.imageName)) {
    records.unshift({
      key: currentKey,
      year: state.year,
      month: state.month,
      imageName: state.imageName || '현재 월 근무표',
      updatedAt: state.imageUpdatedAt || '',
      thumbData: state.imageData || '',
      cloud: Boolean(currentUser),
      isCurrent: true,
    });
  }

  return records
    .filter((record) => record && record.key && (record.thumbData || record.imageName || record.key === currentKey))
    .sort((a, b) => String(b.key).localeCompare(String(a.key)));
}

function setModalImageState(message, imageSrc = '') {
  const modalImg = el('modalImagePreview');
  const modalEmpty = el('modalImageEmpty');
  if (!modalImg || !modalEmpty) return;

  if (imageSrc) {
    modalImg.src = imageSrc;
    modalImg.style.display = 'block';
    modalEmpty.style.display = 'none';
  } else {
    modalImg.removeAttribute('src');
    modalImg.style.display = 'none';
    modalEmpty.textContent = message || '저장된 근무표 이미지가 없어요.';
    modalEmpty.style.display = 'grid';
  }
}

async function showModalImageForMonth(key) {
  const info = el('modalImageInfo');
  const currentKey = monthKey();
  const records = getImageViewerRecords();
  const record = records.find((item) => item.key === key);

  if (!record) {
    setModalImageState('선택한 월의 근무표 이미지를 찾지 못했어요.');
    if (info) info.textContent = '월별 보관함에 이미지가 있는 달만 선택할 수 있어요.';
    return;
  }

  const label = `${record.year || parseMonthKey(record.key).year}년 ${record.month || parseMonthKey(record.key).month}월`;
  if (info) info.textContent = `${label} 원본 근무표를 보고 있어요.`;

  if (record.key === currentKey && state.imageData) {
    setModalImageState('', state.imageData);
    return;
  }

  setModalImageState(`${label} 근무표 이미지를 불러오는 중이에요.`);

  try {
    if (record.cloud && record.thumbData) {
      setModalImageState('', record.thumbData);
      return;
    }

    const stored = await getStoredImage(record.key);
    if (stored?.imageData) {
      setModalImageState('', stored.imageData);
      return;
    }

    if (record.thumbData) {
      setModalImageState('', record.thumbData);
      return;
    }

    setModalImageState(`${label}에 저장된 이미지가 없어요.`);
  } catch (error) {
    console.warn('월별 이미지 불러오기 실패', error);
    setModalImageState(`${label} 이미지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.`);
  }
}

function populateImageMonthSelect(preferredKey = monthKey()) {
  const select = el('modalImageMonthSelect');
  if (!select) return '';

  const records = getImageViewerRecords();
  if (!records.length) {
    select.innerHTML = '<option value="">저장된 이미지 없음</option>';
    select.disabled = true;
    return '';
  }

  select.disabled = false;
  select.innerHTML = records.map((record) => {
    const parsed = parseMonthKey(record.key);
    const imageLabel = record.imageName ? ` · ${record.imageName}` : '';
    const currentLabel = record.key === monthKey() ? ' · 현재 선택월' : '';
    return `<option value="${escapeHtml(record.key)}">${parsed.year}년 ${parsed.month}월${currentLabel}${escapeHtml(imageLabel)}</option>`;
  }).join('');

  const selectedKey = records.some((record) => record.key === preferredKey) ? preferredKey : records[0].key;
  select.value = selectedKey;
  return selectedKey;
}

function bindImageViewerEvents() {
  const btn = el('floatingImageViewerBtn');
  const modal = el('imageViewerModal');
  const closeBtn = el('closeImageModalBtn');
  const backdrop = document.querySelector('.image-modal-backdrop');
  const select = el('modalImageMonthSelect');

  if (!btn || !modal) return;

  const openModal = async () => {
    modal.classList.remove('is-hidden');
    setModalImageState('저장된 월별 근무표 이미지를 불러오는 중이에요.');

    try {
      await refreshArchiveMeta();
    } catch (error) {
      console.warn('이미지 목록 갱신 실패', error);
    }

    const selectedKey = populateImageMonthSelect(monthKey());
    if (selectedKey) await showModalImageForMonth(selectedKey);
    else setModalImageState('아직 저장된 근무표 이미지가 없어요. 설정·이미지에서 월별 이미지를 먼저 업로드해 주세요.');
  };

  const closeModal = () => {
    modal.classList.add('is-hidden');
  };

  btn.addEventListener('click', openModal);
  select?.addEventListener('change', async () => {
    if (select.value) await showModalImageForMonth(select.value);
  });
  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);
}
