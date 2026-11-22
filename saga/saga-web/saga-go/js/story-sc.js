/**
 * 1만리 이야기 **셋째 줄** — 세계 편 사슬(W-0679 · scenario/world-doors.md §1). 표는 story-kr.js(DG.storyKr).
 * ---------------------------------------------------------------
 * story.js 는 줄 상한(1500)이라 엔진은 여기, 거기선 기존 줄 끝에 짧은 호출만(tracking·step·keyOf·advance·stepAt·locked·trackText·mapMarks·고르기).
 * 세이브 save.scenario = { cur: 사슬 id|null, step, done: [사슬 id…], picks: { 키: 번호 } } — save.story 는 안 건드린다.
 *   새 세이브(save.story·save.scenario 둘 다 없음) → cur = START. save.story 가 있는데 scenario 가 없으면:
 *   본편을 시작한 세이브(ch>0 또는 step>0)는 cur=null(이 줄 없음, 1장 잠금 건너뜀) · 본편 1장 첫 단계 그대로면 START 부터.
 * 따라가는 차례: 세계 임무(save.wq.track) > 이 줄 > 본편. 본편 1장은 done 에 GATE 가 들어야 열린다(옛 세이브 제외).
 */
(function (global) {
  'use strict';

  function KR() { return global.DG.storyKr || null; }
  function def(id) { var K = KR(); return (K && K.CHAIN[id]) || null; }
  /** sv() 가 save.story 를 처음 만들기 **전에** 부른다 — 둘 다 없으면 새 세이브 */
  function init(s) {
    var K = KR();
    if (!K || !s || (s.scenario && typeof s.scenario === 'object')) { return; }
    var st = s.story, began = st && typeof st === 'object' && ((st.ch | 0) > 0 || (st.step | 0) > 0), off = !!global.DG_SC_OFF;   // 진단 페이지 깃발 — 옛 진단은 옛 흐름
    if (K.OFF && !began && !off) { s.scenario = { cur: null, step: 0, done: K.ORDER.slice(), picks: {}, old: false, off: true }; return; }   // W-0682 운영이 끈 장 — 끝낸 것으로
    s.scenario = { cur: began || off ? null : K.START, step: 0, done: [], picks: {}, old: !!(began || off) };
  }
  function sc(s) {
    init(s);
    var o = s.scenario;
    if (!o || typeof o !== 'object') { return null; }
    if (!Array.isArray(o.done)) { o.done = []; }
    if (!o.picks || typeof o.picks !== 'object') { o.picks = {}; }
    if (typeof o.step !== 'number') { o.step = 0; }
    return o;
  }
  /** 따라가는 사슬 id — 세계 임무를 따라가면 null(그쪽이 먼저) */
  function tracking(s) {
    var o = sc(s), w = s && s.wq, st = s && s.story;
    if (!o || !o.cur || !def(o.cur) || o.old || (KR() && KR().OFF)) { return null; }
    if (st && ((st.ch | 0) > 0 || (st.step | 0) > 0)) { return null; }   // 본편을 이미 걸은 세이브엔 끼어들지 않는다
    if (w && w.track && w.steps && typeof w.steps[w.track] === 'number') { return null; }
    return o.cur;
  }
  function step(s) { var id = tracking(s); return id ? def(id).steps[sc(s).step] || null : null; }
  function key(s) { var id = tracking(s); return id ? 'sc:' + id + '_' + sc(s).step : null; }
  /** 단계 객체 → { c: -1, i, sc: id } (story.js stepAt 꼴) */
  function stepAt(st) {
    var K = KR(); if (!K || !st) { return null; }
    for (var q in K.CHAIN) { var j = K.CHAIN[q].steps.indexOf(st); if (j >= 0) { return { c: -1, i: j, sc: q }; } }
    return null;
  }
  /** 본편 1장 잠금 — GATE 를 아직 안 끝냈고 옛 세이브가 아니면 true */
  function gate(s) {
    var K = KR(), o = sc(s), st = s && s.story;
    if (!K || !o || o.old || K.OFF) { return false; }
    if (st && ((st.ch | 0) > 0 || (st.step | 0) > 0)) { return false; }
    return o.done.indexOf(K.GATE) < 0;
  }
  /** 세이브에 남는 고르는 줄 — 키에 고른 번호 */
  function pick(s, k, i) { var o = sc(s); if (o && typeof k === 'string' && typeof i === 'number') { o.picks[k] = i; } }
  /**
   * 한 단계 나아가기 — x = { award(r)→글, toast, sfx, resetStep, partyExp(n), log(글, 결) }(story.js 안의 것을 빌린다).
   * 사슬 끝이면 보상 → 다음 사슬(ORDER 차례), 마지막(GATE)이면 짝 해오(도감 + buddy.set)
   */
  function advance(s, x) {
    var id = tracking(s); if (!id) { return false; }
    var K = KR(), o = sc(s), q = def(id);
    if (x.partyExp) { x.partyExp(); }
    o.step += 1;
    x.resetStep();
    var txt = '';
    if (o.step >= q.steps.length) {
      txt = x.award(q.reward || {});
      if (o.done.indexOf(id) < 0) { o.done.push(id); }
      var oi = K.ORDER.indexOf(id), nx = oi >= 0 ? K.ORDER[oi + 1] || null : null;   // 차례 밖(문으로 연 다른 장) 사슬은 끝나면 그만
      o.cur = nx; o.step = 0;
      x.toast(q.name + ' 완료. ' + txt);
      x.log(q.name + ' 끝: ' + txt, 'good');
      x.sfx('reward');
      if (id === K.GATE) { pet(s, x); }
      else if (nx) { x.toast(def(nx).steps[0].text); }
    } else {
      x.toast(q.steps[o.step].text);
    }
    return true;
  }
  function pet(s, x) {
    var K = KR(), D = global.DG.data, p = D && D.find ? D.find(K.PET) : null, E = global.DG.encounter, B = global.DG.buddy;
    if (!p) { return; }
    if (!s.dex) { s.dex = { heroes: {}, pets: {} }; }
    if (!s.dex.pets) { s.dex.pets = {}; }
    if (!s.dex.pets[p.id]) {
      if (E && E.gainPet) { try { E.gainPet(p); } catch (e) { s.dex.pets[p.id] = { count: 1, firstAt: Date.now() }; } } else { s.dex.pets[p.id] = { count: 1, firstAt: Date.now() }; }
    }
    if (B && B.set) { try { B.set(p.id); } catch (e) { /* 짝 화면은 없어도 도감엔 든다 */ } }
    x.toast('짝이 생겼다: ' + p.name);
  }

  global.DG = global.DG || {};
  global.DG.storySc = { init: init, sc: sc, def: def, tracking: tracking, step: step, key: key, stepAt: stepAt, gate: gate, pick: pick, advance: advance,
    homeZone: function (s) { var id = tracking(s), K = global.DG.storyKr; return id && K && K.fieldOf ? K.fieldOf(id) : null; } };   // W-0696 따라가는 세계 편 사슬의 무대 칸(story anchorOf('home') 이 그리로)
})(typeof window !== 'undefined' ? window : this);
