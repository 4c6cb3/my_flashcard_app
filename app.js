// 初期サンプルデータ
const defaultDecks = [
  {
    id: "deck-1",
    title: "雑学クイズ基本セット",
    orderMode: "SHUFFLE",
    lastStudied: Date.now(),
    cards: [
      {
        id: "card-1",
        question: "日本の現在の首都として事実上機能している、関東地方に位置する都道府県はどこでしょう？",
        answer: "東京都",
        explanation: "人口は約1400万人で、日本の政治・経済の中心地です。",
        image: "",
        dueDate: 0,
        interval: 0,
        easeFactor: 2.5,
        reps: 0
      },
      {
        id: "card-2",
        question: "太陽系で最も大きい、木星型惑星の代表格は何でしょう？",
        answer: "木星",
        explanation: "主に水素とヘリウムでできており、大赤斑という巨大な嵐が存在します。",
        image: "",
        dueDate: 0,
        interval: 0,
        easeFactor: 2.5,
        reps: 0
      }
    ]
  }
];

// 設定の初期定義（デフォルトテーマを "device" に設定）
const DEFAULT_USER_CONFIG = {
  theme: "device",
  fontSize: 15,
  mode: "NORMAL",
  charSpeed: 150,
  deckSortOrder: "RECENT"
};

// アプリ状態＆設定
let decks = [];
let trashDecks = [];
let studyLogs = {}; // YYYY-MM-DD: 枚数
let currentDeck = null;
let studyQueue = [];
let currentCard = null;
let targetDeckForAddCard = null;
let targetDeckForCardList = null;
let targetDeckForSettings = null;
let targetCardForEdit = null;
let currentEditingImageData = "";

let currentCalendarDate = new Date();

let cardListPageIndex = 0;
const CARDS_PER_PAGE = 100;

let userConfig = { ...DEFAULT_USER_CONFIG };

let tempFontSize = 15;

let charIndex = 0;
let timer = null;
let previewTimer = null;
let startTime = 0;
let stopTime = 0;
let state = "IDLE";

const SAMPLE_PREVIEW_TEXT = "山梨県と静岡県にまたがる、日本で一番高い山は何でしょう？";

// DOM要素
const menuScreen = document.getElementById("menu-screen");
const statsScreen = document.getElementById("stats-screen");
const optionScreen = document.getElementById("option-screen");
const quizScreen = document.getElementById("quiz-screen");
const addCardModal = document.getElementById("add-card-modal");
const editCardModal = document.getElementById("edit-card-modal");
const cardListModal = document.getElementById("card-list-modal");
const deckSettingsModal = document.getElementById("deck-settings-modal");
const csvImportModal = document.getElementById("csv-import-modal");
const trashModal = document.getElementById("trash-modal");
const trashListContainer = document.getElementById("trash-list-container");

const deckListEl = document.getElementById("deck-list");
const csvInput = document.getElementById("csv-file-input");

const currentDeckTitleEl = document.getElementById("current-deck-title");
const progressInfoEl = document.getElementById("progress-info");
const questionEl = document.getElementById("question-text");
const answerSectionEl = document.getElementById("answer-section");
const answerTextEl = document.getElementById("answer-text");
const explanationTextEl = document.getElementById("explanation-text");
const answerImageContainer = document.getElementById("answer-image-container");
const answerImageEl = document.getElementById("answer-image");
const searchTermTextEl = document.getElementById("search-term-text");
const resultStatsEl = document.getElementById("result-stats");
const statProgressEl = document.getElementById("stat-progress");
const statTimeEl = document.getElementById("stat-time");
const buttonsEl = document.getElementById("action-buttons");
const tapHintEl = document.getElementById("tap-hint");

const streakDaysEl = document.getElementById("streak-days");
const streakMessageEl = document.getElementById("streak-message");
const calendarTitleEl = document.getElementById("calendar-title");
const calendarGridEl = document.getElementById("calendar-grid");

const newCardQ = document.getElementById("new-card-q");
const newCardA = document.getElementById("new-card-a");
const newCardExp = document.getElementById("new-card-exp");

const editCardQ = document.getElementById("edit-card-q");
const editCardA = document.getElementById("edit-card-a");
const editCardExp = document.getElementById("edit-card-exp");
const editCardImgInput = document.getElementById("edit-card-img-input");
const editCardImgPreview = document.getElementById("edit-card-img-preview");
const editCardImgElement = document.getElementById("edit-card-img-element");

const speedOptionGroup = document.getElementById("speed-option-group");
const charSpeedRange = document.getElementById("char-speed-range");
const speedValueDisplay = document.getElementById("speed-value-display");
const previewTextContainer = document.getElementById("preview-text-container");

const fontSizeRange = document.getElementById("font-size-range");
const fontSizeValueDisplay = document.getElementById("font-size-value-display");

const cardListDeckTitle = document.getElementById("card-list-deck-title");
const cardListContainer = document.getElementById("card-list-container");
const cardPaginationEl = document.getElementById("card-pagination");
const deckSettingsTitle = document.getElementById("deck-settings-title");

// 画像のリサイズ・圧縮関数
function resizeImage(file, maxWidth = 600, maxHeight = 600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

if (editCardImgInput) {
  editCardImgInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      currentEditingImageData = await resizeImage(file);
      editCardImgElement.src = currentEditingImageData;
      editCardImgPreview.classList.remove("hidden");
    } catch (err) {
      alert("画像の読み込みに失敗しました。");
    }
  });
}

function removeEditCardImage() {
  currentEditingImageData = "";
  editCardImgInput.value = "";
  editCardImgElement.src = "";
  editCardImgPreview.classList.add("hidden");
}

// --- 1. 初期化・保存 ---
function initApp() {
  const savedConfig = localStorage.getItem("aoki_config");
  if (savedConfig) {
    try {
      userConfig = { ...userConfig, ...JSON.parse(savedConfig) };
      if (typeof userConfig.fontSize === "string") {
        if (userConfig.fontSize === "small") userConfig.fontSize = 14;
        else if (userConfig.fontSize === "large") userConfig.fontSize = 20;
        else userConfig.fontSize = 15;
      }
    } catch (e) {}
  }
  tempFontSize = userConfig.fontSize;
  applyConfigUI();

  const savedDecks = localStorage.getItem("aoki_decks");
  if (savedDecks) {
    try {
      decks = JSON.parse(savedDecks);
      decks.forEach(d => {
        if (!d.orderMode) d.orderMode = "SHUFFLE";
        if (!d.lastStudied) d.lastStudied = 0;
      });
    } catch (e) {
      decks = defaultDecks;
    }
  } else {
    decks = defaultDecks;
    saveDecks();
  }

  const savedTrash = localStorage.getItem("aoki_trash_decks");
  if (savedTrash) {
    try {
      trashDecks = JSON.parse(savedTrash);
    } catch (e) {
      trashDecks = [];
    }
  }

  const savedLogs = localStorage.getItem("aoki_logs");
  if (savedLogs) {
    try {
      studyLogs = JSON.parse(savedLogs);
    } catch (e) {
      studyLogs = {};
    }
  }
  
  showMenu();
}

function saveDecks() {
  localStorage.setItem("aoki_decks", JSON.stringify(decks));
}

function saveTrashDecks() {
  localStorage.setItem("aoki_trash_decks", JSON.stringify(trashDecks));
}

function saveConfig() {
  localStorage.setItem("aoki_config", JSON.stringify(userConfig));
}

function saveLogs() {
  localStorage.setItem("aoki_logs", JSON.stringify(studyLogs));
}

function recordStudyLog() {
  const todayStr = getFormattedDate(new Date());
  if (!studyLogs[todayStr]) {
    studyLogs[todayStr] = 0;
  }
  studyLogs[todayStr] += 1;
  saveLogs();
}

function getFormattedDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function applyConfigUI() {
  document.body.className = `theme-${userConfig.theme}`;
  
  document.documentElement.style.setProperty("--font-base", `${userConfig.fontSize}px`);
  document.documentElement.style.setProperty("--preview-font-size", `${tempFontSize}px`);

  const themeRadio = document.querySelector(`input[name="theme-option"][value="${userConfig.theme}"]`);
  if (themeRadio) themeRadio.checked = true;

  if (fontSizeRange) fontSizeRange.value = tempFontSize;
  if (fontSizeValueDisplay) fontSizeValueDisplay.textContent = tempFontSize;

  const modeRadio = document.querySelector(`input[name="mode-option"][value="${userConfig.mode}"]`);
  if (modeRadio) modeRadio.checked = true;
  
  const modeDescEl = document.getElementById("mode-description-text");
  if (modeDescEl) {
    if (userConfig.mode === "NORMAL") {
      modeDescEl.textContent = "問題文全表示の単語帳のようなモード。";
    } else if (userConfig.mode === "FAST") {
      modeDescEl.textContent = "問題文が1文字ずつ表示されるモード。早押しクイズの形式を再現。";
    }
  }

  const sortRadio = document.querySelector(`input[name="sort-option"][value="${userConfig.deckSortOrder}"]`);
  if (sortRadio) sortRadio.checked = true;

  charSpeedRange.value = userConfig.charSpeed;
  speedValueDisplay.textContent = userConfig.charSpeed;

  if (userConfig.mode === "FAST") {
    speedOptionGroup.classList.remove("hidden");
  } else {
    speedOptionGroup.classList.add("hidden");
    clearInterval(previewTimer);
  }
}

// --- 2. 画面遷移 ---
function hideAllScreens() {
  clearInterval(timer);
  clearInterval(previewTimer);
  menuScreen.classList.add("hidden");
  statsScreen.classList.add("hidden");
  optionScreen.classList.add("hidden");
  quizScreen.classList.add("hidden");
}

function showMenu() {
  hideAllScreens();
  menuScreen.classList.remove("hidden");
  renderMenu();
}

function showStats() {
  hideAllScreens();
  statsScreen.classList.remove("hidden");
  renderStatsScreen();
}

function showOption() {
  hideAllScreens();
  tempFontSize = userConfig.fontSize;
  optionScreen.classList.remove("hidden");
  applyConfigUI();
  if (userConfig.mode === "FAST") {
    startPreviewTyping();
  }
}

// --- 3. 努力量（可視化＆継続記録）制御 ---
function calculateStreak() {
  let streak = 0;
  let checkDate = new Date();
  
  const todayStr = getFormattedDate(checkDate);
  let hasToday = !!(studyLogs[todayStr] && studyLogs[todayStr] > 0);

  if (!hasToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = getFormattedDate(checkDate);
    if (studyLogs[dateStr] && studyLogs[dateStr] > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function getEncouragementMessage(streak) {
  if (streak === 0) return "まずは今日、最初の1枚を挑戦してみよう！";
  if (streak === 1) return "ナイススタート！この調子で明日も続けよう！";
  if (streak < 3) return "素晴らしい！習慣化への第一歩を踏み出せています！";
  if (streak < 7) return "すごい集中力！この勢いで1週間を目指そう！";
  if (streak < 14) return "1週間突破！着実に知識が定着してきています！";
  if (streak < 30) return "継続の達人！素晴らしい努力が実を結んでいます！";
  return "伝説的継続力！あなたの努力は本当に素晴らしいです！！";
}

function renderStatsScreen() {
  const streak = calculateStreak();
  streakDaysEl.textContent = streak;
  streakMessageEl.textContent = getEncouragementMessage(streak);

  renderCalendar();
}

function changeCalendarMonth(delta) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
  renderCalendar();
}

function renderCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  calendarTitleEl.textContent = `${year}年 ${month + 1}月`;
  calendarGridEl.innerHTML = "";

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  dayNames.forEach(d => {
    const dh = document.createElement("div");
    dh.className = "calendar-day-header";
    dh.textContent = d;
    calendarGridEl.appendChild(dh);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getFormattedDate(new Date());

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-cell empty";
    calendarGridEl.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const dateStr = getFormattedDate(cellDate);
    const count = studyLogs[dateStr] || 0;

    const cell = document.createElement("div");
    let cellClass = "calendar-cell";
    if (count > 0) cellClass += " has-data";
    if (dateStr === todayStr) cellClass += " today";

    cell.className = cellClass;
    cell.innerHTML = `
      <span class="day-num">${day}</span>
      ${count > 0 ? `<span class="day-count">${count}枚</span>` : ""}
    `;
    calendarGridEl.appendChild(cell);
  }
}

// --- 4. オプション設定 ---
function changeTheme(theme) {
  userConfig.theme = theme;
  saveConfig();
  applyConfigUI();
}

function updateFontSizePreview(size) {
  tempFontSize = parseInt(size, 10);
  if (fontSizeValueDisplay) fontSizeValueDisplay.textContent = tempFontSize;
  document.documentElement.style.setProperty("--preview-font-size", `${tempFontSize}px`);
}

function applyAndSaveFontSize() {
  userConfig.fontSize = tempFontSize;
  saveConfig();
  applyConfigUI();
  alert("文字サイズの設定をアプリ全体に保存・反映しました。");
}

function changeMode(mode) {
  userConfig.mode = mode;
  saveConfig();
  applyConfigUI();
  if (mode === "FAST") {
    startPreviewTyping();
  }
}

function changeDeckSortOrder(order) {
  userConfig.deckSortOrder = order;
  saveConfig();
  applyConfigUI();
}

function updateCharSpeed(speed) {
  userConfig.charSpeed = parseInt(speed, 10);
  speedValueDisplay.textContent = userConfig.charSpeed;
  saveConfig();
  startPreviewTyping();
}

function startPreviewTyping() {
  clearInterval(previewTimer);
  previewTextContainer.textContent = "";
  let pIndex = 0;

  previewTimer = setInterval(() => {
    if (pIndex < SAMPLE_PREVIEW_TEXT.length) {
      previewTextContainer.textContent += SAMPLE_PREVIEW_TEXT[pIndex];
      pIndex++;
    } else {
      clearInterval(previewTimer);
    }
  }, userConfig.charSpeed);
}

// 設定初期化処理関数
function resetAllSettings() {
  if (confirm("設定を初期状態に戻しますがよろしいですか？")) {
    userConfig = { ...DEFAULT_USER_CONFIG };
    tempFontSize = userConfig.fontSize;
    saveConfig();
    applyConfigUI();
    if (userConfig.mode === "FAST") {
      startPreviewTyping();
    }
    alert("設定を初期状態に戻しました。");
  }
}

// --- 5. メインメニュー描画 ---
function renderMenu() {
  deckListEl.innerHTML = "";
  const now = Date.now();

  if (decks.length === 0) {
    deckListEl.innerHTML = `
      <div class="empty-deck-notice">
        <p>まだデッキがありません。<br>「＋ 新規デッキ」や「📥 CSV追加」からデッキを追加して学習を始めましょう！</p>
      </div>
    `;
    return;
  }

  let sortedDecks = [...decks];
  if (userConfig.deckSortOrder === "RECENT") {
    sortedDecks.sort((a, b) => (b.lastStudied || 0) - (a.lastStudied || 0));
  }

  sortedDecks.forEach(deck => {
    const dueCount = deck.cards.filter(c => !c.dueDate || c.dueDate <= now).length;
    const learnedCount = deck.cards.filter(c => c.interval >= 1).length;
    
    const retentionRate = deck.cards.length > 0 
      ? ((learnedCount / deck.cards.length) * 100).toFixed(2) 
      : "0.00";

    let orderModeText = "シャッフル";
    if (deck.orderMode === "ORDER") orderModeText = "登録順";
    if (deck.orderMode === "WEAK") orderModeText = "苦手特化";

    const cardEl = document.createElement("div");
    cardEl.className = "deck-card";
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

// --- 6. デッキ・出題設定モーダル ---
function openDeckSettingsModal(deckId) {
  targetDeckForSettings = deckId;
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;

  deckSettingsTitle.textContent = `デッキ: ${deck.title}`;
  const currentMode = deck.orderMode || "SHUFFLE";
  
  const radio = document.querySelector(`input[name="deck-order-option"][value="${currentMode}"]`);
  if (radio) radio.checked = true;

  deckSettingsModal.classList.remove("hidden");
}

function closeDeckSettingsModal() {
  deckSettingsModal.classList.add("hidden");
  targetDeckForSettings = null;
}

function submitDeckSettings() {
  if (!targetDeckForSettings) return;
  const deck = decks.find(d => d.id === targetDeckForSettings);
  if (!deck) return;

  const selectedRadio = document.querySelector('input[name="deck-order-option"]:checked');
  if (selectedRadio) {
    deck.orderMode = selectedRadio.value;
    saveDecks();
    renderMenu();
  }
  closeDeckSettingsModal();
}

// --- 7. デッキ・カード管理機能 ---
function showNewDeckModal() {
  const title = prompt("新しいデッキ名を入力してください:");
  if (title && title.trim()) {
    const newDeck = {
      id: "deck-" + Date.now(),
      title: title.trim(),
      orderMode: "SHUFFLE",
      lastStudied: Date.now(),
      cards: []
    };
    decks.push(newDeck);
    saveDecks();
    renderMenu();
  }
}

function renameDeck(deckId) {
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;
  const newTitle = prompt("新しいデッキ名を入力してください:", deck.title);
  if (newTitle && newTitle.trim()) {
    deck.title = newTitle.trim();
    saveDecks();
    renderMenu();
  }
}

function resetDeckProgress(deckId) {
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;

  if (confirm(`デッキ「${deck.title}」の学習進捗をリセットしてもよろしいですか？\n（問題と答えのデータは消去されず、すべて未学習状態に戻ります）`)) {
    deck.cards.forEach(card => {
      card.dueDate = 0;
      card.interval = 0;
      card.easeFactor = 2.5;
      card.reps = 0;
    });

    saveDecks();
    renderMenu();
    alert(`デッキ「${deck.title}」の学習進捗をリセットしました。`);
  }
}

function deleteDeck(deckId) {
  const index = decks.findIndex(d => d.id === deckId);
  if (index === -1) return;
  const deck = decks[index];

  if (confirm(`デッキ「${deck.title}」をごみ箱へ移動しますか？`)) {
    const trashedItem = {
      originalIndex: index,
      deck: deck
    };
    trashDecks.push(trashedItem);
    decks.splice(index, 1);

    saveDecks();
    saveTrashDecks();
    renderMenu();
  }
}

// ごみ箱モーダルの操作ロジック
function openTrashModal() {
  renderTrashList();
  trashModal.classList.remove("hidden");
}

function closeTrashModal() {
  trashModal.classList.add("hidden");
}

function renderTrashList() {
  trashListContainer.innerHTML = "";
  const clearAllBtn = document.getElementById("trash-clear-all-btn");

  if (trashDecks.length === 0) {
    trashListContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">ごみ箱は空です。</div>`;
    if (clearAllBtn) clearAllBtn.style.display = "none";
    return;
  }

  if (clearAllBtn) clearAllBtn.style.display = "inline-block";

  trashDecks.forEach((item, index) => {
    const trashEl = document.createElement("div");
    trashEl.className = "trash-item";
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

  if (confirm("このデッキを復旧させますか？")) {
    const originalIndex = item.originalIndex;

    if (originalIndex !== undefined && originalIndex >= 0 && originalIndex <= decks.length) {
      decks.splice(originalIndex, 0, item.deck);
    } else {
      decks.push(item.deck);
    }

    trashDecks.splice(index, 1);

    saveDecks();
    saveTrashDecks();
    renderTrashList();
    renderMenu();
  }
}

function permanentlyDeleteDeck(index) {
  if (index < 0 || index >= trashDecks.length) return;

  if (confirm("Warning:このデッキを完全に消してもよいですか？この操作は取り消せません。")) {
    trashDecks.splice(index, 1);
    saveTrashDecks();
    renderTrashList();
  }
}

function clearAllTrash() {
  if (trashDecks.length === 0) return;

  if (confirm("Warning:ごみ箱内のデッキをすべて完全削除しますか？この操作は取り消せません。")) {
    trashDecks = [];
    saveTrashDecks();
    renderTrashList();
  }
}

function openAddCardModal(deckId) {
  targetDeckForAddCard = deckId;
  newCardQ.value = "";
  newCardA.value = "";
  newCardExp.value = "";
  addCardModal.classList.remove("hidden");
}

function closeAddCardModal() {
  addCardModal.classList.add("hidden");
  targetDeckForAddCard = null;
}

function submitAddCard() {
  const q = newCardQ.value.trim();
  const a = newCardA.value.trim();
  const exp = newCardExp.value.trim();

  if (!q || !a) {
    alert("Error:問題文と答えは必須です。");
    return;
  }

  const deck = decks.find(d => d.id === targetDeckForAddCard);
  if (deck) {
    deck.cards.push({
      id: `card-${Date.now()}`,
      question: q,
      answer: a,
      explanation: exp,
      image: "",
      dueDate: 0,
      interval: 0,
      easeFactor: 2.5,
      reps: 0
    });
    saveDecks();
    renderMenu();
    closeAddCardModal();
  }
}

function openEditModalForCard(card) {
  targetCardForEdit = card;
  editCardQ.value = card.question;
  editCardA.value = card.answer;
  editCardExp.value = card.explanation || "";
  
  editCardImgInput.value = "";
  currentEditingImageData = card.image || "";

  if (currentEditingImageData) {
    editCardImgElement.src = currentEditingImageData;
    editCardImgPreview.classList.remove("hidden");
  } else {
    editCardImgElement.src = "";
    editCardImgPreview.classList.add("hidden");
  }

  editCardModal.classList.remove("hidden");
}

function openEditCardModal(cardId) {
  const deck = decks.find(d => d.id === targetDeckForCardList);
  if (!deck) return;
  const card = deck.cards.find(c => c.id === cardId);
  if (!card) return;

  openEditModalForCard(card);
}

function openEditCurrentQuizCard(event) {
  event.stopPropagation();
  if (!currentCard) return;
  openEditModalForCard(currentCard);
}

function closeEditCardModal() {
  editCardModal.classList.add("hidden");
  targetCardForEdit = null;
  currentEditingImageData = "";
}

function submitEditCard() {
  if (!targetCardForEdit) return;

  const q = editCardQ.value.trim();
  const a = editCardA.value.trim();
  const exp = editCardExp.value.trim();

  if (!q || !a) {
    alert("Error:問題文と答えは必須です。");
    return;
  }

  targetCardForEdit.question = q;
  targetCardForEdit.answer = a;
  targetCardForEdit.explanation = exp;
  targetCardForEdit.image = currentEditingImageData;

  try {
    saveDecks();
  } catch (e) {
    alert("Error:容量の上限に達したため保存できませんでした。画像を削除するかサイズを下げてください。");
    return;
  }

  if (currentCard && currentCard.id === targetCardForEdit.id) {
    questionEl.textContent = targetCardForEdit.question;
    answerTextEl.textContent = targetCardForEdit.answer;
    explanationTextEl.textContent = targetCardForEdit.explanation;
    searchTermTextEl.textContent = targetCardForEdit.answer;

    if (targetCardForEdit.image) {
      answerImageEl.src = targetCardForEdit.image;
      answerImageContainer.classList.remove("hidden");
    } else {
      answerImageEl.src = "";
      answerImageContainer.classList.add("hidden");
    }
  }

  if (targetDeckForCardList) {
    renderCardList();
  }
  
  renderMenu();
  closeEditCardModal();
}

function openCardListModal(deckId) {
  targetDeckForCardList = deckId;
  cardListPageIndex = 0;
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;

  cardListDeckTitle.textContent = `カード一覧: ${deck.title}`;
  renderCardList();
  cardListModal.classList.remove("hidden");
}

function closeCardListModal() {
  cardListModal.classList.add("hidden");
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
  if (!deck) return;

  cardListContainer.innerHTML = "";
  if (deck.cards.length === 0) {
    cardListContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">カードがありません。</div>`;
    cardPaginationEl.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(deck.cards.length / CARDS_PER_PAGE);
  if (cardListPageIndex >= totalPages) cardListPageIndex = totalPages - 1;

  const startIdx = cardListPageIndex * CARDS_PER_PAGE;
  const endIdx = startIdx + CARDS_PER_PAGE;
  const pageCards = deck.cards.slice(startIdx, endIdx);

  pageCards.forEach((card, idx) => {
    const absoluteIndex = startIdx + idx + 1;
    const cardEl = document.createElement("div");
    cardEl.className = "card-item";
    cardEl.innerHTML = `
      <div class="card-item-info">
        <div class="card-item-q">${absoluteIndex}. Q. ${card.question}</div>
        <div class="card-item-a">A. ${card.answer}</div>
        ${card.explanation ? `<div class="card-item-exp">解説: ${card.explanation}</div>` : ""}
        ${card.image ? `<div class="card-item-img-badge">📷 画像あり</div>` : ""}
      </div>
      <div style="display:flex; gap:4px; flex-shrink:0;">
        <button class="btn-small" onclick="openEditCardModal('${card.id}')">編集</button>
        <button class="btn-small btn-small-danger" onclick="deleteCard('${card.id}')">削除</button>
      </div>
    `;
    cardListContainer.appendChild(cardEl);
  });

  cardPaginationEl.innerHTML = `
    <button class="btn-small" ${cardListPageIndex === 0 ? 'disabled style="opacity:0.4; cursor:default;"' : ''} onclick="changeCardListPage(-1)">← 前の100件</button>
    <span>${cardListPageIndex + 1} / ${totalPages} ページ (${deck.cards.length}枚中)</span>
    <button class="btn-small" ${cardListPageIndex >= totalPages - 1 ? 'disabled style="opacity:0.4; cursor:default;"' : ''} onclick="changeCardListPage(1)">次の100件 →</button>
  `;
}

function deleteCard(cardId) {
  const deck = decks.find(d => d.id === targetDeckForCardList);
  if (!deck) return;

  if (confirm("このカードを削除しますか？")) {
    deck.cards = deck.cards.filter(c => c.id !== cardId);
    saveDecks();
    renderCardList();
    renderMenu();
  }
}

// --- 8. CSVインポートモーダル ---
function openCsvImportModal() {
  csvInput.value = "";
  csvImportModal.classList.remove("hidden");
}

function closeCsvImportModal() {
  csvImportModal.classList.add("hidden");
}

csvInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    const lines = text.split("\n");
    const newCards = [];

    lines.forEach((line, index) => {
      const parts = line.split(",").map(p => p.trim().replace(/^"(.*)"$/, '$1'));
      if (parts.length >= 2 && parts[0] && parts[1]) {
        newCards.push({
          id: `card-${Date.now()}-${index}`,
          question: parts[0],
          answer: parts[1],
          explanation: parts[2] || "",
          image: "",
          dueDate: 0,
          interval: 0,
          easeFactor: 2.5,
          reps: 0
        });
      }
    });

    if (newCards.length > 0) {
      const newDeck = {
        id: "deck-" + Date.now(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        orderMode: "SHUFFLE",
        lastStudied: Date.now(),
        cards: newCards
      };
      
      decks.push(newDeck);
      saveDecks();
      closeCsvImportModal();
      renderMenu();
      alert(`デッキ「${newDeck.title}」を追加しました！（${newCards.length}枚）`);
    } else {
      alert("有効なカードデータが見つかりませんでした。");
    }
  };
  reader.readAsText(file, "UTF-8");
});

// --- 9. 忘却曲線アルゴリズム（SM-2 調整版） ---
function calculateNextReview(card, rating) {
  const now = Date.now();
  const ONE_MINUTE = 60 * 1000;
  const ONE_HOUR = 60 * ONE_MINUTE;
  const ONE_DAY = 24 * ONE_HOUR;

  let nextInterval = card.interval;
  let ease = card.easeFactor;
  let reps = card.reps;
  let nextDueDate = now;

  switch (rating) {
    case 'again':
      reps = 0;
      nextInterval = 0;
      nextDueDate = now + (1 * ONE_MINUTE);
      break;

    case 'hard':
      reps = 0;
      nextInterval = 0.5;
      nextDueDate = now + (12 * ONE_HOUR);
      ease = Math.max(1.3, ease - 0.15);
      break;

    case 'good':
      if (reps === 0) {
        nextInterval = 1;
      } else if (reps === 1) {
        nextInterval = 3;
      } else {
        nextInterval = Math.round(nextInterval * ease);
      }
      reps += 1;
      nextDueDate = now + (nextInterval * ONE_DAY);
      break;

    case 'easy':
      if (reps === 0) {
        nextInterval = 4;
      } else {
        nextInterval = Math.round(nextInterval * ease * 1.3);
      }
      reps += 1;
      ease += 0.15;
      nextDueDate = now + (nextInterval * ONE_DAY);
      break;
  }

  card.interval = nextInterval;
  card.easeFactor = ease;
  card.reps = reps;
  card.dueDate = nextDueDate;

  saveDecks();
}

// --- 10. クイズ制御 & 出題順ソート ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function sortStudyQueue(cards, mode) {
  const queue = [...cards];

  if (mode === "SHUFFLE") {
    return shuffleArray(queue);
  } else if (mode === "WEAK") {
    return queue.sort((a, b) => {
      if (a.interval !== b.interval) {
        return a.interval - b.interval;
      }
      return a.reps - b.reps;
    });
  } else {
    return queue;
  }
}

function startQuiz(deckId) {
  currentDeck = decks.find(d => d.id === deckId);
  if (!currentDeck || currentDeck.cards.length === 0) {
    alert("このデッキにはまだカードがありません。カードを追加してください。");
    return;
  }

  currentDeck.lastStudied = Date.now();
  saveDecks();

  const now = Date.now();
  let baseQueue = currentDeck.cards.filter(c => !c.dueDate || c.dueDate <= now);

  if (baseQueue.length === 0) {
    if (confirm("今日の復習カードは完了しています！全カードを再練習しますか？")) {
      baseQueue = [...currentDeck.cards];
    } else {
      return;
    }
  }

  const orderMode = currentDeck.orderMode || "SHUFFLE";
  studyQueue = sortStudyQueue(baseQueue, orderMode);

  currentDeckTitleEl.textContent = currentDeck.title;
  hideAllScreens();
  quizScreen.classList.remove("hidden");
  
  loadNextCard();
}

function loadNextCard() {
  if (studyQueue.length === 0) {
    alert("このセッションの学習がすべて完了しました！");
    showMenu();
    return;
  }

  currentCard = studyQueue[0];
  progressInfoEl.textContent = `残り: ${studyQueue.length}枚`;

  questionEl.textContent = "";
  answerTextEl.textContent = currentCard.answer;
  explanationTextEl.textContent = currentCard.explanation;

  if (currentCard.image) {
    answerImageEl.src = currentCard.image;
    answerImageContainer.classList.remove("hidden");
  } else {
    answerImageEl.src = "";
    answerImageContainer.classList.add("hidden");
  }

  searchTermTextEl.textContent = currentCard.answer;

  answerSectionEl.classList.add("hidden");
  resultStatsEl.classList.add("hidden");
  buttonsEl.classList.add("hidden");

  if (userConfig.mode === "FAST") {
    charIndex = 0;
    state = "TYPING";
    tapHintEl.textContent = "画面のどこかをタップしてストップ！";
    startTime = Date.now();

    clearInterval(timer);
    timer = setInterval(() => {
      if (charIndex < currentCard.question.length) {
        questionEl.textContent += currentCard.question[charIndex];
        charIndex++;
      } else {
        clearInterval(timer);
      }
    }, userConfig.charSpeed);

  } else {
    questionEl.textContent = currentCard.question;
    state = "STOPPED";
    tapHintEl.textContent = "画面のどこかをタップして答えを表示";
  }
}

function searchOnGoogle(event) {
  event.stopPropagation();
  
  if (!navigator.onLine) {
    alert("インターネット接続がありません。オンライン時にご利用いただけます。");
    return;
  }

  if (currentCard && currentCard.answer) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(currentCard.answer)}`;
    window.open(url, "_blank");
  }
}

quizScreen.addEventListener("click", (event) => {
  if (event.target.closest("button") || event.target.closest("a") || event.target.closest("input") || event.target.closest("textarea")) {
    return;
  }

  if (!currentCard) return;

  if (userConfig.mode === "FAST") {
    if (state === "TYPING") {
      clearInterval(timer);
      stopTime = Date.now();
      state = "STOPPED";

      const elapsedSeconds = ((stopTime - startTime) / 1000).toFixed(1);
      const progressPercent = Math.round((charIndex / currentCard.question.length) * 100);

      statProgressEl.textContent = `達成度: ${progressPercent}%`;
      statTimeEl.textContent = `タイム: ${elapsedSeconds}秒`;
      resultStatsEl.classList.remove("hidden");
      tapHintEl.textContent = "もう一度タップで答えを表示";

    } else if (state === "STOPPED") {
      questionEl.textContent = currentCard.question;
      answerSectionEl.classList.remove("hidden");
      buttonsEl.classList.remove("hidden");
      state = "REVEALED";
      tapHintEl.textContent = "理解度を選んでください";
    }
  } else {
    if (state === "STOPPED") {
      answerSectionEl.classList.remove("hidden");
      buttonsEl.classList.remove("hidden");
      state = "REVEALED";
      tapHintEl.textContent = "理解度を選んでください";
    }
  }
});

function handleAnswer(rating) {
  if (!currentCard) return;

  if (currentDeck) {
    currentDeck.lastStudied = Date.now();
  }

  recordStudyLog();
  calculateNextReview(currentCard, rating);

  if (rating === 'again') {
    const card = studyQueue.shift();
    studyQueue.push(card);
  } else {
    studyQueue.shift();
  }

  loadNextCard();
}

initApp();