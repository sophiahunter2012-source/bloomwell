// Bloomwell collection pages: same 3D heart + gummies as the home page,
// tinted to the collection, with lighter scroll choreography.
import { createScene } from './scene.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchFirst = window.matchMedia('(pointer: coarse)').matches;
const flow = window.matchMedia('(pointer: coarse), (max-width: 1023px)').matches;
const mobile = window.matchMedia('(max-width: 900px)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (flow) root.classList.add('is-flow');

document.getElementById('year').textContent = new Date().getFullYear();

/* Smooth scroll on mouse/trackpad only */
if (!reduceMotion && !touchFirst && window.Lenis) {
  const lenis = new window.Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* Header */
const header = document.querySelector('.site-header');
const menuBtn = document.querySelector('.menu-toggle');
const setMenu = (open) => {
  header.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};
menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
ScrollTrigger.create({ start: 40, end: 'max', onToggle: (s) => header.classList.toggle('is-scrolled', s.isActive) });

/* 3D stage */
let stage = null;
try {
  stage = createScene(document.getElementById('stage'), { lowPower: touchFirst || mobile });
  const t0 = performance.now();
  gsap.ticker.add(() => stage.render(reduceMotion ? t0 : performance.now()));
} catch (err) {
  console.warn('WebGL unavailable, continuing without 3D.', err);
}

const accent = document.body.dataset.accent || '#316B58';
const corner = document.body.dataset.pose === 'corner';
const HERO = corner
  ? (flow ? { x: 0.72, y: 0.8, scale: 0.16, tilt: 0, turn: 0, color: accent, fruit: 1, gummies: 0.6 }
          : { x: 0.88, y: 0.66, scale: 0.24, tilt: 0.1, turn: 0, color: accent, fruit: 1, gummies: 0.7 })
  : mobile
  ? { x: 0, y: 0.6, scale: 0.36, tilt: 0, turn: 0, color: accent, fruit: 1, gummies: 1 }
  : { x: 0.5, y: -0.04, scale: 0.85, tilt: 0.05, turn: 0, color: accent, fruit: 1, gummies: 1 };
const AWAY = flow
  ? { scale: 0.001, fruit: 0, gummies: 0.45 }
  : { x: 0.86, y: 0.64, scale: 0.24, tilt: 0.1, turn: Math.PI * 2, gummies: 0.5 };

if (stage) {
  const { state } = stage;
  Object.assign(state, HERO);
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { state.scroll = s.progress * 0.35; } });
  ScrollTrigger.create({
    trigger: '.c-hero', start: 'bottom 55%',
    onEnter: () => gsap.to(state, { ...AWAY, duration: reduceMotion ? 0 : 1.3, ease: 'power3.inOut', overwrite: 'auto' }),
    onLeaveBack: () => gsap.to(state, { ...HERO, duration: reduceMotion ? 0 : 1.3, ease: 'power3.inOut', overwrite: 'auto' }),
  });
  if (reduceMotion) state.intro = 1;
  else gsap.to(state, { intro: 1, duration: 2, ease: 'power3.out' });
}

/* Entrances */
if (!reduceMotion) {
  gsap.timeline({ defaults: { ease: 'power4.out' } })
    .from('.crumbs, .c-hero .eyebrow', { y: 20, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.1)
    .from('.c-title .line > span', { yPercent: 110, rotate: 3, duration: 1.2 }, 0.25)
    .from('.c-hero .lede, .c-count', { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 0.55);

  ScrollTrigger.batch('.p-card, .c-tile', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.from(els, {
      y: 60, opacity: 0, rotationX: flow ? 0 : -22, transformPerspective: 1000, transformOrigin: '50% 100%',
      duration: 1, ease: 'power3.out', stagger: 0.07, clearProps: 'transform,opacity',
    }),
  });
  gsap.from('.c-sub-inner', {
    y: 50, opacity: 0, scale: 0.97, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: '.c-sub', start: 'top 85%' },
  });
}

/* Pointer tilt on product cards (mouse only) */
if (canHover && !reduceMotion) {
  document.querySelectorAll('.p-card').forEach((card) => {
    const inner = card.querySelector('.p-inner');
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      gsap.to(inner, {
        rotationY: ((e.clientX - r.left) / r.width - 0.5) * 10,
        rotationX: ((e.clientY - r.top) / r.height - 0.5) * -10,
        duration: 0.5, ease: 'power3.out', overwrite: 'auto',
      });
    });
    card.addEventListener('pointerleave', () => gsap.to(inner, { rotationX: 0, rotationY: 0, duration: 0.6, overwrite: 'auto' }));
  });
}

window.addEventListener('load', () => ScrollTrigger.refresh());
