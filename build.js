/* 把 src/ 里的文件合并成一个可以直接打开、也可以直接拖进 Netlify 的 index.html
 * 用法：node build.js
 * 改了 data.js 的题目或权重后，先跑 node src/sim.js 重新校准概率，再跑本脚本。
 * 书法字体（马善政楷书，SIL OFL 开源授权）只截取页面上用到的字，嵌进页面里，
 * 这样不依赖 Google Fonts，在大陆网络下标题也能正常显示。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const D = require('./src/data.js');
const r = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');

/* 1. 收集书法字体要显示的字 */
let chars = '穿越宫斗剧你会是哪位大女主第问妃约%推测试记录〇一二三四五六七八九十0123456789：，。「」？！· ';
D.characters.forEach(c => { chars += c.name + c.title + c.share; });
D.chapters.forEach(ch => { chars += ch.no + ch.title; });
D.dims.forEach(d => { chars += d.feng; });
chars += D.prologue[0];
const uniq = [...new Set(chars)].join('');

/* 2. 用 fonttools 截取子集 */
const tmp = path.join(__dirname, 'fonts', '_subset.woff2');
let fontCSS = '';
try {
  execFileSync('pyftsubset', [path.join(__dirname, 'fonts', 'MaShanZheng-Regular.ttf'),
    '--text=' + uniq, '--flavor=woff2', '--output-file=' + tmp, '--layout-features=*']);
  const b64 = fs.readFileSync(tmp).toString('base64');
  fs.unlinkSync(tmp);
  fontCSS = '@font-face{font-family:"DNZ Brush";src:url(data:font/woff2;base64,' + b64 + ') format("woff2");font-display:swap}\n';
  console.log('书法字体子集：' + uniq.length + ' 字，' + (b64.length * 0.75 / 1024).toFixed(0) + ' KB');
} catch (e) {
  console.warn('未能截取书法字体（需要 pip install fonttools brotli），将使用系统楷体：', e.message);
}

/* 3. 合并 */
let html = r('template.html')
  .replace('/*STYLE*/', () => fontCSS + r('style.css'))
  .replace('/*DATA*/', () => r('data.js'))
  .replace('/*CALIB*/', () => r('calib.js'))
  .replace('/*ENGINE*/', () => r('engine.js'))
  .replace('/*APP*/', () => r('app.js'));
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
