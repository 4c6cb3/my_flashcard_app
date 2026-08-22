// 初期サンプルデータ
const defaultDecks = [
  {
    id: 'deck-1',
    title: '雑学クイズ基本セット',
    orderMode: 'SHUFFLE',
    lastStudied: Date.now(),
    cards: [
      {
        id: 'card-1',
        question: '日本の現在の首都として事実上機能している、関東地方に位置する都道府県はどこでしょう？',
        answer: '東京都',
        explanation: '人口は約1400万人で、日本の政治・経済の中心地です。',
        image: '',
        dueDate: 0,
        interval: 0,
        easeFactor: 2.5,
        reps: 0
      },
      {
        id: 'card-2',
        question: '太陽系で最も大きい、木星型惑星の代表格は何でしょう？',
        answer: '木星',
        explanation: '主に水素とヘリウムでできており、大赤斑という巨大な嵐が存在します。',
        image: '',
        dueDate: 0,
        interval: 0,
        easeFactor: 2.5,
        reps: 0
      }
    ]
  }
];

// デフォルトキーバインド
const DEFAULT_KEY_BINDS = {
  advance: ['Space'],
  again: ['1'],
  hard: ['2'],
  good: ['3'],
  easy: ['4']
};

const DEFAULT_USER_CONFIG = {
  theme: 'device',
  fontSize: 15,
  mode: 'NORMAL',
  charSpeed: 150,
  deckSortOrder: 'RECENT',
  enableLongPress: true,
  holdSpeed: 1.0, 
  enableCardLevel: true,
  keyBinds: { ...DEFAULT_KEY_BINDS }
};

// アプリ状態＆設定
let decks = [];
let trashDecks = [];
let studyLogs = {};
let dailyStudyHistory = {};
let currentDeck = null;
let studyQueue = [];
let currentCard = null;
let targetDeckForAddCard = null;
let targetDeckForCardList = null;
let targetDeckForSettings = null;
let targetCardForEdit = null;
let currentEditingImageData = '';
let currentAddingImageData = '';

let undoStack = [];
let redoStack = [];

let currentCalendarDate = new Date();
let cardListPageIndex = 0;
const CARDS_PER_PAGE = 100;

let userConfig = { ...DEFAULT_USER_CONFIG };
let tempFontSize = 15;
let todayCardsSortOrder = 'RECENT';

let charIndex = 0;
let timer = null;
let previewTimer = null;
let startTime = 0;
let stopTime = 0;
let state = 'IDLE'; // IDLE, TYPING, STOPPED, ANSWERED

// 💡 長押し制御用変数
let holdTimer = null;
let holdInterval = null;
let bindingKeyTarget = null;
let isHolding = false;
let didHold = false;
let aCharIndex = 0;
let holdPhase = 'NONE'; // 'NONE', 'QUESTION', 'ANSWER'

// タッチ操作・ゴーストタップ防止用
let touchStartX = 0;
let touchStartY = 0;
let isTouchDevice = false;
let isScrolling = false;
let lastHoldEndTime = 0;

const SAMPLE_PREVIEW_TEXT = '山梨県と静岡県にまたがる、日本で一番高い山は何でしょう？';

// DOM要素
let menuScreen, statsScreen, optionScreen, quizScreen,
  addCardModal, editCardModal, cardListModal, deckSettingsModal,
  csvImportModal, trashModal, trashListContainer, deckListEl, csvInput,
  currentDeckTitleEl, progressInfoEl, questionEl, answerSectionEl,
  answerTextEl, explanationTextEl, answerImageContainer, answerImageEl,
  searchTermTextEl, resultStatsEl, statProgressEl, statTimeEl, buttonsEl,
  tapHintEl, streakDaysEl, streakMessageEl, calendarTitleEl, calendarGridEl,
  newCardQ, newCardA, newCardExp, editCardQ, editCardA, editCardExp,
  addCardImgInput, addCardImgPreview, addCardImgElement,
  editCardImgInput, editCardImgPreview, editCardImgElement,
  speedOptionGroup, charSpeedRange, speedValueDisplay, previewTextContainer,
  fontSizeRange, fontSizeValueDisplay, cardListDeckTitle, cardListContainer,
  cardPaginationEl, deckSettingsTitle, undoBtn, redoBtn;

function initDOMElements() {
  menuScreen = document.getElementById('menu-screen');
  statsScreen = document.getElementById('stats-screen');
  optionScreen = document.getElementById('option-screen');
  quizScreen = document.getElementById('quiz-screen');
  addCardModal = document.getElementById('add-card-modal');
  editCardModal = document.getElementById('edit-card-modal');
  cardListModal = document.getElementById('card-list-modal');
  deckSettingsModal = document.getElementById('deck-settings-modal');
  csvImportModal = document.getElementById('csv-import-modal');
  trashModal = document.getElementById('trash-modal');
  trashListContainer = document.getElementById('trash-list-container');

  deckListEl = document.getElementById('deck-list');
  csvInput = document.getElementById('csv-file-input');

  currentDeckTitleEl = document.getElementById('current-deck-title');
  progressInfoEl = document.getElementById('progress-info');
  questionEl = document.getElementById('question-text');
  answerSectionEl = document.getElementById('answer-section');
  answerTextEl = document.getElementById('answer-text');
  explanationTextEl = document.getElementById('explanation-text');
  answerImageContainer = document.getElementById('answer-image-container');
  answerImageEl = document.getElementById('answer-image');
  searchTermTextEl = document.getElementById('search-term-text');
  resultStatsEl = document.getElementById('result-stats');
  statProgressEl = document.getElementById('stat-progress');
  statTimeEl = document.getElementById('stat-time');
  buttonsEl = document.getElementById('action-buttons');
  tapHintEl = document.getElementById('tap-hint');

  streakDaysEl = document.getElementById('streak-days');
  streakMessageEl = document.getElementById('streak-message');
  calendarTitleEl = document.getElementById('calendar-title');
  calendarGridEl = document.getElementById('calendar-grid');

  newCardQ = document.getElementById('new-card-q');
  newCardA = document.getElementById('new-card-a');
  newCardExp = document.getElementById('new-card-exp');

  addCardImgInput = document.getElementById('add-card-img-input');
  addCardImgPreview = document.getElementById('add-card-img-preview');
  addCardImgElement = document.getElementById('add-card-img-element');

  editCardQ = document.getElementById('edit-card-q');
  editCardA = document.getElementById('edit-card-a');
  editCardExp = document.getElementById('edit-card-exp');
  editCardImgInput = document.getElementById('edit-card-img-input');
  editCardImgPreview = document.getElementById('edit-card-img-preview');
  editCardImgElement = document.getElementById('edit-card-img-element');

  speedOptionGroup = document.getElementById('speed-option-group');
  charSpeedRange = document.getElementById('char-speed-range');
  speedValueDisplay = document.getElementById('speed-value-display');
  previewTextContainer = document.getElementById('preview-text-container');

  fontSizeRange = document.getElementById('font-size-range');
  fontSizeValueDisplay = document.getElementById('font-size-value-display');

  cardListDeckTitle = document.getElementById('card-list-deck-title');
  cardListContainer = document.getElementById('card-list-container');
  cardPaginationEl = document.getElementById('card-pagination');
  deckSettingsTitle = document.getElementById('deck-settings-title');

  undoBtn = document.getElementById('undo-btn');
  redoBtn = document.getElementById('redo-btn');
}

/* =====================================================================
 * IndexedDB 処理
 * ===================================================================== */
const DB_NAME = 'memoly_db';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key, val) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function migrateLocalStorage() {
  const keys = ['memoly_config', 'memoly_decks', 'memoly_trash_decks', 'memoly_logs', 'memoly_daily_history'];
  const legacyKeys = ['aoki_config', 'aoki_decks', 'aoki_trash_decks', 'aoki_logs', 'aoki_daily_history'];
  
  for (let i = 0; i < keys.length; i++) {
    let data = await idbGet(keys[i]);
    if (!data) {
      const localData = localStorage.getItem(legacyKeys[i]) || localStorage.getItem(keys[i]);
      if (localData) {
        try {
          data = JSON.parse(localData);
          await idbSet(keys[i], data);
          localStorage.removeItem(legacyKeys[i]);
        } catch(e) {}
      }
    }
  }
}

function saveDecks() { idbSet('memoly_decks', decks).catch(e => console.error(e)); }
function saveConfig() { idbSet('memoly_config', userConfig).catch(e => console.error(e)); }
function saveLogs() { idbSet('memoly_logs', studyLogs).catch(e => console.error(e)); }
function saveDailyHistory() { idbSet('memoly_daily_history', dailyStudyHistory).catch(e => console.error(e)); }
function saveTrashDecks() { idbSet('memoly_trash_decks', trashDecks).catch(e => console.error(e)); }

/* =====================================================================
 * 画像処理 & UI
 * ===================================================================== */
function resizeImage(file, maxWidth = 600, maxHeight = 600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        let width = img.width; let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        } else {
          if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = err => reject(err);
    };
    reader.onerror = err => reject(err);
  });
}

function removeAddCardImage() {
  currentAddingImageData = '';
  if (addCardImgInput) addCardImgInput.value = '';
  if (addCardImgElement) addCardImgElement.src = '';
  if (addCardImgPreview) addCardImgPreview.classList.add('hidden');
}

function removeEditCardImage() {
  currentEditingImageData = '';
  if (editCardImgInput) editCardImgInput.value = '';
  if (editCardImgElement) editCardImgElement.src = '';
  if (editCardImgPreview) editCardImgPreview.classList.add('hidden');
}

function setupImageDropZone(dropZoneId, inputId, onImageLoaded) {
  const dropZone = document.getElementById(dropZoneId);
  const input = document.getElementById(inputId);
  if (!dropZone || !input) return;

  dropZone.addEventListener('click', () => input.click());

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
  });
  ['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.add('dragover'), false));
  ['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.remove('dragover'), false));

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length) handleImageFile(files[0]);
  });
  input.addEventListener('change', (e) => {
    if (e.target.files.length) handleImageFile(e.target.files[0]);
  });

  async function handleImageFile(file) {
    if (!file.type.startsWith('image/')) { alert('画像ファイルを選択してください。'); return; }
    try {
      const dataUrl = await resizeImage(file, 600, 600, 0.7);
      onImageLoaded(dataUrl);
    } catch (err) { alert('画像の処理に失敗しました。'); }
  }
}

/* =====================================================================
 * アプリ初期化
 * ===================================================================== */
async function initApp() {
  initDOMElements();
  await migrateLocalStorage();

  const savedConfig = await idbGet('memoly_config');
  if (savedConfig) {
    userConfig = { ...DEFAULT_USER_CONFIG, ...savedConfig };
    if (typeof userConfig.fontSize === 'string') userConfig.fontSize = 15;
    if (!userConfig.keyBinds) {
      userConfig.keyBinds = JSON.parse(JSON.stringify(DEFAULT_KEY_BINDS));
    }
  }
  tempFontSize = userConfig.fontSize;

  const savedDecks = await idbGet('memoly_decks');
  if (savedDecks) {
    decks = savedDecks;
    decks.forEach(d => {
      if (!d.orderMode) d.orderMode = 'SHUFFLE';
      if (!d.lastStudied) d.lastStudied = 0;
    });
  } else { decks = defaultDecks; saveDecks(); }

  const savedTrash = await idbGet('memoly_trash_decks');
  if (savedTrash) trashDecks = savedTrash;

  const savedLogs = await idbGet('memoly_logs');
  if (savedLogs) studyLogs = savedLogs;

  const savedDaily = await idbGet('memoly_daily_history');
  if (savedDaily) dailyStudyHistory = savedDaily;

  setupEventListeners();
  setupDragAndDrop();

  setupImageDropZone('add-card-img-drop-zone', 'add-card-img-input', (dataUrl) => {
    currentAddingImageData = dataUrl;
    if(addCardImgElement) addCardImgElement.src = dataUrl;
    if(addCardImgPreview) addCardImgPreview.classList.remove('hidden');
  });

  setupImageDropZone('edit-card-img-drop-zone', 'edit-card-img-input', (dataUrl) => {
    currentEditingImageData = dataUrl;
    if(editCardImgElement) editCardImgElement.src = dataUrl;
    if(editCardImgPreview) editCardImgPreview.classList.remove('hidden');
  });

  applyConfigUI();
  showMenu();
}

function removeCardFromHistory(cardId) {
  let modified = false;
  Object.keys(dailyStudyHistory).forEach((dateKey) => {
    if (dailyStudyHistory[dateKey] && dailyStudyHistory[dateKey][cardId]) {
      delete dailyStudyHistory[dateKey][cardId];
      modified = true;
    }
  });
  if (modified) saveDailyHistory();
}

function recordStudyLog(card, rating) {
  const todayStr = getFormattedDate(new Date());
  if (!studyLogs[todayStr]) studyLogs[todayStr] = 0;
  studyLogs[todayStr] += 1;
  saveLogs();

  if (!dailyStudyHistory[todayStr]) dailyStudyHistory[todayStr] = {};
  if (!dailyStudyHistory[todayStr][card.id]) {
    dailyStudyHistory[todayStr][card.id] = {
      card: { question: card.question, answer: card.answer },
      deckTitle: currentDeck ? currentDeck.title : '',
      againCount: 0, totalCount: 0, lastStudiedTime: Date.now()
    };
  }
  dailyStudyHistory[todayStr][card.id].lastStudiedTime = Date.now();
  if (currentDeck) dailyStudyHistory[todayStr][card.id].deckTitle = currentDeck.title;
  dailyStudyHistory[todayStr][card.id].totalCount += 1;
  if (rating === 'again') dailyStudyHistory[todayStr][card.id].againCount += 1;
  saveDailyHistory();
}

function getFormattedDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function applyConfigUI() {
  document.body.className = `theme-${userConfig.theme}`;
  document.documentElement.style.setProperty('--font-base', `${userConfig.fontSize}px`);
  document.documentElement.style.setProperty('--preview-font-size', `${tempFontSize}px`);

  const themeRadio = document.querySelector(`input[name="theme-option"][value="${userConfig.theme}"]`);
  if (themeRadio) themeRadio.checked = true;

  if (fontSizeRange) fontSizeRange.value = tempFontSize;
  if (fontSizeValueDisplay) fontSizeValueDisplay.textContent = tempFontSize;

  const modeRadio = document.querySelector(`input[name="mode-option"][value="${userConfig.mode}"]`);
  if (modeRadio) modeRadio.checked = true;

  const modeDescEl = document.getElementById('mode-description-text');
  if (modeDescEl) {
    if (userConfig.mode === 'NORMAL') modeDescEl.textContent = '問題文全表示の単語帳のようなモード。';
    else if (userConfig.mode === 'FAST') modeDescEl.textContent = '問題文が1文字ずつ表示されるモード。早押しクイズの形式を再現。';
  }

  const sortRadio = document.querySelector(`input[name="sort-option"][value="${userConfig.deckSortOrder}"]`);
  if (sortRadio) sortRadio.checked = true;

  if (charSpeedRange) charSpeedRange.value = userConfig.charSpeed;
  if (speedValueDisplay) speedValueDisplay.textContent = userConfig.charSpeed;

  if (speedOptionGroup) {
    if (userConfig.mode === 'FAST') speedOptionGroup.classList.remove('hidden');
    else { speedOptionGroup.classList.add('hidden'); clearInterval(previewTimer); }
  }

  const cbLongPress = document.getElementById('toggle-long-press');
  if (cbLongPress) cbLongPress.checked = userConfig.enableLongPress;

  const rangeHoldSpeed = document.getElementById('hold-speed-range');
  if (rangeHoldSpeed) rangeHoldSpeed.value = userConfig.holdSpeed;
  const dispHoldSpeed = document.getElementById('hold-speed-display');
  if (dispHoldSpeed) dispHoldSpeed.textContent = userConfig.holdSpeed.toFixed(1);

  const cbCardLevel = document.getElementById('toggle-card-level');
  if (cbCardLevel) cbCardLevel.checked = userConfig.enableCardLevel;

  updateKeyBindButtons();
}

function hideAllScreens() {
  clearInterval(timer); clearInterval(previewTimer);
  clearTimeout(holdTimer); clearInterval(holdInterval);
  if (menuScreen) menuScreen.classList.add('hidden');
  if (statsScreen) statsScreen.classList.add('hidden');
  if (optionScreen) optionScreen.classList.add('hidden');
  if (quizScreen) quizScreen.classList.add('hidden');
}

function showMenu() {
  hideAllScreens();
  if (menuScreen) menuScreen.classList.remove('hidden');
  renderMenu();
}

function showStats() {
  hideAllScreens();
  if (statsScreen) statsScreen.classList.remove('hidden');
  switchStatsTab('daily'); renderStatsScreen();
}

function switchStatsTab(tabName) {
  const btnDaily = document.getElementById('tab-btn-daily');
  const btnCards = document.getElementById('tab-btn-cards');
  const tabDaily = document.getElementById('stats-tab-daily');
  const tabCards = document.getElementById('stats-tab-cards');
  if (!btnDaily || !btnCards || !tabDaily || !tabCards) return;

  if (tabName === 'daily') {
    btnDaily.classList.add('active'); btnCards.classList.remove('active');
    tabDaily.classList.remove('hidden'); tabCards.classList.add('hidden');
  } else {
    btnCards.classList.add('active'); btnDaily.classList.remove('active');
    tabCards.classList.remove('hidden'); tabDaily.classList.add('hidden');
  }
}

function showOption() {
  hideAllScreens(); tempFontSize = userConfig.fontSize;
  if (optionScreen) optionScreen.classList.remove('hidden');
  applyConfigUI();
  if (userConfig.mode === 'FAST') startPreviewTyping();
}

function calculateStreak() {
  let streak = 0; let checkDate = new Date();
  const todayStr = getFormattedDate(checkDate);
  let hasToday = !!(studyLogs[todayStr] && studyLogs[todayStr] > 0);
  if (!hasToday) checkDate.setDate(checkDate.getDate() - 1);
  while (true) {
    const dateStr = getFormattedDate(checkDate);
    if (studyLogs[dateStr] && studyLogs[dateStr] > 0) {
      streak++; checkDate.setDate(checkDate.getDate() - 1);
    } else break;
  }
  return streak;
}

function getEncouragementMessage(streak) {
  if (streak === 0) return 'まずは今日、最初の1枚を挑戦してみよう！';
  if (streak === 1) return 'ナイススタート！この調子で明日も続けよう！';
  if (streak < 3) return '素晴らしい！習慣化への第一歩を踏み出せています！';
  if (streak < 7) return 'すごい集中力！この勢いで1週間を目指そう！';
  if (streak < 14) return '1週間突破！着実に知識が定着してきています！';
  if (streak < 30) return '継続の達人！素晴らしい努力が実を結んでいます！';
  return '伝説的継続力！あなたの努力は本当に素晴らしいです！！';
}

function renderStatsScreen() {
  const streak = calculateStreak();
  if (streakDaysEl) streakDaysEl.textContent = streak;
  if (streakMessageEl) streakMessageEl.textContent = getEncouragementMessage(streak);
  renderCalendar(); renderTodayStudiedList();
}

function changeCalendarMonth(delta) {
  currentCalendarDate.setDate(1); 
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
  renderCalendar();
}

function renderCalendar() {
  if (!calendarTitleEl || !calendarGridEl) return;
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  calendarTitleEl.textContent = `${year}年 ${month + 1}月`;
  calendarGridEl.innerHTML = '';

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  dayNames.forEach(d => {
    const dh = document.createElement('div'); dh.className = 'calendar-day-header'; dh.textContent = d;
    calendarGridEl.appendChild(dh);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getFormattedDate(new Date());

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div'); emptyCell.className = 'calendar-cell empty';
    calendarGridEl.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const dateStr = getFormattedDate(cellDate);
    const count = studyLogs[dateStr] || 0;

    const cell = document.createElement('div');
    let cellClass = 'calendar-cell';
    if (count > 0) cellClass += ' has-data';
    if (dateStr === todayStr) cellClass += ' today';
    cell.className = cellClass;
    cell.innerHTML = `<span class="day-num">${day}</span>${count > 0 ? `<span class="day-count">${count}枚</span>` : ''}`;
    calendarGridEl.appendChild(cell);
  }
}

function changeTodayCardsSortOrder(order) { todayCardsSortOrder = order; renderTodayStudiedList(); }

function renderTodayStudiedList() {
  const container = document.getElementById('today-studied-list');
  if (!container) return;
  container.innerHTML = '';

  const todayStr = getFormattedDate(new Date());
  const todayData = dailyStudyHistory[todayStr];

  if (!todayData || Object.keys(todayData).length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-sub); font-size:0.85em;">本日学習したカードはまだありません。</div>`;
    return;
  }

  let list = Object.values(todayData);
  if (todayCardsSortOrder === 'AGAIN') list.sort((a, b) => (b.againCount || 0) - (a.againCount || 0));
  else list.sort((a, b) => (b.lastStudiedTime || 0) - (a.lastStudiedTime || 0));

  list.forEach(item => {
    const itemEl = document.createElement('div'); itemEl.className = 'card-item';
    itemEl.innerHTML = `
      <div class="card-item-info">
        <div class="card-item-deck-title">from ${item.deckTitle ? item.deckTitle : '不明なデッキ'}</div>
        <div class="card-item-q">Q. ${item.card.question}</div>
        <div class="card-item-a">A. ${item.card.answer}</div>
      </div>
      <div style="font-size:0.8em; font-weight:bold; color: ${item.againCount > 0 ? '#ef4444' : 'var(--text-sub)'}; flex-shrink:0;">
        「もう一度」: ${item.againCount}回
      </div>
    `;
    container.appendChild(itemEl);
  });
}

function changeTheme(theme) { userConfig.theme = theme; saveConfig(); applyConfigUI(); }
function updateFontSizePreview(size) {
  tempFontSize = parseInt(size, 10);
  if (fontSizeValueDisplay) fontSizeValueDisplay.textContent = tempFontSize;
  document.documentElement.style.setProperty('--preview-font-size', `${tempFontSize}px`);
}
function applyAndSaveFontSize() {
  userConfig.fontSize = tempFontSize; saveConfig(); applyConfigUI();
  alert('文字サイズの設定をアプリ全体に保存・反映しました。');
}
function changeMode(mode) {
  userConfig.mode = mode; saveConfig(); applyConfigUI();
  if (mode === 'FAST') startPreviewTyping();
}
function changeDeckSortOrder(order) { userConfig.deckSortOrder = order; saveConfig(); applyConfigUI(); }
function updateCharSpeed(speed) {
  userConfig.charSpeed = parseInt(speed, 10);
  if (speedValueDisplay) speedValueDisplay.textContent = userConfig.charSpeed;
  saveConfig(); startPreviewTyping();
}
function toggleLongPressOption(enabled) { userConfig.enableLongPress = enabled; saveConfig(); }
function updateHoldSpeed(val) {
  userConfig.holdSpeed = parseFloat(val);
  const disp = document.getElementById('hold-speed-display');
  if (disp) disp.textContent = userConfig.holdSpeed.toFixed(1);
  saveConfig();
}
function toggleCardLevelOption(enabled) { userConfig.enableCardLevel = enabled; saveConfig(); }

function startPreviewTyping() {
  clearInterval(previewTimer);
  if (!previewTextContainer) return;
  previewTextContainer.textContent = '';
  let pIndex = 0; const chars = [...SAMPLE_PREVIEW_TEXT];
  previewTimer = setInterval(() => {
    if (pIndex < chars.length) {
      previewTextContainer.textContent += chars[pIndex]; pIndex++;
    } else clearInterval(previewTimer);
  }, userConfig.charSpeed);
}

function resetAllSettings() {
  if (confirm('設定を初期状態に戻しますがよろしいですか？')) {
    userConfig = { ...DEFAULT_USER_CONFIG, keyBinds: JSON.parse(JSON.stringify(DEFAULT_KEY_BINDS)) };
    tempFontSize = userConfig.fontSize;
    saveConfig(); applyConfigUI();
    if (userConfig.mode === 'FAST') startPreviewTyping();
    alert('設定を初期状態に戻しました。');
  }
}

function updateKeyBindButtons() {
  const kb = userConfig.keyBinds || DEFAULT_KEY_BINDS;
  const setBtn = (id, keys) => {
    const el = document.getElementById(id);
    if (el) el.textContent = keys.join(' / ');
  };
  setBtn('key-bind-advance', kb.advance);
  setBtn('key-bind-again', kb.again);
  setBtn('key-bind-hard', kb.hard);
  setBtn('key-bind-good', kb.good);
  setBtn('key-bind-easy', kb.easy);

  const setEvalBtnKey = (id, keys) => {
    const el = document.getElementById(id);
    if (el) el.textContent = keys[0] || '';
  };
  setEvalBtnKey('btn-key-again', kb.again);
  setEvalBtnKey('btn-key-hard', kb.hard);
  setEvalBtnKey('btn-key-good', kb.good);
  setEvalBtnKey('btn-key-easy', kb.easy);
}

function startKeyBinding(action) {
  bindingKeyTarget = action;
  const el = document.getElementById(`key-bind-${action}`);
  if (el) el.textContent = 'キーを押してください...';
  if (document.activeElement) document.activeElement.blur();
}

function resetKeyBinds() {
  userConfig.keyBinds = JSON.parse(JSON.stringify(DEFAULT_KEY_BINDS));
  saveConfig(); updateKeyBindButtons(); alert('キー割り当てをデフォルトに戻しました。');
}

function renderMenu() {
  if (!deckListEl) return;
  deckListEl.innerHTML = '';
  const now = Date.now();

  if (decks.length === 0) {
    deckListEl.innerHTML = `
      <div class="empty-deck-notice">
        <p>まだデッキがありません。<br>「＋作成」や「📥CSV」からデッキを追加して学習を始めましょう！</p>
      </div>
    `;
    return;
  }

  let sortedDecks = [...decks];
  if (userConfig.deckSortOrder === 'RECENT') sortedDecks.sort((a, b) => (b.lastStudied || 0) - (a.lastStudied || 0));

  sortedDecks.forEach(deck => {
    const dueCount = deck.cards.filter(c => !c.dueDate || c.dueDate <= now).length;
    const learnedCount = deck.cards.filter(c => c.interval >= 1).length;
    const retentionRate = deck.cards.length > 0 ? ((learnedCount / deck.cards.length) * 100).toFixed(2) : '0.00';

    let orderModeText = 'シャッフル';
    if (deck.orderMode === 'ORDER') orderModeText = '登録順';
    if (deck.orderMode === 'WEAK') orderModeText = '苦手特化';

    const cardEl = document.createElement('div'); cardEl.className = 'deck-card';
    cardEl.innerHTML = `
      <div class="deck-header-row">
        <span class="deck-title">${deck.title}</span>
        <span class="deck-retention">定着率: ${retentionRate}%</span>
      </div>
      <div class="deck-count">総カード: ${deck.cards.length}枚 / 復習対象: ${dueCount}枚</div>
      <div class="deck-mode-badge">出題順: ${orderModeText}</div>
      <div class="deck-manage-btns">
        <button class="btn-small" onclick="openDeckSettingsModal('${deck.id}')">⚙ 出題設定</button>
        <button class="btn-small" onclick="openCardListModal('${deck.id}')">カード確認・編集</button>
        <button class="btn-small" onclick="openAddCardModal('${deck.id}')">カード追加</button>
        <button class="btn-small" onclick="renameDeck('${deck.id}')">名前変更</button>
        <button class="btn-small" onclick="resetDeckProgress('${deck.id}')">進捗リセット</button>
        <button class="btn-small btn-small-danger" onclick="deleteDeck('${deck.id}')">デッキ削除</button>
      </div>
      <button class="btn-start" onclick="startQuiz('${deck.id}')">学習を開始</button>
    `;
    deckListEl.appendChild(cardEl);
  });
}

function openDeckSettingsModal(deckId) {
  targetDeckForSettings = deckId;
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;
  if (deckSettingsTitle) deckSettingsTitle.textContent = `デッキ: ${deck.title}`;
  const currentMode = deck.orderMode || 'SHUFFLE';
  const radio = document.querySelector(`input[name="deck-order-option"][value="${currentMode}"]`);
  if (radio) radio.checked = true;
  if (deckSettingsModal) deckSettingsModal.classList.remove('hidden');
}

function closeDeckSettingsModal() {
  if (deckSettingsModal) deckSettingsModal.classList.add('hidden');
  targetDeckForSettings = null;
}

function submitDeckSettings() {
  if (!targetDeckForSettings) return;
  const deck = decks.find(d => d.id === targetDeckForSettings);
  if (!deck) return;
  const selectedRadio = document.querySelector('input[name="deck-order-option"]:checked');
  if (selectedRadio) { deck.orderMode = selectedRadio.value; saveDecks(); renderMenu(); }
  closeDeckSettingsModal();
}

function showNewDeckModal() {
  const title = prompt('新しいデッキ名を入力してください:');
  if (title && title.trim()) {
    decks.push({
      id: 'deck-' + Date.now(), title: title.trim(), orderMode: 'SHUFFLE', lastStudied: Date.now(), cards: []
    });
    saveDecks(); renderMenu();
  }
}

function renameDeck(deckId) {
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;
  const newTitle = prompt('新しいデッキ名を入力してください:', deck.title);
  if (newTitle && newTitle.trim()) { deck.title = newTitle.trim(); saveDecks(); renderMenu(); }
}

function resetDeckProgress(deckId) {
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;
  if (confirm(`デッキ「${deck.title}」の学習進捗をリセットしてもよろしいですか？\n（問題と答えのデータは消去されず、すべて未学習状態に戻ります）`)) {
    deck.cards.forEach(card => { card.dueDate = 0; card.interval = 0; card.easeFactor = 2.5; card.reps = 0; });
    saveDecks(); renderMenu(); alert(`デッキ「${deck.title}」の学習進捗をリセットしました。`);
  }
}

function deleteDeck(deckId) {
  const index = decks.findIndex(d => d.id === deckId);
  if (index === -1) return;
  const deck = decks[index];
  if (confirm(`デッキ「${deck.title}」をごみ箱へ移動しますか？`)) {
    trashDecks.push({ originalIndex: index, deck: deck });
    decks.splice(index, 1); saveDecks(); saveTrashDecks(); renderMenu();
  }
}

function openTrashModal() { renderTrashList(); if (trashModal) trashModal.classList.remove('hidden'); }
function closeTrashModal() { if (trashModal) trashModal.classList.add('hidden'); }

function renderTrashList() {
  if (!trashListContainer) return;
  trashListContainer.innerHTML = '';
  const clearAllBtn = document.getElementById('trash-clear-all-btn');
  if (trashDecks.length === 0) {
    trashListContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">ごみ箱は空です。</div>`;
    if (clearAllBtn) clearAllBtn.style.display = 'none';
    return;
  }
  if (clearAllBtn) clearAllBtn.style.display = 'inline-block';

  trashDecks.forEach((item, index) => {
    const trashEl = document.createElement('div'); trashEl.className = 'trash-item';
    trashEl.innerHTML = `
      <div class="trash-item-info">
        <span class="trash-item-title">${item.deck.title}</span>
        <span class="trash-item-count">枚数: ${item.deck.cards ? item.deck.cards.length : 0}枚</span>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button class="btn-small" onclick="restoreDeckFromTrash(${index})">復活</button>
        <button class="btn-small btn-small-danger" onclick="permanentlyDeleteDeck(${index})">完全削除</button>
      </div>
    `;
    trashListContainer.appendChild(trashEl);
  });
}

function restoreDeckFromTrash(index) {
  if (index < 0 || index >= trashDecks.length) return;
  const item = trashDecks[index];
  if (confirm('このデッキを復旧させますか？')) {
    const originalIndex = item.originalIndex;
    if (originalIndex !== undefined && originalIndex >= 0 && originalIndex <= decks.length) decks.splice(originalIndex, 0, item.deck);
    else decks.push(item.deck);
    trashDecks.splice(index, 1);
    saveDecks(); saveTrashDecks(); renderTrashList(); renderMenu();
  }
}

function permanentlyDeleteDeck(index) {
  if (index < 0 || index >= trashDecks.length) return;
  if (confirm('このデッキを完全に消してもよいですか？含まれるカードの学習記録も削除されます。この操作は取り消せません。')) {
    const item = trashDecks[index];
    if (item.deck && item.deck.cards) item.deck.cards.forEach(card => removeCardFromHistory(card.id));
    trashDecks.splice(index, 1); saveTrashDecks(); renderTrashList();
  }
}

function clearAllTrash() {
  if (trashDecks.length === 0) return;
  if (confirm('ごみ箱内のデッキをすべて完全削除しますか？含まれる全カードの学習記録も削除されます。この操作は取り消せません。')) {
    trashDecks.forEach(item => { if (item.deck && item.deck.cards) item.deck.cards.forEach(card => removeCardFromHistory(card.id)); });
    trashDecks = []; saveTrashDecks(); renderTrashList();
  }
}

function openAddCardModal(deckId) {
  targetDeckForAddCard = deckId;
  if (newCardQ) newCardQ.value = '';
  if (newCardA) newCardA.value = '';
  if (newCardExp) newCardExp.value = '';
  removeAddCardImage();
  if (addCardModal) addCardModal.classList.remove('hidden');
}

function closeAddCardModal() {
  if (addCardModal) addCardModal.classList.add('hidden');
  targetDeckForAddCard = null;
}

function submitAddCard() {
  const q = newCardQ ? newCardQ.value.trim() : '';
  const a = newCardA ? newCardA.value.trim() : '';
  const exp = newCardExp ? newCardExp.value.trim() : '';
  if (!q || !a) { alert('問題文と答えは必須です。'); return; }

  const deck = decks.find(d => d.id === targetDeckForAddCard);
  if (deck) {
    deck.cards.push({
      id: `card-${Date.now()}`, question: q, answer: a, explanation: exp, image: currentAddingImageData,
      dueDate: 0, interval: 0, easeFactor: 2.5, reps: 0
    });
    saveDecks(); renderMenu(); closeAddCardModal();
  }
}

function openEditModalForCard(card) {
  targetCardForEdit = card;
  if (editCardQ) editCardQ.value = card.question;
  if (editCardA) editCardA.value = card.answer;
  if (editCardExp) editCardExp.value = card.explanation || '';
  if (editCardImgInput) editCardImgInput.value = '';
  currentEditingImageData = card.image || '';

  if (currentEditingImageData && editCardImgElement && editCardImgPreview) {
    editCardImgElement.src = currentEditingImageData; editCardImgPreview.classList.remove('hidden');
  } else if (editCardImgElement && editCardImgPreview) {
    editCardImgElement.src = ''; editCardImgPreview.classList.add('hidden');
  }
  if (editCardModal) editCardModal.classList.remove('hidden');
}

function openEditCardModal(cardId) {
  const deck = decks.find(d => d.id === targetDeckForCardList);
  if (!deck) return;
  const card = deck.cards.find(c => c.id === cardId);
  if (!card) return;
  openEditModalForCard(card);
}

function openEditCurrentQuizCard(event) {
  if (event) event.stopPropagation();
  if (!currentCard) return;
  openEditModalForCard(currentCard);
}

function closeEditCardModal() {
  if (editCardModal) editCardModal.classList.add('hidden');
  targetCardForEdit = null; currentEditingImageData = '';
}

function submitEditCard() {
  if (!targetCardForEdit) return;
  const q = editCardQ ? editCardQ.value.trim() : '';
  const a = editCardA ? editCardA.value.trim() : '';
  const exp = editCardExp ? editCardExp.value.trim() : '';
  if (!q || !a) { alert('問題文と答えは必須です。'); return; }

  targetCardForEdit.question = q;
  targetCardForEdit.answer = a;
  targetCardForEdit.explanation = exp;
  targetCardForEdit.image = currentEditingImageData;
  saveDecks();

  if (currentCard && currentCard.id === targetCardForEdit.id) {
    if (questionEl) questionEl.textContent = targetCardForEdit.question;
    if (answerTextEl) answerTextEl.textContent = targetCardForEdit.answer;
    if (explanationTextEl) explanationTextEl.textContent = targetCardForEdit.explanation;
    if (searchTermTextEl) searchTermTextEl.textContent = targetCardForEdit.answer;

    if (targetCardForEdit.image && answerImageEl && answerImageContainer) {
      answerImageEl.src = targetCardForEdit.image; answerImageContainer.classList.remove('hidden');
    } else if (answerImageEl && answerImageContainer) {
      answerImageEl.src = ''; answerImageContainer.classList.add('hidden');
    }
  }
  if (targetDeckForCardList) renderCardList();
  renderMenu(); closeEditCardModal();
}

function openCardListModal(deckId) {
  targetDeckForCardList = deckId; cardListPageIndex = 0;
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;
  if (cardListDeckTitle) cardListDeckTitle.textContent = `カード一覧: ${deck.title}`;
  renderCardList();
  if (cardListModal) cardListModal.classList.remove('hidden');
}

function closeCardListModal() {
  if (cardListModal) cardListModal.classList.add('hidden');
  targetDeckForCardList = null;
}

function changeCardListPage(direction) {
  const deck = decks.find(d => d.id === targetDeckForCardList);
  if (!deck) return;
  const totalPages = Math.ceil(deck.cards.length / CARDS_PER_PAGE) || 1;
  cardListPageIndex += direction;
  if (cardListPageIndex < 0) cardListPageIndex = 0;
  if (cardListPageIndex >= totalPages) cardListPageIndex = totalPages - 1;
  renderCardList();
}

function renderCardList() {
  const deck = decks.find(d => d.id === targetDeckForCardList);
  if (!deck || !cardListContainer) return;
  cardListContainer.innerHTML = '';
  if (deck.cards.length === 0) {
    cardListContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">カードがありません。</div>`;
    if (cardPaginationEl) cardPaginationEl.innerHTML = '';
    return;
  }
  const totalPages = Math.ceil(deck.cards.length / CARDS_PER_PAGE);
  if (cardListPageIndex >= totalPages) cardListPageIndex = totalPages - 1;
  const startIdx = cardListPageIndex * CARDS_PER_PAGE;
  const endIdx = startIdx + CARDS_PER_PAGE;
  const pageCards = deck.cards.slice(startIdx, endIdx);

  pageCards.forEach((card, idx) => {
    const absoluteIndex = startIdx + idx + 1;
    const cardEl = document.createElement('div'); cardEl.className = 'card-item';
    cardEl.innerHTML = `
      <div class="card-item-info">
        <div class="card-item-q">${absoluteIndex}. Q. ${card.question}</div>
        <div class="card-item-a">A. ${card.answer}</div>
        ${card.explanation ? `<div class="card-item-exp">解説: ${card.explanation}</div>` : ''}
        ${card.image ? `<div class="card-item-img-badge">📷 画像あり</div>` : ''}
      </div>
      <div style="display:flex; gap:4px; flex-shrink:0;">
        <button class="btn-small" onclick="openEditCardModal('${card.id}')">編集</button>
        <button class="btn-small btn-small-danger" onclick="deleteCard('${card.id}')">削除</button>
      </div>
    `;
    cardListContainer.appendChild(cardEl);
  });

  if (cardPaginationEl) {
    cardPaginationEl.innerHTML = `
      <button class="btn-small" ${cardListPageIndex === 0 ? 'disabled style="opacity:0.4; cursor:default;"' : ''} onclick="changeCardListPage(-1)">← 前の100件</button>
      <span>${cardListPageIndex + 1} / ${totalPages} ページ (${deck.cards.length}枚中)</span>
      <button class="btn-small" ${cardListPageIndex >= totalPages - 1 ? 'disabled style="opacity:0.4; cursor:default;"' : ''} onclick="changeCardListPage(1)">次の100件 →</button>
    `;
  }
}

function deleteCard(cardId) {
  const deck = decks.find(d => d.id === targetDeckForCardList);
  if (!deck) return;
  if (confirm('このカードを削除しますか？学習記録からも消去されます。')) {
    deck.cards = deck.cards.filter(c => c.id !== cardId);
    removeCardFromHistory(cardId); saveDecks(); renderCardList(); renderMenu();
  }
}

function openCsvImportModal() {
  if (csvInput) csvInput.value = '';
  if (csvImportModal) csvImportModal.classList.remove('hidden');
}

function closeCsvImportModal() {
  if (csvImportModal) csvImportModal.classList.add('hidden');
}

function parseCSVLine(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += char;
  }
  result.push(current); return result;
}

function processCsvText(text, fileName = 'インポートデッキ') {
  const lines = text.split('\n'); const newCards = [];
  lines.forEach((line, index) => {
    if(!line.trim()) return;
    const parts = parseCSVLine(line).map(p => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      newCards.push({
        id: `card-${Date.now()}-${index}`, question: parts[0], answer: parts[1], explanation: parts[2] || '',
        image: '', dueDate: 0, interval: 0, easeFactor: 2.5, reps: 0
      });
    }
  });

  if (newCards.length > 0) {
    const newDeck = {
      id: 'deck-' + Date.now(), title: fileName.replace(/\.[^/.]+$/, ''),
      orderMode: 'SHUFFLE', lastStudied: Date.now(), cards: newCards
    };
    decks.push(newDeck); saveDecks(); closeCsvImportModal(); renderMenu();
    if (csvInput) csvInput.value = '';
    alert(`デッキ「${newDeck.title}」を追加しました！（${newCards.length}枚）`);
  } else { alert('有効なカードデータが見つかりませんでした。'); }
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  if (!dropZone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); }, false));
  ['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.add('dragover'), false));
  ['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.remove('dragover'), false));

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) { alert('CSVファイルのみ追加可能です。'); return; }
      const reader = new FileReader();
      reader.onload = event => processCsvText(event.target.result, file.name);
      reader.readAsText(file, 'UTF-8');
    }
  });
  dropZone.addEventListener('click', () => { if (csvInput) csvInput.click(); });
}

function calculateNextReview(card, rating) {
  const now = Date.now();
  const ONE_MINUTE = 60 * 1000, ONE_HOUR = 60 * ONE_MINUTE, ONE_DAY = 24 * ONE_HOUR;
  let nextInterval = card.interval, ease = card.easeFactor, reps = card.reps, nextDueDate = now;

  switch (rating) {
    case 'again': reps = 0; nextInterval = Math.max(0, nextInterval - 3); nextDueDate = now + 1 * ONE_MINUTE; break;
    case 'hard': reps = 0; nextInterval = 0.5; nextDueDate = now + 12 * ONE_HOUR; ease = Math.max(1.3, ease - 0.15); break;
    case 'good':
      if (reps === 0) nextInterval = 1; else if (reps === 1) nextInterval = 3; else nextInterval = Math.round(nextInterval * ease);
      reps += 1; nextDueDate = now + nextInterval * ONE_DAY; break;
    case 'easy':
      if (reps === 0) nextInterval = 4; else nextInterval = Math.round(nextInterval * ease * 1.3);
      reps += 1; ease += 0.15; nextDueDate = now + nextInterval * ONE_DAY; break;
  }
  card.interval = nextInterval; card.easeFactor = ease; card.reps = reps; card.dueDate = nextDueDate;
  saveDecks();
}

function renderCardLevelBadge(card) {
  const badge = document.getElementById('card-level-badge');
  if (!badge) return;
  if (!userConfig.enableCardLevel || !card) { badge.classList.add('hidden'); return; }

  let level = 1; const val = card.interval || 0;
  if (val >= 30) level = '★'; else if (val >= 21) level = 10;
  else if (val >= 14) level = 9; else if (val >= 10) level = 8;
  else if (val >= 7) level = 7; else if (val >= 5) level = 6;
  else if (val >= 3) level = 5; else if (val >= 2) level = 4;
  else if (val >= 1) level = 3; else if (val >= 0.5) level = 2; else level = 1;

  badge.textContent = `暗記レベル ${level}`;
  let bg = '#9ca3af';
  if (level === '★') bg = '#8b5cf6';
  else bg = `hsl(217, 90%, ${Math.max(25, 75 - Number(level) * 5)}%)`;
  badge.style.backgroundColor = bg; badge.classList.remove('hidden');
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function sortStudyQueue(cards, mode) {
  const queue = [...cards];
  if (mode === 'SHUFFLE') return shuffleArray(queue);
  else if (mode === 'WEAK') return queue.sort((a, b) => {
    if (a.interval !== b.interval) return a.interval - b.interval;
    return a.reps - b.reps;
  });
  return queue;
}

function startQuiz(deckId) {
  currentDeck = decks.find(d => d.id === deckId);
  if (!currentDeck || currentDeck.cards.length === 0) {
    alert('このデッキにはまだカードがありません。カードを追加してください。'); return;
  }
  currentDeck.lastStudied = Date.now(); saveDecks();

  let baseQueue = currentDeck.cards.filter(c => !c.dueDate || c.dueDate <= Date.now());
  if (baseQueue.length === 0) {
    if (confirm('今日の復習カードは完了しています！全カードを再練習しますか？')) baseQueue = [...currentDeck.cards];
    else return;
  }

  studyQueue = sortStudyQueue(baseQueue, currentDeck.orderMode || 'SHUFFLE');
  undoStack = []; redoStack = [];
  if (currentDeckTitleEl) currentDeckTitleEl.textContent = currentDeck.title;
  hideAllScreens();
  if (quizScreen) quizScreen.classList.remove('hidden');
  loadNextCard();
}

function loadNextCard() {
  clearTimeout(holdTimer); clearInterval(holdInterval);
  isHolding = false;
  didHold = false;
  holdPhase = 'NONE';

  if (studyQueue.length === 0) {
    alert('このセッションの学習がすべて完了しました！'); showMenu(); return;
  }

  currentCard = studyQueue[0];
  if (progressInfoEl) progressInfoEl.textContent = `残り: ${studyQueue.length}枚`;
  updateUndoRedoUI(); renderCardLevelBadge(currentCard);

  if (questionEl) questionEl.textContent = '';
  if (answerTextEl) answerTextEl.textContent = currentCard.answer;
  if (explanationTextEl) explanationTextEl.textContent = currentCard.explanation;

  if (currentCard.image && answerImageEl && answerImageContainer) {
    answerImageEl.src = currentCard.image; answerImageContainer.classList.remove('hidden');
  } else if (answerImageEl && answerImageContainer) {
    answerImageEl.src = ''; answerImageContainer.classList.add('hidden');
  }
  if (searchTermTextEl) searchTermTextEl.textContent = currentCard.answer;

  if (answerSectionEl) { answerSectionEl.classList.add('hidden'); answerSectionEl.classList.remove('holding-only-answer'); }
  if (resultStatsEl) resultStatsEl.classList.add('hidden');
  if (buttonsEl) buttonsEl.classList.add('hidden');

  const longPressSuffix = userConfig.enableLongPress ? '（長押しで文字送り）' : '';

  if (userConfig.mode === 'FAST') {
    charIndex = 0; state = 'TYPING';
    if (tapHintEl) tapHintEl.textContent = '画面タップ または キー操作でストップ！';
    startTime = Date.now();
    stopTime = 0;
    clearInterval(timer);
    
    const chars = [...currentCard.question]; 
    timer = setInterval(() => {
      if (charIndex < chars.length) {
        if (questionEl) questionEl.textContent += chars[charIndex];
        charIndex++;
      } else {
        clearInterval(timer);
        if (state === 'TYPING') {
          finishTypingUI();
          state = 'STOPPED';
        }
      }
    }, userConfig.charSpeed);
  } else {
    charIndex = [...currentCard.question].length;
    if (questionEl) questionEl.textContent = currentCard.question;
    state = 'STOPPED';
    if (tapHintEl) tapHintEl.textContent = `画面タップ または キー操作で答えを表示${longPressSuffix}`;
  }
}

function searchOnGoogle(event) {
  if (event) event.stopPropagation();
  if (!navigator.onLine) { alert('インターネット接続がありません。'); return; }
  if (currentCard && currentCard.answer) window.open(`https://www.google.com/search?q=${encodeURIComponent(currentCard.answer)}`, '_blank');
}

function finishTypingUI() {
  if (!stopTime) stopTime = Date.now();
  const elapsedSeconds = ((stopTime - startTime) / 1000).toFixed(1);
  const totalLen = [...currentCard.question].length;
  const progressPercent = Math.round((charIndex / totalLen) * 100);

  if (statProgressEl) statProgressEl.textContent = `読み上げ率: ${progressPercent}%`;
  if (statTimeEl) statTimeEl.textContent = `タイム: ${elapsedSeconds}秒`;
  if (resultStatsEl) resultStatsEl.classList.remove('hidden');
  
  const longPressSuffix = userConfig.enableLongPress ? '（長押しで文字送り）' : '';
  if (tapHintEl) tapHintEl.textContent = `画面タップ または キー操作で答えを表示${longPressSuffix}`;
}

function advanceQuizState() {
  if (!currentCard) return;

  if (userConfig.mode === 'FAST') {
    if (state === 'TYPING') {
      clearInterval(timer);
      finishTypingUI();
      state = 'STOPPED';
    } else if (state === 'STOPPED') {
      // 💡 正式なタップによる全表示（解答・解説・ボタン出力）
      if (questionEl) questionEl.textContent = currentCard.question;
      charIndex = [...currentCard.question].length;
      state = 'ANSWERED';
      if (answerSectionEl) {
        answerSectionEl.classList.remove('hidden');
        answerSectionEl.classList.remove('holding-only-answer');
      }
      if (answerTextEl) answerTextEl.textContent = currentCard.answer;
      if (buttonsEl) buttonsEl.classList.remove('hidden');
      if (tapHintEl) tapHintEl.textContent = '評価ボタンを押すか、対応キーで回答してください';
    }
  } else {
    if (state === 'STOPPED') {
      state = 'ANSWERED';
      if (answerSectionEl) {
        answerSectionEl.classList.remove('hidden');
        answerSectionEl.classList.remove('holding-only-answer');
      }
      if (answerTextEl) answerTextEl.textContent = currentCard.answer;
      if (buttonsEl) buttonsEl.classList.remove('hidden');
      if (tapHintEl) tapHintEl.textContent = '評価ボタンを押すか、対応キーで回答してください';
    }
  }
}

function handleAnswer(rating) {
  if (state !== 'ANSWERED' || !currentCard) return;

  undoStack.push({
    queue: JSON.parse(JSON.stringify(studyQueue)),
    card: JSON.parse(JSON.stringify(currentCard)),
    studyLogs: JSON.parse(JSON.stringify(studyLogs)),
    dailyStudyHistory: JSON.parse(JSON.stringify(dailyStudyHistory)),
    deckInfo: JSON.parse(JSON.stringify(decks.find(d => d.id === currentDeck.id)))
  });
  redoStack = [];

  recordStudyLog(currentCard, rating);
  calculateNextReview(currentCard, rating);
  studyQueue.shift(); loadNextCard();
}

function undoLastAnswer(event) {
  if (event) event.stopPropagation();
  if (undoStack.length === 0) return;

  redoStack.push({
    queue: JSON.parse(JSON.stringify(studyQueue)),
    card: JSON.parse(JSON.stringify(currentCard)),
    studyLogs: JSON.parse(JSON.stringify(studyLogs)),
    dailyStudyHistory: JSON.parse(JSON.stringify(dailyStudyHistory)),
    deckInfo: JSON.parse(JSON.stringify(decks.find(d => d.id === currentDeck.id)))
  });

  const previousState = undoStack.pop();
  studyQueue = previousState.queue; currentCard = previousState.card;
  studyLogs = previousState.studyLogs; dailyStudyHistory = previousState.dailyStudyHistory;

  const deckIdx = decks.findIndex(d => d.id === currentDeck.id);
  if (deckIdx !== -1 && previousState.deckInfo) decks[deckIdx] = previousState.deckInfo;

  saveDecks(); saveLogs(); saveDailyHistory(); loadNextCard();
}

function redoLastAnswer(event) {
  if (event) event.stopPropagation();
  if (redoStack.length === 0) return;

  undoStack.push({
    queue: JSON.parse(JSON.stringify(studyQueue)),
    card: JSON.parse(JSON.stringify(currentCard)),
    studyLogs: JSON.parse(JSON.stringify(studyLogs)),
    dailyStudyHistory: JSON.parse(JSON.stringify(dailyStudyHistory)),
    deckInfo: JSON.parse(JSON.stringify(decks.find(d => d.id === currentDeck.id)))
  });

  const nextState = redoStack.pop();
  studyQueue = nextState.queue; currentCard = nextState.card;
  studyLogs = nextState.studyLogs; dailyStudyHistory = nextState.dailyStudyHistory;

  const deckIdx = decks.findIndex(d => d.id === currentDeck.id);
  if (deckIdx !== -1 && nextState.deckInfo) decks[deckIdx] = nextState.deckInfo;

  saveDecks(); saveLogs(); saveDailyHistory(); loadNextCard();
}

function updateUndoRedoUI() {
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

// =====================================================================
// 💡 長押しのカスタム挙動（仕様A・Bの完全対応・状態遷移強化版）
// =====================================================================
function startHoldAction() {
  if (!userConfig.enableLongPress || !currentCard) return;
  if (state === 'ANSWERED') return; // 回答ボタンが出ている時は長押し無効

  didHold = false;
  holdPhase = 'NONE';
  clearTimeout(holdTimer);
  clearInterval(holdInterval);

  const holdMs = userConfig.holdSpeed * 1000;

  // 200ms長押しされたら開始
  holdTimer = setTimeout(() => {
    isHolding = true;
    didHold = true;

    const qArr = [...currentCard.question];
    
    // 【仕様A】読み上げ風モード かつ 問題文が途中の時
    if (userConfig.mode === 'FAST' && charIndex < qArr.length) {
      holdPhase = 'QUESTION';
      if (state === 'TYPING') {
        clearInterval(timer);
        finishTypingUI();
        state = 'STOPPED';
      }
      
      holdInterval = setInterval(() => {
        if (charIndex < qArr.length) {
          if (questionEl) questionEl.textContent += qArr[charIndex];
          charIndex++;
        } else {
          // 最後まで到達したら停止（答えは出さずにストップ）
          clearInterval(holdInterval);
          finishTypingUI();
        }
      }, holdMs);

    // 【仕様B】ノーマルモード または 問題文が全文出切っている時
    } else if (state === 'STOPPED') {
      holdPhase = 'ANSWER';
      if (answerSectionEl) {
        answerSectionEl.classList.remove('hidden');
        answerSectionEl.classList.add('holding-only-answer');
      }
      if (answerTextEl) answerTextEl.textContent = '';
      aCharIndex = 0;
      
      const ansArr = [...currentCard.answer];
      holdInterval = setInterval(() => {
        if (aCharIndex < ansArr.length) {
          if (answerTextEl) answerTextEl.textContent += ansArr[aCharIndex];
          aCharIndex++;
        } else {
          clearInterval(holdInterval);
        }
      }, holdMs);
    }
  }, 200);
}

function endHoldAction() {
  clearTimeout(holdTimer);
  clearInterval(holdInterval);
  
  if (isHolding) {
    isHolding = false;
    lastHoldEndTime = Date.now();
    
    // 💡 Aフェーズ（問題文送り）だった場合：問題文は進んだ状態を維持し、答えは出さない
    if (holdPhase === 'QUESTION') {
      finishTypingUI();
    }
    
    // 💡 Bフェーズ（答え送り）だった場合：指を離したら答えを完全に消去して隠す
    if (holdPhase === 'ANSWER' || state === 'STOPPED') {
      if (answerSectionEl && state !== 'ANSWERED') {
        answerSectionEl.classList.remove('holding-only-answer');
        answerSectionEl.classList.add('hidden');
      }
      if (answerTextEl && state !== 'ANSWERED') {
        answerTextEl.textContent = '';
      }
    }
    
    holdPhase = 'NONE';
  }
}

function setupEventListeners() {
  const quizCardEl = document.getElementById('quiz-card');

  if (quizCardEl) {
    // 右クリック・長押しメニューをブロック
    quizCardEl.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('input') && !e.target.closest('textarea')) {
        e.preventDefault();
      }
    });

    // テキスト選択をブロック
    quizCardEl.addEventListener('selectstart', (e) => {
      if (!e.target.closest('input') && !e.target.closest('textarea')) {
        e.preventDefault();
      }
    });

    document.addEventListener('selectionchange', () => {
      if (isHolding) {
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
      }
    });

    // --- PC向けマウス操作 ---
    quizCardEl.addEventListener('mousedown', (e) => {
      if (isTouchDevice) return;
      if (e.target.closest('button') || e.target.closest('a')) return;
      startHoldAction();
    });
    
    quizCardEl.addEventListener('mouseup', (e) => {
      if (isTouchDevice) return;
      if (e.target.closest('button') || e.target.closest('a')) return;
      const wasHolding = didHold;
      endHoldAction();
      if (!wasHolding && (Date.now() - lastHoldEndTime > 300)) {
        advanceQuizState();
      }
    });
    
    quizCardEl.addEventListener('mouseleave', () => {
      if (isTouchDevice) return;
      endHoldAction();
    });

    // --- 💡 スマホ向けタッチ操作 ---
    quizCardEl.addEventListener('touchstart', (e) => {
      isTouchDevice = true;
      isScrolling = false;
      if (e.target.closest('button') || e.target.closest('a')) return;
      
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
      
      startHoldAction();
    }, { passive: true });
    
    quizCardEl.addEventListener('touchmove', (e) => {
      if (isHolding) return; // 💡 一度長押しが始まったら指が滑っても継続

      if (holdTimer) {
        const touch = e.touches[0];
        const moveX = Math.abs(touch.clientX - touchStartX);
        const moveY = Math.abs(touch.clientY - touchStartY);
        
        if (moveX > 40 || moveY > 40) {
          isScrolling = true;
          endHoldAction();
        }
      }
    }, { passive: true });

    quizCardEl.addEventListener('touchend', (e) => {
      if (e.target.closest('button') || e.target.closest('a')) return;
      
      const wasHolding = didHold;
      endHoldAction();
      
      // 💡 長押しされた場合（AまたはB）は「タップして進める」を絶対に発火させない
      if (!isScrolling && !wasHolding) {
        if (Date.now() - lastHoldEndTime > 400) {
          advanceQuizState();
        }
      }
      
      setTimeout(() => { isTouchDevice = false; }, 500);
    });

    quizCardEl.addEventListener('touchcancel', () => {
      endHoldAction();
      setTimeout(() => { isTouchDevice = false; }, 500);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (bindingKeyTarget) {
      e.preventDefault();
      const keyName = e.code === 'Space' ? 'Space' : e.key;
      if (!userConfig.keyBinds[bindingKeyTarget]) userConfig.keyBinds[bindingKeyTarget] = [];
      userConfig.keyBinds[bindingKeyTarget] = [keyName];
      saveConfig(); updateKeyBindButtons(); bindingKeyTarget = null;
      return;
    }

    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

    if (quizScreen && !quizScreen.classList.contains('hidden')) {
      const kb = userConfig.keyBinds || DEFAULT_KEY_BINDS;
      const key = e.key; const code = e.code;
      const isMatch = (bindList) => bindList && (bindList.includes(key) || bindList.includes(code));

      if (isMatch(kb.advance)) {
        e.preventDefault(); advanceQuizState();
      } else if (state === 'ANSWERED') {
        if (isMatch(kb.again)) { e.preventDefault(); handleAnswer('again'); }
        else if (isMatch(kb.hard)) { e.preventDefault(); handleAnswer('hard'); }
        else if (isMatch(kb.good)) { e.preventDefault(); handleAnswer('good'); }
        else if (isMatch(kb.easy)) { e.preventDefault(); handleAnswer('easy'); }
      }
    }
  });

  if (csvInput) {
    csvInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.csv')) { alert('CSVファイルのみ追加可能です。'); csvInput.value = ''; return; }
      const reader = new FileReader();
      reader.onload = event => processCsvText(event.target.result, file.name);
      reader.readAsText(file, 'UTF-8');
    });
  }
}

window.addEventListener('DOMContentLoaded', initApp);