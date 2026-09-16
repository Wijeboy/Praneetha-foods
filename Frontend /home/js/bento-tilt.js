/* ============================================================
   BENTO TILT — 3D Mouse-Tracking Perspective Effect
   ============================================================
   Creates an interactive 3D tilt effect on bento grid cards.
   When the user hovers over a card:
   
   1. The card rotates in 3D space based on cursor position
      (perspective + rotateX + rotateY + translateZ)
   2. A radial glow follows the cursor via CSS custom properties
      (--mouse-x, --mouse-y) used by .bento-card__glow in CSS
   3. On mouse leave, the card smoothly resets to its original
      flat position with an elastic ease
   
   Uses requestAnimationFrame throttling to maintain 60fps.
   Respects prefers-reduced-motion by skipping initialization.
   ============================================================ */

(function () {
    'use strict';

    /* ── Configuration ────────────────────────────────────── */
    var MAX_ROTATION    = 12;     // Maximum tilt angle in degrees
    var MAX_TRANSLATE_Z = 10;     // Maximum Z-axis lift in pixels
    var PERSPECTIVE     = 1000;   // CSS perspective value in pixels
    var RESET_DURATION  = 600;    // Reset animation duration in ms
    var RESET_EASE      = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // Elastic-like ease

    /* ── Reduced Motion Check ─────────────────────────────── */
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
        console.log('[BentoTilt] Skipped — prefers-reduced-motion is active');
        return;
    }


    /* ═══════════════════════════════════════════════════════
       TILT HANDLER CLASS
       Encapsulates tilt logic for a single card element.
       ═══════════════════════════════════════════════════════ */
    function TiltCard(element) {
        this.el       = element;
        this.glow     = element.querySelector('.bento-card__glow');
        this.rafId    = null;     // requestAnimationFrame ID
        this.isHover  = false;    // Current hover state
        this.currentX = 0;       // Current rotateY value (smoothed)
        this.currentY = 0;       // Current rotateX value (smoothed)
        this.targetX  = 0;       // Target rotateY value
        this.targetY  = 0;       // Target rotateX value

        // Set perspective on the card
        this.el.style.perspective = PERSPECTIVE + 'px';

        // Bind event listeners
        this._onMouseMove  = this.onMouseMove.bind(this);
        this._onMouseEnter = this.onMouseEnter.bind(this);
        this._onMouseLeave = this.onMouseLeave.bind(this);

        this.el.addEventListener('mousemove', this._onMouseMove);
        this.el.addEventListener('mouseenter', this._onMouseEnter);
        this.el.addEventListener('mouseleave', this._onMouseLeave);
    }

    /**
     * Mouse enter: enable tilt tracking and remove transition
     * (we use rAF interpolation for smooth movement instead).
     */
    TiltCard.prototype.onMouseEnter = function () {
        this.isHover = true;
        this.el.style.transition = 'border-color 250ms ease, box-shadow 250ms ease';
    };

    /**
     * Mouse move: calculate target rotation based on cursor
     * position relative to the card center.
     * 
     * Coordinate system:
     * - X axis (left→right) maps to rotateY (positive = tilt right)
     * - Y axis (top→bottom) maps to rotateX (negative = tilt forward)
     */
    TiltCard.prototype.onMouseMove = function (e) {
        if (!this.isHover) return;

        var rect = this.el.getBoundingClientRect();

        // Normalize mouse position to -0.5 → +0.5 range
        var normalX = (e.clientX - rect.left) / rect.width  - 0.5;
        var normalY = (e.clientY - rect.top)  / rect.height - 0.5;

        // Calculate target rotation
        // rotateY: horizontal mouse position → Y-axis rotation
        // rotateX: vertical mouse position → X-axis rotation (inverted)
        this.targetX = normalX * MAX_ROTATION;       // rotateY
        this.targetY = -normalY * MAX_ROTATION;      // rotateX

        // Update CSS custom properties for the glow effect
        if (this.glow) {
            var glowX = ((e.clientX - rect.left) / rect.width) * 100;
            var glowY = ((e.clientY - rect.top) / rect.height) * 100;
            this.el.style.setProperty('--mouse-x', glowX + '%');
            this.el.style.setProperty('--mouse-y', glowY + '%');
        }

        // Start the animation loop if not already running
        if (!this.rafId) {
            this.animate();
        }
    };

    /**
     * Mouse leave: smoothly reset the card to flat position
     * using a CSS transition (elastic ease for a satisfying snap-back).
     */
    TiltCard.prototype.onMouseLeave = function () {
        this.isHover = false;
        this.targetX = 0;
        this.targetY = 0;

        // Cancel rAF loop
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        // Apply smooth reset transition
        this.el.style.transition = 'transform ' + RESET_DURATION + 'ms ' + RESET_EASE
            + ', border-color 250ms ease, box-shadow 250ms ease';
        this.el.style.transform = 'perspective(' + PERSPECTIVE + 'px) rotateX(0deg) rotateY(0deg) translateZ(0px)';

        this.currentX = 0;
        this.currentY = 0;
    };

    /**
     * Animation loop: interpolates current values toward target
     * for buttery-smooth tilt movement using lerp (linear interpolation).
     */
    TiltCard.prototype.animate = function () {
        var self = this;

        // Lerp factor (0.1 = very smooth, 0.3 = more responsive)
        var lerp = 0.12;

        // Interpolate toward target
        this.currentX += (this.targetX - this.currentX) * lerp;
        this.currentY += (this.targetY - this.currentY) * lerp;

        // Calculate Z-axis lift based on distance from center
        var distance = Math.sqrt(this.currentX * this.currentX + this.currentY * this.currentY);
        var maxDist  = MAX_ROTATION;
        var zLift    = (distance / maxDist) * MAX_TRANSLATE_Z;

        // Apply 3D transform
        this.el.style.transform =
            'perspective(' + PERSPECTIVE + 'px) ' +
            'rotateX(' + this.currentY.toFixed(2) + 'deg) ' +
            'rotateY(' + this.currentX.toFixed(2) + 'deg) ' +
            'translateZ(' + zLift.toFixed(1) + 'px)';

        // Continue loop if still hovering
        if (this.isHover) {
            this.rafId = requestAnimationFrame(function () {
                self.animate();
            });
        } else {
            this.rafId = null;
        }
    };


    /* ═══════════════════════════════════════════════════════
       INITIALIZATION
       Find all [data-tilt] cards and attach tilt handlers.
       ═══════════════════════════════════════════════════════ */
    function init() {
        var cards = document.querySelectorAll('[data-tilt]');

        if (cards.length === 0) {
            console.warn('[BentoTilt] No [data-tilt] elements found');
            return;
        }

        cards.forEach(function (card) {
            new TiltCard(card);
        });

        console.log('[BentoTilt] Initialized ' + cards.length + ' tilt cards');
    }

    // Initialize immediately — DOM is available (script at bottom of body)
    init();

})();
