/**
 * 1만리 들판 전투 무예 키트 — 지키기·밀어냄·비 따라오기·키트 스킬·키트 원소 폭발·장판(zones) 걸음·원소 폭발(burst). field-combat.js 에서 떼어 냄(R-4 11-17).
 * 몸통은 글자 그대로(바뀌는 이름 없음 만 U.이름() — 부를 때마다). 바깥 이름은 U 로 받는다(같은 객체·함수). 원래 파일은 같은 이름 한 줄 넘김(처음 부를 때 make).
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.fieldKits = { make: function (U) {
  function core() { return global.DG.core; }   // field-combat.js 와 같은 꼴(함수)
  var BODY = U.BODY, BURST_CD = U.BURST_CD, BURST_MUL = U.BURST_MUL, BURST_R = U.BURST_R, DASH_T = U.DASH_T, ENERGY_MAX = U.ENERGY_MAX, FOES = U.FOES, KB_T = U.KB_T, SKILL_AIM = U.SKILL_AIM, active = U.active, foesWithin = U.foesWithin, hitFoe = U.hitFoe, living = U.living, nearestFoe = U.nearestFoe, push = U.push, rawHit = U.rawHit, segDist = U.segDist, wake = U.wake, FIELD_MUL = U.FIELD_MUL, SUMMON_EVERY = U.SUMMON_EVERY, SUMMON_MUL = U.SUMMON_MUL;

  function giveGuard(S, m, pct, sec) {
    var gh = Math.round(m.hpMax * pct), G = S.guard;
    S.guard = { hp: Math.max(gh, G ? G.hp : 0), max: Math.max(gh, G ? G.max : 0), t: Math.max(sec, G ? G.t : 0) };
  }
  /** ⑲-17 밀어냄 — (ux,uy) 쪽으로 dist m 를 KB_T 초에 미끄러진다. 우두머리·보스·굴복한 인물은 안 밀린다 */
  function knock(f, ux, uy, dist) {
    if (!f || f.dead || f.st === 'yield' || FOES[f.kind].boss || !dist) { return; }
    f.kb = { vx: ux * dist / KB_T, vy: uy * dist / KB_T, t: KB_T };
  }
  /**
   * ⑲-17 뱃노래 따라 치기 — 기본·강·낙하 공격이 맞은 뒤 부른다. 쉼(gap)이 끝났으면 reach 안 가까운 적 n 에
   * 놓은 인물(rainM)의 공격력으로 물 노 한 대씩(원소 부착·치명은 그 인물 것)
   */
  function rainFollow(S, px, py) {
    var k = S.rainK, rm = S.rainM;
    if (!(S.rainT > 0) || S.rainCd > 0 || !k || !rm) { return 0; }
    var tg = living(S).filter(function (f) { return Math.hypot(f.x - px, f.y - py) <= k.reach; })
      .sort(function (a, b) { return Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py); }).slice(0, k.n);
    if (!tg.length) { return 0; }
    S.rainCd = k.gap;
    for (var i = 0; i < tg.length; i++) {
      hitFoe(S, tg[i], rm, rm.atk * k.rmul, rm.el, 'burst');
      push(S, { t: 'zone', kind: 'rain', el: rm.el, x: tg[i].x, y: tg[i].y, r: 1.2, n: 1 });
    }
    return tg.length;
  }
  /** ⑲-11 원소 덧붙임 — 물결 회복(명단)·번개 기력(다른 인물) */
  function kitExtras(S, m, k) {
    for (var i = 0; i < S.party.length; i++) {
      var o = S.party[i];
      if (o.down) { continue; }
      if (k.heal) { o.hp = Math.min(o.hpMax, o.hp + Math.round(o.hpMax * k.heal)); }
      if (k.team && o !== m) { o.energy = Math.min(ENERGY_MAX(), o.energy + k.team * (o.er || 1)); }
    }
  }
  /**
   * ⑲-11 고유·갈래 스킬(kits.js 표의 type) — 대기·기력·대기 동료 몫은 옛 스킬과 같다.
   * 깨달음 1(대기 곱)·무예 배율(출처 skill/zone)·치명·군기는 hitFoe 가 그대로 태운다.
   */
  function kitSkill(S, m, px, py) {
    var k = m.kitS, aim = nearestFoe(S, px, py, Math.max(SKILL_AIM(), k.reach || 0)), hits = [], i, ev, shape = 'circle';
    var dx = aim ? aim.x - px : 0, dy = aim ? aim.y - py : 0, dl = Math.hypot(dx, dy), far = dl;
    if (dl < 1e-6) { dx = S.lastDx || 0; dy = S.lastDy || 1; dl = Math.hypot(dx, dy) || 1; }
    dx /= dl; dy /= dl;
    if (k.type === 'dash') {
      var go = aim ? Math.min(k.len, Math.max(0, far - BODY(aim) - 1.2 * U.KDV())) : k.len, bx = px + dx * go, by = py + dy * go;
      hits = living(S).filter(function (f) { return segDist(f.x, f.y, px, py, bx + dx * 1.2 * U.KDV(), by + dy * 1.2 * U.KDV()) <= k.w + BODY(f); });
      for (i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * k.mul, m.el, 'skill'); }
      S.dash = { vx: dx * go / DASH_T(), vy: dy * go / DASH_T(), t: DASH_T() };
      S.iframe = Math.max(S.iframe, 0.3);
      ev = { x: bx, y: by, x0: px, y0: py, r: k.w }; shape = 'dash';
    } else if (k.type === 'shells') {
      var tg = living(S).filter(function (f) { return Math.hypot(f.x - px, f.y - py) <= k.reach; })
        .sort(function (a, b) { return Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py); }).slice(0, k.n);
      var spots = tg.length ? tg.map(function (f) { return { x: f.x, y: f.y }; }) : [{ x: px + dx * 8 * U.KDV(), y: py + dy * 8 * U.KDV() }];
      for (i = 0; i < spots.length; i++) {
        S.zones.push({ kind: 'shell', x: spots[i].x, y: spots[i].y, r: k.r, t: k.delay, el: m.el, m: m, mul: k.mul });
      }
      hits = tg;
      ev = { x: spots[0].x, y: spots[0].y, r: k.r };
    } else if (k.type === 'guard') {
      hits = foesWithin(S, px, py, k.r);
      for (i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * k.mul, m.el, 'skill'); }
      giveGuard(S, m, k.shield + (k.shieldAdd || 0), k.sec);
      ev = { x: px, y: py, r: k.r };
    } else if (k.type === 'blink') {
      /* ⑲-15 그림자 걸음 — 가까운 적을 지나 그 뒤 back m 까지 돌진, 도착 둘레를 베고 그 적에 표식 */
      var bt = nearestFoe(S, px, py, k.reach), ex, ey;
      if (bt) { var bl = Math.hypot(bt.x - px, bt.y - py) || 1; ex = bt.x + (bt.x - px) / bl * k.back; ey = bt.y + (bt.y - py) / bl * k.back; }
      else { ex = px + dx * k.len; ey = py + dy * k.len; }
      var bgo = Math.hypot(ex - px, ey - py), bux = bgo > 1e-6 ? (ex - px) / bgo : dx, buy = bgo > 1e-6 ? (ey - py) / bgo : dy;
      S.dash = { vx: bux * bgo / DASH_T(), vy: buy * bgo / DASH_T(), t: DASH_T() };
      S.iframe = Math.max(S.iframe, 0.3);
      hits = foesWithin(S, ex, ey, k.r);
      if (bt && hits.indexOf(bt) < 0) { hits.push(bt); }
      for (i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * k.mul, m.el, 'skill'); }
      if (bt && !bt.dead) { bt.markT = k.mark; bt.markMul = k.markMul; }
      ev = { x: ex, y: ey, x0: px, y0: py, r: k.r }; shape = 'dash';
    } else if (k.type === 'gust') {
      /* ⑲-17 부채 바람 — 앞 r 부채꼴(내적 arc 이상)을 치고 나에게서 먼 쪽으로 밀어낸다. 회복은 kitExtras(heal) */
      hits = living(S).filter(function (f) {
        var fx = f.x - px, fy = f.y - py, d = Math.hypot(fx, fy);
        return d <= k.r && (d < 0.5 * U.KDV() || (fx * dx + fy * dy) / d >= k.arc);
      });
      for (i = 0; i < hits.length; i++) {
        hitFoe(S, hits[i], m, m.atk * k.mul, m.el, 'skill');
        var gl = Math.hypot(hits[i].x - px, hits[i].y - py);
        knock(hits[i], gl > 0.5 * U.KDV() ? (hits[i].x - px) / gl : dx, gl > 0.5 * U.KDV() ? (hits[i].y - py) / gl : dy, k.knock);
      }
      ev = { x: px + dx * k.r * 0.5, y: py + dy * k.r * 0.5, r: k.r * 0.5 };
    } else if (k.type === 'updraft') {
      /* ⑲-43 별배 견인줄 — 둘레 r 적을 나 쪽으로 끌어 치고, 나는 lift m 위로 솟구쳐 날개를 편다(키보드 판 땅 위만 — landform.launch) */
      hits = foesWithin(S, px, py, k.r);
      for (i = 0; i < hits.length; i++) {
        hitFoe(S, hits[i], m, m.atk * k.mul, m.el, 'skill');
        var ul = Math.hypot(hits[i].x - px, hits[i].y - py);
        if (ul > 1.2 * U.KDV()) { knock(hits[i], (px - hits[i].x) / ul, (py - hits[i].y) / ul, Math.min(k.pull, ul - 1.2 * U.KDV())); }
      }
      var LFu = global.DG.landform;
      S.lifted = !!(LFu && LFu.launch && LFu.launch(k.lift));
      ev = { x: px, y: py, r: k.r };
    } else if (k.type === 'wave') {
      /* ⑲-17 노 물결 — 앞으로 len·폭 w 의 길을 치고 앞으로 밀어낸다(나는 제자리) */
      var wx = px + dx * k.len, wy = py + dy * k.len;
      hits = living(S).filter(function (f) { return segDist(f.x, f.y, px, py, wx, wy) <= k.w; });
      for (i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * k.mul, m.el, 'skill'); knock(hits[i], dx, dy, k.knock); }
      ev = { x: wx, y: wy, x0: px, y0: py, r: k.w }; shape = 'thrust';
    } else {
      S.zones.push({ kind: 'kitzone', x: px, y: py, r: k.r, t: k.sec, next: 0, every: k.every, n: k.n, mul: k.mul, energy: k.energy || 0, el: m.el, atk: m.atk, m: m });
      hits = foesWithin(S, px, py, k.r);
      stepZones(S, 0);                                                // 놓자마자 첫 틱
      ev = { x: px, y: py, r: k.r }; shape = 'field';
    }
    if (k.shieldAdd && k.type !== 'guard') { giveGuard(S, m, k.shieldAdd, 12); }   // 바위 — 방패 틀이 아니면 새 보호막
    kitExtras(S, m, k);
    m.skillCd = m.skCdMax = Math.max(1, k.cd) * (m.cdMul || 1);
    m.energy = Math.min(ENERGY_MAX(), m.energy + (6 + Math.min(6, hits.length * 2)) * (m.er || 1));
    for (var j = 0; j < S.party.length; j++) {
      var o = S.party[j];
      if (j !== S.active && !o.down) { o.energy = Math.min(ENERGY_MAX(), o.energy + 3 * (o.er || 1)); }
    }
    push(S, { t: 'skill', el: m.el, shape: shape, kit: k.type, name: k.name, x: ev.x, y: ev.y, x0: ev.x0, y0: ev.y0, r: ev.r, n: hits.length });
    return { ok: true, n: hits.length, shape: shape, kit: k.type, name: k.name };
  }
  /** ⑲-11 고유·갈래 해방 — 둘레 r 에 mul 한 번 + type 효과. 기력·대기·무적·깨달음 5 는 burst 가 먼저 치렀다 */
  function kitBurst(S, m, px, py) {
    var k = m.kitB, hits = foesWithin(S, px, py, k.r), i;
    for (i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * k.mul, m.el, 'burst'); }
    if (k.type === 'infuse') { m.infT = k.sec; m.infMul = k.nmul; }
    else if (k.type === 'rally') { S.rallyT = k.sec; S.rallyMul = k.atk; }
    else if (k.type === 'ward') { S.wardT = k.sec; S.wardMul = k.taken; }
    else if (k.type === 'lore') { S.loreT = k.sec; S.loreMul = k.rmul; }          // ⑲-15 옛 글자 풀이
    else if (k.type === 'feast') {                                                // ⑲-17 잔칫날 순풍 — 첫 틱은 every 뒤
      S.zones.push({ kind: 'feast', x: px, y: py, r: k.r, t: k.sec, next: k.every, every: k.every, heal: k.fheal, mul: k.emul, el: m.el, atk: m.atk, m: m });
    }
    else if (k.type === 'rain') { S.rainT = k.sec; S.rainCd = 0; S.rainM = m; S.rainK = k; }   // ⑲-17 뱃노래
    else if (k.type === 'echo') {
      /* ⑲-15 가면 벗기 — reach 안 표식 난 적마다 every 초 간격 메아리 n(적을 따라감), 없으면 가까운 둘 */
      var near = living(S).filter(function (f) { return Math.hypot(f.x - px, f.y - py) <= k.reach; })
        .sort(function (a, b) { return Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py); });
      var marked = near.filter(function (f) { return f.markT > 0; }), tgs = marked.length ? marked : near.slice(0, 2), e2;
      for (i = 0; i < tgs.length; i++) {
        for (e2 = 1; e2 <= k.n; e2++) { S.zones.push({ kind: 'echo', uid: tgs[i].uid, x: tgs[i].x, y: tgs[i].y, r: 1.2 * U.KDV(), t: k.every * e2, el: m.el, m: m, mul: k.emul }); }
      }
    }
    else if (k.type === 'haste') {
      S.hasteT = k.sec;
      for (i = 0; i < S.party.length; i++) { var o = S.party[i]; if (o !== m && !o.down) { o.energy = Math.min(ENERGY_MAX(), o.energy + k.energy * (o.er || 1)); } }
    } else if (k.type === 'vortex') {
      var n = nearestFoe(S, px, py, 12 * U.KDV()), dx = n ? n.x - px : (S.lastDx || 0), dy = n ? n.y - py : (S.lastDy || 1), dl = Math.hypot(dx, dy) || 1;
      S.zones.push({ kind: 'vortex', x: px + dx / dl * k.ahead, y: py + dy / dl * k.ahead, r: k.r, t: k.sec, next: k.every, every: k.every,
        mul: k.tick, pull: k.pull, el: m.el, atk: m.atk, m: m });
    }
    kitExtras(S, m, k);
    push(S, { t: 'burst', el: m.el, x: px, y: py, r: k.r, n: hits.length, name: k.name, kit: k.type });
    return { ok: true, n: hits.length, name: k.name, kit: k.type };
  }

  /** 장판·소환 — 놓은 사람 공격력으로 틱마다 친다(그 사이 교체해도 남는다) */
  function stepZones(S, dt) {
    var Z = S.zones || [], i, k;
    for (i = Z.length - 1; i >= 0; i--) {
      var z = Z[i];
      z.t -= dt; z.next -= dt;
      if (z.kind === 'seed') {
        /* ⑲-1 꽃피움 씨앗 — 1.5초 뒤 둘레 3m 에서 터진다 */
        if (z.t <= 1e-9) {
          var sn = foesWithin(S, z.x, z.y, z.r);
          for (k = 0; k < sn.length; k++) { wake(sn[k]); rawHit(S, sn[k], z.dmg); }
          push(S, { t: 'zone', kind: 'seed', el: 'grass', x: z.x, y: z.y, r: z.r, n: sn.length });
          Z.splice(i, 1);
        }
        continue;
      }
      if (z.kind === 'echo') {
        /* ⑲-15 가면 벗기 메아리 — 그 적을 따라가 t 뒤에 친다(이미 쓰러졌으면 헛친다) */
        var ef = S.foes[z.uid];
        if (ef && !ef.dead) { z.x = ef.x; z.y = ef.y; }
        if (z.t <= 1e-9) {
          if (ef && !ef.dead) { hitFoe(S, ef, z.m, z.m.atk * z.mul, z.el, 'burst'); }
          push(S, { t: 'zone', kind: 'echo', el: z.el, x: z.x, y: z.y, r: z.r, n: ef && !ef.dead ? 1 : 0 });
          Z.splice(i, 1);
        }
        continue;
      }
      if (z.kind === 'shell') {
        /* ⑲-11 늦게 떨어지는 탄 — delay 뒤 둘레 r 을 친다 */
        if (z.t <= 1e-9) {
          var sh = foesWithin(S, z.x, z.y, z.r);
          for (k = 0; k < sh.length; k++) { hitFoe(S, sh[k], z.m, z.m.atk * z.mul, z.el, 'skill'); }
          push(S, { t: 'zone', kind: 'shell', el: z.el, x: z.x, y: z.y, r: z.r, n: sh.length });
          Z.splice(i, 1);
        }
        continue;
      }
      if (z.kind === 'vortex' && dt > 0) {
        /* ⑲-11 소용돌이 — 둘레 r+2 의 적을 늘 가운데로 끈다 */
        var vs = foesWithin(S, z.x, z.y, z.r + 2 * U.KDV());
        for (k = 0; k < vs.length; k++) {
          var vd = Math.hypot(z.x - vs[k].x, z.y - vs[k].y);
          if (vd > 0.6 * U.KDV()) { var pl = Math.min(vd - 0.5 * U.KDV(), z.pull * dt); vs[k].x += (z.x - vs[k].x) / vd * pl; vs[k].y += (z.y - vs[k].y) / vd * pl; }
        }
      }
      if (z.next <= 1e-9 && z.t > 1e-9) {
        var who = z.m || { atk: z.atk, em: z.em, tm: z.tm, reactMul: z.reactMul };
        if (z.kind === 'field') {
          var in_ = foesWithin(S, z.x, z.y, z.r);
          for (k = 0; k < in_.length; k++) { hitFoe(S, in_[k], who, z.atk * FIELD_MUL(), z.el, 'zone'); }
          push(S, { t: 'zone', kind: 'field', el: z.el, x: z.x, y: z.y, r: z.r, n: in_.length });
          z.next += 1;
        } else if (z.kind === 'kitzone') {
          /* ⑲-11 팔괘진 — 안의 가까운 적 n 을 치고, 맞힐 때마다 명단 기력 */
          var kz = foesWithin(S, z.x, z.y, z.r).sort(function (a, b) { return Math.hypot(a.x - z.x, a.y - z.y) - Math.hypot(b.x - z.x, b.y - z.y); }).slice(0, z.n);
          for (k = 0; k < kz.length; k++) { hitFoe(S, kz[k], who, z.atk * z.mul, z.el, 'zone'); }
          for (k = 0; k < S.party.length && kz.length && z.energy; k++) {
            var pk = S.party[k];
            if (!pk.down) { pk.energy = Math.min(ENERGY_MAX(), pk.energy + z.energy * kz.length * (pk.er || 1)); }
          }
          push(S, { t: 'zone', kind: 'kitzone', el: z.el, x: z.x, y: z.y, r: z.r, n: kz.length });
          z.next += z.every;
        } else if (z.kind === 'feast') {
          /* ⑲-17 바람 자리 — 안에 선 지금 인물 회복(지난 걸음의 내 자리), 안의 적을 친다 */
          var fa = active(S), fin = Math.hypot(S.mx - z.x, S.my - z.y) <= z.r;
          if (fa && !fa.down && fin) { fa.hp = Math.min(fa.hpMax, fa.hp + Math.round(fa.hpMax * z.heal)); }
          var fz = foesWithin(S, z.x, z.y, z.r);
          for (k = 0; k < fz.length; k++) { hitFoe(S, fz[k], who, z.atk * z.mul, z.el, 'zone'); }
          push(S, { t: 'zone', kind: 'feast', el: z.el, x: z.x, y: z.y, r: z.r, n: fz.length, heal: fin ? 1 : 0 });
          z.next += z.every;
        } else if (z.kind === 'vortex') {
          var vz = foesWithin(S, z.x, z.y, z.r);
          for (k = 0; k < vz.length; k++) { hitFoe(S, vz[k], who, z.atk * z.mul, z.el, 'zone'); }
          push(S, { t: 'zone', kind: 'vortex', el: z.el, x: z.x, y: z.y, r: z.r, n: vz.length });
          z.next += z.every;
        } else {
          var tg = nearestFoe(S, z.x, z.y, z.r);
          if (tg) {
            hitFoe(S, tg, who, z.atk * SUMMON_MUL(), z.el, 'zone');
            push(S, { t: 'zone', kind: 'summon', el: z.el, x: z.x, y: z.y, tx: tg.x, ty: tg.y, r: 1.2, n: 1 });
          }
          z.next += SUMMON_EVERY();
        }
      }
      if (z.t <= 1e-9) { Z.splice(i, 1); }
    }
  }

  /** 원소 해방 — 기력 60 을 다 쓴다. 내 둘레 7m, 1초 무적 */
  function burst(S, px, py) {
    var m = active(S);
    if (!m || m.down || m.energy < ENERGY_MAX() || m.burstCd > 0) { return { ok: false }; }
    m.energy = 0; m.burstCd = BURST_CD();
    S.iframe = Math.max(S.iframe, 1.0);
    if (m.c6 && global.DG.talent) { m.c6T = global.DG.talent.C6_SEC; }   // ⑲-4 깨달음 5 — 해방 뒤 공격 +20%
    if (m.kitB) { return kitBurst(S, m, px, py); }                    // ⑲-11 고유·갈래
    var hits = foesWithin(S, px, py, BURST_R());
    for (var i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * BURST_MUL(), m.el, 'burst'); }
    push(S, { t: 'burst', el: m.el, x: px, y: py, r: BURST_R(), n: hits.length });
    return { ok: true, n: hits.length };
  }

  /** 회피 — 스태미나 20, 0.35초 무적, 3.6m 미끄러진다. 방향이 없으면 가장 가까운 적 반대로 */

  return { giveGuard: giveGuard, knock: knock, rainFollow: rainFollow, kitExtras: kitExtras, kitSkill: kitSkill, kitBurst: kitBurst, stepZones: stepZones, burst: burst };
  } };
})(window);
