/**
 * 2D 화면 마감층 HD-2D 결 (W-0545 · 옥토패스 HD-2D 의 화면 결만 — 그림은 그대로, 코드로 얹는다)
 * ---------------------------------------------------------------
 * 정본은 saga-web/shared/js/hd2d.js — 판별 사본은 tools/sync-shared.mjs 가 만든다(지금은 4종횡만).
 * 판이 월드 그리기를 끝낸 직후(HUD 앞) apply(ctx, canvas, { tod }) 를 한 번 부른다. 캔버스 픽셀 전체(setTransform 1)에 건다.
 *   ① 피사계 흐림  위 띠(0~TOP)·아래 띠(BOT~1)를 흐린 사본으로 덮는다 — 가운데(싸우는 줄)는 또렷
 *   ② 빛 번짐      흐린 사본을 제 곱 두 번(x⁴ — 밝은 곳만 남음)한 것을 lighter 로 옅게 더한다(brightness·contrast 자르기는 밝은 배경 전체를 들어 올려 뺌)
 *   ③ 비네트       가장자리 어둡게 — 시간대(tod: dawn·day|noon·even|sunset·night)마다 진하기, W·H·tod 가 바뀔 때만 다시 그림
 *   ①② 는 지금 화면을 1/DIV 로 한 번 줄여 읽어 온 작은 캔버스를 함께 쓴다.
 * W-0546 ㉠ 한 장 합성(손잡이 hd2d.one 1, 0 = 옛 합성 셋) — 번짐 진하기 hd2d.bloomA1(0.55, 밝기→알파 덮기). o.div 를 넘기면 손잡이보다 먼저 · o.top·o.bot = 흐린 띠 끝(판마다 — 2나락 0.14, 안쪽 벽 앞 적이 안 흐리게) · o.bloomA = 번짐 진하기(손잡이보다 먼저) · o.vign false = 비네트 안 그림(W-0547 3마을 — cozy2d 가 이미 그림).
 * W-0548 o.rect = {x,y,w,h}(캔버스 화소) — 그 영역만 줄여 읽고 그 자리에만 덮는다(띠 top·bot 도 그 영역 높이 기준). 화면보다 큰 캔버스(1만리 눕힌 땅)에서 보이는 곳만. 한 장 합성 길만 · o.bloom false = 번짐 안 함.
 * 손잡이 hd2d.on·dof·bloom·vign(1, 0 = 끔) · hd2d.div(6 — 4 는 PC 헤드리스 3.0ms/프레임) · hd2d.bloomA(0.22)
 * 폰(deviceMode.phone)은 ③만 — 읽어 오기·filter 비용(W-0540 폰 튐). hd2d.phone(0, 1 = 폰도 다). ctx.filter 가 없으면 ③만.
 */
(function (global) {
  'use strict';

  var TOP = 0.22, BOT = 0.88;
  var VIGN = { dawn: 0.14, day: 0.10, noon: 0.10, even: 0.18, sunset: 0.18, night: 0.26, dungeon: 0.06 };   // 2나락 dungeon — 어둠 층(drawLights)이 이미 있어 옅게   // 4종횡 sideBg2d 는 noon·sunset, 3마을 cozy2d 는 day·even
  var small = null, sctx = null, work = null, wctx = null, comp = null, cctx = null, vC = null, vKey = '', l2aOk = null;
  function band(c, h, top, bot) { var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(top || TOP, 'rgba(0,0,0,0)'); g.addColorStop(bot || BOT, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); return g; }
  /** 밝기 → 알파 SVG 거르개를 문서에 한 번 둔다(못 두면 번짐 없음) — 색은 흰 쪽으로 들어(0.3x+0.7) 덮어도 안 어두워진다(흰 screen 에 가깝다) */
  function l2a() {
    if (l2aOk !== null) { return l2aOk; }
    l2aOk = false;
    try {
      var NS = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NS, 'svg'), f = document.createElementNS(NS, 'filter'), m = document.createElementNS(NS, 'feColorMatrix');
      sv.setAttribute('width', '0'); sv.setAttribute('height', '0'); sv.setAttribute('aria-hidden', 'true'); sv.style.position = 'absolute'; sv.style.pointerEvents = 'none';
      f.setAttribute('id', 'hd2d-l2a'); f.setAttribute('color-interpolation-filters', 'sRGB');
      m.setAttribute('type', 'matrix'); m.setAttribute('values', '0.3 0 0 0 0.7  0 0.3 0 0 0.7  0 0 0.3 0 0.7  0.3 0.59 0.11 0 0');
      f.appendChild(m); sv.appendChild(f); (document.body || document.documentElement).appendChild(sv);
      l2aOk = true;
    } catch (e) { l2aOk = false; }
    return l2aOk;
  }

  function T(k, d) { var c = global.DG && global.DG.core; var v = c && c.tuned ? c.tuned('hd2d.' + k, d) : d; return v === undefined || v === null ? d : +v; }
  function phone() { var DM = global.DG && global.DG.deviceMode; return !!(DM && DM.phone && DM.phone()); }
  function mk(c, w, h) {
    c = c || document.createElement('canvas');
    if (c.width !== w) { c.width = w; }
    if (c.height !== h) { c.height = h; }
    return c;
  }

  function vignette(W, H, tod) {
    var a = VIGN[tod] || VIGN.day, w = Math.max(1, Math.round(W / 2)), h = Math.max(1, Math.round(H / 2)), k = w + 'x' + h + '|' + a;
    if (vC && vKey === k) { return vC; }
    vC = mk(vC, w, h);
    var c = vC.getContext('2d'), g = c.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.38, w / 2, h * 0.5, Math.max(w, h) * 0.74);
    c.clearRect(0, 0, w, h);
    g.addColorStop(0, 'rgba(20,14,30,0)'); g.addColorStop(1, 'rgba(20,14,30,' + a + ')');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    vKey = k;
    return vC;
  }

  /** 마감층을 건다 — 무엇이라도 그렸으면 true */
  function apply(ctx, canvas, o) {
    o = o || {};
    var last = { dof: false, bloom: false, vign: false };
    api._last = last;
    if (!ctx || !canvas || typeof document === 'undefined' || !T('on', 1)) { return false; }
    var W = canvas.width, H = canvas.height;
    if (!W || !H) { return false; }
    var ph = api._phone !== null ? api._phone : phone(), full = !ph || !!T('phone', 0), hasF = 'filter' in ctx;
    var dof = full && hasF && !!T('dof', 1), bloom = full && hasF && !!T('bloom', 1) && o.bloom !== false, vign = !!T('vign', 1) && o.vign !== false;
    if (!dof && !bloom && !vign) { return false; }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (hasF) { ctx.filter = 'none'; }
    if ((dof || bloom) && T('one', 1)) {
      /* W-0546 ㉠ 한 장 합성 — 화면 전체 합성이 한 번에 ≈2ms 라 셋을 작은 comp 에 모아 원래 캔버스엔 한 번만 그린다.
         번짐은 lighter 를 못 쓰므로(투명 위 덧그리기) 밝기 → 알파(SVG feColorMatrix)로 밝은 곳만 덮는다 — screen 섞기에 가깝다 */
      var rc = o.rect, rx = rc ? Math.max(0, Math.floor(rc.x)) : 0, ry = rc ? Math.max(0, Math.floor(rc.y)) : 0;
      var rw = rc ? Math.max(1, Math.min(W - rx, Math.ceil(rc.w))) : W, rh = rc ? Math.max(1, Math.min(H - ry, Math.ceil(rc.h))) : H;   // W-0548 보이는 영역만
      var dv = Math.max(2, +o.div || T('div', 6)), cw = Math.max(1, Math.round(rw / dv)), ch = Math.max(1, Math.round(rh / dv));
      small = mk(small, cw, ch); sctx = small.getContext('2d');
      work = mk(work, cw, ch); wctx = work.getContext('2d');
      comp = mk(comp, cw, ch); cctx = comp.getContext('2d');
      sctx.clearRect(0, 0, cw, ch); sctx.drawImage(canvas, rx, ry, rw, rh, 0, 0, cw, ch);
      cctx.globalCompositeOperation = 'source-over'; cctx.globalAlpha = 1; cctx.clearRect(0, 0, cw, ch);
      if (dof) {
        cctx.filter = 'blur(2px)'; cctx.drawImage(small, 0, 0); cctx.filter = 'none';
        cctx.globalCompositeOperation = 'destination-in'; cctx.fillStyle = band(cctx, ch, +o.top, +o.bot); cctx.fillRect(0, 0, cw, ch);
        cctx.globalCompositeOperation = 'source-over';
        last.dof = true;
      }
      if (bloom && l2a()) {
        wctx.globalCompositeOperation = 'source-over'; wctx.clearRect(0, 0, cw, ch);
        wctx.filter = 'blur(3px)'; wctx.drawImage(small, 0, 0); wctx.filter = 'none';
        wctx.globalCompositeOperation = 'multiply'; wctx.drawImage(work, 0, 0); wctx.drawImage(work, 0, 0); wctx.globalCompositeOperation = 'source-over';   // x⁴ — 밝은 곳만
        cctx.filter = 'url(#hd2d-l2a)'; cctx.globalAlpha = Math.max(0, Math.min(1, (o.bloomA > 0 ? +o.bloomA : T('bloomA1', 0.55))));
        cctx.drawImage(work, 0, 0); cctx.filter = 'none'; cctx.globalAlpha = 1;
        last.bloom = true;
      }
      if (vign) { cctx.drawImage(vignette(rw, rh, o.tod), 0, 0, cw, ch); last.vign = true; }
      ctx.drawImage(comp, 0, 0, cw, ch, rx, ry, rw, rh);
      last.rect = rc ? [rx, ry, rw, rh] : null;
      ctx.restore();
      return true;
    }
    if (dof || bloom) {   // 옛 길(hd2d.one 0) — 합성 셋
      var div = Math.max(2, T('div', 6)), sw = Math.max(1, Math.round(W / div)), sh = Math.max(1, Math.round(H / div));
      small = mk(small, sw, sh); sctx = small.getContext('2d');
      work = mk(work, sw, sh); wctx = work.getContext('2d');
      sctx.clearRect(0, 0, sw, sh); sctx.drawImage(canvas, 0, 0, sw, sh);
      if (dof) {
        wctx.globalCompositeOperation = 'source-over'; wctx.clearRect(0, 0, sw, sh);
        wctx.filter = 'blur(2px)'; wctx.drawImage(small, 0, 0); wctx.filter = 'none';
        var g = wctx.createLinearGradient(0, 0, 0, sh);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(TOP, 'rgba(0,0,0,0)'); g.addColorStop(BOT, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
        wctx.globalCompositeOperation = 'destination-in'; wctx.fillStyle = g; wctx.fillRect(0, 0, sw, sh);
        wctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(work, 0, 0, W, H);
        last.dof = true;
      }
      if (bloom) {
        wctx.clearRect(0, 0, sw, sh);
        wctx.filter = 'blur(3px)'; wctx.drawImage(small, 0, 0); wctx.filter = 'none';
        wctx.globalCompositeOperation = 'multiply'; wctx.drawImage(work, 0, 0); wctx.drawImage(work, 0, 0); wctx.globalCompositeOperation = 'source-over';   // 제 곱 두 번 = x⁴ — 0.5→0.06·0.9→0.66, 밝은 곳만 남는다
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, Math.min(1, T('bloomA', 0.22)));
        ctx.drawImage(work, 0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        last.bloom = true;
      }
    }
    if (vign) { ctx.drawImage(vignette(W, H, o.tod), 0, 0, W, H); last.vign = true; }
    ctx.restore();
    return true;
  }

  var api = { apply: apply, TOP: TOP, BOT: BOT, VIGN: VIGN, _last: null, _phone: null };
  global.DG = global.DG || {};
  global.DG.hd2d = api;
})(typeof window !== 'undefined' ? window : this);
