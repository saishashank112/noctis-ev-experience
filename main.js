/**
 * NOCTIS — Scrollytelling Engine
 * Pure Vanilla JavaScript: High-performance canvas scrubbing, preloader,
 * custom headlight cursor, responsive accordion, and smooth micro-interactions.
 */

(function () {
  'use strict';

  // Ensure config is loaded
  const CFG = window.CONFIG;
  if (!CFG) {
    console.error('NOCTIS: config.js must be loaded before main.js');
    return;
  }

  // Feature detection
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  // DOM Elements Cache
  const DOM = {
    body: document.body,
    preloader: document.getElementById('preloader'),
    preloaderBar: document.getElementById('preloader-bar'),
    preloaderCount: document.getElementById('preloader-count'),
    nav: document.getElementById('site-nav'),
    grainCanvas: document.getElementById('grain-canvas'),
    cursor: document.getElementById('cursor'),
    // Hero
    heroWrapper: document.getElementById('hero'),
    heroCanvas: document.getElementById('hero-canvas'),
    heroProgress: document.getElementById('hero-progress'),
    heroBlackout: document.getElementById('hero-blackout'),
    hudChapterText: document.getElementById('hud-chapter-text'),
    hudSpeedVal: document.getElementById('hud-speed-val'),
    hudDistVal: document.getElementById('hud-dist-val'),
    heroChapters: [
      document.getElementById('hero-ch-1'),
      document.getElementById('hero-ch-2'),
      document.getElementById('hero-ch-3'),
      document.getElementById('hero-ch-4')
    ],
    // Statement
    statementSection: document.getElementById('statement'),
    statementWordsContainer: document.getElementById('statement-words'),
    // Dismantle
    dismantleWrapper: document.getElementById('technology'),
    dismantleCanvas: document.getElementById('dismantle-canvas'),
    dismantleProgress: document.getElementById('dismantle-progress'),
    dismantleCallouts: document.getElementById('dismantle-callouts'),
    // Lineup
    lineupSection: document.getElementById('models'),
    lineupAccordion: document.getElementById('lineup-accordion'),
    // Reserve
    reserveSection: document.getElementById('reserve'),
    openReserveBtn: document.getElementById('open-reserve-btn'),
    reserveModal: document.getElementById('reserve-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    closeModalBackdrop: document.getElementById('close-modal-backdrop'),
    reserveForm: document.getElementById('reserve-form'),
    reserveConfirmation: document.getElementById('reserve-confirmation'),
    confirmDismissBtn: document.getElementById('confirm-dismiss-btn')
  };

  /* ==========================================================================
     1. Image Sequence Preloader & Loader
     ========================================================================== */
  class SequenceLoader {
    constructor(sequenceConfig, totalFrames) {
      this.cfg = sequenceConfig;
      this.totalFrames = totalFrames;
      this.images = new Array(totalFrames);
      this.loadedCount = 0;
      this.isMobile = window.innerWidth < CFG.mobileBreakpoint;
    }

    getFramePath(index) {
      const padLen = this.cfg.padLength || 4;
      const idxStr = String(index).padStart(padLen, '0');
      const template = this.isMobile ? this.cfg.mobilePath : this.cfg.desktopPath;
      return template.replace('{index}', idxStr);
    }

    loadFrame(index) {
      return new Promise((resolve) => {
        const frameIdx = index - 1;
        if (this.images[frameIdx]) {
          return resolve(this.images[frameIdx]);
        }

        const img = new Image();
        img.src = this.getFramePath(index);
        
        const onLoad = () => {
          this.images[frameIdx] = img;
          this.loadedCount++;
          // Decode offscreen for smooth paint
          if (img.decode) {
            img.decode().then(() => resolve(img)).catch(() => resolve(img));
          } else {
            resolve(img);
          }
        };

        img.onload = onLoad;
        img.onerror = () => {
          // Fallback to nearest if error
          console.warn(`Frame ${index} failed to load: ${img.src}`);
          resolve(null);
        };
      });
    }

    async loadRange(startIndex, endIndex, onProgress) {
      const promises = [];
      for (let i = startIndex; i <= endIndex; i++) {
        promises.push(
          this.loadFrame(i).then((img) => {
            if (onProgress) onProgress(this.loadedCount);
            return img;
          })
        );
      }
      return Promise.all(promises);
    }

    getNearestLoadedFrame(targetIndex) {
      if (this.images[targetIndex]) return this.images[targetIndex];

      // Search outwardly for nearest loaded image
      let step = 1;
      while (targetIndex - step >= 0 || targetIndex + step < this.totalFrames) {
        if (targetIndex - step >= 0 && this.images[targetIndex - step]) {
          return this.images[targetIndex - step];
        }
        if (targetIndex + step < this.totalFrames && this.images[targetIndex + step]) {
          return this.images[targetIndex + step];
        }
        step++;
      }
      return null;
    }
  }

  const heroLoader = new SequenceLoader(CFG.frames.hero, CFG.frames.hero.count);
  const dismantleLoader = new SequenceLoader(CFG.frames.dismantle, CFG.frames.dismantle.count);

  /* ==========================================================================
     2. Canvas Scrollytelling Scroller Class
     ========================================================================== */
  class CanvasScroller {
    constructor(canvas, wrapper, loader, totalFrames, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.wrapper = wrapper;
      this.loader = loader;
      this.totalFrames = totalFrames;
      this.options = options;

      this.currentFrame = -1;
      this.targetFrame = 0;
      this.smoothedProgress = 0;
      this.targetProgress = 0;

      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = 0;
      this.height = 0;

      this.resize();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;

      // Set physical buffer size scaled by DPR
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);

      // Force redraw
      this.currentFrame = -1;
    }

    calculateProgress() {
      if (!this.wrapper) return 0;
      const rect = this.wrapper.getBoundingClientRect();
      const scrollDist = this.wrapper.offsetHeight - window.innerHeight;
      if (scrollDist <= 0) return 0;
      const rawProgress = -rect.top / scrollDist;
      return Math.max(0, Math.min(1, rawProgress));
    }

    update() {
      this.targetProgress = this.calculateProgress();
      // Lerp smoothed progress
      this.smoothedProgress += (this.targetProgress - this.smoothedProgress) * (CFG.motion.lerpCanvas || 0.15);
      
      this.targetFrame = Math.round(this.smoothedProgress * (this.totalFrames - 1));
      
      if (this.targetFrame !== this.currentFrame) {
        this.render(this.targetFrame);
        this.currentFrame = this.targetFrame;
      }
    }

    render(frameIndex) {
      const img = this.loader.getNearestLoadedFrame(frameIndex);
      if (!img) return;

      const ctx = this.ctx;
      const cw = this.canvas.width;
      const ch = this.canvas.height;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;

      // Clear with asphalt background
      ctx.fillStyle = '#07080A';
      ctx.fillRect(0, 0, cw, ch);

      // Fit mode:
      // Landscape screen -> cover-fit
      // Portrait screen -> contain-fit, vertically centered on --asphalt
      const isLandscape = cw >= ch;
      let scale, dw, dh, dx, dy;

      if (isLandscape) {
        scale = Math.max(cw / iw, ch / ih);
      } else {
        scale = Math.min(cw / iw, ch / ih);
      }

      dw = iw * scale;
      dh = ih * scale;
      dx = (cw - dw) / 2;
      dy = (ch - dh) / 2;

      ctx.drawImage(img, dx, dy, dw, dh);
    }
  }

  let heroScroller = null;
  let dismantleScroller = null;

  /* ==========================================================================
     3. Preloader Flow
     ========================================================================== */
  async function initPreloader() {
    const initialTarget = CFG.frames.hero.preloadInitial || 40;
    let loadedInitial = 0;

    const updateDisplay = (count) => {
      const pct = Math.min(100, Math.round((count / initialTarget) * 100));
      DOM.preloaderBar.style.width = `${pct}%`;
      DOM.preloaderCount.textContent = String(pct).padStart(3, '0');
    };

    // Load initial 40 hero frames first
    await heroLoader.loadRange(1, initialTarget, (cnt) => {
      loadedInitial = cnt;
      updateDisplay(loadedInitial);
    });

    updateDisplay(initialTarget);
    DOM.preloaderBar.classList.add('flash');

    // Wait 120ms flash, then reveal page
    setTimeout(() => {
      DOM.preloader.classList.add('is-hidden');
      DOM.body.classList.remove('is-loading');

      // Initialize scrollers now that initial frames exist
      initScrollers();

      // Continue background loading remaining hero frames, then dismantle frames
      backgroundPreloadRemaining();
    }, 200);
  }

  function backgroundPreloadRemaining() {
    const initialTarget = CFG.frames.hero.preloadInitial || 40;
    
    // Background load rest of hero
    heroLoader.loadRange(initialTarget + 1, CFG.frames.hero.count).then(() => {
      // Then load dismantle frames
      dismantleLoader.loadRange(1, CFG.frames.dismantle.count);
    });
  }

  /* ==========================================================================
     4. Initialize Scrollers
     ========================================================================== */
  function initScrollers() {
    heroScroller = new CanvasScroller(
      DOM.heroCanvas,
      DOM.heroWrapper,
      heroLoader,
      CFG.frames.hero.count
    );

    dismantleScroller = new CanvasScroller(
      DOM.dismantleCanvas,
      DOM.dismantleWrapper,
      dismantleLoader,
      CFG.frames.dismantle.count
    );

    // Initial render
    heroScroller.update();
    dismantleScroller.update();
  }

  /* ==========================================================================
     5. Hero Chapters, HUD, & Blackout
     ========================================================================== */
  function updateHeroUI(progress) {
    if (!DOM.heroProgress) return;

    // 1px Xenon progress line at bottom
    DOM.heroProgress.style.width = `${progress * 100}%`;

    // Speed & Distance Counters
    const speed = Math.round(progress * CFG.heroHud.maxSpeedKmH);
    const dist = (progress * CFG.heroHud.maxDistanceKm).toFixed(1);
    DOM.hudSpeedVal.textContent = String(speed).padStart(3, '0');
    DOM.hudDistVal.textContent = dist;

    // Active Chapter
    let activeChapterId = 1;
    CFG.heroChapters.forEach((ch, idx) => {
      const [start, end] = ch.range;
      const el = DOM.heroChapters[idx];
      if (el) {
        if (progress >= start && progress <= end) {
          el.classList.add('active');
          activeChapterId = ch.id;
        } else {
          el.classList.remove('active');
        }
      }
    });

    DOM.hudChapterText.textContent = `0${activeChapterId}/04`;

    // Canvas fade to solid black over last 5% (progress 0.95 -> 1.0)
    if (progress >= CFG.heroFadeOutStart) {
      const fadeProgress = (progress - CFG.heroFadeOutStart) / (1 - CFG.heroFadeOutStart);
      DOM.heroBlackout.style.opacity = Math.min(1, Math.max(0, fadeProgress));
    } else {
      DOM.heroBlackout.style.opacity = '0';
    }
  }

  /* ==========================================================================
     6. Section 2: Statement Word-by-Word Scroll Reveal
     ========================================================================== */
  let statementWords = [];

  function initStatementSection() {
    const text = DOM.statementWordsContainer.textContent.trim();
    DOM.statementWordsContainer.textContent = '';

    const words = text.split(/\s+/);
    statementWords = words.map((word) => {
      const span = document.createElement('span');
      span.className = 'statement-word';
      span.textContent = word + ' ';
      DOM.statementWordsContainer.appendChild(span);
      return span;
    });
  }

  function updateStatementSection() {
    if (!DOM.statementSection || statementWords.length === 0) return;

    const rect = DOM.statementSection.getBoundingClientRect();
    const vh = window.innerHeight;

    // Progress from 0 (enters from bottom) to 1 (reaches top)
    const rawProgress = (vh - rect.top) / (vh + rect.height);
    const progress = Math.max(0, Math.min(1, (rawProgress - 0.25) / 0.5));

    const totalWords = statementWords.length;
    statementWords.forEach((wordEl, idx) => {
      const wordThreshold = idx / totalWords;
      if (progress >= wordThreshold) {
        wordEl.style.opacity = '1';
      } else {
        wordEl.style.opacity = '0.15';
      }
    });
  }

  /* ==========================================================================
     7. Section 3: Dismantle & Callouts
     ========================================================================== */
  function initDismantleCallouts() {
    const callouts = CFG.dismantle.callouts;
    DOM.dismantleCallouts.innerHTML = '';

    callouts.forEach((co) => {
      const item = document.createElement('div');
      item.className = 'callout-item';
      item.id = `callout-${co.id}`;
      item.style.left = `${co.dot.x}%`;
      item.style.top = `${co.dot.y}%`;

      // Dot
      const dot = document.createElement('div');
      dot.className = 'callout-dot';
      item.appendChild(dot);

      // SVG Hairline connector
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'callout-svg');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'callout-line');

      // Relative offsets from dot to label card
      const dx = (co.labelPos.x - co.dot.x) * 10;
      const dy = (co.labelPos.y - co.dot.y) * 10;
      const kneeX = dx * 0.4;

      path.setAttribute('d', `M 0 0 L ${kneeX} ${dy} L ${dx} ${dy}`);
      svg.appendChild(path);
      item.appendChild(svg);

      // Card
      const card = document.createElement('div');
      card.className = 'callout-card';
      card.style.transform = `translate(${dx}px, ${dy}px)`;

      card.innerHTML = `
        <span class="callout-code">${co.code} — ${co.label}</span>
        <p class="callout-desc">${co.description}</p>
      `;

      item.appendChild(card);
      DOM.dismantleCallouts.appendChild(item);
    });
  }

  function updateDismantleUI(progress) {
    if (!DOM.dismantleProgress) return;

    // 1px Xenon progress line at bottom
    DOM.dismantleProgress.style.width = `${progress * 100}%`;

    // Callouts reveal after 70% progress
    const callouts = CFG.dismantle.callouts;
    callouts.forEach((co) => {
      const el = document.getElementById(`callout-${co.id}`);
      if (!el) return;
      if (progress >= co.triggerProgress) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  /* ==========================================================================
     8. Section 4: Lineup Accordion
     ========================================================================== */
  let activeSlideIndex = 0;
  let hoverTimeout = null;

  function initLineupAccordion() {
    const cars = CFG.lineup.cars;
    DOM.lineupAccordion.innerHTML = '';

    cars.forEach((car, idx) => {
      const slide = document.createElement('button');
      slide.type = 'button';
      slide.className = `lineup-slide ${idx === 0 ? 'is-open' : ''}`;
      slide.setAttribute('aria-expanded', idx === 0 ? 'true' : 'false');
      slide.setAttribute('aria-label', `${car.num} ${car.name}`);
      slide.dataset.index = idx;
      slide.dataset.cursor = idx === 0 ? 'CONFIGURE' : 'OPEN';

      // 1. Closed View
      const closedView = document.createElement('div');
      closedView.className = 'slide-closed-view';
      closedView.innerHTML = `
        <span class="slide-number-closed">${car.num}</span>
        <span class="slide-name-rotated">${car.name}</span>
        <span class="mono-label" style="opacity: 0;">—</span>
      `;

      // Closed background cropped image
      const closedImgWrap = document.createElement('div');
      closedImgWrap.className = 'slide-closed-img-wrap';
      closedImgWrap.innerHTML = `
        <img class="slide-closed-img" src="${car.image}" alt="" loading="lazy" onerror="this.src='${CFG.lineup.placeholderImage}'">
      `;

      // 2. Open View
      const openView = document.createElement('div');
      openView.className = 'slide-open-view';

      // Top info
      const openHeader = document.createElement('div');
      openHeader.className = 'slide-open-header';
      openHeader.innerHTML = `
        <div class="reveal-line-wrap">
          <h3 class="slide-open-name reveal-line">${car.name}</h3>
        </div>
        <span class="slide-open-num">${car.num}</span>
      `;

      // Bottom info under car
      const openBottom = document.createElement('div');
      openBottom.className = 'slide-open-bottom';
      openBottom.innerHTML = `
        <div class="reveal-line-wrap">
          <p class="slide-tagline reveal-line">${car.tagline}</p>
        </div>
        <div class="slide-specs-grid">
          <div class="spec-item">
            <span class="spec-label">RANGE</span>
            <span class="spec-val">${car.specs.range}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">0–100 KM/H</span>
            <span class="spec-val">${car.specs.accel}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">POWER</span>
            <span class="spec-val">${car.specs.power}</span>
          </div>
        </div>
        <div class="slide-swatches-and-link">
          <div class="slide-swatches" aria-label="Color Swatches">
            ${car.swatches.map((col, sIdx) => `
              <button type="button" class="color-swatch ${sIdx === 0 ? 'active' : ''}" style="background-color: ${col};" aria-label="Color option ${sIdx + 1}" data-cursor="VIEW"></button>
            `).join('')}
          </div>
          <a href="#reserve" class="slide-config-link" data-cursor="CONFIGURE">Configure →</a>
        </div>
      `;

      // Shared Car Stage sitting on floor line at 72%
      const carStage = document.createElement('div');
      carStage.className = 'slide-car-stage';
      carStage.innerHTML = `
        <img class="slide-car-img" src="${car.image}" alt="${car.alt}" loading="lazy" onerror="this.src='${CFG.lineup.placeholderImage}'">
        <div class="slide-floor-line" aria-hidden="true"></div>
      `;

      openView.appendChild(openHeader);
      openView.appendChild(openBottom);

      slide.appendChild(closedImgWrap);
      slide.appendChild(closedView);
      slide.appendChild(carStage);
      slide.appendChild(openView);

      // Event listeners
      // Hover with 80ms debounce
      slide.addEventListener('mouseenter', () => {
        if (window.innerWidth < CFG.mobileBreakpoint) return;
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          setOpenSlide(idx);
        }, CFG.motion.hoverDebounceMs || 80);
      });

      // Click / Tap (Touch devices & keyboard click)
      slide.addEventListener('click', (e) => {
        // If clicked on swatch or config link, let it handle
        if (e.target.closest('.color-swatch') || e.target.closest('.slide-config-link')) {
          return;
        }
        setOpenSlide(idx);
      });

      // Swatch selection inside slide
      slide.querySelectorAll('.color-swatch').forEach((swatch) => {
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          slide.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
        });
      });

      DOM.lineupAccordion.appendChild(slide);
    });

    // Keyboard Arrow navigation
    DOM.lineupAccordion.addEventListener('keydown', (e) => {
      const slides = Array.from(DOM.lineupAccordion.querySelectorAll('.lineup-slide'));
      let targetIdx = activeSlideIndex;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        targetIdx = (activeSlideIndex + 1) % slides.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        targetIdx = (activeSlideIndex - 1 + slides.length) % slides.length;
      }

      if (targetIdx !== activeSlideIndex) {
        setOpenSlide(targetIdx);
        slides[targetIdx].focus();
      }
    });

    // Section reveal observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          DOM.lineupAccordion.classList.add('is-revealed');
        }
      });
    }, { threshold: 0.15 });

    observer.observe(DOM.lineupSection);
  }

  function setOpenSlide(index) {
    if (activeSlideIndex === index && DOM.lineupAccordion.children[index].classList.contains('is-open')) {
      return;
    }

    const slides = Array.from(DOM.lineupAccordion.querySelectorAll('.lineup-slide'));
    slides.forEach((s, idx) => {
      const isOpen = idx === index;
      s.classList.toggle('is-open', isOpen);
      s.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      s.dataset.cursor = isOpen ? 'CONFIGURE' : 'OPEN';
    });

    activeSlideIndex = index;
  }

  /* ==========================================================================
     8b. Section 5: Reserve Section & Modal
     ========================================================================== */
  function initReserveSection() {
    if (!DOM.reserveSection) return;

    // IntersectionObserver to trigger line-by-line reveal
    const reserveObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          DOM.reserveSection.classList.add('is-revealed');
        }
      });
    }, { threshold: 0.15 });

    reserveObserver.observe(DOM.reserveSection);

    // Modal Handlers
    const openModal = () => {
      if (!DOM.reserveModal) return;
      DOM.reserveModal.classList.add('is-active');
      DOM.reserveModal.setAttribute('aria-hidden', 'false');
      // Reset form view
      if (DOM.reserveForm) DOM.reserveForm.classList.remove('is-hidden');
      if (DOM.reserveConfirmation) DOM.reserveConfirmation.classList.add('is-hidden');
    };

    const closeModal = () => {
      if (!DOM.reserveModal) return;
      DOM.reserveModal.classList.remove('is-active');
      DOM.reserveModal.setAttribute('aria-hidden', 'true');
    };

    if (DOM.openReserveBtn) {
      DOM.openReserveBtn.addEventListener('click', openModal);
    }

    if (DOM.closeModalBtn) {
      DOM.closeModalBtn.addEventListener('click', closeModal);
    }

    if (DOM.closeModalBackdrop) {
      DOM.closeModalBackdrop.addEventListener('click', closeModal);
    }

    if (DOM.confirmDismissBtn) {
      DOM.confirmDismissBtn.addEventListener('click', closeModal);
    }

    // Escape key closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && DOM.reserveModal && DOM.reserveModal.classList.contains('is-active')) {
        closeModal();
      }
    });

    // Form submission simulation
    if (DOM.reserveForm) {
      DOM.reserveForm.addEventListener('submit', (e) => {
        e.preventDefault();
        DOM.reserveForm.classList.add('is-hidden');
        if (DOM.reserveConfirmation) {
          DOM.reserveConfirmation.classList.remove('is-hidden');
        }
      });
    }
  }

  /* ==========================================================================
     9. Navigation Hide/Show on Scroll
     ========================================================================== */
  let lastScrollY = window.scrollY;

  function updateNavigation() {
    const currentScrollY = window.scrollY;
    if (currentScrollY > 100) {
      if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 6) {
        // Scrolling down -> hide nav
        DOM.nav.classList.add('is-hidden');
      } else if (lastScrollY - currentScrollY > 6) {
        // Scrolling up -> show nav
        DOM.nav.classList.remove('is-hidden');
      }
    } else {
      DOM.nav.classList.remove('is-hidden');
    }
    lastScrollY = currentScrollY;
  }

  /* ==========================================================================
     10. Film-Grain Noise Overlay
     Offscreen canvas noise tile, shifted ~8 times per second (125ms), 3-4% opacity
     ========================================================================== */
  function initFilmGrain() {
    if (prefersReducedMotion || !DOM.grainCanvas) return;

    const gCtx = DOM.grainCanvas.getContext('2d');
    const tileSize = 256;
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = tileSize;
    tileCanvas.height = tileSize;
    const tCtx = tileCanvas.getContext('2d');
    const imgData = tCtx.createImageData(tileSize, tileSize);
    const data = imgData.data;

    // Generate random monochrome noise
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    tCtx.putImageData(imgData, 0, 0);

    const resizeGrain = () => {
      DOM.grainCanvas.width = window.innerWidth;
      DOM.grainCanvas.height = window.innerHeight;
    };
    resizeGrain();
    window.addEventListener('resize', resizeGrain);

    // Shift noise pattern ~8 times per second (every 125ms)
    setInterval(() => {
      const w = DOM.grainCanvas.width;
      const h = DOM.grainCanvas.height;
      gCtx.clearRect(0, 0, w, h);

      // Random shift offset
      const ox = -Math.floor(Math.random() * tileSize);
      const oy = -Math.floor(Math.random() * tileSize);

      for (let x = ox; x < w; x += tileSize) {
        for (let y = oy; y < h; y += tileSize) {
          gCtx.drawImage(tileCanvas, x, y);
        }
      }
    }, 125);
  }

  /* ==========================================================================
     11. Custom Cursor ("The Headlight", Desktop Only)
     6px solid xenon dot inside 28px ring, follows mouse lerp 0.18.
     Morphs into 44x2px light bar with label over interactive elements.
     ========================================================================== */
  const cursorState = {
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    currentX: window.innerWidth / 2,
    currentY: window.innerHeight / 2,
    isHovering: false,
    label: ''
  };

  function initCustomCursor() {
    if (!isFinePointer || prefersReducedMotion || !DOM.cursor) return;

    const cursorLabel = DOM.cursor.querySelector('.cursor-label');

    window.addEventListener('mousemove', (e) => {
      cursorState.mouseX = e.clientX;
      cursorState.mouseY = e.clientY;

      // Detect hover target
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target) return;

      const interactive = target.closest('a, button, [data-cursor], .lineup-slide');
      if (interactive) {
        cursorState.isHovering = true;
        cursorState.label = interactive.dataset.cursor || 'VIEW';
        DOM.cursor.classList.add('is-hovering');
        cursorLabel.textContent = cursorState.label;
      } else {
        cursorState.isHovering = false;
        DOM.cursor.classList.remove('is-hovering');
        cursorLabel.textContent = '';
      }
    });

    // Mousedown brightens light bar for 120ms
    window.addEventListener('mousedown', () => {
      DOM.cursor.classList.add('is-active');
      setTimeout(() => {
        DOM.cursor.classList.remove('is-active');
      }, 120);
    });

    // Render loop for smooth cursor lerp
    function renderCursor() {
      cursorState.currentX += (cursorState.mouseX - cursorState.currentX) * (CFG.motion.lerpCursor || 0.18);
      cursorState.currentY += (cursorState.mouseY - cursorState.currentY) * (CFG.motion.lerpCursor || 0.18);

      DOM.cursor.style.transform = `translate(${cursorState.currentX}px, ${cursorState.currentY}px)`;
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);
  }

  /* ==========================================================================
     12. Reduced Motion Fallback Mode
     ========================================================================== */
  function initReducedMotion() {
    DOM.body.classList.add('reduced-motion');
    // Preload keyframes and render them statically
    heroLoader.loadFrame(1).then((img) => {
      if (img && DOM.heroCanvas) {
        const ctx = DOM.heroCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, DOM.heroCanvas.width, DOM.heroCanvas.height);
      }
    });
    dismantleLoader.loadFrame(1).then((img) => {
      if (img && DOM.dismantleCanvas) {
        const ctx = DOM.dismantleCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, DOM.dismantleCanvas.width, DOM.dismantleCanvas.height);
      }
    });
  }

  /* ==========================================================================
     13. Main Unified Animation Loop (60 FPS)
     ========================================================================== */
  function mainLoop() {
    if (!prefersReducedMotion) {
      if (heroScroller) {
        heroScroller.update();
        updateHeroUI(heroScroller.smoothedProgress);
      }

      if (dismantleScroller) {
        dismantleScroller.update();
        updateDismantleUI(dismantleScroller.smoothedProgress);
      }

      updateStatementSection();
    }

    requestAnimationFrame(mainLoop);
  }

  /* ==========================================================================
     14. Global Event Handlers
     ========================================================================== */
  window.addEventListener('scroll', updateNavigation, { passive: true });

  window.addEventListener('resize', () => {
    if (heroScroller) heroScroller.resize();
    if (dismantleScroller) dismantleScroller.resize();
  });

  /* ==========================================================================
     15. Application Boot
     ========================================================================== */
  function boot() {
    initStatementSection();
    initDismantleCallouts();
    initLineupAccordion();
    initReserveSection();
    initFilmGrain();
    initCustomCursor();

    if (prefersReducedMotion) {
      initReducedMotion();
    } else {
      initPreloader();
      requestAnimationFrame(mainLoop);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
