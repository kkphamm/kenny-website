const App = {
    isMobile: window.innerWidth <= 768,
    currentProjectIndex: 1,
    elems: {
        nav: document.getElementById('main-nav'),
        sections: document.querySelectorAll('section'),
        hero: document.getElementById('hero-section'),
        scrollThumb: document.getElementById('custom-scrollbar-thumb'),
        scrollbar: document.getElementById('custom-scrollbar'),
        hamburger: document.getElementById('mobile-menu-toggle'),
        navLinks: document.querySelector('.nav-links'),
        footer: document.querySelector('.site-footer'),
        projectsGrid: document.querySelector('.projects-grid'),
        projectCards: null,
        carouselPrev: document.querySelector('.carousel-prev'),
        carouselNext: document.querySelector('.carousel-next')
    },

    init() {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);
        const yearEl = document.getElementById('copyright-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
        this.animateName();
        this.setupEventListeners();
        this.handleResize();
        this.updateFooterVisibility();
    },

    animateName() {
        const container = document.getElementById('name-display');
        const text = this.isMobile ? "Kenny\nPham" : "Kenny     Pham";
        
        container.innerHTML = '';
        [...text].forEach((char, i) => {
            if (char === '\n') container.appendChild(document.createElement('br'));
            else {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.animation = `fallIn 0.84s ease-out ${i * 0.14}s forwards`;
                container.appendChild(span);
            }
        });

        // Nav animation follows name
        setTimeout(() => {
            this.elems.nav.style.animation = 'navFade 1s ease-out forwards';
            this.elems.nav.querySelectorAll('a').forEach((a, i) => {
                setTimeout(() => a.style.animation = 'fallIn 0.4s ease-out forwards', i * 100);
            });
        }, text.length * 140 + 800);
    },

    updateScroll() {
        if (this.isMobile) return; // Native scroll for mobile

        const scrollY = window.scrollY;
        const heroH = this.elems.hero.offsetHeight;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        
        // Sticky Nav
        this.elems.nav.classList.toggle('fixed-nav', scrollY > heroH);

        // Horizontal Scroll Logic
        const afterHero = Math.max(maxScroll - heroH, 1);
        const progress = Math.min(Math.max((scrollY - heroH) / afterHero, 0), 1);
        
        // Sections Transition
        if (scrollY > heroH) {
            const width = window.innerWidth;
            this.elems.sections.forEach((sec, i) => {
                const offset = width + (i * width) - (progress * width * this.elems.sections.length);
                sec.style.transform = `translateX(${offset}px) translateY(-50%)`;
                const opacity = 1 - Math.abs(offset / width);
                sec.style.opacity = Math.max(0, Math.min(1, opacity));
                sec.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
            });
        } else {
            this.elems.sections.forEach(s => { s.style.transform = 'translateX(100vw) translateY(-50%)'; s.style.opacity = 0; });
        }

        // Update Scrollbar
        const thumbH = 100 / this.elems.sections.length;
        const totalProg = maxScroll > 0 ? (scrollY / maxScroll) : 0;
        const maxTop = 100 - thumbH;
        this.elems.scrollThumb.style.height = `${thumbH}%`;
        this.elems.scrollThumb.style.top = `${Math.min(Math.max(totalProg * maxTop, 0), maxTop)}%`;
        
        this.updateActiveLink();
        this.updateFooterVisibility();
    },

    updateFooterVisibility() {
        if (!this.elems.footer) return;
        const scrollY = window.scrollY;
        const heroH = this.elems.hero.offsetHeight;
        const atEnd = scrollY + window.innerHeight >= document.documentElement.scrollHeight - 80;
        const pastHero = scrollY > heroH - 10;
        const show = this.isMobile ? atEnd : pastHero;
        this.elems.footer.classList.toggle('footer-visible', show);
    },

    updateActiveLink() {
        const centers = [];
        this.elems.sections.forEach(sec => {
            const rect = sec.getBoundingClientRect();
            // Logic differs for mobile (vertical) vs desktop (horizontal)
            const dist = this.isMobile 
                ? Math.abs(rect.top) 
                : Math.abs((rect.left + rect.width/2) - window.innerWidth/2);
            centers.push({ id: sec.id, dist });
        });
        
        const active = centers.sort((a,b) => a.dist - b.dist)[0];
        document.querySelectorAll('#main-nav a').forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === `#${active.id}`);
        });
    },

    setupEventListeners() {
        // Consolidated Scroll Listener
        let tick = false;
        window.addEventListener('scroll', () => {
            if (!tick) {
                window.requestAnimationFrame(() => {
                    this.updateScroll();
                    if (this.isMobile) this.updateActiveLink();
                    this.updateFooterVisibility();
                    tick = false;
                });
                tick = true;
            }
        });

        // Navigation Clicks
        document.querySelectorAll('#main-nav a').forEach((link, i) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isMobile) {
                    document.getElementById(link.getAttribute('href').substring(1)).scrollIntoView({behavior:'smooth'});
                    this.elems.navLinks.classList.remove('active');
                    this.elems.hamburger.classList.remove('active');
                } else {
                    const heroH = this.elems.hero.offsetHeight;
                    const scrollable = (document.documentElement.scrollHeight - window.innerHeight) - heroH;
                    window.scrollTo({
                        top: heroH + ((i+1) / this.elems.sections.length * scrollable),
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Mobile Menu
        this.elems.hamburger.addEventListener('click', () => {
            this.elems.hamburger.classList.toggle('active');
            this.elems.navLinks.classList.toggle('active');
        });

        // Scrollbar Dragging
        let isDrag = false;
        this.elems.scrollThumb.addEventListener('mousedown', () => isDrag = true);
        document.addEventListener('mouseup', () => isDrag = false);
        document.addEventListener('mousemove', (e) => {
            if(!isDrag || this.isMobile) return;
            const rect = this.elems.scrollbar.getBoundingClientRect();
            const pct = (e.clientY - rect.top) / rect.height;
            const heroH = this.elems.hero.offsetHeight;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo(0, pct * maxScroll);
        });

        window.addEventListener('resize', () => this.handleResize());

        // Projects Carousel with layered cards (disabled on mobile)
        if (!this.isMobile && this.elems.carouselPrev && this.elems.carouselNext && this.elems.projectsGrid) {
            this.elems.projectCards = this.elems.projectsGrid.querySelectorAll('.project-card');

            // Infinite loop: modulo arithmetic wraps index from last to first (and vice versa)
            this.elems.carouselPrev.addEventListener('click', () => {
                this.currentProjectIndex = (this.currentProjectIndex - 1 + this.elems.projectCards.length) % this.elems.projectCards.length;
                this.renderProjectCarousel();
            });

            this.elems.carouselNext.addEventListener('click', () => {
                this.currentProjectIndex = (this.currentProjectIndex + 1) % this.elems.projectCards.length;
                this.renderProjectCarousel();
            });

            setTimeout(() => this.renderProjectCarousel(), 100);
        }
    },

    normalizeProjectOffset(offset, total) {
        let normalized = ((offset % total) + total) % total;
        if (normalized > total / 2) normalized -= total;
        return normalized;
    },

    renderProjectCarousel() {
        if (this.isMobile || !this.elems.projectCards || !this.elems.projectCards.length) return;
        const total = this.elems.projectCards.length;

        this.elems.projectCards.forEach((card, i) => {
            const offset = this.normalizeProjectOffset(i - this.currentProjectIndex, total);
            card.classList.remove('carousel-center', 'carousel-left', 'carousel-right', 'carousel-hidden');

            if (offset === 0) card.classList.add('carousel-center');
            else if (offset === -1) card.classList.add('carousel-left');
            else if (offset === 1) card.classList.add('carousel-right');
            else card.classList.add('carousel-hidden');
        });
    },

    handleResize() {
        this.isMobile = window.innerWidth <= 768;
        if (this.isMobile) {
            this.elems.sections.forEach(s => { s.style.transform = ''; s.style.opacity = 1; s.style.pointerEvents = 'auto'; });
        } else {
            this.updateScroll();
            this.renderProjectCarousel();
        }
        this.updateFooterVisibility();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());