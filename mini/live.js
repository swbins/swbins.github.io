// 같이 있는 사람들 — 실시간(추리마을·몽글숲과 같은 서버 village-live). 미니게임·출근 도장·광장이 같이 쓴다.
// 방 mini-<key>-N(30명 넘으면 다음 N). 위치는 움직였을 때만 초당 3번까지. 서버가 안 되면 조용히 혼자 모드.
export const LIVE_HOST = 'village-live.swbins.workers.dev';
export const SCARVES = [0xc9472f, 0xe0b040, 0x3a8a6a, 0x4a7ac8, 0x9a5ab8, 0xe07aa0, 0x2bb0b0, 0xf2efe6];

// 사람마다 목도리 색 하나(그 게임 기록 DB 에 저장) — 같이 있을 때 누가 누군지 구별
export function myScarf(DB, save) {
  if (!SCARVES.includes(DB.scarf)) { DB.scarf = SCARVES[Math.random() * SCARVES.length | 0]; save(); }
  return DB.scarf;
}

// 장소별 지금 인원 { pocha: 2, village: 1, … } — 실패하면 null
export async function liveCounts() {
  try {
    const c = new AbortController(); setTimeout(() => c.abort(), 4000);
    const r = await fetch(`https://${LIVE_HOST}/counts`, {signal: c.signal});
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

/* o = {THREE, scene, player, person(look), key, nick, look, baseLook, toast, doAct, animateChibi, crowdEl, waveBtn, off, onJoin}
   돌려주는 것: {tick(dt, t), others} — 그리기 반복마다 tick 을 부른다 */
export function startLive(o) {
  const {THREE, scene, player} = o, others = new Map();
  let ws = null, roomN = 0, retry = 0, lastSent = 0, sx = Infinity, sz = Infinity, sr = Infinity, hiddenAt = 0;
  const send = m => { if (ws && ws.readyState === 1) try { ws.send(JSON.stringify(m)); } catch (e) {} };
  const wire = {}; for (const k of ['coat', 'scarf', 'hair', 'pants']) if (Number.isInteger(o.look[k])) wire[k] = o.look[k];
  function tag(text) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 56; const g = c.getContext('2d');
    g.font = '700 26px "Malgun Gothic",sans-serif'; const w = Math.min(252, g.measureText(text).width + 24);
    g.fillStyle = 'rgba(244,236,220,.92)'; g.fillRect((256 - w) / 2, 8, w, 40); g.fillStyle = '#2b2620'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 29);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map: t, transparent: true, depthTest: false})); s.scale.set(2.4, 0.52, 1); s.renderOrder = 9; scene.add(s); return s;
  }
  function chip() {
    const on = ws && ws.readyState === 1;
    if (o.crowdEl) { o.crowdEl.style.display = on ? '' : 'none'; o.crowdEl.textContent = others.size ? `👥 같이 ${others.size + 1}명` : '👥 지금은 나 혼자'; }
    if (o.waveBtn) o.waveBtn.style.display = on ? '' : 'none';
  }
  function add(p) {
    if (others.has(p.id)) return;
    const g = o.person({...o.baseLook, ...(p.look || {})}); g.position.set(p.x, 0, p.z); g.rotation.y = p.r;
    const top = new THREE.Box3().setFromObject(g).max.y - g.position.y + 0.45;
    others.set(p.id, {g, nick: p.nick, x: p.x, z: p.z, r: p.r, tag: tag(p.nick), top}); chip();
  }
  function drop(id) { const p = others.get(id); if (!p) return; scene.remove(p.g); scene.remove(p.tag); p.tag.material.map.dispose(); others.delete(id); chip(); }
  function connect() {
    if (o.off || ws) return;
    try { ws = new WebSocket(`wss://${LIVE_HOST}/ws?room=mini-${o.key}-${roomN}`); } catch (e) { ws = null; return; }
    ws.onopen = () => { retry = 0; sx = Infinity; send({t: 'hi', nick: o.nick, look: wire, x: player.position.x, z: player.position.z, r: player.rotation.y}); chip(); };
    ws.onmessage = e => {
      if (e.data === 'pong') return; let m; try { m = JSON.parse(e.data); } catch (_) { return; }
      if (m.t === 'all') { for (const id of [...others.keys()]) drop(id); m.list.forEach(add); }
      else if (m.t === 'join') { add(m); o.toast('👋 ' + m.nick + ' 님이 왔어요'); o.onJoin?.(m); }
      else if (m.t === 'bye') drop(m.id);
      else if (m.t === 'p') { const p = others.get(m.id); if (p) { p.x = m.x; p.z = m.z; p.r = m.r; } }
      else if (m.t === 'a') { const p = others.get(m.id); if (p && (m.k === 'wave' || m.k === 'cheer')) o.doAct(p.g, m.k); }
      else if (m.t === 'full') roomN = (roomN + 1) % 6;
    };
    ws.onclose = () => { ws = null; for (const id of [...others.keys()]) drop(id); chip(); if (!document.hidden) setTimeout(connect, Math.min(30000, 1000 * 2 ** retry++)); };
    ws.onerror = () => {};
  }
  if (o.waveBtn) o.waveBtn.onclick = () => { o.doAct(player, 'wave'); send({t: 'a', k: 'wave'}); };
  setInterval(() => { if (ws && ws.readyState === 1) ws.send('ping'); if (document.hidden && hiddenAt && Date.now() - hiddenAt > 120000 && ws) ws.close(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = Date.now(); else { hiddenAt = 0; if (!ws) connect(); } });
  connect();
  return {
    others,
    tick(dt, t) {
      const p = player.position, n = performance.now();
      if (n - lastSent > 330 && (Math.abs(p.x - sx) > 0.05 || Math.abs(p.z - sz) > 0.05 || Math.abs(player.rotation.y - sr) > 0.1)) {
        lastSent = n; sx = p.x; sz = p.z; sr = player.rotation.y; send({t: 'p', x: p.x, z: p.z, r: player.rotation.y});
      }
      for (const q of others.values()) {
        const g = q.g, ox = q.x - g.position.x, oz = q.z - g.position.z, d = Math.hypot(ox, oz);
        if (d > 8) { g.position.x = q.x; g.position.z = q.z; } else if (d > 0.02) { const k = Math.min(1, dt * 6); g.position.x += ox * k; g.position.z += oz * k; }
        g.rotation.y = q.r; o.animateChibi(g, t, dt, {walk: d > 0.08}); q.tag.position.set(g.position.x, q.top, g.position.z);
      }
    },
  };
}
