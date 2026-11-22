/**
 * 1만리 2D 손맛 (W-0660 · 재미 개편 ①)
 * ---------------------------------------------------------------
 * 2D 본판(폰)에는 들판 전투의 **예고 원·땅 고리·타격 멈춤·흔들림이 하나도 없었다** — 셋 다 3D(world3d) 에만 그렸다.
 * 그래서 적이 치기 전 0.45~1초 휘두르는데도 2D 에선 보이지 않아 피하기가 운이었다.
 *   예고    휘두르는 적(st 'wind') — 원 예고(f.mark: 내려치기·뱉기·고리·물결)는 그 자리, 근접은 적 둘레 닿는 거리.
 *           빨간 테두리 + 안이 차오른다(다 차면 맞는다) + 머리 위 「!」.
 *   고리    field-combat ring() 의 2D 몫(반응·내려침 자리 등) — 세계 좌표·반지름 그대로.
 *   멈춤    hold(ms) — 그동안 게임 시간이 1/10 로 흐른다(game.js loop).
 *   흔들림  shake(px) — 땅·물체 두 캔버스를 같이 옮긴다, 초당 1/50 로 잦아듦.
 * 손잡이 go.juice2d(1, 0 = 끔). 3D 가 켜져 있으면 아무것도 안 한다(3D 는 제 것을 쓴다). 세이브와 무관.
 */
(function (global) {
  'use strict';

  function tn(k, d) { var c = global.DG && global.DG.core; return c && c.tuned ? +c.tuned(k, d) : d; }
  function on() { var w = global.DG && global.DG.world3d; return !!tn('go.juice2d', 1) && !(w && w.active && w.active()); }
  function nowMs() { return global.performance && global.performance.now ? global.performance.now() : Date.now(); }

  var holdUntil = 0, amp = 0, ph = 0, lastT = 0, rings = [], els = null;

  function hold(ms) { if (on()) { holdUntil = Math.max(holdUntil, nowMs() + Math.min(200, ms || 0)); } }
  function held() { return nowMs() < holdUntil; }
  function shake(px) { if (on()) { amp = Math.min(14, Math.max(amp, px || 0)); } }
  function ring(x, y, r, color, life) {
    if (!on() || global.DG_NO_DRAW) { return; }
    rings.push({ x: x, y: y, r: r, c: color || '#fff', t0: nowMs(), life: (life || 0.4) * 1000 });
    if (rings.length > 40) { rings.shift(); }
  }

  /** 흔들림을 두 캔버스에 — 매 프레임 world.draw 가 부른다 */
  function applyShake(t) {
    if (!els) { els = [global.document && document.getElementById('map-ground'), global.document && document.getElementById('map')].filter(Boolean); }
    var dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0; lastT = t;
    var dx = 0, dy = 0;
    if (amp > 0.3) { ph += dt * 60; dx = Math.sin(ph) * amp; dy = Math.sin(ph * 1.7 + 1.1) * amp * 0.6; amp *= Math.pow(0.02, dt); } else { amp = 0; }
    var sh = amp ? 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' : '';
    /* W-0769 — 땅 캔버스(map-ground)엔 world.resize 가 건 눕히기(perspective·rotateX)가 있다. 예전엔 매 프레임 '' 로 덮어 그 기울기가
       지워져 땅은 평평·사물은 원근 공식(project)으로 그려져 걸을 때 건물·나무가 땅과 따로 미끄러졌다(사용자 11-14·11-22).
       내가 마지막에 쓴 값과 다르면 바깥(resize)이 바꾼 것 → 그 값을 바탕으로 기억하고, 흔들림은 그 앞(화면 쪽)에 붙인다 */
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.style.transform !== el._jzLast) { el._jzBase = el.style.transform || ''; }
      var tr = sh && el._jzBase ? sh + ' ' + el._jzBase : (sh || el._jzBase || '');
      if (el.style.transform !== tr) { el.style.transform = tr; }
      el._jzLast = el.style.transform;
    }
  }

  /** 세계 원(x,y,r) → 화면 타원 — project 가 기울기를 먹이므로 위아래 반지름은 따로 잰다 */
  function ell(pos, sc, project, x, y, r) {
    var u = (x - pos.x) * sc, v = (y - pos.y) * sc, p = project(u, v), q = project(u, v + r * sc), s = project(u + r * sc, v);
    return { x: p.x, y: p.y, rx: Math.max(2, Math.abs(s.x - p.x)), ry: Math.max(1.5, Math.abs(q.y - p.y)) };
  }

  /** 휘두르는 적 하나의 예고 칸들 — [{x,y,r,inner,prog}] (진단도 쓴다) */
  function tellsOf(f) {
    if (!f || f.dead || f.st !== 'wind') { return []; }
    var tot = f.mark ? f.mark.t : f.windT, prog = tot > 0 ? Math.max(0, Math.min(1, 1 - Math.max(0, f.stT) / tot)) : 1;
    if (f.mark) { return (f.mark.list || [f.mark]).map(function (m) { return { x: m.x, y: m.y, r: f.mark.r, inner: f.mark.inner || 0, prog: prog }; }); }
    return f.windR ? [{ x: f.x, y: f.y, r: f.windR, inner: 0, prog: prog }] : [];
  }

  /** 2D 그리기 — world.js drawObjects 끝에서 */
  function draw2d(ctx, pos, sc, project, t) {
    applyShake(t);
    if (!on() || !ctx) { return; }
    var now = nowMs(), FC = global.DG.fieldCombat, FS = FC && FC.state ? FC.state() : null, foes = [], i, j, e, k0;
    if (FS && FS.foes) { for (k0 in FS.foes) { if (FS.foes.hasOwnProperty(k0) && FS.foes[k0].st === 'wind') { foes.push(FS.foes[k0]); } } }   // live() 는 그림용 사본이라 st·stT 가 없다
    ctx.save();
    for (i = 0; i < foes.length; i++) {
      var T = tellsOf(foes[i]);
      for (j = 0; j < T.length; j++) {
        e = ell(pos, sc, project, T[j].x, T[j].y, T[j].r);
        ctx.beginPath(); ctx.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,40,40,0.13)'; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,70,60,0.95)'; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(e.x, e.y, e.rx * T[j].prog, e.ry * T[j].prog, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,60,40,' + (0.22 + 0.38 * T[j].prog).toFixed(2) + ')'; ctx.fill();
        if (T[j].inner) { var n = ell(pos, sc, project, T[j].x, T[j].y, T[j].inner); ctx.beginPath(); ctx.ellipse(n.x, n.y, n.rx, n.ry, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(40,200,120,0.25)'; ctx.fill(); }
      }
      if (T.length) {
        var hp = project((foes[i].x - pos.x) * sc, (foes[i].y - pos.y) * sc), big = 28 + 6 * Math.sin(now / 60);
        ctx.font = '900 ' + big.toFixed(0) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#3a0000'; ctx.fillStyle = '#ff5a4a';
        var hy = hp.y - 70 * Math.max(0.6, Math.min(1.6, hp.s)) * (FC.FOES && FC.FOES[foes[i].kind] ? FC.FOES[foes[i].kind].h : 1);
        ctx.strokeText('!', hp.x, hy); ctx.fillText('!', hp.x, hy);
      }
    }
    for (i = rings.length - 1; i >= 0; i--) {
      var R = rings[i], k = (now - R.t0) / R.life;
      if (k >= 1) { rings.splice(i, 1); continue; }
      e = ell(pos, sc, project, R.x, R.y, R.r * (0.35 + 0.65 * Math.min(1, k * 1.6)));
      ctx.globalAlpha = 1 - k; ctx.lineWidth = 3; ctx.strokeStyle = R.c;
      ctx.beginPath(); ctx.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  global.DG = global.DG || {};
  global.DG.juice2d = { on: on, hold: hold, held: held, shake: shake, ring: ring, draw2d: draw2d, tellsOf: tellsOf, _amp: function () { return amp; }, _rings: function () { return rings.length; }, _reset: function () { holdUntil = 0; amp = 0; rings.length = 0; els = null; lastT = 0; }, _applyShake: function (t, list) { if (list) { els = list; } applyShake(t); } };   // W-0769 진단 — 가짜 캔버스로 흔들림이 땅 기울기를 안 지우나
})(typeof window !== 'undefined' ? window : this);
