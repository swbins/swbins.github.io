// 추리마을 3번 사건 — 잔치 국솥 (줄거리 case3-plan.md)
const I = 'img/c3/';
export default {
  id: 3, key: 'village-c3', img: I,
  title: '잔치 국솥',
  intro: `<p>동지 잔치 저녁. 국밥집 「온새미」가 끓인 국을 먹은 마을 사람 열 명이 배를 움켜쥐고 쓰러졌습니다. 보건소는 「설사약 성분」이래요.</p>
  <p>잔치는 멈췄지만 <b>팥죽 솥은 아직 끓고 있어요.</b> 누가 또 솥에 다가가는지 지켜보세요.</p>`,
  hanHint: '솥은 혼자 약을 먹지 않아요. 누가 솥 근처를 오가는지 — 그리고 누가 「먹었다」면서 멀쩡한지 봐요.',
  accuseQ: '누가 잔치 솥에 약을 넣었을까요?',
  startTime: 17*60+50, period: 40,                    // 마을 시계 17:50 부터
  moment: {from:22, to:27, clue:8, hint:'구태성이 팥죽 솥 쪽으로 슬쩍 다가가요 — 📷 으로 찍어 두세요'},
  clues: [
    {id:1,pos:[10,-14],t:'국자 걸이의 하얀 가루',d:'국솥 옆 국자 걸이에 하얀 가루가 묻어 있다. 손톱으로 긁으니 알약을 빻은 듯 거칠다.'},
    {id:2,pos:[15.5,-12.5],t:'관광객의 사진',d:'리안이 18:12 에 찍은 사진 — 솥 뒤로 지나가는 갈색 앞치마, 가슴에 「대박」 글자가 반쯤.'},
    {id:3,pos:[25,-3.3],t:'약국 판매 기록',d:'오늘 오후 설사약 30알 판매. 카드 이름 구태성. 「가게 직원들 상비약」이라고 했다고.'},
    {id:4,pos:[-15.7,-24],t:'갈비집 쓰레기통',d:'대박갈비 옆 쓰레기통 — 고기 포장지 밑에 빈 알약 껍데기 30개.'},
    {id:5,pos:[-10,-19.4],t:'경매 공고와 위임장',d:'갈비집 계산대 서랍 — 국밥집 건물 경매 공고, 그리고 구태성이 써 준 경매 대리인 위임장.'},
    {id:6,pos:[40,5.2],t:'보건소 진료 기록',d:'쓰러진 열 명 중 구태성만 증상이 가장 늦게(두 시간 뒤)·가장 가볍게. 「한 숟갈만 먹었다」고.'},
    {id:7,pos:[-3,-18],snow:22,t:'눈 위 발자국',d:'대박갈비 뒷문에서 잔치 천막 뒤쪽으로 곧장 이어진 발자국. 앞치마 끈이 끌린 자국도 같이 있다.'},
    {id:8,photo:true,t:'팥죽 솥 앞의 구태성',d:'18:12, 천막 뒤에서 팥죽 솥에 하얀 봉투를 털어 넣는 구태성. 갈색 앞치마의 「대박갈비」 글자가 또렷하다.'},
  ],
  npcs: [
    {id:'gu',look:{coat:0x6b4a3a,apron:0x8a5a2a,hair:0x222222,pants:0x2b2f3a},name:'구태성',job:'맞은편 「대박갈비」 사장',pos:[-7,-17],color:0x6b4a3a,culprit:true,
      talk:['저도 그 국 먹고 배탈 났어요. 피해자라고요, 저도.','온새미 할머니 솥 관리가 원래 엉망이었죠. 위생 점검 한번 받아야 해요.'],
      after:{6:'한 숟갈… 아니, 체질이 다르니까요. 전 원래 장이 튼튼해요.',3:'설사약은 직원들 상비약이에요. 고깃집은 배탈 손님이 많거든요.'}},
    {id:'yeom',look:{coat:0xe8e2d0,apron:0x3a5a7a,hair:0x3a2418,hairStyle:'bun'},name:'염보람',job:'국밥집 알바',pos:[12,-15],color:0xe8e2d0,
      talk:['솥은 제가 지켰어요. 근데 손님이 몰려서 계속 붙어 있진 못했어요.','월급 깎인 건 맞는데… 그렇다고 할머니 가게를 망쳐요? 여기 없으면 저도 일자리 없어요.']},
    {id:'jang',look:{coat:0x7a2a2a,hair:0x555555,hat:{type:'cap',c:0x333333},apron:0xf0f0f0},name:'장필수',job:'정육 납품업자',pos:[-18,-12],color:0x7a2a2a,
      talk:['고기 상태로 할머니랑 다툰 건 맞소. 근데 쓰러진 사람 중엔 팥죽만 먹은 사람도 있다던데?','난 고기만 넣었지 솥은 구경도 안 했어.'],
      after:{1:'국자 걸이 가루? 그건 내 물건이 아니야. 난 맨손으로 고기만 날랐어.'}},
    {id:'cheon',look:{coat:0x8a4a8a,hair:0xd0d0d0,hairStyle:'perm',scarf:0xf0c040},name:'천옥희',job:'부녀회장',pos:[6,-11],color:0x8a4a8a,
      talk:['잔치 준비하느라 솥 근처를 열 번은 오갔지. 근데 그게 다 내 일이야.','갈비집 사장? 처음엔 잔치 반대하더니 오늘은 웬일로 와서 국까지 먹더라고.'],
      after:{7:'그 발자국… 갈비집 뒷문 쪽이네. 그 집 사람 말고는 그쪽으로 안 다녀.'}},
    {id:'lian',look:{coat:0x3a7a5a,hair:0xc9a050,scarf:0xf2f2f2,camera:true},name:'리안',job:'관광객',pos:[15,-12],color:0x3a7a5a,
      talk:['저는 그냥 사진 찍으러 왔어요. 한국 시골 잔치 처음 봐요!','솥 옆에서 많이 찍었어요. 보여 드릴까요?'],
      after:{2:'그 앞치마… 맞아요, 그 사람이 솥 뒤로 지나갔어요. 저한테 사진 찍지 말라고 손짓했어요.'}},
  ],
  routes: {
    gu:[{t:0,p:[-7,-17]},{t:12,p:[-7,-17]},{t:16,p:[3,-18.5]},{t:20,p:[8.5,-18.5]},{t:22,p:[12.5,-19]},{t:27,p:[12.5,-19]},{t:30,p:[3,-18.5]},{t:34,p:[-7,-17]}],
    yeom:[{t:0,p:[12,-14.5]},{t:14,p:[12,-14.5]},{t:17,p:[8,-19.3]},{t:26,p:[8,-19.3]},{t:29,p:[12,-14.5]}],
    jang:[{t:0,p:[-18,-12]},{t:8,p:[-18,-12]},{t:14,p:[-3,-12]},{t:24,p:[-3,-12]},{t:30,p:[-18,-12]}],
    cheon:[{t:0,p:[6,-11]},{t:6,p:[16,-11]},{t:14,p:[16,-20]},{t:20,p:[6,-20]},{t:28,p:[6,-11]}],
    lian:[{t:0,p:[15,-12]},{t:10,p:[15,-12]},{t:15,p:[4,-6]},{t:25,p:[4,-6]},{t:30,p:[15,-12]}],
  },
  buildings: [
    {n:'국밥집 온새미',x:8,z:-24,c:0xd8b48a},
    {n:'대박갈비',x:-10,z:-24,c:0x9a3a2a},
    {n:'보건소',x:40,z:10,c:0xe8eef2},
  ],
  props({THREE, scene, car, solids}) {
    const L = c => new THREE.MeshLambertMaterial({color: c});
    // 잔치 천막(붉은·흰 줄) + 기둥
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 6.4), L(i % 2 ? 0xf4ecdc : 0xc9472f));
      s.position.set(6.85 + i * 2.1, 3.4, -16); scene.add(s);
    }
    for (const [x, z] of [[6, -13], [14, -13], [6, -19], [14, -19]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4), L(0x555555)); p.position.set(x, 1.7, z); scene.add(p);
    }
    // 국솥·팥죽 솥(김 나는 불빛)
    for (const [x, z, c] of [[10, -16, 0x222222], [12.5, -17.5, 0x2a2a2a]]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 0.9, 18), L(c)); pot.position.set(x, 0.85, z); pot.castShadow = true; scene.add(pot);
      const fire = new THREE.PointLight(0xff8a3a, 6, 4); fire.position.set(x, 0.3, z); scene.add(fire);
      const soup = new THREE.Mesh(new THREE.CircleGeometry(0.82, 18), new THREE.MeshBasicMaterial({color: x > 11 ? 0x8a3a3a : 0xe8d8b0}));
      soup.rotation.x = -Math.PI / 2; soup.position.set(x, 1.28, z); scene.add(soup);
      solids.push([x - 1.1, x + 1.1, z - 1.1, z + 1.1]);
    }
    // 긴 상
    for (const z of [-12.5, -19.8]) { const t = new THREE.Mesh(new THREE.BoxGeometry(5, 0.7, 1), L(0x8a6a4a)); t.position.set(10, 0.35, z); scene.add(t); }
    car(-18, -15, 0xf0f0f0, true);                     // 정육 납품 트럭
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 1.1, 12), L(0x3a5a3a)); bin.position.set(-15.9, 0.55, -25.5); scene.add(bin);
  },
  ending: `<img src="${I}e1.jpg" alt="" onerror="this.remove()">
  <p>국자 걸이의 가루, 약국 카드 기록, 쓰레기통의 알약 껍데기 30개. 그리고 「한 숟갈만」 먹어 가장 늦게, 가장 가볍게 앓은 사람.</p>
  <p>갈비집 서랍의 경매 위임장 — 온새미가 망하면 그 건물이 싸게 넘어올 참이었다.</p>
  <img src="${I}e2.jpg" alt="" onerror="this.remove()">
  <p>구태성: 「장사는 원래 뺏고 뺏기는 거예요. 몇 사람 배탈 난 거 가지고 뭘 그래요.」</p>
  <p>쓰러졌던 열 명 중엔 여든 넘은 노인도 둘 있었다.</p>
  <img src="${I}e3.jpg" alt="" onerror="this.remove()">
  <p>일주일 뒤, 온새미가 다시 문을 열었다. 첫 손님은 잔치 날 쓰러졌던 사람들이었다.</p>`,
  next: '<a href="?case=4">다음 사건 「가로등이 꺼지는 밤」 열기 →</a>',
};
