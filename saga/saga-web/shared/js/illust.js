/**
 * 인물 일러스트(W-0371, K-0163) — 전신 스탠딩 `assets/illust/<id>/stand.webp`(세로 1024 투명)·표정 반신 `neutral|happy|angry|sad.webp`(512 투명).
 * 어느 인물에 있나는 판 `assets/illust/manifest.js`(K 가 씀 — `SAGA.illust = { base, files, ids }`)만 본다(파일을 두드리지 않아 404 없음).
 * 없는 인물·매니페스트 없는 판은 has() 가 거짓 → 부른 쪽은 지금 초상 그대로. 손잡이 `illust.on`(1 기본 = 켬 — K-0178 같은 사람 다시 그림 뒤 W-0371, 0 = 끔).
 * 10-22 기본 끔: K-0163 첫 묶음 30명이 그 인물과 다른 사람(성별·시대·옷 — 장군이 하녀 옷 소녀 등, 초상과 나란히 대 봄) → 다시 그린 묶음이 오면 1 로.
 * W-0652(11-12) 사람 19 모드(illust.people 1 기본)가 위 옛 길을 덮는다 — url·stand 는 어느 인물이든 사람 19 몸(FACE 짝 표 → 역할 글자 → 성별 해시),
 *   has 는 19 몸 id 만 참(도감 카드는 2D 초상), peopleOn() 이 켬 여부. 옛 manifest·주역 35 sprite 일러스트는 안 씀(topbtn 반신은 DG.illust 를 안 거침).
 * 정본 saga-web/shared/js/illust.js — 판별 사본은 tools/sync-shared.mjs.
 */
(function (global) {
  'use strict';

  /* 대사 감정·말 → 표정 파일. 놀람(shock)은 표정 그림이 없어 평온 */
  var MOOD = { calm: 'neutral', neutral: 'neutral', joy: 'happy', happy: 'happy', anger: 'angry', fire: 'angry', angry: 'angry', worry: 'sad', sorrow: 'sad', sad: 'sad', shock: 'neutral', surprise: 'neutral' };
  var set = null, from = null;

  function man() { var S = global.SAGA; return S && S.illust && S.illust.ids ? S.illust : null; }
  function on() { var C = global.DG && global.DG.core; return !!(C && C.tuned && +C.tuned('illust.on', 1)); }
  /* K-0221/W-0524 — 주역 35명은 스프라이트 화풍 새 그림(shared/assets/illust_sprite/<id>/{stand,bust}.webp)이 우선, 표정은 기존 illust/ 그대로. 목록은 여기 고정(파일을 두드리지 않아 404 없음) */
  var SPRITE = {};
  ['jp_hideyoshi','jp_himiko','jp_ieyasu','jp_kenshin','jp_murasaki','jp_nobunaga','jp_seishonagon','jp_shingen','jp_taira','jp_tomoegozen','kr_euljimundeok','kr_gwanggaeto','kr_gyebaek','kr_heojun','kr_kimyusin','kr_sejong','kr_wanggeon','kr_wonhyo','kr_yeongaesomun','kr_yihwang','kr_yii','kr_yisunsin','sg_caocao','sg_diaochan','sg_ganning','sg_guanyu','sg_huangzhong','sg_huatuo','sg_liubei','sg_lubu','sg_luxun','sg_machao','sg_menghuo','sg_pangtong','sg_zhaoyun'].forEach(function (k) { SPRITE[k] = 1; });
  /* W-0652 사람 19 일러스트(K-0235 saga-assets/illust/shared/people/<몸>/{stand,neutral,happy,angry,sad}.webp) — 사용자 11-12 「기존 일러스트 안 쓸 거라서」·「모든 대화 인물에」.
     대화 표정(url)·전신(stand)은 어느 인물이든 성별(assets3dIds.heroSex) 맞는 19 중 하나로 고정 짝(id 해시 — 같은 인물 늘 같은 얼굴). 옛 K-0163·주역 35 그림은 안 씀.
     도감 카드처럼 사람마다 달라야 하는 자리(has)는 거짓 → 부른 쪽이 2D 초상. 손잡이 illust.people 1(0 = 옛 그림) */
  var PEOPLE = { m: ['bandit', 'chief_m', 'enforcer_m', 'exo_m', 'hero_m', 'hero_storm', 'knight_m', 'martial_m', 'punk_m', 'rebelboss', 'swat_m', 'traveler_m'], f: ['ancient_f', 'future_f', 'hero9c', 'hero_ember', 'modern_f', 'punk_f', 'trainer'] };
  function peopleOn() { var C = global.DG && global.DG.core; return on() && !!(C && C.tuned && +C.tuned('illust.people', 1)); }
  /* W-0701 K-0266 한국 1장 정본 셋 — 짝 표(FACE)로만 쓴다(해시 풀 PEOPLE 에 안 넣어 남의 얼굴로 안 퍼짐). 표정 여섯(놀람·즐거움 더) */
  var KR = ['kr_dolme', 'kr_sil', 'kr_tigerkid', 'kr_nari', 'kr_garam', 'kr_seolgi', 'kr_foechief'];   /* W-0737 K-0271 2·3장 넷 — 적장은 화자 id 가 아직 없어 몸만 */
  var MOOD6 = { shock: 'surprised', surprise: 'surprised', surprised: 'surprised', fun: 'fun', play: 'fun' };
  function isPerson(id) { return PEOPLE.m.indexOf(id) >= 0 || PEOPLE.f.indexOf(id) >= 0 || KR.indexOf(id) >= 0; }
  /** 이 몸의 표정 파일 이름 — 정본 셋은 놀람·즐거움까지, 사람 19 는 넷(MOOD) */
  function moodFor(body, emote) { return (KR.indexOf(body) >= 0 && MOOD6[emote]) || MOOD[emote] || 'neutral'; }
  function hashOf(s) { var h = 2166136261, i; s = String(s); for (i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 16777619); } return h >>> 0; }
  /** 인물 id → 사람 19 몸 id(순수 — 성별 표가 있으면 그 성별 안에서, 없으면 19 전체에서) */
  /* 이름에 역할이 뚜렷한 배역은 맞는 몸으로(촌장이 펑크 차림으로 나왔다) — [이름 글자, 몸] 앞에서부터 */
  var ROLE = [[/촌장|촌로|노인|늙은|교두|성주|우두머리|사당지기|도사|종지기|사공|뱃사공/, 'chief_m'], [/도둑|도적|산적/, 'bandit'], [/무녀|해녀/, 'ancient_f'], [/퇴마사/, 'hero_ember'],
    [/파수병|역참지기|척후병|문지기|수비/, 'knight_m'], [/장사치|장돌뱅이|대상|상인|나그네|파발꾼|택배/, 'traveler_m'], [/정비공|기관사|대장장이|조선공|창고지기|곳간지기/, 'martial_m'], [/학자|의원/, 'hero_m']];
  /* 판별 배역 짝 표(손으로 고름 — 역할·옷이 맞고 같은 판 안에서 덜 겹치게, 이름 해시는 한 판에 족장 다섯이 몰렸다) */
  var FACE = { story_dolme: 'kr_dolme', story_sil: 'kr_sil', story_tigerkid: 'kr_tigerkid', story_nari: 'kr_nari', story_garam: 'kr_garam', story_seolgi: 'kr_seolgi', story_elder: 'chief_m', story_ferryman: 'bandit', story_scholar: 'modern_f', story_wanderer: 'hero_m', story_haesol: 'enforcer_m', story_thief: 'punk_m', story_haram: 'future_f', story_daon: 'martial_m', story_gaon: 'exo_m', story_dareum: 'traveler_m', story_ara: 'trainer', story_hangyeol: 'knight_m', story_dodam: 'swat_m', story_hanbyeol: 'hero_storm', story_yeoul: 'hero9c', story_mulsae: 'punk_f', story_saebyeok: 'ancient_f', story_haneul: 'hero_ember', story_chorong: 'modern_f', story_neoul: 'traveler_m', story_maru: 'martial_m', story_sodam: 'trainer', story_byeori: 'rebelboss', story_narae: 'hero9c', story_haemi: 'ancient_f', story_saegil: 'hero_m', story_gamyeon: 'enforcer_m', story_captain: 'knight_m', story_bawoo: 'bandit', fs_keeper: 'chief_m', fs_dareum: 'traveler_m', fs_k7: 'exo_m', fs_pungnang: 'bandit', fs_chalna: 'modern_f', fs_explorer: 'hero_m', fs_rumi: 'future_f', fs_nabi: 'trainer', hl_mukhyang: 'hero_m', dg_gyogyo: 'chief_m', dg_yeoldusi: 'exo_m', dg_guard: 'knight_m', dg_danchu: 'traveler_m', dg_boatman: 'bandit', dg_lord: 'enforcer_m', dg_soyeon: 'hero_ember', dg_mechanic: 'swat_m', dg_caravan: 'rebelboss', dg_cable: 'punk_f', dg_taoist: 'martial_m', sd_deokbo: 'chief_m', sd_courier: 'traveler_m', sd_sori: 'knight_m', sd_hankeot: 'modern_f', sd_ieum: 'future_f', sd_townsman: 'hero_m', sd_yakson: 'trainer' };
  function personOf(id, sex, name) {
    if (!id) { return null; } if (isPerson(id)) { return id; } if (FACE[id]) { return FACE[id]; }
    var I = global.DG && global.DG.assets3dIds, s = sex || (I && I.heroSex && I.heroSex[id]);
    for (var ri = 0; name && ri < ROLE.length; ri++) { if (ROLE[ri][0].test(name) && !(s && (PEOPLE.f.indexOf(ROLE[ri][1]) >= 0 ? 'f' : 'm') !== s)) { return ROLE[ri][1]; } }   // 성별을 알면 다른 성별 역할 몸은 건너뜀
    var L = s === 'f' ? PEOPLE.f : s === 'm' ? PEOPLE.m : PEOPLE.m.concat(PEOPLE.f);
    return L[hashOf(id) % L.length];
  }
  function peopleBase() { return baseOf(null) + 'people/'; }
  function spriteHas(id) { return !!(id && on() && !peopleOn() && SPRITE[id]); }
  function spriteBase() { var A = global.DG && global.DG.assets3d, u = A && A.sharedUrl ? A.sharedUrl('illust_sprite/') : null; return u || '../shared/assets/illust_sprite/'; }
  function oldHas(id) {
    var M = man();
    if (!M || !id || !on() || peopleOn()) { return false; }
    if (from !== M) { set = {}; from = M; M.ids.forEach(function (k) { set[k] = 1; }); }
    return !!set[id];
  }
  function has(id) { if (peopleOn()) { return isPerson(id); } return oldHas(id) || spriteHas(id); }
  /** 감정 이름 → 그 판의 표정 파일 이름(순수) — 모르는 감정·매니페스트에 없는 파일이면 neutral */
  function moodOf(emote, files) {
    var m = MOOD[emote] || 'neutral';
    return !files || files.indexOf(m) >= 0 ? m : 'neutral';
  }
  /** 표정 반신 주소 — 없는 인물이면 null */
  function url(id, emote, name) {
    var M = man(), m = MOOD[emote] || 'neutral';
    if (peopleOn()) { if (!id) { return null; } var bd = personOf(id, null, name); return peopleBase() + bd + '/' + moodFor(bd, emote) + '.webp'; }   // W-0652 사람 19 — 표정 넷 다 있음
    if (spriteHas(id) && (m === 'neutral' || !oldHas(id))) { return spriteBase() + id + '/bust.webp'; }   // 평온(또는 기존 표정 파일이 없는 인물)은 새 반신
    return oldHas(id) ? baseOf(M) + id + '/' + moodOf(emote, M.files) + '.webp' : null;
  }
  /** 전신 스탠딩 주소 — 없는 인물이면 null */
  /* W-0656 K-0245 손짓 반신(표정마다 몸짓, 세로 1024 투명) — 사람 19 모드만, 손잡이 illust.pose 1(0 = 없음 → 부른 쪽은 얼굴) */
  /* W-0687 K-0256 손짓 12 → 넷(사용자 「넣어」·「지워」 11-15 — 두 손이 다 보이는 것만 남김). 남은 넷 = 표정마다 하나 */
  var POSE = { neutral: 'neutral_clasp', happy: 'happy_peace', angry: 'angry_point', sad: 'sad_chest' };
  /* W-0674 고르기 틀(대사 글 key 해시 → 같은 대사는 늘 같은 그림 · key 없음·손잡이 illust.poseMore 0 이면 POSE) — W-0687 부터 표정마다 하나뿐이라 늘 POSE 와 같다 */
  var POSES = { neutral: ['neutral_clasp'], happy: ['happy_peace'], angry: ['angry_point'], sad: ['sad_chest'] };   // 표정마다 하나 — 손짓이 다시 늘면 여기만 늘린다(고르기 해시는 그대로)
  function poseName(emote, key) { var m = MOOD[emote] || 'neutral', C = global.DG && global.DG.core, more = !(C && C.tuned) || +C.tuned('illust.poseMore', 1); if (key == null || key === '' || !more) { return POSE[m]; } var L = POSES[m]; return L[hashOf(String(key)) % L.length]; }
  function pose(id, emote, name, key) { var C = global.DG && global.DG.core; if (!id || !peopleOn() || !(C && C.tuned && +C.tuned('illust.pose', 1))) { return null; } var bd = personOf(id, null, name); if (KR.indexOf(bd) >= 0 && MOOD6[emote]) { return null; } return peopleBase() + bd + '/pose_' + poseName(emote, key) + '.webp'; }   /* W-0701 정본 셋의 놀람·즐거움은 손짓이 없어 얼굴(surprised·fun)을 보인다 — 손짓이 뜨면 얼굴은 CSS 로 숨는다 */
  function stand(id, name) { var M = man(); if (peopleOn()) { return id ? peopleBase() + personOf(id, null, name) + '/stand.webp' : null; } if (spriteHas(id)) { return spriteBase() + id + '/stand.webp'; } return oldHas(id) && (!M.files || M.files.indexOf('stand') >= 0) ? baseOf(M) + id + '/stand.webp' : null; }
  /** W-0701 펫 표정 반신(K-0266 해오 여섯 — illust/pets/<이름>/) — 있는 펫만, 없으면 null. 펫 id 는 pt_ 를 뗀 이름 */
  var PETS = { pt_haeo: 'haeo' };
  function pet(id, emote) { var n = PETS[id]; if (!n || !on()) { return null; } var m = MOOD6[emote] || MOOD[emote] || 'neutral'; return baseOf(null) + 'pets/' + n + '/' + m + '.webp'; }
  function ids() { if (peopleOn()) { return PEOPLE.m.concat(PEOPLE.f); } var M = man(), o = M ? M.ids.slice() : []; Object.keys(SPRITE).forEach(function (k) { if (o.indexOf(k) < 0) { o.push(k); } }); return o; }
  /** W-0394 — manifest 에 base 가 없으면 shared 한 벌(K-0183 116명)로: 공용 주소(assets3d.sharedUrl) → 못 잡으면 상대 경로 */
  function baseOf(M) { var A = global.DG && global.DG.assets3d, u = A && A.sharedUrl ? A.sharedUrl('illust/') : null; if (M && M.base && !(u && M.base.indexOf('../shared/') === 0)) { return M.base; } return u || (M && M.base) || '../shared/assets/illust/'; }   /* W-0464 목록 base 가 예비 경로 ../shared(로컬 서버 404)면 정해진 공용 주소 먼저 */

  global.DG = global.DG || {};
  global.DG.illust = { has: has, url: url, stand: stand, pose: pose, POSE: POSE, POSES: POSES, poseName: poseName, moodOf: moodOf, ids: ids, spriteHas: spriteHas, spriteBase: spriteBase, MOOD: MOOD, baseOf: baseOf, personOf: personOf, PEOPLE: PEOPLE, KR: KR, moodFor: moodFor, pet: pet, peopleOn: peopleOn };
})(window);
