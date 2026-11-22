/**
 * 1만리 — 바람 길잡이 (W-0395 ① 웹 역이식 — 정본 고돗 G-0318 · 고스트 오브 쓰시마 구조만)
 * ---------------------------------------------------------------
 * 가만히 서면(STILL 초 넘게 자리 그대로) 지금 목표(autoQuestGo.goals()[0] 의 x·y) 쪽으로 바람이 흐른다 — 2D 지도 위 풀잎·먼지 줄
 * 몇 가닥이 플레이어 발밑에서 목표 쪽으로 미끄러진다. HUD 를 덜어 내려는 것이니 켜면 목표 기둥(beacon)을 끌 수 있다(손잡이 wind.beacon 0).
 *   손잡이 wind.on(1) · wind.still(1.2초) · wind.n(가닥 14) · wind.len(화면 px 48) · wind.beacon(1 = 기둥도 그대로)
 *   걸린 자리: world.js 2D 그리기(쉼터 뒤) draw2d(ctx, pos, sc, project, now, items) — items 에 맨 위 층으로 민다. 3D 는 wind3d.js(W-0671 ②).
 *   세이브 없음. 순수 함수 dir(pos) → { dx, dy, dist, goal } 또는 null 은 진단이 쓴다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  function K(key, def) { var c = core(); return c && c.tuned ? c.tuned('wind.' + key, def) : def; }
  function on() { return K('on', 1) ? true : false; }

  var lastX = null, lastY = null, stillT = 0, lastNow = 0, seeds = [];

  /** 목표 방향(세계 좌표 단위 벡터) — 목표가 없거나 자리 없는 목표(x null)면 null */
  function dir(pos) {
    var A = global.DG.autoQuestGo, gs = A && A.goals ? A.goals() : [], i;
    for (i = 0; i < gs.length; i++) {
      var g = gs[i];
      if (g && typeof g.x === 'number' && typeof g.y === 'number') {
        var dx = g.x - pos.x, dy = g.y - pos.y, d = Math.hypot(dx, dy);
        if (d < 2) { return null; }
        return { dx: dx / d, dy: dy / d, dist: d, goal: g };
      }
    }
    return null;
  }

  /** 가만히 선 시간을 센다 — 매 그리기마다. 돌아온 값 = 0~1 세기(STILL 지나면 0.6초에 걸쳐 1 로) */
  function stillness(pos, now) {
    var dt = lastNow ? Math.min(0.2, (now - lastNow) / 1000) : 0; lastNow = now;
    var moved = lastX === null || Math.hypot(pos.x - lastX, pos.y - lastY) > 0.05;
    lastX = pos.x; lastY = pos.y;
    stillT = moved ? 0 : stillT + dt;
    var s = K('still', 1.2);
    return stillT <= s ? 0 : Math.min(1, (stillT - s) / 0.6);
  }

  function beaconOn() { return !on() || K('beacon', 1) ? true : false; }

  /** 2D — 발밑에서 목표 쪽으로 흐르는 가닥들. items 가 있으면 맨 위 층으로 민다 */
  function draw2d(ctx, pos, sc, project, now, items) {
    if (!on() || !pos) { return; }
    var k = stillness(pos, now);
    if (k <= 0) { return; }
    var d = dir(pos);
    if (!d) { return; }
    var paint = function () {
      var n = K('n', 14), len = K('len', 48), i, p0 = project(0, 0), ang = Math.atan2(d.dy, d.dx);
      if (!p0) { return; }
      if (!seeds.length) { for (i = 0; i < 40; i++) { seeds.push([Math.random(), Math.random(), Math.random()]); } }
      ctx.save(); ctx.lineCap = 'round';
      for (i = 0; i < n; i++) {
        var s = seeds[i % seeds.length], t = ((now / 1000) * (0.55 + s[2] * 0.5) + s[0] * 5) % 1;   // 0 → 1 흘러감
        var side = (s[1] - 0.5) * 36, off = 10 + t * len * 3, a = (1 - t) * 0.55 * k;
        var cx = p0.x + Math.cos(ang) * off - Math.sin(ang) * side, cy = p0.y + (Math.sin(ang) * off + Math.cos(ang) * side) * 0.55 - 8;
        ctx.strokeStyle = 'rgba(255,244,190,' + Math.min(0.9, a * 1.5).toFixed(3) + ')'; ctx.lineWidth = 3;   // W-0586 연두 1.6px 은 풀밭에서 안 보였다(11-10 폰 화면)
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * 18, cy + Math.sin(ang) * 18 * 0.55); ctx.stroke();
      }
      ctx.restore();
    };
    if (items && items.push) { items.push({ v: 1e9, draw: paint }); } else { paint(); }
  }

  global.DG = global.DG || {};
  /* W-0586 ① 3D 가장자리 화살표 — 11-10 직접 해 봄: PC 3D 는 목표 기둥이 화면 밖(뒤·옆)이면 아무 표시가 없어, 방향키로 촌장 27m → 43m 로
     멀어졌다. 목표가 화면 밖이면 그쪽 가장자리에 화살표 + 이름·거리. 화면 안이면 숨김(기둥이 보이므로). 손잡이 wind.edge(1) */
  var edge = { el: null, raf: 0, v: null };
  function edgeName(g) { return String(g.label || '').replace(/^[^가-힣A-Za-z0-9(]+/, '').replace(/(을|를) 찾아가기$/, '').split(',')[0].slice(0, 14); }   // 짧게 — 길면 두 줄로 꺾여 조이스틱에 닿았다
  function edgeOf(W3, d) {
    var T3 = W3.three && W3.three(), cam = W3.camNode && W3.camNode();
    if (!T3 || !cam) { return null; }
    var v = edge.v || (edge.v = new T3.Vector3()), gy = W3.groundY ? W3.groundY(d.goal.x, d.goal.y) : 0;
    v.set(d.goal.x, gy + 2, d.goal.y).project(cam);
    var behind = v.z > 1, x = behind ? -v.x : v.x, y = behind ? -v.y : v.y;
    if (!behind && Math.abs(x) < 0.9 && Math.abs(y) < 0.9) { return null; }
    var a = Math.atan2(-y, x), s = Math.sin(a);   // 화면(아래 +) 각 — 구석 대신 인물 둘레 타원에(방향 단추·카드를 안 가린다)
    return { u: 0.5 + Math.cos(a) * 0.3, v: 0.55 + s * (s > 0 ? 0.12 : 0.3), a: a };
  }
  function onScreen2d(d) { var Wd = global.DG.world, sc = Wd && Wd.scale ? Wd.scale() : 1, u = d.dx * d.dist * sc, v = d.dy * d.dist * sc, W = global.innerWidth, H = global.innerHeight; return Math.abs(u) < W * 0.42 && v > -H * 0.42 && v < H * 0.36; }   // W-0627 2D 화면 배율로 — 고정 60m 는 가까이 당긴 화면(0.74px/m)에서 63m 목표가 화면 안인데도 글이 그 사람 이름표를 덮었다
  function edgeTick() {
    edge.raf = global.requestAnimationFrame(edgeTick);
    var W3 = global.DG.world3d, c = core(), e = null, d = null;
    var is3 = !!(W3 && W3.active && W3.active()), mp = !is3 && document.getElementById('map'), nowM = global.performance ? global.performance.now() : Date.now();
    if (mp && (!edge.mpAt || nowM - edge.mpAt > 500 || edge.mpEl !== mp)) { edge.mpAt = nowM; edge.mpEl = mp; edge.mpVis = !!(mp.getClientRects().length && getComputedStyle(mp).visibility !== 'hidden'); edge.mpR = mp.getBoundingClientRect(); }   // 11-12 W-0647 지도 칸 보임·크기는 0.5초마다(매 프레임 배치 읽기)
    if (on() && K('edge', 1) && (is3 || (mp && edge.mpVis)) && c && c.save && !(document.body && document.body.classList.contains('sheet-open'))) {
      d = dir(c.save.player.pos);
      /* 2D(폰 본판)도 — 바람 줄은 서 있을 때만·가늘어 놓쳤다. 1m ≈ 1px 라 60m 안이면 목표가 화면에 보이므로 숨김 */
      if (d && is3 && d.dist > 6) { e = edgeOf(W3, d); }
      else if (d && !is3 && d.dist > 60 && !onScreen2d(d)) { var a2 = Math.atan2(d.dy * 0.8, d.dx), s2 = Math.sin(a2); e = { u: 0.5 + Math.cos(a2) * 0.3, v: 0.6 + s2 * (s2 > 0 ? 0.1 : 0.2), a: a2 }; }
    }
    if (!e) { if (edge.el) { edge.el.style.display = 'none'; } return; }
    if (!edge.el) {
      edge.el = document.createElement('div'); edge.el.id = 'goal-edge';
      edge.el.style.cssText = 'position:fixed;z-index:30;pointer-events:none;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px;white-space:nowrap;font:600 13px/1.2 sans-serif;color:#fff3c4;text-shadow:0 1px 2px #000,0 0 4px #000';
      edge.el.innerHTML = '<span class="ge-a" style="font-size:30px;color:#ffd24a;line-height:1">➤</span><span class="ge-t"></span>';
      document.body.appendChild(edge.el);
    }
    var cv = is3 && W3.rendererNode && W3.rendererNode(), r = cv && cv.domElement ? cv.domElement.getBoundingClientRect() : (mp ? (edge.mpR || mp.getBoundingClientRect()) : { left: 0, top: 0, width: global.innerWidth, height: global.innerHeight });
    edge.el.style.display = 'flex';
    edge.el.style.left = (r.left + e.u * r.width) + 'px';
    edge.el.style.top = (r.top + e.v * r.height) + 'px';
    edge.el.firstChild.style.transform = 'rotate(' + e.a + 'rad)';
    edge.el.lastChild.textContent = edgeName(d.goal) + ' · ' + Math.round(d.dist) + 'm';
    var gx = r.left + e.u * r.width, hw = edge.el.lastChild.offsetWidth / 2, vw = global.innerWidth || 0, sh = 0;   // W-0610 글이 화면 끝에서 잘렸다 — 글만 안으로(화살은 제자리)
    if (vw && gx + hw > vw - 6) { sh = vw - 6 - gx - hw; } else if (gx - hw < 6) { sh = 6 - gx + hw; }
    edge.el.lastChild.style.transform = sh ? 'translateX(' + Math.round(sh) + 'px)' : '';
  }
  if (!global.DG_NO_DRAW && global.requestAnimationFrame && global.document) { edge.raf = global.requestAnimationFrame(edgeTick); }

  global.DG.windGuide = { on: on, dir: dir, stillness: stillness, draw2d: draw2d, beaconOn: beaconOn, edgeOf: edgeOf, _reset: function () { lastX = lastY = null; stillT = 0; lastNow = 0; } };
})(window);
