// 추리마을 1번 사건 — 눈길 뺑소니 (줄거리 case1-plan.md)
const I = 'img/';   // 1번 사건 그림은 img/ 바로 아래(옛 경로 그대로)
export default {
  id: 1, key: 'village-c1', img: I,
  title: '눈길 뺑소니',
  intro: `<p>이장 선거 사흘 전 밤 9시 40분, 언덕길에서 우체부 기태호 씨가 차에 치여 쓰러졌습니다. 목숨은 건졌지만 아직 의식이 없어요.</p>
  <p>가방에서 <b>등기 우편 한 통</b>만 사라졌습니다.</p>`,
  hanHint: '차는 도망쳤어도 눈은 다 기억해요. 언덕길 현장부터 걸어 봐요.',
  accuseQ: '누가 그날 밤 차를 몰았을까요?',
  startTime: 22*60, period: 40,                       // 마을 시계 22:00 부터, 40분마다 같은 하루가 되풀이
  moment: {from:16, to:22, clue:8, hint:'남궁석이 약국 뒤 드럼통에 뭔가를 넣고 있어요 — 📷 으로 찍어 두세요'},
  routes: {
    nam:[{t:0,p:[21,5]},{t:6,p:[21,5]},{t:9,p:[18,-2]},{t:13,p:[18,-14]},{t:16,p:[25,-14]},{t:22,p:[25,-14]},{t:25,p:[18,-14]},{t:29,p:[18,-2]},{t:32,p:[21,5]}],
    oh:[{t:0,p:[22,27]},{t:20,p:[22,27]},{t:24,p:[10,27]},{t:30,p:[10,27]},{t:34,p:[22,27]}],
    pyo:[{t:0,p:[-22,27]},{t:10,p:[-22,27]},{t:14,p:[-12,27]},{t:22,p:[-12,27]},{t:26,p:[-22,27]}],
    seo:[{t:0,p:[-21,5]},{t:14,p:[-21,5]},{t:20,p:[-8,4]},{t:28,p:[-8,4]},{t:34,p:[-21,5]}],
    maeng:[{t:0,p:[-28,-25]},{t:18,p:[-28,-25]},{t:22,p:[-23,-27]},{t:30,p:[-23,-27]},{t:34,p:[-28,-25]}],
  },
  clues: [
    {id:1,pos:[0,-27],snow:20,t:'눈 위 바퀴 자국',d:'체인 없는 겨울 타이어, 폭이 좁다 — 소형차. 체인 감은 택시나 큰 SUV 자국이 아니다.'},
    {id:2,pos:[5,-33],t:'깨진 전조등 조각',d:'눈더미 속 플라스틱 조각. 안쪽에 초록 십자가 스티커가 반쯤 붙어 있다.'},
    {id:3,pos:[33,9],t:'약국 차 앞 범퍼',d:'새로 감은 은색 테이프. 차 아래 눈이 녹아 있다 — 방금까지 엔진이 돌았다.'},
    {id:4,pos:[25,-4.5],t:'약국 정산 영수증',d:'영수증엔 21:45 정산. 그런데 카드 단말기 기록은 22:20 에 처음 켜졌다.'},
    {id:5,pos:[-25,-4.5],t:'술집 「곰방」 영수증',d:'남궁석 소주 두 병 21:28. 사장: 「나가면서 차 키를 찾던데요.」'},
    {id:6,pos:[25,-25.5],t:'등기 접수 기록',d:'받는 곳 선거관리위원회, 보낸 이 익명. 내용물 칸: 「약국 거래 장부 사본」.'},
    {id:7,pos:[-20,-26],t:'펜션 SUV 지붕',d:'지붕에 눈이 10cm 그대로. 밤 9시 이후 이 차는 움직이지 않았다.'},
    {id:8,photo:true,t:'우편을 태우는 남궁석',d:'약국 뒤 드럼통에 누런 등기 봉투를 넣고 불을 붙이는 남궁석. 봉투 귀퉁이에 「선거관리위원회」.'},
  ],
  npcs: [
    {id:'nam',look:{coat:0x2b3a5a,gown:true,hair:0x1d1d22,glasses:true,sash:0xc9472f},name:'남궁석',job:'약국 약사 · 이장 후보',pos:[21,5],color:0x3f6e5a,culprit:true,
      talk:['그 시간엔 약국에서 정산하고 있었어요. 영수증도 있고요.','기태호 씨는 안됐지만… 선거 앞두고 이런 일로 엮이고 싶지 않네요.'],
      after:{4:'단말기 시각이요? 그건… 기계가 가끔 늦게 켜져요.',3:'범퍼 테이프는 지난주 주차하다 긁혀서 감은 거예요.'}},
    {id:'oh',look:{coat:0x2b3a5a,hair:0x9a9a9a,hat:{type:'cap',c:0x3a4a6a},pants:0x3a3a3a},name:'오덕만',job:'택시 기사',pos:[22,27],color:0xd8a531,
      talk:['그 길 매일 다니지. 근데 오늘은 9시부터 정류장에서 손님 기다렸어.','옆구리 흠집? 지난주 마트 주차장이야. 견적서 보여 줄까?'],
      after:{1:'내 차는 체인 감았잖아. 자국 보면 바로 알지.'}},
    {id:'pyo',look:{coat:0x9c3b3b,hair:0x2a1d18,hairStyle:'bun',apron:0x6b4a3a,hat:{type:'bandana',c:0xc9472f}},name:'표미란',job:'정육점 주인',pos:[-22,27],color:0x9c3b3b,
      talk:['기태호 씨랑 배달 문제로 싸운 건 맞아요. 그렇다고 사람을 쳐요?','9시 반부터 10시까지 냉동 트럭 짐 내렸어요. 송장에 시각 찍혀 있어요.']},
    {id:'seo',look:{coat:0x3aa0d8,hair:0x4a3020,goggles:true,pants:0x7a9ab8},name:'서하준',job:'스키 강사',pos:[-21,5],color:0x3a5f9c,
      talk:['술 마신 건 맞는데 차는 안 탔어요. 걸어서 집에 갔다고요.','제 발자국 보세요, 언덕 반대쪽이에요.'],
      after:{5:'남궁 약사님도 곰방에 계셨어요. 저보다 먼저 나가셨는데.'}},
    {id:'maeng',look:{coat:0x5a4a7a,hair:0xcfcfd4,hairStyle:'perm',pearls:true,sash:0xc9472f},name:'맹순자',job:'펜션 사장 · 이장 후보',pos:[-28,-25],color:0x7d5aa6,
      talk:['남궁 약사가 떨어지면 나야 좋지. 근데 난 오늘 펜션 밖에 안 나갔어.','차? 마당에 있어. 가서 보든가.']},
  ],
  buildings: [],
  props({THREE, scene, car}) {
    car(32,4,0x3f6e5a);
    const tape=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.3,0.1),new THREE.MeshLambertMaterial({color:0xd0d4da}));tape.position.set(32,0.8,6.35);scene.add(tape);
    car(-20,-22,0x7d5aa6,true);
    const snowTop=new THREE.Mesh(new THREE.BoxGeometry(2.3,0.35,2.6),new THREE.MeshLambertMaterial({color:0xffffff}));snowTop.position.set(-20,2.7,-22.2);scene.add(snowTop);
    car(28,30,0xe0b531);
    const drum=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,1.1,14),new THREE.MeshLambertMaterial({color:0x5a4a3a}));drum.position.set(25,0.55,-15.6);scene.add(drum);
    const fire=new THREE.PointLight(0xff8a3a,8,6);fire.position.set(25,1.6,-15.6);scene.add(fire);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(4,0.06,4,24),new THREE.MeshBasicMaterial({color:0xf2c230}));ring.rotation.x=Math.PI/2;ring.position.set(2,0.8,-30);scene.add(ring);
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(0.35,0.9),new THREE.MeshBasicMaterial({color:0x8d96a6}));m.rotation.x=-Math.PI/2;m.position.set(-0.6+(i%2)*1.2,0.02,-22-i*1.3);scene.add(m);}
  },
  ending: `<img src="${I}e1.jpg" alt="">
  <p>초록 십자가 전조등 조각, 방금 감은 범퍼 테이프, 22시 20분에야 켜진 단말기. 그리고 곰방에서 찾던 차 키.</p>
  <p>등기 우편 속 「약국 거래 장부」 — 선관위로 가던 리베이트 장부였다.</p>
  <img src="${I}e2.jpg" alt="">
  <p>남궁석: 「길만 막으려 했어요. 쓰러질 줄은… 선거만 끝나면 다 덮였을 텐데.」</p>
  <p>그는 끝까지 기태호 씨 안부를 묻지 않았다.</p>
  <img src="${I}e4.jpg" alt="">
  <p>다음 날 아침, 병원에서 기태호 씨가 눈을 떴다.</p>`,
  next: '<a href="?case=2">다음 사건 「창고 방화」 열기 →</a>',
};
