/**
 * 1만리 세계 편 · 한국 1장 「첫 나라의 아침」(`kr_dawn`) — 묶음 읽개(W-0679 → W-0682)
 * ---------------------------------------------------------------
 * 표·대사는 여기 없다 — 묶음 `saga-web/saga-world/world/kr/`(chains/kr_dawn.json · people.json · lines/ko.json · pack.json)을
 * 공용 읽개 DG.worldPack 이 읽고, 여기선 story-sc.js 가 쓰던 모양 그대로(CHAIN·ORDER·NPCS·START·GATE·PET·KEY_TIGER) 내놓는다.
 * 단계 꼴은 1만리 것(type·npc·zone·off·text·item·count·kind·waves·name) · lines 는 조각들(대사 키 또는 { pick, 0, 1 }) → 읽을 때마다 고른 번호로 잇는다.
 * 인물은 people.json 한 줄 → NPCS(대화·자리·혼잣말) · 몸 core cfg borrow.named(있으면 더함).
 * 묶음을 못 읽으면 DG.storyKr 이 없다 — story-sc 는 셋째 줄을 끄고 본편만 돈다. pack.off 에 kr_dawn 이 들면 OFF(끝낸 것으로).
 */
(function (global) {
  'use strict';
  var WP = global.DG && global.DG.worldPack, P = WP ? WP.load('kr') : null;
  if (!P) { return; }
  /* W-0759 문 나라 — ?door=jp_jomon.clay 처럼 나라 머리가 kr 이 아니면 그 나라 묶음을 마지막에 읽어(worldpack cur) 사슬·인물·대사를 거기서 찾는다. 한국 1장 차례(ORDER)는 늘 한국 묶음 */
  var NAT = (function () { var D = global.DG.door, m = D && D.on && D.on() ? /^([a-z]{2})_[a-z]/.exec(String(D.info().door || '')) : null; return m && m[1] !== 'kr' && !/^ugc_/.test(D.info().door) ? m[1] : 'kr'; })();

  function was(id) { var C = global.DG.core, s = C && C.save && C.save.scenario; return !!(s && Array.isArray(s.was) && s.was.indexOf(id) >= 0); }   // W-0726 세계 세이브에서 끝낸 사슬(door.js 가 들고 들어옴)
  function picked(k) { var C = global.DG.core, s = C && C.save && C.save.scenario; return s && s.picks && typeof s.picks[k] === 'number' ? s.picks[k] : null; }
  var KEY_TIGER = null, CHAIN = {}, ORDER = [], NPCS = {};
  var B = global.DG.cfg && global.DG.cfg.assets3d && global.DG.cfg.assets3d.borrow;
  /** 묶음 사슬 하나 → CHAIN(+ 그 사슬이 부르는 인물 → NPCS·몸 목록). 1장 사슬만 ORDER(1만리 혼자 놀 때 차례) */
  function take(q, noNpc) {   // W-0760 noNpc — 사슬은 싣되 그 인물은 들판에 안 세움
    if (!q || CHAIN[q.id] || q.steps.some(function (st) { return st.door; })) { return CHAIN[q && q.id] || null; }   // 다른 판 문 단계가 든 사슬은 1만리 몫이 아니다
    var steps = q.steps.map(function (st) {
      var o = {}; Object.keys(st).forEach(function (k) { if (k !== 'lines') { o[k] = st[k]; } });
      if (st.off) { o.offK = true; }   // W-0723 묶음 off 는 3D 걸음 기준 — story.posOf 가 2D 몸 배율(K2)을 곱한다
      if (st.lines) {
        st.lines.forEach(function (sg) { if (sg && sg.pick && !KEY_TIGER) { KEY_TIGER = sg.pick; } });
        Object.defineProperty(o, 'lines', { enumerable: true, get: function () { return WP.lines(st.lines, picked, was); } });
      }
      if (st.npc && !noNpc && !NPCS[st.npc]) {   // 이 판 들판에 서는 인물은 실린 사슬이 부르는 사람만(다른 장 인물은 그 문의 판 몫)
        var pp = ((WP.current && WP.current()) || P).people.filter(function (x) { return x.id === st.npc; })[0];   // W-0759 지금 읽힌 묶음(문 나라)의 인물
        if (pp) { NPCS[pp.id] = { id: pp.pid, name: pp.name, short: pp.short, zone: pp.zone, off: pp.off, color: pp.color, idle: pp.idle }; if (B && Array.isArray(B.named) && B.named.indexOf(pp.body) < 0) { B.named.push(pp.body); } }
      }
      if (st.type === 'chase' && NPCS[st.npc] && !NPCS[st.npc].runPath) {   // W-0729 쫓기 — 달아날 길이 없으면 story 가 옛 노 도둑 길(THIEF_PATH)을 쫓게 되고 인물은 제자리에 선다 → 그 인물 자리에서 시작하는 길
        var o0 = NPCS[st.npc].off || [0, 0], RP = Array.isArray(st.path) && st.path.length > 1 ? st.path : [[0, 0], [-40, -20], [-80, -5], [-105, 30], [-100, 75], [-70, 105], [-30, 120]];
        NPCS[st.npc].runPath = RP.map(function (d) { return [o0[0] + d[0], o0[1] + d[1]]; });
      }
      return o;
    });
    CHAIN[q.id] = { id: q.id, name: q.name, ar: q.ar, reward: q.reward, steps: steps };
    if (String(q.id).indexOf('kr_dawn.') === 0 && !q.side) { ORDER.push(q.id); }   // W-0727 곁가지(side)는 차례 줄에 안 넣음 — 문으로만
    return CHAIN[q.id];
  }
  P.chains.filter(function (q) { return String(q.id).indexOf('kr_dawn.') === 0; }).forEach(function (q) { take(q, NAT !== 'kr'); });   // W-0760 다른 나라 문은 한국 1장 인물(돌메 등)을 안 세움 — 차례(ORDER)·CHAIN 은 story-sc 가 쓰니 그대로
  /** W-0683 ③ 문으로 연 다른 장 떠돌기 사슬(?door=kr_three.salt 등) — 그 사슬 하나만 더 싣는다. 진단도 이것으로 */
  function addChain(id) { return take(WP.chain(id)); }
  if (NAT !== 'kr' && !WP.load(NAT)) { NAT = 'kr'; WP.load('kr'); }   // 그 나라 묶음을 못 읽으면 한국으로 되돌림(사슬 없음 → 그만두기만)
  if (global.DG.door && global.DG.door.on()) { addChain(global.DG.door.info().door); }

  global.DG = global.DG || {};
  global.DG.storyKr = { CHAIN: CHAIN, ORDER: ORDER, NPCS: NPCS, START: P.pack.start, GATE: P.pack.gate, PET: P.pack.pet, KEY_TIGER: KEY_TIGER,
    OFF: WP.off('kr_dawn'), picked: picked, addChain: addChain, NATION: NAT,
    /** W-0696 사슬이 든 장의 1만리 무대 칸(chapters.json field — biome 지역 key) · 없으면 null(고향 0_0) — 3장이 2장과 같은 남원에서 시작했다 */
    fieldOf: function (id) { var cid = String(id || '').split('.')[0], c = ((WP.current && WP.current()) || P).chapters.filter(function (x) { return x.id === cid; })[0]; return (c && c.field) || null; } };
})(typeof window !== 'undefined' ? window : this);
