// Bloomwell — scroll choreography.
// GSAP + ScrollTrigger drive the page; Lenis smooths the scroll;
// scene.js renders the 3D heart + gummies behind the content.
import { createScene } from './scene.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMQ = window.matchMedia('(max-width: 900px)');
const isMobile = () => mobileMQ.matches;

document.getElementById('year').textContent = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/* Smooth scroll                                                       */
/* ------------------------------------------------------------------ */
let lenis = null;
if (!reduceMotion && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else window.scrollTo({ top: target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
});

/* ------------------------------------------------------------------ */
/* 3D stage                                                            */
/* ------------------------------------------------------------------ */
let stage = null;
try {
  stage = createScene(document.getElementById('stage'), { lowPower: isMobile() });
  const t0 = performance.now();
  gsap.ticker.add(() => stage.render(reduceMotion ? t0 : performance.now()));
} catch (err) {
  console.warn('WebGL unavailable, continuing without 3D.', err);
  document.body.classList.add('no-webgl');
}
const state = stage ? stage.state : {};

// Heart poses per section. x/y are fractions of the half-viewport.
const PRESETS = {
  hero:      { d: { x: 0.44, y: -0.1,  scale: 0.95, tilt: 0,    turn: 0,           color: '#316B58', fruit: 1, gummies: 1,   bg: '#FAF5EC' },
               m: { x: 0,    y: 0.56,  scale: 0.4,  tilt: 0,    turn: 0,           color: '#316B58', fruit: 1, gummies: 1,   bg: '#FAF5EC' } },
  manifesto: { d: { x: -0.5, y: -0.08, scale: 0.8,  tilt: 0.25, turn: Math.PI,     color: '#316B58', fruit: 1, gummies: 0.7, bg: '#F6EEE1' },
               m: { x: 0.55, y: 0.62,  scale: 0.35, tilt: 0.25, turn: Math.PI,     color: '#316B58', fruit: 1, gummies: 0.6, bg: '#F6EEE1' } },
  glow:      { d: { x: 0.5,  y: -0.04, scale: 1.25, tilt: 0.1,  turn: Math.PI * 2, color: '#F0AE9C', fruit: 0, gummies: 0.5, bg: '#FBEAE4' },
               m: { x: 0,    y: 0.2,   scale: 0.75, tilt: 0.1,  turn: Math.PI * 2, color: '#F0AE9C', fruit: 0, gummies: 0.4, bg: '#FBEAE4' } },
  gut:       { d: { color: '#A6C78B', bg: '#EEF3E4', turn: Math.PI * 3 },  m: { color: '#A6C78B', bg: '#EEF3E4', turn: Math.PI * 3 } },
  rest:      { d: { color: '#B7A6E4', bg: '#EFEBF8', turn: Math.PI * 4 },  m: { color: '#B7A6E4', bg: '#EFEBF8', turn: Math.PI * 4 } },
  fuel:      { d: { color: '#E8937A', bg: '#FCE9DE', turn: Math.PI * 5 },  m: { color: '#E8937A', bg: '#FCE9DE', turn: Math.PI * 5 } },
  shop:      { d: { x: 0.82, y: 0.66, scale: 0.32, tilt: 0,    turn: Math.PI * 6, color: '#316B58', fruit: 1, gummies: 0.55, bg: '#FAF5EC' },
               m: { x: 0.72, y: 0.74, scale: 0.22, tilt: 0,    turn: Math.PI * 6, color: '#316B58', fruit: 1, gummies: 0.4,  bg: '#FAF5EC' } },
  day:       { d: { x: -0.78, y: 0.55, scale: 0.42, tilt: 0.2, turn: Math.PI * 7, fruit: 0, gummies: 0.45 },
               m: { x: 0.7,  y: 0.72, scale: 0.24, tilt: 0.2, turn: Math.PI * 7, fruit: 0, gummies: 0.3 } },
  promise:   { d: { x: 0.82, y: 0.58, scale: 0.36, tilt: -0.2, turn: Math.PI * 8, color: '#316B58', fruit: 1, gummies: 0.7, bg: '#FAF5EC' },
               m: { x: 0.7,  y: 0.74, scale: 0.22, tilt: -0.2, turn: Math.PI * 8, color: '#316B58', fruit: 1, gummies: 0.5, bg: '#FAF5EC' } },
  cta:       { d: { x: 0,    y: 0.5,  scale: 0.62, tilt: 0,    turn: Math.PI * 10, color: '#316B58', fruit: 1, gummies: 1, bg: '#FAF5EC' },
               m: { x: 0,    y: 0.5,  scale: 0.45, tilt: 0,    turn: Math.PI * 10, color: '#316B58', fruit: 1, gummies: 1, bg: '#FAF5EC' } },
};

let current = 'hero';
let zones = [];
const ctaHeart = document.querySelector('.cta-heart');
function applyPreset(name, instant = false) {
  current = name;
  const p = PRESETS[name][isMobile() ? 'm' : 'd'];
  const dur = instant || reduceMotion ? 0 : 1.4;
  const { bg, ...pose } = p;
  if (stage) {
    if (name === 'cta') state.anchorEl = ctaHeart;
    gsap.to(state, { anchor: name === 'cta' ? 1 : 0, ...pose, duration: dur, ease: 'power3.inOut', overwrite: 'auto' });
  }
  if (bg) gsap.to(root, { '--bg': bg, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
}
// Rituals inherit pose from "glow" so later rituals only override colour + turn.
['gut', 'rest', 'fuel'].forEach((k) => {
  PRESETS[k].d = { ...PRESETS.glow.d, ...PRESETS[k].d };
  PRESETS[k].m = { ...PRESETS.glow.m, ...PRESETS[k].m };
});
mobileMQ.addEventListener('change', () => applyPreset(current, true));

/* ------------------------------------------------------------------ */
/* Header + hero intro                                                 */
/* ------------------------------------------------------------------ */
const header = document.querySelector('.site-header');
ScrollTrigger.create({ start: 40, end: 'max', onToggle: (s) => header.classList.toggle('is-scrolled', s.isActive) });
if (stage) ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { state.scroll = s.progress; } });

applyPreset('hero', true);
if (reduceMotion) {
  if (stage) state.intro = 1;
} else {
  const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
  if (stage) intro.to(state, { intro: 1, duration: 2.2, ease: 'power3.out' }, 0);
  intro
    .from('.hero .eyebrow', { y: 20, opacity: 0, duration: 1 }, 0.2)
    .from('.display .line > span', { yPercent: 110, rotate: 4, duration: 1.3, stagger: 0.12 }, 0.3)
    .from('.hero .lede, .hero-ctas', { y: 30, opacity: 0, duration: 1.1, stagger: 0.1 }, 0.7)
    .from('.site-header', { y: -30, opacity: 0, duration: 1 }, 0.5)
    .from('.scroll-cue', { opacity: 0, duration: 1 }, 1.2);
}

/* ------------------------------------------------------------------ */
/* Manifesto: words light up as you scroll                             */
/* ------------------------------------------------------------------ */
const manifesto = document.querySelector('[data-split]');
manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/)
  .map((w) => `<span class="w">${w}</span>`).join(' ');
if (!reduceMotion) {
  gsap.to('.manifesto-text .w', {
    opacity: 1, stagger: 0.08, ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top 70%', end: 'bottom 75%', scrub: 0.6 },
  });
}

/* ------------------------------------------------------------------ */
/* Rituals: pinned, four steps                                         */
/* ------------------------------------------------------------------ */
const RITUALS = ['glow', 'gut', 'rest', 'fuel'];
const panels = [...document.querySelectorAll('.ritual')];
const fans = [...document.querySelectorAll('.fan')];
const dots = [...document.querySelectorAll('.ritual-progress li')];
let ritualIdx = 0;

function setRitual(i) {
  if (i === ritualIdx) return;
  const prevFan = fans[ritualIdx];
  prevFan.classList.remove('is-active');
  prevFan.classList.add('is-leaving');
  setTimeout(() => prevFan.classList.remove('is-leaving'), 700);
  ritualIdx = i;
  panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
  fans.forEach((f, k) => f.classList.toggle('is-active', k === i));
  dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
  resolveZone();
}

ScrollTrigger.create({
  trigger: '.rituals',
  pin: '.rituals-pin',
  start: 'top top',
  end: () => `+=${window.innerHeight * 3}`,
  invalidateOnRefresh: true,
  onUpdate: (self) => {
    const i = Math.min(RITUALS.length - 1, Math.floor(self.progress * RITUALS.length));
    if (i !== ritualIdx) setRitual(i);
  },
});

// Ritual stage drifts gently with the pointer for extra depth
const stageEl = document.querySelector('.ritual-stage');
if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
  const qx = gsap.quickTo(stageEl, 'rotationY', { duration: 0.8, ease: 'power3.out' });
  const qy = gsap.quickTo(stageEl, 'rotationX', { duration: 0.8, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => {
    qx(((e.clientX / window.innerWidth) - 0.5) * 10);
    qy(((e.clientY / window.innerHeight) - 0.5) * -8);
  }, { passive: true });
}

/* ------------------------------------------------------------------ */
/* Shop: horizontal scroll with 3D card entrances                      */
/* ------------------------------------------------------------------ */
const track = document.querySelector('.shop-track');
const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
const shopTween = gsap.to(track, {
  x: () => -distance(),
  ease: 'none',
  scrollTrigger: {
    trigger: '.shop',
    pin: '.shop-pin',
    start: 'top top',
    end: () => `+=${distance()}`,
    scrub: reduceMotion ? true : 0.8,
    invalidateOnRefresh: true,
  },
});

const cards = [...document.querySelectorAll('.card')];
if (!reduceMotion) {
  cards.forEach((card) => {
    gsap.fromTo(card,
      { rotationY: -38, z: -260, opacity: 0.25, transformPerspective: 1200 },
      {
        rotationY: 0, z: 0, opacity: 1, ease: 'power2.out',
        scrollTrigger: { trigger: card, containerAnimation: shopTween, start: 'left 100%', end: 'left 62%', scrub: true },
      });
  });

  // Pointer tilt on the product image
  if (window.matchMedia('(hover: hover)').matches) {
    cards.forEach((card) => {
      const media = card.querySelector('.card-media');
      gsap.set(media, { transformPerspective: 800 });
      const rx = gsap.quickTo(media, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      const ry = gsap.quickTo(media, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      card.addEventListener('pointermove', (e) => {
        const r = media.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 16);
        rx(((e.clientY - r.top) / r.height - 0.5) * -16);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }
}

/* ------------------------------------------------------------------ */
/* Section presets                                                     */
/* ------------------------------------------------------------------ */
// One trigger per section; the active pose is always resolved from scroll
// position (not event order), so fast jumps and anchor links land correctly.
zones = [...document.querySelectorAll('[data-preset], .rituals')].map((el) => ({
  name: el.dataset.preset || 'rituals',
  st: ScrollTrigger.create({ trigger: el, start: 'top 55%' }),
}));
function resolveZone() {
  const y = window.scrollY;
  let zone = zones[0];
  for (const z of zones) if (y >= z.st.start) zone = z;
  const name = zone.name === 'rituals' ? RITUALS[ritualIdx] : zone.name;
  if (name !== current) applyPreset(name);
}
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: resolveZone, onRefresh: resolveZone });

/* ------------------------------------------------------------------ */
/* A day in bloom: line draws, sky turns from morning to night         */
/* ------------------------------------------------------------------ */
const DAY_BG = ['#FBF3E3', '#FBEFE0', '#F6E6E3', '#ECE6F5'];
const DAY_HEART = ['#F2A35E', '#F4B860', '#E8937A', '#B7A6E4'];
const bgAt = (p) => gsap.utils.interpolate(DAY_BG, p);
const heartAt = (p) => gsap.utils.interpolate(DAY_HEART, p);

ScrollTrigger.create({
  trigger: '.day-timeline',
  start: 'top 70%',
  end: 'bottom 70%',
  onUpdate: (self) => {
    if (!self.isActive) return; // fast jumps past the section: let the next preset win
    gsap.killTweensOf(root, '--bg');
    root.style.setProperty('--bg', bgAt(self.progress));
    if (stage) { gsap.killTweensOf(state, 'color'); state.color = heartAt(self.progress); }
  },
});
gsap.fromTo('.day-line path', { strokeDashoffset: 1000 }, {
  strokeDashoffset: 0, ease: 'none',
  scrollTrigger: { trigger: '.day-timeline', start: 'top 70%', end: 'bottom 70%', scrub: true },
});

if (!reduceMotion) {
  gsap.utils.toArray('.moment').forEach((m, i) => {
    gsap.from(m, {
      y: 90, opacity: 0, rotationX: -18, rotationY: i % 2 ? 10 : -10, transformPerspective: 1000, transformOrigin: '50% 100%',
      duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: m, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
    gsap.from(m.querySelectorAll('.moment-imgs img'), {
      scale: 0.7, opacity: 0, rotation: (k) => (k ? 8 : -8), duration: 1, ease: 'back.out(1.6)', stagger: 0.1,
      scrollTrigger: { trigger: m, start: 'top 75%', toggleActions: 'play none none reverse' },
    });
  });

  /* Promise cards + CTA */
  gsap.from('.promise-item', {
    y: 80, opacity: 0, rotationX: -25, transformPerspective: 1000, duration: 1.1, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: { trigger: '.promise-grid', start: 'top 80%', toggleActions: 'play none none reverse' },
  });
  gsap.from('.promise .h2, .promise .eyebrow', {
    y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '.promise', start: 'top 75%', toggleActions: 'play none none reverse' },
  });
  gsap.from('.cta-inner > *', {
    y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '.cta', start: 'top 55%', toggleActions: 'play none none reverse' },
  });
  gsap.from('.rituals-head > *', {
    y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '.rituals', start: 'top 70%', toggleActions: 'play none none reverse' },
  });
}

/* ------------------------------------------------------------------ */
/* Newsletter (front-end only — connect to your email provider)         */
/* ------------------------------------------------------------------ */
const form = document.querySelector('.signup');
const msg = form.querySelector('.form-msg');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  msg.classList.toggle('is-error', !ok);
  msg.textContent = ok ? "Thank you! You're on the list." : 'Please enter a valid email address.';
  if (ok) form.reset();
});

window.addEventListener('load', () => ScrollTrigger.refresh());
