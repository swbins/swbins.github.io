/**
 * 1만리 3D 배우 맞추기(syncActors) — 한 프레임에 나·동행·스폰·짐승·NPC·성채·결투 상대 몸을 세우고 자리·몸짓·이야기 시선을 맞춘다. world3d.js 에서 떼어 냄(R-4 11-17).
 * 몸통은 글자 그대로(바뀌는 이름 T, actorGroup, actors, camera, duelFoe, faceAt, frame, lastLead, stageAt, swapFx, talkNow 만 U.이름() — 부를 때마다). 바깥 이름은 U 로 받는다(같은 객체·함수). 원래 파일은 같은 이름 한 줄 넘김(처음 부를 때 make).
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.world3dActors = { make: function (U) {
  var core = global.DG.core;
  var ACTOR_H = U.ACTOR_H, SWAP_BACK = U.SWAP_BACK, actorOf = U.actorOf, dropActorIfNot = U.dropActorIfNot, farBoost = U.farBoost, fortStyle = U.fortStyle, groundY = U.groundY, meSky = U.meSky, placeActor = U.placeActor, set_lastLead = U.set_lastLead, set_swapFx = U.set_swapFx, set_talkNow = U.set_talkNow, swapMotion = U.swapMotion, syncBuddies = U.syncBuddies, syncGlider = U.syncGlider, talkShot = U.talkShot, rankDeco = U.rankDeco;

  function syncActors(W, now) {
    var pos = core.save.player.pos;

    /* 나 — 동행 선두가 지도 위 내 모습이다(2D 화면과 같은 규칙) */
    /* 들판 전투(§5 ⑨)에서 교체하면 지도 위 내 모습도 그 사람으로 바뀐다 */
    var FCd = global.DG.fieldCombat;
    var lead = (FCd && FCd.leadId()) || (core.save.party && core.save.party[0]);
    var me = lead ? global.DG.data.find(lead) : null;
    var meRef = me || { id: '_me', name: '나', faction: '조선', rarity: 3, trait: 'virtue' };
    if (U.lastLead() !== null && meRef.id !== U.lastLead() && U.actors().me && U.actors().me.who === U.lastLead()) {
      if (U.actors().swapout) { U.actorGroup().remove(U.actors().swapout.node); U.actorGroup().remove(U.actors().swapout.shadow); }
      U.actors().swapout = U.actors().me;                       // 옛 몸을 지우지 않고 넘긴다 — 다시 안 짓는다
      delete U.actors().me;
      set_swapFx({ t0: now, ang: U.actors().swapout.ang || 0, x: pos.x, y: pos.y });
    }
    set_lastLead(meRef.id);
    dropActorIfNot('me', meRef.id);
    var HBg = global.DG.heroBody, hbId = HBg && HBg.get && HBg.get(), meA = actorOf('me', 'hero', (hbId && (!lead || lead === (core.save.party && core.save.party[0]))) ? (global.DG.data.find(hbId) || { id: hbId, name: meRef.name, faction: meRef.faction, rarity: 3, trait: 'virtue' }) : meRef, 96);   // W-0517 고른 주인공 몸(2D 와 같은 값) — 들판 전투에서 다른 동행으로 교체했을 땐 그 사람 몸(교체가 보이게). who·순위 표식은 meRef.id 그대로
    meA.who = meRef.id; rankDeco(meA, meRef.id); if (global.DG.heroVis3d) { global.DG.heroVis3d.apply(meA, U.frame()); }   // W-0237 · W-0675 가림 실루엣·발밑 고리(hero3d-vis.js)
    var mot = W.motion;
    var h = ACTOR_H();
    var walking = mot.speed > 1.5;
    var MTr = global.DG.mount, mtRef = MTr && MTr.petRef ? MTr.petRef() : null;   // ⑲-61 탄 말 — 몸은 말이 걷고 나는 위에 앉는다
    var walkBob = walking
      ? Math.abs(Math.sin(mot.phase)) * h * 0.045
      : Math.sin(now / 700) * h * 0.016;
    /* 나에게도 같은 보정을 준다 — 안 그러면 크게 당겼을 때 **나만 점**이 되고
       야생 대상이 나보다 크게 보인다 */
    var mx = pos.x, my = pos.y;
    if (U.swapFx()) {
      var sm = swapMotion(now - U.swapFx().t0);
      var sx = Math.cos(U.swapFx().ang), sy = -Math.sin(U.swapFx().ang), bx = -Math.sin(U.swapFx().ang), by = -Math.cos(U.swapFx().ang);
      mx += sx * sm.inSide; my += sy * sm.inSide;
      var so = U.actors().swapout;
      if (so && !sm.done) {
        so.seen = U.frame(); so.sky = meSky();
        var ox = U.swapFx().x + bx * sm.outBack - sx * sm.outBack * 0.35, oy = U.swapFx().y + by * sm.outBack - sy * sm.outBack * 0.35;
        placeActor(so, ox, oy, h * farBoost(ox, oy), 0, sm.outBack < SWAP_BACK - 1e-3, now / 480, now);
      }
      if (sm.done) { set_swapFx(null); }             // 이제 swapout 은 안 먹여져 sweepActors 가 흩어 지운다
      walking = walking || sm.inSide > 0.05;
    }
    /* §5 ⑰ 점프 — 뛰어오른 높이만큼 몸을 띄우고 jump 몸짓(없으면 asset3d 가 idle 로 물러난다) */
    var LFa = global.DG.landform, air = LFa ? LFa.airH() : 0;
    if (air > 0) { meA.animName = 'jump'; meA.animUntil = now + 120; }
    meA.sky = meSky();
    placeActor(meA, mx, my, h * farBoost(mx, my), walkBob + air, walking && !air && !mtRef, mot.phase, now);
    if (air > 0 && meA.mesh) { meA.node.position.y += air; }
    if (mtRef) {                                                                     // ⑲-61 말 — 같은 자리·같은 걸음, 나는 등 높이로
      var mtA = actorOf('mount:' + (mtRef.id || ''), 'pet', mtRef, 96);   // W-0119 — 탈것마다 따로(키 하나면 탄 채 바꿔도 첫 몸이 그대로였다)
      mtA.sky = meSky();
      var mtAlt = MTr.altitude ? MTr.altitude() : 0, fl = mtAlt >= MTr.AIR_MIN;
      placeActor(mtA, mx, my, h * farBoost(mx, my) * MTr.SCALE, 0, (walking || fl) && !air, mot.phase, now);
      if (fl && mtA.mesh) { mtA.node.position.y += mtAlt + Math.sin(now / 260) * 0.25; } var seatY = meA.mesh && mtA.mesh && global.DG.pose3d && global.DG.pose3d.seatY ? global.DG.pose3d.seatY(mtA.node, meA.node) : null;   // ⑲-62 뜬 높이(날갯짓 출렁) · W-0434 등 높이는 탈것 몸에서(Pose_ride 엉덩이 = 등 + 허벅지 반지름)
      if (meA.mesh) { if (seatY !== null) { meA.node.position.y = seatY; } else { meA.node.position.y += h * farBoost(mx, my) * MTr.RIDER_LIFT + (fl ? mtAlt + Math.sin(now / 260) * 0.25 : 0); } }
    }
    /* ⑰ 여울 다리 — 상판 위면 몸을 상판 높이에 세운다(땅은 물 바닥이라 안 올리면 다리 밑을 걷는다) */
    var deck = LFa && LFa.deckAt ? LFa.deckAt(mx, my) : null;
    if (deck !== null && meA.mesh && !air) {
      var gyMe = groundY(mx, my);
      if (deck > gyMe) { meA.node.position.y += deck - gyMe; }
    }
    syncGlider(meA, LFa && LFa.gliding && LFa.gliding(), mx, my, air, h);
    /* ⑲-22 조준 중엔 몸이 겨눈 쪽을 본다 */
    var FCme = global.DG.fieldCombat, AVme = FCme && FCme.aimView ? FCme.aimView() : null;
    if (AVme && meA.mesh) { meA.ang = Math.atan2(AVme.dx, AVme.dy); meA.node.rotation.y = meA.ang; } else if (U.faceAt() && now < U.faceAt().until && meA.mesh) { var fdd = Math.atan2(U.faceAt().x - mx, U.faceAt().y - my) - meA.ang; meA.ang += Math.atan2(Math.sin(fdd), Math.cos(fdd)) * 0.45; meA.node.rotation.y = meA.ang; }   // W-0173 칠 때 대상 쪽으로 돈다
    /* ⑲-13 대화 — 나는 대화 상대를 돌아보고, 내 줄(고른 대답)이면 손짓·입. 깜박임은 늘(talkface.js) */
    var TSm = talkShot(), TFm = global.DG.talkface;
    var tdt = U.talkNow() ? Math.min(0.1, Math.max(0, (now - U.talkNow()) / 1000)) : 0;
    set_talkNow(now);
    if (TSm && meA.mesh) {
      var npq = TSm.who === 'me' ? TSm.lst : TSm.spk;
      var mdd = Math.atan2(npq.x - mx, npq.y - my) - meA.ang;
      meA.ang += Math.atan2(Math.sin(mdd), Math.cos(mdd)) * 0.18;
      meA.node.rotation.y = meA.ang; meA.node.userData.look = { x: npq.x, y: meA.node.position.y + 1.45 * meA.node.scale.y, z: npq.y };   // W-0303 시선 — 말 거는 사람을 눈으로 따라간다
    } else if (meA.node.userData.look) { meA.node.userData.look = null; }
    if (TFm && meA.mesh) {
      var meTalk = !!(TSm && TSm.who === 'me');
      TFm.pose(U.T(), meA.node, { speaking: meTalk && TSm.speaking, vowel: meTalk ? TSm.vowel : null, open: meTalk ? TSm.open : 0,
        emo: null, t: now / 1000, dt: tdt, seed: 7 });
    }

    /* 교전 상대(`duelStage()` 로 세운 임시 배우) — `spawns` 에 없으니 여기서
       직접 먹인다. 코앞이라 `farBoost` 는 안 준다(늘 가까이서 마주 선다) */
    if (U.duelFoe()) {
      var dfa = actorOf('duelfoe', U.duelFoe().kind, U.duelFoe().ref, 96);
      placeActor(dfa, U.duelFoe().x, U.duelFoe().y, h * (U.duelFoe().kind === 'pet' ? 0.86 : 1), 0, false, 0, now);
      /* 상대는 **나를 마주 본다.** 걷지 않으니 `placeActor` 의 진행-방향 회전으로는
         절대 안 돌아간다 — 새로 세운 순간의 기본값(뒤짐, PLAN 49절)이 그대로
         남아 계속 등을 보이게 된다. 야생 대상의 무대 회전(위 `onStage`)과 같은 계산 */
      if (dfa.mesh) {
        var fax = pos.x - U.duelFoe().x, faz = pos.y - U.duelFoe().y;
        dfa.node.rotation.y = Math.atan2(fax, faz);
        dfa.ang = dfa.node.rotation.y;
      }
      /* **나도 상대를 본다.** `placeActor(meA,...)` 는 이동 방향으로만 도는데,
         실시간 교전(rogue-action.js) 은 사거리 안에 서서 자동으로 때리는 게
         기본이라 — 가만히 선 채 마지막으로 걸어온 방향을 계속 보고 있으면
         적을 등지거나 옆으로 보고 때리는 것처럼 보인다(2026-09-06, 실기기
         확인 중 "어딜 보고 때림?" 로 지적됨). 위 `placeActor` 가 정한 회전을
         여기서 덮어써 늘 상대 쪽을 보게 한다 */
      if (meA.mesh) {
        var max = U.duelFoe().x - pos.x, maz = U.duelFoe().y - pos.y;
        if (max * max + maz * maz > 0.01) {
          meA.node.rotation.y = Math.atan2(max, maz);
          meA.ang = meA.node.rotation.y;
        }
      }
    }

    syncBuddies(pos, meA.ang, h, now);

    /* 야생 대상 */
    var sp = W.spawns, i;
    var FCs = global.DG.fieldCombat, duelUid = FCs && FCs.duelSpawn ? FCs.duelSpawn() : null;
    for (i = 0; i < sp.length; i++) {
      var s = sp[i];
      if (duelUid !== null && s.uid === duelUid) { continue; }   // ⑯ 겨루는 동안엔 들판 전투 몸(fc)이 대신 선다
      var kind = s.kind === 'hero' ? 'hero' : 'pet';
      var a = actorOf('sp' + s.uid, kind, s.ref, 96);
      var bob = s.moving
        ? Math.abs(Math.sin(s.phase)) * h * 0.04
        : Math.sin(now / 620 + s.uid) * h * 0.02;
      var onStage = U.stageAt() && U.stageAt().uid === s.uid;
      var boost = onStage ? 1 : farBoost(s.x, s.y);
      placeActor(a, s.x, s.y, h * (kind === 'hero' ? 1 : 0.86) * boost,
        onStage ? 0 : bob, onStage ? false : !!s.moving, s.phase || 0, now); if (global.DG.stealth) { global.DG.stealth.mark3d(a, s, h); }   // W-0286 들킴 ❗
      if (onStage) {
        /* 무대 소품(조준 고리)이 상대의 크기에 맞게 서도록 키를 적어 둔다 —
           뿔낙지와 여포에 같은 크기의 고리를 씌우면 하나는 묻히고 하나는 넘친다 */
        U.stageAt().h = h * (kind === 'hero' ? 1 : 0.86);
        /* **자리도 따라간다.** 조우 중에도 판정 층의 배회는 그대로 돌아서(world.js),
           열 때의 좌표에 카메라를 붙박아 두면 상대가 걸어 나가고 빈 땅만 남는다 */
        U.stageAt().x = s.x;
        U.stageAt().y = s.y;
      }
      if (onStage && a.mesh) {
        /* 무대에 선 상대는 **나를 본다.** 등을 돌린 채 설득당하거나 잡히면
           누구를 만나는지가 화면에서 사라진다 */
        var ax = U.camera().position.x - s.x, az = U.camera().position.z - s.y;
        a.node.rotation.y = Math.atan2(ax, az);
        a.ang = a.node.rotation.y;
        a.node.position.y = U.stageAt().lift || 0;
        /* 무대 위의 물러섬·다가섬은 **뒤로 가는 것**이지 뜨는 것이 아니다.
           위로만 띄웠더니 놓친 상대가 공중에 뜬 것처럼 보였다.
           그림자도 같이 옮긴다 — 안 옮기면 발과 그림자가 따로 논다 */
        if (U.stageAt().back) {
          var bl = Math.max(0.5, Math.hypot(ax, az));
          var ox = -ax / bl * U.stageAt().back, oz = -az / bl * U.stageAt().back;
          a.node.position.x = s.x + ox;
          a.node.position.z = s.y + oz;
          a.shadow.position.x = s.x + ox;
          a.shadow.position.z = s.y + oz;
        }
      }
    }

    /* 주민 — 이 땅에 사는 열 사람(`npc.js`). 스폰과 달리 **잡히지 않는 사람들**이라
       발밑 등급 고리를 안 두르고, 조우 무대에도 오르지 않는다 */
    var NP = global.DG.npc;
    var people = NP ? NP.live(pos, now) : [];
    for (i = 0; i < people.length; i++) {
      var n = people[i];
      var na = actorOf('np' + n.p.id, 'hero', n.p, 96);
      var nbob = n.walking
        ? Math.abs(Math.sin(n.phase)) * h * 0.04
        : Math.sin(now / 700 + i) * h * 0.014;
      placeActor(na, n.x, n.y, h * 0.94 * farBoost(n.x, n.y), nbob, n.walking, n.phase, now);
    }
    /* ⑱ 땅 사람 — 탑 둘레 과거·현대·미래 셋(`folk.js`). 주민처럼 잡히지 않는다. 서 있을 땐 탑을 본다 */
    var FK = global.DG.folk, TSf = TSm, TFf = TFm;
    var folks = FK ? FK.live(pos, now) : [];
    if (global.DG.story) { folks = folks.concat(global.DG.story.live(pos, now)); }   // ⑲-12 이야기 인물 셋
    for (i = 0; i < folks.length; i++) {
      var fk = folks[i];
      /* ⑲-21 배달 기계처럼 pet 이면 사람 몸 대신 들판 적 몸(pet:fc_<pet>) */
      var fka = fk.p.pet ? actorOf('fk' + fk.p.id, 'pet', { id: 'fc_' + fk.p.pet, name: fk.p.name, kind: 'beast', rarity: 2, form: 'boar' }, 96)
        : actorOf('fk' + fk.p.id, 'hero', fk.p, 96);
      fka.sky = !!fk.sky;                                   // ⑲-20 구름섬에 선 이야기 인물
      placeActor(fka, fk.x, fk.y, h * 0.94 * farBoost(fk.x, fk.y), fk.walking ? 0 : Math.sin(now / 700 + i) * h * 0.014, fk.walking, fk.phase, now);
      if (!fk.walking && fka.mesh) {
        var fkd = Math.PI / 2 - fk.ang - fka.ang;          // placeActor 규약(atan2(dx,dz))으로 탑 쪽 — 미끄러지듯 돈다
        fkd = Math.atan2(Math.sin(fkd), Math.cos(fkd));
        fka.ang += fkd * 0.08; fka.node.rotation.y = fka.ang;
      }
      /* ⑲-13 이야기 인물 — 말하는 동안 손짓·끄덕임(QRPG 라 입은 없다), 나그네는 흰 가면 */
      if (fk.p.story && !fk.p.pet && fka.mesh && TFf) {
        if (fk.p.mask) { TFf.mask(U.T(), fka.node, typeof fk.p.mask === 'string' ? fk.p.mask : 'white'); }   // ⑲-19 해솔은 금 간 가면
        var fkTalk = !!(TSf && TSf.who === fk.p.story);
        TFf.pose(U.T(), fka.node, { speaking: fkTalk && TSf.speaking, vowel: fkTalk ? TSf.vowel : null, open: fkTalk ? TSf.open : 0,
          emo: fkTalk ? TSf.emo : null, t: now / 1000, dt: tdt, seed: i + 3 });
      }
    }

    /* 짐승 — 들·강의 다섯 종(`animal.js`). 잡는 대상이 아니라 **거기 사는 것**이라
       등급 고리도 이름표도 없다. 새는 뜨고 물고기는 잠기므로 세운 뒤 높이를 준다 */
    var AN = global.DG.animal;
    var beasts = AN ? AN.live(pos, now) : [];
    for (i = 0; i < beasts.length; i++) {
      var bt = beasts[i];
      var ba = actorOf('an' + bt.m.id, 'pet', AN.refOf(bt.kind), 96);
      var bh = h * bt.kind.h * farBoost(bt.x, bt.y);
      placeActor(ba, bt.x, bt.y, bh, 0, bt.moving, bt.phase, now);
      if (bt.lift) {
        /* 날아오른 새는 **그림자가 작아지고 흐려진다** — 높이만 주면 지면에 붙어
           보인다(발밑 그림자가 그대로면 눈이 높이를 못 읽는다) */
        ba.node.position.y = bt.lift;
        ba.shadow.scale.setScalar(bh * 0.30 * Math.max(0.25, 1 - bt.lift / 12));
      }
      if (bt.kind.act !== null && bt.alarm > 0.05) {
        /* 놀랐거나 쫓는 짐승은 그쪽을 본다 — 옆을 보고 도망치면 도망으로 안 보인다 */
        ba.node.rotation.y = bt.ang;
        ba.ang = bt.ang;
      }
    }

    /* 들판 적 무리(`field-combat.js`, §5 ⑨) — 쓰러지면 1초 동안 가라앉으며 줄어든다 */
    var FC = global.DG.fieldCombat;
    var fcs = FC ? FC.live() : [];
    for (i = 0; i < fcs.length; i++) {
      var fo = fcs[i];
      var foa = actorOf('fc' + fo.uid, fo.hero ? 'hero' : 'pet', fo.ref, 96);
      foa.sky = !!fo.sky;                                   // ⑲-20 구름섬 무리
      /* ⑯ 굴복한 인물은 사라지지 않고 무릎 꿇는다(키를 낮춘다) */
      var foh = h * fo.h * (fo.dead ? Math.max(0.05, 1 - fo.deadT) : (fo.yielded ? 0.72 : 1));
      placeActor(foa, fo.x, fo.y, foh, 0, fo.moving && !fo.dead, fo.phase, now);
      if (foa.mesh) { foa.node.rotation.z = fo.stun ? Math.sin(now / 90) * 0.12 : 0; }
      if (fo.mask && foa.mesh && TFf) { TFf.mask(U.T(), foa.node, fo.mask); }   // ⑲-14 이야기 보스 검은 가면
    }

    /* 역참 · 성채 */
    var sts = W.stationsNear ? W.stationsNear() : [];
    for (i = 0; i < sts.length; i++) {
      var st = sts[i];
      /* sprite.building 의 form 이름을 그대로 쓴다 — 빌보드로 돌아갔을 때
         2D 화면과 같은 그림이어야 한다 */
      var sa = actorOf('st' + st.key, 'building',
        { key: 'stable', id: 'st_' + st.key, color: '#e8c15a' }, 128);
      placeActor(sa, st.x, st.y, h * 1.7 * farBoost(st.x, st.y), 0, false, 0, now);
    }
    /* 지역 랜드마크(biome.js, §5 ⑩) — 1.35km 안이면 선다(빛기둥은 biome.js 가 얹는다) */
    var BMw = global.DG.biome;
    var lms = BMw && BMw.on() ? BMw.landmarks(pos.x, pos.y, 1350) : [];
    for (i = 0; i < lms.length; i++) {
      var lm = lms[i];
      var la = actorOf('lm' + lm.key, 'building',
        { key: 'landmark', id: 'lm_' + lm.key, biome: lm.biome, color: BMw.BIOMES[lm.biome].color }, 128);
      placeActor(la, lm.x, lm.y, h * 2.4 * farBoost(lm.x, lm.y), 0, false, 0, now);
    }
    var fts = W.fortsNear ? W.fortsNear() : [];
    for (i = 0; i < fts.length; i++) {
      var ft = fts[i];
      var fs = fortStyle(ft);
      var fa = actorOf('ft' + ft.key, 'building',
        { key: 'wall', id: 'ft_' + ft.key, color: ft.color || fs.color, tier: fs.tier }, 128);
      placeActor(fa, ft.x, ft.y, h * 2.4 * farBoost(ft.x, ft.y), 0, false, 0, now);
    }
  }

  /**
   * 성채의 **겉모습** — 등급과 지키는 세력의 빛깔.
   *
   * 여태 성채는 화면에서 다 같았다(늘 보라색 배너에 같은 크기). 등급 셋(보·진·웅진)도
   * 세력도 판정 층은 알고 있는데 화면이 안 물어봤을 뿐이다. 물어보고 나면
   * **걸어가기 전에 멀리서 세기와 임자를 가늠**할 수 있다.
   *
   * **키로 캐시한다.** `factionNameOf` 는 도감 일흔을 훑으므로 프레임마다 부르면
   * 안 된다. 같은 성채의 등급·세력은 늘 같으니(해시로 정해진다) 캐시가 맞다 —
   * 점령 여부만 바뀌는데 그것은 여기서 안 쓴다.
   */

  return { syncActors: syncActors };
  } };
})(window);
