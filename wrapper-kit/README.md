# HtmlLib Native Wrapper Kit

Build standalone native desktop applications (`HtmlLib.app`) and Android APKs (`HtmlLib.apk`) for **HtmlArts**.

---

## 1. Android APK (`HtmlLib.apk`)

This folder contains a minimal, zero-bloat Android WebView wrapper that runs HtmlArts with full offline IndexedDB and hardware acceleration enabled.

### Quick Build with Gradle:
```bash
cd android
./gradlew assembleRelease
# The compiled APK is generated at:
# android/app/build/outputs/apk/release/HtmlLib.apk
```

### Key Android Features:
- **Offline First**: Runs local bundled HTML or loads cached PWA via Service Worker.
- **Hardware Accelerated**: Smooth 60fps vector ink rendering and folio zooming.
- **Full Storage Access**: Persistent IndexedDB storage with unlimited quota flags.
- **Immersive Mode**: Fullscreen reading without system browser chrome.

---

## 2. Desktop Application (`HtmlLib.app` / Linux / Windows)

### Linux:
Run the provided launcher:
```bash
chmod +x desktop/HtmlLib-linux.sh
./desktop/HtmlLib-linux.sh
```

### macOS:
Double-click `desktop/HtmlLib-mac.command` or bundle into a standard `.app` wrapper using Automator / Platypus.

### Windows:
Double-click `desktop/HtmlLib-win.bat`.

---

## 3. Direct Browser PWA (No Build Needed)
You can also install `HtmlArts` instantly from Chrome, Edge, or Brave:
1. Open `https://htmlarts.github.io/HtmlArts/` or your local `index.html`.
2. Click the **"Download App"** button in the header.
3. Select **"Install App Locally (PWA / Desktop)"** to install it directly into your OS app launcher.
