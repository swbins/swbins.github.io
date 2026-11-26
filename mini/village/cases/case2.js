// 추리마을 2번 사건 — 창고 방화 (줄거리 case2-plan.md)
const I = 'img/c2/';
export default {
  id: 2, key: 'village-c2', img: I,
  title: '창고 방화',
  intro: `<p>새벽 3시, 펜션 「솔눈」 뒤 장작 창고가 불탔습니다. 안에서 자던 일꾼 곽두식 씨가 손에 화상을 입고 겨우 빠져나왔어요.</p>
  <p>소방대는 「난로 과열」이라 했지만, <b>그 난로는 지난달에 치웠습니다.</b></p>`,
  hanHint: '불은 꺼졌어도 재는 남아요. 탄 창고부터 봐요 — 문이 어느 쪽에서 잠겼는지.',
  accuseQ: '누가 창고에 불을 냈을까요?',
  startTime: 5*60, period: 40,                        // 마을 시계 05:00 부터
  moment: {from:18, to:24, clue:8, hint:'조현우가 탄 창고 뒤에서 뭔가를 눈 속에 묻고 있어요 — 📷 으로 찍어 두세요'},
  routes: {
    jo:[{t:0,p:[-13,-20]},{t:6,p:[-13,-20]},{t:9,p:[-13,-17]},{t:14,p:[-47,-17]},{t:18,p:[-47,-30]},{t:24,p:[-47,-30]},{t:28,p:[-47,-17]},{t:34,p:[-13,-17]},{t:36,p:[-13,-20]}],
    gwak:[{t:0,p:[-33,-22]},{t:15,p:[-33,-22]},{t:20,p:[-30,-29.5]},{t:32,p:[-30,-29.5]},{t:37,p:[-33,-22]}],
    tak:[{t:0,p:[-33,-7]},{t:20,p:[-33,-7]},{t:25,p:[-33,-17]},{t:30,p:[-33,-17]},{t:35,p:[-33,-7]}],
    min:[{t:0,p:[36,-13]},{t:10,p:[36,-13]},{t:13,p:[36,-1]},{t:16,p:[24,-1]},{t:26,p:[24,-1]},{t:29,p:[36,-1]},{t:32,p:[36,-13]}],
    ha:[{t:0,p:[-24,-28]},{t:12,p:[-24,-28]},{t:17,p:[-16,-28]},{t:25,p:[-16,-28]},{t:30,p:[-24,-28]}],
  },
  clues: [
    {id:1,pos:[-40,-25],snow:25,t:'탄 창고 바닥',d:'등유 냄새가 나는 검은 자국이 문 쪽에서 안쪽으로 길게 이어진다 — 누군가 밖에서 부었다.'},
    {id:2,pos:[-34.3,-30],t:'창고 문 자물쇠',d:'문 바깥쪽 고리에 자물쇠가 걸려 있다. 원래는 안에서 거는 빗장뿐인 문이다.'},
    {id:3,pos:[-18,-20.6],t:'사위 차 블랙박스',d:'조현우 차 블랙박스 02:10~03:40 꺼짐. 「그날 서울에 있었다」던 차가 여기 서 있다.'},
    {id:4,pos:[-15,-24],t:'하이패스 영수증',d:'차 콘솔 속 영수증 — 01:50 마을 쪽 톨게이트 통과.'},
    {id:5,pos:[40,-15.5],t:'매매 계약 초안',d:'부동산 사무실 책상. 펜션 땅 매매 계약 초안, 매도인 서명 칸은 비어 있고 「연락처: 사위 측」.'},
    {id:6,pos:[25,-25.5],t:'보험사 우편',d:'창고 화재 보험 보장액을 2주 전 세 배로 올렸다는 안내. 신청인 하윤정.'},
    {id:7,pos:[-30,-30.9],t:'펜션 앞 재떨이',d:'일꾼이 피운 꽁초는 전부 펜션 앞 재떨이에. 창고 안에서는 피우지 않았다.'},
    {id:8,photo:true,t:'등유통을 묻는 조현우',d:'새벽, 탄 창고 뒤 눈 속에 빨간 등유통을 묻는 조현우. 「서울에 있었다」던 사람이다.'},
  ],
  npcs: [
    {id:'jo',look:{coat:0x55606e,hair:0x1a1a1a,pants:0x2b2f3a},name:'조현우',job:'펜션 사장 사위',pos:[-13,-20],color:0x55606e,culprit:true,
      talk:['저는 그날 서울에 있었어요. 아침에 전화 받고 바로 내려온 거예요.','장인어른이 고집만 안 부리셨어도… 아, 아닙니다. 일꾼분 괜찮으시대요?'],
      after:{3:'블랙박스요? 그건 원래 자주 꺼져요. 오래된 거라.',4:'하이패스는… 집사람이 차를 썼나 보죠.'}},
    {id:'gwak',look:{coat:0x8a6a3a,hair:0x777777,hat:{type:'beanie',c:0x4a4a4a},pants:0x4a4038},name:'곽두식',job:'펜션 일꾼',pos:[-33,-22],color:0x8a6a3a,
      talk:['자다가 연기에 깼어. 문을 밀었는데 안 열려. 창문 깨고 나왔지.','담배? 창고 안에선 안 펴. 장작 있는 데서 누가 펴.'],
      after:{2:'자물쇠? 그 문엔 바깥 자물쇠가 없었어. 누가 걸었다는 거야, 나 자는데?'}},
    {id:'tak',look:{coat:0x6d4c2e,hair:0x555555,hat:{type:'cap',c:0x8b6b4a},apron:0x9a8060},name:'탁영길',job:'옆집 목수',pos:[-33,-7],color:0x6d4c2e,
      talk:['사장이랑 경계 문제로 소송 중인 건 맞소. 그렇다고 불을 지르겠소?','새벽 두 시쯤 차 한 대가 불 끄고 펜션 쪽으로 들어가는 소리는 들었지.']},
    {id:'min',look:{coat:0xa0465a,hair:0x3a2418,hairStyle:'long',scarf:0xf2e2c8},name:'민세라',job:'부동산 중개인',pos:[36,-13],color:0xa0465a,
      talk:['그 땅 사겠다는 사람은 줄 섰어요. 사장님만 팔면 되는데.','불이요? 저야 손해죠. 매물 값 떨어지잖아요.'],
      after:{5:'…그 초안은 사위분이 먼저 연락하셨어요. 사장님 몰래요.'}},
    {id:'ha',look:{coat:0xc49a6c,hair:0x2a1a14,hairStyle:'bob',scarf:0x8a3a3a},name:'하윤정',job:'사장 딸 · 사위 아내',pos:[-24,-28],color:0xc49a6c,
      talk:['아빠 펜션에 불이라니… 일꾼 아저씨 다친 거 생각하면 손이 떨려요.','남편은 그날 서울이었어요. 저도 같이 있었고요… 잠들기 전까진.'],
      after:{6:'보험 서류는 남편이 「요즘 불이 잦다」면서 내라고 해서 낸 거예요.',4:'차요? 저는 그날 차를 안 썼어요.'}},
  ],
  buildings: [
    {n:'탄 창고',x:-40,z:-30,c:0x2a2522,burnt:true},
    {n:'부동산',x:40,z:-20,c:0xc7b9a0,w:7},
    {n:'목수 공방',x:-42,z:-8,c:0x8b6b4a,w:7},
  ],
  props({THREE, scene, car}) {
    car(-17.9,-24,0xaab0b8);                       // 사위 차(은색)
    car(-25,-22,0x7d5aa6,true);                    // 펜션 SUV
    const ring=new THREE.Mesh(new THREE.TorusGeometry(6,0.06,4,28),new THREE.MeshBasicMaterial({color:0xf2c230}));ring.rotation.x=Math.PI/2;ring.position.set(-40,0.8,-29);scene.add(ring);
    for(let i=0;i<8;i++){                            // 탄 널빤지
      const m=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.15,0.4),new THREE.MeshLambertMaterial({color:0x1b1715}));
      m.position.set(-43+Math.random()*6,0.1,-25.8+Math.random()*1.2);m.rotation.y=Math.random()*3;scene.add(m);
    }
    const ash=new THREE.Mesh(new THREE.CircleGeometry(5,24),new THREE.MeshBasicMaterial({color:0x6e6a66,transparent:true,opacity:.55}));
    ash.rotation.x=-Math.PI/2;ash.position.set(-40,0.03,-27);scene.add(ash);
    const ashtray=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.3,0.9,12),new THREE.MeshLambertMaterial({color:0x777}));ashtray.position.set(-30,0.45,-31.4);scene.add(ashtray);
  },
  ending: `<img src="${I}e1.jpg" alt="" onerror="this.remove()">
  <p>문 밖에 걸린 자물쇠, 밖에서 부은 등유. 「서울에 있었다」던 차는 01:50 톨게이트를 지났고, 블랙박스는 불이 난 시간에만 꺼져 있었다.</p>
  <p>매매 계약 초안의 「사위 측」 연락처, 2주 전 세 배로 오른 보험. 코인으로 날린 3억이 그 밑에 있었다.</p>
  <img src="${I}e2.jpg" alt="" onerror="this.remove()">
  <p>조현우: 「일꾼은 깨서 나올 줄 알았어요. 자물쇠요? 바람에 걸렸겠죠.」</p>
  <p>하윤정은 그 말을 듣고 반지를 빼 탁자에 올려놓았다.</p>
  <img src="${I}e3.jpg" alt="" onerror="this.remove()">
  <p>다음 주, 펜션 사장은 탄 자리에 새 창고를 올렸다. 땅은 팔지 않았다.</p>`,
  next: '<a href="?case=3">다음 사건 「잔치 국솥」 열기 →</a>',
};
