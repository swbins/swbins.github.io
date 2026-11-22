/**
 * 1만리 들판 전투 손 공격 — 조준 사격(⑲-22)·화살·강공격·낙하 공격·스킬. field-combat.js 에서 떼어 냄(R-4 11-17).
 * 몸통은 글자 그대로(바뀌는 이름 없음 만 U.이름() — 부를 때마다). 바깥 이름은 U 로 받는다(같은 객체·함수). 원래 파일은 같은 이름 한 줄 넘김(처음 부를 때 make).
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.fieldAim = { make: function (U) {
  function core() { return global.DG.core; }   // field-combat.js 와 같은 꼴(함수)
  var AIM_FULL = U.AIM_FULL, AIM_R = U.AIM_R, ARROW_V = U.ARROW_V, BODY = U.BODY, CHARGE_MUL = U.CHARGE_MUL, DASH_LEN = U.DASH_LEN, DASH_T = U.DASH_T, ENERGY_MAX = U.ENERGY_MAX, FIELD_R = U.FIELD_R, FOES = U.FOES, LUNGE_R = U.LUNGE_R, PLUNGE_MAX_M = U.PLUNGE_MAX_M, PLUNGE_PER_M = U.PLUNGE_PER_M, SKILL_AIM = U.SKILL_AIM, SKILL_CD = U.SKILL_CD, SKILL_MUL = U.SKILL_MUL, SKILL_R = U.SKILL_R, SUMMON_T = U.SUMMON_T, THRUST_LEN = U.THRUST_LEN, active = U.active, foesWithin = U.foesWithin, hitFoe = U.hitFoe, infEl = U.infEl, infM = U.infM, kitSkill = U.kitSkill, living = U.living, nearestFoe = U.nearestFoe, on = U.on, push = U.push, rainFollow = U.rainFollow, segDist = U.segDist, staSave = U.staSave, stepZones = U.stepZones, AIM_CONE = U.AIM_CONE, AIM_FULLMUL = U.AIM_FULLMUL, AIM_GAP = U.AIM_GAP, AIM_PART = U.AIM_PART, AIM_TURN = U.AIM_TURN, ARROW_EL_R = U.ARROW_EL_R, ARROW_RANGE = U.ARROW_RANGE, CHARGE_ARC = U.CHARGE_ARC, CHARGE_COST = U.CHARGE_COST, CHARGE_REACH = U.CHARGE_REACH, DASH_MUL = U.DASH_MUL, DASH_W = U.DASH_W, FIELD_T = U.FIELD_T, PLUNGE_MUL = U.PLUNGE_MUL, PLUNGE_R = U.PLUNGE_R, SUMMON_R = U.SUMMON_R, THRUST_MUL = U.THRUST_MUL, THRUST_W = U.THRUST_W;

  /* ── ⑲-22 조준 사격 ─────────────────────────────────── */
  function canAim(S) { var m = active(S); return !!(m && !m.down && m.wtype === 'bow'); }
  /** 조준에 잠길 것 — 살아 있는 적 + 상자 과녁·석등(treasure) + 이야기 석등·제단(story) [{kind, x, y, uid?}] */
  function aimCands(S, px, py) {
    var out = living(S).map(function (f) { return { kind: 'foe', uid: f.uid, x: f.x, y: f.y }; });
    var TR = global.DG.treasure, ST = global.DG.story;
    if (TR && TR.aimPoints) { out = out.concat(TR.aimPoints(px, py, AIM_R())); }
    if (ST && ST.aimPoints) { out = out.concat(ST.aimPoints()); }
    return out;
  }
  /** 겨눈 쪽 AIM_CONE 안 AIM_R 안에서 각이 가장 작은 것에 잠근다 */
  function aimLock(S, px, py) {
    var a = S.aim, best = null, bs = Infinity, L = aimCands(S, px, py), cc = Math.cos(AIM_CONE());
    for (var i = 0; i < L.length; i++) {
      var c = L[i], dx = c.x - px, dy = c.y - py, d = Math.hypot(dx, dy);
      if (d < 1 * U.KDV() || d > AIM_R()) { continue; }
      var cs = (dx * a.dx + dy * a.dy) / d;
      if (cs < cc) { continue; }
      var sc = Math.acos(Math.min(1, cs)) * 20 + d * 0.01;
      if (sc < bs) { bs = sc; best = c; }
    }
    a.lock = best;
    return best;
  }
  /** 조준에 들어간다 — 가까운 적 쪽(없으면 마지막으로 움직인 쪽) */
  function aimStart(S, px, py) {
    if (!canAim(S) || S.aim) { return { ok: false }; }
    var n = nearestFoe(S, px, py, AIM_R()), dx = n ? n.x - px : (S.lastDx || 0), dy = n ? n.y - py : (S.lastDy || 1), dl = Math.hypot(dx, dy) || 1;
    S.aim = { dx: dx / dl, dy: dy / dl, t: 0, hold: false, auto: false, lock: null };
    aimLock(S, px, py);
    push(S, { t: 'aim', on: true });
    return { ok: true };
  }
  function aimEnd(S) { if (!S.aim) { return false; } S.aim = null; push(S, { t: 'aim', on: false }); return true; }
  /** 방향 키로 겨눈 쪽을 돌린다 — 누른 쪽으로 초당 AIM_TURN 라디안까지 */
  function aimSteer(S, ux, uy, dt) {
    var a = S.aim, l = Math.hypot(ux, uy);
    if (!a || l < 1e-6) { return false; }
    var cur = Math.atan2(a.dy, a.dx), want = Math.atan2(uy / l, ux / l), d = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
    var k = Math.max(-AIM_TURN() * (dt || 0), Math.min(AIM_TURN() * (dt || 0), d)), ang = cur + k;
    a.dx = Math.cos(ang); a.dy = Math.sin(ang);
    return true;
  }
  /** 충전 시작 */
  function aimHold(S) { if (!S.aim) { return false; } S.aim.hold = true; S.aim.t = 0; return true; }
  /** 쏜다 — 잠긴 것 쪽으로(점 과녁이면 그 자리에서 멈춘다), 없으면 겨눈 쪽 ARROW_RANGE */
  function aimShoot(S, px, py) {
    var a = S.aim, m = active(S);
    if (!a || !m || m.down || S.atkCd > 0) { return { ok: false }; }
    var full = a.hold && a.t >= AIM_FULL() - 1e-9, lk = a.lock;
    var tx = lk ? lk.x : px + a.dx * ARROW_RANGE(), ty = lk ? lk.y : py + a.dy * ARROW_RANGE();
    var dx = tx - px, dy = ty - py, dl = Math.hypot(dx, dy) || 1;
    if (!S.arrows) { S.arrows = []; }
    S.arrows.push({ x: px, y: py, dx: dx / dl, dy: dy / dl, left: lk && lk.kind !== 'foe' ? dl : ARROW_RANGE(), full: full, m: m });
    a.t = 0; a.hold = false; S.atkCd = AIM_GAP();
    push(S, { t: 'shoot', x: px, y: py, tx: tx, ty: ty, full: full, el: full ? m.el : null });
    return { ok: true, full: full, lock: lk ? lk.kind : null };
  }
  function foeR(f) { return Math.max(0.6, ((FOES[f.kind] && FOES[f.kind].h) || 1) * 0.55) * U.KDV(); }
  /** 화살이 적에 박힌다 — 충전이면 원소 ×1.25, 모르는 적(쉬는 중)이면 급소, 덜 찼으면 물리 ×0.45 */
  function arrowHit(S, r, f) {
    var m = r.m, weak = r.full && f.st === 'idle';
    var out = hitFoe(S, f, m, m.atk * (r.full ? AIM_FULLMUL() : AIM_PART()) * infM(m), r.full ? m.el || null : infEl(m), 'heavy', weak);
    if (weak) { push(S, { t: 'weak', uid: f.uid, x: f.x, y: f.y }); }
    rainFollow(S, f.x, f.y);                                        // ⑲-17 뱃노래
    m.energy = Math.min(ENERGY_MAX(), m.energy + 2 * (m.er || 1));
    return out;
  }
  /** 화살 한 박자 — 길 위 첫 적에 박히거나, 과녁을 켜거나, 다 날면 멈춘다. 멈춘 자리 = 'arrow'(충전이면 원소 신호) */
  function stepArrows(S, dt) {
    var A = S.arrows || [], TR = global.DG.treasure;
    for (var i = A.length - 1; i >= 0; i--) {
      var r = A[i], go = Math.min(r.left, ARROW_V() * dt), x1 = r.x + r.dx * go, y1 = r.y + r.dy * go, hf = null, bt = Infinity;
      var L = living(S);
      for (var j = 0; j < L.length; j++) {
        var f = L[j];
        if (segDist(f.x, f.y, r.x, r.y, x1, y1) > foeR(f)) { continue; }
        var al = (f.x - r.x) * r.dx + (f.y - r.y) * r.dy;
        if (al < bt) { bt = al; hf = f; }
      }
      if (hf) {
        arrowHit(S, r, hf);
        push(S, { t: 'arrow', x: hf.x, y: hf.y, el: r.full ? r.m.el : null, r: ARROW_EL_R(), hit: hf.uid });
        A.splice(i, 1); continue;
      }
      var nT = TR && TR.shootSeg ? TR.shootSeg(r.x, r.y, x1, y1) : 0;
      r.x = x1; r.y = y1; r.left -= go;
      if (nT > 0 || r.left <= 1e-6) {
        push(S, { t: 'arrow', x: r.x, y: r.y, el: r.full ? r.m.el : null, r: ARROW_EL_R(), target: nT });
        A.splice(i, 1);
      }
    }
  }

  /**
   * ⑲-2 강공격 — 공격을 0.4초 넘게 누르고 있으면(런타임이 잰다). 전투 스태미나 20, 가장 가까운 적 쪽
   * 앞 넓게(3.2m, 앞뒤 내적 −0.2 이상) ×1.3 물리. 콤보는 처음부터. 모자라면 { ok:false, tired:true }
   */
  function heavy(S, px, py) {
    var m = active(S); if (global.DG.mountCombat && global.DG.mountCombat.riding()) { return global.DG.mountCombat.charge(S, px, py); }
    if (!m || m.down) { return { ok: false }; }
    var cc = CHARGE_COST() * staSave();
    if (S.stamina < cc) { push(S, { t: 'tired' }); return { ok: false, tired: true }; }
    S.stamina -= cc; S.staT = 0;
    S.combo = 0; S.comboT = 9; S.atkCd = 0.5;
    var n = nearestFoe(S, px, py, LUNGE_R());
    var dx = n ? n.x - px : (S.lastDx || 0), dy = n ? n.y - py : (S.lastDy || 1), dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    var hits = living(S).filter(function (f) {
      var fx = f.x - px, fy = f.y - py, d = Math.hypot(fx, fy);
      return d - BODY(f) <= CHARGE_REACH() && (d < 0.5 * U.KDV() || (fx * dx + fy * dy) / d >= CHARGE_ARC());
    });
    for (var i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * CHARGE_MUL() * infM(m), infEl(m), 'heavy'); }
    if (hits.length) { rainFollow(S, px, py); }                     // ⑲-17 뱃노래
    m.energy = Math.min(ENERGY_MAX(), m.energy + 1.5 * hits.length * (m.er || 1));
    push(S, { t: 'heavy', x: px + dx * 1.2, y: py + dy * 1.2, r: 1.8, n: hits.length, w: m.wtype });
    return { ok: true, n: hits.length };
  }

  /** ⑲-2 낙하 공격 — 내리꽂아 땅에 닿은 자리 둘레 3.5m, ×(1.2 + 0.1×떨어진 m, 15m 까지) 물리 */
  function plungeMul(fell) { return PLUNGE_MUL() + PLUNGE_PER_M() * Math.max(0, Math.min(PLUNGE_MAX_M(), fell || 0)); }
  function plunge(S, px, py, fell) {
    var m = active(S);
    if (!m || m.down) { return { ok: false }; }
    var mul = plungeMul(fell), hits = foesWithin(S, px, py, PLUNGE_R());
    for (var i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * mul * infM(m), infEl(m), 'heavy'); }
    if (hits.length) { rainFollow(S, px, py); }                     // ⑲-17 뱃노래
    m.energy = Math.min(ENERGY_MAX(), m.energy + 1.5 * hits.length * (m.er || 1));
    push(S, { t: 'plunge', x: px, y: py, r: PLUNGE_R(), n: hits.length, mul: mul });
    return { ok: true, n: hits.length, mul: mul };
  }

  /** 원소 스킬 — 겨눈 적 둘레 4.5m 에 원소를 붙인다. 기력 +6(+2/마리), 대기 동료 +3 */
  function skill(S, px, py) {
    var m = active(S);
    if (!m || m.down || m.skillCd > 0) { return { ok: false, cd: m ? m.skillCd : 0 }; }
    if (m.kitS) { return kitSkill(S, m, px, py); }                   // ⑲-11 고유·갈래
    var aim = nearestFoe(S, px, py, SKILL_AIM());
    var cx = aim ? aim.x : px, cy = aim ? aim.y : py;
    var sh = m.shape || 'circle', hits = [], i, ev;
    /* 겨눈 쪽 — 적이 없으면 마지막으로 움직인(회피한) 쪽, 그것도 없으면 +y */
    var dx = cx - px, dy = cy - py, dl = Math.hypot(dx, dy);
    if (dl < 1e-6) { dx = S.lastDx || 0; dy = S.lastDy || 1; dl = Math.hypot(dx, dy) || 1; }
    dx /= dl; dy /= dl;
    if (sh === 'thrust') {
      var ex = px + dx * THRUST_LEN(), ey = py + dy * THRUST_LEN();
      hits = living(S).filter(function (f) { return segDist(f.x, f.y, px, py, ex, ey) <= THRUST_W() + (U.KDV() > 1 ? BODY(f) : 0); });   // W-0233 2D 는 몸 가장자리까지(3D 는 옛 그대로)
      for (i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * THRUST_MUL(), m.el, 'skill'); }
      ev = { x: ex, y: ey, x0: px, y0: py, r: THRUST_W() };
    } else if (sh === 'dash') {
      var go = aim ? Math.min(DASH_LEN(), Math.max(0, dl - 1.2 * U.KDV() - (U.KDV() > 1 ? BODY(aim) : 0))) : DASH_LEN();
      var bx = px + dx * go, by = py + dy * go;
      hits = living(S).filter(function (f) { return segDist(f.x, f.y, px, py, bx + dx * 1.2 * U.KDV(), by + dy * 1.2 * U.KDV()) <= DASH_W() + (U.KDV() > 1 ? BODY(f) : 0); });
      for (i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * DASH_MUL(), m.el, 'skill'); }
      S.dash = { vx: dx * go / DASH_T(), vy: dy * go / DASH_T(), t: DASH_T() };
      S.iframe = Math.max(S.iframe, 0.3);
      ev = { x: bx, y: by, x0: px, y0: py, r: DASH_W() };
    } else if (sh === 'field') {
      S.zones.push({ kind: 'field', x: cx, y: cy, r: FIELD_R(), t: FIELD_T(), next: 0, el: m.el, atk: m.atk, em: m.em, uid: m.id, tm: m.tm, reactMul: m.reactMul, m: m });
      hits = foesWithin(S, cx, cy, FIELD_R());          // 기력 셈에만 — 피해는 zone 틱(바로 첫 틱)이 준다
      ev = { x: cx, y: cy, r: FIELD_R() };
    } else if (sh === 'summon') {
      S.zones.push({ kind: 'summon', x: px + dx * 1.5 * U.KDV(), y: py + dy * 1.5 * U.KDV(), r: SUMMON_R(), t: SUMMON_T(), next: 0, el: m.el, atk: m.atk, em: m.em, uid: m.id, tm: m.tm, reactMul: m.reactMul, m: m });
      hits = aim ? [aim] : [];
      ev = { x: px + dx * 1.5 * U.KDV(), y: py + dy * 1.5 * U.KDV(), r: SUMMON_R() };
    } else {
      hits = foesWithin(S, cx, cy, SKILL_R());
      for (i = 0; i < hits.length; i++) { hitFoe(S, hits[i], m, m.atk * SKILL_MUL(), m.el, 'skill'); }
      ev = { x: cx, y: cy, r: SKILL_R() };
    }
    if (sh === 'field' || sh === 'summon') { stepZones(S, 0); }   // 놓자마자 첫 틱
    m.skillCd = m.skCdMax = SKILL_CD() * (m.cdMul || 1);        // ⑲-4 깨달음 1 — 대기 -15%
    m.energy = Math.min(ENERGY_MAX(), m.energy + (6 + Math.min(6, hits.length * 2)) * (m.er || 1));
    for (var j = 0; j < S.party.length; j++) {
      var o = S.party[j];
      if (j !== S.active && !o.down) { o.energy = Math.min(ENERGY_MAX(), o.energy + 3 * (o.er || 1)); }
    }
    push(S, { t: 'skill', el: m.el, shape: sh, x: ev.x, y: ev.y, x0: ev.x0, y0: ev.y0, r: ev.r, n: hits.length });
    return { ok: true, n: hits.length, shape: sh };
  }


  return { canAim: canAim, aimCands: aimCands, aimLock: aimLock, aimStart: aimStart, aimEnd: aimEnd, aimSteer: aimSteer, aimHold: aimHold, aimShoot: aimShoot, foeR: foeR, arrowHit: arrowHit, stepArrows: stepArrows, heavy: heavy, plungeMul: plungeMul, plunge: plunge, skill: skill };
  } };
})(window);
