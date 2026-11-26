// 추리마을 6번 사건 — 마을 계좌가 털렸다 (후보 C, case4-ideas.md)
const I = 'img/c6/';
export default {
  id: 6, key: 'village-c6', img: I,
  title: '마을 계좌가 털렸다',
  intro: `<p>하루 동안 마을 어르신 일곱 분이 「아드님이 사고가 났다」는 전화를 받고 모두 합쳐 팔천만 원을 보냈습니다.</p>
  <p>전화 건 사람은 <b>손주 이름과 다니는 병원까지</b> 알고 있었어요. 그 정보는 어디서 샜을까요?</p>`,
  hanHint: '일곱 분이 공통으로 가진 게 뭔지 봐요. 그걸 다 볼 수 있는 사람은 마을에 몇 없어요.',
  accuseQ: '누가 어르신들 정보를 넘겼을까요?',
  startTime: 17*60, period: 40,
  moment: {from:13, to:17, clue:8, hint:'탁은지가 우체국 뒷골목에서 오토바이 배달함에 봉투를 넣고 있어요 — 📷 으로 찍어 두세요'},
  clues: [
    {id:1,pos:[-12,11.6],t:'노인정 통화 메모',d:'어르신들이 받아 적은 전화 내용 — 손주 이름, 다니는 병원, 연금 들어오는 날까지 정확하다.'},
    {id:2,pos:[12,9.6],t:'현금인출기 기록',d:'오늘 14:00~16:30, 일곱 분이 차례로 같은 계좌로 송금. 모두 처음 보는 계좌.'},
    {id:3,pos:[22,-29.4],t:'등기 발송 대장',d:'일곱 분 모두 최근 석 달 안에 「연금·건강검진 안내」 등기를 받았다. 이 우편 창구 담당은 탁은지 한 사람.'},
    {id:4,pos:[14,-11.5],t:'휴대폰 가게 개통 기록',d:'일곱 분 중 이 가게에서 개통한 분은 둘뿐. 나머지 다섯은 읍내 다른 통신사.'},
    {id:5,pos:[-38,5.3],t:'이장의 경로당 명단',d:'이장 명단엔 주소와 전화번호뿐 — 손주 이름도, 병원도 없다.'},
    {id:6,pos:[30.3,-29.4],t:'우체국 앞 독촉장',d:'창구 옆 쓰레기통의 구겨진 카드 독촉장 — 「탁은지 님, 할부 연체 3,100만 원」. 명품 가방 매장 이름이 줄줄이.'},
    {id:7,pos:[25,-41],snow:20,t:'뒷골목 오토바이 바퀴 자국',d:'우체국 뒷문 바로 앞에서 멈췄다 떠난 오토바이 바퀴 자국. 배달 앱 기록에는 이 시간 이 동네 주문이 없다.'},
    {id:8,photo:true,t:'봉투를 넘기는 탁은지',d:'17:13, 우체국 뒷문에서 오토바이 배달함에 두꺼운 봉투를 넣는 탁은지. 봉투 겉에 「명단」 메모.'},
  ],
  npcs: [
    {id:'tak',look:{coat:0x2a3a6a,hair:0x1a1a1a,hairStyle:'bob',scarf:0xc9472f,pants:0x1a1a2a},name:'탁은지',job:'우체국 창구 직원',pos:[25,-28.5],color:0x2a3a6a,culprit:true,
      talk:['어르신들 너무 불쌍하세요. 요즘 사기가 얼마나 교묘한데요.','등기요? 마을 우편은 다 제가 받으니까 저야 다 알죠. 그게 일인걸요.'],
      after:{3:'대장은 누구나 볼 수 있어요. 창구 뒤에 그냥 꽂혀 있잖아요.',6:'그건… 제 개인적인 거예요. 사건이랑 상관없어요.'}},
    {id:'jung',look:{coat:0x4a4a4a,hair:0x2a2018,hat:{type:'beanie',c:0x2a2a2a}},name:'정우석',job:'ATM 앞 청년',pos:[8,8],color:0x4a4a4a,
      talk:['ATM 앞에 오래 있었던 건 맞아요. 「고액 알바」 문자 받고 고민하고 있었어요.','근데 안 했어요! 그거 인출책 구하는 거라고 들어서 바로 지웠어요.'],
      after:{2:'저 할머니들 송금할 때 말렸어요. 근데 전화 속 사람이 「옆 사람 말 듣지 마」 했대요.'}},
    {id:'lee',look:{coat:0x5a4a3a,hair:0xd0d0d0,hat:{type:'cap',c:0x3a3a2a}},name:'이만복',job:'마을 이장',pos:[-38,4.5],color:0x5a4a3a,
      talk:['어르신 명단이야 내가 다 갖고 있지. 행사 때 써야 하니까.','근데 손주 이름? 병원? 그런 건 나도 몰라.'],
      after:{5:'봐, 내 명단엔 그런 게 없잖아. 그건 편지 받는 사람이나 알지.'}},
    {id:'so',look:{coat:0x3a6a8a,hair:0x2a2a2a,glasses:true,pants:0x2b2f3a},name:'소재훈',job:'휴대폰 가게 사장',pos:[14,-11],color:0x3a6a8a,
      talk:['어르신들 폰은 우리 가게에서 많이 해 드리죠. 그래서 다들 나를 봐요.','개통 서류엔 손주 이름 같은 거 안 써요.']},
    {id:'han',look:{coat:0xd8b8c8,hair:0x3a2a1a,hairStyle:'long',scarf:0x6a8aa8},name:'한다은',job:'어르신 손녀',pos:[-12,11],color:0xd8b8c8,
      talk:['할머니가 제 이름을 대는 전화에 속으셨어요. 저 멀쩡히 학교 다니는데.','할머니가 그러셨어요. 「우체국 아가씨가 친절해서 손주 자랑을 많이 했다」고.'],
      after:{1:'제 이름, 제가 다니는 병원까지… 할머니가 그 얘기를 한 사람은 몇 명 안 돼요.'}},
  ],
  routes: {
    tak:[{t:0,p:[25,-28.5]},{t:8,p:[25,-28.5]},{t:10,p:[31,-28.5]},{t:12,p:[31,-39]},{t:13,p:[26,-39.5]},{t:17,p:[26,-39.5]},{t:19,p:[31,-39]},{t:22,p:[31,-28.5]},{t:24,p:[25,-28.5]}],
    jung:[{t:0,p:[8,8]},{t:12,p:[4,8]},{t:20,p:[4,8]},{t:30,p:[8,8]}],
    lee:[{t:0,p:[-38,4.5]},{t:10,p:[-20,4.5]},{t:22,p:[-20,4.5]},{t:32,p:[-38,4.5]}],
    so:[{t:0,p:[14,-11]},{t:14,p:[8,-11]},{t:24,p:[8,-11]},{t:30,p:[14,-11]}],
    han:[{t:0,p:[-12,11]},{t:8,p:[-4,11]},{t:20,p:[-4,11]},{t:28,p:[-12,11]}],
  },
  buildings: [
    {n:'노인정',x:-12,z:16,c:0xc8a878},
    {n:'ATM',x:12,z:14,c:0x2a5a8a,w:3,h:3},
    {n:'휴대폰 가게',x:14,z:-16,c:0x6aa0c8,w:7},
  ],
  props({THREE, scene}) {
    const L = c => new THREE.MeshLambertMaterial({color: c});
    // 배달 오토바이(우체국 뒷골목)
    const g = new THREE.Group();
    for (const z of [-0.7, 0.7]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 8, 16), L(0x222222)); w.rotation.y = Math.PI / 2; w.position.set(0, 0.42, z); g.add(w); }
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 1.4), L(0xc9472f)); body.position.y = 0.75; g.add(body);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.7), L(0xf0f0f0)); box.position.set(0, 1.3, -0.55); g.add(box);
    g.position.set(27.5, 0, -40.5); g.rotation.y = 0.4; scene.add(g);
    // 우체국 앞 쓰레기통
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.9, 12), L(0x4a6a4a)); bin.position.set(30.6, 0.45, -29.9); scene.add(bin);
  },
  ending: `<img src="${I}e1.jpg" alt="" onerror="this.remove()">
  <p>일곱 분이 공통으로 받은 것 — 「연금·건강검진 안내」 등기. 그 우편을 받고, 어르신들의 손주 자랑까지 들은 사람은 창구의 탁은지뿐이었다.</p>
  <p>3,100만 원 명품 할부, 그리고 뒷골목 오토바이에 넘긴 「명단」 봉투.</p>
  <img src="${I}e2.jpg" alt="" onerror="this.remove()">
  <p>탁은지: 「어차피 돈 있는 노인들이잖아요. 난 이 월급으로 평생 못 사는 걸 그 사람들은 통장에 그냥 두고.」</p>
  <p>일곱 분 중 한 분은 그 돈이 손주 대학 등록금이었다.</p>
  <img src="${I}e3.jpg" alt="" onerror="this.remove()">
  <p>그 주말, 노인정에서 손녀 한다은이 어르신들께 「모르는 전화 끊는 법」을 가르쳤다. 첫 번째 학생은 자기 할머니였다.</p>`,
  next: '다음 사건 — 준비 중',
};
