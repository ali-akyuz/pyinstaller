/* ============================================================
   PyBuilder — app.js  (100% frontend, no backend needed)
   ============================================================ */

// ── Canvas particles ─────────────────────────────────────────
(function initCanvas() {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const particles = [];

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener("resize", resize);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.5 + 0.1,
      c: Math.random() > 0.5 ? "124,58,237" : "6,182,212"
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── Header scroll ─────────────────────────────────────────────
window.addEventListener("scroll", () => {
  document.getElementById("header")?.classList.toggle("scrolled", window.scrollY > 20);
});

// ── Mobile nav ────────────────────────────────────────────────
function toggleMenu() {
  document.getElementById("mobile-nav")?.classList.toggle("open");
}

// ── FAQ ───────────────────────────────────────────────────────
function toggleFaq(el) {
  el.classList.toggle("open");
}

// ── Toggle option active state ────────────────────────────────
function toggleOpt(label, id) {
  // Defer so checkbox state updates first
  setTimeout(() => {
    const cb = document.getElementById(id);
    if (cb) label.classList.toggle("active", cb.checked);
    generate();
  }, 0);
}

// ── Command Generator ─────────────────────────────────────────
function val(id) { return (document.getElementById(id)?.value || "").trim(); }
function chk(id) { return document.getElementById(id)?.checked || false; }

function generate() {
  const script   = val("f-script")  || "app.py";
  const name     = val("f-name");
  const dist     = val("f-dist");
  const icon     = val("f-icon");
  const hidden   = val("f-hidden");
  const exclude  = val("f-exclude");
  const data     = val("f-data");
  const hooks    = val("f-hooks");
  const loglevel = val("f-loglevel");
  const pypath   = val("f-pypath");

  const oneFile  = chk("one-file");
  const windowed = chk("windowed");
  const noconsole= chk("noconsole");
  const clean    = chk("clean");
  const noupx    = chk("noupx");
  const strip    = chk("strip");

  const parts = ["pyinstaller"];
  const flags = [];

  if (oneFile)   { parts.push("--onefile");   flags.push("--onefile"); }
  if (windowed)  { parts.push("--windowed");  flags.push("--windowed"); }
  if (noconsole) { parts.push("--noconsole"); flags.push("--noconsole"); }
  if (clean)     { parts.push("--clean");     flags.push("--clean"); }
  if (noupx)     { parts.push("--noupx");     flags.push("--noupx"); }
  if (strip)     { parts.push("--strip");     flags.push("--strip"); }

  if (name)     parts.push(`--name "${name}"`);
  if (dist)     parts.push(`--distpath "${dist}"`);
  if (icon)     parts.push(`--icon "${icon}"`);
  if (loglevel) parts.push(`--log-level ${loglevel}`);
  if (pypath)   parts.push(`--paths "${pypath}"`);

  if (hidden) {
    hidden.split(",").map(s => s.trim()).filter(Boolean).forEach(h => {
      parts.push(`--hidden-import ${h}`);
    });
  }
  if (exclude) {
    exclude.split(",").map(s => s.trim()).filter(Boolean).forEach(e => {
      parts.push(`--exclude-module ${e}`);
    });
  }
  if (data) {
    data.split(";").map(s => s.trim()).filter(Boolean).forEach(d => {
      parts.push(`--add-data "${d}"`);
    });
  }
  if (hooks) {
    hooks.split(",").map(s => s.trim()).filter(Boolean).forEach(h => {
      parts.push(`--runtime-hook ${h}`);
    });
  }

  parts.push(`"${script}"`);
  const cmd = parts.join(" ");

  // Update generated command
  const el = document.getElementById("gen-cmd");
  if (el) el.textContent = cmd;

  // Output path
  const stem = script.replace(/\.py$/i, "").replace(/^.*[/\\]/, "");
  const finalName = name || stem;
  const distDir = dist || "dist";
  const outEl = document.getElementById("out-path");
  if (outEl) outEl.textContent = `${distDir}/${finalName}.exe`;

  // Flags list
  const flagsEl = document.getElementById("flags-list");
  if (flagsEl) {
    if (flags.length === 0) {
      flagsEl.innerHTML = `<span class="flags-empty">Aktif bayrak yok</span>`;
    } else {
      flagsEl.innerHTML = flags.map(f => `<span class="flag-tag">${f}</span>`).join("");
    }
  }

  // Sync active states on opt-rows
  syncOptRows();
}

function syncOptRows() {
  const map = {
    "one-file": "opt-row",
    "windowed": "opt-row",
    "noconsole": "opt-row",
    "clean": "opt-row",
    "noupx": "opt-row",
    "strip": "opt-row"
  };
  document.querySelectorAll(".opt-row").forEach(row => {
    const cb = row.querySelector("input[type=checkbox]");
    if (cb) row.classList.toggle("active", cb.checked);
  });
}

// ── Copy to clipboard ─────────────────────────────────────────
async function copyCmd(id, btn) {
  const text = document.getElementById(id)?.textContent || "";
  try {
    await navigator.clipboard.writeText(text);
    btn.classList.add("copied");
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 8l4 4 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="5" y="5" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M3 10H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.3"/></svg>`;
    }, 2000);
  } catch (e) {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

// ── Smooth scroll for anchors ─────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const target = document.querySelector(a.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  generate();
  syncOptRows();

  // Mark --onefile as active on load
  document.querySelectorAll(".opt-row").forEach(row => {
    const cb = row.querySelector("input[type=checkbox]");
    if (cb?.checked) row.classList.add("active");
  });
});
