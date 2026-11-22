/**
 * 1만리 3D 들판 수수께끼·불길 (W-0671 ② — 2D world.js drawObjects 에만 그리던 것. 3D 에선 판정은 도는데 안 보였다)
 * world3d presentDraw 가 매 프레임 DG.world3dExtras 의 step(scene, camera) 를 부른다. 3D 좌표 = 저장 좌표 (x, y) → (x, groundY, y).
 *   수수께끼(field-riddle.js — 자료·판정 그대로): 외딴 돌(puzzle_stone_01, 연 돌은 _open 이 3초 흐려짐) · 꽃 고리(flower_ring_01 을 땅에 눕힌 판,
 *     밟은 꽃은 금빛 · 시들면 _wilt) · 바람개비(pinwheel_01_full, 위에 서 있으면 빨리 흔들림) — 자체 world2d 그림을 카메라 보는 판으로(3D 모델 없음)
 *   불길(field-env.js): 불 붙은 칸 전체(타는 판정 자리)에 낮은 주황 빛 + 사람 키쯤 불꽃 판 일곱(2D draw2d 그림을 구운 것), 꺼질 때 흐려짐 · go.fire3dH(3.2)
 * 손잡이 go.riddle3d(1, 0 = 옛 — 3D 에 안 보임) · go.fire3d(1)
 */
(function (global) {
  'use strict';
  var sceneOf = null, grp = null, tex = {}, items = {}, fires = [], fireTex = null, glowMat = null, ringMat = {};

  function tuned(k, d) { var C = global.DG.core; return C && C.tuned ? +C.tuned(k, d) : d; }
  function T() { return global.THREE; }
  function texOf(id) {
    if (tex[id] !== undefined) { return tex[id]; }
    var A = global.DG.assets3d, u = A && A.spriteUrl ? A.spriteUrl(id) : null;
    if (!u) { return null; }   // 아직 목록 시험 중이면 다음 프레임
    var t = new (T().TextureLoader)().load(u); if (T().SRGBColorSpace) { t.colorSpace = T().SRGBColorSpace; }
    tex[id] = t; return t;
  }
  function spr(id) {
    var t = texOf(id); if (!t) { return null; }
    var s = new (T().Sprite)(new (T().SpriteMaterial)({ map: t, transparent: true, depthWrite: false, alphaTest: 0.05 }));
    s.center.set(0.5, 0.04); grp.add(s); return s;
  }
  function flameTex() {
    if (fireTex) { return fireTex; }
    var c = global.document.createElement('canvas'); c.width = 128; c.height = 128;
    var FE = global.DG.fieldEnv; if (FE && FE.draw2d) { FE.draw2d(c.getContext('2d'), 64, 118, 110, { t: 0 }, 0); }
    fireTex = new (T().CanvasTexture)(c); if (T().SRGBColorSpace) { fireTex.colorSpace = T().SRGBColorSpace; }
    return fireTex;
  }
  function reset(scene) { sceneOf = scene; grp = new (T().Group)(); scene.add(grp); items = {}; fires = []; }
  function hideAll() { if (grp) { grp.visible = false; } }

  function step(scene) {
    var FR = global.DG.fieldRiddle, FE = global.DG.fieldEnv, W3 = global.DG.world3d, C = global.DG.core;
    if (!T() || !W3 || !W3.groundY || !C || !C.save || !C.save.player) { hideAll(); return; }
    if (sceneOf !== scene || !grp) { reset(scene); }
    grp.visible = true;
    var pos = C.save.player.pos, now = Date.now(), seen = {}, id, i;
    /* ── 수수께끼 ── */
    if (FR && tuned('go.riddle3d', 1)) {
      var KD = FR._kd ? FR._kd() : 1, st = FR._state ? FR._state() : {}, R = 140 * KD, RING_R = 4 * KD;
      FR.near(pos.x, pos.y).forEach(function (r) {
        if (Math.hypot(r.x - pos.x, r.y - pos.y) > R) { return; }
        var gy = W3.groundY(r.x, r.y), e = items[r.id];
        if (r.kind === 'ring') {
          var ring = st.ring && st.ring.id === r.id ? st.ring : null, key = ring && ring.t < 2 ? 'flower_ring_01_wilt' : 'flower_ring_01';
          if (!e) { e = items[r.id] = { flat: null, key: '', glows: [] }; }
          if (e.key !== key) {
            var tx = texOf(key); if (tx) {
              if (!ringMat[key]) { ringMat[key] = new (T().MeshBasicMaterial)({ map: tx, transparent: true, depthWrite: false, alphaTest: 0.05 }); }
              if (!e.flat) { var pg = new (T().PlaneGeometry)(1, 1); pg.rotateX(-Math.PI / 2); e.flat = new (T().Mesh)(pg, ringMat[key]); grp.add(e.flat); } else { e.flat.material = ringMat[key]; }
              e.key = key;
            }
          }
          if (e.flat) { var sz = RING_R * 2.9; e.flat.scale.set(sz, 1, sz); e.flat.position.set(r.x, gy + 0.04, r.y); e.flat.visible = true; }
          FR.flowers(r).forEach(function (q, qi) {   // 밟은 꽃 금빛
            var g = e.glows[qi]; if (!g) { if (!glowMat) { glowMat = new (T().MeshBasicMaterial)({ color: 0xffe27a, transparent: true, opacity: 0.75, depthWrite: false }); } var cg = new (T().CircleGeometry)(0.7, 16); cg.rotateX(-Math.PI / 2); g = e.glows[qi] = new (T().Mesh)(cg, glowMat); grp.add(g); }
            g.visible = !!(ring && qi < ring.n); g.position.set(q.x, W3.groundY(q.x, q.y) + 0.06, q.y);
          });
          seen[r.id] = 1; return;
        }
        var sid = r.kind === 'stone' ? 'puzzle_stone_01' : 'pinwheel_01_full', h = r.kind === 'stone' ? 2.2 : 3.0;
        if (!e) { var s0 = spr(sid); if (!s0) { return; } e = items[r.id] = { s: s0 }; }
        var wob = r.kind === 'pin' ? Math.sin(now / (st.pin && st.pin.id === r.id ? 40 : 300)) * 0.06 : 0;
        e.s.visible = true; e.s.scale.set(h, h, 1); e.s.position.set(r.x + wob, gy, r.y); e.s.material.opacity = 1;
        seen[r.id] = 1;
      });
      (FR._opened ? FR._opened() : []).forEach(function (o) {   // 연 돌 — 3초 흐려짐
        var k = 'open:' + o.id, a = FR.openLeft(o.id, now), e = items[k];
        if (!a) { return; }
        if (!e) { var s1 = spr('puzzle_stone_01_open'); if (!s1) { return; } e = items[k] = { s: s1 }; }
        e.s.visible = true; e.s.scale.set(2.2, 2.2, 1); e.s.position.set(o.x, W3.groundY(o.x, o.y), o.y); e.s.material.opacity = a; seen[k] = 1;
      });
    }
    for (id in items) {
      if (Object.prototype.hasOwnProperty.call(items, id) && !seen[id]) {
        var it = items[id]; if (it.s) { it.s.visible = false; } if (it.flat) { it.flat.visible = false; } (it.glows || []).forEach(function (g) { g.visible = false; });
      }
    }
    /* ── 불길 ── */
    var FL = FE && tuned('go.fire3d', 1) ? FE.fires() : [], CELL = (FE && FE.CELL) || 48, LIFE = (FE && FE.LIFE) || 3, NF = 7, j;
    for (i = 0; i < FL.length; i++) {
      var c = FL[i], f = fires[i], x = (c.tx + 0.5) * CELL, y = (c.ty + 0.5) * CELL, gy2 = W3.groundY(x, y), a2 = Math.max(0, Math.min(1, (LIFE - c.t) / 0.6));
      /* 3D 에선 한 칸(48)이 사람 수십 명 폭 — 칸 전체(타는 판정 자리)에 낮은 불빛 판 + 사람 키쯤 불꽃 NF 개를 흩어 */
      if (!f) {
        var dg = new (T().PlaneGeometry)(CELL * 0.96, CELL * 0.96); dg.rotateX(-Math.PI / 2);
        var disc = new (T().Mesh)(dg, new (T().MeshBasicMaterial)({ color: 0xff6a1f, transparent: true, opacity: 0.2, depthWrite: false }));
        grp.add(disc); f = fires[i] = { disc: disc, fl: [], jit: [] };
        for (var j0 = 0; j0 < NF; j0++) { var fl = new (T().Sprite)(new (T().SpriteMaterial)({ map: flameTex(), transparent: true, depthWrite: false })); fl.center.set(0.5, 0.06); grp.add(fl); f.fl.push(fl); f.jit.push([(((j0 * 37) % 11) / 10 - 0.5) * CELL * 0.8, (((j0 * 53) % 13) / 12 - 0.5) * CELL * 0.8]); }
      }
      f.disc.visible = true; f.disc.position.set(x, gy2 + 0.05, y); f.disc.material.opacity = 0.2 * a2;
      for (j = 0; j < NF; j++) {
        var fx = x + f.jit[j][0], fz = y + f.jit[j][1], fh = tuned('go.fire3dH', 3.2) * (1 + Math.sin(now / 120 + i * 1.7 + j) * 0.12);
        f.fl[j].visible = true; f.fl[j].position.set(fx, W3.groundY(fx, fz), fz); f.fl[j].scale.set(fh, fh, 1); f.fl[j].material.opacity = a2;
      }
    }
    for (i = FL.length; i < fires.length; i++) { fires[i].disc.visible = false; fires[i].fl.forEach(function (q) { q.visible = false; }); }
  }

  global.DG = global.DG || {};
  global.DG.riddle3d = { step: step, _state: function () { var n = 0, id; for (id in items) { if (items[id].s ? items[id].s.visible : items[id].flat && items[id].flat.visible) { n++; } } return { shown: n, fires: fires.filter(function (f) { return f.disc.visible; }).length }; } };
  (global.DG.world3dExtras = global.DG.world3dExtras || []).push(global.DG.riddle3d);
})(typeof window !== 'undefined' ? window : globalThis);
