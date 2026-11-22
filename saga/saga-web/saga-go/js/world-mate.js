/**
 * W-0756 세계 편 짝(world-balance §6 설화 괴물 칸 「그 괴물을 짝으로 데리고 다니기(꾸미기 — 힘 없음)」) — 1만리 문 모드에서만.
 * ---------------------------------------------------------------
 * 세계 껍데기가 도감 짐승 칸이 다 차면 `player.mate = <b_ id>` 를 적고, 문 overlay 가 세계 player 를 이 판 세이브에 덮는다.
 * 여기는 그 id 를 이 판에 **이미 있는 펫 몸**으로 바꿔 줄 뿐이다(그림만 — 장착·전투 수치·포획·도감 셈 0).
 *   MATE      세계 짐승 id → [이 판 펫 id, 세계 이름(dex.json name — 표시 글자)]. 맞는 몸이 없는 다섯(잡상·장승·밀수꾼·신지께·바다 안개)은 뺐다 — 껍데기 MATE_IDS 와 같은 목록(진단이 맞춰 봄)
 *   ref(save) 문 모드 · dexFull 에 beast · 선두 장착 펫 없음(장착이 먼저) · 표에 있는 id 일 때만 펫 ref(이름만 세계 이름) — 아니면 null
 * 3D 는 world3d syncBuddies 의 petbuddy 자리, 2D 는 world-actors2d drawPlayer 곁에서 부른다.
 */
(function (global) {
  'use strict';
  var MATE = {
    b_whitetiger: ['pt_baekho', '흰 범'], b_fog_tiger: ['pt_tiger', '안개 범'], b_mountain_tiger: ['pt_tiger', '산의 범'], b_magpie_tiger: ['pt_tiger', '까치 호랑이'],
    b_dokkaebi1: ['pt_dokkaebi', '씨름 도깨비'], b_dokkaebi2: ['pt_dokkaebi', '수수께끼 도깨비'], b_dokkaebi3: ['pt_dokkaebi', '방망이 도깨비'], b_dokkaebi4: ['pt_dokkaebi', '뱃노래 도깨비'],
    b_dokkaebi5: ['pt_dokkaebi', '바둑 도깨비'], b_dokkaebi6: ['pt_dokkaebi', '숨바꼭질 도깨비'], b_dokkaebi7: ['pt_dokkaebi', '밤 씨름 도깨비'], b_dokkaebi8: ['pt_dokkaebi', '물가 내기 도깨비'],
    b_dokkaebi9: ['pt_dokkaebi', '전등 겁내는 도깨비'], b_dokkaebi10: ['pt_dokkaebi', '막내 도깨비'], b_night_dokkaebi: ['pt_dokkaebi', '한양 밤 도깨비 떼'],
    b_inmyeonjo: ['pt_jujak', '인면조'], b_stone_turtle: ['pt_hyeonmu', '돌 거북'], b_imugi: ['pt_cheongryong', '이무기'], b_haetae: ['pt_haetae', '해태'], b_gate_beast: ['pt_haetae', '궁궐 문 돌짐승'],
    b_gangcheori: ['pt_jeoktoma', '강철이'], b_wolfking: ['pt_jindo', '늑대 왕'], b_mogeo: ['pt_carp', '목어']
  };
  function arr(x) { return Array.isArray(x) ? x : []; }
  /** 따라올 짝 ref(펫 몸 + 세계 이름) 또는 null — 순수(세이브·문 상태만 읽음) */
  function ref(save) {
    var D = global.DG.door, data = global.DG.data;
    if (!D || !D.on || !D.on() || !save || !data || !data.find) { return null; }
    var p = save.player, m = p && MATE[p.mate];
    if (!m || arr(p.dexFull).indexOf('beast') < 0) { return null; }
    var lead = arr(save.party)[0];
    if (lead && save.petEquip && save.petEquip[lead]) { return null; }   // 장착 펫이 먼저 — 둘을 같이 그리지 않는다
    var base = data.find(m[0]);
    if (!base) { return null; }
    var r = Object.create(base); r.name = m[1]; r.mate = p.mate;
    return r;
  }
  global.DG = global.DG || {};
  global.DG.worldMate = { MATE: MATE, ref: ref };
})(typeof window !== 'undefined' ? window : this);
