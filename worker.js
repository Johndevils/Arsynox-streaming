//*https://github.com/Johndevils/Arsynox-streaming
//* credit : arsynox
export default {
  async fetch(request, env, ctx) {
    // Telegram bot configuration
    const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
    const TELEGRAM_CHANNEL_ID = env.TELEGRAM_CHANNEL_ID || '';
    const LOGGING_ENABLED = TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL_ID;
    const PUBLIC_URL = env.PUBLIC_URL || new URL(request.url).origin;
    
    // Function to send message to Telegram
    async function sendTelegramMessage(chatId, text, replyMarkup = null, parseMode = 'Markdown') {
      if (!TELEGRAM_BOT_TOKEN) return false;
      
      try {
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const payload = {
          chat_id: chatId,
          text: text,
          parse_mode: parseMode,
          disable_web_page_preview: true
        };
        
        if (replyMarkup) {
          payload.reply_markup = replyMarkup;
        }
        
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        return response.ok;
      } catch (error) {
        console.error('Telegram send error:', error);
        return false;
      }
    }

    // Function to send log to Telegram channel
    async function sendToTelegram(logData) {
      if (!LOGGING_ENABLED) return false;
      
      try {
        const clientIP = request.headers.get('cf-connecting-ip') || 'Unknown IP';
        const userAgent = request.headers.get('user-agent') || 'Unknown UA';
        
        // Mask sensitive data in logs
        let logUrl = logData.url;
        // Mask tokens and sensitive parameters
        logUrl = logUrl.replace(/token=[^&\s]*/g, 'token=******')
                      .replace(/key=[^&\s]*/g, 'key=******')
                      .replace(/secret=[^&\s]*/g, 'secret=******')
                      .replace(/password=[^&\s]*/g, 'password=******');
        
        const message = `
🎬 *New Stream Request*
━━━━━━━━━━━━━━━━━━━
🔗 *URL:* \`${logUrl.substring(0, 150)}${logUrl.length > 150 ? '...' : ''}\`
📝 *Type:* ${logData.type}
⏰ *Time:* ${new Date().toLocaleString()}
📍 *IP:* ${clientIP}
━━━━━━━━━━━━━━━━━━━
*User Agent:*
\`\`\`
${userAgent.substring(0, 200)}
\`\`\`
        `;
        
        return await sendTelegramMessage(TELEGRAM_CHANNEL_ID, message);
      } catch (error) {
        console.error('Telegram log error:', error);
        return false;
      }
    }

    // Handle /health endpoint
    const url = new URL(request.url);
    
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Arsynox Streaming',
        version: '2.6.0',
        uptime: Math.floor(performance.now() / 1000)
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    // Handle Telegram bot webhook
    if (url.pathname === '/webhook' && request.method === 'POST') {
      try {
        const update = await request.json();
        
        // Handle /stream command
        if (update.message && update.message.text) {
          const message = update.message.text;
          const chatId = update.message.chat.id;
          
          if (message.startsWith('/stream')) {
            // Extract URL from message - support URLs in any format
            let videoUrl = '';
            
            // Method 1: Try to extract URL using regex (most flexible)
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = message.match(urlRegex);
            
            if (urls && urls.length > 0) {
              // Take the first URL found
              videoUrl = urls[0];
              
              // If URL is inside backticks or quotes, clean it
              videoUrl = videoUrl.replace(/[`"']/g, '').trim();
            } 
            // Method 2: If no URL found with regex, try splitting by space
            else if (message.includes(' ')) {
              const parts = message.split(' ');
              // Find the first part that looks like a URL
              for (let i = 1; i < parts.length; i++) {
                if (parts[i].startsWith('http://') || parts[i].startsWith('https://')) {
                  videoUrl = parts[i];
                  break;
                } else if (parts[i].includes('.')) {
                  // Try to reconstruct URL if split across multiple parts
                  let potentialUrl = parts.slice(i).join(' ');
                  if (potentialUrl.startsWith('http://') || potentialUrl.startsWith('https://')) {
                    videoUrl = potentialUrl;
                    break;
                  }
                }
              }
            }
            
            if (!videoUrl) {
              // Show help if no URL provided
              return await sendTelegramMessage(chatId, 
                `📺 *Stream Bot Help*\n\nSend me ANY video link and I'll create a streaming button for you!\n\n*Usage:*\n\`/stream <video-url>\`\n\n*Examples:*\n• \`/stream https://example.com/video.m3u8\`\n• \`/stream https://hub.fsl-cdn-1.sbs/...?token=...\`\n• \`/stream https://pub-acc4e415386945919ae2763dbdd2270d.r2.dev/36f25f999826f4dd2767e23a8d156650?token=1769157692\`\n• \`/stream media.mp4\`\n• \`/stream https://pixeldrain.com/u/abc123\`\n\n*Supports ALL video URLs:* HLS, MP4, MKV, CDN links, Token-based URLs, Direct links, etc.`,
                {
                  inline_keyboard: [[
                    { text: "🌐 Open Stream Player", url: PUBLIC_URL },
                    { text: "🩺 Health Check", url: `${PUBLIC_URL}/health` }
                  ]]
                }
              );
            }
            
            // Clean and process the URL
            let cleanUrl = videoUrl;
            
            // Remove any Telegram markdown or formatting
            cleanUrl = cleanUrl.replace(/[`"']/g, '').trim();
            
            // Handle relative URLs (like media.mp4)
            if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
              // If it's a relative URL, prepend the current origin
              cleanUrl = `${PUBLIC_URL}/${cleanUrl}`;
            }
            
            // Decode URL if it's encoded (multiple times if needed)
            try {
              let decodedUrl = cleanUrl;
              // Keep decoding until no more % encoding
              while (decodedUrl.includes('%') && decodedUrl !== decodeURIComponent(decodedUrl)) {
                decodedUrl = decodeURIComponent(decodedUrl);
              }
              cleanUrl = decodedUrl;
            } catch (e) {
              // If decoding fails, keep original URL
              console.log('URL decode failed, using original');
            }
            
            // Special handling for specific CDNs/providers
            if (cleanUrl.includes('pixeldrain.com/u/')) {
              cleanUrl = cleanUrl.replace('/u/', '/api/file/');
            }
            // Handle R2.dev URLs (like pub-acc4e415386945919ae2763dbdd2270d.r2.dev)
            if (cleanUrl.includes('.r2.dev')) {
              // Keep as-is, these are direct file URLs
            }
            
            // Determine file type
            let fileType = 'Direct Link';
            const urlLower = cleanUrl.toLowerCase();
            
            if (urlLower.endsWith('.m3u8') || urlLower.includes('.m3u8?') || urlLower.includes('hls') || urlLower.includes('m3u8')) {
              fileType = 'HLS Stream';
            } else if (urlLower.endsWith('.mp4') || urlLower.includes('.mp4?') || urlLower.includes('mp4')) {
              fileType = 'MP4 Video';
            } else if (urlLower.endsWith('.mkv') || urlLower.includes('.mkv?') || urlLower.includes('mkv')) {
              fileType = 'MKV Video';
            } else if (urlLower.endsWith('.avi') || urlLower.includes('avi')) {
              fileType = 'AVI Video';
            } else if (urlLower.endsWith('.mov') || urlLower.includes('mov')) {
              fileType = 'MOV Video';
            } else if (urlLower.endsWith('.webm') || urlLower.includes('webm')) {
              fileType = 'WebM Video';
            } else if (urlLower.includes('pixeldrain')) {
              fileType = 'Pixeldrain';
            } else if (urlLower.includes('fsl-cdn')) {
              fileType = 'FSL CDN';
            } else if (urlLower.includes('.r2.dev')) {
              fileType = 'Cloudflare R2 Storage';
            } else if (cleanUrl.includes('token=') || cleanUrl.includes('key=') || cleanUrl.includes('signature=')) {
              fileType = 'Secure Stream';
            } else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
              fileType = 'YouTube (Direct)';
            } else if (urlLower.includes('vimeo.com')) {
              fileType = 'Vimeo';
            } else if (urlLower.includes('dailymotion.com')) {
              fileType = 'Dailymotion';
            } else if (urlLower.includes('cdn') || urlLower.includes('stream')) {
              fileType = 'CDN Stream';
            } else if (urlLower.endsWith('.mp4') || urlLower.endsWith('.mkv') || urlLower.endsWith('.avi') || urlLower.endsWith('.mov')) {
              fileType = 'Video File';
            }
            
            // Create streaming URL
            const encodedUrl = encodeURIComponent(cleanUrl);
            const streamingUrl = `${PUBLIC_URL}/?url=${encodedUrl}`;
            
            // Create a shorter display URL for the message
            let displayUrl = cleanUrl;
            try {
              const urlObj = new URL(cleanUrl);
              // Show domain and first part of path
              displayUrl = `${urlObj.hostname}${urlObj.pathname.substring(0, 40)}${urlObj.pathname.length > 40 ? '...' : ''}`;
              
              // Hide query parameters in display
              if (urlObj.search) {
                displayUrl += '?***';
              }
            } catch (e) {
              displayUrl = cleanUrl.substring(0, 80) + (cleanUrl.length > 80 ? '...' : '');
            }
            
            // Create inline keyboard with better layout
            const keyboard = {
              inline_keyboard: [
                [
                  { 
                    text: "▶️ Watch Now", 
                    url: streamingUrl 
                  }
                ],
                [
                  { 
                    text: "📋 Copy Stream Link", 
                    callback_data: `copy_stream_${Buffer.from(cleanUrl).toString('base64').substring(0, 60)}`
                  },
                  { 
                    text: "🔗 Open Direct", 
                    url: cleanUrl 
                  }
                ],
                [
                  { 
                    text: "📱 Open Player", 
                    url: PUBLIC_URL 
                  },
                  { 
                    text: "🔄 Test Stream", 
                    url: `${streamingUrl}&autoplay=1`
                  }
                ],
                [
                  { 
                    text: "🩺 Health Check", 
                    url: `${PUBLIC_URL}/health`
                  }
                ]
              ]
            };
            
            // Send response with inline keyboard
            const responseMessage = `📺 *Stream Ready!*\n\n*Type:* ${fileType}\n*Source:* \`${displayUrl}\`\n\nClick "Watch Now" to open in stream player, or "Open Direct" for the original link:`;
            
            const response = await sendTelegramMessage(chatId, responseMessage, keyboard);
            
            // Log this action (with masked sensitive data)
            if (LOGGING_ENABLED) {
              let logUrl = cleanUrl;
              // Mask sensitive parameters
              logUrl = logUrl.replace(/token=[^&\s]*/g, 'token=******')
                           .replace(/key=[^&\s]*/g, 'key=******')
                           .replace(/secret=[^&\s]*/g, 'secret=******');
              
              const user = update.message.from;
              const username = user.username ? `@${user.username}` : `${user.first_name} ${user.last_name || ''}`.trim();
              
              await sendTelegramMessage(TELEGRAM_CHANNEL_ID,
                `🔄 *Bot Command Used*\n━━━━━━━━━━━━━━━━━━━\n👤 *User:* ${username}\n🆔 *ID:* ${user.id}\n📝 *Command:* /stream\n📁 *Type:* ${fileType}\n🔗 *URL:* \`${logUrl.substring(0, 100)}${logUrl.length > 100 ? '...' : ''}\`\n━━━━━━━━━━━━━━━━━━━`
              );
            }
            
            return new Response(JSON.stringify({ success: response }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Handle /start command with parameters
          if (message.startsWith('/start')) {
            const args = message.split(' ');
            if (args.length > 1 && args[1].startsWith('stream_')) {
              // Extract URL from start parameter
              const encodedUrl = args[1].substring(7);
              let videoUrl;
              try {
                videoUrl = decodeURIComponent(encodedUrl);
              } catch (e) {
                videoUrl = args.slice(1).join(' ').substring(7);
              }
              
              // Process as if it was a /stream command
              const streamingUrl = `${PUBLIC_URL}/?url=${encodeURIComponent(videoUrl)}`;
              
              const keyboard = {
                inline_keyboard: [[
                  { text: "▶️ Watch Now", url: streamingUrl },
                  { text: "🔗 Open Direct", url: videoUrl }
                ]]
              };
              
              await sendTelegramMessage(chatId,
                `🎬 *Welcome to Arsynox Streaming Bot!*\n\nI've received your streaming link. Click below to start watching:`,
                keyboard
              );
            } else if (args.length > 1 && args[1].startsWith('url_')) {
              // Direct URL parameter
              const encodedUrl = args[1].substring(4);
              let videoUrl;
              try {
                videoUrl = decodeURIComponent(encodedUrl);
              } catch (e) {
                videoUrl = encodedUrl;
              }
              
              const streamingUrl = `${PUBLIC_URL}/?url=${encodeURIComponent(videoUrl)}`;
              
              const keyboard = {
                inline_keyboard: [[
                  { text: "▶️ Play Stream", url: streamingUrl }
                ]]
              };
              
              await sendTelegramMessage(chatId,
                `🔗 *Stream Link Received*\n\nClick to play:`,
                keyboard
              );
            } else {
              // Regular start command
              await sendTelegramMessage(chatId,
                `🤖 *Welcome to Arsynox Streaming Bot!*\n\nI can help you stream ANY video directly from Telegram.\n\n*Commands:*\n• /stream <url> - Create streaming link from ANY video URL\n• /help - Show help\n• Just send me a video link directly!\n\n*Supports:*\n✅ HLS (.m3u8)\n✅ MP4, MKV, AVI, MOV\n✅ CDN links with tokens\n✅ R2.dev storage links\n✅ Pixeldrain links\n✅ Direct video URLs\n✅ Secure/encrypted streams\n✅ Relative paths (media.mp4)\n\n[Open Player](${PUBLIC_URL}) | [Health Check](${PUBLIC_URL}/health)`,
                {
                  inline_keyboard: [
                    [
                      { text: "🌐 Open Player", url: PUBLIC_URL },
                      { text: "📚 Examples", callback_data: "show_examples" }
                    ],
                    [
                      { text: "🔧 Setup Webhook", url: `${PUBLIC_URL}/setup-webhook` },
                      { text: "🩺 Health", url: `${PUBLIC_URL}/health` }
                    ]
                  ]
                }
              );
            }
            
            return new Response(JSON.stringify({ success: true }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Handle callback queries
          if (update.callback_query) {
            const callbackData = update.callback_query.data;
            const callbackChatId = update.callback_query.message.chat.id;
            
            if (callbackData.startsWith('copy_stream_')) {
              const base64Url = callbackData.substring(12);
              let urlToCopy;
              try {
                urlToCopy = Buffer.from(base64Url, 'base64').toString();
              } catch (e) {
                urlToCopy = 'Error decoding URL';
              }
              
              // Answer callback query
              const answerUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
              await fetch(answerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: update.callback_query.id,
                  text: "Streaming URL is ready!",
                  show_alert: false
                })
              });
              
              // Send the streaming URL as a separate message
              const encodedUrl = encodeURIComponent(urlToCopy);
              const streamingUrl = `${PUBLIC_URL}/?url=${encodedUrl}`;
              
              await sendTelegramMessage(callbackChatId,
                `📋 *Streaming URL*\n\n*Direct Link:*\n\`${urlToCopy.substring(0, 150)}${urlToCopy.length > 150 ? '...' : ''}\`\n\n*Streaming Page:*\n${streamingUrl}`,
                {
                  inline_keyboard: [[
                    { text: "▶️ Open Stream", url: streamingUrl }
                  ]]
                }
              );
            } else if (callbackData === 'show_examples') {
              // Answer callback query
              const answerUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
              await fetch(answerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: update.callback_query.id,
                  text: "Here are some examples",
                  show_alert: false
                })
              });
              
              await sendTelegramMessage(callbackChatId,
                `📝 *Example URLs:*\n\n\`/stream https://example.com/video.mp4\`\n\`/stream https://hub.fsl-cdn-1.sbs/file?token=abc123\`\n\`/stream https://pub-acc4e415386945919ae2763dbdd2270d.r2.dev/file?token=xyz\`\n\`/stream media.mp4\`\n\`/stream https://pixeldrain.com/u/fileID\`\n\`/stream https://cdn.example.com/playlist.m3u8\`\n\`/stream https://secure-cdn.com/video.mkv?key=xyz\`\n\n*Tip:* You can also just send me a video link directly!`,
                null
              );
            }
            
            return new Response(JSON.stringify({ success: true }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Handle direct URL messages (without /stream command)
          if (!message.startsWith('/')) {
            // Check if message contains a URL
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = message.match(urlRegex);
            
            if (urls && urls.length > 0) {
              const videoUrl = urls[0].replace(/[`"']/g, '').trim();
              
              // Create streaming URL
              const encodedUrl = encodeURIComponent(videoUrl);
              const streamingUrl = `${PUBLIC_URL}/?url=${encodedUrl}`;
              
              const keyboard = {
                inline_keyboard: [
                  [
                    { text: "▶️ Stream This", url: streamingUrl },
                    { text: "🔗 Open Direct", url: videoUrl }
                  ],
                  [
                    { text: "📋 Copy Link", callback_data: `copy_stream_${Buffer.from(videoUrl).toString('base64').substring(0, 60)}` }
                  ]
                ]
              };
              
              await sendTelegramMessage(chatId,
                `🔍 *I detected a video link!*\n\nWould you like to stream this URL?`,
                keyboard
              );
              
              return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
              });
            }
          }
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Webhook error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Handle webhook setup
    if (url.pathname === '/setup-webhook' && request.method === 'GET') {
      try {
        const webhookUrl = `${PUBLIC_URL}/webhook`;
        const setupUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true&max_connections=100`;
        
        const response = await fetch(setupUrl);
        const result = await response.json();
        
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Telegram Webhook Setup</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; background: #0f172a; color: #fff; }
              .container { max-width: 800px; margin: 0 auto; }
              .card { background: #1e293b; padding: 20px; border-radius: 10px; margin: 20px 0; }
              .success { color: #10b981; border-left: 4px solid #10b981; padding-left: 10px; }
              .error { color: #ef4444; border-left: 4px solid #ef4444; padding-left: 10px; }
              pre { background: #0f172a; padding: 15px; border-radius: 5px; overflow: auto; }
              code { background: #334155; padding: 2px 6px; border-radius: 3px; }
              a { color: #60a5fa; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Telegram Bot Setup</h1>
              <div class="card">
                <h3>Webhook Configuration</h3>
                <p><strong>Webhook URL:</strong> <code>${webhookUrl}</code></p>
                ${result.ok ? 
                  '<p class="success">✅ Webhook set successfully!</p>' : 
                  `<p class="error">❌ Error: ${result.description}</p>`}
              </div>
              
              <div class="card">
                <h3>Bot Commands</h3>
                <p>Set these commands in @BotFather:</p>
                <pre>
/stream - Create streaming link from ANY URL
/help - Show help information
/start - Welcome message</pre>
                <p><strong>Bot also responds to direct URL messages!</strong></p>
              </div>
              
              <div class="card">
                <h3>Test Your Bot</h3>
                <p>Send any of these to your bot:</p>
                <pre>
/stream https://hub.fsl-cdn-1.sbs/6711451f1d6043058e22638e21e3639e?token=1769154072

/stream https://pub-acc4e415386945919ae2763dbdd2270d.r2.dev/36f25f999826f4dd2767e23a8d156650?token=1769157692

/stream media.mp4

Or just send a video URL directly:
https://example.com/video.mp4
https://cdn.example.com/stream.m3u8</pre>
              </div>
              
              <div class="card">
                <h3>Health Check</h3>
                <p>Check service status: <a href="${PUBLIC_URL}/health" target="_blank">${PUBLIC_URL}/health</a></p>
                <pre id="healthStatus">Click to check...</pre>
                <button onclick="checkHealth()" style="background: #6366f1; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer;">Check Health</button>
              </div>
              
              <div class="card">
                <h3>Bot Status</h3>
                <pre>${JSON.stringify(result, null, 2)}</pre>
              </div>
              
              <p><a href="${PUBLIC_URL}">← Back to Stream Player</a></p>
            </div>
            
            <script>
              async function checkHealth() {
                try {
                  const response = await fetch('${PUBLIC_URL}/health');
                  const data = await response.json();
                  document.getElementById('healthStatus').textContent = JSON.stringify(data, null, 2);
                } catch (error) {
                  document.getElementById('healthStatus').textContent = 'Error: ' + error.message;
                }
              }
              // Auto-check on page load
              window.addEventListener('load', checkHealth);
            </script>
          </body>
          </html>
        `;
        
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' }
        });
      } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    }

    // Handle API endpoint for logging from frontend
    if (url.pathname === '/log' && request.method === 'POST') {
      try {
        const logData = await request.json();
        const success = await sendToTelegram(logData);
        
        return new Response(JSON.stringify({ 
          success, 
          loggingEnabled: LOGGING_ENABLED 
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message 
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Check for URL parameter and pre-fill input
    const urlParams = new URLSearchParams(url.search);
    const urlFromParam = urlParams.get('url');
    let prefillScript = '';
    
    if (urlFromParam) {
      try {
        const decodedUrl = decodeURIComponent(urlFromParam);
        // Escape special characters for JavaScript
        const escapedUrl = decodedUrl.replace(/\\/g, '\\\\')
                                     .replace(/"/g, '\\"')
                                     .replace(/'/g, "\\'")
                                     .replace(/\n/g, '\\n')
                                     .replace(/\r/g, '\\r');
        
        prefillScript = `
          <script>
            document.addEventListener('DOMContentLoaded', function() {
              const urlInput = document.getElementById('videoUrl');
              if (urlInput) {
                urlInput.value = "${escapedUrl}";
                // Auto-play after a short delay
                setTimeout(() => {
                  if (typeof processAndPlay === 'function') {
                    processAndPlay();
                  }
                }, 1000);
              }
            });
          </script>
        `;
      } catch (e) {
        console.error('Error processing URL parameter:', e);
      }
    }

    // Original HTML response
    const html = `
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arsynox Streaming</title>
    
    <!-- Custom Favicon -->
    <link rel="icon" type="image/jpeg" href="https://arsynoxhash.dpdns.org/file/BQACAgUAAyEGAAS6vrhKAANSaR85MpXXVeyTdufCOZpnhj3tDw0AAigZAAJxFflU1lEh0pS0eNE2BA.jpg">

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- HLS.js -->
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        slate: { 850: '#172033', 900: '#0f172a' },
                        primary: '#6366f1',
                        primaryDark: '#4f46e5'
                    }
                }
            }
        }
        
        // Global function to handle Telegram bot links
        function openTelegramBotWithUrl() {
            const urlInput = document.getElementById('videoUrl');
            const url = urlInput.value.trim();
            if (!url) {
                showToast('Please enter a URL first', 'error');
                return;
            }
            
            const botUsername = '${env.TELEGRAM_BOT_USERNAME || 'arsystream_bot'}';
            const encodedUrl = encodeURIComponent(url);
            const telegramUrl = \`https://t.me/\${botUsername}?start=url_\${encodedUrl}\`;
            
            window.open(telegramUrl, '_blank');
        }
    </script>
    
    <style>
        video::-webkit-media-controls { display: none !important; }
        
        /* Auto Hide Logic */
        .controls-overlay { opacity: 0; transition: opacity 0.3s ease-in-out; }
        .video-group.paused .controls-overlay { opacity: 1 !important; }
        .video-group:not(.user-idle):hover .controls-overlay { opacity: 1; }
        .video-group.user-idle { cursor: none; }

        /* Menu Transition */
        #sideMenu { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        
        /* Toast Notification */
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            transform: translateX(150%);
            transition: transform 0.3s ease-out;
        }
        .toast.show {
            transform: translateX(0);
        }
        
        /* Bot Button */
        .telegram-float {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 100;
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
    </style>
</head>
<body class="bg-slate-900 text-slate-100 font-sans min-h-screen flex flex-col items-center relative overflow-x-hidden">

    <!-- Toast Notification -->
    <div id="toast" class="toast">
        <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 max-w-sm">
            <div class="flex items-center gap-3">
                <div id="toastIcon" class="w-8 h-8 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div>
                    <p id="toastMessage" class="text-sm font-medium">Message</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Telegram Bot Float Button -->
    ${TELEGRAM_BOT_TOKEN ? `
    <div class="telegram-float">
        <a href="https://t.me/${env.TELEGRAM_BOT_USERNAME || 'arsystream_bot'}" target="_blank" 
           class="bg-[#0088cc] hover:bg-[#0077b3] text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg shadow-[#0088cc]/30">
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.57-1.38-.93-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.06-.2-.08-.06-.19-.04-.27-.02-.12.02-1.98 1.26-5.6 3.68-.53.37-1.01.56-1.44.55-.48-.01-1.4-.27-2.09-.5-.84-.27-1.51-.42-1.45-.89.03-.23.33-.47.91-.72 3.57-1.55 5.94-2.58 7.14-3.18 3.48-1.7 4.2-2 4.68-2.01.1 0 .33.02.48.15.13.1.17.24.18.38.01.12.02.31.01.48z"/>
            </svg>
        </a>
    </div>
    ` : ''}

    <!-- Header -->
    <header class="w-full max-w-6xl flex justify-between items-center py-6 px-6 z-20">
        <div class="flex items-center gap-3">
            <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 tracking-tight">
                Arsynox Streaming 
            </h1>
            <span class="text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-800/50" id="loggingStatus">Logging: ${LOGGING_ENABLED ? 'ON' : 'OFF'}</span>
            <span class="text-xs px-2 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/50" id="healthIndicator">🩺 Healthy</span>
        </div>

        <!-- Menu Button -->
        <button onclick="toggleMenu()" class="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-all focus:outline-none z-30 relative">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
        </button>
    </header>

    <!-- Main Content -->
    <main class="flex-1 w-full flex flex-col items-center px-4">
        
        <div class="text-center mb-8">
            <p class="text-slate-400 text-sm">Paste ANY video URL: HLS, MP4, CDN links, Token-based URLs, etc.</p>
            ${TELEGRAM_BOT_TOKEN ? `
            <p class="text-slate-500 text-xs mt-2">Use <code class="bg-slate-800 px-2 py-1 rounded">/stream</code> command or send URL directly to Telegram bot</p>
            ` : ''}
        </div>

        <!-- Input Section -->
        <div class="w-full max-w-3xl bg-slate-800/50 backdrop-blur-md p-2 rounded-2xl border border-slate-700/50 shadow-xl flex flex-col sm:flex-row gap-2 mb-8 transition-all focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 z-10">
            <input 
                type="text" 
                id="videoUrl" 
                class="flex-1 bg-transparent text-white placeholder-slate-500 px-4 py-3 focus:outline-none rounded-xl"
                placeholder="Paste ANY video URL here (HLS, MP4, CDN, Token-based, media.mp4, etc.)..."
                onkeypress="if(event.key === 'Enter') processAndPlay()"
            >
            <button 
                onclick="processAndPlay()"
                class="bg-primary hover:bg-primaryDark text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                id="playBtnMain"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Play</span>
            </button>
        </div>

        <!-- Quick Actions -->
        <div class="w-full max-w-3xl mb-6">
            <div class="flex flex-wrap gap-2 justify-center">
                ${TELEGRAM_BOT_TOKEN ? `
                <button onclick="openTelegramBotWithUrl()" class="flex items-center gap-2 bg-[#0088cc] hover:bg-[#0077b3] text-white px-4 py-2 rounded-xl transition-all text-sm">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.57-1.38-.93-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.06-.2-.08-.06-.19-.04-.27-.02-.12.02-1.98 1.26-5.6 3.68-.53.37-1.01.56-1.44.55-.48-.01-1.4-.27-2.09-.5-.84-.27-1.51-.42-1.45-.89.03-.23.33-.47.91-.72 3.57-1.55 5.94-2.58 7.14-3.18 3.48-1.7 4.2-2 4.68-2.01.1 0 .33.02.48.15.13.1.17.24.18.38.01.12.02.31.01.48z"/>
                    </svg>
                    Share via Telegram Bot
                </button>
                ` : ''}
                <button onclick="generateStreamLink()" class="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl transition-all text-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                    </svg>
                    Generate Shareable Link
                </button>
                <button onclick="checkHealthStatus()" class="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl transition-all text-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Check Health Status
                </button>
            </div>
        </div>

        <!-- Example URLs -->
        <div class="w-full max-w-3xl mb-6 bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
            <h3 class="text-sm font-semibold text-slate-400 mb-2">Example URLs (All Supported):</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div class="bg-slate-900/50 p-2 rounded">
                    <code class="text-slate-300 break-all text-[10px]">https://pub-acc4e415386945919ae2763dbdd2270d.r2.dev/...?token=...</code>
                    <p class="text-slate-500 text-[10px] mt-1">R2 Storage with token</p>
                </div>
                <div class="bg-slate-900/50 p-2 rounded">
                    <code class="text-slate-300 break-all text-[10px]">media.mp4</code>
                    <p class="text-slate-500 text-[10px] mt-1">Relative file path</p>
                </div>
                <div class="bg-slate-900/50 p-2 rounded">
                    <code class="text-slate-300 break-all text-[10px]">https://example.com/video.m3u8</code>
                    <p class="text-slate-500 text-[10px] mt-1">HLS Stream</p>
                </div>
                <div class="bg-slate-900/50 p-2 rounded">
                    <code class="text-slate-300 break-all text-[10px]">https://cdn.example.com/video.mp4?key=abc</code>
                    <p class="text-slate-500 text-[10px] mt-1">CDN with key</p>
                </div>
            </div>
        </div>

        <!-- Video Player -->
        <div id="videoWrapper" class="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group video-group paused z-10">
            <div id="spinner" class="absolute inset-0 flex items-center justify-center z-0 hidden">
                <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <video id="mainVideo" class="w-full h-full object-contain cursor-pointer" onclick="togglePlay()"></video>
            
            <div class="controls-overlay absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-12 flex flex-col gap-2 z-10">
                <!-- Progress -->
                <div class="group/progress w-full h-1.5 bg-white/20 rounded-full cursor-pointer relative hover:h-2.5 transition-all" onclick="seek(event)">
                    <div id="progressBar" class="absolute h-full bg-indigo-500 rounded-full w-0 transition-all duration-100">
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover/progress:scale-100 transition-transform"></div>
                    </div>
                </div>
                <!-- Buttons -->
                <div class="flex items-center justify-between mt-1 select-none">
                    <div class="flex items-center gap-4">
                        <button onclick="skip(-10)" class="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg></button>
                        <button id="playBtn" onclick="togglePlay()" class="text-white bg-white/10 hover:bg-indigo-600 p-2.5 rounded-full transition-all ring-1 ring-white/20"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
                        <button onclick="skip(10)" class="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg></button>
                        <div class="text-xs sm:text-sm font-mono text-slate-300 ml-2"><span id="currentTime">00:00</span> / <span id="duration">00:00</span></div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="changeSpeed()" class="text-xs font-bold bg-white/10 hover:bg-indigo-600 text-white px-2 py-1 rounded-md min-w-[35px] transition"><span id="speedLabel">1x</span></button>
                        <button id="muteBtn" onclick="toggleMute()" class="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition">
                            <svg id="muteIcon" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14.667 12v1.333c0 1.013-.82 1.333-1.333 1.333h-2.667v-4h2.667c.513 0 1.333.32 1.333 1.333zm4-5.333v10.666c0 .367-.3.667-.667.667h-1.333l-2.667-2.667h-2.667c-.733 0-1.333-.6-1.333-1.333v-2l-4 3.997v-9.337l4 3.997v-2c0-.733.6-1.333 1.333-1.333h2.667l2.667-2.667h1.333c.367 0 .667.3.667.667z"/>
                            </svg>
                        </button>
                        <button onclick="togglePip()" class="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition hidden sm:block"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 1.99 2H21c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/></svg></button>
                        <button onclick="toggleFullscreen()" class="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Volume Control (optional) -->
        <div class="w-full max-w-5xl mt-4 flex items-center justify-center gap-3">
            <span class="text-xs text-slate-400">Volume:</span>
            <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="1" 
                   class="w-32 accent-indigo-500" oninput="changeVolume(this.value)">
            <span id="volumeValue" class="text-xs text-slate-400">100%</span>
        </div>
    </main>

    <!-- Footer -->
    <footer class="w-full py-6 text-center border-t border-slate-800/50 mt-8">
        <p class="text-slate-500 text-sm font-medium">&copy;2025 Arsynox Streaming | <a href="/health" class="text-blue-400 hover:underline">Health Status</a></p>
        ${TELEGRAM_BOT_TOKEN ? `
        <p class="text-slate-600 text-xs mt-2">Telegram Bot: @${env.TELEGRAM_BOT_USERNAME || 'arsystream_bot'} | Supports ALL video URLs</p>
        ` : ''}
    </footer>

    <!-- SIDE MENU DRAWER -->
    <div id="menuOverlay" onclick="toggleMenu()" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 hidden opacity-0 transition-opacity duration-300"></div>
    
    <div id="sideMenu" class="fixed top-0 right-0 h-full w-72 bg-slate-800 border-l border-slate-700 shadow-2xl z-50 transform translate-x-full flex flex-col p-6">
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-xl font-bold text-white">Menu</h2>
            <button onclick="toggleMenu()" class="text-slate-400 hover:text-white"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        
        <nav class="flex flex-col gap-4">
            <button onclick="openTutorial(); toggleMenu()" class="flex items-center gap-3 text-slate-300 hover:text-primary hover:bg-slate-700/50 p-3 rounded-xl transition-all text-left">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span class="font-medium">How to Use</span>
            </button>

            ${TELEGRAM_BOT_TOKEN ? `
            <button onclick="openTelegramBot(); toggleMenu()" class="flex items-center gap-3 text-slate-300 hover:text-primary hover:bg-slate-700/50 p-3 rounded-xl transition-all text-left">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.57-1.38-.93-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.06-.2-.08-.06-.19-.04-.27-.02-.12.02-1.98 1.26-5.6 3.68-.53.37-1.01.56-1.44.55-.48-.01-1.4-.27-2.09-.5-.84-.27-1.51-.42-1.45-.89.03-.23.33-.47.91-.72 3.57-1.55 5.94-2.58 7.14-3.18 3.48-1.7 4.2-2 4.68-2.01.1 0 .33.02.48.15.13.1.17.24.18.38.01.12.02.31.01.48z"/>
                </svg>
                <span class="font-medium">Telegram Bot</span>
            </button>
            ` : ''}

            <button onclick="checkHealthStatus(); toggleMenu()" class="flex items-center gap-3 text-slate-300 hover:text-primary hover:bg-slate-700/50 p-3 rounded-xl transition-all text-left">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="font-medium">Health Status</span>
                <span id="menuHealthStatus" class="text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-400">OK</span>
            </button>

            <button onclick="toggleLogging(); toggleMenu()" class="flex items-center gap-3 text-slate-300 hover:text-primary hover:bg-slate-700/50 p-3 rounded-xl transition-all text-left">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                <span class="font-medium">Logging Status</span>
                <span id="menuLoggingStatus" class="text-xs px-2 py-1 rounded-full ${LOGGING_ENABLED ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}">${LOGGING_ENABLED ? 'ON' : 'OFF'}</span>
            </button>

            <a href="https://github.com/Johndevils/Arsynox-streaming" target="_blank" class="flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-700/50 p-3 rounded-xl transition-all">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"></path></svg>
                <span class="font-medium">Star on GitHub</span>
            </a>
        </nav>
        
        <div class="mt-auto pt-6 border-t border-slate-700">
            <p class="text-xs text-slate-500">Version 2.6.0</p>
            <p class="text-xs text-slate-600 mt-1">Health: OK | Mute/Unmute Added</p>
        </div>
    </div>

    <!-- TUTORIAL MODAL -->
    <div id="tutorialModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative transform scale-95 transition-transform">
            <button onclick="closeTutorial()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            <h2 class="text-2xl font-bold text-white mb-4">How to Use</h2>
            <div class="space-y-4 text-slate-300 text-sm">
                <div class="bg-slate-900/50 p-3 rounded-lg">
                    <h3 class="font-semibold text-white mb-1">Supported Formats</h3>
                    <p>• <strong>ALL video URLs</strong> are supported</p>
                    <p>• HLS (.m3u8), MP4, MKV, AVI, MOV, WebM</p>
                    <p>• R2.dev storage links with tokens</p>
                    <p>• CDN links with tokens/keys</p>
                    <p>• Relative paths (media.mp4)</p>
                </div>
                <div class="bg-slate-900/50 p-3 rounded-lg">
                    <h3 class="font-semibold text-white mb-1">Controls</h3>
                    <p class="flex justify-between"><span>Play/Pause</span> <kbd class="bg-slate-700 px-1 rounded text-xs">Space</kbd></p>
                    <p class="flex justify-between"><span>Mute/Unmute</span> <kbd class="bg-slate-700 px-1 rounded text-xs">M</kbd></p>
                    <p class="flex justify-between"><span>Fullscreen</span> <kbd class="bg-slate-700 px-1 rounded text-xs">F</kbd></p>
                    <p class="flex justify-between"><span>Seek</span> <kbd class="bg-slate-700 px-1 rounded text-xs">Arrows</kbd></p>
                </div>
                <div class="bg-slate-900/50 p-3 rounded-lg">
                    <h3 class="font-semibold text-white mb-1">Health Check</h3>
                    <p>• Visit <code>/health</code> endpoint</p>
                    <p>• Shows service status</p>
                    <p>• Useful for monitoring</p>
                </div>
                ${TELEGRAM_BOT_TOKEN ? `
                <div class="bg-slate-900/50 p-3 rounded-lg">
                    <h3 class="font-semibold text-white mb-1">Telegram Bot</h3>
                    <p>• Use <code>/stream &lt;any-url&gt;</code> command</p>
                    <p>• Or just send any video URL directly</p>
                    <p>• Supports R2.dev, FSL CDN, Token-based URLs, etc.</p>
                </div>
                ` : ''}
            </div>
            <button onclick="closeTutorial()" class="w-full mt-6 bg-primary hover:bg-primaryDark text-white py-2 rounded-xl font-bold">Got it!</button>
        </div>
    </div>

    <!-- TELEGRAM BOT MODAL -->
    <div id="telegramModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative transform scale-95 transition-transform">
            <button onclick="closeTelegramBot()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            <h2 class="text-2xl font-bold text-white mb-4">Telegram Bot</h2>
            <div class="space-y-4 text-slate-300 text-sm">
                <div class="bg-slate-900/50 p-3 rounded-lg">
                    <h3 class="font-semibold text-white mb-1">Universal URL Support</h3>
                    <p>✅ <strong>ALL video URLs</strong> accepted</p>
                    <p>✅ HLS, MP4, MKV, AVI, MOV, WebM</p>
                    <p>✅ R2.dev storage links with tokens</p>
                    <p>✅ CDN links with tokens/keys</p>
                    <p>✅ Relative paths (media.mp4)</p>
                </div>
                <div class="bg-slate-900/50 p-3 rounded-lg">
                    <h3 class="font-semibold text-white mb-1">Usage</h3>
                    <p>1. Start: <a href="https://t.me/${env.TELEGRAM_BOT_USERNAME || 'arsystream_bot'}" class="text-blue-400 hover:underline" target="_blank">@${env.TELEGRAM_BOT_USERNAME || 'arsystream_bot'}</a></p>
                    <p>2. Send: <code class="bg-slate-900 px-2 py-1 rounded">/stream &lt;any-url&gt;</code></p>
                    <p>3. Or just send any video URL directly!</p>
                    <p>4. Click inline button to stream</p>
                </div>
                <div class="bg-slate-900/50 p-3 rounded-lg">
                    <h3 class="font-semibold text-white mb-1">Examples</h3>
                    <p><code>/stream media.mp4</code></p>
                    <p><code>/stream https://pub-acc4e415386945919ae2763dbdd2270d.r2.dev/file?token=...</code></p>
                    <p><code>/stream https://hub.fsl-cdn-1.sbs/...?token=...</code></p>
                    <p><code>/stream https://secure-cdn.com/video.mp4?signature=xyz</code></p>
                </div>
            </div>
            <button onclick="closeTelegramBot()" class="w-full mt-6 bg-[#0088cc] hover:bg-[#0077b3] text-white py-2 rounded-xl font-bold">Open Telegram</button>
        </div>
    </div>

    <script>
        const video = document.getElementById('mainVideo');
        const playBtn = document.getElementById('playBtn');
        const progressBar = document.getElementById('progressBar');
        const speedLabel = document.getElementById('speedLabel');
        const wrapper = document.getElementById('videoWrapper');
        const spinner = document.getElementById('spinner');
        const urlInput = document.getElementById('videoUrl');
        const sideMenu = document.getElementById('sideMenu');
        const menuOverlay = document.getElementById('menuOverlay');
        const tutorialModal = document.getElementById('tutorialModal');
        const telegramModal = document.getElementById('telegramModal');
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');
        const muteBtn = document.getElementById('muteBtn');
        const muteIcon = document.getElementById('muteIcon');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.getElementById('volumeValue');
        const healthIndicator = document.getElementById('healthIndicator');
        const menuHealthStatus = document.getElementById('menuHealthStatus');

        const iconPlay = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        const iconPause = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        
        // Mute/Unmute icons
        const iconUnmuted = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M14.667 12v1.333c0 1.013-.82 1.333-1.333 1.333h-2.667v-4h2.667c.513 0 1.333.32 1.333 1.333zm4-5.333v10.666c0 .367-.3.667-.667.667h-1.333l-2.667-2.667h-2.667c-.733 0-1.333-.6-1.333-1.333v-2l-4 3.997v-9.337l4 3.997v-2c0-.733.6-1.333 1.333-1.333h2.667l2.667-2.667h1.333c.367 0 .667.3.667.667z"/></svg>';
        const iconMuted = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51c.66-1.24 1.03-2.65 1.03-4.15 0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';

        // --- HEALTH CHECK ---
        async function checkHealthStatus() {
            try {
                const response = await fetch('/health');
                const data = await response.json();
                
                if (data.status === 'OK') {
                    showToast('Service is healthy!', 'success');
                    healthIndicator.innerHTML = '🩺 Healthy';
                    healthIndicator.className = 'text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-800/50';
                    
                    if (menuHealthStatus) {
                        menuHealthStatus.innerHTML = 'OK';
                        menuHealthStatus.className = 'text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-400';
                    }
                } else {
                    showToast('Service has issues', 'error');
                    healthIndicator.innerHTML = '🩺 Issues';
                    healthIndicator.className = 'text-xs px-2 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-800/50';
                }
                
                console.log('Health check:', data);
                return data;
            } catch (error) {
                showToast('Health check failed', 'error');
                healthIndicator.innerHTML = '🩺 Offline';
                healthIndicator.className = 'text-xs px-2 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-800/50';
                return null;
            }
        }

        // Auto-check health on page load
        setTimeout(checkHealthStatus, 1000);

        // --- MUTE/UNMUTE FUNCTIONS ---
        function toggleMute() {
            video.muted = !video.muted;
            updateMuteButton();
            showToast(video.muted ? 'Muted' : 'Unmuted', 'info');
            
            // Update volume slider to match mute state
            if (video.muted) {
                volumeSlider.value = 0;
                volumeValue.textContent = '0%';
            } else {
                volumeSlider.value = video.volume;
                volumeValue.textContent = Math.round(video.volume * 100) + '%';
            }
        }

        function updateMuteButton() {
            if (video.muted) {
                muteIcon.innerHTML = iconMuted;
                muteBtn.title = 'Unmute (M)';
            } else {
                muteIcon.innerHTML = iconUnmuted;
                muteBtn.title = 'Mute (M)';
            }
        }

        function changeVolume(value) {
            video.volume = parseFloat(value);
            video.muted = (video.volume === 0);
            updateMuteButton();
            volumeValue.textContent = Math.round(video.volume * 100) + '%';
        }

        // --- TOAST NOTIFICATION ---
        function showToast(message, type = 'info') {
            toastMessage.textContent = message;
            
            if (type === 'success') {
                toastIcon.innerHTML = '<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
                toastIcon.className = 'w-8 h-8 rounded-full flex items-center justify-center bg-green-900/30';
            } else if (type === 'error') {
                toastIcon.innerHTML = '<svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
                toastIcon.className = 'w-8 h-8 rounded-full flex items-center justify-center bg-red-900/30';
            } else {
                toastIcon.innerHTML = '<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
                toastIcon.className = 'w-8 h-8 rounded-full flex items-center justify-center bg-blue-900/30';
            }
            
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // --- MENU LOGIC ---
        function toggleMenu() {
            if(sideMenu.classList.contains('translate-x-full')) {
                sideMenu.classList.remove('translate-x-full');
                menuOverlay.classList.remove('hidden');
                setTimeout(() => menuOverlay.classList.remove('opacity-0'), 10);
            } else {
                sideMenu.classList.add('translate-x-full');
                menuOverlay.classList.add('opacity-0');
                setTimeout(() => menuOverlay.classList.add('hidden'), 300);
            }
        }

        function toggleLogging() {
            const statusElem = document.getElementById('loggingStatus');
            if (statusElem.textContent.includes('OFF')) {
                showToast('Logging enabled in settings only', 'info');
            } else {
                showToast('Logging is controlled via environment variables', 'info');
            }
        }

        // --- TELEGRAM BOT MODAL ---
        function openTelegramBot() {
            telegramModal.classList.remove('hidden');
            setTimeout(() => {
                telegramModal.classList.remove('opacity-0');
                telegramModal.children[0].classList.remove('scale-95');
                telegramModal.children[0].classList.add('scale-100');
            }, 10);
        }
        
        function closeTelegramBot() {
            telegramModal.classList.add('opacity-0');
            telegramModal.children[0].classList.add('scale-95');
            setTimeout(() => telegramModal.classList.add('hidden'), 300);
        }
        
        telegramModal.addEventListener('click', (e) => { 
            if(e.target === telegramModal) closeTelegramBot(); 
        });

        // --- TUTORIAL LOGIC ---
        function openTutorial() {
            tutorialModal.classList.remove('hidden');
            setTimeout(() => {
                tutorialModal.classList.remove('opacity-0');
                tutorialModal.children[0].classList.remove('scale-95');
                tutorialModal.children[0].classList.add('scale-100');
            }, 10);
        }
        function closeTutorial() {
            tutorialModal.classList.add('opacity-0');
            tutorialModal.children[0].classList.add('scale-95');
            setTimeout(() => tutorialModal.classList.add('hidden'), 300);
        }
        tutorialModal.addEventListener('click', (e) => { if(e.target === tutorialModal) closeTutorial(); });

        // --- GENERATE SHARE LINK ---
        function generateStreamLink() {
            const url = urlInput.value.trim();
            if (!url) {
                showToast('Please enter a URL first', 'error');
                return;
            }
            
            const encodedUrl = encodeURIComponent(url);
            const streamLink = \`\${window.location.origin}/?url=\${encodedUrl}\`;
            
            // Copy to clipboard
            navigator.clipboard.writeText(streamLink).then(() => {
                showToast('Shareable link copied to clipboard!', 'success');
            }).catch(() => {
                // Fallback: show the link
                urlInput.value = streamLink;
                showToast('Link generated in input field', 'info');
            });
        }

        // --- AUTO HIDE CONTROLS ---
        let idleTimer;
        function resetIdleTimer() {
            wrapper.classList.remove('user-idle');
            clearTimeout(idleTimer);
            if (!video.paused) {
                idleTimer = setTimeout(() => { wrapper.classList.add('user-idle'); }, 3000);
            }
        }
        wrapper.addEventListener('mousemove', resetIdleTimer);
        wrapper.addEventListener('click', resetIdleTimer);

        // --- LOGGING FUNCTION ---
        async function logToTelegram(url) {
            try {
                let type = 'Direct Link';
                const urlLower = url.toLowerCase();
                
                if (urlLower.endsWith('.m3u8') || urlLower.includes('.m3u8?') || urlLower.includes('hls') || urlLower.includes('m3u8')) {
                    type = 'HLS Stream';
                } else if (urlLower.endsWith('.mp4') || urlLower.includes('.mp4?') || urlLower.includes('mp4')) {
                    type = 'MP4 Video';
                } else if (urlLower.endsWith('.mkv') || urlLower.includes('.mkv?') || urlLower.includes('mkv')) {
                    type = 'MKV Video';
                } else if (urlLower.includes('pixeldrain')) {
                    type = 'Pixeldrain';
                } else if (urlLower.includes('fsl-cdn')) {
                    type = 'FSL CDN';
                } else if (urlLower.includes('.r2.dev')) {
                    type = 'Cloudflare R2 Storage';
                } else if (url.includes('token=') || url.includes('key=') || url.includes('signature=')) {
                    type = 'Secure Stream';
                } else if (urlLower.includes('cdn') || urlLower.includes('stream')) {
                    type = 'CDN Stream';
                }
                
                const response = await fetch('/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        url, 
                        type, 
                        timestamp: new Date().toISOString(),
                        source: 'web_player'
                    })
                });
                
                const result = await response.json();
                return result;
            } catch (error) {
                console.error('Failed to log:', error);
                return { success: false, error: error.message };
            }
        }

        // --- VIDEO LOGIC ---
        async function processAndPlay() {
            let raw = urlInput.value.trim();
            if(!raw) {
                showToast('Please enter a URL', 'error');
                return;
            }
            
            const playButton = document.getElementById('playBtnMain');
            playButton.disabled = true;
            playButton.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Processing...</span>';
            
            try {
                let cleanUrl = raw;
                
                // Try to decode URL if it's encoded
                try {
                    let decodedUrl = cleanUrl;
                    while (decodedUrl.includes('%') && decodedUrl !== decodeURIComponent(decodedUrl)) {
                        decodedUrl = decodeURIComponent(decodedUrl);
                    }
                    cleanUrl = decodedUrl;
                } catch (e) {
                    // If decoding fails, keep original URL
                }
                
                // Handle relative URLs (like media.mp4)
                if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                  // If it's a relative URL, prepend the current origin
                  cleanUrl = \`\${window.location.origin}/\${cleanUrl}\`;
                }
                
                // Handle specific providers
                if (cleanUrl.includes('pixeldrain.com/u/')) {
                    cleanUrl = cleanUrl.replace('/u/', '/api/file/');
                }
                
                urlInput.value = cleanUrl;
                
                // Log to Telegram
                const logResult = await logToTelegram(cleanUrl);
                if (logResult.success) {
                    showToast('Stream logged to Telegram', 'success');
                } else if (!logResult.loggingEnabled) {
                    showToast('Stream ready! (Logging disabled)', 'info');
                }
                
                // Load the stream
                loadStream(cleanUrl);
            } catch (error) {
                showToast('Error processing URL', 'error');
                console.error('Error:', error);
            } finally {
                playButton.disabled = false;
                playButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Play</span>';
            }
        }

        function loadStream(url) {
            spinner.classList.remove('hidden');
            
            // Clear previous source
            video.src = '';
            
            // Try to detect stream type
            const urlLower = url.toLowerCase();
            const isHLS = urlLower.includes('.m3u8') || urlLower.includes('hls');
            const isMP4 = urlLower.includes('.mp4');
            const isMKV = urlLower.includes('.mkv');
            
            if (Hls.isSupported() && isHLS) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90
                });
                
                hls.loadSource(url);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => { 
                    video.play().catch((e) => {
                        console.log('Auto-play prevented:', e);
                        showToast('Click play to start streaming', 'info');
                    }); 
                });
                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS error:', data);
                    spinner.classList.add('hidden');
                    if (data.fatal) {
                        showToast('Error loading HLS stream', 'error');
                    }
                });
            } else if (isMP4 || isMKV || urlLower.includes('.avi') || urlLower.includes('.mov') || urlLower.includes('.webm')) {
                // Direct video formats
                video.src = url;
                video.play().catch((e) => {
                    console.log('Auto-play prevented:', e);
                    showToast('Click play to start streaming', 'info');
                });
            } else {
                // Try as direct video (catch-all)
                video.src = url;
                video.play().catch((e) => {
                    console.log('Auto-play prevented:', e);
                    showToast('Click play to start streaming', 'info');
                });
            }
        }

        video.addEventListener('waiting', () => spinner.classList.remove('hidden'));
        video.addEventListener('playing', () => {
            spinner.classList.add('hidden');
            wrapper.classList.remove('paused');
            updatePlayBtn();
            updateMuteButton();
            resetIdleTimer();
            showToast('Stream started', 'success');
        });
        video.addEventListener('pause', () => {
            wrapper.classList.add('paused');
            updatePlayBtn();
            clearTimeout(idleTimer);
            wrapper.classList.remove('user-idle');
        });
        video.addEventListener('error', (e) => {
            console.error('Video error:', video.error);
            spinner.classList.add('hidden');
            showToast('Error playing stream. Try a different format.', 'error');
        });
        video.addEventListener('loadedmetadata', () => {
            updateUI();
        });
        video.addEventListener('timeupdate', updateUI);
        video.addEventListener('volumechange', () => {
            updateMuteButton();
            volumeSlider.value = video.volume;
            volumeValue.textContent = Math.round(video.volume * 100) + '%';
        });

        function togglePlay() { 
            if (video.paused) {
                video.play().catch(e => {
                    showToast('Cannot play stream', 'error');
                });
            } else {
                video.pause();
            }
        }
        
        function updatePlayBtn() { 
            playBtn.innerHTML = video.paused ? iconPlay : iconPause; 
        }
        
        function skip(val) { 
            video.currentTime += val; 
            resetIdleTimer(); 
        }
        
        let speeds = [1, 1.25, 1.5, 2, 0.5];
        let sIdx = 0;
        function changeSpeed() {
            sIdx = (sIdx + 1) % speeds.length;
            video.playbackRate = speeds[sIdx];
            speedLabel.innerText = speeds[sIdx] + 'x';
            showToast('Speed: ' + speeds[sIdx] + 'x', 'info');
        }

        function togglePip() {
             if (document.pictureInPictureElement) {
                 document.exitPictureInPicture();
             } else if (document.pictureInPictureEnabled) {
                 video.requestPictureInPicture().catch(e => {
                     showToast('Picture-in-Picture not supported', 'error');
                 });
             }
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                wrapper.requestFullscreen().catch(e => {
                    showToast('Fullscreen not supported', 'error');
                });
            } else {
                document.exitFullscreen();
            }
        }

        function updateUI() {
            if(isNaN(video.duration) || video.duration === Infinity) return;
            const pct = (video.currentTime / video.duration) * 100;
            progressBar.style.width = pct + '%';
            document.getElementById('currentTime').innerText = fmt(video.currentTime);
            document.getElementById('duration').innerText = fmt(video.duration);
        }

        function seek(e) {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if(!isNaN(video.duration) && video.duration !== Infinity) {
                video.currentTime = pos * video.duration;
            }
        }

        function fmt(s) {
            if(isNaN(s)) return "00:00";
            const m = Math.floor(s/60);
            const sec = Math.floor(s%60);
            return \`\${m<10?'0':''}\${m}:\${sec<10?'0':''}\${sec}\`;
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch(e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'arrowleft':
                    skip(-10);
                    break;
                case 'arrowright':
                    skip(10);
                    break;
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    // Seek to percentage (0-9 = 0-90%)
                    if (!isNaN(video.duration) && video.duration !== Infinity) {
                        const percentage = parseInt(e.key) / 10;
                        video.currentTime = video.duration * percentage;
                        showToast('Jumped to ' + (percentage * 100) + '%', 'info');
                    }
                    break;
            }
        });

        // Check for Telegram bot start parameter
        const urlParams = new URLSearchParams(window.location.search);
        const startParam = urlParams.get('start');
        if (startParam && (startParam.startsWith('stream_') || startParam.startsWith('url_'))) {
            const prefixLength = startParam.startsWith('stream_') ? 7 : 4;
            const encodedUrl = startParam.substring(prefixLength);
            let url;
            try {
                url = decodeURIComponent(encodedUrl);
            } catch (e) {
                url = encodedUrl;
            }
            urlInput.value = url;
            setTimeout(() => {
                if (typeof processAndPlay === 'function') {
                    processAndPlay();
                }
            }, 1000);
            showToast('URL loaded from Telegram bot', 'info');
        }

        // Initialize
        showToast('Welcome to Arsynox Streaming - Supports ALL video URLs!', 'info');
        updateMuteButton(); // Set initial mute button state
        
        // Periodically check health (every 30 seconds)
        setInterval(checkHealthStatus, 30000);
    </script>
    ${prefillScript}
</body>
</html>
    `;

    return new Response(html, {
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    });
  },
};
