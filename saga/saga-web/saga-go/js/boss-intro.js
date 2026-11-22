/**
 * W-0551 보스 등장 컷 — 들판에서 보스를 처음 마주치면(머리 위 보스 바가 처음 생길 때)
 * 화면 가운데에 큰 이름 띠(이름·Lv.n)를 1.3초 띄우고, 3D 에선 카메라가 그동안 내 어깨 너머로
 * 보스를 잡는다(world3d talkShot 이 대화가 없을 때 shot() 을 읽어 talkface.talkAim 구도로 — 대화와 같은 길).
 * 보스의 첫 공격은 컷이 끝날 때까지 미룬다(f.cd 만 올림 — AI·수치는 그대로).
 * 같은 보스(uid)는 한 번만. 이야기 대화·결투 중이면 건너뛴다(본 것으로 표시 — 다시 안 뜸).
 * 손잡이: go.bossIntro(0 이면 옛 동작) · go.bossIntroMs(기본 1300).
 */
(function (global) {
  'use strict';

  function K(key, def) { var C = global.DG.core; return C && C.tuned ? C.tuned('go.' + key, def) : def; }
  function now() { return global.performance && global.performance.now ? global.performance.now() : Date.now(); }

  var seen = {};
  var cur = null;      // { f, until, el }

  function busy() {
    var S = global.DG.story, FC = global.DG.fieldCombat;
    if (S && S.talkShot && S.talkShot()) { return true; }
    var st = FC && FC.state ? FC.state() : null;
    return !!(st && st.duel);
  }

  function clear() {
    if (cur && cur.el && cur.el.parentNode) { cur.el.parentNode.removeChild(cur.el); }
    if (cur && cur.timer) { clearTimeout(cur.timer); }
    cur = null;
  }

  /** 보스 바가 처음 생길 때 field-combat 이 부른다 */
  function play(f, name, lv) {
    if (!f || !K('bossIntro', 1)) { return false; }
    if (seen[f.uid]) { return false; }
    seen[f.uid] = true;
    if (busy()) { return false; }
    clear();
    var dur = Math.max(300, K('bossIntroMs', 1300));
    f.cd = Math.max(f.cd || 0, dur / 1000 + 0.2);
    var el = null;
    if (global.document && !global.DG_NO_DRAW) {
      el = document.createElement('div');
      el.className = 'boss-intro';
      el.style.setProperty('--bi-dur', dur + 'ms');
      var b = document.createElement('b'); b.textContent = String(name || '');
      var s = document.createElement('small'); s.textContent = 'Lv.' + (lv | 0);
      el.appendChild(s); el.appendChild(b);
      document.body.appendChild(el);   // #field-hud 는 다시 그려질 때 자식을 지운다 — body 에 고정(z-index 31)
    }
    cur = { f: f, until: now() + dur, el: el, timer: null };
    var me = cur;
    cur.timer = setTimeout(function () { if (cur === me) { clear(); } }, dur);
    return true;
  }

  function active() {
    if (!cur) { return false; }
    if (!K('bossIntro', 1) || now() >= cur.until || !(cur.f.hp === undefined || cur.f.hp > 0)) { return false; }
    return true;
  }

  /** world3d talkShot 이 대화가 없을 때 읽는다 — 말하는 이 = 보스, 듣는 이 = 나 */
  function shot() {
    if (!active()) { return null; }
    var C = global.DG.core, p = C && C.save && C.save.player ? C.save.player.pos : null;
    if (!p) { return null; }
    /* 큰 보스는 머리까지 들어오게 카메라를 떨어뜨린다 — 듣는 이 자리를 보스→나 방향으로 키(머리 위 바 높이)의 2.6배+2m 까지 민다 */
    var FF = global.DG.fieldFoes, F = FF && FF.FOES ? FF.FOES[cur.f.kind] : null, top = F && F.h ? F.h * 1.9 : 0;
    var dx = p.x - cur.f.x, dy = p.y - cur.f.y, d = Math.hypot(dx, dy), want = Math.max(d, top * 2.6 + 2), k = d > 1e-6 ? want / d : 1;
    return { boss: true, spk: { x: cur.f.x, y: cur.f.y }, lst: { x: cur.f.x + dx * k, y: cur.f.y + (d > 1e-6 ? dy * k : want) } };
  }

  global.DG = global.DG || {};
  global.DG.bossIntro = {
    play: play, shot: shot, active: active,
    _seen: function () { return seen; },
    _reset: function () { seen = {}; clear(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
