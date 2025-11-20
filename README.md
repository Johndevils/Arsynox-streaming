# 🎥 Arsynox Streaming

**Arsynox Streaming** is a modern, lightweight, and serverless video streaming web application built to run on **Cloudflare Workers**. It features a sleek UI, custom video player controls, and intelligent URL parsing for various video sources.

![Cloudflare Workers](https://img.shields.io/badge/Hosted_on-Cloudflare_Workers-orange?style=for-the-badge&logo=cloudflare)
![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![HLS.js](https://img.shields.io/badge/Streaming-HLS.js-yellow?style=for-the-badge)

---

## ✨ Features

- **🚀 Serverless Architecture:** Runs entirely on the edge using Cloudflare Workers.
- **🎨 Modern UI:** Beautiful Dark Mode interface built with Tailwind CSS (Glassmorphism effects).
- **⚡ HLS Support:** Native support for `.m3u8` live streams using `hls.js`.
- **🔗 Smart URL Parsing:**
  - Automatically decodes encoded URLs (e.g., `https%3A%2F%2F`).
  - **Pixeldrain Support:** Automatically converts `/u/` links to direct streamable `/api/file/` links.
- **🎮 Custom Player Controls:**
  - Play/Pause, Seek (±10s).
  - Playback Speed Control (0.5x - 2x).
  - Picture-in-Picture (PiP) Mode.
  - Fullscreen Toggle.
- **⌨️ Keyboard Shortcuts:**
  - `Space`: Play/Pause
  - `F`: Toggle Fullscreen
  - `←` / `→`: Seek Backward/Forward
- **📱 Responsive:** Works perfectly on Desktop, Mobile, and Tablets.
- **📂 Side Menu:** Includes a drawer menu with a "How to Use" tutorial.

---

## 🛠️ Installation & Deployment

You can deploy this project in less than 2 minutes using Cloudflare Wrangler.

### Prerequisites
- A Cloudflare Account.
- [Node.js](https://nodejs.org/) installed on your computer.
- Wrangler CLI installed (`npm install -g wrangler`).

### Step 1: Clone or Create Project
Create a new directory and navigate into it:
```bash
mkdir arsynox-streaming
cd arsynox-streaming
```

### Step 2: Create Configuration Files

Create a file named `wrangler.toml` in the root directory and add the following:

```toml
name = "arsynox-streaming"
main = "worker.js"
compatibility_date = "2024-11-20"

[observability]
enabled = true
```

Create a file named `worker.js` and paste the **source code** provided in the project.

### Step 3: Deploy to Cloudflare

Login to your Cloudflare account (if not already):
```bash
npx wrangler login
```

Deploy the worker:
```bash
npx wrangler deploy
```

Once deployed, Wrangler will give you a URL (e.g., `https://arsynox-streaming.your-name.workers.dev`). Open it to see your app live!

---

## 📖 How to Use

1.  **Open the App:** Navigate to your deployed Worker URL.
2.  **Paste URL:** Enter a video URL in the input box.
    *   **Direct Links:** `.mp4`, `.mkv`, `.webm`
    *   **Streaming:** `.m3u8` (HLS)
    *   **Pixeldrain:** `https://pixeldrain.com/u/YOUR_ID`
    *   **Encoded:** `https%3A%2F%2Fexample.com%2Fvideo.mp4`
3.  **Click Play:** The player will handle the parsing and start streaming immediately.

---

## ⌨️ Shortcuts

| Key | Action |
| :--- | :--- |
| **Spacebar** | Play / Pause Video |
| **F** | Enter / Exit Fullscreen |
| **Right Arrow (→)** | Skip Forward 10 seconds |
| **Left Arrow (←)** | Rewind Backward 10 seconds |

---

## 🤝 Credits

Developed by **[JohnDevils](https://github.com/Johndevils)**.

- **UI Library:** Tailwind CSS via CDN.
- **Streaming Engine:** HLS.js.
- **Platform:** Cloudflare Workers.

---

## 📄 License

This project is open-source and available for educational purposes.
