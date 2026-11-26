// 귀여운 3D 인물 — 모델 파일 없이 도형으로 조립(큰 머리·짧은 몸·팔다리), 걷기·숨쉬기·손 흔들기·쪼그려 앉기·끄덕이기
import * as THREE from 'three';

const M = c => { const col = new THREE.Color(c); return new THREE.MeshLambertMaterial({color: col, emissive: col.clone().multiplyScalar(0.18)}); };  // 밤에도 색이 죽지 않게
const SKIN = 0xf3d8bf, BLACK = new THREE.MeshBasicMaterial({color: 0x1b1714});

function mesh(geo, mat, x, y, z, parent) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}

// look: {coat, hair, skin, pants, hairStyle:'short'|'bob'|'bun'|'perm'|'long', glasses, scarf, hat:{type:'cap'|'beanie'|'bandana', c}, apron, sash, goggles, gown, camera, pearls}
export function makeChibi(look = {}) {
  const g = new THREE.Group();
  const root = new THREE.Group(); g.add(root);              // 통통 튈 때 움직이는 몸 전체
  const coat = M(look.coat ?? 0x55606e), pants = M(look.pants ?? 0x2b2f3a), skin = new THREE.MeshLambertMaterial({color: look.skin ?? SKIN, emissive: 0x5a4030}), hair = M(look.hair ?? 0x2a2018);

  // 다리(엉덩이에서 돌아감)
  const legs = [-0.17, 0.17].map(x => {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.52, 0); root.add(pivot);
    mesh(new THREE.CapsuleGeometry(0.12, 0.26, 4, 8), pants, 0, -0.24, 0, pivot);
    mesh(new THREE.SphereGeometry(0.14, 10, 8), M(0x3a2a22), 0, -0.46, 0.05, pivot).scale.set(1, 0.7, 1.35);
    return pivot;
  });
  // 몸통(아래가 넓은 외투)
  const body = mesh(new THREE.CylinderGeometry(0.3, 0.46, 0.72, 16), coat, 0, 0.86, 0, root);
  if (look.gown) mesh(new THREE.CylinderGeometry(0.31, 0.47, 0.6, 16, 1, true, -0.9, 1.8), M(0xf4f4f0), 0, 0.84, 0.005, root);
  if (look.apron) mesh(new THREE.CylinderGeometry(0.315, 0.475, 0.62, 16, 1, true, -0.7, 1.4), M(look.apron), 0, 0.83, 0.006, root);
  if (look.sash) { const s = mesh(new THREE.BoxGeometry(0.12, 0.95, 0.06), M(look.sash), 0, 0.9, 0.36, root); s.rotation.z = 0.7; }
  // 팔(어깨에서 돌아감)
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.36, 1.12, 0); root.add(pivot);
    mesh(new THREE.CapsuleGeometry(0.1, 0.32, 4, 8), coat, side * 0.04, -0.22, 0, pivot);
    mesh(new THREE.SphereGeometry(0.1, 10, 8), skin, side * 0.05, -0.45, 0, pivot);
    pivot.rotation.z = side * 0.18;
    return pivot;
  });
  // 머리(크게)
  const head = new THREE.Group(); head.position.set(0, 1.62, 0); root.add(head);
  mesh(new THREE.SphereGeometry(0.5, 20, 16), skin, 0, 0, 0, head);
  for (const x of [-0.17, 0.17]) {
    mesh(new THREE.SphereGeometry(0.065, 10, 8), BLACK, x, 0.02, 0.46, head);
    const bl = mesh(new THREE.CircleGeometry(0.08, 12), new THREE.MeshBasicMaterial({color: 0xf2a0a0, transparent: true, opacity: .6}), x * 1.45, -0.12, 0.445, head);
    bl.rotation.y = x > 0 ? 0.45 : -0.45;
  }
  // 머리카락
  const st = look.hairStyle || 'short';
  mesh(new THREE.SphereGeometry(0.53, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.36), hair, 0, 0.04, -0.02, head);  // 윗머리(이마는 보이게)
  mesh(new THREE.SphereGeometry(0.52, 18, 12, Math.PI * 1.15, Math.PI * 0.7, 0, Math.PI * 0.72), hair, 0, 0, -0.03, head);   // 뒷머리(-z 쪽)
  if (st === 'bob' || st === 'long') {
    for (const x of [-1, 1]) mesh(new THREE.CapsuleGeometry(0.13, st === 'long' ? 0.55 : 0.28, 4, 8), hair, x * 0.43, st === 'long' ? -0.3 : -0.15, -0.05, head);
  }
  if (st === 'bun') mesh(new THREE.SphereGeometry(0.2, 12, 10), hair, 0, 0.42, -0.32, head);
  if (st === 'perm') for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; mesh(new THREE.SphereGeometry(0.16, 10, 8), hair, Math.cos(a) * 0.42, 0.22 + Math.sin(i) * 0.05, Math.sin(a) * 0.42 - 0.05, head); }
  if (look.glasses) for (const x of [-0.17, 0.17]) mesh(new THREE.TorusGeometry(0.11, 0.022, 6, 16), BLACK, x, 0.02, 0.49, head);
  if (look.goggles) { const gg = mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 20, Math.PI), M(0x2b2b2b), 0, 0.22, 0, head); gg.rotation.y = Math.PI / 2; gg.rotation.z = Math.PI / 2; mesh(new THREE.BoxGeometry(0.5, 0.14, 0.08), M(0xf2a531), 0, 0.3, 0.44, head); }
  if (look.hat) {
    const hc = M(look.hat.c ?? 0x333333);
    if (look.hat.type === 'cap') { mesh(new THREE.SphereGeometry(0.54, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), hc, 0, 0.08, 0, head); const b = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16, 1, false, -Math.PI / 2, Math.PI), hc, 0, 0.26, 0.36, head); b.rotation.x = 0.15; }
    if (look.hat.type === 'beanie') { mesh(new THREE.SphereGeometry(0.55, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), hc, 0, 0.08, 0, head); mesh(new THREE.SphereGeometry(0.11, 10, 8), hc, 0, 0.62, 0, head); }
    if (look.hat.type === 'bandana') mesh(new THREE.SphereGeometry(0.545, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.36), hc, 0, 0.06, 0, head);
  }
  if (look.scarf) mesh(new THREE.TorusGeometry(0.27, 0.09, 8, 18), M(look.scarf), 0, 1.2, 0, root).rotation.x = Math.PI / 2;
  if (look.pearls) mesh(new THREE.TorusGeometry(0.26, 0.035, 6, 18), M(0xf5f0e6), 0, 1.18, 0.02, root).rotation.x = Math.PI / 2.3;
  if (look.camera) { mesh(new THREE.BoxGeometry(0.3, 0.2, 0.14), M(0x222222), 0.08, 0.95, 0.42, root); mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10), M(0x555555), 0.08, 0.95, 0.52, root).rotation.x = Math.PI / 2; }

  g.userData = {root, head, body, legs, arms, ph: Math.random() * 6, act: null, actT: 0};
  return g;
}

// 매 프레임: state = {walk, talk}. 동작(act)은 doAct 로 시작.
export function animateChibi(g, t, dt, state) {
  const u = g.userData; if (!u.root) return;
  const [lL, lR] = u.legs, [aL, aR] = u.arms;
  if (u.act) { u.actT += dt; }
  if (state.walk) {
    const w = t * 12 + u.ph, s = Math.sin(w);
    lL.rotation.x = s * 0.7; lR.rotation.x = -s * 0.7;
    aL.rotation.x = -s * 0.8; aR.rotation.x = s * 0.8;
    u.root.position.y = Math.abs(Math.cos(w)) * 0.09; u.root.rotation.z = s * 0.04;
    u.head.rotation.z = 0; u.head.rotation.x = 0;
    u.act = null;
  } else {
    const b = Math.sin(t * 2.2 + u.ph);
    for (const p of [lL, lR, aL, aR]) p.rotation.x *= 0.8;
    u.root.position.y *= 0.8; u.root.rotation.z *= 0.8;
    u.body.scale.set(1 + b * 0.012, 1 - b * 0.01, 1 + b * 0.012);
    u.head.rotation.x = state.talk ? Math.sin(t * 8) * 0.12 : u.head.rotation.x * 0.9;
    u.head.rotation.z = state.talk ? 0 : Math.sin(t * 0.9 + u.ph) * 0.05;
  }
  // 동작
  const T = u.actT;
  if (u.act === 'wave') {
    aR.rotation.z = 2.6; aR.rotation.x = 0;
    aR.rotation.y = Math.sin(T * 14) * 0.5;
    if (T > 1.6) { u.act = null; aR.rotation.set(0, 0, 0.18); }
  } else if (u.act === 'crouch') {
    const k = T < 0.5 ? T / 0.5 : T < 0.9 ? 1 : Math.max(0, 1 - (T - 0.9) / 0.3);
    u.root.position.y = -0.28 * k; lL.rotation.x = lR.rotation.x = -1.0 * k; aL.rotation.x = aR.rotation.x = -1.2 * k;
    if (T > 1.2) u.act = null;
  } else if (u.act === 'throw') {
    aR.rotation.x = T < 0.2 ? -2.8 * (T / 0.2) : -2.8 + (T - 0.2) * 14;
    if (T > 0.45) { u.act = null; aR.rotation.x = 0; }
  } else if (u.act === 'cheer') {
    aL.rotation.z = -2.4; aR.rotation.z = 2.4; u.root.position.y = Math.abs(Math.sin(T * 10)) * 0.25;
    if (T > 1.2) { u.act = null; aL.rotation.z = -0.18; aR.rotation.z = 0.18; }
  } else if (u.act === 'stretch') {        // 기지개 — 두 팔 쭉, 몸 늘이기, 좌우로 꺾기
    const k = T < 0.4 ? T / 0.4 : T < 1.8 ? 1 : Math.max(0, 1 - (T - 1.8) / 0.3);
    aL.rotation.z = -0.18 - 2.8 * k; aR.rotation.z = 0.18 + 2.8 * k;
    u.root.scale.y = 1 + 0.08 * k; u.root.rotation.z = Math.sin(T * 3) * 0.12 * k;
    if (T > 2.1) { u.act = null; u.root.scale.y = 1; aL.rotation.z = -0.18; aR.rotation.z = 0.18; }
  } else if (u.act === 'sip') {            // 커피 — 오른손 올려 홀짝 두 번
    const k = T < 0.3 ? T / 0.3 : T < 1.9 ? 1 : Math.max(0, 1 - (T - 1.9) / 0.3);
    aR.rotation.x = -1.9 * k + Math.sin(T * 6) * 0.15 * k; aR.rotation.z = 0.18 - 0.5 * k;
    u.head.rotation.x = -0.15 * k;
    if (T > 2.2) { u.act = null; aR.rotation.set(0, 0, 0.18); }
  }
}
export function doAct(g, name) { g.userData.act = name; g.userData.actT = 0; }

// 고양이 조수 — 동글한 몸·귀·꼬리, 걷기·앉기·골골(통통)
export function makeCat(color = 0xc98a4b) {
  const g = new THREE.Group(), root = new THREE.Group(); g.add(root);
  const fur = M(color), dark = M(0x6b4424), pink = new THREE.MeshLambertMaterial({color: 0xf2a0a0, emissive: 0x402020});
  const body = mesh(new THREE.SphereGeometry(0.32, 16, 12), fur, 0, 0.34, 0, root); body.scale.set(0.9, 0.8, 1.25);
  const head = new THREE.Group(); head.position.set(0, 0.62, 0.32); root.add(head);
  mesh(new THREE.SphereGeometry(0.25, 16, 12), fur, 0, 0, 0, head);
  for (const x of [-1, 1]) {
    const e = mesh(new THREE.ConeGeometry(0.09, 0.18, 4), fur, x * 0.14, 0.22, 0, head); e.rotation.z = -x * 0.3;
    mesh(new THREE.SphereGeometry(0.035, 8, 6), BLACK, x * 0.09, 0.03, 0.22, head);
  }
  mesh(new THREE.SphereGeometry(0.03, 8, 6), pink, 0, -0.04, 0.245, head);
  for (const x of [-0.14, 0.14]) for (const z of [-0.18, 0.2]) mesh(new THREE.CapsuleGeometry(0.06, 0.12, 4, 6), x < 0 && z < 0 ? dark : fur, x, 0.1, z, root);
  const tail = new THREE.Group(); tail.position.set(0, 0.4, -0.36); root.add(tail);
  mesh(new THREE.CapsuleGeometry(0.05, 0.4, 4, 6), dark, 0, 0.2, -0.05, tail).rotation.x = -0.5;
  g.userData = {root, head, tail, body, ph: Math.random() * 6, sit: 0, purr: 0};
  return g;
}
export function animateCat(g, t, dt, walk) {
  const u = g.userData;
  u.tail.rotation.z = Math.sin(t * (walk ? 10 : 3)) * 0.5;
  u.root.position.y = walk ? Math.abs(Math.sin(t * 14)) * 0.06 : 0;
  u.sit += ((walk ? 0 : 1) - u.sit) * 0.1; u.root.rotation.x = -u.sit * 0.35;
  if (u.purr > 0) { u.purr -= dt; u.root.position.y = Math.abs(Math.sin(u.purr * 18)) * 0.12; u.head.rotation.z = Math.sin(u.purr * 9) * 0.25; }
  else u.head.rotation.z *= 0.9;
}
