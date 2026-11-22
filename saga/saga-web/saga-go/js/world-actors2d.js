/**
 * 1만리 2D 지도 — 나(주인공 몸)·들짐승·스폰(사람·짐승 몸과 이름표)·화면 벌림(spreadUV)·이웃 NPC(drawNpc)·망루·들판 적 한 마리 그리기. world.js 에서 떼어 냄(R-4 11-17). 몸통은 글자 그대로
 * (ctx·geom 만 U.ctx()·U.geom() 으로 — 캔버스·기하가 바뀔 수 있어 부를 때마다 받는다). world-sites2d.js 와 같은 make(U).
 * 바깥 것: U.project·label·bodyK·strideVK·scale·tagQ(이름표 줄, world 가 비우고 그린다)·SPAWN_LIFE·ENCOUNTER_RANGE. world.js 가 처음 그릴 때 make 한다.
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.worldActors2d = { make: function (U) {
  var core = global.DG.core, data = global.DG.data, project = U.project, label = U.label, bodyK = U.bodyK, strideVK = U.strideVK, tagQ = U.tagQ,
    SPAWN_LIFE = U.SPAWN_LIFE, ENCOUNTER_RANGE = U.ENCOUNTER_RANGE;
  function scale() { return U.scale(); }
  var player = U.player;   // 고정 객체(world.js player) — mode·geoAccuracy 는 바뀌므로 U.mode()·U.geoAcc()

  function drawSpawn(s, u, v, now, pos, wsc) {   // wsc = 세계 배율(W-0203 보폭 — 안의 scale 은 지역 숫자라 scale() 을 못 부른다)
    var p = project(u, v);
    if (p.s < 0.25 || p.y < -80 || p.y > U.geom().H + 80) { return; }
    var z = core.clamp(p.s, 0.5, 1.6) * bodyK();   // W-0204
    var age = (now - s.bornAt) / SPAWN_LIFE;
    var near = Math.hypot(s.x - pos.x, s.y - pos.y) <= ENCOUNTER_RANGE;
    var sp = global.DG.sprite;
    var isHero = s.kind === 'hero';
    var scale = z * (isHero ? 1.15 : 1.35), bk = isHero || !sp.beastK ? 1 : sp.beastK(s.ref);      // 짐승은 기준 키가 작아 더 키운다 · W-0349 종마다 크기(곰 1.15·토끼 0.42…)
    var bodyH = (isHero ? 40 : 30 * bk) * scale;

    U.ctx().globalAlpha = age > 0.85 ? core.clamp(1 - (age - 0.85) / 0.15, 0.15, 1) : 1;

    // 발밑 등급 고리
    U.ctx().beginPath();
    U.ctx().ellipse(p.x, p.y, 15 * z, 6 * z, 0, 0, Math.PI * 2);
    U.ctx().fillStyle = near ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.34)';
    U.ctx().fill();
    U.ctx().strokeStyle = data.rarity[s.ref.rarity].color;
    U.ctx().lineWidth = (near ? 2.8 : 1.6) * z;
    U.ctx().stroke();
    if (near) {
      U.ctx().beginPath();
      U.ctx().ellipse(p.x, p.y, 22 * z, 9 * z, 0, 0, Math.PI * 2);
      U.ctx().strokeStyle = 'rgba(255,255,255,' + (0.18 + Math.abs(Math.sin(now / 420)) * 0.22) + ')';
      U.ctx().lineWidth = 1.5 * z;
      U.ctx().stroke();
    }

    U.ctx().beginPath();
    U.ctx().ellipse(p.x, p.y - bodyH * 0.45, bodyH * 0.34, bodyH * 0.52, 0, 0, Math.PI * 2); if (global.DG.stealth) { global.DG.stealth.mark2d(U.ctx(), s, p.x, p.y - bodyH * 1.15, bodyH); }   // W-0286 들킴 ❗
    U.ctx().fillStyle = 'rgba(0,0,0,0.22)';
    if (!(global.DG.mode2d && global.DG.mode2d.scaleOn && global.DG.mode2d.scaleOn())) { U.ctx().fill(); } else if (global.DG.mode2d.shadow) { global.DG.mode2d.shadow(U.ctx(), p.x, p.y, bodyH * 0.62, { a: 0.3 }); }   /* W-0368 발 닿는 두 겹 그림자 */   // W-0349 몸 뒤 검은 타원(종이 오린 듯한 테두리) — 새 표에선 발밑 고리만

    if (!(isHero && global.DG.actor2d && global.DG.actor2d.human(U.ctx(), s.ref, null, p.x, p.y, scale, { facing: s.facing, dirX: s.dirX, dirY: s.dirY, moving: s.moving, phase: s.phase, now: now, wx: s.x, wy: s.y * strideVK(), ppu: (wsc || 1) * p.s, pk: 'sp:' + (s.id || (s.ref && s.ref.id) + ':' + s.bornAt) }))) sp.stamp(U.ctx(), {
      kind: isHero ? 'human' : 'beast', ref: s.ref, bk: bk,
      x: p.x, y: p.y, s: scale, facing: s.facing, phase: s.phase, walking: s.moving,
      color: isHero ? data.faction(s.ref.faction).color : sp.beastColorOf(s.ref),
      look: isHero ? sp.lookOf(s.ref) : null,
      form: isHero ? null : sp.beastFormOf(s.ref),
      divine: !isHero && s.ref.kind === 'divine',
      t: now
    });

    if (p.s > 0.45) { tagQ.push({ t: s.ref.name, x: p.x, y: p.y - bodyH * 1.12 - 6 * z, px: Math.round(11 * Math.min(z, 1.4)), shade: 'rgba(0,0,0,0.62)', fill: near ? '#fff' : 'rgba(255,255,255,0.78)', dist: Math.hypot(s.x - pos.x, s.y - pos.y), pri: near ? 3 : 1, ga: U.ctx().globalAlpha }); }   // W-0144 — flushTags 가 그린다 · W-0205 글자는 몸 배율(bodyK)을 1.4 까지만 · 우선 가까운 영웅 > 영웅 > 가까운 주민 > 주민
    U.ctx().globalAlpha = 1;
  }

  /**
   * 주민 한 사람. **스폰과 눈에 띄게 달라야 한다** — 잡거나 설득할 대상이 아니라
   * 그냥 여기 사는 사람이다. 그래서 발밑 등급 고리를 안 두르고(그림자만 둔다)
   * 이름표도 흐리게 단다. 가까이 가면 이름이 또렷해진다(말이 걸리는 거리다).
   */
  /** W-0369 화면에서만 사람끼리·나와 몸 폭만큼 벌린다(세계 자리·대화 거리 그대로) — 출발 자리에 촌장·상인·역참지기가 나와 한 덩어리로 겹쳐 "나"가 안 보였다. 손잡이 go.spreadPx(0 = 끔) · 나(0,0)는 안 움직임 */ function spreadUV(list, pos, sc, meFrom) { var out = [], i, j, it, a, b, dx, dy, d, k, m = +core.tuned('go.spreadPx', 46) * bodyK(); for (i = 0; i < list.length; i++) { out.push({ u: (list[i].x - pos.x) * sc, v: (list[i].y - pos.y) * sc }); } if (!(m > 0)) { return out; } for (it = 0; it < 4; it++) { for (i = 0; i < out.length; i++) { a = out[i]; for (j = -1; j < out.length; j++) { if (j === i) { continue; } if (j < 0 && meFrom != null && i >= meFrom) { continue; } b = j < 0 ? { u: 0, v: 0 } : out[j]; dx = a.u - b.u; dy = (a.v - b.v) * 1.6; d = Math.hypot(dx, dy); if (d >= m) { continue; } if (d < 0.01) { dx = i % 2 ? 1 : -1; dy = 0.3; d = Math.hypot(dx, dy); } k = (m - d) / d * (j < 0 ? 1 : 0.5); a.u += dx * k; a.v += dy * k / 1.6; } } } return out; } function drawNpc(n, u, v, now) {
    var p = project(u, v);
    if (p.s < 0.25 || p.y < -80 || p.y > U.geom().H + 80) { return; }
    var z = core.clamp(p.s, 0.5, 1.6) * bodyK();   // W-0204
    var sp = global.DG.sprite;
    var talkR = core.tuned('npc.talkRadius', 14);
    var near = n.dist <= talkR;
    var bodyH = 40 * z * 1.05;

    // 발밑 그림자 (등급 고리는 없다)
    U.ctx().beginPath();
    U.ctx().ellipse(p.x, p.y, 11 * z, 4.5 * z, 0, 0, Math.PI * 2);
    U.ctx().fillStyle = 'rgba(0,0,0,0.30)';
    if (global.DG.mode2d && global.DG.mode2d.shadow) { global.DG.mode2d.shadow(U.ctx(), p.x, p.y, 22 * z, { a: 0.3 }); } else { U.ctx().fill(); }   /* W-0368 두 겹 */

    if (!(global.DG.actor2d && global.DG.actor2d.human(U.ctx(), n.p, null, p.x, p.y, z * 1.05, { facing: n.x < 0 ? -1 : 1, moving: n.walking, phase: n.phase, now: now, wx: n.x, wy: n.y * strideVK(), ppu: scale() * p.s, town: true, pk: 'npc:' + (n.id || ((n.p && n.p.id) || '') + ':' + n.phase) }))) sp.stamp(U.ctx(), {
      kind: 'human', ref: n.p,
      x: p.x, y: p.y, s: z * 1.05, facing: n.x < 0 ? -1 : 1,
      phase: n.phase, walking: n.walking,
      /* 옷 색은 계절을 탄다 — 겨울에는 짙고 두껍다 (`season.js`) */
      color: (global.DG.season ? global.DG.season.cloth(n.p.color || '#6b6f78')
                               : (n.p.color || '#6b6f78')),
      look: sp.lookOf(n.p),
      t: now
    });

    if (p.s > 0.45) { tagQ.push({ t: n.p.name, x: p.x, y: p.y - bodyH * 1.10 - 5 * z, px: Math.round(10 * Math.min(z, 1.4)), shade: 'rgba(0,0,0,0.55)', fill: near ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.7)', dist: n.dist, keep: !!n.p.goal, pri: n.p.goal ? 4 : near ? 2 : 0 }); }   // W-0144 · W-0205 먼 주민 0.42 → 0.7(밝은 돌바닥에서 안 읽혔다)
  }

  /**
   * 들·강의 짐승 한 마리. **스폰과 눈에 띄게 달라야 한다** — 잡는 대상이 아니라
   * 그냥 거기 사는 것이다. 등급 고리도 이름표도 없이 그림자와 몸뚱이만 있다.
   * 날아오른 새는 위로 옮겨 그리고 그림자를 줄인다(2D 에서 높이를 읽는 유일한 단서다).
   */
  function drawLandmark(lm, u, v) {
    var p = project(u, v);
    if (p.s < 0.2 || p.y < -160 || p.y > U.geom().H + 80) { return; }
    var z = core.clamp(p.s, 0.5, 1.8), BMd = global.DG.biome;
    var bh = global.DG.sprite.building(U.ctx(), { img: global.DG.sprite.buildingImg('Watchtower'), x: p.x, y: p.y, s: z * 2.2, k2d: z * bodyK(), kind2d: 'landmark:' + lm.biome });
    label(U.ctx(), (BMd.found(lm.key) ? '🌀 ' : '🗼 ') + lm.name, p.x, p.y - (bh > 0 ? bh + 8 : 46 * z * 2.2 * 1.3) - 6,
      BMd.BIOMES[lm.biome].color, 'center', z);
  }

  /** 들판 적 — 도감 펫 그림을 빌리고 원소 빛깔 고리를 발밑에 두른다 */
  function drawFieldFoe(fo, u, v, now) {
    var p = project(u, v);
    if (p.s < 0.25 || p.y < -80 || p.y > U.geom().H + 80) { return; }
    var z = core.clamp(p.s, 0.5, 1.6);
    var sp = global.DG.sprite, EL = global.DG.fieldCombat.EL, an2 = global.DG.fieldCombat.anim2d ? global.DG.fieldCombat.anim2d('fc' + fo.uid) : null, ph2 = an2 ? 1 - an2.left / an2.dur : 0, fa2 = !an2 ? { dx: 0, dy: 0, k: 1, a: 1 } : an2.clip === 'hit' ? { dx: Math.sin(ph2 * 9.4) * 4 * z, dy: 0, k: 0.96, a: (ph2 * 10 | 0) % 2 ? 0.45 : 1 } : { dx: 0, dy: -Math.sin(Math.min(1, ph2) * Math.PI) * 8 * z, k: 1 + 0.12 * Math.sin(Math.min(1, ph2) * Math.PI), a: 1 }; U.ctx().globalAlpha = fa2.a;
    U.ctx().beginPath();
    U.ctx().ellipse(p.x, p.y, 12 * z * fo.h * bodyK(), 5 * z * fo.h * bodyK(), 0, 0, Math.PI * 2);   // W-0233 적 몸도 나처럼 bodyK
    U.ctx().strokeStyle = fo.el ? EL[fo.el].color : '#d9534f';
    U.ctx().lineWidth = 2;
    U.ctx().stroke();
    if (fo.pale && 'filter' in U.ctx()) { U.ctx().filter = 'grayscale(1) brightness(1.5) contrast(1.05)'; } sp.stamp(U.ctx(), {   // W-0691 흰 범
      kind: 'beast', ref: fo.ref,
      x: p.x + fa2.dx, y: p.y + fa2.dy, s: Math.min(z * 1.25 * fo.h, 2.7) * bodyK(),   /* W-0694 2D 보스는 주인공(1.5)의 1.8배까지 — 키 2.3 × 원근 1.6 이면 세 배로 커져 흐린 덩어리가 상태창을 덮었다(일지 first ③) */ dk: fa2.k, facing: 1, phase: fo.phase, walking: fo.moving,   // W-0224 덮치기·맞음
      color: sp.beastColorOf(fo.ref), form: sp.beastFormOf(fo.ref), t: now
    }); U.ctx().globalAlpha = 1; if (fo.pale && 'filter' in U.ctx()) { U.ctx().filter = 'none'; }
  }

  /* ── 짐승 한 마리·나(주인공 몸·방향 화살·GPS 오차 원) — R-4 11-17 같은 날 둘째로 옮김 ── */
  function drawBeast(bt, u, v, now) {
    var p = project(u, v);
    if (p.s < 0.25 || p.y < -80 || p.y > U.geom().H + 80) { return; }
    var z = core.clamp(p.s, 0.5, 1.6);
    var sp = global.DG.sprite;
    var K = bt.kind;
    var lift = (bt.lift || 0) * z * 1.6;          // m → 화면 픽셀 (눈대중)

    // 발밑 그림자 — 뜰수록 작고 흐려진다
    var far = K.lift ? Math.max(0.25, 1 - (bt.lift || 0) / 12) : 1;
    U.ctx().beginPath();
    U.ctx().ellipse(p.x, p.y, 10 * z * far, 4 * z * far, 0, 0, Math.PI * 2);
    U.ctx().fillStyle = 'rgba(0,0,0,' + (0.30 * far).toFixed(2) + ')';
    U.ctx().fill();

    /* 물속 짐승은 흐리게 — 수면 아래에 있다는 것을 색으로 말한다 */
    U.ctx().globalAlpha = (K.sink ? 0.62 : 1);
    sp.stamp(U.ctx(), {
      kind: 'beast', ref: global.DG.animal.refOf(K),
      x: p.x, y: p.y - lift, s: z * 1.25 * K.h,
      facing: Math.sin(bt.ang) < 0 ? -1 : 1,
      phase: bt.phase, walking: bt.moving,
      color: K.color, form: K.form, t: now
    });
    U.ctx().globalAlpha = 1;
  }

  var meT0 = 0; function meArrow(x, y, now) { if (!meT0) { meT0 = now; } var left = +core.tuned('go.meArrowMs', 10000) - (now - meT0); if (!(left > 0)) { return false; } var b = Math.sin(now / 220) * 4, a = Math.min(1, left / 1500); U.ctx().save(); U.ctx().globalAlpha = a; U.ctx().beginPath(); U.ctx().moveTo(x, y + b); U.ctx().lineTo(x - 9, y - 12 + b); U.ctx().lineTo(x + 9, y - 12 + b); U.ctx().closePath(); U.ctx().fillStyle = '#7fd0ff'; U.ctx().fill(); U.ctx().strokeStyle = 'rgba(10,25,40,0.8)'; U.ctx().lineWidth = 2; U.ctx().stroke(); U.ctx().restore(); return true; }   /* W-0369 "나" — 처음 10초 머리 위 작은 화살표(go.meArrowMs) — 사람 사이에서 나를 못 찾았다 */ function drawPlayer(now, sc) {
    var X = U.geom().cx, Y = U.geom().cy; if (global.DG.mode2d && global.DG.mode2d.heroAt) { global.DG.mode2d.heroAt(U.ctx(), X, Y); }   // W-0700 검사용 주인공 화면 자리
    var sp = global.DG.sprite;
    var moving = player.speed > 1.5;
    var lead = core.save.party && core.save.party[0] ? data.find(core.save.party[0]) : null;

    // GPS 오차 범위
    if (U.mode() === 'geo' && U.geoAcc()) {
      var rr = Math.min(U.geoAcc() * sc, 150);
      U.ctx().beginPath();
      U.ctx().ellipse(X, Y, rr, rr * (U.geom().tilt ? U.geom().cos : 1), 0, 0, Math.PI * 2);
      U.ctx().fillStyle = 'rgba(74,163,240,0.10)';
      U.ctx().fill();
    }

    // 진행 방향 화살표
    if (moving) {
      var ang = Math.atan2(player.vy * (U.geom().tilt ? U.geom().cos : 1), player.vx);
      U.ctx().save();
      U.ctx().translate(X, Y);
      U.ctx().rotate(ang);
      U.ctx().beginPath();
      U.ctx().moveTo(36, 0); U.ctx().lineTo(22, -8); U.ctx().lineTo(22, 8);
      U.ctx().closePath();
      U.ctx().fillStyle = 'rgba(120,200,255,0.9)';
      U.ctx().fill();
      U.ctx().strokeStyle = 'rgba(10,20,30,0.55)';
      U.ctx().lineWidth = 1.5;
      U.ctx().stroke();
      U.ctx().restore();
    }

    // 발밑 고리
    var pulse = 1 + Math.sin(now / 500) * 0.07; if (global.DG.mode2d && global.DG.mode2d.shadow) { global.DG.mode2d.shadow(U.ctx(), X, Y, 26, { a: 0.32 }); }   /* W-0368 푸른 고리 밑 발 닿는 그림자 */
    U.ctx().beginPath();
    U.ctx().ellipse(X, Y, 17 * pulse, 8 * pulse, 0, 0, Math.PI * 2);
    U.ctx().fillStyle = 'rgba(74,163,240,0.16)';
    U.ctx().fill();
    U.ctx().strokeStyle = 'rgba(120,200,255,0.75)';
    U.ctx().lineWidth = 2;
    U.ctx().stroke(); meArrow(X, Y - 62 * bodyK(), now);

    /* W-0756 세계 편 짝 — 문 모드·짐승 칸 다 참·장착 펫 없음일 때 worldMate.ref 가 준 펫 몸을 주인공 뒤 곁에(그림·이름표만) */
    var mate = global.DG.worldMate ? global.DG.worldMate.ref(core.save) : null;
    if (mate && sp && sp.stamp) {
      var mk = (U.geom().mode === 2 ? 1.5 : 1.25) * bodyK() * 1.1, mbk = sp.beastK ? sp.beastK(mate) : 1, mx = X - (player.facing < 0 ? -38 : 38) * bodyK(), my = Y - 4 * bodyK();
      if (global.DG.mode2d && global.DG.mode2d.shadow) { global.DG.mode2d.shadow(U.ctx(), mx, my, 30 * mbk * mk * 0.62, { a: 0.28 }); }
      sp.stamp(U.ctx(), { kind: 'beast', ref: mate, bk: mbk, x: mx, y: my, s: mk, facing: player.facing, phase: player.phase, walking: moving, color: sp.beastColorOf(mate), form: sp.beastFormOf(mate), divine: mate.kind === 'divine', t: now });
      tagQ.push({ t: mate.name, x: mx, y: my - 30 * mbk * mk * 1.12 - 6, px: 11, shade: 'rgba(0,0,0,0.62)', fill: 'rgba(255,255,255,0.86)', dist: 0, pri: 2, ga: 1 });
      U.mateDrawn = mate.mate;
    }
    if (!(global.DG.actor2d && global.DG.actor2d.human(U.ctx(), lead, 'player', X, Y, (U.geom().mode === 2 ? 1.5 : 1.25) * bodyK(), { facing: player.facing, dirX: player.dirX, dirY: player.dirY, moving: moving, phase: player.phase, now: now, wx: core.save.player.pos.x, wy: core.save.player.pos.y * strideVK(), ppu: sc || scale() }))) sp.stamp(U.ctx(), {
      kind: 'human', ref: lead, key: lead ? null : 'player',
      // 3D 는 카메라가 낮아 캐릭터를 조금 더 크게 (원작 느낌)
      x: X, y: Y, s: (U.geom().mode === 2 ? 1.5 : 1.25) * bodyK(),
      facing: player.facing, phase: player.phase, walking: moving,
      color: lead ? data.faction(lead.faction).color : '#3f6f9f',
      look: lead ? sp.lookOf(lead) : { weapon: 'sword', helm: 'gat', armor: 'robe', cape: true },
      t: now
    });
  }

  return { drawBeast: drawBeast, drawPlayer: drawPlayer, drawSpawn: drawSpawn, spreadUV: spreadUV, drawNpc: drawNpc, drawLandmark: drawLandmark, drawFieldFoe: drawFieldFoe };
  } };
})(window);
