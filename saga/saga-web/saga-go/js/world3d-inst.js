/**
 * 1만리 3D 인스턴싱(PLAN 16절) — 같은 모양 소품을 InstancedMesh 한 벌로 묶기·자리 넣고 빼기·절두체 컬링·통계·소품 한 채를 인스턴스로. world3d.js 에서 떼어 냄(R-4 11-17).
 * 몸통은 글자 그대로(바뀌는 이름 T, camera, propGroup, renderer, scene, sun 만 U.이름() — 부를 때마다). 바깥 이름은 U 로 받는다(같은 객체·함수). 원래 파일은 같은 이름 한 줄 넘김(처음 부를 때 make).
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.world3dInst = { make: function (U) {
  var core = global.DG.core;
  var GRID = U.GRID, LOD_NEAR = U.LOD_NEAR, cullStat = U.cullStat, groundY = U.groundY, h1 = U.h1, instKinds = U.instKinds, pmat = U.pmat, unitGeo = U.unitGeo;

  /* ── 인스턴싱 (PLAN 16절) ───────────────────────────────
   * 잔 사물은 **같은 도형에 같은 색**이다 — 나무 백 그루가 저마다 자기 Mesh 를
   * 들고 있을 까닭이 없다. 종류마다 `InstancedMesh` 한 덩이를 두고 **자리(slot)만
   * 빌려 준다.** 격자가 사라지면 자리를 돌려받는다.
   *
   * **집·탑·다리는 안 묶는다.** 크기와 색이 제각각이라 한 덩이로 못 모으고,
   * 수도 적어 이득이 없다. 16절이 지목한 것도 "나무·돌·풀·꽃" 이다.
   *
   * 잎 색은 계절이 바꾸므로 **색이 이름의 일부**다 — 가을이 되면 새 덩이가 하나
   * 생기고 옛 덩이는 빈 채로 남는다(넷뿐이라 그냥 둔다).
   */
  function INST_ON() { return core.tuned('world3d.instanced', 1) ? true : false; }
  function INST_CAP() { return core.tuned('world3d.instCap', 1600); }
  /* GLB 조각은 도형이 무거워 창고를 작게 잡는다 — 모양이 여럿이라 나눠 쓴다 */
  function GLB_CAP() { return core.tuned('world3d.glbCap', 260); }

  var instOf = {};         // 격자 키 → [{name, slot}]

  function instBox(name, geoName, hex, opt, cast) {
    return instMake(name, unitGeo(geoName), pmat(hex, opt), cast);
  }

  /** 도형과 재질을 받아 덩이 하나를 만든다 (도형은 `unitGeo` 든 GLB 조각이든 같다) */
  function instMake(name, geo, mtl, cast, cap) {
    if (instKinds[name]) { return instKinds[name]; }
    cap = cap || INST_CAP();
    var m = new (U.T()).InstancedMesh(geo, mtl, cap);
    m.name = 'inst:' + name;                // §6.1-B ① 재기(triBreakdown)가 이름으로 가려 본다
    m.instanceMatrix.setUsage(U.T().DynamicDrawUsage);
    m.castShadow = !!cast;
    m.receiveShadow = false;
    m.frustumCulled = false;          // 자리가 온 세상에 흩어져 있어 상자로 못 자른다 → instCull 이 자리마다 자른다
    var free = [], i;
    for (i = cap - 1; i >= 0; i--) { free.push(i); }
    /* **보이는 것만 그린다.** 자리(slot)의 행렬은 `mat` 에 따로 적어 두고, 매 프레임
       `instCull` 이 카메라·그림자 상자에 걸린 자리만 `instanceMatrix` 앞쪽에 채워
       `count` 를 그 수로 둔다. 전에는 "가장 높이 쓴 자리 + 1" 까지 다 그려서, 격자가
       사라져 크기 0 으로 숨긴 빈 자리와 등 뒤 소품까지 그렸다 — 폰 점검(2026-09-25)
       에서 삼각형 743만 중 살아 있는 것 258만, 시야 안 7만이었다(수풀 한 포기 2.7만) */
    if (!geo.boundingSphere) { geo.computeBoundingSphere(); }
    var bs = geo.boundingSphere;
    m.count = 0;
    U.propGroup().add(m);
    instKinds[name] = {
      mesh: m, free: free, n: 0, hi: 0,
      mat: new Float32Array(cap * 16),   // 자리마다 행렬
      live: new Uint8Array(cap),         // 자리가 차 있나
      sph: new Float32Array(cap * 4),    // 자리마다 월드 구(중심 xyz·반지름)
      c0: bs.center.clone(), r0: bs.radius, dirty: true
    };
    return instKinds[name];
  }

  var _p = null, _q = null, _s = null, _m4 = null;
  /** 자리 하나를 빌린다 — 창고가 다 차면 false 를 주고, 부르는 쪽이 옛 길로 간다 */
  function instPut(key, name, geoName, hex, opt, cast, x, y, z, sx, sy, sz, rx, ry, rz) {
    return instAt(instBox(name, geoName, hex, opt, cast), key, name,
                  x, y, z, sx, sy, sz, rx, ry, rz);
  }

  /** 덩이 하나에 자리를 하나 적는다 */
  function instAt(K, key, name, x, y, z, sx, sy, sz, rx, ry, rz) {
    if (!K.free.length) { return false; }
    var slot = K.free.pop();
    if (!_p) { _p = new (U.T()).Vector3(); _q = new (U.T()).Quaternion(); _s = new (U.T()).Vector3(); _m4 = new (U.T()).Matrix4(); }
    _p.set(x, y, z);
    _q.setFromEuler(new (U.T()).Euler(rx || 0, ry || 0, rz || 0));
    _s.set(sx, sy, sz);
    _m4.compose(_p, _q, _s);
    _m4.toArray(K.mat, slot * 16);
    K.live[slot] = 1;
    _p.copy(K.c0).applyMatrix4(_m4);
    K.sph[slot * 4] = _p.x; K.sph[slot * 4 + 1] = _p.y; K.sph[slot * 4 + 2] = _p.z;
    K.sph[slot * 4 + 3] = K.r0 * Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz));
    K.dirty = true;
    if (slot + 1 > K.hi) { K.hi = slot + 1; }
    K.n++;
    if (!instOf[key]) { instOf[key] = []; }
    instOf[key].push({ name: name, slot: slot });
    return true;
  }

  /** 이 격자가 빌린 자리를 다 돌려받는다 */
  function instDrop(key) {
    var list = instOf[key];
    if (!list) { return 0; }
    for (var i = 0; i < list.length; i++) {
      var K = instKinds[list[i].name];
      if (!K) { continue; }
      K.live[list[i].slot] = 0;
      K.dirty = true;
      K.free.push(list[i].slot);
      K.n--;
    }
    delete instOf[key];
    return list.length;
  }

  /**
   * 자리마다 자른다 — 카메라 시야(안개 끝 너머는 안개 색뿐이라 뺀다) 또는
   * 그림자 상자에 걸린 자리만 `instanceMatrix` 앞쪽에 채운다. 화질은 그대로다:
   * 빼는 것은 **화면에도 그림자에도 안 닿는 것**뿐이다. 그림자 상자는 해를 따라
   * 움직이므로 렌더러가 할 계산(`shadow.updateMatrices`)을 한 번 먼저 한다.
   * 카메라·해가 그대로고 자리도 안 바뀌었으면 아무것도 안 올린다(가만히 서 있을 때).
   */
  var cullCam = null, cullSun = null, cullPV = null, cullSV = null, cullLastPV = null, cullLastSV = null;
  function inFr(fr, x, y, z, r) {
    var pl = fr.planes;
    for (var i = 0; i < 6; i++) {
      var n = pl[i].normal;
      if (n.x * x + n.y * y + n.z * z + pl[i].constant < -r) { return false; }
    }
    return true;
  }
  function instCull() {
    if (!U.camera() || !U.propGroup()) { return; }
    if (!cullCam) {
      cullCam = new (U.T()).Frustum(); cullSun = new (U.T()).Frustum();
      cullPV = new (U.T()).Matrix4(); cullSV = new (U.T()).Matrix4();
      cullLastPV = new (U.T()).Matrix4(); cullLastSV = new (U.T()).Matrix4();
    }
    U.camera().updateMatrixWorld();
    cullPV.multiplyMatrices(U.camera().projectionMatrix, U.camera().matrixWorldInverse);
    cullCam.setFromProjectionMatrix(cullPV);
    var shadowOn = !!(U.renderer().shadowMap.enabled && U.sun() && U.sun().castShadow);
    if (shadowOn) {
      U.sun().updateMatrixWorld();
      U.sun().target.updateMatrixWorld();
      U.sun().shadow.updateMatrices(U.sun());
      cullSV.copy(U.sun().shadow.matrix);
      cullSun.copy(U.sun().shadow.getFrustum());
    }
    var moved = !cullPV.equals(cullLastPV) || (shadowOn && !cullSV.equals(cullLastSV));
    cullLastPV.copy(cullPV); cullLastSV.copy(cullSV);
    var fog = U.scene().fog && U.scene().fog.isFog ? U.scene().fog.far : 0;
    var cx = U.camera().position.x, cy = U.camera().position.y, cz = U.camera().position.z;
    U.propGroup().updateMatrixWorld();
    var gw = U.propGroup().matrixWorld.elements;
    var ox = gw[12], oy = gw[13], oz = gw[14];   // 소품 무리는 돌지도 늘지도 않는다(월드 미터) — 옮김만 본다
    var live = 0, drawn = 0, k;
    for (k in instKinds) {
      if (!Object.prototype.hasOwnProperty.call(instKinds, k)) { continue; }
      var K = instKinds[k];
      live += K.n;
      if (!K.dirty && !moved) { drawn += K.mesh.count; continue; }
      var cast = shadowOn && K.mesh.castShadow;
      var arr = K.mesh.instanceMatrix.array, sp = K.sph, j = 0, i;
      for (i = 0; i < K.hi; i++) {
        if (!K.live[i]) { continue; }
        var x = sp[i * 4] + ox, y = sp[i * 4 + 1] + oy, z = sp[i * 4 + 2] + oz, r = sp[i * 4 + 3];
        var see = inFr(cullCam, x, y, z, r);
        if (see && fog) {
          var dx = x - cx, dy = y - cy, dz = z - cz, lim = fog + r;
          if (dx * dx + dy * dy + dz * dz > lim * lim) { see = false; }
        }
        if (!see && !(cast && inFr(cullSun, x, y, z, r))) { continue; }
        arr.set(K.mat.subarray(i * 16, i * 16 + 16), j * 16);
        j++;
      }
      K.mesh.count = j;
      if (j) {
        var im = K.mesh.instanceMatrix;
        if (im.clearUpdateRanges) { im.clearUpdateRanges(); im.addUpdateRange(0, j * 16); }
        im.needsUpdate = true;
      }
      K.dirty = false;
      drawn += j;
    }
    cullStat.live = live; cullStat.drawn = drawn; cullStat.frames++;
  }

  /** 지금 몇 덩이에 몇 자리가 차 있나 — 진단·데모가 값으로 본다 */
  function instStats() {
    var out = { on: INST_ON(), cap: INST_CAP(), kinds: 0, used: 0, by: {} };
    for (var k in instKinds) {
      if (!Object.prototype.hasOwnProperty.call(instKinds, k)) { continue; }
      out.kinds++; out.used += instKinds[k].n; out.by[k] = instKinds[k].n;
    }
    return out;
  }

  /**
   * 잔 사물을 인스턴스로 세운다 — 세웠으면 true.
   * 좌표는 **월드 미터**다(격자 Group 안이 아니라 세상에 바로 놓기 때문).
   */
  /**
   * **GLB 소품** 하나를 세운다 (`prop3d.js`).
   * 나무 한 그루는 줄기와 잎이 다른 재질이라 조각이 둘이다 — 조각마다 덩이를
   * 하나씩 두고 **같은 행렬을 다 적는다.** 화면에서는 한 그루로 보인다.
   *
   * 아직 안 왔으면 false 를 주고, 부르는 쪽이 여태 쓰던 도형으로 간다.
   */
  /* W-0119 땅 시대(고향 = 과거) — 집·등롱·우물만 */ function propEra(want, x, z) { var Bz = global.DG.biome, zn = (want === 'house' || want === 'lamp' || want === 'well') && Bz && Bz.zoneAt ? Bz.zoneAt(x, z) : undefined; return zn === undefined ? null : (zn && zn.era) || 'past'; }  function instGlb(key, want, x, z, h, gx, gy, rot) {
    var P3 = global.DG.prop3d;
    if (!P3) { return false; }
    /* ⑲-33 고원 땅 나무는 눈 재질 — 덩이 이름을 갈라 다른 땅 나무와 안 섞인다 */
    var FRs = global.DG.frost, snow = want === 'tree' && FRs && FRs.treeSnow ? FRs.treeSnow(x, z) : 0;
    var got = P3.parts(want, gx, gy, undefined, snow, propEra(want, x, z));
    if (!got || !got.parts.length) { return false; }
    var tag = got.snow ? '#snow' + got.snow : '';
    /* 자리마다 조금씩 돌려 세운다 — 안 돌리면 나무 백 그루가 같은 쪽을 본다.
       집은 제 회전을 이미 갖고 있으므로(길을 보고 선다) 그것을 그대로 쓴다 */
    var ry = typeof rot === 'number' ? rot : h1(gx * 41 + 7, gy * 83 + 13) * Math.PI * 2;
    var hh = h * P3.heightMul(want);
    var i, ok = true;
    for (i = 0; i < got.parts.length; i++) {
      var K = instMake(got.url + tag + '#' + i, got.parts[i].geometry,
                        got.parts[i].material, P3.casts(want), GLB_CAP());
      ok = instAt(K, key, got.url + tag + '#' + i, x, groundY(x, z), z, hh, hh, hh, 0, ry, 0) && ok;
    }
    return ok;
  }

  function instProp(key, p, ox, oz) {
    if (!INST_ON()) { return false; }
    var x = ox + p.x, z = oz + p.z;
    /* **진짜 모델이 와 있으면 그것으로 세운다** (새 PLAN STEP 4).
       격자 좌표를 같이 넘겨 같은 자리에는 늘 같은 모양이 서게 한다 */
    var gx = Math.round((ox - GRID / 2) / GRID), gy = Math.round((oz - GRID / 2) / GRID);
    /* 왼쪽이 이 판의 소품 이름, 오른쪽이 `prop3d` 표의 이름이다.
       손으로 그린 땅의 일곱(산·등롱·사당·굴·폐허·다리·벼)도 여기서 갈린다 */
    var GLB = { tree: 'tree', rock: 'rock', grass: 'grass', reed: 'grass',
                house: 'house', tower: 'tower',
                peak: 'peak', lamp: 'lamp', shrine: 'shrine', cave: 'cave',
                ruin: 'ruin', bridge: 'bridge', rice: 'rice',
                well: 'well', market: 'market', waterfall: 'waterfall',
                temple: 'temple' };
    /* LOD(PLAN 36절) — 나무·바위·풀·갈대는 `LOD_NEAR` 안에 있을 때만 진짜
       모델을 받는다. 밖이면 곧장 아래의 싼 도형(원뿔·공)으로 간다. 집·탑·
       랜드마크는 칸당 수가 적어 거리를 안 가린다 */
    var natureLod = p.t === 'tree' || p.t === 'rock' || p.t === 'grass' || p.t === 'reed';
    var lodOk = !natureLod ||
      Math.hypot(x - core.save.player.pos.x, z - core.save.player.pos.y) <= LOD_NEAR();
    /* 땅 전용 퓨전 소품('zp_*')은 prop3d 표 이름 그대로다 */
    var glbName = GLB[p.t] || (p.t && p.t.indexOf('zp_') === 0 ? p.t : null);
    if (lodOk && glbName && instGlb(key, glbName, x, z, p.h, gx + Math.round(p.x),
                            gy + Math.round(p.z), p.rot)) {
      return true;
    }
    if (p.t === 'tree') {
      var SS = global.DG.season, FRt = global.DG.frost;
      var leafHex = SS ? SS.leaf(0x2f5a34) : 0x2f5a34;
      if (FRt && FRt.treeSnow && FRt.treeSnow(x, z) > 0) { leafHex = 0xc4d2d8; }   // ⑲-33 먼 곳 원뿔 나무도 눈빛
      var a = instPut(key, 'trunk', 'cyl', 0x4a3a2a, '', true,
        x, p.h * 0.21, z, 1.2, p.h * 0.42, 1.2);
      var bb = instPut(key, 'leaf:' + leafHex, 'cone', leafHex, 'sway', true,
        x, p.h * 0.58, z, p.h * 0.68, p.h * 0.72, p.h * 0.68);
      return a && bb;
    }
    if (p.t === 'rock') {
      return instPut(key, 'rock', 'sph', 0x6b6a72, 'flat', true,
        x, p.h * 0.32, z, p.h * 1.5, p.h * 0.9, p.h * 1.3, 0.3, p.x, 0.2);
    }
    if (p.t === 'grass') {
      return instPut(key, 'grass', 'cone', 0x5d7a44, 'sway', false,
        x, p.h * 0.5, z, p.h * 1.5, p.h, p.h * 1.5);
    }
    if (p.t === 'reed') {
      return instPut(key, 'reed', 'cone', 0x6d7f4a, 'sway', false,
        x, p.h * 0.5, z, 0.5, p.h, 0.5);
    }
    return false;
  }

  /**
   * 등불 한 알. **밤에만 보인다** — 낮에 켜 두면 흰 점으로만 남는다.
   * 지금이 밤인지 여기서 곧바로 정한다: 나중에 걸어 들어온 격자는
   * `syncLamps` 가 이미 훑고 지나간 뒤라 낮에도 켜진 채 남는다.
   */

  return { propEra: propEra, INST_ON: INST_ON, INST_CAP: INST_CAP, GLB_CAP: GLB_CAP, instBox: instBox, instMake: instMake, instPut: instPut, instAt: instAt, instDrop: instDrop, inFr: inFr, instCull: instCull, instStats: instStats, instProp: instProp };
  } };
})(window);
