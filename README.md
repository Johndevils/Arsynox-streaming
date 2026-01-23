# 🎥 Arsynox Streaming

**Arsynox Streaming** is a modern, lightweight, and serverless video streaming web application built to run on **Cloudflare Workers**. It features a sleek UI, custom video player controls, and intelligent URL parsing for various video sources.

![Cloudflare Workers](https://img.shields.io/badge/Hosted_on-Cloudflare_Workers-orange?style=for-the-badge&logo=cloudflare)
![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![HLS.js](https://img.shields.io/badge/Streaming-HLS.js-yellow?style=for-the-badge)

---

## ✨ Features

Based on the code provided, here is the list of Environment Variables (`.env`) you need to configure in your Cloudflare Worker settings:

### 1. Telegram Configuration (Required for Bot & Logging)
*   **`TELEGRAM_BOT_TOKEN`**
    *   **Description:** The token you get from @BotFather when you create a new bot.
    *   **Example:** `123456789:AbCdEfGhIjKlMnOpQrStUvWxYz`
*   **`TELEGRAM_CHANNEL_ID`**
    *   **Description:** The numeric ID of the Telegram channel where you want logs to be sent.
    *   **Note:** The bot must be an admin in this channel. Channel IDs usually start with `-100`.
    *   **Example:** `-1001234567890`
*   **`TELEGRAM_BOT_USERNAME`**
    *   **Description:** Your bot's username (without the `@`). Used in the frontend to generate "Share" links.
    *   **Example:** `MyStreamBot`

### 2. General Configuration (Optional but Recommended)
*   **`PUBLIC_URL`**
    *   **Description:** The actual URL where your worker is deployed.
    *   **Purpose:** Used for generating correct callback URLs and webhook setups. If not set, the script tries to guess it from the request, but setting it explicitly is more reliable.
    *   **Example:** `https://stream.your-domain.com`

---

### How to add these in Cloudflare Dashboard:
1.  Go to your Worker.
2.  Click on **Settings** -> **Variables and Secrets**.
3.  Click **Add**.
4.  Enter the **Variable name** and **Value** from the list above.
5.  Click **Deploy**.
---

## 🤝 Credits

Developed by **[JohnDevils](https://github.com/Johndevils)**.

- **UI Library:** Tailwind CSS via CDN.
- **Streaming Engine:** HLS.js.
- **Platform:** Cloudflare Workers.

---

## 📄 License

This project is open-source and available for educational purposes.
