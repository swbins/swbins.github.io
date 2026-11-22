/**
 * 들판 전투(野戰) — 오픈월드 RPG식 (PLAN §5 ⑨, 2026-09-24 사용자 선택)
 * ---------------------------------------------------------------
 * 옛 전투(`rogue-action.js`)는 사건이 열어 주는 1:1 결투다. 이것은 **지도 위에
 * 원래 사는 적 무리**와 무대 전환 없이 싸운다 — 걷다가 보이면 붙고, 떨어지면 끝난다.
 *
 *   무리      160m 격자마다 해시로 자리·종류가 정해진다(세이브 없이도 늘 같은 자리).
 *             멀리(900m 마다) 갈수록 등급이 오른다 — 오픈월드 RPG의 "세계 레벨" 자리
 *   편성      동행 앞 4명. 숫자 1~4(또는 초상)로 즉시 교체, 교체 1초 쿨
 *   조준      §5 ⑲-22 활 인물만 R(터치 🎯) — 제자리에서 방향 키로 겨누고(가까운 적·과녁·석등에 저절로 잠김) 공격을 누르는
 *             동안 충전, 떼면 쏜다. 조준 밖에서 활 인물이 공격을 길게 누르면 강공격 대신 조준·충전 → 떼면 쏘고 나온다.
 *             1.4초 다 차면 인물 원소 ×1.25(모르는 적이면 급소 = 반드시 치명), 덜 차면 물리 ×0.45. 화살 60m/초·45m.
 *             충전 화살이 멈춘 자리는 원소 신호(석등·제단을 멀리서 켠다). 화살은 상자 과녁(treasure.js)도 켠다
 *   조작      기본 공격 3타 · 길게 누르면 강공격(0.4초·스태미나 20) · 활공 중엔 낙하 공격(§5 ⑲-2) ·
 *             원소 스킬(7초) · 원소 해방(기력 60) · 회피(스태미나 20)
 *   원소      일곱 — 화·수·뇌·풍·빙·암·초(§5 ⑲-1, saga-godot PLAN 106 ⑭). 인물마다 id 해시로 고정, 주인공은 화.
 *             풍·암은 적에게 안 붙고 반응만 일으킨다
 *   반응      물안개·녹임 ×1.5 · 터짐(4m 광역·밀침) · 물벼락(3초 지속) · 얼어붙음(2.5초 멈춤 → 깨뜨림 ×1.5) ·
 *             서리번개(3m + 8초 물리 ×1.4) · 회오리(4m 원소 옮기기) · 굳힘(명단 보호막) · 꽃피움(씨앗) ·
 *             들불(0.5초 × 8) · 싹틈(8초 뇌·초 ×1.25)
 *   원소 방패 방패 동안 체력 대신 방패만 깎인다. 같은 원소 면역·물리 ×0.4(바위는 ×1)·
 *             상성(수>화·뇌>수·화>뇌·암>풍·화>빙·초>암·풍>초) ×2.5 → 깨지면 2초 비틀거림
 *
 * **판정 층(`create`·`step`·`attack`·`skill`·`burst`·`dodge`·`swap`·`react`·
 * `shieldMul`·`campAt`)은 순수 함수다** — 화면·세이브를 안 만진다. 자가진단이 이것만
 * 굴린다. 세이브는 런타임(`tick`)이 보상·치운 무리 시각(`save.field`)만 쓴다.
 * 화면은 `world3d.js` 가 `live()` 를 읽어 배우를 세우고, 원(예고·광역)·숫자는 여기서 얹는다.
 * 손잡이 `field.on` 을 0 으로 두면 무리째 사라진다.
 */
(function (global) {
  'use strict';

  function core() { return global.DG.core; }
  function data() { return global.DG.data; }
  function K(key, def) { return core().tuned('field.' + key, def); }   /* W-0233 2D 판정 배율 KDV — 2D(평면·2.5D)는 몸(≈57m)이 3D 사람(1.7m)의 수십 배라 미터 거리로 싸우면 적이 발밑에 겹쳤다. 거리·빠르기만 ×KDV(시간 상수 그대로), 3D·진단(DG_NO_DRAW)은 1. 상한 손잡이 field.kd2dMax 12(무리 간격). KDk = 키트의 거리 칸(reach·r·ahead·pull·knock·len·w·back·range·inner) ×KDV 사본 */ var KDV = 1, KDT = null, KDKEYS = ['reach', 'r', 'ahead', 'pull', 'knock', 'len', 'w', 'back', 'range', 'inner']; function KD0() { if (KDT) { return KDT; } if (global.DG_NO_DRAW) { return 1; } var Wk = global.DG.world, bk = Wk && Wk.body2dM ? Wk.body2dM() : null; return bk ? Math.max(1, Math.min(K('kd2dMax', 12), bk / 1.7)) : 1; } function KDk(o) { if (!o || KDV === 1) { return o; } var c = {}, k; for (k in o) { if (o.hasOwnProperty(k)) { c[k] = o[k]; } } KDKEYS.forEach(function (n) { if (typeof c[n] === 'number') { c[n] *= KDV; } }); return c; }

  /* ── 원소 ─────────────────────────────────────────────── */
  var EL = {
    fire:  { key: 'fire',  name: '화', icon: '🔥', color: '#ff6a3d' },
    water: { key: 'water', name: '수', icon: '💧', color: '#3fa9f5' },
    elec:  { key: 'elec',  name: '뇌', icon: '⚡', color: '#b57bff' },
    wind:  { key: 'wind',  name: '풍', icon: '🌪️', color: '#5fe0bd' },
    ice:   { key: 'ice',   name: '빙', icon: '❄️', color: '#aeeaff' },
    rock:  { key: 'rock',  name: '암', icon: '🪨', color: '#eeb84c' },
    grass: { key: 'grass', name: '초', icon: '🌿', color: '#8cd938' }
  };
  /* ⑲-1 — 옛 셋을 앞에 그대로 둔다. 동행 원소는 id 해시 % 7 이라 옛 동행 원소가 바뀐다(세이브엔 원소가 없다) */
  var EL_KEYS = ['fire', 'water', 'elec', 'wind', 'ice', 'rock', 'grass'];
  var NO_AURA = { wind: 1, rock: 1 };                          // 붙지 않고 반응만
  var SWIRLABLE = { fire: 1, water: 1, elec: 1, ice: 1 };      // 회오리·굳힘이 받는 원소
  /** 방패 원소 → 그것을 크게 깎는 원소 (수>화 · 뇌>수 · 화>뇌 · 암>풍 · 화>빙 · 초>암 · 풍>초) */
  var COUNTER = { fire: 'water', water: 'elec', elec: 'fire', wind: 'rock', ice: 'fire', rock: 'grass', grass: 'wind' };
  /** 반응 — 이름·빛깔 원소·고리 반지름(화면용). 번개싹·덩굴뻗음은 싹틈 상태에서, 깨뜨림은 얼어붙음 상태에서 난다 */
  var REACT = {
    vaporize: { name: '물안개', el: 'fire', r: 0 }, melt: { name: '녹임', el: 'fire', r: 0 },
    overload: { name: '터짐', el: 'fire', r: 4 }, charged: { name: '물벼락', el: 'elec', r: 3 },
    frozen: { name: '얼어붙음', el: 'ice', r: 0 }, superconduct: { name: '서리번개', el: 'ice', r: 3 },
    swirl: { name: '회오리', el: 'wind', r: 4 }, crystallize: { name: '굳힘', el: 'rock', r: 0 },
    bloom: { name: '꽃피움', el: 'grass', r: 0 }, burning: { name: '들불', el: 'fire', r: 0 },
    quicken: { name: '싹틈', el: 'grass', r: 0 }, aggravate: { name: '번개싹', el: 'elec', r: 0 },
    spread: { name: '덩굴뻗음', el: 'grass', r: 0 }, shatter: { name: '깨뜨림', el: 'ice', r: 0 }
  };
  var REACT_NAME = {};
  (function () { for (var k in REACT) { if (REACT.hasOwnProperty(k)) { REACT_NAME[k] = REACT[k].name; } } })();
  function attaches(el) { return !!el && !NO_AURA[el]; }

  function on() { return K('on', 1) ? true : false; }
  function PARTY_MAX() { return 4; }
  function REACH() { return K('reach', 3.2) * KDV; }           // 기본 공격 사거리(m)
  function LUNGE_R() { return K('lungeR', 6) * KDV; }          // 이 안이면 한 걸음 파고들며 친다
  /* 2026-09-28 실기 Q6 "캐릭터가 너무 가까움·모션이 안 보임" — 거리를 몸 한가운데끼리 재서 적이 코앞 1.6m 까지
     파고들었는데, 화면의 적 몸은 키 3.4m×h 로 서 길이가 5~8m(멧돼지 5.7·곰 7.8)라 캐릭터가 적 몸속에 묻혔다.
     적마다 몸 반지름을 두고 멈춤·사거리·맞힘을 **몸 가장자리**에서 잰다. 0 이면 옛 한가운데 거리 */
  function BODY(f) { var F = f && FOES[f.kind]; return F ? (F.h || 1) * K('bodyMul', 1.6) * KDV : 0; }
  function SKILL_R() { return K('skillR', 4.5) * KDV; }
  function SKILL_AIM() { return K('skillAim', 8) * KDV; }      // 스킬이 적을 겨누는 거리
  function SKILL_CD() { return K('skillCd', 7); }
  function SKILL_MUL() { return K('skillMul', 2.2); }
  function BURST_R() { return K('burstR', 7) * KDV; }
  function BURST_CD() { return K('burstCd', 12); }
  function BURST_MUL() { return K('burstMul', 4.5); }
  function ENERGY_MAX() { return 60; }
  function STA_MAX() { return 100; }
  function DODGE_COST() { return K('dodgeCost', 20); }
  function DODGE_IFRAME() { return K('dodgeIframe', 0.35); }
  function DASH_M() { return K('dashM', 3.6) * KDV; }
  function DASH_T() { return 0.18; }
  function SWAP_CD() { return K('swapCd', 1); }
  /* ⑲-2 강공격·낙하 공격 — saga-godot PLAN 106 ⑧ 칸(둘 다 물리, 깨뜨림을 낸다) */
  function CHARGE_HOLD() { return 0.4; }
  /* ⑲-22 조준 사격 */
  function AIM_R() { return 40 * KDV; }  function AIM_CONE() { return 0.16; }  function AIM_TURN() { return 2.4; }
  function AIM_FULL() { return 1.4; }  function AIM_PART() { return 0.45; }  function AIM_FULLMUL() { return 1.25; }  function AIM_GAP() { return 0.3; }
  function ARROW_V() { return 60 * KDV; }  function ARROW_RANGE() { return 45 * KDV; }  function ARROW_EL_R() { return 1.2 * KDV; }  function CHARGE_COST() { return K('chargeCost', 20); }
  function CHARGE_MUL() { return K('chargeMul', 1.3); }  function CHARGE_REACH() { return 3.2 * KDV; }  function CHARGE_ARC() { return -0.2; }
  /* W-0224 2D 몸짓 기록 — 3D(W3().playAnim)와 같은 순간에 남긴다(2D 화면엔 W3 가 없다). actor2d·drawFieldFoe 가 anim2d(key) 로 읽는다 */ var A2M = {}; function A2(k, clip, ms) { A2M[k] = { clip: clip, end: Date.now() + ms, dur: ms / 1000 }; } function anim2d(k) { var a = A2M[k]; if (!a) { return null; } var left = (a.end - Date.now()) / 1000; if (left <= 0) { delete A2M[k]; return null; } return { clip: a.clip, left: left, dur: a.dur }; } function wpnSlot(w, step) { return K('wpnAnim', 1) ? 'Wpn_' + ({ sword: 1, claymore: 1, polearm: 1, catalyst: 1, bow: 1 }[w] ? w : 'sword') + '_' + Math.max(0, Math.min(2, step | 0)) : 'attack'; }   function wpnMs(w, step, dflt) { var OA = global.DG.ownAnim, d = OA && OA.combatDur ? OA.combatDur(wpnSlot(w, step)) : 0; return d ? Math.round(d * 1000) : dflt; }   function WPN_HOLD() { return K('finishHold', 70); }   function PLUNGE_R() { return 3.5 * KDV; }     function PLUNGE_MUL() { return K('plungeMul', 1.2); }   // W-0169 3D 무기 몸짓 이름·길이·3타 마무리 멈춤(ms)
  function PLUNGE_PER_M() { return 0.1; } function PLUNGE_MAX_M() { return 15; }
  function VAPOR_MUL() { return K('vaporMul', 1.5); }
  function OVERLOAD_R() { return 4 * KDV; }
  function OVERLOAD_MUL() { return K('overloadMul', 1.2); }
  function CHARGED_R() { return 3 * KDV; }
  function CHARGED_MUL() { return K('chargedMul', 0.45); }
  function AURA_T() { return 7; }
  /* ⑲-1 새 반응 수치 — saga-godot PLAN 106 ⑭ 칸 그대로 */
  function MELT_MUL() { return K('meltMul', 1.5); }
  function FROZEN_T() { return 2.5; }
  function SHATTER_MUL() { return 1.5; }
  function SUPER_R() { return 3 * KDV; }       function SUPER_MUL() { return 0.5; }   function SUPER_T() { return 8; }   function SUPER_PHYS() { return 1.4; }
  function SWIRL_R() { return 4 * KDV; }       function SWIRL_MUL() { return 0.6; }
  function CRYSTAL_HP() { return 0.2; }  function CRYSTAL_T() { return 15; }
  function BLOOM_R() { return 3 * KDV; }       function BLOOM_T() { return 1.5; }     function BLOOM_MUL() { return 1.5; }
  function BURN_N() { return 8; }        function BURN_EVERY() { return 0.5; }  function BURN_MUL() { return 0.2; }
  function QUICK_T() { return 8; }       function QUICK_MUL() { return 1.25; }
  function SHIELD_STUN() { return 2; }
  function STUN_MUL() { return 1.3; }
  function PHYS_SHIELD() { return 0.4; }
  var PHYS_SHIELD_BY = { rock: 1.0 };      // 바위 방패는 물리로도 제대로 깎인다
  function COUNTER_MUL() { return 2.5; }
  function AGGRO_R() { return K('aggroR', 12) * KDV; }
  function LEASH_R() { return K('leashR', 34) * KDV; }
  function CALM_REGEN() { return 4; }       // 이만큼 조용하면 체력이 돈다
  function REVIVE_CALM() { return K('reviveCalm', 15); }
  function HP_BASE() { return K('hpBase', 520); }
  function ATK_BASE() { return K('atkBase', 80); }
  function SHIELD_BASE() { return K('shieldBase', 300); }

  /* ── 해시(씨앗 없이 자리만으로) ───────────────────────── */
  function h3(a, b, s) {
    var h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function hs(str) {
    var h = 2166136261;
    str = String(str || '');
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  /** 인물의 원소 — id 해시로 고정(바뀌지 않는다). 주인공 '_me' 는 화(saga-godot 와 같게) */
  function elementOf(id) {
    var SM = global.DG.story && global.DG.story.MEMBERS;                 // ⑲-15 이야기 동료는 표
    if (SM && SM[id]) { return SM[id].el; }
    return id === '_me' ? 'fire' : EL_KEYS[Math.floor(hs(id) * EL_KEYS.length) % EL_KEYS.length];
  }

  /* ⑫ 스킬 모양 — 인물마다 다르다(원소와 다른 해시). 주인공 '나'는 옛 원형 광역 그대로.
     찌르기: 앞으로 좁고 길게 세게 · 돌진: 파고들며 길 위를 친다(짧은 무적) ·
     장판: 그 자리가 몇 초 동안 원소를 묻힌다(반응 굴리기) · 소환: 곁의 정령이 가까운 적을 친다 */
  var SHAPES = {
    circle: { key: 'circle', name: '원형',   icon: '⭕' },
    thrust: { key: 'thrust', name: '찌르기', icon: '🗡️' },
    dash:   { key: 'dash',   name: '돌진',   icon: '💨' },
    field:  { key: 'field',  name: '장판',   icon: '🌀' },
    summon: { key: 'summon', name: '소환',   icon: '👻' }
  };
  var SHAPE_KEYS = ['thrust', 'dash', 'field', 'summon'];
  function shapeOf(id) { return id === '_me' ? 'circle' : SHAPE_KEYS[Math.floor(hs(id + '#shape') * 4) % 4]; }
  function THRUST_LEN() { return 8 * KDV; }  function THRUST_W() { return 1.6 * KDV; }  function THRUST_MUL() { return K('thrustMul', 2.8); }
  function DASH_LEN() { return 6 * KDV; }    function DASH_W() { return 1.8 * KDV; }    function DASH_MUL() { return K('dashMul', 2.4); }
  function FIELD_R() { return 4 * KDV; }     function FIELD_T() { return 5; }     function FIELD_MUL() { return K('fieldMul', 0.6); }
  function SUMMON_T() { return 8; }    function SUMMON_EVERY() { return 1.5; }  function SUMMON_R() { return 7 * KDV; }  function SUMMON_MUL() { return K('summonMul', 0.9); }
  /** 점 (x,y) 에서 선분 (ax,ay)-(bx,by) 까지 거리 */
  function segDist(x, y, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
    var u = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2)) : 0;
    return Math.hypot(x - (ax + vx * u), y - (ay + vy * u));
  }

  /**
   * 원소 반응 — 이미 붙어 있는 원소(aura)에 새 원소(hit)가 닿으면.
   * 같은 원소·물리·반응 없는 쌍은 null. 풍·암은 받는 원소(화·수·뇌·빙)에만 반응한다.
   * from = 반응 전에 붙어 있던 원소(회오리가 옮겨 붙인다)
   */
  function react(aura, hit) {
    if (!aura || !hit || aura === hit) { return null; }
    var kind = null;
    if (hit === 'wind') { kind = SWIRLABLE[aura] ? 'swirl' : null; }
    else if (hit === 'rock') { kind = SWIRLABLE[aura] ? 'crystallize' : null; }
    else {
      kind = {
        'fire+water': 'vaporize', 'elec+fire': 'overload', 'elec+water': 'charged',
        'fire+ice': 'melt', 'ice+water': 'frozen', 'elec+ice': 'superconduct',
        'grass+water': 'bloom', 'fire+grass': 'burning', 'elec+grass': 'quicken'
      }[[aura, hit].sort().join('+')] || null;
    }
    return kind ? { kind: kind, name: REACT_NAME[kind], from: aura } : null;
  }

  /** 원소 방패가 받는 배수 — 같은 원소 0 · 물리 0.4(바위 1) · 상성 2.5 · 그 밖 1 */
  function shieldMul(shEl, hitEl) {
    if (!hitEl) { return PHYS_SHIELD_BY[shEl] || PHYS_SHIELD(); }
    if (hitEl === shEl) { return 0; }
    if (COUNTER[shEl] === hitEl) { return COUNTER_MUL(); }
    return 1;
  }

  /* ── 적 ───────────────────────────────────────────────
   * ref 는 도감 펫 id — 이미 구워 둔 3D 몸·2D 그림을 그대로 빌린다(새 에셋 없음).
   * type: melee(코앞) · spit(내가 서 있던 자리에 떨어진다) · slam(제 둘레 원)
   */
  var FOES = global.DG.fieldFoes.FOES;   // R-4 — 적 종류 표는 js/field-foes.js
  var ROT = global.DG.fieldFoes.ROT;     // ⑲-14 공격 차례의 한 수씩(같은 파일)
  var SHADOW_BACK = 2.2, RIFT_STEP = 1.5, RIFT_SLOPE = 0.3;   // ⑲-30 줄 끝 땅 높이 차가 RIFT_STEP + 거리 × RIFT_SLOPE 를 넘으면(벼랑) 제자리에서 친다
  /** ⑲-16 밀물 원 넷(⑲-30 틈새 질주는 kind 'rift' — 다섯) — 가면(fx,fy)에서 나(px,py) 쪽으로 from m 부터 gap 간격 */
  function tideMarks(fx, fy, px, py, kind) {
    var T = ROT[kind || 'tide'], dx = px - fx, dy = py - fy, dl = Math.hypot(dx, dy) || 1, out = [];
    for (var i = 0; i < T.n; i++) { var s = (T.from + T.gap * i) * KDV; out.push({ x: fx + dx / dl * s, y: fy + dy / dl * s }); }
    return out;
  }
  /** ⑲-30 틈새 질주 끝 — 줄 끝(x,y)으로 옮겨도 되나(비탈은 되고 벼랑은 안 된다). 높이를 모르면 된다 */
  function riftOk(fx, fy, x, y) {
    var RL = global.DG.relief3d;
    if (!RL || !RL.heightAt) { return true; }
    return Math.abs(RL.heightAt(x, y) - RL.heightAt(fx, fy)) <= RIFT_STEP + Math.hypot(x - fx, y - fy) * RIFT_SLOPE;
  }
  /** 예고 표식에 (x,y) 가 드나 — 원 여럿(list)이면 하나라도. pad 는 맞는 쪽 몸 둘레 */
  function markHit(m, x, y, pad) {
    var L = m.list || [m];
    for (var i = 0; i < L.length; i++) {
      var d = Math.hypot(x - L[i].x, y - L[i].y);
      if (d <= m.r + (pad || 0) && (!m.inner || d >= m.inner - (pad || 0))) { return true; }   // ⑲-20 고리는 안쪽이 빈다
    }
    return false;
  }
  /* ⑲-16 지킬 것(siege) — 이야기 제단 지키기 무리는 제단으로 곧장 가서 치고, 내가 이 안이면 나를 친다 */
  var SIEGE_PULL = 5, SIEGE_BODY = 1.5;
  function LAYER_STUN() { return 0.8; }     // 겉 방패가 깨질 때 — 짧게 휘청(속 방패가 곧 선다)
  function CORE_STUN() { return 3; }        // 마지막 겹이 깨지면 — 길게 드러눕는다(약점)
  var GUARD_OFF = { x: 16, y: 10 };         // 탑 한가운데가 아니라 둘레 빈터(biome LM_CLEAR 34m 안)

  /**
   * ⑯ 순수 함수 — 들판 인물 h 와 겨루는 판. 인물 하나(가운데) + ★3 이상이면 제 원소 졸개(★3 하나·★4~5 둘).
   * 인물 체력 = HP_BASE × (1.6 + 0.7×★) × 등급배수, 공격 = ATK_BASE × (0.9 + 0.12×★) × 등급배수.
   * ★4 는 제 원소 방패 한 겹, ★5 는 두 겹(제 원소 → 그 상성) — 오픈월드 RPG 정예처럼 교체해서 깨야 한다
   */
  var RETINUE = { fire: 'imp', water: 'toad', elec: 'raptor', wind: 'hawk', ice: 'snowfox', rock: 'rockbear', grass: 'vine' };
  function heroKind(h) { return h.trait === 'might' ? 'h_might' : (h.trait === 'wisdom' ? 'h_wisdom' : 'h_virtue'); }
  function duelCamp(h, x, y, spawnUid) {
    var r = h.rarity || 1, el = elementOf(h.id), tier = tierAt(x, y), m = tierMul(tier);
    var foes = [{ kind: heroKind(h), dx: 0, dy: 0 }];
    var nRet = r >= 4 ? 2 : (r >= 3 ? 1 : 0);
    for (var i = 0; i < nRet; i++) { foes.push({ kind: RETINUE[el], dx: (i ? -3.2 : 3.2), dy: 2.4 }); }
    var layers = r >= 5 ? [el, COUNTER[el]] : (r >= 4 ? [el] : []);
    return {
      key: 'h:' + spawnUid, x: x, y: y, tier: tier, kind: 'hero', foes: foes,
      hero: { id: h.id, name: h.name, el: el, layers: layers,
        hp: Math.round(HP_BASE() * (1.6 + 0.7 * r) * m), atk: Math.round(ATK_BASE() * (0.9 + 0.12 * r) * m),
        shield: layers.length ? Math.round(SHIELD_BASE() * 1.1 * m) : 0 }
    };
  }

  /**
   * ⑪ 순수 함수 — 지역 가운데(biome `cellAt`·`landmarks` 원소) 곁의 수호자 무리. 고향은 없다.
   * 등급은 그 자리 등급 + 1(최대 6). key 는 'g:<지역키>' — 토벌하면 다시 서지 않는다(save.field.guards)
   */
  function guardianAt(cell) {
    if (!cell || !cell.biome || cell.biome === 'home' || !FOES['g_' + cell.biome]) { return null; }
    var x = cell.x + GUARD_OFF.x, y = cell.y + GUARD_OFF.y;
    return { key: 'g:' + cell.key, region: cell.key, x: x, y: y, tier: Math.min(6, tierAt(x, y) + 1), kind: 'guard',
             foes: [{ kind: guardKind(cell), dx: 0, dy: 0 }] };
  }
  /** ⑲-31 이 칸 수호자 종류 — 서리봉 고원 가운데 칸이면 만년설 바위곰왕, 아니면 바이옴 수호자.
      고원 가운데는 해시·지형만으로 정해져 늘 같다(frost.center) — 한 번 찾으면 기억한다 */
  var frostKey = null;
  function guardKind(cell) {
    var FR = global.DG.frost;
    if (FR && FR.on && FR.on() && FR.center) {
      if (frostKey === null) { var fc = FR.center(); frostKey = fc ? fc.key : ''; }
      if (frostKey && cell.key === frostKey) { return 'g_frost'; }
    }
    return 'g_' + cell.biome;
  }
  /** 무리 꼴 — 격자 해시로 고른다(앞의 다섯은 보통, 정예·우두머리는 따로 굴린다) */
  var THEMES = [
    ['boar', 'boar', 'boar'],
    ['imp', 'imp', 'boar'],
    ['toad', 'toad', 'toad'],
    ['raptor', 'raptor'],
    ['bear', 'boar', 'boar'],
    ['imp', 'toad', 'raptor'],
    /* ⑲-1 새 원소 무리(6~8) — 바이옴 themes 가 번호로 고른다(biome.js) */
    ['hawk', 'hawk', 'vine'],
    ['snowfox', 'snowfox', 'vine'],
    ['rockbear', 'rockbear']
  ];
  var ELITES = [['ember', 'imp', 'imp'], ['tortoise', 'toad', 'toad'], ['bolt', 'raptor', 'raptor']];
  /* ⑱ 시대 무리 — 땅(biome.js ZONES)의 시대가 제 몫(60%)을, 나머지 두 시대가 40%를 나눠 갖는다.
     과거 몫은 위 바이옴 무리 그대로(신화 땅도 과거 몫 — 도깨비·용이 신화다). 미래만 정예(강철 거신)가 따로 있다 */
  var ERA_THEMES = {
    modern: [['rat', 'rat', 'rat'], ['wasp', 'wasp'], ['zombie', 'zombie', 'rat'], ['zombie', 'wasp']],
    future: [['drone', 'drone'], ['walker', 'walker', 'drone'], ['alien', 'alien', 'walker'], ['alien', 'drone']]
  };
  var ERA_ELITES = { future: ['hulk', 'drone', 'drone'] };
  var ERAS3 = ['past', 'modern', 'future'];
  function MAIN_SHARE() { return K('eraMain', 0.6); }
  function ERA_FROM() { return K('eraFrom', 300); }      // 시작점 둘레는 과거 짐승만(첫걸음이 로봇이면 뜬금없다)
  /** 이 칸 무리의 시대 — 순수 함수. zone 이 없으면(고향·진단) 'past' */
  function eraOfCamp(cx, cy, zone, dist) {
    if (!zone || !zone.era || dist < ERA_FROM()) { return 'past'; }
    var main = zone.era === 'myth' ? 'past' : zone.era;
    if (h3(cx, cy, 37) < MAIN_SHARE()) { return main; }
    var rest = ERAS3.filter(function (e) { return e !== main; });
    return rest[Math.floor(h3(cx, cy, 41) * rest.length) % rest.length];
  }

  var CELL = 160;          // 무리 격자(m)
  var TILE = 48;           // world3d GRID — 지형 칸
  function CAMP_CHANCE() { return K('campChance', 0.45) * (KDV > 1 ? K('campChance2d', 0.12) : 1); } function PACK2D(kind) { return KDV > 1 ? (kind === 'plain' ? K('pack2dPlain', 1) : K('pack2d', 2)) : 99; }   // 사용자 10-26 「1번 2d몹이 너무 몰려있어」 — 2D 는 몸·거리가 ×KDV 인데 무리 격자(CELL)는 그대로라 화면에 무리가 겹쳐 든다 → (10-27 또 몰림 — 0.6→0.4→0.25배(10-27 또 줄임 — 느림·몰림), 평범한 무리는 1마리·정예/우두머리 2마리) 2D 만 무리 수 0.4배·무리당 2마리(합 약 45%) · PACK2D = 2D 무리당 최대 마리(앞쪽 = 우두머리·정예 먼저)
  function SAFE_R() { return Math.max(K('homeSafe', 240), 30 * KDV); }   // 시작점 둘레에는 안 선다 — W-0698 옛 60m → 240m(손잡이 field.homeSafe)·2D 30×KDV(360m) — 첫 프레임은 KDV 가 아직 1 이라 고정 하한이 있어야 한다. 60m 면 첫 화면 주인공·이름표 위에 적 무리·공격 원이 섰다(R-2 11-16)
  function TIER_STEP() { return K('tierStep', 900); }
  function tierAt(x, y) { return 1 + Math.min(5, Math.floor(Math.hypot(x, y) / TIER_STEP())); }
  function tierMul(t) { return 1 + 0.3 * (t - 1); }
  /* §5 ⑲-7 천하 등급(adventure.js) — 거리 등급 배율에 곱한다. 모듈이 없으면 세계 0 */
  function ADV() { return global.DG.adventure || null; }
  function wlNow() { var A = ADV(); return A ? A.worldLevel() : 0; }
  function lootMul() { var A = ADV(); return (A ? A.lootMul(wlNow()) : 1) * (global.DG.bloodMoon ? global.DG.bloodMoon.lootMul() : 1); }   // W-0420 ③ 핏빛 달 ×2
  function dustAdd() { var A = ADV(); return A ? A.dustAdd(wlNow()) : 0; }
  function lvAddOf(w) { var A = ADV(); return A && w ? A.lvAdd(w) : 0; }
  /** 전리품 — 쓰러뜨린 적 하나의 금 · 무리/수호자 토벌의 금·단사(천하 등급 배율을 탄다) */
  function killGold(tier) { return Math.round((3 + 2 * tier) * lootMul()); }
  function clearLoot(kind, tier) {
    if (kind === 'guard') { return { gold: Math.round(150 * tier * lootMul()), dust: 8 + dustAdd() }; }
    var g = 15 * tier + (kind === 'boss' ? 60 * tier : (kind === 'elite' ? 20 * tier : 0));
    return { gold: Math.round(g * lootMul()), dust: (kind === 'boss' ? 3 : 1) + dustAdd() };
  }
  /** 적 하나를 천하 등급 w 로 앉힌다 — 지금 배율에서 깎인 비율 그대로(체력·방패 / 공격) */
  function applyWorld(f, w) {
    var A = ADV(), from = f.wl || 0;
    if (!A || from === w) { return; }
    var kh = A.hpMul(w) / A.hpMul(from), ka = A.atkMul(w) / A.atkMul(from);
    f.hpMax = Math.round(f.hpMax * kh);
    f.hp = f.dead ? f.hp : Math.max(1, Math.round(f.hp * kh));
    f.atk = Math.round(f.atk * ka);
    f.shieldMax = Math.round(f.shieldMax * kh);
    f.shield = Math.round(f.shield * kh);
    f.wl = w;
  }
  /** 천하 등급이 바뀌면 살아 있는 적을 다시 앉힌다(adventure.js 가 부른다 — 판 St 를 안 주면 런타임 판) */
  function rescaleWorld(St) {
    St = St || S;
    if (!St) { return 0; }
    var w = wlNow(), n = 0, k;
    for (k in St.foes) {
      if (Object.prototype.hasOwnProperty.call(St.foes, k) && !St.foes[k].dead && (St.foes[k].wl || 0) !== w) { applyWorld(St.foes[k], w); n++; }
    }
    return n;
  }

  /**
   * 격자 한 칸의 무리 — 없으면 null. 순수 함수(같은 칸은 늘 같은 답).
   * terr(tx,ty) 를 주면 물·마을·길 위에는 안 세운다(진단은 안 줘도 된다).
   * zfn(x,y) → 땅(biome.zoneAt)을 주면 ⑱ 시대가 섞인다 — 안 주면 옛 바이옴 무리 그대로.
   */
  function campAt(cx, cy, terr, bfn, zfn) {
    if (h3(cx, cy, 7) > CAMP_CHANCE()) { return null; }
    var x = (cx + 0.2 + 0.6 * h3(cx, cy, 11)) * CELL;
    var y = (cy + 0.2 + 0.6 * h3(cx, cy, 13)) * CELL;
    var dist = Math.hypot(x, y), STa = global.DG.story, ha = STa && STa.anchorOf ? STa.anchorOf('home') : null; if (ha) { dist = Math.min(dist, Math.hypot(x - ha.x, y - ha.y)); }   // W-0698 세계 편 장 무대 칸(W-0696)도 시작점
    if (dist < SAFE_R()) { return null; }
    if (terr) {
      var k = terr(Math.floor(x / TILE), Math.floor(y / TILE));
      if (k === 'water' || k === 'town' || k === 'road') { return null; }
    }
    /* 지역 바이옴(§5 ⑩)이 무리 꼴을 고른다 — 협곡엔 불, 늪엔 물 */
    var B = bfn ? bfn(x, y) : null;
    var th = B && B.themes ? B.themes : null, el = B && B.elites ? B.elites : null;
    var bossP = B && B.boss !== undefined ? B.boss : 0.05;
    var r = h3(cx, cy, 17), list, kind = 'plain';
    var era = eraOfCamp(cx, cy, zfn ? zfn(x, y) : null, dist);
    if (dist > 400 && r < bossP) { list = ['rex', 'boar', 'boar']; kind = 'boss'; era = 'past'; }
    else if (r < bossP + 0.15 && ERA_ELITES[era]) { list = ERA_ELITES[era]; kind = 'elite'; }
    else if (r < bossP + 0.15) {
      list = el ? ELITES[el[Math.floor(h3(cx, cy, 19) * el.length) % el.length]]
        : ELITES[Math.floor(h3(cx, cy, 19) * ELITES.length) % ELITES.length];
      kind = 'elite';
    } else if (ERA_THEMES[era]) {
      var et = ERA_THEMES[era];
      list = et[Math.floor(h3(cx, cy, 23) * et.length) % et.length];
    } else {
      list = th ? THEMES[th[Math.floor(h3(cx, cy, 23) * th.length) % th.length]]
        : THEMES[Math.floor(h3(cx, cy, 23) * THEMES.length) % THEMES.length];
    }
    var foes = []; list = list.slice(0, PACK2D(kind));   // 2D 무리당 최대 마리
    for (var i = 0; i < list.length; i++) {
      var a = (i / list.length) * Math.PI * 2 + h3(cx, cy, 29) * 6.283;
      var rr = i === 0 && kind !== 'plain' ? 0 : 3.2;
      foes.push({ kind: list[i], dx: Math.cos(a) * rr, dy: Math.sin(a) * rr });
    }
    return { key: cx + '_' + cy, x: x, y: y, tier: tierAt(x, y), kind: kind, era: era, foes: foes };
  }

  /* ── 편성 ─────────────────────────────────────────────── */
  function statsOf(id) {
    var H = global.DG.hero;
    if (H && H.stats && id !== '_me') {
      var s = H.stats(id);
      if (s && (s.might || s.wisdom || s.command)) { return s; }
    }
    return { might: 60, wisdom: 60, command: 60 };
  }
  /** ⑲-4 무예 단계·깨달음(talent.js) — 없거나 '_me' 면 모두 1 */
  function talentMods(id) {
    var T = global.DG.talent;
    if (T && id !== '_me') { return T.combatMods(id); }
    return { tm: { n: 1, s: 1, b: 1 }, con: 0, cdMul: 1, reactMul: 1, hpMul: 1, c6: false };
  }
  /** 피해 출처별 무예 배율 × 깨달음 5 해방 뒤 공격 */
  function talentMul(m, src) {
    var T = global.DG.talent, k = T ? T.keyOfSrc(src) : null, v = 1;
    if (k && m.tm) { v *= m.tm[k] || 1; }
    if (m.c6T > 0 && T) { v *= T.C6_ATK; }
    return v;
  }
  /**
   * ⑲-5 무기·보패(weapon.js·artifact.js) — 도감에 든 인물만. '_me'·도감 밖 id 는 칼 모양에 보탬 0
   * (진단의 'fc_a' 가 옛 수치 그대로 돌게).
   */
  var SWORD_KIT = { mul: [0.9, 1.0, 1.5], sec: [0.34, 0.34, 0.55], reach: 3.2 };
  function gearMods(id) {
    var WP = global.DG.weapon, AR = global.DG.artifact, c = core();
    var own = id !== '_me' && c && c.save && c.save.dex && c.save.dex.heroes && c.save.dex.heroes[id];
    var out = { type: 'sword', kit: SWORD_KIT, watk: 0, st: {}, four: {}, pas: null, pasV: 0, wid: '' };
    if (!own) { return out; }
    if (WP) {
      var w = WP.mods(id);
      out.type = w.type; out.kit = w.kit; out.watk = w.atk; out.pas = w.pas; out.pasV = w.pasV; out.wid = w.wid;
      for (var k in w.sub) { if (Object.prototype.hasOwnProperty.call(w.sub, k)) { out.st[k] = (out.st[k] || 0) + w.sub[k]; } }
    }
    if (AR) {
      var a = AR.statsOf(id), q;
      for (q in a.stats) { if (Object.prototype.hasOwnProperty.call(a.stats, q)) { out.st[q] = (out.st[q] || 0) + a.stats[q]; } }
      out.four = a.four;
    }
    var CK = global.DG.cooking;                              // ⑲-6 요리 버프(명단 전체, 300초)
    if (CK && CK.buffStats) {
      var bf = CK.buffStats(), z;
      for (z in bf) { if (Object.prototype.hasOwnProperty.call(bf, z) && bf[z]) { out.st[z] = (out.st[z] || 0) + bf[z]; } }
    }
    return out;
  }
  /* ⑲-11 고유·갈래 스킬(kits.js) — 지략·도감 밖은 null(⑫ 모양 그대로). 손잡이 field.kits 0 이면 모두 옛 ⑫ */
  function kitFor(id) { var KT = global.DG.kits; return KT && K('kits', 1) ? KT.kitOf(id, elementOf(id)) : null; }
  function memberOf(id) {
    var h = id === '_me' ? null : (data() && data().find ? data().find(id) : null);
    var kt = kitFor(id);
    var s = statsOf(id);
    var tl = talentMods(id);
    var g = gearMods(id), st = g.st, f4 = g.four;
    function v(k) { return st[k] || 0; }
    var base = Math.max(20, Math.round(s.might * 0.7 + s.wisdom * 0.3));
    var hpMax = Math.round(((300 + s.command * 6) * (1 + v('hp_pct')) + v('hp')) * tl.hpMul * (global.DG.starchart ? global.DG.starchart.fieldHp() : 1));   // × 성도(W-0181)
    var melee = g.type === 'sword' || g.type === 'claymore' || g.type === 'polearm';
    var rf = f4.react_fire || 0;
    return {
      id: id, name: h ? h.name : '나', el: elementOf(id), shape: shapeOf(id),
      kitS: kt ? KDk(kt.skill) : null, kitB: kt ? KDk(kt.burst) : null, kitL: kt ? kt.label : '', infT: 0, infMul: 1,
      atk: Math.round(((base + g.watk) * (1 + v('atk_pct')) + v('atk')) * (global.DG.starchart ? global.DG.starchart.fieldAtk() : 1) * (global.DG.worldSet ? global.DG.worldSet.atkMul() : 1)),   // W-0748 세계 편 세트 덤(문으로 연 때만)   // × 성도(W-0181)
      hpMax: hpMax, hp: hpMax, em: s.wisdom, def: Math.round(s.command * (1 + v('def_pct')) + v('def')),
      tm: tl.tm, con: tl.con, cdMul: tl.cdMul, reactMul: tl.reactMul, c6: tl.c6, c6T: 0,
      /* ⑲-5 — 무기 종류·모양, 치명, 기력, 피해 보너스(더하기), 반응 보너스 */
      wtype: g.type, kit: KDk(g.kit), wid: g.wid,
      cr: g.wid ? 0.05 + v('crit_rate') : 0, cdm: 0.5 + v('crit_dmg'), er: 1 + v('energy'),
      dmgB: {
        n: (g.pas === 'n' ? g.pasV : 0) + (melee ? (f4.normal_melee || 0) : 0),
        s: (g.pas === 's' ? g.pasV : 0) + (f4.skill_dmg || 0),
        b: (g.pas === 'b' ? g.pasV : 0) + (f4.burst_dmg || 0)
      },
      elemB: { fire: v('elem_fire'), water: v('elem_water'), elec: v('elem_elec'), wind: v('elem_wind'), ice: v('elem_ice'), rock: v('elem_rock'), grass: v('elem_grass'), phys: v('elem_phys') },
      rxAll: g.pas === 'react' ? g.pasV : 0,
      rx: { vaporize: rf, melt: rf, overload: rf, burning: rf, swirl: f4.react_swirl || 0 },
      skillCd: 0, burstCd: 0, energy: 0, down: false, burn: null
    };
  }
  /** mulberry32 — 치명타 굴림(판마다 씨앗 고정, SAGA 진단 씨앗과 같은 식) */
  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) | 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  /** ⑲-6 요리 모험 계열 — 회피·강공격 스태미나 배율 */
  function staSave() { var C = global.DG.cooking; return C && C.staminaMul ? C.staminaMul() : 1; }
  function rxB(m, kind) { return 1 + ((m.rx && m.rx[kind]) || 0); }

  function create(partyIds) {
    var ids = (partyIds || []).slice(0, (global.DG.starchart ? global.DG.starchart.partyMax(PARTY_MAX()) : PARTY_MAX()));   // 외길(성도 규칙) — 한 명
    if (!ids.length) { ids = ['_me']; }
    return {
      t: 0, party: ids.map(memberOf), active: 0, swapCd: 0,
      stamina: STA_MAX(), staT: 9, iframe: 0, dash: null,
      combo: 0, comboT: 9, atkCd: 0, calmT: 99,
      foes: {}, camps: {}, cleared: {}, uid: 0, ev: [], kills: 0, zones: [],
      guard: null,                         // ⑲-1 굳힘 보호막 { hp, max, t } — 명단 전체가 나눠 쓴다(⑲-11 방패 틀도 여기)
      rallyT: 0, rallyMul: 1, wardT: 0, wardMul: 1, hasteT: 0,   // ⑲-11 명단 효과 — 군기(공격 곱)·맹세(받는 피해 곱)·뇌우(스킬 대기 두 배)
      loreT: 0, loreMul: 1,                // ⑲-15 옛 글자 풀이 — 명단 원소 반응 피해 곱
      rainT: 0, rainCd: 0, rainM: null, rainK: null,   // ⑲-17 뱃노래 — 남은 초·따라 치기 쉼·놓은 인물·표
      mx: 0, my: 0,                        // ⑲-17 지난 걸음의 내 자리(바람 자리 회복이 읽는다)
      crng: mulberry32(20260824)           // ⑲-5 치명타 굴림
    };
  }

  /** 편성이 바뀌었을 때 — 같은 사람은 체력 비율·쿨·기력을 그대로 들고 온다 */
  function reparty(S, partyIds) {
    var old = {}, i;
    for (i = 0; i < S.party.length; i++) { old[S.party[i].id] = S.party[i]; }
    var activeId = S.party[S.active] && S.party[S.active].id;
    var fresh = create(partyIds).party;
    for (i = 0; i < fresh.length; i++) {
      var o = old[fresh[i].id], m = fresh[i];
      if (!o) { continue; }
      m.hp = Math.round(m.hpMax * (o.hp / o.hpMax)); m.down = o.down;
      m.skillCd = o.skillCd; m.burstCd = o.burstCd; m.energy = o.energy; m.skCdMax = o.skCdMax; m.c6T = o.c6T || 0; m.infT = o.infT || 0; m.infMul = o.infMul || 1;
    }
    S.party = fresh;
    S.active = 0;
    for (i = 0; i < fresh.length; i++) { if (fresh[i].id === activeId) { S.active = i; } }
    if (S.party[S.active].down) { nextAlive(S); }
    return S;
  }

  function aliveIdx(S) {
    var out = [];
    for (var i = 0; i < S.party.length; i++) { if (!S.party[i].down) { out.push(i); } }
    return out;
  }
  function nextAlive(S) {
    for (var k = 1; k <= S.party.length; k++) {
      var j = (S.active + k) % S.party.length;
      if (!S.party[j].down) { S.active = j; return true; }
    }
    return false;
  }
  function allDown(S) { return aliveIdx(S).length === 0; }
  /* W-0774 사용자 11-22 「자동퀘스트 부터 막히네」 — 싸움이 아닌 이야기 단계의 목표가 수호자 자리 겴(guardHushR × KDV) 안이면 그 수호자는 새로 안 쫓는다.
     손으로 간 심부름 자리가 이웃 구역 수호자 싸움 한가운데였다(일지 thumb). 자동퀘스트는 W-0658 autoSkipGuard 가 따로 돌려보낸다. 손잡이 field.guardHush 0 = 옛 길 */
  var HUSH_FIGHT = { kill: 1, duel: 1, defend: 1, boss: 1, domain: 1, chase: 1 };
  function hushAt(stType, t, cp, R) { return !!(stType && !HUSH_FIGHT[stType] && t && cp && cp.kind === 'guard' && Math.hypot(t.x - cp.x, t.y - cp.y) < R); }
  function storyHush(S, f) {
    if (!+K('guardHush', 1)) { return false; }
    var cp = S.camps && S.camps[f.camp]; if (!cp || cp.kind !== 'guard') { return false; }
    var SD = global.DG.story, st = SD && SD.step ? SD.step() : null; if (!st || HUSH_FIGHT[st.type]) { return false; }
    return hushAt(st.type, SD.targetOf ? SD.targetOf(st) : null, cp, K('guardHushR', 60) * KDV);
  }

  /* ── 무리 들이기·치우기 ───────────────────────────────── */
  /** ⑲-16 그 등급에서 kind 의 공격(천하 등급 배율 포함) — 이야기 제단 체력을 이것으로 잰다 */
  function foeAtk(kind, tier) {
    var A = ADV(), w = wlNow(), a = ATK_BASE() * FOES[kind].atk * tierMul(tier);
    return Math.round(A && w ? a * A.atkMul(w) / A.atkMul(0) : a);
  }
  function spawnCamp(S, c) {
    S.camps[c.key] = { key: c.key, x: c.x, y: c.y, tier: c.tier, kind: c.kind, uids: [], sky: !!c.sky };
    for (var i = 0; i < c.foes.length; i++) {
      var F = FOES[c.foes[i].kind], m = tierMul(c.tier);
      var uid = ++S.uid;
      var hx = c.x + c.foes[i].dx * KDV, hy = c.y + c.foes[i].dy * KDV;   // W-0233 무리 안 자리도 2D 배율
      var layers = F.shields ? F.shields.slice() : (F.shield ? [F.shield] : []);
      var shieldMax = layers.length ? Math.round(SHIELD_BASE() * F.sh * m) : 0;
      S.foes[uid] = {
        uid: uid, camp: c.key, kind: c.foes[i].kind, name: F.name, el: F.el, tier: c.tier,
        x: hx, y: hy, hx: hx, hy: hy,
        hpMax: Math.round(HP_BASE() * F.hp * m), hp: Math.round(HP_BASE() * F.hp * m),
        atk: Math.round(ATK_BASE() * F.atk * m),
        shield: shieldMax, shieldMax: shieldMax, shEl: layers[0] || null, layers: layers, layer: 0,
        aura: null, auraT: 0, st: 'idle', stT: 0, cd: 0.4 + (uid % 5) * 0.2,
        wa: (uid * 2.39996) % 6.283, stun: 0, shockN: 0, shockT: 0, shockDmg: 0,
        frozenT: 0, physT: 0, quickT: 0, burnN: 0, burnT: 0, burnDmg: 0,
        mark: null, dead: false, deadT: 0, hitT: -99, moving: false, phase: 0, calmReturn: 0, sky: !!c.sky
      };
      S.camps[c.key].uids.push(uid);
      if (F.hero && c.hero) {
        var fh = S.foes[uid], hh = c.hero;
        fh.heroId = hh.id; fh.name = hh.name; fh.el = hh.el;
        fh.hpMax = fh.hp = hh.hp; fh.atk = hh.atk;
        fh.layers = hh.layers.slice(); fh.shEl = hh.layers[0] || null; fh.shield = fh.shieldMax = hh.shield;
        fh.st = 'chase';                      // 겨루자 한 쪽이라 처음부터 깨어 있다
      }
      applyWorld(S.foes[uid], wlNow());       // ⑲-7 천하 등급
    }
  }

  /**
   * 내 둘레 격자를 훑어 무리를 들이고, 멀어진(그리고 싸우지 않는) 무리는 치운다.
   * 치운 무리는 다시 오면 온전한 모습으로 선다(체력은 기억하지 않는다).
   */
  function populate(S, px, py, terr, radius, bfn, lfn, zfn, tfn) {
    var R = radius || 200, far = R * 1.6;
    /* §5 ⑲-3 보물 상자를 지키는 무리(treasure.campsNear) — 키 'tc:<상자>', 연 상자 것은 안 온다 */
    if (tfn) {
      var tcs = tfn(px, py, R) || [], ti;
      for (ti = 0; ti < tcs.length; ti++) {
        if (!S.camps[tcs[ti].key] && !S.cleared[tcs[ti].key]) { spawnCamp(S, tcs[ti]); }
      }
    }
    /* ⑪ 수호자 — 둘레 랜드마크(`biome.landmarks`)마다 하나 */
    if (lfn) {
      var lms = lfn(px, py, R) || [], li, SCg = global.DG.storySc, scZ = SCg && SCg.homeZone ? SCg.homeZone(core().save) : null, STg = global.DG.story, scK = scZ && STg && STg.anchorOf ? (STg.anchorOf(scZ) || {}).key : null;   // W-0696 세계 편 장 무대 칸의 수호자는 이야기 동안 안 깸
      for (li = 0; li < lms.length; li++) {
        var gc = guardianAt(lms[li]);
        if (!gc || S.camps[gc.key] || S.cleared[gc.key] || (scK && lms[li].key === scK)) { continue; }
        if (Math.hypot(gc.x - px, gc.y - py) <= R) { spawnCamp(S, gc); }
      }
    }
    var c0x = Math.floor((px - R) / CELL), c1x = Math.floor((px + R) / CELL);
    var c0y = Math.floor((py - R) / CELL), c1y = Math.floor((py + R) / CELL);
    for (var cy = c0y; cy <= c1y; cy++) {
      for (var cx = c0x; cx <= c1x; cx++) {
        var key = cx + '_' + cy;
        if (S.camps[key] || S.cleared[key]) { continue; }
        var c = campAt(cx, cy, terr, bfn, zfn);
        if (c && Math.hypot(c.x - px, c.y - py) <= R && !(global.DG.world && global.DG.world.vil2d && global.DG.world.vil2d() && global.DG.world.inVillage(c.x, c.y))) { spawnCamp(S, c); }   // 11-05 마을 안엔 무리 없음
      }
    }
    for (var k in S.camps) {
      if (!S.camps.hasOwnProperty(k)) { continue; }
      var cp = S.camps[k];
      if (cp.kind === 'hero' || cp.kind === 'domain' || cp.kind === 'story') { continue; }   // ⑯ 겨루는 판은 판이 끝날 때(duelCheck)·⑲-9 숨은 터 파도는 domain.js 가 치운다
      if (Math.hypot(cp.x - px, cp.y - py) <= far) { continue; }
      var busy = false, j;
      for (j = 0; j < cp.uids.length; j++) {
        var f = S.foes[cp.uids[j]];
        if (f && !f.dead && (f.st === 'chase' || f.st === 'wind')) { busy = true; }
      }
      if (busy) { continue; }
      for (j = 0; j < cp.uids.length; j++) { delete S.foes[cp.uids[j]]; }
      delete S.camps[k];
    }
  }

  /* ── 판정 ─────────────────────────────────────────────── */
  function push(S, e) { S.ev.push(e); return e; }
  /** ⑲-20 구름섬 — 나와 다른 층(섬 위·밑)의 적은 서로 못 본다(skyisle.apart). 층이 없으면 늘 false */
  function apart(f) { var SK = global.DG.skyIsle; return !!(SK && SK.apart && SK.apart(f)); }
  function living(S) {
    var out = [], SK = global.DG.skyIsle, lay = !!(SK && SK.layerOn && SK.layerOn()), me = lay && SK.meOnSky ? SK.meOnSky() : false, f;   // W-0389 ③-4 층 검사를 적마다 하던 것(2.9%) — 한 번만, apart 와 같은 식
    for (var k in S.foes) { if (!S.foes.hasOwnProperty(k)) { continue; } f = S.foes[k]; if (!f.dead && f.st !== 'yield' && !(lay && !!f.sky !== me)) { out.push(f); } }
    return out;
  }
  function nearestFoe(S, px, py, r) {
    var best = null, bd = r;
    var L = living(S);
    for (var i = 0; i < L.length; i++) {
      var d = Math.max(0, Math.hypot(L[i].x - px, L[i].y - py) - BODY(L[i]));
      if (d <= bd) { bd = d; best = L[i]; }
    }
    return best;
  }
  function foesWithin(S, x, y, r) {
    var out = [], L = living(S);
    for (var i = 0; i < L.length; i++) { if (Math.hypot(L[i].x - x, L[i].y - y) - BODY(L[i]) <= r) { out.push(L[i]); } }
    return out;
  }
  function wake(f) { if (f.st === 'idle' || f.st === 'return') { f.st = 'chase'; f.stT = 0; } }

  function killCheck(S, f) {
    if (f.hp > 0 || f.dead || f.st === 'yield') { return; }
    if (FOES[f.kind].hero) { yieldHero(S, f); return; }
    f.hp = 0; f.dead = true; f.deadT = 0; f.mark = null;
    S.kills++;
    push(S, { t: 'kill', uid: f.uid, kind: f.kind, tier: f.tier, x: f.x, y: f.y, camp: f.camp, boss: !!FOES[f.kind].boss, elite: !!FOES[f.kind].shield && !FOES[f.kind].light, shield: !!FOES[f.kind].shield, guard: !!FOES[f.kind].guard });
    var cp = S.camps[f.camp];
    if (!cp) { return; }
    for (var i = 0; i < cp.uids.length; i++) {
      var g = S.foes[cp.uids[i]];
      if (g && !g.dead) { return; }
    }
    S.cleared[cp.key] = true;
    push(S, { t: 'clear', camp: cp.key, tier: cp.tier, kind: cp.kind, x: cp.x, y: cp.y });
  }

  /** ⑯ 인물이 굴복 — 쓰러뜨리지 않고 무릎 꿇린다(몸은 그 자리에 남아 등용 카드로 넘어간다). 졸개는 흩어진다 */
  function yieldHero(S, f) {
    f.hp = 0; f.mark = null; f.st = 'yield'; f.stun = 99;
    var cp = S.camps[f.camp];
    if (cp) {
      for (var i = 0; i < cp.uids.length; i++) { if (cp.uids[i] !== f.uid) { delete S.foes[cp.uids[i]]; } }
    }
    push(S, { t: 'yield', uid: f.uid, heroId: f.heroId, camp: f.camp, x: f.x, y: f.y });
  }

  /** ⑯ 겨루는 판 끝 — 굴복(win)·전멸(lose)·끌고 멀어져 인물이 돌아감(flee). 판을 치우고 사건 하나 */
  function endDuel(S, result) {
    var D = S.duel;
    if (!D) { return; }
    var cp = S.camps[D.camp];
    if (cp) { for (var i = 0; i < cp.uids.length; i++) { delete S.foes[cp.uids[i]]; } delete S.camps[D.camp]; }
    S.duel = null;
    push(S, { t: 'duelEnd', result: result, spawnUid: D.spawnUid, heroId: D.heroId });
  }
  /** 굴복하면 1초 무릎 꿇은 채 두었다가(보이게) 끝낸다 */
  function duelCheck(S, dt) {
    var D = S.duel;
    if (!D) { return; }
    var f = S.foes[D.uid];
    if (!f) { endDuel(S, 'flee'); return; }
    if (f.st === 'yield') { D.yieldT = (D.yieldT || 0) + dt; if (D.yieldT > 1) { endDuel(S, 'win'); } return; }
    if (f.st === 'return' || f.st === 'idle') { endDuel(S, D.wiped ? 'lose' : 'flee'); }
  }

  /** 방패 한 겹이 깨졌다 — 남은 겹이 있으면 곧바로 다음 원소 방패가 서고(짧게 휘청),
   *  마지막 겹이면 길게 드러눕는다. 한 겹짜리 정예는 예전 그대로(2초) */
  function breakShield(S, f) {
    var L = f.layers || [], more = f.layer + 1 < L.length;
    f.mark = null; f.st = 'chase';
    if (more) {
      f.layer++;
      f.shEl = L[f.layer];
      f.shield = f.shieldMax;
      f.stun = LAYER_STUN();
      push(S, { t: 'break', uid: f.uid, camp: f.camp, x: f.x, y: f.y, next: f.shEl, left: L.length - f.layer });
      return;
    }
    f.stun = L.length > 1 ? CORE_STUN() : SHIELD_STUN();
    push(S, { t: 'break', uid: f.uid, camp: f.camp, x: f.x, y: f.y, next: null, left: 0 });
  }

  /** 방패부터 깎는 날것의 피해(광역 반응 조각·물벼락 틱이 쓴다) */
  function rawHit(S, f, dmg) {
    if (f.dead || dmg <= 0) { return 0; }
    if (f.shield > 0) {
      f.shield = Math.max(0, f.shield - dmg);
      if (f.shield <= 0) { breakShield(S, f); }
      return dmg;
    }
    f.hp -= dmg;
    killCheck(S, f);
    return dmg;
  }

  /**
   * 한 대 — 방패·원소 부착·반응을 다 여기서 가른다.
   * @returns {{uid, dmg, react, shield, immune}}
   */
  function hitFoe(S, f, m, raw, el, src, force) {
    var out = { uid: f.uid, dmg: 0, react: null, shield: false, immune: false };
    if (f.dead) { return out; }
    var emB = (1 + (m.em || 0) / 300) * (m.reactMul || 1) * (1 + (m.rxAll || 0));   // ⑲-4 깨달음 2 · ⑲-5 무기 반응 효과
    if (S.loreT > 0) { emB *= S.loreMul; }                            // ⑲-15 옛 글자 풀이 — 명단 반응 피해
    var mul = f.stun > 0 ? STUN_MUL() : 1;
    raw *= talentMul(m, src); if (global.DG.mountCombat) { raw *= global.DG.mountCombat.hitMul(src); } if (global.DG.fieldParry) { raw *= global.DG.fieldParry.nextMul(); } if (global.DG.fieldEnv) { global.DG.fieldEnv.onHit(S, f, el, src); }
    if (S.rallyT > 0 && src !== 'test') { raw *= S.rallyMul; }        // ⑲-11 군기·학날개 진
    if (global.DG.worldSet && global.DG.worldSet.hitMul && src !== 'test') { raw *= global.DG.worldSet.hitMul(S, f, m, src); }   // W-0749 세계 세트 사건 각인(첫 불·두드릴수록·버티기)
    if (f.markT > 0 && src !== 'test') { raw *= f.markMul || 1; }     // ⑲-15 그림자 걸음 표식 — 누구에게든
    /* ⑲-5 — 피해 보너스(원소/물리 + 무기 효과 + 세트 4, 더하기)·치명타. 출처가 인물의 한 방일 때만 */
    var TLk = global.DG.talent, gk = TLk ? TLk.keyOfSrc(src) : null;
    if (gk && m.dmgB) {
      raw *= (1 + (m.dmgB[gk] || 0) + ((m.elemB && m.elemB[el || 'phys']) || 0)) * (global.DG.weather ? global.DG.weather.boostMul(el) : 1);   // W-0475 날씨 부스트
      if (m.cr > 0 && S.crng && S.crng() < m.cr) { raw *= 1 + (m.cdm || 0); out.crit = true; }
    }
    if (force && !out.crit) { raw *= 1 + (m.cdm || 0.5); out.crit = true; }   // ⑲-22 급소 — 반드시 치명
    S.calmT = 0; f.hitT = S.t; wake(f);
    if (f.shield > 0) {
      var sm = shieldMul(f.shEl, el);
      out.shield = true; out.immune = sm === 0;
      out.dmg = Math.round(raw * mul * sm);
      rawHit(S, f, out.dmg);
    } else {
      var rc = null, extra = 1;
      if (!el && f.physT > 0) { extra *= SUPER_PHYS(); }                       // 서리번개 뒤 물리
      if (f.frozenT > 0 && (el === 'rock' || src === 'heavy')) {
        /* 깨뜨림 — 얼어 멈춘 적을 암이나 3타째 기본 공격으로 깨면 크게 들어가고 풀린다 */
        rc = { kind: 'shatter', name: REACT_NAME.shatter }; extra *= SHATTER_MUL(); f.frozenT = 0;
      } else if (f.quickT > 0 && (el === 'elec' || el === 'grass')) {
        /* 싹틈 상태 — 뇌는 번개싹, 초는 덩굴뻗음 ×1.25(붙은 원소는 안 건드린다) */
        rc = { kind: el === 'elec' ? 'aggravate' : 'spread', name: REACT_NAME[el === 'elec' ? 'aggravate' : 'spread'] };
        extra *= QUICK_MUL() * emB;
      } else {
        rc = react(f.aura, el);
        if (!rc && attaches(el)) { f.aura = el; f.auraT = AURA_T(); }
        if (rc) { f.aura = null; f.auraT = 0; }
        if (rc && rc.kind === 'vaporize') { extra *= VAPOR_MUL() * emB * rxB(m, 'vaporize'); }
        if (rc && rc.kind === 'melt') { extra *= MELT_MUL() * emB * rxB(m, 'melt'); }
      }
      out.dmg = Math.round(raw * mul * extra);
      f.hp -= out.dmg; if (global.DG.fieldWeak) { global.DG.fieldWeak.onHit(S, f, out); }   // W-0395 ② 보스 약점
      if (rc) {
        out.react = rc.kind;
        var near, i;
        if (rc.kind === 'frozen') {
          f.frozenT = FROZEN_T(); f.mark = null;
          if (f.st === 'wind') { f.st = 'chase'; f.cd = FOES[f.kind].cd * (f.cdMul || 1); }       // 휘두르던 것도 멎는다
        } else if (rc.kind === 'superconduct') {
          near = foesWithin(S, f.x, f.y, SUPER_R());
          for (i = 0; i < near.length; i++) { near[i].physT = SUPER_T(); wake(near[i]); rawHit(S, near[i], Math.round(m.atk * SUPER_MUL() * emB)); }
        } else if (rc.kind === 'swirl') {
          near = foesWithin(S, f.x, f.y, SWIRL_R());
          for (i = 0; i < near.length; i++) {
            var sg = near[i];
            if (sg === f) { continue; }
            wake(sg);
            if (!sg.aura || sg.aura === rc.from) { sg.aura = rc.from; sg.auraT = AURA_T(); }
            rawHit(S, sg, Math.round(m.atk * SWIRL_MUL() * emB * rxB(m, 'swirl')));
          }
        } else if (rc.kind === 'crystallize') {
          var am = active(S), gh = Math.round((am ? am.hpMax : 600) * CRYSTAL_HP());
          S.guard = { hp: Math.max(gh, S.guard ? S.guard.hp : 0), max: gh, t: CRYSTAL_T() };
        } else if (rc.kind === 'bloom') {
          S.zones.push({ kind: 'seed', x: f.x, y: f.y, r: BLOOM_R(), t: BLOOM_T(), el: 'grass', dmg: Math.round(m.atk * BLOOM_MUL() * emB) });
        } else if (rc.kind === 'burning') {
          f.burnN = BURN_N(); f.burnT = BURN_EVERY(); f.burnDmg = Math.max(1, Math.round(m.atk * BURN_MUL() * emB * rxB(m, 'burning')));
        } else if (rc.kind === 'quicken') {
          f.quickT = QUICK_T();
        } else if (rc.kind === 'overload') {
          near = foesWithin(S, f.x, f.y, OVERLOAD_R());
          var od = Math.round(m.atk * OVERLOAD_MUL() * emB * rxB(m, 'overload'));
          for (i = 0; i < near.length; i++) {
            var g = near[i];
            var ang = Math.atan2(g.y - f.y, g.x - f.x);
            if (g !== f) { g.x += Math.cos(ang) * 2.5 * KDV; g.y += Math.sin(ang) * 2.5 * KDV; }
            wake(g);
            rawHit(S, g, od);
          }
        } else if (rc.kind === 'charged') {
          near = foesWithin(S, f.x, f.y, CHARGED_R());
          for (i = 0; i < near.length; i++) {
            near[i].shockN = 3; near[i].shockT = 1;
            near[i].shockDmg = Math.round(m.atk * CHARGED_MUL() * emB);
            wake(near[i]);
          }
        }
        push(S, { t: 'react', kind: rc.kind, name: rc.name, x: f.x, y: f.y });
      }
      killCheck(S, f);
    }
    push(S, { t: 'hit', uid: f.uid, x: f.x, y: f.y, dmg: out.dmg, el: el, react: out.react, src: src, shield: out.shield, immune: out.immune, crit: !!out.crit });
    return out;
  }

  function active(S) { return S.party[S.active]; }
  /* ⑲-11 검기·불새 깃 — 부여 중이면 기본·강·낙하 공격이 인물 원소로, 피해 곱 */
  function infEl(m) { return m.infT > 0 ? m.el : null; }
  function infM(m) { return m.infT > 0 ? m.infMul || 1 : 1; }

  /** 기본 공격 — 3타 사슬(0.9·1.0·1.5). 사거리 밖이면 6m 안의 적에게 파고든다 */
  function attack(S, px, py) {
    var m = active(S); if (global.DG.mountCombat && global.DG.mountCombat.blockMelee()) { return { ok: false, mounted: true }; } if (global.DG.fieldStandoff && S.atkCd <= 0) { var soR = global.DG.fieldStandoff.tryStrike(S, px, py); if (soR) { return soR; } } if (m && !m.down && global.DG.fieldParry && global.DG.fieldParry.tryParry(S, px, py)) { S.atkCd = 0.3; return { ok: true, parry: true }; }   // W-0375 예고 끝 직전 평타 = 쳐내기
    if (!m || m.down || S.atkCd > 0) { return { ok: false }; }
    /* ⑲-5 무기 종류마다 모양 — 칼은 옛 3타(사거리 손잡이 그대로), 서책·활은 멀리 하나(파고들지 않는다) */
    var kit = m.kit || SWORD_KIT, reach = kit === SWORD_KIT || m.wtype === 'sword' ? REACH() : kit.reach, tgt;
    if (kit.range) {
      tgt = nearestFoe(S, px, py, kit.range);
      /* ⑲-22 둘레에 적이 없으면 사거리 안 상자 과녁을 친다(활잡이가 없어도 서책으로 풀린다) */
      var TRs = global.DG.treasure, tp = !tgt && TRs && TRs.shootNear ? TRs.shootNear(px, py, kit.range) : null;
      if (tp) {
        TRs.shootSeg(tp.x, tp.y, tp.x, tp.y);
        var st0 = S.combo % 3;
        S.combo++; S.comboT = 0; S.atkCd = kit.sec[st0];
        push(S, { t: 'swing', step: st0, w: m.wtype, ranged: true, tx: tp.x, ty: tp.y, el: kit.el ? m.el : null });
        return { ok: true, step: st0, target: true };
      }
    } else {
      tgt = nearestFoe(S, px, py, reach);
      if (!tgt) {
        var n = nearestFoe(S, px, py, LUNGE_R());
        if (n) {
          var d = Math.hypot(n.x - px, n.y - py) || 1, go = Math.max(0, d - BODY(n) - reach * 0.7);
          S.dash = { vx: (n.x - px) / d * go / 0.14, vy: (n.y - py) / d * go / 0.14, t: 0.14 };
          tgt = n;
        }
      }
    }
    var step = S.combo % 3;
    S.combo++; S.comboT = 0;
    S.atkCd = kit.sec[step];
    if (!tgt) { push(S, { t: 'swing', step: step, w: m.wtype }); return { ok: true, miss: true, step: step }; }
    var r = hitFoe(S, tgt, m, m.atk * kit.mul[step] * infM(m), kit.el ? m.el : infEl(m), kit.heavy ? 'heavy' : 'basic');
    rainFollow(S, px, py);                                          // ⑲-17 뱃노래
    m.energy = Math.min(ENERGY_MAX(), m.energy + 1.5 * (m.er || 1));
    push(S, { t: 'swing', step: step, uid: tgt.uid, w: m.wtype, ranged: !!kit.range, tx: tgt.x, ty: tgt.y, el: kit.el ? m.el : null });
    return { ok: true, step: step, hit: r };
  }

  /* R-4 11-17 — 1만리 들판 전투 손 공격 은 js/field-aim.js(make(U), 몸통 글자 그대로) */ var amObj = null; function AM() { return amObj || (amObj = global.DG.fieldAim.make({ AIM_FULL: AIM_FULL, AIM_R: AIM_R, ARROW_V: ARROW_V, BODY: BODY, CHARGE_MUL: CHARGE_MUL, DASH_LEN: DASH_LEN, DASH_T: DASH_T, ENERGY_MAX: ENERGY_MAX, FIELD_R: FIELD_R, FOES: FOES, LUNGE_R: LUNGE_R, PLUNGE_MAX_M: PLUNGE_MAX_M, PLUNGE_PER_M: PLUNGE_PER_M, SKILL_AIM: SKILL_AIM, SKILL_CD: SKILL_CD, SKILL_MUL: SKILL_MUL, SKILL_R: SKILL_R, SUMMON_T: SUMMON_T, THRUST_LEN: THRUST_LEN, active: active, foesWithin: foesWithin, hitFoe: hitFoe, infEl: infEl, infM: infM, kitSkill: kitSkill, living: living, nearestFoe: nearestFoe, on: on, push: push, rainFollow: rainFollow, segDist: segDist, staSave: staSave, stepZones: stepZones, AIM_CONE: AIM_CONE, AIM_FULLMUL: AIM_FULLMUL, AIM_GAP: AIM_GAP, AIM_PART: AIM_PART, AIM_TURN: AIM_TURN, ARROW_EL_R: ARROW_EL_R, ARROW_RANGE: ARROW_RANGE, CHARGE_ARC: CHARGE_ARC, CHARGE_COST: CHARGE_COST, CHARGE_REACH: CHARGE_REACH, DASH_MUL: DASH_MUL, DASH_W: DASH_W, FIELD_T: FIELD_T, PLUNGE_MUL: PLUNGE_MUL, PLUNGE_R: PLUNGE_R, SUMMON_R: SUMMON_R, THRUST_MUL: THRUST_MUL, THRUST_W: THRUST_W, KDV: function () { return KDV; } })); }
  function canAim(S) { return AM().canAim(S); } function aimCands(S, px, py) { return AM().aimCands(S, px, py); } function aimLock(S, px, py) { return AM().aimLock(S, px, py); } function aimStart(S, px, py) { return AM().aimStart(S, px, py); } function aimEnd(S) { return AM().aimEnd(S); } function aimSteer(S, ux, uy, dt) { return AM().aimSteer(S, ux, uy, dt); } function aimHold(S) { return AM().aimHold(S); } function aimShoot(S, px, py) { return AM().aimShoot(S, px, py); } function foeR(f) { return AM().foeR(f); } function arrowHit(S, r, f) { return AM().arrowHit(S, r, f); } function stepArrows(S, dt) { return AM().stepArrows(S, dt); } function heavy(S, px, py) { return AM().heavy(S, px, py); } function plungeMul(fell) { return AM().plungeMul(fell); } function plunge(S, px, py, fell) { return AM().plunge(S, px, py, fell); } function skill(S, px, py) { return AM().skill(S, px, py); }

  var KB_T = 0.25;   // R-4 11-17 밀어냄 시간 — field-grab 도 받아 써서 여기 남김(knock 은 field-kits.js)
  /** ⑲-11 명단 보호막 — 지금 인물 최대 체력 × pct, 있던 것보다 크면 바꾼다 */
  /* R-4 11-17 — 1만리 들판 전투 무예 키트 은 js/field-kits.js(make(U), 몸통 글자 그대로) */ var ksObj = null; function KS() { return ksObj || (ksObj = global.DG.fieldKits.make({ BODY: BODY, BURST_CD: BURST_CD, BURST_MUL: BURST_MUL, BURST_R: BURST_R, DASH_T: DASH_T, ENERGY_MAX: ENERGY_MAX, FOES: FOES, KB_T: KB_T, SKILL_AIM: SKILL_AIM, active: active, foesWithin: foesWithin, hitFoe: hitFoe, living: living, nearestFoe: nearestFoe, push: push, rawHit: rawHit, segDist: segDist, wake: wake, FIELD_MUL: FIELD_MUL, SUMMON_EVERY: SUMMON_EVERY, SUMMON_MUL: SUMMON_MUL, KDV: function () { return KDV; } })); }
  function giveGuard(S, m, pct, sec) { return KS().giveGuard(S, m, pct, sec); } function knock(f, ux, uy, dist) { return KS().knock(f, ux, uy, dist); } function rainFollow(S, px, py) { return KS().rainFollow(S, px, py); } function kitExtras(S, m, k) { return KS().kitExtras(S, m, k); } function kitSkill(S, m, px, py) { return KS().kitSkill(S, m, px, py); } function kitBurst(S, m, px, py) { return KS().kitBurst(S, m, px, py); } function stepZones(S, dt) { return KS().stepZones(S, dt); } function burst(S, px, py) { return KS().burst(S, px, py); }

  function dodge(S, dx, dy, px, py) {
    var dc = DODGE_COST() * staSave();
    if (S.stamina < dc || allDown(S)) { return { ok: false }; }
    if (dx || dy) { S.lastDx = dx; S.lastDy = dy; }
    if (!dx && !dy) {
      var n = nearestFoe(S, px || 0, py || 0, 30 * KDV);
      if (n) { dx = (px || 0) - n.x; dy = (py || 0) - n.y; } else { dy = 1; }
    }
    var len = Math.hypot(dx, dy) || 1;
    S.stamina -= dc; S.staT = 0;
    S.iframe = Math.max(S.iframe, DODGE_IFRAME());
    S.dash = { vx: dx / len * DASH_M() / DASH_T(), vy: dy / len * DASH_M() / DASH_T(), t: DASH_T() };
    push(S, { t: 'dodge' });
    return { ok: true };
  }

  /** 교체 — 1초 쿨. 쓰러진 사람에게는 못 바꾼다 */
  function swap(S, idx) {
    var m = S.party[idx];
    if (!m || idx === S.active || m.down || S.swapCd > 0) { return { ok: false }; }
    S.active = idx; S.swapCd = SWAP_CD(); S.combo = 0;
    push(S, { t: 'swap', idx: idx, id: m.id, el: m.el });
    return { ok: true };
  }

  function hurt(S, f, mul) {
    var m = active(S);
    if (!m || m.down) { return; }
    var dmg = Math.max(1, Math.round(f.atk * (mul || 1) * (f.weakMul || 1) * (1 - m.def / (m.def + 300)) * (global.DG.starchart ? global.DG.starchart.take() : 1)));   // mul — ⑲-14 공격 차례의 한 수 배수 · 철벽 부대(성도)
    if (S.wardT > 0) { dmg = Math.max(1, Math.round(dmg * S.wardMul)); }   // ⑲-11 맹세·오천의 맹세
    var rockX = f.el === 'rock' ? Math.round(dmg * 0.3) : 0; if (global.DG.mountCombat) { global.DG.mountCombat.onHurt(); } if (global.DG.worldSet && global.DG.worldSet.onHurt) { global.DG.worldSet.onHurt(S); }   // W-0749 버티기   // ⑲-1 짓눌림 — 이것만으로는 안 쓰러진다
    S.calmT = 0;
    /* ⑲-1 결정 보호막이 먼저 막는다 — 다 막으면 원소 효과도 없다 */
    var G = S.guard, absorbed = 0;
    if (G && G.hp > 0) {
      absorbed = Math.min(G.hp, dmg + rockX);
      G.hp -= absorbed;
      var fromBase = Math.min(dmg, absorbed);
      dmg -= fromBase; rockX -= absorbed - fromBase;
      if (G.hp <= 0) { S.guard = null; }
    }
    if (dmg <= 0 && rockX <= 0) {
      push(S, { t: 'hurt', uid: f.uid, dmg: 0, el: f.el, id: m.id, guarded: absorbed });
      return;
    }
    m.hp -= dmg;
    if (rockX > 0 && m.hp > 0) { m.hp = Math.max(1, m.hp - rockX); }
    var tot = dmg + rockX;
    if (f.el === 'fire') { m.burn = { n: 3, t: 1, dmg: Math.max(1, Math.round(tot * 0.2)) }; }
    else if (f.el === 'water') { S.stamina = Math.max(0, S.stamina - 25); S.staT = 0; }
    else if (f.el === 'elec') { m.energy = Math.max(0, m.energy - 10); }
    else if (f.el === 'wind') { m.skillCd += 2; }                                   // 휘말림
    else if (f.el === 'ice') { S.staT = Math.min(S.staT, -2.2); }                   // 한기 — 스태미나 회복 3초 멈춤
    else if (f.el === 'grass') { m.burn = { n: 4, t: 1, dmg: Math.max(1, Math.round(tot * 0.15)), poison: true }; }   // 중독(화상 자리)
    push(S, { t: 'hurt', uid: f.uid, dmg: tot, el: f.el, id: m.id, guarded: absorbed });
    if (m.hp <= 0) { downMember(S, S.active); }
  }

  function downMember(S, idx) {
    var m = S.party[idx];
    m.hp = 0; m.down = true; m.burn = null;
    push(S, { t: 'down', idx: idx, id: m.id });
    if (idx === S.active && nextAlive(S)) {
      push(S, { t: 'swap', idx: S.active, id: S.party[S.active].id, el: S.party[S.active].el, forced: true });
    }
    if (allDown(S)) {
      /* 전멸 — 모두 30% 로 일어나고 붙어 있던 무리는 제자리로 돌아가 다시 찬다 */
      for (var i = 0; i < S.party.length; i++) {
        var p = S.party[i];
        p.down = false; p.hp = Math.round(p.hpMax * 0.3); p.burn = null;
      }
      S.active = 0;
      var L = living(S);
      for (var j = 0; j < L.length; j++) {
        if (L[j].st !== 'idle') { L[j].st = 'return'; L[j].mark = null; L[j].calmReturn = 3; }
      }
      S.calmT = 0;
      if (S.duel) { S.duel.wiped = true; }
      S.guard = null;
      push(S, { t: 'wipe' });
    }
  }

  /**
   * 한 걸음. inp = { px, py, blocked }. blocked 면(조우 창·시트) 적이 제자리에 멎는다.
   * 쌓인 사건은 S.ev 로 남는다 — 부른 쪽이 비운다(`drain`).
   */
  function step(S, dt, inp) {
    var px = inp.px, py = inp.py;
    S.mx = px; S.my = py;
    S.t += dt;
    S.calmT += dt;
    S.iframe = Math.max(0, S.iframe - dt);
    S.swapCd = Math.max(0, S.swapCd - dt);
    S.atkCd = Math.max(0, S.atkCd - dt); if (global.DG.fieldEnv) { global.DG.fieldEnv.tick(S, dt); } if (global.DG.fieldGrab) { global.DG.fieldGrab.step(S, dt, px, py); } if (global.DG.fieldStandoff && !inp.blocked && !(S.talkCalm > 0) && !(S.travelCalm > 0)) { global.DG.fieldStandoff.step(S, dt, px, py); }   // W-0420 ② 대치 · W-0277 잡기·던지기(field-grab.js) — 쿨·든 적 옮기기·착지
    if (S.aim) {                                                    // ⑲-22 조준 — 활 아닌 인물·쓰러짐·대화면 풀린다
      if (!canAim(S) || inp.blocked) { aimEnd(S); }
      else { if (S.aim.hold) { S.aim.t = Math.min(AIM_FULL() + 1, S.aim.t + dt); } aimLock(S, px, py); }
    }
    stepArrows(S, dt);
    S.comboT += dt;
    if (S.comboT > 1.0) { S.combo = 0; }
    S.staT += dt;
    if (S.staT > 0.8) { S.stamina = Math.min(STA_MAX(), S.stamina + 30 * dt); }
    if (S.dash) {
      var dd = Math.min(dt, S.dash.t);
      push(S, { t: 'move', dx: S.dash.vx * dd, dy: S.dash.vy * dd });
      S.dash.t -= dd;
      if (S.dash.t <= 1e-6) { S.dash = null; }
    }
    if (S.zones && S.zones.length) { stepZones(S, dt); }
    if (S.guard) { S.guard.t -= dt; if (S.guard.t <= 0 || S.guard.hp <= 0) { S.guard = null; } }
    if (S.rallyT > 0) { S.rallyT = Math.max(0, S.rallyT - dt); }
    if (S.loreT > 0) { S.loreT = Math.max(0, S.loreT - dt); }
    if (S.rainT > 0) { S.rainT = Math.max(0, S.rainT - dt); }       // ⑲-17 뱃노래
    if (S.rainCd > 0) { S.rainCd = Math.max(0, S.rainCd - dt); }
    if (S.wardT > 0) { S.wardT = Math.max(0, S.wardT - dt); }
    if (S.hasteT > 0) { S.hasteT = Math.max(0, S.hasteT - dt); }
    var i, m;
    for (i = 0; i < S.party.length; i++) {
      m = S.party[i];
      m.skillCd = Math.max(0, m.skillCd - dt * (S.hasteT > 0 ? 2 : 1));   // ⑲-11 천기 뇌우 — 두 배로 돈다
      m.burstCd = Math.max(0, m.burstCd - dt);
      if (m.c6T > 0) { m.c6T = Math.max(0, m.c6T - dt); }
      if (m.infT > 0) { m.infT = Math.max(0, m.infT - dt); }
      if (m.burn && !m.down) {
        m.burn.t -= dt;
        if (m.burn.t <= 0) {
          m.burn.t += 1; m.burn.n--;
          m.hp = Math.max(1, m.hp - m.burn.dmg);   // 화상만으로는 안 쓰러진다
          push(S, { t: 'burn', idx: i, dmg: m.burn.dmg });
          if (m.burn.n <= 0) { m.burn = null; }
        }
      }
      if (!m.down && S.calmT > CALM_REGEN()) { m.hp = Math.min(m.hpMax, m.hp + m.hpMax * 0.04 * dt); }
      if (m.down && S.calmT > REVIVE_CALM()) { m.down = false; m.hp = Math.round(m.hpMax * 0.3); push(S, { t: 'revive', idx: i }); }
    }

    var ids = Object.keys(S.foes);
    for (var n = 0; n < ids.length; n++) {
      var f = S.foes[ids[n]];
      if (!f) { continue; }
      if (f.dead) {
        f.deadT += dt;
        if (f.deadT > 1.2) { delete S.foes[ids[n]]; }
        continue;
      }
      f.moving = false;
      if (f.kb) {                                         // ⑲-17 밀려남 — 멎어 있어도 미끄러진다
        var kbt = Math.min(dt, f.kb.t);
        f.x += f.kb.vx * kbt; f.y += f.kb.vy * kbt; f.kb.t -= dt;
        if (f.kb.t <= 1e-9) { f.kb = null; }
      }
      if (f.sky) { var SKc = global.DG.skyIsle; if (SKc && SKc.clampIn) { SKc.clampIn(f); } }   // ⑲-20 섬 무리는 난간을 못 넘는다
      if (f.auraT > 0) { f.auraT -= dt; if (f.auraT <= 0) { f.aura = null; } }
      if (f.shockN > 0) {
        f.shockT -= dt;
        if (f.shockT <= 0) {
          f.shockT += 1; f.shockN--;
          var sd = rawHit(S, f, f.shockDmg);
          push(S, { t: 'dot', uid: f.uid, x: f.x, y: f.y, dmg: sd, el: 'elec' });
          if (f.dead) { continue; }
        }
      }
      if (f.physT > 0) { f.physT -= dt; }
      if (f.markT > 0) { f.markT -= dt; }                 // ⑲-15 표식
      if (f.quickT > 0) { f.quickT -= dt; }
      if (f.burnN > 0) {                                  // ⑲-1 들불 — 0.5초마다 여덟 번
        f.burnT -= dt;
        if (f.burnT <= 0) {
          f.burnT += BURN_EVERY(); f.burnN--;
          var bd = rawHit(S, f, f.burnDmg);
          push(S, { t: 'dot', uid: f.uid, x: f.x, y: f.y, dmg: bd, el: 'fire' });
          if (f.dead) { continue; }
        }
      }
      if (inp.blocked) { continue; }
      if (f.frozenT > 0) { f.frozenT -= dt; continue; }   // ⑲-1 얼어붙음 — 꼼짝 못 한다
      if (f.stun > 0) { f.stun -= dt; continue; }
      var F = FOES[f.kind];
      /* ⑲-20 층이 갈리면(내가 섬에서 뛰어내렸다) 쫓던 적은 제자리로 — 나를 못 본다 */
      var far = apart(f);
      if (far && (f.st === 'chase' || f.st === 'wind' || f.st === 'recover')) { f.st = 'return'; f.mark = null; }
      var d = far ? Infinity : Math.hypot(f.x - px, f.y - py);
      var home = Math.hypot(f.x - f.hx, f.y - f.hy);
      if (f.st !== 'return' && f.st !== 'idle' && home > LEASH_R()) { f.st = 'return'; f.mark = null; }
      if (f.st === 'idle') {
        if (f.so) { continue; } f.wa += dt * 0.35;   // W-0420 ② 대치 — 멈춰 노려봄(field-standoff 가 달려듦을 옮긴다)
        var tx = f.hx + Math.cos(f.wa) * 2.2 * KDV, ty = f.hy + Math.sin(f.wa * 0.8) * 2.2 * KDV;
        moveToward(f, tx, ty, 1.1 * KDV * dt);
        if ((d < AGGRO_R() || f.siege) && !allDown(S) && !(S.talkCalm > 0) && !(S.travelCalm > 0) && !(!f.siege && storyHush(S, f))) { f.st = 'chase'; push(S, { t: 'aggro', uid: f.uid, camp: f.camp }); }
      } else if (f.st === 'return') {
        f.calmReturn = Math.max(0, f.calmReturn - dt);
        moveToward(f, f.hx, f.hy, F.spd * KDV * 1.2 * dt);
        if (Math.hypot(f.x - f.hx, f.y - f.hy) < 0.6 * KDV) {
          f.st = 'idle'; f.hp = f.hpMax; f.shield = f.shieldMax; f.aura = null; f.shockN = 0;
          f.frozenT = 0; f.physT = 0; f.quickT = 0; f.burnN = 0;
          f.layer = 0; f.shEl = (f.layers && f.layers[0]) || f.shEl;
        }
      } else if (f.st === 'chase') {
        S.calmT = Math.min(S.calmT, 0);
        /* ⑲-14 공격 차례(rot)가 있으면 이번 수의 reach·wind·r 을 쓴다 */
        var AT = F.rot ? F.rot[(f.rotI || 0) % F.rot.length] : F.type, RT = F.rot ? ROT[AT] : F;
        var want = AT === 'shadow' ? 0 : (AT === 'spit' ? RT.reach * KDV * 0.85 : RT.reach * KDV * 0.8);
        /* ⑲-16 지킬 것 — 내가 SIEGE_PULL 밖이면 제단이 과녁(제단 몸 둘레만큼 덜 다가간다) */
        var sg = f.siege && d > SIEGE_PULL * KDV ? f.siege : null;
        var gx = sg ? sg.x : px, gy = sg ? sg.y : py, gd = (sg ? Math.max(0, Math.hypot(f.x - gx, f.y - gy) - SIEGE_BODY * KDV) : d) - (AT === 'shadow' ? 0 : BODY(f));
        if (gd > want && AT !== 'shadow') { moveToward(f, gx, gy, F.spd * KDV * dt); }
        f.cd -= dt;
        if (gd <= RT.reach * KDV && f.cd <= 0 && !allDown(S)) {
          f.st = 'wind'; f.stT = RT.wind; f.atkT = AT; f.atkSiege = !!sg; f.windT = RT.wind; f.windR = (RT.reach + 0.6) * KDV + BODY(f);   // W-0660 2D 예고 원(juice2d)
          if (AT === 'shadow') {
            /* 나를 지나 등 뒤로 — 오던 쪽의 반대편 SHADOW_BACK m 에 붙어 제 둘레를 친다 */
            var sdx = px - f.x, sdy = py - f.y, sdl = Math.hypot(sdx, sdy) || 1;
            f.x = px + sdx / sdl * SHADOW_BACK * KDV; f.y = py + sdy / sdl * SHADOW_BACK * KDV;
            push(S, { t: 'blink', uid: f.uid, x: f.x, y: f.y });
          }
          if (AT === 'tide' || AT === 'rift') {
            var tl = tideMarks(f.x, f.y, gx, gy, AT);
            f.mark = { x: tl[0].x, y: tl[0].y, r: RT.r * KDV, t: RT.wind, list: tl };
          } else {
            f.mark = AT === 'spit' ? { x: gx, y: gy, r: RT.r * KDV, t: RT.wind }
              : (AT === 'halo' ? { x: f.x, y: f.y, r: RT.r * KDV, inner: RT.inner * KDV, t: RT.wind }
                : (AT === 'slam' || AT === 'shadow' ? { x: f.x, y: f.y, r: RT.r * KDV, t: RT.wind } : null));
          }
          push(S, { t: 'tell', uid: f.uid, type: AT === 'shadow' || AT === 'tide' || AT === 'halo' || AT === 'rift' ? 'slam' : AT, x: f.x, y: f.y });
        }
      } else if (f.st === 'wind') {
        S.calmT = Math.min(S.calmT, 0);
        f.stT -= dt;
        if (f.stT <= 0) {
          var WT = f.atkT || F.type, WR = F.rot ? ROT[WT] : F;
          /* ⑲-16 제단을 노린 코앞 한 대는 나를 안 친다(원 예고는 누구든 맞는다) */
          var inHit = f.mark ? markHit(f.mark, px, py, 0) : (!f.atkSiege && d - BODY(f) <= (WR.reach + 0.6) * KDV);
          if (inHit && S.iframe <= 0) { hurt(S, f, WR.mul); }
          else if (inHit) { push(S, { t: 'evade', uid: f.uid }); }
          if (f.atkSiege && f.siege) {
            var sx = f.siege.x, sy = f.siege.y;
            if (f.mark ? markHit(f.mark, sx, sy, SIEGE_BODY * KDV) : Math.hypot(f.x - sx, f.y - sy) <= (WR.reach + 0.6 + SIEGE_BODY) * KDV) {
              push(S, { t: 'siege', uid: f.uid, camp: f.camp, x: sx, y: sy, dmg: Math.max(1, Math.round(f.atk * (WR.mul || 1))) });
            }
          }
          f.atkSiege = false;
          var SL = f.mark && f.mark.list ? f.mark.list : [f.mark || f];
          for (var si = 0; si < SL.length; si++) {
            push(S, { t: 'strike', uid: f.uid, type: WT === 'shadow' || WT === 'tide' || WT === 'halo' || WT === 'rift' ? 'slam' : WT, x: SL[si].x, y: SL[si].y, r: f.mark ? f.mark.r : 0 });
          }
          /* ⑲-30 틈새 질주 — 틈으로 사라져 줄 끝에 나타난다(땅 높이가 크게 다르면 제자리) */
          if (WT === 'rift' && f.mark && f.mark.list) {
            var rEnd = f.mark.list[f.mark.list.length - 1];
            if (riftOk(f.x, f.y, rEnd.x, rEnd.y)) { f.x = rEnd.x; f.y = rEnd.y; push(S, { t: 'blink', uid: f.uid, x: f.x, y: f.y }); }
          }
          if (F.rot) { f.rotI = ((f.rotI || 0) + 1) % F.rot.length; }
          f.mark = null; f.cd = F.cd * (f.cdMul || 1);          // ⑲-9 주간 보스 2단계는 cdMul 로 빨라진다
          /* 이 한 대로 전멸했으면 downMember 가 이미 'return' 으로 돌려놨다 — 덮지 않는다 */
          if (f.st === 'wind') { f.st = 'recover'; f.stT = 0.5; }
        }
      } else if (f.st === 'recover') {
        f.stT -= dt;
        if (f.stT <= 0) { f.st = 'chase'; }
      }
      if (f.moving) { f.phase += dt * 9; }
    }
    if (!inp.blocked) { separate(S, dt); }
    duelCheck(S, dt);
    return S;
  }

  /** 적끼리 밀어내기(2026-09-28 실기 Q6 "난리") — 모두 같은 자리(내 코앞)로 몰려 몸 5~8m 짜리가 한 덩이로 겹쳤다.
      두 몸 반지름 합 × SEP_K 보다 가까우면 반씩 비킨다(한 프레임에 다 안 밀고 dt × 8 만큼 — 튀지 않게) */
  function SEP_K() { return K('sepK', 1.0); }
  function separate(S, dt) {
    var L = living(S), n = L.length, i, j, k = SEP_K();
    if (!k || n < 2) { return; }
    var rate = Math.min(1, dt * 8);
    for (i = 0; i < n; i++) {
      var a = L[i], ba = BODY(a);
      for (j = i + 1; j < n; j++) {
        var b = L[j], want = (ba + BODY(b)) * k, dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) > want || Math.abs(dy) > want) { continue; }
        var d = Math.hypot(dx, dy);
        if (d >= want) { continue; }
        if (d < 1e-3) { dx = (a.uid % 2 ? 1 : -1); dy = 0.3; d = Math.hypot(dx, dy); }   // 한 점이면 번호로 갈라 비킨다
        var push = (want - d) / 2 * rate, ux = dx / d, uy = dy / d;
        var fa = a.frozenT > 0 ? 0 : 1, fb = b.frozenT > 0 ? 0 : 1;                  // 얼어붙은 적은 제자리 — 상대가 다 비킨다
        if (!fa && !fb) { continue; }
        var sa = fa && fb ? 1 : (fa ? 2 : 0), sb = fa && fb ? 1 : (fb ? 2 : 0);
        a.x -= ux * push * sa; a.y -= uy * push * sa;
        b.x += ux * push * sb; b.y += uy * push * sb;
      }
    }
  }

  function moveToward(f, tx, ty, stepM) {
    var dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
    if (d < 1e-3) { return; }
    var s = Math.min(d, stepM);
    f.x += dx / d * s; f.y += dy / d * s;
    f.moving = s > 0.004;
  }

  function drain(S) { var e = S.ev; S.ev = []; return e; }

  /** 지금 싸우는 중인가 — 쫓거나 예고 중인 적이 있거나, 방금 때리고 맞았다 */
  function engaged(S) {
    if (!S) { return false; }
    if (S.calmT < 3) { return true; }
    var L = living(S);
    for (var i = 0; i < L.length; i++) { if (L[i].st === 'chase' || L[i].st === 'wind' || L[i].st === 'recover') { return true; } }
    return false;
  }

  /**
   * ⑲-18 편성을 막는 "싸우는 중" — 방금(COMBAT_CALM 초 안) 때리거나 맞았거나, COMBAT_R m 안에 나를 쫓거나 치는 적.
   * 쉬는 적·제단만 치는 적(siege 로 나를 안 보는 적)은 뺀다. engaged 보다 좁다(멀리서 쫓는 적은 안 친다)
   */
  var COMBAT_R = 30, COMBAT_CALM = 3;
  function inCombat(S, px, py) {
    if (!S) { return false; }
    if (S.calmT < COMBAT_CALM) { return true; }
    var L = living(S);
    for (var i = 0; i < L.length; i++) {
      var f = L[i], d = Math.hypot(f.x - px, f.y - py);
      if (d > COMBAT_R || (f.st !== 'chase' && f.st !== 'wind' && f.st !== 'recover')) { continue; }
      if (f.siege && d > SIEGE_PULL * KDV) { continue; }
      return true;
    }
    return false;
  }

  /* ══ 런타임 — 세이브·화면·입력 ═══════════════════════════ */
  var S = null, partyKey = '', popAcc = 9, refAcc = 0, bound = false, hudEl = null;
  var numLayer = null, fx = { marks: {}, rings: [] };
  function setHudEl(v) { hudEl = v; return v; } function setNumLayer(v) { numLayer = v; return v; }   // R-4 11-17 HUD(field-hud.js)가 만들 때
  var lastAuto = 0;

  function RESPAWN_MS() { return K('respawnMin', 15) * 60000; }
  function fieldSave() {
    var s = core().save;
    if (!s.field || typeof s.field !== 'object') { s.field = { camps: {}, kills: 0, clears: 0 }; }
    if (!s.field.camps) { s.field.camps = {}; }
    if (!s.field.guards || typeof s.field.guards !== 'object') { s.field.guards = {}; }   // ⑪ 지역키 → 마지막 토벌 시각(사명 평정은 있기만 보면 된다)
    if (!s.field.guardPaid || typeof s.field.guardPaid !== 'object') { s.field.guardPaid = {}; }   // ⑲-10 지역키 → 꽃을 받은 시각(150초 뒤 다시 선다)
    return s.field;
  }
  /** ⑲-10 이 수호자가 다시 섰나 — 꽃을 받고 150초가 지났으면. **순수 함수**(fs 를 읽기만) */
  function guardBack(fs, rk, now) {
    var at = fs.guardPaid && fs.guardPaid[rk];
    return !!at && now - at >= K('guardBackSec', 150) * 1000;
  }
  function pkey() { return (core().save.party || []).slice(0, PARTY_MAX()).join(','); }

  function ensureState() {
    var k = pkey();
    if (!S) {
      S = create(core().save.party);
      partyKey = k;
      var fs = fieldSave(), now = Date.now();
      for (var c in fs.camps) {
        if (fs.camps.hasOwnProperty(c) && now - fs.camps[c] < RESPAWN_MS()) { S.cleared[c] = true; }
      }
      for (var g in fs.guards) { if (fs.guards.hasOwnProperty(g) && !guardBack(fs, g, now)) { S.cleared['g:' + g] = true; } }
    } else if (k !== partyKey) {
      reparty(S, core().save.party);
      partyKey = k;
    }
    return S;
  }

  /** 레벨·장비가 바뀌면 공격력·최대 체력을 다시 읽는다(체력 비율은 그대로) */
  function refreshStats() {
    for (var i = 0; i < S.party.length; i++) {
      var m = S.party[i], f = memberOf(m.id);
      var ratio = m.hpMax ? m.hp / m.hpMax : 1;
      m.atk = f.atk; m.em = f.em; m.def = f.def; m.hpMax = f.hpMax;
      m.tm = f.tm; m.con = f.con; m.cdMul = f.cdMul; m.reactMul = f.reactMul; m.c6 = f.c6;
      m.kitS = f.kitS; m.kitB = f.kitB; m.kitL = f.kitL;
      m.wtype = f.wtype; m.kit = f.kit; m.wid = f.wid; m.cr = f.cr; m.cdm = f.cdm; m.er = f.er;
      m.dmgB = f.dmgB; m.elemB = f.elemB; m.rxAll = f.rxAll; m.rx = f.rx;
      m.hp = Math.round(f.hpMax * ratio);
    }
  }

  function blocked() {
    var D = global.DG;
    return !!((D.encounter && D.encounter.active) || (D.rogue && D.rogue.active) ||
      (D.duel && D.duel.active) || (D.rogueAction && D.rogueAction.active) ||
      (D.story && D.story.talking && D.story.talking()) ||                     // ⑲-12 이야기 대화 창
      (D.fishing && D.fishing.active) ||                                       // ⑲-24 낚시 중(F·스페이스는 낚시가 쓴다)
      (document.body && document.body.classList.contains('sheet-open')));
  }

  function terrFn() {
    var W = global.DG.world;
    return W && W.terrainAt ? function (tx, ty) { try { return W.terrainAt(tx, ty); } catch (e) { return null; } } : null;
  }

  /** 자동 전투 — 🤖 자동 전투를 켰거나, 자동 순행 중이면(AI 가 걷는데 싸움만 사람에게 맡길 수는 없다) */
  function autoOn() {
    var sv = core().save, st = sv.settings;
    return !!((st && st.autoBattle) || (sv.auto && sv.auto.on) || (st && st.autoBattle == null && touchDev()));   // W-0236 터치 기기는 정하기 전엔 켜짐
  }
  /* W-0236 🤖 자동 사냥(사용자 10-15 "모바일에서는 자동 사냥이 필요") — 들판 전투 단추로 켜고 끈다(결투 🤖 와 같은 save.settings.autoBattle). 켜면 공격·스킬·폭발·회피에 더해 사거리 밖 적에게 다가간다 */ function touchDev() { return !!(('ontouchstart' in global) || (global.navigator && global.navigator.maxTouchPoints > 0)); } function toggleAuto() { var sv = core().save; if (sv.auto && sv.auto.on) { toast('자동 순행 중에는 늘 자동 전투입니다. 순행을 끄면 고를 수 있습니다'); return null; } sv.settings = sv.settings || {}; sv.settings.autoBattle = !autoOn(); if (!sv.settings.autoBattle) { var Wq = global.DG.world; if (Wq && Wq.walkingTo && Wq.walkingTo() && Wq.walkTo) { Wq.walkTo(sv.player.pos.x, sv.player.pos.y, false); } } core().persist(); paintAuto(); return null; } function paintAuto() { var b = hudEl && (hudEl._autoBtn || (hudEl._autoBtn = hudEl.querySelector('[data-fc="auto"]'))), on2 = autoOn(); if (b && b._on !== on2) { b._on = on2; b.classList.toggle('on', on2); b.querySelector('span').textContent = on2 ? '🤖 켜짐' : '🤖 자동'; } }
  /** 자동 회피(2026-09-28 실기 Q6) — 🤖 는 예고(붉은 원·코앞 휘두름)를 하나도 안 피해 혼자면 보통 무리에도 거의 쓰러졌다.
      나를 칠 공격이 막 떨어지려 할 때(무적 시간 안) 기력이 있으면 그 자리에서 비켜 난다. 매 프레임 본다 */
  function autoThreat(S, px, py) {
    var L = living(S), i;
    for (i = 0; i < L.length; i++) {
      var f = L[i];
      if (f.st !== 'wind' || f.stT > DODGE_IFRAME() * 0.7) { continue; }
      var F = FOES[f.kind], WT = f.atkT || F.type, WR = F.rot ? ROT[WT] : F;
      if (f.mark ? markHit(f.mark, px, py, 0) : (!f.atkSiege && Math.hypot(f.x - px, f.y - py) - BODY(f) <= (WR.reach + 0.6) * KDV)) { return f; }
    }
    return null;
  }
  function autoDodge(pos) {
    if (S.iframe > 0 || S.dash || !K('autoDodge', 1)) { return false; }
    var f = autoThreat(S, pos.x, pos.y);
    if (!f) { return false; }
    var c = f.mark ? (f.mark.list ? f.mark.list[0] : f.mark) : f;
    var dx = pos.x - c.x, dy = pos.y - c.y;
    if (Math.hypot(dx, dy) < 0.3) { dx = pos.x - f.x; dy = pos.y - f.y; }        // 내 발밑에 떨어지는 침 — 쏜 적 반대쪽으로
    /* 곧장 뒤로만 비키면 한 번에 3.6m 씩 밀려나 적의 추격 한계를 벗어나고, 적이 제자리로 돌아가 방패를 다시 채웠다(09-28 수호자 무한 반복).
       옆으로 돌며 비킨다(좌우는 번갈아) — 원 예고도 대시 3.6m 면 벗어난다 */
    var dl0 = Math.hypot(dx, dy) || 1, side = (S.dodgeSide = -(S.dodgeSide || 1));
    dx /= dl0; dy /= dl0;
    var sx = -dy * side, sy = dx * side;
    dx = sx * 0.85 + dx * 0.5; dy = sy * 0.85 + dy * 0.5;
    var r = dodge(S, dx, dy, pos.x, pos.y);
    if (r.ok) { handle(drain(S), pos); }
    return r.ok;
  }

  function autoFight(pos) {
    var m = active(S);
    if (!m || m.down) { return; }
    var n = nearestFoe(S, pos.x, pos.y, SKILL_AIM());
    var kit = m.kit || SWORD_KIT, rr = kit.range || (kit === SWORD_KIT || m.wtype === 'sword' ? REACH() : kit.reach); if (!n) { var far = nearestAwake(pos.x, pos.y, LEASH_R()); if (far) { autoApproach(pos, far, rr); } return; }   // W-0236 조준 밖이면 쫓는 거리 안 적에게 다가간다 · R-5 잠든·돌아가는 무리는 안 깨운다
    if (m.energy >= ENERGY_MAX() && foesWithin(S, pos.x, pos.y, BURST_R()).length >= 2) { act('burst'); return; }
    if (m.skillCd <= 0) { act('skill'); return; }
    /* ⑲-2 얼어 있는 적이 곁에 있으면 강공격으로 깬다 */
    if (n.frozenT > 0 && S.stamina >= CHARGE_COST() && Math.hypot(n.x - pos.x, n.y - pos.y) <= CHARGE_REACH()) { act('heavy'); return; }
    var cd0 = Math.hypot(n.x - pos.x, n.y - pos.y); if (kit.range ? cd0 - BODY(n) <= kit.range : (cd0 <= LUNGE_R() || cd0 - BODY(n) <= rr)) { S.autoAct = true; act('attack'); S.autoAct = false; } else { autoApproach(pos, n, rr); }   // R-5 — 큰 적(키 2.4↑)은 다가선 자리(몸 가장자리+사거리 7할)가 LUNGE_R 밖이라 영영 안 쳤다: 가장자리 거리로
  }
  /** W-0236 자동 사냥 — 사거리 밖 적이면 그 적의 몸 가장자리 + 사거리 7할 자리로 걸어간다(탭 이동과 같은 길 world.walkTo — 손으로 움직이면 그쪽이 먼저). GPS 는 몸을 못 움직여 안 함 */ function autoApproach(pos, n, rr) { var W = global.DG.world; if (!W || !W.walkTo || W.mode !== 'keyboard' || S.dash) { return false; } var dx = pos.x - n.x, dy = pos.y - n.y, d = Math.hypot(dx, dy) || 1, keep = BODY(n) + (rr || REACH()) * 0.7; W.walkTo(n.x + dx / d * keep, n.y + dy / d * keep, false); S.autoWalk = true; return true; } function nearestAwake(px, py, r) { var best = null, bd = r, L = living(S), i, d; for (i = 0; i < L.length; i++) { if (L[i].st === 'idle' || L[i].st === 'return') { continue; } d = Math.max(0, Math.hypot(L[i].x - px, L[i].y - py) - BODY(L[i])); if (d <= bd) { bd = d; best = L[i]; } } return best; } /** R-5 — 깨어 싸우는 적(쫓기·휘두르기 등)만. 잠든(idle)·제자리로 돌아가는(return) 무리는 자동 사냥이 깨우러 가지 않는다 */
  function tick(dt) {
    if (!on() || !core() || !core().save) { hide(); return; } var kd1 = KD0(); if (kd1 !== KDV) { KDV = kd1; refAcc = 9; } paintAuto();   // W-0236 단추 켜짐 표시(결투 🤖·자동 순행에서 바뀌어도) · W-0233 2D/3D·확대가 바뀌면 키트 사본을 바로 다시
    ensureState();
    var pos = core().save.player.pos;
    popAcc += dt; refAcc += dt;
    if (popAcc > 0.5 && !(S.talkCalm > 0)) {
      popAcc = 0;
      respawnSweep(); if (global.DG.bloodMoon) { global.DG.bloodMoon.tick(S, fieldSave(), 0.5); }   // W-0420 ③ 핏빛 달(되살림) · 다시 설 무리를 먼저 풀고 세운다(⑲-10 수호자가 한 박자 늦던 것)
      var BM = global.DG.biome;
      populate(S, pos.x, pos.y, terrFn(), K('activeR', 200), BM && BM.on() ? BM.biomeAt : null,
        BM && BM.on() && BM.landmarks && K('guards', 1) ? BM.landmarks : null,
        BM && BM.on() && BM.zoneAt && K('eras', 1) ? BM.zoneAt : null,
        global.DG.treasure && global.DG.treasure.on() ? global.DG.treasure.campsNear : null);
    }
    if (refAcc > 2) { refAcc = 0; refreshStats(); }
    var bl = blocked(), SD = global.DG.story; /* 사용자 11-12 「이야기하는데서 몬이 나타나면 안되는거 아님?」 — 대화 중·끝난 뒤 go.talkCalm 초(4)는 새 무리를 안 세우고, 곁(60m)에서 쫓던 적은 집으로 · 그동안 안 달려든다 */ if (SD && SD.talking && SD.talking() && +core().tuned('go.talkCalm', 4) > 0) { S.talkCalm = +core().tuned('go.talkCalm', 4); living(S).forEach(function (f) { if ((f.st === 'chase' || f.st === 'wind' || f.st === 'recover') && Math.hypot(f.x - pos.x, f.y - pos.y) < 60) { f.st = 'return'; f.mark = null; } }); } else if (S.talkCalm > 0) { S.talkCalm = Math.max(0, S.talkCalm - dt); } if (S.travelCalm > 0) { S.travelCalm = Math.max(0, S.travelCalm - dt); }
    /* 걷는 쪽을 바라본다 — 적이 없을 때 스킬·돌진이 나가는 쪽. 전엔 마지막으로 회피한 쪽(없으면 남쪽)으로만 나갔다(2026-09-28) */
    var Wm = global.DG.world, mv = Wm && Wm.motion;
    if (mv && mv.speed > 1.5 && (mv.vx || mv.vy)) { S.lastDx = mv.vx; S.lastDy = mv.vy; }
    step(S, dt, { px: pos.x, py: pos.y, blocked: bl }); if (global.DG.artifactSkill) { global.DG.artifactSkill.tick(S, dt, pos.x, pos.y); } if (global.DG.fieldRaid) { global.DG.fieldRaid.tick(S, dt, pos.x, pos.y); }   /* W-0438 보패 4 세트 기술 · 무리 습격 */
    if (S.autoWalk && !(autoOn() && engaged(S))) { S.autoWalk = false; var Ww = global.DG.world; if (Ww && Ww.walkingTo && Ww.walkingTo() && Ww.walkTo && !(core().save.auto && core().save.auto.on)) { Ww.walkTo(pos.x, pos.y, false); } } if (!bl && autoOn() && engaged(S)) {   // R-5 — 싸움이 끝나거나 자동을 끄면 자동 사냥이 건 걸음을 거둔다(자동 순행 걸음은 그대로)
      lastAuto += dt;
      /* 2026-09-28 실기 Q6 "너무 오래 걸림" — 0.3초마다만 눌러 칼 3타(0.34초 박자)의 절반을 놓쳤다(초당 46 피해,
         손으로 연타하면 159). 공격 쿨이 풀리는 그 프레임에도 누른다 */
      if (!autoDodge(pos) && (lastAuto > 0.3 || S.atkCd <= 0)) { lastAuto = 0; autoFight(pos); }
    }
    handle(drain(S), pos);
    if (!global.DG_NO_DRAW) { paint(dt); }
  }

  function respawnSweep() {
    var fs = fieldSave(), now = Date.now();
    for (var c in S.cleared) {
      if (!S.cleared.hasOwnProperty(c)) { continue; }
      if (c.indexOf('g:') === 0) { if (guardBack(fs, c.slice(2), now)) { delete S.cleared[c]; } continue; }   // ⑲-10 꽃을 받고 150초면 다시 선다
      var at = fs.camps[c];
      if (!at || now - at >= RESPAWN_MS()) { delete S.cleared[c]; delete fs.camps[c]; }
    }
  }

  function toast(msg) { if (global.DG.ui && global.DG.ui.toast) { global.DG.ui.toast(msg); } }
  function sfx(name) { if (global.DG.audio) { try { global.DG.audio.play(name); } catch (e) { /* 소리는 없어도 된다 */ } } }
  function W3() { var w = global.DG.world3d; return w && w.active && w.active() ? w : null; }

  /* R-4 11-17 — 1만리 들판 전투 사건 처리(handle) 은 js/field-events.js(make(U), 몸통 글자 그대로) */ var evObj = null; function EV() { return evObj || (evObj = global.DG.fieldEvents.make({ S: function () { return S; }, KDV: function () { return KDV; }, A2: A2, COUNTER: COUNTER, EL: EL, FOES: FOES, REACT: REACT, SHAPES: SHAPES, W3: W3, clearLoot: clearLoot, fieldSave: fieldSave, floatNum: floatNum, killGold: killGold, ring: ring, sfx: sfx, toast: toast, wpnSlot: wpnSlot, WPN_HOLD: WPN_HOLD, wpnMs: wpnMs })); }
  function handle(ev, pos) { return EV().handle(ev, pos); }

  function act(kind, arg) {
    if (!S || blocked()) { return { ok: false }; }
    var pos = core().save.player.pos, r;
    if (kind === 'attack') {
      /* ⑲-2 활공 중(발밑 2.5m 넘게)이면 기본 공격 대신 내리꽂는다 — 착지는 landform 이 plungeLand 로 알린다 */
      var LF = global.DG.landform;
      if (LF && LF.startPlunge && LF.startPlunge()) { return { ok: true, plunge: true }; }
      if (S.aim) { aimHold(S); handle(drain(S), pos); return { ok: true, aim: true }; }   // ⑲-22 조준 중엔 누르는 동안 충전
      r = attack(S, pos.x, pos.y);
    } else if (kind === 'heavy') {
      /* ⑲-22 활 인물은 강공격 대신 조준·충전(떼면 쏘고 나온다) */
      if (S.aim) { r = { ok: true, aim: true }; }                     // 조준 중 길게 누름 = 충전(강공격 아님)
      else if (aimOk() && aimStart(S, pos.x, pos.y).ok) { S.aim.auto = true; aimHold(S); r = { ok: true, aim: true }; }
      else { r = heavy(S, pos.x, pos.y); }
    } else if (kind === 'aim') {
      r = S.aim ? { ok: aimEnd(S), off: true } : (aimOk() ? aimStart(S, pos.x, pos.y) : { ok: false });
    }
    else if (kind === 'skill') { r = skill(S, pos.x, pos.y); }
    else if (kind === 'burst') { r = burst(S, pos.x, pos.y); }
    else if (kind === 'dodge') {
      aimEnd(S);                                                    // ⑲-22 대시하면 조준이 풀린다
      var W = global.DG.world, mv = W && W.motion ? W.motion : null;
      var moving = mv && mv.speed > 1.5;
      r = dodge(S, moving ? mv.vx : 0, moving ? mv.vy : 0, pos.x, pos.y);
    } else if (kind === 'swap') { r = swap(S, arg); } else if (kind === 'grab') { r = global.DG.fieldGrab ? global.DG.fieldGrab.grab(S, pos.x, pos.y) : { ok: false }; }   // W-0277
    handle(drain(S), pos);
    return r || { ok: false };
  }

  /* R-4 11-17 — 1만리 들판 전투 화면 은 js/field-hud.js(make(U), 몸통 글자 그대로) */ var hdObj = null; function HD() { return hdObj || (hdObj = global.DG.fieldHud.make({ S: function () { return S; }, hudEl: function () { return hudEl; }, numLayer: function () { return numLayer; }, AIM_FULL: AIM_FULL, CHARGE_HOLD: CHARGE_HOLD, EL: EL, ENERGY_MAX: ENERGY_MAX, FOES: FOES, SHAPES: SHAPES, SKILL_CD: SKILL_CD, W3: W3, act: act, active: active, aimEnd: aimEnd, aimShoot: aimShoot, aimSteer: aimSteer, canAim: canAim, data: data, drain: drain, engaged: engaged, ensureState: ensureState, fieldSave: fieldSave, fx: fx, handle: handle, living: living, lvAddOf: lvAddOf, nearestFoe: nearestFoe, on: on, paintAuto: paintAuto, plunge: plunge, setHudEl: setHudEl, setNumLayer: setNumLayer, toast: toast, toggleAuto: toggleAuto, KDV: function () { return KDV; } })); }
  function numPlace(list, x, y, w, h, now) { return HD().numPlace(list, x, y, w, h, now); } function floatNum(x, y, text, el, scale, bold, mine) { return HD().floatNum(x, y, text, el, scale, bold, mine); } function hide() { return HD().hide(); } function buildHud() { return HD().buildHud(); } function paintParty() { return HD().paintParty(); } function paint(dt) { return HD().paint(dt); } function paintAim() { return HD().paintAim(); } function toScreen(x, y, up) { return HD().toScreen(x, y, up); } function paintBars() { return HD().paintBars(); } function ringMesh(r, color, opacity) { return HD().ringMesh(r, color, opacity); } function ring(x, y, r, color, life) { return HD().ring(x, y, r, color, life); } function tickRings(dt) { return HD().tickRings(dt); } function paintMarks() { return HD().paintMarks(); } function paintMark(w, f, q, key, seen) { return HD().paintMark(w, f, q, key, seen); } function holdStart() { return HD().holdStart(); } function holdEnd() { return HD().holdEnd(); } function aimOk() { return HD().aimOk(); } function aimSteerRt(ux, uy, dt) { return HD().aimSteerRt(ux, uy, dt); } function aimView() { return HD().aimView(); } function plungeLand(fell) { return HD().plungeLand(fell); }

  /* ── 입력: 키 ─────────────────────────────────────────── */
  function bindKeys() {
    if (bound) { return; }
    bound = true;
    global.addEventListener('keyup', function (e) { if (e.key && e.key.toLowerCase() === 'j') { holdEnd(); } });
    global.addEventListener('keydown', function (e) {
      if (!S || !on() || e.repeat) { return; }
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { return; }
      if (blocked()) { return; }
      var k = e.key.toLowerCase();
      var nearby = engaged(S) || !!nearestFoe(S, core().save.player.pos.x, core().save.player.pos.y, 22);
      if (k === 'j') { var ra = act('attack'); if (!(ra && ra.plunge)) { holdStart(); } }
      else if (k === 'e') { act('skill'); }
      else if (k === 'r') { act('aim'); }                             // ⑲-22 활 조준
      else if (k === 'q') { act('burst'); } else if (k === 'c') { act('grab'); }   // W-0277 잡기(G 는 요리 창)
      else if (k === ' ' && nearby) { e.preventDefault(); act('dodge'); }
      else if (k >= '1' && k <= '4' && nearby) { act('swap', +k - 1); }
    });
  }

  /** 3D 배우 목록 — `world3d.js` 가 매 프레임 읽는다 */
  function live() {
    if (!S || !on()) { return []; }
    var out = [], D = data();
    for (var k in S.foes) {
      if (!S.foes.hasOwnProperty(k)) { continue; }
      var f = S.foes[k], F = FOES[f.kind];
      var ref = F.body ? { id: F.body, name: F.name, rarity: 5, trait: 'might', color: '#26222e' }     // ⑲-14 이야기 보스 — 고정 사람 몸
        : ((D && D.find && D.find(f.heroId || F.ref)) || { id: 'fc_' + f.kind, name: F.name, kind: 'beast', rarity: 2, form: 'boar' }); if (F.crea && !F.body) { ref = Object.assign({}, ref, { crea: F.crea }); }   // W-0702 적 전용 자체 몸(creatures3d·creatures2d <crea>) — 도감 펫 기록은 그대로
      out.push({ uid: f.uid, x: f.x, y: f.y, h: F.h, ref: ref, moving: f.moving, phase: f.phase,
        dead: f.dead, deadT: f.deadT, stun: f.stun > 0 && f.st !== 'yield', el: f.el, aura: f.aura, boss: !!F.boss,
        hero: !!(F.hero || F.body), mask: F.mask || null, pale: !!F.pale, yielded: f.st === 'yield', sky: !!f.sky });
    }
    return out;
  }

  /**
   * ⑯ 싸워서 등용 — 들판 인물을 눌렀을 때(encounter.js startHero). 3D 들판 전투가 도는 자리에서만 true
   * (2D·진단(DG_NO_DRAW)은 옛 설득 카드). 판은 인물이 서 있던 자리에 선다 — 끝나면 'duelEnd'(win·lose·flee)
   */
  function canChallenge(any) { return !!(on() && core() && core().save && (W3() || any) && !(S && S.duel)); }   // any — W-0430 등용 카드 「무로 겨루자」는 2D 에서도
  function challenge(spawn, any) {
    if (!canChallenge(any) || !spawn || !spawn.ref) { return false; }
    ensureState();
    var c = duelCamp(spawn.ref, spawn.x, spawn.y, spawn.uid);
    if (S.camps[c.key]) { return false; }
    spawnCamp(S, c);
    var cp = S.camps[c.key];
    S.duel = { uid: cp.uids[0], camp: c.key, spawnUid: spawn.uid, heroId: spawn.ref.id, wiped: false };
    for (var i = 0; i < cp.uids.length; i++) { wake(S.foes[cp.uids[i]]); }
    return true;
  }
  function duelSpawn() { return S && S.duel ? S.duel.spawnUid : null; }

  /** 지도 위 아바타로 설 사람 — 교체하면 바뀐다(없으면 null → 동행 선두) */
  function leadId() {
    if (!S || !on()) { return null; }
    var m = active(S);
    return m && m.id !== '_me' ? m.id : null;
  }

  function init() { bindKeys(); }

  global.DG = global.DG || {};
  if (global.DG.fieldGrab) { global.DG.fieldGrab.bind({ K: K, KDV: function () { return KDV; }, FOES: FOES, KB_T: KB_T, active: active, nearestFoe: nearestFoe, foesWithin: foesWithin, hitFoe: hitFoe, push: push }); } if (global.DG.fieldStandoff) { global.DG.fieldStandoff.bind({ KDV: function () { return KDV; }, FOES: FOES, active: active, hitFoe: hitFoe, push: push, hurt: hurt, wake: wake }); } global.DG.fieldCombat = { floatNum: floatNum,   // W-0277 잡기(field-grab.js)에 속 함수를 넘긴다
    EL: EL, anim2d: anim2d, _handle: handle, FOES: FOES, ROT: ROT, SHADOW_BACK: SHADOW_BACK, RIFT_STEP: RIFT_STEP, RIFT_SLOPE: RIFT_SLOPE, riftOk: riftOk, SIEGE_PULL: SIEGE_PULL, tideMarks: tideMarks, markHit: markHit, foeAtk: foeAtk, KB_T: KB_T, knock: knock, rainFollow: rainFollow, THEMES: THEMES, ELITES: ELITES, ERA_THEMES: ERA_THEMES, ERA_ELITES: ERA_ELITES, eraOfCamp: eraOfCamp, CELL: CELL, ENERGY_MAX: ENERGY_MAX,
    SKILL_CD: SKILL_CD, numPlace: numPlace, foesWithin: foesWithin, push: push, KDVf: function () { return KDV; }, wpnSlot: wpnSlot, wpnMs: wpnMs, SWAP_CD: SWAP_CD, BODY: BODY, separate: separate, DODGE_COST: DODGE_COST, VAPOR_MUL: VAPOR_MUL,
    /* 판정 층 — 화면 없이 굴린다(자가진단이 쓰는 문) */
    elementOf: elementOf, EL_KEYS: EL_KEYS, heavy: heavy, plunge: plunge, plungeMul: plungeMul, plungeLand: plungeLand, PLUNGE_R: PLUNGE_R(), CHARGE_COST: CHARGE_COST(), REACT: REACT, attaches: attaches, shapeOf: shapeOf, SHAPES: SHAPES, kitFor: kitFor, segDist: segDist, react: react, shieldMul: shieldMul, campAt: campAt, tierAt: tierAt, guardianAt: guardianAt, COUNTER: COUNTER,
    autoThreat: autoThreat, create: create, reparty: reparty, populate: populate, spawnCamp: spawnCamp, step: step, drain: drain,
    attack: attack, skill: skill, burst: burst, dodge: dodge, swap: swap, hitFoe: hitFoe,
    canAim: canAim, aimStart: aimStart, aimEnd: aimEnd, aimSteer: aimSteer, aimHold: aimHold, aimShoot: aimShoot, aimLock: aimLock, stepArrows: stepArrows,
    AIM_R: AIM_R(), AIM_FULL: AIM_FULL(), AIM_PART: AIM_PART(), AIM_FULLMUL: AIM_FULLMUL(), ARROW_V: ARROW_V(), ARROW_RANGE: ARROW_RANGE(),
    aiming: function () { return !!(S && S.aim); }, aimSteerRt: aimSteerRt, aimView: aimView, aimCancel: function () { return !!(S && aimEnd(S)); },
    engaged: engaged, inCombat: inCombat, /* W-0655 자동 퀘스트 가는 길 — sec 초 동안 새로 안 쫓고(대치도 쉼), 쫓던 적은 거리 없이 매번 집으로(W-0658 2D — 먼 추격자가 calmT 를 0 으로 붙들어 제자리 「싸우는 중」) · 새 무리는 그대로 */ calmTravel: function (S, sec, px, py) { if (!S) { return; } living(S).forEach(function (f) { if ((f.st === 'chase' || f.st === 'wind' || f.st === 'recover') && !f.siege) { f.st = 'return'; f.mark = null; } }); S.travelCalm = Math.max(S.travelCalm || 0, sec); }, COMBAT_R: COMBAT_R, KDV: function () { return KDV; }, living: living, memberOf: memberOf, applyWorld: applyWorld, rescaleWorld: rescaleWorld, killGold: killGold, clearLoot: clearLoot,
    guardBack: guardBack, duelCamp: duelCamp, canChallenge: canChallenge, challenge: challenge, duelSpawn: duelSpawn,
    /* 런타임 */
    _hushAt: hushAt, init: init, tick: tick, act: act, live: live, leadId: leadId,
    state: function () { return S; }, autoOn: autoOn, toggleAuto: toggleAuto, _autoFight: function (pos) { return autoFight(pos); }, _kdForTest: function (v) { KDT = v || null; KDV = KD0(); if (S) { refreshStats(); } return KDV; }, kd: function () { return KDV; },   // W-0233   // W-0236 자동 사냥 · W-0233 배율
    _setStateForTest: function (st) { S = st; },
    _resetForTest: function () { S = null; partyKey = ''; popAcc = 9; }
  };
})(window);
