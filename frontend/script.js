const API = 'http://localhost:8080/api';
let selAlgo = 'naive', curOp = 'complement';

async function checkHealth() {
  try {
    const r = await fetch(API + '/health', { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      document.getElementById('sdot').className = 'sdot up';
      document.getElementById('stxt').textContent = 'API Connected';
    }
  }
  catch { document.getElementById('stxt').textContent = 'API Offline — JS fallback active'; }
}
checkHealth();

function toggleTheme() {
  const body = document.body;
  body.classList.toggle('light-theme');
  const icon = document.getElementById('theme-icon');
  icon.textContent = body.classList.contains('light-theme') ? '☀️' : '🌙';
  localStorage.setItem('theme', body.classList.contains('light-theme') ? 'light' : 'dark');
}

if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light-theme');
  document.getElementById('theme-icon').textContent = '☀️';
}


const TAB_NAMES = ['matcher', 'benchmark', 'visualize', 'utils', 'upload', 'history', 'lps', 'flow', 'info'];

function goTab(n) {
  document.querySelectorAll('section[id^="t-"]').forEach(s => s.classList.add('hidden'));
  document.getElementById('t-' + n).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach((b, i) => b.classList.toggle('active', TAB_NAMES[i] === n));
  if (n === 'lps') { renderLPS(); renderHash(); }
  if (n === 'utils') doUtil(document.querySelector('.opbtn.on'), 'complement');
  if (n === 'history') loadHistory();
  if (n === 'visualize') visReset();
}


function pickAlgo(el, name) {
  document.querySelectorAll('.apill').forEach(p => p.classList.remove('on'));
  el.classList.add('on'); selAlgo = name;
}

// ─── Matcher ───────────────────────────────────────────────
async function doMatch() {
  const text = document.getElementById('m-text').value.toUpperCase().replace(/[^ATCG]/g, '');
  const pat = document.getElementById('m-pattern').value.toUpperCase().replace(/[^ATCG]/g, '');
  if (!text || !pat) { showToast('Enter a sequence and pattern.'); return; }
  const btn = document.getElementById('btn-match'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Searching…';
  try {
    let results;
    try {
      const r = await fetch(API + '/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, pattern: pat, algo: selAlgo }), signal: AbortSignal.timeout(5000) });
      const d = await r.json(); if (!d.success) throw new Error(d.error); results = d.results;
    } catch { results = localSearch(text, pat, selAlgo); }
    renderMatch(text, pat, results);
  } finally { btn.disabled = false; btn.innerHTML = 'SEARCH PATTERN →'; }
}

// ─── Benchmark ─────────────────────────────────────────────
async function doBenchmark() {
  const text = document.getElementById('b-text').value.toUpperCase().replace(/[^ATCG]/g, '');
  const pat = document.getElementById('b-pattern').value.toUpperCase().replace(/[^ATCG]/g, '');
  if (!text || !pat) { showToast('Enter genome and pattern.'); return; }
  const btn = document.getElementById('btn-bench'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Running…';
  try {
    let results;
    try {
      const r = await fetch(API + '/benchmark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, pattern: pat }), signal: AbortSignal.timeout(5000) });
      const d = await r.json(); results = d.results;
    } catch { results = localSearch(text, pat, 'ALL'); }
    renderBench(text, pat, results);
  } finally { btn.disabled = false; btn.innerHTML = 'RUN BENCHMARK →'; }
}

// ─── Render helpers ────────────────────────────────────────
const COLORS = ['#00e5c3', '#4da6ff', '#fbbf24', '#a78bfa', '#f87171', '#34d399'];
const ALGO_NAMES = ['Naive', 'KMP', 'Rabin-Karp', 'Boyer-Moore', 'Z-Algorithm', 'Aho-Corasick'];

function renderMatch(text, pat, results) {
  const first = results[0];
  const matches = first.matches ?? first.positions?.length ?? 0;
  const positions = first.positions ?? [];
  document.getElementById('m-stats').innerHTML = `
    <div class="sbox"><div class="snum">${matches}</div><div class="slbl">Matches</div></div>
    <div class="sbox"><div class="snum">${text.length.toLocaleString()}</div><div class="slbl">Genome (bp)</div></div>
    <div class="sbox"><div class="snum">${pat.length}</div><div class="slbl">Pattern Len</div></div>
    <div class="sbox"><div class="snum">${(results[0].comparisons ?? 0).toLocaleString()}</div><div class="slbl">Comparisons</div></div>`;
  const maxC = Math.max(...results.map(r => r.comparisons ?? 0), 1);
  const minC = Math.min(...results.map(r => r.comparisons ?? Infinity));
  document.getElementById('m-rrows').innerHTML = results.map((r, i) => {
    const pct = Math.round((r.comparisons ?? 0) / maxC * 100);
    const win = results.length > 1 && (r.comparisons ?? 0) === minC;
    return `<div class="rrow ${win ? 'winner' : ''}"><span class="rname" style="color:${COLORS[i % 6]}">${r.name}</span><span class="rcmp">cmp: <b>${(r.comparisons ?? 0).toLocaleString()}</b></span><div class="bwrap"><div class="bfill" style="width:${pct}%;background:${COLORS[i % 6]}"></div></div>${win ? '<span class="wtag">Winner</span>' : ''}</div>`;
  }).join('');
  document.getElementById('m-pos').innerHTML = positions.slice(0, 40).map(p => `<span class="pchip">${p + 1}</span>`).join('') + (positions.length > 40 ? `<span class="pchip">+${positions.length - 40}</span>` : '');
  const ms = new Set();
  positions.filter(p => p < 100).forEach(p => { for (let k = p; k < p + pat.length && k < 100; k++) ms.add(k); });
  document.getElementById('m-strand').innerHTML = [...text.slice(0, 100)].map((c, i) => `<span class="${ms.has(i) ? 'bM' : 'b' + c}">${c}</span>`).join('');
  document.getElementById('m-results').classList.remove('hidden');
  document.getElementById('m-results').classList.add('fade-up');
}

let benchChart = null;
function renderBench(text, pat, results) {
  const maxC = Math.max(...results.map(r => r.comparisons ?? 0), 1);
  document.getElementById('bench-rows').innerHTML =
    `<div style="font-size:11px;color:var(--muted);margin-bottom:14px;font-family:var(--mono)">Genome: ${text.length}bp · Pattern: "${pat}" (${pat.length}bp)</div>` +
    results.map((r, i) => {
      const pct = Math.round((r.comparisons ?? 0) / maxC * 100);
      const cx = r.complexity || r.cx || '';
      const cxcls = cx.includes('/m') ? 'cxg' : cx.includes('n·m') ? 'cxr' : 'cxg';
      return `<div class="bench-row"><span class="bname" style="color:${COLORS[i]}">${r.name}</span><div class="bbwrap"><div class="bbfill" style="width:${pct}%;background:${COLORS[i]}"></div></div><span class="bnum">${(r.comparisons ?? 0).toLocaleString()}</span><span class="cxbadge ${cxcls}">${cx || '—'}</span></div>`;
    }).join('');

  // Chart.js bar chart
  const canvas = document.getElementById('bench-chart');
  if (benchChart) benchChart.destroy();
  benchChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: results.map(r => r.name),
      datasets: [{
        label: 'Comparisons',
        data: results.map(r => r.comparisons ?? 0),
        backgroundColor: COLORS.slice(0, results.length).map(c => c + '44'),
        borderColor: COLORS.slice(0, results.length),
        borderWidth: 2, borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false },
        title: { display: true, text: 'Comparisons by Algorithm', color: '#4a6080', font: { family: 'JetBrains Mono', size: 11 } } },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#4a6080', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(99,179,237,0.08)' } },
        x: { ticks: { color: '#4a6080', font: { family: 'JetBrains Mono', size: 10 } }, grid: { display: false } }
      }
    }
  });

  document.getElementById('bench-out').classList.remove('hidden');
  document.getElementById('scale-card').classList.remove('hidden');
}

// ─── Scaling Test ──────────────────────────────────────────
let scaleChart = null;
async function doScaleTest() {
  const btn = document.getElementById('btn-scale');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Running…';
  const pat = document.getElementById('b-pattern').value.toUpperCase().replace(/[^ATCG]/g, '') || 'ATGCAT';
  const sizes = [100, 500, 1000, 2500, 5000];
  const datasets = ALGO_NAMES.map((name, i) => ({ label: name, data: [], borderColor: COLORS[i], backgroundColor: COLORS[i] + '22', tension: 0.3, pointRadius: 4, borderWidth: 2 }));

  for (const size of sizes) {
    const text = generateDNA(size, pat);
    const results = localSearch(text, pat, 'ALL');
    results.forEach((r, i) => { datasets[i].data.push(r.comparisons ?? 0); });
  }

  const canvas = document.getElementById('scale-chart');
  if (scaleChart) scaleChart.destroy();
  scaleChart = new Chart(canvas, {
    type: 'line',
    data: { labels: sizes.map(s => s + 'bp'), datasets },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'Comparisons vs Input Size', color: '#4a6080', font: { family: 'JetBrains Mono', size: 11 } } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Comparisons', color: '#4a6080' }, ticks: { color: '#4a6080', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(99,179,237,0.08)' } },
        x: { title: { display: true, text: 'Genome Size', color: '#4a6080' }, ticks: { color: '#4a6080', font: { family: 'JetBrains Mono', size: 10 } }, grid: { display: false } }
      }
    }
  });
  btn.disabled = false; btn.innerHTML = 'RUN SCALING TEST →';
}

function generateDNA(n, pat) {
  const bases = 'ATCG'; let dna = '';
  for (let i = 0; i < n; i++) dna += bases[Math.floor(Math.random() * 4)];
  const pos = Math.floor(n / 3);
  dna = dna.slice(0, pos) + pat + dna.slice(pos + pat.length);
  return dna;
}

// ─── Step-by-step Visualization ────────────────────────────
let visAlgo = 'naive', visState = null, visTimer = null, visPlaying = false;

function pickVis(el, algo) {
  document.querySelectorAll('#t-visualize .opbtn').forEach(b => b.classList.remove('on'));
  el.classList.add('on'); visAlgo = algo; visReset();
}

function visReset() {
  if (visTimer) clearInterval(visTimer);
  visPlaying = false;
  document.getElementById('vis-play').textContent = '▶ Play';
  const text = document.getElementById('v-text').value.toUpperCase().replace(/[^ATCG]/g, '');
  const pat = document.getElementById('v-pattern').value.toUpperCase().replace(/[^ATCG]/g, '');
  visState = { text, pat, i: 0, j: 0, cmp: 0, matches: [], steps: 0, done: false, log: [], lps: visAlgo === 'kmp' ? lBuildLPS(pat) : null };
  renderVisState();
  document.getElementById('vis-info').textContent = 'Press Play or Step to begin';
}

function visPlay() {
  if (visState?.done) visReset();
  if (visPlaying) { clearInterval(visTimer); visPlaying = false; document.getElementById('vis-play').textContent = '▶ Play'; return; }
  visPlaying = true;
  document.getElementById('vis-play').textContent = '⏸ Pause';
  const speed = 1050 - parseInt(document.getElementById('vis-speed').value);
  visTimer = setInterval(() => { if (visState.done) { clearInterval(visTimer); visPlaying = false; document.getElementById('vis-play').textContent = '▶ Play'; return; } doVisStep(); }, speed);
}

function visStep() { if (visState?.done) visReset(); doVisStep(); }

function doVisStep() {
  const s = visState; if (s.done) return;
  const { text, pat } = s;
  const n = text.length, m = pat.length;

  if (visAlgo === 'naive') {
    if (s.i > n - m) { s.done = true; s.log.push('✅ Done! Found ' + s.matches.length + ' match(es)'); renderVisState(); return; }
    s.cmp++;
    if (text[s.i + s.j] === pat[s.j]) {
      s.log.push(`Compare text[${s.i + s.j}]='${text[s.i + s.j]}' == pat[${s.j}]='${pat[s.j]}' ✓`);
      s.j++;
      if (s.j === m) { s.matches.push(s.i); s.log.push(`🎯 Match found at position ${s.i}!`); s.i++; s.j = 0; }
    } else {
      s.log.push(`Compare text[${s.i + s.j}]='${text[s.i + s.j]}' != pat[${s.j}]='${pat[s.j]}' ✗ → shift`);
      s.i++; s.j = 0;
    }
  } else if (visAlgo === 'kmp') {
    if (s.i >= n) { s.done = true; s.log.push('✅ Done! Found ' + s.matches.length + ' match(es)'); renderVisState(); return; }
    s.cmp++;
    if (text[s.i] === pat[s.j]) {
      s.log.push(`Compare text[${s.i}]='${text[s.i]}' == pat[${s.j}]='${pat[s.j]}' ✓`);
      s.i++; s.j++;
      if (s.j === m) { s.matches.push(s.i - s.j); s.log.push(`🎯 Match at position ${s.i - s.j}! j←lps[${s.j - 1}]=${s.lps[s.j - 1]}`); s.j = s.lps[s.j - 1]; }
    } else {
      if (s.j !== 0) { s.log.push(`Mismatch! j←lps[${s.j - 1}]=${s.lps[s.j - 1]} (skip)`); s.j = s.lps[s.j - 1]; }
      else { s.log.push(`Mismatch at j=0 → advance i`); s.i++; }
    }
  }
  s.steps++;
  renderVisState();
}

function renderVisState() {
  const s = visState; if (!s) return;
  const { text, pat, i, j } = s;
  const C = { A: '#34d399', T: '#f87171', C: '#60a5fa', G: '#fbbf24' };
  const offset = visAlgo === 'naive' ? i : Math.max(0, i - j);

  document.getElementById('vis-text-row').innerHTML = '<div class="vis-label">Text</div>' + [...text].map((c, idx) => {
    let cls = 'vis-cell';
    if (visAlgo === 'naive' && idx === i + j) cls += ' vis-active';
    else if (visAlgo === 'kmp' && idx === i) cls += ' vis-active';
    if (s.matches.some(m => idx >= m && idx < m + pat.length)) cls += ' vis-matched';
    return `<div class="${cls}" style="color:${C[c] || '#fff'}">${c}<div class="vis-idx">${idx}</div></div>`;
  }).join('');

  const patPadding = Array(offset).fill('<div class="vis-cell vis-empty"></div>').join('');
  document.getElementById('vis-pat-row').innerHTML = '<div class="vis-label">Pattern</div>' + patPadding + [...pat].map((c, idx) => {
    let cls = 'vis-cell vis-pat';
    if (idx === j && !s.done) cls += ' vis-compare';
    if (idx < j) cls += ' vis-matched';
    return `<div class="${cls}" style="color:${C[c] || '#fff'}">${c}</div>`;
  }).join('');

  document.getElementById('vis-cmp').textContent = s.cmp;
  document.getElementById('vis-matches').textContent = s.matches.length;
  document.getElementById('vis-stepnum').textContent = s.steps;
  document.getElementById('vis-info').textContent = s.done ? '✅ Algorithm finished' : `${visAlgo.toUpperCase()} — i=${i}, j=${j}`;

  const logEl = document.getElementById('vis-log');
  logEl.innerHTML = s.log.slice(-8).map(l => `<div class="vis-log-line">${l}</div>`).join('');
  logEl.scrollTop = logEl.scrollHeight;
}

// ─── FASTA Upload ──────────────────────────────────────────
let fastaSequences = [];
const dropZone = document.getElementById('drop-zone');
const fastaInput = document.getElementById('fasta-input');

dropZone?.addEventListener('click', () => fastaInput.click());
dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drop-active'); });
dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drop-active'));
dropZone?.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drop-active'); handleFastaFile(e.dataTransfer.files[0]); });
fastaInput?.addEventListener('change', e => handleFastaFile(e.target.files[0]));

async function handleFastaFile(file) {
  if (!file) return;
  try {
    // Try API first
    const formData = new FormData(); formData.append('file', file);
    const r = await fetch(API + '/upload/fasta', { method: 'POST', body: formData, signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    if (d.success) { fastaSequences = d.sequences; renderFastaResult(d); return; }
  } catch {}
  // Fallback: parse locally
  const text = await file.text();
  fastaSequences = parseFastaLocal(text);
  renderFastaResult({ filename: file.name, sequenceCount: fastaSequences.length, sequences: fastaSequences });
}

function parseFastaLocal(text) {
  const lines = text.split('\n'), sequences = [];
  let header = null, seq = '';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('>')) {
      if (header && seq) sequences.push({ header, sequence: seq.toUpperCase().replace(/[^ATCGN]/g, ''), length: String(seq.length) });
      header = line.substring(1).trim(); seq = '';
    } else { seq += line; }
  }
  if (header && seq) sequences.push({ header, sequence: seq.toUpperCase().replace(/[^ATCGN]/g, ''), length: String(seq.length) });
  return sequences;
}

function renderFastaResult(data) {
  document.getElementById('fasta-sequences').innerHTML = data.sequences.map((s, i) =>
    `<div class="iblock" style="margin-bottom:8px"><h3>Sequence ${i + 1}: ${s.header}</h3><div class="ikv"><span>Length</span><span>${parseInt(s.length).toLocaleString()} bp</span></div><div style="font-family:var(--mono);font-size:10px;color:var(--teal);margin-top:8px;word-break:break-all">${s.sequence.slice(0, 120)}${s.sequence.length > 120 ? '…' : ''}</div></div>`
  ).join('');
  document.getElementById('fasta-result').classList.remove('hidden');
}

function useFastaInMatcher() {
  if (fastaSequences.length > 0) {
    document.getElementById('m-text').value = fastaSequences[0].sequence;
    goTab('matcher');
    showToast('Loaded ' + fastaSequences[0].header + ' into Matcher');
  }
}

// ─── History ───────────────────────────────────────────────
async function loadHistory() {
  const el = document.getElementById('history-list');
  try {
    const r = await fetch(API + '/history', { signal: AbortSignal.timeout(3000) });
    const d = await r.json();
    if (d.entries && d.entries.length > 0) {
      el.innerHTML = `<div style="margin-bottom:10px;color:var(--teal)">${d.count} entries</div>` +
        '<table class="hist-table"><tr><th>Algorithm</th><th>Text</th><th>Pattern</th><th>Matches</th><th>Comparisons</th><th>Time</th></tr>' +
        d.entries.map(e => `<tr><td style="color:var(--teal)">${e.algorithm}</td><td>${e.textLength}bp</td><td>${e.patternLength}bp</td><td>${e.matchCount}</td><td>${e.comparisons.toLocaleString()}</td><td>${(e.timeNs / 1000).toFixed(1)}µs</td></tr>`).join('') +
        '</table>';
    } else { el.textContent = 'No search history yet. Run some searches first!'; }
  } catch { el.textContent = 'History requires the API to be running.'; }
}

async function clearHistory() {
  try { await fetch(API + '/history', { method: 'DELETE' }); } catch {}
  loadHistory();
}

// ─── Utilities ─────────────────────────────────────────────
const CODONS = { TTT: 'Phe', TTC: 'Phe', TTA: 'Leu', TTG: 'Leu', CTT: 'Leu', CTC: 'Leu', CTA: 'Leu', CTG: 'Leu', ATT: 'Ile', ATC: 'Ile', ATA: 'Ile', ATG: 'Met(Start)', GTT: 'Val', GTC: 'Val', GTA: 'Val', GTG: 'Val', TCT: 'Ser', TCC: 'Ser', TCA: 'Ser', TCG: 'Ser', CCT: 'Pro', CCC: 'Pro', CCA: 'Pro', CCG: 'Pro', ACT: 'Thr', ACC: 'Thr', ACA: 'Thr', ACG: 'Thr', GCT: 'Ala', GCC: 'Ala', GCA: 'Ala', GCG: 'Ala', TAT: 'Tyr', TAC: 'Tyr', TAA: 'STOP', TAG: 'STOP', CAT: 'His', CAC: 'His', CAA: 'Gln', CAG: 'Gln', AAT: 'Asn', AAC: 'Asn', AAA: 'Lys', AAG: 'Lys', GAT: 'Asp', GAC: 'Asp', GAA: 'Glu', GAG: 'Glu', TGT: 'Cys', TGC: 'Cys', TGA: 'STOP', TGG: 'Trp', CGT: 'Arg', CGC: 'Arg', CGA: 'Arg', CGG: 'Arg', AGT: 'Ser', AGC: 'Ser', AGA: 'Arg', AGG: 'Arg', GGT: 'Gly', GGC: 'Gly', GGA: 'Gly', GGG: 'Gly' };

function doUtil(el, op) {
  document.querySelectorAll('#t-utils .opbtn').forEach(b => b.classList.remove('on'));
  if (el) el.classList.add('on'); curOp = op;
  const seq = document.getElementById('u-seq').value.toUpperCase().replace(/[^ATCG]/g, '');
  const seq2 = document.getElementById('u-seq2').value.toUpperCase().replace(/[^ATCG]/g, '');
  if (!seq) { document.getElementById('u-out').textContent = 'Enter a sequence above…'; return; }
  document.getElementById('u-out').textContent = localUtil(op, seq, seq2);
}
document.addEventListener('input', e => { if (e.target.id === 'u-seq' || e.target.id === 'u-seq2') doUtil(null, curOp); });

function localUtil(op, seq, seq2) {
  const comp = s => s.split('').map(c => ({ A: 'T', T: 'A', C: 'G', G: 'C' }[c] || 'N')).join('');
  if (op === 'complement') return `5'-${seq}-3'\n3'-${comp(seq)}-5'`;
  if (op === 'revcomp') { const rc = comp(seq).split('').reverse().join(''); return `Original:           5'-${seq}-3'\nRev Complement: 3'-${rc}-5'`; }
  if (op === 'gc') { const gc = [...seq].filter(c => c === 'G' || c === 'C').length; return `GC Content: ${(gc / seq.length * 100).toFixed(2)}%\n\nA: ${[...seq].filter(c => c === 'A').length}   T: ${[...seq].filter(c => c === 'T').length}   C: ${[...seq].filter(c => c === 'C').length}   G: ${[...seq].filter(c => c === 'G').length}`; }
  if (op === 'hamming') { if (!seq2) return 'Enter sequence 2'; const len = Math.min(seq.length, seq2.length); let d = 0, diffs = []; for (let i = 0; i < len; i++) if (seq[i] !== seq2[i]) { d++; diffs.push(`Pos ${i + 1}: ${seq[i]}→${seq2[i]}`); } return `Hamming Distance: ${d}\n\n${diffs.join('\n') || 'Identical sequences!'}`; }
  if (op === 'edit') { if (!seq2) return 'Enter sequence 2'; const n = seq.length, m = seq2.length; const dp = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => i || j ? i ? i : j : 0)); for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) dp[i + 1][j + 1] = seq[i] === seq2[j] ? dp[i][j] : 1 + Math.min(dp[i][j], dp[i + 1][j], dp[i][j + 1]); return `Edit (Levenshtein) Distance: ${dp[n][m]}`; }
  if (op === 'translate') { const start = seq.indexOf('ATG'); if (start < 0) return '[No ATG start codon found]'; const out = []; for (let i = start; i + 2 < seq.length; i += 3) { const aa = CODONS[seq.slice(i, i + 3)] || '?'; out.push(`${seq.slice(i, i + 3)} → ${aa}`); if (aa === 'STOP') break; } return out.join('\n'); }
  if (op === 'kmer') { const freq = {}; for (let i = 0; i <= seq.length - 3; i++) { const k = seq.slice(i, i + 3); freq[k] = (freq[k] || 0) + 1; } return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}: ${'█'.repeat(Math.min(v, 15))} ${v}`).join('\n'); }
  if (op === 'mutate') { if (!seq2) return 'Enter sequence 2'; const muts = [], len = Math.min(seq.length, seq2.length); for (let i = 0; i < len; i++) if (seq[i] !== seq2[i]) muts.push(`Pos ${i + 1}: ${seq[i]}→${seq2[i]}`); return muts.length ? muts.join('\n') : 'No mutations detected!'; }
  return '';
}

// ─── Local Algorithm Implementations ───────────────────────
function lBuildLPS(p) { const lps = new Array(p.length).fill(0); let len = 0, i = 1; while (i < p.length) { if (p[i] === p[len]) lps[i++] = ++len; else if (len) len = lps[len - 1]; else lps[i++] = 0; } return lps; }
function lNaive(t, p) { const occ = [], n = t.length, m = p.length; let cmp = 0; for (let i = 0; i <= n - m; i++) { let j = 0; while (j < m) { cmp++; if (t[i + j] !== p[j]) break; j++; } if (j === m) occ.push(i); } return { name: 'Naive', positions: occ, matches: occ.length, comparisons: cmp, complexity: 'O(n·m)' }; }
function lKMP(t, p) { const lps = lBuildLPS(p), occ = [], n = t.length, m = p.length; let i = 0, j = 0, cmp = 0; while (i < n) { cmp++; if (t[i] === p[j]) { i++; j++; if (j === m) { occ.push(i - j); j = lps[j - 1]; } } else { if (j) j = lps[j - 1]; else i++; } } return { name: 'KMP', positions: occ, matches: occ.length, comparisons: cmp, complexity: 'O(n+m)' }; }
function lRK(t, p) { const B = 4, M = 1e9 + 7, cv = { A: 1, T: 2, C: 3, G: 4 }, occ = [], n = t.length, m = p.length; let cmp = 0; if (m > n) return { name: 'Rabin-Karp', positions: [], matches: 0, comparisons: 0, complexity: 'O(n+m) avg' }; let h = 1; for (let i = 0; i < m - 1; i++) h = (h * B) % M; let ph = 0, th = 0; for (let i = 0; i < m; i++) { ph = (B * ph + (cv[p[i]] || 0)) % M; th = (B * th + (cv[t[i]] || 0)) % M; } for (let i = 0; i <= n - m; i++) { if (ph === th) { let ok = true; for (let j = 0; j < m; j++) { cmp++; if (t[i + j] !== p[j]) { ok = false; break; } } if (ok) occ.push(i); } if (i < n - m) { th = (B * (th - (cv[t[i]] || 0) * h) + (cv[t[i + m]] || 0)) % M; if (th < 0) th += M; } } return { name: 'Rabin-Karp', positions: occ, matches: occ.length, comparisons: cmp, complexity: 'O(n+m) avg' }; }
function lBM(t, p) { const n = t.length, m = p.length, bc = {}, occ = []; let cmp = 0; for (let i = 0; i < m; i++) bc[p[i]] = i; let s = 0; while (s <= n - m) { let j = m - 1; while (j >= 0) { cmp++; if (p[j] === t[s + j]) j--; else break; } if (j < 0) { occ.push(s); s += (s + m < n) ? m - (bc[t[s + m]] ?? -1) : 1; } else s += Math.max(1, j - (bc[t[s + j]] ?? -1)); } return { name: 'Boyer-Moore', positions: occ, matches: occ.length, comparisons: cmp, complexity: 'O(n/m) best' }; }
function lZ(t, p) { const s = p + '$' + t, n = s.length, z = new Array(n).fill(0), m = p.length; let l = 0, r = 0, cmp = 0; for (let i = 1; i < n; i++) { if (i < r) z[i] = Math.min(r - i, z[i - l]); while (i + z[i] < n && s[z[i]] === s[i + z[i]]) { z[i]++; cmp++; } if (i + z[i] > r) { l = i; r = i + z[i]; } } const occ = []; for (let i = m + 1; i < n; i++) if (z[i] === m) occ.push(i - m - 1); return { name: 'Z-Algorithm', positions: occ, matches: occ.length, comparisons: cmp, complexity: 'O(n+m)' }; }
function lAC(t, p) { /* Simple single-pattern fallback via KMP for client-side */ const r = lKMP(t, p); r.name = 'Aho-Corasick'; r.complexity = 'O(n+m+z)'; return r; }

function localSearch(text, pat, algo) {
  const all = [lNaive(text, pat), lKMP(text, pat), lRK(text, pat), lBM(text, pat), lZ(text, pat), lAC(text, pat)];
  if (algo === 'ALL') return all;
  const map = { naive: lNaive, KMP: lKMP, 'RABIN-KARP': lRK, 'BOYER-MOORE': lBM, 'Z-ALGORITHM': lZ, 'AHO-CORASICK': lAC };
  return [(map[algo]?.(text, pat)) ?? all[0]];
}

// ─── LPS / Hash Visualizers ────────────────────────────────
function renderLPS() {
  const pat = document.getElementById('lps-pat').value.toUpperCase().replace(/[^ATCG]/g, '');
  if (!pat) { document.getElementById('lps-vis').innerHTML = ''; return; }
  const lps = lBuildLPS(pat);
  const C = { A: '#34d399', T: '#f87171', C: '#60a5fa', G: '#fbbf24' };
  document.getElementById('lps-vis').innerHTML = [...pat].map((c, i) => `<div class="lps-cell"><div class="lps-ch" style="background:${C[c]}22;color:${C[c]}">${c}</div><div class="lps-v">${lps[i]}</div></div>`).join('');
  const mx = Math.max(...lps);
  document.getElementById('lps-desc').innerHTML = `Max skip on mismatch: <b style="color:var(--teal)">${mx}</b> chars. ${mx > 0 ? 'KMP avoids re-checking ' + mx + ' character(s) vs Naive.' : 'No repeating prefix-suffix in pattern.'}`;
}

function renderHash() {
  const pat = document.getElementById('rk-pat').value.toUpperCase().replace(/[^ATCG]/g, '');
  const cv = { A: 1, T: 2, C: 3, G: 4 }; let h = 0;
  const steps = [...pat].map((c, i) => { h = (4 * h + (cv[c] || 0)) % 1000000007; return `Step ${i + 1}: char='${c}' val=${cv[c] || 0} → hash=${h}`; });
  document.getElementById('rk-out').textContent = steps.join('\n') || 'Type a pattern above…';
}

function setPreset(size) {
  const bases = 'ATCG'; const lens = { short: 50, medium: 500, long: 2000, huge: 10000 }; const n = lens[size];
  let dna = ''; for (let i = 0; i < n; i++) dna += bases[Math.floor(Math.random() * 4)];
  const pat = document.getElementById('b-pattern').value || 'ATGCAT';
  const pos = Math.floor(n / 2); dna = dna.slice(0, pos) + pat + dna.slice(pos + pat.length);
  document.getElementById('b-text').value = dna;
}

function showToast(msg) {
  const t = document.getElementById('toast'); t.textContent = '⚠ ' + msg;
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000);
}

renderLPS(); renderHash();
