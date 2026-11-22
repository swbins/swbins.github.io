/**
 * 1만리 3D 소품 모양 도우미 — 마을 칸의 집 벽 사각형(houseRects)·단위 도형(unitGeo)·물가 평면(shoreGeo)·재질 창고(pmat)·상자 하나(box). world3d.js 에서 떼어 냄(R-4 11-17).
 * 몸통은 글자 그대로(바뀌는 이름 T, townDens 만 U.이름() — 부를 때마다). 바깥 이름은 U 로 받는다(같은 객체·함수). 원래 파일은 같은 이름 한 줄 넘김(처음 부를 때 make).
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.world3dGeo = { make: function (U) {
  var core = global.DG.core;
  var GRID = U.GRID, h1 = U.h1, propEra = U.propEra, propPlan = U.propPlan, swayify = U.swayify;

  var FOOT_IN = 0.82;       // 모델 바닥 가운데 벽이 서는 몫(처마·지붕 끝 빼고)
  function houseRects(gx, gy) {
    /* 해시로 벽이 되는 소품(집·탑·우물·장터)을 세우는 건 마을 칸뿐이다. 다른 칸은
       손으로 놓은 것(`land.js` deco)만 — 여태는 칸 종류를 안 보고 늘 마을 계획을
       뽑아서, 들판에서도 교전 상대가 **안 보이는 집**을 피해 밀려났고(`duelSpotBlocked`),
       `world.js` 는 마을 칸만 재서 들판에 놓은 deco 집은 뚫고 지나갔다(2026-09-23) */
    var Wd = global.DG.world, RG = global.DG.land;
    var kind = Wd && Wd.terrainAt ? Wd.terrainAt(gx, gy) : 'town';
    /* 2026-09-28 실기 Q3 "몇 집이 벽에서 사라진다" — 기기가 버거우면 perf 가 밀도(PF prop)를 내리는데, 이미 지은 칸은
       다시 안 지어(칸 열쇠에 밀도가 없다) 옛 집이 그대로 보이고 벽만 새 밀도로 집 수·대지가 바뀌었다 → 지은 밀도로 뽑는다 */
    var plan = kind === 'town' ? propPlan('town', gx, gy, false, U.townDens()[gx + ':' + gy])
      : (RG && RG.decoAt ? RG.decoAt(gx, gy) : []);
    var ox = gx * GRID + GRID / 2, oz = gy * GRID + GRID / 2;
    var out = [], i;
    for (i = 0; i < plan.length; i++) {
      var p = plan[i];
      if (p.t === 'house' || p.t === 'tower') {
        var P3h = global.DG.prop3d, hm = P3h && P3h.heightMul ? P3h.heightMul(p.t) : 1, hh = (p.h || 6) * hm;
        /* 2026-09-27 실기 "집을 통과하네 아직도" — 헤드리스로 재 보니 둘이 어긋났다.
           ① 크기: GLB 는 키(hh)로 고르게 늘여 그려 바닥이 p.w·p.d 보다 1.4~2.2배 넓다 → 그 자리 모델의 바닥(prop3d.footprint)
              × hh × FOOT_IN(처마·지붕 끝은 밑으로 걸어 다닌다). 모델이 아직 안 왔으면 옛 p.w·p.d
           ② 돌림: 모델은 rotation.y = rot 로 서는데 벽 사각형 식(lx = dx·cos + dz·sin)은 반대 방향으로 돈다 → -rot */
        var fp = P3h && P3h.footprint && P3h.houseOn && P3h.houseOn() ? P3h.footprint(p.t, gx + Math.round(p.x), gy + Math.round(p.z), undefined, propEra(p.t, ox + p.x, oz + p.z)) : null;
        var fw = fp ? Math.max(p.w, fp.w * hh * FOOT_IN) : p.w, fd = fp ? Math.max(p.d, fp.d * hh * FOOT_IN) : p.d;
        out.push({ x: ox + p.x, z: oz + p.z, w: fw, d: fd, rot: -(p.rot || 0), h: hh });
      } else if (p.t === 'well') {
        out.push({ x: ox + p.x, z: oz + p.z, w: p.h * 1.6, d: p.h * 1.6, rot: 0 });
      } else if (p.t === 'market') {
        out.push({ x: ox + p.x, z: oz + p.z, w: p.h * 2.8, d: p.h * 1.8, rot: p.rot || 0 });
      }
    }
    var FRh = global.DG.frost;                                   // §5 ⑲-27 서리봉 고원 명소 벽(산성 담·관측소·비행선…)
    if (FRh && FRh.rectsIn) { var frr = FRh.rectsIn(gx, gy); for (i = 0; i < frr.length; i++) { out.push(frr[i]); } }
    var SPh = global.DG.skyport;                                 // §5 ⑲-37 은하 나루 명소 벽(계류 탑·객차·틈 문…)
    if (SPh && SPh.rectsIn) { var spr = SPh.rectsIn(gx, gy); for (i = 0; i < spr.length; i++) { out.push(spr[i]); } }
    var AMh = global.DG.amber;                                   // §5 ⑲-57 굳은 거리 명소 벽(결정 막·굳은 자리·시계방·장터 돔·부양탑 심…)
    if (AMh && AMh.rectsIn) { var amr = AMh.rectsIn(gx, gy); for (i = 0; i < amr.length; i++) { out.push(amr[i]); } }
    var VTh = global.DG.vault;                                   // §5 ⑲-61 갈무리 벌 명소 벽(빛 울타리·금고 둥근 벽·동력 기둥·곳간·창고·컨테이너…)
    if (VTh && VTh.rectsIn) { var vtr = VTh.rectsIn(gx, gy); for (i = 0; i < vtr.length; i++) { out.push(vtr[i]); } }
    var FKh = global.DG.fork;                                    // §5 ⑲-65 세갈래 고을 명소 벽(호박 장막·문루·성벽·대장간·기관차·종루·격자 말뚝…)
    if (FKh && FKh.rectsIn) { var fkr = FKh.rectsIn(gx, gy); for (i = 0; i < fkr.length; i++) { out.push(fkr[i]); } }
    var CRh = global.DG.crossing;                                // §5 ⑲-41 틈새 갈림길 명소 벽(시계탑·성문 기둥·틈 문…)
    if (CRh && CRh.rectsIn) { var crr = CRh.rectsIn(gx, gy); for (i = 0; i < crr.length; i++) { out.push(crr[i]); } }
    var SKh = global.DG.sunken;                                  // §5 ⑲-44 잠긴 도읍 명소 벽(정전·돔 둘레·등대·해무 문…)
    if (SKh && SKh.rectsIn) { var skr = SKh.rectsIn(gx, gy); for (i = 0; i < skr.length; i++) { out.push(skr[i]); } }
    var ESh = global.DG.eraSites;                                // §5 ⑲-34 3부 시대 명소 벽(조선소 창고·기중기 다리)
    if (ESh && ESh.rectsIn) { var err = ESh.rectsIn(gx, gy); for (i = 0; i < err.length; i++) { out.push(err[i]); } }
    return out;
  }

  /* 사물의 도형은 **단위 하나씩만** 만들어 배율로 늘린다.
     크기마다 새 도형을 만들면 격자를 지날 때마다 GPU 메모리가 늘어난다. */
  var unit = {};
  function unitGeo(name) {
    if (unit[name]) { return unit[name]; }
    var g;
    if (name === 'box') { g = new (U.T()).BoxGeometry(1, 1, 1); }
    else if (name === 'cyl') { g = new (U.T()).CylinderGeometry(0.5, 0.5, 1, 8); }
    else if (name === 'cone4') { g = new (U.T()).ConeGeometry(0.72, 1, 4); }
    else if (name === 'cone') { g = new (U.T()).ConeGeometry(0.5, 1, 7); }
    else if (name === 'sph') { g = new (U.T()).SphereGeometry(0.5, 8, 6); }
    else if (name === 'plane') { g = new (U.T()).PlaneGeometry(1, 1); }
    else if (name === 'disc') { g = new (U.T()).CircleGeometry(1, 20); }   // W-0140 원반 물은 거품을 안 단다 — 원반끼리 겹쳐 놓여 테두리가 물 한가운데 고리로 떴다(촬영으로 확인)
    else if (name.indexOf('shoreW') === 0) { g = shoreGeo(+name.slice(6)); }
    unit[name] = g;
    return g;
  }
  /** 물가 전용 평면(PLAN 부록, "물가 경계도 자연스럽게", 2026-09-07) — 단위
   *  사각형(-0.5~0.5)을 잘게 나누고, `mask`(1=동·2=서·4=북·8=남, `rotation.x=
   *  -90°` 뒤집기를 손으로 풀어 확인한 값)에 켜진 변의 바깥 테두리 정점만
   *  안쪽으로 들쭉날쭉 밀어 넣는다. **꺼진 변(강물끼리 이어지는 자리)은 손
   *  안 댄다** — 옆 칸의 같은 변도 똑같이 안 밀리므로 두 칸이 자로 잰 듯
   *  맞물린다(따로 자리를 맞출 필요가 없다). 마스크당 하나씩만 지어 `unit`에
   *  얹으므로(최대 16장) `box()`의 배율·자리로 그대로 쓸 수 있고, 다른 도형과
   *  같은 값이라 뒤에서 따로 dispose 할 것이 없다(1226행 "도형·재질은 모두가
   *  나눠 쓰는 것" 원칙 그대로). */
  function shoreGeo(mask) {
    var SEG = 10, EAST = 1, WEST = 2, NORTH = 4, SOUTH = 8;
    var g = new (U.T()).PlaneGeometry(1, 1, SEG, SEG);
    var pos = g.getAttribute('position');
    var AMP_MIN = 0.07, AMP_RANGE = 0.10, foamA = new Float32Array(pos.count);   // W-0140 foamA — 물가 변에서 0.25 안쪽까지 1→0
    for (var i = 0; i < pos.count; i++) {
      var lx = pos.getX(i), ly = pos.getY(i), nx = lx, ny = ly;
      if ((mask & EAST) && Math.abs(lx - 0.5) < 1e-6) {
        nx = 0.5 - (AMP_MIN + h1(i * 7 + 3, mask * 11 + 1) * AMP_RANGE);
      }
      if ((mask & WEST) && Math.abs(lx + 0.5) < 1e-6) {
        nx = -0.5 + (AMP_MIN + h1(i * 5 + 9, mask * 13 + 2) * AMP_RANGE);
      }
      if ((mask & NORTH) && Math.abs(ly - 0.5) < 1e-6) {
        ny = 0.5 - (AMP_MIN + h1(i * 3 + 17, mask * 17 + 3) * AMP_RANGE);
      }
      if ((mask & SOUTH) && Math.abs(ly + 0.5) < 1e-6) {
        ny = -0.5 + (AMP_MIN + h1(i * 11 + 23, mask * 19 + 4) * AMP_RANGE);
      }
      if (nx !== lx || ny !== ly) { pos.setXY(i, nx, ny); } foamA[i] = Math.max(0, (mask & EAST) ? 1 - (0.5 - lx) / 0.25 : 0, (mask & WEST) ? 1 - (lx + 0.5) / 0.25 : 0, (mask & NORTH) ? 1 - (0.5 - ly) / 0.25 : 0, (mask & SOUTH) ? 1 - (ly + 0.5) / 0.25 : 0);
    }
    pos.needsUpdate = true; g.setAttribute('foam', new (U.T()).BufferAttribute(foamA, 1));
    g.computeVertexNormals();
    return g;
  }
  var propMat = {};
  function pmat(hex, opt) {
    var key = hex + '|' + (opt || '');
    if (propMat[key]) { return propMat[key]; }
    var m = new (U.T()).MeshLambertMaterial({ color: new (U.T()).Color(hex), flatShading: opt === 'flat' });
    /* 수면은 **깊이를 안 적는다** — 적으면 물속에 있는 것(잉어)을 통째로 가린다.
       반투명이라 비쳐 보여야 맞는데, 깊이 버퍼가 먼저 잘라내 아무것도 안 남았다 */
    if (opt === 'water') {
      /* 물결치는 수면이 있으면 그것을 쓴다(`water3d.js`). 없거나 등급이 LOW 면
         null 이 와서 **여태 쓰던 판 한 장**으로 간다 — 그림만 어제로 돌아간다 */
      var wm = global.DG.water3d ? global.DG.water3d.material(U.T(), hex) : null;
      if (wm) { propMat[key] = wm; return wm; }
      m.transparent = true; m.opacity = 0.72; m.depthWrite = false;
    }
    if (opt === 'glow') { m.emissive = new (U.T()).Color(hex); m.emissiveIntensity = 0.9; }
    if (opt === 'sway') { swayify(m); }
    /* 연기는 **낱개가 저마다 다른 짙기로 사라졌다 다시 짙어진다** — 재질을
       나눠 쓰면 한 알의 짙기가 바뀔 때 다른 알까지 같이 바뀐다. 그래서
       여기서는 원판만 캐시해 두고, 부르는 쪽(`addLampSmoke`)이 매번 복제해
       쓴다(연기 알갱이 수가 적어 복제 비용이 무시할 만하다) */
    if (opt === 'smoke') { m.transparent = true; m.opacity = 0.32; m.depthWrite = false; }
    /* 폭포 물줄기 — 'water' 와 달리 **세워 놓는 판**이라 water3d 의 수평 수면
       셰이더를 그대로 못 쓴다(그쪽은 위에서 내려다보는 잔물결이 전제다).
       옅은 하늘색 반투명 판 하나로 그친다(PLAN 44절) */
    if (opt === 'fall') { m.transparent = true; m.opacity = 0.5; m.depthWrite = false; }
    propMat[key] = m;
    return m;
  }
  function box(g, geoName, mtl, x, y, z, sx, sy, sz, cast) {
    var m = new (U.T()).Mesh(unitGeo(geoName), mtl);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    if (cast) { m.castShadow = true; }
    g.add(m);
    return m;
  }


  return { houseRects: houseRects, unitGeo: unitGeo, shoreGeo: shoreGeo, pmat: pmat, box: box };
  } };
})(window);
