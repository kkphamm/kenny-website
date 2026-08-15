const App = {
    elems: {
        logo: document.getElementById('site-logo'),
        sideNavLinks: document.querySelector('.side-nav-links'),
        thumb: document.querySelector('.side-nav-thumb'),
        hero: document.getElementById('hero-section'),
        hamburger: document.getElementById('mobile-menu-toggle'),
    },

    init() {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);
        const yearEl = document.getElementById('copyright-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
        this.animateName();
        this.setupEventListeners();
        this.initScrollReveal();
        this.initActiveLinkObserver();
        this.initProjectReveal();
        this.initHeroCard();
        this.initGlowSurfaces();
        this.initMagnetic('.contact-resume, .social-link', 8);
        this.initNavHighlight();
        this.initSkillsFilter();
        this.initExpCards();
    },

    animateName() {
        const container = document.getElementById('name-display');
        const text = 'Kenny Pham';

        const letters = document.createElement('span');
        letters.className = 'name-letters';
        letters.setAttribute('aria-hidden', 'true');
        [...text].forEach((char, i) => {
            const span = document.createElement('span');
            // NBSP: a plain space in an inline-block span collapses to nothing.
            span.textContent = char === ' ' ? ' ' : char;
            span.style.animation = `fallIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.07}s forwards`;
            letters.appendChild(span);
        });
        container.innerHTML = '';
        container.appendChild(letters);

        // Let the settled name sit for a beat before it swooshes into the
        // corner logo, then bring in the rest of the site right behind it.
        const lettersSettleAt = text.length * 70 + 700;
        const restBeat = 900;
        setTimeout(() => this.swooshNameToLogo(), lettersSettleAt + restBeat);
    },

    // FLIP: the full name shrinks/flies from the hero into the corner logo's
    // exact spot while fading out, timed against the logo fading/popping in
    // there — reads as "Kenny Pham" becoming "KP", not two separate fades.
    // The rest of the site (nav + business card) comes in right behind that
    // landing — just a short beat for "KP" to register alone, then everything
    // else follows in quick succession instead of trickling in.
    swooshNameToLogo() {
        const name = document.getElementById('name-display');
        const logo = this.elems.logo;
        const postKpBeat = 150;

        const revealRest = () => {
            this.elems.sideNavLinks.classList.add('is-ready');
            this.elems.sideNavLinks.querySelectorAll('a').forEach((a, i) => {
                setTimeout(() => a.style.animation = 'fallIn 0.4s ease-out forwards', i * 50);
            });
            this.animateHeroCard();
        };

        logo.classList.add('is-ready');

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            name.classList.add('is-collapsed');
            name.style.opacity = '0';
            setTimeout(revealRest, postKpBeat);
            return;
        }

        const from = name.getBoundingClientRect();
        const to = logo.getBoundingClientRect();
        const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
        const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
        // offsetHeight (layout-based, ignores the logo's own scale-in
        // transform which is still mid-transition here) rather than the
        // transformed getBoundingClientRect height, so the target size is
        // the logo's true settled size, not a mid-transition snapshot.
        const scale = Math.max(0.12, logo.offsetHeight / name.offsetHeight);

        const fly = name.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0, offset: 0.85 },
            { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0 },
        ], { duration: 1300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });

        // Collapse the layout space only after the fly finishes (name is
        // already invisible by then) — collapsing earlier would clip the
        // still-flying, still-visible text via .name-letters' overflow:hidden.
        fly.finished.then(() => {
            name.classList.add('is-collapsed');
            setTimeout(revealRest, postKpBeat);
        });
    },

    // Motion (motion.dev) loaded on demand — the animation engine behind Motion
    // Primitives — just for this one entrance. Falls back to a plain CSS fade
    // if the CDN is unreachable, so the card never gets stuck invisible.
    animateHeroCard() {
        const card = document.getElementById('hero-card');
        if (!card) return;
        const fallback = () => { card.style.transition = 'opacity 0.4s ease'; card.style.opacity = '1'; };
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return fallback();

        import('https://cdn.jsdelivr.net/npm/motion@11/+esm')
            .then(({ animate }) => animate(
                card,
                { opacity: [0, 1], y: [24, 0], scale: [0.94, 1] },
                { type: 'spring', stiffness: 260, damping: 22 }
            ))
            .catch(fallback);
    },

    // Fade-in-and-rise reveal as content scrolls into view. Skips straight to
    // the final visible state under prefers-reduced-motion (this is the only
    // place that needs to check it now that the scroll-hijack is gone).
    initScrollReveal() {
        const targets = Array.from(document.querySelectorAll('.reveal'));
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reduced || !('IntersectionObserver' in window)) {
            targets.forEach(el => el.classList.add('is-visible'));
            return;
        }

        targets.forEach(el => {
            const siblings = Array.from(el.parentElement.querySelectorAll(':scope > .reveal'));
            const i = siblings.indexOf(el);
            el.style.transitionDelay = `${Math.min(i, 8) * 50}ms`;
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        targets.forEach(el => observer.observe(el));
    },

    // Highlights the nav link for whichever section currently occupies the
    // middle band of the viewport, and slides the highlight to match.
    initActiveLinkObserver() {
        const sections = document.querySelectorAll('#main-content section[id]');
        const navLinks = document.querySelectorAll('#side-nav a');
        if (!sections.length || !('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navLinks.forEach(a => {
                        const active = a.getAttribute('href') === `#${entry.target.id}`;
                        a.classList.toggle('active', active);
                        // Only reposition the shared highlight if the user isn't
                        // currently hovering the nav — a hover preview shouldn't
                        // get yanked away by scroll-driven section changes.
                        if (active && !this.elems.sideNavLinks.matches(':hover')) this.moveThumb(a);
                    });
                }
            });
        }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

        sections.forEach(sec => observer.observe(sec));
    },

    // Motion Primitives-style "animated tabs" hover indicator: a soft-cornered
    // highlight (not a pill) that slides under whichever link is hovered, and
    // snaps back to whichever section is currently in view on mouse-leave —
    // so the nav always reflects where the user is on the page.
    initNavHighlight() {
        const nav = this.elems.sideNavLinks;
        if (!nav) return;

        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('mouseenter', () => this.moveThumb(link));
        });
        nav.addEventListener('mouseleave', () => {
            const active = nav.querySelector('a.active');
            if (active) this.moveThumb(active);
            else this.elems.thumb?.classList.remove('is-visible');
        });
    },

    moveThumb(link) {
        if (!this.elems.thumb || !link) return;
        this.elems.thumb.style.transform = `translateX(${link.offsetLeft}px)`;
        this.elems.thumb.style.width = `${link.offsetWidth}px`;
        this.elems.thumb.classList.add('is-visible');
    },

    // Hero card: pointer-tracked tilt + sheen, and a flip to the details face.
    initHeroCard() {
        const card = document.getElementById('hero-card');
        if (!card) return;

        card.querySelectorAll('.hero-card-flip').forEach(btn => {
            btn.addEventListener('click', () => {
                const flipped = card.classList.toggle('is-flipped');
                card.querySelectorAll('.hero-card-flip').forEach(b => b.setAttribute('aria-expanded', String(flipped)));
                (flipped ? card.querySelector('.hero-card-back') : card.querySelector('.hero-card-front'))
                    .querySelector('.hero-card-flip').focus();

                // A brief lift-and-settle layered on top of the rotate (see
                // .hero-card.is-flipping in styles.css) — reads like a card
                // being turned by hand instead of a flat spin in place.
                if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    card.classList.remove('is-flipping');
                    void card.offsetWidth; // restart the animation if clicked mid-flip
                    card.classList.add('is-flipping');
                    card.addEventListener('animationend', () => card.classList.remove('is-flipping'), { once: true });
                }
            });
        });

        if (window.matchMedia('(hover: none)').matches ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        card.addEventListener('pointermove', (e) => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            card.classList.add('is-tilting');
            card.style.setProperty('--tx', `${(px - 0.5) * 14}deg`);
            card.style.setProperty('--ty', `${(0.5 - py) * 12}deg`);
            card.style.setProperty('--mx', `${px * 100}%`);
            card.style.setProperty('--my', `${py * 100}%`);
            // Cast shadow falls away from the cursor, like light staying put
            // while the card pivots toward it — reinforces the tilt as real
            // physical rotation instead of a flat image skewing.
            card.style.setProperty('--shadow-x', `${(0.5 - px) * 40}px`);
            card.style.setProperty('--shadow-y', `${(0.5 - py) * 30}px`);
        });
        card.addEventListener('pointerleave', () => {
            card.classList.remove('is-tilting');
            card.style.setProperty('--tx', '0deg');
            card.style.setProperty('--ty', '0deg');
            card.style.setProperty('--shadow-x', '0px');
            card.style.setProperty('--shadow-y', '0px');
        });
    },

    // Same pointer-tracked --mx/--my sheen as the hero card (see initHeroCard),
    // generalized to any .glow-surface element — Contact/Projects cards pick
    // up the same premium-glass cue instead of a bespoke one-off effect.
    initGlowSurfaces() {
        if (window.matchMedia('(hover: none)').matches) return;
        document.querySelectorAll('.glow-surface').forEach(el => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
                el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
            });
        });
    },

    // Motion Primitives' signature "magnetic" hover: the element nudges a
    // few px toward the cursor and springs back on leave. Reuses the same
    // on-demand Motion import as animateHeroCard (module is cached after
    // the first import, so this is effectively free).
    initMagnetic(selector, strength = 10) {
        if (window.matchMedia('(hover: none)').matches ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        import('https://cdn.jsdelivr.net/npm/motion@11/+esm').then(({ animate }) => {
            document.querySelectorAll(selector).forEach(el => {
                el.addEventListener('pointermove', (e) => {
                    const r = el.getBoundingClientRect();
                    const x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
                    const y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
                    animate(el, { x: x * strength, y: y * strength }, { type: 'spring', stiffness: 300, damping: 20 });
                });
                el.addEventListener('pointerleave', () => {
                    animate(el, { x: 0, y: 0 }, { type: 'spring', stiffness: 300, damping: 20 });
                });
            });
        }).catch(() => {});
    },

    // Skills filter — the same sliding-highlight "animated tabs" interaction
    // as the top-right nav (see initNavHighlight/moveThumb), reapplied here
    // to filter skill chips by category. Unlike the nav thumb, this one is
    // visible from the start (it reflects a persistent selection — "All" —
    // not a hover preview), and it filters the .skill-chip grid on click.
    initSkillsFilter() {
        const filter = document.getElementById('skills-filter');
        if (!filter) return;
        const buttons = filter.querySelectorAll('button');
        const thumb = filter.querySelector('.skills-filter-thumb');
        const chips = document.querySelectorAll('.skill-chip');

        const moveFilterThumb = (btn) => {
            if (!thumb || !btn) return;
            thumb.style.transform = `translateX(${btn.offsetLeft}px)`;
            thumb.style.width = `${btn.offsetWidth}px`;
            thumb.classList.add('is-visible');
        };

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.toggle('is-active', b === btn));
                moveFilterThumb(btn);
                const category = btn.dataset.filter;
                chips.forEach(chip => {
                    chip.classList.toggle('is-hidden', category !== 'all' && chip.dataset.category !== category);
                });
            });
        });

        moveFilterThumb(filter.querySelector('button.is-active'));
    },

    // Experience role cards: click-to-expand disclosure, reusing the same
    // 0fr->1fr spring pattern as the project tiles (see .exp-card-disclosure
    // in styles.css) but click-only — no hover-expand, since these hold
    // denser text that shouldn't pop open from a passing cursor.
    initExpCards() {
        document.querySelectorAll('.exp-card-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.exp-card');
                const expanded = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', String(!expanded));
                card.classList.toggle('is-open', !expanded);
            });
        });
    },

    initProjectReveal() {
        document.querySelectorAll('.project-tile').forEach(tile => {
            const toggle = () => {
                const expanded = tile.getAttribute('aria-expanded') === 'true';
                tile.setAttribute('aria-expanded', String(!expanded));
                tile.classList.toggle('is-revealed', !expanded);
            };
            tile.addEventListener('click', event => {
                if (!event.target.closest('a')) toggle();
            });
            tile.addEventListener('keydown', event => {
                if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('a')) {
                    event.preventDefault();
                    toggle();
                }
            });
        });
    },

    setupEventListeners() {
        document.querySelectorAll('#side-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(link.getAttribute('href').substring(1));
                target?.scrollIntoView({ behavior: 'smooth' });
                this.elems.sideNavLinks.classList.remove('active');
                this.elems.hamburger.classList.remove('active');
                this.elems.hamburger.setAttribute('aria-expanded', 'false');
            });
        });

        this.elems.hamburger.addEventListener('click', () => {
            const isActive = this.elems.hamburger.classList.toggle('active');
            this.elems.sideNavLinks.classList.toggle('active', isActive);
            this.elems.hamburger.setAttribute('aria-expanded', String(isActive));
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
