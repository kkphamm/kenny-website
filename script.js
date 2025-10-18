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
    });

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
    const navLinks = document.querySelectorAll('#main-nav a');
    navLinks.forEach((link, index) => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Calculate the scroll position to center each section
            const totalContentScroll = mainContent.offsetHeight - window.innerHeight;
            const scrollBuffer = 300; // Match the buffer from updateHorizontalScroll
            const heroTransitionStart = heroSectionHeight + scrollBuffer;
            
            // Calculate scroll position based on section index
            // Match the exact formula used in horizontal scroll animation
            const adjustedMaxScroll = totalContentScroll - scrollBuffer;
            
            let targetScroll;
            // Calculate the scrollProgress needed to center this section
            // With the new offset formula: each section centers at (index + 1) / sections.length
            const targetScrollProgress = (index + 1) / sections.length;
            
            // Convert scrollProgress to actual scroll position
            // This matches: scrollProgress = (scrollY - heroTransitionStart) / adjustedMaxScroll
            targetScroll = heroTransitionStart + (targetScrollProgress * adjustedMaxScroll);
            
            window.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        });
    });
});

