/**
 * NOCTIS Configuration
 * All section heights, chapter ranges, frame counts, frame paths and callout positions.
 */

const CONFIG = {
  // Frame sequence counts and paths (generated in Step 1)
  frames: {
    hero: {
      count: 713,
      desktopPath: 'assets/frames/hero/frame_{index}.webp',
      mobilePath: 'assets/frames/hero-mobile/frame_{index}.webp',
      padLength: 4,
      preloadInitial: 40 // Initial chunk required before preloader dismisses
    },
    dismantle: {
      count: 238,
      desktopPath: 'assets/frames/dismantle/frame_{index}.webp',
      mobilePath: 'assets/frames/dismantle-mobile/frame_{index}.webp',
      padLength: 4
    }
  },

  // Breakpoints
  mobileBreakpoint: 768,

  // Section Heights (Tall pinned wrappers)
  heights: {
    hero: '600vh',
    statement: '100vh',
    dismantle: '350vh',
    lineup: '100vh',
    reserve: '100vh'
  },

  // Hero Scrollytelling Chapter Ranges [startProgress, endProgress]
  heroChapters: [
    {
      id: 1,
      range: [0.00, 0.14],
      title: 'NOCTIS',
      subtitle: 'The city is asleep.',
      hint: 'SCROLL TO WAKE IT'
    },
    {
      id: 2,
      range: [0.22, 0.40],
      text: "It doesn't need the city's light."
    },
    {
      id: 3,
      range: [0.50, 0.68],
      text: 'It brings its own.'
    },
    {
      id: 4,
      range: [0.80, 1.00],
      title: 'GT-E',
      specs: '0–100 KM/H 3.1S · 640 KM RANGE · DUAL MOTOR',
      linkText: 'Discover the GT-E',
      linkHref: '#lineup'
    }
  ],

  // Hero HUD Configuration
  heroHud: {
    maxSpeedKmH: 118,
    maxDistanceKm: 4.2,
    totalChapters: 4
  },

  // Hero Canvas fade to solid black over last scroll percentage
  heroFadeOutStart: 0.95,

  // Dismantle Callouts Configuration (activate after 70% progress = 0.70 -> 1.00)
  dismantle: {
    calloutsStartProgress: 0.70,
    title: 'Look closer.',
    callouts: [
      {
        id: 'body',
        code: '01',
        label: 'BODY',
        description: 'Carbon composite monocoque',
        // Target dot position on canvas (% of width and height)
        dot: { x: 36, y: 28 },
        // Label position relative to dot (% of width and height)
        labelPos: { x: 20, y: 20 },
        // Line coordinates: dot -> elbow -> label
        triggerProgress: 0.72
      },
      {
        id: 'battery',
        code: '02',
        label: 'BATTERY',
        description: '110 kWh structural pack',
        dot: { x: 48, y: 76 },
        labelPos: { x: 32, y: 85 },
        triggerProgress: 0.79
      },
      {
        id: 'drive',
        code: '03',
        label: 'DRIVE',
        description: 'Dual axial-flux motors, 680 kW',
        dot: { x: 66, y: 56 },
        labelPos: { x: 76, y: 68 },
        triggerProgress: 0.86
      },
      {
        id: 'light',
        code: '04',
        label: 'LIGHT',
        description: 'Single-line LED signature',
        dot: { x: 75, y: 34 },
        labelPos: { x: 82, y: 24 },
        triggerProgress: 0.93
      }
    ]
  },

  // Lineup Models Data
  lineup: {
    label: '03 — THE LINEUP',
    headline: 'Five ways to drive the night.',
    placeholderImage: 'assets/cars/last.png',
    cars: [
      {
        id: 'gt-e',
        num: '01',
        name: 'GT-E',
        tagline: 'The grand tourer.',
        specs: {
          range: '640 km',
          accel: '3.1 s',
          power: '680 kW'
        },
        image: 'assets/cars/gt-e.webp',
        alt: 'NOCTIS GT-E matte graphite grand tourer coupe side profile',
        swatches: ['#1A1C20', '#EDEAE4', '#0D1B2A', '#8B0000']
      },
      {
        id: 's',
        num: '02',
        name: 'S',
        tagline: 'Four doors, no compromise.',
        specs: {
          range: '600 km',
          accel: '3.6 s',
          power: '520 kW'
        },
        image: 'assets/cars/s.webp',
        alt: 'NOCTIS S satin bone white sport sedan side profile',
        swatches: ['#EDEAE4', '#1A1C20', '#1C2833', '#4A5568']
      },
      {
        id: 'x',
        num: '03',
        name: 'X',
        tagline: 'Higher, never heavier.',
        specs: {
          range: '560 km',
          accel: '4.2 s',
          power: '480 kW'
        },
        image: 'assets/cars/x.webp',
        alt: 'NOCTIS X midnight blue SUV coupe side profile',
        swatches: ['#0B192C', '#1E2022', '#F0EBE1', '#2C3E50']
      },
      {
        id: 'r',
        num: '04',
        name: 'R',
        tagline: 'Built for the track.',
        specs: {
          range: '420 km',
          accel: '2.4 s',
          power: '900 kW'
        },
        image: 'assets/cars/r.webp',
        alt: 'NOCTIS R satin black track coupe with red accents side profile',
        swatches: ['#0E1111', '#E1251B', '#232B2B', '#E5E4E2']
      },
      {
        id: 'one',
        num: '05',
        name: 'ONE',
        tagline: 'The future, early.',
        specs: {
          range: 'Concept',
          accel: 'Concept',
          power: 'Concept'
        },
        image: 'assets/cars/one.webp',
        alt: 'NOCTIS ONE liquid silver concept hypercar side profile',
        swatches: ['#D4D8DD', '#171A21', '#8C92AC', '#000000']
      }
    ]
  },

  // Easing & Animation Settings
  motion: {
    lerpCanvas: 0.15,
    lerpCursor: 0.18,
    hoverDebounceMs: 80
  }
};

// Export for usage if in module environment, or attach to window
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
