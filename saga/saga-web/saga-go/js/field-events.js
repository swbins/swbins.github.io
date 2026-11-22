/**
 * 1만리 들판 전투 사건 처리(handle) — 판정이 쌓은 사건(맞음·반응·급소·방패·처치·보상·소리·글자·원)을 화면·세이브·소리로 옮긴다. field-combat.js 에서 떼어 냄(R-4 11-17).
 * 몸통은 글자 그대로(바뀌는 이름 S, KDV 만 U.이름() — 부를 때마다). 바깥 이름은 U 로 받는다(같은 객체·함수). 원래 파일은 같은 이름 한 줄 넘김(처음 부를 때 make).
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.fieldEvents = { make: function (U) {
  function core() { return global.DG.core; }
  var A2 = U.A2, COUNTER = U.COUNTER, EL = U.EL, FOES = U.FOES, REACT = U.REACT, SHAPES = U.SHAPES, W3 = U.W3, clearLoot = U.clearLoot, fieldSave = U.fieldSave, floatNum = U.floatNum, killGold = U.killGold, ring = U.ring, sfx = U.sfx, toast = U.toast, wpnSlot = U.wpnSlot, WPN_HOLD = U.WPN_HOLD, wpnMs = U.wpnMs;

  function handle(ev, pos) {
    var c = core(), H = global.DG.hero, i;
    for (i = 0; i < ev.length; i++) {
      var e = ev[i]; if (global.DG.goRank) { global.DG.goRank.onEv(e); } if (global.DG.speciesStudy) { global.DG.speciesStudy.onEv(e); } if (global.DG.fieldStandoff) { global.DG.fieldStandoff.onEv(e); }   // W-0379 무리 토벌 등급 · W-0420 종 연구
      /* ⑲-3 원소 신호 — 스킬·폭발·장판 자리를 알린다(treasure.js 가 석등을 켠다) */
      if ((e.t === 'skill' || e.t === 'burst' || e.t === 'arrow' || (e.t === 'zone' && (e.kind === 'field' || e.kind === 'shell' || e.kind === 'kitzone' || e.kind === 'vortex' || e.kind === 'feast'))) && e.el) {
        /* 돌진·찌르기는 지나간 선(x0,y0 → x,y) 전체가 닿는다 — 끝점만 알리면 제단을 가로질러도 안 켜졌다(2026-09-28) */
        c.emit('field:element', { el: e.el, x: e.x, y: e.y, r: e.r || 3, t: e.t, x0: e.x0, y0: e.y0 });
      }
      if (e.t === 'move') {
        pos.x += e.dx; pos.y += e.dy;
        /* 떠 있는 섬 위면 회피·돌진도 난간 안에서 멈춘다 — 전엔 밀려 떨어져 섬 위 무리와 층이 갈려 싸움이 안 끝났다(2026-09-28, ⑲-49) */
        var LFm = global.DG.landform, SKm = global.DG.skyIsle;
        if (LFm && LFm.onSky && LFm.onSky() && SKm && SKm.clampIn) { SKm.clampIn(pos); }
      }
      else if (e.t === 'weak') { floatNum(e.x, e.y, '급소!', null, 1.35, true); c.emit('field:weak', {}); }   // ⑲-25 업적이 센다
      else if (e.t === 'shoot') { sfx('hit'); }
      else if (e.t === 'arrow') { ring(e.x, e.y, e.el ? 1.2 : 0.6, e.el && EL[e.el] ? EL[e.el].color : '#e8e2d0', 0.3); }
      else if (e.t === 'hit') {
        if (!(global.DG.audio && global.DG.audio.hitFor && global.DG.audio.hitFor(!!e.crit))) { sfx('hit'); }   // W-0170 무기별 맞는 소리·치명
        A2('fc' + e.uid, 'hit', 260); floatNum(e.x, e.y, e.immune ? '면역' : String(e.dmg) + (e.crit ? '!' : ''), e.el, (e.react ? 1.3 : (e.src === 'burst' ? 1.25 : 1)) * (e.crit ? 1.25 : 1), !!e.crit);
        var w = W3(), J2 = !w && global.DG.juice2d; if (J2) { if (e.src === 'burst') { J2.shake(9); J2.hold(90); } else if (e.react) { J2.shake(6); J2.hold(60); } else if (e.crit) { J2.shake(5); J2.hold(45); } else { J2.shake(2); J2.hold(25); } }   // W-0660 2D 멈춤·흔들림
        if (w) {
          w.playAnim('fc' + e.uid, 'hit', 260);
          if (e.src === 'burst') { w.shake(0.5); w.hold(90); } else if (e.react) { w.shake(0.3); w.hold(60); } else if (e.crit) { w.shake(0.22); w.hold(45); } else { w.shake(0.12); }   // W-0170 치명은 잠깐 멎는다
        }
      } else if (e.t === 'react') {
        var RI = REACT[e.kind] || { el: 'fire', r: 2 };
        floatNum(e.x, e.y, e.name + '!', RI.el, 1.5, true);
        ring(e.x, e.y, (RI.r || 1.8) * U.KDV(), e.kind === 'overload' ? '#ffb347' : EL[RI.el].color, 0.45);
        if (global.DG.daily) { global.DG.daily.progress('react'); }   // ⑲-8 일일 의뢰(깨뜨림·번개싹 포함)
        c.emit('field:react', { kind: e.kind });                       // ⑲-25 업적(반응·가짓수)
        if (e.kind === 'crystallize') { toast('굳힘 보호막이 15초 동안 ' + (U.S().guard ? U.S().guard.hp : 0) + ' 만큼 막아 준다'); }
      } else if (e.t === 'dot') { floatNum(e.x, e.y, String(e.dmg), e.el || 'elec', 0.8); }
      else if (e.t === 'break') {
        floatNum(e.x, e.y, e.next ? '겉 방패 깨짐! ' + EL[e.next].icon + ' 속 방패' : '방패 깨짐!', null, 1.4, true);
        if (e.next) { toast('속 방패는 ' + EL[e.next].icon + '. ' + EL[COUNTER[e.next]].icon + ' 원소 동행으로 바꿔라'); }
        ring(e.x, e.y, 2.4, '#ffffff', 0.4);
        if (W3()) { W3().shake(0.45); W3().hold(100); } c.emit('field:break', { camp: e.camp, left: e.left });   // ㉑ 방패 한 겹 = 부위 하나(track.js)
      } else if (e.t === 'swing') {
        A2('me', e.step === 2 ? 'heavy' : 'attack', wpnMs(e.w, e.step, 280)); if (W3()) { W3().playAnim('me', wpnSlot(e.w, e.step), wpnMs(e.w, e.step, 280)); if (e.step === 2 && e.uid != null) { W3().hold(WPN_HOLD()); W3().shake(0.16); } } if (global.DG.audio && global.DG.audio.weapon) { global.DG.audio.weapon(e.w); sfx('sx:sfx_whoosh'); } var fw = W3(); if (fw && fw.faceTo && e.tx != null) { fw.faceTo(e.tx, e.ty, 350); } if (global.DG.slash3d) { global.DG.slash3d.swing(e.w, e.step, pos.x, pos.y, e.tx != null ? Math.atan2(e.tx - pos.x, e.ty - pos.y) : (fw && fw.meAng ? fw.meAng() : 0)); }   // W-0169 무기·단마다 다른 몸짓, 3타 마무리가 맞으면 잠깐 멎는다 · W-0170 휘두름 소리 · W-0173 대상 쪽으로 돌고 검기 띠
        if (e.ranged && e.tx != null) { ring(e.tx, e.ty, 0.8, e.el && EL[e.el] ? EL[e.el].color : '#e8e2d0', 0.25); }   // ⑲-5 서책·활
      } else if (e.t === 'skill') {
        if (e.shape === 'thrust' || e.shape === 'dash') {
          /* 선 모양 — 길을 따라 작은 원을 늘어놓는다 */
          for (var si = 1; si <= 4; si++) {
            var sf = si / 4;
            ring(e.x0 + (e.x - e.x0) * sf, e.y0 + (e.y - e.y0) * sf, e.r * 0.8, EL[e.el].color, 0.35 + sf * 0.2);
          }
        } else {
          ring(e.x, e.y, e.r, EL[e.el].color, e.shape === 'field' ? 0.9 : 0.5);
        }
        if (e.name) { floatNum(pos.x, pos.y, EL[e.el].icon + ' ' + e.name, e.el, 0.95, true, true); }       // ⑲-11 고유·갈래
        else if (e.shape && e.shape !== 'circle') { floatNum(pos.x, pos.y, SHAPES[e.shape].icon + ' ' + SHAPES[e.shape].name, e.el, 0.9, true, true); }
        var CSm = (global.DG.ownAnim && global.DG.ownAnim.combatDur('Pose_cast') * 1000) || 380; A2('me', 'cast', CSm); if (W3()) { W3().playAnim('me', 'Pose_cast', CSm); }   /* W-0303 원소 시전 몸짓 · W-0311 2D 역할 cast(옛 시트는 heavy) */
      } else if (e.t === 'heavy') {
        ring(e.x, e.y, e.r, '#f4f1e2', 0.5);
        floatNum(pos.x, pos.y, '강공격', null, 1, true, true);
        A2('me', 'heavy', wpnMs(e.w, 2, 500)); if (W3()) { W3().playAnim('me', wpnSlot(e.w, 2), wpnMs(e.w, 2, 500)); W3().shake(0.2); if (e.n) { W3().hold(WPN_HOLD() + 20); } if (W3().faceTo) { W3().faceTo(e.x, e.y, 400); } if (global.DG.slash3d) { global.DG.slash3d.swing(e.w, 2, pos.x, pos.y, Math.atan2(e.x - pos.x, e.y - pos.y)); } }   // W-0169 — 강공격 = 그 무기 마무리 몸짓
      } else if (e.t === 'tired') { floatNum(pos.x, pos.y, '기력 부족', null, 0.9, true, true); }
      else if (e.t === 'plunge') {
        ring(e.x, e.y, e.r, '#f4ecd0', 0.6); ring(e.x, e.y, e.r * 0.45, '#ffffff', 0.4);
        floatNum(pos.x, pos.y, '낙하 공격 ×' + e.mul.toFixed(1), null, 1.2, true, true);
        A2('me', 'heavy', 420); if (W3()) { W3().playAnim('me', 'attack', 420); W3().shake(0.45); W3().hold(90); }
        sfx('hit');
      } else if (e.t === 'burst') {
        ring(e.x, e.y, e.r, EL[e.el].color, 0.8);
        ring(e.x, e.y, e.r * 0.55, '#ffffff', 0.5);
        if (e.name) { floatNum(pos.x, pos.y, '💥 ' + e.name, e.el, 1.1, true, true); }
        sfx('thunder');
      } else if (e.t === 'zone') {
        if (e.kind === 'field' || e.kind === 'seed' || e.kind === 'kitzone' || e.kind === 'vortex' || e.kind === 'feast' || e.kind === 'rain') { ring(e.x, e.y, e.r, EL[e.el].color, e.kind === 'seed' ? 0.7 : 0.4); }
        else if (e.kind === 'shell') { ring(e.x, e.y, e.r, EL[e.el].color, 0.55); if (W3()) { W3().shake(0.15); } }
        else { ring(e.x, e.y, 0.9, EL[e.el].color, 0.3); if (e.tx !== undefined) { ring(e.tx, e.ty, e.r, EL[e.el].color, 0.3); } }   // echo 등 tx 없는 구역은 발밑 고리만(안 그러면 undefined 좌표로 예외)
      } else if (e.t === 'dodge') { if (W3()) { W3().playAnim('me', 'dodge', 300); } sfx('sx:sfx_dodge'); } else if (e.t === 'grab') { ring(e.x, e.y, 1.2 * U.KDV(), '#ffd27a', 0.35); floatNum(e.x, e.y, '잡기', null, 1, true, true); A2('me', 'heavy', 300); if (W3()) { W3().playAnim('me', 'attack', 300); } } else if (e.t === 'throwLand') { ring(e.x, e.y, e.r, '#ffb347', 0.6); ring(e.x, e.y, e.r * 0.5, '#ffffff', 0.35); floatNum(e.x, e.y, '넘어뜨림' + (e.n ? ' +' + e.n : ''), null, 1.15, true, true); if (W3()) { W3().shake(0.35); W3().hold(70); } sfx('hit'); } else if (e.t === 'shove') { ring(e.x, e.y, 1.6 * U.KDV(), '#ff8a5a', 0.4); floatNum(e.x, e.y, '밀치기', null, 1, true, true); if (W3()) { W3().shake(0.2); } sfx('hit'); } else if (e.t === 'grabCd') { floatNum(pos.x, pos.y, '✊ ' + Math.ceil(e.left) + '초', null, 0.9, false, true); }   // W-0277 잡기·던지기·밀치기 화면
      else if (e.t === 'tell') { A2('fc' + e.uid, 'attack', 700); if (W3()) { W3().playAnim('fc' + e.uid, 'attack', 700); } }
      else if (e.t === 'strike') { if (e.r) { ring(e.x, e.y, e.r, '#ff4d4d', 0.3); } }
      else if (e.t === 'siege') { floatNum(e.x, e.y + 1.5, '-' + e.dmg, null, 0.9, false); c.emit('field:siege', e); }   // ⑲-16 제단이 맞았다(story.js)
      else if (e.t === 'hurt' && !e.dmg) { floatNum(pos.x, pos.y, '막음', 'rock', 1, true, true); }
      else if (e.t === 'hurt') {
        floatNum(pos.x, pos.y, '-' + e.dmg, e.el, 1, false, true);
        A2('me', 'hit', 260); if (W3()) { W3().playAnim('me', 'hit', 260); W3().shake(0.25); } else if (global.DG.juice2d) { global.DG.juice2d.shake(7); } sfx('sx:sfx_sword_hurt_' + (1 + (e.dmg & 1)));   // W-0170 내가 맞는 소리
      } else if (e.t === 'evade') { floatNum(pos.x, pos.y, '회피!', null, 1.1, true, true); } else if (e.t === 'parry') { floatNum(e.x, e.y, '쳐냄!', null, 1.5, true); ring(e.x, e.y, 2.2, '#ffe7a3', 0.4); if (W3()) { W3().hold(140); } else if (global.DG.juice2d) { global.DG.juice2d.hold(140); global.DG.juice2d.shake(5); } sfx('sx:sfx_dodge'); } else if (e.t === 'envShock') { floatNum(e.x, e.y, '물 타고 ' + e.n, 'elec', 1.2, true); }   // W-0375 · W-0374
      else if (e.t === 'swap') {
        var sm = U.S().party[e.idx];
        if (e.forced) { toast('앞사람이 쓰러졌다. 이제 ' + sm.name + ' 차례다'); }
        ring(pos.x, pos.y, 1.6, EL[sm.el].color, 0.35);
      } else if (e.t === 'down') {
        var dm = U.S().party[e.idx];
        c.log(dm.name + ' 쓰러짐 (들판 전투)', 'battle');
      } else if (e.t === 'wipe') {
        var inDm = !!(global.DG.domain && global.DG.domain.active());      // ⑲-9 숨은 터 실패는 흘림 없음
        var D = global.DG.drop, lost = !inDm && D && D.lose ? D.lose() : null;
        c.emit('field:wipe', {});
        toast('모두 쓰러져 물러났다' + (lost ? '. 금 ' + lost.gold + ' 을 흘렸지만 되찾을 수 있다' : ''));
        c.log('들판 전투 전멸: 30% 로 일어났다', 'battle');
      } else if (e.t === 'yield') {
        floatNum(e.x, e.y, '굴복!', null, 1.6, true);
        ring(e.x, e.y, 3, '#f5b445', 0.7);
        if (W3()) { W3().shake(0.4); W3().hold(160); }
        sfx('reward');
      } else if (e.t === 'duelEnd') {
        var ENC = global.DG.encounter;
        if (ENC && ENC.duelResult) { ENC.duelResult(e.result, e.spawnUid, e.heroId); }
      } else if (e.t === 'kill' && (String(e.camp).indexOf('dm:') === 0 || String(e.camp).indexOf('sq:') === 0)) {
        /* ⑲-9 숨은 터 적 — 전리품·경험·무리 기록 없음(domain.js 가 파도·터 기운을 본다) */
        if (global.DG.daily) { global.DG.daily.progress('hunt'); }
        c.emit('field:kill', e);
      } else if (e.t === 'kill') {
        var gold = killGold(e.tier), exp = Math.round(6 * e.tier * FOES[e.kind].exp);
        c.save.player.gold = (c.save.player.gold || 0) + gold;
        if (c.gainExp) { c.gainExp(Math.max(1, Math.round(exp / 2))); }
        for (var j = 0; j < U.S().party.length; j++) {
          if (U.S().party[j].id !== '_me' && !U.S().party[j].down && H && H.gainExp) { H.gainExp(U.S().party[j].id, exp); }
        }
        if (e.elite || e.boss) { c.save.dust = (c.save.dust || 0) + (e.boss ? 6 : 2); }
        if (e.shield && global.DG.talent) {                       // ⑲-4 방패 두른 원소 괴물 — 무예 쪽지
          var tmTxt = global.DG.talent.onElite();
          if (global.DG.weapon) { global.DG.weapon.onElite(); }                  // ⑲-5 강화석 1
          if (global.DG.artifact) { tmTxt += ' · ' + global.DG.artifact.onElite(); }   // ⑲-5 보패 ★4
          if (tmTxt) { floatNum(e.x, e.y + 1.2, tmTxt, null, 0.9, false); }
        }
        if (global.DG.cooking) { var mt6 = global.DG.cooking.onKill(e.kind); if (mt6) { floatNum(e.x, e.y + 2.2, mt6, null, 0.85, false); } }   // ⑲-6 짐승 고기
        fieldSave().kills = (fieldSave().kills || 0) + 1;
        if (global.DG.daily) { global.DG.daily.progress('hunt'); }    // ⑲-8 일일 의뢰
        c.emit('field:kill', e);                                       // ⑲-25 업적(원소 괴물·큰 적) — 숨은 터 onKill 은 제 캠프만 본다
        floatNum(e.x, e.y, '+' + gold + '금', null, 0.9, false);
      } else if (e.t === 'clear' && (e.kind === 'domain' || e.kind === 'story')) {
        c.emit('field:clear', e);                                      // ⑲-9 숨은 터 파도 — 보상은 보상 나무에서
      } else if (e.t === 'clear' && e.kind === 'guard') {
        var gs = fieldSave(), rk = e.camp.slice(2), again = !!gs.guards[rk];
        gs.guards[rk] = Date.now();
        delete gs.guardPaid[rk];                                        // ⑲-10 보상 꽃이 다시 핀다(fieldboss.js)
        gs.clears = (gs.clears || 0) + 1;
        /* ⑲-10 다시 선 수호자는 토벌 금·단사·경험이 없다 — 보상은 꽃에서(원기 30) */
        var gl = again ? { gold: 0, dust: 0 } : clearLoot('guard', e.tier), gg = gl.gold, gd = gl.dust;
        c.save.player.gold = (c.save.player.gold || 0) + gg;
        c.save.dust = (c.save.dust || 0) + gd;
        if (c.gainExp && !again) { c.gainExp(30 * e.tier); }
        var BMg = global.DG.biome, pr = rk.split('_'), rc = BMg && BMg.cellAt ? BMg.cellAt(+pr[0], +pr[1]) : null;
        toast((rc ? rc.name + ' ' : '') + '수호자 토벌!' + (again ? '' : ' 금 +' + gg + ' · 단사 +' + gd) + '. 보상 꽃이 피었다');
        c.log('지역 수호자 토벌' + (rc ? ': ' + rc.name : '') + ' (등급 ' + e.tier + '), 금 +' + gg, 'battle');
        sfx('reward');
        c.emit('field:guard', { region: rk, tier: e.tier }); if (global.DG.drop && global.DG.drop.win) { global.DG.drop.win(); }   // W-0247
        c.persist();
      } else if (e.t === 'clear') {
        var fs = fieldSave();
        fs.camps[e.camp] = Date.now();
        fs.clears = (fs.clears || 0) + 1;
        var cl = clearLoot(e.kind, e.tier), bonus = cl.gold, cd = cl.dust;
        c.save.player.gold = (c.save.player.gold || 0) + bonus;
        c.save.dust = (c.save.dust || 0) + cd;
        var label = e.kind === 'boss' ? '우두머리' : (e.kind === 'elite' ? '정예 무리' : '무리');
        toast(label + ' 토벌! 금 +' + bonus + ' · 단사 +' + cd); if (global.DG.goRank) { global.DG.goRank.onClear(e, bonus, cd); }   // W-0379 등급 한 줄·덤
        c.log('들판 ' + label + ' 토벌 (등급 ' + e.tier + '): 금 +' + bonus, 'battle');
        sfx('reward'); if (global.DG.drop && global.DG.drop.win) { global.DG.drop.win(); }   // W-0247 들판 무리를 쓰러뜨려도 떨어진 짐을 되찾는다(들판에서 진 짐을 들판에서 — 회복 고리 ≤2분)
        c.emit('field:clear', e);
        c.persist();
      }
    }
  }

  /** 입력 한 번 — 버튼·키·자동이 다 이 길로 온다 */

  return { handle: handle };
  } };
})(window);
