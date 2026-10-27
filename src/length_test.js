/* 题量实验：node src/length_test.js
 * 指标：
 *   重测一致率 —— 同一个"模拟人"独立作答两次，测出同一位人物的比例（越高越稳）
 *   前三命中率 —— 第二次的结果落在第一次前三名里的比例
 *   分布范围 —— 重新校准后，16 位人物出现率的最低～最高
 * 做法：从 25 道宫中题里逐题删掉"删了损失最小"的那一道，镜外 5 题始终保留。
 */
const D = require('./data.js');
const E = require('./engine.js');
const KEYS = E.KEYS, NQ = D.questions.length, NC = D.characters.length;

let seed = 99;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function gauss() { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); }

const W = D.questions.map(q => q.opts.map(o => KEYS.map(k => o.w[k] || 0)));
const P = D.characters.map(c => E.proto(c));

function answerAll(t, beta) {
  return W.map(opts => {
    const u = opts.map(w => Math.exp(beta * w.reduce((s, x, i) => s + x * t[i], 0)));
    let x = rnd() * u.reduce((a, b) => a + b, 0);
    for (let i = 0; i < u.length; i++) { x -= u[i]; if (x <= 0) return i; }
    return u.length - 1;
  });
}
/* 固定一批模拟人：每人有真实性格 t，作答两次 */
const M = 5000, people = [];
for (let i = 0; i < M; i++) {
  const t = KEYS.map(() => gauss()), beta = 0.7 + rnd() * 0.8;
  people.push([answerAll(t, beta), answerAll(t, beta)]);
}
const randPool = []; for (let i = 0; i < 2500; i++) randPool.push(W.map(o => Math.floor(rnd() * o.length)));

function statsFor(sub) {
  const mu = new Array(8).fill(0), v = new Array(8).fill(0);
  sub.forEach(qi => { const o = W[qi]; for (let k = 0; k < 8; k++) { let s = 0, s2 = 0; o.forEach(w => { s += w[k]; s2 += w[k] * w[k]; }); const m = s / o.length; mu[k] += m; v[k] += s2 / o.length - m * m; } });
  return { mu, sd: v.map(x => Math.sqrt(x) || 1) };
}
function ranks(ans, sub, st, bias) {
  const raw = new Array(8).fill(0);
  sub.forEach(qi => { const w = W[qi][ans[qi]]; for (let k = 0; k < 8; k++) raw[k] += w[k]; });
  const z = raw.map((x, k) => (x - st.mu[k]) / st.sd[k]);
  return P.map((p, ci) => { let d = 0; for (let i = 0; i < 8; i++) d += (z[i] - p[i]) ** 2; return [d - bias[ci], ci]; }).sort((a, b) => a[0] - b[0]).map(x => x[1]);
}
function evaluate(sub, iters) {
  const st = statsFor(sub), bias = new Array(NC).fill(0);
  const cal = people.slice(0, 2500).map(p => p[0]).concat(randPool.slice(0, 1250));
  let f;
  for (let it = 0; it < iters; it++) {
    f = new Array(NC).fill(0);
    cal.forEach(a => f[ranks(a, sub, st, bias)[0]]++);
    for (let c = 0; c < NC; c++) bias[c] += 6 * (1 / NC - f[c] / cal.length);
  }
  f = new Array(NC).fill(0);
  let same = 0, top3 = 0;
  people.forEach(([a, b]) => {
    const r1 = ranks(a, sub, st, bias), r2 = ranks(b, sub, st, bias);
    f[r1[0]]++;
    if (r1[0] === r2[0]) same++;
    if (r1.slice(0, 3).indexOf(r2[0]) > -1) top3++;
  });
  return { same: same / M, top3: top3 / M, lo: Math.min(...f) / M, hi: Math.max(...f) / M };
}

const mirror = D.questions.map((q, i) => q.mirror ? i : -1).filter(i => i >= 0);
let palace = D.questions.map((q, i) => q.mirror ? -1 : i).filter(i => i >= 0);
const pct = x => (x * 100).toFixed(1).padStart(5) + '%';
const removed = [];
function line(n, r) { console.log(String(n).padStart(3) + ' 题', ' 重测一致', pct(r.same), ' 前三命中', pct(r.top3), ' 分布', pct(r.lo), '~', pct(r.hi)); }
line(palace.length + mirror.length, evaluate(palace.concat(mirror), 20));
while (palace.length > 10) {
  let best = null, bv = -1;
  palace.forEach(qi => {
    const sub = palace.filter(x => x !== qi).concat(mirror);
    const r = evaluate(sub, 6);
    const v = r.same + 0.5 * r.top3;
    if (v > bv) { bv = v; best = qi; }
  });
  palace = palace.filter(x => x !== best); removed.push(best + 1);
  const r = evaluate(palace.concat(mirror), 20);
  line(palace.length + mirror.length, r);
  console.log('      删去第 ' + (best + 1) + ' 题');
}
console.log('删除顺序（题号）：', removed.join(', '));
