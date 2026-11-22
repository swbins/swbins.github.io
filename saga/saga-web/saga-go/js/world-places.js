/**
 * 1만리 자리 — 2D 마을(vil2d·villageOf·inVillage) · 구역 이름(regionKeyOf·regionName) · 역참·성채(stationsIn·fortAt·…Near·nearest…).
 * world.js 에서 떼어 냄(R-4 11-17, 줄 수 상한 — world-terrain.js 와 같은 길). 좌표 해시라 같은 땅은 늘 같은 자리다.
 * 바깥 것: core(hash2·tuned·save.player.pos)·DG.field2d·DG.world3d 와 make(K) 로 받는 상수 K.REGION_SIZE·SPAWN_RADIUS·ENCOUNTER_RANGE(world.js 정본).
 * world.js 는 같은 이름 한 줄 넘김(DG.world.* 그대로).
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.worldPlaces = { make: function (K) {
  var core = global.DG.core, REGION_SIZE = K.REGION_SIZE, SPAWN_RADIUS = K.SPAWN_RADIUS, ENCOUNTER_RANGE = K.ENCOUNTER_RANGE;

  function vil2d() { var F = global.DG.field2d, W3 = global.DG.world3d; return !global.DG_NO_DRAW && +core.tuned('go.village2d', 1) > 0 && !!(F && F.on && F.on()) && !(W3 && W3.active && W3.active()); }
  function villageOf(rx, ry) {
    var n = Math.max(1, +core.tuned('go.villageEvery2d', 4)), bx = Math.floor(rx / n), by = Math.floor(ry / n), vx, vy;
    if (bx === 0 && by === 0) { return rx === 0 && ry === 0 ? { x: 170, y: -170 } : null; }   // 시작 자리 위쪽 — 건물이 주인공·촌장을 가리지 않게
    var pad = n >= 3 ? 1 : 0, nn = n - 2 * pad;   /* 묶음 안쪽에만 — 이웃 묶음 마을과 붙지 않게 */ vx = bx * n + pad + Math.floor(h01(bx * 211 + 9, by * 157 + 31) * nn); vy = by * n + pad + Math.floor(h01(bx * 83 + 47, by * 239 + 5) * nn);
    if (rx !== vx || ry !== vy) { return null; }
    return { x: (rx + 0.25 + 0.5 * h01(rx * 67 + 3, ry * 113 + 19)) * REGION_SIZE, y: (ry + 0.25 + 0.5 * h01(rx * 101 + 7, ry * 59 + 43)) * REGION_SIZE };
  }
  function inVillage(x, y, r) {
    var R0 = r || +core.tuned('go.villageR2d', 420), rx = Math.floor(x / REGION_SIZE), ry = Math.floor(y / REGION_SIZE), dx, dy, v;
    for (dy = -1; dy <= 1; dy++) { for (dx = -1; dx <= 1; dx++) { v = villageOf(rx + dx, ry + dy); if (v && Math.hypot(v.x - x, v.y - y) <= R0) { return true; } } }
    return false;
  }

  /* ── 구역 이름 ────────────────────────────────────────────
   * 옛 지명은 지도의 맛일 뿐이다 — 경영(영지 소유)은 게임에서 뺐다.
   * 좌표 해시로 뽑으므로 같은 구역은 항상 같은 이름이다.
   */

  var REGION_NAMES = [
    '한중', '형주', '익주', '서량', '허창', '업성', '건업', '강릉', '합비', '장안',
    '평양', '국내성', '한성', '금성', '사비', '개경', '한양', '전주', '경주', '의주',
    '동래', '진주', '남원', '철령', '압록', '두만', '탐라', '강화', '수원', '충주'
  ];

  function regionKeyOf(x, y) {
    return Math.floor(x / REGION_SIZE) + ',' + Math.floor(y / REGION_SIZE);
  }
  function currentRegionKey() {
    var pos = core.save.player.pos;
    return regionKeyOf(pos.x, pos.y);
  }
  /* core.hash2 는 0~0.5 만 돌려준다(h01 머리말 참고) — 그냥 쓰면 역참과 같은
   * 사고로 REGION_NAMES 뒤 절반(한양·경주·전주 등 15개)이 영영 안 뽑힌다.
   * h01 로 두 배로 펴서 30개 전부가 나오게 한다. */
  function regionName(key) {
    var p = key.split(',');
    var idx = Math.floor(h01(parseInt(p[0], 10) * 31 + 7, parseInt(p[1], 10) * 17 + 3) * REGION_NAMES.length);
    return REGION_NAMES[core.clamp(idx, 0, REGION_NAMES.length - 1)];
  }

  /* ── 역참(驛站) — 원작의 보급 거점 ─────────────
   * 구역마다 둘. 좌표 해시라 **같은 땅은 늘 같은 자리**다.
   * 스폰과 달리 사라지지도 배회하지도 않는다 — 들르면 보급을 주고 쉰다(station.js).
   *
   * 여기 있던 던전 입구는 지웠다. 던전은 딴 게임(saga-dungeon)이 맡고,
   * "지도에 던전 입구를 노출하지 않는다"는 지시도 그대로다. 부르는 곳도 없었다.
   *
   * 주의 — 이 판의 `core.hash2` 는 **0~0.5 만** 돌려준다(마지막 xor 가 부호 있는 `>>`).
   * 지형 문턱값이 그 좁은 범위에 맞춰져 있어 고치지 않기로 한 값이므로,
   * 자리를 고를 때는 여기서 두 배로 펴서 쓴다. 그냥 쓰면 역참이 구역의
   * 왼쪽 위 사분면에만 몰린다.
   */

  function h01(a, b) { return Math.min(0.999999, core.hash2(a, b) * 2); }

  var STATIONS_PER_REGION = 2;
  /* 지도 위 이름표라 짧게 — 한자를 병기하면 구역 이름과 엉켜 읽히지 않는다 */
  var STATION_SIDE = ['동역', '서역'];

  /* 11-03 2D 는 건물이 너무 많다(사용자) — 2D 일 때만 역참·성채를 go.bldDens2d(기본 0.5) 몫으로. 3D·GPS 는 그대로 */
  function bldDens() { var F = global.DG.field2d, W3 = global.DG.world3d, k = +core.tuned('go.bldDens2d', 0.5); return (k >= 0 && k < 1 && F && F.on && F.on() && !(W3 && W3.active && W3.active())) ? k : 1; }
  function stationsIn(rx, ry) {
    var out = [];
    if (vil2d()) { var v0 = villageOf(rx, ry); return v0 ? [{ key: rx + ',' + ry + '#0', x: v0.x, y: v0.y, name: regionName(rx + ',' + ry) + ' ' + STATION_SIDE[0] }] : []; }   // 역참은 마을 한가운데
    for (var i = 0, nSt = Math.max(1, Math.ceil(STATIONS_PER_REGION * bldDens() - 1e-9)); i < nSt; i++) {
      var hx = h01(rx * 71 + i * 13 + 3, ry * 37 + i * 29 + 5);
      var hy = h01(rx * 53 + i * 17 + 11, ry * 97 + i * 7 + 2);
      out.push({
        key: rx + ',' + ry + '#' + i,
        x: (rx + 0.12 + hx * 0.76) * REGION_SIZE,
        y: (ry + 0.12 + hy * 0.76) * REGION_SIZE,
        name: regionName(rx + ',' + ry) + ' ' + STATION_SIDE[i]
      });
    }
    return out;
  }

  /** 지금 위치 둘레(3×3 구역)의 역참 — 가까운 것부터 */
  function stationsNear() {
    var pos = core.save.player.pos;
    var rx = Math.floor(pos.x / REGION_SIZE), ry = Math.floor(pos.y / REGION_SIZE);
    var out = [];
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var list = stationsIn(rx + dx, ry + dy);
        for (var i = 0; i < list.length; i++) {
          var d = Math.hypot(list[i].x - pos.x, list[i].y - pos.y);
          if (d <= SPAWN_RADIUS * 1.6) { list[i].dist = d; out.push(list[i]); }
        }
      }
    }
    out.sort(function (a, b) { return a.dist - b.dist; });
    return out;
  }

  function nearestStation() {
    var list = stationsNear();
    if (!list.length) { return null; }
    return { station: list[0], dist: list[0].dist, inRange: list[0].dist <= ENCOUNTER_RANGE };
  }

  /* ── 성채(城砦) — 원작의 체육관 ───────────────
   * 역참보다 훨씬 드물다(구역의 약 4할에 하나). 원작에서도 체육관은
   * 보급 거점보다 성기게 서 있고, 그래서 하나가 사건이 된다.
   * 지키는 세력과 수비대는 fort.js 가 성채 키에서 뽑는다(늘 같은 성채).
   */

  var FORT_CHANCE = 0.4;

  function fortAt(rx, ry) {
    if (vil2d()) {   // 성채도 마을 곁에만
      var v1 = villageOf(rx, ry); if (!v1 || ((rx || ry) && h01(rx * 131 + 17, ry * 197 + 23) > +core.tuned('go.villageFort2d', 0.5))) { return null; }
      if (rx === 0 && ry === 0) { return { key: 'F0,0', rx: 0, ry: 0, x: -210, y: -210, name: regionName('0,0') + ' 성채' }; }   // 시작 마을 성채도 위쪽
      var a1 = h01(rx * 89 + 41, ry * 149 + 7) * Math.PI * 2;
      return { key: 'F' + rx + ',' + ry, rx: rx, ry: ry, x: v1.x + Math.cos(a1) * 260, y: v1.y + Math.sin(a1) * 260, name: regionName(rx + ',' + ry) + ' 성채' };
    }
    if (h01(rx * 131 + 17, ry * 197 + 23) > FORT_CHANCE * bldDens()) { return null; }
    var hx = h01(rx * 89 + 41, ry * 149 + 7);
    var hy = h01(rx * 173 + 13, ry * 61 + 29);
    return {
      key: 'F' + rx + ',' + ry,
      rx: rx, ry: ry,
      x: (rx + 0.18 + hx * 0.64) * REGION_SIZE,
      y: (ry + 0.18 + hy * 0.64) * REGION_SIZE,
      name: regionName(rx + ',' + ry) + ' 성채'
    };
  }

  /** 지금 위치 둘레(3×3 구역)의 성채 — 가까운 것부터 */
  function fortsNear() {
    var pos = core.save.player.pos;
    var rx = Math.floor(pos.x / REGION_SIZE), ry = Math.floor(pos.y / REGION_SIZE);
    var out = [];
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var f = fortAt(rx + dx, ry + dy);
        if (!f) { continue; }
        var d = Math.hypot(f.x - pos.x, f.y - pos.y);
        if (d <= SPAWN_RADIUS * 1.6) { f.dist = d; out.push(f); }
      }
    }
    out.sort(function (a, b) { return a.dist - b.dist; });
    return out;
  }

  function nearestFort() {
    var list = fortsNear();
    if (!list.length) { return null; }
    return { fort: list[0], dist: list[0].dist, inRange: list[0].dist <= ENCOUNTER_RANGE };
  }

  return { vil2d: vil2d, villageOf: villageOf, inVillage: inVillage, regionKeyOf: regionKeyOf, currentRegionKey: currentRegionKey, regionName: regionName,
    h01: h01, stationsIn: stationsIn, stationsNear: stationsNear, nearestStation: nearestStation, fortAt: fortAt, fortsNear: fortsNear, nearestFort: nearestFort };
  } };
})(window);
