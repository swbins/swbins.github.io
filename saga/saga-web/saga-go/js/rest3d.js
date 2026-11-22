/**
 * 1만리 3D 쉼터 (W-0671 ② — rest-site.js 머리말 「3D 표시는 없음」. 2D world.js 에만 모닥불과 「쉼터 / 쉼터 ✦」 글이 있었다 — 3D 에선 미니맵에만)
 * world3d presentDraw 가 매 프레임 DG.world3dExtras 의 step(scene, camera) 를 부른다. 자료 = restSite.sitesNear(내 자리, 700) 그대로({id, x, y, lit, at}).
 * 몸 = 모닥불(asset3d 키 cook:fire — 요리와 같은 자체/빌린 모닥불 표) · 불 지핀(lit) 쉼터는 따뜻한 빛 판이 일렁이고, 안 지핀 곳은 빛 없이 ·
 * 머리 위 글 「쉼터」(부활 자리면 「쉼터 ✦」, 지핀 곳 금빛·아닌 곳 잿빛) — 구운 글자 판. 손잡이 go.rest3d(1, 0 = 옛) · go.rest3dH(1.6)
 */
(function (global) {
  'use strict';
  var sceneOf = null, grp = null, sites = {}, glowTex = null, labTex = {};

  function tuned(k, d) { var C = global.DG.core; return C && C.tuned ? +C.tuned(k, d) : d; }
  function T() { return global.THREE; }
  function glow() {
    if (glowTex) { return glowTex; }
    var c = global.document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,200,110,0.9)'); r.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    glowTex = new (T().CanvasTexture)(c); return glowTex;
  }
  function label(txt, lit) {
    var k = txt + lit; if (labTex[k]) { return labTex[k]; }
    var c = global.document.createElement('canvas'); c.width = 256; c.height = 64; var g = c.getContext('2d');
    g.font = '700 34px "Malgun Gothic", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,.75)';
    g.strokeText(txt, 128, 34); g.fillStyle = lit ? '#ffcf7a' : '#c9c1b2'; g.fillText(txt, 128, 34);
    labTex[k] = new (T().CanvasTexture)(c); if (T().SRGBColorSpace) { labTex[k].colorSpace = T().SRGBColorSpace; } return labTex[k];
  }
  function make(s) {
    var A = global.DG.asset3d, H = tuned('go.rest3dH', 1.6), e = { node: null, glow: null, lab: null, key: '' };
    e.node = A && A.build ? A.build('cook:fire', { id: 'rest:' + s.id }, function () { var m = new (T().Mesh)(new (T().ConeGeometry)(0.5, 0.6, 7), new (T().MeshStandardMaterial)({ color: 0x6b4a2b })); m.position.y = 0.3; return m; }) : null;
    if (e.node) { e.node.scale.set(H, H, H); grp.add(e.node); }
    e.glow = new (T().Sprite)(new (T().SpriteMaterial)({ map: glow(), transparent: true, depthWrite: false, blending: T().AdditiveBlending })); grp.add(e.glow);
    e.lab = new (T().Sprite)(new (T().SpriteMaterial)({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); e.lab.renderOrder = 15; grp.add(e.lab);
    return e;
  }

  function step(scene) {
    var RS = global.DG.restSite, W3 = global.DG.world3d, C = global.DG.core;
    if (!T() || !RS || !W3 || !W3.groundY || !C || !C.save || !tuned('go.rest3d', 1)) { if (grp) { grp.visible = false; } return; }
    if (sceneOf !== scene || !grp) { sceneOf = scene; grp = new (T().Group)(); scene.add(grp); sites = {}; }
    grp.visible = true;
    var pos = C.save.player.pos, L = RS.sitesNear(pos.x, pos.y, 700), seen = {}, now = Date.now(), i, id;
    for (i = 0; i < L.length; i++) {
      var s = L[i], e = sites[s.id] || (sites[s.id] = make(s)), gy = W3.groundY(s.x, s.y), txt = s.at ? '쉼터 ✦' : '쉼터', key = txt + s.lit;
      seen[s.id] = 1;
      if (e.node) { e.node.visible = true; e.node.position.set(s.x, gy, s.y); }
      e.glow.visible = !!s.lit; if (s.lit) { var gs = 3.4 * (1 + Math.sin(now / 140) * 0.06 + Math.sin(now / 61) * 0.04); e.glow.position.set(s.x, gy + 0.9, s.y); e.glow.scale.set(gs, gs, 1); }
      if (e.key !== key) { e.lab.material.map = label(txt, s.lit); e.lab.material.needsUpdate = true; e.key = key; }
      e.lab.visible = true; e.lab.position.set(s.x, gy + 3.1, s.y); e.lab.scale.set(3.6, 0.9, 1);
    }
    for (id in sites) { if (Object.prototype.hasOwnProperty.call(sites, id) && !seen[id]) { var o = sites[id]; if (o.node) { o.node.visible = false; } o.glow.visible = false; o.lab.visible = false; } }
  }

  global.DG = global.DG || {};
  global.DG.rest3d = { step: step, _n: function () { var n = 0, id; for (id in sites) { if (sites[id].lab.visible) { n++; } } return n; } };
  (global.DG.world3dExtras = global.DG.world3dExtras || []).push(global.DG.rest3d);
})(typeof window !== 'undefined' ? window : globalThis);
