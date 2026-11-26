// 미니게임 공통 틀 — 장소 하나 · 내 인물 · 단추 몇 개 · 오늘 기록. 게임 파일은 start(G) 하나만 부른다.
import * as THREE from 'three';
import {makeChibi, animateChibi, doAct} from './chibi.js';
import {startLive, myScarf} from './live.js';
export {THREE, doAct};

const CSS = `
html,body{margin:0;height:100%;overflow:hidden;background:#1a2030;font-family:"Pretendard","Malgun Gothic",sans-serif;color:#2b2620}
canvas{display:block;touch-action:none}
.hud{position:fixed;left:12px;top:12px;right:12px;display:flex;gap:8px;align-items:center;z-index:5;flex-wrap:wrap}
.chip{background:#f4ecdc;border:1.5px solid #2b2620;border-radius:4px;padding:6px 10px;font-size:13px;box-shadow:2px 2px 0 #2b2620}
.btn{background:#f4ecdc;border:1.5px solid #2b2620;border-radius:4px;padding:8px 14px;font-size:14px;cursor:pointer;box-shadow:2px 2px 0 #2b2620;font-family:inherit;color:#2b2620}
.btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #2b2620}
.btn.main{background:#c9472f;color:#fff8ec}
#acts{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);display:flex;gap:10px;z-index:5}
#acts .btn{width:66px;height:62px;padding:4px 0 0;font-size:22px;line-height:1.1;display:flex;flex-direction:column;align-items:center;justify-content:center}
#acts .btn small{font-size:11px;margin-top:3px}
#toast{position:fixed;left:50%;top:64px;transform:translateX(-50%);background:#2b2620;color:#f4ecdc;padding:8px 14px;border-radius:4px;font-size:14px;opacity:0;transition:opacity .3s;z-index:6;pointer-events:none;max-width:86vw;text-align:center}
#stamp{position:fixed;left:50%;top:40%;width:170px;height:170px;margin:-85px 0 0 -85px;border:6px double #c9472f;border-radius:50%;color:#c9472f;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;z-index:7;pointer-events:none;opacity:0;transform:scale(2.2) rotate(-14deg);transition:transform .25s cubic-bezier(.2,1.6,.4,1),opacity .2s;background:rgba(244,236,220,.88);text-align:center}
#stamp.on{opacity:1;transform:scale(1) rotate(-14deg)}
#stamp b{font-size:28px;letter-spacing:2px}#stamp span{font-size:15px;margin-top:6px;padding:0 14px}
.panel{position:fixed;inset:0;background:rgba(10,14,24,.55);display:none;align-items:center;justify-content:center;z-index:10}
.card{background:#f4ecdc;border:2px solid #2b2620;box-shadow:4px 4px 0 #2b2620;border-radius:6px;max-width:400px;width:88vw;max-height:82vh;overflow:auto;padding:18px 18px 14px}
.card h3{margin:0 0 4px;font-size:18px}.card .who{font-size:12px;color:#7a6e5e;margin-bottom:10px}
.card p{line-height:1.6;margin:6px 0;font-size:15px}.card .row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap}
.stat{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.stat div{border:1.5px solid #2b2620;border-radius:4px;padding:8px;background:#fffaf0}.stat b{display:block;font-size:22px}.stat span{font-size:12px;color:#7a6e5e}
#intro .card{text-align:center}
#play{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:9;background:rgba(10,14,24,.35)}
`;
const HTML = `
<div class="hud"><span class="chip" id="nick"></span><span class="chip" id="clock"></span><span class="chip" id="crowd" style="display:none"></span><button class="btn" id="waveBtn" style="display:none" title="손 흔들기">👋</button><button class="btn" id="recBtn">📒 오늘</button><a class="btn" href="../" style="text-decoration:none">↩ 목록</a></div>
<div id="acts"></div><div id="toast"></div><div id="stamp"><b></b><span></span></div><div id="play"></div>
<div class="panel" id="intro" style="display:flex"><div class="card"><h3 id="inT"></h3><div class="who" id="inW"></div><div id="inB"></div>
<p style="color:#7a6e5e;font-size:13px">바닥을 누르거나 방향키·WASD 로 걷기 · 기록은 이 기기에만</p>
<div class="row" style="justify-content:center"><button class="btn main" id="start"></button></div></div></div>
<div class="panel" id="dlg"><div class="card"><h3 id="dlgT"></h3><div class="who" id="dlgW"></div><div id="dlgB"></div><div class="row" id="dlgR"></div></div></div>`;

export function start(G) {
  document.title = G.title + ' — 쉬어가기 미니게임';
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  document.body.insertAdjacentHTML('beforeend', HTML);
  const $ = id => document.getElementById(id), Q = new URLSearchParams(location.search);
  const pad = n => String(n).padStart(2, '0');
  const now = () => { const d = new Date(); if (Q.has('hour')) { const h = +Q.get('hour'); d.setHours(h | 0, Math.round((h % 1) * 60)); } return d; };
  const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes()), dkey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

  /* 기록 */
  const KEY = 'mini-' + G.key; if (Q.has('fresh')) localStorage.removeItem(KEY);
  const DB = JSON.parse(localStorage.getItem(KEY) || '{}'); DB.days = DB.days || {}; DB.total = DB.total || {};
  const [A, N] = G.nick; DB.nick = DB.nick || A[Math.random() * A.length | 0] + ' ' + N[Math.random() * N.length | 0];
  const save = () => localStorage.setItem(KEY, JSON.stringify(DB)); save();
  const today = () => (DB.days[dkey(now())] = DB.days[dkey(now())] || {});
  const count = id => { const t = today(); t[id] = (t[id] || 0) + 1; DB.total[id] = (DB.total[id] || 0) + 1; save(); return t[id]; };
  const visits = () => Object.keys(DB.days).length;
  $('nick').textContent = (G.nickIcon || '🙂') + ' ' + DB.nick;
  $('inT').textContent = G.title; $('inW').textContent = '오늘의 별명: ' + DB.nick; $('inB').innerHTML = G.intro; $('start').textContent = G.enter || '들어가기';

  /* 장면 */
  const renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 300);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(-14, 22, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, {left: -24, right: 24, top: 24, bottom: -24}); scene.add(sun);

  const mat = (c, glow) => typeof c === 'number' ? new THREE.MeshLambertMaterial({color: c, emissive: glow ? c : 0x000000, emissiveIntensity: glow ? 0.6 : 0}) : c;
  const add = (m, x, y, z, parent = scene) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const box = (w, h, d, c, x, y, z, p) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)), x, y, z, p);
  const cyl = (rt, rb, h, c, x, y, z, p, seg = 16) => add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c)), x, y, z, p);
  const ball = (r, c, x, y, z, p) => add(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(c)), x, y, z, p);
  const glowBall = (r, c, x, y, z, light = 8, dist = 8) => { const m = add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({color: c})), x, y, z); m.castShadow = false;
    if (light) { const l = new THREE.PointLight(c, light, dist); l.position.set(x, y, z); scene.add(l); } return m; };
  function sign(lines, w, h, bg, fg, x, y, z, ry = 0, sizes = [56]) {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((t, i) => { g.font = `800 ${sizes[i] || sizes[0]}px "Malgun Gothic",sans-serif`; g.fillText(t, 256, c.height / 2 + (i - (lines.length - 1) / 2) * (sizes[0] * 1.25)); });
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: tx, transparent: true})); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m;
  }
  const F = G.floor || {w: 30, d: 26};
  { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = F.c1 || '#8a8478'; g.fillRect(0, 0, 128, 128); g.fillStyle = F.c2 || '#938d80';
    if (F.pattern === 'tile') { g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); }
    else if (F.pattern === 'plank') { for (let i = 0; i < 4; i++) { g.fillRect(0, i * 32, 128, 2); } }
    else { for (let i = 0; i < 60; i++) g.fillRect(Math.random() * 128, Math.random() * 128, 3, 3); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(F.w / 4, F.d / 4); t.colorSpace = THREE.SRGBColorSpace;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(F.w, F.d), new THREE.MeshLambertMaterial({map: t})); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
    if (F.around) { const o = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({color: F.around})); o.rotation.x = -Math.PI / 2; o.position.y = -0.02; scene.add(o); } }
  const floorHit = new THREE.Mesh(new THREE.PlaneGeometry(F.w, F.d), new THREE.MeshBasicMaterial({visible: false})); floorHit.rotation.x = -Math.PI / 2; scene.add(floorHit);
  const solids = [], fx = [];
  const blocked = (x, z) => Math.abs(x) > F.w / 2 - 0.5 || Math.abs(z) > F.d / 2 - 0.5 || solids.some(s => x > s[0] - 0.35 && x < s[1] + 0.35 && z > s[2] - 0.35 && z < s[3] + 0.35);
  const solid = (x, z, w, d) => solids.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]);

  function person(look, scale = 1.2) {
    const g = makeChibi(look); g.scale.setScalar(scale);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({color: 0, transparent: true, opacity: .15}));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh); scene.add(g); return g;
  }
  // 목도리 색은 사람마다 하나(이 기기에 저장) — 같이 있을 때 누가 누군지 구별
  const BASE_LOOK = G.playerLook || {coat: 0x2b3a5a, pants: 0x3a3f4a}, MY_LOOK = {...BASE_LOOK, scarf: myScarf(DB, save)};
  const player = person(MY_LOOK);
  player.position.set(...(G.startPos ? [G.startPos[0], 0, G.startPos[1]] : [0, 0, F.d / 2 - 3])); player.rotation.y = Math.PI;
  { const jx = (Math.random() - 0.5) * 2.4; if (!Q.has('shot') && !blocked(player.position.x + jx, player.position.z)) player.position.x += jx; }   // 같이 들어와도 한 자리에 겹치지 않게
  const hand = new THREE.Group(); hand.position.set(0.05, -0.55, 0.1); player.userData.arms[1].add(hand);   // 손에 드는 것

  /* 하늘·빛 — G.time: 'real'(기본) | 'night' | 'evening' | 'day' */
  function phase() { const h = now().getHours() + now().getMinutes() / 60;
    if (G.time && G.time !== 'real') return G.time; return h >= 6 && h < 16.5 ? 'day' : h >= 16.5 && h < 19.5 ? 'evening' : 'night'; }
  const night = [];
  function applyTime() {
    const p = phase(), S = {day: [0x9cc8ee, 1.1, 1.3, 0xffffff], evening: [0x3a2a3a, 0.8, 0.9, 0xffa070], night: [0x0d1226, 0.45, 0.2, 0x8aa0ff]}[p];
    scene.background = new THREE.Color(G.bg?.[p] ?? S[0]); hemi.intensity = S[1]; sun.intensity = S[2]; sun.color.setHex(S[3]);
    scene.fog = new THREE.Fog(scene.background, 40, 110);
    night.forEach(l => l.visible = p !== 'day');
    $('clock').textContent = '🕘 ' + hm(now());
    G.onTime?.(p, ctx);
  }

  /* UI */
  function toast(t, ms = 2600) { $('toast').textContent = t; $('toast').style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => $('toast').style.opacity = 0, ms); }
  function stamp(word, sub) { $('stamp').querySelector('b').textContent = word; $('stamp').querySelector('span').textContent = sub || '';
    $('stamp').classList.add('on'); clearTimeout(stamp.h); stamp.h = setTimeout(() => $('stamp').classList.remove('on'), 1900); }
  function dialog(title, who, html, buttons = [['닫기', null, 'main']]) {
    $('dlgT').textContent = title; $('dlgW').textContent = who; $('dlgB').innerHTML = html; $('dlgR').innerHTML = '';
    for (const [txt, fn, cls] of buttons) { const b = document.createElement('button'); b.className = 'btn ' + (cls || ''); b.textContent = txt;
      b.onclick = () => { $('dlg').style.display = 'none'; fn && fn(); }; $('dlgR').appendChild(b); }
    $('dlg').style.display = 'flex';
  }
  let actx;
  function beep(f = 880, len = .12, when = 0, type = 'square', vol = .05) { try { actx = actx || new AudioContext(); const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = f; o.type = type; g.gain.value = vol; o.connect(g).connect(actx.destination); o.start(actx.currentTime + when); o.stop(actx.currentTime + when + len); } catch (e) {} }
  // 작은 놀이 창 — html 을 띄우고 setup(root, close) 을 부른다
  function play(html, setup) { const el = $('play'); el.innerHTML = `<div class="card" style="text-align:center">${html}</div>`; el.style.display = 'flex';
    const close = () => { el.style.display = 'none'; el.innerHTML = ''; busy = false; }; setup(el, close); }

  /* 걷기 */
  let target = null, onArrive = null, busy = false; const keys = {};
  const goTo = (x, z, then) => { target = new THREE.Vector3(x, 0, z); onArrive = then || null; };
  addEventListener('keydown', e => keys[e.key.toLowerCase()] = true); addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', e => { if (busy) return; mv.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(mv, camera); const h = ray.intersectObject(floorHit)[0]; if (h) goTo(h.point.x, h.point.z); });

  /* 사람들(화면 속 손님) — path 를 오가고, at 이 있으면 그 자리에 머문다 */
  const npcs = [];
  function npc(look, path, opt = {}) { const o = person(look, opt.scale || 1.2); o.position.set(path[0][0], 0, path[0][1]);
    const n = {o, path, seg: 0, wait: opt.wait ?? Math.random() * 3, speed: opt.speed || 2.4, idle: opt.idle, face: opt.face}; npcs.push(n); return n; }
  function tickNpcs(dt, t) { for (const n of npcs) {
    if (n.path.length < 2) { if (n.face != null) n.o.rotation.y = n.face; animateChibi(n.o, t, dt, {walk: false, talk: n.talk}); if (n.idle && Math.random() < dt * 0.15) doAct(n.o, n.idle[Math.random() * n.idle.length | 0]); continue; }
    if (n.wait > 0) { n.wait -= dt; animateChibi(n.o, t, dt, {walk: false}); continue; }
    const tg = n.path[(n.seg + 1) % n.path.length], dx = tg[0] - n.o.position.x, dz = tg[1] - n.o.position.z, dist = Math.hypot(dx, dz);
    if (dist < 0.15) { n.seg = (n.seg + 1) % n.path.length; n.wait = 1 + Math.random() * 4; if (n.idle && Math.random() < .5) doAct(n.o, n.idle[Math.random() * n.idle.length | 0]); }
    else { const s = Math.min(dist, n.speed * dt); n.o.position.x += dx / dist * s; n.o.position.z += dz / dist * s; n.o.rotation.y = Math.atan2(dx, dz); }
    animateChibi(n.o, t, dt, {walk: dist >= 0.15}); } }

  const ctx = {THREE, scene, box, cyl, ball, glowBall, sign, solid, solids, fx, night, player, hand, person, npc, npcs, toast, stamp, dialog, beep, play, count, today, visits, DB, save, now, hm, dkey, goTo, doAct,
    get busy() { return busy; }, set busy(v) { busy = v; }, phase, $};
  G.build(ctx);
  for (const [x, z] of G.lamps || []) { const l = new THREE.PointLight(0xffc77a, 20, 14); l.position.set(x, 5, z); scene.add(l); night.push(l); }

  /* 단추 — act = {id, icon, label, spot:[x,z], face, run(ctx, done)} . run 이 끝나면 done() */
  for (const a of G.acts) { const b = document.createElement('button'); b.className = 'btn'; b.innerHTML = `${a.icon}<small>${a.label}</small>`;
    b.onclick = () => { if (busy) return; busy = true; const go = () => { if (a.face != null) player.rotation.y = a.face; a.run(ctx, () => busy = false); };
      a.spot ? goTo(a.spot[0], a.spot[1], go) : (target = null, go()); }; $('acts').appendChild(b); }

  function showRec() {
    const t = today(), rows = G.acts.map(a => `<div><b>${t[a.id] || 0}</b><span>${a.icon} ${a.label} · 모두 ${DB.total[a.id] || 0}</span></div>`).join('');
    dialog('📒 오늘', DB.nick + ' · ' + visits() + '번째 날', `<div class="stat">${rows}</div>` + (G.recExtra ? G.recExtra(ctx) : ''));
  }
  $('recBtn').onclick = showRec;
  $('start').onclick = () => { $('intro').style.display = 'none'; beep(660, .08); G.onEnter?.(ctx); };
  // 시험: ?do=act1,act2 (4.5초 간격) · ?shot=1 (화면 글자 숨김)
  if (Q.has('do') || Q.has('shot')) { $('intro').style.display = 'none';
    (Q.get('do') || '').split(',').filter(Boolean).forEach((id, i) => setTimeout(() => [...$('acts').children][G.acts.findIndex(a => a.id === id)]?.click(), 700 + i * 4500)); }
  if (Q.has('shot')) for (const s of ['.hud', '#acts']) document.querySelector(s).style.display = 'none';

  /* 같이 있는 사람들 — live.js. ?solo=1 · ?shot=1 이면 혼자 */
  const live = startLive({THREE, scene, player, person, key: G.key, nick: DB.nick, look: MY_LOOK, baseLook: BASE_LOOK, toast, doAct, animateChibi,
    crowdEl: $('crowd'), waveBtn: $('waveBtn'), off: Q.has('solo') || Q.has('shot')});
  ctx.live = live;

  applyTime(); setInterval(applyTime, 30000);
  const clock = new THREE.Clock(); let tt = 0; const cam = new THREE.Vector3(), C = G.cam || {h: 11, back: 13};
  (function loop() {
    requestAnimationFrame(loop); const dt = Math.min(clock.getDelta(), 0.05); tt += dt;
    const kx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0), kz = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
    let walking = false;
    if (!busy && (kx || kz)) { target = null; const l = Math.hypot(kx, kz), nx = player.position.x + kx / l * 5 * dt, nz = player.position.z + kz / l * 5 * dt;
      if (!blocked(nx, player.position.z)) player.position.x = nx; if (!blocked(player.position.x, nz)) player.position.z = nz; player.rotation.y = Math.atan2(kx, kz); walking = true; }
    else if (target) { const dx = target.x - player.position.x, dz = target.z - player.position.z, dist = Math.hypot(dx, dz);
      if (dist < 0.12) { target = null; const f = onArrive; onArrive = null; f && f(); }
      else { const s = Math.min(dist, 5 * dt), nx = player.position.x + dx / dist * s, nz = player.position.z + dz / dist * s;
        if (busy || !blocked(nx, nz)) { player.position.x = nx; player.position.z = nz; } else { target = null; onArrive = null; }
        player.rotation.y = Math.atan2(dx, dz); walking = true; } }
    animateChibi(player, tt, dt, {walk: walking}); tickNpcs(dt, tt); live.tick(dt, tt); for (const f of fx) f(dt, tt);
    const far = camera.aspect < 0.8 ? 1.4 : 1;
    cam.set(player.position.x * 0.8, C.h * far, player.position.z + C.back * far); camera.position.lerp(cam, Math.min(1, dt * 3));
    camera.lookAt(player.position.x * 0.85, 1, player.position.z - 2); renderer.render(scene, camera);
  })();
  return ctx;
}
