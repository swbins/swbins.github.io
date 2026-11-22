/**
 * 상단 단추 정리·맞춤 — 다섯 판 공용 (W-0522, 사용자 11-01 「설정으로 상단 버튼들을 빼줄 수 있어?」「화면 숨김 정도」「화면이 깔끔하게 보이면 좋을듯」「보이는 것만 노출되도록 커스텀도 가능하도록」)
 * ---------------------------------------------------------------
 * 상단 줄 단추를 **숨기기만** 한다 — 단추와 기능은 그대로. 처음에는 설정성 단추(3D·소리·시점·도움말·초기화·지도 보기 방식)만 숨기고,
 * 설정(⚙️) 화면의 「상단 단추」 줄에서 단추마다 ▶(바로 실행)와 보임/숨김을 바꾼다. 고른 값은 이 기기에만 남는다(저장 키 'saga-ui/topbtns' — 세이브 아님).
 *   DG.topBtns.html(skip)  설정 화면에 붙일 줄 조각 · DG.topBtns.run(id) · DG.topBtns.toggle(id) · DG.topBtns.reset()
 * 손잡이 ui.topBtns 1 이면 모두 보임(옛 배치).
 */
(function (global) {
  'use strict';
  var LABEL = { 'btn-3d': '🧊 3D 화면', 'btn-sound': '🔊 소리', 'btn-camview': '🎥 시점', 'btn-help': '❓ 도움말', 'btn-reset': '↺ 처음부터', 'btn-tilt': '📐 기울기', 'btn-3inch': '🔎 3인치', 'btn-geo': '📍 내 위치', 'btn-owmap': '🗺️ 지도 보기', 'btn-auto': '🤖 자동', 'btn-map': '🗺️ 지도', 'btn-autoskill': '✨ 자동 기술', 'btn-focus': '🎯 초점', 'btn-mapfocus': '🎯 지도 초점', 'btn-star': '⭐ 별', 'btn-do': '✋ 하기', 'btn-sneak': '🤫 살금', 'btn-skill': '✨ 기술', 'btn-gyeong': '📜 경', 'btn-settings': '⚙️ 설정' };
  var DEFAULT_HIDE = ['btn-3d', 'btn-sound', 'btn-camview', 'btn-help', 'btn-reset', 'btn-tilt', 'btn-3inch', 'btn-geo', 'btn-owmap'];
  var KEY = 'saga-ui/topbtns', EXCLUDE = { 'btn-more': 1, 'btn-map-home': 1, 'btn-map-zoomin': 1, 'btn-map-zoomout': 1 };
  var mem = null;
  function doc() { return global.document; }
  function keepAll() { var C = global.DG && global.DG.core; return !!(C && C.tuned && +C.tuned('ui.topBtns', 0) > 0); }
  function load() { if (mem) { return mem; } try { mem = JSON.parse(global.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { mem = {}; } return mem; }
  function save() { try { global.localStorage.setItem(KEY, JSON.stringify(mem || {})); } catch (e) { /* 이번 판만 */ } }
  /** 상단에 있는 단추 id 목록(순서 그대로) */
  function ids() {
    var d = doc(), out = [], list;
    if (!d) { return out; }
    list = d.querySelectorAll('#top button[id^="btn-"]');
    for (var i = 0; i < list.length; i++) { if (!EXCLUDE[list[i].id] && LABEL[list[i].id]) { out.push(list[i].id); } }
    return out;
  }
  function label(id) {
    var b = doc().getElementById(id), t = LABEL[id] || (b && (b.getAttribute('title') || b.textContent || '').trim()) || id;
    return t;
  }
  function visible(id) { var m = load(); if (keepAll()) { return true; } return m[id] === undefined ? DEFAULT_HIDE.indexOf(id) < 0 : !!m[id]; }
  function apply() {
    var d = doc(), st = d && d.getElementById('topbtn-hide'), hid = ids().filter(function (i) { return !visible(i); });
    if (!d) { return; }
    if (!st) { st = d.createElement('style'); st.id = 'topbtn-hide'; d.head.appendChild(st); }
    st.textContent = hid.length ? hid.map(function (i) { return '#top #' + i; }).join(',') + '{display:none!important}' : '';
  }
  function toggle(id) { var m = load(); m[id] = !visible(id); save(); apply(); }
  function reset() { mem = {}; save(); apply(); }
  function run(id) { var b = doc() && doc().getElementById(id); if (b) { b.click(); return true; } return false; }
  /* W-0517 주인공 고르기(사용자 11-04 「모션과 일러스트가 비슷한 인물이 주인공임」) — 주역 35 중 2D 시트와 일러스트가 잘 맞는 30명(약한 5명은 K 가 일러스트를 맞춘 뒤 넣는다).
     고른 값은 기기 설정(세이브 키 아님). 안 고르면 옛 몸 그대로. 화면에는 도감 가명만 쓴다 — id 에는 실명이 들어 있어 표시 금지 */
  var HB_KEY = 'saga-ui/hero-body', ROSTER = ['jp_hideyoshi', 'jp_himiko', 'jp_ieyasu', 'jp_murasaki', 'jp_seishonagon', 'jp_shingen', 'jp_tomoegozen', 'kr_euljimundeok', 'kr_gyebaek', 'kr_heojun', 'kr_kimyusin', 'kr_wanggeon', 'kr_wonhyo', 'kr_yeongaesomun', 'kr_yihwang', 'kr_yii', 'kr_yisunsin', 'sg_caocao', 'sg_diaochan', 'sg_ganning', 'sg_guanyu', 'sg_huangzhong', 'sg_huatuo', 'sg_liubei', 'sg_lubu', 'sg_luxun', 'sg_machao', 'sg_menghuo', 'sg_pangtong', 'sg_zhaoyun'];
  /* 11-04 사용자 「괜찮을걸로 골라줘」 — 안 고른 사람의 기본 = kr_yeongaesomun(일러스트·384·192 가 가장 일치, 땅 위에서 잘 보이는 어두운 옷). 'old' 를 고르면 옛 몸 */
  var HB_DEFAULT = 'kr_yeongaesomun';
  function off() { var c = global.DG && global.DG.cfg; return !!(c && c.noHeroBody); }
  function bodyRaw() { try { return global.localStorage.getItem(HB_KEY); } catch (e) { return null; } }
  function bodyGet() { var v = bodyRaw(), C = global.DG && global.DG.core; if (v === 'old' || (C && C.tuned && !+C.tuned('hero.body', 1))) { return null; } return ROSTER.indexOf(v) >= 0 ? v : HB_DEFAULT; }
  function bodySet(id) { try { if (ROSTER.indexOf(id) >= 0 || id === 'old') { global.localStorage.setItem(HB_KEY, id); } else { global.localStorage.removeItem(HB_KEY); } } catch (e) { /* 이번 판만 */ } }
  function bodyName(id) { var D = global.DG && global.DG.data, l = (D && D.heroes) || [], i; for (i = 0; i < l.length; i++) { if (l[i].id === id) { return l[i].name; } } return null; }
  function bodyApply(id) { bodySet(id); var C = global.DG && global.DG.core; try { if (C && C.persist) { C.persist(); } } catch (e) { /* 저장 못 해도 몸만 바뀐다 */ } global.location.reload(); }   // 인물 몸은 세울 때 정해져 다시 읽는 게 가장 안전하다
  /** onPick 이 있으면 다시 읽지 않고 고른 값만 넘긴다 — 가입 화면(W-0517 ④)은 쓰던 이름을 잃지 않게 */
  function bodyOpen(onPick) {
    var d = doc(), old = d.getElementById('hero-body-pick'), box = d.createElement('div'), cur = bodyGet(), A3 = global.DG && global.DG.assets3d, h = '';
    if (old) { old.remove(); }
    box.id = 'hero-body-pick';
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(10,8,6,.92);overflow:auto;padding:14px;box-sizing:border-box;color:#f4ead6';
    h = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 auto 12px;max-width:980px"><b style="font-size:18px">주인공 고르기</b><span style="display:flex;gap:6px"><button class="btn tiny ghost" data-hb="old">예전 몸</button><button class="btn tiny ghost" data-hb-close="1">닫기</button></span></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;max-width:980px;margin:0 auto">';
    ROSTER.forEach(function (id) {
      var n = bodyName(id), u = A3 && A3.sharedUrl ? A3.sharedUrl('illust_sprite/' + id + '/bust.webp') : null;   // DG.illust 를 안 거친다 — 1만리·3마을은 illust.js 를 안 싣는다
      if (!n) { return; }   // 도감에 없는 판이면 이름을 못 쓰니 뺀다(id 를 보이지 않는다)
      h += '<button data-hb="' + id + '" style="background:#2a2118;border:2px solid ' + (id === cur ? '#f0b040' : '#5a4a36') + ';border-radius:8px;padding:4px;color:inherit;cursor:pointer;min-height:44px">' + (u ? '<img alt="" src="' + u + '" style="width:100%;aspect-ratio:1;object-fit:contain;display:block">' : '') + '<span style="font-size:13px">' + n + '</span></button>';
    });
    box.innerHTML = h + '</div>';
    box.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!b) { return; }
      if (b.hasAttribute('data-hb-close')) { box.remove(); return; }
      if (b.hasAttribute('data-hb')) { if (typeof onPick === 'function') { bodySet(b.getAttribute('data-hb')); box.remove(); onPick(bodyGet()); } else { bodyApply(b.getAttribute('data-hb')); } }
    });
    d.body.appendChild(box);
  }
  /** 설정 화면 줄 조각. skip = 이미 설정에 따로 있는 단추 id 목록(그 줄은 빼고) */
  function html(skip) {
    var list = ids().filter(function (i) { return !skip || skip.indexOf(i) < 0; }), h, hb = bodyGet(), row = '<div class="key-row"><b>주인공</b><span style="display:flex;gap:6px;align-items:center"><span class="key-cur">' + ((hb && bodyName(hb)) || '예전 몸') + '</span><button class="btn tiny primary" data-act="hero-body">바꾸기</button></span></div>';
    if (off()) { row = ''; }   // 5천하는 걷는 주인공이 없어 고를 것이 없다
    var M2 = global.DG && global.DG.mode2d; if (M2 && M2.layerHas && global.DG.actor2d && M2.layersOn() && M2.layerHas(M2.pick('me', 'me'))) { [['helm', '2D 투구 보이기'], ['armor', '2D 갑옷 보이기']].forEach(function (p) { row += '<div class="key-row"><b>' + p[1] + '</b><button data-act="layer-pref" data-id="' + p[0] + '">' + (M2.layerPref(p[0]) ? '켜짐' : '꺼짐') + '</button></div>'; }); }   // W-0136 사용자 11-05 「투구 보이기 안보이기도」「갑옷 전체 안보이」 — 이 기기 설정, 세이브 아님
    if (keepAll() || !list.length) { return row; }
    h = row + '<div class="key-row"><b>상단 단추</b><span class="key-cur">보이는 것만 상단에 둡니다</span></div>';
    list.forEach(function (i) {
      var v = visible(i);
      h += '<div class="key-row" style="gap:6px"><b>' + label(i) + '</b><span style="display:flex;gap:6px">' +
        '<button class="btn tiny ghost" data-act="topbtn" data-id="' + i + '">▶ 실행</button>' +
        '<button class="btn tiny ' + (v ? 'primary' : 'ghost') + '" data-act="topbtn-vis" data-id="' + i + '">' + (v ? '상단 보임' : '상단 숨김') + '</button></span></div>';
    });
    return h + '<div class="key-row"><button class="btn tiny ghost" data-act="topbtn-reset">기본 배치로</button></div>';
  }
  /* W-0522 설정 분류 탭(사용자 11-01 「메뉴 설정도 깔끔한 게임을 참조해줘」) — 한 장에 길게 늘어선 줄을 화면·소리·조작·게임·단추로 나눈다.
     줄과 단추는 판이 만든 그대로(data-act 처리 그대로), 어느 탭인지만 이름으로 가른다. 손잡이 ui.settingsTabs 0 = 옛 한 장 */
  var TAB_LIST = [['screen', '화면'], ['sound', '소리'], ['control', '조작'], ['game', '게임'], ['btns', '단추']], tabCur = null;
  var TAB_CSS = '.st-tabs{display:flex;gap:4px;margin:0 0 10px;position:sticky;top:0;z-index:2;background:inherit}' +
    '.st-tabs button{flex:1 1 0;min-height:44px;padding:0 4px;font-size:15px;font-weight:700;color:inherit;background:rgba(127,127,127,.14);border:0;border-bottom:3px solid transparent;border-radius:8px 8px 0 0;cursor:pointer;opacity:.72}' +
    '.st-tabs button.on{opacity:1;background:rgba(240,176,64,.2);border-bottom-color:#f0b040}' +
    '.st-panel{display:none}.st-panel.on{display:block}' +
    '.st-panel .key-row{min-height:44px;gap:8px;flex-wrap:wrap}' +
    '.st-panel .key-row button{min-height:38px;min-width:56px}' +
    '.st-panel .key-row input[type=range]{flex:1 1 120px;min-width:90px;accent-color:#f0b040}' +
    '.st-panel .key-row b{flex:0 0 auto;white-space:nowrap}' +
    '.st-panel .key-cur{color:inherit;opacity:.85;font-weight:700}' +
    '.st-panel .key-row button.st-on{background:#c98a1e;border-color:#f0b040;color:#fff}' +
    '.st-panel .key-row button.st-off{background:rgba(127,127,127,.22);color:inherit}' +
    '.st-more{margin:2px 0 8px;font-size:12px;opacity:.8}.st-more summary{cursor:pointer;min-height:24px}';
  function rowTab(el) {
    var t = (el.textContent || '').trim(), b = el.querySelector ? el.querySelector('b') : null, n = b ? (b.textContent || '') : '';
    if (el.classList && el.classList.contains('keyhint')) { return 'control'; }
    if (el.querySelector && el.querySelector('[data-act^="topbtn"]') || /상단 단추/.test(n)) { return 'btns'; }
    if (!n) { return null; }   // 이름 없는 줄(선택 단추·설명)은 앞 줄을 따라간다
    if (/효과음|음량|음악|BGM|음성|진동/.test(n)) { return 'sound'; }
    if (/키|걷기|카메라|다가가기/.test(n)) { return 'control'; }
    if (/화면|시점|그래픽|품질|화질|안개|흔들림|타격 정지|지도/.test(n)) { return 'screen'; }
    return t ? 'game' : null;
  }
  function tabsWrap(h) {
    var d = doc(), C = global.DG && global.DG.core, T, parts = {}, last = null, out = '', used;
    if (!d || !d.createElement || (C && C.tuned && !+C.tuned('ui.settingsTabs', 1))) { return h; }
    T = d.createElement('template');
    if (!T.content) { return h; }
    T.innerHTML = h;
    Array.prototype.slice.call(T.content.childNodes).forEach(function (el) {
      if (el.nodeType !== 1) { if (!(el.textContent || '').trim()) { return; } }
      var k = (el.nodeType === 1 ? rowTab(el) : null) || last || 'game';
      if (el.nodeType === 1) {
        last = k;
        Array.prototype.slice.call(el.querySelectorAll('button')).forEach(function (b) {
          var x = (b.textContent || '').trim();
          if (x === '켜짐') { b.classList.add('st-on'); } else if (x === '꺼짐') { b.classList.add('st-off'); }
        });
        /* 긴 설명은 접는다 — 줄을 읽기 전에 글부터 보이지 않게 */
        if (((el.classList && el.classList.contains('hint')) || el.tagName === 'SMALL') && (el.textContent || '').length > 40) {
          parts[k] = (parts[k] || '') + '<details class="st-more"><summary>ⓘ 설명</summary>' + el.innerHTML + '</details>'; return;
        }
        parts[k] = (parts[k] || '') + el.outerHTML;
      } else { parts[k] = (parts[k] || '') + el.textContent; }
    });
    if (parts.control && !/<b[ >]/.test(parts.control)) { parts.game = (parts.game || '') + parts.control; delete parts.control; }   // 이동 키 안내 한 줄뿐이면 조작 탭을 만들지 않는다
    used = TAB_LIST.filter(function (p) { return parts[p[0]]; });
    if (used.length < 2) { return h; }
    if (!used.some(function (p) { return p[0] === tabCur; })) { tabCur = used[0][0]; }
    if (!d.getElementById('st-tab-css')) { var st = d.createElement('style'); st.id = 'st-tab-css'; st.textContent = TAB_CSS; d.head.appendChild(st); }
    out = '<div class="st-tabs">' + used.map(function (p) { return '<button type="button" data-settab="' + p[0] + '" class="' + (p[0] === tabCur ? 'on' : '') + '">' + p[1] + '</button>'; }).join('') + '</div>';
    used.forEach(function (p) { out += '<div class="st-panel' + (p[0] === tabCur ? ' on' : '') + '" data-stpanel="' + p[0] + '">' + parts[p[0]] + '</div>'; });
    return out;
  }
  function tabClick(e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-settab]') : null, box, k;
    if (!b) { return; }
    k = b.getAttribute('data-settab'); tabCur = k; box = b.parentNode.parentNode;
    Array.prototype.forEach.call(box.querySelectorAll('[data-settab]'), function (x) { x.classList.toggle('on', x === b); });
    Array.prototype.forEach.call(box.querySelectorAll('[data-stpanel]'), function (x) { x.classList.toggle('on', x.getAttribute('data-stpanel') === k); });
  }
  if (doc() && doc().addEventListener) { doc().addEventListener('click', tabClick); }
  /** settings-sheet button handler: true when handled (caller redraws the sheet) */
  function act(a, btn) {
    var id = btn && btn.getAttribute && btn.getAttribute('data-id');
    if (a === 'topbtn') { run(id); return true; }
    if (a === 'topbtn-vis') { toggle(id); return true; }
    if (a === 'topbtn-reset') { reset(); return true; }
    if (a === 'hero-body') { bodyOpen(); return true; }
    if (a === 'layer-pref') { var M3 = global.DG.mode2d; if (M3 && M3.layerPref) { M3.layerPref(id, !M3.layerPref(id)); } return true; }
    return false;
  }
  global.DG = global.DG || {};
  /* W-0541 플레이어가 고르는·새로 들이는 인물은 주역 명단(ROSTER)만 — 일러스트와 8동작 몸이 맞는 사람. 손잡이 hero.rosterOnly(1, 0 = 옛 전체).
     inRoster(id 또는 인물) · pool(인물 배열) = 거른 배열(비면 그대로 두지 않고 빈 배열 — 부르는 쪽이 물러날 길을 정한다) */
  function rosterOn() { var C = global.DG && global.DG.core; return !(C && C.tuned && !+C.tuned('hero.rosterOnly', 1)); }
  function inRoster(h) { if (!rosterOn()) { return true; } var id = h && typeof h === 'object' ? h.id : h; return ROSTER.indexOf(id) >= 0; }
  function rosterPool(arr) { return (arr || []).filter(inRoster); }
  global.DG.heroBody = { off: off, get: bodyGet, set: bodySet, name: bodyName, open: bodyOpen, ROSTER: ROSTER, inRoster: inRoster, pool: rosterPool, rosterOn: rosterOn };
  global.DG.topBtns = { tabs: tabsWrap, act: act, html: html, run: run, toggle: toggle, reset: reset, apply: apply, ids: ids, visible: visible };
  if (doc()) { if (doc().readyState === 'loading') { doc().addEventListener('DOMContentLoaded', apply); } else { apply(); } }
})(typeof window !== 'undefined' ? window : this);
