// 추리마을 4번 사건 — 가로등이 꺼지는 밤 (후보 B, case4-ideas.md)
const I = 'img/c4/';
let alley = [];                       // 골목 가로등 [{bulb, light}]
export default {
  id: 4, key: 'village-c4', img: I,
  title: '가로등이 꺼지는 밤',
  intro: `<p>일주일째, 밤 10시가 넘으면 가로등이 한 줄씩 꺼지고 그 골목의 빈집이 털렸습니다.</p>
  <p>오늘 밤은 <b>우체국 뒤 골목</b>. 22시 5분, 그 골목 가로등이 또 꺼졌어요. 그리고 우체국장 댁 창문이 열려 있었습니다.</p>`,
  hanHint: '불이 꺼질 때 누가 그 근처에 있었는지 봐요. 어둠은 우연히 오지 않아요.',
  accuseQ: '누가 불을 끄고 빈집을 털었을까요?',
  startTime: 22*60, period: 40,
  moment: {from:4, to:8, clue:8, hint:'남도윤이 골목 입구 차단기 함을 열고 있어요 — 📷 으로 찍어 두세요'},
  clues: [
    {id:1,pos:[12.5,-39.6],t:'골목 차단기 함',d:'자물쇠 대신 새 케이블 타이로 묶여 있다. 안쪽 레버에 기름 묻은 장갑 자국.'},
    {id:2,pos:[33,-42.4],snow:15,t:'담 밑 발자국',d:'우체국장 댁 뒷담 밑에서 골목으로 나온 발자국. 바닥 무늬가 미끄럼 방지 안전화.'},
    {id:3,pos:[17,-38],t:'수리 트럭 속 일지',d:'조수석의 수리 일지 — 이번 주 고쳐 준 집 일곱 곳, 그 옆에 「화·목 밤 빔」「주말 서울」 같은 메모.'},
    {id:4,pos:[-25,-3.3],t:'곰방 외상 장부',d:'술집 사장: 「남 기사 외상이 석 달 치예요. 지난주엔 사채업자가 그 사람 찾으러 왔었고.」'},
    {id:5,pos:[-38,5.3],t:'마을회관 정전 기록',d:'이번 주 정전 일곱 번 — 시각과 골목이 털린 집과 똑같다. 정전 신고는 매번 「전기 수리 남도윤 점검 완료」.'},
    {id:6,pos:[34,-42.3],t:'우체국장 댁 창문',d:'창살 나사가 풀려 있다. 나사 홈에 남은 자국은 전기 공사용 큰 십자 드라이버 크기.'},
    {id:7,pos:[25,29.3],t:'택시 블랙박스',d:'오덕만 택시 블랙박스 — 22:00~22:35 이사 온 청년 강민재를 태우고 읍내까지 다녀왔다.'},
    {id:8,photo:true,t:'차단기를 내리는 남도윤',d:'22:05, 골목 입구 차단기 함을 열고 레버를 내리는 남도윤. 그 순간 골목 가로등이 하나씩 꺼진다.'},
  ],
  npcs: [
    {id:'nam',look:{coat:0xe0a030,hair:0x1a1a1a,hat:{type:'cap',c:0x2a4a7a},pants:0x2a4a7a},name:'남도윤',job:'전기 수리 기사',pos:[14,-34.5],color:0xe0a030,culprit:true,
      talk:['또 정전이라 점검하러 나왔어요. 이 동네 선이 오래돼서 자꾸 나가요.','도둑이요? 불 꺼진 틈에 누가 들어갔나 보네. 무섭네요.'],
      after:{1:'케이블 타이는… 임시로 묶어 둔 거예요. 자물쇠가 고장 나서.',4:'외상은 갚을 거예요. 사채는 무슨, 그냥 아는 형이에요.'}},
    {id:'kang',look:{coat:0x3a3a5a,hair:0x4a3020,hat:{type:'beanie',c:0x7a2a2a}},name:'강민재',job:'이사 온 청년',pos:[-3,-8],color:0x3a3a5a,
      talk:['이사 온 지 한 달인데 오자마자 도둑 소문이라 다들 저를 봐요.','밤마다 산책하는 건 맞아요. 근데 오늘은 읍내 다녀왔어요.'],
      after:{7:'거봐요, 택시 기사님이 아시잖아요. 저 그 시간에 여기 없었어요.'}},
    {id:'oh',look:{coat:0x2b3a5a,hair:0x9a9a9a,hat:{type:'cap',c:0x3a4a6a},pants:0x3a3a3a},name:'오덕만',job:'택시 기사',pos:[22,27],color:0xd8a531,
      talk:['그 골목 지나다닌 건 맞지. 근데 오늘은 손님 태우고 읍내 갔다 왔어.','불 꺼질 때마다 남 기사 트럭이 근처에 서 있더라고. 부지런도 하지.']},
    {id:'yoo',look:{coat:0x7a3a5a,hair:0x2a1a14,hairStyle:'long',scarf:0xe8d8c0},name:'유세린',job:'우체국장 조카',pos:[25,-28.5],color:0x7a3a5a,
      talk:['고모 댁 열쇠는 저도 있어요. 그래서 다들 저를 의심하죠.','그 시간엔 우체국에서 연말 우편 정리하고 있었어요. 창구 CCTV 보세요.']},
    {id:'bae',look:{coat:0x2a3a2a,hair:0xb0b0b0,hat:{type:'cap',c:0x1a2a1a}},name:'배철호',job:'순찰 경비원',pos:[6,4],color:0x2a3a2a,
      talk:['22시 순찰은 원래 우체국 뒤 골목부터인데… 오늘은 좀 늦게 돌았소.','솔직히 초소에서 깜빡 졸았지. 그래도 내가 도둑은 아니오.'],
      after:{5:'정전 신고는 매번 남 기사가 받았지. 나는 그 사람 오는 거 보면 안심했는데.'}},
  ],
  routes: {
    nam:[{t:0,p:[14,-34.5]},{t:2,p:[11,-34.5]},{t:4,p:[11,-40.5]},{t:8,p:[11,-40.5]},{t:10,p:[20,-41]},{t:13,p:[33,-42]},{t:20,p:[33,-42]},{t:24,p:[20,-41]},{t:27,p:[11,-40.5]},{t:30,p:[11,-34.5]},{t:32,p:[14,-34.5]}],
    kang:[{t:0,p:[-3,-8]},{t:10,p:[-3,-8]},{t:15,p:[-3,-24]},{t:25,p:[-3,-24]},{t:30,p:[-3,-8]}],
    oh:[{t:0,p:[22,27]},{t:20,p:[22,27]},{t:24,p:[10,27]},{t:30,p:[10,27]},{t:34,p:[22,27]}],
    yoo:[{t:0,p:[25,-28.5]},{t:10,p:[25,-28.5]},{t:13,p:[31,-28.5]},{t:24,p:[31,-28.5]},{t:27,p:[25,-28.5]}],
    bae:[{t:0,p:[6,4]},{t:26,p:[6,4]},{t:32,p:[6,-26]},{t:36,p:[6,-26]},{t:40,p:[6,4]}],
  },
  buildings: [
    {n:'우체국장 댁',x:34,z:-47,c:0xb8a07a,w:8},
  ],
  props({THREE, scene, car}) {
    const L = c => new THREE.MeshLambertMaterial({color: c});
    // 우체국 뒤 골목길
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(32, 3.5), L(0xb7bfcc)); lane.rotation.x = -Math.PI / 2; lane.position.set(24, 0.012, -41); scene.add(lane);
    // 골목 가로등 넷 — 22:05 꺼졌다가 22:30 다시 켜짐(update)
    alley = [];
    for (const x of [14, 20, 28, 36]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4), L(0x333333)); p.position.set(x, 2, -39.3); scene.add(p);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({color: 0xffe2a0})); bulb.position.set(x, 4.1, -39.3); scene.add(bulb);
      const light = new THREE.PointLight(0xffc77a, 18, 14); light.position.set(x, 4, -39.3); scene.add(light);
      alley.push({bulb, light});
    }
    // 차단기 함
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.4), L(0x8a9099)); box.position.set(11.6, 1.2, -41.6); scene.add(box);
    // 전기 수리 트럭(흰 바탕·파란 띠)
    car(14, -38, 0xf2f2f2, true);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.3, 4.45), L(0x2a4a7a)); stripe.position.set(14, 1.1, -38); scene.add(stripe);
    // 열린 창문
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({color: 0x1a1a22})); win.position.set(36, 3, -43.48); scene.add(win);
  },
  update(tm) {                         // 마을 시각(주기 안 분)
    const off = tm >= 5 && tm < 30;
    alley.forEach((l, i) => {
      const o = off && tm >= 5 + i * 0.6;   // 한 줄씩 차례로 꺼짐
      l.bulb.material.color.setHex(o ? 0x333333 : 0xffe2a0); l.light.intensity = o ? 0 : 18;
    });
  },
  ending: `<img src="${I}e1.jpg" alt="" onerror="this.remove()">
  <p>케이블 타이로 묶인 차단기, 안전화 발자국, 큰 십자 드라이버 자국. 정전 일곱 번을 「점검 완료」한 사람은 늘 한 사람이었다.</p>
  <p>트럭 속 수리 일지 — 낮에 고쳐 준 집마다 「밤 빔」 메모. 석 달 치 외상과 사채가 그 밑에 있었다.</p>
  <img src="${I}e2.jpg" alt="" onerror="this.remove()">
  <p>남도윤: 「불 좀 끈 게 무슨 죄예요. 다들 보험 들었잖아요.」</p>
  <p>우체국장 댁에서 없어진 건 돌아가신 남편의 손목시계였다. 보험으로는 돌아오지 않는 것.</p>
  <img src="${I}e3.jpg" alt="" onerror="this.remove()">
  <p>다음 날 밤, 골목 가로등이 다시 켜졌다. 경비원 배철호는 그날부터 한 번도 졸지 않았다.</p>`,
  next: '<a href="?case=5">다음 사건 「멈춘 리프트」 열기 →</a>',
};
