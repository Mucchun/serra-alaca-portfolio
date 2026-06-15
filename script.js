const canvas = document.querySelector("#signal-canvas");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const palette = ["#6ef3ff", "#ff4ecd", "#d7ff5f", "#ffba57", "#ff7168"];
const shouldStartAtTop = !window.location.hash;

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

if (shouldStartAtTop) {
  window.scrollTo(0, 0);
  window.addEventListener(
    "load",
    () => {
      requestAnimationFrame(() => window.scrollTo(0, 0));
    },
    { once: true }
  );
}

let width = 0;
let height = 0;
let ratio = 1;
let nodes = [];
let pointer = { x: 0, y: 0, active: false };
let frame = 0;

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const targetCount = Math.min(120, Math.max(52, Math.floor((width * height) / 15000)));
  nodes = Array.from({ length: targetCount }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    size: 1 + Math.random() * 2.4,
    color: palette[index % palette.length],
    phase: Math.random() * Math.PI * 2
  }));
}

function drawDiamond(x, y, size, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawRibbon(time) {
  const bands = 7;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < bands; i += 1) {
    const y = (height / bands) * i + Math.sin(time * 0.001 + i) * 30;
    const color = palette[(i + 1) % palette.length];
    ctx.beginPath();
    ctx.moveTo(-80, y);
    for (let x = -80; x <= width + 80; x += 80) {
      const wave = Math.sin(x * 0.008 + time * 0.0012 + i * 0.7) * (18 + i * 2);
      ctx.lineTo(x, y + wave);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.07;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawConnections() {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const limit = width < 720 ? 92 : 126;

  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.hypot(dx, dy);

      if (distance < limit) {
        const alpha = (1 - distance / limit) * 0.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = a.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    if (pointer.active) {
      const pdx = a.x - pointer.x;
      const pdy = a.y - pointer.y;
      const pointerDistance = Math.hypot(pdx, pdy);
      if (pointerDistance < 170) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.strokeStyle = "#f8fbff";
        ctx.globalAlpha = (1 - pointerDistance / 170) * 0.24;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function animate(time = 0) {
  frame += 1;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#03060b";
  ctx.fillRect(0, 0, width, height);

  drawRibbon(time);

  for (const node of nodes) {
    const drift = Math.sin(time * 0.001 + node.phase) * 0.12;
    node.x += reduceMotion ? 0 : node.vx + drift;
    node.y += reduceMotion ? 0 : node.vy - drift;

    if (node.x < -20) node.x = width + 20;
    if (node.x > width + 20) node.x = -20;
    if (node.y < -20) node.y = height + 20;
    if (node.y > height + 20) node.y = -20;

    const pulse = 0.58 + Math.sin(time * 0.003 + node.phase) * 0.18;
    drawDiamond(node.x, node.y, node.size, node.color, reduceMotion ? 0.22 : pulse);
  }

  drawConnections();

  if (!reduceMotion || frame < 2) {
    requestAnimationFrame(animate);
  }
}

function syncPointer(event) {
  pointer = {
    x: event.clientX,
    y: event.clientY,
    active: true
  };
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", syncPointer);
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

resizeCanvas();
animate();

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.18 }
);

document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));

const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const navObserver = new IntersectionObserver(
  (entries) => {
    const active = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!active) return;

    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${active.target.id}`;
      link.classList.toggle("is-active", isActive);
    });
  },
  {
    rootMargin: "-30% 0px -52% 0px",
    threshold: [0.12, 0.3, 0.6]
  }
);

sections.forEach((section) => navObserver.observe(section));

const stage = document.querySelector(".artifact-stage");
if (stage && !reduceMotion) {
  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    stage.style.transform = `translate(${x * 8}px, ${y * 8}px) rotate(${x * 0.5}deg)`;
  });

  stage.addEventListener("pointerleave", () => {
    stage.style.transform = "";
  });
}
