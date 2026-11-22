/**
 * 1만리 3D 역참·성채 상태 (W-0671 ② — 2D world-sites2d.js 에만 있던 상태 표시. 3D 는 건물만 세웠다)
 * world3d presentDraw 가 매 프레임 DG.world3dExtras 의 step(scene, camera) 를 부른다. 자료·판정은 그대로 읽기만:
 *   역참(world.stationsNear · station.stateOf · rogue.rankAt): 발밑 고리(채워짐 금빛 · 적도 점거 핏빛 · 쉬는 중 잿빛) · 가까우면 맥박 ·
 *     꼭대기 🏮(채워짐) / 🏴(점거) · 이름(점거면 「이름 · 적도」)
 *   성채(world.fortsNear · fort.infoOf · raid.current): 발밑 고리(내 것 금빛 · 남의 것 세력 색) · 레이드면 ⚔️ 와 「등급 · 적장」, 아니면 「이름 · 내 것」
 * 꼭대기 높이 = world3d.actorNode('st'|'ft' + key) 의 자리·키(먼 건물은 world3d 가 키운다 — 그 값을 그대로). 손잡이 go.sites3d(1, 0 = 옛)
 */
(function (global) {
  'use strict';
  var sceneOf = null, grp = null, ents = {}, txTex = {}, NEAR = 46;

  function tuned(k, d) { var C = global.DG.core; return C && C.tuned ? +C.tuned(k, d) : d; }
  function T() { return global.THREE; }
  /** 글·그림 판 — 한 번 굽고 기억 */
  function tex(txt, col, big) {
    var k = txt + '|' + col + '|' + big; if (txTex[k]) { return txTex[k]; }
    var c = global.document.createElement('canvas'); c.width = big ? 128 : 384; c.height = big ? 128 : 64; var g = c.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (big) { g.font = '88px sans-serif'; g.fillText(txt, 64, 70); }
    else { g.font = '700 32px "Malgun Gothic", system-ui, sans-serif'; g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,.72)'; g.strokeText(txt, 192, 34); g.fillStyle = col; g.fillText(txt, 192, 34); }
    var t = new (T().CanvasTexture)(c); if (T().SRGBColorSpace) { t.colorSpace = T().SRGBColorSpace; } txTex[k] = t; return t;
  }
  function spr(order) { var s = new (T().Sprite)(new (T().SpriteMaterial)({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); s.renderOrder = order; grp.add(s); return s; }
  function ring() { var g = new (T().RingGeometry)(0.86, 1, 40); g.rotateX(-Math.PI / 2); var m = new (T().Mesh)(g, new (T().MeshBasicMaterial)({ transparent: true, depthWrite: false })); grp.add(m); return m; }
  function ent(id) { return ents[id] || (ents[id] = { ring: ring(), pulse: ring(), icon: spr(16), lab: spr(15), ik: '', lk: '' }); }
  function setTex(s, key, t) { if (s.userData.k !== key) { s.material.map = t; s.material.needsUpdate = true; s.userData.k = key; } }

  function put(id, x, y, node, o, now) {
    var W3 = global.DG.world3d, e = ent(id), gy = W3.groundY(x, y), top = node ? node.position.y + node.scale.y * 1.45 : gy + 6, hh = node ? node.scale.y : 6;
    var R = Math.max(4, hh * 0.55);
    e.ring.visible = true; e.ring.position.set(x, gy + 0.08, y); e.ring.scale.set(R, 1, R); e.ring.material.color.set(o.col); e.ring.material.opacity = o.dim ? 0.45 : 0.85;
    e.pulse.visible = !!o.near; if (o.near) { var pk = 1.35 + Math.abs(Math.sin(now / (o.fast ? 300 : 440))) * 0.12; e.pulse.position.set(x, gy + 0.09, y); e.pulse.scale.set(R * pk, 1, R * pk); e.pulse.material.color.set(o.col); e.pulse.material.opacity = 0.35; }
    e.icon.visible = !!o.icon; if (o.icon) { setTex(e.icon, o.icon, tex(o.icon, '', true)); var is = Math.max(3.4, hh * 0.42); e.icon.position.set(x, top + is * 0.55 + Math.sin(now / 480) * hh * 0.02, y); e.icon.scale.set(is, is, 1); }
    setTex(e.lab, o.text + o.tcol, tex(o.text, o.tcol, false)); var ls = Math.max(1.6, hh * 0.16); e.lab.visible = true; e.lab.position.set(x, gy - ls * 0.2, y); e.lab.scale.set(ls * 6, ls, 1);
    e.lab.center.set(0.5, 1);
  }

  function step(scene) {
    var W = global.DG.world, W3 = global.DG.world3d, C = global.DG.core;
    if (!T() || !W || !W3 || !W3.groundY || !C || !C.save || !tuned('go.sites3d', 1)) { if (grp) { grp.visible = false; } return; }
    if (sceneOf !== scene || !grp) { sceneOf = scene; grp = new (T().Group)(); scene.add(grp); ents = {}; }
    grp.visible = true;
    var pos = C.save.player.pos, now = Date.now(), seen = {}, i, id;
    var sts = W.stationsNear ? W.stationsNear() : [], STN = global.DG.station, RG = global.DG.rogue;
    for (i = 0; i < sts.length; i++) {
      var st = sts[i], held = RG && RG.rankAt ? RG.rankAt(st) : null, ready = !held && (STN ? STN.stateOf(st.key).ready : true), near = Math.hypot(st.x - pos.x, st.y - pos.y) <= NEAR;
      put('st' + st.key, st.x, st.y, W3.actorNode ? W3.actorNode('st' + st.key) : null, {
        col: held ? '#c0463c' : (ready ? '#e8c15a' : '#969ba5'), dim: !held && !ready, near: near && (ready || held), fast: !!held,
        icon: held ? '🏴' : (ready ? '🏮' : ''), text: held ? st.name + ' · ' + held.name : st.name,
        tcol: held ? '#f0a096' : (ready ? '#f0e1b4' : '#b9bcc4')
      }, now); seen['st' + st.key] = 1;
    }
    var fts = W.fortsNear ? W.fortsNear() : [], F = global.DG.fort, RD = global.DG.raid;
    for (i = 0; i < fts.length; i++) {
      var ft = fts[i], info = F && F.infoOf ? F.infoOf(ft) : null, mine = !!(info && info.mine), raid = RD && RD.current ? RD.current(ft) : null;
      var col = mine ? '#e8c15a' : (info && info.faction ? info.faction.color : '#8a8f9a');
      put('ft' + ft.key, ft.x, ft.y, W3.actorNode ? W3.actorNode('ft' + ft.key) : null, {
        col: raid ? '#ff9a5a' : col, near: Math.hypot(ft.x - pos.x, ft.y - pos.y) <= NEAR, fast: !!raid,
        icon: raid ? '⚔️' : (mine ? '🏯' : ''), text: raid ? raid.tier.name + ' · ' + raid.hero.name : ft.name + (mine ? ' · 내 것' : ''),
        tcol: raid ? '#ff9a5a' : (mine ? '#e8c15a' : '#e9e9e9')
      }, now); seen['ft' + ft.key] = 1;
    }
    for (id in ents) { if (Object.prototype.hasOwnProperty.call(ents, id) && !seen[id]) { var o = ents[id]; o.ring.visible = o.pulse.visible = o.icon.visible = o.lab.visible = false; } }
  }

  global.DG = global.DG || {};
  global.DG.sites3d = { step: step, _n: function () { var n = 0, id; for (id in ents) { if (ents[id].lab.visible) { n++; } } return n; } };
  (global.DG.world3dExtras = global.DG.world3dExtras || []).push(global.DG.sites3d);
})(typeof window !== 'undefined' ? window : globalThis);
