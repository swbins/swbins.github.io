/**
 * 1만리 세계 편 · 한국 1장 무대 소품(W-0704, K-0268) + 2·3장(W-0738, K-0273 — 장마다 따라가는 사슬의 장만) — 고인돌 들의 고인돌 둘·선돌·곰 굴 어귀·돌무지를 2D 들판에 세운다.
 * ---------------------------------------------------------------
 * 그림은 자체툴 world2d(`shared/assets/world2d/<id>.webp`) · 자리는 1장 사슬(`saga-world/world/kr/chains/kr_dawn.json`)·인물(people.json)의
 * ⑮ 땅 탑(home) + off 와 같은 좌표 — 사슬이 사람을 보내는 곳에 그 무대가 서 있다:
 *   (사람이 서는 자리 바로 위는 피해 몇 m 비켜 세운다 — 2D 에선 1장 자리가 한 화면이라 겹치면 이름표를 덮는다)
 *   dolmen_01  돌메 뒤(고인돌 들 [34,-28])   dolmen_02  `.wake` 가는 곳 [78,-18]   standing_stone_01  `.stone` 지키는 돌 [56,30]
 *   cave_mouth_01  실이의 곰 굴 [-70,-55]     stone_cairn_01  `.tiger` 고개 [86,70]·`.altar` 제단 [90,80] 사이
 * 묶음(DG.storyKr)이 없으면 아무것도 안 세운다. 3D 는 그림이 없어(2D 만 산출) 그리지 않는다. 손잡이 `story.stage2d` 0 = 끔.
 *   near(x, y, R) → [{ id, x, y, h, name }]  · draw2d(ctx, x, y, z, it) → 그렸으면 참(그림을 아직 못 받았으면 거짓 — 그 프레임은 비움)
 */
(function (global) {
  'use strict';
  /* h = 화면 키(px, 확대 1 기준) — 2D 에선 1장 자리들이 한 화면에 몰려 있어(땅 탑 둘레 ±150m) 마을 건물을 안 덮게 작게: 고인돌 무릎~허리·선돌 사람 키 남짓·굴 어귀 사람보다 조금 크게(11-17 첫 사진에서 줄임) */
  /* ch = 그 무대가 서는 장 — 따라가는 세계 편 사슬의 장만 선다(W-0738: 2·3장을 따라가면 home 이 그 장 field 로 옮겨 가 1장 고인돌이 따라 서던 것) */
  var STAGE = [
    { ch: 'kr_dawn', id: 'dolmen_01', off: [14, -46], h: 50, name: '고인돌' },
    { ch: 'kr_dawn', id: 'dolmen_02', off: [78, -26], h: 46, name: '고인돌' },
    { ch: 'kr_dawn', id: 'standing_stone_01', off: [76, 36], h: 76, name: '선돌' },
    { ch: 'kr_dawn', id: 'cave_mouth_01', off: [-74, -68], h: 88, name: '곰 굴' },
    { ch: 'kr_dawn', id: 'stone_cairn_01', off: [104, 90], h: 40, name: '돌무지' },
    /* W-0738 K-0273 2장 가마골 — 세 장터([150,-70]·[-150,-60]·[60,150])·가람의 쇠터([118,-18])·옛 쇳굴(delve 는 자리가 없어 가람 곁) */
    { ch: 'kr_three', id: 'market_stall_kr_01', off: [166, -84], h: 60, name: '북쪽 장' },
    { ch: 'kr_three', id: 'sack_pile_01', off: [138, -86], h: 34, name: '소금 섬' },
    { ch: 'kr_three', id: 'market_stall_kr_01', off: [-166, -74], h: 60, name: '서쪽 장' },
    { ch: 'kr_three', id: 'market_stall_kr_01', off: [76, 164], h: 60, name: '동쪽 장' },
    { ch: 'kr_three', id: 'smelting_furnace_01', off: [140, -46], h: 70, name: '쇠 가마' },
    { ch: 'kr_three', id: 'iron_ore_pile_01', off: [102, -36], h: 36, name: '쇳돌' },
    { ch: 'kr_three', id: 'mine_entrance_01', off: [150, 4], h: 88, name: '옛 쇳굴' },
    { ch: 'kr_three', id: 'mine_cart_01', off: [134, 12], h: 34, name: '광차' },
    /* 3장 고정 — 불타는 서고([-120,-90]·설기 [-96,-34])·뒷문 수레([40,-130])·나무다리([-60,120])·강가 나루([110,40])·북쪽 성([90,-150]) */
    { ch: 'kr_unify', id: 'burnt_pillar_01', off: [-134, -104], h: 80, name: '불탄 기둥' },
    { ch: 'kr_unify', id: 'lotus_tile_pile_01', off: [-108, -104], h: 34, name: '기와 더미' },
    { ch: 'kr_unify', id: 'burnt_pillar_01', off: [-112, -48], h: 80, name: '불탄 기둥' },
    { ch: 'kr_unify', id: 'book_cart_01', off: [28, -122], h: 48, name: '책 수레' },
    { ch: 'kr_unify', id: 'ferry_stakes_01', off: [-76, 132], h: 44, name: '나루 목책' },
    { ch: 'kr_unify', id: 'torch_stand_01', off: [-44, 132], h: 56, name: '횃대' },
    { ch: 'kr_unify', id: 'ferry_stakes_01', off: [126, 52], h: 44, name: '나루 목책' },
    { ch: 'kr_unify', id: 'city_wall_segment_01', off: [122, -180], h: 90, name: '성벽' },
    { ch: 'kr_unify', id: 'banner_pole_01', off: [92, -184], h: 96, name: '깃대' }
  ];
  function on() { var C = global.DG.core; return !!global.DG.storyKr && !(C && C.tuned && !+C.tuned('story.stage2d', 1)); }
  /** 지금 무대 장 — 따라가는 세계 편 사슬 id 의 장(「kr_three.salt」→ kr_three) · 따라가는 사슬이 없으면 1장(home 이 고향 그대로) */
  function chNow(s) {
    var SC = global.DG.storySc, C = global.DG.core, id = SC && SC.tracking ? SC.tracking(s || (C && C.save)) : null;
    return chOf(id);
  }
  function chOf(id) { return id ? String(id).split('.')[0] : 'kr_dawn'; }
  function near(x, y, R) {
    var S = global.DG.story, out = [], i, p, ch;
    if (!on() || !S || !S.at) { return out; }
    ch = chNow();
    for (i = 0; i < STAGE.length; i++) {
      if (STAGE[i].ch !== ch) { continue; }
      p = S.at('home', STAGE[i].off);
      if (p && Math.abs(p.x - x) <= R && Math.abs(p.y - y) <= R) { out.push({ id: STAGE[i].id, x: p.x, y: p.y, h: STAGE[i].h, name: STAGE[i].name }); }
    }
    return out;
  }
  function draw2d(ctx, x, y, z, it) {
    var M = global.DG.mode2d;
    return !!(M && M.drawSprite && M.drawSprite(ctx, { id: it.id, x: x, y: y, h: it.h * z }));
  }
  global.DG = global.DG || {};
  global.DG.storyStage = { STAGE: STAGE, on: on, near: near, draw2d: draw2d, chNow: chNow, chOf: chOf };
})(window);
