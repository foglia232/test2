(function () {
  'use strict';
  var D = DATA, E = Engine;
  var CB = (typeof CALIB !== 'undefined') ? CALIB : { bias: {}, rarity: {} };
  var K = E.KEYS, DIM = {};
  D.dims.forEach(function (d) { DIM[d.k] = d; });
  var NQ = D.questions.length;
  var app = document.getElementById('app');
  var LS = 'dnz-history-v1';
  var MARK = ['甲', '乙', '丙', '丁'];
  var NMIR = D.questions.filter(function (q) { return q.mirror; }).length;

  var answers = [], seq = [], pos = 0;
  D.chapters.forEach(function (ch, ci) {
    ch.qs.forEach(function (qi, k) { seq.push({ t: 'q', ci: ci, qi: qi, first: k === 0 }); });
  });

  /* ---------- 小工具 ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function loadHist() { try { var h = JSON.parse(localStorage.getItem(LS) || '[]'); return Array.isArray(h) ? h : []; } catch (e) { return []; } }
  function saveHist(h) { try { localStorage.setItem(LS, JSON.stringify(h.slice(0, 30))); } catch (e) { } }
  function show(html) { app.innerHTML = html; window.scrollTo(0, 0); }
  function on(sel, fn) { app.querySelectorAll(sel).forEach(function (el) { el.addEventListener('click', fn); }); }
  function fmtDate(t) { var d = new Date(t); function p(n) { return n < 10 ? '0' + n : n; } return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function isMirror(ci) { return !!D.chapters[ci].mirror; }
  function cnNum(n) {
    var d = '〇一二三四五六七八九';
    if (n < 10) return d[n];
    if (n < 20) return '十' + (n % 10 ? d[n % 10] : '');
    return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
  }

  /* ---------- 封面 ---------- */
  function home() {
    var n = loadHist().length;
    var stitches = [14, 36, 62, 86].map(function (p) { return '<i class="stitch" style="top:' + p + '%"></i>'; }).join('');
    show(
      '<section class="cover">' + stitches +
      '<div class="cover-top">' +
      '<h1 class="tiqian"><span>穿越宫斗剧</span><span>你会是哪位大女主</span></h1>' +
      '<div class="cover-side">' +
      '<p class="lead">醒来那天，你只有一本写了一半的手记。接下来怎么走，由你来选。</p>' +
      '<ul class="facts"><li>' + NQ + ' 道情境题，约 4 分钟</li><li>16 位历史大女主原型</li><li>八维蛛网图和专属解读</li></ul>' +
      '</div></div>' +
      '<div class="cover-bottom">' +
      '<button class="btn btn-paper" id="start">翻开手记</button>' +
      (n ? '<button class="btn-line light" id="hist">我的测试记录（' + n + '）</button>' : '') +
      '<p class="fine">' + esc(D.meta.disclaimer) + '</p>' +
      '</div></section>'
    );
    on('#start', prologue);
    on('#hist', historyScreen);
  }

  function prologue() {
    show(
      '<section class="page"><div class="frame prologue">' +
      D.prologue.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') +
      '<p class="tip">选你<b>最可能</b>做的，而不是最像女主角的。不需要懂历史，题目里给的信息就够了。</p>' +
      '<div class="actions"><button class="btn btn-zhu" id="go">入宫</button>' +
      '<button class="btn-line" id="home">回到封面</button></div>' +
      '</div></section>'
    );
    on('#go', function () { answers = new Array(NQ).fill(null); pos = 0; step(); });
    on('#home', home);
  }

  function step() {
    var s = seq[pos];
    if (!s) return finish();
    question(s.qi, s.ci, s.first);
  }

  function question(qi, ci, first) {
    var q = D.questions[qi], ch = D.chapters[ci];
    var num = qi + 1, sel = answers[qi], mir = isMirror(ci);
    var banner = first ? '<div class="chban"><p class="chno">' + esc(ch.no) + '</p><p class="chti">' + esc(ch.title) + '</p><p class="chin">' + esc(ch.intro) + '</p></div>' : '';
    var label = mir ? '现实题 ' + (num - (NQ - NMIR)) + ' / ' + NMIR : '第' + cnNum(num) + '问';
    show(
      '<section class="page' + (mir ? ' mirror' : '') + '">' +
      '<div class="qhead"><span><b>' + esc(ch.no) + '</b>　' + esc(ch.title) + '</span><span>' + num + ' / ' + NQ + '</span></div>' +
      '<div class="bar"><i style="width:' + ((num - 1) / NQ * 100) + '%"></i></div>' +
      '<div class="frame">' + banner +
      '<p class="qno">' + label + '</p>' +
      '<p class="qscene">' + esc(q.scene) + '</p>' +
      (q.ask ? '<h2 class="qask">' + esc(q.ask) + '</h2>' : '<div class="qgap"></div>') +
      '<ol class="opts">' + q.opts.map(function (o, i) {
        return '<li><button class="opt' + (sel === i ? ' on' : '') + '" data-i="' + i + '" aria-pressed="' + (sel === i) + '"><b>' + MARK[i] + '</b><span>' + esc(o.t) + '</span></button></li>';
      }).join('') + '</ol>' +
      '<div class="qfoot"><button class="btn-line" id="back">上一题</button>' +
      (sel != null ? '<button class="btn-line" id="fwd">下一题</button>' : '<span></span>') + '</div>' +
      '</div></section>'
    );
    var lock = false;
    on('.opt', function (e) {
      if (lock) return; lock = true;
      var i = +e.currentTarget.getAttribute('data-i');
      answers[qi] = i;
      app.querySelectorAll('.opt').forEach(function (b) { b.classList.toggle('on', b === e.currentTarget); });
      var bar = app.querySelector('.bar i'); if (bar) bar.style.width = (num / NQ * 100) + '%';
      setTimeout(function () { pos++; step(); }, 280);
    });
    on('#back', function () { pos--; if (pos < 0) { pos = 0; return prologue(); } step(); });
    on('#fwd', function () { pos++; step(); });
  }

  function finish() {
    if (answers.some(function (a) { return a == null; })) { /* 有漏答，回到第一处 */
      for (var p = 0; p < seq.length; p++) if (answers[seq[p].qi] == null) { pos = p; return step(); }
    }
    show('<section class="page"><div class="frame loading"><div class="seal-spin">推</div><p>正在翻阅你的手记，推演你的命格……</p></div></section>');
    var rec = { t: Date.now(), a: answers.slice() };
    rec.id = E.analyze(D, rec.a, CB.bias).ranking[0].c.id;
    var h = loadHist(); h.unshift(rec); saveHist(h);
    setTimeout(function () { report(rec); }, 1500);
  }

  /* ---------- 报告 ---------- */
  function pickCallback(ans, k, used) {
    var best = -1, bw = 0;
    for (var qi = 0; qi < NQ; qi++) {
      var q = D.questions[qi];
      if (q.mirror || ans[qi] == null || used[qi]) continue;
      var w = q.opts[ans[qi]].w[k] || 0;
      if (w > bw) { bw = w; best = qi; }
    }
    if (best < 0) return '';
    used[best] = 1;
    return D.questions[best].opts[ans[best]].cb;
  }

  function analyzeFull(ans) {
    var r = E.analyze(D, ans, CB.bias);
    var top = r.ranking[0], c = top.c, p = top.p, z = r.z;
    var order = K.map(function (k, i) { return i; }).sort(function (a, b) { return z[b] - z[a]; });
    var protoScores = p.map(function (v) { return Math.round(50 + v * 30); });
    /* 盟友：画像接近，又能补你最弱的一项 */
    var lowI = order[7], ally = null, av = -1e9;
    r.ranking.slice(1).forEach(function (x) { var v = -x.d + 1.2 * x.p[lowI]; if (v > av) { av = v; ally = x; } });
    var rival = r.ranking[r.ranking.length - 1];
    return { r: r, c: c, p: p, z: z, order: order, protoScores: protoScores, ally: ally, rival: rival };
  }

  function radarSVG(vals, proto) {
    var S = 340, cx = 170, cy = 170, R = 112, n = 8;
    function pt(i, f) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; }
    function poly(fs) { return fs.map(function (f, i) { var q = pt(i, f); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }
    var g = '';
    [0.25, 0.5, 0.75, 1].forEach(function (f) { g += '<polygon points="' + poly(new Array(n).fill(f)) + '" fill="' + (f === 1 ? '#F4ECDA' : 'none') + '" stroke="#CDBB95" stroke-width="1"/>'; });
    for (var i = 0; i < n; i++) { var e = pt(i, 1); g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" stroke="#D9CBA9" stroke-width="1"/>'; }
    g += '<polygon points="' + poly(proto.map(function (v) { return v / 100; })) + '" fill="none" stroke="#2F4858" stroke-width="1.6" stroke-dasharray="5 4"/>';
    g += '<polygon points="' + poly(vals.map(function (v) { return v / 100; })) + '" fill="rgba(178,58,42,.2)" stroke="#B23A2A" stroke-width="2.4" stroke-linejoin="round"/>';
    vals.forEach(function (v, i) { var q = pt(i, v / 100); g += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3.6" fill="#B23A2A"/>'; });
    K.forEach(function (k, i) {
      var q = pt(i, 1.24);
      g += '<text x="' + q[0] + '" y="' + (q[1] + 5) + '" text-anchor="middle" font-size="15" font-weight="700" fill="#2A1F1A" font-family="Noto Serif SC,Songti SC,serif">' + DIM[k].name + '</text>';
      g += '<text x="' + q[0] + '" y="' + (q[1] + 22) + '" text-anchor="middle" font-size="12" fill="#B23A2A" font-family="Noto Serif SC,Songti SC,serif">' + vals[i] + '</text>';
    });
    return '<svg viewBox="-10 -6 ' + (S + 20) + ' ' + (S + 22) + '" role="img" aria-label="八维蛛网图">' + g + '</svg>';
  }

  function sealHTML(title) {
    return '<div class="seal" aria-hidden="true"><span>' + esc(title.slice(0, 2)) + '</span><span>' + esc(title.slice(2, 4)) + '</span></div>';
  }

  function report(rec) {
    var ans = rec.a, A = analyzeFull(ans), c = A.c, z = A.z, s = A.r.scores;
    var used = {};
    var topK = K[A.order[0]], lowK = K[A.order[7]];

    /* 你们最像的地方 */
    var pts = c.hi.map(function (k) {
      var cb = pickCallback(ans, k, used);
      return { h: DIM[k].head, b: c.like[k], cb: cb };
    });
    if (c.hi.indexOf(topK) < 0) {
      var cb3 = pickCallback(ans, topK, used);
      pts.push({ h: '另外，你自己最突出的一项是' + DIM[topK].name, b: DIM[topK].hi, cb: cb3 });
    }
    var ptsHTML = pts.map(function (x) {
      return '<li><h4>' + esc(x.h) + '</h4><p>' + esc(x.b) + '</p>' +
        (x.cb ? '<span class="cbq">还记得吗？' + esc(x.cb) + '。</span>' : '') + '</li>';
    }).join('');

    /* 和她不一样的地方 */
    var diffs = K.map(function (k, i) { return { k: k, d: z[i] - A.p[i] }; })
      .sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); })
      .filter(function (x) { return Math.abs(x.d) > 0.45; }).slice(0, 2);
    var diffHTML = diffs.length ? diffs.map(function (x) {
      return '<p>' + esc(D.diff[x.k][x.d > 0 ? 'hi' : 'lo'].replace('{n}', c.name)) + '</p>';
    }).join('') : '<p>你和' + esc(c.name) + '的八维轮廓几乎重合，像得有点吓人。</p>';

    /* 八维 */
    var dimsHTML = K.map(function (k, i) {
      var lv = s[i] >= 67 ? 'hi' : s[i] <= 33 ? 'lo' : 'mid';
      return '<li><span class="n">' + DIM[k].name + '</span><span class="track"><i style="width:' + s[i] + '%"></i></span><span class="v">' + s[i] + '</span>' +
        '<span class="t">' + esc(DIM[k][lv]) + '</span></li>';
    }).join('');

    /* 宫中剧本 */
    var ally = A.ally.c;
    var shared = ally.hi.slice().sort(function (a, b) { return z[K.indexOf(b)] - z[K.indexOf(a)]; })[0];
    var help = null, hv = -1e9; /* 她强、你弱得最明显的一项 */
    K.forEach(function (k, i) { if (k === shared || A.ally.p[i] <= 0) return; var v = A.ally.p[i] - z[i]; if (v > hv) { hv = v; help = k; } });
    var allyText = help && z[K.indexOf(help)] < 0.3
      ? '你们在' + DIM[shared].name + '上一拍即合；而她擅长的' + DIM[help].name + '，正是你没那么上心的部分。有她在，你能少操一份心。'
      : '你们在' + DIM[shared].name + '上一拍即合，做事的节奏也很像。宫里有她，你不会觉得孤单。';
    var rival = A.rival.c, rK = rival.hi.slice().sort(function (a, b) { return z[K.indexOf(a)] - z[K.indexOf(b)]; })[0];
    var scriptHTML =
      '<div class="card"><p class="k">你的封号</p><p class="big">' + DIM[topK].feng + '妃</p><p>' + esc(DIM[topK].fengWhy) + '</p></div>' +
      '<div class="card"><p class="k">宫中稀有度</p><p class="big">约 ' + Math.max(3, Math.round(CB.rarity[c.id] || 6)) + '%</p><p>的人测出' + esc(c.name) + '。</p></div>' +
      '<div class="card wide"><p class="k">你在宫中的结局</p><p>' + esc(c.ending) + '</p></div>' +
      '<div class="card wide"><p class="k">最佳盟友</p><p class="big">' + esc(ally.name) + '</p><p>' + esc(allyText) + '</p></div>' +
      '<div class="card wide"><p class="k">天生对手</p><p class="big">' + esc(rival.name) + '</p><p>她把' + DIM[rK].name + '看得很重，你却觉得没那么要紧。你们见了面，大概会客客气气地喝完一盏茶，然后各自回宫生闷气。</p></div>';

    /* 镜外 */
    var groups = [{ key: 'work', t: '工作和成长里' }, { key: 'love', t: '亲近的关系里' }, { key: 'self', t: '低谷的时候' }];
    var mirHTML = '';
    groups.forEach(function (g) {
      D.questions.forEach(function (q, qi) {
        if (q.mirror !== g.key || ans[qi] == null) return;
        var o = q.opts[ans[qi]];
        mirHTML += '<div class="mir"><p class="tag">' + g.t + '｜' + esc(q.label || '') + '</p>' +
          '<p class="you">你的选择：' + esc(o.t) + '</p><p>' + esc(o.read) + '</p><p class="tipline">' + esc(o.tip) + '</p></div>';
      });
    });

    var longName = c.name.length >= 4;
    show(
      '<article class="report">' +
      '<header class="hero"><p class="kicker">你的历史大女主原型</p><div class="hero-body">' +
      '<h1 class="hero-name' + (longName ? ' long' : '') + '">' + esc(c.name) + '</h1>' +
      '<div class="hero-info">' + sealHTML(c.title) +
      '<p class="hero-era">' + esc(c.era) + '</p>' +
      '<p class="hero-tag">「' + esc(c.tagline) + '」</p>' +
      '<p class="hero-meta">相关影视：' + esc(c.dramas.join('')) + '<br>' + esc(fmtDate(rec.t)) + ' 测出</p>' +
      '</div></div></header>' +

      '<section class="sec"><p class="lead-p">' + esc(c.intro) + '</p></section>' +

      '<section class="sec"><h3>你的八维蛛网</h3>' +
      '<div class="radar-wrap">' + radarSVG(s, A.protoScores) +
      '<div class="legend"><span><i></i>你</span><span><i class="p"></i>' + esc(c.name) + '的典型轮廓</span></div></div>' +
      '<p class="muted">分数是和随机作答相比，你在这一项上的倾向有多强，不代表能力高低。</p>' +
      '<ul class="dims">' + dimsHTML + '</ul></section>' +

      '<section class="sec"><h3>你和她，最像的地方</h3><ol class="points">' + ptsHTML + '</ol></section>' +

      '<section class="sec"><h3>你和她，不一样的地方</h3>' + diffHTML +
      '<p class="muted">你测出的，是' + esc(c.name) + '身上的这一条路线，而不是她的全部人生。</p></section>' +

      '<section class="sec"><h3>你的宫中剧本</h3><div class="script">' + scriptHTML + '</div></section>' +

      '<section class="sec"><h3>镜外的你</h3><p class="muted" style="margin-bottom:14px">梦醒以后，那 5 道现实题里的你。</p>' + mirHTML + '</section>' +

      '<section class="sec"><h3>她的代价，你的提醒</h3><p>' + esc(c.cost) + '</p>' +
      '<div class="card" style="margin:6px 0 14px"><p class="k">给你的一个小练习</p><p>你八维里最弱的一项是' + DIM[lowK].name + '。' + esc(D.growth[lowK]) + '</p></div></section>' +

      '<section class="sec archive"><h3>人物小档案</h3><p>' + esc(c.history) + '</p>' +
      '<p class="dr">相关影视：' + esc(c.dramas.join('')) + '。影视作品情节经过艺术加工，与史实并不相同。</p></section>' +

      '<footer class="share-box"><p class="line">' + esc(c.share) + '</p><div class="btns">' +
      '<button class="btn btn-paper" id="card">生成分享卡</button>' +
      '<button class="btn-line light" id="again">再测一次</button>' +
      '<button class="btn-line light" id="hist">我的测试记录</button>' +
      '<button class="btn-line light" id="home">回到封面</button></div>' +
      '<p class="fine">' + esc(D.meta.disclaimer) + '</p></footer>' +
      '</article>'
    );
    on('#card', function () { shareCard(c, s, A.protoScores); });
    on('#again', prologue);
    on('#hist', historyScreen);
    on('#home', home);
  }

  /* ---------- 测试记录 ---------- */
  function historyScreen() {
    var h = loadHist();
    var CH = {}; D.characters.forEach(function (c) { CH[c.id] = c; });
    var list = h.map(function (rec, i) {
      var c = CH[rec.id]; if (!c) return '';
      return '<li><span class="mini">' + esc(c.name.slice(0, 1)) + '</span><span class="info"><b>' + esc(c.name) + '</b><span>' + esc(fmtDate(rec.t)) + '</span></span>' +
        '<button class="go" data-i="' + i + '">看报告</button><button class="del" data-i="' + i + '" aria-label="删除这条记录">删除</button></li>';
    }).join('');
    show(
      '<section class="page"><div class="frame">' +
      '<p class="qno">测试记录</p>' +
      '<p class="muted" style="margin:8px 0 6px">记录只保存在这台设备的浏览器里，清除浏览器数据后会消失。</p>' +
      (h.length ? '<ul class="hist-list">' + list + '</ul>' : '<div class="empty"><p>还没有记录。翻开手记，测第一次吧。</p></div>') +
      '<div class="actions"><button class="btn btn-zhu" id="start">' + (h.length ? '再测一次' : '开始测试') + '</button>' +
      '<button class="btn-line" id="home">回到封面</button></div>' +
      '</div></section>'
    );
    on('.go', function (e) { report(h[+e.currentTarget.getAttribute('data-i')]); });
    on('.del', function (e) {
      var i = +e.currentTarget.getAttribute('data-i');
      if (!window.confirm('删除这条记录？删除后无法恢复。')) return;
      h.splice(i, 1); saveHist(h); historyScreen();
    });
    on('#start', prologue);
    on('#home', home);
  }

  /* ---------- 分享卡 ---------- */
  function shareCard(c, vals, proto) {
    var W = 1080, H = 1500, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    var BR = '"DNZ Brush","Ma Shan Zheng","STXingkai","KaiTi",serif', SE = '"Noto Serif SC","Songti SC","STSong",serif';
    var ready = (document.fonts && document.fonts.load) ? Promise.all([
      document.fonts.load('80px "DNZ Brush"', c.name + c.title + c.share),
      document.fonts.load('700 40px "Noto Serif SC"', c.tagline)
    ]).catch(function () { }) : Promise.resolve();
    ready.then(function () {
      x.fillStyle = '#7A2318'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#EDE3CC'; x.fillRect(60, 60, W - 120, H - 120);
      x.strokeStyle = '#B23A2A'; x.lineWidth = 8; x.strokeRect(90, 90, W - 180, H - 180);
      x.lineWidth = 2; x.strokeRect(108, 108, W - 216, H - 216);

      x.fillStyle = '#5E4E43'; x.font = '36px ' + SE; x.textAlign = 'left';
      x.fillText('我的历史大女主原型', 160, 200);
      /* 竖排人名 */
      var fs = c.name.length >= 4 ? 132 : 172;
      x.fillStyle = '#2A1F1A'; x.font = fs + 'px ' + BR; x.textAlign = 'center';
      for (var i = 0; i < c.name.length; i++) x.fillText(c.name[i], 270, 390 + i * fs * 1.03);
      /* 印章 */
      x.save(); x.translate(780, 320); x.rotate(-0.1);
      x.fillStyle = '#B23A2A'; x.fillRect(-100, -100, 200, 200);
      x.strokeStyle = '#FFF1E2'; x.lineWidth = 5; x.strokeRect(-87, -87, 174, 174);
      x.fillStyle = '#FFF1E2'; x.font = '72px ' + BR; x.textAlign = 'center';
      var t = c.title;
      x.fillText(t[0], 38, -10); x.fillText(t[1], 38, 66); x.fillText(t[2], -38, -10); x.fillText(t[3], -38, 66);
      x.restore();
      /* 气质句 */
      x.fillStyle = '#7A2318'; x.font = '700 38px ' + SE; x.textAlign = 'left';
      wrap(x, '「' + c.tagline + '」', 470, 520, 440, 58);
      /* 小蛛网 */
      var cx = 690, cy = 910, R = 145;
      function P(i, f) { var a = -Math.PI / 2 + i * Math.PI / 4; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; }
      function path(fs2) { x.beginPath(); fs2.forEach(function (f, i) { var q = P(i, f); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }); x.closePath(); }
      x.strokeStyle = '#CDBB95'; x.lineWidth = 2;
      [0.33, 0.66, 1].forEach(function (f) { path(new Array(8).fill(f)); x.stroke(); });
      path(proto.map(function (v) { return v / 100; })); x.setLineDash([12, 10]); x.strokeStyle = '#2F4858'; x.lineWidth = 3; x.stroke(); x.setLineDash([]);
      path(vals.map(function (v) { return v / 100; })); x.fillStyle = 'rgba(178,58,42,.22)'; x.fill(); x.strokeStyle = '#B23A2A'; x.lineWidth = 5; x.stroke();
      x.fillStyle = '#2A1F1A'; x.font = '700 28px ' + SE; x.textAlign = 'center';
      K.forEach(function (k, i) { var q = P(i, 1.25); x.fillText(DIM[k].name, q[0], q[1] + 10); });
      /* 分隔线 + 分享句 */
      x.strokeStyle = '#CDBB95'; x.lineWidth = 2; x.beginPath(); x.moveTo(180, 1140); x.lineTo(900, 1140); x.stroke();
      var parts = c.share.split('：');
      x.fillStyle = '#8C7A6B'; x.font = '32px ' + SE; x.textAlign = 'center';
      x.fillText(parts.length > 1 ? parts[0] : '我的大女主底牌', W / 2, 1205);
      x.fillStyle = '#7A2318'; x.font = '78px ' + BR;
      wrap(x, (parts[1] || parts[0]).replace(/。$/, ''), W / 2, 1295, 760, 88);
      x.fillStyle = '#8C7A6B'; x.font = '26px ' + SE;
      x.fillText(D.meta.title, W / 2, 1365);

      var url = cv.toDataURL('image/png');
      var ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML = '<img alt="分享卡" src="' + url + '"><p>手机上可以长按图片保存</p><div class="row">' +
        '<a class="btn btn-paper" download="大女主-' + esc(c.name) + '.png" href="' + url + '">下载图片</a>' +
        '<button class="btn-line light" id="close">关闭</button></div>';
      document.body.appendChild(ov);
      ov.querySelector('#close').addEventListener('click', function () { ov.remove(); });
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    });
  }
  function wrap(x, text, X, Y, maxW, lh, center) {
    var line = '', y = Y;
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (x.measureText(test).width > maxW && line) { x.fillText(line, X, y); line = text[i]; y += lh; }
      else line = test;
    }
    x.fillText(line, X, y);
  }

  /* ---------- 预览（给作者看的隐藏页：地址后面加 #all） ---------- */
  function idealAnswers(c) {
    var p = E.proto(c);
    return D.questions.map(function (q) {
      var best = 0, bv = -1e9;
      q.opts.forEach(function (o, i) { var s = 0; K.forEach(function (k, ki) { s += (o.w[k] || 0) * p[ki]; }); if (s > bv) { bv = s; best = i; } });
      return best;
    });
  }
  function previewList() {
    show('<section class="page"><div class="frame"><p class="qno">16 份结果预览</p>' +
      '<p class="muted" style="margin:8px 0">作者预览用：每份报告按这位人物的"典型作答"生成，不会存进测试记录。</p><ul class="hist-list">' +
      D.characters.map(function (c) {
        return '<li><span class="mini">' + esc(c.name[0]) + '</span><span class="info"><b>' + esc(c.name) + '</b><span>' + esc(c.title) + '</span></span>' +
          '<a class="go" href="#preview=' + c.id + '">看报告</a></li>';
      }).join('') + '</ul><div class="actions"><button class="btn-line" id="home">回到封面</button></div></div></section>');
    on('#home', function () { location.hash = ''; home(); });
  }
  function route() {
    var h = location.hash;
    if (h === '#all') return previewList();
    var m = h.match(/^#preview=(\w+)/);
    if (m) {
      var c = D.characters.filter(function (x) { return x.id === m[1]; })[0];
      if (c) return report({ t: Date.now(), a: idealAnswers(c) });
    }
    home();
  }
  window.addEventListener('hashchange', route);
  route();
})();
