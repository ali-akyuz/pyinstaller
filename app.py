"""
PyInstaller GUI - Flask Backend
Runs PyInstaller commands and streams output to the browser.
"""

import os
import sys
import json
import subprocess
import threading
import queue
import time
from pathlib import Path

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from flask import Flask, request, jsonify, Response, send_from_directory

app = Flask(__name__, static_folder="static")

# Global queue for streaming build output
build_queue = queue.Queue()
build_running = False


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/check-pyinstaller", methods=["GET"])
def check_pyinstaller():
    """Check if PyInstaller is installed."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "PyInstaller", "--version"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            version = result.stdout.strip()
            return jsonify({"installed": True, "version": version})
        else:
            return jsonify({"installed": False})
    except Exception as e:
        return jsonify({"installed": False, "error": str(e)})


@app.route("/api/install-pyinstaller", methods=["POST"])
def install_pyinstaller():
    """Install PyInstaller via pip."""
    def run_install():
        try:
            build_queue.put({"type": "info", "text": "⏳ pip install pyinstaller çalıştırılıyor..."})
            process = subprocess.Popen(
                [sys.executable, "-m", "pip", "install", "pyinstaller"],
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, bufsize=1
            )
            for line in process.stdout:
                build_queue.put({"type": "output", "text": line.rstrip()})
            process.wait()
            if process.returncode == 0:
                build_queue.put({"type": "success", "text": "✅ PyInstaller başarıyla kuruldu!"})
            else:
                build_queue.put({"type": "error", "text": "❌ Kurulum başarısız oldu."})
            build_queue.put({"type": "done", "text": ""})
        except Exception as e:
            build_queue.put({"type": "error", "text": f"❌ Hata: {str(e)}"})
            build_queue.put({"type": "done", "text": ""})

    threading.Thread(target=run_install, daemon=True).start()
    return jsonify({"status": "started"})


@app.route("/api/build", methods=["POST"])
def build():
    """Build executable using PyInstaller."""
    global build_running

    data = request.json
    script_path = data.get("scriptPath", "").strip()
    app_name = data.get("appName", "").strip()
    output_dir = data.get("outputDir", "dist").strip()
    icon_path = data.get("iconPath", "").strip()
    one_file = data.get("oneFile", True)
    windowed = data.get("windowed", False)
    no_console = data.get("noConsole", False)
    hidden_imports = data.get("hiddenImports", "").strip()
    add_data = data.get("addData", "").strip()
    clean_build = data.get("cleanBuild", False)
    upx = data.get("upx", False)

    if not script_path:
        return jsonify({"error": "Script yolu gerekli!"}), 400

    if not os.path.isfile(script_path):
        return jsonify({"error": f"Dosya bulunamadı: {script_path}"}), 400

    def run_build():
        global build_running
        build_running = True
        try:
            cmd = [sys.executable, "-m", "PyInstaller"]

            if one_file:
                cmd.append("--onefile")
            if windowed:
                cmd.append("--windowed")
            if no_console:
                cmd.append("--noconsole")
            if clean_build:
                cmd.append("--clean")
            if not upx:
                cmd.append("--noupx")
            if app_name:
                cmd.extend(["--name", app_name])
            if output_dir:
                cmd.extend(["--distpath", output_dir])
            if icon_path and os.path.isfile(icon_path):
                cmd.extend(["--icon", icon_path])
            if hidden_imports:
                for hi in hidden_imports.split(","):
                    hi = hi.strip()
                    if hi:
                        cmd.extend(["--hidden-import", hi])
            if add_data:
                for ad in add_data.split(";"):
                    ad = ad.strip()
                    if ad:
                        cmd.extend(["--add-data", ad])

            cmd.append(script_path)

            build_queue.put({"type": "info", "text": f"🔧 Komut: {' '.join(cmd)}"})
            build_queue.put({"type": "info", "text": f"📁 Çalışma dizini: {os.path.dirname(script_path)}"})
            build_queue.put({"type": "separator", "text": "─" * 60})

            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                cwd=os.path.dirname(script_path) or "."
            )

            for line in process.stdout:
                line = line.rstrip()
                if line:
                    msg_type = "output"
                    if "ERROR" in line or "error" in line.lower():
                        msg_type = "error"
                    elif "WARNING" in line or "warning" in line.lower():
                        msg_type = "warning"
                    elif "INFO" in line:
                        msg_type = "info"
                    build_queue.put({"type": msg_type, "text": line})

            process.wait()

            build_queue.put({"type": "separator", "text": "─" * 60})
            if process.returncode == 0:
                final_name = app_name if app_name else Path(script_path).stem
                if one_file:
                    exe_path = os.path.join(output_dir, final_name + ".exe")
                else:
                    exe_path = os.path.join(output_dir, final_name)
                build_queue.put({"type": "success", "text": f"✅ Build başarılı! Çıktı: {exe_path}"})
                build_queue.put({"type": "success", "text": f"🎉 Toplam süre tamamlandı."})
            else:
                build_queue.put({"type": "error", "text": f"❌ Build başarısız! Hata kodu: {process.returncode}"})

            build_queue.put({"type": "done", "returncode": process.returncode})
        except Exception as e:
            build_queue.put({"type": "error", "text": f"❌ Beklenmeyen hata: {str(e)}"})
            build_queue.put({"type": "done", "returncode": -1})
        finally:
            build_running = False

    threading.Thread(target=run_build, daemon=True).start()
    return jsonify({"status": "started"})


@app.route("/api/stream")
def stream():
    """Stream build output using Server-Sent Events."""
    def generate():
        yield "data: " + json.dumps({"type": "connected", "text": "Bağlantı kuruldu"}) + "\n\n"
        while True:
            try:
                msg = build_queue.get(timeout=30)
                yield "data: " + json.dumps(msg) + "\n\n"
                if msg.get("type") == "done":
                    break
            except queue.Empty:
                yield "data: " + json.dumps({"type": "ping", "text": ""}) + "\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.route("/api/browse-file", methods=["POST"])
def browse_file():
    """Use tkinter to open a file dialog."""
    data = request.json
    file_type = data.get("type", "py")

    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)

        if file_type == "py":
            path = filedialog.askopenfilename(
                title="Python Dosyası Seç",
                filetypes=[("Python Dosyaları", "*.py"), ("Tüm Dosyalar", "*.*")]
            )
        elif file_type == "ico":
            path = filedialog.askopenfilename(
                title="İkon Dosyası Seç",
                filetypes=[("İkon Dosyaları", "*.ico *.icns *.png"), ("Tüm Dosyalar", "*.*")]
            )
        elif file_type == "dir":
            path = filedialog.askdirectory(title="Çıktı Klasörü Seç")
        else:
            path = filedialog.askopenfilename(title="Dosya Seç")

        root.destroy()
        return jsonify({"path": path if path else ""})
    except Exception as e:
        return jsonify({"path": "", "error": str(e)})


@app.route("/api/open-folder", methods=["POST"])
def open_folder():
    """Open a folder in Windows Explorer."""
    data = request.json
    folder = data.get("path", "")
    if folder and os.path.isdir(folder):
        os.startfile(folder)
        return jsonify({"status": "ok"})
    return jsonify({"status": "error", "message": "Klasör bulunamadı"})


if __name__ == "__main__":
    print("[*] PyInstaller GUI baslatiliyor...")
    print("[*] Tarayicinizda acin: http://127.0.0.1:5000")
    app.run(debug=False, port=5000, threaded=True)
