// The TutorAI Voice orb: a printed disc on the panel's paper, drawn on a <canvas class="voice-orb">.
// Idle, it breathes. Listening, it swells with your voice inside a thin ring.
// Thinking, three beads of its own shade circle it, bunching and spreading.
// Speaking, rings of five colours and the ink push out from its edge.
// Colours come from voice-design.css (--voice-disc, --voice-listen, --voice-paper, --voice-ring-1..6),
// read off the canvas, so they follow data-theme on <html>.
//
//   const orb = VoiceOrb.create(document.querySelector('.voice-orb'));
//   orb.start();
//   orb.setState('listening');            // idle | listening | thinking | speaking
//   orb.setLevels([b1, b2, b3, b4, b5], level);   // 0-1: the voice being heard, every frame
//   orb.refresh();                        // after a theme change that is not data-theme on <html>
//   orb.stop();
(() => {
  const TAU = Math.PI * 2;
  const STATES = ['idle', 'listening', 'thinking', 'speaking'];
  const OUT_LIFE = 1.15;               // seconds for a speaking ring, disc edge to rim
  const BEAD_TINTS = [0, 0.38, 0.62];  // the disc's shade, then two lighter tints of it
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const rgb = (colour) => {
    const hex = colour.trim().replace('#', '');
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  };
  const mix = (a, b, amount) => {
    const x = rgb(a), y = rgb(b);
    return `rgb(${x.map((value, i) => Math.round(value + (y[i] - value) * amount)).join(' ')})`;
  };

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const weights = { idle: 1, listening: 0, thinking: 0, speaking: 0 };
    let state = 'idle';
    let bands = [0, 0, 0, 0, 0];
    let level = 0;
    let palette = null;
    let speckles = null;
    let rings = [];
    let ringCount = 0;
    let lastRing = -1;
    let beads = [0, 0.35, 0.7];
    let clock = 0;
    let last = 0;
    let frame = 0;

    const readPalette = () => {
      const css = getComputedStyle(canvas);
      const role = (name) => css.getPropertyValue(name).trim();
      palette = {
        disc: role('--voice-disc'), listen: role('--voice-listen'), paper: role('--voice-paper'),
        speak: [1, 2, 3, 4, 5, 6].map((n) => role(`--voice-ring-${n}`)),
      };
      speckles = null;
    };

    // The paper showing through the ink, drawn once per theme at device pixels
    const grain = () => {
      if (!speckles) {
        const size = 192, tile = document.createElement('canvas');
        tile.width = tile.height = size;
        const tileContext = tile.getContext('2d');
        const image = tileContext.createImageData(size, size);
        const [r, g, b] = rgb(palette.paper);
        for (let i = 0; i < image.data.length; i += 4) {
          const n = Math.random();
          image.data[i] = r; image.data[i + 1] = g; image.data[i + 2] = b;
          image.data[i + 3] = n > 0.55 ? Math.round((n - 0.55) / 0.45 * 255 * 0.2) : 0;
        }
        tileContext.putImageData(image, 0, 0);
        speckles = ctx.createPattern(tile, 'repeat');
      }
      return speckles;
    };

    const draw = (S, dt) => {
      const w = weights, t = clock;
      const c = S / 2, R0 = S * 0.3, rim = S * 0.47;

      if (w.speaking > 0.5 && level > 0.42 && t - lastRing > 0.17 && !reduced.matches) {
        rings.push({ born: t, colour: palette.speak[ringCount++ % palette.speak.length] });
        lastRing = t;
      }
      rings = rings.filter((ring) => t - ring.born < OUT_LIFE);
      for (const ring of rings) {
        const a = (t - ring.born) / OUT_LIFE;
        ctx.globalAlpha = Math.pow(1 - a, 1.3);
        ctx.strokeStyle = ring.colour;
        ctx.lineWidth = Math.max(1.2, S * 0.03 * (1 - a));
        ctx.beginPath(); ctx.arc(c, c, R0 + a * (rim - R0), 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const R = R0 * (1 + w.idle * 0.015 * Math.sin(t * 1.3) + w.listening * 0.07 * level
        + w.speaking * 0.05 * level - w.thinking * 0.03);

      if (w.thinking > 0.01) {
        // each bead a little quicker than the one ahead, so the train bunches and spreads
        const orbit = R + S * 0.075;
        beads = beads.map((angle, i) => angle + dt * (reduced.matches ? 1.2 : 3.4 + 0.55 * Math.sin(t * 1.6 + i * 2.1)));
        beads.forEach((angle, i) => {
          ctx.globalAlpha = w.thinking;
          ctx.fillStyle = mix(palette.disc, palette.paper, BEAD_TINTS[i]);
          ctx.beginPath();
          ctx.arc(c + orbit * Math.cos(angle), c + orbit * Math.sin(angle), S * (0.026 - 0.004 * i), 0, TAU);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      if (w.listening > 0.01) {
        ctx.globalAlpha = w.listening;
        ctx.strokeStyle = palette.listen;
        ctx.lineWidth = 1.2 + 4 * level;
        ctx.beginPath(); ctx.arc(c, c, R + S * 0.035, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = palette.disc;
      ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.fill();
    };

    const tick = (now) => {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0) * (reduced.matches ? 0.45 : 1);
      last = now;
      clock += dt;
      const ease = 1 - Math.exp(-dt / 0.22);
      for (const name of STATES) weights[name] += ((name === state ? 1 : 0) - weights[name]) * ease;

      const css = canvas.clientWidth;
      if (css) {
        const px = Math.round(css * Math.min(window.devicePixelRatio || 1, 3));
        if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
        ctx.setTransform(px / css, 0, 0, px / css, 0, 0);
        ctx.clearRect(0, 0, css, css);
        draw(css, dt);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = grain();
        ctx.fillRect(0, 0, px, px);
        ctx.restore();
      }
      frame = requestAnimationFrame(tick);
    };

    const themeWatch = new MutationObserver(readPalette);

    return {
      // idle, listening, thinking or speaking; anything else draws as idle
      setState(next) { state = STATES.includes(next) ? next : 'idle'; },
      // five loudness bands, 0-1, and one overall level: the voice you are hearing
      setLevels(nextBands, nextLevel) { bands = nextBands; level = nextLevel; },
      refresh: readPalette,
      start() {
        if (frame) return;
        readPalette();
        themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        last = 0;
        frame = requestAnimationFrame(tick);
      },
      stop() {
        cancelAnimationFrame(frame);
        frame = 0;
        themeWatch.disconnect();
        rings = [];
      },
    };
  }

  window.VoiceOrb = { create };
})();
