const state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  myName: '',
  selectedDate: toDateInputValue(new Date()),
  people: [],
  codes: getDefaultCodes(),
  activeTab: 'daily',
};

const el = (id) => document.getElementById(id);
const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

function getDefaultCodes() {
  return {
    BM: { label: '근무', start: '08:00', end: '17:00', type: 'work' },
    AM: { label: '근무', start: '07:30', end: '16:30', type: 'work' },
    AD: { label: '근무', start: '07:00', end: '16:00', type: 'work' },
    AK: { label: '근무', start: '10:30', end: '19:30', type: 'work' },
    AL: { label: '연차', start: '', end: '', type: 'leave' },
    DO: { label: '휴무', start: '', end: '', type: 'off' },
    PH: { label: '휴무', start: '', end: '', type: 'off' },
    SD: { label: '남은휴무', start: '', end: '', type: 'off' },
    RT: { label: '예비군', start: '', end: '', type: 'off' },
    CC: { label: '경조휴가', start: '', end: '', type: 'off' },
  };
}

function init() {
  loadState();
  initMonthSelect();
  bindEvents();
  ensurePeople();
  syncInputs();
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
  el('clearButton').addEventListener('click', clearAll);
  el('saveButton').addEventListener('click', () => saveState(true));
  el('addPersonButton').addEventListener('click', addPerson);
  el('removeEmptyRowsButton').addEventListener('click', removeEmptyRows);
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab;
      document.querySelectorAll('.tab-button').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      renderTab();
    });
  });
}

function initMonthSelect() {
  el('monthInput').innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}월</option>`).join('');
}

function syncInputs() {
  el('yearInput').value = state.year;
  el('monthInput').value = state.month;
  el('myNameInput').value = state.myName;
  el('selectedDateInput').value = state.selectedDate;
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
  renderScheduleTable();
  renderAll();
  saveState(true);
}

function handleImageUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const image = el('imagePreview');
  image.src = url;
  image.style.display = 'block';
  el('emptyPreview').style.display = 'none';
}

function renderAll() {
  renderSummary();
  renderTab();
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

function renderTab() {
  const content = el('tabContent');
  const map = {
    daily: renderDaily,
    weekly: renderWeekly,
    monthly: renderMonthly,
    dayRoster: renderDayRoster,
    offDays: renderOffDays,
    share: renderShare,
    settings: renderSettings,
  };
  content.innerHTML = map[state.activeTab]();
  bindTabEvents();
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

function bindTabEvents() {
  document.querySelectorAll('[data-pick-day]').forEach((button) => {
    button.addEventListener('click', () => {
      const day = String(button.dataset.pickDay).padStart(2, '0');
      state.selectedDate = `${state.year}-${String(state.month).padStart(2, '0')}-${day}`;
      syncInputs();
      state.activeTab = 'daily';
      document.querySelectorAll('.tab-button').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'daily'));
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
    renderTab();
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
      renderTab();
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
  localStorage.setItem('shift-organizer-v1', JSON.stringify({ ...state }));
  if (showAlert) alert('저장했어요. 같은 브라우저에서 다시 열면 유지됩니다.');
}

function loadState() {
  const saved = localStorage.getItem('shift-organizer-v1');
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    Object.assign(state, parsed);
    state.codes = parsed.codes || getDefaultCodes();
  } catch (e) {
    console.warn('저장 데이터 로드 실패', e);
  }
}

init();
