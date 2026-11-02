// Bloomwell extra effects shared by every page:
//  • "blooming" intro (home page, once per visit)
//  • giant 3D word ribbon that slides with your scroll
//  • headings that flip in letter by letter
//  • heart cursor + magnetic buttons (mouse / trackpad only)
//  • tap or click the 3D heart to make it wobble and scatter leaves
//  • a calm breathing guide synced to the heart's slow breathing
// Everything is skipped for people who prefer reduced motion.
import { BREATH } from './scene.js';

const LOGO = `<svg viewBox="0 0 100 112" aria-hidden="true"><path d="M50 108C22 87 6 70 6 48 6 33 16 23 29 23c9 0 16 5 21 13 5-8 12-13 21-13 13 0 23 10 23 25 0 22-16 39-44 60Z" fill="#316B58"/><circle cx="50" cy="14" r="10" fill="#F2A35E"/><path d="M57 6c1-5 6-7 12-7-1 6-5 10-12 11Z" fill="#7DB36B"/></svg>`;

function seenIntro() {
  try { return sessionStorage.getItem('bw-intro') === '1'; } catch (e) { return false; }
}
function markIntro() {
  try { sessionStorage.setItem('bw-intro', '1'); } catch (e) { /* private mode: fine */ }
}

/* ---------- Blooming intro ---------- */
function intro(gsap) {
  const el = document.createElement('div');
  el.className = 'bw-loader';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="bw-loader-mark">${LOGO}</div><div class="bw-loader-word"><span>Bloomwell</span></div><p class="bw-loader-tag"><span>Health · Wellness</span></p>`;
  document.body.appendChild(el);
  const tl = gsap.timeline({ onComplete: () => el.remove() });
  tl.fromTo('.bw-loader-mark', { scale: 0.2, rotate: -25, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: 'back.out(2.2)' })
    .to('.bw-loader-mark', { scale: 1.15, duration: 0.12, ease: 'power2.out' })
    .to('.bw-loader-mark', { scale: 1, duration: 0.18, ease: 'power2.in' })
    .to('.bw-loader-mark', { scale: 1.1, duration: 0.1, ease: 'power2.out' })
    .to('.bw-loader-mark', { scale: 1, duration: 0.16, ease: 'power2.in' })
    .from('.bw-loader-word span', { yPercent: 110, duration: 0.6, ease: 'power4.out' }, 0.35)
    .from('.bw-loader-tag span', { yPercent: 110, opacity: 0, duration: 0.5, ease: 'power3.out' }, 0.6)
    .to(el, { clipPath: 'circle(0% at 50% 46%)', duration: 0.9, ease: 'power4.inOut' }, '+=0.15');
  markIntro();
  return 1.45; // seconds before the page content is revealed
}

/* ---------- Giant word ribbon ---------- */
function ribbon(gsap, ScrollTrigger, anchor) {
  if (!anchor) return;
  const words = ['Nourish', 'Restore', 'Hydrate', 'Balance', 'Rest'];
  const LEAF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15Z"/><path d="M5 19 14 10"/></svg>';
  const row = (cls) => {
    const items = [];
    for (let r = 0; r < 4; r++) words.forEach((w, i) => items.push(`<span class="${(i + r) % 2 ? 'is-outline' : ''}">${w}</span><i>${LEAF}</i>`));
    return `<div class="bw-ribbon-row ${cls}">${items.join('')}</div>`;
  };
  const wrap = document.createElement('div');
  wrap.className = 'bw-ribbon';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<div class="bw-ribbon-tilt">${row('row-a')}${row('row-b')}</div>`;
  anchor.parentNode.insertBefore(wrap, anchor);
  gsap.fromTo(wrap.querySelector('.row-a'), { xPercent: 0 }, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  gsap.fromTo(wrap.querySelector('.row-b'), { xPercent: -30 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  // lean into fast scrolling
  const skew = gsap.quickTo(wrap.querySelector('.bw-ribbon-tilt'), 'skewX', { duration: 0.5, ease: 'power3.out' });
  ScrollTrigger.create({ trigger: wrap, start: 'top bottom', end: 'bottom top', onUpdate: (s) => skew(gsap.utils.clamp(-14, 14, s.getVelocity() / -220)) });
}

/* ---------- Headings flip in letter by letter ---------- */
function splitHeadings(gsap) {
  document.querySelectorAll('.h2:not([data-split-done])').forEach((h) => {
    h.dataset.splitDone = '1';
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'bw-w';
            w.setAttribute('aria-hidden', 'true');
            [...part].forEach((ch) => {
              const c = document.createElement('span');
              c.className = 'bw-c';
              c.textContent = ch;
              w.appendChild(c);
            });
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(h);
    gsap.from(h.querySelectorAll('.bw-c'), {
      yPercent: 90, rotateX: -95, opacity: 0, transformOrigin: '50% 100%',
      duration: 0.9, ease: 'back.out(1.7)', stagger: 0.018,
      scrollTrigger: { trigger: h, start: 'top 88%' },
    });
  });
}

/* ---------- Heart cursor + magnetic buttons ---------- */
function cursor(gsap) {
  const c = document.createElement('div');
  c.className = 'bw-cursor';
  c.setAttribute('aria-hidden', 'true');
  c.innerHTML = '<span class="bw-cursor-ring"></span><span class="bw-cursor-dot"></span>';
  document.body.appendChild(c);
  document.documentElement.classList.add('has-bw-cursor');
  const x = gsap.quickTo(c, 'x', { duration: 0.18, ease: 'power3.out' });
  const y = gsap.quickTo(c, 'y', { duration: 0.18, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    c.classList.add('is-on');
    x(e.clientX); y(e.clientY);
    const hot = e.target.closest('a, button, input, label, summary, [role="button"], .card, .sa-card, .p-card, .c-tile');
    c.classList.toggle('is-hover', !!hot);
  }, { passive: true });
  document.addEventListener('pointerleave', () => c.classList.remove('is-on'));
  window.addEventListener('pointerdown', () => { c.classList.add('is-down'); });
  window.addEventListener('pointerup', () => { c.classList.remove('is-down'); });
}

function magnetic(gsap) {
  document.querySelectorAll('.btn, .round-btn, .cart-link, .c-chip, .sa-filter').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
    const my = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      mx((e.clientX - (r.left + r.width / 2)) * 0.28);
      my((e.clientY - (r.top + r.height / 2)) * 0.38);
    });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

/* ---------- Tap the heart ---------- */
function tapHeart(stage) {
  if (!stage || !stage.hitTest) return;
  let hint = null;
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, input, select, textarea, label, summary, [role="button"], .card, .p-card, .sa-card, .bundle, .moment, .review')) return;
    if (stage.hitTest(e.clientX, e.clientY)) {
      stage.burst(1);
    }
  });
  // calm breathing guide on the opening screen, in time with the heart
  const hero = document.querySelector('.hero, .c-hero:not(.pdp):not(.cart-page)');
  if (hero && !document.querySelector('.bw-breathe')) {
    hint = document.createElement('p');
    hint.className = 'bw-breathe';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = '<span class="bw-breathe-dot"></span><span class="bw-breathe-word">Breathe in</span><span class="bw-breathe-sub">tap the heart</span>';
    hero.appendChild(hint);
    const word = hint.querySelector('.bw-breathe-word');
    const dot = hint.querySelector('.bw-breathe-dot');
    let last = '';
    const tick = () => {
      const p = (performance.now() / 1000) % BREATH;
      const inhale = p < BREATH / 2;
      const label = inhale ? 'Breathe in' : 'Breathe out';
      if (label !== last) { word.textContent = label; last = label; }
      const k = 0.5 - 0.5 * Math.cos((p / BREATH) * Math.PI * 2);
      dot.style.transform = `scale(${0.55 + k * 0.45})`;
      if (hint.isConnected) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

export function initFX({ gsap, ScrollTrigger, stage, reduceMotion, canHover, isHome }) {
  if (reduceMotion) return 0;
  let delay = 0;
  if (isHome && !seenIntro()) delay = intro(gsap);
  if (isHome) ribbon(gsap, ScrollTrigger, document.querySelector('.rituals'));
  splitHeadings(gsap);
  if (canHover) { cursor(gsap); magnetic(gsap); }
  tapHeart(stage);
  return delay;
}

// Scroll velocity -> 3D stage (heart squash & stretch, gummy spin)
export function trackVelocity(ScrollTrigger, stage) {
  if (!stage) return;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (s) => { stage.state.vel = Math.max(-1, Math.min(1, s.getVelocity() / 2500)); },
  });
}
