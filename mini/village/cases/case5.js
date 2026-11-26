// 추리마을 5번 사건 — 멈춘 리프트 (후보 A, case4-ideas.md)
const I = 'img/c5/';
let chairs = [], running = true;
const LX = -54, Z0 = 22, Z1 = 58, LOOP = (Z1 - Z0) * 2;   // 리프트 줄(x=-50, z 22→58 올라가고 돌아옴)
export default {
  id: 5, key: 'village-c5', img: I,
  title: '멈춘 리프트',
  intro: `<p>마을 뒤 작은 스키장. 밤 9시 마지막 리프트가 멈춰, 리조트 회계 직원 도은비 씨가 영하 15도 공중에 두 시간 갇혀 있다가 구조됐어요.</p>
  <p>리조트는 「고장」이라는데, <b>은비 씨는 다음 날 본사에 무언가를 보고할 참이었습니다.</b></p>`,
  hanHint: '기계는 혼자 멈추지 않아요. 21시 전후로 제어실과 정비 창고 사이를 누가 오갔는지 봐요.',
  accuseQ: '누가 리프트를 멈췄을까요?',
  startTime: 20*60+50, period: 40,
  moment: {from:10, to:15, clue:8, hint:'연기석이 정비 창고 뒤 퓨즈 상자를 열고 있어요 — 📷 으로 찍어 두세요'},
  clues: [
    {id:1,pos:[-46,21.5],t:'제어실 정지 기록',d:'21:00 「원격 비상 정지」. 제어실 열쇠는 둘뿐 — 매니저 연기석과 정비 기사 함동수.'},
    {id:2,pos:[-36,34.7],t:'정비 창고 퓨즈 상자',d:'리프트 퓨즈 하나가 거꾸로 꽂혀 있다. 누가 급하게 뺐다가 다시 꽂은 흔적.'},
    {id:3,pos:[-42,33],snow:18,t:'눈 위 구두 자국',d:'제어실 뒷문에서 정비 창고 뒤로 이어진 발자국 — 스키 부츠도 작업화도 아닌 굽 있는 구두.'},
    {id:4,pos:[-35.5,41.6],t:'은비의 노트북 메모',d:'리조트 사무실 은비 책상 — 「장비 대여비 3년 차액, 월요일 본사 감사팀 보고」. 표 맨 아래 결재자 연기석.'},
    {id:5,pos:[-41,13.6],t:'무전 기록',d:'매표소 무전기 — 20:58 매니저 목소리 「마지막 손님 없음, 운행 종료하겠음」. 은비는 그때 막 리프트에 탔다.'},
    {id:6,pos:[-40.5,41.6],t:'식당 CCTV',d:'리조트 1층 식당 — 정비 기사 함동수 20:50~21:20 저녁 먹는 모습 그대로.'},
    {id:7,pos:[-25,-3.3],t:'곰방 영수증',d:'은비 전 남자친구 차준혁, 20:40~21:30 곰방에서 혼자 소주. 사장이 계속 봤다고.'},
    {id:8,photo:true,t:'퓨즈를 빼는 연기석',d:'21:00, 정비 창고 뒤에서 퓨즈 상자를 열고 퓨즈를 뽑는 연기석. 고개를 들자 멈춘 리프트 위 의자 하나가 흔들린다.'},
  ],
  npcs: [
    {id:'yeon',look:{coat:0x2a2a3a,hair:0x1a1a1a,glasses:true,scarf:0x8a2a2a,pants:0x1a1a22},name:'연기석',job:'리조트 매니저',pos:[-38,41.5],color:0x2a2a3a,culprit:true,
      talk:['리프트가 오래돼서 겨울마다 한 번씩 서요. 저도 미치겠습니다.','은비 씨는 다행히 무사하잖아요. 이걸로 시끄러워지면 리조트 문 닫아요.'],
      after:{5:'무전이요? 그땐 정말 손님이 없는 줄 알았어요. 확인을 못 했을 뿐이에요.',4:'감사요? 은비 씨가 뭘 착각한 거예요. 장부는 제가 다 봅니다.'}},
    {id:'ham',look:{coat:0xd06a20,hair:0x333333,hat:{type:'beanie',c:0x333333},pants:0x333333},name:'함동수',job:'정비 기사',pos:[-30,25],color:0xd06a20,
      talk:['그 리프트 내가 매일 보는데, 퓨즈가 저절로 거꾸로 꽂히진 않아.','제어실 열쇠? 나랑 매니저만 있지. 근데 난 그때 밥 먹고 있었어.'],
      after:{2:'봐, 이건 일부러 뺀 거야. 기계 아는 사람이면 이렇게 안 꽂아.'}},
    {id:'seo',look:{coat:0x3aa0d8,hair:0x4a3020,goggles:true,pants:0x7a9ab8},name:'서하준',job:'스키 강사',pos:[-45,12],color:0x3a5f9c,
      talk:['또 저예요? 지난번 뺑소니 때도 의심받았는데.','은비 씨 구조한 게 저예요. 리프트 줄 타고 올라가서 담요 덮어 줬어요.'],
      after:{3:'구두 자국이면 강사는 아니에요. 우린 밤에도 부츠 신어요.'}},
    {id:'cha',look:{coat:0x5a6a3a,hair:0x3a2a1a,pants:0x2b2f3a},name:'차준혁',job:'은비 전 남자친구',pos:[-25,-3],color:0x5a6a3a,
      talk:['헤어진 건 맞아요. 그렇다고 사람을 공중에 매달아요?','그날 곰방에서 혼자 마셨어요. 은비 소식 듣고 바로 뛰어갔고요.']},
    {id:'moon',look:{coat:0xe8c8d8,hair:0x2a1a14,hairStyle:'long',hat:{type:'beanie',c:0xc9472f}},name:'문소라',job:'매표소 알바',pos:[-44,13.4],color:0xe8c8d8,
      talk:['은비 언니가 마지막으로 표 찍고 탔어요. 제가 봤어요.','근데 무전으로 매니저님이 「손님 없음」 하길래… 제가 잘못 본 줄 알았어요.'],
      after:{6:'함 기사님은 그때 식당에 계셨어요. 제가 저녁 같이 먹었거든요.'}},
  ],
  routes: {
    yeon:[{t:0,p:[-38,41.5]},{t:4,p:[-42,37]},{t:7,p:[-43,35]},{t:10,p:[-37,35]},{t:15,p:[-37,35]},{t:18,p:[-42,37]},{t:22,p:[-38,41.5]}],
    ham:[{t:0,p:[-30,25]},{t:5,p:[-30,41.5]},{t:8,p:[-40,41.5]},{t:26,p:[-40,41.5]},{t:30,p:[-30,41.5]},{t:35,p:[-30,25]}],
    seo:[{t:0,p:[-45,12]},{t:12,p:[-30,12]},{t:20,p:[-30,12]},{t:30,p:[-45,12]}],
    cha:[{t:0,p:[-25,-3]},{t:15,p:[-15,-3]},{t:25,p:[-15,-3]},{t:35,p:[-25,-3]}],
  },
  buildings: [
    {n:'리조트 사무실',x:-38,z:46,c:0x6a7a8a},
    {n:'리프트 제어실',x:-46,z:26,c:0x9aa0a8,w:5,h:3},
    {n:'정비 창고',x:-36,z:30,c:0x7a6a5a},
    {n:'매표소',x:-44,z:18,c:0xc9472f,w:5,h:3},
  ],
  props({THREE, scene}) {
    const L = c => new THREE.MeshLambertMaterial({color: c});
    // 슬로프(흰 비탈)
    const slope = new THREE.Mesh(new THREE.PlaneGeometry(8, 40), L(0xf6f8fc)); slope.rotation.x = -Math.PI / 2 + 0.12; slope.position.set(LX, 2.2, 40); scene.add(slope);
    // 기둥·줄
    for (let z = Z0; z <= Z1; z += 9) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 8), L(0x555b66)); t.position.set(LX, 4, z); scene.add(t);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.3), L(0x555b66)); arm.position.set(LX, 8, z); scene.add(arm); }
    for (const dx of [-1.1, 1.1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, Z1 - Z0), L(0x222222)); c.rotation.x = Math.PI / 2; c.position.set(LX + dx, 7.9, (Z0 + Z1) / 2); scene.add(c); }
    // 의자 10개
    chairs = [];
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2), L(0x333333)); hang.position.y = -1; g.add(hang);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.6), L(i === 3 ? 0xc9472f : 0x2a4a7a)); seat.position.y = -2; g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.1), seat.material); back.position.set(0, -1.65, -0.3); g.add(back);
      scene.add(g); chairs.push({g, s: i * LOOP / 10});
    }
    // 비상등
    const warn = new THREE.PointLight(0xff3a2a, 0, 10); warn.position.set(-46, 4, 26); scene.add(warn); chairs.warn = warn;
  },
  update(tm, dt) {
    running = !(tm >= 10 && tm < 35);                   // 21:00 멈춤 · 21:25 다시 돎
    for (const c of chairs) {
      if (running) c.s = (c.s + dt * 1.6) % LOOP;
      const up = c.s < LOOP / 2, z = up ? Z0 + c.s : Z1 - (c.s - LOOP / 2);
      c.g.position.set(LX + (up ? 1.1 : -1.1), 7.9, z);
      c.g.rotation.z = running ? 0 : Math.sin(tm * 3 + c.s) * 0.06;   // 멈추면 바람에 흔들
    }
    if (chairs.warn) chairs.warn.intensity = running ? 0 : (Math.sin(tm * 12) > 0 ? 14 : 0);
  },
  ending: `<img src="${I}e1.jpg" alt="" onerror="this.remove()">
  <p>「손님 없음」 거짓 무전, 원격 비상 정지, 거꾸로 꽂힌 퓨즈, 제어실에서 창고로 간 구두 자국. 열쇠를 가진 둘 중 하나는 식당에 있었다.</p>
  <p>은비의 노트북 — 3년 치 장비 대여비 차액, 결재자 연기석. 월요일이면 본사 감사였다.</p>
  <img src="${I}e2.jpg" alt="" onerror="this.remove()">
  <p>연기석: 「두 시간이면 안 죽어요. 그냥 겁만 주려던 거라고요.」 그날 밤 기온은 영하 15도였다.</p>
  <img src="${I}e3.jpg" alt="" onerror="this.remove()">
  <p>한 달 뒤, 은비는 다시 리프트를 탔다. 옆자리에는 스키 강사 서하준이 앉아 있었다.</p>`,
  next: '<a href="?case=6">다음 사건 「마을 계좌가 털렸다」 열기 →</a>',
};
