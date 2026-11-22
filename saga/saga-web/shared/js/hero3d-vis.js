/**
 * 3D 주인공 잘 보이게(W-0675) — 사용자 11-14 폰 세로 「3D 주인공이 배경에 묻힘」. 공용(tools/sync-shared.mjs 가 판에 복사).
 * 큰 3D 파일(world3d·dungeon3d·village-view3d)은 줄 상한이라 여기 두고 거기선 한 줄(`apply(a, frame)`)만 부른다.
 *
 *   apply(a, frame)  a = { node: 내 몸 Object3D, shadow?: 발밑 그림자 원(누운 메시) } — 판이 들고 있는 같은 객체를 매번 넘긴다
 *                    (여기서 a.hv* 칸에 상태를 적는다). 매 프레임 불러도 되고, 몸 맞추기는 30프레임마다.
 *
 * ① 건물·나무가 카메라와 나 사이를 막으면 그 자리에 하늘색 실루엣 — 가린 것보다 **깊은 곳만** 그린다(GreaterDepth).
 *    순서: 주변(0) → 실루엣(1) → 외곽선(2) → 내 몸(3). 실루엣은 내 몸보다 먼저라 내 몸끼리(팔이 몸통 앞)는 안 비친다.
 *    몸(GLB)이 늦게 바뀌어도 0.5초마다 다시 맞춘다 — 원본이 빠지면 실루엣도 치우고, 숨으면 같이 숨는다.
 * ② 2D 처럼 발밑 하늘색 고리 — 그림자 원이 있으면 거기(1만리), 없으면 몸 키 × 0.32 반지름으로 몸 발밑에 눕힌다(2나락·3마을).
 *    몸이 통째로 바뀌면(a.node 가 다른 객체) 고리·키를 다시 잰다.
 * 손잡이: world3d.heroXray(1 켬)·world3d.heroRing(1 켬) — 다섯 판 같은 이름.
 */
(function (global) {
  'use strict';
  var xrayMat = null, ringMat = null;
  function core() { return global.DG && global.DG.core; }
  function on(key) { var C = core(); return C && C.tuned ? !!C.tuned(key, 1) : true; }

  function dropRing(a) { if (a.hvRing && a.hvRing.parent) { a.hvRing.parent.remove(a.hvRing); } if (a.hvRing && a.hvRing.geometry) { a.hvRing.geometry.dispose(); } a.hvRing = null; }

  /** 눕힌 고리 — 몸(GLB)이 임시 도형 뒤에 늦게 서면 키가 바뀐다. 지은 때 키와 20% 넘게 다르면 다시 */
  function heightOf(a, T) { var b = new T.Box3(), sz = new T.Vector3(); a.node.traverse(function (o) { if (o.isMesh && o.visible && !(o.userData && (o.userData._hvSkip || o.userData._xrayOf))) { b.expandByObject(o); } }); return b.isEmpty() ? 0 : b.getSize(sz).y; }
  function grew(a, T) { var h = heightOf(a, T); return h > 0 && a.hvH > 0 && Math.abs(h - a.hvH) > a.hvH * 0.2; }
  function ring(a, T) {
    if (!on('world3d.heroRing')) { if (a.hvRing) { dropRing(a); } return; }
    var host = a.shadow || a.node;
    if (a.hvRing && a.hvRing.parent === host && (a.shadow || !grew(a, T))) { return; }
    if (a.hvRing) { dropRing(a); }
    if (!ringMat) { ringMat = new T.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.6, depthWrite: false, side: T.DoubleSide }); }
    var rg;
    if (a.shadow) {                                   // 그림자 원(반지름 1, 이미 누움) 테두리에
      rg = new T.Mesh(new T.RingGeometry(0.9, 1.02, 48), ringMat);
      rg.position.z = 0.002;
    } else {                                          // 몸 키로 반지름 — 몸이 아직 안 섰으면(키 0) 다음에
      var box = new T.Box3(), sz = new T.Vector3(), ws = new T.Vector3();
      a.node.traverse(function (o) { if (o.isMesh && o.visible && !(o.userData && (o.userData._hvSkip || o.userData._xrayOf))) { box.expandByObject(o); } });
      if (box.isEmpty()) { return; }
      box.getSize(sz); a.node.getWorldScale(ws); a.hvH = sz.y;
      if (!(sz.y > 0) || !isFinite(sz.y) || !(ws.x > 0)) { return; }
      var r = sz.y * 0.32 / ws.x;
      rg = new T.Mesh(new T.RingGeometry(r * 0.88, r, 48), ringMat);
      rg.rotation.x = -Math.PI / 2;
      rg.position.y = (box.min.y - a.node.getWorldPosition(new T.Vector3()).y) / ws.y + 0.02 * r;
    }
    rg.name = 'hero_ring'; rg.renderOrder = 3; rg.userData._hvSkip = true;
    host.add(rg);
    a.hvRing = rg;
  }

  function xray(a, T) {
    if (!xrayMat) { xrayMat = new T.MeshBasicMaterial({ color: 0x5fc4f0, depthWrite: false, depthFunc: T.GreaterDepth, fog: false }); }
    var todo = [], gone = [], i;
    a.node.traverse(function (o) {
      if (!o.isMesh || !o.userData || o.userData._hvSkip) { return; }
      if (o.userData._xrayOf) {
        var src = o.userData._xrayOf;
        if (src.parent !== o.parent) { gone.push(o); } else { o.visible = src.visible; }
        return;
      }
      if (!o.userData._xray) { todo.push(o); }
    });
    for (i = 0; i < gone.length; i++) { gone[i].parent.remove(gone[i]); }
    for (i = 0; i < todo.length; i++) {
      var o = todo[i], isOl = /_outline$/.test(o.name || '');
      o.renderOrder = isOl ? 2 : 3;
      if (isOl || !o.parent || !o.visible) { continue; }
      var x = o.isSkinnedMesh ? new T.SkinnedMesh(o.geometry, xrayMat) : new T.Mesh(o.geometry, xrayMat);
      if (o.isSkinnedMesh) { x.bind(o.skeleton, o.bindMatrix); }
      x.position.copy(o.position); x.rotation.copy(o.rotation); x.scale.copy(o.scale);
      x.castShadow = false; x.receiveShadow = false; x.renderOrder = 1; x.frustumCulled = o.frustumCulled;
      x.name = (o.name || 'mesh') + '_xray';
      x.userData._xrayOf = o; o.userData._xray = x;
      o.parent.add(x);
    }
  }

  function apply(a, frame) {
    var T = global.THREE;
    if (!T || !a || !a.node) { return; }
    if (a.hvNode !== a.node) { a.hvNode = a.node; a.hvAt = 0; if (a.hvRing && !a.shadow) { dropRing(a); } }
    if (a.hvAt && frame - a.hvAt < 30) { return; }
    a.hvAt = frame || 1;
    ring(a, T);
    if (on('world3d.heroXray')) { xray(a, T); }
  }

  global.DG = global.DG || {};
  global.DG.heroVis3d = { apply: apply };
})(typeof window !== 'undefined' ? window : this);
