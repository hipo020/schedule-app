// Supabase 연결 정보
// Publishable key는 브라우저에서 사용하는 공개용 키입니다.
// Secret key는 절대 이 파일에 넣지 마세요.
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
      detectSessionInUrl: false,
      flowType: 'implicit',
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
  if (!node) {
    console.warn(`[bindEvents] #${id} 요소를 찾지 못했어요.`);
    return;
  }
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
    CC: { label: '경조휴가', start: '', end: '', type: 'off' },
  };
}

function getDefaultOcrState() {
  return {
    names: DEFAULT_CULINARY_NAMES.join('\n'),
    rect: { x: 18.3, y: 12.1, w: 49.6, h: 25.5 },
    results: [],
  };
}

async function init() {
  try {
    loadState();
  } catch (error) {
    console.warn('저장 데이터 초기화 중 오류', error);
  }
  initMonthSelect();
  bindAuthEvents();
  setAuthMessage('로그인 화면 준비 완료. Google 로그인 버튼을 눌러 주세요.', '');
  try {
    bindEvents();
  } catch (error) {
    console.warn('일반 화면 이벤트 연결 중 오류가 발생했지만 로그인 기능은 계속 사용할 수 있어요.', error);
  }

  const authenticated = await initAuth();
  if (!authenticated) {
    showAuthGate('로그인이 필요합니다. Google 계정으로 로그인해 주세요.');
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
  on('yearInput', 'input', async (e) => { await changeActiveMonth(Number(e.target.value), state.month); });
  on('monthInput', 'change', async (e) => { await changeActiveMonth(state.year, Number(e.target.value)); });
  on('myNameInput', 'input', (e) => { state.myName = e.target.value.trim(); renderAll(); saveState(false); });
  on('selectedDateInput', 'change', (e) => { state.selectedDate = e.target.value; renderAll(); saveState(false); });
  on('uploadButton', 'click', () => el('imageInput')?.click());
  on('imageInput', 'change', handleImageUpload);
  on('loadSampleButton', 'click', loadSample);
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
  on('clearButton', 'click', clearAll);
  on('saveButton', 'click', async () => {
    saveState(false);
    await saveCurrentMonthToCloud(true);
  });
  on('addPersonButton', 'click', addPerson);
  on('removeEmptyRowsButton', 'click', removeEmptyRows);
  document.querySelectorAll('.sheet-tab').forEach((button) => {
    button.addEventListener('click', () => switchPage(button.dataset.page, true));
  });
  document.querySelectorAll('.page-shortcut').forEach((button) => {
    button.addEventListener('click', () => switchPage(button.dataset.goPage, true));
  });

  bindOcrEvents();
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
  const googleButton = el('googleLoginButton');
  if (googleButton) {
    window.__scheduleAppAuthBound = true;
  }

  el('logoutButton')?.addEventListener('click', async () => {
    const client = getSupabaseClient();
    if (client && currentUser) await client.auth.signOut();
    currentSession = null;
    currentUser = null;
    isGuestMode = false;
    showAuthGate('로그아웃했어요. 다시 사용하려면 Google 계정으로 로그인해 주세요.');
  });
}

async function initAuth() {
  const client = getSupabaseClient();
  if (!client) {
    setAuthMessage('Supabase 라이브러리를 불러오지 못했어요. 네트워크를 확인한 뒤 새로고침해 주세요.', 'error');
    return false;
  }

  try {
    if (window.__scheduleAuthBootstrapPromise) {
      setAuthMessage('Google 로그인 정보를 확인하고 있어요. 잠시만 기다려 주세요.', '');
      const bootSession = await window.__scheduleAuthBootstrapPromise;
      if (bootSession) {
        currentSession = bootSession;
        currentUser = bootSession.user || null;
      }
    }
    if (window.__scheduleAuthBootstrapError) {
      throw window.__scheduleAuthBootstrapError;
    }
    if (!currentSession) {
      const callbackSession = await processAuthCallback(client);
      if (callbackSession) {
        currentSession = callbackSession;
        currentUser = callbackSession.user || null;
      }
    }
  } catch (callbackError) {
    console.error('로그인 콜백 처리 실패', callbackError);
    setAuthMessage(`Google 로그인 확인 중 오류가 발생했어요: ${callbackError?.message || callbackError}`, 'error');
  }

  const { data, error } = await client.auth.getSession();
  if (error) {
    console.warn('세션 확인 실패', error);
    setAuthMessage(`세션 확인 실패: ${error.message}`, 'error');
    return false;
  }
  currentSession = data?.session || currentSession || null;
  currentUser = currentSession?.user || null;

  client.auth.onAuthStateChange((event, session) => {
    currentSession = session || null;
    currentUser = session?.user || null;
    if (event === 'SIGNED_IN' && currentUser) {
      showAppShell();
      showCloudStatus('로그인 완료. 데이터를 불러오는 중이에요.', 'ok');
      loadCloudInitialData(true).then(() => {
        syncInputs();
        renderScheduleTable();
        renderUploadedImage();
        renderAll();
      });
    }
    if (event === 'SIGNED_OUT') {
      showAuthGate('로그아웃했어요. 다시 사용하려면 Google 계정으로 로그인해 주세요.');
    }
  });

  return Boolean(currentUser);
}


async function processAuthCallback(client) {
  const href = window.location.href;
  const url = new URL(href);
  const query = url.searchParams;
  const hashString = window.location.hash ? window.location.hash.slice(1) : '';
  const hash = new URLSearchParams(hashString);

  const errorDescription = query.get('error_description') || hash.get('error_description') || query.get('error') || hash.get('error');
  if (errorDescription) {
    cleanupAuthUrl();
    throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
  }

  const code = query.get('code');
  if (code) {
    setAuthMessage('Google 로그인 정보를 확인하고 있어요. 잠시만 기다려 주세요.', '');
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    cleanupAuthUrl();
    if (error) {
      throw new Error('이전 로그인 링크 처리에 실패했어요. 새 버전 반영 후 Google 로그인 버튼을 다시 눌러 주세요. 상세: ' + error.message);
    }
    setAuthMessage('로그인 완료. 앱을 여는 중이에요.', 'ok');
    return data?.session || null;
  }

  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    setAuthMessage('Google 로그인 정보를 확인하고 있어요. 잠시만 기다려 주세요.', '');
    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    cleanupAuthUrl();
    if (error) throw error;
    const session = data?.session || (await client.auth.getSession())?.data?.session || null;
    setAuthMessage('로그인 완료. 앱을 여는 중이에요.', 'ok');
    return session;
  }

  return null;
}

function cleanupAuthUrl() {
  if (!window.history?.replaceState) return;
  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

async function signInWithGoogle() {
  if (typeof window.startGoogleLoginDirect === 'function') {
    await window.startGoogleLoginDirect();
    return;
  }
  setAuthMessage('Google 로그인으로 이동하고 있어요.', '');
  const button = el('googleLoginButton');
  const originalText = button?.textContent || 'Google로 로그인';
  try {
    const client = getSupabaseClient();
    if (!client) {
      setAuthMessage('Supabase 연결을 초기화하지 못했어요. 인터넷 연결 또는 CDN 로딩 상태를 확인해 주세요.', 'error');
      return;
    }
    if (button) {
      button.disabled = true;
      button.textContent = 'Google 로그인으로 이동 중...';
    }
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, queryParams: { prompt: 'select_account' } },
    });
    if (error) {
      setAuthMessage(`Google 로그인 시작 실패: ${error.message}`, 'error');
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  } catch (error) {
    console.error('Google 로그인 시작 오류', error);
    setAuthMessage(`Google 로그인 처리 중 오류가 발생했어요: ${error?.message || error}`, 'error');
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
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
  if (el('userEmailText')) el('userEmailText').textContent = currentUser?.email || (isGuestMode ? '임시 사용 중' : '로그인됨');
  if (isGuestMode) {
    showCloudStatus('로그인 없이 임시 사용 중이에요. 클라우드 저장은 로그인 후 사용할 수 있어요.', 'warn');
  } else {
    showCloudStatus('Supabase에 연결됐어요. 저장 버튼을 누르면 현재 월 데이터가 클라우드에 저장됩니다.', 'ok');
  }
}

function showCloudStatus(message, type = '') {
  const node = el('cloudStatus');
  if (!node) return;
  node.textContent = message;
  node.className = `cloud-status ${type}`;
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
    updatedAt: new Date().toISOString(),
  };
}

function loadMonthDataFromStore(key = monthKey()) {
  ensureMonthStore();
  const saved = state.monthStore[key];
  if (saved) {
    state.people = clonePlain(saved.people || []);
    state.ocr = { ...getDefaultOcrState(), ...(saved.ocr || {}) };
    state.imageName = saved.imageName || '';
    state.imageUpdatedAt = saved.imageUpdatedAt || '';
  } else {
    state.people = [makePerson(''), makePerson(''), makePerson(''), makePerson(''), makePerson('')];
    state.ocr = getDefaultOcrState();
    state.imageName = '';
    state.imageUpdatedAt = '';
  }
  ensurePeople();
  normalizePeopleDays();
}

async function changeActiveMonth(nextYear, nextMonth) {
  if (!Number.isFinite(nextYear) || !Number.isFinite(nextMonth)) return;
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
}


async function loadCloudInitialData(showMessage = false) {
  const user = requireUser();
  if (!user || !supabaseClient || isCloudBusy) return;
  isCloudBusy = true;
  try {
    if (showMessage) showCloudStatus('클라우드 데이터를 불러오는 중이에요.', 'warn');
    await loadWorkCodesFromCloud();
    await loadCloudMonthData(state.year, state.month);
    await refreshArchiveMeta();
    if (showMessage) showCloudStatus('클라우드 데이터를 불러왔어요.', 'ok');
  } catch (error) {
    console.error('클라우드 로드 실패', error);
    showCloudStatus(`클라우드 데이터를 불러오지 못했어요: ${error.message || error}`, 'error');
  } finally {
    isCloudBusy = false;
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
  try {
    showCloudStatus('현재 월 데이터를 클라우드에 저장하는 중이에요.', 'warn');
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
    showCloudStatus('클라우드 저장 완료. 다른 기기에서도 로그인하면 불러올 수 있어요.', 'ok');
    if (showAlert) alert('클라우드에 저장했어요.');
  } catch (error) {
    console.error('클라우드 저장 실패', error);
    showCloudStatus(`클라우드 저장 실패: ${error.message || error}`, 'error');
    if (showAlert) alert(`클라우드 저장 실패: ${error.message || error}`);
  } finally {
    isCloudBusy = false;
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

function renderScheduleTable() {
  normalizePeopleDays();
  const days = daysInMonth(state.year, state.month);
  let html = '<thead><tr><th>이름</th>';
  for (let d = 1; d <= days; d++) html += `<th>${d}</th>`;
  html += '<th>삭제</th></tr></thead><tbody>';
  state.people.forEach((person, rowIndex) => {
    html += `<tr><td><input class="name-input" data-row="${rowIndex}" data-field="name" value="${escapeHtml(person.name)}" placeholder="이름" /></td>`;
    for (let d = 0; d < days; d++) {
      html += `<td><input maxlength="3" data-row="${rowIndex}" data-day="${d}" value="${escapeHtml(person.schedules[d] || '')}" /></td>`;
    }
    html += `<td><button class="ghost-btn row-delete" data-row="${rowIndex}">×</button></td></tr>`;
  });
  html += '</tbody>';
  el('scheduleTable').innerHTML = html;

  el('scheduleTable').querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', handleScheduleInput);
  });
  el('scheduleTable').querySelectorAll('.row-delete').forEach((button) => {
    button.addEventListener('click', () => {
      state.people.splice(Number(button.dataset.row), 1);
      ensurePeople();
      renderScheduleTable();
      renderAll();
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
    state.people[row].schedules[day] = e.target.value.trim().toUpperCase();
    e.target.value = e.target.value.toUpperCase();
  }
  renderAll();
  saveState(false);
}

function addPerson() {
  state.people.push(makePerson(''));
  renderScheduleTable();
  saveState(false);
}

function removeEmptyRows() {
  state.people = state.people.filter((p) => p.name || p.schedules.some(Boolean));
  ensurePeople();
  renderScheduleTable();
  renderAll();
  saveState(false);
}

function clearAll() {
  if (!confirm('입력한 스케줄 데이터를 모두 비울까요?')) return;
  state.people = [makePerson(''), makePerson(''), makePerson(''), makePerson(''), makePerson('')];
  renderScheduleTable();
  renderAll();
  saveState(false);
}

function loadSample() {
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
  syncInputs();
  renderUploadedImage();
  syncOcrInputs();
  renderOcrResultTable();
  setTimeout(drawOcrPreview, 0);
  renderScheduleTable();
  renderAll();
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
      showCloudStatus('이미지를 Supabase Storage에 업로드하는 중이에요.', 'warn');
      await uploadImageDataToCloud(compressedDataUrl, file.name);
      showCloudStatus('이미지 업로드 완료. 스케줄 검수 후 저장 버튼을 눌러 주세요.', 'ok');
    }
    await refreshArchiveMeta();
    renderUploadedImage();
    drawOcrPreview();
    renderAll();
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
      status.innerHTML = `<strong>${state.year}년 ${state.month}월 근무표 저장됨</strong><span>${escapeHtml(state.imageName || '스케줄표 이미지')}</span><small>로그인 상태에서는 Supabase에도 저장되어 다른 기기에서 불러올 수 있어요.</small>`;
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
    state.ocr.names = DEFAULT_CULINARY_NAMES.join('\n');
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
}

function syncOcrInputs() {
  state.ocr = { ...getDefaultOcrState(), ...(state.ocr || {}) };
  if (el('ocrNamesInput')) el('ocrNamesInput').value = state.ocr.names || '';
  const rect = state.ocr.rect || getDefaultOcrState().rect;
  if (el('ocrXInput')) el('ocrXInput').value = rect.x;
  if (el('ocrYInput')) el('ocrYInput').value = rect.y;
  if (el('ocrWInput')) el('ocrWInput').value = rect.w;
  if (el('ocrHInput')) el('ocrHInput').value = rect.h;
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
  return raw.split('\n').map((name) => name.trim()).filter(Boolean);
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
  state.people = results.map((row) => ({ name: row.name, schedules: row.schedules || [] }));
  normalizePeopleDays();
  if (!state.myName && state.people[0]?.name) state.myName = state.people[0].name;
  syncInputs();
  renderScheduleTable();
  renderAll();
  saveState(true);
  switchPage('editor', true);
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
        setPromptCopyStatus('추출 프롬프트를 복사했어요. AI 채팅창에 이미지와 함께 붙여넣어 주세요.', 'ok');
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
  return raw.toUpperCase().replace(/\s+/g, '');
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
  rows.slice(1).forEach((row) => {
    const name = String(row[index.get('person_name')] || '').trim();
    if (!name) return;
    const schedules = [];
    for (let d = 1; d <= days; d++) {
      const key = `d${String(d).padStart(2, '0')}`;
      schedules.push(normalizeCsvCode(row[index.get(key)] || ''));
    }
    people.push({ name, schedules });
  });
  if (!people.length) throw new Error('person_name이 있는 데이터 행을 찾지 못했어요.');
  return { year: nextYear, month: nextMonth, people, header };
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
    state.year = parsed.year;
    state.month = parsed.month;
    state.people = parsed.people;
    if (!state.myName && parsed.people[0]?.name) state.myName = parsed.people[0].name;
    const selectedDay = Math.min(Number(String(state.selectedDate || '').slice(-2)) || 1, daysInMonth(state.year, state.month));
    state.selectedDate = `${state.year}-${String(state.month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    normalizePeopleDays();
    saveCurrentMonthToStore();
    syncInputs();
    renderScheduleTable();
    renderAll();
    saveState(false);
    setCsvInputStatus(`${state.year}년 ${state.month}월 데이터 ${parsed.people.length}명을 불러왔어요. 데이터 확인 탭에서 검토해 주세요.`, 'ok');
    renderCsvPreview();
    switchPage('dataReview', true);
    if (showAlert) alert('CSV 데이터를 불러왔어요. 데이터 확인 탭에서 먼저 확인해 주세요.');
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
        <p>${parsed.year}년 ${parsed.month}월 · ${parsed.people.length}명 인식됨</p>
        <div class="list">${sample}</div>
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

function renderDataReview() {
  const people = state.people.filter((p) => p.name);
  const days = daysInMonth(state.year, state.month);
  if (!people.length) {
    return `
      <div class="view-title"><h3>입력 데이터 확인</h3><span>아직 불러온 데이터가 없어요</span></div>
      <div class="empty-archive">
        <h3>CSV 데이터를 먼저 불러와 주세요.</h3>
        <p>데이터 입력 탭에서 ChatGPT/Gemini가 추출한 CSV를 붙여넣고 CSV 불러오기를 누르면 여기에서 결과를 확인할 수 있어요.</p>
        <button class="primary-btn" data-go-page="dataInput">데이터 입력으로 이동</button>
      </div>
    `;
  }
  const codeCount = {};
  people.forEach((person) => {
    person.schedules.forEach((code) => {
      if (!code) return;
      codeCount[code] = (codeCount[code] || 0) + 1;
    });
  });
  const topCodes = Object.entries(codeCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([code, count]) => `<span class="stat-pill"><b>${escapeHtml(code)}</b>${count}</span>`)
    .join('');
  const header = Array.from({ length: days }, (_, i) => `<th>${i + 1}</th>`).join('');
  const rows = people.map((person) => `
    <tr>
      <td><strong>${escapeHtml(person.name)}</strong></td>
      ${person.schedules.slice(0, days).map((code) => {
        const info = getCodeInfo(code);
        return `<td><span class="badge ${badgeClass(info.type)}">${escapeHtml(code || '-')}</span></td>`;
      }).join('')}
    </tr>
  `).join('');
  return `
    <div class="view-title"><h3>입력 데이터 확인</h3><span>${state.year}년 ${state.month}월 · ${people.length}명</span></div>
    <div class="review-summary-grid">
      <div class="summary-card"><p>입력 인원</p><strong>${people.length}명</strong><span>검수표에 반영된 사람 수</span></div>
      <div class="summary-card"><p>날짜 범위</p><strong>1~${days}일</strong><span>d01~d${String(days).padStart(2, '0')} 사용</span></div>
      <div class="summary-card"><p>내 이름</p><strong>${escapeHtml(state.myName || '-')}</strong><span>홈/주간/월간 기준</span></div>
      <div class="summary-card"><p>주요 코드</p><div class="stat-pill-wrap">${topCodes || '<span class="stat-pill">없음</span>'}</div></div>
    </div>
    <div class="action-row review-actions">
      <button class="primary-btn" data-go-page="editor">검수표에서 수정하기</button>
      <button class="secondary-btn" data-go-page="daily">일간 보기</button>
      <button class="secondary-btn" data-go-page="weekly">주간 보기</button>
      <button class="secondary-btn" data-go-page="monthly">월간 보기</button>
      <button class="secondary-btn" data-go-page="dayRoster">출근 현황 보기</button>
    </div>
    <div class="table-scroll review-table-wrap">
      <table class="schedule-table review-table">
        <thead><tr><th>이름</th>${header}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
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

function getDateObj(day) {
  return new Date(state.year, state.month - 1, day);
}

function getCodeInfo(code) {
  if (!code) return { label: '미입력', start: '', end: '', type: 'empty' };
  return state.codes[code] || { label: '코드 미등록', start: '', end: '', type: 'unknown' };
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

function renderSummary() {
  const person = getMyPerson();
  const selectedDay = getCurrentDisplayDay();
  const todayCode = person?.schedules[selectedDay - 1] || '';
  const todayInfo = getCodeInfo(todayCode);
  const rows = person ? getScheduleRowsForPerson(person) : [];
  const nextOff = rows.find((row) => row.day >= selectedDay && ['off', 'leave'].includes(row.type));
  const workCount = rows.filter((row) => row.type === 'work').length;
  const offCount = rows.filter((row) => row.type === 'off').length;
  const leaveCount = rows.filter((row) => row.type === 'leave').length;

  el('summaryCards').innerHTML = `
    <div class="summary-card"><p>오늘 내 일정</p><strong>${todayCode || '-'}</strong><span>${formatTime(todayInfo) || todayInfo.label}</span></div>
    <div class="summary-card"><p>다음 휴무</p><strong>${nextOff ? nextOff.dateText : '-'}</strong><span>${nextOff ? `${nextOff.code} ${nextOff.label}` : '이번 달 남은 휴무가 없어요.'}</span></div>
    <div class="summary-card"><p>이번 달 요약</p><strong>${workCount}일 근무</strong><span>휴무 ${offCount}일 · 연차 ${leaveCount}일</span></div>
    <div class="summary-card"><p>오늘 출근 인원</p><strong>${getDayRoster(selectedDay).workTotal}명</strong><span>휴무/연차 ${getDayRoster(selectedDay).offTotal}명</span></div>
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
    dataInput: renderDataInput,
    dataReview: renderDataReview,
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
  document.querySelectorAll('.app-page').forEach((section) => {
    section.classList.toggle('active', section.dataset.page === page);
  });
  document.querySelectorAll('.sheet-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.page === page);
  });
  if (page === 'extract') setTimeout(drawOcrPreview, 0);
  if (page === 'dataInput') renderCsvPreview();
  if (page === 'dataReview') renderViews();
  if (shouldSave) saveState(false);
  if (shouldSave) window.scrollTo({ top: 0, behavior: 'smooth' });
}


function getCurrentDisplayDay() {
  const today = new Date();
  if (today.getFullYear() === state.year && today.getMonth() + 1 === state.month) {
    return today.getDate();
  }
  const selected = new Date(state.selectedDate || Date.now());
  return isSameMonth(selected) ? selected.getDate() : 1;
}

function getDisplayDayLabel(day) {
  const today = new Date();
  if (today.getFullYear() === state.year && today.getMonth() + 1 === state.month && today.getDate() === day) {
    return '오늘';
  }
  return '선택일';
}

function renderDaily() {
  const person = getMyPerson();
  const day = getCurrentDisplayDay();
  const code = person?.schedules[day - 1] || '';
  const info = getCodeInfo(code);
  const roster = getDayRoster(day);
  return `
    <div class="view-title"><h3>${state.month}/${day}(${dayNames[getDateObj(day).getDay()]}) 일간 보기</h3></div>
    <div class="card-grid">
      <div class="info-card"><h4>내 스케줄</h4><div class="list-row"><strong>${state.myName || '이름 미입력'}</strong><span>${info.label}</span><span class="badge ${badgeClass(info.type)}">${code || '-'}</span></div><p>${formatTime(info) || '시간 정보 없음'}</p></div>
      <div class="info-card"><h4>오늘 요약</h4><p>출근 ${roster.workTotal}명 · 휴무/연차 ${roster.offTotal}명</p><p>가장 이른 출근: ${roster.earliest || '-'}</p></div>
    </div>
    ${renderRosterBlocks(day)}
  `;
}

function renderWeekly() {
  const person = getMyPerson();
  const selected = new Date(state.selectedDate || Date.now());
  const baseDay = isSameMonth(selected) ? selected.getDate() : getCurrentDisplayDay();
  const date = getDateObj(baseDay);
  const mondayOffset = (date.getDay() + 6) % 7;
  const monday = baseDay - mondayOffset;
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const day = monday + i;
    if (day < 1 || day > daysInMonth(state.year, state.month)) continue;
    const code = person?.schedules[day - 1] || '';
    const info = getCodeInfo(code);
    rows.push({ day, code, info });
  }
  const workCount = rows.filter((r) => r.info.type === 'work').length;
  const offCount = rows.filter((r) => ['off', 'leave'].includes(r.info.type)).length;
  const earlyTimes = rows.map((r) => r.info.start).filter(Boolean).sort();
  return `
    <div class="view-title"><h3>주간 보기</h3><span>${state.month}/${rows[0]?.day || baseDay}~${state.month}/${rows[rows.length - 1]?.day || baseDay} · 근무 ${workCount}일 · 휴무/연차 ${offCount}일</span></div>
    <div class="week-summary-grid">
      <div class="summary-card"><p>이번 주 근무</p><strong>${workCount}일</strong><span>내 이름 기준</span></div>
      <div class="summary-card"><p>이번 주 휴무/연차</p><strong>${offCount}일</strong><span>DO/PH/SD/AL 등</span></div>
      <div class="summary-card"><p>가장 이른 출근</p><strong>${earlyTimes[0] || '-'}</strong><span>${earlyTimes[0] ? '이번 주 기준' : '시간 정보 없음'}</span></div>
    </div>
    <div class="week-strip">
      ${rows.map(({ day, code, info }) => `<button class="week-day-card ${badgeClass(info.type)}" data-pick-day="${day}"><b>${dayNames[getDateObj(day).getDay()]}</b><strong>${state.month}/${day}</strong><span class="badge ${badgeClass(info.type)}">${code || '-'}</span><small>${formatTime(info) || info.label}</small></button>`).join('')}
    </div>
  `;
}

function renderMonthly() {
  const person = getMyPerson();
  const days = daysInMonth(state.year, state.month);
  const first = new Date(state.year, state.month - 1, 1).getDay();
  const displayDay = getCurrentDisplayDay();
  let html = `<div class="view-title"><h3>${state.year}년 ${state.month}월 월간 캘린더</h3><span>날짜를 누르면 일간 보기로 이동합니다</span></div><div class="calendar enhanced-calendar">`;
  dayNames.forEach((name, idx) => html += `<div class="calendar-head ${idx === 0 ? 'sun' : idx === 6 ? 'sat' : ''}">${name}</div>`);
  for (let i = 0; i < first; i++) html += `<div class="day-cell empty"></div>`;
  for (let day = 1; day <= days; day++) {
    const code = person?.schedules[day - 1] || '';
    const info = getCodeInfo(code);
    const selectedClass = day === displayDay ? 'today' : '';
    html += `<button class="day-cell ${selectedClass} ${badgeClass(info.type)}" data-pick-day="${day}"><span class="day-number">${day}</span><span class="badge day-code ${badgeClass(info.type)}">${code || '-'}</span><small>${formatTime(info) || info.label}</small></button>`;
  }
  html += '</div>';
  return html;
}

function renderDayRoster() {
  const day = getCurrentDisplayDay();
  const label = getDisplayDayLabel(day);
  return `<div class="view-title"><h3>${state.month}/${day} ${label} 출근 현황</h3><span>기준 날짜가 바뀌면 이 내용도 함께 바뀝니다</span></div>${renderRosterBlocks(day)}`;
}

function renderRosterBlocks(day) {
  const roster = getDayRoster(day);
  const workSections = Object.entries(roster.byStart).sort(([a], [b]) => a.localeCompare(b)).map(([time, people]) => `
    <div class="roster-section"><h4>${time} 출근</h4><div class="roster-pill-wrap">${people.map((p) => `<span class="person-pill">${escapeHtml(p.name)} <small>${p.code}</small></span>`).join('')}</div></div>
  `).join('') || '<p>출근자가 없거나 입력된 근무 코드가 없습니다.</p>';
  const off = roster.offPeople.map((p) => `<span class="person-pill">${escapeHtml(p.name)} <small>${p.code}</small></span>`).join('') || '<span class="person-pill">없음</span>';
  return `<div class="info-card">${workSections}<div class="roster-section"><h4>휴무/연차</h4><div class="roster-pill-wrap">${off}</div></div></div>`;
}

function renderOffDays() {
  const person = getMyPerson();
  const rows = person ? getScheduleRowsForPerson(person).filter((row) => ['off', 'leave'].includes(row.type)) : [];
  const grouped = rows.reduce((acc, row) => {
    const key = row.code || '기타';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
  const groupHtml = Object.entries(grouped).map(([code, items]) => `
    <div class="off-group-card">
      <div class="off-group-head"><strong>${escapeHtml(code)}</strong><span>${items.length}일</span></div>
      <div class="roster-pill-wrap">${items.map((row) => `<span class="person-pill">${row.dateText}</span>`).join('')}</div>
    </div>
  `).join('');
  return `
    <div class="view-title"><h3>휴무일 보기</h3><span>${state.myName || '내 이름'} 기준 · 총 ${rows.length}일</span></div>
    <div class="review-summary-grid">
      <div class="summary-card"><p>전체 휴무/연차</p><strong>${rows.length}일</strong><span>이번 달 내 일정 기준</span></div>
      <div class="summary-card"><p>연차</p><strong>${rows.filter((r) => r.type === 'leave').length}일</strong><span>AL 코드</span></div>
      <div class="summary-card"><p>휴무</p><strong>${rows.filter((r) => r.type === 'off').length}일</strong><span>DO/PH/SD 등</span></div>
    </div>
    <div class="off-group-grid">${groupHtml || '<p>휴무일이 없거나 내 이름이 선택되지 않았습니다.</p>'}</div>
    <div class="list off-list-detail">${rows.map((row) => `<div class="list-row"><strong>${row.dateText}</strong><span>${row.label}</span><span class="badge ${badgeClass(row.type)}">${row.code}</span></div>`).join('')}</div>
  `;
}

function renderShare() {
  const text = makeShareText();
  const day = getCurrentDisplayDay();
  return `
    <div class="view-title"><h3>공유 / 엑셀</h3><span>${state.month}/${day} 출근 현황은 기준 날짜에 맞춰 자동 생성됩니다</span></div>
    <div class="notice"><strong>카톡용 텍스트</strong><span>아래 내용은 현재 선택된 날짜 또는 실제 오늘 날짜를 기준으로 매번 다시 만들어집니다. 날짜를 바꾸려면 설정·이미지의 날짜 선택 또는 월간 캘린더에서 날짜를 눌러 주세요.</span></div>
    <textarea id="shareText" class="share-box" readonly>${escapeHtml(text)}</textarea>
    <div class="action-row" style="margin-top:12px;">
      <button id="copyShareButton" class="primary-btn">카톡용 텍스트 복사</button>
      <button id="downloadExcelButton" class="secondary-btn">엑셀 다운로드</button>
    </div>
  `;
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
        const peopleCount = savedMonth?.people?.filter((p) => p.name).length || 0;
        const activeClass = record.key === monthKey() ? 'active' : '';
        return `
          <article class="archive-card ${activeClass}">
            <div class="archive-thumb">${record.thumbData ? `<img src="${record.thumbData}" alt="${record.key} 근무표" />` : '<span>이미지</span>'}</div>
            <div class="archive-body">
              <strong>${record.year}년 ${record.month}월</strong>
              <span>${escapeHtml(record.imageName || '스케줄표 이미지')}</span>
              <small>스케줄 ${peopleCount}명 · 저장 ${formatSavedDate(record.updatedAt)}</small>
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
  const rows = Object.entries(state.codes).map(([code, info]) => `
    <div class="code-editor-row">
      <input data-code-key="${code}" value="${escapeHtml(code)}" />
      <input data-code-prop="label" data-code="${code}" value="${escapeHtml(info.label)}" placeholder="의미" />
      <input data-code-prop="start" data-code="${code}" value="${escapeHtml(info.start)}" placeholder="출근" />
      <input data-code-prop="end" data-code="${code}" value="${escapeHtml(info.end)}" placeholder="퇴근" />
      <button class="ghost-btn delete-code" data-code="${code}">×</button>
    </div>
  `).join('');
  return `
    <div class="view-title"><h3>근무 코드 설정</h3><button id="addCodeButton" class="secondary-btn">코드 추가</button></div>
    <div class="notice"><strong>유형 규칙</strong><span>시간이 있으면 근무, 시간이 없고 AL이면 연차, DO/PH/SD/RT/CC는 휴무로 처리됩니다.</span></div>
    <div id="codeEditor">${rows}</div>
  `;
}

function bindViewEvents() {
  document.querySelectorAll('[data-go-page]').forEach((button) => {
    button.onclick = () => switchPage(button.dataset.goPage, true);
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
  el('copyShareButton')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(el('shareText').value);
    alert('카톡용 텍스트를 복사했어요.');
  });
  el('downloadExcelButton')?.addEventListener('click', downloadExcel);
  document.querySelectorAll('.load-month').forEach((button) => {
    button.addEventListener('click', async () => {
      const { year, month } = parseMonthKey(button.dataset.monthKey);
      await changeActiveMonth(year, month);
      switchPage('setup', true);
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
      state.codes[code].type = deriveCodeType(code, state.codes[code]);
      renderAll();
      saveState(false);
    });
  });
  document.querySelectorAll('.delete-code').forEach((button) => {
    button.addEventListener('click', () => {
      delete state.codes[button.dataset.code];
      renderViews();
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
    if (info.type === 'work' && info.start) {
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

function makeShareText() {
  const person = getMyPerson();
  if (!person) return '내 이름을 입력하고, 해당 이름의 스케줄을 먼저 입력해 주세요.';
  const rows = getScheduleRowsForPerson(person);
  const offRows = rows.filter((row) => ['off', 'leave'].includes(row.type));
  const day = getCurrentDisplayDay();
  const roster = getDayRoster(day);
  const main = rows.map((row) => `${row.dateText} ${row.code || '-'} ${formatTime(row) || row.label}`).join('\n');
  const off = offRows.map((row) => row.dateText).join(', ') || '없음';
  const rosterText = Object.entries(roster.byStart).sort(([a], [b]) => a.localeCompare(b)).map(([time, people]) => `${time} 출근: ${people.map((p) => p.name).join(', ')}`).join('\n');
  return `[${state.month}/${day} 출근 현황]\n${rosterText || '출근자 없음'}\n휴무/연차: ${roster.offPeople.map((p) => p.name).join(', ') || '없음'}\n\n[${state.year}년 ${state.month}월 ${state.myName} 스케줄]\n${main}\n\n[휴무일]\n${off}`;
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(myRows), '내 스케줄');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offRows), '휴무일');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRows), '전체 데이터');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(codeRows), '코드표');
  XLSX.writeFile(wb, `schedule_${state.year}_${String(state.month).padStart(2, '0')}_${state.myName || 'me'}.xlsx`);
}

function deriveCodeType(code, info) {
  if (info.start || info.end) return 'work';
  if (code === 'AL') return 'leave';
  if (['DO', 'PH', 'SD', 'RT', 'CC'].includes(code)) return 'off';
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
    state.activePage = parsed.activePage || parsed.activeTab || 'home';
    ensureMonthStore();
  } catch (e) {
    console.warn('저장 데이터 로드 실패', e);
  }
}

function bootScheduleApp() {
  if (window.__scheduleAppBooted) return;
  window.__scheduleAppBooted = true;
  init().catch((error) => {
    console.error('앱 초기화 실패', error);
    setAuthMessage(`앱 초기화 중 오류가 발생했어요: ${error?.message || error}`, 'error');
    showAuthGate();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootScheduleApp);
} else {
  bootScheduleApp();
}
