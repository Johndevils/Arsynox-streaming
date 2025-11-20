//*https://github.com/Johndevils/Arsynox-streaming
//* credit:- Arsynox 
export default {
  async fetch(request) {
    const html = `
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arsynox Streaming</title>
    
    <!-- Custom Favicon Added -->
    <link rel="icon" type="image/jpeg" href="https://arsynoxhash.dpdns.org/file/BQACAgUAAyEGAAS6vrhKAANSaR85MpXXVeyTdufCOZpnhj3tDw0AAigZAAJxFflU1lEh0pS0eNE2BA.jpg">

    <!-- Tailwind CSS via CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- HLS.js for streaming -->
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        slate: { 850: '#172033', 900: '#0f172a' },
                        primary: '#6366f1', // Indigo-500
                        primaryDark: '#4f46e5' // Indigo-600
                    }
                }
            }
        }
    </script>
    <style>
        /* Hide native controls */
        video::-webkit-media-controls { display: none !important; }

        /* --- Auto Hide Logic --- */
        .controls-overlay {
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        }

        /* 1. Video Paused hai to controls dikhao */
        .video-group.paused .controls-overlay {
            opacity: 1 !important;
        }

        /* 2. User active hai (hover kar raha hai aur idle nahi hai) to controls dikhao */
        .video-group:not(.user-idle):hover .controls-overlay {
            opacity: 1;
        }

        /* 3. Agar User Idle hai (video chal rahi hai aur mouse nahi hil raha), to cursor hide karo */
        .video-group.user-idle {
            cursor: none;
        }
    </style>
</head>
<body class="bg-slate-900 text-slate-100 font-sans min-h-screen flex flex-col items-center py-10 px-4">

    <!-- Header -->
    <div class="text-center mb-8 space-y-2">
        <h1 class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 tracking-tight">
            Arsynox Streaming
        </h1>
        <p class="text-slate-400 text-sm">Paste Encoded, Pixeldrain, or HLS links</p>
    </div>

    <!-- Input Section -->
    <div class="w-full max-w-3xl bg-slate-800/50 backdrop-blur-md p-2 rounded-2xl border border-slate-700/50 shadow-xl flex flex-col sm:flex-row gap-2 mb-8 transition-all focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
        <input 
            type="text" 
            id="videoUrl" 
            class="flex-1 bg-transparent text-white placeholder-slate-500 px-4 py-3 focus:outline-none rounded-xl"
            placeholder="Paste your url here"
        >
        <button 
            onclick="processAndPlay()"
            class="bg-primary hover:bg-primaryDark text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Play</span>
        </button>
    </div>

    <!-- Video Player Wrapper -->
    <!-- Note: 'paused' class added by default -->
    <div id="videoWrapper" class="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group video-group paused">
        
        <!-- Loading Spinner -->
        <div id="spinner" class="absolute inset-0 flex items-center justify-center z-0 hidden">
            <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- Video Element -->
        <video id="mainVideo" class="w-full h-full object-contain cursor-pointer" onclick="togglePlay()"></video>

        <!-- Custom Controls Overlay -->
        <div class="controls-overlay absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-12 flex flex-col gap-2 z-10">
            
            <!-- Progress Bar -->
            <div class="group/progress w-full h-1.5 bg-white/20 rounded-full cursor-pointer relative hover:h-2.5 transition-all" onclick="seek(event)">
                <div id="progressBar" class="absolute h-full bg-indigo-500 rounded-full w-0 transition-all duration-100">
                    <div class="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover/progress:scale-100 transition-transform"></div>
                </div>
            </div>

            <!-- Buttons Row -->
            <div class="flex items-center justify-between mt-1 select-none">
                
                <!-- Left Controls -->
                <div class="flex items-center gap-4">
                    <!-- Rewind 10s -->
                    <button onclick="skip(-10)" class="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
                    </button>

                    <!-- Play/Pause -->
                    <button id="playBtn" onclick="togglePlay()" class="text-white bg-white/10 hover:bg-indigo-600 p-2.5 rounded-full transition-all ring-1 ring-white/20">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>

                    <!-- Skip 10s -->
                    <button onclick="skip(10)" class="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                    </button>

                    <!-- Time -->
                    <div class="text-xs sm:text-sm font-mono text-slate-300 ml-2">
                        <span id="currentTime">00:00</span> <span class="opacity-50">/</span> <span id="duration">00:00</span>
                    </div>
                </div>

                <!-- Right Controls -->
                <div class="flex items-center gap-3">
                    <!-- Speed -->
                    <button onclick="changeSpeed()" class="text-xs font-bold bg-white/10 hover:bg-indigo-600 text-white px-2 py-1 rounded-md min-w-[35px] transition">
                        <span id="speedLabel">1x</span>
                    </button>

                    <!-- PiP -->
                    <button onclick="togglePip()" class="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition hidden sm:block">
                         <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 1.99 2H21c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/></svg>
                    </button>

                    <!-- Fullscreen -->
                    <button onclick="toggleFullscreen()" class="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- JS Logic -->
    <script>
        // --- Elements ---
        const video = document.getElementById('mainVideo');
        const playBtn = document.getElementById('playBtn');
        const progressBar = document.getElementById('progressBar');
        const speedLabel = document.getElementById('speedLabel');
        const wrapper = document.getElementById('videoWrapper');
        const spinner = document.getElementById('spinner');
        const urlInput = document.getElementById('videoUrl');
        
        // --- Icons ---
        const iconPlay = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        const iconPause = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

        // --- AUTO HIDE CONTROLS LOGIC ---
        let idleTimer;
        
        function resetIdleTimer() {
            // Controls dikhao (remove user-idle class)
            wrapper.classList.remove('user-idle');
            clearTimeout(idleTimer);

            // Agar video paused nahi hai, to 3 second baad hide karo
            if (!video.paused) {
                idleTimer = setTimeout(() => {
                    wrapper.classList.add('user-idle');
                }, 3000); // 3 Seconds time
            }
        }

        // Mouse hilne par timer reset karo
        wrapper.addEventListener('mousemove', resetIdleTimer);
        wrapper.addEventListener('click', resetIdleTimer);

        // --- Logic: URL Parsing ---
        function processAndPlay() {
            let raw = urlInput.value.trim();
            if(!raw) return;

            let cleanUrl = decodeURIComponent(raw);
            if(cleanUrl.startsWith('http%3A') || cleanUrl.startsWith('https%3A')) {
                cleanUrl = decodeURIComponent(cleanUrl);
            }
            if(cleanUrl.includes('pixeldrain.com/u/')) {
                cleanUrl = cleanUrl.replace('/u/', '/api/file/');
            }

            urlInput.value = cleanUrl;
            loadStream(cleanUrl);
        }

        // --- Logic: Video Loading ---
        function loadStream(url) {
            spinner.classList.remove('hidden');
            
            if (Hls.isSupported() && (url.endsWith('.m3u8') || url.includes('hls'))) {
                const hls = new Hls();
                hls.loadSource(url);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play().catch(()=>{});
                });
                hls.on(Hls.Events.ERROR, () => spinner.classList.add('hidden'));
            } else {
                video.src = url;
                video.play().catch(()=>{});
            }
        }

        // --- Event Listeners ---
        video.addEventListener('waiting', () => spinner.classList.remove('hidden'));
        
        video.addEventListener('playing', () => {
            spinner.classList.add('hidden');
            wrapper.classList.remove('paused'); // CSS ko batao video chal rahi hai
            updatePlayBtn();
            resetIdleTimer(); // Timer shuru karo
        });
        
        video.addEventListener('pause', () => {
            wrapper.classList.add('paused'); // CSS ko batao video ruk gayi hai
            updatePlayBtn();
            clearTimeout(idleTimer); // Timer band karo, controls dikhao
            wrapper.classList.remove('user-idle');
        });
        
        video.addEventListener('timeupdate', updateUI);
        
        // --- Controls Functions ---
        function togglePlay() {
            video.paused ? video.play() : video.pause();
        }

        function updatePlayBtn() {
            playBtn.innerHTML = video.paused ? iconPlay : iconPause;
        }

        function skip(val) {
            video.currentTime += val;
            resetIdleTimer(); // Button dabane par controls gayab na ho
        }

        let speeds = [1, 1.25, 1.5, 2, 0.5];
        let sIdx = 0;
        function changeSpeed() {
            sIdx = (sIdx + 1) % speeds.length;
            video.playbackRate = speeds[sIdx];
            speedLabel.innerText = speeds[sIdx] + 'x';
        }

        function togglePip() {
             if (document.pictureInPictureElement) document.exitPictureInPicture();
             else video.requestPictureInPicture();
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) wrapper.requestFullscreen();
            else document.exitFullscreen();
        }

        function updateUI() {
            if(isNaN(video.duration)) return;
            const pct = (video.currentTime / video.duration) * 100;
            progressBar.style.width = pct + '%';
            document.getElementById('currentTime').innerText = fmt(video.currentTime);
            document.getElementById('duration').innerText = fmt(video.duration);
        }

        function seek(e) {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if(!isNaN(video.duration)) {
                video.currentTime = pos * video.duration;
            }
        }

        function fmt(s) {
            if(isNaN(s)) return "00:00";
            const m = Math.floor(s/60);
            const sec = Math.floor(s%60);
            return \`\${m<10?'0':''}\${m}:\${sec<10?'0':''}\${sec}\`;
        }
    </script>
</body>
</html>
            `;

            return new Response(html, {
                headers: { 'content-type': 'text/html;charset=UTF-8' },
            });
        },
    };
