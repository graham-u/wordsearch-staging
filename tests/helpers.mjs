// Shared test harness for word search tests
// Run from: cd ~/.claude/skills/dev-browser && npx tsx <test-file>

import { connect as devConnect, waitForPageLoad } from "@/client.js";

const URL = "http://localhost:8085/";
let client;
let _page;
let failures = 0;
let passes = 0;

async function init() {
  client = await devConnect();
  _page = await client.page("wordsearch-test", { viewport: { width: 400, height: 750 } });
  return _page;
}

async function freshPage() {
  if (!_page) await init();
  await _page.goto(URL);
  await waitForPageLoad(_page);
  await _page.waitForTimeout(500);
  // Clear state — may fail if a service worker triggers a reload, so retry
  try {
    await _page.evaluate(() => localStorage.removeItem("wordsearch-state"));
  } catch {
    await waitForPageLoad(_page);
    await _page.waitForTimeout(300);
    await _page.evaluate(() => localStorage.removeItem("wordsearch-state"));
  }
  await _page.goto(URL);
  await waitForPageLoad(_page);
  await _page.waitForTimeout(300);
  return _page;
}

async function getState() {
  return _page.evaluate(() => ({
    puzzle: currentPuzzle.puzzleNumber,
    theme: currentPuzzle.theme,
    found: currentPuzzle.foundWords.size,
    total: currentPuzzle.words.length,
    words: currentPuzzle.words,
    grid: currentPuzzle.grid,
    wordPositions: currentPuzzle.wordPositions,
    foundHighlights: currentPuzzle.foundHighlights,
    puzzleIdx,
    puzzleCount: puzzles.length,
    allPuzzles: puzzles.map(p => `P${p.puzzleNumber}(${p.foundWords.size}found)`),
  }));
}

async function findOneWord() {
  await _page.evaluate(() => {
    for (const word of currentPuzzle.words) {
      if (!currentPuzzle.foundWords.has(word)) {
        currentPuzzle.foundWords.add(word);
        const tags = document.querySelectorAll(".word-tag");
        for (const tag of tags) {
          if (tag.dataset.word === word) tag.classList.add("found");
        }
        break;
      }
    }
  });
}

function check(label, actual, expected) {
  if (actual !== expected) {
    console.log(`  FAIL ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    failures++;
  } else {
    console.log(`  OK   ${label}`);
    passes++;
  }
}

function results() {
  const total = passes + failures;
  if (failures === 0) {
    console.log(`\nALL ${total} TESTS PASSED`);
  } else {
    console.log(`\n${failures} of ${total} TEST(S) FAILED`);
  }
  return failures > 0 ? 1 : 0;
}

async function disconnect() {
  if (client) await client.disconnect();
}

export { init, freshPage, getState, findOneWord, check, results, disconnect };

// Getter so tests can access the page after init
export function page() { return _page; }
