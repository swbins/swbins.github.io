/**
 * 1만리 2D 지도 — 이름표 글자(그림자 + 글자를 작은 캔버스에 한 번 그려 두고 붙이기 · 글자 폭 기억)와 label(). world.js 에서 떼어 냄(R-4 11-17). 몸통은 글자 그대로.
 * 바깥 것 없음(core·global 뿐) — 상태(글자 캔버스 표)도 여기 산다. world.js 는 같은 이름 한 줄 넘김(label·txtWidth·txtDraw).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  /* W-0389 ③-4 — 이름표 글자(그림자 + 글자, 프레임당 50여 번 fillText·글꼴 지정)를 작은 캔버스에 한 번 그려 두고 붙인다(캔버스 배율로 굽기).
     글자 폭(measureText)도 기억 · 손잡이 world.labelCache 0 = 옛 길 */
  var txtC = {}, txtN = 0, txtWs = {}, txtWN = 0, txtM = null;
  function txtFont(px) { return '600 ' + px + 'px system-ui, sans-serif'; }
  function txtOn() { return !!+core.tuned('world.labelCache', 1) && typeof document !== 'undefined'; }
  function txtWidth(t, px) {
    var k = t + '\u0001' + px, w = txtWs[k];
    if (w === undefined) { if (!txtM) { txtM = document.createElement('canvas').getContext('2d'); } if (txtWN > 800) { txtWs = {}; txtWN = 0; } txtM.font = txtFont(px); w = txtWs[k] = txtM.measureText(t).width; txtWN++; }
    return w;
  }
  function txtDraw(c, t, px, fill, shade, x, y, align, plate) {
    if (!txtOn()) { c.textAlign = align || 'left'; c.font = txtFont(px); c.fillStyle = shade; c.fillText(t, x + 1, y + 1); c.fillStyle = fill; c.fillText(t, x, y); c.textAlign = 'left'; return; }
    var tf = c.getTransform ? c.getTransform() : null, kk = tf && tf.a > 0 ? tf.a : 1, key = t + '\u0001' + px + '\u0001' + fill + '\u0001' + shade + '\u0001' + kk + (plate ? '\u0001p' : ''), e = txtC[key];
    if (!e) {
      if (txtN > 600) { txtC = {}; txtN = 0; }
      var cv = document.createElement('canvas'), g = cv.getContext('2d'), m, asc, dsc, w, h;
      g.font = txtFont(px); m = g.measureText(t);
      asc = Math.ceil(m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent : px * 0.95) + 1; dsc = Math.ceil(m.actualBoundingBoxDescent > 0 ? m.actualBoundingBoxDescent : px * 0.3) + 3; w = Math.ceil(m.width) + 4 + (plate ? 8 : 0); h = asc + dsc;
      cv.width = Math.max(1, Math.ceil(w * kk)); cv.height = Math.max(1, Math.ceil(h * kk));
      g = cv.getContext('2d'); g.scale(kk, kk); g.font = txtFont(px);
      var pd = plate ? 4 : 0; if (plate) { g.fillStyle = 'rgba(12,14,20,0.42)'; g.beginPath(); if (g.roundRect) { g.roundRect(0, 0, w, h, h / 2); } else { g.rect(0, 0, w, h); } g.fill(); }   /* W-0565 이름표 바탕판 — 인물·돌바닥 위에서도 읽히게 */
      g.fillStyle = shade; g.fillText(t, 2 + pd, asc + 1); g.fillStyle = fill; g.fillText(t, 1 + pd, asc);  e = txtC[key] = { cv: cv, w: w, h: h, asc: asc, tw: m.width, pd: pd }; txtN++;
    }
    c.drawImage(e.cv, x - (e.pd || 0) - (align === 'center' ? 1 + e.tw / 2 : align === 'right' ? 1 + e.tw : 1), y - e.asc, e.w, e.h); return e;
  }
  function label(ctx, text, x, y, color, align, z) {
    z = core.clamp(z || 1, 0.6, 1.3);
    if (txtOn()) { txtDraw(ctx, text, Math.round(12 * z), color, 'rgba(0,0,0,0.6)', x, y, align || 'left'); return; }
    ctx.textAlign = align || 'left';
    ctx.font = '600 ' + Math.round(12 * z) + 'px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  global.DG = global.DG || {};
  global.DG.worldText2d = { label: label, txtWidth: txtWidth, txtDraw: txtDraw };
})(window);
