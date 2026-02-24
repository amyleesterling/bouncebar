(function () {
  const canvas = document.getElementById('footer-particle-bar');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  let particles = [];
  let width = window.innerWidth;
  let height = 70; // keep in sync with CSS
  let lastTime = 0;
  let splashCooldown = false;

  // Pretty palette: blue, teal, hot pink, purple
  const COLORS = [
    'rgba(120, 205, 255, 0.95)',  // light blue
    'rgba(90, 240, 210, 0.95)',   // teal
    'rgba(255, 110, 190, 0.95)',  // hot pink
    'rgba(190, 140, 255, 0.95)'   // purple
    'rgba(255, 245, 255, 0.95)',  // pearlescent white
'rgba(255, 220, 245, 0.95)',  // cotton candy pink
'rgba(255, 185, 225, 0.95)',  // bubblegum mist
'rgba(235, 205, 255, 0.95)',  // lavender haze
'rgba(210, 225, 255, 0.95)',  // powder blue
'rgba(185, 240, 255, 0.95)',  // sky shimmer
'rgba(200, 255, 250, 0.95)',  // ice-teal glow
'rgba(255, 235, 255, 0.95)',  // opal blush
'rgba(240, 205, 255, 0.95)',  // lilac bloom
'rgba(255, 200, 240, 0.95)'   // rose quartz
  ];

  function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  function resize() {
    width = window.innerWidth;
    height = parseInt(getComputedStyle(canvas).height, 10) || 70;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    initParticles();
  }

  window.addEventListener('resize', resize);

  function initParticles() {
    particles = [];

    const numParticles = Math.floor(width / 8); // density across the bar
    const floorY = height - 8;

    for (let i = 0; i < numParticles; i++) {
      const x = (i / (numParticles - 1 || 1)) * width;
      particles.push({
        x,
        y: floorY,
        vx: 0,
        vy: 0,
        restX: x,
        restY: floorY,
        radius: 2.4,
        color: randomColor()
      });
    }
  }

  function triggerSplash() {
    if (splashCooldown || particles.length === 0) return;
    splashCooldown = true;

    const baseStrength = 7 + Math.random() * 3;

    particles.forEach(p => {
      p.vx = (Math.random() - 0.5) * 3;
      p.vy = -baseStrength - Math.random() * 4;
      // Optionally re-randomize color on each splash:
      p.color = randomColor();
    });

    setTimeout(() => {
      splashCooldown = false;
    }, 1200);
  }

  function update(dt) {
    if (dt > 0.05) dt = 0.05; // clamp when tab was in background

    const gravity  = 35;
    const damping  = 0.82;
    const spring   = 6;
    const friction = 0.985;
    const floorY   = height - 8;

    particles.forEach(p => {
      // gravity
      p.vy += gravity * dt;

      // integrate
      p.x += p.vx;
      p.y += p.vy;

      // floor collision
      if (p.y > floorY) {
        p.y = floorY;
        if (Math.abs(p.vy) > 2) {
          p.vy *= -damping;
        } else {
          p.vy = 0;
        }
      }

      // spring back toward resting bar position
      const dx = p.restX - p.x;
      const dy = p.restY - p.y;

      p.vx += dx * spring * dt;

      if (Math.abs(dy) < 20) {
        p.vy += dy * (spring * 0.6) * dt;
      }

      // friction on x
      p.vx *= friction;

      // snap back when basically at rest
      if (
        Math.abs(dx) < 0.5 &&
        Math.abs(dy) < 0.5 &&
        Math.abs(p.vx) < 0.2 &&
        Math.abs(p.vy) < 0.2
      ) {
        p.x = p.restX;
        p.y = p.restY;
        p.vx = 0;
        p.vy = 0;
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

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
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function handleScroll() {
    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    const threshold = 5;

    if (scrollPosition >= pageHeight - threshold) {
      triggerSplash();
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  // kick everything off
  resize();
  requestAnimationFrame(loop);
})();
