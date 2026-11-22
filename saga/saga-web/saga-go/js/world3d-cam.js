/**
 * 1만리 3D 카메라·빛 — 카메라가 볼 자리(camAim: 걷기·결투·이야기·무대), 건물에 가리면 당기기(camOcclude), 프레임마다 카메라·흔들림·안개 맞추기(syncCamera), 그림자 켜고 끄기(syncShadow). world3d.js 에서 떼어 냄(R-4 11-17).
 * 몸통은 글자 그대로(바뀌는 이름 T, battleOn, camLook, camPos, camera, duelFoe, eventDark, forcedMs, frame, renderer, scene, shadowMat, shadowOn, shakeAmp, sky, stageAt, sun, yaw 만 U.이름() — 부를 때마다). 바깥 이름은 U 로 받는다(같은 객체·함수). 원래 파일은 같은 이름 한 줄 넘김(처음 부를 때 make).
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.world3dCam = { make: function (U) {
  var core = global.DG.core;
  var ACTOR_H = U.ACTOR_H, CAM_DIST = U.CAM_DIST, CAM_HIGH = U.CAM_HIGH, GRID = U.GRID, IBL_SCALE = U.IBL_SCALE, aimCam = U.aimCam, duelSpotBlocked = U.duelSpotBlocked, focusLive = U.focusLive, groundY = U.groundY, h1 = U.h1, houseRects = U.houseRects, lightingAt = U.lightingAt, meSky = U.meSky, setCamLook = U.setCamLook, setCamPos = U.setCamPos, setLightNow = U.setLightNow, setShadowOn = U.setShadowOn, setShakeAmp = U.setShakeAmp, standY = U.standY, talkShot = U.talkShot, weatherKey = U.weatherKey;

  /* ── 카메라 · 빛 ──────────────────────────────────────────
   * 시점 버튼(2D → 2.5D → 3D)이 **각도**를 정한다. 원작의 3D 는 카메라가 낮게
   * 깔려 건물 옆면이 보이는 각이라, 3D 모드에서 가장 눕는다.
   */

  /**
   * 카메라가 어디서 무엇을 볼지 — 순수 계산이라 진단이 따로 굴려 본다.
   *
   * 거리는 **사람이 화면에서 차지하는 몫**으로 정했다. 원작에서 아바타는 화면 높이의
   * 1/8쯤이다 — 그보다 크면 인형놀이가 되고 작으면 누군지 안 보인다. 키 3.4m 를
   * 화각 52°로 담으려면 27m 쯤 물러나야 한다(처음엔 16m 라 얼굴이 화면을 채웠다).
   *   2D    거의 머리 위에서 (예전 탑다운과 같은 그림)
   *   2.5D  비스듬히 내려다본다
   *   3D    낮게 깔려 건물 옆면이 보인다 — 원작의 그 각
   */
  var CAM_HIGH_MUL = [2.27, 1.33, 0.80];    // 카메라 높이 배수
  var CAM_BACK_MUL = [0.05, 0.40, 0.60];    // 뒤로 물러나는 거리 배수
  var CAM_AHEAD = [0, 3, 5]; function CAM3D_BACK() { return core.tuned('world3d.cam3dBack', 11); } function CAM3D_UP() { return core.tuned('world3d.cam3dUp', 5); } function CAM3D_LOOK() { return core.tuned('world3d.cam3dLook', 1.6); } function CAM3D_AHEAD() { return core.tuned('world3d.cam3dAhead', 2); }   // 시선을 앞으로 던지는 거리(m) · W-0198 3D 는 손잡이(어깨 너머 — 몸 ≈ 화면 1/4, 사용자 10-14 "RPG 처럼")

  /** 조우 무대 — 대상 앞 몇 미터에 서서 눈높이로 본다 (원작의 포획 화면).
      거리는 **상대 키에 비례**한다: 사람과 뿔낙지를 같은 자리에서 보면
      하나는 얼굴이 화면을 채우고 하나는 발치에 놓인다 */
  function STAGE_DIST() { return core.tuned('world3d.stageDist', 10.5); }
  /** 교전 상대가 실제로 서 있을 때(`U.duelFoe()`) 카메라가 다가서는 거리 —
      `stage` 보다 낮고 옆에서 본다(둘 다 한 화면에 담아야 한다) */
  function DUEL_DIST() { return core.tuned('world3d.duelDist', 9); }

  function camAim(pos, mode, focus, stage, zoom, battle, yaw, duel) {
    var z = (zoom === undefined || !isFinite(zoom) || zoom <= 0) ? 1 : zoom;
    var yw = yaw || 0;
    /* 교전이 열리면 **약간 줌인**한다(PLAN 23절). 무대(stage)처럼 자리를 통째로
       옮기지는 않는다 — 싸움은 내가 선 자리에서 벌어지고, 카메라만 다가선다 */
    if (battle) { z = z * 0.62; }
    if (!stage && duel) {
      /* 실제 상대가 3D 로 서 있으면(`world3d.duelStage()`) **둘을 옆에서 가까이**
         담는다 — 위에서 내려다보는 기본 구도로는 화면 한복판의 카드에 다 가려진다.
         무대(`stage`)의 "무릎께" 구도와 달리 상대가 아니라 **둘 사이**를 축으로 삼는다 */
      var mx = (pos.x + duel.x) / 2, my = (pos.y + duel.y) / 2;
      var ddx = duel.x - pos.x, ddy = duel.y - pos.y;
      var dlen = Math.max(0.5, Math.hypot(ddx, ddy));
      var px = -ddy / dlen, pz = ddx / dlen;   // 둘을 잇는 선에 수직 — 옆에서 본다
      var DD = DUEL_DIST();
      /* 마을 한복판에서 걸리면 이 낮고 가까운 자리가 **집 안**일 수 있다
         (2026-08-30, 실기기 대신 스크린샷으로 확인하다 발견 — 벽 속에서
         찍은 듯한 그림이 떴다). 반대편을 대신 써 보고, 그마저 막히면 낮게
         깔지 않고 기본 카메라처럼 높이 물러난다(막힌 벽보다 먼 그림이 낫다) */
      var CAM_MARGIN = 7;      // 카메라는 벽에서 이만큼은 떨어져야 근접 절단면이 안 보인다
                                // (지붕은 벽보다 넓게 튀어나오므로 바닥 사각형만으론 부족하다 — 넉넉히 잡는다)
      var side1 = { x: mx + px * DD, z: my + pz * DD };
      var side2 = { x: mx - px * DD, z: my - pz * DD };
      var pick = !duelSpotBlocked(side1.x, side1.z, CAM_MARGIN) ? side1 :
        (!duelSpotBlocked(side2.x, side2.z, CAM_MARGIN) ? side2 : null);
      if (pick) {
        return { pos: { x: pick.x, y: DD * 0.55, z: pick.z }, look: { x: mx, y: 2.2, z: my } };
      }
      /* 마을 한복판이 너무 빽빽해 양옆 다 막히면(2026-08-30, 실제로 찍어서
         걸린 자리를 재현했다 — 낮은 재시도까지 벽에 박혔다) **낮게 다가서는
         것 자체를 포기한다.** 아래 `focus` 구도(늘 안전하다고 확인된, 멀리서
         내려다보는 그림)를 그대로 따라 쓴다 — 상대(`duel`)를 `focus` 자리로
         그대로 꽂아 넣는다 */
      var dback = CAM_DIST() * CAM_BACK_MUL[mode] * z;
      var dhigh = CAM_HIGH() * CAM_HIGH_MUL[mode] * Math.pow(z, 1.12);
      var fdx = duel.x - pos.x, fdy = duel.y - pos.y;
      var flen = Math.max(1, Math.hypot(fdx, fdy));
      var fux = fdx / flen, fuy = fdy / flen;
      var fspan = Math.min(dback * 2.2, Math.max(dback, flen * 0.9));
      return {
        pos: { x: pos.x - fux * fspan * 0.7 - fuy * fspan * 0.45,
               y: dhigh * 0.72,
               z: pos.y - fuy * fspan * 0.7 + fux * fspan * 0.45 },
        look: { x: mx, y: 2.0, z: my }
      };
    }
    if (stage) {
      /* 나와 대상을 잇는 선 위에서, **대상 쪽에서 나를 향해** 물러선 자리다.
         무대에서는 시점 모드를 안 본다 — 조우는 어느 시점에서 열었든 같은 그림이어야 한다 */
      var sx = pos.x - stage.x, sy = pos.y - stage.y;
      var slen = Math.max(0.5, Math.hypot(sx, sy));
      var sh = stage.h || 3.2;
      var D = STAGE_DIST() * (sh / 3.2);
      return {
        pos: { x: stage.x + sx / slen * D, y: sh * 0.95, z: stage.y + sy / slen * D },
        /* 무릎께를 본다 — 상대가 화면 위쪽에 서고 아래는 조우 카드 자리가 된다 */
        look: { x: stage.x, y: sh * 0.45, z: stage.y }
      };
    }
    /* 멀리 물러날수록 **더 내려다본다** — 거리와 높이를 같은 비율로 늘리면
       지평선만 잔뜩 보이고 발밑이 안 보인다 */
    var back = mode === 2 ? CAM3D_BACK() * z : CAM_DIST() * CAM_BACK_MUL[mode] * z;   // W-0198 3D 는 휠로 물러나면(z≈2.2) 옛 24m·12m 쯤
    var high = mode === 2 ? Math.max(CAM3D_UP() * Math.pow(z, 1.3), z < 1 ? CAM3D_LOOK() * 1.15 : 0) : CAM_HIGH() * CAM_HIGH_MUL[mode] * Math.pow(z, 1.12);   // W-0324 코앞(z<1)에선 눈높이 아래로 안 내려감 — 다리만 보이던 것
    if (focus) {
      /* 나와 대상 사이를 본다. 카메라는 **내 뒤 옆쪽**에 서서 둘을 한 화면에 담는다 */
      var dx = focus.x - pos.x, dy = focus.y - pos.y;
      var len = Math.max(1, Math.hypot(dx, dy));
      var ux = dx / len, uy = dy / len;
      /* 멀리 있는 대상이면 더 물러나되 **상한을 둔다** — 조우는 코앞에서만 열리지만
         (ENCOUNTER_RANGE) 데모처럼 먼 대상을 걸면 카메라가 200m 밖으로 날아간다 */
      var span = Math.min(back * 2.2, Math.max(back, len * 0.9));
      return {
        pos: { x: pos.x - ux * span * 0.7 - uy * span * 0.45,
               y: high * 0.72,
               z: pos.y - uy * span * 0.7 + ux * span * 0.45 },
        look: { x: (pos.x + focus.x) / 2, y: 2.0, z: (pos.y + focus.y) / 2 }
      };
    }
    /* **돌려 보기**(PLAN 7·26절 "마우스/터치 회전") — 카메라를 나를 축으로 돌린다.
       보는 곳은 그대로 내 앞이라, 돌려도 **내가 화면 한가운데** 남는다 */
    var cs = Math.cos(yw), sn = Math.sin(yw);
    var ax = 0, az = back;                       // 안 돌렸을 때 카메라가 서는 자리
    var ahead = mode === 2 ? CAM3D_AHEAD() * Math.min(1, z) : CAM_AHEAD[mode];   // W-0324 코앞에선 앞쪽 대신 나를 본다
    return {
      pos: { x: pos.x + ax * cs - az * sn, y: high, z: pos.y + ax * sn + az * cs },
      look: { x: pos.x + ahead * sn, y: mode === 0 ? 0.5 : (mode === 2 ? CAM3D_LOOK() : 2.4), z: pos.y - ahead * cs }
    };
  }

  /**
   * 건물 가림 — 오픈월드 RPG처럼 **카메라가 벽 앞으로 당겨 온다**(PLAN §5 ⑯ 곁, 2026-09-24 사용자 "건물 근처로 가면
   * 캐릭터가 안 보여"). 집은 인스턴스로 그려 한 채만 반투명하게 할 수 없어서, 광선 대신 벽 충돌과 같은
   * 사각형(`houseRects`, 키 h 를 실었다)으로 잰다 — 머리(P)에서 카메라(C)로 가는 선이 집 몸통에
   * **지붕보다 낮게** 들어가면, 들어가는 자리 조금 앞(t)까지 당긴다. 순수 함수 — 진단이 값으로 붙든다.
   *   P·C = {x, y, z}(three 좌표, y 가 위) · rects = [{x, z, w, d, rot, h, base}] → t(0.2~1, 1 = 안 가림)
   * 보이는 GLB 는 키로 고르게 늘여 벽 사각형보다 넓다 — 반폭은 max(w/2, 키×0.45)로 넉넉히 잡는다.
   */
  function camOcclude(P, C, rects) {
    var best = 1, i;
    for (i = 0; i < rects.length; i++) {
      var r = rects[i];
      var c = Math.cos(r.rot || 0), sn = Math.sin(r.rot || 0);
      function loc(x, z) { var dx = x - r.x, dz = z - r.z; return [dx * c + dz * sn, -dx * sn + dz * c]; }
      var a = loc(P.x, P.z), b = loc(C.x, C.z);
      var hx = r.exact ? r.w / 2 : Math.max(r.w / 2, r.h * 0.45), hz = r.exact ? r.d / 2 : Math.max(r.d / 2, r.h * 0.45);   // exact = 산봉우리 원뿔(W-0113) — 폭 그대로
      var t0 = 0, t1 = 1, k, lo = [-hx, -hz], hi = [hx, hz], ok = true;
      for (k = 0; k < 2 && ok; k++) {
        var d = b[k] - a[k];
        if (Math.abs(d) < 1e-9) { if (a[k] < lo[k] || a[k] > hi[k]) { ok = false; } continue; }
        var u0 = (lo[k] - a[k]) / d, u1 = (hi[k] - a[k]) / d;
        if (u0 > u1) { var tmp = u0; u0 = u1; u1 = tmp; }
        t0 = Math.max(t0, u0); t1 = Math.min(t1, u1);
        if (t0 > t1) { ok = false; }
      }
      if (!ok || t0 <= 0 || t0 >= 1) { continue; }      // 안 지나거나, 머리가 이미 몸통 안(벽에 붙음)
      var y = P.y + (C.y - P.y) * t0, top = (r.base || 0) + r.h;
      if (y < top && t0 < best) { best = t0; }
    }
    return best >= 1 ? 1 : Math.max(0.2, best - 0.04);
  }
  function OCCLUDE_ON() { return core.tuned('world3d.camOcclude', 1) ? true : false; }
  /** 내 둘레 3×3 칸의 집 — 땅 높이(base)를 붙인다(산비탈 마을) */
  function rectsNear(x, y) {
    var gx0 = Math.floor(x / GRID), gy0 = Math.floor(y / GRID), gx, gy, rs, i, out = [];
    for (gy = gy0 - 1; gy <= gy0 + 1; gy++) {
      for (gx = gx0 - 1; gx <= gx0 + 1; gx++) {
        rs = houseRects(gx, gy); if (global.DG.world.terrainAt(gx, gy) === 'mount') { rs = rs.concat([{ x: gx * GRID + GRID / 2, z: gy * GRID + GRID / 2, w: GRID * 0.5, d: GRID * 0.5, rot: 0, h: (14 + h1(gx * 3 + 1, gy * 5 + 2) * 22) * 0.75, exact: true }]); }   // W-0113 산봉우리도 가린다
        for (i = 0; i < rs.length; i++) { if (rs[i].h) { rs[i].base = groundY(rs[i].x, rs[i].z); out.push(rs[i]); } }
      }
    }
    return out;
  }
  var occlT = 1, occlAcc = 9, occlRects = [], occlCell = null;

  /** 카메라 배율 — 비행 중 ×2.2 는 가까운 3D(시점 2)에서만(2D·2.5D 는 이미 멀다) · 그림자 상자도 이 값을 본다 */
  function camZoom(W) { return (W.zoom3d || 1) * (W.tiltMode === 2 && global.DG.mount && global.DG.mount.flying && global.DG.mount.flying() ? 2.2 : 1); }

  function syncCamera(W, dt) {
    var pos = core.save.player.pos;
    /* ⑲-13 이야기 대화 — 듣는 이 어깨 너머에서 말하는 이 얼굴을 본다(talkface.talkAim). 끝나면 아래 보통 구도로 따라 돌아온다 */
    var TS = U.stageAt() ? null : talkShot();
    /* 조우 무대에서는 줌을 무시한다 — 무대는 늘 같은 그림이어야 한다 */
    /* ⑲-22 활 조준 — 오른 어깨 너머에서 겨눈 쪽을 본다(대화·조우 무대가 먼저) */
    var FCv = global.DG.fieldCombat, AV = !TS && !U.stageAt() && FCv && FCv.aimView ? FCv.aimView() : null;
    var aim = TS ? global.DG.talkface.talkAim(TS.spk, TS.lst, ACTOR_H()) : (AV ? aimCam(pos, AV, ACTOR_H()) : camAim(pos, W.tiltMode, focusLive(), U.stageAt(),
      U.stageAt() ? 1 : camZoom(W), U.battleOn(), U.stageAt() ? 0 : U.yaw(), U.duelFoe())); if (!TS && !AV && !U.stageAt() && !U.duelFoe() && !focusLive() && global.DG.landmark3d) { aim = global.DG.landmark3d.apply(aim); }   // W-0162 멀리 보기(기본 구도만)
    /* **카메라와 시선도 땅을 따라 오른다.** 안 그러면 산에 오를 때 카메라가
       제자리에 남아 땅이 화면을 덮고, 골짜기에서는 하늘만 보인다.
       `camAim` 은 평면 기준으로 값을 내므로 여기서 땅 높이만 얹는다 —
       그쪽은 순수 함수로 남겨 둔다(자가진단이 값으로 붙들고 있다) */
    var camLift = groundY(aim.pos.x, aim.pos.z);
    var lookLift = groundY(aim.look.x, aim.look.z);
    /* 활공(§5 ⑰ 다음) — 몸이 땅 위 수십 m 를 나는 동안은 카메라·시선도 몸 높이를 따라간다 */
    var LFc = global.DG.landform;
    if (LFc && ((LFc.gliding && LFc.gliding()) || meSky() || (LFc.onPole && LFc.onPole()))) {     // ⑲-20 섬 위·⑲-34 기둥 위에서도 몸 높이를 따른다
      var bodyY = standY(pos.x, pos.y) + LFc.airH();
      camLift = Math.max(camLift, bodyY); lookLift = Math.max(lookLift, bodyY);
    }
    var want = new (U.T()).Vector3(aim.pos.x, aim.pos.y + camLift, aim.pos.z);
    var look = new (U.T()).Vector3(aim.look.x, aim.look.y + lookLift, aim.look.z);
    /* 건물 가림(camOcclude) — 2.5D·3D 에서만(2D 는 머리 위라 안 가린다). 칸이 바뀔 때만 집을 다시 모으고,
       판정은 0.1초마다(폰 발열). 당길 때는 빨리, 풀 때는 천천히 — 벽 너머가 비치는 순간이 없게 */
    var occl = 1;
    if (OCCLUDE_ON() && W.tiltMode >= 1 && !U.stageAt()) {
      var cellK = Math.floor(pos.x / GRID) + ':' + Math.floor(pos.y / GRID);
      if (cellK !== occlCell) { occlCell = cellK; occlRects = rectsNear(pos.x, pos.y); }
      occlAcc += dt;
      /* 대화 중에는 내 머리 대신 말하는 이 얼굴(시선)에서 잰다 */
      var hx = TS ? look.x : pos.x, hz = TS ? look.z : pos.y, hy = TS ? look.y : standY(pos.x, pos.y) + 1.7;
      if (occlAcc > 0.1 && occlRects.length) {
        occlAcc = 0;
        occlT = camOcclude({ x: hx, y: hy, z: hz }, { x: want.x, y: want.y, z: want.z }, occlRects);
      } else if (!occlRects.length) { occlT = 1; }
      occl = occlT;
      if (occl < 1) {
        want.set(hx + (want.x - hx) * occl, hy + (want.y - hy) * occl, hz + (want.z - hz) * occl);
      }
    }
    if (!U.camPos()) { setCamPos(want.clone()); setCamLook(look.clone()); }
    /* 카메라는 곧바로 붙지 않고 따라온다 — 원작의 그 미끄러지는 느낌이다.
       교전 중에는 조금 더 빨리 붙는다(줌인이 굼뜨면 때리는 맛이 죽는다) */
    var k = occl < 1 ? Math.min(1, dt * 14) : (TS ? 1 - Math.exp(-7 * dt) : Math.min(1, dt * (U.battleOn() ? 9 : 6.5)));   // 대화는 지수 7/초
    U.camPos().lerp(want, k);
    U.camLook().lerp(look, k);
    U.camera().position.copy(U.camPos());
    /* 흔들림 — **따라온 자리에 얹기만** 한다. U.camPos() 자체를 흔들면 흔들림이
       다음 프레임의 출발점이 되어 카메라가 조금씩 밀려난다 */
    if (U.shakeAmp() > 0.001 && !TS) {             // 대화 중엔 흔들림을 안 받는다
      var ph = U.frame() * 1.9;
      U.camera().position.x += Math.sin(ph) * U.shakeAmp();
      U.camera().position.y += Math.sin(ph * 1.7 + 1.1) * U.shakeAmp() * 0.6;
      U.camera().position.z += Math.cos(ph * 1.3) * U.shakeAmp();
      setShakeAmp(U.shakeAmp() * Math.pow(0.02, dt));            // 초당 50분의 1로 잦아든다
    } else { setShakeAmp(0); }
    U.camera().lookAt(U.camLook());
  }

  /* 크게 당기면 절두체에 사물이 다 들어와 그림자 맵이 감당하지 못한다.
     그 높이에서는 그림자가 몇 픽셀도 안 되니 **끄는 편이 낫다.**
     경계에서 한 번만 갈아 끼운다 — 프레임마다 바꾸면 셰이더를 다시 컴파일한다 */
  function syncShadow(zoom) {
    var P = global.DG.perf;
    var want = zoom < 4 && !(global.DG_3D_DEBUG || {}).noShadow && (!P || P.shadowOk());
    if (want === U.shadowOn()) { return; }
    setShadowOn(want);
    U.renderer().shadowMap.enabled = want; if (U.shadowMat()) { U.shadowMat().opacity = want ? 0.16 : 0.34; }   // W-0199 진짜 그림자가 있으면 발밑 원판은 접지 그늘만
    U.scene().traverse(function (o) {
      if (o.isMesh && o.material) { o.material.needsUpdate = true; }
    });
  }

  var zoneWalls = null; function syncLight(dt) {
    var L = lightingAt(U.forcedMs() === null ? undefined : U.forcedMs(), weatherKey());
    setLightNow(L); var ZCw = global.DG.zoneCut, zwM = +core.tuned('go.zoneM', 576); if (ZCw && ZCw.walls && U.scene() && U.T()) { if (!zoneWalls) { zoneWalls = ZCw.walls(U.scene(), U.T()); } if (zoneWalls) { if (zwM > 0) { var zpp = core.save.player.pos, zx0 = ((global.DG.goZoneIdx ? global.DG.goZoneIdx(zpp, 0, zwM) : Math.floor(zpp.x / zwM + 0.5)) - 0.5) * zwM - 130, zy0 = ((global.DG.goZoneIdx ? global.DG.goZoneIdx(zpp, 1, zwM) : Math.floor(zpp.y / zwM + 0.5)) - 0.5) * zwM - 130; zoneWalls.set(zx0, zy0, zx0 + zwM + 260, zy0 + zwM + 260, U.scene().fog && U.scene().fog.color ? U.scene().fog.color.getHex() : L.bg, 120); } else { zoneWalls.group.visible = false; } } }   /* W-0417 구역 경계 안개 벽 — 안 지은 땅(구역+160m 밖)을 가린다 */
    var pos = core.save.player.pos; if (global.DG.ground3d) { global.DG.ground3d.ridge(U.scene()); global.DG.ground3d.follow(pos, U.scene().fog && U.scene().fog.color ? U.scene().fog.color.getHex() : null, L.bg); global.DG.ground3d.turf(U.scene(), pos); } if (global.DG.farland3d) { global.DG.farland3d.follow(U.scene(), pos, U.camera(), L); }   /* W-0200 먼 산 고리·발밑 잔풀 */ if (global.DG.skypano3d) { global.DG.skypano3d.apply(L, { three: U.T(), scene: U.scene(), camera: U.camera(), pos: pos, dark: U.eventDark() }); }   // W-0140 그린 하늘·그 해 자리·지평선 색(skypano3d.js)
    /* 해는 늘 플레이어 곁을 따라다닌다 — 그림자 상자를 좁게 유지하려고.
       높이·방위만 시각이 정한다 */
    U.sun().position.set(pos.x + L.sun.x, L.sun.y, pos.y + L.sun.z);
    U.sun().target.position.set(pos.x, 0, pos.y);
    U.sun().target.updateMatrixWorld(); var Wl = global.DG.world || {}, shR = Wl.tiltMode === 2 && camZoom(Wl) < 2.5 ? core.tuned('light3d.shadowNear', 45) : 140; if (U.sun().shadow.camera.right !== shR) { var sc0 = U.sun().shadow.camera; sc0.left = sc0.bottom = -shR; sc0.right = sc0.top = shR; sc0.updateProjectionMatrix(); }   // W-0199 가까운 3D 보기면 그림자 상자를 좁혀 사람 그림자를 선명하게(1024² 에 ±140 은 0.27m/칸)
    U.sun().color.setHex(L.sun.hex);
    U.sun().intensity = L.sun.intensity;
    U.sky().color.setHex(L.hemi.sky);
    U.sky().groundColor.setHex(L.hemi.ground);
    /* 사건이 조명을 죽인다 — 태양·하늘빛만 낮추고(색은 그대로 두어 "밤인데
       더 어두워짐"으로 보이게 한다) 안개는 좁혀 "가까이만 보인다"를 낸다 */
    var dk = U.eventDark();
    U.sun().intensity = L.sun.intensity * (1 - dk * 0.55);
    U.sky().intensity = L.hemi.intensity * (1 - dk * 0.45);
    /* IBL 세기도 같은 낮·밤·날씨 곡선을 탄다 — 위 loadEnvironment() 머리말 참고 */
    if (U.scene().environmentIntensity !== undefined) {
      U.scene().environmentIntensity = U.sky().intensity * IBL_SCALE();
    }
    if (U.scene().background && U.scene().background.setHex) { U.scene().background.setHex(L.bg); }
    U.renderer().setClearColor(L.bg, 1);
    if (U.scene().fog) {
      U.scene().fog.color.setHex(L.bg);
      U.scene().fog.near = L.fog.near * (1 - dk * 0.5);
      U.scene().fog.far = L.fog.far * (1 - dk * 0.4); var FLf = global.DG.farland3d ? global.DG.farland3d.fogFar() : 0; if (FLf) { U.scene().fog.far = FLf; U.scene().fog.near = Math.max(U.scene().fog.near, FLf * 0.45); }   // W-0310 ④ 지평선 — far3d.on 이면 안개를 km 밖으로
    }
  }


  return { syncLight: syncLight, STAGE_DIST: STAGE_DIST, DUEL_DIST: DUEL_DIST, camAim: camAim, camOcclude: camOcclude, OCCLUDE_ON: OCCLUDE_ON, rectsNear: rectsNear, camZoom: camZoom, syncCamera: syncCamera, syncShadow: syncShadow };
  } };
})(window);
