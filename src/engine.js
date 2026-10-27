/* 计分引擎：原始分 → 相对随机作答的标准分 → 与 16 位人物画像比对 */
(function (E) {
  var KEYS = ['z', 'm', 'g', 'r', 'd', 'h', 'c', 'j'];
  E.KEYS = KEYS;

  /* 每个维度在"随机作答"下的均值与标准差（解析计算，不需要样本） */
  E.stats = function (D) {
    var mu = {}, v = {}, sd = {};
    KEYS.forEach(function (k) { mu[k] = 0; v[k] = 0; });
    D.questions.forEach(function (q) {
      var n = q.opts.length;
      KEYS.forEach(function (k) {
        var s = 0, s2 = 0;
        q.opts.forEach(function (o) { var x = o.w[k] || 0; s += x; s2 += x * x; });
        var m = s / n; mu[k] += m; v[k] += s2 / n - m * m;
      });
    });
    KEYS.forEach(function (k) { sd[k] = Math.sqrt(v[k]) || 1; });
    return { mu: mu, sd: sd };
  };

  /* 人物画像：突出项 +1.2，次突出 +0.5，最弱项 -1.0，次弱 -0.5 */
  E.proto = function (c) {
    return KEYS.map(function (k) {
      if (c.hi.indexOf(k) > -1) return 1.2;
      if ((c.lo || []).indexOf(k) > -1) return -1.0;
      if ((c.mid || []).indexOf(k) > -1) return 0.5;
      if ((c.lo2 || []).indexOf(k) > -1) return -0.5;
      return 0;
    });
  };

  E.phi = function (x) { /* 标准正态分布函数 */
    var t = 1 / (1 + 0.2316419 * Math.abs(x));
    var d = 0.3989423 * Math.exp(-x * x / 2);
    var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  };

  var _st = null;
  E.analyze = function (D, answers, bias) {
    bias = bias || {};
    var st = _st || (_st = E.stats(D));
    var raw = {};
    KEYS.forEach(function (k) { raw[k] = 0; });
    answers.forEach(function (oi, qi) {
      if (oi == null) return;
      var w = D.questions[qi].opts[oi].w;
      for (var k in w) raw[k] += w[k];
    });
    var z = KEYS.map(function (k) { return (raw[k] - st.mu[k]) / st.sd[k]; });
    var ranking = D.characters.map(function (c, ci) {
      var p = E.proto(c), d = 0;
      for (var i = 0; i < 8; i++) d += (z[i] - p[i]) * (z[i] - p[i]);
      return { ci: ci, c: c, p: p, d: d - (bias[c.id] || 0) };
    }).sort(function (a, b) { return a.d - b.d; });
    var scores = z.map(function (x) { return Math.round(Math.min(97, Math.max(6, E.phi(x) * 100))); });
    return { raw: raw, z: z, scores: scores, ranking: ranking };
  };
})(typeof module !== 'undefined' ? module.exports : (window.Engine = {}));
