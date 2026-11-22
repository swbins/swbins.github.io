/**
 * 1만리 2D 지도 — 지면 캔버스 한 장 그리기(drawGround: 폴백 땅·구역 격자·발자국·누른 자리·조우 고리). world.js 에서 떼어 냄(R-4 11-17). 몸통은 글자 그대로
 * (지면 캔버스·기하만 U.gctx()·U.gcv()·U.geom() — 다시 잡힐 수 있어 부를 때마다). world-sites2d.js 와 같은 make(U).
 * 바깥 것: U.player·footprints·clickMarks(같은 배열)·drawFallback·unproject·scale·REGION_SIZE·ENCOUNTER_RANGE·FOOT_LIFE·CLICK_MARK_LIFE.
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.worldGround2d = { make: function (U) {
  var core = global.DG.core, player = U.player, footprints = U.footprints, clickMarks = U.clickMarks, drawFallback = U.drawFallback, unproject = U.unproject,
    REGION_SIZE = U.REGION_SIZE, ENCOUNTER_RANGE = U.ENCOUNTER_RANGE, FOOT_LIFE = U.FOOT_LIFE, CLICK_MARK_LIFE = U.CLICK_MARK_LIFE;
  function scale() { return U.scale(); }

  function drawGround() {
    var g = U.geom(), sc = scale(), pos = core.save.player.pos;
    U.gctx().clearRect(0, 0, g.GW, g.GH);
    U.gctx().fillStyle = '#12141a';
    U.gctx().fillRect(0, 0, g.GW, g.GH);

    var camX = pos.x - g.ox / sc;      // 지면 좌상단이 가리키는 월드 좌표
    var camY = pos.y - g.oy / sc;

    drawFallback(U.gctx(), camX, camY, g.GW, g.GH, sc);   // W-0207 — OSM 타일 안 씀: 늘 들판(field2d)·절차 지형

    /* 구역 경계선 — 지도에 결을 주는 옅은 격자 (소유 개념은 없다) */
    var r0x = Math.floor(camX / REGION_SIZE), r1x = Math.ceil((camX + g.GW / sc) / REGION_SIZE);
    var r0y = Math.floor(camY / REGION_SIZE), r1y = Math.ceil((camY + g.GH / sc) / REGION_SIZE);
    for (var ry = r0y; ry <= r1y && !(global.DG.field2d && global.DG.field2d.on()); ry++) {   // 지도 격자는 지도일 때만
      for (var rx = r0x; rx <= r1x; rx++) {
        var bx = (rx * REGION_SIZE - camX) * sc, by = (ry * REGION_SIZE - camY) * sc;
        var bs = REGION_SIZE * sc;
        U.gctx().strokeStyle = 'rgba(255,255,255,0.05)';
        U.gctx().lineWidth = 1;
        U.gctx().strokeRect(bx, by, bs, bs);
      }
    }

    /* 발자국 */
    var fnow = Date.now();
    for (var f = 0; f < footprints.length; f++) {
      var fp = footprints[f];
      var life = 1 - (fnow - fp.at) / FOOT_LIFE;
      if (life <= 0) { continue; }
      var fx = (fp.x - camX) * sc, fy = (fp.y - camY) * sc;
      U.gctx().beginPath();
      U.gctx().ellipse(fx, fy, 4.4 * sc, 7 * sc, 0, 0, Math.PI * 2);
      U.gctx().fillStyle = 'rgba(150,220,255,' + (life * 0.5) + ')';
      U.gctx().fill();
      U.gctx().beginPath();
      U.gctx().ellipse(fx, fy, 4.4 * sc, 7 * sc, 0, 0, Math.PI * 2);
      U.gctx().strokeStyle = 'rgba(40,60,80,' + (life * 0.35) + ')';
      U.gctx().lineWidth = 1;
      U.gctx().stroke();
    }

    /* 클릭(탭)한 자리 — 커지며 옅어지는 고리 + 중심 점 */
    for (var m = 0; m < clickMarks.length; m++) {
      var cm = clickMarks[m];
      var clife = 1 - (fnow - cm.at) / CLICK_MARK_LIFE;
      if (clife <= 0) { continue; }
      var mx = (cm.x - camX) * sc, my = (cm.y - camY) * sc;
      var rad = (4 + (1 - clife) * 16) * sc;
      U.gctx().beginPath();
      U.gctx().arc(mx, my, rad, 0, Math.PI * 2);
      U.gctx().strokeStyle = 'rgba(255,214,80,' + (clife * 0.9) + ')';
      U.gctx().lineWidth = 2;
      U.gctx().stroke();
      U.gctx().beginPath();
      U.gctx().arc(mx, my, 2.5 * sc, 0, Math.PI * 2);
      U.gctx().fillStyle = 'rgba(255,214,80,' + clife + ')';
      U.gctx().fill();
    }

    /* 조우 반경 — 눕은 지면 위에 있으므로 자연스럽게 타원으로 보인다 */
    U.gctx().beginPath();
    U.gctx().arc(g.ox, g.oy, ENCOUNTER_RANGE * sc, 0, Math.PI * 2);
    U.gctx().fillStyle = 'rgba(90,200,255,0.09)';
    U.gctx().fill();
    U.gctx().strokeStyle = 'rgba(120,220,255,0.5)';
    U.gctx().lineWidth = 2;
    U.gctx().stroke(); if (global.DG.hd2d) { var hk = U.gcv().width / g.GW, hv = function (Y) { return g.tilt ? unproject(g.cx, Y).v : Y - g.cy; }, hw = function (v) { return g.tilt ? g.W / 2 * (g.persp - v * g.sin) / g.persp : g.W / 2; }, hs = function (va, vb, t, b) { var w = hw(va); global.DG.hd2d.apply(U.gctx(), U.gcv(), { vign: false, bloom: false, top: t, bot: b, rect: { x: (g.ox - w) * hk, y: (g.oy + va) * hk, w: 2 * w * hk, h: (vb - va) * hk } }); }, v0 = hv(0), v1 = hv(g.H * 0.22), v2 = hv(g.H * 0.88), v3 = hv(g.H); hs(v0, v1, 0.999, 0.9999); hs(v2, v3, 0.001, 0.001); }   /* W-0548 ① HD-2D 결 — 눕힌 땅 캔버스(화면 2배)에서 화면 위 22%·아래 12% 에 해당하는 띠 둘만(o.rect) 흐림, 번짐 끔(보이는 영역 통째는 4종횡 ×1.64 라 비용 넘음) */
  }

  return { drawGround: drawGround };
  } };
})(window);
