/* ============================================================
   INTERACTIONS — Micro-Interactions & UI Polish
   ============================================================
   1. Navbar scroll effect — glass-morphism on scroll
   2. Mobile hamburger menu — toggle open/close
   3. Magnetic CTA button — cursor-following hover effect
   4. Scroll-triggered reveals — staggered bento card entrances
   5. Section header reveals — fade + slide animations
   6. CTA section reveal — scale + opacity entrance
   7. Smooth anchor scrolling — for navigation links
   8. [NEW] Pinned Dishes Showcase — GSAP scrub + pin
   9. [NEW] Location Map — 3D tilt on scroll entrance
   ============================================================ */

(function () {
    'use strict';

    /* ── DOM References ───────────────────────────────────── */
    var navbar        = document.getElementById('navbar');
    var hamburgerBtn  = document.getElementById('hamburgerBtn');
    var mobileMenu    = document.getElementById('mobileMenu');
    var magneticWrap  = document.getElementById('magneticWrap');
    var magneticBtn   = document.getElementById('magneticBtn');

    /* ── Reduced Motion Check ─────────────────────────────── */
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;



    /* ═══════════════════════════════════════════════════════
       1. NAVBAR SCROLL EFFECT
       Adds .is-scrolled class to navbar when user scrolls
       past a threshold. This triggers the glass-morphism
       background and shrink transition defined in CSS.
       ═══════════════════════════════════════════════════════ */
    var SCROLL_THRESHOLD = 20;    // Pixels before glass effect activates
    var lastScrollY      = 0;
    var navTicking       = false;

    function updateNavbar() {
        if (window.scrollY > SCROLL_THRESHOLD) {
            navbar.classList.add('scrolled', 'is-scrolled');
        } else {
            navbar.classList.remove('scrolled', 'is-scrolled');
        }
        navTicking = false;
    }

    window.addEventListener('scroll', function () {
        lastScrollY = window.scrollY;
        if (!navTicking) {
            requestAnimationFrame(updateNavbar);
            navTicking = true;
        }
    }, { passive: true });

    // Check initial scroll position (e.g., page refresh mid-scroll)
    updateNavbar();


    /* ═══════════════════════════════════════════════════════
       2. MOBILE HAMBURGER MENU
       Toggles the full-screen mobile menu overlay.
       Also closes the menu when a navigation link is clicked.
       ═══════════════════════════════════════════════════════ */
    var isMenuOpen = false;

    function toggleMenu() {
        isMenuOpen = !isMenuOpen;

        hamburgerBtn.classList.toggle('is-active', isMenuOpen);
        mobileMenu.classList.toggle('is-open', isMenuOpen);
        hamburgerBtn.setAttribute('aria-expanded', String(isMenuOpen));
        mobileMenu.setAttribute('aria-hidden', String(!isMenuOpen));

        // Prevent body scroll when menu is open
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    }

    function closeMenu() {
        if (!isMenuOpen) return;
        isMenuOpen = false;

        hamburgerBtn.classList.remove('is-active');
        mobileMenu.classList.remove('is-open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    hamburgerBtn.addEventListener('click', toggleMenu);

    // Close menu when any link inside is clicked
    var menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            closeMenu();
        });
    });

    // Close menu on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isMenuOpen) {
            closeMenu();
        }
    });


    /* ═══════════════════════════════════════════════════════
       3. MAGNETIC CTA BUTTON
       The button subtly follows the cursor when hovered
       within the .magnetic-wrap area. Uses GSAP for smooth,
       physically-correct movement.
       
       Effect:
       - Mouse enters wrap → button starts tracking cursor
       - Button moves proportionally toward cursor (max ~15px)
       - Mouse leaves → button springs back with elastic ease
       ═══════════════════════════════════════════════════════ */
    var MAX_MAGNETIC_MOVE = 15;   // Maximum pixel displacement

    if (magneticWrap && magneticBtn && !prefersReduced) {

        magneticWrap.addEventListener('mousemove', function (e) {
            var rect = magneticWrap.getBoundingClientRect();

            // Calculate cursor offset from center of wrap
            var centerX = rect.left + rect.width / 2;
            var centerY = rect.top + rect.height / 2;
            var deltaX  = e.clientX - centerX;
            var deltaY  = e.clientY - centerY;

            // Normalize to -1 → +1 range based on wrap dimensions
            var normalX = deltaX / (rect.width / 2);
            var normalY = deltaY / (rect.height / 2);

            // Apply proportional movement (clamped to max)
            var moveX = normalX * MAX_MAGNETIC_MOVE;
            var moveY = normalY * MAX_MAGNETIC_MOVE;

            gsap.to(magneticBtn, {
                x: moveX,
                y: moveY,
                duration: 0.3,
                ease: 'power2.out',
                overwrite: 'auto'
            });
        });

        magneticWrap.addEventListener('mouseleave', function () {
            // Spring back to original position
            gsap.to(magneticBtn, {
                x: 0,
                y: 0,
                duration: 0.7,
                ease: 'elastic.out(1, 0.3)',
                overwrite: 'auto'
            });
        });
    }


    /* ═══════════════════════════════════════════════════════
       4. SCROLL-TRIGGERED BENTO CARD REVEALS
       Staggered entrance animations for the bento grid cards.
       Cards fade in, slide up, and scale up when they enter
       the viewport. Uses ScrollTrigger.batch for efficiency.
       ═══════════════════════════════════════════════════════ */
    function initScrollReveals() {
        if (prefersReduced) return;
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        gsap.registerPlugin(ScrollTrigger);

        // ── Features section header ──
        var featuresHeader = document.getElementById('featuresHeader');
        if (featuresHeader) {
            gsap.from(featuresHeader, {
                opacity: 0,
                y: 40,
                duration: 0.9,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: featuresHeader,
                    start: 'top 85%',
                    once: true
                }
            });
        }

        // ── Bento cards — staggered batch entrance ──
        var bentoCards = document.querySelectorAll('.bento-card');
        if (bentoCards.length > 0) {
            // Set initial state (invisible) before scroll
            gsap.set(bentoCards, { opacity: 0, y: 60, scale: 0.96 });

            ScrollTrigger.batch(bentoCards, {
                onEnter: function (batch) {
                    gsap.to(batch, {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        stagger: 0.12,
                        duration: 0.8,
                        ease: 'power3.out',
                        overwrite: 'auto'
                    });
                },
                start: 'top 88%',
                once: true
            });
        }

        // ── CTA section reveal ──
        var ctaContainer = document.querySelector('.cta-section__container');
        if (ctaContainer) {
            gsap.from(ctaContainer, {
                opacity: 0,
                y: 50,
                scale: 0.97,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: ctaContainer,
                    start: 'top 80%',
                    once: true
                }
            });
        }
    }

    // Initialize scroll reveals and pinned dish showcase after hero frames load
    document.addEventListener('praneetha:framesLoaded', function () {
        setTimeout(function () {
            initScrollReveals();
            initDishShowcase();
            if (typeof ScrollTrigger !== 'undefined') {
                ScrollTrigger.refresh();
            }
        }, 120);
    });

    // Fallback: if frames never load (e.g., JS error), still init reveals
    setTimeout(function () {
        if (!document.querySelector('.bento-card[style]')) {
            initScrollReveals();
        }
    }, 8000);


    /* ═══════════════════════════════════════════════════════
       5. SMOOTH ANCHOR SCROLLING
       Intercepts clicks on anchor links (href="#section") and
       smoothly scrolls to the target element. Accounts for
       the fixed navbar height to prevent content being hidden.
       ═══════════════════════════════════════════════════════ */
    document.addEventListener('click', function (e) {
        var link = e.target.closest('a[href^="#"]');
        if (!link) return;

        var targetId = link.getAttribute('href');
        if (targetId === '#' || targetId.length < 2) return;

        var target = document.querySelector(targetId);
        if (!target) return;

        e.preventDefault();

        // Close mobile menu if open
        closeMenu();

        // Calculate scroll position accounting for navbar height
        var navHeight = parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--nav-height-scrolled')) || 64;
        var targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight;

        window.scrollTo({
            top: targetTop,
            behavior: prefersReduced ? 'auto' : 'smooth'
        });
    });


    /* ═══════════════════════════════════════════════════════
       6. ACTIVE NAV LINK HIGHLIGHTING
       Updates the active nav link based on which section is
       currently in view. Uses IntersectionObserver for
       efficient, scroll-jank-free detection.
       ═══════════════════════════════════════════════════════ */
    function initActiveNavTracking() {
        var navLinks = document.querySelectorAll('.navbar__link');
        var sections = ['hero', 'menu', 'about', 'contact', 'cta'];

        // Map section IDs to their nav link hrefs
        var linkMap = {};
        navLinks.forEach(function (link) {
            linkMap[link.getAttribute('href')] = link;
        });

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var id = '#' + entry.target.id;

                    // Remove active from all
                    navLinks.forEach(function (l) {
                        l.classList.remove('navbar__link--active');
                    });

                    // Add active to matching link
                    if (linkMap[id]) {
                        linkMap[id].classList.add('navbar__link--active');
                    }
                }
            });
        }, {
            rootMargin: '-40% 0px -50% 0px',   // Trigger when section is ~centered
            threshold: 0
        });

        sections.forEach(function (id) {
            var section = document.getElementById(id);
            if (section) observer.observe(section);
        });
    }

    initActiveNavTracking();


    /* ═══════════════════════════════════════════════════════
       7. DYNAMIC FOOTER HEIGHT
       Measures the actual footer height and updates the
       CSS custom property --footer-height so the main content
       spacer (::after) matches perfectly for the reveal effect.
       ═══════════════════════════════════════════════════════ */
    function updateFooterHeight() {
        var footer = document.getElementById('footer');
        if (!footer) return;

        var height = footer.offsetHeight;
        document.documentElement.style.setProperty('--footer-height', height + 'px');
    }

    // Calculate on load and resize
    updateFooterHeight();
    window.addEventListener('resize', function () {
        clearTimeout(updateFooterHeight._timer);
        updateFooterHeight._timer = setTimeout(updateFooterHeight, 150);
    });
    window.addEventListener('load', updateFooterHeight);

    // Modern ResizeObserver for zero-delay synchronization
    var footerEl = document.getElementById('footer');
    if (footerEl && typeof ResizeObserver !== 'undefined') {
        var footerObserver = new ResizeObserver(function () {
            updateFooterHeight();
        });
        footerObserver.observe(footerEl);
    }


    /* ═══════════════════════════════════════════════════════
       8. FEATURED DISHES — PINNED 50/50 SPLIT SHOWCASE
       
       Technique: pin: true on the main container (#menu) + scrub: 1
       Strict 50/50 Split Layout:
       • Left side:  Typography & Story slides (sliding vertically)
       • Right side: Massive food photography (rotating into place)
       
       When the dishes showcase reaches the top of the viewport,
       ScrollTrigger pins #menu in place while the user scrolls
       through 280% of viewport height. All 4 dishes transition
       seamlessly with rotational momentum and mask reveals.
       ═══════════════════════════════════════════════════════ */
    var dishShowcaseInitialized = false;

    function initDishShowcase() {
        if (dishShowcaseInitialized) return;
        if (prefersReduced) return;
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        var showcase   = document.getElementById('menu');
        var dishSlides = document.querySelectorAll('.dish-slide');
        var dishPhotos = document.querySelectorAll('.dish-photo-card');
        var dots       = document.querySelectorAll('.dish-dot');

        if (!showcase || !dishSlides.length || !dishPhotos.length) return;

        dishShowcaseInitialized = true;
        gsap.registerPlugin(ScrollTrigger);

        var totalDishes = dishSlides.length;

        // Set clean initial state: Slide 1 and Photo 1 visible, others waiting below
        gsap.set(dishSlides[0], { opacity: 1, yPercent: 0, autoAlpha: 1 });
        gsap.set(dishPhotos[0], { opacity: 1, rotate: 0, scale: 1, autoAlpha: 1 });

        for (var i = 1; i < totalDishes; i++) {
            gsap.set(dishSlides[i], { opacity: 0, yPercent: 40, autoAlpha: 0 });
            gsap.set(dishPhotos[i], { opacity: 0, rotate: 25, scale: 0.85, autoAlpha: 0 });
        }

        // Helper to update active indicator dot
        function updateActiveDot(activeIdx) {
            dots.forEach(function (d, idx) {
                d.classList.toggle('is-active', idx === activeIdx);
            });
        }

        // Master pinned timeline
        var tl = gsap.timeline({
            scrollTrigger: {
                trigger: showcase,
                start: 'top top',
                end: '+=280%',           // 280% extra scroll distance for 3 smooth transitions
                pin: true,               // Pin the main container!
                scrub: 1,                // Buttery smooth inertial scrubbing
                anticipatePin: 1,
                onUpdate: function (self) {
                    var activeIdx = Math.min(totalDishes - 1, Math.floor(self.progress * totalDishes));
                    updateActiveDot(activeIdx);
                }
            }
        });

        // Build transitions between consecutive dishes
        for (var step = 0; step < totalDishes - 1; step++) {
            var curr = step;
            var next = step + 1;

            // Dwell on current dish
            tl.to({}, { duration: 0.5 });

            // Slide out current text (slides up and fades out)
            tl.to(dishSlides[curr], {
                opacity: 0,
                yPercent: -35,
                autoAlpha: 0,
                duration: 0.8,
                ease: 'power2.in'
            })
            // Rotate out current photo (rotates counter-clockwise, scales down slightly, fades out)
            .to(dishPhotos[curr], {
                opacity: 0,
                rotate: -25,
                scale: 0.85,
                autoAlpha: 0,
                duration: 0.8,
                ease: 'power2.inOut'
            }, '<')

            // Slide in next text (slides up into position)
            .fromTo(dishSlides[next],
                { opacity: 0, yPercent: 40, autoAlpha: 0 },
                { opacity: 1, yPercent: 0, autoAlpha: 1, duration: 0.85, ease: 'power2.out' },
                '-=0.3'
            )
            // Rotate in next photo (rotates into place from clockwise angle, scales to full size)
            .fromTo(dishPhotos[next],
                { opacity: 0, rotate: 25, scale: 0.85, autoAlpha: 0 },
                { opacity: 1, rotate: 0, scale: 1, autoAlpha: 1, duration: 0.95, ease: 'power2.out' },
                '<'
            );
        }

        // Dwell on final dish
        tl.to({}, { duration: 0.5 });

        // Enable click on indicator dots to navigate directly
        dots.forEach(function (dot, idx) {
            dot.addEventListener('click', function () {
                var st = tl.scrollTrigger;
                if (!st) return;
                var targetScroll = st.start + (st.end - st.start) * (idx / (totalDishes - 1));
                window.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            });
        });

        console.log('[Interactions] Featured Dishes pinned showcase initialized');
    }

    // Initialize immediately if DOM is already fully loaded
    if (document.readyState === 'complete') {
        initDishShowcase();
    } else {
        window.addEventListener('load', function () {
            setTimeout(function () {
                initDishShowcase();
                if (typeof ScrollTrigger !== 'undefined') {
                    ScrollTrigger.refresh();
                }
            }, 300);
        });
    }



    /* ═══════════════════════════════════════════════════════
       9. LOCATION MAP — 3D TILT ON SCROLL ENTRANCE & MOUSEMOVE
       
       As the map scrolls into view, it tilts and then
       levels out (from perspective + rotateX). Uses
       ScrollTrigger with scrub for premium feel.
       On mousemove, applies interactive 3D perspective tilt
       and dynamic specular glare reflection.
       ═══════════════════════════════════════════════════════ */
    function initMapTilt() {
        if (prefersReduced) return;
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        var mapWrap = document.getElementById('locationMapWrap');
        var map     = document.getElementById('locationMap');
        var glare   = document.getElementById('locationMapGlare');
        if (!mapWrap || !map) return;

        /* Scroll-driven entrance: tilts in from a slight angle */
        gsap.fromTo(mapWrap,
            { rotateX: 18, rotateY: -10, scale: 0.92, opacity: 0 },
            {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                opacity: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: mapWrap,
                    start: 'top 85%',
                    end: 'top 45%',
                    scrub: 1
                }
            }
        );

        /* Interactive mouse-over 3D tilt + dynamic specular glare */
        var maxTilt = 12; /* degrees */

        mapWrap.addEventListener('mousemove', function (e) {
            var rect = mapWrap.getBoundingClientRect();
            var cx   = rect.left + rect.width  / 2;
            var cy   = rect.top  + rect.height / 2;
            var rx   = ((e.clientY - cy) / (rect.height / 2)) * -maxTilt;
            var ry   = ((e.clientX - cx) / (rect.width  / 2)) *  maxTilt;

            gsap.to(map, {
                rotateX: rx,
                rotateY: ry,
                duration: 0.4,
                ease: 'power2.out',
                transformPerspective: 1200
            });

            if (glare) {
                var px = ((e.clientX - rect.left) / rect.width) * 100;
                var py = ((e.clientY - rect.top) / rect.height) * 100;
                glare.style.background = 'radial-gradient(circle at ' + px.toFixed(1) + '% ' + py.toFixed(1) + '%, rgba(255, 255, 255, 0.16) 0%, transparent 65%)';
            }
        });

        mapWrap.addEventListener('mouseleave', function () {
            gsap.to(map, {
                rotateX: 0,
                rotateY: 0,
                duration: 0.8,
                ease: 'elastic.out(1, 0.6)'
            });
        });
    }

    initMapTilt();


    /* ═══════════════════════════════════════════════════════
       10. LOCATION DETAILS — STAGGERED ENTRANCE
       ═══════════════════════════════════════════════════════ */
    function initLocationReveal() {
        if (prefersReduced) return;
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        var locationSection = document.querySelector('.location-section');
        if (!locationSection) return;

        /* Details column */
        var detailItems = locationSection.querySelectorAll('.location-detail-item');
        var detailsTitle = locationSection.querySelector('.location-details__title');

        if (detailsTitle) {
            gsap.from(detailsTitle, {
                opacity: 0,
                yPercent: 30,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: detailsTitle,
                    start: 'top 80%'
                }
            });
        }

        if (detailItems.length) {
            gsap.from(detailItems, {
                opacity: 0,
                x: -30,
                duration: 0.8,
                stagger: 0.12,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: detailItems[0],
                    start: 'top 80%'
                }
            });
        }
    }

    initLocationReveal();


    /* ═══════════════════════════════════════════════════════
       11. BACK TO TOP SMOOTH SCROLL
       ═══════════════════════════════════════════════════════ */
    var backToTopBtn = document.getElementById('backToTopBtn');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }


    console.log('[Interactions] All micro-interactions initialized');

})();
