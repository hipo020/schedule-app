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
  ocr: getDefaultOcrState(),
};

const el = (id) => document.getElementById(id);
const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

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
    names: ['곽병우', '이준호', '유희수', '김도영', '이다운', '이상민', '정세완'].join('\n'),
    rect: { x: 18.3, y: 12.1, w: 49.6, h: 25.5 },
    results: [],
  };
}

function init() {
  loadState();
  initMonthSelect();
  bindEvents();
  ensurePeople();
  syncInputs();
  renderUploadedImage();
  syncOcrInputs();
  renderOcrResultTable();
  setTimeout(drawOcrPreview, 0);
  renderScheduleTable();
  renderAll();
}

function bindEvents() {
  el('yearInput').addEventListener('input', (e) => { state.year = Number(e.target.value); renderScheduleTable(); renderAll(); saveState(false); });
  el('monthInput').addEventListener('change', (e) => { state.month = Number(e.target.value); renderScheduleTable(); renderAll(); saveState(false); });
  el('myNameInput').addEventListener('input', (e) => { state.myName = e.target.value.trim(); renderAll(); saveState(false); });
  el('selectedDateInput').addEventListener('change', (e) => { state.selectedDate = e.target.value; renderAll(); saveState(false); });
  el('uploadButton').addEventListener('click', () => el('imageInput').click());
  el('imageInput').addEventListener('change', handleImageUpload);
  el('loadSampleButton').addEventListener('click', loadSample);
  el('loadSampleFromUploadButton')?.addEventListener('click', () => { loadSample(); switchPage('home', true); });
  el('clearButton').addEventListener('click', clearAll);
  el('saveButton').addEventListener('click', () => saveState(true));
  el('addPersonButton').addEventListener('click', addPerson);
  el('removeEmptyRowsButton').addEventListener('click', removeEmptyRows);
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

function handleImageUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    state.imageData = reader.result;
    state.imageName = file.name;
    renderUploadedImage();
    saveState(false);
  };
  reader.readAsDataURL(file);
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
      status.innerHTML = `<strong>업로드 완료</strong><span>${escapeHtml(state.imageName || '스케줄표 이미지')}</span><small>다음 단계: 자동 추출 페이지에서 표 영역을 확인한 뒤 추출을 시작해 주세요.</small>`;
      status.classList.add('uploaded');
    }
    if (actions) actions.classList.add('show');
  } else {
    image.removeAttribute('src');
    image.style.display = 'none';
    emptyPreview.style.display = 'grid';
    if (status) {
      status.textContent = '아직 업로드된 이미지가 없어요.';
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
    state.ocr.names = getDefaultOcrState().names;
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
  const selected = new Date(state.selectedDate || Date.now());
  const selectedDay = isSameMonth(selected) ? selected.getDate() : 1;
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
    settings: renderSettings,
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
  if (shouldSave) saveState(false);
  if (shouldSave) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderDaily() {
  const person = getMyPerson();
  const selected = new Date(state.selectedDate || Date.now());
  const day = isSameMonth(selected) ? selected.getDate() : 1;
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
  const baseDay = isSameMonth(selected) ? selected.getDate() : 1;
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
  return `
    <div class="view-title"><h3>주간 보기</h3><span>근무 ${workCount}일 · 휴무/연차 ${offCount}일</span></div>
    <div class="list">
      ${rows.map(({ day, code, info }) => `<div class="list-row"><strong>${state.month}/${day}(${dayNames[getDateObj(day).getDay()]})</strong><span>${formatTime(info) || info.label}</span><span class="badge ${badgeClass(info.type)}">${code || '-'}</span></div>`).join('')}
    </div>
  `;
}

function renderMonthly() {
  const person = getMyPerson();
  const days = daysInMonth(state.year, state.month);
  const first = new Date(state.year, state.month - 1, 1).getDay();
  const selectedDay = new Date(state.selectedDate || Date.now()).getDate();
  let html = `<div class="view-title"><h3>${state.year}년 ${state.month}월 월간 캘린더</h3></div><div class="calendar">`;
  dayNames.forEach((name) => html += `<div class="calendar-head">${name}</div>`);
  for (let i = 0; i < first; i++) html += `<div class="day-cell empty"></div>`;
  for (let day = 1; day <= days; day++) {
    const code = person?.schedules[day - 1] || '';
    const info = getCodeInfo(code);
    const todayClass = day === selectedDay && isSameMonth(new Date(state.selectedDate || Date.now())) ? 'today' : '';
    html += `<button class="day-cell ${todayClass}" data-pick-day="${day}"><span class="day-number">${day}</span><span class="badge day-code ${badgeClass(info.type)}">${code || '-'}</span><small>${formatTime(info) || info.label}</small></button>`;
  }
  html += '</div>';
  return html;
}

function renderDayRoster() {
  const selected = new Date(state.selectedDate || Date.now());
  const day = isSameMonth(selected) ? selected.getDate() : 1;
  return `<div class="view-title"><h3>${state.month}/${day} 오늘 출근 현황</h3></div>${renderRosterBlocks(day)}`;
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
  return `
    <div class="view-title"><h3>휴무일만 보기</h3><span>총 ${rows.length}일</span></div>
    <div class="list">${rows.map((row) => `<div class="list-row"><strong>${row.dateText}</strong><span>${row.label}</span><span class="badge ${badgeClass(row.type)}">${row.code}</span></div>`).join('') || '<p>휴무일이 없거나 내 이름이 선택되지 않았습니다.</p>'}</div>
  `;
}

function renderShare() {
  const text = makeShareText();
  return `
    <div class="view-title"><h3>카톡 공유 / 엑셀 저장</h3></div>
    <textarea id="shareText" class="share-box" readonly>${escapeHtml(text)}</textarea>
    <div class="action-row" style="margin-top:12px;">
      <button id="copyShareButton" class="primary-btn">카톡용 텍스트 복사</button>
      <button id="downloadExcelButton" class="secondary-btn">엑셀 다운로드</button>
    </div>
  `;
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
  const selected = new Date(state.selectedDate || Date.now());
  const day = isSameMonth(selected) ? selected.getDate() : 1;
  const roster = getDayRoster(day);
  const main = rows.map((row) => `${row.dateText} ${row.code || '-'} ${formatTime(row) || row.label}`).join('\n');
  const off = offRows.map((row) => row.dateText).join(', ') || '없음';
  const rosterText = Object.entries(roster.byStart).sort(([a], [b]) => a.localeCompare(b)).map(([time, people]) => `${time} 출근: ${people.map((p) => p.name).join(', ')}`).join('\n');
  return `[${state.year}년 ${state.month}월 ${state.myName} 스케줄]\n\n${main}\n\n[휴무일]\n${off}\n\n[${state.month}/${day} 출근 현황]\n${rosterText || '출근자 없음'}\n휴무/연차: ${roster.offPeople.map((p) => p.name).join(', ') || '없음'}`;
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

function saveState(showAlert = false) {
  try {
    localStorage.setItem('shift-organizer-v1', JSON.stringify({ ...state }));
    if (showAlert) alert('저장했어요. 같은 브라우저에서 다시 열면 유지됩니다.');
  } catch (error) {
    console.warn('저장 실패', error);
    if (state.imageData) {
      const imageData = state.imageData;
      state.imageData = '';
      try {
        localStorage.setItem('shift-organizer-v1', JSON.stringify({ ...state }));
        state.imageData = imageData;
        alert('이미지 용량이 커서 스케줄 데이터만 저장했어요. 이미지는 새로고침 후 다시 업로드해 주세요.');
      } catch (secondError) {
        state.imageData = imageData;
        alert('브라우저 저장 공간이 부족해서 저장하지 못했어요.');
      }
    }
  }
}

function loadState() {
  const saved = localStorage.getItem('shift-organizer-v1');
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    Object.assign(state, parsed);
    state.codes = parsed.codes || getDefaultCodes();
    state.ocr = { ...getDefaultOcrState(), ...(parsed.ocr || {}) };
    state.activePage = parsed.activePage || parsed.activeTab || 'home';
  } catch (e) {
    console.warn('저장 데이터 로드 실패', e);
  }
}

init();
