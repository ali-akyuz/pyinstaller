/* ============================================================
   PyBuilder GUI — app.js
   Frontend logic: drag-drop, SSE streaming, build control
   ============================================================ */

// ── State ──────────────────────────────────────────────────
let selectedScriptPath = "";
let eventSource = null;
let buildRunning = false;
let progressInterval = null;

// ── Init ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  createParticles();
  checkPyInstaller();
  setupInputListeners();
  updateCommandPreview();
});

// ── Particles ───────────────────────────────────────────────
function createParticles() {
  const container = document.getElementById("particles");
  for (let i = 0; i < 25; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 4 + 1;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 20 + 15}s;
      animation-delay: ${Math.random() * 20}s;
      opacity: ${Math.random() * 0.5 + 0.1};
      background: ${Math.random() > 0.5 ? 'rgba(124,58,237,0.4)' : 'rgba(6,182,212,0.4)'};
    `;
    container.appendChild(p);
  }
}

// ── PyInstaller check ───────────────────────────────────────
async function checkPyInstaller() {
  try {
    const res = await fetch("/api/check-pyinstaller");
    const data = await res.json();
    const dot = document.querySelector(".status-dot");
    const text = document.getElementById("status-text");

    if (data.installed) {
      dot.className = "status-dot ok";
      text.textContent = `PyInstaller ${data.version} ✓`;
      document.getElementById("install-notice").style.display = "none";
      termLog("info", `✅ PyInstaller ${data.version} kurulu ve hazır.`);
    } else {
      dot.className = "status-dot error";
      text.textContent = "PyInstaller kurulu değil";
      document.getElementById("install-notice").style.display = "block";
      termLog("warning", "⚠️ PyInstaller bulunamadı. Lütfen yükleyin.");
    }
  } catch (e) {
    termLog("error", "❌ Backend'e bağlanılamadı. Flask sunucusu çalışıyor mu?");
  }
}

// ── Install PyInstaller ─────────────────────────────────────
async function installPyInstaller() {
  const btn = document.getElementById("btn-install");
  btn.disabled = true;
  btn.innerHTML = `<span>Yükleniyor...</span>`;

  termLog("info", "📦 PyInstaller yükleniyor...");
  startProgress();
  openStream();

  await fetch("/api/install-pyinstaller", { method: "POST" });
}

// ── File Browse ─────────────────────────────────────────────
async function browseFile(type) {
  try {
    const res = await fetch("/api/browse-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });
    const data = await res.json();
    if (!data.path) return;

    if (type === "py") {
      setScriptPath(data.path);
    } else if (type === "ico") {
      document.getElementById("icon-path").value = data.path;
      updateCommandPreview();
    } else if (type === "dir") {
      document.getElementById("output-dir").value = data.path;
      updateCommandPreview();
    }
  } catch (e) {
    showAlert("Dosya seçici açılamadı: " + e.message);
  }
}

// ── Drag & Drop ─────────────────────────────────────────────
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById("drop-zone").classList.add("dragover");
}

function handleDragLeave(e) {
  document.getElementById("drop-zone").classList.remove("dragover");
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById("drop-zone").classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length === 0) return;

  const file = files[0];
  if (!file.name.endsWith(".py")) {
    showAlert("Lütfen bir .py dosyası seçin!");
    return;
  }

  // webkitRelativePath or use file.path (Electron) or name only
  const path = file.path || file.name;
  setScriptPath(path);
}

function setScriptPath(path) {
  selectedScriptPath = path;
  document.getElementById("script-path").value = path;

  const name = path.split(/[\\/]/).pop();
  document.getElementById("file-name-display").textContent = name;

  const dropZone = document.getElementById("drop-zone");
  dropZone.classList.add("has-file");

  const sf = document.getElementById("selected-file");
  sf.style.display = "flex";

  // Auto-fill app name from file stem
  const stem = name.replace(".py", "");
  if (!document.getElementById("app-name").value) {
    document.getElementById("app-name").value = stem;
  }

  termLog("info", `📄 Seçilen dosya: ${path}`);
  updateCommandPreview();
}

// ── Toggle update ────────────────────────────────────────────
function updateToggle(itemId, checkboxId) {
  const item = document.getElementById(itemId);
  const cb = document.getElementById(checkboxId);
  if (cb.checked) {
    item.classList.add("active");
  } else {
    item.classList.remove("active");
  }
  updateCommandPreview();
}

// ── Command Preview ──────────────────────────────────────────
function updateCommandPreview() {
  const scriptPath = document.getElementById("script-path").value || "script.py";
  const appName = document.getElementById("app-name").value;
  const outputDir = document.getElementById("output-dir").value;
  const iconPath = document.getElementById("icon-path").value;
  const oneFile = document.getElementById("one-file").checked;
  const windowed = document.getElementById("windowed").checked;
  const noConsole = document.getElementById("no-console").checked;
  const cleanBuild = document.getElementById("clean-build").checked;
  const upx = document.getElementById("upx").checked;
  const hiddenImports = document.getElementById("hidden-imports").value;

  let cmd = "pyinstaller";
  if (oneFile) cmd += " --onefile";
  if (windowed) cmd += " --windowed";
  if (noConsole) cmd += " --noconsole";
  if (cleanBuild) cmd += " --clean";
  if (!upx) cmd += " --noupx";
  if (appName) cmd += ` --name "${appName}"`;
  if (outputDir) cmd += ` --distpath "${outputDir}"`;
  if (iconPath) cmd += ` --icon "${iconPath}"`;
  if (hiddenImports) {
    hiddenImports.split(",").map(s => s.trim()).filter(Boolean).forEach(hi => {
      cmd += ` --hidden-import ${hi}`;
    });
  }
  cmd += ` "${scriptPath.split(/[\\/]/).pop()}"`;

  document.getElementById("cmd-preview").innerHTML = `<code>${escHtml(cmd)}</code>`;
}

function setupInputListeners() {
  const ids = ["app-name", "output-dir", "icon-path", "hidden-imports", "add-data"];
  ids.forEach(id => {
    document.getElementById(id)?.addEventListener("input", updateCommandPreview);
  });
}

// ── Build ────────────────────────────────────────────────────
async function startBuild() {
  if (buildRunning) return;

  const scriptPath = document.getElementById("script-path").value.trim() || selectedScriptPath;
  if (!scriptPath) {
    showAlert("Lütfen önce bir .py dosyası seçin!");
    return;
  }

  const payload = {
    scriptPath,
    appName: document.getElementById("app-name").value.trim(),
    outputDir: document.getElementById("output-dir").value.trim() || "dist",
    iconPath: document.getElementById("icon-path").value.trim(),
    oneFile: document.getElementById("one-file").checked,
    windowed: document.getElementById("windowed").checked,
    noConsole: document.getElementById("no-console").checked,
    cleanBuild: document.getElementById("clean-build").checked,
    upx: document.getElementById("upx").checked,
    hiddenImports: document.getElementById("hidden-imports").value.trim(),
    addData: document.getElementById("add-data").value.trim()
  };

  clearTerminal();
  termLog("info", "🚀 Build başlatılıyor...");

  buildRunning = true;
  const btn = document.getElementById("btn-build");
  btn.disabled = true;
  btn.querySelector(".btn-build-text").textContent = "Derleniyor...";
  btn.querySelector(".btn-build-icon").textContent = "⏳";

  startProgress();
  openStream();

  try {
    const res = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      termLog("error", "❌ " + (err.error || "Build başlatılamadı"));
      resetBuildBtn();
    }
  } catch (e) {
    termLog("error", "❌ Sunucuya bağlanılamadı: " + e.message);
    resetBuildBtn();
  }
}

// ── SSE Stream ────────────────────────────────────────────────
function openStream() {
  if (eventSource) { eventSource.close(); }

  eventSource = new EventSource("/api/stream");

  eventSource.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    if (msg.type === "ping" || msg.type === "connected") return;

    if (msg.type === "separator") {
      termLog("separator", msg.text);
    } else if (msg.type === "done") {
      eventSource.close();
      stopProgress();
      resetBuildBtn();
      buildRunning = false;

      if (msg.returncode === 0) {
        showOpenFolderBtn();
      }
    } else {
      termLog(msg.type, msg.text);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    stopProgress();
    resetBuildBtn();
    buildRunning = false;
  };
}

// ── Terminal ─────────────────────────────────────────────────
function termLog(type, text) {
  const terminal = document.getElementById("terminal");

  const line = document.createElement("div");
  line.className = `term-line ${type}`;

  const prefix = document.createElement("span");
  prefix.className = "term-prefix";
  prefix.textContent = type === "success" ? "✓" : type === "error" ? "✗" : type === "warning" ? "!" : type === "separator" ? "" : "►";

  const content = document.createElement("span");
  content.innerHTML = escHtml(text);

  line.appendChild(prefix);
  line.appendChild(content);
  terminal.appendChild(line);

  // Auto-scroll
  terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminal() {
  document.getElementById("terminal").innerHTML = "";
  document.getElementById("open-folder-btn").style.display = "none";
}

// ── Progress bar ─────────────────────────────────────────────
let progressVal = 0;
function startProgress() {
  document.getElementById("progress-wrap").style.display = "block";
  progressVal = 0;
  progressInterval = setInterval(() => {
    progressVal = Math.min(progressVal + Math.random() * 3, 85);
    document.getElementById("progress-bar").style.width = progressVal + "%";
  }, 500);
}

function stopProgress() {
  clearInterval(progressInterval);
  document.getElementById("progress-bar").style.width = "100%";
  setTimeout(() => {
    document.getElementById("progress-wrap").style.display = "none";
    document.getElementById("progress-bar").style.width = "0%";
  }, 800);
}

// ── Reset build button ───────────────────────────────────────
function resetBuildBtn() {
  const btn = document.getElementById("btn-build");
  btn.disabled = false;
  btn.querySelector(".btn-build-text").textContent = "EXE Oluştur";
  btn.querySelector(".btn-build-icon").textContent = "🚀";
  buildRunning = false;
}

// ── Open output folder ───────────────────────────────────────
function showOpenFolderBtn() {
  document.getElementById("open-folder-btn").style.display = "inline-flex";
}

async function openOutputFolder() {
  const outDir = document.getElementById("output-dir").value.trim() || "dist";
  try {
    await fetch("/api/open-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: outDir })
    });
  } catch (e) {
    showAlert("Klasör açılamadı: " + e.message);
  }
}

// ── Alert ────────────────────────────────────────────────────
function showAlert(msg) {
  const bar = document.getElementById("alert-bar");
  document.getElementById("alert-msg").textContent = msg;
  bar.style.display = "flex";
  setTimeout(() => { bar.style.display = "none"; }, 5000);
}

// ── Helpers ──────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
