/**
 * 1만리 3D 「나」 표시 (W-0671 ② — 2D world.js drawPlayer 에만 있던 둘)
 *   · 「나」 화살표 — 처음 go.meArrowMs(10초) 동안 머리 위에서 통통 튀는 하늘색 ▼(사람 사이에서 나를 못 찾았다, W-0369). 끝 1.5초 옅어짐
 *   · GPS 오차 원 — GPS 걷기(world.mode 'geo')일 때 발밑에 오차(±m) 만큼 옅은 파란 원(2D 는 화면 150px 로 묶음 → 3D 는 go.me3dAccMax m)
 * world3d presentDraw 가 매 프레임 DG.world3dExtras 의 step(scene, camera) 를 부른다. 3D 좌표 = 세이브 (x, y) → (x, groundY, y), 단위 m.
 * 손잡이 go.me3d(1, 0 = 옛) · go.me3dAccMax(60)
 */
(function (global) {
  'use strict';
  var sceneOf = null, grp = null, arrow = null, acc = null, accEdge = null, t0 = 0, headOf = { node: null, h: 0 };

  function tuned(k, d) { var C = global.DG.core; return C && C.tuned ? +C.tuned(k, d) : d; }
  function T() { return global.THREE; }
  function arrowTex() {
    var c = global.document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d');
    g.beginPath(); g.moveTo(32, 56); g.lineTo(10, 14); g.lineTo(54, 14); g.closePath();
    g.fillStyle = '#7fd0ff'; g.fill(); g.lineWidth = 5; g.strokeStyle = 'rgba(10,25,40,0.85)'; g.stroke();
    var tx = new (T().CanvasTexture)(c); if (T().SRGBColorSpace) { tx.colorSpace = T().SRGBColorSpace; } return tx;
  }
  function build(scene) {
    var t = T(); sceneOf = scene; grp = new t.Group(); grp.name = 'me3d'; scene.add(grp);
    arrow = new t.Sprite(new t.SpriteMaterial({ map: arrowTex(), transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); arrow.renderOrder = 16; arrow.scale.set(0.9, 0.9, 1); grp.add(arrow);
    acc = new t.Mesh(new t.CircleGeometry(1, 48), new t.MeshBasicMaterial({ color: 0x4aa3f0, transparent: true, opacity: 0.14, depthWrite: false, toneMapped: false }));
    acc.rotation.x = -Math.PI / 2; acc.renderOrder = 3; grp.add(acc);
    accEdge = new t.Mesh(new t.RingGeometry(0.97, 1, 64), new t.MeshBasicMaterial({ color: 0x78c8ff, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false }));
    accEdge.rotation.x = -Math.PI / 2; accEdge.renderOrder = 3; grp.add(accEdge);
  }
  /** 머리 높이 — 내 몸 마디의 둘레 상자 꼭대기(몸이 바뀔 때만 다시 잼) */
  function headY(node, gy) {
    if (!node) { return gy + 2.2; }
    if (headOf.node !== node || !headOf.h) {
      var b = new (T().Box3)().setFromObject(node); headOf.node = node; headOf.h = isFinite(b.max.y) ? Math.max(1, Math.min(b.max.y - node.position.y, node.scale.y * 1.02)) : 2.2;   // 둘레 상자는 감춘 조각까지 잡아 머리보다 한 뼘 높다 — 몸 배율(키 1 정규화)로 묶음
    }
    return node.position.y + headOf.h;
  }

  function step(scene) {
    var W = global.DG.world, W3 = global.DG.world3d, C = global.DG.core;
    if (!T() || !W || !W3 || !W3.groundY || !C || !C.save || !tuned('go.me3d', 1)) { if (grp) { grp.visible = false; } return; }
    if (sceneOf !== scene || !grp) { build(scene); }
    grp.visible = true;
    var pos = C.save.player.pos, node = W3.actorNode ? W3.actorNode('me') : null, x = node ? node.position.x : pos.x, z = node ? node.position.z : pos.y, gy = W3.groundY(x, z), now = Date.now();
    if (!t0) { t0 = now; }
    var left = tuned('go.meArrowMs', 10000) - (now - t0);
    arrow.visible = left > 0;
    if (arrow.visible) { arrow.position.set(x, headY(node, gy) + 0.45 + Math.sin(now / 220) * 0.12, z); arrow.material.opacity = Math.min(1, left / 1500); }
    var a = W.mode === 'geo' ? W.accuracy : 0;
    acc.visible = accEdge.visible = !!(a > 0);
    if (acc.visible) { var r = Math.max(1, Math.min(a, tuned('go.me3dAccMax', 60))); acc.scale.set(r, r, 1); accEdge.scale.set(r, r, 1); acc.position.set(x, gy + 0.06, z); accEdge.position.set(x, gy + 0.07, z); }
  }

  global.DG = global.DG || {};
  global.DG.me3d = { step: step, _state: function () { return { arrow: !!(arrow && arrow.visible), acc: !!(acc && acc.visible), r: acc ? acc.scale.x : 0, h: headOf.h, ay: arrow ? +arrow.position.y.toFixed(2) : 0, ny: headOf.node ? +headOf.node.position.y.toFixed(2) : 0, sc: headOf.node ? +headOf.node.scale.y.toFixed(2) : 0 }; }, _reset: function () { t0 = 0; } };
  (global.DG.world3dExtras = global.DG.world3dExtras || []).push(global.DG.me3d);
})(typeof window !== 'undefined' ? window : globalThis);
