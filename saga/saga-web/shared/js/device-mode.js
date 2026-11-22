/**
 * 기기별 화면 — 폰은 2D, PC 는 3D (사용자 10-19 "모바일은 2D 웹은 3D 로 되게 자동으로 잡아줘")
 * W-0671 ① 11-13 「2d버전도 다 걷어낼거임」을 2D 판 걷어내기로 잘못 알아 폰도 3D 기본으로 했다 → 11-14 사용자 바로잡음(「VRoid 버전을 걷어낸다」 —
 *   2D 판은 자체 에셋으로 다시 만들어 먼저 무료 상용화). 폰 = 2D 기본으로 되돌림. 손잡이 ui.phone3d(0 = 폰 2D 기본, 1 = 폰도 3D) · `?mode=2d` 는 그 탭만 2D
 *
 * 다섯 판의 "3D 를 원하나" 함수(1만리 world3d.wanted·시점 tiltMode · 2나락 dungeon3d.wanted · 3마을 village-view3d.ON ·
 * 4종횡 side-view3d.ON · 5천하 realm3d.ON)가 이 한 곳에 묻는다:
 *   DG.deviceMode.want3d(key, saved)  폰이면 **이 탭에서 🧊 로 켰을 때만** true(저장된 값은 안 읽는다 — 3D 세이브로 열자마자 죽는 일을 막는다),
 *                                     PC 면 saved(판의 손잡이·설정 그대로)
 *   DG.deviceMode.mark(key, on)       🧊 를 눌렀을 때 — 이 탭 동안만 기억(sessionStorage). 새로 열면 폰은 다시 2D
 *   DG.deviceMode.phone()             폰인가(한 번 재고 기억) · test(ua, touch, w, h) 는 순수 함수(진단용)
 * 폰 판정: 모바일 UA(iPhone·iPod·Android+Mobile·iPad) 또는 (터치 + 화면 짧은 변 ≤ 520px). 손잡이 `?mode=2d|3d` 로 그 탭만 억지로 바꿀 수 있다.
 * 정본은 saga-web/shared/js/device-mode.js — 판별 사본은 tools/sync-shared.mjs.
 */
(function (global) {
  'use strict';
  var PRE = 'saga-3d/', cached = null, memo = {}, fake = null;   /* W-0553 memo — 키별 값(매 프레임 sessionStorage 읽기 막음) */
  function ss() { if (fake) { return fake; } try { return global.sessionStorage; } catch (e) { return null; } }
  /** 순수 — UA·터치·화면 크기로 폰인가 */
  function test(ua, touch, w, h) {
    ua = String(ua || '');
    if (/iPhone|iPod|iPad/.test(ua) || (/Android/.test(ua) && /Mobile/.test(ua))) { return true; }
    var s = Math.min(w || 0, h || 0);
    return !!touch && s > 0 && s <= 520;
  }
  function phone() {
    if (cached !== null) { return cached; }
    var q = (global.location && global.location.search) || '';
    if (/[?&]mode=2d\b/.test(q)) { cached = true; return cached; }
    if (/[?&]mode=3d\b/.test(q)) { cached = false; return cached; }
    var n = global.navigator || {}, sc = global.screen || {};
    var touch = ('ontouchstart' in global) || (n.maxTouchPoints > 0);
    /* iPadOS 사파리는 데스크톱 UA 를 보낸다 — 맥 UA + 터치면 아이패드로 본다 */
    var ipad = /Macintosh/.test(n.userAgent || '') && n.maxTouchPoints > 1;
    cached = ipad || test(n.userAgent, touch, sc.width, sc.height);
    return cached;
  }
  function force2d() { var q = (global.location && global.location.search) || ''; return /[?&]mode=2d/.test(q); }
  function phone3d() { var C = global.DG && global.DG.core; return !force2d() && !!(C && C.tuned && +C.tuned('ui.phone3d', 0)); }
  function want3d(key, saved) {
    if (!phone()) { return !!saved; }
    if (Object.prototype.hasOwnProperty.call(memo, key)) { return memo[key]; }
    var s = ss(); var v = s ? s.getItem(PRE + key) : null;
    memo[key] = v === '1' || (v !== '0' && phone3d()); return memo[key];   /* W-0671 ① ui.phone3d 1 이면 폰도 3D(기본 0 = 폰 2D, 11-14 되돌림) */
  }
  function mark(key, on) { memo[key] = !!on; var s = ss(); if (s) { try { s.setItem(PRE + key, on ? '1' : '0'); } catch (e) { /* 막힘 */ } } }
  /* W-0389 ③-5 — HUD 유리 흐림(backdrop-filter)은 그 밑 캔버스가 매 프레임 바뀌면 GPU 가 매 프레임 다시 흐린다— 가설. 1만리 폰 LOW A/B 가 쌍마다 뒤집혀(2쌍 끔이 빠름, 3쌍 켬이 빠름) 근거 없음 → 기본 켬.
     html.no-blur(규칙은 ui-kit.css) · 손잡이 ui.blur(1 = 흐림 기본, 0 = 끔) · 2초마다 맞춘다 — 다섯 판 공용 */
  function syncBlur() { var d = global.document && global.document.documentElement, C = global.DG && global.DG.core; if (!d) { return; } var v = C && C.tuned ? +C.tuned('ui.blur', 1) : 1; d.classList.toggle('no-blur', !v); }
  if (global.setInterval && global.document) { global.setInterval(syncBlur, 2000); global.setTimeout(syncBlur, 50); }
  global.DG = global.DG || {};
  /** W-0417 폰 발열(사용자 10-25 「사양이 너무 타서 폰이 발열해」) — 폰이면 손잡이 perf.phoneFps(30) 를 상한으로, 아니면 0(상한 없음) */
  /* W-0642 폰 프레임 상한을 기기에 맞춰 스스로 고른다(사용자 11-10 「핸드폰마다 다를 것 같은데 자동으로 맞추어야」·「그래픽도 안 좋은데 느리면 너무하다」).
     전엔 폰이면 무조건 30(W-0417 발열) — 아이폰 16 프로도 30 으로 묶였고, 1만리 품질 등급은 48fps 를 넘어야 올라가서 폰에선 내려가기만 했다.
     이제 60 으로 시작하고, 제 rAF 로 화면 갱신 간격을 재서 3초 평균이 45fps 밑인 창이 세 번 이어지면(버거움·발열로 느려짐) 30 으로 내려 그 탭 동안 둔다.
     처음 10초(받기·굽기)와 숨은 탭은 안 센다. 손잡이 perf.phoneFps 를 0 보다 크게 잡으면 그 값 고정(30 = 옛 동작). capStep 은 순수 함수(진단용). */
  var CAP_HI = 60, CAP_LO = 30, autoCap = CAP_HI, capOn = false;
  /** 순수 — (지금 상한, 3초 창 fps, 이어진 나쁜 창 수) → { cap, bad } */
  function capStep(cap, fps, bad) {
    if (cap <= CAP_LO) { return { cap: CAP_LO, bad: 0 }; }
    bad = fps < 45 ? bad + 1 : 0;
    return bad >= 3 ? { cap: CAP_LO, bad: 0 } : { cap: cap, bad: bad };
  }
  function capWatch() {
    if (capOn) { return; }
    capOn = true;
    if (!global.requestAnimationFrame || !global.document || global.DG_NO_DRAW) { return; }
    var st = ss();
    try { if (st && st.getItem(PRE + 'cap30') === '1') { autoCap = CAP_LO; return; } } catch (e) { /* 막힘 */ }
    var last = 0, t0 = 0, n = 0, sum = 0, bad = 0;
    function step(now) {
      if (!t0) { t0 = now; }
      var d = last ? now - last : 0; last = now;
      if (global.document.hidden || d > 1000 || now - t0 < 10000) { n = 0; sum = 0; }
      else if (d > 0) {
        n++; sum += d;
        if (sum >= 3000) {
          var r = capStep(autoCap, 1000 * n / sum, bad); bad = r.bad; n = 0; sum = 0;
          if (r.cap !== autoCap) { autoCap = r.cap; try { if (st) { st.setItem(PRE + 'cap30', '1'); } } catch (e) { /* 막힘 */ } return; }
        }
      }
      global.requestAnimationFrame(step);
    }
    global.requestAnimationFrame(step);
  }
  function fpsCap() {
    if (!phone()) { return 0; }
    var C = global.DG && global.DG.core, v = C && C.tuned ? +C.tuned('perf.phoneFps', 0) : 0;
    if (v > 0) { return v; }
    capWatch();
    return autoCap;
  }
  /* W-0519 한글 입력기가 켜져 있으면 e.key 가 ㅓ·Process 로 와서 e.key 만 보는 단축키(1만리 전투 J·E·Q, 낚시 F, 요리 G 등)가 안 먹었다.
     창 맨 앞(capture)에서 물리 자판 값으로 바로잡아 모든 키 처리가 같은 글자를 본다. 글 입력칸은 건드리지 않는다 */
  function fixImeKey(e) {
    var k = String(e.key || ''), c = String(e.code || ''), t = e.target, tag = t && t.tagName, m, v;
    if (k.length === 1 && k.charCodeAt(0) < 128) { return; }
    if (k.length > 1 && k !== 'Process' && k !== 'Unidentified') { return; }
    if (e.isComposing && (tag === 'INPUT' || tag === 'TEXTAREA')) { return; }
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) { return; }
    m = /^Key([A-Z])$/.exec(c) || /^Digit([0-9])$/.exec(c);
    if (!m) { return; }
    v = m[1].toLowerCase();
    try { Object.defineProperty(e, 'key', { get: function () { return v; }, configurable: true }); } catch (x) { /* 못 바꾸면 옛 값 */ }
  }
  if (global.addEventListener) { global.addEventListener('keydown', fixImeKey, true); global.addEventListener('keyup', fixImeKey, true); }
  global.DG.deviceMode = { fpsCap: fpsCap, capStep: capStep, phone: phone, want3d: want3d, mark: mark, test: test, _reset: function (st, ph) { cached = ph == null ? null : !!ph; memo = {}; fake = st || null; autoCap = CAP_HI; capOn = false; } };
})(window);
