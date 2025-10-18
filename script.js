// Dynamic Letter Generation and Animation
(function() {
    // Select the name display container
    const nameContainer = document.getElementById('name-display');
    
    // Define the target name
    const myName = "Kenny";
    
    // Create and append span elements for each character
    for (let i = 0; i < myName.length; i++) {
        const span = document.createElement('span');
        span.textContent = myName[i];
        span.className = 'glass-letter';
        nameContainer.appendChild(span);
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
    const lastLetterDelay = (myName.length - 1) * 0.2;
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

// --- Scrolling and Navigation Enhancement ---
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('main-nav');
    const heroSection = document.getElementById('hero-section');
    const mainContent = document.getElementById('main-content');
    const sections = document.querySelectorAll('#main-content section');
    const heroSectionHeight = heroSection.offsetHeight;
    const customScrollbar = document.getElementById('custom-scrollbar');
    const customScrollbarThumb = document.getElementById('custom-scrollbar-thumb');

    // 1. Sticky Navigation Logic
    window.addEventListener('scroll', () => {
        if (window.scrollY > heroSectionHeight - 80) {
            nav.classList.add('fixed-nav');
        } else {
            nav.classList.remove('fixed-nav');
        }
    });

    // 2. Horizontal Scroll Effect (Slower)
    function updateHorizontalScroll() {
        const scrollY = window.scrollY;
        const contentStart = heroSectionHeight;
        const contentScroll = scrollY - contentStart;
        
        // Calculate total scrollable area
        const maxScroll = mainContent.offsetHeight - window.innerHeight;
        const totalScrollProgress = Math.min(Math.max((scrollY - heroSectionHeight) / maxScroll, 0), 1);
        
        // Update custom scrollbar
        if (scrollY > heroSectionHeight) {
            customScrollbar.style.opacity = '1';
            const thumbWidth = (1 / sections.length) * 100; // Width based on number of sections
            customScrollbarThumb.style.width = `${thumbWidth}%`;
            customScrollbarThumb.style.left = `${totalScrollProgress * (100 - thumbWidth)}%`;
        } else {
            customScrollbar.style.opacity = '0';
        }
        
        // Only apply horizontal scroll after hero section
        if (scrollY > heroSectionHeight) {
            // Calculate scroll progress (0 to 1)
            const scrollProgress = Math.min(contentScroll / maxScroll, 1);
            
            // Calculate how much to translate each section
            const viewportWidth = window.innerWidth;
            
            sections.forEach((section, index) => {
                // Each section slides in from right as you scroll
                const translateX = (index * viewportWidth) - (scrollProgress * viewportWidth * (sections.length - 1));
                
                // Apply transforms separately to maintain backdrop-filter
                section.style.left = `${translateX}px`;
                section.style.top = '50%';
                section.style.transform = 'translateY(-50%)';
                
                // Fade out sections that have scrolled past
                const opacity = 1 - Math.abs(translateX / viewportWidth);
                section.style.opacity = Math.max(0, Math.min(1, opacity));
                section.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
            });
        } else {
            // Hide all sections when in hero area
            sections.forEach((section) => {
                section.style.left = '100vw';
                section.style.top = '50%';
                section.style.transform = 'translateY(-50%)';
                section.style.opacity = '0';
                section.style.pointerEvents = 'none';
            });
        }
    }

    // Initial setup
    updateHorizontalScroll();
    
    // Update on scroll with throttling for performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = window.requestAnimationFrame(updateHorizontalScroll);
    });

    // Update on resize
    window.addEventListener('resize', updateHorizontalScroll);

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
        const thumbWidth = customScrollbarThumb.offsetWidth;
        
        // Calculate mouse position relative to scrollbar
        let mouseX = e.clientX - scrollbarRect.left;
        
        // Constrain within scrollbar bounds
        mouseX = Math.max(0, Math.min(mouseX, scrollbarRect.width - thumbWidth));
        
        // Calculate scroll progress (0 to 1)
        const scrollProgress = mouseX / (scrollbarRect.width - thumbWidth);
        
        // Calculate target scroll position
        const maxScroll = mainContent.offsetHeight - window.innerHeight;
        const targetScroll = heroSectionHeight + (scrollProgress * maxScroll);
        
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

    // Click anywhere on scrollbar to jump
    customScrollbar.addEventListener('click', (e) => {
        if (e.target === customScrollbar) {
            const scrollbarRect = customScrollbar.getBoundingClientRect();
            const thumbWidth = customScrollbarThumb.offsetWidth;
            const clickX = e.clientX - scrollbarRect.left - (thumbWidth / 2);
            
            const scrollProgress = Math.max(0, Math.min(1, clickX / (scrollbarRect.width - thumbWidth)));
            const maxScroll = mainContent.offsetHeight - window.innerHeight;
            const targetScroll = heroSectionHeight + (scrollProgress * maxScroll);
            
            window.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    });

    // Set cursor style
    customScrollbarThumb.style.cursor = 'grab';

    // 3. Smooth Scrolling Logic for Navigation
    const navLinks = document.querySelectorAll('#main-nav a');
    navLinks.forEach((link, index) => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Calculate the scroll position to center each section
            const totalContentScroll = mainContent.offsetHeight - window.innerHeight;
            
            // Calculate scroll position based on section index
            // For last section (Contact), ensure we can scroll all the way
            let targetScroll;
            if (index === sections.length - 1) {
                // For the last section, scroll to the very end
                targetScroll = heroSectionHeight + totalContentScroll;
            } else {
                const sectionProgress = index / (sections.length - 1);
                targetScroll = heroSectionHeight + (sectionProgress * totalContentScroll);
            }
            
            window.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        });
    });
});

