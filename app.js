// 初期サンプルデータ
const defaultDecks = [
  {
    id: "deck-1",
    title: "雑学クイズ基本セット",
    orderMode: "SHUFFLE", // "SHUFFLE" | "ORDER" | "WEAK"
    cards: [
      {
        id: "card-1",
        question: "日本の現在の首都として事実上機能している、関東地方に位置する都道府県はどこでしょう？",
        answer: "東京都",
        explanation: "人口は約1400万人で、日本の政治・経済の中心地です。",
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
        dueDate: 0,
        interval: 0,
        easeFactor: 2.5,
        reps: 0
      }
    ]
  }
];

// アプリ状態＆設定
let decks = [];
let currentDeck = null;
let studyQueue = [];
let currentCard = null;
let targetDeckForAddCard = null;
let targetDeckForCardList = null;
let targetDeckForSettings = null;
let targetCardForEdit = null;

// カード一覧のページネーション管理
let cardListPageIndex = 0;
const CARDS_PER_PAGE = 100;

let userConfig = {
  theme: "light",     // "light" | "dark"
  mode: "NORMAL",     // "NORMAL" | "FAST"
  charSpeed: 150      // 1文字あたりの表示スピード(ms)
};

let charIndex = 0;
let timer = null;
let previewTimer = null;
let startTime = 0;
let stopTime = 0;
let state = "IDLE";

const SAMPLE_PREVIEW_TEXT = "山梨県と静岡県にまたがる、日本で一番高い山は何でしょう？";

// DOM要素
const menuScreen = document.getElementById("menu-screen");
const optionScreen = document.getElementById("option-screen");
const quizScreen = document.getElementById("quiz-screen");
const addCardModal = document.getElementById("add-card-modal");
const editCardModal = document.getElementById("edit-card-modal");
const cardListModal = document.getElementById("card-list-modal");
const deckSettingsModal = document.getElementById("deck-settings-modal");

const deckListEl = document.getElementById("deck-list");
const csvInput = document.getElementById("csv-file-input");

const currentDeckTitleEl = document.getElementById("current-deck-title");
const progressInfoEl = document.getElementById("progress-info");
const questionEl = document.getElementById("question-text");
const answerSectionEl = document.getElementById("answer-section");
const answerTextEl = document.getElementById("answer-text");
const explanationTextEl = document.getElementById("explanation-text");
const searchTermTextEl = document.getElementById("search-term-text");
const resultStatsEl = document.getElementById("result-stats");
const statProgressEl = document.getElementById("stat-progress");
const statTimeEl = document.getElementById("stat-time");
const buttonsEl = document.getElementById("action-buttons");
const tapHintEl = document.getElementById("tap-hint");

// モーダル・設定用DOM要素
const newCardQ = document.getElementById("new-card-q");
const newCardA = document.getElementById("new-card-a");
const newCardExp = document.getElementById("new-card-exp");

const editCardQ = document.getElementById("edit-card-q");
const editCardA = document.getElementById("edit-card-a");
const editCardExp = document.getElementById("edit-card-exp");

const speedOptionGroup = document.getElementById("speed-option-group");
const charSpeedRange = document.getElementById("char-speed-range");
const speedValueDisplay = document.getElementById("speed-value-display");
const previewTextContainer = document.getElementById("preview-text-container");

const cardListDeckTitle = document.getElementById("card-list-deck-title");
const cardListContainer = document.getElementById("card-list-container");
const cardPaginationEl = document.getElementById("card-pagination");
const deckSettingsTitle = document.getElementById("deck-settings-title");

// --- 1. 初期化・保存 ---
function initApp() {
  const savedConfig = localStorage.getItem("aoki_config");
  if (savedConfig) {
    try {
      userConfig = { ...userConfig, ...JSON.parse(savedConfig) };
    } catch (e) {}
  }
  applyConfigUI();

  const savedDecks = localStorage.getItem("aoki_decks");
  if (savedDecks) {
    try {
      decks = JSON.parse(savedDecks);
      decks.forEach(d => {
        if (!d.orderMode) d.orderMode = "SHUFFLE";
      });
    } catch (e) {
      decks = defaultDecks;
    }
  } else {
    decks = defaultDecks;
    saveDecks();
  }
  
  showMenu();
}

function saveDecks() {
  localStorage.setItem("aoki_decks", JSON.stringify(decks));
}

function saveConfig() {
  localStorage.setItem("aoki_config", JSON.stringify(userConfig));
}

function applyConfigUI() {
  document.body.className = `theme-${userConfig.theme}`;
  
  const themeRadio = document.querySelector(`input[name="theme-option"][value="${userConfig.theme}"]`);
  if (themeRadio) themeRadio.checked = true;

  const modeRadio = document.querySelector(`input[name="mode-option"][value="${userConfig.mode}"]`);
  if (modeRadio) modeRadio.checked = true;

  charSpeedRange.value = userConfig.charSpeed;
  speedValueDisplay.textContent = userConfig.charSpeed;

  if (userConfig.mode === "FAST") {
    speedOptionGroup.classList.remove("hidden");
    startPreviewTyping();
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
  optionScreen.classList.add("hidden");
  quizScreen.classList.add("hidden");
}

function showMenu() {
  hideAllScreens();
  menuScreen.classList.remove("hidden");
  renderMenu();
}

function showOption() {
  hideAllScreens();
  optionScreen.classList.remove("hidden");
  applyConfigUI();
}

// --- 3. オプション設定 ---
function changeTheme(theme) {
  userConfig.theme = theme;
  saveConfig();
  applyConfigUI();
}

function changeMode(mode) {
  userConfig.mode = mode;
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

// --- 4. メインメニュー描画 ---
function renderMenu() {
  deckListEl.innerHTML = "";
  const now = Date.now();

  decks.forEach(deck => {
    const dueCount = deck.cards.filter(c => !c.dueDate || c.dueDate <= now).length;
    const learnedCount = deck.cards.filter(c => c.interval >= 1).length;
    const retentionRate = deck.cards.length > 0 ? Math.round((learnedCount / deck.cards.length) * 100) : 0;

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

// --- 5. デッキ・出題設定モーダル ---
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

// --- 6. デッキ・カード管理機能 ---
function showNewDeckModal() {
  const title = prompt("新しいデッキ名を入力してください:");
  if (title && title.trim()) {
    const newDeck = {
      id: "deck-" + Date.now(),
      title: title.trim(),
      orderMode: "SHUFFLE",
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
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;
  if (confirm(`デッキ「${deck.title}」を削除してもよろしいですか？`)) {
    decks = decks.filter(d => d.id !== deckId);
    saveDecks();
    renderMenu();
  }
}

// カード手動追加モーダル
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
    alert("問題文と答えは必須です。");
    return;
  }

  const deck = decks.find(d => d.id === targetDeckForAddCard);
  if (deck) {
    deck.cards.push({
      id: `card-${Date.now()}`,
      question: q,
      answer: a,
      explanation: exp,
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

// カード編集モーダル制御
function openEditModalForCard(card) {
  targetCardForEdit = card;
  editCardQ.value = card.question;
  editCardA.value = card.answer;
  editCardExp.value = card.explanation || "";
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
}

function submitEditCard() {
  if (!targetCardForEdit) return;

  const q = editCardQ.value.trim();
  const a = editCardA.value.trim();
  const exp = editCardExp.value.trim();

  if (!q || !a) {
    alert("問題文と答えは必須です。");
    return;
  }

  targetCardForEdit.question = q;
  targetCardForEdit.answer = a;
  targetCardForEdit.explanation = exp;

  saveDecks();

  if (currentCard && currentCard.id === targetCardForEdit.id) {
    questionEl.textContent = targetCardForEdit.question;
    answerTextEl.textContent = targetCardForEdit.answer;
    explanationTextEl.textContent = targetCardForEdit.explanation;
    searchTermTextEl.textContent = targetCardForEdit.answer;
  }

  if (targetDeckForCardList) {
    renderCardList();
  }
  
  renderMenu();
  closeEditCardModal();
}

// カード一覧モーダル制御（100件ごとページネーション対応）
function openCardListModal(deckId) {
  targetDeckForCardList = deckId;
  cardListPageIndex = 0; // 開くときは先頭ページに戻す
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
      </div>
      <div style="display:flex; gap:4px; flex-shrink:0;">
        <button class="btn-small" onclick="openEditCardModal('${card.id}')">編集</button>
        <button class="btn-small btn-small-danger" onclick="deleteCard('${card.id}')">削除</button>
      </div>
    `;
    cardListContainer.appendChild(cardEl);
  });

  // ページネーションコントロールの描画
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

// --- 7. CSVインポート ---
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
        cards: newCards
      };
      
      decks.push(newDeck);
      saveDecks();
      renderMenu();
      alert(`デッキ「${newDeck.title}」を追加・保持しました！（${newCards.length}枚）`);
    } else {
      alert("有効なカードデータが見つかりませんでした。");
    }
    csvInput.value = "";
  };
  reader.readAsText(file, "UTF-8");
});

// --- 8. 忘却曲線アルゴリズム（SM-2 調整版） ---
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

// --- 9. クイズ制御 & 出題順ソート ---
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

// Google検索実行
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

// 画面全体のタップ処理
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

// 回答ボタン処理
function handleAnswer(rating) {
  if (!currentCard) return;

  calculateNextReview(currentCard, rating);

  if (rating === 'again') {
    const card = studyQueue.shift();
    studyQueue.push(card);
  } else {
    studyQueue.shift();
  }

  loadNextCard();
}

// アプリ起動
initApp();