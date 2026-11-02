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

  // ---- Orbiting gummies (a little ring around the heart) -----------------
  const ORBIT = lowPower ? 7 : 10;
  const orbitMat = new THREE.MeshPhysicalMaterial({ roughness: 0.55, clearcoat: 0.3, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color('#ffffff') });
  const orbitRing = new THREE.InstancedMesh(gummyGeo, orbitMat, ORBIT);
  orbitRing.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < ORBIT; i++) orbitRing.setColorAt(i, new THREE.Color(palette[(i * 3) % palette.length]));
  heartGroup.add(orbitRing);   // follows the heart's position + size, not its spin

  // ---- Burst gummies (tap / click the heart) -----------------------------
  const BURST = lowPower ? 18 : 30;
  const burstMesh = new THREE.InstancedMesh(gummyGeo, orbitMat.clone(), BURST);
  burstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  burstMesh.frustumCulled = false;
  const bursts = [];
  for (let i = 0; i < BURST; i++) {
    burstMesh.setColorAt(i, new THREE.Color(palette[(i * 5) % palette.length]));
    bursts.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), s: 0.2 });
  }
  scene.add(burstMesh);

  // ---- Sparkle field (soft glowing dots, tinted to the section colour) ---
  const SPARKS = lowPower ? 140 : 380;
  const sparkGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(SPARKS * 3);
  const sa = new Float32Array(SPARKS * 2);
  for (let i = 0; i < SPARKS; i++) {
    sp[i * 3] = rand(-1, 1); sp[i * 3 + 1] = rand(0, 1); sp[i * 3 + 2] = rand(-9, 2);
    sa[i * 2] = rand(0.6, 1.6); sa[i * 2 + 1] = rand(0, Math.PI * 2);
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sparkGeo.setAttribute('seed', new THREE.BufferAttribute(sa, 2));
  const sparkMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uScroll: { value: 0 }, uView: { value: new THREE.Vector2(1, 1) },
      uColor: { value: new THREE.Color('#316B58') }, uAlpha: { value: 1 }, uPx: { value: renderer.getPixelRatio() },
    },
    vertexShader: `
      attribute vec2 seed;
      uniform float uTime, uScroll, uPx;
      uniform vec2 uView;
      varying float vTw;
      void main() {
        vec3 p = position;
        float span = uView.y * 1.8;
        float depth = 1.0 + (-p.z) * 0.16;
        float y = mod(p.y * span + uTime * 0.18 * seed.x + uScroll * span * 1.4 * seed.x, span) - span * 0.5;
        vec3 w = vec3(p.x * uView.x * 0.6 * depth + sin(uTime * 0.3 + seed.y) * 0.4, y * depth, p.z);
        vec4 mv = modelViewMatrix * vec4(w, 1.0);
        vTw = 0.55 + 0.45 * sin(uTime * (1.2 + seed.x) + seed.y * 3.0);
        gl_PointSize = (5.0 + seed.x * 6.0) * uPx * (10.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uAlpha;
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        float core = smoothstep(0.18, 0.0, d);
        vec3 c = mix(uColor, vec3(1.0, 0.97, 0.9), core * 0.7);
        gl_FragColor = vec4(c, a * a * vTw * 0.75 * uAlpha);
      }`,
  });
  const sparkles = new THREE.Points(sparkGeo, sparkMat);
  sparkles.frustumCulled = false;
  scene.add(sparkles);

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
      b.s = rand(0.16, 0.3);
      b.life = rand(1.3, 1.9);
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
    // heartbeat (double pulse), scroll squash & stretch, and jelly wobble
    const ph = t % 1.5;
    const beat = 1 + 0.045 * Math.exp(-((ph - 0.1) ** 2) / 0.0016) + 0.03 * Math.exp(-((ph - 0.32) ** 2) / 0.0016);
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
        b.v.y -= 7.5 * dt;
        b.v.multiplyScalar(Math.pow(0.6, dt));
        b.p.addScaledVector(b.v, dt);
        b.r.x += b.w.x * dt; b.r.y += b.w.y * dt; b.r.z += b.w.z * dt;
        dummy.position.copy(b.p);
        dummy.rotation.copy(b.r);
        dummy.scale.setScalar(b.s * Math.min(1, b.life / 0.5) * Math.min(1, (1.9 - b.life) * 8));
      } else {
        dummy.scale.setScalar(0.0001);
      }
      dummy.updateMatrix();
      burstMesh.setMatrixAt(i, dummy.matrix);
    }
    burstMesh.visible = anyBurst;
    if (anyBurst) burstMesh.instanceMatrix.needsUpdate = true;

    // Sparkles
    sparkMat.uniforms.uTime.value = t;
    sparkMat.uniforms.uScroll.value = state.scroll;
    sparkMat.uniforms.uView.value.set(vw, vh);
    sparkMat.uniforms.uColor.value.copy(heartMat.color);
    sparkMat.uniforms.uAlpha.value = state.sparkles * ease;

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
