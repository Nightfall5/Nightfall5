(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas?.getContext("2d");
  const overlay = document.querySelector("#game-overlay");
  const overlayKicker = document.querySelector("#overlay-kicker");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayDescription = document.querySelector("#overlay-description");
  const startButton = document.querySelector("#start-button");
  const pauseButton = document.querySelector("#pause-button");
  const statusLabel = document.querySelector("#game-status");
  const scoreLabel = document.querySelector("#score-value");
  const bestLabel = document.querySelector("#best-value");
  const sidebarBest = document.querySelector("#sidebar-best");
  const shieldLabel = document.querySelector("#shield-value");
  const leftButton = document.querySelector("#left-control");
  const rightButton = document.querySelector("#right-control");

  if (!canvas || !ctx) return;

  const WIDTH = 960;
  const HEIGHT = 620;
  const STORAGE_KEY = "adhy-orbit-breaker-best-v1";
  const input = { left: false, right: false };
  const state = {
    mode: "ready",
    score: 0,
    best: loadBest(),
    shields: 3,
    elapsed: 0,
    lastFrame: 0,
    asteroidTimer: 0,
    orbTimer: 1.4,
    invulnerable: 0,
    shake: 0,
    player: { x: WIDTH / 2, y: HEIGHT - 76, radius: 17, speed: 560 },
    asteroids: [],
    orbs: [],
    particles: [],
    stars: []
  };

  function loadBest() {
    try {
      const value = Number(localStorage.getItem(STORAGE_KEY) || 0);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    } catch {
      return 0;
    }
  }

  function saveBest() {
    try { localStorage.setItem(STORAGE_KEY, String(state.best)); } catch { /* Storage may be disabled. */ }
  }

  for (let index = 0; index < 115; index += 1) {
    state.stars.push({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      size: Math.random() * 1.65 + 0.25,
      speed: Math.random() * 27 + 12,
      alpha: Math.random() * 0.6 + 0.18
    });
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(rect.width * (HEIGHT / WIDTH) * pixelRatio));
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    draw();
  }

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(6, "0");
  }

  function updateHud() {
    if (scoreLabel) scoreLabel.textContent = formatScore(state.score);
    if (bestLabel) bestLabel.textContent = formatScore(state.best);
    if (sidebarBest) sidebarBest.textContent = state.best ? formatScore(state.best) : "NO RECORD";
    if (shieldLabel) {
      shieldLabel.textContent = Array.from({ length: 3 }, (_, index) => index < state.shields ? "◆" : "◇").join(" ");
    }
  }

  function setStatus(value) {
    if (statusLabel) statusLabel.textContent = value;
  }

  function showOverlay({ kicker, title, description, button, hint = "" }) {
    overlayKicker.textContent = kicker;
    overlayTitle.innerHTML = title;
    overlayDescription.textContent = description;
    startButton.innerHTML = button;
    const hintNode = overlay.querySelector(".overlay-hint");
    hintNode.textContent = hint;
    overlay.classList.remove("is-hidden");
  }

  function hideOverlay() {
    overlay.classList.add("is-hidden");
  }

  function resetGame() {
    state.mode = "running";
    state.score = 0;
    state.shields = 3;
    state.elapsed = 0;
    state.asteroidTimer = 0.55;
    state.orbTimer = 1.25;
    state.invulnerable = 0;
    state.shake = 0;
    state.player.x = WIDTH / 2;
    state.asteroids = [];
    state.orbs = [];
    state.particles = [];
    input.left = false;
    input.right = false;
    pauseButton.disabled = false;
    pauseButton.textContent = "Ⅱ PAUSE";
    setStatus("RUN ACTIVE");
    hideOverlay();
    updateHud();
  }

  function startOrRestart() {
    resetGame();
    state.lastFrame = performance.now();
  }

  function pauseGame() {
    if (state.mode === "running") {
      state.mode = "paused";
      setStatus("PAUSED");
      pauseButton.textContent = "▶ RESUME";
      showOverlay({
        kicker: "FLIGHT SUSPENDED",
        title: "TAKE A<br><span>BREATHER.</span>",
        description: "Your run is safe. Resume when you're ready.",
        button: "RESUME RUN <span>▶</span>",
        hint: "PRESS SPACE TO RESUME"
      });
    } else if (state.mode === "paused") {
      state.mode = "running";
      setStatus("RUN ACTIVE");
      pauseButton.textContent = "Ⅱ PAUSE";
      hideOverlay();
      state.lastFrame = performance.now();
    }
  }

  function endGame() {
    state.mode = "over";
    input.left = false;
    input.right = false;
    pauseButton.disabled = true;
    pauseButton.textContent = "Ⅱ PAUSE";
    setStatus("RUN ENDED");
    if (state.score > state.best) {
      state.best = state.score;
      saveBest();
    }
    updateHud();
    showOverlay({
      kicker: "SIGNAL LOST // RUN COMPLETE",
      title: "ORBIT <span>BREACHED.</span>",
      description: `You scored ${formatScore(state.score)} points. ${state.score >= state.best ? "A new personal record!" : "One more run could beat your record."}`,
      button: "RUN IT BACK <span>↻</span>",
      hint: "PRESS ENTER TO RESTART"
    });
  }

  function spawnAsteroid() {
    const difficulty = Math.min(1, state.elapsed / 75);
    const radius = 13 + Math.random() * 16;
    const sides = 7 + Math.floor(Math.random() * 4);
    const vertices = [];
    for (let index = 0; index < sides; index += 1) {
      const angle = (index / sides) * Math.PI * 2;
      const variance = 0.76 + Math.random() * 0.42;
      vertices.push({ x: Math.cos(angle) * radius * variance, y: Math.sin(angle) * radius * variance });
    }
    state.asteroids.push({
      x: 40 + Math.random() * (WIDTH - 80),
      y: -45,
      radius,
      vertices,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2.2,
      speed: 150 + Math.random() * 105 + difficulty * 135,
      tint: Math.random() > 0.5 ? "#b59cff" : "#7ab9d7"
    });
  }

  function spawnOrb() {
    state.orbs.push({
      x: 44 + Math.random() * (WIDTH - 88),
      y: -25,
      radius: 11,
      speed: 175 + Math.random() * 55 + Math.min(80, state.elapsed),
      phase: Math.random() * Math.PI * 2
    });
  }

  function burst(x, y, color, count = 14) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 55 + Math.random() * 210;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.45,
        maxLife: 0.8,
        size: 1.5 + Math.random() * 3.2,
        color
      });
    }
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function update(delta) {
    state.elapsed += delta;
    state.score += delta * 10;
    state.invulnerable = Math.max(0, state.invulnerable - delta);
    state.shake = Math.max(0, state.shake - delta * 24);

    const direction = Number(input.right) - Number(input.left);
    state.player.x += direction * state.player.speed * delta;
    state.player.x = Math.max(30, Math.min(WIDTH - 30, state.player.x));

    state.asteroidTimer -= delta;
    const asteroidInterval = Math.max(0.25, 0.92 - state.elapsed * 0.006);
    if (state.asteroidTimer <= 0) {
      spawnAsteroid();
      if (state.elapsed > 24 && Math.random() < 0.22) spawnAsteroid();
      state.asteroidTimer = asteroidInterval * (0.72 + Math.random() * 0.64);
    }

    state.orbTimer -= delta;
    if (state.orbTimer <= 0) {
      spawnOrb();
      state.orbTimer = 2.3 + Math.random() * 1.9;
    }

    for (let index = state.asteroids.length - 1; index >= 0; index -= 1) {
      const rock = state.asteroids[index];
      rock.y += rock.speed * delta;
      rock.rotation += rock.spin * delta;
      if (rock.y > HEIGHT + 60) {
        state.asteroids.splice(index, 1);
        continue;
      }
      if (state.invulnerable <= 0 && distance(rock.x, rock.y, state.player.x, state.player.y) < rock.radius + state.player.radius * 0.76) {
        state.asteroids.splice(index, 1);
        state.shields -= 1;
        state.invulnerable = 1.25;
        state.shake = 8;
        burst(state.player.x, state.player.y, "#ff8eac", 22);
        updateHud();
        if (state.shields <= 0) {
          endGame();
          return;
        }
      }
    }

    for (let index = state.orbs.length - 1; index >= 0; index -= 1) {
      const orb = state.orbs[index];
      orb.y += orb.speed * delta;
      orb.phase += delta * 4;
      if (orb.y > HEIGHT + 30) {
        state.orbs.splice(index, 1);
        continue;
      }
      if (distance(orb.x, orb.y, state.player.x, state.player.y) < orb.radius + state.player.radius + 5) {
        state.orbs.splice(index, 1);
        state.score += 250;
        burst(orb.x, orb.y, "#83fff3", 18);
        updateHud();
      }
    }

    for (let index = state.particles.length - 1; index >= 0; index -= 1) {
      const particle = state.particles[index];
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      particle.life -= delta;
      if (particle.life <= 0) state.particles.splice(index, 1);
    }

    for (const star of state.stars) {
      star.y += star.speed * delta * (1 + state.elapsed * 0.002);
      if (star.y > HEIGHT) {
        star.y = -3;
        star.x = Math.random() * WIDTH;
      }
    }

    updateHud();
  }

  function drawBackground() {
    ctx.fillStyle = "#050a11";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const glow = ctx.createRadialGradient(WIDTH * 0.52, HEIGHT * 0.48, 10, WIDTH * 0.52, HEIGHT * 0.48, 520);
    glow.addColorStop(0, "rgba(18, 87, 99, .18)");
    glow.addColorStop(0.6, "rgba(12, 36, 55, .09)");
    glow.addColorStop(1, "rgba(5, 10, 17, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (const star of state.stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = "#b4f1f2";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.strokeStyle = "rgba(93, 156, 174, .095)";
    ctx.lineWidth = 1;
    for (let x = 0; x < WIDTH; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();

    const horizon = ctx.createLinearGradient(0, HEIGHT * 0.73, 0, HEIGHT);
    horizon.addColorStop(0, "rgba(66, 209, 203, 0)");
    horizon.addColorStop(1, "rgba(66, 209, 203, .055)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, HEIGHT * 0.73, WIDTH, HEIGHT * 0.27);
  }

  function drawAsteroid(rock) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.rotation);
    ctx.shadowColor = rock.tint;
    ctx.shadowBlur = 17;
    ctx.fillStyle = "rgba(20, 29, 47, .96)";
    ctx.strokeStyle = rock.tint;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    rock.vertices.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(194, 211, 231, .22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-rock.radius * 0.35, -rock.radius * 0.15);
    ctx.lineTo(rock.radius * 0.13, -rock.radius * 0.31);
    ctx.lineTo(rock.radius * 0.34, rock.radius * 0.17);
    ctx.stroke();
    ctx.restore();
  }

  function drawOrb(orb) {
    const pulse = 1 + Math.sin(orb.phase) * 0.13;
    ctx.save();
    ctx.translate(orb.x, orb.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "#69fff0";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "rgba(100, 255, 238, .18)";
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#9afff5";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#dcfffb";
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer() {
    const player = state.player;
    if (state.invulnerable > 0 && Math.floor(state.invulnerable * 12) % 2 === 0) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.shadowColor = "#74f5ed";
    ctx.shadowBlur = 23;

    const flame = 12 + Math.sin(performance.now() * 0.018) * 5;
    ctx.fillStyle = "rgba(123, 233, 229, .65)";
    ctx.beginPath();
    ctx.moveTo(-7, 13);
    ctx.lineTo(0, 20 + flame);
    ctx.lineTo(7, 13);
    ctx.closePath();
    ctx.fill();

    const shipGradient = ctx.createLinearGradient(0, -23, 0, 18);
    shipGradient.addColorStop(0, "#f1ffff");
    shipGradient.addColorStop(0.48, "#83eee7");
    shipGradient.addColorStop(1, "#648dcb");
    ctx.fillStyle = shipGradient;
    ctx.strokeStyle = "#d3fffb";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(18, 17);
    ctx.lineTo(0, 10);
    ctx.lineTo(-18, 17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#123d55";
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(5, 4);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    for (const particle of state.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function draw() {
    if (!ctx) return;
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground();
    for (const orb of state.orbs) drawOrb(orb);
    for (const asteroid of state.asteroids) drawAsteroid(asteroid);
    drawParticles();
    if (state.mode !== "over") drawPlayer();
    ctx.restore();
  }

  function frame(timestamp) {
    if (state.mode === "running") {
      const delta = Math.min((timestamp - (state.lastFrame || timestamp)) / 1000, 0.04);
      state.lastFrame = timestamp;
      update(delta);
    } else {
      state.lastFrame = timestamp;
      for (const star of state.stars) {
        star.y += star.speed * 0.00018;
        if (star.y > HEIGHT) star.y = -2;
      }
    }
    draw();
    requestAnimationFrame(frame);
  }

  function setDirection(direction, value) {
    input[direction] = value;
    const button = direction === "left" ? leftButton : rightButton;
    button?.classList.toggle("is-active", value);
  }

  function attachTouchButton(button, direction) {
    if (!button) return;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      setDirection(direction, true);
    });
    const release = () => setDirection(direction, false);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowleft", "arrowright", " "].includes(key)) event.preventDefault();

    if (key === "arrowleft" || key === "a") setDirection("left", true);
    if (key === "arrowright" || key === "d") setDirection("right", true);

    if ((key === "enter" || key === " ") && (state.mode === "ready" || state.mode === "over")) {
      startOrRestart();
    } else if ((key === " " || key === "escape") && (state.mode === "running" || state.mode === "paused")) {
      pauseGame();
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") setDirection("left", false);
    if (key === "arrowright" || key === "d") setDirection("right", false);
  });

  window.addEventListener("blur", () => {
    setDirection("left", false);
    setDirection("right", false);
    if (state.mode === "running") pauseGame();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      setDirection("left", false);
      setDirection("right", false);
      if (state.mode === "running") pauseGame();
    }
  });

  startButton.addEventListener("click", () => {
    if (state.mode === "paused") pauseGame();
    else startOrRestart();
  });
  pauseButton.addEventListener("click", pauseGame);

  attachTouchButton(leftButton, "left");
  attachTouchButton(rightButton, "right");

  if ("ResizeObserver" in window) {
    new ResizeObserver(resizeCanvas).observe(canvas.parentElement);
  } else {
    window.addEventListener("resize", resizeCanvas);
  }

  updateHud();
  resizeCanvas();
  requestAnimationFrame(frame);
})();