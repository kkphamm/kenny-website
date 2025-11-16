// Dynamic Letter Generation and Animation
(function() {
    // Select the name display container
    const nameContainer = document.getElementById('name-display');
    
    // Detect mobile
    const isMobile = window.innerWidth <= 768;
    
    // Define the target name
    let myName;
    if (isMobile) {
        // Mobile: Split first and last name into separate lines
        myName = "Kenny\nPham";
    } else {
        // Desktop: Keep on one line with spaces
        myName = "Kenny     Pham";
    }
    
    // Create and append span elements for each character
    for (let i = 0; i < myName.length; i++) {
        if (myName[i] === '\n') {
            // Add a line break for mobile
            const br = document.createElement('br');
            br.className = 'name-break';
            nameContainer.appendChild(br);
        } else {
            const span = document.createElement('span');
            span.textContent = myName[i];
            span.className = 'glass-letter';
            nameContainer.appendChild(span);
        }
    }
    
    // Apply staggered animation to each letter (slower timing)
    const letters = nameContainer.querySelectorAll('span');
    letters.forEach((letter, index) => {
        // Calculate delay: 0s, 0.2s, 0.4s, etc. (slower)
        const delay = index * 0.2;
        
        // Apply animation with staggered delay (1.2s duration, slower)
        letter.style.animation = `fallAndFadeIn 1.2s ease-out ${delay}s forwards`;
    });
    
    // Calculate when the last letter finishes animating
    // Last letter delay + animation duration
    const lastLetterDelay = (letters.length - 1) * 0.2;
    const nameAnimationEnd = lastLetterDelay + 1.2; // in seconds
    
    // Animate navigation bar after name animation completes
    const nav = document.getElementById('main-nav');
    const navLinks = nav.querySelectorAll('a');
    
    setTimeout(() => {
        // First fade in the nav container
        nav.style.animation = 'navFadeIn 1.5s ease-out forwards';
        
        // Then animate each link with staggered delays
        navLinks.forEach((link, index) => {
            const delay = index * 0.15; // 0s, 0.15s, 0.3s, 0.45s
            setTimeout(() => {
                link.style.animation = 'navLinkFall 0.6s ease-out forwards';
            }, delay * 1000);
        });
    }, nameAnimationEnd * 1000); // Convert to milliseconds
})();

// Prevent browser from restoring scroll position on refresh
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// Force scroll to top immediately
window.scrollTo(0, 0);

// --- Scrolling and Navigation Enhancement ---
document.addEventListener('DOMContentLoaded', () => {
    // Ensure we're at the top
    window.scrollTo(0, 0);
    
    const nav = document.getElementById('main-nav');
    const heroSection = document.getElementById('hero-section');
    const mainContent = document.getElementById('main-content');
    const sections = document.querySelectorAll('#main-content section');
    const heroSectionHeight = heroSection.offsetHeight;
    const customScrollbar = document.getElementById('custom-scrollbar');
    const customScrollbarThumb = document.getElementById('custom-scrollbar-thumb');

    // 1. Sticky Navigation Logic
    window.addEventListener('scroll', () => {
        // Nav becomes sticky at end of hero (buffer doesn't affect nav)
        if (window.scrollY > heroSectionHeight) {
            nav.classList.add('fixed-nav');
        } else {
            nav.classList.remove('fixed-nav');
        }
        
        // Update active navigation link
        updateActiveNavLink();
    });
    
    // Function to update active navigation link based on current section
    function updateActiveNavLink() {
        const navLinks = document.querySelectorAll('#main-nav a');
        const isMobileView = window.innerWidth <= 768;
        
        if (isMobileView) {
            // Mobile: Check which section is in viewport vertically
            let currentSection = null;
            let maxVisibility = 0;
            
            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                
                // Calculate how much of the section is visible
                const visibleTop = Math.max(0, rect.top);
                const visibleBottom = Math.min(viewportHeight, rect.bottom);
                const visibleHeight = Math.max(0, visibleBottom - visibleTop);
                const visibilityRatio = visibleHeight / viewportHeight;
                
                if (visibilityRatio > maxVisibility) {
                    maxVisibility = visibilityRatio;
                    currentSection = section;
                }
            });
            
            // Update active class
            navLinks.forEach(link => {
                const targetId = link.getAttribute('href').substring(1);
                if (currentSection && currentSection.id === targetId) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        } else {
            // Desktop: Check which section is most centered (horizontal scroll)
            let currentSection = null;
            let minDistance = Infinity;
            
            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                const sectionCenter = rect.left + rect.width / 2;
                const viewportCenter = window.innerWidth / 2;
                const distance = Math.abs(sectionCenter - viewportCenter);
                
                if (distance < minDistance && rect.left < viewportCenter && rect.right > viewportCenter) {
                    minDistance = distance;
                    currentSection = section;
                }
            });
            
            // Update active class
            navLinks.forEach(link => {
                const targetId = link.getAttribute('href').substring(1);
                if (currentSection && currentSection.id === targetId) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
    }

    // 2. Horizontal Scroll Effect (Slower)
    function updateHorizontalScroll() {
        const scrollY = window.scrollY;
        const contentStart = heroSectionHeight;
        const contentScroll = scrollY - contentStart;
        
        // Calculate total scrollable area
        const maxScroll = mainContent.offsetHeight - window.innerHeight;
        // Calculate progress from start of page (including hero)
        const totalPageScroll = heroSectionHeight + maxScroll;
        const totalScrollProgress = Math.min(Math.max(scrollY / totalPageScroll, 0), 1);
        
        // Update custom scrollbar (vertical) - always visible
        customScrollbar.style.opacity = '1';
        const thumbHeight = (1 / sections.length) * 100; // Height based on number of sections
        customScrollbarThumb.style.height = `${thumbHeight}%`;
        customScrollbarThumb.style.top = `${totalScrollProgress * (100 - thumbHeight)}%`;
        
        // Start showing content sections after full hero section + buffer
        const scrollBuffer = 300; // Creates 300px of "dead space" scrolling
        const heroTransitionStart = heroSectionHeight + scrollBuffer;
        
        if (scrollY > heroTransitionStart) {
            // Calculate scroll progress (0 to 1) starting from end of hero + buffer
            const adjustedScroll = scrollY - heroTransitionStart;
            const adjustedMaxScroll = maxScroll - scrollBuffer;
            const scrollProgress = Math.min(adjustedScroll / adjustedMaxScroll, 1);
            
            // Calculate how much to translate each section
            const viewportWidth = window.innerWidth;
            
            sections.forEach((section, index) => {
                // All sections start off-screen to the right, then slide in one by one
                const baseOffset = viewportWidth; // Start all sections one viewport to the right
                const translateX = baseOffset + (index * viewportWidth) - (scrollProgress * viewportWidth * sections.length);
                
                // Use transform for better performance (GPU-accelerated)
                section.style.transform = `translateX(${translateX}px) translateY(-50%)`;
                
                // Fade out sections that have scrolled past
                const opacity = 1 - Math.abs(translateX / viewportWidth);
                section.style.opacity = Math.max(0, Math.min(1, opacity));
                section.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
            });
        } else {
            // Hide all sections when in hero area
            sections.forEach((section) => {
                section.style.transform = 'translateX(100vw) translateY(-50%)';
                section.style.opacity = '0';
                section.style.pointerEvents = 'none';
            });
        }
    }

    // Initial setup
    updateHorizontalScroll();
    updateActiveNavLink(); // Set initial active link
    
    // Update on scroll with throttling for performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = window.requestAnimationFrame(updateHorizontalScroll);
    });

    // Update on resize
    window.addEventListener('resize', () => {
        updateHorizontalScroll();
        updateActiveNavLink(); // Update active link on resize
    });

    // 4. Draggable Custom Scrollbar
    let isDragging = false;
    
    customScrollbarThumb.addEventListener('mousedown', (e) => {
        isDragging = true;
        customScrollbarThumb.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const scrollbarRect = customScrollbar.getBoundingClientRect();
        const thumbHeight = customScrollbarThumb.offsetHeight;
        
        // Calculate mouse position relative to scrollbar (vertical)
        let mouseY = e.clientY - scrollbarRect.top;
        
        // Constrain within scrollbar bounds
        mouseY = Math.max(0, Math.min(mouseY, scrollbarRect.height - thumbHeight));
        
        // Calculate scroll progress (0 to 1)
        const scrollProgress = mouseY / (scrollbarRect.height - thumbHeight);
        
        // Calculate target scroll position (from start of page)
        const maxScroll = mainContent.offsetHeight - window.innerHeight;
        const totalPageScroll = heroSectionHeight + maxScroll;
        const targetScroll = scrollProgress * totalPageScroll;
        
        // Apply scroll
        window.scrollTo({
            top: targetScroll,
            behavior: 'auto' // Instant for dragging
        });
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            customScrollbarThumb.style.cursor = 'grab';
        }
    });

    // Click anywhere on scrollbar to jump (vertical)
    customScrollbar.addEventListener('click', (e) => {
        if (e.target === customScrollbar) {
            const scrollbarRect = customScrollbar.getBoundingClientRect();
            const thumbHeight = customScrollbarThumb.offsetHeight;
            const clickY = e.clientY - scrollbarRect.top - (thumbHeight / 2);
            
            const scrollProgress = Math.max(0, Math.min(1, clickY / (scrollbarRect.height - thumbHeight)));
            const maxScroll = mainContent.offsetHeight - window.innerHeight;
            const totalPageScroll = heroSectionHeight + maxScroll;
            const targetScroll = scrollProgress * totalPageScroll;
            
            window.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    });

    // Set cursor style
    customScrollbarThumb.style.cursor = 'grab';

    // 3. Smooth Scrolling Logic for Navigation
    const allNavLinks = document.querySelectorAll('#main-nav a');
    allNavLinks.forEach((link, index) => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const isMobileView = window.innerWidth <= 768;
            
            if (isMobileView) {
                // Mobile: Simple scroll to section
                const targetId = link.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            } else {
                // Desktop: Horizontal scroll calculation
                const totalContentScroll = mainContent.offsetHeight - window.innerHeight;
                const scrollBuffer = 300;
                const heroTransitionStart = heroSectionHeight + scrollBuffer;
                const adjustedMaxScroll = totalContentScroll - scrollBuffer;
                
                let targetScroll;
                const targetScrollProgress = (index + 1) / sections.length;
                targetScroll = heroTransitionStart + (targetScrollProgress * adjustedMaxScroll);
                
                window.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            }
            
            // Update active link after a brief delay to ensure scroll position is updated
            setTimeout(() => {
                updateActiveNavLink();
            }, 100);
        });
    });

    // Mobile menu toggle functionality
    const hamburger = document.getElementById('mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target)) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
    }

    // Mobile-specific optimizations
    const isMobile = window.innerWidth <= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isChromeMobile = isChrome && isMobile;

    if (isMobile) {
        // Disable horizontal scrolling on mobile - sections stack vertically
        sections.forEach((section) => {
            section.style.position = 'relative';
            section.style.transform = 'none';
            section.style.opacity = '1';
            section.style.pointerEvents = 'auto';
            
            // Chrome mobile specific optimization
            if (isChromeMobile) {
                section.style.webkitTransform = 'translateZ(0)';
                section.style.transform = 'translateZ(0)';
            }
        });

        // Chrome mobile viewport height fix
        if (isChromeMobile) {
            const setViewportHeight = () => {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            };
            setViewportHeight();
            window.addEventListener('resize', setViewportHeight);
        }

        // Override the horizontal scroll function for mobile
        function updateHorizontalScroll() {
            // Do nothing on mobile - sections are stacked
        }
    } else if (isMobile || isTouchDevice) {
        // Disable custom scrollbar on mobile (already hidden in CSS)
        if (customScrollbar) {
            customScrollbar.style.display = 'none';
        }

        // Optimize scroll performance on mobile
        let mobileScrollTimeout;
        const mobileScrollHandler = () => {
            if (mobileScrollTimeout) {
                clearTimeout(mobileScrollTimeout);
            }
            mobileScrollTimeout = setTimeout(() => {
                updateHorizontalScroll();
            }, 50); // Throttle scroll updates on mobile
        };

        // Replace the scroll listener with mobile-optimized version
        window.removeEventListener('scroll', () => {
            if (scrollTimeout) {
                window.cancelAnimationFrame(scrollTimeout);
            }
            scrollTimeout = window.requestAnimationFrame(updateHorizontalScroll);
        });

        window.addEventListener('scroll', mobileScrollHandler, { passive: true });

        // Add touch-specific navigation improvements
        navLinks.forEach(link => {
            link.addEventListener('touchend', (e) => {
                // Ensure smooth scrolling works on touch devices
                e.preventDefault();
                link.click();
            }, { passive: false });
        });

        // Prevent double-tap zoom on navigation
        let lastTouchEnd = 0;
        nav.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
    }

    // Handle orientation changes and window resize
    function handleResize() {
        const isMobileView = window.innerWidth <= 768;
        
        if (isMobileView) {
            // Switch to mobile mode
            sections.forEach((section) => {
                section.style.position = 'relative';
                section.style.transform = 'none';
                section.style.opacity = '1';
                section.style.pointerEvents = 'auto';
            });
            
            if (customScrollbar) {
                customScrollbar.style.display = 'none';
            }
        } else {
            // Switch to desktop mode
            sections.forEach((section) => {
                section.style.position = '';
                section.style.transform = '';
                section.style.opacity = '';
                section.style.pointerEvents = '';
            });
            
            if (customScrollbar) {
                customScrollbar.style.display = '';
            }
            
            // Close mobile menu if open
            if (hamburger && navLinks) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            }
            
            updateHorizontalScroll();
        }
    }

    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            handleResize();
        }, 100);
    });

    window.addEventListener('resize', () => {
        handleResize();
    });
});

