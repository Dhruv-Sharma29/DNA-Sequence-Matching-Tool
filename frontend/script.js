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

function goTab(n) { document.querySelectorAll('section[id^="t-"]').forEach(s => s.classList.add('hidden')); document.getElementById('t-' + n).classList.remove('hidden'); document.querySelectorAll('.nav-btn').forEach((b, i) => b.classList.toggle('active', ['matcher', 'benchmark', 'utils', 'lps', 'flow', 'info'][i] === n)); if (n === 'lps') { renderLPS(); renderHash(); } if (n === 'utils') doUtil(document.querySelector('.opbtn.on'), 'complement'); }

function pickAlgo(el, name) { document.querySelectorAll('.apill').forEach(p => p.classList.remove('on')); el.classList.add('on'); selAlgo = name; }

async function doMatch() {
  const text = document.getElementById('m-text').value.toUpperCase().replace(/[^ATCG]/g, '');
  const pat = document.getElementById('m-pattern').value.toUpperCase().replace(/[^ATCG]/g, '');
  if (!text || !pat) { showToast('Enter a sequence and pattern.'); return; }
  const btn = document.getElementById('btn-match'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Searching…';
  try {
    let results;
    try { const r = await fetch(API + '/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, pattern: pat, algo: selAlgo }), signal: AbortSignal.timeout(3000) }); const d = await r.json(); if (!d.success) throw new Error(d.error); results = d.results; }
    catch { results = localSearch(text, pat, selAlgo); }
    renderMatch(text, pat, results);
  } finally { btn.disabled = false; btn.innerHTML = 'SEARCH PATTERN →'; }
}

async function doBenchmark() {
  const text = document.getElementById('b-text').value.toUpperCase().replace(/[^ATCG]/g, '');
  const pat = document.getElementById('b-pattern').value.toUpperCase().replace(/[^ATCG]/g, '');
  if (!text || !pat) { showToast('Enter genome and pattern.'); return; }
  const btn = document.getElementById('btn-bench'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Running…';
  try {
    let results;
    try { const r = await fetch(API + '/benchmark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, pattern: pat }), signal: AbortSignal.timeout(3000) }); const d = await r.json(); results = d.results; }
    catch { results = localSearch(text, pat, 'ALL'); }
    renderBench(text, pat, results);
  } finally { btn.disabled = false; btn.innerHTML = 'RUN BENCHMARK →'; }
}

const COLORS = ['#00e5c3', '#4da6ff', '#fbbf24', '#a78bfa', '#f87171'];

function renderMatch(text, pat, results) {
  const first = results[0]; const matches = first.matches ?? first.positions?.length ?? 0; const positions = first.positions ?? [];
  document.getElementById('m-stats').innerHTML = `<div class="sbox"><div class="snum">${matches}</div><div class="slbl">Matches</div></div><div class="sbox"><div class="snum">${text.length}</div><div class="slbl">Genome (bp)</div></div><div class="sbox"><div class="snum">${pat.length}</div><div class="slbl">Pattern Len</div></div><div class="sbox"><div class="snum">${(results[0].comparisons ?? 0).toLocaleString()}</div><div class="slbl">Comparisons</div></div>`;
  const maxC = Math.max(...results.map(r => r.comparisons ?? 0), 1), minC = Math.min(...results.map(r => r.comparisons ?? Infinity));
  document.getElementById('m-rrows').innerHTML = results.map((r, i) => { const pct = Math.round((r.comparisons ?? 0) / maxC * 100); const win = results.length > 1 && (r.comparisons ?? 0) === minC; return `<div class="rrow ${win ? 'winner' : ''}"><span class="rname" style="color:${COLORS[i]}">${r.name}</span><span class="rcmp">cmp: <b>${(r.comparisons ?? 0).toLocaleString()}</b></span><div class="bwrap"><div class="bfill" style="width:${pct}%;background:${COLORS[i]}"></div></div>${win ? '<span class="wtag">Winner</span>' : ''}</div>`; }).join('');
  document.getElementById('m-pos').innerHTML = positions.slice(0, 40).map(p => `<span class="pchip">${p + 1}</span>`).join('') + (positions.length > 40 ? `<span class="pchip">+${positions.length - 40}</span>` : '');
  const ms = new Set(); positions.filter(p => p < 100).forEach(p => { for (let k = p; k < p + pat.length && k < 100; k++)ms.add(k); });
  document.getElementById('m-strand').innerHTML = [...text.slice(0, 100)].map((c, i) => `<span class="${ms.has(i) ? 'bM' : 'b' + c}">${c}</span>`).join('');
  document.getElementById('m-results').classList.remove('hidden'); document.getElementById('m-results').classList.add('fade-up');
}

function renderBench(text, pat, results) {
  const maxC = Math.max(...results.map(r => r.comparisons ?? 0), 1), minC = Math.min(...results.map(r => r.comparisons ?? Infinity));
  document.getElementById('bench-rows').innerHTML = `<div style="font-size:11px;color:var(--muted);margin-bottom:14px;font-family:var(--mono)">Genome: ${text.length}bp · Pattern: "${pat}" (${pat.length}bp)</div>` + results.map((r, i) => { const pct = Math.round((r.comparisons ?? 0) / maxC * 100); const cx = r.complexity || r.cx || ''; const cxcls = cx.includes('/m') ? 'cxg' : cx.includes('n·m') ? 'cxr' : 'cxg'; return `<div class="bench-row"><span class="bname" style="color:${COLORS[i]}">${r.name}</span><div class="bbwrap"><div class="bbfill" style="width:${pct}%;background:${COLORS[i]}"></div></div><span class="bnum">${(r.comparisons ?? 0).toLocaleString()}</span><span class="cxbadge ${cxcls}">${cx || '—'}</span></div>`; }).join('');
  document.getElementById('bench-out').classList.remove('hidden');
}

const CODONS = { TTT: 'Phe', TTC: 'Phe', TTA: 'Leu', TTG: 'Leu', CTT: 'Leu', CTC: 'Leu', CTA: 'Leu', CTG: 'Leu', ATT: 'Ile', ATC: 'Ile', ATA: 'Ile', ATG: 'Met(Start)', GTT: 'Val', GTC: 'Val', GTA: 'Val', GTG: 'Val', TCT: 'Ser', TCC: 'Ser', TCA: 'Ser', TCG: 'Ser', CCT: 'Pro', CCC: 'Pro', CCA: 'Pro', CCG: 'Pro', ACT: 'Thr', ACC: 'Thr', ACA: 'Thr', ACG: 'Thr', GCT: 'Ala', GCC: 'Ala', GCA: 'Ala', GCG: 'Ala', TAT: 'Tyr', TAC: 'Tyr', TAA: 'STOP', TAG: 'STOP', CAT: 'His', CAC: 'His', CAA: 'Gln', CAG: 'Gln', AAT: 'Asn', AAC: 'Asn', AAA: 'Lys', AAG: 'Lys', GAT: 'Asp', GAC: 'Asp', GAA: 'Glu', GAG: 'Glu', TGT: 'Cys', TGC: 'Cys', TGA: 'STOP', TGG: 'Trp', CGT: 'Arg', CGC: 'Arg', CGA: 'Arg', CGG: 'Arg', AGT: 'Ser', AGC: 'Ser', AGA: 'Arg', AGG: 'Arg', GGT: 'Gly', GGC: 'Gly', GGA: 'Gly', GGG: 'Gly' };

function doUtil(el, op) { document.querySelectorAll('.opbtn').forEach(b => b.classList.remove('on')); if (el) el.classList.add('on'); curOp = op; const seq = document.getElementById('u-seq').value.toUpperCase().replace(/[^ATCG]/g, ''); const seq2 = document.getElementById('u-seq2').value.toUpperCase().replace(/[^ATCG]/g, ''); if (!seq) { document.getElementById('u-out').textContent = 'Enter a sequence above…'; return; } document.getElementById('u-out').textContent = localUtil(op, seq, seq2); }
document.addEventListener('input', e => { if (e.target.id === 'u-seq' || e.target.id === 'u-seq2') doUtil(null, curOp); });

function localUtil(op, seq, seq2) {
  const comp = s => s.split('').map(c => ({ A: 'T', T: 'A', C: 'G', G: 'C' }[c] || 'N')).join('');
  if (op === 'complement') return `5'-${seq}-3'\n3'-${comp(seq)}-5'`;
  if (op === 'revcomp') { const rc = comp(seq).split('').reverse().join(''); return `Original:           5'-${seq}-3'\nRev Complement: 3'-${rc}-5'`; }
  if (op === 'gc') { const gc = [...seq].filter(c => c === 'G' || c === 'C').length; return `GC Content: ${(gc / seq.length * 100).toFixed(2)}%\n\nA: ${[...seq].filter(c => c === 'A').length}   T: ${[...seq].filter(c => c === 'T').length}   C: ${[...seq].filter(c => c === 'C').length}   G: ${[...seq].filter(c => c === 'G').length}`; }
  if (op === 'hamming') { if (!seq2) return 'Enter sequence 2'; const len = Math.min(seq.length, seq2.length); let d = 0, diffs = []; for (let i = 0; i < len; i++)if (seq[i] !== seq2[i]) { d++; diffs.push(`Pos ${i + 1}: ${seq[i]}→${seq2[i]}`); } return `Hamming Distance: ${d}\n\n${diffs.join('\n') || 'Identical sequences!'}`; }
  if (op === 'edit') { if (!seq2) return 'Enter sequence 2'; const n = seq.length, m = seq2.length; const dp = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => i || j ? i ? i : j : 0)); for (let i = 0; i < n; i++)for (let j = 0; j < m; j++)dp[i + 1][j + 1] = seq[i] === seq2[j] ? dp[i][j] : 1 + Math.min(dp[i][j], dp[i + 1][j], dp[i][j + 1]); return `Edit (Levenshtein) Distance: ${dp[n][m]}`; }
  if (op === 'translate') { const start = seq.indexOf('ATG'); if (start < 0) return '[No ATG start codon found]'; const out = []; for (let i = start; i + 2 < seq.length; i += 3) { const aa = CODONS[seq.slice(i, i + 3)] || '?'; out.push(`${seq.slice(i, i + 3)} → ${aa}`); if (aa === 'STOP') break; } return out.join('\n'); }
  if (op === 'kmer') { const freq = {}; for (let i = 0; i <= seq.length - 3; i++) { const k = seq.slice(i, i + 3); freq[k] = (freq[k] || 0) + 1; } return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}: ${'█'.repeat(Math.min(v, 15))} ${v}`).join('\n'); }
  if (op === 'mutate') { if (!seq2) return 'Enter sequence 2'; const muts = [], len = Math.min(seq.length, seq2.length); for (let i = 0; i < len; i++)if (seq[i] !== seq2[i]) muts.push(`Pos ${i + 1}: ${seq[i]}→${seq2[i]}`); return muts.length ? muts.join('\n') : 'No mutations detected!'; }
  return '';
}

function lBuildLPS(p) { const lps = new Array(p.length).fill(0); let len = 0, i = 1; while (i < p.length) { if (p[i] === p[len]) lps[i++] = ++len; else if (len) len = lps[len - 1]; else lps[i++] = 0; } return lps; }
function lNaive(t, p) { const occ = [], n = t.length, m = p.length; let cmp = 0; for (let i = 0; i <= n - m; i++) { let j = 0; while (j < m) { cmp++; if (t[i + j] !== p[j]) break; j++; } if (j === m) occ.push(i); } return { name: 'Naive', positions: occ, matches: occ.length, comparisons: cmp, complexity: 'O(n·m)' }; }
function lKMP(t, p) { const lps = lBuildLPS(p), occ = [], n = t.length, m = p.length; let i = 0, j = 0, cmp = 0; while (i < n) { cmp++; if (t[i] === p[j]) { i++; j++; if (j === m) { occ.push(i - j); j = lps[j - 1]; } } else { if (j) j = lps[j - 1]; else i++; } } return { name: 'KMP', positions: occ, matches: occ.length, comparisons: cmp, complexity: 'O(n+m)' }; }
function lRK(t, p) { const B = 4, M = 1e9 + 7, cv = { A: 1, T: 2, C: 3, G: 4 }, occ = [], n = t.length, m = p.length; let cmp = 0; if (m > n) return { name: 'Rabin-Karp', positions: [], matches: 0, comparisons: 0, complexity: 'O(n+m) avg' }; let h = 1; for (let i = 0; i < m - 1; i++)h = (h * B) % M; let ph = 0, th = 0; for (let i = 0; i < m; i++) { ph = (B * ph + (cv[p[i]] || 0)) % M; th = (B * th + (cv[t[i]] || 0)) % M; } for (let i = 0; i <= n - m; i++) { if (ph === th) { let ok = true; for (let j = 0; j < m; j++) { cmp++; if (t[i + j] !== p[j]) { ok = false; break; } } if (ok) occ.push(i); } if (i < n - m) { th = (B * (th - (cv[t[i]] || 0) * h) + (cv[t[i + m]] || 0)) % M; if (th < 0) th += M; } } return { name: 'Rabin-Karp', positions: occ, matches: occ.length, comparisons: cmp, complexity: 'O(n+m) avg' }; }
function lBM(t, p) { const n = t.length, m = p.length, bc = {}, occ = []; let cmp = 0; for (let i = 0; i < m; i++)bc[p[i]] = i; let s = 0; while (s <= n - m) { let j = m - 1; while (j >= 0) { cmp++; if (p[j] === t[s + j]) j--; else break; } if (j < 0) { occ.push(s); s += (s + m < n) ? m - (bc[t[s + m]] ?? -1) : 1; } else s += Math.max(1, j - (bc[t[s + j]] ?? -1)); } return { name: 'Boyer-Moore', positions: occ, matches: occ.length, comparisons: cmp, complexity: 'O(n/m) best' }; }
function lZ(t, p) { const s = p + '$' + t, n = s.length, z = new Array(n).fill(0), m = p.length; let l = 0, r = 0; for (let i = 1; i < n; i++) { if (i < r) z[i] = Math.min(r - i, z[i - l]); while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++; if (i + z[i] > r) { l = i; r = i + z[i]; } } const occ = []; for (let i = m + 1; i < n; i++)if (z[i] === m) occ.push(i - m - 1); return { name: 'Z-Algorithm', positions: occ, matches: occ.length, comparisons: n, complexity: 'O(n+m)' }; }

function localSearch(text, pat, algo) { const all = [lNaive(text, pat), lKMP(text, pat), lRK(text, pat), lBM(text, pat), lZ(text, pat)]; if (algo === 'ALL') return all; const map = { naive: lNaive, KMP: lKMP, 'RABIN-KARP': lRK, 'BOYER-MOORE': lBM, 'Z-ALGORITHM': lZ }; return [(map[algo]?.(text, pat)) ?? all[0]]; }

function renderLPS() { const pat = document.getElementById('lps-pat').value.toUpperCase().replace(/[^ATCG]/g, ''); if (!pat) { document.getElementById('lps-vis').innerHTML = ''; return; } const lps = lBuildLPS(pat); const C = { A: '#34d399', T: '#f87171', C: '#60a5fa', G: '#fbbf24' }; document.getElementById('lps-vis').innerHTML = [...pat].map((c, i) => `<div class="lps-cell"><div class="lps-ch" style="background:${C[c]}22;color:${C[c]}">${c}</div><div class="lps-v">${lps[i]}</div></div>`).join(''); const mx = Math.max(...lps); document.getElementById('lps-desc').innerHTML = `Max skip on mismatch: <b style="color:var(--teal)">${mx}</b> chars. ${mx > 0 ? 'KMP avoids re-checking ' + mx + ' character(s) vs Naive.' : 'No repeating prefix-suffix in pattern.'}`; }

function renderHash() { const pat = document.getElementById('rk-pat').value.toUpperCase().replace(/[^ATCG]/g, ''); const cv = { A: 1, T: 2, C: 3, G: 4 }; let h = 0; const steps = [...pat].map((c, i) => { h = (4 * h + (cv[c] || 0)) % 1000000007; return `Step ${i + 1}: char='${c}' val=${cv[c] || 0} → hash=${h}`; }); document.getElementById('rk-out').textContent = steps.join('\n') || 'Type a pattern above…'; }

function setPreset(size) { const bases = 'ATCG'; const lens = { short: 50, medium: 500, long: 2000 }; const n = lens[size]; let dna = ''; for (let i = 0; i < n; i++)dna += bases[Math.floor(Math.random() * 4)]; const pat = document.getElementById('b-pattern').value || 'ATGCAT'; const pos = Math.floor(n / 2); dna = dna.slice(0, pos) + pat + dna.slice(pos + pat.length); document.getElementById('b-text').value = dna; }

function showToast(msg) { const t = document.getElementById('toast'); t.textContent = '⚠ ' + msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); }

renderLPS(); renderHash();
