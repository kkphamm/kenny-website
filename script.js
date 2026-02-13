const App = {
    isMobile: window.innerWidth <= 768,
    elems: {
        nav: document.getElementById('main-nav'),
        sections: document.querySelectorAll('section'),
        hero: document.getElementById('hero-section'),
        scrollThumb: document.getElementById('custom-scrollbar-thumb'),
        scrollbar: document.getElementById('custom-scrollbar'),
        hamburger: document.getElementById('mobile-menu-toggle'),
        navLinks: document.querySelector('.nav-links')
    },

    init() {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);
        
        this.animateName();
        this.setupEventListeners();
        this.handleResize();
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
        
        // Sticky Nav
        this.elems.nav.classList.toggle('fixed-nav', scrollY > heroH);

        // Horizontal Scroll Logic
        const totalH = document.getElementById('main-content').offsetHeight - window.innerHeight;
        const progress = Math.min(Math.max((scrollY - heroH) / (totalH - heroH), 0), 1);
        
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
        const totalProg = scrollY / totalH;
        this.elems.scrollThumb.style.height = `${thumbH}%`;
        this.elems.scrollThumb.style.top = `${Math.min(Math.max(totalProg * 100, 0), 100 - thumbH)}%`;
        
        this.updateActiveLink();
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
                    if(this.isMobile) this.updateActiveLink();
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
                    const scrollable = document.getElementById('main-content').offsetHeight - window.innerHeight - heroH;
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
            const totalH = document.getElementById('main-content').offsetHeight - window.innerHeight;
            window.scrollTo(0, pct * totalH);
        });

        window.addEventListener('resize', () => this.handleResize());
    },

    handleResize() {
        this.isMobile = window.innerWidth <= 768;
        if (this.isMobile) {
            this.elems.sections.forEach(s => { s.style.transform = ''; s.style.opacity = 1; s.style.pointerEvents = 'auto'; });
        } else {
            this.updateScroll();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());