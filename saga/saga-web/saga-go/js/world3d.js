/**
 * 3D 렌더러 — 원작의 화면을 WebGL 로 옮긴다
 * ---------------------------------------------------------------
 * 여태 화면은 캔버스 2D 였다. 2.5D·3D 모드도 스프라이트를 원근으로 **세워 그린**
 * 가짜였다(`world.js` 의 `project()`). 원작은 지도 위에 진짜 3D 가 서 있고,
 * 그림자가 지면에 지고, 카메라가 낮게 깔려 따라다닌다. 그 층을 여기 만든다.
 *
 *   지면    실제 지도 타일을 **평면에 텍스처로** 깐다 (타일을 못 받으면 절차적 지형)
 *   사물    지도에 높이 정보가 없으니 `terrainAt` 격자로 **절차적으로 세운다**(`propPlan`)
 *   인물·짐승  `actor3d.js` 가 **도형으로 조립한 입체**를 세운다 (빌보드는 되돌림용)
 *   조명    시각과 천후를 보고 해가 뜨고 진다 (`lightingAt`)
 *   카메라  플레이어를 뒤에서 낮게 본다. 조우가 열리면 그쪽으로 다가간다
 *
 * **판정에는 한 줄도 닿지 않는다.** 좌표·스폰·거리는 전부 `world.js` 의 것을 읽기만
 * 하고, 여기서 만든 값은 화면에만 쓴다. 그래서 자가진단(`DG_NO_DRAW`)은 이 파일을
 * 켜지도 않고, 켜지지 않아도 게임은 그대로 돈다 — 대신 **값을 내는 함수**
 * (`lightingAt`·`propPlan`·`camAim`)는 three 없이도 돌아 진단이 그것만 따로 본다.
 *
 * WebGL 이 없거나 켜다 실패하면 **조용히 2D 로 돌아간다**(`available()` 이 false).
 * three.js 는 `js/vendor/three.iife.js` 한 덩이로 들어 있다 — PC 단독판이 `file://`
 * 로 열리는데 거기서는 `<script type="module">` 이 막히기 때문이다(그래서 IIFE 다).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var T = null;                 // THREE (없으면 이 모듈은 통째로 잠든다)
  var renderer = null, scene = null, camera = null;
  var sun = null, sky = null;
  var groundGroup = null, propGroup = null, actorGroup = null, fxGroup = null;
  var tileMeshes = {};          // 지면 타일 { key: Mesh }
  var propMeshes = {};          // 건물·나무 { key: Object3D }
  var townDens = {};            // 'gx:gy' → 그 마을 칸을 지을 때 쓴 밀도(houseRects 가 보이는 집과 같은 계획을 뽑게)
  var actors = {};              // 배우 { key: {node, shadow, seen, …} }
  var texCache = {};            // 캔버스/이미지 텍스처
  var ready = false, failed = false;
  var canvas = null;
  var frame = 0;
  var lightNow = null;          // 이번 프레임의 조명 (probe 가 들여다본다)

  /* ── 규칙 값 (화면에만 쓰는 값이라 손잡이로 열어 둔다) ── */

  function TILE_SPAN() { return core.tuned('world3d.tileSpan', 3); }      // 타일 반경(장)
  /** 버거우면 스스로 깎는 배수 (`perf.js`) — 없으면 1 이라 예전과 같다 */
  function PF(key) { var P = global.DG.perf; return P ? P.mul(key) : 1; }
  function PROP_R() { return core.tuned('world3d.propRadius', 260) * PF('radius'); }   /* W-0185 픽셀 비율 상한 — 폰 표(prop3d.light)면 1, 아니면 1.5(§6.1) */ function PR_CAP() { var P3 = global.DG.prop3d; return core.tuned('world3d.pixelCap', P3 && P3.light && P3.light() ? 1 : 1.5); }
  /* 부수는 반경 — 짓는 반경(R)보다 크게 잡아 경계에서 왕복해도 짓고 부수고를
     되풀이하지 않는다 (PLAN 42절 ACTIVE/VISIBLE/UNLOAD) */
  function PROP_UR(R) { return R * core.tuned('world3d.unloadRadius', 1.4); }
  /** 잔 사물(나무·바위·풀)의 **진짜 모델**을 받는 거리(m, PLAN 36절 LOD).
   * 이 밖은 곧장 싼 도형(원뿔·공)으로 선다 — 진짜 모델은 도형보다 삼각형이
   * 백 배다(`prop3d.js` 의 `ON()` 과 같은 사정이지만, 그건 기기 등급으로
   * 가르고 이건 **거리**로 가른다) */
  function LOD_NEAR() { return core.tuned('world3d.lodNear', 90) * PF('radius'); }
  /** 잎·풀이 바람에 흔들릴까(PLAN 44절) — 0 이면 정지 화면(느린 기기용) */
  function SWAY_ON() { return core.tuned('world3d.sway', 1) ? true : false; }
  /** 흔들리는 폭(정점 좌표 배율) — 크면 과장되게 흔든다 */
  function SWAY_AMT() { var G = global.DG.ground3d; return core.tuned('world3d.swayAmt', 0.06) * (G && G.windMul ? G.windMul(G.windNow()) : 1); }   // W-0210 바람 천후면 더 흔든다(잔풀과 같은 배율)
  /** 등롱·사당 불이 일렁일까(PLAN 44절 "불꽃") — 0 이면 고정 밝기 */
  function FLAME_ON() { return core.tuned('world3d.flame', 1) ? true : false; }
  /** 일렁이는 폭(emissiveIntensity 배율) */
  function FLAME_AMT() { return core.tuned('world3d.flameAmt', 0.18); }
  /** 등롱·사당 위에 연기가 오를까(PLAN 44절) — 불과 같은 밤에만 보인다 */
  function SMOKE_ON() { return core.tuned('world3d.smoke', 1) ? true : false; }
  function CAM_DIST() { return core.tuned('world3d.camDist', 40); }       // 카메라 거리(m)
  function CAM_HIGH() { return core.tuned('world3d.camHeight', 15); }     // 카메라 높이(m)
  /** 사람 키(m) — 원작처럼 지도 위에서는 실제보다 크게 세운다(1.8m 면 안 보인다) */
  function ACTOR_H() { return core.tuned('world3d.actorH', 3.4); }
  /** 배우를 도형으로 세울까 — 0 이면 1단계의 빌보드로 돌아간다 */
  function MESH_ON() {
    var P = global.DG.perf;
    if (P && !P.meshOk()) { return false; }      // 가장 버거울 때는 빌보드로 돌아간다
    return core.tuned('world3d.mesh', 1) ? true : false;
  }
  /** 건물 밀도 배수 — 기기가 버거우면 여기를 내린다 */
  function DENSITY() { return core.tuned('world3d.density', 1) * PF('prop'); }
  /** 시각을 따라 해가 뜨고 질까 — 0 이면 늘 한낮.
   * 2026-08-30에 기본을 껐었다 — 밤을 다섯 번 밝혀도(색·세기·깊은밤 감쇠
   * 다 낮 수준까지 밀었다) 사용자가 실기기에서 계속 어둡다고 했고, 결국
   * "밤을 낮으로 바꿔 달라"고 해서 아예 밤 자체를 없앴었다.
   * **2026-09-10, 다시 켰다** — "지도도 더 자연스럽게 … 별도 보이고" 요청으로
   * 별(`sky3d.js`)을 넣으려면 밤이 실제로 뜻이 있어야 했다. 사용자가 "밤이라도
   * 밝게 해, 잘 보이게"로 확인 — 그래서 그날 최대한 밝혀 둔 밤 세기·색은
   * 한 글자도 안 건드렸다(아래 `lightingAt` 의 밤 최저치 주석 그대로), 사이클
   * 자체만 되살렸다. 손잡이는 그대로 있으니 0 으로 내리면 다시 늘 한낮이다 */
  function DAYNIGHT() { return core.tuned('world3d.dayNight', 1) ? true : false; }
  /** 비·눈에 강물이 불까 — 0 이면 늘 마른 날의 그림이다 */
  function WET() { return core.tuned('world3d.wetRiver', 1) ? true : false; }
  /** 세로 화면에서 카메라를 물릴까 — 0 이면 옛 그림(폰에서 지형지물이 화면을 덮는다) */
  function PORTRAIT_FIT() { return core.tuned('world3d.portraitFit', 1) ? true : false; }
  /** 물리는 정도의 상한(배) — 1 이면 안 물린다 */
  function PORTRAIT_MAX() { return core.tuned('world3d.portraitMax', 1.8); }

  /** 기본 시야각(도) — 가로 화면에서 쓰던 값 */
  function FOV() { return core.tuned('world3d.fov', 52); }
  /** 세로 화면에서 벌릴 수 있는 시야각의 상한(도) */
  function FOV_MAX() { return core.tuned('world3d.fovMax', 80); }

  /* 이 판의 거리·높이 값은 **PC 가로 화면**에서 잡혔다. three 의 fov 는 세로
     기준이라, 세로로 긴 폰(가로세로비 0.53)에서는 가로 시야가 PC 의 절반 밑으로
     좁아진다 — 같은 자리인데 건물과 나무가 화면을 덮는다.
     **카메라를 물리지는 않는다.** 물려 봤더니 안개(lightingAt 의 fog)가 가로
     화면 거리에 맞춰져 있어 화면이 통째로 하얘졌다 — 실제로 찍어 보고 접은 길이다.
     대신 **시야각만 벌린다**: 카메라는 제자리라 안개도 그림자 상자도 그대로다.
     REF 는 그 거리 값들이 잡힌 화면의 가로세로비다. */
  var REF_ASPECT = 1.5;
  var DEG = 180 / Math.PI;
  /** 이 화면에서 쓸 시야각(도). 가로 화면이면 기본값 그대로 */
  function fovFor(w, h) {
    var base = FOV();
    if (!PORTRAIT_FIT() || !w || !h) { return base; }
    var a = w / h;
    if (a >= REF_ASPECT) { return base; }
    /* 제곱근을 쓴다 — 가로 시야를 그대로 되찾으려면 폰에서 112도가 되어 휜다 */
    var mul = Math.min(PORTRAIT_MAX(), Math.sqrt(REF_ASPECT / a));
    var t = Math.tan(base / 2 / DEG) * mul;
    return Math.min(FOV_MAX(), 2 * Math.atan(t) * DEG);
  }

  /** 3D 로 그릴까 — 손잡이로 끌 수 있다(0 이면 예전 2D 화면) */
  function wanted() { var S = core.save && core.save.settings, v = core.tuned('world.render3d', 1) && !(S && S.tilt === 0) ? true : false; return global.DG.deviceMode ? global.DG.deviceMode.want3d('go', v) : v; }   // 10-19 폰은 2D(이 탭에서 시점을 올렸을 때만 3D)   // 시점 2D(tilt 0) = 2D 캔버스 판(W-0019 — "2D 단추를 누르면 전체가 2D")

  function available() { return ready && !failed; }
  function active() { return available() && wanted(); }

  /* ── 시간대 조명 ──────────────────────────────────────────
   * 원작에서 저녁에 나가면 화면이 저녁이다. 그 하나가 "지금 밖에 있다" 를 만든다.
   * 여기서는 **시각과 천후만 보고** 값을 낸다 — three 도 세이브도 안 본다.
   * 그래서 자가진단이 이 함수만 따로 굴려 볼 수 있다.
   */
  /* 시간대 빛 값(mixHex·lum·색 표·lightingAt)은 순수 함수라 world3d-light.js 로 떼어 냈다(W-0110, 큰 파일 줄 수) */
  var W3L = global.DG.w3light, mixHex = W3L.mixHex, lum = W3L.lum, lightingAt = W3L.lightingAt;

  /* 데모가 밤·노을을 눈으로 확인할 때 쓰는 문 — 게임에서는 늘 null 이라 진짜 시계를 본다
     (`weather.force` 와 같은 방식이다: 밖에서 함수를 갈아 끼우면 안쪽 호출이 안 바뀐다) */
  var forcedMs = null;
  function forceTime(ms) {
    forcedMs = (ms === null || ms === undefined) ? null : ms;
    return forcedMs;
  }

  function weatherKey() {
    var FRw = global.DG.frost;
    if (FRw && FRw.snowingHere && FRw.snowingHere()) { return 'snow'; }   // §5 ⑲-27 서리봉 고원 안에서만 눈
    var W = global.DG.weather;
    return W ? W.current().key : 'clear';
  }

  /**
   * HDRI 환경광(IBL) — Poly Haven CC0 "Alps Field"(사가마을이 이미 쓰는 파일을
   * 그대로 재사용, `assets/ASSET_LICENSES.md` 참고). 2026-09-04, 사용자가
   * "재질을 실사처럼" 요청해 얹는다. **하늘 색은 안 바꾼다** — `scene.background`
   * 는 그대로 `lightingAt()` 의 시각별 색에 맡기고, `scene.environment` 에만
   * 물려 PBR 재질(GLB 인물·건물)의 반사·거칠기만 사실적으로 만든다.
   *
   * **밤에 대낮 하늘이 그대로 비치면 안 된다** — 이 판은 예전에 ACES
   * 톤매핑을 걸었다가 밤 화면이 통째로 날아간 사고를 겪었다(`post3d.js`
   * 머리말 "ACES 로 갔다가 물러섰다" 참고). 같은 사고를 되풀이하지 않으려고
   * 톤매핑 곡선은 손 안 대고, 대신 환경광 **세기 자체**를 `syncLight()` 에서
   * `hemi.intensity`(이미 낮·밤·날씨별로 손으로 맞춰 둔 그 곡선)에 비례해
   * 매 프레임 같이 낮춘다/올린다 — 이 판의 밤은 원래도 그리 어둡지 않게
   * 맞춰져 있어(`lightingAt` 의 밤 최저치 주석 참고) 낮과 크게 다투지 않는다.
   * 못 받아도(느린 회선·file:// 단독판 등) 조용히 넘어가고 옛 조명만으로 돈다.
   */
  var IBL_SRC = '../shared/assets/sky/ibl_noon_present_1k.hdr';   function iblSrc() { var A = global.DG.assets3d; return (A && A.root && A.root()) ? A.root() + 'sky/ibl_noon_present_1k.hdr' : IBL_SRC; }   // W-0139 — 자체 하늘 C HDR 먼저 · W-0154 — 옛 사진 HDR 지움, 폴백은 같은 파일을 상대 경로로 한 번 더
  function IBL_ON() { return core.tuned('world3d.ibl', 1) ? true : false; }
  /** 얼마나 세게 섞나 — hemi.intensity(대략 1.4~1.7) 에 곱하는 비율.
   *  너무 세면 반사가 재질 색을 삼킨다(눈으로 보고 0.30으로 정함) */
  function IBL_SCALE() { return core.tuned('world3d.iblScale', 0.30); }
  function loadEnvironment() {
    if (!IBL_ON() || !T.RGBELoader || !T.PMREMGenerator || !renderer) { return; }
    var pmrem = new T.PMREMGenerator(renderer), A = global.DG.assets3d;   // W-0139 — 자체 하늘 C 로 구운 HDR(shared/assets/sky)이 먼저, 못 받으면 상대 경로로 한 번 더
    pmrem.compileEquirectangularShader();
    var go = function (src) { new T.RGBELoader().load(src, function (hdr) {
      var envMap = pmrem.fromEquirectangular(hdr).texture;
      if (scene) { scene.environment = envMap; }
      hdr.dispose(); pmrem.dispose();
    }, undefined, function () { if (src !== IBL_SRC) { go(IBL_SRC); } else { pmrem.dispose(); } }); };
    if (A && A.whenSettled) { A.whenSettled(function () { go(iblSrc()); }); } else { go(IBL_SRC); }
  }

  /* ── 켜기 ─────────────────────────────────────────────── */

  function init(cv) {
    if (ready || failed) { return available(); }
    T = global.THREE || null;
    canvas = cv || document.getElementById('map3d');
    if (!T || !canvas) { failed = true; return false; }
    try {
      /* `preserveDrawingBuffer` — 평소에는 끈다(빠르다). 헤드리스 스크린샷에서는
         **켜야 한다**: WebGL 은 그린 직후 버퍼를 비우므로, rAF 가 거의 돌지 않는
         그 환경에서는 캡처 시점에 빈 캔버스가 찍힌다(밟아 본 함정이다).
         데모 페이지가 `DG_3D_PRESERVE` 로 켠다. */
      renderer = (global.DG.renderer3d ? global.DG.renderer3d.make : function (t, o) { return new t.WebGLRenderer(o); })(T, {   // W-0310 ⑤ 렌더러 고르기(go3d.webgpu=1 이면 WebGPU 시도, 못 켜면 WebGL)
        canvas: canvas, antialias: true, alpha: false,
        preserveDrawingBuffer: !!global.DG_3D_PRESERVE
      });
      /* SAGA-DESIGN §6.1 "저비용 통일" — 픽셀 비율 상한 1.5(옛 2는 폰에서 과잉 렌더) */
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, PR_CAP()));
      renderer.outputColorSpace = T.SRGBColorSpace;
      /* 디버그: 그림자·안개를 끊어 원인을 좁힐 수 있게 (DG_3D_DEBUG) */
      if (!(global.DG_3D_DEBUG || {}).noShadow) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = T.PCFSoftShadowMap;
      }
    } catch (e) {
      failed = true;
      return false;
    }

    scene = new T.Scene();
    /* 카메라가 낮으면 지평선 위가 보인다 — 검정이 아니라 하늘이 있어야 한다.
       안개는 그 하늘색으로 멀리서 스며들게 해 경계가 드러나지 않게 한다. */
    var L0 = lightingAt(undefined, weatherKey());
    var skyCol = new T.Color(L0.bg);
    scene.background = skyCol;
    renderer.setClearColor(skyCol, 1);       // background 와 별개로 못박아 둔다
    if (!(global.DG_3D_DEBUG || {}).noFog) {
      scene.fog = new T.Fog(L0.bg, L0.fog.near, L0.fog.far);
    }

    camera = new T.PerspectiveCamera(
      fovFor(canvas.clientWidth || global.innerWidth, canvas.clientHeight || global.innerHeight),
      1, 0.5, 1400);

    /* 빛은 둘뿐이다 — 하늘/땅에서 오는 반사광과, 그림자를 만드는 해 하나 */
    sky = new T.HemisphereLight(L0.hemi.sky, L0.hemi.ground, L0.hemi.intensity);
    scene.add(sky);
    sun = new T.DirectionalLight(L0.sun.hex, L0.sun.intensity);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -140;
    sun.shadow.camera.right = 140;
    sun.shadow.camera.top = 140;
    sun.shadow.camera.bottom = -140;
    sun.shadow.bias = -0.0012;
    scene.add(sun);
    scene.add(sun.target);
    /* 배우를 따라다니며 머리 위에 뜨던 등롱 불빛은 뺐다(2026-08-29) — 사용자가
       실기기에서 허공에 뜬 빛 덩이로 보인다고 지적했다. 밤 자체가 이제
       충분히 밝아(위 lightingAt 의 최저치) 따로 안 켜도 배우가 묻히지 않는다 */

    /* 후처리 — 톤매핑·블룸·색보정 (`post3d.js`, 그래픽 보강 16~18절).
       **렌더러를 만든 직후 켜야 한다** — 여기서 `toneMapping` 을 한 번 켜 두면
       뒤에 만드는 재질이 모두 그 상태로 컴파일된다. 늦게 켜면 씬 전체가
       한 번 다시 컴파일되며 화면이 멎는다 */
    if (global.DG.post3d) { global.DG.post3d.init(T, renderer); }
    loadEnvironment();

    groundGroup = new T.Group(); scene.add(groundGroup);
    propGroup = new T.Group(); propGroup.name = 'props'; scene.add(propGroup);
    actorGroup = new T.Group(); scene.add(actorGroup);
    fxGroup = new T.Group(); scene.add(fxGroup);

    bindEvents();
    /* 소품 모델(나무·바위·풀)을 미리 받아 둔다 — 안 받아 두면 처음 몇 초 동안
       원뿔 나무가 서 있다가 툭 바뀐다 (`prop3d.js`) */
    if (global.DG.prop3d) { global.DG.prop3d.preload(); }
    preloadLandTex();
    ready = true;
    resize();
    return true;
  }

  function resize() {
    if (!available() || !canvas) { return; }
    var w = canvas.clientWidth || global.innerWidth;
    var h = canvas.clientHeight || global.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.fov = fovFor(w, h);
    camera.updateProjectionMatrix();
    if (global.DG.post3d) { global.DG.post3d.resize(); }
  }

  /* 좌표 — world.js 는 미터 평면(x 동쪽, y 남쪽)이고 3D 는 y 가 높이다.
     **(x, y) → (x, 0, y)** 로 그대로 눕힌다. 축을 다시 정의하지 않는다. */

  /* ── 지면 ─────────────────────────────────────────────── */

  /* ── 손으로 그린 땅을 지면에 칠한다 ─────────────────
   * 여태 이 땅(`land.js`)은 **사물로만** 드러났다 — 판교 지도 위에 하북 마을의
   * 기와집이 서 있는 꼴이었다. 지면 그림 자체를 맞춘다.
   *
   * 지도 타일을 캔버스에 그대로 굽고, 그 위에 **48m 격자마다 제 색을 덧칠**한다.
   * 지도가 안 왔으면 색만 칠한다 — 오프라인에서도 이 땅은 이 땅으로 보인다.
   *
   * **가장자리는 흐린다.** 딱 잘리면 종이를 오려 붙인 것으로 보인다 —
   * 이웃 넷 중 몇이 이 땅인지 세어 그만큼만 진하게 칠한다.
   */
  var LAND_COLOR = {
    grass: '#8fae6a', forest: '#5c7f4e', mount: '#9a9188',
    water: '#4a7fa6', road: '#c9bfa8', town: '#c2b49a', farm: '#7f9c5e'
  };
  /** 덧칠을 할까 — 0 이면 예전처럼 실제 지도만 깔린다 */
  function LAND_PAINT() { return core.tuned('world3d.landPaint', 1) ? true : false; }
  /** 얼마나 진하게 — 1 이면 지도가 아예 안 비친다 */
  function PAINT_A() { return core.tuned('world3d.landPaintAlpha', 0.88); }

  /* ── 땅의 소재 텍스처 — js/world3d-landtex.js(R-4). 같은 이름 한 줄 넘김 · 캐시 객체는 같은 것을 본다 ─────────── */
  var syncGen = 0;   // 세대 카운터 — syncGround 가 올리고 텍스처가 userData.gen 에 찍는다(안 쓰인 칸 버리기)
  var ltBind = null, LTXM = global.DG.world3dLandTex, LAND_TEX_VARIANTS = LTXM.LAND_TEX_VARIANTS, landTex = LTXM.landTex;
  function LTX() { return LTXM.bind(ltBind || (ltBind = { LAND_COLOR: LAND_COLOR, LAND_PAINT: LAND_PAINT, PAINT_A: PAINT_A, GRID: GRID, h1: h1, gen: function () { return syncGen; }, three: function () { return T; } })); }
  function preloadLandTex() { return LTX().preloadLandTex.apply(null, arguments); } function landTexture() { return LTX().landTexture.apply(null, arguments); } function terrainTexture() { return LTX().terrainTexture.apply(null, arguments); }

  /* ── 땅의 높낮이 (PLAN 14절) ─────────────────────────
   * 값은 `relief3d.js` 가 낸다(순수 함수). 여기 있는 것은 **그 값을 화면에
   * 바르는 일**뿐이다 — 지면 정점을 밀고, 배우를 앉히고, 카메라를 띄운다.
   * `world.js` 의 좌표·거리·스폰은 여전히 평면 2D 라 **균형이 안 움직인다.**
   */
  function RELIEF() { return global.DG.relief3d || null; }
  function RELIEF_ON() { var R = RELIEF(); return !!(R && R.on()); }
  /** 타일 한 장을 몇 칸으로 나누나 — 클수록 곱지만 정점이 제곱으로 는다 */
  function RELIEF_SEG() { return Math.max(1, Math.round(core.tuned('relief3d.seg', 8))); }

  /** 그 자리의 땅 높이(m). 높낮이가 꺼져 있으면 0 — 부르는 쪽은 몰라도 된다 */
  function groundY(x, z) {
    var R = RELIEF();
    return R ? R.heightAt(x, z) : 0;
  }
  /**
   * §5 ⑲-20 구름섬 — 섬 층(sky)에 선 몸은 섬 윗면에 선다. 섬 밑 땅은 그대로라 층을 모르면 안 올린다.
   * standY 의 sky 를 안 주면 **내 층**(landform.onSky) — 예고 원·광역 고리처럼 내 곁에 그리는 것
   */
  function meSky() { var LF = global.DG.landform; return !!(LF && LF.onSky && LF.onSky()); }
  function skyLift(x, z, sky) {
    var SK = global.DG.skyIsle, pd;
    if (!sky || !SK || !SK.layerOn || !SK.layerOn() || !(pd = SK.padAt(x, z))) { return 0; }   // ⑲-35 그 자리 발판(섬·관측대)
    return Math.max(0, pd.top - groundY(x, z));
  }
  function standY(x, z, sky) { return groundY(x, z) + skyLift(x, z, sky === undefined ? meSky() : sky); }
  /**
   * 화면 점(clientX, clientY) → 땅 위 세계 자리 {x, y} (2026-09-27 실기 "마우스로 클릭한 곳으로 이동도 안 함").
   * 3인칭 원근 카메라라 2D 캔버스 역산(world.unproject)으로는 누른 자리와 어긋난다 — 카메라 광선을 쏴서
   * 땅(높낮이·내 층 발판 포함)에 처음 닿는 자리를 찾는다. 2m 씩 나아가다 넘으면 반으로 좁힌다. 땅에 안 닿으면 null
   */
  function pickGround(cx, cy) {
    if (!camera || !canvas || !T) { return null; }
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) { return null; }
    var nx = (cx - r.left) / r.width * 2 - 1, ny = -((cy - r.top) / r.height) * 2 + 1;
    camera.updateMatrixWorld();
    var o = camera.position.clone(), d = new T.Vector3(nx, ny, 0.5).unproject(camera).sub(o).normalize();
    var sky = meSky(), prev = 0, t, i;
    function above(s) { var x = o.x + d.x * s, z = o.z + d.z * s; return o.y + d.y * s - standY(x, z, sky); }
    if (above(0) < 0) { return null; }
    for (t = 2; t <= 900; t += 2) {
      if (above(t) <= 0) {
        var lo = prev, hi = t;
        for (i = 0; i < 12; i++) { var mid = (lo + hi) / 2; if (above(mid) > 0) { lo = mid; } else { hi = mid; } }
        return { x: o.x + d.x * hi, y: o.z + d.z * hi };
      }
      prev = t;
    }
    return null;
  }

  /**
   * 타일 한 장의 정점을 실제 높이로 민다.
   *
   * **눕히기 전 좌표계라 y 가 아니라 z 를 민다.** 이 메시는 `rotation.x = -90°`
   * 로 눕혀 놓았으므로, 로컬의 +z 가 월드의 +y 다. 여기서 y 를 밀면 땅이
   * 옆으로 밀린다(한 번 밟았다).
   *
   * 같은 자리에 다시 깔릴 때는 **건너뛴다** — 타일은 격자를 넘을 때마다 재활용되는데
   * 매번 정점 수백 개를 다시 재면 걸을 때마다 화면이 걸린다.
   */
  function liftTile(mesh, x0, z0, span) {
    if (!RELIEF_ON()) { return false; }
    var mark = Math.round(x0) + '/' + Math.round(z0) + '/' + Math.round(span);
    if (mesh.userData.lifted === mark) { return false; }
    var pos = mesh.geometry.getAttribute('position');
    if (!pos) { return false; }
    var i;
    for (i = 0; i < pos.count; i++) {
      /* 로컬 x·y → 월드 x·z (눕히기 전이므로 로컬 y 가 월드 z 의 **반대**다) */
      var lx = pos.getX(i), ly = pos.getY(i);
      var wx = x0 + span / 2 + lx;
      var wz = z0 + span / 2 - ly;
      pos.setZ(i, groundY(wx, wz));
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.userData.lifted = mark;
    return true;
  }

  /** 지도 타일을 카메라 둘레에만 깐다 (멀어진 것은 지운다) */
  /* 발열(2026-09-24 "핸드폰 불남") — 가만히 서 있어도 매 프레임 49장 × (열쇠 문자열·계절·landTexture 의 땅 소유 검사 ~36번)을
     다시 돌았다. 선 칸·배율·물감·반경이 그대로고 지난번에 모든 장이 칠해졌으면 건너뛴다(계절·손으로 그린 땅이 바뀌는
     경우를 위해 5초에 한 번은 그대로 다시 돈다) */
  var groundKey = '', groundAt = 0, GROUND_REFRESH_MS = 5000;
  function syncGround(W) {
    var mpp = W.metersPerPixel();
    var span = W.TILE_PX * mpp;                     // 타일 한 장이 덮는 미터
    var pos = core.save.player.pos;
    var ll = W.worldToLatLng(pos.x, pos.y);
    var px = W.latLngToPixel(ll.lat, ll.lng);
    var cx = Math.floor(px.x / W.TILE_PX), cy = Math.floor(px.y / W.TILE_PX);
    var R = TILE_SPAN(), live = {};
    /* 밤에는 지도 자체가 어두워야 한다 — 타일 색에 조명의 물감을 곱한다.
       (지도 이미지는 늘 한낮 그림이라, 안 곱하면 밤에 땅만 대낮이다) */
    var tint = lightNow ? lightNow.tint : 0xffffff;
    var gk = (+core.tuned('go.zoneM', 576) > 0 ? (global.DG.goZoneIdx ? global.DG.goZoneIdx(pos, 0, +core.tuned('go.zoneM', 576)) : Math.floor(pos.x / +core.tuned('go.zoneM', 576) + 0.5)) + 'z' + (global.DG.goZoneIdx ? global.DG.goZoneIdx(pos, 1, +core.tuned('go.zoneM', 576)) : Math.floor(pos.y / +core.tuned('go.zoneM', 576) + 0.5)) + '/' : '') + cx + '/' + cy + '/' + mpp + '/' + tint + '/' + R + '/' + (RELIEF_ON() ? 1 : 0), gNow = Date.now();
    if (gk === groundKey && gNow - groundAt < GROUND_REFRESH_MS) { return; }
    var groundPending = false;
    syncGen++; var gZM = +core.tuned('go.zoneGround', 1) === 1 ? +core.tuned('go.zoneM', 576) : 0, gZP = 160, gZx0 = gZM ? ((global.DG.goZoneIdx ? global.DG.goZoneIdx(pos, 0, gZM) : Math.floor(pos.x / gZM + 0.5)) - 0.5) * gZM - gZP : 0, gZy0 = gZM ? ((global.DG.goZoneIdx ? global.DG.goZoneIdx(pos, 1, gZM) : Math.floor(pos.y / gZM + 0.5)) - 0.5) * gZM - gZP : 0, gZx1 = gZx0 + gZM + 2 * gZP, gZy1 = gZy0 + gZM + 2 * gZP;

    for (var dy = -R; dy <= R; dy++) {
      for (var dx = -R; dx <= R; dx++) {
        var tx = cx + dx, ty = cy + dy;
        var key = tx + '/' + ty;
        live[key] = 1;
        var mesh = tileMeshes[key];
        var corner = worldOfLatLng(tile2lat(ty, W), tile2lng(tx, W)); if (gZM > 0 && (corner.x + span < gZx0 || corner.x > gZx1 || corner.y + span < gZy0 || corner.y > gZy1)) { delete live[key]; continue; }   // W-0417 구역(go.zoneM)+여유 밖 땅은 안 짓는다 — 폰 발열(49장 → ≈9장), 경계는 안개 벽(zone-wire)
        if (!mesh) {
          /* **한 장을 잘게 나눈다.** 여태 네 꼭짓점뿐이라 아무리 높이를 줘도
             땅이 기울 뿐 굽지 않았다. 241m 타일을 `RELIEF_SEG` 칸으로 나누면
             한 칸이 30m 남짓 — 지형 격자(48m)보다 촘촘해 경사가 살아난다 */
          var seg = RELIEF_ON() ? RELIEF_SEG() : 1;
          var geo = new T.PlaneGeometry(span, span, seg, seg);
          var mat = new T.MeshLambertMaterial({ color: 0x1a1f28 }); if (global.DG.ground3d) { global.DG.ground3d.detail(mat); }   // W-0200 가까운 땅 결
          mesh = new T.Mesh(geo, mat);
          mesh.rotation.x = -Math.PI / 2;           // 눕힌다
          mesh.receiveShadow = true;
          groundGroup.add(mesh);
          tileMeshes[key] = mesh;
          mesh.userData.lifted = '';
        }
        /* 타일의 왼쪽 위 모서리를 월드 미터로 환산해 한가운데에 놓는다 */
        mesh.position.set(corner.x + span / 2, -0.02, corner.y + span / 2);
        liftTile(mesh, corner.x, corner.y, span);

        /* 그림은 제 손으로 칠한 땅(landTexture)·지형 재질(terrainTexture) — OSM 타일은 안 받는다(W-0207) */
        var tex = landTexture(key, corner.x, corner.y, span) ||
          terrainTexture(W, corner.x, corner.y, span);
        if (tex) {
          if (mesh.material.map !== tex) {
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
          }
          mesh.material.color.setHex(tint);
        } else {
          /* 아직 지도가 안 온 자리. 지형색으로 칠하면 **242m 짜리 색 덩어리**가 생겨
             지도가 그렇게 생긴 줄 알게 된다 — 옅은 종이색으로 비워 둔다.
             타일이 오면 위에서 곧바로 갈아 끼운다. */
          mesh.material.color.setHex(mixHex(0xd7dbe0, tint, 0.85));
          groundPending = true;                    // 아직 안 온 장이 있다 — 다음 프레임도 다시 본다
        }
      }
    }
    groundKey = groundPending ? '' : gk; groundAt = gNow;
    for (var k in tileMeshes) {
      if (!Object.prototype.hasOwnProperty.call(tileMeshes, k) || live[k]) { continue; }
      var m = tileMeshes[k];
      groundGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
      delete tileMeshes[k];
    }
    /* `landTex` 청소(2026-09-05, "바닥 텍스처가 안 지워진다" 로 발견) — 위
       루프가 화면 밖 **메시**는 지우지만, 그 메시가 물려 쓰던 구운
       `CanvasTexture`는 `landTex` 캐시에 그대로 남아 GPU 메모리를 붙들고
       있었다(플레이어가 걸을수록 무한정 쌓임). 이번 세대(`syncGen`)에
       위에서 아무 살아있는 타일도 다시 찾지 않은 항목은 이제 어느 메시도
       참조하지 않는다는 뜻이므로 안전하게 버린다 */
    for (var ck in landTex) {
      if (!Object.prototype.hasOwnProperty.call(landTex, ck)) { continue; }
      if (landTex[ck].userData.gen === syncGen) { continue; }
      landTex[ck].dispose();
      delete landTex[ck];
    }
  }

  function tile2lng(x, W) { return x / Math.pow(2, W.ZOOM) * 360 - 180; }
  function tile2lat(y, W) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, W.ZOOM);
    return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }
  function worldOfLatLng(lat, lng) {
    var o = global.DG.world.origin;
    var mPerLat = 111320;
    var mPerLng = 111320 * Math.cos(o.lat * Math.PI / 180);
    return { x: (lng - o.lng) * mPerLng, y: -(lat - o.lat) * mPerLat };
  }

  /* ── 건물 · 나무 — 무엇이 몇 개 서는가 ───────────────────
   * 지도 타일에는 **높이가 없다.** 원작의 도시 감각은 건물이 서 있는 데서 오므로,
   * 지형 격자(`terrainAt`, 48m)를 보고 절차적으로 세운다.
   *
   * 1단계는 격자마다 상자 두셋을 세우는 게 전부였다 — 어느 동네나 똑같이 성겼다.
   * 이제 **격자마다 도심도(都心度)를 뽑아** 밀도를 가른다: 번화한 칸은 높은 집이
   * 여덟 채까지 들어차고, 변두리는 낮은 집 두엇에 나무가 섞인다. 길가에는 등롱을
   * 세우고 빈 들에도 풀·바위를 둔다 — 아무것도 없는 칸이 있으면 그 자리가 구멍처럼 보인다.
   *
   * **자리는 좌표 해시라 같은 땅이면 늘 같다.** 스폰·역참이 그런 것과 같은 규칙이다.
   * 이 함수는 three 를 안 쓴다 — 자가진단이 계획만 따로 굴려 본다.
   */
  var GRID = 48;
  /* 이 거리부터 배우를 키운다 (m) — 그 안쪽은 눈에 보이는 그대로 */
  var FAR_NEAR = 45, FAR_MAX = 4;

  /* 이 판의 core.hash2 는 0~0.5 만 돌려준다(world.js 주석 참고) — 두 배로 편다 */
  function h1(a, b) { return Math.min(0.999999, core.hash2(a, b) * 2); }
  /* 도심도 urbanity·칸 소품 계획 propPlan(순수) — js/world3d-plan.js(R-4). 같은 이름 한 줄 넘김 */
  var PLANW = global.DG.world3dPlan.bind({ GRID: GRID, h1: h1, DENSITY: DENSITY, LAND_PAINT: LAND_PAINT, WET: WET, weatherKey: weatherKey, PF: PF });
  function urbanity(gx, gy) { return PLANW.urbanity(gx, gy); }
  function propPlan(kind, gx, gy, mapped, densAt) { return PLANW.propPlan(kind, gx, gy, mapped, densAt); }

  /**
   * 이 칸에 선 **집·높은 집·우물·장터**의 충돌 사각형 — `world.js` 의 벽 충돌과
   * 교전 무대(`duelStage`·`camAim` 의 `duel` 구도)가 함께 쓴다(PLAN 27절,
   * 2026-08-30 우물·장터로 넓힘).
   *
   * **판정에 화면 값을 들이는 유일한 자리다.** 이 저장소는 여태 "화면은 판정에
   * 안 닿는다"를 지켜 왔지만(땅의 높낮이·손으로 그린 강 등), 벽 충돌만은 **눈에
   * 보이는 그 소품과 어긋나면 의미가 없다** — 사용자가 직접 고른 값이다(2026-08-29).
   * `propPlan` 은 순수 함수이므로 여기서도 **같은 좌표·같은 크기**가 나온다.
   *
   * 우물·장터는 `w`·`d`(가로·세로)가 따로 없다 — 크기가 아니라 `h`(키)만 갖고
   * 도는 소품이라, 실제 GLB 모델 발판 크기에 가깝게 `h` 에서 어림잡는다.
   * 정확한 값은 아니지만(모델 자체를 재지는 않는다), **집이 아닌 것에도
   * 카메라·발이 박히던 문제**(2026-08-30, 밀집 마을에서 교전 카메라가 우물/
   * 장터에 박힌 것을 실제로 찍어서 발견했다)를 없애는 데는 이 정도로 충분하다.
   */
  /* R-4 11-17 — 1만리 3D 소품 모양 도우미 은 js/world3d-geo.js(make(U), 몸통 글자 그대로) */ var geObj = null; function GE() { return geObj || (geObj = global.DG.world3dGeo.make({ T: function () { return T; }, townDens: function () { return townDens; }, GRID: GRID, h1: h1, propEra: propEra, propPlan: propPlan, swayify: swayify })); }
  function houseRects(gx, gy) { return GE().houseRects(gx, gy); } function unitGeo(name) { return GE().unitGeo(name); } function shoreGeo(mask) { return GE().shoreGeo(mask); } function pmat(hex, opt) { return GE().pmat(hex, opt); } function box(g, geoName, mtl, x, y, z, sx, sy, sz, cast) { return GE().box(g, geoName, mtl, x, y, z, sx, sy, sz, cast); }

  /* 바람 흔들림(PLAN 44절) — 잎·풀·갈대에만 쓰는 재질에 정점 셰이더를 조금
     보탠다. Lambert 의 조명·안개·톤매핑 조각은 손 안 댄다(`#include <begin_vertex>`
     **뒤**에서 자리만 살짝 민다) — `water3d.js` 가 그랬듯 안개를 빼먹으면 안 되므로,
     여기는 안개 조각째 그대로 두고 자리만 보탠 것이다.
     인스턴스마다 다른 위상을 줘야 한 덩이가 통째로 같이 흔들리지 않는다 —
     새 attribute 를 안 늘리려고 `instanceMatrix` 의 이동칸을 씨앗 삼아 해시를 만든다.
     GLB(진짜 모델)에는 안 쓴다 — trunk/leaf 조각이 안 갈려 있어 뿌리까지 흔들리면
     어색하고, 색으로 캐시하는 `prop3d.matCache` 를 건드리면 우연히 같은 색인
     다른 사물까지 흔들릴 수 있다(LOD 밖의 도형 나무·풀만 흔든다) */
  var swayShaders = [], swayClock = 0, pressVec = [];   // 풀 눕힘 자리(래그돌·돌 둘레, W-0310 ③) — 비어 있으면 r=0 이라 아무것도 안 한다
  var smokeByKey = {}, propScan = null;   // R-4 11-17 연기 창고·마지막 훑은 칸 — 소품 짓기(world3d-props.js)와 refreshProps 가 함께 쓴다
  function setSwayClock(v) { swayClock = v; return v; } function setPropScan(v) { propScan = v; return v; }
  function swayify(m) {
    m.onBeforeCompile = function (shader) {
      shader.uniforms.uSwTime = { value: swayClock };
      shader.uniforms.uSwAmt = { value: SWAY_AMT() }; if (!pressVec.length) { for (var pvI = 0; pvI < 8; pvI++) { pressVec.push(new T.Vector4(0, 0, 0, 0)); } } shader.uniforms.uPress = { value: pressVec };   // W-0310 ③ 풀 눕힘 자리 여덟(DG.press3d) — Vector4 는 처음 쓸 때(파일 로드 때 THREE 가 없을 수 있다)
      shader.vertexShader = 'uniform float uSwTime;\nuniform float uSwAmt;\nuniform vec4 uPress[8];\n' +
        shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n' +
          '#ifdef USE_INSTANCING\n' +
          '  float swPhase = dot(instanceMatrix[3].xyz, vec3(12.9898, 78.233, 37.719));\n' +
          '#else\n' +
          '  float swPhase = 0.0;\n' +
          '#endif\n' +
          '  float swLift = (transformed.y + 0.5) * uSwAmt;\n' +
          '  transformed.x += sin(uSwTime * 1.6 + swPhase) * swLift;\n' +
          '  transformed.z += cos(uSwTime * 1.3 + swPhase) * swLift * 0.6;\n' + '#ifdef USE_INSTANCING\n  vec3 swW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#else\n  vec3 swW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif\n' + '  for (int pi = 0; pi < 8; pi++) { if (uPress[pi].w > 0.0) { vec2 pd = swW.xz - uPress[pi].xz; float pk = clamp(1.0 - length(pd) / uPress[pi].w, 0.0, 1.0) * clamp(transformed.y + 0.5, 0.0, 1.5); transformed.xz += normalize(pd + vec2(0.001, 0.0)) * pk * 0.45; transformed.y -= pk * 0.4; } }\n');
      swayShaders.push(shader);
    };
    /* 흔들리는 것과 안 흔들리는 재질은 **다른 프로그램**이다 — 캐시 키를 안 가르면
       three 가 컴파일된 프로그램을 서로 나눠 쓰려다 하나만 남는다 */
    m.customProgramCacheKey = function () { return 'sway'; };
  }

  /* R-4 11-17 — 1만리 3D 인스턴싱(PLAN 16절) 은 js/world3d-inst.js(make(U), 몸통 글자 그대로) */ var inObj = null; function IN() { return inObj || (inObj = global.DG.world3dInst.make({ T: function () { return T; }, camera: function () { return camera; }, propGroup: function () { return propGroup; }, renderer: function () { return renderer; }, scene: function () { return scene; }, sun: function () { return sun; }, GRID: GRID, LOD_NEAR: LOD_NEAR, cullStat: cullStat, groundY: groundY, h1: h1, instKinds: instKinds, pmat: pmat, unitGeo: unitGeo })); }
  function INST_ON() { return IN().INST_ON(); } function INST_CAP() { return IN().INST_CAP(); } function GLB_CAP() { return IN().GLB_CAP(); } function instBox(name, geoName, hex, opt, cast) { return IN().instBox(name, geoName, hex, opt, cast); } function instMake(name, geo, mtl, cast, cap) { return IN().instMake(name, geo, mtl, cast, cap); } function instPut(key, name, geoName, hex, opt, cast, x, y, z, sx, sy, sz, rx, ry, rz) { return IN().instPut(key, name, geoName, hex, opt, cast, x, y, z, sx, sy, sz, rx, ry, rz); } function instAt(K, key, name, x, y, z, sx, sy, sz, rx, ry, rz) { return IN().instAt(K, key, name, x, y, z, sx, sy, sz, rx, ry, rz); } function instDrop(key) { return IN().instDrop(key); } function inFr(fr, x, y, z, r) { return IN().inFr(fr, x, y, z, r); } function instCull() { return IN().instCull(); } function instStats() { return IN().instStats(); } function instProp(key, p, ox, oz) { return IN().instProp(key, p, ox, oz); } function propEra(want, x, z) { return IN().propEra(want, x, z); }

  var instKinds = {};      // 이름 → {mesh, free:[], n, mat, live, sph, ...}
  var cullStat = { live: 0, drawn: 0, frames: 0 };
  /* R-4 11-17 — 1만리 3D 소품 짓기 은 js/world3d-props.js(make(U), 몸통 글자 그대로) */ var prObj = null; function PR() { return prObj || (prObj = global.DG.world3dProps.make({ T: function () { return T; }, lightNow: function () { return lightNow; }, propGroup: function () { return propGroup; }, propMeshes: function () { return propMeshes; }, townDens: function () { return townDens; }, swayClock: function () { return swayClock; }, propScan: function () { return propScan; }, smokeByKey: function () { return smokeByKey; }, DENSITY: DENSITY, FLAME_AMT: FLAME_AMT, FLAME_ON: FLAME_ON, GRID: GRID, LOD_NEAR: LOD_NEAR, MESH_ON: MESH_ON, PROP_R: PROP_R, PROP_UR: PROP_UR, SMOKE_ON: SMOKE_ON, SWAY_AMT: SWAY_AMT, SWAY_ON: SWAY_ON, WET: WET, box: box, groundY: groundY, instDrop: instDrop, instProp: instProp, pmat: pmat, pressVec: pressVec, propPlan: propPlan, setPropScan: setPropScan, setSwayClock: setSwayClock, swayShaders: swayShaders, weatherKey: weatherKey })); }
  function addLampBulb(g, x, y, z, r) { return PR().addLampBulb(g, x, y, z, r); } function addLampSmoke(g, key, x, y, z) { return PR().addLampSmoke(g, key, x, y, z); } function buildProp(kind, gx, gy, mapped, key) { return PR().buildProp(kind, gx, gy, mapped, key); } function syncProps(W) { return PR().syncProps(W); } function syncLamps() { return PR().syncLamps(); } function syncSway(dt) { return PR().syncSway(dt); } function syncFlame(dt) { return PR().syncFlame(dt); } function syncSmoke(dt) { return PR().syncSmoke(dt); }

  /* ── 배우 (사람 · 짐승 · 건물) ───────────────────────────
   * `actor3d.js` 가 도형으로 조립한 입체를 세운다. 조립이 안 되면(three 가 없거나
   * 손잡이를 껐으면) 1단계의 빌보드로 돌아간다 — 그림은 `sprite.js` 것을 그대로 쓴다.
   */
  function spriteTexture(kind, ref, px) {
    var key = kind + '/' + (ref.id || ref.key || ref.name) + '/' + px + '/flat';
    if (texCache[key]) { return texCache[key]; }
    /* 네 번째 인자가 **종이 바탕 없이** 굽게 한다 — 3D 에서는 배경이 사각형으로 남는다 */
    var url = global.DG.sprite.portrait(kind, ref, px, true);
    var img = new Image();
    var tex = new T.Texture(img);
    tex.colorSpace = T.SRGBColorSpace;
    img.onload = function () { tex.needsUpdate = true; };
    img.src = url;
    texCache[key] = tex;
    return tex;
  }

  var shadowGeo = null, shadowMat = null;
  function groundShadow() {
    if (!shadowGeo) {
      shadowGeo = new T.CircleGeometry(1, 18);
      shadowMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: shadowOn ? 0.16 : 0.34, depthWrite: false });   // W-0199 그림자 켜진 기본 — 꺼지면 syncShadow 가 0.34
    }
    var m = new T.Mesh(shadowGeo, shadowMat);
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  /* W-0237 승급이 보이게(재미표준 G — 승급·연성이 글자(별)뿐이었다) — 나·동행 발밑 그림자 원에 금테: 승급 1 가는 테 · 2 굵게 · 3 안쪽 금빛 · 4 바깥 테 하나 더 · 5 별 여섯. 읽기만(save.heroes), 바뀔 때만 다시 짓는다 */ function rankDeco(a, id) { var hs = core.save && core.save.heroes, g = id && hs ? hs[id] : null, rk = g ? Math.max(0, Math.min(5, g.rank | 0)) : 0; if (!a || a.rk === rk) { return; } a.rk = rk; if (a.rkM) { a.shadow.remove(a.rkM); a.rkM.traverse(function (o) { if (o.geometry) { o.geometry.dispose(); } if (o.material) { o.material.dispose(); } }); a.rkM = null; } if (!rk) { return; } var grp = new T.Group(), mat = new T.MeshBasicMaterial({ color: 0xe8c25a, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide }), i; grp.add(new T.Mesh(new T.RingGeometry(1.08, 1.15 + 0.04 * Math.min(rk, 2), 40), mat)); if (rk >= 3) { grp.add(new T.Mesh(new T.CircleGeometry(1.06, 40), new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.2, depthWrite: false }))); } if (rk >= 4) { grp.add(new T.Mesh(new T.RingGeometry(1.34, 1.42, 40), mat)); } if (rk >= 5) { for (i = 0; i < 6; i++) { var st = new T.Mesh(new T.CircleGeometry(0.09, 5), mat); st.position.set(Math.cos(i * Math.PI / 3) * 1.62, Math.sin(i * Math.PI / 3) * 1.62, 0); grp.add(st); } } grp.position.z = 0.003; a.shadow.add(grp); a.rkM = grp; }
  /** 배우 하나 — 있으면 쓰고 없으면 만든다 */
  /** 같은 자리(key)에 다른 사람이 서야 하면 옛 배우를 치운다 — actorOf 는 key 로만 캐시한다 */
  function dropActorIfNot(key, who) {
    var a = actors[key];
    if (!a || a.who === undefined || a.who === who) { return; }
    actorGroup.remove(a.node);
    actorGroup.remove(a.shadow);
    delete actors[key];
  }

  function actorOf(key, kind, ref, px) {
    var a = actors[key];
    if (a) { a.seen = frame; return a; }
    var A = global.DG.actor3d;
    var node = null, mesh = false;
    if (MESH_ON() && A && A.ready()) {
      var AS3L = global.DG.asset3d, mk3 = function () { return A.build(kind === 'building' ? (ref.key === 'wall' ? 'fort' : (ref.key === 'landmark' ? 'landmark' : 'station')) : kind, ref); }; node = AS3L && AS3L.withLazy ? AS3L.withLazy(mk3) : mk3();   // W-0212 지도 배우만 늦게 받기
      mesh = !!node;
    }
    if (!node) {
      var mat = new T.SpriteMaterial({ map: spriteTexture(kind, ref, px), transparent: true });
      node = new T.Sprite(mat);
    }
    var sh = groundShadow();
    actorGroup.add(node); actorGroup.add(sh);
    a = actors[key] = {
      node: node, shadow: sh, seen: frame, mesh: mesh, kind: kind,
      /* 처음에는 카메라를 등지고 선다(북쪽). 마주 보고 서 있으면 지도 위의 내가
         나를 쳐다보는 꼴이 된다 — 원작은 늘 아바타의 뒤통수를 본다 */
      ang: Math.PI, lx: null, ly: null, vanish: 0
    };
    return a;
  }

  /**
   * 배우를 자리에 놓는다.
   *   h     키(m)
   *   bob   위아래 흔들림(빌보드용 — 메시는 자기 다리로 걷는다)
   *   walk  걷는 중인가
   */
  /**
   * 멀리 있는 배우는 **원근 그대로 두면 점**이다. 이 판의 야생 대상은 70~320m 밖에
   * 서므로(원작은 코앞에 나온다) 줌을 빼도 안 보인다. 거리에 따라 조금씩 키워
   * 지도 위의 표식처럼 남게 한다 — 크기는 화면 값이라 판정에 안 닿는다.
   */
  function farBoost(x, y) {
    if (!camPos) { return 1; }
    var d = Math.hypot(x - camPos.x, y - camPos.z);
    if (d < FAR_NEAR) { return 1; }
    /* 지수가 1 이면 **화면에서 같은 크기**로 유지된다(원근을 완전히 무른다).
       0.85 는 거의 유지하되 멀수록 아주 조금 작아 보이게 남긴 값이다 —
       완전히 무르면 3D 공간의 깊이가 사라진다 */
    return Math.min(FAR_MAX, Math.pow(d / FAR_NEAR, 0.85));
  }

  function placeActor(a, x, y, h, bob, walk, phase, now) { var pp0 = a.node.userData.wake ? core.save.player.pos : null; if (pp0 && Math.hypot(x - pp0.x, y - pp0.y) < core.tuned('asset3d.lazyR', 60)) { global.DG.asset3d.wake(a.node); }   // W-0212 폰: 곁에 오면 몸 GLB 를 받는다
    /* **땅에 앉힌다.** 땅이 굽었으므로 y=0 에 세우면 산에서는 발이 묻히고
       골짜기에서는 허공에 뜬다(PLAN 14절) */
    var gy0 = groundY(x, y) + skyLift(x, y, a.sky);        // ⑲-20 섬 층이면 섬 윗면
    if (a.mesh) {
      a.node.scale.set(h, h, h);
      a.node.position.set(x, gy0, y);
      /* 방향 — 지난 프레임과의 차이로 정한다. 판정에는 방향이 없으니
         (world.js 는 좌표만 준다) 화면 층에서 만들어 쓴다 */
      if (a.lx !== null) {
        var dx = x - a.lx, dz = y - a.ly;
        if (dx * dx + dz * dz > 0.0004) {
          var want = Math.atan2(dx, dz);
          var diff = want - a.ang;
          while (diff > Math.PI) { diff -= Math.PI * 2; }
          while (diff < -Math.PI) { diff += Math.PI * 2; }
          a.ang += diff * 0.22; a.turnD = diff; // 홱 돌지 않고 미끄러지듯 돈다 · W-0197 기울기용 도는 양
        } else { a.turnD = 0; }
      }
      a.lx = x; a.ly = y;
      a.node.rotation.y = a.ang; if (a === actors.me) { var LN = core.tuned('anim3d.lean', 8) * Math.PI / 180, lt = walk && LN > 0 ? Math.max(-LN, Math.min(LN, -(a.turnD || 0) * 2.2)) : 0; a.lean = (a.lean || 0) + (lt - (a.lean || 0)) * 0.15; a.node.rotation.z = a.lean; }   // W-0197 도는 쪽으로 기울기(anim3d.lean 도, 0 끔)
      /* 교전 몸짓(`playAnim`) 이 걸려 있으면 그 자리 이름을 준다 — 끝나면
         (`animUntil` 지나면) 도로 걷기/서기로 돌아간다. 클립이 없으면
         `asset3d.play` 가 조용히 실패하니 여기서 따로 안 가른다 */
      var animNow = (a.animUntil && now < a.animUntil) ? a.animName : undefined; if (animNow === undefined && a === actors.me) { animNow = meLifeSlot(a, walk, now / 1000) || undefined; }   // W-0303 낚시 대기·인사·idle 변주
      global.DG.actor3d.step(a.node, { t: now / 1000, walking: walk, phase: phase, anim: animNow });
    } else {
      a.node.scale.set(h, h, 1);
      a.node.position.set(x, gy0 + h / 2 + (bob || 0), y);
    }
    a.shadow.position.set(x, gy0 + 0.06, y);
    a.shadow.scale.setScalar(h * 0.30);
  }

  /** 목표점을 향해 매 프레임 조금씩 다가간다 — 배우 객체(`a`)에 `fx`/`fy` 로
   *  마지막 자리를 적어 둬 다음 프레임도 이어 쓴다. 순간이동이 아니라
   *  **뒤에서 따라오는** 느낌을 내는 전부다(레이스 게임의 카메라 lerp와 같다) */
  function followPos(a, tx, ty, rate) {
    if (a.fx === undefined) { a.fx = tx; a.fy = ty; }
    a.fx += (tx - a.fx) * rate;
    a.fy += (ty - a.fy) * rate;
    return { x: a.fx, y: a.fy };
  }

  /**
   * 동행(부대 2번째 인물)·펫(선두가 장착한 것) — **실제로 곁에서 따라다닌다**
   * (2026-09-06, "펫도 따라다니고 등용한 인물도 따라 다니고" 요청). 전투력은
   * 이미 `hero.partyPower()`(hero.js)가 부대 전체를 합산해 판정에 넣고 있으니
   * 여기서 새로 더할 것이 없다 — 이 함수는 순전히 화면 층이다.
   *
   *   탐험 중  플레이어 뒤쪽으로 처져서 트레일링(동행·펫이 서로 다른 자리)
   *   교전 중  플레이어 옆에 나란히 서서 같이 상대를 본다(`duelFoe` 기준
   *            좌우로 갈라선다 — 축을 `meAng` 대신 "나→적" 벡터로 잡아야
   *            내가 예고를 피하려고 옆으로 물러나도 대형이 안 흐트러진다)
   */
  function syncBuddies(pos, meAng, h, now) {
    var party = core.save.party || [];
    var FCb = global.DG.fieldCombat, fcLead = FCb && FCb.leadId();
    var allyId = fcLead && fcLead === party[1] ? party[0] : party[1];
    var petEquip = core.save.petEquip || {};
    var petId = party[0] ? petEquip[party[0]] : null;
    var mateRef = !petId && global.DG.worldMate ? global.DG.worldMate.ref(core.save) : null;   // W-0756 세계 편 짝 — 장착 펫이 없을 때만 그 자리(그림만)
    if (!allyId && !petId && !mateRef) { return; }

    var backX = -Math.sin(meAng), backY = -Math.cos(meAng);
    var sideX = Math.cos(meAng), sideY = -Math.sin(meAng);
    if (duelFoe) {
      var fdx = duelFoe.x - pos.x, fdy = duelFoe.y - pos.y;
      var flen = Math.hypot(fdx, fdy) || 1;
      sideX = -fdy / flen; sideY = fdx / flen;   // 나→적 축에 수직
    }

    if (allyId) {
      var allyRef = global.DG.data.find(allyId);
      if (allyRef) {
        dropActorIfNot('ally', allyRef.id);
        var aa = actorOf('ally', 'hero', allyRef, 96);
        aa.who = allyRef.id; rankDeco(aa, allyRef.id); aa.sky = meSky();
        var atx = duelFoe ? pos.x + sideX * 1.5 : pos.x + backX * 2.2 + sideX * 0.9;
        var aty = duelFoe ? pos.y + sideY * 1.5 : pos.y + backY * 2.2 + sideY * 0.9;
        var af = followPos(aa, atx, aty, duelFoe ? 0.12 : 0.06);
        var amoved = aa.lx === null || Math.hypot(af.x - aa.lx, af.y - aa.ly) > 0.01;
        placeActor(aa, af.x, af.y, h * farBoost(af.x, af.y), 0, amoved, now / 480, now);
        if (duelFoe && aa.mesh) {
          var aax = duelFoe.x - af.x, aaz = duelFoe.y - af.y;
          aa.node.rotation.y = Math.atan2(aax, aaz);
          aa.ang = aa.node.rotation.y;
        }
      }
    }

    if (petId || mateRef) {
      var petRef = mateRef || global.DG.data.find(petId);
      if (petRef) {
        var pa = actorOf('petbuddy', 'pet', petRef, 96);
        pa.sky = meSky();
        var ptx = duelFoe ? pos.x - sideX * 1.5 : pos.x + backX * 1.4 - sideX * 0.8;
        var pty = duelFoe ? pos.y - sideY * 1.5 : pos.y + backY * 1.4 - sideY * 0.8;
        var pf = followPos(pa, ptx, pty, duelFoe ? 0.12 : 0.08);
        var pmoved = pa.lx === null || Math.hypot(pf.x - pa.lx, pf.y - pa.ly) > 0.01;
        placeActor(pa, pf.x, pf.y, h * 0.6 * farBoost(pf.x, pf.y), 0, pmoved, now / 380, now);
        if (duelFoe && pa.mesh) {
          var ppx = duelFoe.x - pf.x, ppz = duelFoe.y - pf.y;
          pa.node.rotation.y = Math.atan2(ppx, ppz);
          pa.ang = pa.node.rotation.y;
        }
      }
    }
  }

  /** 사라지는 배우 — 잡혔거나 달아났다. 빛으로 흩어지며 지워진다 */
  function sweepActors(dt) {
    for (var k in actors) {
      if (!Object.prototype.hasOwnProperty.call(actors, k)) { continue; }
      var a = actors[k];
      if (a.seen === frame) { continue; }
      /* 무대에 선 상대는 판정에서 이미 사라졌더라도(잡혔다·달아났다) 무대가 닫힐
         때까지 그 자리에 세워 둔다 — 던진 것이 날아가는 중에 상대가 먼저 없어지면
         허공에 사료를 던지는 그림이 된다 */
      if (stageAt && k === 'sp' + stageAt.uid) { a.seen = frame; continue; }
      /* 곧바로 지우면 잡은 순간 상대가 **점멸하듯** 없어진다. 원작은 잡히는 순간을
         보여 준다 — 여기서는 떠오르며 작아지는 0.7초를 둔다 */
      a.vanish += dt;
      var t = Math.min(1, a.vanish / 0.7);
      a.node.position.y += dt * 2.4;
      a.node.scale.multiplyScalar(1 - dt * 1.1);
      a.shadow.scale.multiplyScalar(1 - dt * 2.2);
      if (t >= 1) {
        actorGroup.remove(a.node);
        actorGroup.remove(a.shadow);
        delete actors[k];
      }
    }
  }

  /* ── 지도 위 동행 모션 — 교체 연출(PLAN §5 ⑭) ─────────────────────────
   * 들판 전투에서 교체하면(`fieldCombat.leadId()` 가 바뀌면) 예전엔 옛 몸을 지우고 새 몸이
   * 그 자리에 뚝 섰다. 이제 옛 몸은 지우지 않고 'swapout' 으로 옮겨 옆뒤로 물러나게 한 뒤
   * (`sweepActors` 의 떠오르며 흩어지기로) 사라지고, 새 몸은 곁(옆 1.6m)에서 걸어 나와
   * 제자리에 선다. 판정·카메라는 그대로 `pos` — 화면 층만 움직인다 */
  var SWAP_IN_MS = 350, SWAP_OUT_MS = 600, SWAP_LIFE_MS = 900, SWAP_SIDE = 1.6, SWAP_BACK = 2.4;
  /** 순수 함수 — 교체 뒤 ms 에 새 몸이 옆으로 남은 거리·옛 몸이 물러난 거리 */
  function swapMotion(ms) {
    var i = Math.max(0, Math.min(1, ms / SWAP_IN_MS)), o = Math.max(0, Math.min(1, ms / SWAP_OUT_MS));
    function ease(k) { return 1 - (1 - k) * (1 - k); }
    return { inSide: SWAP_SIDE * (1 - ease(i)), outBack: SWAP_BACK * ease(o), done: ms >= SWAP_LIFE_MS };
  }
  var lastLead = null, swapFx = null;

  /**
   * 활공 날개(§5 ⑰ 다음) — 저장소에 CC0 날개 에셋이 없어 **코드로** 짓는다(SAGA-DESIGN §7 허용):
   * 머리 위 천 두 장이 V 자로 벌어진 모양, 한 번 지어 두고 켜고 끈다. 판정에는 안 닿는다
   */
  var gliderMesh = null;
  function gliderOf() {
    if (gliderMesh) { return gliderMesh; }
    var g = new T.BufferGeometry();
    /* 가운데 막대(0,0,±0.3)에서 좌우 끝(±1.6)으로, 끝이 조금 올라가고 뒤로 처진다 */
    var v = new Float32Array([
      0, 0, 0.35, -1.6, 0.35, -0.25, 0, 0, -0.45,
      0, 0, 0.35, 0, 0, -0.45, 1.6, 0.35, -0.25
    ]);
    g.setAttribute('position', new T.BufferAttribute(v, 3));
    g.computeVertexNormals();
    var m = new T.MeshLambertMaterial({ color: 0xe8dcc0, side: T.DoubleSide });
    gliderMesh = new T.Mesh(g, m);
    gliderMesh.visible = false;
    actorGroup.add(gliderMesh);
    return gliderMesh;
  }
  function syncGlider(meA, on, x, y, air, h) {
    if (!on && !gliderMesh) { return; }
    var gm = gliderOf();
    gm.visible = !!on && air > 0.05;
    if (!gm.visible) { return; }
    var s = Math.max(1, h / 1.7);
    gm.scale.set(s, s, s);
    gm.position.set(x, standY(x, y) + air + h * 1.12, y);
    gm.rotation.y = meA.ang || 0;
  }

  function set_lastLead(v) { lastLead = v; return v; } function set_swapFx(v) { swapFx = v; return v; } function set_talkNow(v) { talkNow = v; return v; }   // R-4 11-17 syncActors(world3d-actors.js)
  /* R-4 11-17 — 1만리 3D 배우 맞추기(syncActors) 은 js/world3d-actors.js(make(U), 몸통 글자 그대로) */ var acObj = null; function AC() { return acObj || (acObj = global.DG.world3dActors.make({ T: function () { return T; }, actorGroup: function () { return actorGroup; }, actors: function () { return actors; }, camera: function () { return camera; }, duelFoe: function () { return duelFoe; }, faceAt: function () { return faceAt; }, frame: function () { return frame; }, lastLead: function () { return lastLead; }, stageAt: function () { return stageAt; }, swapFx: function () { return swapFx; }, talkNow: function () { return talkNow; }, ACTOR_H: ACTOR_H, SWAP_BACK: SWAP_BACK, actorOf: actorOf, dropActorIfNot: dropActorIfNot, farBoost: farBoost, fortStyle: fortStyle, groundY: groundY, meSky: meSky, placeActor: placeActor, set_lastLead: set_lastLead, set_swapFx: set_swapFx, set_talkNow: set_talkNow, swapMotion: swapMotion, syncBuddies: syncBuddies, syncGlider: syncGlider, talkShot: talkShot, rankDeco: rankDeco })); }
  function syncActors(W, now) { return AC().syncActors(W, now); }

  var fortStyleCache = {};
  function fortStyle(ft) {
    if (fortStyleCache[ft.key]) { return fortStyleCache[ft.key]; }
    var F = global.DG.fort, D = global.DG.data;
    var o = { tier: 2, color: '#8a5cc0' };
    try {
      if (F && F.tierOf) {
        o.tier = F.tierOf(ft).tier;
        var fc = D && D.faction ? D.faction(F.factionNameOf(ft)) : null;
        if (fc && fc.color) { o.color = fc.color; }
      }
    } catch (e) { /* 판정 층이 아직 없으면 옛 빛깔 그대로 — 화면은 안 빈다 */ }
    fortStyleCache[ft.key] = o;
    return o;
  }

  /* ── 조우 연출 ────────────────────────────────────────────
   * 원작에서 대상을 누르면 화면이 그쪽으로 넘어간다. 여기서는 조우 창이 HTML 이라
   * 3D 는 **뒤에서 카메라를 돌려** 그 순간을 만든다. 잡히면 빛기둥이 선다.
   * 창이 열렸는지는 DOM 을 보고 안다 — `encounter.js` 를 고치지 않으려는 것이다.
   */
  /* ── 전투 연출 (PLAN 23절) ────────────────────────────
   * 소품은 `battle3d.js` 가 만든다. 여기 있는 것은 **카메라가 하는 일**뿐이다 —
   * 줌인 · 흔들림 · 잠깐 멎기(hit-stop). 셋 다 화면에만 쓴다.
   */
  var yaw = 0, faceAt = null;   // faceAt — W-0173 칠 때 잠깐 볼 자리 {x, y, until}             // 돌려 본 각(라디안) — 드래그로 바꾼다
  var talkNow = 0;         // ⑲-13 대화 몸짓 — 지난 프레임 시각(ms)
  /** ⑲-13 이야기 대화 중이면 연출 값(story.talkShot) — 카메라·몸짓이 읽는다 */
  function talkShot() { var S = global.DG.story; return S && S.talkShot && global.DG.talkface ? (S.talkShot() || (global.DG.bossIntro ? global.DG.bossIntro.shot() : null)) : null; }   // W-0551 대화가 없으면 보스 등장 컷
  /** ⑲-22 조준 구도(순수) — 오른 어깨 너머(뒤 2.6m·옆 0.7m·몸 키 1.25배 높이), 앞 14m 를 본다. av = {dx, dy} 겨눈 쪽 */
  function aimCam(p, av, h) {
    var fx = av.dx, fz = av.dy, rx = -fz, rz = fx;                  // 앞 (fx, fz) 을 볼 때 화면 오른쪽
    return { pos: { x: p.x - fx * 2.6 + rx * 0.7, y: h * 1.25, z: p.y - fz * 2.6 + rz * 0.7 },
      look: { x: p.x + fx * 14, y: h * 0.85, z: p.y + fz * 14 } };
  }
  var battleOn = false;    // 교전 중인가
  var shakeAmp = 0;        // 남은 흔들림 세기(m)
  var holdUntil = 0;       // 이때까지 화면이 멎는다 (performance.now 기준)

  var focusAt = null;      // {x, y} 조우 중인 대상
  var stageAt = null;      // {x, y, uid} 조우 무대 — 대상 앞에 카메라를 세운다
  var beams = [];          // 빛기둥
  var clickRings = [];     // 클릭(탭)한 자리 표시 — 2026-09-06, 3D에선 안 보이던 것을 채움

  /* ── 교전 상대를 실제로 세운다 (PLAN 23절 다음, 2026-08-30) ──────────
   * `duel.js` 는 여태 카드 안의 이모지로만 싸웠다 — 3D 지도에는 아무도 안 섰다.
   * `battle3d.js` 가 `duel:open` 때 `duelStage()` 를 불러 상대를 실제로 세우면,
   * 배우는 늘 있던 `actors['me']`(동행 선두) 옆에서 진짜로 마주 선다.
   * 상대는 `spawns` 목록에 없는 임시 배우라 `syncActors()` 가 따로 먹여야 한다. */
  var duelFoe = null;      // {kind, ref, x, y} — 없으면 교전 중이 아니거나 3D 상대가 없다

  /** 사건이 조명을 잠깐 죽인다(2026-09-06, "비전투 이벤트 3D 무대 연출" —
   *  밤 사건의 긴장). 0(평소)~1. `battle3d.js`가 `duel:open`(늑대 무리·
   *  적군 정찰병처럼 `eerie` 딱지가 붙은 사건)·`duel:close`에서 두드린다.
   *  **`lightingAt()`이 내는 값 자체는 안 건드린다**(캐시일 수도 있고,
   *  미니맵 등 다른 곳도 같은 값을 본다) — `syncLight()`가 적용하는
   *  자리에서만 깎는다, 사건이 끝나면 다음 프레임에 저절로 원래 밝기로
   *  돌아간다(`setEventMood(0)`이 지운다) */
  var eventDark = 0;

  /** 이 자리가 집 몸통 안인가 — `world.js` 의 `hitsHouse` 와 같은 계산이지만
      독립된 사본이다(world3d 가 world.js 를 되받아 부르지 않게 한다).
      `margin` 은 여유(m) — 상대가 설 자리는 발이 벽에 안 묻힐 만큼(기본 1),
      카메라가 설 자리는 그보다 훨씬 넉넉해야 한다(벽에 바짝 붙으면 근접
      절단면이 벽 텍스처로 화면을 채운다) */
  function duelSpotBlocked(x, y, margin) {
    var m = margin === undefined ? 1 : margin;
    var gx0 = Math.floor(x / GRID), gy0 = Math.floor(y / GRID), gx, gy, rs, i, r;
    for (gy = gy0 - 1; gy <= gy0 + 1; gy++) {
      for (gx = gx0 - 1; gx <= gx0 + 1; gx++) {
        rs = houseRects(gx, gy);
        for (i = 0; i < rs.length; i++) {
          r = rs[i];
          var dx = x - r.x, dz = y - r.z;
          var c = Math.cos(r.rot), s = Math.sin(r.rot);
          var lx = dx * c + dz * s, lz = -dx * s + dz * c;
          if (Math.abs(lx) < r.w / 2 + m && Math.abs(lz) < r.d / 2 + m) { return true; }
        }
      }
    }
    return false;
  }

  /** 상대를 세운다 — `x, y` 는 나에게서 6m 남쪽(`battle3d.spot()` 과 같은 자리)이
      먼저다. 그 자리가 집 안이면(마을 한복판에서 걸린 사건) 부채꼴로 돌며
      가장 가까운 트인 자리를 대신 쓴다 — 안 그러면 상대가 벽 뒤에 완전히
      가려진다(2026-08-30, 실기기 확인 중 발견) */
  function duelStage(kind, ref) {
    if (!kind || !ref) { return false; }
    var pos = core.save.player.pos;
    var OFF = [[0, -6], [-6, -6], [6, -6], [-6, 0], [6, 0], [0, 6], [-6, 6], [6, 6]];
    var fx = pos.x + OFF[0][0], fy = pos.y + OFF[0][1], i;
    for (i = 0; i < OFF.length; i++) {
      var tx = pos.x + OFF[i][0], ty = pos.y + OFF[i][1];
      if (!duelSpotBlocked(tx, ty)) { fx = tx; fy = ty; break; }
    }
    duelFoe = { kind: kind, ref: ref, x: fx, y: fy };
    focusAt = { x: duelFoe.x, y: duelFoe.y };
    return true;
  }

  /** 상대를 내린다 — `sweepActors()` 가 알아서 사라지게 두지 않고 바로 지운다
   *  (교전 결과 카드가 곧바로 그 자리를 쓰므로 사라지는 연출은 필요 없다) */
  function duelUnstage() {
    var a = actors.duelfoe;
    if (a) {
      actorGroup.remove(a.node);
      actorGroup.remove(a.shadow);
      delete actors.duelfoe;
    }
    duelFoe = null;
  }

  /** 나 또는 상대에게 몸짓을 하나 재생한다(공격·피격·회피) — `who` 는 'me'·'foe'.
   *  클립이 없는 몸(도형 배우, 아직 안 받은 GLB)이면 조용히 아무 일도 안 한다. */
  function meLifeSlot(a, walk, nowS) { var P3 = global.DG.pose3d; if (!P3) { return null; } var MTl = global.DG.mount; if (MTl && MTl.petRef && MTl.petRef()) { return 'Pose_ride'; }   /* W-0434 탄 동안은 탈 자세 */ var FS = global.DG.fishing, fs = FS && FS.state ? FS.state().state : null, TS = talkShot(), wave = P3.once(a, 'talk', !!TS, nowS, 'Pose_wave'); if (walk) { P3.life(a, nowS, false); return null; } if (fs === 'wait' || fs === 'nibble') { return 'Pose_fish'; } return wave || (TS ? null : P3.life(a, nowS, true)); }   /* W-0303 내 생활 몸짓: 낚시 기다릴 땐 Pose_fish, 대화가 열리면 처음 한 번 Pose_wave, 서 있으면 3~5초마다 idle 변주(걸으면 끊김) */ function playAnim(who, name, ms) {
    var key = who === 'foe' ? 'duelfoe' : (who === 'ally' ? 'ally' : (actors[who] ? who : 'me'));
    var a = actors[key];
    if (!a) { return false; }
    a.animName = name;
    a.animUntil = (global.performance ? performance.now() : Date.now()) + (ms || 300);
    return true;
  }

  function bindEvents() {
    core.on('encounter:request', function (spawn) {
      if (spawn) { focusAt = { x: spawn.x, y: spawn.y }; }
    });
    core.on('station:request', function (st) {
      if (st) { focusAt = { x: st.x, y: st.y }; }
    });
    core.on('fort:request', function (ft) {
      if (ft) { focusAt = { x: ft.x, y: ft.y }; }
    });
    /* 도감에 새 줄이 생겼다 = 잡았다. 마지막으로 보던 자리에 빛기둥을 세운다 */
    core.on('dex:new', function () {
      /* 승화(growth.js)도 같은 이벤트를 낸다 — 조우 창이 열려 있을 때만 세운다.
         안 그러면 도감 화면에서 승화시켰는데 지도 한복판에 빛기둥이 선다 */
      var f = focusLive();
      if (f) { beam(f.x, f.y); }
    });
  }

  /** 조우 창이 아직 열려 있는가 — 닫혔으면 카메라를 놓아 준다.
      역참·성채·교전도 **같은 `#encounter` 한 칸**을 쓴다(station.js·fort.js·duel.js). */
  function focusLive() {
    if (!focusAt) { return null; }
    var el = document.getElementById('encounter');
    if (el && el.classList.contains('show')) { return focusAt; }
    focusAt = null;
    return null;
  }

  function beam(x, y) {
    if (!available()) { return; }
    var geo = unitGeo('cyl');
    var m = new T.Mesh(geo, new T.MeshBasicMaterial({
      color: 0xffe6a8, transparent: true, opacity: 0.85, depthWrite: false
    }));
    m.position.set(x, 6, y);
    m.scale.set(2.6, 12, 2.6);
    fxGroup.add(m);
    beams.push({ mesh: m, t: 0 });
  }

  function syncBeams(dt) {
    var i;
    for (i = beams.length - 1; i >= 0; i--) {
      var b = beams[i];
      b.t += dt;
      var k = b.t / 0.9;
      b.mesh.scale.x = b.mesh.scale.z = 2.6 + k * 5;
      b.mesh.material.opacity = Math.max(0, 0.85 * (1 - k));
      if (k >= 1) {
        fxGroup.remove(b.mesh);
        b.mesh.material.dispose();      // 이 재질은 이 기둥만 쓴다
        beams.splice(i, 1);
      }
    }
  }

  /** 클릭(탭)한 자리 — `world.js`의 2D 고리(커지며 옅어짐)와 같은 그림을
   *  3D 바닥에도 놓는다. 2026-09-06, "클릭 자리 표시가 없다"로 발견 —
   *  2D `clickMarks`는 3D가 켜지면 숨는 캔버스(`gCtx`)에만 그려져서
   *  3D에서는 눌러도 아무 반응이 안 보였다. `beam()`과 같은 자기 관리
   *  fx 패턴(`fxGroup`에 직접 얹고 `syncClickMark`가 나이 먹여 지운다) */
  function clickMark(x, y) {
    if (!available()) { return; }
    var m = new T.Mesh(
      new T.TorusGeometry(0.6, 0.12, 8, 28),
      new T.MeshBasicMaterial({ color: 0xffd650, transparent: true, opacity: 0.9, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;         // 눕혀서 바닥에 깐다
    m.position.set(x, groundY(x, y) + 0.05, y);
    fxGroup.add(m);
    clickRings.push({ mesh: m, t: 0 });
  }

  function syncClickMark(dt) {
    var i;
    for (i = clickRings.length - 1; i >= 0; i--) {
      var c = clickRings[i];
      c.t += dt;
      var k = c.t / 0.6;
      var s = 1 + k * 1.8;
      c.mesh.scale.set(s, 1, s);
      c.mesh.material.opacity = Math.max(0, 0.9 * (1 - k));
      if (k >= 1) {
        fxGroup.remove(c.mesh);
        c.mesh.material.dispose();
        clickRings.splice(i, 1);
      }
    }
  }

  var camPos = null, camLook = null, shadowOn = true;   // R-4 11-17 카메라 자리·바라보는 곳·그림자 켬 — 카메라(world3d-cam.js)가 바꾸고 배우·그리기가 읽는다
  function setCamPos(v) { camPos = v; return v; } function setCamLook(v) { camLook = v; return v; } function setShadowOn(v) { shadowOn = v; return v; } function setLightNow(v) { lightNow = v; return v; } function setShakeAmp(v) { shakeAmp = v; return v; }

  /* R-4 11-17 — 1만리 3D 카메라·빛 은 js/world3d-cam.js(make(U), 몸통 글자 그대로) */ var cmObj = null; function CM() { return cmObj || (cmObj = global.DG.world3dCam.make({ T: function () { return T; }, battleOn: function () { return battleOn; }, camLook: function () { return camLook; }, camPos: function () { return camPos; }, camera: function () { return camera; }, duelFoe: function () { return duelFoe; }, eventDark: function () { return eventDark; }, forcedMs: function () { return forcedMs; }, frame: function () { return frame; }, renderer: function () { return renderer; }, scene: function () { return scene; }, shadowMat: function () { return shadowMat; }, shadowOn: function () { return shadowOn; }, shakeAmp: function () { return shakeAmp; }, sky: function () { return sky; }, stageAt: function () { return stageAt; }, sun: function () { return sun; }, yaw: function () { return yaw; }, ACTOR_H: ACTOR_H, CAM_DIST: CAM_DIST, CAM_HIGH: CAM_HIGH, GRID: GRID, IBL_SCALE: IBL_SCALE, aimCam: aimCam, duelSpotBlocked: duelSpotBlocked, focusLive: focusLive, groundY: groundY, h1: h1, houseRects: houseRects, lightingAt: lightingAt, meSky: meSky, setCamLook: setCamLook, setCamPos: setCamPos, setLightNow: setLightNow, setShadowOn: setShadowOn, setShakeAmp: setShakeAmp, standY: standY, talkShot: talkShot, weatherKey: weatherKey })); }
  function STAGE_DIST() { return CM().STAGE_DIST(); } function DUEL_DIST() { return CM().DUEL_DIST(); } function camAim(pos, mode, focus, stage, zoom, battle, yaw, duel) { return CM().camAim(pos, mode, focus, stage, zoom, battle, yaw, duel); } function camOcclude(P, C, rects) { return CM().camOcclude(P, C, rects); } function OCCLUDE_ON() { return CM().OCCLUDE_ON(); } function rectsNear(x, y) { return CM().rectsNear(x, y); } function camZoom(W) { return CM().camZoom(W); } function syncCamera(W, dt) { return CM().syncCamera(W, dt); } function syncShadow(zoom) { return CM().syncShadow(zoom); } function syncLight(dt) { return CM().syncLight(dt); }

  /* ── 그린다 ───────────────────────────────────────────── */

  /**
   * 화면에 낸다 — 후처리를 거치거나(있고 켜져 있을 때) 곧바로 그린다.
   * **두 길 다 톤매핑은 한 번 걸린다**(`post3d.js` 머리 참고).
   * 그리는 자리가 두 군데(여기와 hit-stop)라 함수로 묶었다 — 한쪽만 고치면
   * 멎는 동안 후처리가 벗겨져 화면이 껌뻑인다.
   */
  /* §6.1-B ① 재기(`?perf`) — 한 프레임에 그린 호출·삼각형을 **후처리 여러 번을 합쳐** 센다(평소엔 마지막 한 번만 남는다) */
  var PERF_ON = /[?&]perf\b/.test((global.location && global.location.search) || '');
  var glFrame = { calls: 0, tris: 0 };
  function present() {
    if (PERF_ON) { renderer.info.autoReset = false; renderer.info.reset(); }
    presentDraw();
    if (PERF_ON) { glFrame.calls = renderer.info.render.calls; glFrame.tris = renderer.info.render.triangles; }
  }
  function presentDraw() {
    var P3 = global.DG.post3d; var X3 = global.DG.world3dExtras, xi; if (X3) { for (xi = 0; xi < X3.length; xi++) { X3[xi].step(scene, camera); } }   /* W-0671 ② 2D 에만 있던 것의 3D 짝(riddle3d) */
    if (P3) {
      if (P3.draw(renderer, scene, camera, lightNow)) { return; }
      /* 후처리가 켜졌다 꺼졌을 수 있다(등급이 LOW 로 내려간 순간).
         마지막으로 쓰던 렌더 타깃이 물려 있으면 캔버스가 검게 남는다 */
      renderer.setRenderTarget(null);
    }
    renderer.render(scene, camera);
  }

  var last = 0;

  /* `game.js` 의 루프는 `world.draw()`(→ 여기)를 부른 **뒤에** requestAnimationFrame
   * 을 다시 잡는다 — 그래서 이 함수 안에서 예외가 하나라도 새면 다음 프레임 자체가
   * 안 잡혀 이동·그리기·전투 무대까지 전부 그 자리에서 멎는다(2026-08-31, 실기기
   * 신고로 찾음). 안에 있는 개별 sync 들은 저마다 제 몫만 어긋나면 스스로 꺼지게
   * 감쌌지만, **여기서 한 번 더 통째로 막는다** — three.js 자체(예: 셰이더 컴파일)
   * 가 던지는 것까지는 개별 감싸기로 못 잡기 때문이다. 잡았을 땐 그린 그림이라도
   * 있어야 검게 안 깜빡이니 `present()` 를 한 번 더 시도한다(그마저 던지면 조용히 넘어간다) */
  function render() {
    if (!active()) { return false; }
    try {
      var W = global.DG.world;
      var now = performance.now();
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      frame++;

      /* hit-stop — 큰 것이 꽂힌 순간 화면이 아주 잠깐 멎는다(PLAN 23절).
         **그린 것을 그대로 한 번 더 낸다** — 아무것도 안 그리면 검게 깜빡인다 */
      if (now < holdUntil) { present(); return true; }

      syncLight(dt);
      syncShadow(W.zoom3d || 1);
      syncGround(W);
      syncProps(W);
      syncLamps();
      syncSway(dt);
      syncFlame(dt);
      syncSmoke(dt);
      syncActors(W, now);
      sweepActors(dt);
      if (global.DG.encounter3d) { global.DG.encounter3d.tick(dt); }
      if (global.DG.battle3d) { global.DG.battle3d.tick(dt); }
      if (global.DG.sky3d) { global.DG.sky3d.tick(dt, lightNow); }
      if (global.DG.water3d) { global.DG.water3d.tick(dt, lightNow); }
      syncBeams(dt);
      syncClickMark(dt);
      syncCamera(W, dt);
      instCull(); if (global.DG.nightglow3d) { global.DG.nightglow3d.update(scene, camera, lightNow ? lightNow.lamp : 0); }   // W-0358 밤 불빛

      present();
      return true;
    } catch (err) {
      if (global.console) { console.error('[world3d] render() 에서 멎을 뻔해 한 프레임 건너뛴다', err); }
      try { present(); } catch (err2) { /* 그마저 안 되면 이번 프레임은 포기한다 */ }
      return true;
    }
  }

  /**
   * 세워 둔 소품을 통째로 지운다 — 다음 프레임에 다시 선다.
   * `prop3d` 가 GLB 를 다 받은 뒤 한 번 부른다: 그 한 번에 원뿔 나무가
   * 진짜 나무로 바뀐다. 인스턴스 덩이도 같이 비운다(빈 자리를 돌려받아야
   * 새 덩이가 창고를 나눠 쓴다).
   */
  function refreshProps() {
    if (!propGroup) { return 0; }
    var n = 0, k;
    for (k in propMeshes) {
      if (!Object.prototype.hasOwnProperty.call(propMeshes, k)) { continue; }
      instDrop(k);
      propGroup.remove(propMeshes[k]);
      n++;
    }
    propMeshes = {};
    townDens = {};
    smokeByKey = {};          // 통째로 다시 지으니 연기 창고도 같이 비운다
    propScan = null;          // 다음 프레임에 다시 훑는다
    return n;
  }

  /**
   * 세워 둔 배우(사람·짐승)를 통째로 지운다 — `actorOf` 가 한 번 지은 3D 배우는
   * 그대로 붙들고 있으므로, 등신 비례가 바뀌어도 이미 선 배우는 옛 비례 그대로
   * 남는다. 다음 프레임에 지금 비례로 다시 짓도록 비운다(게임.js 의 등신 버튼이
   * 부른다). 2D 빌보드 텍스처는 캐시 키에 등신이 이미 들어 있어 그냥 둬도
   * 저절로 새 비례로 바뀐다.
   */
  function resetActors() {
    if (!actorGroup) { return 0; }
    var n = 0, k;
    for (k in actors) {
      if (!Object.prototype.hasOwnProperty.call(actors, k)) { continue; }
      actorGroup.remove(actors[k].node);
      actorGroup.remove(actors[k].shadow);
      n++;
    }
    actors = {};
    return n;
  }

  global.DG = global.DG || {};
  /**
   * 인스턴스 창고 속 — **어느 덩이에 몇이 서 있나.**
   * "계획은 나오는데 화면에 없다" 를 가를 때 이것 하나면 끝난다(벼에서 밟았다).
   */
  function instReport(filter) {
    var out = [], k;
    for (k in instKinds) {
      if (!Object.prototype.hasOwnProperty.call(instKinds, k)) { continue; }
      if (filter && k.indexOf(filter) < 0) { continue; }
      var K = instKinds[k], m = K.mesh;
      var det = '';
      if (filter) {
        /* 걸러 볼 때는 **속까지** 본다 — 창고에는 있는데 화면에 없을 때
           보이지 않는 이유는 결국 이 넷 중 하나다 */
        var g = m.geometry, pa = g && g.getAttribute('position');
        m.updateMatrixWorld(true);
        var e = m.matrixWorld.elements;
        var m0 = new T.Matrix4();
        if (m.count > 0) { m.getMatrixAt(0, m0); }
        var p0 = new T.Vector3(), q0 = new T.Quaternion(), s0 = new T.Vector3();
        m0.decompose(p0, q0, s0);
        det = ' [보임' + (m.visible ? 1 : 0) +
          ' 재질' + (m.material && m.material.visible ? 1 : 0) +
          ' 투명' + (m.material && m.material.opacity !== undefined ? m.material.opacity : '?') +
          ' 정점' + (pa ? pa.count : '?') +
          ' 부모' + (m.parent ? m.parent.name || 'group' : 'none') +
          ' 월드' + e[12].toFixed(0) + ',' + e[13].toFixed(0) + ',' + e[14].toFixed(0) +
          ' 첫자리' + p0.x.toFixed(0) + ',' + p0.y.toFixed(1) + ',' + p0.z.toFixed(0) +
          ' 배율' + s0.x.toFixed(2) + ']';
      }
      out.push(k.split('/').pop() + '=' + K.n + '/' + m.count + det);
    }
    return out;
  }

  global.DG.world3d = {
    init: init, resize: resize, render: render, refreshProps: refreshProps,
    swapMotion: swapMotion,
    resetActors: resetActors,
    /** 인스턴스 창고 속을 들여다본다(진단·데모용). 이름 조각으로 걸러 볼 수 있다 */
    instReport: instReport,
    /** 배우 한 명의 실제 위치·상태를 들여다본다(진단용) — `actors['me']`·
     *  `'ally'`·`'petbuddy'`·`'duelfoe'` 등 */
    actorPos: function (key) {
      var a = actors[key];
      if (!a) { return null; }
      return {
        x: a.node.position.x, y: a.node.position.y, z: a.node.position.z,
        scale: a.node.scale.x, mesh: a.mesh, visible: a.node.visible
      };
    },
    actorKeys: function () { return Object.keys(actors); }, actorNode: function (key) { return actors[key] ? actors[key].node : null; },   // ㉑ 배우 마디 — weapon.js 무기 빛이 선두 외곽선 색만 고친다
    available: available, active: active, wanted: wanted, _landTex: function () { return LAND_TEX_VARIANTS; }, _iblSrc: iblSrc, _landColor: function () { return LAND_COLOR; },   // W-0139·W-0153 진단용
    /* 값을 내는 함수 — three 없이도 돈다(자가진단이 이것만 따로 본다) */
    lightingAt: lightingAt, propPlan: propPlan, urbanity: urbanity, camAim: camAim,
    /** 짓는 반경(R)·부수는 반경(UR, PLAN 42절) — 손잡이로 잡는다 */
    propRadius: PROP_R, unloadRadius: function () { return PROP_UR(PROP_R()); },
    /** 잔 사물이 진짜 모델을 받는 거리(PLAN 36절 LOD) — 손잡이로 잡는다 */
    lodNear: LOD_NEAR,
    /** 잎·풀 흔들림 켬/폭(PLAN 44절) — 손잡이로 잡는다 */
    swayOn: SWAY_ON, swayAmt: SWAY_AMT,
    /** 등롱·사당 불꽃·연기 켬(PLAN 44절) — 손잡이로 잡는다 */
    flameOn: FLAME_ON, flameAmt: FLAME_AMT, smokeOn: SMOKE_ON,
    houseRects: houseRects,
    camOcclude: camOcclude,
    /** 땅 높이(m) — 들판 전투가 예고 원·숫자를 땅에 붙일 때 쓴다 */
    groundY: groundY,
    /** ⑲-20 층을 아는 발 높이 — sky 를 안 주면 내 층(구름섬 위면 섬 윗면) */
    standY: standY,
    aimCam: aimCam,
    /** 지금 쓰는 시야각(도) — 진단·데모가 세로 화면 보정을 값으로 본다 */
    fov: function () { return camera ? camera.fov : FOV(); },
    forceTime: forceTime,
    /* 조우 무대 — `encounter3d.js` 가 켜고 끈다. 여기 있는 것은 **카메라와 자리**뿐이고
       링·사료·빛 같은 소품은 그쪽이 만들어 `addFx` 로 얹는다 */
    stage: function (o) {
      stageAt = o ? { x: o.x, y: o.y, uid: o.uid, lift: 0, back: 0 } : null;
      return stageAt;
    },
    stageAt: function () { return stageAt; },
    three: function () { return T; },
    addFx: function (n) { if (fxGroup && n) { fxGroup.add(n); } return n; },
    removeFx: function (n) { if (fxGroup && n) { fxGroup.remove(n); } },
    /** 클릭(탭)한 자리를 3D 바닥에도 표시 — `world.js`의 `onClick()`이 부른다 */
    clickMark: clickMark,
    camNode: function () { return camera; }, pickGround: pickGround, sceneNode: function () { return scene; }, rendererNode: function () { return renderer; },   // W-0310 군중·날씨 조각이 같은 장면에 얹는다
    /** 돌려 보기 — 드래그가 두드린다(`world.js`). 라디안을 더한다 */
    turn: function (d) {
      if (talkShot()) { return yaw; }            // ⑲-13 대화 중엔 끌어 돌리기를 안 받는다
      yaw += d || 0;
      while (yaw > Math.PI) { yaw -= Math.PI * 2; }
      while (yaw < -Math.PI) { yaw += Math.PI * 2; }
      return yaw;
    },
    yaw: function (v) { if (v !== undefined) { yaw = v; } return yaw; }, faceTo: function (x, y, ms) { faceAt = { x: x, y: y, until: (global.performance ? performance.now() : Date.now()) + (ms || 300) }; }, meAng: function () { return actors.me ? actors.me.ang || 0 : 0; },   // W-0173
    /* 전투 연출 손잡이 — `battle3d.js` 가 두드린다 (PLAN 23절) */
    battle: function (on) { battleOn = !!on; if (!on) { shakeAmp = 0; } return battleOn; },
    inBattle: function () { return battleOn; },
    /* 교전 상대를 실제로 세운다 — `battle3d.js` 가 duel:open/close 때 두드린다 */
    duelStage: duelStage, duelUnstage: duelUnstage, playAnim: playAnim,
    duelFoe: function () { return duelFoe; },
    /** 사건이 조명을 얼마나 죽이나(0~1) — `battle3d.js`가 `duel:open`·
     *  `duel:close`에서 두드린다. 인자 없이 부르면 지금 값만 읽는다 */
    eventMood: function (v) { if (v !== undefined) { eventDark = Math.max(0, Math.min(1, v)); } return eventDark; },
    /** 카메라를 흔든다. 세기는 m — 여러 번 부르면 센 쪽이 남는다 */
    shake: function (amp) { shakeAmp = Math.max(shakeAmp, amp || 0); return shakeAmp; },
    shakeAmp: function () { return shakeAmp; },
    /** 잠깐 멎는다(ms). 너무 길면 끊긴 것으로 보이므로 상한을 둔다 */
    hold: function (ms) {
      var v = Math.min(180, Math.max(0, ms || 0));
      holdUntil = Math.max(holdUntil, (global.performance ? performance.now() : 0) + v);
      return v;
    },
    lum: lum, GRID: GRID,
    /** 인스턴스 덩이 현황 (PLAN 16절) — 진단·데모가 값으로 본다 */
    instStats: instStats,
    instCullStats: function () { return { live: cullStat.live, drawn: cullStat.drawn, frames: cullStat.frames }; },
    /** 지면에 칠하는 땅 색 — 진단이 빠진 갈래가 없는지 본다 */
    LAND_COLOR: LAND_COLOR,
    /** 지금 조명 (데모·어드민이 들여다본다) */
    light: function () { return lightNow || lightingAt(undefined, weatherKey()); },
    /** 조우 연출을 밖에서 걸어 볼 때 (데모가 쓴다) */
    focus: function (o) { focusAt = o ? { x: o.x, y: o.y } : null; return focusAt; },
    beam: beam,
    /* 눈으로 확인할 때 쓰는 값 */
    /** 지면 타일이 어떤 상태인지 — 색·텍스처·위치를 그대로 뽑는다 */
    tileProbe: function () {
      var ks = Object.keys(tileMeshes);
      if (!ks.length) { return 'none'; }
      var out = [], i;
      for (i = 0; i < Math.min(3, ks.length); i++) {
        var m = tileMeshes[ks[i]];
        out.push(ks[i] + ':col=' + m.material.color.getHexString() +
          ' map=' + (m.material.map ? (m.material.map.image && m.material.map.image.width ? 'img' + m.material.map.image.width : 'empty') : 'no') +
          ' at=' + Math.round(m.position.x) + ',' + Math.round(m.position.z));
      }
      var lights = [];
      scene.traverse(function (o) { if (o.isLight) { lights.push(o.type + ':' + o.intensity.toFixed(2)); } });
      out.push('lights=' + lights.join('/'));
      return out.join(' | ');
    },
    /** 화면 몇 군데의 색을 직접 읽는다 — "검게 나온다" 를 눈이 아니라 값으로 본다 */
    probe: function () {
      if (!available()) { return 'n/a'; }
      var gl = renderer.getContext();
      var w = canvas.width, h = canvas.height;
      function at(px, py) {
        var b = new Uint8Array(4);
        gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b);
        return b[0] + ',' + b[1] + ',' + b[2];
      }
      /* WebGL 은 왼쪽 **아래**가 원점이다 */
      var read = 'top=' + at(w >> 1, h - 8) + ' mid=' + at(w >> 1, h >> 1) +
        ' bot=' + at(w >> 1, 8) + ' size=' + w + 'x' + h;
      /* 버퍼 읽기 경로가 멀쩡한지 — 마젠타로 지우고 곧바로 읽어 본다 */
      gl.clearColor(1, 0, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      read += ' clearTest=' + at(w >> 1, h >> 1);
      /* 카메라가 무엇을 보고 있는지 */
      read += ' near/far=' + camera.near + '/' + camera.far +
        ' look=' + (camLook ? [camLook.x, camLook.y, camLook.z].map(Math.round).join(',') : '-') +
        ' children=' + scene.children.length;
      return read;
    },
    /** §6.1-B ① 재기(`?perf` 표시가 0.5초마다 읽는다) — 한 프레임 호출·삼각형(`?perf` 일 때만 합산)·GPU 도형·텍스처·셰이더·캔버스 */
    glInfo: function () {
      if (!renderer) { return null; }
      var I = renderer.info;
      return { calls: PERF_ON ? glFrame.calls : I.render.calls, tris: PERF_ON ? glFrame.tris : I.render.triangles,
        geos: I.memory.geometries, texs: I.memory.textures, progs: I.programs ? I.programs.length : 0,
        w: canvas ? canvas.width : 0, h: canvas ? canvas.height : 0, dpr: renderer.getPixelRatio() };
    },
    /** §6.1-B ① 재기 — 씬 최상위 묶음마다 보이는 삼각형·메시 수(그림자 드리우는 몫 따로). 화면 밖 걸러내기 전 값 */
    triBreakdown: function (topN) {
      if (!scene) { return null; }
      var out = {}, byGeo = {};
      if (topN) {
        propGroup.traverseVisible(function (o) {
          if (!o.isMesh || !o.geometry) { return; }
          var g = o.geometry, c = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0), per = Math.round(c / 3);
          var k = g.uuid, e = byGeo[k] || (byGeo[k] = { name: (o.name || (o.parent && o.parent.name) || g.type).slice(0, 60), per: per, n: 0, inst: !!o.isInstancedMesh, cast: !!o.castShadow });
          e.n += o.isInstancedMesh ? o.count : 1;
        });
        out.top = Object.keys(byGeo).map(function (k) { var e = byGeo[k]; e.total = e.per * e.n; return e; })
          .sort(function (a, b) { return b.total - a.total; }).slice(0, topN);
      }
      scene.children.forEach(function (ch, i) {
        var key = ch === groundGroup ? 'ground' : ch === propGroup ? 'prop' : ch === actorGroup ? 'actor' : ch === fxGroup ? 'fx' : (ch.type + i);
        var tris = 0, cast = 0, meshes = 0;
        ch.traverseVisible(function (o) {
          if (!o.isMesh || !o.geometry) { return; }
          var g = o.geometry, c = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0);
          var t = Math.round(c / 3) * (o.isInstancedMesh ? o.count : 1);
          tris += t; meshes++; if (o.castShadow) { cast += t; }
        });
        if (tris) { out[key] = { tris: tris, cast: cast, meshes: meshes }; }
      });
      return out;
    },
    /** §6.1-B ① 재기 — 배우마다 삼각형 수(큰 것부터 n 개). 어느 몸이 GPU 를 잡아먹는지 본다 */
    heavyActors: function (n) {
      var out = [], a;
      for (a in actors) {
        if (!Object.prototype.hasOwnProperty.call(actors, a) || !actors[a].node) { continue; }
        var tris = 0, meshes = 0;
        actors[a].node.traverse(function (o) {
          if (!o.isMesh || !o.geometry) { return; }
          var g = o.geometry, c = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0);
          tris += Math.round(c / 3) * (o.isInstancedMesh ? o.count : 1); meshes++;
        });
        var bb = new T.Box3().setFromObject(actors[a].node), sz = bb.getSize(new T.Vector3());
        out.push({ key: a, kind: actors[a].kind, tris: tris, meshes: meshes, vis: actors[a].node.visible, size: [sz.x, sz.y, sz.z].map(function (v) { return +v.toFixed(1); }) });
      }
      out.sort(function (x, y) { return y.tris - x.tris; });
      return out.slice(0, n || 10);
    },
    stats: function () {
      var meshes = 0, a;
      for (a in actors) {
        if (Object.prototype.hasOwnProperty.call(actors, a) && actors[a].mesh) { meshes++; }
      }
      var drawn = 0;
      if (scene) { scene.traverse(function (o) { if (o.isMesh || o.isSprite) { drawn++; } }); }
      var L = lightNow;
      return {
        tiles: Object.keys(tileMeshes).length,
        props: Object.keys(propMeshes).length,
        actors: Object.keys(actors).length,
        meshActors: meshes,
        drawn: drawn,
        frames: frame,
        light: L ? (L.phase + ' ' + L.weather + ' 해' + L.sun.intensity.toFixed(2)) : '-',
        zoom: '×' + (global.DG.world.zoom3d || 1).toFixed(1),
        focus: focusAt ? (Math.round(focusAt.x) + ',' + Math.round(focusAt.y)) : '-',
        stage: stageAt ? (Math.round(stageAt.x) + ',' + Math.round(stageAt.y) +
          ' h' + (stageAt.h || 0).toFixed(1)) : '-',
        enc: (function () {
          var e = global.DG.encounter3d, st = e && e.state();
          return st ? (st.kind + '/' + st.phase + '/t' + st.t + '/사료' + st.pellet) : '-';
        })(),
        size: canvas ? (canvas.width + 'x' + canvas.height) : '-',
        cam: camera ? ([camera.position.x, camera.position.y, camera.position.z]
          .map(function (v) { return Math.round(v); }).join(',')) : '-',
        /* §6.1-B ① 재기 — 그리기 호출·삼각형(마지막 render 한 번)·GPU 에 올린 도형·텍스처·셰이더 수 */
        gl: renderer ? { calls: renderer.info.render.calls, tris: renderer.info.render.triangles,
          geos: renderer.info.memory.geometries, texs: renderer.info.memory.textures,
          progs: renderer.info.programs ? renderer.info.programs.length : 0 } : null,
        failed: failed, ready: ready, wanted: wanted(),
        ibl: scene ? ((scene.environment ? 'on×' + (scene.environmentIntensity || 0).toFixed(2) : 'off')) : '-'
      };
    }
  };
})(window);
