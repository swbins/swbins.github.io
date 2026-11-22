/**
 * 1만리 · 세계 편 세트 덤(W-0748, 정본 scenario/world-balance.md §3·§4) — 문으로 열었을 때만 세계 세이브를 읽어 들판 전투 공격력에 배율 하나.
 * ---------------------------------------------------------------
 *   둘 효과   조각 둘 이상인 벌마다 +3%(상한 +9%)
 *   각인      셋 다 찬 벌의 낱말 — together 세계 도감 동료 하나마다 +2%(상한 +20%) · collect 유물+기록 하나마다 +1%(상한 +20%, W-0755 기록 칸 다 참(player.dexFull 'note') 이면 끝까지 +20%)
 *             나머지 낱말(first·chain·rotate·clock·relay·weak·endure·mix)은 판 안 사건이 필요해 3단계 — 지금은 0
 *   상한      다 더해 +26%(보물→전설 배율 차 — 세트가 등급 한 칸보다 세지 않게)
 * 세트 표는 묶음 sets.json(worldpack). 세계 세이브는 읽기만. 문 밖 1만리 혼자 놀이는 늘 1. 손잡이 `world.setBonus` 0 = 끔.
 *   bonusOf(worldSave, sets) → { mul, parts:[{k, v}] }(순수) · atkMul() → 지금 판의 배율
 */
(function (global) {
  'use strict';
  var MIX = 0.08, TWO = 0.03, TWO_CAP = 0.09, TOG = 0.02, TOG_CAP = 0.20, COL = 0.01, COL_CAP = 0.20, CAP = 0.26;
  function arr(x) { return Array.isArray(x) ? x : []; }
  function bonusOf(ws, sets) {
    var parts = [], items = (ws && ws.items) || {}, dex = (ws && ws.dex) || {}, two = 0, add = 0;
    arr(sets).forEach(function (S) {
      var n = arr(S.pieces).filter(function (q) { return items[q.id] > 0; }).length;
      if (n >= 2) { two += TWO; }
      if (n >= 3 && S.mark) {
        if (S.mark.rule === 'together') { var t = Math.min(TOG_CAP, arr(dex.ally).length * TOG); if (t > 0) { parts.push({ k: S.id + ':together', v: t }); add += t; } }
        else if (S.mark.rule === 'collect') { var c = arr(ws && ws.player && ws.player.dexFull).indexOf('note') >= 0 ? COL_CAP : Math.min(COL_CAP, (arr(dex.relic).length + arr(dex.note).length) * COL); if (c > 0) { parts.push({ k: S.id + ':collect', v: c }); add += c; } }
      }
    });
    /* W-0750 mix 섞어 입기 — 셋 다 찬 이 벌 + 다른 벌 하나 이상 조각 둘 */
    var mixS = arr(sets).filter(function (S) { return S.mark && S.mark.rule === 'mix' && arr(S.pieces).length && arr(S.pieces).every(function (q) { return items[q.id] > 0; }); })[0];
    if (mixS && arr(sets).some(function (S) { return S !== mixS && arr(S.pieces).filter(function (q) { return items[q.id] > 0; }).length >= 2; })) { parts.push({ k: mixS.id + ':mix', v: MIX }); add += MIX; }
    two = Math.min(TWO_CAP, two); if (two > 0) { parts.unshift({ k: 'two', v: two }); }
    var tot = Math.min(CAP, two + add);
    return { mul: Math.round((1 + tot) * 10000) / 10000, parts: parts };
  }
  /** W-0759 문 나라 묶음 — story-kr 가 고른 나라(없으면 kr). 여기서 'kr' 을 다시 읽으면 worldpack cur 가 바뀌어 다른 나라 대사가 사라진다 */
  function natOf() { var K = global.DG.storyKr; return (K && K.NATION) || 'kr'; }
  /** 한국 세트 + 문 나라 세트(가방은 하나 — 한국 옷을 입고 일본 문에 가도 센다) · 문 나라를 마지막에 읽어 cur 를 지킴 */
  function setsAll(WP) { var n = natOf(), a = WP.load('kr'), b = n !== 'kr' ? WP.load(n) : null; return [].concat((a && a.sets) || [], (b && b.sets) || []); }
  var memo = null;
  function atkMul() {
    var C = global.DG.core, D = global.DG.door, WP = global.DG.worldPack;
    if (C && C.tuned && !+C.tuned('world.setBonus', 1)) { return 1; }
    if (!D || !D.on || !D.on() || !D.info || !D.world || !WP || !WP.load) { return 1; }
    if (memo) { return memo.mul; }
    var I = D.info(), ws = I && I.p ? D.world(I.p) : null, S0 = setsAll(WP);
    memo = bonusOf(ws, S0);
    return memo.mul;
  }
  /* ── W-0749 3단계 ① 사건 각인 — first(그날 첫 싸움 30초 +15%) · chain(같은 적 연타 +2%, 상한 12%) · endure(맞을 때 +1%, 상한 15%, 10초 안 맞으면 0) ── */
  var ROT3 = 0.10, ROT2 = 0.04, RELAY = 0.12, RELAY_SEC = 3, WEAK = 0.3, WEAK_CAP = 0.15, TIDE_HI = 0.10, TIDE_LO = 0.04, TIDE_MS = 44700000;   // W-0750 · 물때 12시간 25분
  /** 밀물인가 — 기기 시각을 12시간 25분 주기로, 앞 절반이 밀물(순수) */
  function tideHigh(ms) { return ((ms % TIDE_MS) + TIDE_MS) % TIDE_MS < TIDE_MS / 2; }
  var FIRST = 0.15, FIRST_SEC = 30, CHAIN = 0.02, CHAIN_CAP = 0.12, END = 0.01, END_CAP = 0.15, END_SEC = 10;
  /** 셋 다 찬 벌의 각인 낱말 표 { first: true, … }(순수) */
  function rulesOf(ws, sets) { var items = (ws && ws.items) || {}, R = {}; arr(sets).forEach(function (S) { if (S.mark && arr(S.pieces).length && arr(S.pieces).every(function (q) { return items[q.id] > 0; })) { R[S.mark.rule] = true; } }); return R; }
  /** 사건 상태 st { firstUntil, t, chainUid, chainN, endN, endT } 와 각인 표 → 덧셈 덤(순수) */
  function evAdd(st, R) {
    var a = 0;
    if (R.first && st.firstUntil > st.t) { a += FIRST; }
    if (R.chain) { a += Math.min(CHAIN_CAP, Math.max(0, (st.chainN || 0) - 1) * CHAIN); }
    if (R.endure && st.t - (st.endT || -1e9) <= END_SEC) { a += Math.min(END_CAP, (st.endN || 0) * END); }
    /* W-0750 ② */
    if (R.rotate) { var w3 = arr(st.wts).slice(-3), dn = w3.filter(function (x, i) { return x && w3.indexOf(x) === i; }).length; a += dn >= 3 ? ROT3 : (dn === 2 ? ROT2 : 0); }
    if (R.relay && st.relay) { a += RELAY; }
    if (R.weak) { a += Math.min(WEAK_CAP, Math.max(0, st.weak || 0) * WEAK); }
    if (R.clock) { a += st.tideHigh ? TIDE_HI : TIDE_LO; }
    return a;
  }
  /** 정적 배율 m0(atkMul) 위에 사건 덤 a 를 얹되 m0 × 결과 ≤ 1 + CAP(순수) */
  function evMul(m0, a) { var lim = (1 + CAP) / (m0 || 1); return Math.max(1, Math.min(lim, 1 + a)); }
  var rmemo = null, ev = { firstUntil: 0, t: 0, chainUid: null, chainN: 0, endN: 0, endT: -1e9 };
  function rules() {
    var C = global.DG.core, D = global.DG.door, WP = global.DG.worldPack;
    if (C && C.tuned && !+C.tuned('world.setBonus', 1)) { return {}; }
    if (!D || !D.on || !D.on() || !D.info || !D.world || !WP || !WP.load) { return {}; }
    if (!rmemo) { var I = D.info(); rmemo = rulesOf(I && I.p ? D.world(I.p) : null, setsAll(WP)); }
    return rmemo;
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  /** 들판 타격 한 번(field-combat hitFoe) — 사건을 세고 그 타격 배율 */
  function hitMul(S, f, m, src) {
    var R = rules(); if (!R.first && !R.chain && !R.endure && !R.rotate && !R.relay && !R.weak && !R.clock) { return 1; }
    ev.t = (S && S.t) || 0;
    if (R.first) { var C = global.DG.core, s = C && C.save; if (s && s.wsFirst !== today()) { s.wsFirst = today(); ev.firstUntil = ev.t + FIRST_SEC; } }
    if (R.chain) { var u = f && f.uid; if (u !== undefined && u === ev.chainUid) { ev.chainN++; } else { ev.chainUid = u; ev.chainN = 1; } }
    if (R.rotate && m) { ev.wts = arr(ev.wts).concat([m.wtype || 'none']).slice(-3); }
    ev.relay = false;
    if (R.relay && m && (src === 'skill' || src === 'zone' || src === 'burst')) { ev.relay = !!(ev.skBy && ev.skBy !== m.id && ev.t - ev.skT <= RELAY_SEC); ev.skBy = m.id; ev.skT = ev.t; }
    if (R.weak && m && S && Array.isArray(S.party)) { var mx = 0; S.party.forEach(function (q) { if (q && !q.down && q.atk > mx) { mx = q.atk; } }); ev.weak = mx > 0 ? (mx - (m.atk || 0)) / mx : 0; } else { ev.weak = 0; }
    if (R.clock) { ev.tideHigh = tideHigh(Date.now()); }
    return evMul(atkMul(), evAdd(ev, R));
  }
  /** 내 편이 맞음(field-combat hurt) */
  function onHurt(S) { var R = rules(); if (!R.endure) { return; } var t = (S && S.t) || 0; if (t - ev.endT > END_SEC) { ev.endN = 0; } ev.endN++; ev.endT = t; }
  global.DG = global.DG || {};
  global.DG.worldSet = { tideHigh: tideHigh, bonusOf: bonusOf, atkMul: atkMul, CAP: CAP, rulesOf: rulesOf, evAdd: evAdd, evMul: evMul, hitMul: hitMul, onHurt: onHurt, _ev: function () { return ev; },
    _reset: function () { memo = null; rmemo = null; ev = { firstUntil: 0, t: 0, chainUid: null, chainN: 0, endN: 0, endT: -1e9 }; } };
})(typeof window !== 'undefined' ? window : this);
