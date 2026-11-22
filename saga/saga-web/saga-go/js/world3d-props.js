/**
 * 1만리 3D 소품 짓기 — 가로등 전구·연기, 건물·나무·소품 한 채 짓기(buildProp), 둘레 소품 싣고 내리기(syncProps), 등불·풀 흔들림·불꽃·연기 걸음. world3d.js 에서 떼어 냄(R-4 11-17).
 * 몸통은 글자 그대로(바뀌는 이름 T, lightNow, propGroup, propMeshes, townDens, swayClock, propScan, smokeByKey 만 U.이름() — 부를 때마다). 바깥 이름은 U 로 받는다(같은 객체·함수). 원래 파일은 같은 이름 한 줄 넘김(처음 부를 때 make).
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.world3dProps = { make: function (U) {
  var core = global.DG.core;
  var DENSITY = U.DENSITY, FLAME_AMT = U.FLAME_AMT, FLAME_ON = U.FLAME_ON, GRID = U.GRID, LOD_NEAR = U.LOD_NEAR, MESH_ON = U.MESH_ON, PROP_R = U.PROP_R, PROP_UR = U.PROP_UR, SMOKE_ON = U.SMOKE_ON, SWAY_AMT = U.SWAY_AMT, SWAY_ON = U.SWAY_ON, WET = U.WET, box = U.box, groundY = U.groundY, instDrop = U.instDrop, instProp = U.instProp, pmat = U.pmat, pressVec = U.pressVec, propPlan = U.propPlan, setPropScan = U.setPropScan, setSwayClock = U.setSwayClock, swayShaders = U.swayShaders, weatherKey = U.weatherKey;

  function addLampBulb(g, x, y, z, r) {
    var b = box(g, 'sph', pmat(0xffd489, 'glow'), x, y, z, r, r * 1.25, r, false);
    b.userData.lamp = true;
    b.visible = !!(U.lightNow() && U.lightNow().lamp > 0.2);
    return b;
  }

  /** 등롱 위로 오르는 연기 두 알(PLAN 44절). 불과 같이 밤에만 보인다 —
   * `syncLamps` 가 이 애도 `userData.lamp` 로 함께 여닫는다.
   * **격자 키로 나눠 든다**(`U.smokeByKey()`) — 그래야 그 격자가 부서질 때
   * (`syncProps`·`refreshProps`) 함께 치워 창고가 걸을수록 늘어나지 않는다 */
  /* 여기서 어긋나면 **그 격자를 짓던 `buildProp` 통째로 멎는다**(같은 for 문
   * 안이라, 이 뒤에 올 나무·집도 안 선다) — 그래서 몸만 남기고 조용히 넘어간다 */
  function addLampSmoke(g, key, x, y, z) {
    try {
      var list = U.smokeByKey()[key] || (U.smokeByKey()[key] = []);
      var i;
      for (i = 0; i < 2; i++) {
        var s = box(g, 'sph', pmat(0xb9b9b9, 'smoke').clone(), x, y, z, 0.4, 0.4, 0.4, false);
        s.userData.lamp = true;
        s.userData.smoke = { x: x, baseY: y, z: z, ph: Math.random() * 6.28 + i * Math.PI };
        s.visible = !!(U.lightNow() && U.lightNow().lamp > 0.2);
        list.push(s);
      }
    } catch (err) {
      if (global.console) { console.error('[world3d] 연기 알갱이를 못 세웠다', err); }
    }
  }

  function buildProp(kind, gx, gy, mapped, key) {
    var g = new (U.T()).Group();
    var dens = DENSITY();
    if (kind === 'town') { U.townDens()[gx + ':' + gy] = dens; }
    var plan = propPlan(kind, gx, gy, mapped, dens);
    var ox = gx * GRID + GRID / 2, oz = gy * GRID + GRID / 2;
    var i;
    for (i = 0; i < plan.length; i++) {
      var p = plan[i];
      /* 잔 사물은 인스턴스 덩이가 받는다. 창고가 다 차면 false 가 와서
         아래의 옛 길(제 Mesh 를 만드는 길)로 그대로 흘러간다 */
      var inst = key && instProp(key, p, ox, oz);
      if (inst) {
        /* **불만은 인스턴스가 못 맡는다.** 등롱과 사당의 등은 밤에만 켜지는데
           (`syncLamps` 가 `userData.lamp` 를 훑는다) 인스턴스 덩이는 낱개를
           켜고 끌 수가 없다. 몸은 모델이 세웠으니 **불만 여기서 얹는다** */
        if (p.t === 'lamp') {
          addLampBulb(g, p.x, p.h + 0.25, p.z, 0.8);
          addLampSmoke(g, key, p.x, p.h + 0.7, p.z);
        } else if (p.t === 'shrine') {
          addLampBulb(g, -3.4, 2.8, 4.6, 0.7);
          addLampBulb(g, 3.4, 2.8, 4.6, 0.7);
          addLampSmoke(g, key, -3.4, 3.3, 4.6);
          addLampSmoke(g, key, 3.4, 3.3, 4.6);
        }
        continue;
      }
      if (p.t === 'house' || p.t === 'tower') {
        /* 벽은 밝고 지붕은 짙다 — 한옥이 그렇고, 그래야 지붕선이 보인다.
           둘 다 어두우면 멀리서 회색 덩어리 하나로 뭉친다 */
        var sh = 0.55 + p.shade * 0.42;
        var wall = pmat(((Math.round(sh * 250) << 16) |
                         (Math.round(sh * 244) << 8) |
                          Math.round(sh * 232)));
        var body = box(g, 'box', wall, p.x, p.h / 2, p.z, p.w, p.h, p.d, true);
        body.rotation.y = p.rot;
        body.receiveShadow = true;
        if (p.roof) {
          /* 기와지붕 — 이 판의 건물을 한옥으로 보이게 하는 것은 이 사각뿔 하나다 */
          var roof = box(g, 'cone4', pmat(0x4a5360, 'flat'),
            p.x, p.h + p.w * 0.22, p.z, p.w * 1.28, p.w * 0.55, p.d * 1.28, true);
          roof.rotation.y = p.rot + Math.PI / 4;
        } else {
          box(g, 'box', pmat(0x39404c), p.x, p.h + 0.3, p.z, p.w * 0.9, 0.6, p.d * 0.9, false)
            .rotation.y = p.rot;
        }
      } else if (p.t === 'tree') {
        /* 잎 색은 **계절이 정한다**(`season.js`) — 계절이 꺼져 있으면 예전 초록 */
        var SS = global.DG.season;
        var leafHex = SS ? SS.leaf(0x2f5a34) : 0x2f5a34;
        box(g, 'cyl', pmat(0x4a3a2a), p.x, p.h * 0.21, p.z, 1.2, p.h * 0.42, 1.2, true);
        box(g, 'cone', pmat(leafHex, 'sway'), p.x, p.h * 0.58, p.z, p.h * 0.68, p.h * 0.72, p.h * 0.68, true);
      } else if (p.t === 'rock') {
        var rk = box(g, 'sph', pmat(0x6b6a72, 'flat'), p.x, p.h * 0.32, p.z, p.h * 1.5, p.h * 0.9, p.h * 1.3, true);
        rk.rotation.set(0.3, p.x, 0.2);
      } else if (p.t === 'grass') {
        box(g, 'cone', pmat(0x5d7a44, 'sway'), p.x, p.h * 0.5, p.z, p.h * 1.5, p.h, p.h * 1.5, false);
      } else if (p.t === 'peak') {
        box(g, 'cone', pmat(0x4a4752, 'flat'), p.x, p.h / 2, p.z, GRID * 0.84, p.h, GRID * 0.84, true)
          .receiveShadow = true;
      } else if (p.t === 'water') {
        /* 네모난 수면은 **격자를 그대로 드러낸다** — 한 칸만 물인 자리에 파란 사각형이
           덩그러니 놓인다. 원반으로 깔면 홀로 있으면 못이 되고 이어지면 강이 된다.
           다만 **손으로 그린 강**(p.sq)은 이야기가 다르다 — 이어지라고 그은 물이라
           원반으로 깔면 가장자리가 부채꼴로 패어 강이 아니라 물웅덩이 줄로 보인다.
           그 자리는 격자를 꽉 채우는 네모로 깐다(눈으로 보고 알았다) */
        var wy = 0.12 + (p.rise ? 0.55 : 0);          // 불면 수면이 올라온다
        var wg = p.rise ? 1.06 : 1;
        var whex = p.rise ? 0x2a5f88 : 0x2f6f9e;       // 흙탕물은 더 어둡다
        /* 물가 쪽(마스크가 켜진 변)만 들쭉날쭉한 `shoreW<mask>`를 쓴다 — 강물끼리
           이어지는 변(꺼진 비트)은 안 깎여 있어 옆 칸과 자로 잰 듯 맞물린다.
           마스크가 통째로 0(사방이 물)이면 굳이 새 도형을 안 쓰고 옛 'plane'
           그대로 간다(캐시 낭비 없음, 화면도 똑같다) */
        var wGeo = p.sq ? ((p.shore | 0) ? ('shoreW' + (p.shore | 0)) : 'plane') : 'disc';
        var w = box(g, wGeo, pmat(whex, 'water'), 0, wy, 0, (p.sq ? (GRID + 0.5) : GRID * 0.62) * wg,
          (p.sq ? (GRID + 0.5) : GRID * 0.62) * wg, 1, false);
        w.rotation.x = -Math.PI / 2;
      } else if (p.t === 'field') {
        /* 논 한 뙈기 — 물 댄 낯을 얇게 깔고 두렁을 두른다. 지면보다 조금만 띄운다
           (많이 띄우면 논이 공중에 뜨고, 안 띄우면 지면과 다퉈 얼룩진다) */
        var fld = box(g, 'box', pmat(0x3f6b52), p.x, 0.09, p.z, p.w, 0.18, p.d, false);
        fld.rotation.y = p.rot;
        fld.receiveShadow = true;
        /* 두렁은 **테두리**다. 한 덩이로 덮으면 논이 그 밑에 깔려 흙판만 보인다
           (눈으로 보고 알았다) — 네 변만 두른다 */
        /* **이름을 `lox`·`loz` 로 둔 까닭** — 여기서 `ox`·`oz` 를 쓰면 `var` 가
           함수 범위라 이 함수 맨 위의 **격자 원점**(`ox`·`oz`)을 통째로 덮어쓴다.
           그러면 이 논 뒤에 오는 소품이 전부 원점 근처(9, 0)로 끌려가 사라진다 —
           벼가 안 서던 것이 이것이었다(2026-08-29에 잡았다) */
        var lw = 1.1, li;
        for (li = 0; li < 4; li++) {
          var ax = li < 2 ? p.w + lw : lw, az = li < 2 ? lw : p.d + lw;
          var lox = li === 0 ? 0 : (li === 1 ? 0 : (li === 2 ? -(p.w + lw) / 2 : (p.w + lw) / 2));
          var loz = li === 0 ? -(p.d + lw) / 2 : (li === 1 ? (p.d + lw) / 2 : 0);
          var lv = box(g, 'box', pmat(0x7a6f57), 0, 0.20, 0, ax, 0.22, az, false);
          lv.position.set(p.x + Math.cos(p.rot) * lox - Math.sin(p.rot) * loz, 0.20,
                          p.z + Math.sin(p.rot) * lox + Math.cos(p.rot) * loz);
          lv.rotation.y = p.rot;
        }
      } else if (p.t === 'scare') {
        /* 허수아비 — 장대 하나에 가로대와 삿갓. 논에 사람이 산다는 표다 */
        box(g, 'cyl', pmat(0x6b5a3f), p.x, p.h * 0.5, p.z, 0.16, p.h, 0.16, true);
        box(g, 'box', pmat(0x6b5a3f), p.x, p.h * 0.78, p.z, 1.6, 0.13, 0.13, false);
        box(g, 'cone', pmat(0xa8925f, 'flat'), p.x, p.h + 0.16, p.z, 1.1, 0.5, 1.1, false);
      } else if (p.t === 'bridge') {
        /* 다리 — 강을 **가로질러** 놓는다. 길이 남북이라 상판도 남북으로 길다.
           난간이 없으면 멀리서 물 위의 널빤지로만 보인다.
           **모델을 못 받았을 때만 여기 온다.** 계획은 일곱 칸으로 나뉘어 있으므로
           첫 칸(`seg` 0)에서만 옛 모습대로 48m 상판 하나를 세운다 */
        if (p.seg) { continue; }
        box(g, 'box', pmat(0x7a6a52), 0, 1.7, 0, 7, 0.5, GRID * 1.02, true).receiveShadow = true;
        var bi;
        for (bi = -1; bi <= 1; bi += 2) {
          box(g, 'box', pmat(0x8a7a60), bi * 3.3, 1.7 + 0.75, 0, 0.35, 1.0, GRID * 1.02, false);
        }
        for (bi = -1; bi <= 1; bi += 2) {          // 물속 교각
          box(g, 'cyl', pmat(0x5d5347), 0, 1.7 * 0.5, bi * GRID * 0.28, 1.5, 1.7 * 2, 1.5, false);
        }
      } else if (p.t === 'cave') {
        /* 굴 입구 — 바위 더미에 **검은 반원**을 박는다. 산 사면에 뚫린 구멍으로 보인다 */
        box(g, 'sph', pmat(0x5a5560, 'flat'), 0, p.h * 0.34, 0, p.h * 2.4, p.h * 1.5, p.h * 2.0, true);
        var mouth = box(g, 'disc', pmat(0x0d1014), 0, p.h * 0.34, p.h * 0.98, 2.6, 3.4, 1, false);
        mouth.rotation.set(0, 0, 0);
        box(g, 'box', pmat(0x6b6a72, 'flat'), -3.1, p.h * 0.25, p.h * 0.9, 0.9, p.h * 0.5, 0.9, false);
        box(g, 'box', pmat(0x6b6a72, 'flat'), 3.1, p.h * 0.25, p.h * 0.9, 0.9, p.h * 0.5, 0.9, false);
      } else if (p.t === 'ruin') {
        /* 폐허 — 주춧돌 위에 **부러진 기둥 넷**. 높이를 서로 다르게 해야 폐허로 보인다
           (같으면 짓다 만 집이다) */
        box(g, 'box', pmat(0x5f5a52, 'flat'), 0, 0.2, 0, 13, 0.4, 13, false).receiveShadow = true;
        var rp = [[-4.4, -4.4, 1.0], [4.4, -4.4, 0.55], [-4.4, 4.4, 0.75], [4.4, 4.4, 0.3]], ri;
        for (ri = 0; ri < rp.length; ri++) {
          box(g, 'cyl', pmat(0x8a8378, 'flat'),
            rp[ri][0], 0.4 + p.h * rp[ri][2] * 0.5, rp[ri][1], 1.1, p.h * rp[ri][2], 1.1, true);
        }
        box(g, 'box', pmat(0x7c766c, 'flat'), 1.2, 0.7, 0, 6, 0.7, 1.2, false).rotation.y = 0.4;
      } else if (p.t === 'shrine') {
        /* 옛 사당 — 작은 기와집 하나에 돌계단과 등롱 둘. 숲 속에서 이것만 사람 손이다 */
        box(g, 'box', pmat(0x6a6258, 'flat'), 0, 0.3, 0, 9, 0.6, 9, false).receiveShadow = true;
        box(g, 'box', pmat(0xb9a88c), 0, p.h * 0.42, 0, 5.4, p.h * 0.66, 5.0, true);
        box(g, 'cone4', pmat(0x4a5360, 'flat'), 0, p.h * 0.86, 0, 8.2, p.h * 0.42, 8.2, true)
          .rotation.y = Math.PI / 4;
        var si;
        for (si = -1; si <= 1; si += 2) {
          box(g, 'cyl', pmat(0x3f3a34), si * 3.4, 1.3, 4.6, 0.2, 2.6, 0.2, false);
          var sb = box(g, 'sph', pmat(0xffd489, 'glow'), si * 3.4, 2.8, 4.6, 0.7, 0.9, 0.7, false);
          sb.userData.lamp = true;
          sb.visible = !!(U.lightNow() && U.lightNow().lamp > 0.2);
        }
      } else if (p.t === 'waterfall') {
        /* 폭포(PLAN 44절) — 절벽에 물줄기 판 하나, 밑에 튄 물이 고인 못.
           흐르는 결은 안 준다(정지 화면) — 세운 판에 물결 셰이더를 억지로
           씌우느니 정지 화면이 낫다 */
        box(g, 'box', pmat(0x5a5560, 'flat'), 0, p.h * 0.5, -2.4, 13, p.h, 6, true)
          .receiveShadow = true;
        box(g, 'box', pmat(0x9fd0e8, 'fall'), 0, p.h * 0.46, 0.3, 4.6, p.h * 0.86, 0.6, false);
        box(g, 'box', pmat(0x6fa8c4, 'water'), 0, 0.15, 3.4, 8, 0.3, 6.5, false);
      } else if (p.t === 'reed') {
        box(g, 'cone', pmat(0x6d7f4a, 'sway'), p.x, p.h * 0.5, p.z, 0.5, p.h, 0.5, false);
      } else if (p.t === 'lamp') {
        box(g, 'cyl', pmat(0x3f3a34), p.x, p.h * 0.5, p.z, 0.24, p.h, 0.24, false);
        /* 등롱의 불은 **밤에만** 켠다 — 낮에 켜 두면 흰 점으로만 보인다 */
        var bulb = box(g, 'sph', pmat(0xffd489, 'glow'), p.x, p.h + 0.25, p.z, 0.8, 1.0, 0.8, false);
        bulb.userData.lamp = true;
        /* 지금이 밤인지 여기서 곧바로 정한다 — 나중에 걸어 들어온 격자는
           `syncLamps` 가 이미 훑고 지나간 뒤라 낮에도 켜진 채 남는다 */
        bulb.visible = !!(U.lightNow() && U.lightNow().lamp > 0.2);
      } else if (p.t === 'temple') {
        /* 옛 사원 — **GLB(`chengde_temple.glb`)를 못 받았을 때만** 여기 온다.
           2단 지붕집 하나로 "여느 사당보다 훨씬 크다"만 전한다 — 진짜 모양은
           GLB 몫이라 여기서 정교하게 흉내 내지 않는다 */
        box(g, 'box', pmat(0x6a6258, 'flat'), 0, 0.3, 0, 15, 0.6, 15, false).receiveShadow = true;
        box(g, 'box', pmat(0xb08a4a), 0, p.h * 0.28, 0, 10, p.h * 0.5, 9.4, true);
        box(g, 'cone4', pmat(0xc9a24a, 'flat'), 0, p.h * 0.58, 0, 12, p.h * 0.3, 12, true)
          .rotation.y = Math.PI / 4;
        box(g, 'box', pmat(0x8a5a34), 0, p.h * 0.76, 0, 6, p.h * 0.32, 5.6, true);
        box(g, 'cone4', pmat(0x9a2f2a, 'flat'), 0, p.h * 0.96, 0, 7.4, p.h * 0.22, 7.4, true)
          .rotation.y = Math.PI / 4;
      }
    }
    return g;
  }

  /* 사물 격자를 마지막으로 훑은 자리 — **격자를 넘어설 때만** 다시 훑는다.
     여태 매 프레임 11×11 칸을 다 재고 있었다. 한 걸음(8m/s)에 격자(48m)를 넘는 데
     6초가 걸리니, 그 사이 360번쯤은 같은 답을 다시 낸 셈이다 */

  function syncProps(W) {
    var pos = core.save.player.pos;
    var R = PROP_R(), ZM = +core.tuned('go.zoneM', 576), ZB = ZM > 0 && +core.tuned('go.zoneBuild', 1) === 1 && !!global.DG.zoneCut, zx = ZB ? (global.DG.goZoneIdx ? global.DG.goZoneIdx(pos, 0, ZM) : Math.floor(pos.x / ZM + 0.5)) - 0.5 : 0, zy = ZB ? (global.DG.goZoneIdx ? global.DG.goZoneIdx(pos, 1, ZM) : Math.floor(pos.y / ZM + 0.5)) - 0.5 : 0, ZP = ZB ? 96 : 0;   /* W-0414 ② 구역(ZM m 정사각) 통째로 — 들 때 한 번 세우고(넘김 막 아래) 구역 안에선 다시 안 훑는다 · ZP 가장자리 여유 */
    /* 지도가 깔렸는지 — 깔린 자리와 안 깔린 자리(오프라인·타일 실패)에서
       세우는 것이 다르다. 캐시 키에도 넣어야 상태가 바뀔 때 다시 세운다 */
    var mapped = !!(W.tilesUsable && W.tilesUsable());
    var RG3 = global.DG.land;
    var wkNow = weatherKey();
    var wetNow = WET() && (wkNow === 'rain' || wkNow === 'snow');
    var seasonKey = global.DG.season ? global.DG.season.now().key : '-';
    /* **훑을 까닭이 있을 때만 훑는다.** 격자를 넘었거나 · 지도가 붙거나 떨어졌거나 ·
       비가 오거나 그쳤거나 · 품질이 바뀌었을 때. 그 밖에는 답이 지난 프레임과 같다 */
    var cell = (ZB ? 'Z' + zx + ':' + zy : Math.floor(pos.x / GRID) + ':' + Math.floor(pos.y / GRID)) +
      ':' + Math.round(R) + ':' + (MESH_ON() ? 1 : 0) + ':' + Math.round(DENSITY() * 100) +
      ':' + (mapped ? 'm' : 'n') + ':' + (wetNow ? 'w' : 'd') +
      ':' + (RG3 && RG3.on() ? 'L' : '-') +
      ':' + seasonKey;
    if (U.propScan() === cell) { return; }
    setPropScan(cell);
    var g0x = ZB ? Math.floor((zx * ZM - ZP) / GRID) : Math.floor((pos.x - R) / GRID), g1x = ZB ? Math.floor(((zx + 1) * ZM + ZP) / GRID) : Math.floor((pos.x + R) / GRID);
    var g0y = ZB ? Math.floor((zy * ZM - ZP) / GRID) : Math.floor((pos.y - R) / GRID), g1y = ZB ? Math.floor(((zy + 1) * ZM + ZP) / GRID) : Math.floor((pos.y + R) / GRID);
    var live = {};
    for (var gy = g0y; gy <= g1y; gy++) {
      for (var gx = g0x; gx <= g1x; gx++) {
        var kind = W.terrainAt(gx, gy);
        /* 손으로 그린 땅이 못박아 둔 것은 **찾아가는 표적**이다 — 멀다고 빼면
           폐허가 코앞에서야 솟는다. 표식이 있는 격자는 잔 사물 규칙에서 뺀다 */
        var mk = RG3 ? RG3.markAt(gx, gy) : null;
        if (!mk && global.DG.landform && global.DG.landform.markAt) { mk = global.DG.landform.markAt(gx, gy) ? 'lf' : null; }   // ⑰ 다리·폭포도 표적
        var tileDist = Math.hypot((gx + 0.5) * GRID - pos.x, (gy + 0.5) * GRID - pos.y);
        /* 풀·길의 잔 사물은 가까울 때만 세운다 — 반경 전체에 깔면 격자 백 개가
           한꺼번에 늘어나고, 멀리서는 어차피 한 픽셀이다 */
        var far = !ZB && tileDist > R * 0.5;   // 구역 통째면 잔 사물도 다 — 걸으며 솟지 않게
        if (far && !mk && (kind === 'grass' || kind === 'road') &&
            !(RG3 && RG3.hasDeco && RG3.hasDeco(gx, gy))) { continue; }
        /* LOD(36절) 대(帶) — 이 칸이 나무·바위·풀을 세우는 종류(town 은 집·탑뿐이라
           뺀다)라면 문턱(LOD_NEAR) 안쪽인지를 키에 넣는다. 문턱을 건너면 칸이
           다시 지어지고, 그 안에서 `instProp` 이 진짜 모델과 도형을 맞바꾼다.
           안 넣으면 가까이 가도 이미 지은 칸은 도형인 채로 남는다(칸이 안
           다시 지어지므로) */
        var lodBand = kind !== 'town' ? (ZB || tileDist <= LOD_NEAR() ? 'n' : 'f') : '-';
        /* 이 땅을 켜고 끄면 같은 격자가 다른 땅이 된다 — 캐시 키에 넣어야 다시 세운다 */
        /* 젖음도 키에 넣는다 — 안 넣으면 비가 그쳐도 강이 분 채로 남는다.
           **계절도 마찬가지다** — 안 넣으면 가을이 됐는데 나무 몇 그루가 초록으로
           남는다(눈으로 보고 알았다). 훑는 조건에만 넣으면 다시 훑기는 하는데
           이미 세워 둔 격자를 그대로 되쓴다 */
        var key = kind + ':' + gx + ':' + gy + ':' + (mapped ? 'm' : 'n') +
          (mk ? ':' + mk : '') + (wetNow ? ':w' : '') + ':' + seasonKey + ':' + lodBand;
        live[key] = 1;
        if (U.propMeshes()[key]) { continue; }
        var node = buildProp(kind, gx, gy, mapped, key);
        /* 격자 한가운데의 땅 높이에 앉힌다. 이 노드 안의 조각들은 제 자리
           (`p.x`·`p.z`)만큼 옆으로 벌어져 있어 그만큼은 어긋나지만, 격자가
           48m 라 한 칸 안에서는 땅이 거의 평평하다 — 눈에 안 띈다 */
        var pcx = gx * GRID + GRID / 2, pcz = gy * GRID + GRID / 2;
        node.position.set(pcx, groundY(pcx, pcz), pcz);
        U.propGroup().add(node);
        U.propMeshes()[key] = node;
      }
    }
    /* 부수는 반경은 짓는 반경(R)보다 크다(PLAN 42절) — 경계에서 한 걸음
       왕복해도 짓고 부수고를 되풀이하지 않는다 */
    var UR = PROP_UR(R);
    for (var k in U.propMeshes()) {
      if (!Object.prototype.hasOwnProperty.call(U.propMeshes(), k) || live[k]) { continue; }
      /* 이번에 훑은 격자 범위(g0x~g1x, g0y~g1y) **안**인데도 살아 있지 않다면
         — 같은 자리의 내용(계절·젖음·지도 여부 등)이 바뀐 것이니 미룰 것 없이
         바로 갈아 짓는다. UR 히스테리시스는 **범위 밖으로 걸어 나간 것**에만
         쓴다 — 안 그러면 계절이 바뀌어도 헌 사물이 새 것과 겹친 채 남는다 */
      var kp = k.split(':');
      var kgx = +kp[1], kgy = +kp[2];
      if (!(kgx >= g0x && kgx <= g1x && kgy >= g0y && kgy <= g1y)) {
        var leftNode = U.propMeshes()[k];
        var d = Math.hypot(leftNode.position.x - pos.x, leftNode.position.z - pos.y);
        if (d <= UR && !ZB) { continue; }      // 아직 부수는 반경 안 — 그대로 둔다(구역 통째면 옛 구역은 막 아래서 곧장 뺀다)
      }
      /* 도형·재질은 **모두가 나눠 쓰는 것**이라 여기서 dispose 하지 않는다.
         하나를 버리면 남아 있는 다른 건물의 도형까지 같이 사라진다 */
      U.propGroup().remove(U.propMeshes()[k]);
      delete U.propMeshes()[k];
      if (kp[0] === 'town') { delete U.townDens()[kp[1] + ':' + kp[2]]; }
      delete U.smokeByKey()[k];           // 이 격자의 연기도 창고에서 함께 뺀다
      instDrop(k);                    // 빌려 준 인스턴스 자리도 돌려받는다
    }
  }

  /** 등롱은 밤에만 켠다 (낮에는 재질을 갈지 않고 눈에 안 띄게 꺼 둔다) */
  function syncLamps() {
    var on = U.lightNow() ? U.lightNow().lamp > 0.2 : false;
    if (syncLamps.was === on) { return; }
    syncLamps.was = on;
    U.propGroup().traverse(function (o) {
      if (o.userData && o.userData.lamp) { o.visible = on; }
    });
  }

  /** 잎·풀 흔들림 시계를 굴린다(PLAN 44절) — 꺼져 있으면 마지막 자세로 멎는다.
   * 이 축도 실기기로 못 본 채 나갔던 것이라, `syncFlame`·`syncSmoke`와 같은
   * 이유로 어긋나면 스스로 꺼진다 */
  var swayBroken = false;
  function syncSway(dt) {
    if (!SWAY_ON() || !swayShaders.length || swayBroken) { return; }
    try {
      setSwayClock(U.swayClock() + dt);
      var amt = SWAY_AMT(), i, PR = global.DG.press3d; if (PR && pressVec.length) { for (i = 0; i < 8; i++) { pressVec[i].set(PR.arr[i * 4], PR.arr[i * 4 + 1], PR.arr[i * 4 + 2], i < PR.n ? PR.arr[i * 4 + 3] : 0); } }   // 풀 눕힘 자리(W-0310 ③)
      for (i = 0; i < swayShaders.length; i++) {
        swayShaders[i].uniforms.uSwTime.value = U.swayClock();
        swayShaders[i].uniforms.uSwAmt.value = amt;
      }
    } catch (err) {
      swayBroken = true;
      if (global.console) { console.error('[world3d] 잎·풀 흔들림에서 멎어 껐다', err); }
    }
  }

  /** 등롱·사당 불이 일렁인다(PLAN 44절 "불꽃") — 재질을 **모두가 나눠 쓰므로**
   * 한 번만 써도 뜬 등롱 전부가 같이 일렁인다(값싸다).
   * **한 번이라도 어긋나면 스스로 꺼진다** — 이 축은 아직 실기기로 못 본
   * 새 코드라, 여기서 예외가 나 렌더 루프 전체(`world3d.render`)를 끊으면
   * 이동·전투 무대까지 통째로 멎는다(그 아래 줄들이 아예 안 불린다). 장식
   * 하나가 게임 전체를 죽이는 것보다 그 장식만 조용히 빠지는 쪽이 낫다 */
  var flameClock = 0, smokeClock = 0, flameBroken = false, smokeBroken = false;
  function syncFlame(dt) {
    if (!FLAME_ON() || flameBroken) { return; }
    try {
      flameClock += dt;
      var m = pmat(0xffd489, 'glow');
      m.emissiveIntensity = 0.9 + FLAME_AMT() *
        (Math.sin(flameClock * 9.1) * 0.7 + Math.sin(flameClock * 23.7) * 0.3);
    } catch (err) {
      flameBroken = true;
      if (global.console) { console.error('[world3d] 불꽃 일렁임에서 멎어 껐다', err); }
    }
  }

  /** 연기 알갱이를 한 프레임 굴린다(PLAN 44절) — 위로 오르다 다 오르면
   * 다시 밑에서 시작한다(비 알갱이가 상자를 벗어나면 되돌리는 것과 같은 손).
   * **재질을 낱개로 복제해 뒀으니**(`addLampSmoke`) 알갱이마다 다른 짙기로
   * 옅어질 수 있다. 창고가 안 뜬 낮에는 굳이 돌리지 않는다. `syncFlame` 과
   * 같은 이유로 어긋나면 스스로 꺼진다 */
  function syncSmoke(dt) {
    if (!SMOKE_ON() || smokeBroken || !(U.lightNow() && U.lightNow().lamp > 0.2)) { return; }
    try {
      smokeClock += dt;
      var RISE = 0.4, MAXH = 2.4, k;
      for (k in U.smokeByKey()) {
        if (!Object.prototype.hasOwnProperty.call(U.smokeByKey(), k)) { continue; }
        var list = U.smokeByKey()[k], i;
        for (i = 0; i < list.length; i++) {
          var s = list[i], d = s.userData.smoke;
          var t = (smokeClock * RISE + d.ph) % MAXH;
          var frac = t / MAXH;
          s.position.set(d.x + Math.sin(smokeClock * 0.6 + d.ph) * 0.15, d.baseY + t, d.z);
          var sc = 0.35 + frac * 0.55;
          s.scale.set(sc, sc, sc);
          s.material.opacity = 0.34 * (1 - frac);
        }
      }
    } catch (err) {
      smokeBroken = true;
      if (global.console) { console.error('[world3d] 연기에서 멎어 껐다', err); }
    }
  }


  return { addLampBulb: addLampBulb, addLampSmoke: addLampSmoke, buildProp: buildProp, syncProps: syncProps, syncLamps: syncLamps, syncSway: syncSway, syncFlame: syncFlame, syncSmoke: syncSmoke };
  } };
})(window);
