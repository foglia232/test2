/* 概率模拟与校准：node src/sim.js
 * 两类模拟作答者：
 *   随机型：每题随机选
 *   性格型：随机生成一组八维"真实性格"，按性格倾向（带噪声）选答案，更接近真人
 * 迭代调整每个人物的偏置，让各人物出现率尽量均衡，结果写入 src/calib.js
 */
const D = require('./data.js');
const E = require('./engine.js');
const fs = require('fs');
const path = require('path');

let seed = 20261028;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function gauss() { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const NQ = D.questions.length;
function randomAns() { return D.questions.map(q => Math.floor(rnd() * q.opts.length)); }
function personaAns(beta) {
  const t = {}; E.KEYS.forEach(k => t[k] = gauss());
  return D.questions.map(q => {
    const u = q.opts.map(o => { let s = 0; for (const k in o.w) s += o.w[k] * t[k]; return Math.exp(beta * s); });
    const tot = u.reduce((a, b) => a + b, 0); let x = rnd() * tot;
    for (let i = 0; i < u.length; i++) { x -= u[i]; if (x <= 0) return i; }
    return u.length - 1;
  });
}

const N = 24000;
const pool = [];
for (let i = 0; i < N; i++) pool.push(i % 3 === 0 ? randomAns() : personaAns(0.6 + rnd() * 0.8));

function freqs(bias, sample) {
  const f = {}; D.characters.forEach(c => f[c.id] = 0);
  sample.forEach(a => { f[E.analyze(D, a, bias).ranking[0].c.id]++; });
  for (const k in f) f[k] /= sample.length;
  return f;
}

const bias = {}; D.characters.forEach(c => bias[c.id] = 0);
const target = 1 / D.characters.length;
const before = freqs(bias, pool);
for (let it = 0; it < 40; it++) {
  const f = freqs(bias, pool);
  D.characters.forEach(c => { bias[c.id] += 6 * (target - f[c.id]); });
}
const after = freqs(bias, pool);

/* 独立验证集：换一批新的模拟作答者 */
seed = 777;
const test = []; for (let i = 0; i < 12000; i++) test.push(i % 3 === 0 ? randomAns() : personaAns(0.6 + rnd() * 0.8));
const testF = freqs(bias, test);
const personaOnly = freqs(bias, test.filter((_, i) => i % 3 !== 0));

/* 自检：每个人物的"理想作答"应能测出她本人 */
const selfCheck = D.characters.map(c => {
  const p = E.proto(c);
  const ans = D.questions.map(q => {
    let best = 0, bv = -1e9;
    q.opts.forEach((o, i) => { let s = 0; E.KEYS.forEach((k, ki) => s += (o.w[k] || 0) * p[ki]); if (s > bv) { bv = s; best = i; } });
    return best;
  });
  return { name: c.name, got: E.analyze(D, ans, bias).ranking[0].c.name };
});

const pct = x => (x * 100).toFixed(1) + '%';
console.log('人物'.padEnd(8), '校准前', '校准后', '验证集', '自检');
D.characters.forEach((c, i) => {
  console.log(c.name.padEnd(8), pct(before[c.id]).padStart(6), pct(after[c.id]).padStart(6), pct(testF[c.id]).padStart(6), selfCheck[i].got === c.name ? 'OK' : '→ ' + selfCheck[i].got);
});
const vals = Object.values(testF);
console.log('验证集最低', pct(Math.min(...vals)), '最高', pct(Math.max(...vals)));

const rarity = {};
D.characters.forEach(c => rarity[c.id] = Math.max(3, Math.round(personaOnly[c.id] * 1000) / 10));
const round = {}; for (const k in bias) round[k] = Math.round(bias[k] * 1000) / 1000;
fs.writeFileSync(path.join(__dirname, 'calib.js'),
  '/* 由 sim.js 自动生成：人物偏置与模拟出现率 */\nvar CALIB = ' + JSON.stringify({ bias: round, rarity }, null, 1) + ';\nif (typeof module !== "undefined") module.exports = CALIB;\n');
console.log('已写入 calib.js');
