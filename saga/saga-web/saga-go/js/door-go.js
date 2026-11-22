/**
 * 1만리 문 모드 접착부(W-0681 · scenario/world-doors.md §1) — 공용 door.js 위에 이 판 것만.
 * ---------------------------------------------------------------
 * 문 모드(?door=kr_dawn.<사슬>&p=…&ret=…)에서만 돈다. 아니면 아무것도 안 한다.
 *   · 사슬 끝 — story:step 마다 save.scenario.done 에 그 사슬이 들면 쪽지 { ok, got, picks } 를 쓰고 돌아간다(한 번만)
 *   · got = 그 사슬 표(story-kr.js)의 보상 금·재능 재료(매듭·교본, W-0709) + 맺는 사슬이면 짝 해오 — 껍데기가 다시 표 안인지 본다
 *   · 그만두기 단추 하나(→ ok:false) · 숨기기는 css 의 body.door 한 줄 묶음
 */
(function (global) {
  'use strict';
  var D = global.DG && global.DG.door, done = false;
  function gotOf(id) {
    var K = global.DG.storyKr, q = K && K.CHAIN[id], out = [];
    if (!q) { return out; }
    if (q.reward && q.reward.gold) { out.push({ t: 'gold', id: 'gold', n: q.reward.gold }); }
    ['knot', 'guide'].forEach(function (k) { if (q.reward && q.reward[k] > 0) { out.push({ t: 'item', id: k, n: q.reward[k] }); } });   // W-0709 재능 재료 → 껍데기 가방(world-shell §1 한 가방)
    if (id === K.GATE) { out.push({ t: 'ally', id: K.PET, n: 1 }); }
    if (q.reward && typeof q.reward.ally === 'string') { out.push({ t: 'ally', id: q.reward.ally, n: 1 }); }   // W-0719 사슬 보상 동료(4장 바다솔)
    if (q.reward && typeof q.reward.built === 'string') { out.push({ t: 'built', id: q.reward.built, n: 1 }); }   // W-0719 거점 건물(4장 나루) — 껍데기가 BASE 표·DOORS 한도 안만
    return out;
  }
  function check() {
    if (done || !D || !D.on()) { return; }
    var C = global.DG.core, s = C && C.save, I = D.info();
    if (!s || !s.scenario || !Array.isArray(s.scenario.done) || s.scenario.done.indexOf(I.door) < 0) { return; }
    done = true;
    D.finish({ ok: true, got: gotOf(I.door), picks: s.scenario.picks || {}, stat: {} });
  }
  function quitBtn() {
    var doc = global.document; if (!doc || !doc.body || doc.getElementById('door-quit')) { return; }
    var b = doc.createElement('button'); b.id = 'door-quit'; b.type = 'button'; b.textContent = '그만두고 책으로';
    b.addEventListener('click', function () { if (!done) { done = true; D.quit(); } });
    doc.body.appendChild(b);
  }
  /** W-0746 문 입장 첫 자리 — 기준점 a 곁(−18,+22)이 원래 자리. 첫 단계 자리 t 가 그 자리에서 FAR(300m) 넘게 멀면 t 에서 50m 앞(−30,+40). 손잡이 door.nearFirst 0 = 옛 길. 순수 */
  var FAR = 300;
  function spawnFor(a, t) {
    var C = global.DG && global.DG.core, x = a.x - 18, y = a.y + 22, on = !(C && C.tuned && !+C.tuned('door.nearFirst', 1));
    if (on && t && isFinite(t.x) && isFinite(t.y) && Math.hypot(t.x - x, t.y - y) > FAR) { return { x: t.x - 30, y: t.y + 40, far: true }; }
    return { x: x, y: y, far: false };
  }
  if (D && D.on()) {
    var C0 = global.DG.core;
    if (C0 && C0.on) { C0.on('story:step', check); }
    /* W-0696 문으로 연 장이 제 무대 칸(chapters.json field)을 가지면 처음 한 번 그 칸 빈터로 옮겨 선다 — 3장이 2장과 같은 남원·같은 자리에서 시작했다.
       문 세이브는 판마다 새 몸이라 고향(0,0) 둘레에 서 있을 때만(다시 열어도 걷던 자리는 그대로) */
    var spawnT = global.setInterval ? global.setInterval(function () { var S = global.DG.story, SC = global.DG.storySc, s = C0 && C0.save; if (!S || !S.anchorOf || !SC || !s || !s.player || !SC.tracking(s)) { return; } global.clearInterval(spawnT); var a = S.anchorOf('home'), p = s.player.pos, t = S.targetOf ? S.targetOf(SC.step(s)) : null; if (a && Math.hypot(p.x, p.y) < 80) { var q = spawnFor(a, t); if (Math.hypot(a.x, a.y) > 200 || q.far) { p.x = q.x; p.y = q.y; if (C0.persist) { C0.persist(); } } } }, 300) : null;   // W-0746 첫 단계가 멀면 그 곁
    if (global.document) { if (global.document.readyState === 'loading') { global.document.addEventListener('DOMContentLoaded', quitBtn); } else { quitBtn(); } }
  }
  global.DG.doorGo = { spawnFor: spawnFor, FAR: FAR, gotOf: gotOf, check: check, _reset: function () { done = false; } };
})(typeof window !== 'undefined' ? window : this);
