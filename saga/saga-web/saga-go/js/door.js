/**
 * 문 어댑터(W-0681 · 정본 scenario/world-shell.md §3 · world-doors.md §0) — 껍데기(saga-world) ↔ 놀이 판. 공용(tools/sync-shared.mjs 가 판에 복사).
 * ---------------------------------------------------------------
 * 들어갈 때 주소: ?door=<사슬 id 또는 ugc_…(W-0685 함께 만든 곁가지)>&p=<프로필>&mode=2d|3d&ret=<돌아올 화면>  — ret 은 **같은 출처의 상대 경로만**(바깥 주소·// 시작 거부).
 *   parse(search)  → { door, p, mode, ret } 또는 null(인자가 모자라거나 ret 이 바깥이면)
 *   on()           문 모드인가(이 페이지 주소 기준, 한 번 읽어 둔다)
 *   world(p)       세계 세이브 `saga-world/save/<p>` 읽기(없으면 null) — **읽기만**
 *   overlay(base)  그 판 새 세이브(base) 위에 세계 세이브 공통 칸(player·dex·heroes·party·petEquip·items·gold)을 덮고,
 *                  이야기 셋째 줄을 그 사슬로 고정(scenario = { cur: door, step: 0, done: [], picks: {} })한 것을 돌려준다
 *   begin(core)    문 모드 시작 — core.adoptSave(overlay) · core.persist 를 빈 함수로(제 세이브 키에 한 글자도 안 씀) · body.door
 *   finish(note)   쪽지 `saga-world/door/<p>` = { door, ok, sec, got, picks, stat } 를 쓰고 ret 로 돌아간다
 *                  · DG.ops.track('chain', { id, ok, sec, retries })(W-0684 ③ — retries = 세계 세이브 doors.tries[사슬]-1)
 *                  · 거점 문(?door=<나라>_base, W-0718 3마을)은 쪽지에 base:{built,placed} 를 더 싣는다(껍데기가 거점 표 안만 받음)
 *   quit()         그만두기 — finish({ ok:false })
 * 놀이 판 세이브 키는 건드리지 않는다. 껍데기가 쪽지를 한 번 합치고 지운다.
 */
(function (global) {
  'use strict';
  var WORLD = 'saga-world/save/', NOTE = 'saga-world/door/';
  var COMMON = ['player', 'dex', 'heroes', 'party', 'petEquip', 'items', 'gold'];
  var info = null, read = false, t0 = Date.now(), nav = function (u) { global.location.replace(u); };

  /** ret 은 같은 출처의 상대 경로만 — 'http:' 'https:' '//' 'javascript:' 등은 거부 */
  function safeRet(r) {
    if (typeof r !== 'string' || !r) { return null; }
    if (/^[a-z][a-z0-9+.-]*:/i.test(r) || /^\/\//.test(r) || /^\\/.test(r)) { return null; }
    return r;
  }
  function parse(search) {
    var q = {}; String(search || '').replace(/^\?/, '').split('&').forEach(function (kv) { if (!kv) { return; } var i = kv.indexOf('='), k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i)), v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); q[k] = v; });
    var ret = safeRet(q.ret);
    if (!q.door || !(/^[a-z0-9_]+\.[a-z0-9_]+$/.test(q.door) || /^ugc_[a-z0-9_]{3,40}$/.test(q.door) || /^[a-z]{2}_base$/.test(q.door)) || !q.p || !/^[A-Za-z0-9_-]{1,40}$/.test(q.p) || !ret) { return null; }
    return { door: q.door, p: q.p, mode: q.mode === '3d' ? '3d' : '2d', ret: ret };
  }
  function cur() { if (!read) { read = true; info = global.location ? parse(global.location.search) : null; } return info; }
  function on() { return !!cur(); }
  function ls() { try { return global.localStorage; } catch (e) { return null; } }
  function world(p) { var s = ls(); if (!s) { return null; } try { return JSON.parse(s.getItem(WORLD + p) || 'null'); } catch (e) { return null; } }
  function overlay(base) {
    var I = cur(), w = I ? world(I.p) : null, o = base || {};
    if (w) { COMMON.forEach(function (k) { if (w[k] !== undefined) { o[k] = JSON.parse(JSON.stringify(w[k])); } }); }
    if (I) { var wp = (w && w.scenario && w.scenario.picks) || {}, pk = {}; Object.keys(wp).forEach(function (k) { if (typeof wp[k] === 'number') { pk[k] = wp[k]; } });   // W-0722 앞 장에서 고른 것이 뒤 사슬 대사를 바꾼다 — 세계 세이브 picks 를 들고 들어감
      o.scenario = { cur: I.door, step: 0, done: [], picks: pk, was: (w && w.scenario && Array.isArray(w.scenario.done)) ? w.scenario.done.filter(function (x) { return typeof x === 'string'; }) : [] }; delete o.story; }   // W-0726 was = 세계 세이브에서 끝낸 사슬(읽기만 — done 조각)
    return o;
  }
  function begin(core) {
    var I = cur(); if (!I || !core) { return false; }
    t0 = Date.now();
    if (core.adoptSave) { core.adoptSave(overlay({})); }
    core.persist = function () { /* 문 모드 — 제 세이브 키에 안 쓴다(W-0681) */ };
    core.persist._door = true;
    if (global.document && global.document.body) { global.document.body.classList.add('door'); }
    return true;
  }
  function finish(note) {
    var I = cur(); if (!I) { return false; }
    var n = { door: I.door, ok: !!(note && note.ok), sec: Math.round((Date.now() - t0) / 1000),
      got: (note && note.ok && Array.isArray(note.got)) ? note.got : [], picks: (note && note.picks) || {}, stat: (note && note.stat) || {} };
    if (note && note.ok && note.base && typeof note.base === 'object') { n.base = { built: Array.isArray(note.base.built) ? note.base.built : [], placed: Array.isArray(note.base.placed) ? note.base.placed : [] }; }   // W-0718 거점 문(<나라>_base) — 나갈 때 거점 상태
    var s = ls(); if (s) { try { s.setItem(NOTE + I.p, JSON.stringify(n)); } catch (e) { /* 꽉 참 — 그래도 돌아간다 */ } }
    /* W-0684 ③ 깔때기 — 껍데기가 센 들어감 횟수(doors.tries) 에서 다시 한 횟수 */
    var w = world(I.p), tr = w && w.doors && w.doors.tries && w.doors.tries[I.door];
    if (global.DG.ops && global.DG.ops.track) { try { global.DG.ops.track('chain', { id: I.door, ok: n.ok, sec: n.sec, retries: Math.max(0, (tr || 1) - 1) }); } catch (e) { /* 운영 기록은 조용히 */ } }
    nav(I.ret);
    return n;
  }
  function quit() { return finish({ ok: false }); }

  global.DG = global.DG || {};
  global.DG.door = { parse: parse, safeRet: safeRet, on: on, info: cur, world: world, overlay: overlay, begin: begin, finish: finish, quit: quit,
    NOTE: NOTE, WORLD: WORLD, COMMON: COMMON,
    /* 진단용 — 주소 대신 인자를 꽂고, 돌아가기를 붙잡는다 */
    _set: function (i) { info = i; read = true; }, _nav: function (f) { nav = f; } };
})(typeof window !== 'undefined' ? window : this);
