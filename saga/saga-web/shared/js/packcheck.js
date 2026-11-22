/**
 * 함께 만들기 지킴이(W-0685 · 정본 scenario/world-build.md §3 · world-balance.md §7) — 공용(sync-shared 가 판에 복사), 브라우저·node 같은 함수.
 * ---------------------------------------------------------------
 * 플레이어가 만든 곁가지 = 작은 묶음 하나(world-shell §4 끝):
 *   { id:'ugc_<만든이>_<낱말>', v:1, by:'<만든이 이름>', nation:'kr',
 *     chain:{ id(=id), name, reward:{ deco:<꾸미기 id>, maker:<만든이 재화> }, steps:[블록…] },
 *     people:[{ id:'p1'…, name, body, spot }], lines:{ '<id>.<n>': [[말하는 이, 글] …, ['?', [대답, 대답]]?] } }
 * 블록 여덟(1만리 단계 어휘 그대로): talk·go·kill·gather·follow·defend·chase·duel — 한 곁가지 3~8 개. 고르기(choice)는 talk 의 '?' 줄로.
 * 고르는 것은 표에서만: 인물 몸 BODIES · 자리 SPOTS · 적 FOES · 채집물 ITEMS · 꾸미기 DECO. 글(이름·대사)은 직접 쓴다.
 *   check(u)        → [까닭…] (빈 배열 = 통과). 실명·욕설·상한·없는 id·본편 보상·자유 꼴(모르는 칸)
 *   toSteps(u)      → 1만리 단계 꼴(zone·off·kinds…)로 편 사슬(문 모드가 읽는다)
 *   encode(u)       → Promise<'SAGAU1|<z|r>|<글>|<검사 합>'> (deflate-raw + base64url, 없으면 r=압축 없음)
 *   decode(s)       → Promise<{ ok, u, why }> — 머리말·검사 합·꼴·check 를 다 본다. 글을 코드로 실행하는 길 없음(JSON.parse 만)
 * 실명 목록은 saga-web/tools/content-editor/realname.js 의 BLACK 과 같다(saga-world 진단이 둘이 같은지 본다).
 */
(function (global) {
  'use strict';
  var BLACK = ['유비', '관우', '조조', '사마의', '하후돈', '장료', '순욱', '손권', '주유',
    '육손', '태사자', '감녕', '여포', '초선', '방통', '화타', '맹획', '봉추',
    '이순신', '을지문덕', '강감찬', '김유신', '계백', '연개소문', '광개토대왕', '세종대왕',
    '장영실', '최무선', '대조영', '왕건', '정약용', '허준', '신사임당',
    '안중근', '이토 히로부미', '히로부미', '하얼빈', '뤼순', '유관순', '아우내', '서대문',
    '김구', '백범', '원효', '김정호', '곽재우', '논개', '이황', '황희', '정몽주', '선죽교',
    '히미코', '노부나가', '히데요시', '이에야스', '다케다 신겐', '우에스기 겐신',
    '마사무네', '유키무라', '미야모토 무사시', '핫토리 한조',
    '카이사르', '시저', '알렉산더', '한니발', '샤를마뉴', '잔다르크', '나폴레옹', '다빈치',
    '레오니다스', '엘리자베스', '넬슨', '마키아벨리', '뉴턴', '미켈란젤로',
    '칭기즈칸', '징기스칸', '쿠빌라이', '만사무사', '샤카', '클레오파트라',
    '함무라비', '아틸라', '적토마', '절영'];
  var CURSE = ['씨발', '시발', '씨팔', 'ㅅㅂ', '병신', 'ㅂㅅ', '개새끼', '개새', '좆', '지랄', '니미', '썅', '엿먹', '미친놈', '미친년', 'fuck', 'shit', 'bitch'];
  var BLOCKS = ['talk', 'go', 'kill', 'gather', 'follow', 'defend', 'chase', 'duel'];
  var BLOCK_NAME = { talk: '말 걸기', go: '가기', kill: '물리치기', gather: '모으기', follow: '따라가기', defend: '지키기', chase: '쫓기', duel: '맞서기' };
  /* 나라별 고르는 표 — 적·채집물 id 는 1만리 field-foes FOES · cooking ITEMS 에 있어야 한다(saga-world 진단이 본다) */
  var KR = {
    BODIES: [{ id: 'story_dolme', name: '돌 다루는 이' }, { id: 'story_sil', name: '곰 겨레' }, { id: 'story_tigerkid', name: '범 겨레 아이' }, { id: 'story_nari', name: '장수' },
      { id: 'story_garam', name: '대장장이' }, { id: 'story_sagong', name: '사공' }, { id: 'story_seolgi', name: '글 지기' }, { id: 'story_bukseong', name: '성 사람' }],
    SPOTS: [{ id: 'dolmen', name: '고인돌 들', zone: 'home', off: [34, -28] }, { id: 'gate', name: '마을 어귀', zone: 'home', off: [62, -40] },
      { id: 'yard', name: '잔치 마당', zone: 'home', off: [-10, 26] }, { id: 'field', name: '남쪽 들녘', zone: 'home', off: [48, 146] },
      { id: 'pass', name: '고개 위', zone: 'home', off: [86, 70] }, { id: 'den', name: '곰 굴 앞', zone: 'home', off: [-70, -55] },
      { id: 'ford', name: '나루', zone: 'home', off: [-150, 96] }, { id: 'forge', name: '대장간 터', zone: 'home', off: [118, -18] }],
    FOES: [{ id: 'boar', name: '멧돼지' }, { id: 'tiger', name: '범' }, { id: 'imp', name: '불도깨비' }, { id: 'toad', name: '두꺼비' }, { id: 'raptor', name: '번개날쌘용' },
      { id: 'bear', name: '곰' }, { id: 'hawk', name: '회오리매' }, { id: 'snowfox', name: '눈여우' }, { id: 'rockbear', name: '바위곰' }, { id: 'rat', name: '쥐' }, { id: 'wasp', name: '말벌' }],
    ITEMS: [{ id: 'mugwort', name: '쑥' }, { id: 'garlic', name: '마늘' }, { id: 'mint', name: '박하' }, { id: 'apple', name: '사과' }, { id: 'mushroom', name: '버섯' }, { id: 'honey_flower', name: '꿀꽃' }, { id: 'clam', name: '조개' }]
  };
  var NATIONS = { kr: KR };
  /* 꾸미기 표(본편 균형 밖 — 칭호·깃발·책 무늬) · 만든이 재화 상한(world-balance §7) */
  var DECO = [{ id: 'title_maker', name: '칭호 「길을 낸 이」' }, { id: 'title_teller', name: '칭호 「이야기꾼」' }, { id: 'flag_reed', name: '거점 깃발 · 갈대' },
    { id: 'flag_sun', name: '거점 깃발 · 해' }, { id: 'book_vine', name: '책 무늬 · 넝쿨' }, { id: 'book_wave', name: '책 무늬 · 물결' }];
  var LIM = { blocksMin: 3, blocksMax: 8, people: 4, name: 12, title: 24, text: 40, say: 80, rows: 8, linesAll: 40, foes: 6, waves: 3, wave: 4, count: 10, maker: 20, by: 12, word: 16 };
  var ID_RE = /^ugc_[a-z0-9]{1,12}_[a-z0-9]{1,16}$/;

  function has(L, id) { for (var i = 0; i < L.length; i++) { if (L[i].id === id) { return L[i]; } } return null; }
  function str(x) { return typeof x === 'string'; }
  function len(s) { return Array.from(String(s)).length; }
  /** 글 하나 — 실명·욕설·길이·조종 문자 */
  function textBad(label, s, max) {
    if (!str(s)) { return label + ' 글이 아님'; }
    if (!s.trim()) { return label + ' 빈 글'; }
    if (len(s) > max) { return label + ' 너무 김(' + len(s) + ' > ' + max + ')'; }
    if (/[\u0000-\u001f\u007f<>]/.test(s)) { return label + ' 쓸 수 없는 글자'; }
    var low = s.toLowerCase().replace(/\s+/g, '');
    for (var i = 0; i < BLACK.length; i++) { if (s.indexOf(BLACK[i]) >= 0) { return '실명 — ' + label + '(' + BLACK[i] + ')'; } }
    for (var j = 0; j < CURSE.length; j++) { if (low.indexOf(CURSE[j]) >= 0) { return '욕설 — ' + label; } }
    return null;
  }
  function onlyKeys(o, keys) { return Object.keys(o).filter(function (k) { return keys.indexOf(k) < 0; }); }

  function check(u) {
    var bad = [], push = function (x) { if (x) { bad.push(x); } };
    if (!u || typeof u !== 'object' || Array.isArray(u)) { return ['꼴 — 묶음이 아님']; }
    push(onlyKeys(u, ['id', 'v', 'by', 'nation', 'chain', 'people', 'lines', 'cleared']).map(function (k) { return '꼴 — 모르는 칸 ' + k; })[0]);
    if (!ID_RE.test(String(u.id))) { bad.push('꼴 — id 는 ugc_<만든이>_<낱말>(영소문자·숫자)'); }
    if (u.v !== 1) { bad.push('꼴 — v 는 1'); }
    push(textBad('만든이', u.by, LIM.by));
    var N = NATIONS[u.nation]; if (!N) { bad.push('없는 id — 나라 ' + u.nation); return bad; }
    var q = u.chain, P = Array.isArray(u.people) ? u.people : null, L = u.lines && typeof u.lines === 'object' && !Array.isArray(u.lines) ? u.lines : null;
    if (!q || typeof q !== 'object' || !P || !L) { bad.push('꼴 — chain·people·lines 가 없음'); return bad; }
    push(onlyKeys(q, ['id', 'name', 'reward', 'steps']).map(function (k) { return '꼴 — 사슬에 모르는 칸 ' + k; })[0]);
    if (q.id !== u.id) { bad.push('꼴 — 사슬 id 가 묶음 id 와 다름'); }
    push(textBad('곁가지 이름', q.name, LIM.title));
    /* 보상 — 꾸미기 하나 + 만든이 재화뿐 */
    var R = q.reward || {}, rk = onlyKeys(R, ['deco', 'maker']);
    if (rk.length) { bad.push('본편 보상 — ' + rk.join('·') + '(꾸미기·만든이 재화만)'); }
    if (!has(DECO, R.deco)) { bad.push('없는 id — 꾸미기 ' + R.deco); }
    if (typeof R.maker !== 'number' || R.maker < 0 || R.maker > LIM.maker || R.maker % 1) { bad.push('상한 — 만든이 재화 0~' + LIM.maker); }
    /* 인물 */
    if (P.length < 1 || P.length > LIM.people) { bad.push('상한 — 인물 1~' + LIM.people); }
    var pid = {};
    P.forEach(function (p, i) {
      if (!p || typeof p !== 'object') { bad.push('꼴 — 인물 ' + i); return; }
      push(onlyKeys(p, ['id', 'name', 'body', 'spot']).map(function (k) { return '꼴 — 인물에 모르는 칸 ' + k; })[0]);
      if (!/^p[1-9]$/.test(String(p.id)) || pid[p.id]) { bad.push('꼴 — 인물 id p1~p9 · 겹침'); }
      pid[p.id] = 1;
      push(textBad('인물 이름', p.name, LIM.name));
      if (!has(N.BODIES, p.body)) { bad.push('없는 id — 몸 ' + p.body); }
      if (!has(N.SPOTS, p.spot)) { bad.push('없는 id — 인물 자리 ' + p.spot); }
    });
    /* 대사 */
    var used = {}, rowsAll = 0;
    Object.keys(L).forEach(function (k) {
      if (k.indexOf(u.id + '.') !== 0) { bad.push('꼴 — 대사 키 ' + k); return; }
      var rows = L[k]; if (!Array.isArray(rows) || !rows.length || rows.length > LIM.rows) { bad.push('상한 — 대사 ' + k + ' 줄 1~' + LIM.rows); return; }
      rowsAll += rows.length;
      rows.forEach(function (r, i) {
        if (!Array.isArray(r) || r.length !== 2) { bad.push('꼴 — 대사 ' + k + '#' + i); return; }
        if (r[0] === '?') {
          if (!Array.isArray(r[1]) || r[1].length !== 2) { bad.push('꼴 — 고르기 ' + k + ' 대답은 둘'); return; }
          r[1].forEach(function (a) { push(textBad('대답', a, LIM.text)); });
        } else {
          if (!str(r[0])) { bad.push('꼴 — 말하는 이'); } else if (r[0]) { push(textBad('말하는 이', r[0], LIM.name)); }
          push(textBad('대사', r[1], LIM.say));
        }
      });
    });
    if (rowsAll > LIM.linesAll) { bad.push('상한 — 대사 줄 전부 ' + LIM.linesAll); }
    /* 블록 */
    var S = Array.isArray(q.steps) ? q.steps : [];
    if (S.length < LIM.blocksMin || S.length > LIM.blocksMax) { bad.push('상한 — 블록 ' + LIM.blocksMin + '~' + LIM.blocksMax + ' 개(지금 ' + S.length + ')'); }
    var foeN = 0;
    S.forEach(function (s, i) {
      var at = '블록 ' + (i + 1);
      if (!s || BLOCKS.indexOf(s.type) < 0) { bad.push('없는 id — ' + at + ' 모르는 블록 ' + (s && s.type)); return; }
      push(onlyKeys(s, ['type', 'text', 'npc', 'spot', 'line', 'kinds', 'kind', 'item', 'count', 'waves']).map(function (k) { return '꼴 — ' + at + ' 모르는 칸 ' + k; })[0]);
      push(textBad(at + ' 글', s.text, LIM.text));
      var needNpc = s.type === 'talk' || s.type === 'follow' || s.type === 'chase', needSpot = s.type === 'go' || s.type === 'kill' || s.type === 'defend' || s.type === 'duel';
      if (needNpc && !pid[s.npc]) { bad.push('없는 id — ' + at + ' 인물 ' + s.npc); }
      if (needSpot && !has(N.SPOTS, s.spot)) { bad.push('없는 id — ' + at + ' 자리 ' + s.spot); }
      if (s.type === 'talk') { if (!L[s.line]) { bad.push('없는 id — ' + at + ' 대사 ' + s.line); } else { used[s.line] = 1; } }
      if (s.type === 'kill') {
        if (!Array.isArray(s.kinds) || !s.kinds.length) { bad.push('꼴 — ' + at + ' 적 없음'); } else { s.kinds.forEach(function (f) { if (!has(N.FOES, f)) { bad.push('없는 id — ' + at + ' 적 ' + f); } }); foeN += s.kinds.length; }
      }
      if (s.type === 'defend') {
        var W = s.waves; if (!Array.isArray(W) || !W.length || W.length > LIM.waves) { bad.push('상한 — ' + at + ' 물결 1~' + LIM.waves); }
        else { W.forEach(function (w) { if (!Array.isArray(w) || !w.length || w.length > LIM.wave) { bad.push('상한 — ' + at + ' 물결마다 적 1~' + LIM.wave); return; } w.forEach(function (f) { if (!has(N.FOES, f)) { bad.push('없는 id — ' + at + ' 적 ' + f); } }); foeN += w.length; }); }
      }
      if (s.type === 'duel' && !has(N.FOES, s.kind)) { bad.push('없는 id — ' + at + ' 맞설 적 ' + s.kind); }
      if (s.type === 'duel') { foeN += 1; }
      if (s.type === 'gather') { if (!has(N.ITEMS, s.item)) { bad.push('없는 id — ' + at + ' 채집물 ' + s.item); } if (typeof s.count !== 'number' || s.count < 1 || s.count > LIM.count || s.count % 1) { bad.push('상한 — ' + at + ' 모을 수 1~' + LIM.count); } }
    });
    if (foeN > LIM.foes * 3) { bad.push('상한 — 적 전부 ' + (LIM.foes * 3) + '(지금 ' + foeN + ')'); }
    S.forEach(function (s) { if (s && s.type === 'kill' && Array.isArray(s.kinds) && s.kinds.length > LIM.foes) { bad.push('상한 — 한 블록 적 ' + LIM.foes); } });
    Object.keys(L).forEach(function (k) { if (!used[k] && k.indexOf(u.id + '.') === 0) { bad.push('꼴 — 안 쓰는 대사 ' + k); } });
    return bad.filter(function (x, i, a) { return a.indexOf(x) === i; });
  }

  /** 1만리 단계 꼴로 — 자리는 zone·off 로, talk 은 lines:[키], 인물 id 는 '<묶음 id>_<p>' 로(본편 인물과 안 겹치게) */
  function toSteps(u) {
    var N = NATIONS[u.nation] || KR, sp = function (id) { return has(N.SPOTS, id) || N.SPOTS[0]; };
    return u.chain.steps.map(function (s) {
      var o = { type: s.type, text: s.text };
      if (s.npc) { o.npc = u.id + '_' + s.npc; }
      if (s.spot) { var p = sp(s.spot); o.zone = p.zone; o.off = p.off.slice(); }
      if (s.type === 'talk') { o.lines = [s.line]; }
      if (s.kinds) { o.kinds = s.kinds.slice(); }
      if (s.waves) { o.waves = s.waves.map(function (w) { return w.slice(); }); o.name = s.text; }
      if (s.kind) { o.kind = s.kind; }
      if (s.item) { o.item = s.item; o.count = s.count; }
      return o;
    });
  }
  /** 인물 → 묶음 people 꼴(1만리 NPCS 가 읽는 칸) */
  function toPeople(u) {
    var N = NATIONS[u.nation] || KR;
    return u.people.map(function (p) { var s = has(N.SPOTS, p.spot) || N.SPOTS[0]; return { id: u.id + '_' + p.id, pid: u.id + '_' + p.id, name: p.name, short: p.name, role: '함께 만든 이야기의 인물', body: p.body, face: null, zone: s.zone, off: s.off.slice(), color: '#7a6a5a', idle: '' }; });
  }

  /* ── 글자열 — SAGAU1|z|<base64url(deflate-raw(utf8 JSON))>|<FNV-1a 32 hex 8> ── */
  var HEAD = 'SAGAU1';
  function fnv(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  function b64u(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) { s += String.fromCharCode(bytes[i]); } return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(t) { var s = atob(t.replace(/-/g, '+').replace(/_/g, '/')), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) { b[i] = s.charCodeAt(i); } return b; }
  function pipe(bytes, Kind, fmt) { var cs = new Kind(fmt), w = new Blob([bytes]).stream().pipeThrough(cs); return new Response(w).arrayBuffer().then(function (a) { return new Uint8Array(a); }); }
  var Z = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function' && typeof Response === 'function' && typeof Blob === 'function';
  function encode(u) {
    var raw = new TextEncoder().encode(JSON.stringify(u));
    var p = Z ? pipe(raw, CompressionStream, 'deflate-raw').then(function (b) { return ['z', b64u(b)]; }) : Promise.resolve(['r', b64u(raw)]);
    return p.then(function (x) { var body = HEAD + '|' + x[0] + '|' + x[1]; return body + '|' + fnv(body); });
  }
  function decode(s) {
    var t = String(s || '').replace(/\s+/g, ''), parts = t.split('|');
    if (parts.length !== 4 || parts[0] !== HEAD) { return Promise.resolve({ ok: false, why: '머리말이 SAGAU1 이 아님' }); }
    if (t.length > 20000) { return Promise.resolve({ ok: false, why: '글자열이 너무 김' }); }
    if (fnv(parts.slice(0, 3).join('|')) !== parts[3]) { return Promise.resolve({ ok: false, why: '검사 합이 틀림(글자가 빠졌거나 바뀜)' }); }
    var bytes; try { bytes = unb64u(parts[2]); } catch (e) { return Promise.resolve({ ok: false, why: '글자열이 깨짐' }); }
    var p = parts[1] === 'z' ? (Z ? pipe(bytes, DecompressionStream, 'deflate-raw') : Promise.reject(new Error('이 브라우저는 압축을 못 품'))) : (parts[1] === 'r' ? Promise.resolve(bytes) : Promise.reject(new Error('모르는 꼴')));
    return p.then(function (b) {
      var u; try { u = JSON.parse(new TextDecoder().decode(b)); } catch (e) { return { ok: false, why: 'JSON 이 아님' }; }
      if (u && typeof u === 'object') { delete u.cleared; }   // 깼다는 표시는 만든 사람 세이브 몫 — 받은 쪽에선 지운다
      var bad = check(u); return bad.length ? { ok: false, why: bad[0], bad: bad } : { ok: true, u: u };
    }).catch(function (e) { return { ok: false, why: '풀기 실패 — ' + e.message }; });
  }

  var api = { check: check, toSteps: toSteps, toPeople: toPeople, encode: encode, decode: decode, fnv: fnv, BLOCKS: BLOCKS, BLOCK_NAME: BLOCK_NAME, NATIONS: NATIONS, DECO: DECO, LIM: LIM, BLACK: BLACK, CURSE: CURSE, ID_RE: ID_RE, HEAD: HEAD };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  global.DG = global.DG || {};
  global.DG.packcheck = api;
})(typeof window !== 'undefined' ? window : globalThis);
