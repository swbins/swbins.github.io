/**
 * 1만리 들판 전투 화면 — HUD(편성 칸·막대·조준·숫자), 3D 원(예고·광역)·표식, 길게 누르기·낙하 착지 화면 쪽. field-combat.js 에서 떼어 냄(R-4 11-17).
 * 몸통은 글자 그대로(바뀌는 이름 S, hudEl, numLayer 만 U.이름() — 부를 때마다). 바깥 이름은 U 로 받는다(같은 객체·함수). 원래 파일은 같은 이름 한 줄 넘김(처음 부를 때 make).
 */
(function (global) {
  'use strict';

  global.DG = global.DG || {};
  global.DG.fieldHud = { make: function (U) {
  function core() { return global.DG.core; }   // field-combat.js 와 같은 꼴(함수)
  var AIM_FULL = U.AIM_FULL, CHARGE_HOLD = U.CHARGE_HOLD, EL = U.EL, ENERGY_MAX = U.ENERGY_MAX, FOES = U.FOES, SHAPES = U.SHAPES, SKILL_CD = U.SKILL_CD, W3 = U.W3, act = U.act, active = U.active, aimEnd = U.aimEnd, aimShoot = U.aimShoot, aimSteer = U.aimSteer, canAim = U.canAim, data = U.data, drain = U.drain, engaged = U.engaged, ensureState = U.ensureState, fieldSave = U.fieldSave, fx = U.fx, handle = U.handle, living = U.living, lvAddOf = U.lvAddOf, nearestFoe = U.nearestFoe, on = U.on, paintAuto = U.paintAuto, plunge = U.plunge, setHudEl = U.setHudEl, setNumLayer = U.setNumLayer, toast = U.toast, toggleAuto = U.toggleAuto;

  /* ── 화면: HUD ────────────────────────────────────────── */
  function hide() {
    if (U.hudEl()) { U.hudEl().classList.remove('show'); }
    if (document.body) { document.body.classList.remove('fc-on'); }
  }

  function buildHud() {
    setHudEl(document.getElementById('field-hud'));
    if (!U.hudEl()) {
      setHudEl(document.createElement('div'));
      U.hudEl().id = 'field-hud';
      document.body.appendChild(U.hudEl());
    }
    U.hudEl().innerHTML =
      '<div class="fc-party"></div>' +
      '<div class="fc-acts">' +
        '<div class="fc-sta"><i></i></div>' +
        '<button class="fc-btn fc-burst" data-fc="burst"><span>폭발</span><em>Q</em><i class="fc-fill"></i></button>' +
        '<button class="fc-btn fc-skill" data-fc="skill"><span>스킬</span><em>E</em><i class="fc-cd"></i></button>' +
        '<button class="fc-btn fc-dodge" data-fc="dodge"><span>회피</span><em>␣</em></button>' + '<button class="fc-btn fc-grab" data-fc="grab" title="잡기·던지기: 가까운 잡몹을 잡아 던진다(보스는 밀치기)"><span>✊</span><em>C</em></button>' +   // W-0277
        '<button class="fc-btn fc-atk" data-fc="attack"><span>⚔️</span><em>J</em></button>' +
        '<button class="fc-btn fc-aim" data-fc="aim" style="display:none"><span>🎯</span><em>R</em></button>' + '<button class="fc-btn fc-auto" data-fc="auto" title="자동 사냥: 다가가 싸운다"><span>자동</span></button>' +
      '</div>';
    var btns = U.hudEl().querySelectorAll('[data-fc]');
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener('pointerdown', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          var k = b.getAttribute('data-fc'), r = k === 'auto' ? toggleAuto() : act(k);   // W-0236
          if (k === 'attack' && !(r && r.plunge)) { holdStart(); }                // ⑲-2 누르고 있으면 강공격
        });
        if (b.getAttribute('data-fc') === 'attack') {
          ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { b.addEventListener(t, holdEnd); });
        }
      })(btns[i]);
    }
    setNumLayer(document.createElement('div'));
    U.numLayer().className = 'fc-nums';
    U.hudEl().appendChild(U.numLayer());
    partyKeyPainted = ''; paintAuto();
  }

  var partyKeyPainted = '';
  function paintParty() {
    var box = U.hudEl().querySelector('.fc-party');
    var key = U.S().party.map(function (m) { return m.id; }).join(',');
    if (key !== partyKeyPainted) {
      partyKeyPainted = key;
      var P3 = global.DG.portrait3d, html = '<div class="fc-guard"><i></i><b></b></div>';   // ⑲-1 결정 보호막 띠
      for (var i = 0; i < U.S().party.length; i++) {
        var m = U.S().party[i], h = m.id === '_me' ? null : data().find(m.id);
        var face = h && P3 && P3.img ? P3.img('hero', h, 40) : '<b>' + EL[m.el].icon + '</b>';
        html += '<button class="fc-mem" data-idx="' + i + '" style="--el:' + EL[m.el].color + '">' +
          '<span class="fc-face">' + face + '</span>' +
          '<span class="fc-meta"><small>' + (i + 1) + ' · ' + EL[m.el].icon + ' ' + m.name + '</small>' +
          '<span class="fc-hp"><i></i></span><span class="fc-en"><i></i></span></span></button>';
      }
      box.innerHTML = html;
      var mb = box.querySelectorAll('.fc-mem');
      for (var j = 0; j < mb.length; j++) {
        (function (b) {
          b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); act('swap', +b.getAttribute('data-idx')); });
        })(mb[j]);
      }
    }
    var gd = box.querySelector('.fc-guard');
    if (gd) {
      gd.classList.toggle('on', !!U.S().guard);
      if (U.S().guard) {
        gd.querySelector('i').style.width = Math.round(100 * U.S().guard.hp / U.S().guard.max) + '%';
        gd.querySelector('b').textContent = '🪨 ' + U.S().guard.hp + ' · ' + Math.ceil(U.S().guard.t) + '초';
      }
    }
    var rows = box.querySelectorAll('.fc-mem');
    for (var k = 0; k < rows.length; k++) {
      var mm = U.S().party[k];
      if (!mm) { continue; }
      rows[k].classList.toggle('on', k === U.S().active);
      rows[k].classList.toggle('down', mm.down);
      rows[k].querySelector('.fc-hp i').style.width = Math.round(100 * mm.hp / mm.hpMax) + '%';
      rows[k].querySelector('.fc-en i').style.width = Math.round(100 * mm.energy / ENERGY_MAX()) + '%';
    }
  }

  function paint(dt) {
    var pp = core().save.player.pos, TR = global.DG.treasure;
    var show = engaged(U.S()) || !!nearestFoe(U.S(), pp.x, pp.y, 22 * U.KDV()) || !!(TR && TR.wantsHud && TR.wantsHud(pp.x, pp.y)) || !!U.S().aim;   // ⑲-3 석등 곁에서도 스킬을 쓰게
    if (!U.hudEl()) { buildHud(); }
    U.hudEl().classList.toggle('show', show);
    document.body.classList.toggle('fc-on', show);
    paintMarks();
    tickRings(dt);
    paintAim();
    if (!show) { return; }
    var ab = U.hudEl().querySelector('.fc-aim');                          // ⑲-22 활 인물일 때만 🎯
    if (ab) { ab.style.display = canAim(U.S()) && aimOk() ? '' : 'none'; ab.classList.toggle('ready', !!U.S().aim); } var gb = U.hudEl().querySelector('.fc-grab'); if (gb && global.DG.fieldGrab) { gb.classList.toggle('near', !!global.DG.fieldGrab.target(U.S(), pp.x, pp.y)); gb.classList.toggle('cd', U.S().grabCd > 0); }   // W-0277 잡을 적이 가까울 때만 빛남
    /* ⑲-1 원소가 일곱으로 늘며 동행 원소가 새로 정해졌다 — 처음 한 번만 알린다(save.field.el7) */
    var fsv = fieldSave();
    if (!fsv.el7) { fsv.el7 = 1; toast('원소가 일곱 가지가 되어 동행마다 원소를 다시 정했다'); core().persist(); }
    paintParty();
    var m = active(U.S());
    var sk = U.hudEl().querySelector('.fc-skill'), bu = U.hudEl().querySelector('.fc-burst');
    sk.style.setProperty('--el', EL[m.el].color);
    bu.style.setProperty('--el', EL[m.el].color);
    sk.querySelector('.fc-cd').style.height = Math.round(100 * Math.min(1, m.skillCd / (m.skCdMax || SKILL_CD()))) + '%';
    var skT = sk.querySelector('span'), skS = m.skillCd > 0 ? m.skillCd.toFixed(1) : EL[m.el].icon + ' ' + (m.kitS ? m.kitS.name : (SHAPES[m.shape] && m.shape !== 'circle' ? SHAPES[m.shape].name : '스킬')); if (skT.textContent !== skS) { skT.textContent = skS; }   // 11-12 W-0647 같은 글이면 안 씀(매 프레임 글 노드 교체 = 배치 다시)
    var ready = m.energy >= ENERGY_MAX() && m.burstCd <= 0;
    bu.classList.toggle('ready', ready);
    bu.querySelector('.fc-fill').style.height = Math.round(100 * m.energy / ENERGY_MAX()) + '%';
    U.hudEl().querySelector('.fc-sta i').style.width = Math.round(U.S().stamina) + '%';
    paintBars();
  }

  /* ⑲-22 조준 화면 — 가운데 조준점 + 충전 막대(DOM), 잠긴 것 발밑 금빛 고리 · 날아가는 화살(3D, 코드 그림) */
  var aimEl = null;
  function paintAim() {
    var a = U.S().aim, w = W3(), T3 = w && w.three();
    if (!aimEl && document.body) {
      aimEl = document.createElement('div');
      aimEl.id = 'fc-aim';
      aimEl.style.cssText = 'position:fixed;left:50%;top:44%;transform:translate(-50%,-50%);pointer-events:none;z-index:40;display:none;text-align:center;' +
        'font:700 26px/1 sans-serif;color:#fff;text-shadow:0 0 4px #000';
      aimEl.innerHTML = '<div class="a-dot">◎</div><div style="width:84px;height:5px;margin:6px auto 0;background:rgba(0,0,0,.45);border-radius:3px;overflow:hidden">' +
        '<i style="display:block;height:100%;width:0;background:#e8e2d0"></i></div>';
      document.body.appendChild(aimEl);
    }
    if (aimEl) {
      aimEl.style.display = a ? '' : 'none';
      if (a) {
        var k = Math.min(1, a.t / AIM_FULL()), full = a.hold && k >= 1, bar = aimEl.querySelector('i');
        bar.style.width = Math.round((a.hold ? k : 0) * 100) + '%';
        bar.style.background = full ? (EL[active(U.S()).el] ? EL[active(U.S()).el].color : '#ffd24a') : '#e8e2d0';
        aimEl.querySelector('.a-dot').style.color = a.lock ? '#ffd24a' : '#ffffff';
      }
    }
    if (!w || !T3) { return; }
    if (a && a.lock) {
      if (!fx.aimRing) { fx.aimRing = ringMesh(1.1, '#ffd24a', 0.9); if (fx.aimRing) { w.addFx(fx.aimRing); } }
      if (fx.aimRing) { fx.aimRing.visible = true; fx.aimRing.position.set(a.lock.x, (w.standY ? w.standY(a.lock.x, a.lock.y) : 0) + 0.15, a.lock.y); }
    } else if (fx.aimRing) { fx.aimRing.visible = false; }
    var A = U.S().arrows || [];
    if (!fx.arrows) { fx.arrows = []; }
    while (fx.arrows.length < A.length) {
      var am = new T3.Mesh(new T3.CylinderGeometry(0.03, 0.03, 0.9, 5), new T3.MeshBasicMaterial({ color: 0xf2ead8 }));
      am.rotation.order = 'YXZ';
      fx.arrows.push(w.addFx(am));
    }
    for (var i = 0; i < fx.arrows.length; i++) {
      var mesh = fx.arrows[i], r = A[i];
      mesh.visible = !!r;
      if (!r) { continue; }
      mesh.position.set(r.x, (w.standY ? w.standY(r.x, r.y) : 0) + 1.35, r.y);
      mesh.rotation.set(Math.PI / 2, Math.atan2(r.dx, r.dy), 0);
      mesh.material.color.set(r.full && EL[r.m.el] ? EL[r.m.el].color : '#f2ead8');
    }
  }

  /* 3D 좌표 → 화면 좌표. 3D 가 없으면 null(2D 에선 숫자를 내 머리 위에 띄운다) */
  function toScreen(x, y, up) {
    var w = W3();
    if (!w) { return null; }
    var T3 = w.three(), cam = w.camNode();
    if (!T3 || !cam) { return null; }
    var gy = w.standY ? w.standY(x, y) : (w.groundY ? w.groundY(x, y) : 0);
    var v = new T3.Vector3(x, gy + (up || 2), y).project(cam);
    if (v.z > 1) { return null; }
    return { x: (v.x + 1) / 2 * global.innerWidth, y: (1 - v.y) / 2 * global.innerHeight };
  }

  /* W-0369 글자 자리 나눔 — 0.9초 안에 뜬 글자 사각형과 겹치면 위로 민다(붙어 싸우면 "183" 과 "불꽃 돌진" 이 한 자리에 겹쳤다). 순수 — list [{x,y,w,h,t}] 를 제자리에서 갈고 담는다 */ function numPlace(list, x, y, w, h, now) { var i, r, hit = true, k = 0; for (i = list.length - 1; i >= 0; i--) { if (now - list[i].t > 900) { list.splice(i, 1); } } while (hit && k++ < 8) { hit = false; for (i = 0; i < list.length; i++) { r = list[i]; if (Math.abs(r.x - x) * 2 < r.w + w && Math.abs(r.y - y) * 2 < r.h + h) { y = r.y - (r.h + h) / 2 - 2; hit = true; } } } list.push({ x: x, y: y, w: w, h: h, t: now }); return y; } var numRects = []; function floatNum(x, y, text, el, scale, bold, mine) {
    if (!U.numLayer() || global.DG_NO_DRAW) { return; }
    var p = toScreen(x, y, 2.4) || { x: global.innerWidth / 2 + (Math.random() - 0.5) * 60, y: global.innerHeight * 0.42 };
    var n = document.createElement('span'), fz = Math.round(16 * (scale || 1)), nx = Math.round(p.x + (mine && bold ? 0 : (Math.random() - 0.5) * 24)), ny = p.y - (mine && bold ? fz * 2.2 : 0);   /* W-0369 내 몸 위 이름 글자(스킬·강공격·회피)는 한 줄 위 */
    n.className = 'fc-num' + (bold ? ' big' : '') + (mine ? ' mine' : ''); ny = numPlace(numRects, nx, ny, String(text).length * fz * 0.62 + 6, fz * 1.25, Date.now());
    n.textContent = text;
    n.style.left = nx + 'px';
    n.style.top = Math.round(ny) + 'px';
    n.style.color = el ? EL[el].color : (mine ? '#ff8080' : '#ffe9a8');
    n.style.fontSize = fz + 'px';
    U.numLayer().appendChild(n);
    setTimeout(function () { if (n.parentNode) { n.parentNode.removeChild(n); } }, 900);
  }

  var barEls = {};
  function paintBars() {
    var seen = {}, L = living(U.S()), pos = core().save.player.pos;
    for (var i = 0; i < L.length; i++) {
      var f = L[i];
      if (Math.hypot(f.x - pos.x, f.y - pos.y) > 30) { continue; }
      var F = FOES[f.kind];
      var p = toScreen(f.x, f.y, F.h * 1.9 + 0.4);
      if (!p) { continue; }
      var b = barEls[f.uid];
      if (!b) {
        b = barEls[f.uid] = document.createElement('div');
        b.className = 'fc-bar' + (F.boss || F.hero ? ' boss' : '');
        b.innerHTML = '<small></small><span class="fc-bhp"><i></i></span><span class="fc-bsh"><i></i></span>';
        U.numLayer().appendChild(b); if ((F.boss || F.hero) && global.DG.bossIntro) { global.DG.bossIntro.play(f, f.name, f.tier * 5 + lvAddOf(f.wl)); }   // W-0551 보스 등장 컷(처음 한 번)
      }
      seen[f.uid] = true;
      b.style.left = Math.round(p.x) + 'px';
      b.style.top = Math.round(p.y) + 'px';
      var layerTxt = f.layers && f.layers.length > 1 && f.shield > 0 ? ' 🛡️' + f.layers.slice(f.layer).map(function (x) { return EL[x].icon; }).join('') : '';
      b.querySelector('small').textContent = (global.DG.fieldWeak ? global.DG.fieldWeak.tag(f) : '') + (f.aura ? EL[f.aura].icon + ' ' : '') + f.name + ' Lv.' + (f.tier * 5 + lvAddOf(f.wl)) + layerTxt + (f.stun > 0 ? ' 💫' : '');
      b.querySelector('.fc-bhp i').style.width = Math.round(100 * f.hp / f.hpMax) + '%';
      var sh = b.querySelector('.fc-bsh');
      sh.style.display = f.shieldMax ? '' : 'none';
      if (f.shieldMax) {
        sh.querySelector('i').style.width = Math.round(100 * f.shield / f.shieldMax) + '%';
        sh.style.setProperty('--el', EL[f.shEl].color);
      }
    }
    for (var k in barEls) {
      if (barEls.hasOwnProperty(k) && !seen[k]) {
        if (barEls[k].parentNode) { barEls[k].parentNode.removeChild(barEls[k]); }
        delete barEls[k];
      }
    }
  }

  /* ── 화면: 3D 원(예고·광역) ─────────────────────────────── */
  function ringMesh(r, color, opacity) {
    var w = W3(), T3 = w && w.three();
    if (!T3) { return null; }
    var g = new T3.RingGeometry(Math.max(0.05, r - 0.18), r, 40);
    g.rotateX(-Math.PI / 2);
    var mat = new T3.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, depthWrite: false, side: T3.DoubleSide });
    var mesh = new T3.Mesh(g, mat);
    mesh.renderOrder = 5;
    return mesh;
  }
  function ring(x, y, r, color, life) {
    var w = W3(); if (!w && global.DG.juice2d) { global.DG.juice2d.ring(x, y, r, color, life); }   // W-0660 2D 고리
    if (!w || global.DG_NO_DRAW) { return; }
    var mesh = ringMesh(r, color, 0.9);
    if (!mesh) { return; }
    mesh.position.set(x, (w.standY ? w.standY(x, y) : (w.groundY ? w.groundY(x, y) : 0)) + 0.12, y);
    mesh.scale.setScalar(0.35);
    w.addFx(mesh);
    fx.rings.push({ mesh: mesh, t: 0, life: life || 0.4 });
  }
  function tickRings(dt) {
    var w = W3();
    for (var i = fx.rings.length - 1; i >= 0; i--) {
      var R = fx.rings[i];
      R.t += dt;
      var k = Math.min(1, R.t / R.life);
      R.mesh.scale.setScalar(0.35 + 0.65 * Math.sqrt(k));
      R.mesh.material.opacity = 0.9 * (1 - k);
      if (k >= 1) {
        if (w) { w.removeFx(R.mesh); }
        R.mesh.geometry.dispose(); R.mesh.material.dispose();
        fx.rings.splice(i, 1);
      }
    }
  }
  /** 적 예고 — 떨어질 자리를 붉은 원으로. 예고가 차오를수록 짙어진다 */
  function paintMarks() {
    var w = W3(), seen = {}, k;
    if (!w) { return; }
    var L = living(U.S());
    for (var i = 0; i < L.length; i++) {
      var f = L[i];
      if (!f.mark) { continue; }
      /* ⑲-16 밀물처럼 원이 여럿이면 원마다 표식 하나(키 uid:j) */
      var ML = f.mark.list || [f.mark];
      for (var j = 0; j < ML.length; j++) { paintMark(w, f, ML[j], j ? f.uid + ':' + j : f.uid, seen); }
    }
    for (k in fx.marks) {
      if (fx.marks.hasOwnProperty(k) && !seen[k]) {
        var mm = fx.marks[k];
        if (mm) { w.removeFx(mm); mm.geometry.dispose(); mm.material.dispose(); }
        delete fx.marks[k];
      }
    }
  }
  function paintMark(w, f, q, key, seen) {
    seen[key] = true;
    var M = fx.marks[key];
    if (!M) {
      M = fx.marks[key] = ringMesh(f.mark.r, '#ff3b3b', 0.3);
      if (!M) { return; }
      var T3 = w.three();
      /* ⑲-20 고리는 안쪽이 빈 판 + 안쪽 테 — 빈 곳이 피할 자리다 */
      var disk = new T3.Mesh((f.mark.inner ? new T3.RingGeometry(f.mark.inner, f.mark.r, 48) : new T3.CircleGeometry(f.mark.r, 40)).rotateX(-Math.PI / 2),
        new T3.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: 0.15, depthWrite: false, side: T3.DoubleSide }));
      M.add(disk);
      if (f.mark.inner) { var inn = ringMesh(f.mark.inner, '#ff3b3b', 0.8); if (inn) { M.add(inn); } }
      M.userData.disk = disk; M.userData.halo = !!f.mark.inner;
      w.addFx(M);
    }
    M.position.set(q.x, (w.standY ? w.standY(q.x, q.y, !!f.sky) : (w.groundY ? w.groundY(q.x, q.y) : 0)) + 0.1, q.y);
    var prog = 1 - Math.max(0, f.stT) / (f.mark.t || 1);
    M.material.opacity = 0.35 + 0.55 * prog;
    M.userData.disk.scale.setScalar(M.userData.halo ? 1 : Math.max(0.05, prog));
    M.userData.disk.material.opacity = 0.18 + 0.2 * prog;
  }

  /* ⑲-2 공격 누르고 있기 — 0.4초 넘으면 강공격 한 번(떼면 풀린다) */
  var holdTimer = null;
  function holdStart() {
    holdEnd();
    holdTimer = setTimeout(function () { holdTimer = null; act('heavy'); }, CHARGE_HOLD() * 1000);
  }
  function holdEnd() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    /* ⑲-22 조준 충전 중에 떼면 쏜다 — 길게 눌러 들어온 조준이면 쏘고 나온다 */
    if (U.S() && U.S().aim && U.S().aim.hold && on() && core() && core().save) {
      var pos = core().save.player.pos, auto = U.S().aim.auto;
      aimShoot(U.S(), pos.x, pos.y);
      if (auto) { aimEnd(U.S()); }
      handle(drain(U.S()), pos);
    }
  }
  /** ⑲-22 조준은 키보드 판만(GPS 판은 몸이 걷는다) */
  function aimOk() { var W = global.DG.world; return !!(W && W.mode === 'keyboard'); }
  /** landform 이 걸음 대신 부른다 — 조준 중이면 방향 키가 겨눈 쪽을 돌린다 */
  function aimSteerRt(ux, uy, dt) { return !!(U.S() && U.S().aim && aimSteer(U.S(), ux, uy, dt)); }
  function aimView() {
    if (!U.S() || !U.S().aim) { return null; }
    var a = U.S().aim;
    return { dx: a.dx, dy: a.dy, t: a.t, hold: a.hold, full: a.hold && a.t >= AIM_FULL() - 1e-9, k: Math.min(1, a.t / AIM_FULL()), lock: a.lock };
  }
  /** ⑲-2 landform 이 내리꽂기 착지 때 부른다 — 떨어진 높이(m) */
  function plungeLand(fell) {
    if (!on() || !core() || !core().save) { return { ok: false }; }
    ensureState();
    var pos = core().save.player.pos, r = plunge(U.S(), pos.x, pos.y, fell);
    handle(drain(U.S()), pos);
    return r;
  }


  return { numPlace: numPlace, floatNum: floatNum, hide: hide, buildHud: buildHud, paintParty: paintParty, paint: paint, paintAim: paintAim, toScreen: toScreen, paintBars: paintBars, ringMesh: ringMesh, ring: ring, tickRings: tickRings, paintMarks: paintMarks, paintMark: paintMark, holdStart: holdStart, holdEnd: holdEnd, aimOk: aimOk, aimSteerRt: aimSteerRt, aimView: aimView, plungeLand: plungeLand };
  } };
})(window);
