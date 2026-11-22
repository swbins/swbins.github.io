/**
 * 1만리 3D 바람 길잡이 (W-0671 ② — wind-guide.js 머리말 「3D 는 배선만(안 함)」. 가만히 서면 목표 쪽으로 흐르는 바람 줄이 2D 에만 있었다)
 * world3d presentDraw 가 매 프레임 DG.world3dExtras 의 step(scene, camera) 를 부른다. 방향 = windGuide.dir(내 자리)(autoQuestGo 목표) 그대로 ·
 * 가만히 선 시간은 여기서 따로 잰다(wind.still 1.2초 지나면 0.6초에 걸쳐 짙어짐 — 2D 와 같은 손잡이) · 가닥 수 wind.n(14).
 * 가닥 = 발밑 둘레에서 목표 쪽으로 미끄러지며 옅어지는 흰 줄(땅 위 0.5 m). 손잡이 wind.on · go.wind3d(1, 0 = 옛 — 3D 에 없음) · go.wind3dLen(9 m)
 */
(function (global) {
  'use strict';
  var sceneOf = null, grp = null, lines = [], seeds = [], lastX = null, lastY = null, stillT = 0, lastNow = 0;

  function tuned(k, d) { var C = global.DG.core; return C && C.tuned ? +C.tuned(k, d) : d; }
  function T() { return global.THREE; }
  function line() {
    var g = new (T().BufferGeometry)(); g.setAttribute('position', new (T().BufferAttribute)(new Float32Array(6), 3));
    var l = new (T().Line)(g, new (T().LineBasicMaterial)({ color: 0xf4f8ff, transparent: true, opacity: 0, depthWrite: false })); l.frustumCulled = false; grp.add(l); return l;
  }
  function hide() { for (var i = 0; i < lines.length; i++) { lines[i].visible = false; } }

  function step(scene) {
    var WG = global.DG.windGuide, W3 = global.DG.world3d, C = global.DG.core;
    if (!T() || !WG || !W3 || !W3.groundY || !C || !C.save) { return; }
    if (sceneOf !== scene || !grp) { sceneOf = scene; grp = new (T().Group)(); scene.add(grp); lines = []; }
    var pos = C.save.player.pos, now = Date.now();
    var dt = lastNow ? Math.min(0.2, (now - lastNow) / 1000) : 0; lastNow = now;
    var moved = lastX === null || Math.hypot(pos.x - lastX, pos.y - lastY) > 0.05; lastX = pos.x; lastY = pos.y;
    stillT = moved ? 0 : stillT + dt;
    var s0 = tuned('wind.still', 1.2), k = stillT <= s0 ? 0 : Math.min(1, (stillT - s0) / 0.6);
    if (!tuned('wind.on', 1) || !tuned('go.wind3d', 1) || k <= 0) { hide(); return; }
    var d = WG.dir ? WG.dir(pos) : null; if (!d) { hide(); return; }
    var n = tuned('wind.n', 14), len = tuned('go.wind3dLen', 9), i;
    if (!seeds.length) { for (i = 0; i < 40; i++) { seeds.push([Math.random(), Math.random(), Math.random()]); } }
    while (lines.length < n) { lines.push(line()); }
    for (i = 0; i < lines.length; i++) {
      var l = lines[i]; if (i >= n) { l.visible = false; continue; }
      var s = seeds[i % seeds.length], t = ((now / 1000) * (0.55 + s[2] * 0.5) + s[0] * 5) % 1;
      var side = (s[1] - 0.5) * 6, off = 1 + t * len * 2.2, seg = 1.2 + s[2] * 0.8;
      var x0 = pos.x + d.dx * off - d.dy * side, y0 = pos.y + d.dy * off + d.dx * side, x1 = x0 + d.dx * seg, y1 = y0 + d.dy * seg;
      var a = l.geometry.attributes.position.array;
      a[0] = x0; a[1] = W3.groundY(x0, y0) + 0.5 + Math.sin(t * 6 + i) * 0.15; a[2] = y0; a[3] = x1; a[4] = W3.groundY(x1, y1) + 0.5 + Math.sin(t * 6 + i + 0.6) * 0.15; a[5] = y1;
      l.geometry.attributes.position.needsUpdate = true; l.visible = true; l.material.opacity = (1 - t) * 0.7 * k;
    }
  }

  global.DG = global.DG || {};
  global.DG.wind3d = { step: step, _n: function () { return lines.filter(function (l) { return l.visible; }).length; } };
  (global.DG.world3dExtras = global.DG.world3dExtras || []).push(global.DG.wind3d);
})(typeof window !== 'undefined' ? window : globalThis);
