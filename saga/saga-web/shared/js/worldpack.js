/**
 * 세계 편 데이터 묶음 읽개(W-0682 · 정본 scenario/world-shell.md §4) — 공용(tools/sync-shared.mjs 가 판에 복사).
 * ---------------------------------------------------------------
 * 묶음 자리: `saga-web/saga-world/world/<나라>/` — pack.json(판 번호·끈 장·파일 목록) · chapters · people · dex · sets · chains/<장> · lines/<말>.
 * 이야기 판은 불러올 때 표가 이미 있다고 보므로 **같은 출처 동기 요청**으로 한 번 읽어 둔다(작은 json 일곱).
 *   load(나라, 말?)  → 묶음 { pack, chapters, people, dex, sets, chains:[…], lines:{} } 또는 null(못 읽음)
 *   chain(id) · person(id) · line(key) · lines(조각들) — 조각 = 대사 키 또는 { pick, 0: 키, 1: 키 }(고른 번호로 가름)
 *   off(장 id)       pack.off 에 든 장인가(운영이 끈 장 — 판은 그 장을 끝낸 것으로 친다)
 *   base             묶음 뿌리(기본 '../saga-world/world/' — 판 폴더 기준)
 * 검사기 tools/world-pack-check.mjs 를 지난 묶음만 싣는다(precheck).
 */
(function (global) {
  'use strict';
  var cache = {}, cur = null;
  var api = { base: '../saga-world/world/', liveUrl: '../shared/ops/live.json' };   // liveUrl — 서버 주소를 찾을 live.json(W-0684 ②, null 이면 안 봄)

  function get(url) {
    try {
      var x = new XMLHttpRequest(); x.open('GET', url, false); x.send();
      if (x.status !== 200 && x.status !== 0) { return null; }
      return JSON.parse(x.responseText);
    } catch (e) { return null; }
  }
  /** W-0684 ② 운영 서버 주소 — DG_OPS_URL → ops-client 가 붙은 서버 → live.json 의 server. 없으면 '' (정적 묶음만) */
  function opsServer() {
    var g = global.DG_OPS_URL || (global.DG && global.DG.ops && global.DG.ops.server && global.DG.ops.server());
    if (!g && api.liveUrl) { var L = get(api.liveUrl); g = L && L.server; }
    return String(g || '').replace(/\/+$/, '');
  }
  /** 서버 묶음(GET /v1/pack/<나라>) — 없거나(404)·죽거나·꼴이 틀리면 null → 정적 묶음. 세이브는 안 건드린다 */
  function fromServer(nation) {
    var srv = opsServer(); if (!srv) { return null; }
    var j = get(srv + '/v1/pack/' + encodeURIComponent(nation));
    var fs = j && j.ok && j.data && j.data.files, pk = fs && fs['pack.json'];
    if (!pk || !Array.isArray(pk.files)) { return null; }
    for (var i = 0; i < pk.files.length; i++) { if (!fs[pk.files[i]]) { return null; } }
    return { v: j.v, files: fs };
  }
  function load(nation, lang) {
    var k = nation + ':' + (lang || 'ko');
    if (cache[k]) { cur = cache[k]; return cur; }
    var root = api.base + nation + '/', S = fromServer(nation), pack = S ? S.files['pack.json'] : get(root + 'pack.json');
    if (!pack || !Array.isArray(pack.files)) { return null; }
    var P = { pack: pack, chapters: [], people: [], dex: [], sets: [], chains: [], lines: {}, source: S ? 'server v' + S.v : 'static' };
    for (var i = 0; i < pack.files.length; i++) {
      var f = pack.files[i], d = S ? S.files[f] : get(root + f);
      if (!d) { return null; }
      if (f === 'chapters.json') { P.chapters = d; } else if (f === 'people.json') { P.people = d; } else if (f === 'dex.json') { P.dex = d; } else if (f === 'sets.json') { P.sets = d; }
      else if (/^chains\//.test(f)) { P.chains = P.chains.concat(d.chains || []); }
      else if (/^lines\//.test(f)) { if (f === 'lines/' + (lang || 'ko') + '.json') { P.lines = d; } }
    }
    addUgc(P);
    cache[k] = P; cur = P;
    return P;
  }
  /** W-0685 함께 만든 곁가지 — 문 모드 ?door=ugc_… 일 때만: 세계 세이브(ugc.made·played)에서 그 묶음을 찾아 DG.packcheck 로 **다시** 보고
   *  통과하면 사슬 하나(1만리 단계 꼴)·인물·대사를 이 묶음에 더한다. 못 찾거나 걸리면 아무것도 안 더함(문 판은 그 사슬을 모름 → 그만두기만) */
  function addUgc(P) {
    var D = global.DG && global.DG.door, I = D && D.on && D.on() ? D.info() : null;
    if (!I || !/^ugc_/.test(I.door)) { return; }
    var K = global.DG.packcheck, w = D.world(I.p), U = w && w.ugc; if (!K || !U) { return; }
    var u = [].concat(U.made || [], U.played || []).filter(function (x) { return x && x.id === I.door; })[0];
    if (!u || K.check(u).length) { return; }
    P.chains.push({ id: u.id, name: u.chain.name, ar: 1, reward: {}, ugc: true, steps: K.toSteps(u) });
    K.toPeople(u).forEach(function (p) { P.people.push(p); });
    Object.keys(u.lines).forEach(function (key) { P.lines[key] = u.lines[key]; });
    P.ugc = u.id;
  }
  function find(L, id) { for (var i = 0; i < (L || []).length; i++) { if (L[i].id === id) { return L[i]; } } return null; }
  function chain(id) { return cur ? find(cur.chains, id) : null; }
  function person(id) { return cur ? find(cur.people, id) : null; }
  function line(key) { return cur && cur.lines[key] ? cur.lines[key] : null; }
  /** 조각들 → 대사 줄 배열. picked(k) 는 그 키의 고른 번호(없으면 0 갈래)
   *  조각 꼴: '키' · { 0, 1, 2?, pick } 고른 번호 갈래(그 칸 없으면 0 — W-0722 세 갈래) · { if: pick, is: n, key } 그걸 골랐을 때만(아니면 뺌 — W-0722) */
  function segKey(s, picked, was) {
    if (typeof s === 'string') { return s; }
    if (!s) { return null; }
    if (s.done) { return was && was(s.done) ? s.key : null; }   // W-0726 그 사슬을 끝냈을 때만(만난 동료만 말함)
    if (s.if) { return picked && picked(s.if) === s.is ? s.key : null; }
    if (s.pick) { var n = picked ? picked(s.pick) : null; return typeof n === 'number' && s[n] !== undefined ? s[n] : s[0]; }
    return null;
  }
  function lines(segs, picked, was) {
    var out = [];
    (segs || []).forEach(function (s) {
      var key = segKey(s, picked, was);
      var L = key ? line(key) : null; if (L) { out = out.concat(L); }
    });
    return out;
  }
  function off(chId) { return !!(cur && cur.pack && Array.isArray(cur.pack.off) && cur.pack.off.indexOf(chId) >= 0); }

  api.ugcInto = addUgc;   // W-0685 진단용 — 문 정보가 ugc 일 때 그 묶음에 함께 만든 곁가지를 더함
  api.segKey = segKey; api.load = load; api.chain = chain; api.person = person; api.line = line; api.lines = lines; api.off = off;
  api.current = function () { return cur; };
  api._put = function (nation, P, lang) { cache[nation + ':' + (lang || 'ko')] = P; cur = P; };   // 진단용
  global.DG = global.DG || {};
  global.DG.worldPack = api;
})(typeof window !== 'undefined' ? window : this);
