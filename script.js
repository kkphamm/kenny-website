class DesktopEnvironment {
    constructor() {
        this.windows = new Map();
        this.activeWindow = null;
        this.windowCounter = 0;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.isDraggingIcon = false;
        this.draggedIcon = null;
        this.iconDragOffset = { x: 0, y: 0 };
        this.windowPositions = new Map(); // Store window positions
        this.maximizedWindows = new Set(); // Track maximized windows
        
        this.init();
    }
    
    init() {
        this.setupIconListeners();
        this.setupDesktopListener();
        this.positionRandomImage();
        this.positionIcons();
        this.setupClock();
        this.setupAppIconListeners();
        this.setupMusicPlayer();
    }
    
    setupIconListeners() {
        const icons = document.querySelectorAll('.desktop-icon');
        console.log(`Found ${icons.length} desktop icons`);
        icons.forEach((icon, index) => {
            console.log(`Setting up listener for icon ${index}:`, icon.dataset.window);
            
            // Click to open window
            icon.addEventListener('click', (e) => {
                if (!this.isDraggingIcon) {
                    console.log('Icon clicked:', icon.dataset.window);
                    e.stopPropagation();
                    const windowType = icon.dataset.window;
                    this.openWindow(windowType, icon);
                }
            });
            
            // Drag functionality
            icon.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.startIconDrag(icon, e);
            });
        });
    }
    
    setupDesktopListener() {
        document.getElementById('desktop').addEventListener('click', () => {
            this.bringToFront(null);
        });
    }
    
    openWindow(type, iconElement) {
        console.log('openWindow called with type:', type);
        // Close existing window of same type
        if (this.windows.has(type)) {
            console.log('Window already exists, closing it');
            this.closeWindow(type);
            return;
        }
        
        const iconRect = iconElement.getBoundingClientRect();
        const desktopRect = document.getElementById('desktop').getBoundingClientRect();
        
        // Calculate starting position relative to desktop
        const startX = iconRect.left - desktopRect.left;
        const startY = iconRect.top - desktopRect.top;
        
        // Create window (temporary position, we'll re-center after measuring size)
        const windowElement = this.createWindow(type, startX, startY);
        this.windows.set(type, windowElement);
        
        // Set animation start position
        windowElement.style.setProperty('--start-x', `0px`);
        windowElement.style.setProperty('--start-y', `0px`);
        
        // Position window at start location
        windowElement.style.left = `${startX}px`;
        windowElement.style.top = `${startY}px`;
        windowElement.style.transform = 'scale(0)';
        
        document.getElementById('desktop').appendChild(windowElement);
 
        // If About or Projects, shrink width by 25% and lock it
        if (type === 'about' || type === 'projects') {
            const initialWidth = windowElement.offsetWidth;
            const desiredWidth = Math.max(320, Math.round(initialWidth * 0.75));
            windowElement.style.width = `${desiredWidth}px`;
            windowElement.style.minWidth = `${desiredWidth}px`;
            windowElement.style.maxWidth = `${desiredWidth}px`;
            windowElement.dataset.fixedSize = 'true';
        } else {
            windowElement.dataset.fixedSize = 'false';
        }

        // Trigger animation
        requestAnimationFrame(() => {
            // Check for saved position first
            let finalX, finalY;
            if (this.windowPositions.has(type)) {
                const savedPos = this.windowPositions.get(type);
                finalX = savedPos.x;
                finalY = savedPos.y;
            } else {
                // Measure actual size and compute true center
                const measuredWidth = windowElement.offsetWidth;
                const measuredHeight = windowElement.offsetHeight;
                finalX = Math.max(0, (window.innerWidth - measuredWidth) / 2);
                finalY = Math.max(0, (window.innerHeight - measuredHeight) / 2);
            }
            
            // Update end transform delta for smoother animation from icon
            windowElement.style.setProperty('--start-x', `${startX - finalX}px`);
            windowElement.style.setProperty('--start-y', `${startY - finalY}px`);
            
            windowElement.style.left = `${finalX}px`;
            windowElement.style.top = `${finalY}px`;
            windowElement.style.transform = 'scale(1)';
            windowElement.classList.add('window-animate-in');
        });
        
        this.bringToFront(type);
        this.updateAppIconStates();
    }
    
    createWindow(type, x, y) {
        const windowElement = document.createElement('div');
        windowElement.className = 'window';
        windowElement.style.left = `${x}px`;
        windowElement.style.top = `${y}px`;
        
        const titleBar = document.createElement('div');
        titleBar.className = 'title-bar';
        titleBar.innerHTML = `
            <span class="font-medium">${this.getWindowTitle(type)}</span>
            <div class="close-btn" data-window="${type}">×</div>
        `;
        
        const content = document.createElement('div');
        content.className = 'window-content';
        content.innerHTML = this.getWindowContent(type);
        
        windowElement.appendChild(titleBar);
        windowElement.appendChild(content);
        
        // Add event listeners
        this.setupWindowListeners(windowElement, type);
        
        return windowElement;
    }
    
    setupWindowListeners(windowElement, type) {
        const titleBar = windowElement.querySelector('.title-bar');
        const closeBtn = windowElement.querySelector('.close-btn');
        
        // Window click to bring to front
        windowElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.bringToFront(type);
        });
        
        // Close button
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeWindow(type);
        });
        
        // Drag functionality
        titleBar.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startDrag(windowElement, e, type);
        });
        
        // Double-click to maximize/restore
        titleBar.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.toggleMaximize(type);
        });
    }
    
    startDrag(windowElement, e, type) {
        this.isDragging = true;
        this.bringToFront(type);
        
        const rect = windowElement.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        // Lock size during drag to prevent any layout-driven resizing
        const lockedWidth = windowElement.offsetWidth;
        const lockedHeight = windowElement.offsetHeight;
        windowElement.style.width = `${lockedWidth}px`;
        windowElement.style.height = `${lockedHeight}px`;
        
        const handleMouseMove = (e) => {
            if (!this.isDragging) return;
            
            const desktopRect = document.getElementById('desktop').getBoundingClientRect();
            const newX = e.clientX - desktopRect.left - this.dragOffset.x;
            const newY = e.clientY - desktopRect.top - this.dragOffset.y;
            
            // Keep window within bounds
            const maxX = desktopRect.width - windowElement.offsetWidth;
            const maxY = desktopRect.height - windowElement.offsetHeight;
            
            const clampedX = Math.max(0, Math.min(newX, maxX));
            const clampedY = Math.max(0, Math.min(newY, maxY));
            windowElement.style.left = `${clampedX}px`;
            windowElement.style.top = `${clampedY}px`;
            
            // Save position for future opens
            this.windowPositions.set(type, { x: clampedX, y: clampedY });
        };
        
        const handleMouseUp = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            // Unlock size after drag completes only for non-fixed windows
            const isFixed = windowElement.dataset.fixedSize === 'true';
            if (!isFixed) {
                windowElement.style.width = '';
                windowElement.style.height = '';
                windowElement.style.minWidth = '';
                windowElement.style.maxWidth = '';
            }
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    toggleMaximize(type) {
        const windowElement = this.windows.get(type);
        if (!windowElement) return;
        
        if (this.maximizedWindows.has(type)) {
            // Restore
            this.maximizedWindows.delete(type);
            windowElement.classList.remove('maximized');
            
            // Restore to saved position or center
            let restoreX, restoreY;
            if (this.windowPositions.has(type)) {
                const savedPos = this.windowPositions.get(type);
                restoreX = savedPos.x;
                restoreY = savedPos.y;
            } else {
                const measuredWidth = windowElement.offsetWidth;
                const measuredHeight = windowElement.offsetHeight;
                restoreX = Math.max(0, (window.innerWidth - measuredWidth) / 2);
                restoreY = Math.max(0, (window.innerHeight - measuredHeight) / 2);
            }
            
            windowElement.style.left = `${restoreX}px`;
            windowElement.style.top = `${restoreY}px`;
            windowElement.style.width = '';
            windowElement.style.height = '';
        } else {
            // Maximize
            this.maximizedWindows.add(type);
            windowElement.classList.add('maximized');
            
            // Save current position before maximizing
            const currentX = parseInt(windowElement.style.left) || 0;
            const currentY = parseInt(windowElement.style.top) || 0;
            this.windowPositions.set(type, { x: currentX, y: currentY });
            
            // Maximize to fill screen
            windowElement.style.left = '0px';
            windowElement.style.top = '0px';
            windowElement.style.width = '100vw';
            windowElement.style.height = '100vh';
        }
    }
    
    closeWindow(type) {
        const windowElement = this.windows.get(type);
        if (!windowElement) return;
        
        // Find the icon to animate back to
        const icon = document.querySelector(`[data-window="${type}"]`);
        const iconRect = icon.getBoundingClientRect();
        const desktopRect = document.getElementById('desktop').getBoundingClientRect();
        const windowRect = windowElement.getBoundingClientRect();
        
        // Calculate end position
        const endX = iconRect.left - desktopRect.left - windowRect.left;
        const endY = iconRect.top - desktopRect.top - windowRect.top;
        
        windowElement.style.setProperty('--end-x', `${endX}px`);
        windowElement.style.setProperty('--end-y', `${endY}px`);
        
        windowElement.classList.remove('window-animate-in');
        windowElement.classList.add('window-animate-out');
        
        setTimeout(() => {
            windowElement.remove();
            this.windows.delete(type);
            if (this.activeWindow === type) {
                this.activeWindow = null;
            }
            this.updateAppIconStates();
        }, 300);
    }
    
    bringToFront(type) {
        // Remove active class from all windows
        this.windows.forEach((windowElement, windowType) => {
            windowElement.classList.remove('active');
        });
        
        if (type && this.windows.has(type)) {
            this.windows.get(type).classList.add('active');
            this.activeWindow = type;
        }
    }
    
    getWindowTitle(type) {
        const titles = {
            about: 'About Me',
            projects: 'Projects',
            contact: 'Contact',
            hobbies: 'Hobbies'
        };
        return titles[type] || 'Window';
    }
    
    getWindowContent(type) {
        const contents = {
            about: `
                <h2 class="text-2xl font-semibold text-[#36454F] mb-2">About Me</h2>
                <div class="space-y-4 text-[#36454F]">
                    <div class="space-y-1">
                        <h3 class="text-xl font-semibold">Kenny Pham</h3>
                        <p class="text-sm text-[#87A96B]">Aspiring Software Engineer • AI Enthusiast</p>
                    </div>
                    <p>I'm an aspiring Software Engineer passionate about Artificial Intelligence. I'm seeking an internship where I can apply strong analytical skills and my coursework in data structures and algorithms to build impactful software.</p>
                    <div class="grid grid-cols-1 gap-4">
                        <div class="p-4 bg-[#F5F5DC] rounded-lg">
                            <h3 class="font-medium mb-2">Education</h3>
                            <ul class="text-sm space-y-1">
                                <li><span class="font-medium">University of California, Berkeley</span> — Electrical Engineering & Computer Sciences (Present)</li>
                                <li><span class="font-medium">Irvine Valley College</span> — A.S. Computer Science, A.S. Physics (4.00 GPA), Fall 2023 – May 2025</li>
                            </ul>
                        </div>
                        <div class="p-4 bg-[#F5F5DC] rounded-lg">
                            <h3 class="font-medium mb-2">Technical Skills</h3>
                            <p class="text-sm">Java, Python, C++ · OOP · Data Structures & Algorithms · Machine Learning</p>
                        </div>
                    </div>
                </div>
            `,
            projects: `
                <h2 class="text-2xl font-semibold text-[#36454F] mb-4">Projects</h2>
                <div class="space-y-4">
                    <div class="p-4 border border-[#87A96B] rounded-lg">
                        <h3 class="font-medium text-[#36454F] mb-2">Web Applications</h3>
                        <p class="text-sm text-[#36454F] mb-2">Built blogs and portfolio sites as part of The Odin Project, focusing on responsive design, accessibility, and interactive UI patterns. Portfolio available on GitHub.</p>
                        <span class="text-xs text-[#87A96B]">HTML • CSS • JavaScript</span>
                    </div>
                    <div class="p-4 border border-[#87A96B] rounded-lg">
                        <h3 class="font-medium text-[#36454F] mb-2">Heart Disease Prediction</h3>
                        <p class="text-sm text-[#36454F] mb-2">Implemented Random Forest and Logistic Regression models on a UCI dataset. Included preprocessing, hyperparameter tuning (GridSearchCV), and evaluation via accuracy, confusion matrices, and classification reports.</p>
                        <span class="text-xs text-[#87A96B]">Python • scikit-learn • Pandas • NumPy</span>
                    </div>
                    <div class="p-4 border border-[#87A96B] rounded-lg">
                        <h3 class="font-medium text-[#36454F] mb-2">Hey Computer</h3>
                        <p class="text-sm text-[#36454F] mb-2">A Python voice assistant to open/close applications using a multi-stage pipeline: wake word detection (Picovoice Porcupine), audio capture (PyAudio), and speech-to-text (OpenAI Whisper/Google Speech API).</p>
                        <span class="text-xs text-[#87A96B]">Python • Porcupine • PyAudio • Whisper</span>
                    </div>
                </div>
            `,
            contact: `
                <h2 class="text-2xl font-semibold text-[#36454F] mb-4">Get In Touch</h2>
                <div class="space-y-4 text-[#36454F]">
                    <p>I'd love to connect! Whether you have a project in mind or want cafe recommendations, feel free to reach out.</p>
                    <div class="space-y-3">
                        <div class="flex items-center space-x-3">
                            <svg class="w-5 h-5 text-[#87A96B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            <a class="underline" href="mailto:Kennypham12323@gmail.com">Kennypham12323@gmail.com</a>
                        </div>
                        <div class="flex items-center space-x-3">
                            <svg class="w-5 h-5 text-[#87A96B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            <span>Irvine, CA</span>
                        </div>
                        <div class="flex items-center space-x-3">
                            <svg class="w-5 h-5 text-[#87A96B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h2l3 7-1.34 2.68A2 2 0 008 17h8"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 17a2 2 0 104 0 2 2 0 00-4 0zM8 17a2 2 0 104 0 2 2 0 00-4 0z"/>
                            </svg>
                            <a class="underline" href="tel:19496646794">949-664-6794</a>
                        </div>
                    </div>
                    <div class="mt-6 p-4 bg-[#F5F5DC] rounded-lg space-y-2">
                        <p class="text-sm">LinkedIn: <a class="underline" target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/in/kenny-pham-a49723245/">View Profile</a></p>
                        <p class="text-sm">GitHub: <a class="underline" target="_blank" rel="noopener noreferrer" href="https://github.com/kkphamm">@kkphamm</a></p>
                    </div>
                </div>
            `,
            hobbies: `
                <h2 class="text-2xl font-semibold text-[#36454F] mb-4">Hobbies</h2>
                <div class="space-y-4">
                    <div class="p-4 border-l-4 border-[#87A96B] bg-[#F5F5DC] rounded-r-lg">
                        <h3 class="font-medium text-[#36454F] mb-2">Matcha, Coffee, and Cafés</h3>
                        <p class="text-sm text-[#36454F]">I love getting Matcha and Coffee and trying new Cafes! Please reach out for any reccomendations.</p>
                    </div>
                    <div class="p-4 border-l-4 border-[#87A96B] bg-[#F5F5DC] rounded-r-lg">
                        <h3 class="font-medium text-[#36454F] mb-2">Weightlifting</h3>
                        <p class="text-sm text-[#36454F]">I enjoy weightlifting in my free time. I usually go to the gym 5-6 days per week.</p>
                    </div>
                </div>
            `
        };
        return contents[type] || '<p>Content coming soon...</p>';
    }
    
    positionRandomImage() {
        const randomImage = document.getElementById('random-image');
        if (!randomImage) return;
        
        // Get desktop dimensions
        const desktop = document.getElementById('desktop');
        const desktopRect = desktop.getBoundingClientRect();
        
        // Define excluded areas
        const iconAreaWidth = 220; // Left side desktop icons (2x2 layout)
        const musicPlayerWidth = 100; // Top right music player
        const musicPlayerHeight = 120; // Music player height
        const socialIconsWidth = 120; // Bottom left social icons
        const socialIconsHeight = 60; // Social icons height
        const clockWidgetWidth = 140; // Bottom right clock
        const clockWidgetHeight = 80; // Clock height
        const appIconsWidth = 200; // Bottom center app icons
        const appIconsHeight = 60; // App icons height
        
        // Image dimensions (scaled up by 1.2x)
        const imageWidth = 144;
        const imageHeight = 144;
        
        // Calculate available area (excluding all icon areas)
        const availableWidth = desktopRect.width - iconAreaWidth - musicPlayerWidth;
        const availableHeight = desktopRect.height - musicPlayerHeight - socialIconsHeight - appIconsHeight;
        
        // Calculate random position in available area
        const maxX = Math.max(0, availableWidth - imageWidth);
        const maxY = Math.max(0, availableHeight - imageHeight);
        
        // Generate random position (avoiding all icon areas)
        const randomX = iconAreaWidth + Math.random() * maxX;
        const randomY = musicPlayerHeight + Math.random() * maxY;
        
        // Set position
        randomImage.style.left = `${randomX}px`;
        randomImage.style.top = `${randomY}px`;
        
        console.log(`Random image positioned at: ${randomX}, ${randomY} (avoiding all icon areas)`);
    }
    
    positionIcons() {
        const icons = document.querySelectorAll('.desktop-icon');
        const iconGrid = document.querySelector('.icon-grid');
        const gridRect = iconGrid.getBoundingClientRect();
        const desktopRect = document.getElementById('desktop').getBoundingClientRect();
        
        // Calculate relative positions within the grid (2x2 square)
        const iconSpacing = 100; // Space between icons
        const startX = 20; // Left padding
        const startY = 20; // Top padding
        
        icons.forEach((icon, index) => {
            const row = Math.floor(index / 2); // 0 or 1
            const col = index % 2; // 0 or 1
            
            const x = startX + (col * iconSpacing);
            const y = startY + (row * iconSpacing);
            
            icon.style.left = `${x}px`;
            icon.style.top = `${y}px`;
        });
    }
    
    startIconDrag(icon, e) {
        this.isDraggingIcon = true;
        this.draggedIcon = icon;
        icon.classList.add('dragging');
        
        const rect = icon.getBoundingClientRect();
        const desktopRect = document.getElementById('desktop').getBoundingClientRect();
        
        this.iconDragOffset.x = e.clientX - rect.left;
        this.iconDragOffset.y = e.clientY - rect.top;
        
        const handleMouseMove = (e) => {
            if (!this.isDraggingIcon) return;
            
            const newX = e.clientX - desktopRect.left - this.iconDragOffset.x;
            const newY = e.clientY - desktopRect.top - this.iconDragOffset.y;
            
            // Keep icon within desktop bounds
            const maxX = desktopRect.width - icon.offsetWidth;
            const maxY = desktopRect.height - icon.offsetHeight;
            
            icon.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            icon.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
        };
        
        const handleMouseUp = () => {
            this.isDraggingIcon = false;
            if (this.draggedIcon) {
                this.draggedIcon.classList.remove('dragging');
                this.draggedIcon = null;
            }
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    setupClock() {
        this.updateClock();
        // Update clock every second
        setInterval(() => {
            this.updateClock();
        }, 1000);
    }
    
    updateClock() {
        const now = new Date();
        
        // Format time (12-hour format with AM/PM)
        const timeOptions = { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        };
        const timeString = now.toLocaleTimeString('en-US', timeOptions);
        
        // Format date
        const dateOptions = { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        };
        const dateString = now.toLocaleDateString('en-US', dateOptions);
        
        // Update DOM elements
        const timeElement = document.getElementById('current-time');
        const dateElement = document.getElementById('current-date');
        
        if (timeElement) timeElement.textContent = timeString;
        if (dateElement) dateElement.textContent = dateString;
    }
    
    setupMusicPlayer() {
        const playPauseBtn = document.getElementById('play-pause-btn');
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        const disk = document.querySelector('.disk');
        const volumeSlider = document.getElementById('volume-slider');
        const volumeWidget = document.getElementById('volume-widget');
        const volumeToggle = document.getElementById('volume-toggle');
        const trackStatus = document.getElementById('track-status');
        
        // Audio playlist
        const playlist = [
            'music/track1.mp3',
            'music/track2.mp3',
            'music/track3.mp3',
            'music/track4.mp3',
            'music/track5.mp3'
        ];
        let currentTrackIndex = 0;
        const audio = new Audio(playlist[currentTrackIndex]);
        audio.preload = 'auto';
        audio.volume = 0.3; // start at ~30%
        
        let isPlaying = false;

        const updateTrackStatus = () => {
            if (!trackStatus) return;
            if (isPlaying) {
                trackStatus.textContent = `playing track ${currentTrackIndex + 1}`;
            } else {
                trackStatus.textContent = '';
            }
        };

        // Animate dots when playing: ., .., ...
        let dotInterval = null;
        const startDots = () => {
            if (!trackStatus) return;
            let step = 0;
            clearInterval(dotInterval);
            dotInterval = setInterval(() => {
                if (!isPlaying) return;
                step = (step + 1) % 3;
                const dots = '.'.repeat(step + 1);
                trackStatus.textContent = `playing track ${currentTrackIndex + 1}${dots}`;
            }, 500);
        };
        const stopDots = () => {
            clearInterval(dotInterval);
            dotInterval = null;
        };
        
        playPauseBtn.addEventListener('click', () => {
            isPlaying = !isPlaying;
            
            if (isPlaying) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
                disk.style.animationPlayState = 'running';
                audio.play().catch((err) => {
                    console.warn('Audio play blocked or failed:', err);
                });
                startDots();
            } else {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
                disk.style.animationPlayState = 'paused';
                audio.pause();
                stopDots();
            }
            updateTrackStatus();
        });
        
        // Add click handlers for prev/next buttons
        document.getElementById('prev-btn').addEventListener('click', () => {
            currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
            const wasPlaying = isPlaying;
            audio.src = playlist[currentTrackIndex];
            audio.currentTime = 0;
            if (wasPlaying) audio.play().catch(() => {});
            updateTrackStatus();
            if (isPlaying) startDots();
        });
        
        document.getElementById('next-btn').addEventListener('click', () => {
            currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
            const wasPlaying = isPlaying;
            audio.src = playlist[currentTrackIndex];
            audio.currentTime = 0;
            if (wasPlaying) audio.play().catch(() => {});
            updateTrackStatus();
            if (isPlaying) startDots();
        });

        // Auto-advance on ended
        audio.addEventListener('ended', () => {
            currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
            audio.src = playlist[currentTrackIndex];
            audio.currentTime = 0;
            if (isPlaying) audio.play().catch(() => {});
            updateTrackStatus();
            if (isPlaying) startDots();
        });

        // Volume control
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const value = Number(e.target.value);
                audio.volume = Math.max(0, Math.min(1, value / 100));
            });
        }

        // Volume toggle expand/collapse
        if (volumeToggle && volumeWidget) {
            volumeWidget.classList.remove('expanded');
            volumeToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                volumeWidget.classList.toggle('expanded');
            });
        }

        // Handle audio errors
        audio.addEventListener('error', (e) => {
            console.error('Audio error:', audio.error);
        });

        // Initialize status
        updateTrackStatus();
    }
    
    setupAppIconListeners() {
        const appIcons = document.querySelectorAll('.app-icon');
        appIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const windowType = icon.dataset.window;
                const desktopIcon = document.querySelector(`.desktop-icon[data-window="${windowType}"]`);
                if (desktopIcon) {
                    this.openWindow(windowType, desktopIcon);
                }
            });
        });
    }
    
    updateAppIconStates() {
        const appIcons = document.querySelectorAll('.app-icon');
        appIcons.forEach(icon => {
            const windowType = icon.dataset.window;
            if (this.windows.has(windowType)) {
                icon.classList.add('active');
            } else {
                icon.classList.remove('active');
            }
        });
    }
}

// Initialize the desktop environment when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing DesktopEnvironment...');
    try {
        new DesktopEnvironment();
        console.log('DesktopEnvironment initialized successfully');
    } catch (error) {
        console.error('Error initializing DesktopEnvironment:', error);
    }
});

// Also try to initialize if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
} else {
    // DOM is already loaded
    console.log('DOM already loaded, initializing DesktopEnvironment...');
    try {
        new DesktopEnvironment();
        console.log('DesktopEnvironment initialized successfully');
    } catch (error) {
        console.error('Error initializing DesktopEnvironment:', error);
    }
}
