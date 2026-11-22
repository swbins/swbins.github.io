/**
 * 1만리 3D 근접 휘두르기 예고 (W-0671 ② — 표식 없이 휘두르는 적(f.windR)의 예고 원과 머리 위 「!」 는 2D juice2d.js 에만 있었다. 3D 는 f.mark 원(field-combat paintMarks)만)
 * world3d presentDraw 가 매 프레임 DG.world3dExtras 의 step(scene, camera) 를 부른다. 판정은 그대로 — fieldCombat.state().foes 에서 st === 'wind' 이고 mark 가 없는 적만:
 *   발밑 빨간 테(반지름 windR) + 안쪽이 휘두를 때까지 차오르는 판(prog = 1 − stT/windT, juice2d tellsOf 와 같은 식) + 머리 위 빨간 「!」(통통).
 * juice2d 는 2D 파일이라 ④ 에서 걷힌다 — 식은 여기 따로 둔다. 손잡이 go.tell3d(1, 0 = 옛 — 3D 에 근접 예고 없음)
 */
(function (global) {
  'use strict';
  var sceneOf = null, grp = null, pool = [], bangTex = null;

  function tuned(k, d) { var C = global.DG.core; return C && C.tuned ? +C.tuned(k, d) : d; }
  function T() { return global.THREE; }
  function bang() {
    if (bangTex) { return bangTex; }
    var c = global.document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d');
    g.font = '900 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#3a0000'; g.strokeText('!', 32, 34); g.fillStyle = '#ff5a4a'; g.fillText('!', 32, 34);
    bangTex = new (T().CanvasTexture)(c); return bangTex;
  }
  function make() {
    var rg = new (T().RingGeometry)(0.93, 1, 40); rg.rotateX(-Math.PI / 2);
    var cg = new (T().CircleGeometry)(1, 32); cg.rotateX(-Math.PI / 2);
    var e = {
      ring: new (T().Mesh)(rg, new (T().MeshBasicMaterial)({ color: 0xff463c, transparent: true, opacity: 0.95, depthWrite: false })),
      base: new (T().Mesh)(cg, new (T().MeshBasicMaterial)({ color: 0xff2828, transparent: true, opacity: 0.13, depthWrite: false })),
      fill: new (T().Mesh)(cg, new (T().MeshBasicMaterial)({ color: 0xff3c28, transparent: true, opacity: 0.3, depthWrite: false })),
      bang: new (T().Sprite)(new (T().SpriteMaterial)({ map: bang(), transparent: true, depthWrite: false, depthTest: false }))
    };
    e.bang.renderOrder = 14; grp.add(e.ring); grp.add(e.base); grp.add(e.fill); grp.add(e.bang);
    return e;
  }

  function step(scene) {
    var FC = global.DG.fieldCombat, W3 = global.DG.world3d, S = FC && FC.state ? FC.state() : null, i = 0, k;
    if (!T() || !W3 || !W3.groundY) { return; }
    if (sceneOf !== scene || !grp) { sceneOf = scene; grp = new (T().Group)(); scene.add(grp); pool = []; }
    if (S && S.foes && tuned('go.tell3d', 1)) {
      var now = Date.now(), FO = FC.FOES || {};
      for (k in S.foes) {
        if (!Object.prototype.hasOwnProperty.call(S.foes, k)) { continue; }
        var f = S.foes[k]; if (!f || f.dead || f.st !== 'wind' || f.mark || !f.windR) { continue; }
        var tot = f.windT, prog = tot > 0 ? Math.max(0, Math.min(1, 1 - Math.max(0, f.stT) / tot)) : 1, gy = W3.groundY(f.x, f.y) + 0.07, R = f.windR, e = pool[i] || (pool[i] = make());
        e.ring.visible = e.base.visible = e.bang.visible = true; e.fill.visible = prog > 0.02;
        e.ring.position.set(f.x, gy + 0.01, f.y); e.ring.scale.set(R, 1, R);
        e.base.position.set(f.x, gy, f.y); e.base.scale.set(R, 1, R);
        e.fill.position.set(f.x, gy + 0.005, f.y); e.fill.scale.set(R * prog, 1, R * prog); e.fill.material.opacity = 0.22 + 0.38 * prog;
        var hh = (FO[f.kind] && FO[f.kind].h) || 1, bs = 2.2 + Math.sin(now / 60) * 0.2;
        e.bang.position.set(f.x, gy + 2.6 * hh + 0.6, f.y); e.bang.scale.set(bs, bs, 1);
        i++;
      }
    }
    for (; i < pool.length; i++) { pool[i].ring.visible = pool[i].base.visible = pool[i].fill.visible = pool[i].bang.visible = false; }
  }

  global.DG = global.DG || {};
  global.DG.tell3d = { step: step, _n: function () { return pool.filter(function (e) { return e.ring.visible; }).length; } };
  (global.DG.world3dExtras = global.DG.world3dExtras || []).push(global.DG.tell3d);
})(typeof window !== 'undefined' ? window : globalThis);
