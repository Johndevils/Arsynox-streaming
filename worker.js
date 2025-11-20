//*https://github.com/Johndevils/Arsynox-streaming
//* credit : arsynox
export default {
  async fetch(request) {
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
    </style>
</head>
<body class="bg-slate-900 text-slate-100 font-sans min-h-screen flex flex-col items-center relative overflow-x-hidden">

    <!-- Header -->
    <header class="w-full max-w-6xl flex justify-between items-center py-6 px-6 z-20">
        <div class="flex items-center gap-3">
            <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 tracking-tight">
                Arsynox
            </h1>
        </div>

        <!-- Menu Button -->
        <button onclick="toggleMenu()" class="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-all focus:outline-none z-30 relative">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
        </button>
    </header>

    <!-- Main Content -->
    <main class="flex-1 w-full flex flex-col items-center px-4">
        
        <div class="text-center mb-8">
            <p class="text-slate-400 text-sm">Paste Encoded, Pixeldrain, or HLS links</p>
        </div>

        <!-- Input Section -->
        <div class="w-full max-w-3xl bg-slate-800/50 backdrop-blur-md p-2 rounded-2xl border border-slate-700/50 shadow-xl flex flex-col sm:flex-row gap-2 mb-8 transition-all focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 z-10">
            <input 
                type="text" 
                id="videoUrl" 
                class="flex-1 bg-transparent text-white placeholder-slate-500 px-4 py-3 focus:outline-none rounded-xl"
                placeholder="Paste URL here..."
            >
            <button 
                onclick="processAndPlay()"
                class="bg-primary hover:bg-primaryDark text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Play</span>
            </button>
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
                        <button onclick="togglePip()" class="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition hidden sm:block"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 1.99 2H21c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/></svg></button>
                        <button onclick="toggleFullscreen()" class="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="w-full py-6 text-center border-t border-slate-800/50 mt-8">
        <p class="text-slate-500 text-sm font-medium">&copy;2025 Arsynox Streaming</p>
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

            <a href="https://github.com/Johndevils/Arsynox-streaming" target="_blank" class="flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-700/50 p-3 rounded-xl transition-all">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"></path></svg>
                <span class="font-medium">Star on GitHub</span>
            </a>
        </nav>
        
        <div class="mt-auto pt-6 border-t border-slate-700">
            <p class="text-xs text-slate-500">Version 2.0.0</p>
        </div>
    </div>

    <!-- TUTORIAL MODAL -->
    <div id="tutorialModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative transform scale-95 transition-transform">
            <button onclick="closeTutorial()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            <h2 class="text-2xl font-bold text-white mb-4">How to Use</h2>
            <div class="space-y-4 text-slate-300 text-sm">
                <div class="bg-slate-900/50 p-3 rounded-lg">
                    <h3 class="font-semibold text-white mb-1">Formats</h3>
                    <p>• HLS (.m3u8), MP4, MKV</p>
                    <p>• Encoded URLs supported</p>
                    <p>• Pixeldrain (/u/ links)</p>
                </div>
                <div class="bg-slate-900/50 p-3 rounded-lg">
                    <h3 class="font-semibold text-white mb-1">Shortcuts</h3>
                    <p class="flex justify-between"><span>Play/Pause</span> <kbd class="bg-slate-700 px-1 rounded text-xs">Space</kbd></p>
                    <p class="flex justify-between"><span>Fullscreen</span> <kbd class="bg-slate-700 px-1 rounded text-xs">F</kbd></p>
                    <p class="flex justify-between"><span>Seek</span> <kbd class="bg-slate-700 px-1 rounded text-xs">Arrows</kbd></p>
                </div>
            </div>
            <button onclick="closeTutorial()" class="w-full mt-6 bg-primary hover:bg-primaryDark text-white py-2 rounded-xl font-bold">Got it!</button>
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

        const iconPlay = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        const iconPause = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

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

        // --- VIDEO LOGIC ---
        function processAndPlay() {
            let raw = urlInput.value.trim();
            if(!raw) return;
            let cleanUrl = decodeURIComponent(raw);
            if(cleanUrl.startsWith('http%3A') || cleanUrl.startsWith('https%3A')) cleanUrl = decodeURIComponent(cleanUrl);
            if(cleanUrl.includes('pixeldrain.com/u/')) cleanUrl = cleanUrl.replace('/u/', '/api/file/');
            urlInput.value = cleanUrl;
            loadStream(cleanUrl);
        }

        function loadStream(url) {
            spinner.classList.remove('hidden');
            if (Hls.isSupported() && (url.endsWith('.m3u8') || url.includes('hls'))) {
                const hls = new Hls();
                hls.loadSource(url);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(()=>{}); });
                hls.on(Hls.Events.ERROR, () => spinner.classList.add('hidden'));
            } else {
                video.src = url;
                video.play().catch(()=>{});
            }
        }

        video.addEventListener('waiting', () => spinner.classList.remove('hidden'));
        video.addEventListener('playing', () => {
            spinner.classList.add('hidden');
            wrapper.classList.remove('paused');
            updatePlayBtn();
            resetIdleTimer();
        });
        video.addEventListener('pause', () => {
            wrapper.classList.add('paused');
            updatePlayBtn();
            clearTimeout(idleTimer);
            wrapper.classList.remove('user-idle');
        });
        video.addEventListener('timeupdate', updateUI);

        function togglePlay() { video.paused ? video.play() : video.pause(); }
        function updatePlayBtn() { playBtn.innerHTML = video.paused ? iconPlay : iconPause; }
        function skip(val) { video.currentTime += val; resetIdleTimer(); }
        
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
            if(!isNaN(video.duration)) video.currentTime = pos * video.duration;
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
