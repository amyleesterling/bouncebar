(function () {
  const canvas = document.getElementById('footer-particle-bar');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  let particles = [];
  let width = window.innerWidth;
  let height = 360; // keep in sync with CSS
  let lastTime = 0;
  let splashCooldown = false;
  let isAtBottom = false;
  let wasAtBottom = false;
  const BAND_THICKNESS = 40;
  const BAND_ROWS = 8;
  const MASK_TEXT = 'connectomics rules';
  let textMaskData = null;
  let textMaskWidth = 0;
  let textMaskHeight = 0;

  // Darker palette for light background
  const COLORS = [
    'rgba(28, 54, 74, 0.85)',   // deep navy
    'rgba(31, 92, 99, 0.85)',   // deep teal
    'rgba(112, 36, 80, 0.85)',  // deep magenta
    'rgba(72, 54, 112, 0.85)',  // deep violet
    'rgba(46, 62, 79, 0.85)',   // slate
    'rgba(22, 74, 98, 0.85)',   // ink blue
    'rgba(94, 56, 36, 0.85)',   // umber
    'rgba(52, 86, 60, 0.85)'    // moss
  ];

  function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  function buildTextMask() {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const mctx = maskCanvas.getContext('2d');
    mctx.clearRect(0, 0, width, height);

    const fontSize = Math.max(24, Math.min(52, width / 18));
    mctx.font = `700 ${fontSize}px "Source Serif 4", "Iowan Old Style", "Times New Roman", serif`;
    mctx.textAlign = 'center';
    mctx.textBaseline = 'middle';
    mctx.fillStyle = '#000';

    const floorY = height - 8;
    const textY = floorY - (BAND_THICKNESS / 2);
    mctx.fillText(MASK_TEXT, width / 2, textY);

    const imageData = mctx.getImageData(0, 0, width, height);
    textMaskData = imageData.data;
    textMaskWidth = width;
    textMaskHeight = height;
  }

  function isMasked(x, y) {
    if (!textMaskData) return false;
    const ix = Math.max(0, Math.min(textMaskWidth - 1, Math.round(x)));
    const iy = Math.max(0, Math.min(textMaskHeight - 1, Math.round(y)));
    const idx = (iy * textMaskWidth + ix) * 4 + 3;
    return textMaskData[idx] > 10;
  }

  function findNearestEdge(x, y, maxRadius) {
    for (let r = 1; r <= maxRadius; r++) {
      const candidates = [
        { x: x + r, y },
        { x: x - r, y },
        { x, y: y + r },
        { x, y: y - r },
        { x: x + r, y: y + r },
        { x: x - r, y: y + r },
        { x: x + r, y: y - r },
        { x: x - r, y: y - r }
      ];

      for (const c of candidates) {
        if (!isMasked(c.x, c.y)) {
          return c;
        }
      }
    }
    return null;
  }

  function resize() {
    width = window.innerWidth;
    height = parseInt(getComputedStyle(canvas).height, 10) || 360;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildTextMask();
    initParticles();
  }

  window.addEventListener('resize', resize);

  function initParticles() {
    particles = [];

    const numX = Math.floor(width / 2.45); // ~30% more density across the bar
    const floorY = height - 8;
    const thickness = BAND_THICKNESS; // vertical thickness of the particle band
    const rowSpacing = thickness / BAND_ROWS;

    for (let row = 0; row < BAND_ROWS; row++) {
      for (let i = 0; i < numX; i++) {
        const x = (i / (numX - 1 || 1)) * width;
        const y = floorY - (row * rowSpacing);
        // randomize resting height within the thickness for a tank effect
        const restY = floorY - Math.random() * thickness;
        let restX = x;
        let finalRestY = restY;
        if (isMasked(restX, finalRestY)) {
          const edge = findNearestEdge(restX, finalRestY, 18);
          if (!edge) {
            continue;
          }
          restX = edge.x;
          finalRestY = edge.y;
        }
        particles.push({
          x: restX,
          y,
          vx: 0,
          vy: 0,
          restX: restX,
          restY: finalRestY,
          radius: 1.6,
          size: 0.85 + Math.random() * 0.5,
          color: randomColor(),
          settled: false,
          motion: null
        });
      }
    }
  }

  function triggerSplash() {
    if (splashCooldown || particles.length === 0) return;
    splashCooldown = true;

    particles.forEach(p => {
      p.settled = false;
      const maxRise = Math.max(24, Math.min(160, p.restY - 12));
      p.motion = {
        time: 0,
        duration: 1.8 + Math.random() * 0.9,
        rise: maxRise * (0.7 + Math.random() * 0.5),
        drift: (Math.random() - 0.5) * 60
      };
      // Optionally re-randomize color on each splash:
      p.color = randomColor();
    });

    setTimeout(() => {
      splashCooldown = false;
    }, 1200);
  }

  function update(dt) {
    if (dt > 0.05) dt = 0.05; // clamp when tab was in background

    particles.forEach(p => {
      if (p.settled || !p.motion) return;

      p.motion.time += dt;
      const t = Math.min(1, p.motion.time / p.motion.duration);
      const arc = Math.sin(Math.PI * t);

      const y = p.restY - (p.motion.rise * arc);
      const x = p.restX + (p.motion.drift * arc);

      p.y = Math.max(0, y);
      p.x = Math.min(width, Math.max(0, x));

      if (t >= 1) {
        p.x = p.restX;
        p.y = p.restY;
        p.motion = null;
        p.settled = true;
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // only show if at bottom
    if (!isAtBottom) return;

    // subtle glow behind the bar
    ctx.save();
    const gradient = ctx.createLinearGradient(0, height - 10, 0, height);
    gradient.addColorStop(0, 'rgba(180, 220, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(180, 220, 255, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - 12, width, 12);
    ctx.restore();

    // particles
    particles.forEach(p => {
      // draw main particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    const allSettled = isAtBottom && particles.length > 0 && particles.every(p => p.settled);
    document.body.classList.toggle('show-callout', allSettled);
    draw();
    requestAnimationFrame(loop);
  }

  function handleScroll() {
    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    const threshold = 5;

    isAtBottom = scrollPosition >= pageHeight - threshold;
    if (isAtBottom && !wasAtBottom) {
      triggerSplash();
    }
    wasAtBottom = isAtBottom;

    if (!isAtBottom) {
      document.body.classList.remove('show-callout');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  // kick everything off
  resize();
  requestAnimationFrame(loop);
})();
