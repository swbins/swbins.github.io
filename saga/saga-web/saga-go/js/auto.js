/**
 * 자동 순행(自動巡行) — 손으로 못 걸을 때 대신 굴려 주는 조종사
 * ---------------------------------------------------------------
 * 이 게임은 원래 "걸어야" 돌아간다. 그런데 사무실·집에 앉아 있는 동안에는
 * 걸을 수가 없다. 그래서 **판단만 대신하는 층**을 하나 얹었다.
 *
 * 규칙을 새로 만들지 않는 것이 이 파일의 첫째 원칙이다.
 * 걷기·조우·문답·던전의 규칙은 각 모듈에 그대로 두고, 여기서는
 * "무엇을 목표로 삼을지" 고르고 **원래 있던 공개 함수만 부른다**:
 *
 *   지도    world.walkTo()          — 손으로 탭하는 것과 같은 길
 *           encounter.autoResolve() — 미니게임 확률을 그대로 굴린다
 *
 * 그래서 자동으로 얻는 기대값이 손으로 하는 것과 어긋나지 않는다.
 *
 * 일부러 자동화하지 않은 것
 *   - **실제 위치(GPS)** 는 대신 걸을 수 없다. 자동을 켜면 키보드 이동으로
 *     바꾼다 — 위치 공급자를 흉내 내는 것보다 정직하다.
 *
 * 화면을 보고 있는 동안에만 돈다(requestAnimationFrame). 창을 덮어 두면
 * 멈춘다 — 방치 수익을 새로 만들지 않기 위해 일부러 이렇게 뒀다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  /* 무엇을 자동으로 할지 — 화면에서 켜고 끈다 */
  var FLAGS = [
    /* 2026-09-28 실기 Q5 "전체 테스트용 자동 퀘스트" — 이야기 목표까지 걸어가 말을 걸고 대화를 넘긴다.
       싸움(무찌르기·결투·지키기)은 🤖 자동 전투(field-combat autoFight)가 맡고, 여기서는 붙은 동안 안 걷는다 */
    { key: 'story', name: '이야기', emoji: '📖',
      desc: '지금 이야기 목표로 걸어가 말을 걸고 대화를 넘긴다 (다른 자동보다 먼저)' },
    { key: 'meet', name: '등용 · 포획', emoji: '🤝',
      desc: '사거리 안의 대상을 미니게임 확률대로 상대한다' },
    { key: 'grow', name: '승급 · 장비', emoji: '✨',
      desc: '승급 조건을 채운 인물을 올리고, 노획 장비를 갈아입힌다' },
    { key: 'omen', name: '길조 유지', emoji: '🔮',
      desc: '온라인일 때 천기를 물어 보정을 이어 붙인다 (토큰 소모)' },
    { key: 'stop', name: '역참 들르기', emoji: '🏮',
      desc: '채워진 역참으로 걸어가 보급을 받고, 점거된 역참은 이길 만하면 물린다' },
    { key: 'fort', name: '성채 공략', emoji: '🏯',
      desc: '이길 만한 성채에 도전하고, 점령한 성채의 공물을 걷는다' }
  ];

  /* 걷기 목표를 다시 정하는 간격 — 대상이 배회하므로 계속 따라간다 */
  var RETARGET = 0.45;
  var PATROL_MIN = 90, PATROL_MAX = 260;   // 순행 목표 거리 (m)

  var acc = { aim: 0, meet: 0, grow: 0, omen: 0, stop: 0, fort: 0, talk: 0, story: 0, ev: 0 }, EV_READ = 2.5, evShown = false, DM_GRIND = 180, dmFail = { n: 0, at: 0, won: false };
  if (core.on) { core.on('domain:clear', function () { dmFail.n = 0; dmFail.won = true; }); core.on('domain:enter', function () { dmFail.won = false; }); core.on('domain:end', function () { if (!dmFail.won) { dmFail.n++; dmFail.at = Date.now(); } dmFail.won = false; }); }   // 숨은 터 진 횟수(깨면 0)
  var patrol = null;                       // 순행 목표 {x, y}
  var aimUid = null;                       // 지금 쫓는 대상
  var doing = '';                          // 화면에 보여 줄 한 줄
  var lastLog = 0;

  var DEFAULTS = { on: false, story: true, meet: true, grow: true, omen: false, stop: true, fort: true };

  function st() {
    var s = core.save;
    /* 빠진 칸은 채워 넣는다 — 옛 세이브에는 없던 칸이 있다 */
    if (!s.auto) { s.auto = {}; }
    var k;
    for (k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k) && s.auto[k] === undefined) {
        s.auto[k] = DEFAULTS[k];
      }
    }
    return s.auto;
  }

  function on(flag) { return !!st()[flag]; }
  function active() { return !!st().on; }

  function flagByKey(k) {
    for (var i = 0; i < FLAGS.length; i++) { if (FLAGS[i].key === k) { return FLAGS[i]; } }
    return null;
  }

  /* ── 켜고 끄기 ────────────────────────────────────────── */

  function setOn(v) {
    var s = st();
    v = !!v;
    if (s.on === v) { return v; }
    s.on = v;
    if (v) {
      /* 실제 위치로는 대신 걸을 수 없다 — 키보드 이동으로 돌려놓는다 */
      if (global.DG.world.mode === 'geo') {
        global.DG.world.useKeyboard();
        core.emit('toast', '자동 순행: 실제 위치 대신 지도 위를 걷습니다');
      } else {
        core.emit('toast', '자동 순행 시작');
      }
      core.log('자동 순행을 켰다', 'info');
      patrol = null; aimUid = null; doing = '길을 고르는 중…';
    } else {
      doing = '';
      core.log('자동 순행을 껐다', 'info');
      core.emit('toast', '자동 순행 정지');
    }
    core.emit('changed');
    core.persist();
    return v;
  }

  function toggle() { return setOn(!st().on); }

  function toggleFlag(key) {
    var s = st();
    if (!flagByKey(key)) { return false; }
    s[key] = !s[key];
    core.emit('changed');
    core.persist();
    return !!s[key];
  }

  /* ── 지도 ─────────────────────────────────────────────── */

  /** 이 대상을 상대할 밑천이 있나 */
  function affordable(spawn) {
    if (spawn.kind === 'hero') {
      return core.save.items.scroll >= 1 &&
             core.save.player.fame >= spawn.ref.rarity * 12;
    }
    return core.save.items.feed >= 1;
  }

  /**
   * 목표 고르기 — 귀한 대상을 앞세우되 거리를 깎는다.
   * 도감에 없는 것은 크게 얹는다(도감을 채우는 게 본편의 목적이므로).
   */
  function scoreSpawn(s, pos) {
    var d = Math.hypot(s.x - pos.x, s.y - pos.y);
    var dex = s.kind === 'hero' ? core.save.dex.heroes : core.save.dex.pets;
    var fresh = !dex[s.ref.id];
    return s.ref.rarity * 12 + (fresh ? 40 : 0) - d * 0.14;
  }

  function bestTarget() {
    var pos = core.save.player.pos;
    var list = global.DG.world.spawns, best = null, bs = -1e9;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!affordable(s)) { continue; }
      var sc = scoreSpawn(s, pos);
      if (sc > bs) { bs = sc; best = s; }
    }
    return best;
  }

  /**
   * 지금 갈 만한 역참 — 채워져 있는 것 중 가장 가까운 것.
   * 원작에서 볼이 떨어지면 스탑을 돌러 가는 그 행동이다.
   */
  function bestStation() {
    var list = global.DG.world.stationsNear(), stn = global.DG.station;
    var R = global.DG.rogue;
    for (var i = 0; i < list.length; i++) {
      /* 점거된 역참은 보급을 주지 않는다 — 밑천을 채우러 갈 자리가 아니다.
         물리치는 것은 아래 사거리 갈래가 따로 판단한다(이길 만할 때만 붙는다) */
      if (R && R.occupied(list[i])) { continue; }
      if (stn.stateOf(list[i].key).ready) { return list[i]; }
    }
    return null;
  }

  /** 밑천이 없으면 걷는다 — 250m 마다 보급이 들어오므로 이게 회복 수단이다 */
  function repatrol() {
    var pos = core.save.player.pos;
    var ang = Math.random() * Math.PI * 2;
    var d = PATROL_MIN + Math.random() * (PATROL_MAX - PATROL_MIN);
    patrol = { x: pos.x + Math.cos(ang) * d, y: pos.y + Math.sin(ang) * d };
  }

  /* ── 이야기 ──────────────────────────────────────────── */

  var TALK_GAP = 0.45;           // 대화 한 줄 넘기는 간격(초) — 글이 흘러나오는 것을 한 번은 보이게
  var WARP_MIN = 600;            // 이보다 먼 목표는 더 가까운 순간이동 지점이 있으면 뛴다
  var STUCK_T = 2.5;             // 이만큼 걸으려 했는데 1m 도 못 갔으면 막힌 것(집·강)
  var stuck = { x: 0, y: 0, t: 0, side: null };

  /* W-0649 짧은 길 찾기 — 막히면(1초) 걷기와 같은 벽(world.blockRects)을 격자(4칸 단위)에 찍고 A* 로 돌아갈 길점을 만든다.
     사용자 11-12 「자동 전투나 자동퀘스트도 벽이 있으면 … 지나가는데 오래걸림」 — 옛 길은 무작위 좌/우 12m 옆걸음뿐이었다.
     planPath 는 순수(벽 사각형·점 판정 함수만 받는다) — 진단이 가짜 벽으로 잰다. 손잡이 go.autoPath 1(0 = 옛 옆걸음만) */
  var PG = 4, PATH_HORIZON = 360, PATH_PAD = 72, PATH_MAXN = 40000;
  function planPath(sx, sy, tx, ty, rects, hit) {
    var dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
    if (d > PATH_HORIZON) { tx = sx + dx / d * PATH_HORIZON; ty = sy + dy / d * PATH_HORIZON; }
    var x0 = Math.min(sx, tx) - PATH_PAD, y0 = Math.min(sy, ty) - PATH_PAD;
    var W = Math.ceil((Math.max(sx, tx) + PATH_PAD - x0) / PG) + 1, H = Math.ceil((Math.max(sy, ty) + PATH_PAD - y0) / PG) + 1;
    if (W * H > PATH_MAXN) { return null; }
    var blk = new Uint8Array(W * H), i, j, k, r, rr, a0, a1, b0, b1;
    for (k = 0; k < rects.length; k++) {   // 사각형마다 둘레 칸만 잰다(돌아간 사각형은 외접원 + 몸 반지름)
      r = rects[k]; rr = Math.hypot(r.w, r.d) / 2 + 1.5;
      a0 = Math.max(0, Math.floor((r.x - rr - x0) / PG)); a1 = Math.min(W - 1, Math.ceil((r.x + rr - x0) / PG));
      b0 = Math.max(0, Math.floor((r.z - rr - y0) / PG)); b1 = Math.min(H - 1, Math.ceil((r.z + rr - y0) / PG));
      for (j = b0; j <= b1; j++) { for (i = a0; i <= a1; i++) { if (!blk[j * W + i] && hit(x0 + i * PG, y0 + j * PG, [r])) { blk[j * W + i] = 1; } } }
    }
    var si = Math.round((sx - x0) / PG), sj = Math.round((sy - y0) / PG), gi = Math.round((tx - x0) / PG), gj = Math.round((ty - y0) / PG);
    blk[sj * W + si] = 0;   // 벽에 붙어 선 자리 — 출발 칸은 연다
    if (blk[gj * W + gi]) {   // 목표가 벽 안이면 가장 가까운 빈 칸(6 고리까지)
      var best = -1, bd = 1e9, ring;
      for (ring = 1; ring <= 6 && best < 0; ring++) { for (j = gj - ring; j <= gj + ring; j++) { for (i = gi - ring; i <= gi + ring; i++) { if (i >= 0 && j >= 0 && i < W && j < H && !blk[j * W + i]) { d = Math.hypot(i - gi, j - gj); if (d < bd) { bd = d; best = j * W + i; } } } } }
      if (best < 0) { return null; } gi = best % W; gj = (best / W) | 0;
    }
    var N = W * H, g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), shut = new Uint8Array(N), heap = [], hf = [];
    function push(n, f) { heap.push(n); hf.push(f); var c = heap.length - 1, q; while (c > 0) { q = (c - 1) >> 1; if (hf[q] <= hf[c]) { break; } var t = heap[q]; heap[q] = heap[c]; heap[c] = t; t = hf[q]; hf[q] = hf[c]; hf[c] = t; c = q; } }
    function pop() { var top = heap[0], ln = heap.pop(), lf = hf.pop(), c = 0, l, m; if (heap.length) { heap[0] = ln; hf[0] = lf; for (;;) { l = c * 2 + 1; m = c; if (l < heap.length && hf[l] < hf[m]) { m = l; } if (l + 1 < heap.length && hf[l + 1] < hf[m]) { m = l + 1; } if (m === c) { break; } var t = heap[m]; heap[m] = heap[c]; heap[c] = t; t = hf[m]; hf[m] = hf[c]; hf[c] = t; c = m; } } return top; }
    function hh(i2, j2) { var ax = Math.abs(i2 - gi), ay = Math.abs(j2 - gj); return Math.max(ax, ay) + 0.414 * Math.min(ax, ay); }
    var s0 = sj * W + si, goal = gj * W + gi, n, ci, cj, ni, nj, nn, ng, step, found = false, iters = 0;
    g[s0] = 0; push(s0, hh(si, sj));
    while (heap.length && iters++ < N) {
      n = pop(); if (shut[n]) { continue; } shut[n] = 1;
      if (n === goal) { found = true; break; }
      ci = n % W; cj = (n / W) | 0;
      for (j = -1; j <= 1; j++) { for (i = -1; i <= 1; i++) {
        if (!i && !j) { continue; } ni = ci + i; nj = cj + j;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) { continue; } nn = nj * W + ni;
        if (blk[nn] || shut[nn] || (i && j && (blk[cj * W + ni] || blk[nj * W + ci]))) { continue; }   // 모서리 깎지 않기
        step = i && j ? 1.414 : 1; ng = g[n] + step;
        if (ng < g[nn]) { g[nn] = ng; from[nn] = n; push(nn, ng + hh(ni, nj)); }
      } }
    }
    if (!found) { return null; }
    var cells = []; for (n = goal; n >= 0; n = from[n]) { cells.push(n); if (n === s0) { break; } } cells.reverse();
    function clear(a, b) { var ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0, L = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2, s, px, py; for (s = 1; s < L; s++) { px = Math.round(ax + (bx - ax) * s / L); py = Math.round(ay + (by - ay) * s / L); if (blk[py * W + px]) { return false; } } return true; }
    var pts = [], at = 0, nx2;   // 줄 긋기로 줄인 길점(보이는 데까지 곧장)
    while (at < cells.length - 1) { for (nx2 = cells.length - 1; nx2 > at + 1 && !clear(cells[at], cells[nx2]); nx2--) { /* 더 가까운 점 */ } pts.push({ x: x0 + (cells[nx2] % W) * PG, y: y0 + ((cells[nx2] / W) | 0) * PG }); at = nx2; }
    return pts;
  }
  var path = null;   // { pts, i, gx, gy, t } — 따라가는 길점
  function pathOn() { return +core.tuned('go.autoPath', 1) === 1; }
  function makePath(w, p, tx, ty) {
    if (!w.blockRects || !w.hitRects) { return null; }
    var rects = w.blockRects(Math.min(p.x, tx) - PATH_PAD, Math.min(p.y, ty) - PATH_PAD, Math.max(p.x, tx) + PATH_PAD, Math.max(p.y, ty) + PATH_PAD);
    if (!rects.length) { return null; }
    var pts = planPath(p.x, p.y, tx, ty, rects, w.hitRects);
    return pts && pts.length ? { pts: pts, i: 0, gx: tx, gy: ty, t: 0 } : null;
  }

  /** 막힘 풀기 — 목표 쪽이 막혀 제자리면 짧은 길 찾기(W-0649), 실패하면 옆으로 12m 비켰다가 다시 간다 */
  function walkToward(w, tx, ty, dt, run) {
    var p = core.save.player.pos;
    if (path && (Math.hypot(path.gx - tx, path.gy - ty) > 24 || (path.t += dt) > 25)) { path = null; }   // 목표가 바뀌었거나 너무 오래
    if (path && !stuck.side) {
      var wp = path.pts[path.i];
      var runP = run || Math.hypot(tx - p.x, ty - p.y) > 40, reach = Math.max(3, (w.moveSpeed ? w.moveSpeed(runP) : 0) * dt * 1.2);   // 한 걸음이 길점 사이보다 길면(폰 30fps·달리기) 넘나들며 맴돌았다
      if (Math.hypot(wp.x - p.x, wp.y - p.y) < reach) { path.i++; if (path.i >= path.pts.length) { path = null; } }
      if (path) {
        wp = path.pts[path.i];
        if (Math.hypot(p.x - stuck.x, p.y - stuck.y) > 1) { stuck.x = p.x; stuck.y = p.y; stuck.t = 0; } else { stuck.t += dt; }
        if (stuck.t <= STUCK_T) { w.walkTo(wp.x, wp.y, runP); return; }
        path = null;   // 길점 따라가다 또 막힘 — 아래 옆걸음으로
      }
    }
    if (stuck.side) {
      if (Math.hypot(stuck.side.x - p.x, stuck.side.y - p.y) > 2 && stuck.t < 4) { stuck.t += dt; w.walkTo(stuck.side.x, stuck.side.y, run); return; }
      stuck.side = null; stuck.t = 0;
    }
    if (Math.hypot(p.x - stuck.x, p.y - stuck.y) > 1) { stuck.x = p.x; stuck.y = p.y; stuck.t = 0; }
    else { stuck.t += dt; }
    if (pathOn() && !path && stuck.t > 1 && stuck.t - dt <= 1) { path = makePath(w, p, tx, ty); if (path) { stuck.t = 0; stuck.x = p.x; stuck.y = p.y; w.walkTo(path.pts[0].x, path.pts[0].y, run); return; } }
    if (stuck.t > STUCK_T) {
      var dx = tx - p.x, dy = ty - p.y, dl = Math.hypot(dx, dy) || 1, sg = Math.random() < 0.5 ? 1 : -1;
      stuck.side = { x: p.x - dy / dl * 12 * sg - dx / dl * 3, y: p.y + dx / dl * 12 * sg - dy / dl * 3 };
      stuck.t = 0;
      w.walkTo(stuck.side.x, stuck.side.y, run);
      return;
    }
    /* 멀면(40m+) 달린다 — 가까이선 걸어야 대화·채집 자리를 지나치지 않는다 */
    w.walkTo(tx, ty, run || Math.hypot(tx - p.x, ty - p.y) > 40);
  }

  /** 그 풀의 채집점 — 지금 자리 900m 안, 없으면 1.2·2.4·3.6·4.8km 둘레 열두 방향을 훑어 가장 가까운 것 { x, y, item } */
  function findNode(CK, item, p) {
    var best = null, bd = Infinity, rings = [0, 1200, 2400, 3600, 4800], ri, k;
    for (ri = 0; ri < rings.length && !best; ri++) {
      for (k = 0; k < (rings[ri] ? 12 : 1); k++) {
        var a = k / 12 * Math.PI * 2, cx = p.x + Math.cos(a) * rings[ri], cy = p.y + Math.sin(a) * rings[ri];
        CK.near(cx, cy, 900).forEach(function (nd) {
          if (nd.item !== item || !CK.available(nd)) { return; }
          var dd = Math.hypot(nd.x - p.x, nd.y - p.y);
          if (dd < bd) { bd = dd; best = nd; }
        });
      }
    }
    return best;
  }

  /** 요리 계획 — 모자란 재료 수가 가장 적고 그 재료가 모두 나는(findNode) 요리 · 가장 가까운 모자란 채집점 { rk, n, node } */
  function cookPlan(CK, p) {
    var best = null, memo = {};
    CK.ORDER.forEach(function (rk) {
      var r = CK.RECIPES[rk], n = 0, ok = true, node = null, nd = Infinity, k;
      for (k in r.ing) {
        if (!r.ing.hasOwnProperty(k) || CK.count(k) >= r.ing[k]) { continue; }
        n += r.ing[k] - CK.count(k);
        var f = memo[k] !== undefined ? memo[k] : (memo[k] = findNode(CK, k, p));
        if (!f) { ok = false; continue; }
        var dd = Math.hypot(f.x - p.x, f.y - p.y);
        if (dd < nd) { nd = dd; node = f; }
      }
      if (ok && node && (!best || n < best.n || (n === best.n && nd < best.d))) { best = { rk: rk, n: n, node: node, d: nd }; }
    });
    return best;
  }

  /** 이야기 한 박자 — 맡았으면 true(다른 자동은 이번엔 쉰다). 장이 잠겼거나 목표가 없으면 false */
  function tickStory(dt) {
    var S = global.DG.story, w = global.DG.world;
    if (!S || !S.on || !S.on()) { return false; }
    if (S.talking()) {
      acc.talk += dt;
      var line = S.curLine(), lt = line && line[0] !== '?' ? String(line[1] || '').length : 0;   // W-0625 줄 길이만큼 읽을 틈(1.6초 + 글자당 0.06초, 최대 5초) — 0.45초라 자동 중 이야기가 하나도 안 읽혔다
      if (acc.talk >= Math.max(TALK_GAP, Math.min(5, 1.6 + lt * 0.06))) {
        acc.talk = 0;
        S.next(line && line[0] === '?' ? 0 : undefined);        // 고르는 줄은 첫째 대답
      }
      doing = '대화 중';
      return true;
    }
    var st = S.step();
    if (!st) {
      if (!S.done() && S.locked()) { doing = '다음 장은 모험 레벨 ' + S.chapter().ar + ' 부터. 그동안 순행'; }
      return false;
    }
    if (st.type === 'party' && S.autoParty) { S.autoParty(); S.check(); if (S.step() !== st) { doing = '세 시대 동료로 명단을 짰다'; return true; } }   // ⑲-55 편성 시험 — 가진 동료로 채운다
    var t = S.targetOf(st);
    if (!t) { doing = '📖 ' + (st.text || st.type) + ': 목표 자리를 아직 못 찾음'; return false; }
    var p = core.save.player.pos, d = Math.hypot(t.x - p.x, t.y - p.y);
    var FC = global.DG.fieldCombat, FS = FC && FC.state ? FC.state() : null;
    /* W-0655 사용자 11-13 「자동퀘스트 진행시 몬스터를 너무 만나서 끊겨」 — 가는 길(목표에서 go.autoTravelR m 밖, 싸움 단계가 아니면 어디서나)은
       들판 적이 새로 안 쫓는다(field-combat calmTravel). 목표 곁의 무찌르기·결투·지키기·보스는 그대로 싸운다. 손잡이 go.autoTravelCalm 1(0 = 옛 길) */
    var FIGHT = { kill: 1, duel: 1, defend: 1, boss: 1, domain: 1, chase: 1 };
    var grinding = st.type === 'domain' && dmFail.n >= 2 && +core.tuned('go.autoGrind', 1) && Date.now() - dmFail.at < DM_GRIND * 1000;   // 사냥 되풀이 중엔 적이 와야 한다
    if (FS && FC.calmTravel && !grinding && +core.tuned('go.autoTravelCalm', 1) && (!FIGHT[st.type] || d > +core.tuned('go.autoTravelR', 35) * (FC.KDV ? FC.KDV() : 1))) { FC.calmTravel(FS, 1.0, p.x, p.y); }   // W-0658 2D 는 거리 ×KDV(최대 12) — 35m 그대로면 보스 곁도 「가는 길」이라 보스를 집으로 돌려보냈다
    if (FS && FC.living && st.type !== 'boss' && +core.tuned('go.autoSkipGuard', 1)) { FC.living(FS).forEach(function (f) { var cp = FS.camps[f.camp]; if (cp && cp.kind === 'guard' && f.st !== 'idle' && f.st !== 'return') { f.st = 'return'; f.mark = null; } }); }   // W-0658 수호자 단계가 아니면 땅 수호자(체력 ×6 큰 몸)와 안 엮인다 — 2D 넓은 반경에서 무찌르기 곁 수호자가 끌려왔다
    var near = null, nd0 = Infinity;   // W-0658 깨어 덤비는 적이 있을 때만 「싸우는 중」 — 없는데 calmT 만 0 이면(곁 수호자를 자동 공격이 쳤다) 제자리에 서서 갇혔다
    if (FS && FC.living) { FC.living(FS).forEach(function (f) { if (f.st === 'idle' || f.st === 'return') { return; } var dd = Math.hypot(f.x - p.x, f.y - p.y) - FC.BODY(f); if (dd < nd0) { nd0 = dd; near = f; } }); }
    if (FS && FC.inCombat && FC.inCombat(FS, p.x, p.y) && (near || !+core.tuned('go.autoTravelCalm', 1))) {   // engaged 는 멀리서 쫓거나 제단만 치는 적까지 잡아 멈춰 섰다
      /* 붙어 있게 — 가장 가까운 적의 몸 가장자리가 5m 넘게 벌어지면 다가간다(회피로 밀려나 적이 추격을 그만두던 것) */
      if (near && nd0 > 5) { w.walkTo(near.x, near.y); } else { w.walkTo(p.x, p.y); }
      doing = '싸우는 중 · ' + String(t.label || st.text || '').replace(/^[^가-힣A-Za-z0-9(]+/, '') + ' 가는 길';   // 이모지 줄머리 없이(W-0561 「AI 티」)   // W-0627 「사공 버들: 싸우는 중」이 그 사람과 싸우는 것으로 읽혔다
      return true;
    }
    /* 숨은 터(비경) — 입구 곁이면 들어가고(domain.enter), 파도는 🤖 자동 전투가, 끝나면 보상 나무(원기 모자라면 두고 나온다).
       이야기는 domain:clear 로 넘어간다 */
    var DM = global.DG.domain;
    if (DM && DM.active && DM.active()) {
      var rn = DM.run();
      if (rn.phase === 'tree') { var cl = DM.claim(); if (!cl.ok) { DM.leave(); } doing = '숨은 터 보상 ' + (cl.ok ? cl.text : '— ' + cl.why + ' · 두고 나옴'); return true; }
      if (Math.hypot(rn.x - p.x, rn.y - p.y) > DM.ARENA_R(false) * 0.5) { w.walkTo(rn.x, rn.y); }
      doing = '📖 🌀 ' + rn.d.name + ' — ' + (rn.phase === 'wait' ? '곧 적이 나타난다' : '싸우는 중');
      return true;
    }
    /* 사용자 11-12 「멈춤 중간에」 — 이야기 보스(숨은 터)를 못 깨면(시간 끝·쓰러짐) 들어가고 지고를 끝없이 되풀이했다(헤드리스 이무기 13k 그대로).
       두 번 지면 DM_GRIND 초 동안 이야기를 쉬고 들판 사냥(아래 tickMap 기본)으로 힘을 기른 뒤 다시 간다. 손잡이 go.autoGrind 1 */
    if (st.type === 'domain' && dmFail.n >= 2 && +core.tuned('go.autoGrind', 1) && Date.now() - dmFail.at < DM_GRIND * 1000) {
      doing = '📖 ' + (t.label || '보스') + ' 이 아직 버겁다 — 사냥으로 힘을 기르는 중(' + Math.ceil(DM_GRIND - (Date.now() - dmFail.at) / 1000) + '초 뒤 다시)';
      return false;
    }
    if (st.type === 'domain' && DM && d <= DM.ENTER_R(false)) {
      var dObj = st.did ? DM.byId(st.did) : null;
      if (!dObj) { DM.list().forEach(function (x) { if (x.kind === 'weekly' && (!dObj || Math.hypot(x.x - t.x, x.y - t.y) < Math.hypot(dObj.x - t.x, dObj.y - t.y))) { dObj = x; } }); }
      var en = dObj ? DM.enter(dObj, 0) : { ok: false, why: '숨은 터를 못 찾음' };
      w.walkTo(p.x, p.y);
      doing = '📖 🌀 ' + (en.ok ? (dObj.name + ' 들어감') : (t.label + ' — ' + en.why));
      return true;
    }
    /* 채집 — 900m 안에 그 풀이 없으면(다 꺾어 다시 자라는 중·그 풀이 안 나는 지역) story 는 고향을 가리킨다 →
       채집점 자리는 순수 함수라 동심원으로 멀리까지 찾아 가장 가까운 것으로 간다(멀면 순간이동) */
    var CKg = global.DG.cooking;
    if (st.type === 'gather' && CKg) {
      var any = CKg.near(p.x, p.y, 900).some(function (nd) { return nd.item === st.item && CKg.available(nd); });
      if (!any) {
        var far = findNode(CKg, st.item, p);
        if (!far) { doing = '📖 🌿 ' + (st.text || '') + ': 5km 안에 안 난다'; return false; }
        t = { x: far.x, y: far.y, r: 0, label: st.text + '(먼 군락)' }; d = Math.hypot(t.x - p.x, t.y - p.y);
      }
    }
    /* 솥 요리 — 만들 수 있는 요리가 없으면 모자란 재료가 가까이(700m) 나는 요리를 골라 그 채집점으로(곁 1.5m 면 저절로 줍는다),
       있으면 솥으로 가서 보통 품질로 만든다 */
    var CK = global.DG.cooking;
    if (st.type === 'cook' && CK) {
      var ready = null, ri;
      for (ri = 0; ri < CK.ORDER.length && !ready; ri++) { if (CK.cookCheck(CK.ORDER[ri], true).ok) { ready = CK.ORDER[ri]; } }
      if (!ready) {
        var plan = cookPlan(CK, p);
        if (!plan) { doing = '요리 재료가 가까이 안 난다. 순행'; return false; }
        acc.story += dt;
        if (acc.story >= RETARGET) { acc.story = 0; walkToward(w, plan.node.x, plan.node.y, RETARGET); }
        doing = '📖 🌿 ' + CK.RECIPES[plan.rk].name + ' 재료: ' + CK.ITEMS[plan.node.item].name + ' 으로 ' + Math.round(Math.hypot(plan.node.x - p.x, plan.node.y - p.y)) + 'm';
        return true;
      }
      if (CK.atPot()) {
        var made = CK.cook(ready, 1);
        w.walkTo(p.x, p.y);
        doing = '📖 🍲 ' + CK.RECIPES[ready].name + (made ? ' 만듦' : ' 못 만듦');
        return true;
      }
    }
    /* 바람·시간 기둥(sky) — 기둥 안(DRAFT_R)에 서서 점프하면 솟아 섬·관측대에 내려선다(landform) */
    var LFs = global.DG.landform, SKs = global.DG.skyIsle;
    if (st.type === 'sky' && LFs && LFs.glideAlt && LFs.glideAlt() !== null && SKs && SKs.padById) {
      /* 솟는 중 — 섬(발판) 윗면보다 높아지면 섬 쪽으로 활공해 내려선다(섬 가운데는 기둥에서 27m 북쪽) */
      var pad = SKs.padById(st.pad || 'isle');
      if (pad && LFs.glideAlt() > pad.top + 1) { w.walkTo(pad.x, pad.y); doing = '📖 🪂 ' + pad.name + ' 쪽으로 활공'; return true; }
      w.walkTo(p.x, p.y);
      doing = '기둥을 타고 솟는 중';
      return true;
    }
    if (st.type === 'sky' && t.r && d <= t.r * 0.7) {
      w.walkTo(p.x, p.y);
      acc.talk += dt;
      if (LFs && LFs.jump && acc.talk >= 1.2) { acc.talk = 0; LFs.jump(); }
      doing = '📖 🌬️ ' + (st.text || '') + ': 기둥 안에서 점프';
      return true;
    }
    /* ⑲-47 기둥 오르기(기중기·계류 탑·시계탑·등대)와 기둥 위에서만 켜지는 등롱 — 키보드 판은 곁에 닿아도 멈추지 않고 기둥 너머로 걸어
       벽을 계속 민다(밀어야 붙잡고 오른다 · 곁에서 멈추면 영영 못 올랐다). 올라서면 climb 은 story 가 넘기고, 등롱은 아래 불 밝히기로 간다 */
    var LFp = global.DG.landform, poleWant = st.type === 'climb' && st.pole ? st.pole : (st.type === 'light' && st.perch ? st.perch : null);
    if (poleWant && w.mode !== 'geo' && LFp && LFp.perched && (poleWant === true ? !LFp.perched() : LFp.perched() !== poleWant)) {
      /* 밀 기둥 — id 면 그 기둥, pole: true(기중기 다리 둘 중 아무거나)면 가장 가까운 것. 목표 자리(두 다리 사이)로 밀면 어느 다리도 못 붙잡았다 */
      var pg = null;
      if (LFp.polesAll) { LFp.polesAll().forEach(function (q) { if ((poleWant === true || q.id === poleWant) && Math.hypot(q.x - t.x, q.y - t.y) < 60 && (!pg || Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(pg.x - p.x, pg.y - p.y))) { pg = q; } }); }
      var gx = pg ? pg.x : t.x, gy = pg ? pg.y : t.y;
      var pdx = gx - p.x, pdy = gy - p.y, pdl = Math.hypot(pdx, pdy) || 1;
      if (pdl > 12) { acc.story += dt; if (acc.story >= RETARGET) { acc.story = 0; walkToward(w, gx, gy, RETARGET); } }
      else { w.walkTo(gx + pdx / pdl * 6, gy + pdy / pdl * 6); }
      doing = '📖 🧗 ' + (st.text || '') + (pdl > 12 ? ' 으로 ' + Math.round(pdl) + 'm' : ': 기둥을 밀고 오르는 중');
      return true;
    }
    /* 불 밝히기·석등 — 제단(석등은 다음 차례 것) 곁에 서서 원소 스킬(E). 스킬 고리가 닿으면 story.onElement 가 켠다 */
    if (st.type === 'light' || st.type === 'seal') {
      var goal = t;
      if (st.type === 'seal') {
        var lamps = S.sealLamps(st), want = (st.order || S.SEAL_ORDER)[S.sealLit()];
        for (var li = 0; li < lamps.length; li++) { if (lamps[li].k === want) { goal = lamps[li]; } }
      }
      var dg = Math.hypot(goal.x - p.x, goal.y - p.y);
      if (dg <= 1.8) {
        w.walkTo(p.x, p.y);
        var mm = FS && FS.party ? FS.party[FS.active] : null;
        if (mm && mm.skillCd <= 0 && FC.act) { FC.act('skill'); }
        doing = '📖 ✨ ' + (st.text || '') + ': 원소 스킬' + (mm && mm.skillCd > 0 ? ' (' + mm.skillCd.toFixed(1) + '초)' : '');
        return true;
      }
      acc.story += dt;
      if (acc.story >= RETARGET) { acc.story = 0; walkToward(w, goal.x, goal.y, RETARGET); }
      doing = '📖 ' + (st.text || st.type) + ' 으로 ' + Math.round(dg) + 'm';
      return true;
    }
    if (S.isTalk(st) && d <= t.r) {
      w.walkTo(p.x, p.y);
      if (!S.talkStart()) { doing = '📖 ' + t.label + ' 곁: 말을 걸 수 없는 때(다른 창)'; }
      return true;
    }
    /* 멀면(600m+) 목표에 더 가까운 순간이동 지점으로 뛴다 — 사람이 지도(M)에서 누르는 것과 같은 길(overworld.jump, 키보드 판만) */
    var OW = global.DG.overworld;
    if (d > WARP_MIN && w.mode === 'keyboard' && OW && OW.nearestWay && OW.jump) {
      var nw = OW.nearestWay(t.x, t.y);
      if (nw && nw.d + 150 < d && OW.jump(nw.key)) { doing = '📖 🌀 ' + nw.name + ' 으로 순간이동: ' + (t.label || st.text || ''); return true; }
    }
    acc.story += dt;
    /* 쫓기(도둑이 초속 13m)·따라가기는 매 프레임 목표를 고친다 — 쫓기는 달려야 따라잡는다 */
    var chasing = st.type === 'chase' || st.type === 'follow';
    if (acc.story >= RETARGET || chasing) {
      var gap = acc.story;
      acc.story = 0;
      patrol = null; aimUid = null;
      /* 반지름이 있는 목표(대화·가기·오르기)는 그 안까지, 없는 것(무찌르기·결투)은 그 자리로 */
      walkToward(w, t.x, t.y, gap, st.type === 'chase');
    }
    doing = '📖 ' + (t.label || st.text || st.type) + ' 으로 ' + Math.round(d) + 'm';
    return true;
  }

  function tickMap(dt) {
    var w = global.DG.world;
    if (global.DG.encounter.active) { doing = '조우 화면이 열려 있습니다'; return; }
    /* W-0586 ② 사건 창(같은 #encounter 칸)이 떠 있으면 멈춘다 — 11-10 직접 해 봄: 창이 뜬 채로 777m → 289m 를 걸어갔다. 걷던 걸음도 세운다 */
    var EV = global.DG.event;
    if (EV && EV.live) {
      doing = '사건 창이 열려 있습니다'; if (w && w.walkTo) { var sp = core.save.player.pos; w.walkTo(sp.x, sp.y); }
      /* 사용자 11-12 「자동퀘스트면 대화도 넘기고 계속 이어해줘야지 · 멈춤 중간에」 — 사건 창이 뜨면 자동이 영영 서 있었다(헤드리스 3분+).
         읽을 틈(EV_READ 초) 뒤 싸움 아닌 첫 고르기(없으면 첫째)를 고르고, 결과 창도 EV_READ 초 뒤 닫는다. 손잡이 go.autoEvent 1(0 = 옛 멈춤) */
      if (+core.tuned('go.autoEvent', 1) && EV.choose) {
        acc.ev = (acc.ev || 0) + dt;
        if (acc.ev >= EV_READ) {
          acc.ev = 0; var L = EV.live, cs = L.ev.choices || [], ci = cs.filter(function (c) { return !c.fight; })[0] || cs[0];
          if (ci) { EV.choose(ci.id); evShown = !EV.live; doing = '사건: ' + L.ev.name + ' — ' + String(ci.label).slice(0, 20); }
        }
      }
      return;
    }
    if (evShown) {   // 자동이 고른 사건의 결과 창 — 읽을 틈 뒤 닫고 잇는다
      var host = global.document && global.document.getElementById('encounter');
      if (!host || !host.classList.contains('show') || (global.DG.encounter && global.DG.encounter.active)) { evShown = false; acc.ev = 0; }
      else { acc.ev = (acc.ev || 0) + dt; doing = '사건 결과를 읽는 중'; if (w && w.walkTo) { var sp2 = core.save.player.pos; w.walkTo(sp2.x, sp2.y); } if (acc.ev >= EV_READ) { acc.ev = 0; evShown = false; EV.close(); } return; }
    }
    if (on('story')) {
      /* 자동이 새면 game.js 루프(다음 프레임 예약)까지 멎는다 — 이야기 한 박자는 통째로 감싼다 */
      try { if (tickStory(dt)) { return; } } catch (e) { doing = '자동 이야기 오류: ' + e.message; if (global.console) { console.warn('[auto] tickStory', e); } }
    }

    acc.aim += dt;
    if (acc.aim >= RETARGET) {
      acc.aim = 0;
      var t = bestTarget();
      if (t) {
        aimUid = t.uid;
        patrol = null;
        walkToward(w, t.x, t.y, RETARGET);   // 11-12 사냥·순행 걸음도 막히면 길 찾기(W-0649) — 벽에 붙어 서 있었다
        var dist = Math.hypot(t.x - core.save.player.pos.x, t.y - core.save.player.pos.y);
        doing = (t.kind === 'hero' ? '🤝 ' : '🐾 ') + t.ref.name +
          '(' + global.DG.data.rarity[t.ref.rarity].name + ') 으로 ' + Math.round(dist) + 'm';
      } else {
        aimUid = null;
        var pos = core.save.player.pos;
        /* 상대할 대상이 없다 = 밑천이 없다는 뜻이 대부분이다.
           채워진 역참이 있으면 순행보다 그쪽이 빠르다. */
        var stt = on('stop') ? bestStation() : null;
        if (stt) {
          patrol = null;
          walkToward(w, stt.x, stt.y, RETARGET);
          doing = '🏮 ' + stt.name + ' 으로 ' +
            Math.round(Math.hypot(stt.x - pos.x, stt.y - pos.y)) + 'm: 보급을 받으러';
        } else {
          if (!patrol || Math.hypot(patrol.x - pos.x, patrol.y - pos.y) < 8) { repatrol(); }
          walkToward(w, patrol.x, patrol.y, RETARGET);
          doing = '순행: 보급을 모으는 중 (📜' + core.save.items.scroll +
            ' 🍖' + core.save.items.feed + ')';
        }
      }
    }

    /* 사거리 안의 성채 — 이길 만하면 도전하고, 내 것이면 공물을 걷는다 */
    acc.fort += dt;
    if (on('fort') && acc.fort >= 2.2) {
      acc.fort = 0;
      var nf = w.nearestFort();
      if (nf && nf.inRange) {
        /* 적장이 들었으면 성채보다 그쪽이 먼저다 */
        var rd = global.DG.raid.current(nf.fort);
        if (rd) {
          var rr = global.DG.raid.autoFight(rd);
          if (rr) {
            core.emit('toast', rd.hero.name +
              (rr.win ? (rr.caught ? ' 격파·등용!' : ' 격파!') : ' 격파 실패'));
          }
          return;
        }
        var act = global.DG.fort.autoAct(nf.fort);
        if (act && act.did === 'fight') {
          core.emit('toast', nf.fort.name + (act.win ? ' 점령!' : ' 공략 실패'));
        } else if (act && act.did === 'collect') {
          core.emit('toast', nf.fort.name + ' 공물 금 +' + act.gold);
        }
      }
    }

    /* 지나는 길에 채워진 역참이 있으면 들른다 (밑천이 넉넉해도 원작처럼 줍고 간다) */
    acc.stop += dt;
    if (on('stop') && acc.stop >= 1.3) {
      acc.stop = 0;
      var ns = w.nearestStation();
      if (ns && ns.inRange) {
        /* 적도가 들어 있으면 보급보다 그쪽이 먼저다 — 이길 만할 때만 붙는다.
           (성채에서 적장이 성채보다 먼저인 것과 같은 손) */
        var R = global.DG.rogue;
        var rg = R ? R.at(ns.station) : null;
        if (rg) {
          var rres = R.autoFight(rg);
          if (rres) {
            core.emit('toast', rg.station.name +
              (rres.win ? ' 탈환! · 🌑 ' + rres.dark.name + ' 이(가) 남았다' : ' 탈환 실패'));
          }
          return;
        }
        if (global.DG.station.stateOf(ns.station.key).ready) {
          var got = global.DG.station.autoVisit(ns.station);
          if (got.ok) {
            core.emit('toast', got.name + ': 등용서 +' + got.reward.scroll +
              ' · 🍖 +' + got.reward.feed + ' · 🪙 +' + got.reward.gold);
          }
        }
      }
    }

    /* 사거리 안이면 상대한다 — 확률은 미니게임 규칙 그대로 */
    acc.meet += dt;
    if (on('meet') && acc.meet >= 1.1) {
      acc.meet = 0;
      var n = w.nearest();
      if (n && n.inRange && affordable(n.spawn)) {
        global.DG.encounter.autoResolve(n.spawn);
      }
    }
  }

  /* ── 승급 · 장비 ──────────────────────────────────────── */

  /** 승급 조건을 채운 인물 중 등급이 높은 쪽부터 한 명 */
  function autoRankUp() {
    var ids = Object.keys(core.save.dex.heroes), best = null, bestR = -1, i;
    for (i = 0; i < ids.length; i++) {
      var chk = global.DG.hero.rankUpCheck(ids[i]);
      if (!chk.ok) { continue; }
      var h = global.DG.data.find(ids[i]);
      var score = h ? h.rarity : 0;
      if (score > bestR) { bestR = score; best = ids[i]; }
    }
    if (best) {
      global.DG.hero.rankUp(best);
      if (global.DG.perk) { global.DG.perk.autoPick(best); }    // 자동은 첫 카드(PLAN §5 ⑦)
      return true;
    }
    return false;
  }

  function tickGrow(dt) {
    acc.grow += dt;
    if (acc.grow < 6) { return; }
    acc.grow = 0;
    autoRankUp();
    /* 받아만 둔 천거장은 걸어도 줄지 않는다 — 빈 칸이 있으면 채워 둔다 */
    global.DG.letter.autoFill();
  }

  /* ── 길조 유지 ────────────────────────────────────────── */

  function tickOmen(dt) {
    acc.omen += dt;
    if (acc.omen < 30) { return; }
    acc.omen = 0;
    if (!global.DG.net.online()) { return; }
    if (global.DG.ai.buffLeft() > 30) { return; }     // 아직 살아 있으면 아낀다
    global.DG.ai.omen();
  }

  /* ── 매 프레임 ────────────────────────────────────────── */

  function update(dt) {
    if (!active()) { return; }
    tickMap(dt);
    if (on('grow')) { tickGrow(dt); }
    if (on('omen')) { tickOmen(dt); }
  }

  function status() {
    return {
      on: active(), doing: doing,
      flags: st(),
      aim: aimUid
    };
  }

  global.DG = global.DG || {};
  global.DG.auto = {
    FLAGS: FLAGS, flagByKey: flagByKey,
    state: st, active: active, on: on,
    setOn: setOn, toggle: toggle, toggleFlag: toggleFlag,
    update: update, status: status,
    /** 자가진단용 — 한 판단만 굴려 본다 */
    _tickMap: tickMap, _autoRankUp: autoRankUp, _tickStory: tickStory,
    /** W-0337 자동 퀘스트가 더 멀리 비켜 가게 — walkToward 가 4초까지 이 자리로 간다 */
    _sidestep: function (x, y) { stuck.side = { x: x, y: y }; stuck.t = 0; }, _planPath: planPath, _path: function () { return path; }, _walkToward: walkToward
  };
})(window);
