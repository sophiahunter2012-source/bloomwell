// Bloomwell 3D stage: the logo heart (with its orange + leaf) and a drift of
// sugar-coated gummy hearts. Everything is driven by a plain `state` object
// that main.js tweens with GSAP as the visitor scrolls.
import * as THREE from 'three';
import { RoomEnvironment } from './RoomEnvironment.js';
import { mergeVertices } from './BufferGeometryUtils.js';

function heartShape(scaleY = 1) {
  // Same silhouette as the logo mark (SVG viewBox units), with a softly
  // rounded tip so the bevel stays clean. Converted to ~2 units wide, y-up.
  const P = (x, y) => [(x - 50) / 44, ((60 - y) / 44) * scaleY];
  const s = new THREE.Shape();
  const m = (x, y) => s.moveTo(...P(x, y));
  const c = (a, b, d, e, f, g) => s.bezierCurveTo(...P(a, b), ...P(d, e), ...P(f, g));
  const q = (a, b, d, e) => s.quadraticCurveTo(...P(a, b), ...P(d, e));
  m(50, 37);
  c(55, 28.5, 62, 23, 71, 23);
  c(84, 23, 94, 33, 94, 48);
  c(94, 70, 78, 86, 54, 104.5);
  q(50, 107.5, 46, 104.5);
  c(22, 86, 6, 70, 6, 48);
  c(6, 33, 16, 23, 29, 23);
  c(38, 23, 45, 28.5, 50, 37);
  return s;
}

function smooth(geo) {
  // Extrude output is flat-shaded; weld + recompute for a soft, moulded look.
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const g = mergeVertices(geo, 1e-4);
  g.computeVertexNormals();
  return g;
}

function leafShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.05, 0.42, 0.38, 0.62, 0.72, 0.64);
  s.bezierCurveTo(0.7, 0.3, 0.42, 0.02, 0, 0);
  return s;
}

// One full breath, shared with the on-page breathing guide (fx.js)
export const BREATH = 5.5;

export function createScene(canvas, { lowPower = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: lowPower ? 'default' : 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xd9c8b4, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd6b8, 1.1);
  rim.position.set(-6, 2, -4);
  scene.add(rim);

  // ---- Hero heart -------------------------------------------------------
  const heartGeo = smooth(new THREE.ExtrudeGeometry(heartShape(), {
    depth: 0.42, bevelEnabled: true, bevelThickness: 0.32, bevelSize: 0.26,
    bevelSegments: lowPower ? 6 : 14, curveSegments: lowPower ? 28 : 48, steps: 1,
  }));
  heartGeo.center();
  heartGeo.computeBoundingBox();
  const heartHeight = heartGeo.boundingBox.max.y - heartGeo.boundingBox.min.y;

  const heartMat = new THREE.MeshPhysicalMaterial({
    color: '#316B58', roughness: 0.38, metalness: 0,
    clearcoat: 0.7, clearcoatRoughness: 0.28, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff'),
  });
  const heart = new THREE.Mesh(heartGeo, heartMat);

  // Orange + leaf, as in the logo
  const fruit = new THREE.Group();
  const orange = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 48, 32),
    new THREE.MeshPhysicalMaterial({ color: '#F2A35E', roughness: 0.55, clearcoat: 0.35, sheen: 0.4, sheenColor: new THREE.Color('#ffe0c0') }),
  );
  const leafGeo = new THREE.ExtrudeGeometry(leafShape(), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 24 });
  const leaf = new THREE.Mesh(leafGeo, new THREE.MeshPhysicalMaterial({ color: '#7DB36B', roughness: 0.45, clearcoat: 0.5 }));
  leaf.position.set(0.08, 0.14, -0.02);
  leaf.scale.setScalar(0.6);
  leaf.rotation.z = 0.15;
  fruit.add(orange, leaf);
  fruit.position.set(0, heartHeight / 2 + 0.12, 0);

  const heartGroup = new THREE.Group();   // positioned by scroll
  const heartSpin = new THREE.Group();    // spun / tilted
  heartSpin.add(heart, fruit);
  heartGroup.add(heartSpin);
  scene.add(heartGroup);

  // ---- Gummy hearts -----------------------------------------------------
  const gummyGeo = smooth(new THREE.ExtrudeGeometry(heartShape(0.95), {
    depth: 0.35, bevelEnabled: true, bevelThickness: 0.38, bevelSize: 0.3,
    bevelSegments: lowPower ? 4 : 8, curveSegments: lowPower ? 12 : 20,
  }));
  gummyGeo.center();
  const gummyMat = new THREE.MeshPhysicalMaterial({
    roughness: 0.62, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.6,
    sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color('#ffffff'),
    transparent: true, opacity: 1,
  });
  const COUNT = lowPower ? 12 : 30;
  const gummies = new THREE.InstancedMesh(gummyGeo, gummyMat, COUNT);
  gummies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const palette = ['#F4B8A8', '#E58F73', '#C9DAB4', '#A9C98E', '#CFC1EE', '#B4D3DB', '#F6CB8E', '#F7D3DA'];
  const rand = (a, b) => a + Math.random() * (b - a);
  const seeds = [];
  for (let i = 0; i < COUNT; i++) {
    seeds.push({
      x: rand(-1, 1), y: rand(0, 1), z: rand(-6, 1),
      s: rand(0.16, 0.34), speed: rand(0.35, 1), phase: rand(0, Math.PI * 2),
      rx: rand(-1, 1), ry: rand(-1, 1), rz: rand(-1, 1),
    });
    gummies.setColorAt(i, new THREE.Color(palette[i % palette.length]));
  }
  scene.add(gummies);

  // ---- Ingredient orbs orbiting the heart (citrus, berry, greens) --------
  const ORBIT = lowPower ? 7 : 10;
  const orbitMat = new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color('#fff7e8') });
  const orbitRing = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), orbitMat, ORBIT);
  orbitRing.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const ingredients = ['#F2A35E', '#7DB36B', '#E2B54A', '#B5566A', '#A6C78B', '#E8937A'];
  for (let i = 0; i < ORBIT; i++) orbitRing.setColorAt(i, new THREE.Color(ingredients[i % ingredients.length]));
  heartGroup.add(orbitRing);   // follows the heart's position + size, not its spin

  // ---- Burst gummies (tap / click the heart) -----------------------------
  const BURST = lowPower ? 18 : 30;
  const leafBurstGeo = new THREE.ExtrudeGeometry(leafShape(), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 12 });
  leafBurstGeo.center();
  const greens = ['#7DB36B', '#A6C78B', '#5E8F6E', '#C9DAB4', '#8DB87A', '#F2A35E'];
  const burstMesh = new THREE.InstancedMesh(leafBurstGeo, new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide }), BURST);
  burstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  burstMesh.frustumCulled = false;
  const bursts = [];
  for (let i = 0; i < BURST; i++) {
    burstMesh.setColorAt(i, new THREE.Color(greens[i % greens.length]));
    bursts.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), s: 0.2 });
  }
  scene.add(burstMesh);

  // ---- Drifting botanical leaves -----------------------------------------
  const LEAVES = lowPower ? 12 : 26;
  const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.65, side: THREE.DoubleSide, transparent: true, opacity: 1 });
  const leafField = new THREE.InstancedMesh(leafBurstGeo, leafMat, LEAVES);
  leafField.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  leafField.frustumCulled = false;
  const leafSeeds = [];
  for (let i = 0; i < LEAVES; i++) {
    leafSeeds.push({ x: rand(-1, 1), y: rand(0, 1), z: rand(-7, 0.5), s: rand(0.35, 0.7), sp: rand(0.25, 0.7), ph: rand(0, 6.3), sw: rand(0.4, 1.2) });
    leafField.setColorAt(i, new THREE.Color(greens[i % 5]));
  }
  scene.add(leafField);

  // Jelly wobble spring + spin kick for tap reactions
  const jelly = { x: 0, v: 0, spin: 0, spinV: 0 };
  let lastT = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmpV = new THREE.Vector3();

  // ---- state (tweened from main.js) ------------------------------------
  const state = {
    x: 0.42, y: 0, z: 0,        // fraction of half-viewport
    scale: 1,                   // heart height as fraction of viewport height * 0.55
    tilt: 0,                    // extra x-rotation
    turn: 0,                    // extra y-rotation (radians)
    color: '#316B58',
    fruit: 1,                   // 0..1 orange + leaf visibility
    gummies: 1,                 // 0..1 gummy visibility
    scroll: 0,                  // 0..1 page progress
    intro: 0,                   // 0..1 entrance
    anchor: 0,                  // 0..1 blend toward anchorEl's on-screen box
    anchorEl: null,
    orbit: 1,                   // 0..1 ring of gummies circling the heart
    vel: 0,                     // -1..1 scroll velocity (set by main.js, decays here)
    sparkles: 1,                // 0..1 sparkle field visibility
  };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let spinBoost = 0;
  let hasPointer = false;
  const dummy = new THREE.Object3D();

  // The canvas is sized in CSS to the *large* viewport (100lvh), so the
  // phone's address bar sliding in and out doesn't resize WebGL mid-scroll.
  let vw = 1, vh = 1, lastW = 0, lastH = 0;
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    vw = vh * camera.aspect;
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    hasPointer = e.pointerType === 'mouse';
  }, { passive: true });

  // Did a tap/click land on the heart?
  function hitTest(clientX, clientY) {
    if (state.scale < 0.05 || state.intro < 0.5) return false;
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects([heart, orange], false).length > 0;
  }

  // Wobble the heart and throw a shower of gummies out of it
  function burst(strength = 1) {
    jelly.v += 9 * strength;
    jelly.spinV += (Math.random() < 0.5 ? -1 : 1) * 10 * strength;
    heartGroup.getWorldPosition(tmpV);
    for (let i = 0; i < BURST; i++) {
      const b = bursts[i];
      const a = Math.random() * Math.PI * 2;
      const up = rand(0.2, 1);
      const sp2 = rand(3, 7.5) * strength;
      b.p.copy(tmpV).add(new THREE.Vector3(rand(-0.3, 0.3), rand(-0.3, 0.3), 0));
      b.v.set(Math.cos(a) * sp2, up * sp2 * 0.9 + 2, Math.sin(a) * sp2 * 0.6 + 1.5);
      b.r.set(rand(0, 6), rand(0, 6), rand(0, 6));
      b.w.set(rand(-8, 8), rand(-8, 8), rand(-8, 8));
      b.s = rand(0.45, 0.8);
      b.life = rand(1.5, 2.1);
    }
  }

  function render(time) {
    const t = time / 1000;
    const dt = Math.min(Math.max(t - lastT, 0), 0.05);
    lastT = t;
    state.vel *= 0.9;
    // jelly spring (tap) — critically under-damped for a wobbly bounce
    jelly.v += (-140 * jelly.x - 9 * jelly.v) * dt;
    jelly.x += jelly.v * dt;
    jelly.spinV *= Math.pow(0.04, dt);
    jelly.spin += jelly.spinV * dt;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    // Heart placement
    const intro = state.intro;
    const ease = 1 - Math.pow(1 - intro, 3);
    let px = state.x, py = state.y, sc = state.scale;
    if (state.anchorEl && state.anchor > 0.001) {
      const r = state.anchorEl.getBoundingClientRect();
      const ax = ((r.left + r.width / 2) / lastW) * 2 - 1;
      const ay = -(((r.top + r.height / 2) / lastH) * 2 - 1);
      const as = r.height / (lastH * 0.55);
      const k = state.anchor;
      px += (ax - px) * k; py += (ay - py) * k; sc += (as - sc) * k;
    }
    const size = (vh * 0.55 * sc) / heartHeight;
    heartGroup.position.set(
      (px * vw) / 2,
      (py * vh) / 2 + Math.sin(t * 0.9) * 0.08 - (1 - ease) * 1.5,
      state.z,
    );
    heartGroup.scale.setScalar(Math.max(size * ease, 0.0001));
    // slow breathing (in for 2.75 s, out for 2.75 s), scroll squash & stretch, jelly wobble
    const beat = 1 + 0.04 * Math.sin((t / BREATH) * Math.PI * 2 - Math.PI / 2) + 0.04;
    const sq = Math.min(Math.abs(state.vel), 1) * 0.16;
    heartSpin.scale.set(beat * (1 - sq * 0.5 + jelly.x * 0.22), beat * (1 + sq - jelly.x * 0.22), beat * (1 + jelly.x * 0.12));
    heartSpin.rotation.y = jelly.spin + state.turn + state.scroll * Math.PI * 4 + Math.sin(t * 0.6) * 0.22 + pointer.x * 0.35 + (1 - ease) * -2.5;
    heartSpin.rotation.x = state.tilt + Math.sin(t * 0.8) * 0.05 + pointer.y * 0.18;
    heartSpin.rotation.z = Math.sin(t * 0.5) * 0.04;
    heartMat.color.set(state.color);
    fruit.scale.setScalar(Math.max(state.fruit, 0.0001));
    fruit.visible = state.fruit > 0.01;
    leaf.rotation.z = 0.15 + Math.sin(t * 1.6) * 0.12 + jelly.x * 0.6;

    // Orbit ring around the heart (local units: heart is ~2 wide)
    orbitRing.visible = state.orbit > 0.01 && ease > 0.05;
    if (orbitRing.visible) {
      for (let i = 0; i < ORBIT; i++) {
        const a = t * 0.55 + (i / ORBIT) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * 1.75, Math.sin(a * 2 + i) * 0.12 + Math.sin(a) * 0.38, Math.sin(a) * 1.1);
        dummy.rotation.set(t * 0.9 + i, t * 1.2 + i * 0.5, Math.sin(t + i) * 0.4);
        dummy.scale.setScalar(0.13 * state.orbit * (0.85 + 0.15 * Math.sin(t * 2 + i)));
        dummy.updateMatrix();
        orbitRing.setMatrixAt(i, dummy.matrix);
      }
      orbitRing.instanceMatrix.needsUpdate = true;
    }

    // Burst gummies fly out, fall and fade
    let anyBurst = false;
    for (let i = 0; i < BURST; i++) {
      const b = bursts[i];
      if (b.life > 0) {
        anyBurst = true;
        b.life -= dt;
        b.v.y -= 3.2 * dt;                       // leaves float down gently
        b.v.x += Math.sin(t * 3 + i) * 2.2 * dt;  // and flutter
        b.v.multiplyScalar(Math.pow(0.6, dt));
        b.p.addScaledVector(b.v, dt);
        b.r.x += b.w.x * dt; b.r.y += b.w.y * dt; b.r.z += b.w.z * dt;
        dummy.position.copy(b.p);
        dummy.rotation.copy(b.r);
        dummy.scale.setScalar(b.s * Math.min(1, b.life / 0.6) * Math.min(1, (2.1 - b.life) * 8));
      } else {
        dummy.scale.setScalar(0.0001);
      }
      dummy.updateMatrix();
      burstMesh.setMatrixAt(i, dummy.matrix);
    }
    burstMesh.visible = anyBurst;
    if (anyBurst) burstMesh.instanceMatrix.needsUpdate = true;

    // Leaves drift down, swaying like they're falling through still air
    leafMat.opacity = state.sparkles * ease;
    leafField.visible = leafMat.opacity > 0.01;
    if (leafField.visible) {
      const span = vh * 1.7;
      for (let i = 0; i < LEAVES; i++) {
        const l = leafSeeds[i];
        const depth = 1 + (-l.z) * 0.17;
        let y = (l.y * span - t * 0.22 * l.sp - state.scroll * span * 1.2 * l.sp) % span;
        if (y < 0) y += span;
        y -= span / 2;
        dummy.position.set(l.x * (vw / 2) * 1.15 * depth + Math.sin(t * 0.5 * l.sw + l.ph) * 0.6, y * depth, l.z);
        dummy.rotation.set(Math.sin(t * 0.7 + l.ph) * 0.9, t * 0.3 * l.sw + l.ph, Math.sin(t * 0.9 * l.sw + l.ph) * 0.8);
        dummy.scale.setScalar(l.s);
        dummy.updateMatrix();
        leafField.setMatrixAt(i, dummy.matrix);
      }
      leafField.instanceMatrix.needsUpdate = true;
    }

    // Gummies drift upward and react to scroll
    gummyMat.opacity = state.gummies * ease;
    gummies.visible = gummyMat.opacity > 0.01;
    if (gummies.visible) {
      const span = vh * 1.6;
      spinBoost += Math.abs(state.vel) * dt * 7;
      const pwx = (pointer.tx * vw) / 2;
      const pwy = (-pointer.ty * vh) / 2;
      for (let i = 0; i < COUNT; i++) {
        const g = seeds[i];
        const depthScale = 1 + (-g.z) * 0.18;  // spread wider further back
        let y = (g.y * span + t * 0.25 * g.speed + state.scroll * span * 2.2 * g.speed) % span;
        y = y - span / 2;
        let gx = g.x * (vw / 2) * 1.1 * depthScale + Math.sin(t * 0.4 + g.phase) * 0.3 - pointer.x * 0.25 * (g.z + 6) * 0.15;
        let gy = y * depthScale;
        // dodge the cursor (front gummies only)
        let tx = 0, ty = 0;
        if (g.z > -2.5 && hasPointer) {
          const dx = gx - pwx, dy = gy - pwy, d = Math.hypot(dx, dy);
          if (d < 2.2 && d > 0.001) { const f = (2.2 - d) * 0.9; tx = (dx / d) * f; ty = (dy / d) * f; }
        }
        g.ox = (g.ox || 0) + (tx - (g.ox || 0)) * 0.08;
        g.oy = (g.oy || 0) + (ty - (g.oy || 0)) * 0.08;
        dummy.position.set(gx + g.ox, gy + g.oy, g.z);
        dummy.rotation.set(g.rx * t * 0.6 + g.phase + spinBoost * g.rx, g.ry * t * 0.5 + state.scroll * 6 * g.ry + spinBoost * g.ry, g.rz * 0.6 + Math.sin(t + g.phase) * 0.3);
        dummy.scale.setScalar(g.s);
        dummy.updateMatrix();
        gummies.setMatrixAt(i, dummy.matrix);
      }
      gummies.instanceMatrix.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  return { state, render, resize, hitTest, burst };
}
