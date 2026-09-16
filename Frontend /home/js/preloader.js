/* ============================================================
   PRELOADER — Frame Preloading Engine
   ============================================================
   Loads all 300 hero animation frames into memory before the
   scroll experience begins. Uses a concurrent loading pool for
   optimal performance. Updates the visual progress bar and
   percentage counter in real-time.
   
   Dispatches 'praneetha:framesLoaded' event when complete,
   which scroll-engine.js listens for to initialize the canvas.
   ============================================================ */

(function () {
    'use strict';

    /* ── Configuration ────────────────────────────────────── */
    const FRAME_COUNT    = 300;                        // Total frames in sequence
    const FRAME_PATH     = 'assets/frames/ezgif-frame-'; // Path prefix
    const FRAME_EXT      = '.jpg';                     // File extension
    const POOL_SIZE      = 15;                         // Concurrent HTTP requests
    const MAX_RETRIES    = 2;                          // Retry attempts per frame

    /* ── DOM References ───────────────────────────────────── */
    const preloader      = document.getElementById('preloader');
    const barFill        = document.getElementById('preloaderBar');
    const percentText    = document.getElementById('preloaderPercent');

    /* ── Global Namespace ─────────────────────────────────── */
    // Shared namespace for cross-module communication
    window.PRANEETHA = window.PRANEETHA || {};


    /* ── Build Frame URL ──────────────────────────────────── */
    /**
     * Generates the file path for a given frame index.
     * Frames are numbered 001 → 300 with zero-padding.
     * @param {number} index - Zero-based frame index (0–299)
     * @returns {string} Relative URL to the frame image
     */
    function getFrameURL(index) {
        const num = String(index + 1).padStart(3, '0');
        return `${FRAME_PATH}${num}${FRAME_EXT}`;
    }


    /* ── Progress Update ──────────────────────────────────── */
    /**
     * Updates the preloader UI: progress bar width + percentage text.
     * @param {number} ratio - Load progress from 0.0 to 1.0
     */
    function updateProgress(ratio) {
        const pct = Math.round(ratio * 100);
        barFill.style.width = `${pct}%`;
        percentText.textContent = pct;
    }


    /* ── Hide Preloader ───────────────────────────────────── */
    /**
     * Fades out the preloader overlay and unlocks body scroll.
     * Uses CSS transition (0.8s) defined in style.css.
     */
    function hidePreloader() {
        preloader.classList.add('is-hidden');
        document.body.classList.remove('is-loading');

        // Remove preloader from DOM after fade-out animation
        preloader.addEventListener('transitionend', function handler() {
            preloader.removeEventListener('transitionend', handler);
            preloader.remove();
        });
    }


    /* ── Concurrent Frame Loader ──────────────────────────── */
    /**
     * Loads all frames using a bounded concurrent pool.
     * 
     * Strategy:
     * - Maintains POOL_SIZE concurrent Image loads at a time
     * - As each image loads (or fails after retries), the next
     *   queued image starts loading immediately
     * - Failed frames get a transparent 1x1 fallback to avoid
     *   breaking the animation sequence
     * 
     * @returns {Promise<HTMLImageElement[]>} Array of loaded Image objects
     */
    function loadAllFrames() {
        return new Promise(function (resolve) {
            var frames    = new Array(FRAME_COUNT);  // Pre-sized array
            var loaded    = 0;                        // Successful + failed count
            var nextIndex = 0;                        // Next frame to queue
            var retries   = new Array(FRAME_COUNT).fill(0); // Retry counters

            /**
             * Loads a single frame by index. On success, stores the
             * Image object. On failure, retries up to MAX_RETRIES
             * times before storing a fallback.
             */
            function loadOne() {
                // All frames queued
                if (nextIndex >= FRAME_COUNT) return;

                var index = nextIndex++;
                var img   = new Image();

                img.onload = function () {
                    frames[index] = img;
                    loaded++;
                    updateProgress(loaded / FRAME_COUNT);

                    if (loaded === FRAME_COUNT) {
                        resolve(frames);
                    } else {
                        loadOne(); // Fill the pool slot
                    }
                };

                img.onerror = function () {
                    retries[index]++;

                    if (retries[index] <= MAX_RETRIES) {
                        // Retry: append cache-buster to force re-fetch
                        img.src = getFrameURL(index) + '?retry=' + retries[index];
                    } else {
                        // Give up: use a transparent 1x1 pixel fallback
                        // so the animation doesn't break on this frame
                        console.warn('[Preloader] Failed to load frame ' + (index + 1) + ' after ' + MAX_RETRIES + ' retries');
                        var fallback = new Image();
                        fallback.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                        frames[index] = fallback;
                        loaded++;
                        updateProgress(loaded / FRAME_COUNT);

                        if (loaded === FRAME_COUNT) {
                            resolve(frames);
                        } else {
                            loadOne();
                        }
                    }
                };

                // Start loading
                img.src = getFrameURL(index);
            }

            // Kick off the concurrent pool
            var initialBatch = Math.min(POOL_SIZE, FRAME_COUNT);
            for (var i = 0; i < initialBatch; i++) {
                loadOne();
            }
        });
    }


    /* ── Initialization ───────────────────────────────────── */
    /**
     * Entry point: starts loading frames immediately.
     * On completion, stores frames globally, dispatches event,
     * and hides the preloader.
     */
    function init() {
        console.log('[Preloader] Loading ' + FRAME_COUNT + ' frames...');
        var startTime = performance.now();

        loadAllFrames().then(function (frames) {
            var elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
            console.log('[Preloader] All ' + FRAME_COUNT + ' frames loaded in ' + elapsed + 's');

            // Store frames globally for scroll-engine.js
            window.PRANEETHA.frames = frames;

            // Notify other modules that frames are ready
            document.dispatchEvent(new CustomEvent('praneetha:framesLoaded'));

            // Small delay so user sees 100% before fade
            setTimeout(hidePreloader, 300);
        });
    }

    // Start immediately — DOM is already available (script at bottom of body)
    init();

})();
