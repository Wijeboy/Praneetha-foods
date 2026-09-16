/* ============================================================
   SCROLL ENGINE — GSAP ScrollTrigger Canvas Renderer
   ============================================================
   The heart of the cinematic hero experience. This module:
   
   1. Listens for the 'praneetha:framesLoaded' event from preloader.js
   2. Initializes the <canvas> element with correct dimensions
   3. Pins the hero canvas wrapper via GSAP ScrollTrigger
   4. Maps scroll progress (0→1) to frame index (0→299)
   5. Renders frames on the canvas with "cover" fit
   6. Animates 5 text overlays at specific scroll markers:
      - Brand Name (0–15%)
      - Tradition (20–40%)
      - Fire & Passion (45–65%)
      - Feast (70–85%)
      - CTA Button (88–100%)
   7. Fades out the scroll indicator on first scroll
   8. Handles window resize for responsive canvas
   ============================================================ */

(function () {
    'use strict';

    /* ── Configuration ────────────────────────────────────── */
    var FRAME_COUNT      = 300;
    var SCRUB_SMOOTHING  = 0.6;   // Seconds of scroll smoothing (lower = snappier)

    /* ── DOM References ───────────────────────────────────── */
    var canvas           = document.getElementById('heroCanvas');
    var ctx              = canvas.getContext('2d');
    var canvasWrap       = document.getElementById('heroCanvasWrap');
    var heroSection      = document.getElementById('hero');
    var scrollIndicator  = document.getElementById('scrollIndicator');

    /* Text overlay elements — New cinematic flow */
    var textStory1       = document.getElementById('heroTextStory1');
    var textStory2       = document.getElementById('heroTextStory2');
    var textStory3       = document.getElementById('heroTextStory3');
    var textBrand        = document.getElementById('heroTextBrand');

    /* ── State ────────────────────────────────────────────── */
    var frames           = null;   // Loaded Image array (from preloader.js)
    var currentFrame     = -1;     // Currently displayed frame index
    var isInitialized    = false;
    var cssWidth         = 0;      // Canvas CSS width (logical pixels)
    var cssHeight        = 0;      // Canvas CSS height (logical pixels)


    /* ═══════════════════════════════════════════════════════
       CANVAS SIZING — Retina / HiDPI Support
       
       On Retina displays (devicePixelRatio > 1), the canvas
       internal resolution must be multiplied by DPR to render
       at the screen's native pixel density. The CSS dimensions
       stay at the logical (CSS pixel) size, and ctx.scale(dpr)
       ensures all draw coordinates remain in CSS pixels.
       
       Example on a 2x Retina at 1440×900 CSS viewport:
         canvas.width  = 2880  (internal buffer)
         canvas.height = 1800  (internal buffer)
         CSS width     = 1440px (display size)
         CSS height    = 900px  (display size)
         ctx.scale(2, 2)       (coordinates in CSS pixels)
       ═══════════════════════════════════════════════════════ */
    function resizeCanvas() {
        var dpr  = window.devicePixelRatio || 1;
        var rect = canvasWrap.getBoundingClientRect();

        // Store CSS dimensions for use in renderFrame
        cssWidth  = rect.width;
        cssHeight = rect.height;

        // Set internal resolution to native pixel density
        canvas.width  = Math.round(cssWidth  * dpr);
        canvas.height = Math.round(cssHeight * dpr);

        // Keep CSS display size at logical dimensions
        canvas.style.width  = cssWidth  + 'px';
        canvas.style.height = cssHeight + 'px';

        // Scale the 2D context so all draw calls use CSS pixels
        ctx.scale(dpr, dpr);

        // Enable high-quality image interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Re-render current frame after resize to avoid blank canvas
        if (currentFrame >= 0 && frames) {
            // Force re-render by resetting currentFrame
            var frameToRender = currentFrame;
            currentFrame = -1;
            renderFrame(frameToRender);
        }
    }


    /* ═══════════════════════════════════════════════════════
       FRAME RENDERING
       Draws a single frame on the canvas using "cover" fit:
       scales the image to completely fill the canvas while
       maintaining aspect ratio, cropping overflow equally
       from both sides.
       ═══════════════════════════════════════════════════════ */
    function renderFrame(index) {
        // Clamp index to valid range
        index = Math.max(0, Math.min(index, FRAME_COUNT - 1));

        // Skip redundant renders (performance optimization)
        if (index === currentFrame) return;
        currentFrame = index;

        var img = frames[index];
        if (!img || !img.naturalWidth) return;

        // Use CSS pixel dimensions (ctx is already DPR-scaled)
        var cw = cssWidth;
        var ch = cssHeight;
        var iw = img.naturalWidth;
        var ih = img.naturalHeight;

        // Calculate "cover" fit dimensions
        // Scale so the image fills the canvas completely
        var scale = Math.max(cw / iw, ch / ih);
        var drawW = iw * scale;
        var drawH = ih * scale;
        // Center the scaled image (crops overflow equally)
        var drawX = (cw - drawW) / 2;
        var drawY = (ch - drawH) / 2;

        // Clear and draw (coordinates are in CSS pixels;
        // the DPR scaling in ctx handles native resolution)
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }


    /* ═══════════════════════════════════════════════════════
       TEXT OVERLAY ANIMATION — New Cinematic Flow
       
       Scroll Progress Timeline:
       ┌─────────────────────────────────────────────────────┐
       │  0–10%   (no text — pure cinematic frames)         │
       │ 10–30%   Story 1: "Wood-Fire Cooking" ◄── LEFT     │
       │ 35–55%   Story 2: "Village Spices"    ──► RIGHT    │
       │ 60–80%   Story 3: "Clay Pot Recipes"  ◄── LEFT     │
       │ 80–90%   (no text — let final frames build drama)  │
       │ 90–100%  BRAND CLIMAX: "PRANEETHA" ★ STAYS         │
       └─────────────────────────────────────────────────────┘
       
       Story texts SLIDE in horizontally from their side,
       then WIPE away in the same direction on scroll-out.
       Brand text SCALES up from 0.7 with opacity fade.
       ═══════════════════════════════════════════════════════ */

    /**
     * Computes an opacity value (0–1) for a given progress
     * within a defined visibility window.
     * 
     * @param {number} progress - Current scroll progress (0–1)
     * @param {number} fadeIn   - Progress where fade-in starts
     * @param {number} peakStart - Progress where full opacity begins
     * @param {number} peakEnd   - Progress where full opacity ends
     * @param {number} fadeOut   - Progress where fade-out completes
     * @returns {number} Opacity value between 0 and 1
     */
    function calcOverlayOpacity(progress, fadeIn, peakStart, peakEnd, fadeOut) {
        if (progress < fadeIn || progress > fadeOut) return 0;
        if (progress >= peakStart && progress <= peakEnd) return 1;

        // Fade-in ramp
        if (progress < peakStart) {
            return (progress - fadeIn) / (peakStart - fadeIn);
        }

        // Fade-out ramp
        return 1 - (progress - peakEnd) / (fadeOut - peakEnd);
    }

    /**
     * Animates a story text element with horizontal slide-in/wipe effect.
     * 
     * @param {HTMLElement} el        - The text overlay element
     * @param {number}      opacity   - Current opacity (0–1)
     * @param {string}      side      - 'left' or 'right' (slide direction)
     * @param {number}      slideDistance - Max pixel offset for slide
     */
    function animateStoryText(el, opacity, side, slideDistance) {
        var offsetX;

        if (side === 'left') {
            // Slide in from left: starts at -slideDistance, arrives at 0
            offsetX = (1 - opacity) * -slideDistance;
        } else {
            // Slide in from right: starts at +slideDistance, arrives at 0
            offsetX = (1 - opacity) * slideDistance;
        }

        el.style.opacity = opacity;
        el.style.transform = 'translateY(-50%) translateX(' + offsetX + 'px)';
    }

    /**
     * Main overlay update function — called on every scroll tick.
     * Maps scroll progress to the new cinematic text flow.
     */
    function updateTextOverlays(progress) {

        // ── Story 1: "Wood-Fire Cooking" — LEFT, 10–30% ──
        var s1Opacity = calcOverlayOpacity(progress, 0.08, 0.13, 0.24, 0.30);
        animateStoryText(textStory1, s1Opacity, 'left', 80);

        // ── Story 2: "Village Spices" — RIGHT, 35–55% ──
        var s2Opacity = calcOverlayOpacity(progress, 0.33, 0.38, 0.49, 0.55);
        animateStoryText(textStory2, s2Opacity, 'right', 80);

        // ── Story 3: "Clay Pot Recipes" — LEFT, 60–80% ──
        var s3Opacity = calcOverlayOpacity(progress, 0.58, 0.63, 0.74, 0.80);
        animateStoryText(textStory3, s3Opacity, 'left', 80);

        // ── Brand Climax: "PRANEETHA" — CENTER, 90–100% (STAYS) ──
        // Dramatically scales from 0.7 → 1.0 with opacity fade
        var brandOpacity = calcOverlayOpacity(progress, 0.88, 0.94, 1.0, 1.0);
        var brandScale   = 0.7 + (brandOpacity * 0.3);  // 0.7 → 1.0
        textBrand.style.opacity   = brandOpacity;
        textBrand.style.transform = 'translate(-50%, -50%) scale(' + brandScale.toFixed(3) + ')';

        // ── Scroll Indicator: hide after 2% scroll ──
        if (progress > 0.02) {
            scrollIndicator.classList.add('is-hidden');
        } else {
            scrollIndicator.classList.remove('is-hidden');
        }
    }


    /* ═══════════════════════════════════════════════════════
       GSAP SCROLLTRIGGER SETUP
       Creates the scroll-bound animation:
       - Pins the canvas wrapper
       - Maps scroll progress to frame index
       - Triggers text overlay updates
       ═══════════════════════════════════════════════════════ */
    function initScrollTrigger() {
        gsap.registerPlugin(ScrollTrigger);

        // Object whose 'frame' property will be tweened by GSAP
        var frameObj = { frame: 0 };

        // Create the scroll-bound tween
        gsap.to(frameObj, {
            frame: FRAME_COUNT - 1,
            snap: 'frame',       // Always land on integer frame indices
            ease: 'none',        // Linear mapping: scroll position = frame position

            scrollTrigger: {
                trigger: heroSection,     // The 500vh tall section
                start: 'top top',         // Pin starts when section hits viewport top
                end: 'bottom bottom',     // Pin ends when section bottom reaches viewport bottom
                pin: canvasWrap,          // Pin the canvas container
                scrub: SCRUB_SMOOTHING,   // Smooth scrub with 0.6s lag

                /* Called on every scroll update (after scrub smoothing) */
                onUpdate: function (self) {
                    updateTextOverlays(self.progress);
                }
            },

            /* Called when the tweened frame value changes */
            onUpdate: function () {
                renderFrame(Math.round(frameObj.frame));
            }
        });

        // Render the first frame immediately (no text shown at 0%)
        renderFrame(0);

        console.log('[ScrollEngine] ScrollTrigger initialized — new cinematic flow');
    }


    /* ═══════════════════════════════════════════════════════
       REDUCED MOTION HANDLING
       If user prefers reduced motion, skip the scroll-bound
       frame animation and show the last frame statically.
       Text overlays are shown without animation.
       ═══════════════════════════════════════════════════════ */
    function initReducedMotion() {
        resizeCanvas();
        // Show the final composed frame (the complete dish)
        renderFrame(FRAME_COUNT - 1);

        // Show brand text statically
        textBrand.style.opacity = 1;
        textBrand.style.transform = 'translate(-50%, -50%)';

        // Hide scroll indicator
        scrollIndicator.classList.add('is-hidden');

        // Collapse the hero to a single viewport height
        heroSection.style.height = '100vh';

        console.log('[ScrollEngine] Reduced motion: static render');
    }


    /* ═══════════════════════════════════════════════════════
       INITIALIZATION
       Waits for the 'praneetha:framesLoaded' event from
       preloader.js, then sets up canvas and ScrollTrigger.
       ═══════════════════════════════════════════════════════ */
    function init(loadedFrames) {
        if (isInitialized) return;
        isInitialized = true;

        frames = loadedFrames;
        console.log('[ScrollEngine] Received ' + frames.length + ' frames');

        // Set up canvas dimensions
        resizeCanvas();

        // Check for reduced motion preference
        var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReduced) {
            initReducedMotion();
        } else {
            initScrollTrigger();
        }

        // Handle window resize
        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                resizeCanvas();
                // Refresh ScrollTrigger calculations after resize
                if (!prefersReduced) {
                    ScrollTrigger.refresh();
                }
            }, 200);
        });
    }

    /* ── Event Listener ───────────────────────────────────── */
    // Wait for preloader.js to finish loading all frames
    document.addEventListener('praneetha:framesLoaded', function () {
        var loadedFrames = window.PRANEETHA && window.PRANEETHA.frames;
        if (loadedFrames) {
            init(loadedFrames);
        } else {
            console.error('[ScrollEngine] Frames not found in window.PRANEETHA');
        }
    });

})();
