const GRID_SIZE = 8;
const WORDS_PER_PUZZLE = 9;
const MAX_HISTORY = 5;
const DIRECTIONS = [
  [0, 1], [1, 0], [0, -1], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
];
const HIGHLIGHT_COLORS = [
  "rgba(239, 68, 68, 0.35)",
  "rgba(59, 130, 246, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(168, 85, 247, 0.35)",
  "rgba(245, 158, 11, 0.35)",
  "rgba(236, 72, 153, 0.35)",
  "rgba(20, 184, 166, 0.35)",
  "rgba(249, 115, 22, 0.35)",
  "rgba(100, 116, 139, 0.35)"
];

// ── State ──
let puzzles = [];            // array of all active puzzles (up to MAX_PUZZLES)
let puzzleIdx = -1;          // index of current puzzle in the array
let currentPuzzle = null;    // shortcut to puzzles[puzzleIdx]
const MAX_PUZZLES = 6;       // max puzzles kept (current + 5 incomplete)
let puzzleNumber = 0;
let categoryOrder = [];
let categoryIndex = 0;

// Selection state
let selecting = false;
let startCell = null;
let currentCells = [];
let capturedPointerId = null;

// ── DOM refs ──
const gridEl = document.getElementById("grid");
const wordListEl = document.getElementById("word-list");
const overlayEl = document.getElementById("overlay");
const levelEl = document.getElementById("level-indicator");
const themeEl = document.getElementById("theme-indicator");
const gridWrapper = document.getElementById("grid-wrapper");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const confirmDialog = document.getElementById("confirm-dialog");
const confirmMsg = document.getElementById("confirm-message");
const confirmYes = document.getElementById("confirm-yes");
const confirmNo = document.getElementById("confirm-no");
const hintDialog = document.getElementById("hint-dialog");
const hintMsg = document.getElementById("hint-message");
const hintYes = document.getElementById("hint-yes");
const hintNo = document.getElementById("hint-no");

// ── Category cycling ──

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextCategory() {
  if (categoryIndex >= categoryOrder.length) {
    categoryOrder = shuffleArray(Object.keys(WORD_LISTS));
    categoryIndex = 0;
  }
  return categoryOrder[categoryIndex++];
}

function initCategories() {
  categoryOrder = shuffleArray(Object.keys(WORD_LISTS));
  categoryIndex = 0;
}

// ── Puzzle Generation ──

function pickWords(theme) {
  const pool = WORD_LISTS[theme].filter(w => w.length <= GRID_SIZE);
  const shuffled = shuffleArray(pool);
  return shuffled.slice(0, WORDS_PER_PUZZLE);
}

function generatePuzzle() {
  for (let categoryAttempt = 0; categoryAttempt < 5; categoryAttempt++) {
    const theme = nextCategory();
    for (let attempt = 0; attempt < 20; attempt++) {
      const words = pickWords(theme);
      const result = tryPlaceWords(words);
      if (result) {
        fillBlanks(result.grid);
        puzzleNumber++;
        currentPuzzle = {
          grid: result.grid,
          words,
          theme,
          foundWords: new Set(),
          foundHighlights: [],
          wordPositions: result.positions,
          puzzleNumber
        };
        return true;
      }
    }
  }
  currentPuzzle = null;
  return false;
}

function tryPlaceWords(words) {
  const g = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""));
  const positions = {};
  const sorted = [...words].sort((a, b) => b.length - a.length);
  for (const word of sorted) {
    const pos = placeWord(g, word);
    if (!pos) return null;
    positions[word] = pos;
  }
  return { grid: g, positions };
}

function placeWord(g, word) {
  const dirs = shuffleArray(DIRECTIONS);
  for (const [dr, dc] of dirs) {
    const positions = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlace(g, word, r, c, dr, dc)) {
          positions.push([r, c]);
        }
      }
    }
    if (positions.length > 0) {
      const [r, c] = positions[Math.floor(Math.random() * positions.length)];
      const cells = [];
      for (let i = 0; i < word.length; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        g[nr][nc] = word[i];
        cells.push({ row: nr, col: nc });
      }
      return cells;
    }
  }
  return null;
}

function canPlace(g, word, r, c, dr, dc) {
  for (let i = 0; i < word.length; i++) {
    const nr = r + dr * i;
    const nc = c + dc * i;
    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
    if (g[nr][nc] !== "" && g[nr][nc] !== word[i]) return false;
  }
  return true;
}

function fillBlanks(g) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (g[r][c] === "") {
        g[r][c] = letters[Math.floor(Math.random() * 26)];
      }
    }
  }
}

// ── Rendering ──

function renderAll() {
  renderGrid();
  renderWordList();
  renderLevel();
  renderFoundCells();
  renderHighlightSVG();
  updateNavButtons();
}

function renderGrid() {
  gridEl.innerHTML = "";
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = currentPuzzle.grid[r][c];
      cell.dataset.row = r;
      cell.dataset.col = c;
      gridEl.appendChild(cell);
    }
  }
}

function renderWordList() {
  wordListEl.innerHTML = "";
  for (const word of currentPuzzle.words) {
    const tag = document.createElement("span");
    tag.className = "word-tag";
    if (currentPuzzle.foundWords.has(word)) tag.classList.add("found");
    tag.textContent = word;
    tag.dataset.word = word;
    tag.addEventListener("click", () => onWordTap(word));
    wordListEl.appendChild(tag);
  }
}

function renderLevel() {
  levelEl.textContent = "Puzzle " + currentPuzzle.puzzleNumber;
  themeEl.textContent = currentPuzzle.theme;
}

function renderFoundCells() {
  for (const word of currentPuzzle.foundWords) {
    const cells = currentPuzzle.wordPositions[word];
    if (cells) {
      for (const { row, col } of cells) {
        const el = gridEl.children[row * GRID_SIZE + col];
        if (el) el.classList.add("found-cell");
      }
    }
  }
}

function updateNavButtons() {
  btnPrev.disabled = puzzleIdx <= 0;
  btnNext.textContent = puzzleIdx < puzzles.length - 1 ? "Next" : "Next Puzzle";
}

// ── SVG highlight lines ──

// Persistent SVG element and drag line — created once, updated as needed
let highlightSVG = null;
let dragLine = null;

function ensureHighlightSVG() {
  if (!highlightSVG) {
    highlightSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    highlightSVG.id = "highlight-svg";
    gridWrapper.appendChild(highlightSVG);
  }
  if (!dragLine) {
    dragLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    dragLine.setAttribute("stroke", "rgba(37, 99, 235, 0.3)");
    dragLine.setAttribute("stroke-linecap", "round");
    dragLine.style.display = "none";
    highlightSVG.appendChild(dragLine);
  }
}

function renderFoundHighlights() {
  ensureHighlightSVG();
  // Remove all lines except the drag line
  const lines = highlightSVG.querySelectorAll("line:not(:last-child)");
  lines.forEach(l => l.remove());

  const cellSize = gridWrapper.offsetWidth / GRID_SIZE;

  // Re-insert found highlights before the drag line
  for (const h of currentPuzzle.foundHighlights) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", h.startCol * cellSize + cellSize / 2);
    line.setAttribute("y1", h.startRow * cellSize + cellSize / 2);
    line.setAttribute("x2", h.endCol * cellSize + cellSize / 2);
    line.setAttribute("y2", h.endRow * cellSize + cellSize / 2);
    line.setAttribute("stroke", h.color);
    line.setAttribute("stroke-width", cellSize * 0.7);
    line.setAttribute("stroke-linecap", "round");
    highlightSVG.insertBefore(line, dragLine);
  }

  // Update drag line stroke width
  dragLine.setAttribute("stroke-width", cellSize * 0.7);
}

function updateDragLine() {
  ensureHighlightSVG();
  const cellSize = gridWrapper.offsetWidth / GRID_SIZE;

  if (selecting && currentCells.length > 1) {
    const first = currentCells[0];
    const last = currentCells[currentCells.length - 1];
    dragLine.setAttribute("x1", first.col * cellSize + cellSize / 2);
    dragLine.setAttribute("y1", first.row * cellSize + cellSize / 2);
    dragLine.setAttribute("x2", last.col * cellSize + cellSize / 2);
    dragLine.setAttribute("y2", last.row * cellSize + cellSize / 2);
    dragLine.setAttribute("stroke-width", cellSize * 0.7);
    dragLine.style.display = "";
  } else {
    dragLine.style.display = "none";
  }
}

function renderHighlightSVG() {
  renderFoundHighlights();
  updateDragLine();
}

// ── Touch / Pointer handling ──

function getCellFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (el && el.classList.contains("cell")) {
    return { row: parseInt(el.dataset.row), col: parseInt(el.dataset.col), el };
  }
  return null;
}

function getCellsInLine(r1, c1, r2, c2) {
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  const rowDist = Math.abs(r2 - r1);
  const colDist = Math.abs(c2 - c1);
  if (rowDist !== colDist && rowDist !== 0 && colDist !== 0) return null;
  const steps = Math.max(rowDist, colDist);
  const cells = [];
  for (let i = 0; i <= steps; i++) {
    cells.push({ row: r1 + dr * i, col: c1 + dc * i });
  }
  return cells;
}

function clearSelectionHighlight() {
  document.querySelectorAll(".cell.selecting").forEach(c => c.classList.remove("selecting"));
}

function highlightCells(cells) {
  clearSelectionHighlight();
  for (const { row, col } of cells) {
    const el = gridEl.children[row * GRID_SIZE + col];
    if (el) el.classList.add("selecting");
  }
}

function onPointerDown(e) {
  e.preventDefault();
  const cell = getCellFromPoint(e.clientX, e.clientY);
  if (!cell) return;
  selecting = true;
  startCell = cell;
  currentCells = [{ row: cell.row, col: cell.col }];
  capturedPointerId = e.pointerId;
  gridEl.setPointerCapture(e.pointerId);
  highlightCells(currentCells);
  updateDragLine();
}

function onPointerMove(e) {
  if (!selecting) return;
  e.preventDefault();
  const cell = getCellFromPoint(e.clientX, e.clientY);
  if (!cell) return;
  const cells = getCellsInLine(startCell.row, startCell.col, cell.row, cell.col);
  if (cells) {
    currentCells = cells;
    highlightCells(cells);
    updateDragLine();
  }
}

function onPointerUp(e) {
  if (!selecting) return;
  e.preventDefault();
  if (gridEl.hasPointerCapture(e.pointerId)) {
    gridEl.releasePointerCapture(e.pointerId);
  }
  capturedPointerId = null;
  selecting = false;
  checkSelection();
  clearSelectionHighlight();
  currentCells = [];
  updateDragLine();
}

function checkSelection() {
  if (currentCells.length < 2) return;
  const selected = currentCells.map(({ row, col }) => currentPuzzle.grid[row][col]).join("");
  const reversed = [...selected].reverse().join("");

  for (const word of currentPuzzle.words) {
    if (currentPuzzle.foundWords.has(word)) continue;
    if (selected === word || reversed === word) {
      currentPuzzle.foundWords.add(word);
      markFound(word);
      currentPuzzle.foundHighlights.push({
        startRow: currentCells[0].row,
        startCol: currentCells[0].col,
        endRow: currentCells[currentCells.length - 1].row,
        endCol: currentCells[currentCells.length - 1].col,
        color: HIGHLIGHT_COLORS[currentPuzzle.foundHighlights.length % HIGHLIGHT_COLORS.length]
      });
      renderHighlightSVG();
      saveState();
      if (currentPuzzle.foundWords.size === currentPuzzle.words.length) {
        setTimeout(showComplete, 300);
      }
      return;
    }
  }
}

function markFound(word) {
  const tags = wordListEl.querySelectorAll(".word-tag");
  for (const tag of tags) {
    if (tag.dataset.word === word) tag.classList.add("found");
  }
  const cells = currentPuzzle.wordPositions[word];
  if (cells) {
    for (const { row, col } of cells) {
      const el = gridEl.children[row * GRID_SIZE + col];
      if (el) el.classList.add("found-cell");
    }
  }
}

// ── Hints ──

let hintWord = null;

function onWordTap(word) {
  if (currentPuzzle.foundWords.has(word)) return;
  hintWord = word;
  hintMsg.textContent = "Show hint for \"" + word + "\"?";
  hintDialog.classList.add("visible");
}

function showHint() {
  hintDialog.classList.remove("visible");
  if (!hintWord) return;
  const cells = currentPuzzle.wordPositions[hintWord];
  if (!cells || cells.length === 0) return;
  const firstCell = cells[0];
  const el = gridEl.children[firstCell.row * GRID_SIZE + firstCell.col];
  if (!el) return;
  el.classList.add("hint-flash");
  setTimeout(() => el.classList.remove("hint-flash"), 1500);
  hintWord = null;
}

hintYes.addEventListener("click", showHint);
hintNo.addEventListener("click", () => {
  hintDialog.classList.remove("visible");
  hintWord = null;
});

// ── Completion ──

function showComplete() {
  overlayEl.classList.add("visible");
  setTimeout(() => {
    overlayEl.classList.remove("visible");
    // Remove completed puzzle now that overlay is done
    puzzles.splice(puzzleIdx, 1);
    if (puzzleIdx >= puzzles.length) puzzleIdx = Math.max(puzzles.length - 1, 0);
    goToNewPuzzle();
  }, 2000);
}

// ── Navigation ──

function setCurrent(idx) {
  puzzleIdx = idx;
  currentPuzzle = puzzles[puzzleIdx];
}

function switchTo(idx) {
  setCurrent(idx);
  renderAll();
  saveState();
}

function goToNewPuzzle() {
  // If there are puzzles ahead of current position, go to next one
  if (puzzleIdx < puzzles.length - 1) {
    switchTo(puzzleIdx + 1);
    return;
  }
  // Generate a brand new puzzle
  if (!generatePuzzle() || !currentPuzzle) {
    overlayEl.querySelector("h2").textContent = "Oops!";
    overlayEl.querySelector("p").textContent = "Could not generate a puzzle. Please tap Update.";
    overlayEl.classList.add("visible");
    return;
  }
  // Trim from the front if we're over the limit
  if (puzzles.length >= MAX_PUZZLES) {
    puzzles.shift();
  }
  puzzles.push(currentPuzzle);
  setCurrent(puzzles.length - 1);
  renderAll();
  saveState();
}

function goToPrevPuzzle() {
  if (puzzleIdx <= 0) return;
  switchTo(puzzleIdx - 1);
}

// Confirm dialog helpers
let confirmCallback = null;

function showConfirm(message, callback) {
  confirmMsg.textContent = message;
  confirmCallback = callback;
  confirmDialog.classList.add("visible");
}

confirmYes.addEventListener("click", () => {
  confirmDialog.classList.remove("visible");
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
});

confirmNo.addEventListener("click", () => {
  confirmDialog.classList.remove("visible");
  confirmCallback = null;
});

function needsConfirm() {
  return currentPuzzle.foundWords.size > 0 && currentPuzzle.foundWords.size < currentPuzzle.words.length;
}

btnNext.addEventListener("click", () => {
  if (needsConfirm()) {
    showConfirm("Leave this puzzle?", goToNewPuzzle);
  } else {
    goToNewPuzzle();
  }
});

btnPrev.addEventListener("click", () => {
  if (puzzleIdx <= 0) return;
  if (needsConfirm()) {
    showConfirm("Leave this puzzle?", goToPrevPuzzle);
  } else {
    goToPrevPuzzle();
  }
});

// ── Pointer events on grid ──
gridEl.addEventListener("pointerdown", onPointerDown);
gridEl.addEventListener("pointermove", onPointerMove);
gridEl.addEventListener("pointerup", onPointerUp);
gridEl.addEventListener("pointercancel", onPointerUp);
gridEl.addEventListener("touchmove", e => e.preventDefault(), { passive: false });

document.addEventListener("pointerup", () => {
  if (selecting) {
    if (capturedPointerId != null) {
      try { gridEl.releasePointerCapture(capturedPointerId); } catch (e) { /* already released */ }
      capturedPointerId = null;
    }
    selecting = false;
    checkSelection();
    clearSelectionHighlight();
    currentCells = [];
    updateDragLine();
  }
});

window.addEventListener("resize", () => renderFoundHighlights());

// ── Service Worker ──
if ("serviceWorker" in navigator) {
  let hasController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js");
  // When a new service worker takes over (not on first install), reload to pick up new assets
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasController) location.reload();
    hasController = true;
  });
}

// ── Update button ──
document.getElementById("btn-update").addEventListener("click", async () => {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));
  }
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  location.reload();
});

// ── State Persistence ──

function saveState() {
  try {
    const data = {
      puzzles: puzzles.map(p => ({
        grid: p.grid,
        words: p.words,
        theme: p.theme,
        foundWords: [...p.foundWords],
        foundHighlights: p.foundHighlights,
        wordPositions: p.wordPositions,
        puzzleNumber: p.puzzleNumber
      })),
      puzzleIdx,
      puzzleNumber,
      categoryOrder,
      categoryIndex
    };
    localStorage.setItem("wordsearch-state", JSON.stringify(data));
  } catch (e) {
    // localStorage full or unavailable — silently ignore
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem("wordsearch-state");
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.puzzles) || data.puzzles.length === 0) return false;

    // Validate puzzleIdx bounds
    if (typeof data.puzzleIdx !== "number" || data.puzzleIdx < 0 || data.puzzleIdx >= data.puzzles.length) return false;

    // Validate each puzzle has required fields
    const requiredFields = ["grid", "words", "theme", "foundWords", "wordPositions"];
    for (const p of data.puzzles) {
      for (const f of requiredFields) {
        if (p[f] == null) return false;
      }
    }

    puzzles = data.puzzles.map(p => ({
      grid: p.grid,
      words: p.words,
      theme: p.theme,
      foundWords: new Set(p.foundWords),
      foundHighlights: p.foundHighlights || [],
      wordPositions: p.wordPositions,
      puzzleNumber: p.puzzleNumber
    }));
    puzzleNumber = data.puzzleNumber || 0;

    // Filter categoryOrder to only include keys that still exist in WORD_LISTS
    const validCategories = Object.keys(WORD_LISTS);
    categoryOrder = Array.isArray(data.categoryOrder)
      ? data.categoryOrder.filter(c => validCategories.includes(c))
      : [];
    if (categoryOrder.length === 0) {
      categoryOrder = shuffleArray(validCategories);
    }
    categoryIndex = typeof data.categoryIndex === "number" ? Math.min(data.categoryIndex, categoryOrder.length) : 0;

    setCurrent(data.puzzleIdx);
    return true;
  } catch (e) {
    return false;
  }
}

// ── Start ──
if (!loadState()) {
  initCategories();
  if (!generatePuzzle() || !currentPuzzle) {
    document.body.textContent = "Could not generate a puzzle. Please reload.";
  } else {
    puzzles.push(currentPuzzle);
    setCurrent(0);
  }
}
if (currentPuzzle) renderAll();
