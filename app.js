// Dutch Learning App frontend

const STORAGE_KEY = 'dutch_sentences_v1';
const PROG_KEY = 'dutch_progress_v1';
const THEME_KEY = 'dutch_theme_v1';

let sentences = [];
let progress = {}; // word -> { seen, correct, incorrect, known }

const sample = [
  { "sentence": "Ik eet een appel.", "test_words": ["appel"], "sentence_en": "I eat an apple.", "test_words_en": ["apple"], "difficulty": "easy" },
  { "sentence": "Zij gaat naar school elke dag.", "test_words": ["school"], "sentence_en": "She goes to school every day.", "test_words_en": ["school"], "difficulty": "medium" }
];

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    sentences = raw ? JSON.parse(raw) : sample.slice();
  } catch (e) { sentences = sample.slice(); }
  try { progress = JSON.parse(localStorage.getItem(PROG_KEY)) || {}; } catch(e){ progress = {}; }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sentences));
  localStorage.setItem(PROG_KEY, JSON.stringify(progress));
}

/* JSON Editor */
const jsonEditor = document.getElementById('jsonEditor');
const importFile = document.getElementById('importFile');

function renderJsonEditor() {
  jsonEditor.value = JSON.stringify(sentences, null, 2);
}

/* Theme handling */
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('btnTheme');
  if(btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  }
}

function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

document.getElementById('btnTheme').addEventListener('click', ()=>{
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

document.getElementById('btnPretty').addEventListener('click', () => {
  try { jsonEditor.value = JSON.stringify(JSON.parse(jsonEditor.value), null, 2); } catch(e) { alert('Invalid JSON'); }
});

document.getElementById('btnSaveJson').addEventListener('click', () => {
  try {
    const parsed = JSON.parse(jsonEditor.value);
    if (!Array.isArray(parsed)) throw new Error('Top-level JSON must be an array');
    sentences = parsed;
    saveToStorage();
    rebuildAll();
    alert('Saved');
  } catch (e) { alert('Invalid JSON: ' + e.message); }
});

document.getElementById('btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(sentences, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sentences.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (!confirm('Reset sentences to the sample data?')) return;
  sentences = sample.slice(); saveToStorage(); renderJsonEditor(); rebuildAll();
});

importFile.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) throw new Error('Top-level JSON must be an array');
      sentences = parsed; saveToStorage(); renderJsonEditor(); rebuildAll();
      alert('Imported');
    } catch (err) { alert('Import failed: ' + err.message); }
  };
  reader.readAsText(f);
});

document.getElementById('btnClearProgress').addEventListener('click', () => {
  if (!confirm('Clear progress data?')) return;
  progress = {}; saveToStorage(); renderProgress();
});

/* Tabs */
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', (e) => {
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  e.target.classList.add('active');
  const t = e.target.dataset.tab;
  document.querySelectorAll('.tabpane').forEach(p=>p.style.display='none');
  document.getElementById(t).style.display = 'block';
}));

/* Utility */
function buildWordBankFrom(sentList) {
  const map = {};
  sentList.forEach(s => {
    const words = s.test_words || [];
    const trans = s.test_words_en || [];
    words.forEach((w,i) => { map[w] = map[w] || { en: trans[i] || '', difficulty: s.difficulty || '' }; });
  });
  return map; // {word: {en, difficulty}}
}

/* Answers table (above sentences). If `items` is provided, only show answers for those sentences (relevant to view). */
function renderAnswersTable(items) {
  const listEl = document.getElementById('answersList');
  if (!listEl) return;
  const source = (items && items.length) ? items : sentences;
  const map = buildWordBankFrom(source);
  let words = Object.keys(map);
  shuffle(words);
  listEl.innerHTML = '';
  words.forEach(w => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = w;
    chip.title = map[w].en || '';
    chip.addEventListener('click', ()=>{
      try { navigator.clipboard && navigator.clipboard.writeText(w); } catch(e){}
      chip.animate([{ transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: 150 });
    });
    listEl.appendChild(chip);
  });
}

/* Progress UI */
function renderProgress() {
  const el = document.getElementById('progressSummary');
  const keys = Object.keys(progress);
  if (!keys.length) { el.textContent = 'No data yet.'; return; }
  let html = '<table class="progress"><tr><th>Word</th><th>Seen</th><th>Correct</th><th>Incorrect</th><th>Known</th></tr>';
  keys.slice(0,50).forEach(k => {
    const p = progress[k];
    html += `<tr><td>${k}</td><td>${p.seen||0}</td><td>${p.correct||0}</td><td>${p.incorrect||0}</td><td>${p.known? '✓':''}</td></tr>`;
  });
  html += '</table>';
  el.innerHTML = html;
}

/* Sentences Session (fill-in-the-blanks) */
let currentSession = { items: [], missed: [] };

function startSession(count) {
  const pool = sentences.slice();
  shuffle(pool);
  const sel = pool.slice(0, Math.min(count, pool.length));
  currentSession.items = sel.map(s => ({ ...s }));
  currentSession.missed = [];
  renderSession();
}

function renderSession() {
  const area = document.getElementById('sessionArea'); area.innerHTML = '';
  const showTrans = document.getElementById('toggleTranslation').checked;
  const showBank = document.getElementById('toggleWordBank').checked;

  // Render answers relevant to the session items (or all if none)
  renderAnswersTable(currentSession.items && currentSession.items.length ? currentSession.items : null);

  // collect all test words
  const wordMap = buildWordBankFrom(currentSession.items);
  const bankWords = Object.keys(wordMap);
  if (showBank) {
    const bank = document.createElement('div'); bank.className='panel'; bank.innerHTML = '<strong>Word bank</strong><div>' + bankWords.map(w=>`<button class="bankWord">${w}</button>`).join(' ') + '</div>';
    area.appendChild(bank);
    bank.querySelectorAll('.bankWord').forEach(b=> b.addEventListener('click', ()=>{ document.querySelector('#sessionArea input.blank')?.focus(); }));
  }

  currentSession.items.forEach((s, idx) => {
    const div = document.createElement('div'); div.className='panel';
    const sentenceHtml = buildSentenceWithBlanks(s, idx);
    div.innerHTML = `<div class="sentence">${sentenceHtml}</div>` + (showTrans ? `<div class="small">${escapeHtml(s.sentence_en||'')}</div>` : '');
    area.appendChild(div);
  });

  const checkBtn = document.createElement('button'); checkBtn.textContent = 'Check Answers';
  checkBtn.addEventListener('click', checkSessionAnswers);
  area.appendChild(checkBtn);
}

function buildSentenceWithBlanks(s, idx) {
  let text = s.sentence;
  const blanks = [];
  (s.test_words||[]).forEach((w,i)=>{
    // replace whole word occurrences case-insensitive
    const re = new RegExp('\\b' + escapeRegExp(w) + '\\b', 'gi');
    let replaced = false;
    text = text.replace(re, (m)=>{
      if (replaced) return m; // only first occurrence for simplicity
      replaced = true;
      const name = `blank_${idx}_${i}`;
      blanks.push(name);
      return `<input class="blank" data-word="${w}" data-word-en="${(s.test_words_en||[])[i]||''}" name="${name}" placeholder="_____" />`;
    });
  });
  return text;
}

function checkSessionAnswers() {
  currentSession.missed = [];
  const inputs = document.querySelectorAll('#sessionArea input.blank');
  inputs.forEach(inp => {
    const expected = inp.dataset.word.toLowerCase().trim();
    const got = (inp.value||'').toLowerCase().trim();
    const ok = got === expected;
    inp.style.border = ok ? '2px solid #16a34a' : '2px solid #dc2626';
    if (!ok) currentSession.missed.push({ word: inp.dataset.word, en: inp.dataset.wordEn });
    // update progress
    const key = inp.dataset.word;
    progress[key] = progress[key] || { seen:0, correct:0, incorrect:0, known:false };
    progress[key].seen = (progress[key].seen||0) + 1;
    if (ok) progress[key].correct = (progress[key].correct||0) + 1; else progress[key].incorrect = (progress[key].incorrect||0) + 1;
  });
  saveToStorage(); renderProgress();
  const fb = document.getElementById('sessionFeedback'); fb.innerHTML = `Missed: ${currentSession.missed.length}`;
  document.getElementById('btnReviewMissed').disabled = !currentSession.missed.length;
}

document.getElementById('btnStartSession').addEventListener('click', () => {
  const c = Number(document.getElementById('sessionCount').value) || 10; startSession(c);
});

document.getElementById('btnReviewMissed').addEventListener('click', () => {
  if (!currentSession.missed.length) return; // build mini-session from missed
  const items = currentSession.missed.map(m=>({ sentence: m.word, test_words: [m.word], sentence_en: m.en||'', test_words_en:[m.en||''], difficulty: '' }));
  currentSession.items = items; renderSession();
});

/* Flashcards */
let cards = []; let cardIndex = 0; 
function buildCards() {
  const map = buildWordBankFrom(sentences);
  cards = Object.keys(map).map(w => ({ word: w, en: map[w].en, difficulty: map[w].difficulty }));
  cardIndex = 0; renderCard();
}

function renderCard() {
  const front = document.getElementById('cardFront');
  const back = document.getElementById('cardBack');
  if (!cards.length) { front.textContent = 'No cards'; back.textContent=''; document.getElementById('cardMeta').textContent=''; return; }
  const c = cards[cardIndex]; front.textContent = c.word; back.textContent = c.en || '[no translation]';
  document.getElementById('cardMeta').textContent = `(${cardIndex+1}/${cards.length}) difficulty: ${c.difficulty||'n/a'}`;
}

document.getElementById('btnFlip').addEventListener('click', ()=>{
  document.getElementById('cardBack').classList.toggle('hidden');
});
document.getElementById('btnNextCard').addEventListener('click', ()=>{ cardIndex = (cardIndex+1)%Math.max(1,cards.length); renderCard(); });
document.getElementById('btnPrevCard').addEventListener('click', ()=>{ cardIndex = (cardIndex-1 + cards.length)%Math.max(1,cards.length); renderCard(); });
document.getElementById('btnKnown').addEventListener('click', ()=>{ const w = cards[cardIndex].word; progress[w] = progress[w] || {seen:0,correct:0,incorrect:0,known:false}; progress[w].known = true; saveToStorage(); renderProgress(); });
document.getElementById('btnReview').addEventListener('click', ()=>{ const w = cards[cardIndex].word; progress[w] = progress[w] || {seen:0,correct:0,incorrect:0,known:false}; progress[w].known = false; saveToStorage(); renderProgress(); });
document.getElementById('btnHint').addEventListener('click', ()=>{ const en = cards[cardIndex].en || ''; alert('Hint: ' + (en[0] || '?')); });

/* Memorise Tab */
let memoWords = []; let memoIndex = 0; let rapidTimer = null; let sprintTimer = null; let sprintRemaining = 0; let sprintScore = 0;

function buildMemoWords() { const map = buildWordBankFrom(sentences); memoWords = Object.keys(map).map(w=>({word:w,en:map[w].en})); memoIndex = 0; }

function renderMemoMode(mode) {
  document.querySelectorAll('.mode').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.mode[data-mode="${mode}"]`).classList.add('active');
  document.getElementById('rapidArea').classList.toggle('hidden', mode !== 'rapid');
  document.getElementById('typeArea').classList.toggle('hidden', mode !== 'type');
  document.getElementById('sprintArea').classList.toggle('hidden', mode !== 'sprint');
}

document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', e=>{ renderMemoMode(e.target.dataset.mode); }));

function showRapidWord() {
  if (!memoWords.length) { document.getElementById('rapidWord').textContent='No words'; return; }
  const w = memoWords[memoIndex]; document.getElementById('rapidWord').textContent = w.word; document.getElementById('btnReveal').onclick = ()=>{ alert(w.en || '[no translation]'); };
}

document.getElementById('btnReveal').addEventListener('click', ()=>{ const w = memoWords[memoIndex]; alert(w.en || '[no translation]'); if (document.getElementById('rapidLoop').checked) { nextRapid(); } });

function nextRapid() { const delay = Math.max(200, Number(document.getElementById('rapidDelay').value||1000)); memoIndex = (memoIndex+1)%Math.max(1,memoWords.length); showRapidWord(); if (rapidTimer) clearTimeout(rapidTimer); if (document.getElementById('rapidLoop').checked) rapidTimer = setTimeout(nextRapid, delay); }

/* Type-to-Learn */
function showTypeWord() { if (!memoWords.length) { document.getElementById('typeWord').textContent='No words'; return; } const w = memoWords[memoIndex]; document.getElementById('typeWord').textContent = w.word; document.getElementById('typeInput').value=''; document.getElementById('typeFeedback').textContent=''; document.getElementById('typeInput').focus(); }

document.getElementById('typeInput').addEventListener('keydown', (e)=>{
  if (e.key !== 'Enter') return; const val = (e.target.value||'').trim().toLowerCase(); const w = memoWords[memoIndex]; const ok = val === (w.en||'').toLowerCase(); document.getElementById('typeFeedback').textContent = ok ? 'Correct' : `Wrong — ${w.en||''}`;
  // update progress
  progress[w.word] = progress[w.word] || {seen:0,correct:0,incorrect:0,known:false}; progress[w.word].seen++; if (ok) progress[w.word].correct++; else progress[w.word].incorrect++; saveToStorage(); renderProgress();
  memoIndex = (memoIndex+1)%Math.max(1,memoWords.length); showTypeWord();
});

/* Sprint */
document.getElementById('btnStartSprint').addEventListener('click', ()=>{
  sprintScore = 0; sprintRemaining = Number(document.getElementById('sprintLength').value) || 30; document.getElementById('sprintScore').textContent = '';
  if (sprintTimer) clearInterval(sprintTimer);
  document.getElementById('sprintTimer').textContent = sprintRemaining + 's';
  showSprintWord();
  sprintTimer = setInterval(()=>{
    sprintRemaining--; document.getElementById('sprintTimer').textContent = sprintRemaining + 's';
    if (sprintRemaining<=0) { clearInterval(sprintTimer); document.getElementById('sprintScore').textContent = 'Score: ' + sprintScore; }
  },1000);
});

function showSprintWord() {
  if (!memoWords.length) return; const w = memoWords[Math.floor(Math.random()*memoWords.length)]; document.getElementById('sprintWord').textContent = w.word;
  // listen for user keypress to quickly reveal — simple: click reveals
  document.getElementById('sprintWord').onclick = ()=>{ alert(w.en||''); sprintScore++; if (document.getElementById('syncKnown').checked) { progress[w.word] = progress[w.word] || {seen:0,correct:0,incorrect:0,known:false}; progress[w.word].seen++; progress[w.word].correct++; saveToStorage(); renderProgress(); } };
}

/* Helpers */
function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

/* Rebuild everything after data change */
function rebuildAll(){ buildCards(); buildMemoWords(); renderProgress(); }
// ensure answers table updates when rebuilding
function rebuildAll(){ buildCards(); buildMemoWords(); renderProgress(); renderAnswersTable(); }

/* Init */
loadFromStorage(); renderJsonEditor(); rebuildAll();
renderProgress();
// initial tab is sentences (use hidden class)
document.querySelectorAll('.tabpane').forEach(p=>p.classList.add('hidden'));
document.getElementById('sentences').classList.remove('hidden');
// init theme and wire initial memo mode
initTheme();
renderMemoMode('rapid'); showRapidWord();

