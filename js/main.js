// Bloomwell — scroll choreography.
// Two modes, picked by device:
//  • "cinematic" (laptops/desktops with a mouse or trackpad): pinned ritual
//    steps, horizontal product scroll, Lenis smooth scrolling.
//  • "flow" (phones, iPads, any touch-first device or narrow window): normal
//    native scrolling, swipeable product row, lighter effects.
// scene.js renders the 3D heart + gummies behind the content in both modes.
import { createScene } from './scene.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FLOW_QUERY = '(pointer: coarse), (max-width: 1023px)';
const CINEMA_QUERY = '(pointer: fine) and (min-width: 1024px)';
const mobileMQ = window.matchMedia('(max-width: 900px)');
const flowMQ = window.matchMedia(FLOW_QUERY);
const touchFirst = window.matchMedia('(pointer: coarse)').matches;
const isMobile = () => mobileMQ.matches;
const isFlow = () => flowMQ.matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

document.getElementById('year').textContent = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/* Smooth scroll (mouse/trackpad only — touch keeps native scrolling)  */
/* ------------------------------------------------------------------ */
let lenis = null;
if (!reduceMotion && !touchFirst && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
function scrollToTarget(target) {
  if (lenis) { lenis.scrollTo(target, { duration: 1.6 }); return; }
  const top = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
}

/* ------------------------------------------------------------------ */
/* Header: scrolled state + mobile menu                                */
/* ------------------------------------------------------------------ */
const header = document.querySelector('.site-header');
const menuBtn = document.querySelector('.menu-toggle');
const setMenu = (open) => {
  header.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};
menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && header.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
});

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    setMenu(false);
    scrollToTarget(target);
  });
});
ScrollTrigger.create({ start: 40, end: 'max', onToggle: (s) => header.classList.toggle('is-scrolled', s.isActive) });

/* ------------------------------------------------------------------ */
/* 3D stage                                                            */
/* ------------------------------------------------------------------ */
let stage = null;
try {
  stage = createScene(document.getElementById('stage'), { lowPower: touchFirst || isMobile() });
  const t0 = performance.now();
  gsap.ticker.add(() => stage.render(reduceMotion ? t0 : performance.now()));
} catch (err) {
  console.warn('WebGL unavailable, continuing without 3D.', err);
  document.body.classList.add('no-webgl');
}
const state = stage ? stage.state : {};
if (stage) ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { state.scroll = s.progress; } });

// Heart poses per section. x/y are fractions of the half-viewport.
const PRESETS = {
  hero:      { d: { x: 0.44, y: -0.1,  scale: 0.95, tilt: 0,    turn: 0,           color: '#316B58', fruit: 1, gummies: 1,   bg: '#FAF5EC' },
               m: { x: 0,    y: 0.6,   scale: 0.38, tilt: 0,    turn: 0,           color: '#316B58', fruit: 1, gummies: 1,   bg: '#FAF5EC' } },
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
const RITUALS = ['glow', 'gut', 'rest', 'fuel'];
// Rituals inherit pose from "glow" so later rituals only override colour + turn.
['gut', 'rest', 'fuel'].forEach((k) => {
  PRESETS[k].d = { ...PRESETS.glow.d, ...PRESETS[k].d };
  PRESETS[k].m = { ...PRESETS.glow.m, ...PRESETS[k].m };
});
// In flow mode text scrolls freely over the stage, so the big heart only
// appears where it has room (opening screen + sign-up) and tucks itself
// away elsewhere, leaving the pastel gummies and colour changes.
const FLOW_HEART_SECTIONS = ['hero', 'cta'];

const ctaHeart = document.querySelector('.cta-heart');
let current = 'hero';
function applyPreset(name, instant = false) {
  current = name;
  const key = isMobile() ? 'm' : 'd';
  let p = PRESETS[name][key];
  if (isFlow() && !FLOW_HEART_SECTIONS.includes(name)) p = { ...p, scale: 0.001, fruit: 0, gummies: Math.min(p.gummies ?? 0.5, 0.5) };
  const dur = instant || reduceMotion ? 0 : 1.4;
  const { bg, ...pose } = p;
  if (stage) {
    if (name === 'cta') state.anchorEl = ctaHeart;
    gsap.to(state, { anchor: name === 'cta' ? 1 : 0, ...pose, duration: dur, ease: 'power3.inOut', overwrite: 'auto' });
  }
  if (bg) gsap.to(root, { '--bg': bg, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
}
mobileMQ.addEventListener('change', () => applyPreset(current, true));

// Section zones: the active pose is always resolved from scroll position
// (not event order), so fast flicks and anchor links land on the right pose.
let zones = [];
let ritualIdx = 0;
function resolveZone() {
  if (!zones.length) return;
  const y = window.scrollY;
  let zone = null;
  for (const z of zones) if (y >= z.st.start && (!zone || z.st.start >= zone.st.start)) zone = z;
  if (!zone) zone = zones[0];
  const name = zone.name === 'rituals' ? RITUALS[ritualIdx] : zone.name;
  if (name !== current) applyPreset(name);
}
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: resolveZone, onRefresh: resolveZone });

/* ------------------------------------------------------------------ */
/* Hero intro                                                          */
/* ------------------------------------------------------------------ */
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
    .from('.site-header', { y: -30, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, 0.5)
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
    scrollTrigger: { trigger: '.manifesto', start: 'top 75%', end: 'bottom 80%', scrub: 0.6 },
  });
}

/* ------------------------------------------------------------------ */
/* Rituals + shop: one setup per mode                                   */
/* ------------------------------------------------------------------ */
const panels = [...document.querySelectorAll('.ritual')];
const fans = [...document.querySelectorAll('.fan')];
const dots = [...document.querySelectorAll('.ritual-progress li')];
const track = document.querySelector('.shop-track');
const cards = [...document.querySelectorAll('.card')];

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

const mm = gsap.matchMedia();

// Laptops & desktops: pinned, cinematic version.
mm.add(CINEMA_QUERY, () => {
  root.classList.remove('is-flow');
  panels.forEach((p, k) => p.classList.toggle('is-active', k === ritualIdx));
  fans.forEach((f, k) => f.classList.toggle('is-active', k === ritualIdx));

  ScrollTrigger.create({
    trigger: '.rituals',
    pin: '.rituals-pin',
    start: 'top top',
    end: () => `+=${window.innerHeight * 3}`,
    invalidateOnRefresh: true,
    onUpdate: (self) => setRitual(Math.min(RITUALS.length - 1, Math.floor(self.progress * RITUALS.length))),
  });

  // Ritual stage drifts gently with the pointer for extra depth
  const stageEl = document.querySelector('.ritual-stage');
  const onMove = (e) => {
    gsap.to(stageEl, {
      rotationY: ((e.clientX / window.innerWidth) - 0.5) * 10,
      rotationX: ((e.clientY / window.innerHeight) - 0.5) * -8,
      duration: 0.8, ease: 'power3.out', overwrite: 'auto',
    });
  };
  if (!reduceMotion) window.addEventListener('pointermove', onMove, { passive: true });

  // Horizontal product scroll
  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const shopTween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.shop', pin: '.shop-pin', start: 'top top',
      end: () => `+=${distance()}`, scrub: reduceMotion ? true : 0.8, invalidateOnRefresh: true,
    },
  });

  const cleanups = [];
  if (!reduceMotion) {
    cards.forEach((card) => {
      gsap.fromTo(card,
        { rotationY: -38, z: -260, opacity: 0.25, transformPerspective: 1200 },
        {
          rotationY: 0, z: 0, opacity: 1, ease: 'power2.out',
          scrollTrigger: { trigger: card, containerAnimation: shopTween, start: 'left 100%', end: 'left 62%', scrub: true },
        });
    });
    if (canHover) {
      cards.forEach((card) => {
        const media = card.querySelector('.card-media');
        gsap.set(media, { transformPerspective: 800 });
        const move = (e) => {
          const r = media.getBoundingClientRect();
          gsap.to(media, {
            rotationY: ((e.clientX - r.left) / r.width - 0.5) * 16,
            rotationX: ((e.clientY - r.top) / r.height - 0.5) * -16,
            duration: 0.5, ease: 'power3.out', overwrite: 'auto',
          });
        };
        const leave = () => gsap.to(media, { rotationX: 0, rotationY: 0, duration: 0.5, overwrite: 'auto' });
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerleave', leave);
        cleanups.push(() => { card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave); });
      });
    }
  }

  zones = [...document.querySelectorAll('[data-preset], .rituals')].map((el) => ({
    name: el.dataset.preset || 'rituals',
    st: ScrollTrigger.create({ trigger: el, start: 'top 55%' }),
  }));

  return () => {
    window.removeEventListener('pointermove', onMove);
    cleanups.forEach((fn) => fn());
    gsap.set([stageEl, track, ...cards], { clearProps: 'all' });
    zones = [];
  };
});

// Phones, iPads, touch devices and narrow windows: natural scrolling.
mm.add(FLOW_QUERY, () => {
  root.classList.add('is-flow');
  panels.forEach((p) => p.classList.add('is-active'));
  fans.forEach((f) => f.classList.remove('is-active', 'is-leaving'));

  // Each product fan opens in 3D as it scrolls into view.
  fans.forEach((fan) => {
    ScrollTrigger.create({
      trigger: fan, start: 'top 85%',
      onEnter: () => fan.classList.add('is-active'),
    });
  });
  if (!reduceMotion) {
    gsap.utils.toArray('.ritual').forEach((p) => {
      gsap.from(p, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: p, start: 'top 88%' } });
    });
  }

  // Zones follow each ritual's product fan, so colours change per ritual.
  zones = [...document.querySelectorAll('[data-preset], .fan')].map((el) => ({
    name: el.dataset.preset || el.dataset.ritual,
    st: ScrollTrigger.create({ trigger: el, start: 'top 60%' }),
  }));

  return () => {
    root.classList.remove('is-flow');
    panels.forEach((p, k) => p.classList.toggle('is-active', k === ritualIdx));
    fans.forEach((f, k) => f.classList.toggle('is-active', k === ritualIdx));
    zones = [];
  };
});

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
  const lite = isFlow();
  gsap.utils.toArray('.moment').forEach((m, i) => {
    gsap.from(m, {
      y: lite ? 50 : 90, opacity: 0,
      rotationX: lite ? 0 : -18, rotationY: lite ? 0 : (i % 2 ? 10 : -10),
      transformPerspective: 1000, transformOrigin: '50% 100%',
      duration: lite ? 0.9 : 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: m, start: 'top 88%', toggleActions: 'play none none none' },
    });
    gsap.from(m.querySelectorAll('.moment-imgs img'), {
      scale: 0.8, opacity: 0, rotation: (k) => (k ? 6 : -6), duration: 0.9, ease: 'back.out(1.6)', stagger: 0.1,
      scrollTrigger: { trigger: m, start: 'top 80%', toggleActions: 'play none none none' },
    });
  });

  /* Promise cards + CTA */
  gsap.from('.promise-item', {
    y: 60, opacity: 0, rotationX: lite ? 0 : -25, transformPerspective: 1000, duration: 1, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: { trigger: '.promise-grid', start: 'top 85%' },
  });
  gsap.from('.promise .h2, .promise .eyebrow', {
    y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '.promise', start: 'top 80%' },
  });
  gsap.from('.cta-inner > *', {
    y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '.cta', start: 'top 70%' },
  });
  gsap.from('.rituals-head > *', {
    y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '.rituals', start: 'top 75%' },
  });
}

/* ------------------------------------------------------------------ */
/* Bloom Protein flavour picker                                        */
/* ------------------------------------------------------------------ */
document.querySelectorAll('.card-protein').forEach((card) => {
  const img = card.querySelector('.card-media img');
  const desc = card.querySelector('.protein-desc');
  const label = card.querySelector('.flavor-name');
  const swatches = [...card.querySelectorAll('.swatch')];
  // Warm the cache so swapping is instant
  swatches.forEach((b) => { const i = new Image(); i.src = b.dataset.img; });
  swatches.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-pressed') === 'true') return;
      swatches.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const flavor = btn.dataset.flavor.replace('&amp;', '&');
      label.textContent = flavor;
      desc.textContent = btn.dataset.desc.replace('&amp;', '&');
      card.style.setProperty('--tint', btn.dataset.tint);
      img.classList.add('is-swapping');
      setTimeout(() => {
        img.src = btn.dataset.img;
        img.alt = `Bloom Protein plant protein canister, ${flavor} flavor`;
        img.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 180);
    });
  });
});

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
