# PyBuilder GUI 🚀

Python dosyalarını tek tıkla `.exe` uygulamasına dönüştüren modern bir GUI aracı.  
PyInstaller için şık, kullanıcı dostu bir web arayüzü.

![PyBuilder GUI Screenshot](https://i.imgur.com/placeholder.png)

---

## ✨ Özellikler

- 🖱️ **Drag & Drop** — `.py` dosyasını sürükle bırak veya tıklayarak seç
- ⚙️ **Build Seçenekleri** — `--onefile`, `--windowed`, `--noconsole`, `--clean`, `--upx`
- 📂 **Native Dosya Gezgini** — İkon ve çıktı klasörü için Windows dialog
- 💻 **Komut Önizleme** — Ayarlarına göre canlı `pyinstaller` komutu gösterir
- 📟 **Terminal Çıktısı** — Build çıktısını gerçek zamanlı akışla gösterir
- 📦 **Auto Install** — PyInstaller yoksa `pip install pyinstaller` otomatik çalışır
- 📁 **Çıktıyı Aç** — Build bitince dist klasörünü Explorer'da açar

---

## 🛠️ Kurulum & Çalıştırma

### Gereksinimler
- Python 3.8+
- pip

### Adımlar

```bash
# 1. Projeyi klonla veya indir
git clone https://github.com/kullaniciadi/pybuilder-gui.git
cd pybuilder-gui

# 2. Flask'ı yükle
pip install flask

# 3. Uygulamayı başlat
python app.py
```

Tarayıcında aç: **http://127.0.0.1:5000**

### Windows için kolay başlatma

`run.bat` dosyasına çift tıkla — Flask'ı otomatik yükler ve uygulamayı açar.

---

## 📁 Proje Yapısı

```
pybuilder-gui/
├── app.py              # Flask backend — PyInstaller komutlarını çalıştırır
├── run.bat             # Windows için kolay başlatıcı
├── requirements.txt    # Python bağımlılıkları (flask)
└── static/
    ├── index.html      # Ana sayfa (UI)
    ├── style.css       # Dark tema, glassmorphism, animasyonlar
    └── app.js          # Frontend logic (drag-drop, SSE stream, build kontrol)
```

---

## 🚀 Kullanım

1. **Python dosyanı seç** — Sürükle bırak veya "Dosya Seç" butonuna tıkla
2. **Ayarları yapılandır** — Uygulama adı, çıktı klasörü, ikon (opsiyonel)
3. **Build seçeneklerini belirle** — `--onefile`, `--noconsole` vb.
4. **"EXE Oluştur"** butonuna bas
5. **Build bitince** "Çıktıyı Aç" ile `dist/` klasörünü aç

---

## ⚙️ Build Seçenekleri

| Seçenek | Açıklama |
|---|---|
| `--onefile` | Her şeyi tek bir `.exe` dosyasına paketler |
| `--windowed` | Konsol penceresi göstermez (GUI uygulamalar için) |
| `--noconsole` | Konsol çıktısını gizler |
| `--clean` | Build öncesi eski cache'i temizler |
| `--upx` | UPX ile sıkıştırma (daha küçük dosya) |
| `--hidden-import` | Otomatik bulunamayan modülleri ekle |
| `--add-data` | Ekstra veri dosyaları ekle |

---

## 🐛 Sorun Bildirme

Herhangi bir sorunla karşılaşırsanız [Issues](https://github.com/kullaniciadi/pybuilder-gui/issues) sayfasından bildirebilirsiniz.

---

## 📄 Lisans

MIT License — Özgürce kullanabilirsiniz.
