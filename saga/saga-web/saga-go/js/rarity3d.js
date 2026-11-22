/**
 * 1만리 3D 야생 대상 발밑 등급 고리 (W-0671 ② — 2D world.js drawSpawn 에만 있던 「등급 색 고리 + 만남 거리 안이면 흰 맥박 고리」. 3D 는 ★5 금테(actor3d aura)만)
 * world3d presentDraw 가 매 프레임 DG.world3dExtras 의 step(scene, camera) 를 부른다. 자료 = world.spawns 그대로({uid, x, y, ref.rarity}) · 색 = data.rarity[등급].color.
 * 고리 크기는 그 몸(world3d.actorNode('sp' + uid))의 키를 따른다(먼 몸은 world3d 가 키운다). 들판 겨루기 중인 대상은 뺀다(그땐 전투 몸이 선다).
 * 손잡이 go.rarity3d(1, 0 = 옛) · 만남 거리 46(world.js ENCOUNTER_RANGE 와 같음)
 */
(function (global) {
  'use strict';
  var sceneOf = null, grp = null, pool = [], NEAR = 46, geo = null;

  function tuned(k, d) { var C = global.DG.core; return C && C.tuned ? +C.tuned(k, d) : d; }
  function T() { return global.THREE; }
  function make() {
    if (!geo) { geo = new (T().RingGeometry)(0.84, 1, 40); geo.rotateX(-Math.PI / 2); }
    var a = new (T().Mesh)(geo, new (T().MeshBasicMaterial)({ transparent: true, opacity: 0.9, depthWrite: false })), b = new (T().Mesh)(geo, new (T().MeshBasicMaterial)({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }));
    grp.add(a); grp.add(b); return { ring: a, pulse: b };
  }

  function step(scene) {
    var W = global.DG.world, W3 = global.DG.world3d, C = global.DG.core, D = global.DG.data, i = 0, j;
    if (!T() || !W || !W3 || !W3.groundY || !C || !C.save) { return; }
    if (sceneOf !== scene || !grp) { sceneOf = scene; grp = new (T().Group)(); scene.add(grp); pool = []; }
    if (tuned('go.rarity3d', 1) && W.spawns && D && D.rarity) {
      var pos = C.save.player.pos, now = Date.now(), FC = global.DG.fieldCombat, duel = FC && FC.duelSpawn ? FC.duelSpawn() : null;
      for (j = 0; j < W.spawns.length; j++) {
        var s = W.spawns[j]; if (!s || !s.ref || (duel !== null && s.uid === duel)) { continue; }
        var dist = Math.hypot(s.x - pos.x, s.y - pos.y); if (dist > 160) { continue; }
        var rr = D.rarity[s.ref.rarity], node = W3.actorNode ? W3.actorNode('sp' + s.uid) : null, h = node ? node.scale.y : 2, R = Math.max(0.9, h * 0.42), gy = W3.groundY(s.x, s.y) + 0.06;
        var e = pool[i] || (pool[i] = make()), near = dist <= NEAR;
        e.ring.visible = true; e.ring.material.color.set((rr && rr.color) || '#9aa0a8'); e.ring.position.set(s.x, gy, s.y); e.ring.scale.set(R, 1, R); e.ring.material.opacity = near ? 1 : 0.8;
        e.pulse.visible = near; if (near) { var pk = 1.42 + Math.abs(Math.sin(now / 420)) * 0.1; e.pulse.position.set(s.x, gy + 0.01, s.y); e.pulse.scale.set(R * pk, 1, R * pk); e.pulse.material.opacity = 0.18 + Math.abs(Math.sin(now / 420)) * 0.22; }
        i++;
      }
    }
    for (; i < pool.length; i++) { pool[i].ring.visible = pool[i].pulse.visible = false; }
  }

  global.DG = global.DG || {};
  global.DG.rarity3d = { step: step, _n: function () { return pool.filter(function (e) { return e.ring.visible; }).length; } };
  (global.DG.world3dExtras = global.DG.world3dExtras || []).push(global.DG.rarity3d);
})(typeof window !== 'undefined' ? window : globalThis);
